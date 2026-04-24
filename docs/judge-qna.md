# Judge Q&A Prep

## What exactly does AgriShield do?

AgriShield converts multi-hazard climate signals into rice-specific action checklists for Central Vietnam advisory zones. V1 covers heavy rain/flood and typhoon risk, one crop, and one historical replay event.

## Is this a real prediction model?

V1 is an explainable rule-based decision-support demo. It does not claim production-grade forecasting. The goal is to show a realistic product workflow that can later connect to official weather, hydromet, and geospatial datasets.

## Why not use AI or a black-box model?

The immediate bottleneck is not model complexity. It is converting available warnings into trusted local actions. A transparent rule engine is easier to explain to farmers, extension officers, and judges, and it avoids overclaiming where high-quality training labels are not available.

## Why use advisory zones instead of commune or village precision?

Vietnam's administrative structure changed in 2025, and public datasets are not reliable enough for village-level precision in this v1. AgriShield uses district-scale advisory zones as a practical planning unit while clearly stating the claim boundary.

## What data would production use?

Production would replace static demo signals with official and public feeds: short-term rainfall forecast, observed rainfall, storm track and intensity, soil moisture or saturation proxies, elevation, floodplain exposure, and crop calendar data.

## How is the composite risk score calculated?

The demo uses weighted-max aggregation: the strongest hazard carries most of the composite score, while the secondary hazard still contributes. This avoids hiding a severe typhoon or flood risk behind a simple average.

## Why is the action layer important?

Farmers and cooperatives need actions, not only scores. The same hazard requires different action depending on rice stage. Heading rice prioritizes drainage, lodging prevention, and disease watch; ripening rice may prioritize early harvest and drying capacity.

## How would this reach farmers?

V1 shows a Vietnamese alert preview. The next implementation step is a mock alert queue, followed by Zalo Mini App, SMS, or cooperative broadcast workflows.

## What is the biggest limitation of v1?

The data is static and designed for demo clarity. It proves the product workflow, not live operational accuracy. The next milestone is connecting official data feeds and validating against historical events.

## What makes this scalable?

The architecture separates zones, hazard scoring, crop stages, action rules, and alert generation. New crops, hazards, and provinces can be added without rewriting the whole product.
