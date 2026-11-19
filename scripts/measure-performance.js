// Paste into the browser console on a production preview. Restores the starting URL and filters.
// Measures discrete updates through React's microtask flush and synchronous layout, excluding paint.
(async () => {
  const initialUrl = location.href;
  const buttons = [...document.querySelectorAll('[data-choice-menu] button')];
  const model = document.querySelector('aside button[aria-pressed][title]');
  if (!buttons.length || !model) throw new Error('Open the benchmark app before measuring.');
  const initial = {
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    resourceBytes: performance
      .getEntriesByType('resource')
      .reduce((sum, entry) => sum + entry.decodedBodySize, 0),
    nodes: document.querySelectorAll('*').length,
  };
  const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));
  const measure = async (action) => {
    const start = performance.now();
    action();
    await Promise.resolve();
    document.body.getBoundingClientRect();
    return performance.now() - start;
  };
  const samples = { navigation: [], filter: [] };
  try {
    // Warm each chart so navigation samples measure updates rather than first mounts.
    for (const button of buttons) {
      button.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    for (let index = 0; index < 24; index++) {
      samples.navigation.push(await measure(() => buttons[index % buttons.length].click()));
      await nextTask();
      samples.filter.push(await measure(() => model.click()));
      await nextTask();
    }
    const updates = Object.fromEntries(
      Object.entries(samples).map(([name, values]) => {
        const ordered = values.toSorted((a, b) => a - b);
        return [name, { medianMs: ordered[12], p95Ms: ordered[22], maximumMs: ordered[23] }];
      }),
    );
    console.log('Initial page', initial);
    console.table(updates);
    return { initial, updates };
  } finally {
    history.replaceState(null, '', initialUrl);
    dispatchEvent(new PopStateEvent('popstate'));
  }
})();
