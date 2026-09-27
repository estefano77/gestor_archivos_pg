"use client";

import React from "react";

interface FooterProps {
  /** Sin borde ni fondo: para pantallas centradas como el inicio de sesión. */
  bare?: boolean;
  className?: string;
}

/**
 * Pie de página con el aviso de copyright.
 *
 * El año se calcula en tiempo de render para que siempre sea el actual; en el
 * renderizado del servidor y en el del cliente puede diferir solo si el cambio
 * de año ocurre justo entre ambos, por eso el texto lleva
 * `suppressHydrationWarning`.
 */
export default function Footer({ bare = false, className = "" }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`w-full ${
        bare
          ? ""
          : "border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm"
      } ${className}`}
    >
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center ${
          bare ? "py-1" : "py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        }`}
      >
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          © <span suppressHydrationWarning>{year}</span> Desarrollado por{" "}
          <a
            href="https://www.linkedin.com/in/estefano-castillo-estrada-137962169/"
            target="_blank"
            rel="noopener noreferrer"
            title="Perfil de LinkedIn de Estéfano Castillo"
            className="inline-block py-0.5 font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 underline-offset-2 hover:underline transition-colors cursor-pointer"
          >
            Estéfano Castillo
          </a>
        </p>
      </div>
    </footer>
  );
}
