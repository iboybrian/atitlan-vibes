
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Home from './pages/Home'
import TownDetail from './pages/TownDetail'
import EventDetail from './pages/EventDetail'
import ChatRoom from './pages/ChatRoom'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Favorites from './pages/Favorites'
import About from './pages/About'
import Privacy from './pages/Privacy'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Layout from './components/layout/Layout'

// Everything except /auth and /privacy requires a session — Privacy stays
// reachable logged out since Play Store review expects that.
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
            <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
            <Route path="/town/:id" element={<RequireAuth><TownDetail /></RequireAuth>} />
            <Route path="/town/:townId/chat" element={<RequireAuth><ChatRoom /></RequireAuth>} />
            <Route path="/event/:id" element={<RequireAuth><EventDetail /></RequireAuth>} />
            <Route path="/auth" element={<Auth />} />
            {/* Public: the recovery session may not be in place the instant this
                renders, and RequireAuth would bounce the user to /auth. The page
                handles the no-session case itself. */}
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
            <Route path="/about" element={<RequireAuth><About /></RequireAuth>} />
            <Route path="/privacy" element={<Privacy />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
