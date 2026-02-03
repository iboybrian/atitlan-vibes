
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Bell, Moon, Sun, ChevronRight, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Settings() {
    const { user, darkMode, toggleDarkMode } = useAuth()
    const navigate = useNavigate()
    const [pushEnabled, setPushEnabled] = useState(true)

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

    // Toggle push notifications
    const handlePushToggle = async (enabled) => {
        setPushEnabled(enabled)
        if (user) {
            await supabase
                .from('users')
                .update({ push_enabled: enabled })
                .eq('id', user.id)
        }
    }

    // Toggle component
    const Toggle = ({ enabled, onChange }) => (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-turquoise' : 'bg-gray-300'}`}
        >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
        </button>
    )

    // Section Header
    const SectionHeader = ({ children }) => (
        <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3 px-1">{children}</h3>
    )

    // Menu Item
    const MenuItem = ({ icon: Icon, label, onClick, to, rightElement }) => {
        const content = (
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-2 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <Icon size={20} />
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
                </div>
                {rightElement || <ChevronRight size={20} className="text-gray-400" />}
            </div>
        )

        if (to) {
            return <Link to={to}>{content}</Link>
        }
        return <div onClick={onClick}>{content}</div>
    }

    return (
        <div className="px-4 py-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-turquoise/10 flex items-center justify-center">
                    <SettingsIcon size={24} className="text-turquoise" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your preferences</p>
                </div>
            </div>

            {/* Profile Settings */}
            <SectionHeader>Profile</SectionHeader>
            <MenuItem icon={User} label="Edit Profile" to="/profile" />

            {/* Appearance */}
            <SectionHeader>Appearance</SectionHeader>
            <MenuItem
                icon={darkMode ? Moon : Sun}
                label={darkMode ? "Dark Mode" : "Light Mode"}
                onClick={toggleDarkMode}
                rightElement={<Toggle enabled={darkMode} onChange={toggleDarkMode} />}
            />

            {/* Notifications */}
            <SectionHeader>Notifications</SectionHeader>
            <MenuItem
                icon={Bell}
                label="Push Notifications"
                onClick={() => handlePushToggle(!pushEnabled)}
                rightElement={<Toggle enabled={pushEnabled} onChange={handlePushToggle} />}
            />

            {/* App Info */}
            <div className="mt-10 text-center text-xs text-gray-400">
                <p>Atitlán Vibes v1.0.0</p>
                <p className="mt-1">Made with 🌋 in Lake Atitlán</p>
            </div>
        </div>
    )
}
