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
  apiKey: "AIzaSyBUFevSCsd5Vh2lx5hc6jOS4qREboueEyk",
  authDomain: "simple-lift-1f7ec.firebaseapp.com",
  projectId: "simple-lift-1f7ec",
  storageBucket: "simple-lift-1f7ec.firebasestorage.app",
  messagingSenderId: "144158287744",
  appId: "1:144158287744:web:14c5c52283eff5aac04365",
  measurementId: "G-1LBY7D6CPC"
}

// True only once every value is real (no leftover YOUR_… placeholder).
export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (v) => v && !String(v).startsWith('YOUR_'),
)
