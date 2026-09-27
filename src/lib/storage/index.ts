/**
 * Almacenamiento de los binarios, con dos implementaciones intercambiables.
 *
 * ## Por qué los archivos no están en la base de datos
 *
 * En la versión de MongoDB el contenido iba dentro del propio documento
 * (`fileData`), y por eso el máximo por archivo eran 15 MB: BSON no permite que
 * un documento pase de 16 MB. Ese límite era un castigo de la base de datos, no
 * una decisión del producto.
 *
 * Aquí la tabla `files` guarda solo la ruta (`storage_path`) y los bytes viven en
 * un almacén de objetos. Consecuencias:
 *
 * - El máximo por archivo deja de estar atado a 16 MB.
 * - La base no se infla y los backups siguen siendo pequeños.
 * - Descargar no carga en memoria del servidor de aplicación el archivo entero
 *   desde la base de datos.
 *
 * ## Por qué esta abstracción sí merece la pena
 *
 * A diferencia de la de la base de datos, esta interfaz tiene tres operaciones y
 * ninguna acepta sintaxis de consulta. No hay forma de que se vuelva leaky: o
 * implementa guardar/leer/borrar, o no sirve. El coste de mantener las dos
 * implementaciones es bajo y permite desarrollo local sin Supabase.
 */

export interface Almacen {
  /**
   * `mimeType` es el tipo real del archivo. No es opcional en la práctica: un
   * bucket de Supabase con `allowed_mime_types` rechaza la subida si no
   * coincide, y mandarlo siempre como octet-stream hace que la application's
   * propia lista de formatos admitidos no sirva para nada.
   */
  guardar(storagePath: string, datos: Buffer, mimeType: string): Promise<void>;
  leer(storagePath: string): Promise<Buffer>;
  borrar(rutas: string[]): Promise<void>;
}

/**
 * El backend se carga con `import()` dinámico y no con un import estático.
 *
 * Motivo concreto: si ambos backends se importan arriba del archivo, Turbopack ve
 * el acceso dinámico al sistema de archivos del backend de disco y avisa de que
 * tendría que rastrear el proyecto entero, con lo que en el despliegue acabarían
 * enviando **todos los ficheros fuente y la carpeta public** como parte del
 * código de servidor. Cargándolo en diferido, el backend en disco queda en su
 * propio trozo y no arrastra al resto.
 *
 * En producción con Supabase, el código de disco ni siquiera se descarga.
 */
async function elegir(): Promise<Almacen> {
  const backend = (process.env.STORAGE_BACKEND ?? "local").toLowerCase();

  if (backend === "supabase") {
    return (await import("./supabase")).default;
  }
  if (backend === "local") {
    return (await import("./local")).default;
  }

  throw new Error(
    `STORAGE_BACKEND="${backend}" no es válido. Usa "local" para desarrollo o "supabase" en producción.`
  );
}

export async function guardarArchivo(
  ruta: string,
  datos: Buffer,
  mimeType: string
): Promise<void> {
  return (await elegir()).guardar(ruta, datos, mimeType);
}

export async function leerArchivo(ruta: string): Promise<Buffer> {
  return (await elegir()).leer(ruta);
}

export async function borrarArchivos(rutas: string[]): Promise<void> {
  return (await elegir()).borrar(rutas);
}

/**
 * Compone la ruta de un archivo dentro del almacén.
 *
 * Se antepone el identificador del usuario para que un bucket compartido siga
 * siendo inspeccionable por carpetas, y para que ningún archivo quede en la raíz
 * del bucket.
 */
export function rutaDeArchivo(userId: string, fileId: string, nombre: string): string {
  const seguro = nombre.replace(/[^\w.\- ]+/g, "_").slice(-80);
  return `${userId}/${fileId}-${seguro}`;
}
