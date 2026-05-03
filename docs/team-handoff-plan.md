# AgriShield Team Handoff Plan

Trang thai: 2026-05-03

Tai lieu nay tong hop nhung gi da lam, nhung gi con thieu, va cach chia viec cho team 4 nguoi de tiep tuc phat trien AgriShield cho Asian Hackathon for Green Future 2026, Track 3: Water Resources and Climate-Resilient Agriculture.

## 1. Muc tieu san pham

AgriShield la demo web app ho tro ra quyet dinh cho nong nghiep lua truoc rui ro mua lon, ngap lut, va bao.

Product story hien tai:

> Bien tin hieu rui ro khi hau thanh diem rui ro de hieu, giai thich duoc, va checklist hanh dong 24-72 gio cho nong dan/vung canh tac lua o mien Trung Viet Nam.

Pham vi demo:

- Pilot area: Da Nang City moi, bao gom mot so vung nong nghiep thuoc Quang Nam cu, va Hue City.
- Su dung "district-scale advisory zones" thay vi claim chinh quyen cap huyen, vi cap huyen da thay doi sau cai cach hanh chinh 2025.
- Khong claim do chinh xac cap xa/lang/thon.
- Khong thay the canh bao chinh thuc.
- App hien la decision-support prototype.

## 2. Nhung gi da lam duoc

### 2.1 Repo va deploy

- Da tao public GitHub repo:
  - https://github.com/HohoHocCode/agrishield-demo
- Da deploy public demo:
  - https://agrishield-demo.vercel.app
- Branch chinh:
  - `main`
- Commit moi nhat tai thoi diem handoff:
  - `4a70a64 Add real data preparation pipeline`

Luu y:

- Vercel production deploy da hoat dong.
- GitHub auto-deploy cua Vercel truoc do chua duoc xu ly triet de, nen khi can cap nhat production co the van can deploy thu cong bang Vercel CLI.

### 2.2 Web demo da co

Tech stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Static TypeScript data
- Rule engine thuan TypeScript
- `npm`

Man hinh/chuc nang hien tai:

- Current Risk Map:
  - Chon advisory zone tren ban do demo.
  - Xem composite risk score theo vung.
- Risk Detail:
  - Diem heavy rain/flood.
  - Diem typhoon.
  - Giai thich driver va confidence notes.
- Action Checklist:
  - Chon rice crop stage.
  - Sinh checklist 24-72h theo rui ro va giai doan lua.
- Time Machine:
  - Replay Typhoon Noru 2022 qua cac moc T-72, T-48, T-24, landfall, T+24.
- Mock Alert Preview:
  - Tao tin nhan tieng Viet cho nong dan dua tren selected zone va actions.
- AI Model Snapshot:
  - Hien ket qua baseline model train tren Kaggle.
  - So sanh AI model score voi rule engine score.
  - Hien metrics nhu MAE, RMSE, severity accuracy.

File frontend quan trong:

- `src/components/agrishield-dashboard.tsx`
- `src/lib/agrishield/data.ts`
- `src/lib/agrishield/engine.ts`
- `src/lib/agrishield/types.ts`
- `src/lib/agrishield/model-snapshot.ts`

### 2.3 Rule engine da co

Rule engine hien tinh:

- flood/heavy rain score
- typhoon score
- composite score
- severity label
- explanation
- confidence notes
- action checklist
- Vietnamese alert text

Y nghia:

- Day la baseline explainable layer.
- Model AI ban dau hoc tu weak labels cua rule engine khi chua co label thiet hai that.
- Khi co observed labels that, pipeline se uu tien observed labels.

### 2.4 Kaggle AI baseline da co

Da tao Kaggle workspace:

- `kaggle/AgriShield_Kaggle_Core_Baseline.ipynb`
- `kaggle/agrishield_kaggle_core.py`
- `kaggle/sample_data/advisory_zones.csv`
- `kaggle/sample_data/hazard_observations.csv`
- `kaggle/requirements.txt`
- `kaggle/README.md`

Notebook/script baseline lam cac viec:

1. Load `advisory_zones.csv`.
2. Load `hazard_observations.csv`.
3. Engineer features ve mua, bao, exposure, timing.
4. Tao weak labels neu `observed_impact_score` con trong.
5. Train baseline model:
   - RandomForestRegressor cho risk score neu sklearn co san.
   - RandomForestClassifier cho severity neu sklearn co san.
   - Numpy ridge fallback neu runtime thieu sklearn/joblib.
6. Export:
   - `risk_export_for_app.json`
   - `training_metrics.json`
   - `predictions.csv`
   - `processed_source_panel.csv`
   - `model_card.md`
   - model artifact `.joblib` neu co sklearn

