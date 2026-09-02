# StellarSudoku

Space-themed 9×9 Sudoku. v1 ships on Google Play. This repository is the source of truth.

Classic Sudoku with a space theme — six difficulties, a 120-puzzle campaign, and one shared daily board.

## Stack

- Vite + React + TypeScript (mobile-first web client)
- Capacitor Android wrap for Google Play internal testing
- Supabase (auth, Postgres, RLS, RPCs)
- Vercel preview of the web client

Do not put service-role keys, database passwords, or dashboard secrets in this repo.

## Local

```bash
cp .env.example .env.local
# set VITE_SUPABASE_ANON_KEY from the Supabase project (anon / publishable only)
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Database

Linked project: `cihiqvzppnvuiwnquvpe` (StellarSudoku).

```bash
npx supabase db push
npm run generate:puzzles
npx supabase db query --linked -f supabase/migrations/00002_seed_puzzles.sql
npx supabase functions deploy delete-account
```

Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project settings (Production + Preview). Never add the service role key there.

## Android (Play internal test)

Package id: `com.stellarsudoku.app`. Portrait is the primary layout.

```bash
npm install
# .env.local must contain the public Supabase URL + anon key (baked into the web build)
npm run android:build
```

That writes a debug APK to `android/app/build/outputs/apk/debug/`. Open the project in Android Studio with `npm run android:open`.

`android/local.properties` is machine-local (gitignored). Point `sdk.dir` at your Android SDK if Gradle cannot find it.

## Play Console (you do this in the browser)

I cannot access Google Play Console. Create the app yourself, then upload the signed bundle.

1. [play.google.com/console](https://play.google.com/console) → **Create app**
2. Name: **StellarSudoku** · language English · app (not game-with-ads) · free
3. Package / application id: `com.stellarsudoku.app` (must match this project; you cannot change it later)
4. Accept Play App Signing (default). This project's `.jks` is the **upload key**; Google holds the app-signing key.
5. Testing → **Internal testing** → Create release → upload `play-release/StellarSudoku-1.0.0.aab`
6. Complete Data safety: collects email + gameplay progress for app functionality; not sold; no ads; no IAP
7. Content rating: Everyone / PEGI 3 equivalent. Accounts are 13+.
8. In-app account deletion: Settings → Delete account (already in the binary)

The upload keystore is **not** in Git. Keep `android/keystore/KEEP-THIS-SECRET.txt` and `stellarsudoku-upload.jks` in a password manager / offline backup. Losing them means a Play upload-key reset.

Rebuild a signed bundle:

```bash
npm run android:bundle
```
