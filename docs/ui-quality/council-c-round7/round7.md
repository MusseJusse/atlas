# Round 7 results

All four members reviewed frozen `1214ca0` and scored overall UI at least 9. The strict comparison target was not met: Sol, Terra and Astra preferred current in every category, while Luna tied chart readability with the reference. No tie was counted as a pass.

## Sol

| Category | Current | PR 80 | Reference |
| --- | --- | --- | --- |
| Overall UI | 9.1 | 8.2 | 8.8 |
| Navigation and discovery | 9.0 | 7.9 | 8.5 |
| Hierarchy and typography | 9.1 | 8.4 | 8.8 |
| Chart and data readability | 9.2 | 8.1 | 9.0 |
| Controls and feedback | 9.1 | 7.8 | 8.4 |
| Mobile | 9.1 | 7.9 | 8.6 |
| Accessibility evidence | 9.0 | 7.6 | 7.7 |

Sol passed and independently verified catalog scrolling, exact Astra ranking values, keyboard Terra pins, phone legend pins and filter-sheet Escape/focus restoration. It found no blocking issue. Its optional refinement was a softer catalog shadow, which it saw as a hard gray strip through a partially visible row. Round 8 softens that gradient.

## Terra

| Category | Current | PR 80 | Reference |
| --- | --- | --- | --- |
| Overall UI | 9.0 | 8.2 | 8.3 |
| Navigation and discovery | 8.8 | 8.0 | 7.8 |
| Hierarchy and typography | 9.0 | 8.3 | 8.2 |
| Chart and data readability | 9.1 | 8.1 | 8.5 |
| Controls and feedback | 8.8 | 7.8 | 7.9 |
| Mobile | 8.9 | 7.9 | 8.0 |
| Accessibility evidence | 8.5 | 7.4 | 7.2 |

Terra passed and found no blocking issue. It independently checked linear scale selection and intelligence/ranking navigation. The remaining catalog/subscription-wrap observations were accepted as understandable refinements. It did not independently exercise touch, keyboard pins, expansion or screen readers.

## Astra

| Category | Current | PR 80 | Reference |
| --- | --- | --- | --- |
| Overall UI | 9.0 | 8.1 | 8.6 |
| Navigation and discovery | 8.9 | 7.9 | 8.7 |
| Hierarchy and typography | 9.1 | 8.4 | 8.6 |
| Chart and data readability | 9.1 | 8.0 | 8.8 |
| Controls and feedback | 9.1 | 8.0 | 8.3 |
| Mobile | 9.0 | 7.8 | 8.5 |
| Accessibility evidence | 8.8 | 7.3 | 7.2 |

Astra passed with no blocking issue. It independently verified catalog scrolling, phone legend pinning with exact values, Scores navigation, ranking expansion and keyboard collapse. A desktop direct-label click timed out, so that interaction remains unverified by Astra rather than established as a defect. The second-line subscription API note has no collision or clipping.

## Luna

| Category | Current | PR 80 | Reference |
| --- | --- | --- | --- |
| Overall UI | 9.0 | 8.1 | 8.7 |
| Navigation and discovery | 9.1 | 8.0 | 8.7 |
| Hierarchy and typography | 9.1 | 8.4 | 8.8 |
| Chart and data readability | 9.0 | 8.0 | 9.0 |
| Controls and feedback | 9.1 | 8.0 | 8.5 |
| Mobile | 9.1 | 7.9 | 8.7 |
| Accessibility evidence | 8.9 | 7.6 | 7.5 |

Luna reached 9.0 overall but tied chart readability at 9.0 versus the reference. Its initial prose incorrectly called that an individual pass and said the tie need not exceed reference. A separate clarification confirmed the table was its actual judgment and corrected the verdict to unmet, with no score changes. It reported no blocking defect and based its review on screenshots and supplied evidence, without live interactions.

## Evidence boundaries and follow-up

Every member inspected the ten current PNGs, PR 80 pair and matched reference pair. No member independently reran suites, axe or a screen reader. Reference/PR 80 interaction comparisons remain screenshot-based and less certain. HEAD/status were unchanged and owned tabs closed. The approved replacement panel uses four OpenAI models, without the original vendor diversity.

A subsequent read-only browser measurement found the 45%-opacity desktop label connectors as low as 1.61:1 contrast in light mode. Round 8 removes that opacity reduction while preserving their 0.7px width and series hue/dashes. The existing contrast test now covers connectors as well as data lines, requiring at least 3:1 in both themes. The catalog shadow is also softer. There is no layout, point, navigation or target-size change. This addresses measurable legibility rather than assuming a subjective tie can be solved by requesting a different score. Fresh round 8 judgments remain independent.
