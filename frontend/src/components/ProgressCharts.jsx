import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { TrendingUp, BarChart3, Loader2 } from 'lucide-react';

function MiniBarChart({ data, dataKey, color, height = 80 }) {
  if (!data || data.length === 0) return null;

  const padding = 4;
  const max = Math.max(...data.map((d) => d[dataKey]), 1);
  const barWidth = 100 / data.length;

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ overflow: 'hidden', display: 'block' }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = Math.min((d[dataKey] / max) * (height - padding * 2), height - padding * 2);
        return (
          <rect
            key={i}
            x={i * barWidth + barWidth * 0.15}
            y={height - padding - barH}
            width={barWidth * 0.7}
            height={Math.max(barH, 0.5)}
            rx="1"
            fill={color}
            opacity={i === data.length - 1 ? 1 : 0.6}
          />
        );
      })}
    </svg>
  );
}

function SparkLine({ data, dataKey, color, height = 60 }) {
  if (!data || data.length === 0) return null;

  const padding = 4;
  const max = Math.max(...data.map((d) => d[dataKey]), 1);
  const drawHeight = height - padding * 2;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = padding + drawHeight - (d[dataKey] / max) * drawHeight;
    return `${x},${y}`;
  });

  const areaPoints = `0,${height - padding} ${points.join(' ')} 100,${height - padding}`;

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ overflow: 'hidden', display: 'block' }} preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} opacity="0.15" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProgressCharts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/progress');
        setData(res);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="text-sky animate-spin" />
      </div>
    );
  }

  if (!data || !data.days || data.days.length === 0) {
    return (
      <p className="text-muted text-sm text-center py-6">
        No progress data yet. Complete some quests!
      </p>
    );
  }

  const { days, summary } = data;

  return (
    <div className="space-y-4">
      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-gold text-lg font-bold">{summary.total_xp}</p>
          <p className="text-muted text-[10px]">XP Earned</p>
        </div>
        <div className="text-center">
          <p className="text-emerald text-lg font-bold">{summary.total_completed}</p>
          <p className="text-muted text-[10px]">Quests Done</p>
        </div>
        <div className="text-center">
          <p className="text-sky text-lg font-bold">{Math.round(summary.completion_rate * 100)}%</p>
          <p className="text-muted text-[10px]">Completion</p>
        </div>
      </div>

      {/* XP Sparkline */}
      <div className="game-panel p-4">
        <h3 className="text-cream text-xs font-bold mb-2 flex items-center gap-1.5">
          <TrendingUp size={12} className="text-gold" />
          XP Earned (30 days)
        </h3>
        <div className="h-16 overflow-hidden">
          <SparkLine data={days} dataKey="xp" color="#f59e0b" />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-muted text-[9px]">{days[0]?.date?.slice(5)}</span>
          <span className="text-muted text-[9px]">{days[days.length - 1]?.date?.slice(5)}</span>
        </div>
      </div>

      {/* Quest Completion Bar Chart */}
      <div className="game-panel p-4">
        <h3 className="text-cream text-xs font-bold mb-2 flex items-center gap-1.5">
          <BarChart3 size={12} className="text-emerald" />
          Daily Quests Completed
        </h3>
        <div className="h-16 overflow-hidden">
          <MiniBarChart data={days} dataKey="completed" color="#10b981" />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-muted text-[9px]">{days[0]?.date?.slice(5)}</span>
          <span className="text-muted text-[9px]">{days[days.length - 1]?.date?.slice(5)}</span>
        </div>
      </div>

      {/* Completion Rate Line */}
      <div className="game-panel p-4">
        <h3 className="text-cream text-xs font-bold mb-2 flex items-center gap-1.5">
          <BarChart3 size={12} className="text-sky" />
          Completion Rate
        </h3>
        <div className="h-16 overflow-hidden">
          <SparkLine data={days} dataKey="rate" color="#3b82f6" height={60} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-muted text-[9px]">{days[0]?.date?.slice(5)}</span>
          <span className="text-muted text-[9px]">Avg: {Math.round(summary.completion_rate * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
