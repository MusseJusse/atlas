# Horizontal ranking review

All four council members score every category at least 9/10 on the same frozen implementation, `2714f8a`. The user rejected the earlier table-first ranking and raised the target to 9/10 in every category. The final result meets that target.

Rankings now use horizontal model rows on a shared scale. Dots show every measured configuration, the range connects configurations, and a faint bar marks the first value in the chosen direction on the active scale. Linear charts retain a zero reference. Models default to their best measurement first. Signed scores keep their zero reference. Model rows expand to exact reasoning values and selectable configuration details. View data remains a secondary disclosure. There is no automatic table fallback at any width or selection size.

The previous implementation is recorded in `before-horizontal-ranking.png`. Current application captures:

- `horizontal-ranking.png`, `horizontal-ranking-phone.png`, `horizontal-ranking-320.png`
- `horizontal-signed.png`, `horizontal-cost.png`, `horizontal-tokens.png`, `horizontal-time.png`
- `horizontal-expanded.png`, `horizontal-dark.png`, `horizontal-dark-phone.png`
- `after-dense.png`, `after-dense-mobile.png`, `after-dense-mobile-settings.png` now show graphical broad selections.
- Other pages and states remain in the `after-*` and `navigation-*` captures. These are actual application screenshots with production data.

Validation before the first 9-level review: type checking, 179 unit tests, production build, and 17 production Chromium tests pass. Browser coverage checks all configurations remain plotted, table completeness on disclosure, grouped cost/intelligence ordering in both directions, signed positions, keyboard expansion/selection/close focus, all seven views, history, narrow layout, and existing Efficiency/Changelog behavior. Vite's existing bundle-size warnings remain.

Council round 1 for the new target was requested on `35d1e18`. Categories remain navigation and discovery, hierarchy and typography, chart/data readability, controls and feedback, mobile responsiveness, accessibility, and light/dark consistency. Reviewers must assess visual quality as well as correctness, and identify concrete changes needed for any score below 9.

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

Round 2 was requested on `167148e`. Fresh captures include desktop/320px linear costs in both themes, phone expansion, and the corrected Efficiency layout. Validation before rebase: 181 unit tests, type checking, build, and 18 production browser tests pass. Rebase validation and captures will be refreshed against latest main.

Rebased onto current main `8f33ad0`, preserving the updated benchmark data, output-speed fix and OpenAI/Anthropic default selection. Post-rebase checks pass: type checking, 182 unit tests, production build, and 18 production browser tests. All current captures were regenerated after this rebase. Baseline images retain the earlier snapshot, so comparisons demonstrate layout changes rather than identical metric values.

## Round 2 partial result and compact scatter fix

Terra scored navigation, hierarchy, controls, accessibility and theme consistency 9/10, with chart readability and mobile responsiveness 8.5/10, overall 8.5/10. Its only required change was a larger readable compact scatter. The other round-2 reports are recorded below.

The compact scatter now has at least 360px of plot height on desktop and 320px on phones. The entire card can scroll, keeping the named legend without squeezing the plot. A browser test checks 901px, 390px and 320px, including plot height, rendered axis text height, and an SVG screen scale of one.

Capture scripts now wait for SVG viewBox dimensions to match the measured viewport before taking evidence. The previous 901px capture caught the initial measurement state and made the chart look reduced. The corrected capture shows a 553px by 360px SVG at a screen scale of one. The application also has the larger minimum plot height, so this is a layout improvement as well as a capture correction.

Added dedicated desktop and phone Total tokens captures. Current validation: type checking and production build pass, with all 19 production browser tests passing. The last complete unit run passed all 182 tests; this change only touches chart sizing and screenshot evidence.

## Focused Terra approval and Sol focus finding

Terra rechecked `d9afba8` and scored every category and overall 9/10. It inspected the source, browser assertion and six requested images, including the new Total tokens captures. It did not independently run tests, exercise a live browser or test a screen reader. Accessibility and themes retained its earlier scores.

Sol's fresh round-2 review of `167148e` scored navigation, hierarchy, readability, controls and mobile 9, themes 9.2, accessibility 8.5 and overall 8.9. It independently passed the 18 browser tests and exercised all seven views in both themes at 320, 390, 901 and 1280px. Its only required fix was Escape from a ranking inspector losing focus to BODY, because the shared close handler only targeted SVG controls.

The shared Escape handler now restores focus to either the selected SVG control or the selected HTML configuration button before removing details. The keyboard test checks both click-close and Escape-close, including focus, pressed state and inspector removal. `horizontal-escape-focus.png` captures the returned focus ring. Type checking, build and all 19 browser tests pass. Later recheck results are recorded below.

## Completed rechecks and DeepSeek round 2

