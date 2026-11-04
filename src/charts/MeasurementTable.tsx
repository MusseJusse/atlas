import type { Metric, ScoreMetric } from '../chart-definitions';
import { metrics, scoreLabels } from '../chart-definitions';
import { formatModelValue } from '../formatModel';
import { barGroups } from '../models';
import type { Settings } from '../state';
import type { MeasuredRow } from './geometry';

/** Exact values for every displayed configuration, including estimate provenance. */
export function MeasurementTable({ rows, metric, score, settings, descending }: {
  rows: MeasuredRow[]; metric: Metric; score?: ScoreMetric; settings: Settings; descending: boolean;
}) {
  const ordered = barGroups(rows, metric, settings.grouped, descending, descending ? 'maximum' : 'minimum')
    .flatMap((group) => group.rows.toSorted((a, b) => (a.value - b.value) * (descending ? -1 : 1)));
  return <div className="measurement-table" role="region" aria-label={`${metrics[metric].label} data`} tabIndex={0}>
    <table>
      <caption className="sr-only">{metrics[metric].label} for every displayed configuration</caption>
      <thead><tr><th scope="col">Model</th><th scope="col">Reasoning</th><th scope="col">{metrics[metric].label}</th>{score && <th scope="col">{scoreLabels[score]}</th>}</tr></thead>
      <tbody>{ordered.map((row) => <tr key={row.id}>
        <th scope="row">{row.name}{metric === 'time' && row.timeEstimate && <span className="block text-[11px] text-fg-2">Estimated speed endpoint</span>}{row.taskPricing?.basis === 'api-fallback' && <span className="text-fg-2"> · API fallback</span>}</th>
        <td>{row.effortLabel}</td><td>{formatModelValue(row, metric)}</td>{score && <td>{row[score]?.toFixed(1) ?? 'Unavailable'}</td>}
      </tr>)}</tbody>
    </table>
  </div>;
}
