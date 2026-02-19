import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
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
} from 'lucide-react';

/** Return the Monday of the week containing `date`, as an ISO date string (YYYY-MM-DD). */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
  const isKid = user?.role === 'kid';

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
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

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api(`/api/calendar?week_start=${weekStart}`);
      // Use the days map returned by the backend, ensuring all 7 days exist
      const byDay = {};
      for (let i = 0; i < 7; i++) {
        const dayKey = addDays(weekStart, i);
        byDay[dayKey] = data.days?.[dayKey] || [];
      }
      setAssignments(byDay);
    } catch (err) {
      setError(err.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Live updates via WebSocket
  useEffect(() => {
    const handler = () => { fetchCalendar(); };
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [fetchCalendar]);

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const thisWeek = () => setWeekStart(getMonday(new Date()));

  const openTrade = async (assignment) => {
    setTradeAssignment(assignment);
    setTradeError('');
    setSelectedKid('');
    setTradeModal(true);
    try {
      const data = await api('/api/admin/users');
      const kids = (data.users || data || []).filter(
        (u) => u.role === 'kid' && u.id !== user.id && u.is_active !== false
      );
      setFamilyKids(kids);
    } catch {
      // Fallback: try family endpoint
      try {
        const data = await api('/api/family/members');
        const kids = (data || []).filter(
          (u) => u.role === 'kid' && u.id !== user.id
        );
        setFamilyKids(kids);
      } catch {
        setFamilyKids([]);
      }
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

  const weekEnd = addDays(weekStart, 6);
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
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-2 rounded hover:bg-surface-raised transition-colors text-muted hover:text-cream"
            aria-label="Previous week"
          >
            <ChevronLeft size={20} />
          </button>

          <span className="text-cream text-sm min-w-[180px] text-center">
            {formatShortDate(weekStart)} &ndash; {formatShortDate(weekEnd)}
          </span>

          <button
            onClick={nextWeek}
            className="p-2 rounded hover:bg-surface-raised transition-colors text-muted hover:text-cream"
            aria-label="Next week"
          >
            <ChevronRight size={20} />
          </button>

          <button onClick={thisWeek} className="game-btn game-btn-blue ml-2">
            This Week
          </button>
        </div>
      </div>

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

      {/* Calendar Grid — today first, then future days, then past days */}
      {!loading && (() => {
        const today = new Date().toISOString().slice(0, 10);
        // Build ordered indices: today first, then the rest of the week
        const todayIdx = (() => {
          for (let i = 0; i < 7; i++) {
            if (addDays(weekStart, i) === today) return i;
          }
          return 0; // fallback to Monday if today isn't in this week
        })();
        const orderedIndices = [];
        for (let n = 0; n < 7; n++) {
          orderedIndices.push((todayIdx + n) % 7);
        }
        return (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {orderedIndices.map((i) => {
            const label = DAY_LABELS[i];
            const dayStr = addDays(weekStart, i);
            const isToday = dayStr === today;
            const dayAssignments = assignments[dayStr] || [];

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
                              {a.chore?.title || a.chore_title || 'Quest'}
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
                        {isKid && a.status === 'pending' && (
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
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        );
      })()}

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
              {tradeAssignment?.chore?.title || tradeAssignment?.chore_title || 'Quest'}
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
    </div>
  );
}
