"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type AppTheme = "dark" | "light";

const STORAGE_KEY = "abuadel_theme";

function applyThemeToDom(theme: AppTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.style.colorScheme = theme;

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", theme === "light" ? "#f4f6fb" : "#09090d");
  }
}

export function useAppTheme() {
  const [theme, setTheme] = useState<AppTheme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
      const rootHasLight = document.documentElement.classList.contains("light");
      const initial: AppTheme = stored === "light" || (stored !== "dark" && rootHasLight) ? "light" : "dark";
      setTheme(initial);
      applyThemeToDom(initial);
    } catch {
      // Keep default dark
    }

    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<AppTheme>)?.detail;
      if (detail === "light" || detail === "dark") {
        setTheme(detail);
      }
    };
    window.addEventListener("abuadel:theme-change", onSync);
    return () => window.removeEventListener("abuadel:theme-change", onSync);
  }, []);

  const toggleTheme = () => {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyThemeToDom(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage quota issues
    }
    window.dispatchEvent(new CustomEvent("abuadel:theme-change", { detail: next }));
  };

  return { theme, mounted, toggleTheme };
}

export function ThemeToggle({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, mounted, toggleTheme } = useAppTheme();
  const isLight = mounted && theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "التبديل إلى الوضع الليلي (Dark Mode)" : "التبديل إلى وضع النهار (Light Mode)"}
      title={isLight ? "تفعيل الوضع الليلي (Dark Mode)" : "تفعيل الوضع النهاري المضيء (Light Mode)"}
      className={`inline-flex items-center gap-1.5 rounded-xl border transition cursor-pointer shrink-0 font-black whitespace-nowrap ${
        compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
      } ${
        isLight
          ? "bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700 shadow-sm"
          : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35"
      } ${className}`}
      data-force-dark={isLight ? "true" : undefined}
    >
      {isLight ? (
        <>
          <Moon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>{compact ? "ليلي" : "الوضع الليلي 🌙"}</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{compact ? "نهاري" : "وضع النهار ☀️"}</span>
        </>
      )}
    </button>
  );
}
