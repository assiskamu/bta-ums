export const TEACHING_ACTIVITY_TYPES = ["Kuliah", "Tutorial", "Amali"] as const;

export type TeachingActivityType = (typeof TEACHING_ACTIVITY_TYPES)[number];

export type TeachingEntry = {
  activityType: TeachingActivityType | "";
};

export const updateTeachingEntryType = <T extends TeachingEntry>(
  entries: readonly T[],
  index: number,
  activityType: TeachingActivityType
): T[] =>
  entries.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, activityType } : entry
  );
