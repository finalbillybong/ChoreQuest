import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronRight,
  Heart,
  HandHeart,
  Gamepad2,
  ShieldOff,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../hooks/useTheme';
import { themedTitle } from '../utils/questThemeText';
import PointCounter from '../components/PointCounter';
import StreakDisplay from '../components/StreakDisplay';
import SpinWheel from '../components/SpinWheel';
import ConfettiAnimation from '../components/ConfettiAnimation';
import RankBadge from '../components/RankBadge';
import PetLevelBadge from '../components/PetLevelBadge';
import { QuestBoardOverlay, QuestBoardPageGlow, QuestBoardParticles, QuestBoardDecorations, QuestBoardTitle, BOARD_THEMES, getTheme } from '../components/QuestBoardTheme';

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

function difficultyLabel(difficulty) {
  switch (difficulty) {
    case 'easy':
      return { text: 'Easy', color: 'text-emerald bg-emerald/10 border-emerald/20' };
    case 'medium':
      return { text: 'Medium', color: 'text-gold bg-gold/10 border-gold/20' };
    case 'hard':
      return { text: 'Hard', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' };
    case 'expert':
      return { text: 'Expert', color: 'text-crimson bg-crimson/10 border-crimson/20' };
    default:
      return { text: 'Easy', color: 'text-emerald bg-emerald/10 border-emerald/20' };
  }
}

// ---------- card animation variants ----------

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 },
  }),
};

const completeButtonVariants = {
  idle: { scale: 1 },
  tap: { scale: 0.96 },
};

// ---------- component ----------

