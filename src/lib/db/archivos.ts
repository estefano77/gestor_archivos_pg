import { query, queryOne, withTransaction, type PoolClient } from "./pool";
import { USER_QUOTA_BYTES } from "@/lib/file-utils";
import type { Categoria, FileRow } from "./types";

/**
 * Acceso a la tabla de archivos.
 *
 * Dos cosas que en la versión de MongoDB no hacían falta y aquí sí:
 *
 * 1. **SQL parametrizado siempre.** Los filtros se construyen añadiendo
 *    fragmentos a un arreglo y su valor al de parámetros. No se concatena texto
 *    del usuario en la consulta, así que la inyección es imposible por
 *    construcción en lugar de por cuidado.
 *
 * 2. **La cuota se reserva con un bloqueo de fila.** La versión anterior sumaba
 *    los bytes con una agregación y luego insertaba, en dos pasos sin
 *    transacción: dos subidas simultáneas de la misma cuenta podían pasar las
 *    dos el control y dejar al usuario por encima de su cuota. Aquí el
 *    `SELECT ... FOR UPDATE` sobre la fila del usuario serializa las subidas de
 *    una misma cuenta.
 */

export interface FiltrosListado {
  category?: string;
  /** Nombre de la carpeta, o "none"/"unorganized" para las que no tienen. */
  folder?: string;
  search?: string;
  sort?: string;
}

/**
 * Escapa los comodines de LIKE para que se busquen como texto literal.
 *
 * En la versión con MongoDB la búsqueda del usuario se pasaba tal cual a
 * `new RegExp()`, así que un punto o un paréntesis en lo que escribía cambiaba
 * el patrón. Con `ESCAPE` queda resuelto.
 */
function escaparLike(texto: string): string {
  return texto.replace(/([\\%_])/g, "\\$1");
}

/** `sort` es un valor que llega del navegador, así que solo se admiten estos. */
const ORDENES: Record<string, string> = {
  newest: "f.created_at DESC",
  oldest: "f.created_at ASC",
  name: "lower(f.original_name) ASC",
  size_desc: "f.size DESC",
  size_asc: "f.size ASC",
};

export async function listar(
  userId: string,
  filtros: FiltrosListado = {}
): Promise<FileRow[]> {
  const condiciones: string[] = ["f.user_id = $1"];
  const valores: unknown[] = [userId];
  let ultimo = 1;

  /**
   * Registra un valor y devuelve su marcador ($2, $3, …). Devolver el marcador
   * en vez de escribirlo a mano es lo que evita el error clásico de contar mal
   * los parámetros, que solo se detecta al ejecutar la consulta.
   */
  const siguiente = (valor: unknown): string => {
    valores.push(valor);
    ultimo += 1;
    return `$${ultimo}`;
  };

  if (filtros.category && filtros.category !== "all") {
    condiciones.push(`f.category = ${siguiente(filtros.category)}`);
  }

  if (filtros.folder && filtros.folder !== "all") {
    if (filtros.folder === "none" || filtros.folder === "unorganized") {
      // "Sin carpeta". En MongoDB había que cubrir tres casos porque el campo
      // podía estar vacío, ausente o null; con la clave foránea nullable basta
      // una sola condición.
      condiciones.push("f.folder_id IS NULL");
    } else {
      condiciones.push(`lower(fo.name) = lower(${siguiente(filtros.folder)})`);
    }
  }

  if (filtros.search && filtros.search.trim() !== "") {
    // Un único parámetro reutilizado en las cuatro condiciones: en PostgreSQL un
    // marcador se puede repetir sin volver a pasar el valor.
    const patron = siguiente(`%${escaparLike(filtros.search.trim())}%`);
    condiciones.push(
      `(f.original_name ILIKE ${patron} ESCAPE '\\'
        OR f.description ILIKE ${patron} ESCAPE '\\'
        OR fo.name ILIKE ${patron} ESCAPE '\\'
        OR EXISTS (SELECT 1 FROM unnest(f.tags) AS t WHERE t ILIKE ${patron} ESCAPE '\\'))`
    );
  }

  const orden = ORDENES[filtros.sort ?? "newest"] ?? ORDENES.newest;

  return query<FileRow>(
    `SELECT f.*, fo.name AS folder_name
       FROM files f
       LEFT JOIN folders fo ON fo.id = f.folder_id
      WHERE ${condiciones.join(" AND ")}
      ORDER BY ${orden}`,
    valores
  );
}

