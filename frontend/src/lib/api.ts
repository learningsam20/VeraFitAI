export interface Garment {
  sku: string;
  name: string;
  category: "tops" | "bottoms" | "dresses" | "outerwear" | "shoes";
  colorHex: string;
  materials: { [fiber: string]: number };
  price: number;
  imageUrl: string;
  formalityIndex: number;
  brand?: string;
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail) && body.detail.length > 0) {
      const first = body.detail[0];
      if (first?.msg) return first.msg;
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}

export interface KeepScores {
  ssimScore: number;
  colorHarmonyScore: number;
  fabricAllergyScore: number;
  contextMatchScore: number;
  fitRepeatability?: number;
  colorHarmony?: number;
  fabricSafety?: number;
}

export interface DiagnosticsData {
  ssimVariance?: number;
  deltaE?: number;
  skinToneMatch?: string;
  allergyAlerts?: string[];
  allergyDetected?: boolean;
  fabricWarnings?: string[];
  colorSeason?: string;
  frictionWarning?: string | null;
  agendaFit?: string;
  [key: string]: any;
}

export interface KeepProbabilityResult {
  sessionId: string;
  keepProbabilityScore: number;
  verdict: "STRONG_KEEP" | "LEAN_KEEP" | "HIGH_RETURN_RISK";
  scores: KeepScores;
  diagnostics: DiagnosticsData;
  renderedVtoImages: string[];
  ssimHeatmapUrl: string;
  aiExplanation: string;
  explanation?: string;
}

function normalizeKeepProbabilityResult(raw: any): KeepProbabilityResult {
  const data = raw?.data ?? raw ?? {};
  const backendScores = data.scores ?? {};
  const fit = backendScores.fitRepeatability ?? backendScores.ssimScore ?? 0;
  const color = backendScores.colorHarmony ?? backendScores.colorHarmonyScore ?? 0;
  const fabric = backendScores.fabricSafety ?? backendScores.fabricAllergyScore ?? 0;
  const rawVerdict: string = data.verdict ?? "CONSIDER_CAUTION";
  const verdict =
    rawVerdict === "STRONG_BUY"
      ? "STRONG_KEEP"
      : rawVerdict === "CONSIDER_CAUTION"
        ? "LEAN_KEEP"
        : "HIGH_RETURN_RISK";
  const diagnostics: DiagnosticsData = { ...(data.diagnostics ?? {}) };
  return {
    sessionId: data.sessionId ?? "",
    keepProbabilityScore: data.keepProbability ?? data.keepProbabilityScore ?? 0,
    verdict,
    scores: {
      ssimScore: fit,
      colorHarmonyScore: color,
      fabricAllergyScore: fabric,
      contextMatchScore: Math.round((fit * 0.45 + color * 0.3 + fabric * 0.25) * 100) / 100,
      fitRepeatability: fit,
      colorHarmony: color,
      fabricSafety: fabric,
    },
    diagnostics,
    renderedVtoImages: data.allVtoRenders ?? [],
    ssimHeatmapUrl: diagnostics.diffHeatmapB64 ?? data.bestVtoRenderUrl ?? "",
    aiExplanation: data.aiExplanation ?? "",
  };
}

export interface ColorReasoningData {
  skinToneHex: string;
  detectedSeason: string;
  assignedSeason: string;
  skinUndertone?: string;
  clinicalSummary?: string;
  confidenceScore: number;
  reasoningSteps?: { stage: string; verdict: string; finding: string; metric: string }[];
  recommendedPalette?: string[];
  clashPalette?: string[];
  cielabCoordinates?: { L: number; a: number; b: number };
  contrastRatio?: number;
  inputParameters?: {
    skinToneHex?: string;
    cielab?: { L: number; a: number; b: number };
    skinUndertone?: string;
    contrastRatio?: number;
    rosaceaIndex?: number;
    sensitivityIndex?: number;
    bodyType?: string;
    preferredFit?: string;
    fitContrastModifier?: number;
    comfortVsStyleBias?: number;
    allergies?: string[];
    allergyChromaTolerance?: number;
  };
  chromaticReasoning?: {
    undertone: string;
    contrastLevel: string;
    luminanceRating: string;
    dermatologicalObservation: string;
  };
  paletteRecommendations?: {
    harmoniousHues: { name: string; hex: string; role: string; deltaEAdvantage: string }[];
    clashRiskHues: { name: string; hex: string; riskType: string; whyClashes: string }[];
  };
  silhouetteAndFabricBias?: {
    recommendedFit: string;
    avoidSilhouettes: string[];
    fabricPreferences: string[];
    fabricAllergens: string[];
  };
}

