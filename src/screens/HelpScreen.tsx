import { Link } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { ACCOUNT_DELETION_URL, PRIVACY_POLICY_URL } from '../lib/constants';

export function HelpScreen() {
  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/">←</Link>
        <h1 className="brand">Help</h1>
      </div>
      <div className="help stack">
        <h2>Rules</h2>
        <p>Fill the 9×9 grid so each row, column, and 3×3 box contains the digits 1–9 once. Place by tap or by dragging a digit onto a cell. Invalid moves flash the conflict and are not committed. A digit leaves the pad when all nine of that digit are on the board.</p>
        <h2>Coins</h2>
        <p>Cosmic Coins are earned by play, never bought with real money. Single Player pays the difficulty table once per unique board. Replays pay 0. Campaign and Daily can add a Perfect bonus. Daily also adds a streak bonus, +10% per consecutive day, capped at +50%.</p>
        <h2>Daily Challenge</h2>
        <p>Everyone gets the same board. The window resets at 07:00 GMT. Timer starts after Launch Puzzle. Power-ups are off. Each undo adds 5 seconds. Only the first valid finish of the day is accepted.</p>
        <h2>Guest vs account</h2>
        <p>A guest may finish Single Player on this device. Campaign cloud save, Daily submit, shop, and achievements need Sign in. After Sign up you can keep the new account as-is or attach local Single Player stats once.</p>
        <h2>Account deletion</h2>
        <p>
          Settings → Delete account, or the web page{' '}
          <a href={ACCOUNT_DELETION_URL} target="_blank" rel="noreferrer">
            delete-account.html
          </a>
          . Type DELETE. Cloud rows are purged. Signing in with the same email requires Sign up again.
        </p>
        <h2>Privacy</h2>
        <p>
          <Link to="/privacy">Privacy policy</Link>
          {' · '}
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">
            Public page
          </a>
        </p>
      </div>
    </Shell>
  );
}
