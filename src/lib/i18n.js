import { useSyncExternalStore } from 'react'
import { dict } from './locales'

// Language lives here, not in AuthContext: pushNotifications.js needs t() outside
// React, and a plain module read works there while a context hook would not.
const initial = () => {
    const saved = localStorage.getItem('lang')
    if (saved === 'en' || saved === 'es') return saved
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

let lang = initial()
document.documentElement.lang = lang

const subs = new Set()
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn) }

export const getLang = () => lang

export const setLang = (next) => {
    lang = next
    localStorage.setItem('lang', next)
    document.documentElement.lang = next
    subs.forEach(fn => fn())
}

/** t('home.postVibe') — falls back to English, then to the key itself. */
export const t = (key, vars) => {
    const raw = dict[lang]?.[key] ?? dict.en[key] ?? key
    if (!vars) return raw
    return raw.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
}

/** Same t(), but re-renders the component when the language changes. */
export const useT = () => {
    useSyncExternalStore(subscribe, getLang)
    return t
}
