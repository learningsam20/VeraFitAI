"use client";

import React from "react";
import { DiagnosticsData } from "@/lib/api";
import { Shield, AlertTriangle, AlertOctagon, CheckCircle2, HeartPulse, Sparkles } from "lucide-react";

interface FabricSafetyTabProps {
  fabricScore: number;
  materials: Record<string, number>;
  diagnostics: DiagnosticsData;
}

export const FabricSafetyTab: React.FC<FabricSafetyTabProps> = ({
  fabricScore,
  materials,
  diagnostics,
}) => {
  return (
    <div className="space-y-6 text-xs animate-in fade-in duration-300">
      {/* Equation Formulation Header */}
      <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
        <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
          <span className="font-bold flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-emerald-500" />
            Fabric-to-Skin Friction & Sensitivity Formulation
          </span>
          <span className="font-mono text-[11px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
            Safety Score = {fabricScore.toFixed(1)}%
          </span>
        </div>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          The Fabric Agent extracts fiber composition, calculates rough surface friction vectors, and audits the garment against your biometric skin concerns (e.g., YouCam Rosacea Score) and recorded allergen safe-list.
        </p>
        <div className="font-mono text-[11px] bg-background/80 p-2.5 rounded-xl border border-border text-center overflow-x-auto">
          S_fabric = Clamp( 100 - (Friction_index × Skin_Rosacea × 0.35) - Heat_Penalty, 0, 100 ) × M_allergy
        </div>
      </div>

      {/* Grid: Fiber Breakdown + Allergy/Skin Audit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fiber Composition */}
        <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-3">
          <span className="font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Garment Material Matrix
          </span>
          <div className="space-y-2">
            {Object.entries(materials).map(([mat, pct], idx) => (
              <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-background/60 border border-border">
                <span className="capitalize font-medium text-foreground">{mat.replace("_", " ")}</span>
                <span className="font-mono font-bold text-primary">{Math.round(pct * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Biometric Skin Audit */}
        <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-3">
          <span className="font-bold text-foreground flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            Biometric Skin Concerns Cross-Reference
          </span>
          <div className="space-y-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-background/60 border border-border flex justify-between items-center">
              <span className="text-muted-foreground">Neck/Cheek Rosacea:</span>
              <span className="font-bold text-foreground">38.5 / 100 (Mild)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border flex justify-between items-center">
              <span className="text-muted-foreground">Skin Sensitivity Index:</span>
              <span className="font-bold text-foreground">62.0 / 100 (Sensitive)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-background/60 border border-border flex justify-between items-center">
              <span className="text-muted-foreground">Allergy Multiplier (M_allergy):</span>
              <span className={`font-mono font-bold ${diagnostics.allergyDetected ? "text-destructive" : "text-emerald-500"}`}>
                {diagnostics.allergyDetected ? "0.40 (Hard Penalty)" : "1.00 (No Conflict)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings & Alerts List */}
      <div className="space-y-2">
        {diagnostics.allergyDetected && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start space-x-3">
            <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Hard Allergy Trigger Identified</span>
              <p>Garment material matches your recorded sensitivity safe-list. A 0.40 hard penalty multiplier was applied.</p>
            </div>
          </div>
        )}

        {(diagnostics.fabricWarnings || []).length > 0 ? (
          (diagnostics.fabricWarnings || []).map((warning, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          ))
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Optimal fabric comfort — gentle weave with high breathability.</span>
          </div>
        )}
      </div>
    </div>
  );
};
