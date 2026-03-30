export type NormInfo = {
  unit: string; // e.g., 'lb', 'deg', 'bpm', ''
  left: number | null;
  right: number | null;
  category: "strength" | "rom" | "cardio" | "other";
};

// Age-gender-based norms data
export interface AgeGenderNorm {
  test: string;
  gender: string;
  age_range: string;
  side: string;
  mean: number;
}

// Hand Strength Standard norms
const handStrengthStandardNorms: AgeGenderNorm[] = [
  { test: "Hand Strength Standard", gender: "Male", age_range: "20-24", side: "Right", mean: 121.0 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "20-24", side: "Left", mean: 104.5 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "25-29", side: "Right", mean: 120.8 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "25-29", side: "Left", mean: 110.5 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "30-34", side: "Right", mean: 121.8 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "30-34", side: "Left", mean: 110.4 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "35-39", side: "Right", mean: 119.7 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "35-39", side: "Left", mean: 112.9 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "40-44", side: "Right", mean: 116.8 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "40-44", side: "Left", mean: 112.8 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "45-49", side: "Right", mean: 109.9 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "45-49", side: "Left", mean: 100.8 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "50-54", side: "Right", mean: 113.6 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "50-54", side: "Left", mean: 101.9 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "55-59", side: "Right", mean: 101.1 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "55-59", side: "Left", mean: 83.2 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "60-64", side: "Right", mean: 89.7 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "60-64", side: "Left", mean: 76.8 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "65-69", side: "Right", mean: 91.1 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "65-69", side: "Left", mean: 76.8 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "70-74", side: "Right", mean: 75.3 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "70-74", side: "Left", mean: 64.8 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "75+", side: "Right", mean: 65.7 },
  { test: "Hand Strength Standard", gender: "Male", age_range: "75+", side: "Left", mean: 55.0 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "20-24", side: "Right", mean: 70.4 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "20-24", side: "Left", mean: 61.0 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "25-29", side: "Right", mean: 74.5 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "25-29", side: "Left", mean: 63.5 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "30-34", side: "Right", mean: 78.7 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "30-34", side: "Left", mean: 68.0 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "35-39", side: "Right", mean: 74.1 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "35-39", side: "Left", mean: 66.3 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "40-44", side: "Right", mean: 70.4 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "40-44", side: "Left", mean: 62.3 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "45-49", side: "Right", mean: 62.2 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "45-49", side: "Left", mean: 59.2 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "50-54", side: "Right", mean: 56.0 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "50-54", side: "Left", mean: 53.8 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "55-59", side: "Right", mean: 57.3 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "55-59", side: "Left", mean: 47.3 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "60-64", side: "Right", mean: 55.1 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "60-64", side: "Left", mean: 45.7 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "65-69", side: "Right", mean: 49.6 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "65-69", side: "Left", mean: 41.0 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "70-74", side: "Right", mean: 49.5 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "70-74", side: "Left", mean: 41.5 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "75+", side: "Right", mean: 42.6 },
  { test: "Hand Strength Standard", gender: "Female", age_range: "75+", side: "Left", mean: 37.6 },
];

