"use client";

import { useEffect, useMemo, useState } from "react";

const PATHWAYS = [
  "Guru",
  "Pensyarah",
  "Penyelidik",
  "Pentadbir",
  "Perubatan",
] as const;

const TABS = [
  "Pengajaran",
  "Penyeliaan",
  "Penerbitan",
  "Penyelidikan",
  "Persidangan",
  "Pentadbiran",
  "Perkhidmatan",
] as const;

type TabKey = (typeof TABS)[number];

const TAB_ICONS: Record<TabKey, string> = {
  Pengajaran: "📚",
  Penyeliaan: "🧭",
  Penerbitan: "📝",
  Penyelidikan: "🔬",
  Persidangan: "🎤",
  Pentadbiran: "🗂️",
  Perkhidmatan: "🤝",
};

type Entry = {
  id: string;
  activity: string;
  units: string;
  hours: number;
};

type DraftEntry = {
  activity: string;
  units: string;
  hours: string;
};

type StoredState = {
  pathway: (typeof PATHWAYS)[number];
  entriesByTab: Record<TabKey, Entry[]>;
};

const STORAGE_KEY = "bta-ums-v1";

const createEmptyEntries = () =>
  TABS.reduce<Record<TabKey, Entry[]>>((accumulator, tab) => {
    accumulator[tab] = [];
    return accumulator;
  }, {} as Record<TabKey, Entry[]>);

const createEmptyDrafts = () =>
  TABS.reduce<Record<TabKey, DraftEntry>>((accumulator, tab) => {
    accumulator[tab] = { activity: "", units: "", hours: "" };
    return accumulator;
  }, {} as Record<TabKey, DraftEntry>);

const createEmptyErrors = () =>
  TABS.reduce<Record<TabKey, string>>((accumulator, tab) => {
    accumulator[tab] = "";
    return accumulator;
  }, {} as Record<TabKey, string>);

const normalizeStoredState = (value: StoredState | null): StoredState | null => {
  if (!value) {
    return null;
  }

  const pathway = PATHWAYS.includes(value.pathway)
    ? value.pathway
    : PATHWAYS[0];
  const normalizedEntries = createEmptyEntries();

  TABS.forEach((tab) => {
    const entries = value.entriesByTab?.[tab] ?? [];
    normalizedEntries[tab] = entries
      .filter((entry) => entry && typeof entry.activity === "string")
      .map((entry) => ({
        id: entry.id ?? `${tab}-${Date.now()}`,
        activity: entry.activity,
        units: entry.units ?? "-",
        hours: Number.isFinite(entry.hours) ? entry.hours : 0,
      }));
  });

  return { pathway, entriesByTab: normalizedEntries };
};

