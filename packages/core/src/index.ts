export type Pathway = {
  id: string;
  name: string;
};

export type Component = {
  id: string;
  name: string;
  pathwayId: string;
};

export type ActivityInput = {
  componentId: string;
  value: number;
};

export type CalculationResult = {
  total: number;
  breakdown: Record<string, { total: number }>;
};

export * from "./minimumTargets";
export * from "./period";

export const calculateBTA = (input: ActivityInput[]): CalculationResult => {
  const breakdown = input.reduce<Record<string, { total: number }>>(
    (acc, activity) => {
      if (!acc[activity.componentId]) {
        acc[activity.componentId] = { total: 0 };
      }
      return acc;
    },
    {}
  );

  return {
    total: 0,
    breakdown,
  };
};
