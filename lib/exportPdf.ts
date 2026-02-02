type AutoTableOptions = {
  head: (string | number)[][];
  body: (string | number)[][];
  startY?: number;
  theme?: string;
  margin?: { left?: number; right?: number };
  styles?: { fontSize?: number; cellPadding?: number; overflow?: string };
  headStyles?: { fillColor?: number[]; textColor?: number | number[] };
  columnStyles?: Record<number, { cellWidth?: number; halign?: string }>;
};

export type ExportBtaPdfParams = {
  pathway: string;
  gradeRole: string;
  periodMode: string;
  generatedAt: Date;
  totals: {
    totalWeeklyHours: number;
  };
  targetMinimum: {
    category: string;
    percent: number;
    hours: number;
  }[];
  actualBreakdown: {
    category: string;
    actualWeeklyHours: number;
  }[];
  entries: {
    category: string;
    activity: string;
    activityCategory: string;
    quantity: number;
    unit: string;
    rate: number | null;
    period: string;
    weeklyHours: number;
    reference: string;
  }[];
  guidelineVersion?: string | null;
};

const sanitizeFilePart = (value: string) =>
  value
    .trim()
    .replace(/[\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "data";

const formatDateForFilename = (date: Date) =>
  date.toISOString().slice(0, 10);

const formatQuantity = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(1);

export const exportBtaPdf = async (
  params: ExportBtaPdfParams
): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (
    "default" in autoTableModule ? autoTableModule.default : autoTableModule
  ) as (doc: unknown, options: AutoTableOptions) => void;

  if (!jsPDF || !autoTable) {
    throw new Error("Modul PDF tidak dapat dimuatkan. Sila cuba semula.");
  }

  const {
    pathway,
    gradeRole,
    periodMode,
    generatedAt,
    totals,
    targetMinimum,
    actualBreakdown,
    entries,
    guidelineVersion,
  } = params;

  const doc = new (jsPDF as {
    new (config: {
      orientation: string;
      unit: string;
      format: string;
    }): {
      internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
      setFontSize: (size: number) => void;
      text: (
        text: string | string[],
        x: number,
        y: number,
        options?: { align?: string }
      ) => void;
      splitTextToSize: (text: string, size: number) => string[];
      setTextColor: (r: number, g?: number, b?: number) => void;
      getNumberOfPages: () => number;
      setPage: (page: number) => void;
      save: (fileName: string) => void;
    };
  })({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const footerY = pageHeight - 10;

  let cursorY = 18;

  doc.setFontSize(18);
  doc.text("Laporan BTA UMS", marginX, cursorY);
  cursorY += 7;

  const subtitle = `Laluan: ${pathway} | Gred/Jawatan: ${gradeRole} | Tempoh: ${periodMode}`;
  doc.setFontSize(10);
  const subtitleLines = doc.splitTextToSize(
    subtitle,
    pageWidth - marginX * 2
  );
  doc.text(subtitleLines, marginX, cursorY);
  cursorY += subtitleLines.length * 5 + 1;

  doc.setFontSize(9);
  doc.text(
    `Dijana pada: ${generatedAt.toLocaleString("ms-MY")}`,
    marginX,
    cursorY
  );
  cursorY += 6;

  doc.setFontSize(16);
  doc.text(
    `Jumlah Jam/Minggu: ${totals.totalWeeklyHours.toFixed(1)} / 40`,
    marginX,
    cursorY
  );
  cursorY += 7;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Garis Panduan: ${guidelineVersion ?? "-"}`, marginX, cursorY);
  doc.setTextColor(0);
  cursorY += 4;

  doc.setFontSize(12);
  doc.text("Ringkasan Mengikut Kategori", marginX, cursorY + 6);

  const actualMap = new Map(
    actualBreakdown.map((item) => [item.category, item.actualWeeklyHours])
  );
  const summaryRows = targetMinimum.map((target) => {
    const actual = actualMap.get(target.category) ?? 0;
    const isMet = actual >= target.hours;
    return [
      target.category,
      actual.toFixed(1),
      target.hours.toFixed(1),
      `${(target.percent * 100).toFixed(0)}%`,
      isMet ? "Cukup" : "Kurang",
    ];
  });

  autoTable(doc, {
    startY: cursorY + 10,
    head: [
      [
        "Kategori",
        "Pencapaian (jam/minggu)",
        "Sasaran minimum (jam)",
        "Peratus sasaran",
        "Status",
      ],
    ],
    body: summaryRows,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [241, 245, 249], textColor: 15 },
    margin: { left: marginX, right: marginX },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "center" },
    },
  } satisfies AutoTableOptions);

  const afterSummaryY = (doc as typeof doc & { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY;
  cursorY = (afterSummaryY ?? cursorY) + 10;

  doc.setFontSize(12);
  doc.text("Senarai Aktiviti", marginX, cursorY);

  const entryRows = entries.map((entry) => [
    entry.category,
    entry.activity,
    entry.activityCategory,
    formatQuantity(entry.quantity),
    entry.unit,
    entry.rate != null ? entry.rate.toFixed(1) : "-",
    entry.period,
    entry.weeklyHours.toFixed(1),
    entry.reference,
  ]);

  autoTable(doc, {
    startY: cursorY + 6,
    head: [
      [
        "Kategori",
        "Aktiviti",
        "Kategori Aktiviti",
        "Kuantiti",
        "Unit",
        "Kadar (jam/unit)",
        "Tempoh",
        "Jam/minggu",
        "Rujukan",
      ],
    ],
    body: entryRows,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [241, 245, 249], textColor: 15 },
    margin: { left: marginX, right: marginX },
    columnStyles: {
      3: { halign: "right" },
      5: { halign: "right" },
      7: { halign: "right" },
    },
  } satisfies AutoTableOptions);

  const totalPages = doc.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(100);
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.text(
      `Muka surat ${page} / ${totalPages}`,
      pageWidth / 2,
      footerY,
      { align: "center" }
    );
  }
  doc.setTextColor(0);

  const fileName = `bta-ums_${sanitizeFilePart(pathway)}_${sanitizeFilePart(
    gradeRole
  )}_${formatDateForFilename(generatedAt)}.pdf`;

  doc.save(fileName);
};
