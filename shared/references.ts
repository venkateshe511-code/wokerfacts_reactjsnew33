export interface Reference {
  author: string;
  title: string;
  journal?: string;
  year: number;
  volume?: string;
  pages?: string;
  publisher?: string;
}

export interface TestCategoryReferences {
  [key: string]: Reference[];
}

export const testReferences: TestCategoryReferences = {
  // Static Lift Strength
  "static-lift": [
    {
      author: "William M. Keyserling",
      title:
        "Isometric Strength Testing in Selecting Workers for Strenuous Jobs",
      journal: "University of Michigan",
      year: 1979,
    },
    {
      author: "Don B. Chaffin, PhD.",
      title: "Pre-employment Strength Testing: An Updated Position",
      journal: "Journal of Occupational Medicine",
      year: 1978,
      volume: "Vol. 20 No. 6",
      pages: "June 1978",
    },
    {
      author: "Donald Badges PhD.",
      title: "Work Practices Guide to Manual Lifting",
      publisher: "NIOSH",
      year: 1981,
    },
    {
      author: "Don Chaffin, PhD.",
      title: "Ergonomics Guide for the Assessment of Human Static Strength",
      journal: "American Industrial Hygiene Association Journal",
      year: 1975,
      pages: "July 1975",
    },
    {
      author: "Harber & SooHoo",
      title:
        "Static Ergonomic Strength Testing in Evaluating Occupational Back Pain",
      journal: "Journal of Occupational Medicine",
      year: 1984,
      volume: "Vol. 26 No. 12",
      pages: "Dec 1984",
    },
  ],

  // Dynamic Lift Strength
  "dynamic-lift": [
    {
      author: "Mayer et al.",
      title:
        "Progressive Iso-inertial Lifting Evaluation: A Standardized Protocol and Normative Database",
      journal: "Spine",
      year: 1988,
      volume: "Volume 13 Num. 9",
      pages: "pp. 993",
    },
  ],

  // Hand Dynamometer and Pinch Grip
  "hand-strength": [
    {
      author: "V. Mathiowetz et al.",
      title: "Grip and Pinch Strength: Normative Data for Adults",
      journal: "Arch Pys Med Rehab",
      year: 1985,
      volume: "Vol. 66",
      pages: "pp. 69 (Feb 1985)",
    },
    {
      author: "H. Stokes",
      title: "The Seriously Uninjured Hand-Weakness of Grip",
      journal: "Journal of Occupational Medicine",
      year: 1983,
      pages: "pp. 683-684 (Sep 1983)",
    },
    {
      author: "L. Matheson, et al.",
      title:
        "Grip Strength in a Disabled Sample: Reliability and Normative Standards",
      journal: "Industrial Rehabilitation Quarterly",
      year: 1988,
      volume: "Vol. 1, no. 3",
      pages: "Fall 1988",
    },
    {
      author: "Hildreth et al.",
      title: "Detection of Submaximal effort by use of the rapid exchange grip",
      journal: "Journal of Hand Surgery",
      year: 1989,
      pages: "pp. 742 (Jul 1989)",
    },
  ],

  // Pinch Strength
  "pinch-strength": [
    {
      author: "V. Mathiowetz et al.",
      title: "Grip and Pinch Strength: Normative Data for Adults",
      journal: "Arch Pys Med Rehab",
      year: 1985,
      volume: "Vol. 66",
      pages: "pp. 69 (Feb 1985)",
    },
    {
      author: "H. Stokes",
      title: "The Seriously Uninjured Hand-Weakness of Grip",
      journal: "Journal of Occupational Medicine",
      year: 1983,
      pages: "pp. 683-684 (Sep 1983)",
    },
    {
      author: "L. Matheson, et al.",
      title:
        "Grip Strength in a Disabled Sample: Reliability and Normative Standards",
      journal: "Industrial Rehabilitation Quarterly",
      year: 1988,
      volume: "Vol. 1, no. 3",
      pages: "Fall 1988",
    },
    {
      author: "Hildreth et al.",
      title: "Detection of Submaximal effort by use of the rapid exchange grip",
      journal: "Journal of Hand Surgery",
      year: 1989,
      pages: "pp. 742 (Jul 1989)",
    },
  ],

  // Range of Motion
  "range-of-motion": [
    {
      author: "American Medical Association",
      title: "Guides to the Evaluation of Permanent Impairment",
      year: 1993,
      publisher: "4th ed.",
      pages: "pp. 112-135",
    },
    {
      author: "American Medical Association",
      title: "Guides to the Evaluation of Permanent Impairment",
      year: 1990,
      publisher: "3rd ed.",
      pages: "pp. 81-102",
    },
  ],

  // Goniometers
  goniometers: [
    {
      author: "American Medical Association",
      title: "Guides to the Evaluation of Permanent Impairment",
      year: 1993,
      publisher: "4th ed.",
      pages: "pp. 90-92",
    },
    {
      author: "American Medical Association",
      title: "Guides to the Evaluation of Permanent Impairment",
      year: 1990,
      publisher: "3rd ed.",
      pages: "pp. 20-38, 101",
    },
  ],

  // Manual Muscle Tester
  "muscle-test": [
    {
      author: "A.W. Andrews",
      title: "Hand-held Dynamometry for Measuring Muscle Strength",
      journal: "Journal of Human Muscle Performance",
      year: 1991,
      pages: "pp. 35 (Jun 1991)",
    },
  ],

  // Horizontal Validity
  "horizontal-validity": [
    {
      author: "Berryhill et al",
      title:
        "Horizontal Strength Changes: An Ergometric Measure for Determining Validity of Effort in Impairment Evaluations-A Preliminary Report",
      journal: "Journal of Disability",
      year: 1993,
      volume: "Vol. 3, Num. 14",
      pages: "pp. 143, (Jul 1993)",
    },
    {
      author: "L. A. Owens",
      title:
        "Assessing Reliability of Performance in the Functional Capacity Assessment",
      journal: "Journal of Disability",
      year: 1993,
      volume: "Vol. 3, Num. 14",
      pages: "pp. 149, (Jul 1993)",
    },
  ],

  // Method Time Measurement (MTM)
  mtm: [
    {
      author: "Anderson, D.S. and Edstrom D.P.",
      title:
        "MTM Personnel Selection Tests; Validation at a Northwestern National Life Insurance Company",
      journal: "Journal of Methods-Time Measurement",
      year: 1975,
      volume: "15, (3)",
    },
    {
      author: "Birdsong, J.H. and Chyatte, S.B.",
      title: "Further medical applications of methods-time measurement",
      journal: "Journal of Methods-Time Measurement",
      year: 1970,
      volume: "15",
      pages: "19-27",
    },
    {
      author: "Brickey",
      title: "MTM in a Sheltered Workshop",
      journal: "Journal of Methods-Time Measurement",
      year: 1975,
      volume: "8, (3)",
      pages: "2-7",
    },
    {
      author: "Chyatte, S.B. and Birdsong, J.H.",
      title: "Methods time measurement in assessment of motor performance",
      journal: "Archives of Physical Medicine and Rehabilitation",
      year: 1972,
      volume: "53",
      pages: "38-44",
    },
    {
      author: "Foulke, J.A.",
      title: "Estimating Individual Operator Performance",
      journal: "Journal of Methods-Time Measurement",
      year: 1975,
      volume: "15, (1)",
      pages: "18-23",
    },
    {
      author: "Grant, G.W.B., Moores, B. and Whelan, E.",
      title:
        "Applications of Methods-time measurement in training centers for the mentally handicapped",
      journal: "Journal of Methods-Time Measurement",
      year: 1975,
      volume: "11",
      pages: "23-30",
    },
  ],

  // Bruce Treadmill Test
  "bruce-treadmill": [
    {
      author: "Bruce, R. A., et al.",
      title:
        "Maximal oxygen intake and nomographic assessment of functional aerobic impairment in cardiovascular disease",
      journal: "Am Heart J",
      year: 1973,
      fullText:
        'Bruce, R. A., et al. "Maximal oxygen intake and nomographic assessment of functional aerobic impairment in cardiovascular disease." Am Heart J (1973).',
    },
    {
      author: "Acampa, W., Assante, R., Zampella, E.",
      title: "The role of treadmill exercise testing",
      journal: "J Nucl Cardiol",
      year: 2016,
      volume: "23(5)",
      pages: "991-996",
      fullText:
        "Acampa W, Assante R, Zampella E. The role of treadmill exercise testing. J Nucl Cardiol. 2016 Oct;23(5):991-996. [PubMed]",
    },
    {
      author:
        "Qureshi, W.T., Alirhayim, Z., Blaha, M.J., Juraschek, S.P., Keteyian, S.J., Brawner, C.A., Al-Mallah, M.H.",
      title:
        "Cardiorespiratory Fitness and Risk of Incident Atrial Fibrillation: Results From the Henry Ford Exercise Testing (FIT) Project",
      journal: "Circulation",
      year: 2015,
      volume: "131(21)",
      pages: "1827-34",
      fullText:
        "Qureshi WT, Alirhayim Z, Blaha MJ, Juraschek SP, Keteyian SJ, Brawner CA, Al-Mallah MH. Cardiorespiratory Fitness and Risk of Incident Atrial Fibrillation: Results From the Henry Ford Exercise Testing (FIT) Project. Circulation. 2015 May 26;131(21):1827-34. [PubMed]",
    },
    {
      author: "Gorman, M.W., Feigl, E.O.",
      title: "Control of coronary blood flow during exercise",
      journal: "Exerc Sport Sci Rev",
      year: 2012,
      volume: "40(1)",
      pages: "37-42",
      fullText:
        "Gorman MW, Feigl EO. Control of coronary blood flow during exercise. Exerc Sport Sci Rev. 2012 Jan;40(1):37-42. [PubMed]",
    },
  ],

  // mCAFT Test
  mcaft: [
    {
      author:
        "Emily Wolfe Phillips, Deepa P. Rao, Leonard A. Kaminsky, Grant R. Tomkinson, Robert Ross, and Justin J. Lang",
      title:
        "Criterion-referenced mCAFT cut-points to identify metabolically healthy cardiorespiratory fitness among adults aged 18–69 years: an analysis of the Canadian Health Measures Survey",
      journal: "Applied Physiology, Nutrition, and Metabolism",
      year: 2020,
      fullText:
        "Criterion-referenced mCAFT cut-points to identify metabolically healthy cardiorespiratory fitness among adults aged 18–69 years: an analysis of the Canadian Health Measures Survey: Emily Wolfe Phillips, Deepa P. Rao, Leonard A. Kaminsky, Grant R. Tomkinson, Robert Ross, and Justin J. Lang : Applied Physiology, Nutrition, and Metabolism 26 March 2020",
    },
    {
      author: "Statistics Canada",
      title: "Normative-referenced percentile values for physical fitness",
      journal: "Health Reports",
      year: 2019,
      fullText:
        "Health Reports, Vol. 30, no. 10, pp. 14-22, October 2019 • Statistics Canada, Catalogue no. 82-003-X: Normative-referenced percentile values for physical fitness",
    },
  ],

  // Kasch Step Test
  kasch: [
    {
      author:
        "Kasch, F. W., Phillips, W. H., Ross, W. D., Carter, J. E., & Boyer, J. L.",
      title:
        "A comparison of maximal oxygen uptake by treadmill and step-test procedures",
      journal: "Journal of Applied Physiology",
      year: 1966,
      volume: "21(4)",
      pages: "1387–1389",
      fullText:
        "Kasch, F. W., Phillips, W. H., Ross, W. D., Carter, J. E., & Boyer, J. L. (1966). A comparison of maximal oxygen uptake by treadmill and step-test procedures. Journal of Applied Physiology, 21(4), 1387–1389. This article, available through the American Physiological Society Journal, is a primary source for the test's validation.",
    },
    {
      author: "Kasch, F. W., & Boyer, J. L.",
      title: "Adult fitness: Principles and practices",
      publisher: "KASCH",
      year: 1968,
      fullText:
        "Kasch, F. W., & Boyer, J. L. (1968). Adult fitness: Principles and practices. KASCH. This work established the use of the recovery heart rate for fitness classification.",
    },
  ],
};

