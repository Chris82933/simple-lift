import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { initInstallPrompt } from './lib/installPrompt.js'

// Capture the home-screen install prompt as early as possible (it can fire
// before React mounts).
initInstallPrompt()

// HashRouter keeps deep links working on GitHub Pages (no server-side SPA fallback needed).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AuthProvider>
  </StrictMode>,
)
