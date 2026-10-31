
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { Share } from '@capacitor/share'
import { supabase } from '../lib/supabase'
import { getDirectImageUrl, formatOccurrence, happeningToday, placeLine } from '../lib/utils'
import { MapPin, Calendar, Clock, ArrowLeft, Globe, Heart, Ticket, Navigation, Share2, Check } from 'lucide-react'
import InstagramGradient from '../components/icons/InstagramGradient'
import WhatsAppIcon from '../components/icons/WhatsAppIcon'
import TownMap from '../components/ui/TownMap'
import When from '../components/ui/When'
import { useAuth } from '../context/AuthContext'
import { useTowns } from '../lib/towns'
import { useGoing } from '../lib/going'
import { useT, getLang, costLabel } from '../lib/i18n'
import { coo } from '../lib/sound'
import { PigeonLoading } from '../components/ui/Pigeon'
import { logViewEvent, logFavoriteEvent } from '../lib/metaEvents'

// Six pigeon feathers thrown out around the heart on save. Angles are spread
// unevenly on purpose; a perfect hexagon reads as a UI spinner, not feathers.
const FEATHERS = [
    { a: '-20deg', spin: '120deg', fill: '#94A3B8' },
    { a: '35deg', spin: '-90deg', fill: '#00CED1' },
    { a: '95deg', spin: '160deg', fill: '#CBD5E1' },
    { a: '150deg', spin: '-140deg', fill: '#94A3B8' },
    { a: '210deg', spin: '100deg', fill: '#00CED1' },
    { a: '275deg', spin: '-110deg', fill: '#CBD5E1' }
]

function FeatherBurst() {
    return FEATHERS.map(({ a, spin, fill }) => (
        <svg key={a} className="feather" width="10" height="14" viewBox="0 0 10 14" aria-hidden="true"
            style={{ '--a': a, '--spin': spin }}>
            <path d="M5 0 C9 4 9 10 5 14 C1 10 1 4 5 0 Z" fill={fill} />
            <path d="M5 2 L5 13" stroke="#64748B" strokeWidth="0.8" />
        </svg>
    ))
}

const WEB_EXTENSIONS = ['.com', '.net', '.gt', '.org', '.edu', '.io', '.co']

/**
 * contact_link is free text: '@handle', an instagram.com URL, or a website with
 * or without https. Anything without a common domain ending is read as an
 * Instagram handle.
 */
function contactUrl(link) {
    const lower = link.toLowerCase()
    const isInstagram = link.startsWith('@') || lower.includes('instagram') || !WEB_EXTENSIONS.some(ext => lower.includes(ext))
    if (isInstagram) {
        const handle = link.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
        return { url: `https://instagram.com/${handle}`, isInstagram }
    }
    return { url: lower.startsWith('http') ? link : `https://${link}`, isInstagram }
}

// The Going / Check in switches in the bottom bar.
function Toggle({ on, onClick, disabled, label, title }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`flex items-center gap-2 pl-1 pr-4 py-1 rounded-full border-2 text-sm font-bold transition-colors disabled:opacity-40 ${on
                ? 'border-turquoise bg-turquoise/10 text-turquoise'
                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300'
                }`}
        >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${on ? 'bg-turquoise text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>
                {on && <Check size={16} strokeWidth={3} />}
            </span>
            {label}
        </button>
    )
}

