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
