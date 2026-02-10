import { useEffect, useState } from "react";
import { supabase } from "./supabase";

import {
  DAMAGE_TYPES,
  getSections,
  getPartsBySection,
} from "./parts";

import type { VehicleType } from "./parts";

const SEVERITIES = ["minor", "major"] as const;

const DAMAGES_WITH_MANUAL_SEVERITY = ["scratch", "dent"];

const DAMAGES_WITH_IMPLICIT_MAJOR = [
  "bent",
  "crack",
  "detached",
  "missing",
  "deformation",
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
  const [images, setImages] = useState<ImageRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const image = images[currentIndex] ?? null;

  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [section, setSection] = useState<string | null>(null);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const [damages, setDamages] = useState<DamageEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  const fetchImages = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("unlabeled_images")
      .select("id, image_url")
      .order("image_index", { ascending: true })
      .limit(20);

    if (error) {
      console.error(error);
      setImages([]);
      setCurrentIndex(0);
    } else {
      const fetchedImages = data ?? [];
      setImages(fetchedImages);
      setCurrentIndex(0);

      // Preload next few images
      preloadImages(fetchedImages.slice(1, 5));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // -----------------------------
  // Toggle damage (select / deselect)
  // -----------------------------
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
      const index = prev.findIndex(
        (d) =>
          d.part === part &&
          d.damage === damage &&
          d.severity === finalSeverity
      );

      // Toggle off if already selected
      if (index !== -1) {
        return prev.filter((_, i) => i !== index);
      }

      return [...prev, { part, damage, severity: finalSeverity }];
    });
  };



  // -----------------------------
  // Save & move next
  // -----------------------------
  const saveAndNext = async () => {
    if (!image || !vehicleType || damages.length === 0) {
      alert("Incomplete annotation");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("annotations")
      .insert({
        image_id: image.id,
        vehicle_type: vehicleType,
        damages,
      });

    if (error) {
      console.error(error);
      alert(error.message);
      setSaving(false);
      return;
    }

    setVehicleType("");
    setSection(null);
    setExpandedPart(null);
    setDamages([]);

    setSaving(false);

    // Move forward and preload further
    if (currentIndex + 1 < images.length) {
      setCurrentIndex((i) => {
        const nextIndex = i + 1;
        preloadImages(images.slice(nextIndex + 1, nextIndex + 4));
        return nextIndex;
      });
    } else {
      fetchImages();
    }
  };

  if (loading) {
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
      <div className="sticky top-0 z-10 bg-gray-100 p-2 space-y-1">
        <div className="text-xs font-mono truncate text-gray-600">
          {imageName}
        </div>
        <img
          src={image.image_url}
          loading="eager"
          className="w-full max-h-[45vh] object-contain rounded-lg bg-white"
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
        {vehicleType && section && (
          <div className="space-y-2">
            {getPartsBySection(vehicleType, section).map((part) => {
              const isOpen = expandedPart === part;

              const isSelected = (
                p: string,
                d: string,
                s: typeof SEVERITIES[number]
              ) =>
                damages.some(
                  (x) =>
                    x.part === p &&
                    x.damage === d &&
                    x.severity === s
                );

              return (
                <div key={part} className="bg-white rounded-lg">
                  <button
                    onClick={() =>
                      setExpandedPart(isOpen ? null : part)
                    }
                    className="w-full text-left p-3 capitalize font-medium flex justify-between"
                  >
                    {part.replaceAll("_", " ")}
                    <span>{isOpen ? "▾" : "▸"}</span>
                  </button>

                  {isOpen && (
                    <div className="border-t">
                      {DAMAGE_TYPES.map((d) => (
                        <div
                          key={d}
                          className="flex justify-between px-3 py-2 text-sm"
                        >
                          <span className="capitalize">{d}</span>
                          <div className="flex gap-1">
                            {DAMAGES_WITH_MANUAL_SEVERITY.includes(d) ? (
                              SEVERITIES.map((s) => {
                                const selected = damages.some(
                                  (x) =>
                                    x.part === part &&
                                    x.damage === d &&
                                    x.severity === s
                                );

                                return (
                                  <button
                                    key={s}
                                    onClick={() => recordDamage(part, d, s)}
                                    className={`px-2 py-1 rounded ${
                                      selected
                                        ? "bg-black text-white"
                                        : "bg-gray-200 hover:bg-black hover:text-white"
                                    }`}
                                  >
                                    {s}
                                  </button>
                                );
                              })
                            ) : (
                              (() => {
                                const selected = damages.some(
                                  (x) =>
                                    x.part === part &&
                                    x.damage === d &&
                                    x.severity === "major"
                                );

                                return (
                                  <button
                                    onClick={() => recordDamage(part, d)}
                                    className={`px-3 py-1 rounded ${
                                      selected
                                        ? "bg-green-600 text-white"
                                        : "bg-gray-200 hover:bg-green-400 hover:text-white"
                                    }`}
                                  >
                                    select
                                  </button>
                                );
                              })()
                            )}
                          </div>

                        </div>
                      ))}
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