Ket qua Kaggle da tung duoc tich hop vao app:

- Backend: `sklearn_random_forest`
- Rows: 270
- Train rows: 202
- Test rows: 68
- MAE: 2.885
- RMSE: 3.625
- Severity accuracy: 0.882
- Label source: weak rule labels

### 2.5 Real-data preparation pipeline da co

Da tao pipeline de chuan bi du lieu that truoc khi train:

- `kaggle/AgriShield_Real_Data_Preparation.ipynb`
- `kaggle/agrishield_real_data_prep.py`
- `kaggle/data_contracts/`

Muc dich:

- Nhan cac bang du lieu that neu team thu thap duoc.
- Merge vao hazard panel hien co.
- Tao folder ready de train lai model.

Input bat buoc:

- `advisory_zones.csv`
- `hazard_observations.csv`

Input tuy chon nhung nen co:

- `rainfall_daily.csv`
- `storm_track_points.csv`
- `event_labels.csv`

Output:

- `/kaggle/working/agrishield_real_data_ready/advisory_zones.csv`
- `/kaggle/working/agrishield_real_data_ready/hazard_observations.csv`
- `/kaggle/working/agrishield_real_data_ready/data_quality_report.json`
- `/kaggle/working/agrishield_real_data_ready/README_next_training.md`
- `/kaggle/working/agrishield_real_data_ready.zip`

### 2.6 Data contracts da co

Trong `kaggle/data_contracts/` da co template:

- `rainfall_daily_template.csv`
- `storm_track_points_template.csv`
- `event_labels_template.csv`
- `source_manifest_template.csv`
- `README.md`

Y nghia tung file:

- `rainfall_daily.csv`: mua theo ngay, theo advisory zone.
- `storm_track_points.csv`: track bao theo timestamp.
- `event_labels.csv`: label thiet hai/impact that theo event va zone.
- `source_manifest.csv`: ghi ro nguon data, license/terms, ngay truy cap, note.

### 2.7 Tai lieu competition da co

Trong `docs/`:

- `pitch-30s.md`: pitch ngan.
- `demo-script-3min.md`: kich ban demo.
- `judge-qna.md`: cau hoi/tra loi cho judges.
- `roadmap-v2.md`: roadmap.
- `core-ai-data-plan.md`: plan AI/data core.
- `real-data-upgrade-plan.md`: plan nang cap bang data that.
- `team-handoff-plan.md`: tai lieu handoff nay.

## 3. Nhung gi chua lam duoc

### 3.1 Chua co data thiet hai that du manh

Model hien da co khung train, nhung chua co nhieu observed labels.

Thieu quan trong nhat:

- `event_labels.csv` voi `observed_impact_score` theo tung zone.
- Nguon bao cao thiet hai ro rang.
- Ghi chu cach convert bao cao thanh diem 0-100.

Day la viec quan trong nhat neu muon judges tin rang AI layer co duong phat trien that.

### 3.2 Chua co live weather feed

App hien khong goi API thoi tiet live.

Ly do:

- V1 uu tien demo on dinh.
- Khong can API key.
- Giam rui ro loi khi thuyet trinh.

Co the them sau bang NASA POWER, forecast API, hoac hydromet partner feed.

### 3.3 Chua co Sentinel-1 flood extent

Da co roadmap cho Sentinel-1/ASF/Copernicus, nhung chua xu ly SAR.

Ly do:

- Can account/download workflow.
- Can xu ly anh SAR phuc tap.
- Khong phu hop lam gap neu muc tieu la demo competition V1.

### 3.4 Chua co production backend

Khong co:

- FastAPI
- database
- PostGIS
- Google Earth Engine
- model serving endpoint
- chatbot

Day la chu y co chu dich cho V1: demo gon, explainable, de deploy.

## 4. Data can lay tiep

### 4.1 Rainfall data

Nguon de lay:

- NASA POWER Daily API
- CHIRPS

Nen bat dau voi NASA POWER vi de extract theo toa do.

File can tao:

```text
rainfall_daily.csv
```

Cot can co:

- `date`
- `zone_id`
- `rainfall_mm`
- `rainfall_source`
- `source_url`
- `notes`

### 4.2 Storm track data

Nguon de lay:

- NOAA IBTrACS

File can tao:

```text
storm_track_points.csv
```

Cot can co:

- `event_name`
- `timestamp`
- `lat`
- `lng`
- `wind_kmh`
- `pressure_hpa`
- `track_source`
- `source_url`

### 4.3 Impact labels

Nguon de lay:

- Bao cao thiet hai sau bao Noru 2022.
- Bao cao dia phuong.
- Bao cao nong nghiep, ngap lut, so tan, dien tich anh huong.
- Field notes neu team co.

File can tao:

