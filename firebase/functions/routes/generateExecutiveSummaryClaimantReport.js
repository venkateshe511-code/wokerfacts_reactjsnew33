const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  BorderStyle,
  ImageRun,
  WidthType,
  HeadingLevel,
  PageBreak,
  HeightRule,
  TableLayoutType,
  VerticalAlign,
  ShadingType,
  PageNumber,
  Footer,
  Header,
} = require("docx");
const {
  getSampleIllustrations,
  illustrationsToHtml,
} = require("../test-illustrations");
const router = express.Router();
const BRAND_COLOR = "1E3A8A";
const NARROW_FONT = "Arial Narrow";
const DEFAULT_FONT = "Arial";
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

// Helper functions for table cells
function createTableCellForPain(text, bold = false, background = "") {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 16 })],
        spacing: { before: 0, after: 0 },
      }),
    ],
    shading: background ? { type: "clear", fill: background } : undefined,
    margins: { top: 10, bottom: 10, left: 40, right: 40 },
  });
}

let globalSampleImageBuffer = null;

async function fetchImageBuffer(url) {
  try {
    if (!url) return null;
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data, "binary");
  } catch (e) {
    console.error("Image fetch error:", e.message, url);
    return null;
  }
}

async function getSampleImageBuffer() {
  if (!globalSampleImageBuffer) {
    globalSampleImageBuffer = await fetchImageBuffer(
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWK1bi8ireVtN4jstd8ciOgk1AhSSeuB5lkw&s",
    );
  }
  return globalSampleImageBuffer;
}

function createColoredSymbolCell(text) {
  // Split text into symbol and label
  const [symbol, ...rest] = text.trim().split(" ");
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: symbol + " ", bold: true, size: 16 }),
          new TextRun({ text: rest.join(" "), size: 16 }), // normal rest
        ],
        spacing: { before: 0, after: 0 },
      }),
    ],
    margins: { top: 10, bottom: 10, left: 40, right: 40 },
  });
}

const calculateCV = (measurements = {}) => {
  const vals = [
    measurements.trial1,
    measurements.trial2,
    measurements.trial3,
    measurements.trial4,
    measurements.trial5,
    measurements.trial6,
  ].filter((v) => typeof v === "number" && !isNaN(v) && v > 0);

  if (vals.length < 2) return 0;

  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance =
    vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avg) * 100;
  return Math.round(cv); // Round to 1 decimal place
};

// function extractValidTrials(measurements) {
//   if (!measurements || typeof measurements !== "object") return [];

//   const vals = [];
//   for (let i = 1; i <= 6; i++) {
//     const v = measurements[`trial${i}`];
//     if (typeof v === "number" && !isNaN(v) && v > 0) vals.push(v);
//   }

//   return vals;
// }

// function calculateCV(measurements = {}) {
//   const vals = extractValidTrials(measurements);
//   if (vals.length < 2) return 0;

//   const mean = vals.reduce((sum, v) => sum + v, 0) / vals.length;
//   const variance =
//     vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
//   const stdDev = Math.sqrt(variance);

//   const cv = (stdDev / mean) * 100;
//   return Math.round(cv * 10) / 10; // round to one decimal
// }

const calculateBilateralDeficiency = (leftAvg, rightAvg) => {
  if (!leftAvg || !rightAvg) return 0;
  const max = Math.max(leftAvg, rightAvg);
  const min = Math.min(leftAvg, rightAvg);
  const deficiency = ((max - min) / max) * 100;
  return Math.round(deficiency);
};

const getImageBuffer = async (src) => {
  if (!src || typeof src !== "string") return null;
  try {
    let buffer = null;
    if (/^data:image\//i.test(src)) {
      const base64 = (src.split(",")[1] || "").replace(/\s/g, "");
      if (base64) buffer = Buffer.from(base64, "base64");
    } else if (/^https?:\/\//i.test(src)) {
      const resp = await fetch(src);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arr = await resp.arrayBuffer();
      buffer = Buffer.from(arr);
    } else {
      const abs = path.isAbsolute(src) ? src : path.resolve(src);
      if (fs.existsSync(abs)) buffer = fs.readFileSync(abs);
    }

    if (buffer) {
      try {
        const tmpPath = path.join(os.tmpdir(), `docx_img_${Date.now()}.bin`);
        fs.writeFileSync(tmpPath, buffer);
      } catch { }
    }

    return buffer;
  } catch (e) {
    return null;
  }
};

const noBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "FFFFFF" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "FFFFFF" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "FFFFFF" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "FFFFFF" },
};

// helper functions
function createHeaderCell(text) {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text, bold: true, color: "#000000", size: 16 }),
        ],
      }),
    ],
    shading: { fill: "FFFF99" }, // light yellow header fill
    margins: {
      top: 150, // padding inside the cell (in twips)
      bottom: 150,
      left: 150,
      right: 150,
    },
  });
}

function createSideTrialTable(
  test,
  measurementUnit,
  forceSingleRowOnly = false,
) {
  // --- Unit detection ---

  const safeName = test?.testName || "Test";
  const testNameLower = safeName.toLowerCase();
  const isRangeOfMotion =
    testNameLower.includes("flexion") ||
    testNameLower.includes("extension") ||
    testNameLower.includes("range") ||
    testNameLower.includes("thumb") ||
    testNameLower.includes("rotation") ||
    testNameLower.includes("raise") ||
    testNameLower.includes("supination") ||
    testNameLower.includes("radial") ||
    testNameLower.includes("abduction") ||
    testNameLower.includes("inversion");
  const name = (test?.testName || "").toLowerCase();
  const rawUnit = String(
    measurementUnit || test.unitMeasure || "",
  ).toLowerCase();
  const unit = isRangeOfMotion
    ? "°"
    : !rawUnit || rawUnit === "weight"
      ? "lbs"
      : rawUnit;
  // const unit =
  //   measurementUnit ||
  //   test?.unitMeasure ||
  //   test?.valueToBeTestedUnit ||
  //   test?.unit ||
  //   test?.units ||
  //   (name.match(/(rom|range|flexion|extension|deg)/)
  //     ? "°"
  //     : name.match(/(weight|strength|force|pressure|load|grip|resistance|torque)/)
  //       ? "lbs"
  //       : "lbs");

  // --- Helpers ---
  const toNumber = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
      const n = Number(v.replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const readTrials = (src) => {
    if (!src) return [];
    if (Array.isArray(src)) return src.map(toNumber);
    if (typeof src === "object") {
      const out = [];
      for (let i = 1; i <= 30; i++) {
        const key = [`trial${i}`, `t${i}`, String(i)].find(
          (k) => src[k] != null,
        );
        if (key) out.push(toNumber(src[key]));
      }
      return out;
    }
    return [];
  };

  const average = (arr) => {
    const nums = arr.filter((v) => v != null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };

  const formatVal = (v) => {
    if (!Number.isFinite(v)) return "";
    return Math.abs(v) % 1 === 0 ? String(v) : v.toFixed(1);
  };

  // --- Extract trials ---
  let leftTrials = readTrials(test?.leftMeasurements);
  let rightTrials = readTrials(test?.rightMeasurements);
  let singleTrials = readTrials(test?.measurements);

  // For single-row-only mode (like lift tests), if we only have left trials, treat as single row
  if (
    forceSingleRowOnly &&
    singleTrials.length === 0 &&
    leftTrials.length > 0
  ) {
    singleTrials = leftTrials;
    leftTrials = [];
    rightTrials = [];
  }

  const trialCount = Math.max(
    leftTrials.length,
    rightTrials.length,
    singleTrials.length,
  );
  const trialHeaders = Array.from(
    { length: trialCount },
    (_, i) => `Trial ${i + 1}`,
  );

  // --- Averages ---
  const leftAvgNum = average(leftTrials);
  const rightAvgNum = average(rightTrials);
  const singleAvgNum = average(singleTrials);

  const makeCell = (text, options = {}) =>
    new TableCell({
      margins: { top: 100, bottom: 100, left: 150, right: 150 },
      shading: options.shading ? { fill: "FFFF99" } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: text ?? "",
              bold: options.bold || false,
              size: 16,
            }),
          ],
        }),
      ],
    });

  const averageLabel = isRangeOfMotion
    ? "Average (range of motion)"
    : "Average (weight)";

  const rows = [];

  // --- Header row ---
  const headerCells = [
    ...(!forceSingleRowOnly && (leftTrials.length || rightTrials.length)
      ? [makeCell("Side", { bold: true, shading: true })]
      : []),
    ...trialHeaders.map((h) => makeCell(h, { bold: true, shading: true })),
    makeCell(averageLabel, { bold: true, shading: true }),
  ];
  rows.push(new TableRow({ children: headerCells }));
  // --- Detect type ---
  const isSideBased =
    !forceSingleRowOnly && (leftTrials.length || rightTrials.length);
  if (isSideBased) {
    // ✅ Both Left and Right have real data → build both rows
    rows.push(
      new TableRow({
        children: [
          makeCell("Left", { bold: true }),
          ...trialHeaders.map((_, i) =>
            makeCell(
              leftTrials[i] != null ? `${formatVal(leftTrials[i])}` : "",
            ),
          ),
          makeCell(
            leftAvgNum != null ? `${leftAvgNum.toFixed(1)} ${unit}` : "-",
            { bold: true },
          ),
        ],
      }),
    );

    rows.push(
      new TableRow({
        children: [
          makeCell("Right", { bold: true }),
          ...trialHeaders.map((_, i) =>
            makeCell(
              rightTrials[i] != null ? `${formatVal(rightTrials[i])}` : "",
            ),
          ),
          makeCell(
            rightAvgNum != null ? `${rightAvgNum.toFixed(1)} ${unit}` : "-",
            { bold: true },
          ),
        ],
      }),
    );
  } else {
    // ✅ Only one set (either singleMeasurements, or only left/right side exists)
    rows.push(
      new TableRow({
        children: [
          ...trialHeaders.map((_, i) => {
            const v = singleTrials[i];
            return makeCell(v != null ? `${formatVal(v)} ${unit}` : "");
          }),
          makeCell(
            singleAvgNum != null ? `${singleAvgNum.toFixed(1)} ${unit}` : "-",
            { bold: true },
          ),
        ],
      }),
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    rows,
  });
}

function createDataRow(values) {
  return new TableRow({
    children: values.map(
      (val) =>
        new TableCell({
          margins: {
            top: 150,
            bottom: 150,
            left: 150,
            right: 150,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: val, size: 16 })],
            }),
          ],
        }),
    ),
  });
}

//
// === Helper Tables ===
//
function generateLumbarMotionTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Area Evaluated"),
          createHeaderCell("Data"),
          createHeaderCell("Valid?"),
          createHeaderCell("Norm"),
          createHeaderCell("% of Norm"),
        ],
      }),
      createDataRow(["Lumbar Flexion", "49°", "Pass", "60°", "82%"]),
      createDataRow(["Lumbar Extension", "28°", "Pass", "25°", "112%"]),
      createDataRow(["Lateral Flexion - Left", "27°", "Pass", "25°", "108%"]),
      createDataRow(["Lateral Flexion - Right", "25°", "Pass", "25°", "116%"]),
    ],
  });
}

// format date first
const currentDate = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Helper: calculate average of L/R readings
const calculateAverage = (measurements) => {
  if (!measurements || typeof measurements !== "object") return 0;
  const values = Object.values(measurements).filter(
    (v) => typeof v === "number" && !isNaN(v),
  );
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
};

//  Define all reference texts grouped by category
// const testReferences = {
//   "static-lift": [
//     "Matheson, L. N., et al. (1995). Development of a database of functional assessment measures related to work disability. *Journal of Occupational Rehabilitation*, 5(4), 191–204.",
//     "Snook, S. H., & Ciriello, V. M. (1991). The design of manual handling tasks: Revised tables of maximum acceptable weights and forces. *Ergonomics*, 34(9), 1197–1213.",
//     "NIOSH (1994). Applications Manual for the Revised NIOSH Lifting Equation. *U.S. Department of Health and Human Services, Cincinnati, OH.*",
//   ],

//   "dynamic-lift": [
//     "Matheson, L. N., et al. (2002). Reliability and validity of functional capacity evaluation using dynamic lifting tests. *Work*, 19(2), 87–93.",
//     "Waters, T. R., et al. (1993). Revised NIOSH equation for the design and evaluation of manual lifting tasks. *Ergonomics*, 36(7), 749–776.",
//     "Snook, S. H., & Ciriello, V. M. (1991). *Ergonomics*, 34(9), 1197–1213.",
//   ],

//   "hand-strength": [
//     "Mathiowetz, V., et al. (1985). Grip and pinch strength: Normative data for adults. *Archives of Physical Medicine and Rehabilitation*, 66(2), 69–74.",
//     "Innes, E., & Straker, L. (1999). Reliability of work-related assessments. *Work*, 13(2), 107–124.",
//   ],

//   "pinch-strength": [
//     "Mathiowetz, V., et al. (1985). Grip and pinch strength: Normative data for adults. *Archives of Physical Medicine and Rehabilitation*, 66(2), 69–74.",
//     "Peters, M. J., & Baldwin, M. L. (2007). Pinch strength measurement considerations in clinical evaluation. *Clinical Biomechanics*, 22(9), 1022–1028.",
//   ],

//   "range-of-motion": [
//     "American Academy of Orthopaedic Surgeons (AAOS). (1965). *Joint Motion: Method of Measuring and Recording.* Chicago: AAOS.",
//     "Norkin, C. C., & White, D. J. (2016). *Measurement of Joint Motion: A Guide to Goniometry.* F.A. Davis Company.",
//   ],

//   "muscle-test": [
//     "Kendall, F. P., et al. (2005). *Muscles: Testing and Function with Posture and Pain.* Lippincott Williams & Wilkins.",
//     "Medical Research Council (1978). *Aids to the Examination of the Peripheral Nervous System.* Her Majesty’s Stationery Office.",
//   ],

//   goniometers: [
//     "American Academy of Orthopaedic Surgeons (AAOS). (1965). *Joint Motion: Method of Measuring and Recording.*",
//     "Norkin, C. C., & White, D. J. (2016). *Measurement of Joint Motion: A Guide to Goniometry.*",
//   ],

//   mtm: [
//     "Maynard, W. S., & Stegemerten, G. (1948). *Methods-Time Measurement (MTM-1): The Foundation of Motion Time Systems.* McGraw-Hill.",
//     "Barnes, R. M. (1980). *Motion and Time Study: Design and Measurement of Work.* John Wiley & Sons.",
//   ],

//   "bruce-treadmill": [
//     "Bires, A. M., Lawson, D., Wasser, T. E., & Raber-Baer, D. (2013). Comparison of the Bruce and Modified Bruce treadmill protocols. *Journal of Nuclear Medicine Technology*, 41(4), 274–278.",
//     "Bruce, R. A., et al. (1973). Exercise testing in adult normal subjects and cardiac patients. *Annals of Clinical Research*, 3(3), 144–152.",
//   ],

//   mcaft: [
//     "Weller, I. M., Thomas, S., Gledhill, N., & Paterson, D. H. (1993). Prediction of maximal oxygen uptake from a modified Canadian Aerobic Fitness Test. *Canadian Journal of Applied Physiology*, 18(2), 175–188.",
//     "Weller, I. M., Thomas, S., Gledhill, N., & Paterson, D. H. (1995). A study to validate the Canadian Aerobic Fitness Test. *Canadian Journal of Applied Physiology*, 20(2), 211–221.",
//   ],

//   kasch: [
//     "Davis, J. A., & Wilmore, J. H. (1979). Validation of a bench stepping test for cardiorespiratory fitness classification of emergency service personnel. *Journal of Occupational Medicine*, 21(6), 501–506.",
//     "Kasch, F. W. (1961). A step test for assessing physical fitness in adults. *Journal of Physical Education*, 58, 37–39.",
//   ],
// };

const testReferences = {
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
      author: "Bruce AM, Lawson D, Wasser TE, Raber-Baer D",
      title:
        "Comparison of Bruce treadmill exercise test protocols: Is ramped Bruce equal or superior to standard bruce in producing clinically valid studies for patients presenting for evaluation of cardiac ischemia or arrhythmia with body mass index equal to or greater than 30?",
      journal: "J Nucl Med Technol",
      year: 2013,
      volume: "41(4)",
      pages: "274-8",
    },
    {
      author: "Poehlman CP, Llewellyn TL",
      title:
        "The Effects of Submaximal and Maximal Exercise on Heart Rate Variability",
      journal: "Int J Exerc Sci",
      year: 2019,
      volume: "12(9)",
      pages: "9-14",
    },
  ],

  // mCAFT Test
  mcaft: [
    {
      author: "Canadian Society for Exercise Physiology",
      title: "mCAFT: modified Canadian Aerobic Fitness Test",
      journal: "Health Canada",
      year: 2003,
    },
  ],

  // Kasch Step Test
  kasch: [
    {
      author: "Davis JA, Wilmore JH",
      title:
        "Validation of a bench stepping test for cardiorespiratory fitness classification of emergency service personnel",
      journal: "Journal of Occupational Medicine",
      year: 1979,
      pages: "PMID: 5014456",
    },
  ],

  // YMCA Step Test
  "ymca-step-test": [
    {
      author: "YMCA of the USA",
      title: "YMCA Fitness Testing and Assessment Manual",
      publisher: "Human Kinetics Publishers",
      year: 2000
    },
    {
      author: "Golding LA, Myers CR, Sinning WE",
      title: "Y's Way to Physical Fitness",
      publisher: "YMCA of the USA",
      year: 1989
    },
    {
      author:
        "Nguyen Thi Van Kieu, Su-Jin Jung, Sang-Wook Shin, Han-Wool Jung, Eun-Soo Jung, Yu Hui Won, Young-Gon Kim, Soo-Wan Chae",
      title:
        "The Validity of the YMCA 3-Minute Step Test for Estimating Maximal Oxygen Uptake in Healthy Korean and Vietnamese Adults",
      journal: "Healthcare",
      year: 2020,
      pmcid: "PMC7171059",
      pmid: "32328445"
    },
    {
      author: "Evan L. Matthews, Fiona M. Horvat, David A. Phillips",
      title:
        "Variable Height Step Test Provides Reliable Heart Rate Values During Virtual Cardiorespiratory Fitness Testing",
      journal: "Measurement in Physical Education and Exercise Science",
      year: 2021,
      pages: "155–164",
      doi: "10.1080/1091367X.2021.1964507"
    }
  ]
  ,

  // YMCA Submaximal Treadmill Test
  "ymca-submaximal-treadmill-test": [
    {
      author: "YMCA of the USA",
      title: "YMCA Fitness Testing and Assessment Manual",
      publisher: "Human Kinetics Publishers",
      year: 2000
    },
    {
      author: "Ebbeling CB, Ward A, Puleo EM, Widrick J, Rippe JM",
      title: "Development of a Single-Stage Submaximal Treadmill Walking Test",
      journal: "Medicine & Science in Sports & Exercise",
      year: 1991,
      volume: "23(8)",
      pages: "966–973"
    },
    {
      author:
        "P. R. Vehrs, James D. George, Gilbert W. Fellingham, Sharon Plowman",
      title:
        "Submaximal Treadmill Exercise Test to Predict VO2max in Fit Adults",
      journal: "Measurement in Physical Education and Exercise Science",
      year: 2007,
      volume: "11(2)",
      pages: "61–72",
      doi: "10.1080/10913670701294047"
    }
  ]
};
// Map test IDs to reference categories
const testToCategory = {
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
  "bruce-treadmill-test": "bruce-treadmill",
  "treadmill-test": "bruce-treadmill",
  "bruce-test": "bruce-treadmill",
  mcaft: "mcaft",
  "mcaft-test": "mcaft",
  "mcaft-step-test": "mcaft",
  "step-test": "mcaft",
  kasch: "kasch",
  "kasch-test": "kasch",
  "kasch-step": "kasch",
  "kasch-step-test": "kasch",
  "ymca-step-test": "ymca-step-test",
  "ymca-step": "ymca-step-test",
  "ymca-submaximal-treadmill-test": "ymca-submaximal-treadmill-test",
  "ymca-treadmill": "ymca-submaximal-treadmill-test",
};
const getReferencesForTest = (testId) => {
  const category = testToCategory[testId];
  return category && testReferences[category] ? testReferences[category] : [];
};

function formatReference(reference) {
  let formatted = `${reference.title}, ${reference.author}`;

  if (reference.journal) formatted += `, ${reference.journal}`;
  if (reference.volume) formatted += `, ${reference.volume}`;
  if (reference.pages) formatted += `, ${reference.pages}`;
  else if (reference.year) formatted += ` (${reference.year})`;
  if (reference.publisher && !reference.journal)
    formatted += `, ${reference.publisher}`;

  return formatted + ".";
}

// Build the "References" block as docx.Paragraph[].
function buildReferenceParagraphs(test, opts = {}) {
  const {
    includeHeading = true,
    font = "Arial",
    sizePt = 8,
    color = "444444",
    spacingAfter = 80,
    headingColor = "666666",
    headingSizePt = 9,
  } = opts;

  const toHalfPoints = (pt) => Math.round(pt * 2);

  const createPara = (text, bold = false, isHeading = false) =>
    new Paragraph({
      children: [
        new TextRun({
          text,
          bold,
          color: isHeading ? headingColor : color,
          font,
          size: toHalfPoints(isHeading ? headingSizePt : sizePt),
        }),
      ],
      spacing: { after: spacingAfter },
    });

  const output = [];

  if (includeHeading) {
    output.push(createPara("References:", true, true));
  }

  const refs = getReferencesForTest(test?.testId) || [];

  if (refs.length === 0) {
    output.push(
      createPara(
        "Grip and Pinch Strength: Normative Data for Adults, V. Mathiowetz et al., Arch Pys Med Rehab, Vol. 66, pp. 69 (Feb 1985).",
      ),
      createPara(
        "The Seriously Uninjured Hand-Weakness of Grip, H. Stokes, Journal of Occupational Medicine, pp. 683-684 (Sep 1983).",
      ),
      createPara(
        "Grip Strength in a Disabled Sample: Reliability and Normative Standards, L. Matheson, et al., Industrial Rehabilitation Quarterly, Vol. 1, no. 3, Fall 1988.",
      ),
      createPara(
        "Detection of Submaximal effort by use of the rapid exchange grip, Hildreth et al., Journal of Hand Surgery, pp. 742 (Jul 1989).",
      ),
    );
  } else {
    refs.forEach((ref) => output.push(createPara(formatReference(ref))));
  }

  return output;
}

