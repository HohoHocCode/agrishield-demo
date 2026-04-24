# AgriShield Kaggle Core Workspace

This folder prepares the AI/data-processing core for AgriShield. It is designed to run as a Kaggle notebook script while staying aligned with the current web demo.

## Goal

Move from static demo scores toward a reproducible model pipeline:

1. Load advisory-zone metadata and hazard observations.
2. Engineer flood, typhoon, exposure, and crop-context features.
3. Generate transparent weak labels from the current rule engine when real labels are not available.
4. Train a baseline risk-score model and severity classifier.
5. Export predictions and `risk_export_for_app.json` for later integration into the Next.js app.

## Kaggle Setup

Create a Kaggle notebook and add this repo folder as uploaded files, or copy `agrishield_kaggle_core.py` into a notebook cell.

Expected input folder on Kaggle:

```text
/kaggle/input/agrishield-core/
  advisory_zones.csv
  hazard_observations.csv
```

If the Kaggle input folder is not present, the script falls back to:

```text
kaggle/sample_data/
```

Outputs are written to:

```text
/kaggle/working/agrishield_outputs/
```

Locally, outputs are written to:

```text
kaggle/working/agrishield_outputs/
```

## Files

- `AgriShield_Kaggle_Core_Baseline.ipynb`: self-contained Kaggle notebook for training and exporting artifacts.
- `agrishield_kaggle_core.py`: Kaggle-ready baseline pipeline.
- `sample_data/advisory_zones.csv`: v1 pilot zone metadata.
- `sample_data/hazard_observations.csv`: sample Noru-style hazard panel.

## Fastest Kaggle Flow

1. Open Kaggle.
2. Create a new notebook.
3. Upload `AgriShield_Kaggle_Core_Baseline.ipynb`.
4. Run all cells.
5. Download artifacts from `/kaggle/working/agrishield_outputs/`.

The notebook is self-contained. If you do not attach any Kaggle dataset, it will train on the embedded sample data. If you attach a dataset named `agrishield-core` containing `advisory_zones.csv` and `hazard_observations.csv`, it will use that dataset instead.

## Important Claim Boundary

This is a baseline decision-support model, not a production warning system. The current label source is weak supervision from the transparent rule engine. Real deployment should replace or calibrate labels with observed flood extent, verified damage reports, official warnings, and partner hydromet data.
