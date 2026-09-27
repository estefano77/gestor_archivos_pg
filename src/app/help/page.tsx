"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  LifeBuoy,
  UserPlus,
  LogIn,
  LayoutDashboard,
  HardDrive,
  FolderPlus,
  UploadCloud,
  Search,
  Eye,
  Edit2,
  Trash2,
  SunMoon,
  Smartphone,
  Info,
  AlertTriangle,
  CircleAlert,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Footer from "@/components/Footer";
import HelpImage from "@/components/HelpImage";
import { HELP_SECTIONS, buildFooterNote, HelpBlock } from "@/lib/help-content";
import {
  parseAuthMode,
  AUTH_MODE_LOCAL_ONLY,
  AUTH_MODE_GOOGLE_ONLY,
} from "@/lib/auth-config";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  UserPlus,
  LogIn,
  LayoutDashboard,
  HardDrive,
  FolderPlus,
  UploadCloud,
  Search,
  Eye,
  Edit2,
  Trash2,
  SunMoon,
  Smartphone,
  LifeBuoy,
};

/**
 * Convierte el marcado `**negrita**` de los textos del manual en <strong>.
 * Es deliberadamente minimo: el manual no necesita mas que eso.
 */
function RichText({ text }: { text: string }) {
  const parts = useMemo(() => text.split(/(\*\*[^*]+\*\*)/g), [text]);

  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const CALLOUT_STYLES = {
  info: {
    box: "bg-sky-50/80 dark:bg-sky-500/10 border-sky-300/70 dark:border-sky-700/60",
    icon: "text-sky-600 dark:text-sky-400",
    title: "text-sky-900 dark:text-sky-200",
    body: "text-sky-800/90 dark:text-sky-200/80",
    Icon: Info,
  },
  warning: {
    box: "bg-amber-50/80 dark:bg-amber-500/10 border-amber-300/70 dark:border-amber-700/60",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-200",
    body: "text-amber-800/90 dark:text-amber-200/80",
    Icon: AlertTriangle,
  },
  danger: {
    box: "bg-rose-50/80 dark:bg-rose-500/10 border-rose-300/70 dark:border-rose-700/60",
    icon: "text-rose-600 dark:text-rose-400",
    title: "text-rose-900 dark:text-rose-200",
    body: "text-rose-800/90 dark:text-rose-200/80",
    Icon: CircleAlert,
  },
} as const;

function Block({ block }: { block: HelpBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <RichText text={block.text} />
        </p>
      );

    case "steps":
      return (
        <ol className="space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ol>
      );

    case "list":
      return (
        <ul className="space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5" />
              <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div className="overflow-x-clip -mx-1 px-1">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th
                    key={i}
                    className="text-left font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide pb-2 pr-3 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/70 last:border-0">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="py-2.5 pr-3 align-top text-slate-600 dark:text-slate-300 text-[13px] leading-relaxed"
                    >
                      {j === 0 ? (
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {cell}
                        </span>
                      ) : (
                        <RichText text={cell} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "callout": {
      const style = CALLOUT_STYLES[block.tone];
      const { Icon } = style;
      return (
        <div className={`rounded-2xl border p-4 ${style.box}`}>
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.icon}`} />
            <div className="min-w-0">
              <p className={`text-sm font-bold ${style.title}`}>{block.title}</p>
              <p className={`text-[13px] leading-relaxed mt-1 ${style.body}`}>
                <RichText text={block.text} />
              </p>
            </div>
          </div>
        </div>
      );
    }

    case "image":
      return (
        <HelpImage
          src={block.src}
          alt={block.alt}
          caption={block.caption}
          maxWidth={block.maxWidth}
        />
      );
  }
}

export default function HelpPage() {
  const [activeId, setActiveId] = useState(HELP_SECTIONS[0].id);

  // El manual se adapta al modo de acceso: si Google está deshabilitado no
  // tiene sentido documentar un botón que no existe, y al revés.
  const mode = parseAuthMode(process.env.NEXT_PUBLIC_AUTH_MODE);
  const localEnabled = mode === AUTH_MODE_LOCAL_ONLY || mode === 2;
  const googleEnabled = mode === AUTH_MODE_GOOGLE_ONLY || mode === 2;

  const visibleBlocks = (blocks: HelpBlock[]) =>
    blocks.filter((block) => {
      if (block.when === "local") return localEnabled;
      if (block.when === "google") return googleEnabled;
      return true;
    });

  // Scroll-spy: resalta en el indice la seccion que se esta leyendo.
  //
  // Se calcula con la posicion real de cada seccion y no con
  // IntersectionObserver: su callback solo recibe los cambios de ese ciclo, no
  // el estado completo, y por eso se quedaba corto o se saltaba secciones.
  useEffect(() => {
    const secciones = HELP_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null
    );

    // Un poco por debajo de la cabecera fija, que ocupa 64 px.
    const LIMITE = 120;
    let idActual = "";

    const calcular = () => {
      let id = secciones[0]?.id ?? HELP_SECTIONS[0].id;
      for (const el of secciones) {
        if (el.getBoundingClientRect().top <= LIMITE) id = el.id;
      }
      if (id !== idActual) {
        idActual = id;
        setActiveId(id);
      }
    };

    // Un solo calculo por fotograma como muy tarde.
    let pendiente = 0;
    const alDesplazar = () => {
      if (pendiente) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = 0;
        calcular();
      });
    };

    calcular();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    window.addEventListener("resize", alDesplazar);

    return () => {
      window.removeEventListener("scroll", alDesplazar);
      window.removeEventListener("resize", alDesplazar);
      if (pendiente) cancelAnimationFrame(pendiente);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Barra superior sencilla: el manual es publico, no necesita sesion. */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors duration-300 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 shadow-lg shadow-indigo-500/25 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight truncate">
                Manual de usuario
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                CloudVault · Guía para organizar tus documentos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <Link
              href="/"
              id="btn-help-back"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition-all shadow-md shadow-indigo-500/25"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Volver al panel</span>
              <span className="sm:hidden">Panel</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
          {/* Indice lateral */}
          <nav className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-2">
                Contenido
              </p>
              <ul className="space-y-0.5">
                {HELP_SECTIONS.map((section) => {
                  const Icon = ICONS[section.icon] ?? BookOpen;
                  const isActive = activeId === section.id;
                  return (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                          isActive
                            ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{section.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Contenido */}
          <div className="min-w-0">
            <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-bold mb-1.5">¿Para quién es este manual?</h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Para cualquier persona que use CloudVault. No hace falta saber nada de
                Computers: sigue los pasos en orden y está todo. Si buscas algo concreto,
                usa el índice de la izquierda.
              </p>
            </div>

            {/* Indice en movil: el de la izquierda se oculta por pantallas pequeñas. */}
            <details className="lg:hidden glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 mb-6 group">
              <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-bold">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  Contenido del manual
                </span>
                <span className="text-xs font-normal text-slate-400 group-open:hidden">
                  Ver todo
                </span>
                <span className="text-xs font-normal text-slate-400 hidden group-open:inline">
                  Ocultar
                </span>
              </summary>
              <ul className="mt-3 space-y-0.5 border-t border-slate-200 dark:border-slate-800 pt-3">
                {HELP_SECTIONS.map((section) => {
                  const Icon = ICONS[section.icon] ?? BookOpen;
                  return (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-[13px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                      >
                        <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                        {section.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </details>

            {HELP_SECTIONS.map((section) => {
              const Icon = ICONS[section.icon] ?? BookOpen;
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 mb-8 last:mb-0"
                >
                  <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold">{section.title}</h2>
                    </div>

                    <div className="space-y-4">
                      {visibleBlocks(section.blocks).map((block, i) => (
                        <Block key={i} block={block} />
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}

            <p className="mt-6 text-xs text-slate-400 dark:text-slate-500 text-center px-4">
              {buildFooterNote(localEnabled, googleEnabled)}
            </p>
          </div>
        </div>
      </main>

      <Footer className="mt-auto" />
    </div>
  );
}
