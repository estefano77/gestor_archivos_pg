"use client";

import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCode2,
  FileSpreadsheet,
  Presentation,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  getFileCategory,
  formatBytes,
  getCategoryMeta,
  ACCEPTED_EXTENSIONS,
  FolderItem,
  MAX_FILE_SIZE,
  USER_QUOTA_BYTES,
  formatQuotaBytes,
} from "@/lib/file-utils";
import { Folder, FolderPlus } from "lucide-react";

interface FileUploadModalProps {
  isOpen: boolean;
  folders?: FolderItem[];
  defaultFolder?: string;
  /** Bytes already stored by the current user, used for the quota preview. */
  usedBytes?: number;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function FileUploadModal({
  isOpen,
  folders = [],
  defaultFolder = "",
  usedBytes = 0,
  onClose,
  onUploadSuccess,
}: FileUploadModalProps) {
  if (!isOpen) return null;

  return (
    <FileUploadModalContent
      key={defaultFolder}
      folders={folders}
      defaultFolder={defaultFolder}
      usedBytes={usedBytes}
      onClose={onClose}
      onUploadSuccess={onUploadSuccess}
    />
  );
}

function FileUploadModalContent({
  folders = [],
  defaultFolder = "",
  usedBytes = 0,
  onClose,
  onUploadSuccess,
}: {
  folders?: FolderItem[];
  defaultFolder?: string;
  usedBytes?: number;
  onClose: () => void;
  onUploadSuccess: () => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(defaultFolder);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const remainingBytes = Math.max(0, USER_QUOTA_BYTES - usedBytes);
  const quotaFull = remainingBytes === 0;

  const validateAndSetFile = (file: File) => {
    setError(null);
    const category = getFileCategory(file.type, file.name);
    if (category === "other") {
      setError(
        "Formato no admitido. Selecciona un archivo PDF, imagen, Word (.doc/.docx), Excel (.xls/.xlsx) o PowerPoint (.ppt/.pptx)."
      );
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(
        `El archivo supera el tamaño máximo permitido de ${formatBytes(MAX_FILE_SIZE)}.`
      );
      return;
    }
    if (file.size > remainingBytes) {
      // Mismo criterio y mismo texto que el servidor, para que la validacion
      // anticipada y el error real no se contradigan.
      setError(
        quotaFull
          ? `Has alcanzado tu cuota de ${formatQuotaBytes(
              USER_QUOTA_BYTES
            )}. Elimina algún archivo para liberar espacio.`
          : `Este archivo ocupa ${formatQuotaBytes(
              file.size
            )} y solo te quedan ${formatQuotaBytes(
              remainingBytes
            )}: te faltan ${formatQuotaBytes(
              file.size - remainingBytes
            )}. Elimina algún archivo para liberar espacio.`
      );
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDescription("");
    setTags("");
    setSelectedFolder(defaultFolder);
    setIsCreatingFolder(false);
    setNewFolderName("");
    setError(null);
    setSuccess(false);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Por favor selecciona un archivo.");
      return;
    }

    const finalFolder = isCreatingFolder
      ? newFolderName.trim()
      : selectedFolder.trim();

    if (isCreatingFolder && !newFolderName.trim()) {
      setError("Por favor escribe el nombre de la nueva carpeta o desactiva la opción.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("description", description);
      formData.append("tags", tags);
      formData.append("folder", finalFolder);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al subir el archivo");
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onUploadSuccess();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setIsUploading(false);
    }
  };

  const category = selectedFile
    ? getFileCategory(selectedFile.type, selectedFile.name)
    : null;
  const meta = category ? getCategoryMeta(category) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92dvh] glass-panel bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 overflow-y-auto overscroll-contain">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Subir Nuevo Archivo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Almacena tus documentos de forma segura y privada
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Dropzone Area */}
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 scale-[1.01]"
                  : "border-slate-300 hover:border-indigo-500 dark:border-slate-700 dark:hover:border-indigo-400/60 bg-slate-50/50 hover:bg-slate-100/60 dark:bg-slate-950/40 dark:hover:bg-slate-950/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileChange}
                className="hidden"
                id="file-input-field"
              />

              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
                <UploadCloud className="w-7 h-7 animate-bounce" />
              </div>

              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-center">
                Arrastra y suelta tu archivo aquí, o{" "}
                <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">
                  examina
                </span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                PDF, Imágenes (PNG, JPG, SVG), Word (.docx, .doc), Excel (.xlsx, .xls), PowerPoint (.pptx, .ppt)
              </p>

              {/* Badges of supported formats */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <FileText className="w-3 h-3" /> PDF
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ImageIcon className="w-3 h-3" /> Imágenes
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <FileCode2 className="w-3 h-3" /> Word
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                  <FileSpreadsheet className="w-3 h-3" /> Excel
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Presentation className="w-3 h-3" /> PowerPoint
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  Límite por archivo: {formatBytes(MAX_FILE_SIZE)}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    quotaFull
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {quotaFull
                    ? "Quota agotada"
                    : `Te quedan ${formatQuotaBytes(
                        remainingBytes
                      )} de ${formatQuotaBytes(USER_QUOTA_BYTES)}`}
                </span>
              </div>
            </div>
          ) : (
            /* Selected File Preview Box */
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-white ${meta?.badgeSolid || "bg-indigo-600"}`}
                >
                  {category === "pdf" && <FileText className="w-6 h-6" />}
                  {category === "image" && <ImageIcon className="w-6 h-6" />}
                  {category === "word" && <FileCode2 className="w-6 h-6" />}
                  {category === "excel" && (
                    <FileSpreadsheet className="w-6 h-6" />
                  )}
                  {category === "powerpoint" && (
                    <Presentation className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[240px]">
                    {selectedFile.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatBytes(selectedFile.size)}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${meta?.badgeBg}`}
                    >
                      {meta?.label}
                    </span>
                  </div>
                </div>
              </div>

              {!isUploading && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Cambiar archivo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Thematic Folder Selection */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
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
                  "Seleccionar existente"
                ) : (
                  <>
                    <FolderPlus className="w-3 h-3" />
                    <span>+ Crear nueva carpeta</span>
                  </>
                )}
              </button>
            </div>

            {isCreatingFolder ? (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nombre de la nueva carpeta (ej: Legal, Marketing)..."
                  maxLength={60}
                  autoFocus
                  disabled={isUploading}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  La carpeta se creará automáticamente y quedará disponible para futuros archivos.
                </p>
              </div>
            ) : (
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                disabled={isUploading}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
              >
                <option value="">📁 Sin carpeta (Archivo suelto en raíz)</option>
                {folders.map((f) => (
                  <option key={f._id} value={f.name}>
                    📁 {f.name} ({f.fileCount || 0} archivos)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descripción o notas (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Contrato firmado 2026, Presentación para el cliente..."
              disabled={isUploading}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Tags Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Etiquetas (separadas por coma)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="informe, finanzas, borrador"
              disabled={isUploading}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Archivo subido exitosamente!</span>
            </div>
          )}

          {/* Actions */}
          <div className="sticky bottom-0 -mx-5 sm:-mx-6 px-5 sm:px-6 flex items-center justify-end gap-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-upload"
              type="submit"
              disabled={!selectedFile || isUploading || quotaFull}
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Subir Archivo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
