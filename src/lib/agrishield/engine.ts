import { actionRules } from "./data";
import type {
  ActionItem,
  CropStage,
  HazardRisk,
  HazardType,
  RiskAssessment,
  Severity,
  Zone,
} from "./types";

const severityRank: Record<Severity, number> = {
  low: 0,
  guarded: 1,
  high: 2,
  severe: 3,
};

const urgencyRank = {
  now: 0,
  "24h": 1,
  "48h": 2,
  "72h": 3,
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function exposureValue(level: Zone["exposure"]["floodplain"]) {
  if (level === "high") return 1;
  if (level === "medium") return 0.62;
  return 0.28;
}

export function severityFromScore(score: number): Severity {
  if (score >= 85) return "severe";
  if (score >= 65) return "high";
  if (score >= 40) return "guarded";
  return "low";
}

export function severityLabel(severity: Severity) {
  const labels: Record<Severity, string> = {
    low: "Low",
    guarded: "Guarded",
    high: "High",
    severe: "Severe",
  };
  return labels[severity];
}

export function severityTone(severity: Severity) {
  const tones: Record<Severity, string> = {
    low: "bg-emerald-100 text-emerald-900 border-emerald-200",
    guarded: "bg-amber-100 text-amber-950 border-amber-200",
    high: "bg-orange-100 text-orange-950 border-orange-200",
    severe: "bg-rose-100 text-rose-950 border-rose-200",
  };
  return tones[severity];
}

export function scoreTone(score: number) {
  const severity = severityFromScore(score);

  if (severity === "severe") return "bg-rose-600";
  if (severity === "high") return "bg-orange-500";
  if (severity === "guarded") return "bg-amber-500";
  return "bg-emerald-500";
}

function buildRainRisk(zone: Zone): HazardRisk {
  const signals = zone.currentSignals;
  const exposure = zone.exposure;
  const rainLoad = clamp(signals.forecastRain72hMm / 260, 0, 1);
  const anomalyLoad = clamp(signals.rainfallAnomalyPct / 90, 0, 1);
  const saturationLoad = clamp(signals.soilSaturationPct / 95, 0, 1);
  const exposureLoad =
    exposureValue(exposure.floodplain) * 0.7 + exposureValue(exposure.drainage) * 0.3;

  const score = Math.round(
    clamp(
      100 *
        (rainLoad * 0.38 +
          anomalyLoad * 0.2 +
          saturationLoad * 0.22 +
          exposureLoad * 0.2),
    ),
  );

  return {
    hazard: "heavy-rain-flood",
    label: "Heavy rain / flood",
    score,
    severity: severityFromScore(score),
    leadTimeHours: signals.leadTimeHours,
    drivers: [
      `${signals.forecastRain72hMm} mm forecast rain in 72h`,
      `${signals.rainfallAnomalyPct}% above local wet-season baseline`,
      `${signals.soilSaturationPct}% soil saturation proxy`,
      `${exposure.floodplain} floodplain exposure, ${exposure.drainage} drainage stress`,
    ],
  };
}

function buildTyphoonRisk(zone: Zone): HazardRisk {
  const signals = zone.currentSignals;
  const exposure = zone.exposure;
  const windLoad = clamp(signals.stormWindKmh / 150, 0, 1);
  const distanceLoad = clamp(1 - signals.stormDistanceKm / 360, 0, 1);
  const leadTimeLoad = clamp(1 - Math.max(signals.leadTimeHours - 24, 0) / 96, 0.22, 1);
  const exposureLoad = exposureValue(exposure.coastalWind);

  const score = Math.round(
    clamp(
      100 *
        (windLoad * 0.36 +
          distanceLoad * 0.3 +
          leadTimeLoad * 0.14 +
          exposureLoad * 0.2),
    ),
  );

  return {
    hazard: "typhoon",
    label: "Typhoon wind / track",
    score,
    severity: severityFromScore(score),
    leadTimeHours: signals.leadTimeHours,
    drivers: [
      `${signals.stormWindKmh} km/h forecast wind proxy`,
      `${signals.stormDistanceKm} km from current storm track`,
      `${signals.leadTimeHours}h lead time to action window`,
      `${exposure.coastalWind} coastal wind exposure`,
    ],
  };
}

export function assessZone(zone: Zone): RiskAssessment {
  const hazards = [buildRainRisk(zone), buildTyphoonRisk(zone)];
  const primary = Math.max(...hazards.map((hazard) => hazard.score));
  const secondary = Math.min(...hazards.map((hazard) => hazard.score));
  const compositeScore = Math.round(clamp(primary * 0.72 + secondary * 0.28));
  const severity = severityFromScore(compositeScore);

  return {
    zone,
    compositeScore,
    severity,
    hazards,
    explanation: [
      `Composite score uses weighted-max aggregation: strongest hazard carries 72%, secondary hazard carries 28%.`,
      `${zone.shortName} is treated as an advisory zone, not an official district-level government unit.`,
      `Current pilot signals are static demo inputs for ${zone.currentAdmin}; production would replace them with official forecast and hydromet feeds.`,
    ],
    confidenceNotes: [
      "Rule-based indicator for decision support, not a replacement for official warnings.",
      "No commune or village precision is claimed in v1.",
      "Scores are transparent and adjustable as better local data becomes available.",
    ],
  };
}

export function getHazardRisk(
  assessment: RiskAssessment,
  hazard: HazardType,
): HazardRisk {
  const found = assessment.hazards.find((item) => item.hazard === hazard);

  if (!found) {
    throw new Error(`Missing hazard risk: ${hazard}`);
  }

  return found;
}

function ruleMatchesSeverity(ruleMinSeverity: Severity, actualSeverity: Severity) {
  return severityRank[actualSeverity] >= severityRank[ruleMinSeverity];
}

function ruleMatchesStage(ruleStages: CropStage[] | "all", stage: CropStage) {
  return ruleStages === "all" || ruleStages.includes(stage);
}

export function generateActions(
  assessment: RiskAssessment,
  stage: CropStage,
  maxItems = 5,
): ActionItem[] {
  const hazardSeverity = new Map<HazardType | "composite", Severity>([
    ["composite", assessment.severity],
    ["heavy-rain-flood", getHazardRisk(assessment, "heavy-rain-flood").severity],
    ["typhoon", getHazardRisk(assessment, "typhoon").severity],
  ]);

  return actionRules
    .filter((rule) => ruleMatchesStage(rule.stages, stage))
    .filter((rule) => {
      const actualSeverity = hazardSeverity.get(rule.hazard);
      return actualSeverity ? ruleMatchesSeverity(rule.minSeverity, actualSeverity) : false;
    })
    .sort((a, b) => {
      const urgencyDelta = urgencyRank[a.urgency] - urgencyRank[b.urgency];
      if (urgencyDelta !== 0) return urgencyDelta;
      return b.priority - a.priority;
    })
    .slice(0, maxItems)
    .map((rule) => ({
      id: rule.id,
      urgency: rule.urgency,
      priority: rule.priority,
      action: rule.action,
      actionVi: rule.actionVi,
      rationale: rule.rationale,
      matchedHazard: rule.hazard,
    }));
}

export function buildVietnameseAlert(
  assessment: RiskAssessment,
  stageLabel: string,
  actions: ActionItem[],
) {
  const topActions = actions
    .slice(0, 3)
    .map((action, index) => `${index + 1}. ${action.actionVi}`)
    .join("\n");

  return [
    "[AGRISHIELD DEMO]",
    `Khu vực: ${assessment.zone.shortName} (${assessment.zone.currentAdmin})`,
    `Mức rủi ro: ${severityLabel(assessment.severity)} - ${assessment.compositeScore}/100`,
    `Lúa: ${stageLabel}`,
    "Trong 24-72 giờ tới, ưu tiên:",
    topActions,
    "Lưu ý: Đây là chỉ báo hỗ trợ quyết định, không thay thế cảnh báo chính thức.",
  ].join("\n");
}
