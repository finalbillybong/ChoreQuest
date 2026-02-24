import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../hooks/useTheme';
import { themedTitle } from '../utils/questThemeText';
import Modal from '../components/Modal';
import {
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Clock,
  Slash,
  ArrowRightLeft,
  CalendarDays,
  Loader2,
  X,
  Trash2,
} from 'lucide-react';

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function statusStyle(assignment, dayStr) {
  const today = new Date().toISOString().slice(0, 10);

  if (assignment.status === 'verified') {
    return {
      border: 'border-emerald',
      bg: 'bg-emerald/10',
      icon: <CheckCheck size={16} className="text-emerald" />,
    };
  }
  if (assignment.status === 'completed') {
    return {
      border: 'border-emerald',
      bg: 'bg-emerald/5',
      icon: <CheckCheck size={16} className="text-emerald/60" />,
    };
  }
  if (assignment.status === 'skipped') {
    return {
      border: 'border-border',
      bg: 'bg-navy-light/50',
      icon: <Slash size={16} className="text-muted" />,
      textClass: 'line-through text-muted',
    };
  }
  // pending
  if (dayStr < today) {
    // overdue
    return {
      border: 'border-crimson',
      bg: 'bg-crimson/5',
      icon: <Clock size={16} className="text-crimson" />,
    };
  }
  return {
    border: 'border-border',
    bg: '',
    icon: <Clock size={16} className="text-muted" />,
  };
}

