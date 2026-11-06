import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
const [axeSource, baseUrl = 'http://127.0.0.1:4493'] = process.argv.slice(2);
if (!axeSource) throw new Error('Pass the local path to axe-core/axe.min.js');
const browser = await chromium.launch({ headless: true });
const results = [];
for (const scenario of [
  { name: 'desktop-overview-light', width: 1280, theme: 'light', path: '/' },
  { name: 'desktop-overview-dark', width: 1280, theme: 'dark', path: '/' },
  { name: 'desktop-bars-light', width: 1280, theme: 'light', path: '/?chart=intelligence' },
  { name: 'desktop-ranking-light', width: 1280, theme: 'light', path: '/?chart=intelligence&bars=false' },
  { name: 'phone-overview-dark', width: 390, theme: 'dark', path: '/' },
  { name: 'phone-ranking-dark', width: 390, theme: 'dark', path: '/?chart=intelligence' },
  { name: 'phone-pricing-light', width: 390, theme: 'light', path: '/', pricing: true },
  { name: 'phone-filters-dark', width: 390, theme: 'dark', path: '/', filters: true },
  { name: 'narrow-subscription-light', width: 320, theme: 'light', path: '/?pricing=subscription' },
]) {
  const page = await browser.newPage({ viewport: { width: scenario.width, height: 844 } });
  await page.route('**/_vercel/**', route => route.fulfill({ status: 204, body: '' }));
  await page.addInitScript(theme => localStorage.setItem('benchmark-theme', theme), scenario.theme);
  await page.goto(baseUrl + scenario.path);
  await page.locator('.chart-section:visible svg[role=group], .chart-section:visible .ranking').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (scenario.filters) await page.getByRole('button', { name: /Models.*Edit selection/ }).click();
  if (scenario.pricing) await page.locator('#cost-intelligence .chart-settings-trigger').click();
  await page.addScriptTag({ path: axeSource });
  const result = await page.evaluate(async () => {
    const { violations, incomplete, passes } = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    const summarize = items => items.map(({ id, impact, description, helpUrl, nodes }) => ({ id, impact, description, helpUrl, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }));
    return { violations: summarize(violations), incomplete: summarize(incomplete), passedRules: passes.length };
  });
  const controlsReferences = await page.locator('[aria-controls]').evaluateAll(elements => elements.map(element => ({ label: element.getAttribute('aria-label') ?? element.textContent.trim(), target: element.getAttribute('aria-controls'), exists: Boolean(document.getElementById(element.getAttribute('aria-controls'))) })));
  results.push({ scenario: scenario.name, controlsReferences, ...result });
  process.stdout.write(JSON.stringify({ scenario: scenario.name, violations: result.violations.map(item => item.id), incomplete: result.incomplete.map(item => item.id) }) + '\n');
  await page.close();
}
await browser.close();
const { version } = JSON.parse(await readFile(join(dirname(axeSource), 'package.json'), 'utf8'));
await writeFile(new URL('./axe-followup.json', import.meta.url), JSON.stringify({ tool: 'axe-core', version, date: new Date().toISOString().slice(0, 10), note: 'Automated browser audit. Not screen-reader testing or conformance certification.', results }, null, 2));
