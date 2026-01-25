
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Camera, Check, Instagram, LogOut } from 'lucide-react'
import SearchableSelect from '../components/ui/SearchableSelect'
import { COUNTRIES } from '../data/constants'

// Hogwarts Houses with colors
const HOUSES = [
    { id: 'gryffindor', name: 'Gryffindor', emoji: '🦁', color: 'bg-red-500', accent: 'border-red-500', textColor: 'text-red-500' },
    { id: 'slytherin', name: 'Slytherin', emoji: '🐍', color: 'bg-green-600', accent: 'border-green-600', textColor: 'text-green-600' },
    { id: 'ravenclaw', name: 'Ravenclaw', emoji: '🦅', color: 'bg-blue-500', accent: 'border-blue-500', textColor: 'text-blue-500' },
    { id: 'hufflepuff', name: 'Hufflepuff', emoji: '🦡', color: 'bg-yellow-500', accent: 'border-yellow-500', textColor: 'text-yellow-600' }
]

export default function Profile() {
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
        house_affinity: ''
    })

    useEffect(() => {
        if (user) fetchProfile()
    }, [user])

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('name, last_name, country, push_enabled, avatar_url, instagram_handle, house_affinity')
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
                    house_affinity: data.house_affinity || ''
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
            showToast('Please select an image file', 'error')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error')
            return
        }

        try {
            setUploading(true)

            // Generate unique filename
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            console.log('Avatar uploaded:', publicUrl)

            // Update form data
            setFormData(prev => ({ ...prev, avatar_url: publicUrl }))
            showToast('Photo uploaded! Click Save to confirm.', 'success')

        } catch (err) {
            console.error('Upload error:', err)
            showToast('Failed to upload photo', 'error')
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
                    push_enabled: formData.push_enabled,
                    avatar_url: formData.avatar_url,
                    instagram_handle: cleanHandle,
                    house_affinity: formData.house_affinity
                })
                .eq('id', user.id)

            if (error) throw error
            showToast('Profile saved successfully! ✨', 'success')
            // Refresh profile in context to update header color
            refreshProfile()
        } catch (err) {
            console.error("Error saving profile", err)
            showToast('Failed to save profile', 'error')
        } finally {
            setSaving(false)
        }
    }

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const selectedHouse = HOUSES.find(h => h.id === formData.house_affinity)

    if (!user) return <div className="p-10 text-center">Please Log In</div>
    if (loading) return <div className="p-10 text-center">Loading Profile...</div>

    return (
        <div className="p-6 pb-24 relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg font-medium text-white animate-in slide-in-from-top-5 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link to="/" className="p-2 bg-white rounded-full shadow-sm"><ArrowLeft size={20} /></Link>
                <h1 className="text-2xl font-black">My Profile</h1>
            </div>

            <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <div className={`w-28 h-28 rounded-full overflow-hidden bg-gray-200 border-4 ${selectedHouse ? selectedHouse.accent : 'border-white'} shadow-lg`}>
                            {formData.avatar_url ? (
                                <img
                                    src={formData.avatar_url}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-bold">
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
                    <p className="text-xs text-gray-400 mt-2">Tap to change photo</p>
                </div>

                {/* Email (read-only) */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Email</label>
                    <div className="font-medium text-gray-700">{user.email}</div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">First Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:border-turquoise outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Last Name</label>
                        <input
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:border-turquoise outline-none"
                        />
                    </div>
                </div>

                {/* Instagram Handle */}
                <div>
                    <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Instagram Handle</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                        <input
                            name="instagram_handle"
                            value={formData.instagram_handle}
                            onChange={handleChange}
                            placeholder="yourhandle"
                            className="w-full p-3 pl-8 bg-white rounded-xl border border-gray-200 focus:border-turquoise outline-none"
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
                            View on Instagram
                        </a>
                    )}
                </div>

                {/* Country */}
                <div>
                    <SearchableSelect
                        label="Country"
                        placeholder="Select Country"
                        value={formData.country}
                        options={COUNTRIES}
                        onChange={(val) => setFormData(prev => ({ ...prev, country: val }))}
                    />
                </div>

                {/* House Selection */}
                <div>
                    <label className="text-xs font-bold uppercase text-gray-400 mb-3 block">Choose Your House</label>
                    <div className="grid grid-cols-2 gap-3">
                        {HOUSES.map(house => (
                            <button
                                key={house.id}
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    house_affinity: prev.house_affinity === house.id ? null : house.id
                                }))}
                                className={`p-4 rounded-xl border-2 transition-all ${formData.house_affinity === house.id
                                    ? `${house.accent} bg-white shadow-md scale-[1.02]`
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-2xl mb-1">{house.emoji}</div>
                                <div className={`font-bold text-sm ${formData.house_affinity === house.id ? house.textColor : 'text-gray-700'}`}>
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

                {/* Push Notifications Toggle */}
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100">
                    <div>
                        <div className="font-bold text-sm">Push Notifications</div>
                        <div className="text-xs text-gray-400">Receive event updates</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="push_enabled" checked={formData.push_enabled} onChange={handleChange} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-turquoise"></div>
                    </label>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-black text-white font-bold p-4 rounded-xl shadow-lg mt-8 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Profile'}
                </button>

                {/* Sign Out Button */}
                <button
                    onClick={async () => {
                        if (confirm('Are you sure you want to sign out?')) {
                            await signOut()
                            navigate('/auth')
                        }
                    }}
                    className="w-full mt-4 py-3 px-4 bg-white border-2 border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </div>
    )
}
