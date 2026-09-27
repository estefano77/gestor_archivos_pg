import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Verificación de la identidad que devuelve Google.
 *
 * Google devuelve un `id_token` que es un JWT firmado por Google. Se verifica
 * aquí contra las claves públicas que publica Google, sin secreto compartido y
 * sin dependencias adicionales: `jose` ya estaba en el proyecto para las
 * sesiones.
 */

/** Ruta de la callback. Es el valor que debe registrarse en Google Cloud. */
export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

/**
 * Resuelve la URI de redirección de Google.
 *
 * Google exige que la `redirect_uri` sea **idéntica** en la petición de
 * autorización y en el canje del código. Si cada ruta la calculara por su
 * cuenta, un dominio con o sin `www`, o simplemente entrar por otra puerta,
 * romperían el canje con un error confuso. Por eso las dos rutas llaman a esta
 * misma función.
 *
 * Con `GOOGLE_REDIRECT_URI` en el entorno manda el valor fijo, que es lo
 * recomendado en producción: la aplicación deja de depender de con qué host
 * escribió el usuario la dirección. Sin esa variable se deduce de la petición,
 * que es lo cómodo en desarrollo.
 */
export function resolveGoogleRedirectUri(requestUrl: string): string {
  const configurada = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!configurada) {
    return new URL(GOOGLE_CALLBACK_PATH, requestUrl).toString();
  }

  // Se valida para que un error de tecleo aparezca al arrancar y no como un
  // `redirect_uri_mismatch` veinte minutos después.
  let url: URL;
  try {
    url = new URL(configurada);
  } catch {
    throw new Error(
      `GOOGLE_REDIRECT_URI no es una URL válida: "${configurada}". ` +
        "Debe ser algo como https://tu-dominio.com/api/auth/google/callback"
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(
      `GOOGLE_REDIRECT_URI debe empezar por http:// o https://, pero es "${configurada}".`
    );
  }

  return url.toString();
}

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

/**
 * Google usa `https://accounts.google.com` como issuer, pero historicamente
 * tambien ha emitido tokens con `accounts.google.com` sin esquema. Se aceptan
 * ambos para no rechazar cuentas validas.
 */
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleIdentity {
  /** Identificador estable de la cuenta en Google. Es el claim `sub`. */
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

/**
 * Verifica el `id_token` y devuelve la identidad de la cuenta.
 *
 * Rechaza si la firma no es de Google, si el token es de otra aplicación
 * (audiencia distinta) o si Google no confirma que el correo esté verificado.
 * Esto último importa: sin esa comprobación, alguien podría registrar una
 * dirección que no posee y quedarse con la cuenta del titular.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string
): Promise<GoogleIdentity> {
  let payload: JWTPayload;

  try {
    const verified = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
    });
    payload = verified.payload;
  } catch (error) {
    // Se registra el motivo (firma inválida, audiencia distinta, caducado,
    // desfase de reloj) porque sin él el fallo es imposible de diagnosticar.
    // Nunca se registra el token.
    console.error("Fallo al verificar el id_token de Google:", error);
    throw new GoogleAuthError(
      "El token de Google no es válido o ha caducado. Vuelve a intentarlo."
    );
  }

  const { sub, email, email_verified, name, picture } = payload as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (!sub || !email) {
    throw new GoogleAuthError("Google no devolvió los datos de la cuenta.");
  }

  if (email_verified !== true) {
    throw new GoogleAuthError(
      "Google no confirma que este correo esté verificado. Usa una cuenta de Google con el correo confirmado."
    );
  }

  return {
    googleId: sub,
    email: email.toLowerCase().trim(),
    // El nombre que da Google puede pasar de 60 caracteres, que es el máximo
    // del esquema. Se recorta para que la creación del usuario no falle.
    name: (name?.trim() || email.split("@")[0]).slice(0, 60),
    picture,
  };
}

/**
 * Canjea el código de autorización por los tokens de Google.
 *
 * Se usa `application/x-www-form-urlencoded` y el secreto va en el cuerpo, que
 * es lo que acepta `client_secret_post` (declarado en la configuración OIDC
 * de Google).
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ idToken: string }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GoogleAuthError(
      "Google no ha aceptado el inicio de sesión. Vuelve a intentarlo."
    );
  }

  const data = (await response.json()) as { id_token?: string };
  if (!data.id_token) {
    throw new GoogleAuthError("Google no devolvió un token de identidad.");
  }

  return { idToken: data.id_token };
}
