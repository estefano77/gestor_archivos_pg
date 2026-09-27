import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

/**
 * Secreto con el que se firman las sesiones.
 *
 * Antes caía a un valor fijo escrito aquí. Eso era peligroso: el repositorio es
 * público, así que cualquiera podía copiar ese valor y firmar un token de
 * sesión con el identificador de usuario que quisiera, accediendo a los
 * archivos de cualquier cuenta. Si `JWT_SECRET` no está definido, la
 * aplicación tiene que negarse a arrancar en lugar de inventarse un secreto.
 */
function leerSecreto(): string {
  const secreto = process.env.JWT_SECRET;

  if (!secreto || secreto.length < 32) {
    throw new Error(
      "JWT_SECRET no está definido o es demasiado corto (mínimo 32 caracteres). " +
        "Genera uno con: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\" " +
        "y ponlo en .env.local. No se usa ningún valor por defecto a propósito: " +
        "un secreto conocido permitiría falsificar sesiones."
    );
  }

  return secreto;
}

const secretKey = new TextEncoder().encode(leerSecreto());

export const AUTH_COOKIE_NAME = "gestor_auth_token";

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: "user" | "admin";
  avatarColor?: string;
  [key: string]: unknown;
}

/**
 * Signs a JWT with 7-day expiration
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Verifies a JWT token and returns the payload or null
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and verifies the user session from server-side cookies
 */
export async function getSessionUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch (error) {
    return null;
  }
}

/**
 * Extracts user from an incoming NextRequest (useful in Route Handlers & Middleware)
 */
export async function getRequestUser(
  req: NextRequest
): Promise<TokenPayload | null> {
  const token =
    req.cookies.get(AUTH_COOKIE_NAME)?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) return null;
  return await verifyToken(token);
}
