
import { User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import TownPicker from '../ui/TownPicker'
import { useT, getLang, setLang } from '../../lib/i18n'

// House colors mapping
const HOUSE_COLORS = {
    gryffindor: 'bg-red-700',
    slytherin: 'bg-emerald-700',
    ravenclaw: 'bg-blue-600',
    hufflepuff: 'bg-yellow-500'
}

const initials = (name) => name?.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

export default function Header({ onMenuClick }) {
    const t = useT()
    const { user, userProfile } = useAuth()
    const house = userProfile?.house_affinity

    // Get background color based on house or default (with dark mode support)
    const bgColor = house && HOUSE_COLORS[house]
        ? HOUSE_COLORS[house]
        : 'bg-[#F5F5F0] dark:bg-slate-800'

    return (
        // pt = status bar height, so the tap targets below clear the notification bar
        <header
            className={`sticky top-0 z-40 px-3 h-[60px] box-content pt-[env(safe-area-inset-top)] flex items-center gap-2 transition-all duration-[1500ms] ease-in-out ${bgColor}`}
        >
            <Link to="/" className="shrink-0 flex items-center h-full py-2">
                {/* 128px webp (7 KB) for a ~44px slot. logo.png (512px, 172 KB) stays in public/
                    only because the confirm-signup email links to it. */}
                <img src="/logo-128.webp" alt="Atitlán Vibes" width="128" height="128" className="h-full w-auto object-contain" />
            </Link>

            <TownPicker />

            <div className="flex-1" />

            {/* Two states, so a segmented pair beats a dropdown — same control as Settings. */}
            <div className="shrink-0 flex bg-white dark:bg-slate-700 rounded-full p-0.5 shadow-sm">
                {['en', 'es'].map(code => (
                    <button
                        key={code}
                        type="button"
                        onClick={() => setLang(code)}
                        aria-pressed={getLang() === code}
                        className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${getLang() === code
                            ? 'bg-turquoise text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-300'
                            }`}
                    >
                        {code.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* The avatar opens the menu: profile, settings, about, privacy, log out. */}
            <button
                type="button"
                data-tour="menu"
                onClick={onMenuClick}
                aria-label={t('sidebar.menu')}
                className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-turquoise text-white text-xs font-black flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-700"
            >
                {userProfile?.avatar_url
                    ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : user && initials(userProfile?.name) || <User size={18} />}
            </button>
        </header>
    )
}
