import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { Palmtree, Trash2, Plus, Loader2 } from 'lucide-react';

export default function VacationSettings() {
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchVacations = useCallback(async () => {
    try {
      const data = await api('/api/vacation');
      setVacations(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVacations();
  }, [fetchVacations]);

  const create = async () => {
    if (!startDate || !endDate) return;
    setSaving(true);
    setError('');
    try {
      await api('/api/vacation', {
        method: 'POST',
        body: { start_date: startDate, end_date: endDate },
      });
      setShowForm(false);
      setStartDate('');
      setEndDate('');
      fetchVacations();
    } catch (err) {
      setError(err.message || 'Failed to create vacation');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id) => {
    try {
      await api(`/api/vacation/${id}`, { method: 'DELETE' });
      fetchVacations();
    } catch {
      // ignore
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="game-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-cream text-sm font-bold flex items-center gap-2">
          <Palmtree size={16} className="text-emerald" />
          Vacation Mode
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs text-sky hover:text-accent-light transition-colors font-medium flex items-center gap-1"
        >
          <Plus size={12} />
          {showForm ? 'Cancel' : 'Schedule'}
        </button>
      </div>

      <p className="text-muted text-xs mb-3">
        During vacation, recurring quests are paused and streaks are preserved.
      </p>

      {showForm && (
        <div className="mb-4 p-3 rounded-lg bg-surface-raised/50 border border-border/50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted text-[10px] font-semibold uppercase">Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
                className="field-input text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-muted text-[10px] font-semibold uppercase">End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || today}
                className="field-input text-sm mt-1"
              />
            </div>
          </div>
          {error && <p className="text-crimson text-xs">{error}</p>}
          <button
            onClick={create}
            disabled={saving || !startDate || !endDate}
            className="game-btn game-btn-blue w-full flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Palmtree size={12} />}
            Schedule Vacation
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={16} className="text-sky animate-spin" />
        </div>
      ) : vacations.length === 0 ? (
        <p className="text-muted text-xs text-center py-2">
          No vacations scheduled.
        </p>
      ) : (
        <div className="space-y-2">
          {vacations.map((v) => {
            const isPast = v.end_date < today;
            const isActive = v.start_date <= today && v.end_date >= today;
            return (
              <div
                key={v.id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${
                  isActive
                    ? 'border-emerald/30 bg-emerald/5'
                    : isPast
                      ? 'border-border/30 bg-surface-raised/20 opacity-60'
                      : 'border-border/50 bg-surface-raised/20'
                }`}
              >
                <div>
                  <p className="text-cream text-sm font-medium">
                    {v.start_date} &rarr; {v.end_date}
                  </p>
                  {isActive && (
                    <p className="text-emerald text-[10px] font-semibold uppercase mt-0.5">
                      Active now
                    </p>
                  )}
                </div>
                {!isPast && (
                  <button
                    onClick={() => cancel(v.id)}
                    className="text-muted hover:text-crimson transition-colors p-1"
                    title="Cancel vacation"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
