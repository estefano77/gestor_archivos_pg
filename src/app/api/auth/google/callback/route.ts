import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import * as usuarios from "@/lib/db/usuarios";
import type { UserRow } from "@/lib/db/types";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import {
  verifyGoogleIdToken,
  exchangeCodeForTokens,
  resolveGoogleRedirectUri,
  GoogleAuthError,
  type GoogleIdentity,
} from "@/lib/google-auth";
import { OAUTH_STATE_COOKIE } from "../route";
import { isGoogleEnabled } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

/** Comparación en tiempo constante para no filtrar el valor con los tiempos. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Localiza la cuenta de Google o la crea.
 *
 * Se busca primero por el identificador de Google (`sub`), que es estable
 * aunque la persona cambie de correo. Si no aparece, se busca por correo: eso
 * convierte una cuenta creada con contraseña en una cuenta con Google, en vez
 * de duplicarla y repartir los archivos entre dos identidades. Es seguro
 * porque Google confirma que el correo está verificado.
 */
async function findOrCreateUser(identity: GoogleIdentity): Promise<UserRow> {
  const porIdDeGoogle = await usuarios.buscarPorProvider("google", identity.googleId);
  if (porIdDeGoogle) return porIdDeGoogle;

  const porCorreo = await usuarios.buscarPorEmail(identity.email);
  if (porCorreo) {
    // Se entra en la cuenta que ya existía, con sus archivos. Solo se añaden
    // `provider` y `provider_id`; el resto no se toca.
    const vinculada = await usuarios.vincularConGoogle(porCorreo.id, identity.googleId);
    if (vinculada) return vinculada;
  }

  try {
    return await usuarios.crearUsuario({
      name: identity.name,
      email: identity.email,
      provider: "google",
      providerId: identity.googleId,
      // Sin `password`: esta cuenta no tiene contraseña y no debe tenerla.
    });
  } catch (err) {
    // Dos inicios de sesión simultáneos con el mismo correo pueden chocar con
    // el índice único. Quien haya ganado la carrera ya creó la cuenta.
    if ((err as { code?: string }).code === "23505") {
      const recienCreada = await usuarios.buscarPorEmail(identity.email);
      if (recienCreada) return recienCreada;
    }
    throw err;
  }
}

/** Vuelve a la pantalla de acceso con un mensaje legible. */
function volverConError(mensaje: string, req: NextRequest) {
  const url = new URL("/auth", req.url);
  url.searchParams.set("error", mensaje);
  const response = NextResponse.redirect(url.toString());
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

async function responderConSesion(user: UserRow, req: NextRequest) {
  const token = await signToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarColor: user.avatar_color,
  });

  const response = NextResponse.redirect(new URL("/", req.url).toString());
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Si el administrador pasó a un modo sin Google, una vuelta pendiente de una
  // pestaña ya abierta no debe poder completar el inicio de sesión.
  if (!isGoogleEnabled()) {
    return NextResponse.json(
      { error: "El inicio de sesión con Google está deshabilitado." },
      { status: 403 }
    );
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "El inicio de sesión con Google no está configurado." },
      { status: 503 }
    );
  }

  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  // La persona pulsó "Cancelar" en la pantalla de Google.
  if (params.get("error")) {
    return volverConError("Has cancelado el inicio de sesión con Google.", req);
  }

  if (!code || !state) {
    return volverConError("Google no devolvió una respuesta válida.", req);
  }

  // --- Protección CSRF: el `state` debe coincidir con el de nuestra cookie ---
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!expectedState || !safeEqual(state, expectedState)) {
    return volverConError(
      "No se pudo verificar el inicio de sesión. Vuelve a intentarlo.",
      req
    );
  }

  try {
    // Debe ser la misma URI que se envió en la petición de autorización. Si
    // difieren aunque sea en un carácter, Google rechaza el canje.
    const callbackUrl = resolveGoogleRedirectUri(req.url);

    // --- 1. Canjear el código y verificar la firma del id_token ---
    const { idToken } = await exchangeCodeForTokens(
      code,
      clientId,
      clientSecret,
      callbackUrl
    );
    const identity = await verifyGoogleIdToken(idToken, clientId);

    // --- 2. Localizar o crear la cuenta ---
    const user = await findOrCreateUser(identity);

    // --- 3. Emitir la misma cookie de sesión que usa el login por contraseña ---
    return await responderConSesion(user, req);
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      return volverConError(err.message, req);
    }

    console.error("Error en el inicio de sesión con Google:", err);
    return volverConError(
      "Ha ocurrido un error al iniciar sesión con Google.",
      req
    );
  }
}
