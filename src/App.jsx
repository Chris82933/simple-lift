import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import Today from './pages/Today.jsx'
import Program from './pages/Program.jsx'
import Programs from './pages/Programs.jsx'
import Builder from './pages/Builder.jsx'
import Templates from './pages/Templates.jsx'
import Schedule from './pages/Schedule.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Profile from './pages/Profile.jsx'
import Workout from './pages/Workout.jsx'

export default function App() {
  return (
    <Routes>
      {/* Full-screen flows (no bottom nav) */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/workout" element={<Workout />} />
      <Route path="/builder" element={<Builder />} />
      <Route path="/schedule" element={<Schedule />} />

      {/* Main app shell with bottom navigation */}
      <Route element={<AppLayout />}>
        <Route path="/today" element={<Today />} />
        <Route path="/program" element={<Program />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  )
}
