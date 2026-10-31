
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ongoingEventsOr, compareEventsByWhen } from '../lib/utils'
import { useTowns } from '../lib/towns'
import { useAuth } from '../context/AuthContext'
import { EventList } from '../components/ui/EventRow'
import Pigeon, { PigeonLoading } from '../components/ui/Pigeon'
import { useT } from '../lib/i18n'

const TABS = ['all', 'going', 'saved']

// The row stays when an event ends; the event leaves the list once its end_date
// has passed, same rule as everywhere else. !inner drops the parent row when the
// embedded event no longer matches, and the join is null for a deleted event.
const myEvents = (table, userId) => supabase
    .from(table)
    .select('created_at, events!inner(*)')
    .eq('user_id', userId)
    .or(ongoingEventsOr(), { referencedTable: 'events' })
    .then(({ data, error }) => {
        if (error) console.error(`Error fetching ${table}:`, error)
        return (data || []).map(row => row.events).filter(Boolean)
    })

export default function Plans() {
    const t = useT()
    const { user } = useAuth()
    const towns = useTowns()
    const [tab, setTab] = useState('all')
    const [lists, setLists] = useState(null)

    useEffect(() => {
        if (!user) return
        Promise.all([myEvents('event_attendance', user.id), myEvents('event_favorites', user.id)])
            .then(([going, saved]) => setLists({ going, saved }))
    }, [user])

    if (!lists) return <PigeonLoading label={t('event.loading')} />

    const all = [...lists.going, ...lists.saved].filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i)
    const shown = (tab === 'all' ? all : lists[tab]).slice().sort(compareEventsByWhen)
    const townName = (id) => towns.find(x => x.id === id)?.name ?? ''

    return (
        <div className="px-4 pt-3 pb-8">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">{t('tabs.plans')}</h1>

            <div className="flex p-1 mb-4 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                {TABS.map(key => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        aria-pressed={tab === key}
                        className={`flex-1 py-2 rounded-full text-sm font-bold transition-colors ${tab === key ? 'bg-turquoise text-white shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                    >
                        {t(`plans.${key}`)}
                    </button>
                ))}
            </div>

            {shown.length ? (
                <EventList events={shown} townName={townName} />
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-sm">
                    <Pigeon mood="sleep" className="mb-3" />
                    <p className="font-bold text-gray-800 dark:text-gray-100">{t('plans.empty')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">{t(`plans.emptyHint.${tab}`)}</p>
                    <Link to="/" className="px-5 py-2.5 rounded-full bg-turquoise text-white text-sm font-bold shadow-md">
                        {t('plans.seeWhatsOn')}
                    </Link>
                </div>
            )}
        </div>
    )
}
