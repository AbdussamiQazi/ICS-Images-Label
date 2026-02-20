// =============================================
// Bike & Scooter Accident Damage Configuration
// Image-Visible + Injury-Relevant Only
// =============================================

export type DamageType =
  | "scratch"
  | "dent"
  | "crack"
  | "bend"
  | "detached"
  | "missing"
  | "destroyed"
  | "torn"
  | "cut"
  | "exposed";

// =============================================
// PART-SPECIFIC DAMAGE MAP
// =============================================

export const PART_DAMAGE_MAP: Record<string, DamageType[]> = {
  // ===== STRUCTURAL METAL =====
  center_stand: ["bend", "crack","missing"],
  side_stand: ["bend", "crack", "missing"],
  left_leg_guard: ["bend", "dent", "crack", "scratch", "detached",  "destroyed"],
  right_leg_guard: ["bend", "dent", "crack", "scratch", "detached",  "destroyed"],
  grab_rail: ["bend", "crack", "missing", "destroyed","scratch"],
  left_handlebar: ["bend", "dent", "crack", "detached", "scratch","destroyed"],
  right_handlebar: ["bend", "dent", "crack", "detached", "scratch","destroyed"],

  // ===== ENGINE =====
  engine_block: ["crack", "scratch", "destroyed"],

  // ===== BRAKES =====
  front_brake: ["crack", "scratch", "missing", "destroyed","bend"],
  rear_brake: ["crack", "scratch", "missing", "destroyed","bend"],

  // ===== INDICATORS =====
  front_indicator_left: ["crack", "scratch", "detached", "missing", "destroyed"],
  front_indicator_right: ["crack", "scratch", "detached", "missing", "destroyed"],
  rear_indicator_left: ["crack", "scratch", "detached", "missing", "destroyed"],
  rear_indicator_right: ["crack", "scratch", "detached", "missing", "destroyed"],
  front_indicator: ["crack", "scratch", "detached", "missing", "destroyed"],
  rear_indicator: ["crack", "scratch", "detached", "missing", "destroyed"],

  // ===== FUEL TANK =====
  fuel_tank: ["dent", "crack", "scratch", "destroyed"],

  // ===== EXHAUST =====
  exhaust: ["dent", "bend", "crack", "scratch", "detached", "missing", "destroyed"],

  // ===== FAIRINGS & PANELS =====
  front_fairing: ["crack", "scratch", "detached", "missing", "destroyed"],
  front_mudguard: ["dent", "bend", "crack", "scratch", "detached", "missing","destroyed"],
  rear_mudguard: ["dent", "bend", "crack", "scratch", "detached", "missing","destroyed"],
  left_panel: ["dent", "scratch", "detached", "missing", "destroyed","crack"],
  right_panel: ["dent", "scratch", "detached", "missing", "destroyed","crack"],
  rear_cowl: ["dent", "crack", "scratch", "detached", "missing", "destroyed"],

  // ===== NUMBER PLATES =====
  front_number_plate: ["bend", "crack", "scratch", "detached", "missing"],
  rear_number_plate: ["bend", "crack","scratch", "detached", "missing"],

  // ===== SUSPENSION =====
  front_suspension: ["bend", "crack", "scratch", "missing", "destroyed"],
  rear_suspension: ["bend", "crack", "scratch", "missing", "destroyed"],

  // ===== WHEELS =====
  front_wheel: ["bend", "crack", "scratch", "detached", "missing", "destroyed"],
  rear_wheel: ["bend", "crack", "scratch", "detached", "missing", "destroyed"],

  // ===== FOOTRESTS =====
  left_footrest: ["bend", "crack", "scratch", "detached", "missing"],
  right_footrest: ["bend", "crack", "scratch", "detached", "missing"],

  // ===== MIRRORS =====
  left_mirror: ["bend", "crack", "scratch", "detached", "missing"],
  right_mirror: ["bend", "crack", "scratch", "detached", "missing"],

  // ===== SCOOTER BODY =====
  crash_guard: ["bend", "crack", "scratch", "detached", "missing", "destroyed"],
  floorboard: ["dent", "bend", "crack", "scratch", "destroyed"],
  front_apron: ["dent", "bend", "crack", "scratch", "detached", "missing", "destroyed"],
  front_cover_panel: ["bend", "crack", "scratch", "detached", "missing", "destroyed"],
  front_cowl: ["crack", "scratch", "detached", "missing", "destroyed"],
  front_shield_left: ["dent", "crack", "scratch", "detached", "destroyed"],
  front_shield_right: ["dent", "crack", "scratch", "detached", "destroyed"],
  underseat_storage: ["crack", "exposed", "destroyed"],

  // ===== ELECTRICAL =====
  headlamp: ["crack", "scratch", "detached", "missing", "destroyed"],
  tail_lamp: ["crack", "scratch", "detached", "missing", "destroyed"],
  speedometer: ["crack", "scratch", "detached", "missing", "destroyed"],
  internal_wiring: ["exposed", "destroyed"],

  // ===== SEAT =====
  seat: ["torn", "cut", "detached", "missing", "destroyed"],
};
