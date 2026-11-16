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
  const navigation = page.getByRole('navigation', { name: 'Chart views' });
  await expect(navigation.getByRole('button', { name: 'Intelligence index', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await expect(page.locator('#model-filters')).toContainText('1 selected');
  await page.evaluate(() => {
    history.pushState(null, '', '?selected=&chart=cost-task');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('#model-filters')).toContainText('0 selected');
  await expect(navigation.getByRole('button', { name: 'Cost per task', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expect(page.locator('#model-filters')).toContainText('1 selected');
  await expect(navigation.getByRole('button', { name: 'Intelligence index', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(page.locator('#model-filters')).toContainText('0 selected');
  await expect(navigation.getByRole('button', { name: 'Cost per task', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('phone navigation scrolls to the requested chart and closes the model sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /Models.*Edit selection/ }).click();
  await expect(page.getByRole('dialog', { name: 'Model filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Model filters' })).toHaveCount(0);
  const navigation = page.getByRole('navigation', { name: 'Chart views' });
  await navigation.getByRole('button', { name: 'Resources', exact: true }).click();
  const button = navigation.getByRole('button', { name: 'Task time', exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(/chart=time-task/);
  await expect.poll(() => page.locator('#time-task').evaluate((section) => Math.round(section.getBoundingClientRect().top))).toBeLessThan(220);
  await expect(page.locator('#time-task').getByRole('button').first()).toBeVisible();
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

test('phone efficiency shows the chart before optional details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?page=efficiency');
  await expect(page.locator('.efficiency-plot svg')).toBeVisible();
  const positions = await page.evaluate(() => ({
    title: document.querySelector('.efficiency-heading')!.getBoundingClientRect().top,
    filters: document.querySelector('.efficiency-filters')!.getBoundingClientRect().top,
    plot: document.querySelector('.efficiency-plot')!.getBoundingClientRect().top,
    details: document.querySelector('.efficiency-details-slot')!.getBoundingClientRect().height,
  }));
  expect(positions.title).toBeLessThan(positions.filters);
  expect(positions.filters).toBeLessThan(positions.plot);
  expect(positions.details).toBe(0);
});

test('dense combined bars scroll inside the plot and keep keyboard selection usable', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/?chart=intelligence');
  await expect(page.locator('#intelligence svg[role=group]')).toBeVisible();
  expect(await page.locator('#intelligence svg[role=group]').locator('..').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.goto('/?chart=intelligence&selected=gpt-6-1-terra,gpt-6-1-sol,gpt-6-luna,gpt-6-astra,claude-haiku-5-5,claude-sonnet-5-5,claude-opus-5-5,claude-fable-5-1,claude-fable-5-2,gemini-4-carbon,gemini-4-hydrogen');
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
