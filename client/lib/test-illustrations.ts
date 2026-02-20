export type Illustration = {
  src: string;
  label: string;
  yPercent?: number | null;
};

const BASE = "/sample_illustration"; // folder name corrected

const map = {
  // Strength - Hand
  "hand-strength-standard": [
    { src: `${BASE}/Hand_Strength_Standard.jpg`, label: "Standard Grip" },
  ],
  "hand-strength-rapid-exchange": [
    {
      src: `${BASE}/Hand_Strength_Rapid_Exchange.jpg`,
      label: "Rapid Exchange Grip",
    },
  ],
  "hand-strength-mve": [
    { src: `${BASE}/Hand_Strength_MVE.jpg`, label: "Hand Strength MVE" },
  ],
  "hand-strength-mmve": [
    { src: `${BASE}/Hand_Strength_MMVE.jpg`, label: "Hand Strength MMVE" },
  ],

  // Strength - Pinch
  "pinch-strength-key": [
    { src: `${BASE}/Pinch_Strength_Key.jpg`, label: "Key Pinch" },
  ],
  "pinch-strength-tip": [
    { src: `${BASE}/Pinch_Strength_Tip.jpg`, label: "Tip Pinch" },
  ],
  "pinch-strength-palmar": [
    { src: `${BASE}/Pinch_Strength_Palmar.jpg`, label: "Palmar Pinch" },
  ],
  "pinch-strength-grasp": [
    { src: `${BASE}/Pinch_Strength_Grasp.jpg`, label: "Grasp" },
  ],

  // Strength - Muscle Tests (Cervical)
  "cervical-flexion-extension": [
    {
      src: `${BASE}/Muscle_Test_Cervical_Flexion_Extension.jpg`,
      label: "Cervical Flex/Ext",
    },
  ],
  "cervical-lateral-flexion": [
    {
      src: `${BASE}/Muscle_Test_Cervical_Lateral_Flexion.jpg`,
      label: "Cervical Lateral Flexion",
    },
  ],
  "cervical-30-rotation": [
    {
      src: `${BASE}/Muscle_Test_Cervical_30_Degree_Rotation.jpg`,
      label: "Cervical 30° Rotation",
    },
  ],
  "cervical-60-rotation": [
    {
      src: `${BASE}/Muscle_Test_Cervical_60_Degree_Rotation.jpg`,
      label: "Cervical 60° Rotation",
    },
  ],

  // Strength - Muscle Tests (Hip)
  "hip-muscle-flexion": [
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_1.jpg`,
      label: "Hip Muscle (1)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_2.jpg`,
      label: "Hip Muscle (2)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_3.jpg`,
      label: "Hip Muscle (3)",
    },
  ],
  "hip-muscle-extension": [
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_1.jpg`,
      label: "Hip Muscle (1)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_2.jpg`,
      label: "Hip Muscle (2)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_3.jpg`,
      label: "Hip Muscle (3)",
    },
  ],
  "hip-muscle-abduction": [
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_1.jpg`,
      label: "Hip Muscle (1)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_2.jpg`,
      label: "Hip Muscle (2)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_3.jpg`,
      label: "Hip Muscle (3)",
    },
  ],
  "hip-muscle-adduction": [
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_1.jpg`,
      label: "Hip Muscle (1)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_2.jpg`,
      label: "Hip Muscle (2)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_3.jpg`,
      label: "Hip Muscle (3)",
    },
  ],
  "hip-muscle-external-rotation": [
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_1.jpg`,
      label: "Hip Muscle (1)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_2.jpg`,
      label: "Hip Muscle (2)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_3.jpg`,
      label: "Hip Muscle (3)",
    },
  ],
  "hip-muscle-internal-rotation": [
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_1.jpg`,
      label: "Hip Muscle (1)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_2.jpg`,
      label: "Hip Muscle (2)",
    },
    {
      src: `${BASE}/Hip_Muscle Test_Flexion_Extension_Abduction_Adduction_External_RotationInternal_Rotation_3.jpg`,
      label: "Hip Muscle (3)",
    },
  ],

  // Strength - Muscle Tests (Shoulder)
  "shoulder-muscle-flexion": [
    {
      src: `${BASE}/Shoulder_Muscle Test_Flexion.jpg`,
      label: "Shoulder Flexion",
    },
  ],
  "shoulder-muscle-extension": [
    {
      src: `${BASE}/Shoulder_Muscle Test_Extension.jpg`,
      label: "Shoulder Extension",
    },
  ],
  "shoulder-muscle-abduction": [
    {
      src: `${BASE}/Shoulder_Muscle Test_Abduction.jpg`,
      label: "Shoulder Abduction",
    },
  ],
  "shoulder-muscle-adduction": [
    {
      src: `${BASE}/Shoulder_Muscle Test_Adduction.jpg`,
      label: "Shoulder Adduction",
    },
  ],
  "shoulder-muscle-external-rotation": [
    {
      src: `${BASE}/Shoulder_Muscle Test_External_Rotation.jpg`,
      label: "Shoulder External Rotation",
    },
  ],
  "shoulder-muscle-internal-rotation": [
    {
      src: `${BASE}/Shoulder_Muscle Test_Internal_Rotation.jpg`,
      label: "Shoulder Internal Rotation",
    },
  ],

  // Strength - Muscle Tests (Wrist)
  "wrist-muscle-flexion": [
    {
      src: `${BASE}/Wrist_Muscle_Test_Palmar_Flexion.jpg`,
      label: "Wrist Palmar Flexion",
    },
  ],
  "wrist-muscle-extension": [
    {
      src: `${BASE}/Wrist_Muscle_Test_Dorsiflexion.jpg`,
      label: "Wrist Dorsiflexion",
    },
  ],
  "wrist-muscle-radial-deviation": [
    {
      src: `${BASE}/Wrist_Muscle Test_Radial_Deviation.jpg`,
      label: "Wrist Radial Deviation",
    },
  ],
  "wrist-muscle-ulnar-deviation": [
    {
      src: `${BASE}/Wrist_Muscle_Test_Ulnar_Deviation.jpg`,
      label: "Wrist Ulnar Deviation",
    },
  ],

  // Strength - Muscle Tests (Ankle)
  "ankle-muscle-dorsiflexion": [
    {
      src: `${BASE}/Ankle_Muscle_Test_Dorsiflexion.jpg`,
      label: "Ankle Dorsiflexion",
    },
  ],
  "ankle-muscle-plantar-flexion": [
    {
      src: `${BASE}/Ankle_Muscle_Test_Plantar_Flexion.jpg`,
      label: "Ankle Plantar Flexion",
    },
  ],
  "ankle-muscle-eversion": [
    { src: `${BASE}/Ankle_Muscle_Test_Eversion.jpg`, label: "Ankle Eversion" },
  ],
  "ankle-muscle-inversion": [
    {
      src: `${BASE}/Ankle_Muscle_Test_Inversion.jpg`,
      label: "Ankle Inversion",
    },
  ],

  // Strength - Muscle Tests (Knee/Elbow)
  "knee-muscle-flexion": [
    { src: `${BASE}/Knee_Muscle_Test_Flexion.jpg`, label: "Knee Flexion" },
  ],
  "knee-muscle-extension": [
    { src: `${BASE}/Knee_Muscle_Test_Extension.jpg`, label: "Knee Extension" },
  ],
  "elbow-muscle-flexion": [
    { src: `${BASE}/Elbow_Muscle_Test_Flexion.jpg`, label: "Elbow Flexion" },
  ],
  "elbow-muscle-extension": [
    {
      src: `${BASE}/Elbow_Muscle_Test_Extension.jpg`,
      label: "Elbow Extension",
    },
  ],

  // Strength - Static/Dynamic Lifts
  "static-lift-low": [
    { src: `${BASE}/Static_Lift_Low.jpg`, label: "Static Lift Low" },
  ],
  "static-lift-mid": [
    { src: `${BASE}/Static_Lift_Mid.jpg`, label: "Static Lift Mid" },
  ],
  "static-lift-high": [
    { src: `${BASE}/Static_Lift_High.jpg`, label: "Static Lift High" },
  ],

  "dynamic-lift-low": [
    { src: `${BASE}/Dynamic_Lift_Low.jpg`, label: "Dynamic Lift Low" },
  ],
  "dynamic-lift-mid": [
    { src: `${BASE}/Dynamic_Lift_Mid.jpg`, label: "Dynamic Lift Mid" },
  ],
  "dynamic-lift-high": [
    { src: `${BASE}/Dynamic_Lift_High.jpg`, label: "Dynamic Lift High" },
  ],
  "dynamic-lift-overhead": [
    {
      src: `${BASE}/Dynamic_Lift_Overhead.jpg`,
      label: "Dynamic Lift Overhead",
    },
  ],
  "dynamic-lift-frequent": [
    { src: `${BASE}/Dynamic_Lift_Mid.jpg`, label: "Dynamic Frequent Lifts" },
  ],
  "dynamic-infrequent-lift-low": [
    {
      src: `${BASE}/Dynamic_Lift_Low.jpg`,
      label: "Dynamic Infrequent Lift Low",
    },
  ],
  "dynamic-infrequent-lift-mid": [
    {
      src: `${BASE}/Dynamic_Lift_Mid.jpg`,
      label: "Dynamic Infrequent Lift Mid",
    },
  ],
  "dynamic-infrequent-lift-high": [
    {
      src: `${BASE}/Dynamic_Lift_High.jpg`,
      label: "Dynamic Infrequent Lift High",
    },
  ],
  "dynamic-infrequent-lift-overhead": [
    {
      src: `${BASE}/Dynamic_Lift_Overhead.jpg`,
      label: "Dynamic Infrequent Lift Overhead",
    },
  ],

  // ROM - Total Spine
  "cervical-spine-flexion-extension": [
    {
      src: `${BASE}/Cervical_Total_Spine_Flexion_Extension.jpg`,
      label: "Cervical Flex/Ext",
    },
  ],
  "cervical-spine-lateral-flexion": [
    {
      src: `${BASE}/Cervical_Total_Spine_Lateral_Flexion.jpg`,
      label: "Cervical Lateral Flexion",
    },
  ],
  "cervical-spine-rotation": [
    {
      src: `${BASE}/Cervical_Total_Spine_Rotation.jpg`,
      label: "Cervical Rotation",
    },
  ],
  "lumbar-spine-flexion-extension": [
    {
      src: `${BASE}/Lumbar_Total_Spine_Flexion_Extension.jpg`,
      label: "Lumbar Flex/Ext",
    },
  ],
  "lumbar-spine-lateral-flexion": [
    {
      src: `${BASE}/Lumbar_Total_Spine_Lateral_Flexion.jpg`,
      label: "Lumbar Lateral Flexion",
    },
  ],
  "lumbar-spine-straight-leg-raise": [
    {
      src: `${BASE}/Lumbar_Total_Spine_Straight_Leg_Raise.jpg`,
      label: "Straight Leg Raise",
    },
  ],
  "thoracic-spine-flexion": [
    {
      src: `${BASE}/Thoracic_Total_Spine_Flexion.jpg`,
      label: "Thoracic Flexion",
    },
  ],
  "thoracic-spine-rotation": [
    {
      src: `${BASE}/Thoracic_Total_Spine_Rotation.jpg`,
      label: "Thoracic Rotation",
    },
  ],

  // ROM - Extremities
  "elbow-rom-flexion-extension": [
    {
      src: `${BASE}/Extremity_Elbow_Flexion_Extension.jpg`,
      label: "Elbow Flex/Ext",
    },
  ],
  "elbow-rom-supination-pronation": [
    {
      src: `${BASE}/Extremity_Elbow_Supination_Pronation.jpg`,
      label: "Elbow Supination/Pronation",
    },
  ],
  "wrist-rom-flexion-extension": [
    {
      src: `${BASE}/Extremity_Wrist_Flexion_Extension.jpg`,
      label: "Wrist Flex/Ext",
    },
  ],
  "wrist-rom-radial-ulnar-deviation": [
    {
      src: `${BASE}/Extremity_Wrist_Radial_Ulunar_Deviation.jpg`,
      label: "Wrist Radial/Ulnar Deviation",
    },
  ],
  "knee-rom-flexion-extension": [
    {
      src: `${BASE}/Extremity_ Knee_Flexion_Extension.jpg`,
      label: "Knee Flex/Ext",
    },
  ],
  "shoulder-rom-flexion-extension": [
    {
      src: `${BASE}/Extremity_Shoulder_Flexion_Extension.jpg`,
      label: "Shoulder Flex/Ext",
    },
  ],
  "shoulder-rom-internal-external-rotation": [
    {
      src: `${BASE}/Extremity_Shoulder_Internal_External_Rotation.jpg`,
      label: "Shoulder Int/Ext Rotation",
    },
  ],
  "shoulder-rom-abduction-adduction": [
    {
      src: `${BASE}/Extremity_Shoulder_Abduction_Adduction.jpg`,
      label: "Shoulder Abd/Add",
    },
  ],
  "hip-rom-flexion-extension": [
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_1.jpg`,
      label: "Hip ROM (1)",
    },
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_2.jpg`,
      label: "Hip ROM (2)",
    },
  ],
  "hip-rom-internal-external-rotation": [
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_1.jpg`,
      label: "Hip ROM (1)",
    },
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_2.jpg`,
      label: "Hip ROM (2)",
    },
  ],
  "hip-rom-abduction-adduction": [
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_1.jpg`,
      label: "Hip ROM (1)",
    },
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_2.jpg`,
      label: "Hip ROM (2)",
    },
  ],
  "ankle-rom-dorsi-plantar-flexion": [
    {
      src: `${BASE}/Extremity_Ankle_Dorsi_Plantar_Flexion.jpg`,
      label: "Ankle Dorsi/Plantar",
    },
  ],
  "ankle-rom-inversion-eversion": [
    {
      src: `${BASE}/Extremity_Ankle_Inversion_Eversion.jpg`,
      label: "Ankle Inversion/Eversion",
    },
  ],

  // ROM - Hand/Foot
  "thumb-ip-flexion-extension": [
    {
      src: `${BASE}/Thumb_IP_Flexion_Extension.jpg`,
      label: "Thumb IP Flex/Ext",
    },
  ],
  "thumb-mp-flexion-extension": [
    {
      src: `${BASE}/Thumb_MP_Flexion_Extension.jpg`,
      label: "Thumb MP Flex/Ext",
    },
  ],
  "thumb-abduction": [
    { src: `${BASE}/Thumb_Thumb_Abduction.jpg`, label: "Thumb Abduction" },
  ],

  "index-dip-flexion-extension": [
    {
      src: `${BASE}/Index_Finger_DIP_Flexion_Extension.jpg`,
      label: "Index DIP Flex/Ext",
    },
  ],
  "index-pip-flexion-extension": [
    {
      src: `${BASE}/Index_Finger_PIP_Flexion_Extension.jpg`,
      label: "Index PIP Flex/Ext",
    },
  ],
  "index-mp-flexion-extension": [
    {
      src: `${BASE}/Index_Finger_MP_Flexion_Extension.jpg`,
      label: "Index MP Flex/Ext",
    },
  ],

  "middle-dip-flexion-extension": [
    {
      src: `${BASE}/Middle_Finger_DIP_Flexion_Extension.jpg`,
      label: "Middle DIP Flex/Ext",
    },
  ],
  "middle-pip-flexion-extension": [
    {
      src: `${BASE}/Middle_Finger_PIP_Flexion_Extension.jpg`,
      label: "Middle PIP Flex/Ext",
    },
  ],
  "middle-mp-flexion-extension": [
    {
      src: `${BASE}/Middle_Finger_MP_Flexion_Extension.jpg`,
      label: "Middle MP Flex/Ext",
    },
  ],

  "ring-dip-flexion-extension": [
    {
      src: `${BASE}/Ring_Finger_DIP_Flexion_Extension.jpg`,
      label: "Ring DIP Flex/Ext",
    },
  ],
  "ring-pip-flexion-extension": [
    {
      src: `${BASE}/Ring_Finger_PIP_Flexion_Extension.jpg`,
      label: "Ring PIP Flex/Ext",
    },
  ],
  "ring-mp-flexion-extension": [
    {
      src: `${BASE}/Ring_Finger_MP_Flexion_Extension.jpg`,
      label: "Ring MP Flex/Ext",
    },
  ],

  "little-dip-flexion-extension": [
    {
      src: `${BASE}/Little_Finger_DIP_Flexion_Extension_PIP_Flexion_Extension_MP_Flexion_Extension.jpg`,
      label: "Little Finger ROM",
    },
  ],
  "little-pip-flexion-extension": [
    {
      src: `${BASE}/Little_Finger_DIP_Flexion_Extension_PIP_Flexion_Extension_MP_Flexion_Extension.jpg`,
      label: "Little Finger ROM",
    },
  ],
  "little-mp-flexion-extension": [
    {
      src: `${BASE}/Little_Finger_DIP_Flexion_Extension_PIP_Flexion_Extension_MP_Flexion_Extension.jpg`,
      label: "Little Finger ROM",
    },
  ],

  "great-toe-ip-flexion": [
    {
      src: `${BASE}/Extremity_Great_Toe_IP_Flexion_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "Great Toe IP Flexion",
    },
  ],
  "great-toe-mp-dorsi-plantar-flexion": [
    {
      src: `${BASE}/Extremity_Great_Toe_IP_Flexion_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "Great Toe MP Dorsi/Plantar",
    },
  ],

  "2nd-toe-mp-dorsi-plantar-flexion": [
    {
      src: `${BASE}/Extremity_2nd_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "2nd Toe MP Dorsi/Plantar",
    },
  ],
  "3rd-toe-mp-dorsi-plantar-flexion": [
    {
      src: `${BASE}/Extremity_3rd_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "3rd Toe MP Dorsi/Plantar",
    },
  ],
  "4th-toe-mp-dorsi-plantar-flexion": [
    {
      src: `${BASE}/Extremity_4th_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "4th Toe MP Dorsi/Plantar",
    },
  ],
  "5th-toe-mp-dorsi-plantar-flexion": [
    {
      src: `${BASE}/Extremity_5th_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "5th Toe MP Dorsi/Plantar",
    },
  ],

  // ROM - Extremities (Side-Specific)
  "elbow-rom-flexion-extension-left": [
    {
      src: `${BASE}/Extremity_Elbow_Flexion_Extension.jpg`,
      label: "Elbow Flex/Ext",
    },
  ],
  "elbow-rom-flexion-extension-right": [
    {
      src: `${BASE}/Extremity_Elbow_Flexion_Extension.jpg`,
      label: "Elbow Flex/Ext",
    },
  ],
  "elbow-rom-supination-pronation-left": [
    {
      src: `${BASE}/Extremity_Elbow_Supination_Pronation.jpg`,
      label: "Elbow Supination/Pronation",
    },
  ],
  "elbow-rom-supination-pronation-right": [
    {
      src: `${BASE}/Extremity_Elbow_Supination_Pronation.jpg`,
      label: "Elbow Supination/Pronation",
    },
  ],
  "wrist-rom-flexion-extension-left": [
    {
      src: `${BASE}/Extremity_Wrist_Flexion_Extension.jpg`,
      label: "Wrist Flex/Ext",
    },
  ],
  "wrist-rom-flexion-extension-right": [
    {
      src: `${BASE}/Extremity_Wrist_Flexion_Extension.jpg`,
      label: "Wrist Flex/Ext",
    },
  ],
  "wrist-rom-radial-ulnar-deviation-left": [
    {
      src: `${BASE}/Extremity_Wrist_Radial_Ulunar_Deviation.jpg`,
      label: "Wrist Radial/Ulnar Deviation",
    },
  ],
  "wrist-rom-radial-ulnar-deviation-right": [
    {
      src: `${BASE}/Extremity_Wrist_Radial_Ulunar_Deviation.jpg`,
      label: "Wrist Radial/Ulnar Deviation",
    },
  ],
  "knee-rom-flexion-extension-left": [
    {
      src: `${BASE}/Extremity_ Knee_Flexion_Extension.jpg`,
      label: "Knee Flex/Ext",
    },
  ],
  "knee-rom-flexion-extension-right": [
    {
      src: `${BASE}/Extremity_ Knee_Flexion_Extension.jpg`,
      label: "Knee Flex/Ext",
    },
  ],
  "shoulder-rom-flexion-extension-left": [
    {
      src: `${BASE}/Extremity_Shoulder_Flexion_Extension.jpg`,
      label: "Shoulder Flex/Ext",
    },
  ],
  "shoulder-rom-flexion-extension-right": [
    {
      src: `${BASE}/Extremity_Shoulder_Flexion_Extension.jpg`,
      label: "Shoulder Flex/Ext",
    },
  ],
  "shoulder-rom-internal-external-rotation-left": [
    {
      src: `${BASE}/Extremity_Shoulder_Internal_External_Rotation.jpg`,
      label: "Shoulder Int/Ext Rotation",
    },
  ],
  "shoulder-rom-internal-external-rotation-right": [
    {
      src: `${BASE}/Extremity_Shoulder_Internal_External_Rotation.jpg`,
      label: "Shoulder Int/Ext Rotation",
    },
  ],
  "shoulder-rom-abduction-adduction-left": [
    {
      src: `${BASE}/Extremity_Shoulder_Abduction_Adduction.jpg`,
      label: "Shoulder Abd/Add",
    },
  ],
  "shoulder-rom-abduction-adduction-right": [
    {
      src: `${BASE}/Extremity_Shoulder_Abduction_Adduction.jpg`,
      label: "Shoulder Abd/Add",
    },
  ],
  "hip-rom-flexion-extension-left": [
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_1.jpg`,
      label: "Hip ROM (1)",
    },
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_2.jpg`,
      label: "Hip ROM (2)",
    },
  ],
  "hip-rom-flexion-extension-right": [
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_1.jpg`,
      label: "Hip ROM (1)",
    },
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_2.jpg`,
      label: "Hip ROM (2)",
    },
  ],
  "hip-rom-internal-external-rotation-left": [
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_1.jpg`,
      label: "Hip ROM (1)",
    },
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_2.jpg`,
      label: "Hip ROM (2)",
    },
  ],
  "hip-rom-internal-external-rotation-right": [
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_1.jpg`,
      label: "Hip ROM (1)",
    },
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_2.jpg`,
      label: "Hip ROM (2)",
    },
  ],
  "hip-rom-abduction-adduction-left": [
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_1.jpg`,
      label: "Hip ROM (1)",
    },
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_2.jpg`,
      label: "Hip ROM (2)",
    },
  ],
  "hip-rom-abduction-adduction-right": [
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_1.jpg`,
      label: "Hip ROM (1)",
    },
    {
      src: `${BASE}/Extremity_Hip_Flexion_Extension_Internal_External_Rotation_Abduction_Adduction_2.jpg`,
      label: "Hip ROM (2)",
    },
  ],
  "ankle-rom-dorsi-plantar-flexion-left": [
    {
      src: `${BASE}/Extremity_Ankle_Dorsi_Plantar_Flexion.jpg`,
      label: "Ankle Dorsi/Plantar",
    },
  ],
  "ankle-rom-dorsi-plantar-flexion-right": [
    {
      src: `${BASE}/Extremity_Ankle_Dorsi_Plantar_Flexion.jpg`,
      label: "Ankle Dorsi/Plantar",
    },
  ],
  "ankle-rom-inversion-eversion-left": [
    {
      src: `${BASE}/Extremity_Ankle_Inversion_Eversion.jpg`,
      label: "Ankle Inversion/Eversion",
    },
  ],
  "ankle-rom-inversion-eversion-right": [
    {
      src: `${BASE}/Extremity_Ankle_Inversion_Eversion.jpg`,
      label: "Ankle Inversion/Eversion",
    },
  ],

  // ROM - Hand/Foot (Side-Specific)
  "thumb-ip-flexion-extension-left": [
    {
      src: `${BASE}/Thumb_IP_Flexion_Extension.jpg`,
      label: "Thumb IP Flex/Ext",
    },
  ],
  "thumb-ip-flexion-extension-right": [
    {
      src: `${BASE}/Thumb_IP_Flexion_Extension.jpg`,
      label: "Thumb IP Flex/Ext",
    },
  ],
  "thumb-mp-flexion-extension-left": [
    {
      src: `${BASE}/Thumb_MP_Flexion_Extension.jpg`,
      label: "Thumb MP Flex/Ext",
    },
  ],
  "thumb-mp-flexion-extension-right": [
    {
      src: `${BASE}/Thumb_MP_Flexion_Extension.jpg`,
      label: "Thumb MP Flex/Ext",
    },
  ],
  "thumb-abduction-left": [
    { src: `${BASE}/Thumb_Thumb_Abduction.jpg`, label: "Thumb Abduction" },
  ],
  "thumb-abduction-right": [
    { src: `${BASE}/Thumb_Thumb_Abduction.jpg`, label: "Thumb Abduction" },
  ],

  "index-dip-flexion-extension-left": [
    {
      src: `${BASE}/Index_Finger_DIP_Flexion_Extension.jpg`,
      label: "Index DIP Flex/Ext",
    },
  ],
  "index-dip-flexion-extension-right": [
    {
      src: `${BASE}/Index_Finger_DIP_Flexion_Extension.jpg`,
      label: "Index DIP Flex/Ext",
    },
  ],
  "index-pip-flexion-extension-left": [
    {
      src: `${BASE}/Index_Finger_PIP_Flexion_Extension.jpg`,
      label: "Index PIP Flex/Ext",
    },
  ],
  "index-pip-flexion-extension-right": [
    {
      src: `${BASE}/Index_Finger_PIP_Flexion_Extension.jpg`,
      label: "Index PIP Flex/Ext",
    },
  ],
  "index-mp-flexion-extension-left": [
    {
      src: `${BASE}/Index_Finger_MP_Flexion_Extension.jpg`,
      label: "Index MP Flex/Ext",
    },
  ],
  "index-mp-flexion-extension-right": [
    {
      src: `${BASE}/Index_Finger_MP_Flexion_Extension.jpg`,
      label: "Index MP Flex/Ext",
    },
  ],

  "middle-dip-flexion-extension-left": [
    {
      src: `${BASE}/Middle_Finger_DIP_Flexion_Extension.jpg`,
      label: "Middle DIP Flex/Ext",
    },
  ],
  "middle-dip-flexion-extension-right": [
    {
      src: `${BASE}/Middle_Finger_DIP_Flexion_Extension.jpg`,
      label: "Middle DIP Flex/Ext",
    },
  ],
  "middle-pip-flexion-extension-left": [
    {
      src: `${BASE}/Middle_Finger_PIP_Flexion_Extension.jpg`,
      label: "Middle PIP Flex/Ext",
    },
  ],
  "middle-pip-flexion-extension-right": [
    {
      src: `${BASE}/Middle_Finger_PIP_Flexion_Extension.jpg`,
      label: "Middle PIP Flex/Ext",
    },
  ],
  "middle-mp-flexion-extension-left": [
    {
      src: `${BASE}/Middle_Finger_MP_Flexion_Extension.jpg`,
      label: "Middle MP Flex/Ext",
    },
  ],
  "middle-mp-flexion-extension-right": [
    {
      src: `${BASE}/Middle_Finger_MP_Flexion_Extension.jpg`,
      label: "Middle MP Flex/Ext",
    },
  ],

  "ring-dip-flexion-extension-left": [
    {
      src: `${BASE}/Ring_Finger_DIP_Flexion_Extension.jpg`,
      label: "Ring DIP Flex/Ext",
    },
  ],
  "ring-dip-flexion-extension-right": [
    {
      src: `${BASE}/Ring_Finger_DIP_Flexion_Extension.jpg`,
      label: "Ring DIP Flex/Ext",
    },
  ],
  "ring-pip-flexion-extension-left": [
    {
      src: `${BASE}/Ring_Finger_PIP_Flexion_Extension.jpg`,
      label: "Ring PIP Flex/Ext",
    },
  ],
  "ring-pip-flexion-extension-right": [
    {
      src: `${BASE}/Ring_Finger_PIP_Flexion_Extension.jpg`,
      label: "Ring PIP Flex/Ext",
    },
  ],
  "ring-mp-flexion-extension-left": [
    {
      src: `${BASE}/Ring_Finger_MP_Flexion_Extension.jpg`,
      label: "Ring MP Flex/Ext",
    },
  ],
  "ring-mp-flexion-extension-right": [
    {
      src: `${BASE}/Ring_Finger_MP_Flexion_Extension.jpg`,
      label: "Ring MP Flex/Ext",
    },
  ],

  "little-dip-flexion-extension-left": [
    {
      src: `${BASE}/Little_Finger_DIP_Flexion_Extension_PIP_Flexion_Extension_MP_Flexion_Extension.jpg`,
      label: "Little Finger ROM",
    },
  ],
  "little-dip-flexion-extension-right": [
    {
      src: `${BASE}/Little_Finger_DIP_Flexion_Extension_PIP_Flexion_Extension_MP_Flexion_Extension.jpg`,
      label: "Little Finger ROM",
    },
  ],
  "little-pip-flexion-extension-left": [
    {
      src: `${BASE}/Little_Finger_DIP_Flexion_Extension_PIP_Flexion_Extension_MP_Flexion_Extension.jpg`,
      label: "Little Finger ROM",
    },
  ],
  "little-pip-flexion-extension-right": [
    {
      src: `${BASE}/Little_Finger_DIP_Flexion_Extension_PIP_Flexion_Extension_MP_Flexion_Extension.jpg`,
      label: "Little Finger ROM",
    },
  ],
  "little-mp-flexion-extension-left": [
    {
      src: `${BASE}/Little_Finger_DIP_Flexion_Extension_PIP_Flexion_Extension_MP_Flexion_Extension.jpg`,
      label: "Little Finger ROM",
    },
  ],
  "little-mp-flexion-extension-right": [
    {
      src: `${BASE}/Little_Finger_DIP_Flexion_Extension_PIP_Flexion_Extension_MP_Flexion_Extension.jpg`,
      label: "Little Finger ROM",
    },
  ],

  "great-toe-ip-flexion-left": [
    {
      src: `${BASE}/Extremity_Great_Toe_IP_Flexion_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "Great Toe IP Flexion",
    },
  ],
  "great-toe-ip-flexion-right": [
    {
      src: `${BASE}/Extremity_Great_Toe_IP_Flexion_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "Great Toe IP Flexion",
    },
  ],
  "great-toe-mp-dorsi-plantar-flexion-left": [
    {
      src: `${BASE}/Extremity_Great_Toe_IP_Flexion_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "Great Toe MP Dorsi/Plantar",
    },
  ],
  "great-toe-mp-dorsi-plantar-flexion-right": [
    {
      src: `${BASE}/Extremity_Great_Toe_IP_Flexion_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "Great Toe MP Dorsi/Plantar",
    },
  ],

  "2nd-toe-mp-dorsi-plantar-flexion-left": [
    {
      src: `${BASE}/Extremity_2nd_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "2nd Toe MP Dorsi/Plantar",
    },
  ],
  "2nd-toe-mp-dorsi-plantar-flexion-right": [
    {
      src: `${BASE}/Extremity_2nd_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "2nd Toe MP Dorsi/Plantar",
    },
  ],
  "3rd-toe-mp-dorsi-plantar-flexion-left": [
    {
      src: `${BASE}/Extremity_3rd_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "3rd Toe MP Dorsi/Plantar",
    },
  ],
  "3rd-toe-mp-dorsi-plantar-flexion-right": [
    {
      src: `${BASE}/Extremity_3rd_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "3rd Toe MP Dorsi/Plantar",
    },
  ],
  "4th-toe-mp-dorsi-plantar-flexion-left": [
    {
      src: `${BASE}/Extremity_4th_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "4th Toe MP Dorsi/Plantar",
    },
  ],
  "4th-toe-mp-dorsi-plantar-flexion-right": [
    {
      src: `${BASE}/Extremity_4th_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "4th Toe MP Dorsi/Plantar",
    },
  ],
  "5th-toe-mp-dorsi-plantar-flexion-left": [
    {
      src: `${BASE}/Extremity_5th_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "5th Toe MP Dorsi/Plantar",
    },
  ],
  "5th-toe-mp-dorsi-plantar-flexion-right": [
    {
      src: `${BASE}/Extremity_5th_Toe_MP_Dorsi_Plantar_Flexion.jpg`,
      label: "5th Toe MP Dorsi/Plantar",
    },
  ],

  // Occupational (MTM)
  fingering: [
    { src: `${BASE}/MTM_Test_Battery_Fingering.jpg`, label: "Fingering" },
  ],
  "bi-manual-fingering": [
    {
      src: `${BASE}/MTM_Test_Battery_Bi_Manual_Fingering.jpg`,
      label: "Bi-manual Fingering",
    },
  ],
  handling: [
    { src: `${BASE}/MTM_Test_Battery_Handling.jpg`, label: "Handling" },
  ],
  "bi-manual-handling": [
    {
      src: `${BASE}/MTM_Test_Battery_Bi_Manual_Handling.jpg`,
      label: "Bi-manual Handling",
    },
  ],
  "reach-immediate": [
    {
      src: `${BASE}/MTM_Test_Battery_Reach_Immediate.jpg`,
      label: "Reach Immediate",
    },
  ],
  "reach-overhead": [
    {
      src: `${BASE}/MTM_Test_Battery_Reach_Overhead.jpg`,
      label: "Reach Overhead",
    },
  ],
  "reach-with-weight": [
    {
      src: `${BASE}/MTM_Test_Battery_Reach_With_Weight.jpg`,
      label: "Reach With Weight",
    },
  ],
  stoop: [{ src: `${BASE}/MTM_Test_Battery_Stoop.jpg`, label: "Stoop" }],
  walk: [{ src: `${BASE}/MTM_Test_Battery_Walk.jpg`, label: "Walk" }],
  "push-pull-cart": [
    {
      src: `${BASE}/MTM_Test_Battery_Push_Pull_Cart.jpg`,
      label: "Push/Pull Cart",
    },
  ],
  crouch: [{ src: `${BASE}/MTM_Test_Battery_Crouch.jpg`, label: "Crouch" }],
  carry: [{ src: `${BASE}/MTM_Test_Battery_Carry.jpg`, label: "Carry" }],
  crawl: [{ src: `${BASE}/MTM_Test_Battery_Crawl.jpg`, label: "Crawl" }],
  "climb-stairs": [
    { src: `${BASE}/MTM_Test_Battery_Climb_Stairs.jpg`, label: "Climb Stairs" },
  ],
  balance: [{ src: `${BASE}/MTM_Test_Battery_Balance.jpg`, label: "Balance" }],
  kneel: [{ src: `${BASE}/MTM_Test_Battery_Kneel.jpg`, label: "Kneel" }],
  "climb-ladder": [
    { src: `${BASE}/MTM_Test_Battery_Climb_Ladder.jpg`, label: "Climb Ladder" },
  ],

  // Cardio (swapped per request)
  "mcaft-step-test": [
    { src: "/bruce-treadmill-illustration.jpg", label: "mCAFT Step" },
  ],
  "kasch-step-test": [
    { src: "/kasch-step-illustration.jpg", label: "Kasch Step" },
  ],
  "bruce-treadmill-test": [
    { src: "/mcaft-step-illustration.jpg", label: "Bruce Treadmill" },
  ],
  "ymca-step-test": [
    { src: `${BASE}/YMCA_Step_Test.png`, label: "YMCA 3-Minute Step Test" },
  ],
  "ymca-submaximal-treadmill-test": [
    {
      src: `${BASE}/YMCA_Treadmill_Test.png`,
      label: "YMCA Submaximal Treadmill Test",
    },
  ],
} as Record<string, Illustration[]>;

