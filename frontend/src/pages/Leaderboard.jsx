import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import AvatarDisplay from '../components/AvatarDisplay';
import { motion } from 'framer-motion';
import { Trophy, Loader2 } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { user } = useAuth();
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
    fetchLeaderboard().finally(() => setLoading(false));
  }, [fetchLeaderboard]);

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
        <Trophy size={28} className="text-gold" />
        <h1 className="font-heading text-gold text-xs sm:text-sm leading-relaxed">
          Hall of Fame
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-base text-center">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-gold animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div className="text-center py-16">
          <Trophy size={48} className="text-cream/10 mx-auto mb-4" />
          <p className="font-heading text-cream/30 text-[10px]">
            No XP earned this week yet
          </p>
          <p className="text-cream/20 font-body text-base mt-2">
            Start questing!
          </p>
        </div>
      )}

      {/* Podium - Top 3 */}
      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.slice(0, 3).map((entry, idx) => {
            const xp = entry.weekly_xp || entry.xp || 0;
            const pct = topScore > 0 ? (xp / topScore) * 100 : 0;
            const isCurrentUser = entry.user_id === user?.id || entry.id === user?.id;

            return (
              <div
                key={entry.user_id || entry.id || idx}
                className={`game-panel p-4 flex items-center gap-4 ${
                  isCurrentUser ? '!border-gold' : ''
                }`}
              >
                {/* Medal / Rank */}
                <div className="flex-shrink-0 w-12 text-center">
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

                {/* Info + XP bar */}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-cream text-[10px] truncate mb-2">
                    {entry.display_name || entry.username}
                  </p>

                  {/* Animated XP bar */}
                  <div className="relative h-5 bg-[#2a2a4a] rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold to-gold/70 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: idx * 0.15, ease: 'easeOut' }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-navy font-heading text-[8px] z-10">
                      {xp} XP
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

                return (
                  <div
                    key={entry.user_id || entry.id || rank}
                    className={`game-panel p-3 flex items-center gap-3 ${
                      isCurrentUser ? '!border-gold' : ''
                    }`}
                  >
                    {/* Rank number */}
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className="font-heading text-cream/50 text-[10px]">
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

                    {/* Name */}
                    <p className="font-body text-cream text-lg truncate flex-shrink min-w-0">
                      {entry.display_name || entry.username}
                    </p>

                    {/* XP bar */}
                    <div className="flex-1 min-w-0 ml-auto max-w-[200px]">
                      <div className="relative h-4 bg-[#2a2a4a] rounded-full overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold/80 to-gold/50 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: (idx + 3) * 0.1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* XP label */}
                    <span className="flex-shrink-0 font-heading text-gold text-[9px] min-w-[60px] text-right">
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
