import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import AvatarDisplay from '../components/AvatarDisplay';
import {
  Users,
  Flame,
  Star,
  Sparkles,
  Swords,
  Loader2,
} from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ProgressRing({ completed, total, size = 72 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="absolute inset-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-border/30"
      />
      {total > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={progress >= 1 ? 'text-emerald' : 'text-sky'}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
}

export default function Party() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchParty = useCallback(async () => {
    try {
      const res = await api('/api/stats/party');
      setData(res);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    fetchParty().finally(() => setLoading(false));
  }, [fetchParty]);

  useEffect(() => {
    const handler = () => fetchParty();
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [fetchParty]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Users size={48} className="text-purple animate-pulse" />
        <p className="text-cream text-lg font-bold animate-pulse">
          Assembling the party...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted">
        <Users size={48} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">Could not load party data.</p>
      </div>
    );
  }

  const { members, activity, family_streak, family_total_xp } = data;
  const kids = members.filter((m) => m.role === 'kid');
  const parents = members.filter((m) => m.role !== 'kid');

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="game-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-cream text-lg font-extrabold flex items-center gap-2">
            <Users size={20} className="text-purple" />
            The Party
          </h1>
          <div className="flex items-center gap-1 text-gold text-sm font-bold">
            <Star size={14} className="fill-gold" />
            {family_total_xp.toLocaleString()} XP
          </div>
        </div>

        {family_streak > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 rounded-lg bg-crimson/10 border border-crimson/20">
            <span className="flex items-center gap-2">
              <Flame size={16} className="text-crimson flex-shrink-0" />
              <span className="text-cream text-sm font-medium">
                Family Streak: {family_streak} day{family_streak !== 1 ? 's' : ''}
              </span>
            </span>
            <span className="text-muted text-xs ml-auto">
              Everyone completed at least one quest!
            </span>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="game-panel p-4">
        <h2 className="text-cream text-sm font-bold mb-3">Heroes</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {kids.map((kid) => {
            const ringSize = 72;
            return (
              <div key={kid.id} className="flex flex-col items-center gap-2 min-w-[80px]">
                <div className="relative" style={{ width: ringSize, height: ringSize }}>
                  <ProgressRing
                    completed={kid.today_completed || 0}
                    total={kid.today_total || 0}
                    size={ringSize}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AvatarDisplay config={kid.avatar_config} size="md" name={kid.display_name} animate />
                  </div>
                </div>
                <span className="text-cream text-sm font-medium text-center leading-tight">
                  {kid.display_name}
                </span>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="flex items-center gap-1 text-gold text-xs font-bold">
                    <Star size={10} className="fill-gold" />
                    {kid.points_balance} XP
                  </span>
                  <span className="text-muted text-[11px]">
                    {kid.today_completed || 0}/{kid.today_total || 0} today
                  </span>
                  {kid.current_streak > 0 && (
                    <span className="flex items-center gap-0.5 text-crimson text-[11px]">
                      <Flame size={10} />
                      {kid.current_streak}d streak
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {parents.length > 0 && (
          <>
            <div className="border-t border-border/50 my-3" />
            <div className="flex flex-wrap justify-center gap-4">
              {parents.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1.5">
                  <AvatarDisplay config={p.avatar_config} size="md" name={p.display_name} animate />
                  <span className="text-cream text-sm font-medium">{p.display_name}</span>
                  <span className="text-muted text-[11px] capitalize">{p.role}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Activity Feed */}
      <div className="game-panel p-4">
        <h2 className="text-cream text-sm font-bold mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-gold" />
          Recent Activity
        </h2>

        {activity.length === 0 ? (
          <p className="text-muted text-sm text-center py-6">
            No activity yet. Complete some quests!
          </p>
        ) : (
          <div className="space-y-2">
            {activity.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-surface-raised/20"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {a.type === 'avatar_drop' ? (
                    <Sparkles size={14} className="text-purple" />
                  ) : (
                    <Swords size={14} className="text-sky" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-cream text-sm">
                    <span className="font-medium">{a.user_name}</span>
                    {' '}
                    {a.type === 'avatar_drop' ? (
                      <span className="text-purple">{a.description}</span>
                    ) : (
                      <>
                        <span className="text-muted">{a.description}</span>
                        {a.xp && (
                          <span className="text-gold font-bold ml-1">+{a.xp} XP</span>
                        )}
                      </>
                    )}
                  </p>
                  <p className="text-muted/60 text-xs mt-0.5">{timeAgo(a.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