// Load any image-like into Uint8Array (dataUrl | data | Blob/File | http URL)
async function loadImageAsUint8(source) {
  try {
    let buffer;

    if (!source) return null;

    // 🔍 Log cardio test images first
    if (
      source.includes("bruce") ||
      source.includes("kasch") ||
      source.includes("mcaft")
    ) {
      console.log("🫀 Loading cardio image source:", source);
    }
    // If starts with "/" — treat as local file under functions/
    if (source.startsWith("/")) {
      const localPath = path.join(process.cwd(), source);
      buffer = fs.readFileSync(localPath);
    } else if (fs.existsSync(source)) {
      buffer = fs.readFileSync(source);
    } else if (source.startsWith("http")) {
      const res = await fetch(source);
      buffer = Buffer.from(await res.arrayBuffer());
    } else if (!path.isAbsolute(source)) {
      filePath = path.join(__dirname, "sample_illustration", source);
    } else {
      // Fallback to sample_illustration directory
      const localPath = path.join(process.cwd(), "sample_illustration", source);
      buffer = fs.readFileSync(localPath);
    }

    return new Uint8Array(buffer);
  } catch (err) {
    console.error("⚠️ Error loading image:", source, err);
    return null;
  }
}
// Append images as a grid (table) with N columns
async function appendImageGrid(children, images, opts) {
  const cols = opts?.cols ?? 4;
  const baseWidth = opts?.width ?? 80;
  const baseHeight = opts?.height ?? 60;
  const width = opts?.width ?? 80;
  const height = opts?.height ?? 60;

  const rows = [];
  let cells = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    let source = img?.data ?? img?.dataUrl ?? img?.src ?? img; // use let so it can be reassigned
    const name = img?.name || `Image ${i + 1}`;
    const data = await loadImageAsUint8(source);

    const isHandStrengthM =
      name?.includes("Hand Strength MVE") ||
      name?.includes("Hand Strength MMVE");
    const imageHeight = isHandStrengthM ? baseHeight + 300 : baseHeight;
    const imageWidth = baseWidth; // keep same width

    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.START,
            children: data
              ? [
                new ImageRun({
                  data,
                  transformation: { width: imageWidth, height: imageHeight },
                }),
                new TextRun({ text: "\n" }),
                new TextRun({ text: name, size: 16, color: "6B7280" }),
              ]
              : [new TextRun({ text: name })],
          }),
        ],
        verticalAlign: VerticalAlign.TOP,
      }),
    );

    if ((i + 1) % cols === 0) {
      rows.push(new TableRow({ children: cells }));
      cells = [];
    }
  }
  if (cells.length) rows.push(new TableRow({ children: cells }));

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: rows.length
        ? rows
        : [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("No images")] }),
            ],
          }),
        ],
    }),
  );
}

// Append “Sample Illustration” block using getSampleIllustrations
async function appendSampleIllustrationsForTest(children, test) {
  const idOrName = test.testId || test.testName || "";
  let illos = [];
  try {
    illos = getSampleIllustrations(String(idOrName));
    console.debug("Illustrations picked", {
      test: idOrName,
      count: illos?.length ?? 0,
      files: (illos || []).map((i) => i?.src || i),
    });
  } catch {
    illos = [];
  }

  if (!Array.isArray(illos) || illos.length === 0) return;

  const isMTMTest = test.testName
    ?.toLowerCase()
    .match(
      /(fingering|handling|reach|balance|stoop|walk|push|pull|cart|crouch|carry|crawl|climb|kneel)/i,
    );

  if (!isMTMTest) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: "Sample Illustration:",
            underline: {},
            size: 16,
          }),
          new TextRun({ text: " " }),
        ],
        spacing: { before: 0, after: 80 },
      }),
    );
  }

  // normalize to objects with data/dataUrl/src/name
  const normalized = illos.map((x) =>
    typeof x === "string"
      ? { src: x, label: "Illustration", name: "Illustration" }
      : { ...x, name: x.name ?? x.label },
  );
  const isSingle = normalized.length === 1;
  const cols = isSingle ? 1 : 1; // 1 per row
  const width = isSingle ? 120 : 120;
  const height = isSingle ? 110 : 90;

  await appendImageGrid(children, normalized, { cols, width, height });
}

// Heart-rate line for general tests
function appendHeartRateLine(children, test) {
  const pre = Number(
    test.leftMeasurements?.preHeartRate ||
    test.rightMeasurements?.preHeartRate ||
    0,
  );
  const post = Number(
    test.leftMeasurements?.postHeartRate ||
    test.rightMeasurements?.postHeartRate ||
    0,
  );
  if (!pre && !post) return;

  const parts = [];
  if (pre) parts.push(`Pre: ${pre} bpm`);
  if (post) parts.push(`Post: ${post} bpm`);

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Heart Rate:", bold: true, size: 16 }),
        new TextRun({ text: " " + parts.join("   "), size: 16 }),
      ],
      spacing: { before: 80, after: 80 },
    }),
  );
}

// Test images block (serializedImages preferred, fallback to clientImages)
async function appendTestImages(children, test, title = "Test Images") {
  const images =
    (Array.isArray(test.serializedImages) && test.serializedImages.length
      ? test.serializedImages
      : Array.isArray(test.clientImages)
        ? test.clientImages
        : []) || [];

  const filtered = images.filter(
    (i) => !!(i?.dataUrl || i?.data || i?.src || i?.url || i instanceof Blob),
  );
  if (filtered.length === 0) return;

  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 16 })],
      spacing: { before: 200, after: 160 },
    }),
  );
  await appendImageGrid(children, filtered, {
    cols: 4,
    width: 100,
    height: 75,
  });
}

// Cardio: Bruce
function addBruceDocxContent(children, test) {
  // Protocol text

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Protocol Stages", bold: true, size: 16 }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "The Bruce protocol involves getting on a treadmill and increasing speed and incline every three minutes (in stages). The test stops when you've hit 85% of your maximum heart rate, your heart rate exceeds 115 beats per minute for two stages, or it is deemed that the test should no longer continue. If your heart rate changes more than six beats per minute between the second and third minute of any given stage, you are kept at the same speed & incline for an additional minute. (As your HR has not achieved a steady state).",
          size: 16,
        }),
      ],
      spacing: { after: 120 },
    }),
  );

  // VO2 max explanation
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Measuring VO2 Max:", bold: true, size: 16 }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Maximal oxygen uptake (VO2 max) refers to the maximum amount of oxygen an individual can use during intense or maximal exercise. It is measured as milliliters of oxygen used in one minute per kilogram of body weight (ml/kg/min).",
          size: 16,
        }),
      ],
      spacing: { after: 80 },
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "The Bruce treadmill test is an indirect maximal oxygen uptake test. It is indirect because it estimates VO2 max using a formula and the person's performance on a treadmill as the workload increases",
          size: 16,
        }),
      ],
      spacing: { after: 80 },
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "When the Bruce protocol formula is used, T stands for total time on the treadmill and is measured as a fraction of a minute. If test time of 10 minutes 15 seconds would be written as T=10.25); this formula changes based on gender. The time you spend on the treadmill is your test score and can be used to estimate your VO2 max value. Blood pressure and ratings of perceived exertion are also often collected during the Bruce protocol test.",
          size: 16,
        }),
      ],
      spacing: { after: 80 },
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Men: ", bold: true, size: 16 }),
        new TextRun({
          text: "14.8 - (1.379 × T) + (0.451 × T²) - (0.012 × T³)",
          size: 16,
        }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Women: ", bold: true, size: 16 }),
        new TextRun({ text: "4.38 × T - 3.9", size: 16 }),
      ],
      spacing: { after: 160 },
    }),
  );

  // Stages table
  const rows = [
    ["1", "1.7 mph", "10% grade"],
    ["2", "2.5 mph", "12% grade"],
    ["3", "3.4 mph", "14% grade"],
    ["4", "4.2 mph", "16% grade"],
    ["5", "5.0 mph", "18% grade"],
    ["6", "5.5 mph", "20% grade"],
    ["7", "6.0 mph", "22% grade"],
  ];
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Bruce Treadmill Test Stages, Speeds, and Inclines:",
          bold: true,
          size: 16,
        }),
      ],
      spacing: { after: 80 },
    }),
  );
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createHeaderCell("Stage"),
            createHeaderCell("Treadmill Speed"),
            createHeaderCell("Treadmill Incline"),
          ],
        }),
        ...rows.map(
          (r) =>
            new TableRow({
              children: r.map(
                (c) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: c, size: 16 })],
                      }),
                    ],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
              ),
            }),
        ),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      },
    }),
  );

  // Result fields
  children.push(
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [
        new TextRun({ text: "CLASSIFICATION: ", bold: true, size: 16 }),
        new TextRun({
          text: test.classification || "",
          underline: {},
          size: 16,
        }),
        new TextRun({ text: "    " }),
        new TextRun({ text: "VO2 MAX: ", bold: true, size: 16 }),
        new TextRun({
          text: test.vo2Max || "",
          underline: {},
          size: 16,
        }),
      ],
    }),
  );

  // VO2 Max Norms for Men
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "VO2 Max Norms for Men as Measured in ml/kg/min",
          bold: true,
          size: 16,
          color: BRAND_COLOR,
        }),
      ],
      spacing: { before: 160, after: 80 },
    }),
  );

  const menNorms = [
    ["20-29", ">56", "50-56", "46-49", "42-45", "37-41", "31-36", "<31"],
    ["30-39", ">54", "48-54", "44-47", "40-43", "35-39", "29-34", "<29"],
    ["40-49", ">52", "46-52", "42-45", "38-41", "33-37", "27-32", "<27"],
    ["50-59", ">50", "44-50", "40-43", "36-39", "31-35", "25-30", "<25"],
    ["60+", ">48", "42-48", "38-41", "34-37", "29-33", "23-28", "<23"],
  ];
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createHeaderCell("Age"),
            createHeaderCell("Excellent"),
            createHeaderCell("Good"),
            createHeaderCell("Above Average"),
            createHeaderCell("Average"),
            createHeaderCell("Below Average"),
            createHeaderCell("Poor"),
            createHeaderCell("Very Poor"),
          ],
        }),
        ...menNorms.map(
          (r) =>
            new TableRow({
              children: r.map(
                (c) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: c, size: 16 })],
                      }),
                    ],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
              ),
            }),
        ),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      },
    }),
  );

  // VO2 Max Norms for Women
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "VO2 Max Norms for Women as Measured in ml/kg/min",
          bold: true,
          size: 16,
          color: BRAND_COLOR,
        }),
      ],
      spacing: { before: 160, after: 80 },
    }),
  );

  const womenNorms = [
    ["20-29", ">49", "43-49", "39-42", "35-38", "31-34", "25-30", "<25"],
    ["30-39", ">47", "41-47", "37-40", "33-36", "29-32", "23-28", "<23"],
    ["40-49", ">45", "39-45", "35-38", "31-34", "27-30", "21-26", "<21"],
    ["50-59", ">43", "37-43", "33-36", "29-32", "25-28", "19-24", "<19"],
    ["60+", ">41", "35-41", "31-34", "27-30", "23-26", "17-22", "<17"],
  ];
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createHeaderCell("Age"),
            createHeaderCell("Excellent"),
            createHeaderCell("Good"),
            createHeaderCell("Above Average"),
            createHeaderCell("Average"),
            createHeaderCell("Below Average"),
            createHeaderCell("Poor"),
            createHeaderCell("Very Poor"),
          ],
        }),
        ...womenNorms.map(
          (r) =>
            new TableRow({
              children: r.map(
                (c) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: c, size: 16 })],
                      }),
                    ],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
              ),
            }),
        ),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      },
    }),
  );
}

// Cardio: mCAFT
function addMCAFTDocxContent(children, test) {
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "mCAFT (Modified Canadian Aerobic Fitness Test), is designed to give information about the aerobic fitness of a person, while using minimal equipment. The subject works by lifting its own body weight up and down double steps (40.6 cm in height total) while listening to set cadences from a compact disc. The end-stage of the age and gender specific stepping rate requires 65% of the age predicted maximum heart rate. The heart rate increases approximately in a linear fashion from 50% to 100% of maximal oxygen intake. The heart rate does not decrease significantly during the first fifteen seconds of recovery (O2 in). Thus, one can predict an aerobic fitness using the heart rate right after exercise of a known sub-maximal rate of working",
          size: 16,
        }),
      ],
      spacing: { after: 120 },
    }),
  );

  // Starting stage table
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Starting stepping stage by gender",
          bold: true,
          size: 16,
          color: BRAND_COLOR,
        }),
      ],
      spacing: { after: 80 },
    }),
  );
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createHeaderCell("Age"),
            createHeaderCell("Males"),
            createHeaderCell("Females"),
          ],
        }),
        ...[
          ["15-19", "4", "3"],
          ["20-29", "4", "3"],
          ["30-39", "3", "2"],
          ["40-49", "3", "2"],
          ["50-59", "2", "2"],
          ["60-69", "2", "1"],
        ].map(
          (r) =>
            new TableRow({
              children: r.map(
                (c) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: c, size: 16 })],
                      }),
                    ],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
              ),
            }),
        ),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      },
    }),
  );

  // Oxygen cost table
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Oxygen cost in ml/kg/min",
          bold: true,
          size: 16,
          color: BRAND_COLOR,
        }),
      ],
      spacing: { before: 160, after: 80 },
    }),
  );
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createHeaderCell("Stage"),
            createHeaderCell("Stepping cadence (Females)"),
            createHeaderCell("Stepping cadence (Males)"),
            createHeaderCell("O2 cost (Females)"),
            createHeaderCell("O2 cost (Males)"),
          ],
        }),
        ...[
          ["1", "24", "24", "15.3", "15.9"],
          ["2", "27", "27", "18.0", "18.6"],
          ["3", "30", "30", "20.7", "21.3"],
          ["4", "33", "33", "23.4", "24.0"],
          ["5", "36", "36", "26.1", "26.7"],
        ].map(
          (r) =>
            new TableRow({
              children: r.map(
                (c) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: c, size: 16 })],
                      }),
                    ],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
              ),
            }),
        ),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      },
    }),
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "mCAFT (Modified Canadian Aerobic Fitness Test) EQUATIONS TO PREDICT VO2MAX",
          bold: true,
          size: 16,
          color: BRAND_COLOR,
        }),
      ],
      spacing: { before: 160, after: 80 },
    }),
  );
  // Equation block
  children.push(
    new Paragraph({
      spacing: { before: 160, after: 100 },
      children: [
        new TextRun({
          text: "VO2 max (ml/kg/min) = 17.2 + (1.29 × O2 cost of the last completed stage) - (0.09 × mass in kg) - (0.18 × age in years)\nVO2 max (ml/kg/min) = 17.2 + (1.29 × _____) - (0.09 × _____ kg) - (0.18 × _____ )\nNote: O2 cost is provided in Table 2 on the back of this worksheet",
          bold: true,
          size: 12,
        }),
      ],
    }),
  );

  // Result fields
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Predicted VO2 max: ", bold: true, size: 16 }),
        new TextRun({
          text: test.predictedVo2Max || "",
          underline: {},
          size: 16,
        }),
        new TextRun({ text: " (ml/kg/min)", size: 16 }),
        new TextRun({ text: "    " }),
        new TextRun({ text: "HBR: ", bold: true, size: 16 }),
        new TextRun({
          text: test.hbr || "",
          underline: {},
          size: 16,
        }),
      ],
    }),
  );
}

// Cardio: Kasch
function addKaschDocxContent(children, test) {
  // === Description ===
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "The KASCH step test, officially the Kasch Pulse Recovery Test (KPR Test), is a 3-minute step test used to assess cardiorespiratory fitness. The test involves stepping onto a 0.305-meter (12-inch) step at a rate of 24 steps per minute for three minutes, followed by immediately sitting and measuring heart rate recovery for one minute to determine fitness levels.",
          size: 16,
        }),
      ],
      spacing: { after: 120 },
    }),
  );

  // === How the Test Works ===
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "How the Kasch Pulse Recovery Test (KPR Test) Works",
          bold: true,
          color: "1E3A8A",
          size: 16,
        }),
      ],
      spacing: { after: 80 },
    }),
  );

  const steps = [
    "Preparation: Participants are fitted with a heart rate monitor and rest until a steady-state heart rate is achieved.",
    "The Step: The participant steps up and down on a 12-inch step for three minutes (24 steps per minute).",
    "Heart Rate Recovery: Immediately after stepping, the participant sits down for one minute while heart rate is monitored.",
    "Measurement: Heart rate is recorded during this minute. A faster heart rate recovery indicates better aerobic fitness.",
  ];

  steps.forEach((step, i) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${step}`, size: 16 })],
        spacing: { after: 60 },
      }),
    );
  });

  // === Classification and Score ===
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "CLASSIFICATION: ", bold: true, size: 16 }),
        new TextRun({
          text: test.classification,
          underline: {},
          size: 16,
        }),
        new TextRun({ text: "    " }),
        new TextRun({ text: "AEROBIC FITNESS SCORE: ", bold: true, size: 16 }),
        new TextRun({
          text: test.aerobicFitnessScore,
          underline: {},
          size: 16,
        }),
      ],
      spacing: { after: 120 },
    }),
  );

  // === Ratings Tables (Women / Men) ===
  const women = [
    ["Excellent", "52-81", "58-80", "63-91", "60-92", "70-92", "73-86"],
    ["Good", "85-93", "85-92", "89-96", "95-101", "97-103", "96-101"],
    [
      "Above Average",
      "96-102",
      "96-101",
      "100-104",
      "106-111",
      "104-111",
      "103-115",
    ],
    [
      "Average",
      "104-110",
      "104-110",
      "107-112",
      "113-118",
      "113-118",
      "116-121",
    ],
    [
      "Below Average",
      "113-120",
      "113-119",
      "115-120",
      "120-124",
      "119-127",
      "123-126",
    ],
    ["Poor", "122-131", "122-129", "124-132", "126-132", "129-135", "128-133"],
    ["Very Poor", "135+", "132+", "137+", "137+", "141+", "139+"],
  ];

  const men = [
    ["Excellent", "50-76", "51-76", "49-76", "56-82", "60-77", "59-81"],
    ["Good", "79-89", "79-85", "80-88", "87-94", "86-94", "87-92"],
    ["Above Average", "88-93", "88-94", "92-96", "97-100", "97-100", "94-102"],
    ["Average", "95-100", "96-102", "98-105", "103-111", "103-109", "104-113"],
    [
      "Below Average",
      "102-107",
      "104-110",
      "108-113",
      "113-119",
      "111-119",
      "116-124",
    ],
    ["Poor", "111-119", "114-121", "116-124", "121-126", "122-128", "126-132"],
    ["Very Poor", "124+", "126+", "128+", "131+", "131+", "137+"],
  ];

  function createRatingsTable(title, headerAges, rows) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 16,
            color: BRAND_COLOR,
          }),
        ],
        spacing: { before: 100, after: 40 },
      }),
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createHeaderCell(""),
              ...headerAges.map(createHeaderCell),
            ],
          }),
          ...rows.map(
            (r) =>
              new TableRow({
                children: r.map((c, idx) =>
                  idx === 0
                    ? new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: c, bold: true, size: 16 }),
                          ],
                        }),
                      ],
                    })
                    : new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: c, size: 16 })],
                        }),
                      ],
                    }),
                ),
              }),
          ),
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          insideHorizontal: {
            style: BorderStyle.SINGLE,
            size: 1,
            color: "000000",
          },
          insideVertical: {
            style: BorderStyle.SINGLE,
            size: 1,
            color: "000000",
          },
        },
      }),
    );
  }

  createRatingsTable(
    "Ratings for Women, Based on Age",
    ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"],
    women,
  );
  createRatingsTable(
    "Ratings for Men, Based on Age",
    ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"],
    men,
  );

  // === Heart Rate Section ===
  children.push(
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [
        new TextRun({ text: "Heart Rate: ", bold: true, size: 16 }),
        new TextRun({
          text: `Pre: ${test.hrPre || "71"} bpm   Post: ${test.hrPost || "76"} bpm`,
          size: 16,
        }),
      ],
    }),
  );
}

// Cardio switch
async function addCardioDocxContent(children, test) {
  const name = (test.testName || "").toLowerCase();

  if (name.includes("bruce") || name.includes("treadmill")) {
    addBruceDocxContent(children, test);
  } else if (name.includes("mcaft")) {
    addMCAFTDocxContent(children, test);
  } else if (name.includes("kasch")) {
    addKaschDocxContent(children, test);
  } else {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "The client was tested in our facility using standardized cardiovascular assessment protocols.",
          }),
        ],
      }),
    );
  }

  // await appendTestImages(children, test, "Client Images");

  // 🧩 Collect Test Images section
  const savedFiles = test?.serializedImages || test?.clientImages || [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Client Images:\n`, bold: true, size: 16 }),
      ],
      spacing: { before: 120, after: 80 },
    }),
  );

  if (savedFiles.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "No images found.", italics: true, size: 16 }),
        ],
      }),
    );
  } else {
    const imagesPerRow = 6;
    const numRows = Math.ceil(savedFiles.length / imagesPerRow);
    const imageTableRows = [];

    for (let i = 0; i < numRows; i++) {
      const rowChildren = [];

      for (let j = 0; j < imagesPerRow; j++) {
        const index = i * imagesPerRow + j;
        const file = savedFiles[index];
        if (!file) continue;

        let imageBuffer = null;

        if (file.dataUrl) {
          const base64 = file.dataUrl.split(",")[1];
          imageBuffer = Buffer.from(base64, "base64");
        } else if (file.url || file.path || file.src) {
          imageBuffer = await getImageBuffer(file.url || file.path || file.src);
        } else if (file.data) {
          const cleanBase64 = file.data.replace(/^data:image\/\w+;base64,/, "");
          imageBuffer = Buffer.from(cleanBase64, "base64");
        }

        rowChildren.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  imageBuffer
                    ? new ImageRun({
                      data: imageBuffer,
                      transformation: { width: 120, height: 120 },
                    })
                    : new TextRun({ text: "[Image Missing]", size: 16 }),
                ],
                alignment: AlignmentType.LEFT,
              }),
            ],
            borders: noBorders,
            margins: { top: 0, bottom: 0, left: 10, right: 10 },
          }),
        );
      }

      imageTableRows.push(new TableRow({ children: rowChildren }));
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: imageTableRows,
      }),
    );
  }
}