// Pinch Strength (Tip) norms
const pinchStrengthTipNorms: AgeGenderNorm[] = [
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "20-24", side: "Right", mean: 18.0 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "20-24", side: "Left", mean: 17.0 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "25-29", side: "Right", mean: 18.3 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "25-29", side: "Left", mean: 17.5 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "30-34", side: "Right", mean: 17.6 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "30-34", side: "Left", mean: 17.6 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "35-39", side: "Right", mean: 18.0 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "35-39", side: "Left", mean: 17.7 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "40-44", side: "Right", mean: 17.8 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "40-44", side: "Left", mean: 17.7 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "45-49", side: "Right", mean: 18.7 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "45-49", side: "Left", mean: 17.6 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "50-54", side: "Right", mean: 18.3 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "50-54", side: "Left", mean: 17.8 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "55-59", side: "Right", mean: 16.6 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "55-59", side: "Left", mean: 15.0 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "60-64", side: "Right", mean: 15.8 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "60-64", side: "Left", mean: 15.3 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "65-69", side: "Right", mean: 17.0 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "65-69", side: "Left", mean: 15.4 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "70-74", side: "Right", mean: 13.8 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "70-74", side: "Left", mean: 13.3 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "75+", side: "Right", mean: 14.0 },
  { test: "Pinch Strength (Tip)", gender: "Male", age_range: "75+", side: "Left", mean: 13.9 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "20-24", side: "Right", mean: 11.1 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "20-24", side: "Left", mean: 10.5 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "25-29", side: "Right", mean: 11.9 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "25-29", side: "Left", mean: 11.3 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "30-34", side: "Right", mean: 12.6 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "30-34", side: "Left", mean: 11.7 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "35-39", side: "Right", mean: 11.6 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "35-39", side: "Left", mean: 11.9 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "40-44", side: "Right", mean: 11.5 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "40-44", side: "Left", mean: 11.1 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "45-49", side: "Right", mean: 13.2 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "45-49", side: "Left", mean: 12.1 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "50-54", side: "Right", mean: 12.5 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "50-54", side: "Left", mean: 11.4 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "55-59", side: "Right", mean: 11.7 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "55-59", side: "Left", mean: 10.4 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "60-64", side: "Right", mean: 10.1 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "60-64", side: "Left", mean: 9.9 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "65-69", side: "Right", mean: 10.6 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "65-69", side: "Left", mean: 10.5 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "70-74", side: "Right", mean: 10.1 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "70-74", side: "Left", mean: 9.8 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "75+", side: "Right", mean: 9.6 },
  { test: "Pinch Strength (Tip)", gender: "Female", age_range: "75+", side: "Left", mean: 9.3 },
];

// Pinch Strength (Key) norms
const pinchStrengthKeyNorms: AgeGenderNorm[] = [
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "20-24", side: "Right", mean: 26.0 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "20-24", side: "Left", mean: 24.8 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "25-29", side: "Right", mean: 26.7 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "25-29", side: "Left", mean: 25.0 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "30-34", side: "Right", mean: 26.4 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "30-34", side: "Left", mean: 26.2 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "35-39", side: "Right", mean: 26.1 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "35-39", side: "Left", mean: 25.6 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "40-44", side: "Right", mean: 25.6 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "40-44", side: "Left", mean: 25.1 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "45-49", side: "Right", mean: 25.8 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "45-49", side: "Left", mean: 24.8 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "50-54", side: "Right", mean: 26.7 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "50-54", side: "Left", mean: 26.1 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "55-59", side: "Right", mean: 24.2 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "55-59", side: "Left", mean: 23.0 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "60-64", side: "Right", mean: 23.2 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "60-64", side: "Left", mean: 22.2 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "65-69", side: "Right", mean: 23.4 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "65-69", side: "Left", mean: 22.0 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "70-74", side: "Right", mean: 19.3 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "70-74", side: "Left", mean: 19.2 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "75+", side: "Right", mean: 20.5 },
  { test: "Pinch Strength (Key)", gender: "Male", age_range: "75+", side: "Left", mean: 19.1 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "20-24", side: "Right", mean: 17.6 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "20-24", side: "Left", mean: 16.2 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "25-29", side: "Right", mean: 17.7 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "25-29", side: "Left", mean: 16.6 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "30-34", side: "Right", mean: 18.7 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "30-34", side: "Left", mean: 17.8 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "35-39", side: "Right", mean: 16.6 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "35-39", side: "Left", mean: 16.0 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "40-44", side: "Right", mean: 16.7 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "40-44", side: "Left", mean: 15.8 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "45-49", side: "Right", mean: 17.6 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "45-49", side: "Left", mean: 16.6 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "50-54", side: "Right", mean: 16.7 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "50-54", side: "Left", mean: 16.1 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "55-59", side: "Right", mean: 15.7 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "55-59", side: "Left", mean: 14.7 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "60-64", side: "Right", mean: 15.5 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "60-64", side: "Left", mean: 14.1 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "65-69", side: "Right", mean: 15.0 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "65-69", side: "Left", mean: 14.3 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "70-74", side: "Right", mean: 14.5 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "70-74", side: "Left", mean: 13.8 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "75+", side: "Right", mean: 12.6 },
  { test: "Pinch Strength (Key)", gender: "Female", age_range: "75+", side: "Left", mean: 11.4 },
];

