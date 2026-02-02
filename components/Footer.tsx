import { getCatalogMeta } from "../lib/catalog";

export default function Footer() {
  const meta = getCatalogMeta();
  const guidelineInfo = meta?.version
    ? `Versi Garis Panduan: ${meta.version}`
    : "Versi Garis Panduan: -";

  return (
    <footer className="border-t border-slate-200/70 bg-white/90 py-6 text-sm text-slate-500 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/70 dark:text-slate-300">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 sm:px-6 lg:px-8">
        <span>{guidelineInfo}</span>
        <span>Sasaran asas: 40 jam seminggu untuk BTA.</span>
      </div>
    </footer>
  );
}
