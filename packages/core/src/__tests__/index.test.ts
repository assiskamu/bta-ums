import { describe, expect, it } from "vitest";

import { calculateBTA } from "../index";

describe("calculateBTA", () => {
  it("returns zero totals for empty input", () => {
    const result = calculateBTA([]);

    expect(result.total).toBe(0);
    expect(result.breakdown).toEqual({});
  });

  it("includes breakdown entries for components", () => {
    const result = calculateBTA([
      { componentId: "component-a", value: 12 },
      { componentId: "component-b", value: 4 },
      { componentId: "component-a", value: 6 },
    ]);

    expect(result.total).toBe(0);
    expect(result.breakdown).toEqual({
      "component-a": { total: 0 },
      "component-b": { total: 0 },
    });
  });
});
