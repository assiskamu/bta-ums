import { describe, expect, it } from "vitest";

import {
  TEACHING_ACTIVITY_TYPES,
  updateTeachingEntryType,
} from "../teaching";

describe("updateTeachingEntryType", () => {
  it("updates only the targeted row without mutating activity options", () => {
    const entries = [
      { activityType: "Tutorial" as const },
      { activityType: "Amali" as const },
    ];

    const updated = updateTeachingEntryType(entries, 0, "Kuliah");

    expect(updated).toEqual([
      { activityType: "Kuliah" },
      { activityType: "Amali" },
    ]);
    expect(entries).toEqual([
      { activityType: "Tutorial" },
      { activityType: "Amali" },
    ]);
    expect(TEACHING_ACTIVITY_TYPES).toHaveLength(3);
    expect(TEACHING_ACTIVITY_TYPES).toEqual(["Kuliah", "Tutorial", "Amali"]);
  });
});
