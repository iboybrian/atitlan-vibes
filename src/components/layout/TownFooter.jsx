
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getCurrentTown } from '../../lib/utils'

export default function TownFooter() {
    const [towns, setTowns] = useState([])
    const currentRef = useRef(null)
    const location = useLocation()

    // The strip marks what's being looked at, not where you are. A town route says
    // it outright; an event says it through events.town_id, which is why that one
    // costs a query — EventDetail holds the row but it's a sibling, not a parent.
    // Anything else falls back to the town picked in TownPicker.
    const eventId = location.pathname.match(/^\/event\/([^/]+)/)?.[1]
    // Keyed by the event it was fetched for, so leaving the page drops it without
    // an effect clearing state — the id simply stops matching.
    const [eventTown, setEventTown] = useState(null)

    useEffect(() => {
        if (!eventId) return
        let alive = true
        supabase
            .from('events')
            .select('town_id')
            .eq('id', eventId)
            .single()
            .then(({ data, error }) => {
                if (error) console.error('Error fetching event town for footer:', error)
                // Null town on failure — the picked town takes over, same as before.
                if (alive) setEventTown({ id: eventId, townId: data?.town_id ?? null })
            })
        return () => { alive = false }
    }, [eventId])

    const currentTownId = useMemo(() => {
        const fromRoute = location.pathname.match(/^\/town\/([^/]+)/)?.[1]
        const fromEvent = eventTown?.id === eventId ? eventTown.townId : null
        return fromRoute ?? fromEvent ?? getCurrentTown()?.id ?? null
    }, [location.pathname, eventId, eventTown])

    // Hide footer on chat pages
    const isChatPage = location.pathname.includes('/chat')

    useEffect(() => {
        async function fetchTowns() {
            const { data, error } = await supabase
                .from('towns')
                .select('id, name')
                .order('name', { ascending: true })

            if (error) {
                console.error('Error fetching towns for footer:', error)
                return
            }

            if (data) setTowns(data)
        }
        fetchTowns()
    }, [])

    // Bring it into view — the strip scrolls horizontally and it may sit off the edge.
    // block: 'nearest' keeps this from yanking the page down to the sticky footer.
    useEffect(() => {
        currentRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
    }, [currentTownId, towns])

    // Don't render on chat pages or if no towns
    if (isChatPage || towns.length === 0) return null

    // z-40 = chrome tier, same as Header. Modals/Sidebar are z-50 and must cover this.
    return (
        <footer data-tour="town-footer" className="sticky bottom-0 z-40 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg transition-colors duration-500">
            <div className="px-2 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {/* Horizontal scrollable town list - shows ~4 towns at a time */}
                <div
                    className="flex overflow-x-auto gap-2 scrollbar-hide pb-1 md:justify-center"
                    style={{
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {towns.map(town => {
                        const isCurrent = String(town.id) === String(currentTownId)
                        return (
                            <Link
                                key={town.id}
                                ref={isCurrent ? currentRef : null}
                                to={`/town/${town.id}`}
                                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-colors ${isCurrent
                                    ? 'bg-turquoise/10 dark:bg-turquoise/20 border-turquoise'
                                    : 'bg-gray-50 dark:bg-slate-700 border-transparent hover:bg-turquoise/10 dark:hover:bg-turquoise/20'
                                    }`}
                                style={{
                                    scrollSnapAlign: 'start',
                                    minWidth: '92px'
                                }}
                            >
                                <MapPin size={18} className="text-turquoise" />
                                <span className={`text-[10px] font-medium text-center whitespace-nowrap ${isCurrent ? 'text-turquoise font-bold' : 'text-gray-600 dark:text-gray-300'
                                    }`}>
                                    {town.name}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </footer>
    )
}
