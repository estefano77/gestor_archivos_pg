"use client";

import React from "react";
import { formatBytes, formatQuotaBytes, QUOTA_WARN_RATIO } from "@/lib/file-utils";
import {
  FileText,
  Image as ImageIcon,
  FileCode2,
  FileSpreadsheet,
  Presentation,
  HardDrive,
  Files,
} from "lucide-react";

interface StorageStatsProps {
  stats: {
    totalBytes: number;
    totalFiles: number;
    quotaBytes: number;
    byCategory: Record<string, { bytes: number; count: number }>;
  } | null;
  onFilterCategory?: (category: string) => void;
  selectedCategory: string;
}

export default function StorageStats({
  stats,
  onFilterCategory,
  selectedCategory,
}: StorageStatsProps) {
  if (!stats) return null;

  const { totalBytes, totalFiles, quotaBytes, byCategory } = stats;
  const usedPercentage = Math.min(
    100,
    parseFloat(((totalBytes / quotaBytes) * 100).toFixed(1))
  );

  const remainingBytes = Math.max(0, quotaBytes - totalBytes);
  const usedRatio = quotaBytes > 0 ? totalBytes / quotaBytes : 0;
  const quotaFull = usedRatio >= 1;
  const quotaTextClass = quotaFull
    ? "text-rose-600 dark:text-rose-400"
    : usedRatio >= QUOTA_WARN_RATIO
      ? "text-amber-600 dark:text-amber-400"
      : "text-slate-500 dark:text-slate-400";

  const pdfPercent = totalBytes > 0 ? ((byCategory.pdf?.bytes || 0) / totalBytes) * 100 : 0;
  const imgPercent = totalBytes > 0 ? ((byCategory.image?.bytes || 0) / totalBytes) * 100 : 0;
  const wordPercent = totalBytes > 0 ? ((byCategory.word?.bytes || 0) / totalBytes) * 100 : 0;
  const excelPercent = totalBytes > 0 ? ((byCategory.excel?.bytes || 0) / totalBytes) * 100 : 0;
  const pptPercent = totalBytes > 0 ? ((byCategory.powerpoint?.bytes || 0) / totalBytes) * 100 : 0;

  return (
    <div className="w-full glass-card rounded-2xl p-5 sm:p-6 mb-8 border border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Resumen de Almacenamiento Seguro
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Archivos protegidos en tu almacenamiento privado
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {formatBytes(totalBytes)}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
                / {formatBytes(quotaBytes)}
              </span>
            </div>
            <div className={`text-[11px] font-medium ${quotaTextClass}`}>
              {quotaFull
                ? "Quota completa · elimina un archivo para liberar espacio"
                : `${usedPercentage}% usado · te quedan ${formatQuotaBytes(
                    remainingBytes
                  )}`}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Multi-color Progress Bar */}
      <div className="w-full h-3 bg-slate-200/80 dark:bg-slate-900/80 rounded-full overflow-hidden flex p-0.5 border border-slate-300/60 dark:border-slate-800 mb-6">
        {pdfPercent > 0 && (
          <div
            title={`PDF: ${formatBytes(byCategory.pdf?.bytes || 0)}`}
            style={{ width: `${pdfPercent}%` }}
            className="h-full bg-rose-500 transition-all duration-500 first:rounded-l-full last:rounded-r-full"
          />
        )}
        {imgPercent > 0 && (
          <div
            title={`Imágenes: ${formatBytes(byCategory.image?.bytes || 0)}`}
            style={{ width: `${imgPercent}%` }}
            className="h-full bg-emerald-500 transition-all duration-500 first:rounded-l-full last:rounded-r-full"
          />
        )}
        {wordPercent > 0 && (
          <div
            title={`Word: ${formatBytes(byCategory.word?.bytes || 0)}`}
            style={{ width: `${wordPercent}%` }}
            className="h-full bg-blue-500 transition-all duration-500 first:rounded-l-full last:rounded-r-full"
          />
        )}
        {excelPercent > 0 && (
          <div
            title={`Excel: ${formatBytes(byCategory.excel?.bytes || 0)}`}
            style={{ width: `${excelPercent}%` }}
            className="h-full bg-green-500 transition-all duration-500 first:rounded-l-full last:rounded-r-full"
          />
        )}
        {pptPercent > 0 && (
          <div
            title={`PowerPoint: ${formatBytes(byCategory.powerpoint?.bytes || 0)}`}
            style={{ width: `${pptPercent}%` }}
            className="h-full bg-amber-500 transition-all duration-500 first:rounded-l-full last:rounded-r-full"
          />
        )}
        {totalBytes === 0 && (
          <div className="h-full w-full bg-slate-200 dark:bg-slate-800/50 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-medium">
            Sin archivos almacenados aún
          </div>
        )}
      </div>

      {/* Interactive Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* All Files */}
        <button
          onClick={() => onFilterCategory?.("all")}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategory === "all"
              ? "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-500/50 shadow-md shadow-indigo-500/10"
              : "bg-white/70 dark:bg-slate-900/50 border-slate-200/90 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
          }`}
        >
          <div className="p-2 rounded-lg bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <Files className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Todos</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{totalFiles}</div>
          </div>
        </button>

        {/* PDFs */}
        <button
          onClick={() => onFilterCategory?.("pdf")}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategory === "pdf"
              ? "bg-rose-50 dark:bg-rose-500/15 border-rose-500/50 shadow-md shadow-rose-500/10"
              : "bg-white/70 dark:bg-slate-900/50 border-slate-200/90 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
          }`}
        >
          <div className="p-2 rounded-lg bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">PDFs</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {byCategory.pdf?.count || 0}
            </div>
          </div>
        </button>

        {/* Images */}
        <button
          onClick={() => onFilterCategory?.("image")}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategory === "image"
              ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-500/10"
              : "bg-white/70 dark:bg-slate-900/50 border-slate-200/90 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
          }`}
        >
          <div className="p-2 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Imágenes</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {byCategory.image?.count || 0}
            </div>
          </div>
        </button>

        {/* Word */}
        <button
          onClick={() => onFilterCategory?.("word")}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategory === "word"
              ? "bg-blue-50 dark:bg-blue-500/15 border-blue-500/50 shadow-md shadow-blue-500/10"
              : "bg-white/70 dark:bg-slate-900/50 border-slate-200/90 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
          }`}
        >
          <div className="p-2 rounded-lg bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <FileCode2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Word</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {byCategory.word?.count || 0}
            </div>
          </div>
        </button>

        {/* PowerPoint */}
        <button
          onClick={() => onFilterCategory?.("powerpoint")}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategory === "powerpoint"
              ? "bg-amber-50 dark:bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10"
              : "bg-white/70 dark:bg-slate-900/50 border-slate-200/90 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
          }`}
        >
          <div className="p-2 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">PowerPoint</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {byCategory.powerpoint?.count || 0}
            </div>
          </div>
        </button>

        {/* Excel */}
        <button
          onClick={() => onFilterCategory?.("excel")}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategory === "excel"
              ? "bg-green-50 dark:bg-green-500/15 border-green-500/50 shadow-md shadow-green-500/10"
              : "bg-white/70 dark:bg-slate-900/50 border-slate-200/90 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
          }`}
        >
          <div className="p-2 rounded-lg bg-green-500/15 dark:bg-green-500/20 text-green-600 dark:text-green-400">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Excel</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {byCategory.excel?.count || 0}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
