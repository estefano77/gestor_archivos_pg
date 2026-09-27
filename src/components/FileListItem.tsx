"use client";

import React from "react";
import { FileMetadata, formatBytes, getCategoryMeta } from "@/lib/file-utils";
import {
  FileText,
  Image as ImageIcon,
  FileCode2,
  FileSpreadsheet,
  Presentation,
  Download,
  Eye,
  Trash2,
  Edit2,
  Calendar,
  Folder,
  FolderInput,
} from "lucide-react";

interface FileListItemProps {
  file: FileMetadata;
  onPreview: (file: FileMetadata) => void;
  onDownload: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onRename: (file: FileMetadata) => void;
  onMove?: (file: FileMetadata) => void;
  onSelectFolder?: (folder: string) => void;
}

export default function FileListItem({
  file,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  onMove,
  onSelectFolder,
}: FileListItemProps) {
  const meta = getCategoryMeta(file.category);

  const formattedDate = new Date(file.createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 rounded-xl glass-card border border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 gap-3 transition-all duration-200">
      {/* File Info */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          onClick={() => onPreview(file)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md cursor-pointer ${meta.badgeSolid}`}
        >
          {file.category === "pdf" && <FileText className="w-5 h-5" />}
          {file.category === "image" && <ImageIcon className="w-5 h-5" />}
          {file.category === "word" && <FileCode2 className="w-5 h-5" />}
          {file.category === "excel" && (
            <FileSpreadsheet className="w-5 h-5" />
          )}
          {file.category === "powerpoint" && (
            <Presentation className="w-5 h-5" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              onClick={() => onPreview(file)}
              className="text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer truncate max-w-[200px] sm:max-w-xs md:max-w-md"
            >
              {file.originalName}
            </h4>
            <span
              className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border hidden sm:inline-block ${meta.badgeBg}`}
            >
              {meta.label}
            </span>
            {file.folder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFolder?.(file.folder!);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-1.5 sm:py-0.5 rounded-md border border-indigo-200/80 dark:border-indigo-800/80 transition-colors cursor-pointer"
                title={`Filtrar por carpeta: ${file.folder}`}
              >
                <Folder className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                <span className="truncate max-w-[120px]">{file.folder}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {formatBytes(file.size)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              {formattedDate}
            </span>
            {file.description && (
              <>
                <span>•</span>
                <span className="italic truncate max-w-[150px] text-slate-600 dark:text-slate-400">
                  {file.description}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 shrink-0 self-end sm:self-center">
        <button
          onClick={() => onPreview(file)}
          title="Visualizar archivo"
          className="p-3 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          onClick={() => onDownload(file)}
          title="Descargar archivo"
          className="p-3 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={() => onMove?.(file)}
          title="Mover a otra carpeta"
          className="p-3 sm:p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
        >
          <FolderInput className="w-4 h-4" />
        </button>

        <button
          onClick={() => onRename(file)}
          title="Renombrar o editar nota"
          className="p-3 sm:p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => onDelete(file)}
          title="Eliminar archivo"
          className="p-3 sm:p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
