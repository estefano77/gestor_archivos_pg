/**
 * Contenido del manual de usuario.
 *
 * Vive aqui, y no dentro del JSX, para que actualizar un texto sea editar una
 * frase y no bucear entre etiquetas. Los iconos se referencian por nombre y se
 * resuelven a componentes de lucide-react en `app/help/page.tsx`.
 */

import {
  MAX_FILE_SIZE,
  USER_QUOTA_BYTES,
  QUOTA_WARN_RATIO,
} from "@/lib/file-utils";

/**
 * `when` marca un bloque que solo aplica a un modo de acceso concreto
 * ("local" o "google"). Se filtran en la pagina del manual para que no se
 * documente un botón que la aplicación no tiene.
 */
export type HelpBlock = {
  kind: "p" | "steps" | "list" | "table" | "callout" | "image";
  when?: "local" | "google";
} & (
  | { kind: "p"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | {
      kind: "callout";
      tone: "info" | "warning" | "danger";
      title: string;
      text: string;
    }
  | { kind: "image"; src: string; alt: string; caption: string; maxWidth?: number }
);

export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  blocks: HelpBlock[];
}

const ACCEPTED = [
  "PDF",
  "PNG",
  "JPG",
  "JPEG",
  "GIF",
  "WEBP",
  "SVG",
  "DOC",
  "DOCX",
  "XLS",
  "XLSX",
  "PPT",
  "PPTX",
];

