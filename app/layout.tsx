import "./globals.css";
import type { ReactNode } from "react";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "Beban Tugas Akademik (BTA) UMS",
  description:
    "Aplikasi BTA UMS untuk rujukan sasaran minimum dan kalkulator beban tugas akademik."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ms">
      <body>
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 opacity-90 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950" />
            <div className="absolute left-1/3 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-200/30 blur-[140px] dark:bg-blue-600/20" />
            <div className="absolute right-0 top-24 h-72 w-72 translate-x-1/3 rounded-full bg-violet-200/30 blur-[140px] dark:bg-violet-600/20" />
            <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-emerald-200/30 blur-[140px] dark:bg-emerald-600/20" />
          </div>
          <div className="relative z-10 flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
