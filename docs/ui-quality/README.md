# UI review evidence

The before images show `origin/main` at `b17dca3`. The after images show this branch with the same benchmark snapshot. Desktop captures use 1280 × 800; phone captures use 390 × 844. These are browser screenshots of the application, not design mocks.

| View | Before | After |
| --- | --- | --- |
| Cost vs intelligence | [Before](before-scatter.png) | [After](after-scatter.png) |
| Intelligence ranking | [Before](before-ranking.png) | [After](after-ranking.png) |
| Phone scatter | [Before](before-scatter-mobile.png) | [After](after-scatter-mobile.png) |
| Phone efficiency | [Before](before-efficiency-mobile.png) | [After](after-efficiency-mobile.png) |
| Changelog | [Before](before-changelog.png) | [After](after-changelog.png) |
| Phone changelog | [Before](before-changelog-mobile.png) | [After](after-changelog-mobile.png) |

Additional checks show [dark mode](after-dark.png) , [all-model ranking](after-dense.png), and [phone dense ranking with its sort control](after-dense-mobile-settings.png).

Rankings use tables when model labels would collide at the available width, or when the selection exceeds 12 groups or 60 configurations. Tables retain every measured configuration. Model groups rank by their best value; configurations within a model use the selected value order. The settings control, table order, and guidance use the same presentation decision. Explicit sort choices override the default.

The initial council baseline was 6/10 from DeepSeek V4.1 Flash and 6.5/10 from GPT Sol, Kimi K3.1 Pro, and GPT-6.1 Terra. Those first reviews used an earlier running snapshot. The paired screenshots above use the latest `main` consistently.

Validation covers type checking, unit tests, a production build, and production Chromium tests. Browser tests check hydration, stalled fonts, URL/history restoration, all chart choices, phone model selection, dense table completeness and sorting, Efficiency layout, and 320px overflow.
