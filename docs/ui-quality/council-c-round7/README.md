# Consistent series labels

Round 7 keeps the user's selected continuous canvas C and addresses Terra's remaining round 6 findings. Desktop direct labels now use the same contrast-adjusted series hue as the phone legend. Both call the shared `modelTextColor` helper. At 320px, the subscription legend keeps the existing dot and API note together instead of splitting them across lines.

These are small presentation changes. Plot dimensions, exact data, navigation, target sizes and legend height are unchanged. The model-catalog scroll cue remains. No collapse control or larger redesign was added.

## Evidence and checks

Ten fresh production-build PNGs cover the same views, themes, selections and dimensions as [round 6](../council-c-round6/). `measurements.json` adds direct-label contrast to the existing legend and overflow measurements. The minimum measured text contrast is 4.73:1 across the captured light/dark labels and legends. No captured state overflows horizontally. The default phone legend still ends at 836px.

Compare `desktop-light.png` and `phone-light.png` with the matched [reference desktop](../council-a/matched-reference-desktop.png) and [phone](../council-a/matched-reference-phone.png). PR 80 remains `council-a/after-desktop.png` and `after-mobile.png`. Reference selection, effort, API pricing, theme and viewport match, with possible data-snapshot differences. Earlier evidence directories describe older revisions, not current rendering.

Type checking and production build pass. Five focused production Chromium tests pass, covering resting series contrast/desktop family pins, phone legend pins, compact plot dimensions, exact scale changes and the continuous canvas geometry/navigation. The model-presentation unit test passes. All 185 unit tests and all 34 browser tests passed on preceding C revisions; these latest changes affect labels only.

The nine-state axe-core 4.14.0 audit was rerun on this build with zero violations. Incomplete contrast and popup checks remain documented. No screen-reader pass or accessibility certification is claimed.

## Council status

[Full round 6 scores and findings](../council-c-round6/round6.md) remain recorded. The target was not met. Round 7 is pending; no prior vote approves this revision.

| Member | Round 5 | Round 6 | Round 7 |
| --- | --- | --- | --- |
| GPT-6.1 Sol | 9.0 | 9.1 | pending |
| GPT-6.1 Terra | 8.8 | 8.9 | pending |
| GPT-6 Astra | 9.0 | 9.0 | pending |
| GPT-6 Luna | 8.9 | 9.0, clarified | pending |

The user approved available-model replacements after usage limits. This panel uses four OpenAI models and lacks vendor diversity. Each member must score overall UI at least 9 and prefer current over reference in every scored category. Individual category scores need not all reach 9. All four independent votes must pass before the council target is claimed.