export interface MannequinProfile {
  userId: string;
  heightCm: number;
  weightKg: number;
  bustCm: number;
  waistCm: number;
  hipsCm: number;
  skinToneHex: string;
  skinUndertone?: string;
  bodyType?: string;
  detectedSeason?: string;
  colorSeason?: string;
  selfieUrl?: string;
  basePhotoUrl?: string;
  blendMode?: string;
  allergies?: string[];
  preferredFit?: string;
  comfortVsStyleBias?: number;
  detectedConcerns?: {
    rosacea?: number;
    acne?: number;
    oiliness?: number;
    sensitivity?: number;
  };
  colorReasoning?: ColorReasoningData;
  isCalibrated: boolean;
}

export interface HistoryItem {
  id: string;
  sessionId: string;
  timestamp: string;
  createdAt: string;
  garmentSku: string;
  garmentName: string;
  garmentImg: string;
  garmentColorHex?: string;
  price: number;
  keepProbabilityScore: number;
  verdict: "STRONG_KEEP" | "LEAN_KEEP" | "HIGH_RETURN_RISK";
  scores: {
    ssimScore: number;
    colorHarmonyScore: number;
    fabricAllergyScore: number;
    contextMatchScore: number;
  };
  renderedVtoImages: string[];
  renderedVtoUrl?: string;
  ssimHeatmapUrl: string;
  aiExplanation?: string;
  actionTaken?: "KEPT" | "RETURNED" | null;
  returnReason?: string;
  feedback?: {
    actionTaken: "KEPT" | "RETURNED";
    userRating?: number;
    returnReasonCategory?: string;
    userNotes?: string;
  };
}

export interface MerchantAnalytics {
  totalSessionsAnalyzed: number;
  fleetAverageKeepProbability: number;
  estimatedReturnRateReductionPct: number;
  savedReturnCostDollars: number;
  agentReliabilityIndex: number;
  returnReasonBreakdown: {
    reason: string;
    count: number;
    percentage: number;
    description: string;
  }[];
  highRiskSkus: {
    sku: string;
    name: string;
    totalTryOns: number;
    keepRate: number;
    returnRiskLevel: string;
    primaryReturnDriver: string;
  }[];
}

export interface PurchaseLearningItem {
  category: "fit" | "fabric" | "color" | "behavior";
  signal: string;
  insight: string;
  evidence: string;
  impact: number;
}

export interface PurchaseRecommendation {
  title: string;
  detail: string;
  action: string;
}

export interface FiberAffinity {
  fiber: string;
  kept: number;
  returned: number;
  total: number;
  avgKeepScore: number;
  avgFabricSafety: number;
}

export interface LearningsData {
  userId: string;
  totalSessions: number;
  keptCount: number;
  returnedCount: number;
  pendingCount: number;
  averageKeepProbability: number;
  keepRate: number;
  returnRate: number;
  fiberAffinities: FiberAffinity[];
  learnings: PurchaseLearningItem[];
  recommendations: PurchaseRecommendation[];
}

export interface GarmentCompatibilityData {
  garment: Garment;
  colorScore: number;
  colorIndicator: string;
  colorDiagnostic: string;
  styleScore: number;
  fabricScore: number;
  verdict: "compatible" | "excluded";
  reasons: string[];
}

export interface GarmentCompatibilityResponse {
  status: string;
  colorSeason: string;
  preferredFit: string;
  allergies: string[];
  compatibleCount: number;
  excludedCount: number;
  results: GarmentCompatibilityData[];
}

export interface AiRecommendationItem {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  action?: string;
  skus?: string[];
}

