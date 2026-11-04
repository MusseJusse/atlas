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

Rankings use tables when model labels would collide at the available width, or when the selection exceeds 12 groups or 60 configurations. Tables retain every measured configuration. Model groups rank by their best value; configurations within a model use the selected value order. The settings control, table order, and guidance use the same presentation decision. Chart choices are visible on desktop; phones use visible category and chart rows instead of a dropdown. Explicit sort choices override the default.

The initial council baseline was 6/10 from DeepSeek V4.1 Flash and 6.5/10 from GPT Sol, Kimi K3.1 Pro, and GPT-6.1 Terra. Those first reviews used an earlier running snapshot. The paired screenshots above use the latest `main` consistently.

Validation covers type checking, unit tests, a production build, and production Chromium tests. Browser tests check hydration, stalled fonts, URL/history restoration, all chart choices, phone model selection, dense table completeness and sorting, Efficiency layout, and 320px overflow.

## Council result

All reviewers' latest approvals reached the target: DeepSeek V4.1 Flash 8/10, GPT Sol 8/10, Kimi K3.1 Pro 9/10, and GPT-6.1 Terra 8/10.

| Delegate | Baseline | Implementation | Ordering | Label fit | Final ordering |
| --- | --- | --- | --- | --- | --- |
| DeepSeek V4.1 Flash | 6/10 | 7.8/10 | 7.8/10 | no score | 8/10 |
| GPT Sol | 6.5/10 | no score | 8/10 | no score | no score |
| Kimi K3.1 Pro | 6.5/10 | 7.5/10 | no score | 7.5/10 | 9/10 |
| GPT-6.1 Terra | 6.5/10 | no score | 7.9/10 | 8/10 | no score |

Five passes included focused follow-ups; skipped passes are recorded as `no score`. Review findings led to fixes for desktop label collisions, shared measured-row density, phone sort-control agreement, and lower-is-better ordering. DeepSeek reran all 178 unit tests, the build, and all 9 production browser tests on the final implementation. Kimi reran the focused ordering tests.

## Navigation revision

The dropdown was removed after user feedback. All seven desktop views are directly visible, with an underline marking the active chart. Phone navigation shows Overview, Scores, and Resources, followed by the active category's chart choices. Pressing the active category retains its selected chart.

Additional captures cover [phone overview](navigation-phone-overview.png), [phone scores](navigation-phone-scores.png), [phone resources](navigation-phone-resources.png), [320px resources](navigation-phone320-resources.png), [model picker](navigation-model-picker.png), [keyboard focus](navigation-keyboard-focus.png), [coding-only data](navigation-coding.png), [subscription pricing](navigation-subscription.png), and [empty selection](navigation-empty.png).

The new acceptance criterion is at least 8/10 from every council member in every category: navigation and discovery, hierarchy and typography, chart/data readability, controls and feedback, mobile responsiveness, accessibility, and visual consistency in light/dark themes. Earlier aggregate approvals do not establish this category-level result.
