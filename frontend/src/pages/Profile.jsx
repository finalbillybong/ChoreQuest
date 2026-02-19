import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import AvatarDisplay from '../components/AvatarDisplay';
import AvatarEditor from '../components/AvatarEditor';
import { useNavigate } from 'react-router-dom';
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
  Paintbrush,
  ShieldCheck,
  Settings,
} from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const [showEditor, setShowEditor] = useState(false);

  // Display name editing
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState('');

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

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

  // Fetch stats
  useEffect(() => {
    (async () => {
      setStatsLoading(true);
      try {
        const data = await api('/api/stats/me');
        setStats(data);
      } catch {
        // Stats may not be available
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

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
          onClick={() => setShowEditor((v) => !v)}
          className="relative group"
          aria-label="Customise avatar"
        >
          <AvatarDisplay
            config={user?.avatar_config}
            size="lg"
            name={user?.display_name || user?.username}
          />
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Paintbrush size={24} className="text-sky" />
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
      {showEditor && <AvatarEditor />}

      {/* Stats Summary */}
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
                {stats.xp_balance ?? stats.xp ?? 0}
              </p>
              <p className="text-muted text-xs">XP Balance</p>
            </div>
            <div className="text-center">
              <Award size={18} className="text-emerald mx-auto mb-1" />
              <p className="text-emerald text-sm font-bold">
                {stats.total_xp_earned ?? stats.total_earned ?? 0}
              </p>
              <p className="text-muted text-xs">Total Earned</p>
            </div>
            <div className="text-center">
              <Flame size={18} className="text-orange-400 mx-auto mb-1" />
              <p className="text-orange-400 text-sm font-bold">
                {stats.streak ?? 0}
              </p>
              <p className="text-muted text-xs">Streak</p>
            </div>
            <div className="text-center">
              <Award size={18} className="text-purple mx-auto mb-1" />
              <p className="text-purple text-sm font-bold">
                {stats.achievements_count ?? stats.achievements ?? 0}
              </p>
              <p className="text-muted text-xs">Achievements</p>
            </div>
          </div>
        ) : (
          <p className="text-muted text-center text-sm">
            Stats not available yet. Complete quests to build your record!
          </p>
        )}
      </div>

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

      {/* Theme Toggle */}
      <div className="game-panel p-5">
        <h2 className="text-cream text-sm font-bold mb-4">
          Appearance
        </h2>
        <div className="flex items-center justify-between">
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
      </div>

      {/* Quick Access */}
      {(user?.role === 'admin' || user?.role === 'parent') && (
        <div className="game-panel p-5 space-y-2">
          <h2 className="text-cream text-sm font-bold mb-3">Quick Access</h2>
          {(user?.role === 'admin' || user?.role === 'parent') && (
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted hover:text-cream hover:bg-surface-raised transition-colors text-left"
            >
              <Settings size={18} />
              <span className="text-sm font-medium">Family Settings</span>
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted hover:text-cream hover:bg-surface-raised transition-colors text-left"
            >
              <ShieldCheck size={18} />
              <span className="text-sm font-medium">Admin Dashboard</span>
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
