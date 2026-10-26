import { useEffect, useState } from 'react'
import { ClipboardCheck, Check, Pencil, Trash2, Mail, Phone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTowns } from '../lib/towns'
import { useT, getLang } from '../lib/i18n'
import { getDirectImageUrl, weekdayNames, EVENT_CATEGORIES } from '../lib/utils'

// Columns the edit form exposes, and their input type. Labels are the column
// names on purpose: this page is for whoever runs the app, and it maps 1:1 to
// the table. recurring_days and the cover image aren't editable here.
const FIELDS = [
    ['name', 'text'],
    ['description', 'textarea'],
    ['calendar_date', 'date'],
    ['event_date_label', 'text'],
    ['start_time', 'time'],
    ['venue', 'text'],
    ['cost', 'text'],
    ['contact_number', 'text'],
    ['contact_link', 'text']
]

const input = 'w-full p-2 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg border-none text-sm focus:ring-2 focus:ring-turquoise/20'

// "5 minutes ago" in the app's language, from an ISO timestamp.
const UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
function timeAgo(iso) {
    const rtf = new Intl.RelativeTimeFormat(getLang(), { numeric: 'auto' })
    const secs = (Date.parse(iso) - Date.now()) / 1000
    for (const [unit, size] of UNITS) {
        if (Math.abs(secs) >= size) return rtf.format(Math.round(secs / size), unit)
    }
    return rtf.format(0, 'minute')
}

/**
 * Latest sign-ins, newest first. Reads auth.users through the
 * admin_recent_logins() RPC (20261026000000 migration), which returns nothing
 * to non-admins.
 */
