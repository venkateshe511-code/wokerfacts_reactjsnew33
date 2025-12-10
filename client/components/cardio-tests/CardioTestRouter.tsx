import React from "react";
import BruceTreadmillTest from "./BruceTreadmillTest";
import MCAFTTest from "./MCAFTTest";
import KASCHStepTest from "./KASCHStepTest";
import YMCAStepTest from "./YMCAStepTest";
import YMCASubmaximalTreadmillTest from "./YMCASubmaximalTreadmillTest";
import { SerializedImage } from "@/lib/cardio-utils";

interface CardioTestData {
  // Bruce Treadmill Test
  classification?: string;
  vo2MaxScore?: string;
  // mCAFT Test
  predictedVO2Max?: string;
  hbr?: string;
  // KASCH Step Test
  aerobicFitnessScore?: string;
  // YMCA Step Test
  // (uses classification and vo2MaxScore like Bruce Test)
  // YMCA Submaximal Treadmill Test
  vo2Max?: string;
  heartRate?: string;
  bloodPressure?: string;
  rpe?: string;
  // Common
  clientImages?: File[];
  serializedImages?: SerializedImage[];
}

interface Props {
  testId: string;
  testName: string;
  onSave: (data: CardioTestData) => void;
  initialData?: CardioTestData;
}

export default function CardioTestRouter({
  testId,
  testName,
  onSave,
  initialData,
}: Props) {
  // Determine which cardio test to render based on test ID/name
  const renderCardioTest = () => {
    const lowerTestName = testName.toLowerCase();
    const lowerTestId = testId.toLowerCase();

    if (
      lowerTestId.includes("bruce") ||
      (lowerTestName.includes("bruce") && !lowerTestName.includes("ymca"))
    ) {
      return (
        <BruceTreadmillTest
          onSave={(data) =>
            onSave({
              classification: data.classification,
              vo2MaxScore: data.vo2MaxScore,
              clientImages: data.clientImages,
              serializedImages: data.serializedImages,
            })
          }
          initialData={{
            classification: initialData?.classification,
            vo2MaxScore: initialData?.vo2MaxScore,
            clientImages: initialData?.clientImages,
            serializedImages: initialData?.serializedImages,
          }}
        />
      );
    }

    if (lowerTestId.includes("ymca") && lowerTestId.includes("step")) {
      return (
        <YMCAStepTest
          onSave={(data) =>
            onSave({
              classification: data.classification,
              vo2MaxScore: data.vo2MaxScore,
              clientImages: data.clientImages,
              serializedImages: data.serializedImages,
            })
          }
          initialData={{
            classification: initialData?.classification,
            vo2MaxScore: initialData?.vo2MaxScore,
            clientImages: initialData?.clientImages,
            serializedImages: initialData?.serializedImages,
          }}
        />
      );
    }

    if (lowerTestName.includes("ymca") && lowerTestName.includes("step")) {
      return (
        <YMCAStepTest
          onSave={(data) =>
            onSave({
              classification: data.classification,
              vo2MaxScore: data.vo2MaxScore,
              clientImages: data.clientImages,
              serializedImages: data.serializedImages,
            })
          }
          initialData={{
            classification: initialData?.classification,
            vo2MaxScore: initialData?.vo2MaxScore,
            clientImages: initialData?.clientImages,
            serializedImages: initialData?.serializedImages,
          }}
        />
      );
    }

    if (lowerTestId.includes("ymca") && lowerTestId.includes("treadmill")) {
      return (
        <YMCASubmaximalTreadmillTest
          onSave={(data) =>
            onSave({
              vo2Max: data.vo2Max,
              heartRate: data.heartRate,
              bloodPressure: data.bloodPressure,
              rpe: data.rpe,
              clientImages: data.clientImages,
              serializedImages: data.serializedImages,
            })
          }
          initialData={{
            vo2Max: initialData?.vo2Max,
            heartRate: initialData?.heartRate,
            bloodPressure: initialData?.bloodPressure,
            rpe: initialData?.rpe,
            clientImages: initialData?.clientImages,
            serializedImages: initialData?.serializedImages,
          }}
        />
      );
    }

    if (lowerTestName.includes("ymca") && lowerTestName.includes("treadmill")) {
      return (
        <YMCASubmaximalTreadmillTest
          onSave={(data) =>
            onSave({
              vo2Max: data.vo2Max,
              heartRate: data.heartRate,
              bloodPressure: data.bloodPressure,
              rpe: data.rpe,
              clientImages: data.clientImages,
              serializedImages: data.serializedImages,
            })
          }
          initialData={{
            vo2Max: initialData?.vo2Max,
            heartRate: initialData?.heartRate,
            bloodPressure: initialData?.bloodPressure,
            rpe: initialData?.rpe,
            clientImages: initialData?.clientImages,
            serializedImages: initialData?.serializedImages,
          }}
        />
      );
    }

    if (lowerTestId.includes("mcaft") || lowerTestName.includes("mcaft")) {
      return (
        <MCAFTTest
          onSave={(data) =>
            onSave({
              predictedVO2Max: data.predictedVO2Max,
              hbr: data.hbr,
              clientImages: data.clientImages,
              serializedImages: data.serializedImages,
            })
          }
          initialData={{
            predictedVO2Max: initialData?.predictedVO2Max,
            hbr: initialData?.hbr,
            clientImages: initialData?.clientImages,
            serializedImages: initialData?.serializedImages,
          }}
        />
      );
    }

    if (lowerTestId.includes("kasch") || lowerTestName.includes("kasch")) {
      return (
        <KASCHStepTest
          onSave={(data) =>
            onSave({
              classification: data.classification,
              aerobicFitnessScore: data.aerobicFitnessScore,
              clientImages: data.clientImages,
              serializedImages: data.serializedImages,
            })
          }
          initialData={{
            classification: initialData?.classification,
            aerobicFitnessScore: initialData?.aerobicFitnessScore,
            clientImages: initialData?.clientImages,
            serializedImages: initialData?.serializedImages,
          }}
        />
      );
    }

    // No matching test found
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No matching cardio test found for: {testName}</p>
        <p className="text-sm text-gray-400 mt-2">
          Supported tests: Bruce Treadmill, mCAFT, KASCH Step Test, YMCA Step Test, YMCA Submaximal Treadmill Test
        </p>
      </div>
    );
  };

  return <div>{renderCardioTest()}</div>;
}

export type { CardioTestData };
