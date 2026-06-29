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

Scaffold stage — app shell, navigation, and placeholder screens are in place. Program generation, exercise library, and the cute mascot demos come next.
