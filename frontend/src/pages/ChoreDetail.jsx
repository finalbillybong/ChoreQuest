import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  Swords,
  ArrowLeft,
  Star,
  RefreshCw,
  Camera,
  CheckCircle2,
  XCircle,
  SkipForward,
  Calendar,
  Clock,
  Shield,
  ScrollText,
} from 'lucide-react';

const DIFFICULTY_LABELS = ['Trivial', 'Easy', 'Medium', 'Hard', 'Legendary'];
const DIFFICULTY_COLORS = [
  'text-cream/60',
  'text-emerald',
  'text-sky',
  'text-purple',
  'text-gold',
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CATEGORY_COLORS = {
  cleaning: 'bg-sky/20 text-sky border-sky/40',
  cooking: 'bg-gold/20 text-gold border-gold/40',
  outdoor: 'bg-emerald/20 text-emerald border-emerald/40',
  homework: 'bg-purple/20 text-purple border-purple/40',
  pet_care: 'bg-crimson/20 text-crimson border-crimson/40',
  laundry: 'bg-sky/20 text-sky border-sky/40',
  errands: 'bg-gold/20 text-gold border-gold/40',
  default: 'bg-cream/10 text-cream/70 border-cream/20',
};

function DifficultyStars({ level }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={18}
          className={i <= level ? 'text-gold fill-gold' : 'text-cream/20'}
        />
      ))}
      <span className={`ml-2 font-body text-lg ${DIFFICULTY_COLORS[level - 1] || 'text-cream/60'}`}>
        {DIFFICULTY_LABELS[level - 1] || 'Unknown'}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-gold/20 text-gold border-gold/40',
    completed: 'bg-emerald/20 text-emerald border-emerald/40',
    verified: 'bg-sky/20 text-sky border-sky/40',
    skipped: 'bg-cream/10 text-cream/50 border-cream/20',
    missed: 'bg-crimson/20 text-crimson border-crimson/40',
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-sm border capitalize ${
        styles[status] || styles.pending
      }`}
    >
      {status || 'pending'}
    </span>
  );
}

export default function ChoreDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isParent = user?.role === 'parent' || user?.role === 'admin';
  const isKid = user?.role === 'kid';

  const [chore, setChore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const fetchChore = useCallback(async () => {
    try {
      setError('');
      const data = await api(`/api/chores/${id}`);
      setChore(data);
    } catch (err) {
      setError(err.message || 'This quest scroll could not be found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChore();
  }, [fetchChore]);

  const handleComplete = async () => {
    setActionLoading('complete');
    setActionMessage('');
    try {
      await api(`/api/chores/${id}/complete`, { method: 'POST' });
      setActionMessage('Quest completed! XP has been awarded to your hero.');
      await fetchChore();
    } catch (err) {
      setActionMessage(err.message || 'Failed to complete the quest.');
    } finally {
      setActionLoading('');
    }
  };

  const handleVerify = async (assignmentId) => {
    setActionLoading('verify');
    setActionMessage('');
    try {
      const path = assignmentId
        ? `/api/chores/assignments/${assignmentId}/verify`
        : `/api/chores/${id}/verify`;
      await api(path, { method: 'POST' });
      setActionMessage('Quest verified! The hero has been rewarded.');
      await fetchChore();
    } catch (err) {
      setActionMessage(err.message || 'Verification failed.');
    } finally {
      setActionLoading('');
    }
  };

  const handleUncomplete = async (assignmentId) => {
    setActionLoading('uncomplete');
    setActionMessage('');
    try {
      const path = assignmentId
        ? `/api/chores/assignments/${assignmentId}/uncomplete`
        : `/api/chores/${id}/uncomplete`;
      await api(path, { method: 'POST' });
      setActionMessage('Quest marked as incomplete.');
      await fetchChore();
    } catch (err) {
      setActionMessage(err.message || 'Could not undo completion.');
    } finally {
      setActionLoading('');
    }
  };

  const handleSkip = async (assignmentId) => {
    setActionLoading('skip');
    setActionMessage('');
    try {
      const path = assignmentId
        ? `/api/chores/assignments/${assignmentId}/skip`
        : `/api/chores/${id}/skip`;
      await api(path, { method: 'POST' });
      setActionMessage('Quest skipped for today.');
      await fetchChore();
    } catch (err) {
      setActionMessage(err.message || 'Could not skip the quest.');
    } finally {
      setActionLoading('');
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ScrollText size={48} className="text-gold animate-pulse" />
        <p className="text-gold font-heading text-xs animate-pulse">
          Unrolling the quest scroll...
        </p>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <button
          onClick={() => navigate('/chores')}
          className="flex items-center gap-2 text-cream/50 hover:text-cream transition-colors mb-6"
        >
          <ArrowLeft size={18} />
          <span className="font-body text-lg">Back to Quest Board</span>
        </button>
        <div className="game-panel p-10 text-center">
          <XCircle size={48} className="mx-auto text-crimson mb-4" />
          <p className="text-crimson font-heading text-xs mb-2">Quest Not Found</p>
          <p className="text-cream/50 font-body text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!chore) return null;

  const categoryColorClass =
    CATEGORY_COLORS[chore.category?.toLowerCase()] || CATEGORY_COLORS.default;

  // Determine today's assignment
  const assignments = chore.assignments || chore.history || [];
  const today = new Date().toISOString().split('T')[0];
  const todayAssignment = assignments.find(
    (a) => a.date === today || a.assigned_date === today || a.due_date === today
  );
  const hasPendingToday =
    todayAssignment && (todayAssignment.status === 'pending' || todayAssignment.status === 'assigned');
  const recentAssignments = assignments.slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/chores')}
        className="flex items-center gap-2 text-cream/50 hover:text-cream transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="font-body text-lg">Back to Quest Board</span>
      </button>

      {/* Main chore panel */}
      <div className="game-panel p-6 space-y-5">
        {/* Title */}
        <div className="flex items-start gap-3">
          <Swords size={28} className="text-gold flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h1 className="font-heading text-gold text-sm sm:text-base leading-relaxed">
              {chore.title}
            </h1>
          </div>
        </div>

        {/* Description */}
        {chore.description && (
          <div className="pl-10">
            <p className="text-cream/70 font-body text-xl leading-relaxed">
              {chore.description}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="mx-auto w-full h-[1px] bg-gradient-to-r from-transparent via-[#2a2a4a] to-transparent" />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* XP */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <span className="text-gold text-xl">&#9733;</span>
            </div>
            <div>
              <p className="text-cream/40 text-sm font-body">XP Reward</p>
              <p className="text-gold font-heading text-xs">{chore.points} XP</p>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <p className="text-cream/40 text-sm font-body mb-1">Difficulty</p>
            <DifficultyStars level={chore.difficulty || 1} />
          </div>

          {/* Category */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2a2a4a] flex items-center justify-center">
              <Shield size={18} className="text-cream/50" />
            </div>
            <div>
              <p className="text-cream/40 text-sm font-body">Category</p>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-sm border capitalize ${categoryColorClass}`}
              >
                {chore.category || 'General'}
              </span>
            </div>
          </div>

          {/* Recurrence */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2a2a4a] flex items-center justify-center">
              <RefreshCw size={18} className="text-cream/50" />
            </div>
            <div>
              <p className="text-cream/40 text-sm font-body">Recurrence</p>
              <p className="text-cream font-body text-lg capitalize">
                {chore.recurrence || 'Once'}
                {chore.recurrence === 'custom' &&
                  chore.custom_days?.length > 0 && (
                    <span className="text-cream/40 text-base ml-1">
                      ({chore.custom_days.map((d) => DAY_NAMES[d] || d).join(', ')})
                    </span>
                  )}
              </p>
            </div>
          </div>
        </div>

        {/* Photo requirement */}
        {chore.requires_photo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-purple/10 border border-purple/30">
            <Camera size={16} className="text-purple" />
            <span className="text-purple font-body text-base">
              Photo proof required upon completion
            </span>
          </div>
        )}
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`p-3 rounded border-2 text-base text-center ${
            actionMessage.toLowerCase().includes('fail') || actionMessage.toLowerCase().includes('could not')
              ? 'border-crimson/40 bg-crimson/10 text-crimson'
              : 'border-emerald/40 bg-emerald/10 text-emerald'
          }`}
        >
          {actionMessage}
        </div>
      )}

      {/* Actions for kids */}
      {isKid && hasPendingToday && (
        <div className="game-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold font-heading text-[10px] mb-1">Today's Quest</p>
              <p className="text-cream/60 font-body text-base">
                This quest awaits your courage, adventurer!
              </p>
            </div>
            <button
              onClick={handleComplete}
              disabled={!!actionLoading}
              className={`game-btn game-btn-gold flex items-center gap-2 ${
                actionLoading === 'complete' ? 'opacity-60 cursor-wait' : ''
              }`}
            >
              <CheckCircle2 size={16} />
              {actionLoading === 'complete' ? 'Completing...' : 'Complete Quest'}
            </button>
          </div>
        </div>
      )}

      {/* Actions for parents */}
      {isParent && (
        <div className="game-panel p-5">
          <p className="text-gold font-heading text-[10px] mb-3">Guild Master Actions</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleVerify(todayAssignment?.id)}
              disabled={!!actionLoading}
              className={`game-btn game-btn-gold flex items-center gap-2 ${
                actionLoading === 'verify' ? 'opacity-60 cursor-wait' : ''
              }`}
            >
              <CheckCircle2 size={14} />
              {actionLoading === 'verify' ? 'Verifying...' : 'Verify'}
            </button>
            <button
              onClick={() => handleUncomplete(todayAssignment?.id)}
              disabled={!!actionLoading}
              className={`game-btn game-btn-blue flex items-center gap-2 ${
                actionLoading === 'uncomplete' ? 'opacity-60 cursor-wait' : ''
              }`}
            >
              <XCircle size={14} />
              {actionLoading === 'uncomplete' ? 'Undoing...' : 'Uncomplete'}
            </button>
            <button
              onClick={() => handleSkip(todayAssignment?.id)}
              disabled={!!actionLoading}
              className={`game-btn game-btn-red flex items-center gap-2 ${
                actionLoading === 'skip' ? 'opacity-60 cursor-wait' : ''
              }`}
            >
              <SkipForward size={14} />
              {actionLoading === 'skip' ? 'Skipping...' : 'Skip Today'}
            </button>
          </div>
        </div>
      )}

      {/* Assignment History */}
      {recentAssignments.length > 0 && (
        <div className="game-panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gold" />
            <h2 className="font-heading text-gold text-[10px]">Quest Log</h2>
          </div>

          <div className="space-y-2">
            {recentAssignments.map((assignment, idx) => (
              <div
                key={assignment.id || idx}
                className="flex items-center justify-between p-3 rounded bg-[#2a2a4a]/30 border border-[#2a2a4a]"
              >
                <div className="flex items-center gap-3">
                  <Clock size={14} className="text-cream/30" />
                  <span className="text-cream/60 font-body text-base">
                    {assignment.date || assignment.assigned_date || assignment.due_date || 'N/A'}
                  </span>
                  {assignment.assigned_to_name && (
                    <span className="text-cream/40 font-body text-sm">
                      - {assignment.assigned_to_name}
                    </span>
                  )}
                </div>
                <StatusBadge status={assignment.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty history state */}
      {recentAssignments.length === 0 && (
        <div className="game-panel p-8 text-center">
          <Calendar size={32} className="mx-auto text-cream/20 mb-3" />
          <p className="text-cream/40 font-body text-lg">
            No entries in the quest log yet. Adventures await!
          </p>
        </div>
      )}
    </div>
  );
}
