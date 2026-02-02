export type LoadKey = "red" | "yellow" | "green" | "darkgreen";

type TrafficStatus = {
  key: LoadKey;
  label: string;
  percent: number;
  delta: number;
  badgeClass: string;
  barClass: string;
};

const TRAFFIC_STATUS_CONFIG: Record<LoadKey, Omit<TrafficStatus, "key" | "percent" | "delta">> = {
  red: {
    label: "Kurang",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    barClass: "bg-red-500",
  },
  yellow: {
    label: "Hampir",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    barClass: "bg-amber-500",
  },
  green: {
    label: "Cukup",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    barClass: "bg-emerald-500",
  },
  darkgreen: {
    label: "Terlebih",
    badgeClass: "bg-emerald-200 text-emerald-950 border-emerald-300",
    barClass: "bg-emerald-700",
  },
};

export const getTrafficConfig = (key: LoadKey): Omit<TrafficStatus, "key" | "percent" | "delta"> =>
  TRAFFIC_STATUS_CONFIG[key];

export const calcPercent = (achieved: number, target: number): number => {
  if (target <= 0) {
    return 0;
  }

  return (achieved / target) * 100;
};

export const getTrafficKey = (percent: number): LoadKey => {
  if (percent <= 50) {
    return "red";
  }

  if (percent <= 99) {
    return "yellow";
  }

  if (percent <= 120) {
    return "green";
  }

  return "darkgreen";
};

export const calcOverallPercentEqualWeight = (
  sections: Array<{ achieved: number; target: number; enabled?: boolean }>
): number => {
  const activeSections = sections.filter(
    (section) => section.enabled !== false && section.target > 0
  );

  if (activeSections.length === 0) {
    return 0;
  }

  const totalPercent = activeSections.reduce(
    (acc, section) => acc + calcPercent(section.achieved, section.target),
    0
  );

  return totalPercent / activeSections.length;
};

export const getTrafficStatus = (total: number, target: number): TrafficStatus => {
  const percent = calcPercent(total, target);
  const key = getTrafficKey(percent);

  const delta = total - target;
  const config = TRAFFIC_STATUS_CONFIG[key];

  return {
    key,
    label: config.label,
    percent,
    delta,
    badgeClass: config.badgeClass,
    barClass: config.barClass,
  };
};
