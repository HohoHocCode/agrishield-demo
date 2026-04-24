export type HazardType = "heavy-rain-flood" | "typhoon";

export type Severity = "low" | "guarded" | "high" | "severe";

export type Urgency = "now" | "24h" | "48h" | "72h";

export type CropStage =
  | "seedling"
  | "tillering"
  | "heading"
  | "grain-filling"
  | "ripening";

export type ExposureLevel = "low" | "medium" | "high";

export interface Zone {
  id: string;
  name: string;
  shortName: string;
  currentAdmin: string;
  legacyAdmin: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  map: {
    x: number;
    y: number;
  };
  cropProfile: {
    riceAreaHa: number;
    dominantSeason: string;
    irrigation: string;
    advisoryNote: string;
  };
  exposure: {
    floodplain: ExposureLevel;
    coastalWind: ExposureLevel;
    drainage: ExposureLevel;
    elevationBand: string;
  };
  currentSignals: {
    forecastRain72hMm: number;
    rainfallAnomalyPct: number;
    soilSaturationPct: number;
    stormDistanceKm: number;
    stormWindKmh: number;
    leadTimeHours: number;
  };
}

export interface HazardRisk {
  hazard: HazardType;
  label: string;
  score: number;
  severity: Severity;
  leadTimeHours: number;
  drivers: string[];
}

export interface RiskAssessment {
  zone: Zone;
  compositeScore: number;
  severity: Severity;
  hazards: HazardRisk[];
  explanation: string[];
  confidenceNotes: string[];
}

export interface CropStageOption {
  id: CropStage;
  label: string;
  shortLabel: string;
  description: string;
}

export interface ActionRule {
  id: string;
  hazard: HazardType | "composite";
  minSeverity: Severity;
  stages: CropStage[] | "all";
  urgency: Urgency;
  priority: number;
  action: string;
  actionVi: string;
  rationale: string;
}

export interface ActionItem {
  id: string;
  urgency: Urgency;
  priority: number;
  action: string;
  actionVi: string;
  rationale: string;
  matchedHazard: HazardType | "composite";
}

export interface ReplayFrame {
  id: string;
  label: string;
  timestamp: string;
  headline: string;
  narrative: string;
  stormPosition: {
    label: string;
    x: number;
    y: number;
  };
  zoneScores: Record<string, number>;
}
