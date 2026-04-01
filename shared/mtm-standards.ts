// MTM (Methods Time Measurement) Standard Time References
// Based on industrial engineering standards for occupational tasks

export interface MTMStandard {
  taskId: string;
  taskName: string;
  standardTime: number; // in seconds
  unit: string;
  factors: {
    weight?: number; // lbs
    distance?: number; // feet
    reps?: number;
    difficulty?: "easy" | "medium" | "hard";
  };
  description: string;
}

// Lookup tables for %IS based on test time (seconds)
// Values are taken from the MTM Norm Schedule the user provided
export type ISLookupTable = Record<number, number>;

export const MTM_IS_TABLES: Record<string, ISLookupTable> = {
  fingering: { 10: 142, 15: 106, 17: 93, 20: 80, 25: 63 },
  "bi-manual-fingering": { 15: 142, 20: 102, 25: 85, 30: 71, 35: 61 },
  handling: { 10: 164, 15: 109, 17: 95, 20: 82, 25: 65 },
  "bi-manual-handling": { 8: 133, 10: 106, 13: 82, 15: 71, 17: 63 },
  "reach-immediate": { 5: 125, 6: 102, 8: 77, 10: 61, 12: 51 },
  "reach-overhead": { 4: 153, 5: 120, 6: 102, 7: 88, 8: 76 },
  // For reach-with-weight we distinguish two variants using context in the helper
  "reach-with-weight-immediate": { 10: 137, 15: 91, 17: 81, 20: 69, 25: 55 },
  "reach-with-weight-stoop": { 10: 160, 15: 107, 17: 94, 20: 80, 25: 64 },
  balance: { 4: 145, 5: 120 },
  stoop: { 10: 132, 15: 88, 17: 77, 20: 65, 25: 53 },
  crouch: { 5: 146, 7: 106, 10: 72, 13: 55, 15: 49 },
  crawl: { 5: 203, 7: 148, 10: 104, 13: 80, 15: 68 },
  walk: { 3: 182, 5: 109, 6: 89, 7: 77, 10: 55 },
  carry: { 5: 195, 7: 142, 10: 100, 12: 84, 15: 67 },
  // Stairs and ladder have variants by step/rung count
  "climb-stairs-3": { 1: 188, 2: 111, 3: 79, 4: 61 },
  "climb-stairs-5": { 3: 122, 4: 94, 5: 72, 6: 62 },
  "climb-ladder-4": { 7: 199, 10: 139, 12: 114, 15: 91, 20: 69 },
  "climb-ladder-8": { 10: 137, 12: 113, 15: 90, 17: 80, 20: 69 },
  // Push / pull cart for 40/60/100 lbs share the same mapping in the provided table
  "push-pull-cart": { 1: 222, 2: 128, 3: 84, 5: 50, 6: 40, 7: 35.5, 8: 29.6, 9: 27.2, 10: 24.2, 11: 22.3, 12: 19.8, 13: 18.5, 14: 17.5, 15: 16.1, 16: 15.1, 17: 14.2, 18: 13.5, 19: 12.9, 20: 12.2, 21: 11.6, 30: 8.1, 40: 6.1 },
};

function interpolatePercent(actualTime: number, table: ISLookupTable): number {
  const times = Object.keys(table)
    .map((t) => Number(t))
    .sort((a, b) => a - b);
  if (times.length === 0 || actualTime <= 0) return 0;

  // Exact match (allowing numeric-string key lookup)
  if (table[Number(actualTime)]) return table[Number(actualTime)];

  // Below range -> linear extrapolation using first two points
  if (actualTime < times[0]) {
    const t1 = times[0];
    const t2 = times[1] ?? times[0];
    const y1 = table[t1];
    const y2 = table[t2];
    if (t2 === t1) return y1;
    const slope = (y2 - y1) / (t2 - t1);
    const y = y1 + slope * (actualTime - t1);
    return Math.max(0, Math.round(y * 10) / 10);
  }

  // Above range -> linear extrapolation using last two points
  if (actualTime > times[times.length - 1]) {
    const t1 = times[times.length - 2] ?? times[times.length - 1];
    const t2 = times[times.length - 1];
    const y1 = table[t1];
    const y2 = table[t2];
    if (t2 === t1) return y2;
    const slope = (y2 - y1) / (t2 - t1);
    const y = y2 + slope * (actualTime - t2);
    return Math.max(0, Math.round(y * 10) / 10);
  }

  // Linear interpolation between nearest lower and upper breakpoints
  let lower = times[0];
  let upper = times[times.length - 1];
  for (let i = 0; i < times.length - 1; i++) {
    if (actualTime >= times[i] && actualTime <= times[i + 1]) {
      lower = times[i];
      upper = times[i + 1];
      break;
    }
  }
  const y1 = table[lower];
  const y2 = table[upper];
  const t = (actualTime - lower) / (upper - lower);
  const result = Math.round(((y1 + (y2 - y1) * t) as number) * 10) / 10;
  return Math.max(0, result);
}

