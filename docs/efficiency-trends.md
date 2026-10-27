# Artificial Analysis efficiency trends

Atlas can reproduce the two charts in the [Efficiency section of AA Trends](https://artificialanalysis.ai/trends#efficiency) using its existing importer. No new API key, endpoint, or historical price store is needed for this view.

This PR adds the calculation and [three static display options](https://artifact-publisher-942befb9-pages.vercel.app/p/16516867-e4a2-44d1-8761-d40699f6839a), also [stored in this repository](efficiency-trends-options.html). It does not change the application interface. Choose a layout before wiring up the charts.

## What the charts measure

For each Intelligence Index threshold, 10, 20, 30, 40, 50, and 60, consider configurations whose unrounded score meets or exceeds that threshold. Order them by release date and keep each new record.

| Chart | Value | Record |
| --- | --- | --- |
| Cost per Intelligence Index task over time | Weighted USD per benchmark task | Strictly lower cost |
| Output speed over time | Median output tokens per second | Strictly higher speed |

The x axis is model release date. Each line starts at its first qualifying measurement and changes at a new record. Use steps, a logarithmic cost axis, and a linear speed axis. Do not draw a zero-valued line for a threshold with no measurements.

These charts use one current snapshot ordered by model release date. They are not a record of the API prices or speeds observed on each historical date. Refreshes can therefore revise earlier points. Cost describes the benchmark workload, and speed excludes time to first token. See [AA's methodology](https://artificialanalysis.ai/methodology).

## Verified source access

On 27 October 2026, I retrieved the unauthenticated Trends page and its published chart payload, then compared it with the result of the existing `fetchSnapshot()` importer. Both contained the same 715 configuration slugs. All four fields below matched across every configuration after normalizing absent values to null.

| Trends payload | Models payload | Existing Atlas field |
| --- | --- | --- |
| `releaseDate` | `releaseDate` | `released` |
| `intelligenceIndex` | `intelligenceIndex` | `intelligence` |
| `intelligenceIndexCostPerTask` | `intelligenceIndexCostPerTask.cost.total` | `cost` |
| `medianOutputSpeed` | `timescaleData.medianOutputSpeed` | `speed` |

AA's public Trends client groups models by the six inclusive thresholds, then retains running minima for cost and running maxima for speed. It uses release dates and current per-model values rather than a historical measurements endpoint. This implementation was verified against the public chart code served by the Trends page on that date. Asset names and payload paths change, so they should not be hardcoded as a new integration.

The existing importer validates the full model catalogue and missing measurements. Reuse that snapshot and its refresh command. The committed application snapshot stays unchanged in this PR. The mock figures use the fresh 27 October snapshot and AA's currently published Intelligence Index v4.3.2, so they can differ from the application's older snapshot.

The authenticated [Data API](https://artificialanalysis.ai/data-api/docs) is a separate integration. It requires a key and has tier-specific fields and usage rights. Its performance history endpoints should not be confused with these release-date record charts.

## Calculation and integration

`src/efficiency-data.ts` exports the six thresholds and `efficiencySeries(rows, metric)`. Each point retains the original model object, its release date, and its unrounded value. The caller supplies one validated snapshot and chooses any model filters explicitly.

- Compute the default view across the complete benchmark snapshot. The benchmark picker's default frontier selection would hide older record setters and change the meaning of the chart.
- Keep reasoning configurations distinct. Show the winning model and effort in the point details.
- Skip missing dates, missing scores, and missing or non-positive measurements, matching AA's positive-value filtering. Zero cost is a real value elsewhere in Atlas, but AA's logarithmic efficiency plot excludes it.
- Keep one best configuration per release day. Equal measurements on that date use the stable configuration ID as a tie breaker, so row order cannot change the details. Do not add several zero-width steps on the same date.
- Leave empty thresholds empty. Do not copy an intelligence score or release date onto provider-only endpoints to make them qualify.
- Keep any step extension to the chart's right edge in rendering. The calculation returns actual record points only.

Before enabling the UI, retain the Intelligence Index version and snapshot date alongside the chart. Use one snapshot throughout each calculation, since scores from different index versions are not comparable. Do not infer a version for older snapshots that lack that metadata.

## Display choice

The [static options](efficiency-trends-options.html) use the same verified values in each layout.

- A adds a dedicated Efficiency page, with a large chart, cost/speed views, and threshold filters in place of the model picker. Recommended because the controls match the all-model calculation.
- B puts cost and speed together with a shared threshold selector. It trades chart space for direct comparison.
- C gives every threshold its own plot, with common axes and a cost/speed view switch. It avoids overlapping series but needs more space.

The user requires a layout selection before application UI changes. These mocks are a review artifact, not a production page.

## Attribution and use

[AA's citation guidelines](https://artificialanalysis.ai/brand-kit) permit rebuilding figures with unchanged values, appropriate axis names, and Artificial Analysis credited inside the chart. They ask for a specific source link, index version, snapshot date, and relevant configuration. They distinguish citing charts from bulk or systematic dataset redistribution, which they direct users to discuss with AA. This PR adds calculations over fields already imported by Atlas and does not add a redistributed dataset or an authenticated API integration.

## Validation

Type checking and the test suite pass. Focused tests cover release ordering, running minima and maxima, inclusive unrounded thresholds, missing measurements, same-day ties, retained configuration metadata, and empty thresholds. The static options were inspected in both light and dark themes.
