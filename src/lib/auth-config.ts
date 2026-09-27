/**
 * Modos de acceso a la aplicación.
 *
 * Una sola variable de entorno decide qué métodos de autenticación están
 * disponibles. Se comprueba en el servidor (las rutas rechazan lo que no toca)
 * y en el cliente (para pintar solo los botones correspondientes). Ocultar un
 * botón sin cerrar la ruta sería decorations: cualquiera podría llamar al
 * endpoint a mano.
 *
 *   0  Solo cuenta local (correo y contraseña)
 *   1  Solo cuenta de Google
 *   2  Ambas modalidades
 *
 * Variable: `NEXT_PUBLIC_AUTH_MODE`.
 *
 * El prefijo `NEXT_PUBLIC_` es intencionado: el cliente necesita leerla para
 * decidir qué pintar, y no contiene ningún secreto. El efecto real lo aplican
 * las rutas del servidor.
 */

export const AUTH_MODE_LOCAL_ONLY = 0;
export const AUTH_MODE_GOOGLE_ONLY = 1;
export const AUTH_MODE_BOTH = 2;

export type AuthMode = 0 | 1 | 2;

export const AUTH_MODE_VALUES: Record<AuthMode, string> = {
  0: "solo cuenta local (correo y contraseña)",
  1: "solo cuenta de Google",
  2: "ambas modalidades",
};

/**
 * Lee el modo desde el entorno y falla si el valor no es válido.
 *
 * Ante un valor inesperado se lanza un error en lugar de elegir un modo por
 * defecto: si alguien escribe `3` queriendo restringir el acceso y la
 * aplicación cayera en "ambas modalidades", volvería a quedar expuesto un
 * método de acceso que el administrador creía cerrado. Fallar aquí es la
 * dirección segura.
 */
export function parseAuthMode(raw: string | undefined): AuthMode {
  const valor = (raw ?? "").trim();

  // Sin variable, o vacía, se asume el modo más restrictivo.
  if (valor === "") return AUTH_MODE_LOCAL_ONLY;

  if (valor === "0") return AUTH_MODE_LOCAL_ONLY;
  if (valor === "1") return AUTH_MODE_GOOGLE_ONLY;
  if (valor === "2") return AUTH_MODE_BOTH;

  throw new Error(
    `NEXT_PUBLIC_AUTH_MODE tiene el valor "${valor}", que no es válido. ` +
      "Usa 0 (solo cuenta local), 1 (solo cuenta de Google) o 2 (ambas)."
  );
}

let cacheado: AuthMode | null = null;

/** Modo actual. Se lee una vez y se memoiza. */
export function getAuthMode(): AuthMode {
  if (cacheado === null) {
    cacheado = parseAuthMode(process.env.NEXT_PUBLIC_AUTH_MODE);
  }
  return cacheado;
}

/** ¿Se permite entrar con correo y contraseña? */
export function isLocalEnabled(): boolean {
  const mode = getAuthMode();
  return mode === AUTH_MODE_LOCAL_ONLY || mode === AUTH_MODE_BOTH;
}

/** ¿Se permite entrar con Google? */
export function isGoogleEnabled(): boolean {
  const mode = getAuthMode();
  return mode === AUTH_MODE_GOOGLE_ONLY || mode === AUTH_MODE_BOTH;
}
