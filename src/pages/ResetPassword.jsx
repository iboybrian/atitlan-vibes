import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Where the password-recovery link lands. Getting here means the code from the
 * email was already exchanged for a session — by detectSessionInUrl on web, by
 * the deep-link listener in main.jsx on native — so updateUser() is all that's
 * left. No session means the link was reused, expired, or opened on a different
 * device than the one that asked for the reset (PKCE keeps the code_verifier in
 * the browser that made the request).
 */
export default function ResetPassword() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) return setError('Passwords do not match!')
        if (password.length < 6) return setError('Password must be at least 6 characters.')

        setLoading(true)
        const { error } = await supabase.auth.updateUser({ password })
        setLoading(false)

        if (error) return setError(error.message)
        navigate('/', { replace: true })
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
                <div className="w-full max-w-sm text-center">
                    <h1 className="text-3xl font-black mb-2">Link expired</h1>
                    <p className="text-gray-500 mb-8">
                        This reset link is no longer valid. Open it on the same device you
                        requested it from, or ask for a new one.
                    </p>
                    <button
                        onClick={() => navigate('/auth', { replace: true })}
                        className="w-full bg-turquoise text-white font-bold p-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                    >
                        Back to Log In
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black mb-2">New Password</h1>
                    <p className="text-gray-500">Pick something you'll remember this time.</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-6 text-center border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-4 bg-white rounded-xl border border-gray-100 focus:border-turquoise outline-none transition-colors"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-4 bg-white rounded-xl border border-gray-100 focus:border-turquoise outline-none transition-colors"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-turquoise text-white font-bold p-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}
