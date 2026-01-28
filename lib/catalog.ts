import catalogData from "../data/bta.catalog.v1.json";

export type CatalogRawItem = {
  id: string;
  status?: string;
  sortOrder?: number;
  subCategoryId: string;
  activity: {
    code: string;
    nameMs: string;
  };
  option: {
    code: string;
    nameMs: string;
  };
  unit: {
    code: string;
    labelMs: string;
  };
  jamPerUnit: number;
  constraints?: {
    notesMs?: string;
  };
  references?: {
    doc: string;
    section: string;
    page?: string;
  }[];
  tags?: string[];
};

export type CatalogMeta = {
  version?: string;
  source?: string;
  effectiveDate?: string;
  unitBaseHoursPerWeek?: number;
  notes?: string;
};

export type CatalogRawData = {
  meta?: CatalogMeta & {
    exportedAt?: string;
    appVersion?: string;
    guidelineVersion?: string;
  };
  items: CatalogRawItem[];
  categories?: unknown;
};

export type CatalogItem = {
  id: string;
  subCategoryId: string;
  activityCode: string;
  activityName: string;
  optionCode: string;
  optionName: string;
  unitCode: string;
  unitLabel: string;
  jamPerUnit: number;
  sortOrder: number;
  constraintsNotesMs?: string;
  references: {
    doc: string;
    section: string;
    page?: string;
  }[];
  tags?: string[];
};

export type CatalogActivityOption = {
  id: string;
  optionCode: string;
  optionName: string;
  unitCode: string;
  unitLabel: string;
  jamPerUnit: number;
  sortOrder: number;
  constraintsNotesMs?: string;
  references: {
    doc: string;
    section: string;
    page?: string;
  }[];
};

export type CatalogActivity = {
  activityCode: string;
  activityName: string;
  sortOrder: number;
  options: CatalogActivityOption[];
};

export const normalizeCatalogItems = (data: CatalogRawData): CatalogItem[] =>
  data.items
    .filter((item) => item.status !== "deprecated")
    .map((item) => ({
      id: item.id,
      subCategoryId: item.subCategoryId,
      activityCode: item.activity.code,
      activityName: item.activity.nameMs,
      optionCode: item.option.code,
      optionName: item.option.nameMs,
      unitCode: item.unit.code,
      unitLabel: item.unit.labelMs,
      jamPerUnit: item.jamPerUnit,
      sortOrder: item.sortOrder ?? 0,
      constraintsNotesMs: item.constraints?.notesMs,
      references: item.references ?? [],
      tags: item.tags ?? [],
    }));

export const BASE_CATALOG_DATA = catalogData as CatalogRawData;

const normalizedCatalogItems = normalizeCatalogItems(BASE_CATALOG_DATA);

const catalogMeta = BASE_CATALOG_DATA.meta ?? null;

export const buildCatalogActivitiesBySubCategory = (items: CatalogItem[]) => {
  const catalogActivitiesBySubCategory = items.reduce<
    Record<string, CatalogActivity[]>
  >((accumulator, item) => {
    if (!accumulator[item.subCategoryId]) {
      accumulator[item.subCategoryId] = [];
    }

    const activities = accumulator[item.subCategoryId];
    let activity = activities.find(
      (candidate) => candidate.activityCode === item.activityCode
    );

    if (!activity) {
      activity = {
        activityCode: item.activityCode,
        activityName: item.activityName,
        sortOrder: item.sortOrder,
        options: [],
      };
      activities.push(activity);
    }

    activity.options.push({
      id: item.id,
      optionCode: item.optionCode,
      optionName: item.optionName,
      unitCode: item.unitCode,
      unitLabel: item.unitLabel,
      jamPerUnit: item.jamPerUnit,
      sortOrder: item.sortOrder,
      constraintsNotesMs: item.constraintsNotesMs,
      references: item.references,
    });

    activity.sortOrder = Math.min(activity.sortOrder, item.sortOrder);

    return accumulator;
  }, {});

  Object.values(catalogActivitiesBySubCategory).forEach((activities) => {
    activities.sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.activityName.localeCompare(b.activityName)
    );
    activities.forEach((activity) => {
      activity.options.sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.optionName.localeCompare(b.optionName)
      );
    });
  });

  return catalogActivitiesBySubCategory;
};

const catalogActivitiesBySubCategory = buildCatalogActivitiesBySubCategory(
  normalizedCatalogItems
);

export const getCatalogActivitiesBySubCategory = () =>
  catalogActivitiesBySubCategory;

export const getCatalogMeta = () => catalogMeta;

export const getCatalogItems = () => normalizedCatalogItems;
