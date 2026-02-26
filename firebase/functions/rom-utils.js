/**
 * ROM (Range of Motion) Formatting Utilities for Node.js
 * Handles formatting of ROM tests with left/right sides
 * Mirrors the shared/rom-utils.ts functionality for server-side use
 */

/**
 * Gets paired motion labels for tests like Flexion/Extension
 * Returns [firstMotion, secondMotion] or null if not a paired motion test
 * Example: "cervical-flexion-extension" -> ["F", "E"]
 */
function getPairedMotionLabels(testId, testName) {
  const id = (testId || "").toLowerCase();
  const name = (testName || "").toLowerCase();
  const combined = `${id} ${name}`;

  // Check for flexion-extension pattern
  if (
    combined.includes("flexion-extension") ||
    combined.includes("flexion/extension")
  ) {
    return ["F", "E"];
  }

  // Check for dorsi-plantar pattern
  if (
    combined.includes("dorsi-plantar") ||
    combined.includes("dorsi/plantar") ||
    combined.includes("dorsiplantar")
  ) {
    return ["DF", "PF"];
  }

  // Check for inversion-eversion pattern
  if (
    combined.includes("inversion-eversion") ||
    combined.includes("inversion/eversion")
  ) {
    return ["I", "E"];
  }

  // Check for supination-pronation pattern
  if (
    combined.includes("supination-pronation") ||
    combined.includes("supination/pronation")
  ) {
    return ["Supination", "Pronation"];
  }

  // Check for internal-external rotation pattern
  if (
    combined.includes("internal-external-rotation") ||
    combined.includes("internal/external rotation") ||
    combined.includes("internal/external-rotation") ||
    combined.includes("internal external rotation")
  ) {
    return ["I", "E"];
  }

  // Check for abduction-adduction pattern
  if (
    combined.includes("abduction-adduction") ||
    combined.includes("abduction/adduction")
  ) {
    return ["ABD", "ADD"];
  }

  // Check for radial-ulnar deviation pattern
  if (
    combined.includes("radial-ulnar") ||
    combined.includes("radial/ulnar") ||
    combined.includes("radial ulnar")
  ) {
    return ["R", "U"];
  }

  // Check for straight leg raise pattern
  if (combined.includes("straight-leg-raise") || combined.includes("straight leg raise")) {
    return ["L", "R"];
  }

  // Check for thumb abduction pattern
  if (combined.includes("thumb-abduction") || combined.includes("thumb abduction")) {
    return ["P", "R"];
  }

  return null;
}

/**
 * Gets paired motion labels for the side table (full names instead of abbreviations)
 * Returns [firstMotion, secondMotion] or null if not a paired motion test
 * Example: "cervical-flexion-extension" -> ["Flexion", "Extension"]
 * Used in side-by-trial tables in reports
 */
function getPairedMotionLabelsFullNames(testId, testName) {
  const id = (testId || "").toLowerCase();
  const name = (testName || "").toLowerCase();
  const combined = `${id} ${name}`;

  // Check for flexion-extension pattern
  if (
    combined.includes("flexion-extension") ||
    combined.includes("flexion/extension")
  ) {
    return ["Flexion", "Extension"];
  }

  // Check for dorsi-plantar pattern
  if (
    combined.includes("dorsi-plantar") ||
    combined.includes("dorsi/plantar") ||
    combined.includes("dorsiplantar")
  ) {
    return ["Dorsi Flexion", "Plantar Flexion"];
  }

  // Check for inversion-eversion pattern
  if (
    combined.includes("inversion-eversion") ||
    combined.includes("inversion/eversion")
  ) {
    return ["Inversion", "Eversion"];
  }

  // Check for supination-pronation pattern
  if (
    combined.includes("supination-pronation") ||
    combined.includes("supination/pronation")
  ) {
    return ["Supination", "Pronation"];
  }

  // Check for internal-external rotation pattern
  if (
    combined.includes("internal-external-rotation") ||
    combined.includes("internal/external rotation") ||
    combined.includes("internal/external-rotation") ||
    combined.includes("internal external rotation")
  ) {
    return ["Internal Rotation", "External Rotation"];
  }

  // Check for abduction-adduction pattern
  if (
    combined.includes("abduction-adduction") ||
    combined.includes("abduction/adduction")
  ) {
    return ["Abduction", "Adduction"];
  }

  // Check for radial-ulnar deviation pattern
  if (
    combined.includes("radial-ulnar") ||
    combined.includes("radial/ulnar") ||
    combined.includes("radial ulnar")
  ) {
    return ["Radial Deviation", "Ulnar Deviation"];
  }

  // Check for straight leg raise pattern
  if (combined.includes("straight-leg-raise") || combined.includes("straight leg raise")) {
    return ["Left", "Right"];
  }

  // Check for thumb abduction pattern
  if (combined.includes("thumb-abduction") || combined.includes("thumb abduction")) {
    return ["Palmar", "Radial"];
  }

  return null;
}