// Pinch Strength (Palmar) norms
const pinchStrengthPalmarNorms: AgeGenderNorm[] = [
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "20-24", side: "Right", mean: 26.6 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "20-24", side: "Left", mean: 25.7 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "25-29", side: "Right", mean: 26.0 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "25-29", side: "Left", mean: 25.1 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "30-34", side: "Right", mean: 24.7 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "30-34", side: "Left", mean: 25.4 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "35-39", side: "Right", mean: 26.2 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "35-39", side: "Left", mean: 25.9 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "40-44", side: "Right", mean: 24.5 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "40-44", side: "Left", mean: 24.8 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "45-49", side: "Right", mean: 24.0 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "45-49", side: "Left", mean: 23.7 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "50-54", side: "Right", mean: 23.8 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "50-54", side: "Left", mean: 24.0 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "55-59", side: "Right", mean: 23.7 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "55-59", side: "Left", mean: 21.3 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "60-64", side: "Right", mean: 21.8 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "60-64", side: "Left", mean: 21.2 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "65-69", side: "Right", mean: 21.4 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "65-69", side: "Left", mean: 21.2 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "70-74", side: "Right", mean: 18.1 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "70-74", side: "Left", mean: 18.8 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "75+", side: "Right", mean: 18.7 },
  { test: "Pinch Strength (Palmar)", gender: "Male", age_range: "75+", side: "Left", mean: 18.3 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "20-24", side: "Right", mean: 17.2 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "20-24", side: "Left", mean: 16.3 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "25-29", side: "Right", mean: 17.7 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "25-29", side: "Left", mean: 17.0 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "30-34", side: "Right", mean: 19.3 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "30-34", side: "Left", mean: 18.1 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "35-39", side: "Right", mean: 17.5 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "35-39", side: "Left", mean: 17.1 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "40-44", side: "Right", mean: 17.0 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "40-44", side: "Left", mean: 16.6 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "45-49", side: "Right", mean: 17.9 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "45-49", side: "Left", mean: 17.5 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "50-54", side: "Right", mean: 17.3 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "50-54", side: "Left", mean: 16.4 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "55-59", side: "Right", mean: 16.0 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "55-59", side: "Left", mean: 15.4 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "60-64", side: "Right", mean: 14.8 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "60-64", side: "Left", mean: 14.3 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "65-69", side: "Right", mean: 14.2 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "65-69", side: "Left", mean: 13.7 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "70-74", side: "Right", mean: 14.4 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "70-74", side: "Left", mean: 14.0 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "75+", side: "Right", mean: 12.0 },
  { test: "Pinch Strength (Palmar)", gender: "Female", age_range: "75+", side: "Left", mean: 11.5 },
];

// Get age range from numeric age
export function getAgeRange(age: number): string {
  if (age < 20) return "20-24"; // Default to youngest range if under 20
  if (age >= 20 && age <= 24) return "20-24";
  if (age >= 25 && age <= 29) return "25-29";
  if (age >= 30 && age <= 34) return "30-34";
  if (age >= 35 && age <= 39) return "35-39";
  if (age >= 40 && age <= 44) return "40-44";
  if (age >= 45 && age <= 49) return "45-49";
  if (age >= 50 && age <= 54) return "50-54";
  if (age >= 55 && age <= 59) return "55-59";
  if (age >= 60 && age <= 64) return "60-64";
  if (age >= 65 && age <= 69) return "65-69";
  if (age >= 70 && age <= 74) return "70-74";
  return "75+"; // 75 and above
}

