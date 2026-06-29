import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

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
