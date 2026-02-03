
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Clock, Plus, ChevronDown, Ship, MessageCircle, Search, X, Star } from 'lucide-react'
import { getDirectImageUrl } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import AddEventModal from '../components/ui/AddEventModal'

// Accordion Component
function Accordion({ label, icon: Icon, children, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={18} className="text-turquoise" />}
                    <span className="font-bold text-gray-900">{label}</span>
                </div>
                <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="px-4 pb-4 border-t border-gray-100">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default function TownDetail() {
    const { id } = useParams()
    const [town, setTown] = useState(null)
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAddEventOpen, setIsAddEventOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const { user } = useAuth()
    const navigate = useNavigate()

    const handleAddEvent = () => {
        if (!user) {
            if (confirm("You need to be logged in to post an event. Go to login?")) {
                navigate('/auth')
            }
        } else {
            setIsAddEventOpen(true)
        }
    }

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                // Fetch town details (including boat_schedules)
                const { data: townData, error: townError } = await supabase
                    .from('towns')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (townError) throw townError
                setTown(townData)

                // Fetch Approved events for this town
                const { data: eventsData, error: eventsError } = await supabase
                    .from('events')
                    .select('*')
                    .eq('town_id', id)
                    .eq('is_approved', true) // Admin Filter

                if (eventsError) throw eventsError
                setEvents(eventsData || [])

            } catch (err) {
                console.error('Error fetching data:', err)
            } finally {
                setLoading(false)
            }
        }

        if (id) fetchData()
    }, [id])

    // Filter events based on search query (case-insensitive, multi-field)
    const filteredEvents = events.filter(event => {
        if (!searchQuery.trim()) return true

        const query = searchQuery.toLowerCase().trim()

        // Check name
        if (event.name?.toLowerCase().includes(query)) return true

        // Check venue
        if (event.venue?.toLowerCase().includes(query)) return true

        // Check description
        if (event.description?.toLowerCase().includes(query)) return true

        // Check event_date_label
        if (event.event_date_label?.toLowerCase().includes(query)) return true

        // Check contact_link
        if (event.contact_link?.toLowerCase().includes(query)) return true

        // Check tags array
        if (event.tags && Array.isArray(event.tags)) {
            if (event.tags.some(tag => tag.toLowerCase().includes(query))) return true
        }

        return false
    })

    if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

    if (!town) return <div className="p-8 text-center text-gray-500">Select a town to view details</div>

    return (
        <div className="px-4 py-6">
            {/* 1. Town Name (Top Priority) */}
            <h1 className="text-4xl font-black mb-6 text-center leading-tight tracking-tight text-gray-900">
                {town.name}
            </h1>

            {/* 2. Hero Image */}
            <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden mb-6 shadow-lg bg-gray-200">
                <img
                    src={getDirectImageUrl(town.image_url)}
                    alt={town.name}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* 3. About Town Accordion */}
            <Accordion label="About Town" defaultOpen={true}>
                <p className="pt-4 text-gray-600 leading-relaxed">
                    {town.description || "Welcome to " + town.name}
                </p>
            </Accordion>

            {/* 4. Boat Schedules Accordion (only if data exists) */}
            {town.boat_schedules && (
                <Accordion label="See boat/shuttle schedules" icon={Ship}>
                    <div className="pt-4 text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {town.boat_schedules}
                    </div>
                </Accordion>
            )}

            {/* 5. Events Section */}
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 pl-2">
                <span className="text-black">Events</span>
                {events.length > 0 && (
                    <span className="text-sm font-normal text-gray-400">({filteredEvents.length})</span>
                )}
            </h2>

            {/* Search Bar */}
            {events.length > 0 && (
                <div className="relative mb-4">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-turquoise" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search events..."
                        className="w-full pl-11 pr-10 py-3 bg-white rounded-xl border-2 border-turquoise/20 focus:border-turquoise outline-none shadow-sm transition-colors placeholder:text-gray-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={16} className="text-gray-400" />
                        </button>
                    )}
                </div>
            )}

            {/* Inline Add Event Button */}
            <button
                onClick={handleAddEvent}
                className="w-full mb-4 py-3 px-4 bg-sunflower text-black font-bold rounded-xl shadow-md hover:shadow-lg hover:bg-sunflower/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ opacity: user ? 1 : 0.6 }}
            >
                <Plus size={20} strokeWidth={3} />
                <span>Post Your Vibe</span>
            </button>

            {/* Events Grid or Empty States */}
            {events.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-medium">No approved events yet</p>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-turquoise/30">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-gray-500 font-medium">No events found matching your search</p>
                    <p className="text-gray-400 text-sm mt-1">Try another vibe!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Split into featured and regular */}
                    {(() => {
                        const featuredEvents = filteredEvents.filter(e => e.is_feature)
                        const regularEvents = filteredEvents.filter(e => !e.is_feature)

                        return (
                            <>
                                {/* Featured Events Section */}
                                {featuredEvents.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <Star size={16} className="text-sunflower" fill="#FFB800" />
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                                Featured Events
                                            </span>
                                            <div className="flex-1 h-px bg-gradient-to-r from-sunflower/50 to-transparent ml-2"></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {featuredEvents.map(event => (
                                                <Link to={`/event/${event.id}`} key={event.id} className="block group">
                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                                                        <div className="aspect-square w-full relative bg-gray-100">
                                                            {event.cover_image && (
                                                                <img
                                                                    src={getDirectImageUrl(event.cover_image)}
                                                                    alt={event.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            )}
                                                            <div className="absolute top-2 left-2 bg-sunflower text-black px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                                <Star size={10} fill="currentColor" />
                                                                Featured
                                                            </div>
                                                            <div className="absolute top-2 right-2 bg-white/95 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                                                                {event.event_date_label}
                                                            </div>
                                                        </div>
                                                        <div className="p-3">
                                                            <h3 className="font-bold text-sm mb-1 leading-snug">{event.name}</h3>
                                                            {event.start_time && (
                                                                <div className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                                    <Clock size={12} /> {event.start_time}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Regular Events Section */}
                                {regularEvents.length > 0 && (
                                    <div>
                                        {featuredEvents.length > 0 && (
                                            <div className="flex items-center gap-2 mb-3 px-1">
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                    More Events
                                                </span>
                                                <div className="flex-1 h-px bg-gray-300 dark:bg-slate-600 ml-2"></div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-4">
                                            {regularEvents.map(event => (
                                                <Link to={`/event/${event.id}`} key={event.id} className="block group">
                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                                                        <div className="aspect-square w-full relative bg-gray-100">
                                                            {event.cover_image && (
                                                                <img
                                                                    src={getDirectImageUrl(event.cover_image)}
                                                                    alt={event.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            )}
                                                            <div className="absolute top-2 right-2 bg-white/95 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                                                                {event.event_date_label}
                                                            </div>
                                                        </div>
                                                        <div className="p-3">
                                                            <h3 className="font-bold text-sm mb-1 leading-snug">{event.name}</h3>
                                                            {event.start_time && (
                                                                <div className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                                    <Clock size={12} /> {event.start_time}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )
                    })()}
                </div>
            )}

            {/* Add Event Modal */}
            {user && (
                <AddEventModal
                    isOpen={isAddEventOpen}
                    onClose={() => setIsAddEventOpen(false)}
                />
            )}

            {/* Floating Chat Button (logged-in users only) - positioned above footer */}
            {user && (
                <Link
                    to={`/town/${id}/chat`}
                    className="fixed bottom-24 right-4 w-14 h-14 bg-turquoise text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center z-40"
                    title="Town Chat"
                >
                    <MessageCircle size={24} />
                </Link>
            )}
        </div>
    )
}
