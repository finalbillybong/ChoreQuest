import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  Package,
  CheckCheck,
  Clock,
  Gift,
  Loader2,
} from 'lucide-react';

export default function Inventory() {
  const { user } = useAuth();
  const isKid = user?.role === 'kid';

  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fulfillingId, setFulfillingId] = useState(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/rewards/redemptions');
      setRedemptions(data);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Live updates via WebSocket
  useEffect(() => {
    const handler = () => { fetchInventory(); };
    window.addEventListener('ws:message', handler);
    return () => window.removeEventListener('ws:message', handler);
  }, [fetchInventory]);

  const handleFulfill = async (redemption) => {
    setFulfillingId(redemption.id);
    try {
      await api(`/api/rewards/redemptions/${redemption.id}/fulfill`, {
        method: 'POST',
      });
      await fetchInventory();
    } catch (err) {
      setError(err.message || 'Could not mark as given');
    } finally {
      setFulfillingId(null);
    }
  };

  // For kids: only show approved (not fulfilled, not denied)
  // For parents: show approved (active loot) grouped by kid, with fulfill button
  const activeLoot = redemptions.filter(
    (r) => r.status === 'approved'
  );
  const pendingLoot = redemptions.filter(
    (r) => r.status === 'pending'
  );

  // Group by kid for parent view
  const groupByKid = (items) => {
    const map = {};
    for (const r of items) {
      const name = r.user?.display_name || r.user?.username || `Kid #${r.user_id}`;
      if (!map[name]) map[name] = [];
      map[name].push(r);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Package size={28} className="text-sky" />
        <h1 className="text-cream text-xl font-extrabold leading-relaxed">
          {isKid ? 'My Inventory' : 'Reward Inventory'}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded border-2 border-crimson/40 bg-crimson/10 text-crimson text-sm text-center">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-sky animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Active Loot (approved, not yet fulfilled) ── */}
          {activeLoot.length === 0 && pendingLoot.length === 0 && (
            <div className="text-center py-16">
              <Package size={48} className="text-muted mx-auto mb-4" />
              <p className="text-cream text-lg font-bold">
                {isKid ? 'No loot yet!' : 'No claimed rewards'}
              </p>
              <p className="text-muted text-sm mt-2">
                {isKid
                  ? 'Complete quests, earn XP, and redeem rewards to fill your inventory.'
                  : 'When kids redeem rewards, they\'ll appear here.'}
              </p>
            </div>
          )}

          {/* ── Kid View ── */}
          {isKid && (activeLoot.length > 0 || pendingLoot.length > 0) && (
            <div className="space-y-6">
              {activeLoot.length > 0 && (
                <div>
                  <p className="text-muted text-[11px] font-semibold uppercase tracking-widest mb-3">
                    Ready to collect
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeLoot.map((r) => (
                      <LootCard key={r.id} redemption={r} status="approved" />
                    ))}
                  </div>
                </div>
              )}

              {pendingLoot.length > 0 && (
                <div>
                  <p className="text-muted text-[11px] font-semibold uppercase tracking-widest mb-3">
                    Awaiting approval
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingLoot.map((r) => (
                      <LootCard key={r.id} redemption={r} status="pending" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Parent View ── */}
          {!isKid && (activeLoot.length > 0 || pendingLoot.length > 0) && (
            <div className="space-y-6">
              {activeLoot.length > 0 && (
                <div>
                  <p className="text-muted text-[11px] font-semibold uppercase tracking-widest mb-3">
                    Waiting to be given out
                  </p>
                  {groupByKid(activeLoot).map(([kidName, items]) => (
                    <div key={kidName} className="mb-5">
                      <p className="text-cream text-sm font-bold mb-2">
                        {kidName}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.map((r) => (
                          <LootCard
                            key={r.id}
                            redemption={r}
                            status="approved"
                            showFulfill
                            onFulfill={() => handleFulfill(r)}
                            fulfilling={fulfillingId === r.id}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingLoot.length > 0 && (
                <div>
                  <p className="text-muted text-[11px] font-semibold uppercase tracking-widest mb-3">
                    Pending approval
                  </p>
                  {groupByKid(pendingLoot).map(([kidName, items]) => (
                    <div key={kidName} className="mb-5">
                      <p className="text-cream text-sm font-bold mb-2">
                        {kidName}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.map((r) => (
                          <LootCard key={r.id} redemption={r} status="pending" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LootCard({ redemption, status, showFulfill, onFulfill, fulfilling }) {
  const reward = redemption.reward;
  const icon = reward?.icon || '🎁';

  return (
    <div
      className={`game-panel !border-2 p-4 flex items-center gap-3 ${
        status === 'approved'
          ? 'border-emerald/40 bg-emerald/5'
          : 'border-border bg-surface-raised/30'
      }`}
    >
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-cream text-sm font-bold truncate">
          {reward?.title || 'Reward'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {status === 'approved' ? (
            <span className="flex items-center gap-1 text-emerald text-xs">
              <Gift size={12} /> Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted text-xs">
              <Clock size={12} /> Pending
            </span>
          )}
          <span className="text-muted text-xs">
            {redemption.points_spent} XP
          </span>
        </div>
        {redemption.created_at && (
          <p className="text-muted/60 text-[10px] mt-1">
            Claimed {new Date(redemption.created_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {showFulfill && (
        <button
          onClick={onFulfill}
          disabled={fulfilling}
          className="game-btn game-btn-blue flex items-center gap-1 text-xs !py-1.5 !px-3 flex-shrink-0"
          title="Mark as given out"
        >
          <CheckCheck size={14} />
          {fulfilling ? '...' : 'Given'}
        </button>
      )}
    </div>
  );
}
