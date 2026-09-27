import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import * as archivos from "@/lib/db/archivos";
import * as carpetas from "@/lib/db/carpetas";
import { borrarArchivos } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const COLORES_VALIDOS = ["indigo", "emerald", "amber", "rose", "purple", "sky"];

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, color, description } = body;

    const actual = await carpetas.buscarPorId(user.userId, id);
    if (!actual) {
      return NextResponse.json(
        { error: "Carpeta no encontrada" },
        { status: 404 }
      );
    }

    const cambios: Parameters<typeof carpetas.actualizar>[2] = {};

    if (name && typeof name === "string" && name.trim()) {
      const nuevoNombre = name.trim();
      if (nuevoNombre.toLowerCase() !== actual.name.toLowerCase()) {
        const duplicada = await carpetas.buscarPorNombre(user.userId, nuevoNombre);
        if (duplicada) {
          return NextResponse.json(
            { error: `Ya existe una carpeta con el nombre "${nuevoNombre}"` },
            { status: 409 }
          );
        }
      }
      cambios.name = nuevoNombre;
    }

    if (typeof color === "string" && COLORES_VALIDOS.includes(color)) {
      cambios.color = color;
    }

    if (typeof description === "string") {
      cambios.description = description.trim();
    }

    // Aquí la versión con MongoDB tenía que ir después un `updateMany` sobre
    // todos los archivos para reescribir el nombre de la carpeta en cada uno.
    // Con la clave foránea no hace falta: los archivos apuntan al id, que no
    // cambia al renombrar.
    const actualizada = await carpetas.actualizar(user.userId, id, cambios);

    if (!actualizada) {
      return NextResponse.json(
        { error: "Carpeta no encontrada o no tienes permiso para modificarla" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Carpeta actualizada con éxito",
      folder: {
        _id: actualizada.id,
        name: actualizada.name,
        color: actualizada.color,
        description: actualizada.description,
      },
    });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "Ya existe una carpeta con ese nombre" },
        { status: 409 }
      );
    }
    console.error("Error al actualizar carpeta:", error);
    return NextResponse.json(
      { error: "Error al actualizar la carpeta" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Borra los archivos y la carpeta en una transacción y devuelve las rutas de
    // los binarios, que se quitan del almacén después. Es la misma semántica que
    // tenía la versión anterior: eliminar una carpeta elimina su contenido.
    const resultado = await archivos.vaciarCarpeta(user.userId, id);

    if (!resultado) {
      return NextResponse.json(
        { error: "Carpeta no encontrada" },
        { status: 404 }
      );
    }

    if (resultado.storagePaths.length > 0) {
      try {
        await borrarArchivos(resultado.storagePaths);
      } catch (error) {
        // La base de datos ya está coherente. Como en el borrado de un archivo
        // suelto, avisar de un fallo aquí solo confundiría al usuario.
        console.error("Error al borrar binarios de la carpeta:", error);
      }
    }

    return NextResponse.json({
      message: `Carpeta "${resultado.folderName}" y sus ${resultado.storagePaths.length} archivo(s) asociados fueron eliminados correctamente.`,
      id,
      deletedFilesCount: resultado.storagePaths.length,
    });
  } catch (error: unknown) {
    console.error("Error al eliminar carpeta:", error);
    return NextResponse.json(
      { error: "Error al eliminar la carpeta" },
      { status: 500 }
    );
  }
}
