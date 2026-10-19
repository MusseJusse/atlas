# Atlas

AI model benchmarks at [atlas.mussejusse.com](https://atlas.mussejusse.com).

A benchmark explorer based on the benchmark section of [Slopalytics](https://slopalytics.com/?frontier=true). Built with React, TypeScript, Tailwind CSS, and Vite. The usage dashboard is outside this project.

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

Components use Tailwind utilities. `src/styles.css` holds the font, theme tokens, minimal browser defaults, and responsive breakpoints. Tailwind Preflight is disabled. The base layer defines the reset.

## Included

- Cost versus intelligence.
- Intelligence index, with grouped reasoning levels and no cost axis.
- AA-Omniscience Index, with grouped reasoning levels and positive and negative scores around zero.
- Tokens per task, total tokens, cost per task, and total cost.
- Output speed in tokens per second, with grouped reasoning levels and a separate GPT-6.1 Sol Ultrafast endpoint.
- Time per task, with grouped reasoning levels and a labeled Ultrafast estimate.
- Model search and selection, reasoning filters, and the full model browser.
- Pareto frontiers, linear/log scales, grouped bars, sorting, and label controls.
- Hover details, click-to-pin details, PNG export, and light/dark themes.
- Responsive charts and a keyboard-accessible model picker on small screens.
- Filter and view settings in the URL. Theme preference stored locally.

## Data and attribution

The original baseline was a Slopalytics snapshot captured **13 October 2026 at 20:47 UTC**, with **699 model configurations**. Updates now come directly from the public [Artificial Analysis models page](https://artificialanalysis.ai/models). The current snapshot is in `src/data/benchmarks.json`. `pnpm data:sync` fetches the complete dataset used by AA's public charts, including task costs and token counts. No API key is needed. It does not use Slopalytics or AA's authenticated Data API.

Null measurements mean unmeasured or unavailable. They are omitted from the relevant charts, not treated as zero. Benchmark cost per task describes the benchmark workload, not a forecast of personal API spend.

The [AA-Omniscience Index](https://artificialanalysis.ai/evaluations/omniscience) measures factual reliability on a scale of -100 to 100. Higher is better. Correct answers raise the score, incorrect answers lower it, and abstentions have no penalty. Scores come from AA's `omniscience` field without normalization. The chart scales to the selected measurements and includes zero. Negative bars extend below zero, and mobile score positions use the same signed range. The importer and changelog track future score changes.

The output speed chart uses the snapshot's Artificial Analysis speed measurements. A separate [GPT-6.1 Sol Ultrafast measurement](https://artificialanalysis.ai/models/gpt-6-1-sol/providers), retrieved on 17 October 2026, adds 336.4 output tokens/s at Max effort. It lives in `src/data/speed-endpoints.ts`, keeps its own source and date, and has no task cost, token use or intelligence measurements. The GPT-6.1 Sol model picker entry controls both standard and Ultrafast bars. The charts keep Ultrafast as a separate group. Output speed excludes the wait before generation and does not measure complete task duration.

Time per task uses the snapshot's AA decode time estimates, not wall-clock benchmark run times. It excludes startup latency and tool waits. Ultrafast's local estimate uses standard Sol High's task tokens divided by the Ultrafast speed: `13,191.9 tokens / 336.4 tokens/s ≈ 39.2 seconds`. This assumes the Max-measured Ultrafast throughput applies to a High-effort workload. The estimate derives from the existing snapshot at load time and remains unavailable if the baseline token count is missing. Ultrafast's time values have a `~` prefix on charts, mobile details, tooltips and PNG exports. The tooltip shows the calculation.

Benchmark data comes from [Artificial Analysis](https://artificialanalysis.ai/). The Atlas interface uses a left model picker, chart workspace, and configuration detail strip. Model logos originate from the public [Slopalytics](https://slopalytics.com/) interface. Atlas is an independent benchmark explorer, not the official Slopalytics or Artificial Analysis service. There is no analytics collection or usage telemetry in this project.

DM Sans is bundled locally under the SIL Open Font License, included in `public/fonts/OFL.txt`. Fonts, logos, and benchmark data load locally.

The initial page preloads a 22.6 KB font with the characters, weights 400 to 700, and optical sizes 9 to 24 used by the interface. It keeps normal text shaping and tabular numbers, and omits unused stylistic alternates. The full 88.8 KB variable font stays available for other characters and PNG export. Vite inlines the small stylesheet and renders the default page into the HTML so its text and controls can paint before React loads. React hydrates the default light view. Saved dark themes and URLs with query parameters render their own initial state. Chart contents mount after hydration, once the viewport and font are ready, so server rendering does not guess chart dimensions.

The Vite data plugin packs the snapshot into columns and includes only fields the app reads. The original JSON stays intact, and tests compare every consumed field in all configurations, including full numeric precision. Numeric chart scales avoid shipping D3's general formatting and interpolation code. A comparison test checks their coordinates and ticks against D3, which remains a development dependency.

To regenerate the UI font, install `fonttools[woff]` in a Python environment, then run:

```sh
fonttools varLib.instancer src/assets/dm-sans.woff2 wght=400:700 opsz=9:24 --no-recalc-timestamp --output=/tmp/dm-sans-ui.woff2
pyftsubset /tmp/dm-sans-ui.woff2 --output-file=src/assets/dm-sans-ui.woff2 --flavor=woff2 --unicodes='U+0020-007E,U+00A0-00BF,U+00D7,U+00F7,U+2013-2014,U+2018-201D,U+2026,U+2032-2033,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD' --layout-features='ccmp,locl,rlig,liga,clig,calt,kern,mark,mkmk,tnum' --no-recalc-timestamp
```

## Sync model data

Run a manual sync when you want to check for new models or changed measurements:

```sh
pnpm data:sync
```

Use Node 22.18 or later, pnpm, Git, and the GitHub CLI. Run `gh auth login` once if needed. The command uses your Git and GitHub credentials. No scheduled job or special GitHub Actions PR permissions are needed.

The command fetches `origin` and starts from the latest `origin/main` in a temporary worktree. It imports the upstream snapshot, updates the changelog, installs dependencies, runs type checking, tests, and a production build, then pushes only the two data files and opens a non-draft PR. Your current branch, uncommitted files, and local site's build stay untouched. Temporary worktrees are removed on success or failure.

No changes against `main` means no commit or PR. If an open data sync PR already contains the latest measurements, the command prints its URL without pushing again. New changes update that same PR against the latest `main`. Merged updates start a new PR. Data branches use `data/model-sync-<id>` names. The command replaces an existing data branch with an explicit Git lease, so concurrent pushes cause a failure instead of being overwritten. It refuses to replace a PR containing non-data changes. Pending history consolidates against the last merged snapshot.

The importer reads the current chart-data manifest from AA's public models page. It decodes the payload with the same AES-GCM and gzip format as AA's browser client, using the key published in that page. It never executes downloaded JavaScript. It checks the payload against AA's full model catalogue so a default selection cannot replace the full dataset. It validates imported fields and compares configurations by AA model slug. Family names, reasoning tiers, costs, token counts, output speed, and decode time come from AA's fields without rounding or recalculation. The changelog records additions, removals, and before/after values. An ID change appears as a removal and an addition. The original snapshot is the history baseline; earlier additions are not invented.

Timestamp-only and ordering changes are ignored. Local Ultrafast measurements stay separate. Fetch errors, invalid or duplicate models, incomplete catalogues, missing measurement groups, and drops of more than 20% of models fail before writing the candidate data. Failed validation prevents a push or PR. This public chart format is not a documented API. Unexpected source-format changes require an importer update.

To check upstream data without changing files:

```sh
pnpm data:check
```

For a lower-level refresh that writes the snapshot and changelog in your current checkout without creating a PR:

```sh
pnpm data:refresh
```

The dedicated changelog is at `/?page=changelog`, with filters for additions, updates, and removals. Its check time belongs to the published data update. The snapshot timestamp records when we fetched AA, not when AA last measured each model. Updates depend on when Artificial Analysis publishes new measurements. Provider announcements alone do not change the benchmark snapshot. Newly added families appear in the full model browser; the curated default and notable selections stay manual.

Review and merge the generated PR to publish the data through the normal deployment. The persistent local server serves `dist`, so pull the merged changes, validate and rebuild, then restart the local service to update the local site. The sync command does not merge, deploy, or restart that service.

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
pnpm exec vite build --outDir /tmp/atlas-perf --emptyOutDir
pnpm exec vite preview --outDir /tmp/atlas-perf --host 127.0.0.1 --port 4390 --strictPort
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

## PageSpeed validation

On 17 October 2026, Lighthouse 13.5.0 scored the isolated production preview **100 for performance, accessibility, best practices, and SEO on both mobile and desktop**. Mobile used the default simulated slow 4G profile. It recorded 1.4 s FCP, 1.7 s LCP, 0 ms blocking time, and zero layout shift. Desktop recorded 0.3 s FCP and 0.4 s LCP. These are local lab results, not a measurement of a new Vercel deployment.

Initial JavaScript is now 406.7 KB uncompressed, 115.8 KB gzip, compared with 426.0 KB and 127.0 KB before this pass. The initial font fell from 88.8 KB to 22.6 KB. The generated HTML includes the stylesheet and default page markup.

After starting the isolated production preview above, run Lighthouse with a local Chrome or Chromium installation:

```sh
pnpm dlx lighthouse@13.5.0 http://127.0.0.1:4390 --only-categories=performance,accessibility,best-practices,seo
pnpm dlx lighthouse@13.5.0 http://127.0.0.1:4390 --preset=desktop --only-categories=performance,accessibility,best-practices,seo
```

Set `CHROME_PATH` if Lighthouse cannot find the browser automatically.
