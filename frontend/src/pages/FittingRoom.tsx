import React, { useState, useEffect } from "react";
import { useTryOnStore } from "@/stores/tryOnStore";
import { useMoodStore } from "@/stores/moodStore";
import { KeepScoreRadial } from "@/components/tryon/KeepScoreRadial";
import { ScoreBreakdown } from "@/components/tryon/ScoreBreakdown";
import { VtoPreviewSlider } from "@/components/tryon/VtoPreviewSlider";
import { GarmentSelector } from "@/components/tryon/GarmentSelector";
import { Sparkles, Activity, ShieldCheck, ArrowRight, Bot, Zap, Building2, ShoppingBag, CheckCircle2, Heart, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { PostMortemModal } from "@/components/feedback/PostMortemModal";

export default function TryOnStudioPage() {
  const {
    fetchGarments,
    fetchCompatibility,
    selectedGarment,
    activeResult,
    runAnalysis,
    isLoading,
    analysisError,
    setDiagnosticsOpen,
  } = useTryOnStore();
  const { moodModifier, getMoodLabel } = useMoodStore();
  const { user } = useAuthStore();

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const userId = user?.id || "usr_94b3a8c1";
    fetchGarments(userId);
    fetchCompatibility(userId);
  }, [fetchGarments, fetchCompatibility, user?.id]);

  const handleBuyItem = async () => {
    if (!selectedGarment) return;
    setIsPurchasing(true);
    setPurchaseError(null);
    try {
      const res = await api.purchaseItem({
        userId: user?.id || "usr_94b3a8c1",
        garmentSku: selectedGarment.sku,
        sessionId: activeResult?.sessionId,
        garmentName: selectedGarment.name,
        price: selectedGarment.price || 89.0,
        notes: `Customer added to wardrobe (${activeResult?.keepProbabilityScore?.toFixed(1) ?? 95}% Match)`
      });
      setPurchaseSuccess(`🎉 ${res.orderId} Added to your wardrobe — no payment required. Returnable anytime.`);
      setTimeout(() => setPurchaseSuccess(null), 6000);
    } catch (err: any) {
      console.error("Purchase failed", err);
      setPurchaseError(err?.message || "Could not add to wardrobe. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {purchaseSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{purchaseSuccess}</span>
          </div>
          <Link
            to="/history"
            className="text-[10px] uppercase font-extrabold bg-black/20 hover:bg-black/40 px-3 py-1 rounded-full transition-colors"
          >
            View Orders →
          </Link>
        </div>
      )}

      {/* Admin Mode Switcher Banner */}
      {isAdmin && (
        <div className="p-4 rounded-3xl bg-indigo-500/15 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-foreground block">
                B2B Merchant Portal Active ({user?.name})
              </span>
              <p className="text-muted-foreground text-[11px]">
                You are currently viewing the shopper try-on sandbox. Access supplier diagnostics, AI gap analysis, hourly session analytics, and stocking advice in the Operations Hub.
              </p>
            </div>
          </div>
          <Link
            to="/admin"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all flex items-center space-x-1.5 shrink-0 self-start sm:self-auto shadow-xs"
          >
            <span>Open Operations Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Top Banner / Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-violet-500/10 p-5 rounded-3xl border border-primary/20">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary text-primary-foreground tracking-wider">
              {isAdmin ? "Garment Physics Simulator" : "My Fitting Room"}
            </span>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              LangGraph Multi-Agent Scoring
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
            {selectedGarment ? selectedGarment.name : "Virtual Try-On & Keep Probability"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Evaluating pixel-level SSIM fit repeatability, CIELab chromatic harmony, and fabric-to-skin safety.
          </p>
        </div>

        {/* Current Mood Pill & Re-evaluate Button */}
        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-1.5 rounded-2xl bg-card border border-border shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Shopping Mood
            </span>
            <span className="text-xs font-bold text-primary">{getMoodLabel()}</span>
          </div>
          <button
            onClick={() => runAnalysis(user?.id || "usr_94b3a8c1", moodModifier)}
            disabled={isLoading || !selectedGarment}
            className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? "Analyzing..." : "Re-Evaluate"}</span>
          </button>
        </div>
      </div>

      {/* Garment Selector Carousel */}
      <GarmentSelector />

      {/* Analysis Error Banner */}
      {analysisError && (
        <div className="p-4 rounded-2xl bg-red-600/10 border border-red-500/30 text-xs text-red-700 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2 font-semibold">
            <Activity className="w-4 h-4 shrink-0" />
            <span>Analysis unavailable: {analysisError}</span>
          </div>
          <button
            onClick={() => runAnalysis(user?.id || "usr_94b3a8c1", moodModifier)}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Grid: Visuals on Left (7 cols), Certainty Scores on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Drape Slider & Heatmap (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <VtoPreviewSlider
            renders={activeResult?.renderedVtoImages || []}
            heatmapUrl={activeResult?.ssimHeatmapUrl}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column: Keep Probability Radial & Factor Breakdown (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {activeResult && (
            <>
              <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-4">
                <KeepScoreRadial
                  score={activeResult.keepProbabilityScore}
                  verdict={activeResult.verdict}
                />

                {/* Direct Add-to-Wardrobe & Return Actions (no payment) */}
                {!isAdmin && (
                  <div className="pt-3 border-t border-border flex flex-col gap-2">
                    <button
                      onClick={handleBuyItem}
                      disabled={isPurchasing}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        {isPurchasing
                          ? "Adding to Wardrobe..."
                          : "Add to Wardrobe — No Payment"}
                      </span>
                    </button>

                    <button
                      onClick={() => setShowReturnModal(true)}
                      disabled={isPurchasing}
                      className="w-full py-2.5 px-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Return Item & Log Reason</span>
                    </button>

                    {purchaseError && (
                      <p className="text-[10px] text-center text-rose-500 font-semibold">
                        {purchaseError}
                      </p>
                    )}
                    {!purchaseError && (
                      <p className="text-[10px] text-center text-muted-foreground">
                        Added to your closet instantly — no payment required. You can return it anytime and the reason feeds return analytics.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <ScoreBreakdown
                scores={activeResult.scores}
                diagnostics={activeResult.diagnostics}
              />
            </>
          )}
        </div>
      </div>

      {/* Return Reason Modal (captures reason for fleet return analytics) */}
      {activeResult && (
        <PostMortemModal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          sessionId={activeResult.sessionId}
          garmentName={selectedGarment?.name || "Item"}
          userId={user?.id || "usr_94b3a8c1"}
          title="Return Item — Log Reason"
          initialAction="RETURNED"
          onFeedbackSaved={() => setPurchaseSuccess("Return logged. Reason captured for fleet analytics.")}
        />
      )}
    </div>
  );
}
