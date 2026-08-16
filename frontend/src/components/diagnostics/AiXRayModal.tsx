"use client";

import React from "react";
import { useTryOnStore } from "@/stores/tryOnStore";
import { X, Activity, Sparkles, Palette, Shield, Bot } from "lucide-react";
import { FitHeatmapTab } from "./FitHeatmapTab";
import { ColorSeasonTab } from "./ColorSeasonTab";
import { FabricSafetyTab } from "./FabricSafetyTab";

export const AiXRayModal: React.FC = () => {
  const {
    isDiagnosticsOpen,
    setDiagnosticsOpen,
    activeDiagnosticTab,
    setActiveDiagnosticTab,
    activeResult,
    selectedGarment,
  } = useTryOnStore();

  if (!isDiagnosticsOpen || !activeResult) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>AI X-Ray Explainability Inspector</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {activeResult.keepProbabilityScore.toFixed(1)}% Match
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Deterministic mathematical reasoning behind {selectedGarment?.name || "Garment"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setDiagnosticsOpen(false)}
            className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Natural Language Synthesis Banner */}
        {(() => {
          const fitScore = activeResult.scores.fitRepeatability ?? activeResult.scores.ssimScore ?? 92;
          const colorScore = activeResult.scores.colorHarmony ?? activeResult.scores.colorHarmonyScore ?? 88;
          const fabricScore = activeResult.scores.fabricSafety ?? activeResult.scores.fabricAllergyScore ?? 95;
          const explanation = activeResult.explanation || activeResult.aiExplanation || "Style certainty analysis completed.";

          return (
            <>
              <div className="px-6 py-3 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 border-b border-border/80 flex items-start space-x-3 text-xs">
                <Bot className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground">AI Synthesis Verdict</span>
                  <p className="text-muted-foreground leading-relaxed">
                    {explanation}
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="px-6 border-b border-border flex space-x-6 bg-card text-xs font-bold">
                <button
                  onClick={() => setActiveDiagnosticTab("fit")}
                  className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
                    activeDiagnosticTab === "fit"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Fit Consistency & Heatmap ({fitScore.toFixed(0)}%)</span>
                </button>

                <button
                  onClick={() => setActiveDiagnosticTab("color")}
                  className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
                    activeDiagnosticTab === "color"
                      ? "border-violet-500 text-violet-600 dark:text-violet-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  <span>Color Season Matching ({colorScore.toFixed(0)}%)</span>
                </button>

                <button
                  onClick={() => setActiveDiagnosticTab("fabric")}
                  className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
                    activeDiagnosticTab === "fabric"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Fabric & Skin Safety ({fabricScore.toFixed(0)}%)</span>
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {activeDiagnosticTab === "fit" && (
                  <FitHeatmapTab
                    fitScore={fitScore}
                    diagnostics={activeResult.diagnostics}
                  />
                )}

                {activeDiagnosticTab === "color" && (
                  <ColorSeasonTab
                    colorScore={colorScore}
                    garmentHex={selectedGarment?.colorHex || "#2C3E50"}
                    diagnostics={activeResult.diagnostics}
                  />
                )}

                {activeDiagnosticTab === "fabric" && (
                  <FabricSafetyTab
                    fabricScore={fabricScore}
                    materials={selectedGarment?.materials || {}}
                    diagnostics={activeResult.diagnostics}
                  />
                )}
              </div>
            </>
          );
        })()}

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/30 flex justify-end">
          <button
            onClick={() => setDiagnosticsOpen(false)}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