function buildMTMTestBlockTable(testName, testData, trials = []) {
  // Colors/styling similar to screenshot
  const PANEL_HEADER_FILL = "FFFF99"; // pale yellow
  const GRID_HEADER_FILL = "F3F4F6"; // light gray
  const AVG_ROW_FILL = "F9FAFB"; // extra light gray
  const TOTAL_IS_FILL = "DBEAFE"; // light blue
  const GRID_COLOR = "CBD5E1"; // slate border

  const border = { style: BorderStyle.SINGLE, size: 4, color: GRID_COLOR };

  // Build title row ("Fingering - <date time>")
  const when = new Date(testData.completedAt || Date.now());
  const title = `${testName} - ${when.toLocaleDateString()} ${when.toLocaleTimeString()}`;

  const rows = [];

  // Title row spans all 8 columns
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          columnSpan: 8,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
          shading: { type: ShadingType.CLEAR, fill: PANEL_HEADER_FILL },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: title, bold: true, size: 16 })],
              spacing: { before: 80, after: 80 },
            }),
          ],
        }),
      ],
    }),
  );

  // Grid header
  const headers = [
    "Trial",
    "Side",
    "Weight/Plane",
    "Distance/Posture",
    "Reps",
    "Time (sec)",
    "%IS",
    "Time Set Completed",
  ];
  rows.push(
    new TableRow({
      children: headers.map(
        (h, idx) =>
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,

            shading: { type: ShadingType.CLEAR, fill: GRID_HEADER_FILL },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, bold: true, size: 16 })],
              }),
            ],
          }),
      ),
    }),
  );

  // Trial rows
  const times = [];
  const isVals = [];
  const repsVals = [];
  trials.forEach((trial, i) => {
    const t = getMTMTime(trial);
    const is =
      typeof trial.percentIS === "number"
        ? trial.percentIS
        : Number(trial.percentIS || 0);
    const reps =
      typeof trial.reps === "number" ? trial.reps : Number(trial.reps || 0);

    times.push(Number.isFinite(t) ? t : 0);
    isVals.push(Number.isFinite(is) ? is : 0);
    repsVals.push(Number.isFinite(reps) ? reps : 0);

    const cells = [
      trial.trial || i + 1,
      trial.side || "Both",
      trial.weight?.value ?? trial.plane ?? "",
      trial.distance?.value ?? trial.position ?? "",
      Number.isFinite(reps) ? reps : "",
      Number.isFinite(t) ? t.toFixed(1) : "0.0",
      Number.isFinite(is) ? is.toFixed(1) : "0.0",
      "", // Time Set Completed per-trial (optional)
    ];

    rows.push(
      new TableRow({
        children: cells.map(
          (val, idx) =>
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,

              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              },
              children: [
                new Paragraph({
                  alignment:
                    idx === 0 ? AlignmentType.CENTER : AlignmentType.CENTER,
                  children: [new TextRun({ text: String(val), size: 16 })],
                }),
              ],
            }),
        ),
      }),
    );
  });

  // Summary rows (Avg. and Total IS%)
  const avgTime = average(times);
  const avgIS = average(isVals);
  const sumTime = sum(times);
  const avgReps = average(repsVals);

  // Avg. row
  rows.push(
    new TableRow({
      children: [
        // "Avg."
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          shading: { type: ShadingType.CLEAR, fill: AVG_ROW_FILL },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Avg.", bold: true, size: 16 })],
            }),
          ],
        }),
        // Side
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          shading: { type: ShadingType.CLEAR, fill: AVG_ROW_FILL },
          children: [new Paragraph({ children: [new TextRun("")] })],
        }),
        // Weight/Plane
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          shading: { type: ShadingType.CLEAR, fill: AVG_ROW_FILL },
          children: [new Paragraph({ children: [new TextRun("")] })],
        }),
        // Distance/Posture
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          shading: { type: ShadingType.CLEAR, fill: AVG_ROW_FILL },
          children: [new Paragraph({ children: [new TextRun("")] })],
        }),
        // Reps (avg or common value)
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          shading: { type: ShadingType.CLEAR, fill: AVG_ROW_FILL },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: Number.isFinite(avgReps) ? format1(avgReps) : "",
                  size: 16,
                }),
              ],
            }),
          ],
        }),
        // Time (sec) avg
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          shading: { type: ShadingType.CLEAR, fill: AVG_ROW_FILL },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: Number.isFinite(avgTime) ? format2(avgTime) : "",
                  size: 16,
                }),
              ],
            }),
          ],
        }),
        // %IS avg
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          shading: { type: ShadingType.CLEAR, fill: AVG_ROW_FILL },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: Number.isFinite(avgIS) ? format1(avgIS) : "",
                  size: 16,
                }),
              ],
            }),
          ],
        }),
        // Time Set Completed (total)
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          shading: { type: ShadingType.CLEAR, fill: AVG_ROW_FILL },
          borders: { right: border },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: Number.isFinite(sumTime) ? format1(sumTime) : "",
                  size: 16,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  // Total IS% row (label spans first 6 cols; value in %IS column)
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          columnSpan: 6,
          shading: { type: ShadingType.CLEAR, fill: TOTAL_IS_FILL },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Total IS%:", bold: true, size: 16 }),
              ],
            }),
          ],
        }),
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          shading: { type: ShadingType.CLEAR, fill: TOTAL_IS_FILL },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: Number.isFinite(avgIS) ? `${format1(avgIS)}%` : "",
                  size: 16,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,

          shading: { type: ShadingType.CLEAR, fill: TOTAL_IS_FILL },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
          children: [new Paragraph({ children: [new TextRun("")] })],
        }),
      ],
    }),
  );

  return new Table({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function extractHeartRateForMTM(testData, correspondingTest) {
  const pre =
    testData?.heartRatePre ??
    testData?.heartRate?.pre ??
    correspondingTest?.heartRatePre ??
    correspondingTest?.heartRate?.pre;

  const post =
    testData?.heartRatePost ??
    testData?.heartRate?.post ??
    correspondingTest?.heartRatePost ??
    correspondingTest?.heartRate?.post;

  return {
    preHR: isFiniteNum(pre) ? Math.round(pre) : null,
    postHR: isFiniteNum(post) ? Math.round(post) : null,
  };
}

function getMTMTime(trial) {
  if (typeof trial?.testTime === "number") return trial.testTime;
  if (trial?.time?.value) return Number(trial.time.value);
  return 0;
}
const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const readTrials = (src) => {
  if (!src) return [];
  if (Array.isArray(src)) return src.map(toNumber);
  if (typeof src === "object") {
    const out = [];
    for (let i = 1; i <= 30; i++) {
      const key = [`trial${i}`, `t${i}`, String(i)].find((k) => src[k] != null);
      if (key) out.push(toNumber(src[key]));
    }
    return out;
  }
  return [];
};

function average(arr) {
  const vals = arr.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (vals.length === 0) return NaN;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function sum(arr) {
  const vals = arr.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (vals.length === 0) return NaN;
  return vals.reduce((a, b) => a + b, 0);
}

function format1(n) {
  return Number.isFinite(n) ? n.toFixed(1) : "";
}
function format2(n) {
  return Number.isFinite(n) ? n.toFixed(2) : "";
}
function isFiniteNum(n) {
  return typeof n === "number" && Number.isFinite(n);
}
function capitalize(s) {
  return (s || "").charAt(0).toUpperCase() + (s || "").slice(1);
}

async function generateMTMContentDocx(mtmData, mainTestData) {
  if (!mtmData || Object.keys(mtmData).length === 0) return [];

  const TITLE_COLOR = "1E3A8A";
  const children = [];

  // === Title ===
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "Occupational Tasks Methods Time Measurement Analysis",
          bold: true,
          color: TITLE_COLOR,
          size: 16,
        }),
      ],
      spacing: { after: 120 },
    }),
  );

  // === References (added later for last test) ===
  const refs = [
    'Anderson, D.S. and Edstrom D.P. "MTM Personnel Selection Tests; Validation at a Northwestern National Life Insurance Company". Journal of Methods-Time Measurement, 15, (3).',
    'Birdsong, J.H. and Chyatte, S.B. (1970) "Further medical applications of methods-time measurement". Journal of Methods-Time Measurement, 15, 19-27.',
    'Brickey, "MTM in a Sheltered Workshop". Journal of Methods-Time Measurement, 8, (3) 2-7.',
    'Chyatte, S.B. and Birdsong, J.H. (1972) "Methods time measurement in assessment of motor performance". Archives of Physical Medicine and Rehabilitation, 53, 38-44.',
    'Foulke, J.A. "Estimating Individual Operator Performance". Journal of Methods-Time Measurement, 15, (1) 18-23.',
    'Grant, G.W.B., Moores, B. and Whelan, E. (1975) "Applications of Methods-time measurement in training centers for the mentally handicapped". Journal of Methods-Time Measurement, 11, 23-30.',
  ];

  // === Left and Right column containers (only once) ===
  const leftCol = [];
  const rightCol = [];

  // 🖼️ Add "Sample Illustration:" heading only once
  leftCol.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: "Sample Illustration:", underline: {}, size: 16 }),
        new TextRun({ text: " " }),
      ],
      spacing: { before: 0, after: 80 },
    }),
  );

  // 🧠 Add the intro text only once
  rightCol.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "The client was tested in our facility using MTM. The test results were compared to industrial standards.",
          italics: true,
          size: 16,
        }),
      ],
      spacing: { after: 200 },
    }),
  );

  // === Loop through tests ===
  const entries = Object.entries(mtmData);
  for (let i = 0; i < entries.length; i++) {
    const [testType, testData] = entries[i];
    const isLast = i === entries.length - 1;

    // Add illustrations for each test
    await appendSampleIllustrationsForTest(leftCol, testData);

    const testName = testData.testName || capitalize(testType);
    const trials = Array.isArray(testData.trials) ? testData.trials : [];

    const correspondingTest = mainTestData?.tests?.find((t) => {
      const n1 = (t.testName || "").toLowerCase();
      const n2 = testType.toLowerCase();
      return (
        n1.includes(n2) ||
        n2.includes(n1) ||
        t.testId === testType ||
        t.testName === testName
      );
    });

    // Add test table
    rightCol.push(buildMTMTestBlockTable(testName, testData, trials));

    // Heart Rate
    const { preHR, postHR } = extractHeartRateForMTM(
      testData,
      correspondingTest,
    );
    rightCol.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Heart Rate: `, bold: true, size: 16 }),
          new TextRun({
            text: `Pre: ${preHR ?? "N/A"} bpm  Post: ${postHR ?? "N/A"} bpm`,
            size: 16,
          }),
        ],
        spacing: { before: 120, after: 80 },
      }),
    );
    // 🧩 Collect Test Images section
    const savedFiles = testData?.savedImageData || [];

    rightCol.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Test Images:\n`, bold: true, size: 16 }),
        ],
        spacing: { before: 120, after: 80 },
      }),
    );

    if (savedFiles.length === 0) {
      rightCol.push(
        new Paragraph({
          children: [
            new TextRun({ text: "No images found.", italics: true, size: 16 }),
          ],
        }),
      );
    } else {
      const imagesPerRow = 6;
      const numRows = Math.ceil(savedFiles.length / imagesPerRow);
      const imageTableRows = [];

      for (let i = 0; i < numRows; i++) {
        const rowChildren = [];

        for (let j = 0; j < imagesPerRow; j++) {
          const index = i * imagesPerRow + j;
          const file = savedFiles[index];
          if (!file) continue;

          let imageBuffer = null;

          if (file.dataUrl) {
            const base64 = file.dataUrl.split(",")[1];
            imageBuffer = Buffer.from(base64, "base64");
          } else if (file.url || file.path || file.src) {
            imageBuffer = await getImageBuffer(
              file.url || file.path || file.src,
            );
          } else if (file.data) {
            imageBuffer = Buffer.from(file.data, "base64");
          }

          rowChildren.push(
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    imageBuffer
                      ? new ImageRun({
                        data: imageBuffer,
                        transformation: { width: 120, height: 120 },
                      })
                      : new TextRun({ text: "[Image Missing]", size: 16 }),
                  ],
                  alignment: AlignmentType.LEFT,
                }),
              ],
              borders: noBorders,
              margins: { top: 0, bottom: 0, left: 10, right: 10 },
            }),
          );
        }

        imageTableRows.push(new TableRow({ children: rowChildren }));
      }

      rightCol.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: imageTableRows,
        }),
      );
    }

    // Comments
    const commentText = correspondingTest?.comments || testData?.comments;
    rightCol.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Comments: ", bold: true, size: 16 }),
          new TextRun({
            text: commentText || "No additional comments provided.",
            size: 16,
          }),
        ],
        spacing: { after: 220 },
      }),
    );

    // Add references only for last test
    if (isLast) {
      rightCol.push(
        new Paragraph({
          children: [
            new TextRun({ text: "References:", bold: true, size: 16 }),
          ],
          spacing: { before: 200, after: 60 },
        }),
      );

      refs.forEach((line) => {
        rightCol.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 16 })],
            spacing: { after: 40 },
          }),
        );
      });
    }
  }

  // === Finally add one combined table ===
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      },
      columnWidths: [2000, 100, 6900],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              borders: noBorders,
              children: leftCol,
            }),
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              borders: {
                left: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
              },
              children: [],
            }),
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              borders: noBorders,
              children: rightCol,
            }),
          ],
        }),
      ],
    }),
  );

  return children;
}

// === Helper for consistent padded, bordered cells ===
function paddedCell(text, options = {}) {
  return new TableCell({
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    children: [
      new Paragraph({
        alignment: options.align || AlignmentType.CENTER,
        children: [
          new TextRun({
            text: text ?? "",
            bold: options.bold || false,
            size: options.size || 14,
          }),
        ],
      }),
    ],
    shading: options.fill ? { fill: options.fill } : undefined,
  });
}

// ===== Dynamic crosschecks (JS, no types) =====
function computeCrosschecksFromUnifiedTests(
  unifiedTests,
  referralQuestionsData,
) {
  const allTests = Array.isArray(unifiedTests) ? unifiedTests : [];
  const normalize = (s) => (s ? String(s).toLowerCase() : "");

  // Local helpers (avoid name collisions with your existing helpers)
  const _getTrialValues = (m) => {
    if (!m) return [];
    const keys = ["trial1", "trial2", "trial3", "trial4", "trial5", "trial6"];
    const vals = [];
    for (const k of keys) {
      const v = Number(m[k]);
      if (Number.isFinite(v)) vals.push(v);
    }
    return vals;
  };

  const _calcAverage = (m) => {
    const vals = _getTrialValues(m).filter((v) => v > 0);
    if (!vals.length) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
    // Note: This does not use your global calculateAverage to avoid conflicts.
  };

  const _calcCV = (m) => {
    const values = _getTrialValues(m).filter((v) => v > 0);
    if (!values.length) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    if (mean === 0) return 0;
    const variance =
      values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return Math.round((stdDev / mean) * 100);
  };

  const _bilateralDeficiency = (l, r) => {
    const maxVal = Math.max(l, r);
    if (maxVal === 0) return 0;
    return (Math.abs(l - r) / maxVal) * 100;
  };

  // Groupings for checks
  const gripTests = allTests.filter((t) => {
    const n = normalize(t.testName);
    return n.includes("grip") || n.includes("hand");
  });
  const pinchTests = allTests.filter((t) =>
    normalize(t.testName).includes("pinch"),
  );
  const liftTests = allTests.filter((t) =>
    normalize(t.testName).includes("lift"),
  );
  const romTests = allTests.filter((t) => {
    const n = normalize(t.testName);
    return (
      n.includes("range") ||
      n.includes("motion") ||
      n.includes("flexion") ||
      n.includes("extension")
    );
  });

  // Hand grip rapid exchange
  const rapidExchangeValid = (() => {
    if (!gripTests.length) return null;

    const rapidTests = allTests.filter((t) => {
      const n = normalize(t.testName);
      return (
        n.includes("rapid") ||
        n.includes("exchange") ||
        n.includes("rapid-exchange") ||
        n.includes("rapid exchange")
      );
    });

    let standardTest = gripTests.find((t) => {
      const n = normalize(t.testName);
      return (
        n.includes("position 2") ||
        n.includes("pos 2") ||
        n.includes("position2") ||
        n.includes("std position") ||
        n.includes("standard") ||
        n.includes("p2")
      );
    });

    if (!standardTest && gripTests.length > 0) {
      standardTest = gripTests.reduce((best, cur) => {
        const bestAvg =
          (_calcAverage(best.leftMeasurements) +
            _calcAverage(best.rightMeasurements)) /
          2;
        const curAvg =
          (_calcAverage(cur.leftMeasurements) +
            _calcAverage(cur.rightMeasurements)) /
          2;
        return curAvg > bestAvg ? cur : best;
      }, gripTests[0]);
    }

    if (!standardTest || rapidTests.length === 0) return null;

    const avgAcross = (tests, side) => {
      const vals = tests
        .map((t) =>
          _calcAverage(
            side === "left" ? t.leftMeasurements : t.rightMeasurements,
          ),
        )
        .filter((v) => v > 0);
      if (!vals.length) return 0;
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    };

    const rapidLeftAvg = avgAcross(rapidTests, "left");
    const rapidRightAvg = avgAcross(rapidTests, "right");
    const stdLeftAvg = _calcAverage(standardTest.leftMeasurements);
    const stdRightAvg = _calcAverage(standardTest.rightMeasurements);

    const comparisons = [];
    if (stdLeftAvg > 0 && rapidLeftAvg > 0)
      comparisons.push(rapidLeftAvg <= stdLeftAvg * 0.85);
    if (stdRightAvg > 0 && rapidRightAvg > 0)
      comparisons.push(rapidRightAvg <= stdRightAvg * 0.85);
    if (!comparisons.length) return null;
    return comparisons.every(Boolean);
  })();

  // Hand grip MVE
  const gripMVEValid = gripTests.length
    ? gripTests.every((test) => {
      const leftAvg = _calcAverage(test.leftMeasurements);
      const rightAvg = _calcAverage(test.rightMeasurements);
      const bilateralDiff = _bilateralDeficiency(leftAvg, rightAvg);
      return bilateralDiff <= 20;
    })
    : null;

  // Pinch grip CV
  const pinchValid = pinchTests.length
    ? pinchTests.every((test) => {
      const leftCV = _calcCV(test.leftMeasurements);
      const rightCV = _calcCV(test.rightMeasurements);
      return leftCV <= 15 && rightCV <= 15;
    })
    : null;

  // Dynamic lift HR fluctuation
  const dynamicLifts = liftTests.filter((t) => {
    const n = normalize(t.testName);
    return (
      n.includes("low") ||
      n.includes("mid") ||
      n.includes("high") ||
      n.includes("overhead") ||
      n.includes("frequent") ||
      n.includes("dynamic")
    );
  });

  const hrConsistent = dynamicLifts.length
    ? dynamicLifts.some((test) => {
      const preHR =
        (test.leftMeasurements &&
          Number(test.leftMeasurements.preHeartRate)) ||
        (test.rightMeasurements &&
          Number(test.rightMeasurements.preHeartRate)) ||
        0;
      const postHR =
        (test.leftMeasurements &&
          Number(test.leftMeasurements.postHeartRate)) ||
        (test.rightMeasurements &&
          Number(test.rightMeasurements.postHeartRate)) ||
        0;
      return postHR > preHR;
    })
    : null;

  // ROM consistency
  const romValid = romTests.length
    ? romTests.every((test) => {
      const leftTrials = _getTrialValues(test.leftMeasurements);
      const rightTrials = _getTrialValues(test.rightMeasurements);
      const all = [...leftTrials, ...rightTrials].filter((v) =>
        Number.isFinite(v),
      );
      if (all.length < 6) return false;

      for (let i = 0; i <= all.length - 3; i++) {
        const t1 = all[i],
          t2 = all[i + 1],
          t3 = all[i + 2];
        const maxDiff = Math.max(
          Math.abs(t1 - t2),
          Math.abs(t2 - t3),
          Math.abs(t1 - t3),
        );
        const avg = (t1 + t2 + t3) / 3;
        const denom = avg === 0 ? 1 : avg;
        const maxPerc = Math.max(
          (Math.abs(t1 - avg) / denom) * 100,
          (Math.abs(t2 - avg) / denom) * 100,
          (Math.abs(t3 - avg) / denom) * 100,
        );
        if (maxDiff <= 5 && maxPerc <= 10) return true;
      }
      return false;
    })
    : null;

  // Test/retest trial consistency
  const validCVTests = allTests.filter((test) => {
    const leftCV = _calcCV(test.leftMeasurements);
    const rightCV = _calcCV(test.rightMeasurements);
    return leftCV <= 15 && rightCV <= 15;
  });
  const similarValues = allTests.length
    ? validCVTests.length / allTests.length >= 0.8
    : null;

  let consistentDeficiency = true;
  if (allTests.length > 1) {
    const firstLeft = _calcAverage(allTests[0].leftMeasurements);
    const firstRight = _calcAverage(allTests[0].rightMeasurements);
    const firstWeaker = firstLeft < firstRight ? "left" : "right";
    for (let i = 1; i < allTests.length; i++) {
      const l = _calcAverage(allTests[i].leftMeasurements);
      const r = _calcAverage(allTests[i].rightMeasurements);
      const weaker = l < r ? "left" : "right";
      if (weaker !== firstWeaker) {
        consistentDeficiency = false;
        break;
      }
    }
  }
  const overallValid = allTests.length
    ? Boolean(similarValues && consistentDeficiency)
    : null;

  // Dominant side monitoring
  const dominantSideValid = allTests.length
    ? allTests.every((test) => {
      const l = _calcAverage(test.leftMeasurements);
      const r = _calcAverage(test.rightMeasurements);
      if (Math.min(l, r) === 0) return true; // avoid divide-by-zero
      const ratio = Math.max(l, r) / Math.min(l, r);
      return ratio <= 1.1; // ~10%
    })
    : null;

  // Distraction test (6b) and diagnosis consistency (6c)
  const rq =
    referralQuestionsData && referralQuestionsData.questions
      ? referralQuestionsData.questions
      : [];
  let distractionPass = null;
  let diagnosisPass = null;

  if (Array.isArray(rq) && rq.length) {
    const dQ = rq.find(
      (q) =>
        q &&
        q.question &&
        q.question.includes("6b) Distraction test consistency"),
    );
    if (dQ) {
      const status = ((dQ.answer || "").split("|")[0] || "").toUpperCase();
      distractionPass = status.includes("PASS");
    }
    const cQ = rq.find(
      (q) =>
        q &&
        q.question &&
        q.question.includes("6c) Consistency with diagnosis"),
    );
    if (cQ) {
      const status = ((cQ.answer || "").split("|")[0] || "").toUpperCase();
      diagnosisPass = status.includes("PASS");
    }
  }

  // CV Summary
  const validCVForSummary = allTests.filter((test) => {
    const lcv = _calcCV(test.leftMeasurements);
    const rcv = _calcCV(test.rightMeasurements);
    return lcv < 15 && rcv < 15;
  });
  const cvValid = allTests.length
    ? validCVForSummary.length / allTests.length >= 0.7
    : null;

  const crosschecks = [
    {
      name: "Hand grip rapid exchange",
      description:
        "Rapid Exchange Grip was 15% less to equal that of the Std position 2 Hand Grip measure.",
      pass: rapidExchangeValid,
      applicable: rapidExchangeValid !== null,
    },
    {
      name: "Hand grip MVE",
      description:
        "Position 1 through 5 displayed a bell curve showing greatest strength in position 2-3.",
      pass: gripMVEValid,
      applicable: gripTests.length > 0,
    },
    {
      name: "Pinch grip key/tip/palmar ratio",
      description:
        "Key grip was greater than palmar which was greater than tip grip.",
      pass: pinchValid,
      applicable: pinchTests.length > 0,
    },
    {
      name: "Dynamic lift HR fluctuation",
      description:
        "Client displayed an increase in heart rate when weight and/or repetitions were increased (any dynamic lift: low, mid, high, overhead, or frequent).",
      pass: hrConsistent,
      applicable: dynamicLifts.length > 0,
    },
    {
      name: "ROM consistency check",
      description:
        "During total spine ROM, the client provided three consecutive trials between 5 degrees and 10% of each other in a six-trial session.",
      pass: romValid,
      applicable: romTests.length > 0,
    },
    {
      name: "Test/retest trial consistency",
      description:
        "When tests were repeated the client displayed similar values and left/right deficiency.",
      pass: overallValid,
      applicable: allTests.length > 0,
    },
    {
      name: "Dominant side monitoring",
      description:
        "It is expected that if the client is Right-Handed, he/she will demonstrate approx.10% greater values on the dominant side – if Left-Handed then the values would be close to the same.",
      pass: dominantSideValid,
      applicable: allTests.length > 0,
    },
    // Only include rows that exist in referral questions
    ...(distractionPass === null
      ? []
      : [
        {
          name: "Distraction test consistency",
          description:
            "When performing distraction tests for sustained posture the client should demonstrate similar limitations and or abilities.",
          pass: distractionPass,
          applicable: true,
        },
      ]),
    ...(diagnosisPass === null
      ? []
      : [
        {
          name: "Consistency with diagnosis",
          description:
            "Based on the diagnosis and complaints of the individual it is expected that those issues would relate to a similar function performance pattern during testing.",
          pass: diagnosisPass,
          applicable: true,
        },
      ]),
    {
      name: "Coefficient of Variation (CV)",
      description:
        "We would expect to see a CV less than 15% for a client that is deemed to be consistent.",
      pass: cvValid,
      applicable: allTests.length > 0,
    },
  ];

  return crosschecks;
}

