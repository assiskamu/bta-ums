import { describe, expect, it } from "vitest";

import { getTrafficStatus } from "../trafficStatus";

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
