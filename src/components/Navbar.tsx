"use client";

import React from "react";
import Link from "next/link";
import { FolderLock, LogOut, UploadCloud, User as UserIcon, BookOpen } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { APP_NAME, DATA_ENGINE_NAME } from "@/lib/app-config";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor?: string;
}

interface NavbarProps {
  user: UserProfile | null;
  onOpenUpload: () => void;
  onLogout: () => void;
  /** True when the user has filled their storage quota. */
  isQuotaFull?: boolean;
}

export default function Navbar({
  user,
  onOpenUpload,
  onLogout,
  isQuotaFull = false,
}: NavbarProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors duration-300 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 shadow-lg shadow-indigo-500/25 shrink-0">
            <FolderLock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="font-extrabold text-base sm:text-lg tracking-tight truncate bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700 dark:from-white dark:via-slate-100 dark:to-indigo-200 bg-clip-text text-transparent">
                {APP_NAME}
              </span>
              {/* El badge solo aparece cuando hay espacio real (iPhone 13 = 390px) */}
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 shrink-0">
                {DATA_ENGINE_NAME}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestor Seguro de Documentos y Multimedia
            </p>
          </div>
        </div>

        {/* Right Section: Theme Toggle, Actions & User Info */}
        <div className="flex items-center gap-1 sm:gap-2.5 lg:gap-3 shrink-0">
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Ayuda: el manual de usuario es publico, no necesita sesion */}
          <Link
            href="/help"
            id="btn-help"
            title="Manual de usuario"
            aria-label="Manual de usuario"
            className="p-3 sm:p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors shrink-0"
          >
            <BookOpen className="w-4 h-4" />
          </Link>

          {user && (
            <>
              {/* Upload Button */}
              <button
                id="btn-open-upload"
                onClick={onOpenUpload}
                title={
                  isQuotaFull
                    ? "Has alcanzado tu cuota de 25 MB. Elimina algún archivo para liberar espacio."
                    : "Subir un nuevo archivo"
                }
                className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition-all shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 cursor-pointer shrink-0 ${
                  isQuotaFull
                    ? "from-slate-400 to-slate-500 via-slate-500 shadow-slate-500/20 hover:from-slate-400 hover:to-slate-500"
                    : ""
                }`}
              >
                {/* En móvil el botón se queda solo con el icono: el texto|label
                    comprimía el nombre del producto hasta cortarlo. El icono de
                    subida es reconocible y el tamaño táctil no baja de 36 px. */}
                <UploadCloud className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">
                  {isQuotaFull ? "Sin espacio" : "Subir Archivo"}
                </span>
              </button>

              {/* User Avatar & Info */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-3 border-l border-slate-200 dark:border-slate-800 shrink-0">
                <div
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-inner shrink-0"
                  style={{
                    backgroundColor: user.avatarColor || "#6366f1",
                  }}
                  title={user.email}
                >
                  {getInitials(user.name) || <UserIcon className="w-4 h-4" />}
                </div>

                <div className="hidden md:block text-left text-xs">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 max-w-[130px] truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[130px] truncate">
                    {user.email}
                  </p>
                </div>

                {/* Logout Button */}
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="p-3 sm:p-2.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