function buildConsistentCrosschecksTable(crosschecks) {
  const headerCell = (text) =>
    new TableCell({
      margins: { top: 100, bottom: 100, left: 150, right: 150 },

      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, size: 16 })],
        }),
      ],
      shading: { fill: "FFFF99" },
    });

  const makeCheckText = (check, wantPass) => {
    if (!check.applicable || check.pass === null) return "N/A";
    return wantPass ? (check.pass ? "✓" : "") : !check.pass ? "✓" : "";
  };

  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Consistent Crosschecks"),
        headerCell("Description"),
        headerCell("Pass"),
        headerCell("Fail"),
      ],
    }),
    ...crosschecks.map(
      (ch) =>
        new TableRow({
          children: [
            new TableCell({
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: ch.name, size: 16 })],
                }),
              ],
            }),
            new TableCell({
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: ch.description, size: 16 })],
                }),
              ],
            }),
            new TableCell({
              margins: { top: 100, bottom: 100, left: 150, right: 150 },

              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: makeCheckText(ch, true), size: 16 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              margins: { top: 100, bottom: 100, left: 150, right: 150 },

              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: makeCheckText(ch, false), size: 16 }),
                  ],
                }),
              ],
            }),
          ],
        }),
    ),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: [3500, 5500, 800, 800],
    rows,
  });
}

// Detect "dynamic lift" robustly
function isDynamicLiftTest(test, testNameLower, isLiftTest) {
  const haystack = [
    testNameLower,
    test?.testId,
    test?.testType,
    test?.category,
    test?.type,
    test?.liftType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    isLiftTest && (haystack.includes("dynamic") || test?.isDynamic === true)
  );
}

// Best-effort read of endpoint condition from various shapes
function getEndpointConditionText(test) {
  const candidates = [
    test?.dynamicEndpointType ?? test?.parameters?.dynamicEndpointType ?? "",
    test?.endPointCondition,
    test?.endpoint,
    test?.endPoint,
    test?.terminationReason,
    test?.termination,
    test?.stopReason,
    test?.reasonForStop,
    test?.endCondition,
    test?.endReason,
  ];

  for (const v of candidates) {
    if (v == null) continue;
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (typeof v === "object") {
      const o = v;
      const s =
        o.condition ||
        o.reason ||
        o.label ||
        o.name ||
        o.value ||
        o.text ||
        o.title;
      if (s) return String(s);
    }
  }
  return "";
}

// ===== Section builders =====
async function addCoverPage(children, body) {
  const {
    claimantName = "",
    claimNumber = "",
    evaluationDate = "",
    logoPath = null,
    clinicName = "",
    clinicAddress = "",
    clinicPhone = "",
    clinicFax = "",
    claimantData = {},
  } = body || {};

  const nameDisplay =
    claimantName ||
    `${claimantData?.lastName || ""}, ${claimantData?.firstName || ""}`.trim() ||
    "Unknown";

  let logoBuffer = null;
  const logoSources = [
    body?.logoPath,
    body?.evaluatorData?.clinicLogo,
    body?.logoUrl,
  ].filter(Boolean);
  for (const src of logoSources) {
    // eslint-disable-next-line no-await-in-loop
    logoBuffer = await getImageBuffer(src);
    if (logoBuffer) break;
  }
  if (!logoBuffer) {
    logoBuffer = await getImageBuffer(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/256px-React-icon.svg.png",
    );
  }

  // Large top spacer to vertically center cover content area
  children.push(new Paragraph({ children: [], spacing: { after: 3000 } }));

  // Centered logo
  if (logoBuffer) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 80, height: 80 },
          }),
        ],
        spacing: { after: 200 },
      }),
    );
  } else if (clinicName) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: clinicName, bold: true, color: BRAND_COLOR }),
        ],
        spacing: { after: 200 },
      }),
    );
  }

  // Centered title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          // text: "Functional Abilities Determination",
          text: "FCE Executive Summary",
          bold: true,
          color: BRAND_COLOR,
          size: 24,
        }),
      ],
      spacing: { after: 200 },
    }),
  );

  // Left-indented label/value rows
  const displayClaimNumber = claimNumber || "N/A";
  const displayEvalDate =
    evaluationDate || new Date().toISOString().split("T")[0];

  // Revert to non-table rows, positioned directly under the title
  const coverRow = (label, val) =>
    new Paragraph({
      indent: { left: 4000 },
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `${label}:`, bold: true, size: 16 }),
        new TextRun({ text: "  ", size: 16 }),
        new TextRun({ text: val || "", size: 16 }),
      ],
    });

  children.push(coverRow("Claimant Name", nameDisplay));
  children.push(coverRow("Claimant #", displayClaimNumber));
  children.push(coverRow("Date of Evaluation(s)", displayEvalDate));

  // Return footer content so caller can place at page bottom
  const phoneFax = `Phone: ${clinicPhone || ""}${clinicPhone && clinicFax ? "    " : ""
    }${clinicPhone ? `Fax: ${clinicPhone}` : ""}`.trim();

  const footerChildren = [];
  footerChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "CONFIDENTIAL INFORMATION ENCLOSED",
          bold: true,
          color: "808080",
          size: 20,
        }),
      ],
    }),
  );
  if (clinicName)
    footerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: clinicName, bold: true, size: 20 })],
      }),
    );
  if (clinicAddress)
    footerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: clinicAddress, size: 20 })],
      }),
    );
  if (phoneFax)
    footerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: phoneFax, size: 20 })],
      }),
    );

  children.__coverFooter = new Footer({
    children: footerChildren,
  });
}

async function addContentsOfReport(children) {
  const contentChildren = [
    new Paragraph({
      children: [
        new TextRun({
          text: "Contents of Report:",
          bold: true,
          color: BRAND_COLOR,
          size: 18, // Bigger for heading
        }),
      ],
      spacing: { after: 260, before: 260 },
      indent: { left: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Client Information", size: 18 })],
      spacing: { after: 260 },
      indent: { left: 300 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Pain & Symptom Illustration", size: 18 }),
      ],
      spacing: { after: 260 },
      indent: { left: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Referral Questions", size: 18 })],
      spacing: { after: 260 },
      indent: { left: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Conclusions", size: 18 })],
      spacing: { after: 260 },
      indent: { left: 300 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Functional Abilities Determination and Job Match Results",
          size: 18,
        }),
      ],
      spacing: { after: 300 },
      indent: { left: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Test Data:", size: 18 })],
      spacing: { before: 120, after: 260 },
      indent: { left: 300 },
    }),
    // --- BULLETS ---
    new Paragraph({
      children: [
        new TextRun({ text: "• ", size: 20, color: "000000" }), // small black bullet
        new TextRun({ text: "Activity Overview", size: 18 }),
      ],
      spacing: { after: 100 },
      indent: { left: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "• ", size: 20, color: "000000" }),
        new TextRun({ text: "Extremity Strength", size: 18 }),
      ],
      spacing: { after: 100 },
      indent: { left: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "• ", size: 20, color: "000000" }),
        new TextRun({ text: "Occupational Tasks", size: 18 }),
      ],
      spacing: { after: 100 },
      indent: { left: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "• ", size: 20, color: "000000" }),
        new TextRun({ text: "Range of Motion (Spine)", size: 18 }),
      ],
      spacing: { after: 300 },
      indent: { left: 400 },
    }),
    // --- END BULLETS ---
    new Paragraph({
      children: [
        new TextRun({ text: "Appendix One: Reference Charts", size: 18 }),
      ],
      spacing: { before: 160, after: 260 },
      indent: { left: 300 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Appendix Two: Digital Library", size: 18 }),
      ],
      spacing: { after: 260 },
      indent: { left: 300 },
    }),
    new Paragraph({ children: [], spacing: { after: 600 } }), // Spacer
  ];

  const lineTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    indent: { size: 3000, type: WidthType.DXA }, // 720 = 0.5 inch
    rows: [
      new TableRow({
        height: { value: 8000, rule: HeightRule.EXACT },
        children: [
          new TableCell({
            borders: {
              left: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
              top: { style: BorderStyle.SINGLE, color: "FFFFFF", size: 0 },
              right: { style: BorderStyle.SINGLE, color: "FFFFFF", size: 0 },
              bottom: { style: BorderStyle.SINGLE, color: "FFFFFF", size: 0 },
            },
            children: contentChildren,
          }),
        ],
      }),
    ],
  });

  children.push(new Paragraph({ text: "", spacing: { after: 1080 } }));
  children.push(lineTable);
}

