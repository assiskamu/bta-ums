import { describe, expect, it } from "vitest";

import {
  calcOverallPercentEqualWeight,
  calcPercent,
  getTrafficKey,
  getTrafficStatus,
} from "../trafficStatus";

describe("getTrafficStatus", () => {
  it("returns red for <= 50%", () => {
    const status = getTrafficStatus(20, 40);

    expect(status.key).toBe("red");
    expect(status.label).toBe("Kurang");
    expect(status.percent).toBe(50);
  });

  it("returns yellow for 51%", () => {
    const status = getTrafficStatus(20.4, 40);

    expect(status.key).toBe("yellow");
    expect(status.label).toBe("Hampir");
  });

  it("returns yellow for 99%", () => {
    const status = getTrafficStatus(39.6, 40);

    expect(status.key).toBe("yellow");
    expect(status.label).toBe("Hampir");
  });

  it("returns green for 100%", () => {
    const status = getTrafficStatus(40, 40);

    expect(status.key).toBe("green");
    expect(status.label).toBe("Cukup");
  });

  it("returns green for 120%", () => {
    const status = getTrafficStatus(48, 40);

    expect(status.key).toBe("green");
    expect(status.label).toBe("Cukup");
  });

  it("returns darkgreen for > 120%", () => {
    const status = getTrafficStatus(48.4, 40);

    expect(status.key).toBe("darkgreen");
    expect(status.label).toBe("Terlebih");
  });

  it("handles zero targets", () => {
    const status = getTrafficStatus(10, 0);

    expect(status.percent).toBe(0);
    expect(status.key).toBe("red");
  });
});

describe("calcPercent", () => {
  it("returns raw percent without clamping", () => {
    const percent = calcPercent(18.6, 12);

    expect(percent).toBeCloseTo(155, 1);
  });

  it("returns 0 for non-positive targets", () => {
    const percent = calcPercent(10, 0);

    expect(percent).toBe(0);
  });
});

describe("getTrafficKey", () => {
  it("returns red for <= 50", () => {
    expect(getTrafficKey(50)).toBe("red");
  });

  it("returns yellow for 51..99", () => {
    expect(getTrafficKey(51)).toBe("yellow");
    expect(getTrafficKey(99)).toBe("yellow");
  });

  it("returns green for 100..120", () => {
    expect(getTrafficKey(100)).toBe("green");
    expect(getTrafficKey(120)).toBe("green");
  });

  it("returns darkgreen for > 120", () => {
    expect(getTrafficKey(121)).toBe("darkgreen");
  });
});

describe("calcOverallPercentEqualWeight", () => {
  it("averages active section percentages equally", () => {
    const percent = calcOverallPercentEqualWeight([
      { achieved: 18.6, target: 12 },
      { achieved: 1, target: 100 },
      { achieved: 5, target: 100 },
    ]);

    expect(percent).toBeCloseTo(53.67, 1);
    expect(getTrafficKey(percent)).toBe("yellow");
  });

  it("ignores disabled sections", () => {
    const percent = calcOverallPercentEqualWeight([
      { achieved: 10, target: 10 },
      { achieved: 0, target: 100, enabled: false },
    ]);

    expect(percent).toBe(100);
  });
});
