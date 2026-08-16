
import React, { useState, useEffect } from "react";
import {
  api,
  AIEfficacyData,
  SupplierAnalyticsData,
  InventoryAdviceData,
  UserClusterData,
  Fleet7DayTrendData,
  RecentSessionAnalyticsData,
  InventoryClearanceAuditData,
  AgentAnalyticsData,
  CohortAnalyticsData,
  B2BReportData,
} from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import {
  BarChart3,
  ShieldCheck,
  TrendingDown,
  DollarSign,
  PieChart,
  Layers,
  Sparkles,
  Building2,
  PackageCheck,
  Users,
  Target,
  Calendar,
  Settings,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  Flame,
  Shirt,
  Info,
  Clock,
  Zap,
  RefreshCw,
  Activity,
  Radio,
  Tag,
  Filter,
  Play,
  HelpCircle,
  X,
  Bot,
  Cpu,
  Network,
  GitFork,
  FileText,
} from "lucide-react";

export default function AdminPortalPage() {
  const { user } = useAuthStore();
  const [selectedVendorId, setSelectedVendorId] = useState<string>(user?.vendorId || "vendor_venice");

  const [activeTab, setActiveTab] = useState<
    "sessions" | "inventory_catalog" | "agents" | "efficacy" | "suppliers" | "inventory_advice" | "clusters" | "trends" | "cohort" | "config"
  >("sessions");

  const [sessionHours, setSessionHours] = useState<number>(6);
  const [scrubHourIndex, setScrubHourIndex] = useState<number>(5);

  const [sessionAnalytics, setSessionAnalytics] = useState<RecentSessionAnalyticsData | null>(null);
  const [efficacy, setEfficacy] = useState<(AIEfficacyData & { savedMerchandiseExplanation?: string }) | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierAnalyticsData | null>(null);
  const [inventoryAdvice, setInventoryAdvice] = useState<InventoryAdviceData | null>(null);
  const [inventoryCatalog, setInventoryCatalog] = useState<InventoryClearanceAuditData | null>(null);
  const [inventoryFilter, setInventoryFilter] = useState<string>("all");
  const [agentAnalytics, setAgentAnalytics] = useState<AgentAnalyticsData | null>(null);

  const [clusters, setClusters] = useState<UserClusterData | null>(null);
  const [trends, setTrends] = useState<Fleet7DayTrendData | null>(null);
  const [cohort, setCohort] = useState<CohortAnalyticsData | null>(null);
  const [masterConfig, setMasterConfig] = useState<any>(null);
  const [b2bReport, setB2bReport] = useState<B2BReportData | null>(null);
  const [b2bReportLoading, setB2bReportLoading] = useState(false);
  const [b2bReportError, setB2bReportError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [lastAuditRunAt, setLastAuditRunAt] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialFriction, setNewMaterialFriction] = useState(0.2);
  const [newMaterialCategory, setNewMaterialCategory] = useState("Natural Weave");

  useEffect(() => {
    if (user?.vendorId) {
      setSelectedVendorId(user.vendorId);
    }
  }, [user]);

  useEffect(() => {
    loadAllAdminData();
  }, [selectedVendorId, sessionHours, inventoryFilter]);

  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [sess, eff, sup, invAdv, invCat, agn, clu, trn, coh, mst] = await Promise.all([
        api.getRecentSessionAnalytics(sessionHours, selectedVendorId === "all" ? undefined : selectedVendorId),
        api.getAIEfficacyMatrix(selectedVendorId === "all" ? undefined : selectedVendorId),
        api.getSupplierAnalytics(selectedVendorId === "all" ? undefined : selectedVendorId),
        api.getInventoryAdvice(selectedVendorId === "all" ? undefined : selectedVendorId),
        api.getInventoryClearanceAudit(selectedVendorId === "all" ? undefined : selectedVendorId, inventoryFilter),
        api.getAgentAnalytics(selectedVendorId === "all" ? undefined : selectedVendorId),
        api.getUserClusters(selectedVendorId === "all" ? undefined : selectedVendorId),
        api.getFleet7DayTrends(selectedVendorId === "all" ? undefined : selectedVendorId),
        api.getCohortAnalytics(selectedVendorId === "all" ? undefined : selectedVendorId),
        api.getMasterDataConfig(selectedVendorId === "all" ? undefined : selectedVendorId),
      ]);
      setSessionAnalytics(sess);
      setEfficacy(eff);
      setSuppliers(sup);
      setInventoryAdvice(invAdv);
      setInventoryCatalog(invCat);
      setAgentAnalytics(agn);
      setClusters(clu);
      setTrends(trn);
      setCohort(coh);
      setMasterConfig(mst);
      if (sess.hourlyTimeline?.length) {
        setScrubHourIndex(sess.hourlyTimeline.length - 1);
      }
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadB2BReport = async () => {
    setB2bReportLoading(true);
    setB2bReportError(null);
    try {
      const res = await api.getB2BReport(selectedVendorId === "all" ? undefined : selectedVendorId);
      setB2bReport(res);
    } catch (err: any) {
      console.error("Failed to generate B2B report", err);
      setB2bReportError(err?.message || "Failed to generate B2B AI report.");
    } finally {
      setB2bReportLoading(false);
    }
  };

  const handleApplyPromo = async (sku: string, discountPct: number) => {
    try {
      await api.applyClearanceOffer(sku, discountPct);
      setToastMessage(`⚡ Applied ${discountPct}% Clearance Promo to SKU ${sku}! Margin and inventory re-indexed.`);
      setTimeout(() => setToastMessage(null), 5000);
      await loadAllAdminData();
    } catch (err) {
      console.error("Failed to apply promo", err);
    }
  };

  const handleRunBatchAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await api.runBatchInventoryAudit(selectedVendorId === "all" ? undefined : selectedVendorId);
      setLastAuditRunAt(res.lastRunAt || res.executedAt);
      setToastMessage(`🚀 Batch AI Inventory Audit Job Complete: ${res.atRiskSkusIdentified} at-risk SKUs flagged. $${res.marginSavedDollars.toLocaleString()} deadstock margin protected.`);
      setTimeout(() => setToastMessage(null), 6000);
      await loadAllAdminData();
    } catch (err) {
      console.error("Batch audit failed", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim()) return;

    try {
      await api.addMasterDataMaterial({
        material: newMaterialName.trim(),
        frictionIndex: Number(newMaterialFriction),
        breathabilityIndex: 0.90,
        skinSafeStatus: newMaterialFriction > 0.5 ? "HIGH_ALLERGEN" : "OPTIMAL",
        category: newMaterialCategory,
      });
      setNewMaterialName("");
      const updated = await api.getMasterDataConfig(selectedVendorId === "all" ? undefined : selectedVendorId);
      setMasterConfig(updated);
    } catch (e) {
      console.error("Failed to add material", e);
    }
  };

  const TABS = [
    { id: "sessions", label: "Real-Time Pulse", icon: Clock },
    { id: "inventory_catalog", label: "SKU Keep/No-Keep", icon: Tag },
    { id: "agents", label: "Multi-Agent", icon: Bot },
    { id: "efficacy", label: "AI Efficacy", icon: ShieldCheck },
    { id: "suppliers", label: "Supplier Defects", icon: Building2 },
    { id: "inventory_advice", label: "Stocking AI", icon: PackageCheck },
    { id: "clusters", label: "User Clusters", icon: Target },
    { id: "trends", label: "7-Day Demand", icon: Calendar },
    { id: "cohort", label: "Cohort Intel", icon: Users },
    { id: "config", label: "Master Data", icon: Settings },
  ] as const;

  const currentScrubData = sessionAnalytics?.hourlyTimeline?.[scrubHourIndex] || sessionAnalytics?.hourlyTimeline?.[0];

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full">
            DB Synced
          </span>
        </div>
      )}

      {/* Net Merchandise Explanation Modal */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-primary font-extrabold text-sm">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>What is Net Merchandise Value Saved?</span>
              </div>
              <button
                onClick={() => setInfoModalOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Net Merchandise Value Saved</strong> represents the cumulative dollar value of inventory protected from reverse logistics loss, markdown depreciation, restocking transit damage, and customer churn.
            </p>
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-2 text-xs">
              <span className="font-bold text-foreground block uppercase text-[10px] text-primary">
                Mathematical Formula:
              </span>
              <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                Net Saved = (Prevented Returns Count) × ($38 Reverse Logistics + $72 Markdown Depreciation)
              </p>
              <p className="text-[11px] text-muted-foreground">
                = <strong>$110.00 Net Savings</strong> per retained purchase session.
              </p>
            </div>
            <button
              onClick={() => setInfoModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Executive Command Header & Vendor Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/30 via-slate-900/40 to-primary/20 p-6 rounded-3xl border border-indigo-500/20 shadow-md">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500 text-white tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>B2B Vendor Portal</span>
            </span>

            {/* Vendor Switcher Dropdown / Pills */}
            <div className="flex items-center space-x-1 bg-secondary/80 p-1 rounded-xl border border-border text-[11px]">
              <span className="text-muted-foreground px-2 font-bold uppercase text-[9px]">Vendor:</span>
              <button
                onClick={() => setSelectedVendorId("vendor_venice")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedVendorId === "vendor_venice"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Venice Luxury Atelier (Italy)
              </button>
              <button
                onClick={() => setSelectedVendorId("vendor_nordic")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedVendorId === "vendor_nordic"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Nordic Organic Weaves (Sweden)
              </button>
              <button
                onClick={() => setSelectedVendorId("all")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedVendorId === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Merchants Fleet
              </button>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {selectedVendorId === "vendor_venice"
              ? "Venice Luxury Group — Retail Intelligence Hub"
              : selectedVendorId === "vendor_nordic"
              ? "Nordic Weaves Collective — Operations Hub"
              : "Enterprise Fleet AI Hub"}
          </h1>
          <p className="text-xs text-muted-foreground">
            AI Keep vs. No-Keep inventory optimization, agent latency telemetry, real-time hourly pulse waves, and supplier defect auditing.
          </p>
        </div>

        {/* Executive Action & KPI Pill */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-auto">
          {/* Net Merchandise Saved with Explainability Tooltip */}
          {efficacy && (
            <button
              onClick={() => setInfoModalOpen(true)}
              className="flex items-center space-x-2.5 bg-secondary/80 hover:bg-secondary border border-border p-2.5 px-3.5 rounded-2xl transition-all cursor-pointer text-left"
              title="Click to view explanation of Net Merchandise Saved calculation"
            >
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <span>Net Merchandise Saved</span>
                  <HelpCircle className="w-3 h-3 text-primary" />
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  ${efficacy.netMerchandiseValueSavedDollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </button>
          )}

          <button
            onClick={loadAllAdminData}
            className="p-2.5 rounded-2xl border border-border bg-card hover:bg-secondary text-foreground transition-all"
            title="Refresh All Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>

      {/* Tab Sub-Menu: vertical left rail on desktop, horizontal scroll row on mobile */}
      <div className="flex flex-col lg:flex-row lg:gap-4 lg:items-start">
        <nav
          className="flex items-start gap-1.5 p-1.5 rounded-2xl bg-secondary/60 border border-border overflow-x-auto max-w-full lg:flex-col lg:w-52 lg:shrink-0 lg:overflow-visible"
          aria-label="Dashboard sections"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-none lg:w-full flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="truncate whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex-1 min-w-0 space-y-6">

      {/* TAB 1: Innovative Real-Time & Timeline Pulse Analytics */}
      {activeTab === "sessions" && sessionAnalytics && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Time Window Selector & Active Shoppers */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-foreground">Circadian Pulse Scrubber:</span>
              <span className="text-xs text-muted-foreground">
                {selectedVendorId === "vendor_venice" ? "Venice Luxury Group" : selectedVendorId === "vendor_nordic" ? "Nordic Organic Weaves" : "All Merchants Fleet"} — Timeline Snapshot: <strong className="text-primary">{currentScrubData?.hourLabel || "Now"}</strong>
              </span>
            </div>
            <div className="flex space-x-1.5">
              {[1, 3, 6, 12, 24].map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    setSessionHours(h);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    sessionHours === h
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {h}h Window
                </button>
              ))}
            </div>
          </div>

          {/* Dynamically Reactive KPI Cards based on Scrub Point */}
          {(() => {
            const activeSessions = currentScrubData?.sessions ?? sessionAnalytics.summary.totalSessions;
            const activePurchases = currentScrubData?.purchases ?? sessionAnalytics.summary.totalPurchases;
            const activeReturns = currentScrubData?.returns ?? sessionAnalytics.summary.totalReturns;
            const activeConv = currentScrubData?.conversionRatePct ?? sessionAnalytics.summary.conversionRatePct;
            const activeReturnRate = activeSessions > 0 ? Number(((activeReturns / activeSessions) * 100).toFixed(1)) : 0;
            const unitRevenue = selectedVendorId === "vendor_venice" ? 135.0 : 82.0;
            const activeRevenue = activePurchases * unitRevenue;
            const activeLiveShoppers = Math.max(4, Math.round(activeSessions * 0.45));
            const activeScore = currentScrubData?.avgKeepScore ?? sessionAnalytics.summary.avgKeepScore;

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Metrics at Scrub Point: <span className="text-foreground underline decoration-primary font-black">{currentScrubData?.hourLabel || "Current Hour"}</span></span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Aggregated Window Total: {sessionAnalytics.summary.totalSessions} sessions | ${sessionAnalytics.summary.estimatedRevenueDollars.toLocaleString()} rev
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-3xl bg-card border border-primary/40 shadow-xs space-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-xl bg-primary/15 text-primary text-[9px] font-black uppercase">
                      {currentScrubData?.hourLabel}
                    </div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Hourly Traffic Volume</span>
                    <div className="text-2xl font-black text-foreground">{activeSessions}</div>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{activeLiveShoppers} Active Shoppers at {currentScrubData?.hourLabel}</span>
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase">
                      {activeConv}% Conv
                    </div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Purchases Confirmed</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {activePurchases}
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Conversion Rate: <strong>{activeConv}%</strong> ({activePurchases}/{activeSessions})
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase">
                      {activeReturnRate}% Return Risk
                    </div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Returns Recorded</span>
                    <div className="text-2xl font-black text-foreground">{activeReturns}</div>
                    <p className="text-[11px] text-muted-foreground">
                      {activeReturns} returns logged ({activeReturnRate}% return rate)
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase">
                      Avg Score {activeScore}%
                    </div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Hourly Net Revenue</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      ${activeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-muted-foreground">AI Keep Index: <strong>{activeScore}%</strong></p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* INNOVATIVE VIEW: Interactive Timeline Scrubber & Circadian Wave */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary animate-pulse" />
                  <span>Interactive Time-Travel Scrubber & Circadian Conversion Waves</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Drag the slider across the timeline to inspect traffic volume and conversion spikes at each hour.
                </p>
              </div>
              {currentScrubData && (
                <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary self-start sm:self-auto">
                  Selected: {currentScrubData.hourLabel} ({currentScrubData.sessions} Sessions, {currentScrubData.conversionRatePct}% Conv)
                </div>
              )}
            </div>

            {/* Time Travel Scrubber Slider */}
            <div className="space-y-2 p-4 rounded-2xl bg-secondary/40 border border-border">
              <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                <span>{sessionAnalytics.hourlyTimeline[0]?.hourLabel || "T-6h"}</span>
                <span className="text-primary font-black uppercase">Current Scrub Point: {currentScrubData?.hourLabel}</span>
                <span>{sessionAnalytics.hourlyTimeline[sessionAnalytics.hourlyTimeline.length - 1]?.hourLabel || "Now"}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, sessionAnalytics.hourlyTimeline.length - 1)}
                step="1"
                value={scrubHourIndex}
                onChange={(e) => setScrubHourIndex(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Wave Visualizer Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {sessionAnalytics.hourlyTimeline.map((item, idx) => {
                const isSelected = idx === scrubHourIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => setScrubHourIndex(idx)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-primary/15 border-primary shadow-sm scale-105"
                        : "bg-secondary/20 border-border/70 hover:bg-secondary/50"
                    }`}
                  >
                    <span className="font-extrabold text-[11px] text-foreground block">{item.hourLabel}</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-black text-foreground">{item.sessions}</span>
                      <span className="text-[10px] text-muted-foreground">sessions</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        style={{ width: `${item.conversionRatePct}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                      {item.purchases} bought ({item.conversionRatePct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Real-Time Activity Stream Feed */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-500" />
                <span>Live Real-Time Shopper Stream</span>
              </h2>
              <span className="text-xs text-muted-foreground font-semibold">Direct Database Event Logs</span>
            </div>

            <div className="space-y-2.5">
              {sessionAnalytics.liveActivityStream.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-2xl bg-secondary/30 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        act.action === "PURCHASED"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : act.action === "RETURNED"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {act.action === "PURCHASED" ? "✓" : act.action === "RETURNED" ? "↩" : "👁"}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-foreground">{act.garmentName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">({act.sku})</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{act.detail}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0 sm:text-right">
                    <div>
                      <span className="font-bold text-primary block">{act.keepScore.toFixed(1)}% Match</span>
                      <span className="text-[10px] text-muted-foreground">{act.timeAgo}</span>
                    </div>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-1 rounded-md uppercase ${
                        act.action === "PURCHASED"
                          ? "bg-emerald-500 text-white"
                          : act.action === "RETURNED"
                          ? "bg-rose-500 text-white"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {act.action.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SKU Inventory with AI Keep vs AI No-Keep & Targeted Clearance Promotions */}
      {activeTab === "inventory_catalog" && inventoryCatalog && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header Controls & Batch Job Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Inventory AI Classification & Clearance Optimizer
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Filter inventory by AI Keep (high margin certainty) vs. AI No-Keep (return risks), and apply targeted clearance drops.
              </p>
            </div>

            {/* Run Batch Audit Job Action */}
            <div className="flex flex-wrap items-center gap-2">
              {lastAuditRunAt && (
                <div className="px-3 py-1.5 rounded-2xl bg-secondary/70 border border-border text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">Last Run:</span>{" "}
                  {new Date(lastAuditRunAt).toLocaleString()}
                </div>
              )}
              <button
                onClick={handleRunBatchAudit}
                disabled={isAuditing}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
                <span>{isAuditing ? "Auditing Fleet SKUs..." : "Run AI Fleet Inventory Audit"}</span>
              </button>
            </div>
          </div>

          {/* Filter Pills & Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex space-x-1.5 bg-secondary/80 p-1.5 rounded-2xl border border-border text-xs font-bold">
              <button
                onClick={() => setInventoryFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  inventoryFilter === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All SKUs ({inventoryCatalog.summary.totalCatalogSkus})
              </button>
              <button
                onClick={() => setInventoryFilter("keep")}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                  inventoryFilter === "keep" ? "bg-emerald-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>AI Keep (Score ≥ 80%)</span>
              </button>
              <button
                onClick={() => setInventoryFilter("no_keep")}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                  inventoryFilter === "no_keep" ? "bg-rose-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>AI No-Keep / Return Risk</span>
              </button>
            </div>

            <div className="flex items-center space-x-4 text-xs">
              <span className="text-muted-foreground">
                In-Stock Units: <strong>{inventoryCatalog.summary.totalUnitsInStock}</strong>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Protected: {inventoryCatalog.summary.protectedKeepUnits} units
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                At-Risk: {inventoryCatalog.summary.atRiskNoKeepUnits} units
              </span>
            </div>
          </div>

          {/* Inventory SKU Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryCatalog.items.map((item) => {
              const isKeep = item.aiClassification === "AI_KEEP";
              return (
                <div
                  key={item.sku}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                    isKeep
                      ? "bg-card border-border/80"
                      : "bg-rose-500/5 border-rose-500/30"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{item.sku}</span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          isKeep
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse"
                        }`}
                      >
                        {isKeep ? "✓ AI KEEP (High Certainty)" : "⚠️ AI NO-KEEP RISK"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.vendorName} • {item.category}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-secondary/40 border border-border text-center text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">In Stock</span>
                        <span className="font-extrabold text-foreground">{item.inStockUnits}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Price</span>
                        <span className="font-extrabold text-foreground">${item.retailPrice}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">AI Score</span>
                        <span className={`font-black ${isKeep ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {item.aiKeepScore}%
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <span className="font-bold text-foreground block">AI Risk / Quality Driver:</span>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {item.primaryRiskFactor.replace(/_/g, " ")}
                      </p>
                    </div>

                    {!isKeep && (
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1 text-xs">
                        <span className="font-bold text-rose-600 dark:text-rose-400 block uppercase text-[10px]">
                          AI Recommended Clearance Offer:
                        </span>
                        <p className="text-[11px] text-foreground font-semibold">
                          {item.suggestedOffer}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-border">
                    {isKeep ? (
                      <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>Status: Full Margin Protected</span>
                        <span>0% Markdown</span>
                      </div>
                    ) : item.promoApplied ? (
                      <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center border border-emerald-500/30">
                        ✓ {item.promoDiscountPct}% Clearance Promo Active
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyPromo(item.sku, item.promoDiscountPct || 35)}
                        className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Apply AI Clearance Markdown ({item.promoDiscountPct || 35}% Off)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Dedicated Agent Analytics Dashboard */}
      {activeTab === "agents" && agentAnalytics && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Agent Architecture KPI Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">System Health & State</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Optimal</span>
              </div>
              <p className="text-[11px] text-muted-foreground">LangGraph Multi-Agent Runtime</p>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Graph Execution Success</span>
              <div className="text-2xl font-black text-foreground">{agentAnalytics.graphExecutionSuccessRate}%</div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {agentAnalytics.totalAgentInvocations.toLocaleString()} Invocations Processed
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Avg Graph Latency</span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {agentAnalytics.avgGraphLatencyMs} ms
              </div>
              <p className="text-[11px] text-muted-foreground">3-Way Parallel Subgraph Execution</p>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Vector Cache Hit Rate</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {agentAnalytics.cacheHitRatePct}%
              </div>
              <p className="text-[11px] text-muted-foreground">Mannequin Mesh Embeddings</p>
            </div>
          </div>

          {/* Evaluator Agents Telemetry Cards */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span>Specialized Evaluator Agents Breakdown</span>
              </h2>
              <span className="text-xs text-muted-foreground font-semibold">Live Subsystem Scoring</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentAnalytics.activeEvaluatorAgents.map((ag) => (
                <div
                  key={ag.agentId}
                  className="p-5 rounded-3xl bg-secondary/30 border border-border/80 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{ag.nodeType}</span>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        ● {ag.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">{ag.name}</h3>
                      <p className="text-[11px] text-muted-foreground leading-snug">{ag.role}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-card border border-border/60 text-center text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Latency</span>
                        <span className="font-extrabold text-foreground">{ag.avgLatencyMs} ms</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Accuracy</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{ag.accuracyPct}%</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Runs</span>
                        <span className="font-extrabold text-foreground">{ag.totalInvocations}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 space-y-1 text-xs">
                      <span className="font-bold text-primary block uppercase text-[10px]">{ag.keyMetricLabel}:</span>
                      <p className="font-extrabold text-foreground text-xs">{ag.keyMetricValue}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LangGraph DAG Execution Pipeline Flow */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Network className="w-4 h-4 text-primary" />
              <span>LangGraph Execution Pipeline DAG Stages</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {agentAnalytics.dagPipelineStages.map((st, i) => (
                <div key={i} className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-primary">{st.stage}</span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {st.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-foreground font-bold">{st.node}</p>
                  <p className="text-[11px] text-muted-foreground">Latency: <strong>{st.latencyMs} ms</strong></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AI Efficacy & Model Gap Analysis */}
      {activeTab === "efficacy" && efficacy && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Overall Model Accuracy</span>
              <div className="text-2xl font-black text-foreground">{efficacy.modelOverallAccuracy}%</div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Correlation: r = {efficacy.keepProbabilityCorrelation}
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">SSIM Fit Repeatability</span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {efficacy.ssimVarianceAccuracy}%
              </div>
              <p className="text-[11px] text-muted-foreground">3-Way Generative Verification</p>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">False Positive Return Rate</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {efficacy.falsePositiveReturnRate}%
              </div>
              <p className="text-[11px] text-muted-foreground">Industry benchmark: 18.5%</p>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Allergen Safety Suppression</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {efficacy.fabricSafetyAuditReliability}%
              </div>
              <p className="text-[11px] text-muted-foreground">0.40x Hard Filter Active</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>AI Subsystem Gap & Benchmark Analysis</span>
              </h2>
              <span className="text-xs text-muted-foreground font-semibold">
                {efficacy.totalSimulationsRun.toLocaleString()} Sessions Analyzed
              </span>
            </div>

            <div className="space-y-3">
              {efficacy.gapAnalysis.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{item.subsystem}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      {item.gapStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.targetMetric}</p>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-foreground">Achieved: <strong className="text-primary">{item.achievedScore}%</strong></span>
                      <span className="text-muted-foreground">Benchmark: {item.benchmark}%</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-foreground/80 bg-muted/40 p-2 rounded-xl border border-border/40 leading-snug">
                    🔍 <strong>Telemetry Finding:</strong> {item.rootCauseIdentified}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Supplier & Factory Defects */}
      {activeTab === "suppliers" && suppliers && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Manufacturer & Mill Defect Telemetry</span>
            </h2>

            <div className="space-y-3">
              {suppliers.manufacturers.map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-secondary/30 border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-foreground">{m.name}</h3>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          m.status === "PREFERRED_SUPPLIER"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : m.status === "APPROVED"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {m.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supplied SKUs: {m.suppliedSkus.join(", ")} • Quality Grade: <strong>{m.fabricQualityGrade}</strong>
                    </p>
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                      Primary Return Driver: {m.primaryReturnReason.replace(/_/g, " ")}
                    </p>
                  </div>

                  <div className="flex items-center space-x-6 text-right shrink-0">
                    <div>
                      <div className="text-base font-black text-foreground">{m.returnRatePct}%</div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Return Rate</span>
                    </div>
                    <div>
                      <div className="text-base font-black text-primary">{m.avgKeepScore}%</div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Avg Keep Score</span>
                    </div>
                    <div>
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{m.totalUnitsSold}</div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Units Sold</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Demographic Stocking AI */}
      {activeTab === "inventory_advice" && inventoryAdvice && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                <span>Customer Color Season Demographics</span>
              </h2>
              <div className="space-y-2.5">
                {inventoryAdvice.customerBaseDemographics.colorSeasons.map((s, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-secondary/30 border border-border/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground">{s.season}</span>
                      <p className="text-[10px] text-muted-foreground">{s.dominantPalette}</p>
                    </div>
                    <span className="text-sm font-black text-primary font-mono">{s.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Prevalence of Skin Sensitivities</span>
              </h2>
              <div className="space-y-2.5">
                {inventoryAdvice.customerBaseDemographics.sensitivities.map((s, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-secondary/30 border border-border/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{s.concern}</span>
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                      {s.affectedShoppersPct}% of Shoppers
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-500" />
              <span>Proactive Inventory Replenishment & De-Stocking Actions</span>
            </h2>

            <div className="space-y-3">
              {inventoryAdvice.stockingRecommendations.map((rec, i) => (
                <div key={i} className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-foreground">{rec.category}</h3>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          rec.action.includes("INCREASE")
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {rec.action.replace(/_/g, " ")} ({rec.recommendedAdjustmentPct > 0 ? `+${rec.recommendedAdjustmentPct}%` : `${rec.recommendedAdjustmentPct}%`})
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Prioritize Palettes:</span>
                    {rec.colorTonesToPrioritize.map((t, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-foreground font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: User Clusters & Targeting */}
      {activeTab === "clusters" && clusters && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span>AI-Derived Customer Persona Clusters & Tailored Drops</span>
              </h2>
              <span className="text-[11px] text-primary font-semibold">
                {clusters.vendorLabel || "All Vendors"} · {clusters.fleetSize ?? 0} try-ons · {clusters.fleetKeepRatePct ?? 0}% keep
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {clusters.clusters.map((c, i) => (
                <div key={i} className="p-5 rounded-3xl bg-secondary/30 border border-border/80 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-foreground">{c.name}</h3>
                      <span className="text-xs font-black text-primary font-mono">{c.sizePct}% Fleet</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.profile}</p>
                    <div className="p-3 rounded-2xl bg-card border border-border/60 text-[11px] space-y-1">
                      <span className="font-bold text-primary block uppercase text-[10px]">Target Campaign:</span>
                      <p className="font-extrabold text-foreground">{c.targetCampaign}</p>
                      <p className="text-muted-foreground text-[10px]">Recommended SKUs: {c.suggestedSkus.join(", ")}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex justify-between text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Conv. Lift: {c.expectedConversionLift}</span>
                    <span className="text-muted-foreground font-semibold">Return Rate: {c.expectedReturnRate}</span>
                  </div>
                  {typeof c.fleetKeepRatePct === "number" && (
                    <div className="text-[10px] text-muted-foreground">
                      Live fleet: {c.fleetKeepRatePct}% keep · {c.fleetReturnRatePct ?? 0}% return
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: Aggregated 7-Day Demand Trends */}
      {activeTab === "trends" && trends && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Aggregated 7-Day Fleet Demand & Weather Forecasting</span>
              </h2>
              <span className="text-xs text-primary font-semibold">{trends.weeklyDemandSummary}</span>
            </div>

            <div className="space-y-3">
              {trends.dailyFleetForecast.map((d, i) => (
                <div key={i} className="p-4 rounded-2xl bg-secondary/30 border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-foreground">{d.day} ({d.date})</span>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/15">
                        {d.suggestedMerchandiseBanner}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.dominantFleetAgenda}</p>
                    <p className="text-[11px] text-foreground/80 font-medium">{d.weatherImpact}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      +{d.projectedDemandSurgePct}% Surge
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">{d.predictedTopCategory}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: Cohort Intel from Live User Data */}
      {activeTab === "cohort" && cohort && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/25 via-slate-900/30 to-emerald-900/20 border border-indigo-500/20 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Cohort Intelligence — Computed From Stored User Data</span>
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Activity className="w-3 h-3" /> 100% Live DB
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Profiles (digital mannequins), preferences, and purchase feedback aggregated in real time. Updated {new Date(cohort.computedAt).toLocaleTimeString()}.
            </p>
          </div>

          {/* Overview stat tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            {[
              { label: "Total Users", value: cohort.overview.totalUsers, accent: "text-primary" },
              { label: "Profiled", value: cohort.overview.profiledUsers, accent: "text-foreground" },
              { label: "Sessions", value: cohort.overview.totalSessions, accent: "text-foreground" },
              { label: "Kept", value: cohort.overview.totalKept, accent: "text-emerald-600 dark:text-emerald-400" },
              { label: "Returned", value: cohort.overview.totalReturned, accent: "text-rose-600 dark:text-rose-400" },
              { label: "Return Rate", value: `${cohort.overview.returnRatePct}%`, accent: cohort.overview.returnRatePct > 30 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400" },
              { label: "Revenue", value: `$${cohort.overview.totalRevenueDollars.toLocaleString()}`, accent: "text-emerald-600 dark:text-emerald-400" },
              { label: "Avg Keep", value: `${cohort.overview.avgKeepScore}`, accent: "text-foreground" },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{s.label}</div>
                <div className={`text-xl font-black mt-1 font-mono ${s.accent}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Profile distribution */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                <span>Profile Distribution</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Color Seasons</span>
                  <div className="space-y-1.5 mt-2">
                    {cohort.profileDistribution.colorSeasons.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-semibold">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(s.pct, 2)}%` }} />
                          </div>
                          <span className="font-mono font-bold text-muted-foreground w-12 text-right">{s.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Skin Undertones</span>
                  <div className="space-y-1.5 mt-2">
                    {cohort.profileDistribution.skinUndertones.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-semibold">{s.name}</span>
                        <span className="font-mono font-bold text-muted-foreground">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Body Types</span>
                    <div className="space-y-1.5 mt-2">
                      {cohort.profileDistribution.bodyTypes.map((s) => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <span className="text-foreground font-semibold">{s.name}</span>
                          <span className="font-mono font-bold text-muted-foreground">{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Avg Detected Skin Concerns (Profile-wide)</span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                  {Object.entries(cohort.profileDistribution.avgSkinConcerns).map(([k, v]) => (
                    <div key={k} className="p-2 rounded-xl bg-secondary/40 border border-border/70 text-center">
                      <div className="font-mono font-black text-sm text-foreground">{v}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Preference distribution */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <span>Preference Distribution</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Preferred Fit</span>
                  <div className="space-y-1.5 mt-2">
                    {cohort.preferenceDistribution.fitPreferences.map((f) => (
                      <div key={f.name} className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-semibold capitalize">{f.name}</span>
                        <span className="font-mono font-bold text-muted-foreground">{f.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-2xl bg-secondary/40 border border-border/70">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Comfort vs Style Bias</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-muted-foreground font-semibold">Style</span>
                      <span className="font-mono font-black text-sm text-foreground">
                        {cohort.preferenceDistribution.avgComfortVsStyleBias === null ? "N/A" : (cohort.preferenceDistribution.avgComfortVsStyleBias * 100).toFixed(0) + "% Comfort"}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-semibold">Comfort</span>
                    </div>
                    <div className="h-2 mt-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                        style={{ width: `${(cohort.preferenceDistribution.avgComfortVsStyleBias ?? 0) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Allergy Prevalence</span>
                  <div className="space-y-1.5 mt-2">
                    {cohort.preferenceDistribution.allergies.map((a) => (
                      <div key={a.allergen} className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-semibold capitalize">{a.allergen.replace(/_/g, " ")}</span>
                        <span className="font-mono font-bold text-muted-foreground">{a.pct}%</span>
                      </div>
                    ))}
                    {cohort.preferenceDistribution.allergies.length === 0 && (
                      <span className="text-xs text-muted-foreground">No allergy declarations on record.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase behavior */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Shirt className="w-4 h-4 text-primary" />
              <span>Purchase Behavior — Top SKUs</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3 font-bold">SKU</th>
                    <th className="py-2 pr-3 font-bold">Garment</th>
                    <th className="py-2 pr-3 font-bold text-right">Sessions</th>
                    <th className="py-2 pr-3 font-bold text-right">Kept</th>
                    <th className="py-2 pr-3 font-bold text-right">Returned</th>
                    <th className="py-2 pr-3 font-bold text-right">Return Rate</th>
                    <th className="py-2 pr-3 font-bold text-right">Avg Keep</th>
                    <th className="py-2 font-bold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {cohort.purchaseBehavior.topSkus.map((s) => (
                    <tr key={s.sku} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3 font-mono text-primary font-bold">{s.sku}</td>
                      <td className="py-2 pr-3 text-foreground font-semibold whitespace-nowrap">{s.name}</td>
                      <td className="py-2 pr-3 text-right font-mono">{s.sessions}</td>
                      <td className="py-2 pr-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">{s.kept}</td>
                      <td className="py-2 pr-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">{s.returned}</td>
                      <td className="py-2 pr-3 text-right font-mono font-bold">{s.returnRatePct}%</td>
                      <td className="py-2 pr-3 text-right font-mono">{s.avgKeepScore}</td>
                      <td className="py-2 text-right font-mono font-bold">${s.revenueDollars.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cohort.purchaseBehavior.returnReasons.length > 0 && (
              <div className="pt-3 border-t border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Return Reasons</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {cohort.purchaseBehavior.returnReasons.map((r) => (
                    <span key={r.reason} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px]">
                      <span className="font-bold text-foreground">{r.reason.replace(/_/g, " ")}</span>
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400">{r.count} ({r.pct}%)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Correlations */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Fiber family */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                <span>Return Rate by Fiber Family</span>
              </h3>
              <div className="space-y-2">
                {cohort.correlations.returnRateByFiberFamily.map((f) => (
                  <div key={f.fiber} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-bold capitalize w-20">{f.fiber}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{f.sessions} sessions · keep {f.avgKeepScore}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${f.returnRatePct > 40 ? "bg-rose-500" : f.returnRatePct > 15 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.max(f.returnRatePct, 2)}%` }}
                        />
                      </div>
                      <span className={`font-mono font-bold w-12 text-right ${f.returnRatePct > 40 ? "text-rose-600 dark:text-rose-400" : f.returnRatePct > 15 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {f.returnRatePct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Wool-Allergic shoppers</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{cohort.correlations.woolAllergy.woolAllergicReturnRatePct}% return rate</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Non-allergic shoppers</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{cohort.correlations.woolAllergy.nonWoolAllergicReturnRatePct}% return rate</span>
              </div>
            </div>

            {/* Season / sensitivity / fit */}
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span>Return Rate by Color Season</span>
                </h3>
                <div className="space-y-2">
                  {cohort.correlations.returnRateBySeason.map((s) => (
                    <div key={s.season} className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-semibold">{s.season}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${s.returnRatePct > 40 ? "bg-rose-500" : s.returnRatePct > 15 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(s.returnRatePct, 2)}%` }} />
                        </div>
                        <span className="font-mono font-bold w-12 text-right">{s.returnRatePct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span>Return Rate by Sensitivity Bucket</span>
                </h3>
                <div className="space-y-2">
                  {cohort.correlations.returnRateBySensitivityBucket.map((b) => (
                    <div key={b.bucket} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-bold capitalize">{b.bucket}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{b.users} users</span>
                      </div>
                      <span className={`font-mono font-bold ${b.returnRatePct > 40 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {b.returnRatePct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI B2B Aggregated Report */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-card border border-violet-500/20 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-violet-600 text-white tracking-wider">
                    AI Recommendation Agent
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    LangGraph · B2B Fleet Report
                  </span>
                </div>
                <h2 className="text-sm font-black tracking-tight text-foreground">
                  Aggregated Merchant Report
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Fuses this vendor's cohort stats, return-driver analysis, purchase-history signals, and
                  catalog compatibility into one fleet-level intelligence report.
                </p>
              </div>
              <button
                onClick={loadB2BReport}
                disabled={b2bReportLoading}
                className="px-4 py-2.5 rounded-2xl bg-violet-600 text-white text-xs font-bold shadow-md hover:bg-violet-700 transition-all flex items-center space-x-2 disabled:opacity-50 self-start sm:self-auto"
              >
                <Bot className={`w-4 h-4 ${b2bReportLoading ? "animate-pulse" : ""}`} />
                <span>{b2bReportLoading ? "Generating (LLM running)..." : b2bReport ? "Regenerate Report" : "Generate AI Report"}</span>
              </button>
            </div>

            {b2bReportError && (
              <div className="p-3 rounded-2xl bg-red-600/10 border border-red-500/30 text-xs text-red-700 flex items-center space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{b2bReportError}</span>
              </div>
            )}

            {b2bReportLoading && !b2bReport ? (
              <div className="p-6 rounded-2xl bg-card/60 border border-border/60 flex flex-col items-center justify-center space-y-3 text-center">
                <Bot className="w-7 h-7 text-violet-500 animate-pulse" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Recommendation agent is aggregating cohort data and generating the report…
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Runs the local muse-glimmer LLM — this can take a few minutes. The deterministic
                  agent fallback renders instantly if the LLM is unavailable.
                </p>
              </div>
            ) : b2bReport ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-violet-500" />
                      AI Summary
                    </span>
                    <span
                      className={`flex items-center space-x-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        b2bReport.llmGenerated
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                      }`}
                    >
                      {b2bReport.llmGenerated ? (
                        <><Sparkles className="w-3 h-3" /> LLM generated</>
                      ) : (
                        <><Info className="w-3 h-3" /> deterministic fallback</>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed font-medium">{b2bReport.summary}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-5 space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Fleet Insights</h3>
                    <div className="space-y-2">
                      {b2bReport.insights.map((insight, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-card border border-border/70 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="lg:col-span-7 space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Merchant Recommendations</h3>
                    <div className="space-y-2">
                      {b2bReport.recommendations.map((rec, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-extrabold text-foreground leading-snug flex items-start gap-1.5">
                              <Bot className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                              {rec.title}
                            </h4>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                                rec.priority === "high"
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30"
                                  : rec.priority === "medium"
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30"
                                    : "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30"
                              }`}
                            >
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
                      ))}
                    </div>
                  </div>
                </div>

                {b2bReport.inventoryAdvice && (
                  <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/25 text-xs text-foreground/90 leading-relaxed">
                    <span className="font-extrabold uppercase text-[10px] text-violet-600 dark:text-violet-300">Inventory advice · </span>
                    {b2bReport.inventoryAdvice}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 10: Master Data & Physics Configurator */}
      {activeTab === "config" && masterConfig && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span>Fabric Friction Coefficients & Allergen Master Data</span>
            </h2>

            <div className="space-y-2.5">
              {masterConfig.materialFrictionCoefficients?.map((mat: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-secondary/30 border border-border/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-foreground">{mat.material}</span>
                      <span className="text-[10px] text-muted-foreground">({mat.category})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Breathability: {(mat.breathabilityIndex * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-right">
                    <span className="font-mono font-bold text-foreground">Friction: {mat.frictionIndex}</span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        mat.skinSafeStatus === "OPTIMAL"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {mat.skinSafeStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddMaterial} className="pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="New Material (e.g. Bamboo Rayon)"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="Friction (0.0-1.0)"
                value={newMaterialFriction}
                onChange={(e) => setNewMaterialFriction(parseFloat(e.target.value))}
                className="w-32 px-3.5 py-2 rounded-xl border border-border bg-background text-xs text-foreground"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Material</span>
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
