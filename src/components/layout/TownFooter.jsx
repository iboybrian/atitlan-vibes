
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function TownFooter() {
    const [towns, setTowns] = useState([])
    const location = useLocation()

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

    // Don't render on chat pages or if no towns
    if (isChatPage || towns.length === 0) return null

    return (
        <footer className="sticky bottom-0 z-50 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg transition-colors duration-500">
            <div className="px-2 py-3">
                {/* Horizontal scrollable town list - shows ~4 towns at a time */}
                <div
                    className="flex overflow-x-auto gap-2 scrollbar-hide pb-1 md:justify-center"
                    style={{
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {towns.map(town => (
                        <Link
                            key={town.id}
                            to={`/town/${town.id}`}
                            className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-slate-700 hover:bg-turquoise/10 dark:hover:bg-turquoise/20 rounded-xl transition-colors"
                            style={{
                                scrollSnapAlign: 'start',
                                minWidth: '92px'
                            }}
                        >
                            <MapPin size={18} className="text-turquoise" />
                            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 text-center whitespace-nowrap">
                                {town.name}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    )
}
