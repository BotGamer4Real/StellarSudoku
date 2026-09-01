import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { CAMPAIGN_LEVELS, PUZZLES_PER_LEVEL } from '../lib/constants';
import { formatElapsed } from '../lib/format';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../state/AuthProvider';

type ProgressRow = { level: number; puzzle_index: number; best_ms: number | null };

export function CampaignScreen() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [board, setBoard] = useState<{ level: number; display_name: string; elapsed_ms: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      nav('/auth?next=/campaign');
      return;
    }
    const sb = requireSupabase();
    void sb.from('campaign_progress').select('level,puzzle_index,best_ms').then(({ data, error: e }) => {
      if (e) setError(e.message);
      else setProgress((data ?? []) as ProgressRow[]);
    });
    void sb.from('campaign_leaderboard').select('level,display_name,elapsed_ms').order('elapsed_ms').limit(100)
      .then(({ data }) => setBoard((data ?? []) as typeof board));
  }, [user, nav]);

  const completed = (level: number) => progress.filter((p) => p.level === level).length;
  const unlocked = (level: number) => level === 1 || completed(level - 1) >= PUZZLES_PER_LEVEL;

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/">←</Link>
        <h1 className="brand">Campaign</h1>
      </div>
      <p className="muted">120 fixed puzzles. Finish all 20 in a level to unlock the next. Replays stay open.</p>
      {error && <p className="error">{error}</p>}
      <div className="list">
        {CAMPAIGN_LEVELS.map((lvl) => {
          const open = unlocked(lvl.level);
          const done = completed(lvl.level);
          return (
            <button
              key={lvl.level}
              className={open ? undefined : 'locked'}
              disabled={!open}
              onClick={() => {
                const next = progress
                  .filter((p) => p.level === lvl.level)
                  .map((p) => p.puzzle_index);
                const idx = Array.from({ length: 20 }, (_, i) => i + 1).find((n) => !next.includes(n)) ?? 1;
                nav(`/play/campaign/${lvl.level}/${idx}`);
              }}
            >
              <span>
                <strong>{lvl.name}</strong>
                <div className="muted">{done}/{PUZZLES_PER_LEVEL}{open ? '' : ' · locked'}</div>
              </span>
              <span className="badge">{open ? 'Play' : 'Lock'}</span>
            </button>
          );
        })}
      </div>
      <h2>Level times</h2>
      <div className="list">
        {board.length === 0 && <p className="muted">No level times yet.</p>}
        {board.map((row) => (
          <div className="row-card" key={`${row.level}-${row.display_name}`}>
            <span>L{row.level} {row.display_name}</span>
            <span>{formatElapsed(row.elapsed_ms)}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
