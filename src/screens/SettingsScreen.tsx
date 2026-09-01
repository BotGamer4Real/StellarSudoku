import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { Modal } from '../components/Modal';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../state/AuthProvider';

export function SettingsScreen() {
  const { user, profile, signOut, deleteAccount, refreshProfile } = useAuth();
  const [music, setMusic] = useState(profile?.settings?.music ?? 0);
  const [sfx, setSfx] = useState(profile?.settings?.sfx ?? 0);
  const [theme, setTheme] = useState(profile?.settings?.theme ?? 'dark');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const patch = async (next: Record<string, unknown>) => {
    document.documentElement.dataset.theme = (next.theme as string) || theme;
    if (!user) return;
    await requireSupabase().rpc('patch_settings', { p_settings: next });
    await refreshProfile();
  };

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/">←</Link>
        <h1 className="brand">Settings</h1>
      </div>
      <div className="stack">
        <label>Music <input className="range" type="range" min={0} max={100} value={music} onChange={(e) => setMusic(Number(e.target.value))} onPointerUp={() => void patch({ music })} /></label>
        <label>SFX <input className="range" type="range" min={0} max={100} value={sfx} onChange={(e) => setSfx(Number(e.target.value))} onPointerUp={() => void patch({ sfx })} /></label>
        <p className="muted">Audio is silent until GraphicsGROK delivers sound. Sliders still save.</p>
        <div className="row">
          <button className="btn grow" onClick={() => { setTheme('dark'); void patch({ theme: 'dark' }); }}>Dark</button>
          <button className="btn grow" onClick={() => { setTheme('light'); void patch({ theme: 'light' }); }}>Light</button>
        </div>
        <Link className="btn" to="/play/single/asteroid_belt">Replay tutorial (next Single Player)</Link>
        {user && <button className="btn" onClick={() => setConfirmReset(true)}>Reset Campaign progress</button>}
        {user && <button className="btn" onClick={() => void signOut()}>Sign out</button>}
        {user && <button className="btn danger" onClick={() => setConfirmDelete(true)}>Delete account</button>}
        {!user && <Link className="btn" to="/auth">Sign in</Link>}
        <p className="error">{err}</p>
      </div>

      {confirmReset && (
        <Modal title="Reset Campaign?" onClose={() => setConfirmReset(false)}>
          <p>This clears campaign unlocks and level times on this account. Coins stay.</p>
          <button className="btn danger" onClick={async () => {
            await requireSupabase().rpc('reset_campaign');
            setConfirmReset(false);
          }}>Reset</button>
          <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete account?" onClose={() => setConfirmDelete(false)}>
          <p>This purges your profile, progress, coins, achievements, and leaderboard rows. Type DELETE to confirm.</p>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
          <button
            className="btn danger"
            disabled={typed !== 'DELETE'}
            onClick={async () => {
              const e = await deleteAccount();
              if (e) setErr(e);
              else setConfirmDelete(false);
            }}
          >
            Delete forever
          </button>
        </Modal>
      )}
    </Shell>
  );
}
