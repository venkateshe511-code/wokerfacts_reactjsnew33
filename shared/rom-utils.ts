/**
 * ROM (Range of Motion) Formatting Utilities
 * Handles formatting of ROM tests with left/right sides
 * Used consistently across both client and server
 */

export interface ROMTestInfo {
  testId?: string;
  testName?: string;
}

export interface ROMSideData {
  side: "Left" | "Right";
  label: string;
  value: number;
  norm?: number;
}

/**
 * Determines if a test is a paired ROM test (has both left and right sides)
 * Examples: "shoulder-rom-flexion-extension-left", "elbow-rom-flexion-extension-right"
 */
export function isPairedROMTest(testId?: string): boolean {
  if (!testId) return false;

  const id = testId.toLowerCase();

  // Check if it's a ROM test with left/right suffix
  return /\b(rom|range)\b/.test(id) && /(left|right)$/.test(id);
}

/**
 * Extracts the base test name without the left/right suffix
 * "shoulder-rom-flexion-extension-left" -> "shoulder-rom-flexion-extension"
 */
export function getBaseROMTestId(testId?: string): string {
  if (!testId) return "";

  return testId.replace(/-(left|right)$/i, "");
}

/**
 * Extracts the side from the test ID
 * "shoulder-rom-flexion-extension-left" -> "left"
 */
export function extractSideFromTestId(
  testId?: string,
): "left" | "right" | null {
  if (!testId) return null;

  const match = testId.match(/-(left|right)$/i);
  return match ? (match[1].toLowerCase() as "left" | "right") : null;
}

/**
 * Extracts the movement type from ROM test ID
 * "shoulder-rom-flexion-extension-left" -> ["flexion", "extension"]
 * "elbow-rom-flexion-extension-right" -> ["flexion", "extension"]
 */
export function extractMovementsFromROMTest(testId?: string): string[] {
  if (!testId) return [];

  const movements: string[] = [];
  const id = testId.toLowerCase();

  // List of known ROM movements
  const knownMovements = [
    "flexion",
    "extension",
    "abduction",
    "adduction",
    "rotation",
    "internal",
    "external",
    "supination",
    "pronation",
    "radial",
    "ulnar",
    "deviation",
    "dorsi",
    "plantar",
    "inversion",
    "eversion",
  ];

  knownMovements.forEach((movement) => {
    if (id.includes(movement)) {
      movements.push(movement);
    }
  });

  return movements;
}

/**
 * Formats a ROM test name to include the side explicitly
 * For example: "Shoulder Flexion/Extension" + "Left" -> "Left Side - Shoulder Flexion/Extension"
 */
export function formatROMTestWithSide(
  baseTestName: string,
  side: "left" | "right" | "Left" | "Right",
): string {
  const sideName = side.charAt(0).toUpperCase() + side.slice(1).toLowerCase();

  // Remove any existing side prefix to avoid duplication
  let cleanName = baseTestName.replace(/^(Left|Right)\s+Side\s*-\s*/i, "");

  return `${sideName} Side - ${cleanName}`;
}

/**
 * Creates display data for left and right sides from a paired ROM test
 */
export function createROMSideDisplayData(
  testName: string,
  side: "left" | "right",
  value: number,
  norm?: number,
): ROMSideData {
  const sideName = (side.charAt(0).toUpperCase() +
    side.slice(1).toLowerCase()) as "Left" | "Right";

  // Remove any side prefix for clean label
  let cleanLabel = testName.replace(/^(Left|Right)\s+Side\s*-\s*/i, "");

  return {
    side: sideName,
    label: `${sideName} Side - ${cleanLabel}`,
    value,
    norm,
  };
}

/**
 * Checks if a test should display separate left/right rows in the report
 */
export function shouldDisplaySeparateSideRows(testId?: string): boolean {
  return isPairedROMTest(testId);
}

