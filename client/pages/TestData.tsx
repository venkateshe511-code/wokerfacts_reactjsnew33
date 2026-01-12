import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Edit,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDemoMode } from "@/hooks/use-demo-mode";
import OccupationalTestConfigurator from "@/components/mtm-tests/OccupationalTestConfigurator";
import MetricPieChart from "@/components/charts/SimpleHeartRatePieChart";
import CardioTestRouter, {
  CardioTestData,
} from "@/components/cardio-tests/CardioTestRouter";
import { calculatePercentISByTest } from "@shared/mtm-standards";
import { inferNormsForTest } from "@/lib/norms";

interface TestMeasurement {
  trial1: number;
  trial2: number;
  trial3: number;
  trial4: number;
  trial5: number;
  trial6: number;
  preHeartRate?: number;
  postHeartRate?: number;
}

interface TestData {
  testId: string;
  testName: string;
  leftMeasurements: TestMeasurement;
  rightMeasurements: TestMeasurement;
  comments: string;
  demonstrated: boolean;
  perceived: string;
  effort: string;
  observations: string[];
  jobRequirements: string;
  jobMatch: "yes" | "no" | "";
  jobDemands: "normal" | "other" | "";
  jobDescription: string;
  normLevel: "yes" | "no" | "";
  valueToBeTestedNumber: string;
  valueToBeTestedUnit: string;
  unitMeasure: string;
  valueToBeTestedNumberLeft?: string;
  valueToBeTestedNumberRight?: string;
}

interface TestDataState {
  tests: TestData[];
  currentTestIndex: number;
}

interface MTMTestConfig {
  numberOfTrials: number;
  numberOfReps: number;
  bodySide?: string;
  plane?: string;
  position?: string;
  direction?: string;
  weight?: number;
  distance?: number;
  weightOptions?: number[];
}

// MTM Test configurations
const mtmTestConfigs: Record<string, MTMTestConfig> = {
  fingering: {
    numberOfTrials: 3,
    numberOfReps: 10,
    bodySide: "Both",
    plane: "Immediate",
    position: "Standing",
  },
  "bi-manual-fingering": {
    numberOfTrials: 3,
    numberOfReps: 10,
    bodySide: "Both",
    plane: "Immediate",
    position: "Standing",
  },
  handling: {
    numberOfTrials: 3,
    numberOfReps: 10,
    bodySide: "Both",
    plane: "Immediate",
    position: "Standing",
  },
  "bi-manual-handling": {
    numberOfTrials: 3,
    numberOfReps: 10,
    bodySide: "Both",
    plane: "Immediate",
    position: "Standing",
  },
  "reach-immediate": {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    plane: "Front",
    position: "Standing",
  },
  "reach-overhead": {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    plane: "Overhead",
    position: "Standing",
  },
  "reach-with-weight": {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    plane: "Front",
    position: "Standing",
  },
  balance: {
    numberOfTrials: 3,
    numberOfReps: 1,
    direction: "Both",
    weight: 0,
    distance: 10,
    position: "Standing",
  },
  stoop: {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    weight: 0,
    distance: 0,
    position: "Standing",
  },
  walk: {
    numberOfTrials: 3,
    numberOfReps: 1,
    direction: "Both",
    distance: 50,
    position: "Standing",
  },
  "push-pull-cart": {
    numberOfTrials: 3,
    numberOfReps: 1,
    direction: "Both",
    weight: 40,
    distance: 8,
    weightOptions: [40, 50, 60],
    position: "Standing",
  },
  crouch: {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    weight: 0,
    distance: 0,
    position: "Crouching",
  },
  carry: {
    numberOfTrials: 3,
    numberOfReps: 1,
    bodySide: "Both",
    weight: 10,
    distance: 12,
    weightOptions: [10, 20, 50],
    position: "Standing",
  },
  crawl: {
    numberOfTrials: 3,
    numberOfReps: 1,
    bodySide: "Both",
    weight: 0,
    distance: 10,
    position: "Crawling",
  },
  "climb-stairs": {
    numberOfTrials: 3,
    numberOfReps: 1,
    direction: "Both",
    weight: 0,
    distance: 4,
    position: "Standing",
  },
  kneel: {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    weight: 0,
    distance: 0,
    position: "Kneeling",
  },
  "climb-ladder": {
    numberOfTrials: 1,
    numberOfReps: 3,
    direction: "Both",
    weight: 0,
    distance: 8,
    position: "Standing",
  },
};

const normalizeWeightUnit = (unit?: string): string => {
  const normalized = (unit || "").toLowerCase();
  return ["lbs", "kg", "oz", "g"].includes(normalized) ? normalized : "lbs";
};

// List of occupational test IDs
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

// Define consistent colors for each measurement type
const measurementColors = {
  trial1: "#3B82F6", // Blue
  trial2: "#10B981", // Green
  trial3: "#F59E0B", // Amber
  trial4: "#EF4444", // Red
  trial5: "#8B5CF6", // Purple
  trial6: "#06B6D4", // Cyan
  preHeartRate: "#F97316", // Orange
  postHeartRate: "#DC2626", // Dark Red
};

const observationOptions = [
  "Facial Grimacing",
  "Moaning",
  "Inappropriate body mechanics",
  "Proper muscle recruitment",
  "Non-injured side favored",
  "Guarded Movement",
  "Slow movements",
  "Rigid Posture",
  "Limping or shifting",
  "Holding or supporting affected area",
  "Shaking",
];

const effortLevels = [
  "No exertion at all",
  "Extremely light",
  "Very light",
  "Light",
  "Somewhat hard",
  "Hard (heavy)",
  "Very hard",
  "Extremely hard",
  "Maximal",
];

