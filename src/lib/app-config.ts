/**
 * Datos de la aplicación que se muestran en pantalla.
 *
 * Existe para no repetir el mismo texto en varios componentes: el nombre del
 * motor de base de datos aparecía hardcodeado en la barra y en el panel de
 * almacenamiento, y con dos versiones del proyecto era fácil que uno se
 * quedara diciendo "MongoDB" por descuido.
 */
export const APP_NAME = "CloudVault";

/**
 * Nombre del motor de base de datos, tal como se le enseña a la persona que
 * usa la aplicación.
 *
 * En esta versión es PostgreSQL (Supabase). Si algún día se admiten los dos
 * motores, este es el único sitio que hay que tocar.
 */
export const DATA_ENGINE_NAME = "PostgreSQL";
