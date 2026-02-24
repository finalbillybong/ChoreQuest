import { Shield } from 'lucide-react';

const RANK_COLORS = {
  apprentice: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400' },
  scout:      { bg: 'bg-emerald/10', border: 'border-emerald/30', text: 'text-emerald' },
  adventurer: { bg: 'bg-sky/10', border: 'border-sky/30', text: 'text-sky' },
  knight:     { bg: 'bg-purple/10', border: 'border-purple/30', text: 'text-purple' },
  champion:   { bg: 'bg-gold/10', border: 'border-gold/30', text: 'text-gold' },
  hero:       { bg: 'bg-orange-400/10', border: 'border-orange-400/30', text: 'text-orange-400' },
  legend:     { bg: 'bg-crimson/10', border: 'border-crimson/30', text: 'text-crimson' },
  mythic:     { bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/30', text: 'text-fuchsia-400' },
};

export default function RankBadge({ rank, size = 'sm' }) {
  if (!rank) return null;

  const colors = RANK_COLORS[rank.key] || RANK_COLORS.apprentice;
  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${colors.bg} ${colors.border} ${colors.text} ${
        isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <Shield size={isSmall ? 10 : 12} />
      {rank.title}
    </span>
  );
}
