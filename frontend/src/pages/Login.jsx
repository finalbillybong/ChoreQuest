import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
            Enter the Realm
          </h1>
          <p className="text-cream/60 text-2xl tracking-widest">ChoresOS</p>
          <div className="mt-3 mx-auto w-32 h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
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

        {/* Mode toggle */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-cream/50 text-base">Login with:</span>
          <button
            type="button"
            onClick={() => {
              setUsePinMode(!usePinMode);
              setError('');
            }}
            className="flex items-center gap-2 text-sm"
          >
            <div
              className={`relative w-12 h-6 rounded-full border-2 transition-colors ${
                usePinMode
                  ? 'bg-gold/20 border-gold'
                  : 'bg-navy-light border-[#2a2a4a]'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                  usePinMode
                    ? 'left-6 bg-gold'
                    : 'left-0.5 bg-cream/40'
                }`}
              />
            </div>
            <span className={usePinMode ? 'text-gold' : 'text-cream/50'}>
              {usePinMode ? 'PIN' : 'Password'}
            </span>
          </button>
        </div>

        {/* Password field */}
        {!usePinMode && (
          <div className="mb-6">
            <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
        )}

        {/* PIN entry */}
        {usePinMode && (
          <div className="mb-6">
            <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
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
                  className={
                    'w-12 h-14 text-center text-2xl bg-navy-light border-2 border-[#2a2a4a] ' +
                    'text-gold rounded font-body focus:border-gold focus:outline-none transition-colors'
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={`game-btn game-btn-gold w-full ${submitting ? 'opacity-60 cursor-wait' : ''}`}
        >
          {submitting ? 'Entering...' : 'Start Quest'}
        </button>

        {/* Register link */}
        <p className="text-center mt-6 text-cream/50 text-base">
          New here?{' '}
          <Link to="/register" className="text-gold hover:text-gold/80 underline underline-offset-4">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
