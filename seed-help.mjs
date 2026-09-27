/**
 * Siembra y limpieza de los datos de muestra que usa el manual de usuario.
 *
 * El manual se ilustra con capturas reales de la interfaz, y para que las
 * capturas no salgan vacías hace falta una cuenta con archivos de los cinco
 * tipos admitidos y algunas carpetas temáticas.
 *
 *   node seed-help.mjs            siembra los datos de muestra
 *   node seed-help.mjs --clean    borra únicamente lo que creó este script
 *   node seed-help.mjs --reset    borra y vuelve a sembrar
 *
 * Todo queda colgando de un único usuario (SEED_EMAIL), así que la limpieza se
 * hace por su id y no puede tocar los datos reales de la base. El script
 * comprueba y muestra el recuento antes y después para que se vea que la
 * diferencia es exactamente lo sembrado y nada más.
 */

import { Client } from "pg";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync, unlinkSync, rmdirSync } from "fs";
import { join, dirname } from "path";
import { randomUUID } from "crypto";

const SEED_EMAIL = "ayuda@cloudvault.app";
const SEED_NAME = "Usuario de Ayuda";
const SEED_PASSWORD = "ayuda123456";
const SAMPLES_DIR = ".help-samples";
/** Dónde se guardan los binarios con STORAGE_BACKEND=local. */
const STORAGE_DIR = process.env.STORAGE_LOCAL_PATH ?? ".storage";

/** Archivos de muestra: nombre en disco -> como se presenta en la interfaz. */
const SEED_FILES = [
  {
    file: "Informe-Trimestral.pdf",
    mimeType: "application/pdf",
    category: "pdf",
    folder: "Contratos",
    description: "Informe trimestral de actividad",
    tags: ["informe", "2026", "reporte"],
  },
  {
    file: "Contrato-Servicios.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "word",
    folder: "Contratos",
    description: "Borrador del contrato anual",
    tags: ["contrato", "borrador"],
  },
  {
    file: "Presupuesto-Anual.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    category: "excel",
    folder: "Finanzas",
    description: "Presupuesto por partidas",
    tags: ["finanzas", "presupuesto"],
  },
  {
    file: "Presentacion-Resultados.pptx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    category: "powerpoint",
    folder: "Presentaciones",
    description: "Resultados del trimestre",
    tags: ["presentacion"],
  },
  {
    // Se deja sin carpeta a propósito para que el manual pueda mostrar el
    // estado "Sin carpeta" con un archivo real.
    file: "Captura-De-Pantalla.png",
    mimeType: "image/png",
    category: "image",
    folder: "",
    description: "Imagen de ejemplo",
    tags: ["captura"],
  },
];

const SEED_FOLDERS = [
  { name: "Contratos", color: "indigo", description: "Documentos firmados" },
  { name: "Finanzas", color: "emerald", description: "Presupuestos y facturas" },
  { name: "Presentaciones", color: "amber", description: "Material de reuniones" },
];

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const match = readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // Si no existe .env.local se informa abajo con un mensaje más claro.
  }
  throw new Error(
    "No se encontró DATABASE_URL. Defínela en el entorno o en .env.local (ver .env.example)."
  );
}

/**
 * Guarda el binario en disco con la misma estructura de rutas que usa la
 * aplicación, para que al abrir la aplicación en local se vea el archivo.
 */
function guardarEnDisco(storagePath, datos) {
  const destino = join(STORAGE_DIR, storagePath);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, datos);
}

