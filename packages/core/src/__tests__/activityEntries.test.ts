import { describe, expect, it } from "vitest";

import {
  TEACHING_ACTIVITY_TYPES,
  updateSectionEntryType,
} from "../index";

describe("updateSectionEntryType", () => {
  it("updates only the targeted entry and keeps other sections intact", () => {
    const sections = {
      teaching: [
        { activityType: "Kuliah" },
        { activityType: "Tutorial" },
      ],
      supervision: [{ activityType: "Penyeliaan A" }],
      publication: [{ activityType: "Penerbitan A" }],
    } as const;

    const updated = updateSectionEntryType(sections, "teaching", 0, "Amali");

    expect(updated.teaching).toEqual([
      { activityType: "Amali" },
      { activityType: "Tutorial" },
    ]);
    expect(updated.teaching[1]).toEqual(sections.teaching[1]);
    expect(updated.supervision).toEqual(sections.supervision);
    expect(updated.publication).toEqual(sections.publication);
  });

  it("does not mutate the teaching activity options", () => {
    const sections = {
      teaching: [{ activityType: "Kuliah" }],
      supervision: [{ activityType: "Penyeliaan A" }],
      publication: [{ activityType: "Penerbitan A" }],
    } as const;

    updateSectionEntryType(sections, "teaching", 0, "Tutorial");

    expect(TEACHING_ACTIVITY_TYPES).toEqual(["Kuliah", "Tutorial", "Amali"]);
  });
});
