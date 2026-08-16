from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any
from datetime import datetime

# Garment schema
class GarmentPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    sku: str
    name: str
    colorHex: str = Field(..., alias="colorHex")
    materials: Dict[str, float]
    category: str = "tops"
    brand: Optional[str] = "VeraFit Collection"
    price: Optional[float] = 95.0
    imageUrl: Optional[str] = None
    formalityIndex: Optional[float] = 0.0

class ContextPayload(BaseModel):
    moodSlider: float = 0.0  # -1.0 to 1.0
    eventContext: Optional[str] = "everyday_casual"

# Request to /api/v1/analyze/keep-probability
class KeepProbabilityRequest(BaseModel):
    userId: str
    userImageB64: Optional[str] = None
    garment: GarmentPayload
    context: Optional[ContextPayload] = None

# Request to /api/v1/analyze/run (frontend studio, resolves garment by SKU)
class KeepProbabilityRunRequest(BaseModel):
    userId: str
    garmentSku: str
    moodModifier: Optional[float] = 0.0
    userImageB64: Optional[str] = None

class KeepScores(BaseModel):
    fitRepeatability: float
    colorHarmony: float
    fabricSafety: float

class DiagnosticsData(BaseModel):
    colorSeason: str
    colorMatchReason: str
    garmentLab: Optional[List[float]] = None
    seasonPaletteHex: Optional[List[str]] = None
    fabricWarnings: List[str]
    ssimVariance: float
    pairwiseSsim: Optional[List[float]] = None
    diffHeatmapB64: Optional[str] = None
    allergyDetected: bool = False
    moodDeltaApplied: float = 0.0

class KeepProbabilityResponseData(BaseModel):
    sessionId: str
    keepProbability: float
    verdict: str  # STRONG_BUY, CONSIDER_CAUTION, HIGH_RETURN_RISK
    scores: KeepScores
    bestVtoRenderUrl: str
    allVtoRenders: List[str] = []
    diagnostics: DiagnosticsData
    aiExplanation: str

class KeepProbabilityResponse(BaseModel):
    status: str = "success"
    data: KeepProbabilityResponseData

# Feedback request & response
class FeedbackRecordRequest(BaseModel):
    userId: str
    sessionId: str
    action: str  # KEPT, RETURNED, ABANDONED_CART
    reason: Optional[str] = None  # FIT_TOO_TIGHT, FABRIC_ITCHY, COLOR_UNFLATTERING, POOR_QUALITY
    details: Optional[str] = None

class FeedbackRecordResponse(BaseModel):
    status: str = "success"
    message: str
    updatedBias: Dict[str, Any]

class PurchaseItemRequest(BaseModel):
    userId: str
    garmentSku: str
    sessionId: Optional[str] = None
    garmentName: Optional[str] = None
    price: Optional[float] = 89.0
    notes: Optional[str] = None

class PurchaseItemResponse(BaseModel):
    status: str = "success"
    message: str
    sessionId: str
    actionTaken: str = "KEPT"
    orderId: str

class ReturnItemRequest(BaseModel):
    userId: str
    sessionId: str
    reason: Optional[str] = "FABRIC_ITCHY"  # FIT_TOO_TIGHT, FABRIC_ITCHY, COLOR_UNFLATTERING, POOR_QUALITY
    details: Optional[str] = None

class ReturnItemResponse(BaseModel):
    status: str = "success"
    message: str
    sessionId: str
    actionTaken: str = "RETURNED"
    returnReason: Optional[str] = None
    updatedBias: Dict[str, Any] = {}

# Automated Color Reasoning Schemas
class ColorReasoningStep(BaseModel):
    stage: str
    finding: str
    metric: str
    verdict: str

class AutomatedColorAnalysisResponse(BaseModel):
    assignedSeason: str
    skinUndertone: str
    skinToneHex: str
    cielabCoordinates: Dict[str, float]
    contrastRatio: float
    confidenceScore: float
    reasoningSteps: List[ColorReasoningStep]
    recommendedPalette: List[str]
    clashPalette: List[str]
    clinicalSummary: str
    inputParameters: Dict[str, Any] = {}

