/**
 * Añade archivos de relleno al usuario de la siembra para llegar a un estado
 * concreto de cuota (aviso o agotada) y poder capturarlo para el manual.
 *
 *   node seed-help-quota.mjs 0.85   -> ~85% usado (estado de aviso)
 *   node seed-help-quota.mjs 1.0    -> 100% usado (cuota agotada)
 *   node seed-help-quota.mjs --clear  -> quita el relleno
 *
 * El relleno se guarda con la etiqueta RESERVE_TAG, así que `--clear` solo
 * toca los archivos que creó este script y deja intactos los de la siembra base.
 */

import { Client } from "pg";
import { readFileSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { randomUUID, randomBytes } from "crypto";

const SEED_EMAIL = "ayuda@cloudvault.app";
const QUOTA_BYTES = 25 * 1024 * 1024;
const PER_FILE_CAP = 15 * 1024 * 1024;
const RESERVE_TAG = "__cuota__";
const STORAGE_DIR = process.env.STORAGE_LOCAL_PATH ?? ".storage";

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const match = readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // Se informa abajo con un mensaje más claro.
  }
  throw new Error(
    "No se encontró DATABASE_URL. Defínela en el entorno o en .env.local (ver .env.example)."
  );
}

// Nombres y notas verosímiles: el manual muestra el panel de cuota sobre un
// panel real, y "Reserva-Espacio-01.pdf" delataría que es relleno.
const RELLENO = [
  {
    originalName: "Contrato-Marco-2026.pdf",
    description: "Contrato firmado por ambas partes",
    tags: ["contrato", "2026"],
  },
  {
    originalName: "Anexo-II-Presupuesto.pdf",
    description: "Anexo del presupuesto anual",
    tags: ["finanzas", "anexo"],
  },
];

async function main() {
  const arg = process.argv[2];
  const db = new Client({ connectionString: readDatabaseUrl() });
  await db.connect();

  const { rows: userRows } = await db.query(
    "SELECT id FROM users WHERE lower(email) = lower($1)",
    [SEED_EMAIL]
  );
  if (userRows.length === 0) {
    throw new Error(
      `No existe la cuenta de siembra ${SEED_EMAIL}. Ejecute seed-help.mjs primero.`
    );
  }
  const userId = userRows[0].id;

  // Primero se retiran los rellenos anteriores, incluidos sus binarios.
  const { rows: anteriores } = await db.query(
    "SELECT storage_path FROM files WHERE $1 = ANY(tags)",
    [RESERVE_TAG]
  );
  const { rowCount: retirados } = await db.query(
    "DELETE FROM files WHERE $1 = ANY(tags)",
    [RESERVE_TAG]
  );
  if ((process.env.STORAGE_BACKEND ?? "local") === "local") {
    for (const fila of anteriores) {
      try {
        unlinkSync(join(STORAGE_DIR, fila.storage_path));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
  console.log(`Relleno retirado: ${retirados} archivo(s).`);

  if (arg !== "--clear") {
    const objetivo = Number(arg);
    if (!Number.isFinite(objetivo) || objetivo <= 0 || objetivo > 1) {
      throw new Error("Indique una proporción entre 0 y 1, o --clear");
    }

    const { rows: suma } = await db.query(
      "SELECT COALESCE(SUM(size), 0)::bigint AS total FROM files WHERE user_id = $1",
      [userId]
    );
    const currentBytes = Number(suma[0].total);
    const wantBytes = Math.floor(QUOTA_BYTES * objetivo);
    let toAdd = wantBytes - currentBytes;

    if (toAdd < 0) {
      console.log(
        "Los archivos actuales ya superan el objetivo; no se añade relleno."
      );
    }

    let n = 0;
    while (toAdd > 0) {
      const size = Math.min(toAdd, PER_FILE_CAP - 1024);
      if (size <= 0) break;
      const sample = RELLENO[n % RELLENO.length];
      const suffix = n >= RELLENO.length ? ` (${Math.floor(n / RELLENO.length) + 1})` : "";

      const fileId = randomUUID();
      const storagePath = `${userId}/${fileId}-${sample.originalName}${suffix}.pdf`;

      // El binario es simbólico: la aplicación no inspecciona el contenido, solo
      // lo almacena y lo sirve. Se borran al terminar las capturas.
      const contenido = randomBytes(1024);
      if ((process.env.STORAGE_BACKEND ?? "local") === "local") {
        const destino = join(STORAGE_DIR, storagePath);
        mkdirSync(dirname(destino), { recursive: true });
        writeFileSync(destino, contenido);
      }

      await db.query(
        `INSERT INTO files
           (user_id, folder_id, original_name, mime_type, category, size, storage_path, description, tags)
         VALUES ($1, NULL, $2, 'application/pdf', 'pdf', $3, $4, $5, $6)`,
        [
          userId,
          `${sample.originalName}${suffix}`,
          size,
          storagePath,
          sample.description,
          [...sample.tags, RESERVE_TAG],
        ]
      );

      toAdd -= size;
      n += 1;
    }

    const { rows: despues } = await db.query(
      "SELECT COALESCE(SUM(size), 0)::bigint AS total FROM files WHERE user_id = $1",
      [userId]
    );
    const used = Number(despues[0].total);
    console.log(
      `Relleno añadido: ${n} archivo(s). Uso final: ${(used / 1024 / 1024).toFixed(2)} MB de 25 MB (${(
        (used / QUOTA_BYTES) *
        100
      ).toFixed(1)}%).`
    );
  }

  await db.end();
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
