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
  Upload,
  X,
  Check,
  User,
  Building,
  Globe,
  Phone,
  Mail,
  Camera,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  countryData,
  countries,
  getAvailableCities,
} from "@/lib/countryData";

interface EvaluatorData {
  name: string;
  licenseNo: string;
  clinicName: string;
  address: string;
  country: string;
  city: string;
  zipcode: string;
  email: string;
  phone: string;
  website: string;
  profilePhoto: string | null;
  clinicLogo: string | null;
}

export default function EditProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<EvaluatorData>({
    name: "",
    licenseNo: "",
    clinicName: "",
    address: "",
    country: "",
    city: "",
    zipcode: "",
    email: "",
    phone: "",
    website: "",
    profilePhoto: null,
    clinicLogo: null,
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const { selectedProfileId, user } = useAuth();
  const targetProfileId =
    searchParams.get("profileId") || selectedProfileId || "";

  // Comprehensive country-city-zipcode mapping
  const countryData: { [key: string]: { [key: string]: string } } = {
    "United States": {
      "New York": "10001",
      "Los Angeles": "90210",
      Chicago: "60601",
      Houston: "77001",
      Phoenix: "85001",
      Philadelphia: "19101",
      "San Antonio": "78201",
      "San Diego": "92101",
      Dallas: "75201",
      "San Jose": "95101",
      Miami: "33101",
      Boston: "02101",
      Seattle: "98101",
      Denver: "80201",
      Atlanta: "30301",
    },
    Canada: {
      Toronto: "M5H 2N2",
      Vancouver: "V6B 1A1",
      Montreal: "H3A 0G4",
      Calgary: "T2P 0A1",
      Ottawa: "K1P 1J1",
      Edmonton: "T5J 0K1",
      Winnipeg: "R3C 0V8",
      "Quebec City": "G1R 2L3",
      Halifax: "B3J 1S9",
      Victoria: "V8W 1P6",
    },
    "United Kingdom": {
      London: "SW1A 1AA",
      Manchester: "M1 1AA",
      Birmingham: "B1 1AA",
      Glasgow: "G1 1AA",
      Liverpool: "L1 8JQ",
      Bristol: "BS1 4DJ",
      Leeds: "LS1 4AP",
      Sheffield: "S1 2HE",
      Edinburgh: "EH1 1YZ",
      Cardiff: "CF10 3AT",
    },
    Australia: {
      Sydney: "2000",
      Melbourne: "3000",
      Brisbane: "4000",
      Perth: "6000",
      Adelaide: "5000",
      "Gold Coast": "4217",
      Newcastle: "2300",
      Canberra: "2600",
      "Sunshine Coast": "4558",
      Wollongong: "2500",
    },
    Germany: {
      Berlin: "10115",
      Munich: "80331",
      Hamburg: "20095",
      Cologne: "50667",
      Frankfurt: "60311",
      Stuttgart: "70173",
      Düsseldorf: "40213",
      Dortmund: "44135",
      Essen: "45127",
      Leipzig: "04109",
    },
    France: {
      Paris: "75001",
      Marseille: "13001",
      Lyon: "69001",
      Toulouse: "31000",
      Nice: "06000",
      Nantes: "44000",
      Strasbourg: "67000",
      Montpellier: "34000",
      Bordeaux: "33000",
      Lille: "59000",
    },
  };

  const countries = Object.keys(countryData);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      if (!targetProfileId) {
        navigate("/profiles");
        return;
      }
      const ref = doc(db, "evaluatorProfiles", targetProfileId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        navigate("/register");
        return;
      }
      const data = snap.data() as any;
      const mapped: EvaluatorData = {
        name: data.name || "",
        licenseNo: data.licenseNo || "",
        clinicName: data.clinicName || "",
        address: data.address || "",
        country: data.country || "",
        city: data.city || "",
        zipcode: data.zipcode || "",
        email: data.email || "",
        phone: data.phone || "",
        website: data.website || "",
        profilePhoto: data.profilePhoto || null,
        clinicLogo: data.clinicLogo || null,
      };
      setFormData(mapped);
      setLogoPreview(mapped.clinicLogo);
      setProfilePreview(mapped.profilePhoto);
    };
    load();
  }, [navigate, targetProfileId, user]);

  const handleInputChange = (field: keyof EvaluatorData, value: string) => {
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
    if (
      field === "city" &&
      formData.country &&
      countryData[formData.country]?.[value]
    ) {
      setFormData((prev) => ({
        ...prev,
        zipcode: countryData[formData.country][value],
      }));
    }
  };

  const getAvailableCities = () => {
    if (!formData.country) return [];
    return Object.keys(countryData[formData.country] || {});
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
  };

  const handleProfilePhotoUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePhoto = () => {
    setProfilePreview(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      alert("Please enter your name");
      return false;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert("Please enter a valid email address");
      return false;
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      alert(
        "Please enter a valid website URL (starting with http:// or https://)",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user || !targetProfileId) {
      navigate("/profiles");
      return;
    }

    setIsSubmitting(true);

    const ref = doc(db, "evaluatorProfiles", targetProfileId);
    await updateDoc(ref, {
      name: formData.name,
      licenseNo: formData.licenseNo,
      clinicName: formData.clinicName,
      address: formData.address,
      country: formData.country,
      city: formData.city,
      zipcode: formData.zipcode,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      profilePhoto: profilePreview || null,
      clinicLogo: logoPreview || null,
      updatedAt: serverTimestamp(),
    });

    setIsSubmitting(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Edit Profile
            </h1>
            <p className="text-xl text-gray-600">
              Update your professional information
            </p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="text-2xl flex items-center">
              <User className="mr-3 h-6 w-6" />
              Professional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full"
                    placeholder="Dr. John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license" className="text-sm font-medium">
                    License Number
                  </Label>
                  <Input
                    id="license"
                    type="text"
                    value={formData.licenseNo}
                    onChange={(e) =>
                      handleInputChange("licenseNo", e.target.value)
                    }
                    className="w-full"
                    placeholder="LIC123456789"
                  />
                </div>
              </div>

              {/* Clinic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Clinic Information
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="clinicName" className="text-sm font-medium">
                    Clinic Name
                  </Label>
                  <Input
                    id="clinicName"
                    type="text"
                    value={formData.clinicName}
                    onChange={(e) =>
                      handleInputChange("clinicName", e.target.value)
                    }
                    className="w-full"
                    placeholder="ABC Medical Center"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">
                    Full Address
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    className="w-full h-20"
                    placeholder="123 Main Street, Suite 100&#10;City, State 12345"
                  />
                </div>
              </div>

              {/* Location Information */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium">
                    Country
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      handleInputChange("country", value)
                    }
                    value={formData.country}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Country" />
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
                  <Select
                    onValueChange={(value) => handleInputChange("city", value)}
                    value={formData.city}
                    disabled={!formData.country}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          formData.country
                            ? "Select City"
                            : "Select Country First"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCities().map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipcode" className="text-sm font-medium">
                    Zip Code{" "}
                    {formData.zipcode && (
                      <span className="text-green-600 text-xs">
                        (Auto-filled)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="zipcode"
                    type="text"
                    value={formData.zipcode}
                    onChange={(e) =>
                      handleInputChange("zipcode", e.target.value)
                    }
                    className="w-full"
                    placeholder={
                      formData.city
                        ? "Auto-filled based on city"
                        : "Select city first"
                    }
                    disabled={!formData.city}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Phone className="mr-2 h-5 w-5" />
                  Contact Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className="w-full"
                      placeholder="doctor@clinic.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      className="w-full"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium">
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    className="w-full"
                    placeholder="https://www.clinic.com"
                  />
                </div>
              </div>

              {/* Profile Photo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Professional Profile Photo
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {profilePreview ? (
                    <div className="space-y-4">
                      <img
                        src={profilePreview}
                        alt="Profile Photo Preview"
                        className="w-32 h-32 mx-auto rounded-full object-cover shadow-md"
                      />
                      <div className="flex justify-center space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("profile-upload")?.click()
                          }
                          className="flex items-center"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Re-upload
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveProfilePhoto}
                          className="flex items-center text-red-600 hover:text-red-700"
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
                            document.getElementById("profile-upload")?.click()
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
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Clinic Logo Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Camera className="mr-2 h-5 w-5" />
                  Clinic Logo
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {logoPreview ? (
                    <div className="space-y-4">
                      <img
                        src={logoPreview}
                        alt="Clinic Logo Preview"
                        className="max-w-48 max-h-32 mx-auto rounded-lg shadow-md"
                      />
                      <div className="flex justify-center space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("logo-upload")?.click()
                          }
                          className="flex items-center"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Re-upload
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="flex items-center text-red-600 hover:text-red-700"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            document.getElementById("logo-upload")?.click()
                          }
                          className="flex items-center mx-auto"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Upload Clinic Logo
                        </Button>
                        <p className="mt-2 text-sm text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
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
                      Updating...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Check className="mr-2 h-5 w-5" />
                      Update Profile
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
