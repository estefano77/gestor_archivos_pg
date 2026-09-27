# CloudVault · Gestor de Archivos Seguro

Aplicación web para subir, organizar y previsualizar documentos con **PostgreSQL
(Supabase)** como base de datos y **Supabase Storage** para los archivos.

> **Esta es la versión PostgreSQL.** La versión con MongoDB es un proyecto
> aparte, en `gestor_archivos`, y sigue funcionando sin cambios. Aquí no
> conviven los dos motores: esta aplicación habla solo con PostgreSQL. Ver
> [Diferencias con la versión de MongoDB](#diferencias-con-la-versión-de-mongodb).

---

## ✨ Características Principales

- **Acceso con cuenta propia o con Google.** Un solo parámetro decide si se
  permite el acceso local, el de Google, o ambos. El ajuste se aplica en el
  servidor, no solo ocultando botones.
- **Cuota real de 25 MB por cuenta.** Se comprueba en el servidor dentro de una
  transacción, con la fila del usuario bloqueada, de modo que dos subidas
  simultáneas no puedan pasar las dos el control.
- **Máximo de 15 MB por archivo**, y explica el motivo concreto del rechazo.
- **Carpetas temáticas** de colores, sin anidar, que se pueden renombrar o
  borrar (borrarlas borra también su contenido, avisando antes).
- **Búsqueda y filtros** por nombre, descripción, etiquetas, carpeta y tipo, con
  cinco criterios de ordenación y vista de cuadrícula o de lista.
- **Previsualización** de PDF (visor del navegador) e imágenes (zoom del 50 % al
  300 %); ficha de datos para Word, Excel y PowerPoint.
- **Tema claro y oscuro** que sigue al del sistema y recuerda tu elección.
- **Manual de usuario integrado** en `/help`, con capturas reales de la
  aplicación e índice lateral que sigue el desplazamiento.
- **Las cuentas de Google no tienen contraseña** y no se pueden enlazar dos veces
  la misma cuenta de Google.

---

## 🛠️ Tecnologías

| Capa | Elección | Por qué |
|---|---|---|
| Framework | Next.js 16 (App Router) | Rutas de API y renderizado en el mismo proyecto |
| Base de datos | PostgreSQL 17 | Relations reales, transacciones, RLS |
| Driver | `pg` (node-postgres) | SQL explícito y control de las transacciones |
| Archivos | Supabase Storage o disco local | La base no guarda binarios |
| Sesión | JWT propio con `jose` | Sin dependencias de auth de terceros |
| Contraseñas | `bcryptjs` | |
| Estilos | Tailwind CSS 4 | |
| Iconos | `lucide-react` | |

**Dependencias totales: 7.** No hay ORM, no hay cliente de Supabase y no hay
librería de autenticación.

---

## ⚙️ Configuración Local

### 1. Requisitos previos

- **Node.js ≥ 20.9** (lo pide Next.js 16)
- **PostgreSQL 14 o superior**, en local o en Supabase

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y rellénalo. El detalle de cada variable,
incluido por qué en Supabase hay que usar el *pooler* y no la conexión directa,
está comentado en el propio `.env.example`.

Lo mínimo para arrancar en local:

```env
DATABASE_URL=postgresql://postgres:TU_CLAVE@127.0.0.1:5432/gestor_archivos_pg
STORAGE_BACKEND=local
JWT_SECRET=<genera uno con el comando que indica el archivo>
NEXT_PUBLIC_AUTH_MODE=0
```

**No hace falta `PGSSLMODE`.** La aplicación decide el TLS sola: si el host es
`localhost` o `127.0.0.1` no lo pide, y con cualquier otro host lo usa. Antes
había que cambiar esa variable a mano al alternar entre la base local y
Supabase, y olvidarse producía un error engañoso —`The server does not support
SSL connections`— que parece un problema de la base cuando era del modo de
conexión. Si algún día necesitas forzarlo (un túnel, un servidor con su
certificado), la variable sigue teniendo prioridad.

Genera el secreto con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> Esta aplicación es **independiente** de la de MongoDB: usa un `JWT_SECRET`
> distinto. Si las dos comparten secreto, una sesión abierta en una valdría en
> la otra.

### 3. Crear el esquema

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_esquema_inicial.sql
```

El script es idempotente (`IF NOT EXISTS`), así que se puede volver a ejecutar
sin romper nada. Crea tres tablas, sus índices, el disparador de `updated_at` y
activa RLS sin políticas, que es la red de seguridad que se explica más abajo.

Para crear la base de datos antes de aplicar el esquema:

```bash
createdb -U postgres gestor_archivos_pg
```

### 4. Arrancar

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. La primera vez tendrás que registrarte en
`/auth`.

### 5. Probar desde el móvil (red local)

1. Averigua la IP de tu equipo: `ipconfig` → *Dirección IPv4*.
2. Ponla en la variable `allowedDevOrigins` de `next.config.ts`, si no está.
3. Arranca con `npm run dev` y abre `http://TU_IP:3000` en el teléfono, con el
   móvil y el ordenador en la misma red.

---

## 🔐 Modos de acceso

Una sola variable, `NEXT_PUBLIC_AUTH_MODE`:

| Valor | Acceso permitido | Rutas activas |
|---|---|---|
| `0` | Solo correo y contraseña | `/api/auth/login`, `/api/auth/register` |
| `1` | Solo Google | `/api/auth/google`, `/api/auth/google/callback` |
| `2` | Ambos | Todas |

Si no se define, se asume `0`, el más restrictivo. **Un valor que no sea 0, 1 o 2
hace fallar la aplicación** en lugar de elegir uno: si escribieras `3` queriendo
restringir el acceso y la app cayera en "ambas modalidades", quedaría expuesto
un método que creías cerrado.

El manual de `/help` se adapta: en modo 1 no documenta el formulario de
registro, y en modo 0 no documenta el botón de Google.

### Iniciar sesión con Google

1. En [Google Cloud Console](https://console.cloud.google.com/), crea un
   **ID de cliente OAuth** de tipo *Aplicación web*.
2. Añade como **URI de redirección autorizada**:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://TU-DOMINIO/api/auth/google/callback`
3. Rellena `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`.

Puedes **reutilizar el mismo cliente OAuth** que la versión de MongoDB y
simplemente añadir una segunda URI de redirección. Es lo que recomienda este
proyecto: evita una segunda pantalla de consentimiento y un secreto más.

`GOOGLE_REDIRECT_URI` debe coincidir **carácter por carácter** con lo que hay en
la consola de Google, incluida la barra final si la pones. Si no lo es, Google
responde `redirect_uri_mismatch`. Si se deja vacía, la aplicación la deduce de la
dirección con la que el usuario entró, y eso se rompe en cuanto hay más de una
puerta de entrada (dominio propio, alias de Vercel, `www` o sin `www`).

**Al entrar con Google, la cuenta se crea sola.** Si ese correo ya tenía una
cuenta creada con contraseña, **entras en ella** con sus archivos: no se duplica
ni se reparte nada. Es seguro porque Google confirma que el correo está
verificado.

---

## 🚀 Despliegue

### Paso 1: Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com/).
2. Aplica el esquema. Desde el **SQL Editor**, pega el contenido de
   `supabase/migrations/0001_esquema_inicial.sql` y ejecútalo.
3. Crea el bucket de archivos en **Storage → New bucket**:
   - Nombre: `archivos` (o el que pongas en `SUPABASE_STORAGE_BUCKET`)
   - **Private**. El control de acceso lo hacen las rutas de API, no el bucket.
   - Opcional pero recomendado: en *Bucket settings*, pon un límite de tamaño y
     restringe los tipos MIME a los que admite la aplicación. El bucket
     rechaza la subida si el `Content-Type` no está en la lista, y la aplicación
     manda ahí el tipo real del archivo.
4. Apunta estas tres cosas:
   - **Project Settings → Database → Connection string → URI**. Se llama
     `session pooler` si el proyecto es antiguo o *Transaction* si es nuevo. Cópiala
     **tal cual**: el prefijo del host y el puerto **no son los que se suppose
     aquí**, cambian según el proyecto. Ver la nota de abajo.
   - **Project Settings → Database → DB password**
   - **Project Settings → API → service_role** (pulsa *Reveal*)

> **Sobre el pooler, que da muchos disgustos.** La cadena tiene esta forma:
>
> ```
> postgresql://postgres.REF:TU_CONTRASEÑA@aws-1-REGION.pooler.supabase.com:PUERTO/postgres
> ```
>
> Tres cosas que fallan a menudo:
>
> - **El prefijo `aws-1-` o `aws-0-`** depende del proyecto. No es fijo.
> - **El usuario lleva el ref detrás**: `postgres.REF`, no `postgres` a secas.
>   Con el usuario equivocado, el pooler responde
>   `tenant/user postgres.REF not found`.
> - **El puerto**: 5432 o 6543 según el modo. No asumas ninguno; usa el de la
>   cadena que te da el panel.
>
> El fallo más difícil de leer es cuando el host no resuelve: parece que el
> proyecto está caído, cuando lo que falla es el prefijo. Si la API de Supabase
> responde y la base no, **mira el prefijo antes que nada**.

### Paso 2: Subir el código

```bash
git remote add origin https://github.com/TU-USUARIO/gestor_archivos_pg.git
git push -u origin main
```

### Paso 3: Importar en Vercel

1. **Add New → Project**, importa el repositorio.
2. Next.js se detecta solo. **No hace falta configurar nada.**
3. Añade las variables de entorno:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | La del pooler, **tal cual** (sin `?sslmode=require`, la app lo pone) |
   | `STORAGE_BACKEND` | `supabase` |
   | `SUPABASE_SERVICE_ROLE_KEY` | La clave de servicio, **sin** prefijo `NEXT_PUBLIC_` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
   | `SUPABASE_STORAGE_BUCKET` | `archivos` |
   | `JWT_SECRET` | Uno nuevo, distinto del de la otra versión |
   | `NEXT_PUBLIC_AUTH_MODE` | `0`, `1` o `2` |
   | `GOOGLE_CLIENT_ID` | Si usas Google |
   | `GOOGLE_CLIENT_SECRET` | Si usas Google |
   | `GOOGLE_REDIRECT_URI` | La del dominio de Vercel |

4. **Deploy**.

> **La clave de servicio nunca lleva `NEXT_PUBLIC_`.** Next.js sustituye las
> variables `NEXT_PUBLIC_*` por su valor **en tiempo de compilación, dentro del
> código del navegador**: cualquiera que abra la aplicación se la descarga. Con
> esa clave se lee y escribe la base entera, sin RLS y sin contraseña.

> **No declares la clave anónima.** No hace falta, y conviene saber por qué: esta
> aplicación **no usa la autenticación de Supabase**. Las cuentas viven en la
> tabla `users` de este proyecto, con la contraseña hasheada con bcrypt, y la
> sesión es un JWT propio firmado con `JWT_SECRET`. Supabase Auth (GoTrue) no
> interviene en nada. Por eso el correo de «restablece tu contraseña» de Supabase
> **no sirve aquí**: iría a `auth.users`, una tabla que esta aplicación no
> escribe ni lee. Quien se olvide de la contraseña necesita que un administrador
> le establezca una nueva.

### ⚠️ Sobre el pooler de Supabase

En Vercel usa **la cadena que da el panel**, sin editarla. Este proyecto funciona
con el host `aws-1-` y el puerto 5432, pero eso no es una regla: cada proyecto
tiene el suyo y cambiarlo a mano es la causa más frecuente de que esto no
arranque. La nota de arriba explica los tres sitios donde se suele fallar.

Lo que sí es una regla: **no uses la conexión directa** si tu panel ofrece el
pooler. Las funciones serverless abren y cierran conexiones constantemente y la
conexión directa se agota enseguida, con errores de "too many clients".

Por cierto, `JWT_SECRET` es obligatoria: si falta, **la compilación falla** a
propósito, antes de que exista una URL pública. Prefiere eso a inventarse un
secreto que permita falsificar sesiones.

### ⚠️ Sobre la clave de servicio

`SUPABASE_SERVICE_ROLE_KEY` **nunca sale del servidor** y por eso no lleva el
prefijo `NEXT_PUBLIC_`. Con ella se ignoran las políticas de RLS, así que solo
debe leerla el backend. Si llega al navegador, quien la tenga puede leer y
escribir en tu base de datos entera.

La `anon` key sí es pública y no da acceso a nada por sí sola. Aquí ni siquiera
se usa: la aplicación se conecta a PostgreSQL con el driver y habla con Storage
por HTTP desde el servidor.

---

## 🔒 Seguridad

**Row Level Security está activado sin ninguna política.** La aplicación se
conecta con un rol privilegiado, que ignora RLS, así que el control de acceso
real está en las rutas de API: **todas filtran por `user_id`**, que viene del
token firmado y nunca de la petición.

Activar RLS sin políticas sirve para lo único que importa en este diseño: si la
`anon` key llegara a usarse por error desde el navegador, **no devolvería ni una
sola fila**. Sin ese bloque, un fallo de configuración sería una fuga de
documentos privados.

El bucket de Storage también es privado y se lee con la clave de servicio, por lo
que la ruta de descarga comprueba la pertenencia del archivo **antes** de tocar
el almacenamiento.

### Sesión

JWT firmado con `JWT_SECRET` (HS256), en cookie `httpOnly`, `sameSite=lax`,
`secure` en producción, con 7 días de caducidad. Si `JWT_SECRET` falta o mide
menos de 32 caracteres, **la aplicación se niega a arrancar**: no hay valor por
defecto, porque un secreto conocido permitiría falsificar sesiones.

---

## 🗂️ Estructura del Proyecto

```
gestor_archivos_pg/
├── src/
│   ├── app/
│   │   ├── page.tsx                  Panel principal
│   │   ├── auth/page.tsx             Acceso y registro
│   │   ├── help/page.tsx             Manual de usuario
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/            Correo y contraseña
│   │       │   ├── register/
│   │       │   ├── logout/
│   │       │   ├── me/               Sesión actual
│   │       │   └── google/
│   │       │       ├── route.ts      Inicio del flujo OAuth
│   │       │       └── callback/     Canje del código y sesión
│   │       ├── files/
│   │       │   ├── route.ts          Listado y subida (con la cuota)
│   │       │   ├── stats/            Espacio por categoría
│   │       │   └── [id]/
│   │       │       ├── route.ts      Editar, mover y eliminar
│   │       │       ├── download/
│   │       │       └── preview/
│   │       └── folders/
│   │           ├── route.ts          Listado y creación
│   │           └── [id]/route.ts     Renombrar y eliminar en cascada
│   ├── components/                    15 componentes de interfaz
│   ├── lib/
│   │   ├── db/                        ◀ CAMBIADO: la capa de datos
│   │   │   ├── pool.ts                Conexión y transacciones
│   │   │   ├── usuarios.ts
│   │   │   ├── carpetas.ts
│   │   │   ├── archivos.ts
│   │   │   └── types.ts
│   │   ├── storage/                   ◀ NUEVO: dónde viven los binarios
│   │   │   ├── index.ts               Elige backend
│   │   │   ├── local.ts               Disco, para desarrollo
│   │   │   └── supabase.ts            Supabase Storage por HTTP
│   │   ├── auth.ts                    JWT (sin cambios respecto a MongoDB)
│   │   ├── auth-config.ts             Modos de acceso
│   │   ├── google-auth.ts             Verificación del id_token de Google
│   │   ├── file-utils.ts              Límites y categorías
│   │   ├── help-content.ts            El manual, como datos
│   │   └── app-config.ts              Textos de marca
│   └── models/                        ✗ Eliminado: ya no hay Mongoose
├── supabase/
│   └── migrations/
│       └── 0001_esquema_inicial.sql   ◀ NUEVO: el esquema
├── seed-help.mjs                      Datos de muestra del manual
├── seed-help-quota.mjs                Relleno para capturar la cuota
├── seed-help-samples.py               Genera los archivos de muestra
└── dbcheck.mjs                        Estado de la base, a ojo
```

---

## 🔧 Scripts

```bash
# Ver el estado de la base sin abrir la aplicación
node dbcheck.mjs

# Datos de muestra para las capturas del manual
python seed-help-samples.py .help-samples
node seed-help.mjs            # siembra
node seed-help.mjs --clean    # borra solo lo sembrado
node seed-help.mjs --reset    # borra y vuelve a sembrar

# Relleno para capturar el aviso y la cuota agotada
node seed-help-quota.mjs 0.85
node seed-help-quota.mjs 1.0
node seed-help-quota.mjs --clear
```

`dbcheck.mjs` comprueba los recuentos, la integridad de las claves foráneas, que
RLS esté activado y que no haya binarios huérfanos en el almacén.

La limpieza se hace siempre por el identificador de la cuenta de siembra
(`ayuda@cloudvault.app`), nunca de forma global, y muestra el recuento antes y
después para que se vea que la diferencia es exactamente lo sembrado.

### Cambiar los límites

En `src/lib/file-utils.ts`:

```ts
export const MAX_FILE_SIZE = 15 * 1024 * 1024;   // por archivo
export const USER_QUOTA_BYTES = 25 * 1024 * 1024; // por cuenta
export const QUOTA_WARN_RATIO = 0.8;               // aviso a partir de aquí
```

> El máximo de 15 MB **ya no lo impone la base de datos**. En la versión de
> MongoDB era un tope técnico: el binario iba dentro del documento y un documento
> BSON no puede pasar de 16 MB. Aquí el binario vive en el almacén de objetos y
> la tabla solo guarda su ruta, así que el límite se puede subir. Se mantiene por
> comfort, no por necesidad.

---

## Diferencias con la versión de MongoDB

Lo que cambió de verdad, más allá del motor de datos:

| Antes (MongoDB) | Ahora (PostgreSQL) |
|---|---|
| El binario dentro del documento (`fileData`) | El binario en el almacén, la fila guarda la ruta |
| `_id` = ObjectId (24 hex) | `_id` = `uuid` (en la API, `_id` sigue siendo la clave) |
| La carpeta era el **nombre**, en cada archivo | Clave foránea real a `folders.id` |
| Renombrar una carpeta → `updateMany` sobre sus archivos | Renombrar → un `UPDATE` de una fila |
| Detección de duplicados con `$regex` en el código | Índice único `(user_id, lower(name))` |
| Búsqueda con `new RegExp(entrada del usuario)` | Búsqueda con `ILIKE` y `ESCAPE` |
| La cuota se comprobaba en dos pasos sin transacción | Se reserva con `SELECT … FOR UPDATE` |
| Sin RLS | RLS activado sin políticas, como red de seguridad |
| El texto de la interfaz decía "MongoDB" | Dice "PostgreSQL", desde `app-config.ts` |

Dos de estas corrigen problemas que **existían** en la versión de MongoDB:

- **La cuota no era atómica.** Se sumaban los bytes y luego se insertaba, sin
  transacción: dos subidas simultáneas de la misma cuenta podían pasar las dos el
  control y dejar al usuario por encima de los 25 MB.
- **La búsqueda aceptaba expresiones regulares del usuario.** Un punto o un
  paréntesis en lo que se escribía cambiaba el patrón.

Y dos mejoran la relación archivo-carpeta, que era frágil: al borrar una carpeta
se buscaban los archivos **por nombre**, así que dos carpetas con el mismo nombre
habrían borrado la una con la otra.

### Lo que **no** cambió

- La sesión: el mismo JWT, la misma cookie, el mismo código.
- Google OAuth: el mismo flujo y el mismo `jose`.
- Los modos de acceso: la misma variable y el mismo comportamiento.
- **El contrato de la API.** Mismas claves JSON, mismos tipos y mismos códigos de
  estado. Por eso los 15 componentes y las 3 páginas se reutilizan sin cambios.
- El manual de usuario, salvo los textos que nombraban el motor de datos.

---

## 📸 Regenerar las capturas del manual

1. PostgreSQL debe estar levantado.
2. Aplica el esquema y crea los datos de muestra:

   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/0001_esquema_inicial.sql
   python seed-help-samples.py .help-samples
   node seed-help.mjs
   ```

3. `npm run dev` y captura pantalla a pantalla.
4. Limpia al terminar: `node seed-help.mjs --clean`

Las imágenes van en `public/help/` y se numeran por el orden en que aparecen en
el manual. Al añadir una, hay que subir también el número de las siguientes.

---

## Licencia

Apache License 2.0. © 2026 Estéfano Castillo. El texto completo está en el
fichero [`LICENSE`](LICENSE), y es la misma licencia que usa el proyecto
`gestor_archivos`.
