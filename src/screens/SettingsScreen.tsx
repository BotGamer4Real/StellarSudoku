import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { Modal } from '../components/Modal';
import {
  applyClientSettings,
  loadLocalSettings,
  mergeSettings,
  saveLocalSettings,
  type ClientSettings,
} from '../lib/applySettings';
import { loadGuest, saveGuest } from '../lib/guest';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../state/AuthProvider';

export function SettingsScreen() {
  const { user, profile, signOut, deleteAccount, refreshProfile } = useAuth();
  const nav = useNavigate();
  const initial = mergeSettings(profile?.settings ?? loadLocalSettings());
  const [music, setMusic] = useState(initial.music);
  const [sfx, setSfx] = useState(initial.sfx);
  const [theme, setTheme] = useState(initial.theme);
  const [leftHanded, setLeftHanded] = useState(initial.leftHanded);
  const [colourBlind, setColourBlind] = useState(initial.colourBlind);
  const [largeCells, setLargeCells] = useState(initial.largeCells);
  const [notesDefault, setNotesDefault] = useState(initial.notesDefault);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const patch = async (next: Record<string, unknown>) => {
    const merged = saveLocalSettings(next as Partial<ClientSettings>);
    applyClientSettings(merged);
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
          <button className={`btn grow${theme === 'dark' ? ' primary' : ''}`} onClick={() => { setTheme('dark'); void patch({ theme: 'dark' }); }}>Dark</button>
          <button className={`btn grow${theme === 'light' ? ' primary' : ''}`} onClick={() => { setTheme('light'); void patch({ theme: 'light' }); }}>Light</button>
        </div>
        <div className="row">
          <button className="btn grow" onClick={() => { setLeftHanded((v) => { void patch({ leftHanded: !v }); return !v; }); }}>
            Pad: {leftHanded ? 'Left' : 'Right'}
          </button>
          <button className="btn grow" onClick={() => { setLargeCells((v) => { void patch({ largeCells: !v }); return !v; }); }}>
            Cells: {largeCells ? 'Large' : 'Standard'}
          </button>
        </div>
        <div className="row">
          <button className="btn grow" onClick={() => { setColourBlind((v) => { void patch({ colourBlind: !v }); return !v; }); }}>
            Colour-blind: {colourBlind ? 'On' : 'Off'}
          </button>
          <button className="btn grow" onClick={() => { setNotesDefault((v) => { void patch({ notesDefault: !v }); return !v; }); }}>
            Notes default: {notesDefault ? 'On' : 'Off'}
          </button>
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => {
            const g = loadGuest();
            saveGuest({ ...g, tutorialDone: false });
            void patch({ tutorial_completed: false });
            nav('/play/single/asteroid_belt');
          }}
        >
          Replay tutorial
        </button>
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
