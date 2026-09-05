import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coins } from '../components/Coins';
import { Shell } from '../components/Shell';
import { ART, COSMETIC_THUMB } from '../lib/art';
import { playSfx } from '../lib/audio';
import { COSMETICS, type CosmeticId } from '../lib/constants';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../state/AuthProvider';

function equippedId(slot: string, profile: ReturnType<typeof useAuth>['profile']): string | null {
  if (!profile) return null;
  if (slot === 'background') return profile.equipped_background;
  if (slot === 'pad') return profile.equipped_pad;
  if (slot === 'flourish') return profile.equipped_flourish;
  if (slot === 'avatar') return profile.equipped_avatar;
  if (slot === 'banner') return profile.equipped_banner;
  return null;
}

export function ShopScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [owned, setOwned] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      nav('/auth?next=/shop');
      return;
    }
    void requireSupabase().from('owned_cosmetics').select('item_id').then(({ data }) => {
      setOwned((data ?? []).map((r) => r.item_id as string));
    });
  }, [user, nav]);

  const buy = async (id: CosmeticId) => {
    setErr(null);
    setBusy(id);
    const { error } = await requireSupabase().rpc('purchase_cosmetic', { p_item_id: id });
    setBusy(null);
    if (error) setErr(error.message);
    else {
      playSfx('buy');
      setOwned((o) => [...o, id]);
      await refreshProfile();
    }
  };

  const equip = async (id: CosmeticId) => {
    setErr(null);
    setBusy(id);
    const { error } = await requireSupabase().rpc('equip_cosmetic', { p_item_id: id });
    setBusy(null);
    if (error) setErr(error.message);
    else {
      playSfx('ui');
      await refreshProfile();
    }
  };

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/" aria-label="Back">←</Link>
        <h1 className="brand">Shop</h1>
      </div>
      <p className="muted">Visual only. Cosmic Coins are earned by play. Balance cannot go negative.</p>
      <Coins amount={profile?.coins ?? 0} />
      <p className="error">{err}</p>
      <div className="list">
        {COSMETICS.map((item) => {
          const have = owned.includes(item.id);
          const on = equippedId(item.slot, profile) === item.id;
          return (
            <div className="row-card art-card" key={item.id}>
              <img className="thumb" src={COSMETIC_THUMB[item.id]} alt="" />
              <span>
                <strong>{item.name}</strong>
                <div className="muted">{item.slot}{on ? ' · wearing' : ''}</div>
              </span>
              {have ? (
                <button
                  type="button"
                  className={`btn${on ? ' primary' : ''}`}
                  disabled={on || busy === item.id}
                  onClick={() => void equip(item.id)}
                >
                  {on ? 'On' : busy === item.id ? '…' : 'Wear'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  disabled={busy === item.id}
                  onClick={() => void buy(item.id)}
                >
                  {busy === item.id ? '…' : (
                    <span className="coins">
                      <img src={ART.coin} alt="" width={16} height={16} />
                      {item.cost}
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
