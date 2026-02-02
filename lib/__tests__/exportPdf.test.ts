import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exportBtaPdf } from "../exportPdf";

const saveMock = vi.fn();
const autoTableMock = vi.fn((doc: { lastAutoTable?: { finalY: number } }) => {
  doc.lastAutoTable = { finalY: 120 };
});
const jsPDFMock = vi.fn().mockImplementation(() => ({
  internal: {
    pageSize: {
      getWidth: () => 210,
      getHeight: () => 297,
    },
  },
  setFontSize: vi.fn(),
  text: vi.fn(),
  splitTextToSize: vi.fn(() => ["line"]),
  setTextColor: vi.fn(),
  getNumberOfPages: vi.fn(() => 1),
  setPage: vi.fn(),
  save: saveMock,
}));

vi.mock("jspdf", () => ({ jsPDF: jsPDFMock }));
vi.mock("jspdf-autotable", () => ({ default: autoTableMock }));

describe("exportBtaPdf", () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = {};
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    vi.clearAllMocks();
  });

  it("generates a PDF and saves it", async () => {
    await exportBtaPdf({
      pathway: "Guru",
      gradeRole: "DG44",
      periodMode: "Mingguan",
      generatedAt: new Date("2024-01-01T00:00:00Z"),
      totals: { totalWeeklyHours: 10 },
      targetMinimum: [
        {
          category: "Pengajaran",
          percent: 0.5,
          hours: 20,
        },
      ],
      actualBreakdown: [
        {
          category: "Pengajaran",
          actualWeeklyHours: 10,
        },
      ],
      entries: [
        {
          category: "Pengajaran",
          activity: "Aktiviti A",
          activityCategory: "Kategori 1",
          quantity: 1,
          unit: "Jam",
          rate: 2,
          period: "Mingguan",
          weeklyHours: 2,
          reference: "-",
        },
      ],
      guidelineVersion: "1.0",
    });

    expect(autoTableMock).toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalled();
  });
});
