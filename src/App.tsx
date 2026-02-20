import { useEffect, useState } from "react";
import { supabase } from "./supabase";

import {
  getSections,
  getPartsBySection,
} from "./parts";

import { PART_DAMAGE_MAP } from "./damageConfig";


import type { VehicleType } from "./parts";


const SEVERITIES = ["minor", "major"] as const;

const DAMAGES_WITH_MANUAL_SEVERITY = ["scratch", "dent"];




const DAMAGES_WITH_IMPLICIT_MAJOR = [
  "bend",
  "crack",
  "detached",
  "missing",
  "damaged",
  "exposed",
  "torn",
  "cut",
  "destroyed",
];


type ImageRow = {
  id: string;
  image_url: string;
};

type DamageEntry = {
  part: string;
  damage: string;
  severity: typeof SEVERITIES[number] | null;
};

export default function App() {

  const [sessionId] = useState(() => {
    const existing = localStorage.getItem("annotation_session");
    if (existing) return existing;

    const newId = crypto.randomUUID();
    localStorage.setItem("annotation_session", newId);
    return newId;
  });


  const [images, setImages] = useState<ImageRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const image = images[currentIndex] ?? null;

  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [section, setSection] = useState<string | null>(null);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const [damages, setDamages] = useState<DamageEntry[]>([]);
  const [noDamage, setNoDamage] = useState(false);


  const [initialLoading, setInitialLoading] = useState(true);
  const [refilling, setRefilling] = useState(false);
  const [saving, setSaving] = useState(false);
  // Fullscreen image state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  // Store annotations per image locally
  const [annotationCache, setAnnotationCache] = useState<
    Record<
      string,
      {
        vehicleType: VehicleType | "";
        damages: DamageEntry[];
        noDamage: boolean;
      }
    >
  >({});

  // -----------------------------
  // Image preloader
  // -----------------------------
  const preloadImages = (imgs: ImageRow[]) => {
    imgs.forEach((img) => {
      const preloader = new Image();
      preloader.src = img.image_url;
    });
  };

  // -----------------------------
  // Fetch image batch (unlabeled, ordered)
  // -----------------------------
  const fetchImages = async (batch = 5, isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setRefilling(true);
    }

    try {
      const { data, error } = await supabase.rpc("claim_next_images", {
        user_session: sessionId,
        batch_size: batch,
      });

      if (error) {
        console.error("Claim error:", error);
        return;
      }

      if (!data || data.length === 0) {
        if (isInitial) setInitialLoading(false);
        else setRefilling(false);
        return;
      }


      const claimedImages: ImageRow[] = data.map((row: any) => ({
        id: row.image_id,
        image_url: row.image_url,
      }));

      setImages((prev) => {
      const existingIds = new Set(prev.map((img) => img.id));

      const newUniqueImages = claimedImages.filter(
        (img) => !existingIds.has(img.id)
      );

      const merged = [...prev, ...newUniqueImages];

      preloadImages(newUniqueImages);

      return merged;
    });


    } catch (err) {
      console.error("Unexpected error:", err);
    }

    if (isInitial) {
      setInitialLoading(false);
    } else {
      setRefilling(false);
    }
  };




  useEffect(() => {
    const saved = localStorage.getItem("annotation_state");

    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed.images?.length) {
        setImages(parsed.images);
        setCurrentIndex(parsed.currentIndex || 0);
        setInitialLoading(false);
        return;
      }
    }

    fetchImages(5, true);
  }, []);
    
  useEffect(() => {
    const interval = setInterval(async () => {
      const { error } = await supabase.rpc("heartbeat_session", {
        p_session: sessionId,
      });

      if (error) {
        console.error("Heartbeat error:", error);
      } else {
        console.log("Heartbeat sent");
      }
    }, 2 * 60 * 1000); // every 2 minutes

    return () => clearInterval(interval);
  }, [sessionId]);

  // -----------------------------
  // Auto Session Expiry (10 min inactivity)
  // -----------------------------
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        localStorage.removeItem("annotation_state");
        localStorage.removeItem("annotation_session");
        console.log("Session expired due to inactivity");
      }, 10 * 60 * 1000); // 10 minutes
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    window.addEventListener("keydown", resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, []);

  // Persist annotation state
  useEffect(() => {
    localStorage.setItem(
      "annotation_state",
      JSON.stringify({
        images,
        currentIndex,
        annotationCache,
      })
    );
  }, [images, currentIndex]);

  // Restore annotation when current image changes
  useEffect(() => {
    if (!image) return;

    const saved = annotationCache[image.id];

    if (saved) {
      setVehicleType(saved.vehicleType);
      setDamages(saved.damages);
      setNoDamage(saved.noDamage);
    } else {
      // reset if no saved state
      setVehicleType("");
      setDamages([]);
      setNoDamage(false);
      setSection(null);
      setExpandedPart(null);
    }
  }, [currentIndex]);
  // -----------------------------
  // Double Tap Fullscreen Toggle
  // -----------------------------
  const handleImageTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      setIsFullscreen((prev) => !prev);
    }

    setLastTap(now);
  };

  // -----------------------------
  // Toggle damage (select / deselect)
  // -----------------------------
  const EXCLUSIVE_FULL_DAMAGE = ["destroyed", "detached", "missing"];

  const recordDamage = (
    part: string,
    damage: string,
    severity?: typeof SEVERITIES[number]
  ) => {
    const finalSeverity: typeof SEVERITIES[number] =
      DAMAGES_WITH_IMPLICIT_MAJOR.includes(damage)
        ? "major"
        : severity!;

    setDamages((prev) => {
      let updated = [...prev];

      // All damages already selected for this part
      const partDamages = updated.filter((d) => d.part === part);

      // ==========================================
      // TOGGLE OFF (if same damage already selected)
      // ==========================================
      const exists = partDamages.find(
        (d) =>
          d.damage === damage &&
          d.severity === finalSeverity
      );

      if (exists) {
        return updated.filter(
          (d) =>
            !(
              d.part === part &&
              d.damage === damage &&
              d.severity === finalSeverity
            )
        );
      }

      // ==========================================
      // RULE 1: deformation / detached / missing
      // Completely exclusive for that part
      // ==========================================
      if (EXCLUSIVE_FULL_DAMAGE.includes(damage)) {
        // Remove ALL damages for this part
        updated = updated.filter((d) => d.part !== part);

        return [...updated, { part, damage, severity: finalSeverity }];
      }

      // ==========================================
      // RULE 2: scratch / dent → minor OR major only
      // Remove same damage with different severity
      // ==========================================
      if (DAMAGES_WITH_MANUAL_SEVERITY.includes(damage)) {
        updated = updated.filter(
          (d) =>
            !(
              d.part === part &&
              d.damage === damage
            )
        );
      }

      // ==========================================
      // RULE 3: If selecting normal damage,
      // remove exclusive full damages if present
      // ==========================================
      updated = updated.filter(
        (d) =>
          !(
            d.part === part &&
            EXCLUSIVE_FULL_DAMAGE.includes(d.damage)
          )
      );

      return [...updated, { part, damage, severity: finalSeverity }];
    });
  };

  // -----------------------------
  // Save & move next
  // -----------------------------
  const saveAndNext = async () => {
    if (!image || !vehicleType || (!noDamage && damages.length === 0)) {
      alert("Incomplete annotation");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc("insert_annotation_secure", {
      p_image_id: image.id,
      p_vehicle_type: vehicleType,
      p_damages: noDamage
        ? [{ damage: "noDamage", severity: null }]
        : damages,
      p_session: sessionId,
    });


    if (error) {
      console.error(error);
      alert(error.message);
      setSaving(false);
      return;
    }
    console.log("Current image:", image);

    setVehicleType("");
    setSection(null);
    setExpandedPart(null);
    setDamages([]);
    setNoDamage(false);
    setSaving(false);

    // Save annotation locally before moving
    setAnnotationCache((prev) => ({
      ...prev,
      [image.id]: {
        vehicleType,
        damages,
        noDamage,
      },
    }));

    // move locally to next image instantly
    const nextIndex = currentIndex + 1;

    if (nextIndex < images.length) {
      setCurrentIndex(nextIndex);

      // auto-refill when only 2 left
    if (images.length - nextIndex <= 2 && !refilling) {
      fetchImages(3);
    }

    } else {
      fetchImages(5);
    }


  };

  // -----------------------------
  // Skip image
  // -----------------------------
  const skipImage = async () => {
    if (!image) return;

    const nextIndex = currentIndex + 1;

    // Preserve existing annotation if already filled
    if (image && (damages.length > 0 || noDamage)) {
      setAnnotationCache((prev) => ({
        ...prev,
        [image.id]: {
          vehicleType,
          damages,
          noDamage,
        },
      }));
    }

    // Reset UI state
    setVehicleType("");
    setSection(null);
    setExpandedPart(null);
    setDamages([]);
    setNoDamage(false);

    if (nextIndex < images.length) {
      setCurrentIndex(nextIndex);
    }

    if (images.length - nextIndex <= 2 && !refilling) {
      fetchImages(3);
    }
  };


  if (initialLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (!image) {
    return (
      <div className="h-screen flex items-center justify-center text-xl">
        🎉 All images labeled
      </div>
    );
  }

  const imageName = image.image_url.split("/").pop();

  return (
    <div className="max-w-md mx-auto">

      {/* STICKY IMAGE + NAME */}
      <div
        className={`sticky top-0 z-20 bg-gray-100 p-2 space-y-1 transition-all duration-300 ${
          isFullscreen ? "h-screen flex flex-col justify-center" : ""
        }`}
      >
        <div className="text-xs font-mono truncate text-gray-600">
          {imageName}
        </div>

        <img
          src={image.image_url}
          loading="eager"
          onClick={handleImageTap}
          className={`w-full object-contain rounded-lg bg-white transition-all duration-300 ${
            isFullscreen ? "h-[85vh]" : "max-h-[45vh]"
          }`}
        />
      </div>

      <div className="p-4 space-y-4">

        {/* VEHICLE */}
        <div className="flex gap-2">
          {(["bike", "scooter"] as VehicleType[]).map((v) => (
            <button
              key={v}
              onClick={() => {
                setVehicleType(v);
                setSection(null);
                setExpandedPart(null);
                setDamages([]);
                setNoDamage(false);

              }}
              className={`flex-1 p-3 rounded-lg font-semibold ${
                vehicleType === v
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>

        {/* NO DAMAGE */}
        {vehicleType && (
          <div>
            <button
              onClick={() => {
                setNoDamage((prev) => {
                  const newValue = !prev;
                  if (newValue) {
                    setDamages([]); // clear any selected damages
                    setSection(null);
                    setExpandedPart(null);
                  }
                  return newValue;
                });
              }}
              className={`w-full p-3 rounded-lg font-semibold ${
                noDamage
                  ? "bg-green-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {noDamage ? "✔ No Damage Selected" : "No Damage"}
            </button>
          </div>
        )}


        {/* REGION */}
        {vehicleType && (
          <div className="grid grid-cols-2 gap-2">
            {getSections(vehicleType).map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  setSection(sec);
                  setExpandedPart(null);
                }}
                className={`p-2 rounded-lg capitalize ${
                  section === sec
                    ? "bg-black text-white"
                    : "bg-gray-200"
                }`}
              >
                {sec.replace("_", " ")}
              </button>
            ))}
          </div>
        )}

        {/* PARTS */}
        {vehicleType && section && !noDamage && (
          <div className="space-y-2">
            {getPartsBySection(vehicleType, section).map((part) => {
              const isOpen = expandedPart === part;
              const damageList = PART_DAMAGE_MAP[part];
                if (!damageList) return null;



              return (
                <div key={part} className="bg-white rounded-lg overflow-hidden">
                  {/* PART HEADER */}
                  <button
                    onClick={() =>
                      setExpandedPart(isOpen ? null : part)
                    }
                    className="w-full text-left p-3 capitalize font-medium flex justify-between items-center"
                  >
                    {part.replaceAll("_", " ")}
                    <span>{isOpen ? "▾" : "▸"}</span>
                  </button>

                  {/* DAMAGE LIST */}
                  {isOpen && (
                    <div className="border-t">
                      {damageList.map((d) => {
                        const isManualSeverity =
                          DAMAGES_WITH_MANUAL_SEVERITY.includes(d);

                        // =========================
                        // MANUAL SEVERITY DAMAGES
                        // =========================
                        if (isManualSeverity) {
                          return (
                            <div
                              key={d}
                              className="flex justify-between items-center px-3 py-3 text-sm border-b"
                            >
                              <span className="capitalize">{d}</span>

                              <div className="flex gap-2">
                                {SEVERITIES.map((s) => {
                                  const selected = damages.some(
                                    (x) =>
                                      x.part === part &&
                                      x.damage === d &&
                                      x.severity === s
                                  );

                                  return (
                                    <button
                                      key={s}
                                      onClick={() =>
                                        recordDamage(part, d, s)
                                      }
                                      className={`px-3 py-1 rounded-md transition ${
                                        selected
                                          ? "bg-green-600 text-white"
                                          : "bg-gray-200 hover:bg-green-600 hover:text-white"
                                      }`}
                                    >
                                      {s}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        // =========================
                        // FULL WIDTH BUTTON DAMAGES
                        // =========================
                        const selected = damages.some(
                          (x) =>
                            x.part === part &&
                            x.damage === d &&
                            x.severity === "major"
                        );

                        return (
                          <button
                            key={d}
                            onClick={() => recordDamage(part, d)}
                            className={`w-full text-left px-3 py-3 text-sm border-b transition flex justify-between items-center ${
                              selected
                                ? "bg-green-600 text-white"
                                : "bg-gray-50 hover:bg-green-100"
                            }`}
                          >
                            <span className="capitalize">{d}</span>
                            {selected && (
                              <span className="font-semibold">✔</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}


        {/* SUMMARY */}
        {damages.length > 0 && (
          <div className="bg-white p-3 rounded-lg text-sm space-y-1">
            {damages.map((d, i) => (
              <div key={i} className="flex justify-between">
                <span>{d.part.replaceAll("_", " ")}</span>
                <span className="font-semibold">
                    {d.damage}
                    {d.severity ? ` (${d.severity})` : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* NAVIGATION */}
        <div className="flex gap-2">
          <button
            disabled={currentIndex === 0}
            onClick={() =>
              setCurrentIndex((i) => Math.max(0, i - 1))
            }
            className="flex-1 p-3 bg-gray-300 rounded-lg font-semibold disabled:opacity-50"
          >
            ◀ Previous
          </button>

          <button
            onClick={skipImage}
            className="flex-1 p-3 bg-red-500 text-white rounded-lg font-semibold"
          >
            ⏭ Skip
          </button>

          <button
            onClick={saveAndNext}
            disabled={saving}
            className="flex-1 p-3 bg-black text-white rounded-lg font-bold"
          >
            {saving ? "Saving…" : "Save & Next ▶"}
          </button>
        </div>


      </div>
    </div>
  );
}
