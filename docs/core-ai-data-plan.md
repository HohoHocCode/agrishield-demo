# AgriShield Core AI & Data Plan

## Objective

Move AgriShield from static demo scoring toward a reproducible data/model pipeline that can be trained on Kaggle and later exported back into the web app.

The first core model should not overclaim. It should be a baseline risk model that learns from transparent weak labels and prepares the project for better labels later.

## V1 Kaggle Pipeline

The prepared Kaggle workspace lives in `kaggle/`.

It does the following:

- Loads `advisory_zones.csv` and `hazard_observations.csv`.
- Builds flood, typhoon, exposure, and timing features.
- Generates weak labels using the current transparent rule engine.
- Trains a baseline model for composite risk score and severity class.
- Exports predictions, metrics, a model card, and `risk_export_for_app.json`.

## Input Tables

### `advisory_zones.csv`

One row per advisory zone.

Important columns:

- `zone_id`
- `zone_name`
- `current_admin`
- `lat`, `lng`
- `rice_area_ha`
- `floodplain_exposure`
- `coastal_wind_exposure`
- `drainage_stress`
- `elevation_min_m`, `elevation_max_m`

### `hazard_observations.csv`

One row per zone and timestamp.

Important columns:

- `event_name`
- `timestamp`
- `zone_id`
- `forecast_rain_72h_mm`
- `rainfall_anomaly_pct`
- `soil_saturation_pct`
- `storm_distance_km`
- `storm_wind_kmh`
- `lead_time_hours`
- `observed_impact_score` optional

If `observed_impact_score` is blank, the pipeline uses weak labels from the current rule engine.

## Model Strategy

### Baseline

Use tabular ML, not deep learning:

- Random Forest regressor for risk score.
- Random Forest classifier for severity.
- Numpy ridge fallback if scikit-learn is unavailable.

This is easier to explain, works with small data, and produces a model card quickly.

### Upgrade Path

After the demo:

- Replace weak labels with observed flood extent or verified damage scores.
- Add more historical events beyond Typhoon Noru 2022.
- Use time-based validation: train on older events, test on later events.
- Compare against the rule engine, not just random baselines.
- Add calibrated uncertainty before showing model results to users.

## Data Sources To Add Later

- Storm tracks: IBTrACS or official typhoon bulletins.
- Rainfall: CHIRPS, NASA POWER, ERA5, or national hydromet feeds.
- Flood proxy: Sentinel-1 SAR flood extent for selected events.
- Boundaries: verified Vietnam administrative/advisory boundaries.
- Crop calendar: MARD/local extension service guidance.

## Output Contract For Web App

The key artifact is:

```text
kaggle/working/agrishield_outputs/risk_export_for_app.json
```

Expected shape:

```json
{
  "generatedAt": "...",
  "modelPurpose": "AgriShield district-scale advisory risk baseline",
  "claimBoundary": "Decision-support indicator; no commune or village precision claimed.",
  "zones": [
    {
      "zoneId": "da-nang-thang-binh-coastal",
      "modelPredictedCompositeScore": 84.2,
      "modelPredictedSeverity": "high",
      "weakCompositeScore": 85,
      "weakFloodScore": 90,
      "weakTyphoonScore": 72
    }
  ]
}
```

The Next.js app can later read this JSON and switch from static demo inputs to model-produced risk snapshots.

## What Not To Claim Yet

- Do not call the model production-grade.
- Do not claim village-level precision.
- Do not claim direct crop loss prediction until real crop damage labels exist.
- Do not replace official warnings; frame it as decision support.
