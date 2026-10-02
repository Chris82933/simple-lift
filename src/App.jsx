import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import FlowLayout from './components/FlowLayout.jsx'
import Today from './pages/Today.jsx'
import Program from './pages/Program.jsx'
import Programs from './pages/Programs.jsx'
import Builder from './pages/Builder.jsx'
import Templates from './pages/Templates.jsx'
import Schedule from './pages/Schedule.jsx'
import OneRepMax from './pages/OneRepMax.jsx'
import Progress from './pages/Progress.jsx'
import CardioLog from './pages/CardioLog.jsx'
import Skills from './pages/Skills.jsx'
import Onboarding from './pages/Onboarding.jsx'
import GzclpWizard from './pages/GzclpWizard.jsx'
import ImportProgram from './pages/ImportProgram.jsx'
import Recovery from './pages/Recovery.jsx'
import Profile from './pages/Profile.jsx'
import Workout from './pages/Workout.jsx'

// A new page starts at its top. Without this a page opened from halfway down
// another (Start workout, from the bottom of Today) appeared already scrolled,
// with its heading off-screen. Back/forward (POP) keeps whatever the browser
// restores.
function ScrollToTop() {
  const { pathname } = useLocation()
  const type = useNavigationType()
  useEffect(() => { if (type !== 'POP') window.scrollTo(0, 0) }, [pathname, type])
  return null
}

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* Genuinely modal: these two take over the screen on every size.
          Onboarding is a one-way setup flow, and nav chrome mid-set is a
          distraction you don't want during a workout. */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/workout" element={<Workout />} />

      {/* Full-screen flows (no bottom nav on mobile). FlowLayout renders
          nothing on a phone, so these stay exactly as they were; on a desktop
          it puts the sidebar back so a tool isn't a dead end. */}
      <Route element={<FlowLayout />}>
        <Route path="/builder" element={<Builder />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/one-rep-max" element={<OneRepMax />} />
        <Route path="/cardio" element={<CardioLog />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/gzclp" element={<GzclpWizard />} />
        <Route path="/import-program" element={<ImportProgram />} />
        <Route path="/recovery" element={<Recovery />} />
      </Route>

      {/* Main app shell with bottom navigation */}
      <Route element={<AppLayout />}>
        <Route path="/today" element={<Today />} />
        <Route path="/program" element={<Program />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
    </>
  )
}
