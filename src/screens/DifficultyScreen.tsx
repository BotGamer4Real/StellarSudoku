import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { DIFFICULTY_ART } from '../lib/art';
import { playSfx } from '../lib/audio';
import { DIFFICULTIES } from '../lib/constants';

export function DifficultyScreen() {
  const nav = useNavigate();
  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/" aria-label="Back">←</Link>
        <h1 className="brand">Single Player</h1>
      </div>
      <p className="muted">Unlimited unique 9×9 puzzles. Guest play is saved on this device only.</p>
      <div className="list">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            type="button"
            className="art-card"
            onClick={() => {
              playSfx('ui');
              nav(`/play/single/${d.id}`);
            }}
          >
            <img className="thumb" src={DIFFICULTY_ART[d.id]} alt="" />
            <span>
              <strong>{d.name}</strong>
              <div className="muted">{d.traditional} · {d.minClues}–{d.maxClues} clues · {d.coins} coins first finish</div>
            </span>
            <span className="badge">Play</span>
          </button>
        ))}
      </div>
    </Shell>
  );
}
