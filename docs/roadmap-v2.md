# AgriShield Roadmap V2

## Immediate Polish

- Add a demo reset button and scenario presets.
- Add source notes inside the UI for public datasets and demo assumptions.
- Add a compact mobile demo mode for video recording.
- Fix Vercel GitHub integration so every push to `main` auto-deploys.

## Data Realism

- Replace static rainfall and typhoon signals with public forecast snapshots.
- Add official hydromet source slots where partner data can be plugged in.
- Add real district/advisory-zone boundary files after source verification.
- Add one validation note for Typhoon Noru 2022 using historical rainfall and flood reports.

## Product Expansion

- Add a cooperative/admin queue view for prioritized alert sending.
- Add mock Zalo/SMS distribution status.
- Add coffee or pepper only after rice action rules are strong.
- Add compare-zones mode for extension officers.

## Technical Expansion

- Move static data into a simple API layer only when live data ingestion starts.
- Add PostGIS/Supabase after real geospatial boundaries are selected.
- Keep Hugging Face/AI as a stretch feature for FAQ retrieval, not core risk scoring.

## Do Not Do Yet

- Do not claim commune or village precision.
- Do not add more hazards before the current two-hazard flow is polished.
- Do not build a chatbot before the core demo and proposal package are complete.
- Do not spend time on SAR overlays unless Time Machine is already presentation-ready.