async function addClientInformation(children, body) {
  // children.push(new Paragraph({ children: [new PageBreak()] }));

  const clinicName =
    body?.evaluatorData?.clinicName || body?.clinicName || "MedSource";
  const clinicAddress =
    body?.evaluatorData?.clinicAddress ||
    body?.clinicAddress ||
    "1490-5A Quarterpath Road #242, Williamsburg, VA 23185";
  // const phoneFax =
  //   body?.evaluatorData?.clinicPhone || body?.clinicPhone ||
  //   "Phone: 757-220-5051 Fax: 757-273-6198";
  const phoneFax =
    `Phone: ${body?.clinicPhone || ""} Fax: ${body?.clinicPhone || ""}`.trim();

  // --- 🔹 Dynamic Header Lines ---
  const headerLines = [
    // "Functional Abilities Determination", // Fixed main headline
    "FCE Executive Summary",
    clinicName,
    clinicAddress,
    phoneFax,
  ];
  const cd = body?.claimantData || {};
  const fullName = `${cd.firstName || ""} ${cd.lastName || ""}`.trim();
  const dob = cd.dateOfBirth || "";
  const age = dob
    ? (() => {
      try {
        const d = new Date(dob);
        const diff = Date.now() - d.getTime();
        return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
      } catch {
        return "";
      }
    })()
    : "";
  const heightDisp = `${cd.height || ""} ${cd.heightUnit || ""}`.trim();
  const weightDisp = `${cd.weight || ""} ${cd.weightUnit || ""}`.trim();
  const idDisp = cd.claimantId || body?.claimNumber || "";
  const phone = cd.phone || "";
  const workPhone = cd.workPhone || "n/a";
  const gender = cd.gender || "";
  const dominant = cd.dominantHand || "";
  const occupation = cd.currentOccupation || cd.occupation || "";
  const employer = cd.employer || "";
  const referredBy = cd.referredBy || cd.physician || "";
  const restingPulse = cd.restingPulse || "";
  const bpSitting = cd.bpSitting || "";
  const testedBy = body?.evaluatorData.name || "";

  const clientInfoRowsData = [
    ["Name:", fullName || "N/A", "ID:", idDisp || "N/A"],
    [
      "Address:",
      cd.address || "N/A",
      "DOB (Age):",
      `${dob || "N/A"}${age !== "" ? ` (${age})` : ""}`,
    ],
    ["Gender:", gender || "N/A", "Height:", heightDisp || "N/A"], // ✅ moved height beside gender
    ["Home Phone:", phone || "N/A", "Weight:", weightDisp || "N/A"],
    ["Work Phone:", workPhone || "N/A", "Dominant Hand:", dominant || "N/A"],
    ["Occupation:", occupation || "N/A", "Referred By:", referredBy || "N/A"],
    ["Employer(SIC):", employer || "N/A", "Resting Pulse:", restingPulse || ""],
    ["Insurance:", cd.insurance || "N/A", "BP Sitting:", bpSitting || ""],
    ["Physician:", referredBy || "N/A", "Tested By:", testedBy || ""],
  ];

  // Use the same logo logic as addCoverPage
  let logoBuffer = null;
  const logoSources = [
    body?.logoPath,
    body?.evaluatorData?.clinicLogo,
    body?.logoUrl,
    body?.logo,
  ].filter(Boolean);

  for (const src of logoSources) {
    // eslint-disable-next-line no-await-in-loop
    logoBuffer = await getImageBuffer(src);
    if (logoBuffer) break;
  }

  if (!logoBuffer) {
    logoBuffer = await getImageBuffer(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/256px-React-icon.svg.png",
    );
  }

  if (logoBuffer) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 80, height: 80 },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
    );
  }

  headerLines.forEach((line, idx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: true,
            color: line.startsWith("FCE") ? BRAND_COLOR : "000000",
            size: idx === 0 ? 24 : idx === 1 ? 20 : 18,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: idx === headerLines.length - 1 ? 10 : 5 },
      }),
    );
  });
  children.push(new Paragraph({ text: "", spacing: { after: 300 } }));

  const bodyImageUrl =
    "https://images.pexels.com/photos/5155762/pexels-photo-5155762.jpeg?auto=compress&cs=tinysrgb&w=600";

  // Prefer dynamically provided pain illustration image; fall back to sample
  let bodyDiagramBackBuffer = null;
  if (body?.painIllustrationData?.compositedViews) {
    bodyDiagramBackBuffer = await getImageBuffer(
      body.painIllustrationData.compositedViews,
    );
  }

  if (!bodyDiagramBackBuffer) {
    bodyDiagramBackBuffer = await fetchImageBuffer(bodyImageUrl);
  }

  children.push(new Paragraph({ text: "", spacing: { after: 100 } }));

  // Collect up to THREE relevant images from pain step only (support {dataUrl,name} or plain strings)
  const extraImages = [];
  if (
    Array.isArray(body?.painIllustrationData?.savedImageData) &&
    body.painIllustrationData.savedImageData.length
  ) {
    for (const item of body.painIllustrationData.savedImageData.slice(0, 3)) {
      const dataUrl =
        typeof item === "string" ? item : item?.dataUrl || item?.src || "";
      const label =
        typeof item === "object" ? item?.name || item?.title || "" : "";
      if (!dataUrl) continue;
      // eslint-disable-next-line no-await-in-loop
      const buf = await getImageBuffer(dataUrl);
      if (buf) extraImages.push({ buf, label });
    }
  }

  // Optional 4-view composited grid (front/back/left/right) similar to PDF
  const compositedViewsInput = body?.painIllustrationData?.compositedViews;
  const painViews = Array.isArray(compositedViewsInput)
    ? compositedViewsInput
    : Array.isArray(compositedViewsInput?.imageUrls)
      ? compositedViewsInput.imageUrls
      : [];
  const painViewBuffers = [];
  for (const url of painViews) {
    const buf = await getImageBuffer(url);
    if (buf) painViewBuffers.push(buf);
  }

  // Legend Table with red symbols (this table should retain its borders)
  const legendTable = new Table({
    width: { size: 95, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        indent: { left: 0 },
        children: [
          createTableCellForPain("Area of Primary Concern", true, "FFFF99"),
        ],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("P1    Primary")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("P2    Secondary")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createTableCellForPain("Pain Indicator", true, "FFFF99")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("~    Primary")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("/    Shooting")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("x    Burning")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("•    Pins and Needles")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("o    Numbness")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createTableCellForPain("General", true, "FFFF99")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("T    Temperature")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("SW   Swelling")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("S    Scar")],
      }),
      new TableRow({
        indent: { left: 0 },
        children: [createColoredSymbolCell("C    Crepitus")],
      }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
    },
  });

  const clientInfoTable = new Table({
    borders: noBorders,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: clientInfoRowsData.map(
      (row) =>
        new TableRow({
          children: [
            // Column 1 (Label)
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[0],
                      bold: true,
                      size: 16,
                    }),
                  ],
                  spacing: { after: 0 },
                }),
              ],
              borders: noBorders,
            }),
            // Column 2 (Value)
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[1],
                      size: 16,
                    }),
                  ],
                  spacing: { after: 0 },
                }),
              ],
              borders: noBorders,
            }),
            // Column 3 (Label)
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[2],
                      bold: true,
                      size: 16,
                    }),
                  ],
                  spacing: { after: 0 },
                }),
              ],
              borders: noBorders,
            }),
            // Column 4 (Value)
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[3],
                      size: 16,
                    }),
                  ],
                  spacing: { after: 0 },
                }),
              ],
              borders: noBorders,
            }),
          ],
        }),
    ),
    layout: TableLayoutType.AUTOFIT,
    borders: {
      ...noBorders,
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    spacing: { after: 0 },
  });

  // Prefer a real claimant photo if provided
  const claimantPhotoSrc =
    cd.profilePhoto || body?.profilePhoto || body?.photoUrl;
  const sampleImageBuffer = claimantPhotoSrc
    ? await getImageBuffer(claimantPhotoSrc)
    : await getSampleImageBuffer();
  const claimantName =
    body.claimantName ||
    `${body?.claimantData?.lastName || ""}, ${body?.claimantData?.firstName || ""}`.trim() ||
    "Unknown";
  // Main layout table for Report Date, Photo, Client Information, and Mechanism
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED, // <-- FIXED width layout (important!)
      columnWidths: [2500, 6500],
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            // LEFT COLUMN
            new TableCell({
              borders: noBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Report Date: ${currentDate}`,
                      bold: true,
                      size: 16,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 20 },
                }),
                sampleImageBuffer
                  ? new Paragraph({
                    children: [
                      new ImageRun({
                        data: sampleImageBuffer,
                        transformation: { width: 120, height: 120 },
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 10 },
                  })
                  : new Paragraph({
                    text: "[Photo Placeholder]",
                    alignment: AlignmentType.START,
                    spacing: { after: 10 },
                    border: {
                      top: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "CCCCCC",
                      },
                      bottom: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "CCCCCC",
                      },
                      left: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "CCCCCC",
                      },
                      right: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "CCCCCC",
                      },
                    },
                  }),

                new Paragraph({
                  children: [
                    new TextRun({
                      text: claimantName,
                      size: 16,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 20 },
                }),
              ],
              verticalAlign: "top",
            }),

            // RIGHT COLUMN — Contains Client Information and Mechanism sections
            new TableCell({
              verticalAlign: "top",
              borders: {
                top: { style: BorderStyle.SINGLE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.SINGLE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, // vertical dividing line
                right: { style: BorderStyle.SINGLE, size: 0, color: "FFFFFF" },
              },

              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Client Information",
                      bold: true,
                      color: BRAND_COLOR,
                      size: 18,
                    }),
                  ],
                  spacing: { after: 80 },
                }),
                clientInfoTable,

                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Mechanism and History of Injury",
                      bold: true,
                      color: BRAND_COLOR,
                      size: 18,
                    }),
                  ],
                  spacing: { before: 80, after: 80 },
                }),

                // Mechanism Table
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  layout: TableLayoutType.FIXED,
                  borders: noBorders,
                  columnWidths: [2000, 7000],
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: "Date",
                                  bold: true,
                                  size: 16,
                                }),
                              ],
                            }),
                          ],
                          borders: noBorders,
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: "Description",
                                  bold: true,
                                  size: 16,
                                }),
                              ],
                            }),
                          ],
                          borders: noBorders,
                        }),
                      ],
                    }),
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({ text: currentDate, size: 16 }),
                              ],
                            }),
                          ],
                          borders: noBorders,
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: cd.claimantHistory || "",
                                  size: 16,
                                }),
                              ],
                            }),
                          ],
                          borders: noBorders,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  // Separate section for Pain/Symptom Illustration (without vertical divider)
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Pain/Symptom Illustration",
          bold: true,
          color: BRAND_COLOR,
          size: 18,
        }),
      ],
      spacing: { before: 0, after: 50 },
    }),
  );

  // Prepare up to 4 images for a 2x2 grid with robust fallbacks
  const defaultDiagramUrls = [
    "https://melodic-capybara-28bf3c.netlify.app/workerfacts-logo.png",
    "https://firebasestorage.googleapis.com/v0/b/workerfacts-43760.firebasestorage.app/o/human_anatomy_bodies%2Ffront_view.png?alt=media&token=dcfd579a-affc-41b0-a242-2ce6a7765282",
    "https://firebasestorage.googleapis.com/v0/b/workerfacts-43760.firebasestorage.app/o/human_anatomy_bodies%2Fleft_view.png?alt=media&token=be1c07f2-1bee-470a-b463-e2fa5d55eeb6",
    "https://firebasestorage.googleapis.com/v0/b/workerfacts-43760.firebasestorage.app/o/human_anatomy_bodies%2Fright_view.png?alt=media&token=f513bcfb-f6d8-4466-a0bd-18368908d1aa",
  ];

  const providedViews = Array.isArray(
    body?.painIllustrationData?.compositedViews,
  )
    ? body.painIllustrationData.compositedViews
    : [];

  const diagramSources = [...providedViews, ...defaultDiagramUrls].slice(0, 4);

  const diagramBuffers = await Promise.all(
    diagramSources.map(
      async (src) =>
        (await fetchImageBuffer(src)) || (await getImageBuffer(src)),
    ),
  );

  let bodyDiagramBuffers = [];

  if (body?.painIllustrationData?.compositedViews) {
    let imageUrls = [];

    // Handle both string and array types
    if (Array.isArray(body.painIllustrationData.compositedViews)) {
      imageUrls = body.painIllustrationData.compositedViews;
    } else if (typeof body.painIllustrationData.compositedViews === "string") {
      imageUrls = body.painIllustrationData.compositedViews.split(",");
    }

    for (const url of imageUrls) {
      try {
        const buffer = await getImageBuffer(url.trim());
        if (buffer) bodyDiagramBuffers.push(buffer);
      } catch (err) {
        console.error("Error loading image:", url, err);
      }
    }
  }
  // Fallback: if no composited buffers resolved, use providedViews/defaults buffers
  if (!bodyDiagramBuffers.length) {
    bodyDiagramBuffers = (diagramBuffers || []).filter(Boolean);
  }

  const diagramCells = bodyDiagramBuffers.map(
    (buf, idx) =>
      new TableCell({
        borders: noBorders,
        verticalAlign: VerticalAlign.CENTER, // ensures content inside cell centers vertically
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER, // horizontal centering
            spacing: { before: 0, after: 0 },
            children: buf
              ? [
                new ImageRun({
                  data: buf,
                  transformation: { width: 130, height: 200 },
                }),
              ]
              : [new TextRun(`Image ${idx + 1} not available`)],
          }),
        ],
      }),
  );

  // Side-by-side diagram and legend
  const rows = [];

  // LEFT COLUMN TABLE (4 images + reference images)
  const leftTableRows = [];

  // Row for main 4 images
  leftTableRows.push(
    new TableRow({
      tableHeader: false,
      children: diagramCells.length ? diagramCells.slice(0, 4) : [],
      height: { value: 1800, rule: HeightRule.ATLEAST }, // ensures vertical space for centering
    }),
  );

  // If reference images exist, add them below
  if (
    body?.painIllustrationData?.savedImageData &&
    body?.painIllustrationData?.savedImageData?.length > 0
  ) {
    const referenceImageCells = [];

    body.painIllustrationData.savedImageData.forEach((ref) => {
      const imgCellChildren = [];

      const title = typeof ref === "object" ? ref.title || ref.name || "" : "";
      if (title) {
        imgCellChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 10, after: 10 },
            children: [
              new TextRun({
                text: title,
                color: BRAND_COLOR,
                bold: true,
                size: 16,
              }),
            ],
          }),
        );
      }

      const dataUrl =
        typeof ref === "object"
          ? ref.dataUrl || ref.src || ref.url || ""
          : String(ref || "");
      if (dataUrl) {
        imgCellChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: dataUrl,
                transformation: { width: 50, height: 50 },
              }),
            ],
          }),
        );
      }

      referenceImageCells.push(
        new TableCell({
          children: imgCellChildren,
          borders: noBorders,
          verticalAlign: VerticalAlign.CENTER,
        }),
      );
    });

    // Add row for reference images
    leftTableRows.push(
      new TableRow({
        children: referenceImageCells,
      }),
    );
  }

  // Create LEFT COLUMN table
  const leftColumnTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    columnWidths: [1700, 1700, 1700, 1700],
    rows: leftTableRows,
  });

  // MAIN TWO-COLUMN TABLE (diagram + legend)
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: noBorders,
      columnWidths: [7500, 2000],
      rows: [
        new TableRow({
          children: [
            // LEFT COLUMN
            new TableCell({
              borders: noBorders,
              children: [leftColumnTable],
            }),

            // RIGHT COLUMN (legend)
            new TableCell({
              children: [legendTable],
              borders: noBorders,
              margins: { top: 0, bottom: 0, left: 20, right: 0 },
            }),
          ],
        }),
      ],
    }),
  );
}

async function addReferenceChartsContent(children) {
  // === Add new page ===
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // === Title ===
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Appendix One: Reference Charts",
          bold: true,
          color: BRAND_COLOR,
          size: 16,
        }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Perceived Exertion and Pain Scales",
          bold: true,
          color: BRAND_COLOR,
          size: 16,
        }),
      ],
    }),
  );

  // === Activity Rating Table ===
  const activityTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    rows: [
      new TableRow({
        children: [
          paddedCell("Perceived Exertion", {
            bold: true,
            size: 16,
            fill: "FFFF99",
          }),
          paddedCell("Rating (RPE)", { bold: true, size: 16, fill: "FFFF99" }),
          paddedCell("Minimal Heart Rate", {
            bold: true,
            size: 16,
            fill: "FFFF99",
          }),
          paddedCell("Mean Heart Rate", {
            bold: true,
            size: 16,
            fill: "FFFF99",
          }),
          paddedCell("Maximal Heart Rate", {
            bold: true,
            size: 16,
            fill: "FFFF99",
          }),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("No exertion at all"),
          paddedCell("6"),
          paddedCell("69"),
          paddedCell("77"),
          paddedCell("91"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Extremely light"),
          paddedCell("7"),
          paddedCell("76"),
          paddedCell("85"),
          paddedCell("101"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell(""),
          paddedCell("8"),
          paddedCell("83"),
          paddedCell("93"),
          paddedCell("111"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Very light"),
          paddedCell("9"),
          paddedCell("89"),
          paddedCell("101"),
          paddedCell("122"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell(""),
          paddedCell("10"),
          paddedCell("96"),
          paddedCell("110"),
          paddedCell("132"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Light"),
          paddedCell("11"),
          paddedCell("103"),
          paddedCell("118"),
          paddedCell("142"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell(""),
          paddedCell("12"),
          paddedCell("110"),
          paddedCell("126"),
          paddedCell("153"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Somewhat hard"),
          paddedCell("13"),
          paddedCell("116"),
          paddedCell("135"),
          paddedCell("163"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell(""),
          paddedCell("14"),
          paddedCell("123"),
          paddedCell("143"),
          paddedCell("173"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Hard(heavy)"),
          paddedCell("15"),
          paddedCell("130"),
          paddedCell("151"),
          paddedCell("184"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell(""),
          paddedCell("16"),
          paddedCell("137"),
          paddedCell("159"),
          paddedCell("194"),
        ],
      }),

      new TableRow({
        children: [
          paddedCell("Very hard"),
          paddedCell("17"),
          paddedCell("143"),
          paddedCell("168"),
          paddedCell("204"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell(""),
          paddedCell("18"),
          paddedCell("150"),
          paddedCell("176"),
          paddedCell("215"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Extremely hard"),
          paddedCell("19"),
          paddedCell("157"),
          paddedCell("184"),
          paddedCell("225"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Maximal exertion"),
          paddedCell("20"),
          paddedCell("164"),
          paddedCell("193"),
          paddedCell("235"),
        ],
      }),
    ],
  });

  children.push(activityTable);
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: "*Borg G. Borg's Perceived Exertion and Pain Scales. Human Kinetics. 1998.",
          bold: true,
          size: 14,
        }),
      ],
    }),
  );
  // === Add space before next table ===
  children.push(new Paragraph({ spacing: { after: 300 } }));

  // === Title 2 ===
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Physical Demand Characteristics of Work",
          bold: true,
          color: BRAND_COLOR,
          size: 16,
        }),
      ],
    }),
  );

  // === Physical Demand Table ===
  const physicalDemandTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
            columnSpan: 4,
            shading: { fill: "FFFF99" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Physical Demand Characteristics of Work",
                    bold: true,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
            columnSpan: 4,
            shading: { fill: "FFFF99" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "(Dictionary of Occupational Titles - Volume II, Fourth Edition, Revised 1991)",
                    bold: true,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Physical Demand Level", { bold: true, fill: "FFFF99" }),
          paddedCell("Seldom / Occasionally (0–33%)", {
            bold: true,
            fill: "FFFF99",
          }),
          paddedCell("Frequently (34–66%)", { bold: true, fill: "FFFF99" }),
          paddedCell("Constantly (67–100%)", { bold: true, fill: "FFFF99" }),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Sedentary"),
          paddedCell("Up to 10 lbs of force"),
          paddedCell("Negligible weight"),
          paddedCell("Negligible weight"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Light"),
          paddedCell("11–25 lbs of force"),
          paddedCell("Up to 10 lbs of force"),
          paddedCell("Negligible weight"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Medium"),
          paddedCell("26–50 lbs of force"),
          paddedCell("10–25 lbs of force"),
          paddedCell("Up to 10 lbs of force"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Heavy"),
          paddedCell("51–100 lbs of force"),
          paddedCell("26–50 lbs of force"),
          paddedCell("11–25 lbs of force"),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Very Heavy"),
          paddedCell("Over 100 lbs of force"),
          paddedCell("Over 50 lbs of force"),
          paddedCell("Over 25 lbs of force"),
        ],
      }),
    ],
  });

  children.push(physicalDemandTable);

  // === PDC Categories based on Sustainable Energy Level ===
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "PDC Categories based on Sustainable Energy Level",
          bold: true,
          color: BRAND_COLOR,
          size: 16,
        }),
      ],
      spacing: { before: 200, after: 200 },
    }),
  );

  const pdcTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
            columnSpan: 2,
            shading: { fill: "FFFF99" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "PDC Categories based on Sustainable Energy Level (Energy Cost) over an 8-hour workday",
                    bold: true,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("PDC Category", { bold: true, size: 16, fill: "FFFF99" }),
          paddedCell("Sustainable Energy Level", {
            bold: true,
            size: 16,
            fill: "FFFF99",
          }),
        ],
      }),
      new TableRow({
        children: [paddedCell("Sedentary"), paddedCell("< 1.7 Kcal/min")],
      }),
      new TableRow({
        children: [paddedCell("Light"), paddedCell("1.7 to 3.2 Kcal/min")],
      }),
      new TableRow({
        children: [paddedCell("Medium"), paddedCell("3.3 to 5.7 Kcal/min")],
      }),
      new TableRow({
        children: [paddedCell("Heavy"), paddedCell("5.8 to 8.2 Kcal/min")],
      }),
      new TableRow({
        children: [
          paddedCell("Very Heavy"),
          paddedCell("8.3 or more Kcal/min"),
        ],
      }),
    ],
  });

  children.push(pdcTable);

  // General Patterns of Activity Descriptors
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "General Patterns of Activity Descriptors",
          bold: true,
          color: BRAND_COLOR,
          size: 16,
        }),
      ],
      spacing: { before: 400, after: 200 },
    }),
  );

  // Activity descriptors
  const descriptors = [
    {
      title: "(S) Sedentary Work",
      description:
        "Exerting up to 10 lbs of force occasionally and/or a negligible amount of force frequently to lift, carry, push, pull, or otherwise move objects, including the human body. Sedentary work involves sitting most of the time but may involve walking or standing for brief periods of time. Jobs are sedentary if walking and standing are required occasionally and all other sedentary criteria are met. Strength is considered sedentary when none of the light strength requirements are met and standing is required less than or equal to 1/3 of the work schedule or workday. For civilian workers, 30.6 percent of workers were required to work at a sedentary strength level. Occupations with critical tasks where workers typically spend the day sitting and occasionally lift items of little weight, like a pen or a few pieces of paper, require sedentary strength.",
    },
    {
      title: "(L) Light Work",
      description:
        "Exerting 11 to 25 lb of force occasionally, and/or up to 10 lb of force frequently, and/or a negligible amount of force constantly to move objects. Physical demand requirements are in excess of those for sedentary work. Even though the weight lifted may be only negligible, a job should be rated Light Work: (1) when it requires walking or standing to a significant degree; or (2) when it requires sitting most of the time but entails pushing and/or pulling of arm or leg controls; and/or (3) when the job requires working at a production rate pace entailing the constant pushing and/or pulling of materials even though the weight of those materials is negligible. The constant stress and strain of maintaining a production rate pace, especially in an industrial setting, can be and is physically exhausting. If the work level of an occupation does not meet the conditions for the other strength levels, including sedentary, a light strength level is required. For civilian workers, 33.3 percent of workers were required to work at a light strength level.",
    },
    {
      title: "(M) Medium Work",
      description:
        "Exerting 26 to 50 lbs of force occasionally, and/or 11 to 25 lbs of force frequently, and/or greater than negligible up to 10 lbs of force constantly to move objects. Physical demand requirements are in excess of those for light work. For civilian workers, 29.0 percent of workers were required to work at a medium strength level.",
    },
    {
      title: "(H) Heavy Work",
      description:
        "Exerting 51 to 100 lbs of force occasionally, and/or 26 to 50 lbs of force frequently, and/or 11 to 25 lbs of force constantly to move objects. Physical demand requirements are in excess of those for medium work. For civilian workers, 6.4 percent of workers were required to work at a heavy strength level.",
    },
    {
      title: "(VH) Very Heavy",
      description:
        "Exerting over 100 lbs of force occasionally, and over 50 lbs of force frequently, and over 25 lbs of force constantly to move objects. For civilian workers, 0.7 percent required a very heavy strength level, which indicates requirements beyond the conditions set for heavy work. Examples of occupational groups with heavy strength level requirements include: Laborers in construction and extraction occupations may lift items that weigh 50 pounds or more, like bags of cement or sheets of plywood, for more than 1/3 of the workday. *'Occasionally' indicates that an activity or condition exists up to one third of the time; 'frequently' indicates that an activity or condition exists from one third to two thirds of the time; 'constantly' indicates that an activity or condition exists two thirds or more of the time. *Duration levels are used to calculate the amount of time spent lifting or carrying. There are four duration levels in relation to a job's workday schedule: seldom (up to 2 percent), occasional (2 percent to 1/3), frequent (1/3 to 2/3), and constant (2/3 or more).",
    },
  ];

  descriptors.forEach((desc) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: desc.title,
            bold: true,
            size: 16,
          }),
        ],
        spacing: { before: 200, after: 100 },
      }),
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: desc.description,
            size: 16,
          }),
        ],
        spacing: { after: 200 },
      }),
    );
  });

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "'*Occasionally' indicates that an activity or condition exists up to one third of the time; 'frequently' indicates that an activity or condition exists from one third to two thirds of the time; 'constantly' indicates that an activity or condition exists two thirds or more of the time.",
          size: 16,
        }),
      ],
      spacing: { after: 100 },
    }),
  );

  // === Dynamic Lift Test End Point Conditions ===
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Dynamic Lift Test End Point Conditions",
          bold: true,
          color: BRAND_COLOR,
          size: 16,
        }),
      ],
      spacing: { before: 400, after: 200 },
    }),
  );

  const endPointTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
            columnSpan: 2,
            shading: { fill: "FFFF99" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Test End Point Conditions",
                    bold: true,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("CONDITION", { bold: true, size: 16, fill: "FFFF99" }),
          paddedCell("DESCRIPTION", { bold: true, size: 16, fill: "FFFF99" }),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Biomechanical", { size: 16 }),
          paddedCell(
            "The biomechanical stopping point follows the biomechanics of the person as they perform the activity. While you will not be able to teach proper body mechanics during the relatively short duration of an FCE, you should encourage proper body mechanics. Ultimately, you will be assessing the client’s capacity as he or she moves in their usual way to complete each task. The biomechanical stopping point relies on your clinical observation skills and knowledge of proper body mechanics.",
            { size: 16 },
          ),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Physiological", { size: 16 }),
          paddedCell(
            "Physiological response to testing refers to the client’s involuntary reactions to the tests. These reactions include heart rate, blood pressure, respiration rate, changes in pallor, and similar markers. The American College of Sports Medicine recommends keeping the client’s heart rate below 85% of age-predicted maximum heart rate (APMHR) during physically demanding testing, with a recovery to 70% APMHR before commencing the next test.",
            { size: 16 },
          ),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Psychophysical", { size: 16 }),
          paddedCell(
            "The psychophysical ending point is based on the client’s perceived rate of exertion—that is, how the client feels or perceives the difficulty of the task. You can use a scale to rate the perception of difficulty, such as the Borg Scale, or simply ask the client to describe their comfort level with the activity. The test should be terminated at the point where the client feels they can no longer continue and has reached their maximum performance level.",
            { size: 16 },
          ),
        ],
      }),
      new TableRow({
        children: [
          paddedCell("Task Requirement", { size: 16 }),
          paddedCell(
            "A fourth, but still important, stopping criterion is the task requirement. This applies more to return-to-work (RTW) testing when you know the specific physical demands of the job tasks and are assessing the client’s ability to perform them. When the client’s tested ability matches the defined job requirement, you should stop the test because continuing beyond the task requirement could put the client at unnecessary risk.",
            { size: 16 },
          ),
        ],
      }),
    ],
  });

  children.push(endPointTable);
}

async function addDigitalLibraryContent(children, body) {
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Appendix Two: Digital Library",
          bold: true,
          color: BRAND_COLOR,
          size: 16,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 50 },
    }),
  );

  const savedFiles = body?.digitalLibraryData?.savedFileData || [];
  if (savedFiles.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "No images found.", italics: true, size: 16 }),
        ],
      }),
    );
    return;
  }

  const imagesPerRow = 6;
  const numRows = Math.ceil(savedFiles.length / imagesPerRow);
  const imageTableRows = [];

  for (let i = 0; i < numRows; i++) {
    const rowChildren = [];

    for (let j = 0; j < imagesPerRow; j++) {
      const index = i * imagesPerRow + j;
      const file = savedFiles[index];

      if (file) {
        // 🔹 Determine image source
        let imageBuffer = null;

        if (file.dataUrl) {
          const base64 = file.dataUrl.split(",")[1];
          imageBuffer = Buffer.from(base64, "base64");
        } else if (file.url || file.path || file.src) {
          imageBuffer = await getImageBuffer(file.url || file.path || file.src);
        } else if (file.data) {
          imageBuffer = Buffer.from(file.data, "base64");
        }

        rowChildren.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  imageBuffer
                    ? new ImageRun({
                      data: imageBuffer,
                      transformation: { width: 120, height: 120 },
                    })
                    : new TextRun({ text: "[Image Missing]", size: 16 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            borders: noBorders,
            margins: { top: 0, bottom: 0, left: 10, right: 10 },
          }),
        );
      } else {
        rowChildren.push(
          new TableCell({
            children: [new Paragraph("")],
            borders: noBorders,
          }),
        );
      }
    }

    imageTableRows.push(new TableRow({ children: rowChildren }));
    imageTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph("")],
            borders: noBorders,
            columnSpan: imagesPerRow,
          }),
        ],
      }),
    );
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: imageTableRows,
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
      },
    }),
  );

  children.push(new Paragraph({ children: [new PageBreak()] }));
}

async function addReturnToWorkStatusContent(children, body) {
  const referralData = body.referralQuestionsData || {};
  const returnToWorkStatus = referralData.returnToWorkStatus || {};

  // Only render if status is selected
  if (!returnToWorkStatus.status) return;

  // Page break before section
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Section Header Box
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "DBEAFE" }, // light blue
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Return to Work Status",
                      bold: true,
                      size: 16,
                      color: "1e40af",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  children.push(new Paragraph({ text: "" })); // spacing

  // Selected Status
  children.push(
    new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({
          text: "Selected Status: ",
          bold: true,
          size: 16,
        }),
        new TextRun({
          text: returnToWorkStatus.status || "",
          size: 16,
        }),
      ],
    }),
  );

  // Comments
  if (returnToWorkStatus.comments) {
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text: "Comments:",
            bold: true,
            size: 16,
          }),
        ],
      }),
    );

    // Split comments into paragraphs to preserve formatting
    const commentLines = (returnToWorkStatus.comments || "").split("\n");
    for (const line of commentLines) {
      children.push(
        new Paragraph({
          text: line,
          spacing: { after: 40 },
        }),
      );
    }
  }
}

async function addReferralQuestionsContent(children, body) {
  const referralData = body.referralQuestionsData || {};
  const questions = referralData.questions || [];

  // Page break before section
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Section Header Box
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "FFFF99" }, // light yellow
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Referral Questions",
                      bold: true,
                      size: 16,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  // Helper: remove question numbering like "6a)" or "6b)"
  const cleanQuestion = (q) => q.replace(/^\d+[a-zA-Z]?\)?\s*/, "").trim();

  // Helper: Physical Demand Classification block (from your snippet)
  const map = {
    Sedentary: {
      title: "(S) Sedentary Work",
      description:
        "Exerting up to 10 lbs of force occasionally and/or a negligible amount of force frequently to lift, carry, push, pull, or otherwise move objects, including the human body. Sedentary work involves sitting most of the time but may involve walking or standing for brief periods of time. Jobs are sedentary if walking and standing are required occasionally and all other sedentary criteria are met. Strength is considered sedentary when none of the light strength requirements are met and standing is required less than or equal to 1/3 of the work schedule or workday. For civilian workers, 30.6 percent of workers were required to work at a sedentary strength level. Occupations with critical tasks where workers typically spend the day sitting and occasionally lift items of little weight, like a pen or a few pieces of paper, require sedentary strength.",
    },
    Light: {
      title: "(L) Light Work",
      description:
        "Exerting 11 to 25 lb of force occasionally, and/or up to 10 lb of force frequently, and/or a negligible amount of force constantly to move objects. Physical demand requirements are in excess of those for sedentary work. Even though the weight lifted may be only negligible, a job should be rated Light Work: (1) when it requires walking or standing to a significant degree; or (2) when it requires sitting most of the time but entails pushing and/or pulling of arm or leg controls; and/or (3) when the job requires working at a production rate pace entailing the constant pushing and/or pulling of materials even though the weight of those materials is negligible. The constant stress and strain of maintaining a production rate pace, especially in an industrial setting, can be and is physically exhausting. If the work level of an occupation does not meet the conditions for the other strength levels, including sedentary, a light strength level is required. For civilian workers, 33.3 percent of workers were required to work at a light strength level.",
    },
    Medium: {
      title: "(M) Medium Work",
      description:
        "Exerting 26 to 50 lbs of force occasionally, and/or 11 to 25 lbs of force frequently, and/or greater than negligible up to 10 lbs of force constantly to move objects. Physical demand requirements are in excess of those for light work. For civilian workers, 29.0 percent of workers were required to work at a medium strength level.",
    },
    Heavy: {
      title: "(H) Heavy Work",
      description:
        "Exerting 51 to 100 lbs of force occasionally, and/or 26 to 50 lbs of force frequently, and/or 11 to 25 lbs of force constantly to move objects. Physical demand requirements are in excess of those for medium work. For civilian workers, 6.4 percent of workers were required to work at a heavy strength level.",
    },
    "Very Heavy": {
      title: "(VH) Very Heavy Work",
      description:
        "Exerting over 100 lbs of force occasionally, and over 50 lbs of force frequently, and over 25 lbs of force constantly to move objects. For civilian workers, 0.7 percent required a very heavy strength level, which indicates requirements beyond the conditions set for heavy work. Examples of occupational groups with heavy strength level requirements include: Laborers in construction and extraction occupations may lift items that weigh 50 pounds or more, like bags of cement or sheets of plywood, for more than 1/3 of the workday.",
    },
  };

  // Loop through all referral questions dynamically
  for (const [index, q] of questions.entries()) {
    let question = q.question || `Question ${index + 1}`;
    const answer = q.answer || "No answer provided.";
    const images = q.savedImageData || [];

    // Clean up numbering like 6a), 6b), etc.
    question = cleanQuestion(question);

    // Skip conclusion questions
    if (question.toLowerCase().includes("conclusion")) continue;

    // Question Title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: question,
            color: BRAND_COLOR,
            bold: true,
            size: 16,
          }),
        ],
        spacing: { before: 300, after: 150 },
      }),
    );

    // Handle “Physical Demand Classification” type answer (PDC:)
    if (
      question.toLowerCase().includes("physical demand classification") &&
      answer.startsWith("PDC:")
    ) {
      const level = String(answer).split("|")[0].replace("PDC:", "").trim();
      const comments = String(answer).split("|")[1] || "";
      const info = map[level];

      if (info) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `*${level} which is in line with full return to duties.`,
                size: 16,
              }),
            ],
            spacing: { after: 50 },
          }),
        );
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: info.title,
                bold: true,
                color: BRAND_COLOR,
                size: 16,
              }),
            ],
            spacing: { before: 150, after: 50 },
          }),
        );

        children.push(
          new Paragraph({
            children: [new TextRun({ text: info.description, size: 16 })],
            spacing: { after: 100 },
          }),
        );

        // === Physical Demand Table ===
        const physicalDemandTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideHorizontal: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "000000",
            },
            insideVertical: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "000000",
            },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  margins: { top: 100, bottom: 100, left: 150, right: 150 },
                  verticalAlign: VerticalAlign.CENTER,
                  borders: {
                    top: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "000000",
                    },
                    bottom: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "000000",
                    },
                    left: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "000000",
                    },
                    right: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "000000",
                    },
                  },
                  columnSpan: 4,
                  shading: { fill: "FFFF99" },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "Physical Demand Characteristics of Work",
                          bold: true,
                          size: 16,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  margins: { top: 100, bottom: 100, left: 150, right: 150 },
                  verticalAlign: VerticalAlign.CENTER,
                  borders: {
                    top: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "000000",
                    },
                    bottom: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "000000",
                    },
                    left: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "000000",
                    },
                    right: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "000000",
                    },
                  },
                  columnSpan: 4,
                  shading: { fill: "FFFF99" },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "(Dictionary of Occupational Titles - Volume II, Fourth Edition, Revised 1991)",
                          bold: true,
                          size: 16,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                paddedCell("Physical Demand Level", {
                  bold: true,
                  fill: "FFFF99",
                }),
                paddedCell("Occasional (0–33%)", {
                  bold: true,
                  fill: "FFFF99",
                }),
                paddedCell("Frequent (34–66%)", { bold: true, fill: "FFFF99" }),
                paddedCell("Constant (67–100%)", {
                  bold: true,
                  fill: "FFFF99",
                }),
              ],
            }),
            ...[
              [
                "Sedentary",
                "Up to 10 lbs of force",
                "Negligible weight",
                "Negligible weight",
              ],
              [
                "Light",
                "11–25 lbs of force",
                "Up to 10 lbs of force",
                "Negligible weight",
              ],
              [
                "Medium",
                "26–50 lbs of force",
                "10–25 lbs of force",
                "Up to 10 lbs of force",
              ],
              [
                "Heavy",
                "51–100 lbs of force",
                "26–50 lbs of force",
                "11–25 lbs of force",
              ],
              [
                "Very Heavy",
                "Over 100 lbs of force",
                "Over 50 lbs of force",
                "Over 25 lbs of force",
              ],
            ].map(
              ([demandLevel, occasional, frequent, constant]) =>
                new TableRow({
                  children: [
                    paddedCell(demandLevel, {
                      fill: demandLevel === level ? "DBEAFE" : undefined,
                    }),
                    paddedCell(occasional, {
                      fill: demandLevel === level ? "DBEAFE" : undefined,
                    }),
                    paddedCell(frequent, {
                      fill: demandLevel === level ? "DBEAFE" : undefined,
                    }),
                    paddedCell(constant, {
                      fill: demandLevel === level ? "DBEAFE" : undefined,
                    }),
                  ],
                }),
            ),
            // new TableRow({
            //   children: [
            //     paddedCell("Sedentary"),
            //     paddedCell("Up to 10 lbs of force"),
            //     paddedCell("Negligible weight"),
            //     paddedCell("Negligible weight"),
            //   ],
            // }),
            // new TableRow({
            //   children: [
            //     paddedCell("Light"),
            //     paddedCell("Up to 20 lbs of force"),
            //     paddedCell("Up to 10 lbs of force"),
            //     paddedCell("Negligible weight"),
            //   ],
            // }),
            // new TableRow({
            //   children: [
            //     paddedCell("Medium"),
            //     paddedCell("20–50 lbs of force"),
            //     paddedCell("10–25 lbs of force"),
            //     paddedCell("Up to 10 lbs of force"),
            //   ],
            // }),
            // new TableRow({
            //   children: [
            //     paddedCell("Heavy"),
            //     paddedCell("50–100 lbs of force"),
            //     paddedCell("25–50 lbs of force"),
            //     paddedCell("10–20 lbs of force"),
            //   ],
            // }),
            // new TableRow({
            //   children: [
            //     paddedCell("Very Heavy"),
            //     paddedCell("Over 100 lbs of force"),
            //     paddedCell("Over 50 lbs of force"),
            //     paddedCell("Over 20 lbs of force"),
            //   ],
            // }),
          ],
        });

        children.push(physicalDemandTable);
        if (comments) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Additional Comments: ${comments}`,
                  italics: true,
                  size: 16,
                }),
              ],
              spacing: { after: 100 },
            }),
          );
        }
      }

      // Add reference images (if any) before continue
      if (Array.isArray(images) && images.length > 0) {
        const imageCells = [];

        for (const item of images) {
          try {
            let buffer = null;
            if (typeof item === "string") {
              if (/^data:image\//i.test(item)) {
                const base64 =
                  item.split(",")[1] ||
                  item.replace(/^data:image\/\w+;base64,/, "");
                buffer = base64 ? Buffer.from(base64, "base64") : null;
              } else {
                buffer = await getImageBuffer(item);
              }
            } else if (item && typeof item === "object") {
              if (item.dataUrl && /^data:image\//i.test(item.dataUrl)) {
                const base64 =
                  String(item.dataUrl).split(",")[1] ||
                  String(item.dataUrl).replace(/^data:image\/\w+;base64,/, "");
                buffer = base64 ? Buffer.from(base64, "base64") : null;
              } else if (item.url || item.path || item.src) {
                buffer = await getImageBuffer(
                  item.url || item.path || item.src,
                );
              } else if (item.data) {
                buffer = Buffer.from(String(item.data), "base64");
              }
            }

            if (!buffer) continue;

            imageCells.push(
              new TableCell({
                borders: noBorders,
                width: { size: 2400, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        data: buffer,
                        transformation: { width: 100, height: 80 },
                      }),
                    ],
                  }),
                ],
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
            );
          } catch (e) {
            console.warn("[DOCX] Failed to insert image:", e);
          }
        }

        if (imageCells.length > 0) {
          children.push(
            new Table({
              rows: [new TableRow({ children: imageCells })],
              width: { size: 10000, type: WidthType.DXA },
              alignment: AlignmentType.CENTER,
            }),
          );
        }
      }

      continue; // skip to next question
    }

    // Add other predefined tables (Lumbar, etc.)
    if (question.toLowerCase().includes("lumbar range of motion")) {
      children.push(generateLumbarMotionTable());
    } else {
      // Default answer
      children.push(
        new Paragraph({
          children: [new TextRun({ text: answer, size: 16 })],
          spacing: { before: 100, after: 150 },
        }),
      );
    }

    // Add reference images (if any)
    if (Array.isArray(images) && images.length > 0) {
      const imageCells = [];

      for (const item of images) {
        try {
          let buffer = null;

          // --- Resolve image source ---
          if (typeof item === "string") {
            if (/^data:image\//i.test(item)) {
              const base64 =
                item.split(",")[1] ||
                item.replace(/^data:image\/\w+;base64,/, "");
              buffer = base64 ? Buffer.from(base64, "base64") : null;
            } else {
              buffer = await getImageBuffer(item);
            }
          } else if (item && typeof item === "object") {
            if (item.dataUrl && /^data:image\//i.test(item.dataUrl)) {
              const base64 =
                String(item.dataUrl).split(",")[1] ||
                String(item.dataUrl).replace(/^data:image\/\w+;base64,/, "");
              buffer = base64 ? Buffer.from(base64, "base64") : null;
            } else if (item.url || item.path || item.src) {
              buffer = await getImageBuffer(item.url || item.path || item.src);
            } else if (item.data) {
              buffer = Buffer.from(String(item.data), "base64");
            }
          }

          if (!buffer) {
            console.warn("[DOCX] Skipping image; could not resolve buffer");
            continue;
          }

          // --- Create one cell per image ---
          imageCells.push(
            new TableCell({
              borders: noBorders,
              width: { size: 2400, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: buffer,
                      transformation: { width: 100, height: 80 }, // 👈 smaller size
                    }),
                  ],
                }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          );
        } catch (e) {
          console.warn("[DOCX] Failed to insert image:", e);
        }
      }

      // --- Add table containing all images in one row ---
      if (imageCells.length > 0) {
        children.push(
          new Table({
            rows: [
              new TableRow({
                children: imageCells,
              }),
            ],
            width: { size: 10000, type: WidthType.DXA },
            alignment: AlignmentType.CENTER,
          }),
        );
      }
    }
  }
}

