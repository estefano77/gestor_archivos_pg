import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import * as carpetas from "@/lib/db/carpetas";

export const dynamic = "force-dynamic";

/**
 * Carpetas del usuario con su recuento de archivos.
 *
 * En la versión con MongoDB esto eran dos consultas y un emparejamiento en
 * memoria por el *nombre* de la carpeta. Aquí es un `LEFT JOIN` agrupado por el
 * identificador, así que el emparejamiento lo hace la base de datos y no puede
 * fallar por dos carpetas que se llamen parecido.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [lista, sueltos] = await Promise.all([
      carpetas.listarConCuentas(user.userId),
      carpetas.countSinCarpeta(user.userId),
    ]);

    return NextResponse.json({
      folders: lista.map((f) => ({
        _id: f.id,
        name: f.name,
        color: f.color || "indigo",
        description: f.description || "",
        fileCount: Number(f.file_count),
        totalBytes: Number(f.total_bytes),
        createdAt: f.created_at,
      })),
      unorganized: {
        fileCount: Number(sueltos.count),
        totalBytes: Number(sueltos.total_bytes),
      },
    });
  } catch (error: unknown) {
    console.error("Error al obtener carpetas:", error);
    return NextResponse.json(
      { error: "Error al obtener las carpetas" },
      { status: 500 }
    );
  }
}

const COLORES_VALIDOS = ["indigo", "emerald", "amber", "rose", "purple", "sky"];

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, color, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre de la carpeta es obligatorio" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 60) {
      return NextResponse.json(
        { error: "El nombre no puede superar los 60 caracteres" },
        { status: 400 }
      );
    }

    // La comprobación de duplicados se hace también contra el índice único
    // `folders_user_name_key`, que es quien garantiza la integridad. Esta
    // consulta previa existe solo para poder devolver un 409 con un mensaje
    // legible en lugar de un error de PostgreSQL.
    const existente = await carpetas.buscarPorNombre(user.userId, trimmedName);
    if (existente) {
      return NextResponse.json(
        { error: `Ya existe una carpeta con el nombre "${trimmedName}"` },
        { status: 409 }
      );
    }

    const folderColor =
      typeof color === "string" && COLORES_VALIDOS.includes(color) ? color : "indigo";

    let nueva;
    try {
      nueva = await carpetas.crear({
        userId: user.userId,
        name: trimmedName,
        color: folderColor,
        description: typeof description === "string" ? description.trim() : "",
      });
    } catch (error) {
      // 23505 = unique_violation. Dos peticiones simultáneas con el mismo nombre
      // pueden pasar la comprobación anterior; el índice es quien resuelve la
      // carrera y esta es la traducción de su error a la misma respuesta 409.
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: `Ya existe una carpeta con el nombre "${trimmedName}"` },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      {
        message: "Carpeta creada exitosamente",
        folder: {
          _id: nueva.id,
          name: nueva.name,
          color: nueva.color,
          description: nueva.description,
          fileCount: 0,
          totalBytes: 0,
          createdAt: nueva.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error al crear carpeta:", error);
    return NextResponse.json(
      { error: "Error al crear la carpeta" },
      { status: 500 }
    );
  }
}
