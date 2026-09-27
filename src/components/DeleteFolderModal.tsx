"use client";

import React, { useState } from "react";
import { FolderItem } from "@/lib/file-utils";
import { AlertTriangle, Trash2, X, Loader2, Folder } from "lucide-react";

interface DeleteFolderModalProps {
  folder: FolderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteFolderModal({
  folder,
  isOpen,
  onClose,
  onConfirm,
}: DeleteFolderModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !folder) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar la carpeta"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md max-h-[92dvh] glass-panel bg-white/95 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Eliminar Carpeta y Todo su Contenido
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Warning box */}
          <div className="p-4 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-rose-700 dark:text-rose-300 text-sm">
                ¿Eliminar permanentemente &quot;{folder.name}&quot;?
              </p>
              <p className="text-rose-600 dark:text-rose-400 mt-1.5 leading-relaxed">
                Esta acción eliminará la carpeta y <strong>todos los {folder.fileCount || 0} archivo(s)</strong> que contiene de forma irreversible.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <Folder className="w-4 h-4 text-indigo-500" />
              {folder.name}
            </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {folder.fileCount || 0} archivos a eliminar
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 transition-all shadow-md cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Eliminando carpeta y archivos...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Carpeta y Contenido</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
