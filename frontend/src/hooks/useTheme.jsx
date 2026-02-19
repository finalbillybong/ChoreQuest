import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const ThemeContext = createContext(null);

export const COLOR_THEMES = [
  // ── Boy themes ──
  { id: 'default',  label: 'Quest Blue',        group: 'boy',  accent: '#3b82f6', secondary: '#60a5fa', tertiary: '#f59e0b' },
  { id: 'dragon',   label: 'Dragon Fire',       group: 'boy',  accent: '#ef4444', secondary: '#f87171', tertiary: '#f59e0b' },
  { id: 'forest',   label: 'Enchanted Forest',  group: 'boy',  accent: '#10b981', secondary: '#34d399', tertiary: '#f59e0b' },
  { id: 'arctic',   label: 'Arctic',            group: 'boy',  accent: '#06b6d4', secondary: '#22d3ee', tertiary: '#3b82f6' },
  // ── Girl themes ──
  { id: 'rose',     label: 'Rose Gold',         group: 'girl', accent: '#ec4899', secondary: '#f472b6', tertiary: '#a855f7' },
  { id: 'galaxy',   label: 'Galaxy',            group: 'girl', accent: '#a855f7', secondary: '#c084fc', tertiary: '#ec4899' },
  { id: 'sunshine', label: 'Sunshine',          group: 'girl', accent: '#f59e0b', secondary: '#fbbf24', tertiary: '#f97316' },
  { id: 'fairy',    label: 'Fairy Dust',        group: 'girl', accent: '#c084fc', secondary: '#d8b4fe', tertiary: '#f0abfc' },
];

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('chorequest-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const [colorTheme, setColorTheme] = useState(() => {
    return localStorage.getItem('chorequest-color-theme') || 'default';
  });

  // Apply mode + color theme to document
  useEffect(() => {
    localStorage.setItem('chorequest-theme', mode);
    localStorage.setItem('chorequest-color-theme', colorTheme);

    const el = document.documentElement;
    el.classList.toggle('light-mode', mode === 'light');

    // Remove all theme-* classes, then add the active one
    COLOR_THEMES.forEach((t) => {
      if (t.id !== 'default') el.classList.remove(`theme-${t.id}`);
    });
    if (colorTheme !== 'default') {
      el.classList.add(`theme-${colorTheme}`);
    }
  }, [mode, colorTheme]);

  const toggleMode = () => setMode((t) => (t === 'dark' ? 'light' : 'dark'));

  const setColorThemeAndSync = useCallback(async (themeId) => {
    setColorTheme(themeId);
    // Persist to server via avatar_config
    try {
      // Fetch current user to get existing avatar_config
      const me = await api('/api/auth/me');
      const config = { ...(me.avatar_config || {}), color_theme: themeId };
      await api('/api/auth/me', {
        method: 'PUT',
        body: { avatar_config: config },
      });
    } catch {
      // Non-critical — localStorage already has the value
    }
  }, []);

  // Sync from server on mount (user's avatar_config.color_theme)
  const syncFromUser = useCallback((user) => {
    if (user?.avatar_config?.color_theme) {
      const serverTheme = user.avatar_config.color_theme;
      if (COLOR_THEMES.some((t) => t.id === serverTheme)) {
        setColorTheme(serverTheme);
        localStorage.setItem('chorequest-color-theme', serverTheme);
      }
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: mode,
        toggle: toggleMode,
        colorTheme,
        setColorTheme: setColorThemeAndSync,
        syncFromUser,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be within ThemeProvider');
  return ctx;
}
