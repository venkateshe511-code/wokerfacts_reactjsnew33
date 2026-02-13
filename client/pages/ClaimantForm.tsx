import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  X,
  Check,
  User,
  ArrowLeft,
  Camera,
  RotateCcw,
  Calendar,
  Save,
  Edit,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDemoMode } from "@/hooks/use-demo-mode";
import {
  countryData,
  countries,
  getAvailableCities,
  getPostalLabel,
  getPostalPlaceholder,
} from "@/lib/countryData";

interface ClaimantData {
  profilePhoto: File | null;
  claimantId: string;
  firstName: string;
  lastName: string;
  phone: string;
  workPhone: string;
  dateOfBirth: string;
  gender: string;
  dominantHand: string;
  heightValue: string;
  heightUnit: string;
  weightValue: string;
  weightUnit: string;
  occupation: string;
  restingPulse: string;
  bpSitting: string;
  employer: string;
  insurance: string;
  testedBy: string;
  referredBy: string;
  address: string;
  country: string;
  city: string;
  zipcode: string;
  claimantHistory: string;
}

export default function ClaimantForm() {
  const navigate = useNavigate();
  const isDemoMode = useDemoMode();
  const [formData, setFormData] = useState<ClaimantData>({
    profilePhoto: null,
    claimantId: "",
    firstName: "",
    lastName: "",
    phone: "",
    workPhone: "",
    dateOfBirth: "",
    gender: "",
    dominantHand: "",
    heightValue: "",
    heightUnit: "cm",
    weightValue: "",
    weightUnit: "kg",
    occupation: "",
    restingPulse: "",
    bpSitting: "",
    employer: "",
    insurance: "",
    testedBy: "",
    referredBy: "",
    address: "",
    country: "",
    city: "",
    zipcode: "",
    claimantHistory: "",
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const SAMPLE_PHOTO_LOCAL = "/sample-claimant.webp";
  const SAMPLE_PHOTO_CDN =
    "https://cdn.builder.io/api/v1/image/assets%2Fcb60f2e6005c4d2f99ca832ef3db7ad6%2F1c17d8a00db849b39f1b9cb344b785f0?format=webp&width=800";

  const sampleClaimantData = {
    profilePhoto: null,
    claimantId: "54217",
    firstName: "Sample",
    lastName: "Smith",
    phone: "444-333-3333",
    workPhone: "n/a",
    dateOfBirth: "1952-07-29",
    gender: "male",
    dominantHand: "right",
    // Height in app supports cm/m only; 68 in ≈ 173 cm
    heightValue: "173",
    heightUnit: "cm",
    weightValue: "243",
    weightUnit: "lbs",
    occupation: "Laborer",
    restingPulse: "Norm",
    bpSitting: "Norm",
    employer: "City of Smithtown",
    insurance: "ABC Insurance",
    testedBy: "R.Gagne, EET, NADEP, CFE",
    referredBy: "ABC Case Mgmt",
    address: "9 Winston Place",
    country: "United States",
    city: "Smithtown",
    zipcode: "M8X 2X5",
    claimantHistory:
      "Lower back injury sustained during construction work on March 10, 2024. Initial treatment included physical therapy and pain management. Patient reports persistent pain and limited mobility affecting daily activities and work capacity.",
  };

  const resolveSamplePhoto = async (): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(SAMPLE_PHOTO_LOCAL);
      img.onerror = () => resolve(SAMPLE_PHOTO_CDN);
      img.src = SAMPLE_PHOTO_LOCAL;
    });
  };

  const fillSampleClaimant = async () => {
    setFormData(sampleClaimantData);

    const samplePhoto = await resolveSamplePhoto();
    setPhotoPreview(samplePhoto);

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Store sample data in localStorage
    localStorage.setItem(
      "claimantData",
      JSON.stringify({
        ...sampleClaimantData,
        profilePhoto: samplePhoto,
      }),
    );

    // Update completed steps
    const completedSteps = JSON.parse(
      localStorage.getItem("completedSteps") || "[]",
    );
    if (!completedSteps.includes(1)) {
      completedSteps.push(1);
      localStorage.setItem("completedSteps", JSON.stringify(completedSteps));
    }

    setIsSubmitting(false);
    setShowSuccessDialog(true);
  };

  useEffect(() => {
    // Check if we have existing claimant data (edit mode)
    const existingData = localStorage.getItem("claimantData");
    if (existingData) {
      const savedData = JSON.parse(existingData);
      setFormData(savedData);
      setPhotoPreview(savedData.profilePhoto);
      setIsEditMode(true);
    }
  }, []);

  const handleInputChange = (field: keyof ClaimantData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Reset city and zipcode when country changes
    if (field === "country") {
      setFormData((prev) => ({
        ...prev,
        city: "",
        zipcode: "",
      }));
    }

    // Auto-fill zipcode when city changes
    // if (
    //   field === "city" &&
    //   formData.country &&
    //   countryData[formData.country]?.[value]
    // ) {
    //   setFormData((prev) => ({
    //     ...prev,
    //     zipcode: countryData[formData.country][value],
    //   }));
    // }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, profilePhoto: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, profilePhoto: null }));
    setPhotoPreview(null);
  };

  const validateForm = () => {
    const requiredFields = ["claimantId", "firstName", "lastName"];
    const missing = requiredFields.filter(
      (field) => !formData[field as keyof ClaimantData],
    );

    if (missing.length > 0) {
      alert(`Please fill in all required fields: ${missing.join(", ")}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Store data in localStorage for demo
    localStorage.setItem(
      "claimantData",
      JSON.stringify({
        ...formData,
        profilePhoto: photoPreview,
      }),
    );

    // Mark step 1 as completed
    const completedSteps = JSON.parse(
      localStorage.getItem("completedSteps") || "[]",
    );
    if (!completedSteps.includes(1)) {
      completedSteps.push(1);
      localStorage.setItem("completedSteps", JSON.stringify(completedSteps));
    }

    setIsSubmitting(false);
    setShowSuccessDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-2 sm:px-4">
      <div className="container mx-auto max-w-6xl">
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
              {isEditMode && (
                <Edit className="mb-2 sm:mb-0 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              )}
              Claimant Information
              {isEditMode && (
                <span className="mt-2 sm:mt-0 sm:ml-3 text-lg sm:text-2xl text-blue-600">
                  (Edit Mode)
                </span>
              )}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 text-center px-2">
              {isEditMode
                ? "Update claimant details and save changes"
                : "Complete claimant details for functional capacity evaluation"}
            </p>

            {/* Sample Claimant Button - Only show in demo mode and new mode */}
            {isDemoMode && !isEditMode && (
              <div className="mt-6">
                <Button
                  type="button"
                  onClick={fillSampleClaimant}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 text-sm sm:text-base shadow-lg border-2 border-green-500"
                >
                  <User className="mr-2 h-4 w-4" />
                  Fill Sample Claimant & Continue
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Quick demo with pre-filled claimant data
                </p>
              </div>
            )}
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader
            className={`text-white ${isEditMode ? "bg-orange-600" : "bg-blue-600"}`}
          >
            <CardTitle className="text-xl sm:text-2xl flex flex-col sm:flex-row items-center text-center sm:text-left">
              {isEditMode ? (
                <>
                  <Edit className="mb-2 sm:mb-0 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                  Step 1: Edit Claimant Info
                </>
              ) : (
                <>
                  <User className="mb-2 sm:mb-0 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                  Step 1: Enter Claimant Info
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Profile Photo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Camera className="mr-2 h-5 w-5" />
                  Profile Photo
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {photoPreview ? (
                    <div className="space-y-4">
                      <img
                        src={photoPreview}
                        alt="Claimant Photo Preview"
                        className="w-32 h-32 mx-auto rounded-full object-cover shadow-md"
                      />
                      <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("photo-upload")?.click()
                          }
                          className="flex items-center justify-center w-full sm:w-auto"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Re-upload
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemovePhoto}
                          className="flex items-center justify-center w-full sm:w-auto text-red-600 hover:text-red-700"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <User className="mx-auto h-12 w-12 text-gray-400" />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            document.getElementById("photo-upload")?.click()
                          }
                          className="flex items-center mx-auto"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Upload Profile Photo
                        </Button>
                        <p className="mt-2 text-sm text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="claimantId" className="text-sm font-medium">
                      Claimant ID *
                    </Label>
                    <Input
                      id="claimantId"
                      type="text"
                      required
                      value={formData.claimantId}
                      onChange={(e) =>
                        handleInputChange("claimantId", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Home Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workPhone" className="text-sm font-medium">
                      Work Phone
                    </Label>
                    <Input
                      id="workPhone"
                      type="tel"
                      value={formData.workPhone}
                      onChange={(e) =>
                        handleInputChange("workPhone", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="dateOfBirth"
                      className="text-sm font-medium"
                    >
                      Date of Birth
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        handleInputChange("dateOfBirth", e.target.value)
                      }
                      className="w-40"
                      onFocus={(e) => {
                        // Open picker when field gains focus
                        setTimeout(() => {
                          try {
                            if (
                              e.currentTarget &&
                              e.currentTarget.showPicker &&
                              typeof e.currentTarget.showPicker === "function"
                            ) {
                              e.currentTarget.showPicker();
                            }
                          } catch (error) {
                            // Silently handle showPicker errors (e.g., cross-origin iframe restrictions)
                            console.debug("showPicker not available:", error);
                          }
                        }, 10);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-medium">
                      Gender
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("gender", value)
                      }
                      value={formData.gender}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Physical Characteristics */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Physical Characteristics
                </h3>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="dominantHand"
                      className="text-sm font-medium"
                    >
                      Dominant Hand
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("dominantHand", value)
                      }
                      value={formData.dominantHand}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="right">Right</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="ambidextrous">
                          Ambidextrous
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Height</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.heightValue}
                        onChange={(e) =>
                          handleInputChange("heightValue", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Select
                        onValueChange={(value) =>
                          handleInputChange("heightUnit", value)
                        }
                        value={formData.heightUnit}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="in">in</SelectItem>
                          <SelectItem value="ft">ft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Weight</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.weightValue}
                        onChange={(e) =>
                          handleInputChange("weightValue", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Select
                        onValueChange={(value) =>
                          handleInputChange("weightUnit", value)
                        }
                        value={formData.weightUnit}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="lbs">lbs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupation" className="text-sm font-medium">
                      Occupation
                    </Label>
                    <Input
                      id="occupation"
                      type="text"
                      value={formData.occupation}
                      onChange={(e) =>
                        handleInputChange("occupation", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Medical Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="restingPulse"
                      className="text-sm font-medium"
                    >
                      Resting Pulse (BPM)
                    </Label>
                    <Input
                      id="restingPulse"
                      type="text"
                      value={formData.restingPulse}
                      onChange={(e) =>
                        handleInputChange("restingPulse", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpSitting" className="text-sm font-medium">
                      Blood Pressure (Sitting)
                    </Label>
                    <Input
                      id="bpSitting"
                      type="text"
                      value={formData.bpSitting}
                      onChange={(e) =>
                        handleInputChange("bpSitting", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Administrative Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Administrative Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="employer" className="text-sm font-medium">
                      Employer
                    </Label>
                    <Input
                      id="employer"
                      type="text"
                      value={formData.employer}
                      onChange={(e) =>
                        handleInputChange("employer", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurance" className="text-sm font-medium">
                      Insurance
                    </Label>
                    <Input
                      id="insurance"
                      type="text"
                      value={formData.insurance}
                      onChange={(e) =>
                        handleInputChange("insurance", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="testedBy" className="text-sm font-medium">
                      Tested By
                    </Label>
                    <Input
                      id="testedBy"
                      type="text"
                      value={formData.testedBy}
                      onChange={(e) =>
                        handleInputChange("testedBy", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referredBy" className="text-sm font-medium">
                      Referred By
                    </Label>
                    <Input
                      id="referredBy"
                      type="text"
                      value={formData.referredBy}
                      onChange={(e) =>
                        handleInputChange("referredBy", e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Address Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium">
                      Address
                    </Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      className="w-full h-20"
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-sm font-medium">
                        Country
                      </Label>
                      <Select
                        key={`country-${formData.country}`}
                        onValueChange={(value) =>
                          handleInputChange("country", value)
                        }
                        value={formData.country}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-medium">
                        City
                      </Label>
                      <Input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) =>
                          handleInputChange("city", e.target.value)
                        }
                        placeholder="Enter city / town"
                        disabled={!formData.country}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      {/* <Label htmlFor="zipcode" className="text-sm font-medium">
                        {getPostalLabel(formData.country)}{" "}
                        {formData.zipcode && (
                          <span className="text-green-600 text-xs">
                            (Auto-filled)
                          </span>
                        )}
                      </Label> */}
                      <Label htmlFor="zipcode" className="text-sm font-medium">
                        Zip Code / Postal Code
                      </Label>

                      <Input
                        id="zipcode"
                        type="text"
                        value={formData.zipcode}
                        onChange={(e) =>
                          handleInputChange("zipcode", e.target.value)
                        }
                        placeholder="Enter zip / postal code"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Claimant History */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Claimant History
                </h3>
                <div className="space-y-2">
                  <Label
                    htmlFor="claimantHistory"
                    className="text-sm font-medium"
                  >
                    Medical History & Injury Details
                  </Label>
                  <Textarea
                    id="claimantHistory"
                    value={formData.claimantHistory}
                    onChange={(e) =>
                      handleInputChange("claimantHistory", e.target.value)
                    }
                    className="w-full h-32"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {isEditMode ? "Updating..." : "Saving..."}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Save className="mr-2 h-5 w-5" />
                      {isEditMode
                        ? "Update Claimant Data"
                        : "Save Claimant Data"}
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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
                  {isEditMode ? "Claimant Data Updated" : "Claimant Data Saved"}
                </h3>
                <p className="text-gray-600">
                  {isEditMode
                    ? "Step 1 has been updated successfully. Your changes have been saved."
                    : "Step 1 has been completed successfully. You can now proceed to the next step."}
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
