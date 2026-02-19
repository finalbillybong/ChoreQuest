import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Star,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  AlertTriangle,
  Users,
  Sparkles,
  Camera,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import AvatarDisplay from '../components/AvatarDisplay';
import Modal from '../components/Modal';

// ---------- animation variants ----------

const kidCardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, type: 'spring', stiffness: 300, damping: 28 },
  }),
};

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
};

// ---------- component ----------

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // data state
  const [familyStats, setFamilyStats] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);

  // ui state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({}); // { [id]: true }
  const [bonusModalOpen, setBonusModalOpen] = useState(false);

  // bonus form state
  const [bonusKidId, setBonusKidId] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusDescription, setBonusDescription] = useState('');
  const [bonusSubmitting, setBonusSubmitting] = useState(false);
  const [bonusError, setBonusError] = useState('');

  // ---- data fetching ----

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [familyRes, calendarRes] = await Promise.all([
        api('/api/stats/family'),
        api('/api/calendar'),
      ]);

      setFamilyStats(familyRes);

      // Find ALL assignments needing parent approval (status === 'completed')
      const today = new Date().toISOString().slice(0, 10);
      const todayAssignments = (calendarRes.days && calendarRes.days[today]) || [];
      const needsVerification = todayAssignments.filter(
        (a) => a.status === 'completed'
      );
      setPendingVerifications(needsVerification);
    } catch (err) {
      setError(err.message || 'Failed to load family data');
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

  // ---- action helpers ----

  const setActionBusy = (key, busy) => {
    setActionLoading((prev) => ({ ...prev, [key]: busy }));
  };

  // Verify (approve) a chore
  const handleVerifyChore = async (choreId) => {
    const key = `verify-${choreId}`;
    setActionBusy(key, true);
    try {
      await api(`/api/chores/${choreId}/verify`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to verify chore');
    } finally {
      setActionBusy(key, false);
    }
  };

  // Reject (uncomplete) a chore
  const handleRejectChore = async (choreId) => {
    const key = `reject-${choreId}`;
    setActionBusy(key, true);
    try {
      await api(`/api/chores/${choreId}/uncomplete`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to reject chore');
    } finally {
      setActionBusy(key, false);
    }
  };

  // Submit bonus XP
  const handleBonusSubmit = async () => {
    setBonusError('');
    if (!bonusKidId) {
      setBonusError('Select a kid');
      return;
    }
    const amt = parseInt(bonusAmount, 10);
    if (!amt || amt <= 0) {
      setBonusError('Enter a positive XP amount');
      return;
    }
    if (!bonusDescription.trim()) {
      setBonusError('Enter a description');
      return;
    }

    setBonusSubmitting(true);
    try {
      await api(`/api/points/${bonusKidId}/bonus`, {
        method: 'POST',
        body: { amount: amt, description: bonusDescription.trim() },
      });
      // Reset form and close modal
      setBonusKidId('');
      setBonusAmount('');
      setBonusDescription('');
      setBonusModalOpen(false);
      await fetchData();
    } catch (err) {
      setBonusError(err.message || 'Failed to award bonus XP');
    } finally {
      setBonusSubmitting(false);
    }
  };

  // ---- progress bar helper ----

  function ProgressBar({ completed, total }) {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
      <div className="xp-bar">
        <motion.div
          className="xp-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    );
  }

  // ---- render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sky" size={28} />
      </div>
    );
  }

  const hasPendingItems = pendingVerifications.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-cream text-xl font-extrabold">
          Family Overview
        </h1>
        <div className="flex items-center gap-1.5 text-muted text-sm">
          <Users size={16} />
          <span>{familyStats.length} members</span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="game-panel p-3 flex items-center gap-2 border-crimson/30 text-crimson text-sm">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Kid overview cards ── */}
      {familyStats.length === 0 ? (
        <div className="game-panel p-10 text-center">
          <p className="text-muted text-sm">
            No kids in your family yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {familyStats.map((kid, idx) => (
            <motion.div
              key={kid.id}
              className="game-panel p-4 cursor-pointer hover:border-sky/40 transition-colors"
              variants={kidCardVariants}
              initial="hidden"
              animate="visible"
              custom={idx}
              onClick={() => navigate(`/kids/${kid.id}`)}
            >
              <div className="flex items-center gap-3 mb-3">
                <AvatarDisplay
                  config={kid.avatar_config}
                  size="md"
                  name={kid.display_name}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-cream text-sm font-semibold truncate">
                    {kid.display_name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    {/* XP */}
                    <span className="inline-flex items-center gap-1 text-gold text-xs font-semibold">
                      <Star size={12} fill="currentColor" />
                      {kid.points_balance.toLocaleString()} XP
                    </span>
                    {/* Streak */}
                    {kid.current_streak > 0 && (
                      <span className="inline-flex items-center gap-1 text-orange-400 text-xs font-semibold">
                        <Flame size={12} fill="currentColor" />
                        {kid.current_streak}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Today's progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Today</span>
                  <span className="text-cream font-medium">
                    {kid.today_completed}/{kid.today_total} quests
                  </span>
                </div>
                <ProgressBar
                  completed={kid.today_completed}
                  total={kid.today_total}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Pending Quest Verifications ── */}
      {hasPendingItems && (
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <h2 className="text-cream text-base font-bold mb-3">
            Pending Quest Verifications
          </h2>

          <div className="space-y-3">
            {pendingVerifications.map((assignment) => {
              const verifyKey = `verify-${assignment.chore_id}`;
              const rejectKey = `reject-${assignment.chore_id}`;
              const isVerifying = actionLoading[verifyKey];
              const isRejecting = actionLoading[rejectKey];
              const isBusy = isVerifying || isRejecting;

              return (
                <div
                  key={`chore-${assignment.id}`}
                  className="game-panel p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-cream text-sm font-medium truncate">
                        {assignment.chore?.title || 'Chore'}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        by {assignment.user?.display_name || 'Kid'}
                        {assignment.chore?.requires_photo && (
                          <span className="inline-flex items-center gap-1 ml-2 text-sky">
                            <Camera size={10} /> Photo
                          </span>
                        )}
                        <span className="ml-2 text-gold font-medium">+{assignment.chore?.points} XP</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="game-btn game-btn-blue !px-3 !py-2"
                        disabled={isBusy}
                        onClick={() => handleVerifyChore(assignment.chore_id)}
                        title="Approve"
                      >
                        {isVerifying ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                      </button>
                      <button
                        className="game-btn game-btn-red !px-3 !py-2"
                        disabled={isBusy}
                        onClick={() => handleRejectChore(assignment.chore_id)}
                        title="Reject"
                      >
                        {isRejecting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  {/* Show photo proof if attached */}
                  {assignment.photo_proof_path && (
                    <div className="mt-3">
                      <img
                        src={`/api/uploads/${assignment.photo_proof_path}`}
                        alt="Photo proof"
                        className="rounded-lg max-h-48 object-cover border border-border"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── Quick Actions ── */}
      <section className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          className="game-btn game-btn-blue flex items-center gap-2 justify-center flex-1"
          onClick={() => navigate('/chores')}
        >
          <Plus size={16} />
          Create Quest
        </button>
        <button
          className="game-btn game-btn-purple flex items-center gap-2 justify-center flex-1"
          onClick={() => {
            setBonusError('');
            setBonusModalOpen(true);
          }}
        >
          <Sparkles size={16} />
          Award Bonus XP
        </button>
      </section>

      {/* ── Bonus XP Modal ── */}
      <Modal
        isOpen={bonusModalOpen}
        onClose={() => setBonusModalOpen(false)}
        title="Award Bonus XP"
        actions={[
          {
            label: 'Cancel',
            onClick: () => setBonusModalOpen(false),
            className: 'game-btn game-btn-red',
          },
          {
            label: bonusSubmitting ? 'Awarding...' : 'Award XP',
            onClick: handleBonusSubmit,
            disabled: bonusSubmitting,
            className: 'game-btn game-btn-gold',
          },
        ]}
      >
        <div className="space-y-4">
          {bonusError && (
            <div className="p-2 rounded-lg border border-crimson/30 bg-crimson/10 text-crimson text-sm text-center">
              {bonusError}
            </div>
          )}

          {/* Kid selector */}
          <div>
            <label className="block text-cream/80 text-sm font-medium mb-1.5">
              Select Kid
            </label>
            <select
              value={bonusKidId}
              onChange={(e) => setBonusKidId(e.target.value)}
              className="field-input"
            >
              <option value="">-- Choose --</option>
              {familyStats.map((kid) => (
                <option key={kid.id} value={kid.id}>
                  {kid.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-cream/80 text-sm font-medium mb-1.5">
              XP Amount
            </label>
            <input
              type="number"
              min="1"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              placeholder="50"
              className="field-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-cream/80 text-sm font-medium mb-1.5">
              Reason
            </label>
            <input
              type="text"
              value={bonusDescription}
              onChange={(e) => setBonusDescription(e.target.value)}
              placeholder="Great job helping out!"
              className="field-input"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
