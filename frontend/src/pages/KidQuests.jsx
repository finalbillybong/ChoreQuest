import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2,
  Star,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  Swords,
  SkipForward,
} from 'lucide-react';
import { api } from '../api/client';
import AvatarDisplay from '../components/AvatarDisplay';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-muted', icon: Clock },
  completed: { label: 'Awaiting Approval', color: 'text-gold', icon: Clock },
  verified: { label: 'Approved', color: 'text-emerald', icon: CheckCircle2 },
  skipped: { label: 'Skipped', color: 'text-muted/50', icon: SkipForward },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 },
  }),
};

export default function KidQuests() {
  const { kidId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const res = await api(`/api/stats/family/${kidId}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load kid data');
    } finally {
      setLoading(false);
    }
  }, [kidId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [fetchData]);

  const setActionBusy = (key, busy) => {
    setActionLoading((prev) => ({ ...prev, [key]: busy }));
  };

  const handleVerify = async (choreId) => {
    const key = `verify-${choreId}`;
    setActionBusy(key, true);
    try {
      await api(`/api/chores/${choreId}/verify`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to verify quest');
    } finally {
      setActionBusy(key, false);
    }
  };

  const handleReject = async (choreId) => {
    const key = `reject-${choreId}`;
    setActionBusy(key, true);
    try {
      await api(`/api/chores/${choreId}/uncomplete`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to reject quest');
    } finally {
      setActionBusy(key, false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sky" size={28} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="game-panel p-10 text-center">
          <XCircle size={48} className="mx-auto text-crimson mb-4" />
          <p className="text-cream text-xl font-extrabold mb-2">Error</p>
          <p className="text-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kid, assignments } = data;
  const completedCount = assignments.filter(
    (a) => a.status === 'completed' || a.status === 'verified'
  ).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Kid header */}
      <div className="game-panel p-4">
        <div className="flex items-center gap-4">
          <AvatarDisplay
            config={kid.avatar_config}
            size="lg"
            name={kid.display_name}
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-cream text-xl font-extrabold truncate">
              {kid.display_name}'s Quests
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="inline-flex items-center gap-1 text-gold text-sm font-semibold">
                <Star size={14} fill="currentColor" />
                {kid.points_balance.toLocaleString()} XP
              </span>
              {kid.current_streak > 0 && (
                <span className="inline-flex items-center gap-1 text-orange-400 text-sm font-semibold">
                  <Flame size={14} fill="currentColor" />
                  {kid.current_streak} day streak
                </span>
              )}
            </div>
            <p className="text-muted text-xs mt-1">
              {completedCount}/{assignments.length} quests done today
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="game-panel p-3 border-crimson/30 text-crimson text-sm">
          {error}
        </div>
      )}

      {/* Quest list */}
      {assignments.length === 0 ? (
        <div className="game-panel p-10 text-center">
          <Swords size={40} className="mx-auto text-muted mb-4" />
          <p className="text-muted text-sm">
            No quests assigned for today.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a, idx) => {
            const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const isCompleted = a.status === 'completed';
            const isVerified = a.status === 'verified';
            const verifyKey = `verify-${a.chore_id}`;
            const rejectKey = `reject-${a.chore_id}`;
            const isVerifying = actionLoading[verifyKey];
            const isRejecting = actionLoading[rejectKey];
            const isBusy = isVerifying || isRejecting;

            return (
              <motion.div
                key={a.id}
                className={`game-panel p-4 ${isVerified ? 'opacity-50' : ''}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                custom={idx}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => navigate(`/chores/${a.chore_id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-cream text-sm font-bold truncate">
                        {a.chore.title}
                      </h3>
                      {a.chore.requires_photo && (
                        <Camera size={12} className="text-sky flex-shrink-0" />
                      )}
                    </div>
                    {a.chore.description && (
                      <p className="text-muted text-xs line-clamp-1 mb-1.5">
                        {a.chore.description}
                      </p>
                    )}
                    <div className="flex items-center flex-wrap gap-3">
                      <span className="flex items-center gap-1 text-gold text-xs font-semibold">
                        <Star size={11} fill="currentColor" />
                        {a.chore.points} XP
                      </span>
                      {a.chore.category && (
                        <span className="text-muted text-xs capitalize">
                          {a.chore.category}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                        <StatusIcon size={12} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Approve / Reject buttons for completed quests */}
                  {isCompleted && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="game-btn game-btn-blue !px-3 !py-2"
                        disabled={isBusy}
                        onClick={() => handleVerify(a.chore_id)}
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
                        onClick={() => handleReject(a.chore_id)}
                        title="Reject"
                      >
                        {isRejecting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Verified checkmark */}
                  {isVerified && (
                    <CheckCircle2 size={20} className="text-emerald flex-shrink-0" />
                  )}
                </div>

                {/* Photo proof */}
                {a.photo_proof_path && isCompleted && (
                  <div className="mt-3">
                    <img
                      src={`/api/uploads/${a.photo_proof_path}`}
                      alt="Photo proof"
                      className="rounded-lg max-h-48 object-cover border border-border"
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
