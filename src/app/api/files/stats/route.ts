import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { estadisticasPorCategoria } from "@/lib/db/archivos";
import { USER_QUOTA_BYTES } from "@/lib/file-utils";

export const dynamic = "force-dynamic";

/**
 * Espacio usado, desglosado por categoría.
 *
 * Sustituye a la agregación de MongoDB por un `GROUP BY`. El esqueleto de la
 * respuesta se mantiene igual, con las seis categorías presentes aunque no
 * tengan archivos: el panel las pinta siempre y si faltara alguna se vería un
 * hueco en la barra de colores.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const filas = await estadisticasPorCategoria(user.userId);

    const byCategory: Record<string, { bytes: number; count: number }> = {
      pdf: { bytes: 0, count: 0 },
      image: { bytes: 0, count: 0 },
      word: { bytes: 0, count: 0 },
      excel: { bytes: 0, count: 0 },
      powerpoint: { bytes: 0, count: 0 },
      other: { bytes: 0, count: 0 },
    };

    let totalBytes = 0;
    let totalFiles = 0;

    for (const fila of filas) {
      if (byCategory[fila.category]) {
        byCategory[fila.category].bytes = Number(fila.total_bytes);
        byCategory[fila.category].count = Number(fila.count);
      }
      totalBytes += Number(fila.total_bytes);
      totalFiles += Number(fila.count);
    }

    return NextResponse.json({
      totalBytes,
      totalFiles,
      byCategory,
      quotaBytes: USER_QUOTA_BYTES,
    });
  } catch (error: unknown) {
    console.error("Error al calcular estadísticas:", error);
    return NextResponse.json(
      { error: "Error al calcular estadísticas" },
      { status: 500 }
    );
  }
}
