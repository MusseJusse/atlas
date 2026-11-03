import { expect, it } from 'vitest';
import { families, frontierFamilies, notableFamilies } from './models';
import { browseFamilies, curatedSections, selectedOtherFamilies } from './sidebar-catalogue';

it('preserves curated order and keeps every other family in lab and release order', () => {
  expect(curatedSections.map((section) => section.name)).toEqual(['Frontier', 'Notable']);
  for (const [index, ids] of [frontierFamilies, notableFamilies].entries()) {
    expect(curatedSections[index]!.items.map((family) => family.family)).toEqual(
      ids.filter((id) => families.some((family) => family.family === id)),
    );
  }
  const curated = curatedSections.flatMap((section) => section.items);
  const others = browseFamilies([], true, true);
  expect(new Set([...curated, ...others])).toEqual(new Set(families));
  expect(others.some((family) => curated.includes(family))).toBe(false);
  for (const [index, family] of others.entries()) {
    const previous = others[index - 1];
    if (!previous) continue;
    expect(previous.model.labName.localeCompare(family.model.labName)).toBeLessThanOrEqual(0);
    if (previous.model.labName === family.model.labName) {
      expect((previous.model.released ?? '').localeCompare(family.model.released ?? ''))
        .toBeGreaterThanOrEqual(0);
    }
  }
});

it('requires the matching browse toggles for unselected open and older families', () => {
  const all = browseFamilies([], true, true);
  expect(all.some((family) => family.model.open)).toBe(true);
  expect(all.some((family) => family.model.deprecated)).toBe(true);
  for (const showOpen of [false, true]) {
    for (const showOlder of [false, true]) {
      const visible = browseFamilies([], showOpen, showOlder);
      for (const family of all) {
        if (family.model.open && !showOpen) expect(visible).not.toContain(family);
        else if (family.model.deprecated && !showOlder) expect(visible).not.toContain(family);
        else expect(visible).toContain(family);
      }
    }
  }
});

it('keeps selected families visible with either toggle off and filters them after deselection', () => {
  const all = browseFamilies([], true, true);
  const selected = all.map((family) => family.family);
  for (const showOpen of [false, true]) {
    for (const showOlder of [false, true]) {
      expect(browseFamilies(selected, showOpen, showOlder)).toEqual(all);
    }
  }
  for (const family of all.filter((family) => family.model.open || family.model.deprecated)) {
    expect(browseFamilies([family.family], false, false)).toContain(family);
    expect(browseFamilies([], false, false)).not.toContain(family);
  }
});

it('returns only selected non-curated families for the Other section', () => {
  const other = browseFamilies([], true, true)[0]!;
  expect(selectedOtherFamilies([])).toEqual([]);
  expect(selectedOtherFamilies([frontierFamilies[0]!, other.family])).toEqual([other]);
  expect(selectedOtherFamilies([frontierFamilies[0]!])).toEqual([]);
});
