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
  await expect(navigation.locator('[aria-current=page]:visible')).toHaveAttribute('aria-controls', 'intelligence');
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await expect(page.locator('#model-filters')).toContainText('1 selected');
  await page.evaluate(() => {
    history.pushState(null, '', '?selected=&chart=cost-task');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('#model-filters')).toContainText('0 selected');
  await expect(navigation.locator('[aria-current=page]:visible')).toHaveAttribute('aria-controls', 'cost-task');
  await page.goBack();
  await expect(page.locator('#model-filters')).toContainText('1 selected');
  await expect(navigation.locator('[aria-current=page]:visible')).toHaveAttribute('aria-controls', 'intelligence');
  await page.goForward();
  await expect(page.locator('#model-filters')).toContainText('0 selected');
  await expect(navigation.locator('[aria-current=page]:visible')).toHaveAttribute('aria-controls', 'cost-task');
});

test('phone chart selection shows one chart and closes the model sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /Models.*Edit selection/ }).click();
  await expect(page.getByRole('dialog', { name: 'Model filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Model filters' })).toHaveCount(0);
  const navigation = page.getByRole('navigation', { name: 'Chart views' });
  await navigation.getByRole('button', { name: 'Resources', exact: true }).click();
  await navigation.getByRole('button', { name: 'Task time', exact: true }).click();
  await expect(navigation.locator('[aria-current=page]:visible')).toHaveAttribute('aria-controls', 'time-task');
  await expect(page.locator('#cost-intelligence')).toBeHidden();
  await expect(page).toHaveURL(/chart=time-task/);
  await expect.poll(() => page.locator('#time-task').evaluate((section) => Math.round(section.getBoundingClientRect().top))).toBeLessThan(220);
  await expect(page.locator('#time-task').getByRole('button').first()).toBeVisible();
});
