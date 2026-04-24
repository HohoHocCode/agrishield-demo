# %% [markdown]
# # AgriShield Real-Data Preparation
#
# This script prepares better training inputs for the existing AgriShield Kaggle
# core model. It accepts optional rainfall, storm-track, and observed-impact
# label tables, then exports an enriched `hazard_observations.csv` that can be
# used directly by `agrishield_kaggle_core.py`.

# %%
from __future__ import annotations

import json
import math
import os
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


REQUIRED_ZONE_COLUMNS = {
    "zone_id",
    "zone_name",
    "current_admin",
    "lat",
    "lng",
    "rice_area_ha",
    "floodplain_exposure",
    "coastal_wind_exposure",
    "drainage_stress",
    "elevation_min_m",
    "elevation_max_m",
}

REQUIRED_HAZARD_COLUMNS = {
    "event_name",
    "timestamp",
    "zone_id",
    "forecast_rain_72h_mm",
    "rainfall_anomaly_pct",
    "soil_saturation_pct",
    "storm_distance_km",
    "storm_wind_kmh",
    "lead_time_hours",
}


def project_dir() -> Path:
    if "__file__" in globals():
        return Path(__file__).resolve().parent
    return Path.cwd()


def has_core_tables(path: Path) -> bool:
    return (path / "advisory_zones.csv").exists() and (path / "hazard_observations.csv").exists()


def find_core_input_dir() -> Path:
    env_dir = os.environ.get("AGRISHIELD_INPUT_DIR")
    candidates = []
    if env_dir:
        candidates.append(Path(env_dir))

    candidates.extend(
        [
            Path("/kaggle/input/agrishield-real-data"),
            Path("/kaggle/input/agrishield-core"),
            project_dir() / "sample_data",
        ]
    )

    for candidate in candidates:
        if candidate.exists() and has_core_tables(candidate):
            return candidate

    kaggle_input = Path("/kaggle/input")
    if kaggle_input.exists():
        for zones_path in sorted(kaggle_input.rglob("advisory_zones.csv")):
            candidate = zones_path.parent
            if has_core_tables(candidate):
                return candidate

    raise FileNotFoundError(
        "Could not find advisory_zones.csv and hazard_observations.csv. "
        "Set AGRISHIELD_INPUT_DIR or attach a Kaggle dataset containing both files."
    )


def output_dir() -> Path:
    if Path("/kaggle/working").exists():
        base = Path("/kaggle/working/agrishield_real_data_ready")
    else:
        base = project_dir() / "working" / "agrishield_real_data_ready"
    base.mkdir(parents=True, exist_ok=True)
    return base


def find_optional_table(input_dir: Path, filename: str) -> Path | None:
    direct = input_dir / filename
    if direct.exists():
        return direct

    root = Path("/kaggle/input")
    if root.exists():
        matches = sorted(root.rglob(filename))
        if matches:
            return matches[0]

    local_contract = project_dir() / "data_contracts" / filename
    if local_contract.exists():
        return local_contract

    return None


def load_optional_csv(input_dir: Path, filename: str) -> tuple[pd.DataFrame | None, str | None]:
    path = find_optional_table(input_dir, filename)
    if path is None:
        return None, None

    frame = pd.read_csv(path)
    if frame.empty:
        return None, str(path)
    return frame, str(path)


def require_columns(frame: pd.DataFrame, required: set[str], table_name: str) -> None:
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"{table_name} is missing required columns: {sorted(missing)}")


