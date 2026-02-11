// ===============================
// Damage & Severity
// ===============================
export const DAMAGE_TYPES = [
  "scratch",
  "dent",
  "bent",
  "crack",
  "detached",
  "missing",
  "deformation",
] as const;

export const SEVERITIES = ["minor", "major"] as const;

// ===============================
// PARTLIST (SOURCE OF TRUTH)
// ===============================
export const PART_HIERARCHY = {
  scooter: {
    front: {
      steering_and_controls: [
        "left_handlebar",
        "right_handlebar",
        "internal_wiring",
        "handlebar",
        "front_cowl",
        "speedometer",
      ],
      front_bodywork: [
        "front_fairing",
        "front_apron",
        "headlamp",
        "front_indicator",
        "left_mirror",
        "right_mirror",
        "front_shield_left",
        "front_mudguard",
        "front_shield_right",
        "front_number_plate",
      ],
      wheel: [
        "front_wheel",
        "front_suspension",
      ],
    },

    center: {
      rider_interface: [
        "seat",
      ],
      floorboard_and_frame: [
        "floorboard",
        "front_cover_panel",
        "left_panel",
        "right_panel",
        "left_footrest",
        "right_footrest",
      ],
      fuel_and_storage: [
        "underseat_storage",
      ],
    },

    rear: {
      wheel: [
        "rear_wheel",
        "rear_suspension",
      ],
      rear_bodywork: [
        "rear_cowl",
        "tail_lamp",
        "rear_indicator",
        "rear_number_plate",
        "grab_rail",
      ],
    },

    external: {
      external_protrusions: [
        "exhaust",
      ],
    },

    safety: {
      safety_and_auxiliary: [
        "crash_guard",
        "windshield",
      ],
    },
  },

  bike: {
    front: {
      steering_and_controls: [
        "left_handlebar",
        "right_handlebar",
        "speedometer",
        "internal_wiring",
      ],
      front_bodywork: [
        "front_fairing",
        "headlamp",
        "front_indicator_left",
        "front_indicator_right",
        "mirror_left",
        "mirror_right",
        "front_number_plate",
        "front_mudguard",
        "front_suspension",
        "front_wheel",
        "front_brake",
      ],
    },

    center: {
      rider_interface: [
        "seat",
      ],
      fuel_and_frame: [
        "fuel_tank",
        "leg_guard_left",
        "leg_guard_right",
        "left_panel",
        "right_panel",
      ],
      controls_and_mounts: [
        "left_footrest",
        "right_footrest",
        "side_stand",
        "center_stand",
      ],
    },

    engine: {
      engine_and_transmission: [
        "engine_block",
      ],
    },

    rear: {
      suspension_and_mounts: [
        "rear_suspension",
      ],
      wheel_and_brake: [
        "rear_wheel",
        "rear_brake"
      ],
      rear_bodywork: [
        "rear_cowl",
        "tail_lamp",
        "rear_indicator_left",
        "rear_indicator_right",
        "number_plate_bracket",
        "grab_rail",
        "rear_mudguard",
        "exhaust",
      ],
    },
  },
} as const;

// ===============================
// HELPERS
// ===============================
export type VehicleType = keyof typeof PART_HIERARCHY;

export function getSections(vehicle: VehicleType): string[] {
  return Object.keys(PART_HIERARCHY[vehicle]);
}

export function getPartsBySection(
  vehicle: VehicleType,
  section: string
): string[] {
  const sectionData = PART_HIERARCHY[vehicle][section as keyof typeof PART_HIERARCHY[VehicleType]];
  const parts: string[] = [];

  Object.values(sectionData).forEach((group: any) => {
    parts.push(...group);
  });

  return parts;
}
