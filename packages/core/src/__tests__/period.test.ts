import { describe, expect, it } from "vitest";

import {
  calculateWeeklyHours,
  DEFAULT_PERIOD_SETTINGS,
  type PeriodSettings,
} from "../period";

describe("calculateWeeklyHours", () => {
  const settings: PeriodSettings = {
    semesterWeeks: 14,
    yearWeeks: 52,
  };

  it("returns weekly totals for Mingguan", () => {
    const result = calculateWeeklyHours({
      quantity: 4,
      jamPerUnit: 2.5,
      period: "Mingguan",
      settings,
    });

    expect(result).toBeCloseTo(10);
  });

  it("converts semester totals into weekly hours", () => {
    const result = calculateWeeklyHours({
      quantity: 28,
      jamPerUnit: 1,
      period: "Semester",
      settings,
    });

    expect(result).toBeCloseTo(2);
  });

  it("converts annual totals into weekly hours", () => {
    const result = calculateWeeklyHours({
      quantity: 52,
      jamPerUnit: 1.5,
      period: "Tahunan",
      settings,
    });

    expect(result).toBeCloseTo(1.5);
  });

  it("guards against invalid settings", () => {
    const result = calculateWeeklyHours({
      quantity: 10,
      jamPerUnit: 1,
      period: "Semester",
      settings: { ...DEFAULT_PERIOD_SETTINGS, semesterWeeks: 0 },
    });

    expect(result).toBeCloseTo(10);
  });
});
