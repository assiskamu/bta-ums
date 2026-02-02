"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  calculateWeeklyHours,
  DEFAULT_PERIOD_SETTINGS,
  getMinimumTargetGrades,
  getMinimumTargetsByCategory,
  PERIODS,
  type Period,
  type PeriodSettings,
  sumMinimumTargetHours,
} from "../../packages/core/src";
import {
  BASE_CATALOG_DATA,
  buildCatalogActivitiesBySubCategory,
  normalizeCatalogItems,
  type CatalogItem,
  type CatalogRawData,
  type CatalogActivity,
  type CatalogActivityOption,
} from "../../lib/catalog";
import { exportBtaPdf } from "../../lib/exportPdf";
import { normalizeTitleCase } from "../../lib/text";
import packageJson from "../../package.json";

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

const QUANTITY_CONFIG: Record<
  string,
  { label: string; step: number; allowDecimal: boolean }
> = {
  jam: { label: "Jumlah jam", step: 0.5, allowDecimal: true },
  pelajar: { label: "Bilangan pelajar", step: 1, allowDecimal: false },
  projek: { label: "Bilangan projek", step: 1, allowDecimal: false },
  penerbitan: { label: "Bilangan penerbitan", step: 1, allowDecimal: false },
  geran: { label: "Bilangan geran", step: 1, allowDecimal: false },
  hari: { label: "Bilangan hari", step: 1, allowDecimal: false },
  lantikan: { label: "Bilangan lantikan", step: 1, allowDecimal: false },
  kes: { label: "Bilangan kes", step: 1, allowDecimal: false },
  sesi: { label: "Bilangan sesi", step: 1, allowDecimal: false },
  "lain-lain": { label: "Bilangan unit", step: 1, allowDecimal: false },
};

