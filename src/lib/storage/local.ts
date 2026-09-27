import { promises as fs } from "node:fs";
import path from "node:path";
import type { Almacen } from ".";

/**
 * Almacenamiento en disco, para desarrollo.
 *
 * Los bytes se guardan en `.storage/` con la misma estructura de rutas que
 * usaría Supabase Storage (`{userId}/{nombre}`), para que cambiar de backend no
 * obligue a mover nada.
 *
 * `STORAGE_BACKEND=local` es el valor por defecto porque así la aplicación
 * arranca sin configurar nada. En Vercel hay que poner `supabase`: el disco de
 * una función es efímero y los archivos se perderían.
 */

const RAIZ = process.env.STORAGE_LOCAL_PATH ?? path.join(process.cwd(), ".storage");

/**
 * Impide que la ruta escape del directorio de almacenamiento.
 *
 * La ruta la compone la aplicación, no el usuario, pero un nombre de archivo con
 * `..` o una barra bastaría para escribir fuera del directorio. Se normaliza y
 * se comprueba que siga dentro antes de tocar el disco.
 */
function rutaSegura(storagePath: string): string {
  const limpia = path.normalize(storagePath).replace(/^([/\\])+/, "");
  const completa = path.resolve(RAIZ, limpia);
  const raizResuelta = path.resolve(RAIZ);
  if (!completa.startsWith(raizResuelta + path.sep) && completa !== raizResuelta) {
    throw new Error("Ruta de almacenamiento no permitida");
  }
  return completa;
}

// El mimeType se acepta por cumplir la interfaz, pero en disco es irrelevante:
// no hay nada que interpretar, solo bytes.
export async function guardar(
  storagePath: string,
  datos: Buffer,
  _mimeType: string
): Promise<void> {
  const destino = rutaSegura(storagePath);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, datos);
}

export async function leer(storagePath: string): Promise<Buffer> {
  return fs.readFile(rutaSegura(storagePath));
}

export async function borrar(rutas: string[]): Promise<void> {
  await Promise.all(
    rutas.map(async (ruta) => {
      try {
        await fs.unlink(rutaSegura(ruta));
      } catch (error) {
        // Solo se tolera que el archivo no exista; cualquier otro error se
        // propaga para que se vea.
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    })
  );
}

const local: Almacen = { guardar, leer, borrar };
export default local;
