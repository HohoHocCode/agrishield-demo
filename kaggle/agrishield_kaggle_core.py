# %% [markdown]
# # AgriShield Kaggle Core Baseline
#
# This script turns the current AgriShield rule-based demo into a reproducible
# Kaggle-friendly data and model pipeline. It is intentionally conservative:
# the first model learns from transparent weak labels, then can be recalibrated
# later with observed flood extent, official warning levels, or crop damage data.

# %%
from __future__ import annotations

import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

try:
    from joblib import dump
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.metrics import accuracy_score, classification_report, mean_absolute_error
    from sklearn.model_selection import train_test_split
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder, StandardScaler

    SKLEARN_AVAILABLE = True
except Exception as exc:  # Kaggle has sklearn; local lightweight runtimes may not.
    SKLEARN_AVAILABLE = False
    SKLEARN_IMPORT_ERROR = repr(exc)


RANDOM_SEED = 42

EXPOSURE_VALUE = {
    "low": 0.28,
    "medium": 0.62,
    "high": 1.0,
}

NUMERIC_FEATURES = [
    "lat",
    "lng",
    "rice_area_ha",
    "elevation_min_m",
    "elevation_max_m",
    "forecast_rain_72h_mm",
    "rainfall_anomaly_pct",
    "soil_saturation_pct",
    "storm_distance_km",
    "storm_wind_kmh",
    "lead_time_hours",
    "floodplain_exposure_score",
    "coastal_wind_exposure_score",
    "drainage_stress_score",
    "rain_load",
    "storm_proximity_index",
    "month",
    "hour",
]

CATEGORICAL_FEATURES = [
    "zone_id",
    "current_admin",
    "dominant_season",
]


def project_dir() -> Path:
    if "__file__" in globals():
        return Path(__file__).resolve().parent
    return Path.cwd()


def resolve_paths() -> tuple[Path, Path]:
    base = project_dir()

    candidates = []
    env_input = os.environ.get("AGRISHIELD_INPUT_DIR")
    if env_input:
        candidates.append(Path(env_input))

    candidates.extend(
        [
            Path("/kaggle/working/agrishield_real_data_ready"),
            Path("/kaggle/input/agrishield-real-data-ready"),
            Path("/kaggle/input/agrishield-real-data"),
            Path("/kaggle/input/agrishield-core"),
            base / "sample_data",
        ]
    )

    input_dir = None
    for candidate in candidates:
        if (
            candidate.exists()
            and (candidate / "advisory_zones.csv").exists()
            and (candidate / "hazard_observations.csv").exists()
        ):
            input_dir = candidate
            break

    if input_dir is None:
        input_dir = base / "sample_data"

    if Path("/kaggle/working").exists():
        output_dir = Path("/kaggle/working/agrishield_outputs")
    else:
        output_dir = base / "working" / "agrishield_outputs"

    output_dir.mkdir(parents=True, exist_ok=True)
    return input_dir, output_dir


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return min(high, max(low, value))


def severity_from_score(score: float) -> str:
    if score >= 85:
        return "severe"
    if score >= 65:
        return "high"
    if score >= 40:
        return "guarded"
    return "low"


def exposure_value(level: Any) -> float:
    return EXPOSURE_VALUE.get(str(level).strip().lower(), 0.28)


def load_source_data(input_dir: Path) -> pd.DataFrame:
    zones_path = input_dir / "advisory_zones.csv"
    observations_path = input_dir / "hazard_observations.csv"

    if not zones_path.exists() or not observations_path.exists():
        raise FileNotFoundError(
            "Missing advisory_zones.csv or hazard_observations.csv. "
            f"Checked: {input_dir}"
        )

    zones = pd.read_csv(zones_path)
    observations = pd.read_csv(observations_path)

    required_zone_columns = {"zone_id", "lat", "lng", "floodplain_exposure"}
    required_observation_columns = {
        "timestamp",
        "zone_id",
        "forecast_rain_72h_mm",
        "rainfall_anomaly_pct",
        "soil_saturation_pct",
        "storm_distance_km",
        "storm_wind_kmh",
        "lead_time_hours",
    }

    missing_zone = required_zone_columns - set(zones.columns)
    missing_observation = required_observation_columns - set(observations.columns)
    if missing_zone or missing_observation:
        raise ValueError(
            f"Missing zone columns={sorted(missing_zone)}, "
            f"missing observation columns={sorted(missing_observation)}"
        )

    frame = observations.merge(zones, on="zone_id", how="left", validate="many_to_one")
    if frame["zone_name"].isna().any():
        missing_ids = sorted(frame.loc[frame["zone_name"].isna(), "zone_id"].unique())
        raise ValueError(f"Observations contain unknown zone_id values: {missing_ids}")

    frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
    frame["observed_impact_score"] = pd.to_numeric(
        frame.get("observed_impact_score"),
        errors="coerce",
    )
    return frame