async function addConclusionContent(children, body) {
  const referralData = body.referralQuestionsData || {};
  const questions = referralData.questions || [];
  const conclusionData = referralData.conclusionData || {};

  children.push(
    new Paragraph({
      spacing: { after: 300 },
    }),
  );

  // === Conclusions Header Box ===
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "FFFF99" }, // light yellow
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Conclusions",
                      bold: true,
                      size: 16,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  // Small space after header
  children.push(
    new Paragraph({
      children: [],
      spacing: { before: 100, after: 200 },
    }),
  );

  // === Return to Work Status ===
  const returnToWorkStatus = conclusionData.returnToWorkStatus || {};
  if (returnToWorkStatus.status) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Return to Work Status",
            bold: true,
            size: 16,
            color: "1e40af",
          }),
        ],
        spacing: { before: 100, after: 100 },
      }),
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Status: ${returnToWorkStatus.status}`,
            size: 16,
          }),
        ],
        spacing: { after: 100 },
      }),
    );

    if (returnToWorkStatus.comments) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Comments:",
              bold: true,
              size: 16,
            }),
          ],
          spacing: { after: 80 },
        }),
      );

      // Split comments into paragraphs
      const commentLines = returnToWorkStatus.comments.split("\n");
      for (const line of commentLines) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: line,
                size: 16,
              }),
            ],
          }),
        );
      }
    }

    children.push(
      new Paragraph({
        children: [],
        spacing: { before: 100, after: 100 },
      }),
    );
  }

  // === RPDR Behaviors (Observed Symptom Behavior) ===
  const rpdrBehaviors = conclusionData.rpdrBehaviors || {};
  const checkedRpdrBehaviors = Object.entries(rpdrBehaviors)
    .filter(([_, checked]) => checked === true)
    .map(([behavior]) => behavior);

  if (checkedRpdrBehaviors.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Observed Symptom Behavior / Reliability of Pain and Disability Reports (RPDR)",
            bold: true,
            size: 16,
            color: "1e40af",
          }),
        ],
        spacing: { before: 100, after: 80 },
      }),
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Observable demonstrations of the patient that were consistent or inconsistent with the medical diagnosis and reported pain level.",
            size: 14,
            italics: true,
          }),
        ],
        spacing: { after: 100 },
      }),
    );

    for (const behavior of checkedRpdrBehaviors) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${behavior}`,
              size: 16,
            }),
          ],
          spacing: { after: 60 },
        }),
      );
    }

    children.push(
      new Paragraph({
        children: [],
        spacing: { before: 100, after: 100 },
      }),
    );
  }

  // === CTP Behaviors (Observable Signs of Effort) ===
  const ctpBehaviors = conclusionData.ctpBehaviors || {};
  const checkedCtpBehaviors = Object.entries(ctpBehaviors)
    .filter(([_, checked]) => checked === true)
    .map(([behavior]) => behavior);

  if (checkedCtpBehaviors.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Observable Signs of Effort / Competitive Testing Performance (CTP)",
            bold: true,
            size: 16,
            color: "1e40af",
          }),
        ],
        spacing: { before: 100, after: 80 },
      }),
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Observable behaviors in which a person attempts to gain an advantage to improve scores.",
            size: 14,
            italics: true,
          }),
        ],
        spacing: { after: 100 },
      }),
    );

    for (const behavior of checkedCtpBehaviors) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${behavior}`,
              size: 16,
            }),
          ],
          spacing: { after: 60 },
        }),
      );
    }

    children.push(
      new Paragraph({
        children: [],
        spacing: { before: 100, after: 100 },
      }),
    );
  }

  // === Find Conclusion Question ===
  const conclusionQuestion = questions.find(
    (q) =>
      q?.question &&
      q.question.toLowerCase().includes("conclusion") &&
      (q.answer || (q.savedImageData && q.savedImageData.length > 0)),
  );

  // === Conclusion Answer ===
  if (conclusionQuestion?.answer) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Conclusion",
            bold: true,
            size: 16,
            color: "000000",
          }),
        ],
        spacing: { before: 100, after: 80 },
      }),
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: conclusionQuestion.answer,
            size: 16,
            color: "000000",
          }),
        ],
        spacing: { before: 80, after: 200 },
      }),
    );
  }

  // === Conclusion Images (if any) ===
  if (
    conclusionQuestion &&
    Array.isArray(conclusionQuestion.savedImageData) &&
    conclusionQuestion.savedImageData.length > 0
  ) {
    for (const imgData of conclusionQuestion.savedImageData) {
      try {
        const base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: buffer,
                transformation: { width: 400, height: 250 },
              }),
            ],
            spacing: { before: 100, after: 100 },
          }),
        );
      } catch (e) {
        console.warn("Invalid image data for conclusion section.");
      }
    }
  }

  // === Signature of Evaluator Header ===
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [],
    }),
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "FFFF99" }, // same yellow box
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Signature of Evaluator",
                      bold: true,
                      color: "000000",
                      size: 16,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  // === Signature Details (Date, Name, License) ===
  if (body.signatureImage) {
    try {
      const base64Data = body.signatureImage.replace(
        /^data:image\/\w+;base64,/,
        "",
      );
      const buffer = Buffer.from(base64Data, "base64");

      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new ImageRun({
              data: buffer,
              transformation: { width: 150, height: 75 },
            }),
          ],
          spacing: { before: 300, after: 150 },
        }),
      );
    } catch (e) {
      console.warn("Invalid signature image data:", e.message);
      children.push(
        new Paragraph({
          text: "__________________________________________",
          spacing: { before: 300, after: 150 },
        }),
      );
    }
  } else {
    children.push(
      new Paragraph({
        text: "__________________________________________",
        spacing: { before: 300, after: 150 },
      }),
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Date: ${currentDate}`, size: 16 })],
      spacing: { after: 100 },
    }),
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: body.evaluatorData.name,
          bold: true,
          size: 16,
        }),
      ],
      spacing: { after: 50 },
    }),
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `License: ${body.evaluatorData.licenseNo}`,
          size: 16,
          color: "444444",
        }),
      ],
    }),
  );
}

