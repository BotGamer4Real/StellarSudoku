import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { formatElapsed } from '../lib/format';
import { formatResetLabel } from '../lib/dailyWindow';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../state/AuthProvider';

type Row = { display_name: string; elapsed_ms: number; user_id: string; day_id: string };

export function DailyScreen() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [today, setToday] = useState<Row[]>([]);
  const [yesterday, setYesterday] = useState<Row[]>([]);
  const [dayId, setDayId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      nav('/auth?next=/daily');
      return;
    }
    const sb = requireSupabase();
    void (async () => {
      const { data: win, error: wErr } = await sb.rpc('current_daily_window');
      if (wErr) {
        setError(wErr.message);
        return;
      }
      const w = Array.isArray(win) ? win[0] : win;
      setDayId(w.day_id);
      const y = new Date(w.day_id);
      y.setUTCDate(y.getUTCDate() - 1);
      const yId = y.toISOString().slice(0, 10);
      const { data: t } = await sb.from('daily_leaderboard').select('display_name,elapsed_ms,user_id,day_id').eq('day_id', w.day_id).order('elapsed_ms').limit(100);
      const { data: p } = await sb.from('daily_leaderboard').select('display_name,elapsed_ms,user_id,day_id').eq('day_id', yId).order('elapsed_ms').limit(100);
      setToday((t ?? []) as Row[]);
      setYesterday((p ?? []) as Row[]);
    })();
  }, [user, nav]);

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/">←</Link>
        <h1 className="brand">Daily Challenge</h1>
      </div>
      <p className="muted">One shared board for everyone. Resets {formatResetLabel()}. First accepted time of the day stands. Power-ups off.</p>
      {profile && <p>Streak {profile.daily_streak} day{profile.daily_streak === 1 ? '' : 's'}</p>}
      {error && <p className="error">{error}</p>}
      <button className="btn primary" onClick={() => nav('/play/daily')}>Open today{dayId ? ` (${dayId})` : ''}</button>
      <h2>Today</h2>
      <div className="list">
        {today.length === 0 && <p className="muted">No times yet.</p>}
        {today.map((r, i) => (
          <div className="row-card" key={r.user_id}>
            <span>{i + 1}. {r.display_name}{r.user_id === user?.id ? ' (you)' : ''}</span>
            <span>{formatElapsed(r.elapsed_ms)}</span>
          </div>
        ))}
      </div>
      <h2>Yesterday</h2>
      <div className="list">
        {yesterday.length === 0 && <p className="muted">No history yet.</p>}
        {yesterday.map((r, i) => (
          <div className="row-card" key={r.user_id}>
            <span>{i + 1}. {r.display_name}</span>
            <span>{formatElapsed(r.elapsed_ms)}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
