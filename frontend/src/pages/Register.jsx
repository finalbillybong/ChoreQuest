import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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

  const inputClass =
    'w-full bg-navy-light border-2 border-[#2a2a4a] text-cream p-3 rounded font-body text-lg ' +
    'placeholder:text-cream/30 focus:border-gold focus:outline-none transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-navy">
      {/* Decorative scanlines overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      />

      <form
        onSubmit={handleSubmit}
        className="game-panel w-full max-w-md p-8 relative z-10"
      >
        {/* Decorative pixel corners */}
        <div className="absolute top-0 left-0 w-3 h-3 bg-gold" />
        <div className="absolute top-0 right-0 w-3 h-3 bg-gold" />
        <div className="absolute bottom-0 left-0 w-3 h-3 bg-gold" />
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gold" />

        {/* Title area */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-gold text-lg sm:text-xl leading-relaxed mb-3">
            Join the Guild
          </h1>
          <div className="mt-2 mx-auto w-32 h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-5 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-base text-center">
            {error}
          </div>
        )}

        {/* Username */}
        <div className="mb-4">
          <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="hero_name"
            autoComplete="username"
            className={inputClass}
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="min 6 characters"
            autoComplete="new-password"
            className={inputClass}
          />
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Sir Lancelot"
            autoComplete="off"
            className={inputClass}
          />
          <p className="text-cream/30 text-sm mt-1">What other guild members will see</p>
        </div>

        {/* Role */}
        <div className="mb-4">
          <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
            Role
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`${inputClass} appearance-none cursor-pointer pr-10`}
            >
              <option value="kid">Adventurer (Kid)</option>
              <option value="parent">Guild Leader (Parent)</option>
            </select>
            {/* Custom dropdown arrow */}
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gold/60">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Invite Code */}
        <div className="mb-6">
          <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
            Invite Code
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="GUILD-XXXX"
            autoComplete="off"
            className={inputClass}
          />
          <p className="text-cream/30 text-sm mt-1">
            Required unless you're the first adventurer
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={`game-btn game-btn-gold w-full ${submitting ? 'opacity-60 cursor-wait' : ''}`}
        >
          {submitting ? 'Creating...' : 'Join Guild'}
        </button>

        {/* Login link */}
        <p className="text-center mt-6 text-cream/50 text-base">
          Already have an account?{' '}
          <Link to="/login" className="text-gold hover:text-gold/80 underline underline-offset-4">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
