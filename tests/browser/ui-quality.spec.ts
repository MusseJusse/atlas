import { expect, test } from '@playwright/test';

test('every chart is discoverable by keyboard and exactly one chart stays visible', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/_vercel/**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Chart views' });
  const choices = await navigation.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-controls')!));
  expect(choices).toHaveLength(7);
  for (const id of choices) {
    const button = navigation.locator(`button[aria-controls="${id}"]:visible`);
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.chart-section:visible')).toHaveCount(1);
    const section = page.locator(`#${id}`);
    await expect(section.locator('svg[role=group], .measurement-table').first()).toBeVisible();
    await button.focus();
    await expect(button).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('broad ranking selection retains every measured row in a readable table', async ({ page }) => {
  await page.goto('/?chart=intelligence');
  await page.getByRole('button', { name: 'Select all', exact: true }).first().click();
  const ranking = page.locator('#intelligence');
  await expect(ranking).toContainText(/Showing \d+ configurations as a table/);
  const count = Number((await ranking.innerText()).match(/Showing (\d+) configurations/)![1]);
  await expect(ranking.locator('tbody tr')).toHaveCount(count);
  expect(count).toBeGreaterThan(60);
  await expect(ranking.getByRole('columnheader', { name: 'Reasoning', exact: true })).toBeVisible();
});

test('mobile efficiency puts the heading and chart before optional details without blank space', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?page=efficiency');
  await expect(page.locator('.efficiency-plot svg')).toBeVisible();
  const positions = await page.evaluate(() => ({
    title: document.querySelector('h1')!.getBoundingClientRect().top,
    filters: document.querySelector('.efficiency-filters')!.getBoundingClientRect().top,
    plot: document.querySelector('.efficiency-plot')!.getBoundingClientRect().top,
    details: document.querySelector('.efficiency-details-slot')!.getBoundingClientRect().height,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  expect(positions.title).toBeLessThan(positions.filters);
  expect(positions.plot).toBeLessThan(400);
  expect(positions.details).toBe(0);
  expect(positions.overflow).toBe(false);
});

test('phone pages and expanded changelog values fit a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ['/', '/?chart=intelligence', '/?page=efficiency', '/?page=changelog']) {
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible();
    if (path.includes('changelog')) {
      await page.getByText(/View \d+ changed values?/).first().click();
      await expect(page.getByRole('columnheader', { name: 'Before', exact: true }).first()).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});


test('phone intelligence and cost tables match grouped sort controls in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [chart, defaultDescending] of [['intelligence', true], ['cost-task', false]] as const) {
    await page.goto(`/?chart=${chart}`);
    await page.getByRole('button', { name: /Models.*Edit selection/ }).click();
    await page.getByRole('button', { name: 'Select all', exact: true }).first().click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    const ranking = page.locator(`#${chart}`);
    await expect(ranking).toContainText('Compare every measured configuration in the table.');
    await expect(ranking).not.toContainText('Expand a model');
    const valuesByModel = () => ranking.locator('tbody tr').evaluateAll((rows) => {
      const groups = new Map<string, number[]>();
      for (const row of rows) {
        const name = row.querySelector('th')!.textContent!;
        const value = Number(row.querySelectorAll('td')[1]!.textContent!.replace(/[$,]/g, ''));
        const values = groups.get(name) ?? [];
        values.push(value);
        groups.set(name, values);
      }
      return [...groups.values()];
    });
    const assertOrder = (groups: number[][], descending: boolean) => {
      const compare = (a: number, b: number) => (a - b) * (descending ? -1 : 1);
      const best = groups.map((values) => descending ? Math.max(...values) : Math.min(...values));
      expect(best).toEqual(best.toSorted(compare));
      for (const values of groups) expect(values).toEqual(values.toSorted(compare));
    };
    assertOrder(await valuesByModel(), defaultDescending);
    await ranking.locator('summary[aria-label="Chart settings"]').click();
    const initialLabel = defaultDescending ? 'Highest first per model' : 'Lowest first per model';
    await expect(ranking.getByRole('button', { name: initialLabel, exact: true })).toBeVisible();
    await ranking.getByRole('button', { name: initialLabel, exact: true }).click();
    assertOrder(await valuesByModel(), !defaultDescending);
  }
});


test('phone chart categories expose every choice without overflow or a dropdown', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Chart views' });
  await expect(navigation.locator('select')).toHaveCount(0);
  for (const [category, ids] of [
    ['Scores', ['intelligence', 'omniscience']],
    ['Resources', ['tokens-task', 'tokens-total', 'cost-task', 'time-task']],
  ] as const) {
    await navigation.getByRole('button', { name: category, exact: true }).click();
    for (const id of ids) {
      const choice = navigation.locator(`button[aria-controls="${id}"]:visible`);
      await choice.click();
      await expect(choice).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('.chart-section:visible')).toHaveCount(1);
      const bounds = await choice.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await navigation.getByRole('button', { name: 'Scores', exact: true }).click();
  await navigation.getByRole('button', { name: 'Omniscience', exact: true }).click();
  await navigation.getByRole('button', { name: 'Scores', exact: true }).click();
  await expect(navigation.getByRole('button', { name: 'Omniscience', exact: true })).toHaveAttribute('aria-current', 'page');
});
