# AgriShield App Spec

Trang thai: 2026-05-03

## 1. One-line Summary

AgriShield la web app demo ho tro canh bao va hanh dong nong nghiep cho vung canh tac lua truoc rui ro mua lon, ngap lut, va bao o mien Trung Viet Nam.

## 2. Product Purpose

Muc dich cua app la bien cac tin hieu khi hau kho hieu thanh:

- diem rui ro de doc,
- ly do vi sao rui ro cao/thap,
- checklist hanh dong 24-72 gio,
- tin nhan tieng Viet co the gui cho nong dan.

App duoc build cho Asian Hackathon for Green Future 2026, Track 3: Water Resources and Climate-Resilient Agriculture.

## 3. Problem Statement

Nong dan va can bo khuyen nong thuong khong chi can biet "sap co mua lon" hay "bao dang den". Ho can biet:

- Vung nao dang uu tien can xu ly?
- Rui ro den tu mua/ngap hay gio bao?
- Lua dang o giai doan nao thi nen lam gi?
- Nen hanh dong trong 24h, 48h, hay 72h?
- Tin nhan gui cho nong dan nen viet nhu the nao?

AgriShield giai quyet khoang trong giua hazard signal va farm action.

## 4. Target Users

### Primary Users

- Can bo khuyen nong.
- Nhom dieu phoi hop tac xa.
- Local disaster/agriculture support teams.
- Hackathon judges xem demo san pham.

### Secondary Users

- Nong dan nhan alert tieng Viet.
- NGO/partner teams quan tam climate-resilient agriculture.
- Data/AI team can validate risk model.

## 5. V1 Scope

### Geography

Pilot region:

- Da Nang City moi.
- Cac vung nong nghiep thuoc Quang Nam cu trong pham vi demo.
- Hue City.

App dung "district-scale advisory zones" thay vi claim cap huyen chinh thuc.

### Crop Scope

V1 chi tap trung vao lua.

Rice stages:

- seedling
- tillering
- booting
- flowering
- ripening

### Hazard Scope

V1 co 2 hazard chinh:

- heavy rain / flood
- typhoon / strong wind

### Historical Scenario

V1 Time Machine chi dung mot event:

- Typhoon Noru 2022

## 6. Core User Story

As an agricultural support officer, I want to select an advisory zone and rice stage, see the current flood/typhoon risk and reasoning, then generate a prioritized action checklist and Vietnamese farmer alert, so that I can communicate timely 24-72h guidance before or during a storm event.

## 7. Current V1 Features

### 7.1 Current Risk Map

Purpose:

- Cho user chon advisory zone.
- Cho thay composite risk score tren ban do demo.

Inputs:

- zone metadata
- static risk signals
- rule engine assessment

Outputs:

- selected zone
- composite risk score
- severity color

Acceptance criteria:

- User click duoc tung zone.
- Selected zone cap nhat Risk Detail, Action Checklist, AI Snapshot, Time Machine, Alert Preview.
- UI khong claim day la official GIS boundary.

### 7.2 Risk Detail

Purpose:

- Giai thich diem rui ro theo tung hazard.

Shows:

- heavy rain/flood score
- typhoon score
- composite score
- severity label
- reason breakdown
- confidence notes

Acceptance criteria:

- User hieu vi sao mot zone bi high risk.
- Score khong chi hien con so ma co driver giai thich.

### 7.3 Rice Action Checklist

Purpose:

- Bien risk score thanh viec can lam trong 24-72 gio.

Inputs:

- selected zone
- selected rice stage
- hazard severity

Outputs:

- 3-5 recommended actions
- urgency label: now, 24h, 48h, 72h
- rationale for each action

Acceptance criteria:

- Khi doi rice stage, checklist thay doi.
- Actions lien quan den lua, mua/ngap, va bao.
- Action text phu hop voi demo, khong overclaim clinical/agronomic precision.

### 7.4 Time Machine

Purpose:

- Cho judges thay app co the replay mot event lich su va giai thich risk evolution.

Event:

- Typhoon Noru 2022

Frames:

- T-72
- T-48
- T-24
- landfall
- T+24

Acceptance criteria:

- User chon duoc timeline frame.
- Map va narrative cap nhat theo frame.
- Selected zone score cap nhat theo frame.

### 7.5 Mock Alert Preview

Purpose:

- Tao farmer-facing message tieng Viet tu selected zone va checklist.

Outputs:

- Vietnamese alert text
- selected zone context
- top actions

Acceptance criteria:

- Alert text thay doi theo zone/action.
- Co the copy alert.
- Noi dung la mock preview, khong claim da gui that.

### 7.6 AI Model Snapshot

Purpose:

- Cho thay app da co baseline AI/data layer, khong chi la static UI.

Shows:

- model predicted composite score
- model predicted severity
- rule engine score
- delta vs rule engine
- training rows
- MAE
- RMSE
- severity accuracy
- label source
- claim boundary

Acceptance criteria:

- AI score hien theo selected zone.
- Metrics lay tu Kaggle output.
- UI noi ro model la baseline decision-support layer, khong phai official warning.

## 8. AI/Data Core Spec

### 8.1 Current Data Inputs

Required tables:

- `advisory_zones.csv`
- `hazard_observations.csv`

