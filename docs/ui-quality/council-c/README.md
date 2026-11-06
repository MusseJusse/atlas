# Continuous benchmark canvas

The user selected compact refinement C on 6 November 2026. The earlier choice of persistent left filters remains in place. This is an implementation of the selected mock, not another unapproved direction.

Desktop widths of at least 1280px put chart navigation into the 48px site header. Smaller desktops retain the in-canvas chart navigation so every metric fits. Phones put Models alongside the chart categories, name the cost destination explicitly and keep the full-width canvas. Categories retain the last visited metric. Only one Chart views navigation is visible at a time.

The guidance sentence is available through the chart section's accessible description and title. The pricing control displays API pricing or Subscription, with API or Plan on narrow phones. Estimated-subscription assumptions remain visible. Model selection, axis scale, sorting, pins, URL state, keyboard details and the selected presentation remain available. The data table and reasoning footer stay removed as requested in PR 80.

## Actual application evidence

All PNGs here are captures of the actual production build, not the static mocks. Desktop captures are 1280 x 800, compact desktop is 901 x 800, phones are 390 x 844 or explicitly 320 x 844. Light/dark, Bars, Ranking and estimated subscription states are included.

Matched reference captures remain in [the preceding evidence directory](../council-a/). `matched-reference-desktop.png` and `matched-reference-phone.png` show slopalytics.com at the same viewports, light theme, seven families, Low through Xhigh effort, API pricing and Pareto off. Data snapshots may differ. `matched-update-*` and `round4-*` show the prior application, not this implementation.

| Plot measurement | Prior layout | Continuous canvas |
| --- | --- | --- |
| Desktop axis width, 1280 x 800 | about 688px | about 747px |
| Desktop 60-to-0 score span | about 429px | 562px |
| Phone axis width, 390 x 844 | about 256px | about 302px |
| Phone 60-to-0 score span | about 259px | about 358px |

The default phone legend ends at 836px in an 844px viewport. Narrow phones keep a 374px minimum plot height. Values retain their exact positions on uniformly rescaled axes. No data jitter was introduced.

## Validation

Type checking, production build, all 185 unit tests and all 34 production Chromium tests pass. The added canvas check guards plot width/height and the single visible navigation across desktop and phone breakpoints. Existing coverage exercises all seven charts, narrow layouts, saved state, coding data, sorting, keyboard details, precise price ticks, touch targets and selection of nearby configurations.

[The axe-core 4.14.0 report](../council-a/axe-followup.json) was rerun across nine states of the current build, including the phone pricing panel. It reports zero violations, with incomplete contrast/popup-reference checks retained. Additional DOM checks find no missing aria-controls targets. Browser checks separately measure resting series contrast and keyboard behavior. No screen-reader pass or conformance certification is claimed. The reproducible audit script remains in that directory; no application dependency was added.

## Council review

Round 5 is complete and the target was not met. [Full scores and evidence boundaries](round5.md) are recorded separately. The earlier history remains in [the preceding review record](../council-a/review.md). [Round 6 evidence](../council-c-round6/) covers the small follow-up refinements.

| Member | Round 4, before C | Round 5, C |
| --- | --- | --- |
| GPT-6.1 Sol | 8.8/10 | 9.0/10, individual target met |
| GPT-6.1 Terra | 8.7/10 | 8.8/10 |
| GPT-6 Astra | not a member | 9.0/10, individual target met |
| GPT-6 Luna | not a member | 8.9/10 |

DeepSeek and GLM gave no round 4 score because their free routes reached usage limits. The user approved available-model replacements. The current panel uses four different OpenAI models, so it lacks the original panel's vendor diversity. This limitation is explicit; failed reviews and past members' scores are not transferred to replacements.

The target remains four independent overall scores of at least 9/10, with this UI preferred over slopalytics.com in every comparison category. Two members passed this round; the four-member target was not met.
