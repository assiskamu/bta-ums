import { describe, expect, it } from "vitest";

import {
  getMinimumTargetGrades,
  getMinimumTargetPathways,
  getMinimumTargetsByCategory,
  sumMinimumTargetHours,
} from "../index";

describe("minimum target tables", () => {
  it("returns seven categories for each pathway grade", () => {
    getMinimumTargetPathways().forEach((pathway) => {
      const grades = getMinimumTargetGrades(pathway);
      expect(grades.length).toBeGreaterThan(0);

      grades.forEach((grade) => {
        const targets = getMinimumTargetsByCategory(pathway, grade);
        expect(targets).toHaveLength(7);
      });
    });
  });

  it("sums to 40 hours for each pathway grade", () => {
    getMinimumTargetPathways().forEach((pathway) => {
      const grades = getMinimumTargetGrades(pathway);

      grades.forEach((grade) => {
        const total = sumMinimumTargetHours(pathway, grade);
        expect(total).toBeCloseTo(40, 4);
      });
    });
  });
});
