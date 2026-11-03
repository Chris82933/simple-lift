import { isIOS, isStandalone } from './platform.js'

export const STANDALONE_SIGN_IN_MSG =
  'Google sign-in can’t finish inside the home-screen app on this iPhone. Your data is still saved here — use “Back up my data” below to keep a copy, or open the app in Safari to sign in there.'

// Plain-language versions of the sign-in errors people actually hit.
export function friendlyAuthError(e) {
  const code = e?.code || ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/user-cancelled') return null // they closed it — not an error
  if (code === 'auth/popup-blocked') return 'The sign-in window was blocked. Tap “Sign in with Google” again — and if your browser asks, allow the pop-up.'
  if (code === 'auth/network-request-failed') return 'Couldn’t reach Google. Check your connection and try again.'
  if (code === 'auth/unauthorized-domain') return 'Sign-in isn’t set up for this web address yet. (App owner: add this domain under Firebase → Authentication → Authorized domains.)'
  if (code === 'auth/web-storage-unsupported' || code === 'auth/operation-not-supported-in-this-environment') {
    return isIOS() && isStandalone()
      ? STANDALONE_SIGN_IN_MSG
      : 'This browser is blocking the storage Google sign-in needs. Try turning off private browsing, or another browser.'
  }
  if (code === 'app/sdk-load-failed') return 'Couldn’t load sign-in. Check your connection, then reopen the app.'
  return `Sign-in didn’t complete${code ? ` (${code})` : ''}. Please try again.`
}