const MAX_MB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
const QUOTA_MB = Math.round(USER_QUOTA_BYTES / (1024 * 1024));
const WARN_PERCENT = Math.round(QUOTA_WARN_RATIO * 100);

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "cuenta",
    title: "Crear tu cuenta",
    icon: "UserPlus",
    blocks: [
      {
        kind: "p",
        text: `CloudVault guarda tus archivos en un espacio privado. Solo tú puedes ver lo que subes: ninguna otra cuenta tiene acceso a tus documentos, ni siquiera alguien que conozca tu correo.`,
      },
      {
        kind: "p",
        when: "google",
        text: "Con Google no hay que registrarse. **Tu cuenta se crea sola la primera vez que entras**: eliges una cuenta de Google y ya estás dentro. No hay formulario ni que recordar una contraseña.",
      },
      {
        kind: "steps",
        when: "local",
        items: [
          "Abre la página de acceso y pulsa la pestaña **Crear Cuenta**.",
          "Escribe tu **Nombre Completo**, tu **Correo Electrónico** y una **Contraseña**.",
          "La contraseña necesita al menos **6 caracteres**. Usa una que recuerdes: no hay forma de recuperarla desde la aplicación.",
          "Pulsa **Registrarme** y entrarás directamente a tu panel.",
        ],
      },
      {
        kind: "image",
        when: "local",
        src: "/help/02-crear-cuenta.png",
        alt: "Formulario de creación de cuenta con los campos nombre, correo y contraseña",
        caption:
          "El formulario de registro pide nombre, correo y contraseña. El mínimo son 6 caracteres.",
      },
      {
        kind: "callout",
        tone: "info",
        when: "local",
        title: "Tu correo es tu usuario",
        text: "No se puede cambiar después. Si te registras con `nombre@correo.com` y luego entras con `NOMBRE@correo.com`, CloudVault lo reconoce como la misma cuenta (no distingue mayúsculas).",
      },
      {
        kind: "callout",
        tone: "info",
        when: "google",
        title: "Tu correo lo decide Google",
        text: "CloudVault toma el correo de tu cuenta de Google. Si algún día lo cambias allí, entrando con Google se actualizará aquí también.",
      },
    ],
  },

  {
    id: "acceso",
    title: "Entrar y salir",
    icon: "LogIn",
    blocks: [
      {
        kind: "p",
        text: "CloudVault guarda tu sesión durante 7 días. Entra por la vía que tengas disponible:",
      },
      {
        kind: "p",
        when: "local",
        text: "**Correo y contraseña.** Escribe tu correo y tu contraseña en el formulario y pulsa **Acceder a mi Bóveda**. Si no tienes cuenta, la pestaña **Crear Cuenta** te da acceso con el correo que quieras.",
      },
      {
        kind: "p",
        when: "google",
        text: "**Cuenta de Google.** Pulsa «Continuar con Google», elige una cuenta y entras directamente. No necesitas contraseña de CloudVault.",
      },
      {
        kind: "image",
        when: "local",
        src: "/help/01-iniciar-sesion.png",
        alt: "Pantalla de inicio de sesión de CloudVault",
        caption: "La pantalla de acceso. Tu sesión recuerda quién eres durante 7 días.",
      },
      {
        kind: "image",
        when: "google",
        src: "/help/17-solo-google.png",
        alt: "Pantalla de acceso de CloudVault reducida al botón de Google",
        caption:
          "Cuando la aplicación es solo de Google, la pantalla se queda únicamente con el botón: sin formulario y sin pestañas.",
      },
      {
        kind: "list",
        items: [
          "**Tu sesión dura 7 días.** Pasado ese tiempo tendrás que entrar de nuevo; tus archivos no se pierden.",
          "**Botón de salida**: el icono de flecha en la esquina superior derecha, junto a tu avatar.",
          "**Ayuda**: el icono de libro de esta misma barra te trae a este manual en cualquier momento.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        when: "google",
        title: "Entrar con Google",
        text: "Al pulsar «Continuar con Google» eliges una cuenta y entras directamente. **Google solo comparte tu nombre y tu correo**: nunca tus archivos de Drive, ni tus contactos, ni el contenido de tu correo. CloudVault pide lo mínimo para saber quién eres.",
      },
      {
        kind: "callout",
        tone: "info",
        when: "google",
        title: "Qué pasa si ya tenías una cuenta con contraseña",
        text: "Si te habías registrado antes con ese mismo correo, **entras en esa cuenta**: verás tus archivos y tu espacio tal como los tenías. No se crea una cuenta nueva ni se duplica nada. Solo se enlaza tu acceso con Google a partir de ese momento.",
      },
      {
        kind: "callout",
        tone: "warning",
        when: "google",
        title: "Las cuentas de Google no tienen contraseña",
        text: "CloudVault no guarda ninguna contraseña de las cuentas que entran con Google. Si en el formulario de acceso escribes el correo de una de esas cuentas con cualquier contraseña, CloudVault te avisará de que debes usar el botón de Google. Esa es la forma correcta de entrar, y no significa que tu cuenta esté dañada.",
      },
      {
        kind: "callout",
        tone: "warning",
        when: "google",
        title: "No se puede volver a entrar con contraseña",
        text: "Una vez que entras con Google, esa cuenta queda ligada a Google. Si después quieres usar correo y contraseña en lugar de Google, **no hay forma de hacerlo desde la aplicación**: hay que pedírselo a quien administre la instalación. Tenlo en cuenta antes de elegir este método si crees que vas a cambiar de opinión.",
      },
      {
        kind: "callout",
        tone: "info",
        when: "local",
        title: "¿Olvidaste tu contraseña?",
        text: "CloudVault no envía correos ni permite recuperarlas desde la aplicación. Si no recuerdas la contraseña de una cuenta creada con correo, tendrás que registrar una cuenta nueva. Por eso conviene usar una que se te quede.",
      },
    ],
  },

  {
    id: "panel",
    title: "Conociendo el panel",
    icon: "LayoutDashboard",
    blocks: [
      {
        kind: "p",
        text: "Al entrar verás un panel con tres zonas. De arriba abajo: cuánto espacio usas, tus carpetas y la lista de archivos.",
      },
      {
        kind: "image",
        src: "/help/03-panel.png",
        alt: "Panel principal con el resumen de almacenamiento, las carpetas temáticas y la cuadrícula de archivos",
        caption:
          "El panel completo: resumen de almacenamiento, carpetas temáticas, barra de búsqueda y tus archivos.",
      },
      {
        kind: "list",
        items: [
          "**Resumen de almacenamiento**: la barra de colores muestra qué ocupa más sitio (PDF, imágenes, Word, Excel o PowerPoint).",
          "**Carpetas temáticas**: tus carpetas, cada una con su color y el número de archivos que contiene.",
          "**Barra de herramientas**: buscador, filtros y forma de ordenar.",
          "**Tus archivos**: en cuadrícula (tarjetas grandes) o en lista (filas compactas).",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "Las tarjetas de categoría son filtros",
        text: "Al pulsar «PDFs», «Imágenes», «Word», «Excel» o «PowerPoint» el listado se reduce a ese tipo de archivo. Vuelve a pulsar «Todos» para recuperar la lista completa.",
      },
    ],
  },

  {
    id: "cuota",
    title: "Tu espacio de almacenamiento",
    icon: "HardDrive",
    blocks: [
      {
        kind: "p",
        text: `Cada cuenta tiene **${QUOTA_MB} MB** de espacio. Es un límite real: si lo llenas, no podrás subir más archivos hasta liberar espacio.`,
      },
      {
        kind: "table",
        head: ["Límite", "Cuánto es", "Qué pasa si lo alcanzas"],
        rows: [
          [
            "Por archivo",
            `${MAX_MB} MB`,
            "El archivo se rechaza y te avisa del tamaño que tenía.",
          ],
          [
            "Por cuenta",
            `${QUOTA_MB} MB`,
            "El botón de subir se pone gris y no te deja continuar.",
          ],
        ],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Ojo: los dos límites se suman",
        text: `El tope de ${MAX_MB} MB es **por archivo** y los ${QUOTA_MB} MB son **el total de todos tus archivos**. No es lo mismo. Por ejemplo, si subes un PDF de 15 MB, solo te quedarán 10 MB: alcanzarías la cuota con un segundo archivo, no con uno de 25 MB.`,
      },
      {
        kind: "p",
        text: "El panel te avisa antes de que sea un problema:",
      },
      {
        kind: "list",
        items: [
          `**Normal**: aparece «te quedan X MB».`,
          `**Aviso**: a partir del ${WARN_PERCENT}% el texto se pone **ámbar**.`,
          "**Cuota completa**: el texto se pone **rojo**, la barra se llena y el botón de subir de la barra superior se pone **gris** y deja de funcionar. En el ordenador el botón además avisa con un «Sin espacio»; en el móvil, al quedar solo con su icono, se apoya en el mensaje rojo y en «Quota agotada» de la ventana de subida.",
        ],
      },
      {
        kind: "image",
        src: "/help/14-cuota-aviso.png",
        alt: "Panel de almacenamiento al 85% con el mensaje de aviso en ámbar",
        caption: `Con un 85% usado el aviso aparece en ámbar y te dice exactamente cuánto te queda.`,
      },
      {
        kind: "image",
        src: "/help/15-cuota-agotada.png",
        alt: "Panel de almacenamiento con la cuota completamente llena",
        caption:
          "Con la cuota llena el mensaje se pone en rojo y el botón de la barra superior se pone gris. En el ordenador, además, dice «Sin espacio».",
      },
      {
        kind: "image",
        src: "/help/16-subir-sin-cuota.png",
        alt: "Ventana de subir archivo con la cuota agotada y el botón deshabilitado",
        caption:
          "La ventana de subida te muestra «Quota agotada» y el botón de enviar queda deshabilitado.",
      },
      {
        kind: "p",
        text: "**¿Cómo libero espacio?** Eliminando archivos que no necesites. Al borrarlos, el espacio se devuelve a tu cuenta al instante.",
      },
    ],
  },

  {
    id: "carpetas",
    title: "Carpetas temáticas",
    icon: "FolderPlus",
    blocks: [
      {
        kind: "p",
        text: "Las carpetas son **etiquetas de colores**, no carpetas dentro de tu disco. Tu ordenador no las tiene: son una forma de agrupar y encontrar tus archivos dentro de CloudVault.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "No se anidan",
        text: "Las carpetas son de un solo nivel. No puedes meter una carpeta dentro de otra, ni crear subcarpetas. Es a propósito: mantiene las cosas simples y evita perderse.",
      },
      {
        kind: "steps",
        items: [
          "Pulsa **Nueva Carpeta**, arriba a la derecha de la sección de carpetas.",
          "Escribe un **nombre** (hasta 60 caracteres) y, si quieres, una **descripción** (hasta 200).",
          "Elige un **color** de los seis disponibles. Sirve para reconocer la carpeta de un vistazo.",
          "Pulsa **Crear Carpeta**.",
        ],
      },
      {
        kind: "image",
        src: "/help/10-crear-carpeta.png",
        alt: "Ventana de creación de carpeta con nombre, paleta de seis colores y descripción",
        caption:
          "Al crear una carpeta eliges nombre, color y una descripción opcional.",
      },
      {
        kind: "p",
        text: "Cada carpeta tiene **dos botones** a su derecha:",
      },
      {
        kind: "list",
        items: [
          "**Engranaje**: abre la carpeta para cambiar su nombre, color o descripción.",
          "**Papelera**: elimina la carpeta. **Cuidado, esto también borra los archivos que tiene dentro** (lo explicamos más abajo).",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "Renombrar una carpeta no rompe nada",
        text: "Si cambias el nombre de una carpeta, todos los archivos que estaban dentro se actualizan solos y siguen siendo de tu cuenta. No tienes que moverlos a mano.",
      },
    ],
  },

  {
    id: "subir",
    title: "Subir archivos",
    icon: "UploadCloud",
    blocks: [
      {
        kind: "p",
        text: `Puedes subir un archivo cada vez. Se aceptan **${ACCEPTED.length} formatos**: ${ACCEPTED.join(", ")}. Cualquier otro formato se rechaza.`,
      },
      {
        kind: "steps",
        items: [
          "Pulsa **Subir Archivo** en la barra superior (o el botón grande si aún no tienes archivos).",
          "**Arrastra el archivo** hasta el recuadro punteado, o púlsalo para elegirlo desde tu equipo o móvil.",
          "Elige la **carpeta** donde quieres guardarlo. Si te has colocado sobre una carpeta en el panel, esa carpeta ya viene seleccionada.",
          "Si quieres, escribe una **descripción** y una o varias **etiquetas** separadas por comas. Ayudan mucho luego a encontrar el archivo.",
          "Pulsa **Subir Archivo** y espera a que aparezca la confirmación verde.",
        ],
      },
      {
        kind: "image",
        src: "/help/04-subir-archivo.png",
        alt: "Ventana de subida de archivo con zona de arrastrar, carpeta, descripción y etiquetas",
        caption:
          "La ventana de subida muestra el espacio que te queda y los formatos admitidos.",
      },
      {
        kind: "list",
        items: [
          "**Descripción**: una frase que te recuerde qué es. Aparece bajo el nombre del archivo.",
          "**Etiquetas**: palabras sueltas separadas por comas (`facturación, 2026, pendiente`). Se pueden buscar después.",
          "**Sin carpeta**: si no eliges ninguna, el archivo queda suelto en la raíz. Puedes moverlo más adelante.",
        ],
      },
      {
        kind: "callout",
        tone: "warning",
        title: "Crear una carpeta sin salir de la ventana",
        text: "Dentro de la ventana de subida, el enlace «+ Crear nueva carpeta» crea la carpeta y guarda en ella el archivo que estás subiendo, sin cerrar nada.",
      },
    ],
  },

  {
    id: "organizar",
    title: "Encontrar y ordenar tus archivos",
    icon: "Search",
    blocks: [
      {
        kind: "p",
        text: "Si tienes muchos archivos, la barra de herramientas te deja acotar la lista hasta encontrar lo que buscas.",
      },
      {
        kind: "list",
        items: [
          "**Buscar**: escribe en el buscador y la lista se filtra al momento. Busca en el **nombre**, la **descripción**, las **etiquetas** y el **nombre de la carpeta**.",
          "**Filtro de carpeta**: elige una carpeta concreta, o «Sin carpeta» para ver los archivos sueltos.",
          "**Filtro de categoría**: muestra solo un tipo (PDF, imágenes, Word, Excel o PowerPoint).",
          "**Ordenar**: más recientes, más antiguos, nombre (A-Z), mayor tamaño o menor tamaño.",
          "**Cuadrícula o lista**: el icono de la derecha cambia cómo se ven. La lista muestra más archivos por pantalla.",
        ],
      },
      {
        kind: "image",
        src: "/help/12-vista-lista.png",
        alt: "Panel con la vista de lista activada mostrando los archivos en filas",
        caption:
          "En vista de lista verás el nombre, el tipo, la carpeta, el tamaño, la fecha y todos los botones de acción en una sola fila.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Atajo: la carpeta de un archivo es un enlace",
        text: "Bajo el nombre de cada archivo aparece su carpeta con un color. Si pulsas esa etiqueta, el panel se filtra directamente por esa carpeta.",
      },
    ],
  },

  {
    id: "ver",
    title: "Ver y descargar",
    icon: "Eye",
    blocks: [
      {
        kind: "p",
        text: "Cada archivo tiene dos botones: **Ver** para abrirlo en pantalla y **Descargar** para guardarlo en tu equipo o móvil.",
      },
      {
        kind: "list",
        items: [
          "**PDF**: se abre con el visor que ya tiene tu navegador, con miniaturas, salto de páginas, zoom e impresión.",
          "**Imágenes**: se muestran ampliadas. Con los botones de la parte inferior puedes acercar y alejar entre el **50% y el 300%**, o volver al tamaño original.",
          "**Word, Excel y PowerPoint**: se muestra una ficha con el tipo de archivo, el peso, la fecha y tu nota. No se previsualiza el contenido, así que hay que descargarlo para abrirlo.",
        ],
      },
      {
        kind: "image",
        src: "/help/05-vista-previa-pdf.png",
        alt: "Vista previa de un PDF con la barra de herramientas nativa del navegador",
        caption:
          "Los PDF se visualizan con el visor del navegador: miniaturas, zoom, girar e imprimir.",
      },
      {
        kind: "image",
        src: "/help/06-vista-previa-imagen.png",
        alt: "Vista previa de una imagen con los controles de zoom",
        caption: "Las imágenes se pueden ampliar y reducir entre el 50% y el 300%.",
      },
      {
        kind: "image",
        src: "/help/07-vista-previa-office.png",
        alt: "Ficha de información de un archivo de Word con botón de descarga",
        caption:
          "Los archivos de Word, Excel y PowerPoint muestran su ficha de datos y se descargan para abrirse.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Abrir en otra pestaña",
        text: "El icono ↗ de la esquina superior derecha de la vista previa abre el archivo en una pestaña aparte, útil para revisar un PDF largo mientras haces otra cosa.",
      },
    ],
  },

  {
    id: "editar",
    title: "Editar, mover y eliminar archivos",
    icon: "Edit2",
    blocks: [
      {
        kind: "p",
        text: "Los botones de acción cambian según la vista. En **cuadrícula** están en el menú de tres puntitos (⋮) de cada tarjeta; en **lista** son los cinco iconos de la derecha de cada fila.",
      },
      {
        kind: "steps",
        items: [
          "**Editar / Renombrar**: cambia el nombre, la carpeta, la descripción y las etiquetas de un archivo que ya subiste.",
          "**Mover a carpeta**: cambia solo de carpeta, sin tocar el nombre ni los datos.",
          "**Eliminar**: borra el archivo. Pide confirmación y **no se puede deshacer**.",
        ],
      },
      {
        kind: "image",
        src: "/help/08-editar-archivo.png",
        alt: "Ventana de edición de archivo con nombre, carpeta, descripción y etiquetas",
        caption:
          "La ventana de Editar permite cambiar nombre, carpeta, descripción y etiquetas en un solo sitio.",
      },
      {
        kind: "image",
        src: "/help/09-mover-archivo.png",
        alt: "Ventana de mover a carpeta con la lista de carpetas y el número de archivos de cada una",
        caption:
          "Al mover verás cuántos archivos hay en cada carpeta y dónde está el archivo ahora mismo.",
      },
      {
        kind: "callout",
        tone: "info",
        title: "Renombrar no cambia el archivo",
        text: "CloudVault guarda tu nombre aparte del contenido. Puedes renombrarlo como quieras para encontrarlo antes, sin tocar el documento original. El nombre que descargas es el que le pusiste.",
      },
    ],
  },

  {
    id: "eliminar-carpeta",
    title: "Eliminar una carpeta",
    icon: "Trash2",
    blocks: [
      {
        kind: "callout",
        tone: "danger",
        title: "Esto borra los archivos de dentro",
        text: "Al eliminar una carpeta, CloudVault borra **la carpeta y todos los archivos que contiene**. No es un movido a una papelera: desaparece todo, y **no se puede deshacer**.",
      },
      {
        kind: "p",
        text: "CloudVault te avisa con un mensaje rojo que dice cuántos archivos exactamente se van a eliminar, para que decidas con el dato delante:",
      },
      {
        kind: "image",
        src: "/help/11-eliminar-carpeta.png",
        alt: "Ventana de confirmación de eliminación de carpeta con el número de archivos afectados",
        caption:
          "La confirmación indica cuántos archivos se borrarán junto con la carpeta.",
      },
      {
        kind: "p",
        text: "**Qué hacer si no quieres perderlos:** antes de eliminar la carpeta, entra en ella y mueve sus archivos a otra carpeta o a «Sin carpeta». O simplemente borra los archivos uno a uno y deja la carpeta vacía.",
      },
    ],
  },

  {
    id: "tema",
    title: "Tema claro y oscuro",
    icon: "SunMoon",
    blocks: [
      {
        kind: "p",
        text: "CloudVault tiene dos apariencias. La primera vez que entras se ajusta **sola** a la que tengas configurada en el sistema.",
      },
      {
        kind: "list",
        items: [
          "**Para cambiar de tema**: pulsa el icono de sol/luna en la barra superior, a la izquierda del botón de subir.",
          "**Se recuerda**: tu elección queda guardada en este navegador y se mantiene al cerrar y volver a abrir CloudVault.",
        ],
      },
      {
        kind: "image",
        src: "/help/13-tema-oscuro.png",
        alt: "El panel de CloudVault mostrado en el tema oscuro",
        caption: "El tema oscuro mantiene exactamente las mismas funciones que el claro.",
      },
    ],
  },

  {
    id: "movil",
    title: "Usar CloudVault desde el móvil",
    icon: "Smartphone",
    blocks: [
      {
        kind: "p",
        text: "CloudVault está pensado para funcionar igual en el teléfono que en el ordenador.",
      },
      {
        kind: "image",
        src: "/help/18-movil-cabecera.png",
        alt: "Panel de CloudVault en la pantalla de un iPhone, con la cabecera y el resumen de almacenamiento",
        caption:
          "En el móvil la cabecera se simplifica para que quepa entera: el botón de subir se queda solo con el icono de nube.",
        // 410 px de marco dejan la imagen a 390 px, su tamaño real, para que no
        // se vea pixelada al ampliarla.
        maxWidth: 410,
      },
      {
        kind: "list",
        items: [
          "**La barra superior se simplifica**: el botón de subir aparece solo con su icono de nube, y el nombre de CloudVault se mantiene completo. Los cuatro iconos de la derecha (tema, ayuda, subir y salir) siguen siendo los mismos.",
          "**Las ventanas suben desde abajo** como una hoja, con su propio botón de cerrar (✕).",
          "**Los botones de acción se quedan visibles** en la parte de abajo, al alcance del pulgar.",
          "**Las carpetas se reparten en varias filas**, así que no hay que deslizar el dedo en horizontal para verlas todas.",
          "**Se respeta la isla y la barra de inicio** del iPhone: la interfaz no queda debajo de ellas.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        title: "Subir desde el móvil",
        text: "Al pulsar la zona de archivos en el teléfono se abre la galería o el explorador de archivos del sistema, con las mismas opciones que en el ordenador.",
      },
    ],
  },

  {
    id: "problemas",
    title: "Si algo no sale como esperas",
    icon: "LifeBuoy",
    blocks: [
      {
        kind: "table",
        head: ["Qué pasa", "Por qué", "Qué hacer"],
        rows: [
          [
            "«Formato no admitido»",
            "El archivo no es de los tipos admitidos.",
            `Usa solo ${ACCEPTED.join(", ")}.`,
          ],
          [
            "«Supera el tamaño máximo»",
            `El archivo pesa más de ${MAX_MB} MB.`,
            "Divídelo o comprímelo antes de subirlo.",
          ],
          [
            "«No hay espacio suficiente»",
            `Tu cuenta ya tiene ocupados sus ${QUOTA_MB} MB.`,
            "Elimina algún archivo para liberar espacio.",
          ],
          [
            "«Este correo ya está registrado»",
            "Ya existe una cuenta con ese correo.",
            "Entra con tu contraseña, o usa otro correo.",
          ],
          [
            "«Esta cuenta se creó con Google»",
            "Entraste con Google, así que esa cuenta no tiene contraseña guardada.",
            "Pulsa **Continuar con Google**. No hay que hacer nada más: la cuenta está intacta.",
          ],
          [
            "«El acceso con contraseña está deshabilitado»",
            "La aplicación está configurada para entrar solo con Google.",
            "Pulsa **Continuar con Google**. Si tenías una cuenta creada con contraseña, necesita usar un correo de Google.",
          ],
          [
            "«El inicio de sesión con Google está deshabilitado»",
            "La aplicación está configurada para entrar solo con correo y contraseña.",
            "Usa el formulario de acceso. Necesitas una cuenta creada previamente.",
          ],
          [
            "Google dice que la cuenta no está verificada",
            "Esa cuenta de Google aún no confirmó su correo.",
            "Confirma el correo desde Google y vuelve a intentarlo.",
          ],
          [
            "Volví a la pantalla de acceso sin querer",
            "Google te devolvió aquí después de darte por identificada.",
            "Vuelve a pulsar **Continuar con Google**: la cuenta ya existe y no se duplicará.",
          ],
          [
            "Aviso de conexión a la base de datos",
            "La conexión con la base de datos se interrumpió.",
            "Recarga la página. Si sigue, avisa a quien administer la instalación.",
          ],
          [
            "La búsqueda no encuentra algo que sé que está",
            "El buscador no lee el contenido del documento, solo sus metadatos.",
            "Busca por el nombre, la nota, las etiquetas o la carpeta que le pusiste.",
          ],
        ],
      },
    ],
  },
];

/**
 * Nota al pie. Menciona el método de acceso solo cuando la aplicación ofrece
 * más de uno, porque en modo único la persona que lee no tiene nada que elegir.
 */
export function buildFooterNote(localEnabled: boolean, googleEnabled: boolean) {
  const acceso =
    localEnabled && googleEnabled
      ? " Puedes entrar con correo y contraseña o con tu cuenta de Google."
      : googleEnabled
        ? " El acceso es únicamente con cuenta de Google."
        : " El acceso es únicamente con correo y contraseña.";

  return `Este manual describe el comportamiento de CloudVault con una cuota de ${QUOTA_MB} MB por cuenta y un máximo de ${MAX_MB} MB por archivo.${acceso}`;
}
