# AgriShield 3-Minute Demo Script

## 0:00-0:25 - Problem

"AgriShield is built for Track 3: Water Resources and Climate-Resilient Agriculture. In Central Vietnam, official warnings may say that heavy rain or a typhoon is coming, but farmers still need a more practical answer: what should I do for my rice field in the next 24 to 72 hours?"

"Our v1 focuses on one narrow, honest scope: district-scale advisory zones, two hazards, and rice."

## 0:25-0:55 - Current Risk Map

Click a high-risk zone such as `Thang Binh` or `Dai Loc`.

"The map shows advisory-zone risk, not village-level precision. Each zone has a composite score and a clear claim boundary. We use Da Nang and Hue as pilot regions, including former Quang Nam agricultural areas now represented as advisory zones."

## 0:55-1:30 - Risk Detail

Point to heavy rain/flood and typhoon cards.

"The risk engine is rule-based and explainable. Here, the score is driven by forecast rainfall, rainfall anomaly, soil saturation, storm distance, lead time, wind proxy, and local exposure. We use weighted-max aggregation so the strongest hazard is not hidden by averaging."

"This is a decision-support indicator, not a replacement for official warnings."

## 1:30-2:10 - Agriculture Action Layer

Change the rice stage from `Heading` to `Harvest`.

"The differentiator is the action layer. A risk score alone is not enough. The system maps hazard severity and rice growth stage to practical checklist items. For ripening rice, the top action may be run-before-storm harvesting. For heading rice, the action shifts to drainage, lodging reduction, and disease watch."

## 2:10-2:40 - Time Machine

Click `T-72`, `T-24`, then `Landfall`.

"The Time Machine replays Typhoon Noru 2022 as a product story. It shows how advisory risk would rise before landfall and how the system would have helped prioritize zones and actions before the event peaked."

## 2:40-3:00 - Last-Mile Alert

Point to the Vietnamese alert preview.

"Finally, AgriShield turns the selected zone, crop stage, and action checklist into a short farmer-facing Vietnamese message. This is the last-mile gap we are solving: not just knowing risk, but communicating what to do next."

"Next, production would connect official forecast feeds, hydromet partners, and Zalo/SMS distribution."