/**
 * Gets the paired motion labels for tests like Flexion/Extension
 * Returns [firstMotion, secondMotion] or null if not a paired motion test
 * Example: "cervical-flexion-extension" -> ["Flexion", "Extension"]
 */
export function getPairedMotionLabels(
  testId?: string,
  testName?: string,
): [string, string] | null {
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
 * Extracts the side prefix (Left/Right) from a test name if present
 * Examples:
 * "Left Side - Extremity Shoulder Flexion/Extension" -> "Left Side - Extremity Shoulder"
 * "Right Side - Thumb IP Flexion/Extension" -> "Right Side - Thumb"
 * "Lumbar Flexion/Extension" -> null
 */
export function extractSidePrefix(testName?: string): string | null {
  if (!testName) return null;

  const name = testName.trim();

  // Check if name starts with "Left Side -" or "Right Side -"
  const sidePrefixMatch = name.match(/^(Left|Right)\s+Side\s*-\s*(.+?)(?:\s+(?:Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise|IP|MP|DIP|PIP).*)?$/i);
  if (sidePrefixMatch) {
    const sidePrefix = sidePrefixMatch[1];
    const rest = sidePrefixMatch[2];
    // Remove the motion part and return the side prefix with body part info
    const withoutMotion = rest.replace(/\s+(?:Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise).*$/i, "");
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
export function extractBodyPart(testName?: string): string | null {
  if (!testName) return null;

  const name = testName.trim();

  // For "Left Side -" or "Right Side -" format, extract what comes after and return the body part
  const sidePrefixMatch = name.match(/^(Left|Right)\s+Side\s*-\s*(.+?)(?:\s+(Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise).*)?$/i);
  if (sidePrefixMatch) {
    const restOfName = sidePrefixMatch[2];
    // Extract body part from "Extremity Shoulder" -> "Shoulder", or "Thumb", etc.
    const bodyPartMatch = restOfName.match(/(?:Extremity\s+)?([A-Z][a-zA-Z\s]+?)(?:\s+(?:IP|MP|DIP|PIP|Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise).*)?$/);
    if (bodyPartMatch) {
      return bodyPartMatch[1].trim();
    }
  }

  // For simple format like "Lumbar - Flexion/Extension"
  const simpleMatch = name.match(/^([A-Z][a-zA-Z\s]+?)\s*(?:-|:)\s*(?:Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise)/i);
  if (simpleMatch) {
    return simpleMatch[1].trim();
  }

  // For format like "Cervical Flexion/Extension"
  const basicMatch = name.match(/^([A-Z][a-zA-Z\s]+?)\s+(?:Flexion|Extension|Rotation|Abduction|Adduction|Supination|Pronation|Dorsi|Plantar|Inversion|Eversion|Radial|Ulnar|Deviation|Raise)/i);
  if (basicMatch) {
    return basicMatch[1].trim();
  }

  return null;
}

/**
 * Gets the area evaluated labels for the left and right rows
 * Based on body part and paired motions
 * Examples:
 * "Lumbar Flexion/Extension" -> ["Lumbar - Flexion", "Lumbar - Extension"]
 * "Left Side - Extremity Shoulder Flexion/Extension" -> ["Left Side - Extremity Shoulder - Flexion", "Left Side - Extremity Shoulder - Extension"]
 */
export function getAreaEvaluatedLabels(
  testName?: string,
  testId?: string,
): [string, string] | null {
  if (!testName) return null;

  // Get paired motions
  const motionLabels = getPairedMotionLabels(testId, testName);
  if (!motionLabels) return null;

  // Check if this test has a "Left Side -" or "Right Side -" prefix
  const sidePrefix = extractSidePrefix(testName);

  if (sidePrefix) {
    // For side-prefixed tests, preserve the full prefix
    return [
      `${sidePrefix} - ${motionLabels[0]}`,
      `${sidePrefix} - ${motionLabels[1]}`,
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
