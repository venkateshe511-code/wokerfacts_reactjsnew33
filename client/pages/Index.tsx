import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Users,
  BarChart3,
  Shield,
  Clock,
  Award,
  ArrowRight,
  Star,
  Globe,
  Laptop,
  Tablet,
  Smartphone,
  Play,
  Quote,
  Mail,
  Check,
  Circle,
  Menu,
  X,
  ArrowLeft,
  ThumbsUp,
  Calendar,
  Download,
  UserCircle,
} from "lucide-react";
import { collection, addDoc } from "firebase/firestore"; // ✅ Import this
import { db } from "../firebase";
import { OfflineImage, OfflineIndicator } from "@/components/ui/offline-image";
import { OfflineBackground } from "@/components/ui/offline-background";
import { CacheStatus } from "@/components/ui/cache-status";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { VideoInfoPopup } from "@/components/VideoInfoPopup";
import { VIDEOS, VideoInfo } from "@/lib/videoData";

export default function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [showContactSuccess, setShowContactSuccess] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoInfo | null>(null);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    clinicName: "",
    email: "",
    phone: "",
    evaluationTypes: [] as string[],
    comments: "",
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const { user, signOut } = useAuth();
  const displayName = user?.displayName || user?.email || null;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();

      // Mirror dashboard: wipe all locally stored evaluation and profile data
      const keysToRemove = [
        "evaluatorData",
        "completedSteps",
        "claimantData",
        "painIllustrationData",
        "activityRatingData",
        "referralQuestionsData",
        "protocolTestsData",
        "occupationalTasksData",
        "testData",
        "mtmTestData",
        "digitalLibraryData",
        "paymentData",
        "reviewReportData",
      ];

      keysToRemove.forEach((key) => localStorage.removeItem(key));
      localStorage.clear();

      toast({
        title: "Signed out",
        description: "All local data cleared and you have been signed out.",
        duration: 5000,
        className:
          "border-0 text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl",
      });
    } catch (err) {
      console.error("Sign out failed", err);
      toast({ title: "Sign out failed", variant: "destructive" });
    }
  };

  // Slideshow images (local assets)
  const slideImages = [
    "/slideshow/medical-assessment.jpg", // Medical assessment
    "/slideshow/physical-therapy.jpg", // Physical therapy
    "/slideshow/healthcare-evaluation.jpg", // Healthcare evaluation
  ];

  const openPopup = (popup: string) => {
    setActivePopup(popup);
    setMobileMenuOpen(false);
  };

  const closePopup = () => {
    setActivePopup(null);
  };

  const openVideoPopup = (videoKey: string) => {
    const video = VIDEOS[videoKey];
    if (video) {
      setSelectedVideo(video);
      setShowVideoPopup(true);
    }
  };

  const closeVideoPopup = () => {
    setShowVideoPopup(false);
    setSelectedVideo(null);
  };

  const handleContactFormChange = (field: string, value: string) => {
    setContactForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEvaluationTypeChange = (value: string, checked: boolean) => {
    setContactForm((prev) => ({
      ...prev,
      evaluationTypes: checked
        ? [...prev.evaluationTypes, value]
        : prev.evaluationTypes.filter((type) => type !== value),
    }));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Send form data to Firestore
      await addDoc(collection(db, "contactForms"), {
        name: contactForm.name,
        clinicName: contactForm.clinicName,
        email: contactForm.email,
        phone: contactForm.phone,
        evaluationTypes: contactForm.evaluationTypes,
        comments: contactForm.comments,
        submittedAt: new Date(),
      });

      // Show success message
      setShowContactSuccess(true);

      // Reset form
      setContactForm({
        name: "",
        clinicName: "",
        email: "",
        phone: "",
        evaluationTypes: [],
        comments: "",
      });

      // Hide message and close popup
      setTimeout(() => {
        setShowContactSuccess(false);
        closePopup();
      }, 3000);
    } catch (err) {
      console.error("Error submitting form:", err);
      alert("Failed to submit. Please try again.");
    }
  };

  // Slideshow auto-play effect
  React.useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(slideInterval);
  }, [slideImages.length]);

  return (
    <div className="min-h-screen bg-white justify-paragraphs">
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Header */}
      <header className="bg-slate-800 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <OfflineImage
                src="/workerfacts-logo.png"
                alt="WorkerFacts"
                className="h-12 w-auto mr-2"
                fallbackText="Logo"
              />
              <h1 className="text-2xl font-bold">WorkerFacts</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center space-x-6">
            <button
              onClick={() => openPopup("about")}
              className="text-white hover:text-blue-300 transition-colors"
            >
              About Us
            </button>
            <button
              onClick={() => openPopup("evaluations")}
              className="text-white hover:text-blue-300 transition-colors"
            >
              Evaluations
            </button>
            <button
              onClick={() => openPopup("pricing")}
              className="text-white hover:text-blue-300 transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => openPopup("contact")}
              className="text-white hover:text-blue-300 transition-colors"
            >
              Contact Us
            </button>

            {/* Download Sample Report Button */}
            <a
              href="/sample_FCE_report.pdf"
              download
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Sample Report
            </a>

            <Link to={user ? "/profiles" : "/login?redirect=/register"}>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 font-semibold"
              >
                {user ? "Choose Profile" : "Get Started"}
              </Button>
            </Link>
          </nav>

          {/* Tablet Navigation - Compact */}
          <nav className="hidden lg:xl:hidden lg:flex items-center space-x-3">
            <button
              onClick={() => openPopup("about")}
              className="text-white hover:text-blue-300 transition-colors text-sm"
            >
              About
            </button>
            <button
              onClick={() => openPopup("evaluations")}
              className="text-white hover:text-blue-300 transition-colors text-sm"
            >
              Evaluations
            </button>
            <button
              onClick={() => openPopup("pricing")}
              className="text-white hover:text-blue-300 transition-colors text-sm"
            >
              Pricing
            </button>
            <button
              onClick={() => openPopup("contact")}
              className="text-white hover:text-blue-300 transition-colors text-sm"
            >
              Contact
            </button>

            {/* Compact Download Button */}
            <a
              href="/sample_FCE_report.pdf"
              download
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors text-sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Sample
            </a>

            <Link to={user ? "/profiles" : "/login?redirect=/register"}>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 font-semibold text-sm"
              >
                {user ? "Choose" : "Get Started"}
              </Button>
            </Link>
          </nav>

          {/* Medium Screen Navigation - Essential items only */}
          <nav className="hidden md:lg:hidden md:flex items-center space-x-4">
            <a
              href="/sample_FCE_report.pdf"
              download
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors text-sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Sample
            </a>

            <Link to={user ? "/profiles" : "/login?redirect=/register"}>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 font-semibold text-sm"
              >
                {user ? "Choose Profile" : "Get Started"}
              </Button>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-t border-slate-700">
            <nav className="container mx-auto px-4 py-4 space-y-4">
              <button
                onClick={() => openPopup("about")}
                className="block text-white hover:text-blue-300 transition-colors w-full text-left"
              >
                About Us
              </button>
              <button
                onClick={() => openPopup("evaluations")}
                className="block text-white hover:text-blue-300 transition-colors w-full text-left"
              >
                Evaluations
              </button>
              <button
                onClick={() => openPopup("pricing")}
                className="block text-white hover:text-blue-300 transition-colors w-full text-left"
              >
                Pricing
              </button>
              <button
                onClick={() => openPopup("contact")}
                className="block text-white hover:text-blue-300 transition-colors w-full text-left"
              >
                Contact Us
              </button>

              <div className="flex flex-col space-y-4">
                {/* Mobile Download Button */}
                <a
                  href="/AdamStrainFCE.pdf"
                  download
                  className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors text-center"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download Sample Report
                </a>

                {displayName && (
                  <div className="text-white/90 text-sm text-center">
                    Signed in as {displayName}
                  </div>
                )}
                <Link
                  to={user ? "/dashboard" : "/login?redirect=/register"}
                  className="w-full"
                >
                  <Button
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white w-full font-semibold text-center"
                  >
                    {user ? "Choose Profile" : "Get Started"}
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative h-[300px] sm:h-[400px] md:h-[500px] overflow-hidden">
        <OfflineBackground
          backgroundImage="/home_page_background_image.jpg"
          fallbackColor="bg-gradient-to-br from-blue-600 to-blue-800"
          className="absolute inset-0"
        />
        {displayName && (
          <>
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                title="Click to sign out"
                className="rounded-full bg-white/90 text-slate-900 border border-slate-200 shadow-sm backdrop-blur px-4 py-2 flex items-center cursor-pointer hover:shadow-md hover:bg-white transition"
                aria-label="Signed in user"
              >
                <UserCircle className="mr-2 h-5 w-5" />
                <span className="flex flex-col items-start leading-tight text-left">
                  <span className="text-xs uppercase tracking-wide opacity-90">
                    Signed in as
                  </span>
                  <span
                    className="text-sm font-medium truncate max-w-[240px]"
                    title={displayName || undefined}
                  >
                    {displayName}
                  </span>
                </span>
              </button>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be signed out of your account and returned to the
                    home page.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await handleSignOut();
                      setConfirmOpen(false);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sign out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        {/* Slideshow Background */}
        {/* <div className="absolute inset-0">
          {slideImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"
                }`}
              style={{ backgroundImage: `url('${image}')` }}
            />
          ))}
        </div> */}

        {/* Slideshow indicators */}
        {/* <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {slideImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentSlide
                ? "bg-white shadow-lg"
                : "bg-white/50 hover:bg-white/70"
                }`}
            />
          ))}
        </div> */}

        <div className="container mx-auto relative z-10 h-full flex items-end pb-4 sm:pb-8 px-4">
          <div className="max-w-4xl w-full">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-6 py-4 flex flex-col justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 sm:mb-4 leading-tight text-white drop-shadow-lg text-left">
                  Functional Abilities Determination
                </h1>
                <p className="text-base md:text-lg mb-6 text-white max-w-2xl drop-shadow-lg">
                  The industries most Comprehensive On-Line Assessment Platform
                </p>
              </div>

              {/* Button aligned to bottom right */}
              {/* <div className="flex justify-end">
        <Link to="/register">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold px-8 py-3 rounded-md shadow-md transition-all duration-300"
          >
            Start Evaluation
          </Button>
        </Link>
      </div> */}
            </div>
          </div>
        </div>
      </section>

      {/* Assessment Platform Section */}
      <section className="relative overflow-hidden py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-700 text-white">
                OCCUPATIONAL TESTING & WORKPLACE WELLNESS SOLUTIONS
              </Badge>
              <h2 className="text-4xl font-bold mb-6 text-blue-100">
                Help Employers to reduce accidents, injuries and workers'
                compensation claims
              </h2>
              <p className="text-lg text-blue-100 leading-relaxed">
                Through the use of structured and industry accepted protocols
                you are able to provide high quality "easy to read" professional
                reports in less than half the time and provide a competitive
                advantage for your clinics in the local community. Your
                evaluation reports help to clearly make return to work or new
                employee acceptance criteria to assist employers in making the
                right choice for future savings through injury prevention. All
                reports and associated testing are based on peer-reviewed and
                published research to ensure consistency and medical-legal
                soundness.
              </p>
            </div>
            <div className="relative flex justify-center">
              <img
                src="/workerfacts-logo.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none select-none absolute opacity-10"
                style={{
                  width: "clamp(96px, 16vw, 220px)",
                  right: "calc(-1 * clamp(8px, 2vw, 48px))",
                  bottom: "clamp(8px, 2vw, 48px)",
                }}
              />
              <OfflineImage
                src="/close-up-bearded-neurology-specialist-checking.jpg"
                alt="Physiotherapist assisting patient with back pain assessment"
                className="relative z-10 rounded-full shadow-2xl w-80 h-80 object-cover border-4 border-white/20"
                fallbackText="Healthcare Professional"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">
              <Circle className="w-3 h-3 mr-1 fill-current" />
              SERVICES
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Grow your practice and increase revenue with our software and
              client functional ability and workplace assessment tools
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Card 1 */}
            <Card className="border-0 shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 group overflow-hidden rounded-xl">
              <div className="aspect-video relative overflow-hidden rounded-t-xl">
                <OfflineImage
                  src="/FunctionalCapacity.png"
                  alt="Functional Abilities & Capacity Evaluations"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  fallbackText="FCE"
                />
              </div>
              <CardHeader className="pt-4">
                <CardTitle className="text-lg">
                  Functional Abilities & Capacity Evaluations
                </CardTitle>
                <CardDescription>
                  Software and reporting covering all strength, range of motion
                  and occupational task testing protocols including symptom
                  magnification cross checks and observations.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 2 */}
            <Card className="border-0 shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 group overflow-hidden rounded-xl">
              <div className="aspect-video relative overflow-hidden rounded-t-xl">
                <OfflineImage
                  src="/Job_demands.png"
                  alt="Job Demands Analysis"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  fallbackText="Job Analysis"
                />
              </div>
              <CardHeader className="pt-4">
                <CardTitle className="text-lg">Job Demands Analysis</CardTitle>
                <CardDescription>
                  The reports document physical ability criteria, weight,
                  distance and repetition for essential and critical demands as
                  well as imagery from the workplace in an easy-to-read
                  professional report.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 3 */}
            <Card className="border-0 shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 group overflow-hidden rounded-xl">
              <div className="aspect-video relative overflow-hidden rounded-t-xl">
                <OfflineImage
                  src="/Copilot_20250609_184324-min.png"
                  alt="Post-Offer Pre-Employment Screening"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  fallbackText="Pre-Employment"
                />
              </div>
              <CardHeader className="pt-4">
                <CardTitle className="text-lg">
                  Post-Offer Pre-Employment Screening
                </CardTitle>
                <CardDescription>
                  The physical capabilities of the applicant are compared to the
                  essential physical demands of the job resulting in a match
                  between the individual’s demonstrated capabilities and the
                  physical requirements of the job.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 4 */}
            <Card className="border-0 shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 group overflow-hidden rounded-xl">
              <div className="aspect-video relative overflow-hidden rounded-t-xl">
                <OfflineImage
                  src="/Rehab-min.jpg"
                  alt="Rehab Baseline / Progress Checks"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  fallbackText="Rehabilitation"
                />
              </div>
              <CardHeader className="pt-4">
                <CardTitle className="text-lg">
                  Rehab Baseline / Progress Checks
                </CardTitle>
                <CardDescription>
                  An overview of patients' ability and function to document
                  baseline and progress monitoring for range of motion, muscle
                  testing and physical tasks directed at the area of
                  work-related injury.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Platform Overview Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-100 text-blue-700">
                <Circle className="w-3 h-3 mr-1 fill-current" />
                OVERVIEW
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Web-based multiplatform clinical evaluation software
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                From worksite multiplatform assessment of essential and critical
                demands of the employee to new hire and post injury testing, we
                have developed time saving solutions to meet the demands of your
                clinic. Saving time and providing professional reports to help
                you save costs and to increase revenue through additional
                service offerings. Our research-based assessments help to build
                trust and professional report generation capabilities to meet
                your needs.
              </p>
            </div>
            <div className="relative perspective-1000">
              {/* Compact 3D Connected Gallery */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 shadow-inner min-h-[400px]">
                {/* Connecting Lines Between Images */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-5"
                  style={{ transform: "perspective(1000px) rotateX(5deg)" }}
                >
                  <defs>
                    <linearGradient
                      id="connectionGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        style={{ stopColor: "#3b82f6", stopOpacity: 0.3 }}
                      />
                      <stop
                        offset="50%"
                        style={{ stopColor: "#8b5cf6", stopOpacity: 0.2 }}
                      />
                      <stop
                        offset="100%"
                        style={{ stopColor: "#06b6d4", stopOpacity: 0.3 }}
                      />
                    </linearGradient>
                  </defs>

                  {/* Connection lines between documents */}
                  <path
                    d="M120,120 Q200,100 280,140"
                    stroke="url(#connectionGradient)"
                    strokeWidth="2"
                    fill="none"
                    className="animate-pulse"
                    strokeDasharray="5,5"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;-10"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </path>
                  <path
                    d="M280,140 Q360,120 440,160"
                    stroke="url(#connectionGradient)"
                    strokeWidth="2"
                    fill="none"
                    className="animate-pulse delay-75"
                    strokeDasharray="5,5"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;-10"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </path>
                  <path
                    d="M280,200 Q320,240 380,280"
                    stroke="url(#connectionGradient)"
                    strokeWidth="2"
                    fill="none"
                    className="animate-pulse delay-150"
                    strokeDasharray="5,5"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;-10"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </path>
                  <path
                    d="M180,280 Q240,260 300,240"
                    stroke="url(#connectionGradient)"
                    strokeWidth="2"
                    fill="none"
                    className="animate-pulse delay-100"
                    strokeDasharray="5,5"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;-10"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>

                {/* Complete FCE Report - Top Left */}
                <div
                  className="absolute left-8 top-2 z-20"
                  style={{
                    transform:
                      "perspective(1000px) rotateY(-20deg) rotateX(8deg) translateZ(15px)",
                  }}
                >
                  <div className="group cursor-pointer">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden transform group-hover:scale-110 group-hover:translateZ-6 transition-all duration-500 hover:shadow-xl hover:z-50">
                      <OfflineImage
                        src="/3d-overview/fce-report.webp"
                        alt="Complete FCE Report with Pain Assessment"
                        className="w-44 h-56 object-contain bg-white p-1"
                        fallbackText="FCE Report"
                      />
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-red-500/90 text-white px-2 py-1 rounded text-xs font-medium">
                          Advanced Reporting
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Rating - Center Top */}
                <div
                  className="absolute left-1/2 top-6 transform -translate-x-1/2 z-30"
                  style={{
                    transform:
                      "perspective(1000px) translateX(-50%) rotateY(0deg) rotateX(8deg) translateZ(25px)",
                  }}
                >
                  <div className="group cursor-pointer">
                    <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden transform group-hover:scale-115 group-hover:translateZ-8 transition-all duration-500 hover:shadow-2xl hover:z-50">
                      <img
                        src="/3d-overview/activity-rating-chart.webp"
                        alt="Activity Rating"
                        className="w-52 h-40 object-contain bg-white p-1"
                      />
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-blue-500/90 text-white px-2 py-1 rounded text-xs font-medium">
                          Perceived Exertion
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FACTS Results - Top Right */}
                <div
                  className="absolute right-8 top-4 z-20"
                  style={{
                    transform:
                      "perspective(1000px) rotateY(20deg) rotateX(8deg) translateZ(15px)",
                  }}
                >
                  <div className="group cursor-pointer">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden transform group-hover:scale-110 group-hover:translateZ-6 transition-all duration-500 hover:shadow-xl hover:z-50">
                      <img
                        src="/3d-overview/facts-test-results.webp"
                        alt="FACTS Results"
                        className="w-44 h-52 object-contain bg-white p-1"
                      />
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-purple-500/90 text-white px-2 py-1 rounded text-xs font-medium">
                          ROM Testing
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pain Body Mapping - Bottom Left */}
                <div
                  className="absolute left-12 bottom-6 z-25"
                  style={{
                    transform:
                      "perspective(1000px) rotateY(-12deg) rotateX(8deg) translateZ(20px)",
                  }}
                >
                  <div className="group cursor-pointer">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden transform group-hover:scale-110 group-hover:translateZ-6 transition-all duration-500 hover:shadow-xl hover:z-50">
                      <div className="w-40 h-32 bg-white p-2 flex items-center justify-center">
                        <div className="flex space-x-1">
                          <img
                            src="/humanBody/front_view.png"
                            alt="Front View"
                            className="w-8 h-14 object-contain"
                          />
                          <img
                            src="/humanBody/back_view.png"
                            alt="Back View"
                            className="w-8 h-14 object-contain"
                          />
                        </div>
                        <div className="ml-2 text-xs text-gray-600">
                          <div className="font-semibold text-xs mb-1">
                            Pain Map
                          </div>
                          <div className="flex items-center space-x-1">
                            <Circle className="w-1.5 h-1.5 text-red-500 fill-current" />
                            <span className="text-xs">Primary</span>
                          </div>
                        </div>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-green-500/90 text-white px-2 py-1 rounded text-xs font-medium">
                          Body Mapping
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FACTS Pinch Strength Test - Bottom Right */}
                <div
                  className="absolute right-12 bottom-8 z-15"
                  style={{
                    transform:
                      "perspective(1000px) rotateY(15deg) rotateX(8deg) translateZ(10px)",
                  }}
                >
                  <div className="group cursor-pointer">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden transform group-hover:scale-110 group-hover:translateZ-6 transition-all duration-500 hover:shadow-xl hover:z-50">
                      <img
                        src="/3d-overview/facts-pinch-strength.webp"
                        alt="FACTS Pinch Strength Test Results"
                        className="w-44 h-44 object-contain bg-white p-1"
                      />
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-orange-500/90 text-white px-2 py-1 rounded text-xs font-medium">
                          Strength Testing
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Flow Indicators */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-20 left-32 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-60"></div>
                  <div className="absolute top-28 right-32 w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75 opacity-60"></div>
                  <div className="absolute bottom-24 left-1/2 w-2 h-2 bg-green-400 rounded-full animate-pulse delay-150 opacity-60"></div>
                  <div className="absolute bottom-20 right-1/4 w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75 opacity-60"></div>
                  <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-400 rounded-full animate-bounce delay-150 opacity-60"></div>
                </div>

                {/* Progress Flow Indicator */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="w-6 h-0.5 bg-gradient-to-r from-blue-400 to-green-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-75"></div>
                    <div className="w-6 h-0.5 bg-gradient-to-r from-green-400 to-purple-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Points Section */}
      <section className="relative overflow-hidden py-20 px-4 bg-blue-600 text-white">
        <img
          src="/workerfacts-logo.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute top-6 left-6 opacity-10 w-64 sm:w-72 md:w-80 lg:w-96"
        />
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src="/Key_Points-min.jpg"
                alt="Healthcare professionals collaborating with technology"
                className="rounded-lg shadow-2xl w-full hover:shadow-3xl transition-shadow duration-300"
              />
            </div>
            <div>
              <Badge className="mb-4 bg-blue-700 text-white">
                🔑 KEYPOINTS
              </Badge>
              <h2 className="text-4xl font-bold mb-6 text-blue-100">
                Not just software. We give you valuable tools and resources to
                help you grow your business
              </h2>
              <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                Our reports are industry accepted and most importantly seen as
                clinically concise and accurate information resources when an
                employer or case manager is making a new hire or return to work
                decision
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-blue-100">
                    1. Motivate and Engage Patients
                  </h3>
                  <p className="text-blue-100">
                    Providing rehab baseline and evaluation assessments help to
                    motivate patients and to ensure positive outcomes for your
                    practice. The same reports help to build a consistent and
                    professional means of communicating progress and clinical
                    effectiveness to the payor community.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 text-blue-100">
                    2. Drive New Revenue Sources
                  </h3>
                  <p className="text-blue-100">
                    From building new employer relationships with the
                    job/physical demands assessments or with our new hire or
                    RTW, employers will see your facility as a unique and
                    qualified resource for all their injury and injury
                    prevention needs. Secondarily the reports provide a
                    competitive advantage in the community and separate you when
                    communicating with case managers or payor clients.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 text-blue-100">
                    3. Increase Profitability and Efficiency
                  </h3>
                  <p className="text-blue-100">
                    By completing the reports in less than half the time you
                    save clinical cost and increase efficiency. The reports also
                    provide a consistent and professional look and feel for your
                    practice which will result in a positive opportunity for
                    future referrals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">
              <Circle className="w-3 h-3 mr-1 fill-current" />
              FEATURES
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What makes us different?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <Card className="border-0 shadow-lg p-6 bg-blue-500 text-white rounded-xl">
              <div className="mb-6">
                <Globe className="h-12 w-12 text-white mb-4" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white">Web-Based</h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                Complete your reports at your own convenience after hours or at
                home without hardware, software or IT infrastructure.
              </p>
              <div className="mt-6 pt-4 border-t border-white/20">
                <div className="flex items-center mb-3">
                  <div className="bg-white/20 p-2 rounded-lg mr-3">
                    <Tablet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">
                      Viewable on Phone/Tablet
                    </h4>
                  </div>
                </div>
                <p className="text-white/90">
                  The program is fully scalable and viewable on your phone or
                  tablet for ease of use.
                </p>
              </div>
            </Card>

            <Card className="border-0 shadow-lg p-6 bg-blue-600 text-white">
              <div className="mb-4">
                <CheckCircle className="h-12 w-12 text-blue-200" />
              </div>
              <h3 className="text-xl font-bold mb-3">Evidence-Based</h3>
              <p className="text-blue-100">
                All protocols are based on peer-reviewed and published research
                with clear instructions and protocols to ensure a solid legally
                sound representation of the clients abilities demonstrated.
              </p>
            </Card>

            <Card className="border-0 shadow-lg p-6 bg-blue-700 text-white">
              <div className="mb-4">
                <BarChart3 className="h-12 w-12 text-blue-200" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Automatic Report Generation & Customization
              </h3>
              <p className="text-blue-100">
                Reports are automatically generated including all required
                calculations for efficient review and thus check compliance to
                normative data and show key findings interpretation and even
                post download customization at both a PDF and Word-based
                template are provided to you.
              </p>
            </Card>

            <Card className="border-0 shadow-lg p-6 bg-blue-500 text-white">
              <div className="mb-4">
                <Shield className="h-12 w-12 text-blue-200" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Secure Access and Patient Information Protection
              </h3>
              <p className="text-blue-100">
                No client data is kept on the site – this means no injury
                information, client demographics or testing data. Once the
                evaluation is completed and you have downloaded the reports then
                the report is no longer kept online.
              </p>
            </Card>

            <Card className="border-0 shadow-lg p-6 bg-blue-600 text-white">
              <div className="mb-4">
                <Users className="h-12 w-12 text-blue-200" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Multi-Evaluation Ability
              </h3>
              <p className="text-blue-100">
                A consistent look and feel to your evaluations are important
                with all business completed. This provides a clear message to
                the payor community that you are a premium service provider, and
                they will know exactly what report quality they can expect. All
                evaluations will have a similar cover page, graphics, reference
                support pages and imagery to ensure a consistent “look and
                feel”.
              </p>
            </Card>

            <Card className="border-0 shadow-lg p-6 bg-blue-700 text-white">
              <div className="mb-4">
                <ThumbsUp className="h-12 w-12 text-blue-200" />
              </div>
              <h3 className="text-xl font-bold mb-3">Easy to Use </h3>
              <p className="text-blue-100">
                Instructional help screens and clinical testing directions
                provide a straightforward approach while the ability to include
                both test data and observational content summaries without the
                burden of calculating co-efficient of variation measures or
                left/right deficiencies etc. makes the software flow smoothly.
                You are able to select either standardized protocols or select
                individual tests based on your clinics testing availability
                making each report custom to your operation.
              </p>
            </Card>

            <Card className="border-0 shadow-lg p-6 bg-blue-500 text-white">
              <div className="mb-4">
                <Calendar className="h-12 w-12 text-blue-200" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Professional Appearance
              </h3>
              <p className="text-blue-100">
                From custom logo imprinted cover pages and contents pages to
                standardized referral questions and imagery, the report will
                always be seen as a step above the competition. The software
                guides you through the decision-making process such that the
                final report is as clear and concise as possible.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">
              <Circle className="w-3 h-3 mr-1 fill-current" />
              TESTIMONIALS
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What our clients say about us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <Card className="border-0 shadow-lg p-6">
              <div className="mb-4">
                <Quote className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-gray-600 mb-4 italic">
                "The reports clearly demonstrated the fit for the duties of the
                employees post injury and we were able to utilize the
                information in the development of RTW goals and modified work
                structure."
              </p>
              <div className="flex items-center space-x-3">
                <img
                  src="/testimonials/health-safety-professional.jpg"
                  alt="Employee health and Safety Professional"
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 hover:border-blue-400 transition-colors duration-300"
                />
                <div>
                  <p className="font-semibold text-gray-900 text-left whitespace-nowrap">
                    Employer health & Safety Professional
                  </p>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-lg p-6">
              <div className="mb-4">
                <Quote className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-gray-600 mb-4 italic">
                "The evaluation software is simple and easy to use yet provides
                a quality and professional appearance for our clinics. Without
                the software we simply couldn't be competitive on price /
                evaluation due to the time involvement in completing the
                reports"
              </p>
              <div className="flex items-center space-x-3">
                <img
                  src="/testimonials/physical-therapist.jpg"
                  alt="Physical Therapist"
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 hover:border-blue-400 transition-colors duration-300"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    Owner, PT Clinic
                  </p>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-lg p-6">
              <div className="mb-4">
                <Quote className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-gray-600 mb-4 italic">
                "Report quality is critical to determining future work capacity.
                The software provide the comprehensive reporting including
                convincing the employer and physician on current evaluation of
                the patient or client. The reports provide answers to each of my
                referral questions and also display images to document client
                performance and how the client compares overall to industry
                normative data. All these areas are important for me to do the
                best job possible for the injured employee."
              </p>
              <div className="flex items-center space-x-3">
                <img
                  src="/testimonials/case-manager.jpg"
                  alt="Case Manager"
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 hover:border-blue-400 transition-colors duration-300"
                />
                <div>
                  <p className="font-semibold text-gray-900">Case Manager</p>
                </div>
              </div>
            </Card>

            {/* Added from provided images */}
            <Card className="border-0 shadow-lg p-6">
              <div className="mb-4">
                <Quote className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-gray-600 mb-4 italic">
                "I use the rehab baseline and progress checks to document
                rationale for increased visits, and the payors appreciate the
                way it clearly shows the treatment effectiveness and positive
                outcomes."
              </p>
              <div className="flex items-center space-x-3">
                <img
                  src="/testimonials/occupational-therapist.jpg"
                  alt="Occupational Therapist"
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 hover:border-blue-400 transition-colors duration-300"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    Occupational Therapist
                  </p>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-lg p-6">
              <div className="mb-4">
                <Quote className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-gray-600 mb-4 italic">
                "The Functional Abilities and Capacity Evaluations provide me
                with the client’s abilities determination and the symptom
                magnification crosschecks which assist me in making an informed
                RTW decision. The report is also the foundation for my
                Independent Medical Examinations."
              </p>
              <div className="flex items-center space-x-3">
                <img
                  src="/testimonials/occupational-health-physician.jpg"
                  alt="Occupational Health Physician"
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 hover:border-blue-400 transition-colors duration-300"
                />
                <p className="font-semibold text-gray-900">
                  Occupational Health Physician
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <img
                  src="/workerfacts-logo.png"
                  alt="WorkerFacts"
                  className="h-10 w-auto"
                />
                <h3 className="text-xl font-bold">WorkerFacts</h3>
              </div>
              <p className="text-gray-300 mb-6 max-w-md">
                Workerfacts is dedicated to providing the best possible and up
                to date research-based reporting for your clinical and employer
                base assessments
              </p>
              <Button
                onClick={() => openPopup("contact")}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Request Demo
              </Button>
            </div>

            <div className="text-right">
              <h4 className="text-xl font-bold mb-4">Get in touch</h4>
              <div className="flex items-center justify-end space-x-2 mb-6">
                <Mail className="h-5 w-5 text-gray-400" />
                <span className="text-gray-300">workerfacts@gmail.com</span>
              </div>

              {/* YouTube Demo Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  onClick={() => openVideoPopup("fce_software_tour")}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg font-semibold group"
                >
                  <Play className="h-5 w-5 group-hover:animate-pulse" />
                  <span>FCE Software Tour</span>
                </button>
                <button
                  onClick={() => openVideoPopup("website_report_overview")}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg font-semibold group"
                >
                  <Play className="h-5 w-5 group-hover:animate-pulse" />
                  <span>Website & Report Overview</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>&copy; WorkerFacts 2025</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <button
                onClick={() => setActivePopup("privacy")}
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </button>
              <span className="text-gray-300">Powered by Axzora® IT</span>
            </div>
          </div>
        </div>
      </footer>

      {/* About Us Popup */}
      <Dialog open={activePopup === "about"} onOpenChange={closePopup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-2xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={closePopup}
                className="mr-3 p-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              About Us
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-orange-500">250+</div>
                <div className="text-gray-600">Clients</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-500">15</div>
                <div className="text-gray-600">Team Members</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-500">100%</div>
                <div className="text-gray-600">Satisfaction</div>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">
              With over twenty years of experience in Functional Abilities
              Determination and Workplace Assessments, our team of clinicians
              has experience in all avenues of injury assessment and
              preventative evaluations for Industry. From employment screening
              and ergonomic workstation evaluations to medically legally sound
              Functional Abilities and Capacity Testing for Fit for Duties, we
              have researched the markets most accepted protocols and procedures
              to bring you the most up to date and marketable software solutions
            </p>
            <div className="flex items-center space-x-3 pt-4 border-t">
              <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-lg">RG</span>
              </div>
              <div>
                <div className="font-semibold">Ray Gagne</div>
                <div className="text-gray-600">CEO</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evaluations Popup */}
      <Dialog open={activePopup === "evaluations"} onOpenChange={closePopup}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-2xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={closePopup}
                className="mr-3 p-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              Evaluations Available
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">100+</div>
              <div className="text-gray-600">Customized Evaluations</div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Functional Abilities and Capacity Evaluations
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  A detailed software program covering all strength, range of
                  motion and occupational task testing protocols. Automatic
                  determination of symptom magnification criteria from testing
                  as well as observational content is completed to provide you
                  with all pertinent data to make your Return-to-Work decisions.
                  To ensure your work is the most professional, you have
                  provided with structured narratives, referral source questions
                  and even client images to provide the best quality report that
                  will keep your payors referring and to separate you out from
                  the competition. A PDF and a Word format are downloaded after
                  completion in the case that additional customization is
                  required on your end
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Job Demands Analysis (Coming soon)
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  A detailed software program that allows you to quickly
                  complete an employer on-site Job Demands / Physical Demands
                  Assessment of a work environment. The accepted protocols are
                  divided by Physical Demand criteria, weight, distance and
                  repetition as required. Each final report has access to
                  imagery from the workplace and provides an easy-to-read
                  professional report. All reports are broken down into
                  categories including: sedentary, general, material handling /
                  strength, mobility and posture, psychological, sensory, work
                  environment conditions and detailed summary of key essential
                  duties and critical demands
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Post-Offer Pre-Employment Screening (Coming soon)
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  This is an evaluation that is conducted following an offer of
                  employment. Post-offer/Pre-employment Evaluations usually
                  involve medical examinations. Physical ability testing and
                  drug screening are not considered medical evaluations;
                  however, they may be components of the
                  Post-offer/Pre-employment Evaluation. The outcome of this type
                  of evaluation depends on the jurisdiction in which it is
                  implemented. Post offer screening is a valid and reliable tool
                  for identifying applicants' physical capabilities. The
                  physical capabilities of the applicant are then compared to
                  the essential physical demands of the job. The outcome of post
                  offer screening is to determine if there is a match between
                  the individual's functional capabilities and the physical
                  requirements of the job. Legally, these tests must be applied
                  consistently to all applicants who must be offered the job,
                  prior to testing, on the condition that they meet the physical
                  requirements of the job (ADA, 1990). A comprehensive post
                  offer screen includes the following components:
                </p>
                <ul className="list-disc list-inside text-gray-700 text-sm mt-2 space-y-1">
                  <li>Accurate job/Physical demands analysis (JDA/PDA)</li>
                  <li>Clear acceptable criteria</li>
                  <li>Physical screen</li>
                  <li>Standardized objective testing</li>
                  <li>Occupational and job specific testing</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Rehab Baseline / Progress Checks (Coming soon)
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Baseline Evaluation: A general overview of patients' ability
                  and function in relation to range of motion of extremities,
                  total spine and muscle testing (both extremity and back) -
                  includes ability for patient images as well as documentation
                  of injury and rehab direction. Progress Checks: A detailed
                  comparison of pre to post rehab progress for strength and
                  range of motion with graphical images to depict positive
                  clinical interaction
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <p className="text-xs text-gray-600 italic">
                    *Our Evaluation battery is ever growing so please continue
                    to check regularly for updates and opportunities in your
                    local market
                  </p>
                  <div className="mt-2 text-xs text-gray-600">
                    <p>
                      <strong>Note:</strong>
                    </p>
                    <p>
                      1. All reports are downloaded in a PDF and a Word format
                      for you at the end to allow for full flexibility of use
                      and customization.
                    </p>
                    <p>
                      2. Once reports are downloaded NO copy of client
                      information or reports are saved in any manner on the
                      site.
                    </p>
                    <p>
                      3. Access to supportive research is provided on each
                      report and accessible online.
                    </p>
                    <p>
                      4. Multi-use membership and registration of testing for a
                      multi-user is available and would provide additional
                      discounts/evaluation and would allow facility logs and
                      details to be saved for each report service.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Us Popup */}
      <Dialog open={activePopup === "contact"} onOpenChange={closePopup}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-2xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={closePopup}
                className="mr-3 p-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              Get in Touch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-gray-600 space-y-2">
              <p>
                Book a demonstration of the software and get immediate access to
                a brief video and overview
              </p>
              <p>
                Select your evaluation type and we will forward a link and
                access code to review an online demonstration of the associated
                evaluation with a video that you can view at your convenience
              </p>
            </div>

            {showContactSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-600 mb-2">
                  Thank You!
                </h3>
                <p className="text-gray-600 mb-4">
                  Thank you for your interest! We will contact you soon to
                  discuss your evaluation needs.
                </p>
                <div className="text-sm text-gray-500">
                  This window will close automatically...
                </div>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="contact-name">Name*</Label>
                  <Input
                    id="contact-name"
                    required
                    value={contactForm.name}
                    onChange={(e) =>
                      handleContactFormChange("name", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="contact-clinic">Clinic Name*</Label>
                  <Input
                    id="contact-clinic"
                    required
                    value={contactForm.clinicName}
                    onChange={(e) =>
                      handleContactFormChange("clinicName", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="contact-email">Email*</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) =>
                      handleContactFormChange("email", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="contact-phone">Phone Number</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) =>
                      handleContactFormChange("phone", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>
                    Type of Evaluation interested in (select multiple evaluation
                    types):
                  </Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value="functional"
                        checked={contactForm.evaluationTypes.includes(
                          "functional",
                        )}
                        onChange={(e) =>
                          handleEvaluationTypeChange(
                            "functional",
                            e.target.checked,
                          )
                        }
                        className="text-blue-600 rounded"
                      />
                      <span className="text-sm">
                        Functional Abilities and Capacity Evaluation / Fit for
                        Duties / Return to Work
                      </span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value="job-demands"
                        checked={contactForm.evaluationTypes.includes(
                          "job-demands",
                        )}
                        onChange={(e) =>
                          handleEvaluationTypeChange(
                            "job-demands",
                            e.target.checked,
                          )
                        }
                        className="text-blue-600 rounded"
                      />
                      <span className="text-sm">
                        Job / Physical Demands Analysis (JDA / PDA)
                      </span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value="pre-employment"
                        checked={contactForm.evaluationTypes.includes(
                          "pre-employment",
                        )}
                        onChange={(e) =>
                          handleEvaluationTypeChange(
                            "pre-employment",
                            e.target.checked,
                          )
                        }
                        className="text-blue-600 rounded"
                      />
                      <span className="text-sm">
                        Post Offer Pre-Employment Screening
                      </span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value="rehab"
                        checked={contactForm.evaluationTypes.includes("rehab")}
                        onChange={(e) =>
                          handleEvaluationTypeChange("rehab", e.target.checked)
                        }
                        className="text-blue-600 rounded"
                      />
                      <span className="text-sm">
                        Rehab Baseline and Progress Evaluations
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact-comments">Additional comments</Label>
                  <Textarea
                    id="contact-comments"
                    value={contactForm.comments}
                    onChange={(e) =>
                      handleContactFormChange("comments", e.target.value)
                    }
                    className="mt-1 h-24"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Popup */}
      <Dialog open={activePopup === "pricing"} onOpenChange={closePopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-2xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={closePopup}
                className="mr-3 p-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              Pricing
            </DialogTitle>
          </DialogHeader>
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-2xl font-bold mb-2">Pricing</h3>
              <p className="text-gray-600 text-sm">
                Simple, transparent pricing for FCE evaluations
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Evaluation Report</span>
                  <span className="font-semibold text-lg">$25.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Processing Fee</span>
                  <span className="font-semibold">$0.00</span>
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-xl font-bold text-green-600">
                    $25.00 USD
                  </span>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-600">
                <p>• Complete FCE evaluation report</p>
                <p>• Downloadable PDF and DOC formats</p>
                <p>• Professional medical documentation</p>
                <p>• No hidden fees or charges</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Popup */}
      <Dialog open={activePopup === "privacy"} onOpenChange={closePopup}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-2xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={closePopup}
                className="mr-3 p-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              Privacy Policy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-sm leading-relaxed justify-paragraphs">
            <div className="text-gray-600">
              <p>
                <strong>Effective Date:</strong> September 1, 2025
              </p>
              <p>
                <strong>Last Updated:</strong> September 1, 2025
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                1. Introduction
              </h3>
              <p className="text-gray-700 mb-4">
                WorkerFacts ("we," "our," or "us") is committed to protecting
                your privacy and maintaining the confidentiality of your
                personal and health information. This Privacy Policy describes
                how we collect, use, disclose, and safeguard your information
                when you use our evaluation software platform and services.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                2. Information We Collect
              </h3>
              <div className="space-y-3 text-gray-700">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Personal and Company / Clinic Information:
                  </h4>
                  <p>
                    • Name, contact information, and professional credentials
                  </p>
                  <p>• Account login credentials and user preferences</p>
                  <p>• Payment and billing information</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    Health Information (PHI):
                  </h4>
                  <p>
                    • All evaluation results and assessments are deleted once
                    the report is completed and downloaded – no health
                    information is stored on this site.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    Technical Information:
                  </h4>
                  <p>• Device information, IP addresses, and usage analytics</p>
                  <p>• System logs and performance data</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                3. How We Use Your Information
              </h3>
              <div className="text-gray-700 space-y-2">
                <p>
                  • <strong>Clinical Services:</strong> Provide evaluation
                  assessments, generate reports, and support clinical decisions
                </p>
                <p>
                  • <strong>Account Management:</strong> Only selected user
                  profile information is collected in order to maintain user
                  accounts, process payments, and provide customer support
                </p>
                <p>
                  • <strong>Legal Compliance:</strong> Meet healthcare
                  regulations, legal requirements, and professional standards
                </p>
                <p>
                  • <strong>Quality Improvement:</strong> Enhance our software
                  functionality and clinical accuracy
                </p>
                <p>
                  • <strong>Communication:</strong> Send service updates,
                  technical support, and administrative notices
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                4. HIPAA Compliance
              </h3>
              <p className="text-gray-700 mb-4">
                As a healthcare technology provider, we are committed to full
                compliance with the Health Insurance Portability and
                Accountability Act (HIPAA). We serve as a Business Associate for
                covered entities and:
              </p>
              <div className="text-gray-700 space-y-1">
                <p>
                  • Implement comprehensive safeguards for Protected Health
                  Information (PHI)
                </p>
                <p>
                  • Execute Business Associate Agreements (BAAs) with healthcare
                  providers
                </p>
                <p>• Conduct regular security assessments and staff training</p>
                <p>
                  • Maintain detailed audit logs of all PHI access and
                  modifications
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                5. Data Security
              </h3>
              <div className="text-gray-700 space-y-2">
                <p>
                  • <strong>Encryption:</strong> All data is encrypted in
                  transit and at rest using industry-standard protocols
                </p>
                <p>
                  • <strong>Access Controls:</strong> Role-based access with
                  multi-factor authentication
                </p>
                <p>
                  • <strong>Infrastructure:</strong> Secure cloud hosting with
                  regular security monitoring
                </p>
                <p>
                  • <strong>Compliance:</strong> SOC 2 Type II certified
                  infrastructure and regular penetration testing
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                6. Information Sharing
              </h3>
              <div className="text-gray-700 space-y-2">
                <p>
                  We may share your information only in the following
                  circumstances:
                </p>
                <p>
                  • <strong>With Your Consent:</strong> When you explicitly
                  authorize disclosure
                </p>
                <p>
                  • <strong>Legal Requirements:</strong> When required by law,
                  court order, or regulatory authority
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                7. Your Rights
              </h3>
              <div className="text-gray-700 space-y-2">
                <p>
                  • <strong>Access:</strong> Request copies of your personal
                  information
                </p>
                <p>
                  • <strong>Correction:</strong> Request amendments to
                  inaccurate information
                </p>
                <p>
                  • <strong>Restriction:</strong> Request limitations on use or
                  disclosure of your information
                </p>
                <p>
                  • <strong>Portability:</strong> Receive your data in a
                  structured, machine-readable format
                </p>
                <p>
                  • <strong>Deletion:</strong> Request deletion of your
                  information (subject to legal and clinical requirements)
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                8. Data Retention
              </h3>
              <p className="text-gray-700 mb-2">
                We retain your information for solely the user / evaluator
                profile for as long as necessary to:
              </p>
              <div className="text-gray-700 space-y-1">
                <p>• Provide ongoing clinical services and support</p>
                <p>
                  • Meet legal and regulatory requirements (typically 7-10 years
                  for medical records)
                </p>
                <p>• Resolve disputes and enforce our agreements</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                9. International Data Transfers
              </h3>
              <p className="text-gray-700">
                Your information is primarily stored and processed in secure
                facilities within your country. Any international transfers are
                conducted with appropriate safeguards and in compliance with
                applicable privacy laws.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                10. Contact Information
              </h3>
              <div className="text-gray-700 space-y-2">
                <p>
                  For privacy-related questions or to exercise your rights,
                  contact us:
                </p>
                <p>
                  <strong>Email:</strong> workerfacts@gmail.com
                </p>
                <p>
                  <strong>Reference:</strong> Privacy
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                11. Changes to This Policy
              </h3>
              <p className="text-gray-700">
                We may update this Privacy Policy periodically to reflect
                changes in our practices or applicable laws. We will notify you
                of material changes through our platform or by email. Your
                continued use of our services after such notification
                constitutes acceptance of the updated policy.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                Healthcare Provider Notice
              </h4>
              <p className="text-blue-800 text-sm">
                If you are a healthcare provider using WorkerFacts as part of
                your clinical practice, you remain responsible for obtaining
                appropriate patient consent and maintaining compliance with all
                applicable healthcare regulations in your jurisdiction.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Info Popup */}
      <VideoInfoPopup
        isOpen={showVideoPopup}
        onClose={closeVideoPopup}
        video={selectedVideo}
      />

      {/* Cache Status Indicator */}
      <CacheStatus />
    </div>
  );
}
