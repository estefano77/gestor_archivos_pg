"use client";

import React, { useState } from "react";
import { FileMetadata, FolderItem } from "@/lib/file-utils";
import { X, Edit2, Loader2, Folder, FolderPlus } from "lucide-react";

interface RenameModalProps {
  file: FileMetadata | null;
  folders?: FolderItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RenameModal({
  file,
  folders = [],
  isOpen,
  onClose,
  onSuccess,
}: RenameModalProps) {
  if (!isOpen || !file) return null;

  return (
    <RenameModalContent
      key={file._id}
      file={file}
      folders={folders}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function RenameModalContent({
  file,
  folders = [],
  onClose,
  onSuccess,
}: {
  file: FileMetadata;
  folders: FolderItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(file.originalName);
  const [description, setDescription] = useState(file.description || "");
  const [tags, setTags] = useState(file.tags ? file.tags.join(", ") : "");
  const [selectedFolder, setSelectedFolder] = useState(file.folder || "");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }

    const finalFolder = isCreatingFolder
      ? newFolderName.trim()
      : selectedFolder.trim();

    if (isCreatingFolder && !newFolderName.trim()) {
      setError("Por favor escribe el nombre de la nueva carpeta o desactiva la opción.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/files/${file._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalName: name.trim(),
          description: description.trim(),
          folder: finalFolder,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar archivo");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md max-h-[92dvh] glass-panel bg-white/95 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Edit2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Editar Archivo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nombre del archivo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Thematic Folder Selection */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-indigo-500" />
                <span>Carpeta temática</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFolder(!isCreatingFolder);
                  setNewFolderName("");
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {isCreatingFolder ? (
                  "Elegir existente"
                ) : (
                  <>
                    <FolderPlus className="w-3 h-3" />
                    <span>+ Nueva carpeta</span>
                  </>
                )}
              </button>
            </div>

            {isCreatingFolder ? (
              <div className="space-y-1 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nombre de la nueva carpeta..."
                  maxLength={60}
                  autoFocus
                  disabled={isSaving}
                  className="w-full px-3 py-1.5 rounded-xl glass-input text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
            ) : (
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
              >
                <option value="">📁 Sin carpeta (Archivo suelto en raíz)</option>
                {folders.map((f) => (
                  <option key={f._id} value={f.name}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descripción o notas
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional..."
              className="w-full px-3 py-2 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Etiquetas (separadas por coma)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ej: contratos, final, 2026"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="sticky bottom-0 -mx-5 sm:-mx-6 px-5 sm:px-6 flex items-center justify-end gap-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
