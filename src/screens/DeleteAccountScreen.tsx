import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { ACCOUNT_DELETION_URL } from '../lib/constants';
import { useAuth } from '../state/AuthProvider';

export function DeleteAccountScreen() {
  const { user, profile, signIn, deleteAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const doSignIn = async () => {
    setErr(null);
    setBusy(true);
    const signErr = await signIn(email.trim(), password);
    setBusy(false);
    if (signErr) setErr(signErr);
  };

  const doDelete = async () => {
    setErr(null);
    setBusy(true);
    const delErr = await deleteAccount();
    setBusy(false);
    if (delErr) setErr(delErr);
    else setDone(true);
  };

  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/" aria-label="Back">←</Link>
        <h1 className="brand">Delete account</h1>
      </div>
      {done ? (
        <div className="help stack">
          <p className="ok">Your account and cloud data have been deleted.</p>
          <Link className="btn" to="/">Back to StellarSudoku</Link>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">
            This purges your profile, progress, coins, achievements, and leaderboard rows. Public store URL:{' '}
            <a href={ACCOUNT_DELETION_URL}>{ACCOUNT_DELETION_URL}</a>
          </p>
          {!user && (
            <>
              <p>Sign in with the account you want to delete.</p>
              <label className="field">
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </label>
              <label className="field">
                <span>Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </label>
              <button className="btn primary" type="button" disabled={busy} onClick={() => void doSignIn()}>
                Sign in
              </button>
            </>
          )}
          {user && (
            <>
              <p>Signed in as {profile?.display_name || user.email}. Type DELETE to confirm.</p>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
              <button className="btn danger" type="button" disabled={typed !== 'DELETE' || busy} onClick={() => void doDelete()}>
                Delete forever
              </button>
            </>
          )}
          <p className="error">{err}</p>
          <p className="muted">
            Cannot sign in? Email botgamer4real@gmail.com from that account. Requests are completed within 14 days.
          </p>
        </div>
      )}
    </Shell>
  );
}