function normalizeKey(key: string) {
  return (key || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Return sample illustration(s) for a given test using explicit mapping first, then lightweight fallbacks
export function getSampleIllustrations(testIdOrName: string): Illustration[] {
  const raw = testIdOrName || "";
  const idKey = normalizeKey(raw);

  // 1) Exact id match from our known test ids
  if (map[idKey]) return map[idKey];

  // 2) Try to infer common aliases for grip/pinch/lifts
  if (idKey.includes("grip") || idKey.includes("hand-strength")) {
    if (idKey.includes("rapid")) return map["hand-strength-rapid-exchange"];
    if (idKey.includes("standard") || idKey.includes("p2"))
      return map["hand-strength-standard"];
    return map["hand-strength-mve"] || [];
  }

  if (idKey.includes("pinch")) {
    if (idKey.includes("key")) return map["pinch-strength-key"];
    if (idKey.includes("tip")) return map["pinch-strength-tip"];
    if (idKey.includes("palmar") || idKey.includes("palmer"))
      return map["pinch-strength-palmar"];
    if (idKey.includes("grasp")) return map["pinch-strength-grasp"];
  }

  if (idKey.includes("static-lift")) {
    if (idKey.includes("high")) return map["static-lift-high"];
    if (idKey.includes("mid")) return map["static-lift-mid"];
    if (idKey.includes("low")) return map["static-lift-low"];
  }

  if (idKey.includes("dynamic-infrequent-lift")) {
    if (idKey.includes("overhead"))
      return map["dynamic-infrequent-lift-overhead"];
    if (idKey.includes("high")) return map["dynamic-infrequent-lift-high"];
    if (idKey.includes("mid")) return map["dynamic-infrequent-lift-mid"];
    if (idKey.includes("low")) return map["dynamic-infrequent-lift-low"];
  }

  if (idKey.includes("dynamic-lift")) {
    if (idKey.includes("overhead")) return map["dynamic-lift-overhead"];
    if (idKey.includes("high")) return map["dynamic-lift-high"];
    if (idKey.includes("mid")) return map["dynamic-lift-mid"];
    if (idKey.includes("frequent")) return map["dynamic-lift-frequent"];
    if (idKey.includes("low")) return map["dynamic-lift-low"];
  }

  // 3) ROM generic fallbacks by body part
  if (idKey.includes("cervical"))
    return map["cervical-spine-flexion-extension"] || [];
  if (idKey.includes("lumbar"))
    return map["lumbar-spine-flexion-extension"] || [];
  if (idKey.includes("thoracic")) return map["thoracic-spine-flexion"] || [];
  if (idKey.includes("shoulder"))
    return map["shoulder-rom-flexion-extension"] || [];
  if (idKey.includes("elbow")) return map["elbow-rom-flexion-extension"] || [];
  if (idKey.includes("wrist")) return map["wrist-rom-flexion-extension"] || [];
  if (idKey.includes("hip")) return map["hip-rom-flexion-extension"] || [];
  if (idKey.includes("knee")) return map["knee-rom-flexion-extension"] || [];
  if (idKey.includes("ankle"))
    return map["ankle-rom-dorsi-plantar-flexion"] || [];

  // 4) Strength generic fallback
  if (
    idKey.includes("strength") ||
    idKey.includes("muscle") ||
    idKey.includes("lift")
  ) {
    return map["hand-strength-mve"] || [];
  }

  return [];
}

// Convert illustrations to inline HTML snippet (used in DownloadReport)
export function illustrationsToHtml(
  illos: Illustration[],
  sizePx = 72,
): string {
  if (!illos || illos.length === 0) return "";
  const items = illos
    .map((ill) => {
      if (ill.yPercent === undefined || ill.yPercent === null) {
        return `\n<div style="text-align: left;">\n  <img src="${ill.src}" alt="${ill.label}" style="width: ${sizePx}px; height: auto; border: 1px solid #333; border-radius: 4px;" />\n  <p style=\"font-size: 7px; color: #555; margin: 1px 0 0 0; text-align: left;\">${ill.label}</p>\n</div>`;
      }
      return `\n<div style="text-align: left;">\n  <div style="width: ${sizePx}px; height: ${Math.round((sizePx * 5) / 4)}px; border: 1px solid #333; border-radius: 4px; background-image: url('${ill.src}'); background-repeat: no-repeat; background-size: 100% auto; background-position: center ${ill.yPercent}%;"></div>\n  <p style=\"font-size: 7px; color: #555; margin: 1px 0 0 0; text-align: left;\">${ill.label}</p>\n</div>`;
    })
    .join("\n");

  return `\n<div style="display: flex; flex-direction: column; gap: 4px;">${items}\n</div>`;
}