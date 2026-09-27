"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import StorageStats from "@/components/StorageStats";
import FileCard from "@/components/FileCard";
import FileListItem from "@/components/FileListItem";
import FileUploadModal from "@/components/FileUploadModal";
import FilePreviewModal from "@/components/FilePreviewModal";
import RenameModal from "@/components/RenameModal";
import DeleteModal from "@/components/DeleteModal";
import FolderModal from "@/components/FolderModal";
import MoveFileModal from "@/components/MoveFileModal";
import DeleteFolderModal from "@/components/DeleteFolderModal";
import Footer from "@/components/Footer";
import { FileMetadata, FolderItem, FOLDER_COLORS, USER_QUOTA_BYTES } from "@/lib/file-utils";
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  UploadCloud,
  FolderOpen,
  ArrowUpDown,
  Filter,
  Loader2,
  AlertCircle,
  Folder,
  FolderPlus,
  Settings2,
  Trash2,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor?: string;
}

interface StatsData {
  totalBytes: number;
  totalFiles: number;
  quotaBytes: number;
  byCategory: Record<string, { bytes: number; count: number }>;
}

export default function DashboardPage() {
  const router = useRouter();

  // Authentication & User state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Files & Filtering state
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [filesLoading, setFilesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Thematic Folders state
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [unorganizedStats, setUnorganizedStats] = useState<{
    fileCount: number;
    totalBytes: number;
  }>({ fileCount: 0, totalBytes: 0 });
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderItem | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [renameFile, setRenameFile] = useState<FileMetadata | null>(null);
  const [moveFile, setMoveFile] = useState<FileMetadata | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileMetadata | null>(null);

  // Errors & notification state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Check user authentication
  const checkAuth = useCallback(async () => {
    try {
      setAuthLoading(true);
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/auth");
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      router.push("/auth");
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  // 2. Fetch thematic folders list
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
        if (data.unorganized) {
          setUnorganizedStats(data.unorganized);
        }
      }
    } catch (err) {
      console.error("Error al cargar carpetas:", err);
    }
  }, []);

  // 3. Fetch files list
  const fetchFiles = useCallback(async () => {
    try {
      setFilesLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      if (selectedFolder && selectedFolder !== "all") {
        params.append("folder", selectedFolder);
      }
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      if (sortOption) {
        params.append("sort", sortOption);
      }

      const res = await fetch(`/api/files?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar archivos");
      }

      setFiles(data.files || []);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Error al conectar con la base de datos"
      );
    } finally {
      setFilesLoading(false);
    }
  }, [selectedCategory, selectedFolder, searchTerm, sortOption]);

  // 4. Fetch storage stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/files/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error al cargar stats:", err);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      fetchFiles();
      fetchFolders();
      fetchStats();
    }
  }, [user, fetchFiles, fetchFolders, fetchStats]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth");
    } catch (err) {
      router.push("/auth");
    }
  };

  // Handle Download
  const handleDownload = (file: FileMetadata) => {
    const downloadUrl = `/api/files/${file._id}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteFile) return;
    try {
      const res = await fetch(`/api/files/${deleteFile._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      fetchFiles();
      fetchStats();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al eliminar archivo");
    }
  };

  // The server is authoritative over the quota; this only mirrors it so the
  // upload button can explain itself before the user tries anything.
  const quotaFull = (stats?.totalBytes ?? 0) >= USER_QUOTA_BYTES;

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Verificando sesión segura...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onOpenUpload={() => setIsUploadOpen(true)}
        onLogout={handleLogout}
        isQuotaFull={quotaFull}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10">
        {/* Error notification banner if DB error */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-rose-700 dark:text-rose-300">
                Aviso de conexión con la base de datos
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400/90 mt-0.5">
                {errorMessage}. Asegúrate de que tu variable de entorno{" "}
                <code className="bg-rose-100 dark:bg-rose-950/60 px-1 py-0.5 rounded font-mono">
                  DATABASE_URL
                </code>{" "}
                esté configurada correctamente en el servidor.
              </p>
            </div>
          </div>
        )}

        {/* Storage Analytics Overview */}
        <StorageStats
          stats={stats}
          onFilterCategory={(cat) => setSelectedCategory(cat)}
          selectedCategory={selectedCategory}
        />

        {/* Thematic Folders Navigation Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Folder className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Carpetas Temáticas
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                {folders.length}
              </span>
            </div>

            <button
              onClick={() => {
                setEditingFolder(null);
                setIsFolderModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-3 sm:py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 transition-all cursor-pointer shadow-sm"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Nueva Carpeta</span>
            </button>
          </div>

          {/* Carpetas temáticas: las fichas se envuelven en varias filas para que
              se vean todas sin desplazamiento horizontal en ningún tamaño. */}
          <div className="flex flex-wrap items-center gap-2 pb-2 -mx-1 px-1 select-none">
            {/* "Todas" Chip */}
            <button
              onClick={() => setSelectedFolder("all")}
              className={`flex items-center gap-2 px-3.5 py-3 sm:py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFolder === "all"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700"
              }`}
            >
              <span>📁 Todas</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedFolder === "all"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {files.length}
              </span>
            </button>

            {/* "Sin carpeta" Chip */}
            <button
              onClick={() => setSelectedFolder("none")}
              className={`flex items-center gap-2 px-3.5 py-3 sm:py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFolder === "none"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700"
              }`}
            >
              <span>📂 Sin carpeta</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedFolder === "none"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {unorganizedStats.fileCount}
              </span>
            </button>

            {/* User Custom Thematic Folders */}
            {folders.map((f) => {
              const theme =
                FOLDER_COLORS[f.color || "indigo"] || FOLDER_COLORS.indigo;
              const isSelected = selectedFolder === f.name;

              return (
                <div
                  key={f._id}
                  className={`group relative flex items-center gap-1.5 pl-3 pr-1.5 py-1 sm:py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border max-w-full ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <button
                    onClick={() => setSelectedFolder(f.name)}
                    className="flex items-center gap-2 self-stretch min-w-0 cursor-pointer"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: theme.iconColor }}
                    />
                    <span className="font-semibold truncate max-w-[42vw] sm:max-w-none">{f.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {f.fileCount || 0}
                    </span>
                  </button>

                  {/* Settings / Edit Folder button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(f);
                      setIsFolderModalOpen(true);
                    }}
                    title="Editar carpeta"
                    className={`p-2.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? "text-white/80 hover:text-white hover:bg-white/20"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>

                  {/* Direct Delete Folder button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteFolderTarget(f);
                    }}
                    title="Eliminar carpeta y todo su contenido"
                    className={`p-2.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? "text-rose-200 hover:text-white hover:bg-rose-500/40"
                        : "text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Toolbar: Search, Filters, View Modes */}
        <div className="glass-panel p-4 rounded-2xl mb-6 border border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, nota, etiqueta o carpeta..."
              className="w-full pl-10 pr-4 py-2.5 sm:py-2 rounded-xl glass-input text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Right Toolbar Controls */}
          <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:items-center md:justify-end md:gap-3 md:w-auto">
            {/* Folder Select Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
              <Folder className="w-3.5 h-3.5 shrink-0" />
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-2 sm:py-1.5 px-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm sm:w-auto sm:max-w-[150px] truncate"
              >
                <option value="all">Todas las carpetas</option>
                <option value="none">Sin carpeta ({unorganizedStats.fileCount})</option>
                {folders.map((f) => (
                  <option key={f._id} value={f.name}>
                    📁 {f.name} ({f.fileCount || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Select Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
              <Filter className="w-3.5 h-3.5 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-2 sm:py-1.5 px-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm sm:max-w-none truncate"
              >
                <option value="all">Todas las categorías</option>
                <option value="pdf">Solo PDFs</option>
                <option value="image">Solo Imágenes</option>
                <option value="word">Solo Word</option>
                <option value="excel">Solo Excel</option>
                <option value="powerpoint">Solo PowerPoint</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-2 sm:py-1.5 px-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm sm:max-w-none truncate"
              >
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="name">Nombre (A-Z)</option>
                <option value="size_desc">Mayor tamaño</option>
                <option value="size_asc">Menor tamaño</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 md:self-center">
              <button
                onClick={() => setViewMode("grid")}
                title="Vista en cuadrícula"
                className={`p-3 sm:p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Vista en lista"
                className={`p-3 sm:p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Files Content Section */}
        {filesLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm">Cargando tus archivos...</p>
          </div>
        ) : files.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 text-center my-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {searchTerm || selectedCategory !== "all"
                ? "No se encontraron archivos con ese criterio"
                : "No has subido ningún archivo todavía"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              {searchTerm || selectedCategory !== "all"
                ? "Intenta modificar tu búsqueda o seleccionar otra categoría."
                : "Comienza a subir tus documentos en PDF, imágenes, archivos de Word (.doc, .docx), hojas de cálculo de Excel (.xls, .xlsx) o presentaciones de PowerPoint (.ppt, .pptx)."}
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              Subir Mi Primer Archivo
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <FileCard
                key={file._id}
                file={file}
                onPreview={(f) => setPreviewFile(f)}
                onDownload={handleDownload}
                onRename={(f) => setRenameFile(f)}
                onDelete={(f) => setDeleteFile(f)}
                onMove={(f) => setMoveFile(f)}
                onSelectFolder={(folderName) => setSelectedFolder(folderName)}
              />
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2.5">
            {files.map((file) => (
              <FileListItem
                key={file._id}
                file={file}
                onPreview={(f) => setPreviewFile(f)}
                onDownload={handleDownload}
                onRename={(f) => setRenameFile(f)}
                onDelete={(f) => setDeleteFile(f)}
                onMove={(f) => setMoveFile(f)}
                onSelectFolder={(folderName) => setSelectedFolder(folderName)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Pie de página */}
      <Footer className="mt-auto" />

      {/* Modals */}
      <FileUploadModal
        isOpen={isUploadOpen}
        folders={folders}
        usedBytes={stats?.totalBytes ?? 0}
        defaultFolder={
          selectedFolder !== "all" && selectedFolder !== "none"
            ? selectedFolder
            : ""
        }
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchFiles();
          fetchFolders();
          fetchStats();
        }}
      />

      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      <RenameModal
        file={renameFile}
        folders={folders}
        isOpen={!!renameFile}
        onClose={() => setRenameFile(null)}
        onSuccess={() => {
          fetchFiles();
          fetchFolders();
        }}
      />

      <MoveFileModal
        file={moveFile}
        folders={folders}
        isOpen={!!moveFile}
        onClose={() => setMoveFile(null)}
        onSuccess={(targetFolder: string) => {
          // Switch filter to show the file in its new location
          if (targetFolder) {
            setSelectedFolder(targetFolder);
          } else {
            // Moved to "Sin carpeta" → show all or unorganized
            setSelectedFolder("none");
          }
          fetchFiles();
          fetchFolders();
        }}
      />

      <FolderModal
        isOpen={isFolderModalOpen}
        folder={editingFolder}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onSuccess={() => {
          fetchFolders();
          fetchFiles();
          fetchStats();
        }}
      />

      <DeleteFolderModal
        folder={deleteFolderTarget}
        isOpen={!!deleteFolderTarget}
        onClose={() => setDeleteFolderTarget(null)}
        onConfirm={async () => {
          if (!deleteFolderTarget) return;
          const res = await fetch(`/api/folders/${deleteFolderTarget._id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Error al eliminar carpeta");
          }
          if (selectedFolder === deleteFolderTarget.name) {
            setSelectedFolder("all");
          }
          fetchFiles();
          fetchFolders();
          fetchStats();
        }}
      />

      <DeleteModal
        file={deleteFile}
        isOpen={!!deleteFile}
        onClose={() => setDeleteFile(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
