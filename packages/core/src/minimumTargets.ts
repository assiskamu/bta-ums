import minimumTargets from "../../../data/btaMinimumTargets.json";

type MinimumTargetEntry = {
  percent: number;
  minHours: number;
};

type MinimumTargetsData = {
  categories: string[];
  targets: Record<string, Record<string, Record<string, MinimumTargetEntry>>>;
};

const data = minimumTargets as MinimumTargetsData;

export const minimumTargetCategories = data.categories;

export const getMinimumTargetPathways = () => Object.keys(data.targets);

export const getMinimumTargetGrades = (pathway: string) =>
  Object.keys(data.targets[pathway] ?? {});

export const getMinimumTargetsFor = (pathway: string, grade: string) =>
  data.targets[pathway]?.[grade] ?? null;

export const getMinimumTargetsByCategory = (
  pathway: string,
  grade: string
) => {
  const targets = getMinimumTargetsFor(pathway, grade) ?? {};
  return minimumTargetCategories.map((category) => ({
    category,
    percent: targets[category]?.percent ?? 0,
    minHours: targets[category]?.minHours ?? 0,
  }));
};

export const sumMinimumTargetHours = (pathway: string, grade: string) =>
  getMinimumTargetsByCategory(pathway, grade).reduce(
    (sum, target) => sum + target.minHours,
    0
  );
