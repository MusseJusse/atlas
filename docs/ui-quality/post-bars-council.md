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

Positive annotations now stop below the unit heading. Higher values take priority when annotations cannot all fit; hover, focus and pinning reveal an omitted value while clearing the other annotations in that model. Bar geometry and exact measurements are unchanged. Packing retains the vertical order of visible values, and the corrected negative band remains intact.

- [Intelligence at 1280x640](bounded-bars-short.png)
- [Omniscience at 1280x640](bounded-signed-short.png)
- [Omniscience at 1280x800](bounded-signed-standard.png)
- [Keyboard focus reveals an omitted value](bounded-focused-value.png)

Type checking, all 185 unit tests, production build and all 26 production Chromium tests pass. The added browser assertion checks all annotation bounds against the unit heading at 640px and 800px for both score views, then focuses every bar and repeats the check. Geometry coverage checks the heading boundary, highest-value priority, vertical ordering and retention of every bar. Round 7 is pending; no approval is inferred from prior scores.
