import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Swords } from 'lucide-react';

export default function Login() {
  const { login, pinLogin } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [usePinMode, setUsePinMode] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pinRefs = useRef([]);

  const handlePinChange = useCallback((index, value) => {
    // Only allow single digits
    if (value && !/^\d$/.test(value)) return;

    setPin(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

    // Auto-advance to next box on input
    if (value && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  }, []);

  const handlePinKeyDown = useCallback((index, e) => {
    // Move back on backspace when current box is empty
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }, [pin]);

  const handlePinPaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const digits = pasted.split('');
    setPin(prev => {
      const next = [...prev];
      digits.forEach((d, i) => { next[i] = d; });
      return next;
    });

    // Focus the box after the last pasted digit, or the last box
    const focusIndex = Math.min(digits.length, 5);
    pinRefs.current[focusIndex]?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (usePinMode) {
      const pinStr = pin.join('');
      if (pinStr.length !== 6) {
        setError('Enter all 6 PIN digits');
        return;
      }
    } else if (!password) {
      setError('Password is required');
      return;
    }

    setSubmitting(true);
    try {
      if (usePinMode) {
        await pinLogin(username.trim(), pin.join(''));
      } else {
        await login(username.trim(), password);
      }
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Login failed. Check your credentials.');
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
            Welcome back
          </h1>
          <p className="text-muted text-sm">Sign in to QuestOS</p>
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
            placeholder="Enter your username"
            autoComplete="username"
            className="field-input"
          />
        </div>

        {/* Mode toggle */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted text-sm">Login with:</span>
          <button
            type="button"
            onClick={() => {
              setUsePinMode(!usePinMode);
              setError('');
            }}
            className="flex items-center gap-2 text-sm"
          >
            <div
              className={`relative w-10 h-5 rounded-full transition-colors ${
                usePinMode
                  ? 'bg-sky/30 border border-sky/40'
                  : 'bg-navy border border-border'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                  usePinMode
                    ? 'left-5 bg-sky'
                    : 'left-0.5 bg-muted/60'
                }`}
              />
            </div>
            <span className={`font-medium ${usePinMode ? 'text-sky' : 'text-muted'}`}>
              {usePinMode ? 'PIN' : 'Password'}
            </span>
          </button>
        </div>

        {/* Password field */}
        {!usePinMode && (
          <div className="mb-6">
            <label className="block text-cream/80 text-sm font-medium mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="field-input"
            />
          </div>
        )}

        {/* PIN entry */}
        {usePinMode && (
          <div className="mb-6">
            <label className="block text-cream/80 text-sm font-medium mb-1.5">
              PIN Code
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePinPaste}>
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (pinRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  className="w-11 h-13 text-center text-xl bg-navy border border-border text-sky rounded-lg font-bold focus:border-sky focus:outline-none focus:ring-2 focus:ring-sky/20 transition-all"
                />
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={`game-btn game-btn-blue w-full text-base ${submitting ? 'opacity-60 cursor-wait' : ''}`}
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>

        {/* Register link */}
        <p className="text-center mt-6 text-muted text-sm">
          New here?{' '}
          <Link to="/register" className="text-sky hover:text-accent-light font-medium transition-colors">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
