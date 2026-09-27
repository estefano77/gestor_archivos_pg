import { query, queryOne } from "./pool";
import type { UserRow } from "./types";

/**
 * Acceso a la tabla de usuarios.
 *
 * Todas las consultas usan `lower(email)` porque el correo no distingue
 * mayúsculas: en MongoDB lo garantizaba `lowercase: true` en el esquema y un
 * índice único; aquí lo garantiza el índice funcional de la migración.
 */

export async function buscarPorEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    "SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1",
    [email]
  );
}

export async function buscarPorId(id: string): Promise<UserRow | null> {
  return queryOne<UserRow>("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
}

export async function buscarPorProvider(
  provider: string,
  providerId: string
): Promise<UserRow | null> {
  return queryOne<UserRow>(
    "SELECT * FROM users WHERE provider = $1 AND provider_id = $2 LIMIT 1",
    [provider, providerId]
  );
}

export interface NuevoUsuario {
  name: string;
  email: string;
  password?: string;
  provider?: "local" | "google";
  providerId?: string;
  avatarColor?: string;
}

export async function crearUsuario(datos: NuevoUsuario): Promise<UserRow> {
  const fila = await queryOne<UserRow>(
    `INSERT INTO users (name, email, password, provider, provider_id, avatar_color)
     VALUES ($1, lower($2), $3, $4, $5, $6)
     RETURNING *`,
    [
      datos.name,
      datos.email,
      datos.password ?? null,
      datos.provider ?? "local",
      datos.providerId ?? null,
      datos.avatarColor ?? randomAvatarColor(),
    ]
  );
  // RETURNING * sobre un INSERT siempre devuelve una fila.
  if (!fila) throw new Error("No se pudo crear el usuario");
  return fila;
}

/**
 * Vincula una cuenta de Google que ya existía con contraseña.
 *
 * Se usa al entrar con Google con un correo que ya tiene cuenta: no se crea una
 * duplicada, se marca la existente. Solo se rellenan `provider` y `provider_id`,
 * el resto de la cuenta (archivos, carpetas) no se toca.
 */
export async function vincularConGoogle(
  userId: string,
  providerId: string
): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `UPDATE users
        SET provider = 'google', provider_id = $2
      WHERE id = $1
      RETURNING *`,
    [userId, providerId]
  );
}

export async function actualizarPerfil(
  userId: string,
  cambios: { name?: string; avatarColor?: string }
): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `UPDATE users
        SET name = COALESCE($2, name),
            avatar_color = COALESCE($3, avatar_color)
      WHERE id = $1
      RETURNING *`,
    [userId, cambios.name ?? null, cambios.avatarColor ?? null]
  );
}

/**
 * Colores de avatar. La misma lista de ocho que usaba la ruta de registro en la
 * versión con MongoDB, para que el aspecto de las cuentas sea idéntico.
 */
const AVATAR_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#f43f5e", // rojo
  "#06b6d4", // cian
  "#10b981", // esmeralda
  "#f59e0b", // ambar
  "#3b82f6", // azul
];

function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/** Devuelve todos los correos, para verificar una migración a mano. */
export async function listarEmails(): Promise<string[]> {
  const filas = await query<{ email: string }>("SELECT email FROM users ORDER BY email");
  return filas.map((f) => f.email);
}
