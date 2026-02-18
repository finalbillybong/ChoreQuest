import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Star,
  CheckCircle2,
  XCircle,
  Plus,
  Gift,
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
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: 'spring', stiffness: 260, damping: 24 },
  }),
};

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

// ---------- component ----------

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // data state
  const [familyStats, setFamilyStats] = useState([]);
  const [pendingRedemptions, setPendingRedemptions] = useState([]);
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

      const [familyRes, redemptionsRes, calendarRes] = await Promise.all([
        api('/api/stats/family'),
        api('/api/rewards/redemptions?status=pending'),
        api('/api/calendar'),
      ]);

      setFamilyStats(familyRes);
      setPendingRedemptions(redemptionsRes);

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

  // Approve a reward redemption
  const handleApproveRedemption = async (redemptionId) => {
    const key = `approve-${redemptionId}`;
    setActionBusy(key, true);
    try {
      await api(`/api/rewards/redemptions/${redemptionId}/approve`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to approve redemption');
    } finally {
      setActionBusy(key, false);
    }
  };

  // Deny a reward redemption
  const handleDenyRedemption = async (redemptionId) => {
    const key = `deny-${redemptionId}`;
    setActionBusy(key, true);
    try {
      await api(`/api/rewards/redemptions/${redemptionId}/deny`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to deny redemption');
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
      <div className="w-full bg-navy rounded-full h-2.5 overflow-hidden">
        <motion.div
          className="h-full bg-emerald rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    );
  }

  // ---- render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  const hasPendingItems = pendingRedemptions.length > 0 || pendingVerifications.length > 0;

  const inputClass =
    'w-full bg-navy border-2 border-[#2a2a4a] text-cream p-3 rounded font-body text-lg ' +
    'placeholder:text-cream/30 focus:border-gold focus:outline-none transition-colors';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-gold text-base sm:text-lg leading-relaxed">
          Family Overview
        </h1>
        <div className="flex items-center gap-1 text-cream/40">
          <Users size={18} />
          <span className="font-body text-base">{familyStats.length} kids</span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="game-panel p-3 flex items-center gap-2 border-crimson/40 text-crimson text-base">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Kid overview cards ── */}
      {familyStats.length === 0 ? (
        <div className="game-panel p-8 text-center">
          <p className="font-heading text-cream/50 text-[11px] leading-relaxed">
            No kids in your family yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {familyStats.map((kid, idx) => (
            <motion.div
              key={kid.id}
              className="game-panel p-4"
              variants={kidCardVariants}
              initial="hidden"
              animate="visible"
              custom={idx}
            >
              <div className="flex items-center gap-3 mb-3">
                <AvatarDisplay
                  config={kid.avatar_config}
                  size="md"
                  name={kid.display_name}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-cream text-[11px] leading-relaxed truncate">
                    {kid.display_name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    {/* XP */}
                    <span className="flex items-center gap-1 text-gold font-body text-base">
                      <Star size={14} fill="currentColor" />
                      {kid.points_balance.toLocaleString()} XP
                    </span>
                    {/* Streak */}
                    {kid.current_streak > 0 && (
                      <span className="flex items-center gap-1 text-orange-400 font-body text-base">
                        <Flame size={14} fill="currentColor" />
                        {kid.current_streak}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Today's progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cream/60 font-body text-base">Today</span>
                  <span className="text-cream font-body text-base">
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

      {/* ── Pending Verifications & Redemptions ── */}
      {hasPendingItems && (
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <h2 className="font-heading text-gold text-xs mb-3">
            Pending Approvals
          </h2>

          <div className="space-y-3">
            {/* Chore verifications */}
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
                      <p className="text-cream font-body text-lg truncate">
                        {assignment.chore?.title || 'Chore'}
                      </p>
                      <p className="text-cream/50 font-body text-base">
                        by {assignment.user?.display_name || 'Kid'}
                        {assignment.chore?.requires_photo && (
                          <span className="inline-flex items-center gap-1 ml-2 text-sky">
                            <Camera size={12} /> Photo attached
                          </span>
                        )}
                        <span className="ml-2 text-gold">+{assignment.chore?.points} XP</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="game-btn game-btn-gold !px-3 !py-2"
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
                        className="rounded-lg max-h-48 object-cover border border-[#2a2a4a]"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Reward redemptions */}
            {pendingRedemptions.map((redemption) => {
              const approveKey = `approve-${redemption.id}`;
              const denyKey = `deny-${redemption.id}`;
              const isApproving = actionLoading[approveKey];
              const isDenying = actionLoading[denyKey];

              return (
                <div
                  key={`redemption-${redemption.id}`}
                  className="game-panel p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-cream font-body text-lg truncate">
                      {redemption.reward?.title || 'Reward'}
                    </p>
                    <p className="text-cream/50 font-body text-base">
                      by {redemption.user?.display_name || 'Kid'} &middot;{' '}
                      {redemption.points_spent} XP
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      className="game-btn game-btn-gold !px-3 !py-2"
                      disabled={isApproving || isDenying}
                      onClick={() => handleApproveRedemption(redemption.id)}
                      title="Approve"
                    >
                      {isApproving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                    </button>
                    <button
                      className="game-btn game-btn-red !px-3 !py-2"
                      disabled={isApproving || isDenying}
                      onClick={() => handleDenyRedemption(redemption.id)}
                      title="Deny"
                    >
                      {isDenying ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <XCircle size={16} />
                      )}
                    </button>
                  </div>
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
            <div className="p-2 rounded border border-crimson/40 bg-crimson/10 text-crimson text-base text-center">
              {bonusError}
            </div>
          )}

          {/* Kid selector */}
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
              Select Kid
            </label>
            <select
              value={bonusKidId}
              onChange={(e) => setBonusKidId(e.target.value)}
              className={inputClass}
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
            <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
              XP Amount
            </label>
            <input
              type="number"
              min="1"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              placeholder="50"
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gold/80 text-sm font-heading mb-2 tracking-wide">
              Reason
            </label>
            <input
              type="text"
              value={bonusDescription}
              onChange={(e) => setBonusDescription(e.target.value)}
              placeholder="Great job helping out!"
              className={inputClass}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
