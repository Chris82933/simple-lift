# Simple Lift

Build an effective compound-lift workout program with almost no guesswork — then use it as a live tracker in the gym.

A mobile-first PWA for beginner and intermediate lifters. Pick the body regions you want to focus on, your equipment, schedule, and goals; Simple Lift generates a balanced program and walks you through each session (set tracking, rest timers, progressive-overload suggestions). Data is saved on-device for now, with cloud sync planned later.

## Tech

- React 19 + Vite
- React Router (HashRouter, for GitHub Pages compatibility)
- vite-plugin-pwa (installable / offline)

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages.

One-time setup after creating the repo: in **Settings → Pages → Build and deployment**, set **Source = GitHub Actions**.

> The app is served from `/simple-lift/`. If you name the repo something else, update `REPO` in `vite.config.js`, the icon paths in `index.html`, and `start_url`/`scope` in the manifest.

## Status

Working app: onboarding → generated program, a custom **program builder**, **multiple programs** with switching, goal-aware **progressive overload** on every program, a live **workout tracker** (set logging, rest timer), and **local-first storage**. Optional **Google login + cloud sync** via Firebase (off until configured — see below).

## Google login (optional cloud sync)

The app works fully on local/offline storage. Turning on Google sign-in lets users back up and sync programs + history across devices. It's powered by Firebase (no server needed), and stays **off** until you add your config.

**One-time setup (~10 min):**

1. Go to https://console.firebase.google.com → **Add project** (any name). You can skip Google Analytics.
2. In the project: **Build → Authentication → Get started → Sign-in method → Google → Enable** (pick a support email) → Save.
3. **Build → Firestore Database → Create database** → Start in **production mode** → pick a location.
4. In Firestore → **Rules** tab, paste this so each user can only read/write their own data, then **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
5. Project **Settings (gear) → General → Your apps → Web app (`</>`)**. Register an app, then copy the `firebaseConfig` values.
6. Paste those six values into [`src/lib/firebaseConfig.js`](src/lib/firebaseConfig.js), replacing the `YOUR_…` placeholders.
7. **Authentication → Settings → Authorized domains → Add domain:** `chris82933.github.io` (localhost is already allowed for local testing).
8. Commit & push. The "Sign in with Google" button on the Profile screen now works.

> The Firebase `apiKey` is a **public** client identifier — it's safe to commit. Security comes from the Firestore rules above, not from hiding the key.

## Data & privacy

Without Google login, all data lives in the browser's local storage on one device. Clearing site data / cache, switching browsers, or using another device loses it. Signing in with Google backs it up and syncs it. This is surfaced to users on the Profile screen.
