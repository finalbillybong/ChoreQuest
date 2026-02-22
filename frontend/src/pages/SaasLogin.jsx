import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Swords, Eye, EyeOff, CheckCircle } from 'lucide-react';

const SUCCESS_KEY = 'chorequest_signup_success';

function readSuccess() {
  try { return sessionStorage.getItem(SUCCESS_KEY) || ''; } catch { return ''; }
}

export default function SaasLogin() {
  const { firebaseLogin, firebaseRegister } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(readSuccess);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const clearSuccessFlag = () => {
    setSuccess('');
    try { sessionStorage.removeItem(SUCCESS_KEY); } catch { /* ignore */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isRegister) clearSuccessFlag();

    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    if (isRegister && !displayName.trim()) { setError('Display name is required'); return; }

    setSubmitting(true);
    try {
      if (isRegister) {
        const msg = 'Account created successfully! Please sign in below.';
        try { sessionStorage.setItem(SUCCESS_KEY, msg); } catch { /* ignore */ }
        setSuccess(msg);
        setIsRegister(false);
        await firebaseRegister(email.trim(), password, displayName.trim());
        setPassword('');
        setShowPassword(false);
      } else {
        clearSuccessFlag();
        await firebaseLogin(email.trim(), password);
      }
    } catch (err) {
      const msg = err?.code === 'auth/user-not-found' ? 'No account with that email.'
        : err?.code === 'auth/wrong-password' ? 'Incorrect password.'
        : err?.code === 'auth/invalid-credential' ? 'Invalid email or password.'
        : err?.code === 'auth/email-already-in-use' ? 'An account with that email already exists.'
        : err?.code === 'auth/weak-password' ? 'Password must be at least 6 characters.'
        : err?.message || 'Authentication failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-navy">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-sky/5 via-transparent to-purple/5" />

      <form
        onSubmit={handleSubmit}
        className="game-panel w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky to-accent-light flex items-center justify-center mx-auto mb-4">
            <Swords size={28} className="text-white" />
          </div>
          <h1 className="font-heading text-cream text-2xl font-extrabold tracking-tight mb-1">
            {isRegister ? 'Create Account' : 'Welcome back'}
          </h1>
          <p className="text-muted text-sm">
            {isRegister ? 'Sign up to start your quest' : 'Sign in to ChoreQuest'}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg border border-crimson/30 bg-crimson/10 text-crimson text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm text-center flex items-center justify-center gap-2">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {isRegister && (
          <div className="mb-4">
            <label className="block text-cream/80 text-sm font-medium mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="field-input"
              autoComplete="name"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-cream/80 text-sm font-medium mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="field-input"
            autoComplete="email"
          />
        </div>

        <div className="mb-6">
          <label className="block text-cream/80 text-sm font-medium mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'Choose a password (6+ chars)' : 'Enter your password'}
              className="field-input pr-10"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-cream transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`game-btn game-btn-blue w-full text-base ${submitting ? 'opacity-60 cursor-wait' : ''}`}
        >
          {submitting
            ? (isRegister ? 'Creating account...' : 'Signing in...')
            : (isRegister ? 'Create Account' : 'Sign In')
          }
        </button>

        <p className="text-center mt-6 text-muted text-sm">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className="text-sky hover:text-accent-light font-medium transition-colors"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); clearSuccessFlag(); }}
                className="text-sky hover:text-accent-light font-medium transition-colors"
              >
                Create an account
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
