import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Next 16 bloquea por defecto las peticiones a recursos de desarrollo
   * (`/_next/hmr`, chunks del cliente) cuando el origen no es `localhost`.
   * Sin ellos la app no se hidrata en el navegador y los formularios se envían
   * de forma nativa (parece que la app "no funciona").
   *
   * Esto permite probar la app desde el móvil en la red local, por ejemplo
   * abriendo http://192.168.x.x:3000 en un iPhone. Solo aplica en desarrollo.
   */
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.16.*.*"],
};

export default nextConfig;
