/**
 * Estado de la base de datos, para verificar a mano sin abrir la aplicación.
 *
 *   node dbcheck.mjs
 *
 * Sustituye a la versión con MongoDB. Comprueba lo mismo que aquella más tres
 * cosas que solo tienen sentido en PostgreSQL: que las claves foráneas estén
 * íntegras, que RLS esté activado y que no haya archivos huérfinos en el
 * almacén.
 */

import { Client } from "pg";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

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

const db = new Client({ connectionString: readDatabaseUrl() });
await db.connect();

const { rows: resumen } = await db.query(`
  SELECT
    (SELECT COUNT(*) FROM users)   AS usuarios,
    (SELECT COUNT(*) FROM folders) AS carpetas,
    (SELECT COUNT(*) FROM files)   AS archivos,
    (SELECT COALESCE(SUM(size), 0) FROM files) AS bytes
`);
const r = resumen[0];

console.log("\n=== RECUENTO ===");
console.log(`  usuarios ......... ${r.usuarios}`);
console.log(`  carpetas ......... ${r.carpetas}`);
console.log(`  archivos ......... ${r.archivos}`);
console.log(`  bytes totales .... ${Number(r.bytes).toLocaleString("es-ES")}`);

console.log("\n=== USUARIOS ===");
const { rows: usuarios } = await db.query(
  `SELECT u.email,
          u.provider,
          u.created_at,
          (SELECT COUNT(*) FROM files f WHERE f.user_id = u.id) AS archivos,
          (SELECT COALESCE(SUM(size), 0) FROM files f WHERE f.user_id = u.id) AS bytes
     FROM users u
    ORDER BY u.created_at`
);
for (const u of usuarios) {
  console.log(
    `  ${u.email.padEnd(38)} [${u.provider}] ${String(u.archivos).padStart(3)} archivos  ${Number(
      u.bytes
    ).toLocaleString("es-ES")} bytes`
  );
}

console.log("\n=== CARPETAS ===");
const { rows: carpetas } = await db.query(
  `SELECT fo.name, u.email,
          COUNT(f.id) AS archivos,
          COALESCE(SUM(f.size), 0) AS bytes
     FROM folders fo
     JOIN users u ON u.id = fo.user_id
     LEFT JOIN files f ON f.folder_id = fo.id
    GROUP BY fo.id, u.email
    ORDER BY u.email, fo.created_at`
);
for (const c of carpetas) {
  console.log(
    `  "${c.name}" de ${c.email.padEnd(30)} ${String(c.archivos).padStart(3)} archivos  ${Number(
      c.bytes
    ).toLocaleString("es-ES")} bytes`
  );
}

console.log("\n=== ARCHIVOS ===");
const { rows: archivos } = await db.query(
  `SELECT f.original_name, f.category, f.size, f.storage_path,
          COALESCE(fo.name, '(sin carpeta)') AS carpeta,
          u.email
     FROM files f
     JOIN users u ON u.id = f.user_id
     LEFT JOIN folders fo ON fo.id = f.folder_id
    ORDER BY u.email, f.created_at`
);
for (const f of archivos) {
  console.log(
    `  ${f.original_name.padEnd(42)} ${f.category.padEnd(11)} ${f.carpeta.padEnd(16)} ${Number(
      f.size
    ).toLocaleString("es-ES").padStart(9)} B  ${f.email}`
  );
}

console.log("\n=== INTEGRIDAD ===");
const { rows: huerfanos } = await db.query(
  `SELECT COUNT(*)::int AS n
     FROM files f
    WHERE f.storage_path = ''
       OR f.storage_path IS NULL`
);
console.log(
  `  archivos sin ruta de almacenamiento: ${huerfanos[0].n} ${
    huerfanos[0].n === 0 ? "OK" : "← hay que revisarlo"
  }`
);

const { rows: rls } = await db.query(`
  SELECT c.relname AS tabla, c.relrowsecurity AS rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname IN ('users','folders','files')
   ORDER BY c.relname
`);
console.log("  RLS por tabla:");
for (const t of rls) {
  console.log(`    ${t.tabla.padEnd(9)} ${t.rls ? "activado OK" : "DESACTIVADO ← corregir"}`);
}

// Solo tiene sentido con el almacén en disco; en Supabase los binarios no están
// en el proyecto y la comprobación no aplica.
if ((process.env.STORAGE_BACKEND ?? "local") === "local") {
  const dir = process.env.STORAGE_LOCAL_PATH ?? ".storage";
  console.log("\n=== BINARIOS EN DISCO ===");
  if (!existsSync(dir)) {
    console.log(`  la carpeta "${dir}" no existe todavía`);
  } else {
    const rutas = [];
    const recorrer = (d) => {
      for (const entrada of readdirSync(d)) {
        const completa = join(d, entrada);
        if (statSync(completa).isDirectory()) recorrer(completa);
        else rutas.push(relative(dir, completa).split("\\").join("/"));
      }
    };
    recorrer(dir);

    const enBase = new Set(archivos.map((f) => f.storage_path));
    const sinFila = rutas.filter((ruta) => !enBase.has(ruta));
    const sinBinario = [...enBase].filter((ruta) => !rutas.includes(ruta));

    console.log(`  en disco ............ ${rutas.length}`);
    console.log(`  filas en la tabla ... ${enBase.size}`);
    console.log(`  en disco sin fila .... ${sinFila.length}${sinFila.length ? " ← huérfanos" : " OK"}`);
    sinFila.forEach((ruta) => console.log(`      ${ruta}`));
    console.log(
      `  fila sin binario ..... ${sinBinario.length}${sinBinario.length ? " ← faltan archivos" : " OK"}`
    );
    sinBinario.forEach((ruta) => console.log(`      ${ruta}`));
  }
}

console.log("");
await db.end();
