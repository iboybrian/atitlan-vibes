
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (isSignUp && password !== confirmPassword) {
            setError("Passwords do not match!")
            setLoading(false)
            return
        }

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                alert('Check your email for the login link!')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                navigate('/')
            }
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSocialLogin = async (provider) => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: window.location.origin // Redirects back to app
                }
            })
            if (error) throw error
        } catch (err) {
            console.error("Social login error:", err)
            setError(err.message)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black mb-2">
                        {isSignUp ? "Create Account" : "Welcome Back"}
                    </h1>
                    <p className="text-gray-500">
                        {isSignUp ? "Join the community to post vibes." : "Sign in to start posting."}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-6 text-center border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 bg-white rounded-xl border border-gray-100 focus:border-turquoise outline-none transition-colors"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 bg-white rounded-xl border border-gray-100 focus:border-turquoise outline-none transition-colors"
                            required
                        />
                    </div>

                    {isSignUp && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-4 bg-white rounded-xl border border-gray-100 focus:border-turquoise outline-none transition-colors"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-turquoise text-white font-bold p-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
                    </button>
                </form>

                <div className="mt-8">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-[#F5F5F0] text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleSocialLogin('google')}
                            type="button"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium text-gray-600"
                        >
                            {/* Google Icon SVG */}
                            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill-rule="evenodd" fill-opacity="1" fill="#4285F4" stroke="none"></path>
                                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.035-3.715H.957v2.332A8.997 8.997 0 0 0 9 18z" fill-rule="evenodd" fill-opacity="1" fill="#34A853" stroke="none"></path>
                                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill-rule="evenodd" fill-opacity="1" fill="#FBBC05" stroke="none"></path>
                                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.965 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill-rule="evenodd" fill-opacity="1" fill="#EA4335" stroke="none"></path>
                            </svg>
                            Google
                        </button>
                        <button
                            onClick={() => handleSocialLogin('apple')}
                            type="button"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium text-gray-600"
                        >
                            {/* Apple Icon SVG */}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.5 12.625c0 2.604 2.276 3.475 2.375 3.518-.01.034-.37.962-1.22 1.954-.741.867-1.512 1.733-2.73 1.751-1.19.019-1.572-.519-2.936-.519-1.363 0-1.791.537-2.946.574-1.181.037-2.083-.981-2.836-1.808-1.545-1.693-2.73-4.805-1.141-6.721.787-.951 2.204-1.554 3.737-1.573 1.162-.019 2.259.599 2.969.599.71 0 2.05-.739 3.449-.63 1.173.092 2.063.385 2.721 1.127-.066.037-1.626.7-1.626 2.802.184-.074-.536-2.586.999-3.955.91-.806 2.454-1.345 2.454-1.345s.176 1.198-.999 2.586c-.848 1.006-2.222 1.345-2.454 1.37z" />
                            </svg>
                            Apple
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp)
                            setError(null)
                        }}
                        className="text-gray-500 hover:text-turquoise font-medium text-sm"
                    >
                        {isSignUp
                            ? 'Already have an account? Log In'
                            : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    )
}
