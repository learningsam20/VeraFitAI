
import React, { useState, useEffect } from "react";
import { api, HistoryItem, MerchantAnalytics } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { PostMortemModal } from "@/components/feedback/PostMortemModal";
import { AiGeneratedBadge } from "@/components/ui/AiGeneratedBadge";
import {
  History,
  Sparkles,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
  MessageSquarePlus,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Layers,
  ShoppingBag,
  Heart,
} from "lucide-react";

export default function HistoryPage() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [analytics, setAnalytics] = useState<MerchantAnalytics | null>(null);
  const [selectedSession, setSelectedSession] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "merchant">(
    user?.role === "admin" ? "merchant" : "personal"
  );

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setActiveTab(user?.role === "admin" ? "merchant" : "personal");
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (user?.role === "admin") {
        const [historyItems, analyticsData] = await Promise.all([
          api.getHistory(""), // all sessions for admin
          api.getMerchantAnalytics(),
        ]);
        setHistory(historyItems);
        setAnalytics(analyticsData);
      } else {
        const items = await api.getHistory(user?.id || "usr_94b3a8c1");
        setHistory(items);
      }
    } catch (e) {
      console.error("Failed to load history data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    if (isAdmin) {
      switch (verdict) {
        case "STRONG_BUY":
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Strong Buy (80%+)
            </span>
          );
        case "CONSIDER_CAUTION":
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Consider Caution
            </span>
          );
        default:
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              High Return Risk
            </span>
          );
      }
    } else {
      switch (verdict) {
        case "STRONG_BUY":
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Great Match For You</span>
            </span>
          );
        case "CONSIDER_CAUTION":
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1">
              <span>Good Everyday Fit</span>
            </span>
          );
        default:
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>Sensitive Fit Notice</span>
            </span>
          );
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-violet-500/10 p-5 rounded-3xl border border-primary/20">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary text-primary-foreground tracking-wider">
              {isAdmin ? "B2B Fleet Operations" : "My Style Journal"}
            </span>
            <span className="text-xs font-semibold text-primary">{user?.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            {isAdmin ? "Merchant Return Fleet Analytics" : "My Orders & Past Try-Ons"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isAdmin
              ? "Fleet-wide return rate reduction, reason distribution matrices, and high-risk SKU physics."
              : "Review your style match ratings, keep or return actions, and personalized outfit harmony."}
          </p>
        </div>

        {/* View Switcher if Admin */}
        {isAdmin && (
          <div className="flex bg-secondary/80 p-1 rounded-2xl border border-border text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab("merchant")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
                activeTab === "merchant"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <span>Fleet Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab("personal")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
                activeTab === "personal"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Session Log</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin KPI Overview Cards */}
      {isAdmin && activeTab === "merchant" && analytics && (
        <div className="space-y-6">
          {/* Top KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                <span>Fleet Keep Rate</span>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {analytics.fleetAverageKeepProbability}%
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                +14.8% vs industry benchmark
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                <span>Return Rate Reduction</span>
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                -{analytics.estimatedReturnRateReductionPct}%
              </div>
              <p className="text-[11px] text-muted-foreground">Estimated returns prevented</p>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                <span>Prevented Return Costs</span>
                <DollarSign className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-foreground">
                ${analytics.savedReturnCostDollars.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground">Restocking & freight savings</p>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                <span>AI Confidence Reliability</span>
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-primary">
                {analytics.agentReliabilityIndex}%
              </div>
              <p className="text-[11px] text-muted-foreground">SSIM + Delta E model score</p>
            </div>
          </div>

          {/* 2-Column: Return Reason Distribution & High-Risk SKU Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Return Reason Distribution (6 cols) */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Return Reason Distribution
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground font-semibold">Post-Mortem Logs</span>
              </div>

              <div className="space-y-3">
                {analytics.returnReasonBreakdown.map((r, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-secondary/30 border border-border/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{r.description}</span>
                      <span className="font-extrabold text-primary font-mono">{r.percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-indigo-600 rounded-full"
                        style={{ width: `${r.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Reason Code: {r.reason}</span>
                      <span>{r.count} reported logs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: High-Risk SKU Physics Matrix (6 cols) */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    SKU Return Risk Matrix
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground font-semibold">Catalog Telemetry</span>
              </div>

              <div className="space-y-3">
                {analytics.highRiskSkus.map((sku, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-secondary/30 border border-border/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-foreground">{sku.name}</span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                            sku.returnRiskLevel === "HIGH"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              : sku.returnRiskLevel === "MODERATE"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {sku.returnRiskLevel} RISK
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">{sku.sku}</p>
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                        Primary Driver: {sku.primaryReturnDriver}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-foreground">{sku.keepRate}%</div>
                      <span className="text-[10px] text-muted-foreground">{sku.totalTryOns} Try-Ons</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Log List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center space-x-2">
            <History className="w-4 h-4 text-primary" />
            <span>
              {isAdmin
                ? "Fleet Try-On Telemetry Feed"
                : "My Try-On History & Orders"}
            </span>
          </h2>
          <span className="text-xs text-muted-foreground">{history.length} total sessions</span>
        </div>

        {isLoading ? (
          <div className="p-12 rounded-3xl bg-card border border-border flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Loading records...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
            <History className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-bold text-foreground">No Try-On Sessions Recorded</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Start by trying on garments in the Live Studio to build your personal style journal.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 hover:border-border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                {/* Left: Garment info + VTO preview snippet */}
                <div className="flex items-center space-x-4">
                  <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                    <img
                      src={
                        item.renderedVtoUrl ||
                        import.meta.env.NEXT_PUBLIC_DEFAULT_GARMENT_IMAGE_URL ||
                        ""
                      }
                      alt={item.garmentName}
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border border-white/50"
                      style={{ backgroundColor: item.garmentColorHex }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {item.garmentSku}
                      </span>
                      {getVerdictBadge(item.verdict)}
                    </div>
                    <h3 className="text-sm font-extrabold text-foreground leading-snug">
                      {item.garmentName}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-md flex items-center gap-1.5">
                      <AiGeneratedBadge size="xs" />
                      <span className="truncate">
                        {item.aiExplanation || "Style certainty analysis completed."}
                      </span>
                    </p>
                    <span className="text-[10px] text-muted-foreground/70 block">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Right: Scores & Feedback Action */}
                <div className="flex items-center justify-between md:justify-end space-x-4 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                  {/* Score */}
                  <div className="text-right">
                    <div className="text-base font-black text-foreground flex items-center justify-end gap-1">
                      {!isAdmin && <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />}
                      <span>{item.keepProbabilityScore.toFixed(1)}%</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      {isAdmin ? "Keep Probability" : "Style Match Rating"}
                    </span>
                  </div>

                  {/* Feedback Status / Button */}
                  {item.actionTaken ? (
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 ${
                        item.actionTaken === "KEPT"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {item.actionTaken === "KEPT" ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {item.actionTaken === "KEPT"
                          ? "Kept & Loved"
                          : `Returned (${item.returnReason?.replace("_", " ") || "Flagged"})`}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setSelectedSession({ id: item.sessionId, name: item.garmentName })
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-primary hover:text-primary-foreground text-xs font-semibold transition-colors flex items-center space-x-1.5"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>Log Return Reason</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post-Mortem Feedback Modal */}
      {selectedSession && (
        <PostMortemModal
          isOpen={true}
          sessionId={selectedSession.id}
          garmentName={selectedSession.name}
          userId={user?.id || "usr_94b3a8c1"}
          onClose={() => {
            setSelectedSession(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
