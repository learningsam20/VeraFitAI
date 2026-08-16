import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api, LearningsData, PurchaseLearningItem, PurchaseRecommendation, ProfileReportData, AiRecommendationItem } from "@/lib/api";
import {
  Brain,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  CheckCircle2,
  Heart,
  Target,
  Layers,
  Shirt,
  Palette,
  Activity,
  Bot,
  FileText,
  Info,
  AlertTriangle,
} from "lucide-react";

const CATEGORY_META: Record<string, { label: string; className: string; Icon: any }> = {
  behavior: { label: "Behavior", className: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30", Icon: Activity },
  fabric: { label: "Fabric", className: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30", Icon: Shirt },
  fit: { label: "Fit", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30", Icon: Target },
  color: { label: "Color", className: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30", Icon: Palette },
};

function LearningCard({ item }: { item: PurchaseLearningItem }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.behavior;
  const Icon = meta.Icon;
  return (
    <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${meta.className}`}>
            {meta.label}
          </span>
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <span
          className={`flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            item.impact >= 0
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
          }`}
        >
          {item.impact >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{item.impact >= 0 ? "+" : ""}{item.impact.toFixed(1)}</span>
        </span>
      </div>
      <h4 className="text-sm font-extrabold text-foreground leading-snug">{item.signal}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{item.insight}</p>
      <p className="text-[10px] font-mono text-foreground/70 bg-muted/60 p-1.5 rounded-lg border border-border/60">
        {item.evidence}
      </p>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: PurchaseRecommendation }) {
  return (
    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 shadow-sm space-y-1.5">
      <div className="flex items-center space-x-2">
        <Target className="w-4 h-4 text-primary shrink-0" />
        <h4 className="text-sm font-extrabold text-foreground leading-snug">{rec.title}</h4>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{rec.detail}</p>
      <span className="inline-block text-[9px] font-mono uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md">
        {rec.action}
      </span>
    </div>
  );
}

function AiRecommendationCard({ rec }: { rec: AiRecommendationItem }) {
  const badge =
    rec.priority === "high"
      ? "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30"
      : rec.priority === "medium"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30"
        : "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30";
  return (
    <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-extrabold text-foreground leading-snug flex items-start gap-1.5">
          <Bot className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          {rec.title}
        </h4>
        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 ${badge}`}>
          {rec.priority}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{rec.detail}</p>
      {rec.skus && rec.skus.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {rec.skus.map((sku) => (
            <span key={sku} className="text-[9px] font-mono uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
              {sku}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LearningsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<LearningsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ProfileReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getLearnings(user?.id || "usr_94b3a8c1");
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load learnings.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await api.getProfileReport(user?.id || "usr_94b3a8c1");
      setReport(res);
    } catch (err: any) {
      setReportError(err?.message || "Failed to generate AI profile report.");
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-violet-500/10 p-5 rounded-3xl border border-primary/20">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary text-primary-foreground tracking-wider">
              Purchase-History Analyzer Agent
            </span>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-violet-500" />
              LangGraph Continuous Learning
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
            Personal Fit Learnings & Recommendations
          </h1>
          <p className="text-xs text-muted-foreground">
            Evidence-backed signals mined from your try-on history, purchase actions, and skin/profile preferences.
          </p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center space-x-2 disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>{isLoading ? "Analyzing..." : "Refresh Learnings"}</span>
        </button>
      </div>

      {/* AI Comprehensive Profile Report */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-card border border-violet-500/20 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-violet-600 text-white tracking-wider">
                AI Recommendation Agent
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <FileText className="w-3 h-3" />
                LangGraph · User Profile Report
              </span>
            </div>
            <h2 className="text-base font-black tracking-tight text-foreground">
              Comprehensive Profile Report
            </h2>
            <p className="text-[11px] text-muted-foreground">
              The recommendation agent fuses the color-harmony, fabric-safety, fit, and
              purchase-history analyzer outputs into one shopper report.
            </p>
          </div>
          <button
            onClick={loadReport}
            disabled={reportLoading}
            className="px-4 py-2.5 rounded-2xl bg-violet-600 text-white text-xs font-bold shadow-md hover:bg-violet-700 transition-all flex items-center space-x-2 disabled:opacity-50 self-start sm:self-auto"
          >
            <Bot className={`w-4 h-4 ${reportLoading ? "animate-pulse" : ""}`} />
            <span>{reportLoading ? "Generating (LLM running)..." : report ? "Regenerate Report" : "Generate AI Report"}</span>
          </button>
        </div>

        {reportError && (
          <div className="p-3 rounded-2xl bg-red-600/10 border border-red-500/30 text-xs text-red-700 flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{reportError}</span>
          </div>
        )}

        {reportLoading && !report ? (
          <div className="p-6 rounded-2xl bg-card/60 border border-border/60 flex flex-col items-center justify-center space-y-3 text-center">
            <Bot className="w-7 h-7 text-violet-500 animate-pulse" />
            <p className="text-xs font-semibold text-muted-foreground">
              Recommendation agent is aggregating your profile and generating the report…
            </p>
            <p className="text-[10px] text-muted-foreground">
              Runs the local muse-glimmer LLM — this can take a few minutes. The deterministic
              agent fallback renders instantly if the LLM is unavailable.
            </p>
          </div>
        ) : report ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-violet-500" />
                  AI Summary
                </span>
                <span
                  className={`flex items-center space-x-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    report.llmGenerated
                      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                  }`}
                >
                  {report.llmGenerated ? (
                    <><Sparkles className="w-3 h-3" /> LLM generated</>
                  ) : (
                    <><Info className="w-3 h-3" /> deterministic fallback</>
                  )}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed font-medium">{report.summary}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Profile Insights</h3>
                <div className="space-y-2">
                  {report.profileInsights.map((insight, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-card border border-border/70 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-7 space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Agent Recommendations</h3>
                <div className="space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <AiRecommendationCard key={i} rec={rec} />
                  ))}
                </div>
              </div>
            </div>

            {report.catalogAdvice && (
              <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/25 text-xs text-foreground/90 leading-relaxed">
                <span className="font-extrabold uppercase text-[10px] text-violet-600 dark:text-violet-300">Catalog advice · </span>
                {report.catalogAdvice}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-600/10 border border-red-500/30 text-xs text-red-700">
          {error}
        </div>
      )}

      {isLoading && !data ? (
        <div className="p-10 rounded-3xl bg-card border border-border flex flex-col items-center justify-center space-y-3">
          <Brain className="w-8 h-8 text-primary animate-pulse" />
          <p className="text-xs font-semibold text-muted-foreground">
            Purchase-history analyzer agent is mining your signals...
          </p>
        </div>
      ) : data ? (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Sessions Analyzed</span>
              <span className="text-2xl font-black text-foreground">{data.totalSessions}</span>
              <span className="text-[10px] text-muted-foreground">try-ons / purchases</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Kept</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{data.keptCount}</span>
              <span className="text-[10px] text-muted-foreground">{data.keepRate}% keep rate</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 block">Returned</span>
              <span className="text-2xl font-black text-rose-700 dark:text-rose-300">{data.returnedCount}</span>
              <span className="text-[10px] text-muted-foreground">{data.returnRate}% return rate</span>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block">Avg Keep Prob.</span>
              <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{data.averageKeepProbability}%</span>
              <span className="text-[10px] text-muted-foreground">model certainty</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">Pending</span>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{data.pendingCount}</span>
              <span className="text-[10px] text-muted-foreground">no feedback yet</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Learnings */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      Clinical Learnings
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {data.learnings.length} signal{data.learnings.length === 1 ? "" : "s"}
                  </span>
                </div>
                {data.learnings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Not enough history yet — run a few analyses to unlock personalized signals.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.learnings.map((item, i) => (
                      <LearningCard key={i} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Recommendations + Fiber Affinities */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-4">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Personalized Recommendations
                  </h2>
                </div>
                <div className="space-y-3">
                  {data.recommendations.map((rec, i) => (
                    <RecommendationCard key={i} rec={rec} />
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-4">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Fiber Affinities
                  </h2>
                </div>
                <div className="space-y-2">
                  {data.fiberAffinities.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No fiber data yet.</p>
                  ) : (
                    data.fiberAffinities.map((f) => {
                      const isRisky = f.returned > 0 && f.avgFabricSafety < 80;
                      return (
                        <div key={f.fiber} className="p-3 rounded-2xl bg-secondary/40 border border-border/80">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-foreground uppercase">
                              {f.fiber}
                            </span>
                            <div className="flex items-center space-x-2 text-[10px] font-bold">
                              <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> {f.kept} kept
                              </span>
                              {f.returned > 0 && (
                                <span className="flex items-center space-x-1 text-rose-600 dark:text-rose-400">
                                  <ShieldAlert className="w-3 h-3" /> {f.returned} returned
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                            <span>{f.total} touchpoint{f.total === 1 ? "" : "s"}</span>
                            <span>
                              {isRisky ? (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">
                                  avg fabric safety {f.avgFabricSafety}%
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  avg keep {f.avgKeepScore}%
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
