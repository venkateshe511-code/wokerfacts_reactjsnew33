import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  filesToBase64Array,
  base64ArrayToFiles,
  SerializedImage,
} from "@/lib/cardio-utils";

interface YMCASubmaximalTreadmillTestData {
  vo2Max: string;
  heartRate: string;
  clientImages: File[];
  serializedImages?: SerializedImage[];
}

interface Props {
  onSave: (data: YMCASubmaximalTreadmillTestData) => void;
  initialData?: Partial<YMCASubmaximalTreadmillTestData>;
}

export default function YMCASubmaximalTreadmillTest({
  onSave,
  initialData,
}: Props) {
  const [vo2Max, setVo2Max] = useState(initialData?.vo2Max || "");
  const [heartRate, setHeartRate] = useState(initialData?.heartRate || "");
  const [clientImages, setClientImages] = useState<File[]>(
    initialData?.clientImages || [],
  );
  const [imagePreviewIndex, setImagePreviewIndex] = useState<number | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddImages = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    const newImages = [...clientImages, ...files];
    setClientImages(newImages);

    const serializedImages = await filesToBase64Array(newImages);
    onSave({
      vo2Max,
      heartRate,
      clientImages: newImages,
      serializedImages,
    });
  };

  const handleRemoveImage = async (index: number) => {
    const newImages = clientImages.filter((_, i) => i !== index);
    setClientImages(newImages);

    const serializedImages = await filesToBase64Array(newImages);
    onSave({
      vo2Max,
      heartRate,
      clientImages: newImages,
      serializedImages,
    });
  };

  const handlePreviewImage = (index: number) => {
    setImagePreviewIndex(index);
  };

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (vo2Max || heartRate) {
        const serializedImages = await filesToBase64Array(clientImages);
        onSave({
          vo2Max,
          heartRate,
          clientImages,
          serializedImages,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [vo2Max, heartRate]);

  useEffect(() => {
    if (
      initialData?.serializedImages &&
      initialData.serializedImages.length > 0
    ) {
      try {
        const files = base64ArrayToFiles(initialData.serializedImages);
        const validFiles = files.filter(
          (file) => file instanceof File && file.size > 0,
        );
        setClientImages(validFiles);
      } catch (error) {
        console.error("Error loading serialized images:", error);
        setClientImages([]);
      }
    }
  }, [initialData?.serializedImages]);

  const protocolTable = [
    {
      stage: "Warm-up",
      duration: "3 min",
      speed: "Self-selected (2.0-4.5 mph)",
      grade: "0%",
      targetHeartRate: "50-70% of age-predicted MHR",
    },
    {
      stage: "Test Stage",
      duration: "4 min",
      speed: "Maintain Warm-up Speed",
      grade: "5%",
      targetHeartRate: "HR between 50-70% MHR",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-green-600 via-emerald-500 to-cyan-500 text-white relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <CardTitle className="text-2xl font-bold text-center relative z-10 drop-shadow-lg">
            🏃‍♂️ YMCA SUBMAXIMAL TREADMILL TEST
          </CardTitle>
          <p className="text-center text-emerald-100 text-sm relative z-10 font-medium mt-2">
            Single-stage protocol to assess cardiovascular fitness with
            steady-state heart rate between 50-70% age-predicted MHR.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 bg-gradient-to-br from-green-50 via-emerald-50 to-cyan-50">
          {/* Test Description */}
          <div className="bg-white rounded-lg p-4 border-2 border-green-200 mt-8">
            <h3 className="font-bold text-green-900 mb-2">Test Protocol:</h3>
            <p className="text-sm text-gray-700">
              This test involves a warm-up followed by a single, four-minute
              testing stage intended to elicit a steady-state heart rate (HR)
              between 50% and 70% of age-predicted maximum heart rate for
              healthy individuals.
            </p>
          </div>

          {/* Protocol Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-green-900">
              Test Protocol Stages
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg shadow-md">
                <thead>
                  <tr className="bg-green-200">
                    <th className="border border-green-300 px-3 py-2 text-left font-semibold">
                      Stage
                    </th>
                    <th className="border border-green-300 px-3 py-2 text-center font-semibold">
                      Duration
                    </th>
                    <th className="border border-green-300 px-3 py-2 text-center font-semibold">
                      Speed
                    </th>
                    <th className="border border-green-300 px-3 py-2 text-center font-semibold">
                      Grade
                    </th>
                    <th className="border border-green-300 px-3 py-2 text-center font-semibold">
                      Target Heart Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {protocolTable.map((row, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-green-50" : "bg-white"}
                    >
                      <td className="border border-green-300 px-3 py-2 font-semibold text-green-900">
                        {row.stage}
                      </td>
                      <td className="border border-green-300 px-3 py-2 text-center">
                        {row.duration}
                      </td>
                      <td className="border border-green-300 px-3 py-2 text-center text-sm">
                        {row.speed}
                      </td>
                      <td className="border border-green-300 px-3 py-2 text-center">
                        {row.grade}
                      </td>
                      <td className="border border-green-300 px-3 py-2 text-center text-sm">
                        {row.targetHeartRate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Procedure Notes */}
          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <h3 className="font-bold text-green-900 mb-3">Procedure Notes:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-semibold">• Warm-up:</span>
                <span>
                  Find a comfortable walking or jogging speed (2.0-4.5 mph) that
                  results in a heart rate within the target range.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">• Test Stage:</span>
                <span>
                  After 3-minute warm-up, increase grade to 5% while maintaining
                  speed. Test lasts 4 minutes.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">• Data Collection:</span>
                <span>
                  Measure heart rate during last 30 seconds of minutes 2, 3, and
                  4 to ensure steady state.
                </span>
              </li>
            </ul>
          </div>

          {/* Data Collection Points */}
          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <h3 className="font-bold text-green-900 mb-3">
              Data Collection Chart Points:
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                • <span className="font-semibold">Time (min):</span> Record test
                duration
              </li>
              <li>
                •{" "}
                <span className="font-semibold">
                  Speed (mph) and Grade (%):
                </span>{" "}
                Record treadmill settings
              </li>
              <li>
                • <span className="font-semibold">Heart Rate (bpm):</span>{" "}
                Measured at specific intervals to confirm steady state
              </li>
              <li>
                • <span className="font-semibold">Signs/Symptoms:</span> Any
                subject discomfort, dizziness, or abnormal responses
              </li>
            </ul>
          </div>

          {/* VO2max Estimation */}
          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <h3 className="font-bold text-green-900 mb-2">
              VO2max Estimation Formula:
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              VO2(mL·kg⁻¹·min⁻¹) = 15.1 + 21.8 × Speed (mph) - 0.327 × Heart
              Rate (bpm) - 0.263 × Speed × Age (yrs) + 0.00504 × Heart Rate ×
              Age + 5.98 × Gender (0=F, 1=M)
            </p>
            <p className="text-xs text-gray-600 italic">
              Data from steady-state heart rate and speed in the final test
              stage are used in this regression equation.
            </p>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="vo2Max" className="text-sm font-semibold">
                VO2 MAX (mL·kg⁻¹·min⁻¹):
              </Label>
              <Input
                id="vo2Max"
                value={vo2Max}
                onChange={(e) => setVo2Max(e.target.value)}
                className="border-2 border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-200 bg-white shadow-sm"
                placeholder="Enter VO2 max score"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heartRate" className="text-sm font-semibold">
                HEART RATE (bpm):
              </Label>
              <Input
                id="heartRate"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="border-2 border-green-400 focus:border-green-600 focus:ring-2 focus:ring-green-200 bg-white shadow-sm"
                placeholder="Enter steady-state heart rate"
              />
            </div>

          </div>

          {/* Image Upload Section */}
          <div className="space-y-4">
            <div className="text-center">
              <Button
                onClick={handleAddImages}
                variant="outline"
                className="border-2 border-green-400 hover:border-green-600 hover:bg-green-50 px-8 py-3 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-green-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                ADD CLIENT IMAGES
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Image Preview Grid */}
            {clientImages.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">CLIENT IMAGES:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {clientImages
                    .filter((file) => file instanceof File && file.size > 0)
                    .map((file, index) => {
                      let imageUrl: string;
                      try {
                        imageUrl = URL.createObjectURL(file);
                      } catch (error) {
                        console.error("Error creating object URL:", error);
                        return null;
                      }

                      return (
                        <div
                          key={index}
                          className="relative border-2 border-gray-300 rounded-lg p-2"
                        >
                          <img
                            src={imageUrl}
                            alt={`Client image ${index + 1}`}
                            className="w-full h-24 object-cover rounded cursor-pointer"
                            onClick={() => handlePreviewImage(index)}
                            onError={() => {
                              console.error("Error loading image:", file.name);
                            }}
                          />
                          <div className="absolute top-1 right-1 flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreviewImage(index)}
                              className="p-1 h-6 w-6"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveImage(index)}
                              className="p-1 h-6 w-6"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-center mt-1 truncate">
                            {file.name}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog
        open={imagePreviewIndex !== null}
        onOpenChange={() => setImagePreviewIndex(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {imagePreviewIndex !== null && clientImages[imagePreviewIndex] && (
            <div className="text-center">
              {(() => {
                const file = clientImages[imagePreviewIndex];
                if (!(file instanceof File) || file.size === 0) {
                  return <p className="text-red-500">Invalid image file</p>;
                }

                let imageUrl: string;
                try {
                  imageUrl = URL.createObjectURL(file);
                } catch (error) {
                  console.error("Error creating preview URL:", error);
                  return (
                    <p className="text-red-500">Error loading image preview</p>
                  );
                }

                return (
                  <>
                    <img
                      src={imageUrl}
                      alt={`Preview ${imagePreviewIndex + 1}`}
                      className="max-w-full max-h-[70vh] object-contain mx-auto"
                      onError={() => {
                        console.error(
                          "Error loading preview image:",
                          file.name,
                        );
                      }}
                    />
                    <p className="mt-2 text-sm text-gray-600">{file.name}</p>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
