import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import {
  Star,
  Plus,
  Trash2,
  Gift,
  ExternalLink,
  Check,
  Loader2,
} from 'lucide-react';

export default function Wishlist() {
  const { user } = useAuth();
  const isKid = user?.role === 'kid';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add item form (kid)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Convert modal (parent)
  const [convertModal, setConvertModal] = useState(false);
  const [convertItem, setConvertItem] = useState(null);
  const [pointCost, setPointCost] = useState('');
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertError, setConvertError] = useState('');

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/wishlist');
      setItems(data.items || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const addItem = async () => {
    if (!newTitle.trim()) return;
    setAddSubmitting(true);
    try {
      const body = { title: newTitle.trim() };
      if (newUrl.trim()) body.url = newUrl.trim();
      if (newNotes.trim()) body.notes = newNotes.trim();
      await api('/api/wishlist', { method: 'POST', body });
      setNewTitle('');
      setNewUrl('');
      setNewNotes('');
      setShowAddForm(false);
      fetchWishlist();
    } catch (err) {
      setError(err.message || 'Failed to add item');
    } finally {
      setAddSubmitting(false);
    }
  };

  const deleteItem = async (id) => {
    try {
      await api(`/api/wishlist/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete item');
    }
  };

  const openConvert = (item) => {
    setConvertItem(item);
    setPointCost('');
    setConvertError('');
    setConvertModal(true);
  };

  const submitConvert = async () => {
    const cost = parseInt(pointCost, 10);
    if (!cost || cost <= 0) {
      setConvertError('Enter a valid point cost');
      return;
    }
    setConvertSubmitting(true);
    setConvertError('');
    try {
      await api(`/api/wishlist/${convertItem.id}/convert`, {
        method: 'POST',
        body: { point_cost: cost },
      });
      setConvertModal(false);
      fetchWishlist();
    } catch (err) {
      setConvertError(err.message || 'Conversion failed');
    } finally {
      setConvertSubmitting(false);
    }
  };

  // Group items by kid for parent view
  const groupedByKid = {};
  if (!isKid) {
    items.forEach((item) => {
      const kidName = item.user_display_name || item.username || item.user_id || 'Unknown Hero';
      if (!groupedByKid[kidName]) groupedByKid[kidName] = [];
      groupedByKid[kidName].push(item);
    });
  }

  const renderItem = (item, canDelete = false, canConvert = false) => {
    const isConverted = item.converted || item.reward_id;

    return (
      <div
        key={item.id}
        className={`game-panel p-4 flex items-start gap-3 ${
          isConverted ? '!border-emerald/40' : ''
        }`}
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {isConverted ? (
            <Check size={18} className="text-emerald" />
          ) : (
            <Star size={18} className="text-sky" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-cream text-sm leading-tight">
            {item.title}
          </p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky text-xs flex items-center gap-1 mt-1 hover:text-sky/80 transition-colors"
            >
              <ExternalLink size={12} />
              <span className="truncate">{item.url}</span>
            </a>
          )}
          {item.notes && (
            <p className="text-muted text-xs mt-1">{item.notes}</p>
          )}
          {isConverted && (
            <span className="inline-block mt-1 text-emerald text-xs font-medium">
              Converted to Reward
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canConvert && !isConverted && (
            <button
              onClick={() => openConvert(item)}
              className="game-btn game-btn-purple !py-2 !px-3 !text-[8px]"
              title="Convert to Reward"
            >
              <Gift size={14} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => deleteItem(item.id)}
              className="p-2 rounded hover:bg-crimson/10 text-crimson/60 hover:text-crimson transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Star size={28} className="text-sky" />
          <h1 className="text-cream text-xl font-extrabold leading-relaxed">
            Wish List
          </h1>
        </div>

        {/* Add button for kids */}
        {isKid && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="game-btn game-btn-blue flex items-center gap-2"
          >
            <Plus size={14} />
            Add Wish
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-sm text-center">
          {error}
        </div>
      )}

      {/* Add form (kid) */}
      {isKid && showAddForm && (
        <div className="game-panel p-5 mb-6 space-y-3">
          <h3 className="text-cream text-lg font-bold tracking-wide mb-3">
            New Wish
          </h3>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What do you wish for?"
            className="field-input"
          />
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Link (optional)"
            className="field-input"
          />
          <textarea
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="field-input resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAddForm(false)}
              className="game-btn game-btn-red"
            >
              Cancel
            </button>
            <button
              onClick={addItem}
              disabled={addSubmitting || !newTitle.trim()}
              className="game-btn game-btn-blue"
            >
              {addSubmitting ? 'Adding...' : 'Add Wish'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-sky animate-spin" />
        </div>
      )}

      {/* Kid view - flat list */}
      {!loading && isKid && (
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <Star size={48} className="text-muted mx-auto mb-4" />
              <p className="text-cream text-lg font-bold">
                Your wish list is empty
              </p>
              <p className="text-muted text-sm mt-2">
                Every hero has dreams. Add your first wish!
              </p>
            </div>
          ) : (
            items.map((item) => renderItem(item, true, false))
          )}
        </div>
      )}

      {/* Parent view - grouped by kid */}
      {!loading && !isKid && (
        <div className="space-y-8">
          {Object.keys(groupedByKid).length === 0 ? (
            <div className="text-center py-16">
              <Star size={48} className="text-muted mx-auto mb-4" />
              <p className="text-cream text-lg font-bold">
                No wishes yet
              </p>
              <p className="text-muted text-sm mt-2">
                Your heroes haven't made any wishes yet. Encourage them to dream!
              </p>
            </div>
          ) : (
            Object.entries(groupedByKid).map(([kidName, kidItems]) => (
              <div key={kidName}>
                <h2 className="text-cream text-lg font-bold mb-3 tracking-wide flex items-center gap-2">
                  <Star size={14} className="text-sky" />
                  {kidName}'s Wishes
                </h2>
                <div className="space-y-3">
                  {kidItems.map((item) => renderItem(item, false, true))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Convert to Reward Modal */}
      <Modal
        isOpen={convertModal}
        onClose={() => setConvertModal(false)}
        title="Convert to Reward"
        actions={[
          {
            label: 'Cancel',
            onClick: () => setConvertModal(false),
            className: 'game-btn game-btn-red',
          },
          {
            label: convertSubmitting ? 'Converting...' : 'Convert',
            onClick: submitConvert,
            className: 'game-btn game-btn-gold',
            disabled: convertSubmitting,
          },
        ]}
      >
        <div className="space-y-4">
          <p className="text-muted text-sm">
            Convert{' '}
            <span className="text-cream font-bold">
              {convertItem?.title}
            </span>{' '}
            into a redeemable reward:
          </p>

          {convertError && (
            <div className="p-2 rounded border border-crimson/40 bg-crimson/10 text-crimson text-sm">
              {convertError}
            </div>
          )}

          <div>
            <label className="block text-gold text-sm font-medium mb-2 tracking-wide">
              Point Cost (XP)
            </label>
            <input
              type="number"
              min="1"
              value={pointCost}
              onChange={(e) => setPointCost(e.target.value)}
              placeholder="e.g. 500"
              className="field-input"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
