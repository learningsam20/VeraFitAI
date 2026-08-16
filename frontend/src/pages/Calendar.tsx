
import React, { useState, useEffect } from "react";
import { useCalendarStore, DaySchedule, EventSlot } from "@/stores/calendarStore";
import { useTryOnStore } from "@/stores/tryOnStore";
import { useMoodStore } from "@/stores/moodStore";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate } from "react-router-dom";
import { Garment, MannequinProfile } from "@/lib/api";
import { deriveMakeupHarmony } from "@/lib/makeupHarmony";
import {
  Calendar as CalendarIcon,
  Sun,
  CloudRain,
  Wind,
  Sparkles,
  HeartPulse,
  Flame,
  ArrowRight,
  Clock,
  Edit3,
  Check,
  Zap,
  ShoppingBag,
  Palette,
  Layers,
  ChevronRight,
  Shirt,
} from "lucide-react";

export default function CalendarPage() {
  const navigate = useNavigate();
  const {
    schedule,
    selectedDayId,
    setSelectedDayId,
    setSelectedSlotForDay,
    getSelectedDay,
    getSelectedSlot,
    updateSlotAgenda,
  } = useCalendarStore();

  const { setSelectedGarment, runAnalysis } = useTryOnStore();
  const { setMoodModifier } = useMoodStore();
  const { user } = useAuthStore();

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);
  const [mannequinProfile, setMannequinProfile] = useState<MannequinProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { api } = await import("@/lib/api");
        const profile = await api.getMannequinProfile(user?.id || "usr_94b3a8c1");
        if (!cancelled) setMannequinProfile(profile);
      } catch (err) {
        console.error("Failed to load mannequin profile for makeup harmony", err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const currentDay = getSelectedDay();
  const currentSlot = getSelectedSlot();

  const makeupHarmony = deriveMakeupHarmony(mannequinProfile, currentSlot);

  const [isEditing, setIsEditing] = useState(false);
  const [editAgenda, setEditAgenda] = useState(currentSlot.agenda);
  const [editType, setEditType] = useState<EventSlot["agendaType"]>(currentSlot.agendaType);

  const handleDaySelect = (dayId: string) => {
    setSelectedDayId(dayId);
    setIsEditing(false);
  };

  const handleSlotSelect = (slotId: "morning" | "afternoon" | "evening") => {
    setSelectedSlotForDay(currentDay.id, slotId);
    setIsEditing(false);
  };

  const handleBuyOutfit = async () => {
    setIsPurchasing(true);
    try {
      const { api } = await import("@/lib/api");
      const res = await api.purchaseItem({
        userId: user?.id || "usr_94b3a8c1",
        garmentSku: currentSlot.recommendedSku,
        garmentName: currentSlot.recommendedGarmentName,
        price: 89.0,
        notes: `Calendar Proactive Outfit Purchase for ${currentDay.dayName} ${currentSlot.title} (${currentSlot.agenda})`,
      });
      setPurchaseToast(`🎉 ${res.orderId} Added to wardrobe: ${currentSlot.recommendedGarmentName} — no payment required!`);
      setTimeout(() => setPurchaseToast(null), 6000);
    } catch (err) {
      console.error("Calendar purchase failed", err);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleStartEdit = () => {
    setEditAgenda(currentSlot.agenda);
    setEditType(currentSlot.agendaType);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateSlotAgenda(currentDay.id, currentDay.selectedSlotId, editAgenda, editType);
    setIsEditing(false);
  };

  const handleTryOnOutfit = async () => {
    // 1. Set global mood modifier
    setMoodModifier(currentSlot.computedMood);

    // 2. Resolve the REAL catalog garment by SKU so the try-on room renders
    //    the actual garment (color, materials, price) instead of a proxy.
    const store = useTryOnStore.getState();
    if (!store.garments.some((g) => g.sku === currentSlot.recommendedSku)) {
    if (store.garments.length === 0) {
      await store.fetchGarments(user?.id || "usr_94b3a8c1");
    }
    }
    const catalogMatch = useTryOnStore
      .getState()
      .garments.find((g) => g.sku === currentSlot.recommendedSku);

    const resolvedGarment: Garment = catalogMatch ?? {
      sku: currentSlot.recommendedSku,
      name: currentSlot.recommendedGarmentName,
      category: "tops",
      colorHex: currentSlot.computedMood > 0.3 ? "#800020" : "#2C3E50",
      materials: { silk: 90, elastane: 10 },
      price: 185.0,
      imageUrl: currentSlot.recommendedGarmentImg,
      formalityIndex: 0.8,
    };
    setSelectedGarment(resolvedGarment);

    // 3. Trigger immediate analysis with the day's mood
    await runAnalysis(user?.id || "usr_94b3a8c1", currentSlot.computedMood);

    // 4. Navigate directly to fitting room
    navigate("/");
  };

  const getAgendaTypeBadge = (type: EventSlot["agendaType"]) => {
    switch (type) {
      case "formal":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30";
      case "gala":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30";
      case "wfh":
        return "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30";
      case "social":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30";
      default:
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {purchaseToast && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>{purchaseToast}</span>
          </div>
          <span className="text-[10px] uppercase font-extrabold bg-black/20 px-3 py-1 rounded-full">
            Saved to DB
          </span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-violet-500/10 p-5 rounded-3xl border border-primary/20">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary text-primary-foreground tracking-wider">
              Proactive Style Horizon
            </span>
            <span className="text-xs font-semibold text-primary">Multi-Event Schedule</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            7-Day Style & Mood Planner
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Morning-to-evening event scheduling compounding weather shifts, agenda formality, and sleep readiness into proactive apparel & makeup pairing.
          </p>
        </div>

        <button
          onClick={handleTryOnOutfit}
          className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 hover:shadow-lg transition-all flex items-center justify-center space-x-2 shrink-0 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Try On for {currentDay.dayName} {currentSlot.id.toUpperCase()}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 7-Day Horizontal Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {schedule.map((day) => {
          const isSelected = day.id === selectedDayId;
          const activeSlot = day.slots[day.selectedSlotId] || day.slots.morning;
          return (
            <button
              key={day.id}
              onClick={() => handleDaySelect(day.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
                isSelected
                  ? "bg-card border-primary ring-2 ring-primary/30 shadow-md scale-[1.02]"
                  : "bg-card/70 border-border hover:bg-secondary/60 hover:border-border/80"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground">{day.shortDay}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{day.dateStr}</span>
                </div>
                <div className="text-[11px] font-bold text-primary mt-1 line-clamp-1">
                  {activeSlot.agenda}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 mt-2">
                <span className="font-semibold">{activeSlot.weatherTemp}</span>
                <span className="font-bold text-foreground">{activeSlot.keepCertainty}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Day Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Day Timeline & Multi-Event Switcher (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Day Timeline Header Card */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black text-foreground">{currentDay.dayName}, {currentDay.dateStr}</h2>
                  <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${getAgendaTypeBadge(currentSlot.agendaType)}`}>
                    {currentSlot.agendaType}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a time of day to tune your apparel, makeup, and mood context:
                </p>
              </div>

              {/* Time-of-Day Segment Switcher */}
              <div className="flex bg-secondary/80 p-1 rounded-2xl border border-border text-xs font-bold shrink-0 self-start sm:self-auto">
                {(["morning", "afternoon", "evening"] as const).map((slotKey) => (
                  <button
                    key={slotKey}
                    onClick={() => handleSlotSelect(slotKey)}
                    className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                      currentDay.selectedSlotId === slotKey
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {slotKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Time Slot Detail & Editor */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{currentSlot.title}</span>
                </span>
                {!isEditing && (
                  <button
                    onClick={handleStartEdit}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Agenda</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3 pt-1">
                  <input
                    type="text"
                    value={editAgenda}
                    onChange={(e) => setEditAgenda(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                    placeholder="Enter scheduled agenda..."
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-1.5 text-[10px]">
                      {(["formal", "casual", "social", "wfh", "gala"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEditType(t)}
                          className={`px-2.5 py-1 rounded-lg border font-bold capitalize ${
                            editType === t
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-bold text-foreground">{currentSlot.agenda}</p>
              )}
            </div>

            {/* Context Metrics: Weather, Biometrics & Computed Mood */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border/80 space-y-1 text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Forecast</span>
                <p className="text-sm font-black text-foreground">{currentSlot.weatherTemp}</p>
                <span className="text-[10px] text-muted-foreground block leading-tight">{currentSlot.weatherCondition}</span>
              </div>

              <div className="p-3 rounded-2xl bg-secondary/40 border border-border/80 space-y-1 text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Circadian Rest</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {currentSlot.biometricReadiness}%
                </p>
                <span className="text-[10px] text-muted-foreground block leading-tight">Biometric Recovery</span>
              </div>

              <div className="p-3 rounded-2xl bg-secondary/40 border border-border/80 space-y-1 text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Target Mood</span>
                <p className="text-sm font-black text-primary">
                  {currentSlot.computedMood > 0.3 ? "Sharp Tailored" : currentSlot.computedMood < -0.3 ? "Cozy Cocoon" : "Balanced Smart"}
                </p>
                <span className="text-[10px] font-mono text-muted-foreground block leading-tight">
                  Index: {currentSlot.computedMood > 0 ? `+${currentSlot.computedMood.toFixed(2)}` : currentSlot.computedMood.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Makeup & Hue Palette Suggestions for this Slot */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
                      Recommended Makeup & Hue Harmony
                    </span>
                    <p className="text-xs font-bold text-foreground">
                      {currentSlot.makeupPaletteSuggestion}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-500/15 shrink-0">
                  {makeupHarmony.intensity}
                </span>
              </div>

              {/* AI Reasoning */}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Why: </span>
                {makeupHarmony.reasoning}
              </p>

              {/* Swatches */}
              <div className="flex flex-wrap gap-2 pt-1">
                {makeupHarmony.swatches.map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1">
                    <div
                      className="w-7 h-7 rounded-full border-2 border-white/40 dark:border-white/20 shadow-sm"
                      style={{ backgroundColor: s.hex }}
                      title={s.hex}
                    />
                    <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-300 text-center leading-tight w-14">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Suggested Products */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {makeupHarmony.products.map((p) => (
                  <div key={p.name} className="flex items-center space-x-2.5 p-2 rounded-xl bg-card border border-border/70">
                    <div
                      className="w-5 h-5 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: p.hex }}
                      title={p.hex}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-foreground leading-tight">{p.name}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight truncate">{p.shade} — {p.note}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Avoid List */}
              {makeupHarmony.avoidList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {makeupHarmony.avoidList.map((a) => (
                    <span key={a} className="text-[9px] font-bold text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                      ✕ {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Proactive Outfit & Owned Wardrobe Complement (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shirt className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Proactive Outfit Match
                </h2>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {currentSlot.keepCertainty}% Certainty
              </span>
            </div>

            {/* Proposed New Garment Card */}
            <div className="relative rounded-2xl overflow-hidden bg-muted border border-border flex items-center space-x-4 p-3 bg-secondary/30">
              <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-background shrink-0 border border-border">
                <img
                  src={currentSlot.recommendedGarmentImg}
                  alt={currentSlot.recommendedGarmentName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1 flex-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  Proposed • {currentSlot.recommendedSku}
                </span>
                <h3 className="text-xs font-extrabold text-foreground leading-snug">
                  {currentSlot.recommendedGarmentName}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
                  {currentSlot.recommendedReason}
                </p>
              </div>
            </div>

            {/* Wardrobe Complement: Pair with your Owned Clothes */}
            {currentSlot.pairedOwnedItem && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <div className="flex items-center space-x-1.5 text-primary">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Pair with Your Owned Wardrobe:</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">In Your Closet</span>
                </div>

                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/80 flex items-center space-x-3">
                  <div className="w-12 h-14 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                    <img
                      src={currentSlot.pairedOwnedItem.imageUrl}
                      alt={currentSlot.pairedOwnedItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-foreground leading-snug">
                      {currentSlot.pairedOwnedItem.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {currentSlot.pairedOwnedItem.pairingNote}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Launch CTAs: Try On & Buy Outfit */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleBuyOutfit}
                disabled={isPurchasing}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {isPurchasing ? "Adding to Wardrobe..." : "Add Outfit to Wardrobe — No Payment"}
                </span>
              </button>

              <button
                onClick={handleTryOnOutfit}
                className="w-full py-2.5 rounded-2xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Load Look in Fitting Room</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
