import { expect, it } from 'vitest';
import { defaultSelected, frontierFamilies } from './model-presentation';

it('keeps unselected Frontier models available in the picker', () => {
  expect(defaultSelected.every((id) => frontierFamilies.includes(id))).toBe(true);
  expect(defaultSelected).toContain('claude-sonnet-5-5');
  for (const id of ['gemini-4-carbon', 'gemini-4-hydrogen', 'grok-4-7', 'muse-wonder-full']) {
    expect(frontierFamilies).toContain(id);
    expect(defaultSelected).not.toContain(id);
  }
});
