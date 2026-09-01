import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { ACHIEVEMENTS, DIFFICULTIES } from '../lib/constants';
import { formatElapsed } from '../lib/format';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../state/AuthProvider';

export function ProfileScreen() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [unlocked, setUnlocked] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      nav('/auth?next=/profile');
      return;
    }
    void requireSupabase().from('achievements').select('achievement_id').then(({ data }) => {
      setUnlocked((data ?? []).map((r) => r.achievement_id as string));
    });
  }, [user, nav]);

  if (!profile) {
    return (
      <Shell>
        <p className="muted">Loading profile…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/">←</Link>
        <h1 className="brand">Profile</h1>
      </div>
      <div className="panel stack">
        <strong>{profile.display_name}</strong>
        <span>✦ {profile.coins} Cosmic Coins</span>
        <span>Solves {profile.total_solves}</span>
        <span>Daily streak {profile.daily_streak}</span>
        {profile.equipped_avatar && <span className="muted">Avatar: {profile.equipped_avatar}</span>}
        {profile.equipped_banner && <span className="muted">Banner: {profile.equipped_banner}</span>}
      </div>
      <h2>Best times</h2>
      <div className="list">
        {DIFFICULTIES.map((d) => (
          <div className="row-card" key={d.id}>
            <span>{d.name}</span>
            <span>{profile.best_times?.[d.id] != null ? formatElapsed(profile.best_times[d.id]) : '—'}</span>
          </div>
        ))}
      </div>
      <h2>Achievements</h2>
      <div className="list">
        {ACHIEVEMENTS.map((a) => (
          <div className="row-card" key={a.id}>
            <span>
              <strong>{a.name}</strong>
              <div className="muted">{a.description}</div>
            </span>
            <span className="badge">{unlocked.includes(a.id) ? 'Done' : '—'}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
