import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Swords, Users, Ticket } from 'lucide-react';

export default function Onboarding() {
  const { user, createFamily, joinFamily } = useAuth();
  const [mode, setMode] = useState('choose'); // 'choose' | 'create' | 'join'
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const flagWelcome = () => {
    try { sessionStorage.setItem('chorequest_show_welcome', '1'); } catch { /* ignore */ }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    const name = familyName.trim();
    if (!name) { setError('Please enter a family name'); return; }

    setSubmitting(true);
    try {
      flagWelcome();
      await createFamily(name);
    } catch (err) {
      try { sessionStorage.removeItem('chorequest_show_welcome'); } catch { /* ignore */ }
      setError(err?.message || 'Failed to create family');
      setSubmitting(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    const code = inviteCode.trim();
    if (!code) { setError('Please enter an invite code'); return; }

    setSubmitting(true);
    try {
      flagWelcome();
      await joinFamily(code);
    } catch (err) {
      try { sessionStorage.removeItem('chorequest_show_welcome'); } catch { /* ignore */ }
      setError(err?.message || 'Failed to join family');
      setSubmitting(false);
    }
  };

  // --- Choose screen ---
  if (mode === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-navy">
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-sky/5 via-transparent to-purple/5" />
        <div className="game-panel w-full max-w-md p-8 relative z-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky to-accent-light flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-white" />
            </div>
            <h1 className="font-heading text-cream text-2xl font-extrabold tracking-tight mb-1">
              Welcome to ChoreQuest!
            </h1>
            <p className="text-muted text-sm">
              How would you like to get started?
            </p>
            {user && (
              <p className="text-muted text-xs mt-2">
                Signed in as {user.display_name || user.username}
              </p>
            )}
          </div>

          <button
            onClick={() => { setMode('create'); setError(''); }}
            className="game-btn game-btn-blue w-full text-base mb-3 flex items-center justify-center gap-2"
          >
            <Swords size={18} />
            Create a New Family
          </button>

          <button
            onClick={() => { setMode('join'); setError(''); }}
            className="game-btn w-full text-base border-2 border-sky/40 text-sky hover:bg-sky/10 flex items-center justify-center gap-2"
          >
            <Ticket size={18} />
            Join with Invite Code
          </button>
        </div>
      </div>
    );
  }

  // --- Create family screen ---
  if (mode === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-navy">
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-sky/5 via-transparent to-purple/5" />
        <form onSubmit={handleCreate} className="game-panel w-full max-w-md p-8 relative z-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky to-accent-light flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-white" />
            </div>
            <h1 className="font-heading text-cream text-2xl font-extrabold tracking-tight mb-1">
              Create Your Family
            </h1>
            <p className="text-muted text-sm">
              Set up your family to get started.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg border border-crimson/30 bg-crimson/10 text-crimson text-sm text-center">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-cream/80 text-sm font-medium mb-1.5">Family Name</label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g. The Smiths"
              className="field-input"
              maxLength={100}
              autoFocus
            />
            <p className="text-muted text-xs mt-1.5">
              This is how your family will appear in ChoreQuest.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`game-btn game-btn-blue w-full text-base ${submitting ? 'opacity-60 cursor-wait' : ''}`}
          >
            <Swords size={18} className="inline mr-2" />
            {submitting ? 'Creating...' : 'Start Your Quest'}
          </button>

          <p className="text-center mt-4 text-muted text-xs">
            You'll get a 7-day free trial with all features unlocked.
          </p>

          <button
            type="button"
            onClick={() => { setMode('choose'); setError(''); }}
            className="block mx-auto mt-4 text-sky hover:text-accent-light text-sm font-medium transition-colors"
          >
            Back
          </button>
        </form>
      </div>
    );
  }

  // --- Join family screen ---
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-navy">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-sky/5 via-transparent to-purple/5" />
      <form onSubmit={handleJoin} className="game-panel w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4">
            <Ticket size={28} className="text-white" />
          </div>
          <h1 className="font-heading text-cream text-2xl font-extrabold tracking-tight mb-1">
            Join a Family
          </h1>
          <p className="text-muted text-sm">
            Enter the invite code your family admin shared with you.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg border border-crimson/30 bg-crimson/10 text-crimson text-sm text-center">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-cream/80 text-sm font-medium mb-1.5">Invite Code</label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            className="field-input text-center text-lg tracking-widest"
            maxLength={20}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`game-btn game-btn-blue w-full text-base ${submitting ? 'opacity-60 cursor-wait' : ''}`}
        >
          <Ticket size={18} className="inline mr-2" />
          {submitting ? 'Joining...' : 'Join Family'}
        </button>

        <button
          type="button"
          onClick={() => { setMode('choose'); setError(''); }}
          className="block mx-auto mt-4 text-sky hover:text-accent-light text-sm font-medium transition-colors"
        >
          Back
        </button>
      </form>
    </div>
  );
}
