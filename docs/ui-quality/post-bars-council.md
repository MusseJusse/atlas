# Council review after desktop presentation changes

Round 5 reviewed frozen implementation `a67c9f3`, including aligned markers, Pareto hover copy, desktop Bars/Ranking choice and full-height Bars.

| Category | DeepSeek | Sol | Kimi | Terra |
| --- | --- | --- | --- | --- |
| Navigation and discovery | 9.5 | 9.2 | 9.5 | 9 |
| Hierarchy and typography | 9.2 | 9.2 | 9.4 | 9 |
| Chart/data readability | 8.8 | 9 | 9.3 | 9 |
| Controls and feedback | 9.4 | 9.1 | 9.3 | 9 |
| Mobile responsiveness | 9.4 | 9.1 | 9.4 | 9 |
| Accessibility | 9.1 | 9 | 9.1 | 9 |
| Light/dark consistency | 9.4 | 9.2 | 9.4 | 9 |
| Overall | 9.1 | 9.1 | 9.3 | 9 |

Round 5 did not meet the every-category target. DeepSeek found clipped model names at 1280x640 and negative annotations whose vertical order contradicted magnitude. All four verified the frozen HEAD before and after. DeepSeek independently passed all 24 browser tests and performed live checks. Kimi independently passed type checking and 183 unit tests. Sol performed focused live checks. Terra inspected source and captures. None performed a screen-reader certification.

## Changes for round 6

At desktop heights of 700px or less, Bars uses the card's actual height with a lower minimum plot height. Standard and large desktop sizing are unchanged. Negative labels occupy a reserved band below the deepest bar, with shallower values placed no lower than deeper values and labels centered on their own bar. Time Bars now uses familiar duration intervals, matching Ranking.

- [Short desktop with visible model names](short-bars-labels-fixed.png)
- [Ordered negative annotations](signed-bars-labels-fixed.png)
- [Whole-minute duration ticks](time-bars-ticks-fixed.png)

Type checking, all 184 unit tests, build and all 25 production browser tests passed. New assertions cover the 640px label band, absent obstruction by the scroll cue, negative annotation order, bar-centered X positions, and whole-minute time ticks.

## Round 6 results

All four reviewed frozen `934b007`. Cells with two scores show Bars / Ranking.

| Category | DeepSeek | Sol | Kimi | Terra |
| --- | --- | --- | --- | --- |
| Navigation and discovery | 9.5 | 9.2 / 9.2 | 9.5 / 9.5 | 9 |
| Hierarchy and typography | 9.1 | 9.1 / 9.2 | 9.4 / 9.4 | 9 |
| Chart/data readability | 8.7 | 8.8 / 9.2 | 9.4 / 9.3 | 9 |
| Controls and feedback | 9.3 | 9.1 / 9.1 | 9.3 / 9.3 | 9 |
| Mobile responsiveness | 9.4 | 9.1 / 9.1 | 9.4 / 9.4 | 9 |
| Accessibility | 9.1 | 9 / 9 | 9.1 / 9.1 | 9 |
| Light/dark consistency | 9.4 | 9.2 / 9.2 | 9.4 / 9.3 | 9 |
| Overall | 8.9 | 9 / 9.1 | 9.4 / 9.3 | 9 |

The target was not met. Sol and DeepSeek independently measured positive value annotations overlapping the axis heading at short desktop heights. DeepSeek also reproduced it at 800px. Both confirmed the prior short-card, negative-order and duration-tick fixes. DeepSeek independently passed 184 unit tests, TypeScript checking and all 25 production Chromium tests; the existing tests missed this intersection. Kimi independently passed type checking and unit tests. Terra inspected source and screenshots. None performed a screen-reader audit.

## Changes for round 7

Positive annotations stop below the unit heading. Higher values take priority when annotations cannot all fit; hover, focus and pinning reveal an omitted value while clearing the other annotations in that model. The intended ordering guarantee did not hold in the real chart, as round 7 found below.

- [Intelligence at 1280x640](bounded-bars-short.png)
- [Omniscience at 1280x640](bounded-signed-short.png)
- [Omniscience at 1280x800](bounded-signed-standard.png)
- [Keyboard focus reveals an omitted value](bounded-focused-value.png)

Type checking, all 185 unit tests, production build and all 26 production Chromium tests passed. The added browser assertion checked all annotation bounds against the unit heading at 640px and 800px for both score views, then focused every bar and repeated the check. Its coverage did not catch positive annotation inversions.

## Round 7 results

All four reviewed frozen `dd4c0dc`. Every cell shows Bars / Ranking.

| Category | DeepSeek | Sol | Kimi | Terra |
| --- | --- | --- | --- | --- |
| Navigation and discovery | 9.2 / 9.2 | 9.2 / 9.2 | 9.3 / 9.4 | 9 / 9 |
| Hierarchy and typography | 9 / 9.3 | 9.1 / 9.2 | 9.2 / 9.3 | 9 / 9 |
| Chart/data readability | 8.7 / 9.4 | 8.8 / 9.2 | 9.1 / 9.4 | 8.7 / 9 |
| Controls and feedback | 9 / 9.2 | 9.1 / 9.1 | 9.2 / 9.3 | 9 / 9 |
| Mobile responsiveness | 9.4 / 9.4 | 9.1 / 9.1 | 9.3 / 9.4 | 9 / 9 |
| Accessibility | 9 / 9.2 | 9 / 9 | 9.1 / 9.2 | 9 / 9 |
| Light/dark consistency | 9.2 / 9.2 | 9.2 / 9.2 | 9.3 / 9.3 | 9 / 9 |
| Overall | 8.9 / 9.3 | 9 / 9.1 | 9.2 / 9.3 | 8.9 / 9 |

