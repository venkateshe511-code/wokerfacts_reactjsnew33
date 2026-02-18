import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDemoMode } from "@/hooks/use-demo-mode";

interface Test {
  id: string;
  name: string;
  category: string;
  subcategory: string;
}

interface ProtocolData {
  selectedTests: string[];
  activeTab: string;
}

interface MTMTestConfig {
  numberOfTrials: number;
  numberOfReps: number;
  bodySide?: string;
  plane?: string;
  position?: string;
  direction?: string;
  weight?: number;
  distance?: number;
  weightOptions?: number[];
}

const mtmTestConfigs: Record<string, MTMTestConfig> = {
  fingering: {
    numberOfTrials: 3,
    numberOfReps: 10,
    bodySide: "Both",
    plane: "Immediate",
    position: "Standing",
  },
  "bi-manual-fingering": {
    numberOfTrials: 3,
    numberOfReps: 10,
    bodySide: "Both",
    plane: "Immediate",
    position: "Standing",
  },
  handling: {
    numberOfTrials: 3,
    numberOfReps: 10,
    bodySide: "Both",
    plane: "Immediate",
    position: "Standing",
  },
  "bi-manual-handling": {
    numberOfTrials: 3,
    numberOfReps: 10,
    bodySide: "Both",
    plane: "Immediate",
    position: "Standing",
  },
  "reach-immediate": {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    plane: "Front",
    position: "Standing",
  },
  "reach-overhead": {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    plane: "Overhead",
    position: "Standing",
  },
  "reach-with-weight": {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    plane: "Front",
    position: "Standing",
  },
  balance: {
    numberOfTrials: 3,
    numberOfReps: 1,
    direction: "Both",
    weight: 0,
    distance: 10,
    position: "Standing",
  },
  stoop: {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    weight: 0,
    distance: 0,
    position: "Standing",
  },
  walk: {
    numberOfTrials: 3,
    numberOfReps: 1,
    direction: "Both",
    distance: 50,
    position: "Standing",
  },
  "push-pull-cart": {
    numberOfTrials: 3,
    numberOfReps: 1,
    direction: "Both",
    weight: 40,
    distance: 8,
    weightOptions: [40, 50, 60],
    position: "Standing",
  },
  crouch: {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    weight: 0,
    distance: 0,
    position: "Crouching",
  },
  carry: {
    numberOfTrials: 3,
    numberOfReps: 1,
    bodySide: "Both",
    weight: 10,
    distance: 12,
    weightOptions: [10, 20, 50],
    position: "Standing",
  },
  crawl: {
    numberOfTrials: 3,
    numberOfReps: 1,
    bodySide: "Both",
    weight: 0,
    distance: 10,
    position: "Crawling",
  },
  "climb-stairs": {
    numberOfTrials: 3,
    numberOfReps: 1,
    direction: "Both",
    weight: 0,
    distance: 4,
    position: "Standing",
  },
  kneel: {
    numberOfTrials: 3,
    numberOfReps: 6,
    bodySide: "Both",
    weight: 0,
    distance: 0,
    position: "Kneeling",
  },
  "climb-ladder": {
    numberOfTrials: 1,
    numberOfReps: 3,
    direction: "Both",
    weight: 0,
    distance: 8,
    position: "Standing",
  },
};

const testCategories = [
  { id: "strength", name: "Strength", color: "bg-blue-500" },
  {
    id: "rom-spine",
    name: "Range Of Motion Total Spine/Extremity",
    color: "bg-green-500",
  },
  { id: "rom-hand", name: "Range Of Motion Hand/Foot", color: "bg-purple-500" },
  {
    id: "occupational",
    name: "Occupational Tasks",
    color: "bg-orange-500",
  },
  { id: "cardio", name: "Cardio", color: "bg-red-500" },
];

