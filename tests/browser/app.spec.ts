import { expect, test, type Page } from '@playwright/test';

const browserErrors = new WeakMap<Page, string[]>();

test.afterEach(async ({ page }) => expect(browserErrors.get(page)).toEqual([]));

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  // Ignore the external analytics service, which is not part of application startup.
  await page.route('**/_vercel/**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('**/vitals.vercel-insights.com/**', (route) => route.fulfill({ status: 204, body: '' }));
});

test('production HTML includes content and CSS, and default hydration preserves its DOM', async ({ page }) => {
  let release = () => {};
  const scripts = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/assets/*.js', async (route) => { await scripts; await route.continue(); });
  try {
    const response = await page.goto('/', { waitUntil: 'commit' });
    const html = await response!.text();
    expect(html).toContain('<div id="root"><');
    expect(html).toContain('<style>');
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/);
    const main = await page.getByRole('main').elementHandle();
    expect(main).not.toBeNull();
    release();
    await expect(page.locator('#cost-intelligence svg[role=group]')).toBeVisible();
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await main!.evaluate((element) => element.isConnected)).toBe(true);
    await expect(page.locator('#cost-intelligence svg[role=group]')).toBeVisible();
  } finally { release(); }
});

test('controls work while the UI font response is stalled', async ({ page }) => {
  let release = () => {};
  const fonts = new Promise<void>((resolve) => { release = resolve; });
  let requested = () => {};
  const fontRequested = new Promise<void>((resolve) => { requested = resolve; });
  await page.route('**/*.woff2', async (route) => { requested(); await fonts; await route.continue(); });
  try {
    await page.goto('/', { waitUntil: 'commit' });
    await fontRequested;
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    release();
    await expect(page.locator('#cost-intelligence svg[role=group]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const dimensions = await page.locator('#cost-intelligence svg[role=group]').evaluate((svg) => svg.getAttribute('viewBox')!.split(' ').map(Number));
    expect(dimensions[2]).toBeGreaterThan(0);
    expect(dimensions[3]).toBeGreaterThan(0);
  } finally { release(); }
});

test('saved dark views and back/forward restore chart and filter state', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('benchmark-theme', 'dark'));
  await page.goto('/?selected=gpt-6-1-sol&chart=intelligence');
  const vertical = (label: string) => page.locator(`summary[aria-label="Vertical axis: ${label}"]`);
  await expect(vertical('Intelligence index')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await expect(page.locator('#model-filters')).toContainText('1 selected');
  await page.evaluate(() => {
    history.pushState(null, '', '?selected=&chart=cost-task');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('#model-filters')).toContainText('0 selected');
  await expect(vertical('Cost per task')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#model-filters')).toContainText('1 selected');
  await expect(vertical('Intelligence index')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#model-filters')).toContainText('0 selected');
  await expect(vertical('Cost per task')).toBeVisible();
});

test('axis menus switch between scatter plots and rankings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('summary[aria-label^="Horizontal axis"]:visible').click();
  const menu = page.getByRole('group', { name: 'Horizontal axis' }).filter({ visible: true });
  expect((await menu.boundingBox())!.x).toBeGreaterThanOrEqual(0);
  await menu.getByRole('button', { name: 'Time per task', exact: true }).click();
  await expect(page).toHaveURL(/chart=time-intelligence/);
  await expect(page.locator('#time-intelligence svg[role=group]')).toBeVisible();
  await page.locator('summary[aria-label^="Vertical axis"]').click();
  await page.getByRole('button', { name: 'Time per task', exact: true }).click();
  await expect(page).toHaveURL(/chart=time-task/);
  await expect(page.locator('#time-task .ranking-row').first()).toBeVisible();
  await expect(page.locator('summary[aria-label="Horizontal axis: Models, ranked"]:visible')).toBeVisible();
});

test('the model picker opens from its button or the slash key and closes outside it', async ({ page }) => {
  await page.goto('/');
  const picker = page.getByRole('dialog', { name: 'Model filters' });
  // Charts mount after hydration, which is when the shortcut starts listening.
  await expect(page.locator('#cost-intelligence svg[role=group]')).toBeVisible();
  await page.keyboard.press('/');
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('textbox', { name: 'Find models' })).toBeFocused();
  await picker.getByRole('button', { name: /Gemini 4 Neon/ }).click();
  await expect(page.locator('button[aria-controls="model-filters"]')).toContainText('8 models');
  // The click that closes the picker must not also flip the control under it.
  const frontier = page.getByRole('button', { name: 'Frontier', exact: true });
  const box = (await frontier.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(picker).toHaveCount(0);
  await expect(frontier).toHaveAttribute('aria-pressed', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('button[aria-controls="model-filters"]').click();
  await expect(picker).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(picker).toHaveCount(0);
});

test('phone rankings plot configurations and expand without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/?chart=intelligence');
  const ranking = page.locator('#intelligence .ranking');
  const row = ranking.locator('.ranking-row').first();
  await expect(row).toBeVisible();
  await expect(row.locator('[data-configuration]').first()).toBeVisible();
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(ranking.locator('.ranking-configurations button').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('phone efficiency rows open into their records without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?page=efficiency');
  const row = page.getByRole('button', { name: /^Score ≥ 40:/ });
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('list', { name: 'Score ≥ 40 records' }).getByRole('listitem').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // The narrowest phones wrap the elapsed time instead of running the multiplier into the score.
  await page.setViewportSize({ width: 320, height: 740 });
  const overlaps = await page.locator('.ladder-toggle').evaluateAll((rows) => rows.filter((row) =>
    row.querySelector('.ladder-score')!.getBoundingClientRect().right > row.querySelector('.ladder-change-text > span')!.getBoundingClientRect().left).length);
  expect(overlaps).toBe(0);
});

test('dense combined bars scroll inside the plot and keep keyboard selection usable', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/?chart=intelligence&combined=true');
  await expect(page.locator('#intelligence svg[role=group]')).toBeVisible();
  expect(await page.locator('#intelligence svg[role=group]').locator('..').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.goto('/?chart=intelligence&combined=true&selected=gpt-6-1-terra,gpt-6-1-sol,gpt-6-luna,gpt-6-astra,claude-haiku-5-5,claude-sonnet-5-5,claude-opus-5-5,claude-fable-5-1,claude-fable-5-2,gemini-4-carbon,gemini-4-hydrogen');
  const chart = page.locator('#intelligence svg[role=group]');
  await expect(chart).toBeVisible();
  const scrollArea = chart.locator('..');
  expect(await scrollArea.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  const axis = page.locator('#intelligence [data-fixed-bar-axis]');
  const axisX = (await axis.boundingBox())!.x;
  const controls = chart.locator('g[role=button]');
  const last = controls.last();
  await last.focus();
  await expect.poll(() => scrollArea.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  expect((await axis.boundingBox())!.x).toBe(axisX);
  await page.keyboard.press('Enter');
  await expect(last).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(last).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('combined bars are opt-in from chart settings and survive a reload', async ({ page }) => {
  await page.goto('/?chart=intelligence');
  const section = page.locator('#intelligence');
  const bars = section.locator('svg[role=group] g[role=button] > rect[data-bar-segment]');
  await expect(bars.first()).toBeVisible();
  const positions = () => bars.evaluateAll((rects) => rects.slice(0, 2).map((rect) => rect.getAttribute('x')));
  const separate = await positions();
  expect(separate[0]).not.toBe(separate[1]);
  await section.locator('summary[aria-label="Chart settings"]').click();
  const toggle = section.getByRole('button', { name: 'Combine reasoning bars', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/combined=true/);
  await expect.poll(async () => { const [a, b] = await positions(); return a === b; }).toBe(true);
  await page.reload();
  await expect(bars.first()).toBeVisible();
  const combined = await positions();
  expect(combined[0]).toBe(combined[1]);
  await section.locator('summary[aria-label="Chart settings"]').click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(page).not.toHaveURL(/combined=/);
  await expect.poll(positions).toEqual(separate);
});

for (const view of ['cost-task', 'time-task', 'tokens-ranking', 'tokens-total']) {
  test(`combined bars apply to ${view} and can be switched off`, async ({ page }) => {
    await page.goto(`/?chart=${view}&selected=gpt-6-1-terra&combined=true`);
    const section = page.locator(`#${view}`);
    const bars = section.locator('svg[role=group] g[role=button] > rect[data-bar-segment]');
    await expect(bars.first()).toBeVisible();
    expect(await bars.count()).toBeGreaterThan(1);
    const positions = () => bars.evaluateAll((rects) => rects.map((rect) => rect.getAttribute('x')));
    expect(new Set(await positions()).size).toBe(1);
    await section.locator('summary[aria-label="Chart settings"]').click();
    await section.getByRole('button', { name: 'Combine reasoning bars', exact: true }).click();
    await expect.poll(async () => new Set(await positions()).size).toBeGreaterThan(1);
  });
}

for (const combined of [false, true]) {
  test(`bar hover ignores empty space and value labels, combined=${combined}`, async ({ page }) => {
    await page.goto(`/?chart=intelligence&selected=gpt-6-1-terra&combined=${combined}`);
    const section = page.locator('#intelligence');
    const bars = section.locator('rect[data-bar-segment]');
    await expect(bars.first()).toBeVisible();
    const bounds = await bars.evaluateAll((rects) => rects.map((rect) => {
      const { x, y, width, height } = rect.getBoundingClientRect();
      return { x, y, width, height };
    }));
    const bar = bounds.toSorted((a, b) => a.y - b.y)[0]!;
    const centerX = bar.x + bar.width / 2;
    const details = section.getByRole('complementary', { name: 'Selected configuration' });
    await page.mouse.move(centerX, bar.y + bar.height / 2);
    await expect(details).toBeVisible();
    await page.mouse.move(centerX, bar.y - 20);
    await expect(details).not.toBeVisible();
    await page.mouse.move(centerX, bar.y - 8);
    await expect(details).not.toBeVisible();
    await page.mouse.move(centerX, bar.y + Math.min(3, bar.height / 2));
    await expect(details).toBeVisible();
  });
}

test('vibes page supports label clicks, pin precedence, 3D cost axis, and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Vibes' }).click();
  await expect(page).toHaveURL(/\?page=vibes/);
  await expect(page.getByRole('heading', { name: 'Vibes', exact: true })).toHaveCount(1);
  await expect(page.locator('.vibes-plot svg [data-vibe-family]')).toHaveCount(7);
  const capabilityDefinition = page.locator('p', { hasText: 'at its best, what can it do' });
  const coherencyDefinition = page.locator('p', { hasText: "does it understand what it's doing" });
  await expect(capabilityDefinition).toBeVisible();
  await expect(coherencyDefinition).toBeVisible();

  const toolbarBottom = await page.locator('.vibes-toolbar').evaluate((el) => el.getBoundingClientRect().bottom);
  const capTop = await page.locator('[data-axis-label="capability"]').evaluate((el) => el.getBoundingClientRect().top);
  expect(capTop).toBeGreaterThanOrEqual(toolbarBottom + 8);

  // Pin Coding, then hover Fable: pinned Coding card and its Close button must stay intact.
  const codingBtn = page.getByRole('button', { name: /Coding.*Opus 5\.5/ });
  await codingBtn.click();
  const details = page.getByRole('complementary', { name: 'Selected model details' });
  await expect(details).toBeVisible();
  await expect(details).toContainText('Opus 5.5');
  await expect(details.getByRole('button', { name: 'Clear selected configuration' })).toBeVisible();

  await page.locator('[data-vibe-family="claude-fable-5-2"]').hover();
  await expect(details).toContainText('Opus 5.5');
  await expect(details).toContainText('Default pick for day-to-day engineering');

  // Escape while focused on Best for clears the pin without stealing focus into the SVG chart.
  await codingBtn.focus();
  await page.keyboard.press('Escape');
  await expect(details).not.toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-use-case'))).toBe('coding');

  // Clicking a model's text label directly pins that model; X closes it cleanly without re-opening a preview.
  await page.locator('[data-vibe-family="gpt-6-2-astra"] text').first().click();
  await expect(details).toContainText('GPT-6.2 Astra');
  await details.getByRole('button', { name: 'Clear selected configuration' }).click();
  await expect(details).not.toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-vibe-family'))).toBe('gpt-6-2-astra');

  // Background click also clears a chart pin in 2D.
  await page.locator('[data-vibe-family="gpt-6-2-astra"] text').first().click();
  await expect(details).toContainText('GPT-6.2 Astra');
  await page.locator('.vibes-plot svg rect.chart-background').click({ position: { x: 80, y: 80 } });
  await expect(details).not.toBeVisible();

  // Assistive click (detail === 0) on a chart point pins and unpins cleanly.
  await page.locator('[data-vibe-family="claude-opus-5-5"]').dispatchEvent('click', { detail: 0, bubbles: true });
  await expect(details).toContainText('Opus 5.5');
  await page.locator('[data-vibe-family="claude-opus-5-5"]').dispatchEvent('click', { detail: 0, bubbles: true });
  await expect(details).not.toBeVisible();

  await page.getByRole('button', { name: '+ Benchmarks', exact: true }).click();
  await expect(page.locator('.vibes-plot svg[role="group"]')).toContainText('Intel ');

  // 3D Cost axis: all 3 axis labels stay in bounds, labels don't collide, rotate/reset preserves focus, and background click clears a pin.
  const costToggle = page.getByRole('button', { name: 'Cost axis', exact: true });
  await costToggle.click();
  await expect(costToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.vibes-plot svg[role="group"] [data-cost-axis="true"]')).toBeVisible();

  const hasLabelCollision = () =>
    page.evaluate(() => {
      const boxes = [...document.querySelectorAll('[data-vibe-label], [data-vibe-sublabel]')].map((el) => ({
        fam: el.getAttribute('data-vibe-label') || el.getAttribute('data-vibe-sublabel'),
        r: el.getBoundingClientRect(),
      }));
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!;
          const b = boxes[j]!;
          if (a.fam === b.fam) continue;
          if (a.r.left < b.r.right && a.r.right > b.r.left && a.r.top < b.r.bottom && a.r.bottom > b.r.top) return true;
        }
      }
      return false;
    });

  await page.setViewportSize({ width: 1280, height: 640 });
  await expect.poll(async () => {
    return page.evaluate(() => {
      const svg = document.querySelector('.vibes-plot svg[role="group"]')!.getBoundingClientRect();
      return ['capability', 'coherency', 'cost'].every((axis) => {
        const el = document.querySelector(`[data-axis-label="${axis}"]`);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.left >= svg.left && rect.right <= svg.right && rect.top >= svg.top && rect.bottom <= svg.bottom;
      });
    });
  }).toBe(true);
  expect(await hasLabelCollision()).toBe(false);

  await page.getByRole('button', { name: /Cheap & cheerful.*GPT-6\.1 Terra/ }).click();
  await expect(details).toContainText('GPT-6.1 Terra');
  await page.locator('.vibes-plot svg[role="group"]').click({ position: { x: 20, y: 20 } });
  await expect(details).not.toBeVisible();

  await page.getByRole('button', { name: 'Rotate 3D view left' }).click();
  const resetBtn = page.getByRole('button', { name: 'Reset 3D view angle' });
  await expect(resetBtn).toBeVisible();
  await resetBtn.click();
  await expect(resetBtn).not.toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Rotate 3D view left');

  // Tablet width keeps the fixed-height canvas layout; hovering Best for previews over the plot without shifting layout.
  await page.setViewportSize({ width: 800, height: 1000 });
  const beforeTop = await codingBtn.evaluate((el) => el.getBoundingClientRect().top);
  await codingBtn.hover();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(details).toBeVisible();
  expect(await codingBtn.evaluate((el) => el.getBoundingClientRect().top)).toBe(beforeTop);

  // Compact tablet (620x600) keeps the fixed-height canvas layout with a usable plot.
  await page.setViewportSize({ width: 620, height: 600 });
  await expect.poll(() => page.locator('.vibes-plot').evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(280);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  // Phones collapse the picks into one menu. Picking a use case pins it below the plot.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.move(1, 1);
  await expect(details).not.toBeVisible();
  await expect(codingBtn).toBeHidden();
  const pickMenu = page.locator('summary[aria-label^="Best for"]');
  await pickMenu.click();
  await page.getByRole('group', { name: 'Best for' }).getByRole('button', { name: /Coding/ }).click();
  await expect(details).toBeVisible();
  await expect(details).toHaveAttribute('data-placement', 'below');
  await expect(pickMenu).toHaveAttribute('aria-label', 'Best for: Coding, Opus 5.5');
  await page.keyboard.press('Escape');
  await expect(details).not.toBeVisible();
  await expect(pickMenu).toHaveAttribute('aria-label', 'Best for: Pick a use case');

  await page.setViewportSize({ width: 320, height: 740 });
  await expect(capabilityDefinition).toBeVisible();
  await expect(coherencyDefinition).toBeVisible();
  await expect.poll(() =>
    page.locator('.vibes-plot svg[role="group"]').evaluate((svg) => Number(svg.getAttribute('viewBox')!.split(' ')[2])),
  ).toBeLessThan(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await hasLabelCollision()).toBe(false);
});
