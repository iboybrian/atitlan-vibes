
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [userProfile, setUserProfile] = useState(null)
    // UI only (shows the /admin link and page). The real gate is RLS: is_admin()
    // in the admins migration decides what an account can read and change.
    // null = still checking.
    const [isAdmin, setIsAdmin] = useState(null)
    const [darkMode, setDarkMode] = useState(() => {
        // Initialize from localStorage
        return localStorage.getItem('darkMode') === 'true'
    })

    // Fetch user profile when session changes
    useEffect(() => {
        if (session?.user) {
            fetchUserProfile(session.user.id)
            // Separate from fetchUserProfile on purpose: if the is_admin column
            // isn't there yet, this errors to false instead of blanking the profile.
            supabase.from('users').select('is_admin').eq('id', session.user.id).maybeSingle()
                .then(({ data }) => setIsAdmin(!!data?.is_admin))
        } else {
            setUserProfile(null)
            setIsAdmin(false)
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
        isAdmin,
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