def severity_from_score(score: float) -> str:
    if score >= 85:
        return "severe"
    if score >= 65:
        return "high"
    if score >= 40:
        return "guarded"
    return "low"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def normalize_numeric(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    data = frame.copy()
    for column in columns:
        if column in data.columns:
            data[column] = pd.to_numeric(data[column], errors="coerce")
    return data


def load_core_tables(input_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    zones = pd.read_csv(input_dir / "advisory_zones.csv")
    hazards = pd.read_csv(input_dir / "hazard_observations.csv")

    require_columns(zones, REQUIRED_ZONE_COLUMNS, "advisory_zones.csv")
    require_columns(hazards, REQUIRED_HAZARD_COLUMNS, "hazard_observations.csv")

    hazards["timestamp"] = pd.to_datetime(hazards["timestamp"], utc=True)
    hazards = normalize_numeric(
        hazards,
        [
            "forecast_rain_72h_mm",
            "rainfall_anomaly_pct",
            "soil_saturation_pct",
            "storm_distance_km",
            "storm_wind_kmh",
            "lead_time_hours",
            "observed_impact_score",
        ],
    )

    unknown_zone_ids = sorted(set(hazards["zone_id"]) - set(zones["zone_id"]))
    if unknown_zone_ids:
        raise ValueError(f"hazard_observations.csv has unknown zone_id values: {unknown_zone_ids}")

    return zones, hazards


def enrich_with_rainfall(hazards: pd.DataFrame, rainfall: pd.DataFrame | None) -> pd.DataFrame:
    if rainfall is None:
        return hazards

    required = {"date", "zone_id", "rainfall_mm"}
    require_columns(rainfall, required, "rainfall_daily.csv")

    rain = rainfall.copy()
    rain["date"] = pd.to_datetime(rain["date"], utc=True).dt.date
    rain = normalize_numeric(rain, ["rainfall_mm", "rainfall_normal_72h_mm"])
    rain = rain.sort_values(["zone_id", "date"])
    rain["observed_rain_72h_mm"] = (
        rain.groupby("zone_id")["rainfall_mm"]
        .rolling(window=3, min_periods=1)
        .sum()
        .reset_index(level=0, drop=True)
        .round(2)
    )

    keep_columns = ["zone_id", "date", "rainfall_mm", "observed_rain_72h_mm"]
    if "rainfall_source" in rain.columns:
        keep_columns.append("rainfall_source")
    if "rainfall_normal_72h_mm" in rain.columns:
        keep_columns.append("rainfall_normal_72h_mm")

    data = hazards.copy()
    data["observation_date"] = data["timestamp"].dt.date
    data = data.merge(
        rain[keep_columns],
        left_on=["zone_id", "observation_date"],
        right_on=["zone_id", "date"],
        how="left",
        validate="many_to_one",
    )
    data = data.drop(columns=["date"])

    data["observed_rain_24h_mm"] = data["rainfall_mm"]
    data = data.drop(columns=["rainfall_mm"])

    missing_forecast = data["forecast_rain_72h_mm"].isna()
    data.loc[missing_forecast, "forecast_rain_72h_mm"] = data.loc[
        missing_forecast,
        "observed_rain_72h_mm",
    ]

    if "rainfall_normal_72h_mm" in data.columns:
        normal = data["rainfall_normal_72h_mm"].replace(0, np.nan)
        derived_anomaly = ((data["observed_rain_72h_mm"] - normal) / normal * 100).round(2)
        data["rainfall_anomaly_pct"] = data["rainfall_anomaly_pct"].fillna(derived_anomaly)

    return data


def enrich_with_event_labels(hazards: pd.DataFrame, labels: pd.DataFrame | None) -> pd.DataFrame:
    if labels is None:
        return hazards

    required = {"event_name", "zone_id", "observed_impact_score"}
    require_columns(labels, required, "event_labels.csv")

    label_data = labels.copy()
    label_data = normalize_numeric(
        label_data,
        ["observed_impact_score", "crop_area_affected_ha", "flood_depth_cm", "label_confidence"],
    )

    if "event_start" in label_data.columns:
        label_data["event_start"] = pd.to_datetime(label_data["event_start"], utc=True)
    if "event_end" in label_data.columns:
        label_data["event_end"] = pd.to_datetime(label_data["event_end"], utc=True)

    optional_columns = [
        "event_name",
        "zone_id",
        "observed_impact_score",
        "impact_label_source",
        "label_confidence",
        "crop_area_affected_ha",
        "flood_depth_cm",
        "damage_note",
    ]
    available_columns = [column for column in optional_columns if column in label_data.columns]
    label_data = label_data[available_columns].dropna(subset=["observed_impact_score"])
    label_data = label_data.drop_duplicates(["event_name", "zone_id"], keep="last")

    data = hazards.merge(
        label_data,
        on=["event_name", "zone_id"],
        how="left",
        suffixes=("", "_label"),
        validate="many_to_one",
    )

    if "observed_impact_score_label" in data.columns:
        data["observed_impact_score"] = data["observed_impact_score"].fillna(
            data["observed_impact_score_label"]
        )
        data = data.drop(columns=["observed_impact_score_label"])

    return data


def enrich_with_storm_tracks(
    hazards: pd.DataFrame,
    zones: pd.DataFrame,
    tracks: pd.DataFrame | None,
) -> pd.DataFrame:
    if tracks is None:
        return hazards

    required = {"event_name", "timestamp", "lat", "lng", "wind_kmh"}
    require_columns(tracks, required, "storm_track_points.csv")

    track_data = tracks.copy()
    track_data["timestamp"] = pd.to_datetime(track_data["timestamp"], utc=True)
    track_data = normalize_numeric(track_data, ["lat", "lng", "wind_kmh"])
    track_groups = {
        event_name: group.sort_values("timestamp").reset_index(drop=True)
        for event_name, group in track_data.groupby("event_name")
    }

    zone_lookup = zones.set_index("zone_id")[["lat", "lng"]].to_dict(orient="index")
    data = hazards.copy()
    track_distances: list[float | None] = []
    track_winds: list[float | None] = []
    track_time_deltas: list[float | None] = []

    for row in data.to_dict(orient="records"):
        group = track_groups.get(row["event_name"])
        zone = zone_lookup.get(row["zone_id"])
        if group is None or zone is None:
            track_distances.append(None)
            track_winds.append(None)
            track_time_deltas.append(None)
            continue

        deltas = (group["timestamp"] - row["timestamp"]).abs()
        nearest = group.loc[deltas.idxmin()]
        distance = haversine_km(float(zone["lat"]), float(zone["lng"]), nearest["lat"], nearest["lng"])
        delta_hours = abs((nearest["timestamp"] - row["timestamp"]).total_seconds()) / 3600

        track_distances.append(round(distance, 2))
        track_winds.append(float(nearest["wind_kmh"]))
        track_time_deltas.append(round(delta_hours, 2))

    data["track_distance_km"] = track_distances
    data["track_wind_kmh"] = track_winds
    data["track_time_delta_hours"] = track_time_deltas

    data["storm_distance_km"] = data["storm_distance_km"].fillna(data["track_distance_km"])
    data["storm_wind_kmh"] = data["storm_wind_kmh"].fillna(data["track_wind_kmh"])

    return data


def build_quality_report(
    input_dir: Path,
    output: pd.DataFrame,
    zones: pd.DataFrame,
    optional_sources: dict[str, str | None],
) -> dict[str, Any]:
    missing_counts = {
        column: int(output[column].isna().sum())
        for column in sorted(REQUIRED_HAZARD_COLUMNS)
        if column in output.columns and output[column].isna().any()
    }

    observed_labels = int(output.get("observed_impact_score", pd.Series(dtype=float)).notna().sum())
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_dir": str(input_dir),
        "zone_count": int(len(zones)),
        "observation_count": int(len(output)),
        "event_count": int(output["event_name"].nunique()),
        "date_min": output["timestamp"].min().isoformat(),
        "date_max": output["timestamp"].max().isoformat(),
        "observed_label_rows": observed_labels,
        "weak_label_rows_remaining": int(len(output) - observed_labels),
        "severity_preview_from_labels": (
            output.loc[output["observed_impact_score"].notna(), "observed_impact_score"]
            .map(severity_from_score)
            .value_counts()
            .to_dict()
            if "observed_impact_score" in output.columns
            else {}
        ),
        "missing_required_value_counts": missing_counts,
        "optional_sources": optional_sources,
        "ready_for_training": not missing_counts,
        "claim_boundary": "Prepared data supports advisory-zone modeling only; it is not an official warning feed.",
    }
    return report


def write_training_readme(report: dict[str, Any], out_dir: Path) -> None:
    text = f"""# AgriShield Real-Data Ready Inputs

Generated at: {report["generated_at"]}

## What was created

- `advisory_zones.csv`: advisory-zone metadata copied from the selected input folder.
- `hazard_observations.csv`: enriched hazard panel ready for the baseline training notebook.
- `data_quality_report.json`: validation and source summary.
- `agrishield_real_data_ready.zip`: package for upload as a Kaggle dataset.

## Next training step

Use this folder as the input dataset for `AgriShield_Kaggle_Core_Baseline.ipynb`.
The baseline model will use `observed_impact_score` where it exists and weak
rule labels for the remaining rows.

## Current data readiness

- Zones: {report["zone_count"]}
- Observations: {report["observation_count"]}
- Events: {report["event_count"]}
- Observed label rows: {report["observed_label_rows"]}
- Weak-label rows remaining: {report["weak_label_rows_remaining"]}
- Ready for training: {report["ready_for_training"]}

## Boundary

This remains an advisory-zone decision-support dataset. Do not claim official
warnings, crop-loss prediction, or village-level precision from this output.
"""
    (out_dir / "README_next_training.md").write_text(text, encoding="utf-8")


def package_outputs(out_dir: Path) -> Path:
    zip_path = out_dir.with_suffix(".zip")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(out_dir.iterdir()):
            if path.is_file():
                archive.write(path, arcname=path.name)
    return zip_path


def main() -> None:
    input_dir = find_core_input_dir()
    out_dir = output_dir()
    print(f"Input directory: {input_dir}")
    print(f"Output directory: {out_dir}")

    zones, hazards = load_core_tables(input_dir)
    rainfall, rainfall_path = load_optional_csv(input_dir, "rainfall_daily.csv")
    labels, labels_path = load_optional_csv(input_dir, "event_labels.csv")
    tracks, tracks_path = load_optional_csv(input_dir, "storm_track_points.csv")

    enriched = hazards.copy()
    enriched = enrich_with_rainfall(enriched, rainfall)
    enriched = enrich_with_event_labels(enriched, labels)
    enriched = enrich_with_storm_tracks(enriched, zones, tracks)

    optional_sources = {
        "rainfall_daily.csv": rainfall_path,
        "event_labels.csv": labels_path,
        "storm_track_points.csv": tracks_path,
    }
    report = build_quality_report(input_dir, enriched, zones, optional_sources)

    zones.to_csv(out_dir / "advisory_zones.csv", index=False)
    enriched.to_csv(out_dir / "hazard_observations.csv", index=False)
    (out_dir / "data_quality_report.json").write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )
    write_training_readme(report, out_dir)
    zip_path = package_outputs(out_dir)

    print(json.dumps(report, indent=2))
    print("Artifacts written:")
    for path in sorted(out_dir.iterdir()):
        print(f"- {path}")
    print(f"- {zip_path}")


if __name__ == "__main__":
    main()
