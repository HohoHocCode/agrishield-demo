"use client";

import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  CloudRain,
  Copy,
  Gauge,
  MapPinned,
  Radio,
  ShieldCheck,
  Sprout,
  Timer,
  Waves,
  Wheat,
  Wind,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cropStages, replayFrames, zones } from "@/lib/agrishield/data";
import {
  assessZone,
  buildVietnameseAlert,
  generateActions,
  scoreTone,
  severityLabel,
  severityTone,
} from "@/lib/agrishield/engine";
import {
  modelPredictionByZoneId,
  modelSnapshot,
  modelTrainingMetrics,
} from "@/lib/agrishield/model-snapshot";
import type { CropStage, HazardRisk, ReplayFrame, Severity, Zone } from "@/lib/agrishield/types";

const numberFormatter = new Intl.NumberFormat("en-US");

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function severityRing(severity: Severity) {
  const rings: Record<Severity, string> = {
    low: "ring-emerald-300",
    guarded: "ring-amber-300",
    high: "ring-orange-300",
    severe: "ring-rose-300",
  };

  return rings[severity];
}

function severityFill(severity: Severity) {
  const fills: Record<Severity, string> = {
    low: "bg-emerald-500",
    guarded: "bg-amber-500",
    high: "bg-orange-500",
    severe: "bg-rose-600",
  };

  return fills[severity];
}

function urgencyLabel(urgency: string) {
  const labels: Record<string, string> = {
    now: "Now",
    "24h": "24h",
    "48h": "48h",
    "72h": "72h",
  };

  return labels[urgency] ?? urgency;
}

function CropIcon({ stage }: { stage: CropStage }) {
  if (stage === "seedling") return <Sprout className="h-4 w-4" />;
  if (stage === "ripening") return <Wheat className="h-4 w-4" />;
  return <Waves className="h-4 w-4" />;
}

function ScorePill({ severity, score }: { severity: Severity; score: number }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
        severityTone(severity),
      )}
    >
      <span>{severityLabel(severity)}</span>
      <span className="font-mono">{score}</span>
    </span>
  );
}

