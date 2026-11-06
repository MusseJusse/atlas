# Continuous canvas detail refinement

Round 6 retains the user's selected C layout. Two small changes address round 5 findings: legend names now use their series hue with enough light/dark text contrast, and the desktop model catalog has a bottom scroll shadow. The shadow disappears when the last row reaches the bottom. Native scrollbar styling is retained, though macOS can hide its scrollbar at rest.

The plot dimensions, navigation, data positions, phone targets and default legend dimensions are unchanged. Compact desktop navigation already has zero row gap and 40px targets, so no further compression was made. The footer can scroll below the first phone viewport; no extra collapse control was added.

## Evidence

The ten PNGs are fresh production-build captures after both detail changes. They use the same names, viewports, themes and paths as the [round 5 evidence](../council-c/). `measurements.json` records legend colors/contrast, overflow, legend position and catalog geometry. The script's local canvas pixel calculation finds a minimum default-legend text contrast of 4.73:1 across the captured states. No captured state overflows horizontally. The phone legend still ends at 836px.

Compare current `desktop-light.png` and `phone-light.png` with [matched reference desktop](../council-a/matched-reference-desktop.png) and [phone](../council-a/matched-reference-phone.png). PR 80 remains `council-a/after-desktop.png` and `after-mobile.png`. Selection, effort, theme and viewport are matched in the reference pair, with possible data-snapshot differences. Older `matched-update-*` and `round4-*` are not current captures.

## Validation

Type checking and production build pass. All 34 production Chromium tests passed after the legend/scrollbar styling; the three focused geometry/legend-pin/near-point tests passed again after adding the scroll shadow. The nine-state axe-core audit was rerun after the final shadow change and reports zero violations, with incomplete contrast/popup checks retained. The current evidence makes no screen-reader or conformance claim. The 185 unit tests passed on the preceding C source; this refinement changes only presentation.

The catalog was independently scrolled to its exact endpoint of 344px, and the initial and final states were visually inspected. Its content remains 633px tall inside a 289px viewport. The scroll cue uses local/scroll backgrounds with no event handlers or animations.

## Council status

[Full round 5 scores and findings](../council-c/round5.md) remain recorded. Sol and Astra passed at 9.0 overall, Luna scored 8.9 and Terra 8.8. The target was not met. Round 6 is pending; no earlier vote approves this revision.

| Member | Round 5 | Round 6 |
| --- | --- | --- |
| GPT-6.1 Sol | 9.0 | pending |
| GPT-6.1 Terra | 8.8 | pending |
| GPT-6 Astra | 9.0 | pending |
| GPT-6 Luna | 8.9 | pending |

The user approved available-model replacements after the original providers hit usage limits. This panel has four OpenAI models and lacks vendor diversity. All four independent overall scores must reach at least 9, with current preferred to the reference in every category, before the target is claimed.
