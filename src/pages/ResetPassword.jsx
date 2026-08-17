import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useT } from '../lib/i18n'

/**
 * Where the password-recovery link lands. Getting here means the code from the
 * email was already exchanged for a session — by detectSessionInUrl on web, by
 * the deep-link listener in main.jsx on native — so updateUser() is all that's
 * left. No session means the link was reused, expired, or opened on a different
 * device than the one that asked for the reset (PKCE keeps the code_verifier in
 * the browser that made the request).
 */
export default function ResetPassword() {
    const t = useT()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) return setError(t('auth.passwordsMismatch'))
        if (password.length < 6) return setError(t('reset.tooShort'))

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
                    <h1 className="text-3xl font-black mb-2 text-gray-900 dark:text-white">{t('reset.expiredTitle')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">{t('reset.expiredBody')}</p>
                    <button
                        onClick={() => navigate('/auth', { replace: true })}
                        className="w-full bg-turquoise text-white font-bold p-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                    >
                        {t('reset.backToLogin')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black mb-2 text-gray-900 dark:text-white">{t('reset.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('reset.subtitle')}</p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-300 p-3 rounded-lg text-sm mb-6 text-center border border-red-100 dark:border-red-700/50">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        placeholder={t('reset.newPassword')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-4 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border border-gray-100 dark:border-slate-700 focus:border-turquoise outline-none transition-colors"
                        required
                    />
                    <input
                        type="password"
                        placeholder={t('reset.confirmNew')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-4 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border border-gray-100 dark:border-slate-700 focus:border-turquoise outline-none transition-colors"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-turquoise text-white font-bold p-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? t('reset.saving') : t('reset.save')}
                    </button>
                </form>
            </div>
        </div>
    )
}
