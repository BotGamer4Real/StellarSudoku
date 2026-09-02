import { Link } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { PRIVACY_POLICY_URL } from '../lib/constants';

export function PrivacyScreen() {
  return (
    <Shell>
      <div className="topbar">
        <Link className="icon-btn" to="/">←</Link>
        <h1 className="brand">Privacy</h1>
      </div>
      <div className="help stack">
        <p>Effective 2 September 2026. This matches what the app collects.</p>
        <p>
          Public URL for store listings:{' '}
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">
            {PRIVACY_POLICY_URL}
          </a>
        </p>
        <h2>Who we are</h2>
        <p>StellarSudoku is published by BotGamer4Real. Contact: botgamer4real@gmail.com.</p>
        <h2>What we collect</h2>
        <p>Guest Single Player stays on this device. An account stores email, auth ids, display name, campaign and daily progress, coins, cosmetics, achievements, and in-progress boards.</p>
        <p>We do not collect precise location, advertising IDs for ads, or move-by-move telemetry for advertising. No ads and no real-money purchases in this version. We do not sell personal data.</p>
        <h2>Where it is stored</h2>
        <p>Cloud data is stored in our EU (Ireland) Supabase project. Guest data can be lost on uninstall or clear data.</p>
        <h2>Sharing</h2>
        <p>Display names and times appear on Daily and Campaign leaderboards. Hosting and database providers process data to run the app. We do not share data with advertisers.</p>
        <h2>Children</h2>
        <p>Content is a general audience. Accounts are not offered to children under 13.</p>
        <h2>Account deletion</h2>
        <p>Settings → Delete account. Type DELETE. Cloud rows are purged.</p>
      </div>
    </Shell>
  );
}
