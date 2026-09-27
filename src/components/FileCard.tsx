"use client";

import React, { useState } from "react";
import {
  FileMetadata,
  formatBytes,
  getCategoryMeta,
} from "@/lib/file-utils";
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
  MoreVertical,
  Folder,
} from "lucide-react";

interface FileCardProps {
  file: FileMetadata;
  onPreview: (file: FileMetadata) => void;
  onDownload: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onRename: (file: FileMetadata) => void;
  onMove?: (file: FileMetadata) => void;
  onSelectFolder?: (folder: string) => void;
}

export default function FileCard({
  file,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  onMove,
  onSelectFolder,
}: FileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = getCategoryMeta(file.category);

  const formattedDate = new Date(file.createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="group relative flex flex-col justify-between glass-card rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800/80 hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-300">
      {/* Top Bar: Category badge & Actions dropdown */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider border ${meta.badgeBg}`}
        >
          {file.category === "pdf" && <FileText className="w-3.5 h-3.5" />}
          {file.category === "image" && <ImageIcon className="w-3.5 h-3.5" />}
          {file.category === "word" && <FileCode2 className="w-3.5 h-3.5" />}
          {file.category === "excel" && (
            <FileSpreadsheet className="w-3.5 h-3.5" />
          )}
          {file.category === "powerpoint" && (
            <Presentation className="w-3.5 h-3.5" />
          )}
          {meta.label}
        </span>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-3 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            title="Más opciones"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-44 glass-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onMove?.(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Mover a carpeta</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onRename(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Editar / Renombrar</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Thumbnail / Visual Area */}
      <div
        onClick={() => onPreview(file)}
        className="relative h-36 w-full rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/60 overflow-hidden flex items-center justify-center cursor-pointer group-hover:border-slate-300 dark:group-hover:border-slate-700 transition-colors"
      >
        {file.category === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/files/${file._id}/preview`}
            alt={file.originalName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${meta.badgeSolid}`}
            >
              {file.category === "pdf" && <FileText className="w-7 h-7" />}
              {file.category === "word" && <FileCode2 className="w-7 h-7" />}
              {file.category === "excel" && (
                <FileSpreadsheet className="w-7 h-7" />
              )}
              {file.category === "powerpoint" && (
                <Presentation className="w-7 h-7" />
              )}
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
              {file.originalName.split(".").pop()?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Hover overlay with Quick Preview button */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-950 shadow-lg">
            <Eye className="w-3.5 h-3.5" />
            Visualizar
          </span>
        </div>
      </div>

      {/* File Details */}
      <div className="mt-3.5">
        <h4
          title={file.originalName}
          className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-white transition-colors"
        >
          {file.originalName}
        </h4>

        {file.folder && (
          <div className="mt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectFolder?.(file.folder!);
              }}
              className="inline-flex items-center gap-1 min-h-[36px] sm:min-h-0 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-1.5 sm:py-0.5 rounded-md border border-indigo-200/80 dark:border-indigo-800/80 transition-colors cursor-pointer"
              title={`Filtrar por carpeta: ${file.folder}`}
            >
              <Folder className="w-3 h-3 text-indigo-500 shrink-0" />
              <span className="truncate max-w-[150px]">{file.folder}</span>
            </button>
          </div>
        )}

        {file.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
            {file.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800/80">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {formatBytes(file.size)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-2">
        <button
          onClick={() => onPreview(file)}
          className="flex items-center justify-center gap-1.5 py-3 sm:py-1.5 px-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-transparent transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Ver
        </button>
        <button
          onClick={() => onDownload(file)}
          className="flex items-center justify-center gap-1.5 py-3 sm:py-1.5 px-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-transparent transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Descargar
        </button>
      </div>
    </div>
  );
}
