// ─────────────────────────────────────────────────────────────────────────
//  Google login / cloud sync configuration.
//
//  Google sign-in stays OFF until real Firebase values are present. The app
//  works fully on local / offline storage without this.
//
//  Two ways to supply the values (either works):
//    A) Quickest — paste them straight into the `direct` object below,
//       replacing the YOUR_… placeholders.
//    B) Cleaner  — put them in a `.env` file as VITE_FIREBASE_* variables
//       (copy .env.example → .env). These override the `direct` values and
//       keep them out of tracked source.
//
//  Where to find the values: Firebase console → Project settings → "Your apps"
//  → SDK setup and configuration → Config.  Full walkthrough in README.md.
//
//  Note: the Firebase apiKey is a PUBLIC client identifier — it is safe to
//  commit. Security comes from the Firestore rules (see firestore.rules), not
//  from hiding the key.
// ─────────────────────────────────────────────────────────────────────────

// Option A — paste directly here:
const direct = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
}

// Option B — .env (VITE_FIREBASE_*) values win when present.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || direct.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || direct.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || direct.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || direct.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_SENDER_ID || direct.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || direct.appId,
}

// True only once every value is real (no leftover YOUR_… placeholder).
export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (v) => v && !String(v).startsWith('YOUR_'),
)