export interface ProfileReportData {
  status: string;
  userId: string;
  llmGenerated: boolean;
  summary: string;
  profileInsights: string[];
  recommendations: AiRecommendationItem[];
  catalogAdvice: string;
  agentDigest: Record<string, any>;
}

export interface B2BReportData {
  status: string;
  vendorId: string;
  llmGenerated: boolean;
  summary: string;
  insights: string[];
  recommendations: AiRecommendationItem[];
  inventoryAdvice: string;
  agentDigest: Record<string, any>;
}

export interface AIEfficacyData {
  vendorId?: string;
  modelOverallAccuracy: number;
  keepProbabilityCorrelation: number;
  ssimVarianceAccuracy: number;
  colorHarmonyDeltaEPrecision: number;
  fabricSafetyAuditReliability: number;
  falsePositiveReturnRate: number;
  falseNegativeReturnRate: number;
  gapAnalysis: {
    subsystem: string;
    targetMetric: string;
    achievedScore: number;
    benchmark: number;
    gapStatus: string;
    rootCauseIdentified: string;
  }[];
  totalSimulationsRun: number;
  returnsPreventedCount: number;
  netMerchandiseValueSavedDollars: number;
  savedMerchandiseExplanation?: string;
}

export interface SupplierAnalyticsData {
  vendorId?: string;
  manufacturers: {
    name: string;
    vendorId?: string;
    suppliedSkus: string[];
    totalUnitsSold: number;
    returnRatePct: number;
    avgKeepScore: number;
    fabricQualityGrade: string;
    primaryReturnReason: string;
    status: string;
  }[];
  sellerPerformance: {
    sellerName: string;
    totalOrders: number;
    returnRatePct: number;
    customerSatisfaction: number;
  }[];
}

export interface InventoryAdviceData {
  vendorId?: string;
  customerBaseDemographics: {
    colorSeasons: { season: string; percentage: number; dominantPalette: string }[];
    sensitivities: { concern: string; affectedShoppersPct: number }[];
  };
  stockingRecommendations: {
    category: string;
    action: string;
    recommendedAdjustmentPct: number;
    colorTonesToPrioritize: string[];
    reasoning: string;
  }[];
}

export interface UserClusterData {
  vendorId?: string;
  vendorLabel?: string;
  fleetSize?: number;
  avgKeepScore?: number;
  fleetKeepRatePct?: number;
  clusters: {
    clusterId: string;
    name: string;
    sizePct: number;
    profile: string;
    preferredAesthetics: string;
    targetCampaign: string;
    suggestedSkus: string[];
    expectedConversionLift: string;
    expectedReturnRate: string;
    fleetKeepRatePct?: number;
    fleetReturnRatePct?: number;
  }[];
}

export interface Fleet7DayTrendData {
  weeklyDemandSummary: string;
  dailyFleetForecast: {
    day: string;
    date: string;
    dominantFleetAgenda: string;
    predictedTopCategory: string;
    projectedDemandSurgePct: number;
    weatherImpact: string;
    suggestedMerchandiseBanner: string;
  }[];
}

export interface RecentSessionAnalyticsData {
  timeWindowHours: number;
  vendorId?: string;
  summary: {
    totalSessions: number;
    totalPurchases: number;
    totalReturns: number;
    conversionRatePct: number;
    returnRatePct: number;
    estimatedRevenueDollars: number;
    avgKeepScore: number;
    activeShoppersNow: number;
  };
  hourlyTimeline: {
    hourLabel: string;
    timestamp: string;
    sessions: number;
    purchases: number;
    returns: number;
    conversionRatePct: number;
    avgKeepScore: number;
  }[];
  liveActivityStream: {
    id: string;
    action: "PURCHASED" | "RETURNED" | "TRY_ON_EVALUATED";
    sku: string;
    garmentName: string;
    userId: string;
    keepScore: number;
    price: number;
    timestamp: string;
    timeAgo: string;
    detail: string;
  }[];
}

