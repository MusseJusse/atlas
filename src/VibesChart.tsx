import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { axisDefinitions, type ResolvedVibeModel, type VibeLabelPlacement } from './data/vibes';
import { format } from './formatModel';
import { modelColor, shortName } from './model-presentation';
import { nearestPoint, pinHandlers } from './charts/interactions';

const DEFAULT_YAW = -0.44;
const DEFAULT_PITCH = 0.34;
const MIN_YAW = -0.95;
const MAX_YAW = 0.65;
const MIN_PITCH = 0.08;
const MAX_PITCH = 0.82;
const DRAG_THRESHOLD_PX = 4;
const COST_MIN = 0.2;
const BASE_COST_TICKS = [0.25, 1, 3, 10, 30] as const;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Log-normalize API task cost into [0, 1] where 0 is cheapest ($0.20) and 1 is costMax. */
export function normalizeCost(cost: number | null, costMax = 10) {
  if (cost === null || cost <= 0) return 0;
  const minLog = Math.log10(COST_MIN);
  const maxLog = Math.log10(Math.max(10, costMax));
  return clamp((Math.log10(cost) - minLog) / (maxLog - minLog), 0, 1);
}

/** Theme-safe green -> amber -> coral ramp for cost highlights in light and dark mode. */
function costColor(norm: number) {
  if (norm < 0.38) return 'light-dark(#17734c, #56ca80)';
  if (norm < 0.72) return 'light-dark(#8f6100, #eab308)';
  return 'light-dark(#b4372f, #f87171)';
}

/** A panel-colored outline under label text, so drop stems and gridlines never cut through letters. */
const halo = { stroke: 'var(--panel)', strokeWidth: 4, strokeLinejoin: 'round', paintOrder: 'stroke' } as const;

/** As a last resort before dropping a benchmark line, a label may run this far into the card's 16px padding. */
const PADDING_OVERHANG = 12;

/** Rough DM Sans advance width, for keeping right-running labels inside the card. */
function textWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.55;
}

function labelOffset(placement: VibeLabelPlacement, compact: boolean) {
  switch (placement) {
    case 'left':
      return { dx: -11, dy: 4, anchor: 'end' as const };
    case 'above':
      return { dx: 0, dy: -13, anchor: 'middle' as const };
    case 'below':
      return { dx: 0, dy: compact ? 18 : 20, anchor: 'middle' as const };
    case 'below-right':
      return { dx: -4, dy: compact ? 18 : 20, anchor: 'start' as const };
    case 'right':
    default:
      return { dx: 11, dy: 4, anchor: 'start' as const };
  }
}

type Box = { left: number; right: number; top: number; bottom: number };
type LabelItem = {
  family: string;
  x: number;
  y: number;
  preferred: VibeLabelPlacement;
  label: string;
  labelSize: number;
  subtext: string | null;
  sublabelSize: number;
};

const placements: readonly VibeLabelPlacement[] = ['right', 'left', 'above', 'below', 'below-right'];
// Estimated boxes are approximate, so touching by 2px or less still counts as clear.
const overlapArea = (a: Box, b: Box) => {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return x > 2 && y > 2 ? x * y : 0;
};

/** Where a model's name and benchmark line go for one placement, with their estimated boxes. */
function labelLayout(item: LabelItem, placement: VibeLabelPlacement, compact: boolean, width: number, overhang: number, far = false) {
  const offset = labelOffset(placement, compact);
  const { anchor } = offset;
  // A far spot sits one line farther from the dot, for crowded clusters with no clear near spot.
  const dx = far && anchor !== 'middle' && placement !== 'below-right' ? offset.dx + Math.sign(offset.dx) * 14 : offset.dx;
  const dy = far && (placement === 'above' || placement === 'below' || placement === 'below-right') ? offset.dy + Math.sign(offset.dy) * 14 : offset.dy;
  // Right-running text near the right edge slides left until it fits the card.
  const textX = (text: string, fontSize: number) =>
    anchor === 'start' ? Math.min(item.x + dx, width + overhang - textWidth(text, fontSize)) : item.x + dx;
  const gap = compact ? 13 : 14;
  const labelY = item.y + dy - (placement === 'above' && item.subtext ? gap : 0);
  const sublabelY = item.y + dy + (placement === 'above' ? 0 : gap);
  const box = (text: string, x: number, y: number, fontSize: number): Box => {
    const w = textWidth(text, fontSize);
    const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
    return { left, right: left + w, top: y - fontSize * 1.0, bottom: y + fontSize * 0.35 };
  };
  const labelX = textX(item.label, item.labelSize);
  const sublabelX = item.subtext ? textX(item.subtext, item.sublabelSize) : labelX;
  const boxes = [box(item.label, labelX, labelY, item.labelSize)];
  if (item.subtext) boxes.push(box(item.subtext, sublabelX, sublabelY, item.sublabelSize));
  return { anchor, labelX, labelY, sublabelX, sublabelY, subtext: item.subtext, boxes };
}

