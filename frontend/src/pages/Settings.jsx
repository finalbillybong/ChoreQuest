import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  Settings as CogIcon,
  Save,
  Shield,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Award,
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isParentOrAdmin = user?.role === 'parent' || user?.role === 'admin';

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Achievements
  const [achievements, setAchievements] = useState([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [achievementsSaving, setAchievementsSaving] = useState({});

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/admin/settings');
      setSettings(data);
    } catch (err) {
      if (err.message?.includes('403') || err.message?.includes('Forbidden') || err.message?.includes('permission')) {
        setError('Access denied. Only parents and admins can access settings.');
      } else {
        setError(err.message || 'Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAchievements = useCallback(async () => {
    setAchievementsLoading(true);
    try {
      const data = await api('/api/stats/achievements/all');
      setAchievements(data.achievements || data || []);
    } catch {
      // Achievements endpoint may not exist
      setAchievements([]);
    } finally {
      setAchievementsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isParentOrAdmin) {
      fetchSettings();
      fetchAchievements();
    } else {
      setLoading(false);
      setError('Access denied. Only parents and admins can access settings.');
    }
  }, [isParentOrAdmin, fetchSettings, fetchAchievements]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await api('/api/admin/settings', { method: 'PUT', body: settings });
      setSaveMsg('Settings saved!');
    } catch (err) {
      setSaveMsg(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const updateAchievementPoints = async (achievement) => {
    setAchievementsSaving((prev) => ({ ...prev, [achievement.id]: true }));
    try {
      await api(`/api/stats/achievements/${achievement.id}`, {
        method: 'PUT',
        body: { points_reward: achievement.points_reward },
      });
    } catch {
      // Revert will be handled by re-fetch if needed
    } finally {
      setAchievementsSaving((prev) => ({ ...prev, [achievement.id]: false }));
    }
  };

  const inputClass =
    'w-full bg-navy-light border-2 border-[#2a2a4a] text-cream p-3 rounded font-body text-lg ' +
    'placeholder:text-cream/30 focus:border-gold focus:outline-none transition-colors';

  const ToggleSwitch = ({ enabled, onChange, label }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-cream font-body text-lg">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className="flex-shrink-0"
        aria-label={`Toggle ${label}`}
      >
        {enabled ? (
          <ToggleRight size={32} className="text-emerald" />
        ) : (
          <ToggleLeft size={32} className="text-cream/30" />
        )}
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <CogIcon size={28} className="text-gold" />
        <h1 className="font-heading text-gold text-xs sm:text-sm leading-relaxed">
          Settings
        </h1>
      </div>

      {/* Error / Access denied */}
      {error && (
        <div className="game-panel p-8 text-center">
          <Shield size={48} className="text-crimson/30 mx-auto mb-4" />
          <p className="text-crimson font-body text-lg">{error}</p>
          <p className="text-cream/30 text-sm mt-2 font-body">
            Only guild leaders may alter the realm's configuration.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-gold animate-spin" />
        </div>
      )}

      {/* Settings form */}
      {!loading && !error && settings && (
        <div className="space-y-6">
          {/* Toggle settings */}
          <div className="game-panel p-5">
            <h2 className="font-heading text-gold/80 text-[10px] mb-3 tracking-wide">
              Feature Toggles
            </h2>

            <div className="divide-y divide-[#2a2a4a]">
              <ToggleSwitch
                enabled={settings.leaderboard_enabled ?? true}
                onChange={(v) => updateSetting('leaderboard_enabled', v)}
                label="Leaderboard"
              />
              <ToggleSwitch
                enabled={settings.spin_wheel_enabled ?? true}
                onChange={(v) => updateSetting('spin_wheel_enabled', v)}
                label="Spin Wheel"
              />
              <ToggleSwitch
                enabled={settings.chore_trading_enabled ?? true}
                onChange={(v) => updateSetting('chore_trading_enabled', v)}
                label="Chore Trading"
              />
            </div>
          </div>

          {/* Daily reset hour */}
          <div className="game-panel p-5">
            <h2 className="font-heading text-gold/80 text-[10px] mb-3 tracking-wide">
              Daily Reset Hour
            </h2>
            <p className="text-cream/40 text-sm font-body mb-3">
              Hour of day (0-23) when daily quests reset.
            </p>
            <input
              type="number"
              min={0}
              max={23}
              value={settings.daily_reset_hour ?? 0}
              onChange={(e) => {
                const val = Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0));
                updateSetting('daily_reset_hour', val);
              }}
              className={inputClass + ' max-w-[120px]'}
            />
          </div>

          {/* Save button */}
          <button
            onClick={saveSettings}
            disabled={saving}
            className="game-btn game-btn-gold flex items-center gap-2"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saveMsg && (
            <p className={`text-sm ${saveMsg.includes('!') ? 'text-emerald' : 'text-crimson'}`}>
              {saveMsg}
            </p>
          )}

          {/* Achievement point values */}
          <div className="game-panel p-5">
            <h2 className="font-heading text-gold/80 text-[10px] mb-3 tracking-wide flex items-center gap-2">
              <Award size={16} className="text-gold/60" />
              Achievement Point Values
            </h2>

            {achievementsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="text-gold animate-spin" />
              </div>
            ) : achievements.length === 0 ? (
              <p className="text-cream/30 text-sm font-body">
                No achievements configured yet.
              </p>
            ) : (
              <div className="space-y-3">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="flex items-center gap-3 py-2 border-b border-[#2a2a4a] last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-cream font-body text-lg truncate">
                        {ach.title || ach.name}
                      </p>
                      {ach.description && (
                        <p className="text-cream/30 text-sm font-body truncate">
                          {ach.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="number"
                        min={0}
                        value={ach.points_reward ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setAchievements((prev) =>
                            prev.map((a) =>
                              a.id === ach.id
                                ? { ...a, points_reward: val }
                                : a
                            )
                          );
                        }}
                        className={inputClass + ' !w-24 !p-2 text-center'}
                      />
                      <button
                        onClick={() => updateAchievementPoints(ach)}
                        disabled={achievementsSaving[ach.id]}
                        className="game-btn game-btn-blue !py-2 !px-3"
                        title="Save"
                      >
                        {achievementsSaving[ach.id] ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin link */}
          {user?.role === 'admin' && (
            <div className="game-panel p-5 text-center">
              <p className="text-cream/40 text-sm font-body mb-3">
                Need advanced controls?
              </p>
              <button
                onClick={() => navigate('/admin')}
                className="game-btn game-btn-purple"
              >
                <Shield size={14} className="inline mr-2" />
                Admin Dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
