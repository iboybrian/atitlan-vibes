
import { X, User, Settings, Info, MapPin, LogIn, LogOut, Shield, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../lib/i18n'

export default function Sidebar({ isOpen, onClose }) {
    const t = useT()
    const [towns, setTowns] = useState([])
    const { user } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (isOpen) {
            async function fetchTowns() {
                // Fetch only Approved towns if you had that flag (optional, towns usually static)
                const { data } = await supabase.from('towns').select('id, name').order('name')
                if (data) setTowns(data)
            }
            fetchTowns()
        }
    }, [isOpen])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        onClose()
        navigate('/')
    }

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="absolute inset-0 bg-black/50 z-50 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div className={`absolute top-0 left-0 bottom-0 w-3/4 max-w-xs bg-white dark:bg-slate-800 z-50 transform transition-transform duration-300 ease-out shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 flex justify-between items-center border-b border-gray-100 dark:border-slate-700">
                    <span className="font-bold text-lg text-gray-900 dark:text-white">{t('sidebar.menu')}</span>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-700 dark:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 space-y-6">

                    {/* Auth State */}
                    {user ? (
                        <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-xl mb-2">
                            <div className="text-xs text-gray-400 dark:text-gray-400 font-bold uppercase mb-1">{t('sidebar.signedInAs')}</div>
                            <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{user.email}</div>
                        </div>
                    ) : (
                        <div className="bg-turquoise/10 p-4 rounded-xl mb-2">
                            <p className="text-sm text-turquoise font-medium mb-3">{t('sidebar.joinPrompt')}</p>
                            <Link
                                to="/auth"
                                onClick={onClose}
                                className="block w-full text-center bg-turquoise text-white font-bold py-2 rounded-lg text-sm shadow-sm"
                            >
                                {t('sidebar.logInSignUp')}
                            </Link>
                        </div>
                    )}

                    {/* Main Links */}
                    <div className="space-y-4">
                        <Link to="/profile" onClick={onClose} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer text-gray-900 dark:text-gray-100">
                            <User size={20} className="text-gray-500 dark:text-gray-400" />
                            <span className="font-medium">{t('sidebar.profile')}</span>
                        </Link>
                        <Link to="/favorites" onClick={onClose} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer text-gray-900 dark:text-gray-100">
                            <Heart size={20} className="text-gray-500 dark:text-gray-400" />
                            <span className="font-medium">{t('sidebar.favorites')}</span>
                        </Link>
                        <Link to="/settings" onClick={onClose} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer text-gray-900 dark:text-gray-100">
                            <Settings size={20} className="text-gray-500 dark:text-gray-400" />
                            <span className="font-medium">{t('sidebar.settings')}</span>
                        </Link>
                        <Link to="/about" onClick={onClose} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer text-gray-900 dark:text-gray-100">
                            <Info size={20} className="text-gray-500 dark:text-gray-400" />
                            <span className="font-medium">{t('sidebar.about')}</span>
                        </Link>
                        <Link to="/privacy" onClick={onClose} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl cursor-pointer text-gray-900 dark:text-gray-100">
                            <Shield size={20} className="text-gray-500 dark:text-gray-400" />
                            <span className="font-medium">{t('sidebar.privacy')}</span>
                        </Link>

                        {user && (
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 dark:text-red-400 rounded-xl cursor-pointer text-left"
                            >
                                <LogOut size={20} />
                                <span className="font-medium">{t('sidebar.logOut')}</span>
                            </button>
                        )}
                    </div>

                    <hr className="border-gray-100 dark:border-slate-700" />

                    {/* Browse Towns */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-3">
                            {t('sidebar.browseTowns')}
                        </h3>
                        <div className="space-y-1">
                            {towns.map(town => (
                                <Link
                                    key={town.id}
                                    to={`/town/${town.id}`}
                                    onClick={onClose}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl text-gray-700 dark:text-gray-200"
                                >
                                    <MapPin size={18} className="text-turquoise" />
                                    <span className="font-medium">{town.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
