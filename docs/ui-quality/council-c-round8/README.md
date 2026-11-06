# Clearer label connectors

Round 8 retains the selected continuous canvas C and improves two small details. Desktop label connectors keep their 0.7px width, series hue and Terra dashes, while removing the opacity reduction that made them difficult to trace. The catalog scroll shadow uses a softer 12% gradient over 16px, following Sol's optional round 7 finding.

Plot dimensions, labels, data positions, phone legends, target sizes and navigation are unchanged. The API note remains together at 320px. No extra control or layout redesign was added.

## Evidence and validation

Ten fresh production-build captures cover the same viewports, themes and selections as [round 7](../council-c-round7/). `measurements.json` includes connector and text contrast. The minimum measured connector contrast is now 3.18:1, up from 1.61:1. Direct-label and legend text remains at least 4.73:1. No capture overflows horizontally; the full default phone legend still ends at 836px.

Compare current desktop/phone light captures with the matched [reference desktop](../council-a/matched-reference-desktop.png) and [phone](../council-a/matched-reference-phone.png). PR 80 is `council-a/after-desktop.png` and `after-mobile.png`. Reference selection, efforts, API pricing, theme and viewport match, with possible data-snapshot differences. Earlier directories describe older app revisions.

Type checking, production build and all 34 production Chromium tests pass. The existing resting-line contrast test now checks all seven label connectors too, with a 3:1 minimum in both themes. The previous C source passed all 185 unit tests; the later source refinements change only presentation. No unit tests were added for CSS.

The nine-state axe-core 4.14.0 audit was rerun on the final build with zero violations. Incomplete SVG contrast and popup checks remain recorded. Separate browser measurements cover the relevant lines and labels. No screen-reader pass or conformance certification is claimed.

## Council status

[Full round 7 scores and findings](../council-c-round7/round7.md) remain recorded, including Luna's corrected verdict. All four overall scores reached 9, but its chart-readability tie left the strict comparison target unmet. No score was changed to manufacture approval.

| Member | Round 7 | Round 8 |
| --- | --- | --- |
| GPT-6.1 Sol | 9.1, pass | pending |
| GPT-6.1 Terra | 9.0, pass | pending |
| GPT-6 Astra | 9.0, pass | pending |
| GPT-6 Luna | 9.0, chart tie | pending |

The user approved available-model replacements after usage limits. This four-model OpenAI panel lacks vendor diversity. Each individual vote must score overall UI at least 9 and prefer current to reference in every scored category. A tie does not meet that strict comparison; individual category scores need not all reach 9. Round 8 requires four fresh independent votes.
