import { expect, test } from '@playwright/test';

test('every chart is discoverable by keyboard and exactly one chart stays visible', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/_vercel/**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/');
  const picker = page.getByRole('combobox', { name: 'Chart', exact: true });
  const choices = await picker.locator('option').evaluateAll((options) => options.map((option) => option.getAttribute('value')!));
  expect(choices).toHaveLength(7);
  for (const id of choices) {
    await picker.selectOption(id);
    await expect(page.locator('.chart-section:visible')).toHaveCount(1);
    const section = page.locator(`#${id}`);
    await expect(section.locator('svg[role=group], .measurement-table').first()).toBeVisible();
  }
  await picker.focus();
  await expect(picker).toBeFocused();
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


test('phone dense tables match their order control and show table-specific guidance', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?chart=intelligence');
  await page.getByRole('button', { name: /Models.*Edit selection/ }).click();
  await page.getByRole('button', { name: 'Select all', exact: true }).first().click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const ranking = page.locator('#intelligence');
  await expect(ranking).toContainText('Compare every measured configuration in the table.');
  await expect(ranking).not.toContainText('Expand a model');
  const maximums = () => ranking.locator('tbody tr').evaluateAll((rows) => {
    const groups = new Map<string, number>();
    for (const row of rows) {
      const name = row.querySelector('th')!.textContent!;
      const value = Number(row.querySelectorAll('td')[1]!.textContent);
      groups.set(name, Math.max(groups.get(name) ?? -Infinity, value));
    }
    return [...groups.values()];
  });
  const initial = await maximums();
  expect(initial).toEqual(initial.toSorted((a, b) => b - a));
  await ranking.locator('summary[aria-label="Chart settings"]').click();
  await expect(ranking.getByRole('button', { name: 'Highest first', exact: true })).toBeVisible();
  await ranking.getByRole('button', { name: 'Highest first', exact: true }).click();
  await expect(ranking.getByRole('button', { name: 'Lowest first', exact: true })).toBeVisible();
  const reversed = await maximums();
  expect(reversed).toEqual(reversed.toSorted((a, b) => a - b));
});
