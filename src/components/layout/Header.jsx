
import { Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// House colors mapping
const HOUSE_COLORS = {
    gryffindor: 'bg-red-700',
    slytherin: 'bg-emerald-700',
    ravenclaw: 'bg-blue-600',
    hufflepuff: 'bg-yellow-500'
}

const HOUSE_TEXT_COLORS = {
    gryffindor: 'text-white',
    slytherin: 'text-white',
    ravenclaw: 'text-white',
    hufflepuff: 'text-black'
}

export default function Header({ onMenuClick }) {
    const { userProfile } = useAuth()
    const house = userProfile?.house_affinity

    // Get background color based on house or default (with dark mode support)
    const bgColor = house && HOUSE_COLORS[house]
        ? HOUSE_COLORS[house]
        : 'bg-[#F5F5F0] dark:bg-slate-800'
    const textColor = house && HOUSE_TEXT_COLORS[house]
        ? HOUSE_TEXT_COLORS[house]
        : 'text-black dark:text-white'

    return (
        <header
            className={`sticky top-0 z-40 px-4 h-[60px] flex items-center justify-between transition-all duration-[1500ms] ease-in-out ${bgColor}`}
        >
            <button
                onClick={onMenuClick}
                className={`p-2 -ml-2 hover:bg-black/10 rounded-full transition-all duration-[1500ms] ${textColor}`}
            >
                <Menu size={24} />
            </button>

            <Link to="/" className="flex items-center justify-center h-full py-2">
                <span className={`font-black text-xl tracking-tight transition-all duration-[1500ms] ${textColor}`}>
                    Atitlán Vibes
                </span>
            </Link>

            <div style={{ width: 40 }}></div> {/* Spacer to balance menu button */}
        </header>
    )
}

