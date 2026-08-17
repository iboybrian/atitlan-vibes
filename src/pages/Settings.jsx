
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Bell, Moon, Sun, ChevronRight, Languages, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { setPushPreference, isPushSupported } from '../lib/pushNotifications'
import { useT, getLang, setLang } from '../lib/i18n'

export default function Settings() {
    const t = useT()
    const { user, darkMode, toggleDarkMode } = useAuth()
    const navigate = useNavigate()
    const [pushEnabled, setPushEnabled] = useState(true)
    const [pushError, setPushError] = useState('')

    // Load push_enabled state from database
    useEffect(() => {
        if (user) {
            supabase
                .from('users')
                .select('push_enabled')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) setPushEnabled(data.push_enabled ?? true)
                })
        }
    }, [user])

    // Toggle push notifications — asks the OS for permission and stores a token
    const handlePushToggle = async (enabled) => {
        if (!user) return

        setPushEnabled(enabled)
        setPushError('')

        const result = await setPushPreference(user.id, enabled)
        if (!result.success) {
            setPushEnabled(!enabled) // OS denied or the save failed — don't lie to the user
            setPushError(result.message || result.error)
        }
    }

    // Toggle component
    const Toggle = ({ enabled, onChange }) => (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-turquoise' : 'bg-gray-300 dark:bg-slate-600'}`}
        >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
        </button>
    )

    // Language switch — two states, so a segmented pair beats a dropdown
    const LangSwitch = () => (
        <div className="flex bg-gray-100 dark:bg-slate-700 rounded-full p-1">
            {['es', 'en'].map(code => (
                <button
                    key={code}
                    onClick={() => setLang(code)}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${getLang() === code
                        ? 'bg-turquoise text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-300'
                        }`}
                >
                    {code.toUpperCase()}
                </button>
            ))}
        </div>
    )

    // Section Header
    const SectionHeader = ({ children }) => (
        <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-3 px-1">{children}</h3>
    )

    // Menu Item
    const MenuItem = ({ icon: Icon, label, onClick, to, rightElement }) => {
        const content = (
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm mb-2 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                        <Icon size={20} />
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
                </div>
                {rightElement || <ChevronRight size={20} className="text-gray-400 dark:text-gray-500" />}
            </div>
        )

        if (to) {
            return <Link to={to}>{content}</Link>
        }
        return <div onClick={onClick}>{content}</div>
    }

    return (
        <div className="px-4 py-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-turquoise/10 flex items-center justify-center">
                    <SettingsIcon size={24} className="text-turquoise" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('settings.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.subtitle')}</p>
                </div>
            </div>

            {/* Profile Settings */}
            <SectionHeader>{t('settings.profile')}</SectionHeader>
            <MenuItem icon={User} label={t('settings.editProfile')} to="/profile" />

            {/* Appearance */}
            <SectionHeader>{t('settings.appearance')}</SectionHeader>
            <MenuItem
                icon={darkMode ? Moon : Sun}
                label={darkMode ? t('settings.darkMode') : t('settings.lightMode')}
                onClick={toggleDarkMode}
                rightElement={<Toggle enabled={darkMode} onChange={toggleDarkMode} />}
            />

            {/* Language — no row onClick, the switch handles its own clicks */}
            <SectionHeader>{t('settings.language')}</SectionHeader>
            <MenuItem
                icon={Languages}
                label={t('settings.languageLabel')}
                rightElement={<LangSwitch />}
            />

            {/* Notifications — mobile app only, nothing delivers to the browser */}
            {isPushSupported() && (
                <>
                    <SectionHeader>{t('settings.notifications')}</SectionHeader>
                    {/* No row onClick: the Toggle's click bubbles here and fires the handler twice */}
                    <MenuItem
                        icon={Bell}
                        label={t('settings.push')}
                        rightElement={<Toggle enabled={pushEnabled} onChange={handlePushToggle} />}
                    />
                    {pushError && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 px-1 mb-2">{pushError}</p>
                    )}
                </>
            )}

            {/* App Info */}
            <div className="mt-10 text-center text-xs text-gray-400 dark:text-gray-500">
                <p>Atitlán Vibes v1.8.0</p>
                <p className="mt-1">{t('common.madeWith')}</p>
            </div>
        </div>
    )
}
