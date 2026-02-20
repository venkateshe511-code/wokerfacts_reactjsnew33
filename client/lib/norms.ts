export type NormInfo = {
  unit: string; // e.g., 'lb', 'deg', 'bpm', ''
  left: number | null;
  right: number | null;
  category: "strength" | "rom" | "cardio" | "other";
};

function isGrip(name: string) {
  const n = name.toLowerCase();
  return n.includes("grip");
}

function isPinch(name: string) {
  const n = name.toLowerCase();
  return n.includes("pinch");
}

function isROM(name: string) {
  const n = name.toLowerCase();
  return (
    n.includes("range") ||
    n.includes("motion") ||
    n.includes("flexion") ||
    n.includes("extension") ||
    n.includes("abduction") ||
    n.includes("adduction") ||
    n.includes("rotation") ||
    n.includes("dorsi") ||
    n.includes("dorsiflexion") ||
    n.includes("palmar") ||
    n.includes("radial") ||
    n.includes("ulnar") ||
    n.includes("deviation")
  );
}

function isCardio(name: string) {
  const n = name.toLowerCase();
  return (
    n.includes("step") ||
    n.includes("cardio") ||
    n.includes("treadmill") ||
    n.includes("mcaft") ||
    n.includes("kasch")
  );
}

// Map ROM test names to norms (deg) mirroring values used in reports
function romNorm(name: string): { value: number | null } {
  const n = name.toLowerCase();
  if (n.includes("cervical")) {
    if (n.includes("flexion")) return { value: 45 };
    if (n.includes("extension")) return { value: 45 };
    if (n.includes("lateral")) return { value: 35 };
  }
  if (n.includes("lumbar")) {
    if (n.includes("flexion")) return { value: 80 };
    if (n.includes("extension")) return { value: 20 };
    if (n.includes("lateral")) return { value: 25 }; // based on report examples
  }
  if (n.includes("shoulder")) {
    if (n.includes("flexion")) return { value: 150 };
    if (n.includes("abduction")) return { value: 150 };
    if (n.includes("extension")) return { value: 45 };
    if (n.includes("internal") && n.includes("rotation")) return { value: 70 };
    if (n.includes("external") && n.includes("rotation")) return { value: 90 };
  }
  if (n.includes("wrist")) {
    // Typical wrist ROM norms
    if (
      n.includes("dorsiflexion") ||
      (n.includes("extension") && !n.includes("flexion"))
    )
      return { value: 70 };
    if (
      n.includes("palmar") ||
      (n.includes("flexion") && !n.includes("extension"))
    )
      return { value: 80 };
    if (n.includes("radial")) return { value: 20 };
    if (n.includes("ulnar")) return { value: 30 };
  }
  if (n.includes("hip")) {
    if (n.includes("flexion")) return { value: 90 };
    if (n.includes("extension")) return { value: 20 };
    if (n.includes("abduction")) return { value: 35 };
  }
  return { value: null };
}

export function inferNormsForTest(testName: string): NormInfo {
  if (!testName)
    return { unit: "", left: null, right: null, category: "other" };
  const name = testName.toLowerCase();

  if (isCardio(name)) {
    return { unit: "bpm", left: null, right: null, category: "cardio" };
  }

  // Strength/Grip defaults used in Review/Download tables
  // Check these BEFORE isROM to avoid misclassifying "Pinch Strength Palmar"
  if (isGrip(name)) {
    // Grip norms displayed in reports as 110.5 (L) | 120.8 (R) lb
    return { unit: "lb", left: 110.5, right: 120.8, category: "strength" };
  }
  if (isPinch(name)) {
    // Use generic strength fallback in lbs for display table
    return { unit: "lb", left: 85.0, right: 90.0, category: "strength" };
  }

  if (isROM(name)) {
    const rn = romNorm(name).value;
    return { unit: "deg", left: rn, right: rn, category: "rom" };
  }

  // Generic strength fallback
  if (
    name.includes("lift") ||
    name.includes("carry") ||
    name.includes("push") ||
    name.includes("pull") ||
    name.includes("strength") ||
    name.includes("force")
  ) {
    return { unit: "lb", left: 85.0, right: 90.0, category: "strength" };
  }

  return { unit: "", left: null, right: null, category: "other" };
}
