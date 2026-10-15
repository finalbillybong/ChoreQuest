import { toLocalISODate } from '../utils/date';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  MessageSquare,
  Send,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { themedTitle } from '../utils/questThemeText';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import AvatarDisplay from '../components/AvatarDisplay';
import Modal from '../components/Modal';

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { colorTheme } = useTheme();

  const [familyStats, setFamilyStats] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [bonusModalOpen, setBonusModalOpen] = useState(false);

  const [feedbackText, setFeedbackText] = useState({});
  const [feedbackSending, setFeedbackSending] = useState({});

  const [bonusKidId, setBonusKidId] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusDescription, setBonusDescription] = useState('');
  const [bonusSubmitting, setBonusSubmitting] = useState(false);
  const [bonusError, setBonusError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [familyRes, calendarRes] = await Promise.all([
        api('/api/stats/family'),
        api('/api/calendar'),
      ]);

      setFamilyStats(familyRes);

      const today = toLocalISODate();
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

  useEffect(() => {
    const handler = () => { fetchData(); };
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [fetchData]);

  const setActionBusy = (key, busy) => {
    setActionLoading((prev) => ({ ...prev, [key]: busy }));
  };

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

  const handleSendFeedback = async (assignmentId) => {
    const text = feedbackText[assignmentId]?.trim();
    if (!text) return;
    setFeedbackSending(prev => ({ ...prev, [assignmentId]: true }));
    try {
      await api(`/api/chores/assignments/${assignmentId}/feedback`, {
        method: 'POST',
        body: { feedback: text },
      });
      setFeedbackText(prev => ({ ...prev, [assignmentId]: '' }));
    } catch { /* ignore */ } finally {
      setFeedbackSending(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  function ProgressBar({ completed, total }) {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
      <div className="xp-bar">
        <div
          className="xp-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-accent" size={24} />
      </div>
    );
  }

  const hasPendingItems = pendingVerifications.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-cream text-lg font-semibold">
          Family Overview
        </h1>
        <div className="flex items-center gap-1.5 text-muted text-sm">
          <Users size={14} />
          <span>{familyStats.length} members</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="game-panel p-3 flex items-center gap-2 border-crimson/30 text-crimson text-sm">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Kid overview cards */}
      {familyStats.length === 0 ? (
        <div className="game-panel p-8 text-center">
          <p className="text-muted text-sm">
            No kids in your family yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {familyStats.map((kid) => (
            <div
              key={kid.id}
              className="game-panel p-4 cursor-pointer hover:border-accent/40 transition-colors"
              onClick={() => navigate(`/kids/${kid.id}`)}
            >
              <div className="flex items-center gap-3 mb-3">
                <AvatarDisplay
                  config={kid.avatar_config}
                  size="md"
                  name={kid.display_name}
                  animate
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-cream text-sm font-medium truncate">
                    {kid.display_name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-gold text-xs font-medium">
                      <Star size={11} fill="currentColor" />
                      {kid.points_balance.toLocaleString()} XP
                    </span>
                    {kid.current_streak > 0 && (
                      <span className="inline-flex items-center gap-1 text-orange-400 text-xs font-medium">
                        <Flame size={11} fill="currentColor" />
                        {kid.current_streak}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
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
            </div>
          ))}
        </div>
      )}

      {/* Pending Verifications */}
      {hasPendingItems && (
        <section>
          <h2 className="text-cream text-sm font-semibold mb-2">
            Pending Verifications
          </h2>

          <div className="space-y-2">
            {pendingVerifications.map((assignment) => {
              const verifyKey = `verify-${assignment.chore_id}`;
              const rejectKey = `reject-${assignment.chore_id}`;
              const isVerifying = actionLoading[verifyKey];
              const isRejecting = actionLoading[rejectKey];
              const isBusy = isVerifying || isRejecting;

              return (
                <div
                  key={`chore-${assignment.id}`}
                  className="game-panel p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-cream text-sm font-medium truncate cursor-pointer hover:text-accent transition-colors"
                        onClick={() => navigate(`/chores/${assignment.chore_id}`)}
                      >
                        {themedTitle(assignment.chore?.title || 'Chore', colorTheme)}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        by {assignment.user?.display_name || 'Kid'}
                        {assignment.chore?.requires_photo && (
                          <span className="inline-flex items-center gap-1 ml-2 text-accent">
                            <Camera size={10} /> Photo
                          </span>
                        )}
                        <span className="ml-2 text-gold font-medium">+{assignment.chore?.points} XP</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        className="game-btn game-btn-blue !px-2.5 !py-1.5"
                        disabled={isBusy}
                        onClick={() => handleVerifyChore(assignment.chore_id)}
                        title="Approve"
                      >
                        {isVerifying ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                      </button>
                      <button
                        className="game-btn game-btn-red !px-2.5 !py-1.5"
                        disabled={isBusy}
                        onClick={() => handleRejectChore(assignment.chore_id)}
                        title="Reject"
                      >
                        {isRejecting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <XCircle size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                  {assignment.photo_proof_path && (
                    <div className="mt-2">
                      <img
                        src={`/api/uploads/${assignment.photo_proof_path}`}
                        alt="Photo proof"
                        className="rounded-md max-h-48 object-cover border border-border"
                      />
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <MessageSquare size={12} className="text-muted flex-shrink-0" />
                    <input
                      type="text"
                      value={feedbackText[assignment.id] || ''}
                      onChange={e => setFeedbackText(prev => ({ ...prev, [assignment.id]: e.target.value }))}
                      placeholder="Leave feedback..."
                      maxLength={500}
                      className="field-input !py-1.5 !text-xs flex-1"
                    />
                    <button
                      onClick={() => handleSendFeedback(assignment.id)}
                      disabled={feedbackSending[assignment.id] || !feedbackText[assignment.id]?.trim()}
                      className="game-btn game-btn-blue !py-1.5 !px-2 flex-shrink-0"
                      title="Send feedback"
                    >
                      {feedbackSending[assignment.id] ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}
                    </button>
                  </div>
                  {assignment.feedback && (
                    <p className="mt-1.5 ml-5 text-muted text-xs italic">
                      Feedback: {assignment.feedback}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          className="game-btn game-btn-blue flex items-center gap-2 justify-center flex-1"
          onClick={() => navigate('/chores')}
        >
          <Plus size={14} />
          Create Quest
        </button>
        <button
          className="game-btn game-btn-purple flex items-center gap-2 justify-center flex-1"
          onClick={() => {
            setBonusError('');
            setBonusModalOpen(true);
          }}
        >
          <Sparkles size={14} />
          Award Bonus XP
        </button>
      </section>

      {/* Bonus XP Modal */}
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
        <div className="space-y-3">
          {bonusError && (
            <div className="p-2 rounded-md border border-crimson/30 bg-crimson/10 text-crimson text-sm">
              {bonusError}
            </div>
          )}

          <div>
            <label className="block text-cream text-sm font-medium mb-1">
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

          <div>
            <label className="block text-cream text-sm font-medium mb-1">
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

          <div>
            <label className="block text-cream text-sm font-medium mb-1">
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
