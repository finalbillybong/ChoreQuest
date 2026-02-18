import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import AvatarDisplay from '../components/AvatarDisplay';
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
} from 'lucide-react';

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

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

  const inputClass =
    'w-full bg-navy-light border-2 border-[#2a2a4a] text-cream p-3 rounded font-body text-lg ' +
    'placeholder:text-cream/30 focus:border-gold focus:outline-none transition-colors';

  const roleBadgeColors = {
    admin: 'bg-crimson/20 border-crimson text-crimson',
    parent: 'bg-purple/20 border-purple text-purple',
    kid: 'bg-sky/20 border-sky text-sky',
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <UserCircle size={28} className="text-gold" />
        <h1 className="font-heading text-gold text-xs sm:text-sm leading-relaxed">
          Hero Profile
        </h1>
      </div>

      {/* Avatar + Name + Role */}
      <div className="game-panel p-6 flex flex-col items-center gap-4">
        <AvatarDisplay
          config={user?.avatar_config}
          size="lg"
          name={user?.display_name || user?.username}
        />

        {/* Role badge */}
        <span
          className={`inline-block px-3 py-1 rounded-full border text-[10px] font-heading uppercase tracking-wider ${
            roleBadgeColors[user?.role] || 'border-cream/30 text-cream/50'
          }`}
        >
          {user?.role}
        </span>

        {/* Editable display name */}
        <div className="w-full max-w-xs">
          <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide text-center">
            Display Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your hero name"
              className={inputClass}
            />
            <button
              onClick={saveDisplayName}
              disabled={nameSaving}
              className="game-btn game-btn-gold flex-shrink-0"
            >
              {nameSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            </button>
          </div>
          {nameMsg && (
            <p className={`text-sm mt-1 text-center ${nameMsg.includes('!') ? 'text-emerald' : 'text-crimson'}`}>
              {nameMsg}
            </p>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="game-panel p-5">
        <h2 className="font-heading text-gold/80 text-[10px] mb-4 tracking-wide">
          Hero Stats
        </h2>
        {statsLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={20} className="text-gold animate-spin" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <Star size={20} className="text-gold mx-auto mb-1" />
              <p className="font-heading text-gold text-[11px]">
                {stats.xp_balance ?? stats.xp ?? 0}
              </p>
              <p className="text-cream/40 text-sm font-body">XP Balance</p>
            </div>
            <div className="text-center">
              <Award size={20} className="text-emerald mx-auto mb-1" />
              <p className="font-heading text-emerald text-[11px]">
                {stats.total_xp_earned ?? stats.total_earned ?? 0}
              </p>
              <p className="text-cream/40 text-sm font-body">Total Earned</p>
            </div>
            <div className="text-center">
              <Flame size={20} className="text-crimson mx-auto mb-1" />
              <p className="font-heading text-crimson text-[11px]">
                {stats.streak ?? 0}
              </p>
              <p className="text-cream/40 text-sm font-body">Streak</p>
            </div>
            <div className="text-center">
              <Award size={20} className="text-purple mx-auto mb-1" />
              <p className="font-heading text-purple text-[11px]">
                {stats.achievements_count ?? stats.achievements ?? 0}
              </p>
              <p className="text-cream/40 text-sm font-body">Achievements</p>
            </div>
          </div>
        ) : (
          <p className="text-cream/30 text-center text-sm font-body">
            Stats not available yet. Complete quests to build your legend!
          </p>
        )}
      </div>

      {/* PIN Setup */}
      <div className="game-panel p-5">
        <h2 className="font-heading text-gold/80 text-[10px] mb-4 tracking-wide flex items-center gap-2">
          <KeyRound size={16} className="text-gold/60" />
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
            className={inputClass}
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
          <p className={`text-sm mt-2 ${pinMsg.includes('!') ? 'text-emerald' : 'text-crimson'}`}>
            {pinMsg}
          </p>
        )}
      </div>

      {/* Password Change */}
      <div className="game-panel p-5">
        <h2 className="font-heading text-gold/80 text-[10px] mb-4 tracking-wide flex items-center gap-2">
          <Lock size={16} className="text-gold/60" />
          Change Password
        </h2>
        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            className={inputClass}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            className={inputClass}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className={inputClass}
          />
          <button
            onClick={changePassword}
            disabled={pwSaving}
            className="game-btn game-btn-gold"
          >
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
        {pwMsg && (
          <p className={`text-sm mt-2 ${pwMsg.includes('!') ? 'text-emerald' : 'text-crimson'}`}>
            {pwMsg}
          </p>
        )}
      </div>

      {/* Theme Toggle */}
      <div className="game-panel p-5">
        <h2 className="font-heading text-gold/80 text-[10px] mb-4 tracking-wide">
          Appearance
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cream font-body text-lg">
            {theme === 'dark' ? <Moon size={18} className="text-purple" /> : <Sun size={18} className="text-gold" />}
            <span>{theme === 'dark' ? 'Dark Realm' : 'Light Realm'}</span>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-14 h-7 rounded-full border-2 transition-colors ${
              theme === 'light'
                ? 'bg-gold/20 border-gold'
                : 'bg-navy-light border-[#2a2a4a]'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                theme === 'light'
                  ? 'left-7 bg-gold'
                  : 'left-0.5 bg-cream/40'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="pb-6">
        <button
          onClick={logout}
          className="game-btn game-btn-red w-full flex items-center justify-center gap-2"
        >
          <LogOut size={14} />
          Leave the Realm
        </button>
      </div>
    </div>
  );
}