```text
event_labels.csv
```

Cot can co:

- `event_name`
- `zone_id`
- `event_start`
- `event_end`
- `observed_impact_score`
- `impact_label_source`
- `label_confidence`
- `crop_area_affected_ha`
- `flood_depth_cm`
- `damage_note`
- `source_url`

Day la file quan trong nhat de model bot phu thuoc vao weak labels.

## 5. Workflow tiep theo

### Phase 1: Thu thap data

Muc tieu:

- Co du 3 file data bo sung:
  - `rainfall_daily.csv`
  - `storm_track_points.csv`
  - `event_labels.csv`

Output:

- CSV dung schema trong `kaggle/data_contracts/`.
- Co source URL ro rang.
- Co note neu label la uoc luong.

Acceptance criteria:

- CSV doc duoc bang pandas.
- Tat ca `zone_id` khop voi `advisory_zones.csv`.
- Tat ca timestamp/date parse duoc.
- `observed_impact_score` nam trong 0-100.

### Phase 2: Chuan bi data tren Kaggle

Muc tieu:

- Tao dataset ready de train.

Lam:

1. Upload CSV len Kaggle dataset.
2. Chay `AgriShield_Real_Data_Preparation.ipynb`.
3. Kiem tra `data_quality_report.json`.
4. Neu `ready_for_training = true`, tiep tuc train.

Output:

- `agrishield_real_data_ready.zip`
- `hazard_observations.csv` da enrich
- `data_quality_report.json`

Acceptance criteria:

- Khong co missing required values.
- Observed label rows > 0.
- Weak-label rows remaining duoc giai thich ro.

### Phase 3: Train lai model

Muc tieu:

- Train lai model bang data ready.

Lam:

1. Chay `AgriShield_Kaggle_Core_Baseline.ipynb`.
2. Download outputs:
   - `risk_export_for_app.json`
   - `training_metrics.json`
   - `predictions.csv`
   - `model_card.md`
3. Doc model card va metrics.

Acceptance criteria:

- Notebook run all khong loi.
- Co `risk_export_for_app.json`.
- `training_metrics.json` co label source counts.
- Metrics khong duoc overclaim neu data con it.

### Phase 4: Tich hop vao web app

Muc tieu:

- Dua model snapshot moi vao UI.

Lam:

1. Cap nhat `src/lib/agrishield/model-snapshot.ts`.
2. Chay:

```bash
npm run lint
npm run build
```

3. Test UI:
   - zone selection
   - AI model snapshot
   - checklist
   - Time Machine
   - Vietnamese alert preview
4. Push GitHub.
5. Deploy production neu UI/data app thay doi.

Acceptance criteria:

- Build pass.
- Live app hien dung score moi.
- Khong co console error nghiem trong.
- Demo flow 3 phut chay tron.

### Phase 5: Pitch va judging package

Muc tieu:

- Bien technical work thanh cau chuyen de judges hieu.

Lam:

- Cap nhat `pitch-30s.md`.
- Cap nhat `demo-script-3min.md`.
- Cap nhat `judge-qna.md`.
- Them screenshot neu can.

Acceptance criteria:

- Team nao cung noi duoc 30-second pitch.
- Mot nguoi demo duoc trong 3 phut.
- Ca team thong nhat claim boundary.

## 6. Phan viec cho team 4 nguoi

### Person 1: Data Collector

Muc tieu:

- Lay rainfall va storm track data.

Viec can lam:

- Extract NASA POWER rainfall cho tat ca advisory zones.
- Extract NOAA IBTrACS track cho Typhoon Noru 2022.
- Chuan hoa thanh:
  - `rainfall_daily.csv`
  - `storm_track_points.csv`
  - `source_manifest.csv`

File can doc:

- `kaggle/data_contracts/rainfall_daily_template.csv`
- `kaggle/data_contracts/storm_track_points_template.csv`
- `kaggle/data_contracts/source_manifest_template.csv`

Deliverable:

- 3 CSV tren, gui cho ML/Kaggle owner.

Definition of done:

- CSV khong loi format.
- `zone_id` khop voi app.
- Co source URL.
- Co ngay truy cap source.

### Person 2: Impact Label Researcher

Muc tieu:

- Tao label thiet hai that de model co target tot hon.

Viec can lam:

- Tim bao cao Noru 2022 lien quan Da Nang, Quang Nam cu, Hue.
- Ghi lai evidence theo zone.
- Chuyen evidence thanh `observed_impact_score` 0-100.
- Dat `label_confidence` theo do chac chan.

File can doc:

- `kaggle/data_contracts/event_labels_template.csv`
- `kaggle/data_contracts/README.md`
- `docs/real-data-upgrade-plan.md`

Deliverable:

