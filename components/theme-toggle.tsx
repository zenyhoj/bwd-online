"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ThemePreference = "light" | "dark";

function applyThemePreference(preference: ThemePreference) {
  const shouldUseDark = preference === "dark";

  document.documentElement.classList.toggle("dark", shouldUseDark);
  document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<ThemePreference>("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("theme");
    const initialTheme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : "light";

    setTheme(initialTheme);
    applyThemePreference(initialTheme);
  }, []);

  const handleThemeChange = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    window.localStorage.setItem("theme", nextTheme);
    applyThemePreference(nextTheme);
  };

  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={handleThemeChange}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-lg shadow-slate-950/10 backdrop-blur transition-all hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <Icon className="h-[18px] w-[18px] text-primary" />
      <span className="sr-only">Switch to {isDark ? "light" : "dark"} theme</span>
    </button>
  );
}
