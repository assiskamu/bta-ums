"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  getMinimumTargetGrades,
  getMinimumTargetPathways,
  getMinimumTargetsByCategory,
  minimumTargetCategories,
} from "../packages/core/src";
import minimumTargets from "../data/btaMinimumTargets.json";

const CATEGORY_ICONS: Record<string, string> = {
  Pengajaran: "📘",
  Penyeliaan: "🧭",
  Penerbitan: "📝",
  Penyelidikan: "🔬",
  Persidangan: "🎤",
  Pentadbiran: "🗂️",
  Perkhidmatan: "🤝",
};

const CATEGORY_TINTS: Record<string, string> = {
  Pengajaran: "bg-amber-50/80 text-amber-900",
  Penyeliaan: "bg-amber-50/80 text-amber-900",
  Penyelidikan: "bg-sky-50/80 text-sky-900",
  Pentadbiran: "bg-emerald-50/80 text-emerald-900",
  Perkhidmatan: "bg-emerald-50/80 text-emerald-900",
};

const CATEGORY_BAR_COLORS: Record<string, string> = {
  Pengajaran: "from-amber-400 to-amber-600",
  Penyeliaan: "from-amber-400 to-amber-600",
  Penyelidikan: "from-sky-400 to-sky-600",
  Pentadbiran: "from-emerald-400 to-emerald-600",
  Perkhidmatan: "from-emerald-400 to-emerald-600",
  Penerbitan: "from-indigo-400 to-indigo-600",
  Persidangan: "from-indigo-400 to-indigo-600",
};

const FOCUS_OPTIONS = [
  { label: "Pensyarah", value: "Pensyarah" },
  { label: "Guru", value: "Guru" },
  { label: "Penyelidik", value: "Penyelidik" },
  { label: "Pentadbir", value: "Pentadbir" },
  { label: "Pensyarah Perubatan", value: "Perubatan" },
];

type TargetEntry = { percent: number; minHours: number };

type MinimumTargetsData = {
  meta?: { source?: string };
  categories: string[];
  targets: Record<string, Record<string, Record<string, TargetEntry>>>;
};

const formatPercent = (value: number) => {
  const percentValue = value * 100;
  return Number.isInteger(percentValue)
    ? `${percentValue}%`
    : `${percentValue.toFixed(1)}%`;
};

const formatHours = (value: number) =>
  Number.isInteger(value) ? `${value} jam` : `${value.toFixed(1)} jam`;

const buildColumnKey = (pathway: string, grade: string) =>
  `${pathway}::${grade}`;

