# Slopalytics benchmarks

A local reproduction of the benchmark section of [Slopalytics](https://slopalytics.com/?frontier=true). Built with React, TypeScript, and Vite. The usage dashboard is outside this project.

## Open the site

http://127.0.0.1:4387

The dedicated macOS LaunchAgent serves the built site on loopback only. It runs independently of the terminal and starts at login.

```sh
pnpm local:status
pnpm local:stop
pnpm local:start
```

Logs are in `.local/server.log` and `.local/server-error.log`.

## Development

```sh
pnpm install
pnpm local:stop
pnpm dev
```

After editing, stop the development server and restore the persistent server:

```sh
pnpm test
pnpm build
pnpm local:start
```

The development and persistent servers use port 4387. Run one at a time.

## Included

- Cost versus intelligence.
- Tokens per task, total tokens, cost per task, and total cost.
- Model search and selection, reasoning filters, size groups, and the full model browser.
- Pareto frontiers, linear/log scales, grouped bars, sorting, and label controls.
- Hover details, click-to-pin details, PNG export, and light/dark themes.
- Responsive charts and a keyboard-accessible model picker on small screens.
- Filter and view settings in the URL. Theme preference stored locally.

## Data and attribution

This version uses the same public benchmark snapshot bundled by Slopalytics, captured **13 October 2026 at 20:47 UTC**, with **699 model configurations**. The snapshot is in `src/data/benchmarks.json`. It is static and does not refresh from the Artificial Analysis API. No API key is needed.

Null measurements mean unmeasured or unavailable. They are omitted from the relevant charts, not treated as zero. Benchmark cost per task describes the benchmark workload, not a forecast of personal API spend.

Benchmark data comes from [Artificial Analysis](https://artificialanalysis.ai/). Visual styling and model logos reproduce the public [Slopalytics](https://slopalytics.com/) benchmark interface. This is a personal local reproduction, not the official service. There is no analytics collection or usage telemetry in this project.

DM Sans is bundled locally under the SIL Open Font License, included in `public/fonts/OFL.txt`. Fonts, logos, and benchmark data load locally.

## Validation

```sh
pnpm check
pnpm test
pnpm build
```

Focused tests cover frontier dominance, ties and missing measurements, reasoning filters, grouped bar ordering, and URL state round-tripping.
