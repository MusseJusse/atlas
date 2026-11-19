import { nice, ticks } from 'd3-array';

type Interval = readonly [number, number];

/** Include every signed measurement and zero, with optional space beyond the bar ends. */
export function barDomain(values: number[], padding = 0): Interval {
  const min = Math.min(0, ...values);
  // An all-zero plot still needs a span; otherwise small values like sub-dollar costs fill the height.
  const max = Math.max(0, ...values) || (min < 0 ? 0 : 1);
  return [min * (1 + padding), max * (1 + padding)];
}

/** Numeric chart coordinates only. Color and string interpolation are not needed here. */
export function linearScale(domain: Interval, range: Interval, options: { nice?: boolean } = {}) {
  const [min, max] = options.nice ? nice(domain[0], domain[1], 10) : domain;
  const [start, end] = range;
  return Object.assign(
    (value: number) => {
      const position = max === min ? 0.5 : (value - min) / (max - min);
      return start * (1 - position) + end * position;
    },
    { ticks: (count: number) => ticks(min, max, count) },
  );
}

/** Chart data and log domains are positive. Match D3's base-ten tick placement. */
export function logScale([min, max]: Interval, range: Interval) {
  const coordinate = linearScale([Math.log(min), Math.log(max)], range);
  return Object.assign(
    (value: number) => coordinate(Math.log(value)),
    {
      ticks(count: number) {
        const first = Math.log10(min);
        const last = Math.log10(max);
        const powerOfTen = (power: number) => Number(`1e${power}`);
        if (last - first >= count)
          return ticks(first, last, Math.min(last - first, count)).map(powerOfTen);
        const values: number[] = [];
        for (let power = Math.floor(first); power <= Math.ceil(last); power++) {
          for (let multiple = 1; multiple < 10; multiple++) {
            const value = power < 0
              ? multiple / powerOfTen(-power)
              : multiple * powerOfTen(power);
            if (value >= min && value <= max) values.push(value);
          }
        }
        return values.length * 2 < count ? ticks(min, max, count) : values;
      },
    },
  );
}