- `event_labels.csv`
- Mot file note ngan giai thich tung score lay tu dau.

Definition of done:

- Moi label co source hoac note.
- Khong invent exact crop loss neu source khong co.
- `observed_impact_score` trong 0-100.
- `label_confidence` hop ly.

### Person 3: ML/Kaggle Owner

Muc tieu:

- Chay pipeline data prep va train model.

Viec can lam:

- Tao Kaggle dataset tu output cua Person 1 va Person 2.
- Chay `AgriShield_Real_Data_Preparation.ipynb`.
- Kiem tra `data_quality_report.json`.
- Chay `AgriShield_Kaggle_Core_Baseline.ipynb`.
- Download artifacts.

File can doc:

- `kaggle/README.md`
- `kaggle/AgriShield_Real_Data_Preparation.ipynb`
- `kaggle/AgriShield_Kaggle_Core_Baseline.ipynb`
- `docs/core-ai-data-plan.md`

Deliverable:

- `risk_export_for_app.json`
- `training_metrics.json`
- `predictions.csv`
- `model_card.md`

Definition of done:

- Notebook run all thanh cong.
- `training_metrics.json` co `label_source_counts`.
- `risk_export_for_app.json` co du 6 zones.
- Model card noi ro limitation.

### Person 4: Frontend, Demo, QA

Muc tieu:

- Tich hop model output moi vao app va chuan bi demo.

Viec can lam:

- Cap nhat `src/lib/agrishield/model-snapshot.ts` tu `risk_export_for_app.json` va `training_metrics.json`.
- Chay lint/build.
- Kiem tra demo flow.
- Cap nhat pitch/demo docs neu score/story thay doi.

File can doc:

- `src/components/agrishield-dashboard.tsx`
- `src/lib/agrishield/model-snapshot.ts`
- `docs/demo-script-3min.md`
- `docs/judge-qna.md`

Deliverable:

- App local build pass.
- GitHub commit/PR.
- Screenshot hoac short recording neu can.

Definition of done:

- `npm run lint` pass.
- `npm run build` pass.
- AI snapshot hien score moi.
- Alert preview van dung tieng Viet.
- Demo flow khong bi overlap UI tren desktop/mobile.

## 7. Vai tro cua team lead

Team lead nen lam cac viec:

- Quyet dinh label nao du tin cay de dua vao model.
- Review CSV truoc khi Kaggle train.
- Review `model_card.md` de tranh overclaim.
- Merge/push code.
- Deploy production khi can.
- Chot cau chuyen pitch.

Team lead khong nen om het data collection, Kaggle, frontend cung luc. Nen de moi nguoi co deliverable ro rang.

## 8. Timeline goi y 3 ngay

### Ngay 1

- Person 1: xong rainfall + storm track draft.
- Person 2: xong event labels draft.
- Person 3: tao Kaggle dataset va chay thu prep pipeline bang draft CSV.
- Person 4: doc demo flow, test app, note bug/UI issue neu co.

### Ngay 2

- Person 1: fix data/source manifest.
- Person 2: fix labels va confidence.
- Person 3: train model chinh thuc, export artifacts.
- Person 4: tich hop model snapshot moi vao app.

### Ngay 3

- Ca team: review demo.
- Person 4: polish UI/docs neu can.
- Team lead: deploy production.
- Ca team: tap pitch 30s va demo 3 phut.

## 9. Claim boundary khi thuyet trinh

Nen noi:

> AgriShield hien la advisory-zone decision-support prototype. AI layer la baseline model duoc train bang observed labels neu co, ket hop weak labels tu rule engine minh bach. San pham khong thay the canh bao chinh thuc va khong claim do chinh xac cap xa/lang.

Khong nen noi:

- Model du bao chinh xac thiet hai mua mang.
- Model la he thong canh bao chinh thuc.
- Model co do chinh xac cap thon/lang.
- App co live operational weather feed neu chua tich hop.
- Sentinel-1 flood detection da xong neu chua co pipeline.

## 10. Lenh can nho

Chay app local:

```bash
npm install
npm run dev
```

Kiem tra truoc khi push:

```bash
npm run lint
npm run build
```

Kaggle outputs can tai ve sau training:

```text
risk_export_for_app.json
training_metrics.json
predictions.csv
model_card.md
```

## 11. Thu muc quan trong

```text
src/components/agrishield-dashboard.tsx
src/lib/agrishield/
kaggle/
kaggle/data_contracts/
docs/
```

Neu teammate moi chi co 20 phut de onboard, hay doc theo thu tu:

1. `README.md`
2. `docs/team-handoff-plan.md`
3. `docs/demo-script-3min.md`
4. `kaggle/README.md`
5. `kaggle/data_contracts/README.md`
