
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Camera, Check, Instagram, LogOut } from 'lucide-react'
import SearchableSelect from '../components/ui/SearchableSelect'
import { COUNTRIES } from '../data/constants'
import { setPushPreference, isPushSupported } from '../lib/pushNotifications'
import { useT } from '../lib/i18n'

// Hogwarts Houses with colors
const HOUSES = [
    { id: 'gryffindor', name: 'Gryffindor', emoji: '🦁', color: 'bg-red-500', accent: 'border-red-500', textColor: 'text-red-500' },
    { id: 'slytherin', name: 'Slytherin', emoji: '🐍', color: 'bg-green-600', accent: 'border-green-600', textColor: 'text-green-600' },
    { id: 'ravenclaw', name: 'Ravenclaw', emoji: '🦅', color: 'bg-blue-500', accent: 'border-blue-500', textColor: 'text-blue-500' },
    { id: 'hufflepuff', name: 'Hufflepuff', emoji: '🦡', color: 'bg-yellow-500', accent: 'border-yellow-500', textColor: 'text-yellow-600' }
]

// Traveler Types — labels come from the dictionary, ids are what's stored
const TRAVELER_TYPES = [
    { id: 'heritage_hunter', key: 'heritageHunter', emoji: '🏛️' },
    { id: 'nature_maverick', key: 'natureMaverick', emoji: '🌿' },
    { id: 'digital_nomad', key: 'digitalNomad', emoji: '💻' },
    { id: 'fiesta_navigator', key: 'fiestaNavigator', emoji: '🎉' }
]

