import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const SettingsContext = createContext({
  leaderboard_enabled: true,
  spin_wheel_enabled: true,
  chore_trading_enabled: true,
});

export function SettingsProvider({ children }) {
  const [features, setFeatures] = useState({
    leaderboard_enabled: true,
    spin_wheel_enabled: true,
    chore_trading_enabled: true,
  });

  const fetchFeatures = useCallback(async () => {
    try {
      const data = await api('/api/admin/settings/features');
      setFeatures({
        leaderboard_enabled: data.leaderboard_enabled !== 'false',
        spin_wheel_enabled: data.spin_wheel_enabled !== 'false',
        chore_trading_enabled: data.chore_trading_enabled !== 'false',
      });
    } catch {
      // If fetch fails, keep defaults (all enabled)
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  // Re-fetch when settings are saved (listen for custom event)
  useEffect(() => {
    const handler = () => fetchFeatures();
    window.addEventListener('settings:updated', handler);
    return () => window.removeEventListener('settings:updated', handler);
  }, [fetchFeatures]);

  return (
    <SettingsContext.Provider value={features}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
