import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";

// Se reexportan para que el resto de la capa de datos no tenga que importar de
// `pg` directamente, dejando claro que el único punto de entrada es este módulo.
export type { PoolClient, QueryResultRow };

/**
 * Conexión a PostgreSQL.
 *
 * Sustituye a `src/lib/mongodb.ts`. Mantiene la misma idea que tenía aquel
 * archivo: en Vercel cada función se ejecuta en un entorno que puede reutilizar
 * y luego descartar, así que el pool se guarda en `globalThis` para no abrir una
 * conexión nueva por cada petición.
 *
 * ## Sobre el pooler de Supabase
 *
 * En producción la variable debe apuntar al *pooler* en modo transacción
 * (puerto 6543), no a la conexión directa (5432). Las funciones serverless abren
 * y cierran conexiones constantemente, y la conexión directa se agota enseguida:
 * `max: 1` por instancia y el pooler se encargan de multiplexar.
 *
 * ## Sobre RLS
 *
 * Esta conexión usa un rol privilegiado, así que ignora las políticas de Row
 * Level Security. El control de acceso vive en las rutas de API, que filtran
 * por `user_id` en cada consulta. RLS queda activado en el esquema como red de
 * seguridad para el caso de que la `anon` key se llegue a usar por error.
 */

const DATABASE_URL = process.env.DATABASE_URL;

interface PgCache {
  pool: Pool | null;
}

declare global {
  // eslint-disable-next-line no-var
  var pgCache: PgCache | undefined;
}

const cache: PgCache = global.pgCache ?? { pool: null };
global.pgCache = cache;

/**
 * Decide el TLS según el host de la cadena de conexión.
 *
 * Reglas, por orden:
 *
 * 1. Si `PGSSLMODE` está puesto, manda sobre todo. Es la vía para un caso raro
 *    (un túnel, un servidor propio con su certificado).
 * 2. `localhost` o `127.0.0.1` sin TLS: no se pide. El PostgreSQL de desarrollo
 *    no lo trae y exigirlo rompe la conexión con un error que no explica nada.
 * 3. Cualquier otro host, Supabase incluido: TLS sí, sin validar el
 *    certificado. Supabase lo sirve con una cadena que el sistema no siempre
 *    reconoce, y sin esta opción falla con "self-signed certificate in chain".
 */
function opcionesSsl(url: string): PoolConfig["ssl"] {
  const modo = process.env.PGSSLMODE?.toLowerCase();
  if (modo === "disable") return false;
  if (modo === "require" || modo === "verify-ca" || modo === "verify-full") {
    return { rejectUnauthorized: true };
  }

  const esLocal = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);
  if (esLocal) return false;

  return { rejectUnauthorized: false };
}

/**
 * Obtiene el pool, creándolo la primera vez. Lanza si falta la configuración,
 * en lugar de inventarse una conexión: arrancar sin base de datos y fallar en
 * la primera petición esconde el problema.
 */
export function getPool(): Pool {
  if (cache.pool) return cache.pool;

  if (!DATABASE_URL) {
    throw new Error(
      "Falta la variable de entorno DATABASE_URL. Define la cadena de conexión " +
        "de PostgreSQL en .env.local (ver .env.example) o en la configuración de Vercel."
    );
  }

  cache.pool = new Pool({
    connectionString: DATABASE_URL,
    // Serverless: una conexión por instancia como mucho.
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Cómo negociar el TLS depende de a dónde apunte la cadena, y antes de esto
    // había que acordarse de cambiar PGSSLMODE al alternar entre el PostgreSQL
    // local y Supabase. Olvidarse producía un error engañoso: con
    // `PGSSLMODE=require` contra el servidor local, que no usa TLS, el driver
    // responde "The server does not support SSL connections" y parece un
    // problema de la base de datos cuando la culpa es del modo.
    ssl: opcionesSsl(DATABASE_URL),
  });

  // Sin esto, un fallo de red en segundo plano tumba el proceso en vez de
  // quedarse solo en la petición que lo provocó.
  cache.pool.on("error", (err) => {
    console.error("Error inesperado en el pool de PostgreSQL:", err.message);
  });

  return cache.pool;
}

/** Ejecuta una consulta y devuelve sus filas. */
export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(text, values);
  return result.rows;
}

/** Ejecuta una consulta y devuelve la primera fila, o `null` si no hay ninguna. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

/**
 * Envuelve un bloque en una transacción y entrega el cliente a la función.
 *
 * Se usa para las operaciones que no pueden quedar a medias, sobre todo el
 * borrado de una carpeta (archivos + carpeta) y la reserva de cuota.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {
      // Si el ROLLBACK falla la conexión ya está muerta; el pool la descartará.
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cierra el pool. Solo para scripts de una sola ejecución y para los tests.
 */
export async function closePool(): Promise<void> {
  if (cache.pool) {
    await cache.pool.end();
    cache.pool = null;
  }
}