function MetricStrip({ selectedZone }: { selectedZone: Zone }) {
  const metrics = [
    {
      label: "Rice profile",
      value: `${numberFormatter.format(selectedZone.cropProfile.riceAreaHa)} ha`,
      sub: selectedZone.cropProfile.dominantSeason,
      icon: Wheat,
    },
    {
      label: "Admin context",
      value: selectedZone.currentAdmin,
      sub: selectedZone.legacyAdmin,
      icon: MapPinned,
    },
    {
      label: "Claim boundary",
      value: "Advisory-zone scale",
      sub: "No village-level precision claim",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <div
            className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
            key={metric.label}
          >
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-emerald-100 p-2 text-emerald-800">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-stone-500">{metric.label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-stone-950">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-stone-600">{metric.sub}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RiskMap({
  selectedZoneId,
  onSelectZone,
}: {
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
}) {
  const assessments = useMemo(
    () => new Map(zones.map((zone) => [zone.id, assessZone(zone)])),
    [],
  );

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Current risk map</p>
          <h2 className="text-xl font-semibold text-stone-950">Central Vietnam pilot</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700">
          <Radio className="h-4 w-4 text-emerald-700" />
          Static demo signals
        </span>
      </div>

      <div
        className="relative aspect-[4/3] min-h-[360px] overflow-hidden rounded-lg border border-stone-300 bg-[#edf2e8]"
        data-testid="risk-map"
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <rect fill="#edf2e8" height="100" width="100" />
          <path
            d="M6 0 H92 C86 12 85 18 92 31 C98 42 91 51 96 63 C101 76 93 88 100 100 H6 Z"
            fill="#f8faf4"
          />
          <path
            d="M71 0 C68 14 77 23 72 34 C67 45 74 54 70 67 C67 78 75 88 73 100"
            fill="none"
            stroke="#2f8db9"
            strokeDasharray="2 2"
            strokeWidth="1.6"
          />
          <path
            d="M16 6 C24 18 28 24 35 37 C42 50 48 58 57 69"
            fill="none"
            stroke="#67a7c9"
            strokeWidth="1.3"
          />
          <path
            d="M24 32 C32 37 42 38 52 44 C61 49 66 58 74 63"
            fill="none"
            stroke="#67a7c9"
            strokeWidth="1.2"
          />
          <path
            d="M7 99 H99 V75 C91 76 84 80 77 86 C66 96 53 96 42 91 C29 85 20 87 7 99Z"
            fill="#dde7d5"
          />
          <text fill="#59715d" fontSize="4" fontWeight="700" x="12" y="15">
            HUE CITY
          </text>
          <text fill="#59715d" fontSize="4" fontWeight="700" x="45" y="71">
            DA NANG CITY
          </text>
          <text fill="#2f6f8c" fontSize="3.2" fontWeight="700" x="76" y="29">
            Coast
          </text>
        </svg>

        {zones.map((zone) => {
          const assessment = assessments.get(zone.id);
          if (!assessment) return null;
          const selected = zone.id === selectedZoneId;

          return (
            <button
              aria-label={`Select ${zone.shortName}`}
              aria-pressed={selected}
              className={cx(
                "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-md px-1.5 py-1 text-center transition",
                selected ? "z-20 bg-white shadow-md ring-2" : "z-10 hover:bg-white/80",
                selected && severityRing(assessment.severity),
              )}
              data-testid={`zone-${zone.id}`}
              key={zone.id}
              onClick={() => onSelectZone(zone.id)}
              style={{ left: `${zone.map.x}%`, top: `${zone.map.y}%` }}
              type="button"
            >
              <span
                className={cx(
                  "grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white shadow-sm ring-4 ring-white/70",
                  severityFill(assessment.severity),
                )}
              >
                {assessment.compositeScore}
              </span>
              <span className="max-w-[7rem] rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-stone-900">
                {zone.shortName}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function HazardPanel({ hazard }: { hazard: HazardRisk }) {
  const Icon = hazard.hazard === "heavy-rain-flood" ? CloudRain : Wind;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-stone-100 p-2 text-stone-700">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-stone-950">{hazard.label}</h3>
            <p className="text-xs text-stone-500">{hazard.leadTimeHours}h action window</p>
          </div>
        </div>
        <ScorePill score={hazard.score} severity={hazard.severity} />
      </div>
      <div className="mt-4 h-2 rounded-full bg-stone-100">
        <div
          className={cx("h-2 rounded-full", scoreTone(hazard.score))}
          style={{ width: `${hazard.score}%` }}
        />
      </div>
      <ul className="mt-4 space-y-2 text-xs leading-5 text-stone-600">
        {hazard.drivers.map((driver) => (
          <li className="flex gap-2" key={driver}>
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
            <span>{driver}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RiskDetail({ assessment }: { assessment: ReturnType<typeof assessZone> }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Risk detail</p>
          <h2 className="max-w-md text-xl font-semibold text-stone-950">
            {assessment.zone.name}
          </h2>
          <p className="mt-1 text-sm text-stone-600">{assessment.zone.cropProfile.advisoryNote}</p>
        </div>
        <div
          className="grid h-28 w-28 place-items-center rounded-full border border-stone-200"
          style={{
            background: `conic-gradient(#16a34a ${assessment.compositeScore * 3.6}deg, #e7e5e4 0deg)`,
          }}
        >
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white">
            <div className="text-center">
              <p className="font-mono text-2xl font-bold text-stone-950">
                {assessment.compositeScore}
              </p>
              <p className="text-[11px] font-semibold uppercase text-stone-500">Composite</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {assessment.hazards.map((hazard) => (
          <HazardPanel hazard={hazard} key={hazard.hazard} />
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-stone-500">Explanation</p>
          <ul className="space-y-2 text-sm leading-6 text-stone-700">
            {assessment.explanation.map((item) => (
              <li className="flex gap-2" key={item}>
                <Gauge className="mt-1 h-4 w-4 shrink-0 text-stone-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-stone-500">Confidence notes</p>
          <ul className="space-y-2 text-sm leading-6 text-stone-700">
            {assessment.confidenceNotes.map((item) => (
              <li className="flex gap-2" key={item}>
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function AIModelSnapshot({ assessment }: { assessment: ReturnType<typeof assessZone> }) {
  const prediction = modelPredictionByZoneId.get(assessment.zone.id);
  const modelScore = prediction?.modelPredictedCompositeScore ?? null;
  const modelSeverity = prediction?.modelPredictedSeverity ?? assessment.severity;
  const delta = modelScore === null ? null : modelScore - assessment.compositeScore;
  const generatedDate = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(modelSnapshot.generatedAt));

  return (
    <section
      className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
      data-testid="ai-model-snapshot"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">AI model snapshot</p>
          <h2 className="text-xl font-semibold text-stone-950">Kaggle baseline risk model</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">
            RandomForest baseline trained with weak supervision from the transparent rule engine.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700">
          <Gauge className="h-4 w-4 text-emerald-700" />
          {modelTrainingMetrics.backend.replaceAll("_", " ")}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">Selected zone</p>
              <p className="mt-1 text-base font-semibold text-stone-950">{assessment.zone.name}</p>
            </div>
            {modelScore !== null ? (
              <ScorePill score={Number(modelScore.toFixed(1))} severity={modelSeverity} />
            ) : (
              <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-600">
                No model row
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-stone-600">
                <span>Rule engine score</span>
                <span className="font-mono">{assessment.compositeScore}</span>
              </div>
              <div className="h-2 rounded-full bg-stone-200">
                <div
                  className={cx("h-2 rounded-full", scoreTone(assessment.compositeScore))}
                  style={{ width: `${assessment.compositeScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-stone-600">
                <span>AI model score</span>
                <span className="font-mono">{modelScore?.toFixed(1) ?? "n/a"}</span>
              </div>
              <div className="h-2 rounded-full bg-stone-200">
                <div
                  className={cx("h-2 rounded-full", scoreTone(modelScore ?? 0))}
                  style={{ width: `${modelScore ?? 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs leading-5 text-stone-600">
            <p>
              Delta vs rule engine:{" "}
              <span className="font-mono font-semibold text-stone-950">
                {delta === null ? "n/a" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`}
              </span>
            </p>
            <p>Snapshot generated: {generatedDate} UTC</p>
            <p>Label source: {prediction?.labelSource.replaceAll("_", " ") ?? "n/a"}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase text-stone-500">Rows</p>
            <p className="mt-2 font-mono text-2xl font-bold text-stone-950">
              {modelTrainingMetrics.rows}
            </p>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              {modelTrainingMetrics.trainRows} train / {modelTrainingMetrics.testRows} test
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase text-stone-500">Score error</p>
            <p className="mt-2 font-mono text-2xl font-bold text-stone-950">
              {modelTrainingMetrics.scoreMetrics.mae}
            </p>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              MAE, RMSE {modelTrainingMetrics.scoreMetrics.rmse}
            </p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase text-stone-500">Severity acc.</p>
            <p className="mt-2 font-mono text-2xl font-bold text-stone-950">
              {Math.round(modelTrainingMetrics.severityAccuracy * 100)}%
            </p>
            <p className="mt-1 text-xs leading-5 text-stone-600">Weak-label validation</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
        <AlertTriangle className="mr-2 inline h-4 w-4" />
        {modelSnapshot.claimBoundary} The model is shown as a baseline AI layer, not an official
        warning source.
      </div>
    </section>
  );
}

function StageSelector({
  selectedStage,
  onSelectStage,
}: {
  selectedStage: CropStage;
  onSelectStage: (stage: CropStage) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {cropStages.map((stage) => {
        const selected = stage.id === selectedStage;

        return (
          <button
            aria-pressed={selected}
            className={cx(
              "flex min-h-16 flex-col justify-center gap-1 rounded-md border px-3 py-2 text-left text-sm transition",
              selected
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-stone-200 bg-white text-stone-700 hover:border-emerald-300",
            )}
            data-testid={`stage-${stage.id}`}
            key={stage.id}
            onClick={() => onSelectStage(stage.id)}
            type="button"
          >
            <span className="flex items-center gap-2 font-semibold">
              <CropIcon stage={stage.id} />
              {stage.shortLabel}
            </span>
            <span className={cx("text-xs", selected ? "text-emerald-50" : "text-stone-500")}>
              {stage.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ActionChecklist({
  selectedStage,
  onSelectStage,
  actions,
}: {
  selectedStage: CropStage;
  onSelectStage: (stage: CropStage) => void;
  actions: ReturnType<typeof generateActions>;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Agriculture action layer</p>
          <h2 className="text-xl font-semibold text-stone-950">Rice checklist</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
          <Timer className="h-4 w-4" />
          24-72h actions
        </span>
      </div>

      <StageSelector onSelectStage={onSelectStage} selectedStage={selectedStage} />

      <div className="mt-4 grid gap-3">
        {actions.map((action, index) => (
          <article
            className="rounded-lg border border-stone-200 bg-stone-50 p-4"
            data-testid={`action-${index + 1}`}
            key={action.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-stone-900 px-2 py-1 font-mono text-xs text-white">
                    {index + 1}
                  </span>
                  <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700">
                    {urgencyLabel(action.urgency)}
                  </span>
                  <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700">
                    {action.matchedHazard.replaceAll("-", " ")}
                  </span>
                </div>
                <h3 className="text-base font-semibold leading-6 text-stone-950">
                  {action.action}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{action.rationale}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReplayMap({
  frame,
  selectedZoneId,
}: {
  frame: ReplayFrame;
  selectedZoneId: string;
}) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-stone-300 bg-[#eef2e8]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <rect fill="#eef2e8" height="100" width="100" />
        <path d="M8 0 H91 C85 17 93 30 88 45 C84 57 93 72 90 100 H8 Z" fill="#f9fbf4" />
        <path
          d="M71 0 C68 14 77 23 72 34 C67 45 74 54 70 67 C67 78 75 88 73 100"
          fill="none"
          stroke="#2f8db9"
          strokeDasharray="2 2"
          strokeWidth="1.6"
        />
        <path
          d="M16 8 C25 20 29 29 38 42 C48 55 55 64 63 78"
          fill="none"
          stroke="#67a7c9"
          strokeWidth="1.2"
        />
      </svg>

      {zones.map((zone) => {
        const score = frame.zoneScores[zone.id] ?? 0;
        const severity = severityFromFrameScore(score);
        const selected = zone.id === selectedZoneId;

        return (
          <div
            className={cx(
              "absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[11px] font-bold text-white shadow-sm ring-4 ring-white/70",
              selected ? "h-10 w-10" : "h-7 w-7",
              severityFill(severity),
            )}
            key={zone.id}
            style={{ left: `${zone.map.x}%`, top: `${zone.map.y}%` }}
            title={`${zone.shortName}: ${score}`}
          >
            {score}
          </div>
        );
      })}

      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-stone-950 px-2 py-1 text-xs font-semibold text-white shadow-lg"
        style={{ left: `${frame.stormPosition.x}%`, top: `${frame.stormPosition.y}%` }}
      >
        <Wind className="mr-1 inline h-3.5 w-3.5" />
        {frame.stormPosition.label}
      </div>
    </div>
  );
}

function severityFromFrameScore(score: number): Severity {
  if (score >= 85) return "severe";
  if (score >= 65) return "high";
  if (score >= 40) return "guarded";
  return "low";
}

function TimeMachine({
  selectedZoneId,
  selectedZone,
}: {
  selectedZoneId: string;
  selectedZone: Zone;
}) {
  const [selectedFrameId, setSelectedFrameId] = useState(replayFrames[2].id);
  const frame = replayFrames.find((item) => item.id === selectedFrameId) ?? replayFrames[0];
  const selectedScore = frame.zoneScores[selectedZoneId] ?? 0;
  const selectedSeverity = severityFromFrameScore(selectedScore);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Time Machine</p>
          <h2 className="text-xl font-semibold text-stone-950">Typhoon Noru 2022 replay</h2>
        </div>
        <ScorePill score={selectedScore} severity={selectedSeverity} />
      </div>

      <div className="grid gap-2 md:grid-cols-5">
        {replayFrames.map((item) => (
          <button
            aria-pressed={item.id === selectedFrameId}
            className={cx(
              "rounded-md border px-3 py-2 text-left text-sm transition",
              item.id === selectedFrameId
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-stone-200 bg-white text-stone-700 hover:border-stone-400",
            )}
            data-testid={`frame-${item.id}`}
            key={item.id}
            onClick={() => setSelectedFrameId(item.id)}
            type="button"
          >
            <span className="block font-semibold">{item.label}</span>
            <span className={cx("block text-xs", item.id === selectedFrameId ? "text-stone-200" : "text-stone-500")}>
              {item.timestamp}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <ReplayMap frame={frame} selectedZoneId={selectedZoneId} />
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
            <CalendarClock className="h-4 w-4 text-stone-600" />
            {frame.headline}
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-700">{frame.narrative}</p>
          <div className="mt-4 rounded-md border border-stone-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Selected zone</p>
            <p className="mt-1 text-sm font-semibold text-stone-950">{selectedZone.name}</p>
            <div className="mt-3 h-2 rounded-full bg-stone-100">
              <div
                className={cx("h-2 rounded-full", scoreTone(selectedScore))}
                style={{ width: `${selectedScore}%` }}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {zones.map((zone) => {
              const score = frame.zoneScores[zone.id] ?? 0;

              return (
                <div className="grid grid-cols-[8rem_1fr_3rem] items-center gap-2 text-xs" key={zone.id}>
                  <span className="truncate font-semibold text-stone-700">{zone.shortName}</span>
                  <div className="h-2 rounded-full bg-stone-200">
                    <div
                      className={cx("h-2 rounded-full", scoreTone(score))}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-right font-mono text-stone-700">{score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AlertPreview({
  alertText,
  zoneName,
}: {
  alertText: string;
  zoneName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAlert() {
    await navigator.clipboard.writeText(alertText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Mock alert preview</p>
          <h2 className="text-xl font-semibold text-stone-950">Vietnamese farmer message</h2>
          <p className="mt-1 text-sm text-stone-600">{zoneName}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
          onClick={copyAlert}
          type="button"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="min-h-56 whitespace-pre-wrap break-words rounded-lg border border-stone-200 bg-stone-950 p-4 font-mono text-sm leading-6 text-stone-50"
        data-testid="alert-preview"
      >
        {alertText}
      </pre>
    </section>
  );
}

export function AgriShieldDashboard() {
  const [selectedZoneId, setSelectedZoneId] = useState(zones[2].id);
  const [selectedStage, setSelectedStage] = useState<CropStage>("ripening");
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? zones[0];
  const selectedStageOption =
    cropStages.find((stage) => stage.id === selectedStage) ?? cropStages[0];
  const assessment = useMemo(() => assessZone(selectedZone), [selectedZone]);
  const actions = useMemo(
    () => generateActions(assessment, selectedStage),
    [assessment, selectedStage],
  );
  const alertText = useMemo(
    () => buildVietnameseAlert(assessment, selectedStageOption.label, actions),
    [actions, assessment, selectedStageOption.label],
  );

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                  <ShieldCheck className="h-4 w-4" />
                  Track 3
                </span>
                <span className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700">
                  Water Resources & Climate-Resilient Agriculture
                </span>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal text-stone-950 md:text-5xl">
                AgriShield
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
                Multi-hazard agricultural alert and action platform for Central Vietnam
                rice communities.
              </p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-emerald-700" />
                <div>
                  <p className="text-xs font-semibold uppercase text-stone-500">V1 scope</p>
                  <p className="text-sm font-semibold text-stone-950">
                    Rule-based demo, no external API keys
                  </p>
                </div>
              </div>
            </div>
          </div>
          <MetricStrip selectedZone={selectedZone} />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <RiskMap onSelectZone={setSelectedZoneId} selectedZoneId={selectedZoneId} />
        <RiskDetail assessment={assessment} />
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        <AIModelSnapshot assessment={assessment} />
        <ActionChecklist
          actions={actions}
          onSelectStage={setSelectedStage}
          selectedStage={selectedStage}
        />
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <TimeMachine selectedZone={selectedZone} selectedZoneId={selectedZoneId} />
          <AlertPreview alertText={alertText} zoneName={selectedZone.name} />
        </div>
      </div>
    </main>
  );
}
