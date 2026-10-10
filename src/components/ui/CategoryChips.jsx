
import { Music, Landmark, Leaf, Palette, Beer, Sparkles } from 'lucide-react'
import { useT } from '../../lib/i18n'

// One per id in EVENT_CATEGORIES (utils.js).
const ICONS = { music: Music, culture: Landmark, wellness: Leaf, workshops: Palette, nightlife: Beer }

function Chip({ active, onClick, icon, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${active
                ? 'bg-turquoise text-white shadow-md shadow-turquoise/30'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 shadow-sm hover:text-turquoise'
                }`}
        >
            {icon}
            {label}
        </button>
    )
}

/**
 * Event-type filter row. `categories` comes from categoriesIn() so only types
 * with events get a chip; with fewer than two there is nothing to choose between.
 */
export default function CategoryChips({ categories, value, onChange }) {
    const t = useT()
    if (categories.length < 2) return null

    // Bleeds to the screen edge (-mx-4 px-4) so the row reads as scrollable on a
    // phone instead of looking clipped at the page padding.
    return (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 mb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Chip active={!value} onClick={() => onChange(null)} icon={<Sparkles size={16} />} label={t('category.all')} />
            {categories.map(id => {
                const Icon = ICONS[id]
                return (
                    <Chip
                        key={id}
                        active={value === id}
                        // Tapping the active chip again clears it, like a toggle.
                        onClick={() => onChange(value === id ? null : id)}
                        icon={<Icon size={16} />}
                        label={t(`category.${id}`)}
                    />
                )
            })}
        </div>
    )
}
