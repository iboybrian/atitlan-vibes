
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import TownDetail from './pages/TownDetail'
import EventDetail from './pages/EventDetail'
import ChatRoom from './pages/ChatRoom'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import About from './pages/About'
import Auth from './pages/Auth'
import Layout from './components/layout/Layout'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/town/:id" element={<TownDetail />} />
            <Route path="/town/:townId/chat" element={<ChatRoom />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