function borrarDeDisco(storagePaths) {
  for (const storagePath of storagePaths) {
    const destino = join(STORAGE_DIR, storagePath);
    try {
      unlinkSync(destino);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    // Se intenta quitar el directorio del usuario; se ignora si tiene más
    // archivos dentro.
    try {
      rmdirSync(dirname(destino));
    } catch {
      // Todavía queda algo dentro: no es un problema.
    }
  }
}

async function countAll(db) {
  const usuarios = await db.query("SELECT COUNT(*)::int AS n FROM users");
  const archivos = await db.query("SELECT COUNT(*)::int AS n FROM files");
  const carpetas = await db.query("SELECT COUNT(*)::int AS n FROM folders");
  return {
    usuarios: usuarios.rows[0].n,
    archivos: archivos.rows[0].n,
    carpetas: carpetas.rows[0].n,
  };
}

async function cleanSeedData(db) {
  const user = await db.query("SELECT id FROM users WHERE lower(email) = lower($1)", [
    SEED_EMAIL,
  ]);

  if (user.rowCount === 0) {
    console.log("No hay datos de siembra que borrar.");
    return;
  }

  const userId = user.rows[0].id;

  // Las rutas se leen antes de borrar las filas porque son lo único que queda
  // del contenido: sin esto los binarios se quedarían en el almacén.
  const binarios = await db.query(
    "SELECT storage_path FROM files WHERE user_id = $1",
    [userId]
  );

  await db.query("DELETE FROM files WHERE user_id = $1", [userId]);
  await db.query("DELETE FROM folders WHERE user_id = $1", [userId]);
  const usuarios = await db.query("DELETE FROM users WHERE id = $1", [userId]);

  if ((process.env.STORAGE_BACKEND ?? "local") === "local") {
    borrarDeDisco(binarios.rows.map((r) => r.storage_path));
  } else {
    console.log(
      "AVISO: STORAGE_BACKEND=supabase. Los binarios de la siembra no se borran desde aquí;"
    );
    console.log("       bórralos desde el panel de Supabase si repetiste la siembra.");
  }

  console.log(`Borrado de la siembra "${SEED_EMAIL}":`);
  console.log(`  archivos .......... ${binarios.rowCount}`);
  console.log(`  usuarios .......... ${usuarios.rowCount}`);
  console.log(`  binarios .......... ${binarios.rows.length}`);
}

async function seed(db) {
  const existing = await db.query("SELECT id FROM users WHERE lower(email) = lower($1)", [
    SEED_EMAIL,
  ]);
  if (existing.rowCount > 0) {
    console.log(
      `La cuenta "${SEED_EMAIL}" ya existe. Use --reset para regenerarla.`
    );
    return;
  }

  if (!existsSync(SAMPLES_DIR)) {
    throw new Error(
      `Falta el directorio "${SAMPLES_DIR}". Genere los archivos con:\n` +
        `  python seed-help-samples.py ${SAMPLES_DIR}`
    );
  }

  const disponibles = new Set(readdirSync(SAMPLES_DIR));
  for (const item of SEED_FILES) {
    if (!disponibles.has(item.file)) {
      throw new Error(
        `Falta el archivo de muestra "${item.file}". Genere los archivos con:\n` +
          `  python seed-help-samples.py ${SAMPLES_DIR}`
      );
    }
  }

  const { rows: userRows } = await db.query(
    `INSERT INTO users (name, email, password, provider, avatar_color, role)
     VALUES ($1, lower($2), $3, 'local', '#0ea5e9', 'user')
     RETURNING id`,
    [SEED_NAME, SEED_EMAIL, await bcrypt.hash(SEED_PASSWORD, 10)]
  );
  const userId = userRows[0].id;
  console.log(`Usuario creado: ${SEED_EMAIL} (contraseña: ${SEED_PASSWORD})`);

  const carpetaIds = new Map();
  for (const folder of SEED_FOLDERS) {
    const { rows } = await db.query(
      `INSERT INTO folders (user_id, name, color, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, folder.name, folder.color, folder.description]
    );
    carpetaIds.set(folder.name, rows[0].id);
  }
  console.log(`Carpetas creadas: ${SEED_FOLDERS.map((f) => f.name).join(", ")}`);

  let totalBytes = 0;
  for (const item of SEED_FILES) {
    const datos = readFileSync(join(SAMPLES_DIR, item.file));
    totalBytes += datos.length;

    const fileId = randomUUID();
    const storagePath = `${userId}/${fileId}-${item.file}`;

    if ((process.env.STORAGE_BACKEND ?? "local") === "local") {
      guardarEnDisco(storagePath, datos);
    }

    await db.query(
      `INSERT INTO files
         (user_id, folder_id, original_name, mime_type, category, size, storage_path, description, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        item.folder ? carpetaIds.get(item.folder) : null,
        item.file,
        item.mimeType,
        item.category,
        datos.length,
        storagePath,
        item.description,
        item.tags,
      ]
    );

    const destino = item.folder ? `-> ${item.folder}` : "-> Sin carpeta";
    console.log(`  ${item.file.padEnd(30)} ${destino}`);
  }

  console.log(
    `Archivos creados: ${SEED_FILES.length} (${totalBytes.toLocaleString(
      "es-ES"
    )} bytes en total)`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const wantsClean = args.includes("--clean");
  const wantsReset = args.includes("--reset");

  const db = new Client({ connectionString: readDatabaseUrl() });
  await db.connect();

  console.log(`Base de datos: ${db.database}\n`);
  const antes = await countAll(db);
  console.log("Estado previo:");
  console.log(`  ${JSON.stringify(antes)}\n`);

  if (wantsClean) {
    await cleanSeedData(db);
  }
  if (!wantsClean || wantsReset) {
    if (wantsReset) {
      await cleanSeedData(db);
      console.log("");
    }
    await seed(db);
  }

  const despues = await countAll(db);
  console.log("\nEstado posterior:");
  console.log(`  ${JSON.stringify(despues)}\n`);
  console.log(
    "Las diferencias corresponden únicamente a los datos de esta siembra."
  );

  await db.end();
}

main().catch(async (error) => {
  console.error("\nError:", error.message);
  process.exit(1);
});
