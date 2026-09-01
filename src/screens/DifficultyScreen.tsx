import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { DIFFICULTIES } from '../lib/constants';

export function DifficultyScreen() {
  const nav = useNavigate();
  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/">←</Link>
        <h1 className="brand">Single Player</h1>
      </div>
      <p className="muted">Unlimited unique 9×9 puzzles. Guest play is saved on this device only.</p>
      <div className="list">
        {DIFFICULTIES.map((d) => (
          <button key={d.id} type="button" onClick={() => nav(`/play/single/${d.id}`)}>
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
