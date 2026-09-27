import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { isGoogleEnabled } from "@/lib/auth-config";
import { resolveGoogleRedirectUri } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

/** Cookie temporal que empareja el `state` con la petición que lo generó. */
export const OAUTH_STATE_COOKIE = "google_oauth_state";

/** Segundos que vive el `state`. Suficiente para el viaje de ida y vuelta. */
const STATE_TTL_SECONDS = 600;

/**
 * Inicio del flujo OAuth de Google: genera un `state` aleatorio, lo guarda en
 * una cookie y redirige al usuario a la pantalla de consentimiento.
 *
 * El `state` es lo que impide que alguien enganche a esta sesión una respuesta
 * de Google ajena (ataque CSRF o de inyección de código de autorización).
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // El modo 0 deja Google fuera. La ruta se cierra igual que el botón, para
  // que no se pueda saltar el ajuste llamando directamente al endpoint.
  if (!isGoogleEnabled()) {
    return NextResponse.json(
      { error: "El inicio de sesión con Google está deshabilitado." },
      { status: 403 }
    );
  }

  // Sin credenciales configuradas no se ofrece el botón, así que este camino
  // solo se alcanza si alguien teclea la URL a mano.
  if (!clientId) {
    return NextResponse.json(
      { error: "El inicio de sesión con Google no está configurado." },
      { status: 503 }
    );
  }

  // Google exige que esta URI sea exactamente la que esté registrada en su
  // consola. Con GOOGLE_REDIRECT_URI en el entorno el valor es fijo; sin ella
  // se deduce de la petición, que es lo cómodo en desarrollo.
  const callbackUrl = resolveGoogleRedirectUri(req.url);

  const state = randomBytes(32).toString("base64url");

  const authorizeUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth"
  );
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("response_type", "code");
  // `openid email profile` son scopes no sensibles: no requieren revisión de
  // Google, a diferencia de `drive` o `gmail`.
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_TTL_SECONDS,
    path: "/",
  });

  return response;
}
