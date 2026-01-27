"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getMinimumTargetGrades,
  getMinimumTargetsByCategory,
  sumMinimumTargetHours,
} from "../packages/core/src";
import { getCatalogActivitiesBySubCategory } from "../lib/catalog";

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

const TAB_SUBCATEGORIES: Record<TabKey, string> = {
  Pengajaran: "SUB_TEACH",
  Penyeliaan: "SUB_SUP",
  Penerbitan: "SUB_PUB",
  Penyelidikan: "SUB_RES",
  Persidangan: "SUB_CONF",
  Pentadbiran: "SUB_ADMIN",
  Perkhidmatan: "SUB_SVC",
};

type Entry = {
  id: string;
  activity: string;
  units: string;
  hours: number;
};

type DraftEntry = {
  activityCode: string;
  optionId: string;
  quantity: string;
};

type StoredState = {
  pathway: (typeof PATHWAYS)[number];
  grade: string;
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
    accumulator[tab] = { activityCode: "", optionId: "", quantity: "" };
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
  const grades = getMinimumTargetGrades(pathway);
  const grade = grades.includes(value.grade) ? value.grade : grades[0] ?? "";
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

  return { pathway, grade, entriesByTab: normalizedEntries };
};

export default function HomePage() {
  const [pathway, setPathway] = useState<(typeof PATHWAYS)[number]>(
    PATHWAYS[0]
  );
  const [grade, setGrade] = useState<string>(
    getMinimumTargetGrades(PATHWAYS[0])[0] ?? ""
  );
  const [activeTab, setActiveTab] = useState<TabKey>(TABS[0]);
  const [entriesByTab, setEntriesByTab] = useState(createEmptyEntries);
  const [draftsByTab, setDraftsByTab] = useState(createEmptyDrafts);
  const [errorsByTab, setErrorsByTab] = useState(createEmptyErrors);

  const catalogActivitiesBySubCategory = useMemo(
    () => getCatalogActivitiesBySubCategory(),
    []
  );

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
        setGrade(normalized.grade);
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

    const payload: StoredState = { pathway, grade, entriesByTab };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [entriesByTab, grade, pathway]);

  useEffect(() => {
    const grades = getMinimumTargetGrades(pathway);
    if (!grades.includes(grade)) {
      setGrade(grades[0] ?? "");
    }
  }, [grade, pathway]);

  const updateDraft = (tab: TabKey, updates: Partial<DraftEntry>) => {
    setDraftsByTab((current) => ({
      ...current,
      [tab]: {
        ...current[tab],
        ...updates,
      },
    }));

    setErrorsByTab((current) => ({
      ...current,
      [tab]: "",
    }));
  };

  const handleActivityChange = (tab: TabKey, activityCode: string) => {
    const subCategoryId = TAB_SUBCATEGORIES[tab];
    const activities = catalogActivitiesBySubCategory[subCategoryId] ?? [];
    const selectedActivity = activities.find(
      (activity) => activity.activityCode === activityCode
    );
    updateDraft(tab, {
      activityCode,
      optionId: selectedActivity?.options[0]?.id ?? "",
    });
  };

  const handleOptionChange = (tab: TabKey, optionId: string) => {
    updateDraft(tab, { optionId });
  };

  const handleQuantityChange = (tab: TabKey, quantity: string) => {
    updateDraft(tab, { quantity });
  };

  const handleAddEntry = (tab: TabKey) => {
    const draft = draftsByTab[tab];
    const subCategoryId = TAB_SUBCATEGORIES[tab];
    const activities = catalogActivitiesBySubCategory[subCategoryId] ?? [];
    const selectedActivity = activities.find(
      (activity) => activity.activityCode === draft.activityCode
    );
    const selectedOption = selectedActivity?.options.find(
      (option) => option.id === draft.optionId
    );
    const quantityValue = Number.parseFloat(draft.quantity);
    const totalHours = quantityValue * (selectedOption?.jamPerUnit ?? 0);

    if (!selectedActivity || !selectedOption) {
      setErrorsByTab((current) => ({
        ...current,
        [tab]: "Sila pilih aktiviti dan kategori aktiviti.",
      }));
      return;
    }

    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setErrorsByTab((current) => ({
        ...current,
        [tab]: "Kuantiti mesti lebih daripada 0.",
      }));
      return;
    }

    const newEntry: Entry = {
      id: `${tab}-${Date.now()}`,
      activity: `${selectedActivity.activityName} — ${selectedOption.optionName}`,
      units: `${quantityValue} ${selectedOption.unitLabel}`,
      hours: totalHours,
    };

    setEntriesByTab((current) => ({
      ...current,
      [tab]: [...current[tab], newEntry],
    }));

    setDraftsByTab((current) => ({
      ...current,
      [tab]: {
        ...current[tab],
        quantity: "",
      },
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

  const gradesForPathway = useMemo(
    () => getMinimumTargetGrades(pathway),
    [pathway]
  );

  const targetByCategory = useMemo(
    () => getMinimumTargetsByCategory(pathway, grade),
    [pathway, grade]
  );

  const totalTargetHours = useMemo(
    () => sumMinimumTargetHours(pathway, grade),
    [pathway, grade]
  );

  const activeSubCategoryId = TAB_SUBCATEGORIES[activeTab];
  const activitiesForActiveTab =
    catalogActivitiesBySubCategory[activeSubCategoryId] ?? [];
  const selectedActivity = activitiesForActiveTab.find(
    (activity) => activity.activityCode === draftsByTab[activeTab].activityCode
  );
  const optionsForSelectedActivity = selectedActivity?.options ?? [];
  const selectedOption = optionsForSelectedActivity.find(
    (option) => option.id === draftsByTab[activeTab].optionId
  );
  const quantityValue = Number.parseFloat(draftsByTab[activeTab].quantity);
  const normalizedQuantity = Number.isFinite(quantityValue) ? quantityValue : 0;
  const jamPerUnit = selectedOption?.jamPerUnit ?? 0;
  const unitLabel = selectedOption?.unitLabel ?? "-";
  const totalDraftHours = normalizedQuantity * jamPerUnit;

  const progressPercentage = Math.min((totals.totalHours / 40) * 100, 100);
  const statusLabel = totals.totalHours >= 40 ? "Cukup" : "Kurang";
  const progressText = `${totals.totalHours.toFixed(1)} / 40 jam`;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-100">
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
              <label
                className="text-sm font-medium text-slate-600"
                htmlFor="grade"
              >
                Grade/Role
              </label>
              <select
                id="grade"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {gradesForPathway.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-100">
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
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200 ring-1 ring-blue-500/40"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <span>{TAB_ICONS[tab]}</span>
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-800">
                {activeTab}
              </h3>
              <div className="mt-4 grid gap-3 lg:grid-cols-[2fr_2fr_1.2fr_1fr_auto]">
                <select
                  value={draftsByTab[activeTab].activityCode}
                  onChange={(event) =>
                    handleActivityChange(activeTab, event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Pilih aktiviti</option>
                  {activitiesForActiveTab.map((activity) => (
                    <option key={activity.activityCode} value={activity.activityCode}>
                      {activity.activityName}
                    </option>
                  ))}
                </select>
                <select
                  value={draftsByTab[activeTab].optionId}
                  onChange={(event) =>
                    handleOptionChange(activeTab, event.target.value)
                  }
                  disabled={!selectedActivity}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">Pilih kategori aktiviti</option>
                  {optionsForSelectedActivity.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.optionName}
                    </option>
                  ))}
                </select>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Unit
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {unitLabel}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase text-slate-400">
                    Jam/Unit
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {jamPerUnit.toFixed(1)}
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Kuantiti"
                  value={draftsByTab[activeTab].quantity}
                  onChange={(event) =>
                    handleQuantityChange(activeTab, event.target.value)
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
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Cara kira
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {normalizedQuantity} × {jamPerUnit.toFixed(1)} ={" "}
                  {totalDraftHours.toFixed(1)} jam
                </p>
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

          <aside className="order-2 rounded-xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-100 lg:order-none lg:sticky lg:top-6 lg:self-start">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Ringkasan</h2>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    totals.totalHours >= 40
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {statusLabel}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Sasaran 40 jam
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Total jam
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {totals.totalHours.toFixed(1)}
              </p>
              <p className="text-sm text-slate-500">/ 40 jam</p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Sasaran 40 jam/minggu</span>
                  <span>{progressText}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Target minimum
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {pathway} · {grade}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {totalTargetHours.toFixed(1)} / 40 jam
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {targetByCategory.map((target) => (
                  <div
                    key={target.category}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <span>
                      {TAB_ICONS[target.category as TabKey]} {target.category}
                    </span>
                    <div className="text-right text-xs font-semibold text-slate-600">
                      <div>{(target.percent * 100).toFixed(0)}%</div>
                      <div>{target.minHours.toFixed(1)} jam</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Pencapaian kategori
              </p>
              <div className="mt-3 space-y-3">
                {targetByCategory.map((target) => {
                  const actual = totals.breakdown[target.category as TabKey];
                  const progress =
                    target.minHours > 0
                      ? Math.min((actual / target.minHours) * 100, 100)
                      : 0;
                  const isMet = actual >= target.minHours;

                  return (
                    <div
                      key={target.category}
                      className="rounded-lg border border-slate-100 bg-white px-3 py-3"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">
                          {TAB_ICONS[target.category as TabKey]}{" "}
                          {target.category}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            isMet
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isMet ? "Cukup" : "Kurang"}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {actual.toFixed(1)} / {target.minHours.toFixed(1)} jam
                        </span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full ${
                            isMet ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
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
