export type SectionTrafficKey = "red" | "yellow" | "green" | "black";

type SectionTraffic = {
  key: SectionTrafficKey;
  label: string;
};

const SECTION_TRAFFIC_CONFIG: Record<SectionTrafficKey, SectionTraffic> = {
  red: {
    key: "red",
    label: "Kurang",
  },
  yellow: {
    key: "yellow",
    label: "Hampir",
  },
  green: {
    key: "green",
    label: "Cukup",
  },
  black: {
    key: "black",
    label: "Overload",
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
