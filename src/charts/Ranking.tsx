import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { Logo } from '../Logo';
import { barGroups } from '../models';
import { modelColor, shortName } from '../model-presentation';
import { format, formatModelValue } from '../formatModel';
import { metrics, type Metric, type ScoreMetric } from '../chart-definitions';
import { barDomain, linearScale } from '../scales';
import { ConfigurationDetails } from './ConfigurationDetails';
import type { MeasuredRow } from './geometry';
import type { Interactions } from './interactions';

/** One shared scale, one row per model, and every measured reasoning configuration. */
export function Ranking({ rows, metric, grouped, descending, interactions, score }: {
  rows: MeasuredRow[]; metric: Metric; grouped: boolean; descending: boolean; interactions: Interactions; score?: ScoreMetric;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { groups, position, ticks } = useMemo(() => {
    const groups = barGroups(rows, metric, grouped, descending, descending ? 'maximum' : 'minimum');
    const scale = linearScale(barDomain(rows.map((row) => row.value), 0.05), [0, 100], { nice: true });
    return { groups, position: scale, ticks: scale.ticks(4) };
  }, [rows, metric, grouped, descending]);
  return <div ref={root} className="ranking" role="group" aria-label={`${metrics[metric].label} by model`}>
    <div className="ranking-key"><span>Each dot is a reasoning configuration</span><span>{metrics[metric].higherIsBetter ? 'Higher' : 'Lower'} is better</span></div>
    <div className="ranking-axis ranking-grid" aria-hidden="true">
      <span>Model</span>
      <span className="ranking-ticks">{ticks.map((tick) => <span key={tick} style={{ left: `${position(tick)}%` }}>{format(tick, metric, true)}</span>)}</span>
      <span className="text-right">{descending ? 'Highest' : 'Lowest'}</span>
    </div>
    <div className="ranking-rows">
      {groups.map((group, index) => {
        const configurations = group.rows.toSorted((a, b) => (a.value - b.value) * (descending ? -1 : 1));
        const best = configurations[0]!;
        const open = expanded === group.id;
        const zero = position(0);
        const endpoint = position(best.value);
        const selected = interactions.pinned && group.rows.some((row) => row.id === interactions.pinned?.id);
        return <div className="ranking-model" key={group.id} style={{ '--model-color': modelColor(best) } as CSSProperties}>
          <button className="ranking-row ranking-grid" data-highlighted={interactions.highlighted === best.family || undefined} onPointerEnter={() => interactions.highlight(best.family)} onPointerLeave={() => interactions.highlight(null)} onFocus={() => interactions.highlight(best.family)} onBlur={() => interactions.highlight(null)} data-best-value={best.value} aria-expanded={open} aria-controls={`ranking-${metric}-${group.id}`}
            onClick={() => setExpanded(open ? null : group.id)}>
            <span className="ranking-name"><span className="ranking-number">{index + 1}</span><Logo model={best} size={19} /><span>{shortName(best)}{!grouped && <small>{best.effortLabel}</small>}{metric === 'cost' && best.taskPricing?.basis === 'api-fallback' && <small>API fallback</small>}</span></span>
            <span className="ranking-plot" aria-hidden="true">
              {ticks.map((tick) => <span className={`ranking-gridline${tick === 0 ? ' ranking-zero' : ''}`} key={tick} style={{ left: `${position(tick)}%` }} />)}
              <span className="ranking-bar" style={{ left: `${Math.min(zero, endpoint)}%`, width: `${Math.abs(endpoint - zero)}%` }} />
              <span className="ranking-range" style={{ left: `${position(group.minimum)}%`, width: `${position(group.maximum) - position(group.minimum)}%` }} />
              {group.rows.map((row) => <span className={`ranking-dot${row.id === best.id ? ' ranking-best' : ''}`} data-configuration={row.id} key={row.id} style={{ left: `${position(row.value)}%` }} />)}
            </span>
            <span className="ranking-value"><b>{formatModelValue(best, metric)}</b><ChevronDown data-expand-indicator size={14} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }} /></span>
          </button>
          {open && <div id={`ranking-${metric}-${group.id}`} className="ranking-expanded">
            <div className="ranking-configurations" aria-label={`${best.name} reasoning configurations`}>
              {configurations.map((row) => <button key={row.id} aria-pressed={interactions.pinned?.id === row.id} onClick={() => interactions.togglePin(row)}>
                <span>{row.codingAgent?.configuration ?? row.effortLabel}</span><b>{formatModelValue(row, metric)}</b>
              </button>)}
            </div>
            {selected && interactions.activeModel && <aside aria-label="Selected configuration" className="ranking-inspector"><ConfigurationDetails model={interactions.activeModel} metric={metric} score={score} pinned onClose={() => {
                root.current?.querySelector<HTMLButtonElement>('.ranking-configurations button[aria-pressed="true"]')?.focus();
                if (interactions.activeModel) interactions.togglePin(interactions.activeModel);
              }} /></aside>}
          </div>}
        </div>;
      })}
    </div>
  </div>;
}
