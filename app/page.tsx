"use client";

import { useMemo, useState } from "react";

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

export default function HomePage() {
  const [pathway, setPathway] = useState<(typeof PATHWAYS)[number]>("Guru");
  const [activeTab, setActiveTab] = useState<TabKey>(TABS[0]);
  const [entriesByTab, setEntriesByTab] = useState(createEmptyEntries);
  const [draftsByTab, setDraftsByTab] = useState(createEmptyDrafts);

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
  };

  const handleAddEntry = (tab: TabKey) => {
    const draft = draftsByTab[tab];
    const hoursValue = Number.parseFloat(draft.hours);

    if (!draft.activity.trim() && !draft.units.trim() && !draft.hours.trim()) {
      return;
    }

    const newEntry: Entry = {
      id: `${tab}-${Date.now()}`,
      activity: draft.activity.trim() || "(Aktiviti)",
      units: draft.units.trim() || "-",
      hours: Number.isFinite(hoursValue) ? hoursValue : 0,
    };

    setEntriesByTab((current) => ({
      ...current,
      [tab]: [...current[tab], newEntry],
    }));

    setDraftsByTab((current) => ({
      ...current,
      [tab]: { activity: "", units: "", hours: "" },
    }));
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

  const progressText = `${totals.totalHours.toFixed(1)} / 40 jam`;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">BTA UMS Calculator</h1>
        <p className="text-sm text-slate-600">
          Pilih laluan dan tambah aktiviti mengikut kategori.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-slate-700" htmlFor="pathway">
          Pathway
        </label>
        <select
          id="pathway"
          value={pathway}
          onChange={(event) =>
            setPathway(event.target.value as (typeof PATHWAYS)[number])
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {PATHWAYS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                activeTab === tab
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">
              {activeTab}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <input
                type="text"
                placeholder="Nama aktiviti"
                value={draftsByTab[activeTab].activity}
                onChange={(event) =>
                  handleDraftChange(activeTab, "activity", event.target.value)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Unit"
                value={draftsByTab[activeTab].units}
                onChange={(event) =>
                  handleDraftChange(activeTab, "units", event.target.value)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => handleAddEntry(activeTab)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Add
              </button>
            </div>

            <div className="mt-6">
              {entriesByTab[activeTab].length === 0 ? (
                <p className="text-sm text-slate-500">
                  Belum ada aktiviti ditambah.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-2">Aktiviti</th>
                        <th className="py-2">Unit</th>
                        <th className="py-2">Jam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entriesByTab[activeTab].map((entry) => (
                        <tr key={entry.id} className="border-b border-slate-100">
                          <td className="py-2 text-slate-700">{entry.activity}</td>
                          <td className="py-2 text-slate-700">{entry.units}</td>
                          <td className="py-2 text-slate-700">
                            {entry.hours.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Ringkasan</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Total jam</span>
                <span className="font-semibold">
                  {totals.totalHours.toFixed(1)} jam
                </span>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Breakdown
                </p>
                <ul className="mt-2 space-y-2">
                  {TABS.map((tab) => (
                    <li key={tab} className="flex justify-between">
                      <span>{tab}</span>
                      <span>{totals.breakdown[tab].toFixed(1)} jam</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm">
                <p className="text-slate-600">Sasaran 40 jam/minggu</p>
                <p className="text-lg font-semibold text-blue-700">
                  {progressText}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
