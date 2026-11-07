import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Share2, Download, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PigeonLoading } from '../components/ui/Pigeon'
import { useT } from '../lib/i18n'

const APP = 'https://app.atitlanvibes.com'

/**
 * The page the organizer's email links to: the event's story picture, and one
 * button that hands the PICTURE to the phone's own share menu, so WhatsApp,
 * Instagram (as a story) and Facebook get a real image, not a link preview.
 * A link in an email can't do that; only a page running on the phone can.
 *
 * The picture is fetched on load, not on tap: iOS Safari only allows
 * navigator.share() right inside the tap, and an await for the download in
 * between loses that. Where file sharing isn't supported (most desktops, the
 * Android WebView) the button downloads the picture instead.
 */
export default function Share() {
    const t = useT()
    const { id } = useParams()
    const [event, setEvent] = useState(undefined) // undefined = loading, null = not found
    const [file, setFile] = useState(null)
    const [failed, setFailed] = useState(false)

    const imageUrl = `${APP}/api/og?id=${encodeURIComponent(id)}&format=story`
    const link = `${APP}/event/${id}`

    useEffect(() => {
        let alive = true
        supabase.from('events').select('id, name').eq('id', id).maybeSingle()
            .then(({ data }) => { if (alive) setEvent(data ?? null) })
        fetch(imageUrl)
            .then((r) => { if (!r.ok) throw new Error(r.status); return r.blob() })
            .then((blob) => { if (alive) setFile(new File([blob], `atitlan-vibes-${id}.png`, { type: 'image/png' })) })
            .catch(() => { if (alive) setFailed(true) })
        return () => { alive = false }
    }, [id, imageUrl])

    if (event === undefined) return <PigeonLoading label={t('common.loading')} />
    if (!event) return <div className="p-10 text-center text-gray-500 dark:text-gray-400">{t('event.notFound')}</div>

    // The link goes in the caption: WhatsApp keeps text sent with a picture, and
    // Instagram's story sheet ignores it, which is why the page also shows the link.
    const data = file && { files: [file], text: `${t('share.text', { name: event.name })}\n${link}` }
    const canShare = !!data && !!navigator.canShare?.(data)

    const download = () => {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    const share = async () => {
        try {
            await navigator.share(data)
        } catch (err) {
            // Closing the menu is not an error; anything else falls back to saving it.
            if (err?.name !== 'AbortError') download()
        }
    }

    return (
        <div className="px-4 py-6 max-w-md mx-auto">
            <Link to={`/event/${id}`} className="inline-flex items-center gap-1 mb-4 text-sm font-bold text-turquoise">
                <ArrowLeft size={16} /> {event.name}
            </Link>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{t('share.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('share.hint')}</p>

            <div className="mx-auto w-3/4 aspect-[9/16] rounded-3xl overflow-hidden bg-gray-200 dark:bg-slate-700 shadow-lg">
                <img src={imageUrl} alt={event.name} className="w-full h-full object-cover" />
            </div>

            <button
                type="button"
                onClick={canShare ? share : download}
                disabled={!file}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-turquoise text-white font-bold shadow-md active:scale-[0.98] transition-transform disabled:opacity-50"
            >
                {canShare ? <Share2 size={18} /> : <Download size={18} />}
                {!file ? (failed ? t('share.failed') : t('share.preparing')) : canShare ? t('share.button') : t('share.download')}
            </button>
            {canShare && (
                <button type="button" onClick={download} className="mt-2 w-full py-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('share.download')}
                </button>
            )}

            <div className="mt-6 p-3 rounded-xl bg-white dark:bg-slate-800 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">{t('share.link')}</p>
                <p className="text-sm font-mono break-all text-gray-700 dark:text-gray-200 select-all">{link}</p>
            </div>
        </div>
    )
}
