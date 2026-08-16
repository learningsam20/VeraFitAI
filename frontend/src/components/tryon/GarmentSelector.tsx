"use client";

import React, { useState, useMemo } from "react";
import { Garment } from "@/lib/api";
import { useTryOnStore } from "@/stores/tryOnStore";
import { useMoodStore } from "@/stores/moodStore";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Check, Shirt, Search, EyeOff, Eye, Sparkles } from "lucide-react";
import { CustomGarmentModal } from "./CustomGarmentModal";

export const GarmentSelector: React.FC = () => {
  const { garments, selectedGarment, setSelectedGarment, runAnalysis, isLoading, compatibility, compatibilityLoading, showExcluded, toggleShowExcluded } = useTryOnStore();
  const { moodModifier } = useMoodStore();
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const verdictBySku = useMemo(() => {
    const map = new Map<string, "compatible" | "excluded">();
    (compatibility?.results ?? []).forEach((r) => map.set(r.garment.sku, r.verdict));
    return map;
  }, [compatibility]);

  const reasonBySku = useMemo(() => {
    const map = new Map<string, string[]>();
    (compatibility?.results ?? []).forEach((r) => map.set(r.garment.sku, r.reasons));
    return map;
  }, [compatibility]);

  const orderedGarments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const visible = garments
      .filter((g) => {
        if (showExcluded) return true;
        return verdictBySku.get(g.sku) !== "excluded";
      })
      .filter((g) => {
        if (!query) return true;
        return [g.name, g.sku, g.category, g.brand ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
    return [...visible].sort((a, b) => {
      const ra = verdictBySku.get(a.sku) === "compatible" ? 0 : 1;
      const rb = verdictBySku.get(b.sku) === "compatible" ? 0 : 1;
      return ra - rb;
    });
  }, [garments, showExcluded, verdictBySku, searchQuery]);

  const handleSelect = (g: Garment) => {
    const isSameGarment = selectedGarment?.sku === g.sku;
    setSelectedGarment(g);
    if (!isSameGarment) runAnalysis(user?.id || "usr_94b3a8c1", moodModifier);
  };

  const handleGarmentCreated = (newGarment: Garment) => {
    handleSelect(newGarment);
  };

  const formatMaterials = (materials: Record<string, number>) => {
    return Object.entries(materials)
      .map(([name, pct]) => `${Math.round(pct * 100)}% ${name.replace("_", " ")}`)
      .join(", ");
  };

  const excludedCount = compatibility?.excludedCount ?? 0;
  const compatibleCount = compatibility?.compatibleCount ?? 0;

  return (
    <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shirt className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">Select Garment from Studio Catalog</h3>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 text-xs font-semibold transition-all hover:scale-105"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Piece</span>
        </button>
      </div>

      {/* Compatibility toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-secondary/30 px-3 py-2">
        <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground min-w-0 flex-1">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          {compatibilityLoading ? (
            <span>Running color / fit / fabric compatibility agents…</span>
          ) : compatibility ? (
            <span className="truncate">
              <span className="font-bold text-foreground">{compatibleCount} compatible</span> with your{" "}
              <span className="font-semibold text-foreground">{compatibility.colorSeason}</span> profile
              {compatibility.preferredFit !== "regular" && (
                <> · {compatibility.preferredFit} fit</>
              )}
              {compatibility.allergies.length > 0 && (
                <> · allergen guard: {compatibility.allergies.join(", ")}</>
              )}
            </span>
          ) : (
            <span>Compatibility unavailable.</span>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog…"
            className="w-36 pl-7 pr-2 py-1.5 rounded-full bg-card border border-border/70 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {excludedCount > 0 && (
          <button
            onClick={toggleShowExcluded}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
              showExcluded
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {showExcluded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showExcluded ? "Hide" : "Show"} {excludedCount} Excluded</span>
          </button>
        )}
      </div>

      {!showExcluded && excludedCount > 0 && !searchQuery && (
        <p className="text-[10px] text-muted-foreground -mt-1">
          Garments that clash with your skin tones, fit preference, or allergens are hidden.
          Use “Show {excludedCount} Excluded” to inspect them.
        </p>
      )}

      {/* Horizontal Garment Cards Scroll */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {orderedGarments.map((g) => {
          const isSelected = selectedGarment?.sku === g.sku;
          const verdict = verdictBySku.get(g.sku) ?? "compatible";
          const reasons = reasonBySku.get(g.sku) ?? [];
          const isExcluded = verdict === "excluded";
          return (
            <div
              key={g.sku}
              onClick={() => handleSelect(g)}
              title={isExcluded ? reasons.join("\n") : undefined}
              className={`relative rounded-2xl p-2.5 border cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/30"
                  : isExcluded
                    ? "border-border/60 bg-muted/20 opacity-60 grayscale-[40%] hover:opacity-90"
                    : "border-border/80 bg-secondary/30 hover:bg-secondary hover:border-border"
              }`}
            >
              {/* Selected check badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              {/* Excluded badge */}
              {isExcluded && !isSelected && (
                <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-full bg-destructive/90 text-destructive-foreground text-[8px] font-bold uppercase tracking-wide shadow-sm">
                  Excluded
                </div>
              )}

              {/* Garment Image / Color Swatch */}
              <div className="relative w-full h-24 rounded-xl overflow-hidden mb-2 bg-muted/40 flex items-center justify-center">
                <img
                  src={g.imageUrl || import.meta.env.NEXT_PUBLIC_DEFAULT_GARMENT_IMAGE_URL || ""}
                  alt={g.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Color Dot Swatch */}
                <div
                  className="absolute bottom-1.5 left-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: g.colorHex }}
                  title={`Color: ${g.colorHex}`}
                />
              </div>

              {/* Details */}
              <div className="space-y-1">
                <h4 className="font-bold text-[11px] leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {g.name}
                </h4>
                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  {formatMaterials(g.materials)}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-extrabold text-foreground">
                    ${g.price?.toFixed(0) || 95}
                  </span>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {g.category.split("_")[0]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {orderedGarments.length === 0 && (
          <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
            {searchQuery
              ? `No garments match “${searchQuery}”.`
              : "No garments available. Add a custom piece to get started."}
          </div>
        )}
      </div>

      <CustomGarmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGarmentCreated={handleGarmentCreated}
      />
    </div>
  );
};
