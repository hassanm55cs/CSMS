import { createContext, useContext, useEffect, useState } from 'react';
import type { Lang, PaletteId } from '../types';

export interface PaletteOption {
  id: PaletteId;
  name: string;
  description: string;
  swatches: [string, string, string]; // [primary, accent, surface]
}

export const PALETTES: PaletteOption[] = [
  {
    id: 'slate-cobalt',
    name: 'Precision Cobalt',
    description: 'Alabaster & deep cobalt blue',
    swatches: ['#1D4ED8', '#0F766E', '#F6F7F9'],
  },
  {
    id: 'british-racing',
    name: 'Racing Green',
    description: 'Warm stone & heritage forest',
    swatches: ['#1B5E3F', '#8C6239', '#F7F6F2'],
  },
  {
    id: 'graphite-amber',
    name: 'Workshop Amber',
    description: 'Warm zinc & burnt copper',
    swatches: ['#C2410C', '#334155', '#F8F7F5'],
  },
  {
    id: 'nordic-teal',
    name: 'Nordic Petrol',
    description: 'Cool mist & petrol teal',
    swatches: ['#0F6E6E', '#3B5B78', '#F4F7F7'],
  },
  {
    id: 'monochrome-crimson',
    name: 'Carbon Crimson',
    description: 'Studio carbon & motorsport red',
    swatches: ['#B91C1C', '#3F3F46', '#F7F7F8'],
  },
];

const PALETTE_STORAGE_KEY = 'csms-palette';
const THEME_STORAGE_KEY = 'csms-theme';
const VALID_PALETTES = new Set<PaletteId>(PALETTES.map(p => p.id));

function readStoredPalette(): PaletteId {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY) as PaletteId | null;
    return saved && VALID_PALETTES.has(saved) ? saved : 'slate-cobalt';
  } catch {
    return 'slate-cobalt';
  }
}

interface ThemeCtxValue {
  dark: boolean;
  toggleDark: () => void;
  lang: Lang;
  toggleLang: () => void;
  palette: PaletteId;
  setPalette: (palette: PaletteId) => void;
}

const ThemeCtx = createContext<ThemeCtxValue>({
  dark: false,
  toggleDark: () => {},
  lang: 'en',
  toggleLang: () => {},
  palette: 'slate-cobalt',
  setPalette: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  const [lang, setLang] = useState<Lang>('en');
  const [palette, setPaletteState] = useState<PaletteId>(readStoredPalette);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [dark]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    try { localStorage.setItem(PALETTE_STORAGE_KEY, palette); } catch { /* ignore */ }
  }, [palette]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <ThemeCtx.Provider
      value={{
        dark,
        toggleDark: () => setDark(d => !d),
        lang,
        toggleLang: () => setLang(l => (l === 'en' ? 'ar' : 'en')),
        palette,
        setPalette: (next) => {
          if (VALID_PALETTES.has(next)) setPaletteState(next);
        },
      }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeCtx);
}