// Normalize test name for norm lookup
function normalizeTestName(testName: string): string {
  const n = testName.toLowerCase();

  // Map test IDs and names to standard norm lookup names
  if (n.includes("hand-strength-standard") || n.includes("hand strength standard") || (n.includes("hand") && n.includes("standard"))) {
    return "Hand Strength Standard";
  }

  // Pinch strength types - distinguish between Key, Tip, and Palmar
  if (n.includes("pinch")) {
    if (n.includes("key")) {
      return "Pinch Strength (Key)";
    }
    if (n.includes("tip")) {
      return "Pinch Strength (Tip)";
    }
    if (n.includes("palmar")) {
      return "Pinch Strength (Palmar)";
    }
    // Default to Tip if no specific type specified
    return "Pinch Strength (Tip)";
  }

  return "";
}

// Look up norm by test name, gender, age, and side
export function lookupAgeGenderNorm(
  testName: string,
  gender: string | undefined,
  age: number | undefined,
  side: "left" | "right"
): number | null {
  if (!testName || !gender || age === undefined) return null;

  const normalizedTest = normalizeTestName(testName);
  if (!normalizedTest) return null;

  const ageRange = getAgeRange(age);
  const normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  const normalizedSide = side.charAt(0).toUpperCase() + side.slice(1).toLowerCase();

  // Combine all norms for searching
  const allNorms = [...handStrengthStandardNorms, ...pinchStrengthTipNorms, ...pinchStrengthKeyNorms, ...pinchStrengthPalmarNorms];

  const matching = allNorms.find(
    (norm) =>
      norm.test === normalizedTest &&
      norm.gender === normalizedGender &&
      norm.age_range === ageRange &&
      norm.side === normalizedSide
  );

  return matching ? matching.mean : null;
}

function isGrip(name: string) {
  const n = name.toLowerCase();
  return n.includes("grip");
}

function isHandStrength(name: string) {
  const n = name.toLowerCase();
  return n.includes("hand-strength") || (n.includes("hand") && n.includes("strength"));
}

function isPinch(name: string) {
  const n = name.toLowerCase();
  return n.includes("pinch");
}

function isROM(name: string) {
  const n = name.toLowerCase();
  return (
    n.includes("range") ||
    n.includes("motion") ||
    n.includes("flexion") ||
    n.includes("extension") ||
    n.includes("abduction") ||
    n.includes("adduction") ||
    n.includes("rotation") ||
    n.includes("dorsi") ||
    n.includes("dorsiflexion") ||
    n.includes("palmar") ||
    n.includes("radial") ||
    n.includes("ulnar") ||
    n.includes("deviation")
  );
}

function isCardio(name: string) {
  const n = name.toLowerCase();
  return (
    n.includes("step") ||
    n.includes("cardio") ||
    n.includes("treadmill") ||
    n.includes("mcaft") ||
    n.includes("kasch")
  );
}

