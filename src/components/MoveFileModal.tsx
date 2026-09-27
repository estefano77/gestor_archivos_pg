"use client";

import React, { useState } from "react";
import { FileMetadata, FolderItem, FOLDER_COLORS } from "@/lib/file-utils";
import {
  X,
  FolderInput,
  Folder,
  FolderPlus,
  Loader2,
  Check,
  FileText,
} from "lucide-react";

interface MoveFileModalProps {
  file: FileMetadata | null;
  folders: FolderItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (targetFolder: string) => void;
}

export default function MoveFileModal({
  file,
  folders,
  isOpen,
  onClose,
  onSuccess,
}: MoveFileModalProps) {
  if (!isOpen || !file) return null;

  return (
    <MoveFileModalContent
      key={file._id}
      file={file}
      folders={folders}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function MoveFileModalContent({
  file,
  folders,
  onClose,
  onSuccess,
}: {
  file: FileMetadata;
  folders: FolderItem[];
  onClose: () => void;
  onSuccess: (targetFolder: string) => void;
}) {
  const [selectedFolder, setSelectedFolder] = useState<string>(file.folder || "");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetFolder = isCreatingFolder
      ? newFolderName.trim()
      : selectedFolder.trim();

    if (isCreatingFolder && !newFolderName.trim()) {
      setError("Por favor escribe el nombre de la nueva carpeta.");
      return;
    }

    if (!isCreatingFolder && targetFolder === (file.folder || "")) {
      // Same folder, nothing to change
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/files/${file._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: targetFolder,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al mover el archivo");
      }

      onSuccess(targetFolder);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al mover el archivo"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md max-h-[92dvh] glass-panel bg-white/95 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 overflow-y-auto overscroll-contain">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Mover a Carpeta
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecciona la carpeta temática de destino
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

        {/* File preview */}
        <div className="flex items-center gap-3 p-3 my-4 rounded-xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {file.originalName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ubicación actual:{" "}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {file.folder ? `📁 ${file.folder}` : "📂 Sin carpeta (Raíz)"}
              </span>
            </p>
          </div>
        </div>

        <form onSubmit={handleMove} className="space-y-3.5">
          {/* Create new folder toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Carpeta de destino:
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(!isCreatingFolder);
                setNewFolderName("");
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {isCreatingFolder ? (
                "Elegir de la lista"
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ Crear nueva carpeta</span>
                </>
              )}
            </button>
          </div>

          {isCreatingFolder ? (
            <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-2 animate-in fade-in duration-150">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Nombre de la nueva carpeta:
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ej: Contabilidad 2026, Clientes VIP..."
                autoFocus
                maxLength={60}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {/* Option: Sin carpeta (Raíz) */}
              <button
                type="button"
                onClick={() => setSelectedFolder("")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedFolder === ""
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📂</span>
                  <div>
                    <p className="text-xs font-semibold">Sin carpeta (Raíz)</p>
                    <p
                      className={`text-[10px] ${
                        selectedFolder === ""
                          ? "text-indigo-100"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      Archivo suelto fuera de carpetas
                    </p>
                  </div>
                </div>
                {selectedFolder === "" && (
                  <Check className="w-4 h-4 text-white shrink-0" />
                )}
              </button>

              {/* User Folders */}
              {folders.map((f) => {
                const theme =
                  FOLDER_COLORS[f.color || "indigo"] || FOLDER_COLORS.indigo;
                const isSelected = selectedFolder === f.name;

                return (
                  <button
                    key={f._id}
                    type="button"
                    onClick={() => setSelectedFolder(f.name)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: theme.iconColor }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          📁 {f.name}
                        </p>
                        <p
                          className={`text-[10px] ${
                            isSelected
                              ? "text-indigo-100"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {f.fileCount || 0} archivo(s) actualmente
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-white shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="sticky bottom-0 -mx-5 sm:-mx-6 px-5 sm:px-6 flex items-center justify-end gap-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Moviendo...</span>
                </>
              ) : (
                <>
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Confirmar Movimiento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
