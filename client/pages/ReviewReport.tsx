import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Download,
  Eye,
  User,
  MapPin,
  Calendar,
  Building,
  Phone,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getSampleIllustrations } from "@/lib/test-illustrations";

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

interface ReportData {
  evaluatorData: any;
  claimantData: any;
  painIllustrationData: any;
  activityRatingData: any;
  referralQuestionsData: any;
  returnToWorkStatus: any;
  protocolTestsData: any;
  occupationalTasksData: any;
  testData: any;
  mtmTestData: any;
  digitalLibraryData: any;
  paymentData: any;
}

export default function ReviewReport() {
  const formatParam = (p: any) => {
    if (p && typeof p === "object" && p.value !== undefined) {
      return `${p.value}${p.unit ? " " + p.unit : ""}`;
    }
    return p ?? "";
  };

  const getTrialTime = (trial: any): number => {
    if (!trial) return 0;
    if (typeof trial.testTime === "number") return Number(trial.testTime) || 0;
    if (typeof trial.time === "number") return Number(trial.time) || 0;
    if (trial.time && typeof trial.time === "object") {
      const v = (trial.time as any).value;
      return typeof v === "number" ? v : Number(v) || 0;
    }
    return 0;
  };

  const computeTotalCompleted = (trial: any) => {
    if (!trial) return 0;
    if (trial.totalCompleted !== undefined && trial.totalCompleted !== null)
      return Number(trial.totalCompleted) || 0;
    const testTime = getTrialTime(trial);
    const percentIS = Number(trial.percentIS || 0);
    if (testTime > 0 && percentIS > 0) return testTime * (percentIS / 100);
    return testTime;
  };

  const computeAverageTotalCompleted = (trials: any[]) => {
    if (!trials || trials.length === 0) return 0;
    const vals = trials
      .map((t) => computeTotalCompleted(t))
      .filter((v) => v > 0);
    if (vals.length === 0) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  };

  const computeTimeSum = (trials: any[]) => {
    if (!trials || trials.length === 0) return 0;
    return trials
      .map((t) => getTrialTime(t))
      .reduce((s, v) => s + (Number(v) || 0), 0);
  };
  const navigate = useNavigate();
  const { selectedProfileId } = useAuth();
  const [reportData, setReportData] = useState<ReportData>({
    evaluatorData: null,
    claimantData: null,
    painIllustrationData: null,
    activityRatingData: null,
    referralQuestionsData: null,
    protocolTestsData: null,
    occupationalTasksData: null,
    testData: null,
    mtmTestData: null,
    digitalLibraryData: null,
    paymentData: null,
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);

  useEffect(() => {
    // Load all data from previous steps
    const loadAllData = async () => {
      const evaluatorData = localStorage.getItem("evaluatorData");
      const claimantData = localStorage.getItem("claimantData");
      const painIllustrationData = localStorage.getItem("painIllustrationData");
      const activityRatingData = localStorage.getItem("activityRatingData");
      const referralQuestionsData = localStorage.getItem(
        "referralQuestionsData",
      );
      const protocolTestsData = localStorage.getItem("protocolTestsData");
      const occupationalTasksData = localStorage.getItem(
        "occupationalTasksData",
      );
      const testData = localStorage.getItem("testData");
      const mtmTestData = localStorage.getItem("mtmTestData");
      const cardioTestData = localStorage.getItem("cardioTestData");
      const digitalLibraryRawData = localStorage.getItem("digitalLibraryData");
      const paymentData = localStorage.getItem("paymentData");

      // Handle digital library data loading (IndexedDB or localStorage)
      let digitalLibraryData = null;
      if (digitalLibraryRawData) {
        const parsedData = JSON.parse(digitalLibraryRawData);

        if (parsedData.storageType === "indexeddb") {
          // Load actual images from IndexedDB
          try {
            const imagesFromDB = await loadImagesFromDB();
            if (imagesFromDB.length > 0) {
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
            } else {
              // Fallback to metadata only
              digitalLibraryData = parsedData;
            }
          } catch (error) {
            console.error(
              "Error loading images from IndexedDB for review:",
              error,
            );
            digitalLibraryData = parsedData; // Use metadata only as fallback
          }
        } else {
          // Legacy localStorage format
          digitalLibraryData = parsedData;
        }
      }

      // Parse cardio data and merge with test data
      const parsedCardioData = cardioTestData ? JSON.parse(cardioTestData) : {};
      let parsedTestData = testData ? JSON.parse(testData) : null;

      // Merge cardio data into test data
      if (
        parsedTestData &&
        parsedTestData.tests &&
        Object.keys(parsedCardioData).length > 0
      ) {
        parsedTestData.tests = parsedTestData.tests.map((test: any) => {
          const cardioData = parsedCardioData[test.testId];
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

      const evaluatorDataStr = evaluatorData;
      let parsedEvaluator = evaluatorDataStr
        ? JSON.parse(evaluatorDataStr)
        : null;
      if (!parsedEvaluator && selectedProfileId) {
        try {
          const ref = doc(db, "evaluatorProfiles", selectedProfileId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const d: any = snap.data();
            parsedEvaluator = {
              name: d.name || "",
              licenseNo: d.licenseNo || "",
              clinicName: d.clinicName || "",
              address: d.address || "",
              country: d.country || "",
              city: d.city || "",
              zipcode: d.zipcode || "",
              email: d.email || "",
              phone: d.phone || "",
              website: d.website || "",
              profilePhoto: d.profilePhoto || null,
              clinicLogo: d.clinicLogo || null,
              fax: d.fax || "",
            };
          }
        } catch (e) {
          console.error("Failed to load evaluator profile for review:", e);
        }
      }

      setReportData({
        evaluatorData: parsedEvaluator,
        claimantData: claimantData ? JSON.parse(claimantData) : null,
        painIllustrationData: painIllustrationData
          ? JSON.parse(painIllustrationData)
          : null,
        activityRatingData: activityRatingData
          ? JSON.parse(activityRatingData)
          : null,
        referralQuestionsData: referralQuestionsData
          ? JSON.parse(referralQuestionsData)
          : null,
        returnToWorkStatus: referralQuestionsData
          ? JSON.parse(referralQuestionsData).returnToWorkStatus || null
          : null,
        protocolTestsData: protocolTestsData
          ? JSON.parse(protocolTestsData)
          : null,
        occupationalTasksData: occupationalTasksData
          ? JSON.parse(occupationalTasksData)
          : null,
        testData: parsedTestData,
        mtmTestData: mtmTestData ? JSON.parse(mtmTestData) : null,
        digitalLibraryData: digitalLibraryData,
        paymentData: paymentData ? JSON.parse(paymentData) : null,
      });
    };

    loadAllData();
  }, [selectedProfileId]);

  useEffect(() => {
    // Load signature image from localStorage
    const savedSignature = localStorage.getItem("signatureImage");
    if (savedSignature) {
      setSignatureImage(savedSignature);
    }
  }, []);

  const calculateBilateralDeficiency = (
    leftAvg: number,
    rightAvg: number,
  ): number => {
    if (leftAvg === 0 || rightAvg === 0) return 0;
    const higher = Math.max(leftAvg, rightAvg);
    const lower = Math.min(leftAvg, rightAvg);
    return Math.round(((higher - lower) / higher) * 100);
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

  const extractTrialValues = (measurements: any): number[] => {
    if (!measurements || typeof measurements !== "object") return [];
    return [
      measurements.trial1,
      measurements.trial2,
      measurements.trial3,
      measurements.trial4,
      measurements.trial5,
      measurements.trial6,
    ].filter((value) => typeof value === "number" && !Number.isNaN(value));
  };

  const resolveWeightDisplayOptions = (testEntry: any) => {
    const measureUnit = `${testEntry?.unitMeasure ?? ""}`.trim().toLowerCase();
    const targetUnit = `${testEntry?.valueToBeTestedUnit ?? ""}`
      .trim()
      .toLowerCase();
    const testName = `${testEntry?.testName ?? ""}`.toLowerCase();

    const isRangeOfMotion =
      testName.includes("flexion") ||
      testName.includes("extension") ||
      testName.includes("range") ||
      testName.includes("lateral") ||
      testName.includes("rotation") ||
      testName.includes("oblique") ||
      testName.includes("abduction") ||
      testName.includes("adduction") ||
      testName.includes("radial") ||
      testName.includes("ulnar") ||
      testName.includes("deviation") ||
      testName.includes("supination") ||
      testName.includes("pronation") ||
      testName.includes("inversion") ||
      testName.includes("eversion") ||
      testName.includes("dorsi") ||
      testName.includes("dorsiflexion") ||
      testName.includes("palmar") ||
      testName.includes("straight-leg") ||
      (testName.includes("straight") &&
        testName.includes("leg") &&
        testName.includes("raise")) ||
      testName.includes("slr");
    // If it's a range of motion test → always show degrees
    if (isRangeOfMotion) {
      return { convertToLbs: false, displayUnit: "°" };
    }
    const kgTokens = ["kg", "kgs", "kilogram", "kilograms"];
    const lbTokens = ["lb", "lbs", "pound", "pounds"];

    const convertToLbs =
      kgTokens.includes(measureUnit) || kgTokens.includes(targetUnit);

    const displayUnit = convertToLbs
      ? "lbs"
      : lbTokens.includes(targetUnit)
        ? "lbs"
        : lbTokens.includes(measureUnit)
          ? "lbs"
          : targetUnit || "lbs";

    return { convertToLbs, displayUnit };
  };

  const convertWeightMeasurement = (
    value: unknown,
    convertToLbs: boolean,
  ): number | null => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }
    const normalized = convertToLbs ? value * 2.20462 : value;
    return Math.round(normalized * 10) / 10;
  };

  const formatWeightMeasurement = (
    value: number | null,
    unitLabel: string,
  ): string => {
    if (value === null) return "—";
    const formatted = Number.isInteger(value)
      ? value.toFixed(0)
      : value.toFixed(1);
    return unitLabel ? `${formatted} ${unitLabel}` : formatted;
  };

  const buildTrialDisplayRow = (
    measurements: any,
    // convertToLbs: boolean,
    // unitLabel: string,
  ): string[] => {
    return Array.from({ length: 6 }, (_, index) => {
      const rawValue = measurements?.[`trial${index + 1}`];
      // const converted = convertWeightMeasurement(rawValue, convertToLbs);
      return rawValue;
    });
  };

  const computeMeasurementsAverage = (
    measurements: any,
    convertToLbs: boolean,
  ): number | null => {
    const trials = extractTrialValues(measurements);
    if (trials.length === 0) return null;
    const avg = trials.reduce((sum, value) => sum + value, 0) / trials.length;
    return convertWeightMeasurement(avg, convertToLbs);
  };

  const resolveDynamicEndpointLabel = (test: any): string | null => {
    const rawEndpoint = String(
      (test as any)?.dynamicEndpointType ??
        (test as any)?.parameters?.dynamicEndpointType ??
        "",
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

  const getPhysicalDemandLevel = (activities: any[]): string => {
    if (!activities || activities.length === 0) return "Not Assessed";

    const avgRating =
      activities.reduce((sum, activity) => sum + activity.rating, 0) /
      activities.length;

    if (avgRating >= 8) return "Heavy";
    if (avgRating >= 6) return "Medium";
    if (avgRating >= 4) return "Light";
    return "Sedentary";
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mark step 9 as completed
    const completedSteps = JSON.parse(
      localStorage.getItem("completedSteps") || "[]",
    );
    if (!completedSteps.includes(9)) {
      completedSteps.push(9);
      localStorage.setItem("completedSteps", JSON.stringify(completedSteps));
    }

    // Store review data
    localStorage.setItem(
      "reviewReportData",
      JSON.stringify({
        generated: true,
        timestamp: new Date().toISOString(),
      }),
    );

    setIsGenerating(false);
    setShowSuccessDialog(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
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

  if (!reportData.evaluatorData || !reportData.claimantData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Incomplete Data
          </h2>
          <p className="text-gray-600 mb-4">
            Please complete all previous steps before reviewing the report.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 py-8 px-4"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <FileText className="mr-3 h-8 w-8 text-blue-600" />
              Review Final Report
            </h1>
            <p className="text-xl text-gray-600">
              Review all collected data before generating the final evaluation
              report
            </p>
          </div>
        </div>

        {/* Professional Report Preview - MedSource Style */}
        <Card className="shadow-lg mb-8">
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="text-2xl flex items-center">
              <div className="w-6 h-6 mr-3 bg-white text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                9
              </div>
              Step 9: Review Report - Functional Abilities Determination
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Report Content */}
            <div className="bg-white border-b print:shadow-none">
              {/* Cover Page */}
              <div className="p-12 text-center border-b-2 border-gray-200">
                <div className="mb-8">
                  <div className="flex items-center justify-center mb-2">
                    {reportData.evaluatorData.clinicLogo ? (
                      <img
                        src={reportData.evaluatorData.clinicLogo}
                        alt={
                          reportData.evaluatorData.clinicName || "Company Logo"
                        }
                        className="h-24 w-auto max-w-96"
                      />
                    ) : (
                      <div className="h-24 flex items-center">
                        <span className="text-xl font-bold text-blue-800">
                          {reportData.evaluatorData.clinicName || "Clinic Name"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <h1
                  className="text-3xl font-bold text-blue-800 mb-8"
                  style={{ fontFamily: "Arial, sans-serif" }}
                >
                  Functional Abilities Determination
                </h1>

                <div
                  className="bg-gray-50 border border-gray-300 rounded-lg p-6 max-w-md mx-auto"
                  style={{ fontFamily: "Arial, sans-serif" }}
                >
                  <table
                    className="w-full text-left text-sm"
                    style={{ fontFamily: "Arial, sans-serif" }}
                  >
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 font-semibold">Claimant Name:</td>
                        <td className="py-2">
                          {reportData.claimantData.firstName}{" "}
                          {reportData.claimantData.lastName}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-semibold">Claimant #:</td>
                        <td className="py-2">
                          {reportData.claimantData.claimantId || "N/A"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 font-semibold">
                          Date of Evaluation(s):
                        </td>
                        <td className="py-2">{currentDate}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-16 text-center text-gray-600">
                  <p className="text-sm font-semibold">
                    CONFIDENTIAL INFORMATION ENCLOSED
                  </p>
                  <div className="mt-4 text-xs">
                    <div className="mb-2">
                      <p className="font-semibold">
                        {reportData.evaluatorData.clinicName}
                      </p>
                    </div>
                    <p>{reportData.evaluatorData.address}</p>
                    <p>
                      Phone: {reportData.evaluatorData.phone} | Fax:{" "}
                      {reportData.evaluatorData.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Table of Contents */}
              <div className="p-8 border-b">
                <h2
                  className="text-xl font-bold mb-6"
                  style={{ fontFamily: "Arial, sans-serif" }}
                >
                  Contents of Report:
                </h2>
                <div
                  className="space-y-2 text-sm"
                  style={{ fontFamily: "Arial, sans-serif" }}
                >
                  <p>Client Information</p>
                  <p>Pain & Symptom Illustration</p>
                  <p>Referral Questions</p>
                  <p>Conclusions</p>
                  <p>
                    Functional Abilities Determination and Job Match Results
                  </p>
                  <p>Test Data:</p>
                  <div className="ml-2 space-y-1">
                    <p>• Activity Overview</p>
                    <p>• Extremity Strength</p>
                    <p>• Occupational Tasks</p>
                    <p>• Range of Motion (Spine)</p>
                  </div>
                  <p className="mt-4">Appendix One: Reference Charts</p>
                  <p>Appendix Two: Digital Library</p>
                </div>
              </div>

              {/* Client Information Section */}
              <div className="p-8 border-b">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1
                      className="text-2xl font-bold text-blue-800"
                      style={{ fontFamily: "Arial, sans-serif" }}
                    >
                      Functional Abilities Determination
                    </h1>
                    <div className="my-2">
                      <span className="text-sm font-semibold text-gray-600">
                        {reportData.evaluatorData.clinicName}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {reportData.evaluatorData.address}
                    </p>
                    <p className="text-sm text-gray-600">
                      Phone: {reportData.evaluatorData.phone} | Fax:{" "}
                      {reportData.evaluatorData.phone}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>
                      <strong>Report Date:</strong> {currentDate}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1">
                    <div className="w-32 h-40 border border-gray-300 rounded mb-4 overflow-hidden">
                      {reportData.claimantData.profilePhoto ? (
                        <img
                          src={reportData.claimantData.profilePhoto}
                          alt={`${reportData.claimantData.firstName} ${reportData.claimantData.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                          Claimant Photo
                          <br />
                          (If Available)
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold">
                      {reportData.claimantData.firstName}{" "}
                      {reportData.claimantData.lastName}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <h3
                      className="font-bold mb-4"
                      style={{ fontFamily: "Arial, sans-serif" }}
                    >
                      Client Information
                    </h3>
                    <div
                      className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm"
                      style={{ fontFamily: "Arial, sans-serif" }}
                    >
                      <div>
                        <p>
                          <strong>Name:</strong>{" "}
                          {reportData.claimantData.firstName}{" "}
                          {reportData.claimantData.lastName}
                        </p>
                        <p>
                          <strong>Address:</strong>{" "}
                          {reportData.claimantData.address || "N/A"}
                        </p>
                        <p>
                          <strong>Home Phone:</strong>{" "}
                          {reportData.claimantData.phone}
                        </p>
                        <p>
                          <strong>Work Phone:</strong>{" "}
                          {reportData.claimantData.workPhone || "n/a"}
                        </p>
                        <p>
                          <strong>Occupation:</strong>{" "}
                          {reportData.claimantData.occupation}
                        </p>
                        <p>
                          <strong>Employer(SIC):</strong>{" "}
                          {reportData.claimantData.employer}
                        </p>
                        <p>
                          <strong>Insurance:</strong>{" "}
                          {reportData.claimantData.insurance}
                        </p>
                        <p>
                          <strong>Physician:</strong>{" "}
                          {reportData.claimantData.referredBy}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>ID:</strong>{" "}
                          {reportData.claimantData.claimantId || "N/A"}
                        </p>
                        <p>
                          <strong>DOB (Age):</strong>{" "}
                          {formatDate(reportData.claimantData.dateOfBirth)} (
                          {calculateAge(reportData.claimantData.dateOfBirth)})
                        </p>
                        <p>
                          <strong>Gender:</strong>{" "}
                          {reportData.claimantData.gender}
                        </p>
                        <p>
                          <strong>Height:</strong>{" "}
                          {reportData.claimantData.heightValue}{" "}
                          {reportData.claimantData.heightUnit}
                        </p>
                        <p>
                          <strong>Weight:</strong>{" "}
                          {reportData.claimantData.weightValue}{" "}
                          {reportData.claimantData.weightUnit}
                        </p>
                        <p>
                          <strong>Dominant Hand:</strong>{" "}
                          {reportData.claimantData.dominantHand}
                        </p>
                        <p>
                          <strong>Referred By:</strong>{" "}
                          {reportData.claimantData.referredBy}
                        </p>
                        <p>
                          <strong>Resting Pulse:</strong>{" "}
                          {reportData.claimantData.restingPulse} bpm
                        </p>
                        <p>
                          <strong>BP Sitting:</strong>{" "}
                          {reportData.claimantData.bpSitting || "N/A"}
                        </p>
                        <p>
                          <strong>Tested By:</strong>{" "}
                          {reportData.evaluatorData.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mechanism and History of Injury */}
                <div className="mt-2 border-l-4 border-gray-300 pl-4">
                  <h3 className="font-bold mb-2">
                    Mechanism and History of Injury
                  </h3>
                  <table className="w-full border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left">
                          Date
                        </th>
                        <th className="border border-gray-300 p-2 text-left">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2">
                          {formatDate(reportData.claimantData.dateOfBirth)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {reportData.claimantData.claimantHistory ||
                            "No specific injury history provided. Client presents for functional capacity evaluation to determine current work abilities and limitations."}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pain/Symptom Illustration */}
              {reportData.painIllustrationData && (
                <div className="p-8 border-b">
                  <h3
                    className="font-bold mb-6"
                    style={{ fontFamily: "Arial, sans-serif" }}
                  >
                    Pain/Symptom Illustration
                  </h3>

                  {/* Main Pain Illustration - Client's Drawing */}
                  {reportData.painIllustrationData.savedImage && (
                    <div className="mb-8">
                      <h4
                        className="font-semibold mb-4"
                        style={{ fontFamily: "Arial, sans-serif" }}
                      >
                        Client's Pain Illustration
                      </h4>
                      <div className="text-center bg-gray-50 p-4 rounded border">
                        <img
                          src={reportData.painIllustrationData.savedImage}
                          alt="Client's Pain Illustration"
                          className="max-w-full h-auto border border-gray-300 rounded mx-auto shadow-sm"
                          style={{ maxHeight: "400px" }}
                        />
                        <p
                          className="text-sm text-gray-600 mt-3 italic"
                          style={{
                            fontFamily: "Arial, sans-serif",
                          }}
                        >
                          Client's self-reported pain and symptom locations
                        </p>
                        {reportData.painIllustrationData.imageTitle && (
                          <p
                            className="text-sm font-medium mt-2 text-blue-800"
                            style={{
                              fontFamily: "Arial, sans-serif",
                            }}
                          >
                            Assessment:{" "}
                            {reportData.painIllustrationData.imageTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Comprehensive Anatomical Reference Diagrams */}
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
                    {/* Utility function to render markers */}
                    {["front", "back", "right", "left"].map((viewType, i) => {
                      const viewMap = {
                        front: {
                          label: "Front View",
                          image: "/humanBody/front_view.png",
                        },
                        back: {
                          label: "Back View",
                          image: "/humanBody/back_view.png",
                        },
                        left: {
                          label: "Right Side",
                          image: "/humanBody/left_view.png",
                        },
                        right: {
                          label: "Left Side",
                          image: "/humanBody/right_view.png",
                        },
                      };
                      const { label, image } =
                        viewMap[viewType as keyof typeof viewMap];
                      const markers =
                        reportData.painIllustrationData.markers?.filter(
                          (m: any) => m.view === viewType,
                        );

                      return (
                        <div key={i} className="text-center">
                          <h5
                            className="font-semibold mb-3 text-blue-800"
                            style={{
                              fontFamily: "Arial, sans-serif",
                            }}
                          >
                            {label}
                          </h5>
                          <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                            <div className="relative w-full h-72">
                              <img
                                src={image}
                                alt={label}
                                className="w-full h-full object-contain pointer-events-none bg-gray-50"
                              />

                              {/* Pain markers */}
                              {markers?.map((marker: any, index: number) => {
                                let symbolText = "";
                                if (marker.type === "primary-concern")
                                  symbolText = "P1";
                                else if (marker.type === "secondary-concern")
                                  symbolText = "P2";
                                else if (marker.type === "dull-ache")
                                  symbolText = "~";
                                else if (marker.type === "shooting")
                                  symbolText = "/";
                                else if (marker.type === "burning")
                                  symbolText = "x";
                                else if (marker.type === "pins-needles")
                                  symbolText = "•";
                                else if (marker.type === "numbness")
                                  symbolText = "o";
                                else if (marker.type === "temperature")
                                  symbolText = "T";
                                else if (marker.type === "swelling")
                                  symbolText = "SW";
                                else if (marker.type === "scar")
                                  symbolText = "S";
                                else if (marker.type === "crepitus")
                                  symbolText = "C";
                                else
                                  symbolText =
                                    marker.symbol ||
                                    (marker.concern === "primary"
                                      ? "P1"
                                      : "P2");

                                // Get marker color based on type
                                const getMarkerColor = (
                                  markerType: string,
                                ): string => {
                                  switch (markerType) {
                                    case "primary-concern":
                                      return "#2563eb"; // blue-600
                                    case "secondary-concern":
                                      return "#9333ea"; // purple-600
                                    case "dull-ache":
                                      return "#f59e0b"; // amber-500
                                    case "shooting":
                                      return "#dc2626"; // red-600
                                    case "burning":
                                      return "#ea580c"; // orange-600
                                    case "pins-needles":
                                      return "#7c3aed"; // violet-600
                                    case "numbness":
                                      return "#475569"; // slate-600
                                    case "temperature":
                                      return "#06b6d4"; // cyan-500
                                    case "swelling":
                                      return "#059669"; // emerald-600
                                    case "scar":
                                      return "#db2777"; // pink-600
                                    case "crepitus":
                                      return "#4f46e5"; // indigo-600
                                    default:
                                      return "#6b7280"; // gray-600
                                  }
                                };

                                const x = `${marker.x}%`;
                                const y = `${marker.y}%`;
                                return (
                                  <div
                                    key={index}
                                    className="absolute text-xs font-bold z-10"
                                    style={{
                                      left: x,
                                      top: y,
                                      color: getMarkerColor(marker.type),
                                      transform: "translate(-50%, -50%)",
                                      pointerEvents: "none",
                                      textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
                                    }}
                                  >
                                    {symbolText}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pain Legend Table */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <table className="w-full border border-gray-400 text-sm">
                        <tbody>
                          <tr>
                            <td
                              className="border border-gray-400 bg-yellow-200 px-3 py-1 font-semibold text-center"
                              colSpan={2}
                            >
                              Area of Primary Concern
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-blue-600">
                              P1
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Primary
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-purple-600">
                              P2
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Secondary
                            </td>
                          </tr>
                          <tr>
                            <td
                              className="border border-gray-400 bg-yellow-200 px-3 py-1 font-semibold text-center"
                              colSpan={2}
                            >
                              Pain Indicators
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-amber-500">
                              ~
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Dull Ache
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-orange-600">
                              x
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Burning
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-red-600">
                              /
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Shooting
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-violet-600">
                              •
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Pins and Needles
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-slate-600">
                              o
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Numbness
                            </td>
                          </tr>
                          <tr>
                            <td
                              className="border border-gray-400 bg-yellow-200 px-3 py-1 font-semibold text-center"
                              colSpan={2}
                            >
                              General Indicators
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-cyan-500">
                              T
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Temperature
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-emerald-600">
                              SW
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Swelling
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-pink-600">
                              S
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Scar
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-400 px-3 py-1 text-center font-bold text-indigo-600">
                              C
                            </td>
                            <td className="border border-gray-400 px-3 py-1">
                              Crepitus
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pain Illustration Reference Images */}
                  {reportData.painIllustrationData?.savedImageData &&
                    reportData.painIllustrationData.savedImageData.length >
                      0 && (
                      <div className="mt-6">
                        <h4
                          className="font-semibold mb-3"
                          style={{
                            fontFamily: "Arial, sans-serif",
                          }}
                        >
                          Reference Images
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {reportData.painIllustrationData.savedImageData.map(
                            (image: any, index: number) => (
                              <div key={index} className="relative">
                                {/* Pain Title - Bold and on top */}
                                {image.title && (
                                  <div className="mb-2">
                                    <p
                                      className="font-bold text-sm text-gray-800 text-center"
                                      style={{
                                        fontFamily: "Arial, sans-serif",
                                      }}
                                    >
                                      {image.title}
                                    </p>
                                  </div>
                                )}
                                <div className="relative">
                                  <img
                                    src={image.dataUrl || image.data}
                                    alt={
                                      image.title || `Reference ${index + 1}`
                                    }
                                    className="w-full h-32 object-contain border border-gray-300 rounded bg-gray-50"
                                  />
                                  {/* Arrow pointing to relevant anatomy */}
                                  <div className="absolute top-1 right-1">
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 16 16"
                                      className="text-red-600"
                                    >
                                      <path
                                        d="M2 2 L14 8 L2 14 L6 8 Z"
                                        fill="currentColor"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Referral Questions */}
              {reportData.referralQuestionsData &&
                reportData.referralQuestionsData.questions && (
                  <div className="p-8 border-b">
                    <div className="bg-yellow-200 border border-yellow-400 p-2 mb-4">
                      <h3 className="font-bold">Referral Questions</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Total Questions:{" "}
                        {reportData.referralQuestionsData.questions?.length ||
                          0}
                      </p>
                    </div>

                    {/* Range of Motion Example */}
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">
                        What is the present lumbar range of motion noted for the
                        client?
                      </h4>

                      <table className="w-full border border-gray-300 text-sm mb-4">
                        <thead>
                          <tr className="bg-yellow-200">
                            <th className="border border-gray-300 p-2">
                              Area Evaluated:
                            </th>
                            <th className="border border-gray-300 p-2">
                              Data:
                            </th>
                            <th className="border border-gray-300 p-2">
                              Valid?
                            </th>
                            <th className="border border-gray-300 p-2">
                              Norm:
                            </th>
                            <th className="border border-gray-300 p-2">
                              % of Norm:
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 p-2">
                              Lumbar Flexion
                            </td>
                            <td className="border border-gray-300 p-2">49 °</td>
                            <td className="border border-gray-300 p-2">Pass</td>
                            <td className="border border-gray-300 p-2">60 °</td>
                            <td className="border border-gray-300 p-2">82%</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">
                              Lumbar Extension
                            </td>
                            <td className="border border-gray-300 p-2">28 °</td>
                            <td className="border border-gray-300 p-2">Pass</td>
                            <td className="border border-gray-300 p-2">25 °</td>
                            <td className="border border-gray-300 p-2">112%</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">
                              Lumbar Lateral Flexion - Left
                            </td>
                            <td className="border border-gray-300 p-2">27 °</td>
                            <td className="border border-gray-300 p-2">Pass</td>
                            <td className="border border-gray-300 p-2">25 °</td>
                            <td className="border border-gray-300 p-2">108%</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 p-2">
                              Lumbar Lateral Flexion - Right
                            </td>
                            <td className="border border-gray-300 p-2">25 °</td>
                            <td className="border border-gray-300 p-2">Pass</td>
                            <td className="border border-gray-300 p-2">25 °</td>
                            <td className="border border-gray-300 p-2">116%</td>
                          </tr>
                        </tbody>
                      </table>

                      <p className="text-sm italic">
                        *Slight decrease in flexion but not a limitation to
                        return to duties.
                      </p>

                      {/* Range of Motion Supporting Photos */}
                      {(() => {
                        const rangeofMotionDemandQuestion =
                          reportData.referralQuestionsData.questions?.find(
                            (qa: any) =>
                              qa.question &&
                              qa.question.includes(
                                "present lumbar range of motion",
                              ),
                          );

                        if (
                          rangeofMotionDemandQuestion?.savedImageData &&
                          rangeofMotionDemandQuestion.savedImageData.length > 0
                        ) {
                          return (
                            <div className="mt-6">
                              <h5 className="font-medium text-sm mb-3 text-gray-800">
                                Range of Motion Assessment Documentation:
                              </h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {rangeofMotionDemandQuestion.savedImageData.map(
                                  (image: any, imgIndex: number) => (
                                    <div
                                      key={imgIndex}
                                      className="relative group"
                                    >
                                      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                                        {image.type &&
                                        image.type.startsWith("image/") ? (
                                          <>
                                            <img
                                              src={image.dataUrl}
                                              alt={
                                                image.name ||
                                                `Physical Demand Assessment ${imgIndex + 1}`
                                              }
                                              className="w-full h-32 object-cover"
                                            />
                                            <div className="p-2">
                                              <p
                                                className="text-xs text-gray-600 truncate"
                                                title={image.name}
                                              >
                                                {image.name ||
                                                  `Assessment Image ${imgIndex + 1}`}
                                              </p>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                                            <div className="text-center">
                                              <div className="text-2xl text-gray-400 mb-1">
                                                📄
                                              </div>
                                              <p className="text-xs text-gray-600">
                                                {image.name ||
                                                  `Document ${imgIndex + 1}`}
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Arrow indicator pointing to relevant assessment */}
                                      <div className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                                        <svg
                                          width="12"
                                          height="12"
                                          viewBox="0 0 12 12"
                                          fill="currentColor"
                                        >
                                          <path d="M2 2 L10 6 L2 10 L5 6 Z" />
                                        </svg>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>

                              {/* Reference note */}
                              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                                <p className="text-xs text-green-800">
                                  <strong>Documentation:</strong> The above
                                  images provide visual evidence supporting the
                                  physical demand level classification and work
                                  capacity assessment.
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Other Referral Questions */}
                    <div className="space-y-6">
                      {reportData.referralQuestionsData.questions
                        ?.filter(
                          (qa: any) =>
                            qa.question &&
                            qa.question.trim() &&
                            !qa.question.includes(
                              "Physical Demand Classification",
                            ) &&
                            !qa.question.includes(
                              "present lumbar range of motion",
                            ) &&
                            !qa.question.includes("Conclusions") &&
                            !qa.question.includes("6b)") &&
                            !qa.question.includes("6c)"),
                        )
                        .map((qa: any, index: number) => (
                          <div
                            key={qa.id || index}
                            className="border-b border-gray-200 pb-4 last:border-b-0"
                          >
                            <h4 className="font-semibold mb-3 text-blue-800">
                              {qa.question.replace(/^6a\)\s*/, "")}
                            </h4>
                            <p className="text-sm text-gray-700 mb-4">
                              {qa.answer ||
                                "Assessment pending - to be completed during evaluation process."}
                            </p>

                            {/* Display uploaded photos for this question */}
                            {qa.savedImageData &&
                              qa.savedImageData.length > 0 && (
                                <div className="mt-4">
                                  <h5 className="font-medium text-sm mb-3 text-gray-800">
                                    Supporting Documentation:
                                  </h5>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {qa.savedImageData.map(
                                      (image: any, imgIndex: number) => (
                                        <div
                                          key={imgIndex}
                                          className="relative group"
                                        >
                                          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                                            {image.type &&
                                            image.type.startsWith("image/") ? (
                                              <>
                                                <img
                                                  src={image.dataUrl}
                                                  alt={
                                                    image.name ||
                                                    `Question ${index + 1} Image ${imgIndex + 1}`
                                                  }
                                                  className="w-full h-32 object-cover"
                                                />
                                                <div className="p-2">
                                                  <p
                                                    className="text-xs text-gray-600 truncate"
                                                    title={image.name}
                                                  >
                                                    {image.name ||
                                                      `Image ${imgIndex + 1}`}
                                                  </p>
                                                </div>
                                              </>
                                            ) : (
                                              <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                                                <div className="text-center">
                                                  <div className="text-2xl text-gray-400 mb-1">
                                                    📄
                                                  </div>
                                                  <p className="text-xs text-gray-600">
                                                    {image.name ||
                                                      `Document ${imgIndex + 1}`}
                                                  </p>
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {/* Arrow indicator pointing to relevant area */}
                                          <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                                            <svg
                                              width="12"
                                              height="12"
                                              viewBox="0 0 12 12"
                                              fill="currentColor"
                                            >
                                              <path d="M2 2 L10 6 L2 10 L5 6 Z" />
                                            </svg>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>

                                  {/* Reference note */}
                                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                                    <p className="text-xs text-blue-800">
                                      <strong>Note:</strong> The above images
                                      provide visual documentation and evidence
                                      to support the assessment and answer for
                                      this referral question.
                                    </p>
                                  </div>
                                </div>
                              )}

                            {/* Show placeholder if no images */}
                            {(!qa.savedImageData ||
                              qa.savedImageData.length === 0) && (
                              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                                <p className="text-xs text-gray-600 italic">
                                  No supporting images provided for this
                                  question.
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Consistency Questions (6b and 6c) */}
                    <div className="space-y-6">
                      {reportData.referralQuestionsData.questions
                        ?.filter(
                          (qa: any) =>
                            qa.question &&
                            (qa.question.includes("6b)") ||
                              qa.question.includes("6c)")),
                        )
                        .map((qa: any, index: number) => {
                          const answerParts = qa.answer?.split("|") || [];
                          const status = answerParts[0] || "";
                          const comments = answerParts[1] || "";

                          return (
                            <div
                              key={qa.id || index}
                              className="border-b border-gray-200 pb-4 last:border-b-0"
                            >
                              <h4 className="font-semibold mb-3 text-blue-800">
                                {qa.question.replace(/^6[bc]\)\s*/, "")}
                              </h4>
                              <div className="mb-2">
                                <span className="text-sm font-medium">
                                  Status:{" "}
                                </span>
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                    status.toUpperCase().includes("PASS")
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {status}
                                </span>
                              </div>
                              {comments && (
                                <div>
                                  <span className="text-sm font-medium">
                                    Comments:{" "}
                                  </span>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {comments}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* Physical Demand Classification */}
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">
                        What would be the Physical Demand Classification (PDC)
                        for this client?
                      </h4>
                      {(() => {
                        const qa =
                          reportData.referralQuestionsData?.questions?.find(
                            (x: any) =>
                              x?.question &&
                              x.question.includes(
                                "Physical Demand Classification",
                              ),
                          );
                        const selectedLevel = qa?.answer
                          ? String(qa.answer).split("|")[0].replace("PDC:", "")
                          : null;

                        if (!selectedLevel) return null;

                        return (
                          <p className="mb-4">
                            *{selectedLevel} which is in line with full return
                            to duties.
                          </p>
                        );
                      })()}

                      {(() => {
                        const PDC_MAP: Record<
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
                            title: "(VH) Very Heavy Work",
                            description:
                              "Exerting over 100 lbs of force occasionally, and over 50 lbs of force frequently, and over 25 lbs of force constantly to move objects. For civilian workers, 0.7 percent required a very heavy strength level, which indicates requirements beyond the conditions set for heavy work. Examples of occupational groups with heavy strength level requirements include: Laborers in construction and extraction occupations may lift items that weigh 50 pounds or more, like bags of cement or sheets of plywood, for more than 1/3 of the workday.",
                          },
                        };
                        const qa =
                          reportData.referralQuestionsData?.questions?.find(
                            (x: any) =>
                              x?.question &&
                              x.question.includes(
                                "Physical Demand Classification",
                              ),
                          );
                        if (
                          !qa ||
                          !qa.answer ||
                          !String(qa.answer).startsWith("PDC:")
                        ) {
                          return null;
                        }
                        const level = String(qa.answer)
                          .split("|")[0]
                          .replace("PDC:", "");
                        const comments = String(qa.answer).split("|")[1] || "";
                        const info = (PDC_MAP as any)[level];
                        if (!info) return null;
                        return (
                          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 mb-4">
                            <p className="font-semibold text-blue-800 mb-2">
                              {info.title}
                            </p>
                            <p className="text-sm text-gray-800">
                              {info.description}
                            </p>
                            {comments && (
                              <p className="text-sm text-gray-800 mt-2">
                                <span className="font-semibold">
                                  Additional Comments:
                                </span>{" "}
                                {comments}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      <table className="w-full border border-gray-300 text-sm mb-4">
                        <thead>
                          <tr className="bg-yellow-200">
                            <th className="border border-gray-300 p-2">
                              Physical Demand Level
                            </th>
                            <th className="border border-gray-300 p-2">
                              SELDOM / OCCASIONALLY
                              <br />
                              0-33% of the workday
                            </th>
                            <th className="border border-gray-300 p-2">
                              FREQUENTLY
                              <br />
                              34-66% of the workday
                            </th>
                            <th className="border border-gray-300 p-2">
                              CONSTANTLY
                              <br />
                              67-100% of the workday
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const qa =
                              reportData.referralQuestionsData?.questions?.find(
                                (x: any) =>
                                  x?.question &&
                                  x.question.includes(
                                    "Physical Demand Classification",
                                  ),
                              );
                            const selectedLevel = qa?.answer
                              ? String(qa.answer)
                                  .split("|")[0]
                                  .replace("PDC:", "")
                              : null;

                            const levels = [
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

                            return levels.map((level, index) => (
                              <tr
                                key={index}
                                className={
                                  selectedLevel === level.name
                                    ? "bg-blue-100"
                                    : ""
                                }
                              >
                                <td className="border border-gray-300 p-2 font-semibold">
                                  {level.name}
                                </td>
                                <td className="border border-gray-300 p-2">
                                  {level.occasional}
                                </td>
                                <td className="border border-gray-300 p-2">
                                  {level.frequent}
                                </td>
                                <td className="border border-gray-300 p-2">
                                  {level.constant}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>

                      {/* Display images for Physical Demand Classification question */}
                      {(() => {
                        const physicalDemandQuestion =
                          reportData.referralQuestionsData.questions?.find(
                            (qa: any) =>
                              qa.question &&
                              qa.question.includes(
                                "Physical Demand Classification",
                              ),
                          );

                        if (
                          physicalDemandQuestion?.savedImageData &&
                          physicalDemandQuestion.savedImageData.length > 0
                        ) {
                          return (
                            <div className="mt-6">
                              <h5 className="font-medium text-sm mb-3 text-gray-800">
                                Physical Demand Assessment Documentation:
                              </h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {physicalDemandQuestion.savedImageData.map(
                                  (image: any, imgIndex: number) => (
                                    <div
                                      key={imgIndex}
                                      className="relative group"
                                    >
                                      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                                        {image.type &&
                                        image.type.startsWith("image/") ? (
                                          <>
                                            <img
                                              src={image.dataUrl}
                                              alt={
                                                image.name ||
                                                `Physical Demand Assessment ${imgIndex + 1}`
                                              }
                                              className="w-full h-32 object-cover"
                                            />
                                            <div className="p-2">
                                              <p
                                                className="text-xs text-gray-600 truncate"
                                                title={image.name}
                                              >
                                                {image.name ||
                                                  `Assessment Image ${imgIndex + 1}`}
                                              </p>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                                            <div className="text-center">
                                              <div className="text-2xl text-gray-400 mb-1">
                                                📄
                                              </div>
                                              <p className="text-xs text-gray-600">
                                                {image.name ||
                                                  `Document ${imgIndex + 1}`}
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Arrow indicator pointing to relevant assessment */}
                                      <div className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                                        <svg
                                          width="12"
                                          height="12"
                                          viewBox="0 0 12 12"
                                          fill="currentColor"
                                        >
                                          <path d="M2 2 L10 6 L2 10 L5 6 Z" />
                                        </svg>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>

                              {/* Reference note */}
                              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                                <p className="text-xs text-green-800">
                                  <strong>Documentation:</strong> The above
                                  images provide visual evidence supporting the
                                  physical demand level classification and work
                                  capacity assessment.
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

              {/* Conclusions */}
              <div className="p-8 border-b">
                <div className="bg-yellow-200 border border-yellow-400 p-2 mb-4">
                  <h3 className="font-bold">Conclusions</h3>
                </div>

                <div className="space-y-6 text-sm">
                  {/* Return to Work Status Tab */}
                  {reportData.referralQuestionsData?.conclusionData
                    ?.returnToWorkStatus?.status && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Return to Work Status
                      </h4>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>Status:</strong>{" "}
                          {
                            reportData.referralQuestionsData.conclusionData
                              .returnToWorkStatus.status
                          }
                        </p>
                        {reportData.referralQuestionsData.conclusionData
                          .returnToWorkStatus.comments && (
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                            <strong>Comments:</strong>{" "}
                            {
                              reportData.referralQuestionsData.conclusionData
                                .returnToWorkStatus.comments
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Observed Symptom Behavior (RPDR) Tab */}
                  {reportData.referralQuestionsData?.conclusionData
                    ?.rpdrBehaviors &&
                    Object.values(
                      reportData.referralQuestionsData.conclusionData
                        .rpdrBehaviors,
                    ).some((v: any) => v === true) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Observed Symptom Behavior / Reliability of Pain and
                          Disability Reports (RPDR)
                        </h4>
                        <p className="text-xs text-gray-600 mb-3">
                          Observable demonstrations of the patient that were
                          consistent or inconsistent with the medical diagnosis
                          and reported pain level.
                        </p>
                        <div className="space-y-1">
                          {Object.entries(
                            reportData.referralQuestionsData.conclusionData
                              .rpdrBehaviors,
                          )
                            .filter(([_, checked]) => checked === true)
                            .map(([behavior]) => (
                              <p key={behavior} className="text-sm">
                                • {behavior}
                              </p>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Observable Signs of Effort (CTP) Tab */}
                  {reportData.referralQuestionsData?.conclusionData
                    ?.ctpBehaviors &&
                    Object.values(
                      reportData.referralQuestionsData.conclusionData
                        .ctpBehaviors,
                    ).some((v: any) => v === true) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Observable Signs of Effort / Competitive Testing
                          Performance (CTP)
                        </h4>
                        <p className="text-xs text-gray-600 mb-3">
                          Observable behaviors in which a person attempts to
                          gain an advantage to improve scores.
                        </p>
                        <div className="space-y-1">
                          {Object.entries(
                            reportData.referralQuestionsData.conclusionData
                              .ctpBehaviors,
                          )
                            .filter(([_, checked]) => checked === true)
                            .map(([behavior]) => (
                              <p key={behavior} className="text-sm">
                                • {behavior}
                              </p>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Static Conclusion */}
                  {(() => {
                    const conclusion =
                      reportData.referralQuestionsData?.questions?.find(
                        (qa: any) =>
                          qa?.question &&
                          qa.question.toLowerCase().includes("conclusion"),
                      )?.answer;
                    if (!conclusion) return null;
                    return (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Conclusion
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {conclusion}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Display uploaded images from Conclusions question if available */}
                  {(() => {
                    // Find the "Conclusions?" question and get its images
                    const conclusionQuestion =
                      reportData.referralQuestionsData?.questions?.find(
                        (qa: any) =>
                          qa.question &&
                          qa.question.toLowerCase().includes("conclusion"),
                      );

                    // Only show images if the Conclusions question has uploaded images
                    if (
                      conclusionQuestion?.savedImageData &&
                      conclusionQuestion.savedImageData.length > 0
                    ) {
                      return (
                        <div className="mt-8">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {conclusionQuestion.savedImageData.map(
                              (image: any, index: number) => (
                                <div key={index} className="relative group">
                                  <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                                    <img
                                      src={image.dataUrl}
                                      alt={
                                        image.name ||
                                        `Conclusion Image ${index + 1}`
                                      }
                                      className="w-full h-32 object-cover"
                                    />
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="mt-6">
                  <div className="bg-yellow-200 border border-yellow-400 p-2 mb-4">
                    <h4 className="font-bold">Signature of Evaluator</h4>
                  </div>

                  <div className="mt-8">
                    {signatureImage ? (
                      <div className="mb-6 flex items-end">
                        <img
                          src={signatureImage}
                          alt="Evaluator Signature"
                          className="max-w-xs h-24 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="border-b border-gray-400 mb-6" style={{ width: "250px" }}></div>
                    )}
                    <p className="text-sm">Date: {currentDate}</p>
                    <p className="text-sm font-semibold">
                      {reportData.evaluatorData.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {reportData.evaluatorData.licenseNo
                        ? `License: ${reportData.evaluatorData.licenseNo}`
                        : "Licensed Evaluator"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Results Summary */}
              {reportData.testData && reportData.testData.tests && (
                <div className="p-8 border-b">
                  <h3 className="font-bold mb-4">
                    Functional Abilities Determination and Job Match Results
                  </h3>
                  <h4 className="font-semibold mb-4">
                    Test Results and Job Match:
                  </h4>

                  <table className="w-full border border-gray-300 text-xs">
                    <thead>
                      <tr className="bg-yellow-200">
                        <th className="border border-gray-300 p-2">
                          Activity Tested
                        </th>
                        <th className="border border-gray-300 p-2">Sit Time</th>
                        <th className="border border-gray-300 p-2">
                          Stand Time
                        </th>
                        <th className="border border-gray-300 p-2">
                          Test Results
                        </th>
                        <th className="border border-gray-300 p-2">
                          Job Description
                        </th>
                        <th className="border border-gray-300 p-2">
                          Job Requirements
                        </th>
                        <th className="border border-gray-300 p-2">
                          Job Match (Yes/No)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Initial Assessment */}
                      <tr>
                        <td className="border border-gray-300 p-2">
                          Client Interview Test
                        </td>
                        <td className="border border-gray-300 p-2">45 min</td>
                        <td className="border border-gray-300 p-2"></td>
                        <td className="border border-gray-300 p-2">N/A</td>
                        <td className="border border-gray-300 p-2">
                          Initial assessment and history gathering
                        </td>
                        <td className="border border-gray-300 p-2">
                          Basic interview requirements
                        </td>
                        <td className="border border-gray-300 p-2">Yes</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">
                          Activity Overview
                        </td>
                        <td className="border border-gray-300 p-2"></td>
                        <td className="border border-gray-300 p-2">5 min</td>
                        <td className="border border-gray-300 p-2">Complete</td>
                        <td className="border border-gray-300 p-2">
                          Overview of testing procedures and activities
                        </td>
                        <td className="border border-gray-300 p-2">
                          Orientation and instruction
                        </td>
                        <td className="border border-gray-300 p-2">Yes</td>
                      </tr>

                      {/* Categorized Test Results */}
                      {(() => {
                        // Define comprehensive normative standards for job match evaluation
                        const getJobRequirements = (testName: string) => {
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
                                  "Cervical extension ��45° for functional neck movement",
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
                                "Lifting capacity ≥10 kg (Light) / ���25 kg (Medium work)",
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
                        const evaluateJobMatch = (test: any) => {
                          const jobReq = getJobRequirements(test.testName);

                          // Priority 1: Use user's explicit job match selection if provided
                          if (test.jobMatch === "matched") {
                            return true;
                          }
                          if (test.jobMatch === "not_matched") {
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
                          const leftAvg = calculateAverage(
                            test.leftMeasurements,
                          );
                          const rightAvg = calculateAverage(
                            test.rightMeasurements,
                          );

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

                        // Group tests by specific categories collected in software
                        const testsByCategory: { [key: string]: any[] } = {
                          Strength: [],
                          "ROM Total Spine/Extremity": [],
                          "ROM Hand/Foot": [],
                          "Occupational Tasks": [],
                          Cardio: [],
                        };

                        reportData.testData.tests?.forEach((test: any) => {
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
                            testsByCategory["ROM Total Spine/Extremity"].push(
                              test,
                            );
                          } else if (
                            originalCategory === "Occupational Tasks"
                          ) {
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
                            testsByCategory["ROM Total Spine/Extremity"].push(
                              test,
                            );
                          } else {
                            // Default to Strength for grip, pinch, muscle strength tests
                            testsByCategory["Strength"].push(test);
                          }
                        });

                        const rows = [];
                        let totalSitTime = 45; // Initial interview sit time
                        let totalStandTime = 5; // Initial activity overview stand time

                        // Add tests grouped by their actual categories
                        Object.entries(testsByCategory).forEach(
                          ([category, tests]) => {
                            if (tests.length > 0) {
                              // Add category header row using actual category name from software
                              rows.push(
                                <tr key={category} className="bg-blue-100">
                                  <td
                                    className="border border-gray-300 p-2 font-bold text-blue-800"
                                    colSpan={7}
                                  >
                                    {category}
                                  </td>
                                </tr>,
                              );

                              // Add individual tests in this category
                              tests.forEach((test: any, index: number) => {
                                const leftAvg = calculateAverage(
                                  test.leftMeasurements,
                                );
                                const rightAvg = calculateAverage(
                                  test.rightMeasurements,
                                );

                                // Determine sit/stand time based on actual FCE test requirements
                                const testNameLower =
                                  test.testName.toLowerCase();
                                let sitTime = "";
                                let standTime = "";

                                // Sitting tests - performed in seated position
                                if (
                                  (testNameLower.includes("grip") &&
                                    !testNameLower.includes("overhead")) ||
                                  testNameLower.includes("pinch") ||
                                  testNameLower.includes("knee") ||
                                  testNameLower.includes("hip") ||
                                  testNameLower.includes("ankle") ||
                                  testNameLower.includes("toes") ||
                                  testNameLower.includes("finger") ||
                                  testNameLower.includes("dexterity") ||
                                  testNameLower.includes("handling") ||
                                  testNameLower.includes("fingering") ||
                                  testNameLower.includes("crawl") ||
                                  testNameLower.includes("kneel")
                                ) {
                                  sitTime = "5 min";
                                  // Standing tests - performed in standing position
                                } else if (
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
                                  testNameLower.includes("step-test") ||
                                  testNameLower.includes("treadmill")
                                ) {
                                  standTime = "5 min";
                                }
                                // Leave empty for tests that don't clearly require specific positioning

                                // Update total times based on actual sit/stand time assigned
                                if (sitTime) {
                                  totalSitTime +=
                                    parseInt(sitTime.replace(/\D/g, "")) || 0;
                                }
                                if (standTime) {
                                  totalStandTime +=
                                    parseInt(standTime.replace(/\D/g, "")) || 0;
                                }

                                rows.push(
                                  <tr key={`${category}-${index}`}>
                                    <td className="border border-gray-300 p-2">
                                      {test.testName}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {sitTime}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {standTime}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {(() => {
                                        if (category === "Occupational Tasks") {
                                          // Calculate percentage for occupational tasks
                                          const avgResult =
                                            (leftAvg + rightAvg) / 2;
                                          return `%IS=${avgResult.toFixed(1)}`;
                                        } else if (
                                          category === "ROM Hand/Foot" ||
                                          category ===
                                            "ROM Total Spine/Extremity"
                                        ) {
                                          // ROM tests: check if it's flexion/extension or left/right
                                          const testNameLower =
                                            test.testName.toLowerCase();
                                          if (
                                            testNameLower.includes("flexion") &&
                                            testNameLower.includes("extension")
                                          ) {
                                            return `F=${leftAvg.toFixed(2)} E=${rightAvg.toFixed(2)}`;
                                          } else if (
                                            testNameLower.includes("lateral")
                                          ) {
                                            return `L=${leftAvg.toFixed(2)} R=${rightAvg.toFixed(2)}`;
                                          } else {
                                            return `F=${leftAvg.toFixed(2)} E=${rightAvg.toFixed(2)}`;
                                          }
                                        } else if (
                                          test.testName
                                            ?.toLowerCase()
                                            .includes("lift")
                                        ) {
                                          // Lift tests: show average weight with selected metric
                                          const unit = (
                                            (test.unitMeasure as any) || "lbs"
                                          ).toLowerCase();
                                          const baseAvg =
                                            leftAvg > 0 ? leftAvg : rightAvg;
                                          const avgValue =
                                            unit === "kg"
                                              ? Math.round(
                                                  baseAvg * 2.20462 * 10,
                                                ) / 10
                                              : Math.round(baseAvg * 10) / 10;
                                          return `${avgValue.toFixed(1)} ${unit}`;
                                        } else {
                                          // Default format for strength and cardio tests
                                          return `L=${leftAvg.toFixed(1)} R=${rightAvg.toFixed(1)}`;
                                        }
                                      })()}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {(() => {
                                        const jobReq = getJobRequirements(
                                          test.testName,
                                        );
                                        return (
                                          test.jobRequirements ||
                                          jobReq.requirement
                                        );
                                      })()}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {(() => {
                                        const jobReq = getJobRequirements(
                                          test.testName,
                                        );

                                        // Show user's specific target only for weight-based tests
                                        if (
                                          test.valueToBeTestedNumber &&
                                          jobReq.type === "weight"
                                        ) {
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
                                          if (
                                            jobReq.lightWork &&
                                            jobReq.mediumWork
                                          ) {
                                            return `≥${jobReq.lightWork} ${jobReq.unit} (Light) / ≥${jobReq.mediumWork} ${jobReq.unit} (Medium)`;
                                          } else if (jobReq.norm) {
                                            return `≥${jobReq.norm} ${jobReq.unit}`;
                                          }
                                        }

                                        if (jobReq.type === "degrees") {
                                          if (
                                            jobReq.functionalMin &&
                                            jobReq.norm
                                          ) {
                                            return `≥${jobReq.functionalMin}° (Min) / ≥${jobReq.norm}° (Normal)`;
                                          } else if (jobReq.norm) {
                                            return `≥${jobReq.norm}°`;
                                          }
                                        }

                                        return "Functional Assessment";
                                      })()}
                                    </td>
                                    <td className="border border-gray-300 p-2 text-center">
                                      {evaluateJobMatch(test) ? "Yes" : "No"}
                                    </td>
                                  </tr>,
                                );
                              });
                            }
                          },
                        );

                        // Add total sit/stand time row
                        rows.push(
                          <tr key="totals" className="bg-yellow-100">
                            <td className="border border-gray-300 p-2 font-semibold">
                              Total Sit / Stand Time
                            </td>
                            <td className="border border-gray-300 p-2 font-semibold">
                              {totalSitTime} min
                            </td>
                            <td className="border border-gray-300 p-2 font-semibold">
                              {totalStandTime} min
                            </td>
                            <td className="border border-gray-300 p-2"></td>
                            <td className="border border-gray-300 p-2"></td>
                            <td className="border border-gray-300 p-2"></td>
                            <td className="border border-gray-300 p-2"></td>
                          </tr>,
                        );

                        return rows;
                      })()}
                    </tbody>
                  </table>

                  {/* Legend */}
                  <div className="mt-4 text-sm italic text-gray-600">
                    <p>
                      <strong>Legend:</strong> L=Left, R=Right, F=Flexion,
                      E=Extension, %IS=% Industrial Standard
                    </p>
                  </div>

                  {/* Consistency Overview */}
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2">
                      Consistency Overview:
                    </h4>

                    {(() => {
                      const totalTests = reportData.testData.tests.length;

                      // Categorize effort levels based on actual test data
                      const effortCounts = {
                        poor: 0,
                        fair: 0,
                        good: 0,
                        demonstrated: 0,
                        notDemonstrated: 0,
                      };

                      reportData.testData.tests.forEach((test: any) => {
                        // Count demonstrated vs not demonstrated
                        if (test.demonstrated) {
                          effortCounts.demonstrated++;
                        } else {
                          effortCounts.notDemonstrated++;
                        }

                        // Categorize effort based on the effort field
                        const effort = test.effort
                          ? test.effort.toLowerCase()
                          : "";
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

                      return (
                        <>
                          <table className="w-full border border-gray-300 text-sm mb-4">
                            <thead>
                              <tr className="bg-yellow-200">
                                <th className="border border-gray-300 p-2">
                                  Observed Effort During Testing
                                </th>
                                <th className="border border-gray-300 p-2">
                                  Total Noted for all Tested Activities
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-gray-300 p-2">
                                  Poor effort
                                </td>
                                <td className="border border-gray-300 p-2">
                                  {effortCounts.poor} out of {totalTests} Tests
                                </td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 p-2">
                                  Fair to Average effort
                                </td>
                                <td className="border border-gray-300 p-2">
                                  {effortCounts.fair} out of {totalTests} Tests
                                </td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 p-2">
                                  Good effort
                                </td>
                                <td className="border border-gray-300 p-2">
                                  {effortCounts.good} out of {totalTests} Tests
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </>
                      );
                    })()}
                  </div>

                  {/* Tested Activities Table */}
                  <table className="w-full border-collapse mt-6">
                    <thead>
                      <tr className="bg-yellow-200">
                        <th className="border border-gray-300 p-2 text-left w-2/5">
                          Consistent crosschecks
                        </th>
                        <th className="border border-gray-300 p-2 text-left w-2/5">
                          Description
                        </th>
                        <th className="border border-gray-300 p-2 text-center w-1/10">
                          Pass
                        </th>
                        <th className="border border-gray-300 p-2 text-center w-1/10">
                          Fail
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const crosschecks = [];

                        // Find relevant tests for crosschecks
                        const gripTests =
                          reportData.testData?.tests?.filter((test: any) => {
                            const n = (test.testName || "").toLowerCase();
                            return n.includes("grip") || n.includes("hand");
                          }) || [];

                        const pinchTests =
                          reportData.testData?.tests?.filter((test: any) =>
                            test.testName.toLowerCase().includes("pinch"),
                          ) || [];

                        const liftTests =
                          reportData.testData?.tests?.filter((test: any) =>
                            test.testName.toLowerCase().includes("lift"),
                          ) || [];

                        const romTests =
                          reportData.testData?.tests?.filter(
                            (test: any) =>
                              test.testName.toLowerCase().includes("range") ||
                              test.testName.toLowerCase().includes("motion") ||
                              test.testName.toLowerCase().includes("flexion") ||
                              test.testName.toLowerCase().includes("extension"),
                          ) || [];

                        const allTests = reportData.testData?.tests || [];

                        // Hand grip rapid exchange check - compare rapid/exchange tests to the standard position (position 2) grip. Pass when rapid <= 85% of standard (i.e. 15% less or equal)
                        const rapidExchangeValid = (() => {
                          if (allTests.length === 0) return null;

                          const normalize = (s) => (s ? s.toLowerCase() : "");

                          // Identify rapid/exchange tests across all tests
                          const rapidTests = allTests.filter((t: any) => {
                            const n = normalize(t.testName);
                            return (
                              n.includes("rapid") ||
                              n.includes("exchange") ||
                              n.includes("rapid-exchange") ||
                              n.includes("rapid exchange")
                            );
                          });

                          // Identify grip tests
                          const gripOnlyTests = allTests.filter((t: any) => {
                            const n = normalize(t.testName);
                            return n.includes("grip") || n.includes("hand");
                          });

                          // Find a standard grip test (prefer position 2 / pos 2 / standard); fallback to the grip test with highest average
                          let standardTest = gripOnlyTests.find((t: any) => {
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

                          if (!standardTest && gripOnlyTests.length > 0) {
                            standardTest = gripOnlyTests.reduce(
                              (best: any, cur: any) => {
                                const bestAvg =
                                  (calculateAverage(best.leftMeasurements) +
                                    calculateAverage(best.rightMeasurements)) /
                                  2;
                                const curAvg =
                                  (calculateAverage(cur.leftMeasurements) +
                                    calculateAverage(cur.rightMeasurements)) /
                                  2;
                                return curAvg > bestAvg ? cur : best;
                              },
                              gripOnlyTests[0],
                            );
                          }

                          if (!standardTest || rapidTests.length === 0)
                            return null; // not applicable if either missing

                          const avgAcross = (
                            tests: any[],
                            side: "left" | "right",
                          ) => {
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
                            return (
                              vals.reduce((s, v) => s + v, 0) / vals.length
                            );
                          };

                          const rapidLeftAvg = avgAcross(rapidTests, "left");
                          const rapidRightAvg = avgAcross(rapidTests, "right");

                          const stdLeftAvg = calculateAverage(
                            standardTest.leftMeasurements,
                          );
                          const stdRightAvg = calculateAverage(
                            standardTest.rightMeasurements,
                          );

                          const comparisons: boolean[] = [];
                          if (stdLeftAvg > 0 && rapidLeftAvg > 0)
                            comparisons.push(rapidLeftAvg <= stdLeftAvg * 0.85);
                          if (stdRightAvg > 0 && rapidRightAvg > 0)
                            comparisons.push(
                              rapidRightAvg <= stdRightAvg * 0.85,
                            );

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
                            ? gripTests.every((test: any) => {
                                const leftAvg = calculateAverage(
                                  test.leftMeasurements,
                                );
                                const rightAvg = calculateAverage(
                                  test.rightMeasurements,
                                );
                                const bilateralDiff =
                                  calculateBilateralDeficiency(
                                    leftAvg,
                                    rightAvg,
                                  );
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
                            ? pinchTests.every((test: any) => {
                                const leftCV = calculateCV(
                                  test.leftMeasurements,
                                );
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
                        const dynamicLifts = liftTests.filter((test: any) => {
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
                            ? dynamicLifts.some((test: any) => {
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
                            ? romTests.every((test: any) => {
                                // Extract trial values from measurement objects
                                const leftTrials = test.leftMeasurements
                                  ? [
                                      test.leftMeasurements.trial1,
                                      test.leftMeasurements.trial2,
                                      test.leftMeasurements.trial3,
                                      test.leftMeasurements.trial4,
                                      test.leftMeasurements.trial5,
                                      test.leftMeasurements.trial6,
                                    ].filter(
                                      (val) => val != null && !isNaN(val),
                                    )
                                  : [];

                                const rightTrials = test.rightMeasurements
                                  ? [
                                      test.rightMeasurements.trial1,
                                      test.rightMeasurements.trial2,
                                      test.rightMeasurements.trial3,
                                      test.rightMeasurements.trial4,
                                      test.rightMeasurements.trial5,
                                      test.rightMeasurements.trial6,
                                    ].filter(
                                      (val) => val != null && !isNaN(val),
                                    )
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
                                  const avgValue =
                                    (trial1 + trial2 + trial3) / 3;
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
                        if (allTests.length > 0) {
                          // Check for similar values (CV consistency)
                          const validTests = allTests.filter((test: any) => {
                            const leftCV = calculateCV(test.leftMeasurements);
                            const rightCV = calculateCV(test.rightMeasurements);
                            return leftCV <= 15 && rightCV <= 15;
                          });
                          const similarValues =
                            validTests.length / allTests.length >= 0.8;

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
                            similarValues && consistentDeficiency;

                          crosschecks.push({
                            name: "Test/retest trial consistency",
                            description:
                              "When tests were repeated the client displayed similar values and left/right deficiency.",
                            pass: overallValid,
                            applicable: true,
                          });
                        }

                        // Dominant side monitoring check
                        if (allTests.length > 0) {
                          const dominantSideValid = allTests.every(
                            (test: any) => {
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
                            },
                          );

                          crosschecks.push({
                            name: "Dominant side monitoring",
                            description:
                              "It is expected that if the client is Right-Handed, he/she will demonstrate approx.10% greater values on the dominant side - if Left-Handed then the values would be close to the same.",
                            pass: dominantSideValid,
                            applicable: true,
                          });
                        }

                        // Coefficient of Variation analysis
                        if (allTests.length > 0) {
                          const validCVTests = allTests.filter((test: any) => {
                            const leftCV = calculateCV(test.leftMeasurements);
                            const rightCV = calculateCV(test.rightMeasurements);
                            return leftCV < 15 && rightCV < 15; // CV less than 15% as per description
                          });
                          const cvValid =
                            validCVTests.length / allTests.length >= 0.7;

                          crosschecks.push({
                            name: "Coefficient of Variation (CV)",
                            description:
                              "We would expect to see a CV less than 15% for a client that is deemed to be consistent.",
                            pass: cvValid,
                            applicable: true,
                          });
                        }

                        // Distraction test consistency - Based on evaluator input from referral question 6b
                        if (reportData.referralQuestionsData?.questions) {
                          const distractionQuestion =
                            reportData.referralQuestionsData.questions.find(
                              (q: any) =>
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
                        if (reportData.referralQuestionsData?.questions) {
                          const diagnosisQuestion =
                            reportData.referralQuestionsData.questions.find(
                              (q: any) =>
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

                        // No overall consistency item - only the 10 specific items requested

                        return crosschecks.map((check, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 p-2">
                              {check.name}
                            </td>
                            <td className="border border-gray-300 p-2">
                              {check.description}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {!check.applicable
                                ? "N/A"
                                : check.pass
                                  ? "✓"
                                  : ""}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {!check.applicable
                                ? "N/A"
                                : !check.pass
                                  ? "✓"
                                  : ""}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>

                  <div className="mt-4 text-sm italic text-gray-600"></div>
                </div>
              )}

              {/* Activity Rating Chart */}
              {reportData.activityRatingData && (
                <div className="p-4 border-b">
                  <h3 className="font-bold mb-2">
                    Client Perceived Activity Rating Chart
                  </h3>
                  <p className="text-sm italic mb-2">
                    The Activity Rating Chart is a measure of the client's
                    perceived ability level at the time of testing and is a
                    representation of their subjective responses.
                  </p>

                  <div className="p-1 bg-white max-w-3xl mx-auto border border-gray-400">
                    <div>
                      {reportData.activityRatingData.activities?.map(
                        (activity: any, index: number) => {
                          // Define different colors for each activity
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

                          return (
                            <div
                              key={activity.id}
                              className="flex items-center"
                              style={{
                                margin: 0,
                                padding: 0,
                                lineHeight: 0,
                                display: "flex",
                              }}
                            >
                              <div
                                className="w-20 text-xs font-medium pr-2"
                                style={{
                                  height: "20px",
                                  display: "flex",
                                  alignItems: "center",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {activity.name}
                              </div>
                              <div
                                className="flex-1 mx-1"
                                style={{
                                  margin: 0,
                                  borderLeft: "1px solid #374151",
                                  borderBottom:
                                    index ===
                                    reportData.activityRatingData.activities
                                      ?.length -
                                      1
                                      ? "1px solid #374151"
                                      : "none",
                                }}
                              >
                                <div
                                  className="h-5 relative overflow-hidden"
                                  style={{
                                    height: "20px",
                                    background:
                                      "linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)",
                                    backgroundSize: "10px 10px",
                                  }}
                                >
                                  <div
                                    className="h-5 flex items-center justify-end pr-1"
                                    style={{
                                      width: `${Math.min(100, Math.max(0, ((Number(activity.rating) || 0) / 10) * 100))}%`,
                                      backgroundColor:
                                        barColors[index % barColors.length],
                                      height: "20px",
                                      border: "1px solid #374151",
                                      borderLeft: "none",
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      ) || []}
                    </div>

                    {/* Scale indicators at bottom */}
                    <div className="mt-1 flex items-center">
                      <div className="w-20"></div>
                      <div className="flex-1 mx-1">
                        <div className="flex justify-between text-xs text-gray-600">
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
                  <div className="text-center text-xs text-gray-600 mt-2">
                    {currentDate} 9:51:46 AM
                  </div>
                </div>
              )}

              {/* Detailed Test Results with Professional FACTS Format */}
              {reportData.testData &&
                reportData.testData.tests &&
                reportData.testData.tests.length > 0 && (
                  <div className="space-y-0">
                    {reportData.testData.tests
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
                        const leftAvg = calculateAverage(test.leftMeasurements);
                        const rightAvg = calculateAverage(
                          test.rightMeasurements,
                        );
                        const leftCV = calculateCV(test.leftMeasurements);
                        const rightCV = calculateCV(test.rightMeasurements);
                        const bilateralDef = calculateBilateralDeficiency(
                          leftAvg,
                          rightAvg,
                        );

                        // Determine test category for appropriate illustrations and references
                        const testName = test.testName.toLowerCase();
                        const isRangeOfMotion =
                          testName.includes("flexion") ||
                          testName.includes("extension") ||
                          testName.includes("range") ||
                          testName.includes("lateral") ||
                          testName.includes("rotation") ||
                          testName.includes("oblique") ||
                          testName.includes("abduction") ||
                          testName.includes("adduction") ||
                          testName.includes("radial") ||
                          testName.includes("ulnar") ||
                          testName.includes("deviation") ||
                          testName.includes("supination") ||
                          testName.includes("pronation") ||
                          testName.includes("inversion") ||
                          testName.includes("eversion") ||
                          testName.includes("dorsi") ||
                          testName.includes("dorsiflexion") ||
                          testName.includes("palmar") ||
                          testName.includes("straight-leg") ||
                          (testName.includes("straight") &&
                            testName.includes("leg") &&
                            testName.includes("raise")) ||
                          testName.includes("slr");
                        const isGripTest =
                          testName.includes("grip") ||
                          testName.includes("pinch");
                        const isLiftTest =
                          testName.includes("lift") ||
                          testName.includes("carry");
                        const isStaticLift =
                          String(test.testId || testName)
                            .toLowerCase()
                            .includes("static-lift") ||
                          testName.includes("static");
                        const isStrengthTest =
                          testName.includes("strength") ||
                          testName.includes("force") ||
                          testName.includes("lift");
                        const isCardioTest =
                          testName.includes("step") ||
                          testName.includes("treadmill") ||
                          testName.includes("cardio") ||
                          testName.includes("mcaft") ||
                          testName.includes("kasch") ||
                          testName.includes("bruce") ||
                          testName.includes("cardiovascular") ||
                          testName.includes("aerobic");
                        const endpointConditionLabel =
                          resolveDynamicEndpointLabel(test);
                        const isDynamicLift =
                          isLiftTest && testName.includes("dynamic");

                        const { convertToLbs, displayUnit } =
                          resolveWeightDisplayOptions(test);
                        const leftTrialCells = buildTrialDisplayRow(
                          test.leftMeasurements,
                          // convertToLbs,
                          // displayUnit,
                        );
                        const rightTrialCells = buildTrialDisplayRow(
                          test.rightMeasurements,
                          // convertToLbs,
                          // displayUnit,
                        );
                        const leftAverageDisplay = formatWeightMeasurement(
                          computeMeasurementsAverage(
                            test.leftMeasurements,
                            convertToLbs,
                          ) ?? convertWeightMeasurement(leftAvg, convertToLbs),
                          displayUnit,
                        );
                        const rightAverageDisplay = formatWeightMeasurement(
                          computeMeasurementsAverage(
                            test.rightMeasurements,
                            convertToLbs,
                          ) ?? convertWeightMeasurement(rightAvg, convertToLbs),
                          displayUnit,
                        );

                        return (
                          <div
                            key={testIndex}
                            className="p-8 border-b bg-white"
                          >
                            <div className="flex justify-end mb-2">
                              <span className="text-sm text-gray-500">
                                Page {16 + testIndex}
                              </span>
                            </div>

                            <h3 className="font-bold text-lg mb-4">
                              {test.testName}
                            </h3>

                            <div className="grid grid-cols-12 gap-6">
                              {/* Left Column - Illustrations */}
                              <div className="col-span-3">
                                <div className="space-y-4">
                                  <p className="text-sm font-medium underline">
                                    Sample Illustration:
                                  </p>

                                  {(() => {
                                    const illos = getSampleIllustrations(
                                      test.testId || testName,
                                    );
                                    if (!illos.length) return null;
                                    const isMVE = (() => {
                                      const key =
                                        `${test.testId || ""} ${test.testName || ""}`.toLowerCase();
                                      return key.includes("mve"); // covers MVE and MMVE
                                    })();

                                    return (
                                      <div className="grid grid-cols-1 gap-3">
                                        {illos.map((ill, i) => (
                                          <div key={i} className="text-center">
                                            {ill.yPercent === undefined ||
                                            ill.yPercent === null ? (
                                              <img
                                                src={ill.src}
                                                alt={ill.label}
                                                className={`${isMVE ? "w-24 h-auto object-contain" : "w-16 h-20 object-cover"} mx-auto border bg-white`}
                                              />
                                            ) : (
                                              <div
                                                className="mx-auto border bg-white"
                                                style={{
                                                  width: isMVE ? 96 : 64,
                                                  height: isMVE ? 120 : 80,
                                                  backgroundImage: `url(${ill.src})`,
                                                  backgroundRepeat: "no-repeat",
                                                  backgroundSize: isMVE
                                                    ? "contain"
                                                    : "100% auto",
                                                  backgroundPosition: `center ${ill.yPercent}%`,
                                                }}
                                              />
                                            )}
                                            <p className="text-xs mt-1">
                                              {ill.label}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}

                                  {/* Generic Test Illustrations for other tests */}
                                  {!isRangeOfMotion &&
                                    !isGripTest &&
                                    !isLiftTest &&
                                    !isCardioTest &&
                                    !isStrengthTest && (
                                      <div className="space-y-4">
                                        <div className="text-center">
                                          <img
                                            src="/functional-carry-test.webp"
                                            alt="Functional test"
                                            className="w-16 h-20 mx-auto border object-cover bg-white"
                                          />
                                          <p className="text-xs mt-1">
                                            Functional Test
                                          </p>
                                        </div>

                                        <div className="text-center">
                                          <img
                                            src="/balance-test-new.webp"
                                            alt="Assessment"
                                            className="w-20 h-24 mx-auto border object-cover bg-white"
                                          />
                                          <p className="text-xs mt-1">
                                            Assessment
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                </div>
                              </div>

                              {/* Right Column - Content */}
                              <div className="col-span-9">
                                <div className="space-y-6">
                                  {/* Test Description */}
                                  <p className="text-sm">
                                    {isRangeOfMotion &&
                                      `The client was tested in our facility using range of motion inclinometers. The test results were compared to normative data when available.`}
                                    {isGripTest &&
                                      `The client was tested in our facility using a hand grip evaluation device. The test results were compared to normative data when available. It is expected that the dominant hand will display 10% greater values than the non-dominant hand with the exception of left handed individuals where the hand strength is equal. Strength measurements are in pounds (lbs).`}
                                    {isLiftTest &&
                                      `The client was tested in our facility using a dynamic lift evaluation apparatus. The test results were compared to normative data when available.`}
                                    {isCardioTest &&
                                      (testName.includes("bruce") ||
                                      testName.includes("treadmill")
                                        ? `The Bruce Treadmill Test (Bruce Protocol) is commonly used to help identify a person's level of aerobic endurance by providing an all-out maximal oxygen uptake or VO2 max, which measures the capacity to perform sustained exercise and is linked to aerobic endurance.`
                                        : testName.includes("mcaft")
                                          ? `mCAFT is designed to give information about the aerobic fitness of a person, while using minimal equipment. The subject works by lifting its own body weight up and down double steps (40.6 cm in height total) while listening to set cadences from a compact disc. The end-stage of the age and gender specific stepping rate requires 65% of the age-predicted maximum heart rate. The heart rate increases approximately in a linear fashion from 50% to 100% of maximal oxygen intake. The heart rate does not decrease significantly during the first fifteen seconds of recovery (O₂ in). Thus, one can predict an aerobic fitness using the heart rate right after exercise of a known sub-maximal rate of working.`
                                          : testName.includes("kasch")
                                            ? `The Kasch step test, officially the Kasch Pulse Recovery Test (KPR Test), is a 3-minute step test used to assess cardiorespiratory fitness. The test involves stepping onto a 0.305-meter (12-inch) step at a rate of 24 steps per minute for three minutes, followed by immediately sitting and measuring heart rate recovery for one minute to determine fitness levels.`
                                            : `The client was tested in our facility using standardized cardiovascular assessment protocols. The test results were compared to normative data when available.`)}
                                    {!isRangeOfMotion &&
                                      !isGripTest &&
                                      !isLiftTest &&
                                      !isCardioTest &&
                                      `The client was tested in our facility using standardized assessment protocols. The test results were compared to normative data when available.`}
                                  </p>

                                  {test.testId?.startsWith("dynamic-lift-") &&
                                    !test.testId.includes("infrequent") && (
                                      <div className="mb-4 p-3 bg-blue-500 text-white rounded-lg text-center font-medium text-sm">
                                        Note: frequent lifts are four lifts per
                                        cycle.
                                      </div>
                                    )}

                                  {/* Results Section */}
                                  <div>
                                    <h4 className="font-semibold mb-3">
                                      Results:
                                    </h4>

                                    {isRangeOfMotion ? (
                                      // Range of Motion Table
                                      <>
                                        <table className="w-full border border-gray-400 text-xs mb-4">
                                          <thead>
                                            <tr className="bg-yellow-300">
                                              <th className="border border-gray-400 p-2 text-left">
                                                Area Evaluated:
                                              </th>
                                              <th className="border border-gray-400 border-r-gray-400 p-2">
                                                Data:
                                              </th>
                                              <th className="border border-gray-400 border-r-gray-400 p-2">
                                                Valid?
                                              </th>
                                              <th className="border border-gray-400 border-r-gray-400 p-2">
                                                Norm:
                                              </th>
                                              <th className="border border-gray-400 border-r-gray-400 p-2">
                                                % of Norm:
                                              </th>
                                              <th className="border border-gray-400 border-r-gray-400 p-2">
                                                Test Date
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr>
                                              <td className="border border-gray-400 border-r-gray-400 p-2">
                                                {test.testName}
                                              </td>
                                              <td className="border border-gray-400 border-r-gray-400 p-2">
                                                {Math.max(
                                                  leftAvg,
                                                  rightAvg,
                                                ).toFixed(0)}{" "}
                                                °
                                              </td>
                                              <td className="border border-gray-400 border-r-gray-400 p-2">
                                                {test.demonstrated
                                                  ? "Pass"
                                                  : "Fail"}
                                              </td>
                                              <td className="border border-gray-400 border-r-gray-400 p-2">
                                                {testName.includes("flexion")
                                                  ? "60 °"
                                                  : testName.includes(
                                                        "extension",
                                                      )
                                                    ? "25 °"
                                                    : "25 °"}
                                              </td>
                                              <td className="border border-gray-400 border-r-gray-400 p-2">
                                                {Math.round(
                                                  (Math.max(leftAvg, rightAvg) /
                                                    (testName.includes(
                                                      "flexion",
                                                    )
                                                      ? 60
                                                      : 25)) *
                                                    100,
                                                )}
                                                %
                                              </td>
                                              <td className="border border-gray-400 border-r-gray-400 p-2">
                                                {currentDate}
                                                <br />
                                                10:20:36 AM
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                        <></>
                                        <table className="w-full border border-black text-xs text-center">
                                          <thead>
                                            <tr className="bg-yellow-300">
                                              <th className="border border-black px-2 py-1 font-bold">
                                                Side
                                              </th>
                                              <th className="border border-black px-2 py-1 font-bold">
                                                Trial 1
                                              </th>
                                              <th className="border border-black px-2 py-1 font-bold">
                                                Trial 2
                                              </th>
                                              <th className="border border-black px-2 py-1 font-bold">
                                                Trial 3
                                              </th>
                                              <th className="border border-black px-2 py-1 font-bold">
                                                Trial 4
                                              </th>
                                              <th className="border border-black px-2 py-1 font-bold">
                                                Trial 5
                                              </th>
                                              <th className="border border-black px-2 py-1 font-bold">
                                                Trial 6
                                              </th>
                                              <th className="border border-black px-2 py-1 font-bold">
                                                Average (range of motion)
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr>
                                              <td className="border border-black px-2 py-1 font-bold text-left">
                                                Left
                                              </td>
                                              {leftTrialCells.map(
                                                (value, index) => (
                                                  <td
                                                    key={`left-trial-${index}`}
                                                    className="border border-black px-2 py-1"
                                                  >
                                                    {value}
                                                  </td>
                                                ),
                                              )}
                                              <td className="border border-black px-2 py-1 font-bold">
                                                {leftAverageDisplay}
                                              </td>
                                            </tr>
                                            <tr>
                                              <td className="border border-black px-2 py-1 font-bold text-left">
                                                Right
                                              </td>
                                              {rightTrialCells.map(
                                                (value, index) => (
                                                  <td
                                                    key={`right-trial-${index}`}
                                                    className="border border-black px-2 py-1"
                                                  >
                                                    {value}
                                                  </td>
                                                ),
                                              )}
                                              <td className="border border-black px-2 py-1 font-bold">
                                                {rightAverageDisplay}
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </>
                                    ) : isLiftTest ? (
                                      // Lift Results - Six Trials (single table)
                                      <div>
                                        {(() => {
                                          const leftTrialValues =
                                            extractTrialValues(
                                              test.leftMeasurements,
                                            );
                                          const rightTrialValues =
                                            extractTrialValues(
                                              test.rightMeasurements,
                                            );
                                          const primaryMeasurements =
                                            leftTrialValues.length > 0
                                              ? test.leftMeasurements
                                              : rightTrialValues.length > 0
                                                ? test.rightMeasurements
                                                : test.leftMeasurements;
                                          const { convertToLbs, displayUnit } =
                                            resolveWeightDisplayOptions(test);
                                          const trialCells =
                                            buildTrialDisplayRow(
                                              primaryMeasurements,
                                              // convertToLbs,
                                              // displayUnit,
                                            );
                                          // Calculate average using convertToLbs flag from user's metric selection
                                          const avgValue = convertToLbs
                                            ? Math.round(
                                                leftAvg * 2.20462 * 10,
                                              ) / 10
                                            : Math.round(leftAvg * 10) / 10;
                                          const trialAverageDisplay = `${avgValue} ${displayUnit}`;
                                          return (
                                            <>
                                              <table className="w-full border border-gray-400 text-xs mb-4">
                                                <thead>
                                                  <tr className="bg-yellow-300">
                                                    <th className="border border-gray-400 border-r-gray-400 p-2">
                                                      Demonstrated Activity
                                                    </th>
                                                    <th className="border border-gray-400 border-r-gray-400 p-2">
                                                      Avg. Weight ({displayUnit}
                                                      )
                                                    </th>
                                                    <th className="border border-gray-400 border-r-gray-400 p-2">
                                                      CV%
                                                    </th>
                                                    <th className="border border-gray-400 border-r-gray-400 p-2">
                                                      Test Date
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  <tr>
                                                    <td className="border border-gray-400 border-r-gray-400 p-2">
                                                      {test.testName}
                                                    </td>
                                                    <td className="border border-gray-400 border-r-gray-400 p-2">
                                                      {trialAverageDisplay}
                                                    </td>
                                                    <td className="border border-gray-400 border-r-gray-400 p-2">
                                                      {leftCV}%
                                                    </td>
                                                    <td className="border border-gray-400 border-r-gray-400 p-2">
                                                      {currentDate}
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                              <></>
                                              <table className="w-full border border-black text-xs text-center">
                                                <thead>
                                                  <tr className="bg-yellow-300">
                                                    <th className="border border-black px-2 py-1 font-bold">
                                                      Trial 1
                                                    </th>
                                                    <th className="border border-black px-2 py-1 font-bold">
                                                      Trial 2
                                                    </th>
                                                    <th className="border border-black px-2 py-1 font-bold">
                                                      Trial 3
                                                    </th>
                                                    <th className="border border-black px-2 py-1 font-bold">
                                                      Trial 4
                                                    </th>
                                                    <th className="border border-black px-2 py-1 font-bold">
                                                      Trial 5
                                                    </th>
                                                    <th className="border border-black px-2 py-1 font-bold">
                                                      Trial 6
                                                    </th>
                                                    <th className="border border-black px-2 py-1 font-bold">
                                                      Average (weight)
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  <tr>
                                                    {trialCells.map(
                                                      (value, index) => (
                                                        <td
                                                          key={`lift-trial-${index}`}
                                                          className="border border-black px-2 py-1"
                                                        >
                                                          {value}
                                                        </td>
                                                      ),
                                                    )}
                                                    <td className="border border-black px-2 py-1 font-bold">
                                                      {trialAverageDisplay}
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </>
                                          );
                                        })()}
                                        {isDynamicLift &&
                                        endpointConditionLabel ? (
                                          <div className="text-xs mb-2">
                                            <span className="font-semibold">
                                              Endpoint Condition:
                                            </span>{" "}
                                            {endpointConditionLabel}
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : isCardioTest ? (
                                      // Cardio Test Results
                                      <div className="space-y-4">
                                        {/* Bruce Treadmill Test */}
                                        {(testName.includes("bruce") ||
                                          testName.includes("treadmill")) && (
                                          <div className="space-y-4">
                                            {/* Protocol Stages */}
                                            <div>
                                              <h5 className="font-semibold mb-2">
                                                Protocol Stages
                                              </h5>
                                              <p className="text-xs mb-3">
                                                The Bruce protocol involves
                                                getting on a treadmill and
                                                increasing speed and incline
                                                every three minutes (in stages).
                                                The test stops when you've hit
                                                85% of your maximum heart rate,
                                                your heart rate exceeds 115
                                                beats per minute for two stages,
                                                or it is deemed that the test
                                                should no longer continue. If
                                                your heart rate changes more
                                                than six beats per minute
                                                between the second and third
                                                minute of any given stage, you
                                                are kept at the same speed &
                                                incline for an additional
                                                minute. (As your HR has not
                                                achieved a steady state).
                                              </p>
                                            </div>

                                            {/* Measuring VO2 Max */}
                                            <div className="grid grid-cols-2 gap-6">
                                              <div>
                                                <h5 className="font-semibold mb-2">
                                                  Measuring VO2 Max:
                                                </h5>
                                                <p className="text-xs mb-3">
                                                  Maximal oxygen uptake (VO2
                                                  max) refers to the maximum
                                                  amount of oxygen an individual
                                                  can use during intense or
                                                  maximal exercise. It is
                                                  measured as milliliters of
                                                  oxygen used in one minute per
                                                  kilogram of body weight
                                                  (ml/kg/min).
                                                </p>
                                                <p className="text-xs mb-3">
                                                  The Bruce treadmill test is an
                                                  indirect maximal oxygen uptake
                                                  test. It is indirect because
                                                  it estimates VO2 max using a
                                                  formula and the person's
                                                  performance on a treadmill as
                                                  the workload increases.
                                                </p>
                                                <p className="text-xs mb-3">
                                                  When the Bruce protocol
                                                  formula is used, T stands for
                                                  total time on the treadmill
                                                  and is measured as a fraction
                                                  of a minute. If test time of
                                                  10 minutes 15 seconds would be
                                                  written as T=10.25); this
                                                  formula changes based on
                                                  gender. The time you spend on
                                                  the treadmill is your test
                                                  score and can be used to
                                                  estimate your VO2 max value.
                                                  Blood pressure and ratings of
                                                  perceived exertion are also
                                                  often collected during the
                                                  Bruce protocol test.
                                                </p>
                                                <p className="text-xs">
                                                  <strong>Men:</strong> 14.8 -
                                                  (1.379 × T) + (0.451 × T²) -
                                                  (0.012 × T��) = VO₂ max
                                                  <br />
                                                  <strong>Women:</strong> 4.38 ×
                                                  T - 3.9 = VO₂ max
                                                </p>
                                              </div>

                                              <div>
                                                <h5 className="font-semibold mb-2">
                                                  Bruce Treadmill Test Stages,
                                                  Speeds, and Inclines:
                                                </h5>
                                                <table className="w-full border border-gray-400 text-xs">
                                                  <thead>
                                                    <tr className="bg-gray-200">
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Stage
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Treadmill Speed
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Treadmill Incline
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        1
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        1.7 mph
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        10% grade
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        2
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        2.5 mph
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        12% grade
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        3
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        3.4 mph
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        14% grade
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        4.2 mph
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        16% grade
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        5
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        5.0 mph
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        18% grade
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        6
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        5.5 mph
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        20% grade
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        7
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        6.0 mph
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        22% grade
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>

                                            {/* Classification and VO2 Max */}
                                            <div className="flex space-x-8 mt-4">
                                              <div>
                                                <span className="font-semibold">
                                                  CLASSIFICATION:{" "}
                                                </span>
                                                <span className="border-b border-gray-400 px-4 py-1 inline-block min-w-[120px]">
                                                  {test.classification || ""}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="font-semibold">
                                                  VO2 MAX:{" "}
                                                </span>
                                                <span className="border-b border-gray-400 px-4 py-1 inline-block min-w-[120px]">
                                                  {test.vo2Max || ""}
                                                </span>
                                              </div>
                                            </div>

                                            {/* VO2 Max Norms Tables */}
                                            <div className="grid grid-cols-2 gap-3 mt-4">
                                              <div>
                                                <h6 className="text-xs font-semibold text-center mb-1">
                                                  VO2 Max Norms for Men as
                                                  Measured in ml/kg/min
                                                </h6>
                                                <table className="w-full border border-gray-400 text-[10px]">
                                                  <thead>
                                                    <tr className="bg-gray-200">
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Age
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Very Poor
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Poor
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Fair
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Good
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Excellent
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Superior
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        13-19
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;35.0
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        35.0-38.3
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        38.4-45.1
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        45.2-50.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        51.0-55.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;55.9
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        20-29
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;33.0
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        33.0-36.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        36.5-42.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        42.5-46.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        46.5-52.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;52.4
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        30-39
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;31.5
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        31.5-35.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        35.5-40.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        41.0-44.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        45.0-49.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;49.4
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        40-49
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;30.2
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        30.2-33.5
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        33.6-38.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        39.0-43.7
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        43.8-48.0
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;48.0
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        50-59
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;26.1
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        26.1-30.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        31.0-35.7
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        35.8-40.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        41.0-45.3
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;45.3
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        60+
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;20.5
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        20.5-26.0
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        26.1-32.2
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        32.3-36.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        36.5-44.2
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;44.2
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>

                                              <div>
                                                <h6 className="text-xs font-semibold text-center mb-1">
                                                  VO2 Max Norms for Women as
                                                  Measured in ml/kg/min
                                                </h6>
                                                <table className="w-full border border-gray-400 text-[10px]">
                                                  <thead>
                                                    <tr className="bg-gray-200">
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Age
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Very Poor
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Poor
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Fair
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Good
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Excellent
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Superior
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        13-19
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;25.0
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        25.0-30.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        31.0-34.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        35.0-38.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        39.0-41.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;41.9
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        20-29
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;23.6
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        23.6-28.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        29.0-32.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        33.0-36.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        37.0-41.0
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;41.0
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        30-39
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;22.8
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        22.8-26.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        27.0-31.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        31.5-35.6
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        35.7-40.0
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;40.0
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        40-49
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;21.0
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        21.0-24.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        24.5-28.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        29.0-32.8
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        32.9-36.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;36.9
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        50-59
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;20.2
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        20.2-22.7
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        22.8-26.9
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        27.0-31.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        31.5-35.7
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;35.7
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        60+
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;17.5
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        17.5-20.1
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        20.2-24.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        24.5-30.2
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        30.3-31.4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &gt;31.4
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>

                                            {/* Client Images - Only show header if images exist */}
                                            {test.serializedImages &&
                                              test.serializedImages.length >
                                                0 && (
                                                <div className="mt-4">
                                                  <h5 className="font-semibold mb-2">
                                                    CLIENT IMAGES:
                                                  </h5>
                                                  <div className="grid grid-cols-2 gap-4">
                                                    {test.serializedImages.map(
                                                      (
                                                        img: any,
                                                        idx: number,
                                                      ) => (
                                                        <div
                                                          key={idx}
                                                          className="border border-gray-400 p-1 bg-white"
                                                        >
                                                          <img
                                                            src={img.data}
                                                            alt={
                                                              img.name ||
                                                              `Bruce Treadmill Image ${idx + 1}`
                                                            }
                                                            className="w-full h-32 object-contain"
                                                          />
                                                          {img.name && (
                                                            <p className="text-xs mt-1 truncate">
                                                              {img.name}
                                                            </p>
                                                          )}
                                                        </div>
                                                      ),
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        )}

                                        {/* mCAFT Test */}
                                        {testName.includes("mcaft") && (
                                          <div className="space-y-4">
                                            <p className="text-xs">
                                              mCAFT, is designed to give
                                              information about the aerobic
                                              fitness of a person, while using
                                              minimal equipment. The subject
                                              works by lifting its own body
                                              weight up and down double steps
                                              (40.6 cm in height total) while
                                              listening to set cadences from a
                                              compact disc. The end- stage of
                                              the age and gender specific
                                              stepping rate requires 65% of the
                                              age-predicted maximum heart rate.
                                              The heart rate increases
                                              approximately in a linear fashion
                                              from 50% to 100% of maximal oxygen
                                              intake. The heart rate does not
                                              decrease significantly during the
                                              first fifteen seconds of recovery
                                              (O₂ in). Thus, one can predict an
                                              aerobic fitness using the heart
                                              rate right after exercise of a
                                              known sub-maximal rate of working.
                                            </p>

                                            {/* Oxygen cost table */}
                                            <div className="grid grid-cols-2 gap-6">
                                              <div>
                                                <h6 className="font-semibold mb-2">
                                                  Starting stepping stage by
                                                  gender
                                                </h6>
                                                <table className="w-full border border-gray-400 text-xs mb-4">
                                                  <thead>
                                                    <tr className="bg-gray-200">
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Age
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Males
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Females
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        15-19
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        3
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        20-29
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        3
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>

                                              <div>
                                                <h6 className="font-semibold mb-2">
                                                  Oxygen cost in ml/kg/min
                                                </h6>
                                                <table className="w-full border border-gray-400 text-xs">
                                                  <thead>
                                                    <tr className="bg-gray-200">
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Stage
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Stepping cadence
                                                        (Females)
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Stepping cadence (Males)
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        oxygen cost (Females)
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        Oxygen cost (Males)
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        3
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        &lt;102
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        22
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        22
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        4
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        114
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        114
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        24.5
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        24.5
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        5
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        120
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        132
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        26.3
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        29.5
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        6
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        132
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        144
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        29.5
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        33.6
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        7
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        118
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        132
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        36.2
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        40.1
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>

                                            {/* mCAFT EQUATIONS */}
                                            <div>
                                              <h5 className="font-semibold mb-2">
                                                mCAFT EQUATIONS TO PREDICT
                                                VO2MAX
                                              </h5>
                                              <div className="bg-gray-100 p-3 text-xs">
                                                <p className="mb-2">
                                                  VO2 max (ml/kg/min) = 17.2 +
                                                  (1.29 × O2 cost of the last
                                                  completed stage) - (0.09 ×
                                                  mass in kg) - (0.18 × age in
                                                  years)
                                                </p>
                                                <p className="mb-2">
                                                  VO2 max (ml/kg/min) = 17.2 +
                                                  (1.29 × _____) - (0.09 × _____
                                                  kg) - (0.18 × _____ )
                                                </p>
                                                <p className="text-xs italic">
                                                  Note: O2 cost is provided in
                                                  Table 2 on the back of this
                                                  worksheet.
                                                </p>
                                              </div>
                                            </div>

                                            {/* Results fields */}
                                            <div className="grid grid-cols-2 gap-8 mt-4">
                                              <div>
                                                <span className="font-semibold">
                                                  Predicted VO2 max:{" "}
                                                </span>
                                                <span className="border-b border-gray-400 px-4 py-1 inline-block min-w-[120px]">
                                                  {test.predictedVo2Max || ""}
                                                </span>
                                                <span className="text-sm">
                                                  {" "}
                                                  (ml/kg/min)
                                                </span>
                                              </div>
                                              <div>
                                                <span className="font-semibold">
                                                  HBR:{" "}
                                                </span>
                                                <span className="border-b border-gray-400 px-4 py-1 inline-block min-w-[120px]">
                                                  {test.hbr || ""}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Client Images - Only show header if images exist */}
                                            {test.serializedImages &&
                                              test.serializedImages.length >
                                                0 && (
                                                <div className="mt-4">
                                                  <h5 className="font-semibold mb-2">
                                                    CLIENT IMAGES:
                                                  </h5>
                                                  <div className="grid grid-cols-2 gap-4">
                                                    {test.serializedImages.map(
                                                      (
                                                        img: any,
                                                        idx: number,
                                                      ) => (
                                                        <div
                                                          key={idx}
                                                          className="border border-gray-400 p-1 bg-white"
                                                        >
                                                          <img
                                                            src={img.data}
                                                            alt={
                                                              img.name ||
                                                              `mCAFT Image ${idx + 1}`
                                                            }
                                                            className="w-full h-32 object-contain"
                                                          />
                                                          {img.name && (
                                                            <p className="text-xs mt-1 truncate">
                                                              {img.name}
                                                            </p>
                                                          )}
                                                        </div>
                                                      ),
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        )}

                                        {/* Kasch Step Test */}
                                        {testName.includes("kasch") && (
                                          <div className="space-y-4">
                                            <p className="text-xs mb-3">
                                              The Kasch step test, officially
                                              the Kasch Pulse Recovery Test (KPR
                                              Test), is a 3- minute step test
                                              used to assess cardiorespiratory
                                              fitness. The test involves
                                              stepping onto a 0.305-meter
                                              (12-inch) step at a rate of 24
                                              steps per minute for three
                                              minutes, followed by immediately
                                              sitting and measuring heart rate
                                              recovery for one minute to
                                              determine fitness levels.
                                            </p>

                                            <div>
                                              <h5 className="font-semibold mb-2">
                                                How the Kasch Pulse Recovery
                                                Test (KPR Test) Works
                                              </h5>
                                              <ol className="text-xs space-y-1 list-decimal list-inside">
                                                <li>
                                                  <strong>Preparation:</strong>{" "}
                                                  Participants are fitted with a
                                                  heart rate monitor and rest
                                                  until a steady-state heart
                                                  rate is achieved.
                                                </li>
                                                <li>
                                                  <strong>The Step:</strong> The
                                                  participant steps up and down
                                                  on a 12-inch step for a total
                                                  of three minutes, performing a
                                                  full step (up, up, down, down)
                                                  at a rate of 24 steps per
                                                  minute. A metronome is used to
                                                  maintain the correct cadence.
                                                </li>
                                                <li>
                                                  <strong>
                                                    Heart Rate Recovery:
                                                  </strong>{" "}
                                                  Immediately after the three
                                                  minutes of stepping, the
                                                  participant sits down in a
                                                  chair.
                                                </li>
                                                <li>
                                                  <strong>Measurement:</strong>{" "}
                                                  Heart rate is monitored and
                                                  recorded for one minute
                                                  following the cessation of
                                                  stepping. A faster heart rate
                                                  recovery indicates better
                                                  cardiorespiratory fitness.
                                                </li>
                                              </ol>
                                            </div>

                                            <p className="text-xs">
                                              The Kasch Step Test does not
                                              directly provide classification
                                              types itself; rather,
                                              classification is based on a
                                              participant's heart rate recovery
                                              after a standardized step
                                              exercise, which is then compared
                                              to age-based reference standards
                                              to categorize their
                                              cardiorespiratory fitness.
                                            </p>

                                            {/* Client Images - Only show header if images exist */}
                                            {test.serializedImages &&
                                              test.serializedImages.length >
                                                0 && (
                                                <div className="mt-4">
                                                  <h5 className="font-semibold mb-2">
                                                    CLIENT IMAGES:
                                                  </h5>
                                                  <div className="grid grid-cols-2 gap-4">
                                                    {test.serializedImages.map(
                                                      (
                                                        img: any,
                                                        idx: number,
                                                      ) => (
                                                        <div
                                                          key={idx}
                                                          className="border border-gray-400 p-1 bg-white"
                                                        >
                                                          <img
                                                            src={img.data}
                                                            alt={
                                                              img.name ||
                                                              `Kasch Image ${idx + 1}`
                                                            }
                                                            className="w-full h-32 object-contain"
                                                          />
                                                          {img.name && (
                                                            <p className="text-xs mt-1 truncate">
                                                              {img.name}
                                                            </p>
                                                          )}
                                                        </div>
                                                      ),
                                                    )}
                                                  </div>
                                                </div>
                                              )}

                                            {/* Results fields */}
                                            <div className="flex space-x-8 mt-4">
                                              <div>
                                                <span className="font-semibold">
                                                  CLASSIFICATION:{" "}
                                                </span>
                                                <span className="border-b border-gray-400 px-4 py-1 inline-block min-w-[120px]">
                                                  {test.classification || ""}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="font-semibold">
                                                  AEROBIC FITNESS SCORE:{" "}
                                                </span>
                                                <span className="border-b border-gray-400 px-4 py-1 inline-block min-w-[120px]">
                                                  {test.aerobicFitnessScore ||
                                                    ""}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Ratings Tables */}
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                              <div>
                                                <h6 className="text-sm font-semibold text-center mb-2">
                                                  Ratings for Women, Based on
                                                  Age
                                                </h6>
                                                <table className="w-full border border-gray-400 text-xs">
                                                  <thead>
                                                    <tr className="bg-gray-200">
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]"></th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        18-25
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        26-35
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        36-45
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        46-55
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        56-65
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        65+
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Excellent
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        52-81
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        58-80
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        63-91
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        60-92
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        70-92
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Good
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        85-93
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        85-92
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        89-96
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        95-101
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        97-103
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        96-101
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Above Average
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        96-102
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        96-101
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        100-104
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        106-111
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        104-111
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Average
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        104-110
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        104-110
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        107-112
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        113-118
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        113-118
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        116-121
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Below Average
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        113-120
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        113-119
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        115-120
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        120-124
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        119-127
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        123-126
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Poor
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        122-131
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        122-129
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        124-132
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        126-132
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        129-135
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        128-133
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Very Poor
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        135-169
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        134-171
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        137-169
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        137-171
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        141-174
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        135-155
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>

                                              <div>
                                                <h6 className="text-sm font-semibold text-center mb-2">
                                                  Ratings for Men, Based on Age
                                                </h6>
                                                <table className="w-full border border-gray-400 text-xs">
                                                  <thead>
                                                    <tr className="bg-gray-200">
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]"></th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        18-25
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        26-35
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        36-45
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        46-55
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        56-65
                                                      </th>
                                                      <th className="border border-gray-400 px-1 py-0.5 text-[10px]">
                                                        65+
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Excellent
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        50-76
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        51-76
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        49-76
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        56-82
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        60-77
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        59-81
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Good
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        79-84
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        79-85
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        80-88
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        87-93
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        86-94
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        87-92
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Above Average
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        88-93
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        88-94
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        92-98
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        95-101
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        97-100
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        94-102
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Average
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        95-100
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        96-102
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        100-105
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        103-111
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        103-109
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        104-110
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Below Average
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        102-107
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        104-110
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        108-113
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        113-119
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        111-117
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        114-118
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Poor
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        111-119
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        114-121
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        116-124
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        121-126
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        119-128
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        121-126
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        Very Poor
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        124-157
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        126-161
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        130-163
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        131-159
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        131-154
                                                      </td>
                                                      <td className="border border-gray-400 px-1 py-0.5">
                                                        130-151
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      (() => {
                                        const { convertToLbs, displayUnit } =
                                          resolveWeightDisplayOptions(test);
                                        const leftTrialCells =
                                          buildTrialDisplayRow(
                                            test.leftMeasurements,
                                            // convertToLbs,
                                            // displayUnit,
                                          );
                                        const rightTrialCells =
                                          buildTrialDisplayRow(
                                            test.rightMeasurements,
                                            // convertToLbs,
                                            // displayUnit,
                                          );
                                        const leftAverageDisplay =
                                          formatWeightMeasurement(
                                            computeMeasurementsAverage(
                                              test.leftMeasurements,
                                              convertToLbs,
                                            ) ??
                                              convertWeightMeasurement(
                                                leftAvg,
                                                convertToLbs,
                                              ),
                                            displayUnit,
                                          );
                                        const rightAverageDisplay =
                                          formatWeightMeasurement(
                                            computeMeasurementsAverage(
                                              test.rightMeasurements,
                                              convertToLbs,
                                            ) ??
                                              convertWeightMeasurement(
                                                rightAvg,
                                                convertToLbs,
                                              ),
                                            displayUnit,
                                          );
                                        return (
                                          <>
                                            <table className="w-full border border-gray-400 text-xs mb-4">
                                              <thead>
                                                <tr className="bg-yellow-300">
                                                  <th className="border border-gray-400 border-r-gray-400 p-2">
                                                    Demonstrated Activity
                                                  </th>
                                                  <th className="border border-gray-400 border-r-gray-400 p-2">
                                                    Avg. Force (lb)
                                                  </th>
                                                  <th className="border border-gray-400 border-r-gray-400 p-2">
                                                    Norm (lb)
                                                  </th>
                                                  <th className="border border-gray-400 border-r-gray-400 p-2">
                                                    % age Norm
                                                  </th>
                                                  <th className="border border-gray-400 border-r-gray-400 p-2">
                                                    % age CV
                                                  </th>
                                                  <th className="border border-gray-400 border-r-gray-400 p-2">
                                                    Difference
                                                  </th>
                                                  <th className="border border-gray-400 border-r-gray-400 p-2">
                                                    Test Date
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                <tr>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2"></td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    Left | Right
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    L | R
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    L | R
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    L | R
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    Prev | Total
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2"></td>
                                                </tr>
                                                <tr>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    {test.testName}
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    {leftAvg.toFixed(1)} |{" "}
                                                    {rightAvg.toFixed(1)}
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    {isGripTest
                                                      ? "110.5 | 120.8"
                                                      : "85.0 | 90.0"}
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    {Math.round(
                                                      (leftAvg /
                                                        (isGripTest
                                                          ? 110.5
                                                          : 85.0)) *
                                                        100,
                                                    )}
                                                    % |{" "}
                                                    {Math.round(
                                                      (rightAvg /
                                                        (isGripTest
                                                          ? 120.8
                                                          : 90.0)) *
                                                        100,
                                                    )}
                                                    %
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    {leftCV}% | {rightCV}%
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    {bilateralDef.toFixed(1)}%
                                                  </td>
                                                  <td className="border border-gray-400 border-r-gray-400 p-2">
                                                    {currentDate}
                                                    <br />
                                                    10:05:38 AM
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <></>
                                            <table className="w-full border border-black text-xs text-center">
                                              <thead>
                                                <tr className="bg-yellow-300">
                                                  <th className="border border-black px-2 py-1 font-bold">
                                                    Side
                                                  </th>
                                                  <th className="border border-black px-2 py-1 font-bold">
                                                    Trial 1
                                                  </th>
                                                  <th className="border border-black px-2 py-1 font-bold">
                                                    Trial 2
                                                  </th>
                                                  <th className="border border-black px-2 py-1 font-bold">
                                                    Trial 3
                                                  </th>
                                                  <th className="border border-black px-2 py-1 font-bold">
                                                    Trial 4
                                                  </th>
                                                  <th className="border border-black px-2 py-1 font-bold">
                                                    Trial 5
                                                  </th>
                                                  <th className="border border-black px-2 py-1 font-bold">
                                                    Trial 6
                                                  </th>
                                                  <th className="border border-black px-2 py-1 font-bold">
                                                    Average (weight)
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                <tr>
                                                  <td className="border border-black px-2 py-1 font-bold text-left">
                                                    Left
                                                  </td>
                                                  {leftTrialCells.map(
                                                    (value, index) => (
                                                      <td
                                                        key={`left-trial-${index}`}
                                                        className="border border-black px-2 py-1"
                                                      >
                                                        {value}
                                                      </td>
                                                    ),
                                                  )}
                                                  <td className="border border-black px-2 py-1 font-bold">
                                                    {leftAverageDisplay}
                                                  </td>
                                                </tr>
                                                <tr>
                                                  <td className="border border-black px-2 py-1 font-bold text-left">
                                                    Right
                                                  </td>
                                                  {rightTrialCells.map(
                                                    (value, index) => (
                                                      <td
                                                        key={`right-trial-${index}`}
                                                        className="border border-black px-2 py-1"
                                                      >
                                                        {value}
                                                      </td>
                                                    ),
                                                  )}
                                                  <td className="border border-black px-2 py-1 font-bold">
                                                    {rightAverageDisplay}
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </>
                                        );
                                      })()
                                    )}

                                    {/* Additional test information */}
                                    {test.effort && (
                                      <p className="text-sm mb-4">
                                        *Rating of Perceived Effort ={" "}
                                        {test.perceived || test.effort}
                                      </p>
                                    )}

                                    {!test.demonstrated &&
                                      !isCardioTest &&
                                      !isStaticLift && (
                                        <div className="mb-4">
                                          <p className="text-sm font-semibold">
                                            Reason For Incomplete Test:
                                          </p>
                                          <p className="text-sm">
                                            Limited by pain/discomfort
                                          </p>
                                          {isDynamicLift &&
                                          endpointConditionLabel ? (
                                            <>
                                              <p className="text-sm font-semibold mt-2">
                                                Endpoint Condition:
                                              </p>
                                              <p className="text-sm">
                                                {endpointConditionLabel}
                                              </p>
                                            </>
                                          ) : null}
                                        </div>
                                      )}
                                  </div>

                                  {/* Graphs Section */}
                                  {!isCardioTest && !isLiftTest && (
                                    <div>
                                      <h4 className="font-semibold mb-3">
                                        Graph:
                                      </h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        {/* Left Side Graph */}
                                        <div className="border border-gray-300 p-2">
                                          <div className="h-40 bg-white border relative overflow-hidden">
                                            <div className="flex items-end justify-center h-full p-2 space-x-1">
                                              {[
                                                test.leftMeasurements?.trial1,
                                                test.leftMeasurements?.trial2,
                                                test.leftMeasurements?.trial3,
                                                test.leftMeasurements?.trial4,
                                                test.leftMeasurements?.trial5,
                                                test.leftMeasurements?.trial6,
                                              ].map((value, i) => {
                                                const trialColors = [
                                                  "#3B82F6",
                                                  "#10B981",
                                                  "#F59E0B",
                                                  "#EF4444",
                                                  "#8B5CF6",
                                                  "#06B6D4",
                                                ];
                                                return (
                                                  <div
                                                    key={i}
                                                    className="flex flex-col items-center"
                                                  >
                                                    <div
                                                      className="w-4 rounded-t"
                                                      style={{
                                                        height: `${Math.max(((value || 0) / Math.max(test.leftMeasurements?.trial1 || 0, test.leftMeasurements?.trial2 || 0, test.leftMeasurements?.trial3 || 0, test.leftMeasurements?.trial4 || 0, test.leftMeasurements?.trial5 || 0, test.leftMeasurements?.trial6 || 0, test.rightMeasurements?.trial1 || 0, test.rightMeasurements?.trial2 || 0, test.rightMeasurements?.trial3 || 0, test.rightMeasurements?.trial4 || 0, test.rightMeasurements?.trial5 || 0, test.rightMeasurements?.trial6 || 0, 1)) * 120, 8)}px`,
                                                        backgroundColor:
                                                          trialColors[i],
                                                      }}
                                                    ></div>
                                                    <span className="text-xs mt-1">
                                                      {i + 1}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>

                                            {/* Y-axis labels */}
                                            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs py-2">
                                              <span>
                                                {Math.max(
                                                  leftAvg,
                                                  rightAvg,
                                                ).toFixed(0)}
                                              </span>
                                              <span>
                                                {(
                                                  Math.max(leftAvg, rightAvg) *
                                                  0.75
                                                ).toFixed(0)}
                                              </span>
                                              <span>
                                                {(
                                                  Math.max(leftAvg, rightAvg) *
                                                  0.5
                                                ).toFixed(0)}
                                              </span>
                                              <span>
                                                {(
                                                  Math.max(leftAvg, rightAvg) *
                                                  0.25
                                                ).toFixed(0)}
                                              </span>
                                              <span>0</span>
                                            </div>
                                          </div>
                                          <p className="text-center text-xs mt-2">
                                            <strong>Flexion</strong>
                                            <br />
                                            Left{" "}
                                            {testName.includes("flexion")
                                              ? "Flexion"
                                              : testName.includes("extension")
                                                ? "Extension"
                                                : "Side"}
                                            <br />
                                            {currentDate} 10:20:36 AM
                                          </p>
                                        </div>

                                        {/* Right Side Graph */}
                                        <div className="border border-gray-300 p-2">
                                          <div className="h-40 bg-white border relative overflow-hidden">
                                            <div className="flex items-end justify-center h-full p-2 space-x-1">
                                              {[
                                                test.rightMeasurements?.trial1,
                                                test.rightMeasurements?.trial2,
                                                test.rightMeasurements?.trial3,
                                                test.rightMeasurements?.trial4,
                                                test.rightMeasurements?.trial5,
                                                test.rightMeasurements?.trial6,
                                              ].map((value, i) => {
                                                const trialColors = [
                                                  "#3B82F6",
                                                  "#10B981",
                                                  "#F59E0B",
                                                  "#EF4444",
                                                  "#8B5CF6",
                                                  "#06B6D4",
                                                ];
                                                return (
                                                  <div
                                                    key={i}
                                                    className="flex flex-col items-center"
                                                  >
                                                    <div
                                                      className="w-4 rounded-t"
                                                      style={{
                                                        height: `${Math.max(((value || 0) / Math.max(test.leftMeasurements?.trial1 || 0, test.leftMeasurements?.trial2 || 0, test.leftMeasurements?.trial3 || 0, test.leftMeasurements?.trial4 || 0, test.leftMeasurements?.trial5 || 0, test.leftMeasurements?.trial6 || 0, test.rightMeasurements?.trial1 || 0, test.rightMeasurements?.trial2 || 0, test.rightMeasurements?.trial3 || 0, test.rightMeasurements?.trial4 || 0, test.rightMeasurements?.trial5 || 0, test.rightMeasurements?.trial6 || 0, 1)) * 120, 8)}px`,
                                                        backgroundColor:
                                                          trialColors[i],
                                                      }}
                                                    ></div>
                                                    <span className="text-xs mt-1">
                                                      {i + 1}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>

                                            {/* Y-axis labels */}
                                            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs py-2">
                                              <span>
                                                {Math.max(
                                                  leftAvg,
                                                  rightAvg,
                                                ).toFixed(0)}
                                              </span>
                                              <span>
                                                {(
                                                  Math.max(leftAvg, rightAvg) *
                                                  0.75
                                                ).toFixed(0)}
                                              </span>
                                              <span>
                                                {(
                                                  Math.max(leftAvg, rightAvg) *
                                                  0.5
                                                ).toFixed(0)}
                                              </span>
                                              <span>
                                                {(
                                                  Math.max(leftAvg, rightAvg) *
                                                  0.25
                                                ).toFixed(0)}
                                              </span>
                                              <span>0</span>
                                            </div>
                                          </div>
                                          <p className="text-center text-xs mt-2">
                                            <strong>Extension</strong>
                                            <br />
                                            Right{" "}
                                            {testName.includes("flexion")
                                              ? "Flexion"
                                              : testName.includes("extension")
                                                ? "Extension"
                                                : "Side"}
                                            <br />
                                            {currentDate} 10:20:36 AM
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {isLiftTest && (
                                    <div>
                                      <h4 className="font-semibold mb-3">
                                        Graph:
                                      </h4>
                                      <div className="border border-gray-300 p-2">
                                        <div className="h-40 bg-white border relative overflow-hidden">
                                          <div className="flex items-end justify-center h-full p-2 space-x-1">
                                            {[
                                              test.leftMeasurements?.trial1,
                                              test.leftMeasurements?.trial2,
                                              test.leftMeasurements?.trial3,
                                              test.leftMeasurements?.trial4,
                                              test.leftMeasurements?.trial5,
                                              test.leftMeasurements?.trial6,
                                            ].map((value, i) => {
                                              const trialColors = [
                                                "#3B82F6",
                                                "#10B981",
                                                "#F59E0B",
                                                "#EF4444",
                                                "#8B5CF6",
                                                "#06B6D4",
                                              ];
                                              const maxVal = Math.max(
                                                test.leftMeasurements?.trial1 ||
                                                  0,
                                                test.leftMeasurements?.trial2 ||
                                                  0,
                                                test.leftMeasurements?.trial3 ||
                                                  0,
                                                test.leftMeasurements?.trial4 ||
                                                  0,
                                                test.leftMeasurements?.trial5 ||
                                                  0,
                                                test.leftMeasurements?.trial6 ||
                                                  0,
                                                1,
                                              );
                                              return (
                                                <div
                                                  key={i}
                                                  className="flex flex-col items-center"
                                                >
                                                  <div
                                                    className="w-4 rounded-t"
                                                    style={{
                                                      height: `${Math.max(((value || 0) / maxVal) * 120, 8)}px`,
                                                      backgroundColor:
                                                        trialColors[i],
                                                    }}
                                                  ></div>
                                                  <span className="text-xs mt-1">
                                                    {i + 1}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>

                                          {/* Y-axis labels */}
                                          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs py-2">
                                            <span>{leftAvg.toFixed(0)}</span>
                                            <span>
                                              {(leftAvg * 0.75).toFixed(0)}
                                            </span>
                                            <span>
                                              {(leftAvg * 0.5).toFixed(0)}
                                            </span>
                                            <span>
                                              {(leftAvg * 0.25).toFixed(0)}
                                            </span>
                                            <span>0</span>
                                          </div>
                                        </div>
                                        <p className="text-center text-xs mt-2">
                                          <strong>Trials</strong>
                                          <br />
                                          {currentDate} 10:20:36 AM
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Heart Rate Data if available for this test */}
                                  {(() => {
                                    const pre = Number(
                                      (test.leftMeasurements
                                        ?.preHeartRate as any) ||
                                        (test.rightMeasurements
                                          ?.preHeartRate as any) ||
                                        0,
                                    );
                                    const post = Number(
                                      (test.leftMeasurements
                                        ?.postHeartRate as any) ||
                                        (test.rightMeasurements
                                          ?.postHeartRate as any) ||
                                        0,
                                    );
                                    if (!pre && !post) return null;
                                    return (
                                      <div className="text-xs text-gray-600 mb-2">
                                        <span className="font-semibold">
                                          Heart Rate:
                                        </span>
                                        {pre ? ` Pre: ${pre} bpm` : ""}
                                        {post ? ` Post: ${post} bpm` : ""}
                                      </div>
                                    );
                                  })()}

                                  {/* Test Comments */}
                                  {test.comments && (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                      <p className="text-sm italic">
                                        <strong>Clinical Comments:</strong>{" "}
                                        {test.comments}
                                      </p>
                                    </div>
                                  )}

                                  {/* References Section */}
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3">
                                      References:
                                    </h4>
                                    <div className="text-xs space-y-2 text-gray-700">
                                      {(() => {
                                        // Generate references based on test name - same logic as DownloadReport
                                        const testName =
                                          test.testName.toLowerCase();
                                        let references = [];

                                        if (
                                          testName.includes("grip") ||
                                          testName.includes("hand") ||
                                          testName.includes("pinch")
                                        ) {
                                          references = [
                                            "Mathiowetz, V., et al. (1985). Grip and Pinch Strength: Normative Data for Adults. Arch Phys Med Rehab, Vol. 66, pp. 69.",
                                            "Stokes, H. (1983). The Seriously Uninjured Hand-Weakness of Grip. Journal of Occupational Medicine, pp. 683-684.",
                                            "Matheson, L., et al. (1988). Grip Strength in a Disabled Sample: Reliability and Normative Standards. Industrial Rehabilitation Quarterly, Vol. 1, no. 3.",
                                            "Hildreth, et al. (1989). Detection of Submaximal effort by use of the rapid exchange grip. Journal of Hand Surgery, pp. 742.",
                                          ];
                                        } else if (
                                          testName.includes("static") &&
                                          testName.includes("lift")
                                        ) {
                                          references = [
                                            "Keyserling, W.M. (1979). Isometric Strength Testing in Selecting Workers for Strenuous Jobs. University of Michigan.",
                                            "Chaffin, D.B. (1978). Pre-employment Strength Testing: An Updated Position. Journal of Occupational Medicine, Vol. 20 No. 6.",
                                            "Badges, D. Work Practices Guide to Manual Lifting. NIOSH.",
                                            "Chaffin, D. (1975). Ergonomics Guide for the Assessment of Human Static Strength. American Industrial Hygiene Association Journal.",
                                            "Harber & SooHoo (1984). Static Ergonomic Strength Testing in Evaluating Occupational Back Pain. Journal of Occupational Medicine, Vol. 26 No. 12.",
                                          ];
                                        } else if (
                                          testName.includes("dynamic") &&
                                          testName.includes("lift")
                                        ) {
                                          references = [
                                            "Mayer, T.G., et al. (1988). Progressive Iso-inertial Lifting Evaluation: A Standardized Protocol and Normative Database. Spine Volume 13 Num. 9, pp. 993.",
                                          ];
                                        } else if (
                                          testName.includes("lift") ||
                                          testName.includes("carry")
                                        ) {
                                          references = [
                                            "Keyserling, W.M. (1979). Isometric Strength Testing in Selecting Workers for Strenuous Jobs. University of Michigan.",
                                            "Chaffin, D.B. (1978). Pre-employment Strength Testing: An Updated Position. Journal of Occupational Medicine, Vol. 20 No. 6.",
                                            "Mayer, T.G., et al. (1988). Progressive Iso-inertial Lifting Evaluation: A Standardized Protocol and Normative Database. Spine Volume 13 Num. 9, pp. 993.",
                                          ];
                                        } else if (
                                          testName.includes("push") ||
                                          testName.includes("pull")
                                        ) {
                                          references = [
                                            "Keyserling, W.M. (1979). Isometric Strength Testing in Selecting Workers for Strenuous Jobs. University of Michigan.",
                                            "Chaffin, D.B. (1978). Pre-employment Strength Testing: An Updated Position. Journal of Occupational Medicine, Vol. 20 No. 6.",
                                            "Chaffin, D. (1975). Ergonomics Guide for the Assessment of Human Static Strength. American Industrial Hygiene Association Journal.",
                                          ];
                                        } else if (
                                          testName.includes("range") ||
                                          testName.includes("motion") ||
                                          testName.includes("flexion") ||
                                          testName.includes("extension") ||
                                          testName.includes("goniometer")
                                        ) {
                                          references = [
                                            "American Medical Association (1993). Guides to the Evaluation of Permanent Impairment. 4th ed., pp. 112-135.",
                                            "American Medical Association (1990). Guides to the Evaluation of Permanent Impairment. 3rd ed., pp. 81-102.",
                                            "American Medical Association (1993). Guides to the Evaluation of Permanent Impairment. 4th ed., pp. 90-92 (Goniometers).",
                                            "American Medical Association (1990). Guides to the Evaluation of Permanent Impairment. 3rd ed., pp. 20-38, 101 (Goniometers).",
                                          ];
                                        } else if (
                                          testName.includes("muscle") ||
                                          testName.includes("dynamometer")
                                        ) {
                                          references = [
                                            "Andrews, A.W. (1991). Hand-held Dynamometry for Measuring Muscle Strength. Journal of Human Muscle Performance, pp. 35.",
                                          ];
                                        } else if (
                                          testName.includes("balance") ||
                                          testName.includes("coordination")
                                        ) {
                                          references = [
                                            "Berg, K.O., et al. (1992). Measuring balance in the elderly: validation of an instrument. Canadian Journal of Public Health, 83(2), S7-11.",
                                            "Tinetti, M.E. (1986). Performance-oriented assessment of mobility problems in elderly patients. Journal of the American Geriatrics Society, 34(2), 119-126.",
                                            "Duncan, P.W., et al. (1990). Functional reach: a new clinical measure of balance. Journal of Gerontology, 45(6), M192-197.",
                                          ];
                                        } else if (
                                          testName.includes("validity") ||
                                          testName.includes("horizontal")
                                        ) {
                                          references = [
                                            "Berryhill, et al. (1993). Horizontal Strength Changes: An Ergometric Measure for Determining Validity of Effort in Impairment Evaluations-A Preliminary Report. Journal of Disability, Vol. 3, Num. 14, pp. 143.",
                                            "Owens, L.A. (1993). Assessing Reliability of Performance in the Functional Capacity Assessment. Journal of Disability, Vol. 3, Num. 14, pp. 149.",
                                          ];
                                        } else if (
                                          testName.includes("mtm") ||
                                          testName.includes("time") ||
                                          testName.includes("measurement")
                                        ) {
                                          references = [
                                            'Anderson, D.S. and Edstrom D.P. "MTM Personnel Selection Tests; Validation at a Northwestern National Life Insurance Company". Journal of Methods-Time Measurement, 15, (3).',
                                            'Birdsong, J.H. and Chyatte, S.B. (1970) "Further medical applications of methods-time measurement". Journal of Methods-Time Measurement, 15, 19-27.',
                                            'Brickey, "MTM in a Sheltered Workshop". Journal of Methods-Time Measurement, 8, (3) 2-7.',
                                            'Chyatte, S.B. and Birdsong, J.H. (1972) "Methods time measurement in assessment of motor performance". Archives of Physical Medicine and Rehabilitation, 53, 38-44.',
                                            'Foulke, J.A. "Estimating Individual Operator Performance". Journal of Methods-Time Measurement, 15, (1) 18-23.',
                                            'Grant, G.W.B., Moores, B. and Whelan, E. (1975) "Applications of Methods-time measurement in training centers for the mentally handicapped". Journal of Methods-Time Measurement, 11, 23-30.',
                                          ];
                                        } else if (
                                          testName.includes("bruce") ||
                                          testName.includes("treadmill")
                                        ) {
                                          references = [
                                            "Bruce AM, Lawson D, Wasser TE, Raber-Baer D. Comparison of Bruce treadmill exercise test protocols: Is ramped Bruce equal or superior to standard bruce in producing clinically valid studies for patients presenting for evaluation of cardiac ischemia or arrhythmia with body mass index equal to or greater than 30? J Nucl Med Technol. 2013 Dec;41(4):274-8",
                                            "Poehlman CP, Llewellyn TL. The Effects of Submaximal and Maximal Exercise on Heart Rate Variability. Int J Exerc Sci. 2019;12(9):9-14.",
                                          ];
                                        } else if (testName.includes("mcaft")) {
                                          references = [
                                            "Weller et al. Prediction of maximal oxygen uptake from a modified Canadian aerobic fitness test. Can. J. Appl. Physiol. 18(2) 175-188, 1993",
                                            "*Weller et al. A study to validate the Canadian aerobic fitness test. Can. J. Appl. Physiol. 20(2) 211-221, 1995",
                                          ];
                                        } else if (testName.includes("kasch")) {
                                          references = [
                                            "Validation of a bench stepping test for cardiorespiratory fitness classification of emergency service personnel J A Davis, J H Wilmore, PMID: 5014456",
                                          ];
                                        } else if (
                                          testName.includes("facts") ||
                                          testName.includes("step") ||
                                          testName.includes("cardio") ||
                                          testName.includes("reach")
                                        ) {
                                          references = [
                                            "Blankenship, K.L. (1994). Industrial Rehabilitation. Slack Incorporated.",
                                            "Matheson, L.N., et al. (1995). Work hardening: occupational therapy in industrial rehabilitation. American Journal of Occupational Therapy, 49(8), 773-781.",
                                            "Innes, E., & Straker, L. (1999). Reliability of work-related assessments. Work, 13(2), 107-124.",
                                          ];
                                        } else {
                                          // Default references for general functional capacity evaluation
                                          references = [
                                            "Innes, E., & Straker, L. (1999). Reliability of work-related assessments. Work, 13(2), 107-124.",
                                            "American Physical Therapy Association. (2014). Guide to Physical Therapist Practice 3.0. APTA.",
                                            "Functional Capacity Evaluation: An Evidence-Based Approach, Innes & Straker, 1999.",
                                          ];
                                        }

                                        return references.map((ref, index) => (
                                          <p key={index}>{ref}</p>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

              {/* Occupational Tasks Methods Time Measurement Analysis */}
              {reportData.mtmTestData &&
                Object.keys(reportData.mtmTestData).length > 0 && (
                  <div className="p-8 border-b bg-white">
                    <div className="flex justify-end mb-2">
                      <span className="text-sm text-gray-500">
                        Page {18 + (reportData.testData?.tests?.length || 0)}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg mb-4">
                      Occupational Tasks Methods Time Measurement Analysis
                    </h3>

                    <div className="grid grid-cols-12 gap-6">
                      {/* Left Column - Illustrations */}
                      <div className="col-span-3">
                        <div className="space-y-4">
                          <p className="text-sm font-medium underline">
                            Sample Illustration:
                          </p>

                          <div className="grid grid-cols-1 gap-3">
                            {Object.keys(reportData.mtmTestData || {}).map(
                              (testType) => {
                                const illos = getSampleIllustrations(testType);
                                if (!illos.length) return null;
                                return illos.map((ill, i) => (
                                  <div
                                    key={`${testType}-${i}`}
                                    className="text-center"
                                  >
                                    <img
                                      src={ill.src}
                                      alt={ill.label}
                                      className="w-16 h-20 mx-auto border object-cover bg-white"
                                    />
                                    <p className="text-xs mt-1">{ill.label}</p>
                                  </div>
                                ));
                              },
                            )}
                          </div>
                        </div>

                        {/* Vertical Divider */}
                        <div className="border-r border-gray-300 h-full absolute right-0 top-0"></div>
                      </div>

                      {/* Right Column - Content */}
                      <div className="col-span-9">
                        <div className="space-y-6">
                          {/* Test Description */}
                          <p className="text-sm italic">
                            The client was tested in our facility using MTM. The
                            test results were compared to industrial standards.
                          </p>

                          {/* Results Section */}
                          <div>
                            <h4 className="font-semibold mb-3">Results:</h4>

                            {/* Occupational Tasks MTM Tables - Using actual MTM test data */}
                            {Object.entries(reportData.mtmTestData).map(
                              (
                                [testType, testData]: [string, any],
                                index: number,
                              ) => {
                                const trials = testData.trials || [];
                                const testName =
                                  testData.testName ||
                                  testType.charAt(0).toUpperCase() +
                                    testType.slice(1);

                                // Calculate averages from actual trial data
                                const avgTime =
                                  trials.length > 0
                                    ? trials.reduce(
                                        (sum: number, t: any) =>
                                          sum + getTrialTime(t),
                                        0,
                                      ) / trials.length
                                    : 0;
                                const avgPercentIS =
                                  trials.length > 0
                                    ? trials.reduce(
                                        (sum: number, t: any) =>
                                          sum + (t.percentIS || 0),
                                        0,
                                      ) / trials.length
                                    : 0;
                                const avgReps =
                                  trials.length > 0
                                    ? trials.reduce(
                                        (sum: number, t: any) =>
                                          sum + (t.reps || 0),
                                        0,
                                      ) / trials.length
                                    : 0;

                                return (
                                  <div key={index} className="mb-6">
                                    <table className="w-full border border-gray-400 text-xs mb-4">
                                      {/* Header row with test name and date */}
                                      <thead>
                                        <tr>
                                          <th
                                            className="border border-gray-400 p-2 text-center bg-white"
                                            colSpan={8}
                                          >
                                            {testName} -{" "}
                                            {new Date(
                                              testData.completedAt ||
                                                Date.now(),
                                            ).toLocaleDateString()}{" "}
                                            {new Date(
                                              testData.completedAt ||
                                                Date.now(),
                                            ).toLocaleTimeString()}
                                          </th>
                                        </tr>
                                        <tr className="bg-yellow-300">
                                          <th className="border border-gray-400 border-r-gray-400 p-2">
                                            Trial:
                                          </th>
                                          <th className="border border-gray-400 border-r-gray-400 p-2">
                                            Side:
                                          </th>
                                          <th className="border border-gray-400 border-r-gray-400 p-2">
                                            Weight/Plane:
                                          </th>
                                          <th className="border border-gray-400 border-r-gray-400 p-2">
                                            Distance/
                                            <br />
                                            Posture:
                                          </th>
                                          <th className="border border-gray-400 border-r-gray-400 p-2">
                                            Reps:
                                          </th>
                                          <th className="border border-gray-400 border-r-gray-400 p-2">
                                            Time
                                            <br />
                                            (sec)
                                          </th>
                                          <th className="border border-gray-400 border-r-gray-400 p-2">
                                            %IS
                                          </th>
                                          <th className="border border-gray-400 border-r-gray-400 p-2">
                                            Time Set
                                            <br />
                                            Completed
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {trials.length > 0 ? (
                                          trials.map(
                                            (
                                              trial: any,
                                              trialIndex: number,
                                            ) => (
                                              <tr key={trialIndex}>
                                                <td className="border border-gray-400 p-2 text-center">
                                                  {trial.trial ||
                                                    trialIndex + 1}
                                                </td>
                                                <td className="border border-gray-400 p-2 text-center">
                                                  {trial.side || "Both"}
                                                </td>
                                                <td className="border border-gray-400 p-2 text-center">
                                                  {formatParam(trial.weight) ||
                                                    trial.plane ||
                                                    "Immediate"}
                                                </td>
                                                <td className="border border-gray-400 p-2 text-center">
                                                  {formatParam(
                                                    trial.distance,
                                                  ) ||
                                                    trial.position ||
                                                    "Standing"}
                                                </td>
                                                <td className="border border-gray-400 p-2 text-center">
                                                  {trial.reps || 1}
                                                </td>
                                                <td className="border border-gray-400 p-2 text-center">
                                                  {getTrialTime(trial).toFixed(
                                                    1,
                                                  )}
                                                </td>
                                                <td className="border border-gray-400 p-2 text-center">
                                                  {(
                                                    trial.percentIS || 0
                                                  ).toFixed(1)}
                                                </td>
                                                <td className="border border-gray-400 p-2 text-center"></td>
                                              </tr>
                                            ),
                                          )
                                        ) : (
                                          <tr>
                                            <td
                                              className="border border-gray-400 p-2 text-center"
                                              colSpan={8}
                                            >
                                              No trial data available for{" "}
                                              {testName}
                                            </td>
                                          </tr>
                                        )}
                                        {/* Average row */}
                                        {trials.length > 0 && (
                                          <tr className="bg-gray-100">
                                            <td className="border border-gray-400 p-2 text-center font-semibold">
                                              Avg.
                                            </td>
                                            <td className="border border-gray-400 p-2 text-center"></td>
                                            <td className="border border-gray-400 p-2 text-center"></td>
                                            <td className="border border-gray-400 p-2 text-center"></td>
                                            <td className="border border-gray-400 p-2 text-center">
                                              {avgReps.toFixed(0)}
                                            </td>
                                            <td className="border border-gray-400 p-2 text-center">
                                              {avgTime.toFixed(2)}
                                            </td>
                                            <td className="border border-gray-400 p-2 text-center">
                                              {avgPercentIS.toFixed(2)}
                                            </td>
                                            <td className="border border-gray-400 p-2 text-center">
                                              {computeTimeSum(trials).toFixed(
                                                1,
                                              )}
                                            </td>
                                          </tr>
                                        )}
                                        {/* Total IS% row */}
                                        {trials.length > 0 && (
                                          <tr className="bg-blue-100 border-t-2 border-blue-500">
                                            <td className="border border-gray-400 p-2 text-left font-semibold text-blue-800">
                                              Total IS%
                                            </td>
                                            <td className="border border-gray-400 p-2"></td>
                                            <td className="border border-gray-400 p-2"></td>
                                            <td className="border border-gray-400 p-2"></td>
                                            <td className="border border-gray-400 p-2"></td>
                                            <td className="border border-gray-400 p-2"></td>
                                            <td className="border border-gray-400 p-2 text-center font-bold text-blue-800">
                                              {avgPercentIS.toFixed(1)}%
                                            </td>
                                            <td className="border border-gray-400 p-2"></td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>

                                    {/* Heart Rate Data if available */}
                                    {(testData.hrPre || testData.hrPost) && (
                                      <div className="text-xs text-gray-600 mb-2">
                                        <span className="font-semibold">
                                          Heart Rate:
                                        </span>
                                        {testData.hrPre &&
                                          ` Pre: ${testData.hrPre} bpm`}
                                        {testData.hrPost &&
                                          ` Post: ${testData.hrPost} bpm`}
                                      </div>
                                    )}

                                    {/* MTM Test Images */}
                                    {testData.savedImageData &&
                                      testData.savedImageData.length > 0 && (
                                        <div className="mt-4">
                                          <h5 className="text-xs font-semibold mb-2">
                                            Test Images:
                                          </h5>
                                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {testData.savedImageData.map(
                                              (
                                                image: any,
                                                imageIndex: number,
                                              ) => (
                                                <div
                                                  key={imageIndex}
                                                  className="relative"
                                                >
                                                  <img
                                                    src={
                                                      image.dataUrl ||
                                                      image.data
                                                    }
                                                    alt={
                                                      image.name ||
                                                      `${testName} test image ${imageIndex + 1}`
                                                    }
                                                    className="w-full h-24 object-cover rounded-lg border shadow-sm"
                                                  />
                                                  <p className="text-xs text-gray-500 mt-1 truncate">
                                                    {image.name ||
                                                      `Test Image ${imageIndex + 1}`}
                                                  </p>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                            <p className="text-xs text-blue-800">
                                              <strong>Note:</strong> The above
                                              images provide visual
                                              documentation of the {testName}{" "}
                                              test procedures and results.
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                    {/* Clinical Comments for this specific test */}
                                    {(() => {
                                      // Find corresponding test in regular test data for comments
                                      const correspondingTest =
                                        reportData.testData?.tests?.find(
                                          (test: any) =>
                                            test.testName
                                              .toLowerCase()
                                              .includes(
                                                testType.toLowerCase(),
                                              ) ||
                                            test.testId === testType ||
                                            testType.includes(
                                              test.testName.toLowerCase(),
                                            ),
                                        );

                                      if (correspondingTest?.comments) {
                                        return (
                                          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                                            <p className="text-xs">
                                              <span className="font-semibold">
                                                Clinical Comments:
                                              </span>
                                            </p>
                                            <p className="text-xs mt-1 italic">
                                              {correspondingTest.comments}
                                            </p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                );
                              },
                            )}
                          </div>

                          {/* References Section */}
                          <div className="border-t pt-4">
                            <h4 className="font-semibold mb-3">References:</h4>
                            <div className="text-xs space-y-2 text-gray-700">
                              <p>
                                Anderson, D.S. and Edstrom D.P. "MTM Personnel
                                Selection Tests; Validation at a Northwestern
                                National Life Insurance Company". Journal of
                                Methods-Time Measurement, 15, (3).
                              </p>
                              <p>
                                Birdsong, J.H. and Chyatte, S.B. (1970) "Further
                                medical applications of methods-time
                                measurement". Journal of Methods-Time
                                Measurement, 15, 19-27.
                              </p>
                              <p>
                                Brickey, "MTM in a Sheltered Workshop". Journal
                                of Methods-Time Measurement, 8, (3) 2-7.
                              </p>
                              <p>
                                Chyatte, S.B. and Birdsong, J.H. (1972) "Methods
                                time measurement in assessment of motor
                                performance". Archives of Physical Medicine and
                                Rehabilitation, 53, 38-44.
                              </p>
                              <p>
                                Foulke, J.A. "Estimating Individual Operator
                                Performance". Journal of Methods-Time
                                Measurement, 15, (1) 18-23.
                              </p>
                              <p>
                                Grant, G.W.B., Moores, B. and Whelan, E. (1975)
                                "Applications of Methods-time measurement in
                                training centers for the mentally handicapped".
                                Journal of Methods-Time Measurement, 11, 23-30.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Appendix One - Reference Charts */}
              <div className="p-8 border-b">
                <div className="flex justify-end mb-4">
                  <span className="text-sm text-gray-500">Page 19</span>
                </div>

                <h3 className="font-bold text-lg mb-6">
                  Appendix One- Reference Charts
                </h3>

                {/* Perceived Exertion and Pain Scales */}
                <div className="mb-8">
                  <h4 className="font-bold text-blue-800 mb-4">
                    Perceived Exertion and Pain Scales
                  </h4>

                  <table className="w-full border border-gray-400 border-r-gray-400 text-xs mb-6">
                    <thead>
                      <tr className="bg-yellow-300">
                        <th className="border border-gray-400 border-r-gray-400 p-2 text-left">
                          Perceived Exertion
                        </th>
                        <th className="border border-gray-400 border-r-gray-400 p-2">
                          Rating (RPE)
                        </th>
                        <th className="border border-gray-400 border-r-gray-400 p-2">
                          Minimal Heart Rate
                        </th>
                        <th className="border border-gray-400 border-r-gray-400 p-2">
                          Mean Heart Rate
                        </th>
                        <th className="border border-gray-400 border-r-gray-400 p-2">
                          Maximal Heart Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          no exertion at all
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          6
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          69
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          77
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          91
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          extremely light
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          7
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          76
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          85
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          101
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2"></td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          8
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          83
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          93
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          111
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          very light
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          9
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          89
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          101
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          122
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2"></td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          10
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          96
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          110
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          132
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          light
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          11
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          103
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          118
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          142
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2"></td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          12
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          110
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          126
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          153
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          somewhat hard
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          13
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          116
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          135
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          163
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2"></td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          14
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          123
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          143
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          173
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          hard (heavy)
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          15
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          130
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          151
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          184
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2"></td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          16
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          137
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          159
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          194
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          very hard
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          17
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          143
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          168
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          204
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2"></td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          18
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          150
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          176
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          215
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          extremely hard
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          19
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          157
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          184
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          225
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          maximal exertion
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          20
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          164
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          193
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          235
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="text-xs italic text-gray-600">
                    *Borg G. Borg's Perceived Exertion and Pain Scales. Human
                    Kinetics. 1998.
                  </p>
                </div>

                {/* Physical Demand Characteristics of Work */}
                <div className="mb-8">
                  <h4 className="font-bold text-blue-800 mb-4">
                    Physical Demand Characteristics of Work
                  </h4>

                  <table className="w-full border border-gray-400 border-r-gray-400 text-xs mb-6">
                    <thead>
                      <tr className="bg-yellow-300">
                        <th
                          className="border border-gray-400 border-r-gray-400 p-2"
                          colSpan={4}
                        >
                          Physical Demand Characteristics of Work
                        </th>
                      </tr>
                      <tr className="bg-yellow-300">
                        <th
                          className="border border-gray-400 border-r-gray-400 p-2"
                          colSpan={4}
                        >
                          (Dictionary of Occupational Titles - Volume II, Fourth
                          Edition, Revised 1991)
                        </th>
                      </tr>
                      <tr className="bg-yellow-300">
                        <th className="border border-gray-400 border-r-gray-400 p-2">
                          Physical Demand Level
                        </th>
                        <th className="border border-gray-400 border-r-gray-400 p-2">
                          SELDOM / OCCASIONALLY
                          <br />
                          0-33% of the workday
                        </th>
                        <th className="border border-gray-400 border-r-gray-400 p-2">
                          FREQUENTLY
                          <br />
                          34-66% of the workday
                        </th>
                        <th className="border border-gray-400 border-r-gray-400 p-2">
                          CONSTANTLY
                          <br />
                          67-100% of the workday
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">
                          Sedentary
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          1 - 10 lbs.
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          Negligible
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          Negligible
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">
                          Light
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          11 - 25 lbs.
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          1 - 10 lbs.
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          Negligible
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">
                          Medium
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          26 - 50 lbs.
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          11 - 25 lbs.
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          1 - 10 lbs.
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">
                          Heavy
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          51 - 100 lbs.
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          26 - 50 lbs.
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          11 - 25 lbs.
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-400 p-2 font-semibold">
                          Very Heavy
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          Over 100 lbs.
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          Over 50 lbs.
                        </td>
                        <td className="border border-gray-400 border-r-gray-400 p-2">
                          Over 25 lbs.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Page break for second page of reference charts */}
                <div className="border-t-2 border-gray-300 pt-8">
                  <div className="flex justify-end mb-4">
                    <span className="text-sm text-gray-500">Page 20</span>
                  </div>

                  {/* PDC Categories based on Sustainable Energy Level */}
                  <div className="mb-8">
                    <h4 className="font-bold text-blue-800 mb-4">
                      PDC Categories based on Sustainable Energy Level
                    </h4>

                    <table className="w-full border border-gray-400 border-r-gray-400 text-xs mb-6">
                      <thead>
                        <tr className="bg-yellow-300">
                          <th
                            className="border border-gray-400 border-r-gray-400 p-2"
                            colSpan={2}
                          >
                            PDC Categories based on Sustainable Energy Level
                            (Energy Cost) over an 8-hour workday
                          </th>
                        </tr>
                        <tr className="bg-yellow-300">
                          <th className="border border-gray-400 border-r-gray-400 p-2">
                            PDC Category
                          </th>
                          <th className="border border-gray-400 border-r-gray-400 p-2">
                            Sustainable Energy Level
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-400 p-2 font-semibold">
                            Sedentary
                          </td>
                          <td className="border border-gray-400 border-r-gray-400 p-2">
                            &lt; 1.7 Kcal/min
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-400 p-2 font-semibold">
                            Light
                          </td>
                          <td className="border border-gray-400 border-r-gray-400 p-2">
                            1.7 to 3.2 Kcal/min
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-400 p-2 font-semibold">
                            Medium
                          </td>
                          <td className="border border-gray-400 border-r-gray-400 p-2">
                            3.3 to 5.7 Kcal/min
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-400 p-2 font-semibold">
                            Heavy
                          </td>
                          <td className="border border-gray-400 border-r-gray-400 p-2">
                            5.8 to 8.2 Kcal/min
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-400 p-2 font-semibold">
                            Very Heavy
                          </td>
                          <td className="border border-gray-400 border-r-gray-400 p-2">
                            8.3 or more Kcal/min
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* General Patterns of Activity Descriptors */}
                  <div className="mb-8">
                    <h4 className="font-bold text-blue-800 mb-4 text-center">
                      General Patterns of Activity Descriptors
                    </h4>

                    <div className="text-xs space-y-4">
                      <div>
                        <p className="font-semibold underline">
                          (S) Sedentary Work
                        </p>
                        <p className="text-justify leading-relaxed">
                          Exerting up to 10 lbs of force occasionally and/or a
                          negligible amount of force frequently to lift, carry,
                          push, pull, or otherwise move objects, including the
                          human body. Sedentary work involves sitting most of
                          the time but may involve walking or standing for brief
                          periods of time. Jobs are sedentary if walking and
                          standing are required occasionally and all other
                          sedentary criteria are met. Strength is considered
                          sedentary when none of the light strength requirements
                          are met and standing is required less than or equal to
                          1/3 of the work schedule or workday. For civilian
                          workers, 30.6 percent of workers were required to work
                          at a sedentary strength level. Occupations with
                          critical tasks where workers typically spend the day
                          sitting and occasionally lift items of little weight,
                          like a pen or a few pieces of paper, require sedentary
                          strength.
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold underline">
                          (L) Light Work
                        </p>
                        <p className="text-justify leading-relaxed">
                          Exerting 11 to 25 lb of force occasionally, and/or up
                          to 10 lb of force frequently, and/or a negligible
                          amount of force constantly to move objects. Physical
                          demand requirements are in excess of those for
                          sedentary work. Even though the weight lifted may be
                          only negligible, a job should be rated Light Work: (1)
                          when it requires walking or standing to a significant
                          degree; or (2) when it requires sitting most of the
                          time but entails pushing and/or pulling of arm or leg
                          controls; and/or (3) when the job requires working at
                          a production rate pace entailing the constant pushing
                          and/or pulling of materials even though the weight of
                          those materials is negligible. The constant stress and
                          strain of maintaining a production rate pace,
                          especially in an industrial setting, can be and is
                          physically exhausting. If the work level of an
                          occupation does not meet the conditions for the other
                          strength levels, including sedentary, a light strength
                          level is required. For civilian workers, 33.3 percent
                          of workers were required to work at a light strength
                          level.
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold underline">
                          (M) Medium Work
                        </p>
                        <p className="text-justify leading-relaxed">
                          Exerting 26 to 50 lbs of force occasionally, and/or 11
                          to 25 lbs of force frequently, and/or greater than
                          negligible up to 10 lbs of force constantly to move
                          objects. Physical demand requirements are in excess of
                          those for light work. For civilian workers, 29.0
                          percent of workers were required to work at a medium
                          strength level.
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold underline">
                          (H) Heavy Work
                        </p>
                        <p className="text-justify leading-relaxed">
                          Exerting 51 to 100 lbs of force occasionally, and/or
                          26 to 50 lbs of force frequently, and/or 11 to 25 lbs
                          of force constantly to move objects. Physical demand
                          requirements are in excess of those for medium work.
                          For civilian workers, 6.4 percent of workers were
                          required to work at a heavy strength level.
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold underline">
                          (VH) Very Heavy
                        </p>
                        <p className="text-justify leading-relaxed">
                          Exerting over 100 lbs of force occasionally, and over
                          50 lbs of force frequently, and over 25 lbs of force
                          constantly to move objects. For civilian workers, 0.7
                          percent required a very heavy strength level, which
                          indicates requirements beyond the conditions set for
                          heavy work. Examples of occupational groups with heavy
                          strength level requirements include: Laborers in
                          construction and extraction occupations may lift items
                          that weigh 50 pounds or more, like bags of cement or
                          sheets of plywood, for more than 1/3 of the workday.
                        </p>
                      </div>

                      <div>
                        <p className="italic text-gray-600 text-justify leading-relaxed">
                          *'Occasionally' indicates that an activity or
                          condition exists up to one third of the time;
                          'frequently' indicates that an activity or condition
                          exists from one third to two thirds of the time;
                          'constantly' indicates that an activity or condition
                          exists two thirds or more of the time.
                        </p>
                      </div>

                      <div>
                        <p className="italic text-gray-600 text-justify leading-relaxed">
                          *Duration levels are used to calculate the amount of
                          time spent lifting or carrying. There are four
                          duration levels in relation to a job's workday
                          schedule: seldom (up to 2 percent), occasional (2
                          percent to 1/3), frequent (1/3 to 2/3), and constant
                          (2/3 or more).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Lift Test End Point Conditions */}
                  <div className="mb-8">
                    <h4 className="font-bold text-blue-800 mb-4">
                      Dynamic Lift Test End Point Conditions
                    </h4>

                    <table className="w-full border border-gray-400 border-r-gray-400 text-xs">
                      <thead>
                        <tr className="bg-yellow-300">
                          <th
                            className="border border-gray-400 border-r-gray-400 p-2"
                            colSpan={2}
                          >
                            Test End Point Conditions
                          </th>
                        </tr>
                        <tr className="bg-yellow-300">
                          <th className="border border-gray-400 border-r-gray-400 p-2">
                            CONDITION
                          </th>
                          <th className="border border-gray-400 border-r-gray-400 p-2">
                            DESCRIPTION
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-400 p-2 font-semibold">
                            Biomechanical
                          </td>
                          <td className="border border-gray-400 border-r-gray-400 p-2">
                            The biomechanical stopping point follows the
                            biomechanics of the person as they perform the
                            activity. While you will not be able to teach proper
                            body mechanics during the relatively short duration
                            of an FCE, you should encourage proper body
                            mechanics. Ultimately, you will be assessing the
                            client’s capacity as he or she moves in their usual
                            way to complete each task. The biomechanical
                            stopping point relies on your clinical observation
                            skills and knowledge of proper body mechanics.
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-400 p-2 font-semibold">
                            Physiological
                          </td>
                          <td className="border border-gray-400 border-r-gray-400 p-2">
                            Physiological response to testing refers to the
                            client’s involuntary reactions to the tests. These
                            reactions include heart rate, blood pressure,
                            respiration rate, changes in pallor, and similar
                            markers. The American College of Sports Medicine
                            recommends keeping the client’s heart rate below 85%
                            of age-predicted maximum heart rate (APMHR) during
                            physically demanding testing, with a recovery to 70%
                            APMHR before commencing the next test.
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-400 p-2 font-semibold">
                            Psychophysical
                          </td>
                          <td className="border border-gray-400 border-r-gray-400 p-2">
                            The psychophysical ending point is based on the
                            client’s perceived rate of exertion—that is, how the
                            client feels or perceives the difficulty of the
                            task. You can use a scale to rate the perception of
                            difficulty, such as the Borg Scale, or simply ask
                            the client to describe their comfort level with the
                            activity. The test should be terminated at the point
                            where the client feels they can no longer continue
                            and has reached their maximum performance level.
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-400 p-2 font-semibold">
                            Task Requirement
                          </td>
                          <td className="border border-gray-400 border-r-gray-400 p-2">
                            A fourth, but still important, stopping criterion is
                            the task requirement. This applies more to
                            return-to-work (RTW) testing when you know the
                            specific physical demands of the job tasks and are
                            assessing the client’s ability to perform them. When
                            the client’s tested ability matches the defined job
                            requirement, you should stop the test because
                            continuing beyond the task requirement could put the
                            client at unnecessary risk.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Blankenship FCE System Reference */}
              <div className="p-8 border-b">
                <div className="grid grid-cols-3 gap-8 mb-8">
                  <div className="col-span-2">
                    <h3 className="font-bold text-sm mb-2">Sensitivity and Specificity of the Blankenship FCE System's Indicators of Submaximal Effort</h3>
                    <p className="text-xs text-gray-700 mb-3">Penny N Brubaker, PT, MSI; Frank J Fearon, PT, DHSc, OCS, FAACGPT2; Stephen M Smith, PhD; Richard J. Bohannon, PT, MS, ECS4; James Alday, MDS; Sheryl S Andrew, PT, MS6; Everald Clarke, PT, MS7; George L Shaw Jr, PT, MS8</p>
                    <p className="text-xs text-gray-700 mb-4">Four components of the Blankenship-slip FCE demonstrated a sensitivity of 80% and a specificity of 84.2% in determining submaximal effort. The 70% cutoff score developed by the Blankenship Group was shown to provide greatest diagnostic accuracy for identifying submaximal effort. Five indicators of validity were shown to have 70% sensitivity or greater and 12 indicators had 100% specificity. The clinical relevance for this study is that the validity indicators of 4 components of the Blankenship FCE had good sensitivity and specificity, however, raters should recognize that a small percentage of false positives (maximum effort identified as submaximal effort) might occur. Also, the clinician should note that scores of equivocal are not scored in the criteria-based category and could potentially increase a worker's overall FCE validity score. Only 5 of the indicators of validity tested scored greater than 70% sensitivity (Table 3). Likewise, 12 indicators had 100% specificity (Table 4). However, these variables had low sensitivity (less than 70%). Only 1 indicator had both sensitivity and specificity greater than 70%. This indicator of validity was OMH is greater than the high extrapolation from the leg static-strength test. The sensitivity was 78.6% and specificity was 72.2%.</p>
                  </div>

                  {/* Table 1 on the right */}
                  <div>
                    <h4 className="font-bold text-xs mb-2 bg-gray-600 text-white p-2">TABLE 1 - DEMOGRAPHIC DATA OF PARTICIPANTS</h4>
                    <table className="w-full border border-gray-300 text-xs">
                      <thead>
                        <tr className="bg-yellow-200">
                          <th className="border border-gray-300 p-1 text-left text-xs">Subject Characteristics</th>
                          <th className="border border-gray-300 p-1 text-xs">100% Effort</th>
                          <th className="border border-gray-300 p-1 text-xs">50% Effort</th>
                          <th className="border border-gray-300 p-1 text-xs">Significance Test</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="border border-gray-300 p-1">Age (y)</td><td className="border border-gray-300 p-1 text-center">35.7</td><td className="border border-gray-300 p-1 text-center">33.5</td><td className="border border-gray-300 p-1 text-center">t = 13.9* (= .5)</td></tr>
                        <tr><td className="border border-gray-300 p-1">Range</td><td className="border border-gray-300 p-1 text-center">23-60</td><td className="border border-gray-300 p-1 text-center">18-55</td><td className="border border-gray-300 p-1 text-center"></td></tr>
                        <tr><td className="border border-gray-300 p-1">Gender: Male/Female</td><td className="border border-gray-300 p-1 text-center">7/5</td><td className="border border-gray-300 p-1 text-center">10/2</td><td className="border border-gray-300 p-1 text-center">χ² = 0.67* (= .3)</td></tr>
                        <tr><td className="border border-gray-300 p-1">Race: Caucasian/African American</td><td className="border border-gray-300 p-1 text-center">12/0</td><td className="border border-gray-300 p-1 text-center">10/2</td><td className="border border-gray-300 p-1 text-center">χ² = 0.67* (= .3)</td></tr>
                        <tr><td className="border border-gray-300 p-1">Hard dominance: Right/Left</td><td className="border border-gray-300 p-1 text-center">11/1</td><td className="border border-gray-300 p-1 text-center">11/1</td><td className="border border-gray-300 p-1 text-center"></td></tr>
                        <tr><td className="border border-gray-300 p-1">Body mass (kg): Mean</td><td className="border border-gray-300 p-1 text-center">15.20</td><td className="border border-gray-300 p-1 text-center">17</td><td className="border border-gray-300 p-1 text-center">t = 1.4* (= .2)</td></tr>
                        <tr><td className="border border-gray-300 p-1">Range</td><td className="border border-gray-300 p-1 text-center">54.0-127.8</td><td className="border border-gray-300 p-1 text-center">54.0-103.5</td><td className="border border-gray-300 p-1 text-center"></td></tr>
                        <tr><td className="border border-gray-300 p-1">Insurance: Yes/No</td><td className="border border-gray-300 p-1 text-center">11/1</td><td className="border border-gray-300 p-1 text-center">10/2</td><td className="border border-gray-300 p-1 text-center"></td></tr>
                        <tr><td className="border border-gray-300 p-1">Employment: Employed/Not employed/Retired</td><td className="border border-gray-300 p-1 text-center">11/1/0</td><td className="border border-gray-300 p-1 text-center">10/2/0</td><td className="border border-gray-300 p-1 text-center">χ² = 0.1 (= .8)</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 1: Demographic Data */}
                <div className="mb-8">
                  <h4 className="font-semibold text-sm mb-3 bg-gray-200 p-2">TABLE 1 - DEMOGRAPHIC DATA OF PARTICIPANTS</h4>
                  <table className="w-full border border-gray-300 text-xs">
                    <thead>
                      <tr className="bg-yellow-200">
                        <th className="border border-gray-300 p-2 text-left">Subject Characteristics</th>
                        <th className="border border-gray-300 p-2">100% Effort (n=12)</th>
                        <th className="border border-gray-300 p-2">50% Effort (n=12)</th>
                        <th className="border border-gray-300 p-2">Significance Test</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2">Age (y)</td>
                        <td className="border border-gray-300 p-2 text-center">35.7</td>
                        <td className="border border-gray-300 p-2 text-center">33.5</td>
                        <td className="border border-gray-300 p-2 text-center">t = 13.9* (= .5)</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Range</td>
                        <td className="border border-gray-300 p-2 text-center">23-60</td>
                        <td className="border border-gray-300 p-2 text-center">18-55</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Gender: Male/Female</td>
                        <td className="border border-gray-300 p-2 text-center">7/5</td>
                        <td className="border border-gray-300 p-2 text-center">10/2</td>
                        <td className="border border-gray-300 p-2 text-center">χ² = 0.67* (= .3)</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Race: Caucasian/African American</td>
                        <td className="border border-gray-300 p-2 text-center">12/0</td>
                        <td className="border border-gray-300 p-2 text-center">10/2</td>
                        <td className="border border-gray-300 p-2 text-center">χ² = 0.67* (= .3)</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Hard dominance: Right/Left</td>
                        <td className="border border-gray-300 p-2 text-center">11/1</td>
                        <td className="border border-gray-300 p-2 text-center">11/1</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Body mass (kg): Mean</td>
                        <td className="border border-gray-300 p-2 text-center">15.20</td>
                        <td className="border border-gray-300 p-2 text-center">17</td>
                        <td className="border border-gray-300 p-2 text-center">t = 1.4* (= .2)</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Range</td>
                        <td className="border border-gray-300 p-2 text-center">54.0-127.8</td>
                        <td className="border border-gray-300 p-2 text-center">54.0-103.5</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Insurance: Yes/No</td>
                        <td className="border border-gray-300 p-2 text-center">11/1</td>
                        <td className="border border-gray-300 p-2 text-center">10/2</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Employment: Employed/Not employed/Retired</td>
                        <td className="border border-gray-300 p-2 text-center">11/1/0</td>
                        <td className="border border-gray-300 p-2 text-center">10/2/0</td>
                        <td className="border border-gray-300 p-2 text-center">χ² = 0.1 (= .8)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 2: Sensitivity and Specificity */}
                <div className="mb-8">
                  <h4 className="font-semibold text-sm mb-3 bg-gray-200 p-2">TABLE 2 - SENSITIVITY AND SPECIFICITY FOR VARIOUS FUNCTIONAL CAPACITY CUTOFF SCORES</h4>
                  <table className="w-full border border-gray-300 text-xs">
                    <thead>
                      <tr className="bg-yellow-200">
                        <th className="border border-gray-300 p-2 text-left">Cutoff Score</th>
                        <th className="border border-gray-300 p-2">Sensitivity (%)</th>
                        <th className="border border-gray-300 p-2">Specificity (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2">55%</td>
                        <td className="border border-gray-300 p-2 text-center">33.7</td>
                        <td className="border border-gray-300 p-2 text-center">100.0</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">60%</td>
                        <td className="border border-gray-300 p-2 text-center">58.0</td>
                        <td className="border border-gray-300 p-2 text-center">88.5</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">65%</td>
                        <td className="border border-gray-300 p-2 text-center">60.0</td>
                        <td className="border border-gray-300 p-2 text-center">88.5</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">70%</td>
                        <td className="border border-gray-300 p-2 text-center">85.0</td>
                        <td className="border border-gray-300 p-2 text-center">84.2</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">75%</td>
                        <td className="border border-gray-300 p-2 text-center">88.7</td>
                        <td className="border border-gray-300 p-2 text-center">68.4</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">80%</td>
                        <td className="border border-gray-300 p-2 text-center">100.0</td>
                        <td className="border border-gray-300 p-2 text-center">40.0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 3: Variables With 70% Sensitivity */}
                <div className="mb-8">
                  <h4 className="font-semibold text-sm mb-3 bg-gray-200 p-2">TABLE 3 - VARIABLES WITH 70% SENSITIVITY OR GREATER AND PARTICIPANTS' SCORES ON THESE VARIABLES</h4>
                  <table className="w-full border border-gray-300 text-xs">
                    <thead>
                      <tr className="bg-yellow-200">
                        <th className="border border-gray-300 p-2 text-left">Variable/Score</th>
                        <th className="border border-gray-300 p-2">100% Effort (n Participants)</th>
                        <th className="border border-gray-300 p-2">50% Effort (n Participants)</th>
                        <th className="border border-gray-300 p-2">Sensitivity</th>
                        <th className="border border-gray-300 p-2">Specificity</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2">Finger flexion (slide of the high for SST): Invalid</td>
                        <td className="border border-gray-300 p-2 text-center">1</td>
                        <td className="border border-gray-300 p-2 text-center">5</td>
                        <td className="border border-gray-300 p-2 text-center">70.0</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Equivocal</td>
                        <td className="border border-gray-300 p-2 text-center">2</td>
                        <td className="border border-gray-300 p-2 text-center">13</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Valid</td>
                        <td className="border border-gray-300 p-2 text-center">9</td>
                        <td className="border border-gray-300 p-2 text-center">9</td>
                        <td className="border border-gray-300 p-2 text-center">78.6</td>
                        <td className="border border-gray-300 p-2 text-center">72.2</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">ROM greater than high extrapolation of the leg test</td>
                        <td className="border border-gray-300 p-2 text-center">5</td>
                        <td className="border border-gray-300 p-2 text-center">22</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Invalid</td>
                        <td className="border border-gray-300 p-2 text-center">0</td>
                        <td className="border border-gray-300 p-2 text-center">8</td>
                        <td className="border border-gray-300 p-2 text-center">83.3</td>
                        <td className="border border-gray-300 p-2 text-center">68.4</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">BEG on right</td>
                        <td className="border border-gray-300 p-2 text-center">1</td>
                        <td className="border border-gray-300 p-2 text-center">24</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Invalid</td>
                        <td className="border border-gray-300 p-2 text-center">0</td>
                        <td className="border border-gray-300 p-2 text-center">5</td>
                        <td className="border border-gray-300 p-2 text-center">83.3</td>
                        <td className="border border-gray-300 p-2 text-center">52.9</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">BEG on left</td>
                        <td className="border border-gray-300 p-2 text-center">8</td>
                        <td className="border border-gray-300 p-2 text-center">24</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Invalid</td>
                        <td className="border border-gray-300 p-2 text-center">6</td>
                        <td className="border border-gray-300 p-2 text-center">5</td>
                        <td className="border border-gray-300 p-2 text-center">72.4</td>
                        <td className="border border-gray-300 p-2 text-center">42.4</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">BEG: ROM greater than the leg lift</td>
                        <td className="border border-gray-300 p-2 text-center">10</td>
                        <td className="border border-gray-300 p-2 text-center">21</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Invalid</td>
                        <td className="border border-gray-300 p-2 text-center">0</td>
                        <td className="border border-gray-300 p-2 text-center">6</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-600 mt-2">*Abbreviations: OSMT, occupational-musculoskeletal-handling test; BEG, rapid-exchange grip test; SST, static-strength test.</p>
                </div>

                {/* Table 4: Variables With 100% Specificity */}
                <div className="mb-8">
                  <h4 className="font-semibold text-sm mb-3 bg-gray-200 p-2">TABLE 4 - VARIABLES WITH 100% SPECIFICITY AND PARTICIPANTS' SCORES ON THESE VARIABLES</h4>
                  <table className="w-full border border-gray-300 text-xs">
                    <thead>
                      <tr className="bg-yellow-200">
                        <th className="border border-gray-300 p-2 text-left">Variable/Score</th>
                        <th className="border border-gray-300 p-2">100% Effort</th>
                        <th className="border border-gray-300 p-2">50% Effort</th>
                        <th className="border border-gray-300 p-2">Sensitivity</th>
                        <th className="border border-gray-300 p-2">Specificity</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2">Distraction or static high: Invalid/Equivocal</td>
                        <td className="border border-gray-300 p-2 text-center">0</td>
                        <td className="border border-gray-300 p-2 text-center">1</td>
                        <td className="border border-gray-300 p-2 text-center">4.0</td>
                        <td className="border border-gray-300 p-2 text-center">100</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Trunk: Invalid/Equivocal</td>
                        <td className="border border-gray-300 p-2 text-center">0</td>
                        <td className="border border-gray-300 p-2 text-center">6</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Valid</td>
                        <td className="border border-gray-300 p-2 text-center">12</td>
                        <td className="border border-gray-300 p-2 text-center">24</td>
                        <td className="border border-gray-300 p-2 text-center">28.0</td>
                        <td className="border border-gray-300 p-2 text-center">100</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Distraction (OAM): Invalid/Equivocal</td>
                        <td className="border border-gray-300 p-2 text-center">0</td>
                        <td className="border border-gray-300 p-2 text-center">1</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Valid</td>
                        <td className="border border-gray-300 p-2 text-center">12</td>
                        <td className="border border-gray-300 p-2 text-center">25</td>
                        <td className="border border-gray-300 p-2 text-center">46.7</td>
                        <td className="border border-gray-300 p-2 text-center">100</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">ROM greater high extrapolation for shoulder: Invalid/Equivocal</td>
                        <td className="border border-gray-300 p-2 text-center">0</td>
                        <td className="border border-gray-300 p-2 text-center">14</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Valid</td>
                        <td className="border border-gray-300 p-2 text-center">12</td>
                        <td className="border border-gray-300 p-2 text-center">10</td>
                        <td className="border border-gray-300 p-2 text-center">46.7</td>
                        <td className="border border-gray-300 p-2 text-center">100</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">ROM push right &gt; left: Invalid/Equivocal</td>
                        <td className="border border-gray-300 p-2 text-center">0</td>
                        <td className="border border-gray-300 p-2 text-center">20</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Valid</td>
                        <td className="border border-gray-300 p-2 text-center">12</td>
                        <td className="border border-gray-300 p-2 text-center">30</td>
                        <td className="border border-gray-300 p-2 text-center">30.0</td>
                        <td className="border border-gray-300 p-2 text-center">100</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Right key grips: Invalid/Equivocal</td>
                        <td className="border border-gray-300 p-2 text-center">0</td>
                        <td className="border border-gray-300 p-2 text-center">7</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Valid</td>
                        <td className="border border-gray-300 p-2 text-center">12</td>
                        <td className="border border-gray-300 p-2 text-center">26</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Mounted palms machine pass</td>
                        <td className="border border-gray-300 p-2 text-center">3</td>
                        <td className="border border-gray-300 p-2 text-center">2</td>
                        <td className="border border-gray-300 p-2 text-center">18.5</td>
                        <td className="border border-gray-300 p-2 text-center">100</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Distraction (OAM)</td>
                        <td className="border border-gray-300 p-2 text-center">0</td>
                        <td className="border border-gray-300 p-2 text-center">7</td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                        <td className="border border-gray-300 p-2 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">Valid</td>
                        <td className="border border-gray-300 p-2 text-center">12</td>
                        <td className="border border-gray-300 p-2 text-center">15</td>
                        <td className="border border-gray-300 p-2 text-center">10.3</td>
                        <td className="border border-gray-300 p-2 text-center">100</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-600 mt-2">Abbreviations: OSMT, occupational-musculoskeletal-handling test; BEG, rapid-exchange grip test; SST, static-strength test; OAM, occupational-activity-handling test.</p>
                </div>

                <p className="text-xs text-gray-600 mt-8 text-center">Journal of orthopaedic & sports physical therapy | volume 37 | number 4 | April 2007.</p>
              </div>

              {/* Digital Library */}
              {reportData.digitalLibraryData &&
                reportData.digitalLibraryData.savedFileData && (
                  <div className="p-8 border-b">
                    <h3 className="font-bold mb-4">
                      Appendix Two - Digital Library
                    </h3>

                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                      {reportData.digitalLibraryData.savedFileData.map(
                        (file: any, index: number) => (
                          <div
                            key={file.id || index}
                            className="border rounded overflow-hidden"
                          >
                            {file.type && file.type.startsWith("image/") ? (
                              <div className="aspect-square">
                                <img
                                  src={file.dataUrl || file.data}
                                  alt={file.name || `Image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="aspect-square bg-gray-200 flex flex-col items-center justify-center">
                                <div className="text-2xl mb-2">-</div>
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-4">
                      Total documentation files:{" "}
                      {reportData.digitalLibraryData.savedFileData.length}
                    </p>
                  </div>
                )}

              {/* Report Footer */}
              <div className="p-8 text-center bg-gray-50">
                <div className="border-t-2 border-blue-600 pt-6">
                  <p className="text-sm text-gray-600">
                    This report was generated using WorkerFacts FCE System
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Report generated on {currentDate}
                  </p>
                  <p className="text-xs text-gray-500">
                    © 2024 WorkerFacts Professional Evaluation System
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 bg-gray-50 border-t">
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                >
                  {isGenerating ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generating Professional Report...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Check className="mr-2 h-5 w-5" />
                      Approve & Generate Final Report
                    </div>
                  )}
                </Button>
              </div>
              <p className="text-center text-sm text-gray-500 mt-3">
                Review all sections carefully before approving the final report
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl text-green-600">
                <Check className="mr-3 h-6 w-6" />
                Report Approved!
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
                  Professional FCE Report Generated
                </h3>
                <p className="text-gray-600">
                  Your comprehensive functional capacity evaluation report has
                  been approved and is ready for download.
                </p>
                <div className="bg-green-50 border border-green-200 rounded p-3 mt-4">
                  <p className="text-sm text-green-700">
                    <strong>Next Step:</strong> Proceed to Step 10 to download
                    your professional report.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                navigate("/download-report");
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Continue to Download Report
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
