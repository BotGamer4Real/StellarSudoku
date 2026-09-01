import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { useAuth } from '../state/AuthProvider';

export function AuthScreen() {
  const { signIn, signUp, resetPassword, configured } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const title = useMemo(
    () => (mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Reset password'),
    [mode],
  );

  const go = async () => {
    setErr(null);
    setInfo(null);
    if (mode === 'reset') {
      const e = await resetPassword(email);
      if (e) setErr(e);
      else setInfo('Check your email for the reset link.');
      return;
    }
    const e = mode === 'up' ? await signUp(email, password) : await signIn(email, password);
    if (e) setErr(e);
    else nav(next);
  };

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/">←</Link>
        <h1 className="brand">{title}</h1>
      </div>
      {!configured && <p className="error">Supabase env vars are missing. Add them to .env.local / Vercel.</p>}
      <div className="stack">
        <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== 'reset' && (
          <input type="password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
        <p className="error">{err}</p>
        {info && <p className="ok">{info}</p>}
        <button className="btn primary" onClick={() => void go()}>{title}</button>
        {mode === 'in' && (
          <>
            <button className="btn ghost" onClick={() => setMode('up')}>Need an account? Sign up</button>
            <button className="btn ghost" onClick={() => setMode('reset')}>Forgot password</button>
          </>
        )}
        {mode !== 'in' && <button className="btn ghost" onClick={() => setMode('in')}>Back to sign in</button>}
        <p className="muted">Google Sign-In ships when Play Console OAuth is ready. Email is the v1 gate.</p>
      </div>
    </Shell>
  );
}
