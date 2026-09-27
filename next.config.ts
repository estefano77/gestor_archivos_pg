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

  /**
   * El almacén en disco (`src/lib/storage/local.ts`) lee y escribe con rutas
   * calculadas en tiempo de ejecución, y Turbopack no puede resolverlas al
   * compilar: avisa de que tendría que rastrear el proyecto entero.
   *
   * En producción ese backend no se usa (los binarios van a Supabase Storage y el
   * disco de una función de Vercel es efímero), pero el aviso aparece igualmente
   * porque el análisis es estático y la exclusión de abajo no lo silencia.
   *
   * Qué compensa esta configuración: acota lo que se incluye realmente en la
   * salida. Sin ella el rastreo arrastraría el proyecto completo, con los
   * ficheros fuente y la carpeta `public`. Es una mitigación, no un silencio.
   */
  outputFileTracingExcludes: {
    "*": ["./src/lib/storage/local.ts", "./.storage/**"],
  },
};

export default nextConfig;
