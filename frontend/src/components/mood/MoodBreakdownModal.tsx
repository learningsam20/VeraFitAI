"use client";

import React from "react";
import { useMoodStore, MOOD_PRESETS } from "@/stores/moodStore";
import { useTryOnStore } from "@/stores/tryOnStore";
import { useAuthStore } from "@/stores/authStore";
import {
  Sliders,
  Calendar,
  CloudSun,
  Activity,
  Sparkles,
  X,
  Check,
  TrendingUp,
  Info,
  Layers,
  Flame,
  ShieldCheck,
} from "lucide-react";

export const MoodBreakdownModal: React.FC = () => {
  const {
    moodModifier,
    factors,
    isBreakdownModalOpen,
    setBreakdownModalOpen,
    updateFactors,
    applyPreset,
    getMoodLabel,
  } = useMoodStore();

  const { runAnalysis, selectedGarment, isLoading } = useTryOnStore();
  const { user } = useAuthStore();

  if (!isBreakdownModalOpen) return null;

  const handleApplyAndRecalculate = () => {
    setBreakdownModalOpen(false);
    if (selectedGarment && !isLoading) {
      runAnalysis(user?.id || "usr_94b3a8c1", moodModifier);
    }
  };

  const formatSignedNumber = (num: number) => (num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="mood-breakdown-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border bg-gradient-to-r from-primary/10 via-secondary/40 to-transparent flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="mood-breakdown-title" className="text-base sm:text-lg font-bold text-foreground">
                Daily Mood Telemetry Calculator
              </h2>
              <p className="text-xs text-muted-foreground">
                Understand how environmental & biometric factors shape your purchase certainty weights
              </p>
            </div>
          </div>
          <button
            onClick={() => setBreakdownModalOpen(false)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Compound Score Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-secondary/50 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                {formatSignedNumber(moodModifier)}
              </div>
              <div>
                <span className="text-[11px] uppercase font-bold text-primary tracking-wider">Active State</span>
                <h3 className="text-base font-extrabold text-foreground">{getMoodLabel()}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {moodModifier < 0
                    ? "Prioritizing low-friction fabrics, breathable weaves & relaxed comfort."
                    : "Prioritizing sharp tailoring, high color contrast & structured silhouettes."}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
                Formula Sync Active
              </span>
            </div>
          </div>

          {/* Mathematical Formulation Explainer */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 text-xs text-muted-foreground space-y-2 shadow-xs">
            <div className="flex items-center text-foreground font-semibold text-xs">
              <Info className="w-4 h-4 mr-1.5 text-primary" />
              <span>Multi-Factor Synthesis Formula:</span>
            </div>
            <div className="font-mono text-[11px] bg-muted/60 p-2.5 rounded-xl border border-border text-foreground/90 overflow-x-auto">
              Mood Index (μ) = 0.45×Agenda + 0.25×Weather + 0.20×Biometrics + 0.10×Manual
            </div>
            <p className="text-[11px] leading-relaxed">
              The AI synthesis agent uses this index to dynamically adjust the penalty curve for fabric friction vs. silhouette precision during real-time VTO analysis.
            </p>
          </div>

          {/* Interactive Factor Inputs */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Factor Components & Telemetry
            </h4>

            {/* 1. Agenda Factor */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground">1. Agenda & Social Context (45%)</span>
                    <p className="text-[11px] text-muted-foreground">{factors.agendaLabel}</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-foreground">
                  {formatSignedNumber(factors.agendaScore)}
                </span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.05"
                value={factors.agendaScore}
                onChange={(e) => updateFactors({ agendaScore: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Cozy WFH (-0.50)</span>
                <span>Casual Sync (0.00)</span>
                <span>Executive Review (+0.50)</span>
              </div>
            </div>

            {/* 2. Weather / Climate */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <CloudSun className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground">2. Climate & Ambient Weather (25%)</span>
                    <p className="text-[11px] text-muted-foreground">{factors.weatherLabel}</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-foreground">
                  {formatSignedNumber(factors.weatherScore)}
                </span>
              </div>
              <input
                type="range"
                min="-0.3"
                max="0.3"
                step="0.05"
                value={factors.weatherScore}
                onChange={(e) => updateFactors({ weatherScore: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Rain & Cold (-0.30)</span>
                <span>Temperate (0.00)</span>
                <span>Warm & Crisp (+0.30)</span>
              </div>
            </div>

            {/* 3. Biometrics / Energy */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground">3. Biometric Readiness & Rest (20%)</span>
                    <p className="text-[11px] text-muted-foreground">{factors.biometricLabel}</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-foreground">
                  {formatSignedNumber(factors.biometricScore)}
                </span>
              </div>
              <input
                type="range"
                min="-0.2"
                max="0.2"
                step="0.05"
                value={factors.biometricScore}
                onChange={(e) => updateFactors({ biometricScore: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Low Energy / Rest (-0.20)</span>
                <span>Neutral (0.00)</span>
                <span>Peak Focus (+0.20)</span>
              </div>
            </div>
          </div>

          {/* Instant Presets */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Instant Context Presets
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MOOD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className="p-3 rounded-2xl border border-border bg-secondary/30 hover:bg-secondary/80 hover:border-primary/50 transition-all text-left flex items-start space-x-3 group"
                >
                  <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">{preset.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {preset.name}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {preset.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border bg-secondary/20 flex items-center justify-between">
          <button
            onClick={() => setBreakdownModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyAndRecalculate}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 hover:shadow-lg transition-all flex items-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Apply & Recalculate Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
};