const formatUnitLabel = (label: string) =>
  label
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const splitActivityLabel = (label: string) => {
  const separator = " — ";
  if (!label.includes(separator)) {
    return { activityName: label, optionName: "" };
  }
  const [activityName, optionName] = label.split(separator);
  return {
    activityName: activityName ?? label,
    optionName: optionName ?? "",
  };
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeCsv = (value: string | number | null | undefined) => {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
};

const sanitizeFilePart = (value: string) => {
  const sanitized = value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");
  return sanitized.length > 0 ? sanitized : "data";
};

const formatDateForFilename = (date: Date) =>
  date.toISOString().slice(0, 10);

const createAdminId = () => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BTA_ADMIN_${Date.now()}_${random}`;
};

const createCodeFromLabel = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildReferenceText = (
  references: { doc: string; section: string; page?: string }[]
) => {
  if (!references.length) {
    return "-";
  }
  return references
    .map(
      (reference) =>
        `${reference.doc} ${reference.section}${
          reference.page ? ` (ms ${reference.page})` : ""
        }`
    )
    .join("; ");
};

type Entry = {
  id: string;
  activity: string;
  activityName?: string;
  optionName?: string;
  optionId?: string;
  units: string;
  baseQuantity: number;
  period: Period;
  jamPerUnit?: number;
  computedWeeklyHours: number;
  hours?: number;
};

type DraftEntry = {
  activityCode: string;
  optionId: string;
  activityQuery: string;
  optionQuery: string;
  quantity: string;
};

type AdminFormState = {
  subCategoryId: string;
  activityName: string;
  optionName: string;
  unitCode: string;
  unitLabel: string;
  jamPerUnit: string;
  tags: string;
  notes: string;
  referenceDoc: string;
  referenceSection: string;
  referencePage: string;
};

type StoredState = {
  pathway: (typeof PATHWAYS)[number];
  grade: string;
  period: Period;
  periodSettings: PeriodSettings;
  entriesByTab: Record<TabKey, Entry[]>;
};

const STORAGE_KEY = "bta-ums-v1";
const ADMIN_CATALOG_STORAGE_KEY = "bta-katalog-admin-v1";
const APP_VERSION = packageJson.version ?? "0.0.0";
const UNIT_OPTIONS = [
  { code: "hour", label: "jam" },
  { code: "student", label: "pelajar" },
  { code: "project", label: "projek" },
  { code: "publication", label: "penerbitan" },
  { code: "grant", label: "geran" },
  { code: "day", label: "hari" },
  { code: "appointment", label: "lantikan" },
  { code: "case", label: "kes" },
  { code: "session", label: "sesi" },
  { code: "other", label: "lain-lain" },
];
const TAB_SORT_BASE: Record<TabKey, number> = {
  Pengajaran: 190,
  Penyeliaan: 290,
  Penerbitan: 490,
  Penyelidikan: 590,
  Persidangan: 690,
  Pentadbiran: 790,
  Perkhidmatan: 890,
};
const DEMO_SUBCATEGORY_IDS = [
  "SUB_TEACH",
  "SUB_SUP",
  "SUB_RES",
  "SUB_PUB",
  "SUB_ADMIN",
  "SUB_SVC",
  "SUB_CONF",
] as const;

type DemoSubCategoryId = (typeof DEMO_SUBCATEGORY_IDS)[number];

const createEmptyEntries = () =>
  TABS.reduce<Record<TabKey, Entry[]>>((accumulator, tab) => {
    accumulator[tab] = [];
    return accumulator;
  }, {} as Record<TabKey, Entry[]>);

const createEmptyDrafts = () =>
  TABS.reduce<Record<TabKey, DraftEntry>>((accumulator, tab) => {
    accumulator[tab] = {
      activityCode: "",
      optionId: "",
      activityQuery: "",
      optionQuery: "",
      quantity: "",
    };
    return accumulator;
  }, {} as Record<TabKey, DraftEntry>);

const createEmptyErrors = () =>
  TABS.reduce<Record<TabKey, string>>((accumulator, tab) => {
    accumulator[tab] = "";
    return accumulator;
  }, {} as Record<TabKey, string>);

const parseUnitsQuantity = (units: string) => {
  const parsed = Number.parseFloat(units);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeNumber = (value: unknown, fallback = 0) => {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getEntryWeeklyHours = (entry: {
  computedWeeklyHours?: number;
  hours?: number;
}) => normalizeNumber(entry.computedWeeklyHours ?? entry.hours ?? 0);

const getRate = (option: CatalogActivityOption | null): number =>
  option?.jamPerUnit ?? 0;

const normalizeStoredState = (value: StoredState | null): StoredState | null => {
  if (!value) {
    return null;
  }

  const pathway = PATHWAYS.includes(value.pathway)
    ? value.pathway
    : PATHWAYS[0];
  const grades = getMinimumTargetGrades(pathway);
  const grade = grades.includes(value.grade) ? value.grade : grades[0] ?? "";
  const period = PERIODS.includes(value.period) ? value.period : PERIODS[0];
  const periodSettings: PeriodSettings = {
    semesterWeeks:
      value.periodSettings?.semesterWeeks ?? DEFAULT_PERIOD_SETTINGS.semesterWeeks,
    yearWeeks: value.periodSettings?.yearWeeks ?? DEFAULT_PERIOD_SETTINGS.yearWeeks,
  };
  const normalizedEntries = createEmptyEntries();

  TABS.forEach((tab) => {
    const entries = value.entriesByTab?.[tab] ?? [];
    normalizedEntries[tab] = entries
      .filter((entry) => entry && typeof entry.activity === "string")
        .map((entry) => ({
          id: entry.id ?? `${tab}-${Date.now()}`,
          activity: (() => {
            const fallback = splitActivityLabel(entry.activity);
            const activityName = normalizeTitleCase(
              typeof entry.activityName === "string"
                ? entry.activityName
                : fallback.activityName
            );
            const optionName = normalizeTitleCase(
              typeof entry.optionName === "string"
                ? entry.optionName
                : fallback.optionName
            );
            return fallback.optionName
              ? `${activityName} — ${optionName}`
              : normalizeTitleCase(entry.activity);
          })(),
          activityName: normalizeTitleCase(
            typeof entry.activityName === "string"
              ? entry.activityName
              : splitActivityLabel(entry.activity).activityName
          ),
          optionName: normalizeTitleCase(
            typeof entry.optionName === "string"
              ? entry.optionName
              : splitActivityLabel(entry.activity).optionName
          ),
          optionId: typeof entry.optionId === "string" ? entry.optionId : undefined,
          units: entry.units ?? "-",
          baseQuantity: Number.isFinite(entry.baseQuantity)
            ? entry.baseQuantity
            : parseUnitsQuantity(entry.units ?? ""),
          period: PERIODS.includes(entry.period) ? entry.period : PERIODS[0],
          jamPerUnit: Number.isFinite(entry.jamPerUnit)
            ? entry.jamPerUnit
            : undefined,
          computedWeeklyHours: getEntryWeeklyHours(entry),
          hours: Number.isFinite(entry.hours) ? entry.hours : undefined,
        }));
  });

  return {
    pathway,
    grade,
    period,
    periodSettings,
    entriesByTab: normalizedEntries,
  };
};

export default function KalkulatorPage() {
  const [pathway, setPathway] = useState<(typeof PATHWAYS)[number]>(
    PATHWAYS[0]
  );
  const [grade, setGrade] = useState<string>(
    getMinimumTargetGrades(PATHWAYS[0])[0] ?? ""
  );
  const [period, setPeriod] = useState<Period>(PERIODS[0]);
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>(
    DEFAULT_PERIOD_SETTINGS
  );
  const [activeTab, setActiveTab] = useState<TabKey>(TABS[0]);
  const [entriesByTab, setEntriesByTab] = useState(createEmptyEntries);
  const [draftsByTab, setDraftsByTab] = useState(createEmptyDrafts);
  const [errorsByTab, setErrorsByTab] = useState(createEmptyErrors);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminCatalogData, setAdminCatalogData] =
    useState<CatalogRawData | null>(null);
  const [catalogExpandedByTab, setCatalogExpandedByTab] = useState(() =>
    TABS.reduce<Record<TabKey, boolean>>((accumulator, tab) => {
      accumulator[tab] = true;
      return accumulator;
    }, {} as Record<TabKey, boolean>)
  );
  const [catalogSearchByTab, setCatalogSearchByTab] = useState(() =>
    TABS.reduce<Record<TabKey, string>>((accumulator, tab) => {
      accumulator[tab] = "";
      return accumulator;
    }, {} as Record<TabKey, string>)
  );
  const [catalogUnitFilterByTab, setCatalogUnitFilterByTab] = useState(() =>
    TABS.reduce<Record<TabKey, string>>((accumulator, tab) => {
      accumulator[tab] = "";
      return accumulator;
    }, {} as Record<TabKey, string>)
  );
  const [hoveredInfoOptionId, setHoveredInfoOptionId] = useState<string | null>(
    null
  );
  const [pinnedInfoOptionId, setPinnedInfoOptionId] = useState<string | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const importCatalogInputRef = useRef<HTMLInputElement>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminEditingItemId, setAdminEditingItemId] = useState<string | null>(
    null
  );
  const [adminFormState, setAdminFormState] = useState<AdminFormState>({
    subCategoryId: TAB_SUBCATEGORIES[TABS[0]],
    activityName: "",
    optionName: "",
    unitCode: UNIT_OPTIONS[0]?.code ?? "hour",
    unitLabel: UNIT_OPTIONS[0]?.label ?? "jam",
    jamPerUnit: "",
    tags: "",
    notes: "",
    referenceDoc: "",
    referenceSection: "",
    referencePage: "",
  });

  const activeCatalogData = adminCatalogData ?? BASE_CATALOG_DATA;
  const catalogItems = useMemo(
    () => normalizeCatalogItems(activeCatalogData),
    [activeCatalogData]
  );
  const catalogActivitiesBySubCategory = useMemo(
    () => buildCatalogActivitiesBySubCategory(catalogItems),
    [catalogItems]
  );
  const catalogItemById = useMemo(
    () => new Map(catalogItems.map((item) => [item.id, item])),
    [catalogItems]
  );
  const catalogMeta = activeCatalogData.meta ?? null;
  const isAdminCatalogActive = Boolean(adminCatalogData);

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
        setPeriod(normalized.period);
        setPeriodSettings(normalized.periodSettings);
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

    const savedCatalog = window.localStorage.getItem(ADMIN_CATALOG_STORAGE_KEY);
    if (!savedCatalog) {
      return;
    }

    try {
      const parsed = JSON.parse(savedCatalog) as CatalogRawData;
      if (Array.isArray(parsed.items)) {
        setAdminCatalogData(parsed);
      }
    } catch (error) {
      console.error("Gagal memuatkan katalog pentadbir", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const persistAdminCatalog = (data: CatalogRawData) => {
    setAdminCatalogData(data);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        ADMIN_CATALOG_STORAGE_KEY,
        JSON.stringify(data)
      );
    }
  };

  const createEditableCatalog = () =>
    JSON.parse(
      JSON.stringify(adminCatalogData ?? BASE_CATALOG_DATA)
    ) as CatalogRawData;

  const resetAdminForm = (subCategoryId: string) => {
    setAdminFormState({
      subCategoryId,
      activityName: "",
      optionName: "",
      unitCode: UNIT_OPTIONS[0]?.code ?? "hour",
      unitLabel: UNIT_OPTIONS[0]?.label ?? "jam",
      jamPerUnit: "",
      tags: "",
      notes: "",
      referenceDoc: "",
      referenceSection: "",
      referencePage: "",
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const payload: StoredState = {
      pathway,
      grade,
      period,
      periodSettings,
      entriesByTab,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [entriesByTab, grade, pathway, period, periodSettings]);

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

  const handleActivityChange = (tab: TabKey, activityQuery: string) => {
    const normalizedQuery = activityQuery.trim().toLowerCase();
    const subCategoryId = TAB_SUBCATEGORIES[tab];
    const activities = catalogActivitiesBySubCategory[subCategoryId] ?? [];
    const selectedActivity = activities.find(
      (activity) => activity.activityName.toLowerCase() === normalizedQuery
    );
    const autoOption =
      selectedActivity && selectedActivity.options.length === 1
        ? selectedActivity.options[0]
        : null;
    updateDraft(tab, {
      activityCode: selectedActivity?.activityCode ?? "",
      activityQuery,
      optionId: autoOption?.id ?? "",
      optionQuery: autoOption?.optionName ?? "",
      quantity: "",
    });
  };

  const handleOptionChange = (tab: TabKey, optionQuery: string) => {
    const normalizedQuery = optionQuery.trim().toLowerCase();
    const subCategoryId = TAB_SUBCATEGORIES[tab];
    const activities = catalogActivitiesBySubCategory[subCategoryId] ?? [];
    const selectedActivity = activities.find(
      (activity) => activity.activityCode === draftsByTab[tab].activityCode
    );
    const selectedOption = selectedActivity?.options.find(
      (option) => option.optionName.toLowerCase() === normalizedQuery
    );
    updateDraft(tab, {
      optionId: selectedOption?.id ?? "",
      optionQuery,
      quantity: "",
    });
  };

  const handleQuantityChange = (tab: TabKey, quantity: string) => {
    updateDraft(tab, { quantity });
  };

  const handleSemesterWeeksChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    setPeriodSettings((current) => ({
      ...current,
      semesterWeeks: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
    }));
  };

  const handleYearWeeksChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    setPeriodSettings((current) => ({
      ...current,
      yearWeeks: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
    }));
  };

  const handleAddEntry = (tab: TabKey) => {
    const draft = draftsByTab[tab];
    const subCategoryId = TAB_SUBCATEGORIES[tab];
    const activities = catalogActivitiesBySubCategory[subCategoryId] ?? [];
    const selectedActivity: CatalogActivity | null =
      activities.find((activity) => activity.activityCode === draft.activityCode) ??
      null;
    const selectedOption: CatalogActivityOption | null =
      selectedActivity?.options.find((option) => option.id === draft.optionId) ??
      null;
    const quantityValue = Number.parseFloat(draft.quantity);
    const totalWeeklyHours = calculateWeeklyHours({
      quantity: quantityValue,
      jamPerUnit: getRate(selectedOption),
      period,
      settings: periodSettings,
    });
    const unitKey = selectedOption?.unitLabel.toLowerCase() ?? "";
    const quantityConfig = QUANTITY_CONFIG[unitKey] ?? {
      label: "Kuantiti",
      step: 1,
      allowDecimal: false,
    };

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

    if (!quantityConfig.allowDecimal && !Number.isInteger(quantityValue)) {
      setErrorsByTab((current) => ({
        ...current,
        [tab]: "Kuantiti mesti nombor bulat.",
      }));
      return;
    }

    if (quantityConfig.allowDecimal && !Number.isInteger(quantityValue * 2)) {
      setErrorsByTab((current) => ({
        ...current,
        [tab]: "Kuantiti mesti dalam gandaan 0.5.",
      }));
      return;
    }

    const newEntry: Entry = {
      id: `${tab}-${Date.now()}`,
      activity: `${selectedActivity.activityName} — ${selectedOption.optionName}`,
      activityName: selectedActivity.activityName,
      optionName: selectedOption.optionName,
      optionId: selectedOption.id,
      units: `${quantityValue} ${formatUnitLabel(selectedOption.unitLabel)}`,
      baseQuantity: quantityValue,
      period,
      jamPerUnit: selectedOption.jamPerUnit,
      computedWeeklyHours: totalWeeklyHours,
    };

    setEntriesByTab((current) => ({
      ...current,
      [tab]: [...current[tab], newEntry],
    }));

    setDraftsByTab((current) => ({
      ...current,
      [tab]: {
        activityCode: "",
        optionId: "",
        activityQuery: "",
        optionQuery: "",
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
      "Anda pasti mahu padam semua rekod kiraan?"
    );
    if (!confirmed) {
      return;
    }

    setEntriesByTab(createEmptyEntries());
    setDraftsByTab(createEmptyDrafts());
    setErrorsByTab(createEmptyErrors());
  };

  const handleOpenAdminAdd = (tab: TabKey) => {
    setAdminEditingItemId(null);
    resetAdminForm(TAB_SUBCATEGORIES[tab]);
    setIsAdminModalOpen(true);
  };

  const handleOpenAdminEdit = (item: CatalogItem) => {
    setAdminEditingItemId(item.id);
    setAdminFormState({
      subCategoryId: item.subCategoryId,
      activityName: item.activityName,
      optionName: item.optionName,
      unitCode: item.unitCode,
      unitLabel: item.unitLabel,
      jamPerUnit: item.jamPerUnit.toString(),
      tags: item.tags?.join(", ") ?? "",
      notes: item.constraintsNotesMs ?? "",
      referenceDoc: item.references?.[0]?.doc ?? "",
      referenceSection: item.references?.[0]?.section ?? "",
      referencePage: item.references?.[0]?.page ?? "",
    });
    setIsAdminModalOpen(true);
  };

  const handleAdminDelete = (item: CatalogItem) => {
    if (typeof window === "undefined") {
      return;
    }
    const confirmed = window.confirm(
      `Padam aktiviti "${item.activityName} — ${item.optionName}" daripada katalog?`
    );
    if (!confirmed) {
      return;
    }
    const nextCatalog = createEditableCatalog();
    nextCatalog.items = nextCatalog.items.filter((entry) => entry.id !== item.id);
    persistAdminCatalog(nextCatalog);
    showToast("Aktiviti katalog berjaya dipadam.");
  };

  const getNextSortOrder = (subCategoryId: string, items: CatalogItem[]) => {
    const tab = TABS.find((tabKey) => TAB_SUBCATEGORIES[tabKey] === subCategoryId);
    const baseOrder = tab ? TAB_SORT_BASE[tab] : 0;
    const existingOrders = items
      .filter((entry) => entry.subCategoryId === subCategoryId)
      .map((entry) => entry.sortOrder);
    const maxOrder =
      existingOrders.length > 0 ? Math.max(...existingOrders) : baseOrder;
    let nextOrder = Math.max(baseOrder, maxOrder + 10);
    while (existingOrders.includes(nextOrder)) {
      nextOrder += 10;
    }
    return nextOrder;
  };

  const handleAdminSave = () => {
    const activityName = adminFormState.activityName.trim();
    const optionName = adminFormState.optionName.trim();
    const jamPerUnit = Number.parseFloat(adminFormState.jamPerUnit);
    if (!activityName || !optionName) {
      showToast("Aktiviti dan kategori aktiviti wajib diisi.");
      return;
    }
    if (!Number.isFinite(jamPerUnit) || jamPerUnit <= 0) {
      showToast("Kadar mesti lebih daripada 0.");
      return;
    }

    const unitLabel = adminFormState.unitLabel.trim();
    const unitCode = adminFormState.unitCode.trim() || createCodeFromLabel(unitLabel);
    const tags = adminFormState.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const references =
      adminFormState.referenceDoc.trim() || adminFormState.referenceSection.trim()
        ? [
            {
              doc: adminFormState.referenceDoc.trim() || "-",
              section: adminFormState.referenceSection.trim() || "-",
              page: adminFormState.referencePage.trim() || undefined,
            },
          ]
        : [];
    const notes = adminFormState.notes.trim();
    const nextCatalog = createEditableCatalog();
    const activityCode = createCodeFromLabel(activityName) || createAdminId();
    const optionCode = createCodeFromLabel(optionName) || createAdminId();

    if (adminEditingItemId) {
      const index = nextCatalog.items.findIndex(
        (entry) => entry.id === adminEditingItemId
      );
      if (index >= 0) {
        const existing = nextCatalog.items[index];
        const shouldReorder =
          existing.subCategoryId !== adminFormState.subCategoryId;
        nextCatalog.items[index] = {
          ...existing,
          subCategoryId: adminFormState.subCategoryId,
          activity: {
            code: activityCode,
            nameMs: activityName,
          },
          option: {
            code: optionCode,
            nameMs: optionName,
          },
          unit: {
            code: unitCode,
            labelMs: unitLabel,
          },
          jamPerUnit,
          constraints: notes ? { notesMs: notes } : undefined,
          references,
          tags,
          sortOrder: shouldReorder
            ? getNextSortOrder(adminFormState.subCategoryId, catalogItems)
            : existing.sortOrder ?? getNextSortOrder(adminFormState.subCategoryId, catalogItems),
        };
      }
    } else {
      const newItemId = createAdminId();
      const sortOrder = getNextSortOrder(adminFormState.subCategoryId, catalogItems);
      nextCatalog.items.push({
        id: newItemId,
        status: "active",
        sortOrder,
        subCategoryId: adminFormState.subCategoryId,
        activity: {
          code: activityCode,
          nameMs: activityName,
        },
        option: {
          code: optionCode,
          nameMs: optionName,
        },
        unit: {
          code: unitCode,
          labelMs: unitLabel,
        },
        jamPerUnit,
        constraints: notes ? { notesMs: notes } : undefined,
        references,
        tags,
      });
    }

    persistAdminCatalog(nextCatalog);
    setIsAdminModalOpen(false);
    showToast(
      adminEditingItemId
        ? "Aktiviti katalog berjaya dikemas kini."
        : "Aktiviti katalog berjaya ditambah."
    );
  };

  const handleExportCatalog = () => {
    if (typeof window === "undefined") {
      return;
    }
    const payload: CatalogRawData = {
      ...activeCatalogData,
      meta: {
        ...activeCatalogData.meta,
        exportedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        guidelineVersion: activeCatalogData.meta?.version,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bta-katalog_${formatDateForFilename(new Date())}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    showToast("Katalog berjaya dieksport.");
  };

  const handleImportCatalog = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as CatalogRawData;
      if (!parsed || !Array.isArray(parsed.items)) {
        showToast("Fail tidak sah. Pastikan ada struktur items.");
        return;
      }
      persistAdminCatalog(parsed);
      showToast("Katalog berjaya diimport dan diaktifkan.");
    } catch (error) {
      console.error("Gagal import katalog", error);
      showToast("Gagal import katalog. Sila semak fail.");
    }
  };

  const handleRestoreCatalog = () => {
    if (typeof window === "undefined") {
      return;
    }
    const confirmed = window.confirm(
      "Pulihkan katalog asal dan padam semua perubahan pentadbir?"
    );
    if (!confirmed) {
      return;
    }
    window.localStorage.removeItem(ADMIN_CATALOG_STORAGE_KEY);
    setAdminCatalogData(null);
    showToast("Katalog asal dipulihkan.");
  };

  const totals = useMemo(() => {
    const breakdown = TABS.reduce<Record<TabKey, number>>((accumulator, tab) => {
      const tabTotal = entriesByTab[tab].reduce(
        (sum, entry) => sum + getEntryWeeklyHours(entry),
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

  const totalEntries = useMemo(
    () =>
      TABS.reduce((sum, tab) => sum + entriesByTab[tab].length, 0),
    [entriesByTab]
  );
  const hasEntries = totalEntries > 0;

  const gradesForPathway = useMemo(
    () => getMinimumTargetGrades(pathway),
    [pathway]
  );

  const targetByCategory = useMemo(
    () => getMinimumTargetsByCategory(pathway, grade),
    [pathway, grade]
  );

  const targetByTab = useMemo(
    () =>
      targetByCategory.reduce<Record<TabKey, { minHours: number }>>(
        (accumulator, target) => {
          accumulator[target.category as TabKey] = {
            minHours: target.minHours,
          };
          return accumulator;
        },
        {} as Record<TabKey, { minHours: number }>
      ),
    [targetByCategory]
  );

  const totalTargetHours = useMemo(
    () => sumMinimumTargetHours(pathway, grade),
    [pathway, grade]
  );

  const getCatalogOptionForEntry = (tab: TabKey, entry: Entry) => {
    const { activityName: fallbackActivity, optionName: fallbackOption } =
      splitActivityLabel(entry.activity);
    const storedActivityName = entry.activityName ?? fallbackActivity;
    const storedOptionName = entry.optionName ?? fallbackOption;
    const directMatch = entry.optionId
      ? catalogItemById.get(entry.optionId) ?? null
      : null;
    const subCategoryId = TAB_SUBCATEGORIES[tab];
    const activities = catalogActivitiesBySubCategory[subCategoryId] ?? [];
    const matchedActivity =
      activities.find((activity) => activity.activityName === storedActivityName) ??
      null;
    const matchedOption =
      matchedActivity?.options.find(
        (option) => option.optionName === storedOptionName
      ) ?? null;
    const option = directMatch
      ? {
          id: directMatch.id,
          optionCode: directMatch.optionCode,
          optionName: directMatch.optionName,
          unitCode: directMatch.unitCode,
          unitLabel: directMatch.unitLabel,
          jamPerUnit: directMatch.jamPerUnit,
          sortOrder: directMatch.sortOrder,
          constraintsNotesMs: directMatch.constraintsNotesMs,
          references: directMatch.references,
        }
      : matchedOption;
    const activityName = directMatch?.activityName ?? storedActivityName;
    const optionName = directMatch?.optionName ?? storedOptionName;
    const isMissing = !option;

    return { activityName, optionName, option, isMissing };
  };

  const getUnitLabelForEntry = (
    entry: Entry,
    option: CatalogActivityOption | null
  ) => {
    if (option?.unitLabel) {
      return formatUnitLabel(option.unitLabel);
    }
    const quantityText = `${entry.baseQuantity}`;
    if (entry.units.startsWith(quantityText)) {
      return entry.units.slice(quantityText.length).trim();
    }
    const parts = entry.units.split(" ");
    return parts.length > 1 ? parts.slice(1).join(" ") : entry.units;
  };

  const buildPrintHtml = (generatedAt: Date) => {
    const generatedAtText = generatedAt.toLocaleString("ms-MY");
    const targetRows = targetByCategory
      .map(
        (target) => `<tr>
          <td>${escapeHtml(target.category)}</td>
          <td class="text-right">${target.minHours.toFixed(1)}</td>
          <td class="text-right">${(target.percent * 100).toFixed(0)}%</td>
        </tr>`
      )
      .join("");

    const actualRows = targetByCategory
      .map((target) => {
        const actual = totals.breakdown[target.category as TabKey];
        const isMet = actual >= target.minHours;
        return `<tr>
          <td>${escapeHtml(target.category)}</td>
          <td class="text-right">${actual.toFixed(1)}</td>
          <td class="text-right">${target.minHours.toFixed(1)}</td>
          <td>${isMet ? "Cukup" : "Kurang"}</td>
        </tr>`;
      })
      .join("");

    const entryRows = TABS.flatMap((tab) =>
      entriesByTab[tab].map((entry) => {
        const { activityName, optionName, option, isMissing } =
          getCatalogOptionForEntry(tab, entry);
        const unitLabel = getUnitLabelForEntry(entry, option);
        const referenceText = buildReferenceText(option?.references ?? []);
        const activityText = isMissing
          ? "Item tidak ditemui dalam katalog"
          : activityName;
        const optionText = isMissing ? "-" : optionName || "-";
        return `<tr>
          <td>${escapeHtml(tab)}</td>
          <td>${escapeHtml(activityText)}</td>
          <td>${escapeHtml(optionText)}</td>
          <td class="text-right">${escapeHtml(
            `${entry.baseQuantity} ${unitLabel}`
          )}</td>
          <td class="text-right">${
            entry.jamPerUnit != null ? entry.jamPerUnit.toFixed(1) : "-"
          }</td>
          <td>${escapeHtml(entry.period)}</td>
          <td class="text-right">${getEntryWeeklyHours(entry).toFixed(1)}</td>
          <td>${escapeHtml(referenceText)}</td>
        </tr>`;
      })
    ).join("");

    return `<!doctype html>
      <html lang="ms">
        <head>
          <meta charset="utf-8" />
          <title>Laporan BTA UMS</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            h2 { font-size: 14px; margin: 20px 0 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #cbd5f5; padding: 6px 8px; vertical-align: top; }
            th { background: #f1f5f9; text-align: left; }
            .meta { margin-top: 8px; }
            .meta div { margin-bottom: 4px; }
            .text-right { text-align: right; }
            tr { page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>Laporan BTA UMS</h1>
          <div class="meta">
            <div><strong>Laluan, Gred/Jawatan:</strong> ${escapeHtml(
              `${pathway} · ${grade}`
            )}</div>
            <div><strong>Tempoh:</strong> ${escapeHtml(period)}</div>
            <div><strong>Tarikh/Capaian masa:</strong> ${escapeHtml(
              generatedAtText
            )}</div>
            <div><strong>Jumlah Jam/Minggu:</strong> ${totals.totalHours.toFixed(
              1
            )}</div>
          </div>

          <h2>Sasaran Minimum</h2>
          <table>
            <thead>
              <tr>
                <th>Kategori</th>
                <th class="text-right">Sasaran (jam/minggu)</th>
                <th class="text-right">Peratus</th>
              </tr>
            </thead>
            <tbody>${targetRows}</tbody>
          </table>

          <h2>Pencapaian vs Sasaran</h2>
          <table>
            <thead>
              <tr>
                <th>Kategori</th>
                <th class="text-right">Jam/minggu</th>
                <th class="text-right">Sasaran</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${actualRows}</tbody>
          </table>

          <h2>Senarai Aktiviti</h2>
          <table>
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Aktiviti</th>
                <th>Kategori Aktiviti</th>
                <th class="text-right">Kuantiti</th>
                <th class="text-right">Kadar (jam/unit)</th>
                <th>Tempoh</th>
                <th class="text-right">Jam/minggu</th>
                <th>Rujukan</th>
              </tr>
            </thead>
            <tbody>${entryRows}</tbody>
          </table>
        </body>
      </html>`;
  };

  const handlePrintReport = () => {
    if (!hasEntries || typeof window === "undefined") {
      return;
    }
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      showToast("Pop-up disekat. Sila benarkan untuk mencetak laporan.");
      return;
    }
    const generatedAt = new Date();
    const html = buildPrintHtml(generatedAt);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  const handleExportCsv = () => {
    if (!hasEntries || typeof window === "undefined") {
      return;
    }
    const generatedAt = new Date();
    const generatedAtText = generatedAt.toISOString();
    const headers = [
      "laluan",
      "gredJawatan",
      "modTempoh",
      "dijanaPada",
      "kategori",
      "aktiviti",
      "kategoriAktiviti",
      "kuantiti",
      "unit",
      "kadarJamPerUnit",
      "tempoh",
      "jamMinggu",
      "rujukanDokumen",
      "rujukanSeksyen",
      "rujukanMukaSurat",
    ];
    const rows = TABS.flatMap((tab) =>
      entriesByTab[tab].map((entry) => {
        const { activityName, optionName, option, isMissing } =
          getCatalogOptionForEntry(tab, entry);
        const unitLabel = getUnitLabelForEntry(entry, option);
        const reference = option?.references?.[0] ?? null;
        return [
          pathway,
          grade,
          period,
          generatedAtText,
          tab,
          isMissing ? "Item tidak ditemui dalam katalog" : activityName,
          isMissing ? "" : optionName,
          entry.baseQuantity,
          unitLabel,
          entry.jamPerUnit ?? "",
          entry.period,
          getEntryWeeklyHours(entry).toFixed(1),
          reference?.doc ?? "",
          reference?.section ?? "",
          reference?.page ?? "",
        ];
      })
    );
    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\r\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `bta-ums_${sanitizeFilePart(
      pathway
    )}_${sanitizeFilePart(grade)}_${formatDateForFilename(generatedAt)}.csv`;
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
    showToast("CSV berjaya dieksport.");
  };

  const handleExportPdf = async () => {
    if (!hasEntries || typeof window === "undefined") {
      return;
    }

    const generatedAt = new Date();
    const entriesForPdf = TABS.flatMap((tab) =>
      entriesByTab[tab].map((entry) => {
        const { activityName, optionName, option, isMissing } =
          getCatalogOptionForEntry(tab, entry);
        const unitLabel = getUnitLabelForEntry(entry, option);
        const referenceText = buildReferenceText(option?.references ?? []);

        return {
          category: tab,
          activity: isMissing
            ? "Item tidak ditemui dalam katalog"
            : activityName,
          activityCategory: isMissing ? "-" : optionName || "-",
          quantity: entry.baseQuantity,
          unit: unitLabel,
          rate: entry.jamPerUnit ?? null,
          period: entry.period,
          weeklyHours: getEntryWeeklyHours(entry),
          reference: referenceText,
        };
      })
    );

    try {
      await exportBtaPdf({
        pathway,
        gradeRole: grade,
        periodMode: period,
        generatedAt,
        totals: { totalWeeklyHours: totals.totalHours },
        targetMinimum: targetByCategory.map((target) => ({
          category: target.category,
          percent: target.percent,
          hours: target.minHours,
        })),
        actualBreakdown: targetByCategory.map((target) => ({
          category: target.category,
          actualWeeklyHours: totals.breakdown[target.category as TabKey] ?? 0,
        })),
        entries: entriesForPdf,
        guidelineVersion: catalogMeta?.version ?? "-",
      });
      showToast("PDF berjaya dieksport.");
    } catch (error) {
      console.error("Failed to export PDF", error);
      showToast("Gagal eksport PDF. Sila cuba lagi.");
    }
  };

  const buildDemoEntry = (subCategoryId: DemoSubCategoryId, tab: TabKey) => {
    const activities = catalogActivitiesBySubCategory[subCategoryId] ?? [];
    const selectedActivity: CatalogActivity | null = activities[0] ?? null;
    const selectedOption: CatalogActivityOption | null =
      selectedActivity?.options[0] ?? null;

    if (!selectedActivity || !selectedOption) {
      return null;
    }

    const quantityValue = selectedOption.unitCode === "hour" ? 2 : 1;
    const totalWeeklyHours = calculateWeeklyHours({
      quantity: quantityValue,
      jamPerUnit: getRate(selectedOption),
      period,
      settings: periodSettings,
    });

    return {
      id: `${tab}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      activity: `${selectedActivity.activityName} — ${selectedOption.optionName}`,
      activityName: selectedActivity.activityName,
      optionName: selectedOption.optionName,
      optionId: selectedOption.id,
      units: `${quantityValue} ${formatUnitLabel(selectedOption.unitLabel)}`,
      baseQuantity: quantityValue,
      period,
      jamPerUnit: selectedOption.jamPerUnit,
      computedWeeklyHours: totalWeeklyHours,
    } satisfies Entry;
  };

  const handleAddDemoEntries = () => {
    const subCategoryTabs = DEMO_SUBCATEGORY_IDS.map((subCategoryId) => ({
      subCategoryId,
      tab:
        TABS.find((tabKey) => TAB_SUBCATEGORIES[tabKey] === subCategoryId) ??
        null,
    })).filter(
      (
        entry
      ): entry is { subCategoryId: DemoSubCategoryId; tab: TabKey } =>
        entry.tab !== null
    );

    const orderedTabs = [
      ...subCategoryTabs.filter(({ tab }) => targetByTab[tab]),
      ...subCategoryTabs.filter(({ tab }) => !targetByTab[tab]),
    ];

    setEntriesByTab((current) => {
      const next = { ...current };
      orderedTabs.forEach(({ subCategoryId, tab }) => {
        const demoEntry = buildDemoEntry(subCategoryId, tab);
        if (demoEntry) {
          next[tab] = [...next[tab], demoEntry];
        }
      });
      return next;
    });
    setErrorsByTab((current) => {
      const next = { ...current };
      orderedTabs.forEach(({ tab }) => {
        next[tab] = "";
      });
      return next;
    });

    showToast("Contoh dimasukkan — sila ubah ikut situasi sebenar.");
  };

  const activeSubCategoryId = TAB_SUBCATEGORIES[activeTab];
  const activitiesForActiveTab =
    catalogActivitiesBySubCategory[activeSubCategoryId] ?? [];
  const selectedActivity: CatalogActivity | null =
    activitiesForActiveTab.find(
      (activity) => activity.activityCode === draftsByTab[activeTab].activityCode
    ) ?? null;
  const optionsForSelectedActivity = selectedActivity?.options ?? [];
  const selectedOption: CatalogActivityOption | null =
    optionsForSelectedActivity.find(
      (option) => option.id === draftsByTab[activeTab].optionId
    ) ?? null;
  const selectedOptionReferences = selectedOption?.references ?? [];
  const selectedOptionNotes = selectedOption?.constraintsNotesMs ?? "";
  const selectedOptionHasInfo =
    selectedOptionReferences.length > 0 || Boolean(selectedOptionNotes);
  const catalogRowsForActiveTab = useMemo(() => {
    const subCategoryId = TAB_SUBCATEGORIES[activeTab];
    return catalogItems
      .filter((item) => item.subCategoryId === subCategoryId)
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.activityName.localeCompare(b.activityName) ||
          a.optionName.localeCompare(b.optionName)
      );
  }, [activeTab, catalogItems]);
  const catalogUnitOptionsForActiveTab = useMemo(() => {
    const units = Array.from(
      new Set(catalogRowsForActiveTab.map((item) => item.unitLabel))
    );
    return units.sort((a, b) => a.localeCompare(b));
  }, [catalogRowsForActiveTab]);
  const catalogSearchValue = catalogSearchByTab[activeTab];
  const catalogUnitFilter = catalogUnitFilterByTab[activeTab];
  const filteredCatalogRowsForActiveTab = useMemo(() => {
    const search = catalogSearchValue.trim().toLowerCase();
    return catalogRowsForActiveTab.filter((item) => {
      if (catalogUnitFilter && item.unitLabel !== catalogUnitFilter) {
        return false;
      }
      if (!search) {
        return true;
      }
      const referenceText = buildReferenceText(item.references);
      const haystack = `${item.activityName} ${item.optionName} ${item.unitLabel} ${item.jamPerUnit} ${referenceText}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [catalogRowsForActiveTab, catalogSearchValue, catalogUnitFilter]);
  const quantityValue = Number.parseFloat(draftsByTab[activeTab].quantity);
  const normalizedQuantity = Number.isFinite(quantityValue) ? quantityValue : 0;
  const jamPerUnit = getRate(selectedOption);
  const unitLabel = selectedOption?.unitLabel ?? "-";
  const formattedUnitLabel = unitLabel !== "-" ? formatUnitLabel(unitLabel) : "-";
  const unitKey = unitLabel.toLowerCase();
  const quantityConfig = QUANTITY_CONFIG[unitKey] ?? {
    label: "Kuantiti",
    step: 1,
    allowDecimal: false,
  };
  const isQuantityPositive = Number.isFinite(quantityValue) && quantityValue > 0;
  const isQuantityStepValid = quantityConfig.allowDecimal
    ? Number.isInteger(quantityValue * 2)
    : Number.isInteger(quantityValue);
  const isQuantityValid = isQuantityPositive && isQuantityStepValid;
  const totalDraftWeeklyHours = calculateWeeklyHours({
    quantity: normalizedQuantity,
    jamPerUnit,
    period,
    settings: periodSettings,
  });
  const periodDivider =
    period === "Semester"
      ? periodSettings.semesterWeeks
      : period === "Tahunan"
        ? periodSettings.yearWeeks
        : 1;
  const calculationText =
    period === "Mingguan"
      ? `${normalizedQuantity} × ${jamPerUnit.toFixed(1)} = ${totalDraftWeeklyHours.toFixed(1)} jam/minggu`
      : `${normalizedQuantity} × ${jamPerUnit.toFixed(1)} ÷ ${periodDivider} = ${totalDraftWeeklyHours.toFixed(1)} jam/minggu`;
  const rateText =
    selectedOption
      ? `${jamPerUnit.toFixed(1)} jam / ${formattedUnitLabel}`
      : "0.0 jam / -";

  useEffect(() => {
    if (selectedOption) {
      quantityInputRef.current?.focus();
    }
  }, [activeTab, selectedOption]);

  useEffect(() => {
    setPinnedInfoOptionId(null);
    setHoveredInfoOptionId(null);
  }, [activeTab, selectedOption?.id]);

  const progressPercentage = Math.min((totals.totalHours / 40) * 100, 100);
  const statusLabel = totals.totalHours >= 40 ? "Cukup" : "Kurang";
  const progressText = `${totals.totalHours.toFixed(1)} / 40 jam`;
  const activeInfoOptionId = hoveredInfoOptionId ?? pinnedInfoOptionId;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
        {toastMessage ? (
          <div className="fixed right-6 top-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
            {toastMessage}
          </div>
        ) : null}
        <header className="glass-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                Kalkulator BTA UMS
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Pilih laluan dan tambah rekod mengikut kategori.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label
                className="text-sm font-medium text-slate-600"
                htmlFor="pathway"
              >
                Laluan
              </label>
              <select
                id="pathway"
                value={pathway}
                onChange={(event) =>
                  setPathway(event.target.value as (typeof PATHWAYS)[number])
                }
                className="w-44 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
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
                Gred/Jawatan
              </label>
              <select
                id="grade"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="w-56 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
              >
                {gradesForPathway.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <label
                className="text-sm font-medium text-slate-600"
                htmlFor="period"
              >
                Tempoh
              </label>
              <select
                id="period"
                value={period}
                onChange={(event) => setPeriod(event.target.value as Period)}
                className="w-40 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
              >
                {PERIODS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <label
                className="text-sm font-medium text-slate-600"
                htmlFor="semester-weeks"
              >
                Semester (minggu)
              </label>
              <input
                id="semester-weeks"
                type="number"
                min="1"
                value={periodSettings.semesterWeeks}
                onChange={(event) =>
                  handleSemesterWeeksChange(event.target.value)
                }
                className="w-24 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
              />
              <label
                className="text-sm font-medium text-slate-600"
                htmlFor="year-weeks"
              >
                Tahunan (minggu)
              </label>
              <input
                id="year-weeks"
                type="number"
                min="1"
                value={periodSettings.yearWeeks}
                onChange={(event) => handleYearWeeksChange(event.target.value)}
                className="w-24 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddDemoEntries}
                className="btn-secondary px-3 py-2 text-xs sm:text-sm"
              >
                Tambah Contoh
              </button>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={isAdminMode}
                  onChange={(event) => setIsAdminMode(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Mod Pentadbir
              </label>
              {isAdminCatalogActive ? (
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Katalog pentadbir sedang aktif
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
          <span className="font-semibold">Lompat Pantas:</span>
          <a href="#ringkasan" className="btn-secondary px-3 py-1 text-xs">
            Ringkasan
          </a>
          <a href="#katalog" className="btn-secondary px-3 py-1 text-xs">
            Katalog
          </a>
          <a href="#rekod" className="btn-secondary px-3 py-1 text-xs">
            Rekod Kiraan
          </a>
        </div>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="glass-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Kategori Aktiviti
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Tambah rekod kiraan mengikut tab di bawah.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetAll}
                className="btn-danger px-4 py-2 text-sm"
              >
                Reset Semua
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200 ring-1 ring-blue-500/40"
                      : "border border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                  }`}
                >
                  <span>{TAB_ICONS[tab]}</span>
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-6">
              <section id="katalog" className="glass-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                      Katalog Aktiviti (Rujukan)
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      Rujukan kadar rasmi sebelum menambah rekod kiraan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCatalogExpandedByTab((current) => ({
                        ...current,
                        [activeTab]: !current[activeTab],
                      }))
                    }
                    className="btn-secondary px-3 py-1 text-xs"
                  >
                    {catalogExpandedByTab[activeTab] ? "Lipat" : "Kembang"}
                  </button>
                </div>
                {catalogExpandedByTab[activeTab] ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={catalogSearchByTab[activeTab]}
                        onChange={(event) =>
                          setCatalogSearchByTab((current) => ({
                            ...current,
                            [activeTab]: event.target.value,
                          }))
                        }
                        placeholder="Cari aktiviti, kategori, unit atau rujukan"
                        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                      />
                      <select
                        value={catalogUnitFilterByTab[activeTab]}
                        onChange={(event) =>
                          setCatalogUnitFilterByTab((current) => ({
                            ...current,
                            [activeTab]: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                      >
                        <option value="">Semua unit</option>
                        {catalogUnitOptionsForActiveTab.map((unit) => (
                          <option key={unit} value={unit}>
                            {formatUnitLabel(unit)}
                          </option>
                        ))}
                      </select>
                      {isAdminMode ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenAdminAdd(activeTab)}
                            className="btn-primary px-3 py-2 text-xs"
                          >
                            Tambah Aktiviti
                          </button>
                          <button
                            type="button"
                            onClick={handleExportCatalog}
                            className="btn-secondary px-3 py-2 text-xs"
                          >
                            Eksport Katalog (JSON)
                          </button>
                          <button
                            type="button"
                            onClick={() => importCatalogInputRef.current?.click()}
                            className="btn-secondary px-3 py-2 text-xs"
                          >
                            Import Katalog (JSON)
                          </button>
                          <button
                            type="button"
                            onClick={handleRestoreCatalog}
                            className="btn-danger px-3 py-2 text-xs"
                          >
                            Pulihkan Katalog Asal
                          </button>
                          <input
                            ref={importCatalogInputRef}
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                handleImportCatalog(file);
                              }
                              if (event.target) {
                                event.target.value = "";
                              }
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                    {filteredCatalogRowsForActiveTab.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
                        <p className="text-sm text-slate-500">
                          Tiada rekod katalog sepadan dengan carian ini.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Aktiviti</th>
                              <th className="px-3 py-2">Kategori Aktiviti</th>
                              <th className="px-3 py-2">Unit</th>
                              <th className="px-3 py-2 text-right">
                                Kadar (jam/unit)
                              </th>
                              <th className="px-3 py-2">Rujukan</th>
                              {isAdminMode ? (
                                <th className="px-3 py-2 text-right">Tindakan</th>
                              ) : null}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredCatalogRowsForActiveTab.map((item, index) => (
                              <tr
                                key={item.id}
                                className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                              >
                                <td className="px-3 py-3 text-slate-700">
                                  {item.activityName}
                                </td>
                                <td className="px-3 py-3 text-slate-700">
                                  {item.optionName}
                                </td>
                                <td className="px-3 py-3 text-slate-700">
                                  {formatUnitLabel(item.unitLabel)}
                                </td>
                                <td className="px-3 py-3 text-right text-slate-700">
                                  {item.jamPerUnit.toFixed(1)}
                                </td>
                                <td className="px-3 py-3 text-slate-600">
                                  {buildReferenceText(item.references)}
                                </td>
                                {isAdminMode ? (
                                  <td className="px-3 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAdminEdit(item)}
                                        className="btn-secondary px-3 py-1 text-xs"
                                      >
                                        Sunting
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAdminDelete(item)}
                                        className="btn-danger px-3 py-1 text-xs"
                                      >
                                        Padam
                                      </button>
                                    </div>
                                  </td>
                                ) : null}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </section>

              <section id="rekod" className="glass-card p-4">
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                  Rekod Kiraan
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  {activeTab}
                </p>
                <div className="mt-4 grid gap-3 lg:grid-cols-[2fr_2fr_1.2fr_1fr_auto]">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-400">
                      Aktiviti
                    </label>
                    <input
                      list={`activity-list-${activeTab}`}
                      value={draftsByTab[activeTab].activityQuery}
                      onChange={(event) =>
                        handleActivityChange(activeTab, event.target.value)
                      }
                      placeholder="Cari aktiviti"
                      className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                    />
                    <datalist id={`activity-list-${activeTab}`}>
                      {activitiesForActiveTab.map((activity) => (
                        <option key={activity.activityCode} value={activity.activityName} />
                      ))}
                    </datalist>
                  </div>
                  <div className="relative flex items-start gap-2">
                    <div className="flex w-full flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-400">
                        Kategori Aktiviti
                      </label>
                      <input
                        list={`option-list-${activeTab}`}
                        value={draftsByTab[activeTab].optionQuery}
                        onChange={(event) =>
                          handleOptionChange(activeTab, event.target.value)
                        }
                        disabled={!selectedActivity}
                        placeholder="Cari kategori aktiviti"
                        className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/70"
                      />
                      <datalist id={`option-list-${activeTab}`}>
                        {optionsForSelectedActivity.map((option) => (
                          <option key={option.id} value={option.optionName} />
                        ))}
                      </datalist>
                    </div>
                    {selectedOption && selectedOptionHasInfo ? (
                      <div
                        className="relative flex items-start"
                        onMouseEnter={() =>
                          setHoveredInfoOptionId(selectedOption.id)
                        }
                        onMouseLeave={() => setHoveredInfoOptionId(null)}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setPinnedInfoOptionId((current) =>
                              current === selectedOption.id
                                ? null
                                : selectedOption.id
                            )
                          }
                          className="mt-6 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-500 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                          aria-label="Maklumat rujukan"
                        >
                          ⓘ
                        </button>
                        {activeInfoOptionId === selectedOption.id ? (
                          <div className="absolute right-0 top-10 z-10 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                            <p className="text-[11px] font-semibold text-slate-400">
                              Rujukan
                            </p>
                            <ul className="mt-2 space-y-1">
                              {selectedOptionReferences.map((reference, index) => (
                                <li key={`${reference.doc}-${index}`}>
                                  Rujukan: {reference.doc} – {reference.section}
                                  {reference.page ? ` (ms ${reference.page})` : ""}
                                </li>
                              ))}
                            </ul>
                            {selectedOptionNotes ? (
                              <p className="mt-3 text-xs text-slate-500">
                                {selectedOptionNotes}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-300">
                      Unit
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-white">
                      {formattedUnitLabel}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-300">
                      Kadar
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-white">
                      {rateText}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={`quantity-${activeTab}`}
                      className="text-xs font-semibold text-slate-400"
                    >
                      {quantityConfig.label}
                    </label>
                    <input
                      ref={quantityInputRef}
                      id={`quantity-${activeTab}`}
                      type="number"
                      min="0"
                      step={quantityConfig.step}
                      placeholder={quantityConfig.label}
                      value={draftsByTab[activeTab].quantity}
                      onChange={(event) =>
                        handleQuantityChange(activeTab, event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddEntry(activeTab)}
                    disabled={!selectedOption || !isQuantityValid}
                    className="btn-primary px-5 py-2 text-sm disabled:opacity-60"
                  >
                    Tambah
                  </button>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-300">
                    Cara kira
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-white">
                    {calculationText}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Tempoh: {period}
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
                        Belum ada rekod untuk kategori ini. Tambah rekod kiraan
                        anda di atas.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Aktiviti</th>
                            <th className="px-3 py-2">Unit</th>
                            <th className="px-3 py-2 text-right">
                              Jam/minggu (dikira)
                            </th>
                            <th className="px-3 py-2 text-right">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {entriesByTab[activeTab].map((entry, index) => {
                            const catalogInfo = getCatalogOptionForEntry(
                              activeTab,
                              entry
                            );
                            const activityLabel = catalogInfo.isMissing
                              ? "Item tidak ditemui dalam katalog"
                              : entry.activity;
                            return (
                              <tr
                                key={entry.id}
                                className={
                                  index % 2 === 0 ? "bg-white" : "bg-slate-50"
                                }
                              >
                                <td className="px-3 py-3 text-slate-700">
                                  {activityLabel}
                                </td>
                                <td className="px-3 py-3 text-slate-700">
                                  <div>{entry.units}</div>
                                  <div className="text-xs text-slate-400">
                                    Tempoh: {entry.period}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-right text-slate-700">
                                  {getEntryWeeklyHours(entry).toFixed(1)}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveEntry(activeTab, entry.id)
                                    }
                                    className="btn-danger px-3 py-1 text-xs"
                                  >
                                    Padam
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          <aside
            id="ringkasan"
            className="glass-card order-2 p-6 lg:order-none lg:sticky lg:top-6 lg:self-start"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Ringkasan
              </h2>
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
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintReport}
                disabled={!hasEntries}
                className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
              >
                Cetak
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!hasEntries}
                className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
              >
                Eksport CSV
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!hasEntries}
                className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
              >
                Eksport PDF
              </button>
            </div>
            {!hasEntries ? (
              <p className="mt-2 text-xs text-slate-400">
                Tiada data untuk dieksport.
              </p>
            ) : null}

            <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                Jumlah jam
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                {totals.totalHours.toFixed(1)}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                / 40 jam
              </p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                  <span>Sasaran 40 jam/minggu</span>
                  <span>{progressText}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700/70">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                    Sasaran minimum
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                    {pathway} · {grade}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {totalTargetHours.toFixed(1)} / 40 jam
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-200">
                {targetByCategory.map((target) => (
                  <div
                    key={target.category}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70"
                  >
                    <span>
                      {TAB_ICONS[target.category as TabKey]} {target.category}
                    </span>
                    <div className="text-right text-xs font-semibold text-slate-600 dark:text-slate-200">
                      <div>{(target.percent * 100).toFixed(0)}%</div>
                      <div>{target.minHours.toFixed(1)} jam</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-300">
                Sasaran berdasarkan Garis Panduan BTA UMS (40 jam/minggu).
              </p>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
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
                      className="rounded-lg border border-slate-100 bg-white/70 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-200">
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
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                        <span>
                          {actual.toFixed(1)} / {target.minHours.toFixed(1)} jam
                        </span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700/70">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${
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
              <p className="text-xs font-semibold text-slate-500">
                Pecahan aktiviti
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {TABS.map((tab) => {
                  const actualHours = totals.breakdown[tab];
                  const targetHours = targetByTab[tab]?.minHours ?? 0;
                  const isMet = actualHours >= targetHours;

                  return (
                    <li
                      key={tab}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2"
                    >
                      <span className="text-slate-600">
                        {TAB_ICONS[tab]} {tab}
                      </span>
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                          {actualHours.toFixed(1)} / {targetHours.toFixed(1)}{" "}
                          jam
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 ${
                            isMet
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isMet ? "Cukup" : "Kurang"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </section>

        {isAdminModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {adminEditingItemId ? "Sunting Aktiviti Katalog" : "Tambah Aktiviti Katalog"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                >
                  Batal
                </button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">
                    Kategori
                  </label>
                  <select
                    value={adminFormState.subCategoryId}
                    onChange={(event) =>
                      setAdminFormState((current) => ({
                        ...current,
                        subCategoryId: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  >
                    {TABS.map((tab) => (
                      <option key={tab} value={TAB_SUBCATEGORIES[tab]}>
                        {tab}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">
                    Aktiviti
                  </label>
                  <input
                    type="text"
                    value={adminFormState.activityName}
                    onChange={(event) =>
                      setAdminFormState((current) => ({
                        ...current,
                        activityName: event.target.value,
                      }))
                    }
                    placeholder="Nama aktiviti"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">
                    Kategori Aktiviti
                  </label>
                  <input
                    type="text"
                    value={adminFormState.optionName}
                    onChange={(event) =>
                      setAdminFormState((current) => ({
                        ...current,
                        optionName: event.target.value,
                      }))
                    }
                    placeholder="Nama kategori aktiviti"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">
                    Unit
                  </label>
                  <select
                    value={adminFormState.unitCode}
                    onChange={(event) => {
                      const selected = UNIT_OPTIONS.find(
                        (unit) => unit.code === event.target.value
                      );
                      setAdminFormState((current) => ({
                        ...current,
                        unitCode: event.target.value,
                        unitLabel: selected?.label ?? current.unitLabel,
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  >
                    {!UNIT_OPTIONS.some(
                      (unit) => unit.code === adminFormState.unitCode
                    ) ? (
                      <option value={adminFormState.unitCode}>
                        {adminFormState.unitLabel}
                      </option>
                    ) : null}
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit.code} value={unit.code}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">
                    Kadar (jam per unit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={adminFormState.jamPerUnit}
                    onChange={(event) =>
                      setAdminFormState((current) => ({
                        ...current,
                        jamPerUnit: event.target.value,
                      }))
                    }
                    placeholder="Contoh: 1.5"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">
                    Label (pilihan)
                  </label>
                  <input
                    type="text"
                    value={adminFormState.tags}
                    onChange={(event) =>
                      setAdminFormState((current) => ({
                        ...current,
                        tags: event.target.value,
                      }))
                    }
                    placeholder="Contoh: pengajaran, kelas"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">
                    Nota (pilihan)
                  </label>
                  <textarea
                    value={adminFormState.notes}
                    onChange={(event) =>
                      setAdminFormState((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Catatan tambahan untuk pentadbir"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">
                    Dokumen rujukan
                  </label>
                  <input
                    type="text"
                    value={adminFormState.referenceDoc}
                    onChange={(event) =>
                      setAdminFormState((current) => ({
                        ...current,
                        referenceDoc: event.target.value,
                      }))
                    }
                    placeholder="Contoh: Garis Panduan"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">
                    Seksyen rujukan
                  </label>
                  <input
                    type="text"
                    value={adminFormState.referenceSection}
                    onChange={(event) =>
                      setAdminFormState((current) => ({
                        ...current,
                        referenceSection: event.target.value,
                      }))
                    }
                    placeholder="Contoh: 1.2 Pengajaran"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">
                    Muka surat (pilihan)
                  </label>
                  <input
                    type="text"
                    value={adminFormState.referencePage}
                    onChange={(event) =>
                      setAdminFormState((current) => ({
                        ...current,
                        referencePage: event.target.value,
                      }))
                    }
                    placeholder="Contoh: 12"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAdminSave}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
  );
}
