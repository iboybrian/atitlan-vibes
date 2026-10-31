
import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Home from './pages/Home'
import TownDetail from './pages/TownDetail'
import EventDetail from './pages/EventDetail'
import Layout from './components/layout/Layout'

// Home, a town and an event are the app's main path and ship in the main bundle.
// Everything else loads on first visit (Suspense is in Layout, around the
// Outlet), so a first open doesn't download and parse screens most people never
// reach on that visit.
const ChatRoom = lazy(() => import('./pages/ChatRoom'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const MapPage = lazy(() => import('./pages/MapPage'))
const Plans = lazy(() => import('./pages/Plans'))
const Alerts = lazy(() => import('./pages/Alerts'))
const About = lazy(() => import('./pages/About'))
const Admin = lazy(() => import('./pages/Admin'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Auth = lazy(() => import('./pages/Auth'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

// Most routes require a session. Public: /auth, /reset-password, /privacy (Play
// Store review must reach it logged out), and the guest browsing routes — Now,
// the map, a town, an event — which show guests today/tomorrow only and grey out
// the rest.
function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/auth" replace />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/town/:id" element={<TownDetail />} />
            <Route path="/town/:townId/chat" element={<RequireAuth><ChatRoom /></RequireAuth>} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/auth" element={<Auth />} />
            {/* Public: the recovery session may not be in place the instant this
                renders, and RequireAuth would bounce the user to /auth. The page
                handles the no-session case itself. */}
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/plans" element={<RequireAuth><Plans /></RequireAuth>} />
            <Route path="/alerts" element={<RequireAuth><Alerts /></RequireAuth>} />
            {/* Old Saved Events link, from before My Plans */}
            <Route path="/favorites" element={<Navigate to="/plans" replace />} />
            <Route path="/about" element={<RequireAuth><About /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
            <Route path="/privacy" element={<Privacy />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