export interface ISContext {
  steps?: number;
  rungs?: number;
  weight?: number;
  position?: string; // e.g., STOOP/KNEEL etc.
}

/**
 * Calculate %IS based on MTM tables provided by the user.
 * Selects the appropriate table for the test and performs linear interpolation
 * for times between listed breakpoints, clamping outside the range.
 */
export function calculatePercentISByTest(
  testId: string,
  actualTime: number,
  context: ISContext = {},
): number {
  if (actualTime <= 0) return 0;

  let key = testId;

  if (testId === "reach-with-weight") {
    const pos = (context.position || "").toLowerCase();
    key =
      pos.includes("stoop") || pos.includes("kneel")
        ? "reach-with-weight-stoop"
        : "reach-with-weight-immediate";
  }

  if (testId === "climb-stairs") {
    const steps = context.steps ?? 0;
    key = steps <= 3 ? "climb-stairs-3" : "climb-stairs-5";
  }

  if (testId === "climb-ladder") {
    const rungs = context.rungs ?? 0;
    key = rungs <= 4 ? "climb-ladder-4" : "climb-ladder-8";
  }

  if (testId === "push-pull-cart") {
    key = "push-pull-cart"; // same mapping for 40/60/100 lbs per table
  }

  const table = MTM_IS_TABLES[key];
  if (!table) {
    // Fallback to legacy ratio if table is missing
    return calculatePercentIS(
      actualTime,
      MTM_STANDARDS[testId]?.standardTime || 1,
    );
  }
  return interpolatePercent(actualTime, table);
}

export interface MTMCalculationParams {
  weight?: number;
  distance?: number;
  reps?: number;
  difficulty?: "easy" | "medium" | "hard";
}

// Base MTM standards for different occupational tasks
export const MTM_STANDARDS: Record<string, MTMStandard> = {
  fingering: {
    taskId: "fingering",
    taskName: "Fingering",
    standardTime: 12.0, // 12 seconds for standard fingering task
    unit: "seconds",
    factors: {
      reps: 10,
      difficulty: "medium",
    },
    description: "Fine motor dexterity task requiring precise finger movements",
  },

  "reach-immediate": {
    taskId: "reach-immediate",
    taskName: "Reach Immediate",
    standardTime: 8.5, // 8.5 seconds for immediate reach
    unit: "seconds",
    factors: {
      distance: 18, // inches
      difficulty: "easy",
    },
    description: "Immediate reaching movement within arm's length",
  },

  "reach-extended": {
    taskId: "reach-extended",
    taskName: "Reach Extended",
    standardTime: 15.0, // 15 seconds for extended reach
    unit: "seconds",
    factors: {
      distance: 36, // inches
      difficulty: "medium",
    },
    description: "Extended reaching requiring body movement",
  },

  balance: {
    taskId: "balance",
    taskName: "Balance",
    standardTime: 30.0, // 30 seconds for balance task
    unit: "seconds",
    factors: {
      distance: 10, // feet
      difficulty: "medium",
    },
    description: "Static and dynamic balance maintenance",
  },

  carry: {
    taskId: "carry",
    taskName: "Carry",
    standardTime: 25.0, // 25 seconds for carrying task
    unit: "seconds",
    factors: {
      weight: 20, // lbs
      distance: 50, // feet
      difficulty: "medium",
    },
    description: "Carrying objects over specified distance",
  },

  lifting: {
    taskId: "lifting",
    taskName: "Lifting",
    standardTime: 10.0, // 10 seconds for lifting task
    unit: "seconds",
    factors: {
      weight: 25, // lbs
      difficulty: "medium",
    },
    description: "Lifting objects from floor to waist level",
  },

  pushing: {
    taskId: "pushing",
    taskName: "Pushing",
    standardTime: 18.0, // 18 seconds for pushing task
    unit: "seconds",
    factors: {
      weight: 30, // lbs
      distance: 20, // feet
      difficulty: "medium",
    },
    description: "Pushing objects across surface",
  },

  pulling: {
    taskId: "pulling",
    taskName: "Pulling",
    standardTime: 20.0, // 20 seconds for pulling task
    unit: "seconds",
    factors: {
      weight: 25, // lbs
      distance: 20, // feet
      difficulty: "medium",
    },
    description: "Pulling objects toward body",
  },

  crawling: {
    taskId: "crawling",
    taskName: "Crawling",
    standardTime: 45.0, // 45 seconds for crawling task
    unit: "seconds",
    factors: {
      distance: 20, // feet
      difficulty: "hard",
    },
    description: "Crawling movement on hands and knees",
  },

  kneeling: {
    taskId: "kneeling",
    taskName: "Kneeling",
    standardTime: 35.0, // 35 seconds for kneeling task
    unit: "seconds",
    factors: {
      difficulty: "medium",
    },
    description: "Sustained kneeling position",
  },

  crouching: {
    taskId: "crouching",
    taskName: "Crouching",
    standardTime: 25.0, // 25 seconds for crouching task
    unit: "seconds",
    factors: {
      difficulty: "medium",
    },
    description: "Sustained crouching position",
  },

  "stair-climbing": {
    taskId: "stair-climbing",
    taskName: "Stair Climbing",
    standardTime: 40.0, // 40 seconds for stair climbing
    unit: "seconds",
    factors: {
      distance: 15, // steps
      difficulty: "hard",
    },
    description: "Climbing stairs with proper form",
  },
};

