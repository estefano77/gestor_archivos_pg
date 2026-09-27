/**
 * Filas de PostgreSQL y su traducción a los objetos que la API devuelve.
 *
 * Los nombres en `snake_case` son los de las columnas. Las funciones de aquí
 * traducen las filas a la forma que espera el frontend, que **no cambia** con
 * respecto a la versión de MongoDB: es lo que permite reutilizar los 20
 * componentes sin tocarlos.
 */

/** Categoría de archivo. Mismo dominio que `FileCategory` en file-utils. */
export type Categoria = "pdf" | "image" | "word" | "excel" | "powerpoint" | "other";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string | null;
  provider: "local" | "google";
  provider_id: string | null;
  avatar_color: string;
  role: "user" | "admin";
  created_at: Date;
  updated_at: Date;
}

export interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  created_at: Date;
  updated_at: Date;
}

export interface FileRow {
  id: string;
  user_id: string;
  folder_id: string | null;
  original_name: string;
  mime_type: string;
  category: Categoria;
  /** `bigint` llega como string en el driver `pg`; se normaliza a number. */
  size: string | number;
  storage_path: string;
  description: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  /** Nombre de la carpeta, viene del LEFT JOIN. `null` = sin carpeta. */
  folder_name?: string | null;
}

/** Forma que espera el frontend. Idéntica a la de la versión con MongoDB. */
export interface ArchivoDTO {
  _id: string;
  originalName: string;
  mimeType: string;
  category: Categoria;
  size: number;
  folder: string;
  description: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function filaADTO(f: FileRow): ArchivoDTO {
  return {
    _id: f.id,
    originalName: f.original_name,
    mimeType: f.mime_type,
    category: f.category,
    size: Number(f.size),
    // Sin carpeta se representa como cadena vacía, igual que en MongoDB.
    folder: f.folder_name ?? "",
    description: f.description,
    tags: f.tags ?? [],
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  };
}
