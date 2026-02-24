import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import AvatarDisplay from '../components/AvatarDisplay';
import { motion } from 'framer-motion';
import { Trophy, Loader2, Flame, Swords } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { user } = useAuth();
  const { leaderboard_enabled } = useSettings();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await api('/api/stats/leaderboard');
      setEntries(data.leaderboard || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    }
  }, []);

  useEffect(() => {
    if (!leaderboard_enabled) {
      setLoading(false);
      return;
    }
    fetchLeaderboard().finally(() => setLoading(false));
  }, [fetchLeaderboard, leaderboard_enabled]);

  // Live updates via WebSocket
  useEffect(() => {
    const handler = () => { fetchLeaderboard(); };
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [fetchLeaderboard]);

  const topScore = entries.length > 0 ? Math.max(...entries.map((e) => e.weekly_xp || e.xp || 0), 1) : 1;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Trophy size={28} className="text-sky" />
        <h1 className="text-cream text-xl font-extrabold">
          Hall of Fame
        </h1>
      </div>

      {/* Disabled by family settings */}
      {!leaderboard_enabled && (
        <div className="game-panel p-10 text-center">
          <Trophy size={48} className="text-muted/20 mx-auto mb-4" />
          <p className="text-cream text-lg font-bold">Leaderboard Disabled</p>
          <p className="text-muted text-sm mt-2">
            The leaderboard has been turned off in family settings.
          </p>
        </div>
      )}

      {/* Error */}
      {leaderboard_enabled && error && (
        <div className="mb-4 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-sm text-center">
          {error}
        </div>
      )}

      {/* Loading */}
      {leaderboard_enabled && loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-sky animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {leaderboard_enabled && !loading && !error && entries.length === 0 && (
        <div className="text-center py-16">
          <Trophy size={48} className="text-cream/10 mx-auto mb-4" />
          <p className="text-cream text-lg font-bold">
            No XP earned this week yet
          </p>
          <p className="text-muted text-sm mt-2">
            Start questing!
          </p>
        </div>
      )}

      {/* Podium - Top 3 */}
      {leaderboard_enabled && !loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.slice(0, 3).map((entry, idx) => {
            const xp = entry.weekly_xp || entry.xp || 0;
            const pct = topScore > 0 ? (xp / topScore) * 100 : 0;
            const isCurrentUser = entry.user_id === user?.id || entry.id === user?.id;
            const questsDone = entry.quests_completed || 0;
            const streak = entry.current_streak || 0;
            const totalXp = entry.total_xp || 0;

            return (
              <div
                key={entry.user_id || entry.id || idx}
                className={`game-panel p-4 flex items-center gap-3 ${
                  isCurrentUser ? '!border-sky' : ''
                }`}
              >
                {/* Medal / Rank */}
                <div className="flex-shrink-0 w-8 sm:w-12 text-center">
                  <span className="text-2xl">{MEDALS[idx]}</span>
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0">
                  <AvatarDisplay
                    config={entry.avatar_config}
                    size="md"
                    name={entry.display_name || entry.username}
                  />
                </div>

                {/* Info + XP bar + stats */}
                <div className="flex-1 min-w-0">
                  <p className="text-cream text-sm font-bold truncate mb-1">
                    {entry.display_name || entry.username}
                  </p>

                  {/* Stats row */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 text-xs flex-wrap">
                    <span className="flex items-center gap-1 text-muted">
                      <Swords size={12} className="text-sky" />
                      {questsDone} quest{questsDone !== 1 ? 's' : ''}
                    </span>
                    {streak > 0 && (
                      <span className="flex items-center gap-1 text-muted">
                        <Flame size={12} className="text-orange-400" />
                        {streak} day{streak !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-muted/60">
                      {totalXp} total XP
                    </span>
                  </div>

                  {/* Animated XP bar */}
                  <div className="xp-bar !h-5">
                    <motion.div
                      className="xp-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: idx * 0.15, ease: 'easeOut' }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-navy font-medium text-xs z-10">
                      {xp} XP this week
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Remaining entries */}
          {entries.length > 3 && (
            <div className="mt-6 space-y-2">
              {entries.slice(3).map((entry, idx) => {
                const rank = idx + 4;
                const xp = entry.weekly_xp || entry.xp || 0;
                const pct = topScore > 0 ? (xp / topScore) * 100 : 0;
                const isCurrentUser = entry.user_id === user?.id || entry.id === user?.id;
                const questsDone = entry.quests_completed || 0;

                return (
                  <div
                    key={entry.user_id || entry.id || rank}
                    className={`game-panel p-3 flex items-center gap-3 ${
                      isCurrentUser ? '!border-sky' : ''
                    }`}
                  >
                    {/* Rank number */}
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className="text-muted text-sm font-bold">
                        #{rank}
                      </span>
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <AvatarDisplay
                        config={entry.avatar_config}
                        size="sm"
                        name={entry.display_name || entry.username}
                      />
                    </div>

                    {/* Name + quests */}
                    <div className="min-w-0 flex-shrink">
                      <p className="text-cream text-sm truncate">
                        {entry.display_name || entry.username}
                      </p>
                      <p className="text-muted text-xs">
                        {questsDone} quest{questsDone !== 1 ? 's' : ''} done
                      </p>
                    </div>

                    {/* XP bar */}
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <div className="xp-bar !h-4">
                        <motion.div
                          className="xp-bar-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: (idx + 3) * 0.1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* XP label */}
                    <span className="flex-shrink-0 font-medium text-sky text-xs text-right ml-auto">
                      {xp} XP
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