// Map ROM test names to norms (deg) based on standard clinical reference values
function romNorm(name: string): { value: number | null } {
  const n = name.toLowerCase();

  // Cervical Spine
  if (n.includes("cervical")) {
    if (n.includes("flexion")) return { value: 60 };
    if (n.includes("extension") || n.includes("hyperextension")) return { value: 75 };
    if (n.includes("lateral")) return { value: 45 };
    if (n.includes("rotation")) return { value: 80 };
  }

  // Thoraco-Lumbar / Lumbar Spine
  if (n.includes("lumbar") || n.includes("thoraco")) {
    if (n.includes("flexion")) return { value: 48 }; // 45-50 range, using midpoint
    if (n.includes("extension") || n.includes("hyperextension")) return { value: 25 };
    if (n.includes("lateral")) return { value: 25 };
    if (n.includes("rotation")) return { value: 30 };
  }

  // Shoulder
  if (n.includes("shoulder")) {
    if (n.includes("flexion")) return { value: 180 };
    if (n.includes("hyperextension")) return { value: 50 };
    if (n.includes("abduction")) return { value: 180 };
    if (n.includes("adduction")) return { value: 50 };
    if (n.includes("internal") && n.includes("rotation")) return { value: 90 };
    if (n.includes("external") && n.includes("rotation")) return { value: 90 };
  }

  // Elbow
  if (n.includes("elbow")) {
    if (n.includes("flexion")) return { value: 140 };
    if (n.includes("extension")) return { value: 0 };
  }

  // Forearm
  if (n.includes("forearm")) {
    if (n.includes("pronation")) return { value: 80 };
    if (n.includes("supination") || n.includes("supination")) return { value: 80 };
  }

  // Wrist
  if (n.includes("wrist")) {
    if (n.includes("flexion") && !n.includes("extension")) return { value: 60 };
    if (n.includes("extension") && !n.includes("flexion")) return { value: 60 };
    if (n.includes("dorsiflexion")) return { value: 60 };
    if (n.includes("palmar") || n.includes("palmarf")) return { value: 60 };
    if (n.includes("radial")) return { value: 20 };
    if (n.includes("ulnar")) return { value: 20 };
  }

  // Hip
  if (n.includes("hip")) {
    if (n.includes("flexion")) return { value: 100 };
    if (n.includes("extension") || n.includes("hyperextension")) return { value: 30 };
    if (n.includes("abduction")) return { value: 40 };
    if (n.includes("adduction")) return { value: 20 };
    if (n.includes("internal") && n.includes("rotation")) return { value: 40 };
    if (n.includes("external") && n.includes("rotation")) return { value: 50 };
  }

  // Knee
  if (n.includes("knee")) {
    if (n.includes("flexion")) return { value: 150 };
    if (n.includes("extension")) return { value: 0 };
  }

  // Ankle
  if (n.includes("ankle")) {
    if (n.includes("plantarflexion")) return { value: 40 };
    if (n.includes("dorsiflexion")) return { value: 30 };
  }

  return { value: null };
}

export function inferNormsForTest(
  testName: string,
  gender?: string,
  age?: number
): NormInfo {
  if (!testName)
    return { unit: "", left: null, right: null, category: "other" };
  const name = testName.toLowerCase();

  if (isCardio(name)) {
    return { unit: "bpm", left: null, right: null, category: "cardio" };
  }

  // Strength/Grip - Try age/gender specific norms first
  if (isGrip(name)) {
    if (gender && age !== undefined) {
      const leftNorm = lookupAgeGenderNorm(testName, gender, age, "left");
      const rightNorm = lookupAgeGenderNorm(testName, gender, age, "right");

      if (leftNorm !== null && rightNorm !== null) {
        return { unit: "lb", left: leftNorm, right: rightNorm, category: "strength" };
      }
    }
    // Fallback to generic grip norms
    return { unit: "lb", left: 110.5, right: 120.8, category: "strength" };
  }

  // Hand Strength - Try age/gender specific norms first
  if (isHandStrength(name)) {
    if (gender && age !== undefined) {
      const leftNorm = lookupAgeGenderNorm(testName, gender, age, "left");
      const rightNorm = lookupAgeGenderNorm(testName, gender, age, "right");

      if (leftNorm !== null && rightNorm !== null) {
        return { unit: "lb", left: leftNorm, right: rightNorm, category: "strength" };
      }
    }
    // Fallback to generic hand strength norms
    return { unit: "lb", left: 110.5, right: 120.8, category: "strength" };
  }

  // Pinch - Try age/gender specific norms first
  if (isPinch(name)) {
    if (gender && age !== undefined) {
      const leftNorm = lookupAgeGenderNorm(testName, gender, age, "left");
      const rightNorm = lookupAgeGenderNorm(testName, gender, age, "right");

      if (leftNorm !== null && rightNorm !== null) {
        return { unit: "lb", left: leftNorm, right: rightNorm, category: "strength" };
      }
    }
    // Fallback to generic pinch norms
    return { unit: "lb", left: 85.0, right: 90.0, category: "strength" };
  }

  if (isROM(name)) {
    const rn = romNorm(name).value;
    return { unit: "deg", left: rn, right: rn, category: "rom" };
  }

  // Generic strength fallback
  if (
    name.includes("lift") ||
    name.includes("carry") ||
    name.includes("push") ||
    name.includes("pull") ||
    name.includes("strength") ||
    name.includes("force")
  ) {
    return { unit: "lb", left: 85.0, right: 90.0, category: "strength" };
  }

  return { unit: "", left: null, right: null, category: "other" };
}
