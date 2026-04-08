import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mtmDescriptions } from "./mtm-descriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Minus, Upload, X, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calculateStandardTime,
  calculatePercentISByTest,
} from "@shared/mtm-standards";

interface TrialData {
  trial: number;
  side?: string;
  plane?: string;
  position?: string;
  weight?: { value: number; unit: string };
  distance?: { value: number; unit: string };
  time?: { value: number; unit: string };
  reps?: number;
  percentIS?: number;
  valueToBeTestedNumber?: number;
  valueToBeTestedUnit?: string;
  [key: string]: any;
}

interface TestParameter {
  id: string;
  label: string;
  type: "dropdown" | "number" | "valueWithUnit" | "dropdownWithManual";
  options?: string[];
  unitOptions?: string[];
  required?: boolean;
}

interface FlexibleOccupationalTestProps {
  testName: string;
  testType: string;
  parameters: TestParameter[];
  minTrials?: number;
  maxTrials?: number;
  defaultTrials?: number;
  onSave: (data: any) => void;
  onBack: () => void;
  existingData?: any;
  showBackButton?: boolean;
}

export default function FlexibleOccupationalTest({
  testName,
  testType,
  parameters,
  minTrials = 1,
  maxTrials = 12,
  defaultTrials = 6,
  onSave,
  onBack,
  existingData,
  showBackButton = true,
}: FlexibleOccupationalTestProps) {
  const [trials, setTrials] = useState<TrialData[]>([]);
  const [numberOfTrials, setNumberOfTrials] = useState(defaultTrials);
  const [hrPre, setHrPre] = useState<number>(0);
  const [hrPost, setHrPost] = useState<number>(0);
  const [currentTrialInput, setCurrentTrialInput] = useState<TrialData>(
    {} as TrialData,
  );
  const [standardTime, setStandardTime] = useState<number>(0);
  const [savedImageData, setSavedImageData] = useState<
    Array<{
      name: string;
      type: string;
      dataUrl: string;
    }>
  >([]);

  // Custom alert dialog state
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Image upload loading state
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Custom alert function to replace browser alert
  const showCustomAlert = (message: string) => {
    setAlertMessage(message);
    setShowAlertDialog(true);
  };

  // Initialize current trial input when component loads and load existing data
  useEffect(() => {
    const initialTrialData: TrialData = { trial: 1 };
    parameters.forEach((param) => {
      if (param.type === "valueWithUnit") {
        initialTrialData[param.id] = {
          value: 0,
          unit: param.unitOptions?.[0] || "",
        };
      } else if (param.type === "number") {
        initialTrialData[param.id] = 0;
      } else if (param.type === "dropdown") {
        initialTrialData[param.id] = param.options?.[0] || "";
      } else if (param.type === "dropdownWithManual") {
        if (param.id === "weight") {
          initialTrialData.weight = { value: 0, unit: "lbs" };
          initialTrialData.plane = "";
        }
        if (param.id === "position") {
          initialTrialData.position = param.options?.[0] || "";
          initialTrialData.distance = { value: 0, unit: "m" };
        }
      }
    });
    // Ensure common fields exist regardless of config
    if (initialTrialData.weight === undefined) {
      initialTrialData.weight = { value: 0, unit: "lbs" } as any;
    }
    if (initialTrialData.plane === undefined) {
      initialTrialData.plane = "" as any;
    }
    if (initialTrialData.position === undefined) {
      initialTrialData.position = "STANDING" as any;
    }
    if (initialTrialData.distance === undefined) {
      initialTrialData.distance = { value: 0, unit: "m" } as any;
    }
    setCurrentTrialInput(initialTrialData);

    // Load existing data if available
    if (existingData) {
      if (existingData.trials) {
        setTrials(existingData.trials);
      }
      if (existingData.numberOfTrials) {
        setNumberOfTrials(existingData.numberOfTrials);
      }
      if (existingData.hrPre) {
        setHrPre(existingData.hrPre);
      }
      if (existingData.hrPost) {
        setHrPost(existingData.hrPost);
      }
      if (existingData.savedImageData) {
        setSavedImageData(existingData.savedImageData);
      }
    }
  }, [parameters, existingData]);

  // Calculate standard time when parameters change
  useEffect(() => {
    // Extract weight and distance from current trial input for calculation
    const weight = currentTrialInput.weight?.value || 0;
    const distance = currentTrialInput.distance?.value || 0;
    const reps = currentTrialInput.reps || 1;

    const calcStandardTime = calculateStandardTime(testType, {
      weight: weight,
      distance: distance,
      reps: reps,
      difficulty: "medium",
    });
    setStandardTime(calcStandardTime);
  }, [
    testType,
    currentTrialInput.weight,
    currentTrialInput.distance,
    currentTrialInput.reps,
  ]);

  // Auto-calculate %IS when time changes
  useEffect(() => {
    const timeValue = currentTrialInput.time?.value || 0;
    if (timeValue > 0) {
      const calculatedPercentIS = calculatePercentISByTest(
        testType,
        timeValue,
        {
          steps: (currentTrialInput as any).steps || undefined,
          rungs: (currentTrialInput as any).rungs || undefined,
          weight: (currentTrialInput as any).weight?.value || undefined,
          position: (currentTrialInput as any).position || undefined,
        },
      );
      setCurrentTrialInput((prev) => ({
        ...prev,
        percentIS: calculatedPercentIS,
      }));
    } else {
      setCurrentTrialInput((prev) => ({
        ...prev,
        percentIS: 0,
      }));
    }
  }, [
    currentTrialInput.time,
    testType,
    currentTrialInput.steps,
    currentTrialInput.rungs,
    currentTrialInput.weight,
    currentTrialInput.position,
  ]);

  // Initialize trial data structure
  const initializeTrialData = (): TrialData => {
    const trial: TrialData = { trial: trials.length + 1 };

    parameters.forEach((param) => {
      if (param.type === "valueWithUnit") {
        trial[param.id] = { value: 0, unit: param.unitOptions?.[0] || "" };
      } else if (param.type === "number") {
        trial[param.id] = 0;
      } else if (param.type === "dropdown") {
        trial[param.id] = param.options?.[0] || "";
      } else if (param.type === "dropdownWithManual") {
        if (param.id === "weight") {
          trial.weight = { value: 0, unit: "lbs" };
          trial.plane = "";
        }
        if (param.id === "position") {
          trial.position = param.options?.[0] || "";
          trial.distance = { value: 0, unit: "m" };
        }
      }
    });

    // Ensure common fields exist
    if (trial.weight === undefined) {
      trial.weight = { value: 0, unit: "lbs" } as any;
    }
    if (trial.plane === undefined) {
      trial.plane = "" as any;
    }
    if (trial.position === undefined) {
      trial.position = "STANDING" as any;
    }
    if (trial.distance === undefined) {
      trial.distance = { value: 0, unit: "m" } as any;
    }
    return trial;
  };

  const addTrial = () => {
    if (trials.length < numberOfTrials) {
      const newTrial = { ...currentTrialInput, trial: trials.length + 1 };
      setTrials((prev) => [...prev, newTrial]);
      setCurrentTrialInput(initializeTrialData());
    }
  };

  const removeTrial = () => {
    if (trials.length > 0) {
      setTrials((prev) => prev.slice(0, -1));
    }
  };

  const updateTrialData = (trialIndex: number, field: string, value: any) => {
    setTrials((prev) =>
      prev.map((trial, index) =>
        index === trialIndex ? { ...trial, [field]: value } : trial,
      ),
    );
  };

  const updateTrialValueWithUnit = (
    trialIndex: number,
    field: string,
    valueOrUnit: string,
    isUnit = false,
  ) => {
    setTrials((prev) =>
      prev.map((trial, index) =>
        index === trialIndex
          ? {
              ...trial,
              [field]: {
                ...trial[field],
                [isUnit ? "unit" : "value"]: isUnit
                  ? valueOrUnit
                  : parseFloat(valueOrUnit) || 0,
              },
            }
          : trial,
      ),
    );
  };

  const updateCurrentTrialInput = (field: string, value: any) => {
    setCurrentTrialInput((prev) => ({ ...prev, [field]: value }));
  };

  const updateCurrentTrialValueWithUnit = (
    field: string,
    valueOrUnit: string,
    isUnit = false,
  ) => {
    setCurrentTrialInput((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [isUnit ? "unit" : "value"]: isUnit
          ? valueOrUnit
          : parseFloat(valueOrUnit) || 0,
      },
    }));
  };

  const calculateAverage = (field: string) => {
    if (trials.length === 0) return 0;

    const validValues = trials
      .map((trial) => {
        const fieldValue = trial[field];
        if (typeof fieldValue === "object" && fieldValue?.value !== undefined) {
          return fieldValue.value;
        }
        return typeof fieldValue === "number" ? fieldValue : 0;
      })
      .filter((val) => val > 0);

    if (validValues.length === 0) return 0;
    return (
      validValues.reduce((sum, val) => sum + val, 0) / validValues.length
    ).toFixed(2);
  };

  const calculateTotalTimeSetCompleted = () => {
    if (trials.length === 0) return 0;
    // Calculate total time set completed - sum of all trial times or similar logic
    const totalTime = trials.reduce((sum, trial) => {
      const timeValue = trial.time;
      if (typeof timeValue === "object" && timeValue.value) {
        return sum + timeValue.value;
      }
      return sum + (typeof timeValue === "number" ? timeValue : 0);
    }, 0);
    return totalTime.toFixed(1);
  };

  const calculateTotalIS = () => {
    if (trials.length === 0) return 0;
    const totalIS = trials.reduce((sum, trial) => {
      return sum + (trial.percentIS || 0);
    }, 0);
    return (totalIS / trials.length).toFixed(1);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploadingImages(true);

    try {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      const validFiles = imageFiles.filter(
        (file) => file.size <= 10 * 1024 * 1024,
      );

      const remainingSlots = Math.max(0, 5 - savedImageData.length);
      const filesToAdd = validFiles.slice(0, remainingSlots);

      const existingNames = new Set(savedImageData.map((f) => f.name));
      const uniqueFilesToAdd = filesToAdd.filter(
        (file) => !existingNames.has(file.name),
      );

      const messages: string[] = [];
      if (imageFiles.length !== files.length) {
        messages.push(
          `${files.length - imageFiles.length} non-image file(s) were skipped`,
        );
      }
      if (validFiles.length !== imageFiles.length) {
        messages.push(
          `${imageFiles.length - validFiles.length} file(s) exceed 10MB limit and were skipped`,
        );
      }
      if (filesToAdd.length !== validFiles.length) {
        messages.push(
          `${validFiles.length - filesToAdd.length} file(s) skipped due to 5 image limit`,
        );
      }
      if (uniqueFilesToAdd.length !== filesToAdd.length) {
        messages.push(
          `${filesToAdd.length - uniqueFilesToAdd.length} duplicate file(s) were skipped`,
        );
      }

      if (messages.length > 0) {
        const finalMessage = `Upload completed with warnings:\n• ${messages.join("\n• ")}`;
        showCustomAlert(finalMessage);
      }

      if (uniqueFilesToAdd.length > 0) {
        const newImageDataPromises = uniqueFilesToAdd.map(
          (file) =>
            new Promise<{ name: string; type: string; dataUrl: string }>(
              (resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  resolve({
                    name: file.name,
                    type: file.type,
                    dataUrl: e.target?.result as string,
                  });
                };
                reader.onerror = () =>
                  reject(new Error(`Failed to read file: ${file.name}`));
                reader.readAsDataURL(file);
              },
            ),
        );
        const newImageData = await Promise.all(newImageDataPromises);
        setSavedImageData((prev) => [...prev, ...newImageData].slice(0, 5));
      }
    } catch (error) {
      console.error("Error handling image upload:", error);
      showCustomAlert("Error processing images. Please try again.");
    } finally {
      setIsUploadingImages(false);
      event.target.value = "";
    }
  };

  const removeSavedImage = (imageIndex: number) => {
    setSavedImageData((prev) => prev.filter((_, i) => i !== imageIndex));
  };

  // Auto-save MTM data when trials or images change (debounced)
  useEffect(() => {
    const handler = setTimeout(async () => {
      try {
        const testData: any = {
          testType,
          testName,
          trials,
          numberOfTrials,
          hrPre,
          hrPost,
          averages: {},
          savedImageData,
          completedAt: new Date().toISOString(),
        };
        parameters.forEach((param) => {
          if (param.type === "number" || param.type === "valueWithUnit") {
            testData.averages[param.id] = calculateAverage(param.id);
          }
        });
        await onSave(testData);
      } catch (e) {
        console.error("Auto-save error:", e);
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [
    trials,
    numberOfTrials,
    hrPre,
    hrPost,
    savedImageData,
    parameters,
    onSave,
    testName,
    testType,
  ]);

  const renderCurrentTrialInput = (param: TestParameter) => {
    switch (param.type) {
      case "dropdown":
        return (
          <Select
            value={currentTrialInput[param.id] || ""}
            onValueChange={(value) => updateCurrentTrialInput(param.id, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${param.label}`} />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "dropdownWithManual":
        if (param.id === "weight") {
          const planeOptions = (param.options || []).filter((o) =>
            /IMMEDIATE|FRONT|SIDE|ACROSS|OVERHEAD|Immediate|Front|Side|Across|Overhead/i.test(
              o,
            ),
          );
          const weightField = currentTrialInput.weight || {
            value: 0,
            unit: "lbs",
          };
          const plane = currentTrialInput.plane || "";
          const weightEntered = (weightField.value || 0) > 0;
          const planeSelected = !!plane && plane !== "";
          return (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Plane
                  </label>
                  <Select
                    value={plane}
                    onValueChange={(value) => {
                      updateCurrentTrialInput("plane", value);
                    }}
                  >
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Select Plane" />
                    </SelectTrigger>
                    <SelectContent>
                      {planeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Weight
                  </label>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="number"
                      value={weightField.value || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateCurrentTrialInput("weight", {
                          value: val,
                          unit: weightField.unit || "lbs",
                        });
                      }}
                      className="w-full h-12 text-base"
                      placeholder="Enter weight"
                    />
                    <Select
                      value={weightField.unit || "lbs"}
                      onValueChange={(value) =>
                        updateCurrentTrialInput("weight", {
                          value: weightField.value || 0,
                          unit: value,
                        })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["lbs", "kg", "N"].map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Enter Plane and/or Weight as applicable.
              </p>
            </div>
          );
        }
        if (param.id === "position") {
          const postureOptions = param.options || [];
          const distanceField = currentTrialInput.distance || {
            value: 0,
            unit: "m",
          };
          return (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Posture
                  </label>
                  <Select
                    value={
                      currentTrialInput.position || postureOptions[0] || ""
                    }
                    onValueChange={(value) =>
                      updateCurrentTrialInput("position", value)
                    }
                  >
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Select Posture" />
                    </SelectTrigger>
                    <SelectContent>
                      {postureOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Distance
                  </label>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="number"
                      value={distanceField.value || ""}
                      onChange={(e) =>
                        updateCurrentTrialInput("distance", {
                          value: parseFloat(e.target.value) || 0,
                          unit: distanceField.unit || "m",
                        })
                      }
                      className="w-full h-12 text-base"
                      placeholder="Enter distance"
                    />
                    <Select
                      value={distanceField.unit || "m"}
                      onValueChange={(value) =>
                        updateCurrentTrialInput("distance", {
                          value: distanceField.value || 0,
                          unit: value,
                        })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["ft", "m", "km", "cm"].map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;

      case "number":
        // Special handling for %IS - make it read-only and auto-calculated
        if (param.id === "percentIS") {
          return (
            <div className="space-y-2">
              <Input
                type="number"
                value={
                  currentTrialInput[param.id] > 0
                    ? currentTrialInput[param.id].toFixed(1)
                    : ""
                }
                className="w-full bg-gray-100"
                placeholder=""
                readOnly
                title="Automatically calculated from MTM Norm Schedule tables (interpolated between listed times)"
              />
              <div className="text-xs text-gray-600">
                Standard Time: {standardTime.toFixed(1)}s
              </div>
            </div>
          );
        }

        // Special handling for reps - integer only
        if (param.id === "reps") {
          return (
            <Input
              type="number"
              value={currentTrialInput[param.id] || ""}
              onChange={(e) =>
                updateCurrentTrialInput(param.id, parseInt(e.target.value) || 0)
              }
              className="w-full"
              placeholder=""
              min="1"
              step="1"
            />
          );
        }

        return (
          <Input
            type="number"
            value={currentTrialInput[param.id] || ""}
            onChange={(e) =>
              updateCurrentTrialInput(param.id, parseFloat(e.target.value) || 0)
            }
            className="w-full"
            placeholder=""
            step="0.1"
          />
        );

      case "valueWithUnit":
        const fieldValue = currentTrialInput[param.id] || {
          value: 0,
          unit: param.unitOptions?.[0] || "",
        };
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={fieldValue.value || ""}
              onChange={(e) =>
                updateCurrentTrialValueWithUnit(param.id, e.target.value)
              }
              className="flex-1"
              placeholder=""
              step="0.1"
            />
            <Select
              value={fieldValue.unit || ""}
              onValueChange={(value) =>
                updateCurrentTrialValueWithUnit(param.id, value, true)
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {param.unitOptions?.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  const renderParameterInput = (
    param: TestParameter,
    trial: TrialData,
    trialIndex: number,
  ) => {
    switch (param.type) {
      case "dropdown":
        return (
          <Select
            value={trial[param.id] || ""}
            onValueChange={(value) =>
              updateTrialData(trialIndex, param.id, value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${param.label}`} />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "number":
        // Special handling for reps - integer only
        if (param.id === "reps") {
          return (
            <Input
              type="number"
              value={trial[param.id] || ""}
              onChange={(e) =>
                updateTrialData(
                  trialIndex,
                  param.id,
                  parseInt(e.target.value) || 0,
                )
              }
              className="w-full"
              placeholder=""
              min="1"
              step="1"
            />
          );
        }

        return (
          <Input
            type="number"
            value={trial[param.id] || ""}
            onChange={(e) =>
              updateTrialData(
                trialIndex,
                param.id,
                parseFloat(e.target.value) || 0,
              )
            }
            className="w-full"
            placeholder=""
            step="0.1"
          />
        );

      case "valueWithUnit":
        const fieldValue = trial[param.id] || {
          value: 0,
          unit: param.unitOptions?.[0] || "",
        };
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={fieldValue.value || ""}
              onChange={(e) =>
                updateTrialValueWithUnit(trialIndex, param.id, e.target.value)
              }
              className="flex-1"
              placeholder=""
              step="0.1"
            />
            <Select
              value={fieldValue.unit || ""}
              onValueChange={(value) =>
                updateTrialValueWithUnit(trialIndex, param.id, value, true)
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {param.unitOptions?.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          {showBackButton && (
            <Button variant="outline" onClick={onBack} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tests
            </Button>
          )}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              OCCUPATIONAL TASKS
            </h1>
            <h2 className="text-xl font-semibold text-blue-700 mb-2">
              USING METHODS TIME MEASUREMENT ANALYSIS (MTM)
            </h2>
            <div className="inline-block border-2 border-gray-400 px-4 py-2 bg-gray-100">
              <span className="font-bold">TEST TYPE: </span>
              <span className="font-bold text-blue-800">
                {testName.toUpperCase()}
              </span>
            </div>
            {mtmDescriptions[testType] && (
              <div className="mt-3 text-sm text-gray-800 p-4 rounded-lg bg-gradient-to-r from-purple-50 via-blue-50 to-teal-50 border shadow-sm whitespace-pre-line text-justify">
                <p className="mt-1">{mtmDescriptions[testType]}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Data Table */}
          <div className="lg:col-span-3">
            {/* Trial Count Controller */}
            <Card className="shadow-lg mb-4">
              <CardHeader className="bg-purple-600 text-white">
                <CardTitle className="text-center">
                  Test Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-4">
                  <label className="font-semibold">Number of Trials:</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNumberOfTrials(
                          Math.max(minTrials, numberOfTrials - 1),
                        )
                      }
                      disabled={numberOfTrials <= minTrials}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-bold">
                      {numberOfTrials}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNumberOfTrials(
                          Math.min(maxTrials, numberOfTrials + 1),
                        )
                      }
                      disabled={numberOfTrials >= maxTrials}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-gray-600">
                    ({minTrials}-{maxTrials} trials)
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    {/* Header Row */}
                    <thead>
                      <tr className="bg-yellow-300 border border-black">
                        <th className="border border-black px-3 py-2 text-center font-bold">
                          Trial:
                        </th>
                        <th className="border border-black px-3 py-2 text-center font-bold">
                          {testType === "push-pull-cart" ? "Action:" : "Side:"}
                        </th>
                        <th className="border border-black px-3 py-2 text-center font-bold">
                          Weight/Plane:
                        </th>
                        <th className="border border-black px-3 py-2 text-center font-bold">
                          Distance/
                          <br />
                          Posture:
                        </th>
                        <th className="border border-black px-3 py-2 text-center font-bold">
                          Reps:
                        </th>
                        <th className="border border-black px-3 py-2 text-center font-bold">
                          Time
                          <br />
                          (sec)
                        </th>
                        <th className="border border-black px-3 py-2 text-center font-bold">
                          %IS
                        </th>
                        <th className="border border-black px-3 py-2 text-center font-bold">
                          Time Set
                          <br />
                          Completed
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Trial data rows */}
                      {Array.from({ length: numberOfTrials }, (_, index) => {
                        const trial = trials[index];
                        const trialNumber = index + 1;

                        return (
                          <tr key={trialNumber} className="bg-white">
                            <td className="border border-black px-3 py-2 text-center font-semibold">
                              {trialNumber}
                            </td>
                            <td className="border border-black px-3 py-2 text-center">
                              {testType === "push-pull-cart"
                                ? trial?.action || ""
                                : trial?.side || ""}
                            </td>
                            <td className="border border-black px-3 py-2 text-center">
                              {(() => {
                                const w = trial?.weight;
                                if (w && typeof w === "object" && w.value) {
                                  return `${w.value} ${w.unit || ""}`;
                                }
                                const wStr = typeof w === "string" ? w : "";
                                if (wStr) return wStr;
                                return trial?.plane || "";
                              })()}
                            </td>
                            <td className="border border-black px-3 py-2 text-center">
                              {(() => {
                                const d = trial?.distance;
                                if (d && typeof d === "object" && d.value) {
                                  return `${d.value} ${d.unit || ""}`;
                                }
                                return trial?.position || "";
                              })()}
                            </td>
                            <td className="border border-black px-3 py-2 text-center">
                              {trial?.reps || ""}
                            </td>
                            <td className="border border-black px-3 py-2 text-center">
                              {trial?.time
                                ? typeof trial.time === "object"
                                  ? trial.time.value
                                  : typeof trial.time === "number"
                                    ? trial.time.toFixed(1)
                                    : trial.time
                                : ""}
                            </td>
                            <td className="border border-black px-3 py-2 text-center">
                              {trial?.percentIS && trial.percentIS > 0
                                ? trial.percentIS.toFixed(1)
                                : ""}
                            </td>
                            <td className="border border-black px-3 py-2 text-center">
                              {/* Time Set Completed - can be calculated or entered */}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Average row */}
                      <tr className="bg-gray-100">
                        <td className="border border-black px-3 py-2 text-left font-bold">
                          Avg.
                        </td>
                        <td className="border border-black px-3 py-2 text-center"></td>
                        <td className="border border-black px-3 py-2 text-center"></td>
                        <td className="border border-black px-3 py-2 text-center"></td>
                        <td className="border border-black px-3 py-2 text-center font-bold">
                          {trials.length > 0
                            ? Math.round(parseFloat(calculateAverage("reps")))
                            : ""}
                        </td>
                        <td className="border border-black px-3 py-2 text-center font-bold">
                          {trials.length > 0 ? calculateAverage("time") : ""}
                        </td>
                        <td className="border border-black px-3 py-2 text-center font-bold">
                          {trials.length > 0
                            ? calculateAverage("percentIS")
                            : ""}
                        </td>
                        <td className="border border-black px-3 py-2 text-center font-bold">
                          {trials.length > 0
                            ? calculateTotalTimeSetCompleted()
                            : ""}
                        </td>
                      </tr>
                      {/* Total IS% row */}
                      <tr className="bg-blue-100 border-t-2 border-blue-500">
                        <td className="border border-black px-3 py-2 text-left font-bold text-blue-800">
                          Total IS%
                        </td>
                        <td className="border border-black px-3 py-2 text-center"></td>
                        <td className="border border-black px-3 py-2 text-center"></td>
                        <td className="border border-black px-3 py-2 text-center"></td>
                        <td className="border border-black px-3 py-2 text-center"></td>
                        <td className="border border-black px-3 py-2 text-center"></td>
                        <td className="border border-black px-3 py-2 text-center font-bold text-blue-800 text-lg">
                          {trials.length > 0 ? calculateTotalIS() + "%" : ""}
                        </td>
                        <td className="border border-black px-3 py-2 text-center"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Heart Rate Section */}
            <Card className="mt-4 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-8">
                  <div className="flex items-center gap-4">
                    <label className="text-lg font-semibold w-20">HR PRE</label>
                    <Input
                      type="number"
                      value={hrPre || ""}
                      onChange={(e) => setHrPre(parseInt(e.target.value) || 0)}
                      className="w-24 h-12 text-center border-2 border-gray-400 text-lg"
                      placeholder=""
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-lg font-semibold w-20">
                      HR POST
                    </label>
                    <Input
                      type="number"
                      value={hrPost || ""}
                      onChange={(e) => setHrPost(parseInt(e.target.value) || 0)}
                      className="w-24 h-12 text-center border-2 border-gray-400 text-lg"
                      placeholder=""
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Entry Panel */}
          <div className="space-y-6">
            {/* Current Trial Entry */}
            <Card className="shadow-lg">
              <CardHeader className="bg-green-600 text-white">
                <CardTitle className="text-center">Data Entry</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Current Trial:</span>
                    <span className="font-bold">
                      {trials.length + 1} of {numberOfTrials}
                    </span>
                  </div>

                  {/* Standardized Weight/Plane section */}
                  {(() => {
                    const planeOptions = [
                      "IMMEDIATE",
                      "FRONT",
                      "SIDE",
                      "ACROSS",
                      "OVERHEAD",
                    ];
                    const weightField = currentTrialInput.weight || {
                      value: 0,
                      unit: "lbs",
                    };
                    const plane = currentTrialInput.plane || "";
                    return (
                      <div className="space-y-3">
                        <label className="text-sm font-medium mb-1 block">
                          Weight/Plane:
                        </label>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Plane
                            </label>
                            <Select
                              value={plane}
                              onValueChange={(value) =>
                                updateCurrentTrialInput("plane", value)
                              }
                            >
                              <SelectTrigger className="w-full h-12">
                                <SelectValue placeholder="Select Plane" />
                              </SelectTrigger>
                              <SelectContent>
                                {planeOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Weight
                            </label>
                            <div className="flex flex-col gap-2">
                              <Input
                                type="number"
                                value={weightField.value || ""}
                                onChange={(e) =>
                                  updateCurrentTrialInput("weight", {
                                    value: parseFloat(e.target.value) || 0,
                                    unit: weightField.unit || "lbs",
                                  })
                                }
                                className="w-full h-12 text-base"
                                placeholder="Enter weight"
                              />
                              <Select
                                value={weightField.unit || "lbs"}
                                onValueChange={(value) =>
                                  updateCurrentTrialInput("weight", {
                                    value: weightField.value || 0,
                                    unit: value,
                                  })
                                }
                              >
                                <SelectTrigger className="w-full h-12">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {["lbs", "kg", "N"].map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {unit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Standardized Distance/Posture section */}
                  {(() => {
                    const postureOptions = [
                      "SITTING",
                      "STANDING",
                      "WALKING",
                      "CLIMBING",
                      "CRAWLING",
                      "KNEELING",
                      "SQUATTING",
                    ];
                    const distanceField = currentTrialInput.distance || {
                      value: 0,
                      unit: "m",
                    };
                    return (
                      <div className="space-y-3">
                        <label className="text-sm font-medium mb-1 block">
                          Distance/Posture:
                        </label>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Posture
                            </label>
                            <Select
                              value={
                                currentTrialInput.position || postureOptions[0]
                              }
                              onValueChange={(value) =>
                                updateCurrentTrialInput("position", value)
                              }
                            >
                              <SelectTrigger className="w-full h-12">
                                <SelectValue placeholder="Select Posture" />
                              </SelectTrigger>
                              <SelectContent>
                                {postureOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Distance
                            </label>
                            <div className="flex flex-col gap-2">
                              <Input
                                type="number"
                                value={distanceField.value || ""}
                                onChange={(e) =>
                                  updateCurrentTrialInput("distance", {
                                    value: parseFloat(e.target.value) || 0,
                                    unit: distanceField.unit || "m",
                                  })
                                }
                                className="w-full h-12 text-base"
                                placeholder="Enter distance"
                              />
                              <Select
                                value={distanceField.unit || "m"}
                                onValueChange={(value) =>
                                  updateCurrentTrialInput("distance", {
                                    value: distanceField.value || 0,
                                    unit: value,
                                  })
                                }
                              >
                                <SelectTrigger className="w-full h-12">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {["ft", "m", "km", "cm"].map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {unit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {parameters
                    .filter(
                      (p) =>
                        p.id !== "weight" &&
                        p.id !== "position" &&
                        p.id !== "direction" &&
                        p.id !== "distance",
                    )
                    .map((param) => (
                      <div key={param.id}>
                        <label className="text-sm font-medium mb-1 block">
                          {param.label}:
                        </label>
                        {renderCurrentTrialInput(param)}
                      </div>
                    ))}

                  <div className="space-y-2 pt-4">
                    <Button
                      onClick={addTrial}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={trials.length >= numberOfTrials}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Trial {trials.length + 1}
                    </Button>

                    {trials.length > 0 && (
                      <Button
                        onClick={removeTrial}
                        variant="outline"
                        className="w-full"
                      >
                        <Minus className="mr-2 h-4 w-4" />
                        Remove Last Trial
                      </Button>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 text-center pt-2">
                    {trials.length} / {numberOfTrials} trials completed
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image Upload Section */}
            <Card className="shadow-lg">
              <CardHeader className="bg-purple-600 text-white">
                <CardTitle className="text-center">Test Images</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("mtm-image-upload")?.click()
                    }
                    disabled={savedImageData.length >= 5 || isUploadingImages}
                    className={`w-full flex items-center ${
                      savedImageData.length >= 5 || isUploadingImages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                    }`}
                  >
                    {isUploadingImages ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Processing Images...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {savedImageData.length >= 5
                          ? "Maximum Images Reached (5/5)"
                          : `Upload Test Images (${savedImageData.length}/5)`}
                      </>
                    )}
                  </Button>

                  <input
                    id="mtm-image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingImages}
                  />

                  {/* Upload Progress Indicator */}
                  {isUploadingImages && (
                    <div className="flex items-center justify-center p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm text-blue-600">
                        Processing multiple images...
                      </span>
                    </div>
                  )}

                  {/* Image Preview Grid */}
                  {savedImageData.length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-medium text-green-600">
                            Saved Images ({savedImageData.length})
                          </h4>
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                            Saved
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {savedImageData.map((imageData, imageIndex) => (
                            <div
                              key={`saved-${imageIndex}`}
                              className="relative group"
                            >
                              <img
                                src={imageData.dataUrl}
                                alt={`Saved test image ${imageIndex + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-green-200 shadow-sm"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeSavedImage(imageIndex)}
                                className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {imageData.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 text-center space-y-1">
                    <p>
                      Upload up to 5 images (max 10MB each) to document test
                      procedures
                    </p>
                    <div className="font-medium">
                      <p>Total: {savedImageData.length} / 5 images</p>
                      <div className="flex justify-center gap-4 mt-1">
                        {savedImageData.length > 0 && (
                          <span className="text-green-600">
                            ✅ {savedImageData.length} saved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Custom Alert Dialog */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl text-orange-600">
              <AlertTriangle className="mr-3 h-6 w-6" />
              Notice
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="text-center space-y-3">
              <p className="text-gray-700">{alertMessage}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowAlertDialog(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
