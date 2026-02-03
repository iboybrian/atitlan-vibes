
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function TopVillageMenu() {
    const [towns, setTowns] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchTowns() {
            try {
                const { data, error } = await supabase
                    .from('towns')
                    .select('id, name')
                    .order('name')

                if (error) throw error
                if (data) setTowns(data)
            } catch (err) {
                console.error('Error fetching towns:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchTowns()
    }, [])

    return (
        <div className="w-full">
            <div className="flex flex-col space-y-2">
                {loading ? (
                    // Skeleton loader for vertical list
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-10 w-full bg-white rounded-lg animate-pulse" />
                    ))
                ) : (
                    towns.map(town => (
                        <NavLink
                            key={town.id}
                            to={`/town/${town.id}`}
                            className={({ isActive }) =>
                                `block w-full px-4 py-3 rounded-xl text-center font-bold text-sm tracking-wide transition-all border-2
                ${isActive
                                    ? 'bg-black text-white border-black shadow-md'
                                    : 'bg-white text-gray-800 border-transparent hover:border-gray-200'
                                }`
                            }
                        >
                            {town.name}
                        </NavLink>
                    ))
                )}
            </div>
        </div>
    )
}
