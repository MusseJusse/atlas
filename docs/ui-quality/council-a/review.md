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

## Round 3 Terra and revised membership

Terra reviewed the application at `b23ad1b`, including the corrected captures, and scored it 8.5 overall. It did not run live browser checks. The target remains unmet.

| Category | Implementation | PR 80 | slopalytics.com |
| --- | --- | --- | --- |
| Overall UI | 8.5 | 8.0 | 8.3 |
| Navigation and discovery | 8.6 | 7.9 | 8.1 |
| Hierarchy and typography | 8.6 | 8.2 | 8.2 |
| Chart and data readability | 8.3 | 7.9 | 8.5 |
| Controls and feedback | 8.6 | 8.0 | 8.1 |
| Mobile | 8.4 | 7.9 | 8.3 |
| Accessibility evidence | 7.9 | 7.5 | 7.0 |

Remaining concerns are chart density on narrow phones, metric discovery through categories and the phone settings icon. The earlier unequal viewport limits the desktop comparison.

New `matched-*` captures compare the current application and reference with identical 1280 x 800 desktop and 390 x 844 phone viewports, both in light mode. Both select Terra, Sol, Luna, Astra, Haiku, Fable and Opus, with Low, Medium, High and Xhigh efforts, API pricing and no Pareto line. Data snapshots can still differ. No production writes were made. Reference filter URL:

https://slopalytics.com/?models=gpt-6-astra,gpt-6-1-sol,gpt-6-1-terra,gpt-6-luna,claude-opus-5-5,claude-fable-5-1,claude-haiku-5-5&hide-reasoning=none,max

The user approved revised council membership after provider limits. The revised council is GPT-6.1 Sol, GPT-6.1 Terra, DeepSeek V4.1 Flash via the free route, and GLM-5.3-Flash Free replacing Kimi. This retains three model vendors through the two callable tool providers. Failed Go runs remain recorded as no score. No score transfers from Kimi to GLM.

These additional captures and notes do not change application source from `b23ad1b`.

## Revised round 3 DeepSeek and prepared follow-up

DeepSeek reviewed the matched captures at `bf05cd1`, independently passed type checking, 185 unit tests and 31 browser tests, and scored the current application 8.6 overall. The target remains unmet.

| Category | Implementation | PR 80 | slopalytics.com |
| --- | --- | --- | --- |
| Overall UI | 8.6 | 8.0 | 8.2 |
| Navigation and discovery | 8.8 | 7.9 | 8.0 |
| Hierarchy and typography | 8.7 | 8.3 | 8.2 |
| Chart and data readability | 8.4 | 7.9 | 8.5 |
| Controls and feedback | 8.8 | 8.2 | 8.0 |
| Mobile | 8.7 | 7.9 | 8.0 |
| Accessibility evidence | 8.2 | 7.5 | 7.0 |

The follow-up was prepared in a separate checkout so the active GLM review could retain its frozen application. `round4-*` captures show this follow-up, not the earlier reviewed application.

Verified changes:

- Resting series lines use full opacity. Browser pixel-color calculations require at least 3:1 contrast for all seven default series in both themes. Terra's desktop connector retains the dashed treatment.
- The selected-model label gutter adapts between 160 and 235px. Long agent labels retain their space. At 1280 x 800, the plot axis grows from about 613px to 688px wide, and its 60-to-0 score span grows from about 401px to 429px through compact desktop spacing.
- Phone pricing has the name “Pricing settings” and a visible Pricing label at widths of at least 360px. Narrower phones retain the icon with its accessible name.
- The model launcher, phone reset and Done controls meet 44px height/width checks. The complete default phone legend still fits at 390px, ending at 839.9px in an 844px viewport.
- Desktop label pins reflect the whole model family, clear a pin from any configuration in that family, and use “Select” rather than “Highlight.”
- Categories remember the last visited chart during the current session.
- Collapsed ranking rows omit references to panels that have not been mounted. Expanded rows reference their existing panel.

Type checking, build, 185 unit tests and the full 32 browser tests passed before the final collapsed-row ARIA repair. Four focused browser tests passed after that repair, covering ranking keyboard expansion, chart contrast and family pins, phone target sizes/pricing names and category memory.

## Automated accessibility audit

`axe-followup.json` records axe-core 4.14.0 against eight production-build states, using WCAG 2 A/AA, 2.1 AA and 2.2 AA rule tags. It reports zero violations. It also reports incomplete contrast checks and incomplete validation of the filter popup reference. These are not a clean bill of accessibility.

The additional DOM reference check found no missing `aria-controls` target after the ranking repair. We verified that `model-filters` exists and is the sheet opened by the launcher. Browser tests cover opening, focus restoration, Escape and the relevant names/states. SVG contrast/background checks remain incomplete in axe; a separate browser calculation covers resting series-line contrast. No VoiceOver/NVDA pass, forced-colors pass or conformance certification has been performed.

