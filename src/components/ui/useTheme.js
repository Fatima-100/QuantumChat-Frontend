import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'qc-theme';

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function readStoredTheme() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Reads/writes the `data-theme` attribute that theme.css keys off of,
 * persists the choice, and follows the OS preference until the user
 * picks explicitly.
 *
 * const { theme, toggleTheme, setTheme } = useTheme();
 */
export default function useTheme() {
  const [theme, setThemeState] = useState(() => readStoredTheme() || getSystemTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (readStoredTheme()) return undefined; // user already made an explicit choice
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e) => setThemeState(e.matches ? 'light' : 'dark');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
