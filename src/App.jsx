import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import Today from './pages/Today.jsx'
import Program from './pages/Program.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Profile from './pages/Profile.jsx'
import Workout from './pages/Workout.jsx'

export default function App() {
  return (
    <Routes>
      {/* Full-screen flows (no bottom nav) */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/workout" element={<Workout />} />

      {/* Main app shell with bottom navigation */}
      <Route element={<AppLayout />}>
        <Route path="/today" element={<Today />} />
        <Route path="/program" element={<Program />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  )
}
