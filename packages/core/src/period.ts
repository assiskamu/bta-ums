export const PERIODS = ["Mingguan", "Semester", "Tahunan"] as const;

export type Period = (typeof PERIODS)[number];

export type PeriodSettings = {
  semesterWeeks: number;
  yearWeeks: number;
};

export const DEFAULT_PERIOD_SETTINGS: PeriodSettings = {
  semesterWeeks: 14,
  yearWeeks: 52,
};

type WeeklyHoursInput = {
  quantity: number;
  jamPerUnit: number;
  period: Period;
  settings: PeriodSettings;
};

export const calculateWeeklyHours = ({
  quantity,
  jamPerUnit,
  period,
  settings,
}: WeeklyHoursInput): number => {
  if (!Number.isFinite(quantity) || !Number.isFinite(jamPerUnit)) {
    return 0;
  }

  const totalHours = quantity * jamPerUnit;

  if (period === "Mingguan") {
    return totalHours;
  }

  if (period === "Semester") {
    const divisor = settings.semesterWeeks > 0 ? settings.semesterWeeks : 1;
    return totalHours / divisor;
  }

  const divisor = settings.yearWeeks > 0 ? settings.yearWeeks : 1;
  return totalHours / divisor;
};
