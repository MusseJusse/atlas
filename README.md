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
- Cyber Index versus cost per task, using the same scatter chart layout.
- Cost versus Coding Agent Index, with separate agent configurations and API cost per task.
- Intelligence index, with grouped reasoning levels and no cost axis.
- AA-Omniscience Index, with grouped reasoning levels and positive and negative scores around zero.
- Tokens per task, total tokens, cost per task, and total cost.
- Output speed in tokens per second, with grouped reasoning levels and a separate GPT-6.1 Sol Ultrafast endpoint.
- Time per task, with grouped reasoning levels and a labeled Ultrafast estimate.
- Model search and selection, reasoning filters, and the full model browser.
- Pareto frontiers, linear/log scales, grouped bars, sorting, and label controls.
- Hover details, click-to-pin details, and light/dark themes.
- Responsive charts and a keyboard-accessible model picker on small screens.
- Efficiency trends with cost records over release dates, filtered by Intelligence Index threshold.
- Filter and view settings in the URL. Theme preference stored locally.

## Data and attribution

The original baseline was a Slopalytics snapshot captured **13 October 2026 at 20:47 UTC**, with **699 model configurations**. Updates now come directly from the public [Artificial Analysis models page](https://artificialanalysis.ai/models). The current snapshot is in `src/data/benchmarks.json`. `pnpm data:sync` fetches the complete dataset used by AA's public charts, including task costs and token counts. No API key is needed. It does not use Slopalytics or AA's authenticated Data API.

The **Coding Only** checkbox above the reasoning modes switches the shared benchmark dataset. It keeps models measured on both Terminal-Bench 4.0 and FrontierCode 2.0. Score charts use Atlas's equal-weight average of their scores on a 0–100 scale, while cost, output tokens and estimated decode time per task average the two evaluations' unweighted per-task measurements. Total output tokens and total cost sum one run of Terminal-Bench's 66 tasks and FrontierCode's 132 tasks, excluding repeats. Both evaluations must supply a measurement for it to appear; measured zero stays valid. Omniscience retains its factual-reliability score for the same coding-measured model cohort.

The switch updates scatter plots, score bars, workload bars, selected details and Pareto calculations. The `codingOnly=true` URL setting preserves it. Turning it off restores the original dataset without mutation. The importer and changelog track component scores and derived coding workloads. The initial backfill records its own capture time and payload hash in `codingSource` and matches the pinned snapshot catalogue exactly. Full refreshes still require a matching live AA catalogue and payload.

Null measurements mean unmeasured or unavailable. They are omitted from the relevant charts, not treated as zero. Benchmark cost per task describes the benchmark workload, not a forecast of personal API spend.

The Efficiency page reproduces the [AA Trends cost-efficiency chart](https://artificialanalysis.ai/trends#efficiency) from the same benchmark snapshot. For thresholds of 10, 20, 30, 40, 50, and 60, it retains each new lowest task cost among qualifying configurations, ordered by release date. It uses the full catalogue, independently of the benchmark model picker. Scores remain unrounded when testing thresholds. Missing and non-positive values stay absent, matching AA's filtering for this chart. Atlas keeps only the best qualifying configuration per day, with stable ID ties; AA can show intermediate records at the same date depending on input order.

These are current measurements arranged by release date, not historical API prices. Data refreshes can revise earlier steps. The page shows the snapshot date and links to AA's source. Cost uses a logarithmic axis. Threshold selections are stored in the URL. Points support hover details, keyboard focus, Enter or Space to pin, and Escape to clear the selection. Efficiency reuses the scatter plot's model card below the threshold filters on desktop and above the plot on phones, with threshold and release-date context in its footer. The phone layout reserves card space so the plot does not move during hover or pinning. Pointer selection uses the nearest visible marker when hit areas overlap. Hover previews disappear on leaving the point; pinned records stay selected while other points are hovered. Records use the same circular markers as the scatter plots, without hover guide lines or series dimming. The views share the same interaction resolver and keyboard pin handlers. When thresholds share a point, click to pin it, then use the card's threshold selector to choose an overlapping record. The underlying calculation, URL handling, and chart geometry have focused tests.

The Coding agents scatter chart uses a separate [Artificial Analysis Coding Agent Index v2.0](https://artificialanalysis.ai/agents/coding-agents) snapshot in `src/data/coding-agents.json`, captured on 23 October 2026. Its 24 configurations retain AA's source IDs, full configuration labels, fractional index scores and API costs at source precision. Chart scores multiply the source fraction by 100. The [v2.0 methodology](https://artificialanalysis.ai/methodology/coding-agents-benchmarking) averages FrontierCode v1.1, Terminal-Bench 4.0 and SWE-Atlas-QnA-AA. Cost is the average API cost per task, including applicable caching charges and discounts, rather than subscription pricing.

Agent scores and costs never enter the model benchmark dataset. The model picker selects their model families, with mixed-model Devin configurations available as separate entries in the full browser. Each agent configuration is a separate plotted series, so different tools are never connected as reasoning levels. A family's only measured Max tier remains visible under the default reasoning filter, matching the model charts. Null scores or costs are omitted, and zero costs are eligible only on a linear axis. Labels and selected details identify the agent and settings. Dense selections thin chart labels to prevent overlap; every point remains available to focus or pin. The footer shows the coding snapshot date while that chart is active. The existing `data:sync` command updates model data only; this coding snapshot is a separate manual capture from the public page's `benchmarkRows` data, with the HTML SHA-256 recorded for provenance.

The [Cyber Index](https://artificialanalysis.ai/evaluations/artificial-analysis-cyber-index) scatter chart uses a separate v1 snapshot in `src/data/cyber-index.json`, captured on 24 October 2026. It retains all 23 measured configurations from the complete public model payload, including Daybreak Blue as a separate, labeled trusted-access configuration. Scores stay on AA's 0 to 100 scale. Costs come from AA's own chart calculation, including caching, fallback pricing and refusal estimates, divided by its 262-task index workload. They are Cyber workload costs, separate from Intelligence Index and coding-agent costs. The source HTML SHA-256 records provenance. The capture used the public page's model manifest and its published `72920.c` evaluation projection with `priceFallbackByModelId`, then divided `evalCost.total` by the evaluation's `taskCount`. This snapshot is manual and is outside `data:sync`. The existing model picker and reasoning filters apply, retaining a family's only measured Max tier. Pinned details retain full fallback settings, and the footer shows the Cyber snapshot date.

The [AA-Omniscience Index](https://artificialanalysis.ai/evaluations/omniscience) measures factual reliability on a scale of -100 to 100. Higher is better. Correct answers raise the score, incorrect answers lower it, and abstentions have no penalty. Scores come from AA's `omniscience` field without normalization. The chart scales to the selected measurements and includes zero. Negative bars extend below zero, and mobile score positions use the same signed range. The importer and changelog track future score changes.

The output speed chart uses the snapshot's Artificial Analysis speed measurements. A separate [GPT-6.1 Sol Ultrafast measurement](https://artificialanalysis.ai/models/gpt-6-1-sol/providers), retrieved on 17 October 2026, adds 336.4 output tokens/s at Max effort. It lives in `src/data/speed-endpoints.ts`, keeps its own source and date, and has no task cost, token use or intelligence measurements. The GPT-6.1 Sol model picker entry controls both standard and Ultrafast bars. The charts keep Ultrafast as a separate group. Output speed excludes the wait before generation and does not measure complete task duration.

Time per task uses the snapshot's AA decode time estimates, not wall-clock benchmark run times. It excludes startup latency and tool waits. Ultrafast's local estimate uses standard Sol High's task tokens divided by the Ultrafast speed: `13,191.9 tokens / 336.4 tokens/s ≈ 39.2 seconds`. This assumes the Max-measured Ultrafast throughput applies to a High-effort workload. The estimate derives from the existing snapshot at load time and remains unavailable if the baseline token count is missing. Ultrafast's time values have a `~` prefix on charts, mobile details, and tooltips. The tooltip shows the calculation.

Benchmark data comes from [Artificial Analysis](https://artificialanalysis.ai/). Model logos originate from the public [Slopalytics](https://slopalytics.com/) interface. Atlas is an independent benchmark explorer, not the official Slopalytics or Artificial Analysis service. There is no analytics collection or usage telemetry in this project.

The Atlas interface uses a left model picker, chart workspace, and compact configuration details. Previews and pinned details use the same overlay on desktop and mobile, without resizing the plot. Bar charts place the overlay at the top left when sorted lowest first and top right when sorted highest first. Scatter plots always use the bottom right of the plotting area, clear of the axes and model labels. The overlay shows the active chart metric and two supporting measurements without duplicate rows.

The overlay shows the full model name, logo, reasoning level and source. It fits within the plotting area at phone widths. Phone range charts keep their existing per-model expansion. Clearing the selection removes the overlay.

DM Sans is bundled locally under the SIL Open Font License, included in `public/fonts/OFL.txt`. Fonts, logos, and benchmark data load locally.

The initial page preloads a 22.6 KB font with the characters, weights 400 to 700, and optical sizes 9 to 24 used by the interface. It keeps normal text shaping and tabular numbers, and omits unused stylistic alternates. The full 88.8 KB variable font stays available for other characters. Vite inlines the small stylesheet and renders the default page into the HTML so its text and controls can paint before React loads. React hydrates the default light view. Saved dark themes and URLs with query parameters render their own initial state. Chart contents mount after hydration using the measured viewport and whichever font is available. Chart dimensions are measured again when fonts finish loading, so font loading does not block controls.

Curated model choices and colors live in `src/model-presentation.ts`; measurement formatting lives in `src/formatModel.ts`. `src/models.ts` owns the catalogue and model comparisons.

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

The two refresh renames are not crash-atomic. If a process stops after replacing the snapshot but before replacing the changelog, stop any remaining refresh process and run `pnpm data:recover` in that checkout before retrying. The command restores the single `.backup` snapshot whose timestamp matches the changelog. It does nothing when the pair already matches and refuses missing or ambiguous backups. Keep backup files until recovery succeeds. If no matching backup remains, restore `src/data/benchmarks.json` and `src/data/changelog.json` together from the same Git commit. Orphaned `.tmp` files are not used by recovery and can be removed after the process has stopped.

AA stopped providing the intelligence estimate flag in November 2026, so the importer and client no longer classify intelligence scores as measured or estimated. Do not infer that provenance from a missing flag. Local decode-time and subscription estimates retain their separate attribution.

The dedicated changelog is at `/?page=changelog`, with filters for additions, updates, and removals. Its check time belongs to the published data update. The snapshot timestamp records when we fetched AA, not when AA last measured each model. Updates depend on when Artificial Analysis publishes new measurements. Provider announcements alone do not change the benchmark snapshot. Newly added families appear in the full model browser; the curated default and notable selections stay manual.

Review and merge the generated PR to publish the data through the normal deployment. The persistent local server serves `dist`, so pull the merged changes, validate and rebuild, then restart the local service to update the local site. The sync command does not merge, deploy, or restart that service.

## Validation

```sh
pnpm check
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

The browser suite serves the production build on isolated port 4391. It checks prerendered content and inline CSS, DOM reuse during hydration, font-independent startup, saved dark views, history restoration, and phone chart navigation. CI runs the same suite in Chromium after building.

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

Desktop chart contents mount as sections approach the viewport and stay mounted after visiting, so pinned details survive navigation. Phones render the dot plots without also building hidden SVG bar charts. Chart geometry and number formatters are reused across hover updates.

## PageSpeed validation

On 17 October 2026, Lighthouse 13.5.0 scored the isolated production preview **100 for performance, accessibility, best practices, and SEO on both mobile and desktop**. Mobile used the default simulated slow 4G profile. It recorded 1.4 s FCP, 1.7 s LCP, 0 ms blocking time, and zero layout shift. Desktop recorded 0.3 s FCP and 0.4 s LCP. These are local lab results, not a measurement of a new Vercel deployment.

Initial JavaScript is now 406.7 KB uncompressed, 115.8 KB gzip, compared with 426.0 KB and 127.0 KB before this pass. The initial font fell from 88.8 KB to 22.6 KB. The generated HTML includes the stylesheet and default page markup.

After starting the isolated production preview above, run Lighthouse with a local Chrome or Chromium installation:

```sh
pnpm dlx lighthouse@13.5.0 http://127.0.0.1:4390 --only-categories=performance,accessibility,best-practices,seo
pnpm dlx lighthouse@13.5.0 http://127.0.0.1:4390 --preset=desktop --only-categories=performance,accessibility,best-practices,seo
```

Set `CHROME_PATH` if Lighthouse cannot find the browser automatically.

## Subscription task-cost estimates

The full-index Cost per task and Cost vs intelligence views can switch between measured API pricing and estimated subscription pricing. API remains the default for existing links. Each cost chart's three-dot settings menu contains the pricing toggle, reset checkbox and plan selectors. These controls share state across both cost views. The plan selector chooses a first-party plan per provider, or the explicitly named source default for each model. Settings round-trip through `pricing`, repeated `plan`, and `resets` URL parameters. Coding-only charts and Efficiency retain their measured API costs.

`src/data/subscriptions.json` is a separate, manual pricing capture from [MyPriors' public snapshot](https://mypriors.com/api/snapshot?view=core), which imports [Real API Pricing](https://github.com/Fei2411/real-api-pricing). It records the raw response SHA-256, source generation/capture timestamps, exact source-to-local model IDs, allowance measurement dates, token-mix assumptions, API token rates, named default plans, monthly fees, effective prices and source confidence. It currently covers 22 exact model families and 60 model-plan pairs. Gemini Carbon's assumed Argon allowance and inferred successor-model allowances are deliberately excluded. Unknown models or unsupported selected plans retain a labeled API fallback. Estimates are bound to the exact benchmark source hash used for this pricing capture. Any subsequent benchmark capture triggers API fallback until pricing is recaptured. AA's retained model data lacks cache rates, so a hash change fails closed even when input/output prices match. The per-model input/output rate check remains an additional guard. The pricing capture is independent of `data:sync`.

To refresh it, retrieve the snapshot above and review `subscription-token-price` observations against the current benchmark families and API input/output rates. Preserve explicit family mappings, actual `details.plan` defaults, plan arrays, the externally assumed `details.mix`, and `details.listPrice` or the exact source model's API metadata. Do not infer input/cache usage from AA output tokens or task costs. Record a new response hash and timestamps, bind `benchmarkSourceHash` to the reviewed benchmark capture, and verify the source allowance convention before changing prices. The current supported first-party plans use Real API Pricing's four-week synthetic month, represented as a 28-day allowance normalization period. Preserve its quoted monthly fee and allowance together. This is not a calendar-month quota guarantee. Confidence rates the upstream allowance/plan estimate, not measured benchmark execution or the accuracy of the external token mix.

The calculation is `API cost per task × (plan USD per million tokens / mix-weighted API USD per million tokens)`. The mix includes cache reads, fresh input, cache writes and output. Cache-write rates missing from the source list-price object use the exact source model's write rate when present, otherwise the source convention of 1.25 times input price. The same model-level ratio applies across reasoning efforts. This is a full-utilization equivalent allocation using an external coding workload mix. AA does not publish enough benchmark input/cache detail to validate it as actual subscription task spend. It assumes one model consumes the full allowance; model allowances are not additive. Raw benchmark costs, total costs and other workloads are never overwritten. Null remains missing and zero remains zero. Subscription frontier comparisons include only supported estimates. Zero costs remain eligible on linear plots and are omitted with a note on logarithmic scatter plots.

Count bonus resets is off by default. The snapshot retains MyPriors' [OpenTheRank reset history](https://opentherank.com/codex-reset/), provider announcement links and scope. Only all-user reset events linked to a provider announcement are eligible. Tracker-only observations, targeted resets and banked credits receive no bonus. Announcement links are upstream evidence, not an independent audit of every subscriber's quota. Anthropic uses a fixed weekly clock; OpenAI uses a restarted weekly clock. A restarted clock requires an evidenced prior boundary and credits only the elapsed fraction of a week, subtracting the displaced remainder. Unknown intervening resets prevent credit until the next established boundary. Events use `(capture end − 30 days, capture end]`, where capture end is the source generation timestamp. Ordinary renewals already belong to the base allowance and are not counted again.

Bonus estimates assume the observed net bonus rate repeats, not that future resets are promised. For base tokens `T` over source period `D`, observed net bonus tokens `E` over 30 days become `E × D / 30` before adding them to `T`. Divide the baseline ratio by `1 + (E × D / 30) / T`. With the source's weekly allowance convention `T × 7 / D`, this equals `1 + extraWeeks × 7 / 30`. No compatible evidence means no discount. Selected details identify the plan, source confidence, data date and applied bonus; the chart SVG retains pricing metadata and an accessible description. Pricing context stays visible above the chart and in point details. There is no chart export feature in the current app.
