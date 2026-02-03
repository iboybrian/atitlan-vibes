
import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import TownFooter from './TownFooter'
import FloatingActionButton from '../ui/FloatingActionButton'
import AddEventModal from '../ui/AddEventModal'
import PushPromptModal from '../ui/PushPromptModal'
import { useAuth } from '../../context/AuthContext'
import { shouldShowPushPrompt, isPushSupported } from '../../lib/pushNotifications'

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isAddEventOpen, setIsAddEventOpen] = useState(false)
    const [showPushPrompt, setShowPushPrompt] = useState(false)
    const { user } = useAuth()
    const navigate = useNavigate()

    // Show push prompt after first login
    useEffect(() => {
        if (user && shouldShowPushPrompt() && isPushSupported()) {
            // Delay slightly so user sees the app first
            const timer = setTimeout(() => {
                setShowPushPrompt(true)
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [user])

    const handleFabClick = () => {
        if (!user) {
            if (confirm("You need to be logged in to post an event. Go to login?")) {
                navigate('/auth')
            }
        } else {
            setIsAddEventOpen(true)
        }
    }

    return (
        // Mobile Vision: Center the app in a phone-sized container on desktop
        <div className="min-h-screen w-full flex justify-center bg-[#F5F5F0] dark:bg-slate-900 transition-colors duration-500">
            <div className="w-full max-w-[450px] min-h-screen bg-[#F5F5F0] dark:bg-slate-900 shadow-2xl relative flex flex-col transition-colors duration-500">

                <Header onMenuClick={() => setSidebarOpen(true)} />

                {/* Navigation moved to Home Page body */}

                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <main className="flex-1 pb-24 transition-colors duration-500">
                    <Outlet />
                </main>

                {/* FAB moved to Home page inline */}

                {user && (
                    <AddEventModal
                        isOpen={isAddEventOpen}
                        onClose={() => setIsAddEventOpen(false)}
                    />
                )}

                {/* Push Notification Soft Prompt */}
                <PushPromptModal
                    isOpen={showPushPrompt}
                    onClose={() => setShowPushPrompt(false)}
                    userId={user?.id}
                />

                {/* Persistent Town Footer */}
                <TownFooter />

            </div>
        </div>
    )
}

