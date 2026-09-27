import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, verifyToken } from "@/lib/auth";
import { buscarParaLeer } from "@/lib/db/archivos";
import { leerArchivo } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Descarga del binario.
 *
 * El control de acceso no está en el almacén: el bucket es privado y se lee con
 * la clave de servicio, así que la única barrera real es la comprobación de que
 * la fila pertenece al usuario de la sesión, que se hace **antes** de tocar el
 * almacenamiento. Por eso el `findOne` filtra por `user_id` y no solo por `id`.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    let user = await getRequestUser(req);

    // El enlace de descarga lleva el token en la query para poder abrirse en una
    // pestaña nueva, donde no se envían las cookies de la misma manera.
    if (!user) {
      const urlToken = req.nextUrl.searchParams.get("token");
      if (urlToken) {
        user = await verifyToken(urlToken);
      }
    }

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const fila = await buscarParaLeer(user.userId, id);
    if (!fila) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      );
    }

    const datos = await leerArchivo(fila.storage_path);

    const headers = new Headers();
    headers.set("Content-Type", fila.mime_type || "application/octet-stream");
    headers.set("Content-Length", String(Number(fila.size)));

    const encodedFilename = encodeURIComponent(fila.original_name);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
    );

    return new Response(new Uint8Array(datos), { status: 200, headers });
  } catch (error: unknown) {
    console.error("Error al descargar archivo:", error);
    // Un 404 del almacén significa que la fila existe pero el binario no: se
    // traduce a 404 y no a 500, porque para el usuario el archivo no está.
    if ((error as { status?: number }).status === 404) {
      return NextResponse.json(
        { error: "El archivo no se encuentra en el almacén" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Error al descargar el archivo" },
      { status: 500 }
    );
  }
}