export default function EventDetail() {
    const t = useT()
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()
    const { askLogin } = useOutletContext()
    const towns = useTowns()
    // A card hands over its row in location.state: paint it immediately (and give
    // the photo morph a hero to land on), then refresh from the DB below.
    const [event, setEvent] = useState(() => location.state?.event ?? null)
    const [loading, setLoading] = useState(() => !location.state?.event)
    const [isFav, setIsFav] = useState(false)
    // Bumped on every save: re-keys the heart pop and the feather burst so a
    // second save replays them instead of doing nothing.
    const [burst, setBurst] = useState(0)
    // null | 'going' | 'checked_in' — this user's row in event_attendance.
    const [mine, setMine] = useState(null)
    // Bumped after a Going write, so the count and faces reload.
    const [goingTick, setGoingTick] = useState(0)
    const [copied, setCopied] = useState(false)
    const going = useGoing(event ? [event.id] : [], goingTick)[event?.id]

    // Back to wherever you came from — a town page, Now, anywhere. A hardcoded
    // destination is what sent everyone to Home. key === 'default' means this is
    // the first entry in the session (deep link, push notification): nothing to
    // go back to, so Home is the honest fallback.
    const goBack = () => location.key === 'default' ? navigate('/') : navigate(-1)

    useEffect(() => { if (id) logViewEvent(id) }, [id])

    useEffect(() => {
        async function fetchEvent() {
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) throw error
                setEvent(data)
            } catch (err) {
                console.error('Error fetching event:', err)
            } finally {
                setLoading(false)
            }
        }

        if (id) fetchEvent()
    }, [id])

    useEffect(() => {
        if (!id || !user) return
        supabase
            .from('event_favorites')
            .select('event_id')
            .eq('user_id', user.id)
            .eq('event_id', id)
            .maybeSingle()
            .then(({ data }) => setIsFav(!!data))
        supabase
            .from('event_attendance')
            .select('status')
            .eq('user_id', user.id)
            .eq('event_id', id)
            .maybeSingle()
            .then(({ data }) => setMine(data?.status ?? null))
    }, [id, user])

    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 2000)
        return () => clearTimeout(timer)
    }, [copied])

    // Toggle-by-delete-then-insert, same shape as the reactions in ChatRoom.
    // Optimistic: the heart flips first and rolls back if the write fails.
    const toggleFavorite = async () => {
        if (!user) return askLogin()
        const next = !isFav
        setIsFav(next)
        if (next) {
            coo()
            setBurst(b => b + 1)
        }

        const { error } = next
            ? await supabase.from('event_favorites').insert({ user_id: user.id, event_id: id })
            : await supabase.from('event_favorites').delete().eq('user_id', user.id).eq('event_id', id)

        if (error) {
            console.error('Favorite toggle failed:', error)
            setIsFav(!next)
        } else if (next) {
            logFavoriteEvent(id)
        }
    }

    // Same optimistic shape. next = null removes the row (not going any more).
    const setAttendance = async (next) => {
        if (!user) return askLogin()
        const prev = mine
        setMine(next)
        if (next && !prev) coo()

        const { error } = next
            ? await supabase.from('event_attendance').upsert({ user_id: user.id, event_id: event.id, status: next })
            : await supabase.from('event_attendance').delete().eq('user_id', user.id).eq('event_id', event.id)

        if (error) {
            console.error('Going toggle failed:', error)
            setMine(prev)
        } else {
            setGoingTick(n => n + 1)
        }
    }

    if (loading) return <PigeonLoading label={t('event.loading')} />
    if (!event) return <div className="p-10 text-center text-gray-500 dark:text-gray-400">{t('event.notFound')}</div>

    const town = towns.find(x => x.id === event.town_id)
    const place = placeLine(event.venue, town?.name)
    const contact = event.contact_link ? contactUrl(event.contact_link) : null
    const today = happeningToday(event)
    const count = going?.count ?? 0

    // Venue and town as text: venues have no coordinates, and Maps finds most of
    // them by name. Android hands the https link to the Maps app.
    const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place}, Guatemala`)}`

    // Native share sheet in the app (Android's WebView has no navigator.share),
    // the Web Share API in a browser that has it, and the clipboard otherwise.
    // The link is the web app's, so it opens for anyone, installed or not.
    const share = async () => {
        const url = `https://app.atitlanvibes.com/event/${event.id}`
        if ((await Share.canShare()).value) {
            try {
                await Share.share({ title: event.name, text: t('event.shareText', { name: event.name }), url })
            } catch { /* dismissed */ }
        } else {
            await navigator.clipboard?.writeText(url)
            setCopied(true)
        }
    }

    return (
        <div className="bg-[#F5F5F0] dark:bg-slate-900 min-h-screen max-w-2xl mx-auto relative">

            {/* 1. Hero: the photo, with the title over it */}
            <div className="relative w-full aspect-[4/5] md:aspect-[4/3] max-h-[65vh] bg-gray-200 dark:bg-slate-700 overflow-hidden">
                <img
                    src={getDirectImageUrl(event.cover_image)}
                    alt={event.name}
                    className="w-full h-full object-cover"
                    style={{ viewTransitionName: 'event-hero' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

                <button onClick={goBack} aria-label={t('common.back')} className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow-md">
                    <ArrowLeft size={22} className="text-black dark:text-white" />
                </button>

                {/* Save for later — greyed for guests, tapping asks them to log in */}
                <div className="absolute top-4 right-4 z-20 detail-pop">
                    <button
                        onClick={toggleFavorite}
                        className={`relative w-11 h-11 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 ${isFav ? 'bg-red-500 text-white' : 'bg-white/90 dark:bg-slate-800/90 text-gray-500 dark:text-gray-300'} ${user ? '' : 'opacity-60'}`}
                        aria-label={t('favorites.save')}
                        aria-pressed={isFav}
                    >
                        <span key={burst} className={`flex ${burst ? 'heart-pop' : ''}`}>
                            <Heart size={22} fill={isFav ? 'currentColor' : 'none'} />
                        </span>
                        {burst > 0 && <FeatherBurst key={`f${burst}`} />}
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex flex-wrap gap-2 mb-2">
                        {town && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-xs font-bold uppercase tracking-wide">
                                <MapPin size={12} />
                                {town.name}
                            </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-white/90 text-gray-900 text-xs font-bold">
                            <When event={event} dot="bg-sunflower" />
                        </span>
                    </div>
                    <h1 className="text-3xl font-black leading-tight">{event.name}</h1>
                </div>
            </div>

            {/* 2. Content Body */}
            {/* detail-rise: each block slides up in turn once the photo has landed */}
            <div className="px-6 pt-6 pb-6 detail-rise">

                {/* When, where, how much */}
                <div className="space-y-3 mb-6 text-gray-800 dark:text-gray-100 font-bold">
                    <div className="flex items-start gap-3">
                        <Calendar size={18} className="shrink-0 mt-0.5 text-turquoise" />
                        {/* A series shows both: the concrete next date, and the
                            pattern it repeats on after it. */}
                        {event.recurring_days?.length ? (
                            <span>
                                {formatOccurrence(event, getLang())}
                                <span className="text-gray-400 dark:text-gray-500 font-medium ml-1.5">· {event.event_date_label}</span>
                            </span>
                        ) : (
                            <span>{event.event_date_label}</span>
                        )}
                    </div>
                    {event.start_time && (
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="shrink-0 text-turquoise" />
                            <span>{event.start_time.slice(0, 5)}</span>
                        </div>
                    )}
                    <div className="flex items-start gap-3">
                        <MapPin size={18} className="shrink-0 mt-0.5 text-turquoise" />
                        <span>{place || t('event.tba')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Ticket size={18} className="shrink-0 text-turquoise" />
                        <span className={!event.cost || event.cost === 'Free' || event.cost === 'GTQ 0' ? 'text-green-600 dark:text-green-400' : ''}>
                            {costLabel(event.cost)}
                        </span>
                    </div>
                </div>

                {/* Where the town is. The pin is the town, not the venue — events
                    carry no coordinates; "Take me there" is the precise one. */}
                {town?.lat != null && (
                    <TownMap towns={[town]} focus={town} interactive={false} zoom={14} className="h-36 rounded-2xl overflow-hidden shadow-sm mb-6" />
                )}

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line mb-6">{event.description}</p>

                {/* Organizer contact. WhatsApp stays usable for guests on purpose. */}
                {(event.contact_number || contact) && (
                    <div className="flex gap-3 mb-6">
                        {event.contact_number && (
                            <a
                                href={`https://wa.me/${event.contact_number.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform active:scale-95"
                                aria-label={t('event.whatsapp')}
                            >
                                <WhatsAppIcon size={24} />
                            </a>
                        )}
                        {contact && (
                            <a
                                href={contact.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform active:scale-95 ${contact.isInstagram ? 'bg-white' : 'bg-sunflower text-black'}`}
                                aria-label={contact.isInstagram ? t('event.instagram') : t('event.website')}
                            >
                                {contact.isInstagram ? <InstagramGradient size={28} /> : <Globe size={24} />}
                            </a>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <a
                        data-tour="take-me-there"
                        href={directions}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-turquoise text-white font-bold shadow-md active:scale-[0.98] transition-transform"
                    >
                        <Navigation size={18} />
                        {t('event.takeMeThere')}
                    </a>
                    <button
                        type="button"
                        onClick={share}
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-sunflower text-black font-bold shadow-md active:scale-[0.98] transition-transform"
                    >
                        {copied ? <Check size={18} /> : <Share2 size={18} />}
                        {copied ? t('event.copied') : t('event.share')}
                    </button>
                </div>
            </div>

            {/* 3. Going / Check in. Sticky like the tab bar it replaces on this page;
                pads for the gesture bar the same way. */}
            <div
                data-tour="going"
                className="sticky bottom-0 z-40 flex items-center gap-3 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white/95 dark:bg-slate-800/95 backdrop-blur border-t border-gray-200 dark:border-slate-700"
            >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    {going?.faces?.length > 0 && (
                        <div className="flex -space-x-2 shrink-0">
                            {going.faces.map((face, i) => (
                                face.avatar_url
                                    ? <img key={i} src={face.avatar_url} alt={face.name ?? ''} className="w-7 h-7 rounded-full object-cover ring-2 ring-white dark:ring-slate-800" />
                                    : <span key={i} className="w-7 h-7 rounded-full bg-turquoise text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-800">{face.name?.[0]?.toUpperCase() ?? '?'}</span>
                            ))}
                        </div>
                    )}
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                        {count ? t('going.count', { n: count }) : t('going.first')}
                    </span>
                </div>
                <div className={`flex gap-2 ${user ? '' : 'opacity-60'}`}>
                    <Toggle
                        on={!!mine}
                        onClick={() => setAttendance(mine ? null : 'going')}
                        label={t('going.going')}
                    />
                    {/* Check in only on the day. No location check: coordinates never
                        leave the device, so "I'm here" is taken on trust. */}
                    <Toggle
                        on={mine === 'checked_in'}
                        onClick={() => setAttendance(mine === 'checked_in' ? 'going' : 'checked_in')}
                        disabled={!today}
                        title={today ? undefined : t('going.checkInLater')}
                        label={t('going.checkIn')}
                    />
                </div>
            </div>
        </div>
    )
}
