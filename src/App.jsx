
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
import Admin from './pages/Admin'
import Privacy from './pages/Privacy'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Layout from './components/layout/Layout'

// Most routes require a session. Public: /auth, /reset-password, /privacy (Play
// Store review must reach it logged out), and the guest browsing routes — Home,
// a town, an event — which show guests today/tomorrow only and grey out the rest.
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
            <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
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
