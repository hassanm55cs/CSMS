import { createContext, useContext, useEffect, useState } from 'react';
import type { Lang } from '../types';

interface ThemeCtxValue {
  dark: boolean; toggleDark: () => void;
  lang: Lang;    toggleLang: () => void;
}

const ThemeCtx = createContext<ThemeCtxValue>({
  dark: false, toggleDark: () => {}, lang: 'en', toggleLang: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <ThemeCtx.Provider value={{
      dark, toggleDark: () => setDark(d => !d),
      lang, toggleLang: () => setLang(l => l === 'en' ? 'ar' : 'en'),
    }}>
      {children}
    </ThemeCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeCtx);
}
