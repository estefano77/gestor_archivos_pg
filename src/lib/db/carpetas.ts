import { query, queryOne } from "./pool";
import type { FolderRow } from "./types";

/**
 * Acceso a la tabla de carpetas.
 *
 * A diferencia de la versión con MongoDB, aquí no hace falta actualizar los
 * archivos al renombrar: la relación es una clave foránea, no el nombre de la
 * carpeta repetido en cada archivo. Y la detección de duplicados la resuelve el
 * índice `folders_user_name_key`, no una expresión regular en el código.
 */

export interface CarpetaConCuentas extends FolderRow {
  file_count: string | number;
  total_bytes: string | number;
}

/**
 * Lista las carpetas del usuario con el número de archivos y los bytes que
 * contienen, que es lo que pinta el panel.
 *
 * El LEFT JOIN + GROUP BY sustituye a la agregación de MongoDB. El filtro por
 * `f.user_id` es obligatorio además del de la carpeta: sin él, el
 * `COUNT(f.id)` de un LEFT JOIN contaría también los archivos de otro usuario
 * que compartieran carpeta, que es justo lo que el índice unique impide, pero no
 * conviene depender de eso.
 */
export async function listarConCuentas(userId: string): Promise<CarpetaConCuentas[]> {
  return query<CarpetaConCuentas>(
    `SELECT fo.id,
            fo.user_id,
            fo.name,
            fo.description,
            fo.color,
            fo.created_at,
            fo.updated_at,
            COUNT(f.id)          AS file_count,
            COALESCE(SUM(f.size), 0) AS total_bytes
       FROM folders fo
       LEFT JOIN files f ON f.folder_id = fo.id
      WHERE fo.user_id = $1
      GROUP BY fo.id
      ORDER BY fo.created_at DESC`,
    [userId]
  );
}

/**
 * Recuento y bytes de los archivos que no están en ninguna carpeta.
 *
 * Con la clave foránea nullable esto es un `WHERE folder_id IS NULL`, sin los
 * tres casos que había que cubrir en MongoDB (cadena vacía, campo ausente y
 * null), que era donde se perdían archivos en la cuenta.
 */
export async function countSinCarpeta(
  userId: string
): Promise<{ count: string; total_bytes: string }> {
  const filas = await query<{ count: string; total_bytes: string }>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS total_bytes
       FROM files
      WHERE user_id = $1 AND folder_id IS NULL`,
    [userId]
  );
  return filas[0] ?? { count: "0", total_bytes: "0" };
}

export async function buscarPorId(
  userId: string,
  id: string
): Promise<FolderRow | null> {
  return queryOne<FolderRow>(
    "SELECT * FROM folders WHERE id = $1 AND user_id = $2 LIMIT 1",
    [id, userId]
  );
}

/** Búsqueda insensible a mayúsculas, la que antes se hacía con `$regex`. */
export async function buscarPorNombre(
  userId: string,
  nombre: string
): Promise<FolderRow | null> {
  return queryOne<FolderRow>(
    "SELECT * FROM folders WHERE user_id = $1 AND lower(name) = lower($2) LIMIT 1",
    [userId, nombre]
  );
}

export interface NuevaCarpeta {
  userId: string;
  name: string;
  description?: string;
  color?: string;
}

export async function crear(datos: NuevaCarpeta): Promise<FolderRow> {
  const fila = await queryOne<FolderRow>(
    `INSERT INTO folders (user_id, name, description, color)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      datos.userId,
      datos.name,
      datos.description ?? "",
      datos.color ?? "indigo",
    ]
  );
  if (!fila) throw new Error("No se pudo crear la carpeta");
  return fila;
}

export async function actualizar(
  userId: string,
  id: string,
  cambios: { name?: string; description?: string; color?: string }
): Promise<FolderRow | null> {
  return queryOne<FolderRow>(
    `UPDATE folders
        SET name        = COALESCE($3, name),
            description = COALESCE($4, description),
            color       = COALESCE($5, color)
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
    [
      id,
      userId,
      cambios.name ?? null,
      cambios.description ?? null,
      cambios.color ?? null,
    ]
  );
}

export async function borrar(userId: string, id: string): Promise<FolderRow | null> {
  return queryOne<FolderRow>(
    "DELETE FROM folders WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, userId]
  );
}
