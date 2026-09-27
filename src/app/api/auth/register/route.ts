import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isLocalEnabled } from "@/lib/auth-config";
import * as usuarios from "@/lib/db/usuarios";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // El registro con contraseña solo existe en los modos 0 y 2. Ocultar el
    // formulario no bastaría: esta ruta es pública y se podría llamar a mano.
    if (!isLocalEnabled()) {
      return NextResponse.json(
        { error: "El registro con contraseña está deshabilitado." },
        { status: 403 }
      );
    }

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Por favor proporciona nombre, correo y contraseña" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const nombre = String(name).trim();
    if (nombre.length === 0) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }
    if (nombre.length > 60) {
      return NextResponse.json(
        { error: "El nombre no puede exceder 60 caracteres" },
        { status: 400 }
      );
    }

    const correo = String(email).toLowerCase().trim();
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(correo)) {
      return NextResponse.json(
        { error: "Por favor ingresa un correo electrónico válido" },
        { status: 400 }
      );
    }

    const existente = await usuarios.buscarPorEmail(correo);
    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este correo electrónico" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let nuevo;
    try {
      nuevo = await usuarios.crearUsuario({
        name: nombre,
        email: correo,
        password: hashedPassword,
        provider: "local",
      });
    } catch (error) {
      // 23505 = unique_violation. Dos registros simultáneos con el mismo correo
      // pueden pasar la comprobación anterior; el índice decide cuál entra y
      // este traduce su error al mismo 409 que ya devuelve el caso normal.
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "Ya existe una cuenta con este correo electrónico" },
          { status: 409 }
        );
      }
      // 23514 = check_violation, del CHECK de longitud del nombre.
      if ((error as { code?: string }).code === "23514") {
        return NextResponse.json(
          { error: "Los datos no son válidos." },
          { status: 400 }
        );
      }
      throw error;
    }

    const token = await signToken({
      userId: nuevo.id,
      email: nuevo.email,
      name: nuevo.name,
      role: nuevo.role,
      avatarColor: nuevo.avatar_color,
    });

    const response = NextResponse.json(
      {
        message: "Registro exitoso",
        user: {
          id: nuevo.id,
          name: nuevo.name,
          email: nuevo.email,
          role: nuevo.role,
          avatarColor: nuevo.avatar_color,
        },
      },
      { status: 201 }
    );

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
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
