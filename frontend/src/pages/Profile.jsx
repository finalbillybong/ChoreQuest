import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useTheme, COLOR_THEMES } from '../hooks/useTheme';
import AvatarDisplay from '../components/AvatarDisplay';
import AvatarEditor from '../components/AvatarEditor';
import { useNavigate } from 'react-router-dom';
import ChoreIcon from '../components/ChoreIcon';
import {
  UserCircle,
  Save,
  LogOut,
  KeyRound,
  Lock,
  Sun,
  Moon,
  Flame,
  Award,
  Star,
  Loader2,
  Pencil,
  ShieldCheck,
  Settings,
  Trophy,
  ChevronRight,
  Bell,
  BellOff,
} from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

function PushNotificationToggle() {
  const { supported, supportLevel, permission, subscribed, loading, toggle } = usePushNotifications();
  const [toggling, setToggling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  const handleToggle = async () => {
    setToggling(true);
    await toggle();
    setToggling(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult('');
    try {
      const data = await api('/api/push/test', { method: 'POST' });
      setTestResult(data.detail);
    } catch (err) {
      setTestResult(err.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const denied = permission === 'denied';
  const needsInstall = supportLevel === 'needs-install';
  const needsHttps = supportLevel === 'needs-https';
  const unsupported = supportLevel === 'unsupported';

  return (
    <div className="game-panel p-5">
      <h2 className="text-cream text-sm font-bold mb-4 flex items-center gap-2">
        {subscribed ? <Bell size={16} className="text-sky" /> : <BellOff size={16} className="text-muted" />}
        Push Notifications
      </h2>
      {needsHttps ? (
        <div>
          <p className="text-cream/80 text-sm">
            Get notified about quests, rewards & achievements
          </p>
          <p className="text-amber/80 text-xs mt-2">
            Push notifications require a secure (HTTPS) connection.
          </p>
          <p className="text-muted text-xs mt-1">
            Set up a reverse proxy with SSL (e.g. Nginx Proxy Manager) or access ChoreQuest via HTTPS to enable push notifications.
          </p>
        </div>
      ) : needsInstall ? (
        <div>
          <p className="text-cream/80 text-sm">
            Get notified about quests, rewards & achievements
          </p>
          <p className="text-amber/80 text-xs mt-2">
            To enable push notifications, add ChoreQuest to your Home Screen:
          </p>
          <ol className="text-muted text-xs mt-1 list-decimal list-inside space-y-0.5">
            <li>Tap the <strong className="text-cream/70">Share</strong> button in Safari</li>
            <li>Scroll down and tap <strong className="text-cream/70">Add to Home Screen</strong></li>
            <li>Open ChoreQuest from your Home Screen</li>
          </ol>
        </div>
      ) : unsupported ? (
        <div>
          <p className="text-cream/80 text-sm">
            Get notified about quests, rewards & achievements
          </p>
          <p className="text-muted text-xs mt-2">
            Your browser does not support push notifications. Try using Chrome, Edge, Firefox, or Safari 16.4+.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-3">
            <p className="text-cream/80 text-sm">
              {denied
                ? 'Notifications blocked by browser'
                : subscribed
                  ? 'You\'ll get alerts even when the app is closed'
                  : 'Get notified about quests, rewards & achievements'}
            </p>
            {denied && (
              <p className="text-muted text-xs mt-1">
                Check your browser settings to allow notifications for this site.
              </p>
            )}
          </div>
          <button
            onClick={handleToggle}
            disabled={loading || toggling || denied}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
              subscribed
                ? 'bg-sky/30 border border-sky/40'
                : 'bg-navy border border-border'
            } ${(denied) ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                subscribed
                  ? 'left-6 bg-sky'
                  : 'left-0.5 bg-muted/60'
              }`}
            />
          </button>
        </div>
      )}
      {subscribed && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="text-xs text-sky/70 hover:text-sky underline"
          >
            {testing ? 'Sending...' : 'Send test notification'}
          </button>
          {testResult && (
            <span className="text-xs text-muted">{testResult}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { theme, toggle: toggleTheme, colorTheme, setColorTheme } = useTheme();

  const [showEditor, setShowEditor] = useState(false);
  const [editorConfig, setEditorConfig] = useState(null);

  // Display name editing
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState('');

  // Stats (kids only)
  const isKid = user?.role === 'kid';
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(isKid);

  // Achievements (kids only)
  const [achievements, setAchievements] = useState([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  // PIN
  const [pin, setPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    setDisplayName(user?.display_name || '');
  }, [user?.display_name]);

  // Fetch stats (kids only)
  useEffect(() => {
    if (!isKid) return;
    (async () => {
      setStatsLoading(true);
      try {
        const data = await api('/api/stats/me');
        setStats(data);
      } catch {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [isKid]);

  // Fetch achievements when toggled (kids only)
  useEffect(() => {
    if (!showAchievements || achievements.length > 0) return;
    (async () => {
      setAchievementsLoading(true);
      try {
        const data = await api('/api/stats/achievements/all');
        setAchievements(Array.isArray(data) ? data : []);
      } catch {
        setAchievements([]);
      } finally {
        setAchievementsLoading(false);
      }
    })();
  }, [showAchievements, achievements.length]);

  const saveDisplayName = async () => {
    if (!displayName.trim()) return;
    setNameSaving(true);
    setNameMsg('');
    try {
      const data = await api('/api/auth/me', {
        method: 'PUT',
        body: { display_name: displayName.trim() },
      });
      updateUser({ display_name: data.display_name || displayName.trim() });
      setNameMsg('Name updated!');
    } catch (err) {
      setNameMsg(err.message || 'Failed to update name');
    } finally {
      setNameSaving(false);
      setTimeout(() => setNameMsg(''), 3000);
    }
  };

  const savePin = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPinMsg('PIN must be exactly 6 digits');
      return;
    }
    setPinSaving(true);
    setPinMsg('');
    try {
      await api('/api/auth/set-pin', { method: 'POST', body: { pin } });
      setPinMsg('PIN set successfully!');
      setPin('');
    } catch (err) {
      setPinMsg(err.message || 'Failed to set PIN');
    } finally {
      setPinSaving(false);
      setTimeout(() => setPinMsg(''), 3000);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPwMsg('Fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg('New password must be at least 6 characters');
      return;
    }
    setPwSaving(true);
    setPwMsg('');
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });
      setPwMsg('Password changed!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwMsg(err.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwMsg(''), 3000);
    }
  };

  const roleBadgeColors = {
    admin: 'bg-crimson/10 border-crimson/30 text-crimson',
    parent: 'bg-purple/10 border-purple/30 text-purple',
    kid: 'bg-sky/10 border-sky/30 text-sky',
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <UserCircle size={24} className="text-sky" />
        <h1 className="font-heading text-cream text-xl font-extrabold">
          Profile
        </h1>
      </div>

      {/* Avatar + Name + Role */}
      <div className="game-panel p-6 flex flex-col items-center gap-4">
        <button
          onClick={() => {
            setShowEditor((v) => {
              if (v) setEditorConfig(null);
              return !v;
            });
          }}
          className="relative"
          aria-label="Customise avatar"
        >
          <AvatarDisplay
            config={showEditor && editorConfig ? editorConfig : user?.avatar_config}
            size="lg"
            name={user?.display_name || user?.username}
          />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-sky flex items-center justify-center border-2 border-surface shadow-lg">
            <Pencil size={14} className="text-white" />
          </div>
        </button>

        {/* Role badge */}
        <span
          className={`inline-block px-3 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${
            roleBadgeColors[user?.role] || 'border-border text-muted'
          }`}
        >
          {user?.role}
        </span>

        {/* Editable display name */}
        <div className="w-full max-w-xs">
          <label className="block text-cream/80 text-sm font-medium mb-1.5 text-center">
            Display Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="field-input"
            />
            <button
              onClick={saveDisplayName}
              disabled={nameSaving}
              className="game-btn game-btn-blue flex-shrink-0"
            >
              {nameSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            </button>
          </div>
          {nameMsg && (
            <p className={`text-xs mt-1 text-center ${nameMsg.includes('!') ? 'text-emerald' : 'text-crimson'}`}>
              {nameMsg}
            </p>
          )}
        </div>
      </div>

      {/* Avatar Editor */}
      {showEditor && <AvatarEditor onConfigChange={setEditorConfig} />}

      {/* Stats Summary (kids only) */}
      {isKid && (
        <div className="game-panel p-5">
          <h2 className="text-cream text-sm font-bold mb-4">
            Stats
          </h2>
          {statsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="text-sky animate-spin" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <Star size={18} className="text-gold mx-auto mb-1" />
                <p className="text-gold text-sm font-bold">
                  {stats.points_balance ?? stats.xp_balance ?? 0}
                </p>
                <p className="text-muted text-xs">XP Balance</p>
              </div>
              <div className="text-center">
                <Award size={18} className="text-emerald mx-auto mb-1" />
                <p className="text-emerald text-sm font-bold">
                  {stats.total_points_earned ?? stats.total_xp_earned ?? 0}
                </p>
                <p className="text-muted text-xs">Total Earned</p>
              </div>
              <div className="text-center">
                <Flame size={18} className="text-orange-400 mx-auto mb-1" />
                <p className="text-orange-400 text-sm font-bold">
                  {stats.current_streak ?? stats.streak ?? 0}
                </p>
                <p className="text-muted text-xs">Streak</p>
              </div>
              <button
                className="text-center hover:bg-surface-raised/50 rounded-lg py-1 transition-colors"
                onClick={() => setShowAchievements((v) => !v)}
              >
                <Trophy size={18} className="text-purple mx-auto mb-1" />
                <p className="text-purple text-sm font-bold">
                  {stats.achievements_count ?? 0}
                </p>
                <p className="text-muted text-xs flex items-center justify-center gap-0.5">
                  Achievements <ChevronRight size={10} />
                </p>
              </button>
            </div>
          ) : (
            <p className="text-muted text-center text-sm">
              Stats not available yet. Complete quests to build your record!
            </p>
          )}
        </div>
      )}

      {/* Achievements Browser (kids only) */}
      {isKid && showAchievements && (
        <div className="game-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-cream text-sm font-bold flex items-center gap-2">
              <Trophy size={16} className="text-purple" />
              All Achievements
            </h2>
            <button
              onClick={() => setShowAchievements(false)}
              className="text-muted text-xs hover:text-cream transition-colors"
            >
              Hide
            </button>
          </div>
          {achievementsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="text-sky animate-spin" />
            </div>
          ) : achievements.length === 0 ? (
            <p className="text-muted text-center text-sm">
              No achievements available yet.
            </p>
          ) : (
            <div className="space-y-2">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-opacity ${
                    a.unlocked
                      ? 'border-purple/30 bg-purple/5'
                      : 'border-border bg-surface-raised/30 opacity-60'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      a.unlocked
                        ? 'bg-purple/20 border border-purple/40'
                        : 'bg-surface-raised border border-border'
                    }`}
                  >
                    {a.unlocked ? (
                      <ChoreIcon name={a.icon} size={20} className="text-purple" />
                    ) : (
                      <Lock size={16} className="text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${a.unlocked ? 'text-cream' : 'text-muted'}`}>
                      {a.title}
                    </p>
                    <p className="text-muted text-xs mt-0.5">
                      {a.description}
                    </p>
                  </div>
                  {a.points_reward > 0 && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star size={12} className="text-gold fill-gold" />
                      <span className="text-gold text-xs font-bold">{a.points_reward}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PIN Setup */}
      <div className="game-panel p-5">
        <h2 className="text-cream text-sm font-bold mb-4 flex items-center gap-2">
          <KeyRound size={16} className="text-muted" />
          Quick PIN Login
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit PIN"
            className="field-input"
          />
          <button
            onClick={savePin}
            disabled={pinSaving}
            className="game-btn game-btn-blue flex-shrink-0"
          >
            {pinSaving ? 'Setting...' : 'Set PIN'}
          </button>
        </div>
        {pinMsg && (
          <p className={`text-xs mt-2 ${pinMsg.includes('!') ? 'text-emerald' : 'text-crimson'}`}>
            {pinMsg}
          </p>
        )}
      </div>

      {/* Password Change */}
      <div className="game-panel p-5">
        <h2 className="text-cream text-sm font-bold mb-4 flex items-center gap-2">
          <Lock size={16} className="text-muted" />
          Change Password
        </h2>
        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className="field-input"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            className="field-input"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="field-input"
          />
          <button
            onClick={changePassword}
            disabled={pwSaving}
            className="game-btn game-btn-blue"
          >
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
        {pwMsg && (
          <p className={`text-xs mt-2 ${pwMsg.includes('!') ? 'text-emerald' : 'text-crimson'}`}>
            {pwMsg}
          </p>
        )}
      </div>

      {/* Push Notifications */}
      <PushNotificationToggle />

      {/* Theme Toggle */}
      <div className="game-panel p-5">
        <h2 className="text-cream text-sm font-bold mb-4">
          Appearance
        </h2>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-cream text-sm">
            {theme === 'dark' ? <Moon size={16} className="text-purple" /> : <Sun size={16} className="text-gold" />}
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              theme === 'light'
                ? 'bg-sky/30 border border-sky/40'
                : 'bg-navy border border-border'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                theme === 'light'
                  ? 'left-6 bg-sky'
                  : 'left-0.5 bg-muted/60'
              }`}
            />
          </button>
        </div>

        {/* Color Theme Picker */}
        <h3 className="text-cream/80 text-xs font-semibold uppercase tracking-wider mb-3">
          Color Theme
        </h3>
        {['boy', 'girl'].map((group) => (
          <div key={group} className="mb-4">
            <p className="text-muted text-[11px] font-semibold uppercase tracking-widest mb-2">
              {group === 'boy' ? 'Knight Themes' : 'Princess Themes'}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {COLOR_THEMES.filter((t) => t.group === group).map((t) => {
                const isActive = colorTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setColorTheme(t.id)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-accent bg-accent/10 scale-[1.02]'
                        : 'border-border hover:border-border-light bg-surface-raised/30'
                    }`}
                  >
                    {/* Colour swatch */}
                    <div className="flex gap-1">
                      <div
                        className="w-5 h-5 rounded-full border border-white/10"
                        style={{ backgroundColor: t.accent }}
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-white/10"
                        style={{ backgroundColor: t.secondary }}
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-white/10"
                        style={{ backgroundColor: t.tertiary }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-cream/80 leading-tight text-center">
                      {t.label}
                    </span>
                    {isActive && (
                      <div
                        className="absolute top-1 right-1 w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.accent }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Management */}
      {(user?.role === 'admin' || user?.role === 'parent') && (
        <div className="game-panel p-5 space-y-2">
          <h2 className="text-cream text-sm font-bold mb-3 flex items-center gap-2">
            <Settings size={16} className="text-muted" />
            Management
          </h2>
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-raised/50 hover:bg-surface-raised border border-border/50 hover:border-border transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-sky/10 border border-sky/20 flex items-center justify-center flex-shrink-0">
              <Settings size={18} className="text-sky" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-cream text-sm font-medium">Family Settings</p>
              <p className="text-muted text-xs">Features, resets &amp; rewards</p>
            </div>
            <ChevronRight size={16} className="text-muted flex-shrink-0" />
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-raised/50 hover:bg-surface-raised border border-border/50 hover:border-border transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={18} className="text-crimson" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-cream text-sm font-medium">Admin Dashboard</p>
                <p className="text-muted text-xs">Users, keys &amp; audit log</p>
              </div>
              <ChevronRight size={16} className="text-muted flex-shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* Logout */}
      <div className="pb-6">
        <button
          onClick={logout}
          className="game-btn game-btn-red w-full flex items-center justify-center gap-2"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
