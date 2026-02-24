/**
 * Themed Quest Board overlays — decorative elements that change the
 * dashboard look based on the selected board theme.
 */

export const BOARD_THEMES = [
  {
    id: 'default',
    label: 'Classic',
    icon: '\u2694\uFE0F',
    description: 'The standard quest board',
    headerGradient: null,
    pageGradient: null,
    cardAccent: null,
    particleEmojis: null,
  },
  {
    id: 'halloween',
    label: 'Haunted Dungeon',
    icon: '\uD83C\uDF83',
    description: 'Spooky vibes for brave heroes',
    headerGradient: 'linear-gradient(135deg, rgba(88,28,135,0.25) 0%, rgba(30,10,60,0.35) 50%, rgba(139,69,19,0.15) 100%)',
    pageGradient: 'radial-gradient(ellipse at top, rgba(88,28,135,0.12) 0%, transparent 70%)',
    cardAccent: '#9333ea',
    particleEmojis: ['\uD83C\uDF83', '\uD83D\uDD78\uFE0F', '\uD83D\uDC7B', '\uD83E\uDDBF', '\uD83D\uDD2E'],
  },
  {
    id: 'christmas',
    label: 'Winter Workshop',
    icon: '\uD83C\uDF84',
    description: "Santa's quest factory",
    headerGradient: 'linear-gradient(135deg, rgba(22,101,52,0.25) 0%, rgba(153,27,27,0.20) 50%, rgba(22,78,99,0.15) 100%)',
    pageGradient: 'radial-gradient(ellipse at top, rgba(22,101,52,0.10) 0%, transparent 70%)',
    cardAccent: '#ef4444',
    particleEmojis: ['\u2744\uFE0F', '\uD83C\uDF84', '\uD83C\uDF81', '\u2B50', '\uD83D\uDD14'],
  },
  {
    id: 'space',
    label: 'Space Station',
    icon: '\uD83D\uDE80',
    description: 'Missions from orbit',
    headerGradient: 'linear-gradient(135deg, rgba(30,58,138,0.30) 0%, rgba(88,28,135,0.20) 50%, rgba(15,23,42,0.35) 100%)',
    pageGradient: 'radial-gradient(ellipse at top, rgba(30,58,138,0.12) 0%, transparent 70%)',
    cardAccent: '#3b82f6',
    particleEmojis: ['\uD83D\uDE80', '\uD83C\uDF1F', '\uD83E\uDE90', '\uD83D\uDEF8', '\u2B50'],
  },
  {
    id: 'underwater',
    label: 'Ocean Kingdom',
    icon: '\uD83C\uDF0A',
    description: 'Deep sea adventures',
    headerGradient: 'linear-gradient(135deg, rgba(8,145,178,0.25) 0%, rgba(6,78,59,0.20) 50%, rgba(21,94,117,0.25) 100%)',
    pageGradient: 'radial-gradient(ellipse at top, rgba(8,145,178,0.12) 0%, transparent 70%)',
    cardAccent: '#06b6d4',
    particleEmojis: ['\uD83D\uDC20', '\uD83C\uDF0A', '\uD83D\uDC19', '\uD83D\uDC1A', '\uD83E\uDDDC'],
  },
  {
    id: 'enchanted',
    label: 'Enchanted Garden',
    icon: '\uD83C\uDF38',
    description: 'Magical forest quests',
    headerGradient: 'linear-gradient(135deg, rgba(219,39,119,0.20) 0%, rgba(126,34,206,0.20) 50%, rgba(5,150,105,0.15) 100%)',
    pageGradient: 'radial-gradient(ellipse at top, rgba(219,39,119,0.10) 0%, transparent 70%)',
    cardAccent: '#ec4899',
    particleEmojis: ['\uD83C\uDF38', '\uD83E\uDD8B', '\uD83C\uDF3F', '\u2728', '\uD83C\uDF3A'],
  },
];

export function getTheme(themeId) {
  return BOARD_THEMES.find((t) => t.id === themeId) || BOARD_THEMES[0];
}

/** Full-page ambient gradient that sits behind everything */
export function QuestBoardPageGlow({ themeId }) {
  const theme = getTheme(themeId);
  if (!theme.pageGradient) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: theme.pageGradient }}
    />
  );
}

/** Header panel overlay gradient */
export function QuestBoardOverlay({ themeId }) {
  const theme = getTheme(themeId);
  if (!theme.headerGradient) return null;

  return (
    <div
      className="absolute inset-0 rounded-xl pointer-events-none z-0"
      style={{ background: theme.headerGradient }}
    />
  );
}

/** Floating particle emojis that drift behind the header */
export function QuestBoardParticles({ themeId }) {
  const theme = getTheme(themeId);
  if (!theme.particleEmojis) return null;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
      {theme.particleEmojis.map((emoji, i) => (
        <span
          key={i}
          className="quest-particle absolute select-none"
          style={{
            left: `${12 + i * 18}%`,
            top: `${10 + (i % 3) * 25}%`,
            fontSize: `${12 + (i % 3) * 4}px`,
            animationDelay: `${i * 1.2}s`,
            opacity: 0.15,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

export function QuestBoardDecorations({ themeId }) {
  const theme = getTheme(themeId);
  if (themeId === 'default') return null;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span>{theme.particleEmojis?.[0]}</span>
      <span
        className="font-semibold"
        style={{ color: theme.cardAccent, opacity: 0.8 }}
      >
        {theme.label}
      </span>
      <span>{theme.icon}</span>
    </div>
  );
}

export function QuestBoardTitle({ themeId, children }) {
  const titles = {
    default: 'Quest Board',
    halloween: 'Dungeon Quests',
    christmas: 'Workshop Tasks',
    space: 'Mission Control',
    underwater: 'Ocean Missions',
    enchanted: 'Garden Quests',
  };

  return <>{titles[themeId] || children || 'Quest Board'}</>;
}
