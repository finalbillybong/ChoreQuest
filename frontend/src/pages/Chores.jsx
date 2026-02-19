import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { themedTitle, themedDescription } from '../utils/questThemeText';
import Modal from '../components/Modal';
import {
  Swords,
  Plus,
  Pencil,
  Trash2,
  Star,
  RefreshCw,
  Calendar,
  Camera,
  Filter,
  Search,
  BookTemplate,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', level: 1 },
  { value: 'medium', label: 'Medium', level: 2 },
  { value: 'hard', label: 'Hard', level: 3 },
  { value: 'expert', label: 'Expert', level: 4 },
];
const DIFFICULTY_LEVEL = { easy: 1, medium: 2, hard: 3, expert: 4 };
const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom Days' },
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CATEGORY_COLORS = {
  cleaning: 'bg-sky/20 text-sky border-sky/40',
  cooking: 'bg-gold/20 text-gold border-gold/40',
  outdoor: 'bg-emerald/20 text-emerald border-emerald/40',
  homework: 'bg-purple/20 text-purple border-purple/40',
  pet_care: 'bg-crimson/20 text-crimson border-crimson/40',
  laundry: 'bg-sky/20 text-sky border-sky/40',
  errands: 'bg-gold/20 text-gold border-gold/40',
  default: 'bg-cream/10 text-muted border-border',
};

const selectClass =
  'bg-navy-light border-2 border-border text-cream p-2 rounded text-sm ' +
  'focus:border-sky focus:outline-none transition-colors';

function DifficultyStars({ level }) {
  const numLevel = typeof level === 'string' ? (DIFFICULTY_LEVEL[level] || 1) : (level || 1);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= numLevel ? 'text-gold fill-gold' : 'text-muted'}
        />
      ))}
    </div>
  );
}