def add_engineered_features(frame: pd.DataFrame) -> pd.DataFrame:
    data = frame.copy()

    data["floodplain_exposure_score"] = data["floodplain_exposure"].map(exposure_value)
    data["coastal_wind_exposure_score"] = data["coastal_wind_exposure"].map(exposure_value)
    data["drainage_stress_score"] = data["drainage_stress"].map(exposure_value)
    data["rain_load"] = (data["forecast_rain_72h_mm"] / 260).clip(0, 1)
    data["storm_proximity_index"] = (1 - data["storm_distance_km"] / 360).clip(0, 1)
    data["month"] = data["timestamp"].dt.month
    data["hour"] = data["timestamp"].dt.hour

    rain_load = (data["forecast_rain_72h_mm"] / 260).clip(0, 1)
    anomaly_load = (data["rainfall_anomaly_pct"] / 90).clip(0, 1)
    saturation_load = (data["soil_saturation_pct"] / 95).clip(0, 1)
    flood_exposure = (
        data["floodplain_exposure_score"] * 0.7 + data["drainage_stress_score"] * 0.3
    )

    wind_load = (data["storm_wind_kmh"] / 150).clip(0, 1)
    distance_load = (1 - data["storm_distance_km"] / 360).clip(0, 1)
    lead_time_load = (
        1 - np.maximum(data["lead_time_hours"] - 24, 0) / 96
    ).clip(0.22, 1)

    data["weak_flood_score"] = np.round(
        100
        * (
            rain_load * 0.38
            + anomaly_load * 0.20
            + saturation_load * 0.22
            + flood_exposure * 0.20
        )
    ).clip(0, 100)

    data["weak_typhoon_score"] = np.round(
        100
        * (
            wind_load * 0.36
            + distance_load * 0.30
            + lead_time_load * 0.14
            + data["coastal_wind_exposure_score"] * 0.20
        )
    ).clip(0, 100)

    primary = data[["weak_flood_score", "weak_typhoon_score"]].max(axis=1)
    secondary = data[["weak_flood_score", "weak_typhoon_score"]].min(axis=1)
    data["weak_composite_score"] = np.round(primary * 0.72 + secondary * 0.28).clip(0, 100)

    has_observed_label = data["observed_impact_score"].notna()
    data["target_score"] = np.where(
        has_observed_label,
        data["observed_impact_score"].clip(0, 100),
        data["weak_composite_score"],
    )
    data["label_source"] = np.where(has_observed_label, "observed_impact_score", "weak_rule_label")
    data["target_severity"] = data["target_score"].map(severity_from_score)

    return data


def augment_weak_label_data(frame: pd.DataFrame, copies: int = 8) -> pd.DataFrame:
    rng = np.random.default_rng(RANDOM_SEED)
    numeric_to_jitter = [
        "forecast_rain_72h_mm",
        "rainfall_anomaly_pct",
        "soil_saturation_pct",
        "storm_distance_km",
        "storm_wind_kmh",
        "lead_time_hours",
    ]

    augmented = [frame]
    base = frame.copy()

    for copy_index in range(copies):
        sample = base.copy()
        sample["event_name"] = sample["event_name"].astype(str) + f"-aug-{copy_index + 1}"
        sample["forecast_rain_72h_mm"] = (
            sample["forecast_rain_72h_mm"] + rng.normal(0, 24, len(sample))
        ).clip(0, 360)
        sample["rainfall_anomaly_pct"] = (
            sample["rainfall_anomaly_pct"] + rng.normal(0, 12, len(sample))
        ).clip(-40, 140)
        sample["soil_saturation_pct"] = (
            sample["soil_saturation_pct"] + rng.normal(0, 8, len(sample))
        ).clip(0, 100)
        sample["storm_distance_km"] = (
            sample["storm_distance_km"] + rng.normal(0, 34, len(sample))
        ).clip(0, 800)
        sample["storm_wind_kmh"] = (
            sample["storm_wind_kmh"] + rng.normal(0, 12, len(sample))
        ).clip(0, 180)
        sample["lead_time_hours"] = (
            sample["lead_time_hours"] + rng.normal(0, 8, len(sample))
        ).clip(0, 96)
        sample["observed_impact_score"] = np.nan

        for column in numeric_to_jitter:
            sample[column] = sample[column].round(2)

        augmented.append(sample)

    return pd.concat(augmented, ignore_index=True)


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(math.sqrt(np.mean((y_true - y_pred) ** 2)))
    return {"mae": round(mae, 3), "rmse": round(rmse, 3)}


