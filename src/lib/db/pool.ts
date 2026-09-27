import { Pool, type PoolClient, type QueryResultRow } from "pg";

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
    // Supabase sirve el TLS con un certificado que no está en la cadena de
    // confianza del sistema en algunos entornos; sin esto la conexión falla con
    // "self-signed certificate in certificate chain". Se puede desactivar con
    // PGSSLMODE=disable solo en local.
    ...(process.env.PGSSLMODE === "disable" ? { ssl: false } : { ssl: { rejectUnauthorized: false } }),
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
