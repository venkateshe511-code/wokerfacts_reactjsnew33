/**
 * Test Categorization Utility for Firebase Functions
 *
 * This utility provides strict categorization of tests matching the client-side logic.
 * Ensures tests are placed in the correct sections: Strength, ROM Total Spine/Extremity,
 * ROM Hand/Foot, Occupational Tasks, and Cardio.
 */

/**
 * Categorizes a test strictly based on its name and properties
 * Uses a hierarchical approach matching ProtocolTests.tsx structure:
 * - Strength: Hand strength, pinch strength, muscle tests, lifts
 * - ROM Total Spine/Extremity: Spine ROM, extremity ROM (shoulder, hip, knee, elbow)
 * - ROM Hand/Foot: Hand and foot ROM tests
 * - Occupational Tasks: MTM tests (fingering, handling, reach, balance, etc.)
 * - Cardio: Cardiovascular/aerobic tests
 * @param {Object} test - Test object with testName, testId, category, testType
 * @returns {string} - One of: "Strength", "ROM Total Spine/Extremity", "ROM Hand/Foot", "Occupational Tasks", "Cardio"
 */
function categorizeTest(test) {
  if (!test) return "Strength";

  const testName = `${test.testName || ""}`.toLowerCase();
  const testId = `${test.testId || ""}`.toLowerCase();
  const category = `${test.category || test.testType || ""}`.toLowerCase();
  const searchTarget = `${testName} ${testId} ${category}`;

  // PRIORITY 1: Exact category match (if provided by the system)
  if (test.category === "ROM Hand/Foot") return "ROM Hand/Foot";
  if (test.category === "ROM Total Spine/Extremity")
    return "ROM Total Spine/Extremity";
  if (test.category === "Occupational Tasks") return "Occupational Tasks";
  if (test.category === "Cardio") return "Cardio";
  if (test.category === "Strength") return "Strength";

  // PRIORITY 2: Cardio tests (must be checked early to avoid ROM misclassification)
  if (
    /\b(bruce|treadmill|cardio|mcaft|kasch|step-test|aerobic|heart|pulse|ymca|vo2|cardiovascular)\b/.test(
      searchTarget,
    )
  ) {
    return "Cardio";
  }

  // PRIORITY 3: Occupational Tasks/MTM tests (check before ROM to avoid conflicts)
  // These are functional movement tests, NOT range of motion tests
  if (
    /\b(fingering|handling|reach-|balance|stoop|walk|crouch|crawl|climb|kneel|ladder|push-pull|cart|carry-|occupational|mtm)\b/.test(
      testId,
    )
  ) {
    return "Occupational Tasks";
  }

  // PRIORITY 4: ROM Hand/Foot (hand/foot/finger/wrist/ankle AND ROM keywords)
  // Must check ID for hand/foot specifics
  if (
    /\b(hand|foot|finger|thumb|wrist|ankle|digit|toe|dip|pip|mp)\b/.test(
      testName,
    ) &&
    /\b(flexion|extension|abduction|adduction|rotation|range|rom|deviation|dorsi|plantar|eversion|inversion)\b/.test(
      testName,
    )
  ) {
    return "ROM Hand/Foot";
  }

  // PRIORITY 5: ROM Total Spine/Extremity
  // Check for spine-related keywords with ROM movements
  if (
    /\b(cervical-spine|lumbar-spine|thoracic-spine|spine.*flexion|spine.*extension|spine.*lateral|spine.*rotation)\b/.test(
      testId,
    )
  ) {
    return "ROM Total Spine/Extremity";
  }

  // Check for extremity ROM (shoulder, hip, knee, elbow) - BUT NOT muscle tests
  // Muscle tests go to Strength, ROM tests go here
  if (
    !testId.includes("muscle-") &&
    /\b(shoulder-rom|hip-rom|knee-rom|elbow-rom|extremity-)\b/.test(testId)
  ) {
    return "ROM Total Spine/Extremity";
  }

  // Check for cervical ROM (not muscle test cervical)
  if (
    testId.includes("cervical") &&
    !testId.includes("muscle-") &&
    /\b(rom|flexion|extension|lateral|rotation)\b/.test(testId)
  ) {
    return "ROM Total Spine/Extremity";
  }

  // General ROM detection - check ID structure first
  if (/\b(rom|goniometer|goniometric)\b/.test(testId)) {
    return "ROM Total Spine/Extremity";
  }

  // PRIORITY 6: Strength tests
  // Muscle tests take priority (manual muscle testing is strength testing)
  if (
    testId.includes("muscle-") ||
    /\b(hand-strength|pinch-strength|grip|pinch|lift|strength|force|mvic|mve|static|dynamic)\b/.test(
      testId,
    )
  ) {
    return "Strength";
  }

  // Check by name patterns for strength
  if (
    /\b(grip|pinch|lift|strength|force|hand strength|pinch strength)\b/.test(
      testName,
    )
  ) {
    return "Strength";
  }

  // DEFAULT: Strength (for any unclassified tests)
  return "Strength";
}

/**
 * Groups an array of tests by category
 * @param {Array} tests - Array of test objects
 * @returns {Object} - Object with category keys and test arrays as values
 */
function groupTestsByCategory(tests) {
  const grouped = {
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
 * @returns {Array} - Array of category names in display order
 */
function getCategoriesInOrder() {
  return [
    "Strength",
    "ROM Total Spine/Extremity",
    "ROM Hand/Foot",
    "Occupational Tasks",
    "Cardio",
  ];
}

module.exports = {
  categorizeTest,
  groupTestsByCategory,
  getCategoriesInOrder,
};
