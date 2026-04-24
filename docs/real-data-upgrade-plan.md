# AgriShield Real-Data Upgrade Plan

## Purpose

The current AI layer is a baseline trained mostly from weak labels. The next
upgrade is to add a small, defensible real-data layer without overbuilding the
stack.

The immediate target is not a production disaster model. The target is a better
competition demo where judges can see a clear path from:

1. hazard observations,
2. observed impact labels,
3. model training,
4. app-facing advisory output.

## What Was Added

The `kaggle/` workspace now includes:

- `agrishield_real_data_prep.py`
- `AgriShield_Real_Data_Preparation.ipynb`
- `data_contracts/`

The preparation pipeline accepts optional real-data tables and exports:

```text
/kaggle/working/agrishield_real_data_ready/
  advisory_zones.csv
  hazard_observations.csv
  data_quality_report.json
  README_next_training.md
```

It also creates:

```text
/kaggle/working/agrishield_real_data_ready.zip
```

## Minimum Dataset To Collect Next

### 1. Event Labels

File name:

```text
event_labels.csv
```

One row per event and advisory zone.

Critical columns:

- `event_name`
- `zone_id`
- `observed_impact_score`
- `impact_label_source`
- `label_confidence`
- `damage_note`

This is the highest-value table because it replaces weak labels with observed
impact labels for the rows where evidence exists.

### 2. Daily Rainfall

File name:

```text
rainfall_daily.csv
```

One row per date and advisory zone.

Critical columns:

- `date`
- `zone_id`
- `rainfall_mm`
- `rainfall_source`

Optional but useful:

- `rainfall_normal_72h_mm`

The preparation script derives `observed_rain_72h_mm` from rolling 3-day totals.

### 3. Storm Tracks

File name:

```text
storm_track_points.csv
```

One row per storm track timestamp.

Critical columns:

- `event_name`
- `timestamp`
- `lat`
- `lng`
- `wind_kmh`
- `track_source`

The preparation script computes advisory-zone distance to the closest track
point and can fill missing `storm_distance_km` or `storm_wind_kmh`.

## Public Source Candidates

- CHIRPS rainfall from the UC Santa Barbara Climate Hazards Center:
  https://www.chc.ucsb.edu/data/chirps3
- NASA POWER daily precipitation API:
  https://power.larc.nasa.gov/api/pages/
- NOAA NCEI IBTrACS tropical cyclone best-track data:
  https://www.ncei.noaa.gov/products/international-best-track-archive
- Sentinel-1 SAR access through NASA Earthdata / ASF:
  https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/sentinel-1
- Copernicus Data Space Sentinel data access:
  https://dataspace.copernicus.eu/ecosystem/services/data-download

## Kaggle Workflow

1. Create or update a Kaggle dataset with:
   - `advisory_zones.csv`
   - `hazard_observations.csv`
   - optional `rainfall_daily.csv`
   - optional `event_labels.csv`
   - optional `storm_track_points.csv`
2. Upload or attach `AgriShield_Real_Data_Preparation.ipynb`.
3. Upload or attach the repo scripts:
   - `agrishield_real_data_prep.py`
   - `agrishield_kaggle_core.py`
4. Run the preparation notebook.
5. Inspect `data_quality_report.json`.
6. Run the optional training cell, or use the generated ready folder as the
   input dataset for `AgriShield_Kaggle_Core_Baseline.ipynb`.
7. Download:
   - `risk_export_for_app.json`
   - `training_metrics.json`
   - `predictions.csv`
   - `model_card.md`

## Claim Boundary

Until the dataset contains verified impact labels across multiple events, say:

> The AI model is a baseline decision-support layer calibrated with available
> observed labels and transparent weak labels. It does not replace official
> warnings and does not claim village-level precision.

Do not say:

- The model predicts exact crop loss.
- The model is official disaster guidance.
- The model works at commune or village precision.
- The model is validated across all Vietnam climate hazards.
