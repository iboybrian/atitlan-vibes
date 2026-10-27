
import { useState, useEffect, Suspense } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Header from './Header'
import { PigeonLoading } from '../ui/Pigeon'
import Sidebar from './Sidebar'
import TownFooter from './TownFooter'
import PushPromptModal from '../ui/PushPromptModal'
import Tour from '../ui/Tour'
import { useAuth } from '../../context/AuthContext'
import { shouldShowPushPrompt, isPushSupported, refreshPushToken, onPushTap, onPushReceived } from '../../lib/pushNotifications'
import { refreshDetectedTown } from '../../lib/geolocation'
import { shouldShowTour } from '../../lib/utils'
import { syncLang, useT } from '../../lib/i18n'
import { coo } from '../../lib/sound'
import { checkForUpdate, startUpdate, installUpdate } from '../../lib/appUpdate'
import { App as CapacitorApp } from '@capacitor/app'

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [showPushPrompt, setShowPushPrompt] = useState(false)
    const [showTour, setShowTour] = useState(false)
    const [pushBanner, setPushBanner] = useState(null)
    // "Log in first" toast for guests who tap a locked feature. Pages raise it
    // with useOutletContext().askLogin; a counter, so a second tap re-arms the timer.
    const [loginToast, setLoginToast] = useState(0)
    // New version on Play: null | 'available' | 'downloading' | 'downloaded'.
    // "Later" hides it until the next cold start, not forever.
    const [update, setUpdate] = useState(null)
    const [updateDismissed, setUpdateDismissed] = useState(false)
    const { user } = useAuth()
    const navigate = useNavigate()
    const t = useT()

    const maybeShowPushPrompt = () => {
        if (shouldShowPushPrompt() && isPushSupported()) setShowPushPrompt(true)
    }

    // A push is only worth sending if it opens the event it is about — an
    // advertiser whose blast lands on Home does not buy a second one. Separate
    // from the user effect below: the listener is registered at module scope in
    // main.jsx, so a tap can already be buffered before the session resolves.
    useEffect(() => onPushTap(path => navigate(path)), [navigate])

    // Android suppresses the tray notification for the foreground app, so a push
    // that arrives while someone is looking at the app is delivered and dropped —
    // 200 from FCM, nothing on screen. Render it in-app instead, tappable to the
    // same place the real notification would have gone.
    useEffect(() => onPushReceived(push => { coo(); setPushBanner(push) }), [])

    // Separate effect so a second push re-arms the timer for free instead of
    // inheriting the first one's remaining time.
    useEffect(() => {
        if (!pushBanner) return
        const timer = setTimeout(() => setPushBanner(null), 6000)
        return () => clearTimeout(timer)
    }, [pushBanner])

    useEffect(() => {
        if (!loginToast) return
        const timer = setTimeout(() => setLoginToast(0), 2000)
        return () => clearTimeout(timer)
    }, [loginToast])

    // Ask Play for a newer version on launch and on every resume — guests too.
    // Never downgrades the banner: once downloading/downloaded, a resume check
    // returning 'available' must not reset it.
    useEffect(() => {
        const check = () => checkForUpdate().then(next => {
            if (next) setUpdate(cur => (cur === 'downloading' || cur === 'downloaded') && next === 'available' ? cur : next)
        })
        check()
        const resume = CapacitorApp.addListener('appStateChange', ({ isActive }) => { if (isActive) check() })
        return () => { resume.then(h => h.remove()) }
    }, [])

    // Show the tour, then the push prompt after first login
    useEffect(() => {
        if (!user) return

        // Silent no-op unless already opted in — FCM tokens rotate
        refreshPushToken(user.id)

        // Same contract: silent unless the OS granted and the user opted in.
        refreshDetectedTown(user.id)

        // This shell does not remount when the app is resumed — the Outlet swaps
        // but Layout stays mounted, and Android never reloads the WebView. Without
        // this listener "on open" would really only mean "on cold start", and
        // someone who never closes the app would go permanently stale.
        const resume = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
            if (isActive) refreshDetectedTown(user.id)
        })

        // First login never passes through Settings, so the detected language
        // would otherwise never reach the row notify-town reads.
        syncLang(user.id)

        // Both are first-login only, so they'd otherwise stack on top of each
        // other. The tour goes first; the push prompt waits for it to end.
        const timer = setTimeout(() => {
            if (shouldShowTour()) setShowTour(true)
            else maybeShowPushPrompt()
        }, 2000)
        return () => {
            clearTimeout(timer)
            resume.then(handle => handle.remove())
        }
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
                    {/* Lazy routes (see App.jsx) land here; header and footer stay put. */}
                    <Suspense fallback={<PigeonLoading label={t('common.loading')} />}>
                        <Outlet context={{ askLogin: () => { coo(); setLoginToast(n => n + 1) } }} />
                    </Suspense>
                </main>

                {/* New version on Play. Above the footer like the login toast;
                    a downloaded update can't be dismissed, it only waits for Restart. */}
                {update && !(update === 'available' && updateDismissed) && (
                    <div
                        role="status"
                        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm rounded-xl shadow-lg bg-sunflower text-black flex items-center gap-2 px-4 py-3 animate-in slide-in-from-bottom-5"
                    >
                        <p className="flex-1 text-sm font-bold">
                            {t(update === 'downloaded' ? 'update.ready' : update === 'downloading' ? 'update.downloading' : 'update.available')}
                        </p>
                        {update === 'available' && (
                            <>
                                <button type="button" onClick={() => setUpdateDismissed(true)} className="shrink-0 px-2 py-1.5 text-sm font-bold opacity-70">
                                    {t('update.later')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUpdate('downloading')
                                        startUpdate(() => setUpdate('downloaded'))
                                            .then(ok => { if (!ok) setUpdate(cur => cur === 'downloading' ? 'available' : cur) })
                                    }}
                                    className="shrink-0 px-3 py-1.5 rounded-lg bg-black text-white text-sm font-bold"
                                >
                                    {t('update.update')}
                                </button>
                            </>
                        )}
                        {update === 'downloaded' && (
                            <button type="button" onClick={installUpdate} className="shrink-0 px-3 py-1.5 rounded-lg bg-black text-white text-sm font-bold">
                                {t('update.restart')}
                            </button>
                        )}
                    </div>
                )}

                {/* Guest tapped something that needs an account. Sits above the
                    footer; fixed is fine for the same reason as the push banner. */}
                {loginToast > 0 && !user && (
                    <div
                        role="status"
                        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm rounded-xl shadow-lg bg-gray-900 dark:bg-slate-700 text-white flex items-center gap-3 px-4 py-3 animate-in slide-in-from-bottom-5"
                    >
                        <p className="flex-1 text-sm">{t('guest.loginToAccess')}</p>
                        <button
                            type="button"
                            onClick={() => { setLoginToast(0); navigate('/auth') }}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-turquoise text-white text-sm font-bold"
                        >
                            {t('common.logIn')}
                        </button>
                    </div>
                )}

                {/* A push that arrived with the app in the foreground. Fixed is fine
                    here for the same reason the Profile toast is: viewport-centered
                    equals shell-centered. Pads for the status bar like Header does,
                    since the WebView draws under it edge-to-edge. */}
                {pushBanner && (
                    <div
                        role="alert"
                        className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm rounded-xl shadow-lg bg-turquoise text-white animate-in slide-in-from-top-5"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                // null for a push that names no event or route —
                                // it must not navigate to /event/undefined.
                                if (pushBanner.path) navigate(pushBanner.path)
                                setPushBanner(null)
                            }}
                            className="w-full px-5 py-3 text-left"
                        >
                            {pushBanner.title && (
                                <p className="font-bold text-sm">{pushBanner.title}</p>
                            )}
                            {pushBanner.body && (
                                <p className="text-sm opacity-90">{pushBanner.body}</p>
                            )}
                        </button>
                    </div>
                )}

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

