export type SectionKey = "teaching" | "supervision" | "publication";

export type ActivityEntry = {
  activityType: string;
};

export type SectionEntries<T extends ActivityEntry> = Record<
  SectionKey,
  readonly T[]
>;

export const updateSectionEntryType = <T extends ActivityEntry>(
  sections: SectionEntries<T>,
  section: SectionKey,
  index: number,
  activityType: T["activityType"]
): SectionEntries<T> => ({
  ...sections,
  [section]: sections[section].map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, activityType } : entry
  ),
});
