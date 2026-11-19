import { describe, expect, it } from 'vitest';
import snapshot from 'virtual:benchmarks';
import { resolveVibes, useCaseRecommendations, vibeModels } from './vibes';

describe('vibes recommendations data', () => {
  it('resolves every vibe model and use-case recommendation from the benchmark snapshot', () => {
    const resolved = resolveVibes(snapshot.models);
    expect(resolved.models.map((entry) => entry.family)).toEqual(vibeModels.map((entry) => entry.family));
    expect(resolved.recommendations.map((item) => item.id)).toEqual(
      useCaseRecommendations.map((item) => item.id),
    );
  });

  it('excludes Muse models and keeps all coordinates within 0-100', () => {
    const resolved = resolveVibes(snapshot.models);
    expect(resolved.models.some((entry) => entry.family.includes('muse'))).toBe(false);
    expect(resolved.models.map((entry) => entry.family)).toEqual([
      'claude-fable-5-2',
      'gpt-6-2-astra',
      'claude-opus-5-5',
      'gpt-6-2-sol',
      'gemini-4-neon',
      'gemini-4-carbon',
      'gpt-6-1-terra',
    ]);
    for (const entry of resolved.models) {
      expect(entry.capability).toBeGreaterThanOrEqual(0);
      expect(entry.capability).toBeLessThanOrEqual(100);
      expect(entry.coherency).toBeGreaterThanOrEqual(0);
      expect(entry.coherency).toBeLessThanOrEqual(100);
    }
    const astra = resolved.byFamily.get('gpt-6-2-astra')!;
    const terra = resolved.byFamily.get('gpt-6-1-terra')!;
    const sol = resolved.byFamily.get('gpt-6-2-sol')!;
    expect(terra.coherency).toBeGreaterThan(astra.coherency);
    expect(terra.coherency).toBeLessThan(sol.coherency);
  });

  it('requires the high-effort Intelligence Index and cost record for every model', () => {
    const resolved = resolveVibes(snapshot.models);
    for (const entry of resolved.models) {
      const high = snapshot.models.find((model) => model.family === entry.family && model.effort === 'high');
      expect(high).toBeDefined();
      expect(entry.model.id).toBe(high!.id);
      expect(entry.model.effort).toBe('high');
      expect(entry.model.intelligence).toBe(high!.intelligence);
      expect(entry.model.cost).toBe(high!.cost);
    }

    const withoutTerraHigh = snapshot.models.filter(
      (model) => !(model.family === 'gpt-6-1-terra' && model.effort === 'high'),
    );
    expect(() => resolveVibes(withoutTerraHigh)).toThrow(/gpt-6-1-terra.*high-effort/i);
  });

  it('maps each personal use case to the expected model family', () => {
    const resolved = resolveVibes(snapshot.models);
    const byId = new Map(resolved.recommendations.map((item) => [item.id, item.entry.family]));
    expect(byId.get('coding')).toBe('claude-opus-5-5');
    expect(byId.get('copywriting')).toBe('gemini-4-neon');
    expect(byId.get('digging-deep')).toBe('gpt-6-2-sol');
    expect(byId.get('cheap-and-cheerful')).toBe('gpt-6-1-terra');
    expect(byId.get('computer-use')).toBe('gpt-6-2-sol');
  });
});
