"use client";

import React, { useSyncExternalStore } from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
}

const emptySubscribe = () => () => {};

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <div className={`w-10 h-10 rounded-xl bg-slate-800/40 animate-pulse ${className}`} />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      id="btn-theme-toggle"
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      aria-label="Alternar tema"
      className={`relative p-2.5 rounded-xl transition-all duration-300 cursor-pointer shrink-0 ${
        isDark
          ? "text-amber-300 hover:text-amber-200 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 shadow-inner"
          : "text-indigo-600 hover:text-indigo-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 shadow-sm"
      } ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 scale-100 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 transition-transform duration-300 -rotate-12 scale-100 text-indigo-600" />
        )}
      </div>
    </button>
  );
}