// Helper function to get references for a specific test type
export const getReferencesForTest = (testId: string): Reference[] => {
  // Map test IDs to reference categories
  const testToCategory: { [key: string]: string } = {
    // Static Lift Tests
    "static-lift-low": "static-lift",
    "static-lift-mid": "static-lift",
    "static-lift-high": "static-lift",

    // Dynamic Lift Tests
    "dynamic-lift-low": "dynamic-lift",
    "dynamic-lift-mid": "dynamic-lift",
    "dynamic-lift-high": "dynamic-lift",
    "dynamic-lift-overhead": "dynamic-lift",
    "dynamic-lift-frequent": "dynamic-lift",
    "dynamic-infrequent-lift-low": "dynamic-lift",
    "dynamic-infrequent-lift-mid": "dynamic-lift",
    "dynamic-infrequent-lift-high": "dynamic-lift",
    "dynamic-infrequent-lift-overhead": "dynamic-lift",

    // Hand Strength Tests
    "hand-strength-standard": "hand-strength",
    "hand-strength-rapid-exchange": "hand-strength",
    "hand-strength-mve": "hand-strength",
    "hand-strength-mmve": "hand-strength",
    "grip-strength": "hand-strength",

    // Pinch Strength Tests
    "pinch-strength-key": "pinch-strength",
    "pinch-strength-tip": "pinch-strength",
    "pinch-strength-palmar": "pinch-strength",
    "pinch-strength-grasp": "pinch-strength",
    "key-pinch": "pinch-strength",
    "tip-pinch": "pinch-strength",
    "palmar-pinch": "pinch-strength",

    // Range of Motion Tests (Cervical, Lumbar, etc.)
    "cervical-flexion-extension": "range-of-motion",
    "cervical-lateral-flexion": "range-of-motion",
    "cervical-30-rotation": "range-of-motion",
    "cervical-60-rotation": "range-of-motion",
    "cervical-spine-flexion-extension": "range-of-motion",
    "cervical-spine-lateral-flexion": "range-of-motion",
    "cervical-spine-rotation": "range-of-motion",
    "lumbar-spine-flexion-extension": "range-of-motion",
    "lumbar-spine-lateral-flexion": "range-of-motion",
    "lumbar-spine-straight-leg-raise": "range-of-motion",
    "thoracic-spine-flexion": "range-of-motion",
    "thoracic-spine-rotation": "range-of-motion",
    "shoulder-rom-flexion-extension": "range-of-motion",
    "shoulder-rom-internal-external-rotation": "range-of-motion",
    "shoulder-rom-abduction-adduction": "range-of-motion",
    "hip-rom-flexion-extension": "range-of-motion",
    "hip-rom-internal-external-rotation": "range-of-motion",
    "hip-rom-abduction-adduction": "range-of-motion",
    "knee-rom-flexion-extension": "range-of-motion",
    "ankle-rom-dorsi-plantar-flexion": "range-of-motion",
    "ankle-rom-inversion-eversion": "range-of-motion",
    "elbow-rom-flexion-extension": "range-of-motion",
    "elbow-rom-supination-pronation": "range-of-motion",
    "wrist-rom-flexion-extension": "range-of-motion",
    "wrist-rom-radial-ulnar-deviation": "range-of-motion",

    // Hand/Foot ROM (uses goniometers)
    "thumb-ip-flexion-extension": "goniometers",
    "thumb-mp-flexion-extension": "goniometers",
    "thumb-abduction": "goniometers",
    "index-dip-flexion-extension": "goniometers",
    "index-pip-flexion-extension": "goniometers",
    "index-mp-flexion-extension": "goniometers",
    "middle-dip-flexion-extension": "goniometers",
    "middle-pip-flexion-extension": "goniometers",
    "middle-mp-flexion-extension": "goniometers",
    "ring-dip-flexion-extension": "goniometers",
    "ring-pip-flexion-extension": "goniometers",
    "ring-mp-flexion-extension": "goniometers",
    "little-dip-flexion-extension": "goniometers",
    "little-pip-flexion-extension": "goniometers",
    "little-mp-flexion-extension": "goniometers",
    "great-toe-ip-flexion": "goniometers",
    "great-toe-mp-dorsi-plantar-flexion": "goniometers",
    "2nd-toe-mp-dorsi-plantar-flexion": "goniometers",
    "3rd-toe-mp-dorsi-plantar-flexion": "goniometers",
    "4th-toe-mp-dorsi-plantar-flexion": "goniometers",
    "5th-toe-mp-dorsi-plantar-flexion": "goniometers",

    // Muscle Tests
    "hip-muscle-flexion": "muscle-test",
    "hip-muscle-extension": "muscle-test",
    "hip-muscle-abduction": "muscle-test",
    "hip-muscle-adduction": "muscle-test",
    "hip-muscle-external-rotation": "muscle-test",
    "hip-muscle-internal-rotation": "muscle-test",
    "shoulder-muscle-flexion": "muscle-test",
    "shoulder-muscle-extension": "muscle-test",
    "shoulder-muscle-abduction": "muscle-test",
    "shoulder-muscle-adduction": "muscle-test",
    "shoulder-muscle-internal-rotation": "muscle-test",
    "shoulder-muscle-external-rotation": "muscle-test",
    "wrist-muscle-flexion": "muscle-test",
    "wrist-muscle-extension": "muscle-test",
    "wrist-muscle-radial-deviation": "muscle-test",
    "wrist-muscle-ulnar-deviation": "muscle-test",
    "ankle-muscle-dorsiflexion": "muscle-test",
    "ankle-muscle-plantar-flexion": "muscle-test",
    "ankle-muscle-eversion": "muscle-test",
    "ankle-muscle-inversion": "muscle-test",
    "knee-muscle-flexion": "muscle-test",
    "knee-muscle-extension": "muscle-test",
    "elbow-muscle-flexion": "muscle-test",
    "elbow-muscle-extension": "muscle-test",

    // MTM/Occupational Tests
    fingering: "mtm",
    "bi-manual-fingering": "mtm",
    handling: "mtm",
    "bi-manual-handling": "mtm",
    "reach-immediate": "mtm",
    "reach-overhead": "mtm",
    "reach-with-weight": "mtm",

    // Cardio Tests
    "bruce-treadmill": "bruce-treadmill",
    "treadmill-test": "bruce-treadmill",
    "bruce-test": "bruce-treadmill",
    mcaft: "mcaft",
    "mcaft-test": "mcaft",
    "step-test": "mcaft",
    kasch: "kasch",
    "kasch-test": "kasch",
    "kasch-step": "kasch",
  };

  const category = testToCategory[testId];
  return category ? testReferences[category] || [] : [];
};

// Helper function to format a reference
export const formatReference = (
  reference: Reference & { fullText?: string },
): string => {
  // If fullText is provided, use it directly
  if (reference.fullText) {
    return reference.fullText;
  }

  let formatted = `${reference.title}, ${reference.author}`;

  if (reference.journal) {
    formatted += `, ${reference.journal}`;
  }

  if (reference.volume) {
    formatted += `, ${reference.volume}`;
  }

  if (reference.pages) {
    formatted += `, ${reference.pages}`;
  } else if (reference.year) {
    formatted += ` (${reference.year})`;
  }

  if (reference.publisher && !reference.journal) {
    formatted += `, ${reference.publisher}`;
  }

  return formatted + ".";
};
