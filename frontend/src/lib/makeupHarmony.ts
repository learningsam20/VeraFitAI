import { MannequinProfile } from "@/lib/api";
import { EventSlot } from "@/stores/calendarStore";

export interface MakeupSwatch {
  hex: string;
  label: string;
}

export interface MakeupProduct {
  name: string;
  category: "lip" | "cheek" | "eye" | "base" | "gloss";
  shade: string;
  hex: string;
  note: string;
}

export type MakeupIntensity = "minimal" | "glow" | "polished" | "statement";

export interface MakeupHarmony {
  lookName: string;
  intensity: MakeupIntensity;
  reasoning: string;
  swatches: MakeupSwatch[];
  products: MakeupProduct[];
  avoidList: string[];
  seasonalTag: string;
}

interface SeasonAnchor {
  tag: string;
  accent: string;
  swatches: MakeupSwatch[];
}

const SEASON_ANCHORS: Record<string, SeasonAnchor> = {
  "Cool Winter": {
    tag: "Cool Winter · Icy Berry",
    accent: "berry",
    swatches: [
      { hex: "#C2185B", label: "Crimson Berry" },
      { hex: "#6A1B9A", label: "Plum" },
      { hex: "#AD1457", label: "Raspberry" },
      { hex: "#283593", label: "Midnight Navy Liner" },
      { hex: "#F8BBD0", label: "Icy Rose Sheen" },
    ],
  },
  "Cool Summer": {
    tag: "Cool Summer · Dusty Rose",
    accent: "dusty rose",
    swatches: [
      { hex: "#B76E79", label: "Dusty Rose" },
      { hex: "#7E8AA2", label: "Slate Blue" },
      { hex: "#A1887F", label: "Heather Taupe" },
      { hex: "#C0A0B9", label: "Mauve" },
      { hex: "#E8D8D3", label: "Soft Shell" },
    ],
  },
  "Warm Autumn": {
    tag: "Warm Autumn · Terracotta",
    accent: "terracotta",
    swatches: [
      { hex: "#C2652C", label: "Terracotta" },
      { hex: "#8B5A2B", label: "Espresso Bronze" },
      { hex: "#6B8E23", label: "Olive" },
      { hex: "#FF8C00", label: "Amber" },
      { hex: "#D2A679", label: "Caramel Glow" },
    ],
  },
  "Warm Spring": {
    tag: "Warm Spring · Coral Glow",
    accent: "coral",
    swatches: [
      { hex: "#FF7F50", label: "Coral" },
      { hex: "#FFD166", label: "Buttercup" },
      { hex: "#40C9A2", label: "Warm Turquoise" },
      { hex: "#FFB6A3", label: "Peach Bloom" },
      { hex: "#F9E79F", label: "Champagne" },
    ],
  },
  "Deep Autumn": {
    tag: "Deep Autumn · Mahogany",
    accent: "mahogany",
    swatches: [
      { hex: "#5E2612", label: "Mahogany" },
      { hex: "#CD853F", label: "Bronze" },
      { hex: "#228B22", label: "Forest" },
      { hex: "#6D3B2A", label: "Plumwood" },
      { hex: "#C68642", label: "Rust Glow" },
    ],
  },
};

const DEFAULT_ANCHOR = SEASON_ANCHORS["Cool Winter"];

const LIP_BY_UNDERTONE: Record<string, Record<MakeupIntensity, { shade: string; hex: string }>> = {
  cool: {
    statement: { shade: "Crimson Berry", hex: "#C2185B" },
    polished: { shade: "Raspberry", hex: "#AD1457" },
    glow: { shade: "Icy Rose Tint", hex: "#EC407A" },
    minimal: { shade: "Mauve Balm", hex: "#C0869E" },
  },
  warm: {
    statement: { shade: "Ember Coral", hex: "#BF360C" },
    polished: { shade: "Terracotta", hex: "#E65100" },
    glow: { shade: "Peach Tint", hex: "#F48FB1" },
    minimal: { shade: "Caramel Balm", hex: "#C28E5C" },
  },
  neutral: {
    statement: { shade: "Ruby Rose", hex: "#C62828" },
    polished: { shade: "Rosewood", hex: "#C0657A" },
    glow: { shade: "Soft Rose Tint", hex: "#F2A3B4" },
    minimal: { shade: "Taupe Balm", hex: "#C9B49B" },
  },
};

function moodIntensity(mood: number, agendaType: EventSlot["agendaType"]): MakeupIntensity {
  if (agendaType === "gala" || mood >= 0.6) return "statement";
  if (agendaType === "formal" || mood >= 0.2) return "polished";
  if (mood >= -0.2) return "glow";
  return "minimal";
}

function pickBase(undertone: "cool" | "warm" | "neutral", intensity: MakeupIntensity, rosacea: number): MakeupProduct {
  if (rosacea > 40) {
    return {
      name: "Green-Tone Color Correcting Primer",
      category: "base",
      shade: "Neutralizing Green",
      hex: "#A8D5A2",
      note: "Counter-balances facial erythema before foundation to prevent red clash.",
    };
  }
  const baseByTone = {
    cool: { shade: "Ivory Porcelain", hex: "#F3E5D8" },
    warm: { shade: "Golden Honey", hex: "#E8C39E" },
    neutral: { shade: "Fair Sand", hex: "#EDD3B6" },
  };
  return {
    name: intensity === "minimal" ? "Hydrating Tinted Moisturizer" : "Weightless Tinted Base",
    category: "base",
    shade: baseByTone[undertone].shade,
    hex: baseByTone[undertone].hex,
    note: "Matches your CIELab skin-tone luminance for seamless natural wear.",
  };
}

