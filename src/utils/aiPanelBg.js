/** Quiet studio skins for the in-chat QuantumAI side panel (not app fun themes). */
export const AI_BG_STORAGE_KEY = 'qc-ai-panel-bg';

export const AI_BG_THEMES = [
  { id: 'studio', label: 'Studio' },
  { id: 'graphite', label: 'Graphite' },
  { id: 'vellum', label: 'Vellum' },
  { id: 'glacier', label: 'Glacier' },
  { id: 'cedar', label: 'Cedar' },
  { id: 'inkwell', label: 'Inkwell' },
];

export function readStoredAiBg() {
  try {
    const stored = localStorage.getItem(AI_BG_STORAGE_KEY);
    if (AI_BG_THEMES.some((t) => t.id === stored)) return stored;
  } catch {
    // ignore
  }
  return 'studio';
}

export function writeStoredAiBg(id) {
  try {
    if (AI_BG_THEMES.some((t) => t.id === id)) {
      localStorage.setItem(AI_BG_STORAGE_KEY, id);
    }
  } catch {
    // ignore
  }
}
