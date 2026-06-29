// ─────────────────────────────────────────────────────────────────────────
//  Google login / cloud sync configuration.
//
//  Google sign-in stays OFF until you paste your own Firebase project values
//  below (replacing the YOUR_… placeholders). The app works fully on local /
//  offline storage without this. Setup steps are in README.md → "Google login".
//
//  Where to find these: Firebase console → Project settings → "Your apps" →
//  SDK setup and configuration → Config.
// ─────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
}

// True only once every placeholder has been replaced with a real value.
export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (v) => v && !String(v).startsWith('YOUR_'),
)
