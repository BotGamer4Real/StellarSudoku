import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { Modal } from '../components/Modal';
import { DISPLAY_NAME_RE } from '../lib/constants';
import { loadGuest, saveGuest } from '../lib/guest';
import { useAuth } from '../state/AuthProvider';
import { requireSupabase } from '../lib/supabase';

export function HomeScreen() {
  const nav = useNavigate();
  const { user, profile, setDisplayName, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [merge, setMerge] = useState(false);
  const guest = loadGuest();

  useEffect(() => {
    if (user && profile && guest.hashes.length + guest.coins > 0 && !guest.mergeOffered && profile.total_solves === 0 && profile.coins === 0) {
      setMerge(true);
    }
  }, [user, profile, guest.coins, guest.hashes.length, guest.mergeOffered]);

  const submitName = async () => {
    if (!DISPLAY_NAME_RE.test(name.trim())) {
      setNameErr('3-20 characters, start with a letter or number.');
      return;
    }
    const err = await setDisplayName(name.trim());
    setNameErr(err);
  };

  const keepAccount = () => {
    const g = loadGuest();
    saveGuest({ ...g, mergeOffered: true, hashes: [], coins: 0, inProgress: null });
    setMerge(false);
  };

  const attachGuest = async () => {
    const g = loadGuest();
    try {
      const sb = requireSupabase();
      const { error } = await sb.rpc('merge_guest_progress', {
        p_hashes: g.hashes.map((h) => h.hash),
        p_difficulty: g.hashes.map((h) => h.difficulty),
        p_coins: g.coins,
      });
      if (error) throw error;
      saveGuest({ ...g, mergeOffered: true, hashes: [], coins: 0, inProgress: null, solves: 0 });
      await refreshProfile();
      setMerge(false);
    } catch (e) {
      setNameErr(e instanceof Error ? e.message : 'Merge failed');
    }
  };

  return (
    <Shell>
      <header className="stack">
        <div className="row space">
          <h1 className="brand">StellarSudoku</h1>
          <Link className="icon-btn" to={user ? '/profile' : '/auth'} aria-label="Profile">
            {user ? (profile?.display_name?.[0] ?? 'P') : '?'}
          </Link>
        </div>
        <p className="tagline">
          Classic Sudoku with a space theme — six difficulties, a 120-puzzle campaign, and one shared daily board.
        </p>
        {profile && <p className="muted">✦ {profile.coins} Cosmic Coins</p>}
        {!user && (
          <>
            <p className="muted">Guest: Single Player only. Sign in or sign up for Campaign, Daily, and cloud save.</p>
            <button className="btn" type="button" onClick={() => nav('/auth')}>Sign in / Sign up</button>
          </>
        )}
      </header>

      <nav className="menu">
        <button className="btn primary" onClick={() => nav('/single')}>Single Player</button>
        <button className="btn" onClick={() => (user ? nav('/campaign') : nav('/auth?next=/campaign'))}>Campaign</button>
        <button className="btn" onClick={() => (user ? nav('/daily') : nav('/auth?next=/daily'))}>Daily Challenge</button>
        <button className="btn" onClick={() => (user ? nav('/shop') : nav('/auth?next=/shop'))}>Cosmetics shop</button>
        <div className="row">
          <Link className="btn grow" to="/help">Help</Link>
          <Link className="btn grow" to="/settings">Settings</Link>
        </div>
      </nav>

      {profile?.needs_display_name && (
        <Modal title="Choose a display name">
          <p className="muted">Required, unique, 3–20 characters. Shown on leaderboards.</p>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Display name" />
          <p className="error">{nameErr}</p>
          <button className="btn primary" onClick={() => void submitName()}>Save name</button>
        </Modal>
      )}

      {merge && (
        <Modal title="Keep this account as-is?">
          <p className="muted">
            This device has guest Single Player stats. Default is to keep the new account empty. You can attach local
            hashes and coins once.
          </p>
          <button className="btn primary" onClick={keepAccount}>Keep account as-is</button>
          <button className="btn" onClick={() => void attachGuest()}>Attach guest progress</button>
        </Modal>
      )}
    </Shell>
  );
}