Ranking met the threshold for all four reviewers, while Bars did not. Sol and DeepSeek independently reproduced lower positive values annotated above higher values within Fable and Terra. Terra also found the short signed chart too compressed, with unused space below negative labels. Kimi approved both views and verified annotation bounds and focus behavior live, but those checks did not detect the ordering defect.

DeepSeek independently passed type checking, 185 unit tests and 26 production Chromium tests, with live width/height probes. Kimi independently passed TypeScript checking and 185 unit tests and probed interactions and geometry live. Sol performed focused live checks. Terra inspected source and all current screenshots. No assistive-technology certification was performed.

## Changes for round 8

Positive values now stay at their bar ends rather than moving upward for collisions. This preserves magnitude order directly. If text cannot fit, the higher value remains visible; every value is available through focus, hover and exact data. Width estimates account for narrow decimal points, retaining more labels without collision.

The negative label band uses its actual packed height instead of reserving one row per configuration. Omniscience uses the same top inset as other Bars. This gives the short signed chart more space for measured bars while preserving the common scale, negative label order, unit clearance and model names. All 28 score labels are visible in the new 640px and 800px captures.

- [Intelligence at 1280x640](ordered-bars-short.png)
- [Omniscience at 1280x640](ordered-signed-short.png)
- [Omniscience at 1280x800](ordered-signed-standard.png)
- [Focused configuration](ordered-focused-value.png)

The browser assertion now checks every model's visible positive values for magnitude order, including the production Fable and Terra cases at 640px and 800px. It also checks pairwise text collisions, unit/plot bounds, highest-value visibility, every focused bar and the short signed chart's usable plotting extent.

Latest `main` at `e0bcacd` is merged. Its mobile axis spacing fix and two mobile browser tests are retained alongside this branch's existing chart navigation and rankings. Type checking, all 185 unit tests, production build and all 28 production Chromium tests pass.

## Round 8 results

All four independently reviewed frozen implementation `0b93210c4286e5589eac1e9fcba565285222d086` and verified it before and after. Every category meets 9 for both Bars and Ranking. No required fix remains. Cells show Bars / Ranking.

| Category | DeepSeek | Sol | Kimi | Terra |
| --- | --- | --- | --- | --- |
| Navigation and discovery | 9.4 / 9.4 | 9.2 / 9.2 | 9.4 / 9.5 | 9 / 9 |
| Hierarchy and typography | 9.2 / 9.3 | 9.1 / 9.2 | 9.2 / 9.4 | 9 / 9 |
| Chart/data readability | 9.2 / 9.3 | 9.1 / 9.3 | 9.4 / 9.5 | 9 / 9 |
| Controls and feedback | 9.3 / 9.3 | 9.1 / 9.2 | 9.3 / 9.4 | 9 / 9 |
| Mobile responsiveness | 9.4 / 9.4 | 9.1 / 9.1 | 9.4 / 9.4 | 9 / 9 |
| Accessibility | 9 / 9.1 | 9 / 9 | 9.2 / 9.3 | 9 / 9 |
| Light/dark consistency | 9.3 / 9.3 | 9.2 / 9.2 | 9.4 / 9.4 | 9 / 9 |
| Overall | 9.2 / 9.3 | 9.1 / 9.2 | 9.3 / 9.4 | 9 / 9 |

DeepSeek independently passed type checking, all 185 unit tests and all 28 production Chromium tests, using the frozen build. It checked real chart geometry and interactions at short, standard, large, compact and phone sizes. Kimi independently passed type checking and 185 unit tests, inspected every current capture and exercised 112 focused score bars plus responsive and Ranking interactions. Sol performed live probes of the prior defects, keyboard paths and phone fallback. Terra inspected the changed source, assertions and all current captures without live probes or suite runs.

The live checks confirm all 28 Intelligence and Omniscience labels at 640px and 800px, without inversions, collisions or heading intersections. The short signed plot's usable extent is 0.581, versus 0.703 at 800px. Full-height Bars, flat exact-position Ranking markers, mobile 32px axis spacing, Pareto hover copy and keyboard focus remain intact. Compact and cost views can omit labels when text cannot fit; every bar and exact value remains available through focus, hover, pinning and the data disclosure.

These are UI review judgments with Chromium checks, source inspection and actual application captures. None performed a screen-reader or other assistive-technology certification. The commit recording these results changes documentation only; the reviewed implementation and screenshots remain unchanged.

## Requested follow-up after round 8

The reasoning-abbreviation footer is removed. The horizontal scroll cue remains when a Bars selection exceeds the available width. Chart settings now offers Highest first, Lowest first and Highest last per model as explicit selected options. Highest last orders model groups by their maximum measured value ascending, so the strongest group is last. It does not reorder configurations inside each Bars group.

The choice persists as `sort=highest-last` and applies consistently to Bars, Ranking and View data. Ranking displays the maximum configuration for this mode. Type checking, build, 186 unit tests and 29 production Chromium tests pass, including model-maximum ordering across both presentations, exact data and URL reload. The round 8 council scores above apply to the earlier frozen revision; this requested follow-up has focused automated validation rather than another council review.