export default function TestData() {
  const navigate = useNavigate();
  const isDemoMode = useDemoMode();
  const [testDataState, setTestDataState] = useState<TestDataState>({
    tests: [],
    currentTestIndex: 0,
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "comments" | "demonstrated" | "perceived" | "jobRequirements"
  >("comments");
  const [activeMTMTest, setActiveMTMTest] = useState<string | null>(null);
  const [mtmTestData, setMtmTestData] = useState<Record<string, any>>({});
  const [cardioTestData, setCardioTestData] = useState<
    Record<string, CardioTestData>
  >({});

  // Alert state for threshold violations
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Disable scroll-based input value changes for number inputs
  React.useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === "number") {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const generateSampleTestData = (
    testId: string,
    testName: string,
  ): TestData => {
    const randomValue = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    // Ensure every test gets realistic values - cycle through options based on testId
    const testIndex = testId.split("-").join("").length % 5; // Create consistent variety based on test name

    const demonstratedOptions = [true, true, true, false, true]; // 80% demonstrated
    const perceivedOptions = [
      "Light",
      "Somewhat hard",
      "Hard (heavy)",
      "Very hard",
      "Light",
    ];
    const effortOptions = [
      "Poor",
      "Fair to Average",
      "Good",
      "Fair to Average",
      "Good",
    ];
    const observationSets = [
      [
        "Proper muscle recruitment",
        "Good form maintained",
        "Consistent effort",
      ],
      ["Protective guarding", "Verbal expressions of pain"],
      ["Facial grimacing", "Slow movements", "Guarded movement"],
      ["Slight tremor noted", "Compensatory patterns"],
      [
        "No guarding observed",
        "Good effort demonstrated",
        "Appropriate pacing",
      ],
    ];

    const jobRequirementsSets = [
      "Requires frequent lifting of 25-50 lbs materials throughout 8-hour shift. Essential for warehouse operations and material handling tasks.",
      "Position requires sustained gripping strength for operating hand tools and equipment. Critical for manufacturing assembly line work.",
      "Job demands repetitive flexion and extension movements for data entry and computer work. Necessary for 6+ hours daily office tasks.",
      "Essential for patient care activities including lifting, transferring, and mobility assistance. Required for healthcare worker position.",
      "Construction work requiring consistent bilateral strength for tool operation and material manipulation. Safety-critical job function.",
    ];

    const jobMatchOptions: ("yes" | "no")[] = [
      "yes",
      "yes",
      "no",
      "yes",
      "yes",
    ]; // 80% matched
    const jobDemandsOptions: ("normal" | "other")[] = [
      "normal",
      "other",
      "normal",
      "normal",
      "other",
    ];
    const jobDescriptionSets = [
      "Warehouse associate responsible for inventory management, order picking, and material handling. Requires physical stamina and ability to work in fast-paced environment.",
      "Manufacturing technician operating pneumatic tools and assembly equipment. Must maintain quality standards while meeting production quotas.",
      "Administrative assistant handling data processing, filing, and customer service. Involves prolonged computer use and multitasking abilities.",
      "Certified nursing assistant providing direct patient care in hospital setting. Requires compassionate care and physical assistance capabilities.",
      "Construction laborer specializing in structural assembly and site preparation. Demands teamwork and adherence to safety protocols.",
    ];

    // Assign values based on test index to ensure variety but consistency
    const demonstrated = demonstratedOptions[testIndex];
    const perceived = perceivedOptions[testIndex];
    const effort = effortOptions[testIndex];
    const observations = observationSets[testIndex];
    const jobRequirements = jobRequirementsSets[testIndex];
    const jobMatch = jobMatchOptions[testIndex];
    const jobDemands = jobDemandsOptions[testIndex];
    const jobDescription = jobDescriptionSets[testIndex];

    // Add test-specific observations based on test type
    const testSpecificObservations = [...observations];
    if (
      testName.toLowerCase().includes("grip") ||
      testName.toLowerCase().includes("pinch")
    ) {
      testSpecificObservations.push("Hand positioning appropriate");
    } else if (
      testName.toLowerCase().includes("lift") ||
      testName.toLowerCase().includes("carry")
    ) {
      testSpecificObservations.push("Proper lifting mechanics");
    } else if (
      testName.toLowerCase().includes("flexion") ||
      testName.toLowerCase().includes("extension")
    ) {
      testSpecificObservations.push("Range of motion within normal limits");
    } else if (
      testName.toLowerCase().includes("fingering") ||
      testName.toLowerCase().includes("handling")
    ) {
      testSpecificObservations.push(
        "Fine motor control demonstrated",
        "MTM analysis completed",
      );
    } else if (
      testName.toLowerCase().includes("reach") ||
      testName.toLowerCase().includes("balance")
    ) {
      testSpecificObservations.push(
        "Postural stability maintained",
        "Movement patterns appropriate",
      );
    } else if (
      testName.toLowerCase().includes("climb") ||
      testName.toLowerCase().includes("walk") ||
      testName.toLowerCase().includes("crawl")
    ) {
      testSpecificObservations.push(
        "Locomotion patterns normal",
        "Safety protocols followed",
      );
    }

    // Adjust measurements based on effort level
    const effortMultiplier =
      effort === "Maximal"
        ? 1.2
        : effort === "Very hard"
          ? 1.1
          : effort === "Hard (heavy)"
            ? 1.0
            : effort === "Somewhat hard"
              ? 0.9
              : 0.8;

    return {
      testId,
      testName,
      leftMeasurements: {
        trial1: Math.round(randomValue(15, 25) * effortMultiplier),
        trial2: Math.round(randomValue(18, 28) * effortMultiplier),
        trial3: Math.round(randomValue(16, 26) * effortMultiplier),
        trial4: Math.round(randomValue(20, 30) * effortMultiplier),
        trial5: Math.round(randomValue(17, 27) * effortMultiplier),
        trial6: Math.round(randomValue(19, 29) * effortMultiplier),
        preHeartRate: randomValue(71, 74),
        postHeartRate: randomValue(75, 76),
      },
      rightMeasurements: {
        trial1: Math.round(randomValue(20, 30) * effortMultiplier),
        trial2: Math.round(randomValue(22, 32) * effortMultiplier),
        trial3: Math.round(randomValue(21, 31) * effortMultiplier),
        trial4: Math.round(randomValue(25, 35) * effortMultiplier),
        trial5: Math.round(randomValue(23, 33) * effortMultiplier),
        trial6: Math.round(randomValue(24, 34) * effortMultiplier),
        preHeartRate: randomValue(71, 74),
        postHeartRate: randomValue(75, 76),
      },
      comments: demonstrated
        ? `${testName} performed with ${effort.toLowerCase()} effort. Client demonstrated good understanding of test requirements and maintained consistent performance throughout all trials. ${testSpecificObservations.length > 3 ? "Multiple clinical observations documented." : ""}`
        : `${testName} could not be fully demonstrated due to pain/discomfort. Client attempted but unable to complete all trials at maximum effort. Limited by symptoms.`,
      demonstrated,
      perceived,
      effort,
      observations: testSpecificObservations,
      jobRequirements,
      jobMatch,
      jobDemands,
      jobDescription,
      normLevel: "yes",
      valueToBeTestedNumber: "",
      valueToBeTestedUnit: "Weight",
      unitMeasure: "lbs",
    };
  };

  const fillSampleTestData = async () => {
    // Get selected tests from protocol
    const protocolData = localStorage.getItem("protocolTestsData");
    if (!protocolData) return;

    const { selectedTests } = JSON.parse(protocolData);
    const testNames: Record<string, string> = {
      "key-pinch": "Key Pinch",
      "tip-pinch": "Tip Pinch",
      "palmar-pinch": "Palmar Pinch",
      "grip-strength": "Grip Strength",
      "cervical-flexion": "Cervical Flexion",
      "cervical-extension": "Cervical Extension",
      "lumbar-flexion": "Lumbar Flexion",
      "lumbar-extension": "Lumbar Extension",
      "shoulder-flexion": "Shoulder Flexion",
      "shoulder-abduction": "Shoulder Abduction",
      "hip-flexion": "Hip Flexion",
      "wrist-muscle-flexion": "Wrist Muscle-Palmar Flexion",
      "wrist-muscle-extension": "Wrist Muscle-Dorsiflexion",
      "shoulder-muscle-internal-rotation": "Shoulder Muscle Internal Rotation",
      "dynamic-lift-low": "Dynamic Frequent Lift Low",
      "dynamic-lift-mid": "Dynamic Frequent Lift Mid",
      "dynamic-lift-high": "Dynamic Frequent Lift High",
      "dynamic-lift-overhead": "Dynamic Frequent Lift Overhead",
      "dynamic-lift-frequent": "Dynamic Frequent Lifts",
      "dynamic-infrequent-lift-low": "Dynamic Infrequent Lift Low",
      "dynamic-infrequent-lift-mid": "Dynamic Infrequent Lift Mid",
      "dynamic-infrequent-lift-high": "Dynamic Infrequent Lift High",
      "dynamic-infrequent-lift-overhead": "Dynamic Infrequent Lift Overhead",

      // Cardio Test Names
      "bruce-treadmill-test": "Bruce Treadmill Test",
      "mcaft-step-test": "mCAFT Step Test",
      "kasch-step-test": "KASCH Step Test",
      "ymca-step-test": "YMCA 3-Minute Step Test",
      "ymca-submaximal-treadmill-test": "YMCA Submaximal Treadmill Test",

      // ROM - Extremities (Left Side)
      "elbow-rom-flexion-extension-left": "Left Side - Elbow Flexion/Extension",
      "elbow-rom-supination-pronation-left": "Left Side - Elbow Supination/Pronation",
      "wrist-rom-flexion-extension-left": "Left Side - Wrist Flexion/Extension",
      "wrist-rom-radial-ulnar-deviation-left": "Left Side - Wrist Radial/Ulnar Deviation",
      "knee-rom-flexion-extension-left": "Left Side - Knee Flexion/Extension",
      "shoulder-rom-flexion-extension-left": "Left Side - Shoulder Flexion/Extension",
      "shoulder-rom-internal-external-rotation-left": "Left Side - Shoulder Internal/External Rotation",
      "shoulder-rom-abduction-adduction-left": "Left Side - Shoulder Abduction/Adduction",
      "hip-rom-flexion-extension-left": "Left Side - Hip Flexion/Extension",
      "hip-rom-internal-external-rotation-left": "Left Side - Hip Internal/External Rotation",
      "hip-rom-abduction-adduction-left": "Left Side - Hip Abduction/Adduction",
      "ankle-rom-dorsi-plantar-flexion-left": "Left Side - Ankle Dorsi/Plantar Flexion",
      "ankle-rom-inversion-eversion-left": "Left Side - Ankle Inversion/Eversion",

      // ROM - Extremities (Right Side)
      "elbow-rom-flexion-extension-right": "Right Side - Elbow Flexion/Extension",
      "elbow-rom-supination-pronation-right": "Right Side - Elbow Supination/Pronation",
      "wrist-rom-flexion-extension-right": "Right Side - Wrist Flexion/Extension",
      "wrist-rom-radial-ulnar-deviation-right": "Right Side - Wrist Radial/Ulnar Deviation",
      "knee-rom-flexion-extension-right": "Right Side - Knee Flexion/Extension",
      "shoulder-rom-flexion-extension-right": "Right Side - Shoulder Flexion/Extension",
      "shoulder-rom-internal-external-rotation-right": "Right Side - Shoulder Internal/External Rotation",
      "shoulder-rom-abduction-adduction-right": "Right Side - Shoulder Abduction/Adduction",
      "hip-rom-flexion-extension-right": "Right Side - Hip Flexion/Extension",
      "hip-rom-internal-external-rotation-right": "Right Side - Hip Internal/External Rotation",
      "hip-rom-abduction-adduction-right": "Right Side - Hip Abduction/Adduction",
      "ankle-rom-dorsi-plantar-flexion-right": "Right Side - Ankle Dorsi/Plantar Flexion",
      "ankle-rom-inversion-eversion-right": "Right Side - Ankle Inversion/Eversion",

      // ROM - Hand/Foot (Left Side)
      "thumb-ip-flexion-extension-left": "Left Side - Thumb IP Flexion/Extension",
      "thumb-mp-flexion-extension-left": "Left Side - Thumb MP Flexion/Extension",
      "thumb-abduction-left": "Left Side - Thumb Abduction",
      "index-dip-flexion-extension-left": "Left Side - Index Finger DIP Flexion/Extension",
      "index-pip-flexion-extension-left": "Left Side - Index Finger PIP Flexion/Extension",
      "index-mp-flexion-extension-left": "Left Side - Index Finger MP Flexion/Extension",
      "middle-dip-flexion-extension-left": "Left Side - Middle Finger DIP Flexion/Extension",
      "middle-pip-flexion-extension-left": "Left Side - Middle Finger PIP Flexion/Extension",
      "middle-mp-flexion-extension-left": "Left Side - Middle Finger MP Flexion/Extension",
      "ring-dip-flexion-extension-left": "Left Side - Ring Finger DIP Flexion/Extension",
      "ring-pip-flexion-extension-left": "Left Side - Ring Finger PIP Flexion/Extension",
      "ring-mp-flexion-extension-left": "Left Side - Ring Finger MP Flexion/Extension",
      "little-dip-flexion-extension-left": "Left Side - Little Finger DIP Flexion/Extension",
      "little-pip-flexion-extension-left": "Left Side - Little Finger PIP Flexion/Extension",
      "little-mp-flexion-extension-left": "Left Side - Little Finger MP Flexion/Extension",
      "great-toe-ip-flexion-left": "Left Side - Great Toe IP Flexion",
      "great-toe-mp-dorsi-plantar-flexion-left": "Left Side - Great Toe MP Dorsi/Plantar Flexion",
      "2nd-toe-mp-dorsi-plantar-flexion-left": "Left Side - 2nd Toe MP Dorsi/Plantar Flexion",
      "3rd-toe-mp-dorsi-plantar-flexion-left": "Left Side - 3rd Toe MP Dorsi/Plantar Flexion",
      "4th-toe-mp-dorsi-plantar-flexion-left": "Left Side - 4th Toe MP Dorsi/Plantar Flexion",
      "5th-toe-mp-dorsi-plantar-flexion-left": "Left Side - 5th Toe MP Dorsi/Plantar Flexion",

      // ROM - Hand/Foot (Right Side)
      "thumb-ip-flexion-extension-right": "Right Side - Thumb IP Flexion/Extension",
      "thumb-mp-flexion-extension-right": "Right Side - Thumb MP Flexion/Extension",
      "thumb-abduction-right": "Right Side - Thumb Abduction",
      "index-dip-flexion-extension-right": "Right Side - Index Finger DIP Flexion/Extension",
      "index-pip-flexion-extension-right": "Right Side - Index Finger PIP Flexion/Extension",
      "index-mp-flexion-extension-right": "Right Side - Index Finger MP Flexion/Extension",
      "middle-dip-flexion-extension-right": "Right Side - Middle Finger DIP Flexion/Extension",
      "middle-pip-flexion-extension-right": "Right Side - Middle Finger PIP Flexion/Extension",
      "middle-mp-flexion-extension-right": "Right Side - Middle Finger MP Flexion/Extension",
      "ring-dip-flexion-extension-right": "Right Side - Ring Finger DIP Flexion/Extension",
      "ring-pip-flexion-extension-right": "Right Side - Ring Finger PIP Flexion/Extension",
      "ring-mp-flexion-extension-right": "Right Side - Ring Finger MP Flexion/Extension",
      "little-dip-flexion-extension-right": "Right Side - Little Finger DIP Flexion/Extension",
      "little-pip-flexion-extension-right": "Right Side - Little Finger PIP Flexion/Extension",
      "little-mp-flexion-extension-right": "Right Side - Little Finger MP Flexion/Extension",
      "great-toe-ip-flexion-right": "Right Side - Great Toe IP Flexion",
      "great-toe-mp-dorsi-plantar-flexion-right": "Right Side - Great Toe MP Dorsi/Plantar Flexion",
      "2nd-toe-mp-dorsi-plantar-flexion-right": "Right Side - 2nd Toe MP Dorsi/Plantar Flexion",
      "3rd-toe-mp-dorsi-plantar-flexion-right": "Right Side - 3rd Toe MP Dorsi/Plantar Flexion",
      "4th-toe-mp-dorsi-plantar-flexion-right": "Right Side - 4th Toe MP Dorsi/Plantar Flexion",
      "5th-toe-mp-dorsi-plantar-flexion-right": "Right Side - 5th Toe MP Dorsi/Plantar Flexion",

      // MTM Test Names
      fingering: "Fingering",
      "bi-manual-fingering": "Bi-manual Fingering",
      handling: "Handling",
      "bi-manual-handling": "Bi-manual Handling",
      "reach-immediate": "Reach Immediate",
      "reach-overhead": "Reach Overhead",
      "reach-with-weight": "Reach With Weight",
      balance: "Balance",
      stoop: "Stoop",
      walk: "Walk",
      "push-pull-cart": "Push/Pull Cart",
      crouch: "Crouch",
      carry: "Carry",
      crawl: "Crawl",
      "climb-stairs": "Climb Stairs",
      kneel: "Kneel",
      "climb-ladder": "Climb Ladder",
    };

    // Ensure all cardio tests have proper names
    const cardioTestNames: Record<string, string> = {
      "bruce-treadmill-test": "Bruce Treadmill Test",
      "mcaft-step-test": "mCAFT Step Test",
      "kasch-step-test": "KASCH Step Test",
      "ymca-step-test": "YMCA 3-Minute Step Test",
      "ymca-submaximal-treadmill-test": "YMCA Submaximal Treadmill Test",
    };

    const sampleTests = selectedTests.map((testId: string) =>
      generateSampleTestData(
        testId,
        cardioTestNames[testId] ||
          testNames[testId] ||
          testId
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
      ),
    );

    // Add explicit sample grip tests to ensure rapid-exchange crosscheck is applicable
    // Standard grip (Position 2) and Rapid Exchange Grip with non-zero trial values
    const standardGrip = {
      testId: "grip-standard-p2",
      testName: "Hand Grip Position 2 (Std)",
      leftMeasurements: {
        trial1: 40,
        trial2: 41,
        trial3: 39,
        trial4: 42,
        trial5: 40,
        trial6: 41,
      },
      rightMeasurements: {
        trial1: 42,
        trial2: 43,
        trial3: 41,
        trial4: 44,
        trial5: 42,
        trial6: 43,
      },
      comments: "Sample standard grip (position 2)",
      demonstrated: true,
      perceived: "",
      effort: "Maximal",
      observations: [],
      jobRequirements: "",
      jobMatch: "yes",
      jobDemands: "",
      jobDescription: "",
      normLevel: "yes",
      valueToBeTestedNumber: "",
      valueToBeTestedUnit: "",
      unitMeasure: "",
    };

    const rapidGrip = {
      testId: "grip-rapid-exchange",
      testName: "Rapid Exchange Grip",
      leftMeasurements: {
        trial1: 33,
        trial2: 34,
        trial3: 32,
        trial4: 33,
        trial5: 34,
        trial6: 33,
      },
      rightMeasurements: {
        trial1: 35,
        trial2: 36,
        trial3: 34,
        trial4: 35,
        trial5: 36,
        trial6: 35,
      },
      comments: "Sample rapid exchange grip",
      demonstrated: true,
      perceived: "",
      effort: "Maximal",
      observations: [],
      jobRequirements: "",
      jobMatch: "yes",
      jobDemands: "",
      jobDescription: "",
      normLevel: "yes",
      valueToBeTestedNumber: "",
      valueToBeTestedUnit: "",
      unitMeasure: "",
    };

    // If not already present AND if user selected any grip-related tests, push sample grips so the crosscheck logic is applicable
    const hasStd = sampleTests.some(
      (t) =>
        (t.testName || "").toLowerCase().includes("position 2") ||
        (t.testId || "").toLowerCase().includes("p2") ||
        (t.testName || "").toLowerCase().includes("std") ||
        (t.testName || "").toLowerCase().includes("standard"),
    );
    const hasRapid = sampleTests.some(
      (t) =>
        (t.testName || "").toLowerCase().includes("rapid") ||
        (t.testName || "").toLowerCase().includes("exchange"),
    );

    const selectedHasGrip = selectedTests.some((id: string) => {
      const name = (testNames[id] || id).toLowerCase();
      return (
        name.includes("grip") || name.includes("pinch") || name.includes("hand")
      );
    });

    if (false) {
      if (!hasStd) sampleTests.push(standardGrip as any);
      if (!hasRapid) sampleTests.push(rapidGrip as any);
    }

    // Generate sample MTM test data for occupational tests
    // Static baseline times for standard/good performance by test type
    const baselineTimesByTest: Record<string, number> = {
      "reach-flat": 8,
      "reach-overhead": 8.5,
      "reach-with-weight": 9,
      "grasp-palm-grip": 6,
      "grasp-3-jaw": 6.5,
      "grasp-pinch": 7,
      carry: 10,
      fingering: 8,
      "move-object": 9,
      position: 7,
      "turn-object": 7.5,
      "climb-stairs": 8,
      "climb-ladder": 8.5,
      balance: 8,
      "lift-occasional": 9,
      "lift-frequent": 8.5,
      "push-pull": 9,
      "hip-flexion": 8,
      "knee-extension": 8,
      "ankle-dorsiflexion": 7.5,
      "shoulder-flexion": 8.5,
    };

    const sampleMtmData: Record<string, any> = {};
    selectedTests.forEach((testId: string) => {
      if (occupationalTestIds.includes(testId) || mtmTestConfigs[testId]) {
        const config = mtmTestConfigs[testId];
        if (config) {
          const trials = [];
          const numberOfTrials = config.numberOfTrials || 3;
          // Get baseline time for this test, or use 8 seconds as default
          const baselineTime = baselineTimesByTest[testId] || 8;

          // Create 3 different static times around the baseline for good performance variation
          const trialTimes = [
            baselineTime - 0.3, // Trial 1: slightly faster
            baselineTime, // Trial 2: baseline
            baselineTime + 0.3, // Trial 3: slightly slower
          ];

          for (let i = 1; i <= numberOfTrials; i++) {
            const timeSec = trialTimes[i - 1] || baselineTime;
            const percentIS = calculatePercentISByTest(testId, timeSec, {
              position: config.position,
              weight: config.weight,
              steps: testId === "climb-stairs" ? config.distance : undefined,
              rungs: testId === "climb-ladder" ? config.distance : undefined,
            });
            trials.push({
              trial: i,
              side: config.bodySide || "Both",
              plane: config.plane || "",
              position: config.position || "Standing",
              reps: config.numberOfReps || 6,
              time: { value: timeSec, unit: "sec" },
              percentIS,
            });
          }

          sampleMtmData[testId] = {
            testName: testNames[testId] || testId,
            testType: testId,
            trials,
            hrPre: Math.floor(Math.random() * 4 + 71), // 71-74 bpm
            hrPost: Math.floor(Math.random() * 2 + 75), // 75-76 bpm
            completedAt: new Date().toISOString(),
          };
        }
      }
    });

    setTestDataState({
      tests: sampleTests,
      currentTestIndex: 0,
    });

    // Update MTM test data state
    setMtmTestData(sampleMtmData);

    // Generate sample cardio test data
    const sampleCardioData: Record<string, CardioTestData> = {};
    selectedTests.forEach((testId: string) => {
      const testName = testNames[testId]?.toLowerCase() || testId.toLowerCase();
      if (
        testName.includes("step") ||
        testName.includes("treadmill") ||
        testName.includes("cardio") ||
        testName.includes("mcaft") ||
        testName.includes("kasch") ||
        testName.includes("bruce") ||
        testName.includes("ymca")
      ) {
        if (
          testId.includes("bruce") ||
          (testName.includes("bruce") && !testName.includes("ymca"))
        ) {
          sampleCardioData[testId] = {
            classification: "Good",
            vo2MaxScore: `${Math.floor(Math.random() * 15 + 35)} ml/kg/min`,
            clientImages: [],
            serializedImages: [],
          };
        } else if (testId.includes("mcaft") || testName.includes("mcaft")) {
          sampleCardioData[testId] = {
            predictedVO2Max: `${Math.floor(Math.random() * 12 + 28)} ml/kg/min`,
            hbr: `${Math.floor(Math.random() * 30 + 110)} bpm`,
            clientImages: [],
            serializedImages: [],
          };
        } else if (testId.includes("ymca") && testId.includes("step")) {
          sampleCardioData[testId] = {
            clientRating: "Good",
            clientImages: [],
            serializedImages: [],
          };
        } else if (testId.includes("ymca") && testId.includes("treadmill")) {
          sampleCardioData[testId] = {
            vo2Max: `${Math.floor(Math.random() * 15 + 35)} ml/kg/min`,
            heartRate: `${Math.floor(Math.random() * 30 + 110)} bpm`,
            bloodPressure: `${Math.floor(Math.random() * 20 + 110)}/${Math.floor(Math.random() * 20 + 70)}`,
            rpe: `${Math.floor(Math.random() * 6 + 12)}`,
            clientImages: [],
            serializedImages: [],
          };
        } else if (testName.includes("ymca") && testName.includes("step")) {
          sampleCardioData[testId] = {
            clientRating: "Good",
            clientImages: [],
            serializedImages: [],
          };
        } else if (
          testName.includes("ymca") &&
          testName.includes("treadmill")
        ) {
          sampleCardioData[testId] = {
            vo2Max: `${Math.floor(Math.random() * 15 + 35)} ml/kg/min`,
            heartRate: `${Math.floor(Math.random() * 30 + 110)} bpm`,
            bloodPressure: `${Math.floor(Math.random() * 20 + 110)}/${Math.floor(Math.random() * 20 + 70)}`,
            rpe: `${Math.floor(Math.random() * 6 + 12)}`,
            clientImages: [],
            serializedImages: [],
          };
        } else if (
          testId.includes("kasch") ||
          testName.includes("kasch") ||
          (testName.includes("step") && !testName.includes("ymca"))
        ) {
          sampleCardioData[testId] = {
            classification: "Average",
            aerobicFitnessScore: `${Math.floor(Math.random() * 25 + 75)}`,
            clientImages: [],
            serializedImages: [],
          };
        }
      }
    });

    // Update cardio test data state
    setCardioTestData(sampleCardioData);

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Store sample data in localStorage
    localStorage.setItem(
      "testData",
      JSON.stringify({
        tests: sampleTests,
        currentTestIndex: 0,
      }),
    );

    // Store MTM test data in localStorage
    localStorage.setItem("mtmTestData", JSON.stringify(sampleMtmData));

    // Store cardio test data in localStorage
    localStorage.setItem("cardioTestData", JSON.stringify(sampleCardioData));

    // Update completed steps
    const completedSteps = JSON.parse(
      localStorage.getItem("completedSteps") || "[]",
    );
    if (!completedSteps.includes(6)) {
      completedSteps.push(6);
      localStorage.setItem("completedSteps", JSON.stringify(completedSteps));
    }

    setIsSubmitting(false);
    setShowSuccessDialog(true);
  };

  useEffect(() => {
    // Load MTM test data from localStorage
    const savedMtmData = localStorage.getItem("mtmTestData");
    if (savedMtmData) {
      setMtmTestData(JSON.parse(savedMtmData));
    }

    // Load cardio test data from localStorage
    const savedCardioData = localStorage.getItem("cardioTestData");
    if (savedCardioData) {
      setCardioTestData(JSON.parse(savedCardioData));
    }

    // Load selected tests from previous step
    const protocolData = localStorage.getItem("protocolTestsData");
    if (protocolData) {
      const { selectedTests } = JSON.parse(protocolData);

      // Get test names (this would ideally come from a proper test mapping)
      const testNames: Record<string, string> = {
        "key-pinch": "Key Pinch",
        "tip-pinch": "Tip Pinch",
        "palmar-pinch": "Palmar Pinch",
        "grip-strength": "Grip Strength",
        "cervical-flexion": "Cervical Flexion",
        "hip-abduction": "Hip Abduction",
        "shoulder-flexion": "Shoulder Flexion",
        "wrist-muscle-flexion": "Wrist Muscle-Palmar Flexion",
        "wrist-muscle-extension": "Wrist Muscle-Dorsiflexion",
        "shoulder-muscle-internal-rotation":
          "Shoulder Muscle Internal Rotation",
        "dynamic-lift-low": "Dynamic Frequent Lift Low",
        "dynamic-lift-mid": "Dynamic Frequent Lift Mid",
        "dynamic-lift-high": "Dynamic Frequent Lift High",
        "dynamic-lift-overhead": "Dynamic Frequent Lift Overhead",
        "dynamic-lift-frequent": "Dynamic Frequent Lifts",
        "dynamic-infrequent-lift-low": "Dynamic Infrequent Lift Low",
        "dynamic-infrequent-lift-mid": "Dynamic Infrequent Lift Mid",
        "dynamic-infrequent-lift-high": "Dynamic Infrequent Lift High",
        "dynamic-infrequent-lift-overhead": "Dynamic Infrequent Lift Overhead",
        "ymca-step-test": "YMCA 3-Minute Step Test",
        "ymca-submaximal-treadmill-test": "YMCA Submaximal Treadmill Test",
        "bruce-treadmill": "Bruce Treadmill Test",
        mcaft: "mCAFT Test",
        kasch: "Kasch Pulse Recovery Test",

        // ROM - Extremities (Left Side)
        "elbow-rom-flexion-extension-left":
          "Left Side - Elbow Flexion/Extension",
        "elbow-rom-supination-pronation-left":
          "Left Side - Elbow Supination/Pronation",
        "wrist-rom-flexion-extension-left":
          "Left Side - Wrist Flexion/Extension",
        "wrist-rom-radial-ulnar-deviation-left":
          "Left Side - Wrist Radial/Ulnar Deviation",
        "knee-rom-flexion-extension-left": "Left Side - Knee Flexion/Extension",
        "shoulder-rom-flexion-extension-left":
          "Left Side - Shoulder Flexion/Extension",
        "shoulder-rom-internal-external-rotation-left":
          "Left Side - Shoulder Internal/External Rotation",
        "shoulder-rom-abduction-adduction-left":
          "Left Side - Shoulder Abduction/Adduction",
        "hip-rom-flexion-extension-left": "Left Side - Hip Flexion/Extension",
        "hip-rom-internal-external-rotation-left":
          "Left Side - Hip Internal/External Rotation",
        "hip-rom-abduction-adduction-left":
          "Left Side - Hip Abduction/Adduction",
        "ankle-rom-dorsi-plantar-flexion-left":
          "Left Side - Ankle Dorsi/Plantar Flexion",
        "ankle-rom-inversion-eversion-left":
          "Left Side - Ankle Inversion/Eversion",

        // ROM - Extremities (Right Side)
        "elbow-rom-flexion-extension-right":
          "Right Side - Elbow Flexion/Extension",
        "elbow-rom-supination-pronation-right":
          "Right Side - Elbow Supination/Pronation",
        "wrist-rom-flexion-extension-right":
          "Right Side - Wrist Flexion/Extension",
        "wrist-rom-radial-ulnar-deviation-right":
          "Right Side - Wrist Radial/Ulnar Deviation",
        "knee-rom-flexion-extension-right":
          "Right Side - Knee Flexion/Extension",
        "shoulder-rom-flexion-extension-right":
          "Right Side - Shoulder Flexion/Extension",
        "shoulder-rom-internal-external-rotation-right":
          "Right Side - Shoulder Internal/External Rotation",
        "shoulder-rom-abduction-adduction-right":
          "Right Side - Shoulder Abduction/Adduction",
        "hip-rom-flexion-extension-right": "Right Side - Hip Flexion/Extension",
        "hip-rom-internal-external-rotation-right":
          "Right Side - Hip Internal/External Rotation",
        "hip-rom-abduction-adduction-right":
          "Right Side - Hip Abduction/Adduction",
        "ankle-rom-dorsi-plantar-flexion-right":
          "Right Side - Ankle Dorsi/Plantar Flexion",
        "ankle-rom-inversion-eversion-right":
          "Right Side - Ankle Inversion/Eversion",

        // ROM - Hand/Foot (Left Side)
        "thumb-ip-flexion-extension-left":
          "Left Side - Thumb IP Flexion/Extension",
        "thumb-mp-flexion-extension-left":
          "Left Side - Thumb MP Flexion/Extension",
        "thumb-abduction-left": "Left Side - Thumb Abduction",
        "index-dip-flexion-extension-left":
          "Left Side - Index Finger DIP Flexion/Extension",
        "index-pip-flexion-extension-left":
          "Left Side - Index Finger PIP Flexion/Extension",
        "index-mp-flexion-extension-left":
          "Left Side - Index Finger MP Flexion/Extension",
        "middle-dip-flexion-extension-left":
          "Left Side - Middle Finger DIP Flexion/Extension",
        "middle-pip-flexion-extension-left":
          "Left Side - Middle Finger PIP Flexion/Extension",
        "middle-mp-flexion-extension-left":
          "Left Side - Middle Finger MP Flexion/Extension",
        "ring-dip-flexion-extension-left":
          "Left Side - Ring Finger DIP Flexion/Extension",
        "ring-pip-flexion-extension-left":
          "Left Side - Ring Finger PIP Flexion/Extension",
        "ring-mp-flexion-extension-left":
          "Left Side - Ring Finger MP Flexion/Extension",
        "little-dip-flexion-extension-left":
          "Left Side - Little Finger DIP Flexion/Extension",
        "little-pip-flexion-extension-left":
          "Left Side - Little Finger PIP Flexion/Extension",
        "little-mp-flexion-extension-left":
          "Left Side - Little Finger MP Flexion/Extension",
        "great-toe-ip-flexion-left": "Left Side - Great Toe IP Flexion",
        "great-toe-mp-dorsi-plantar-flexion-left":
          "Left Side - Great Toe MP Dorsi/Plantar Flexion",
        "2nd-toe-mp-dorsi-plantar-flexion-left":
          "Left Side - 2nd Toe MP Dorsi/Plantar Flexion",
        "3rd-toe-mp-dorsi-plantar-flexion-left":
          "Left Side - 3rd Toe MP Dorsi/Plantar Flexion",
        "4th-toe-mp-dorsi-plantar-flexion-left":
          "Left Side - 4th Toe MP Dorsi/Plantar Flexion",
        "5th-toe-mp-dorsi-plantar-flexion-left":
          "Left Side - 5th Toe MP Dorsi/Plantar Flexion",

        // ROM - Hand/Foot (Right Side)
        "thumb-ip-flexion-extension-right":
          "Right Side - Thumb IP Flexion/Extension",
        "thumb-mp-flexion-extension-right":
          "Right Side - Thumb MP Flexion/Extension",
        "thumb-abduction-right": "Right Side - Thumb Abduction",
        "index-dip-flexion-extension-right":
          "Right Side - Index Finger DIP Flexion/Extension",
        "index-pip-flexion-extension-right":
          "Right Side - Index Finger PIP Flexion/Extension",
        "index-mp-flexion-extension-right":
          "Right Side - Index Finger MP Flexion/Extension",
        "middle-dip-flexion-extension-right":
          "Right Side - Middle Finger DIP Flexion/Extension",
        "middle-pip-flexion-extension-right":
          "Right Side - Middle Finger PIP Flexion/Extension",
        "middle-mp-flexion-extension-right":
          "Right Side - Middle Finger MP Flexion/Extension",
        "ring-dip-flexion-extension-right":
          "Right Side - Ring Finger DIP Flexion/Extension",
        "ring-pip-flexion-extension-right":
          "Right Side - Ring Finger PIP Flexion/Extension",
        "ring-mp-flexion-extension-right":
          "Right Side - Ring Finger MP Flexion/Extension",
        "little-dip-flexion-extension-right":
          "Right Side - Little Finger DIP Flexion/Extension",
        "little-pip-flexion-extension-right":
          "Right Side - Little Finger PIP Flexion/Extension",
        "little-mp-flexion-extension-right":
          "Right Side - Little Finger MP Flexion/Extension",
        "great-toe-ip-flexion-right": "Right Side - Great Toe IP Flexion",
        "great-toe-mp-dorsi-plantar-flexion-right":
          "Right Side - Great Toe MP Dorsi/Plantar Flexion",
        "2nd-toe-mp-dorsi-plantar-flexion-right":
          "Right Side - 2nd Toe MP Dorsi/Plantar Flexion",
        "3rd-toe-mp-dorsi-plantar-flexion-right":
          "Right Side - 3rd Toe MP Dorsi/Plantar Flexion",
        "4th-toe-mp-dorsi-plantar-flexion-right":
          "Right Side - 4th Toe MP Dorsi/Plantar Flexion",
        "5th-toe-mp-dorsi-plantar-flexion-right":
          "Right Side - 5th Toe MP Dorsi/Plantar Flexion",
      };

      const createTestStub = (testId: string): TestData => ({
        testId,
        testName:
          testNames[testId] ||
          testId
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        leftMeasurements: {
          trial1: 0,
          trial2: 0,
          trial3: 0,
          trial4: 0,
          trial5: 0,
          trial6: 0,
          preHeartRate: 0,
          postHeartRate: 0,
        },
        rightMeasurements: {
          trial1: 0,
          trial2: 0,
          trial3: 0,
          trial4: 0,
          trial5: 0,
          trial6: 0,
          preHeartRate: 0,
          postHeartRate: 0,
        },
        comments: "",
        demonstrated: false,
        perceived: "",
        effort: "",
        observations: [],
        jobRequirements: "",
        jobMatch: "yes",
        jobDemands: "",
        jobDescription: "",
        normLevel: "yes",
        valueToBeTestedNumber: "",
        valueToBeTestedUnit: "",
        unitMeasure: "",
      });

      // Check if we have existing test data (edit mode)
      const existingData = localStorage.getItem("testData");
      if (existingData) {
        const savedData = JSON.parse(existingData);

        // Sync with updated protocol selection
        // Keep existing test data for tests still in the protocol
        const updatedTests: TestData[] = selectedTests.map((testId: string) => {
          const existingTest = savedData.tests.find(
            (t: TestData) => t.testId === testId,
          );
          if (existingTest) {
            // Update test name if a new mapping exists
            return {
              ...existingTest,
              testName: testNames[testId] || existingTest.testName,
            };
          }
          return createTestStub(testId);
        });

        // Ensure currentTestIndex is still valid after updating tests
        const validCurrentIndex = Math.min(
          savedData.currentTestIndex || 0,
          updatedTests.length - 1,
        );

        setTestDataState({
          ...savedData,
          tests: updatedTests,
          currentTestIndex: validCurrentIndex,
        });
        setIsEditMode(true);
      } else {
        const initialTests: TestData[] = selectedTests.map((testId: string) =>
          createTestStub(testId),
        );
        setTestDataState({
          tests: initialTests,
          currentTestIndex: 0,
        });
      }
    }
  }, []);

  const currentTest = testDataState.tests[testDataState.currentTestIndex];

  // Check if current test is occupational/MTM test
  const isOccupationalTest =
    currentTest &&
    // Direct ID match
    (occupationalTestIds.includes(currentTest.testId) ||
      // Check if it's in MTM test configs
      mtmTestConfigs[currentTest.testId] ||
      // Check by test name patterns
      currentTest.testName
        ?.toLowerCase()
        .match(
          /(fingering|handling|reach|balance|stoop|walk|push|pull|cart|crouch|carry|crawl|climb|kneel)/i,
        ));

  const isMTMTest = currentTest && mtmTestConfigs[currentTest.testId];

  // Determine test type for dynamic form fields
  const testName = currentTest?.testName?.toLowerCase() || "";
  const isRangeOfMotionTest =
    testName.includes("flexion") ||
    testName.includes("extension") ||
    testName.includes("rotation") ||
    testName.includes("abduction") ||
    testName.includes("adduction") ||
    testName.includes("supination") ||
    testName.includes("pronation") ||
    testName.includes("range") ||
    testName.includes("motion");
  const isGripTest = testName.includes("grip") || testName.includes("pinch");
  const isForceTest =
    testName.includes("force") || testName.includes("strength") || isGripTest;
  const isCardioTest =
    testName.includes("step") ||
    testName.includes("treadmill") ||
    testName.includes("cardio");
  const isBalanceTest =
    testName.includes("balance") || testName.includes("coordination");
  const isLiftTest = testName.includes("lift") || testName.includes("carry");
  const liftUnit = normalizeWeightUnit(currentTest?.unitMeasure);

  // Determine ROM paired labels (e.g., Flexion/Extension) if applicable
  const getRomPairLabels = (): [string, string] | null => {
    const id = (currentTest?.testId || "").toLowerCase();
    const nameLower = (currentTest?.testName || "").toLowerCase();
    const hay = `${id} ${nameLower}`;
    if (
      hay.includes("flexion-extension") ||
      hay.includes("flexion/extension")
    ) {
      return ["Flexion", "Extension"];
    }
    if (
      hay.includes("supination-pronation") ||
      hay.includes("supination/pronation")
    ) {
      return ["Supination", "Pronation"];
    }
    if (
      hay.includes("internal-external-rotation") ||
      hay.includes("internal/external rotation") ||
      hay.includes("internal/external-rotation") ||
      hay.includes("internal external rotation")
    ) {
      return ["Internal Rotation", "External Rotation"];
    }
    if (
      hay.includes("abduction-adduction") ||
      hay.includes("abduction/adduction")
    ) {
      return ["Abduction", "Adduction"];
    }
    return null;
  };

  const romPair = getRomPairLabels();

  const updateCurrentTest = (updates: Partial<TestData>) => {
    setTestDataState((prev) => ({
      ...prev,
      tests: prev.tests.map((test, index) =>
        index === prev.currentTestIndex ? { ...test, ...updates } : test,
      ),
    }));
  };

  const updateMeasurement = (
    side: "left" | "right",
    field: keyof TestMeasurement,
    value: number,
  ) => {
    const measurementKey =
      side === "left" ? "leftMeasurements" : "rightMeasurements";

    // Prepare updated measurements for the side being edited
    const updatedMeasurements = {
      ...currentTest[measurementKey],
      [field]: value,
    } as TestMeasurement;

    // Update the test data with the new measurement
    updateCurrentTest({
      [measurementKey]: updatedMeasurements,
    });

    // Threshold check: any trial value greater than 250 should trigger an alert
    const threshold = 250;
    const findExceeded = (m: TestMeasurement) =>
      [m.trial1, m.trial2, m.trial3, m.trial4, m.trial5, m.trial6]
        .map((val, idx) => ({ val, idx: idx + 1 }))
        .filter((t) => t.val > threshold);

    const leftMeasurements =
      side === "left" ? updatedMeasurements : currentTest.leftMeasurements;
    const rightMeasurements =
      side === "right" ? updatedMeasurements : currentTest.rightMeasurements;

    const leftExceeded = findExceeded(leftMeasurements);
    const rightExceeded = findExceeded(rightMeasurements);

    if (leftExceeded.length > 0 || rightExceeded.length > 0) {
      const parts: string[] = [];
      if (leftExceeded.length > 0) {
        parts.push(
          `Left trials exceeding ${threshold}: ${leftExceeded
            .map((t) => `Trial ${t.idx} (${t.val})`)
            .join(", ")}`,
        );
      }
      if (rightExceeded.length > 0) {
        parts.push(
          `Right trials exceeding ${threshold}: ${rightExceeded
            .map((t) => `Trial ${t.idx} (${t.val})`)
            .join(", ")}`,
        );
      }
      setAlertMessage(parts.join(" — "));
    } else {
      // Clear alert when nothing exceeds threshold
      setAlertMessage(null);
    }
  };

  const calculateAverage = (
    measurements: TestMeasurement,
    excludeHeartRate = true,
  ): number => {
    const values = [
      measurements.trial1,
      measurements.trial2,
      measurements.trial3,
      measurements.trial4,
      measurements.trial5,
      measurements.trial6,
    ].filter((val) => val > 0);

    if (values.length === 0) return 0;
    return (
      Math.round(
        (values.reduce((sum, val) => sum + val, 0) / values.length) * 100,
      ) / 100
    );
  };

  const calculateCoefficientOfVariation = (
    measurements: TestMeasurement,
  ): number => {
    const values = [
      measurements.trial1,
      measurements.trial2,
      measurements.trial3,
      measurements.trial4,
      measurements.trial5,
      measurements.trial6,
    ].filter((val) => val > 0);

    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const standardDeviation = Math.sqrt(variance);

    return Math.round((standardDeviation / mean) * 100 * 100) / 100;
  };

  const calculateBilateralDeficiency = (
    fromSide: TestMeasurement,
    toSide: TestMeasurement,
  ): number => {
    const fromAverage = calculateAverage(fromSide);
    const toAverage = calculateAverage(toSide);

    if (toAverage === 0) return 0;

    const deficiency = ((toAverage - fromAverage) / toAverage) * 100;
    return Math.max(0, Math.round(deficiency * 100) / 100); // Only show positive deficiencies
  };

  const calculatePercentOfNorm = (
    average: number,
    normValue: number,
  ): number => {
    if (!normValue || normValue <= 0) return 0;
    const pct = (average / normValue) * 100;
    return Math.round(pct * 100) / 100;
  };

  const getNormForSide = (side: "left" | "right"): number => {
    // Prefer standardized norms used by Review/Download reports
    const norm = inferNormsForTest(
      `${currentTest?.testId || ""} ${currentTest?.testName || ""}`,
    );
    const v = side === "left" ? norm.left : norm.right;
    if (typeof v === "number" && v > 0) return v;
    // Fallback to user-entered target if no standardized norm exists
    const base = currentTest?.valueToBeTestedNumber || "";
    const left = currentTest?.valueToBeTestedNumberLeft || base;
    const right = currentTest?.valueToBeTestedNumberRight || base;
    const raw = side === "left" ? left : right;
    const n = parseFloat(raw || "");
    return isNaN(n) ? 0 : n;
  };

  const getUnitSuffix = (): string => {
    const norm = inferNormsForTest(
      `${currentTest?.testId || ""} ${currentTest?.testName || ""}`,
    );
    if (norm.unit) return norm.unit;
    // Prefer the specific unitMeasure when available (e.g., lbs, kg, deg, sec)
    return currentTest?.unitMeasure ? `${currentTest.unitMeasure}` : "";
  };

  const getMaxValue = (measurements: TestMeasurement): number => {
    const values = [
      measurements.trial1,
      measurements.trial2,
      measurements.trial3,
      measurements.trial4,
      measurements.trial5,
      measurements.trial6,
    ];
    return Math.max(...values);
  };

  const BarChart = ({
    measurements,
    side,
  }: {
    measurements: TestMeasurement;
    side: "left" | "right";
  }) => {
    const maxValue = Math.max(
      getMaxValue(currentTest.leftMeasurements),
      getMaxValue(currentTest.rightMeasurements),
    );

    const trials = [
      { key: "trial1", value: measurements.trial1 },
      { key: "trial2", value: measurements.trial2 },
      { key: "trial3", value: measurements.trial3 },
      { key: "trial4", value: measurements.trial4 },
      { key: "trial5", value: measurements.trial5 },
      { key: "trial6", value: measurements.trial6 },
    ];

    return (
      <div className="bg-white p-4 rounded border">
        <div className="relative h-48 flex items-end justify-between">
          {/* Y-axis labels */}
          <div className="absolute left-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-8">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue * 0.75)}</span>
            <span>{Math.round(maxValue * 0.5)}</span>
            <span>{Math.round(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Bars */}
          {trials.map((trial, index) => {
            const height = maxValue > 0 ? (trial.value / maxValue) * 180 : 0;
            const color =
              measurementColors[trial.key as keyof typeof measurementColors];

            return (
              <div key={trial.key} className="flex flex-col items-center">
                <div
                  className="w-8 transition-all duration-300 rounded-t"
                  style={{
                    height: `${height}px`,
                    backgroundColor: color,
                    opacity: trial.value > 0 ? 0.8 : 0.3,
                  }}
                />
                <span className="text-xs mt-1 text-gray-600">{`Trial ${index + 1}`}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    const currentTest = testDataState.tests[testDataState.currentTestIndex];

    // Validate: if normLevel is "no", valueToBeTestedNumber is required
    if (
      currentTest.normLevel === "no" &&
      !currentTest.valueToBeTestedNumber?.trim()
    ) {
      setAlertMessage(
        "Please enter a value for 'VALUE TO BE TESTED' before saving.",
      );
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Persist current data
    localStorage.setItem("testData", JSON.stringify(testDataState));
    localStorage.setItem("mtmTestData", JSON.stringify(mtmTestData));
    localStorage.setItem("cardioTestData", JSON.stringify(cardioTestData));

    // Mark step 6 as completed
    const completedSteps = JSON.parse(
      localStorage.getItem("completedSteps") || "[]",
    );
    if (!completedSteps.includes(6)) {
      completedSteps.push(6);
      localStorage.setItem("completedSteps", JSON.stringify(completedSteps));
    }

    const isLastTest =
      testDataState.currentTestIndex >= testDataState.tests.length - 1;

    if (!isLastTest) {
      const nextIndex = testDataState.currentTestIndex + 1;
      setTestDataState((prev) => ({ ...prev, currentTestIndex: nextIndex }));
      // Keep localStorage in sync so reloading returns to the same spot
      localStorage.setItem(
        "testData",
        JSON.stringify({ ...testDataState, currentTestIndex: nextIndex }),
      );
    }

    setIsSubmitting(false);
    setShowSuccessDialog(isLastTest);
  };

  const nextTest = () => {
    if (testDataState.currentTestIndex < testDataState.tests.length - 1) {
      setTestDataState((prev) => ({
        ...prev,
        currentTestIndex: prev.currentTestIndex + 1,
      }));
    }
  };

  const prevTest = () => {
    if (testDataState.currentTestIndex > 0) {
      setTestDataState((prev) => ({
        ...prev,
        currentTestIndex: prev.currentTestIndex - 1,
      }));
    }
  };

  const handleRunMTMTest = (testId: string) => {
    setActiveMTMTest(testId);
  };

  const handleMTMTestSave = async (testId: string, data: any) => {
    try {
      console.log("=== MTM SAVE DEBUG ===");
      console.log("Test ID:", testId);
      console.log("Data received:", {
        testType: data.testType,
        testName: data.testName,
        trials: data.trials?.length || 0,
        savedImageData: data.savedImageData?.length || 0,
        imageNames: data.savedImageData?.map((img) => img.name) || [],
      });

      const updatedMtmData = {
        ...mtmTestData,
        [testId]: data,
      };

      console.log("Updated MTM data keys:", Object.keys(updatedMtmData));

      // Check if data can be serialized
      const serializedData = JSON.stringify(updatedMtmData);
      const dataSizeKB = (serializedData.length / 1024).toFixed(2);
      console.log(
        "Serialized data size:",
        serializedData.length,
        "characters (",
        dataSizeKB,
        "KB)",
      );

      // Check localStorage quota before saving
      const storageUsed = JSON.stringify(localStorage).length;
      console.log(
        "Current localStorage usage:",
        (storageUsed / 1024).toFixed(2),
        "KB",
      );

      // Save to localStorage
      localStorage.setItem("mtmTestData", serializedData);
      console.log("Successfully saved to localStorage");

      setMtmTestData(updatedMtmData);
      setActiveMTMTest(null);

      console.log("MTM save completed successfully");
    } catch (error) {
      console.error("Error in handleMTMTestSave:", error);

      let errorMessage = "Unknown error occurred";
      if (error.name === "QuotaExceededError") {
        errorMessage =
          "Storage quota exceeded. Try reducing image sizes or removing some images.";
      } else if (error.message?.includes("JSON")) {
        errorMessage =
          "Error processing test data. Some data may be corrupted.";
      } else {
        errorMessage = error.message || "Failed to save test data";
      }

      // Create a more specific error to throw back
      const saveError = new Error(errorMessage);
      saveError.name = error.name;
      throw saveError;
    }
  };

  const handleBackFromMTMTest = () => {
    setActiveMTMTest(null);
  };

  // Show MTM Test Interface if active
  if (activeMTMTest) {
    const testConfig = mtmTestConfigs[activeMTMTest];
    const testNames: Record<string, string> = {
      fingering: "Fingering",
      "bi-manual-fingering": "Bi-manual Fingering",
      handling: "Handling",
      "bi-manual-handling": "Bi-manual Handling",
      "reach-immediate": "Reach Immediate",
      "reach-overhead": "Reach Overhead",
      "reach-with-weight": "Reach With Weight",
      balance: "Balance",
      stoop: "Stoop",
      walk: "Walk",
      "push-pull-cart": "Push/Pull Cart",
      crouch: "Crouch",
      carry: "Carry",
      crawl: "Crawl",
      "climb-stairs": "Climb Stairs",
      kneel: "Kneel",
      "climb-ladder": "Climb Ladder",
    };
    const testName = testNames[activeMTMTest] || "";

    // Use flexible OccupationalTestConfigurator for ALL occupational tasks
    return (
      <OccupationalTestConfigurator
        testType={activeMTMTest}
        onSave={(data) => handleMTMTestSave(activeMTMTest, data)}
        onBack={handleBackFromMTMTest}
      />
    );
  }

  if (!currentTest) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No Tests Selected
          </h2>
          <p className="text-gray-600 mb-4">
            Please complete Step 5 (Protocol Selection) first.
          </p>

          {/* Sample Test Data Button - Only show in demo mode */}
          {isDemoMode && (
            <div className="mb-6">
              <Button
                onClick={fillSampleTestData}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 mr-4 shadow-lg border-2 border-green-500"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Fill Sample Test Data & Continue
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Quick demo with pre-filled test measurements
              </p>
            </div>
          )}

          <Button onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-100 py-4 sm:py-8 px-2 sm:px-4">
      <div className="container mx-auto max-w-7xl">
        {alertMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Value exceeds allowed maximum</AlertTitle>
            <AlertDescription>{alertMessage}</AlertDescription>
          </Alert>
        )}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          {/* Test Navigation Header */}
          <div className="bg-blue-500 text-white p-3 sm:p-4 rounded-lg mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevTest}
                  disabled={testDataState.currentTestIndex === 0}
                  className="bg-white text-blue-500"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-center sm:text-left">
                  {currentTest.testName}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextTest}
                  disabled={
                    testDataState.currentTestIndex ===
                    testDataState.tests.length - 1
                  }
                  className="bg-white text-blue-500"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-sm opacity-90">
                  Test {testDataState.currentTestIndex + 1} of{" "}
                  {testDataState.tests.length}
                </div>

                {/* Sample Test Data Button - Only show in demo mode */}
                {isDemoMode && (
                  <div className="mt-2">
                    <Button
                      onClick={fillSampleTestData}
                      disabled={isSubmitting}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white shadow-lg border-2 border-green-500"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Fill Sample Data
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MTM Test Interface - Inline for occupational tests */}
        {isMTMTest && (
          <div className="mb-6">
            <OccupationalTestConfigurator
              key={`mtm-${currentTest.testId}-${mtmTestData[currentTest.testId]?.trials?.length || 0}`}
              testType={currentTest.testId}
              onSave={(data) => handleMTMTestSave(currentTest.testId, data)}
              onBack={() => {}}
              embeddedMode
            />
          </div>
        )}

        {/* Cardio Test Interface - Show specialized UI for cardio tests */}
        {isCardioTest && !isOccupationalTest && (
          <div className="mb-6">
            <CardioTestRouter
              testId={currentTest.testId}
              testName={currentTest.testName}
              onSave={(data) => {
                setCardioTestData((prev) => ({
                  ...prev,
                  [currentTest.testId]: data,
                }));
                // Also update the general test data for integration
                updateCurrentTest({
                  comments: `Cardio test completed: ${currentTest.testName}. Specialized cardio data collected.`,
                });
              }}
              initialData={cardioTestData[currentTest.testId]}
            />
          </div>
        )}

        {!isOccupationalTest && !isCardioTest && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Left Side Measurements (hidden for Lift tests) */}
            {!isLiftTest && (
              <div className="lg:col-span-1">
                <Card className="shadow-lg">
                  <CardHeader className="bg-blue-400 text-white">
                    <CardTitle>
                      {isRangeOfMotionTest
                        ? romPair?.[0] || "Left"
                        : isBalanceTest
                          ? "Trial 1"
                          : "Left"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <BarChart
                      measurements={currentTest.leftMeasurements}
                      side="left"
                    />
                    <div className="mt-4 space-y-4">
                      <div className="bg-blue-400 text-white p-3 rounded text-center">
                        <div className="text-sm">
                          {isRangeOfMotionTest
                            ? "Average Degrees"
                            : isCardioTest
                              ? "Average Heart Rate"
                              : isBalanceTest
                                ? "Average Time"
                                : "Average Peak Force"}
                        </div>
                        <div className="text-xl font-bold">
                          {calculateAverage(currentTest.leftMeasurements)}
                          {isRangeOfMotionTest
                            ? "°"
                            : isCardioTest
                              ? " bpm"
                              : isBalanceTest
                                ? "s"
                                : ""}
                        </div>
                      </div>
                      <div className="bg-blue-400 text-white p-3 rounded text-center">
                        <div className="text-sm">Coefficient Of Variation</div>
                        <div className="text-xl font-bold">
                          {calculateCoefficientOfVariation(
                            currentTest.leftMeasurements,
                          )}
                          %
                        </div>
                      </div>
                      {(isForceTest || isRangeOfMotionTest) && (
                        <div className="bg-blue-400 text-white p-3 rounded text-center">
                          <div className="text-sm">
                            {isRangeOfMotionTest
                              ? "Left to Right Difference"
                              : "Left to Right Deficiency"}
                          </div>
                          <div className="text-xl font-bold">
                            {calculateBilateralDeficiency(
                              currentTest.leftMeasurements,
                              currentTest.rightMeasurements,
                            )}
                            %
                          </div>
                        </div>
                      )}
                      {currentTest.normLevel === "yes" &&
                        getNormForSide("left") > 0 && (
                          <>
                            <div className="bg-blue-400 text-white p-3 rounded text-center">
                              <div className="text-sm">
                                {isRangeOfMotionTest
                                  ? "Left Norm"
                                  : "Left Norm"}
                              </div>
                              <div className="text-xl font-bold">
                                {getNormForSide("left")} {getUnitSuffix()}
                              </div>
                            </div>
                            <div className="bg-blue-400 text-white p-3 rounded text-center">
                              <div className="text-sm">
                                {isRangeOfMotionTest
                                  ? "Left % of Norm"
                                  : "Left % of Norm"}
                              </div>
                              <div className="text-xl font-bold">
                                {Math.round(
                                  calculatePercentOfNorm(
                                    calculateAverage(
                                      currentTest.leftMeasurements,
                                    ),
                                    getNormForSide("left"),
                                  ),
                                )}
                                %
                              </div>
                            </div>
                          </>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Center Measurements Input */}
            <div
              className={
                isLiftTest ? "lg:col-span-2 lg:col-start-2" : "lg:col-span-2"
              }
            >
              <Card className="shadow-lg">
                <CardHeader className="bg-blue-600 text-white">
                  <CardTitle className="text-center">
                    MEASUREMENTS/ READINGS
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {currentTest.testId?.startsWith("dynamic-lift-") &&
                    !currentTest.testId.includes("infrequent") && (
                      <div className="mb-6 p-4 bg-blue-500 text-white rounded-lg text-center font-medium">
                        Note: frequent lifts are four lifts per cycle.
                      </div>
                    )}
                  {isLiftTest && (
                    <div className="mb-6">
                      <BarChart
                        measurements={currentTest.leftMeasurements}
                        side="left"
                      />
                    </div>
                  )}
                  {isLiftTest && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      <div className="bg-blue-400 text-white p-3 rounded text-center sm:col-span-2">
                        <div className="text-sm">Coefficient Of Variation</div>
                        <div className="text-xl font-bold">
                          {calculateCoefficientOfVariation(
                            currentTest.leftMeasurements,
                          )}
                          %
                        </div>
                      </div>
                      {(() => {
                        const avg = calculateAverage(
                          currentTest.leftMeasurements,
                        );
                        const rawUnit = currentTest?.unitMeasure?.toLowerCase();
                        const unit =
                          !rawUnit || rawUnit === "weight" ? "lbs" : rawUnit;
                        // const unit = (
                        //   currentTest?.unitMeasure || "lbs"
                        // ).toLowerCase();
                        const displayValue =
                          unit === "kg"
                            ? Math.round(avg * 2.20462 * 10) / 10
                            : unit === "lbs"
                              ? Math.round(avg * 10) / 10
                              : unit === "oz"
                                ? Math.round(avg * 16 * 10) / 10
                                : unit === "g"
                                  ? Math.round((avg / 453.592) * 10) / 10
                                  : Math.round(avg * 10) / 10;
                        return (
                          <div className="bg-blue-400 text-white p-3 rounded text-center sm:col-span-2">
                            <div className="text-sm">Average Weight</div>
                            <div className="text-xl font-bold">
                              {displayValue} {unit}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {/* Heart Rate Fields - Separated Section */}
                  <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-800 rounded-xl shadow-lg">
                    <h4 className="text-center font-bold text-gray-800 mb-4 text-base">
                      💓 Heart Rate Measurements
                    </h4>
                    <div className="grid grid-cols-2 gap-6 items-center text-sm max-w-lg mx-auto">
                      <div className="text-center font-semibold text-gray-700 bg-white rounded-lg py-2 border border-gray-300">
                        Pre Heart Rate
                      </div>
                      <div className="text-center font-semibold text-gray-700 bg-white rounded-lg py-2 border border-gray-300">
                        Post Heart Rate
                      </div>
                      <Input
                        type="number"
                        value={currentTest.leftMeasurements.preHeartRate || ""}
                        onChange={(e) =>
                          updateMeasurement(
                            "left",
                            "preHeartRate",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="text-center border-2 border-gray-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none text-sm h-12 bg-white shadow-sm font-medium"
                        placeholder="Pre HR"
                      />
                      <Input
                        type="number"
                        value={currentTest.leftMeasurements.postHeartRate || ""}
                        onChange={(e) =>
                          updateMeasurement(
                            "left",
                            "postHeartRate",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="text-center border-2 border-gray-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none text-sm h-12 bg-white shadow-sm font-medium"
                        placeholder="Post HR"
                      />
                    </div>
                  </div>

                  {/* Dynamic Lift Endpoint Selection */}
                  {isLiftTest &&
                    currentTest.testName.toLowerCase().includes("dynamic") && (
                      <div className="mb-6 p-6 bg-white border-2 border-blue-600 rounded-xl shadow-md">
                        <h4 className="text-center font-bold text-blue-800 mb-4 text-base">
                          Dynamic Lift Endpoint
                        </h4>
                        <p className="text-xs text-gray-600 text-center mb-4">
                          Select the criterion used to stop this dynamic lift
                          test.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                          {[
                            {
                              key: "biomechanical",
                              label: "Biomechanical",
                              desc: "Follows the client's biomechanics during the task; encourage proper mechanics, assess capacity as they move in their usual way.",
                            },
                            {
                              key: "physiological",
                              label: "Physiological",
                              desc: "Objective responses (HR, BP, RR, pallor). Keep HR < 85% APMHR during testing, recover to 70% APMHR before next test.",
                            },
                            {
                              key: "psychophysical",
                              label: "Psychophysical",
                              desc: "Based on client's perceived rate of exertion; terminate when client feels they cannot continue (maximum performance).",
                            },
                            {
                              key: "task-requirement",
                              label: "Task Requirement",
                              desc: "Stop when tested ability matches defined job requirement to avoid unnecessary risk.",
                            },
                          ].map((opt) => (
                            <label
                              key={opt.key}
                              className={`flex items-start space-x-2 p-3 rounded border cursor-pointer hover:bg-blue-50 ${
                                currentTest.dynamicEndpointType === opt.key
                                  ? "border-blue-600"
                                  : "border-gray-300"
                              }`}
                              title={opt.desc}
                            >
                              <input
                                type="radio"
                                name="dynamic-endpoint"
                                value={opt.key}
                                checked={
                                  currentTest.dynamicEndpointType === opt.key
                                }
                                onChange={(e) =>
                                  updateCurrentTest({
                                    dynamicEndpointType: e.target.value,
                                  })
                                }
                                className="mt-0.5 text-blue-600"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {opt.label}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {opt.desc}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Main Measurements Grid */}
                  {isLiftTest ? (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 mb-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Weight Metric
                        </Label>
                        <Select
                          value={liftUnit}
                          onValueChange={(value) =>
                            updateCurrentTest({
                              unitMeasure: value,
                              valueToBeTestedUnit:
                                currentTest.valueToBeTestedUnit || "Weight",
                            })
                          }
                        >
                          <SelectTrigger className="w-32 border-2 border-gray-800 focus:border-blue-600 focus:ring-0 h-10 bg-white">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lbs">lbs</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="oz">oz</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:gap-3 items-center text-xs sm:text-sm">
                        <div className="text-center font-bold text-sm py-2 text-blue-700">
                          Value ({liftUnit})
                        </div>
                        {[1, 2, 3, 4, 5, 6].map((trialNum) => {
                          const key =
                            `trial${trialNum}` as keyof TestMeasurement;
                          const val = currentTest.leftMeasurements[key];
                          return (
                            <div key={trialNum} className="flex flex-col">
                              <label className="text-xs font-semibold text-gray-600 mb-1 text-center">
                                Trial {trialNum}
                              </label>
                              <Input
                                type="number"
                                value={val || ""}
                                onChange={(e) =>
                                  updateMeasurement(
                                    "left",
                                    key,
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className={`text-center border-2 ${val > 250 ? "border-red-600" : "border-blue-300"} focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-xs sm:text-sm h-8 sm:h-10 bg-blue-50 font-medium`}
                              />
                              {val > 250 && (
                                <div className="text-red-700 text-xs mt-1">
                                  Value exceeds maximum of 250
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 items-start text-xs sm:text-sm">
                      <div className="space-y-2">
                        <div className="text-center font-bold text-sm py-2 text-blue-700">
                          {isRangeOfMotionTest
                            ? romPair?.[0] || "Left"
                            : isBalanceTest
                              ? "Trial 1"
                              : isCardioTest
                                ? "Pre-Test"
                                : "Left"}
                        </div>
                        {[1, 2, 3, 4, 5, 6].map((trialNum) => {
                          const key =
                            `trial${trialNum}` as keyof TestMeasurement;
                          const leftVal = currentTest.leftMeasurements[key];

                          return (
                            <div key={trialNum} className="flex flex-col">
                              <label className="text-xs font-semibold text-gray-600 mb-1 text-center">
                                Trial {trialNum}
                              </label>
                              <Input
                                type="number"
                                value={leftVal || ""}
                                onChange={(e) =>
                                  updateMeasurement(
                                    "left",
                                    key,
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className={`text-center border-2 ${leftVal > 250 ? "border-red-600" : "border-blue-300"} focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-xs sm:text-sm h-8 sm:h-10 bg-blue-50 font-medium`}
                              />
                              {leftVal > 250 && (
                                <div className="text-red-700 text-xs mt-1">
                                  Value exceeds maximum of 250
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        <div className="text-center font-bold text-sm py-2 text-green-700">
                          {isRangeOfMotionTest
                            ? romPair?.[1] || "Right"
                            : isBalanceTest
                              ? "Trial 2"
                              : isCardioTest
                                ? "Post-Test"
                                : "Right"}
                        </div>
                        {[1, 2, 3, 4, 5, 6].map((trialNum) => {
                          const key =
                            `trial${trialNum}` as keyof TestMeasurement;
                          const rightVal = currentTest.rightMeasurements[key];

                          return (
                            <div key={trialNum} className="flex flex-col">
                              <label className="text-xs font-semibold text-gray-600 mb-1 text-center">
                                Trial {trialNum}
                              </label>
                              <Input
                                type="number"
                                value={rightVal || ""}
                                onChange={(e) =>
                                  updateMeasurement(
                                    "right",
                                    key,
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className={`text-center border-2 ${rightVal > 250 ? "border-red-600" : "border-green-300"} focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none text-xs sm:text-sm h-8 sm:h-10 bg-green-50 font-medium`}
                              />
                              {rightVal > 250 && (
                                <div className="text-red-700 text-xs mt-1">
                                  Value exceeds maximum of 250
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {currentTest.testId?.startsWith("dynamic-lift-") &&
                    !currentTest.testId.includes("infrequent") && (
                      <div className="mt-6 p-4 bg-blue-500 text-white rounded-lg text-center font-medium">
                        Note: frequent lifts are four lifts per cycle.
                      </div>
                    )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side Measurements (hidden for Lift tests) */}
            {!isLiftTest && (
              <div className="lg:col-span-1">
                <Card className="shadow-lg">
                  <CardHeader className="bg-blue-400 text-white">
                    <CardTitle>
                      {isRangeOfMotionTest
                        ? romPair?.[1] || "Right"
                        : isBalanceTest
                          ? "Trial 2"
                          : "Right"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <BarChart
                      measurements={currentTest.rightMeasurements}
                      side="right"
                    />
                    <div className="mt-4 space-y-4">
                      <div className="bg-blue-400 text-white p-3 rounded text-center">
                        <div className="text-sm">
                          {isRangeOfMotionTest
                            ? "Average Degrees"
                            : isCardioTest
                              ? "Average Heart Rate"
                              : isBalanceTest
                                ? "Average Time"
                                : "Average Peak Force"}
                        </div>
                        <div className="text-xl font-bold">
                          {calculateAverage(currentTest.rightMeasurements)}
                          {isRangeOfMotionTest
                            ? "°"
                            : isCardioTest
                              ? " bpm"
                              : isBalanceTest
                                ? "s"
                                : ""}
                        </div>
                      </div>
                      <div className="bg-blue-400 text-white p-3 rounded text-center">
                        <div className="text-sm">Coefficient Of Variation</div>
                        <div className="text-xl font-bold">
                          {calculateCoefficientOfVariation(
                            currentTest.rightMeasurements,
                          )}
                          %
                        </div>
                      </div>
                      {(isForceTest || isRangeOfMotionTest) && (
                        <div className="bg-blue-400 text-white p-3 rounded text-center">
                          <div className="text-sm">
                            {isRangeOfMotionTest
                              ? "Right to Left Difference"
                              : "Right to Left Deficiency"}
                          </div>
                          <div className="text-xl font-bold">
                            {calculateBilateralDeficiency(
                              currentTest.rightMeasurements,
                              currentTest.leftMeasurements,
                            )}
                            %
                          </div>
                        </div>
                      )}
                      {currentTest.normLevel === "yes" &&
                        getNormForSide("right") > 0 && (
                          <>
                            <div className="bg-blue-400 text-white p-3 rounded text-center">
                              <div className="text-sm">
                                {isRangeOfMotionTest
                                  ? "Right Norm"
                                  : "Right Norm"}
                              </div>
                              <div className="text-xl font-bold">
                                {getNormForSide("right")} {getUnitSuffix()}
                              </div>
                            </div>
                            <div className="bg-blue-400 text-white p-3 rounded text-center">
                              <div className="text-sm">
                                {isRangeOfMotionTest
                                  ? "Right % of Norm"
                                  : "Right % of Norm"}
                              </div>
                              <div className="text-xl font-bold">
                                {Math.round(
                                  calculatePercentOfNorm(
                                    calculateAverage(
                                      currentTest.rightMeasurements,
                                    ),
                                    getNormForSide("right"),
                                  ),
                                )}
                                %
                              </div>
                            </div>
                          </>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Comments Section */}
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <div className="flex space-x-1">
              {["comments", "demonstrated", "perceived", "jobRequirements"].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 rounded-t text-sm font-medium ${
                      activeTab === tab
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {tab === "jobRequirements"
                      ? "Job Requirements"
                      : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ),
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {activeTab === "comments" && (
              <Textarea
                value={currentTest.comments}
                onChange={(e) =>
                  updateCurrentTest({ comments: e.target.value })
                }
                placeholder="Enter your written comments"
                className="min-h-[120px]"
              />
            )}

            {activeTab === "demonstrated" && (
              <div className="space-y-2">
                {/* Demonstrated Section */}
                <div className="space-y-1"></div>

                {/* Effort Section */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Effort</h4>
                  <div className="flex space-x-6">
                    {["Poor", "Fair to Average", "Good"].map((effortLevel) => (
                      <div
                        key={effortLevel}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="radio"
                          id={`effort-${effortLevel}`}
                          name="effort-level"
                          value={effortLevel}
                          checked={currentTest.effort === effortLevel}
                          onChange={(e) =>
                            updateCurrentTest({ effort: e.target.value })
                          }
                          className="text-blue-500"
                        />
                        <label
                          htmlFor={`effort-${effortLevel}`}
                          className="text-sm font-medium"
                        >
                          {effortLevel}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observations Section */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Observations</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {observationOptions.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={option}
                          checked={currentTest.observations.includes(option)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateCurrentTest({
                                observations: [
                                  ...currentTest.observations,
                                  option,
                                ],
                              });
                            } else {
                              updateCurrentTest({
                                observations: currentTest.observations.filter(
                                  (obs) => obs !== option,
                                ),
                              });
                            }
                          }}
                        />
                        <label htmlFor={option} className="text-sm">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "perceived" && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">
                  Perceived Exertion Level
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {effortLevels.map((level) => (
                    <div key={level} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`perceived-${level}`}
                        name="perceived"
                        value={level}
                        checked={currentTest.perceived === level}
                        onChange={(e) =>
                          updateCurrentTest({ perceived: e.target.value })
                        }
                        className="text-blue-500"
                      />
                      <label htmlFor={`perceived-${level}`} className="text-sm">
                        {level}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "jobRequirements" && (
              <div className="space-y-6">
                <h4 className="font-medium text-gray-900">Job Requirements</h4>

                {/* Description and Job Demand Value in same line */}
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium text-blue-600">
                      Description (written):
                    </Label>
                    <Textarea
                      value={currentTest.jobRequirements || ""}
                      onChange={(e) =>
                        updateCurrentTest({ jobRequirements: e.target.value })
                      }
                      placeholder="Enter job requirements and specific work-related tasks"
                      className="min-h-[150px] border-2 border-gray-300 focus:border-blue-500 focus:ring-0"
                    />
                  </div>

                  <div className="flex-1 space-y-4">
                    <Label className="text-sm font-medium text-blue-600">
                      Job Demand Value:
                    </Label>

                    {/* Norm Level */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-4">
                        <Label className="text-sm font-medium text-gray-900 min-w-[100px]">
                          NORM LEVEL:
                        </Label>
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="norm-yes"
                              name="normLevel"
                              value="yes"
                              checked={currentTest.normLevel === "yes"}
                              onChange={(e) =>
                                updateCurrentTest({
                                  normLevel: e.target.value as "yes" | "no",
                                  valueToBeTestedNumber: "",
                                  valueToBeTestedUnit: "",
                                  unitMeasure: "",
                                })
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <label
                              htmlFor="norm-yes"
                              className="text-sm font-medium text-gray-900"
                            >
                              YES
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="norm-no"
                              name="normLevel"
                              value="no"
                              checked={currentTest.normLevel === "no"}
                              onChange={(e) =>
                                updateCurrentTest({
                                  normLevel: e.target.value as "yes" | "no",
                                  valueToBeTestedUnit: "Weight",
                                  unitMeasure: "lbs",
                                  valueToBeTestedNumber: "",
                                })
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <label
                              htmlFor="norm-no"
                              className="text-sm font-medium text-gray-900"
                            >
                              NO
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Value To Be Tested - Only show if NORM LEVEL is "no" */}
                    {currentTest.normLevel === "no" && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-900">
                          VALUE TO BE TESTED:
                        </Label>
                        <div className="flex items-center space-x-3">
                          <Input
                            type="text"
                            value={currentTest.valueToBeTestedNumber || ""}
                            onChange={(e) =>
                              updateCurrentTest({
                                valueToBeTestedNumber: e.target.value,
                              })
                            }
                            className="w-32 h-10 border-2 border-gray-300 focus:border-blue-500 focus:ring-0 text-center"
                            placeholder=""
                          />
                          <Select
                            value={currentTest.valueToBeTestedUnit || ""}
                            onValueChange={(value) => {
                              const defaultUnitMap: Record<string, string> = {
                                Weight: "lbs",
                                Distance: "ft",
                                Time: "sec",
                                Force: "lbs",
                                Angle: "°",
                                Speed: "mph",
                                Frequency: "Hz",
                              };
                              updateCurrentTest({
                                valueToBeTestedUnit: value,
                                unitMeasure: defaultUnitMap[value] || "",
                              });
                            }}
                          >
                            <SelectTrigger className="w-48 h-10 border-2 border-gray-300 focus:border-blue-500 focus:ring-0">
                              <SelectValue placeholder="Weight" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Weight">Weight</SelectItem>
                              <SelectItem value="Distance">Distance</SelectItem>
                              <SelectItem value="Time">Time</SelectItem>
                              <SelectItem value="Force">Force</SelectItem>
                              <SelectItem value="Angle">Angle</SelectItem>
                              <SelectItem value="Speed">Speed</SelectItem>
                              <SelectItem value="Frequency">
                                Frequency
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Dynamic Unit Dropdown */}
                          {currentTest.valueToBeTestedUnit && (
                            <Select
                              value={currentTest.unitMeasure || ""}
                              onValueChange={(value) =>
                                updateCurrentTest({ unitMeasure: value })
                              }
                            >
                              <SelectTrigger className="w-24 h-10 border-2 border-blue-500 focus:border-blue-600 focus:ring-0">
                                <SelectValue
                                  placeholder={
                                    currentTest.unitMeasure || "Unit"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {currentTest.valueToBeTestedUnit ===
                                  "Weight" && (
                                  <>
                                    <SelectItem value="lbs">lbs</SelectItem>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="oz">oz</SelectItem>
                                    <SelectItem value="g">g</SelectItem>
                                  </>
                                )}
                                {currentTest.valueToBeTestedUnit ===
                                  "Distance" && (
                                  <>
                                    <SelectItem value="ft">ft</SelectItem>
                                    <SelectItem value="m">m</SelectItem>
                                    <SelectItem value="cm">cm</SelectItem>
                                    <SelectItem value="in">in</SelectItem>
                                    <SelectItem value="km">km</SelectItem>
                                    <SelectItem value="mi">mi</SelectItem>
                                  </>
                                )}
                                {currentTest.valueToBeTestedUnit === "Time" && (
                                  <>
                                    <SelectItem value="sec">sec</SelectItem>
                                    <SelectItem value="min">min</SelectItem>
                                    <SelectItem value="hr">hr</SelectItem>
                                    <SelectItem value="ms">ms</SelectItem>
                                  </>
                                )}
                                {currentTest.valueToBeTestedUnit ===
                                  "Force" && (
                                  <>
                                    <SelectItem value="lbs">lbs</SelectItem>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="N">N</SelectItem>
                                    <SelectItem value="kN">kN</SelectItem>
                                  </>
                                )}
                                {currentTest.valueToBeTestedUnit ===
                                  "Angle" && (
                                  <>
                                    <SelectItem value="°">°</SelectItem>
                                    <SelectItem value="rad">rad</SelectItem>
                                  </>
                                )}
                                {currentTest.valueToBeTestedUnit ===
                                  "Speed" && (
                                  <>
                                    <SelectItem value="mph">mph</SelectItem>
                                    <SelectItem value="km/h">km/h</SelectItem>
                                    <SelectItem value="m/s">m/s</SelectItem>
                                    <SelectItem value="ft/s">ft/s</SelectItem>
                                  </>
                                )}
                                {currentTest.valueToBeTestedUnit ===
                                  "Frequency" && (
                                  <>
                                    <SelectItem value="Hz">Hz</SelectItem>
                                    <SelectItem value="rpm">rpm</SelectItem>
                                    <SelectItem value="bpm">bpm</SelectItem>
                                    <SelectItem value="/min">/min</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Job Match - Below VALUE TO BE TESTED */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <Label className="text-sm font-medium text-blue-600 min-w-[100px]">
                          Job Match:
                        </Label>
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="job-match-yes"
                              name="jobMatch"
                              value="yes"
                              checked={currentTest.jobMatch === "yes"}
                              onChange={(e) =>
                                updateCurrentTest({
                                  jobMatch: e.target.value as "yes" | "no",
                                })
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <label
                              htmlFor="job-match-yes"
                              className="text-sm font-medium text-gray-900"
                            >
                              YES
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="job-match-no"
                              name="jobMatch"
                              value="no"
                              checked={currentTest.jobMatch === "no"}
                              onChange={(e) =>
                                updateCurrentTest({
                                  jobMatch: e.target.value as "yes" | "no",
                                })
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <label
                              htmlFor="job-match-no"
                              className="text-sm font-medium text-gray-900"
                            >
                              NO
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="mt-6 flex justify-between">
          <div className="text-sm text-gray-600">
            Test {testDataState.currentTestIndex + 1} of{" "}
            {testDataState.tests.length}: {currentTest.testName}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (currentTest.normLevel === "no" &&
                !currentTest.valueToBeTestedNumber?.trim())
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {isEditMode ? "Updating..." : "Saving..."}
              </div>
            ) : (
              <div className="flex items-center">
                <Save className="mr-2 h-5 w-5" />
                {testDataState.currentTestIndex ===
                testDataState.tests.length - 1
                  ? "Save & Finish"
                  : "Save & Continue"}
              </div>
            )}
          </Button>
        </div>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl text-green-600">
                <Check className="mr-3 h-6 w-6" />
                Success!
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditMode ? "Test Data Updated" : "Test Data Saved"}
                </h3>
                <p className="text-gray-600">
                  {isEditMode
                    ? "Step 6 has been updated successfully. Your changes have been saved."
                    : "Step 6 has been completed successfully. You can now proceed to the next step."}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowSuccessDialog(false)}
                className="flex-1"
              >
                Stay Here
              </Button>
              <Button
                onClick={() => navigate("/dashboard")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Return to Dashboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
