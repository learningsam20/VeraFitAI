"use client";

import React, { useState } from "react";
import { Garment, api } from "@/lib/api";
import { X, Plus, Sparkles, Sliders } from "lucide-react";

interface CustomGarmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGarmentCreated: (garment: Garment) => void;
}

export const CustomGarmentModal: React.FC<CustomGarmentModalProps> = ({
  isOpen,
  onClose,
  onGarmentCreated,
}) => {
  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState("#2C3E50");
  const [category, setCategory] = useState<"tops" | "bottoms" | "dresses" | "outerwear" | "shoes">("tops");
  const [woolPct, setWoolPct] = useState(0);
  const [cottonPct, setCottonPct] = useState(50);
  const [polyPct, setPolyPct] = useState(30);
  const [silkPct, setSilkPct] = useState(0);
  const [linenPct, setLinenPct] = useState(20);
  const [formality, setFormality] = useState(0.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const totalPct = woolPct + cottonPct + polyPct + silkPct + linenPct || 100;
    const materials: Record<string, number> = {};
    if (woolPct > 0) materials["wool"] = Number((woolPct / totalPct).toFixed(2));
    if (cottonPct > 0) materials["cotton"] = Number((cottonPct / totalPct).toFixed(2));
    if (polyPct > 0) materials["polyester"] = Number((polyPct / totalPct).toFixed(2));
    if (silkPct > 0) materials["silk"] = Number((silkPct / totalPct).toFixed(2));
    if (linenPct > 0) materials["linen"] = Number((linenPct / totalPct).toFixed(2));

    const newGarment: Garment = {
      sku: `CUSTOM-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim() || "Custom Tailored Piece",
      colorHex,
      materials,
      category,
      brand: "Custom Creation",
      price: 110.0,
      imageUrl: import.meta.env.NEXT_PUBLIC_DEFAULT_GARMENT_IMAGE_URL || "",
      formalityIndex: formality,
    };

    try {
      const created = await api.addCustomGarment(newGarment);
      onGarmentCreated(created);
      onClose();
    } catch (err) {
      console.error("Failed to add garment", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">Add Garment to Studio</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Garment Name */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Garment Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cashmere Blend Mockneck"
              className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              required
            />
          </div>

          {/* Color Hex & Swatch */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Dominant Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-32 px-3 py-2 rounded-xl bg-secondary/50 border border-border font-mono uppercase text-foreground"
              />
              <span className="text-[11px] text-muted-foreground">Will be tested against CIELab palette</span>
            </div>
          </div>

          {/* Material Composition Sliders */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-foreground">Fabric Composition</label>
              <span className="text-[10px] text-muted-foreground">Used for Fabric Safety & Allergy node</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Wool / Merino ({woolPct}%)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={woolPct}
                  onChange={(e) => setWoolPct(Number(e.target.value))}
                  className="w-36 h-1.5 bg-muted rounded appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Organic Cotton ({cottonPct}%)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cottonPct}
                  onChange={(e) => setCottonPct(Number(e.target.value))}
                  className="w-36 h-1.5 bg-muted rounded appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Polyester / Synthetic ({polyPct}%)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={polyPct}
                  onChange={(e) => setPolyPct(Number(e.target.value))}
                  className="w-36 h-1.5 bg-muted rounded appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Linen / Flax ({linenPct}%)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={linenPct}
                  onChange={(e) => setLinenPct(Number(e.target.value))}
                  className="w-36 h-1.5 bg-muted rounded appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Silk ({silkPct}%)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={silkPct}
                  onChange={(e) => setSilkPct(Number(e.target.value))}
                  className="w-36 h-1.5 bg-muted rounded appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 shadow-md shadow-primary/20 transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "Adding..." : "Add to Catalog"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
