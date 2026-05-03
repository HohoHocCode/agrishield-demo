# AgriShield Demo

AgriShield is a Next.js demo for the Asian Hackathon for Green Future 2026, Track 3: Water Resources and Climate-Resilient Agriculture.

The v1 demo focuses on one product story: convert multi-hazard risk signals into explainable rice-farming actions for Central Vietnam advisory zones.

## Live Demo

- Public app: https://agrishield-demo.vercel.app
- Source repo: https://github.com/HohoHocCode/agrishield-demo
- Recommended demo flow: choose a zone, switch rice stage, replay Typhoon Noru 2022, then read the Vietnamese alert preview.

## What V1 Includes

- Current risk map for Da Nang City and Hue City pilot advisory zones.
- Rule-based heavy rain/flood and typhoon scoring.
- Kaggle-trained baseline AI model snapshot for comparing model risk against rule-engine risk.
- Rice-only action checklist by crop stage.
- Vietnamese mock alert preview for farmer-facing communication.
- Typhoon Noru 2022 Time Machine replay across five moments.
- No external API keys, backend server, database, model endpoint, or geospatial service required.

## Claim Boundary

This project intentionally uses "district-scale advisory zones" instead of claiming official district-level government coverage. Vietnam's administrative structure changed in 2025, and this v1 does not claim commune, village, or production-grade precision.

The risk score is a transparent decision-support indicator and does not replace official warnings.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Static TypeScript data and pure scoring functions
- npm

## Competition Package

- [30-second pitch](docs/pitch-30s.md)
- [3-minute demo script](docs/demo-script-3min.md)
- [Judge Q&A prep](docs/judge-qna.md)
- [App spec](docs/app-spec.md)
- [Roadmap V2](docs/roadmap-v2.md)
- [Core AI and data plan](docs/core-ai-data-plan.md)
- [Real-data upgrade plan](docs/real-data-upgrade-plan.md)
- [Team handoff plan](docs/team-handoff-plan.md)

## Kaggle Core Workspace

The AI/data-processing baseline lives in [`kaggle/`](kaggle/).

It includes a Kaggle-ready script, sample advisory-zone data, sample hazard observations, weak-label generation, baseline model training, metrics, and `risk_export_for_app.json` export for future web-app integration.

The next data upgrade is also prepared there:

- `AgriShield_Real_Data_Preparation.ipynb`
- `agrishield_real_data_prep.py`
- `data_contracts/`

Use these files when the team has real rainfall, storm-track, or observed-impact rows to merge before training.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm run lint
npm run build
```

## Current Limitations

- Demo signals are static, not live operational weather feeds.
- The map is a lightweight advisory visualization, not official GIS boundaries.
- Vercel deployment works, but GitHub auto-deploy integration still needs dashboard-side connection.

## References

- Asian Hackathon for Green Future 2026 announcement: https://foundationforgreenfuture.com/en/launch-of-the-asian-hackathon-for-green-future-2026/
- Project proposal guideline: https://foundationforgreenfuture.com/wp-content/uploads/2026/04/ASIAN-HACKATHON-FOR-GREEN-FUTURE-2026-PROJECT-PROPOSAL-GUIDELINE.pdf
- Rules and regulations: https://foundationforgreenfuture.com/wp-content/uploads/2026/04/17.04-ASIAN-HACKATHON-FOR-GREEN-FUTURE-2026_RULES-AND-REGULATIONS_Final.pdf
- Vietnam 2025 administrative reform context: https://www.vietnam-briefing.com/news/vietnams-government-introduces-official-plan-for-provincial-mergers.html
- Typhoon Noru rainfall context: https://en.baochinhphu.vn/super-typhoon-noru-causes-extreme-torrential-rains-111220928122529788.htm
