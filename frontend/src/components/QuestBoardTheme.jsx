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
    bg: null,
    headerClass: '',
    cardAccent: null,
  },
  {
    id: 'halloween',
    label: 'Haunted Dungeon',
    icon: '\uD83C\uDF83',
    description: 'Spooky vibes for brave heroes',
    bg: 'linear-gradient(180deg, rgba(139,69,19,0.08) 0%, rgba(75,0,130,0.06) 100%)',
    headerClass: 'quest-board-halloween',
    cardAccent: '#9333ea',
  },
  {
    id: 'christmas',
    label: 'Winter Workshop',
    icon: '\uD83C\uDF84',
    description: 'Santa\'s quest factory',
    bg: 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(239,68,68,0.04) 100%)',
    headerClass: 'quest-board-christmas',
    cardAccent: '#ef4444',
  },
  {
    id: 'space',
    label: 'Space Station',
    icon: '\uD83D\uDE80',
    description: 'Missions from orbit',
    bg: 'linear-gradient(180deg, rgba(59,130,246,0.06) 0%, rgba(168,85,247,0.06) 100%)',
    headerClass: 'quest-board-space',
    cardAccent: '#3b82f6',
  },
  {
    id: 'underwater',
    label: 'Ocean Kingdom',
    icon: '\uD83C\uDF0A',
    description: 'Deep sea adventures',
    bg: 'linear-gradient(180deg, rgba(6,182,212,0.08) 0%, rgba(16,185,129,0.04) 100%)',
    headerClass: 'quest-board-underwater',
    cardAccent: '#06b6d4',
  },
  {
    id: 'enchanted',
    label: 'Enchanted Garden',
    icon: '\uD83C\uDF38',
    description: 'Magical forest quests',
    bg: 'linear-gradient(180deg, rgba(236,72,153,0.06) 0%, rgba(168,85,247,0.06) 100%)',
    headerClass: 'quest-board-enchanted',
    cardAccent: '#ec4899',
  },
];

export function QuestBoardOverlay({ themeId }) {
  const theme = BOARD_THEMES.find((t) => t.id === themeId);
  if (!theme || !theme.bg) return null;

  return (
    <div
      className="absolute inset-0 rounded-xl pointer-events-none z-0"
      style={{ background: theme.bg }}
    />
  );
}

export function QuestBoardDecorations({ themeId }) {
  if (themeId === 'halloween') {
    return (
      <div className="flex items-center gap-1.5 text-xs opacity-60">
        <span>\uD83D\uDD78\uFE0F</span>
        <span className="text-purple font-medium">Haunted Dungeon</span>
        <span>\uD83C\uDF83</span>
      </div>
    );
  }
  if (themeId === 'christmas') {
    return (
      <div className="flex items-center gap-1.5 text-xs opacity-60">
        <span>\u2744\uFE0F</span>
        <span className="text-emerald font-medium">Winter Workshop</span>
        <span>\uD83C\uDF84</span>
      </div>
    );
  }
  if (themeId === 'space') {
    return (
      <div className="flex items-center gap-1.5 text-xs opacity-60">
        <span>\uD83C\uDF1F</span>
        <span className="text-sky font-medium">Space Station</span>
        <span>\uD83D\uDE80</span>
      </div>
    );
  }
  if (themeId === 'underwater') {
    return (
      <div className="flex items-center gap-1.5 text-xs opacity-60">
        <span>\uD83D\uDC20</span>
        <span className="text-cyan-400 font-medium">Ocean Kingdom</span>
        <span>\uD83C\uDF0A</span>
      </div>
    );
  }
  if (themeId === 'enchanted') {
    return (
      <div className="flex items-center gap-1.5 text-xs opacity-60">
        <span>\uD83E\uDD8B</span>
        <span className="text-pink-400 font-medium">Enchanted Garden</span>
        <span>\uD83C\uDF38</span>
      </div>
    );
  }
  return null;
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