export async function buscarPorId(userId: string, id: string): Promise<FileRow | null> {
  return queryOne<FileRow>(
    `SELECT f.*, fo.name AS folder_name
       FROM files f
       LEFT JOIN folders fo ON fo.id = f.folder_id
      WHERE f.id = $1 AND f.user_id = $2
      LIMIT 1`,
    [id, userId]
  );
}

/** Datos mínimos para descargar o previsualizar: incluye la ruta del binario. */
export interface ArchivoParaLeer {
  id: string;
  original_name: string;
  mime_type: string;
  size: string | number;
  storage_path: string;
}

export async function buscarParaLeer(
  userId: string,
  id: string
): Promise<ArchivoParaLeer | null> {
  return queryOne<ArchivoParaLeer>(
    `SELECT id, original_name, mime_type, size, storage_path
       FROM files
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
    [id, userId]
  );
}

export interface NuevoArchivo {
  userId: string;
  folderId: string | null;
  originalName: string;
  mimeType: string;
  category: Categoria;
  size: number;
  storagePath: string;
  description?: string;
  tags?: string[];
}

const INSERTAR = `INSERT INTO files
       (user_id, folder_id, original_name, mime_type, category, size, storage_path, description, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`;

/** Los valores van en el orden de las columnas de `INSERTAR`, que no cambia. */
function valoresDeInsercion(d: NuevoArchivo): unknown[] {
  return [
    d.userId,
    d.folderId,
    d.originalName,
    d.mimeType,
    d.category,
    d.size,
    d.storagePath,
    d.description ?? "",
    d.tags ?? [],
  ];
}

export async function crear(datos: NuevoArchivo): Promise<FileRow> {
  const fila = await queryOne<FileRow>(INSERTAR, valoresDeInsercion(datos));
  if (!fila) throw new Error("No se pudo registrar el archivo");
  return fila;
}

/**
 * Inserta el archivo comprobando antes la cuota, todo en una transacción con la
 * fila del usuario bloqueada.
 *
 * Cuando no cabe devuelve el detalle que el manual documenta: lo que ya ocupa
 * la cuenta, cuánto queda y cuánto falta. Decir solo "no cabe" dejaba al
 * usuario probando archivos a ciegas.
 */
export type ResultadoReserva =
  | { ok: true; file: FileRow; usedBytes: number }
  | { ok: false; usedBytes: number; remaining: number; shortfall: number };

export async function reservarYCrear(datos: NuevoArchivo): Promise<ResultadoReserva> {
  return withTransaction(async (client: PoolClient) => {
    // Bloquea la fila del usuario: dos subidas simultáneas de la misma cuenta
    // se serializan aquí en lugar de calcular las dos el mismo total.
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [datos.userId]);

    const { rows: sumas } = await client.query<{ total: string }>(
      "SELECT COALESCE(SUM(size), 0) AS total FROM files WHERE user_id = $1",
      [datos.userId]
    );
    const usedBytes = Number(sumas[0]?.total ?? 0);

    if (usedBytes + datos.size > USER_QUOTA_BYTES) {
      const remaining = Math.max(0, USER_QUOTA_BYTES - usedBytes);
      return { ok: false, usedBytes, remaining, shortfall: datos.size - remaining };
    }

    const { rows: insertados } = await client.query<FileRow>(
      INSERTAR,
      valoresDeInsercion(datos)
    );

    return { ok: true, file: insertados[0], usedBytes };
  });
}

/**
 * Deshace una reserva cuando el binario no se pudo subir al almacén.
 *
 * Se reserva la cuota antes de subir el archivo a propósito: el rechazo por
 * cuota llena es un camino frecuente, y subir primero dejaría un binario
 * huérfano de 15 MB cada vez que alguien llega al límite. El riesgo en sentido
 * contrario es una fila apuntando a un binario que no llegó a existir si el
 * proceso muere entre los dos pasos, y ese se limpia con un script.
 */
export async function revertir(userId: string, id: string): Promise<void> {
  await query("DELETE FROM files WHERE id = $1 AND user_id = $2", [id, userId]);
}

export async function actualizar(
  userId: string,
  id: string,
  cambios: {
    originalName?: string;
    description?: string;
    tags?: string[];
    folderId?: string | null;
  }
): Promise<FileRow | null> {
  // `folder_id` necesita distinguir tres casos: no tocarlo, ponerlo a NULL
  // (mover a "Sin carpeta") o apuntarlo a una carpeta. Por eso el booleano de
  // la columna 6: un COALESCE no puede hacer ese trabajo.
  return queryOne<FileRow>(
    `UPDATE files
        SET original_name = COALESCE($3, original_name),
            description   = COALESCE($4, description),
            tags          = COALESCE($5, tags),
            folder_id     = CASE WHEN $6::boolean THEN $7::uuid ELSE folder_id END
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
    [
      id,
      userId,
      cambios.originalName ?? null,
      cambios.description ?? null,
      cambios.tags ?? null,
      cambios.folderId !== undefined,
      cambios.folderId ?? null,
    ]
  );
}

export async function borrar(userId: string, id: string): Promise<FileRow | null> {
  return queryOne<FileRow>(
    "DELETE FROM files WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, userId]
  );
}

/**
 * Vacía una carpeta: devuelve las rutas de los binarios y borra sus filas y la
 * carpeta, todo en una transacción.
 *
 * El borrado de los binarios se hace **después** del commit, a propósito. Si
 * estuviera dentro de la transacción, un fallo del servicio de almacenamiento
 * impediría al usuario borrar su carpeta; con este orden, lo peor que puede
 * pasar es que quede un binario huérfano, que ocupa espacio pero no se ve ni
 * compromete la coherencia de la base de datos.
 */
export async function vaciarCarpeta(
  userId: string,
  folderId: string
): Promise<{ storagePaths: string[]; folderName: string } | null> {
  return withTransaction(async (client: PoolClient) => {
    const carpetas = await client.query<{ name: string }>(
      "SELECT name FROM folders WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [folderId, userId]
    );
    if (!carpetas.rows[0]) return null;

    const archivosDeLaCarpeta = await client.query<{ storage_path: string }>(
      "SELECT storage_path FROM files WHERE folder_id = $1 AND user_id = $2",
      [folderId, userId]
    );

    await client.query("DELETE FROM files WHERE folder_id = $1 AND user_id = $2", [
      folderId,
      userId,
    ]);
    await client.query("DELETE FROM folders WHERE id = $1 AND user_id = $2", [
      folderId,
      userId,
    ]);

    return {
      storagePaths: archivosDeLaCarpeta.rows.map((r) => r.storage_path),
      folderName: carpetas.rows[0].name,
    };
  });
}

/** Totales por categoría. Sustituye a la agregación de `stats`. */
export interface EstadisticaCategoria {
  category: Categoria;
  total_bytes: string;
  count: string;
}

export async function estadisticasPorCategoria(
  userId: string
): Promise<EstadisticaCategoria[]> {
  return query<EstadisticaCategoria>(
    `SELECT category,
            COALESCE(SUM(size), 0) AS total_bytes,
            COUNT(*)               AS count
       FROM files
      WHERE user_id = $1
      GROUP BY category`,
    [userId]
  );
}
