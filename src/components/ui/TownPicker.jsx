
import { useEffect, useState } from 'react'
import { MapPin, ChevronDown, Check, Bell } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getCurrentTown, setCurrentTown } from '../../lib/utils'

/**
 * "Which town are you in" — the one explicit choice the user makes.
 * It drives the footer highlight and, for logged-in users, who gets pushed
 * when a new event is approved in that town (users.current_town_id).
 */
export default function TownPicker() {
    const { user } = useAuth()
    const [towns, setTowns] = useState([])
    const [selected, setSelected] = useState(getCurrentTown)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        supabase
            .from('towns')
            .select('id, name')
            .order('name')
            .then(({ data, error }) => {
                if (error) return console.error('Error fetching towns for picker:', error)
                setTowns(data || [])
            })
    }, [])

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
                if (!town) return
                setCurrentTown(town)
                setSelected(town)
            })
    }, [user, selected, towns])

    const choose = async (town) => {
        setSelected(town)
        setCurrentTown(town)
        setOpen(false)

        if (!user) return
        const { error } = await supabase
            .from('users')
            .update({ current_town_id: town.id })
            .eq('id', user.id)

        // Local pick still works; only the notifications would miss it
        if (error) console.error('Could not save town for notifications:', error)
    }

    return (
        <div className="mb-3">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-turquoise/40 hover:shadow-md transition-shadow"
            >
                <span className="flex items-center gap-2 min-w-0">
                    <MapPin size={18} className="text-turquoise flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                        {selected ? selected.name : "Where are you? Pick your town"}
                    </span>
                </span>
                <ChevronDown
                    size={18}
                    className={`text-turquoise flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                    {towns.map(town => {
                        const isSelected = town.id === selected?.id
                        return (
                            <button
                                key={town.id}
                                onClick={() => choose(town)}
                                className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm border-b border-gray-100 dark:border-slate-700 last:border-b-0 transition-colors ${isSelected
                                    ? 'text-turquoise font-bold bg-turquoise/5'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-turquoise/10'
                                    }`}
                            >
                                <span className="truncate">{town.name}</span>
                                {isSelected && <Check size={16} className="flex-shrink-0" />}
                            </button>
                        )
                    })}
                </div>
            )}

            {selected && !open && (
                <p className="flex items-center gap-1.5 mt-2 px-1 text-xs text-gray-500 dark:text-gray-400">
                    <Bell size={12} className="flex-shrink-0" />
                    We'll notify you about new events in {selected.name}. Tap to change.
                </p>
            )}
        </div>
    )
}
