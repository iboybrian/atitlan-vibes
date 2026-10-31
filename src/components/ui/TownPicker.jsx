
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, ChevronDown, Check, Bell, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTowns, useCurrentTown, pickTown } from '../../lib/towns'
import { useEvents } from '../../lib/events'
import { useAuth } from '../../context/AuthContext'
import { happeningToday, todayInGuatemala } from '../../lib/utils'
import { coo } from '../../lib/sound'
import { useT } from '../../lib/i18n'
import Sheet from './Sheet'

/**
 * "Which town are you in" — the one explicit choice the user makes. A pill in
 * the header that opens the town list. It scopes Now, Map and Alerts and, for
 * logged-in users, who gets pushed when a new event is approved in that town
 * (users.current_town_id).
 */
export default function TownPicker() {
    const t = useT()
    const { user } = useAuth()
    const towns = useTowns()
    const events = useEvents()
    const selected = useCurrentTown()
    const [open, setOpen] = useState(false)

    // Fresh install has empty localStorage, but the choice lives on the account —
    // otherwise the server keeps pushing for a town the UI no longer shows.
    useEffect(() => {
        if (!user || selected || towns.length === 0) return

        supabase
            .from('users')
            .select('current_town_id')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                const town = towns.find(t => t.id === data?.current_town_id)
                if (town) pickTown(town)
            })
    }, [user, selected, towns])

    const choose = async (town) => {
        pickTown(town)
        setOpen(false)

        if (!user) return
        // The timestamp is what stops a pick from counting forever — notify-town
        // drops it after 7 days when a live location says otherwise.
        const { error } = await supabase
            .from('users')
            .update({ current_town_id: town.id, current_town_set_at: new Date().toISOString() })
            .eq('id', user.id)

        // Local pick still works; only the notifications would miss it
        if (error) console.error('Could not save town for notifications:', error)
    }

    const today = todayInGuatemala()
    const tonight = (id) => events?.filter(e => e.town_id === id && happeningToday(e, today)).length ?? 0

    return (
        <>
            <button
                type="button"
                data-tour="town-picker"
                onClick={() => setOpen(true)}
                className="min-w-0 flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-turquoise/40 text-gray-800 dark:text-gray-100"
            >
                <MapPin size={16} className="text-turquoise shrink-0" />
                <span className="text-sm font-bold truncate">{selected ? selected.name : t('picker.short')}</span>
                <ChevronDown size={16} className="text-turquoise shrink-0" />
            </button>

            {open && (
                <Sheet title={t('picker.towns')} onClose={() => setOpen(false)}>
                    <div className="space-y-2">
                        {towns.map(town => {
                            const isSelected = town.id === selected?.id
                            const n = tonight(town.id)
                            return (
                                <div
                                    key={town.id}
                                    className={`flex items-center rounded-2xl border bg-white dark:bg-slate-800 ${isSelected ? 'border-turquoise' : 'border-transparent'}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => { coo(); choose(town) }}
                                        className="flex-1 min-w-0 flex items-center gap-2 px-4 py-3 text-left"
                                    >
                                        <span className="w-4 shrink-0 text-turquoise">{isSelected && <Check size={16} />}</span>
                                        <span className={`truncate font-bold ${isSelected ? 'text-turquoise' : 'text-gray-800 dark:text-gray-100'}`}>{town.name}</span>
                                        <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">· {t('picker.tonight', { n })}</span>
                                    </button>
                                    {/* About, boats, the WhatsApp group and the full list live on the town page. */}
                                    <Link
                                        to={`/town/${town.id}`}
                                        onClick={() => setOpen(false)}
                                        aria-label={t('picker.townInfo', { town: town.name })}
                                        className="shrink-0 p-3 mr-1 rounded-full text-gray-400 hover:text-turquoise"
                                    >
                                        <Info size={18} />
                                    </Link>
                                </div>
                            )
                        })}
                    </div>

                    {/* Only accounts get pushed; a guest's pick only scopes what they see. */}
                    {selected && user && (
                        <p className="flex items-center gap-1.5 mt-4 px-1 text-xs text-gray-500 dark:text-gray-400">
                            <Bell size={12} className="shrink-0" />
                            {t('picker.notice', { town: selected.name })}
                        </p>
                    )}
                </Sheet>
            )}
        </>
    )
}