# Mannequin schemas
class MannequinAnalyzeRequest(BaseModel):
    userId: str
    selfieImageB64: Optional[str] = None
    allergies: Optional[List[str]] = None
    preferredFit: Optional[str] = "regular"

class MannequinProfile(BaseModel):
    id: str
    userId: str
    basePhotoUrl: str
    colorSeason: str
    skinUndertone: str
    skinToneHex: str
    detectedConcerns: Dict[str, Any]
    bodyType: Optional[str] = "Balanced"
    allergies: List[str] = []
    preferredFit: str = "regular"
    comfortVsStyleBias: float = 0.5
    colorReasoning: Optional[AutomatedColorAnalysisResponse] = None

class HistoryItemResponse(BaseModel):
    id: str
    sessionId: str
    userId: Optional[str] = None
    garmentSku: str
    garmentName: str
    garmentColorHex: str
    garmentMaterial: Dict[str, float]
    renderedVtoUrl: str
    fitRepeatabilityScore: float
    colorHarmonyScore: float
    fabricSafetyScore: float
    keepProbabilityScore: float
    verdict: str
    aiExplanation: str
    createdAt: datetime
    actionTaken: Optional[str] = None
    returnReason: Optional[str] = None

# B2B Merchant Fleet Analytics Schemas
class ReasonDistribution(BaseModel):
    reason: str
    count: int
    percentage: float
    description: str

class SkuReturnRisk(BaseModel):
    sku: str
    name: str
    totalTryOns: int
    keepRate: float
    returnRiskLevel: str  # LOW, MODERATE, HIGH
    primaryReturnDriver: str

class MerchantAnalyticsResponse(BaseModel):
    totalSessionsAnalyzed: int
    fleetAverageKeepProbability: float
    estimatedReturnRateReductionPct: float
    savedReturnCostDollars: float
    returnReasonBreakdown: List[ReasonDistribution]
    highRiskSkus: List[SkuReturnRisk]
    agentReliabilityIndex: float

# Purchase History Learnings Schemas
class PurchaseLearningItem(BaseModel):
    category: str          # "fit" | "fabric" | "color" | "behavior"
    signal: str
    insight: str
    evidence: str
    impact: float          # -10.0 .. +10.0

class PurchaseRecommendation(BaseModel):
    title: str
    detail: str
    action: str

class FiberAffinity(BaseModel):
    fiber: str
    kept: int
    returned: int
    total: int
    avgKeepScore: float
    avgFabricSafety: float

class LearningsResponse(BaseModel):
    userId: str
    totalSessions: int
    keptCount: int
    returnedCount: int
    pendingCount: int
    averageKeepProbability: float
    keepRate: float
    returnRate: float
    fiberAffinities: List[FiberAffinity]
    learnings: List[PurchaseLearningItem]
    recommendations: List[PurchaseRecommendation]

# Garment compatibility (catalog filtering by skin/style/fabric)
class GarmentCompatibilityData(BaseModel):
    garment: GarmentPayload
    colorScore: float
    colorIndicator: str
    colorDiagnostic: str
    styleScore: float
    fabricScore: float
    verdict: str  # "compatible" | "excluded"
    reasons: List[str] = []

class GarmentCompatibilityResponse(BaseModel):
    status: str = "success"
    colorSeason: str
    preferredFit: str
    allergies: List[str] = []
    compatibleCount: int
    excludedCount: int
    results: List[GarmentCompatibilityData]

# AI Recommendation reports (LangGraph recommendation agent)
class AiRecommendationItem(BaseModel):
    title: str
    detail: str
    priority: str = "medium"  # "high" | "medium" | "low"
    action: Optional[str] = None
    skus: List[str] = []

class ProfileReportResponse(BaseModel):
    status: str = "success"
    userId: str
    llmGenerated: bool
    summary: str
    profileInsights: List[str] = []
    recommendations: List[AiRecommendationItem] = []
    catalogAdvice: str = ""
    agentDigest: Dict[str, Any] = {}

class B2BReportResponse(BaseModel):
    status: str = "success"
    vendorId: str
    llmGenerated: bool
    summary: str
    insights: List[str] = []
    recommendations: List[AiRecommendationItem] = []
    inventoryAdvice: str = ""
    agentDigest: Dict[str, Any] = {}
