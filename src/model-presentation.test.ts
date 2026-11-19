import { expect, it } from 'vitest';
import { defaultSelected, frontierFamilies } from './model-presentation';
import { curatedSections } from './sidebar-catalogue';

it('keeps unselected Frontier models available in the picker', () => {
  expect(defaultSelected.every((id) => frontierFamilies.includes(id))).toBe(true);
  expect(defaultSelected).toContain('claude-sonnet-5-5');
  expect(defaultSelected).toContain('gemini-4-neon');
  expect(curatedSections[0].items.map((item) => item.family)).toContain('gemini-4-neon');
  for (const id of ['gemini-4-carbon', 'gemini-4-hydrogen', 'grok-4-7', 'muse-wonder-full']) {
    expect(frontierFamilies).toContain(id);
    expect(defaultSelected).not.toContain(id);
  }
});
