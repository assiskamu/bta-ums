export type SectionTrafficKey = "red" | "yellow" | "green" | "black";

type SectionTraffic = {
  key: SectionTrafficKey;
  label: string;
  boxClass: string;
  badgeClass: string;
  barClass: string;
  textClass?: string;
  subTextClass?: string;
};

const SECTION_TRAFFIC_CONFIG: Record<SectionTrafficKey, SectionTraffic> = {
  red: {
    key: "red",
    label: "Kurang",
    boxClass: "bg-red-50 border border-red-200 shadow-[0_0_0_4px_rgba(239,68,68,0.18)]",
    badgeClass: "bg-red-100 text-red-800 border border-red-200",
    barClass: "bg-red-500",
  },
  yellow: {
    key: "yellow",
    label: "Hampir",
    boxClass: "bg-amber-50 border border-amber-200 shadow-[0_0_0_4px_rgba(245,158,11,0.18)]",
    badgeClass: "bg-amber-100 text-amber-800 border border-amber-200",
    barClass: "bg-amber-500",
  },
  green: {
    key: "green",
    label: "Cukup",
    boxClass: "bg-emerald-50 border border-emerald-200 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]",
    badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    barClass: "bg-emerald-500",
  },
  black: {
    key: "black",
    label: "Overload",
    boxClass: "bg-slate-950 border border-slate-800 shadow-[0_0_0_6px_rgba(2,6,23,0.35)]",
    badgeClass: "bg-black text-white border border-slate-700",
    barClass: "bg-black",
    textClass: "text-white/90",
    subTextClass: "text-white/70",
  },
};

export const calcPercent = (achieved: number, target: number): number => {
  if (target <= 0) {
    return 0;
  }

  return (achieved / target) * 100;
};

export const getSectionTraffic = (percent: number): SectionTraffic => {
  let key: SectionTrafficKey;

  if (percent < 50) {
    key = "red";
  } else if (percent < 100) {
    key = "yellow";
  } else if (percent <= 150) {
    key = "green";
  } else {
    key = "black";
  }

  return SECTION_TRAFFIC_CONFIG[key];
};
