import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Bottom sheet: the town list, the vibe picker, a map pin's events. Fixed is fine
 * for the same reason modals are — a viewport-anchored panel capped at max-w-lg
 * sits inside the shell column at every breakpoint. z-50 covers chrome.
 *
 * Portaled to <body>: the town pill opens this from inside the sticky Header,
 * whose z-40 is its own stacking context, and the tab bar would paint over it.
 */
export default function Sheet({ title, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto bg-[#F5F5F0] dark:bg-slate-900 rounded-t-3xl shadow-2xl px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sheet-up">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-slate-600" />
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{title}</h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-full text-gray-500 hover:bg-black/5 dark:hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    )
}