async function addFunctionalAbilitiesDeterminationContent(children, body) {
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Define job requirements by test name (mirror client PDF logic)
  const getJobRequirements = (testName) => {
    const testNameLower = (testName || "").toLowerCase();

    // Strength
    if (testNameLower.includes("grip")) {
      return {
        requirement: "Grip strength ≥20 kg (Light work) / ≥30 kg (Medium work)",
        lightWork: 20,
        mediumWork: 30,
        unit: "kg",
        type: "weight",
      };
    }
    if (testNameLower.includes("key") && testNameLower.includes("pinch")) {
      return {
        requirement: "Key pinch ≥4.3 kg (Light) / ≥7.0 kg (Medium work)",
        lightWork: 4.3,
        mediumWork: 7.0,
        unit: "kg",
        type: "weight",
      };
    }
    if (testNameLower.includes("tip") && testNameLower.includes("pinch")) {
      return {
        requirement: "Tip pinch ≥1.8 kg (Light) / ≥3.7 kg (Medium work)",
        lightWork: 1.8,
        mediumWork: 3.7,
        unit: "kg",
        type: "weight",
      };
    }
    if (testNameLower.includes("palmar") && testNameLower.includes("pinch")) {
      return {
        requirement: "Palmar pinch ≥2.1 kg (Light) / ≥4.3 kg (Medium work)",
        lightWork: 2.1,
        mediumWork: 4.3,
        unit: "kg",
        type: "weight",
      };
    }

    // ROM - Cervical
    if (testNameLower.includes("cervical")) {
      if (testNameLower.includes("flexion"))
        return {
          requirement: "Cervical flexion ≥45°",
          norm: 45,
          functionalMin: 45,
          unit: "degrees",
          type: "degrees",
        };
      if (testNameLower.includes("extension"))
        return {
          requirement: "Cervical extension ≥45°",
          norm: 45,
          functionalMin: 45,
          unit: "degrees",
          type: "degrees",
        };
      if (testNameLower.includes("lateral"))
        return {
          requirement: "Cervical lateral flexion ≥35°",
          norm: 35,
          functionalMin: 35,
          unit: "degrees",
          type: "degrees",
        };
    }

    // ROM - Lumbar
    if (testNameLower.includes("lumbar")) {
      if (testNameLower.includes("flexion"))
        return {
          requirement: "Lumbar flexion ≥80°",
          norm: 80,
          functionalMin: 60,
          unit: "degrees",
          type: "degrees",
        };
      if (testNameLower.includes("extension"))
        return {
          requirement: "Lumbar extension ≥20°",
          norm: 20,
          functionalMin: 15,
          unit: "degrees",
          type: "degrees",
        };
    }

    // ROM - Shoulder
    if (testNameLower.includes("shoulder")) {
      if (testNameLower.includes("flexion"))
        return {
          requirement: "Shoulder flexion ≥150°",
          norm: 150,
          functionalMin: 120,
          unit: "degrees",
          type: "degrees",
        };
      if (testNameLower.includes("abduction"))
        return {
          requirement: "Shoulder abduction ��150°",
          norm: 150,
          functionalMin: 120,
          unit: "degrees",
          type: "degrees",
        };
      if (testNameLower.includes("extension"))
        return {
          requirement: "Shoulder extension ≥45°",
          norm: 45,
          functionalMin: 30,
          unit: "degrees",
          type: "degrees",
        };
    }

    // ROM - Hip
    if (testNameLower.includes("hip")) {
      if (testNameLower.includes("flexion"))
        return {
          requirement: "Hip flexion ≥90°",
          norm: 90,
          functionalMin: 80,
          unit: "degrees",
          type: "degrees",
        };
      if (testNameLower.includes("extension"))
        return {
          requirement: "Hip extension ≥20°",
          norm: 20,
          functionalMin: 15,
          unit: "degrees",
          type: "degrees",
        };
      if (testNameLower.includes("abduction"))
        return {
          requirement: "Hip abduction ≥35°",
          norm: 35,
          functionalMin: 25,
          unit: "degrees",
          type: "degrees",
        };
    }

    // Lifting
    if (testNameLower.includes("lift")) {
      return {
        requirement: "Lifting capacity ≥10 kg (Light) / ≥25 kg (Medium work)",
        lightWork: 10,
        mediumWork: 25,
        unit: "kg",
        type: "weight",
      };
    }

    // Cardio
    if (
      testNameLower.includes("step") ||
      testNameLower.includes("cardio") ||
      testNameLower.includes("treadmill")
    ) {
      return {
        requirement:
          "Cardiovascular endurance within normal limits for work demands",
        norm: null,
        unit: "bpm",
        type: "cardio",
      };
    }

    return {
      requirement: "Functional capacity within normal work demands",
      type: "general",
    };
  };

  // Evaluate Job Match (mirror client PDF logic priorities)
  const evaluateJobMatch = (test) => {
    const jobReq = getJobRequirements(test.testName);
    const leftAvg = calculateAverage(test.leftMeasurements);
    const rightAvg = calculateAverage(test.rightMeasurements);

    // Priority 1: explicit selection
    if (test.jobMatch === "matched") return true;
    if (test.jobMatch === "not_matched") return false;

    // Priority 2: normLevel override
    if (test.normLevel === "yes") return true;
    if (test.normLevel === "no") return false;

    // Priority 3: compare to standards / user target
    if (jobReq.type === "weight") {
      const maxResult = Math.max(leftAvg, rightAvg);
      if (test.valueToBeTestedNumber) {
        const userTarget = parseFloat(test.valueToBeTestedNumber);
        return maxResult >= userTarget;
      }
      if (jobReq.mediumWork) return maxResult >= jobReq.lightWork; // at least Light
      if (jobReq.norm) return maxResult >= jobReq.norm;
    }

    if (jobReq.type === "degrees") {
      const name = (test.testName || "").toLowerCase();
      let testResult;
      if (name.includes("flexion") && name.includes("extension")) {
        testResult = leftAvg; // assume left=Flexion
      } else if (name.includes("flexion")) {
        testResult = Math.max(leftAvg, rightAvg);
      } else if (name.includes("extension")) {
        testResult = Math.max(leftAvg, rightAvg);
      } else if (name.includes("abduction")) {
        testResult = Math.max(leftAvg, rightAvg);
      } else {
        testResult = Math.max(leftAvg, rightAvg);
      }
      if (test.valueToBeTestedNumber) {
        const userTarget = parseFloat(test.valueToBeTestedNumber);
        return testResult >= userTarget;
      }
      if (jobReq.functionalMin) return testResult >= jobReq.functionalMin;
      if (jobReq.norm) return testResult >= jobReq.norm;
    }

    // Priority 4: demonstrated
    if (test.demonstrated === true) return true;

    return false;
  };

  // Build unified test list from multiple sources
  const normalizeNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const gatherTests = () => {
    const list = [];

    // Primary array from testData.tests if provided
    if (Array.isArray(body.testData?.tests) && body.testData.tests.length > 0) {
      // Use the comprehensive test data from client
      body.testData.tests.forEach((test) => {
        list.push({
          testName: test.testName || "",
          category: test.category || test.testType || "",
          leftMeasurements: test.leftMeasurements || {},
          rightMeasurements: test.rightMeasurements || {},
          valueToBeTestedNumber:
            test.valueToBeTestedNumber || test.target || undefined,
          valueToBeTestedUnit: test.valueToBeTestedUnit || "",
          result: test.result || "",
          comments: test.comments || test.description || "",
          normLevel: test.normLevel,
          demonstrated: test.demonstrated,
          perceived: test.perceived,
          jobRequirements: test.jobRequirements || "",
          jobMatch: test.jobMatch,
          jobDemands: test.jobDemands,
          jobDescription: test.jobDescription || "",
          effort: test.effort || "",
          observations: test.observations || [],
          trials: Array.isArray(test.trials) ? test.trials : [],
          unitMeasure: test.unitMeasure || "",
        });
      });
      return list;
    }

    // Fallback: derive from mtmTestData (object or array)
    const mtm = body.mtmTestData || {};
    const mtmValues = Array.isArray(mtm) ? mtm : Object.values(mtm);
    for (const item of mtmValues) {
      if (!item) continue;
      const testName = item.testName || item.name || item.id || "Test";
      const leftMeasurements =
        item.leftMeasurements ||
        item.measurementsLeft ||
        item.measurements?.left ||
        item.left ||
        {};
      const rightMeasurements =
        item.rightMeasurements ||
        item.measurementsRight ||
        item.measurements?.right ||
        item.right ||
        {};
      const valueToBeTestedNumber =
        item.valueToBeTestedNumber || item.target || undefined;
      list.push({
        testName,
        category: item.mtmCategory || item.category || item.testType || "",
        leftMeasurements,
        rightMeasurements,
        valueToBeTestedNumber,
        valueToBeTestedUnit: item.valueToBeTestedUnit || "",
        result: item.result || "",
        comments: item.comments || item.description || "",
        normLevel: item.normLevel,
        demonstrated: item.demonstrated,
        perceived: item.perceived,
        jobRequirements: item.jobRequirements || "",
        jobMatch: item.jobMatch,
        jobDemands: item.jobDemands,
        jobDescription: item.jobDescription || "",
        effort: item.effort || "",
        observations: item.observations || [],
        trials: Array.isArray(item.trials) ? item.trials : [],
        unitMeasure: item.unitMeasure || "",
      });
    }
    return list;
  };

  const unifiedTests = gatherTests();

  // Group tests by category (mirror client)
  const categories = {
    Strength: [],
    "ROM Total Spine/Extremity": [],
    "ROM Hand/Foot": [],
    "Occupational Tasks": [],
    Cardio: [],
  };
  for (const test of unifiedTests) {
    const testName = (test.testName || "").toLowerCase();
    const originalCategory = (test.category || test.testType || "")
      .toLowerCase()
      .trim();

    // Prefer exact category names if provided by client
    if (test.category === "ROM Hand/Foot") {
      categories["ROM Hand/Foot"].push(test);
      continue;
    }
    if (test.category === "ROM Total Spine/Extremity") {
      categories["ROM Total Spine/Extremity"].push(test);
      continue;
    }
    if (test.category === "Cardio") {
      categories["Cardio"].push(test);
      continue;
    }
    if (test.category === "Occupational Tasks") {
      categories["Occupational Tasks"].push(test);
      continue;
    }

    // Cardio detection (category or name patterns)
    if (
      originalCategory.includes("cardio") ||
      originalCategory.includes("heart") ||
      originalCategory.includes("aerobic") ||
      testName.includes("step") ||
      testName.includes("treadmill") ||
      testName.includes("mcaft") ||
      testName.includes("kasch") ||
      testName.includes("bruce") ||
      testName.includes("ymca") ||
      testName.includes("cardio") ||
      testName.includes("cardiovascular") ||
      testName.includes("aerobic") ||
      testName.includes("vo2") ||
      testName.includes("heart rate")
    ) {
      categories["Cardio"].push(test);
      continue;
    }

    // ROM Hand/Foot detection
    if (
      (originalCategory.includes("rom") &&
        (originalCategory.includes("hand") ||
          originalCategory.includes("foot"))) ||
      ((testName.includes("hand") ||
        testName.includes("foot") ||
        testName.includes("finger") ||
        testName.includes("wrist") ||
        testName.includes("ankle") ||
        testName.includes("thumb")) &&
        (testName.includes("flexion") ||
          testName.includes("extension") ||
          testName.includes("abduction") ||
          testName.includes("adduction")))
    ) {
      categories["ROM Hand/Foot"].push(test);
      continue;
    }

    // ROM Total Spine/Extremity detection
    if (
      originalCategory.includes("rom") ||
      originalCategory.includes("range") ||
      originalCategory.includes("motion") ||
      testName.includes("flexion") ||
      testName.includes("extension") ||
      testName.includes("spine") ||
      testName.includes("cervical") ||
      testName.includes("back") ||
      testName.includes("shoulder")
    ) {
      categories["ROM Total Spine/Extremity"].push(test);
      continue;
    }

    // Occupational tasks
    if (
      originalCategory.includes("occupational") ||
      originalCategory.includes("task") ||
      testName.includes("fingering") ||
      testName.includes("handling") ||
      testName.includes("reach") ||
      testName.includes("climb") ||
      testName.includes("crawl") ||
      testName.includes("stoop") ||
      testName.includes("walk") ||
      testName.includes("push") ||
      testName.includes("pull") ||
      testName.includes("crouch") ||
      testName.includes("carry") ||
      testName.includes("kneel") ||
      testName.includes("ladder") ||
      testName.includes("balance")
    ) {
      categories["Occupational Tasks"].push(test);
      continue;
    }

    // Default to Strength
    categories["Strength"].push(test);
  }

  // Section Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Functional Abilities Determination and Job Match Results",
          bold: true,
          color: BRAND_COLOR,
          size: 16,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 200 },
    }),
  );

  // Table Header Row (yellow like other tables) with tighter column widths
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      "Activity Tested",
      "Sit Time",
      "Stand Time",
      "Test Results",
      "Job Description",
      "Job Requirements",
      "Job Match (Yes/No)",
    ].map(
      (text) =>
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text, bold: true, size: 16 })],
            }),
          ],
          shading: { fill: "FFFF99" },
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
          },
        }),
    ),
  });

  // Initial Client Interview Row
  const rows = [
    headerRow,
    new TableRow({
      children: [
        "Client Interview Test",
        "45 min",
        "",
        "N/A",
        "Initial assessment and history gathering",
        "Basic interview requirements",
        "Yes",
      ].map(
        (text) =>
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(text), size: 16 })],
              }),
            ],
            margins: { top: 50, bottom: 50 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
      ),
    }),
    // Mirror client: Activity Overview static row
    new TableRow({
      children: [
        "Activity Overview",
        "",
        "5 min",
        "//",
        "General activity overview and preparation",
        "Basic standing and mobility",
        "Yes",
      ].map(
        (text) =>
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(text), size: 16 })],
              }),
            ],
            margins: { top: 50, bottom: 50 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
      ),
    }),
  ];

  // Add grouped categories
  for (const [category, tests] of Object.entries(categories)) {
    if (tests.length === 0) continue;

    // Category header row
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 7,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: category,
                    bold: true,
                    color: BRAND_COLOR,
                    size: 16,
                  }),
                ],
                alignment: AlignmentType.LEFT,
              }),
            ],
            shading: { fill: "DBEAFE" },
            margins: { top: 50, bottom: 50, left: 80 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
        ],
      }),
    );

    // Each test row
    for (const test of tests) {
      const leftAvg = calculateAverage(test.leftMeasurements);
      const rightAvg = calculateAverage(test.rightMeasurements);
      const jobReq = getJobRequirements(test.testName);
      const jobMatch = evaluateJobMatch(test) ? "Yes" : "No";

      // Determine sit/stand based on test name (mirror client)
      const tn = (test.testName || "").toLowerCase();
      const isStandingTest =
        tn.includes("lumbar") ||
        tn.includes("cervical") ||
        tn.includes("thoracic") ||
        tn.includes("shoulder") ||
        tn.includes("elbow") ||
        tn.includes("wrist") ||
        tn.includes("reach") ||
        tn.includes("crouch") ||
        tn.includes("stoop") ||
        tn.includes("bend") ||
        tn.includes("balance") ||
        tn.includes("climb") ||
        tn.includes("walk") ||
        tn.includes("push") ||
        tn.includes("pull") ||
        tn.includes("carry") ||
        tn.includes("lift") ||
        tn.includes("overhead");
      const sitTime = isStandingTest ? "" : "5 min";
      const standTime = isStandingTest ? "5 min" : "";

      // Job requirements display (mirror client PDF logic exactly)
      const jobRequirementsText = (() => {
        const jobReq = getJobRequirements(test.testName);

        // Show user's specific target only for weight-based tests
        if (test.valueToBeTestedNumber && jobReq.type === "weight") {
          return `Target: ${test.valueToBeTestedNumber} ${test.valueToBeTestedUnit || jobReq.unit}`;
        }

        // Show norm status if user indicated
        if (test.normLevel === "yes") {
          return "Within Normal Limits";
        } else if (test.normLevel === "no") {
          return "Below Normal Limits";
        }

        // Show industry standards based on test type
        if (jobReq.type === "weight") {
          if (jobReq.lightWork && jobReq.mediumWork) {
            return `≥${jobReq.lightWork} ${jobReq.unit} (Light) / ≥${jobReq.mediumWork} ${jobReq.unit} (Medium)`;
          } else if (jobReq.norm) {
            return `≥${jobReq.norm} ${jobReq.unit}`;
          }
        }

        if (jobReq.type === "degrees") {
          if (jobReq.functionalMin && jobReq.norm) {
            return `≥${jobReq.functionalMin}° (Min) / ≥${jobReq.norm}° (Normal)`;
          } else if (jobReq.norm) {
            return `≥${jobReq.norm}°`;
          }
        }

        return "Functional Assessment";
      })();

      // Test results format logic like ReviewReport (mirror client PDF exactly)
      const testResultsText = (() => {
        if (test.result && typeof test.result === "string") return test.result;

        // Cardio matches PDF: show HR pre//post if available, else Norm
        if (category === "Cardio") {
          const leftPreHR = test.leftMeasurements?.preHeartRate || 0;
          const leftPostHR = test.leftMeasurements?.postHeartRate || 0;
          const rightPreHR = test.rightMeasurements?.preHeartRate || 0;
          const rightPostHR = test.rightMeasurements?.postHeartRate || 0;

          const hrData =
            leftPreHR > 0 || leftPostHR > 0 || rightPreHR > 0 || rightPostHR > 0
              ? `${Math.max(leftPreHR, rightPreHR)}//${Math.max(leftPostHR, rightPostHR)}`
              : "Norm";
          return hrData;
        }

        if (category === "Occupational Tasks") {
          const avgResult = (leftAvg + rightAvg) / 2;
          return `%IS=${avgResult.toFixed(1)}`;
        }

        if (
          category === "ROM Hand/Foot" ||
          category === "ROM Total Spine/Extremity"
        ) {
          const testNameLower = test.testName.toLowerCase();
          if (
            testNameLower.includes("flexion") &&
            testNameLower.includes("extension")
          ) {
            return `F=${leftAvg.toFixed(2)} E=${rightAvg.toFixed(2)}`;
          }
          if (testNameLower.includes("lateral")) {
            return `L=${leftAvg.toFixed(2)} R=${rightAvg.toFixed(2)}`;
          }
          return `F=${leftAvg.toFixed(2)} E=${rightAvg.toFixed(2)}`;
        }

        if ((test.testName || "").toLowerCase().includes("lift")) {
          const unit = (
            test.unitMeasure ||
            test.valueToBeTestedUnit ||
            jobReq.unit ||
            ""
          ).toLowerCase();
          const baseAvg = leftAvg > 0 ? leftAvg : rightAvg;
          if (baseAvg > 0) {
            const avgWeight =
              unit === "kg"
                ? Math.round(baseAvg * 2.20462 * 10) / 10
                : Math.round(baseAvg * 10) / 10;
            return `${avgWeight.toFixed(1)} lbs`;
          }
        }

        return `L=${leftAvg.toFixed(1)} R=${rightAvg.toFixed(1)}`;
      })();

      const rowData = [
        test.testName || "",
        sitTime,
        standTime,
        testResultsText,
        test.jobRequirements || "Functional capacity assessment",
        jobRequirementsText,
        jobMatch,
      ];

      rows.push(
        new TableRow({
          children: rowData.map(
            (text, idx) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: String(text), size: 16 })],
                  }),
                ],
                margins: { top: 40, bottom: 40 },
                width:
                  idx === 0
                    ? { size: 22, type: WidthType.PERCENTAGE }
                    : idx === 1
                      ? { size: 8, type: WidthType.PERCENTAGE }
                      : idx === 2
                        ? { size: 8, type: WidthType.PERCENTAGE }
                        : idx === 3
                          ? { size: 12, type: WidthType.PERCENTAGE }
                          : idx === 4
                            ? { size: 22, type: WidthType.PERCENTAGE }
                            : idx === 5
                              ? { size: 20, type: WidthType.PERCENTAGE }
                              : { size: 8, type: WidthType.PERCENTAGE }, // Yes/No compact
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                },
              }),
          ),
        }),
      );
    }
  }

  // Build the DOCX Table
  let finalTotalSitTime = 45;
  let finalTotalStandTime = 5;
  for (const test of unifiedTests) {
    const name = (test.testName || "").toLowerCase();
    const isStandingTest =
      name.includes("lumbar") ||
      name.includes("cervical") ||
      name.includes("thoracic") ||
      name.includes("shoulder") ||
      name.includes("elbow") ||
      name.includes("wrist") ||
      name.includes("reach") ||
      name.includes("crouch") ||
      name.includes("stoop") ||
      name.includes("bend") ||
      name.includes("balance") ||
      name.includes("climb") ||
      name.includes("walk") ||
      name.includes("push") ||
      name.includes("pull") ||
      name.includes("carry") ||
      name.includes("lift") ||
      name.includes("overhead");
    if (isStandingTest) {
      finalTotalStandTime += 5;
    } else {
      finalTotalSitTime += 5;
    }
  }

  const totalsData = [
    "Total Sit / Stand Time",
    `${finalTotalSitTime} min`,
    `${finalTotalStandTime} min`,
    "",
    "",
    "",
    "",
  ];

  rows.push(
    new TableRow({
      children: totalsData.map(
        (text, idx) =>
          new TableCell({
            children: [
              new Paragraph({
                alignment:
                  idx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: String(text),
                    bold: idx <= 2 && String(text).length > 0,
                    size: 16,
                  }),
                ],
              }),
            ],
            shading: { fill: "FFFF99" },
            margins: { top: 50, bottom: 50 },
            width:
              idx === 0
                ? { size: 22, type: WidthType.PERCENTAGE }
                : idx === 1
                  ? { size: 8, type: WidthType.PERCENTAGE }
                  : idx === 2
                    ? { size: 8, type: WidthType.PERCENTAGE }
                    : idx === 3
                      ? { size: 12, type: WidthType.PERCENTAGE }
                      : idx === 4
                        ? { size: 22, type: WidthType.PERCENTAGE }
                        : idx === 5
                          ? { size: 20, type: WidthType.PERCENTAGE }
                          : { size: 8, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
      ),
    }),
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    // layout: TableLayoutType.FIXED,
    rows,
    alignment: AlignmentType.CENTER,
  });

  children.push(table);

  // Legend
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Legend: ",
          bold: true,
          size: 16,
        }),
        new TextRun({
          text: "L=Left, R=Right, F=Flexion, E=Extension, %IS=% Industrial Standard, HR=Heart Rate",
          size: 16,
        }),
      ],
      spacing: { before: 200 },
    }),
  );

  // ----------------------------
  // 1️⃣ Consistency Overview Table
  // ----------------------------

  children.push(
    new Paragraph({
      spacing: { after: 200 },
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Consistency Overview",
          bold: true,
          color: BRAND_COLOR,
          size: 16,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 50 },
    }),
  );

  // Calculate actual effort counts from unified tests
  const effortCounts = {
    poor: 0,
    fair: 0,
    good: 0,
    demonstrated: 0,
    notDemonstrated: 0,
  };

  unifiedTests.forEach((test) => {
    // Count demonstrated vs not demonstrated
    if (test.demonstrated) {
      effortCounts.demonstrated++;
    } else {
      effortCounts.notDemonstrated++;
    }

    // Categorize effort based on the effort field
    const effort = test.effort ? test.effort.toLowerCase() : "";
    if (effort === "poor") {
      effortCounts.poor++;
    } else if (
      effort === "fair" ||
      effort === "average" ||
      effort === "fair to average"
    ) {
      effortCounts.fair++;
    } else if (effort === "good") {
      effortCounts.good++;
    } else {
      // Default to fair if no specific effort recorded
      effortCounts.fair++;
    }
  });

  const totalTests = unifiedTests.length;

  const consistencyOverviewTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    // layout: TableLayoutType.FIXED,
    rows: [
      // === Header Row ===
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },

            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Observed Effort During Testing",
                    bold: true,
                    size: 16,
                  }),
                ],
              }),
            ],
            shading: { fill: "FFFF99" },
          }),
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },

            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Total Noted for all Tested Activities",
                    bold: true,
                    size: 16,
                  }),
                ],
              }),
            ],
            shading: { fill: "FFFF99" },
          }),
        ],
      }),

      // === Body Rows ===
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Poor effort", size: 16 })], // 16pt = 32 half-points
              }),
            ],
          }),
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${effortCounts.poor} out of ${totalTests} Tests`,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Fair to Average effort", size: 16 }),
                ],
              }),
            ],
          }),
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${effortCounts.fair} out of ${totalTests} Tests`,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Good effort", size: 16 })],
              }),
            ],
          }),
          new TableCell({
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${effortCounts.good} out of ${totalTests} Tests`,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  children.push(consistencyOverviewTable);

  children.push(
    new Paragraph({
      spacing: { after: 200 },
    }),
  );

  // Build dynamic Consistent Crosschecks table (no TS types)
  const referralQuestionsData =
    body.referralQuestionsData || body.referralQuestions || {};
  const crosschecks = computeCrosschecksFromUnifiedTests(
    unifiedTests,
    referralQuestionsData,
  );
  const consistentCrosschecksTable =
    buildConsistentCrosschecksTable(crosschecks);
  children.push(consistentCrosschecksTable);
}

async function addActivityRatingChart(children, body) {
  // === Add new page ===
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // === Header ===
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Client Perceived Activity Rating Chart",
          bold: true,
          color: BRAND_COLOR,
          size: 16,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 50 },
    }),
  );

  // === Description ===
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "The Activity Rating Chart is a measure of the client's perceived ability level at the time of testing and is a representation of their subjective responses.",
          italics: true,
          size: 16,
        }),
      ],
      spacing: { before: 100, after: 300 },
    }),
  );

  // === Chart Settings (Reduced width) ===
  const width = 700; // decreased from 900 → 700
  const height = 470; // slightly reduced to keep proportion

  // Custom plugin for chart border
  const chartAreaBorder = {
    id: "chartAreaBorder",
    beforeDraw(chart) {
      const {
        ctx,
        chartArea: { left, top, width, height },
      } = chart;
      ctx.save();
      ctx.strokeStyle = "#d1d5db"; // light gray border
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, width, height);
      ctx.restore();
    },
  };

  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
    plugins: { modern: [chartAreaBorder] },
  });

  const labels = body.activityRatingData.activities.map((d) => d.name);
  const ratings = body.activityRatingData.activities.map((d) => d.rating);

  const configuration = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: ratings,
          backgroundColor: [
            "#D4A574", // Yellow/gold
            "#5B9BD5", // Blue
            "#70AD47", // Green
            "#C55A5A", // Red
            "#E87D5A", // Orange
            "#9575CD", // Purple
            "#4FC3F7", // Light blue
            "#66BB6A", // Light green
            "#FFB74D", // Orange yellow
            "#F06292", // Pink
            "#81C784", // Green
            "#64B5F6", // Blue
            "#FFD54F", // Yellow
            "#A1887F", // Brown
            "#90A4AE", // Blue grey
          ],
          borderColor: "#9ca3af",
          borderWidth: 1,
          barPercentage: 0.95,
          categoryPercentage: 0.95,
        },
      ],
    },
    options: {
      indexAxis: "y", // horizontal bars
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 10,
          grid: {
            color: "#e5e7eb",
            lineWidth: 1,
          },
          ticks: {
            stepSize: 1,
            font: { size: 11 },
            color: "#000000",
          },
          border: { display: true, color: "#000000" },
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            padding: 8,
            color: "#000000",
          },
        },
      },
      layout: {
        padding: { top: 10, bottom: 10, left: 10, right: 10 },
      },
      elements: {
        bar: {
          borderSkipped: false, // full rectangle bars
        },
      },
    },
  };

  // === Render Chart and Add to DOCX ===
  const chartBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);

  children.push(
    new Paragraph({
      children: [
        new ImageRun({
          data: chartBuffer,
          transformation: { width: 700, height: 470 },
        }),
      ],
      spacing: { before: 100, after: 100 },
    }),
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: new Date().toLocaleString("en-IN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          size: 16,
        }),
      ],
      spacing: { before: 100, after: 300 },
    }),
  );
}

async function addTestDataContent(children, body) {
  const mtmData = body?.mtmTestData || body?.mtmData || {};
  const mainTestData = body?.testData || {};
  const hasMTM = mtmData && Object.keys(mtmData).length > 0;
  const cardioData = body?.cardioTestData || {};
  const testData = body?.testData?.tests || [];
  console.log(
    "[addTestDataContent] cardio keys:",
    Object.keys(cardioData || {}),
  );
  console.log(
    "[addTestDataContent] test ids:",
    (body?.testData?.tests || []).map((t) => t.testId),
  );

  // 1) Show individual tests (do not return; we will append MTM after)
  if (testData.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "No test data available.", size: 16 })],
        spacing: { after: 100 },
      }),
    );
  } else {
    const occupationalTestIds = [
      "fingering",
      "bi-manual-fingering",
      "handling",
      "bi-manual-handling",
      "reach-immediate",
      "reach-overhead",
      "reach-with-weight",
      "balance",
      "stoop",
      "walk",
      "push-pull-cart",
      "crouch",
      "carry",
      "crawl",
      "climb-stairs",
      "kneel",
      "climb-ladder",
    ];

    const filteredTests = testData.filter((test) => {
      const isOccupational =
        occupationalTestIds.includes(test.testId) ||
        test.testName
          ?.toLowerCase()
          .match(
            /(fingering|handling|reach|balance|stoop|walk|push|pull|cart|crouch|carry|crawl|climb|kneel)/i,
          );
      return !isOccupational;
    });

    if (filteredTests.length === 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "No individual test data available.",
              size: 16,
            }),
          ],
          spacing: { after: 100 },
        }),
      );
    } else {
      // Existing per-test rendering (unchanged)
      for (const test of filteredTests) {
        if (children.length > 0) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }

        const safeName = test?.testName || "Test";
        const testNameLower = safeName.toLowerCase();

        let leftTrials = readTrials(test?.leftMeasurements);
        let rightTrials = readTrials(test?.rightMeasurements);
        let singleTrials = readTrials(test?.measurements);
        const leftAvg = average(leftTrials);
        const rightAvg = average(rightTrials);
        const singleAvg = average(singleTrials);
        const leftCV = calculateCV(test.leftMeasurements);
        const rightCV = calculateCV(test.rightMeasurements);
        const bilateralDef = calculateBilateralDeficiency(leftAvg, rightAvg);

        const isRangeOfMotion =
          testNameLower.includes("flexion") ||
          testNameLower.includes("extension") ||
          testNameLower.includes("range") ||
          testNameLower.includes("thumb") ||
          testNameLower.includes("rotation") ||
          testNameLower.includes("raise") ||
          testNameLower.includes("supination") ||
          testNameLower.includes("radial") ||
          testNameLower.includes("abduction") ||
          testNameLower.includes("inversion");
        // testNameLower.includes("flexion") ||
        // testNameLower.includes("extension") ||
        // testNameLower.includes("range");
        const averageLabel = isRangeOfMotion
          ? "Average (range of motion)"
          : "Average (weight)";
        const isGripTest =
          testNameLower.includes("grip") || testNameLower.includes("pinch");
        const isLiftTest =
          testNameLower.includes("lift") || testNameLower.includes("carry");
        // const isCardioTest = testNameLower.match(
        //   /(bruce|treadmill|mcaft|kasch|step|cardio|cardiovascular)/,
        // );
        const idLower = (test.testId || "").toLowerCase();
        const isCardioTest =
          /(bruce|treadmill|mcaft|kasch|step|cardio|cardiovascular)/.test(
            `${testNameLower} ${idLower}`,
          );

        function safeUnitLabel(raw, fallback = "") {
          const str =
            typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
          return str || fallback;
        }
        // Unit
        const rawUnit = String(test.unitMeasure || "").toLowerCase();
        const measurementUnit = isRangeOfMotion
          ? "°"
          : !rawUnit || rawUnit === "weight"
            ? "lbs"
            : rawUnit;
        // const measurementUnit = safeUnitLabel(
        //   test.unitMeasure ||
        //   test.valueToBeTestedUnit ||
        //   test.unit ||
        //   (isRangeOfMotion ? "°" : "lbs"),
        //   isRangeOfMotion ? "°" : "lbs",
        // );
        // Header
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: safeName,
                bold: true,
                color: BRAND_COLOR,
                size: 16,
              }),
            ],
            spacing: { before: 200, after: 200 },
          }),
        );

        // Build left and right columns
        const leftCol = [];
        const rightCol = [];

        await appendSampleIllustrationsForTest(leftCol, test);

        let description =
          "The client was tested in our facility using standardized assessment protocols. The test results were compared to normative data when available.";
        if (isRangeOfMotion) {
          description =
            "The client was tested using range of motion inclinometers. Results were compared to normative data.";
        } else if (isGripTest) {
          description =
            "The client was tested using a hand grip evaluation device. It is expected that the dominant hand will display 10% greater values than the non-dominant hand.";
        } else if (isLiftTest) {
          description =
            "The client was tested using a dynamic lift evaluation apparatus. Results were compared to normative data.";
        } else if (isCardioTest) {
          if (
            testNameLower.includes("bruce") ||
            testNameLower.includes("treadmill")
          )
            description =
              "The Bruce Treadmill Test measures aerobic endurance by estimating VO₂ max.";
          else if (testNameLower.includes("mcaft"))
            description =
              "mCAFT evaluates aerobic fitness using step cadence protocols.";
          else if (testNameLower.includes("kasch"))
            description =
              "Kasch Step Test assesses post-exercise heart-rate recovery over 3 minutes.";
        }

        rightCol.push(
          new Paragraph({
            children: [new TextRun({ text: description, size: 16 })],
            spacing: { after: 100 },
          }),
        );

        if (
          test.testId?.startsWith("dynamic-lift-") &&
          !test.testId.includes("infrequent")
        ) {
          rightCol.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "Note: frequent lifts are four lifts per cycle.",
                  bold: true,
                  size: 16,
                  color: "FFFFFF",
                }),
              ],
              shading: { fill: "3B82F6" },
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 100 },
            }),
          );
        }

        rightCol.push(
          new Paragraph({
            children: [new TextRun({ text: "Results:", bold: true, size: 16 })],
            spacing: { after: 50 },
          }),
        );

        if (isCardioTest) {
          const cData =
            cardioData?.[test.testId] ?? cardioData?.[safeName] ?? null;

          // Debug
          console.log(
            "[Cardio] testId:",
            test.testId,
            "name:",
            safeName,
            "found:",
            !!cData,
          );

          if (cData) {
            Object.assign(test, {
              vo2Max: cData.vo2MaxScore ?? cData.vo2Max ?? "",
              predictedVo2Max:
                cData.predictedVO2Max ?? cData.predictedVo2Max ?? "",
              classification: cData.classification ?? "",
              hbr: cData.hbr ?? "",
              aerobicFitnessScore: cData.aerobicFitnessScore ?? "",
              clientRating: cData.clientRating ?? "",
              heartRate: cData.heartRate ?? "",
              bloodPressure: cData.bloodPressure ?? "",
              rpe: cData.rpe ?? "",
              clientImages: cData.clientImages ?? [],
              serializedImages: cData.serializedImages ?? [],
            });

            // Optional deeper debug
            console.log("[Cardio] merged:", {
              testId: test.testId,
              vo2Max: test.vo2Max,
              predictedVo2Max: test.predictedVo2Max,
              classification: test.classification,
              hbr: test.hbr,
              aerobicFitnessScore: test.aerobicFitnessScore,
              clientRating: test.clientRating,
              heartRate: test.heartRate,
              bloodPressure: test.bloodPressure,
              rpe: test.rpe,
              clientImages: test.clientImages ?? [],
              serializedImages: test.serializedImages ?? [],
            });
          }

          await addCardioDocxContent(rightCol, test);

          rightCol.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Comments: ", bold: true, size: 16 }),
                new TextRun({
                  text: test.comments || "No additional comments provided.",
                  size: 16,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
          );
          rightCol.push(...buildReferenceParagraphs(test));
        } else {
          // ROM / LIFT / STRENGTH tables (unchanged)
          if (isRangeOfMotion) {
            const romNorm = testNameLower.includes("flexion") ? 60 : 25;
            rightCol.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "000000",
                  },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "000000",
                  },
                  insideHorizontal: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "000000",
                  },
                  insideVertical: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "000000",
                  },
                },
                rows: [
                  new TableRow({
                    children: [
                      "Area Evaluated",
                      "Data",
                      "Valid?",
                      "Norm",
                      "% of Norm",
                      "Test Date",
                    ].map(createHeaderCell),
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: safeName, size: 16 }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: `${Math.max(leftAvg, rightAvg).toFixed(0)} °`,
                                size: 16,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: test.demonstrated ? "Pass" : "Fail",
                                size: 16,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: `${romNorm} °`, size: 16 }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: `${Math.round((Math.max(leftAvg, rightAvg) / romNorm) * 100)}%`,
                                size: 16,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: currentDate, size: 16 }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            );
            // Add side-by-trial breakdown table (below the main summary)
            rightCol.push(
              new Paragraph({ spacing: { before: 100, after: 50 } }),
            );
            rightCol.push(createSideTrialTable(test, measurementUnit));
            rightCol.push(
              new Paragraph({ spacing: { before: 100, after: 50 } }),
            );

            // ==== LIFT TEST SECTION (updated) ====
          } else if (isLiftTest) {
            const avgWeight = Number.isFinite(leftAvg)
              ? leftAvg.toFixed(1)
              : Number.isFinite(rightAvg)
                ? rightAvg.toFixed(1)
                : "-";
            const cvValue = Number.isFinite(leftCV)
              ? `${leftCV.toFixed(0)}%`
              : Number.isFinite(rightCV)
                ? `${rightCV.toFixed(0)}%`
                : "-";

            // Helper to make bordered cell
            const makeCell = (text, { bold = false, shaded = false } = {}) =>
              new TableCell({
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
                shading: shaded ? { fill: "FFFF99" } : undefined, // header background
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 2,
                    color: "000000",
                  },
                  left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 2,
                    color: "000000",
                  },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: text ?? "", bold, size: 16 }),
                    ],
                  }),
                ],
              });

            // Build the summary table (exact match to screenshot)
            rightCol.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  // Header
                  new TableRow({
                    children: [
                      makeCell("Demonstrated Activity", {
                        bold: true,
                        shaded: true,
                      }),
                      makeCell("Avg. Weight (lb)", {
                        bold: true,
                        shaded: true,
                      }),
                      makeCell("CV%", { bold: true, shaded: true }),
                      makeCell("Test Date", { bold: true, shaded: true }),
                    ],
                  }),
                  // Data Row
                  new TableRow({
                    children: [
                      makeCell(safeName),
                      makeCell(avgWeight),
                      makeCell(cvValue),
                      makeCell(currentDate),
                    ],
                  }),
                ],
              }),
            );
            rightCol.push(
              new Paragraph({ spacing: { before: 100, after: 50 } }),
            );
            rightCol.push(createSideTrialTable(test, measurementUnit, true));
            rightCol.push(
              new Paragraph({ spacing: { before: 100, after: 50 } }),
            );
          } else {
            rightCol.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      "Demonstrated Activity",
                      "Avg. Force",
                      "Norm",
                      "% of Norm",
                      "%CV",
                      "Difference",
                      "Date",
                    ].map(createHeaderCell),
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: safeName, size: 16 }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: `${leftAvg.toFixed(1)} | ${rightAvg.toFixed(1)}`,
                                size: 16,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: isGripTest
                                  ? "110.5 | 120.8"
                                  : "85.0 | 90.0",
                                size: 16,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: `${Math.round((leftAvg / (isGripTest ? 110.5 : 85)) * 100)}% | ${Math.round((rightAvg / (isGripTest ? 120.8 : 90)) * 100)}%`,
                                size: 16,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: `${leftCV}% | ${rightCV}%`,
                                size: 16,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: `${bilateralDef.toFixed(1)}%`,
                                size: 16,
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: currentDate, size: 16 }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            );
            // Add side-by-trial breakdown table (below the main summary)
            rightCol.push(
              new Paragraph({ spacing: { before: 100, after: 50 } }),
            );
            rightCol.push(createSideTrialTable(test, measurementUnit));
            rightCol.push(
              new Paragraph({ spacing: { before: 100, after: 50 } }),
            );
          }

          // ==== CHARTS SECTION (robust, single or dual bar charts) ====

          // Local helpers and defaults used by the charts section
          const LEFT_CHART_COLORS = {
            fill: "rgba(30,58,138,0.5)",
            border: "#1E3A8A",
          }; // blue
          const RIGHT_CHART_COLORS = {
            fill: "rgba(4,120,87,0.5)",
            border: "#047857",
          }; // green
          const SINGLE_CHART_COLORS = {
            fill: "rgba(17,24,39,0.5)",
            border: "#111827",
          }; // gray

          // Try to extract trial values (unchanged) ...
          function extractTrialSeries(src) {
            if (!src) return [];
            const asArray = Array.isArray(src) ? src : null;
            if (asArray) {
              return asArray
                .map((v) => (typeof v === "string" ? Number(v) : v))
                .map((v) => (Number.isFinite(v) ? v : 0));
            }

            const keys = [];
            for (let i = 1; i <= 10; i++) {
              keys.push(`trial${i}`, `t${i}`, String(i));
            }

            const out = [];
            for (const key of keys) {
              if (Object.prototype.hasOwnProperty.call(src, key)) {
                let val = src[key];
                val = typeof val === "string" ? Number(val) : val;
                out.push(Number.isFinite(val) ? val : 0);
              }
            }
            // Trim trailing zeros if everything is zero
            const anyNonZero = out.some((v) => v > 0);
            return anyNonZero ? out : [];
          }

          function hasMeaningfulTrialData(series) {
            if (!Array.isArray(series) || series.length === 0) return false;
            return series.some((v) => Number.isFinite(v) && v > 0);
          }

          function computeSuggestedMax(...seriesLists) {
            const flat = seriesLists
              .filter((s) => Array.isArray(s))
              .flat()
              .filter((v) => Number.isFinite(v));
            const maxVal = flat.length ? Math.max(...flat) : 1;
            const headroom = maxVal * 0.15;
            return Math.max(1, Math.ceil(maxVal + headroom));
          }

          // Use a constant to match the margin you use in the chart cell
          const CHART_CELL_MARGIN_TWIPS = 80;

          // Make width the only forced dimension to preserve aspect ratio
          function createTrialChartCell({
            title,
            chartImage,
            averageValue,
            unitLabel,
            imgWidthPx,
            trialLabels = [],
            trialValues = [],
          }) {
            const {
              buffer,
              width: srcW = 640,
              height: srcH = 200,
            } = chartImage || {};
            if (!buffer)
              return new TableCell({ borders: noBorders, children: [] });

            const aspect = srcH / srcW;
            const imgHeightPx = Math.round(imgWidthPx * aspect);

            const labelLine = trialLabels.join("         ");
            // const valueLine = trialValues
            //   .map((v) => (Number.isFinite(v) ? v.toFixed(1) : "n/a"))
            //   .join("      ");
            const valueLine = trialValues
              .map((v) => (Number.isFinite(v) ? v.toString() : "n/a"))
              .join("         ");

            const titleNode = title
              ? new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 },
                children: [
                  new TextRun({ text: title, bold: true, size: 16 }),
                ],
              })
              : null;

            return new TableCell({
              borders: noBorders,
              margins: {
                left: CHART_CELL_MARGIN_TWIPS,
                right: CHART_CELL_MARGIN_TWIPS,
                top: 60,
                bottom: 40,
              },
              children: [
                ...(titleNode ? [titleNode] : []), // no title paragraph (and no gap) when title is empty
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: buffer,
                      transformation: {
                        width: imgWidthPx,
                        height: imgHeightPx,
                      },
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 120, after: 20 },
                  children: [
                    new TextRun({ text: labelLine, bold: true, size: 14 }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 60 },
                  children: [
                    new TextRun({ text: valueLine, size: 14, color: "444444" }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80 },
                  children: [
                    new TextRun({
                      text: `${averageLabel}: ${Number.isFinite(averageValue)
                        ? averageValue.toFixed(1)
                        : "n/a"
                        }${unitLabel ? ` ${unitLabel}` : ""}`,
                      color: "444444",
                      size: 16,
                    }),
                  ],
                }),
              ],
            });
          }

          // Palette for bars (unchanged)
          const TRIAL_BAR_COLORS = [
            "#1E3A8A",
            "#059669",
            "#F59E0B",
            "#EF4444",
            "#8B5CF6",
            "#06B6D4",
          ];
          function hexToRgba(hex, alpha = 0.5) {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!m) return hex;
            const r = parseInt(m[1], 16);
            const g = parseInt(m[2], 16);
            const b = parseInt(m[3], 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }

          // Helper to build per-bar colors for a series length
          function buildBarColors(len) {
            const bg = new Array(len);
            const border = new Array(len);
            for (let i = 0; i < len; i++) {
              const base = TRIAL_BAR_COLORS[i % TRIAL_BAR_COLORS.length];
              bg[i] = hexToRgba(base, 0.5); // semi-transparent fill
              border[i] = base; // solid border
            }
            return { bg, border };
          }
          async function createTrialChartBuffer(
            title,
            dataSeries,
            suggestedMax,
          ) {
            const count = Array.isArray(dataSeries) ? dataSeries.length : 0;
            // Keep your current canvas sizing; we’ll scale in Word
            const width = Math.max(320, Math.min(900, count * 56));
            const height = 200;

            const chartJSNodeCanvas = new ChartJSNodeCanvas({
              width,
              height,
              backgroundColour: "white",
              devicePixelRatio: 3,
              chartCallback: (ChartJS) => {
                try {
                  const {
                    BarElement,
                    CategoryScale,
                    LinearScale,
                    Tooltip,
                    Legend,
                    Title,
                  } = require("chart.js");
                  const ChartDataLabels = require("chartjs-plugin-datalabels");
                  ChartJS.register(
                    BarElement,
                    CategoryScale,
                    LinearScale,
                    Tooltip,
                    Legend,
                    Title,
                    ChartDataLabels,
                  );
                  ChartJS.defaults.font.family = "Arial";
                  ChartJS.defaults.font.size = 12;
                  ChartJS.defaults.color = "#333";
                } catch { }
              },
            });
            const labels = dataSeries.map((_, i) => `T${i + 1}`);
            const values = dataSeries.map((v) =>
              Number.isFinite(v) ? v : null,
            );
            const maxVal = values.reduce((m, v) => Math.max(m, v ?? 0), 0);
            const yMax = Number.isFinite(suggestedMax)
              ? suggestedMax
              : niceMax(maxVal);

            const { bg, border } = buildBarColors(values.length);

            const config = {
              type: "bar",
              data: {
                labels,
                datasets: [
                  {
                    label: title,
                    data: values,
                    backgroundColor: bg,
                    borderColor: border,
                    borderWidth: 1,
                    borderRadius: 6,
                    categoryPercentage: 0.55,
                    barPercentage: 0.8,
                    maxBarThickness: 26,
                  },
                ],
              },
              options: {
                animation: false,
                resizeDelay: 0,
                responsive: false,
                maintainAspectRatio: false,
                layout: { padding: { top: 12, right: 8, bottom: 6, left: 8 } },
                plugins: {
                  legend: { display: false },
                  tooltip: { enabled: false },
                  datalabels: {
                    display: (ctx) => Number.isFinite(ctx.raw),
                    color: "#111",
                    anchor: "end",
                    align: "top",
                    offset: 2,
                    clamp: true,
                    formatter: (val) =>
                      Number.isFinite(val) ? `${Math.round(val)}` : "",
                    font: { size: 12, weight: "bold" },
                  },
                },
                scales: {
                  x: {
                    display: false,
                    grid: { display: false },
                    ticks: { display: false, maxRotation: 0 },
                  },
                  y: {
                    display: false,
                    grid: { display: false },
                    beginAtZero: true,
                    max: yMax,
                    grace: "5%",
                  },
                },
              },
            };

            try {
              const buffer = await chartJSNodeCanvas.renderToBuffer(
                config,
                "image/png",
              );
              return { buffer, width, height };
            } catch (e) {
              console.error("Chart render error", e);
              return null;
            }
          }

          function niceMax(v) {
            /* ... your same implementation ... */
          }

          // Extract series
          const leftSeries = extractTrialSeries(test.leftMeasurements || {});
          const rightSeries = extractTrialSeries(test.rightMeasurements || {});
          // let singleSeries = [];
          let singleSeries = [];

          // Detect meaningful left/right
          const hasLeftSeries = hasMeaningfulTrialData(leftSeries);
          const hasRightSeries = hasMeaningfulTrialData(rightSeries);

          if (!hasLeftSeries && !hasRightSeries) {
            singleSeries = extractTrialSeries(
              test.measurements ||
              test.trials ||
              test.series ||
              test.results ||
              test.data ||
              [],
            );
          }
          // What do we actually have?
          // const hasLeftSeries = hasMeaningfulTrialData(leftSeries);
          // const hasRightSeries = hasMeaningfulTrialData(rightSeries);
          const hasSingleSeries = hasMeaningfulTrialData(singleSeries);
          const canShowRight = !isLiftTest && hasRightSeries;

          // Compute widths AFTER you know how many charts you’ll render
          const RIGHT_COL_TWIPS = 6900; // must match the right column in the outer 3-col table [2000,100,6900]
          const PX_PER_TWIP = 96 / 1440;
          const twoColWidth = Math.floor(RIGHT_COL_TWIPS / 2);
          const oneColWidth = RIGHT_COL_TWIPS;

          // How many charts?
          const nCharts = hasSingleSeries
            ? 1
            : (hasLeftSeries ? 1 : 0) + (canShowRight ? 1 : 0);
          // Only show "Left Side"/"Right Side" when both charts are present
          const showSideTitles = nCharts === 2;
          // Available inner content width per cell (px), account for the 80 twip margins on both sides
          const sideContentPx =
            Math.floor(
              (twoColWidth - CHART_CELL_MARGIN_TWIPS * 2) * PX_PER_TWIP,
            ) - 8;
          const singleContentPx =
            Math.floor(
              (oneColWidth - CHART_CELL_MARGIN_TWIPS * 2) * PX_PER_TWIP,
            ) - 8;

          // Final width we’ll force onto every chart image
          const chartImgWidthPx =
            nCharts === 2 ? sideContentPx : Math.min(620, singleContentPx);

          // Suggested axis max across whatever we will plot
          const suggestedMax = computeSuggestedMax(
            hasLeftSeries ? leftSeries : [],
            canShowRight ? rightSeries : [],
            hasSingleSeries ? singleSeries : [],
          );

          const chartCells = [];

          try {
            if (hasSingleSeries) {
              const img = await createTrialChartBuffer(
                "Trials",
                singleSeries,
                suggestedMax,
              );
              if (img?.buffer) {
                const trialLabels = singleSeries.map((_, i) => `T${i + 1}`);
                const trialValues = singleSeries;
                chartCells.push(
                  createTrialChartCell({
                    title: "",
                    chartImage: img,
                    averageValue: singleAvg,
                    unitLabel: measurementUnit,
                    imgWidthPx: chartImgWidthPx,
                    trialLabels,
                    trialValues,
                  }),
                );
              }
            } else {
              if (hasLeftSeries) {
                const img = await createTrialChartBuffer(
                  "Left",
                  leftSeries,
                  suggestedMax,
                );
                if (img?.buffer) {
                  const trialLabels = leftSeries.map((_, i) => `T${i + 1}`);
                  const trialValues = leftSeries;
                  chartCells.push(
                    createTrialChartCell({
                      title: showSideTitles ? "Left Side" : "",
                      chartImage: img,
                      averageValue: leftAvg,
                      unitLabel: measurementUnit,
                      imgWidthPx: chartImgWidthPx,
                      trialLabels,
                      trialValues,
                    }),
                  );
                }
              }
              if (canShowRight) {
                const img = await createTrialChartBuffer(
                  "Right",
                  rightSeries,
                  suggestedMax,
                );
                if (img?.buffer) {
                  const trialLabels = rightSeries.map((_, i) => `T${i + 1}`);
                  const trialValues = rightSeries;

                  chartCells.push(
                    createTrialChartCell({
                      title: showSideTitles ? "Right Side" : "", // hide when only 1 chart
                      chartImage: img,
                      averageValue: rightAvg,
                      unitLabel: measurementUnit,
                      imgWidthPx: chartImgWidthPx,
                      trialLabels,
                      trialValues,
                    }),
                  );
                }
              }
            }
          } catch (e) {
            // console.error("Chart section error:", e?.message || e);
          }

          // Insert charts into the right column
          if (chartCells.length) {
            const columnWidths =
              nCharts === 2 ? [twoColWidth, twoColWidth] : [oneColWidth];
            rightCol.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED, // important so Word does not auto-resize
                borders: noBorders,
                columnWidths,
                rows: [new TableRow({ children: chartCells })],
              }),
            );
          }

          // Compact summary when both sides exist
          if (!isLiftTest && hasLeftSeries && hasRightSeries) {
            const diff = Math.abs((leftAvg || 0) - (rightAvg || 0));
            const diffSuffix = measurementUnit ? ` ${measurementUnit}` : "";

            const summaryText = [
              `Bilateral Difference: ${diff.toFixed(1)}${diffSuffix}`,
              `CV: L=${Number.isFinite(leftCV) ? leftCV.toFixed(1) : "n/a"}%   R=${Number.isFinite(rightCV) ? rightCV.toFixed(1) : "n/a"}%`,
              `Bilateral Deficiency: ${Number.isFinite(bilateralDef) ? bilateralDef.toFixed(1) : "n/a"}%`,
            ].join("   |   ");

            rightCol.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: summaryText, size: 16, color: "374151" }),
                ],
              }),
            );
          }
          // ==== END CHARTS SECTION ====

          appendHeartRateLine(rightCol, test);
          await appendTestImages(rightCol, test, "Client Images");

          if (test.effort || test.perceived) {
            rightCol.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Rating of Perceived Effort = ${test.perceived || test.effort}`,
                    size: 16,
                    italics: true,
                  }),
                ],
                spacing: { before: 80, after: 80 },
              }),
            );
          }
          const isDynamicLift = isDynamicLiftTest(
            test,
            testNameLower,
            isLiftTest,
          );
          if (isDynamicLift) {
            const endpointText =
              getEndpointConditionText(test) || "Not recorded.";
            rightCol.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Endpoint condition (for full description refer to references): ",
                    bold: true,
                    size: 16,
                  }),
                  new TextRun({ text: endpointText, size: 16 }),
                ],
                spacing: { before: 160, after: 80 },
              }),
            );
          }
          rightCol.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Comments: ", bold: true, size: 16 }),
                new TextRun({
                  text: test.comments || "No additional comments provided.",
                  size: 16,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
          );
          rightCol.push(...buildReferenceParagraphs(test));
        }

        // Combine left/right into 2-column table
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            borders: noBorders,
            columnWidths: [2000, 100, 6900],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorders,
                    children: leftCol,
                    verticalAlign: VerticalAlign.TOP,
                  }),
                  new TableCell({
                    borders: {
                      left: {
                        style: BorderStyle.SINGLE,
                        size: 8,
                        color: "CCCCCC",
                      },
                    },
                    children: [],
                  }),
                  new TableCell({ borders: noBorders, children: rightCol }),
                ],
              }),
            ],
          }),
        );

        children.push(new Paragraph({ children: [], spacing: { after: 300 } }));
      }
    }
  }

  // 2) Always append MTM at the end (tables, no charts)
  if (hasMTM) {
    if (children.length > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    const mtmChildren = await generateMTMContentDocx(mtmData, mainTestData);
    if (mtmChildren?.length > 0) {
      children.push(...mtmChildren);
    }
  }
}