/**
 * Extracts the side prefix (Left/Right) from a test ID or test name
 * If testId has -left or -right suffix, use that
 * Otherwise check if testName starts with "Left Side -" or "Right Side -"
 * Examples:
 * testId: "shoulder-rom-flexion-extension-left", testName: "Extremity Shoulder Flexion/Extension" -> "Left Side - Extremity Shoulder"
 * testId: "elbow-rom-flexion-extension-right", testName: "Extremity Elbow Flexion/Extension" -> "Right Side - Extremity Elbow"
 * testId: "lumbar-spine-flexion-extension", testName: "Lumbar Flexion/Extension" -> null
 */
function extractSidePrefix(testName, testId) {
  if (!testName) return null;

  const name = testName.trim();
  const id = (testId || "").toLowerCase();

  // Check if testId has -left or -right suffix
  const sideSuffixMatch = id.match(/-(left|right)$/);
  if (sideSuffixMatch) {
    const side = sideSuffixMatch[1] === "left" ? "Left" : "Right";
    // Remove existing side prefix if present to avoid duplication
    let cleanName = name.replace(/^(Left|Right)\s+Side\s*-\s*/i, "");
    // Remove motion keywords and everything after them
    const withoutMotion = cleanName.replace(/\s+[A-Za-z\/]*(?:Internal|External|Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise)[A-Za-z\/\s]*.*$/i, "");
    return `${side} Side - ${withoutMotion}`;
  }

  // Fallback: Check if name starts with "Left Side -" or "Right Side -"
  const sidePrefixMatch = name.match(/^(Left|Right)\s+Side\s*-\s*(.+)$/i);
  if (sidePrefixMatch) {
    const sidePrefix = sidePrefixMatch[1];
    const rest = sidePrefixMatch[2];
    // Remove motion keywords and everything after them from the rest of the name
    const withoutMotion = rest.replace(/\s+[A-Za-z\/]*(?:Internal|External|Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise)[A-Za-z\/\s]*.*$/i, "");
    return `${sidePrefix} Side - ${withoutMotion}`;
  }

  return null;
}

/**
 * Extracts the body part name from a test name
 * Examples:
 * "Lumbar - Flexion/Extension" -> "Lumbar"
 * "Cervical Flexion/Extension" -> "Cervical"
 * "Left Side - Extremity Shoulder Flexion/Extension" -> "Shoulder"
 */
function extractBodyPart(testName) {
  if (!testName) return null;

  const name = testName.trim();

  // For "Left Side -" or "Right Side -" format, extract what comes after and return the body part
  const sidePrefixMatch = name.match(/^(Left|Right)\s+Side\s*-\s*(.+)$/i);
  if (sidePrefixMatch) {
    const restOfName = sidePrefixMatch[2];
    // Extract body part by removing motion keywords - keep everything up to the first motion keyword
    const bodyPartMatch = restOfName.match(/^(.+?)\s+[A-Za-z\/]*(?:Internal|External|Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise)/i);
    if (bodyPartMatch) {
      return bodyPartMatch[1].trim();
    }
    // Fallback if no motion keyword found
    return restOfName;
  }

  // For simple format like "Lumbar - Flexion/Extension"
  const simpleMatch = name.match(
    /^([A-Z][a-zA-Z\s]+?)\s*(?:-|:)\s*[A-Za-z\/]*(?:Internal|External|Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise)/i
  );
  if (simpleMatch) {
    return simpleMatch[1].trim();
  }

  // For format like "Cervical Flexion/Extension" or "Extremity Shoulder Internal/External Rotation"
  const basicMatch = name.match(/^(.+?)\s+[A-Za-z\/]*(?:Internal|External|Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise)/i);
  if (basicMatch) {
    return basicMatch[1].trim();
  }

  return null;
}

/**
 * Gets the full motion labels for display (e.g., "Flexion", "Extension")
 * Returns [firstMotion, secondMotion] or null if not a paired motion test
 * Example: "cervical-flexion-extension" -> ["Flexion", "Extension"]
 */
