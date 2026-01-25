
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TopVillageMenu from '../components/layout/TownNav'
import AddEventModal from '../components/ui/AddEventModal'
import FlipCard from '../components/ui/FlipCard'
import { supabase } from '../lib/supabase'
import { getDirectImageUrl } from '../lib/utils'
import { useAuth } from '../context/AuthContext'

export default function Home() {
    const [upcomingEvents, setUpcomingEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAddEventOpen, setIsAddEventOpen] = useState(false)
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
        async function fetchUpcoming() {
            try {
                const today = new Date().toISOString()
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('is_approved', true) // Admin Filter
                    .gte('start_time', today)
                    .order('start_time', { ascending: true })
                    .limit(4)

                if (!data || data.length === 0) {
                    // Fallback to just approved recent if no upcoming
                    const { data: latest } = await supabase
                        .from('events')
                        .select('*')
                        .eq('is_approved', true)
                        .limit(4)
                    setUpcomingEvents(latest || [])
                } else {
                    setUpcomingEvents(data)
                }
            } catch (err) {
                console.error('Error loading events', err)
            } finally {
                setLoading(false)
            }
        }
        fetchUpcoming()
    }, [])

    return (
        <div className="px-4 py-2 space-y-8">

            {/* 1. Static Branding / Welcome - FlipCard */}
            <div className="flex justify-center py-4">
                <FlipCard
                    className="w-full max-w-[320px] h-[200px]"
                    front={
                        <img
                            src="https://tcdjxxnjfqnfbnseuhsa.supabase.co/storage/v1/object/public/logo/Logo.png"
                            alt="Atitlán Vibes Logo"
                            className="w-full h-full object-contain drop-shadow-sm"
                        />
                    }
                    back={
                        <div className="text-gray-700 leading-relaxed">
                            <p className="mb-4">
                                Welcome to <span className="font-bold text-turquoise">Atitlán Vibes</span>,
                                getting together all kind of travelers, to all kind of events.
                            </p>
                            <p className="text-xl font-black text-turquoise">Find your Vibes ✨</p>
                        </div>
                    }
                />
            </div>

            {/* 2. Vertical Town Menu (Now in Body) */}
            <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">
                    Explore by Town
                </h2>
                <TopVillageMenu />
            </section>

            {/* 3. Next Events Section */}
            <section>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-xl font-bold text-black">Next Events in the Lake</h2>
                    <span className="text-xs font-bold text-turquoise uppercase tracking-wide">See All</span>
                </div>

                {/* Inline Add Event Button */}
                <button
                    onClick={handleAddEvent}
                    className="w-full mb-4 py-3 px-4 bg-sunflower text-black font-bold rounded-xl shadow-md hover:shadow-lg hover:bg-sunflower/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ opacity: user ? 1 : 0.6 }}
                >
                    <Plus size={20} strokeWidth={3} />
                    <span>Post Your Vibe</span>
                </button>

                {loading ? (
                    <div className="text-center py-10 text-gray-400">Loading vibes...</div>
                ) : upcomingEvents.length === 0 ? (
                    <div className="p-6 bg-white rounded-2xl text-center text-gray-500 shadow-sm">
                        No upcoming events found.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {upcomingEvents.map(event => (
                            <Link to={`/event/${event.id}`} key={event.id} className="block group">
                                <div className="bg-white rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300 relative aspect-[4/5]">
                                    <img
                                        src={getDirectImageUrl(event.cover_image)}
                                        alt={event.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                        <div className="text-xs font-bold text-sunflower mb-1">{event.event_date_label}</div>
                                        <h3 className="font-bold leading-tight text-sm line-clamp-2">{event.name}</h3>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Add Event Modal */}
            {user && (
                <AddEventModal
                    isOpen={isAddEventOpen}
                    onClose={() => setIsAddEventOpen(false)}
                />
            )}
        </div>
    )
}
