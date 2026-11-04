import { useCallback, useState } from 'react';
import type { ViewId } from './chart-definitions';
import { readView } from './state';

/** Keep the selected chart stable while filters and URL settings change. */
export function useChartNavigation() {
  const [active, setActive] = useState(() => readView(typeof location === 'undefined' ? '' : location.search));
  const navigate = useCallback((id: ViewId) => setActive(id), []);
  return { active, navigate };
}
