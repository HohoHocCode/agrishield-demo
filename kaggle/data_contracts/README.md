# AgriShield Real-Data Contracts

These CSV templates define the next data layer for AgriShield. Keep the file
names below when uploading a real-data Kaggle dataset:

- `rainfall_daily.csv`
- `event_labels.csv`
- `storm_track_points.csv`
- `source_manifest.csv`

Only `advisory_zones.csv` and `hazard_observations.csv` are required. The three
real-data tables are optional, so the preparation script can run as soon as one
new data source is available.

## Minimum Useful Upgrade

The fastest improvement is `event_labels.csv`: add one row per event and zone
with an `observed_impact_score` from a verified report, field note, or partner
assessment. The baseline model will then train on real labels for those rows and
weak rule labels for the remaining rows.

## Scoring Guidance

Use `observed_impact_score` from 0 to 100:

- 0-39: low or no meaningful agricultural impact.
- 40-64: guarded, localized flooding or operational disruption.
- 65-84: high, significant rice-field impact or urgent intervention.
- 85-100: severe, major flood/wind impact or widespread crop risk.

Do not invent exact loss numbers. If the source is qualitative, use a bounded
score and set `label_confidence` below `0.7`.

## Suggested Public Data Sources

- Rainfall: CHIRPS from the UC Santa Barbara Climate Hazards Center, or NASA POWER daily precipitation.
- Storm tracks: NOAA IBTrACS for historical cyclone best-track points.
- Flood extent: Sentinel-1 SAR from Copernicus Data Space or NASA ASF DAAC.
- Impact labels: official disaster reports, local extension-service reports, or field-verified partner notes.

Every row should preserve the source in `source_url` or `impact_label_source`.
