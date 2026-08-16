
import React, { useState, useEffect, useRef } from "react";
import { api, MannequinProfile, ColorReasoningData } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import {
  UserCheck,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Palette,
  HeartPulse,
  Save,
  UploadCloud,
  Check,
  Layers,
  Activity,
  Bot,
  Info,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function DigitalMannequinPage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<MannequinProfile | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [preferredFit, setPreferredFit] = useState("regular");
  const [colorSeason, setColorSeason] = useState("Cool Winter");
  const [comfortBias, setComfortBias] = useState(0.5);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAnalyzingSelfie, setIsAnalyzingSelfie] = useState(false);
  const [selfieError, setSelfieError] = useState<string | null>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzingColor, setIsAnalyzingColor] = useState(false);
  const [colorReasoning, setColorReasoning] = useState<ColorReasoningData | null>(null);

  const ALLERGY_OPTIONS = [
    { id: "wool", label: "Wool & Animal Fibers (Merino, Cashmere, Alpaca)" },
    { id: "synthetics", label: "Rough Synthetics (Polyester, Acrylic, Nylon)" },
    { id: "latex", label: "Latex & Rubber Elastic" },
    { id: "nickel", label: "Nickel & Metallic Threads" },
    { id: "silk", label: "Silk & Sericin Sensitivity" },
  ];

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const data = await api.getMannequinProfile(user?.id || "usr_94b3a8c1");
      setProfile(data);
      setAllergies(data.allergies || []);
      setPreferredFit(data.preferredFit || "regular");
      setColorSeason(data.colorSeason || "Cool Winter");
      setComfortBias(data.comfortVsStyleBias || 0.5);
      if (data.colorReasoning) {
        setColorReasoning(data.colorReasoning);
      }
    } catch (e) {
      console.error("Failed to load profile", e);
    }
  };

  const handleRunAutomatedColorScan = async () => {
    setIsAnalyzingColor(true);
    try {
      const reasoning = await api.analyzeColorSeasonReasoning(user?.id || "usr_94b3a8c1", profile?.skinToneHex);
      setColorReasoning(reasoning);
      setColorSeason(reasoning.assignedSeason);
      if (profile) {
        setProfile({
          ...profile,
          colorSeason: reasoning.assignedSeason,
          skinUndertone: reasoning.skinUndertone,
        });
      }
    } catch (e) {
      console.error("Color analysis failed", e);
    } finally {
      setIsAnalyzingColor(false);
    }
  };

  const handleToggleAllergy = (allergyId: string) => {
    if (allergies.includes(allergyId)) {
      setAllergies(allergies.filter((a) => a !== allergyId));
    } else {
      setAllergies([...allergies, allergyId]);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await api.updateMannequinProfile({
        userId: user?.id || "usr_94b3a8c1",
        allergies,
        preferredFit,
        colorSeason,
        comfortVsStyleBias: comfortBias,
      });
      if (res.colorReasoning) {
        setColorReasoning(res.colorReasoning);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to save profile", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelfieFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const selfieB64 = String(reader.result);
      setIsAnalyzingSelfie(true);
      setSelfieError(null);
      try {
        const res = await api.analyzeSelfie(user?.id || "usr_94b3a8c1", selfieB64, allergies, preferredFit);
        if (res.data) {
          setColorSeason(res.data.colorSeason);
          if (res.colorReasoning) {
            setColorReasoning(res.colorReasoning);
          }
          const refreshed = await api.getMannequinProfile(user?.id || "usr_94b3a8c1");
          setProfile(refreshed);
        }
      } catch (e: any) {
        console.error("Selfie scan failed", e);
        setSelfieError(e?.message || "Selfie analysis failed. Please try again.");
      } finally {
        setIsAnalyzingSelfie(false);
        if (selfieInputRef.current) {
          selfieInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => setSelfieError("Could not read the uploaded photo.");
    reader.readAsDataURL(file);
  };

  const isAdmin = user?.role === "admin";
  const [adminSelectedVendor, setAdminSelectedVendor] = useState<string>(user?.vendorId || "vendor_venice");

  if (isAdmin) {
    const isVenice = adminSelectedVendor === "vendor_venice";

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Top Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/30 via-slate-900/40 to-primary/20 p-6 rounded-3xl border border-indigo-500/20 shadow-md">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500 text-white tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>B2B Fleet Biometric Telemetry</span>
              </span>

              {/* Vendor Switcher */}
              <div className="flex items-center space-x-1 bg-secondary/80 p-1 rounded-xl border border-border text-[11px]">
                <span className="text-muted-foreground px-2 font-bold uppercase text-[9px]">Cohort:</span>
                <button
                  onClick={() => setAdminSelectedVendor("vendor_venice")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    adminSelectedVendor === "vendor_venice"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Venice Luxury Atelier
                </button>
                <button
                  onClick={() => setAdminSelectedVendor("vendor_nordic")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    adminSelectedVendor === "vendor_nordic"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Nordic Organic Weaves
                </button>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {isVenice ? "Venice Luxury Group" : "Nordic Weaves Collective"} — Demographic Biometric Screening
            </h1>
            <p className="text-xs text-muted-foreground max-w-3xl">
              Aggregated sensory biometrics, erythema flare incidence, and tactile friction tolerances across {isVenice ? "1,420" : "1,180"} verified customer profiles. Individual personal biometric identifiers are anonymized.
            </p>
          </div>
        </div>

        {/* Significance Callout for B2B Retail */}
        <div className="p-5 rounded-3xl bg-secondary/40 border border-border/80 space-y-3">
          <div className="flex items-center space-x-2 text-primary font-bold text-xs">
            <Info className="w-4 h-4" />
            <span className="uppercase tracking-wider">Significance of Biometric Sensing in B2B Fashion Retail</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="p-4 rounded-2xl bg-card border border-border space-y-1.5">
              <span className="font-extrabold text-foreground block text-xs">1. Pre-empting Contact Returns</span>
              <p className="text-[11px] leading-relaxed">
                25%+ of online returns stem from fabric prickle, seam friction, or heat trapping. Automated biometric screening identifies material incompatibility before fulfillment.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border space-y-1.5">
              <span className="font-extrabold text-foreground block text-xs">2. Sourcing Friction Guardrails</span>
              <p className="text-[11px] leading-relaxed">
                Flags material blends with rough surface friction vectors (&gt;0.45 Index) for customer cohorts with elevated dermatological sensitivities (rosacea / eczema).
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border space-y-1.5">
              <span className="font-extrabold text-foreground block text-xs">3. Targeted Inventory Allocation</span>
              <p className="text-[11px] leading-relaxed">
                Aligns hypoallergenic materials (Mulberry Silk, French Linen, Organic Cotton) with demographic cohorts possessing matching biophysical traits.
              </p>
            </div>
          </div>
        </div>

        {/* Aggregated Cohort Biometric Distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cohort Sensitivities & Allergens (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HeartPulse className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Demographic Biometric Sensitivity Incidence
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Fleet Aggregation
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Rosacea / Erythema Risk</span>
                  <div className="text-xl font-black text-foreground">{isVenice ? "38.5%" : "18.2%"}</div>
                  <p className="text-[10px] text-muted-foreground">Demographic flare incidence</p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Wool Prickle Sensitivity</span>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400">{isVenice ? "12.0%" : "34.5%"}</div>
                  <p className="text-[10px] text-muted-foreground">Coarse animal fiber allergy</p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Rough Synthetic Friction</span>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400">{isVenice ? "22.4%" : "44.0%"}</div>
                  <p className="text-[10px] text-muted-foreground">Polyester/acrylic intolerance</p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">High Breathability Need</span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{isVenice ? "74.0%" : "92.0%"}</div>
                  <p className="text-[10px] text-muted-foreground">Optimum airflow requirement</p>
                </div>
              </div>

              {/* Material Allocation Safeguards */}
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-2 text-xs">
                <span className="font-bold text-foreground block text-[11px] text-primary uppercase">
                  Automated Sourcing Safeguards:
                </span>
                <ul className="space-y-1.5 text-muted-foreground text-[11px]">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span><strong>Approved Materials:</strong> {isVenice ? "Mulberry Silk (100%), Viscose Crepe, Fine Cashmere" : "French Linen, Unbleached Organic Cotton, Hemp"}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span><strong>Restricted / Quarantined:</strong> {isVenice ? "Rough Synthetics (>0.5 Friction), Metallic Lurex" : "Coarse Merino Wool (>24 Micron), Non-Breathable Polyester"}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Color Season & Underton Demographic Mix (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Demographic Seasonal Palette Distribution
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  CIELab Spectrometry
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-foreground">{isVenice ? "Cool Winter (Dominant 82%)" : "Warm Autumn (Dominant 76%)"}</span>
                    <span className="text-primary">{isVenice ? "82% Cohort" : "76% Cohort"}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      style={{ width: isVenice ? "82%" : "76%" }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Primary Harmonious Tones: {isVenice ? "Midnight Navy (#1C2D42), Emerald (#0D5C3A), Crimson (#8B0000)" : "Seafoam Sage (#4A7C72), Sandstone (#C8B29B), Warm Ochre (#B87333)"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-foreground">{isVenice ? "Cool Summer (Secondary 14%)" : "Warm Spring (Secondary 18%)"}</span>
                    <span className="text-primary">{isVenice ? "14% Cohort" : "18% Cohort"}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      style={{ width: isVenice ? "14%" : "18%" }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-foreground">Chromatic Clash Warning Incidence</span>
                    <span className="text-rose-600 dark:text-rose-400">{isVenice ? "4% Mis-matches" : "6% Mis-matches"}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Garments with ΔE &gt; 4.5 are automatically suppressed in recommendations to prevent color dissatisfaction returns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-violet-500/10 p-5 rounded-3xl border border-primary/20">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary text-primary-foreground tracking-wider">
              My Personal Fit Profile
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Digital Mannequin & Skin Sensitivities
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Calibrated biometrics, automated color season determination, and personalized fabric friction tolerances.
          </p>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 hover:shadow-lg transition-all flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50 self-start sm:self-auto"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Profile Calibrated!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save Profile Settings"}</span>
            </>
          )}
        </button>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Digital Mannequin Photo & Automated Color Season (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Mannequin / Selfie Scan Card */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Captured Photo & Biometric Mesh
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                YouCam Vision Connected
              </span>
            </div>

            <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-muted flex items-center justify-center border border-border group">
              <img
                src={
                  profile?.basePhotoUrl ||
                  import.meta.env.NEXT_PUBLIC_DEFAULT_MANNEQUIN_PHOTO_URL ||
                  ""
                }
                alt="Digital Mannequin"
                className="w-full h-full object-cover"
              />

              {/* Scanning Overlay */}
              {isAnalyzingSelfie && (
                <div className="absolute inset-0 bg-primary/30 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 text-white animate-in fade-in">
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold tracking-wider uppercase">
                    Extracting CIELab Coordinates & Erythema...
                  </span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                <div>
                  <p className="font-bold">{user?.name || "Alex Morgan"}</p>
                  <p className="text-[10px] text-white/80">Body Type: {profile?.bodyType || "Balanced Athletic"}</p>
                </div>
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelfieFileChange}
                />
                <button
                  onClick={() => selfieInputRef.current?.click()}
                  disabled={isAnalyzingSelfie}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center space-x-1.5 transition-all"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isAnalyzingSelfie ? "Scanning..." : "Scan New Photo"}</span>
                </button>
              </div>
            </div>

            {/* Selfie Scan Error */}
            {selfieError && (
              <div className="flex items-center space-x-2 p-3 rounded-2xl bg-red-600/10 border border-red-500/30 text-xs text-red-700 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Selfie analysis unavailable: {selfieError}</span>
              </div>
            )}

            {/* Biometric Skin Concerns */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground uppercase text-[10px] tracking-wider">
                  Biometric Skin Telemetry
                </span>
                <span className="text-primary text-[10px]">Auto-Audited</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/80 text-center space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Rosacea</span>
                  <p className="text-sm font-extrabold text-foreground">
                    {profile?.detectedConcerns?.rosacea || 38.5}%
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/80 text-center space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Sensitivity</span>
                  <p className="text-sm font-extrabold text-foreground">
                    {profile?.detectedConcerns?.sensitivity || 62.0}%
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/80 text-center space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Undertone</span>
                  <p className="text-sm font-extrabold text-foreground">{profile?.skinUndertone || "Cool"}</p>
                </div>
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/80 text-center space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Tone Hex</span>
                  <div className="flex items-center justify-center space-x-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-black/20"
                      style={{ backgroundColor: profile?.skinToneHex || "#E8C39E" }}
                    />
                    <span className="text-xs font-mono font-bold text-foreground">
                      {profile?.skinToneHex || "#E8C39E"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Automated Color Season Reasoner Card */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Automated Color Season Assignment
                </h2>
              </div>
              <button
                onClick={handleRunAutomatedColorScan}
                disabled={isAnalyzingColor}
                className="px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingColor ? "animate-spin" : ""}`} />
                <span>{isAnalyzingColor ? "Calibrating..." : "Auto-Calibrate"}</span>
              </button>
            </div>

            {/* Active Season Banner */}
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                  Assigned Profile
                </span>
                <h3 className="text-base font-extrabold text-foreground">{colorSeason}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {colorReasoning?.clinicalSummary ||
                    "High-contrast cool undertone requiring deep jewel tones and crisp saturations."}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
                  {colorReasoning ? `${(colorReasoning.confidenceScore * 100).toFixed(1)}% Confidence` : "94.8% AI Match"}
                </span>
              </div>
            </div>

            {/* AI Reasoning Trace */}
            {colorReasoning && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-foreground">
                  <Bot className="w-4 h-4 text-primary" />
                  <span>Clinical AI Reasoning Trace:</span>
                </div>

                {/* Input Explainability */}
                {colorReasoning.inputParameters && (
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 text-xs space-y-2">
                    <span className="font-bold text-foreground">Inputs Fed Into Analysis</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="col-span-2 flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Skin</span>
                        <span className="font-mono text-[11px] bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
                          {colorReasoning.inputParameters.skinToneHex}
                        </span>
                        {colorReasoning.inputParameters.cielab && (
                          <span className="font-mono text-[10px] text-foreground/70">
                            L* {colorReasoning.inputParameters.cielab.L.toFixed(1)} · a* {colorReasoning.inputParameters.cielab.a.toFixed(1)} · b* {colorReasoning.inputParameters.cielab.b.toFixed(1)}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-foreground/70">
                          {colorReasoning.inputParameters.skinUndertone} · contrast{" "}
                          {colorReasoning.inputParameters.contrastRatio?.toFixed(1)}:1
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Skin Biometrics</p>
                        <p className="text-[11px] text-foreground/80">
                          Rosacea <span className="font-mono">{colorReasoning.inputParameters.rosaceaIndex?.toFixed(0)}/100</span> · Sensitivity{" "}
                          <span className="font-mono">{colorReasoning.inputParameters.sensitivityIndex?.toFixed(0)}/100</span>
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Preferences</p>
                        <p className="text-[11px] text-foreground/80">
                          Fit <span className="font-mono">{colorReasoning.inputParameters.preferredFit}</span> (×
                          {colorReasoning.inputParameters.fitContrastModifier?.toFixed(2)} tonal) · Comfort bias{" "}
                          <span className="font-mono">{colorReasoning.inputParameters.comfortVsStyleBias?.toFixed(2)}</span>
                        </p>
                      </div>
                      <div className="col-span-2 space-y-0.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Allergen Guard</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(colorReasoning.inputParameters.allergies || []).length > 0 ? (
                            colorReasoning.inputParameters.allergies?.map((a) => (
                              <span key={a} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                                {a}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-foreground/60">None</span>
                          )}
                          <span className="text-[10px] font-mono text-foreground/60">
                            → chroma ×{colorReasoning.inputParameters.allergyChromaTolerance?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {(colorReasoning?.reasoningSteps || []).map((step: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-secondary/30 border border-border/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{step.stage}</span>
                        <span className="text-[10px] font-mono text-primary font-semibold">{step.verdict}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{step.finding}</p>
                      <p className="text-[10px] font-mono text-foreground/80 bg-muted/50 p-1.5 rounded-lg border border-border/50">
                        {step.metric}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Harmonious vs Clash Swatches */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Harmonious Palette</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(colorReasoning?.recommendedPalette || ["#000080", "#1C1C1C", "#4682B4", "#800020"]).map(
                    (hex, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-xl shadow-xs border border-border"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    )
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Clash Palette (Penalty)</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(colorReasoning?.clashPalette || ["#D4AF37", "#FF7F50", "#E6C280", "#8B5A2B"]).map((hex, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-xl shadow-xs border border-border"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Allergies & Fit Preferences (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Allergies Card */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5" id="allergies">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Fabric & Allergen Exclusions
                </h2>
              </div>
              <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10">
                0.40x Hard Penalty
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Garments containing flagged allergens automatically trigger clinical alerts and apply a 0.40x multiplier to the Keep-Probability Score.
            </p>

            <div className="space-y-2.5">
              {ALLERGY_OPTIONS.map((opt) => {
                const checked = allergies.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleToggleAllergy(opt.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                      checked
                        ? "border-rose-500/50 bg-rose-500/10 text-foreground shadow-xs"
                        : "border-border bg-card hover:bg-secondary/40"
                    }`}
                  >
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                        checked ? "bg-rose-500 text-white" : "border border-muted-foreground/40"
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fit Silhouette Preference */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div className="flex items-center space-x-2">
              <HeartPulse className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Silhouette & Comfort Biases
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">
                  Preferred Fit Baseline
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["relaxed", "regular", "tailored_slim"].map((fit) => (
                    <button
                      key={fit}
                      onClick={() => setPreferredFit(fit)}
                      className={`p-3 rounded-2xl border text-xs font-bold capitalize transition-all ${
                        preferredFit === fit
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {fit.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Comfort First</span>
                  <span className="text-primary font-bold">
                    {comfortBias < 0.4 ? "High Comfort Bias" : comfortBias > 0.6 ? "High Style Bias" : "Balanced"}
                  </span>
                  <span className="text-muted-foreground">Style / Tailoring</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={comfortBias}
                  onChange={(e) => setComfortBias(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
