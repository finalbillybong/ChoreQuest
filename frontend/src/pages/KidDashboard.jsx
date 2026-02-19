import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Sword,
  CheckCircle2,
  CheckCheck,
  Skull,
  Camera,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import PointCounter from '../components/PointCounter';
import StreakDisplay from '../components/StreakDisplay';
import SpinWheel from '../components/SpinWheel';
import ConfettiAnimation from '../components/ConfettiAnimation';

// ---------- helpers ----------

function getMondayOfThisWeek() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function difficultyLabel(difficulty) {
  switch (difficulty) {
    case 'easy':
      return { text: 'Easy', color: 'text-emerald bg-emerald/10 border-emerald/20' };
    case 'medium':
      return { text: 'Medium', color: 'text-gold bg-gold/10 border-gold/20' };
    case 'hard':
      return { text: 'Hard', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' };
    case 'expert':
      return { text: 'Expert', color: 'text-crimson bg-crimson/10 border-crimson/20' };
    default:
      return { text: 'Easy', color: 'text-emerald bg-emerald/10 border-emerald/20' };
  }
}

// ---------- card animation variants ----------

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 },
  }),
};

const completeButtonVariants = {
  idle: { scale: 1 },
  tap: { scale: 0.96 },
};

// ---------- component ----------

export default function KidDashboard() {
  const { user, updateUser } = useAuth();

  // data state
  const [assignments, setAssignments] = useState([]);
  const [chores, setChores] = useState([]);
  const [spinAvailability, setSpinAvailability] = useState(null);

  // ui state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [photoFiles, setPhotoFiles] = useState({}); // { choreId: File }

  // ---- data fetching ----

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const monday = getMondayOfThisWeek();
      const today = todayISO();

      const [choresRes, calendarRes, spinRes] = await Promise.all([
        api('/api/chores'),
        api(`/api/calendar?week_start=${monday}`),
        api('/api/spin/availability'),
      ]);

      setChores(choresRes);

      // Filter calendar assignments to today only
      const todayAssignments = (calendarRes.days && calendarRes.days[today]) || [];
      setAssignments(todayAssignments);

      setSpinAvailability(spinRes);
    } catch (err) {
      setError(err.message || 'Failed to load quest data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- WebSocket listener ----

  useEffect(() => {
    const handler = () => {
      fetchData();
    };
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [fetchData]);

  // ---- complete quest ----

  const handleComplete = async (assignment) => {
    const choreId = assignment.chore_id;
    const chore = assignment.chore;

    // If photo required, validate
    if (chore?.requires_photo && !photoFiles[choreId]) {
      return; // silently wait for photo
    }

    setCompletingId(choreId);
    try {
      // If there's a photo, upload it first via FormData
      if (chore?.requires_photo && photoFiles[choreId]) {
        const fd = new FormData();
        fd.append('file', photoFiles[choreId]);
        await api(`/api/chores/${choreId}/complete`, {
          method: 'POST',
          body: fd,
        });
      } else {
        await api(`/api/chores/${choreId}/complete`, { method: 'POST' });
      }

      // Show confetti
      setShowConfetti(true);

      // Update local user points if the user object is in context
      if (chore?.points && user) {
        updateUser({ points_balance: user.points_balance + chore.points });
      }

      // Remove photo for this chore
      setPhotoFiles((prev) => {
        const next = { ...prev };
        delete next[choreId];
        return next;
      });

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to complete quest');
    } finally {
      setCompletingId(null);
    }
  };

  // ---- photo handler ----

  const handlePhotoChange = (choreId, file) => {
    setPhotoFiles((prev) => ({ ...prev, [choreId]: file }));
  };

  // ---- status helpers ----

  function statusBadge(status) {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald text-xs font-medium bg-emerald/10 px-2 py-0.5 rounded-full">
          <CheckCheck size={12} /> Verified
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 text-gold text-xs font-medium bg-gold/10 px-2 py-0.5 rounded-full">
          <CheckCircle2 size={12} /> Pending
        </span>
      );
    }
    return null;
  }

  // ---- render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sky" size={28} />
      </div>
    );
  }

  const completedCount = assignments.filter(a => a.status === 'verified' || a.status === 'completed').length;
  const totalCount = assignments.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── Confetti overlay ── */}
      <AnimatePresence>
        {showConfetti && (
          <ConfettiAnimation onComplete={() => setShowConfetti(false)} />
        )}
      </AnimatePresence>

      {/* ── Header with stats ── */}
      <div className="game-panel p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <h1 className="font-heading text-cream text-xl font-extrabold">
            Quest Board
          </h1>
          <div className="flex items-center gap-3">
            <PointCounter value={user?.points_balance ?? 0} />
            <StreakDisplay streak={user?.current_streak ?? 0} />
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-muted text-xs font-medium">Today's Progress</span>
              <span className="text-cream text-xs font-bold">{completedCount}/{totalCount}</span>
            </div>
            <div className="xp-bar">
              <motion.div
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="game-panel p-3 flex items-center gap-2 border-crimson/30 text-crimson text-sm">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Quest cards ── */}
      {assignments.length === 0 && !loading ? (
        <motion.div
          className="game-panel p-10 flex flex-col items-center gap-3 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Sword size={36} className="text-muted" />
          <p className="text-muted text-sm">
            No quests for today. Take a break!
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment, idx) => {
            const chore = assignment.chore;
            if (!chore) return null;

            const isPending = assignment.status === 'pending';
            const isCompleting = completingId === chore.id;
            const diff = difficultyLabel(chore.difficulty);
            const categoryColor = chore.category?.colour || '#3b82f6';

            return (
              <motion.div
                key={assignment.id}
                className="game-panel p-4 transition-all"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                custom={idx}
              >
                <div className="flex items-start gap-3">
                  {/* Category indicator */}
                  <div
                    className="mt-0.5 w-1 h-12 rounded-full flex-shrink-0"
                    style={{ backgroundColor: categoryColor }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="text-cream text-sm font-semibold truncate">
                        {chore.title}
                      </h3>
                      {statusBadge(assignment.status)}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* XP */}
                      <span className="inline-flex items-center gap-1 text-gold text-xs font-semibold">
                        <Star size={12} fill="currentColor" />
                        {chore.points} XP
                      </span>

                      {/* Difficulty */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${diff.color}`}>
                        {diff.text}
                      </span>

                      {/* Category */}
                      {chore.category?.name && (
                        <span className="text-muted text-xs">
                          {chore.category.name}
                        </span>
                      )}
                    </div>

                    {/* Photo upload (if required and still pending) */}
                    {chore.requires_photo && isPending && (
                      <div className="mt-2">
                        <label className="inline-flex items-center gap-1.5 text-xs text-muted cursor-pointer hover:text-cream transition-colors bg-surface-raised px-3 py-1.5 rounded-lg border border-border">
                          <Camera size={14} />
                          <span>
                            {photoFiles[chore.id]
                              ? photoFiles[chore.id].name
                              : 'Attach proof photo'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handlePhotoChange(chore.id, e.target.files?.[0] || null)
                            }
                          />
                        </label>
                      </div>
                    )}

                    {/* Complete button */}
                    {isPending && (
                      <motion.button
                        className={`game-btn game-btn-blue mt-3 w-full sm:w-auto ${
                          isCompleting ? 'opacity-60 cursor-wait' : ''
                        } ${
                          chore.requires_photo && !photoFiles[chore.id]
                            ? 'opacity-40 cursor-not-allowed'
                            : ''
                        }`}
                        variants={completeButtonVariants}
                        whileTap="tap"
                        disabled={
                          isCompleting ||
                          (chore.requires_photo && !photoFiles[chore.id])
                        }
                        onClick={() => handleComplete(assignment)}
                      >
                        {isCompleting ? (
                          <span className="flex items-center gap-2 justify-center">
                            <Loader2 size={14} className="animate-spin" />
                            Completing...
                          </span>
                        ) : (
                          'Complete Quest'
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Spin Wheel Section ── */}
      <div className="pt-2">
        <SpinWheel
          availability={spinAvailability}
          onSpinComplete={() => {
            fetchData();
          }}
        />
      </div>
    </div>
  );
}