function getFullMotionLabels(testId, testName) {
  const id = (testId || "").toLowerCase();
  const name = (testName || "").toLowerCase();
  const combined = `${id} ${name}`;

  // Check for flexion-extension pattern
  if (
    combined.includes("flexion-extension") ||
    combined.includes("flexion/extension")
  ) {
    return ["Flexion", "Extension"];
  }

  // Check for dorsi-plantar pattern
  if (
    combined.includes("dorsi-plantar") ||
    combined.includes("dorsi/plantar") ||
    combined.includes("dorsiplantar")
  ) {
    return ["Dorsi Flexion", "Plantar Flexion"];
  }

  // Check for inversion-eversion pattern
  if (
    combined.includes("inversion-eversion") ||
    combined.includes("inversion/eversion")
  ) {
    return ["Inversion", "Eversion"];
  }

  // Check for supination-pronation pattern
  if (
    combined.includes("supination-pronation") ||
    combined.includes("supination/pronation")
  ) {
    return ["Supination", "Pronation"];
  }

  // Check for internal-external rotation pattern
  if (
    combined.includes("internal-external-rotation") ||
    combined.includes("internal/external rotation") ||
    combined.includes("internal/external-rotation") ||
    combined.includes("internal external rotation")
  ) {
    return ["Internal Rotation", "External Rotation"];
  }

  // Check for abduction-adduction pattern
  if (
    combined.includes("abduction-adduction") ||
    combined.includes("abduction/adduction")
  ) {
    return ["Abduction", "Adduction"];
  }

  // Check for radial-ulnar deviation pattern
  if (
    combined.includes("radial-ulnar") ||
    combined.includes("radial/ulnar") ||
    combined.includes("radial ulnar")
  ) {
    return ["Radial Deviation", "Ulnar Deviation"];
  }

  // Check for straight leg raise pattern
  if (combined.includes("straight-leg-raise") || combined.includes("straight leg raise")) {
    return ["Left", "Right"];
  }

  // Check for thumb abduction pattern
  if (combined.includes("thumb-abduction") || combined.includes("thumb abduction")) {
    return ["Palmar", "Radial"];
  }

  return null;
}

/**
 * Gets the area evaluated labels for the left and right rows using abbreviated motion names
 * Based on body part and paired motions
 * Examples:
 * testName: "Lumbar Flexion/Extension" -> ["Lumbar - F", "Lumbar - E"]
 * For straight leg raise tests: testName: "Lumbar Straight Leg Raise" -> ["Lumbar - L", "Lumbar - R"]
 */
function getAreaEvaluatedLabels(testName, testId) {
  if (!testName) return null;

  const id = (testId || "").toLowerCase();
  const name = (testName || "").toLowerCase();
  const combined = `${id} ${name}`;

  // Special case: for cervical spine rotation, use custom side labels
  if (id.includes("cervical-spine-rotation") && !id.includes("-left") && !id.includes("-right")) {
    return [
      "Left Side Cervical Rotation",
      "Right Side Cervical Rotation",
    ];
  }

  // Special case: for thumb abduction, use full motion names in a specific format
  if (combined.includes("thumb-abduction") || combined.includes("thumb abduction")) {
    const fullMotionLabels = getFullMotionLabels(testId, testName);
    if (fullMotionLabels) {
      return [
        `${fullMotionLabels[0]} Thumb Abduction`,
        `${fullMotionLabels[1]} Thumb Abduction`,
      ];
    }
  }

  // Get paired motions (abbreviated)
  const motionLabels = getPairedMotionLabels(testId, testName);
  if (!motionLabels) return null;

  // Check if this test has a "Left Side -" or "Right Side -" prefix (from testId or testName)
  const sidePrefix = extractSidePrefix(testName, testId);

  if (sidePrefix) {
    // For side-prefixed tests, extract the body part (everything after "Left Side - " or "Right Side - ")
    const bodyPartMatch = sidePrefix.match(/^(?:Left|Right)\s+Side\s*-\s*(.+)$/);
    const bodyPart = bodyPartMatch ? bodyPartMatch[1] : sidePrefix;
    // Combine body part with motions (no dash for abbreviated format)
    return [
      `${bodyPart} ${motionLabels[0]}`,
      `${bodyPart} ${motionLabels[1]}`,
    ];
  }

  // Extract body part for non-side-prefixed tests
  const bodyPart = extractBodyPart(testName);
  if (!bodyPart) return null;

  // Combine body part with motions
  return [
    `${bodyPart} - ${motionLabels[0]}`,
    `${bodyPart} - ${motionLabels[1]}`,
  ];
}

/**
 * Gets the area evaluated labels for the left and right rows using full motion names
 * Used in detailed individual test results display
 * Based on body part and paired motions
 * Examples:
 * testName: "Lumbar Flexion/Extension" -> ["Lumbar - Flexion", "Lumbar - Extension"]
 * For straight leg raise tests: testName: "Lumbar Straight Leg Raise" -> ["Left Side-Lumbar Straight Leg Raise", "Right Side-Lumbar Straight Leg Raise"]
 */
