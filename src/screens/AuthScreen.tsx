import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { authCallbackError, clearAuthCallbackFromUrl } from '../lib/authRedirect';
import { DISPLAY_NAME_RE } from '../lib/constants';
import { useAuth } from '../state/AuthProvider';

const PENDING_NAME_KEY = 'stellarsudoku.pendingDisplayName';

export function AuthScreen() {
  const { signIn, signUp, resetPassword, resendConfirmation, setDisplayName, configured } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [displayName, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const callbackErr = authCallbackError();
    if (!callbackErr) return;
    const expired = /invalid or has expired|otp_expired|access_denied/i.test(callbackErr);
    setErr(
      expired
        ? 'That confirmation link is invalid or has expired. Enter your email and resend a new one.'
        : callbackErr,
    );
    clearAuthCallbackFromUrl();
  }, []);

  const title = useMemo(
    () => (mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Reset password'),
    [mode],
  );

  const switchMode = (nextMode: 'in' | 'up') => {
    setMode(nextMode);
    setErr(null);
    setInfo(null);
    setPassword('');
    setConfirm('');
  };

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required.';
    if (mode === 'reset') return null;
    if (!password) return 'Password is required.';
    if (mode === 'up') {
      if (!DISPLAY_NAME_RE.test(displayName.trim())) {
        return 'Display name is required: 3–20 characters, start with a letter or number.';
      }
      if (password.length < 8) return 'Password must be at least 8 characters.';
      if (password !== confirm) return 'Passwords do not match.';
    }
    return null;
  };

  const go = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    const problem = validate();
    if (problem) {
      setErr(problem);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'reset') {
        const resetErr = await resetPassword(email.trim());
        if (resetErr) setErr(resetErr);
        else setInfo('Check your email for the reset link.');
        return;
      }
      if (mode === 'up') {
        const result = await signUp(email.trim(), password);
        if (result.error) {
          setErr(result.error);
          return;
        }
        localStorage.setItem(PENDING_NAME_KEY, displayName.trim());
        if (result.needsConfirm) {
          setInfo('Account created. Check your email to confirm, then sign in.');
          setMode('in');
          setPassword('');
          setConfirm('');
          return;
        }
        const nameErr = await setDisplayName(displayName.trim());
        if (nameErr) {
          setErr(nameErr);
          nav('/');
          return;
        }
        localStorage.removeItem(PENDING_NAME_KEY);
        nav(next);
        return;
      }
      const signInErr = await signIn(email.trim(), password);
      if (signInErr) setErr(signInErr);
      else nav(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/" aria-label="Back">←</Link>
        <h1 className="brand">{title}</h1>
      </div>
      {!configured && <p className="error">Supabase env vars are missing. Add them to .env.local / Vercel.</p>}

      {mode !== 'reset' && (
        <div className="auth-switch" role="tablist" aria-label="Account mode">
          <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'active' : ''} onClick={() => switchMode('in')}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'active' : ''} onClick={() => switchMode('up')}>
            Sign up
          </button>
        </div>
      )}

      <form className="stack" onSubmit={(e) => void go(e)}>
        {mode === 'up' && (
          <label className="field">
            <span>Display name *</span>
            <input
              type="text"
              autoComplete="nickname"
              placeholder="Shown on leaderboards"
              maxLength={20}
              value={displayName}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        )}
        <label className="field">
          <span>Email *</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {mode !== 'reset' && (
          <label className="field">
            <span>Password *</span>
            <input
              type="password"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              placeholder={mode === 'up' ? 'At least 8 characters' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'up' ? 8 : undefined}
            />
          </label>
        )}
        {mode === 'up' && (
          <label className="field">
            <span>Confirm password *</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </label>
        )}
        <p className="error">{err}</p>
        {info && <p className="ok">{info}</p>}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : title}
        </button>
      </form>

      {mode === 'in' && (
        <>
          <button
            className="btn"
            type="button"
            disabled={busy || !email.trim()}
            onClick={async () => {
              setErr(null);
              setInfo(null);
              setBusy(true);
              const resendErr = await resendConfirmation(email.trim());
              setBusy(false);
              if (resendErr) setErr(resendErr);
              else setInfo('New confirmation email sent. Use the latest email only.');
            }}
          >
            Resend confirmation email
          </button>
          <button className="btn" type="button" onClick={() => { setMode('reset'); setErr(null); setInfo(null); }}>
            Forgot password
          </button>
        </>
      )}
      {mode === 'reset' && (
        <button className="btn" type="button" onClick={() => switchMode('in')}>
          Back to sign in
        </button>
      )}
      {mode === 'up' && <p className="muted">* Required. Display name must be unique, 3–20 characters.</p>}
    </Shell>
  );
}
