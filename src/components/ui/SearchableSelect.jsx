
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'

export default function SearchableSelect({ options, value, onChange, placeholder = "Select...", label }) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef(null)

    // Filter options
    const filtered = options.filter(opt =>
        opt.toLowerCase().includes(search.toLowerCase())
    )

    const handleSelect = (opt) => {
        onChange({ target: { name: label, value: opt } }) // Simulate event for parent handler compatibility if needed, or just pass val
        setIsOpen(false)
        setSearch('')
    }

    // Direct value pass simpler
    const handleSelectDirect = (opt) => {
        onChange(opt)
        setIsOpen(false)
        setSearch('')
    }

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">{label}</label>}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:border-turquoise outline-none flex items-center justify-between text-left"
            >
                <span className={value ? "text-black" : "text-gray-400"}>
                    {value || placeholder}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-30 max-h-[250px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2 sticky top-0">
                            <Search size={14} className="text-gray-400" />
                            <input
                                autoFocus
                                className="bg-transparent w-full text-sm outline-none placeholder:text-gray-400"
                                placeholder="Search..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="overflow-y-auto p-1 custom-scrollbar flex-1">
                            {filtered.length > 0 ? filtered.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleSelectDirect(opt)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-turquoise/10 hover:text-turquoise transition-colors flex items-center justify-between ${value === opt ? 'bg-turquoise/5 text-turquoise font-bold' : 'text-gray-600'}`}
                                >
                                    {opt}
                                    {value === opt && <Check size={14} />}
                                </button>
                            )) : (
                                <div className="p-3 text-xs text-gray-400 text-center">No results</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
