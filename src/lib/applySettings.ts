export type ClientSettings = {
  music: number;
  sfx: number;
  theme: 'dark' | 'light';
  notesDefault: boolean;
  leftHanded: boolean;
  colourBlind: boolean;
  largeCells: boolean;
};

const KEY = 'stellarsudoku.settings.v1';

export const defaultSettings = (): ClientSettings => ({
  music: 0,
  sfx: 0,
  theme: 'dark',
  notesDefault: false,
  leftHanded: false,
  colourBlind: false,
  largeCells: false,
});

export function mergeSettings(partial?: Partial<ClientSettings> | null): ClientSettings {
  return { ...defaultSettings(), ...partial };
}

export function applyClientSettings(partial?: Partial<ClientSettings> | null): ClientSettings {
  const s = mergeSettings(partial);
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.dataset.cb = s.colourBlind ? 'on' : 'off';
  document.documentElement.dataset.large = s.largeCells ? 'on' : 'off';
  return s;
}

export function loadLocalSettings(): ClientSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings();
    return mergeSettings(JSON.parse(raw) as Partial<ClientSettings>);
  } catch {
    return defaultSettings();
  }
}

export function saveLocalSettings(partial: Partial<ClientSettings>): ClientSettings {
  const next = mergeSettings({ ...loadLocalSettings(), ...partial });
  localStorage.setItem(KEY, JSON.stringify(next));
  return applyClientSettings(next);
}
