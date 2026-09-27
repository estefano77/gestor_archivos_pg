import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getRequestUser } from "@/lib/auth";
import * as archivos from "@/lib/db/archivos";
import * as carpetas from "@/lib/db/carpetas";
import { filaADTO } from "@/lib/db/types";
import { guardarArchivo, borrarArchivos, rutaDeArchivo } from "@/lib/storage";
import {
  getFileCategory,
  FileCategory,
  MAX_FILE_SIZE,
  USER_QUOTA_BYTES,
  formatQuotaBytes,
} from "@/lib/file-utils";

export const dynamic = "force-dynamic";

/**
 * Listado de archivos.
 *
 * El contrato de la respuesta es **idéntico** al de la versión con MongoDB: las
 * mismas claves, los mismos tipos y los mismos códigos de estado. Eso es lo que
 * permite reutilizar los componentes del frontend sin modificarlos.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // `userId` viene del token firmado, nunca de la petición: un cliente no
    // puede pedir los archivos de otra cuenta cambiando un parámetro.
    const filas = await archivos.listar(user.userId, {
      category: searchParams.get("category") ?? undefined,
      folder: searchParams.get("folder") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sort: searchParams.get("sort") ?? "newest",
    });

    return NextResponse.json({ files: filas.map(filaADTO) });
  } catch (error: unknown) {
    console.error("Error al obtener archivos:", error);
    return NextResponse.json(
      { error: "Error al cargar la lista de archivos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const description = (formData.get("description") as string) || "";
    const tagsRaw = (formData.get("tags") as string) || "";
    const folderRaw = (formData.get("folder") as string) || "";

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `El archivo supera el límite de ${formatQuotaBytes(
            MAX_FILE_SIZE
          )} permitido (Tamaño: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
        },
        { status: 400 }
      );
    }

    // El tipo se fija una vez y se usa en dos sitios: la fila de la base de
    // datos y la cabecera de la subida al almacén. Deben coincidir, porque un
    // bucket con `allowed_mime_types` rechaza la subida si no lo hacen.
    const mimeType = file.type || "application/octet-stream";

    const category = getFileCategory(file.type, file.name);

    const allowedCategories: FileCategory[] = [
      "pdf",
      "image",
      "word",
      "excel",
      "powerpoint",
    ];
    if (!allowedCategories.includes(category)) {
      return NextResponse.json(
        {
          error:
            "Formato no permitido. Solo se aceptan archivos PDF, imágenes, Word (.doc, .docx), Excel (.xls, .xlsx) y PowerPoint (.ppt, .pptx).",
        },
        { status: 400 }
      );
    }

    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const folderName = folderRaw.trim();

    // La carpeta se resuelve por nombre porque es lo que envía el formulario, y
    // se crea si no existe. Con la clave foránea, el archivo guarda el id y no
    // el texto, así que renombrar la carpeta después no rompe nada.
    let folderId: string | null = null;
    if (folderName) {
      const existente = await carpetas.buscarPorNombre(user.userId, folderName);
      if (existente) {
        folderId = existente.id;
      } else {
        const creada = await carpetas.crear({
          userId: user.userId,
          name: folderName,
          color: "indigo",
        });
        folderId = creada.id;
      }
    }

    // El id se genera aquí para poder componer la ruta del binario antes de
    // insertar la fila.
    const fileId = randomUUID();
    const storagePath = rutaDeArchivo(user.userId, fileId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    // La cuota se comprueba y se reserva en una transacción con la fila del
    // usuario bloqueada. Es la comprobación que manda: la del formulario es solo
    // una ayuda para dar respuesta rápida.
    const reserva = await archivos.reservarYCrear({
      userId: user.userId,
      folderId,
      originalName: file.name,
      mimeType,
      category,
      size: file.size,
      storagePath,
      description: description.trim(),
      tags,
    });

    if (!reserva.ok) {
      return NextResponse.json(
        {
          error:
            reserva.remaining === 0
              ? `Has alcanzado tu cuota de ${formatQuotaBytes(
                  USER_QUOTA_BYTES
                )}. Elimina algún archivo para liberar espacio.`
              : `Este archivo ocupa ${formatQuotaBytes(
                  file.size
                )} y solo te quedan ${formatQuotaBytes(
                  reserva.remaining
                )}: te faltan ${formatQuotaBytes(
                  reserva.shortfall
                )}. Elimina algún archivo para liberar espacio.`,
        },
        { status: 413 }
      );
    }

    // La fila ya existe y la cuota está reservada. Ahora se sube el binario; si
    // falla, se deshace la reserva para no dejar un archivo que no se puede abrir.
    try {
      await guardarArchivo(storagePath, buffer, mimeType);
    } catch (error) {
      await archivos.revertir(user.userId, reserva.file.id);
      console.error("Error al guardar el binario:", error);
      return NextResponse.json(
        { error: "No se pudo guardar el archivo en el almacén" },
        { status: 500 }
      );
    }

    const f = reserva.file;
    return NextResponse.json(
      {
        message: "Archivo subido correctamente",
        file: {
          _id: f.id,
          originalName: f.original_name,
          mimeType: f.mime_type,
          category: f.category,
          size: Number(f.size),
          // Se devuelve el nombre de la carpeta que se pidió, sin esperar al
          // JOIN: es lo que el cliente ya sabe y lo que espera en la respuesta.
          folder: folderName,
          description: f.description,
          tags: f.tags ?? [],
          createdAt: f.created_at,
          updatedAt: f.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error al subir archivo:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
