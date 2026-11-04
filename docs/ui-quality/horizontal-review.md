# Horizontal ranking review

The user rejected the table-first ranking and raised the target to 9/10 from every council member in every category. Previous 8-level approvals do not satisfy this request.

Rankings now use horizontal model rows on a shared scale. Dots show every measured configuration, the range connects configurations, and a faint bar runs from zero to the first value in the chosen direction. Models default to their best measurement first. Signed scores keep their zero reference. Model rows expand to exact reasoning values and selectable configuration details. View data remains a secondary disclosure. There is no automatic table fallback at any width or selection size.

The previous implementation is recorded in `before-horizontal-ranking.png`. Current application captures:

- `horizontal-ranking.png`, `horizontal-ranking-phone.png`, `horizontal-ranking-320.png`
- `horizontal-signed.png`, `horizontal-cost.png`, `horizontal-tokens.png`, `horizontal-time.png`
- `horizontal-expanded.png`, `horizontal-dark.png`, `horizontal-dark-phone.png`
- `after-dense.png`, `after-dense-mobile.png`, `after-dense-mobile-settings.png` now show graphical broad selections.
- Other pages and states remain in the `after-*` and `navigation-*` captures. These are actual application screenshots with production data.

Validation before the first 9-level review: type checking, 179 unit tests, production build, and 17 production Chromium tests pass. Browser coverage checks all configurations remain plotted, table completeness on disclosure, grouped cost/intelligence ordering in both directions, signed positions, keyboard expansion/selection/close focus, all seven views, history, narrow layout, and existing Efficiency/Changelog behavior. Vite's existing bundle-size warnings remain.

Council round 1 for the new target is pending. Categories remain navigation and discovery, hierarchy and typography, chart/data readability, controls and feedback, mobile responsiveness, accessibility, and light/dark consistency. Reviewers must assess visual quality as well as correctness, and identify concrete changes needed for any score below 9.

## Round 1 scores

| Category | DeepSeek | Sol | Kimi | Terra |
| --- | --- | --- | --- | --- |
| Navigation and discovery | 8.5 | no score | 9 | 8 |
| Hierarchy and typography | 8.5 | no score | 8.5 | 8 |
| Chart/data readability | 7.5 | no score | 8.5 | 8 |
| Controls and feedback | 8.5 | no score | 9 | 8 |
| Mobile responsiveness | 8.5 | no score | 9 | 8 |
| Accessibility | 8.5 | no score | 9 | 8 |
| Light/dark consistency | 9 | no score | 9 | 9 |
| Overall | 8.5 | no score | 8.8 | 8 |

Sol's run failed at the provider usage limit. No approval is inferred from that failure. All other reviewers found the new target unmet.

## Changes for round 2

- Added a compact encoding key, visible configuration counts, and complete accessible row names. Expanded choices have a named group. Browser checks inspect the accessible name and native keyboard expansion, selection and restored focus. No real screen-reader certification is claimed.
- Moved ranking scrolling into the entire chart card with a sticky axis, a visible bottom scroll cue, and automatic expansion scrolling. The ranking rows have no separate scroll area. Model navigation resets the card scroll position.
- Cost rankings default to logarithmic spacing with an explicit Linear/Log choice. Zero values retain a linear scale. All measurements remain present. Linear mode dodges overlapping configuration dots vertically without changing any X coordinate. Focused geometry tests cover deterministic separation and row bounds.
- Duration axes use whole seconds/minutes/hours, including five-minute ticks for twenty-minute tasks.
- Coding-only Overview now says Cost vs coding score. Compact scatter views show a named legend whenever direct labels are unavailable. Broad-selection data counts explicitly say models with data.
- Replaced the phone Efficiency fieldset boundary with a named threshold group, fixing its legend collision. Narrow resource navigation uses two columns. Axis text is 12px and the compact visual key stays together.
- Desktop configuration choices and details now share a row. Phone details remain stacked. Negative bars round their data end; faint fills have lower opacity.

Round 2 is pending. Fresh captures include desktop/320px linear costs in both themes, phone expansion, and the corrected Efficiency layout. Validation before rebase: 181 unit tests, type checking, build, and 18 production browser tests pass. Rebase validation and captures will be refreshed against latest main.
