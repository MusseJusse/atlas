# Aligned ranking markers

After the frozen council review, the user pointed out that close scores formed an awkward staircase on phone charts. Vertical collision avoidance moved markers away from their range line, especially in Omniscience.

All markers now stay centered on the range line at their exact measured X position. The highest or lowest value draws last so its filled marker remains visible. When markers are close enough to overlap, the value column reports the overlapping configuration count. Expanding the row retains all exact reasoning values and the optional data table remains complete.

Actual application captures:

- [Omniscience at 393px](aligned-omniscience-phone393.png)
- [Intelligence at 393px](aligned-intelligence-phone393.png)
- [Omniscience at 320px](aligned-omniscience-phone320.png)
- [Desktop Omniscience](aligned-omniscience-desktop.png)
- [Phone dark mode](aligned-omniscience-phone-dark.png)

Type checking, 182 unit tests, production build and 21 production Chromium tests pass. The new browser assertion checks every marker's center against its range line in Intelligence and Omniscience at 320, 393 and 1280px, while checking that expansion and the exact-value table retain every configuration.

This user-requested follow-up supersedes the vertical dodging in the earlier implementation. The council score history still identifies the specific frozen revision it reviewed.
