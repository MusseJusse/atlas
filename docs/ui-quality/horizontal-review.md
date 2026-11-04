# Horizontal ranking review

The user rejected the table-first ranking and raised the target to 9/10 from every council member in every category. Previous 8-level approvals do not satisfy this request.

Rankings now use horizontal model rows on a shared scale. Dots show every measured configuration, the range connects configurations, and a faint bar runs from zero to the first value in the chosen direction. Models default to their best measurement first. Signed scores keep their zero reference. Model rows expand to exact reasoning values and selectable configuration details. View data remains a secondary disclosure. There is no automatic table fallback at any width or selection size.

The previous implementation is recorded in `before-horizontal-ranking.png`. Current application captures:

- `horizontal-ranking.png`, `horizontal-ranking-phone.png`, `horizontal-ranking-320.png`
- `horizontal-signed.png`, `horizontal-cost.png`, `horizontal-tokens.png`, `horizontal-time.png`
- `horizontal-expanded.png`, `horizontal-dark.png`, `horizontal-dark-phone.png`
- `after-dense.png`, `after-dense-mobile.png`, `after-dense-mobile-settings.png` now show graphical broad selections.
- Other pages and states remain in the `after-*` and `navigation-*` captures. These are actual application screenshots with production data.

Validation before the first 9-level review: type checking, 179 unit tests, production build, and 17 production Chromium tests pass. Browser coverage checks all configurations remain plotted, table completeness on disclosure, grouped cost/intelligence ordering in both directions, signed positions, keyboard expansion/selection/close focus, all seven views, history, narrow layout, and existing Efficiency/Changelog behavior. Vite's existing bundle-size warnings remain.

Council round 1 for the new target is pending. Categories remain navigation and discovery, hierarchy and typography, chart/data readability, controls and feedback, mobile responsiveness, accessibility, and light/dark consistency. Reviewers must assess visual quality as well as correctness, and identify concrete changes needed for any score below 9.
