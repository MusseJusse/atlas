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

Type checking, all 184 unit tests, build and all 25 production browser tests pass. New assertions cover the 640px label band, absent obstruction by the scroll cue, negative annotation order, bar-centered X positions, and whole-minute time ticks. Round 6 is pending; no new approval is inferred from earlier scores.
