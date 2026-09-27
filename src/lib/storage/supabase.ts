/**
 * Almacenamiento en Supabase Storage.
 *
 * Se habla con la API de Storage por HTTP en lugar de instalar el cliente
 * `@supabase/supabase-js`. Son tres llamadas (subir, leer, borrar) y hacerlo con
 * `fetch` evita una dependencia grande para un caso tan acotado.
 *
 * ## La clave de servicio no sale del servidor
 *
 * Se usa la `service_role`, que ignora las políticas de RLS, porque las rutas de
 * API ya comprueban que el archivo pertenece al usuario de la sesión. Esta clave
 * **no debe exponerse nunca al navegador**: en `.env.example` no lleva el
 * prefijo `NEXT_PUBLIC_` precisamente por eso. La `anon` key sí es pública, pero
 * no se usa para nada aquí.
 */

import type { Almacen } from ".";

const URL_PROYECTO = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLAVE_SERVICIO = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "archivos";

function configuracion() {
  if (!URL_PROYECTO || !CLAVE_SERVICIO) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. " +
        "Son necesarias para STORAGE_BACKEND=supabase (ver .env.example)."
    );
  }
  return { base: URL_PROYECTO.replace(/\/$/, ""), clave: CLAVE_SERVICIO, bucket: BUCKET };
}

/**
 * Las claves de Supabase admiten guiones bajos, pero la API de Storage los
 * rechaza en la ruta: hay que codificarlos como `%5F`.
 */
function codificarRuta(storagePath: string): string {
  return storagePath
    .split("/")
    .map((segmento) => encodeURIComponent(segmento).replace(/_/g, "%5F"))
    .join("/");
}

export async function guardar(storagePath: string, datos: Buffer): Promise<void> {
  const { base, clave, bucket } = configuracion();

  const respuesta = await fetch(
    `${base}/storage/v1/object/${bucket}/${codificarRuta(storagePath)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/octet-stream",
        // La versión hace que dos subidas al mismo path se sobrescriban en vez de
        // crear un duplicado, que es justo el comportamiento esperado.
        "x-upsert": "true",
      },
      body: new Uint8Array(datos),
    }
  );

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(
      `Supabase Storage devolvió ${respuesta.status} al subir el archivo. ${detalle}`.trim()
    );
  }
}

export async function leer(storagePath: string): Promise<Buffer> {
  const { base, clave, bucket } = configuracion();

  // `authenticated` y no `public`: el bucket es privado y la clave de servicio
  // es la que autoriza la lectura. El control de acceso real lo hace la ruta,
  // que ya ha comprobado la pertenencia del archivo antes de llegar aquí.
  const respuesta = await fetch(
    `${base}/storage/v1/object/authenticated/${bucket}/${codificarRuta(storagePath)}`,
    { headers: { Authorization: `Bearer ${clave}` } }
  );

  if (respuesta.status === 404) {
    throw Object.assign(new Error("El archivo no existe en el almacén"), { status: 404 });
  }
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(
      `Supabase Storage devolvió ${respuesta.status} al leer el archivo. ${detalle}`.trim()
    );
  }

  return Buffer.from(await respuesta.arrayBuffer());
}

export async function borrar(rutas: string[]): Promise<void> {
  if (rutas.length === 0) return;
  const { base, clave, bucket } = configuracion();

  const respuesta = await fetch(
    `${base}/storage/v1/object/${bucket}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      // La API admite un objeto o un arreglo de rutas.
      body: JSON.stringify(rutas.map(codificarRuta)),
    }
  );

  if (!respuesta.ok && respuesta.status !== 404) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(
      `Supabase Storage devolvió ${respuesta.status} al borrar. ${detalle}`.trim()
    );
  }
}

const supabase: Almacen = { guardar, leer, borrar };
export default supabase;
