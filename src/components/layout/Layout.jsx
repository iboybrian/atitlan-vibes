
import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import TownFooter from './TownFooter'
import PushPromptModal from '../ui/PushPromptModal'
import Tour from '../ui/Tour'
import { useAuth } from '../../context/AuthContext'
import { shouldShowPushPrompt, isPushSupported, refreshPushToken } from '../../lib/pushNotifications'
import { shouldShowTour } from '../../lib/utils'
import { syncLang } from '../../lib/i18n'

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [showPushPrompt, setShowPushPrompt] = useState(false)
    const [showTour, setShowTour] = useState(false)
    const { user } = useAuth()

    const maybeShowPushPrompt = () => {
        if (shouldShowPushPrompt() && isPushSupported()) setShowPushPrompt(true)
    }

    // Show the tour, then the push prompt after first login
    useEffect(() => {
        if (!user) return

        // Silent no-op unless already opted in — FCM tokens rotate
        refreshPushToken(user.id)

        // First login never passes through Settings, so the detected language
        // would otherwise never reach the row notify-town reads.
        syncLang(user.id)

        // Both are first-login only, so they'd otherwise stack on top of each
        // other. The tour goes first; the push prompt waits for it to end.
        const timer = setTimeout(() => {
            if (shouldShowTour()) setShowTour(true)
            else maybeShowPushPrompt()
        }, 2000)
        return () => clearTimeout(timer)
    }, [user])

    return (
        // Responsive shell: centered column that widens with the viewport. Width is declared here only.
        <div className="min-h-screen w-full flex justify-center bg-[#F5F5F0] dark:bg-slate-900 transition-colors duration-500">
            <div className="w-full max-w-[450px] sm:max-w-xl md:max-w-2xl lg:max-w-4xl min-h-screen bg-[#F5F5F0] dark:bg-slate-900 shadow-2xl relative flex flex-col transition-colors duration-500">

                <Header onMenuClick={() => setSidebarOpen(true)} />

                {/* Navigation moved to Home Page body */}

                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <main className="flex-1 transition-colors duration-500">
                    <Outlet />
                </main>

                {/* Push Notification Soft Prompt */}
                <PushPromptModal
                    isOpen={showPushPrompt}
                    onClose={() => setShowPushPrompt(false)}
                    userId={user?.id}
                />

                {/* Persistent Town Footer */}
                <TownFooter />

                {/* First-run guided tour — last so it sits above the footer it points at */}
                <Tour
                    isOpen={showTour}
                    onClose={() => {
                        setShowTour(false)
                        maybeShowPushPrompt()
                    }}
                />

            </div>
        </div>
    )
}

