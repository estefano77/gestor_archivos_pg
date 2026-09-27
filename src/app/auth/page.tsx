"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderLock,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Loader2,
  FileCheck,
  Sparkles,
  BookOpen,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Footer from "@/components/Footer";
import {
  parseAuthMode,
  AUTH_MODE_LOCAL_ONLY,
  AUTH_MODE_GOOGLE_ONLY,
  AUTH_MODE_BOTH,
} from "@/lib/auth-config";

/**
 * Botón oficial de Google. El SVG va incrustado porque el logotipo de Google
 * tiene requisitos de marca sobre tamaño, color y espaciado que una fuente de
 * iconos no reproduce.
 */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.55-5.17 3.55-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.87 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Qué métodos de acceso están disponibles, según NEXT_PUBLIC_AUTH_MODE.
  // El cliente solo decide qué pintar; el efecto real lo aplican las rutas.
  const mode = parseAuthMode(process.env.NEXT_PUBLIC_AUTH_MODE);
  const localEnabled = mode === AUTH_MODE_LOCAL_ONLY || mode === AUTH_MODE_BOTH;
  const googleEnabled = mode === AUTH_MODE_GOOGLE_ONLY || mode === AUTH_MODE_BOTH;

  // En modo «solo Google» el registro con contraseña no tiene sentido: la cuenta
  // se crea sola la primera vez que se entra. Se oculta la pestaña y con ella el
  // formulario entero.
  const showRegisterTab = localEnabled;

  // La callback de Google vuelve a esta página con ?error=... cuando algo falla.
  // Leer la URL en un efecto es el caso correcto: la URL es un sistema externo
  // que solo existe en el cliente. La misma regla ya se silencia en
  // ThemeProvider.
  useEffect(() => {
    const motivo = new URLSearchParams(window.location.search).get("error");
    if (motivo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(motivo);
      // Se limpia la URL para que al recargar no vuelva a salir el aviso.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error en la autenticación");
      }

      // Successful authentication: navigate to dashboard
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al procesar la solicitud"
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("demo@cloudvault.app");
    setPassword("demo123456");
    if (!isLogin) {
      setName("Usuario Demo");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center items-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(3.5rem,env(safe-area-inset-top))] sm:pt-4 relative overflow-hidden transition-colors duration-300">
      {/* Floating Theme Toggle in top-right */}
      <div className="absolute top-[max(1.25rem,env(safe-area-inset-top))] right-4 sm:right-5 z-20">
        <ThemeToggle />
      </div>

      {/* Background ambient glowing spheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 dark:bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30 mb-4 animate-glow">
            <FolderLock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700 dark:from-white dark:via-slate-100 dark:to-indigo-200 bg-clip-text text-transparent">
            CloudVault
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Gestor de Archivos Seguro • PDF, Imágenes, Word, Excel y PowerPoint
          </p>
        </div>

        {/* Modo «solo Google»: la tarjeta se reduce al botón, sin pestañas ni
            formulario, porque la cuenta se crea sola al primer acceso. */}
        {googleEnabled && !localEnabled ? (
          <div className="glass-panel bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <p className="text-center text-sm text-slate-600 dark:text-slate-300 mb-5">
              Entra con tu cuenta de Google para acceder a tu bóveda.
            </p>

            <a
              href="/api/auth/google"
              id="btn-google"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm"
            >
              <GoogleLogo className="w-[18px] h-[18px] shrink-0" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Continuar con Google
              </span>
            </a>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}

            <p className="mt-5 text-xs text-slate-500 dark:text-slate-400 text-center">
              La primera vez que entres se creará tu cuenta automáticamente.
            </p>
          </div>
        ) : (
          <>
        {/* Card */}
        <div className="glass-panel bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Tabs: Login / Register */}
          <div
            className={`p-1 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 ${
              showRegisterTab ? "grid grid-cols-2" : "grid grid-cols-1"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
              className={`py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isLogin
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Iniciar Sesión
            </button>
            {showRegisterTab && (
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                }}
                className={`py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  !isLogin
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Crear Cuenta
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    id="input-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  id="input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  id="input-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              {!isLogin && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Mínimo 6 caracteres
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? "Acceder a mi Bóveda" : "Registrarme"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* El separador "o" solo tiene sentido si hay dos métodos a la vez.
              En modo local puro, Google queda deshabilitado y la ventana
              local es la única via de entrada. */}
          {googleEnabled && localEnabled && (
            <>
              <div className="flex items-center gap-3 my-5">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  o
                </span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* `state` de href: un <a> plano hace una navegación completa,
                  que es justo lo que necesita el viaje OAuth hacia Google. */}
              <a
                href="/api/auth/google"
                id="btn-google"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm"
              >
                <GoogleLogo className="w-[18px] h-[18px] shrink-0" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Continuar con Google
                </span>
              </a>
            </>
          )}

          {/* Quick Demo Fill Button */}
          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium py-3 sm:py-1 px-3 sm:px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Llenar datos de prueba para ingresar rápido</span>
            </button>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              ¿Primera vez en CloudVault?{" "}
              <Link
                href="/help"
                className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Consulta el manual de usuario
              </Link>
            </p>
          </div>
        </div>
          </>
        )}

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Acceso Controlado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>PDF, Word, Excel, PPT & Imágenes</span>
          </div>
        </div>

        {/* Pie de página */}
        <Footer bare className="mt-6" />
      </div>
    </div>
  );
}