To reproduce the audit without adding a repository dependency, install axe-core 4.14.0 in a temporary directory and pass its script path and an isolated production preview URL:

```sh
npm install --prefix /tmp/slopalytics-a11y --no-audit --no-fund axe-core@4.14.0
node docs/ui-quality/council-a/run-axe.mjs /tmp/slopalytics-a11y/node_modules/axe-core/axe.min.js http://127.0.0.1:4493
```

## Revised round 3 complete

All four revised members reviewed the previous application source at `b23ad1b`, with matched evidence added at `bf05cd1`. None approved the target. GLM independently passed type checking and 185 unit tests and exercised selected interactions/geometry with headless Chromium; it did not rerun the full browser suite or build.

| Current application category | Sol | Terra | DeepSeek Free | GLM Free |
| --- | --- | --- | --- | --- |
| Overall UI | 8.7 | 8.5 | 8.6 | 8.5 |
| Navigation and discovery | 9.0 | 8.6 | 8.8 | 8.8 |
| Hierarchy and typography | 8.9 | 8.6 | 8.7 | 8.7 |
| Chart and data readability | 8.5 | 8.3 | 8.4 | 8.4 |
| Controls and feedback | 8.9 | 8.6 | 8.8 | 8.7 |
| Mobile | 8.6 | 8.4 | 8.7 | 8.6 |
| Accessibility evidence | 8.3 | 7.9 | 8.2 | 8.3 |

Their reference chart-readability scores were 8.6, 8.5, 8.5 and 8.5 respectively. Accessibility judgments describe available evidence, not conformance certification.

## Round 4 revision

The prepared contrast, geometry, pricing, filter-target, category-memory and ARIA-reference fixes above are now ready for fresh review. The final additions address GLM's verified findings:

- Phone scatter targets have a 23px transparent radius. Selection resolves the closest plotted point to the pointer, rather than the last-painted overlapping hit area. Visible point centers and values stay exact. Keyboard activation still selects the focused configuration. A browser test verifies Haiku low and Luna medium separately, despite their near-overlap.
- The page H1 precedes the sidebar's H2, and the main landmark references that title.
- The phone Artificial Analysis footer link has a 44px minimum height. Correction: a separate “Pricing captured” link does exist inside the open pricing panel. The earlier check looked only at the footer. That panel link now also has a 44px minimum height.

The final revision passes type checking, build, all 185 unit tests and all 33 production Chromium tests. The eight-state axe report was rerun against the final build: zero violations, with the documented incomplete contrast/popup checks retained. No screen-reader pass is claimed. Round 4 scores remain pending; prior scores do not approve this new revision.

## Round 4 results and provider limits

Sol scored `13aa1f1` 8.8 overall, with chart readability 8.7 versus the reference's 8.9. It independently verified near-overlap point selection, category memory, sheet focus restoration, ranking controls and the named pricing trigger. It identified the small Pricing captured link inside the pricing panel; the follow-up increases that existing link's height to 44px and checks it at 320 and 390px.

Terra scored `13aa1f1` 8.7 overall, with chart readability 8.5 versus the reference's 8.7. It found no demonstrated functional defect requiring redesign. Its pricing probe timed out; it explicitly disclaimed drawing a product-defect conclusion from that timeout.

| Round 4 current category | Sol | Terra |
| --- | --- | --- |
| Overall UI | 8.8 | 8.7 |
| Navigation and discovery | 9.1 | 8.9 |
| Hierarchy and typography | 9.0 | 8.8 |
| Chart and data readability | 8.7 | 8.5 |
| Controls and feedback | 9.1 | 8.9 |
| Mobile | 8.8 | 8.6 |
| Accessibility evidence | 8.8 | 8.5 |

DeepSeek Free and GLM Free both failed round 4 at the free usage limit and gave no score. Their round 3 scores have not been reused. The user already approved available-model replacements; the remaining verified working route for this panel is Codex. Astra and Luna are available to replace the failed members, but that panel would be entirely OpenAI rather than spanning model vendors. This limitation must remain explicit.

The next layout change awaits a user pick among three published static refinements, all retaining the desktop left filters. No compact-layout component changes have been implemented. The 9/10 and strict-reference-preference target remains unmet.

The pricing-link fix passes the focused browser target test at 320 and 390px. The reproducible axe audit now includes the open phone pricing panel as a ninth state, covering the context the earlier eight-state audit omitted.
The added panel audit also exposed an incomplete ARIA check on its generic labeled div. The panel now has an explicit group role with its contextual Pricing settings name, verified by the focused browser test.
