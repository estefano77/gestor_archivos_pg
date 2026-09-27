import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import * as archivos from "@/lib/db/archivos";
import * as carpetas from "@/lib/db/carpetas";
import { borrarArchivos } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // El borrado va con `RETURNING` para Traer la ruta del binario y quitarlo
    // después: si se borrara la fila antes de leer la ruta, el archivo se quedaría
    // en el almacén para siempre sin forma de saber que hay que limpiarlo.
    const borrado = await archivos.borrar(user.userId, id);

    if (!borrado) {
      return NextResponse.json(
        { error: "Archivo no encontrado o no tienes permiso para eliminarlo" },
        { status: 404 }
      );
    }

    try {
      await borrarArchivos([borrado.storage_path]);
    } catch (error) {
      // La fila ya no existe, así que el usuario sí ha borrado su archivo. Un
      // binario que se queda atrás solo ocupa espacio; avisar de un error aquí
      // lo haría dudar de algo que ya se ha hecho.
      console.error("Error al borrar el binario del almacén:", error);
    }

    return NextResponse.json({
      message: "Archivo eliminado correctamente",
      id,
    });
  } catch (error: unknown) {
    console.error("Error al eliminar archivo:", error);
    return NextResponse.json(
      { error: "Error al eliminar el archivo" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { originalName, description, tags, folder } = body;

    const cambios: Parameters<typeof archivos.actualizar>[2] = {};

    if (typeof originalName === "string" && originalName.trim()) {
      cambios.originalName = originalName.trim();
    }
    if (typeof description === "string") {
      cambios.description = description.trim();
    }
    if (Array.isArray(tags)) {
      cambios.tags = tags.map(String);
    }

    if (typeof folder === "string") {
      const folderName = folder.trim();

      if (!folderName) {
        // Carpeta vacía = "Sin carpeta".
        cambios.folderId = null;
      } else {
        // El cliente manda el nombre, igual que al subir. Si la carpeta no
        // existe se crea, que es lo que hacía la versión anterior.
        const existente = await carpetas.buscarPorNombre(user.userId, folderName);
        cambios.folderId = existente
          ? existente.id
          : (
              await carpetas.crear({
                userId: user.userId,
                name: folderName,
                color: "indigo",
              })
            ).id;
      }
    }

    const actualizado = await archivos.actualizar(user.userId, id, cambios);

    if (!actualizado) {
      return NextResponse.json(
        { error: "Archivo no encontrado o no tienes permiso para modificarlo" },
        { status: 404 }
      );
    }

    // Tras mover un archivo hay que releer la fila para traer el nombre de la
    // carpeta, que vive en la otra tabla.
    const conCarpeta = await archivos.buscarPorId(user.userId, actualizado.id);

    return NextResponse.json({
      message: "Archivo actualizado con éxito",
      file: {
        _id: actualizado.id,
        originalName: actualizado.original_name,
        mimeType: actualizado.mime_type,
        category: actualizado.category,
        size: Number(actualizado.size),
        folder: conCarpeta?.folder_name ?? "",
        description: actualizado.description,
        tags: actualizado.tags ?? [],
        createdAt: actualizado.created_at,
        updatedAt: actualizado.updated_at,
      },
    });
  } catch (error: unknown) {
    console.error("Error al actualizar archivo:", error);
    return NextResponse.json(
      { error: "Error al actualizar archivo" },
      { status: 500 }
    );
  }
}
