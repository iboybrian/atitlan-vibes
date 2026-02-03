
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDirectImageUrl } from '../lib/utils'
import { MapPin, Calendar, Clock, ArrowLeft, Globe, Instagram, ExternalLink } from 'lucide-react'
import InstagramGradient from '../components/icons/InstagramGradient'
import WhatsAppIcon from '../components/icons/WhatsAppIcon'

export default function EventDetail() {
    const { id } = useParams()
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)

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

    if (loading) return <div className="p-10 text-center text-gray-400">Loading details...</div>
    if (!event) return <div className="p-10 text-center text-gray-500">Event not found.</div>

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
                aria-label={isInstagram ? "View on Instagram" : "Visit Website"}
            >
                {isInstagram ? <Instagram size={24} /> : <Globe size={24} />}
            </a>
        )
    }

    return (
        <div className="bg-[#F5F5F0] min-h-screen pb-20 relative">

            {/* 1. Hero Image (Full Width) */}
            <div className="relative w-full aspect-square md:aspect-[4/3] bg-gray-200">
                <Link to="/" className="absolute top-4 left-4 z-20 bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-colors">
                    <ArrowLeft size={24} className="text-black" />
                </Link>

                <img
                    src={getDirectImageUrl(event.cover_image)}
                    alt={event.name}
                    className="w-full h-full object-cover"
                />

                {/* Gradient Overlay for text readability if needed, but design asks for clean */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

                {/* Floating Contact Icons (positioned absolute at bottom right of hero) */}
                <div className="absolute bottom-[-24px] right-6 flex gap-3 z-30">
                    {/* WhatsApp */}
                    {event.contact_number && (
                        <button
                            onClick={handleWhatsApp}
                            className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
                            aria-label="Contact via WhatsApp"
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
                            aria-label="Visit Website"
                        >
                            {isInstagram ? <InstagramGradient size={28} /> : <Globe size={24} />}
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Content Body */}
            <div className="px-6 pt-10">

                {/* Title */}
                <h1 className="text-3xl font-black text-black leading-tight mb-2">
                    {event.name}
                </h1>

                {/* Date & Time */}
                <div className="flex items-center gap-4 text-gray-600 font-medium mb-6 text-sm">
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
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm mb-6 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-turquoise">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Venue</div>
                            <div className="font-bold text-gray-900">{event.venue || 'TBA'}</div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cost</div>
                        <div className={`font-bold text-lg ${event.cost && (event.cost === 'Free' || event.cost === 'GTQ 0') ? 'text-[#4ADE80]' : 'text-black'
                            }`}>
                            {event.cost || 'Free'}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="prose prose-sm text-gray-600 leading-relaxed mb-8">
                    <p>{event.description}</p>
                </div>

            </div>
        </div>
    )
}