/**
 * Places every model's name first, then adds benchmark lines where they fit, so a line never pushes a name aside.
 * Each name keeps its preferred spot unless that would cover another name, an axis title, a dot (its own included),
 * or leave the plot; then it takes the first clear spot, using the card's padding only as a last resort.
 * With no clear spot at all, the name takes the spot it covers least. A benchmark line that fits nowhere drops.
 */
function resolveLabels(items: readonly LabelItem[], compact: boolean, width: number, obstacles: readonly Box[]) {
  type Layout = ReturnType<typeof labelLayout>;
  const dots = items.map((item) => ({ left: item.x - 6, right: item.x + 6, top: item.y - 6, bottom: item.y + 6 }));
  const placed: Box[] = [...obstacles];
  const covered = (layout: Layout, others: readonly Box[]) => layout.boxes.reduce((total, box) =>
    total + [...others, ...dots].reduce((sum, other) => sum + overlapArea(box, other), 0), 0);
  const inside = (layout: Layout, overhang: number) => layout.boxes.every((box) => box.left >= -overhang && box.right <= width + overhang);
  // Candidate spots, preferred first, inside the plot before the card padding.
  // Candidate spots, preferred first: near the dot inside the plot, then in the card padding, then one line farther out.
  const candidates = (item: LabelItem, first: VibeLabelPlacement) => ([[0, false], [PADDING_OVERHANG, false], [0, true], [PADDING_OVERHANG, true]] as const)
    .flatMap(([overhang, far]) => [first, ...placements.filter((placement) => placement !== first)]
      .map((placement) => ({ placement, overhang, far, layout: labelLayout(item, placement, compact, width, overhang, far) })));

  const names = new Map(items.map((item) => {
    const bare = { ...item, subtext: null };
    const options = candidates(bare, item.preferred);
    const chosen = options.find(({ layout, overhang }) => inside(layout, overhang) && covered(layout, placed) === 0)
      ?? options.filter(({ layout }) => inside(layout, PADDING_OVERHANG))
        .reduce((best, option) => (covered(option.layout, placed) < covered(best.layout, placed) ? option : best));
    placed.push(...chosen.layout.boxes);
    return [item.family, chosen] as const;
  }));

  return new Map(items.map((item) => {
    const name = names.get(item.family)!;
    if (!item.subtext) return [item.family, name.layout] as const;
    const others = placed.filter((box) => !name.layout.boxes.includes(box));
    const full = candidates(item, name.placement).find(({ layout, overhang }) => inside(layout, overhang) && covered(layout, others) === 0);
    // A line that only fits by moving its name farther out stays hidden; the name keeps its closer spot.
    if (full?.far && !name.far) return [item.family, name.layout] as const;
    if (!full) return [item.family, name.layout] as const;
    placed.splice(0, placed.length, ...others, ...full.layout.boxes);
    return [item.family, full.layout] as const;
  }));
}

