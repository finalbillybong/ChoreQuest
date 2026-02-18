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

function difficultyStars(difficulty) {
  switch (difficulty) {
    case 'easy':
      return [1];
    case 'medium':
      return [1, 2];
    case 'hard':
      return [1, 2, 3];
    case 'expert':
      return null; // render skull instead
    default:
      return [1];
  }
}

// ---------- card animation variants ----------

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, type: 'spring', stiffness: 260, damping: 24 },
  }),
};

const completeButtonVariants = {
  idle: { scale: 1 },
  tap: { scale: 0.92 },
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
        <span className="flex items-center gap-1 text-emerald font-heading text-[10px]">
          <CheckCheck size={16} /> Verified
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="flex items-center gap-1 text-yellow-400 font-heading text-[10px]">
          <CheckCircle2 size={16} /> Awaiting Approval
        </span>
      );
    }
    return null;
  }

  // ---- render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Confetti overlay ── */}
      <AnimatePresence>
        {showConfetti && (
          <ConfettiAnimation onComplete={() => setShowConfetti(false)} />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-gold text-base sm:text-lg leading-relaxed">
          Quest Board
        </h1>

        <div className="flex items-center gap-5">
          {/* XP Balance */}
          <div className="flex items-center gap-2">
            <Star className="text-gold" size={22} fill="currentColor" />
            <PointCounter value={user?.points_balance ?? 0} />
          </div>

          {/* Streak */}
          <StreakDisplay streak={user?.current_streak ?? 0} />
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="game-panel p-3 flex items-center gap-2 border-crimson/40 text-crimson text-base">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Quest cards ── */}
      {assignments.length === 0 && !loading ? (
        <motion.div
          className="game-panel p-8 flex flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Sword size={40} className="text-cream/30" />
          <p className="font-heading text-cream/50 text-[11px] leading-relaxed">
            No quests for today!
            <br />
            Take a break, adventurer.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment, idx) => {
            const chore = assignment.chore;
            if (!chore) return null;

            const isPending = assignment.status === 'pending';
            const isCompleting = completingId === chore.id;
            const stars = difficultyStars(chore.difficulty);
            const categoryColor = chore.category?.colour || '#64dfdf';

            return (
              <motion.div
                key={assignment.id}
                className="game-panel p-4"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                custom={idx}
              >
                <div className="flex items-start gap-3">
                  {/* Category dot */}
                  <div
                    className="mt-1 w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: categoryColor }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-heading text-cream text-[11px] leading-relaxed truncate">
                        {chore.title}
                      </h3>
                      {statusBadge(assignment.status)}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-sm text-cream/50">
                      {/* XP */}
                      <span className="flex items-center gap-1 text-gold font-body text-base">
                        <Star size={14} fill="currentColor" />
                        {chore.points} XP
                      </span>

                      {/* Difficulty */}
                      <span className="flex items-center gap-0.5">
                        {stars ? (
                          stars.map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className="text-purple"
                              fill="currentColor"
                            />
                          ))
                        ) : (
                          <Skull size={14} className="text-crimson" />
                        )}
                      </span>
                    </div>

                    {/* Photo upload (if required and still pending) */}
                    {chore.requires_photo && isPending && (
                      <div className="mt-2">
                        <label className="flex items-center gap-2 text-sm text-cream/60 cursor-pointer hover:text-cream transition-colors">
                          <Camera size={16} />
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
                        className={`game-btn game-btn-gold mt-3 w-full sm:w-auto ${
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
      <div className="pt-4">
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
