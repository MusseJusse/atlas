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
    await expect(section.locator('svg[role=group], .ranking').first()).toBeVisible();
    await button.focus();
    await expect(button).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('broad ranking selection keeps every configuration plotted with optional exact data', async ({ page }) => {
  await page.goto('/?chart=intelligence');
  await page.getByRole('button', { name: 'Select all', exact: true }).first().click();
  const ranking = page.locator('#intelligence');
  await expect(ranking.locator('.ranking')).toBeVisible();
  await expect(page.locator('.chart-scroll-cue')).toBeVisible();
  expect(await ranking.locator('.ranking-rows').evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  const dots = await ranking.locator('[data-configuration]').count();
  expect(dots).toBeGreaterThan(60);
  await expect(ranking.locator('.measurement-table')).not.toBeVisible();
  await ranking.locator('.measurement-disclosure summary').click();
  await expect(ranking.locator('tbody tr')).toHaveCount(dots);

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


test('phone intelligence and cost charts match exact data and grouped sort controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [chart, defaultDescending] of [['intelligence', true], ['cost-task', false]] as const) {
    await page.goto(`/?chart=${chart}`);
    await page.getByRole('button', { name: /Models.*Edit selection/ }).click();
    await page.getByRole('button', { name: 'Select all', exact: true }).first().click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    const ranking = page.locator(`#${chart}`);
    await expect(ranking.locator('.ranking')).toBeVisible();
    await ranking.locator('.measurement-disclosure summary').click();
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
    const chartValues = () => ranking.locator('.ranking-row').evaluateAll((buttons) => buttons.map((button) => Number(button.getAttribute('data-best-value'))));
    const initialValues = await chartValues();
    expect(initialValues).toEqual(initialValues.toSorted((a, b) => (a - b) * (defaultDescending ? -1 : 1)));
    assertOrder(await valuesByModel(), defaultDescending);
    await ranking.locator('summary[aria-label="Chart settings"]').click();
    const initialLabel = defaultDescending ? 'Highest first per model' : 'Lowest first per model';
    await expect(ranking.getByRole('button', { name: initialLabel, exact: true })).toBeVisible();
    await ranking.getByRole('button', { name: initialLabel, exact: true }).click();
    assertOrder(await valuesByModel(), !defaultDescending);
    const reversed = await chartValues();
    expect(reversed).toEqual(reversed.toSorted((a, b) => (a - b) * (defaultDescending ? 1 : -1)));
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


test('low subscription price ticks are distinct and have room for their precision', async ({ page }) => {
  await page.goto('/?pricing=subscription');
  await expect(page.locator('#cost-intelligence svg[role=group]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const labels = await page.locator('#cost-intelligence svg g[transform] text[y="26"]').evaluateAll((elements) =>
    elements.map((element) => ({ text: element.textContent, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right })),
  );
  expect(labels.length).toBeGreaterThan(3);
  expect(new Set(labels.map((label) => label.text)).size).toBe(labels.length);
  expect(labels.some((label) => label.text === '$0.0005')).toBe(true);
  for (let index = 1; index < labels.length; index++) expect(labels[index]!.left - labels[index - 1]!.right).toBeGreaterThanOrEqual(4);
});


test('efficiency line patterns identify thresholds without depending only on color', async ({ page }) => {
  await page.goto('/?page=efficiency');
  await expect(page.locator('.efficiency-plot svg[role=group]')).toBeVisible();
  const legends = await page.locator('.efficiency-thresholds label').evaluateAll((labels) => labels.map((label) => ({
    threshold: label.querySelector('input')!.getAttribute('aria-label')!.match(/(\d+)$/)![1],
    pattern: label.querySelector('line')!.getAttribute('stroke-dasharray') ?? 'solid',
  })));
  expect(new Set(legends.map((legend) => legend.pattern)).size).toBe(6);
  const plotted = await page.locator('.efficiency-plot svg > g > path').evaluateAll((paths) => paths.map((path) => path.getAttribute('stroke-dasharray') ?? 'solid'));
  expect(plotted).toEqual(legends.map((legend) => legend.pattern));
});


test('Pareto frontier leaves selected model names and controls fully opaque', async ({ page }) => {
  await page.goto('/?frontier=true');
  await expect(page.getByRole('button', { name: 'Pareto Frontier', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Pareto Frontier', exact: true })).toHaveAttribute('title', 'Pareto Frontier connects configurations with no better and cheaper alternative.');
  const rows = page.locator('#model-filters button[title$="configurations"][aria-pressed="true"]');
  expect(await rows.count()).toBeGreaterThan(1);
  const opacity = await rows.evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).opacity));
  expect(opacity.every((value) => value === '1')).toBe(true);
});


test('desktop chart navigation fits at the compact layout boundary', async ({ page }) => {
  for (const width of [901, 920, 940, 960, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const navigation = page.getByRole('navigation', { name: 'Chart views' });
    await expect(navigation.getByRole('button')).toHaveCount(7);
    const bounds = await navigation.boundingBox();
    const buttons = await navigation.getByRole('button').evaluateAll((elements) => elements.map((element) => ({
      left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right,
    })));
    for (const button of buttons) {
      expect(button.left).toBeGreaterThanOrEqual(bounds!.x - 0.5);
      expect(button.right).toBeLessThanOrEqual(bounds!.x + bounds!.width + 0.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('Task tokens switches between scatter and a graphical ranking', async ({ page }) => {
  await page.goto('/?chart=tokens-task&scatter=true');
  const type = page.getByRole('group', { name: 'Tokens per task view type' });
  await type.getByRole('button', { name: 'Rankings', exact: true }).click();
  await expect(type.getByRole('button', { name: 'Rankings', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#tokens-task .ranking')).toBeVisible();
  await expect(page.locator('#tokens-task .measurement-table')).not.toBeVisible();
  await expect(page.locator('#tokens-task svg[role=group]')).toHaveCount(0);
});

test('phone range rows show an expansion indicator and reveal reasoning values', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?chart=intelligence&selected=gpt-6-1-sol');
  const row = page.locator('#intelligence button[aria-expanded]').first();
  await expect(row.locator('[data-expand-indicator]')).toBeVisible();
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`#${await row.getAttribute('aria-controls')}`)).toBeVisible();
});


test('ranking expansion and configuration details work entirely from the keyboard', async ({ page }) => {
  await page.goto('/?chart=omniscience');
  const ranking = page.locator('#omniscience .ranking');
  const first = ranking.locator('.ranking-row').first();
  await expect(first).toHaveAccessibleName(/rank 1, AA-Omniscience Index.*Highest.*configurations, range.*Show configurations/);
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  const configuration = ranking.locator('.ranking-configurations button').first();
  await page.keyboard.press('Tab');
  await expect(configuration).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(ranking.getByRole('complementary', { name: 'Selected configuration' })).toBeVisible();
  await ranking.getByRole('button', { name: 'Clear selected configuration' }).click();
  await expect(configuration).toBeFocused();
  await expect(configuration).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Enter');
  const close = ranking.getByRole('button', { name: 'Clear selected configuration' });
  await close.focus();
  await page.keyboard.press('Escape');
  await expect(configuration).toBeFocused();
  await expect(configuration).toHaveAttribute('aria-pressed', 'false');
  await expect(ranking.getByRole('complementary', { name: 'Selected configuration' })).toHaveCount(0);
  const signed = await ranking.locator('[data-configuration]').evaluateAll((dots) => dots.map((dot) => Number.parseFloat((dot as HTMLElement).style.left)));
  expect(signed.every((position) => position >= 0 && position <= 100)).toBe(true);
  await expect(ranking.locator('.ranking-ticks')).toContainText('-');
});


test('cost scale changes retain exact measurements and the compact scatter keeps named models', async ({ page }) => {
  await page.goto('/?chart=cost-task');
  const chart = page.locator('#cost-task');
  const scale = chart.getByRole('group', { name: 'Cost per task axis scale' });
  await expect(scale.getByRole('button', { name: 'Log', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const ids = await chart.locator('[data-configuration]').evaluateAll((dots) => dots.map((dot) => dot.getAttribute('data-configuration')));
  await scale.getByRole('button', { name: 'Linear', exact: true }).click();
  expect(await chart.locator('[data-configuration]').evaluateAll((dots) => dots.map((dot) => dot.getAttribute('data-configuration')))).toEqual(ids);
  await page.setViewportSize({ width: 901, height: 900 });
  await page.goto('/');
  const overview = page.locator('#cost-intelligence');
  const legend = overview.locator('.scatter-legend');
  const selectedNames = await page.locator('#model-filters button[title$="configurations"][aria-pressed="true"]').allTextContents();
  expect(selectedNames).toHaveLength(7);
  await expect(legend.getByRole('button')).toHaveCount(selectedNames.length);
  for (const name of selectedNames) await expect(legend.getByRole('button', { name: name.trim(), exact: true })).toBeInViewport({ ratio: 1 });
  await expect(overview.locator('.measurement-disclosure summary')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.chart-scroll-cue')).toHaveCount(0);
  await overview.locator('summary[aria-label="Chart settings"]').click();
  await expect(overview.getByRole('button', { name: 'Model labels', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(overview.getByRole('button', { name: 'Model labels', exact: true })).toBeVisible();
  await overview.getByRole('button', { name: 'Model labels', exact: true }).click();
  await expect(overview.locator('svg[role=group]').getByText('GPT-6.1 Sol', { exact: true })).toHaveCount(0);
});


test('compact scatter uses readable plot dimensions without scaling its axis text', async ({ page }) => {
  for (const [width, minimumHeight] of [[901, 360], [390, 320], [320, 320]]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const svg = page.locator('#cost-intelligence svg[role=group]');
    await expect(svg).toBeVisible();
    await expect.poll(() => svg.evaluate((element) => (element as SVGSVGElement).getScreenCTM()!.a)).toBeCloseTo(1, 2);
    expect((await svg.boundingBox())!.height).toBeGreaterThanOrEqual(minimumHeight - 1);
    expect(await svg.locator('text').first().evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(12);
  }
});


test('time estimates retain their parent model count and identify the derived endpoint', async ({ page }) => {
  await page.goto('/?chart=time-task&selected=gpt-6-1-sol');
  const chart = page.locator('#time-task');
  await expect(chart.locator('.measurement-disclosure summary')).toContainText('1 model with data · 2 series');
  const endpoint = chart.locator('.ranking-row').filter({ hasText: 'GPT-6.1 Sol Ultrafast' });
  await expect(endpoint).toContainText('Estimated speed endpoint');
  await expect(endpoint).toHaveAccessibleName(/Lowest estimated/);
  await chart.locator('.measurement-disclosure summary').click();
  await expect(chart.getByRole('row', { name: /GPT-6.1 Sol Ultrafast Estimated speed endpoint/ })).toBeVisible();
});


test('close ranking configurations stay on their range line on phones and desktop', async ({ page }) => {
  for (const width of [393, 320, 1280]) {
    await page.setViewportSize({ width, height: 852 });
    for (const chart of ['intelligence', 'omniscience']) {
      await page.goto(`/?chart=${chart}`);
      const section = page.locator(`#${chart}`);
      const astra = section.locator('.ranking-model').filter({ has: page.locator('.ranking-row', { hasText: 'GPT-6 Astra' }) });
      await expect(astra.locator('.ranking-row')).toBeVisible();
      if (width === 393) await expect(astra.locator('.ranking-value')).toContainText('overlap');
      const geometry = await section.locator('.ranking-model').evaluateAll((models) => models.map((model) => {
        const line = model.querySelector('.ranking-range')!.getBoundingClientRect();
        return [...model.querySelectorAll('.ranking-dot')].map((dot) => {
          const box = dot.getBoundingClientRect();
          return Math.abs(box.top + box.height / 2 - line.top - line.height / 2);
        });
      }));
      expect(geometry.flat().every((distance) => distance < 0.1)).toBe(true);
      const count = await section.locator('[data-configuration]').count();
      await astra.locator('.ranking-row').click();
      await expect(astra.locator('.ranking-configurations button')).toHaveCount(4);
      await section.locator('.measurement-disclosure summary').click();
      await expect(section.locator('tbody tr')).toHaveCount(count);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
