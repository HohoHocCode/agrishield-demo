# AgriShield Demo

AgriShield is a Next.js demo for the Asian Hackathon for Green Future 2026, Track 3: Water Resources and Climate-Resilient Agriculture.

The v1 demo focuses on one product story: convert multi-hazard risk signals into explainable rice-farming actions for Central Vietnam advisory zones.

## What V1 Includes

- Current risk map for Da Nang City and Hue City pilot advisory zones.
- Rule-based heavy rain/flood and typhoon scoring.
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

## References

- Asian Hackathon for Green Future 2026 announcement: https://foundationforgreenfuture.com/en/launch-of-the-asian-hackathon-for-green-future-2026/
- Project proposal guideline: https://foundationforgreenfuture.com/wp-content/uploads/2026/04/ASIAN-HACKATHON-FOR-GREEN-FUTURE-2026-PROJECT-PROPOSAL-GUIDELINE.pdf
- Rules and regulations: https://foundationforgreenfuture.com/wp-content/uploads/2026/04/17.04-ASIAN-HACKATHON-FOR-GREEN-FUTURE-2026_RULES-AND-REGULATIONS_Final.pdf
- Vietnam 2025 administrative reform context: https://www.vietnam-briefing.com/news/vietnams-government-introduces-official-plan-for-provincial-mergers.html
- Typhoon Noru rainfall context: https://en.baochinhphu.vn/super-typhoon-noru-causes-extreme-torrential-rains-111220928122529788.htm