export function VibesChart({
  models,
  activeFamily,
  pinnedFamily,
  showBenchmarks,
  showCost,
  onPreview,
  onTogglePin,
  onClear,
}: {
  models: readonly ResolvedVibeModel[];
  activeFamily: string | null;
  pinnedFamily: string | null;
  showBenchmarks: boolean;
  showCost: boolean;
  onPreview: (family: string | null) => void;
  onTogglePin: (family: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateLeftRef = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ width: 720, height: 460 });
  const [animT, setAnimT] = useState(showCost ? 1 : 0);
  const [yaw, setYaw] = useState(DEFAULT_YAW);
  const [pitch, setPitch] = useState(DEFAULT_PITCH);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
  });
  const animTRef = useRef(showCost ? 1 : 0);
  const id = useId();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => {
      if (element.clientWidth > 0 && element.clientHeight > 0) {
        setSize({ width: element.clientWidth, height: element.clientHeight });
      }
    };
    resize();
    document.fonts?.addEventListener('loadingdone', resize);
    if (typeof ResizeObserver === 'undefined') {
      return () => document.fonts?.removeEventListener('loadingdone', resize);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', resize);
    };
  }, []);

  useEffect(() => {
    // Reset stale drag state whenever cost mode changes.
    dragState.current = { pointerId: null, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false };
    setDragging(false);

    const target = showCost ? 1 : 0;
    if (animTRef.current === target) return;

    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof requestAnimationFrame === 'undefined') {
      animTRef.current = target;
      setAnimT(target);
      return;
    }

    let frame = 0;
    let lastTime: number | null = null;
    const step = (now: number) => {
      const dt = lastTime === null ? 16 : Math.min(64, Math.max(0, now - lastTime));
      lastTime = now;
      const current = animTRef.current;
      const diff = target - current;
      if (Math.abs(diff) < 0.004) {
        animTRef.current = target;
        setAnimT(target);
        return;
      }
      // Refresh-rate-independent damping (~260ms settle on both 60Hz and 120Hz displays).
      const factor = 1 - Math.exp(-dt / 65);
      const next = current + diff * factor;
      animTRef.current = next;
      setAnimT(next);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [showCost]);

  const compact = size.width < 520;
  const pad = {
    left: compact ? 22 : 44,
    right: compact ? 22 : 42,
    top: compact ? 48 : 54,
    bottom: compact ? 46 : 52,
  };
  const plotWidth = Math.max(120, size.width - pad.left - pad.right);
  const plotHeight = Math.max(120, size.height - pad.top - pad.bottom);

  const highestCost = Math.max(10, ...models.map((entry) => entry.model.cost ?? 0));
  const costMax = highestCost <= 10 ? 10 : Math.ceil(highestCost / 5) * 5;
  const costTicks = BASE_COST_TICKS.filter((tick) => tick <= costMax);

  // Seamless 2D -> auto-fitted 3D tabletop projection so all 3 axis labels stay inside the SVG at every aspect ratio.
  const t = animT;
  const boxX = 1.35;
  const boxY = 1.0;
  const boxZ = 0.85;
  const cameraDistance = 4.2;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  function raw3D(coherency: number, capability: number, cost01: number) {
    const nx = (coherency / 100 - 0.5) * boxX;
    const ny = (capability / 100 - 0.5) * boxY;
    // Cheap models sit in front (+Z), pricier models recede deeper (-Z).
    const nz = (0.5 - cost01) * boxZ;

    const rx = nx * cosY + nz * sinY;
    const rz1 = -nx * sinY + nz * cosY;
    const ry = ny * cosP - rz1 * sinP;
    const rz = ny * sinP + rz1 * cosP;

    const perspective = cameraDistance / (cameraDistance - rz * 0.45);
    return {
      x: rx * perspective,
      y: -ry * perspective,
      depth: rz,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const coh of [0, 100]) {
    for (const cap of [0, 100]) {
      for (const cost01 of [0, 1]) {
        const corner = raw3D(coh, cap, cost01);
        if (corner.x < minX) minX = corner.x;
        if (corner.x > maxX) maxX = corner.x;
        if (corner.y < minY) minY = corner.y;
        if (corner.y > maxY) maxY = corner.y;
      }
    }
  }

  const safeLeft = compact ? 32 : 112;
  const safeRight = compact ? 44 : 72;
  // Phones keep the 3D box below the angle controls, so the Capability title never slides under them.
  const safeTop = compact ? (showCost ? 76 : 44) : 52;
  const safeBottom = compact ? 44 : 50;
  const safeW = Math.max(80, size.width - safeLeft - safeRight);
  const safeH = Math.max(80, size.height - safeTop - safeBottom);
  const fit = Math.min(safeW / Math.max(0.001, maxX - minX), safeH / Math.max(0.001, maxY - minY));
  const offsetX = safeLeft + (safeW - (maxX - minX) * fit) / 2 - minX * fit;
  const offsetY = safeTop + (safeH - (maxY - minY) * fit) / 2 - minY * fit;

  function proj(coherency: number, capability: number, cost01: number) {
    const flatX = pad.left + (coherency / 100) * plotWidth;
    const flatY = pad.top + ((100 - capability) / 100) * plotHeight;
    if (t === 0) return { x: flatX, y: flatY, depth: 0 };

    const projected = raw3D(coherency, capability, cost01);
    const x3 = offsetX + projected.x * fit;
    const y3 = offsetY + projected.y * fit;
    return {
      x: lerp(flatX, x3, t),
      y: lerp(flatY, y3, t),
      depth: projected.depth * t,
    };
  }

  const projectedModels = models
    .map((entry) => {
      const cost01 = normalizeCost(entry.model.cost, costMax);
      return {
        entry,
        cost01,
        point: proj(entry.coherency, entry.capability, cost01),
        floor: proj(entry.coherency, 0, cost01),
      };
    })
    .toSorted((a, b) => a.point.depth - b.point.depth);

  const active = activeFamily
    ? projectedModels.find((item) => item.entry.family === activeFamily) ?? null
    : null;
  const targets = projectedModels.map((item) => ({
    key: item.entry.family,
    x: item.point.x,
    y: item.point.y,
  }));

  // Label text and spots for every model, resolved together so they never overlap.
  const labelItems = models.map((entry): LabelItem => {
    const point = projectedModels.find((item) => item.entry.family === entry.family)!.point;
    const isActive = activeFamily === entry.family;
    const benchmarkSubtext = [
      entry.model.intelligence !== null ? `Intel ${format(entry.model.intelligence, 'intelligence')}` : null,
      entry.model.cost !== null ? format(entry.model.cost, 'cost', true) : null,
    ]
      .filter(Boolean)
      .join(', ');
    const costTag = entry.model.cost !== null ? format(entry.model.cost, 'cost', true) : null;
    // Every model offers its benchmark line; the resolver drops any that has no clear spot.
    return {
      family: entry.family,
      x: point.x,
      y: point.y,
      preferred: t > 0.45
        ? (compact && entry.compactLabelPlacement3D) || entry.labelPlacement3D
        : (compact && entry.compactLabelPlacement) || entry.labelPlacement,
      label: shortName(entry.model),
      labelSize: compact ? 11.5 : isActive ? 13.5 : 12.5,
      subtext: showBenchmarks ? benchmarkSubtext : t > 0.35 && costTag ? costTag : null,
      sublabelSize: compact ? 10 : 10.5,
    };
  });

  function resolvePointerFamily(svg: SVGSVGElement, target: EventTarget | null, clientX: number, clientY: number) {
    if (target instanceof Element) {
      const label = target.closest<SVGTextElement>('text[data-vibe-label], text[data-vibe-sublabel]');
      const family = label?.dataset.vibeLabel ?? label?.dataset.vibeSublabel;
      if (family) return family;
    }
    const bounds = svg.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    return (
      nearestPoint(
        targets,
        ((clientX - bounds.left) * size.width) / bounds.width,
        ((clientY - bounds.top) * size.height) / bounds.height,
        24,
      )?.key ?? null
    );
  }

  const originFront = proj(0, 0, 0);
  const originBack = proj(0, 0, 1);
  const cap100 = proj(0, 100, 1);
  const capTop = { x: cap100.x, y: cap100.y - 8 };
  const coh100 = proj(100, 0, 0);
  const cohDx = coh100.x - originFront.x;
  const cohDy = coh100.y - originFront.y;
  const cohLen = Math.hypot(cohDx, cohDy) || 1;
  const cohEnd = {
    x: coh100.x + (cohDx / cohLen) * 8,
    y: coh100.y + (cohDy / cohLen) * 8,
  };
  const floor00 = proj(0, 0, 0);
  const floor10 = proj(100, 0, 0);
  const floor11 = proj(100, 0, 1);
  const floor01 = proj(0, 0, 1);

  const flatSweetX = pad.left + 0.54 * plotWidth;
  const flatSweetY = pad.top;
  const flatSweetW = 0.46 * plotWidth;
  const flatSweetH = 0.42 * plotHeight;

  const isCustomAngle = Math.abs(yaw - DEFAULT_YAW) > 0.01 || Math.abs(pitch - DEFAULT_PITCH) > 0.01;
  const midCost = proj(0, 0, 0.52);
  const capLabelY = Math.max(22, capTop.y - 12);
  const capLabel = t > 0.3 ? 'Capability ↑' : 'Capability';
  const capSize = compact ? 12 : 13;
  const costArrow = yaw > 0.08 ? '↖' : '↗';
  // Axis titles, positioned here so model labels can steer clear of them.
  const titleBox = (text: string, x: number, y: number, fontSize: number, anchor: 'start' | 'end') => {
    const width = textWidth(text, fontSize);
    const left = anchor === 'start' ? x : x - width;
    return { left, right: left + width, top: y - fontSize, bottom: y + fontSize * 0.35 };
  };
  const capBox = titleBox(capLabel, capTop.x, capLabelY, capSize, 'start');
  const cohLabel = t > 0.3 ? 'Coherency →' : 'Coherency';
  const cohLabelY = cohEnd.y + (t > 0.3 ? 18 : 26);
  const costLabel = `Cost / task ${costArrow}`;
  const costSize = compact ? 11 : 12;
  // Sit clear of the cost axis on desktop and below the floor's front edge on phones.
  const costLabelX = compact ? Math.max(8, originFront.x - 4) : Math.max(96, midCost.x - 30);
  const cohBox = titleBox(cohLabel, cohEnd.x, cohLabelY, capSize, 'end');
  const costAt = (y: number) => titleBox(costLabel, costLabelX, y, costSize, compact ? 'start' : 'end');
  const costBaseY = compact ? Math.min(size.height - 10, originFront.y + 30) : midCost.y + 14;
  // Steep angles can bring the two floor titles together; Cost / task then steps below Coherency.
  const costLabelY = overlapArea(costAt(costBaseY), cohBox) > 0 ? Math.min(size.height - 4, cohBox.bottom + costSize + 2) : costBaseY;
  const axisTitles = [capBox, cohBox, ...(t > 0.04 ? [costAt(costLabelY)] : [])];
  // In 2D the sweet spot's left and top edges are thin obstacles, so a label sits fully inside the tint or fully outside it.
  // Phones skip them: their top cluster has no room, and a name crossing a faint edge beats two names touching.
  const sweetEdges = t < 0.5 && !compact ? [
    { left: flatSweetX - 2, right: flatSweetX + 2, top: flatSweetY, bottom: flatSweetY + flatSweetH },
    { left: flatSweetX, right: flatSweetX + flatSweetW, top: flatSweetY - 2, bottom: flatSweetY + 2 },
  ] : [];
  // The "Sweet spot" caption in the box's corner is an obstacle too, whenever it shows.
  const sweetCaption = !compact && t < 0.9 ? [titleBox('Sweet spot', pad.left + plotWidth - 10, pad.top + 18, 11, 'end')] : [];
  // The Capability axis line is a thin obstacle too, so no name straddles it.
  const capAxis = { left: Math.min(originBack.x, capTop.x) - 2, right: Math.max(originBack.x, capTop.x) + 2, top: capTop.y, bottom: originBack.y };
  const labelLayouts = resolveLabels(labelItems, compact, size.width, [...axisTitles, capAxis, ...sweetEdges, ...sweetCaption]);

  // Thin cost tick labels whose text would touch the last shown one (e.g. shallow phone pitch).
  const visibleCostTicks: { tick: number; left: { x: number; y: number }; right: { x: number; y: number }; showLabel: boolean }[] = [];
  let lastTickBox: Box | null = null;
  for (const tick of costTicks) {
    const cn = normalizeCost(tick, costMax);
    const left = proj(0, 0, cn);
    const right = proj(100, 0, cn);
    // A tick label under a model name hides; the names matter more than the scale.
    const text = `$${tick >= 1 ? tick : tick.toFixed(2)}`;
    const tickBox = { left: right.x + 8, right: right.x + 8 + textWidth(text, compact ? 10 : 11), top: right.y - 6, bottom: right.y + 6 };
    const spaced = lastTickBox === null || !(tickBox.left < lastTickBox.right + 2 && tickBox.right > lastTickBox.left - 2 && tickBox.top < lastTickBox.bottom + 1 && tickBox.bottom > lastTickBox.top - 1);
    const showLabel = spaced && ![...labelLayouts.values()].some((layout) => layout.boxes.some((box) => overlapArea(box, tickBox) > 0));
    if (showLabel) lastTickBox = tickBox;
    visibleCostTicks.push({ tick, left, right, showLabel });
  }

  return (
    <div
      ref={ref}
      className="relative min-h-0 min-w-0 flex-1 phone:h-[360px] phone:flex-none"
    >
      {showCost && (
        <div
          data-vibes-angle-controls
          className="absolute top-2 right-2 z-[2] flex items-center gap-1 rounded-lg bg-track p-0.5"
          role="group"
          aria-label="3D view angle"
        >
          <button
            ref={rotateLeftRef}
            type="button"
            onClick={() => setYaw((current) => clamp(current - 0.16, MIN_YAW, MAX_YAW))}
            className="flex size-8 items-center justify-center rounded-md text-fg-2 hover:bg-thumb hover:text-fg"
            aria-label="Rotate 3D view left"
            title="Rotate left"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setYaw((current) => clamp(current + 0.16, MIN_YAW, MAX_YAW))}
            className="flex size-8 items-center justify-center rounded-md text-fg-2 hover:bg-thumb hover:text-fg"
            aria-label="Rotate 3D view right"
            title="Rotate right"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
          {isCustomAngle && (
            <button
              type="button"
              onClick={() => {
                rotateLeftRef.current?.focus({ preventScroll: true });
                setYaw(DEFAULT_YAW);
                setPitch(DEFAULT_PITCH);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-[500] text-fg-2 hover:bg-thumb hover:text-fg"
              aria-label="Reset 3D view angle"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      )}
      <svg
        className={`absolute inset-0 block size-full overflow-visible ${showCost ? `touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}` : ''}`}
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="group"
        aria-label={
          showCost
            ? 'Personal model recommendations mapped by Capability, Coherency, and high-effort API cost per task'
            : 'Personal model recommendations mapped by Capability and Coherency'
        }
        aria-describedby={`${id}-description`}
        onPointerDown={(event) => {
          if (!showCost || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
          dragState.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          if (dragState.current.pointerId === event.pointerId) {
            // If a mouse button was released outside the SVG before capture began, abort the pending drag.
            if (event.pointerType === 'mouse' && (event.buttons & 1) === 0) {
              dragState.current = { pointerId: null, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false };
              setDragging(false);
            } else {
              const totalTravel = Math.hypot(
                event.clientX - dragState.current.startX,
                event.clientY - dragState.current.startY,
              );
              if (!dragState.current.moved && totalTravel > DRAG_THRESHOLD_PX) {
                dragState.current.moved = true;
                setDragging(true);
                event.currentTarget.setPointerCapture?.(event.pointerId);
              }
              if (dragState.current.moved) {
                const dx = event.clientX - dragState.current.lastX;
                const dy = event.clientY - dragState.current.lastY;
                dragState.current.lastX = event.clientX;
                dragState.current.lastY = event.clientY;
                setYaw((current) => clamp(current + dx * 0.008, MIN_YAW, MAX_YAW));
                setPitch((current) => clamp(current + dy * 0.006, MIN_PITCH, MAX_PITCH));
                return;
              }
            }
          }
          if (event.pointerType === 'touch') return;
          const hit = resolvePointerFamily(event.currentTarget, event.target, event.clientX, event.clientY);
          flushSync(() => onPreview(hit));
        }}
        onPointerUp={(event) => {
          if (dragState.current.pointerId === event.pointerId) {
            const wasDragging = dragState.current.moved;
            dragState.current.pointerId = null;
            if (wasDragging) {
              setDragging(false);
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }
          }
        }}
        onPointerCancel={(event) => {
          if (dragState.current.pointerId === event.pointerId) {
            dragState.current = { pointerId: null, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false };
            setDragging(false);
          }
        }}
        onPointerLeave={() => {
          const activeDrag = dragState.current.pointerId !== null && dragState.current.moved;
          if (!activeDrag) {
            dragState.current.pointerId = null;
            dragState.current.moved = false;
            flushSync(() => onPreview(null));
          }
        }}
        onClick={(event) => {
          if (dragState.current.moved) {
            dragState.current.moved = false;
            event.stopPropagation();
            return;
          }
          const hit = resolvePointerFamily(event.currentTarget, event.target, event.clientX, event.clientY);
          if (!hit) {
            onClear();
            return;
          }
          event.stopPropagation();
          Array.from(event.currentTarget.querySelectorAll<SVGGElement>('g[data-vibe-family]'))
            .find((point) => point.dataset.vibeFamily === hit)
            ?.focus({ preventScroll: true });
          onTogglePin(hit);
        }}
      >
        <desc id={`${id}-description`}>
          {showCost
            ? `3D view plotting Capability (${axisDefinitions.capability}) on the vertical axis, Coherency (${axisDefinitions.coherency}) across the front axis, and log-scaled high-effort API cost per task into depth. Drag or use the angle controls to rotate, focus a point for details, press Enter or Space to pin it, and Escape to clear.`
            : `Subjective map plotting models by Capability (${axisDefinitions.capability}) on the vertical axis and Coherency (${axisDefinitions.coherency}) on the horizontal axis. Focus a model to inspect notes, press Enter or Space to pin it, and Escape to clear the selection.`}
        </desc>

        <rect className="chart-background" width={size.width} height={size.height} fill="var(--panel)" />

        {/* Subtle sweet-spot highlight in flat 2D view */}
        {t < 0.98 && (
          <rect
            x={flatSweetX}
            y={flatSweetY}
            width={flatSweetW}
            height={flatSweetH}
            rx={10}
            fill="var(--accent)"
            opacity={0.06 * (1 - t)}
            pointerEvents="none"
          />
        )}

        {/* 3D Coherency x Cost floor plane */}
        {t > 0.02 && (
          <g aria-hidden="true" pointerEvents="none" opacity={t}>
            <polygon
              points={`${floor00.x},${floor00.y} ${floor10.x},${floor10.y} ${floor11.x},${floor11.y} ${floor01.x},${floor01.y}`}
              fill="var(--surface)"
              fillOpacity={0.55}
              stroke="var(--grid)"
              strokeWidth={1}
            />
            {visibleCostTicks.map(({ tick, left, right, showLabel }) => (
              <g key={tick}>
                <line
                  x1={left.x}
                  y1={left.y}
                  x2={right.x}
                  y2={right.y}
                  stroke="var(--grid)"
                  strokeDasharray="3 4"
                />
                {showLabel && (
                  <text
                    data-cost-tick={tick}
                    x={right.x + 8}
                    y={right.y + 3.5}
                    fill="var(--fg-3)"
                    fontSize={compact ? 10 : 11}
                  >
                    ${tick >= 1 ? tick : tick.toFixed(2)}
                  </text>
                )}
              </g>
            ))}
            {[25, 50, 75].map((tick) => {
              const front = proj(tick, 0, 0);
              const back = proj(tick, 0, 1);
              return (
                <line
                  key={tick}
                  x1={front.x}
                  y1={front.y}
                  x2={back.x}
                  y2={back.y}
                  stroke="var(--grid)"
                  strokeDasharray="2 5"
                  opacity={0.75}
                />
              );
            })}
          </g>
        )}

        {/* Back-wall Capability gridlines */}
        <g aria-hidden="true" pointerEvents="none">
          {[25, 50, 75].map((tick) => {
            const left = proj(0, tick, 1);
            const right = proj(100, tick, 1);
            const bottom = proj(tick, 0, 1);
            const top = proj(tick, 100, 1);
            return (
              <g key={tick}>
                <line
                  x1={left.x}
                  y1={left.y}
                  x2={right.x}
                  y2={right.y}
                  stroke="var(--grid)"
                  strokeDasharray="2 6"
                  opacity={lerp(1, 0.5, t)}
                />
                {t < 0.98 && (
                  <line
                    x1={bottom.x}
                    y1={bottom.y}
                    x2={top.x}
                    y2={top.y}
                    stroke="var(--grid)"
                    strokeDasharray="2 6"
                    opacity={1 - t}
                  />
                )}
              </g>
            );
          })}

          {!compact && t < 0.9 && (
            <text
              x={pad.left + plotWidth - 10}
              y={pad.top + 18}
              textAnchor="end"
              fill="var(--accent)"
              fontSize={11}
              fontWeight={600}
              opacity={1 - t}
            >
              Sweet spot
            </text>
          )}

          {/* Capability (Y) and Coherency (X) axes */}
          <g
            stroke="var(--line-2)"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <line x1={originBack.x} y1={originBack.y} x2={capTop.x} y2={capTop.y} />
            {t < 0.15 && (
              <path
                d={`M ${capTop.x - 5.5} ${capTop.y + 10} L ${capTop.x} ${capTop.y} L ${capTop.x + 5.5} ${capTop.y + 10}`}
                opacity={1 - t / 0.15}
              />
            )}
            <line x1={originFront.x} y1={originFront.y} x2={cohEnd.x} y2={cohEnd.y} />
            {t < 0.15 && (
              <path
                d={`M ${cohEnd.x - 10} ${cohEnd.y - 5.5} L ${cohEnd.x} ${cohEnd.y} L ${cohEnd.x - 10} ${cohEnd.y + 5.5}`}
                opacity={1 - t / 0.15}
              />
            )}
          </g>

          <text
            data-axis-label="capability"
            {...halo}
            x={capTop.x}
            y={capLabelY}
            fill="var(--fg)"
            fontSize={capSize}
            fontWeight={600}
          >
            {capLabel}
          </text>
          <text
            data-axis-label="coherency"
            {...halo}
            x={cohEnd.x}
            y={cohLabelY}
            textAnchor="end"
            fill="var(--fg)"
            fontSize={capSize}
            fontWeight={600}
          >
            {cohLabel}
          </text>

          {/* 3rd Cost axis along the left depth edge */}
          {t > 0.04 && (
            <g opacity={t} data-cost-axis="true">
              <line
                x1={originFront.x}
                y1={originFront.y}
                x2={originBack.x}
                y2={originBack.y}
                stroke="var(--accent)"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <text
                data-axis-label="cost"
                {...halo}
                x={costLabelX}
                y={costLabelY}
                textAnchor={compact ? 'start' : 'end'}
                fill="var(--accent)"
                fontSize={costSize}
                fontWeight={600}
              >
                {costLabel}
              </text>
            </g>
          )}
        </g>

        {/* Crosshairs for active model in flat 2D view */}
        {active && t < 0.25 && (
          <g
            stroke={modelColor(active.entry.model)}
            strokeWidth={1}
            strokeDasharray="5 4"
            opacity={0.5 * (1 - t / 0.25)}
            pointerEvents="none"
            aria-hidden="true"
          >
            <line x1={originBack.x} x2={active.point.x} y1={active.point.y} y2={active.point.y} />
            <line x1={active.point.x} x2={active.point.x} y1={originFront.y} y2={active.point.y} />
          </g>
        )}

        {/* Drop stems to the Coherency x Cost floor, all painted before any dot or label so label halos cover them. */}
        {t > 0.04 && (
          <g pointerEvents="none" aria-hidden="true">
            {projectedModels.map(({ entry, cost01, point, floor }) => {
              const color = modelColor(entry.model);
              const cColor = costColor(cost01);
              const isActive = activeFamily === entry.family;
              const muted = activeFamily !== null && !isActive;
              return (
                <g key={entry.family}>
                  <line
                    x1={point.x}
                    y1={point.y}
                    x2={floor.x}
                    y2={floor.y}
                    stroke={isActive ? cColor : color}
                    strokeWidth={isActive ? 1.8 : 1.15}
                    strokeDasharray={isActive ? undefined : '3 3'}
                    opacity={(isActive ? 0.9 : muted ? 0.32 : 0.5) * t}
                  />
                  <ellipse
                    cx={floor.x}
                    cy={floor.y}
                    rx={isActive ? 5.5 : 3.5}
                    ry={isActive ? 2.6 : 1.7}
                    fill={cColor}
                    opacity={(isActive ? 0.9 : muted ? 0.38 : 0.55) * t}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Plotted models (sorted back-to-front in 3D) */}
        {projectedModels.map(({ entry, cost01, point }) => {
          const color = modelColor(entry.model);
          const labelFill = `color-mix(in srgb, ${color} 80%, var(--fg))`;
          const cColor = costColor(cost01);
          const isActive = activeFamily === entry.family;
          const isPinned = pinnedFamily === entry.family;
          const muted = activeFamily !== null && !isActive;
          const { label, labelSize, sublabelSize } = labelItems.find((item) => item.family === entry.family)!;
          const { anchor, labelX, labelY, sublabelX, sublabelY, subtext: showSubtext } = labelLayouts.get(entry.family)!;
          const handlers = pinHandlers(entry.family, onTogglePin);

          return (
            <g
              key={entry.family}
              data-vibe-family={entry.family}
              role="button"
              tabIndex={0}
              aria-pressed={isPinned}
              aria-label={`${label}: ${entry.summary}`}
              className="cursor-pointer outline-none focus-visible:[&>.vibe-focus]:opacity-100"
              onFocus={() => onPreview(entry.family)}
              onBlur={() => onPreview(null)}
              onClick={(event) => {
                // Screen readers and keyboard activation dispatch click with detail === 0 and no coordinates.
                if (event.detail === 0) {
                  event.stopPropagation();
                  handlers.onClick();
                }
              }}
              onKeyDown={handlers.onKeyDown}
            >
              <circle cx={point.x} cy={point.y} r={18} fill="transparent" />
              <circle
                className="vibe-focus"
                cx={point.x}
                cy={point.y}
                r={13}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                opacity={0}
                pointerEvents="none"
              />
              {isActive && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={12}
                  fill={color}
                  opacity={0.2}
                  pointerEvents="none"
                />
              )}
              <circle
                data-vibe-dot
                cx={point.x}
                cy={point.y}
                r={isActive ? 6.5 : 5.25}
                fill={color}
                stroke="var(--panel)"
                strokeWidth={2}
                opacity={muted ? 0.72 : 1}
              />
              <text
                data-vibe-label={entry.family}
                x={labelX}
                y={labelY}
                textAnchor={anchor}
                fill={labelFill}
                fontSize={labelSize}
                fontWeight={isActive ? 650 : 550}
                {...halo}
              >
                {label}
              </text>
              {showSubtext && (
                <text
                  data-vibe-sublabel={entry.family}
                  x={sublabelX}
                  y={sublabelY}
                  textAnchor={anchor}
                  fill={!showBenchmarks && t > 0.35 ? cColor : 'var(--fg-2)'}
                  fontSize={sublabelSize}
                  fontWeight={!showBenchmarks && t > 0.35 ? 600 : 400}
                  {...halo}
                  opacity={showBenchmarks ? 1 : Math.min(1, (t - 0.35) / 0.65)}
                >
                  {showSubtext}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
