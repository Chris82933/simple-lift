# Reliable Google sign-in on iPhone home-screen apps

## What was wrong

On iPhone the app used Firebase's *redirect* sign-in. Firebase reads the result
back through a hidden iframe on the `authDomain` — `simple-lift-1f7ec.firebaseapp.com`
— which is a different site from the app (`chris82933.github.io`). Safari blocks
that third-party storage (Intelligent Tracking Prevention, iOS 16.1+), and a
home-screen app also keeps its own separate storage. So Google sign-in completed,
the app reloaded, `getRedirectResult` came back empty, and the user was shown
as signed out. The error was swallowed, so nothing explained it.
See [Firebase: redirect best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices).

## What the code does now

- Signs in with a **popup** everywhere. In Safari this avoids the redirect
  problem. In a **home-screen app** it is not a real popup — iOS opens Google in
  a sheet the app can't watch — so if nothing comes back the app stops waiting
  after a few seconds and explains the options (back-up code, or Safari).
- Loads Firebase at app start, so the popup opens directly from the tap
  (Safari blocks popups that aren't).
- Restores a saved session before checking for a redirect result, and shows
  "Checking sign-in…" until Firebase answers — no more "signed out" flash.
- Shows sign-in errors in plain language instead of hiding them.

## The remaining gap, and the full fix

In a home-screen app the result still has to come back through the
cross-site firebaseapp.com helper, which Safari's storage blocking very likely
stops. So the code change alone probably does **not** fix the home-screen app.
To make it reliable, serve Firebase's auth helper **from the
app's own origin**. On GitHub Pages that means the root of
`chris82933.github.io` — a project site under `/simple-lift/` can't serve
`/__/auth/...`.

1. **Create a GitHub repo named `chris82933.github.io`** (a user site). It is the same origin as `chris82933.github.io/simple-lift/`.
2. **Copy Firebase's helper files into it**, keeping these paths:
   - `__/auth/handler` → save as `__/auth/handler.html`
   - `__/auth/handler.js`
   - `__/auth/experiments.js`
   - `__/auth/iframe` → save as `__/auth/iframe.html`
   - `__/auth/iframe.js`
   - `__/auth/links` → save as `__/auth/links.html`
   - `__/auth/links.js`
   - `__/firebase/init.json` (Firebase only serves this for Hosting projects, so
     it is written by hand from `src/lib/firebaseConfig.js`)

   A ready-made copy of all of this is in `../chris82933.github.io/`. Download each from `https://simple-lift-1f7ec.firebaseapp.com/` plus the path
   (for example `https://simple-lift-1f7ec.firebaseapp.com/__/auth/handler.js`).
   Re-copy them after major Firebase upgrades.
3. **Add an empty `.nojekyll` file** at the repo root — GitHub Pages otherwise drops folders starting with `_`.
4. **Check it serves:** `https://chris82933.github.io/__/auth/handler` should load a page (not 404).
5. **Firebase console → Authentication → Settings → Authorized domains:** make sure `chris82933.github.io` is listed.
6. **Google Cloud console → APIs & Services → Credentials →** the OAuth 2.0 *Web client (auto created by Google Service)*:
   - Authorized JavaScript origins: add `https://chris82933.github.io`
   - Authorized redirect URIs: add `https://chris82933.github.io/__/auth/handler` (keep the firebaseapp.com one)
7. **In `src/lib/firebaseConfig.js`** change `authDomain` to `"chris82933.github.io"`, commit and deploy.

After step 7, the popup is same-origin, and if a popup can't open the app
falls back to the redirect flow — which now works, because the result is read
from the app's own site.

## After deploying any fix

The app updates only when the user accepts the "Update available" prompt
(`registerType: 'prompt'`). Ask the affected user to open the app, tap
**Update**, then try signing in again.
