import { create } from "zustand";

export interface MoodFactors {
  agendaScore: number;       // -0.5 to +0.5 (e.g. Chill WFH vs Board Presentation)
  agendaLabel: string;
  weatherScore: number;      // -0.3 to +0.3 (e.g. Rainy Chill vs Sunny Resort)
  weatherLabel: string;
  biometricScore: number;    // -0.2 to +0.2 (e.g. Fatigue vs Peak Readiness)
  biometricLabel: string;
  manualOffset: number;      // -0.5 to +0.5
}

export interface MoodPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  factors: MoodFactors;
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: "power_boardroom",
    name: "Executive Boardroom",
    icon: "💼",
    description: "High-stakes presentation requiring structured silhouettes and crisp tailoring.",
    factors: {
      agendaScore: 0.50,
      agendaLabel: "Keynote & Executive Review",
      weatherScore: 0.10,
      weatherLabel: "Cool & Crisp Morning (15°C)",
      biometricScore: 0.20,
      biometricLabel: "Peak Energy & Focus (Sleep: 92)",
      manualOffset: 0.10,
    }
  },
  {
    id: "cozy_wfh",
    name: "Cozy WFH & Focus",
    icon: "☕",
    description: "Deep work day prioritizing low skin friction, breathable textiles, and relaxed drape.",
    factors: {
      agendaScore: -0.45,
      agendaLabel: "Remote Coding & Async Syncs",
      weatherScore: -0.25,
      weatherLabel: "Continuous Rain & Overcast (11°C)",
      biometricScore: -0.10,
      biometricLabel: "Mild Fatigue / Rest Recovery",
      manualOffset: -0.10,
    }
  },
  {
    id: "smart_creative",
    name: "Creative Client Meeting",
    icon: "🎨",
    description: "Balanced smart-casual balancing aesthetic expressiveness with approachable comfort.",
    factors: {
      agendaScore: 0.20,
      agendaLabel: "Design Critique & Coffee Chat",
      weatherScore: 0.05,
      weatherLabel: "Pleasant & Breezy (20°C)",
      biometricScore: 0.05,
      biometricLabel: "Balanced Readiness (Sleep: 81)",
      manualOffset: 0.0,
    }
  },
  {
    id: "evening_gala",
    name: "Evening Gala / Date Night",
    icon: "✨",
    description: "Formal nighttime engagement with elevated color harmony and structured silhouette.",
    factors: {
      agendaScore: 0.60,
      agendaLabel: "Charity Gala & Cocktail Reception",
      weatherScore: 0.0,
      weatherLabel: "Clear Night (18°C)",
      biometricScore: 0.15,
      biometricLabel: "High Social Energy",
      manualOffset: 0.15,
    }
  }
];

function calculateCompoundMood(f: MoodFactors): number {
  const sum = (f.agendaScore * 0.45) + (f.weatherScore * 0.25) + (f.biometricScore * 0.20) + (f.manualOffset * 0.10);
  // Scale to -1.0 .. +1.0 clamped
  return Math.max(-1.0, Math.min(1.0, parseFloat((sum * 2.0).toFixed(2))));
}

interface MoodState {
  moodModifier: number; // -1.0 (Cozy) to +1.0 (Power)
  factors: MoodFactors;
  isBreakdownModalOpen: boolean;
  setMoodModifier: (value: number) => void;
  setBreakdownModalOpen: (open: boolean) => void;
  updateFactors: (partial: Partial<MoodFactors>) => void;
  applyPreset: (presetId: string) => void;
  getMoodLabel: () => string;
}

export const useMoodStore = create<MoodState>((set, get) => ({
  moodModifier: 0.0,
  factors: {
    agendaScore: 0.10,
    agendaLabel: "Hybrid Product Review",
    weatherScore: -0.05,
    weatherLabel: "Overcast & Mild (16°C)",
    biometricScore: 0.05,
    biometricLabel: "Rested & Focused (Sleep: 84)",
    manualOffset: 0.0,
  },
  isBreakdownModalOpen: false,
  setMoodModifier: (value: number) => {
    const clamped = Math.max(-1.0, Math.min(1.0, value));
    set({ moodModifier: clamped });
  },
  setBreakdownModalOpen: (open: boolean) => set({ isBreakdownModalOpen: open }),
  updateFactors: (partial: Partial<MoodFactors>) => {
    const current = get().factors;
    const updated = { ...current, ...partial };
    const calculated = calculateCompoundMood(updated);
    set({ factors: updated, moodModifier: calculated });
  },
  applyPreset: (presetId: string) => {
    const preset = MOOD_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      const calculated = calculateCompoundMood(preset.factors);
      set({ factors: { ...preset.factors }, moodModifier: calculated });
    }
  },
  getMoodLabel: () => {
    const val = get().moodModifier;
    if (val <= -0.6) return "Pure Cozy / Cocoon";
    if (val <= -0.2) return "Relaxed Casual";
    if (val < 0.2) return "Everyday Balanced";
    if (val < 0.6) return "Smart Casual";
    return "Structured / Power";
  },
}));
