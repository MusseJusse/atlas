import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { models } from '../models';
import { defaults } from '../state';
import { MeasurementTable } from './MeasurementTable';

it.each([['cost', false, [1, 100, 2, 3]], ['intelligence', true, [100, 1, 3, 2]]] as const)(
  'orders %s groups by their best value and each configuration in the selected direction', (metric, descending, expected) => {
    const rows = [1, 100, 2, 3].map((value, index) => ({
      ...models[0]!, id: String(index), family: index < 2 ? 'a' : 'b',
      name: index < 2 ? 'Model A' : 'Model B', value, [metric]: value,
    }));
    const markup = renderToStaticMarkup(<MeasurementTable rows={rows} metric={metric} settings={defaults} descending={descending} />);
    const values = [...markup.matchAll(/<td>(?:\$)?(\d+(?:\.\d+)?)<\/td>/g)].map((match) => Number(match[1]));
    expect(values).toEqual(expected);
  },
);
