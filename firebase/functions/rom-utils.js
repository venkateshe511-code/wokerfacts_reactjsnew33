/**
 * ROM (Range of Motion) Formatting Utilities for Node.js
 * Handles formatting of ROM tests with left/right sides
 * Mirrors the shared/rom-utils.ts functionality for server-side use
 */

/**
 * Gets paired motion labels for tests like Flexion/Extension
 * Returns [firstMotion, secondMotion] or null if not a paired motion test
 * Example: "cervical-flexion-extension" -> ["Flexion", "Extension"]
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
    // Remove the motion part from test name
    const withoutMotion = cleanName.replace(
      /\s+(?:Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise|IP|MP|DIP|PIP).*$/i,
      ""
    );
    return `${side} Side - ${withoutMotion}`;
  }

  // Fallback: Check if name starts with "Left Side -" or "Right Side -"
  const sidePrefixMatch = name.match(
    /^(Left|Right)\s+Side\s*-\s*(.+?)(?:\s+(?:Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise|IP|MP|DIP|PIP).*)?$/i
  );
  if (sidePrefixMatch) {
    const sidePrefix = sidePrefixMatch[1];
    const rest = sidePrefixMatch[2];
    // Remove the motion part and return the side prefix with body part info
    const withoutMotion = rest.replace(
      /\s+(?:Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise).*$/i,
      ""
    );
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
  const sidePrefixMatch = name.match(
    /^(Left|Right)\s+Side\s*-\s*(.+?)(?:\s+(Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise).*)?$/i
  );
  if (sidePrefixMatch) {
    const restOfName = sidePrefixMatch[2];
    // Extract body part from "Extremity Shoulder" -> "Shoulder", or "Thumb", etc.
    const bodyPartMatch = restOfName.match(
      /(?:Extremity\s+)?([A-Z][a-zA-Z\s]+?)(?:\s+(?:IP|MP|DIP|PIP|Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise).*)?$/
    );
    if (bodyPartMatch) {
      return bodyPartMatch[1].trim();
    }
  }

  // For simple format like "Lumbar - Flexion/Extension"
  const simpleMatch = name.match(
    /^([A-Z][a-zA-Z\s]+?)\s*(?:-|:)\s*(?:Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise)/i
  );
  if (simpleMatch) {
    return simpleMatch[1].trim();
  }

  // For format like "Cervical Flexion/Extension"
  const basicMatch = name.match(
    /^([A-Z][a-zA-Z\s]+?)\s+(?:Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise)/i
  );
  if (basicMatch) {
    return basicMatch[1].trim();
  }

  return null;
}

/**
 * Gets the area evaluated labels for the left and right rows
 * Based on body part and paired motions
 * Examples:
 * testName: "Lumbar Flexion/Extension" -> ["Lumbar - Flexion", "Lumbar - Extension"]
 * testId: "shoulder-rom-flexion-extension-left", testName: "Extremity Shoulder Flexion/Extension" -> ["Left Side - Extremity Shoulder - Flexion", "Left Side - Extremity Shoulder - Extension"]
 */
function getAreaEvaluatedLabels(testName, testId) {
  if (!testName) return null;

  // Get paired motions
  const motionLabels = getPairedMotionLabels(testId, testName);
  if (!motionLabels) return null;

  // Check if this test has a "Left Side -" or "Right Side -" prefix (from testId or testName)
  const sidePrefix = extractSidePrefix(testName, testId);

  if (sidePrefix) {
    // For side-prefixed tests, don't add another dash before the motion
    return [
      `${sidePrefix} ${motionLabels[0]}`,
      `${sidePrefix} ${motionLabels[1]}`,
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
  extractSidePrefix,
  extractBodyPart,
  getAreaEvaluatedLabels,
};
