/**
 * Server-side norms utility
 * Mirrors client/lib/norms.ts to ensure consistency between ReviewReport and cloud-generated reports
 */

function isGrip(name) {
  const n = name.toLowerCase();
  return n.includes("grip");
}

function isPinch(name) {
  const n = name.toLowerCase();
  return n.includes("pinch");
}

function isROM(name) {
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

function isCardio(name) {
  const n = name.toLowerCase();
  return (
    n.includes("step") ||
    n.includes("cardio") ||
    n.includes("treadmill") ||
    n.includes("mcaft") ||
    n.includes("kasch")
  );
}

/**
 * Map ROM test names to norms (deg) based on standard clinical reference values
 */
function romNorm(name) {
  const n = name.toLowerCase();

  // Cervical Spine
  if (n.includes("cervical")) {
    if (n.includes("flexion")) return { value: 60 };
    if (n.includes("extension") || n.includes("hyperextension")) return { value: 75 };
    if (n.includes("lateral")) return { value: 45 };
    if (n.includes("rotation")) return { value: 80 };
  }

  // Thoraco-Lumbar / Lumbar Spine
  if (n.includes("lumbar") || n.includes("thoraco")) {
    if (n.includes("flexion")) return { value: 48 };
    if (n.includes("extension") || n.includes("hyperextension")) return { value: 25 };
    if (n.includes("lateral")) return { value: 25 };
    if (n.includes("rotation")) return { value: 30 };
  }

  // Shoulder
  if (n.includes("shoulder")) {
    if (n.includes("flexion")) return { value: 180 };
    if (n.includes("hyperextension")) return { value: 50 };
    if (n.includes("abduction")) return { value: 180 };
    if (n.includes("adduction")) return { value: 50 };
    if (n.includes("internal") && n.includes("rotation")) return { value: 90 };
    if (n.includes("external") && n.includes("rotation")) return { value: 90 };
  }

  // Elbow
  if (n.includes("elbow")) {
    if (n.includes("flexion")) return { value: 140 };
    if (n.includes("extension")) return { value: 0 };
  }

  // Forearm
  if (n.includes("forearm")) {
    if (n.includes("pronation")) return { value: 80 };
    if (n.includes("supination")) return { value: 80 };
  }

  // Wrist
  if (n.includes("wrist")) {
    if (n.includes("flexion") && !n.includes("extension")) return { value: 60 };
    if (n.includes("extension") && !n.includes("flexion")) return { value: 60 };
    if (n.includes("dorsiflexion")) return { value: 60 };
    if (n.includes("palmar")) return { value: 60 };
    if (n.includes("radial")) return { value: 20 };
    if (n.includes("ulnar")) return { value: 20 };
  }

  // Hip
  if (n.includes("hip")) {
    if (n.includes("flexion")) return { value: 100 };
    if (n.includes("extension") || n.includes("hyperextension")) return { value: 30 };
    if (n.includes("abduction")) return { value: 40 };
    if (n.includes("adduction")) return { value: 20 };
    if (n.includes("internal") && n.includes("rotation")) return { value: 40 };
    if (n.includes("external") && n.includes("rotation")) return { value: 50 };
  }

  // Knee
  if (n.includes("knee")) {
    if (n.includes("flexion")) return { value: 150 };
    if (n.includes("extension")) return { value: 0 };
  }

  // Ankle
  if (n.includes("ankle")) {
    if (n.includes("plantarflexion")) return { value: 40 };
    if (n.includes("dorsiflexion")) return { value: 30 };
  }

  return { value: null };
}

/**
 * Infer norms for a test based on its name
 * Returns { unit: string, left: number|null, right: number|null, category: string }
 */
function inferNormsForTest(testName) {
  if (!testName) {
    return { unit: "", left: null, right: null, category: "other" };
  }

  const name = testName.toLowerCase();

  if (isCardio(name)) {
    return { unit: "bpm", left: null, right: null, category: "cardio" };
  }

  // Strength/Grip defaults - check BEFORE isROM to avoid misclassifying "Pinch Strength Palmar"
  if (isGrip(name)) {
    // Grip norms: 110.5 (L) | 120.8 (R) lb
    return { unit: "lb", left: 110.5, right: 120.8, category: "strength" };
  }

  if (isPinch(name)) {
    // Pinch norms: 85.0 (L) | 90.0 (R) lb
    return { unit: "lb", left: 85.0, right: 90.0, category: "strength" };
  }

  if (isROM(name)) {
    const rn = romNorm(name).value;
    return { unit: "deg", left: rn, right: rn, category: "rom" };
  }

  // Generic strength fallback
  return { unit: "lb", left: null, right: null, category: "strength" };
}

module.exports = {
  inferNormsForTest,
  isGrip,
  isPinch,
  isROM,
  isCardio,
  romNorm,
};
