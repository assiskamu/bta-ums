"use client";

import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "bta-ums-theme";

type ThemeChoice = "light" | "dark";

const getSystemTheme = (): ThemeChoice =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>("light");

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined"
        ? (localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null)
        : null;
    setTheme(savedTheme ?? getSystemTheme());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const nextTheme: ThemeChoice = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="btn-secondary gap-2 text-xs sm:text-sm"
      aria-label={`Tukar ke tema ${
        nextTheme === "dark" ? "gelap" : "terang"
      }`}
    >
      <span className="text-base">{theme === "dark" ? "🌙" : "🌤️"}</span>
      <span>Tema: {theme === "dark" ? "Gelap" : "Terang"}</span>
    </button>
  );
}
