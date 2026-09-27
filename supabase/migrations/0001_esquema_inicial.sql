-- =============================================================================
-- CloudVault · esquema inicial para PostgreSQL
-- =============================================================================
--
-- Equivalente al modelo de MongoDB, con dos diferencias deliberadas que se
-- explican más abajo: identificadores `uuid` en lugar de ObjectId, y una
-- clave foránea real de archivo a carpeta en lugar del nombre de la carpeta
-- guardado como texto.
--
-- Aplicar con:  psql "$DATABASE_URL" -f supabase/migrations/0001_esquema_inicial.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  email        text        NOT NULL,
  -- Ausente en las cuentas creadas con Google: no hay contraseña que guardar.
  password     text,
  -- 'local' (correo y contraseña) o 'google'.
  provider     text        NOT NULL DEFAULT 'local' CHECK (provider IN ('local', 'google')),
  -- Identificador estable del proveedor. En Google es el claim `sub`.
  provider_id  text,
  avatar_color text        NOT NULL DEFAULT '#6366f1',
  role         text        NOT NULL DEFAULT 'user'  CHECK (role IN ('user', 'admin')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- El correo no distingue mayúsculas, igual que el `lowercase: true` del esquema
-- de Mongoose. Se indexa la expresión y no la columna para que la garantía no
-- dependa de que toda escritura pase por la aplicación.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

-- Una misma cuenta de Google no debe poder vincularse dos veces. Parcial porque
-- las cuentas locales no tienen provider_id y todas colisionarían en NULL.
CREATE UNIQUE INDEX IF NOT EXISTS users_provider_key
  ON users (provider, provider_id)
  WHERE provider_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- folders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS folders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  description text        NOT NULL DEFAULT '',
  color       text        NOT NULL DEFAULT 'indigo',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- No puede haber dos carpetas con el mismo nombre para el mismo usuario. El
-- índice sobre `lower(name)` sustituye a la detección por regex insensible a
-- mayúsculas que hacía el código con Mongo.
CREATE UNIQUE INDEX IF NOT EXISTS folders_user_name_key ON folders (user_id, lower(name));
CREATE INDEX IF NOT EXISTS folders_user_idx ON folders (user_id);

-- -----------------------------------------------------------------------------
-- files
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS files (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Clave foránea real. En MongoDB el campo `folder` guardaba el *nombre* de la
  -- carpeta como texto, y por eso renombrar una carpeta obligaba a un
  -- updateMany sobre todos sus archivos y borrarla a un deleteMany por nombre.
  -- Con una FK, renombrar es un UPDATE de una fila y el borrado se controla
  -- desde la aplicación, que además necesita conocer las rutas de
  -- almacenamiento para borrarlas.
  --
  -- Sin ON DELETE CASCADE a propósito: el borrado de una carpeta es explícito
  -- para que se limpien también los binarios. RESTRICT (el comportamiento por
  -- defecto) impide además que se cuele un archivo huérfano.
  folder_id     uuid        REFERENCES folders (id),
  original_name text        NOT NULL,
  mime_type     text        NOT NULL,
  category      text        NOT NULL CHECK (category IN ('pdf', 'image', 'word', 'excel', 'powerpoint', 'other')),
  size          bigint      NOT NULL CHECK (size >= 0),
  -- Ubicación del binario en el almacén configurado (Supabase Storage o disco).
  -- Nunca el contenido en sí: la base de datos no guarda archivos.
  storage_path  text        NOT NULL,
  description   text        NOT NULL DEFAULT '',
  tags          text[]      NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Índices equivalentes a los compuestos de Mongoose, para el listado del panel.
CREATE INDEX IF NOT EXISTS files_user_created_idx     ON files (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS files_user_category_idx    ON files (user_id, category);
CREATE INDEX IF NOT EXISTS files_user_folder_idx      ON files (user_id, folder_id, created_at DESC);
-- La búsqueda por nombre usa ILIKE con comodín al final; este índice solo ayuda
-- al prefijo, pero evita el seq scan en el caso más común (buscar "informe").
CREATE INDEX IF NOT EXISTS files_user_name_idx        ON files (user_id, lower(original_name) text_pattern_ops);

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at   ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS folders_set_updated_at ON folders;
CREATE TRIGGER folders_set_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS files_set_updated_at   ON files;
CREATE TRIGGER files_set_updated_at BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security: red de seguridad, no el mecanismo de acceso
-- -----------------------------------------------------------------------------
-- La aplicación se conecta con un rol privilegiado (el service role de Supabase
-- o `postgres`), que ignora RLS. El control de acceso real está en las rutas
-- de API, que filtran siempre por `user_id`.
--
-- Activar RLS sin definir ninguna política sirve para lo único que importa aquí:
-- si la `anon` key se usara por error desde el navegador, no devolvería ni una
-- sola fila. Sin este bloque, un fallo de configuración sería una fuga de
-- documentos privados.
ALTER TABLE users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files   ENABLE ROW LEVEL SECURITY;
