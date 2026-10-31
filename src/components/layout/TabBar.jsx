
import { NavLink, useLocation } from 'react-router-dom'
import { Flame, MapPin, Heart, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEvents, unseenAlerts } from '../../lib/events'
import { useCurrentTown } from '../../lib/towns'
import { useT } from '../../lib/i18n'

// auth: guests see the tab greyed out, and tapping it raises the login toast.
const TABS = [
    { to: '/', icon: Flame, label: 'tabs.now' },
    { to: '/map', icon: MapPin, label: 'tabs.map' },
    { to: '/plans', icon: Heart, label: 'tabs.plans', auth: true, tour: 'plans-tab' },
    { to: '/alerts', icon: Bell, label: 'tabs.alerts', auth: true }
]

export default function TabBar({ askLogin }) {
    const t = useT()
    const { user } = useAuth()
    const location = useLocation()
    const events = useEvents()
    const town = useCurrentTown()

    // The event page has its own sticky Going bar; chat has its composer.
    if (location.pathname.startsWith('/event/') || location.pathname.includes('/chat')) return null

    // Off while on Alerts itself: the page marks everything seen as it opens.
    const alertDot = user && location.pathname !== '/alerts' && unseenAlerts(events ?? [], town?.id).length > 0

    // z-40 = chrome tier, same as Header. Modals/Sidebar are z-50 and must cover this.
    return (
        <nav className="sticky bottom-0 z-40 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg rounded-t-3xl px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] transition-colors duration-500">
            <div className="flex justify-around">
                {TABS.map(({ to, icon: Icon, label, auth, tour }) => {
                    const locked = auth && !user
                    const content = (active) => (
                        <>
                            <span className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-colors ${active ? 'bg-turquoise text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                <Icon size={20} fill={active && Icon !== MapPin ? 'currentColor' : 'none'} />
                                {to === '/alerts' && alertDot && (
                                    <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-sunflower ring-2 ring-white dark:ring-slate-800" />
                                )}
                            </span>
                            <span className={`text-[11px] font-bold ${active ? 'text-turquoise' : 'text-gray-500 dark:text-gray-400'}`}>{t(label)}</span>
                        </>
                    )
                    const cls = 'flex flex-col items-center gap-0.5 px-2 py-1'
                    return locked ? (
                        <button key={to} type="button" data-tour={tour} onClick={askLogin} className={`${cls} opacity-50`}>
                            {content(false)}
                        </button>
                    ) : (
                        <NavLink key={to} to={to} end data-tour={tour} className={cls}>
                            {({ isActive }) => content(isActive)}
                        </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}
