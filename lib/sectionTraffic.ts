export type SectionTrafficKey = "red" | "yellow" | "green" | "black";

export const TRAFFIC_STYLES = {
  red: {
    box: "bg-red-50 border border-red-200 shadow-[0_0_0_4px_rgba(239,68,68,0.18)]",
    badge: "bg-red-100 text-red-800 border border-red-200",
    bar: "bg-red-500",
    text: "text-slate-900",
  },
  yellow: {
    box: "bg-amber-50 border border-amber-200 shadow-[0_0_0_4px_rgba(245,158,11,0.18)]",
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    bar: "bg-amber-500",
    text: "text-slate-900",
  },
  green: {
    box: "bg-emerald-50 border border-emerald-200 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]",
    badge: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    bar: "bg-emerald-500",
    text: "text-slate-900",
  },
  black: {
    box: "bg-slate-950 border border-slate-800 shadow-[0_0_0_6px_rgba(2,6,23,0.35)]",
    badge: "bg-black text-white border border-slate-700",
    bar: "bg-black",
    text: "text-white/90",
  },
} as const;

type SectionTraffic = {
  key: SectionTrafficKey;
  label: string;
  styles: (typeof TRAFFIC_STYLES)[SectionTrafficKey];
};

const SECTION_TRAFFIC_CONFIG: Record<SectionTrafficKey, SectionTraffic> = {
  red: {
    key: "red",
    label: "Kurang",
    styles: TRAFFIC_STYLES.red,
  },
  yellow: {
    key: "yellow",
    label: "Hampir",
    styles: TRAFFIC_STYLES.yellow,
  },
  green: {
    key: "green",
    label: "Cukup",
    styles: TRAFFIC_STYLES.green,
  },
  black: {
    key: "black",
    label: "Overload",
    styles: TRAFFIC_STYLES.black,
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
