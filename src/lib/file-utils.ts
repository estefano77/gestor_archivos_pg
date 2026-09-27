export type FileCategory =
  | "pdf"
  | "image"
  | "word"
  | "excel"
  | "powerpoint"
  | "other";

export interface FileMetadata {
  _id: string;
  originalName: string;
  mimeType: string;
  category: FileCategory;
  size: number;
  folder?: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FolderItem {
  _id: string;
  name: string;
  color?: string;
  description?: string;
  fileCount?: number;
  totalBytes?: number;
  createdAt: string;
}

export const FOLDER_COLORS: Record<string, { bg: string; text: string; border: string; badge: string; iconColor: string }> = {
  indigo: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/30",
    badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    iconColor: "#6366f1",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    iconColor: "#10b981",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    iconColor: "#f59e0b",
  },
  rose: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    iconColor: "#f43f5e",
  },
  purple: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    iconColor: "#a855f7",
  },
  sky: {
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/30",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    iconColor: "#0ea5e9",
  },
};

/**
 * Detects file category based on MIME type and extension
 */
export function getFileCategory(mimeType: string, filename: string): FileCategory {
  const lowerName = filename.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    lowerMime.startsWith("image/") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp") ||
    lowerName.endsWith(".gif") ||
    lowerName.endsWith(".svg")
  ) {
    return "image";
  }

  if (
    lowerMime === "application/msword" ||
    lowerMime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc")
  ) {
    return "word";
  }

  if (
    lowerMime === "application/vnd.ms-powerpoint" ||
    lowerMime ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lowerName.endsWith(".pptx") ||
    lowerName.endsWith(".ppt")
  ) {
    return "powerpoint";
  }

  if (
    lowerMime === "application/vnd.ms-excel" ||
    lowerMime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls")
  ) {
    return "excel";
  }

  return "other";
}

/**
 * Formats bytes to human-readable format (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats a byte count for quota messages.
 *
 * `formatBytes` rounds to the nearest value, which is fine for a label but
 * actively misleading when comparing a file against the space that is left:
 * 9.996 MB would be shown as "10 MB", and a file of exactly 10 MB would then
 * look like it fits in 10 MB. It does not. This helper always rounds *down*,
 * so the number shown is always space that genuinely exists.
 */
export function formatQuotaBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";

  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    const kb = bytes / 1024;
    return `${kb < 0.01 ? "<0.01" : Math.floor(kb * 100) / 100} KB`;
  }

  // Math.floor y no toFixed: 9.996 debe leerse 9.99, no 10.
  return `${Math.floor(mb * 100) / 100} MB`;
}

/**
 * Returns user-friendly UI meta info per category
 */
export function getCategoryMeta(category: FileCategory) {
  switch (category) {
    case "pdf":
      return {
        label: "PDF",
        badgeBg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        badgeSolid: "bg-rose-600 text-white",
        iconColor: "text-rose-500",
        cardBorder: "hover:border-rose-500/40",
        gradient: "from-rose-500/20 to-orange-500/10",
      };
    case "image":
      return {
        label: "Imagen",
        badgeBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        badgeSolid: "bg-emerald-600 text-white",
        iconColor: "text-emerald-500",
        cardBorder: "hover:border-emerald-500/40",
        gradient: "from-emerald-500/20 to-teal-500/10",
      };
    case "word":
      return {
        label: "Word",
        badgeBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        badgeSolid: "bg-blue-600 text-white",
        iconColor: "text-blue-500",
        cardBorder: "hover:border-blue-500/40",
        gradient: "from-blue-500/20 to-indigo-500/10",
      };
    case "powerpoint":
      return {
        label: "PowerPoint",
        badgeBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        badgeSolid: "bg-amber-600 text-white",
        iconColor: "text-amber-500",
        cardBorder: "hover:border-amber-500/40",
        gradient: "from-amber-500/20 to-orange-500/10",
      };
    case "excel":
      return {
        label: "Excel",
        badgeBg: "bg-green-500/10 text-green-500 border-green-500/20",
        badgeSolid: "bg-green-600 text-white",
        iconColor: "text-green-500",
        cardBorder: "hover:border-green-500/40",
        gradient: "from-green-500/20 to-lime-500/10",
      };
    default:
      return {
        label: "Archivo",
        badgeBg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        badgeSolid: "bg-slate-600 text-white",
        iconColor: "text-slate-400",
        cardBorder: "hover:border-slate-500/40",
        gradient: "from-slate-500/20 to-zinc-500/10",
      };
  }
}

/**
 * Accepted extensions string for file inputs
 */
export const ACCEPTED_EXTENSIONS =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

/**
 * Maximum size of a single file: 15 MB.
 *
 * In the MongoDB version this was a hard technical limit rather than a policy
 * choice: the binary was stored inside the document, and a BSON document cannot
 * exceed 16 MB, so anything nearer that boundary risked failing at the driver
 * level.
 *
 * Now the binary lives in an object store and the table keeps only its path, so
 * that ceiling is gone. 15 MB is kept for now on purpose, for three reasons:
 * keep the behaviour identical to the version already in production, stay well
 * inside the request body limit of the platform, and avoid opening the door to
 * files so large that a phone on a slow connection gives up halfway through.
 * Raising it is a one-line change once the real limit is decided.
 */
export const MAX_FILE_SIZE = 15 * 1024 * 1024;

/**
 * Total storage quota per user: 25 MB, counting every file they own.
 *
 * Because a single file can be at most `MAX_FILE_SIZE`, a user can for example
 * store 15 MB + 10 MB and then be out of space. The UI therefore has to show
 * the remaining megabytes, not just a percentage.
 */
export const USER_QUOTA_BYTES = 25 * 1024 * 1024;

/** Quota usage (0-1) above which the storage panel turns amber. */
export const QUOTA_WARN_RATIO = 0.8;