const testGroups = {
  strength: [
    {
      name: "Hand Strength",
      id: "hand-strength",
      tests: [
        { id: "hand-strength-standard", name: "Standard" },
        { id: "hand-strength-rapid-exchange", name: "Rapid Exchange" },
        { id: "hand-strength-mve", name: "MVE" },
        { id: "hand-strength-mmve", name: "MMVE" },
      ],
    },
    {
      name: "Pinch Strength",
      id: "pinch-strength",
      tests: [
        { id: "pinch-strength-key", name: "Key" },
        { id: "pinch-strength-tip", name: "Tip" },
        { id: "pinch-strength-palmar", name: "Palmar" },
        { id: "pinch-strength-grasp", name: "Grasp" },
      ],
    },
    {
      name: "Cervical (Muscle Test)",
      id: "muscle-test-cervical",
      tests: [
        { id: "cervical-flexion-extension", name: "Flexion/Extension" },
        { id: "cervical-lateral-flexion", name: "Lateral Flexion" },
        { id: "cervical-30-rotation", name: "30° Rotation" },
        { id: "cervical-60-rotation", name: "60° Rotation" },
      ],
    },
    {
      name: "Hip (Muscle Test)",
      id: "hip-muscle-test",
      tests: [
        { id: "hip-muscle-flexion", name: "Flexion" },
        { id: "hip-muscle-extension", name: "Extension" },
        { id: "hip-muscle-abduction", name: "Abduction" },
        { id: "hip-muscle-adduction", name: "Adduction" },
        { id: "hip-muscle-external-rotation", name: "External Rotation" },
        { id: "hip-muscle-internal-rotation", name: "Internal Rotation" },
      ],
    },
    {
      name: "Shoulder (Muscle Test)",
      id: "shoulder-muscle-test",
      tests: [
        { id: "shoulder-muscle-flexion", name: "Flexion" },
        { id: "shoulder-muscle-extension", name: "Extension" },
        { id: "shoulder-muscle-abduction", name: "Abduction" },
        { id: "shoulder-muscle-adduction", name: "Adduction" },
        { id: "shoulder-muscle-internal-rotation", name: "Internal Rotation" },
        { id: "shoulder-muscle-external-rotation", name: "External Rotation" },
      ],
    },
    {
      name: "Wrist (Muscle Test)",
      id: "wrist-muscle-test",
      tests: [
        { id: "wrist-muscle-flexion", name: "Palmar Flexion" },
        { id: "wrist-muscle-extension", name: "Dorsiflexion" },
        { id: "wrist-muscle-radial-deviation", name: "Radial Deviation" },
        { id: "wrist-muscle-ulnar-deviation", name: "Ulnar Deviation" },
      ],
    },
    {
      name: "Ankle (Muscle Test)",
      id: "ankle-muscle-test",
      tests: [
        { id: "ankle-muscle-dorsiflexion", name: "Dorsiflexion" },
        { id: "ankle-muscle-plantar-flexion", name: "Plantar Flexion" },
        { id: "ankle-muscle-eversion", name: "Eversion" },
        { id: "ankle-muscle-inversion", name: "Inversion" },
      ],
    },
    {
      name: "Knee (Muscle Test)",
      id: "knee-muscle-test",
      tests: [
        { id: "knee-muscle-flexion", name: "Flexion" },
        { id: "knee-muscle-extension", name: "Extension" },
      ],
    },
    {
      name: "Elbow (Muscle Test)",
      id: "elbow-muscle-test",
      tests: [
        { id: "elbow-muscle-flexion", name: "Flexion" },
        { id: "elbow-muscle-extension", name: "Extension" },
      ],
    },
    {
      name: "Static Lift",
      id: "static-lift",
      tests: [
        { id: "static-lift-low", name: "Low" },
        { id: "static-lift-mid", name: "Mid" },
        { id: "static-lift-high", name: "High" },
      ],
    },
    {
      name: "Dynamic Frequent Lift",
      id: "dynamic-lift",
      tests: [
        { id: "dynamic-lift-low", name: "Low" },
        { id: "dynamic-lift-mid", name: "Mid" },
        { id: "dynamic-lift-high", name: "High" },
        { id: "dynamic-lift-overhead", name: "Overhead" },
      ],
    },
    {
      name: "Dynamic Infrequent Lift (Occasional)",
      id: "dynamic-infrequent-lift",
      tests: [
        { id: "dynamic-infrequent-lift-low", name: "Low" },
        { id: "dynamic-infrequent-lift-mid", name: "Mid" },
        { id: "dynamic-infrequent-lift-high", name: "High" },
        { id: "dynamic-infrequent-lift-overhead", name: "Overhead" },
      ],
    },
  ],
  "rom-spine": [
    {
      name: "Cervical (Total Spine ROM)",
      id: "cervical-total-spine",
      tests: [
        { id: "cervical-spine-flexion-extension", name: "Flexion/Extension" },
        { id: "cervical-spine-lateral-flexion", name: "Lateral Flexion" },
        { id: "cervical-spine-rotation", name: "Rotation" },
      ],
    },
    {
      name: "Lumbar (Total Spine ROM)",
      id: "lumbar-total-spine",
      tests: [
        { id: "lumbar-spine-flexion-extension", name: "Flexion/Extension" },
        { id: "lumbar-spine-lateral-flexion", name: "Lateral Flexion" },
        { id: "lumbar-spine-straight-leg-raise", name: "Straight Leg Raise" },
      ],
    },
    {
      name: "Thoracic (Total Spine ROM)",
      id: "thoracic-total-spine",
      tests: [
        { id: "thoracic-spine-flexion", name: "Flexion" },
        { id: "thoracic-spine-rotation", name: "Rotation" },
      ],
    },
    {
      name: "Left Side - Extremity Elbow (ROM)",
      id: "extremity-elbow-left",
      tests: [
        {
          id: "elbow-rom-flexion-extension-left",
          name: "Extremity Elbow Flexion/Extension",
        },
        {
          id: "elbow-rom-supination-pronation-left",
          name: "Extremity Elbow Supination/Pronation",
        },
      ],
    },
    {
      name: "Right Side - Extremity Elbow (ROM)",
      id: "extremity-elbow-right",
      tests: [
        {
          id: "elbow-rom-flexion-extension-right",
          name: "Extremity Elbow Flexion/Extension",
        },
        {
          id: "elbow-rom-supination-pronation-right",
          name: "Extremity Elbow Supination/Pronation",
        },
      ],
    },
    {
      name: "Left Side - Extremity Wrist (ROM)",
      id: "extremity-wrist-left",
      tests: [
        {
          id: "wrist-rom-flexion-extension-left",
          name: "Extremity Wrist Flexion/Extension",
        },
        {
          id: "wrist-rom-radial-ulnar-deviation-left",
          name: "Extremity Wrist Radial/Ulnar Deviation",
        },
      ],
    },
    {
      name: "Right Side - Extremity Wrist (ROM)",
      id: "extremity-wrist-right",
      tests: [
        {
          id: "wrist-rom-flexion-extension-right",
          name: "Extremity Wrist Flexion/Extension",
        },
        {
          id: "wrist-rom-radial-ulnar-deviation-right",
          name: "Extremity Wrist Radial/Ulnar Deviation",
        },
      ],
    },
    {
      name: "Left Side - Extremity Knee (ROM)",
      id: "extremity-knee-left",
      tests: [
        {
          id: "knee-rom-flexion-extension-left",
          name: "Extremity Knee Flexion/Extension",
        },
      ],
    },
    {
      name: "Right Side - Extremity Knee (ROM)",
      id: "extremity-knee-right",
      tests: [
        {
          id: "knee-rom-flexion-extension-right",
          name: "Extremity Knee Flexion/Extension",
        },
      ],
    },
    {
      name: "Left Side - Extremity Shoulder (ROM)",
      id: "extremity-shoulder-left",
      tests: [
        {
          id: "shoulder-rom-flexion-extension-left",
          name: "Extremity Shoulder Flexion/Extension",
        },
        {
          id: "shoulder-rom-internal-external-rotation-left",
          name: "Extremity Shoulder Internal/External Rotation",
        },
        {
          id: "shoulder-rom-abduction-adduction-left",
          name: "Extremity Shoulder Abduction/Adduction",
        },
      ],
    },
    {
      name: "Right Side - Extremity Shoulder (ROM)",
      id: "extremity-shoulder-right",
      tests: [
        {
          id: "shoulder-rom-flexion-extension-right",
          name: "Extremity Shoulder Flexion/Extension",
        },
        {
          id: "shoulder-rom-internal-external-rotation-right",
          name: "Extremity Shoulder Internal/External Rotation",
        },
        {
          id: "shoulder-rom-abduction-adduction-right",
          name: "Extremity Shoulder Abduction/Adduction",
        },
      ],
    },
    {
      name: "Left Side - Extremity Hip (ROM)",
      id: "extremity-hip-left",
      tests: [
        {
          id: "hip-rom-flexion-extension-left",
          name: "Extremity Hip Flexion/Extension",
        },
        {
          id: "hip-rom-internal-external-rotation-left",
          name: "Extremity Hip Internal/External Rotation",
        },
        {
          id: "hip-rom-abduction-adduction-left",
          name: "Extremity Hip Abduction/Adduction",
        },
      ],
    },
    {
      name: "Right Side - Extremity Hip (ROM)",
      id: "extremity-hip-right",
      tests: [
        {
          id: "hip-rom-flexion-extension-right",
          name: "Extremity Hip Flexion/Extension",
        },
        {
          id: "hip-rom-internal-external-rotation-right",
          name: "Extremity Hip Internal/External Rotation",
        },
        {
          id: "hip-rom-abduction-adduction-right",
          name: "Extremity Hip Abduction/Adduction",
        },
      ],
    },
    {
      name: "Left Side - Extremity Ankle (ROM)",
      id: "extremity-ankle-left",
      tests: [
        {
          id: "ankle-rom-dorsi-plantar-flexion-left",
          name: "Extremity Ankle Dorsi/Plantar Flexion",
        },
        {
          id: "ankle-rom-inversion-eversion-left",
          name: "Extremity Ankle Inversion/Eversion",
        },
      ],
    },
    {
      name: "Right Side - Extremity Ankle (ROM)",
      id: "extremity-ankle-right",
      tests: [
        {
          id: "ankle-rom-dorsi-plantar-flexion-right",
          name: "Extremity Ankle Dorsi/Plantar Flexion",
        },
        {
          id: "ankle-rom-inversion-eversion-right",
          name: "Extremity Ankle Inversion/Eversion",
        },
      ],
    },
  ],
  "rom-hand": [
    {
      name: "Left Side - Thumb (ROM)",
      id: "thumb-rom-left",
      tests: [
        {
          id: "thumb-ip-flexion-extension-left",
          name: "Thumb IP Flexion/Extension",
        },
        {
          id: "thumb-mp-flexion-extension-left",
          name: "Thumb MP Flexion/Extension",
        },
        { id: "thumb-abduction-left", name: "Thumb Abduction" },
      ],
    },
    {
      name: "Right Side - Thumb (ROM)",
      id: "thumb-rom-right",
      tests: [
        {
          id: "thumb-ip-flexion-extension-right",
          name: "Thumb IP Flexion/Extension",
        },
        {
          id: "thumb-mp-flexion-extension-right",
          name: "Thumb MP Flexion/Extension",
        },
        { id: "thumb-abduction-right", name: "Thumb Abduction" },
      ],
    },
    {
      name: "Left Side - Index Finger (ROM)",
      id: "index-finger-rom-left",
      tests: [
        {
          id: "index-dip-flexion-extension-left",
          name: "Index Finger DIP Flexion/Extension",
        },
        {
          id: "index-pip-flexion-extension-left",
          name: "Index Finger PIP Flexion/Extension",
        },
        {
          id: "index-mp-flexion-extension-left",
          name: "Index Finger MP Flexion/Extension",
        },
      ],
    },
    {
      name: "Right Side - Index Finger (ROM)",
      id: "index-finger-rom-right",
      tests: [
        {
          id: "index-dip-flexion-extension-right",
          name: "Index Finger DIP Flexion/Extension",
        },
        {
          id: "index-pip-flexion-extension-right",
          name: "Index Finger PIP Flexion/Extension",
        },
        {
          id: "index-mp-flexion-extension-right",
          name: "Index Finger MP Flexion/Extension",
        },
      ],
    },
    {
      name: "Left Side - Middle Finger (ROM)",
      id: "middle-finger-rom-left",
      tests: [
        {
          id: "middle-dip-flexion-extension-left",
          name: "Middle Finger DIP Flexion/Extension",
        },
        {
          id: "middle-pip-flexion-extension-left",
          name: "Middle Finger PIP Flexion/Extension",
        },
        {
          id: "middle-mp-flexion-extension-left",
          name: "Middle Finger MP Flexion/Extension",
        },
      ],
    },
    {
      name: "Right Side - Middle Finger (ROM)",
      id: "middle-finger-rom-right",
      tests: [
        {
          id: "middle-dip-flexion-extension-right",
          name: "Middle Finger DIP Flexion/Extension",
        },
        {
          id: "middle-pip-flexion-extension-right",
          name: "Middle Finger PIP Flexion/Extension",
        },
        {
          id: "middle-mp-flexion-extension-right",
          name: "Middle Finger MP Flexion/Extension",
        },
      ],
    },
    {
      name: "Left Side - Ring Finger (ROM)",
      id: "ring-finger-rom-left",
      tests: [
        {
          id: "ring-dip-flexion-extension-left",
          name: "Ring Finger DIP Flexion/Extension",
        },
        {
          id: "ring-pip-flexion-extension-left",
          name: "Ring Finger PIP Flexion/Extension",
        },
        {
          id: "ring-mp-flexion-extension-left",
          name: "Ring Finger MP Flexion/Extension",
        },
      ],
    },
    {
      name: "Right Side - Ring Finger (ROM)",
      id: "ring-finger-rom-right",
      tests: [
        {
          id: "ring-dip-flexion-extension-right",
          name: "Ring Finger DIP Flexion/Extension",
        },
        {
          id: "ring-pip-flexion-extension-right",
          name: "Ring Finger PIP Flexion/Extension",
        },
        {
          id: "ring-mp-flexion-extension-right",
          name: "Ring Finger MP Flexion/Extension",
        },
      ],
    },
    {
      name: "Left Side - Little Finger (ROM)",
      id: "little-finger-rom-left",
      tests: [
        {
          id: "little-dip-flexion-extension-left",
          name: "Little Finger DIP Flexion/Extension",
        },
        {
          id: "little-pip-flexion-extension-left",
          name: "Little Finger PIP Flexion/Extension",
        },
        {
          id: "little-mp-flexion-extension-left",
          name: "Little Finger MP Flexion/Extension",
        },
      ],
    },
    {
      name: "Right Side - Little Finger (ROM)",
      id: "little-finger-rom-right",
      tests: [
        {
          id: "little-dip-flexion-extension-right",
          name: "Little Finger DIP Flexion/Extension",
        },
        {
          id: "little-pip-flexion-extension-right",
          name: "Little Finger PIP Flexion/Extension",
        },
        {
          id: "little-mp-flexion-extension-right",
          name: "Little Finger MP Flexion/Extension",
        },
      ],
    },
    {
      name: "Left Side - Extremity Great Toe (ROM)",
      id: "extremity-great-toe-left",
      tests: [
        {
          id: "great-toe-ip-flexion-left",
          name: "Extremity Great Toe IP Flexion",
        },
        {
          id: "great-toe-mp-dorsi-plantar-flexion-left",
          name: "Extremity Great Toe MP Dorsi/Plantar Flexion",
        },
      ],
    },
    {
      name: "Right Side - Extremity Great Toe (ROM)",
      id: "extremity-great-toe-right",
      tests: [
        {
          id: "great-toe-ip-flexion-right",
          name: "Extremity Great Toe IP Flexion",
        },
        {
          id: "great-toe-mp-dorsi-plantar-flexion-right",
          name: "Extremity Great Toe MP Dorsi/Plantar Flexion",
        },
      ],
    },
    {
      name: "Left Side - Extremity 2nd Toe (ROM)",
      id: "extremity-2nd-toe-left",
      tests: [
        {
          id: "2nd-toe-mp-dorsi-plantar-flexion-left",
          name: "Extremity 2nd Toe MP Dorsi/Plantar Flexion",
        },
      ],
    },
    {
      name: "Right Side - Extremity 2nd Toe (ROM)",
      id: "extremity-2nd-toe-right",
      tests: [
        {
          id: "2nd-toe-mp-dorsi-plantar-flexion-right",
          name: "Extremity 2nd Toe MP Dorsi/Plantar Flexion",
        },
      ],
    },
    {
      name: "Left Side - Extremity 3rd Toe (ROM)",
      id: "extremity-3rd-toe-left",
      tests: [
        {
          id: "3rd-toe-mp-dorsi-plantar-flexion-left",
          name: "Extremity 3rd Toe MP Dorsi/Plantar Flexion",
        },
      ],
    },
    {
      name: "Right Side - Extremity 3rd Toe (ROM)",
      id: "extremity-3rd-toe-right",
      tests: [
        {
          id: "3rd-toe-mp-dorsi-plantar-flexion-right",
          name: "Extremity 3rd Toe MP Dorsi/Plantar Flexion",
        },
      ],
    },
    {
      name: "Left Side - Extremity 4th Toe (ROM)",
      id: "extremity-4th-toe-left",
      tests: [
        {
          id: "4th-toe-mp-dorsi-plantar-flexion-left",
          name: "Extremity 4th Toe MP Dorsi/Plantar Flexion",
        },
      ],
    },
    {
      name: "Right Side - Extremity 4th Toe (ROM)",
      id: "extremity-4th-toe-right",
      tests: [
        {
          id: "4th-toe-mp-dorsi-plantar-flexion-right",
          name: "Extremity 4th Toe MP Dorsi/Plantar Flexion",
        },
      ],
    },
    {
      name: "Left Side - Extremity 5th Toe (ROM)",
      id: "extremity-5th-toe-left",
      tests: [
        {
          id: "5th-toe-mp-dorsi-plantar-flexion-left",
          name: "Extremity 5th Toe MP Dorsi/Plantar Flexion",
        },
      ],
    },
    {
      name: "Right Side - Extremity 5th Toe (ROM)",
      id: "extremity-5th-toe-right",
      tests: [
        {
          id: "5th-toe-mp-dorsi-plantar-flexion-right",
          name: "Extremity 5th Toe MP Dorsi/Plantar Flexion",
        },
      ],
    },
  ],
  occupational: [
    {
      name: "MTM Test Battery",
      id: "mtm-test-battery",
      tests: [
        { id: "fingering", name: "Fingering" },
        { id: "bi-manual-fingering", name: "Bi-manual Fingering" },
        { id: "handling", name: "Handling" },
        { id: "bi-manual-handling", name: "Bi-manual Handling" },
        { id: "reach-immediate", name: "Reach Immediate" },
        { id: "reach-overhead", name: "Reach Overhead" },
        { id: "reach-with-weight", name: "Reach With Weight" },
        { id: "stoop", name: "Stoop" },
        { id: "walk", name: "Walk" },
        { id: "push-pull-cart", name: "Push/Pull Cart" },
        { id: "crouch", name: "Crouch" },
        { id: "carry", name: "Carry" },
        { id: "crawl", name: "Crawl" },
        { id: "climb-stairs", name: "Climb Stairs" },
        { id: "balance", name: "Balance" },
        { id: "kneel", name: "Kneel" },
        { id: "climb-ladder", name: "Climb Ladder" },
      ],
    },
  ],
  cardio: [
    {
      name: "Various",
      id: "cardio-tests",
      tests: [
        { id: "mcaft-step-test", name: "mCAFT Step Test" },
        { id: "kasch-step-test", name: "KASCH Step Test" },
        { id: "bruce-treadmill-test", name: "Bruce Treadmill Test" },
        { id: "ymca-step-test", name: "YMCA 3-Minute Step Test" },
        {
          id: "ymca-submaximal-treadmill-test",
          name: "YMCA Submaximal Treadmill Test",
        },
      ],
    },
  ],
};