export interface CohortAnalyticsData {
  vendorId?: string;
  computedAt: string;
  computedFromStoredData: boolean;
  overview: {
    totalUsers: number;
    profiledUsers: number;
    preferenceUsers: number;
    totalSessions: number;
    totalFeedback: number;
    totalKept: number;
    totalReturned: number;
    returnRatePct: number;
    totalRevenueDollars: number;
    avgKeepScore: number;
  };
  profileDistribution: {
    colorSeasons: { name: string; count: number; pct: number }[];
    skinUndertones: { name: string; count: number; pct: number }[];
    bodyTypes: { name: string; count: number; pct: number }[];
    avgSkinConcerns: Record<string, number>;
  };
  preferenceDistribution: {
    fitPreferences: { name: string; count: number; pct: number }[];
    avgComfortVsStyleBias: number | null;
    allergies: { allergen: string; count: number; pct: number }[];
  };
  purchaseBehavior: {
    topSkus: {
      sku: string;
      name: string;
      sessions: number;
      kept: number;
      returned: number;
      returnRatePct: number;
      avgKeepScore: number;
      revenueDollars: number;
    }[];
    returnReasons: { reason: string; count: number; pct: number }[];
    actions: { action: string; count: number; pct: number }[];
  };
  correlations: {
    returnRateBySeason: { season: string; sessions: number; returned: number; returnRatePct: number }[];
    returnRateBySensitivityBucket: {
      bucket: "high" | "medium" | "low";
      users: number;
      sessions: number;
      returned: number;
      returnRatePct: number;
    }[];
    returnRateByFitPreference: {
      fit: string;
      users: number;
      sessions: number;
      returned: number;
      returnRatePct: number;
    }[];
    returnRateByFiberFamily: {
      fiber: string;
      sessions: number;
      returned: number;
      returnRatePct: number;
      avgKeepScore: number;
    }[];
    woolAllergy: {
      woolAllergicSessions: number;
      woolAllergicReturnRatePct: number;
      nonWoolAllergicSessions: number;
      nonWoolAllergicReturnRatePct: number;
    };
  };
}

export interface InventoryClearanceItem {
  sku: string;
  name: string;
  vendorId: string;
  vendorName: string;
  category: string;
  inStockUnits: number;
  unitCost: number;
  retailPrice: number;
  aiKeepScore: number;
  aiClassification: "AI_KEEP" | "AI_NO_KEEP_RISK";
  primaryRiskFactor: string;
  recommendedAction: string;
  suggestedOffer: string;
  promoDiscountPct: number;
  promoApplied: boolean;
  lastAuditTimestamp?: string;
}

export interface InventoryClearanceAuditData {
  vendorId: string;
  filter: string;
  summary: {
    totalCatalogSkus: number;
    totalUnitsInStock: number;
    protectedKeepUnits: number;
    atRiskNoKeepUnits: number;
    projectedClearanceRevenue: number;
  };
  items: InventoryClearanceItem[];
}

export interface BatchAuditResult {
  status: string;
  message: string;
  executedAt: string;
  lastRunAt: string;
  atRiskSkusIdentified: number;
  marginSavedDollars: number;
}

export interface AgentAnalyticsData {
  vendorId: string;
  systemHealth: string;
  totalAgentInvocations: number;
  graphExecutionSuccessRate: number;
  avgGraphLatencyMs: number;
  cacheHitRatePct: number;
  activeEvaluatorAgents: {
    agentId: string;
    name: string;
    role: string;
    status: string;
    totalInvocations: number;
    avgLatencyMs: number;
    accuracyPct: number;
    keyMetricLabel: string;
    keyMetricValue: string;
    subsystemScore: number;
    nodeType: string;
  }[];
  dagPipelineStages: {
    stage: string;
    node: string;
    latencyMs: number;
    status: string;
  }[];
}

export interface PurchaseItemResult {
  status: string;
  message: string;
  sessionId: string;
  actionTaken: string;
  orderId: string;
}

const API_BASE = import.meta.env.NEXT_PUBLIC_API_URL || "http://localhost:5194/api/v1";

