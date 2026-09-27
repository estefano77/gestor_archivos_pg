"use client";

import React, { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";

interface HelpImageProps {
  src: string;
  alt: string;
  caption: string;
  /**
   * Ancho maximo del marco, en pixeles. Se usa para las capturas verticales
   * (la del movil): sin tope, una imagen de 390 px se estiraria al ancho del
   * texto y se veriaBORrosa. Las apaisadas se dejan a ancho completo.
   */
  maxWidth?: number;
}

/**
 * Captura de pantalla con pie de foto y lupa al pulsarla.
 *
 * Las capturas se tomaron con el tema claro, así que se montan sobre un marco
 * claro fijo: en modo oscuro siguen leyéndose como una hoja de papel y no como
 * un rectángulo negro.
 */
export default function HelpImage({ src, alt, caption, maxWidth }: HelpImageProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Bloquea el scroll del fondo mientras la lupa esta abierta.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <figure className="my-5">
        <div
          className={maxWidth ? "mx-auto" : undefined}
          style={maxWidth ? { maxWidth } : undefined}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white p-2 shadow-sm cursor-zoom-in transition-all hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md active:scale-[0.99]"
            aria-label={`Ampliar: ${caption}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className="w-full h-auto rounded-xl block"
            />
            <span className="mt-2 mb-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
              <ZoomIn className="w-3.5 h-3.5" />
              Pulsa para ampliar
            </span>
          </button>
        </div>
        <figcaption className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center px-2">
          {caption}
        </figcaption>
      </figure>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-900/85 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Cerrar la imagen ampliada"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="max-w-full max-h-full overflow-auto rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-w-full h-auto rounded-xl block"
            />
          </div>
        </div>
      )}
    </>
  );
}