export default function HomePage() {
  const [pathway, setPathway] = useState<(typeof PATHWAYS)[number]>(
    PATHWAYS[0]
  );
  const [activeTab, setActiveTab] = useState<TabKey>(TABS[0]);
  const [entriesByTab, setEntriesByTab] = useState(createEmptyEntries);
  const [draftsByTab, setDraftsByTab] = useState(createEmptyDrafts);
  const [errorsByTab, setErrorsByTab] = useState(createEmptyErrors);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as StoredState;
      const normalized = normalizeStoredState(parsed);
      if (normalized) {
        setPathway(normalized.pathway);
        setEntriesByTab(normalized.entriesByTab);
      }
    } catch (error) {
      console.error("Failed to load saved state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const payload: StoredState = { pathway, entriesByTab };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [entriesByTab, pathway]);

  const handleDraftChange = (
    tab: TabKey,
    field: keyof DraftEntry,
    value: string
  ) => {
    setDraftsByTab((current) => ({
      ...current,
      [tab]: {
        ...current[tab],
        [field]: value,
      },
    }));

    if (field === "hours") {
      setErrorsByTab((current) => ({
        ...current,
        [tab]: "",
      }));
    }
  };

  const handleAddEntry = (tab: TabKey) => {
    const draft = draftsByTab[tab];
    const hoursValue = Number.parseFloat(draft.hours);

    if (!Number.isFinite(hoursValue) || hoursValue <= 0) {
      setErrorsByTab((current) => ({
        ...current,
        [tab]: "Jam mesti lebih daripada 0.",
      }));
      return;
    }

    const newEntry: Entry = {
      id: `${tab}-${Date.now()}`,
      activity: draft.activity.trim() || "(Aktiviti)",
      units: draft.units.trim() || "-",
      hours: hoursValue,
    };

    setEntriesByTab((current) => ({
      ...current,
      [tab]: [...current[tab], newEntry],
    }));

    setDraftsByTab((current) => ({
      ...current,
      [tab]: { activity: "", units: "", hours: "" },
    }));
    setErrorsByTab((current) => ({
      ...current,
      [tab]: "",
    }));
  };

  const handleRemoveEntry = (tab: TabKey, id: string) => {
    setEntriesByTab((current) => ({
      ...current,
      [tab]: current[tab].filter((entry) => entry.id !== id),
    }));
  };

  const handleResetAll = () => {
    if (typeof window === "undefined") {
      return;
    }

    const confirmed = window.confirm(
      "Anda pasti mahu padam semua rekod aktiviti?"
    );
    if (!confirmed) {
      return;
    }

    setEntriesByTab(createEmptyEntries());
    setDraftsByTab(createEmptyDrafts());
    setErrorsByTab(createEmptyErrors());
  };

  const totals = useMemo(() => {
    const breakdown = TABS.reduce<Record<TabKey, number>>((accumulator, tab) => {
      const tabTotal = entriesByTab[tab].reduce(
        (sum, entry) => sum + (entry.hours || 0),
        0
      );
      accumulator[tab] = tabTotal;
      return accumulator;
    }, {} as Record<TabKey, number>);

    const totalHours = Object.values(breakdown).reduce(
      (sum, value) => sum + value,
      0
    );

    return { breakdown, totalHours };
  }, [entriesByTab]);

  const progressPercentage = Math.min((totals.totalHours / 40) * 100, 100);
  const statusLabel = totals.totalHours >= 40 ? "Cukup" : "Kurang";
  const progressText = `${totals.totalHours.toFixed(1)} / 40 jam`;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">
                BTA UMS Calculator
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Pilih laluan dan tambah aktiviti mengikut kategori.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label
                className="text-sm font-medium text-slate-600"
                htmlFor="pathway"
              >
                Pathway
              </label>
              <select
                id="pathway"
                value={pathway}
                onChange={(event) =>
                  setPathway(event.target.value as (typeof PATHWAYS)[number])
                }
                className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {PATHWAYS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Kategori Aktiviti
                </h2>
                <p className="text-sm text-slate-500">
                  Tambah aktiviti mengikut tab di bawah.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetAll}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                Reset semua
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{TAB_ICONS[tab]}</span>
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-800">
                {activeTab}
              </h3>
              <div className="mt-4 grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto]">
                <input
                  type="text"
                  placeholder="Nama aktiviti"
                  value={draftsByTab[activeTab].activity}
                  onChange={(event) =>
                    handleDraftChange(activeTab, "activity", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <input
                  type="text"
                  placeholder="Unit"
                  value={draftsByTab[activeTab].units}
                  onChange={(event) =>
                    handleDraftChange(activeTab, "units", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Jam"
                  value={draftsByTab[activeTab].hours}
                  onChange={(event) =>
                    handleDraftChange(activeTab, "hours", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={() => handleAddEntry(activeTab)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Tambah
                </button>
              </div>
              {errorsByTab[activeTab] ? (
                <p className="mt-2 text-sm text-red-600">
                  {errorsByTab[activeTab]}
                </p>
              ) : null}

              <div className="mt-6">
                {entriesByTab[activeTab].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
                    <p className="text-sm text-slate-500">
                      Belum ada aktiviti untuk kategori ini. Tambah aktiviti anda
                      di atas.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Aktiviti</th>
                          <th className="px-3 py-2">Unit</th>
                          <th className="px-3 py-2 text-right">Jam</th>
                          <th className="px-3 py-2 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entriesByTab[activeTab].map((entry, index) => (
                          <tr
                            key={entry.id}
                            className={
                              index % 2 === 0
                                ? "bg-white"
                                : "bg-slate-50"
                            }
                          >
                            <td className="px-3 py-3 text-slate-700">
                              {entry.activity}
                            </td>
                            <td className="px-3 py-3 text-slate-700">
                              {entry.units}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-700">
                              {entry.hours.toFixed(1)}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveEntry(activeTab, entry.id)
                                }
                                className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
                              >
                                Padam
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="order-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:order-none lg:sticky lg:top-6 lg:self-start">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Ringkasan</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  totals.totalHours >= 40
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Total jam
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {totals.totalHours.toFixed(1)}
              </p>
              <p className="text-sm text-slate-500">jam / minggu</p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Sasaran 40 jam/minggu</span>
                  <span>{progressText}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Pecahan aktiviti
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {TABS.map((tab) => (
                  <li
                    key={tab}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2"
                  >
                    <span className="text-slate-600">
                      {TAB_ICONS[tab]} {tab}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {totals.breakdown[tab].toFixed(1)} jam
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        <footer className="text-center text-xs text-slate-400">
          MVP • GitHub Pages
        </footer>
      </div>
    </main>
  );
}
