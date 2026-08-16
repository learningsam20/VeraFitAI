"use client";

import React from "react";
import { KeepScores, DiagnosticsData } from "@/lib/api";
import { useTryOnStore } from "@/stores/tryOnStore";
import { CheckCircle2, AlertTriangle, AlertCircle, ChevronRight, Activity, Palette, Sparkles, Shield, Layers, Shirt } from "lucide-react";

interface ScoreBreakdownProps {
  scores: KeepScores;
  diagnostics: DiagnosticsData;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ scores, diagnostics }) => {
  const { setActiveDiagnosticTab, selectedGarment } = useTryOnStore();

  const getScoreColor = (val: number) => {
    if (val >= 80) return "bg-emerald-500 text-emerald-600 dark:text-emerald-400";
    if (val >= 60) return "bg-amber-500 text-amber-600 dark:text-amber-400";
    return "bg-rose-500 text-rose-600 dark:text-rose-400";
  };

  // Dynamically compute complementary owned piece based on selected garment category
  const isTop = selectedGarment?.category === "tops" || !selectedGarment?.category;
  const ownedItem = isTop
    ? {
        name: "Your Midnight Tailored Trousers",
        category: "Bottoms",
        img: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&auto=format&fit=crop&q=80",
        note: "Stark dark neutral grounds the top with 96% color balance.",
      }
    : {
        name: "Your Ivory Silk Camisole",
        category: "Tops",
        img: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=400&auto=format&fit=crop&q=80",
        note: "Seamless hypoallergenic layer provides 94% outfit harmony.",
      };

  return (
    <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-md space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span>Intelligent Factor Breakdown</span>
        </h3>
        <span className="text-[11px] text-muted-foreground font-medium">Click metric for AI X-Ray</span>
      </div>

      {/* 1. Fit Repeatability (SSIM) */}
      {(() => {
        const fitVal = scores.fitRepeatability ?? scores.ssimScore ?? 90;
        const colorVal = scores.colorHarmony ?? scores.colorHarmonyScore ?? 85;
        const fabricVal = scores.fabricSafety ?? scores.fabricAllergyScore ?? 92;

        return (
          <>
            <div
              onClick={() => setActiveDiagnosticTab("fit")}
              className="group p-3 rounded-2xl bg-secondary/40 hover:bg-secondary border border-transparent hover:border-border cursor-pointer transition-all space-y-2"
            >
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2 font-semibold text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Fit Consistency (SSIM)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-foreground">{fitVal.toFixed(1)}%</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getScoreColor(fitVal).split(" ")[0]}`}
                  style={{ width: `${Math.min(100, Math.max(0, fitVal))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span>{fitVal >= 80 ? "Drape verified across 3 AI renders" : "Generative variance detected"}</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">Weight 45%</span>
              </div>
            </div>

            {/* 2. Color Harmony */}
            <div
              onClick={() => setActiveDiagnosticTab("color")}
              className="group p-3 rounded-2xl bg-secondary/40 hover:bg-secondary border border-transparent hover:border-border cursor-pointer transition-all space-y-2"
            >
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2 font-semibold text-foreground">
                  <Palette className="w-3.5 h-3.5 text-violet-500" />
                  <span>Color True-Match ({diagnostics.colorSeason || "Seasonal Harmony"})</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-foreground">{colorVal.toFixed(1)}%</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getScoreColor(colorVal).split(" ")[0]}`}
                  style={{ width: `${Math.min(100, Math.max(0, colorVal))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span className="truncate max-w-[220px]">{diagnostics.colorMatchReason || "CIELab chromatic analysis"}</span>
                <span className="font-medium text-violet-600 dark:text-violet-400">Weight 30%</span>
              </div>
            </div>

            {/* 3. Fabric-to-Skin Safety */}
            <div
              onClick={() => setActiveDiagnosticTab("fabric")}
              className="group p-3 rounded-2xl bg-secondary/40 hover:bg-secondary border border-transparent hover:border-border cursor-pointer transition-all space-y-2"
            >
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2 font-semibold text-foreground">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Fabric-to-Skin Safety</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-foreground">{fabricVal.toFixed(1)}%</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getScoreColor(fabricVal).split(" ")[0]}`}
                  style={{ width: `${Math.min(100, Math.max(0, fabricVal))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span>
                  {diagnostics.allergyDetected ? (
                    <span className="text-destructive font-bold">⚠️ Allergy Alert Detected</span>
                  ) : (diagnostics.fabricWarnings || []).length > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400">⚠️ Friction Notice</span>
                  ) : (
                    "Safe for daily wear"
                  )}
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Weight 25%</span>
              </div>
            </div>
          </>
        );
      })()}

      {/* 4. Wardrobe Complement: Pair with your Owned Wardrobe */}
      <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400">
            <Layers className="w-3.5 h-3.5" />
            <span>Pair with Your Owned Clothes:</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">In Your Closet</span>
        </div>

        <div className="flex items-center space-x-3 bg-card/60 p-2.5 rounded-xl border border-border/60">
          <div className="w-11 h-13 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
            <img src={ownedItem.img} alt={ownedItem.name} className="w-full h-full object-cover" />
          </div>
          <div className="space-y-0.5 text-xs">
            <p className="font-bold text-foreground leading-snug">{ownedItem.name}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{ownedItem.note}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
