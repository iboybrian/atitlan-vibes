
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDirectImageUrl } from '../lib/utils'
import { MapPin, Calendar, Clock, ArrowLeft, Globe, Instagram, ExternalLink, Heart } from 'lucide-react'
import InstagramGradient from '../components/icons/InstagramGradient'
import WhatsAppIcon from '../components/icons/WhatsAppIcon'
import { useAuth } from '../context/AuthContext'
import { useT } from '../lib/i18n'

export default function EventDetail() {
    const t = useT()
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isFav, setIsFav] = useState(false)

    // Back to wherever you came from — a town page, Home, anywhere. A hardcoded
    // destination is what sent everyone to Home. key === 'default' means this is
    // the first entry in the session (deep link, push notification): nothing to
    // go back to, so Home is the honest fallback.
    const goBack = () => location.key === 'default' ? navigate('/') : navigate(-1)

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
    }, [id, user])

    // Toggle-by-delete-then-insert, same shape as the reactions in ChatRoom.
    // Optimistic: the heart flips first and rolls back if the write fails.
    const toggleFavorite = async () => {
        if (!user) return
        const next = !isFav
        setIsFav(next)

        const { error } = next
            ? await supabase.from('event_favorites').insert({ user_id: user.id, event_id: id })
            : await supabase.from('event_favorites').delete().eq('user_id', user.id).eq('event_id', id)

        if (error) {
            console.error('Favorite toggle failed:', error)
            setIsFav(!next)
        }
    }

    if (loading) return <div className="p-10 text-center text-gray-400 dark:text-gray-500">{t('event.loading')}</div>
    if (!event) return <div className="p-10 text-center text-gray-500 dark:text-gray-400">{t('event.notFound')}</div>

    // Contact Logic
    const handleWhatsApp = () => {
        if (event.contact_number) {
            // Basic cleanup, though usually best to store as plain numbers
            const number = event.contact_number.replace(/\D/g, '')
            window.open(`https://wa.me/${number}`, '_blank')
        }
    }

    const handleWebLink = () => {
        if (event.contact_link) {
            let url = event.contact_link
            // Smart Instagram detection for opening
            const lower = url.toLowerCase()
            const commonExtensions = ['.com', '.net', '.gt', '.org', '.edu', '.io', '.co']
            const hasExtension = commonExtensions.some(ext => lower.includes(ext))

            if (url.startsWith('@') || lower.includes('instagram') || !hasExtension) {
                // It's an Instagram handle
                const handle = url
                    .replace(/^@/, '')
                    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
                    .replace(/\/$/, '')
                url = `https://instagram.com/${handle}`
            } else if (!url.startsWith('http')) {
                url = 'https://' + url
            }
            window.open(url, '_blank')
        }
    }

    // Determine if contact_link is Instagram (for icon styling)
    const isInstagram = (() => {
        const link = event.contact_link
        if (!link) return false
        const lower = link.toLowerCase()
        const commonExtensions = ['.com', '.net', '.gt', '.org', '.edu', '.io', '.co']
        const hasExtension = commonExtensions.some(ext => lower.includes(ext))
        return link.startsWith('@') || lower.includes('instagram') || !hasExtension
    })()

    const renderContactLink = () => {
        const link = event.contact_link
        if (!link) return null

        const lower = link.toLowerCase()
        let url = link
        let isInstagram = false

        // Detection Logic
        // 1. Check for extension
        const commonExtensions = ['.com', '.net', '.gt', '.org', '.edu', '.io', '.co']
        const hasExtension = commonExtensions.some(ext => lower.includes(ext))

        // 2. Instagram Rule: Starts with @, OR contains 'instagram', OR does NOT have a common extension (implied handle)
        if (link.startsWith('@') || lower.includes('instagram') || !hasExtension) {
            isInstagram = true
            // Clean handle: remove @, remove instagram.com domain parts
            let handle = link
                .replace(/^@/, '')
                .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
                .replace(/\/$/, '')

            url = `https://instagram.com/${handle}`
        } else {
            // Website Rule: Ensure protocol
            if (!lower.startsWith('http')) {
                url = `https://${link}`
            }
        }

        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-sunflower text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
                aria-label={isInstagram ? t('event.instagram') : t('event.website')}
            >
                {isInstagram ? <Instagram size={24} /> : <Globe size={24} />}
            </a>
        )
    }

    return (
        <div className="bg-[#F5F5F0] dark:bg-slate-900 min-h-screen max-w-2xl mx-auto relative">

            {/* 1. Hero Image (Full Width) */}
            <div className="relative w-full aspect-square md:aspect-[4/3] bg-gray-200 dark:bg-slate-700">
                <button onClick={goBack} className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow-md hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <ArrowLeft size={24} className="text-black dark:text-white" />
                </button>

                <img
                    src={getDirectImageUrl(event.cover_image)}
                    alt={event.name}
                    className="w-full h-full object-cover"
                />

                {/* Gradient Overlay for text readability if needed, but design asks for clean */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

                {/* Floating Contact Icons (positioned absolute at bottom right of hero) */}
                <div className="absolute bottom-[-24px] right-6 flex gap-3 z-30">
                    {/* Save for later */}
                    {user && (
                        <button
                            onClick={toggleFavorite}
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 ${isFav ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-300'}`}
                            aria-label={t('favorites.save')}
                        >
                            <Heart size={22} fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                    )}

                    {/* WhatsApp */}
                    {event.contact_number && (
                        <button
                            onClick={handleWhatsApp}
                            className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
                            aria-label={t('event.whatsapp')}
                        >
                            <WhatsAppIcon size={24} />
                        </button>
                    )}

                    {/* Web / Insta */}
                    {event.contact_link && (
                        <button
                            onClick={handleWebLink}
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 ${isInstagram ? 'bg-white' : 'bg-sunflower text-black'
                                }`}
                            aria-label={t('event.website')}
                        >
                            {isInstagram ? <InstagramGradient size={28} /> : <Globe size={24} />}
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Content Body */}
            <div className="px-6 pt-10">

                {/* Title */}
                <h1 className="text-3xl font-black text-black dark:text-white leading-tight mb-2">
                    {event.name}
                </h1>

                {/* Date & Time */}
                <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300 font-medium mb-6 text-sm">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={16} className="text-turquoise" />
                        <span>{event.event_date_label}</span>
                    </div>
                    {event.start_time && (
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} className="text-turquoise" />
                            <span>{event.start_time}</span>
                        </div>
                    )}
                </div>

                {/* Venue & Cost Row */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-6 border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-turquoise">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('event.venue')}</div>
                            <div className="font-bold text-gray-900 dark:text-white">{event.venue || t('event.tba')}</div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t('event.cost')}</div>
                        <div className={`font-bold text-lg ${event.cost && (event.cost === 'Free' || event.cost === 'GTQ 0') ? 'text-[#4ADE80]' : 'text-black dark:text-white'
                            }`}>
                            {/* cost is stored as English text ('Free', 'Contact Venue', 'GTQ 50') */}
                            {!event.cost || event.cost === 'Free'
                                ? t('event.free')
                                : event.cost === 'Contact Venue'
                                    ? t('addEvent.contactVenue')
                                    : event.cost}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="prose prose-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                    <p>{event.description}</p>
                </div>

            </div>
        </div>
    )
}