function pickCheek(undertone: "cool" | "warm" | "neutral", intensity: MakeupIntensity, rosacea: number): MakeupProduct {
  const cheekByTone = {
    cool: { shade: "Dusty Rose", hex: "#C97B8F" },
    warm: { shade: "Apricot", hex: "#E8A87C" },
    neutral: { shade: "Mauve Bloom", hex: "#D8A7A0" },
  };
  if (rosacea > 40) {
    return {
      name: "Mineral Soft Blush",
      category: "cheek",
      shade: "Muted Taupe Rose",
      hex: "#C79E8C",
      note: "Skipping saturated red blushes avoids amplifying existing erythema.",
    };
  }
  return {
    name: intensity === "statement" ? "Cream Blush Pop" : "Sheer Blush Glow",
    category: "cheek",
    shade: cheekByTone[undertone].shade,
    hex: cheekByTone[undertone].hex,
    note: `${intensity === "minimal" ? "Barely-there wash" : "Lifted flush"} tuned to your undertone.`,
  };
}

function pickEye(undertone: "cool" | "warm" | "neutral", intensity: MakeupIntensity, sensitivity: number): MakeupProduct {
  const eyeByTone = {
    cool: { shade: "Midnight Slate", hex: "#283593" },
    warm: { shade: "Bronze Umber", hex: "#7A4E2D" },
    neutral: { shade: "Taupe Smoke", hex: "#6E6259" },
  };
  return {
    name: intensity === "statement" ? "Precision Liquid Liner" : "Soft Definition Shadow",
    category: "eye",
    shade: eyeByTone[undertone].shade,
    hex: eyeByTone[undertone].hex,
    note: sensitivity > 50
      ? "Fragrance-free, talc-free formula chosen for sensitive lids."
      : intensity === "statement"
        ? "Crisp wing definition for evening drama."
        : "Blended soft-focus for low-effort polish.",
  };
}

function pickGloss(undertone: "cool" | "warm" | "neutral", intensity: MakeupIntensity, sensitivity: number): MakeupProduct {
  const glossByTone = {
    cool: { shade: "Icy Rose Sheen", hex: "#F8BBD0" },
    warm: { shade: "Caramel Glow", hex: "#D2A679" },
    neutral: { shade: "Champagne Beige", hex: "#E5C99A" },
  };
  return {
    name: intensity === "minimal" ? "Lip Recovery Balm" : "Glossy Lip Finish",
    category: "gloss",
    shade: glossByTone[undertone].shade,
    hex: glossByTone[undertone].hex,
    note: sensitivity > 50 ? "Ceramide barrier balm, free of fragrance and dye." : "Glass-like glow to complete the look.",
  };
}

export function deriveMakeupHarmony(profile: MannequinProfile | null, slot: EventSlot): MakeupHarmony {
  const season = profile?.colorSeason || profile?.detectedSeason || "Cool Winter";
  const undertoneRaw = (profile?.skinUndertone || "Cool").toLowerCase();
  const undertone: "cool" | "warm" | "neutral" =
    undertoneRaw.includes("warm") ? "warm" : undertoneRaw.includes("neutral") ? "neutral" : "cool";

  const concerns = profile?.detectedConcerns || {};
  const rosacea = concerns.rosacea || 0;
  const sensitivity = concerns.sensitivity || 0;

  const anchor = SEASON_ANCHORS[season] || DEFAULT_ANCHOR;
  const intensity = moodIntensity(slot.computedMood, slot.agendaType);

  const lip = LIP_BY_UNDERTONE[undertone][intensity];
  const base = pickBase(undertone, intensity, rosacea);
  const cheek = pickCheek(undertone, intensity, rosacea);
  const eye = pickEye(undertone, intensity, sensitivity);
  const gloss = pickGloss(undertone, intensity, sensitivity);

  const products: MakeupProduct[] = [
    { name: "Velvet Matte Lipstick", category: "lip", ...lip, note: lip.shade === "Crimson Berry" && rosacea > 40 ? "Muted to avoid red clash with existing erythema." : `Flattering for ${undertone} undertones.` },
    cheek,
    eye,
    base,
    gloss,
  ];

  const avoidList: string[] = [];
  if (rosacea > 40) {
    avoidList.push("Saturated crimson & neon coral blushes");
    avoidList.push("High-sparkle red pigments that amplify erythema");
  }
  if (sensitivity > 50) {
    avoidList.push("Fragranced lip and eye products");
    avoidList.push("Glitter & talc-based powders");
  }
  if (intensity === "statement" && season.startsWith("Cool")) {
    avoidList.push("Warm terracotta bases that clash with cool skin undertones");
  }

  const moodLabel =
    intensity === "statement" ? "high-formality" : intensity === "polished" ? "polished" : intensity === "glow" ? "relaxed glow" : "low-stimulus";

  const reasoning =
    `${season} undertones (${undertone}) with ${rosacea > 0 ? `${rosacea}% rosacea and ` : ""}${sensitivity > 0 ? `${sensitivity}% sensitivity` : "no flagged sensitivities"} drive a ${moodLabel} ${intensity} look. ` +
    `Lip locked to ${lip.shade}${rosacea > 40 ? " (erythema-dampened)" : ""} with ${base.name.toLowerCase()} and ${cheek.name.toLowerCase()} balancing the ${anchor.accent} accent.`;

  return {
    lookName: `${anchor.tag} · ${intensity.charAt(0).toUpperCase() + intensity.slice(1)}`,
    intensity,
    reasoning,
    swatches: [
      { hex: lip.hex, label: `${lip.shade} Lip` },
      ...anchor.swatches.filter((s) => s.hex !== lip.hex).slice(0, 3),
      { hex: base.hex, label: `${base.shade} Base` },
    ],
    products,
    avoidList,
    seasonalTag: anchor.tag,
  };
}
