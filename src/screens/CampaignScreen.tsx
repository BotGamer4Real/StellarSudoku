import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { DIFFICULTY_ART } from '../lib/art';
import { playSfx } from '../lib/audio';
import { CAMPAIGN_LEVELS, PUZZLES_PER_LEVEL } from '../lib/constants';
import { isDevTester } from '../lib/devTester';
import { formatElapsed } from '../lib/format';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../state/AuthProvider';

type ProgressRow = { level: number; puzzle_index: number; best_ms: number | null };

export function CampaignScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const tester = isDevTester(profile?.display_name, user?.email);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [board, setBoard] = useState<{ level: number; display_name: string; elapsed_ms: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyLevel, setBusyLevel] = useState<number | null>(null);

  const reload = useCallback(async () => {
    const sb = requireSupabase();
    const { data, error: e } = await sb.from('campaign_progress').select('level,puzzle_index,best_ms');
    if (e) setError(e.message);
    else setProgress((data ?? []) as ProgressRow[]);
    const { data: lb } = await sb
      .from('campaign_leaderboard')
      .select('level,display_name,elapsed_ms')
      .order('elapsed_ms')
      .limit(100);
    setBoard((lb ?? []) as typeof board);
  }, []);

  useEffect(() => {
    if (!user) {
      nav('/auth?next=/campaign');
      return;
    }
    void reload();
  }, [user, nav, reload]);

  const completed = (level: number) => progress.filter((p) => p.level === level).length;
  const unlocked = (level: number) => level === 1 || completed(level - 1) >= PUZZLES_PER_LEVEL;

  const autoCompleteLevel = async (level: number) => {
    setError(null);
    setBusyLevel(level);
    try {
      const { error: e } = await requireSupabase().rpc('dev_complete_campaign_level', { p_level: level });
      if (e) throw e;
      await reload();
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Auto-complete failed');
    } finally {
      setBusyLevel(null);
    }
  };

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/">←</Link>
        <h1 className="brand">Campaign</h1>
      </div>
      <p className="muted">120 fixed puzzles. Finish all 20 in a level to unlock the next. Replays stay open.</p>
      {tester && <p className="muted">Tester AUTO is visible only on this account. Completing a level unlocks the next and writes progress.</p>}
      {error && <p className="error">{error}</p>}
      <div className="list">
        {CAMPAIGN_LEVELS.map((lvl) => {
          const open = unlocked(lvl.level);
          const done = completed(lvl.level);
          const nextIdx =
            Array.from({ length: 20 }, (_, i) => i + 1).find(
              (n) => !progress.some((p) => p.level === lvl.level && p.puzzle_index === n),
            ) ?? 1;
          return (
            <div className={`row-card art-card${open ? '' : ' locked'}`} key={lvl.level}>
              <img className="thumb" src={DIFFICULTY_ART[lvl.difficulty]} alt="" />
              <span>
                <strong>{lvl.name}</strong>
                <div className="muted">{done}/{PUZZLES_PER_LEVEL}{open ? '' : ' · locked'}</div>
              </span>
              <span className="row">
                <button
                  type="button"
                  className="btn"
                  disabled={!open}
                  onClick={() => {
                    playSfx('ui');
                    nav(`/play/campaign/${lvl.level}/${nextIdx}`);
                  }}
                >
                  {open ? 'Play' : 'Lock'}
                </button>
                {tester && open && done < PUZZLES_PER_LEVEL && (
                  <button
                    type="button"
                    className="btn danger"
                    disabled={busyLevel === lvl.level}
                    onClick={() => void autoCompleteLevel(lvl.level)}
                  >
                    {busyLevel === lvl.level ? '…' : 'AUTO'}
                  </button>
                )}
              </span>
            </div>
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
