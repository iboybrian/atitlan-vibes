
import { X, Upload, Calendar as CalendarIcon, Phone, Tag, DollarSign, MapPin, Camera, Image as ImageIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { PHONE_CODES } from '../../data/constants'
import { useT } from '../../lib/i18n'

export default function AddEventModal({ isOpen, onClose }) {
    const t = useT()
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [towns, setTowns] = useState([])

    // Preview URL for immediate feedback
    const [previewUrl, setPreviewUrl] = useState(null)
    const [selectedFile, setSelectedFile] = useState(null)

    // Form State
    const [costType, setCostType] = useState('gtq') // gtq, free, contact
    const [formData, setFormData] = useState({
        name: '',
        town_id: '',
        description: '',
        calendar_date: '', // YYYY-MM-DD
        event_date_label: '', // e.g. "Every Sunday"
        start_time: '',
        venue: '',
        costValue: '', // Only used if costType === 'gtq'
        phone_code: '+502',
        phone_number: '',
        tags: '', // Comma separated string
        contact_link: ''
    })

    // Fetch Towns
    useEffect(() => {
        if (isOpen) {
            supabase.from('towns').select('id, name').order('name').then(({ data }) => setTowns(data || []))
        }
    }, [isOpen])

    // Cleanup object URL
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Same two guards as the avatar upload in Profile.jsx — without them an
        // oversized or non-image file only fails later, inside the submit.
        if (file.type && !file.type.startsWith('image/')) return alert(t('profile.pickImage'))
        if (file.size > 5 * 1024 * 1024) return alert(t('profile.imageTooBig'))

        // 1. Immediate Preview
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)
        setSelectedFile(file)
    }

    const uploadImageToStorage = async (file) => {
        if (!file) return null
        try {
            setUploading(true)
            // Camera captures often arrive with no extension and an empty type, which
            // stores the object as application/octet-stream and trips MIME allow-lists.
            const fileExt = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg'
            const fileName = `${user.id}/${Date.now()}.${fileExt}` // Organized by user

            const { error: uploadError } = await supabase.storage
                .from('events')
                .upload(fileName, file, { contentType: file.type || 'image/jpeg' })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('events')
                .getPublicUrl(fileName)

            return publicUrl
        } catch (error) {
            console.error("Storage Error:", error)
            throw new Error(t('addEvent.uploadFailed', { msg: error.message }))
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!user) return alert(t('addEvent.mustLogin'))

        // Basic validation
        if (!formData.name || !formData.town_id || !formData.calendar_date || !formData.start_time || !formData.venue || !formData.event_date_label) {
            return alert(t('addEvent.fillRequired'))
        }

        setLoading(true)

        try {
            // 1. Upload Image First
            let finalImageUrl = null
            if (selectedFile) {
                finalImageUrl = await uploadImageToStorage(selectedFile)
            }

            // 2. Format Data
            const finalPhone = formData.phone_number ? `${formData.phone_code} ${formData.phone_number}` : null

            // Cost Logic
            let finalCost = 'Free'
            if (costType === 'contact') finalCost = 'Contact Venue'
            if (costType === 'gtq') finalCost = `GTQ ${formData.costValue || '0'}`

            // Time Logic (Ensure HH:mm:ss for Postgres)
            let formattedTime = formData.start_time
            if (formattedTime && formattedTime.length === 5) {
                formattedTime += ':00' // Append seconds if missing
            }

            // 3. Insert Record
            const { error } = await supabase.from('events').insert({
                name: formData.name,
                town_id: formData.town_id,
                description: formData.description,
                calendar_date: formData.calendar_date,
                event_date_label: formData.event_date_label,
                start_time: formattedTime,
                venue: formData.venue,
                cost: finalCost,
                // tags: tagsArray, // Removed: column missing in DB
                contact_number: finalPhone,
                contact_link: formData.contact_link,
                cover_image: finalImageUrl, // The uploaded URL
                creator_id: user.id,
                is_approved: false
            })

            if (error) throw error

            alert(t('addEvent.success'))
            onClose()

            // Reset
            setFormData({
                name: '', town_id: '', description: '', calendar_date: '',
                event_date_label: '', start_time: '', venue: '', costValue: '',
                phone_code: '+502', phone_number: '', tags: '', contact_link: ''
            })
            setPreviewUrl(null)
            setSelectedFile(null)

        } catch (error) {
            console.error("Submit error:", error)
            // The real message used to live only in the console, which nobody can read
            // inside the APK — every failure looked like the same generic error.
            alert(error.message || t('addEvent.error'))
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/60 pointer-events-auto backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white dark:bg-slate-800 w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-xl z-50 pointer-events-auto flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">

                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{t('addEvent.title')}</h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="text-red-500 font-bold">*</span> {t('addEvent.requiredNote')}
                        </p>

                        {/* Image Upload with Preview */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500">{t('addEvent.coverImage')}</label>
                            <div className="w-full aspect-video bg-gray-50 dark:bg-slate-700 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600 flex flex-col items-center justify-center overflow-hidden">
                                {previewUrl ? (
                                    <img src={previewUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                                        <Upload size={24} className="mb-2" />
                                        <span className="text-xs">{t('addEvent.selectPhoto')}</span>
                                    </div>
                                )}
                            </div>
                            {/* Two inputs instead of one: capture="environment" opens the camera
                                straight away, which the plain picker never guarantees on Android. */}
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                                    <Camera size={16} />
                                    {t('addEvent.takePhoto')}
                                    <input type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                                </label>
                                <label className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                                    <ImageIcon size={16} />
                                    {t('addEvent.fromGallery')}
                                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <input name="name" placeholder={t('addEvent.name')} required value={formData.name} onChange={handleChange} className="w-full p-3 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none focus:ring-2 focus:ring-turquoise/20 font-bold text-lg" />

                        <div className="grid grid-cols-2 gap-3">
                            <select name="town_id" required value={formData.town_id} onChange={handleChange} className="w-full p-3 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none focus:ring-2 focus:ring-turquoise/20 text-sm">
                                <option value="">{t('addEvent.selectTown')}</option>
                                {towns.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>

                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-500" />
                                <input name="venue" required placeholder={t('addEvent.venue')} value={formData.venue} onChange={handleChange} className="w-full p-3 pl-9 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none focus:ring-2 focus:ring-turquoise/20 text-sm" />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">{t('addEvent.exactDate')} <span className="text-red-500">*</span></label>
                                <input type="date" name="calendar_date" required value={formData.calendar_date} onChange={handleChange} className="w-full p-3 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none focus:ring-2 focus:ring-turquoise/20 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">{t('addEvent.displayLabel')} <span className="text-red-500">*</span></label>
                                <input name="event_date_label" placeholder={t('addEvent.labelExample')} required value={formData.event_date_label} onChange={handleChange} className="w-full p-3 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none focus:ring-2 focus:ring-turquoise/20 text-sm" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">{t('addEvent.startTime')} <span className="text-red-500">*</span></label>
                            <input type="time" required name="start_time" value={formData.start_time} onChange={handleChange} className="w-full p-3 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none focus:ring-2 focus:ring-turquoise/20 text-sm" />
                        </div>

                        {/* Cost Logic */}
                        <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
                            <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-2 block">{t('addEvent.cost')}</label>
                            <div className="flex gap-4 mb-3">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="radio" checked={costType === 'gtq'} onChange={() => setCostType('gtq')} className="text-turquoise focus:ring-turquoise" />
                                    <span>{t('addEvent.price')}</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="radio" checked={costType === 'free'} onChange={() => setCostType('free')} className="text-turquoise focus:ring-turquoise" />
                                    <span className="text-green-500 font-bold">{t('addEvent.free')}</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="radio" checked={costType === 'contact'} onChange={() => setCostType('contact')} className="text-turquoise focus:ring-turquoise" />
                                    <span>{t('addEvent.contactVenue')}</span>
                                </label>
                            </div>
                            {costType === 'gtq' && (
                                <div className="relative animate-in slide-in-from-top-1 fade-in duration-200">
                                    <span className="absolute left-3 top-3 text-sm font-bold text-gray-500 dark:text-gray-400">GTQ</span>
                                    <input name="costValue" type="number" placeholder="50" value={formData.costValue} onChange={handleChange} className="w-full p-2 pl-12 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-slate-600 text-sm" />
                                </div>
                            )}
                        </div>

                        <textarea name="description" placeholder={t('addEvent.description')} rows={3} value={formData.description} onChange={handleChange} className="w-full p-3 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none focus:ring-2 focus:ring-turquoise/20 text-sm resize-none" />

                        {/* Advanced: Phone & Contact Link */}
                        <div className="flex gap-3">
                            <div className="relative w-[110px]">
                                <select
                                    name="phone_code"
                                    value={formData.phone_code}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none text-xl appearance-none cursor-pointer"
                                    style={{ paddingRight: '0px' }}
                                >
                                    {PHONE_CODES.map(c => (
                                        <option key={c.code} value={c.code}>
                                            {c.flag} {c.code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <input name="phone_number" type="tel" placeholder={t('addEvent.phoneNumber')} value={formData.phone_number} onChange={handleChange} className="flex-1 p-3 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none text-sm" />
                        </div>

                        {/* Contact Link Input (Moved Up) */}
                        <div className="relative">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                            <input
                                name="contact_link"
                                placeholder={t('addEvent.contactLink')}
                                value={formData.contact_link}
                                onChange={handleChange}
                                className="w-full p-3 pl-9 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none focus:ring-2 focus:ring-turquoise/20 text-sm"
                            />
                        </div>

                        {/* Tags (Moved Down) */}
                        <div className="relative">
                            <Tag size={16} className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-500" />
                            <input name="tags" placeholder={t('addEvent.tags')} value={formData.tags} onChange={handleChange} className="w-full p-3 pl-9 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl border-none focus:ring-2 focus:ring-turquoise/20 text-sm" />
                        </div>

                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky bottom-0 z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={loading || uploading}
                        className="w-full bg-turquoise text-white font-bold p-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-turquoise/90 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                    >
                        {loading || uploading ? t('addEvent.processing') : t('addEvent.submit')}
                    </button>
                </div>

            </div>
        </div>
    )
}