def train_with_sklearn(data: pd.DataFrame, output_dir: Path) -> tuple[dict[str, Any], pd.DataFrame, Any]:
    train_df, test_df = train_test_split(
        data,
        test_size=0.25,
        random_state=RANDOM_SEED,
        stratify=data["target_severity"] if data["target_severity"].nunique() > 1 else None,
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", StandardScaler(), NUMERIC_FEATURES),
            ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )

    regressor = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=320,
                    min_samples_leaf=2,
                    random_state=RANDOM_SEED,
                ),
            ),
        ]
    )

    classifier = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=320,
                    min_samples_leaf=2,
                    class_weight="balanced",
                    random_state=RANDOM_SEED,
                ),
            ),
        ]
    )

    regressor.fit(train_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES], train_df["target_score"])
    classifier.fit(train_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES], train_df["target_severity"])

    pred_score = regressor.predict(test_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]).clip(0, 100)
    pred_severity = classifier.predict(test_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES])

    predictions = test_df[
        [
            "event_name",
            "timestamp",
            "zone_id",
            "zone_name",
            "target_score",
            "target_severity",
            "weak_flood_score",
            "weak_typhoon_score",
            "label_source",
        ]
    ].copy()
    predictions["predicted_score"] = np.round(pred_score, 2)
    predictions["predicted_severity"] = pred_severity

    metrics = {
        "backend": "sklearn_random_forest",
        "rows": int(len(data)),
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "score_metrics": regression_metrics(test_df["target_score"].to_numpy(), pred_score),
        "severity_accuracy": round(float(accuracy_score(test_df["target_severity"], pred_severity)), 3),
        "severity_report": classification_report(
            test_df["target_severity"],
            pred_severity,
            output_dict=True,
            zero_division=0,
        ),
        "label_source_counts": data["label_source"].value_counts().to_dict(),
        "severity_counts": data["target_severity"].value_counts().to_dict(),
    }

    model_bundle = {
        "regressor": regressor,
        "classifier": classifier,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    dump(model_bundle, output_dir / "agrishield_risk_model.joblib")

    return metrics, predictions, model_bundle


def train_with_numpy_fallback(data: pd.DataFrame, output_dir: Path) -> tuple[dict[str, Any], pd.DataFrame, dict[str, Any]]:
    encoded = pd.get_dummies(data[NUMERIC_FEATURES + CATEGORICAL_FEATURES], drop_first=False)
    x = encoded.to_numpy(dtype=float)
    y = data["target_score"].to_numpy(dtype=float)

    rng = np.random.default_rng(RANDOM_SEED)
    indices = rng.permutation(len(data))
    test_size = max(1, int(len(data) * 0.25))
    test_idx = indices[:test_size]
    train_idx = indices[test_size:]

    x_train = x[train_idx]
    y_train = y[train_idx]
    x_test = x[test_idx]
    y_test = y[test_idx]

    mean = x_train.mean(axis=0)
    std = x_train.std(axis=0)
    std[std == 0] = 1
    x_train_scaled = (x_train - mean) / std
    x_test_scaled = (x_test - mean) / std

    lambda_value = 1.0
    x_aug = np.c_[np.ones(len(x_train_scaled)), x_train_scaled]
    identity = np.eye(x_aug.shape[1])
    identity[0, 0] = 0
    weights = np.linalg.solve(x_aug.T @ x_aug + lambda_value * identity, x_aug.T @ y_train)

    pred_score = np.c_[np.ones(len(x_test_scaled)), x_test_scaled] @ weights
    pred_score = np.clip(pred_score, 0, 100)
    pred_severity = np.array([severity_from_score(score) for score in pred_score])

    test_df = data.iloc[test_idx].copy()
    predictions = test_df[
        [
            "event_name",
            "timestamp",
            "zone_id",
            "zone_name",
            "target_score",
            "target_severity",
            "weak_flood_score",
            "weak_typhoon_score",
            "label_source",
        ]
    ].copy()
    predictions["predicted_score"] = np.round(pred_score, 2)
    predictions["predicted_severity"] = pred_severity

    model_bundle = {
        "backend": "numpy_ridge_fallback",
        "feature_columns": encoded.columns.tolist(),
        "mean": mean.tolist(),
        "std": std.tolist(),
        "weights": weights.tolist(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    (output_dir / "agrishield_risk_model_fallback.json").write_text(
        json.dumps(model_bundle, indent=2),
        encoding="utf-8",
    )

    metrics = {
        "backend": "numpy_ridge_fallback",
        "sklearn_unavailable_reason": globals().get("SKLEARN_IMPORT_ERROR", "unknown"),
        "rows": int(len(data)),
        "train_rows": int(len(train_idx)),
        "test_rows": int(len(test_idx)),
        "score_metrics": regression_metrics(y_test, pred_score),
        "severity_accuracy": round(float(np.mean(test_df["target_severity"].to_numpy() == pred_severity)), 3),
        "label_source_counts": data["label_source"].value_counts().to_dict(),
        "severity_counts": data["target_severity"].value_counts().to_dict(),
    }

    return metrics, predictions, model_bundle


def predict_latest_with_model(
    latest: pd.DataFrame,
    model_bundle: Any,
    sklearn_backend: bool,
) -> np.ndarray:
    features = latest[NUMERIC_FEATURES + CATEGORICAL_FEATURES]

    if sklearn_backend:
        return model_bundle["regressor"].predict(features).clip(0, 100)

    encoded = pd.get_dummies(features, drop_first=False)
    for column in model_bundle["feature_columns"]:
        if column not in encoded:
            encoded[column] = 0
    encoded = encoded[model_bundle["feature_columns"]]

    x = encoded.to_numpy(dtype=float)
    mean = np.array(model_bundle["mean"])
    std = np.array(model_bundle["std"])
    weights = np.array(model_bundle["weights"])
    x_scaled = (x - mean) / std
    return np.clip(np.c_[np.ones(len(x_scaled)), x_scaled] @ weights, 0, 100)


def export_latest_for_app(
    source_frame: pd.DataFrame,
    model_bundle: Any,
    sklearn_backend: bool,
    output_dir: Path,
) -> dict[str, Any]:
    latest = (
        source_frame.sort_values("timestamp")
        .groupby("zone_id", as_index=False)
        .tail(1)
        .sort_values("zone_id")
        .copy()
    )
    latest_pred = predict_latest_with_model(latest, model_bundle, sklearn_backend)

    zones = []
    for row, predicted_score in zip(latest.to_dict(orient="records"), latest_pred):
        score = float(round(predicted_score, 2))
        zones.append(
            {
                "zoneId": row["zone_id"],
                "zoneName": row["zone_name"],
                "currentAdmin": row["current_admin"],
                "timestamp": row["timestamp"].isoformat(),
                "modelPredictedCompositeScore": score,
                "modelPredictedSeverity": severity_from_score(score),
                "weakCompositeScore": float(row["weak_composite_score"]),
                "weakFloodScore": float(row["weak_flood_score"]),
                "weakTyphoonScore": float(row["weak_typhoon_score"]),
                "labelSource": row["label_source"],
            }
        )

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "modelPurpose": "AgriShield district-scale advisory risk baseline",
        "claimBoundary": "Decision-support indicator; no commune or village precision claimed.",
        "zones": zones,
    }

    (output_dir / "risk_export_for_app.json").write_text(
        json.dumps(payload, indent=2),
        encoding="utf-8",
    )
    return payload


def write_model_card(metrics: dict[str, Any], output_dir: Path) -> None:
    model_card = f"""# AgriShield Risk Model Card

## Intended Use

District-scale advisory risk scoring for rice-focused climate resilience demos.

## Current Label Source

The default target is a weak rule label generated from transparent flood and typhoon scoring. If `observed_impact_score` is supplied in `hazard_observations.csv`, the pipeline uses that value as the target for those rows.

## Backend

`{metrics["backend"]}`

## Validation Snapshot

- Rows: {metrics["rows"]}
- Train rows: {metrics["train_rows"]}
- Test rows: {metrics["test_rows"]}
- MAE: {metrics["score_metrics"]["mae"]}
- RMSE: {metrics["score_metrics"]["rmse"]}
- Severity accuracy: {metrics["severity_accuracy"]}

## Limits

- This model is not an official warning system.
- The current sample data is small and weakly labeled.
- Production requires official forecast feeds, verified historical impacts, and local hydromet validation.
- No commune-level or village-level precision is claimed.
"""
    (output_dir / "model_card.md").write_text(model_card, encoding="utf-8")


def main() -> None:
    input_dir, output_dir = resolve_paths()
    print(f"Input directory: {input_dir}")
    print(f"Output directory: {output_dir}")

    source = add_engineered_features(load_source_data(input_dir))
    training = add_engineered_features(augment_weak_label_data(source))

    if SKLEARN_AVAILABLE:
        metrics, predictions, model_bundle = train_with_sklearn(training, output_dir)
        sklearn_backend = True
    else:
        metrics, predictions, model_bundle = train_with_numpy_fallback(training, output_dir)
        sklearn_backend = False

    predictions.to_csv(output_dir / "predictions.csv", index=False)
    source.to_csv(output_dir / "processed_source_panel.csv", index=False)
    (output_dir / "training_metrics.json").write_text(
        json.dumps(metrics, indent=2),
        encoding="utf-8",
    )
    export_latest_for_app(source, model_bundle, sklearn_backend, output_dir)
    write_model_card(metrics, output_dir)

    print(json.dumps(metrics, indent=2))
    print("Artifacts written:")
    for path in sorted(output_dir.iterdir()):
        print(f"- {path}")


if __name__ == "__main__":
    main()
