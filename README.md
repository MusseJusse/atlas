# Slopalytics benchmarks

A local reproduction of the benchmark section of [Slopalytics](https://slopalytics.com/?frontier=true). Built with React, TypeScript, Tailwind CSS, and Vite. The usage dashboard is outside this project.

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

## Styling

Components use Tailwind utilities. `src/styles.css` holds the font, theme tokens, minimal browser defaults, and the original inclusive responsive breakpoints. Tailwind Preflight is disabled to preserve the existing rendering.

## Included

- Cost versus intelligence.
- Tokens per task, total tokens, cost per task, and total cost.
- Output speed in tokens per second, with grouped reasoning levels and a separate GPT-6.1 Sol Ultrafast endpoint.
- Model search and selection, reasoning filters, and the full model browser.
- Pareto frontiers, linear/log scales, grouped bars, sorting, and label controls.
- Hover details, click-to-pin details, PNG export, and light/dark themes.
- Responsive charts and a keyboard-accessible model picker on small screens.
- Filter and view settings in the URL. Theme preference stored locally.

## Data and attribution

This version uses the same public benchmark snapshot bundled by Slopalytics, captured **13 October 2026 at 20:47 UTC**, with **699 model configurations**. The snapshot is in `src/data/benchmarks.json`. It is static and does not refresh from the Artificial Analysis API. No API key is needed.

Null measurements mean unmeasured or unavailable. They are omitted from the relevant charts, not treated as zero. Benchmark cost per task describes the benchmark workload, not a forecast of personal API spend.

The output speed chart uses the snapshot's Artificial Analysis speed measurements. A separate [GPT-6.1 Sol Ultrafast measurement](https://artificialanalysis.ai/models/gpt-6-1-sol/providers), retrieved on 17 October 2026, adds 336.4 output tokens/s at Max effort. It lives in `src/data/speed-endpoints.ts`, keeps its own source and date, and has no task cost, token use, intelligence or task time measurements. The GPT-6.1 Sol model picker entry controls both standard and Ultrafast bars. The chart keeps Ultrafast as a separate group. Output speed excludes the wait before generation and does not measure complete task duration.

Benchmark data comes from [Artificial Analysis](https://artificialanalysis.ai/). Visual styling and model logos reproduce the public [Slopalytics](https://slopalytics.com/) benchmark interface. This is a personal local reproduction, not the official service. There is no analytics collection or usage telemetry in this project.

DM Sans is bundled locally under the SIL Open Font License, included in `public/fonts/OFL.txt`. Fonts, logos, and benchmark data load locally.

The browser receives a lossless WOFF2 version of the full variable font. The Vite data plugin packs the snapshot into rows and includes only fields the app reads. The original JSON stays intact, and tests compare every consumed field in all 699 configurations, including full numeric precision.

## Validation

```sh
pnpm check
pnpm test
pnpm build
```

Focused tests cover frontier dominance, ties and missing measurements, reasoning filters, grouped bar ordering, and URL state round-tripping.

## Performance measurements

Build and serve a separate production preview without replacing the persistent site's `dist` directory or using its port:

```sh
pnpm check
pnpm exec vite build --outDir /tmp/slopalytics-perf --emptyOutDir
pnpm exec vite preview --outDir /tmp/slopalytics-perf --host 127.0.0.1 --port 4390 --strictPort
```

Open that preview at 1280 by 800 and paste `scripts/measure-performance.js` into the browser console. It warms all charts, takes 24 navigation and model-toggle samples, then restores the starting URL and filters. Update timings include React's microtask flush and synchronous layout. They exclude paint and are not end-to-end interaction latency.

Local Chromium results against `f2a4a2b`, with no CPU or network throttling:

| Measurement | Before | After |
| --- | ---: | ---: |
| Initial JavaScript, uncompressed | 576.8 KB | 422.1 KB |
| Initial JavaScript, gzip | 133.7 KB | 125.7 KB |
| Font | 240.2 KB | 88.8 KB |
| Initial desktop DOM nodes, default selection | 1,624 | 613 |
| Navigation update, default selection, median | 3.0 ms | 0.8 ms |
| Model toggle, default selection, median | 6.1 ms | 4.3 ms |
| Navigation update, all 699 configurations ungrouped, median | 17.9 ms | 2.1 ms |
| Model toggle, all 699 configurations ungrouped, median | 22.5 ms | 8.8 ms |

The first local page load recorded first contentful paint at 148 ms before and 68 ms after. A later cached reload recorded 60 ms and 40 ms. These are local samples, not a network or device performance guarantee.

Desktop chart contents mount as sections approach the viewport and stay mounted after visiting, so pinned details survive navigation. Phones render the dot plots without also building hidden SVG bar charts. Chart geometry and number formatters are reused across hover updates, and PNG export code loads on demand.
