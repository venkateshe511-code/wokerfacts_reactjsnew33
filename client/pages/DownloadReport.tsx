import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Download,
  FileText,
  Check,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { db } from "../firebase";
import {
  getSampleIllustrations,
  illustrationsToHtml,
} from "@/lib/test-illustrations";
import { doc, getDoc } from "firebase/firestore";
import { getReferencesForTest, formatReference } from "@shared/references";
import { categorizeTest, groupTestsByCategory, getCategoriesInOrder, type TestCategory } from "@/lib/test-categorization";

// IndexedDB utilities for loading digital library images
const DB_NAME = "DigitalLibraryDB";
const DB_VERSION = 1;
const STORE_NAME = "images";

interface IndexedDBImage {
  id: string;
  name: string;
  type: string;
  size: number;
  category: "image" | "document" | "other";
  dataUrl: string;
  timestamp: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
};

const loadImagesFromDB = async (): Promise<IndexedDBImage[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        resolve(request.result || []);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error loading from IndexedDB:", error);
    return [];
  }
};

const resolveDynamicEndpointLabel = (test: any): string | null => {
  const rawEndpoint = String(
    test?.dynamicEndpointType ?? test?.parameters?.dynamicEndpointType ?? "",
  ).trim();

  if (!rawEndpoint) {
    return null;
  }

  const key = rawEndpoint.toLowerCase();
  const map: Record<string, string> = {
    biomechanical: "Biomechanical",
    physiological: "Physiological",
    psychophysical: "Psychophysical",
    "task-requirement": "Task Requirement",
  };

  if (map[key]) {
    return map[key];
  }

  return key
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

interface ReportSummary {
  evaluatorName: string;
  claimantName: string;
  completedSteps: number;
  totalTests: number;
  totalImages: number;
  paymentAmount: number;
  reportId: string;
}

export default function DownloadReport() {
  const navigate = useNavigate();
  const { selectedProfileId } = useAuth();
  const [reportSummary, setReportSummary] = useState<ReportSummary>({
    evaluatorName: "",
    claimantName: "",
    completedSteps: 0,
    totalTests: 0,
    totalImages: 0,
    paymentAmount: 0,
    reportId: "",
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [selectedReports, setSelectedReports] = useState({
    executiveSummary: false,
    fullReport: false,
  });
  const [signatureImage, setSignatureImage] = useState<string | null>(null);

  // Helper to get evaluator data with Firestore fallback to ensure logo and branding are present
  const getEvaluatorData = async (): Promise<any> => {
    try {
      const local = localStorage.getItem("evaluatorData");
      let parsed: any = local ? JSON.parse(local) : {};

      const needsFetch =
        (!parsed || Object.keys(parsed).length === 0 || !parsed.clinicLogo) &&
        !!selectedProfileId;

      if (needsFetch) {
        try {
          const ref = doc(db, "evaluatorProfiles", selectedProfileId as string);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const d: any = snap.data();
            const fromServer = {
              name: d.name || "",
              licenseNo: d.licenseNo || "",
              clinicName: d.clinicName || "",
              address: d.address || "",
              country: d.country || "",
              city: d.city || "",
              zipcode: d.zipcode || "",
              email: d.email || "",
              phone: d.phone || "",
              fax: d.fax || "",
              website: d.website || "",
              profilePhoto: d.profilePhoto || null,
              clinicLogo: d.clinicLogo || null,
            };
            parsed = { ...fromServer, ...parsed };
          }
        } catch (e) {
          console.error("Failed to load evaluator profile for report:", e);
        }
      }

      return parsed || {};
    } catch (e) {
      console.error("Error reading evaluator data:", e);
      return {};
    }
  };

  useEffect(() => {
    // Load summary data from all steps
    const loadSummaryData = async () => {
      try {
        // Load signature from localStorage if it exists
        const savedSignature = localStorage.getItem("signatureImage");
        if (savedSignature) {
          setSignatureImage(savedSignature);
        }

        const evaluatorData = await getEvaluatorData();
        const claimantData = JSON.parse(
          localStorage.getItem("claimantData") || "{}",
        );
        const protocolTestsData = JSON.parse(
          localStorage.getItem("protocolTestsData") || "{}",
        );
        const digitalLibraryRawData =
          localStorage.getItem("digitalLibraryData");
        const paymentData = JSON.parse(
          localStorage.getItem("paymentData") || "{}",
        );
        const completedSteps = JSON.parse(
          localStorage.getItem("completedSteps") || "[]",
        );
        const mtmTestData = JSON.parse(
          localStorage.getItem("mtmTestData") || "{}",
        );
        const referralQuestionsData = JSON.parse(
          localStorage.getItem("referralQuestionsData") || "{}",
        );

        // Handle digital library data loading (IndexedDB or localStorage)
        let digitalLibraryData: any = {};
        if (digitalLibraryRawData) {
          const parsedData = JSON.parse(digitalLibraryRawData);

          if (parsedData.storageType === "indexeddb") {
            // Load actual images from IndexedDB for count
            try {
              const imagesFromDB = await loadImagesFromDB();
              digitalLibraryData = {
                ...parsedData,
                savedFileData: imagesFromDB.map((img) => ({
                  id: img.id,
                  name: img.name,
                  type: img.type,
                  size: img.size,
                  category: img.category,
                  dataUrl: img.dataUrl,
                })),
              };
            } catch (error) {
              console.error(
                "Error loading images from IndexedDB for summary:",
                error,
              );
              digitalLibraryData = { ...parsedData, savedFileData: [] }; // Use empty array as fallback
            }
          } else {
            digitalLibraryData = parsedData;
          }
        }

        // Calculate total images from all sources
        let totalImages = digitalLibraryData.savedFileData?.length || 0;

        // Add MTM test images
        if (mtmTestData) {
          Object.values(mtmTestData).forEach((testData: any) => {
            if (testData.savedImageData) {
              totalImages += testData.savedImageData.length;
            }
          });
        }

        // Add referral question images
        if (referralQuestionsData.questions) {
          referralQuestionsData.questions.forEach((question: any) => {
            if (question.savedImageData) {
              totalImages += question.savedImageData.length;
            }
          });
        }

        setReportSummary({
          evaluatorName: evaluatorData.name || "Unknown Evaluator",
          claimantName:
            `${claimantData.firstName || ""} ${
              claimantData.lastName || ""
            }`.trim() || "Unknown Claimant",
          completedSteps: completedSteps.length,
          totalTests: protocolTestsData.selectedTests?.length || 0,
          totalImages: totalImages,
          paymentAmount: paymentData.amount || 0,
          reportId: `FCE-${Date.now()}`,
        });
      } catch (error) {
        console.error("Error loading summary data:", error);
      }
    };

    loadSummaryData();
  }, []);

  const clearStepsData = () => {
    // Clear only steps data, keep evaluator profile and signature
    const keysToRemove = [
      "claimantData",
      "painIllustrationData",
      "activityRatingData",
      "referralQuestionsData",
      "protocolTestsData",
      "testData",
      "mtmTestData",
      "digitalLibraryData",
      "paymentData",
      "reviewReportData",
      "completedSteps",
    ];

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  };

  const clearAllData = () => {
    // Clear all evaluation data but KEEP evaluator profile info
    const evaluatorBackup = localStorage.getItem("evaluatorData");
    const selectedProfileIdBackup = localStorage.getItem(
      "selectedEvaluatorProfileId",
    );
    const sampleAccessBackup = localStorage.getItem("sampleAccess");

    localStorage.clear();

    if (evaluatorBackup) localStorage.setItem("evaluatorData", evaluatorBackup);
    if (selectedProfileIdBackup)
      localStorage.setItem(
        "selectedEvaluatorProfileId",
        selectedProfileIdBackup,
      );
    if (sampleAccessBackup)
      localStorage.setItem("sampleAccess", sampleAccessBackup);
  };

  const generateReportContent = async () => {
    // Load all evaluation data
    const evaluatorData = await getEvaluatorData();
    const claimantData = JSON.parse(
      localStorage.getItem("claimantData") || "{}",
    );
    const painIllustrationData = JSON.parse(
      localStorage.getItem("painIllustrationData") || "{}",
    );
    const activityRatingData = JSON.parse(
      localStorage.getItem("activityRatingData") || "{}",
    );
    const referralQuestionsData = JSON.parse(
      localStorage.getItem("referralQuestionsData") || "{}",
    );
    const returnToWorkStatus = referralQuestionsData.returnToWorkStatus || {};
    const protocolTestsData = JSON.parse(
      localStorage.getItem("protocolTestsData") || "{}",
    );
    let testData = JSON.parse(localStorage.getItem("testData") || "{}");
    const mtmTestData = JSON.parse(localStorage.getItem("mtmTestData") || "{}");
    const cardioTestData = JSON.parse(
      localStorage.getItem("cardioTestData") || "{}",
    );

    // Merge cardio data into test data
    if (testData && testData.tests && Object.keys(cardioTestData).length > 0) {
      testData.tests = testData.tests.map((test: any) => {
        const cardioData = cardioTestData[test.testId];
        if (cardioData) {
          // Map cardio field names to expected field names
          const mappedCardioData = {
            // Map vo2MaxScore to vo2Max
            vo2Max: cardioData.vo2MaxScore || cardioData.vo2Max || "",
            // Map predictedVO2Max to predictedVo2Max (case correction)
            predictedVo2Max:
              cardioData.predictedVO2Max || cardioData.predictedVo2Max || "",
            // These fields already match
            classification: cardioData.classification || "",
            hbr: cardioData.hbr || "",
            aerobicFitnessScore: cardioData.aerobicFitnessScore || "",
            // YMCA Step Test fields
            clientRating: cardioData.clientRating || "",
            // YMCA Submaximal Treadmill Test fields
            heartRate: cardioData.heartRate || "",
            bloodPressure: cardioData.bloodPressure || "",
            rpe: cardioData.rpe || "",
            // Include image data
            clientImages: cardioData.clientImages || [],
            serializedImages: cardioData.serializedImages || [],
          };
          return { ...test, ...mappedCardioData };
        }
        return test;
      });
    }

    // Use the strict categorization utility instead of inline logic
    const inferTestCategory = (test: any): TestCategory => {
      return categorizeTest(test);
    };

    const normalizeMeasurements = (
      measurements: any = {},
    ): Record<string, number> => {
      const allowedKeys = [
        "trial1",
        "trial2",
        "trial3",
        "trial4",
        "trial5",
        "trial6",
        "preHeartRate",
        "postHeartRate",
      ];

      return allowedKeys.reduce<Record<string, number>>((acc, key) => {
        const rawValue = measurements?.[key];
        if (typeof rawValue === "number" && !Number.isNaN(rawValue)) {
          acc[key] = rawValue;
        } else if (
          typeof rawValue === "string" &&
          rawValue.trim() !== "" &&
          !Number.isNaN(Number(rawValue))
        ) {
          acc[key] = Number(rawValue);
        }
        return acc;
      }, {});
    };

    const calculateAverage = (measurements: any): number => {
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

    const calculateCV = (measurements: any): number => {
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
      return Math.round((standardDeviation / mean) * 100);
    };

    const calculateBilateralDeficiency = (
      leftAvg: number,
      rightAvg: number,
    ): number => {
      if (leftAvg === 0 || rightAvg === 0) return 0;
      const higher = Math.max(leftAvg, rightAvg);
      const lower = Math.min(leftAvg, rightAvg);
      return Math.round(((higher - lower) / higher) * 100);
    };

    const extractTrialValues = (measurements: any): number[] => {
      if (!measurements) return [];
      return [
        measurements.trial1,
        measurements.trial2,
        measurements.trial3,
        measurements.trial4,
        measurements.trial5,
        measurements.trial6,
      ].filter((value) => typeof value === "number" && !Number.isNaN(value));
    };

    const computeBarHeight = (
      value: number,
      maxValue: number,
      maxHeight = 100,
    ): number => {
      if (!maxValue || maxValue <= 0) return 0;
      const safeValue = Math.max(0, Number(value) || 0);
      return Math.round((safeValue / maxValue) * maxHeight);
    };

    const coerceBoolean = (value: any): boolean | undefined => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
      }
      return undefined;
    };

    const normalizedTestArray = Array.isArray(testData?.tests)
      ? testData.tests
          .filter((entry: any) => entry && typeof entry === "object")
          .map((entry: any) => {
            const leftMeasurements = normalizeMeasurements(
              entry.leftMeasurements,
            );
            const rightMeasurements = normalizeMeasurements(
              entry.rightMeasurements,
            );
            const derivedCategory = inferTestCategory(entry);

            // Helper function to get default unit based on category
            const getDefaultUnit = (category: string) => {
              const categoryLower = (category || "").toLowerCase();
              if (categoryLower === "weight") return "lbs";
              if (categoryLower === "distance") return "ft";
              if (categoryLower === "time") return "sec";
              if (categoryLower === "force") return "lbs";
              if (categoryLower === "angle") return "°";
              if (categoryLower === "speed") return "mph";
              if (categoryLower === "frequency") return "Hz";
              return "";
            };

            // Use unitMeasure if available, otherwise apply default based on valueToBeTestedUnit category
            const unit =
              entry.unitMeasure ||
              getDefaultUnit(entry.valueToBeTestedUnit) ||
              "";

            const leftAvg = calculateAverage(leftMeasurements);
            const rightAvg = calculateAverage(rightMeasurements);
            const leftCv = calculateCV(leftMeasurements);
            const rightCv = calculateCV(rightMeasurements);
            const bilateralDef = calculateBilateralDeficiency(
              leftAvg,
              rightAvg,
            );

            const existingResult =
              typeof entry.result === "string" ? entry.result.trim() : "";
            const derivedResult = (() => {
              const segments: string[] = [];
              if (leftAvg > 0) {
                segments.push(
                  `Left Avg: ${leftAvg.toFixed(1)}${unit ? ` ${unit}` : ""}`,
                );
              }
              if (rightAvg > 0) {
                segments.push(
                  `Right Avg: ${rightAvg.toFixed(1)}${unit ? ` ${unit}` : ""}`,
                );
              }
              return segments.join(" | ");
            })();

            const normalizedObservations = Array.isArray(entry.observations)
              ? entry.observations
              : typeof entry.observations === "string" &&
                  entry.observations.trim() !== ""
                ? [entry.observations.trim()]
                : [];

            const normalizedDemonstrated = coerceBoolean(entry.demonstrated);

            return {
              testId: entry.testId,
              testName: entry.testName,
              category: entry.category || derivedCategory,
              testType: entry.testType || derivedCategory,
              leftMeasurements,
              rightMeasurements,
              result: existingResult || derivedResult || "",
              comments: entry.comments || "",
              effort: entry.effort || "",
              observations: normalizedObservations,
              dynamicEndpointType:
                entry.dynamicEndpointType ||
                entry.parameters?.dynamicEndpointType ||
                "",
              demonstrated:
                normalizedDemonstrated !== undefined
                  ? normalizedDemonstrated
                  : typeof entry.demonstrated === "boolean"
                    ? entry.demonstrated
                    : undefined,
              perceived: entry.perceived ?? "",
              jobRequirements: entry.jobRequirements || "",
              jobMatch: entry.jobMatch || "",
              jobDemands: entry.jobDemands || "",
              jobDescription: entry.jobDescription || "",
              normLevel: entry.normLevel || "",
              valueToBeTestedNumber: entry.valueToBeTestedNumber || "",
              valueToBeTestedUnit: entry.valueToBeTestedUnit || unit,
              unitMeasure: unit,
              measurements: entry.measurements || undefined,
              trials: Array.isArray(entry.trials) ? entry.trials : [],
              clientImages: Array.isArray(entry.clientImages)
                ? entry.clientImages
                : [],
              serializedImages: Array.isArray(entry.serializedImages)
                ? entry.serializedImages
                : [],
              cardioSummary: entry.cardioSummary || undefined,
              vo2Max: entry.vo2Max || undefined,
              predictedVo2Max: entry.predictedVo2Max || undefined,
              classification: entry.classification || undefined,
              hbr: entry.hbr || undefined,
              aerobicFitnessScore: entry.aerobicFitnessScore || undefined,
              leftAverage: leftAvg,
              rightAverage: rightAvg,
              leftCoefficientOfVariation: leftCv,
              rightCoefficientOfVariation: rightCv,
              bilateralDeficiency: bilateralDef,
            };
          })
          .filter((entry: any) => Boolean(entry.testName))
      : [];

    const normalizedCurrentIndex =
      typeof testData?.currentTestIndex === "number"
        ? testData.currentTestIndex
        : 0;

    testData = {
      ...testData,
      tests: normalizedTestArray,
      currentTestIndex: normalizedCurrentIndex,
    };

    // Handle digital library data loading (IndexedDB or localStorage)
    const digitalLibraryRawData = localStorage.getItem("digitalLibraryData");
    let digitalLibraryData: any = {};
    if (digitalLibraryRawData) {
      const parsedData = JSON.parse(digitalLibraryRawData);

      if (parsedData.storageType === "indexeddb") {
        // Load actual images from IndexedDB for PDF generation
        try {
          const imagesFromDB = await loadImagesFromDB();
          console.log(
            `PDF Generation: Loaded ${imagesFromDB.length} images from IndexedDB`,
          );
          digitalLibraryData = {
            ...parsedData,
            savedFileData: imagesFromDB.map((img) => ({
              id: img.id,
              name: img.name,
              type: img.type,
              size: img.size,
              category: img.category,
              dataUrl: img.dataUrl,
            })),
          };
          console.log(
            `PDF Generation: Digital library prepared with ${digitalLibraryData.savedFileData.length} images`,
          );
        } catch (error) {
          console.error("Error loading images from IndexedDB for PDF:", error);
          digitalLibraryData = { ...parsedData, savedFileData: [] }; // Use empty array as fallback
        }
      } else {
        digitalLibraryData = parsedData;
      }
    }

    const paymentData = JSON.parse(localStorage.getItem("paymentData") || "{}");

    // Separate function to generate MTM content
    const generateMTMContent = (mtmData: any, mainTestData: any) => {
      if (!mtmData || Object.keys(mtmData).length === 0) {
        return "";
      }

      const mtmIllustrationsHtml = Object.keys(mtmData)
        .map((testType: string) =>
          illustrationsToHtml(getSampleIllustrations(testType)),
        )
        .join("");

      return `
        <div class="test-section" style="page-break-before: always; padding: 20px 0; position: relative;">
            <h4 class="test-header" style="font-weight: bold; margin-bottom: 16px;">Occupational Tasks Methods Time Measurement Analysis</h4>

            <!-- Full height vertical line starting below the heading (fixed to match regular tests) -->
            <div style="position: absolute; left: 150px; top: 60px; bottom: 0; width: 1px; background-color: #333;"></div>

            <div style="display: grid; grid-template-columns: 160px 1fr; gap: 16px;">
                <!-- Left Column - Illustrations -->
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <p style="font-size: 12px; font-weight: 400; text-decoration: underline; color: #666;">Sample Illustration:</p>

                    <!-- MTM Illustrations (mapped) -->
                    ${mtmIllustrationsHtml}
                </div>

                <!-- Right Column - Combined Content with Tests and Charts -->
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <!-- Test Description -->
                    <p style="font-size: 12px; font-style: italic;">
                        The client was tested in our facility using MTM. The test results were compared to industrial standards.
                    </p>

                    <!-- All MTM Tests Combined -->
                    ${Object.entries(mtmData)
                      .map(
                        (
                          [testType, testData]: [string, any],
                          index: number,
                        ) => {
                          const trials = testData.trials || [];
                          const testName =
                            testData.testName ||
                            testType.charAt(0).toUpperCase() +
                              testType.slice(1);

                          // Find corresponding test in regular test data for comments (same logic as ReviewReport)
                          // Try multiple matching strategies for better compatibility
                          const correspondingTest = mainTestData.tests?.find(
                            (test: any) => {
                              const testNameLower =
                                test.testName?.toLowerCase() || "";
                              const testTypeLower = testType.toLowerCase();
                              const testNameDisplayLower =
                                testName.toLowerCase();

                              return (
                                testNameLower.includes(testTypeLower) ||
                                testNameLower.includes(testNameDisplayLower) ||
                                testTypeLower.includes(testNameLower) ||
                                testNameDisplayLower.includes(testNameLower) ||
                                test.testId === testType ||
                                test.testId === testName ||
                                // Try exact matches without case sensitivity
                                testNameLower === testTypeLower ||
                                testNameLower === testNameDisplayLower
                              );
                            },
                          );

                          return generateMTMTestSection(
                            testName,
                            testData,
                            trials,
                            correspondingTest,
                          );
                        },
                      )
                      .join("")}

                    <!-- References for MTM (styled like regular tests) -->
                    <div class="test-references" style="margin-top: 12px; padding: 8px; background: #f9f9f9; border-left: 3px solid #ddd;">
                        <p style="font-size: 9px; font-weight: bold; color: #666; margin-bottom: 4px; font-family: Arial, sans-serif;">References:</p>
                        <div style="font-size: 8px; color: #888; line-height: 1.3; font-family: Arial, sans-serif;">
                            <p style="margin: 2px 0;">Anderson, D.S. and Edstrom D.P. "MTM Personnel Selection Tests; Validation at a Northwestern National Life Insurance Company". Journal of Methods-Time Measurement, 15, (3).</p>
                            <p style="margin: 2px 0;">Birdsong, J.H. and Chyatte, S.B. (1970) "Further medical applications of methods-time measurement". Journal of Methods-Time Measurement, 15, 19-27.</p>
                            <p style="margin: 2px 0;">Brickey, "MTM in a Sheltered Workshop". Journal of Methods-Time Measurement, 8, (3) 2-7.</p>
                            <p style="margin: 2px 0;">Chyatte, S.B. and Birdsong, J.H. (1972) "Methods time measurement in assessment of motor performance". Archives of Physical Medicine and Rehabilitation, 53, 38-44.</p>
                            <p style="margin: 2px 0;">Foulke, J.A. "Estimating Individual Operator Performance". Journal of Methods-Time Measurement, 15, (1) 18-23.</p>
                            <p style="margin: 2px 0;">Grant, G.W.B., Moores, B. and Whelan, E. (1975) "Applications of Methods-time measurement in training centers for the mentally handicapped". Journal of Methods-Time Measurement, 11, 23-30.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      `;
    };

    // Helper function to generate cardio test content matching ReviewReport.tsx
    const generateCardioTestContent = (test: any, testName: string) => {
      const testNameLower = testName.toLowerCase();

      if (
        testNameLower.includes("bruce") ||
        testNameLower.includes("treadmill")
      ) {
        return `
          <!-- Bruce Treadmill Test Details -->
          <div style="space-y: 16px;">
            <!-- Protocol Stages -->
            <div style="margin-bottom: 16px;">
              <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 12px;">Protocol Stages</h5>
              <p style="font-size: 10px; margin-bottom: 12px;">
                The Bruce protocol involves getting on a treadmill and increasing speed and incline
                every three minutes (in stages). The test stops when you've hit 85% of your maximum
                heart rate, your heart rate exceeds 115 beats per minute for two stages, or it is
                deemed that the test should no longer continue. If your heart rate changes more than
                six beats per minute between the second and third minute of any given stage, you are
                kept at the same speed & incline for an additional minute. (As your HR has not
                achieved a steady state).
              </p>
            </div>

            <!-- Measuring VO2 Max and Stages Table -->
            <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
              <div style="flex: 1; min-width: 300px;">
                <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 11px;">Measuring VO2 Max:</h5>
                <p style="font-size: 9px; margin-bottom: 12px;">
                  Maximal oxygen uptake (VO2 max) refers to the maximum amount of oxygen an individual
                  can use during intense or maximal exercise. It is measured as milliliters of oxygen
                  used in one minute per kilogram of body weight (ml/kg/min).
                </p>
                <p style="font-size: 9px; margin-bottom: 12px;">
                  The Bruce treadmill test is an indirect maximal oxygen uptake test. It is indirect
                  because it estimates VO2 max using a formula and the person's performance on a
                  treadmill as the workload increases.
                </p>
                <p style="font-size: 9px; margin-bottom: 12px;">
                  When the Bruce protocol formula is used, T stands for total time on the treadmill
                  and is measured as a fraction of a minute. If test time of 10 minutes 15 seconds
                  would be written as T=10.25); this formula changes based on gender. The time you
                  spend on the treadmill is your test score and can be used to estimate your VO2 max
                  value. Blood pressure and ratings of perceived exertion are also often collected
                  during the Bruce protocol test.
                </p>
                <p style="font-size: 9px;">
                  <strong>Men:</strong> 14.8 - (1.379 × T) + (0.451 × T²) - (0.012 × T³) = VO2 max<br />
                  <strong>Women:</strong> 4.38 × T - 3.9 = VO2 max
                </p>
              </div>

              <div style="flex: 1; min-width: 300px;">
                <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 11px;">Bruce Treadmill Test Stages, Speeds, and Inclines:</h5>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; font-size: 8px; table-layout: auto;">
                  <thead>
                    <tr style="background: #f0f0f0;">
                      <th style="border: 1px solid #333; padding: 4px;text-align: center;">Stage</th>
                      <th style="border: 1px solid #333; padding: 4px;text-align: center;">Treadmill Speed</th>
                      <th style="border: 1px solid #333; padding: 4px;text-align: center;">Treadmill Incline</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style="border: 1px solid #333; padding: 4px;text-align: center;">1</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">1.7 mph</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">10% grade</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;text-align: center;">2</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">2.5 mph</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">12% grade</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;text-align: center;">3</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">3.4 mph</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">14% grade</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;text-align: center;">4</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">4.2 mph</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">16% grade</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;text-align: center;">5</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">5.0 mph</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">18% grade</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;text-align: center;">6</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">5.5 mph</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">20% grade</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;text-align: center;">7</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">6.0 mph</td><td style="border: 1px solid #333; padding: 4px;text-align: center;">22% grade</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Classification and VO2 Max Results -->
            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 12px 0;">
              <div>
                <span style="font-weight: bold; font-size: 11px;">CLASSIFICATION: </span>
                <span style="border-bottom: 1px solid #333; padding: 4px 16px; display: inline-block; min-width: 120px; font-size: 11px;">
                  ${test.classification || ""}
                </span>
              </div>
              <div>
                <span style="font-weight: bold; font-size: 11px;">VO2 MAX: </span>
                <span style="border-bottom: 1px solid #333; padding: 4px 16px; display: inline-block; min-width: 120px; font-size: 11px;">
                  ${test.vo2Max || ""}
                </span>
              </div>
            </div>

            <!-- VO2 Max Norms Tables (Men and Women stacked vertically) -->
            <div style="margin-bottom: 16px;">
              <!-- Men's Table -->
              <div style="margin-bottom: 16px;">
                <h6 style="font-size: 9px; font-weight: bold; text-align: center; margin-bottom: 4px;">
                  VO2 Max Norms for Men as Measured in ml/kg/min
                </h6>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; font-size: 7px; table-layout: auto;">
                  <thead>
                    <tr style="background: #f0f0f0;">
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Age</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Excellent</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Good</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Above Average</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Average</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Below Average</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Poor</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Very Poor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style="border: 1px solid #333; padding: 2px;text-align: center;">20-29</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">>56</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">50-56</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">46-49</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">42-45</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">37-41</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">31-36</td><td style="border: 1px solid #333; padding: 2px;text-align: center;"><31</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;text-align: center;">30-39</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">>54</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">48-54</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">44-47</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">40-43</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">35-39</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">29-34</td><td style="border: 1px solid #333; padding: 2px;text-align: center;"><29</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;text-align: center;">40-49</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">>52</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">46-52</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">42-45</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">38-41</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">33-37</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">27-32</td><td style="border: 1px solid #333; padding: 2px;text-align: center;"><27</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;text-align: center;">50-59</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">>50</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">44-50</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">40-43</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">36-39</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">31-35</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">25-30</td><td style="border: 1px solid #333; padding: 2px;text-align: center;"><25</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;text-align: center;">60+</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">>48</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">42-48</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">38-41</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">34-37</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">29-33</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">23-28</td><td style="border: 1px solid #333; padding: 2px;text-align: center;"><23</td></tr>
                  </tbody>
                </table>
              </div>

              <!-- Women's Table -->
              <div>
                <h6 style="font-size: 9px; font-weight: bold; text-align: center; margin-bottom: 4px;">
                  VO2 Max Norms for Women as Measured in ml/kg/min
                </h6>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; font-size: 7px; table-layout: auto;">
                  <thead>
                    <tr style="background: #f0f0f0;">
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Age</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Excellent</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Good</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Above Average</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Average</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Below Average</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Poor</th>
                      <th style="border: 1px solid #333; padding: 2px;text-align: center;">Very Poor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style="border: 1px solid #333; padding: 2px;text-align: center;">20-29</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">>49</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">43-49</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">39-42</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">35-38</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">31-34</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">25-30</td><td style="border: 1px solid #333; padding: 2px;text-align: center;"><25</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;text-align: center;">30-39</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">>47</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">41-47</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">37-40</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">33-36</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">29-32</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">23-28</td><td style="border: 1px solid #333; padding: 2px;text-align: center;"><23</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;text-align: center;">40-49</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">>45</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">39-45</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">35-38</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">31-34</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">27-30</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">21-26</td><td style="border: 1px solid #333; padding: 2px;text-align: center;"><21</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;text-align: center;">50-59</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">>43</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">37-43</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">33-36</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">29-32</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">25-28</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">19-24</td><td style="border: 1px solid #333; padding: 2px;text-align: center;"><19</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;text-align: center;">60+</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">>41</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">35-41</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">31-34</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">27-30</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">23-26</td><td style="border: 1px solid #333; padding: 2px;text-align: center;">17-22</td><td style="border: 1px solid #333; padding: 2px;text-align: center;"><17</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Client Images Section -->
            ${
              test.serializedImages && test.serializedImages.length > 0
                ? `
              <div style="margin-top: 16px;">
                <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 11px;">CLIENT IMAGES:</h5>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                  ${test.serializedImages
                    .map(
                      (img: any, idx: number) => `
                    <div style="border: 1px solid #333; padding: 4px; background: white; text-align: center; width: 80px;">
                      <img src="${img.data}" alt="${img.name || `Bruce Treadmill Image ${idx + 1}`}" style="width: 80px; height: 60px; object-fit: contain;" />
                      ${img.name ? `<p style="font-size: 8px; margin: 4px 0 0 0; text-overflow: ellipsis; overflow: hidden;">${img.name}</p>` : ""}
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
          </div>
        `;
      } else if (testNameLower.includes("mcaft")) {
        return `
          <!-- mCAFT Test Details -->
          <div style="space-y: 16px;">
            <p style="font-size: 10px; margin-bottom: 16px; text-align: justify; text-justify: inter-word;">
              mCAFT (Modified Canadian Aerobic Fitness Test), is designed to give information about the aerobic fitness of a person, while using
              minimal equipment. The subject works by lifting its own body weight up and down double steps
              (40.6 cm in height total) while listening to set cadences from a compact disc. The end-stage of
              the age and gender specific stepping rate requires 65% of the age-predicted maximum heart rate.
              The heart rate increases approximately in a linear fashion from 50% to 100% of maximal oxygen
              intake. The heart rate does not decrease significantly during the first fifteen seconds of recovery
              (O2 in). Thus, one can predict an aerobic fitness using the heart rate right after exercise of a
              known sub-maximal rate of working.
            </p>

            <!-- mCAFT Tables -->
            <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
              <div style="flex: 1; min-width: 250px;">
                <h6 style="font-weight: bold; margin-bottom: 8px; font-size: 11px;">Starting stepping stage by gender</h6>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; font-size: 9px; margin-bottom: 16px; table-layout: auto;">
                  <thead>
                    <tr style="background: #f0f0f0;">
                      <th style="border: 1px solid #333; padding: 4px;">Age</th>
                      <th style="border: 1px solid #333; padding: 4px;">Males</th>
                      <th style="border: 1px solid #333; padding: 4px;">Females</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style="border: 1px solid #333; padding: 4px;">15-19</td><td style="border: 1px solid #333; padding: 4px;">4</td><td style="border: 1px solid #333; padding: 4px;">3</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;">20-29</td><td style="border: 1px solid #333; padding: 4px;">4</td><td style="border: 1px solid #333; padding: 4px;">3</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;">30-39</td><td style="border: 1px solid #333; padding: 4px;">3</td><td style="border: 1px solid #333; padding: 4px;">2</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;">40-49</td><td style="border: 1px solid #333; padding: 4px;">3</td><td style="border: 1px solid #333; padding: 4px;">2</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;">50-59</td><td style="border: 1px solid #333; padding: 4px;">2</td><td style="border: 1px solid #333; padding: 4px;">2</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 4px;">60-69</td><td style="border: 1px solid #333; padding: 4px;">2</td><td style="border: 1px solid #333; padding: 4px;">1</td></tr>
                  </tbody>
                </table>
              </div>

              <div style="flex: 1; min-width: 350px;">
                <h6 style="font-weight: bold; margin-bottom: 8px; font-size: 11px;">Oxygen cost in ml/kg/min</h6>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; font-size: 8px; table-layout: auto;">
                  <thead>
                    <tr style="background: #f0f0f0;">
                      <th style="border: 1px solid #333; padding: 2px;">Stage</th>
                      <th style="border: 1px solid #333; padding: 2px;">Stepping cadence (Females)</th>
                      <th style="border: 1px solid #333; padding: 2px;">Stepping cadence (Males)</th>
                      <th style="border: 1px solid #333; padding: 2px;">oxygen cost (Females)</th>
                      <th style="border: 1px solid #333; padding: 2px;">Oxygen cost (Males)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style="border: 1px solid #333; padding: 2px;">1</td><td style="border: 1px solid #333; padding: 2px;">24</td><td style="border: 1px solid #333; padding: 2px;">24</td><td style="border: 1px solid #333; padding: 2px;">15.3</td><td style="border: 1px solid #333; padding: 2px;">15.9</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">2</td><td style="border: 1px solid #333; padding: 2px;">27</td><td style="border: 1px solid #333; padding: 2px;">27</td><td style="border: 1px solid #333; padding: 2px;">18.0</td><td style="border: 1px solid #333; padding: 2px;">18.6</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">3</td><td style="border: 1px solid #333; padding: 2px;">30</td><td style="border: 1px solid #333; padding: 2px;">30</td><td style="border: 1px solid #333; padding: 2px;">20.7</td><td style="border: 1px solid #333; padding: 2px;">21.3</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">4</td><td style="border: 1px solid #333; padding: 2px;">33</td><td style="border: 1px solid #333; padding: 2px;">33</td><td style="border: 1px solid #333; padding: 2px;">23.4</td><td style="border: 1px solid #333; padding: 2px;">24.0</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">5</td><td style="border: 1px solid #333; padding: 2px;">36</td><td style="border: 1px solid #333; padding: 2px;">36</td><td style="border: 1px solid #333; padding: 2px;">26.1</td><td style="border: 1px solid #333; padding: 2px;">26.7</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- mCAFT EQUATIONS -->
            <div style="margin-bottom: 16px;">
              <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 12px;">mCAFT (Modified Canadian Aerobic Fitness Test) EQUATIONS TO PREDICT VO2MAX</h5>
              <div style="background: #f0f0f0; padding: 12px; font-size: 10px;">
                <p style="margin-bottom: 8px;">
                  VO2 max (ml/kg/min) = 17.2 + (1.29 × O2 cost of the last completed stage) - (0.09 × mass in kg) - (0.18 × age in years)
                </p>
                <p style="margin-bottom: 8px;">
                  VO2 max (ml/kg/min) = 17.2 + (1.29 × _____) - (0.09 × _____ kg) - (0.18 × _____ )
                </p>
                <p style="font-size: 9px; font-style: italic;">
                  Note: O2 cost is provided in Table 2 on the back of this worksheet.
                </p>
              </div>
            </div>

            <!-- Results fields -->
            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 12px 0;">
              <div>
                <span style="font-weight: bold; font-size: 11px;">Predicted VO2 max: </span>
                <span style="border-bottom: 1px solid #333; padding: 4px 16px; display: inline-block; min-width: 120px; font-size: 11px;">
                  ${test.predictedVo2Max || ""}
                </span>
                <span style="font-size: 10px;"> (ml/kg/min)</span>
              </div>
              <div>
                <span style="font-weight: bold; font-size: 11px;">HBR: </span>
                <span style="border-bottom: 1px solid #333; padding: 4px 16px; display: inline-block; min-width: 120px; font-size: 11px;">
                  ${test.hbr || ""}
                </span>
              </div>
            </div>

            <!-- Client Images Section -->
            ${
              test.serializedImages && test.serializedImages.length > 0
                ? `
              <div style="margin-top: 16px;">
                <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 11px;">CLIENT IMAGES:</h5>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                  ${test.serializedImages
                    .map(
                      (img: any, idx: number) => `
                    <div style="border: 1px solid #333; padding: 4px; background: white; text-align: center; width: 80px;">
                      <img src="${img.data}" alt="${img.name || `mCAFT Image ${idx + 1}`}" style="width: 80px; height: 60px; object-fit: contain;" />
                      ${img.name ? `<p style="font-size: 8px; margin: 4px 0 0 0; text-overflow: ellipsis; overflow: hidden;">${img.name}</p>` : ""}
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
          </div>
        `;
      } else if (testNameLower.includes("kasch")) {
        return `
          <!-- KASCH Step Test Details -->
          <div style="space-y: 16px;">
            <p style="font-size: 10px; margin-bottom: 16px; text-align: justify; text-justify: inter-word;">
              The KASCH step test, officially the Kasch Pulse Recovery Test (KPR Test), is a 3-minute step test
              used to assess cardiorespiratory fitness. The test involves stepping onto a 0.305-meter (12-inch)
              step at a rate of 24 steps per minute for three minutes, followed by immediately sitting and
              measuring heart rate recovery for one minute to determine fitness levels.
            </p>

            <!-- How the Test Works -->
            <div style="margin-bottom: 8px;">
              <h5 style="font-weight: bold; margin-bottom: 2px; font-size: 11px;">How the Kasch Pulse Recovery Test (KPR Test) Works</h5>
              <ol style="font-size: 9px; list-style-type: decimal; margin-left: 20px; line-height: 1.4;">
                <li style="margin-bottom: 4px;">
                  <strong>Preparation:</strong> Participants are fitted with a heart rate monitor and rest until a steady-state heart rate is achieved.
                </li>
                <li style="margin-bottom: 4px;">
                  <strong>The Step:</strong> The participant steps up and down on a 12-inch step for a total of three minutes, performing a full step (up, up, down, down) at a rate of 24 steps per minute. A metronome is used to maintain the correct cadence.
                </li>
                <li style="margin-bottom: 4px;">
                  <strong>Heart Rate Recovery:</strong> Immediately after the three minutes of stepping, the participant sits down in a chair.
                </li>
                <li style="margin-bottom: 4px;">
                  <strong>Measurement:</strong> Heart rate is monitored and recorded for one minute following the cessation of stepping. A faster heart rate recovery indicates better cardiorespiratory fitness.
                </li>
              </ol>
            </div>

            <p style="font-size: 9px; margin-bottom: 16px; text-align: justify; text-justify: inter-word;">
              The Kasch Step Test does not directly provide classification types itself; rather, classification is based on a participant's heart rate recovery after a standardized step exercise, which is then compared to age-based reference standards to categorize their cardiorespiratory fitness.
            </p>

            <!-- Classification and Aerobic Fitness Score Results -->
            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 12px 0;">
              <div>
                <span style="font-weight: bold; font-size: 11px;">CLASSIFICATION: </span>
                <span style="border-bottom: 1px solid #333; padding: 4px 16px; display: inline-block; min-width: 120px; font-size: 11px;">
                  ${test.classification || ""}
                </span>
              </div>
              <div>
                <span style="font-weight: bold; font-size: 11px;">AEROBIC FITNESS SCORE: </span>
                <span style="border-bottom: 1px solid #333; padding: 4px 16px; display: inline-block; min-width: 120px; font-size: 11px;">
                  ${test.aerobicFitnessScore || ""}
                </span>
              </div>
            </div>

            <!-- Ratings Tables -->
            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
              <div style="flex: 1; min-width: 300px;">
                <h6 style="font-size: 9px; font-weight: bold; text-align: center; margin-bottom: 4px;">
                  Ratings for Women, Based on Age
                </h6>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; font-size: 7px; table-layout: auto;">
                  <thead>
                    <tr style="background: #f0f0f0;">
                      <th style="border: 1px solid #333; padding: 2px;"></th>
                      <th style="border: 1px solid #333; padding: 2px;">18-25</th>
                      <th style="border: 1px solid #333; padding: 2px;">26-35</th>
                      <th style="border: 1px solid #333; padding: 2px;">36-45</th>
                      <th style="border: 1px solid #333; padding: 2px;">46-55</th>
                      <th style="border: 1px solid #333; padding: 2px;">56-65</th>
                      <th style="border: 1px solid #333; padding: 2px;">65+</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Excellent</td><td style="border: 1px solid #333; padding: 2px;">52-81</td><td style="border: 1px solid #333; padding: 2px;">58-80</td><td style="border: 1px solid #333; padding: 2px;">63-91</td><td style="border: 1px solid #333; padding: 2px;">60-92</td><td style="border: 1px solid #333; padding: 2px;">70-92</td><td style="border: 1px solid #333; padding: 2px;">73-86</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Good</td><td style="border: 1px solid #333; padding: 2px;">85-93</td><td style="border: 1px solid #333; padding: 2px;">85-92</td><td style="border: 1px solid #333; padding: 2px;">89-96</td><td style="border: 1px solid #333; padding: 2px;">95-101</td><td style="border: 1px solid #333; padding: 2px;">97-103</td><td style="border: 1px solid #333; padding: 2px;">96-101</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Above Average</td><td style="border: 1px solid #333; padding: 2px;">96-102</td><td style="border: 1px solid #333; padding: 2px;">96-101</td><td style="border: 1px solid #333; padding: 2px;">100-104</td><td style="border: 1px solid #333; padding: 2px;">106-111</td><td style="border: 1px solid #333; padding: 2px;">104-111</td><td style="border: 1px solid #333; padding: 2px;">103-115</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Average</td><td style="border: 1px solid #333; padding: 2px;">104-110</td><td style="border: 1px solid #333; padding: 2px;">104-110</td><td style="border: 1px solid #333; padding: 2px;">107-112</td><td style="border: 1px solid #333; padding: 2px;">113-118</td><td style="border: 1px solid #333; padding: 2px;">113-118</td><td style="border: 1px solid #333; padding: 2px;">116-121</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Below Average</td><td style="border: 1px solid #333; padding: 2px;">113-120</td><td style="border: 1px solid #333; padding: 2px;">113-119</td><td style="border: 1px solid #333; padding: 2px;">115-120</td><td style="border: 1px solid #333; padding: 2px;">120-124</td><td style="border: 1px solid #333; padding: 2px;">119-127</td><td style="border: 1px solid #333; padding: 2px;">123-126</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Poor</td><td style="border: 1px solid #333; padding: 2px;">122-131</td><td style="border: 1px solid #333; padding: 2px;">122-129</td><td style="border: 1px solid #333; padding: 2px;">124-132</td><td style="border: 1px solid #333; padding: 2px;">126-132</td><td style="border: 1px solid #333; padding: 2px;">129-135</td><td style="border: 1px solid #333; padding: 2px;">128-133</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Very Poor</td><td style="border: 1px solid #333; padding: 2px;">135+</td><td style="border: 1px solid #333; padding: 2px;">132+</td><td style="border: 1px solid #333; padding: 2px;">137+</td><td style="border: 1px solid #333; padding: 2px;">137+</td><td style="border: 1px solid #333; padding: 2px;">141+</td><td style="border: 1px solid #333; padding: 2px;">139+</td></tr>
                  </tbody>
                </table>
              </div>

              <div style="flex: 1; min-width: 300px;">
                <h6 style="font-size: 9px; font-weight: bold; text-align: center; margin-bottom: 4px;">
                  Ratings for Men, Based on Age
                </h6>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; font-size: 7px; table-layout: auto;">
                  <thead>
                    <tr style="background: #f0f0f0;">
                      <th style="border: 1px solid #333; padding: 2px;"></th>
                      <th style="border: 1px solid #333; padding: 2px;">18-25</th>
                      <th style="border: 1px solid #333; padding: 2px;">26-35</th>
                      <th style="border: 1px solid #333; padding: 2px;">36-45</th>
                      <th style="border: 1px solid #333; padding: 2px;">46-55</th>
                      <th style="border: 1px solid #333; padding: 2px;">56-65</th>
                      <th style="border: 1px solid #333; padding: 2px;">65+</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Excellent</td><td style="border: 1px solid #333; padding: 2px;">50-76</td><td style="border: 1px solid #333; padding: 2px;">51-76</td><td style="border: 1px solid #333; padding: 2px;">49-76</td><td style="border: 1px solid #333; padding: 2px;">56-82</td><td style="border: 1px solid #333; padding: 2px;">60-77</td><td style="border: 1px solid #333; padding: 2px;">59-81</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Good</td><td style="border: 1px solid #333; padding: 2px;">79-89</td><td style="border: 1px solid #333; padding: 2px;">79-85</td><td style="border: 1px solid #333; padding: 2px;">80-88</td><td style="border: 1px solid #333; padding: 2px;">87-94</td><td style="border: 1px solid #333; padding: 2px;">86-94</td><td style="border: 1px solid #333; padding: 2px;">87-92</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Above Average</td><td style="border: 1px solid #333; padding: 2px;">88-93</td><td style="border: 1px solid #333; padding: 2px;">88-94</td><td style="border: 1px solid #333; padding: 2px;">92-96</td><td style="border: 1px solid #333; padding: 2px;">97-100</td><td style="border: 1px solid #333; padding: 2px;">97-100</td><td style="border: 1px solid #333; padding: 2px;">94-102</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Average</td><td style="border: 1px solid #333; padding: 2px;">95-100</td><td style="border: 1px solid #333; padding: 2px;">96-102</td><td style="border: 1px solid #333; padding: 2px;">98-105</td><td style="border: 1px solid #333; padding: 2px;">103-111</td><td style="border: 1px solid #333; padding: 2px;">103-109</td><td style="border: 1px solid #333; padding: 2px;">104-113</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Below Average</td><td style="border: 1px solid #333; padding: 2px;">102-107</td><td style="border: 1px solid #333; padding: 2px;">104-110</td><td style="border: 1px solid #333; padding: 2px;">108-113</td><td style="border: 1px solid #333; padding: 2px;">113-119</td><td style="border: 1px solid #333; padding: 2px;">111-119</td><td style="border: 1px solid #333; padding: 2px;">116-124</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Poor</td><td style="border: 1px solid #333; padding: 2px;">111-119</td><td style="border: 1px solid #333; padding: 2px;">114-121</td><td style="border: 1px solid #333; padding: 2px;">116-124</td><td style="border: 1px solid #333; padding: 2px;">121-126</td><td style="border: 1px solid #333; padding: 2px;">122-128</td><td style="border: 1px solid #333; padding: 2px;">126-132</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Very Poor</td><td style="border: 1px solid #333; padding: 2px;">124+</td><td style="border: 1px solid #333; padding: 2px;">126+</td><td style="border: 1px solid #333; padding: 2px;">128+</td><td style="border: 1px solid #333; padding: 2px;">131+</td><td style="border: 1px solid #333; padding: 2px;">131+</td><td style="border: 1px solid #333; padding: 2px;">137+</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Client Images Section -->
            ${
              test.serializedImages && test.serializedImages.length > 0
                ? `
              <div style="margin-top: 16px;">
                <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 11px;">CLIENT IMAGES:</h5>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                  ${test.serializedImages
                    .map(
                      (img: any, idx: number) => `
                    <div style="border: 1px solid #333; padding: 4px; background: white; text-align: center; width: 80px;">
                      <img src="${img.data}" alt="${img.name || `Kasch Image ${idx + 1}`}" style="width: 80px; height: 60px; object-fit: contain;" />
                      ${img.name ? `<p style="font-size: 8px; margin: 4px 0 0 0; text-overflow: ellipsis; overflow: hidden;">${img.name}</p>` : ""}
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
          </div>
        `;
      } else if (
        testNameLower.includes("ymca") &&
        testNameLower.includes("step")
      ) {
        return `
          <!-- YMCA 3-Minute Step Test Details -->
          <div style="space-y: 16px;">
            <p style="font-size: 10px; margin-bottom: 16px; text-align: justify; text-justify: inter-word;">
              The YMCA 3-Minute Step Test is a submaximal aerobic fitness test used to assess cardiorespiratory fitness. The test involves stepping onto a 12-inch step at a rate of 96 beats per minute (managed by a metronome) for 3 minutes, with heart rate recovery measured immediately after exercise.
            </p>

            <!-- Ratings Tables -->
            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
              <div style="flex: 1; min-width: 300px;">
                <h6 style="font-size: 9px; font-weight: bold; text-align: center; margin-bottom: 4px;">
                  Ratings for Women, Based on Age
                </h6>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; font-size: 7px; table-layout: auto;">
                  <thead>
                    <tr style="background: #f0f0f0;">
                      <th style="border: 1px solid #333; padding: 2px;"></th>
                      <th style="border: 1px solid #333; padding: 2px;">18-25</th>
                      <th style="border: 1px solid #333; padding: 2px;">26-35</th>
                      <th style="border: 1px solid #333; padding: 2px;">36-45</th>
                      <th style="border: 1px solid #333; padding: 2px;">46-55</th>
                      <th style="border: 1px solid #333; padding: 2px;">56-65</th>
                      <th style="border: 1px solid #333; padding: 2px;">≥65</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Excellent</td><td style="border: 1px solid #333; padding: 2px;">52-81</td><td style="border: 1px solid #333; padding: 2px;">58-80</td><td style="border: 1px solid #333; padding: 2px;">51-84</td><td style="border: 1px solid #333; padding: 2px;">63-91</td><td style="border: 1px solid #333; padding: 2px;">60-92</td><td style="border: 1px solid #333; padding: 2px;">70-92</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Good</td><td style="border: 1px solid #333; padding: 2px;">85-93</td><td style="border: 1px solid #333; padding: 2px;">85-92</td><td style="border: 1px solid #333; padding: 2px;">89-96</td><td style="border: 1px solid #333; padding: 2px;">95-101</td><td style="border: 1px solid #333; padding: 2px;">97-103</td><td style="border: 1px solid #333; padding: 2px;">96-101</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Above Average</td><td style="border: 1px solid #333; padding: 2px;">96-102</td><td style="border: 1px solid #333; padding: 2px;">95-101</td><td style="border: 1px solid #333; padding: 2px;">100-104</td><td style="border: 1px solid #333; padding: 2px;">104-110</td><td style="border: 1px solid #333; padding: 2px;">106-111</td><td style="border: 1px solid #333; padding: 2px;">104-111</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Average</td><td style="border: 1px solid #333; padding: 2px;">104-110</td><td style="border: 1px solid #333; padding: 2px;">104-110</td><td style="border: 1px solid #333; padding: 2px;">107-112</td><td style="border: 1px solid #333; padding: 2px;">113-118</td><td style="border: 1px solid #333; padding: 2px;">113-118</td><td style="border: 1px solid #333; padding: 2px;">116-121</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Below Average</td><td style="border: 1px solid #333; padding: 2px;">113-120</td><td style="border: 1px solid #333; padding: 2px;">113-119</td><td style="border: 1px solid #333; padding: 2px;">115-120</td><td style="border: 1px solid #333; padding: 2px;">120-124</td><td style="border: 1px solid #333; padding: 2px;">119-127</td><td style="border: 1px solid #333; padding: 2px;">123-126</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Poor</td><td style="border: 1px solid #333; padding: 2px;">122-131</td><td style="border: 1px solid #333; padding: 2px;">122-129</td><td style="border: 1px solid #333; padding: 2px;">124-132</td><td style="border: 1px solid #333; padding: 2px;">126-132</td><td style="border: 1px solid #333; padding: 2px;">129-135</td><td style="border: 1px solid #333; padding: 2px;">128-133</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Very Poor</td><td style="border: 1px solid #333; padding: 2px;">135-169</td><td style="border: 1px solid #333; padding: 2px;">134-171</td><td style="border: 1px solid #333; padding: 2px;">137-169</td><td style="border: 1px solid #333; padding: 2px;">137-171</td><td style="border: 1px solid #333; padding: 2px;">141-174</td><td style="border: 1px solid #333; padding: 2px;">135-155</td></tr>
                  </tbody>
                </table>
              </div>

              <div style="flex: 1; min-width: 300px;">
                <h6 style="font-size: 9px; font-weight: bold; text-align: center; margin-bottom: 4px;">
                  Ratings for Men, Based on Age
                </h6>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; font-size: 7px; table-layout: auto;">
                  <thead>
                    <tr style="background: #f0f0f0;">
                      <th style="border: 1px solid #333; padding: 2px;"></th>
                      <th style="border: 1px solid #333; padding: 2px;">18-25</th>
                      <th style="border: 1px solid #333; padding: 2px;">26-35</th>
                      <th style="border: 1px solid #333; padding: 2px;">36-45</th>
                      <th style="border: 1px solid #333; padding: 2px;">46-55</th>
                      <th style="border: 1px solid #333; padding: 2px;">56-65</th>
                      <th style="border: 1px solid #333; padding: 2px;">≥65</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Excellent</td><td style="border: 1px solid #333; padding: 2px;">50-76</td><td style="border: 1px solid #333; padding: 2px;">51-76</td><td style="border: 1px solid #333; padding: 2px;">49-76</td><td style="border: 1px solid #333; padding: 2px;">56-82</td><td style="border: 1px solid #333; padding: 2px;">60-77</td><td style="border: 1px solid #333; padding: 2px;">59-81</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Good</td><td style="border: 1px solid #333; padding: 2px;">79-84</td><td style="border: 1px solid #333; padding: 2px;">79-85</td><td style="border: 1px solid #333; padding: 2px;">80-88</td><td style="border: 1px solid #333; padding: 2px;">87-93</td><td style="border: 1px solid #333; padding: 2px;">86-94</td><td style="border: 1px solid #333; padding: 2px;">87-92</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Above Average</td><td style="border: 1px solid #333; padding: 2px;">88-93</td><td style="border: 1px solid #333; padding: 2px;">88-94</td><td style="border: 1px solid #333; padding: 2px;">92-98</td><td style="border: 1px solid #333; padding: 2px;">95-101</td><td style="border: 1px solid #333; padding: 2px;">97-100</td><td style="border: 1px solid #333; padding: 2px;">94-102</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Average</td><td style="border: 1px solid #333; padding: 2px;">95-100</td><td style="border: 1px solid #333; padding: 2px;">96-102</td><td style="border: 1px solid #333; padding: 2px;">100-105</td><td style="border: 1px solid #333; padding: 2px;">103-111</td><td style="border: 1px solid #333; padding: 2px;">103-109</td><td style="border: 1px solid #333; padding: 2px;">104-110</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Below Average</td><td style="border: 1px solid #333; padding: 2px;">102-107</td><td style="border: 1px solid #333; padding: 2px;">104-110</td><td style="border: 1px solid #333; padding: 2px;">108-113</td><td style="border: 1px solid #333; padding: 2px;">113-119</td><td style="border: 1px solid #333; padding: 2px;">111-117</td><td style="border: 1px solid #333; padding: 2px;">114-118</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Poor</td><td style="border: 1px solid #333; padding: 2px;">111-119</td><td style="border: 1px solid #333; padding: 2px;">114-121</td><td style="border: 1px solid #333; padding: 2px;">116-124</td><td style="border: 1px solid #333; padding: 2px;">121-126</td><td style="border: 1px solid #333; padding: 2px;">119-128</td><td style="border: 1px solid #333; padding: 2px;">121-126</td></tr>
                    <tr><td style="border: 1px solid #333; padding: 2px;">Very Poor</td><td style="border: 1px solid #333; padding: 2px;">124-157</td><td style="border: 1px solid #333; padding: 2px;">126-161</td><td style="border: 1px solid #333; padding: 2px;">130-163</td><td style="border: 1px solid #333; padding: 2px;">131-159</td><td style="border: 1px solid #333; padding: 2px;">131-154</td><td style="border: 1px solid #333; padding: 2px;">130-151</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Client Rating Results -->
            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 12px 0;">
              <div>
                <span style="font-weight: bold; font-size: 11px;">Client Rating Based on Test Completion: </span>
                <span style="border-bottom: 1px solid #333; padding: 4px 16px; display: inline-block; min-width: 150px; font-size: 11px;">
                  ${test.clientRating || ""}
                </span>
              </div>
            </div>

            <!-- References Section -->
            <div style="margin-top: 12px; border: 1px solid #ccc; padding: 8px; background-color: #f9f9f9;">
              <h5 style="font-weight: bold; margin-bottom: 4px; font-size: 10px;">References:</h5>
              <ol style="font-size: 8px; margin: 0; padding-left: 16px; line-height: 1.3;">
                <li style="margin-bottom: 4px;">· The Validity of the YMCA 3-Minute Step Test for Estimating Maximal Oxygen Uptake in Healthy Korean and Vietnamese Adults: Nguyen Thi Van Kieu 1,6,7, Su-Jin Jung 1,2, Sang-Wook Shin 3, Han-Wool Jung 2, Eun-Soo Jung 1, Yu Hui Won 4, Young-Gon Kim 1,2,5,*, Soo-Wan Chae 1,2,6,* PMCID: PMC7171059 PMID: 32328445</li>
                <li>· Variable Height Step Test Provides Reliable Heart Rate Values During Virtual Cardiorespiratory Fitness Testing Evan L. Matthews,Fiona M. Horvat &amp;David A. Phillips Pages 155-164 | Published online: 08 Aug 2021 Cite this article https://doi.org/10.1080/1091367X.2021.1964507</li>
              </ol>
            </div>

            <!-- Client Images Section -->
            ${
              test.serializedImages && test.serializedImages.length > 0
                ? `
              <div style="margin-top: 16px;">
                <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 11px;">CLIENT IMAGES:</h5>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                  ${test.serializedImages
                    .map(
                      (img: any, idx: number) => `
                    <div style="border: 1px solid #333; padding: 4px; background: white; text-align: center; width: 80px;">
                      <img src="${img.data}" alt="${img.name || `YMCA Step Test Image ${idx + 1}`}" style="width: 80px; height: 60px; object-fit: contain;" />
                      ${img.name ? `<p style="font-size: 8px; margin: 4px 0 0 0; text-overflow: ellipsis; overflow: hidden;">${img.name}</p>` : ""}
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
          </div>
        `;
      } else if (
        testNameLower.includes("ymca") &&
        testNameLower.includes("submaximal")
      ) {
        return `
          <!-- YMCA Submaximal Treadmill Test Details -->
          <div style="space-y: 16px;">
            <p style="font-size: 10px; margin-bottom: 16px; text-align: justify; text-justify: inter-word;">
              The YMCA Submaximal Treadmill Test is a single-stage protocol used to assess cardiovascular fitness. This test involves a warm-up followed by a single, four-minute testing stage intended to elicit a steady-state heart rate between 50% and 70% of age-predicted maximum heart rate. The test is submaximal, meaning it does not push the individual to maximum effort, making it safer for certain populations.
            </p>

            <!-- Test Results -->
            <div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 12px 0;">
              <div>
                <span style="font-weight: bold; font-size: 11px;">VO2 Max: </span>
                <span style="border-bottom: 1px solid #333; padding: 4px 16px; display: inline-block; min-width: 120px; font-size: 11px;">
                  ${test.vo2Max || ""}
                </span>
                <span style="font-size: 10px;"> (mL·kg⁻¹·min⁻¹)</span>
              </div>
            </div>

            <!-- References Section -->
            <div style="margin-top: 12px; border: 1px solid #ccc; padding: 8px; background-color: #f9f9f9;">
              <h5 style="font-weight: bold; margin-bottom: 4px; font-size: 10px;">Reference:</h5>
              <p style="font-size: 8px; margin: 0; line-height: 1.3;">Submaximal Treadmill Exercise Test to Predict VO2max in Fit Adults: April 2007 Measurement in Physical Education and Exercise Science 11(2):61-72, DOI:10.1080/10913670701294047 Authors: P. R. Vehrs Brigham Young University, James D. George, Gilbert W Fellingham Brigham Young University, Sharon Plowman Northern Illinois University</p>
            </div>

            <!-- Client Images Section -->
            ${
              test.serializedImages && test.serializedImages.length > 0
                ? `
              <div style="margin-top: 16px;">
                <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 11px;">CLIENT IMAGES:</h5>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                  ${test.serializedImages
                    .map(
                      (img: any, idx: number) => `
                    <div style="border: 1px solid #333; padding: 4px; background: white; text-align: center; width: 80px;">
                      <img src="${img.data}" alt="${img.name || `YMCA Treadmill Test Image ${idx + 1}`}" style="width: 80px; height: 60px; object-fit: contain;" />
                      ${img.name ? `<p style="font-size: 8px; margin: 4px 0 0 0; text-overflow: ellipsis; overflow: hidden;">${img.name}</p>` : ""}
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
          </div>
        `;
      }

      return "";
    };

    // Helper function to generate individual MTM test sections
    const generateMTMTestSection = (
      testName: string,
      testData: any,
      trials: any[],
      correspondingTest: any,
    ) => {
      const formatParam = (p: any) => {
        if (p && typeof p === "object" && p.value !== undefined) {
          return `${p.value}${p.unit ? " " + p.unit : ""}`;
        }
        return p ?? "";
      };

      const getTrialTime = (trial: any): number => {
        if (!trial) return 0;
        if (typeof trial.testTime === "number")
          return Number(trial.testTime) || 0;
        if (typeof trial.time === "number") return Number(trial.time) || 0;
        if (trial.time && typeof trial.time === "object") {
          const v = trial.time.value;
          return typeof v === "number" ? v : Number(v) || 0;
        }
        return 0;
      };

      const computeTotalCompleted = (trial: any) => {
        if (!trial) return "0.0";
        if (trial.totalCompleted !== undefined && trial.totalCompleted !== null)
          return (Number(trial.totalCompleted) || 0).toFixed(1);
        const tt = getTrialTime(trial);
        const p = Number(trial.percentIS || 0);
        if (tt > 0 && p > 0) return (tt * (p / 100)).toFixed(1);
        return (tt || 0).toFixed(1);
      };

      return `
        <!-- MTM Test Table for ${testName} -->
        <div style="margin-bottom: 15px; border: 1px solid #333; padding: 8px; background-color: #ffffff;">
            <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 8px;">
                <!-- Header row with test name and date -->
                <thead>
                    <tr>
                        <th colspan="8" style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px; text-align: center; background: white; font-weight: bold;">
                            ${testName} - ${new Date(testData.completedAt || Date.now()).toLocaleDateString()} ${new Date(testData.completedAt || Date.now()).toLocaleTimeString()}
                        </th>
                    </tr>
                    <tr style="background: #fbbf24;">
                        <th style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">Trial:</th>
                        <th style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">Side:</th>
                        <th style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">Weight/Plane:</th>
                        <th style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">Distance/Posture:</th>
                        <th style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">Reps:</th>
                        <th style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">Time (sec)</th>
                        <th style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">%IS</th>
                        <th style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">Time Set Completed</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      trials.length > 0
                        ? trials
                            .map((trial: any, trialIndex: number) => {
                              return `
                        <tr>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${trial.trial || trialIndex + 1}</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${trial.side || "Both"}</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${formatParam(trial.weight) || trial.plane || "Immediate"}</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${formatParam(trial.distance) || trial.position || "Standing"}</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${trial.reps || 1}</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${getTrialTime(trial).toFixed(1)}</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${(trial.percentIS || 0).toFixed(1)}</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;"></td>
                        </tr>
                      `;
                            })
                            .join("")
                        : `
                        <tr>
                            <td colspan="8" style="border: 1px solid #333; padding: 8px; text-align: center; font-size: 8px;">
                                No trial data available for ${testName}
                            </td>
                        </tr>
                    `
                    }
                    ${
                      trials.length > 0
                        ? `
                        <!-- Average row -->
                        <tr style="background: #f3f4f6;">
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-weight: bold; font-size: 8px;">Avg.</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;"></td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;"></td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;"></td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${trials.length > 0 ? (trials.reduce((sum: number, t: any) => sum + (t.reps || 0), 0) / trials.length).toFixed(0) : "0"}</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${trials.length > 0 ? (trials.reduce((sum: number, t: any) => sum + getTrialTime(t), 0) / trials.length).toFixed(2) : "0.00"}</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${trials.length > 0 ? (trials.reduce((sum: number, t: any) => sum + (t.percentIS || 0), 0) / trials.length).toFixed(2) : "0.00"}</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;">${trials.length > 0 ? trials.reduce((sum: number, t: any) => sum + getTrialTime(t), 0).toFixed(1) : "0.0"}</td>
                        </tr>
                        ${
                          trials.length > 0
                            ? `
                        <tr style="background: #dbeafe; border-top: 2px solid #3b82f6;">
                            <td style="border: 1px solid #333; padding: 4px; text-align: left; font-weight: 600; color: #1e40af; font-size: 8px;">Total IS%</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;"></td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;"></td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;"></td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;"></td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;"></td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-weight: bold; color: #1e40af; font-size: 8px;">${(trials.reduce((sum: number, t: any) => sum + (t.percentIS || 0), 0) / trials.length).toFixed(1)}%</td>
                            <td style="border: 1px solid #333; padding: 4px; text-align: center; font-size: 8px;"></td>
                        </tr>`
                            : ``
                        }
                    `
                        : ""
                    }
                </tbody>
            </table>

            <!-- Heart Rate Data if available -->
            ${
              testData.hrPre || testData.hrPost
                ? `
                <div style="font-size: 11px; color: #374151; margin-bottom: 2px;">
                    <strong>Heart Rate:</strong>
                    ${testData.hrPre ? ` Pre: ${testData.hrPre} bpm` : ""}
                    ${testData.hrPost ? ` Post: ${testData.hrPost} bpm` : ""}
                </div>
            `
                : ""
            }

            <!-- MTM Test Images if available -->
            ${
              testData.savedImageData && testData.savedImageData.length > 0
                ? `
                <div style="margin-top: 12px; page-break-inside: avoid;">
                    <h6 style="font-size: 10px; font-weight: bold; margin-bottom: 8px; color: #374151;">Test Images:</h6>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px;">
                        ${testData.savedImageData
                          .map(
                            (image: any, imageIndex: number) => `
                            <div style="text-align: center;">
                                <img src="${image.dataUrl || image.data}"
                                     alt="${image.name || `${testName} test image ${imageIndex + 1}`}"
                                     style="width: 100%; height: 60px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px;" />
                                <p style="font-size: 8px; color: #6b7280; margin: 2px 0 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${image.name || `Test Image ${imageIndex + 1}`}
                                </p>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px; margin-top: 6px;">
                        <p style="font-size: 8px; color: #1e40af; margin: 0;">
                            <strong>Note:</strong> The above images provide visual documentation of the ${testName} test procedures and results.
                        </p>
                    </div>
                </div>
                `
                : ""
            }

            ${
              correspondingTest?.comments
                ? `<p style="font-style: italic; font-size: 11px; margin-top: 16px;"><strong>Comments:</strong> ${correspondingTest.comments}</p>`
                : ""
            }
        </div>
      `;
    };

    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const calculateAge = (birthDate: string): number => {
      if (!birthDate) return 0;
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }
      return age;
    };

    const getPhysicalDemandLevel = (activities: any[]): string => {
      if (!activities || activities.length === 0) return "Medium";
      const avgRating =
        activities.reduce((sum, activity) => sum + activity.rating, 0) /
        activities.length;
      if (avgRating >= 8) return "Heavy";
      if (avgRating >= 6) return "Medium";
      if (avgRating >= 4) return "Light";
      return "Sedentary";
    };

    // Create comprehensive HTML content for PDF generation matching ReviewReport exactly
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Functional Capacity Evaluation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #000; font-size: 12px; text-align: justify; text-justify: inter-word; }
        .header { text-align: center; border-bottom: 3px solid #4472C4; padding-bottom: 20px; margin-bottom: 30px; }
        .company-logo { max-width: 150px; max-height: 80px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto; }
        .logo { color: #4472C4; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .title { font-size: 18px; font-weight: bold; color: #4472C4; margin: 20px 0; font-family: Arial, sans-serif; }
        .info-box { background: #f3f4f6; border: 1px solid #d1d5db; padding: 15px; margin: 20px 0; page-break-inside: avoid; }
        .yellow-header { background: #FFF2CC; border: 1px solid #D4AA00; padding: 1px; font-weight: bold; margin-bottom: 15px; page-break-inside: avoid; color: #000; }
        .section { margin: 25px 0; page-break-inside: avoid; }
        .section-title { font-size: 14px; font-weight: bold; color: #4472C4; border-bottom: 1px solid #4472C4; padding-bottom: 5px; margin-bottom: 15px; page-break-after: avoid; font-family: Arial, sans-serif; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
        .grid-3 { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; margin: 15px 0; }
        .data-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10px; page-break-inside: avoid; font-family: Arial, sans-serif; }
        .data-table th, .data-table td { border: 1px solid #333; padding: 4px 6px; text-align: left; vertical-align: top; font-family: Arial, sans-serif; }
        .no-border-table {
            border: none !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            outline: none !important;
            box-shadow: none !important;
        }
        .no-border-table tr {
            border: none !important;
            border-top: none !important;
            border-bottom: none !important;
            border-left: none !important;
            border-right: none !important;
            outline: none !important;
            box-shadow: none !important;
        }
        .no-border-table td {
            border: none !important;
            border-top: none !important;
            border-bottom: none !important;
            border-left: none !important;
            border-right: none !important;
            outline: none !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        .data-table th { background: #FFF2CC; font-weight: bold; color: #000; font-family: Arial, sans-serif; }
        .highlighted { background: #dbeafe; }
        .test-result-table { font-size: 9px; page-break-inside: avoid; font-family: Arial, sans-serif; }
        .test-result-table th, .test-result-table td { padding: 3px 4px; font-family: Arial, sans-serif; }
        .claimant-photo { width: 120px; height: 150px; border: 1px solid #ccc; object-fit: cover; margin-right: 15px; }
        .graph-container { background: #f9f9f9; border: 1px solid #ccc; padding: 10px; margin: 10px 0; text-align: center; min-height: 200px; display: flex; align-items: center; justify-content: center; page-break-inside: avoid; }
        .signature-line { border-top: 1px solid #333; width: 250px; margin-top: 40px; padding-top: 5px; }
        .footer { text-align: center; color: #6b7280; font-size: 10px; margin-top: 40px; border-top: 2px solid #4472C4; padding-top: 15px; }
        .page-break { page-break-before: always; }
        .digital-library-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; page-break-inside: avoid; }
        .digital-library-item { width: 100%; height: 150px; border: 1px solid #ccc; object-fit: cover; display: block; }
        .pain-legend { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; font-size: 10px; page-break-inside: avoid; }
        .anatomical-views { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; page-break-inside: avoid; }
        .anatomical-view { text-align: center; border: 2px solid #333; padding: 10px; background: #f9f9f9; page-break-inside: avoid; }
        .anatomical-svg { width: 100%; height: 200px; border: 1px solid #ccc; background: #f0f0f0; }
        .test-chart-container { page-break-inside: avoid; margin: 20px 0; }
        .test-graph { width: 100%; height: 250px; margin: 15px 0; border: 1px solid #ddd; background: #fff; position: relative; page-break-inside: avoid; }
        .image-container { page-break-inside: avoid; text-align: center; margin: 10px 0; }
        .report-image { max-width: 100%; height: auto; display: block; margin: 0 auto; border: 1px solid #ccc; }
        .activity-chart { page-break-inside: avoid; margin: 20px 0; }
        .referral-section { page-break-inside: avoid; margin: 30px 0; }
        .test-details { page-break-inside: avoid; margin: 30px 0; }
        .conclusions-section { page-break-inside: avoid; margin: 30px 0; }

        /* Improved page break controls for test sections */
        .test-section {
            page-break-inside: auto;
            margin: 20px 0;
            min-height: auto;
        }
        .test-section:first-of-type {
            page-break-before: always;
        }
        /* Reduce spacing for pinch tests specifically */
        .test-section.pinch-test {
            margin: 15px 0;
            padding: 20px 0 !important;
        }
        .test-header {
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        .test-results-container {
            page-break-inside: avoid;
        }
        .test-chart {
            page-break-inside: avoid;
            page-break-before: auto;
        }
        .test-comments {
            page-break-before: auto;
            page-break-inside: avoid;
        }
        .test-references {
            page-break-before: auto;
            orphans: 2;
            widows: 2;
        }
        /* Force color printing for all elements */
        * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        @page {
            margin: 0.5in;
            counter-increment: page;
            @top-right {
                content: "Page " counter(page);
                font-size: 10px;
                color: #666 !important;
                font-weight: normal !important;
                margin-top: 5px;
                font-family: Arial, sans-serif;
            }
        }

        /* Hide page numbers for first two pages */
        .cover-page {
            page: cover;
        }

        .toc-page {
            page: toc;
        }

        @page cover {
            @top-right {
                content: "";
            }
        }

        @page toc {
            @top-right {
                content: "";
            }
        }
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            body {
                margin: 0;
                font-size: 11px;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .page-break { page-break-before: always; }
            .no-break, .page-break-inside-avoid { page-break-inside: avoid !important; }
            img { max-width: 100% !important; height: auto !important; display: block !important; }
            table { page-break-inside: avoid !important; }
            .data-table { page-break-inside: avoid !important; }
            .data-table th { background: #FFF2CC !important; color: #000 !important; }
            .test-result-table { page-break-inside: avoid !important; }
            .anatomical-views { page-break-inside: avoid !important; }
            .digital-library-grid { page-break-inside: avoid !important; }
            .pain-legend { background: #FFF2CC !important; }
            .info-box { background: #f3f4f6 !important; }
            .highlighted { background: #dbeafe !important; }
            /* Hide any page numbers, dates, or about:blank references */
            .page-number, .page-date, [href*="about:blank"] { display: none !important; }
            /* Hide browser generated headers/footers and about:blank text */
            @page {
                margin: 0.5in;
                @bottom-left { content: "" !important; }
                @bottom-center { content: "" !important; }
                @bottom-right { content: "" !important; }
                @top-left { content: "" !important; }
                @top-center { content: "" !important; }
            }
            /* Hide any elements containing about:blank text */
            *:contains("about:blank") { display: none !important; }
            *[title*="about:blank"] { display: none !important; }
            *[alt*="about:blank"] { display: none !important; }
            /* Ensure gradients and colors are preserved */
            div[style*="background: linear-gradient"] {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            div[style*="gradient"] {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            /* Hide browser default page numbering */
            @media print {
                @page { margin: 0.5in; }
                body { -webkit-print-color-adjust: exact !important; }
            }
        }
    </style>
</head>
<body>
    <!-- Cover Page -->
<div class="cover-page" style="height: 95vh; display: flex; flex-direction: column; text-align: center; padding: 25px 40px 15px 40px; box-sizing: border-box; max-height: 95vh; overflow: hidden;">

    <!-- Main Content (Vertically Centered Between Top and Footer) -->
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start;
padding-top: 120px; align-items: center; min-height: 0; ">

        <!-- Logo -->
        <div style="margin-bottom: 25px;">
            ${
              evaluatorData.clinicLogo
                ? `<img src="${evaluatorData.clinicLogo}" alt="${
                    evaluatorData.clinicName || "Company Logo"
                  }" style="width: auto; height: auto; max-width: 240px; max-height: 100px; margin: 0 auto; display: block;" />`
                : `<div style="color: #4472C4; font-size: 16px; font-weight: bold; font-style: italic;">${
                    evaluatorData.clinicName || "MedSource"
                  }</div>`
            }
        </div>

        <!-- Title and client Information Container (Vertically Centered Together) -->
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">

            <!-- Title -->
            <div style="text-align: center; margin-bottom: 12px;">
                <h1 style="font-size: 22px; font-weight: bold; color: #4472C4; margin: 0; font-family: Arial, sans-serif;">Functional Abilities Evaluation</h1>
            </div>

            <!-- client Information -->
            <div style="display: flex; justify-content: center; align-items: center;">
                <table class="no-border-table" style="font-size: 12px; line-height: 1.3; border-collapse: collapse; border: none; margin: 0; font-family: Arial, sans-serif;">
                    <tr>
                        <td style="font-weight: bold; text-decoration: underline; padding: 0 10px 0 0; text-align: left; white-space: nowrap; font-family: Arial, sans-serif;">Claimant Name:</td>
                        <td style="text-align: left; padding: 0; font-family: Arial, sans-serif;">${
                          claimantData.firstName || ""
                        } ${claimantData.lastName || ""}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; text-decoration: underline; padding: 0 10px 0 0; text-align: left; white-space: nowrap; font-family: Arial, sans-serif;">Claimant #:</td>
                        <td style="text-align: left; padding: 0; font-family: Arial, sans-serif;">${
                          claimantData.claimantId || reportSummary.reportId
                        }</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; text-decoration: underline; padding: 0 10px 0 0; text-align: left; white-space: nowrap; font-family: Arial, sans-serif;">Date of Evaluation(s):</td>
                        <td style="text-align: left; padding: 0; font-family: Arial, sans-serif;">${currentDate}</td>
                    </tr>
                </table>
            </div>
        </div>
    </div>

    <!-- Footer (Always Stays at Bottom) -->
    <div style="color: #666; text-align: center; padding-top: 15px; padding-bottom: 40px; flex-shrink: 0; margin-top: auto;">
        <p style="font-size: 11px; font-weight: bold; margin-bottom: 6px; letter-spacing: 0.5px; font-family: Arial, sans-serif;">CONFIDENTIAL INFORMATION ENCLOSED</p>
        <div style="font-size: 9px; line-height: 1.2; font-family: Arial, sans-serif;">
            <p style="font-weight: bold; margin-bottom: 1px; font-family: Arial, sans-serif;">${
              evaluatorData.clinicName || "MedSource"
            }</p>
            <p style="margin-bottom: 1px; font-family: Arial, sans-serif;">${
              evaluatorData.address ||
              "1490-5A Quarterpath Road #242, Williamsburg, VA  23185"
            }</p>
            <p style="font-family: Arial, sans-serif;">Phone: ${
              evaluatorData.phone || "757-220-5051"
            } &nbsp;&nbsp; Fax: ${evaluatorData.phone || "757-273-6198"}</p>
        </div>
    </div>
</div>


    <!-- Table of Contents -->
    <div class="toc-page" style="height: 100vh; page-break-before: always; page-break-after: always; display: flex; justify-content: center; align-items: flex-start; padding-top: 120px;">
        <div style="max-width: 600px; position: relative;">
            <!-- Vertical line -->
            <div style="position: absolute; left: -15px; top: -30px; bottom: -30px; width: 2px; background-color: #ccc;"></div>

            <div style="padding-left: 25px;">
                <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 24px; color: #4472C4; font-family: Arial, sans-serif;">Contents of Report:</h2>
                <div style="line-height: 1.6; font-size: 12px; font-family: Arial, sans-serif;">
                    <p style="margin: 4px 0; font-family: Arial, sans-serif;">Client Information</p>
                    <p style="margin: 4px 0; font-family: Arial, sans-serif;">Pain & Symptom Illustration</p>
                  
                    <p style="margin: 4px 0; font-family: Arial, sans-serif;">Referral Questions</p>
                    <p style="margin: 4px 0; font-family: Arial, sans-serif;">Conclusions</p>
                    <p style="margin: 4px 0; font-family: Arial, sans-serif;">Functional Abilities Determination and Job Match Results</p>
                    <div style="margin: 16px 0;">
                        <p style="margin: 8px 0; font-family: Arial, sans-serif;">Test Data:</p>
                        <div style="margin-left: 60px;">
                            <p style="margin: 2px 0; font-family: Arial, sans-serif;">o&nbsp;&nbsp;&nbsp;Activity Overview</p>
                            <p style="margin: 2px 0; font-family: Arial, sans-serif;">o&nbsp;&nbsp;&nbsp;Extremity Strength</p>
                            <p style="margin: 2px 0; font-family: Arial, sans-serif;">o&nbsp;&nbsp;&nbsp;Occupational Tasks</p>
                            <p style="margin: 2px 0; font-family: Arial, sans-serif;">o&nbsp;&nbsp;&nbsp;Range of Motion (Spine)</p>
                        </div>
                    </div>
                    <p style="margin: 8px 0; font-family: Arial, sans-serif;">Appendix One: Reference Charts</p>
                    <p style="margin: 8px 0; font-family: Arial, sans-serif;">Appendix Two: Digital Library</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Client Information Section -->
    <div style="padding: 40px 0 0 0; page-break-before: always; position: relative;">
        <div style="text-align: center; margin-bottom: 24px;">
            ${
              evaluatorData.clinicLogo
                ? `<img src="${evaluatorData.clinicLogo}" alt="${
                    evaluatorData.clinicName || "Company Logo"
                  }" style="width: auto; height: auto; max-width: 240px; max-height: 100px; margin: 0 auto 8px auto; display: block; text-align: center;" />`
                : `<div style="height: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px auto;"><span style="font-size: 12px; font-weight: bold; color: #4472C4;">${
                    evaluatorData.clinicName || "MedSource"
                  }</span></div>`
            }
            <h1 style="font-size: 22px; font-weight: bold; color: #4472C4; margin: 8px 0; font-family: Arial, sans-serif;">Functional Abilities Evaluation</h1>
             <div style="font-size: 9px; line-height: 1.2; font-family: Arial, sans-serif;">
            <p style="font-weight: bold; margin-bottom: 1px; font-family: Arial, sans-serif;">${
              evaluatorData.clinicName || "MedSource"
            }</p>
            <p style="margin-bottom: 1px; font-family: Arial, sans-serif;">${
              evaluatorData.address ||
              "1490-5A Quarterpath Road #242, Williamsburg, VA  23185"
            }</p>
            <p style="font-family: Arial, sans-serif;">Phone: ${
              evaluatorData.phone || "757-220-5051"
            } &nbsp;&nbsp; Fax: ${evaluatorData.phone || "757-273-6198"}</p>
        </div>
        </div>

       <div style="display: grid; grid-template-columns: 128px 1fr; gap: 40px; margin-bottom: 5px; position: relative;">

    <!-- Extended Vertical line -->
    <div style="position: absolute; left: 155px; top: 0; height: 360px; width: 0.5px; background-color: #666; z-index: 1;"></div>

    <!-- Left: Profile Photo + Name -->
    <div style="text-align: center;">
        <!-- Report Date above profile picture -->
        <div style="font-size: 12px; font-family: Arial, sans-serif; margin-bottom: 8px;">
            <strong>Report Date:</strong> ${currentDate || new Date().toLocaleDateString()}
        </div>
        ${
          claimantData.profilePhoto
            ? `<div style="border: 1px solid #333; margin: 0 auto 12px auto; display: inline-block; max-width: 128px; max-height: 160px;">
                <img src="${claimantData.profilePhoto}" alt="${claimantData.firstName} ${claimantData.lastName}" style="width: auto; height: auto; max-width: 128px; max-height: 160px; display: block;" />
            </div>`
            : '<div style="width: 128px; height: 160px; border: 1px solid #333; margin: 0 auto 12px auto; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #666; text-align: center; flex-direction: column;"><div>Claimant Photo</div><div>(If Available)</div></div>'
        }
        <p style="font-weight: bold; font-size: 14px; margin: 8px 0 0 0;">${
          claimantData.firstName || ""
        } ${claimantData.lastName || ""}</p>
    </div>

    <!-- Right: Claimant Info -->
    <div style="margin-left: 25px;">
    <h3 style="font-weight: bold; margin-bottom: 8px; margin-top: 5px; margin-left: -15px; font-family: Arial, sans-serif;color: #4472C4;">Client Information</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; font-family: Arial, sans-serif; line-height: 1.2;">
            <div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Name:</span><span>${claimantData.firstName || ""} ${claimantData.lastName || ""}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Address:</span><span>${claimantData.address || "N/A"}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Home Phone:</span><span>${claimantData.phone || "N/A"}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Work Phone:</span><span>${claimantData.workPhone || "n/a"}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Occupation:</span><span>${claimantData.occupation || "N/A"}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Employer(SIC):</span><span>${claimantData.employer || "N/A"}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Insurance:</span><span>${claimantData.insurance || "N/A"}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Physician:</span><span>${claimantData.referredBy || "N/A"}</span></div>
            </div>
            <div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">ID:</span><span>${claimantData.claimantId || reportSummary.reportId}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">DOB (Age):</span><span>${claimantData.dateOfBirth || "N/A"} (${calculateAge(claimantData.dateOfBirth || "")})</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Gender:</span><span>${claimantData.gender || "N/A"}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Height:</span><span>${claimantData.heightValue || "N/A"} ${claimantData.heightUnit || ""}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Weight:</span><span>${claimantData.weightValue || "N/A"} ${claimantData.weightUnit || ""}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Dominant Hand:</span><span>${claimantData.dominantHand || "N/A"}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Referred By:</span><span>${claimantData.referredBy || "N/A"}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Resting Pulse:</span><span>${claimantData.restingPulse || "Norm"} bpm</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">BP Sitting:</span><span>${claimantData.bpSitting || "N/A"}</span></div>
                <div style="margin: 1px 0; display: flex;"><span style="font-weight: bold; width: 90px;">Tested By:</span><span>${evaluatorData.name || "Licensed Evaluator"}</span></div>
            </div>
        </div>
    </div>
</div>

        <!-- Mechanism and History of Injury (Below Client Information) -->
        <div style="margin-bottom: 8px; margin-left: 193px; margin-top: -15px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; margin-left: -15px; font-family: Arial, sans-serif;color: #4472C4;">Mechanism and History of Injury</h3>

            <!-- Header row -->
            <div style="display: flex; margin-bottom: 4px; font-size: 11px; font-family: Arial, sans-serif;">
                <div style="font-weight: bold; width: 70px;">Date</div>
                <div style="font-weight: bold; flex: 1; margin-left: 10px;">Description</div>
            </div>

            <!-- Data row -->
            <div style="display: flex; font-size: 11px; font-family: Arial, sans-serif; line-height: 1.3;">
                <div style="width: 70px;">04/2011</div>
                <div style="flex: 1; margin-left: 10px;">${
                  claimantData.claimantHistory ||
                  "While working in Cartons assembly area, client noted groin pain and subsequently was diagnosed with a hernia – PT - 4-5 wks – back to work - continued to have pain – lumbar area – cortisone injection (had three injections total) – Sept 10th out of work again – to date no return to duties – last injection was Oct 4th2011."
                }</div>
            </div>
        </div>

    </div>

    <!-- Pain/Symptom Illustration Section -->
    <div style="margin-top: 5px; padding-left: 0;">
    <h3 style="font-weight: bold; margin-bottom: 8px; margin-left: -15px; font-family: Arial, sans-serif;color: #4472C4;">Pain/Symptom Illustration</h3>
    <div style="display: flex; gap: 8px; align-items: start;">
        <div style="padding: 4px; width: 640px; margin-left: 0; float: left;">
            <div style="display: flex; gap: 2px; justify-content: center; align-items: flex-start;">
                ${["front", "back", "right", "left"]
                  .map((view) => {
                    const labelMap = {
                      front: "Anterior View",
                      back: "Posterior View",
                      left: "Right Lateral View",
                      right: "Left Lateral View",
                    };
                    const imageMap = {
                      front: "/humanBody/front_view.png",
                      back: "/humanBody/back_view.png",
                      left: "/humanBody/left_view.png",
                      right: "/humanBody/right_view.png",
                    };
                    const markers =
                      painIllustrationData.markers?.filter(
                        (m) => m.view === view,
                      ) || [];
                    return `
                        <div style="
                            position: relative;
                            width: 150px;
                            height: 220px;
                            margin: 0;
                            display: inline-block;
                            overflow: visible;
                        ">
                            <h5 style="text-align: center; font-weight: bold; margin-bottom: 4px; color: #1e40af; font-family: Arial, sans-serif; font-size: 10px;">
                                ${labelMap[view]}
                            </h5>
                            <div style="position: relative; width: 100%; height: 200px; margin: 0;">
                                <img
                                    src="${imageMap[view]}"
                                    alt="${labelMap[view]}"
                                    style="
                                        width: 100%;
                                        height: 100%;
                                        object-fit: cover;
                                        object-position: center;
                                        pointer-events: none;
                                        background: #f9fafb;
                                        transform: scale(1.2);
                                    "
                                />
                                ${markers
                                  .map((marker) => {
                                    let symbolText = "";
                                    let symbolColor = "#dc2626";
                                    if (marker.type === "primary-concern") {
                                      symbolText = "P1";
                                      symbolColor = "#2563eb";
                                    } else if (
                                      marker.type === "secondary-concern"
                                    ) {
                                      symbolText = "P2";
                                      symbolColor = "#7c3aed";
                                    } else if (marker.type === "dull-ache") {
                                      symbolText = "~";
                                      symbolColor = "#f59e0b";
                                    } else if (marker.type === "shooting") {
                                      symbolText = "/";
                                      symbolColor = "#dc2626";
                                    } else if (marker.type === "burning") {
                                      symbolText = "x";
                                      symbolColor = "#ea580c";
                                    } else if (marker.type === "pins-needles") {
                                      symbolText = "•";
                                      symbolColor = "#7c3aed";
                                    } else if (marker.type === "numbness") {
                                      symbolText = "o";
                                      symbolColor = "#475569";
                                    } else if (marker.type === "temperature") {
                                      symbolText = "T";
                                      symbolColor = "#06b6d4";
                                    } else if (marker.type === "swelling") {
                                      symbolText = "SW";
                                      symbolColor = "#059669";
                                    } else if (marker.type === "scar") {
                                      symbolText = "S";
                                      symbolColor = "#db2777";
                                    } else if (marker.type === "crepitus") {
                                      symbolText = "C";
                                      symbolColor = "#9333ea";
                                    } else {
                                      symbolText = marker.symbol || "P1";
                                    }
                                    const leftPercent = `${marker.x}%`;
                                    const topPercent = `${marker.y}%`;
                                    return `
                                        <div style="
                                            position: absolute;
                                            left: ${leftPercent};
                                            top: ${topPercent};
                                            transform: translate(-50%, -50%);
                                            color: ${symbolColor};
                                            font-size: 12px;
                                            font-weight: bold;
                                            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                                            z-index: 10;
                                            font-family: Arial, sans-serif;
                                            pointer-events: none;
                                        ">
                                            ${symbolText}
                                        </div>
                                    `;
                                  })
                                  .join("")}
                            </div>
                        </div>
                    `;
                  })
                  .join("")}
            </div>


        ${
          painIllustrationData?.savedImageData &&
          painIllustrationData.savedImageData.length > 0
            ? `
    <div style="margin-top: 25px;">
        <div style="font-weight: bold; text-align: center; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 8px; color: #1e40af !important;">
            References
        </div>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;">
            ${painIllustrationData.savedImageData
              .slice(0, 3)
              .map(
                (img) => `
                <div style="display: flex; flex-direction: column; align-items: center; width: 140px; margin-bottom: 15px;">
                    ${img.title ? `<div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; text-align: center; color: #1e40af; font-family: Arial, sans-serif;">${img.title}</div>` : ""}
                    <img src="${img.dataUrl || img.data}"
                         alt="${img.title || "Reference Image"}"
                         style="width: 120px; height: 90px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; background: #fff;" />
                </div>
                `,
              )
              .join("")}
        </div>
    </div>
`
            : ""
        }



        </div>

        <div style="width: 140px; flex-shrink: 0; margin-left: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 2px; font-family: Arial, sans-serif; border: 1px solid #333; line-height: 0.2; margin-bottom: 1px;">
                <tr><td style="border: 1px solid #333; background: #FFF2CC; padding: 0px; font-weight: bold; text-align: center; height: 1px;" colspan="2">Area of Primary Concern</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">P1</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Primary</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">P2</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Secondary</td></tr>
                <tr><td style="border: 1px solid #333; background: #FFF2CC; padding: 0px; font-weight: bold; text-align: center; height: 1px;" colspan="2">Pain Indicator</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">~</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Primary</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">/</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Shooting</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">x</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Burning</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">•</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Pins and Needles</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">o</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Numbness</td></tr>
                <tr><td style="border: 1px solid #333; background: #FFF2CC; padding: 0px; font-weight: bold; text-align: center; height: 1px;" colspan="2">General</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">T</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Temperature</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">SW</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Swelling</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">S</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Scar</td></tr>
                <tr><td style="border: 1px solid #333; padding: 0px; text-align: center; font-weight: bold; height: 0.8px;">C</td><td style="border: 1px solid #333; padding: 0px; height: 0.8px;">Crepitus</td></tr>
            </table>
        </div>
    </div>
</div>


    <!-- Referral Questions -->
    <div class="referral-section" style="page-break-before: always; padding: 40px 0;">
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; font-weight: bold; margin-bottom: 20px; border-radius: 4px;">
            Referral Questions
        </div>

 
        <!-- Range of Motion Question with Table -->
        <div style="margin-bottom: 8px; page-break-inside: auto;">
            <h4 style="font-weight: bold; margin-bottom: 8px; color: #1e40af; font-family: Arial, sans-serif;">What is the present lumbar range of motion noted for the client?</h4>

            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 16px;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px; text-align: center;">Area Evaluated:</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Data:</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Valid?</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Norm:</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">% of Norm:</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Lumbar Flexion</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">49 °</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Pass</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">60 °</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">82%</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Lumbar Extension</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">28 °</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Pass</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">25 °</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">112%</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Lumbar Lateral Flexion - Left</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">27 °</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Pass</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">25 °</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">108%</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Lumbar Lateral Flexion - Right</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">25 °</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Pass</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">25 °</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">116%</td>
                    </tr>
                </tbody>
            </table>

            <p style="font-size: 11px; line-height: 1.5; font-style: italic; font-family: Arial, sans-serif;">*Slight decrease in flexion but not a limitation to return to duties.</p>

            <!-- Range of Motion Supporting Photos -->
            ${(() => {
              const romQuestion = referralQuestionsData.questions?.find(
                (qa: any) =>
                  qa.question &&
                  (qa.question.toLowerCase().includes("range of motion") ||
                    qa.question.toLowerCase().includes("lumbar")),
              );

              if (
                romQuestion?.savedImageData &&
                romQuestion.savedImageData.length > 0
              ) {
                return `
                        <div style="margin: 4px 0;">
                            <h5 style="font-weight: bold; font-size: 10px; color: #374151; margin-bottom: 4px;">Range of Motion Assessment Documentation:</h5>
                            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; max-width: 100%;">
  ${romQuestion.savedImageData
    .map(
      (imageData, imgIndex) => `
      <div style="
  height: 70px; 
  border: 1px solid #333; 
  border-radius: 3px; 
  overflow: hidden; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  background-color: #f9f9f9;
">
  <img 
    src="${imageData.dataUrl || imageData.data}" 
    alt="ROM Assessment ${imgIndex + 1}" 
    style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;"
  />
</div>
`,
    )
    .join("")}
</div>
                        </div>
                    `;
              }
              return "";
            })()}
        </div>
        <!-- Additional Referral Questions -->
        <div class="section">
            ${
              referralQuestionsData.questions &&
              referralQuestionsData.questions.length > 0
                ? referralQuestionsData.questions
                    .filter(
                      (qa: any) =>
                        qa.question &&
                        !qa.question.toLowerCase().includes("lumbar") &&
                        !qa.question
                          .toLowerCase()
                          .includes("physical demand classification") &&
                        !qa.question.toLowerCase().includes("conclusion") &&
                        !qa.question.includes("6b)") &&
                        !qa.question.includes("6c)") &&
                        !qa.question.includes("6d)") &&
                        !qa.question.includes("6e)"),
                    )
                    .map(
                      (qa: any, index: number) => `
                    <div style="margin-bottom: 8px; page-break-inside: avoid;">
                        <h4 style="font-weight: bold; margin-bottom: 8px; color: #1e40af; font-family: Arial, sans-serif;">${qa.question.replace(
                          /^6a\)\s*/,
                          "",
                        )}</h4>
                        <p style="font-size: 11px; line-height: 1.5; margin-bottom: 6px; font-family: Arial, sans-serif;">${
                          qa.answer ||
                          "Client demonstrated appropriate functional capacity for this area with minimal limitations noted based on comprehensive testing and evaluation."
                        }</p>

                        <!-- Include specific images uploaded for this question -->
                        ${
                          qa.savedImageData && qa.savedImageData.length > 0
                            ? `
                            <div style="margin: 4px 0;">
                                <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; max-width: 100%;">
                                    ${qa.savedImageData
                                      .map(
                                        (imageData: any, imgIndex: number) => `
                                        <div style="width: 100%; height: 60px; overflow: hidden; border: 1px solid #333; border-radius: 3px;">
                                            <img src="${
                                              imageData.dataUrl ||
                                              imageData.data
                                            }" alt="Question ${index + 1} Image ${
                                              imgIndex + 1
                                            }" style="width: 100%; height: 100%; object-fit: cover;" />
                                        </div>
                                    `,
                                      )
                                      .join("")}
                                </div>
                            </div>
                        `
                            : ""
                        }
                    </div>
                `,
                    )
                    .join("")
                : `
                    <div style="margin-bottom: 15px;">
                        <h4 style="font-weight: bold; margin-bottom: 8px; color: #1e40af; font-family: Arial, sans-serif;">Are there any safety concerns with this client returning to work?</h4>
                        <p style="font-size: 11px; line-height: 1.5; font-family: Arial, sans-serif;">Based on the comprehensive evaluation, no significant safety concerns were identified that would prevent the client from returning to work. Standard workplace safety protocols should be maintained.</p>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <h4 style="font-weight: bold; margin-bottom: 8px; color: #1e40af; font-family: Arial, sans-serif;">What is the prognosis for improvement in functional capacity?</h4>
                        <p style="font-size: 11px; line-height: 1.5; font-family: Arial, sans-serif;">The prognosis for functional capacity improvement is good with appropriate medical management and graduated activity progression. Regular reassessment is recommended.</p>
                    </div>
                `
            }
        </div>

        <!-- Consistency Questions (6b and 6c) -->
        <div class="section">
            ${
              referralQuestionsData.questions &&
              referralQuestionsData.questions.length > 0
                ? referralQuestionsData.questions
                    .filter(
                      (qa: any) =>
                        qa.question &&
                        (qa.question.includes("6b)") ||
                          qa.question.includes("6c)")),
                    )
                    .map((qa: any) => {
                      const answerParts = qa.answer?.split("|") || [];
                      const status = answerParts[0] || "";
                      const comments = answerParts[1] || "";

                      return `
                    <div style="margin-bottom: 15px; page-break-inside: avoid;">
                        <h4 style="font-weight: bold; margin-bottom: 8px; color: #1e40af; font-family: Arial, sans-serif;">${qa.question.replace(/^6[bc]\)\s*/, "")}</h4>
                        <div style="margin-bottom: 8px;">
                            <span style="font-weight: bold; font-size: 11px; font-family: Arial, sans-serif;">Status: </span>
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; ${
                              status.toUpperCase().includes("PASS")
                                ? "background-color: #dcfce7; color: #166534;"
                                : "background-color: #fee2e2; color: #991b1b;"
                            }">${status}</span>
                        </div>
                        ${
                          comments
                            ? `
                        <div>
                            <span style="font-weight: bold; font-size: 11px; font-family: Arial, sans-serif;">Comments: </span>
                            <p style="font-size: 11px; line-height: 1.5; margin-top: 4px; font-family: Arial, sans-serif;">${comments}</p>
                        </div>
                        `
                            : ""
                        }
                    </div>`;
                    })
                    .join("")
                : ""
            }
        </div>

        <!-- RPDR and CTP Questions (6d and 6e) -->
        <div class="section">
            <!-- RPDR Section (6d) -->
            ${(() => {
              const rpdrQuestion = referralQuestionsData?.questions?.find(
                (qa: any) => qa.question?.includes("6d)"),
              );
              const rpdrBehaviors =
                referralQuestionsData?.conclusionData?.rpdrBehaviors || {};
              const rpdrComments =
                referralQuestionsData?.conclusionData?.rpdrComments || "";

              if (
                !rpdrQuestion &&
                !Object.values(rpdrBehaviors).some((v: any) => v === true) &&
                !rpdrComments
              ) {
                return "";
              }

              return `
                <div style="margin-bottom: 15px; page-break-inside: avoid;">
                    <h4 style="font-weight: bold; margin-bottom: 8px; color: #1e40af; font-family: Arial, sans-serif;">Observed Symptom Behavior / Reliability of Pain and Disability Reports (RPDR)</h4>
                    ${
                      Object.keys(rpdrBehaviors).length > 0
                        ? `
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: bold; font-size: 11px; font-family: Arial, sans-serif;">Observed Behaviors:</span>
                        <div style="margin-top: 4px; padding: 6px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 3px; font-size: 10px; font-family: Arial, sans-serif;">
                            ${Object.entries(rpdrBehaviors)
                              .map(([behavior, checked]: any) =>
                                checked
                                  ? `<div style="margin: 2px 0;">✓ ${behavior}</div>`
                                  : "",
                              )
                              .join("")}
                        </div>
                    </div>
                        `
                        : ""
                    }
                    ${
                      rpdrComments
                        ? `
                    <div>
                        <span style="font-weight: bold; font-size: 11px; font-family: Arial, sans-serif;">Comments: </span>
                        <p style="font-size: 11px; line-height: 1.5; margin-top: 4px; font-family: Arial, sans-serif;">${rpdrComments}</p>
                    </div>
                        `
                        : ""
                    }
                </div>`;
            })()}

            <!-- CTP Section (6e) -->
            ${(() => {
              const ctpQuestion = referralQuestionsData?.questions?.find(
                (qa: any) => qa.question?.includes("6e)"),
              );
              const ctpBehaviors =
                referralQuestionsData?.conclusionData?.ctpBehaviors || {};
              const ctpComments =
                referralQuestionsData?.conclusionData?.ctpComments || "";

              if (
                !ctpQuestion &&
                !Object.values(ctpBehaviors).some((v: any) => v === true) &&
                !ctpComments
              ) {
                return "";
              }

              return `
                <div style="margin-bottom: 15px; page-break-inside: avoid;">
                    <h4 style="font-weight: bold; margin-bottom: 8px; color: #1e40af; font-family: Arial, sans-serif;">Observable Signs of Effort / Competitive Testing Performance (CTP)</h4>
                    ${
                      Object.keys(ctpBehaviors).length > 0
                        ? `
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: bold; font-size: 11px; font-family: Arial, sans-serif;">Observable Behaviors:</span>
                        <div style="margin-top: 4px; padding: 6px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 3px; font-size: 10px; font-family: Arial, sans-serif;">
                            ${Object.entries(ctpBehaviors)
                              .map(([behavior, checked]: any) =>
                                checked
                                  ? `<div style="margin: 2px 0;">✓ ${behavior}</div>`
                                  : "",
                              )
                              .join("")}
                        </div>
                    </div>
                        `
                        : ""
                    }
                    ${
                      ctpComments
                        ? `
                    <div>
                        <span style="font-weight: bold; font-size: 11px; font-family: Arial, sans-serif;">Comments: </span>
                        <p style="font-size: 11px; line-height: 1.5; margin-top: 4px; font-family: Arial, sans-serif;">${ctpComments}</p>
                    </div>
                        `
                        : ""
                    }
                </div>`;
            })()}
        </div>

        <!-- Physical Demand Classification Question (moved to end) -->
        <div style="margin-bottom: 30px; page-break-inside: auto;">
            <h4 style="font-weight: bold; margin-bottom: 8px; color: #1e40af; font-family: Arial, sans-serif;">What would be the Physical Demand Classification (PDC) for this client?</h4>
            ${(() => {
              const qa = referralQuestionsData?.questions?.find(
                (x: any) =>
                  x?.question &&
                  x.question.includes("Physical Demand Classification"),
              );
              const selectedLevel = qa?.answer
                ? String(qa.answer).split("|")[0].replace("PDC:", "")
                : null;
              if (!selectedLevel) return "";
              return `<p style="font-size: 11px; line-height: 1.5; margin-bottom: 12px; font-family: Arial, sans-serif;">*${selectedLevel} which is in line with full return to duties.</p>`;
            })()}

            ${(() => {
              const map: Record<
                string,
                { title: string; description: string }
              > = {
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
                  title: "(VH) Very Heavy",
                  description:
                    "Exerting over 100 lbs of force occasionally, and over 50 lbs of force frequently, and over 25 lbs of force constantly to move objects. For civilian workers, 0.7 percent required a very heavy strength level, which indicates requirements beyond the conditions set for heavy work. Examples of occupational groups with heavy strength level requirements include: Laborers in construction and extraction occupations may lift items that weigh 50 pounds or more, like bags of cement or sheets of plywood, for more than 1/3 of the workday.",
                },
              };
              const qa = referralQuestionsData.questions?.find(
                (x: any) =>
                  x?.question &&
                  x.question
                    .toLowerCase()
                    .includes("physical demand classification"),
              );
              if (!qa || !qa.answer || !String(qa.answer).startsWith("PDC:"))
                return "";
              const level = String(qa.answer).split("|")[0].replace("PDC:", "");
              const comments = String(qa.answer).split("|")[1] || "";
              const info = (map as any)[level];
              if (!info) return "";
              return `
                <div style="border: 1px solid #93c5fd; background: #dbeafe; padding: 8px; border-radius: 6px; margin-bottom: 12px;">
                  <div style="font-weight: bold; color: #1d4ed8; margin-bottom: 4px;">${info.title}</div>
                  <div style="font-size: 11px; line-height: 1.5; color: #111827;">${info.description}</div>
                  ${comments ? `<div style="margin-top: 6px; font-size: 11px;"><strong>Additional Comments:</strong> ${comments}</div>` : ""}
                </div>
              `;
            })()}

            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 16px;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px; text-align: left;">Physical Demand Level</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;">OCCASIONAL<br/>0-33% of the workday</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;">FREQUENT<br/>34-66% of the workday</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;">CONSTANT<br/>67-100% of the workday</th>
                    </tr>
                </thead>
                <tbody>
                    ${(() => {
                      const pdcLevels = [
                        {
                          name: "Sedentary",
                          occasional: "1 - 10 lbs.",
                          frequent: "Negligible",
                          constant: "Negligible",
                        },
                        {
                          name: "Light",
                          occasional: "11 - 25 lbs.",
                          frequent: "1 - 10 lbs.",
                          constant: "Negligible",
                        },
                        {
                          name: "Medium",
                          occasional: "26 - 50 lbs.",
                          frequent: "11 - 25 lbs.",
                          constant: "1 - 10 lbs.",
                        },
                        {
                          name: "Heavy",
                          occasional: "51 - 100 lbs.",
                          frequent: "26 - 50 lbs.",
                          constant: "11 - 25 lbs.",
                        },
                        {
                          name: "Very Heavy",
                          occasional: "Over 100 lbs.",
                          frequent: "Over 50 lbs.",
                          constant: "Over 25 lbs.",
                        },
                      ];

                      const pdcQuestion =
                        referralQuestionsData?.questions?.find(
                          (x: any) =>
                            x?.question &&
                            x.question.includes(
                              "Physical Demand Classification",
                            ),
                        );
                      const selectedLevel = pdcQuestion?.answer
                        ? String(pdcQuestion.answer)
                            .split("|")[0]
                            .replace("PDC:", "")
                        : null;

                      return pdcLevels
                        .map(
                          (lvl) => `
                    <tr${selectedLevel === lvl.name ? ' style="background: #dbeafe;"' : ""}>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px; font-weight: bold;">${lvl.name}</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;">${lvl.occasional}</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;">${lvl.frequent}</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;">${lvl.constant}</td>
                    </tr>
              `,
                        )
                        .join("");
                    })()}
                </tbody>
            </table>

            <!-- Physical Demand Classification Supporting Photos -->
            ${(() => {
              const physicalDemandQuestion =
                referralQuestionsData.questions?.find(
                  (qa: any) =>
                    qa.question &&
                    qa.question
                      .toLowerCase()
                      .includes("physical demand classification"),
                );

              if (
                physicalDemandQuestion?.savedImageData &&
                physicalDemandQuestion.savedImageData.length > 0
              ) {
                return `
                        <div style="margin: 4px 0;">
                            <h5 style="font-weight: bold; font-size: 10px; color: #374151; margin-bottom: 4px;">Physical Demand Assessment Documentation:</h5>
                            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; max-width: 100%;">
                                ${physicalDemandQuestion.savedImageData
                                  .map(
                                    (imageData: any, imgIndex: number) => `
                                    <div style="width: 100%; border: 1px solid #333; border-radius: 3px; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                <img 
                  src="${imageData.dataUrl || imageData.data}" 
                  alt="Physical Demand Assessment ${imgIndex + 1}" 
                  style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;"
                />
              </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `;
              }
              return "";
            })()}
        </div>
    </div>

    <!-- Conclusions -->
    <div class="conclusions-section" style="margin-top: 60px; padding: 40px 0; page-break-inside: avoid;">
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; font-weight: bold; margin-bottom: 20px; border-radius: 4px;">
            Conclusions
        </div>

        <!-- Return to Work Status Tab -->
        ${(() => {
          const rtw = referralQuestionsData?.conclusionData?.returnToWorkStatus;
          if (rtw?.status) {
            const safe = String(rtw.comments || "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\n/g, "<br/>");
            return `
              <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 4px; padding: 12px; margin-bottom: 20px;">
                <h4 style="font-weight: bold; font-size: 12px; color: #333; margin-bottom: 8px; font-family: Arial, sans-serif;">Return to Work Status</h4>
                <p style="font-size: 11px; color: #374151; margin-bottom: 6px; font-family: Arial, sans-serif;"><strong>Status:</strong> ${rtw.status}</p>
                <p style="font-size: 11px; color: #374151; line-height: 1.5; font-family: Arial, sans-serif;">${safe}</p>
              </div>
            `;
          }
          return "";
        })()}


        <!-- Enhanced Conclusions Text -->
        <div style="margin-top: 20px;">
            <div style="margin-bottom: 20px;">
              ${(() => {
                const conclusionQuestion =
                  referralQuestionsData?.questions?.find(
                    (qa) =>
                      qa &&
                      qa.question &&
                      qa.question.toLowerCase().includes("conclusion"),
                  );
                if (conclusionQuestion?.answer) {
                  const safe = String(conclusionQuestion.answer)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\n/g, "<br/>");
                  return `
                <h4 style="font-weight: bold; font-size: 12px; color: #333; margin-bottom: 8px; font-family: Arial, sans-serif;">Conclusion</h4>
                <p style="font-size: 12px; color: #374151; line-height: 1.6; font-family: Arial, sans-serif;">${safe}</p>
              `;
                }
                return "";
              })()}
            </div>

            <!-- Supporting Documentation and Images Section from Conclusions Question -->
            ${(() => {
              // Find the "Conclusions?" question and get its images
              const conclusionQuestion = referralQuestionsData?.questions?.find(
                (qa) =>
                  qa.question &&
                  qa.question.toLowerCase().includes("conclusion"),
              );

              // Only show images if the Conclusions question has uploaded images
              if (
                conclusionQuestion?.savedImageData &&
                conclusionQuestion.savedImageData.length > 0
              ) {
                return `
                  <div style="margin-top: 30px; page-break-inside: avoid;">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                      ${conclusionQuestion.savedImageData
                        .map(
                          (image, index) => `
                        <div style="text-align: center; page-break-inside: avoid;">
                          <div style="border: 1px solid #333; padding: 4px; background: white;">
                            <img src="${image.dataUrl}" alt="${image.name || `Conclusion Image ${index + 1}`}" style="width: 100%; height: 80px; object-fit: cover; display: block;" />
                          </div>
                        </div>
                      `,
                        )
                        .join("")}
                    </div>
                  </div>
                `;
              }
              return "";
            })()}
        </div>

        <!-- Signature of Evaluator Section -->
        <div style="margin-top: 40px;">
            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; font-weight: bold; margin-bottom: 20px; border-radius: 4px;">
                Signature of Evaluator
            </div>

            <div style="margin-top: 40px;">
                ${
                  signatureImage
                    ? `<div style="margin-bottom: 24px;">
                        <img src="${signatureImage}" alt="Evaluator Signature" style="max-width: 250px; max-height: 100px; object-fit: contain;" />
                      </div>`
                    : `<div style="border-bottom: 1px solid #333; width: 250px; margin-bottom: 24px;"></div>`
                }
                <p style="font-size: 12px; font-family: Arial, sans-serif;">Date: ${currentDate}</p>
                <p style="font-size: 12px; font-weight: bold; font-family: Arial, sans-serif;">
                    ${evaluatorData.name || "Licensed Evaluator"}
                </p>
                <p style="font-size: 10px; color: #666; font-family: Arial, sans-serif;">
                    ${
                      evaluatorData.licenseNo
                        ? `License: ${evaluatorData.licenseNo}`
                        : "Licensed Evaluator"
                    }
                </p>
            </div>
        </div>
    </div>


    <!-- Test Data & Results -->
    ${
      testData.tests
        ? `
    <div class="test-details" style="page-break-before: always; padding: 40px 0;">
        <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 12px; font-family: Arial, sans-serif;">Functional Abilities Determination and Job Match Results</h3>

        <table style="width: 100%; border-collapse: collapse; font-size: 7px; font-family: Arial, sans-serif;">
            <thead>
                <tr style="background: #fef3c7;">
                    <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Activity Tested</th>
                    <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Sit Time</th>
                    <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Stand Time</th>
                    <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Test Results</th>
                    <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Job Description</th>
                    <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Job Requirements</th>
                    <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif; text-align: center;">Job Match (Yes/No)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Client Interview Test</td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">45 min</td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;"></td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">N/A</td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Initial assessment and history gathering</td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Basic interview requirements</td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Yes</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Activity Overview</td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;"></td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">5 min</td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">//</td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">General activity overview and preparation</td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Basic standing and mobility</td>
                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Yes</td>
                </tr>
                ${(() => {
                  // Define comprehensive normative standards for job match evaluation
                  const getJobRequirements = (testName) => {
                    const testNameLower = testName.toLowerCase();

                    // Grip Strength Norms (based on DOT levels and research)
                    if (testNameLower.includes("grip")) {
                      return {
                        requirement:
                          "Grip strength ≥20 kg (Light work) / ≥30 kg (Medium work)",
                        lightWork: 20, // kg - DOT Level 2
                        mediumWork: 30, // kg - DOT Level 3
                        unit: "kg",
                        type: "weight",
                      };
                    }

                    // Pinch Strength Norms (DOT-based standards)
                    if (
                      testNameLower.includes("key") &&
                      testNameLower.includes("pinch")
                    ) {
                      return {
                        requirement:
                          "Key pinch ≥4.3 kg (Light) / ≥7.0 kg (Medium work)",
                        lightWork: 4.3, // kg
                        mediumWork: 7.0, // kg
                        unit: "kg",
                        type: "weight",
                      };
                    }
                    if (
                      testNameLower.includes("tip") &&
                      testNameLower.includes("pinch")
                    ) {
                      return {
                        requirement:
                          "Tip pinch ≥1.8 kg (Light) / ≥3.7 kg (Medium work)",
                        lightWork: 1.8, // kg
                        mediumWork: 3.7, // kg
                        unit: "kg",
                        type: "weight",
                      };
                    }
                    if (
                      testNameLower.includes("palmar") &&
                      testNameLower.includes("pinch")
                    ) {
                      return {
                        requirement:
                          "Palmar pinch ≥2.1 kg (Light) / ≥4.3 kg (Medium work)",
                        lightWork: 2.1, // kg
                        mediumWork: 4.3, // kg
                        unit: "kg",
                        type: "weight",
                      };
                    }

                    // Range of Motion Norms - Cervical Spine
                    if (testNameLower.includes("cervical")) {
                      if (testNameLower.includes("flexion")) {
                        return {
                          requirement:
                            "Cervical flexion ≥45° for functional neck movement",
                          norm: 45, // degrees
                          functionalMin: 45,
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                      if (testNameLower.includes("extension")) {
                        return {
                          requirement:
                            "Cervical extension ≥45° for functional neck movement",
                          norm: 45, // degrees
                          functionalMin: 45,
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                      if (testNameLower.includes("lateral")) {
                        return {
                          requirement:
                            "Cervical lateral flexion ≥35° for functional movement",
                          norm: 35, // degrees
                          functionalMin: 35,
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                    }

                    // Range of Motion Norms - Lumbar Spine
                    if (testNameLower.includes("lumbar")) {
                      if (testNameLower.includes("flexion")) {
                        return {
                          requirement:
                            "Lumbar flexion ≥80° for bending and lifting activities",
                          norm: 80, // degrees
                          functionalMin: 60, // Minimum for basic function
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                      if (testNameLower.includes("extension")) {
                        return {
                          requirement:
                            "Lumbar extension ≥20° for postural activities",
                          norm: 20, // degrees
                          functionalMin: 15,
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                    }

                    // Range of Motion Norms - Shoulder
                    if (testNameLower.includes("shoulder")) {
                      if (testNameLower.includes("flexion")) {
                        return {
                          requirement:
                            "Shoulder flexion ≥150° for overhead work activities",
                          norm: 150, // degrees
                          functionalMin: 120, // Minimum for most work
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                      if (testNameLower.includes("abduction")) {
                        return {
                          requirement:
                            "Shoulder abduction ≥150° for lateral reach activities",
                          norm: 150, // degrees
                          functionalMin: 120,
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                      if (testNameLower.includes("extension")) {
                        return {
                          requirement:
                            "Shoulder extension ≥45° for reach-behind activities",
                          norm: 45, // degrees
                          functionalMin: 30,
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                    }

                    // Range of Motion Norms - Hip
                    if (testNameLower.includes("hip")) {
                      if (testNameLower.includes("flexion")) {
                        return {
                          requirement:
                            "Hip flexion ≥90° for lifting and squatting activities",
                          norm: 90, // degrees
                          functionalMin: 80,
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                      if (testNameLower.includes("extension")) {
                        return {
                          requirement:
                            "Hip extension ≥20° for walking and posture",
                          norm: 20, // degrees
                          functionalMin: 15,
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                      if (testNameLower.includes("abduction")) {
                        return {
                          requirement:
                            "Hip abduction ≥35° for stability and lateral movement",
                          norm: 35, // degrees
                          functionalMin: 25,
                          unit: "degrees",
                          type: "degrees",
                        };
                      }
                    }

                    // Lifting Capacity Norms (DOT-based)
                    if (testNameLower.includes("lift")) {
                      return {
                        requirement:
                          "Lifting capacity ≥10 kg (Light) / ≥25 kg (Medium work)",
                        lightWork: 10, // kg - DOT Level 2
                        mediumWork: 25, // kg - DOT Level 3
                        unit: "kg",
                        type: "weight",
                      };
                    }

                    // Cardiovascular Norms
                    if (
                      testNameLower.includes("step") ||
                      testNameLower.includes("cardio") ||
                      testNameLower.includes("treadmill")
                    ) {
                      return {
                        requirement:
                          "Cardiovascular endurance within normal limits for work demands",
                        norm: null, // No specific numeric norm
                        unit: "bpm",
                        type: "cardio",
                      };
                    }

                    // Default for other tests
                    return {
                      requirement:
                        "Functional capacity within normal work demands",
                      norm: null,
                      unit: "",
                      type: "general",
                    };
                  };

                  // Function to evaluate if test results meet job requirements
                  const evaluateJobMatch = (test) => {
                    const jobReq = getJobRequirements(test.testName);

                    // Priority 1: Use user's explicit job match selection if provided
                    if (test.jobMatch === "yes") {
                      return true;
                    }
                    if (test.jobMatch === "no") {
                      return false;
                    }

                    // Priority 2: If user marked norm level as "yes", consider it a match
                    if (test.normLevel === "yes") {
                      return true;
                    }
                    if (test.normLevel === "no") {
                      return false;
                    }

                    // Priority 3: Compare actual test results to industry standards
                    const leftAvg = calculateAverage(test.leftMeasurements);
                    const rightAvg = calculateAverage(test.rightMeasurements);

                    if (jobReq.type === "weight") {
                      // For strength/weight tests - use highest value achieved
                      const maxResult = Math.max(leftAvg, rightAvg);

                      // If user provided specific target value, use that
                      if (test.valueToBeTestedNumber) {
                        const userTarget = parseFloat(
                          test.valueToBeTestedNumber,
                        );
                        return maxResult >= userTarget;
                      }

                      // Otherwise use industry standards (prefer medium work level)
                      if (jobReq.mediumWork) {
                        return maxResult >= jobReq.lightWork; // Meet at least light work level
                      }
                      if (jobReq.norm) {
                        return maxResult >= jobReq.norm;
                      }
                    }

                    if (jobReq.type === "degrees") {
                      // For ROM tests - handle flexion/extension vs bilateral comparisons
                      const testNameLower = test.testName.toLowerCase();
                      let testResult;

                      // For flexion/extension tests, left = flexion, right = extension typically
                      if (
                        testNameLower.includes("flexion") &&
                        testNameLower.includes("extension")
                      ) {
                        testResult = leftAvg; // Flexion value
                      } else if (testNameLower.includes("flexion")) {
                        testResult = Math.max(leftAvg, rightAvg); // Best flexion result
                      } else if (testNameLower.includes("extension")) {
                        testResult = Math.max(leftAvg, rightAvg); // Best extension result
                      } else if (testNameLower.includes("abduction")) {
                        testResult = Math.max(leftAvg, rightAvg); // Best abduction result
                      } else {
                        // For bilateral ROM tests, use the better side
                        testResult = Math.max(leftAvg, rightAvg);
                      }

                      // If user provided specific target value, use that
                      if (test.valueToBeTestedNumber) {
                        const userTarget = parseFloat(
                          test.valueToBeTestedNumber,
                        );
                        return testResult >= userTarget;
                      }

                      // Otherwise use industry standards
                      if (jobReq.functionalMin) {
                        return testResult >= jobReq.functionalMin; // Meet functional minimum
                      }
                      if (jobReq.norm) {
                        return testResult >= jobReq.norm;
                      }
                    }

                    // Priority 4: If test was demonstrated successfully and no specific standards apply
                    if (test.demonstrated === true) {
                      return true;
                    }

                    // Default: no match if test was not demonstrated or failed
                    return false;
                  };

                  // Group tests by specific categories collected in software (same as ReviewReport)
                  const testsByCategory = {
                    Strength: [],
                    "ROM Total Spine/Extremity": [],
                    "ROM Hand/Foot": [],
                    "Occupational Tasks": [],
                    Cardio: [],
                  };

                  testData.tests?.forEach((test: any) => {
                    const testName = test.testName.toLowerCase();
                    const originalCategory =
                      test.category || test.testType || "";
                    const category = originalCategory.toLowerCase();

                    // Use exact category match first, then fall back to pattern matching
                    if (originalCategory === "ROM Hand/Foot") {
                      testsByCategory["ROM Hand/Foot"].push(test);
                    } else if (
                      originalCategory === "ROM Total Spine/Extremity"
                    ) {
                      testsByCategory["ROM Total Spine/Extremity"].push(test);
                    } else if (originalCategory === "Occupational Tasks") {
                      testsByCategory["Occupational Tasks"].push(test);
                    } else if (originalCategory === "Cardio") {
                      testsByCategory["Cardio"].push(test);
                    } else if (originalCategory === "Strength") {
                      testsByCategory["Strength"].push(test);
                    } else if (
                      testName.includes("step-test") ||
                      testName.includes("treadmill") ||
                      testName.includes("mcaft") ||
                      testName.includes("kasch") ||
                      testName.includes("ymca") ||
                      testName.includes("cardio") ||
                      testName.includes("cardiovascular") ||
                      testName.includes("aerobic") ||
                      category.includes("cardio") ||
                      category.includes("heart") ||
                      category.includes("cardiovascular")
                    ) {
                      testsByCategory["Cardio"].push(test);
                    } else if (
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
                      testName.includes("balance") ||
                      category.includes("occupational") ||
                      category.includes("task")
                    ) {
                      testsByCategory["Occupational Tasks"].push(test);
                    } else if (
                      ((testName.includes("hand") ||
                        testName.includes("foot") ||
                        testName.includes("finger") ||
                        testName.includes("wrist") ||
                        testName.includes("ankle") ||
                        testName.includes("thumb")) &&
                        (testName.includes("flexion") ||
                          testName.includes("extension") ||
                          testName.includes("abduction") ||
                          testName.includes("adduction"))) ||
                      ((category.includes("hand") ||
                        category.includes("foot")) &&
                        (category.includes("range") ||
                          category.includes("motion")))
                    ) {
                      testsByCategory["ROM Hand/Foot"].push(test);
                    } else if (
                      category.includes("range") ||
                      category.includes("motion") ||
                      testName.includes("flexion") ||
                      testName.includes("extension") ||
                      testName.includes("spine") ||
                      testName.includes("cervical") ||
                      testName.includes("back") ||
                      testName.includes("shoulder")
                    ) {
                      testsByCategory["ROM Total Spine/Extremity"].push(test);
                    } else {
                      // Default to Strength for grip, pinch, muscle strength tests
                      testsByCategory["Strength"].push(test);
                    }
                  });

                  let rows = [];
                  let totalSitTime = 45; // Initial interview sit time
                  let totalStandTime = 5; // Initial activity overview stand time

                  // Add tests grouped by their actual categories
                  Object.entries(testsByCategory).forEach(
                    ([category, tests]) => {
                      if (tests.length > 0) {
                        // Add category header row using actual category name from software
                        rows.push(`
                                <tr style="background: #dbeafe;">
                                    <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px; font-weight: bold; color: #1e40af;" colspan="7">
                                        ${category}
                                    </td>
                                </tr>
                            `);

                        // Add individual tests in this category
                        tests.forEach((test: any) => {
                          const leftAvg = calculateAverage(
                            test.leftMeasurements,
                          );
                          const rightAvg = calculateAverage(
                            test.rightMeasurements,
                          );

                          // Determine sit/stand time based on test type
                          const testNameLower = test.testName.toLowerCase();
                          const isStandingTest =
                            testNameLower.includes("lumbar") ||
                            testNameLower.includes("cervical") ||
                            testNameLower.includes("thoracic") ||
                            testNameLower.includes("shoulder") ||
                            testNameLower.includes("elbow") ||
                            testNameLower.includes("wrist") ||
                            testNameLower.includes("reach") ||
                            testNameLower.includes("crouch") ||
                            testNameLower.includes("stoop") ||
                            testNameLower.includes("bend") ||
                            testNameLower.includes("balance") ||
                            testNameLower.includes("climb") ||
                            testNameLower.includes("walk") ||
                            testNameLower.includes("push") ||
                            testNameLower.includes("pull") ||
                            testNameLower.includes("carry") ||
                            testNameLower.includes("lift") ||
                            testNameLower.includes("overhead");

                          const sitTime = isStandingTest ? "" : "5 min";
                          const standTime = isStandingTest ? "5 min" : "";

                          if (!isStandingTest) totalSitTime += 5;
                          if (isStandingTest) totalStandTime += 5;

                          // Format heart rate data from left and right measurements
                          const leftPreHR =
                            test.leftMeasurements?.preHeartRate || 0;
                          const leftPostHR =
                            test.leftMeasurements?.postHeartRate || 0;
                          const rightPreHR =
                            test.rightMeasurements?.preHeartRate || 0;
                          const rightPostHR =
                            test.rightMeasurements?.postHeartRate || 0;

                          const hrData =
                            leftPreHR > 0 ||
                            leftPostHR > 0 ||
                            rightPreHR > 0 ||
                            rightPostHR > 0
                              ? `${Math.max(leftPreHR, rightPreHR)}//${Math.max(
                                  leftPostHR,
                                  rightPostHR,
                                )}`
                              : "Norm";

                          // Job requirements logic with industry standards
                          const jobRequirements = (() => {
                            // Helper function to get default unit based on category
                            const getDefaultUnit = (category: string) => {
                              const categoryLower = (
                                category || ""
                              ).toLowerCase();
                              if (categoryLower === "weight") return "lbs";
                              if (categoryLower === "distance") return "ft";
                              if (categoryLower === "time") return "sec";
                              if (categoryLower === "force") return "lbs";
                              if (categoryLower === "angle") return "°";
                              if (categoryLower === "speed") return "mph";
                              if (categoryLower === "frequency") return "Hz";
                              return "";
                            };

                            // Priority 1: If normLevel is "no", show the value they entered to be tested with proper unit formatting
                            if (
                              test.normLevel === "no" &&
                              test.valueToBeTestedNumber
                            ) {
                              // Use unitMeasure for the actual unit abbreviation (lbs, kg, °, etc)
                              // Fall back to default unit based on valueToBeTestedUnit category if unitMeasure is not set
                              const unit =
                                test.unitMeasure ||
                                getDefaultUnit(test.valueToBeTestedUnit);

                              // Format degrees with symbol (no space)
                              if (unit === "°") {
                                return `${test.valueToBeTestedNumber}°`;
                              }
                              // For other units, add space before unit abbreviation
                              if (unit) {
                                return `${test.valueToBeTestedNumber} ${unit}`;
                              }
                              return test.valueToBeTestedNumber;
                            }

                            // Priority 2: If normLevel is "yes", show "Norm"
                            if (test.normLevel === "yes") {
                              return "Norm";
                            }

                            // Fallback: use the job requirements they entered
                            return (
                              test.jobRequirements ||
                              getJobRequirements(test.testName).requirement
                            );
                          })();

                          // Test results format logic like ReviewReport
                          const testResults = (() => {
                            if (category === "Occupational Tasks") {
                              // Calculate percentage for occupational tasks
                              const avgResult = (leftAvg + rightAvg) / 2;
                              return `%IS=${avgResult.toFixed(1)}`;
                            } else if (
                              category === "ROM Hand/Foot" ||
                              category === "ROM Total Spine/Extremity"
                            ) {
                              // ROM tests: check if it's flexion/extension or left/right
                              const testNameLower = test.testName.toLowerCase();
                              if (
                                testNameLower.includes("flexion") &&
                                testNameLower.includes("extension")
                              ) {
                                return `F=${leftAvg.toFixed(2)} E=${rightAvg.toFixed(2)}`;
                              } else if (testNameLower.includes("lateral")) {
                                return `L=${leftAvg.toFixed(2)} R=${rightAvg.toFixed(2)}`;
                              } else {
                                return `F=${leftAvg.toFixed(2)} E=${rightAvg.toFixed(2)}`;
                              }
                            } else if (
                              test.testName?.toLowerCase().includes("lift")
                            ) {
                              // Lift tests: show average weight with selected metric
                              const unit = (
                                test.unitMeasure || "lbs"
                              ).toLowerCase();
                              const baseAvg = leftAvg > 0 ? leftAvg : rightAvg;
                              const avgValue =
                                unit === "kg"
                                  ? Math.round(baseAvg * 2.20462 * 10) / 10
                                  : Math.round(baseAvg * 10) / 10;
                              return `${avgValue.toFixed(1)} ${unit}`;
                            } else {
                              // Default format for strength and cardio tests
                              return `L=${leftAvg.toFixed(1)} R=${rightAvg.toFixed(1)}`;
                            }
                          })();

                          const jobMatch = evaluateJobMatch(test)
                            ? "Yes"
                            : "No";

                          rows.push(`
                                    <tr>
                                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">${test.testName}</td>
                                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">${sitTime}</td>
                                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">${standTime}</td>
                                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">${testResults}</td>
                                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">${test.jobRequirements || "Functional capacity assessment"}</td>
                                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">${jobRequirements}</td>
                                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">${jobMatch}</td>
                                    </tr>
                                `);
                        });
                      }
                    },
                  );

                  return rows.join("");
                })()}
                ${(() => {
                  // Calculate total times based on actual tests
                  let finalTotalSitTime = 45; // Interview
                  let finalTotalStandTime = 5; // Activity Overview

                  testData.tests?.forEach((test: any) => {
                    const testName = test.testName.toLowerCase();
                    const isStandingTest =
                      testName.includes("lumbar") ||
                      testName.includes("cervical") ||
                      testName.includes("thoracic") ||
                      testName.includes("shoulder") ||
                      testName.includes("elbow") ||
                      testName.includes("wrist") ||
                      testName.includes("reach") ||
                      testName.includes("crouch") ||
                      testName.includes("stoop") ||
                      testName.includes("bend") ||
                      testName.includes("balance") ||
                      testName.includes("climb") ||
                      testName.includes("walk") ||
                      testName.includes("push") ||
                      testName.includes("pull") ||
                      testName.includes("carry") ||
                      testName.includes("lift") ||
                      testName.includes("overhead");

                    if (isStandingTest) {
                      finalTotalStandTime += 5;
                    } else {
                      finalTotalSitTime += 5;
                    }
                  });

                  return `
                        <tr style="background: #fef3c7;">
                            <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px; font-weight: bold;">Total Sit / Stand Time</td>
                            <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px; font-weight: bold;">${finalTotalSitTime} min</td>
                            <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px; font-weight: bold;">${finalTotalStandTime} min</td>
                            <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;"></td>
                            <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;"></td>
                            <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;"></td>
                            <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;"></td>
                        </tr>
                    `;
                })()}
            </tbody>
        </table>

        <p style="font-size: 10px; margin: 10px 0; font-style: italic;">*The sit and stand timeframes are calculated throughout the exam with the individual tests and are not a measure of sustained effort.</p>

        <p style="font-size: 10px; margin: 10px 0;"><strong>Legend:</strong> L=Left, R=Right, F=Flexion, E=Extension, %IS=% Industrial Standard, HR=Heart Rate</p>

        <!-- Consistency Overview -->
        <div style="margin-top: 12px;">
            <h4 style="font-weight: bold; margin-bottom: 6px; font-size: 11px;">Consistency Overview:</h4>
            ${(() => {
              // Calculate actual effort counts from test data
              const effortCounts = {
                poor: 0,
                fair: 0,
                good: 0,
                demonstrated: 0,
                notDemonstrated: 0,
              };

              testData.tests.forEach((test: any) => {
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

              return `
                    <table style="width: 100%; border-collapse: collapse; font-size: 6px; line-height: 1;">
                        <thead>
                            <tr style="background: #fef3c7;">
                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Observed Effort During Testing</th>
                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Total Noted for all Tested Activities</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Poor effort</td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">${
                                  effortCounts.poor
                                } out of ${testData.tests.length} Tests</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Fair to Average effort</td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">${
                                  effortCounts.fair
                                } out of ${testData.tests.length} Tests</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Good effort</td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">${
                                  effortCounts.good
                                } out of ${testData.tests.length} Tests</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Test Demonstration Status (COMMENTED OUT) -->
                    <!--
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px;">
                        <thead>
                            <tr style="background: #fef3c7;">
                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Test Demonstration Status</th>
                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Total Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Tests Successfully Demonstrated</td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">${
                                  effortCounts.demonstrated
                                } out of ${testData.tests.length} Tests</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Tests Not Demonstrated</td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">${
                                  effortCounts.notDemonstrated
                                } out of ${testData.tests.length} Tests</td>
                            </tr>
                            <tr style="background: #e6f3ff;">
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-weight: bold;">Overall Consistency Rate</td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-weight: bold; color: #1e40af;">
                                    ${
                                      testData.tests.length > 0
                                        ? Math.round(
                                            (effortCounts.demonstrated /
                                              testData.tests.length) *
                                              100,
                                          )
                                        : 0
                                    }% Consistent Performance
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    -->

                    <!-- Detailed Effort Analysis (COMMENTED OUT) -->
                    <!--
                    <div style="margin-top: 16px; background: #f8f9fa; border: 1px solid #dee2e6; padding: 12px; border-radius: 4px;">
                        <h5 style="font-weight: bold; margin-bottom: 8px; color: #374151;">Detailed Effort Analysis:</h5>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 11px;">
                            <div>
                                <p style="font-weight: bold;">Tests with Recorded Effort Levels:</p>
                                <div style="margin-top: 8px; font-size: 10px;">
                                    ${testData.tests
                                      .filter((test: any) => test.effort)
                                      .map(
                                        (test: any) => `
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                                            <span style="margin-right: 8px;">${test.testName}:</span>
                                            <span style="font-weight: bold;">${test.effort}</span>
                                        </div>
                                    `,
                                      )
                                      .join("")}
                                </div>
                            </div>
                            <div>
                                <p style="font-weight: bold;">Demonstration Summary:</p>
                                <div style="margin-top: 8px; font-size: 10px;">
                                    <p>✔ Demonstrated: <span style="font-weight: bold; color: #28a745;">${
                                      effortCounts.demonstrated
                                    } tests</span></p>
                                    <p>✗ Not Demonstrated: <span style="font-weight: bold; color: #dc3545;">${
                                      effortCounts.notDemonstrated
                                    } tests</span></p>
                                    <p>Success Rate: <span style="font-weight: bold; color: #007bff;">
                                        ${
                                          testData.tests.length > 0
                                            ? Math.round(
                                                (effortCounts.demonstrated /
                                                  testData.tests.length) *
                                                  100,
                                              )
                                            : 0
                                        }%
                                    </span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    -->
                `;
            })()}

            <!-- Consistent crosschecks Table -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 6px; line-height: 1;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: left; width: 20%;">Consistent crosschecks</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: left; width: 60%;">Description</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center; width: 10%;">Pass</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center; width: 10%;">Fail</th>
                    </tr>
                </thead>
                <tbody>
                    ${(() => {
                      const crosschecks = [];

                      // Calculate CV function for DownloadReport context
                      const calculateCV = (measurements) => {
                        const values = [
                          measurements.trial1,
                          measurements.trial2,
                          measurements.trial3,
                          measurements.trial4,
                          measurements.trial5,
                          measurements.trial6,
                        ].filter((val) => val > 0);

                        if (values.length === 0) return 0;

                        const mean =
                          values.reduce((sum, val) => sum + val, 0) /
                          values.length;
                        const variance =
                          values.reduce(
                            (sum, val) => sum + Math.pow(val - mean, 2),
                            0,
                          ) / values.length;
                        const standardDeviation = Math.sqrt(variance);
                        return Math.round((standardDeviation / mean) * 100);
                      };

                      // Find relevant tests for crosschecks
                      const gripTests =
                        testData.tests?.filter((test) => {
                          const n = (test.testName || "").toLowerCase();
                          return n.includes("grip") || n.includes("hand");
                        }) || [];

                      const pinchTests =
                        testData.tests?.filter((test) =>
                          test.testName.toLowerCase().includes("pinch"),
                        ) || [];

                      const liftTests =
                        testData.tests?.filter((test) =>
                          test.testName.toLowerCase().includes("lift"),
                        ) || [];

                      const romTests =
                        testData.tests?.filter(
                          (test) =>
                            test.testName.toLowerCase().includes("range") ||
                            test.testName.toLowerCase().includes("motion") ||
                            test.testName.toLowerCase().includes("flexion") ||
                            test.testName.toLowerCase().includes("extension"),
                        ) || [];

                      const allTests = testData.tests || [];

                      // Hand grip rapid exchange check - compare rapid/exchange tests to the standard position (position 2) grip. Pass when rapid <= 85% of standard (i.e. 15% less or equal)
                      const rapidExchangeValid = (() => {
                        if (gripTests.length === 0) return null; // no grip tests at all

                        const normalize = (s) => (s ? s.toLowerCase() : "");

                        // Identify rapid/exchange tests
                        const rapidTests = allTests.filter((t) => {
                          const n = normalize(t.testName);
                          return (
                            n.includes("rapid") ||
                            n.includes("exchange") ||
                            n.includes("rapid-exchange") ||
                            n.includes("rapid exchange")
                          );
                        });

                        // Find a standard grip test (prefer position 2 / pos 2 / standard); fallback to the grip test with highest average
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

                        if (!standardTest) {
                          standardTest = gripTests.reduce((best, cur) => {
                            const bestAvg =
                              (calculateAverage(best.leftMeasurements) +
                                calculateAverage(best.rightMeasurements)) /
                              2;
                            const curAvg =
                              (calculateAverage(cur.leftMeasurements) +
                                calculateAverage(cur.rightMeasurements)) /
                              2;
                            return curAvg > bestAvg ? cur : best;
                          }, gripTests[0]);
                        }

                        if (!standardTest || rapidTests.length === 0)
                          return null; // not applicable if either missing

                        const avgAcross = (tests, side) => {
                          const vals = tests
                            .map((t) => {
                              const m =
                                side === "left"
                                  ? t.leftMeasurements
                                  : t.rightMeasurements;
                              return calculateAverage(m);
                            })
                            .filter((v) => v > 0);
                          if (vals.length === 0) return 0;
                          return vals.reduce((s, v) => s + v, 0) / vals.length;
                        };

                        const rapidLeftAvg = avgAcross(rapidTests, "left");
                        const rapidRightAvg = avgAcross(rapidTests, "right");

                        const stdLeftAvg = calculateAverage(
                          standardTest.leftMeasurements,
                        );
                        const stdRightAvg = calculateAverage(
                          standardTest.rightMeasurements,
                        );

                        const comparisons = [];
                        if (stdLeftAvg > 0 && rapidLeftAvg > 0)
                          comparisons.push(rapidLeftAvg <= stdLeftAvg * 0.85);
                        if (stdRightAvg > 0 && rapidRightAvg > 0)
                          comparisons.push(rapidRightAvg <= stdRightAvg * 0.85);

                        if (comparisons.length === 0) return null; // insufficient data

                        return comparisons.every(Boolean);
                      })();

                      crosschecks.push({
                        name: "Hand grip rapid exchange",
                        description:
                          "Rapid Exchange Grip was 15% less to equal that of the Std position 2 Hand Grip measure.",
                        pass: rapidExchangeValid,
                        applicable: rapidExchangeValid !== null,
                      });

                      // Hand grip MVE check
                      const gripMVEValid =
                        gripTests.length > 0
                          ? gripTests.every((test) => {
                              const leftAvg = calculateAverage(
                                test.leftMeasurements,
                              );
                              const rightAvg = calculateAverage(
                                test.rightMeasurements,
                              );
                              const bilateralDiff =
                                calculateBilateralDeficiency(leftAvg, rightAvg);
                              return bilateralDiff <= 20; // MVE criteria
                            })
                          : null;

                      crosschecks.push({
                        name: "Hand grip MVE",
                        description:
                          "Position 1 through 5 displayed a bell curve showing greatest strength in position 2-3.",
                        pass: gripMVEValid,
                        applicable: gripTests.length > 0,
                      });

                      // Pinch grip consistency check
                      const pinchValid =
                        pinchTests.length > 0
                          ? pinchTests.every((test) => {
                              const leftCV = calculateCV(test.leftMeasurements);
                              const rightCV = calculateCV(
                                test.rightMeasurements,
                              );
                              return leftCV <= 15 && rightCV <= 15;
                            })
                          : null; // No pinch tests available

                      crosschecks.push({
                        name: "Pinch grip key/tip/palmar ratio",
                        description:
                          "Key grip was greater than palmar which was greater than tip grip.",
                        pass: pinchValid,
                        applicable: pinchTests.length > 0,
                      });

                      // Dynamic lift HR fluctuation check — pass if any dynamic lift (low/mid/high/overhead/frequent) shows postHR > preHR
                      const dynamicLifts = liftTests.filter((test) => {
                        const n = (test.testName || "").toLowerCase();
                        return (
                          n.includes("low") ||
                          n.includes("mid") ||
                          n.includes("high") ||
                          n.includes("overhead") ||
                          n.includes("frequent") ||
                          n.includes("dynamic")
                        );
                      });

                      const hrConsistent =
                        dynamicLifts.length > 0
                          ? dynamicLifts.some((test) => {
                              const preHR =
                                test.leftMeasurements?.preHeartRate ??
                                test.rightMeasurements?.preHeartRate ??
                                0;
                              const postHR =
                                test.leftMeasurements?.postHeartRate ??
                                test.rightMeasurements?.postHeartRate ??
                                0;
                              return postHR > preHR;
                            })
                          : null; // Not applicable if no dynamic lifts found

                      crosschecks.push({
                        name: "Dynamic lift HR fluctuation",
                        description:
                          "Client displayed an increase in heart rate when weight and/or repetitions were increased (any dynamic lift: low, mid, high, overhead, or frequent).",
                        pass: hrConsistent,
                        applicable: dynamicLifts.length > 0,
                      });

                      // ROM consistency check
                      const romValid =
                        romTests.length > 0
                          ? romTests.every((test) => {
                              // Extract trial values from measurement objects
                              const leftTrials = test.leftMeasurements
                                ? [
                                    test.leftMeasurements.trial1,
                                    test.leftMeasurements.trial2,
                                    test.leftMeasurements.trial3,
                                    test.leftMeasurements.trial4,
                                    test.leftMeasurements.trial5,
                                    test.leftMeasurements.trial6,
                                  ].filter((val) => val != null && !isNaN(val))
                                : [];

                              const rightTrials = test.rightMeasurements
                                ? [
                                    test.rightMeasurements.trial1,
                                    test.rightMeasurements.trial2,
                                    test.rightMeasurements.trial3,
                                    test.rightMeasurements.trial4,
                                    test.rightMeasurements.trial5,
                                    test.rightMeasurements.trial6,
                                  ].filter((val) => val != null && !isNaN(val))
                                : [];

                              const allMeasurements = [
                                ...leftTrials,
                                ...rightTrials,
                              ];
                              if (allMeasurements.length < 6) return false;

                              // Find three consecutive trials within 5 degrees and 10% of each other
                              for (
                                let i = 0;
                                i <= allMeasurements.length - 3;
                                i++
                              ) {
                                const trial1 = allMeasurements[i];
                                const trial2 = allMeasurements[i + 1];
                                const trial3 = allMeasurements[i + 2];

                                // Check if three consecutive trials are within 5 degrees of each other
                                const maxDiff = Math.max(
                                  Math.abs(trial1 - trial2),
                                  Math.abs(trial2 - trial3),
                                  Math.abs(trial1 - trial3),
                                );

                                // Check if within 10% of each other
                                const avgValue = (trial1 + trial2 + trial3) / 3;
                                const maxPercDiff = Math.max(
                                  (Math.abs(trial1 - avgValue) / avgValue) *
                                    100,
                                  (Math.abs(trial2 - avgValue) / avgValue) *
                                    100,
                                  (Math.abs(trial3 - avgValue) / avgValue) *
                                    100,
                                );

                                if (maxDiff <= 5 && maxPercDiff <= 10) {
                                  return true; // Found valid consecutive trials
                                }
                              }
                              return false;
                            })
                          : null;

                      crosschecks.push({
                        name: "ROM consistency check",
                        description:
                          "During total spine ROM, the client provided three consecutive trials between 5 degrees and 10% of each other in a six-trial session.",
                        pass: romValid,
                        applicable: romTests.length > 0,
                      });

                      // Overall test/retest consistency
                      // Check for similar values (CV consistency)
                      const validTests = allTests.filter((test) => {
                        const leftCV = calculateCV(test.leftMeasurements);
                        const rightCV = calculateCV(test.rightMeasurements);
                        return leftCV <= 15 && rightCV <= 15;
                      });
                      const similarValues =
                        allTests.length > 0
                          ? validTests.length / allTests.length >= 0.8
                          : null;

                      // Check for consistent left/right deficiency patterns
                      let consistentDeficiency = true;
                      if (allTests.length > 1) {
                        const firstTestLeftAvg = calculateAverage(
                          allTests[0].leftMeasurements,
                        );
                        const firstTestRightAvg = calculateAverage(
                          allTests[0].rightMeasurements,
                        );
                        const firstTestWeakerSide =
                          firstTestLeftAvg < firstTestRightAvg
                            ? "left"
                            : "right";

                        // Check if the same side remains weaker across all repeated tests
                        for (let i = 1; i < allTests.length; i++) {
                          const leftAvg = calculateAverage(
                            allTests[i].leftMeasurements,
                          );
                          const rightAvg = calculateAverage(
                            allTests[i].rightMeasurements,
                          );
                          const weakerSide =
                            leftAvg < rightAvg ? "left" : "right";

                          if (weakerSide !== firstTestWeakerSide) {
                            consistentDeficiency = false;
                            break;
                          }
                        }
                      }

                      // Pass only if both similar values AND consistent left/right deficiency
                      const overallValid =
                        allTests.length > 0
                          ? similarValues && consistentDeficiency
                          : null;

                      crosschecks.push({
                        name: "Test/retest trial consistency",
                        description:
                          "When tests were repeated the client displayed similar values and left/right deficiency.",
                        pass: overallValid,
                        applicable: allTests.length > 0,
                      });

                      // Dominant side monitoring check
                      const dominantSideValid =
                        allTests.length > 0
                          ? allTests.every((test) => {
                              const leftAvg = calculateAverage(
                                test.leftMeasurements,
                              );
                              const rightAvg = calculateAverage(
                                test.rightMeasurements,
                              );

                              // For right-handed (majority): expect ~10% greater on right side
                              // For left-handed: expect values to be close to same
                              // Since handedness data not available, use 10% threshold as per description
                              const ratio =
                                Math.max(leftAvg, rightAvg) /
                                Math.min(leftAvg, rightAvg);
                              return (
                                ratio <= 1.1 || // 10% difference threshold as per description
                                Math.min(leftAvg, rightAvg) === 0
                              );
                            })
                          : null; // No tests available

                      crosschecks.push({
                        name: "Dominant side monitoring",
                        description:
                          "It is expected that if the client is Right-Handed, he/she will demonstrate approx.10% greater values on the dominant side – if Left-Handed then the values would be close to the same.",
                        pass: dominantSideValid,
                        applicable: allTests.length > 0,
                      });

                      // Distraction test consistency - Based on evaluator input from referral question 6b
                      if (referralQuestionsData.questions) {
                        const distractionQuestion =
                          referralQuestionsData.questions.find(
                            (q) =>
                              q.question &&
                              q.question.includes(
                                "6b) Distraction test consistency",
                              ),
                          );

                        if (distractionQuestion) {
                          // Parse new format: "PASS|comments" or "FAIL|comments"
                          const answerParts =
                            distractionQuestion.answer?.split("|") || [];
                          const status = answerParts[0] || "";
                          const distractionPass = status
                            .toUpperCase()
                            .includes("PASS");

                          crosschecks.push({
                            name: "Distraction test consistency",
                            description:
                              "When performing distraction tests for sustained posture the client should demonstrate similar limitations and or abilities.",
                            pass: distractionPass,
                            applicable: true,
                          });
                        }
                      }

                      // Consistency with diagnosis - Based on evaluator input from referral question 6c
                      if (referralQuestionsData.questions) {
                        const diagnosisQuestion =
                          referralQuestionsData.questions.find(
                            (q) =>
                              q.question &&
                              q.question.includes(
                                "6c) Consistency with diagnosis",
                              ),
                          );

                        if (diagnosisQuestion) {
                          // Parse new format: "PASS|comments" or "FAIL|comments"
                          const answerParts =
                            diagnosisQuestion.answer?.split("|") || [];
                          const status = answerParts[0] || "";
                          const diagnosisPass = status
                            .toUpperCase()
                            .includes("PASS");

                          crosschecks.push({
                            name: "Consistency with diagnosis",
                            description:
                              "Based on the diagnosis and complaints of the individual it is expected that those issues would relate to a similar function performance pattern during testing.",
                            pass: diagnosisPass,
                            applicable: true,
                          });
                        }
                      }

                      // Coefficient of Variation analysis
                      const validCVTests = allTests.filter((test) => {
                        const leftCV = calculateCV(test.leftMeasurements);
                        const rightCV = calculateCV(test.rightMeasurements);
                        return leftCV < 15 && rightCV < 15; // CV less than 15% as per description
                      });
                      const cvValid =
                        allTests.length > 0
                          ? validCVTests.length / allTests.length >= 0.7
                          : null;

                      crosschecks.push({
                        name: "Coefficient of Variation (CV)",
                        description:
                          "We would expect to see a CV less than 15% for a client that is deemed to be consistent.",
                        pass: cvValid,
                        applicable: allTests.length > 0,
                      });

                      // No overall consistency item - only the 10 specific items requested

                      return crosschecks
                        .map(
                          (check, index) => `
                            <tr>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">${check.name}</td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">${check.description}</td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">${!check.applicable ? "N/A" : check.pass ? "✓" : ""}</td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">${!check.applicable ? "N/A" : !check.pass ? "✓" : ""}</td>
                            </tr>
                        `,
                        )
                        .join("");
                    })()}
                </tbody>
            </table>

        </div>

        <!-- Test Results and Job Match Analysis (COMMENTED OUT) -->
        <!--
        <div style="margin-top: 30px;">
            <h4 style="font-weight: bold; margin-bottom: 16px;">Test Results and Job Match Analysis:</h4>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #cce7ff;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Test</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Job Match</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Job Demands</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">Job Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${testData.tests
                      .map((test: any, index: number) => {
                        // Determine if test passed based on demonstrated status and effort
                        const testPassed =
                          test.demonstrated &&
                          test.effort &&
                          !test.effort.toLowerCase().includes("poor") &&
                          !test.effort
                            .toLowerCase()
                            .includes("extremely light");

                        return `
                            <tr>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-weight: bold;">${
                                  test.testName
                                }</td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">
                                    ${
                                      test.jobMatch === "yes"
                                        ? '<span style="background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">Yes</span>'
                                        : test.jobMatch === "no"
                                          ? '<span style="background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">No</span>'
                                          : '<span style="color: #6c757d;">-</span>'
                                    }
                                </td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">
                                    ${
                                      test.jobDemands === "normal"
                                        ? '<span style="background: #e1f5fe; color: #01579b; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">Normal</span>'
                                        : test.jobDemands === "other"
                                          ? '<span style="background: #fff3e0; color: #e65100; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">Other</span>'
                                          : '<span style="color: #6c757d;">-</span>'
                                    }
                                </td>
                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">
                                    <div style="font-size: 10px;">
                                        ${
                                          test.jobDescription
                                            ? `<span style="font-style: italic; color: #495057;">"${test.jobDescription}"</span>`
                                            : '<span style="color: #6c757d;">No description provided</span>'
                                        }
                                    </div>
                                </td>
                            </tr>
                        `;
                      })
                      .join("")}
                </tbody>
            </table>

            <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; text-align: center;">
                <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 16px; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: #155724;">${
                      testData.tests.filter(
                        (test: any) =>
                          test.demonstrated &&
                          test.effort &&
                          !test.effort.toLowerCase().includes("poor") &&
                          !test.effort
                            .toLowerCase()
                            .includes("extremely light"),
                      ).length
                    }</div>
                    <div style="font-size: 12px; color: #155724; font-weight: bold;">Tests Passed</div>
                </div>
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 16px; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: #721c24;">${
                      testData.tests.filter(
                        (test: any) =>
                          !test.demonstrated ||
                          (test.effort &&
                            (test.effort.toLowerCase().includes("poor") ||
                              test.effort
                                .toLowerCase()
                                .includes("extremely light"))),
                      ).length
                    }</div>
                    <div style="font-size: 12px; color: #721c24; font-weight: bold;">Tests Failed</div>
                </div>
                <div style="background: #cce7ff; border: 1px solid #b3d7ff; padding: 16px; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: #004085;">${Math.round(
                      (testData.tests.filter(
                        (test: any) =>
                          test.demonstrated &&
                          test.effort &&
                          !test.effort.toLowerCase().includes("poor") &&
                          !test.effort
                            .toLowerCase()
                            .includes("extremely light"),
                      ).length /
                        testData.tests.length) *
                        100,
                    )}%</div>
                    <div style="font-size: 12px; color: #004085; font-weight: bold;">Job Match Rate</div>
                </div>
            </div>
        </div>
        -->
    </div>


    <div style="page-break-before: always;"></div>

    <!-- Client Perceived Activity Rating Chart -->
    ${
      activityRatingData.activities
        ? `
    <div style="padding: 16px; margin-top: 12px;">
        <h3 style="font-weight: bold; margin-bottom: 8px; font-family: Arial, sans-serif; text-align: left;">Client Perceived Activity Rating Chart</h3>
        <p style="font-size: 14px; font-style: italic; margin-bottom: 8px; font-family: Arial, sans-serif;">
            The Activity Rating Chart is a measure of the client's perceived ability level at the time of testing and is a representation of their subjective responses.
        </p>

        <div style="padding: 4px; background: white; max-width: 750px; margin: 0 auto; border: 1px solid #9ca3af;">
            <div style="display: flex; flex-direction: column; gap: 0px;">
                ${activityRatingData.activities
                  .map((activity, index) => {
                    const rating = activity.rating || 0;
                    // Define different colors for each activity (exact same as ReviewReport)
                    const barColors = [
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
                    ];

                    return `
                <div style="display: flex; align-items: center; margin: 0; padding: 0; line-height: 0;">
                    <div style="width: 80px; font-size: 12px; font-weight: 500; padding-right: 8px; font-family: Arial, sans-serif; height: 20px; display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${activity.name}
                    </div>
                    <div style="flex: 1; margin: 0; border-left: 1px solid #374151; border-bottom: ${index === activityRatingData.activities.length - 1 ? "1px solid #374151" : "none"};">
                        <div style="height: 20px; position: relative; background: linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px); background-size: 10px 10px;">
                            <div style="
                                height: 20px;
                                display: flex;
                                align-items: center;
                                justify-content: flex-end;
                                padding-right: 4px;
                                width: ${(rating / 10) * 100}%;
                                background-color: ${barColors[index % barColors.length]};
                                border: 1px solid #374151;
                                border-left: none;
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            ">
                            </div>
                        </div>
                    </div>
                </div>
            `;
                  })
                  .join("")}
            </div>

            <!-- Scale indicators at bottom (exact copy from ReviewReport) -->
            <div style="margin-top: 4px; display: flex; align-items: center;">
                <div style="width: 80px;"></div>
                <div style="flex: 1; margin: 0 4px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; font-family: Arial, sans-serif;">
                        <span>0</span>
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                        <span>5</span>
                        <span>6</span>
                        <span>7</span>
                        <span>8</span>
                        <span>9</span>
                        <span>10</span>
                    </div>
                </div>
            </div>

        </div>
        <div style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 8px; font-family: Arial, sans-serif;">
            ${new Date().toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            })} 9:51:46 AM
        </div>
    </div>
    `
        : ""
    }

        <!-- Individual FACTS Test Results (Combined with Graphs) -->
        ${testData.tests
          .filter((test: any) => {
            // Exclude occupational/MTM tests from regular test results
            // They will be shown in the MTM section instead
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

            const isOccupational =
              occupationalTestIds.includes(test.testId) ||
              test.testName
                ?.toLowerCase()
                .match(
                  /(fingering|handling|reach|balance|stoop|walk|push|pull|cart|crouch|carry|crawl|climb|kneel)/i,
                );

            return !isOccupational;
          })
          .map((test: any, testIndex: number) => {
            let leftAvg = calculateAverage(test.leftMeasurements);
            const rightAvg = calculateAverage(test.rightMeasurements);
            let leftCV = calculateCV(test.leftMeasurements);
            let rightCV = calculateCV(test.rightMeasurements);
            const leftTrialValues = extractTrialValues(test.leftMeasurements);
            const rightTrialValues = extractTrialValues(test.rightMeasurements);
            const singleTrialValues = extractTrialValues(test.measurements);
            const hasLeftTrials = leftTrialValues.length > 0;
            const hasRightTrials = rightTrialValues.length > 0;
            const hasSeparateSides = hasLeftTrials && hasRightTrials;
            const useSingleMeasurementSet =
              !hasSeparateSides && singleTrialValues.length > 0;
            const primaryMeasurements = (
              useSingleMeasurementSet
                ? test.measurements || {}
                : test.leftMeasurements || {}
            ) as Record<string, number>;
            const secondaryMeasurements = (test.rightMeasurements ||
              {}) as Record<string, number>;
            if (!hasLeftTrials && useSingleMeasurementSet) {
              leftAvg = calculateAverage(primaryMeasurements);
              leftCV = calculateCV(primaryMeasurements);
              rightCV = calculateCV(primaryMeasurements);
            }
            if (
              !hasRightTrials &&
              !hasSeparateSides &&
              !useSingleMeasurementSet
            ) {
              rightCV = calculateCV(secondaryMeasurements);
            }
            const testName = test.testName.toLowerCase();

            // Define unit at outer scope so it's accessible throughout the template
            // const unit = String(test.unitMeasure || "lbs").toLowerCase();
            // const isRangeOfMotion =
            //   testName.includes("flexion") ||
            //   testName.includes("extension") ||
            //   testName.includes("range");
            const isRangeOfMotion =
              testName.includes("flexion") ||
              testName.includes("extension") ||
              testName.includes("range") ||
              testName.includes("Thumb") ||
              testName.includes("rotation") ||
              testName.includes("raise") ||
              testName.includes("supination") ||
              testName.includes("radial") ||
              testName.includes("abduction") ||
              testName.includes("inversion");
            const isGripTest =
              testName.includes("grip") || testName.includes("pinch");
            const isLiftTest =
              testName.includes("lift") || testName.includes("carry");
            const isStrengthTest =
              testName.includes("strength") || testName.includes("force");
            const isCardioTest =
              testName.includes("bruce") ||
              testName.includes("treadmill") ||
              testName.includes("mcaft") ||
              testName.includes("kasch") ||
              testName.includes("step") ||
              testName.includes("cardio") ||
              testName.includes("cardiovascular");
            const rawUnit = String(test.unitMeasure || "").toLowerCase();
            const unit = isRangeOfMotion
              ? "°"
              : !rawUnit || rawUnit === "weight"
                ? "lbs"
                : rawUnit;
            const combinedTrialValues = hasSeparateSides
              ? [...leftTrialValues, ...rightTrialValues]
              : useSingleMeasurementSet
                ? singleTrialValues
                : hasLeftTrials
                  ? leftTrialValues
                  : hasRightTrials
                    ? rightTrialValues
                    : [];
            const chartMaxValue = combinedTrialValues.length
              ? Math.max(50, ...combinedTrialValues, leftAvg, rightAvg)
              : Math.max(50, leftAvg, rightAvg);
            const bilateralDef = calculateBilateralDeficiency(
              leftAvg,
              rightAvg,
            );

            const isStaticLift =
              String(test.testId || testName)
                .toLowerCase()
                .includes("static-lift") || testName.includes("static");
            const leftChartTitle = (() => {
              if (isLiftTest) {
                return "";
              }
              if (hasSeparateSides) {
                return "Left Side";
              }
              if (useSingleMeasurementSet) {
                return "";
              }
              if (hasLeftTrials) {
                return "Left Side";
              }
              if (hasRightTrials) {
                return "Right Side";
              }
              return "";
            })();
            const showRightChart = !isLiftTest && hasSeparateSides;

            // Determine if this test needs a page break
            // Force page breaks for first test, lift tests, range of motion tests, and specific tests
            // Pinch tests (Key, Tip) should flow naturally without forced page breaks
            const isPinchTest = testName.includes("pinch");
            const isReachTest = testName.toLowerCase().includes("reach");
            const isStepTest =
              testName.toLowerCase().includes("step") ||
              testName.toLowerCase().includes("mcaft");
            const isTreadmillTest = testName
              .toLowerCase()
              .includes("treadmill");
            // Only add page break for the first test in each major category
            const needsPageBreak = testIndex === 0;

            const illos = getSampleIllustrations(test.testId || testName);
            return `
                <div class="test-section ${isPinchTest ? "pinch-test" : ""}" style="page-break-before: always; padding: 20px 0; position: relative;">
                    <h4 class="test-header" style="font-weight: bold; margin-bottom: 16px; color: #4472C4;">${
                      test.testName
                    }</h4>

                    <!-- Full height vertical line starting below the heading (moved left to match occupational test) -->
                    <div style="position: absolute; left: 150px; top: 60px; bottom: 0; width: 1px; background-color: #333;"></div>

                    <div style="display: grid; grid-template-columns: 160px 1fr; gap: 16px;">
                        <!-- Left Column - Illustrations -->
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <p style="font-size: 11px; font-weight: 400; text-decoration: underline; color: #666; margin: 0;">Sample Illustration:</p>
                            ${illustrationsToHtml(illos)}
                                                    </div

                        <!-- Right Column - Combined Content with Tests and Charts -->
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <!-- Test Description -->
                            <p style="font-size: 11px; line-height: 1.3; text-align: justify; text-justify: inter-word; margin: 0;">
                                ${
                                  isRangeOfMotion
                                    ? "The client was tested in our facility using range of motion inclinometers. The test results were compared to normative data when available."
                                    : isGripTest
                                      ? "The client was tested in our facility using a hand grip evaluation device. The test results were compared to normative data when available. It is expected that the dominant hand will display 10% greater values than the non-dominant hand with the exception of left handed individuals where the hand strength is equal. Strength measurements are in pounds (lbs)."
                                      : isLiftTest
                                        ? "The client was tested in our facility using a dynamic lift evaluation apparatus. The test results were compared to normative data when available."
                                        : isCardioTest
                                          ? testName.includes("bruce") ||
                                            testName.includes("treadmill")
                                            ? "The Bruce Treadmill Test (Bruce Protocol) is commonly used to help identify a person's level of aerobic endurance by providing an all-out maximal oxygen uptake or VO₂ max, which measures the capacity to perform sustained exercise and is linked to aerobic endurance."
                                            : testName.includes("mcaft")
                                              ? ""
                                              : testName.includes("kasch")
                                                ? ""
                                                : "The client was tested in our facility using standardized cardiovascular assessment protocols. The test results were compared to normative data when available."
                                          : "The client was tested in our facility using standardized assessment protocols. The test results were compared to normative data when available."
                                }
                            </p>

                            ${
                              test.testId?.startsWith("dynamic-lift-") &&
                              !test.testId.includes("infrequent")
                                ? `<div style="margin-bottom: 12px; padding: 8px; background-color: #3b82f6; color: white; border-radius: 6px; text-align: center; font-weight: 500; font-size: 11px;">
                                    Note: frequent lifts are four lifts per cycle.
                                </div>`
                                : ""
                            }

                            <!-- Results Section with Combined Tables and Charts -->
                            <div style="margin: 0;">
                                <h4 style="font-weight: bold; margin-bottom: 2px; font-size: 12px;">Results:</h4>

                                ${
                                  isRangeOfMotion
                                    ? `
                                    <!-- Range of Motion Table -->
                                    <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin: 8px 0 12px 0; table-layout: auto;">
                                        <thead>
                                            <tr style="background: #fef3c7;">
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px; text-align: center;">Area Evaluated:</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Data:</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Valid?</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Norm:</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">% of Norm:</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Test Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${
                                                  test.testName
                                                }</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${Math.max(
                                                  leftAvg,
                                                  rightAvg,
                                                ).toFixed(0)} °</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${
                                                  test.demonstrated
                                                    ? "Pass"
                                                    : "Fail"
                                                }</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${
                                                  testName.includes("flexion")
                                                    ? "60 °"
                                                    : testName.includes(
                                                          "extension",
                                                        )
                                                      ? "25 °"
                                                      : "25 °"
                                                }</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${Math.round(
                                                  (Math.max(leftAvg, rightAvg) /
                                                    (testName.includes(
                                                      "flexion",
                                                    )
                                                      ? 60
                                                      : 25)) *
                                                    100,
                                                )}%</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">${currentDate}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                `
                                    : ""
                                }

                                ${
                                  isLiftTest
                                    ? `
                                    <!-- Lift Results - Demonstrated Activity (single row, like ReviewReport) -->
                                    <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin: 8px 0 12px 0; table-layout: auto;">
                                        <thead>
                                            <tr style="background: #fef3c7;">
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Demonstrated Activity</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Avg. Weight (${String(test.unitMeasure || "lbs").toLowerCase()})</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">CV%</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Test Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${test.testName}</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${(() => {
                                                  const unit = String(
                                                    test.unitMeasure ||
                                                      (test as any).unit ||
                                                      "",
                                                  ).toLowerCase();
                                                  const avg =
                                                    unit === "kg"
                                                      ? Math.round(
                                                          leftAvg *
                                                            2.20462 *
                                                            10,
                                                        ) / 10
                                                      : Math.round(
                                                          leftAvg * 10,
                                                        ) / 10;
                                                  return avg.toFixed(1);
                                                })()}</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${leftCV}%</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${currentDate}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                `
                                    : ""
                                }

                                ${
                                  isCardioTest
                                    ? generateCardioTestContent(
                                        test,
                                        test.testName,
                                      )
                                    : ""
                                }

                                ${
                                  !isRangeOfMotion &&
                                  !isLiftTest &&
                                  !isCardioTest
                                    ? `
                                    <!-- Strength/Grip Test Table -->
                                    <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin: 8px 0 12px 0; table-layout: auto;">
                                        <thead>
                                            <tr style="background: #fef3c7;">
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Demonstrated Activity</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Avg. Force (lb)</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Norm (lb)</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">% age Norm</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">% age CV</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Difference</th>
                                                <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Test Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;"></td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Left | Right</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">L | R</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">L | R</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">L | R</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Prev | Total</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;"></td>
                                            </tr>
                                            <tr>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${
                                                  test.testName
                                                }</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${leftAvg.toFixed(
                                                  1,
                                                )} | ${rightAvg.toFixed(1)}</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${
                                                  isGripTest
                                                    ? "110.5 | 120.8"
                                                    : "85.0 | 90.0"
                                                }</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${Math.round(
                                                  (leftAvg /
                                                    (isGripTest
                                                      ? 110.5
                                                      : 85.0)) *
                                                    100,
                                                )}% | ${Math.round(
                                                  (rightAvg /
                                                    (isGripTest
                                                      ? 120.8
                                                      : 90.0)) *
                                                    100,
                                                )}%</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${leftCV}% | ${rightCV}%</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${bilateralDef.toFixed(
                                                  1,
                                                )}%</td>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${currentDate}<br/>10:05:38 AM</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                `
                                    : ""
                                }

                                    <!-- Trial-by-Trial Measurement Table (FOR NON-CARDIO TESTS) -->
                                    ${
                                      !isCardioTest
                                        ? (() => {
                                            const hasAnyTrials =
                                              hasSeparateSides ||
                                              useSingleMeasurementSet ||
                                              hasLeftTrials ||
                                              hasRightTrials;

                                            const averageLabel = isRangeOfMotion
                                              ? "Average (range of motion)"
                                              : "Average (weight)";
                                            const liftTrialSource = (() => {
                                              if (!isLiftTest) {
                                                return null;
                                              }
                                              const leftCount =
                                                leftTrialValues.length;
                                              const rightCount =
                                                rightTrialValues.length;
                                              if (
                                                leftCount === 0 &&
                                                rightCount === 0
                                              ) {
                                                return null;
                                              }
                                              if (leftCount >= rightCount) {
                                                return {
                                                  measurements:
                                                    primaryMeasurements,
                                                  average: leftAvg,
                                                };
                                              }
                                              return {
                                                measurements:
                                                  secondaryMeasurements,
                                                average: rightAvg,
                                              };
                                            })();

                                            if (
                                              !hasAnyTrials &&
                                              !liftTrialSource
                                            ) {
                                              return "";
                                            }

                                            const buildTrialCells = (
                                              source: Record<string, number>,
                                            ) =>
                                              Array.from(
                                                { length: 6 },
                                                (_, idx) => {
                                                  const key =
                                                    `trial${idx + 1}` as keyof typeof source;
                                                  const rawValue = Number(
                                                    source?.[key] ?? 0,
                                                  );
                                                  const displayValue =
                                                    Number.isFinite(rawValue) &&
                                                    rawValue > 0
                                                      ? rawValue
                                                      : 0;
                                                  return `<td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${displayValue}</td>`;
                                                },
                                              ).join("");

                                            const headerCells = Array.from(
                                              { length: 6 },
                                              (_, idx) =>
                                                `<th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">Trial ${idx + 1}</th>`,
                                            ).join("");

                                            if (isLiftTest && liftTrialSource) {
                                              const valueCells =
                                                buildTrialCells(
                                                  liftTrialSource.measurements,
                                                );
                                              const avgValue = Number.isFinite(
                                                liftTrialSource.average,
                                              )
                                                ? liftTrialSource.average
                                                : 0;
                                              return `
                                            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin: 8px 0 12px 0; table-layout: auto;">
                                                <thead>
                                                    <tr style="background: #fef3c7;">
                                                        ${headerCells}
                                                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${averageLabel}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        ${valueCells}
                                                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;"><strong>${avgValue.toFixed(
                                                          1,
                                                        )} ${unit}</strong></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        `;
                                            }

                                            if (useSingleMeasurementSet) {
                                              const valueCells =
                                                buildTrialCells(
                                                  primaryMeasurements,
                                                );

                                              return `
                                            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin: 8px 0 12px 0; table-layout: auto;">
                                                <thead>
                                                    <tr style="background: #fef3c7;">
                                                        ${headerCells}
                                                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${averageLabel}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        ${valueCells}
                                                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;"><strong>${leftAvg.toFixed(
                                                          1,
                                                        )} ${unit}</strong></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        `;
                                            }

                                            const headerLabel = "Side";

                                            const buildRow = (
                                              label: string,
                                              source: Record<string, number>,
                                              averageValue: number,
                                            ) => {
                                              const valueCells =
                                                buildTrialCells(source);
                                              return `<tr>
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;"><strong>${label}</strong></td>
                                                ${valueCells}
                                                <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;"><strong>${averageValue.toFixed(
                                                  1,
                                                )} ${unit}</strong></td>
                                            </tr>`;
                                            };

                                            const rows: string[] = [];

                                            if (hasLeftTrials) {
                                              rows.push(
                                                buildRow(
                                                  "Left",
                                                  primaryMeasurements,
                                                  leftAvg,
                                                ),
                                              );
                                            }
                                            if (
                                              hasSeparateSides ||
                                              hasRightTrials
                                            ) {
                                              rows.push(
                                                buildRow(
                                                  "Right",
                                                  secondaryMeasurements,
                                                  rightAvg,
                                                ),
                                              );
                                            }

                                            if (!rows.length) {
                                              return "";
                                            }

                                            return `
                                            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin: 8px 0 12px 0; table-layout: auto;">
                                                <thead>
                                                    <tr style="background: #fef3c7;">
                                                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${headerLabel}</th>
                                                        ${headerCells}
                                                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 6px;text-align: center;">${averageLabel}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${rows.join("")}
                                                </tbody>
                                            </table>
                                        `;
                                          })()
                                        : ""
                                    }

                                    <!-- Visual Chart Representation (NOT FOR CARDIO TESTS) -->
                                    ${
                                      !isCardioTest
                                        ? `
                                    <div style="display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0;">
                                        <!-- Primary Chart -->
                                        <div style="background: #ffffff; border: 2px solid #3b82f6; border-radius: 8px; padding: 12px; page-break-inside: avoid; flex: 1; min-width: 250px;">
                                            ${(() => {
                                              if (!leftChartTitle) {
                                                return "";
                                              }
                                              return `<div style="background: #3b82f6; color: white; padding: 1px; margin: -12px -12px 12px -12px; font-weight: bold; text-align: center; font-size: 12px;">${leftChartTitle}</div>`;
                                            })()}
                                            <div style="display: flex; align-items: end; justify-content: space-between; height: 120px; padding: 3px 0; position: relative; background: #f8fafc; border-radius: 4px;">
                                                ${(() => {
                                                  const maxValue =
                                                    chartMaxValue;
                                                  return `
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #1e40af, #3b82f6); width: 100%; height: ${computeBarHeight(
                                                              primaryMeasurements?.trial1 ||
                                                                0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #1e40af;"></div>
                                                            <span style="font-size: 8px; color: #1e40af; font-weight: bold;">T1</span>
                                                            <span style="font-size: 7px; color: #374151;">${primaryMeasurements?.trial1 || 0}</span>
                                                        </div>
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #059669, #10b981); width: 100%; height: ${computeBarHeight(
                                                              primaryMeasurements?.trial2 ||
                                                                0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #059669;"></div>
                                                            <span style="font-size: 8px; color: #059669; font-weight: bold;">T2</span>
                                                            <span style="font-size: 7px; color: #374151;">${primaryMeasurements?.trial2 || 0}</span>
                                                        </div>
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #d97706, #f59e0b); width: 100%; height: ${computeBarHeight(
                                                              primaryMeasurements?.trial3 ||
                                                                0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #d97706;"></div>
                                                            <span style="font-size: 8px; color: #d97706; font-weight: bold;">T3</span>
                                                            <span style="font-size: 7px; color: #374151;">${primaryMeasurements?.trial3 || 0}</span>
                                                        </div>
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #dc2626, #ef4444); width: 100%; height: ${computeBarHeight(
                                                              primaryMeasurements?.trial4 ||
                                                                0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #dc2626;"></div>
                                                            <span style="font-size: 8px; color: #dc2626; font-weight: bold;">T4</span>
                                                            <span style="font-size: 7px; color: #374151;">${primaryMeasurements?.trial4 || 0}</span>
                                                        </div>
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #7c3aed, #a855f7); width: 100%; height: ${computeBarHeight(
                                                              primaryMeasurements?.trial5 ||
                                                                0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #7c3aed;"></div>
                                                            <span style="font-size: 8px; color: #7c3aed; font-weight: bold;">T5</span>
                                                            <span style="font-size: 7px; color: #374151;">${primaryMeasurements?.trial5 || 0}</span>
                                                        </div>
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #0891b2, #06b6d4); width: 100%; height: ${computeBarHeight(
                                                              primaryMeasurements?.trial6 ||
                                                                0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #0891b2;"></div>
                                                            <span style="font-size: 8px; color: #0891b2; font-weight: bold;">T6</span>
                                                            <span style="font-size: 7px; color: #374151;">${primaryMeasurements?.trial6 || 0}</span>
                                                        </div>
                                                    `;
                                                })()}
                                            </div>
                                            <div style="text-align: center; font-size: 10px; color: #1e40af; margin-top: 8px; font-weight: bold; background: #dbeafe; padding: 4px; border-radius: 4px;">
                                                Avg: ${leftAvg.toFixed(1)} ${unit}
                                            </div>
                                        </div>

                                        ${
                                          showRightChart
                                            ? `
                                        <!-- Right Side Chart -->
                                        <div style="background: #ffffff; border: 2px solid #10b981; border-radius: 8px; padding: 12px; page-break-inside: avoid; flex: 1; min-width: 250px;">
                                            <div style="background: #10b981; color: white; padding: 1px; margin: -12px -12px 12px -12px; font-weight: bold; text-align: center; font-size: 12px;">Right Side</div>
                                            <div style="display: flex; align-items: end; justify-content: space-between; height: 120px; padding: 3px 0; position: relative; background: #f8fafc; border-radius: 4px;">
                                                ${(() => {
                                                  const maxValue =
                                                    chartMaxValue;
                                                  return `
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #1e40af, #3b82f6); width: 100%; height: ${computeBarHeight(
                                                              test
                                                                .rightMeasurements
                                                                ?.trial1 || 0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #1e40af;"></div>
                                                            <span style="font-size: 8px; color: #1e40af; font-weight: bold;">T1</span>
                                                            <span style="font-size: 7px; color: #374151;">${
                                                              test
                                                                .rightMeasurements
                                                                .trial1 || 0
                                                            }</span>
                                                        </div>
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #059669, #10b981); width: 100%; height: ${computeBarHeight(
                                                              test
                                                                .rightMeasurements
                                                                ?.trial2 || 0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #059669;"></div>
                                                            <span style="font-size: 8px; color: #059669; font-weight: bold;">T2</span>
                                                            <span style="font-size: 7px; color: #374151;">${
                                                              test
                                                                .rightMeasurements
                                                                .trial2 || 0
                                                            }</span>
                                                        </div>
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #d97706, #f59e0b); width: 100%; height: ${computeBarHeight(
                                                              test
                                                                .rightMeasurements
                                                                ?.trial3 || 0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #d97706;"></div>
                                                            <span style="font-size: 8px; color: #d97706; font-weight: bold;">T3</span>
                                                            <span style="font-size: 7px; color: #374151;">${
                                                              test
                                                                .rightMeasurements
                                                                .trial3 || 0
                                                            }</span>
                                                        </div>
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #dc2626, #ef4444); width: 100%; height: ${computeBarHeight(
                                                              test
                                                                .rightMeasurements
                                                                ?.trial4 || 0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #dc2626;"></div>
                                                            <span style="font-size: 8px; color: #dc2626; font-weight: bold;">T4</span>
                                                            <span style="font-size: 7px; color: #374151;">${
                                                              test
                                                                .rightMeasurements
                                                                .trial4 || 0
                                                            }</span>
                                                        </div>
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #7c3aed, #a855f7); width: 100%; height: ${computeBarHeight(
                                                              test
                                                                .rightMeasurements
                                                                ?.trial5 || 0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #7c3aed;"></div>
                                                            <span style="font-size: 8px; color: #7c3aed; font-weight: bold;">T5</span>
                                                            <span style="font-size: 7px; color: #374151;">${
                                                              test
                                                                .rightMeasurements
                                                                .trial5 || 0
                                                            }</span>
                                                        </div>
                                                        <div style="width: 15%; display: flex; flex-direction: column; align-items: center;">
                                                            <div style="background: linear-gradient(to top, #0891b2, #06b6d4); width: 100%; height: ${computeBarHeight(
                                                              test
                                                                .rightMeasurements
                                                                ?.trial6 || 0,
                                                              maxValue,
                                                            )}px; margin-bottom: 4px; border-radius: 2px; min-height: 2px; border: 1px solid #0891b2;"></div>
                                                            <span style="font-size: 8px; color: #0891b2; font-weight: bold;">T6</span>
                                                            <span style="font-size: 7px; color: #374151;">${
                                                              test
                                                                .rightMeasurements
                                                                .trial6 || 0
                                                            }</span>
                                                        </div>
                                                    `;
                                                })()}
                                            </div>
                                            <div style="text-align: center; font-size: 10px; color: #10b981; margin-top: 8px; font-weight: bold; background: #d1fae5; padding: 4px; border-radius: 4px;">
                                                Avg: ${rightAvg.toFixed(1)} ${unit}
                                            </div>
                                        </div
                                        `
                                            : ""
                                        }>
                                    </div>

                                    ${
                                      showRightChart
                                        ? `
                                    <!-- Comparison Summary -->
                                    <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 8px; margin: 8px 0; text-align: center;">
                                        <div style="font-size: 11px; color: #666;">
                                            <strong>Bilateral Difference:</strong> ${Math.abs(leftAvg - rightAvg).toFixed(1)} ${unit} |
                                            <strong>CV:</strong> L=${leftCV}% R=${rightCV}% |
                                            <strong>Bilateral Deficiency:</strong> ${bilateralDef.toFixed(1)}%
                                        </div>
                                    </div>
                                    `
                                        : ""
                                    }
                                    `
                                        : ""
                                    }

                                ${
                                  test.effort
                                    ? `<p style="font-size: 11px; margin: 4px 0 0px 0;">*Rating of Perceived Effort = ${
                                        test.perceived || test.effort
                                      }</p>`
                                    : ""
                                }

                                ${
                                  !test.demonstrated &&
                                  !isCardioTest &&
                                  !isStaticLift
                                    ? (() => {
                                        const endpointLabel =
                                          resolveDynamicEndpointLabel(test);
                                        const isDynamicLift = (
                                          test.testName || ""
                                        )
                                          .toLowerCase()
                                          .includes("dynamic");
                                        const endpointMarkup =
                                          isDynamicLift && endpointLabel
                                            ? `<p style="font-size: 11px; font-weight: bold; margin-top: 8px;">Endpoint condition (for full description refer to references):</p>
                                        <p style="font-size: 11px;">${endpointLabel}</p>`
                                            : "";
                                        return `
                                    <div style="margin: 8px 0 12px 0;">
                                        <p style="font-size: 11px; font-weight: bold;">Reason For Incomplete Test:</p>
                                        <p style="font-size: 11px;">Limited by pain/discomfort</p>
                                        ${endpointMarkup}
                                    </div>
                                `;
                                      })()
                                    : ""
                                }
                            </div>

                            <!-- Heart Rate Data if available (general tests) -->
                            ${(() => {
                              const pre = Number(
                                (test.leftMeasurements &&
                                  test.leftMeasurements.preHeartRate) ||
                                  (test.rightMeasurements &&
                                    test.rightMeasurements.preHeartRate) ||
                                  0,
                              );
                              const post = Number(
                                (test.leftMeasurements &&
                                  test.leftMeasurements.postHeartRate) ||
                                  (test.rightMeasurements &&
                                    test.rightMeasurements.postHeartRate) ||
                                  0,
                              );
                              return pre || post
                                ? `
                                  <div style="font-size: 11px; color: #374151; margin:0;">
                                    <strong>Heart Rate:</strong>
                                    ${pre ? ` Pre: ${pre} bpm` : ""}
                                    ${post ? ` Post: ${post} bpm` : ""}
                                  </div>
                                `
                                : "";
                            })()}

                            ${(() => {
                              if (!isLiftTest) {
                                return "";
                              }
                              const testNameLower = (
                                test.testName || ""
                              ).toLowerCase();
                              const isDynamicLift =
                                testNameLower.includes("dynamic frequent") ||
                                testNameLower.includes("dynamic infrequent") ||
                                testNameLower.includes("dynamic");
                              if (!isDynamicLift) {
                                return "";
                              }
                              const label = resolveDynamicEndpointLabel(test);
                              if (!label) {
                                return "";
                              }
                              return `<div style="font-size: 11px; color: #374151; margin: 6px 0;">
                                <strong>Endpoint condition (for full description refer to references):</strong> ${label}
                              </div>`;
                            })()}

                           
                            ${
                              test.comments
                                ? `<p style="font-style: italic; font-size: 11px; margin: 0px 0 0px 0;"><strong>Comments:</strong> ${test.comments}</p>`
                                : ""
                            }

              <!-- References section for each test -->
              <div class="test-references" style="margin-top: 0px; padding: 4px; background: #f9f9f9; border-left: 3px solid #ddd;">
                  <p style="font-size: 9px; font-weight: bold; color: #666; margin-bottom: 2px; font-family: Arial, sans-serif;">References:</p>
                  <div style="font-size: 8px; color: #888; line-height: 1.3; font-family: Arial, sans-serif;">
                      ${(() => {
                        // Check test type and return specific references
                        const testName = (test.testName || "").toLowerCase();

                        if (testName.includes("kasch")) {
                          return `
                            <p style="margin: 2px 0;">Validation of a bench stepping test for cardiorespiratory fitness classification of emergency service personnel J A Davis, J H Wilmore, PMID: 501456</p>
                          `;
                        } else if (testName.includes("mcaft")) {
                          return `
                            <p style="margin: 2px 0;">· Weller et al. Prediction of maximal oxygen uptake from a modified Canadian aerobic fitness test. Can. J. Appl. Physiol. 18(2) 175-188, 1993</p>
                            <p style="margin: 2px 0;">· Weller et al. A study to validate the Canadian aerobic fitness test. Can. J. Appl. Physiol. 20(2) 211-221, 1995</p>
                          `;
                        } else if (
                          testName.includes("bruce") ||
                          testName.includes("treadmill")
                        ) {
                          return `
                            <p style="margin: 2px 0;">· Bires AM, Lawson D, Wasser TE, Raber-Baer D. Comparison of Bruce treadmill exercise test protocols: is ramped Bruce equal or superior to standard bruce in producing clinically valid studies for patients presenting for evaluation of cardiac ischemia or arrhythmia with body mass index equal to or greater than 30? J Nucl Med Technol. 2013 Dec;41(4):274-8</p>
                            <p style="margin: 2px 0;">· Poehling CP, Llewellyn TL. The Effects of Submaximal and Maximal Exercise on Heart Rate Variability. Int J Exerc Sci. 2019;12(2):9-14.</p>
                          `;
                        } else {
                          // Use shared reference system for other tests
                          const references = getReferencesForTest(test.testId);

                          if (references.length === 0) {
                            // Fallback references for general functional capacity evaluation
                            return `
                              <p style="margin: 2px 0;">Innes, E., & Straker, L. (1999). Reliability of work-related assessments. Work, 13(2), 107-124.</p>
                              <p style="margin: 2px 0;">Matheson, L.N., et al. (1995). Development of a database of functional assessment measures related to work disability. Journal of Occupational Rehabilitation, 5(4), 191-204.</p>
                              <p style="margin: 2px 0;">Reneman, M.F., et al. (2002). Reliability of a functional capacity evaluation in patients with chronic low back pain. Journal of Occupational Rehabilitation, 12(4), 277-286.</p>
                            `;
                          }

                          // Remove numbering from all references
                          return references
                            .map(
                              (ref) =>
                                `<p style="margin: 2px 0;">${formatReference(ref)}</p>`,
                            )
                            .join("");
                        }
                      })()}
                  </div>
              </div>
                        </div>
                    </div>
                </div>
            `;
          })
          .join("")}
    </div>
    `
        : ""
    }


    </div>

    <!-- Occupational Tasks Methods Time Measurement Analysis -->
    ${generateMTMContent(mtmTestData, testData)}

    <!-- Appendix One - Reference Charts -->
    <div style="page-break-before: always; padding: 40px 0;">
  <h3 style="font-weight: bold; margin-bottom: 15px; font-family: Arial, sans-serif;">Appendix One: Reference Charts</h3>
        <!-- Perceived Exertion and Pain Scales -->
        <div style="margin-bottom: 40px;">
          
  <h3 style="font-weight: bold; margin-bottom: 15px; font-family: Arial, sans-serif;">Perceived Exertion and Pain Scales</h3>
            <div style="border: 1px solid #333; margin-bottom: 20px;">
            <table class="center-cells" style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #333; font-size: 10px; text-align: center;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">Perceived Exertion</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">Rating (RPE)</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">Minimal Heart Rate</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">Mean Heart Rate</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">Maximal Heart Rate</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">no exertion at all</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">6</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">69</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">77</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">91</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">extremely light</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">7</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">76</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">85</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">101</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;"></td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">8</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">83</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">93</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">111</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">very light</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">9</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">89</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">101</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">122</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;"></td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">10</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">96</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">110</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">132</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">light</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">11</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">103</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">118</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">142</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;"></td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">12</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">110</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">126</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">153</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">somewhat hard</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">13</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">116</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">135</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">163</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;"></td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">14</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">123</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">143</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">173</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">hard (heavy)</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">15</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">130</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">151</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">184</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;"></td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">16</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">137</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">159</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">194</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">very hard</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">17</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">143</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">168</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">204</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;"></td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">18</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">150</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">176</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">215</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">extremely hard</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">19</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">157</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">184</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">225</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">maximal exertion</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">20</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">164</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">193</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;">235</td></tr>
                </tbody>
            </table>
            </div>

            <p style="font-size: 10px; font-style: italic; color: #666; margin-bottom: 20px;">*Borg G. Borg's Perceived Exertion and Pain Scales. Human Kinetics. 1998.</p>
        </div>

        <!-- Physical Demand Characteristics of Work -->
        <div style="margin-bottom: 40px;">
      
  <h3 style="font-weight: bold; margin-bottom: 15px; font-family: Arial, sans-serif;">Physical Demand Characteristics of Work</h3>
            <div style="border: 1px solid #333; margin-bottom: 20px;">
            <table class="center-cells" style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #333; font-size: 10px; text-align: center;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;" colspan="4">Physical Demand Characteristics of Work</th>
                    </tr>
                    <tr style="background: #fef3c7;">
                        <th style="border-left: 1px solid #333; border-right: 1px solid #333; border-bottom: 1px solid #333; border-top: none; padding: 1px; text-align: center;" colspan="4">(Dictionary of Occupational Titles - Volume II, Fourth Edition, Revised 1991)</th>
                    </tr>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">Physical Demand Level</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">SELDOM / OCCASIONALLY<br/>0-33% of the workday</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">FREQUENTLY<br/>34-66% of the workday</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; text-align: center;">CONSTANTLY<br/>67-100% of the workday</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center; font-weight: bold;">Sedentary</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">1 - 10 lbs.</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">Negligible</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">Negligible</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center; font-weight: bold;">Light</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">11 - 25 lbs.</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">1 - 10 lbs.</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">Negligible</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center; font-weight: bold;">Medium</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">26 - 50 lbs.</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">11 - 25 lbs.</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">1 - 10 lbs.</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center; font-weight: bold;">Heavy</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">51 - 100 lbs.</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">26 - 50 lbs.</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">11 - 25 lbs.</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center; font-weight: bold;">Very Heavy</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">Over 100 lbs.</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">Over 50 lbs.</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px;text-align: center;">Over 25 lbs.</td></tr>
                </tbody>
            </table>
            </div>
        </div>

        <!-- PDC Categories based on Sustainable Energy Level -->
        <div style="margin-bottom: 15px; page-break-inside: avoid;">

            <h3 style="font-weight: bold; margin-bottom: 8px; font-family: Arial, sans-serif;">PDC Categories based on Sustainable Energy Level</h3>

            <div style="border: 1px solid #333; margin-bottom: 0;">
            <table class="center-cells" style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #333; font-size: 9px; text-align: center;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; text-align: center;" colspan="2">PDC Categories based on Sustainable Energy Level (Energy Cost) over an 8-hour workday</th>
                    </tr>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; text-align: center;">PDC Category</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; text-align: center;">Sustainable Energy Level</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; font-weight: bold;">Sedentary</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px;">&lt; 1.7 Kcal/min</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; font-weight: bold;">Light</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px;">1.7 to 3.2 Kcal/min</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; font-weight: bold;">Medium</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px;">3.3 to 5.7 Kcal/min</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; font-weight: bold;">Heavy</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px;">5.8 to 8.2 Kcal/min</td></tr>
                    <tr><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; font-weight: bold;">Very Heavy</td><td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px;">8.3 or more Kcal/min</td></tr>
                </tbody>
            </table>
            </div>
        </div>

        <!-- General Patterns of Activity Descriptors -->
        <div style="margin-bottom: 8px; page-break-inside: avoid;">

<h3 style="font-weight: bold; margin-bottom: 8px; font-family: Arial, sans-serif;">General Patterns of Activity Descriptors</h3>
            <div style="font-size: 10px; line-height: 1.3;">
                <div style="margin-bottom: 6px;">
                    <p style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">(S) Sedentary Work</p>
                    <p style="line-height: 1.3; text-align: justify;">Exerting up to 10 lbs of force occasionally and/or a negligible amount of force frequently to lift, carry, push, pull, or otherwise move objects, including the human body. Sedentary work involves sitting most of the time but may involve walking or standing for brief periods of time. Jobs are sedentary if walking and standing are required occasionally and all other sedentary criteria are met.</p>
                </div>

                <div style="margin-bottom: 6px;">
                    <p style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">(L) Light Work</p>
                    <p style="line-height: 1.3; text-align: justify;">Exerting up to 20 lb of force occasionally, and/or up to 10 lb of force frequently, and/or a negligible amount of force constantly to move objects. Physical demand requirements are in excess of those for sedentary work. Even though the weight lifted may be only negligible, a job should be rated "Light Work: (1) when it requires walking or standing to a significant degree; or (2) when it requires sitting most of the time but entails pushing and/or pulling of arm or leg controls; and/or (3) when the job requires working at a production rate pace entailing the constant pushing and/or pulling of materials even though the weight of those materials is negligible. The constant stress and strain of maintaining a production rate pace, especially in an industrial setting, can be and is physically exhausting.</p>
                </div>

                <div style="margin-bottom: 6px;">
                    <p style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">(M) Medium Work</p>
                    <p style="line-height: 1.3; text-align: justify;">Exerting 20 to 50 lbs of force occasionally, and/or 10 to 25 lbs of force frequently, and/or greater than negligible up to 10 lbs of force constantly to move objects. Physical demand requirements are in excess of those for light work.</p>
                </div>

                <div style="margin-bottom: 6px;">
                    <p style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">(H) Heavy Work</p>
                    <p style="line-height: 1.3; text-align: justify;">Exerting 50 to 100 lbs of force occasionally, and/or 25 to 50 lbs of force frequently, and/or 10 to 20 lbs of force constantly to move objects. Physical demand requirements are in excess of those for medium work.</p>
                </div>

                <div style="margin-bottom: 8px;">
                    <p style="font-style: italic; color: #666; line-height: 1.3; font-size: 9px; text-align: justify;">*"Occasionally" indicates that an activity or condition exists up to one third of the time; "frequently" indicates that an activity or condition exists from one third to two thirds of the time; "constantly" indicates that an activity or condition exists two thirds or more of the time.</p>
                </div>
            </div>
        </div>

        <!-- Dynamic Lift Test End Point Conditions -->
        <div style="margin-bottom: 20px; margin-top: 0; page-break-inside: avoid;">
  <h3 style="font-weight: bold; margin-bottom: 5px; font-family: Arial, sans-serif;">Dynamic Lift Test End Point Conditions</h3>
            <div style="border: 1px solid #333;">
            <table class="center-cells" style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #333; font-size: 8px; text-align: center;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; text-align: center;" colspan="2">Test End Point Conditions</th>
                    </tr>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; text-align: center;">CONDITION</th>
                        <th style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; text-align: center;">DESCRIPTION</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 0px; font-weight: bold;">Biomechanical</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">The biomechanical stopping point follows the biomechanics of the person as they perform the activity. While you will not be able to teach proper body mechanics during the relatively short duration of an FCE, you should encourage proper body mechanics. Ultimately, you will be assessing the client’s capacity as he or she moves in their usual way to complete each task. The biomechanical stopping point relies on your clinical observation skills and knowledge of proper body mechanics.</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-weight: bold;">Physiological</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">Physiological response to testing refers to the client’s involuntary reactions to the tests. These reactions include heart rate, blood pressure, respiration rate, changes in pallor, and similar markers. The American College of Sports Medicine recommends keeping the client’s heart rate below 85% of age-predicted maximum heart rate (APMHR) during physically demanding testing, with a recovery to 70% APMHR before commencing the next test.</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-weight: bold;">Psychophysical</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">The psychophysical ending point is based on the client’s perceived rate of exertion—that is, how the client feels or perceives the difficulty of the task. You can use a scale to rate the perception of difficulty, such as the Borg Scale, or simply ask the client to describe their comfort level with the activity. The test should be terminated at the point where the client feels they can no longer continue and has reached their maximum performance level.</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-weight: bold;">Task Requirement</td>
                        <td style="border: 1px solid #333; border-right: 1px solid #333; padding: 1px; font-family: Arial, sans-serif;">A fourth, but still important, stopping criterion is the task requirement. This applies more to return-to-work (RTW) testing when you know the specific physical demands of the job tasks and are assessing the client’s ability to perform them. When the client’s tested ability matches the defined job requirement, you should stop the test because continuing beyond the task requirement could put the client at unnecessary risk.</td>
                    </tr>
                </tbody>
            </table>
            </div>
        </div>
    </div>

    <!-- Blankenship FCE System Reference -->
    <div style="page-break-before: always; padding: 40px 0;">
        <div class="section">
            <h3 style="font-weight: bold; margin-bottom: 8px; font-family: Arial, sans-serif;">Sensitivity and Specificity of the Blankenship FCE System's Indicators of Submaximal Effort</h3>
            <p style="font-size: 9px; color: #333; margin-bottom: 12px; font-family: Arial, sans-serif;">Penny N Brubaker, PT, MSI; Frank J Fearon, PT, DHSc, OCS, FAACGPT2; Stephen M Smith, PhD; Richard J. Bohannon, PT, MS, ECS4; James Alday, MDS; Sheryl S Andrew, PT, MS6; Everald Clarke, PT, MS7; George L Shaw Jr, PT, MS8</p>
            <p style="font-size: 9px; color: #333; margin-bottom: 20px; line-height: 1.5; font-family: Arial, sans-serif; text-align: justify;">Four components of the Blankenship-slip FCE demonstrated a sensitivity of 80% and a specificity of 84.2% in determining submaximal effort. The 70% cutoff score developed by the Blankenship Group was shown to provide greatest diagnostic accuracy for identifying submaximal effort. Five indicators of validity were shown to have 70% sensitivity or greater and 12 indicators had 100% specificity. The clinical relevance for this study is that the validity indicators of 4 components of the Blankenship FCE had good sensitivity and specificity, however, raters should recognize that a small percentage of false positives (maximum effort identified as submaximal effort) might occur. Also, the clinician should note that scores of equivocal are not scored in the criteria-based category and could potentially increase a worker's overall FCE validity score. Only 5 of the indicators of validity tested scored greater than 70% sensitivity (Table 3). Likewise, 12 indicators had 100% specificity (Table 4). However, these variables had low sensitivity (less than 70%). Only 1 indicator had both sensitivity and specificity greater than 70%. This indicator of validity was OMH is greater than the high extrapolation from the leg static-strength test. The sensitivity was 78.6% and specificity was 72.2%.</p>

            <!-- Table 1: Demographic Data -->
            <h4 style="font-weight: bold; font-size: 10px; margin-bottom: 8px; background: #e5e7eb; padding: 8px; font-family: Arial, sans-serif;">TABLE 1 - DEMOGRAPHIC DATA OF PARTICIPANTS</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 8px; font-family: Arial, sans-serif; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #999; padding: 6px; text-align: left;">Subject Characteristics</th>
                        <th style="border: 1px solid #999; padding: 6px;">100% Effort (n=12)</th>
                        <th style="border: 1px solid #999; padding: 6px;">50% Effort (n=12)</th>
                        <th style="border: 1px solid #999; padding: 6px;">Significance Test</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #999; padding: 4px;">Age (y)</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">35.7</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">33.5</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">t = 13.9* (= .5)</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">Range</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">23-60</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">18-55</td><td style="border: 1px solid #999; padding: 4px; text-align: center;"></td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">Gender: Male/Female</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">7/5</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">10/2</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">χ² = 0.67* (= .3)</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">Race: Caucasian/African American</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">12/0</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">10/2</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">χ² = 0.67* (= .3)</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">Hard dominance: Right/Left</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">11/1</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">11/1</td><td style="border: 1px solid #999; padding: 4px; text-align: center;"></td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">Body mass (kg): Mean</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">15.20</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">17</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">t = 1.4* (= .2)</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">Range</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">54.0-127.8</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">54.0-103.5</td><td style="border: 1px solid #999; padding: 4px; text-align: center;"></td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">Insurance: Yes/No</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">11/1</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">10/2</td><td style="border: 1px solid #999; padding: 4px; text-align: center;"></td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">Employment: Employed/Not employed/Retired</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">11/1/0</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">10/2/0</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">χ² = 0.1 (= .8)</td></tr>
                </tbody>
            </table>

            <!-- Table 2: Sensitivity and Specificity -->
            <h4 style="font-weight: bold; font-size: 10px; margin-bottom: 8px; background: #e5e7eb; padding: 8px; font-family: Arial, sans-serif;">TABLE 2 - SENSITIVITY AND SPECIFICITY FOR VARIOUS FUNCTIONAL CAPACITY CUTOFF SCORES</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 8px; font-family: Arial, sans-serif; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #999; padding: 6px; text-align: left;">Cutoff Score</th>
                        <th style="border: 1px solid #999; padding: 6px;">Sensitivity (%)</th>
                        <th style="border: 1px solid #999; padding: 6px;">Specificity (%)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #999; padding: 4px;">55%</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">33.7</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">100.0</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">60%</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">58.0</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">88.5</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">65%</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">60.0</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">88.5</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">70%</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">85.0</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">84.2</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">75%</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">88.7</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">68.4</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 4px;">80%</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">100.0</td><td style="border: 1px solid #999; padding: 4px; text-align: center;">40.0</td></tr>
                </tbody>
            </table>

            <!-- Table 3: Variables With 70% Sensitivity -->
            <h4 style="font-weight: bold; font-size: 10px; margin-bottom: 8px; background: #e5e7eb; padding: 8px; font-family: Arial, sans-serif;">TABLE 3 - VARIABLES WITH 70% SENSITIVITY OR GREATER</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 7px; font-family: Arial, sans-serif; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #999; padding: 4px; text-align: left;">Variable/Score</th>
                        <th style="border: 1px solid #999; padding: 4px;">100% Effort</th>
                        <th style="border: 1px solid #999; padding: 4px;">50% Effort</th>
                        <th style="border: 1px solid #999; padding: 4px;">Sensitivity</th>
                        <th style="border: 1px solid #999; padding: 4px;">Specificity</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #999; padding: 3px;">Finger flexion Invalid</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">1</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">5</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">70.0</td><td style="border: 1px solid #999; padding: 3px; text-align: center;"></td></tr>
                    <tr><td style="border: 1px solid #999; padding: 3px;">Equivocal</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">2</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">13</td><td style="border: 1px solid #999; padding: 3px; text-align: center;"></td><td style="border: 1px solid #999; padding: 3px; text-align: center;"></td></tr>
                    <tr><td style="border: 1px solid #999; padding: 3px;">Valid</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">9</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">9</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">78.6</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">72.2</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 3px;">ROM greater Invalid</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">5</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">22</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">83.3</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">68.4</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 3px;">BEG on right Invalid</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">0</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">5</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">83.3</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">52.9</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 3px;">BEG on left Invalid</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">8</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">5</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">72.4</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">42.4</td></tr>
                </tbody>
            </table>

            <!-- Table 4: Variables With 100% Specificity -->
            <h4 style="font-weight: bold; font-size: 10px; margin-bottom: 8px; background: #e5e7eb; padding: 8px; font-family: Arial, sans-serif;">TABLE 4 - VARIABLES WITH 100% SPECIFICITY</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 7px; font-family: Arial, sans-serif; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #fef3c7;">
                        <th style="border: 1px solid #999; padding: 4px; text-align: left;">Variable/Score</th>
                        <th style="border: 1px solid #999; padding: 4px;">100% Effort</th>
                        <th style="border: 1px solid #999; padding: 4px;">50% Effort</th>
                        <th style="border: 1px solid #999; padding: 4px;">Sensitivity</th>
                        <th style="border: 1px solid #999; padding: 4px;">Specificity</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #999; padding: 3px;">Distraction Invalid/Equivocal</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">0</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">1</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">4.0</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">100</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 3px;">Trunk Invalid/Equivocal</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">0</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">6</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">28.0</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">100</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 3px;">Distraction (OAM) Valid</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">12</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">25</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">46.7</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">100</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 3px;">ROM shoulder Invalid/Equivocal</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">0</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">14</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">46.7</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">100</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 3px;">ROM push right &gt; left Invalid</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">0</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">20</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">30.0</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">100</td></tr>
                    <tr><td style="border: 1px solid #999; padding: 3px;">Mounted palms machine pass</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">3</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">2</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">18.5</td><td style="border: 1px solid #999; padding: 3px; text-align: center;">100</td></tr>
                </tbody>
            </table>
            <p style="font-size: 8px; color: #666; margin-top: 12px; font-family: Arial, sans-serif; text-align: center;">Journal of orthopaedic & sports physical therapy | volume 37 | number 4 | April 2007.</p>
        </div>
    </div>

    <!-- Digital Library Documentation -->
    ${
      (() => {
        console.log(
          `PDF Generation: Digital library check - has savedFileData: ${!!digitalLibraryData.savedFileData}, count: ${digitalLibraryData.savedFileData?.length || 0}`,
        );
        return (
          digitalLibraryData.savedFileData &&
          digitalLibraryData.savedFileData.length > 0
        );
      })()
        ? `
    <div style="page-break-before: always; padding: 40px 0;">
        <div class="section">
             <h3 style="font-weight: bold; margin-bottom: 15px; font-family: Arial, sans-serif;">Appendix Two: Digital Library</h3>

            <div class="digital-library-grid">
                ${digitalLibraryData.savedFileData
                  .map((file: any, index: number) => {
                    if (file.type && file.type.startsWith("image/")) {
                      return `
                            <div class="image-container no-break" style="text-align: center;">
                                <img src="${
                                  file.dataUrl || file.data
                                }" alt="Evaluation Image ${
                                  index + 1
                                }" class="report-image digital-library-item" style="border: 1px solid #ccc;" />
                            </div>
                        `;
                    } else {
                      return `
                            <div class="digital-library-item no-break" style="display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #666; border: 1px solid #ccc;">
                                <div style="font-size: 24px; margin-bottom: 5px;">✔</div>
                            </div>
                        `;
                    }
                  })
                  .join("")}
            </div>
        </div>
    </div>
    `
        : `<!-- No digital library images found for PDF generation -->`
    }

    <!-- Footer -->
</body>
</html>`;

    return htmlContent;
  };

  const convertHTMLToPDF = (htmlContent: string, fileName?: string): void => {
    try {
      // Generate automatic filename with current date and claimant name
      const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
      const claimantName = reportSummary.claimantName
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_{2,}/g, "_");
      const documentTitle = fileName
        ? `${fileName}`
        : `FCE_Report_${claimantName}_${currentDate}`;

      // Create a blob with the HTML content
      const fullHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${documentTitle}</title>
          <link rel="icon" type="image/x-icon" href="/workerfacts-logo.png?v=2" />
          <link rel="apple-touch-icon" href="/workerfacts-logo.png?v=2" />
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              line-height: 1.6;
              color: #333;
              background: white;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .page-content {
              padding: 20px;
              max-width: 8.5in;
              margin: 0 auto;
            }

            table {
              border-collapse: separate;
              border-spacing: 0;
              border: 1px solid #333 !important;
              width: 100%;
              page-break-inside: avoid;
            }

            th, td {
              border: 1px solid #333 !important;
              border-right: 1px solid #333 !important;
              padding: 6px !important;
              text-align: left;
              vertical-align: top;
              font-size: 10px;
            }

            table.center-cells th, table.center-cells td {
              text-align: center !important;
              vertical-align: middle !important;
            }

            th {
              background: #fef3c7 !important;
              font-weight: bold !important;
            }

            .highlighted {
              background: #dbeafe !important;
            }

            .info-box {
              background: #f3f4f6 !important;
              border: 1px solid #d1d5db !important;
              padding: 15px !important;
              margin: 20px 0 !important;
              page-break-inside: avoid;
            }

            .yellow-header {
              background: #fef3c7 !important;
              border: 1px solid #f59e0b !important;
              padding: 3px !important;
              font-weight: bold !important;
              margin-bottom: 15px !important;
            }

            .page-break {
              page-break-before: always;
            }

            .no-break {
              page-break-inside: avoid;
            }

            img {
              max-width: 100%;
              height: auto;
              page-break-inside: avoid;
            }

            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              color: #1e40af;
            }

            .signature-line {
              border-top: 1px solid #333;
              width: 250px;
              margin-top: 40px;
              padding-top: 5px;
            }

            @page {
              margin: 0.75in;
              size: letter;
            }

            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              body {
                margin: 0 !important;
                font-size: 10px !important;
              }

              .page-break {
                page-break-before: always !important;
              }

              .no-break {
                page-break-inside: avoid !important;
              }

              table {
                page-break-inside: avoid !important;
              }

              th {
                background: #fef3c7 !important;
              }

              .highlighted {
                background: #dbeafe !important;
              }

              .info-box {
                background: #f3f4f6 !important;
              }

              .yellow-header {
                background: #fef3c7 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-content">
            ${htmlContent}
          </div>
        </body>
        </html>
      `;

      // Open a new window for PDF printing (most reliable method)
      const printWindow = window.open(
        "",
        "_blank",
        "width=1200,height=800,scrollbars=yes,resizable=yes",
      );

      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(fullHTML);
        printWindow.document.close();

        // Set the document title for proper filename suggestion
        printWindow.document.title = documentTitle;

        // Wait for content to load, then print
        printWindow.addEventListener("load", function () {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 1000);
        });

        // Fallback if load event doesn't fire
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        }, 2000);
      } else {
        toast({
          title:
            "Please allow popups for this site to download the PDF report.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error generating PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReport = async () => {
    // Check if at least one report is selected
    if (!selectedReports.executiveSummary && !selectedReports.fullReport) {
      toast({
        title: "No Report Selected",
        description: "Please select at least one report type to download.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);

    let didSucceed = false;

    // Simulate report generation and download
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("PDF Generation: Starting report content generation...");
    const reportContent = await generateReportContent();
    console.log("PDF Generation: Report content generated successfully");

    // Generate automatic filename with date and claimant name
    const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const claimantName = reportSummary.claimantName
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_{2,}/g, "_");
    const fileName = `FCE_Report_${claimantName}_${currentDate}`;

    // Handle report downloads based on checkbox selections
    if (selectedReports.executiveSummary || selectedReports.fullReport) {
      try {
        // Load all evaluation data for DOCX generation
        const evaluatorData = await getEvaluatorData();
        const claimantData = JSON.parse(
          localStorage.getItem("claimantData") || "{}",
        );
        const painIllustrationData = JSON.parse(
          localStorage.getItem("painIllustrationData") || "{}",
        );
        const activityRatingData = JSON.parse(
          localStorage.getItem("activityRatingData") || "{}",
        );
        const referralQuestionsData = JSON.parse(
          localStorage.getItem("referralQuestionsData") || "{}",
        );
        const returnToWorkStatus =
          referralQuestionsData.returnToWorkStatus || {};
        const protocolTestsData = JSON.parse(
          localStorage.getItem("protocolTestsData") || "{}",
        );
        const occupationalTasksData = JSON.parse(
          localStorage.getItem("occupationalTasksData") || "{}",
        );
        const testData = JSON.parse(localStorage.getItem("testData") || "{}");
        const mtmTestData = JSON.parse(
          localStorage.getItem("mtmTestData") || "{}",
        );
        const cardioTestData = JSON.parse(
          localStorage.getItem("cardioTestData") || "{}",
        );

        // Handle digital library data loading (IndexedDB or localStorage)
        const digitalLibraryRawData =
          localStorage.getItem("digitalLibraryData");
        let digitalLibraryData: any = {};
        if (digitalLibraryRawData) {
          const parsedData = JSON.parse(digitalLibraryRawData);

          if (parsedData.storageType === "indexeddb") {
            // Load actual images from IndexedDB for DOCX generation
            try {
              const imagesFromDB = await loadImagesFromDB();
              digitalLibraryData = {
                ...parsedData,
                savedFileData: imagesFromDB.map((img) => ({
                  id: img.id,
                  name: img.name,
                  type: img.type,
                  size: img.size,
                  category: img.category,
                  dataUrl: img.dataUrl,
                })),
              };
            } catch (error) {
              console.error(
                "Error loading images from IndexedDB for DOCX:",
                error,
              );
              digitalLibraryData = { ...parsedData, savedFileData: [] }; // Use empty array as fallback
            }
          } else {
            digitalLibraryData = parsedData;
          }
        }

        // Helper function for calculations
        const calculateAverage = (measurements: any): number => {
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

        // Prepare complete data structure for cloud function to match PDF output
        // Include clinic logo redundantly and with debug info to ensure DOCX can load it
        let logoCandidate = (evaluatorData.clinicLogo || "").trim();
        // Ensure we always send a data URL to avoid CORS/public URL issues for DOCX service
        async function ensureDataUrl(input: string): Promise<string> {
          if (!input) return "";
          if (/^data:image\//i.test(input)) return input; // already data URL
          let absolute = input;
          try {
            if (!/^https?:\/\//i.test(input)) {
              // resolve relative like "/workerfacts-logo.png"
              if (input.startsWith("/")) {
                const origin =
                  typeof window !== "undefined" ? window.location.origin : "";
                if (origin) absolute = `${origin}${input}`;
              }
            }
            const resp = await fetch(absolute, {
              mode: "cors",
              cache: "no-store",
            });
            if (!resp.ok) throw new Error(`Logo fetch failed: ${resp.status}`);
            const blob = await resp.blob();
            // Convert Blob -> data URL
            const dataUrl: string = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error("FileReader error"));
              reader.onloadend = () => resolve(String(reader.result || ""));
              reader.readAsDataURL(blob);
            });
            return dataUrl;
          } catch (e) {
            console.warn("Failed to convert logo to data URL:", e);
            return input; // fall back to whatever we had
          }
        }
        const logoCandidateDataUrl = await ensureDataUrl(logoCandidate);
        const isDataUrl = /^data:image\//i.test(logoCandidateDataUrl);
        const logoMimeMatch = isDataUrl
          ? logoCandidateDataUrl.match(/^data:([^;]+);base64,/i)
          : null;
        const imageUrls = [
          "/humanBody/front_view.png",
          "/humanBody/back_view.png",
          "/humanBody/right_view.png",
          "/humanBody/left_view.png",
        ];
        // Compose pain markers onto 4 anatomy views (front/back/left/right) into data URLs
        async function composePainViews(
          painData: any,
          baseUrls: string[],
        ): Promise<string[]> {
          try {
            const views = ["front", "back", "left", "right"] as const;
            const width = 400;
            const height = 550;
            const results: string[] = [];

            const loadImage = (src: string) =>
              new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = (e) => reject(e);
                img.src = src;
              });

            const markers: any[] = Array.isArray(painData?.markers)
              ? painData.markers
              : [];
            const ensureAbs = async (u: string) => {
              if (!u) return u;
              if (/^https?:\/\//i.test(u) || /^data:image\//i.test(u)) return u;
              const origin =
                typeof window !== "undefined" ? window.location.origin : "";
              return origin ? `${origin}${u.startsWith("/") ? u : `/${u}`}` : u;
            };

            const absUrls = await Promise.all(baseUrls.map(ensureAbs));

            for (let i = 0; i < views.length; i++) {
              const baseUrl = absUrls[i];
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                results.push("");
                continue;
              }

              try {
                const img = await loadImage(baseUrl);
                ctx.drawImage(img, 0, 0, width, height);
              } catch {}

              const view = views[i];
              const viewMarkers = markers.filter(
                (m) => (m?.view || "").toLowerCase() === view,
              );
              for (const m of viewMarkers) {
                // Normalize coordinates: support fractions [0,1], percentages [0,100], or absolute px
                const rawX = Number(m.x);
                const rawY = Number(m.y);
                const isFiniteNumber = (v: number) => Number.isFinite(v);
                const normX = isFiniteNumber(rawX)
                  ? rawX <= 1
                    ? rawX * width
                    : rawX <= 100
                      ? (rawX / 100) * width
                      : rawX
                  : width / 2;
                const normY = isFiniteNumber(rawY)
                  ? rawY <= 1
                    ? rawY * height
                    : rawY <= 100
                      ? (rawY / 100) * height
                      : rawY
                  : height / 2;
                const color = m.color || "#ff0000";
                // Determine symbol based on marker type when not explicitly provided
                const type = String(m.type || "").toLowerCase();
                let derivedSymbol = "";
                switch (type) {
                  case "primary-concern":
                    derivedSymbol = "P1";
                    break;
                  case "secondary-concern":
                    derivedSymbol = "P2";
                    break;
                  case "dull-ache":
                    derivedSymbol = "~";
                    break;
                  case "shooting":
                    derivedSymbol = "/";
                    break;
                  case "burning":
                    derivedSymbol = "x";
                    break;
                  case "pins-needles":
                    derivedSymbol = "•";
                    break;
                  case "numbness":
                    derivedSymbol = "o";
                    break;
                  case "temperature":
                    derivedSymbol = "T";
                    break;
                  case "swelling":
                    derivedSymbol = "SW";
                    break;
                  case "scar":
                    derivedSymbol = "S";
                    break;
                  case "crepitus":
                    derivedSymbol = "C";
                    break;
                }
                const symbol = m.symbol || m.label || derivedSymbol || "";
                const size = Number(m.size) || 6;

                ctx.save();
                if (
                  symbol &&
                  typeof symbol === "string" &&
                  symbol.length <= 3
                ) {
                  ctx.fillStyle = color;
                  ctx.font = `${Math.max(10, size * 3)}px Arial`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillText(symbol, normX, normY);
                } else {
                  ctx.beginPath();
                  ctx.arc(normX, normY, size, 0, Math.PI * 2);
                  ctx.fillStyle = color;
                  ctx.fill();
                  ctx.lineWidth = 1;
                  ctx.strokeStyle = "#ffffff";
                  ctx.stroke();
                }
                ctx.restore();
              }

              results.push(canvas.toDataURL("image/png"));
            }

            return results;
          } catch {
            return [];
          }
        }

        // Prepare complete data structure for cloud function to match PDF output
        const composedViews = await composePainViews(
          painIllustrationData,
          imageUrls,
        );
        const requestData = {
          claimantName:
            `${claimantData.firstName || ""} ${
              claimantData.lastName || ""
            }`.trim() || "Anonymous",
          claimNumber: claimantData.claimantId || reportSummary.reportId,
          evaluationDate: currentDate,
          // Redundant logo fields so the cloud function can resolve any of them
          logoPath: logoCandidateDataUrl || null,
          logoUrl: logoCandidateDataUrl || null,
          clinicName: evaluatorData.clinicName || "MedSource",
          clinicAddress:
            evaluatorData.address ||
            "1490-5A Quarterpath Road #242, Williamsburg, VA  23185",
          clinicPhone: evaluatorData.phone || "757-220-5051",
          clinicFax: evaluatorData.phone || "757-273-6198",
          // Provide evaluatorData with clinicLogo too, for server-side compatibility
          evaluatorData: {
            ...(evaluatorData || {}),
            clinicLogo: logoCandidateDataUrl || null,
          },
          // Lightweight debug info to assist server logs
          logoDebug: {
            isDataUrl,
            mime: logoMimeMatch ? logoMimeMatch[1] : null,
            length: logoCandidateDataUrl ? logoCandidateDataUrl.length : 0,
            prefix: logoCandidateDataUrl
              ? logoCandidateDataUrl.slice(0, 64)
              : null,
          },

          // Enhanced claimant data to match PDF
          claimantData: {
            firstName: claimantData.firstName || "",
            lastName: claimantData.lastName || "",
            dateOfBirth: claimantData.dateOfBirth || "",
            gender: claimantData.gender || "",
            height: claimantData.heightValue || "",
            weight: claimantData.weightValue || "",
            heightUnit: claimantData.heightUnit || "",
            weightUnit: claimantData.weightUnit || "",
            dominantHand: claimantData.dominantHand || "",
            address: claimantData.address || "",
            phone: claimantData.phone || "",
            workPhone: claimantData.workPhone || "",
            email: claimantData.email || "",
            occupation: claimantData.occupation || "",
            education: claimantData.educationLevel || "",
            injuryDate: claimantData.injuryDate || "",
            injuryDescription: claimantData.injuryDescription || "",
            bpSitting: claimantData.bpSitting || "",
            restingPulse: claimantData.restingPulse || "",
            physician: claimantData.physician || "",
            employer: claimantData.employer || "",
            claimantId: claimantData.claimantId || "",
            insurance: claimantData.insurance || "",
            referredBy: claimantData.referredBy || "",
            testedBy: evaluatorData.name || "",
            claimantHistory:
              claimantData.claimantHistory ||
              "While working in assembly area, client noted pain and was subsequently diagnosed with work-related injury.",
          },

          // Enhanced pain illustration data - ensure this triggers the cloud function section
          painIllustrationData: {
            painLevel: painIllustrationData.painLevel || "Moderate (5/10)",
            description:
              painIllustrationData.description ||
              "Client reported generalized discomfort in the lower back region during physical activities. Pain increases with prolonged sitting and lifting activities. Pain pattern is consistent with reported injury and functional limitations observed during testing.",
            savedImage: painIllustrationData.savedImage || "",
            // Include up to 3 saved images from the pain step so DOCX can render them
            savedImageData: Array.isArray(painIllustrationData.savedImageData)
              ? painIllustrationData.savedImageData.slice(0, 3)
              : [],
            painAreas: painIllustrationData.painAreas || [],
            painSymbols: painIllustrationData.painSymbols || {},
            markers: painIllustrationData.markers,
            compositedViews:
              composedViews && composedViews.length === 4
                ? composedViews
                : imageUrls,
          },

          // Enhanced activity rating data
          activityRatingData: {
            activities:
              activityRatingData.activities &&
              activityRatingData.activities.length > 0
                ? activityRatingData.activities.map((activity: any) => ({
                    name: activity.name,
                    rating: activity.rating,
                    comments: activity.comments || "",
                    demonstrated: activity.demonstrated,
                    perceived: activity.perceived,
                  }))
                : [
                    {
                      name: "Lifting",
                      rating: 5,
                      comments: "Moderate difficulty",
                      demonstrated: true,
                      perceived: true,
                    },
                    {
                      name: "Carrying",
                      rating: 6,
                      comments: "Some limitations noted",
                      demonstrated: true,
                      perceived: true,
                    },
                    {
                      name: "Walking",
                      rating: 3,
                      comments: "Good endurance",
                      demonstrated: true,
                      perceived: true,
                    },
                    {
                      name: "Standing",
                      rating: 4,
                      comments: "Can maintain posture",
                      demonstrated: true,
                      perceived: true,
                    },
                    {
                      name: "Sitting",
                      rating: 2,
                      comments: "No difficulty",
                      demonstrated: true,
                      perceived: true,
                    },
                  ],
          },

          // Return to Work Status data
          returnToWorkStatus: {
            status: returnToWorkStatus?.status || "",
            comments: returnToWorkStatus?.comments || "",
          },

          // Enhanced referral questions data
          referralQuestionsData: {
            questions:
              referralQuestionsData?.questions &&
              referralQuestionsData.questions.length > 0
                ? referralQuestionsData.questions.map((q: any) => ({
                    question: q.question,
                    answer: q.answer,
                    savedImageData: q.savedImageData || [],
                  }))
                : [
                    {
                      question:
                        "What is the client's current functional capacity?",
                      answer:
                        "Based on evaluation, client demonstrates light to medium capacity.",
                      savedImageData: [],
                    },
                    {
                      question:
                        "What is the present lumbar range of motion noted for the client?",
                      answer:
                        "Range of motion is within functional limits with some restrictions in extreme flexion.",
                      savedImageData: [],
                    },
                    {
                      question:
                        "What would be the Physical Demand Classification (PDC) for this client?",
                      answer:
                        "Client can perform light to medium physical demand work activities.",
                      savedImageData: [],
                    },
                  ],
            // Include conclusion data (Return to Work Status, RPDR, CTP behaviors)
            conclusionData: {
              returnToWorkStatus: {
                status:
                  referralQuestionsData?.conclusionData?.returnToWorkStatus
                    ?.status || "",
                comments:
                  referralQuestionsData?.conclusionData?.returnToWorkStatus
                    ?.comments || "",
              },
              rpdrBehaviors:
                referralQuestionsData?.conclusionData?.rpdrBehaviors || {},
              rpdrComments:
                referralQuestionsData?.conclusionData?.rpdrComments || "",
              ctpBehaviors:
                referralQuestionsData?.conclusionData?.ctpBehaviors || {},
              ctpComments:
                referralQuestionsData?.conclusionData?.ctpComments || "",
            },
          },

          // Enhanced protocol and tests data
          protocolTestsData: {
            selectedProtocol:
              protocolTestsData.selectedProtocol || "Standard FCE Protocol",
            selectedTests:
              protocolTestsData.selectedTests &&
              protocolTestsData.selectedTests.length > 0
                ? protocolTestsData.selectedTests
                : [
                    "Lifting Test - Floor to Waist",
                    "Lifting Test - Waist to Shoulder",
                    "Carrying Test",
                    "Walking Endurance Test",
                    "Static Standing Test",
                    "Postural Tolerance Assessment",
                    "Distraction Test",
                    "Consistency Test",
                  ],
          },

          // Enhanced occupational tasks data
          occupationalTasksData: {
            selectedTests:
              occupationalTasksData.selectedTests &&
              occupationalTasksData.selectedTests.length > 0
                ? occupationalTasksData.selectedTests
                : ["fingering", "reach-immediate", "balance", "carry"],
            testResults:
              // Use actual MTM test data if available, otherwise use existing occupational tasks data
              Object.keys(mtmTestData).length > 0
                ? Object.entries(mtmTestData).map(
                    ([testType, testData]: [string, any]) => ({
                      id: testType,
                      name:
                        testData.testName ||
                        testType.charAt(0).toUpperCase() + testType.slice(1),
                      trials: testData.trials || [],
                      parameters: {
                        numberOfTrials: testData.trials?.length || 3,
                        numberOfReps: testData.trials?.[0]?.reps || 1,
                        bodySides: testData.trials?.[0]?.side || "Both",
                        plane:
                          testData.trials?.[0]?.weight ||
                          testData.trials?.[0]?.plane ||
                          "Immediate",
                        position:
                          testData.trials?.[0]?.distance ||
                          testData.trials?.[0]?.position ||
                          "Standing",
                      },
                      isCompleted:
                        testData.trials && testData.trials.length > 0,
                    }),
                  )
                : occupationalTasksData.testResults &&
                    occupationalTasksData.testResults.length > 0
                  ? occupationalTasksData.testResults.map((test: any) => ({
                      id: test.id,
                      name: test.name,
                      trials: test.trials || [],
                      parameters: test.parameters || {},
                      isCompleted: test.isCompleted || false,
                    }))
                  : [
                      {
                        id: "fingering",
                        name: "MTM - Fingering",
                        trials: [
                          {
                            trial: 1,
                            side: "Both",
                            plane: "Immediate",
                            position: "Standing",
                            reps: 10,
                            testTime: 7.3,
                            percentIS: 217.8,
                            totalCompleted: 217.8,
                          },
                          {
                            trial: 2,
                            side: "Both",
                            plane: "Immediate",
                            position: "Standing",
                            reps: 10,
                            testTime: 7.5,
                            percentIS: 212.1,
                            totalCompleted: 214.9,
                          },
                          {
                            trial: 3,
                            side: "Both",
                            plane: "Immediate",
                            position: "Standing",
                            reps: 10,
                            testTime: 6.9,
                            percentIS: 244.7,
                            totalCompleted: 224.8,
                          },
                        ],
                        parameters: {
                          numberOfTrials: 3,
                          numberOfReps: 10,
                          bodySides: "Both",
                          plane: "Immediate",
                          position: "Standing",
                        },
                        isCompleted: true,
                      },
                    ],
          },
          // Enhanced test data with comprehensive results - MUST have enough tests to trigger all DOCX sections
          testData: testData,

          // Enhanced digital library data - provide fallback to ensure section is included
          digitalLibraryData: {
            // Include resolvable image sources so the server can render DOCX
            savedFileData:
              digitalLibraryData.savedFileData &&
              digitalLibraryData.savedFileData.length > 0
                ? digitalLibraryData.savedFileData
                    .filter((f: any) =>
                      typeof f?.type === "string"
                        ? f.type.toLowerCase().startsWith("image/")
                        : !!(
                            f?.dataUrl ||
                            f?.data ||
                            f?.url ||
                            f?.path ||
                            f?.src
                          ),
                    )
                    .map((f: any) => ({
                      name: f.name,
                      type: f.type,
                      size: f.size,
                      // server probes these in order using getImageBuffer
                      dataUrl: f.dataUrl,
                      data: f.data,
                      url: f.url,
                      path: f.path,
                      src: f.src,
                    }))
                : [],
          },

          // MTM Test Data
          mtmTestData: mtmTestData,
          cardioTestData: cardioTestData,
          // Additional data for comprehensive report
          paymentData: {
            amount: reportSummary.paymentAmount || 0,
          },

          reportSummary: {
            ...reportSummary,
            evaluatorName: reportSummary.evaluatorName,
            totalTests: reportSummary.totalTests,
            totalImages: reportSummary.totalImages,
            completedSteps: reportSummary.completedSteps,
          },

          // Signature Image
          signatureImage: signatureImage || null,
        };

        // Debug: Log comprehensive data being sent to cloud function
        console.log("=== DOCX Generation Debug ===");
        console.log("Claimant Name:", requestData.claimantName);
        console.log(
          "Test Data Count:",
          requestData.testData.tests?.length || 0,
        );
        console.log(
          "Activity Data Count:",
          requestData.activityRatingData.activities?.length || 0,
        );
        console.log(
          "Referral Questions Count:",
          requestData.referralQuestionsData.questions?.length || 0,
        );
        console.log(
          "Protocol Tests Count:",
          requestData.protocolTestsData.selectedTests?.length || 0,
        );
        console.log(
          "Digital Library Count:",
          requestData.digitalLibraryData.savedFileData?.length || 0,
        );

        // Check critical sections that need data
        if (
          requestData.testData.tests &&
          requestData.testData.tests.length > 0
        ) {
          console.log("✅ Test data available - will generate test sections");
          console.log("Sample test:", requestData.testData.tests[0]);
        } else {
          console.error("No test data - sections will be missing!");
        }

        console.log(
          "Full DOCX request payload:",
          JSON.stringify(requestData, null, 2),
        );

        // Log specific sections that are critical for DOCX generation
        console.log("=== CRITICAL SECTIONS CHECK ===");
        console.log("testData structure:", {
          exists: !!requestData.testData,
          hasTests: !!requestData.testData?.tests,
          testCount: requestData.testData?.tests?.length || 0,
          firstTest: requestData.testData?.tests?.[0] || null,
        });
        console.log("activityRatingData structure:", {
          exists: !!requestData.activityRatingData,
          hasActivities: !!requestData.activityRatingData?.activities,
          activityCount:
            requestData.activityRatingData?.activities?.length || 0,
        });
        console.log("protocolTestsData structure:", {
          exists: !!requestData.protocolTestsData,
          hasSelectedTests: !!requestData.protocolTestsData?.selectedTests,
          testCount: requestData.protocolTestsData?.selectedTests?.length || 0,
        });

        // Check conclusion data
        console.log("conclusionData structure:", {
          exists: !!requestData.referralQuestionsData?.conclusionData,
          hasReturnToWork:
            !!requestData.referralQuestionsData?.conclusionData
              ?.returnToWorkStatus,
          returnToWorkStatus:
            requestData.referralQuestionsData?.conclusionData
              ?.returnToWorkStatus?.status || "none",
          rpdrBehaviors: Object.values(
            requestData.referralQuestionsData?.conclusionData?.rpdrBehaviors ||
              {},
          ).filter((v) => v === true).length,
          ctpBehaviors: Object.values(
            requestData.referralQuestionsData?.conclusionData?.ctpBehaviors ||
              {},
          ).filter((v) => v === true).length,
        });

        // Check cardio test data
        console.log("cardioTestData structure:", {
          exists: !!requestData.cardioTestData,
          keys: Object.keys(requestData.cardioTestData || {}),
          testCount: Object.keys(requestData.cardioTestData || {}).length,
          sampleTestData: requestData.cardioTestData
            ? Object.entries(requestData.cardioTestData)[0]
            : null,
        });

        // Detailed analysis of test data to ensure it has all required fields
        console.log("=== DETAILED TEST DATA ANALYSIS ===");
        if (requestData.testData?.tests) {
          requestData.testData.tests.forEach((test, index) => {
            console.log(`Test ${index + 1}:`, {
              testName: test.testName?.substring(0, 30) + "...",
              hasResult: !!test.result,
              hasComments: !!test.comments,
              hasJobRequirements: !!test.jobRequirements,
              commentLength: test.comments?.length || 0,
              jobReqLength: test.jobRequirements?.length || 0,
              demonstrated: test.demonstrated,
              perceived: test.perceived,
            });
          });
        }

        // Send complete data to Cloud Function(s) based on selected reports
        console.log("Sending request to cloud function...");
        const requestStartTime = Date.now();

        const isLocal = process.env.NODE_ENV === "development";

        // Collect all APIs to call based on checkbox selection
        const apisToCall: Array<{ name: string; url: string }> = [];

        if (selectedReports.executiveSummary) {
          apisToCall.push({
            name: "Executive Summary",
            url: "https://generateexecutivesummaryclaimantreportapi-tn63kvymra-uc.a.run.app",
          });
        }

        if (selectedReports.fullReport) {
          apisToCall.push({
            name: "Full Report",
            url: "https://generateclaimantreportapi-tn63kvymra-uc.a.run.app",
          });
        }

        if (apisToCall.length === 0) {
          throw new Error("No report type selected");
        }

        console.log(
          `Calling ${apisToCall.length} API(s):`,
          apisToCall.map((a) => a.name).join(", "),
        );

        // Call all selected APIs and collect responses
        const responses = await Promise.all(
          apisToCall.map(async (api) => {
            const apiStartTime = Date.now();
            console.log(`Sending request to ${api.name} API: ${api.url}`);

            const response = await fetch(api.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestData),
            });

            const apiDuration = Date.now() - apiStartTime;
            console.log(
              `${api.name} API request completed in:`,
              apiDuration,
              "ms",
            );

            console.log(`${api.name} response status:`, response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`${api.name} error response:`, errorText);
              throw new Error(
                `Failed to generate ${api.name} report: ${response.status} - ${errorText}`,
              );
            }

            // Check if response has any debugging information in headers
            const debugHeader = response.headers.get("x-debug-info");
            if (debugHeader) {
              console.log(`${api.name} debug info:`, debugHeader);
            }

            // Force correct MIME type to help some viewers
            const arrayBuf = await response.arrayBuffer();
            const blob = new Blob([arrayBuf], {
              type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            console.log(`${api.name} DOCX blob size:`, blob.size, "bytes");

            return { name: api.name, blob };
          }),
        );

        const requestDuration = Date.now() - requestStartTime;
        console.log(
          "All cloud function requests completed in:",
          requestDuration,
          "ms",
        );

        // Download all reports
        responses.forEach(({ name, blob }) => {
          // Create a unique filename for each report type
          const reportTypeSuffix =
            name === "Executive Summary" ? "Summary" : "Full";
          const downloadFileName = `FCE_Report_${reportTypeSuffix}_${claimantName}_${currentDate}.docx`;

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = downloadFileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          console.log(`Downloaded ${name} report as: ${downloadFileName}`);
        });

        // For backwards compatibility with the rest of the code, get first blob
        const firstBlob = responses[0].blob;
        const blobCopy = firstBlob.slice();
        try {
          const blobText = await blobCopy.text();
          console.log("Blob content preview:", blobText.substring(0, 200));

          // Check if blob contains error message instead of DOCX
          if (
            blobText.includes("error") ||
            blobText.includes("Error") ||
            blobText.includes("failed")
          ) {
            console.error(
              "ERROR: Blob contains error message instead of DOCX:",
              blobText,
            );
            throw new Error(
              "Cloud function returned error instead of DOCX: " + blobText,
            );
          }

          // Check if it looks like JSON error response
          if (blobText.trim().startsWith("{") && blobText.includes("error")) {
            console.error(
              "ERROR: Received JSON error response instead of DOCX:",
              blobText,
            );
            throw new Error("Cloud function returned JSON error: " + blobText);
          }
        } catch (textError) {
          console.log(
            "Blob is binary (expected for DOCX) - error reading as text:",
            textError.message,
          );
        }

        // Additional validation - check if blob starts with DOCX magic bytes
        const arrayBuffer = await firstBlob.slice(0, 4).arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const signature = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        console.log("File signature (first 4 bytes):", signature);

        // DOCX files should start with PK (ZIP signature: 50 4B)
        if (!signature.startsWith("504b")) {
          console.error(
            "WARNING: File does not have ZIP/DOCX signature. Expected 504b, got:",
            signature,
          );
          console.error("This may indicate a corrupted or invalid DOCX file");
        }

        // Check for potential error responses that might be embedded in the DOCX
        if (firstBlob.size < 50000) {
          console.warn(
            "DOCX file is quite small for a comprehensive FCE report",
          );
          console.warn(
            "Expected size for 8 detailed tests: >50KB, actual:",
            firstBlob.size,
            "bytes",
          );

          // Try to read more of the file content to check for embedded errors
          try {
            const largerSample = await firstBlob
              .slice(0, Math.min(1000, firstBlob.size))
              .arrayBuffer();
            const textDecoder = new TextDecoder("utf-8", { fatal: false });
            const sampleText = textDecoder.decode(largerSample);
            console.log(
              "Extended file content sample (first 1000 bytes as text):",
              sampleText.substring(0, 500),
            );

            if (
              sampleText.includes("error") ||
              sampleText.includes("Error") ||
              sampleText.includes("failed")
            ) {
              console.error(
                "ERROR: Found error text in DOCX content:",
                sampleText,
              );
            }
          } catch (decodeError) {
            console.log(
              "Could not decode file content as text (expected for binary DOCX)",
            );
          }
        }

        // Validate blob size - should be much larger than 2 pages
        if (firstBlob.size < 50000) {
          console.warn(
            "WARNING: DOCX file seems very small, may be incomplete",
          );
          console.warn(
            "Expected size for comprehensive report: >100KB, actual:",
            firstBlob.size,
            "bytes",
          );
        }

        console.log("DOCX download completed successfully");
        didSucceed = true;
      } catch (error) {
        console.error("DOCX generation error details:", error);
        toast({
          title: `Error generating DOCX report: ${String((error as any)?.message || error)}`,
          variant: "destructive",
        });
      }
    }

    setIsDownloading(false);
    if (didSucceed) {
      toast({
        title: "Report downloaded successfully",
        description: "You can modify details and download again anytime.",
        variant: "success",
      });
      // Stay on this page to allow further edits and re-downloads
    } else {
      toast({ title: "Failed to generate report", variant: "destructive" });
    }
  };

  const handlePostDownloadCleanup = () => {
    // Clear only steps data, keep evaluator profile
    clearStepsData();
    setShowSuccessDialog(false);

    // Navigate back to dashboard for new evaluation
    navigate("/dashboard");
  };

  const handleManualClear = () => {
    setShowClearDialog(true);
  };

  const confirmManualClear = () => {
    clearAllData();
    setShowClearDialog(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-2 sm:px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex flex-col sm:flex-row items-center justify-center text-center">
              <Download className="mb-2 sm:mb-0 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              Download Report
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 text-center px-2">
              Your evaluation is complete! Download your final report below.
            </p>
          </div>
        </div>

        <Card className="shadow-lg mb-8">
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="text-2xl flex items-center">
              <div className="w-6 h-6 mr-3 bg-white text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                10
              </div>
              Step 10: Download Final Report
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 md:p-8">
            {/* Report Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-green-800 mb-4">
                Report Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p>
                    <strong>Report ID:</strong> {reportSummary.reportId}
                  </p>
                  <p>
                    <strong>Evaluator:</strong> {reportSummary.evaluatorName}
                  </p>
                  <p>
                    <strong>Claimant:</strong> {reportSummary.claimantName}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Completed Steps:</strong>{" "}
                    {reportSummary.completedSteps}/10
                  </p>
                  <p>
                    <strong>Tests Conducted:</strong> {reportSummary.totalTests}
                  </p>
                  <p>
                    <strong>Images Included:</strong>{" "}
                    {reportSummary.totalImages}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-lg">
                  <strong>Total Paid:</strong>{" "}
                  <span className="text-green-600">
                    ${reportSummary.paymentAmount}
                  </span>
                </p>
              </div>
            </div>

            {/* Format Selection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">
                Select Report(s)
              </h3>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="executiveSummary"
                    checked={selectedReports.executiveSummary}
                    onCheckedChange={(checked) =>
                      setSelectedReports({
                        ...selectedReports,
                        executiveSummary: checked as boolean,
                      })
                    }
                  />
                  <Label
                    htmlFor="executiveSummary"
                    className="flex items-center cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4 text-blue-600" />
                    FCE Executive Summary
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fullReport"
                    checked={selectedReports.fullReport}
                    onCheckedChange={(checked) =>
                      setSelectedReports({
                        ...selectedReports,
                        fullReport: checked as boolean,
                      })
                    }
                  />
                  <Label
                    htmlFor="fullReport"
                    className="flex items-center cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4 text-blue-600" />
                    FCE Full Report
                  </Label>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-amber-800 mb-2 flex items-center">
                <Trash2 className="mr-2 h-5 w-5" />
                Important Notice
              </h3>
              <div className="text-amber-700 space-y-2">
                <p>
                  <strong>Data Clearing:</strong> After downloading your report,
                  only evaluation steps data will be cleared.
                </p>
                <p>
                  <strong>Profile Retained:</strong> Your evaluator profile will
                  remain for new evaluations.
                </p>
                <p>
                  <strong>Fresh Evaluation:</strong> You can start a new
                  evaluation immediately after download.
                </p>
              </div>
            </div>

            {/* Download Actions */}
            <div className="space-y-4">
              <Button
                onClick={handleDownloadReport}
                disabled={isDownloading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg"
              >
                {isDownloading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Generating Report...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Download className="mr-3 h-6 w-6" />
                    Download Final Report
                  </div>
                )}
              </Button>

              <div className="text-center">
                <Button
                  onClick={handleManualClear}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Clear All Data & Start Over
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>
                Report will be downloaded as "FCE_
                {reportSummary.claimantName.replace(/[^a-zA-Z0-9]/g, "_")}"{" "}
                {selectedReports.executiveSummary && selectedReports.fullReport
                  ? "(FCE Executive Summary and Full Report)"
                  : selectedReports.executiveSummary
                    ? "(FCE Executive Summary)"
                    : "(FCE Full Report)"}{" "}
                in DOCX format.
              </p>
              <p>
                Professional formatting and exact content matching review report
                included.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={() => {}}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl text-green-600">
                <Check className="mr-3 h-6 w-6" />
                Download Complete!
              </DialogTitle>
            </DialogHeader>
            <DialogDescription id="download-success-desc">
              Your functional capacity evaluation report has been downloaded.
            </DialogDescription>
            <div className="py-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Report Downloaded Successfully
                </h3>
                <p className="text-gray-600">
                  Your functional capacity evaluation report has been
                  downloaded. Evaluation data will now be cleared while keeping
                  your profile.
                </p>
                <div className="bg-green-50 border border-green-200 rounded p-3 mt-4">
                  <p className="text-sm text-green-700">
                    <strong>Next:</strong> You'll return to the dashboard ready
                    for a new evaluation.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={handlePostDownloadCleanup}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Clear Steps & Ready for New Evaluation
            </Button>
          </DialogContent>
        </Dialog>

        {/* Manual Clear Confirmation Dialog */}
        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl text-red-600">
                <Trash2 className="mr-3 h-6 w-6" />
                Clear All Data?
              </DialogTitle>
            </DialogHeader>
            <DialogDescription id="clear-data-desc">
              This will permanently delete all your evaluation data.
            </DialogDescription>
            <div className="py-4">
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Are you sure?
                </h3>
                <p className="text-gray-600">
                  This will permanently delete all your evaluation data,
                  including:
                </p>
                <ul className="text-sm text-gray-600 text-left space-y-1">
                  <li>• Claimant data</li>
                  <li>• Test results and measurements</li>
                  <li>• Uploaded images</li>
                  <li>• Payment information</li>
                </ul>
                <p className="text-green-700 font-medium mt-2">
                  Note: Your evaluator profile is preserved.
                </p>
                <p className="text-red-600 font-medium">
                  This action cannot be undone!
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowClearDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmManualClear}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Clear All Data
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