function CategoryBadge({ category }) {
  const catName = typeof category === 'object' ? category?.name : category;
  const colorClass = CATEGORY_COLORS[catName?.toLowerCase()] || CATEGORY_COLORS.default;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${colorClass} capitalize`}>
      {catName || 'General'}
    </span>
  );
}

function RecurrenceIndicator({ recurrence, customDays }) {
  if (!recurrence || recurrence === 'once') return null;
  return (
    <div className="flex items-center gap-1 text-muted text-xs">
      <RefreshCw size={12} />
      <span className="capitalize">{recurrence}</span>
      {recurrence === 'custom' && customDays?.length > 0 && (
        <span className="text-muted">
          ({customDays.map((d) => DAY_NAMES[d] || d).join(', ')})
        </span>
      )}
    </div>
  );
}

const emptyForm = {
  title: '',
  description: '',
  points: 10,
  difficulty: 'easy',
  category_id: '',
  recurrence: 'once',
  custom_days: [],
  requires_photo: false,
  assigned_user_ids: [],
};

function getMondayOfThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Chores() {
  const { user } = useAuth();
  const { colorTheme } = useTheme();
  const navigate = useNavigate();
  const isParent = user?.role === 'parent' || user?.role === 'admin';
  const isKid = user?.role === 'kid';

  // Data state
  const [chores, setChores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [kids, setKids] = useState([]);
  const [todayAssignments, setTodayAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingChore, setEditingChore] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Kid completion state
  const [completingId, setCompletingId] = useState(null);
  const [photoFiles, setPhotoFiles] = useState({});

  const fetchChores = useCallback(async () => {
    try {
      setError('');
      const data = await api('/api/chores');
      setChores(Array.isArray(data) ? data : data.chores || data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load quests from the guild board.');
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!isKid) return;
    try {
      const monday = getMondayOfThisWeek();
      const today = todayISO();
      const calendarRes = await api(`/api/calendar?week_start=${monday}`);
      const dayAssignments = (calendarRes.days && calendarRes.days[today]) || [];
      setTodayAssignments(dayAssignments);
    } catch {
      // Non-critical
    }
  }, [isKid]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api('/api/chores/categories');
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch {
      // Non-critical, silently handle
    }
  }, []);

  const fetchKids = useCallback(async () => {
    if (!isParent) return;
    try {
      const data = await api('/api/stats/family');
      setKids(Array.isArray(data) ? data : []);
    } catch {
      try {
        const data = await api('/api/admin/users');
        const users = Array.isArray(data) ? data : data.users || [];
        setKids(users.filter((u) => u.role === 'kid'));
      } catch {
        // Non-critical
      }
    }
  }, [isParent]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchChores(), fetchAssignments(), fetchCategories(), fetchKids()]);
  }, [fetchChores, fetchAssignments, fetchCategories, fetchKids]);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  // Live updates via WebSocket
  useEffect(() => {
    const handler = () => { fetchChores(); fetchAssignments(); };
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [fetchChores, fetchAssignments]);

  // Kid: complete quest handler
  const handleKidComplete = async (chore) => {
    const choreId = chore.id;
    if (chore.requires_photo && !photoFiles[choreId]) return;

    setCompletingId(choreId);
    try {
      if (chore.requires_photo && photoFiles[choreId]) {
        const fd = new FormData();
        fd.append('file', photoFiles[choreId]);
        await api(`/api/chores/${choreId}/complete`, { method: 'POST', body: fd });
      } else {
        await api(`/api/chores/${choreId}/complete`, { method: 'POST' });
      }
      setPhotoFiles((prev) => { const next = { ...prev }; delete next[choreId]; return next; });
      await fetchAll();
    } catch (err) {
      setError(err.message || 'Failed to complete quest');
    } finally {
      setCompletingId(null);
    }
  };

  // Build assignment status map for kids: choreId -> assignment status
  const assignmentStatusMap = {};
  if (isKid) {
    for (const a of todayAssignments) {
      const cid = a.chore_id || a.chore?.id;
      if (cid) assignmentStatusMap[cid] = a.status;
    }
  }

  // Filtering
  const filteredChores = chores.filter((chore) => {
    if (filterCategory && chore.category?.name !== filterCategory) return false;
    if (filterDifficulty && chore.difficulty !== filterDifficulty) return false;
    if (
      searchTerm &&
      !chore.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !chore.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    // Kid view: hide completed/verified unless toggle is on
    if (isKid && !showCompleted) {
      const status = assignmentStatusMap[chore.id];
      if (status === 'completed' || status === 'verified') return false;
    }
    return true;
  });

  const completedCount = isKid
    ? Object.values(assignmentStatusMap).filter((s) => s === 'completed' || s === 'verified').length
    : 0;

  // Form handlers
  const openCreateModal = () => {
    setEditingChore(null);
    setForm({ ...emptyForm });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (chore) => {
    setEditingChore(chore);
    setForm({
      title: chore.title || '',
      description: chore.description || '',
      points: chore.points || 10,
      difficulty: chore.difficulty || 'easy',
      category_id: chore.category_id ? String(chore.category_id) : '',
      recurrence: chore.recurrence || 'once',
      custom_days: chore.custom_days || [],
      requires_photo: chore.requires_photo || false,
      assigned_user_ids: chore.assigned_user_ids || chore.assigned_kids || chore.assigned_to || [],
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingChore(null);
    setFormError('');
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCustomDay = (day) => {
    setForm((prev) => ({
      ...prev,
      custom_days: prev.custom_days.includes(day)
        ? prev.custom_days.filter((d) => d !== day)
        : [...prev.custom_days, day],
    }));
  };

  const toggleKid = (kidId) => {
    setForm((prev) => ({
      ...prev,
      assigned_user_ids: prev.assigned_user_ids.includes(kidId)
        ? prev.assigned_user_ids.filter((id) => id !== kidId)
        : [...prev.assigned_user_ids, kidId],
    }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setFormError('Every quest needs a name, adventurer!');
      return;
    }
    if (form.points < 1) {
      setFormError('The reward must be at least 1 XP.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      points: Number(form.points),
      difficulty: form.difficulty,
      category_id: form.category_id ? Number(form.category_id) : undefined,
      recurrence: form.recurrence,
      requires_photo: form.requires_photo,
      assigned_user_ids: form.assigned_user_ids.length > 0 ? form.assigned_user_ids : [],
    };

    if (!body.category_id) {
      setFormError('Please select a category for this quest.');
      setSubmitting(false);
      return;
    }

    if (form.recurrence === 'custom') {
      body.custom_days = form.custom_days;
    }

    try {
      if (editingChore) {
        await api(`/api/chores/${editingChore.id}`, { method: 'PUT', body });
      } else {
        await api('/api/chores', { method: 'POST', body });
      }
      closeModal();
      await fetchChores();
    } catch (err) {
      setFormError(err.message || 'The quest scroll could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/chores/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await fetchChores();
    } catch (err) {
      setError(err.message || 'Failed to remove the quest.');
    } finally {
      setDeleting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Swords size={48} className="text-sky animate-pulse" />
        <p className="text-cream text-lg font-bold animate-pulse">
          Loading quests from the guild board...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Swords size={28} className="text-sky" />
          <h1 className="text-cream text-xl font-extrabold leading-relaxed">
            {isParent ? 'Quest Management' : 'My Quests'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isKid && completedCount > 0 && (
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-1.5 text-muted hover:text-cream text-sm transition-colors"
            >
              {showCompleted ? <EyeOff size={16} /> : <Eye size={16} />}
              {showCompleted ? 'Hide' : 'Show'} completed ({completedCount})
            </button>
          )}
          {isParent && (
            <button
              onClick={openCreateModal}
              className="game-btn game-btn-blue flex items-center gap-2"
            >
              <Plus size={16} />
              Create Quest
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-sm text-center">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="game-panel p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 text-muted">
            <Filter size={16} />
            <span className="text-sm">Filters:</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search quests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="field-input pl-9 py-2"
            />
          </div>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={selectClass}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Difficulty filter */}
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className={selectClass}
          >
            <option value="">All Difficulties</option>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chore List */}
      {filteredChores.length === 0 ? (
        <div className="game-panel p-10 text-center">
          <Swords size={40} className="mx-auto text-muted mb-4" />
          <p className="text-muted text-sm">
            {chores.length === 0
              ? 'The quest board is empty. No adventures await... yet!'
              : 'No quests match your search. Try adjusting the filters.'}
          </p>
          {isParent && chores.length === 0 && (
            <button
              onClick={openCreateModal}
              className="game-btn game-btn-blue mt-4 inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Post First Quest
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredChores.map((chore) => {
            const kidStatus = isKid ? assignmentStatusMap[chore.id] : null;
            const isDone = kidStatus === 'completed' || kidStatus === 'verified';
            const isPending = isKid && (kidStatus === 'pending' || kidStatus === 'assigned');
            const isCompleting = completingId === chore.id;

            return (
              <div
                key={chore.id}
                className={`game-panel p-4 flex flex-col gap-3 cursor-pointer hover:border-sky/40 transition-colors ${
                  isDone ? 'opacity-50' : ''
                }`}
                onClick={() => navigate(`/chores/${chore.id}`)}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-cream text-lg font-bold leading-relaxed flex-1">
                    {themedTitle(chore.title, colorTheme)}
                  </h3>
                  {isParent && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(chore);
                        }}
                        className="p-1.5 rounded hover:bg-surface-raised transition-colors text-muted hover:text-sky"
                        aria-label="Edit quest"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(chore);
                        }}
                        className="p-1.5 rounded hover:bg-surface-raised transition-colors text-muted hover:text-crimson"
                        aria-label="Delete quest"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                  {isDone && (
                    <CheckCircle2 size={18} className="text-emerald flex-shrink-0" />
                  )}
                </div>

                {/* Description */}
                {chore.description && (
                  <p className="text-muted text-sm line-clamp-2">
                    {themedDescription(chore.title, chore.description, colorTheme)}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex items-center flex-wrap gap-2 mt-auto">
                  <span className="flex items-center gap-1 text-gold font-bold text-sm">
                    <span className="text-lg">&#9733;</span>
                    {chore.points} XP
                  </span>
                  <DifficultyStars level={chore.difficulty || 1} />
                </div>

                {/* Bottom row */}
                <div className="flex items-center flex-wrap gap-2">
                  <CategoryBadge category={chore.category} />
                  <RecurrenceIndicator
                    recurrence={chore.recurrence}
                    customDays={chore.custom_days}
                  />
                  {chore.requires_photo && (
                    <span className="flex items-center gap-1 text-muted text-xs">
                      <Camera size={12} />
                      Photo
                    </span>
                  )}
                </div>

                {/* Kid: photo upload + complete button */}
                {isPending && (
                  <div
                    className="mt-1 space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {chore.requires_photo && (
                      <label className="inline-flex items-center gap-1.5 text-xs text-muted cursor-pointer hover:text-cream transition-colors bg-surface-raised px-3 py-1.5 rounded-lg border border-border">
                        <Camera size={14} />
                        <span>
                          {photoFiles[chore.id]
                            ? photoFiles[chore.id].name
                            : 'Attach proof photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            setPhotoFiles((prev) => ({
                              ...prev,
                              [chore.id]: e.target.files?.[0] || null,
                            }))
                          }
                        />
                      </label>
                    )}
                    <button
                      onClick={() => handleKidComplete(chore)}
                      disabled={
                        isCompleting ||
                        (chore.requires_photo && !photoFiles[chore.id])
                      }
                      className={`game-btn game-btn-blue w-full flex items-center justify-center gap-2 ${
                        isCompleting ? 'opacity-60 cursor-wait' : ''
                      } ${
                        chore.requires_photo && !photoFiles[chore.id]
                          ? 'opacity-40 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      {isCompleting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          Complete Quest
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingChore ? 'Edit Quest Scroll' : 'New Quest Scroll'}
        actions={[
          {
            label: 'Cancel',
            onClick: closeModal,
            className: 'game-btn game-btn-blue',
          },
          {
            label: submitting
              ? 'Saving...'
              : editingChore
              ? 'Update Quest'
              : 'Create Quest',
            onClick: handleSubmit,
            className: 'game-btn game-btn-gold',
            disabled: submitting,
          },
        ]}
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-2 rounded border border-crimson/40 bg-crimson/10 text-crimson text-sm">
              {formError}
            </div>
          )}

          {/* Template picker (only when creating) */}
          {!editingChore && chores.length > 0 && (
            <div>
              <label className="block text-cream text-sm font-medium mb-1 tracking-wide flex items-center gap-1.5">
                <BookTemplate size={14} />
                Start from existing quest
              </label>
              <select
                defaultValue=""
                key={`tpl-${showModal}`}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const tpl = chores.find((c) => String(c.id) === val);
                  if (tpl) {
                    setForm({
                      title: tpl.title || '',
                      description: tpl.description || '',
                      points: tpl.points || 10,
                      difficulty: tpl.difficulty || 'easy',
                      category_id: tpl.category_id ? String(tpl.category_id) : '',
                      recurrence: tpl.recurrence || 'once',
                      custom_days: tpl.custom_days || [],
                      requires_photo: tpl.requires_photo || false,
                      assigned_user_ids: [],
                    });
                  }
                }}
                className={`${selectClass} w-full p-3`}
              >
                <option value="">Create from scratch...</option>
                {chores.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.title} ({c.points} XP, {c.difficulty})
                  </option>
                ))}
              </select>
              <p className="text-muted text-xs mt-1">
                Pick a quest to pre-fill the form, then customise as needed.
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-cream text-sm font-medium mb-1 tracking-wide">
              Quest Name
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              placeholder="Defeat the Dust Bunnies"
              className="field-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-cream text-sm font-medium mb-1 tracking-wide">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              placeholder="Describe the quest details..."
              rows={3}
              className="field-input resize-none"
            />
          </div>

          {/* Points & Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-cream text-sm font-medium mb-1 tracking-wide">
                XP Reward
              </label>
              <input
                type="number"
                min={1}
                value={form.points}
                onChange={(e) => updateForm('points', e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label className="block text-cream text-sm font-medium mb-1 tracking-wide">
                Difficulty
              </label>
              <select
                value={form.difficulty}
                onChange={(e) => updateForm('difficulty', e.target.value)}
                className={`${selectClass} w-full p-3`}
              >
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-cream text-sm font-medium mb-1 tracking-wide">
              Category
            </label>
            <select
              value={form.category_id}
              onChange={(e) => updateForm('category_id', e.target.value)}
              className={`${selectClass} w-full p-3`}
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option
                  key={cat.id}
                  value={cat.id}
                >
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-cream text-sm font-medium mb-1 tracking-wide">
              Recurrence
            </label>
            <select
              value={form.recurrence}
              onChange={(e) => updateForm('recurrence', e.target.value)}
              className={`${selectClass} w-full p-3`}
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Days (only when recurrence === 'custom') */}
          {form.recurrence === 'custom' && (
            <div>
              <label className="block text-cream text-sm font-medium mb-2 tracking-wide">
                Quest Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleCustomDay(idx)}
                    className={`px-3 py-1.5 rounded border-2 text-sm transition-colors ${
                      form.custom_days.includes(idx)
                        ? 'border-sky bg-sky/20 text-sky'
                        : 'border-border text-muted hover:border-cream/30'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Requires Photo */}
          <div className="flex items-center justify-between">
            <label className="text-cream text-sm font-medium tracking-wide flex items-center gap-2">
              <Camera size={14} />
              Requires Photo Proof
            </label>
            <button
              type="button"
              onClick={() => updateForm('requires_photo', !form.requires_photo)}
              className={`relative w-12 h-6 rounded-full border-2 transition-colors ${
                form.requires_photo
                  ? 'bg-sky/20 border-sky'
                  : 'bg-navy-light border-border'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                  form.requires_photo
                    ? 'left-6 bg-sky'
                    : 'left-0.5 bg-muted'
                }`}
              />
            </button>
          </div>

          {/* Assigned Kids */}
          {kids.length > 0 && (
            <div>
              <label className="block text-cream text-sm font-medium mb-2 tracking-wide">
                Assign to Heroes
              </label>
              <div className="space-y-2">
                {kids.map((kid) => (
                  <label
                    key={kid.id}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-surface-raised/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={form.assigned_user_ids.includes(kid.id)}
                      onChange={() => toggleKid(kid.id)}
                      className="w-4 h-4 accent-sky"
                    />
                    <span className="text-cream text-sm">
                      {kid.display_name || kid.username}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Abandon Quest?"
        actions={[
          {
            label: 'Keep Quest',
            onClick: () => setDeleteTarget(null),
            className: 'game-btn game-btn-blue',
          },
          {
            label: deleting ? 'Removing...' : 'Remove Quest',
            onClick: handleDelete,
            className: 'game-btn game-btn-red',
            disabled: deleting,
          },
        ]}
      >
        <p className="text-muted">
          Are you sure you want to remove the quest{' '}
          <span className="text-cream text-lg font-bold">
            "{deleteTarget?.title}"
          </span>
          ? This action cannot be undone. All associated records will be archived.
        </p>
      </Modal>
    </div>
  );
}
