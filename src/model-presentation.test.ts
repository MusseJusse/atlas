import { expect, it } from 'vitest';
import { defaultSelected, frontierFamilies } from './model-presentation';

it('keeps Frontier pickers complete while loading Gemini, Grok and Muse unselected', () => {
  expect(defaultSelected.every((id) => frontierFamilies.includes(id))).toBe(true);
  for (const id of ['claude-sonnet-5-5', 'gemini-4-carbon', 'gemini-4-argon', 'grok-4-7', 'muse-wonder-full']) {
    expect(frontierFamilies).toContain(id);
    expect(defaultSelected).not.toContain(id);
  }
});