export default function HomePage() {
  const pathways = useMemo(() => getMinimumTargetPathways(), []);
  const [pathway, setPathway] = useState(pathways[0] ?? "");
  const gradesForPathway = useMemo(
    () => getMinimumTargetGrades(pathway),
    [pathway]
  );
  const [grade, setGrade] = useState(gradesForPathway[0] ?? "");
  const [tableView, setTableView] = useState<"percent" | "hours">("percent");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedPathway, setFocusedPathway] = useState<string | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGrade(gradesForPathway[0] ?? "");
  }, [gradesForPathway]);

  useEffect(() => {
    if (!focusedPathway || !tableScrollRef.current) {
      return;
    }
    const target = tableScrollRef.current.querySelector<HTMLElement>(
      `[data-pathway="${focusedPathway}"]`
    );
    target?.scrollIntoView({ behavior: "smooth", inline: "center" });
  }, [focusedPathway]);

  const targetByCategory = useMemo(
    () => getMinimumTargetsByCategory(pathway, grade),
    [pathway, grade]
  );

  const sampleTargets = targetByCategory.filter((target) =>
    ["Pengajaran", "Penyeliaan", "Pentadbiran"].includes(target.category)
  );

  const statusTargets = targetByCategory;

  const data = minimumTargets as MinimumTargetsData;
  const pathwayGroups = useMemo(
    () =>
      pathways.map((path) => ({
        pathway: path,
        grades: getMinimumTargetGrades(path),
      })),
    [pathways]
  );

  const visiblePathwayGroups = focusedPathway
    ? pathwayGroups.filter((group) => group.pathway === focusedPathway)
    : pathwayGroups;

  const visibleColumns = useMemo(
    () =>
      visiblePathwayGroups.flatMap((group) =>
        group.grades.map((gradeLabel) => ({
          pathway: group.pathway,
          grade: gradeLabel,
          key: buildColumnKey(group.pathway, gradeLabel),
        }))
      ),
    [visiblePathwayGroups]
  );

  const searchValue = searchQuery.trim().toLowerCase();
  const matchesColumn = (column: { pathway: string; grade: string }) =>
    searchValue.length === 0
      ? false
      : `${column.pathway} ${column.grade}`.toLowerCase().includes(searchValue);
  const matchesGroup = (group: { pathway: string; grades: string[] }) =>
    searchValue.length === 0
      ? false
      : `${group.pathway} ${group.grades.join(" ")}`
          .toLowerCase()
          .includes(searchValue);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
      <section className="glass-card relative animate-fade-up overflow-hidden px-6 py-10 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
              ✨ Pusat Rujukan BTA UMS
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-4xl">
                Beban Tugas Akademik (BTA) UMS
              </h1>
              <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                BTA ialah ukuran beban kerja akademik dalam unit jam seminggu.
                Setiap peratus sasaran mewakili komitmen masa, dengan sasaran
                asas 40 jam seminggu bagi semua laluan dan gred/jawatan.
              </p>
              <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                Guna paparan interaktif untuk melihat sasaran minimum dan
                teruskan mengira rekod anda tanpa mengubah kaedah kalkulator
                sedia ada.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/kalkulator" className="btn-primary">
                Buka Kalkulator
              </Link>
              <a href="#jadual" className="btn-secondary">
                Lihat Jadual Minimum
              </a>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                label: "Sasaran asas",
                value: "40 jam/minggu",
                icon: "⏱️",
                tone: "from-amber-100/80 to-amber-50/80",
              },
              {
                label: "7 kategori spesifik",
                value: "Mengikut komponen BTA",
                icon: "📌",
                tone: "from-sky-100/80 to-sky-50/80",
              },
              {
                label: "Laluan & gred/jawatan",
                value: "Rujukan berbeza",
                icon: "🧩",
                tone: "from-emerald-100/80 to-emerald-50/80",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`glass-card flex flex-col gap-3 bg-gradient-to-br ${stat.tone} p-4 transition hover:-translate-y-1`}
              >
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-300">
                    {stat.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="glass-card space-y-6 p-6 transition hover:-translate-y-1">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Bagaimana Peratus Ditukar Kepada Jam?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Formula rasmi digunakan untuk semua kategori, laluan dan
              gred/jawatan.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-inner dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">
              Jam minimum = (Peratus minimum ÷ 100) × 40
            </p>
            <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
              {formatPercent(0.1)} × 40 = 4 jam
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
              Laluan
              <select
                value={pathway}
                onChange={(event) =>
                  setPathway(event.target.value as (typeof pathways)[number])
                }
                className="form-field"
              >
                {pathways.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
              Gred/Jawatan
              <select
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="form-field"
              >
                {gradesForPathway.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {sampleTargets.map((target) => (
              <div
                key={target.category}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm transition hover:-translate-y-1 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              >
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                  {target.category}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                  {formatPercent(target.percent)} × 40 = {formatHours(target.minHours)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Jumlah semua kategori = 100% bersamaan 40 jam seminggu.
          </p>
        </div>

        <div className="glass-card space-y-5 p-6 transition hover:-translate-y-1">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Status Minimum Mengikut Laluan & Gred/Jawatan
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Ringkasan sasaran minima mengikut kategori untuk rujukan cepat.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {pathway} · {grade}
            </p>
            <div className="mt-4 space-y-3">
              {statusTargets.map((target) => (
                <div key={target.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>
                      {CATEGORY_ICONS[target.category]} {target.category}
                    </span>
                    <span>{formatHours(target.minHours)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200/70 dark:bg-slate-700/60">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${
                        CATEGORY_BAR_COLORS[target.category] ??
                        "from-indigo-400 to-indigo-600"
                      } transition-all duration-700`}
                      style={{ width: `${Math.min(target.minHours / 40, 1) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="jadual" className="scroll-mt-24 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Jadual Minimum BTA
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Paparan peratus dan jam minimum mengikut laluan serta gred/jawatan.
            </p>
          </div>
          <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTableView("percent")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tableView === "percent"
                    ? "border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-300/60 dark:border-indigo-500/40 dark:bg-indigo-900/30 dark:text-indigo-100"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                }`}
              >
                Peratus Minimum (%)
              </button>
              <button
                type="button"
                onClick={() => setTableView("hours")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tableView === "hours"
                    ? "border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-300/60 dark:border-indigo-500/40 dark:bg-indigo-900/30 dark:text-indigo-100"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                }`}
              >
                Minimum Jam (daripada 40 jam/minggu)
              </button>
          </div>
        </div>

        <div className="glass-card space-y-5 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                Cari laluan, gred atau jawatan
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Contoh: DS53/54, Pentadbir, Penyelidik"
                className="form-field mt-2"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFocusedPathway(null)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  focusedPathway === null
                    ? "border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-300/60 dark:border-indigo-500/40 dark:bg-indigo-900/30 dark:text-indigo-100"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                }`}
              >
                Semua Laluan
              </button>
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFocusedPathway(option.value)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    focusedPathway === option.value
                      ? "border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-300/60 dark:border-indigo-500/40 dark:bg-indigo-900/30 dark:text-indigo-100"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              ref={tableScrollRef}
              className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60"
            >
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-white/90 text-slate-600 shadow-sm backdrop-blur dark:bg-slate-900/80 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold">Kategori</th>
                    {visiblePathwayGroups.map((group) => (
                      <th
                        key={group.pathway}
                        data-pathway={group.pathway}
                        colSpan={group.grades.length}
                        className={`px-4 py-3 text-xs font-semibold ${
                          matchesGroup(group)
                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                            : ""
                        }`}
                      >
                        {group.pathway}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400">
                      &nbsp;
                    </th>
                    {visibleColumns.map((column) => (
                      <th
                        key={`${column.key}-grade`}
                        className={`px-4 py-3 text-xs font-semibold text-slate-600 ${
                          matchesColumn(column)
                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                            : ""
                        }`}
                      >
                        {column.grade}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {minimumTargetCategories.map((category) => (
                    <tr key={category} className={CATEGORY_TINTS[category] ?? ""}>
                      <td className="px-4 py-3 text-sm font-semibold">
                        <span className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[category]}</span>
                          {category}
                        </span>
                      </td>
                      {visibleColumns.map((column) => {
                        const target =
                          data.targets[column.pathway]?.[column.grade]?.[category];
                        const cellValue =
                          tableView === "percent"
                            ? formatPercent(target?.percent ?? 0)
                            : formatHours(target?.minHours ?? 0);
                        return (
                          <td
                            key={`${column.key}-${category}`}
                            className={`px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 ${
                              matchesColumn(column)
                                ? "bg-indigo-50/70 text-indigo-700 ring-1 ring-indigo-200"
                                : ""
                            }`}
                          >
                            {cellValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/80 to-transparent dark:from-slate-950/80" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-300">
            <span>Leret ke sisi untuk melihat semua lajur jadual.</span>
            <span className="flex items-center gap-2">
              <span className="text-base">ⓘ</span>
              <span title={minimumTargets.meta?.source ?? ""}>
                Berdasarkan Garis Panduan BTA UMS
              </span>
            </span>
          </div>
        </div>
      </section>

      <section className="glass-card flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Sedia untuk mengira BTA?
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Mulakan pengiraan atau semak katalog aktiviti untuk rujukan.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/kalkulator" className="btn-primary">
            Pergi ke Kalkulator
          </Link>
          <Link href="/kalkulator#katalog" className="btn-secondary">
            Lihat Katalog Aktiviti
          </Link>
        </div>
      </section>
    </div>
  );
}