Optional real-data tables:

- `rainfall_daily.csv`
- `storm_track_points.csv`
- `event_labels.csv`
- `source_manifest.csv`

### 8.2 Advisory Zone Schema

Core fields:

- `zone_id`
- `zone_name`
- `current_admin`
- `legacy_admin`
- `lat`
- `lng`
- `rice_area_ha`
- `dominant_season`
- `floodplain_exposure`
- `coastal_wind_exposure`
- `drainage_stress`
- `elevation_min_m`
- `elevation_max_m`

### 8.3 Hazard Observation Schema

Core fields:

- `event_name`
- `timestamp`
- `zone_id`
- `forecast_rain_72h_mm`
- `rainfall_anomaly_pct`
- `soil_saturation_pct`
- `storm_distance_km`
- `storm_wind_kmh`
- `lead_time_hours`
- `observed_impact_score`

If `observed_impact_score` is blank, model training uses weak labels from the rule engine.

### 8.4 Model Pipeline

Current pipeline:

1. Load zone and hazard CSVs.
2. Engineer features.
3. Generate weak labels if observed labels are missing.
4. Train score model.
5. Train severity model.
6. Export app-facing JSON and metrics.

Training artifacts:

- `risk_export_for_app.json`
- `training_metrics.json`
- `predictions.csv`
- `processed_source_panel.csv`
- `model_card.md`
- `.joblib` model artifact when sklearn is available

### 8.5 Real-data Preparation Pipeline

Purpose:

- Merge optional real rainfall, storm track, and impact labels before training.

Input:

- required core CSVs
- optional real-data CSVs

Output:

- `/kaggle/working/agrishield_real_data_ready/`
- `agrishield_real_data_ready.zip`

Acceptance criteria:

- `data_quality_report.json` says `ready_for_training = true`.
- All `zone_id` values match known advisory zones.
- Observed labels are counted separately from weak labels.

## 9. App Architecture

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- Client-side dashboard component

### Data Layer

- Static TypeScript data for V1 demo.
- Kaggle output converted into TypeScript model snapshot.
- No database in V1.

### Logic Layer

- Rule engine in TypeScript.
- AI baseline trained in Kaggle.
- No live model endpoint in V1.

### Deployment

- GitHub repo: `HohoHocCode/agrishield-demo`
- Vercel production app: `https://agrishield-demo.vercel.app`

## 10. Non-goals For V1

V1 khong lam:

- official warning system
- commune/village-level precision
- live hydromet feed
- production GIS boundary
- PostGIS
- FastAPI backend
- chatbot
- Sentinel-1 SAR flood overlay
- automatic SMS/Zalo sending
- crop loss prediction
- multiple crops beyond rice

## 11. V1 Success Criteria

Demo duoc xem la thanh cong neu:

- Judges hieu problem trong 30 giay.
- User chon zone va rice stage duoc.
- App hien risk score + explanation + action checklist.
- Time Machine Noru 2022 chay duoc trong demo.
- Vietnamese alert preview ro rang.
- AI snapshot hien duoc model output va metrics.
- Team noi ro claim boundary.
- Build/deploy on dinh.

## 12. V1.1 Next Features

Priority order:

1. Collect rainfall from NASA POWER.
2. Collect storm track from NOAA IBTrACS.
3. Build `event_labels.csv` from verified impact reports.
4. Run real-data prep notebook.
5. Train model again on Kaggle.
6. Integrate new `risk_export_for_app.json`.
7. Add source notes in UI.
8. Fix Vercel GitHub auto-deploy.

## 13. V2 Feature Ideas

Only do these after V1/V1.1 is stable:

- Compare-zones mode for extension officers.
- Cooperative/admin queue for prioritized alerts.
- Mock Zalo/SMS distribution status.
- Verified geospatial boundaries.
- More historical events beyond Noru 2022.
- Additional crops after rice rules are stronger.
- API layer for live data ingestion.
- PostGIS/Supabase when real boundaries are selected.
- Sentinel-1 flood validation layer.

## 14. Claim Boundary

Recommended wording:

> AgriShield is an advisory-zone decision-support prototype for climate-resilient rice agriculture. It combines transparent rule-based risk scoring with a baseline AI model trained on available observed labels and weak labels. It does not replace official warnings and does not claim commune or village-level precision.

Avoid saying:

- The model predicts exact crop loss.
- The app is an official disaster warning system.
- The app has live operational weather data if current build uses static snapshots.
- The app provides village-level precision.
- Sentinel-1 flood detection is implemented if it is only in the roadmap.

## 15. Open Questions

- Which official or partner source will provide reliable crop impact labels?
- How many historical events should be added before claiming model validation?
- Should the next demo show source citations inside the UI?
- Should V1.1 keep static snapshots or add a lightweight API route?
- Who owns final label approval before retraining?

## 16. Key Files

```text
src/components/agrishield-dashboard.tsx
src/lib/agrishield/data.ts
src/lib/agrishield/engine.ts
src/lib/agrishield/model-snapshot.ts
kaggle/AgriShield_Kaggle_Core_Baseline.ipynb
kaggle/AgriShield_Real_Data_Preparation.ipynb
kaggle/data_contracts/
docs/team-handoff-plan.md
docs/demo-script-3min.md
```
