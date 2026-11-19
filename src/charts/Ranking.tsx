import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { Logo } from '../Logo';
import { barGroups } from '../models';
import { modelColor, shortName } from '../model-presentation';
import { format, formatModelValue } from '../formatModel';
import { metrics, type Metric } from '../chart-definitions';
import { barDomain, linearScale, logScale } from '../scales';
import { ConfigurationDetails } from './ConfigurationDetails';
import { spacedAxisTicks, type MeasuredRow } from './geometry';
import { overlappingConfigurations, durationTicks } from './ranking-geometry';
import type { Interactions } from './interactions';

/** One shared scale, one row per model, and every measured reasoning configuration. */
export function Ranking({ rows, metric, grouped, descending, interactions, logarithmic }: {
  rows: MeasuredRow[]; metric: Metric; grouped: boolean; descending: boolean; interactions: Interactions; logarithmic: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [plotWidth, setPlotWidth] = useState(300);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const width = element.querySelector('.ranking-plot')?.getBoundingClientRect().width;
      if (width && width > 0) setPlotWidth(width);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const { groups, position, ticks } = useMemo(() => {
    const groups = barGroups(rows, metric, grouped, descending, descending ? 'maximum' : 'minimum');
    const values = rows.map((row) => row.value);
    const domain = logarithmic ? [Math.min(...values) / 1.3, Math.max(...values) * 1.1] as const : barDomain(values, 0.05);
    const scale = logarithmic ? logScale(domain, [0, 100]) : linearScale(domain, [0, 100], { nice: true });
    const candidates = metric === 'time' ? durationTicks(domain[1]) : logarithmic
      ? scale.ticks(4).filter((value) => Math.abs(Math.log10(value) - Math.round(Math.log10(value))) < 0.001)
      : scale.ticks(4);
    const ticks = spacedAxisTicks(candidates.length > 1 ? candidates : scale.ticks(4), (value) => scale(value) * plotWidth / 100, metric).map((tick) => tick.value);
    return { groups, position: scale, ticks };
  }, [rows, metric, grouped, descending, logarithmic, plotWidth]);
  return <div ref={root} className="ranking" role="group" aria-label={`${metrics[metric].label} by model`}>
    <div className="ranking-key">
      <span><svg aria-hidden="true" width="32" height="16" viewBox="0 0 32 16"><path d="M0 4h26v8H0z" fill="currentColor" opacity=".16" /><circle cx="26" cy="8" r="4" fill="currentColor" /></svg>{descending ? 'Highest' : 'Lowest'} value</span>
      <span><svg aria-hidden="true" width="32" height="16" viewBox="0 0 32 16"><path d="M5 8h22" stroke="currentColor" strokeWidth="2" /><circle cx="5" cy="8" r="3" fill="var(--panel)" stroke="currentColor" strokeWidth="2" /><circle cx="27" cy="8" r="3" fill="var(--panel)" stroke="currentColor" strokeWidth="2" /></svg>Reasoning range</span>
    </div>
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
        const zero = logarithmic ? 0 : position(0);
        const endpoint = position(best.value);
        const overlapCount = overlappingConfigurations(group.rows.map((row) => ({ id: row.id, x: position(row.value) * plotWidth / 100 })));
        const selected = interactions.pinned && group.rows.some((row) => row.id === interactions.pinned?.id);
        return <div className="ranking-model" key={group.id} style={{ '--model-color': modelColor(best) } as CSSProperties}>
          <button className="ranking-row ranking-grid" aria-label={`${best.name}, rank ${index + 1}, ${metrics[metric].label}. ${descending ? 'Highest' : 'Lowest'} ${metric === 'time' && best.timeEstimate ? 'estimated ' : ''}${formatModelValue(best, metric)}. ${group.rows.length} ${group.rows.length === 1 ? 'configuration' : 'configurations'}, range ${format(group.minimum, metric)} to ${format(group.maximum, metric)}. ${overlapCount > 1 ? `${overlapCount} configurations overlap visually. ` : ''}${open ? 'Hide' : 'Show'} configurations.`} data-highlighted={interactions.highlighted === best.family || undefined} onPointerEnter={() => interactions.highlight(best.family)} onPointerLeave={() => interactions.highlight(null)} onFocus={() => interactions.highlight(best.family)} onBlur={() => interactions.highlight(null)} data-best-value={best.value} aria-expanded={open} aria-controls={`ranking-${metric}-${group.id}`}
            onClick={(event) => {
              setExpanded(open ? null : group.id);
              if (!open) {
                const row = event.currentTarget;
                requestAnimationFrame(() => row.nextElementSibling?.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
              }
            }}>
            <span className="ranking-name"><span className="ranking-number">{index + 1}</span><Logo model={best} size={19} /><span>{shortName(best)}{metric === 'time' && best.timeEstimate ? <small>Estimated time</small> : grouped ? <small>{group.rows.length} {group.rows.length === 1 ? 'configuration' : 'configurations'}</small> : <small>{lineStart(best.effortLabel)}</small>}{metric === 'cost' && best.taskPricing?.basis === 'api-fallback' && <small>API fallback</small>}</span></span>
            <span className="ranking-plot" aria-hidden="true">
              {ticks.map((tick) => <span className={`ranking-gridline${tick === 0 ? ' ranking-zero' : ''}`} key={tick} style={{ left: `${position(tick)}%` }} />)}
              <span className={`ranking-bar${best.value < 0 ? ' ranking-negative' : ''}`} style={{ left: `${Math.min(zero, endpoint)}%`, width: `${Math.abs(endpoint - zero)}%` }} />
              <span className="ranking-range" style={{ left: `${position(group.minimum)}%`, width: `${position(group.maximum) - position(group.minimum)}%` }} />
              {[...group.rows.filter((row) => row.id !== best.id), best].map((row) => <span className={`ranking-dot${row.id === best.id ? ' ranking-best' : ''}`} data-configuration={row.id} key={row.id} style={{ left: `${position(row.value)}%` }} />)}
            </span>
            <span className="ranking-value"><span><b>{formatModelValue(best, metric)}</b>{overlapCount > 1 && <small title="Show configurations to compare exact values.">{overlapCount} levels overlap</small>}</span><ChevronDown data-expand-indicator size={14} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }} /></span>
          </button>
          {open && <div id={`ranking-${metric}-${group.id}`} className="ranking-expanded">
            <div className="ranking-configurations" role="group" aria-label={`${best.name} reasoning configurations`}>
              {configurations.map((row) => <button key={row.id} aria-pressed={interactions.pinned?.id === row.id} onClick={(event) => {
                  interactions.togglePin(row);
                  const panel = event.currentTarget.closest('.ranking-expanded');
                  requestAnimationFrame(() => panel?.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
                }}>
                <span>{row.codingAgent?.configuration ?? lineStart(row.effortLabel)}</span><b>{formatModelValue(row, metric)}</b>
              </button>)}
            </div>
            {selected && interactions.activeModel && <aside aria-label="Selected configuration" className="ranking-inspector"><ConfigurationDetails model={interactions.activeModel} metric={metric} pinned onClose={() => {
                root.current?.querySelector<HTMLButtonElement>('.ranking-configurations button[aria-pressed="true"]')?.focus();
                if (interactions.activeModel) interactions.togglePin(interactions.activeModel);
              }} /></aside>}
          </div>}
        </div>;
      })}
    </div>
  </div>;
}

/** Effort labels are lowercase mid-sentence; at the start of their own line they take a capital, like "Default". */
function lineStart(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}
