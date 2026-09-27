import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import * as usuarios from "@/lib/db/usuarios";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userPayload = await getRequestUser(req);

    if (!userPayload) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Se relee de la base y no se devuelve lo que lleva el token: si alguien
    // cambia de nombre o se le cierra la cuenta, el token sigue siendo válido
    // siete días y aquí es donde se refleja el cambio.
    const user = await usuarios.buscarPorId(userPayload.userId);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatar_color,
        createdAt: user.created_at,
      },
    });
  } catch (error: unknown) {
    console.error("Error al obtener sesión:", error);
    return NextResponse.json(
      { error: "Error al validar la sesión" },
      { status: 500 }
    );
  }
}
