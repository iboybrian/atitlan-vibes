
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [userProfile, setUserProfile] = useState(null)
    const [darkMode, setDarkMode] = useState(() => {
        // Initialize from localStorage
        return localStorage.getItem('darkMode') === 'true'
    })

    // Fetch user profile when session changes
    useEffect(() => {
        if (session?.user) {
            fetchUserProfile(session.user.id)
        } else {
            setUserProfile(null)
        }
    }, [session])

    const fetchUserProfile = async (userId) => {
        const { data } = await supabase
            .from('users')
            .select('name, house_affinity, avatar_url')
            .eq('id', userId)
            .single()

        if (data) setUserProfile(data)
    }

    // Refresh profile (call this after Profile save)
    const refreshProfile = () => {
        if (session?.user) {
            fetchUserProfile(session.user.id)
        }
    }

    // Dark mode toggle
    const toggleDarkMode = () => {
        const newValue = !darkMode
        setDarkMode(newValue)
        localStorage.setItem('darkMode', String(newValue))

        // Apply to document
        if (newValue) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    // Apply dark mode on mount
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    // Sign out function
    const signOut = async () => {
        await supabase.auth.signOut()
        setSession(null)
        setUserProfile(null)
    }

    const value = {
        session,
        user: session?.user ?? null,
        userProfile,
        loading,
        signOut,
        refreshProfile,
        darkMode,
        toggleDarkMode
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

