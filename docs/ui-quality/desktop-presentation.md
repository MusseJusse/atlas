# Desktop presentation choice

Desktop metric views offer Ranking and Bars. Bars is the desktop default, with Highest last per model as its automatic sort. Explicit sort choices override it; Ranking retains better-first sorting. The original vertical bars show each reasoning configuration separately, while the horizontal ranking emphasizes each model's range. Task tokens also retains its Scatter choice.

The default Bars preference needs no URL parameter. An explicit Ranking preference is saved as `bars=false`; existing `bars=true` links remain valid. Filters, metric selection, explicit sorting, grouping and measured configurations remain available in either presentation. Phones use rankings even when a shared URL requests bars. Bar charts expand vertically to fill the available card area, with a minimum usable height in short windows. Ranking sizing is unchanged. Wide bar charts scroll horizontally to preserve readable model names. Pinned configuration details stay inside the visible card while the chart scrolls.

Actual application screenshots:

- [Desktop Bars](toggle-bars.png)
- [Desktop Ranking](toggle-ranking.png)
- [Signed bar values](toggle-signed.png)
- [Compact desktop with horizontal scrolling](toggle-compact.png)
- [Task tokens presentation choices](toggle-tokens.png)
- [Phone fallback](toggle-phone.png)
- [Dark Bars](toggle-dark.png)

Validation passes type checking, 183 unit tests, production build and 24 production Chromium tests. New browser checks exercise both presentations across all six metric views, URL persistence and reload, keyboard pins and Escape focus, complete dense bar selections, horizontal scrolling, visible pinned details, and phone fallback. The earlier council scores identify their frozen revision; this later user-requested choice has separate validation and evidence.


Full-height bar captures:

- [Large desktop](full-height-bars-large.png)
- [Standard desktop](full-height-bars-standard.png)
- [Short desktop](full-height-bars-short.png)

The added browser check resizes the desktop from 800px to 1200px high and verifies the plot grows with the card, then switches back to Ranking. Type checking, build and all 24 browser tests pass for this sizing follow-up; the last full unit run passed all 183 tests.


The [post-change council review](post-bars-council.md) found two readability issues in round 5. Follow-up fixes keep model names inside short desktop cards and order negative annotations by depth. Time bars also use familiar duration ticks. Latest validation passes type checking, 184 unit tests, build and all 25 browser tests; the next council pass is pending.
