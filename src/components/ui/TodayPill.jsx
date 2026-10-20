import { useT } from '../../lib/i18n'

/**
 * "Today" / "Tonight" with a live dot, for an event whose next occurrence is
 * today in Guatemala (see happeningToday() in utils.js). Tonight = starts at
 * 18:00 or later. The ping ring is motion-safe only; the solid dot stays.
 */
export default function TodayPill({ event, dot = 'bg-turquoise' }) {
    const t = useT()
    const tonight = event.start_time && event.start_time >= '18:00'

    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
                <span className={`motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dot}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
            </span>
            {t(tonight ? 'card.tonight' : 'card.today')}
        </span>
    )
}
