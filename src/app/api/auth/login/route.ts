import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isLocalEnabled } from "@/lib/auth-config";
import * as usuarios from "@/lib/db/usuarios";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // El acceso con contraseña solo existe en los modos 0 y 2. Comprobado en el
    // servidor y no solo ocultando el formulario.
    if (!isLocalEnabled()) {
      return NextResponse.json(
        { error: "El acceso con contraseña está deshabilitado." },
        { status: 403 }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Por favor proporciona tu correo y contraseña" },
        { status: 400 }
      );
    }

    const correo = String(email).toLowerCase().trim();
    const user = await usuarios.buscarPorEmail(correo);

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Una cuenta creada con Google no tiene contraseña guardada. Sin esta
    // comprobación, `bcrypt.compare` recibiría `null` y reventaría con un 500 en
    // lugar de un mensaje utilizable.
    if (!user.password) {
      return NextResponse.json(
        {
          error:
            "Esta cuenta se creó con Google. Inicia sesión con el botón de Google.",
        },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarColor: user.avatar_color || "#6366f1",
    });

    const response = NextResponse.json({
      message: "Inicio de sesión exitoso",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatar_color,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Error en login:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
