"use client";

import React from "react";
import { DiagnosticsData } from "@/lib/api";
import { Palette, CheckCircle2, AlertTriangle, Eye, Compass } from "lucide-react";

interface ColorSeasonTabProps {
  colorScore: number;
  garmentHex: string;
  diagnostics: DiagnosticsData;
}

export const ColorSeasonTab: React.FC<ColorSeasonTabProps> = ({
  colorScore,
  garmentHex,
  diagnostics,
}) => {
  const lab = diagnostics.garmentLab || [25.4, -4.2, -12.8];
  const palette = diagnostics.seasonPaletteHex || [
    "#000000",
    "#FFFFFF",
    "#1E3A8A",
    "#2C3E50",
    "#7E22CE",
    "#BE185D",
  ];

  return (
    <div className="space-y-6 text-xs animate-in fade-in duration-300">
      {/* CIELab Mathematical Formulation Header */}
      <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 space-y-2">
        <div className="flex items-center justify-between text-violet-800 dark:text-violet-300">
          <span className="font-bold flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-violet-500" />
            CIELab 1976 ΔE Chromatic Distance Formulation
          </span>
          <span className="font-mono text-[11px] font-bold bg-violet-500/10 px-2 py-0.5 rounded">
            Harmony Score = {colorScore.toFixed(1)}%
          </span>
        </div>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Garment hex colors are converted into perceptual CIELab coordinates (L* lightness, a* green-red, b* blue-yellow) and mapped against your calibrated {diagnostics.colorSeason} baseline.
        </p>
        <div className="font-mono text-[11px] bg-background/80 p-2.5 rounded-xl border border-border text-center overflow-x-auto">
          ΔE = √[ (L₁* - L₂*)² + (a₁* - a₂*)² + (b₁* - b₂*)² ]
        </div>
      </div>

      {/* Grid: Garment Swatch & Coordinates vs Seasonal Palette */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Garment Chromatic Vector */}
        <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-3">
          <span className="font-bold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4 text-violet-500" />
            Garment Color Space Mapping
          </span>

          <div className="flex items-center space-x-4">
            <div
              className="w-16 h-16 rounded-2xl shadow-inner border-2 border-white dark:border-slate-800 shrink-0"
              style={{ backgroundColor: garmentHex }}
            />
            <div className="space-y-1">
              <span className="font-mono font-bold text-sm text-foreground uppercase">
                {garmentHex}
              </span>
              <div className="font-mono text-[11px] text-muted-foreground space-y-0.5">
                <div>L* (Lightness): <span className="text-foreground font-semibold">{lab[0]}</span></div>
                <div>a* (Green ↔ Red): <span className="text-foreground font-semibold">{lab[1]}</span></div>
                <div>b* (Blue ↔ Yellow): <span className="text-foreground font-semibold">{lab[2]}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* User's Seasonal Palette */}
        <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-foreground">
              Your Profile: {diagnostics.colorSeason}
            </span>
            <span className="text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
              Cool Undertone
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] text-muted-foreground">Flattering Target Swatches:</span>
            <div className="flex items-center space-x-2">
              {palette.map((hex: string, idx: number) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-xl border border-white/40 dark:border-black/40 shadow-sm transition-transform hover:scale-110"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic Explanation Banner */}
      <div className={`p-4 rounded-2xl border flex items-start space-x-3 text-xs leading-relaxed ${
        colorScore >= 80
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
          : colorScore >= 60
          ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
          : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
      }`}>
        {colorScore >= 80 ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <span className="font-bold">Color Agent Diagnostic Verdict</span>
          <p>{diagnostics.colorMatchReason || `${garmentHex} aligns naturally with your seasonal color contrast profile.`}</p>
        </div>
      </div>
    </div>
  );
};
