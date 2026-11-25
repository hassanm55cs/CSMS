import { useTheme } from '../context/ThemeContext';
import { T } from './translations';

export function useT() {
  const { lang } = useTheme();
  return T[lang];
}