Sol rechecked `9d9086f` in the live production preview. It confirmed click-close and Escape-close restore visible configuration focus, clear the pin, and remove the inspector. Every category and overall now scores 9, with themes 9.2. This was a focused recheck; other scores retained its earlier assessment.

Kimi rechecked `9d9086f` and independently measured compact scatter at 901/390/320px, confirming minimum height, 1:1 SVG scale, 16px rendered axis glyph bounds and no horizontal overflow. It reproduced click-close and Escape-close focus restoration. Its latest scores are navigation 9.2, hierarchy 9.1, readability 9.1, controls 9.1, mobile 9.1, accessibility 9.1, themes 9.2, overall 9.1. It did not rerun full suites during this focused recheck.

DeepSeek's round-2 review inspected `167148e` and the later `9d9086f` tree. On current `9d9086f` it scored navigation 9, hierarchy 9, readability 8.5, controls 8.5, mobile 9, accessibility 9, themes 9, overall 8.7. The earlier target's accessibility was 8.5 and overall 8.6. It independently passed type checking, all 182 unit tests, build and all 19 browser tests. It exercised seven views, both themes, four viewport widths, dense selection, history, pins and focus. No screen-reader certification is claimed.

DeepSeek found three remaining clarity issues. The compact scatter legend clipped its last entry with no overflow cue; Model labels remained available where direct labels cannot render; and the derived Ultrafast speed endpoint counted as an extra selected model with only a tilde identifying its estimate.

## Final frozen review candidate

The fixes retain all series and measurements:

- Compact legends use three columns where chart width permits. API provenance shares the existing guidance line. At 901x900 all seven selected model names and View data fit inside the card. Overflow cues now cover both rankings and scatter, and measure the actual content end so padding does not create a false cue.
- Model labels and any label-only menu use the same 600px content-width condition as the scatter. Compact pricing menus retain their meaningful controls. The browser test checks the label setting is absent at 901px and affects the chart at desktop width.
- Data counts use the parent picker identity for speed endpoints. The time view now says 7 models with data and 8 series. Estimated speed endpoint is visible on its row and in the exact-value table; the accessible row name explicitly says estimated. A production browser test checks a Sol-only selection counts one model and two series.

Fresh evidence includes `navigation-desktop901.png`, `navigation-desktop901-settings.png`, `horizontal-time.png`, and `horizontal-time-data.png`. All other affected captures were regenerated. Type checking, 182 unit tests, production build and all 20 production Chromium tests pass.

| Delegate | Round 1 overall | Round 2 overall | Focused recheck overall | Final frozen pass |
| --- | --- | --- | --- | --- |
| DeepSeek V4.1 Flash | 8.5 | 8.7 | no score | 9 |
| GPT Sol | no score | 8.9 | 9 | 9 |
| Kimi K3.1 Pro | 8.8 | 8.7 | 9.1 | 9.1 |
| GPT-6.1 Terra | 8 | 8.5 | 9 | 9 |

All four final reviews confirmed the exact same HEAD before and after: `2714f8a5b9503e72c1afbbcb29009b9b8d966318`. Code and evidence remained unchanged throughout. Every member found no bounded required fix.

## Final category scores

| Category | DeepSeek | Sol | Kimi | Terra |
| --- | --- | --- | --- | --- |
| Navigation and discovery | 9 | 9 | 9.2 | 9 |
| Hierarchy and typography | 9 | 9 | 9.1 | 9 |
| Chart/data readability | 9 | 9 | 9.2 | 9 |
| Controls and feedback | 9 | 9 | 9.1 | 9 |
| Mobile responsiveness | 9 | 9 | 9.1 | 9 |
| Accessibility | 9 | 9 | 9.1 | 9 |
| Light/dark consistency | 9 | 9 | 9.2 | 9 |
| Overall | 9 | 9 | 9.1 | 9 |

All 28 category scores meet the requested minimum. These scores are design review judgments, not accessibility certification.

DeepSeek inspected 33 screenshots, source and browser assertions, then independently ran type checking, all 182 unit tests, production build and all 20 production browser tests. Live checks confirmed complete API/subscription legends, correct overflow cues, the shared label breakpoint, estimate provenance/counts and 320px layouts.

Sol inspected the supplied captures and source, and independently exercised final fixes and focus behavior at 901px, 1280px and 320px. Terra and Kimi inspected the final source and requested captures. They did not independently rerun full suites during the frozen pass. No reviewer used a real screen reader or completed a full WCAG, zoom/reflow or cross-engine audit. Validation is Chromium-based.

DeepSeek noted two non-blocking details: Terra and Astra share a legend color but retain explicit names/logos, and phones use the Atlas home link for the Benchmarks route. These did not lower any category below 9.

Only review documentation changes follow the approved implementation. No application source, test or screenshot changes are included in that final documentation update.
