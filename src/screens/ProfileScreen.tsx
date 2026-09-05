import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coins } from '../components/Coins';
import { Shell } from '../components/Shell';
import { ART, avatarSrc, bannerSrc, DIFFICULTY_ART } from '../lib/art';
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

  const banner = bannerSrc(profile.equipped_banner) ?? ART.starfield;

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/" aria-label="Back">←</Link>
        <h1 className="brand">Profile</h1>
      </div>
      <div className="profile-hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(8,12,28,0.15), rgba(8,12,28,0.82)), url("${banner}")` }}>
        <img className="avatar-lg" src={avatarSrc(profile.equipped_avatar)} alt="" />
        <strong>{profile.display_name}</strong>
        <Coins amount={profile.coins} />
        <span className="muted">Solves {profile.total_solves} · Daily streak {profile.daily_streak}</span>
      </div>
      <h2>Best times</h2>
      <div className="list">
        {DIFFICULTIES.map((d) => (
          <div className="row-card art-card" key={d.id}>
            <img className="thumb" src={DIFFICULTY_ART[d.id]} alt="" />
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