function RecentLogins() {
    const t = useT()
    const [rows, setRows] = useState(null)

    useEffect(() => {
        let alive = true
        supabase.rpc('admin_recent_logins', { max_rows: 50 }).then(({ data, error }) => {
            if (!alive) return
            if (error) alert(error.message)
            setRows(data ?? [])
        })
        return () => { alive = false }
    }, [])

    if (rows === null) return <div className="text-center text-gray-400 dark:text-gray-500 py-10">{t('common.loading')}</div>
    if (!rows.length) return <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">{t('admin.empty')}</div>

    return (
        <>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 px-1">{t('admin.loginsHint')}</p>
            <ul className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-slate-700">
                {rows.map(u => (
                    <li key={u.id} className="p-4 flex items-start gap-3 text-sm">
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                                {u.name || u.email}
                                {u.provider && (
                                    <span className="ml-2 align-middle px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-300">{u.provider}</span>
                                )}
                            </p>
                            <p className="flex items-center gap-1 text-gray-500 dark:text-gray-400 truncate"><Mail size={12} className="shrink-0" /> {u.email}</p>
                            {u.phone && <p className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><Phone size={12} className="shrink-0" /> {u.phone}</p>}
                        </div>
                        <div className="text-right shrink-0">
                            <p className="font-bold text-turquoise">{u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : t('admin.neverLoggedIn')}</p>
                            {u.last_sign_in_at && (
                                <p className="text-[11px] text-gray-400 dark:text-gray-500">{new Date(u.last_sign_in_at).toLocaleString(getLang())}</p>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </>
    )
}

export default function Admin() {
    const t = useT()
    const { isAdmin } = useAuth()
    const towns = useTowns()
    const [tab, setTab] = useState('pending')
    const [events, setEvents] = useState(null)
    const [creators, setCreators] = useState({})
    const [draft, setDraft] = useState(null) // the event being edited
    const [version, setVersion] = useState(0) // bump to reload after a change
    const dayNames = weekdayNames(getLang(), 'short')

    useEffect(() => {
        if (!isAdmin || tab === 'users') return
        let alive = true
        ;(async () => {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('is_approved', tab === 'approved')
                .order('created_at', { ascending: false })
                .limit(100)
            if (!alive) return
            if (error) return alert(error.message)

            const ids = [...new Set(data.map(e => e.creator_id).filter(Boolean))]
            const { data: users } = ids.length
                ? await supabase.from('users').select('id, name, phone').in('id', ids)
                : { data: [] }
            if (!alive) return
            setCreators(Object.fromEntries((users ?? []).map(u => [u.id, u])))
            setEvents(data)
        })()
        return () => { alive = false }
    }, [isAdmin, tab, version])

    // RLS turns a forbidden write into "0 rows, no error". .select() exposes
    // that, so a missing admins migration fails loudly instead of doing nothing.
    const write = async (query) => {
        const { data, error } = await query.select('id')
        if (error) return alert(error.message)
        if (!data?.length) return alert(t('admin.noPermission'))
        setDraft(null)
        setVersion(v => v + 1)
    }

    // Approving fires the existing trigger, which pushes the event to its town.
    const approve = (id) => write(supabase.from('events').update({ is_approved: true }).eq('id', id))

    const remove = (id) => {
        if (!confirm(t('admin.confirmDelete'))) return
        write(supabase.from('events').delete().eq('id', id))
    }

    const save = () => {
        const { id, ...patch } = draft
        // An emptied date/time input sends '', which Postgres rejects; null it.
        for (const k in patch) if (patch[k] === '') patch[k] = null
        write(supabase.from('events').update(patch).eq('id', id))
    }

    const edit = (e) => setDraft({
        id: e.id,
        town_id: e.town_id,
        category: e.category ?? '',
        is_feature: !!e.is_feature,
        ...Object.fromEntries(FIELDS.map(([k]) => [k, e[k] ?? '']))
    })

    const set = (k) => (ev) => setDraft(d => ({
        ...d, [k]: ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value
    }))

    if (isAdmin === null) {
        return <div className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">{t('common.loading')}</div>
    }
    if (!isAdmin) {
        return <div className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">{t('admin.notAllowed')}</div>
    }

    const townName = (id) => towns.find(x => x.id === id)?.name ?? `#${id}`

    return (
        <div className="px-4 py-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
                <ClipboardCheck size={22} className="text-turquoise" />
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('admin.title')}</h1>
            </div>

            <div className="flex gap-2 mb-6">
                {['pending', 'approved', 'users'].map(id => (
                    <button
                        key={id}
                        onClick={() => { setTab(id); setEvents(null); setDraft(null) }}
                        className={`px-4 py-2 rounded-full text-sm font-bold ${tab === id ? 'bg-turquoise text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300'}`}
                    >
                        {t(`admin.${id}`)}
                    </button>
                ))}
            </div>

            {tab === 'users' ? (
                <RecentLogins />
            ) : events === null ? (
                <div className="text-center text-gray-400 dark:text-gray-500 py-10">{t('common.loading')}</div>
            ) : events.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">{t('admin.empty')}</div>
            ) : (
                <div className="space-y-4">
                    {events.map(e => {
                        const who = creators[e.creator_id]
                        const editing = draft?.id === e.id
                        return (
                            <div key={e.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                {e.cover_image && (
                                    <img src={getDirectImageUrl(e.cover_image)} alt="" className="w-full aspect-video object-cover" />
                                )}
                                <div className="p-4 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                                    {editing ? (
                                        <>
                                            {FIELDS.map(([k, type]) => (
                                                <label key={k} className="block">
                                                    <span className="text-[10px] font-bold uppercase text-gray-400">{k}</span>
                                                    {type === 'textarea'
                                                        ? <textarea rows={4} value={draft[k]} onChange={set(k)} className={input} />
                                                        : <input type={type} value={draft[k]} onChange={set(k)} className={input} />}
                                                </label>
                                            ))}
                                            <label className="block">
                                                <span className="text-[10px] font-bold uppercase text-gray-400">town_id</span>
                                                <select value={draft.town_id} onChange={set('town_id')} className={input}>
                                                    {towns.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                                                </select>
                                            </label>
                                            <label className="block">
                                                <span className="text-[10px] font-bold uppercase text-gray-400">category</span>
                                                <select value={draft.category} onChange={set('category')} className={input}>
                                                    <option value="">—</option>
                                                    {EVENT_CATEGORIES.map(id => <option key={id} value={id}>{t(`category.${id}`)}</option>)}
                                                </select>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" checked={draft.is_feature} onChange={set('is_feature')} />
                                                <span className="font-bold">{t('common.featured')}</span>
                                            </label>
                                            <div className="flex gap-2 pt-2">
                                                <button onClick={save} className="flex-1 py-2 rounded-xl bg-turquoise text-white font-bold">{t('admin.save')}</button>
                                                <button onClick={() => setDraft(null)} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 font-bold">{t('admin.cancel')}</button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <h2 className="text-lg font-black text-gray-900 dark:text-white">{e.name}</h2>
                                                <p className="text-turquoise font-bold">
                                                    {townName(e.town_id)}{e.category && ` · ${t(`category.${e.category}`)}`}{e.is_feature && ` · ${t('common.featured')}`}
                                                </p>
                                            </div>
                                            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                                                {[
                                                    ['event_date_label', e.event_date_label],
                                                    ['calendar_date', e.calendar_date],
                                                    ['recurring_days', e.recurring_days?.map(d => dayNames[d]).join(', ')],
                                                    ['start_time', e.start_time?.slice(0, 5)],
                                                    ['venue', e.venue],
                                                    ['cost', e.cost],
                                                    ['contact_number', e.contact_number],
                                                    ['contact_link', e.contact_link],
                                                    [t('admin.submittedBy'), who && [who.name, who.phone].filter(Boolean).join(' · ')],
                                                    ['created_at', new Date(e.created_at).toLocaleString()]
                                                ].filter(([, v]) => v).map(([k, v]) => (
                                                    <div key={k} className="contents">
                                                        <dt className="text-[10px] font-bold uppercase text-gray-400 pt-0.5">{k}</dt>
                                                        <dd className="break-words">{v}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                            {e.description && <p className="whitespace-pre-line text-gray-600 dark:text-gray-300">{e.description}</p>}
                                            <div className="flex gap-2 pt-2">
                                                {!e.is_approved && (
                                                    <button onClick={() => approve(e.id)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-turquoise text-white font-bold">
                                                        <Check size={16} /> {t('admin.approve')}
                                                    </button>
                                                )}
                                                <button onClick={() => edit(e)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 font-bold">
                                                    <Pencil size={16} /> {t('admin.edit')}
                                                </button>
                                                <button onClick={() => remove(e.id)} className="flex items-center justify-center px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500" aria-label={t('admin.delete')}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
