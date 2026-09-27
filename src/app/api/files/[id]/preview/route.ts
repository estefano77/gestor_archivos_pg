import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, verifyToken } from "@/lib/auth";
import { buscarParaLeer } from "@/lib/db/archivos";
import { leerArchivo } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Vista previa en el navegador. Igual que la descarga, pero en línea. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    let user = await getRequestUser(req);

    // La vista previa se abre en un iframe o en otra pestaña, de ahí el token en
    // la query string.
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
        { error: "Archivo no encontrado o sin contenido" },
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
      `inline; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    headers.set("Cache-Control", "private, max-age=3600");

    return new Response(new Uint8Array(datos), { status: 200, headers });
  } catch (error: unknown) {
    console.error("Error en preview de archivo:", error);
    if ((error as { status?: number }).status === 404) {
      return NextResponse.json(
        { error: "El archivo no se encuentra en el almacén" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Error al visualizar el archivo" },
      { status: 500 }
    );
  }
}
