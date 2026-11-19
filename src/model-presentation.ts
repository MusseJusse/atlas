import type { Model } from './data/schema';

export const frontierFamilies = [
  'gpt-6-2-astra',
  'gpt-6-2-sol',
  'gpt-6-1-terra',
  'gpt-6-luna',
  'claude-haiku-5-5',
  'claude-sonnet-5-5',
  'claude-opus-5-5',
  'claude-fable-5-2',
  'gemini-4-neon',
  'gemini-4-carbon',
  'gemini-4-hydrogen',
  'grok-4-7',
  'muse-wonder-full',
];
export const notableFamilies = [
  'glm-5-3-flash',
  'deepseek-v4-1-flash-1017',
  'kimi-k3-1-pro',
  'qwen3-8-max-0902',
  'qwen4-max',
  'qwen3-8-27b',
];
// These Frontier models load unselected.
const defaultOff = new Set([
  'gemini-4-carbon',
  'gemini-4-hydrogen',
  'grok-4-7',
  'muse-wonder-full',
]);
export const defaultSelected = frontierFamilies.filter((id) => !defaultOff.has(id));
// Each lab's ramp gives its flagship the most contrast: darkest in light mode, lightest in dark mode.
// The OpenAI graphite stops short of white in dark mode so it doesn't outweigh other labs.
const colors: Record<string, [string, string]> = {
  'gpt-6-2-astra': ['#2c343d', '#c3cbd7'],
  'gpt-6-2-sol': ['#4b5868', '#a9b4c3'],
  'gpt-6-1-terra': ['#637184', '#929eb2'],
  'gpt-6-astra': ['#2c343d', '#c3cbd7'],
  'gpt-6-1-sol': ['#4b5868', '#a9b4c3'],
  'gpt-6-1-sol-ultrafast': ['#4b5868', '#a9b4c3'],
  'gpt-6-luna': ['#7e8b9c', '#7d8a9e'],
  'claude-opus-5-5': ['#ae5235', '#df9477'],
  'claude-fable-5-1': ['#903e2b', '#f0b99f'],
  'claude-fable-5-2': ['#903e2b', '#f0b99f'],
  'claude-sonnet-5-5': ['#bd6948', '#cc785c'],
  'claude-haiku-5-5': ['#c4805f', '#a87a66'],
  'gemini-4-neon': ['#1b6e3c', '#7ddb9f'],
  'gemini-4-carbon': ['#2c8b4f', '#52bd7a'],
  'gemini-4-hydrogen': ['#3d9e62', '#3b9a5f'],
  'gemini-4-argon': ['#218347', '#56ca80'],
  'gemini-3-8-flash': ['#247a3c', '#34a853'],
  'grok-4-7': ['#6d55bd', '#9b94ee'],
  'muse-wonder-full': ['#1d5aa8', '#4b96ff'],
  'muse-wonder': ['#3f7fc8', '#94c4ff'],
  'muse-spark-1-3': ['#236bbd', '#5ea4ff'],
  'kimi-k3': ['#ab3f83', '#ee86c4'],
  'glm-5-3': ['#8e7318', '#ecd36e'],
  'glm-5-3-flash': ['#7c6b2e', '#b9a453'],
  'deepseek-v4-pro': ['#157d83', '#52cdd2'],
  'deepseek-v4-1-flash': ['#216b70', '#33979c'],
  'mimo-v2-6-pro': ['#b85212', '#ff8b45'],
};
const labColors: Record<string, [string, string]> = {
  openai: ['#2c343d', '#c3cbd7'],
  anthropic: ['#ae5235', '#df9477'],
  google: ['#218347', '#56ca80'],
  xai: ['#6d55bd', '#9b94ee'],
  meta: ['#236bbd', '#5ea4ff'],
  kimi: ['#ab3f83', '#ee86c4'],
  zai: ['#8e7318', '#ecd36e'],
  deepseek: ['#157d83', '#52cdd2'],
  xiaomi: ['#b85212', '#ff8b45'],
};
export function modelColor(model: Model) {
  const [light, dark] = colors[model.family] ?? labColors[model.lab] ?? ['#637082', '#a4adb9'];
  return `light-dark(${light}, ${dark})`;
}
export function shortName(model: Model) {
  return model.name.replace(/^Claude /, '');
}

/** Pick label text against the translucent bar composited over each theme's chart panel. */
export function barLabelColor(model: Model, opacity: number) {
  const [light, dark] = colors[model.family] ?? labColors[model.lab] ?? ['#637082', '#a4adb9'];
  function luminance(color: string, panel: string, alpha: number) {
    return [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
      const offset = index * 2 + 1;
      const foreground = Number.parseInt(color.slice(offset, offset + 2), 16);
      const background = Number.parseInt(panel.slice(offset, offset + 2), 16);
      const channel = (foreground * alpha + background * (1 - alpha)) / 255;
      return sum + weight * (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    }, 0);
  }
  function textColor(color: string, panel: string) {
    const background = luminance(color, panel, opacity);
    const whiteContrast = 1.05 / (background + 0.05);
    const darkContrast = (background + 0.05) / (luminance('#17213a', panel, 1) + 0.05);
    return whiteContrast > darkContrast ? '#ffffff' : '#17213a';
  }
  return `light-dark(${textColor(light, '#ffffff')}, ${textColor(dark, '#1b273b')})`;
}
