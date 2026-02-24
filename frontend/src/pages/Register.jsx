import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Swords } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('kid');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (displayName.trim().length > 10) {
      setError('Display name must be 10 characters or less');
      return;
    }

    setSubmitting(true);
    try {
      await register(
        username.trim(),
        password,
        displayName.trim(),
        role,
        inviteCode.trim() || undefined
      );
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-navy">
      {/* Subtle gradient background */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-sky/5 via-transparent to-purple/5" />

      <form
        onSubmit={handleSubmit}
        className="game-panel w-full max-w-md p-8 relative z-10"
      >
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky to-accent-light flex items-center justify-center mx-auto mb-4">
            <Swords size={28} className="text-white" />
          </div>
          <h1 className="font-heading text-cream text-2xl font-extrabold tracking-tight mb-1">
            Create Account
          </h1>
          <p className="text-muted text-sm">Join ChoreQuest and start your journey</p>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-5 p-3 rounded-lg border border-crimson/30 bg-crimson/10 text-crimson text-sm text-center">
            {error}
          </div>
        )}

        {/* Username */}
        <div className="mb-4">
          <label className="block text-cream/80 text-sm font-medium mb-1.5">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            autoComplete="username"
            className="field-input"
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-cream/80 text-sm font-medium mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            autoComplete="new-password"
            className="field-input"
          />
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <label className="block text-cream/80 text-sm font-medium mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={10}
            placeholder="What others will see"
            autoComplete="off"
            className="field-input"
          />
        </div>

        {/* Role */}
        <div className="mb-4">
          <label className="block text-cream/80 text-sm font-medium mb-1.5">
            Role
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="field-input appearance-none cursor-pointer pr-10"
            >
              <option value="kid">Adventurer (Kid)</option>
              <option value="parent">Leader (Parent)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Invite Code */}
        <div className="mb-6">
          <label className="block text-cream/80 text-sm font-medium mb-1.5">
            Invite Code
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Enter invite code"
            autoComplete="off"
            className="field-input"
          />
          <p className="text-muted text-xs mt-1.5">
            Required unless you're the first user
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={`game-btn game-btn-blue w-full text-base ${submitting ? 'opacity-60 cursor-wait' : ''}`}
        >
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>

        {/* Login link */}
        <p className="text-center mt-6 text-muted text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-sky hover:text-accent-light font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