function getFullAreaEvaluatedLabels(testName, testId) {
  if (!testName) return null;

  const id = (testId || "").toLowerCase();
  const name = (testName || "").toLowerCase();
  const combined = `${id} ${name}`;

  // Special case: for thumb IP flexion, use custom side labels
  if (id.includes("thumb-ip-flexion") && !id.includes("extension") && !id.includes("-left") && !id.includes("-right")) {
    return [
      "Left Side-Thumb IP Flexion",
      "Right Side-Thumb IP Flexion",
    ];
  }

  // Special case: for cervical spine rotation, use custom side labels
  if (id.includes("cervical-spine-rotation") && !id.includes("-left") && !id.includes("-right")) {
    return [
      "Left Side-Cervical Rotation",
      "Right Side-Cervical Rotation",
    ];
  }
      // Special case: for cervical spine rotation, use custom side labels
  if (id.includes("cervical-spine-lateral-flexion") && !id.includes("-left") && !id.includes("-right")) {
    return [
      "Left Side-Cervical Lateral Flexion",
      "Right Side-Cervical Lateral Flexion",
    ];
  }

   // Special case: for cervical spine rotation, use custom side labels
  if (id.includes("lumbar-spine-lateral-flexion") && !id.includes("-left") && !id.includes("-right")) {
    return [
      "Left Side-Lumbar Lateral Flexion",
      "Right Side-Lumbar Lateral Flexion",
    ];
  }
  

    // Special case: for cervical spine rotation, use custom side labels
  if (id.includes("lumbar-spine-straight-leg-raise") && !id.includes("-left") && !id.includes("-right")) {
    return [
      "Left Side-Lumbar Straight Leg Raise",
      "Right Side-Lumbar Straight Leg Raise",
    ];
  }

     // Special case: for cervical spine rotation, use custom side labels
  if (id.includes("thoracic-spine-flexion") && !id.includes("-left") && !id.includes("-right")) {
    return [
      "Left Side-Thoracic Flexion",
      "Right Side-Thoracic Flexion",
    ];
  }

       // Special case: for cervical spine rotation, use custom side labels
  if (id.includes("thoracic-spine-rotation") && !id.includes("-left") && !id.includes("-right")) {
    return [
      "Left Side-Thoracic Rotation",
      "Right Side-Thoracic Rotation",
    ];
  }

  // Special case: for great toe IP flexion, use custom side labels
  if (id.includes("great-toe-ip-flexion") && !id.includes("mp") && !id.includes("-left") && !id.includes("-right")) {
    return [
      "Left Side-Toe IP Flexion",
      "Right Side-Toe IP Flexion",
    ];
  }

  // Special case: for thumb abduction, use full motion names in a specific format
  if (combined.includes("thumb-abduction") || combined.includes("thumb abduction")) {
    const fullMotionLabels = getFullMotionLabels(testId, testName);
    if (fullMotionLabels) {
      return [
        `${fullMotionLabels[0]} Thumb Abduction`,
        `${fullMotionLabels[1]} Thumb Abduction`,
      ];
    }
  }

  // Get paired motions (full names)
  const motionLabels = getFullMotionLabels(testId, testName);
  if (!motionLabels) return null;

  // Check if this test has a "Left Side -" or "Right Side -" prefix (from testId or testName)
  const sidePrefix = extractSidePrefix(testName, testId);

  if (sidePrefix) {
    // For side-prefixed tests, extract the body part (everything after "Left Side - " or "Right Side - ")
    const bodyPartMatch = sidePrefix.match(/^(?:Left|Right)\s+Side\s*-\s*(.+)$/);
    const bodyPart = bodyPartMatch ? bodyPartMatch[1] : sidePrefix;
    // Combine body part with motions (space, not dash, for consistency with side-prefixed format)
    return [
      `${bodyPart} ${motionLabels[0]}`,
      `${bodyPart} ${motionLabels[1]}`,
    ];
  }

  // Extract body part for non-side-prefixed tests
  const bodyPart = extractBodyPart(testName);
  if (!bodyPart) return null;

  // Combine body part with motions
  return [
    `${bodyPart} - ${motionLabels[0]}`,
    `${bodyPart} - ${motionLabels[1]}`,
  ];
}

module.exports = {
  getPairedMotionLabels,
  getPairedMotionLabelsFullNames,
  getFullMotionLabels,
  extractSidePrefix,
  extractBodyPart,
  getAreaEvaluatedLabels,
  getFullAreaEvaluatedLabels,
};
