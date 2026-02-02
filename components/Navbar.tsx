import Link from "next/link";

import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Utama" },
  { href: "/kalkulator", label: "Kalkulator" },
  { href: "/#jadual", label: "Jadual Minimum" },
  { href: "/kalkulator#katalog", label: "Katalog Aktiviti" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-sm font-semibold text-white shadow">
            BTA UMS
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-200 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-slate-900 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/kalkulator" className="btn-primary text-xs sm:text-sm">
            Buka Kalkulator
          </Link>
        </div>
      </div>
      <div className="border-t border-slate-200/70 bg-white/80 px-4 py-2 text-xs text-slate-500 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-300 md:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