export default function Calendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chore_trading_enabled } = useSettings();
  const { colorTheme } = useTheme();
  const isKid = user?.role === 'kid';

  const [startDate, setStartDate] = useState(() => toISO(new Date()));
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Trade modal
  const [tradeModal, setTradeModal] = useState(false);
  const [tradeAssignment, setTradeAssignment] = useState(null);
  const [familyKids, setFamilyKids] = useState([]);
  const [selectedKid, setSelectedKid] = useState('');
  const [tradeSubmitting, setTradeSubmitting] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMsg, setCleanMsg] = useState('');

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // The backend requires week_start to be a Monday. Our 7-day window
      // may span two Mon-Sun weeks, so fetch both if needed.
      const d = new Date(startDate + 'T00:00:00');
      const dayOfWeek = d.getDay(); // 0=Sun..6=Sat
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday1 = addDays(startDate, mondayOffset);

      const data = await api(`/api/calendar?week_start=${monday1}`);
      const byDay = {};
      for (let i = 0; i < 7; i++) {
        const dayKey = addDays(startDate, i);
        byDay[dayKey] = data.days?.[dayKey] || [];
      }

      // If our window extends past Sunday of that week, fetch next week too
      const monday2 = addDays(monday1, 7);
      const lastDay = addDays(startDate, 6);
      const sunday1 = addDays(monday1, 6);
      if (lastDay > sunday1) {
        try {
          const data2 = await api(`/api/calendar?week_start=${monday2}`);
          for (let i = 0; i < 7; i++) {
            const dayKey = addDays(startDate, i);
            if (!byDay[dayKey]?.length && data2.days?.[dayKey]) {
              byDay[dayKey] = data2.days[dayKey];
            }
          }
        } catch { /* second fetch is best-effort */ }
      }
      setAssignments(byDay);
    } catch (err) {
      setError(err.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [startDate]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Live updates via WebSocket
  useEffect(() => {
    const handler = () => { fetchCalendar(); };
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [fetchCalendar]);

  const prevWeek = () => setStartDate(addDays(startDate, -7));
  const nextWeek = () => setStartDate(addDays(startDate, 7));
  const goToday = () => setStartDate(toISO(new Date()));

  const openTrade = async (assignment) => {
    setTradeAssignment(assignment);
    setTradeError('');
    setSelectedKid('');
    setTradeModal(true);
    try {
      const data = await api('/api/stats/kids');
      const kids = (data || []).filter((k) => k.id !== user.id);
      setFamilyKids(kids);
    } catch {
      setFamilyKids([]);
    }
  };

  const submitTrade = async () => {
    if (!selectedKid) {
      setTradeError('Select a hero to trade with');
      return;
    }
    setTradeSubmitting(true);
    setTradeError('');
    try {
      await api('/api/calendar/trade', {
        method: 'POST',
        body: {
          assignment_id: tradeAssignment.id,
          target_user_id: selectedKid,
        },
      });
      setTradeModal(false);
      fetchCalendar();
    } catch (err) {
      setTradeError(err.message || 'Trade failed');
    } finally {
      setTradeSubmitting(false);
    }
  };

  const removeAssignment = async (assignmentId, allFuture = false) => {
    setRemovingId(assignmentId);
    setRemoveTarget(null);
    try {
      const qs = allFuture ? '?all_future=true' : '';
      await api(`/api/calendar/assignments/${assignmentId}${qs}`, { method: 'DELETE' });
      fetchCalendar();
    } catch (err) {
      setError(err.message || 'Failed to remove quest');
    } finally {
      setRemovingId(null);
    }
  };

  const cleanupStale = async () => {
    setCleaning(true);
    setCleanMsg('');
    try {
      const data = await api('/api/chores/cleanup-all-stale', { method: 'POST' });
      setCleanMsg(data.message || 'Cleanup complete');
      fetchCalendar();
    } catch (err) {
      setError(err.message || 'Cleanup failed');
    } finally {
      setCleaning(false);
    }
  };

  const endDate = addDays(startDate, 6);
  const today = toISO(new Date());
  const isAtToday = startDate === today;
  const formatShortDate = (str) => {
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays size={28} className="text-sky" />
          <h1 className="text-cream text-xl font-extrabold leading-relaxed">
            Quest Calendar
          </h1>
        </div>

        {/* Week navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={prevWeek}
              className="p-2 rounded hover:bg-surface-raised transition-colors text-muted hover:text-cream"
              aria-label="Previous week"
            >
              <ChevronLeft size={20} />
            </button>

            <span className="text-cream text-sm min-w-[140px] sm:min-w-[180px] text-center">
              {formatShortDate(startDate)} &ndash; {formatShortDate(endDate)}
            </span>

            <button
              onClick={nextWeek}
              className="p-2 rounded hover:bg-surface-raised transition-colors text-muted hover:text-cream"
              aria-label="Next 7 days"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {!isAtToday && (
            <button onClick={goToday} className="game-btn game-btn-blue">
              Today
            </button>
          )}

          {!isKid && (
            <button
              onClick={cleanupStale}
              disabled={cleaning}
              className="game-btn game-btn-red flex items-center gap-1"
              title="Remove all overdue pending quests and reset exclusions"
            >
              {cleaning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Clean Up
            </button>
          )}
        </div>
      </div>

      {/* Cleanup success message */}
      {cleanMsg && (
        <div className="mb-4 p-3 rounded border-2 border-emerald/40 bg-emerald/10 text-emerald text-sm text-center">
          {cleanMsg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-sm text-center">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-sky animate-spin" />
        </div>
      )}

      {/* Calendar Grid — 7 days starting from startDate */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {Array.from({ length: 7 }, (_, i) => {
            const dayStr = addDays(startDate, i);
            const d = new Date(dayStr + 'T00:00:00');
            const label = SHORT_DAYS[d.getDay()];
            const isToday = dayStr === today;
            const allDayAssignments = assignments[dayStr] || [];
            const dayAssignments = isKid
              ? allDayAssignments.filter((a) => a.user_id === user?.id)
              : allDayAssignments;

            return (
              <div key={dayStr} className="min-w-0">
                {/* Day header */}
                <div
                  className={`text-center py-2 px-1 rounded-t-md border-b-2 ${
                    isToday
                      ? 'bg-sky/10 border-sky text-sky'
                      : 'bg-surface-raised/30 border-border text-muted'
                  }`}
                >
                  <div className="text-xs font-bold tracking-wider">
                    {label}
                  </div>
                  <div className="text-sm mt-1">
                    {new Date(dayStr + 'T00:00:00').getDate()}
                  </div>
                </div>

                {/* Assignments */}
                <div className="space-y-2 mt-2 min-h-[80px]">
                  {dayAssignments.length === 0 && (
                    <p className="text-muted text-xs text-center py-4">
                      No quests
                    </p>
                  )}
                  {dayAssignments.map((a) => {
                    const style = statusStyle(a, dayStr);
                    return (
                      <div
                        key={a.id}
                        className={`game-panel !border-2 ${style.border} ${style.bg} p-2 cursor-pointer hover:brightness-110 transition-all`}
                        onClick={() =>
                          navigate(`/chores/${a.chore_id || a.id}`)
                        }
                      >
                        <div className="flex items-start gap-1.5">
                          {style.icon}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm leading-tight truncate ${
                                style.textClass || 'text-cream'
                              }`}
                            >
                              {themedTitle(a.chore?.title || a.chore_title || 'Quest', colorTheme)}
                            </p>
                            {/* Show assigned kid for parents */}
                            {!isKid && (a.user?.display_name || a.assigned_to_name) && (
                              <p className="text-xs text-purple font-medium mt-0.5 truncate">
                                {a.user?.display_name || a.assigned_to_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Trade button for kids */}
                        {isKid && chore_trading_enabled && a.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTrade(a);
                            }}
                            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-sky hover:text-sky/80 transition-colors"
                          >
                            <ArrowRightLeft size={12} />
                            Trade
                          </button>
                        )}

                        {/* Remove button for parents on pending assignments */}
                        {!isKid && a.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const isRecurring = a.chore?.recurrence && a.chore.recurrence !== 'once';
                              if (isRecurring) {
                                setRemoveTarget(a);
                              } else {
                                removeAssignment(a.id);
                              }
                            }}
                            disabled={removingId === a.id}
                            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-crimson hover:text-crimson/80 transition-colors"
                          >
                            {removingId === a.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <X size={12} />
                            )}
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading &&
        !error &&
        Object.values(assignments).every((arr) => arr.length === 0) && (
          <div className="text-center py-16">
            <CalendarDays size={48} className="text-muted mx-auto mb-4" />
            <p className="text-cream text-lg font-bold">
              No quests scheduled this week
            </p>
            <p className="text-muted text-sm mt-2">
              The quest board is empty. Time to plan new adventures!
            </p>
          </div>
        )}

      {/* Trade Modal */}
      <Modal
        isOpen={tradeModal}
        onClose={() => setTradeModal(false)}
        title="Propose a Trade"
        actions={[
          {
            label: 'Cancel',
            onClick: () => setTradeModal(false),
            className: 'game-btn game-btn-red',
          },
          {
            label: tradeSubmitting ? 'Sending...' : 'Send Trade',
            onClick: submitTrade,
            className: 'game-btn game-btn-blue',
            disabled: tradeSubmitting || !selectedKid,
          },
        ]}
      >
        <div className="space-y-4">
          <p className="text-muted text-sm">
            Trade{' '}
            <span className="text-cream font-bold">
              {themedTitle(tradeAssignment?.chore?.title || tradeAssignment?.chore_title || 'Quest', colorTheme)}
            </span>{' '}
            with another hero:
          </p>

          {tradeError && (
            <div className="p-2 rounded border border-crimson/40 bg-crimson/10 text-crimson text-sm">
              {tradeError}
            </div>
          )}

          {familyKids.length === 0 ? (
            <p className="text-muted text-sm">
              No other heroes found in your party.
            </p>
          ) : (
            <div className="space-y-2">
              {familyKids.map((kid) => (
                <button
                  key={kid.id}
                  onClick={() => setSelectedKid(kid.id)}
                  className={`w-full text-left p-3 rounded border-2 transition-colors ${
                    selectedKid === kid.id
                      ? 'border-sky bg-sky/10 text-sky'
                      : 'border-border text-muted hover:border-cream/30'
                  }`}
                >
                  <span className="text-sm">
                    {kid.display_name || kid.username}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Remove Recurring Quest Modal */}
      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Recurring Quest"
        actions={[
          {
            label: 'Cancel',
            onClick: () => setRemoveTarget(null),
            className: 'game-btn game-btn-blue',
          },
          {
            label: 'Just This One',
            onClick: () => removeAssignment(removeTarget?.id, false),
            className: 'game-btn game-btn-red',
          },
          {
            label: 'All Future',
            onClick: () => removeAssignment(removeTarget?.id, true),
            className: 'game-btn game-btn-red',
          },
        ]}
      >
        <p className="text-muted text-sm">
          <span className="text-cream font-bold">
            {themedTitle(removeTarget?.chore?.title || 'Quest', colorTheme)}
          </span>{' '}
          is a recurring quest{removeTarget?.user?.display_name ? ` for ${removeTarget.user.display_name}` : ''}.
          Remove just this one instance, or all future pending instances for this kid?
        </p>
      </Modal>
    </div>
  );
}
