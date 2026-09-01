import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { COSMETICS } from '../lib/constants';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../state/AuthProvider';

export function ShopScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [owned, setOwned] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      nav('/auth?next=/shop');
      return;
    }
    void requireSupabase().from('owned_cosmetics').select('item_id').then(({ data }) => {
      setOwned((data ?? []).map((r) => r.item_id as string));
    });
  }, [user, nav]);

  const buy = async (id: string) => {
    setErr(null);
    const { error } = await requireSupabase().rpc('purchase_cosmetic', { p_item_id: id });
    if (error) setErr(error.message);
    else {
      setOwned((o) => [...o, id]);
      await refreshProfile();
    }
  };

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/">←</Link>
        <h1 className="brand">Shop</h1>
      </div>
      <p className="muted">Visual only. Placeholder colours until GraphicsGROK. Balance cannot go negative.</p>
      <p>✦ {profile?.coins ?? 0}</p>
      <p className="error">{err}</p>
      <div className="list">
        {COSMETICS.map((item) => {
          const have = owned.includes(item.id);
          return (
            <button key={item.id} type="button" disabled={have} onClick={() => void buy(item.id)}>
              <span>
                <strong>{item.name}</strong>
                <div className="muted">{item.slot} · placeholder art</div>
              </span>
              <span className="badge">{have ? 'Owned' : `${item.cost} ✦`}</span>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}