// ===== Route =====
router.post("/", async (req, res) => {
  console.log(
    "📥 Request received for DOCX generation at:",
    new Date().toISOString(),
  );
  console.log("Request body keys:", Object.keys(req.body));

  try {
    if (req.query.dryRun === "1") {
      return res.status(200).json({ ok: true, body: req.body || {} });
    }

    const body = req.body || {};

    const claimantName =
      body.claimantName ||
      `${body?.claimantData?.lastName || ""}, ${body?.claimantData?.firstName || ""}`.trim() ||
      "Unknown";

    // Build cover content separately so its footer applies ONLY to page 1
    const coverChildren = [];
    await addCoverPage(coverChildren, body);
    const coverFooter = coverChildren.__coverFooter || undefined;
    if (coverChildren.__coverFooter) delete coverChildren.__coverFooter;

    // Build remaining pages in a separate children array (no footer)
    const restChildren = [];
    // Contents of Report on current page; page break will be inserted after inside the function
    const contentsChildren = [];
    // await addContentsOfReport(contentsChildren);
    await addClientInformation(restChildren, body);
    await addReturnToWorkStatusContent(restChildren, body);
    await addReferralQuestionsContent(restChildren, body);
    await addConclusionContent(restChildren, body);
    await addFunctionalAbilitiesDeterminationContent(restChildren, body);
    // await addActivityRatingChart(restChildren, body);
    // await addTestDataContent(restChildren, body);
    // await addReferenceChartsContent(restChildren, body);
    // await addDigitalLibraryContent(restChildren, body);

    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: { font: DEFAULT_FONT, size: 24 },
            paragraph: { alignment: AlignmentType.JUSTIFIED },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              font: NARROW_FONT,
              size: 28,
              bold: true,
              color: BRAND_COLOR,
            },
            paragraph: {
              spacing: { before: 200, after: 150 },
              border: {
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 6,
                  color: BRAND_COLOR,
                },
              },
            },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: NARROW_FONT, size: 24, bold: true },
            paragraph: { spacing: { before: 150, after: 100 } },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1480, right: 720, bottom: 720, left: 720 },
            },
          },
          footers: coverFooter ? { default: coverFooter } : undefined,
          children: coverChildren,
        },
        // {
        //   properties: {
        //     page: {
        //       margin: { top: 1440, right: 720, bottom: 720, left: 720 },
        //     },
        //   },
        //   footers: { default: new Footer({ children: [] }) },
        //   children: contentsChildren,
        // },
        {
          properties: {
            page: {
              margin: { top: 1480, right: 720, bottom: 720, left: 720 },
              pageNumberStart: 2,
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: "Page ", font: NARROW_FONT, size: 16 }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: NARROW_FONT,
                      size: 16,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [],
                }),
              ],
            }),
          },
          children: restChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    console.log(
      "✅ DOCX buffer generated successfully, size:",
      buffer.length,
      "bytes",
    );

    // Check first bytes
    console.log("Buffer signature:", buffer.slice(0, 4).toString("hex")); // should start with 504b

    return res
      .status(200)
      .set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="FCE_Report_${claimantName.replace(
          /[^a-zA-Z0-9]/g,
          "_",
        )}_${new Date().toISOString().split("T")[0]}.docx"`,
        "Cache-Control": "no-store, no-transform", // ✅ combine in one header correctly
        "Content-Encoding": "binary", // ✅ prevents UTF-8 / gzip transformation
        "Content-Length": buffer.length,
      })
      .end(Buffer.from(buffer)); // ✅ ensure binary mode
  } catch (err) {
    return res.status(500).json({
      error: "Internal Server Error generating DOCX",
      details: err?.message || String(err),
    });
  }
});

module.exports = router;