export const api = {
  async getGarments(userId?: string): Promise<Garment[]> {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const res = await fetch(`${API_BASE}/garments${qs}`);
    if (!res.ok) throw new Error("Failed to fetch garments");
    return res.json();
  },

  async addCustomGarment(garment: Garment): Promise<Garment> {
    const res = await fetch(`${API_BASE}/garments/custom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(garment),
    });
    if (!res.ok) throw new Error("Failed to add custom garment");
    return res.json();
  },

  async runTryOnAnalysis(payload: {
    userId: string;
    garmentSku: string;
    moodModifier?: number;
    userImageB64?: string;
  }): Promise<KeepProbabilityResult> {
    const res = await fetch(`${API_BASE}/analyze/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, "Failed to run try-on analysis"));
    return normalizeKeepProbabilityResult(await res.json());
  },

  async analyzeKeepProbability(payload: {
    userId: string;
    garment: Garment;
    context?: { moodSlider?: number };
    userImageB64?: string;
  }): Promise<KeepProbabilityResult> {
    const res = await fetch(`${API_BASE}/analyze/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: payload.userId,
        garmentSku: payload.garment.sku,
        moodModifier: payload.context?.moodSlider ?? 0.0,
        userImageB64: payload.userImageB64 ?? null,
      }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, "Failed to analyze keep probability"));
    return normalizeKeepProbabilityResult(await res.json());
  },

  async purchaseItem(payload: {
    userId: string;
    garmentSku: string;
    sessionId?: string;
    garmentName?: string;
    price?: number;
    notes?: string;
  }): Promise<PurchaseItemResult> {
    const res = await fetch(`${API_BASE}/feedback/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to complete purchase");
    return res.json();
  },

  async recordFeedback(payload: {
    userId: string;
    sessionId: string;
    action: "KEPT" | "RETURNED";
    reason?: string;
    details?: string;
  }) {
    const res = await fetch(`${API_BASE}/feedback/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to record feedback");
    return res.json();
  },

  async getMannequinProfile(userId = "usr_94b3a8c1"): Promise<MannequinProfile> {
    const res = await fetch(`${API_BASE}/mannequin/profile?userId=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch mannequin profile");
    return res.json();
  },

  async analyzeColorSeasonReasoning(userId: string, skinToneHex?: string): Promise<ColorReasoningData> {
    const res = await fetch(`${API_BASE}/mannequin/analyze-color-reasoning`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, skinToneHex }),
    });
    if (!res.ok) throw new Error("Color reasoning failed");
    return res.json();
  },

  async updateMannequinProfile(
    data: Partial<MannequinProfile> & { userId: string }
  ): Promise<{ status: string; message: string; colorReasoning?: ColorReasoningData }> {
    const res = await fetch(`${API_BASE}/mannequin/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update mannequin profile");
    return res.json();
  },

  async analyzeSelfie(userId: string, selfieImageB64: string, allergies?: string[], preferredFit?: string) {
    const res = await fetch(`${API_BASE}/mannequin/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, selfieImageB64, allergies, preferredFit }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, "Selfie analysis failed"));
    return res.json();
  },

  async getHistory(userId = "usr_94b3a8c1"): Promise<HistoryItem[]> {
    const query = userId ? `?userId=${userId}` : "";
    const res = await fetch(`${API_BASE}/history${query}`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
  },

  async getLearnings(userId = "usr_94b3a8c1"): Promise<LearningsData> {
    const res = await fetch(`${API_BASE}/insights/learnings?userId=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch purchase history learnings");
    return res.json();
  },

  async getGarmentCompatibility(userId = "usr_94b3a8c1"): Promise<GarmentCompatibilityResponse> {
    const res = await fetch(`${API_BASE}/garments/compatibility?userId=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch garment compatibility");
    return res.json();
  },

  async getProfileReport(userId = "usr_94b3a8c1"): Promise<ProfileReportData> {
    const res = await fetch(`${API_BASE}/insights/profile-report?userId=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch AI profile report");
    return res.json();
  },

  async getB2BReport(vendorId?: string): Promise<B2BReportData> {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    const res = await fetch(`${API_BASE}/admin/b2b-report${query}`);
    if (!res.ok) throw new Error("Failed to fetch B2B AI report");
    return res.json();
  },

  async getMerchantAnalytics(): Promise<MerchantAnalytics> {
    const res = await fetch(`${API_BASE}/history/admin-analytics`);
    if (!res.ok) throw new Error("Failed to fetch merchant fleet analytics");
    return res.json();
  },

  // B2B Merchant Suite Endpoints with Vendor Filtering
  async getAIEfficacyMatrix(vendorId?: string): Promise<AIEfficacyData & { savedMerchandiseExplanation?: string }> {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    const res = await fetch(`${API_BASE}/admin/ai-efficacy${query}`);
    if (!res.ok) throw new Error("Failed to fetch AI efficacy data");
    return res.json();
  },

  async getSupplierAnalytics(vendorId?: string): Promise<SupplierAnalyticsData> {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    const res = await fetch(`${API_BASE}/admin/supplier-analytics${query}`);
    if (!res.ok) throw new Error("Failed to fetch supplier analytics");
    return res.json();
  },

  async getRecentSessionAnalytics(hours = 6, vendorId?: string): Promise<RecentSessionAnalyticsData> {
    const params = new URLSearchParams({ hours: String(hours) });
    if (vendorId) params.append("vendorId", vendorId);
    const res = await fetch(`${API_BASE}/admin/recent-session-analytics?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch recent session analytics");
    return res.json();
  },

  async getCohortAnalytics(vendorId?: string): Promise<CohortAnalyticsData> {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    const res = await fetch(`${API_BASE}/admin/cohort-analytics${query}`);
    if (!res.ok) throw new Error("Failed to fetch cohort analytics");
    return res.json();
  },

  async getInventoryAdvice(vendorId?: string): Promise<InventoryAdviceData> {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    const res = await fetch(`${API_BASE}/admin/inventory-advice${query}`);
    if (!res.ok) throw new Error("Failed to fetch inventory advice");
    return res.json();
  },

  async getInventoryClearanceAudit(vendorId?: string, filter = "all"): Promise<InventoryClearanceAuditData> {
    const params = new URLSearchParams({ filter });
    if (vendorId) params.append("vendorId", vendorId);
    const res = await fetch(`${API_BASE}/admin/inventory-clearance-audit?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch inventory clearance audit");
    return res.json();
  },

  async applyClearanceOffer(sku: string, discountPct = 35): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/apply-clearance-offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, discountPct }),
    });
    if (!res.ok) throw new Error("Failed to apply clearance offer");
    return res.json();
  },

  async runBatchInventoryAudit(vendorId?: string): Promise<BatchAuditResult> {
    const res = await fetch(`${API_BASE}/admin/run-batch-inventory-audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId }),
    });
    if (!res.ok) throw new Error("Failed to run batch inventory audit");
    return res.json();
  },

  async getAgentAnalytics(vendorId?: string): Promise<AgentAnalyticsData> {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    const res = await fetch(`${API_BASE}/admin/agent-analytics${query}`);
    if (!res.ok) throw new Error("Failed to fetch agent analytics");
    return res.json();
  },

  async getUserClusters(vendorId?: string): Promise<UserClusterData> {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    const res = await fetch(`${API_BASE}/admin/clusters${query}`);
    if (!res.ok) throw new Error("Failed to fetch user clusters");
    return res.json();
  },

  async getFleet7DayTrends(vendorId?: string): Promise<Fleet7DayTrendData> {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    const res = await fetch(`${API_BASE}/admin/fleet-7day-trends${query}`);
    if (!res.ok) throw new Error("Failed to fetch fleet 7-day trends");
    return res.json();
  },

  async getMasterDataConfig(vendorId?: string): Promise<any> {
    const query = vendorId ? `?vendorId=${vendorId}` : "";
    const res = await fetch(`${API_BASE}/admin/master-data${query}`);
    if (!res.ok) throw new Error("Failed to fetch master data config");
    return res.json();
  },

  async addMasterDataMaterial(material: any) {
    const res = await fetch(`${API_BASE}/admin/master-data/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(material),
    });
    if (!res.ok) throw new Error("Failed to add material to master data");
    return res.json();
  },
};
