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

export async function guardar(
  storagePath: string,
  datos: Buffer,
  mimeType: string
): Promise<void> {
  const { base, clave, bucket } = configuracion();

  const respuesta = await fetch(
    `${base}/storage/v1/object/${bucket}/${codificarRuta(storagePath)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        // El tipo real del archivo, no un octet-stream genérico: si el bucket
        // tiene `allowed_mime_types`, Supabase compara este valor y rechaza la
        // subida cuando no coincide.
        "Content-Type": mimeType || "application/octet-stream",
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

  // El cuerpo debe ser un objeto con la lista en `prefixes`. Un array suelto
  // devuelve 400 con "body must be object" y, lo peor, lo hace sin borrar nada:
  // el error se pierde y el binario se queda en el bucket para siempre.
  const cuerpo = JSON.stringify({ prefixes: rutas.map(codificarRuta) });

  const respuesta = await fetch(`${base}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${clave}`,
      "Content-Type": "application/json",
    },
    body: cuerpo,
  });

  if (!respuesta.ok && respuesta.status !== 404) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(
      `Supabase Storage devolvió ${respuesta.status} al borrar. ${detalle}`.trim()
    );
  }

  // Un 200 con cuerpo `[]` significa que no encontró esos objetos. Puede ser
  // normal si ya estaban borrados, pero también puede esconder un fallo, así
  // que se avisa en el registro para que no pase desapercibido.
  const resultado = await respuesta.json().catch(() => null);
  if (Array.isArray(resultado) && resultado.length > 0) {
    console.warn(
      `Supabase Storage no borró ${resultado.length} objeto(s) que se le pidió quitar:`,
      resultado
    );
  }
}

const supabase: Almacen = { guardar, leer, borrar };
export default supabase;
