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
| DeepSeek V4.1 Flash | 8.3 | 8.4 | pending |
| GPT Sol | no score, orchestration failed | no score | pending |
| Kimi K3.1 Pro | 7.4 | 8.2 | pending |
| GPT-6.1 Terra | no score, orchestration failed | no score | pending |

Round 1 DeepSeek and Kimi agreed on explicit metric naming, a more compact chart header and stronger plot readability. Neither approved a 9/10 score. Kimi reviewed screenshots and source only. DeepSeek additionally checked selected interactions and geometry. Neither performed assistive-technology certification.

Round 2 will judge a frozen revision, actual application captures and the same competitor evidence. Approval requires each reviewer to score at least 9 overall and prefer this UI in each comparison category. No passing scores have been assumed.

## Validation

Type checking, 185 unit tests, production build and 30 Chromium browser tests pass. Browser coverage includes every view, ordering and saved state, compact navigation boundaries, short chart label bounds, keyboard configuration details, phone overflow and 44px chart controls. Existing bundle-size warnings remain.
