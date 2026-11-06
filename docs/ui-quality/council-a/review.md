# Persistent-filter workspace

The user selected mock A on 6 November 2026. This branch stacks above PR 80 at `617b910`, which already contains current main `e0bcacd`.

Chart presentation, axis scale and settings now sit beside the desktop heading. Sort order is visible on the settings trigger. The cost/intelligence destination has an explicit desktop label, resource labels use consistent units, and narrow desktops wrap metric choices into two rows. Phones retain the active Benchmarks link, readable chart targets, and rankings. Scatter lines have stronger resting contrast; compact price labels retain more intermediate ticks where space permits.

The data table and reasoning footer stay removed as explicitly requested in PR 80. Review suggestions to restore them are outside the accepted scope. Exact configuration information remains available through hover, keyboard focus, pins and ranking expansion. Model logos already existed in the phone legend; we verified them rather than adding duplicate identity markers.

## Evidence

`before-*` captures main before PR 80. `after-*` captures PR 80 before this branch. `competitor-*` captures slopalytics.com. The other captures show this branch, using the same data and default selection as PR 80.

Desktop captures are 1280 x 800 except the competitor overview at 1280 x 889. Phones are 390 x 844, with an additional 320px capture. Initial themes and selected models differ between the reference builds. The competitor bars show cost per task while our bars show intelligence, so metric values are not compared.

## Council review

Round 1 independently reviewed the baseline PR 80, not these improvements. The previous PR's scores were not carried forward.

| Delegate | Round 1 overall PR 80 | Round 1 reference | Round 2 |
| --- | --- | --- | --- |
| DeepSeek V4.1 Flash | 8.3 | 8.4 | no score, weekly usage limit |
| GPT Sol | no score, orchestration failed | no score | 8.5, target not met |
| Kimi K3.1 Pro | 7.4 | 8.2 | no score, weekly usage limit |
| GPT-6.1 Terra | no score, orchestration failed | no score | 8.3, target not met |

Round 1 DeepSeek and Kimi agreed on explicit metric naming, a more compact chart header and stronger plot readability. Neither approved a 9/10 score. Kimi reviewed screenshots and source only. DeepSeek additionally checked selected interactions and geometry. Neither performed assistive-technology certification.

Round 2 will judge a frozen revision, actual application captures and the same competitor evidence. Approval requires each reviewer to score at least 9 overall and prefer this UI in each comparison category. No passing scores have been assumed.

## Validation

Type checking, 185 unit tests, production build and 30 Chromium browser tests pass. Browser coverage includes every view, ordering and saved state, compact navigation boundaries, short chart label bounds, keyboard configuration details, phone overflow and 44px chart controls. Existing bundle-size warnings remain.

## Round 2 findings and follow-up

Terra reviewed `a8d5a09` from supplied captures and source. It did not run browser interactions or an accessibility audit.

| Category | Implementation | PR 80 | slopalytics.com |
| --- | --- | --- | --- |
| Overall UI | 8.3 | 7.9 | 8.2 |
| Navigation and discovery | 8.2 | 7.6 | 8.1 |
| Hierarchy and typography | 8.5 | 8.1 | 8.0 |
| Chart and data readability | 8.1 | 7.8 | 8.3 |
| Controls and feedback | 8.3 | 7.8 | 8.0 |
| Mobile responsiveness | 8.1 | 7.8 | 8.2 |
| Accessibility evidence | 7.6 | 7.4 | 7.0 |

The dark phone-ranking image was blank. We replaced it with a verified production-build capture and added the expanded state. A browser check of subscription ticks at 320px found a 3.64px label gap, below the existing 4px minimum. Increasing the compact spacing reserve from 4px to 6px preserves at least 4px of measured separation at 320, 390 and 1280px. All 185 unit tests and 30 browser tests pass after the fix. The phone sort trigger also omits the repeated “per model” suffix so the heading fits at 390px.

The latest phone ranking, expanded ranking and subscription captures show this follow-up. Earlier screenshots retain the round 2 baseline. Terra's scores have not been carried forward as approval of these later changes.

We retain the category navigation because it keeps every destination available without clipped horizontal tabs. The current metric has an active subtab and a visible chart heading. We will seek fresh judgment rather than treating this design choice as resolved by test coverage.

The scatter plot preserves exact point positions. Similar-provider series can still be hard to distinguish in narrow selections, and this remains a review concern. No values were moved to manufacture separation.

DeepSeek and Kimi could not complete round 2 because OpenCode Go reached its weekly limit. No substitute models were used. A decision on restoring quota or changing council membership is pending; the four-member target remains unmet.

## Sol round 2 and further fixes

Sol independently scored `a8d5a09` 8.5 overall. It reviewed source and captures without browser interaction. It did not approve the target.

| Category | Implementation | PR 80 | slopalytics.com |
| --- | --- | --- | --- |
| Overall UI | 8.5 | 8.0 | 8.3 |
| Navigation and discovery | 9.0 | 8.0 | 8.2 |
| Hierarchy and typography | 8.8 | 8.4 | 8.3 |
| Chart and data readability | 8.3 | 7.9 | 8.5 |
| Controls and feedback | 8.7 | 7.8 | 8.0 |
| Mobile responsiveness | 8.4 | 8.0 | 8.4 |
| Accessibility evidence | 8.0 | 7.8 | 6.5 |

Verified findings now addressed:

- Terra and Astra shared the OpenAI color. Terra now has a dashed line and matching legend sample. Points retain exact data positions.
- The sort settings trigger now describes its current order through `aria-describedby`.
- Legend buttons expose pinned state with `aria-pressed`. A model's legend button also reflects a pin made on another configuration in that family, and clicking it clears that pin.
- A modestly shorter phone plot fits the full default legend at 390 x 844. Measured legend bottom is 836.9px, while the plot remains at least 320px high on narrow phones.

New `round3-*` images show these fixes. The expanded ranking and precise subscription captures remain applicable. Type checking, build, 185 unit tests and 31 production browser tests pass. The additional browser case checks the line pattern, accessible sort description, legend pin/unpin state and complete default phone legend.

Fresh Sol and Terra reviews will evaluate the next frozen revision. DeepSeek and Kimi remain unavailable; partial reviews cannot satisfy the original four-member requirement.
