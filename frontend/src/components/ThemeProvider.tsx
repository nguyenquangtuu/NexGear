'use client';

import * as React from 'react';

type Theme = 'light' | 'dark' | 'system';

type ResolvedTheme = 'light' | 'dark';

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = 'vextro-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  enableSystem = true,
  disableTransitionOnChange = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    const storedTheme = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    return storedTheme ?? defaultTheme;
  });

  const resolvedTheme = React.useMemo<ResolvedTheme>(() => {
    if (theme === 'system') {
      return enableSystem ? getSystemTheme() : defaultTheme === 'dark' ? 'dark' : 'light';
    }

    return theme === 'dark' ? 'dark' : 'light';
  }, [defaultTheme, enableSystem, theme]);

  React.useEffect(() => {
    const root = document.documentElement;

    if (disableTransitionOnChange) {
      root.classList.add('theme-transition-disabled');
      window.setTimeout(() => root.classList.remove('theme-transition-disabled'), 0);
    }

    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [disableTransitionOnChange, resolvedTheme, theme]);

  React.useEffect(() => {
    if (!enableSystem || theme !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const root = document.documentElement;
      const nextTheme: ResolvedTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(nextTheme);
      root.style.colorScheme = nextTheme;
    };

    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [enableSystem, theme]);

  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((currentTheme) => {
      const nextResolved = currentTheme === 'system' ? getSystemTheme() : currentTheme;
      return nextResolved === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [resolvedTheme, setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
