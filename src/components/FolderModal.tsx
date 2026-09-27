"use client";

import React, { useState } from "react";
import { FolderItem, FOLDER_COLORS } from "@/lib/file-utils";
import {
  X,
  FolderPlus,
  Edit2,
  Trash2,
  Folder as FolderIcon,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";

interface FolderModalProps {
  isOpen: boolean;
  folder?: FolderItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const COLOR_OPTIONS: { id: string; label: string; previewClass: string }[] = [
  { id: "indigo", label: "Índigo", previewClass: "bg-indigo-500" },
  { id: "emerald", label: "Esmeralda", previewClass: "bg-emerald-500" },
  { id: "amber", label: "Ámbar", previewClass: "bg-amber-500" },
  { id: "rose", label: "Rosa", previewClass: "bg-rose-500" },
  { id: "purple", label: "Púrpura", previewClass: "bg-purple-500" },
  { id: "sky", label: "Cielo", previewClass: "bg-sky-500" },
];

export default function FolderModal({
  isOpen,
  folder,
  onClose,
  onSuccess,
}: FolderModalProps) {
  if (!isOpen) return null;

  return (
    <FolderModalContent
      key={folder?._id || "new-folder"}
      folder={folder}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function FolderModalContent({
  folder,
  onClose,
  onSuccess,
}: {
  folder?: FolderItem | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!folder;
  const [name, setName] = useState(folder?.name || "");
  const [color, setColor] = useState(folder?.color || "indigo");
  const [description, setDescription] = useState(folder?.description || "");
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre de la carpeta es obligatorio");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/folders/${folder?._id}` : "/api/folders";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar la carpeta");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error inesperado con la carpeta"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!folder) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/folders/${folder._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar carpeta");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar carpeta"
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedTheme = FOLDER_COLORS[color] || FOLDER_COLORS.indigo;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md max-h-[92dvh] glass-panel bg-white/95 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 overflow-y-auto overscroll-contain">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${selectedTheme.bg} ${selectedTheme.text}`}>
              {isEditing ? <Edit2 className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isEditing ? "Editar Carpeta Temática" : "Nueva Carpeta Temática"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? "Modifica el nombre o color temático"
                  : "Organiza tus documentos en carpetas temáticas"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation View */}
        {isDeleting ? (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-rose-700 dark:text-rose-300">
                  ¿Eliminar la carpeta &quot;{folder?.name}&quot; y todo su contenido?
                </p>
                <p className="text-rose-600 dark:text-rose-400 mt-1">
                  ¡Atención! Se eliminará la carpeta y <strong>todos los {folder?.fileCount || 0} archivo(s)</strong> que contiene de forma permanente. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div className="sticky bottom-0 -mx-5 sm:-mx-6 px-5 sm:px-6 flex items-center justify-end gap-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                disabled={loading}
                className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Eliminación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre de la carpeta
              </label>
              <div className="relative">
                <FolderIcon className={`absolute left-3 top-2.5 w-4 h-4 ${selectedTheme.text}`} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Finanzas, RRHH, Clientes 2026..."
                  required
                  maxLength={60}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Color Palette Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Color temático
              </label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${c.previewClass} ${
                      color === c.id
                        ? "ring-2 ring-offset-2 ring-indigo-500 scale-105 shadow-md"
                        : "opacity-80 hover:opacity-100"
                    }`}
                    title={c.label}
                  >
                    {color === c.id && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descripción temática (opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve nota sobre los documentos de esta carpeta..."
                maxLength={200}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div className="sticky bottom-0 -mx-5 sm:-mx-6 px-5 sm:px-6 flex items-center justify-between gap-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsDeleting(true)}
                  className="inline-flex items-center gap-1.5 px-1 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{isEditing ? "Guardar Cambios" : "Crear Carpeta"}</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