// Weight adjustment factors (multipliers)
export const WEIGHT_FACTORS = {
  light: 0.85, // < 10 lbs
  medium: 1.0, // 10-30 lbs
  heavy: 1.3, // 31-50 lbs
  very_heavy: 1.6, // > 50 lbs
};

// Distance adjustment factors (multipliers)
export const DISTANCE_FACTORS = {
  short: 0.8, // < 20 feet
  medium: 1.0, // 20-50 feet
  long: 1.2, // 51-100 feet
  very_long: 1.4, // > 100 feet
};

// Difficulty adjustment factors (multipliers)
export const DIFFICULTY_FACTORS = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.3,
};

/**
 * Calculate standard time for a specific task with given parameters
 */
export function calculateStandardTime(
  taskId: string,
  params: MTMCalculationParams = {},
): number {
  const standard = MTM_STANDARDS[taskId];
  if (!standard) {
    console.warn(`No MTM standard found for task: ${taskId}`);
    return 30.0; // Default fallback time
  }

  let adjustedTime = standard.standardTime;

  // Apply weight factor
  if (params.weight && standard.factors.weight) {
    const weightCategory = getWeightCategory(params.weight);
    adjustedTime *= WEIGHT_FACTORS[weightCategory];
  }

  // Apply distance factor
  if (params.distance && standard.factors.distance) {
    const distanceCategory = getDistanceCategory(params.distance);
    adjustedTime *= DISTANCE_FACTORS[distanceCategory];
  }

  // Apply difficulty factor
  if (params.difficulty) {
    adjustedTime *= DIFFICULTY_FACTORS[params.difficulty];
  }

  // Apply reps factor (linear scaling)
  if (params.reps && standard.factors.reps) {
    const repsFactor = params.reps / standard.factors.reps;
    adjustedTime *= repsFactor;
  }

  return Math.round(adjustedTime * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate Industrial Standard percentage
 */
export function calculatePercentIS(
  actualTime: number,
  standardTime: number,
): number {
  if (actualTime <= 0) return 0;
  const percentIS = (standardTime / actualTime) * 100;
  return Math.round(percentIS * 10) / 10; // kept for backward compatibility
}

/**
 * Get weight category for factor calculation
 */
function getWeightCategory(weight: number): keyof typeof WEIGHT_FACTORS {
  if (weight < 10) return "light";
  if (weight <= 30) return "medium";
  if (weight <= 50) return "heavy";
  return "very_heavy";
}

/**
 * Get distance category for factor calculation
 */
function getDistanceCategory(distance: number): keyof typeof DISTANCE_FACTORS {
  if (distance < 20) return "short";
  if (distance <= 50) return "medium";
  if (distance <= 100) return "long";
  return "very_long";
}

/**
 * Get available MTM standards
 */
export function getMTMStandards(): MTMStandard[] {
  return Object.values(MTM_STANDARDS);
}

/**
 * Get MTM standard by task ID
 */
export function getMTMStandard(taskId: string): MTMStandard | null {
  return MTM_STANDARDS[taskId] || null;
}
