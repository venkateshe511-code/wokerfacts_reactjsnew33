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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  filesToBase64Array,
  base64ArrayToFiles,
  SerializedImage,
} from "@/lib/cardio-utils";

interface YMCAStepTestData {
  clientRating: string;
  clientImages: File[];
  serializedImages?: SerializedImage[];
}

interface Props {
  onSave: (data: YMCAStepTestData) => void;
  initialData?: Partial<YMCAStepTestData>;
}

export default function YMCAStepTest({ onSave, initialData }: Props) {
  const [clientRating, setClientRating] = useState(
    initialData?.clientRating || "",
  );
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
      clientRating,
      clientImages: newImages,
      serializedImages,
    });
  };

  const handleRemoveImage = async (index: number) => {
    const newImages = clientImages.filter((_, i) => i !== index);
    setClientImages(newImages);

    const serializedImages = await filesToBase64Array(newImages);
    onSave({
      clientRating,
      clientImages: newImages,
      serializedImages,
    });
  };

  const handlePreviewImage = (index: number) => {
    setImagePreviewIndex(index);
  };

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (classification || vo2MaxScore) {
        const serializedImages = await filesToBase64Array(clientImages);
        onSave({
          classification,
          vo2MaxScore,
          clientImages,
          serializedImages,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [classification, vo2MaxScore]);

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

  const menTable = [
    {
      rating: "Excellent",
      "18-25": "50-76",
      "26-35": "51-76",
      "36-45": "49-76",
      "46-55": "56-82",
      "56-65": "60-77",
      "≥65": "59-81",
    },
    {
      rating: "Good",
      "18-25": "79-84",
      "26-35": "79-85",
      "36-45": "80-88",
      "46-55": "87-93",
      "56-65": "86-94",
      "≥65": "87-92",
    },
    {
      rating: "Above average",
      "18-25": "88-93",
      "26-35": "88-94",
      "36-45": "92-98",
      "46-55": "95-101",
      "56-65": "97-100",
      "≥65": "94-102",
    },
    {
      rating: "Average",
      "18-25": "95-100",
      "26-35": "96-102",
      "36-45": "100-105",
      "46-55": "103-111",
      "56-65": "103-109",
      "≥65": "104-110",
    },
    {
      rating: "Below Average",
      "18-25": "102-107",
      "26-35": "104-110",
      "36-45": "108-113",
      "46-55": "113-119",
      "56-65": "111-117",
      "≥65": "114-118",
    },
    {
      rating: "Poor",
      "18-25": "111-119",
      "26-35": "114-121",
      "36-45": "116-124",
      "46-55": "121-126",
      "56-65": "119-128",
      "≥65": "121-126",
    },
    {
      rating: "Very poor",
      "18-25": "124-157",
      "26-35": "126-161",
      "36-45": "130-163",
      "46-55": "131-159",
      "56-65": "131-154",
      "≥65": "130-151",
    },
  ];

  const womenTable = [
    {
      rating: "Excellent",
      "18-25": "52-81",
      "26-35": "58-80",
      "36-45": "51-84",
      "46-55": "63-91",
      "56-65": "60-92",
      "≥65": "70-92",
    },
    {
      rating: "Good",
      "18-25": "85-93",
      "26-35": "85-92",
      "36-45": "89-96",
      "46-55": "95-101",
      "56-65": "97-103",
      "≥65": "96-101",
    },
    {
      rating: "Above average",
      "18-25": "96-102",
      "26-35": "95-101",
      "36-45": "100-104",
      "46-55": "104-110",
      "56-65": "106-111",
      "≥65": "104-111",
    },
    {
      rating: "Average",
      "18-25": "104-110",
      "26-35": "104-110",
      "36-45": "107-112",
      "46-55": "113-118",
      "56-65": "113-118",
      "≥65": "116-121",
    },
    {
      rating: "Below Average",
      "18-25": "113-120",
      "26-35": "113-119",
      "36-45": "115-120",
      "46-55": "120-124",
      "56-65": "119-127",
      "≥65": "123-126",
    },
    {
      rating: "Poor",
      "18-25": "122-131",
      "26-35": "122-129",
      "36-45": "124-132",
      "46-55": "126-132",
      "56-65": "129-135",
      "≥65": "128-133",
    },
    {
      rating: "Very poor",
      "18-25": "135-169",
      "26-35": "134-171",
      "36-45": "137-169",
      "46-55": "137-171",
      "56-65": "141-174",
      "≥65": "135-155",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 text-white relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <CardTitle className="text-2xl font-bold text-center relative z-10 drop-shadow-lg">
            🪜 YMCA 3-MINUTE STEP TEST
          </CardTitle>
          <p className="text-center text-pink-100 text-sm relative z-10 font-medium mt-2">
            Purpose: To assess cardiorespiratory fitness using a 12-inch step
            with metronome set to 96 beats per minute.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="classification" className="text-sm font-semibold">
                CLASSIFICATION:
              </Label>
              <Input
                id="classification"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="border-2 border-purple-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 bg-white shadow-sm"
                placeholder="Enter classification (e.g., Excellent, Good, Average)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vo2MaxScore" className="text-sm font-semibold">
                VO2 MAX SCORE:
              </Label>
              <Input
                id="vo2MaxScore"
                value={vo2MaxScore}
                onChange={(e) => setVo2MaxScore(e.target.value)}
                className="border-2 border-purple-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 bg-white shadow-sm"
                placeholder="Enter VO2 max score"
              />
            </div>
          </div>

          {/* Ratings Tables */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-bold text-lg text-purple-900">
                Ratings for Men by Age
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg shadow-md">
                  <thead>
                    <tr className="bg-purple-200">
                      <th className="border border-purple-300 px-3 py-2 text-left font-semibold">
                        Rating
                      </th>
                      <th className="border border-purple-300 px-3 py-2 text-center font-semibold">
                        18-25
                      </th>
                      <th className="border border-purple-300 px-3 py-2 text-center font-semibold">
                        26-35
                      </th>
                      <th className="border border-purple-300 px-3 py-2 text-center font-semibold">
                        36-45
                      </th>
                      <th className="border border-purple-300 px-3 py-2 text-center font-semibold">
                        46-55
                      </th>
                      <th className="border border-purple-300 px-3 py-2 text-center font-semibold">
                        56-65
                      </th>
                      <th className="border border-purple-300 px-3 py-2 text-center font-semibold">
                        ≥65
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {menTable.map((row, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-purple-50" : "bg-white"}
                      >
                        <td className="border border-purple-300 px-3 py-2 font-semibold text-purple-900">
                          {row.rating}
                        </td>
                        <td className="border border-purple-300 px-3 py-2 text-center">
                          {row["18-25"]}
                        </td>
                        <td className="border border-purple-300 px-3 py-2 text-center">
                          {row["26-35"]}
                        </td>
                        <td className="border border-purple-300 px-3 py-2 text-center">
                          {row["36-45"]}
                        </td>
                        <td className="border border-purple-300 px-3 py-2 text-center">
                          {row["46-55"]}
                        </td>
                        <td className="border border-purple-300 px-3 py-2 text-center">
                          {row["56-65"]}
                        </td>
                        <td className="border border-purple-300 px-3 py-2 text-center">
                          {row["≥65"]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-lg text-purple-900">
                Ratings for Women by Age
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg shadow-md">
                  <thead>
                    <tr className="bg-pink-200">
                      <th className="border border-pink-300 px-3 py-2 text-left font-semibold">
                        Rating
                      </th>
                      <th className="border border-pink-300 px-3 py-2 text-center font-semibold">
                        18-25
                      </th>
                      <th className="border border-pink-300 px-3 py-2 text-center font-semibold">
                        26-35
                      </th>
                      <th className="border border-pink-300 px-3 py-2 text-center font-semibold">
                        36-45
                      </th>
                      <th className="border border-pink-300 px-3 py-2 text-center font-semibold">
                        46-55
                      </th>
                      <th className="border border-pink-300 px-3 py-2 text-center font-semibold">
                        56-65
                      </th>
                      <th className="border border-pink-300 px-3 py-2 text-center font-semibold">
                        ≥65
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {womenTable.map((row, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-pink-50" : "bg-white"}
                      >
                        <td className="border border-pink-300 px-3 py-2 font-semibold text-pink-900">
                          {row.rating}
                        </td>
                        <td className="border border-pink-300 px-3 py-2 text-center">
                          {row["18-25"]}
                        </td>
                        <td className="border border-pink-300 px-3 py-2 text-center">
                          {row["26-35"]}
                        </td>
                        <td className="border border-pink-300 px-3 py-2 text-center">
                          {row["36-45"]}
                        </td>
                        <td className="border border-pink-300 px-3 py-2 text-center">
                          {row["46-55"]}
                        </td>
                        <td className="border border-pink-300 px-3 py-2 text-center">
                          {row["56-65"]}
                        </td>
                        <td className="border border-pink-300 px-3 py-2 text-center">
                          {row["≥65"]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-4">
            <div className="text-center">
              <Button
                onClick={handleAddImages}
                variant="outline"
                className="border-2 border-purple-400 hover:border-purple-600 hover:bg-purple-50 px-8 py-3 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-purple-700"
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
