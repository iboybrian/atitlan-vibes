
import { Music, Landmark, Leaf, Palette, Beer, Sparkles, Check } from 'lucide-react'
import { useT } from '../../lib/i18n'
import Sheet from './Sheet'

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

/**
 * Now's "What are you looking for?" sheet. Multi-select, unlike the chip row:
 * `value` is an array of category ids, empty meaning everything.
 */
export function VibeSheet({ categories, value, onChange, onClose }) {
    const t = useT()
    const toggle = (id) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])

    return (
        <Sheet title={t('vibes.title')} onClose={onClose}>
            <button
                type="button"
                onClick={() => { onChange([]); onClose() }}
                aria-pressed={value.length === 0}
                className={`w-full mb-3 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors ${value.length === 0
                    ? 'bg-turquoise text-white shadow-md shadow-turquoise/30'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200'
                    }`}
            >
                <Sparkles size={18} />
                {t('vibes.everything')}
                {value.length === 0 && <Check size={18} />}
            </button>
            <div className="grid grid-cols-2 gap-2">
                {categories.map(id => {
                    const Icon = ICONS[id]
                    const on = value.includes(id)
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => toggle(id)}
                            aria-pressed={on}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-left border transition-colors ${on
                                ? 'bg-turquoise/10 border-turquoise text-turquoise'
                                : 'bg-white dark:bg-slate-800 border-transparent text-gray-700 dark:text-gray-200'
                                }`}
                        >
                            <Icon size={18} className="shrink-0" />
                            {t(`category.${id}`)}
                        </button>
                    )
                })}
            </div>
            <button type="button" onClick={onClose} className="w-full mt-4 py-3 bg-sunflower text-black font-bold rounded-2xl shadow-md">
                {t('vibes.done')}
            </button>
        </Sheet>
    )
}