export default function KidDashboard() {
  const { user, updateUser } = useAuth();
  const { spin_wheel_enabled } = useSettings();
  const { colorTheme } = useTheme();
  const navigate = useNavigate();

  // data state
  const [assignments, setAssignments] = useState([]);
  const [chores, setChores] = useState([]);
  const [spinAvailability, setSpinAvailability] = useState(null);
  const [myStats, setMyStats] = useState(null);

  // ui state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Pet interactions
  const [petInteracting, setPetInteracting] = useState(null);
  const [petMessage, setPetMessage] = useState('');

  // Board theme — stored in localStorage
  const [boardTheme, setBoardTheme] = useState(() =>
    localStorage.getItem('chorequest-board-theme') || 'default'
  );
  const changeBoardTheme = (id) => {
    setBoardTheme(id);
    localStorage.setItem('chorequest-board-theme', id);
    setShowThemePicker(false);
  };

  // ---- data fetching ----

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const monday = getMondayOfThisWeek();
      const today = todayISO();

      const promises = [
        api('/api/chores'),
        api(`/api/calendar?week_start=${monday}`),
      ];
      if (spin_wheel_enabled) {
        promises.push(api('/api/spin/availability'));
      }
      promises.push(api('/api/stats/me'));

      const results = await Promise.all(promises);
      const choresRes = results[0];
      const calendarRes = results[1];
      const spinRes = spin_wheel_enabled ? results[2] : null;
      const statsRes = results[spin_wheel_enabled ? 3 : 2];
      if (statsRes) setMyStats(statsRes);

      setChores(choresRes);

      // Filter calendar assignments to today and this user only
      const allToday = (calendarRes.days && calendarRes.days[today]) || [];
      const todayAssignments = allToday.filter((a) => a.user_id === user?.id);
      setAssignments(todayAssignments);

      setSpinAvailability(spinRes);
    } catch (err) {
      setError(err.message || 'Failed to load quest data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, spin_wheel_enabled]);

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


  // ---- pet interaction ----
  const handlePetInteraction = async (action) => {
    setPetInteracting(action);
    setPetMessage('');
    try {
      const res = await api('/api/pets/interact', { method: 'POST', body: { action } });
      const labels = { feed: 'Fed', pet: 'Petted', play: 'Played with' };
      setPetMessage(`${labels[action]} your pet! +${res.xp_awarded} XP${res.levelup ? ' - LEVEL UP!' : ''} (${res.interactions_remaining} left today)`);
      await fetchData();
    } catch (err) {
      setPetMessage(err.message || 'Could not interact with pet');
    } finally {
      setPetInteracting(null);
      setTimeout(() => setPetMessage(''), 4000);
    }
  };

  const hasPet = !!myStats?.pet;

  // ---- render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sky" size={28} />
      </div>
    );
  }

  const completedCount = assignments.filter(a => a.status === 'verified' || a.status === 'completed').length;
  const totalCount = assignments.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const activeTheme = getTheme(boardTheme);

  return (
    <div className={`max-w-2xl mx-auto space-y-5 quest-board-${boardTheme}`}>
      {/* ── Page-level ambient glow ── */}
      <QuestBoardPageGlow themeId={boardTheme} />

      {/* ── Confetti overlay ── */}
      <AnimatePresence>
        {showConfetti && (
          <ConfettiAnimation onComplete={() => setShowConfetti(false)} />
        )}
      </AnimatePresence>

      {/* ── Header with stats ── */}
      <div className="game-panel p-5 relative overflow-hidden">
        <QuestBoardOverlay themeId={boardTheme} />
        <QuestBoardParticles themeId={boardTheme} />
        <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-cream text-xl font-extrabold">
              <QuestBoardTitle themeId={boardTheme}>Quest Board</QuestBoardTitle>
            </h1>
            <button
              onClick={() => setShowThemePicker((v) => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-border hover:border-accent hover:bg-accent/10 text-cream transition-all text-base"
              title="Change board theme"
            >
              {BOARD_THEMES.find((t) => t.id === boardTheme)?.icon || '\u2694\uFE0F'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <PointCounter value={user?.points_balance ?? 0} />
            <StreakDisplay streak={user?.current_streak ?? 0} />
          </div>
        </div>

        {/* Board theme decorations */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <QuestBoardDecorations themeId={boardTheme} />
          {myStats?.rank && <RankBadge rank={myStats.rank} size="sm" />}
          {myStats?.pet && <PetLevelBadge pet={myStats.pet} compact />}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-muted text-xs font-medium">Today's Progress</span>
              <span className="text-cream text-xs font-bold">{completedCount}/{totalCount}</span>
            </div>
            <div className="xp-bar">
              <motion.div
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        )}
        </div>{/* close z-10 */}
      </div>

      {/* ── Board Theme Picker ── */}
      {showThemePicker && (
        <div className="game-panel p-4">
          <h3 className="text-cream text-xs font-bold mb-3">Choose Board Theme</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BOARD_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => changeBoardTheme(t.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                  boardTheme === t.id
                    ? 'border-accent bg-accent/10'
                    : 'border-border/50 bg-surface-raised/30 hover:border-border-light'
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <div>
                  <p className="text-cream text-xs font-medium">{t.label}</p>
                  <p className="text-muted text-[10px]">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="game-panel p-3 flex items-center gap-2 border-crimson/30 text-crimson text-sm">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Active Quest cards (pending only) ── */}
      {(() => {
        const pendingAssignments = assignments.filter(
          (a) => a.status === 'pending' || a.status === 'assigned'
        );

        if (pendingAssignments.length === 0 && !loading) {
          return (
            <motion.div
              className="game-panel p-10 flex flex-col items-center gap-3 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Sword size={36} className="text-muted" />
              <p className="text-muted text-sm">
                {assignments.length === 0
                  ? 'No quests for today. Take a break!'
                  : 'All quests complete! Time to spin the wheel!'}
              </p>
            </motion.div>
          );
        }

        return (
          <div className="space-y-3">
            {pendingAssignments.map((assignment, idx) => {
              const chore = assignment.chore;
              if (!chore) return null;

              const diff = difficultyLabel(chore.difficulty);
              const categoryColor = chore.category?.colour || '#3b82f6';

              return (
                <motion.div
                  key={assignment.id}
                  className="game-panel p-4 transition-all cursor-pointer hover:border-sky/40"
                  style={activeTheme.cardAccent ? {
                    borderColor: `${activeTheme.cardAccent}25`,
                    boxShadow: `0 0 12px ${activeTheme.cardAccent}10, inset 0 1px 0 ${activeTheme.cardAccent}08`,
                  } : undefined}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={idx}
                  onClick={() => navigate('/chores')}
                >
                  <div className="flex items-start gap-3">
                    {/* Category indicator */}
                    <div
                      className="mt-0.5 w-1 h-12 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoryColor }}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-cream text-sm font-semibold truncate">
                          {themedTitle(chore.title, colorTheme)}
                        </h3>
                        <ChevronRight size={16} className="text-muted flex-shrink-0" />
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* XP */}
                        <span className="inline-flex items-center gap-1 text-gold text-xs font-semibold">
                          <Star size={12} fill="currentColor" />
                          {chore.points} XP
                        </span>

                        {/* Difficulty */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${diff.color}`}>
                          {diff.text}
                        </span>

                        {/* Category */}
                        {chore.category?.name && (
                          <span className="text-muted text-xs">
                            {chore.category.name}
                          </span>
                        )}

                        {/* Photo indicator */}
                        {chore.requires_photo && (
                          <span className="inline-flex items-center gap-1 text-muted text-xs">
                            <Camera size={10} />
                            Photo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Pet Interactions ── */}
      {hasPet && (
        <div className="game-panel p-4">
          <h3 className="text-cream text-sm font-bold mb-3 flex items-center gap-2">
            <Heart size={14} className="text-crimson" />
            Pet Care
          </h3>
          <div className="flex gap-2">
            {[
              { action: 'feed', icon: Heart, label: 'Feed', color: 'game-btn-red' },
              { action: 'pet', icon: HandHeart, label: 'Pet', color: 'game-btn-blue' },
              { action: 'play', icon: Gamepad2, label: 'Play', color: 'game-btn-purple' },
            ].map(({ action, icon: Icon, label, color }) => (
              <button
                key={action}
                onClick={() => handlePetInteraction(action)}
                disabled={!!petInteracting}
                className={`game-btn ${color} flex-1 flex items-center justify-center gap-1.5 !py-2 text-xs ${
                  petInteracting === action ? 'opacity-60 cursor-wait' : ''
                }`}
              >
                {petInteracting === action ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Icon size={14} />
                )}
                {label}
              </button>
            ))}
          </div>
          {petMessage && (
            <p className={`text-xs mt-2 text-center ${
              petMessage.includes('Could not') ? 'text-crimson' : 'text-emerald'
            }`}>
              {petMessage}
            </p>
          )}
        </div>
      )}

      {/* ── Streak Freeze Indicator ── */}
      {myStats?.streak_freeze_available && (
        <div className="game-panel p-3 flex items-center gap-3">
          <ShieldOff size={16} className="text-sky flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-cream text-xs font-medium">Streak Freeze Available</p>
            <p className="text-muted text-[10px]">Your streak will be saved once if you miss a day this month</p>
          </div>
        </div>
      )}

      {/* ── Spin Wheel Section ── */}
      {spin_wheel_enabled && (
        <div className="pt-2">
          <SpinWheel
            availability={spinAvailability}
            onSpinComplete={() => {
              fetchData();
            }}
          />
        </div>
      )}
    </div>
  );
}
