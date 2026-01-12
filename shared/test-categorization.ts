/**
 * Strict Test Categorization Utility (Shared)
 * 
 * This utility provides a single source of truth for categorizing tests
 * across both client and server. It ensures tests are placed in the correct
 * sections: Strength, ROM Total Spine/Extremity, ROM Hand/Foot,
 * Occupational Tasks, and Cardio.
 */

export type TestCategory = 
  | "Strength"
  | "ROM Total Spine/Extremity"
  | "ROM Hand/Foot"
  | "Occupational Tasks"
  | "Cardio";

export interface TestInfo {
  testId?: string;
  testName?: string;
  category?: string;
  testType?: string;
}

/**
 * Categorizes a test strictly based on its name and properties
 * Priority order ensures proper categorization without overlap
 */
export function categorizeTest(test: TestInfo): TestCategory {
  if (!test) return "Strength";

  const testName = `${test.testName || ""}`.toLowerCase();
  const testId = `${test.testId || ""}`.toLowerCase();
  const category = `${test.category || test.testType || ""}`.toLowerCase();
  const searchTarget = `${testName} ${testId} ${category}`;

  // PRIORITY 1: Exact category match (if provided by the system)
  if (test.category === "ROM Hand/Foot") return "ROM Hand/Foot";
  if (test.category === "ROM Total Spine/Extremity") return "ROM Total Spine/Extremity";
  if (test.category === "Occupational Tasks") return "Occupational Tasks";
  if (test.category === "Cardio") return "Cardio";
  if (test.category === "Strength") return "Strength";

  // PRIORITY 2: Cardio tests (highest specificity)
  if (
    /\b(bruce|treadmill|cardio|mcaft|kasch|step-test|aerobic|heart|pulse|ymca|vo2|cardiovascular)\b/.test(
      searchTarget
    )
  ) {
    return "Cardio";
  }

  // PRIORITY 3: ROM Hand/Foot (must have hand/foot/finger/wrist/ankle AND ROM keywords)
  // This has higher priority than general ROM to avoid false positives
  if (
    /\b(hand|foot|finger|thumb|wrist|ankle|digit|toe)\b/.test(testName) &&
    /\b(flexion|extension|abduction|adduction|rotation|range|rom|deviation)\b/.test(
      testName
    )
  ) {
    return "ROM Hand/Foot";
  }

  // PRIORITY 4: ROM Total Spine/Extremity (specific body parts + ROM movements)
  // Check for spine-related keywords with ROM movements
  if (
    /\b(cervical|lumbar|thoracic|spine|back)\b/.test(testName) &&
    /\b(flexion|extension|lateral|rotation|range|motion|rom)\b/.test(testName)
  ) {
    return "ROM Total Spine/Extremity";
  }

  // Check for shoulder, hip, elbow, knee ROM
  if (
    /\b(shoulder|hip|knee|elbow)\b/.test(testName) &&
    /\b(flexion|extension|abduction|adduction|rotation|range|motion|rom|dorsi|internal|external)\b/.test(
      testName
    )
  ) {
    return "ROM Total Spine/Extremity";
  }

  // General ROM detection (range, motion, or specific ROM movements)
  if (
    /\b(range|motion|rom)\b/.test(category) ||
    /\b(goniometer|goniometric)\b/.test(testName)
  ) {
    return "ROM Total Spine/Extremity";
  }

  // PRIORITY 5: Occupational Tasks (MTM tests and functional activities)
  if (
    /\b(fingering|handling|reach|balance|stoop|walk|crouch|crawl|climb|kneel|ladder|cart|push|pull|carry|occupational|task)\b/.test(
      searchTarget
    )
  ) {
    // But exclude ROM-related keywords if they appear with occupational tasks
    if (
      !/\b(flexion|extension|abduction|adduction|rom|range|motion)\b/.test(
        testName
      )
    ) {
      return "Occupational Tasks";
    }
  }

  // PRIORITY 6: Strength tests (default, but can be detected by keywords)
  // Strength tests: grip, pinch, lift, carry (when alone), push (when alone), pull (when alone), force
  if (
    /\b(grip|pinch|lift|strength|force|mvic|mve)\b/.test(searchTarget) ||
    /\b(hand-strength|pinch-strength|static-lift|dynamic-lift)\b/.test(
      testId
    )
  ) {
    return "Strength";
  }

  // DEFAULT: Strength (for any unclassified tests)
  return "Strength";
}

/**
 * Groups an array of tests by category
 */
export function groupTestsByCategory(
  tests: TestInfo[]
): Record<TestCategory, TestInfo[]> {
  const grouped: Record<TestCategory, TestInfo[]> = {
    Strength: [],
    "ROM Total Spine/Extremity": [],
    "ROM Hand/Foot": [],
    "Occupational Tasks": [],
    Cardio: [],
  };

  if (!Array.isArray(tests)) return grouped;

  tests.forEach((test) => {
    const category = categorizeTest(test);
    grouped[category].push(test);
  });

  return grouped;
}

/**
 * Get all categories in display order
 */
export function getCategoriesInOrder(): TestCategory[] {
  return [
    "Strength",
    "ROM Total Spine/Extremity",
    "ROM Hand/Foot",
    "Occupational Tasks",
    "Cardio",
  ];
}
