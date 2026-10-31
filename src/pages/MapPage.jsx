import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import TownMap from '../components/ui/TownMap'
import Sheet from '../components/ui/Sheet'
import LoginNudge from '../components/ui/LoginNudge'
import { EventList } from '../components/ui/EventRow'
import { PigeonLoading } from '../components/ui/Pigeon'
import { useEvents } from '../lib/events'
import { useTowns, useCurrentTown } from '../lib/towns'
import { useAuth } from '../context/AuthContext'
import { happeningToday, isTodayOrTomorrow, startsIn, todayInGuatemala } from '../lib/utils'
import { useT } from '../lib/i18n'

const LEGEND = [['live', 'bg-red-500'], ['featured', 'bg-sunflower'], ['today', 'bg-turquoise']]

export default function MapPage() {
    const t = useT()
    const { user } = useAuth()
    const events = useEvents()
    const towns = useTowns()
    const current = useCurrentTown()
    const [picked, setPicked] = useState(null)

    if (!events) return <PigeonLoading label={t('common.loading')} />

    // Same guest rule as Now: today and tomorrow only.
    const visible = events.filter(e => user || isTodayOrTomorrow(e))
    const today = todayInGuatemala()
    const pins = {}
    for (const town of towns) {
        const on = visible.filter(e => e.town_id === town.id && happeningToday(e, today))
        pins[town.id] = {
            count: on.length,
            tone: on.some(e => startsIn(e) === 'live') ? 'live'
                : on.some(e => e.is_feature) ? 'featured'
                    : on.length ? 'today' : 'none'
        }
    }

    const townName = (id) => towns.find(x => x.id === id)?.name ?? ''
    // The stored pick is {id, name}; the coordinates come from the towns list.
    const focus = towns.find(x => x.id === current?.id)
    const pickedTown = towns.find(x => x.id === picked)

    return (
        <div className="px-4 pt-3 pb-8">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('tabs.map')}</h1>
            <div className="flex gap-3 mt-1 mb-3 text-xs font-bold text-gray-600 dark:text-gray-300">
                {LEGEND.map(([key, dot]) => (
                    <span key={key} className="inline-flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                        {t(`map.${key}`)}
                    </span>
                ))}
            </div>

            <TownMap
                towns={towns}
                pins={pins}
                focus={focus}
                onPick={setPicked}
                className="h-[62vh] rounded-3xl overflow-hidden shadow-sm"
            />
            <p className="mt-2 px-1 text-xs text-gray-500 dark:text-gray-400">{t('map.hint')}</p>

            {!user && <LoginNudge />}

            {pickedTown && (
                <Sheet title={pickedTown.name} onClose={() => setPicked(null)}>
                    {(() => {
                        const list = visible.filter(e => e.town_id === pickedTown.id).slice(0, 12)
                        return list.length
                            ? <EventList events={list} townName={townName} />
                            : <p className="py-6 text-center text-gray-500 dark:text-gray-400">{t('map.nothing')}</p>
                    })()}
                    <Link
                        to={`/town/${pickedTown.id}`}
                        className="mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white dark:bg-slate-800 text-turquoise font-bold shadow-sm"
                    >
                        <Info size={18} />
                        {t('picker.townInfo', { town: pickedTown.name })}
                    </Link>
                </Sheet>
            )}
        </div>
    )
}
