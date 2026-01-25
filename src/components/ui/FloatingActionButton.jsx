
import { Plus } from 'lucide-react'

export default function FloatingActionButton({ onClick }) {
    // Mobile Vision: Sunflower Yellow (#FFB800)
    // Position: Absolute relative to the app container
    return (
        <button
            onClick={onClick}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-black hover:scale-110 transition-transform z-40 active:scale-95"
            style={{ backgroundColor: '#FFB800' }}
        >
            <Plus size={32} strokeWidth={3} />
        </button>
    )
}
