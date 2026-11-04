# Desktop presentation choice

Desktop metric views offer Ranking and Bars. Ranking is the default. The original vertical bars show each reasoning configuration separately, while the horizontal ranking emphasizes each model's range. Task tokens also retains its Scatter choice.

The shared desktop preference is saved as `bars=true` in the URL. Filters, metric selection, explicit sorting, grouping and measured configurations remain available in either presentation. Phones use rankings even when a shared URL requests bars. Wide bar charts scroll horizontally to preserve readable model names. Pinned configuration details stay inside the visible card while the chart scrolls.

Actual application screenshots:

- [Desktop Bars](toggle-bars.png)
- [Desktop Ranking](toggle-ranking.png)
- [Signed bar values](toggle-signed.png)
- [Compact desktop with horizontal scrolling](toggle-compact.png)
- [Task tokens presentation choices](toggle-tokens.png)
- [Phone fallback](toggle-phone.png)
- [Dark Bars](toggle-dark.png)

Validation passes type checking, 183 unit tests, production build and 23 production Chromium tests. New browser checks exercise both presentations across all six metric views, URL persistence and reload, keyboard pins and Escape focus, complete dense bar selections, horizontal scrolling, visible pinned details, and phone fallback. The earlier council scores identify their frozen revision; this later user-requested choice has separate validation and evidence.
