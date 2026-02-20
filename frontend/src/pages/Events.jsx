import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Zap,
  Square,
} from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function toInputDate(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

export default function Events() {
  const { user } = useAuth();
  const isParent = user?.role === 'parent' || user?.role === 'admin';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form modal
  const [formModal, setFormModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [multiplier, setMultiplier] = useState('1.5');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/events');
      setEvents(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const handler = () => { fetchEvents(); };
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [fetchEvents]);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setMultiplier('1.5');
    setStartDate('');
    setEndDate('');
    setFormError('');
    setFormModal(true);
  };

  const openEdit = (event) => {
    setEditing(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setMultiplier(String(event.multiplier));
    setStartDate(toInputDate(event.start_date));
    setEndDate(toInputDate(event.end_date));
    setFormError('');
    setFormModal(true);
  };

  const submitForm = async () => {
    if (!title.trim()) { setFormError('Title is required'); return; }
    if (!startDate || !endDate) { setFormError('Start and end dates are required'); return; }
    const mult = parseFloat(multiplier);
    if (!mult || mult <= 1) { setFormError('Multiplier must be greater than 1'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setFormError('End date must be after start date'); return; }

    setSubmitting(true);
    setFormError('');
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        multiplier: mult,
        start_date: new Date(startDate + 'T00:00:00').toISOString(),
        end_date: new Date(endDate + 'T23:59:59').toISOString(),
      };

      if (editing) {
        await api(`/api/events/${editing.id}`, { method: 'PUT', body });
      } else {
        await api('/api/events', { method: 'POST', body });
      }
      setFormModal(false);
      fetchEvents();
    } catch (err) {
      setFormError(err.message || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  const endEvent = async (id) => {
    try {
      await api(`/api/events/${id}/end`, { method: 'POST' });
      fetchEvents();
    } catch (err) {
      setError(err.message || 'Failed to end event');
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api(`/api/events/${id}`, { method: 'DELETE' });
      fetchEvents();
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Sparkles size={28} className="text-gold" />
          <h1 className="text-cream text-xl font-extrabold leading-relaxed">
            Seasonal Events
          </h1>
        </div>

        {isParent && (
          <button onClick={openCreate} className="game-btn game-btn-gold flex items-center gap-2">
            <Plus size={14} />
            New Event
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-sm text-center">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-gold animate-spin" />
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="text-center py-16">
          <Sparkles size={48} className="text-muted mx-auto mb-4" />
          <p className="text-cream text-lg font-bold">No events yet</p>
          <p className="text-muted text-sm mt-2">
            Create a seasonal event to boost XP with a multiplier.
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className={`game-panel p-4 ${event.is_active ? '!border-gold/40' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Zap size={18} className={event.is_active ? 'text-gold' : 'text-muted'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-cream text-sm font-bold truncate">{event.title}</p>
                    {event.is_active && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-gold/20 text-gold px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-muted text-xs mt-1">{event.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                    <span className="text-gold font-bold">{event.multiplier}x XP</span>
                    <span>{formatDate(event.start_date)} — {formatDate(event.end_date)}</span>
                  </div>
                </div>

                {isParent && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {event.is_active && (
                      <button
                        onClick={() => endEvent(event.id)}
                        className="p-2 rounded hover:bg-gold/10 text-gold/60 hover:text-gold transition-colors"
                        title="End event early"
                      >
                        <Square size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(event)}
                      className="p-2 rounded hover:bg-surface-raised text-muted hover:text-cream transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="p-2 rounded hover:bg-crimson/10 text-crimson/60 hover:text-crimson transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formModal}
        onClose={() => setFormModal(false)}
        title={editing ? 'Edit Event' : 'New Seasonal Event'}
        actions={[
          { label: 'Cancel', onClick: () => setFormModal(false), className: 'game-btn game-btn-red' },
          { label: submitting ? 'Saving...' : 'Save', onClick: submitForm, className: 'game-btn game-btn-gold', disabled: submitting },
        ]}
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-2 rounded border border-crimson/40 bg-crimson/10 text-crimson text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-gold text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Challenge"
              className="field-input"
            />
          </div>

          <div>
            <label className="block text-gold text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's the event about?"
              rows={2}
              className="field-input resize-none"
            />
          </div>

          <div>
            <label className="block text-gold text-sm font-medium mb-1">XP Multiplier</label>
            <input
              type="number"
              min="1.1"
              step="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              placeholder="e.g. 2.0"
              className="field-input"
            />
            <p className="text-muted text-xs mt-1">All XP earned during this event is multiplied by this amount.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gold text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label className="block text-gold text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="field-input"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
