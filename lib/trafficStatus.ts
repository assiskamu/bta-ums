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

export const getTrafficStatus = (total: number, target: number): TrafficStatus => {
  const percent = target > 0 ? (total / target) * 100 : 0;
  let key: LoadKey;

  if (percent <= 50) {
    key = "red";
  } else if (percent <= 99) {
    key = "yellow";
  } else if (percent <= 120) {
    key = "green";
  } else {
    key = "darkgreen";
  }

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