export default function Profile() {
    const t = useT()
    const { user, signOut, refreshProfile } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [toast, setToast] = useState(null)
    const fileInputRef = useRef(null)

    const [formData, setFormData] = useState({
        name: '',
        last_name: '',
        country: '',
        push_enabled: true,
        avatar_url: '',
        instagram_handle: '',
        house_affinity: '',
        traveler_type: ''
    })

    useEffect(() => {
        if (user) fetchProfile()
    }, [user])

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('name, last_name, country, push_enabled, avatar_url, instagram_handle, house_affinity, traveler_type')
                .eq('id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error)
            }

            if (data) {
                setFormData({
                    name: data.name || '',
                    last_name: data.last_name || '',
                    country: data.country || '',
                    push_enabled: data.push_enabled ?? true,
                    avatar_url: data.avatar_url || '',
                    instagram_handle: data.instagram_handle || '',
                    house_affinity: data.house_affinity || '',
                    traveler_type: data.traveler_type || ''
                })
            }
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    // Avatar upload handler
    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast(t('profile.pickImage'), 'error')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast(t('profile.imageTooBig'), 'error')
            return
        }

        try {
            setUploading(true)
            console.log('Starting avatar upload...', { fileName: file.name, size: file.size, type: file.type })

            // Generate unique filename
            const fileExt = file.name.split('.').pop().toLowerCase()
            const fileName = `${user.id}-${Date.now()}.${fileExt}`

            console.log('Uploading to path:', fileName)

            // Upload to Supabase Storage with explicit content type
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    upsert: true,
                    contentType: file.type
                })

            if (uploadError) {
                console.error('Supabase upload error:', uploadError)
                // Show more specific error
                if (uploadError.message.includes('Bucket not found')) {
                    showToast(t('profile.bucketMissing'), 'error')
                } else if (uploadError.message.includes('policy')) {
                    showToast(t('profile.permissionDenied'), 'error')
                } else {
                    showToast(t('profile.uploadFailed', { msg: uploadError.message }), 'error')
                }
                return
            }

            console.log('Upload successful:', uploadData)

            // Get public URL immediately after upload
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            const publicUrl = urlData.publicUrl
            console.log('Avatar public URL:', publicUrl)

            // Immediately update the users table with the new avatar URL
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)

            if (updateError) {
                console.error('Database update error:', updateError)
                showToast(t('profile.savePhotoFailed', { msg: updateError.message }), 'error')
                return
            }

            console.log('Avatar URL saved to database successfully')

            // Update local form state for immediate visual feedback
            setFormData(prev => ({ ...prev, avatar_url: publicUrl }))

            // Refresh profile context so header/sidebar also update
            refreshProfile()

            showToast(t('profile.photoUpdated'), 'success')

        } catch (err) {
            console.error('Upload error:', err)
            showToast(t('profile.uploadFailed', { msg: err.message || '' }), 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)

            // Clean Instagram handle (remove @ if present)
            const cleanHandle = formData.instagram_handle.replace(/^@/, '')

            const { error } = await supabase
                .from('users')
                .update({
                    name: formData.name,
                    last_name: formData.last_name,
                    country: formData.country,
                    avatar_url: formData.avatar_url,
                    instagram_handle: cleanHandle,
                    house_affinity: formData.house_affinity,
                    traveler_type: formData.traveler_type
                })
                .eq('id', user.id)

            if (error) throw error
            // Refresh profile in context to update header color
            refreshProfile()

            // push_enabled is not a plain column write — it needs OS permission and a token
            if (isPushSupported()) {
                const push = await setPushPreference(user.id, formData.push_enabled)
                if (!push.success) {
                    setFormData(prev => ({ ...prev, push_enabled: false }))
                    showToast(push.message || push.error, 'error')
                    return
                }
            }

            showToast(t('profile.saved'), 'success')
        } catch (err) {
            console.error("Error saving profile", err)
            showToast(t('profile.saveFailed'), 'error')
        } finally {
            setSaving(false)
        }
    }

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const selectedHouse = HOUSES.find(h => h.id === formData.house_affinity)

    if (!user) return <div className="p-10 text-center">{t('profile.pleaseLogIn')}</div>
    if (loading) return <div className="p-10 text-center">{t('profile.loading')}</div>

    return (
        <div className="p-6 max-w-2xl mx-auto relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg font-medium text-white animate-in slide-in-from-top-5 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link to="/" className="p-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-full shadow-sm"><ArrowLeft size={20} /></Link>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('profile.title')}</h1>
            </div>

            <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <div className={`w-28 h-28 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700 border-4 ${selectedHouse ? selectedHouse.accent : 'border-white dark:border-slate-700'} shadow-lg`}>
                            {formData.avatar_url ? (
                                <img
                                    src={formData.avatar_url}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-3xl font-bold">
                                    {formData.name ? formData.name[0].toUpperCase() : '?'}
                                </div>
                            )}
                        </div>

                        {/* Upload button overlay */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute bottom-0 right-0 w-10 h-10 bg-turquoise text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                        >
                            {uploading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Camera size={18} />
                            )}
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                        />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('profile.tapToChange')}</p>
                </div>

                {/* Email (read-only) */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <label className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mb-1 block">{t('profile.email')}</label>
                    <div className="font-medium text-gray-700 dark:text-gray-200">{user.email}</div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mb-2 block">{t('profile.firstName')}</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full p-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-slate-700 focus:border-turquoise outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mb-2 block">{t('profile.lastName')}</label>
                        <input
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full p-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-slate-700 focus:border-turquoise outline-none"
                        />
                    </div>
                </div>

                {/* Instagram Handle */}
                <div>
                    <label className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mb-2 block">{t('profile.instagram')}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">@</span>
                        <input
                            name="instagram_handle"
                            value={formData.instagram_handle}
                            onChange={handleChange}
                            placeholder={t('profile.instagramPlaceholder')}
                            className="w-full p-3 pl-8 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-slate-700 focus:border-turquoise outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>
                    {formData.instagram_handle && (
                        <a
                            href={`https://instagram.com/${formData.instagram_handle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-pink-500 mt-1 flex items-center gap-1 hover:underline"
                        >
                            <Instagram size={12} />
                            {t('profile.viewInstagram')}
                        </a>
                    )}
                </div>

                {/* Country */}
                <div>
                    <SearchableSelect
                        label={t('profile.country')}
                        placeholder={t('profile.selectCountry')}
                        value={formData.country}
                        options={COUNTRIES}
                        onChange={(val) => setFormData(prev => ({ ...prev, country: val }))}
                    />
                </div>

                {/* House Selection */}
                <div>
                    <label className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mb-3 block">{t('profile.chooseHouse')}</label>
                    <div className="grid grid-cols-2 gap-3">
                        {HOUSES.map(house => (
                            <button
                                key={house.id}
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    house_affinity: prev.house_affinity === house.id ? null : house.id
                                }))}
                                className={`p-4 rounded-xl border-2 transition-all ${formData.house_affinity === house.id
                                    ? `${house.accent} bg-white dark:bg-slate-800 shadow-md scale-[1.02]`
                                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                <div className="text-2xl mb-1">{house.emoji}</div>
                                <div className={`font-bold text-sm ${formData.house_affinity === house.id ? house.textColor : 'text-gray-700 dark:text-gray-300'}`}>
                                    {house.name}
                                </div>
                                {formData.house_affinity === house.id && (
                                    <div className={`mt-2 w-5 h-5 ${house.color} rounded-full flex items-center justify-center mx-auto`}>
                                        <Check size={12} className="text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Traveler Type Selection */}
                <div>
                    <label className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mb-3 block">{t('profile.travelerType')}</label>
                    <div className="grid grid-cols-2 gap-3">
                        {TRAVELER_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    traveler_type: prev.traveler_type === type.id ? null : type.id
                                }))}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${formData.traveler_type === type.id
                                    ? 'border-turquoise bg-turquoise/5 shadow-md scale-[1.02]'
                                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                <div className="text-2xl mb-1">{type.emoji}</div>
                                <div className={`font-bold text-sm ${formData.traveler_type === type.id ? 'text-turquoise' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {t(`profile.${type.key}`)}
                                </div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t(`profile.${type.key}Desc`)}</div>
                                {formData.traveler_type === type.id && (
                                    <div className="mt-2 w-5 h-5 bg-turquoise rounded-full flex items-center justify-center">
                                        <Check size={12} className="text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Push Notifications Toggle — mobile app only */}
                <div className={`flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 ${isPushSupported() ? '' : 'hidden'}`}>
                    <div>
                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{t('profile.push')}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{t('profile.pushSub')}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="push_enabled" checked={formData.push_enabled} onChange={handleChange} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-turquoise"></div>
                    </label>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-black dark:bg-turquoise text-white font-bold p-4 rounded-xl shadow-lg mt-8 flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-turquoise/90 transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? t('profile.saving') : t('profile.save')}
                </button>

                {/* Sign Out Button */}
                <button
                    onClick={async () => {
                        if (confirm(t('profile.signOutConfirm'))) {
                            await signOut()
                            navigate('/auth')
                        }
                    }}
                    className="w-full mt-4 py-3 px-4 bg-white dark:bg-slate-800 border-2 border-red-200 dark:border-red-500/40 text-red-500 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut size={18} />
                    {t('profile.signOut')}
                </button>
            </div>
        </div>
    )
}
