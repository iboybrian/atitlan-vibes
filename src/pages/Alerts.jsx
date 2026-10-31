
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useEvents, townAlerts, isUnseenAlert, alertsSeenAt, markAlertsSeen } from '../lib/events'
import { useCurrentTown } from '../lib/towns'
import { isPushSupported } from '../lib/pushNotifications'
import { useAuth } from '../context/AuthContext'
import EventRow from '../components/ui/EventRow'
import Pigeon, { PigeonLoading } from '../components/ui/Pigeon'
import { useT } from '../lib/i18n'

/**
 * What's new in the picked town: its upcoming events, newest first, with a dot
 * on the ones added since this tab was last opened. No inbox table behind it —
 * a push is the same news, and this is where it can be found again.
 */
export default function Alerts() {
    const t = useT()
    const { user } = useAuth()
    const events = useEvents()
    const town = useCurrentTown()
    // Read before marking, so this visit still shows what was new.
    const [seenAt] = useState(alertsSeenAt)
    const [pushOff, setPushOff] = useState(false)

    useEffect(() => { markAlertsSeen() }, [])

    useEffect(() => {
        if (!user || !isPushSupported()) return
        supabase.from('users').select('push_enabled').eq('id', user.id).single()
            .then(({ data }) => setPushOff(data?.push_enabled === false))
    }, [user])

    if (!events) return <PigeonLoading label={t('common.loading')} />

    const list = town ? townAlerts(events, town.id).slice(0, 30) : []

    return (
        <div className="px-4 pt-3 pb-8">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {town ? t('alerts.titleIn', { town: town.name }) : t('tabs.alerts')}
            </h1>
            <p className="mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400">{t('alerts.subtitle')}</p>

            {pushOff && (
                <Link to="/settings" className="flex items-center gap-3 mb-4 p-4 rounded-2xl bg-sunflower/15 text-sm font-medium text-gray-800 dark:text-gray-100">
                    <BellOff size={18} className="shrink-0 text-sunflower" />
                    {t('alerts.pushOff')}
                </Link>
            )}

            {!town ? (
                <p className="p-6 text-center bg-white dark:bg-slate-800 rounded-3xl text-gray-500 dark:text-gray-400 shadow-sm">{t('alerts.pickTown')}</p>
            ) : list.length ? (
                <div className="space-y-2">
                    {list.map((event, i) => (
                        <EventRow key={event.id} event={event} townName={town.name} isNew={isUnseenAlert(event, seenAt)} index={i} />
                    ))}
                </div>
            ) : (
                <div className="p-6 flex flex-col items-center bg-white dark:bg-slate-800 rounded-3xl text-center text-gray-500 dark:text-gray-400 shadow-sm">
                    <Pigeon mood="sleep" className="mb-3" />
                    {t('alerts.empty')}
                </div>
            )}
        </div>
    )
}
