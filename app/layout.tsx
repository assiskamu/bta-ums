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
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-sky-50 to-rose-100 opacity-80 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950" />
            <div className="absolute left-1/3 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-300/30 blur-[120px] dark:bg-blue-600/20" />
            <div className="absolute right-0 top-24 h-72 w-72 translate-x-1/3 rounded-full bg-rose-300/40 blur-[120px] dark:bg-rose-600/20" />
            <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-emerald-200/40 blur-[120px] dark:bg-emerald-600/20" />
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