export default function ProtocolTests() {
  const navigate = useNavigate();
  const isDemoMode = useDemoMode();
  const [protocolData, setProtocolData] = useState<ProtocolData>({
    selectedTests: [],
    activeTab: "strength",
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const sampleProtocolData = {
    selectedTests: [
      // Hand Strength
      "hand-strength-standard",
      "hand-strength-rapid-exchange",
      // Pinch Strength
      "pinch-strength-key",
      "pinch-strength-tip",
      "pinch-strength-palmar",
      // Muscle Tests
      "cervical-flexion-extension",
      "cervical-lateral-flexion",
      "hip-muscle-flexion",
      "hip-muscle-extension",
      "shoulder-muscle-flexion",
      "shoulder-muscle-abduction",
      // ROM Spine
      "cervical-spine-flexion-extension",
      "lumbar-spine-flexion-extension",
      "shoulder-rom-flexion-extension-left",
      "shoulder-rom-flexion-extension-right",
      "hip-rom-flexion-extension-left",
      "hip-rom-flexion-extension-right",
      // ROM Hand
      "thumb-ip-flexion-extension-left",
      "thumb-ip-flexion-extension-right",
      "index-dip-flexion-extension-left",
      "index-dip-flexion-extension-right",
      // Occupational
      "fingering",
      "handling",
      "reach-immediate",
      // Cardio
      "mcaft-step-test",
      "bruce-treadmill-test",
      "ymca-step-test",
      "ymca-submaximal-treadmill-test",
    ],
    activeTab: "strength",
  };

  const fillSampleProtocolTests = async () => {
    setProtocolData(sampleProtocolData);
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Store sample data in localStorage
    localStorage.setItem(
      "protocolTestsData",
      JSON.stringify(sampleProtocolData),
    );

    // Update completed steps
    const completedSteps = JSON.parse(
      localStorage.getItem("completedSteps") || "[]",
    );
    if (!completedSteps.includes(5)) {
      completedSteps.push(5);
      localStorage.setItem("completedSteps", JSON.stringify(completedSteps));
    }

    setIsSubmitting(false);
    setShowSuccessDialog(true);
  };

  useEffect(() => {
    // Check if we have existing protocol data (edit mode)
    const existingData = localStorage.getItem("protocolTestsData");
    if (existingData) {
      const savedData = JSON.parse(existingData);

      // Clean up any old mcafi test IDs (replace with mcaft)
      const cleanedSelectedTests = savedData.selectedTests
        .filter((testId: string) => !testId.includes("mcafi")) // Remove old mcafi tests
        .filter((testId: string) => testId !== "cervical-anterior-obliques")
        .filter((testId: string) => testId !== "dynamic-lift-frequent")
        .map((testId: string) => {
          // This shouldn't be needed since we're filtering above, but just in case
          return testId.replace("mcafi", "mcaft");
        });

      setProtocolData({
        ...savedData,
        selectedTests: cleanedSelectedTests,
      });
      setIsEditMode(true);
    }

    // Initialize all groups as expanded
    const allGroups: Record<string, boolean> = {};
    Object.values(testGroups)
      .flat()
      .forEach((group) => {
        allGroups[group.id] = true;
      });
    setExpandedGroups(allGroups);
  }, []);

  const handleTestToggle = (testId: string) => {
    setProtocolData((prev) => ({
      ...prev,
      selectedTests: prev.selectedTests.includes(testId)
        ? prev.selectedTests.filter((id) => id !== testId)
        : [...prev.selectedTests, testId],
    }));
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const selectAllInGroup = (groupId: string) => {
    const categoryId = protocolData.activeTab;
    const group = (
      testGroups[categoryId as keyof typeof testGroups] || []
    ).find((g) => g.id === groupId);

    if (group) {
      const testIdsInGroup = group.tests.map((test) => test.id);
      const newSelectedTests = Array.from(
        new Set([...protocolData.selectedTests, ...testIdsInGroup]),
      );
      setProtocolData((prev) => ({
        ...prev,
        selectedTests: newSelectedTests,
      }));
    }
  };

  const deselectAllInGroup = (groupId: string) => {
    const categoryId = protocolData.activeTab;
    const group = (
      testGroups[categoryId as keyof typeof testGroups] || []
    ).find((g) => g.id === groupId);

    if (group) {
      const testIdsInGroup = new Set(group.tests.map((test) => test.id));
      const newSelectedTests = protocolData.selectedTests.filter(
        (testId) => !testIdsInGroup.has(testId),
      );
      setProtocolData((prev) => ({
        ...prev,
        selectedTests: newSelectedTests,
      }));
    }
  };

  const getGroupSelectionState = (groupId: string): "all" | "some" | "none" => {
    const categoryId = protocolData.activeTab;
    const group = (
      testGroups[categoryId as keyof typeof testGroups] || []
    ).find((g) => g.id === groupId);

    if (!group) return "none";

    const testIdsInGroup = group.tests.map((test) => test.id);
    const selectedInGroup = testIdsInGroup.filter((id) =>
      protocolData.selectedTests.includes(id),
    );

    if (selectedInGroup.length === 0) return "none";
    if (selectedInGroup.length === testIdsInGroup.length) return "all";
    return "some";
  };

  const getSelectedTestsByCategory = (categoryId: string) => {
    const categoryTests =
      testGroups[categoryId as keyof typeof testGroups] || [];
    const allTestIds = categoryTests.flatMap((group) =>
      group.tests.map((test) => test.id),
    );
    return protocolData.selectedTests.filter((testId) =>
      allTestIds.includes(testId),
    ).length;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Store data in localStorage
    localStorage.setItem("protocolTestsData", JSON.stringify(protocolData));

    // Mark step 5 as completed
    const completedSteps = JSON.parse(
      localStorage.getItem("completedSteps") || "[]",
    );
    if (!completedSteps.includes(5)) {
      completedSteps.push(5);
      localStorage.setItem("completedSteps", JSON.stringify(completedSteps));
    }

    setIsSubmitting(false);
    setShowSuccessDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
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
              {isEditMode && <Edit className="mr-3 h-8 w-8 text-orange-600" />}
              Select Protocol or Tests
              {isEditMode && (
                <span className="ml-3 text-2xl text-orange-600">
                  (Edit Mode)
                </span>
              )}
            </h1>
            <p className="text-xl text-gray-600">
              {isEditMode
                ? "Update your test protocol selection"
                : "Please enter the claimant details and select the tests you'd like to perform"}
            </p>

            {/* Sample Protocol Tests Button - Only show in demo mode */}
            {isDemoMode && !isEditMode && (
              <div className="mt-6">
                <Button
                  type="button"
                  onClick={fillSampleProtocolTests}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 shadow-lg border-2 border-green-500"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Fill Sample Protocol Tests & Continue
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Quick demo with pre-selected common tests
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Test Selection - 3 columns */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardHeader
                className={`text-white ${isEditMode ? "bg-orange-600" : "bg-blue-600"}`}
              >
                <CardTitle className="text-2xl flex items-center">
                  {isEditMode ? (
                    <>
                      <Edit className="mr-3 h-6 w-6" />
                      Step 5: Edit Protocol Selection
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 mr-3 bg-white text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        5
                      </div>
                      Step 5: Select Protocol or Tests
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
                  {testCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() =>
                        setProtocolData((prev) => ({
                          ...prev,
                          activeTab: category.id,
                        }))
                      }
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        protocolData.activeTab === category.id
                          ? "bg-blue-600 text-white shadow-lg border-2 border-blue-700 transform scale-105"
                          : "bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-sm border border-gray-200"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>

                {/* Test Groups */}
                <div className="space-y-4">
                  {(
                    testGroups[
                      protocolData.activeTab as keyof typeof testGroups
                    ] || []
                  ).map((group) => {
                    const selectionState = getGroupSelectionState(group.id);
                    const isAllSelected = selectionState === "all";
                    return (
                      <div
                        key={group.id}
                        className="border border-gray-200 rounded-lg"
                      >
                        <div className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left font-medium text-blue-700 rounded-t-lg">
                          <button
                            onClick={() => toggleGroup(group.id)}
                            className="flex-1 flex items-center justify-between text-left"
                          >
                            <span>{group.name}</span>
                            {expandedGroups[group.id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              isAllSelected
                                ? deselectAllInGroup(group.id)
                                : selectAllInGroup(group.id)
                            }
                            className={`ml-4 px-3 py-1 text-xs font-semibold rounded transition-colors ${
                              isAllSelected
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50"
                            }`}
                          >
                            {isAllSelected ? "DESELECT ALL" : "SELECT ALL"}
                          </button>
                        </div>

                        {expandedGroups[group.id] && (
                          <div className="p-4 space-y-3">
                            {group.tests.map((test) => (
                              <div
                                key={test.id}
                                className="flex items-center space-x-3"
                              >
                                <Checkbox
                                  id={test.id}
                                  checked={protocolData.selectedTests.includes(
                                    test.id,
                                  )}
                                  onCheckedChange={() =>
                                    handleTestToggle(test.id)
                                  }
                                />
                                <label
                                  htmlFor={test.id}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {test.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Tests Sidebar - 1 column */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg sticky top-8">
              <CardHeader className="bg-purple-600 text-white">
                <CardTitle className="text-lg">Selected Tests</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {testCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm font-medium">
                        {category.name.replace("Range Of Motion ", "ROM ")}
                      </span>
                      <span className="text-sm font-bold">
                        {getSelectedTestsByCategory(category.id)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {isEditMode ? "Updating..." : "Saving..."}
                      </div>
                    ) : (
                      `Save (${protocolData.selectedTests.length})`
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
                  {isEditMode
                    ? "Protocol Selection Updated"
                    : "Protocol Selection Saved"}
                </h3>
                <p className="text-gray-600">
                  {isEditMode
                    ? "Step 5 has been updated successfully. Your changes have been saved."
                    : "Step 5 has been completed successfully. You can now proceed to the next step."}
                </p>
                <p className="text-sm text-gray-500">
                  Selected {protocolData.selectedTests.length} test(s) for the
                  evaluation.
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
