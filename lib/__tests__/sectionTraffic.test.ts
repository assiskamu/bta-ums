import { describe, expect, it } from "vitest";

import { calcPercent, getSectionTraffic } from "../sectionTraffic";

describe("getSectionTraffic", () => {
  it("returns red when percent is below 50", () => {
    const status = getSectionTraffic(49.9);
    expect(status.key).toBe("red");
  });

  it("returns yellow when percent is between 50 and 99.9", () => {
    const status = getSectionTraffic(50);
    expect(status.key).toBe("yellow");

    const upper = getSectionTraffic(99.9);
    expect(upper.key).toBe("yellow");
  });

  it("returns green when percent is between 100 and 150", () => {
    const status = getSectionTraffic(100);
    expect(status.key).toBe("green");

    const upper = getSectionTraffic(150);
    expect(upper.key).toBe("green");
  });

  it("returns black when percent is above 150", () => {
    const status = getSectionTraffic(150.1);
    expect(status.key).toBe("black");
  });
});

describe("calcPercent", () => {
  it("handles overload percentages without clamping", () => {
    const percent = calcPercent(18.6, 12);
    expect(percent).toBeCloseTo(155, 1);
    expect(getSectionTraffic(percent).key).toBe("black");
  });

  it("returns zero when target is zero", () => {
    const percent = calcPercent(10, 0);
    expect(percent).toBe(0);
    expect(getSectionTraffic(percent).key).toBe("red");
  });
});
