
import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Send, Reply, X } from 'lucide-react'

// Common emoji reactions
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏']

export default function ChatRoom() {
    const { townId } = useParams()
    const navigate = useNavigate()
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)
    const initRef = useRef(false) // Prevent double-calling

    const [currentUser, setCurrentUser] = useState(null)
    const [town, setTown] = useState(null)
    const [chat, setChat] = useState(null)
    const [messages, setMessages] = useState([])
    const [reactions, setReactions] = useState({})
    const [newMessage, setNewMessage] = useState('')
    const [replyingTo, setReplyingTo] = useState(null)
    const [showEmojiPicker, setShowEmojiPicker] = useState(null)
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState({})

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // Get current user from Supabase Auth
    useEffect(() => {
        async function getUser() {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error) console.error('Auth error:', error)
            if (user) setCurrentUser(user)
        }
        getUser()
    }, [])

    // Fetch town info
    useEffect(() => {
        async function fetchTown() {
            const { data, error } = await supabase
                .from('towns')
                .select('id, name')
                .eq('id', townId)
                .single()

            if (error) console.error('Error fetching town:', error)
            if (data) setTown(data)
        }
        if (townId) fetchTown()
    }, [townId])

    // Initialize chat with race condition prevention
    useEffect(() => {
        async function initializeChat() {
            // Prevent double-calling using ref
            if (initRef.current) return
            if (!townId || !currentUser || !town) return

            initRef.current = true
            console.log('Initializing chat for town:', townId)

            try {
                // Use UPSERT to handle race conditions
                // If chat exists, returns existing; if not, creates new
                const { data: chatData, error } = await supabase
                    .from('chats')
                    .upsert(
                        {
                            town_id: parseInt(townId),
                            type: 'town',
                            name: `${town.name} Chat`
                        },
                        { onConflict: 'town_id,type' }
                    )
                    .select()
                    .single()

                if (error) {
                    // Handle PGRST116 (multiple rows returned) - shouldn't happen with unique constraint
                    if (error.code === 'PGRST116') {
                        console.warn('Multiple chats found, fetching first one')
                        const { data: fallback } = await supabase
                            .from('chats')
                            .select('*')
                            .eq('town_id', townId)
                            .eq('type', 'town')
                            .limit(1)

                        if (fallback && fallback[0]) {
                            setChat(fallback[0])
                        }
                    } else {
                        console.error('Chat init error:', error)
                    }
                    return
                }

                if (chatData) {
                    console.log('Chat ready:', chatData.id)
                    setChat(chatData)
                }
            } catch (err) {
                console.error('Init catch:', err)
            }
        }

        initializeChat()
    }, [townId, currentUser, town])

    // Fetch messages when chat is ready
    useEffect(() => {
        if (!chat?.id) return

        async function fetchMessages() {
            try {
                console.log('Fetching messages for chat:', chat.id)
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('chat_id', chat.id)
                    .order('created_at', { ascending: true })

                if (error) {
                    console.error('Error fetching messages:', error)
                    return
                }

                if (data) {
                    setMessages(data)
                    const userIds = [...new Set(data.map(m => m.sender_id).filter(Boolean))]
                    if (userIds.length > 0) fetchUserInfo(userIds)
                }
            } catch (err) {
                console.error('Messages fetch catch:', err)
            } finally {
                setLoading(false) // Guaranteed to run last
            }
        }

        fetchMessages()

        // Real-time subscription for new messages
        const messagesChannel = supabase
            .channel(`messages-${chat.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chat.id}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new])
                if (payload.new.sender_id) fetchUserInfo([payload.new.sender_id])
                setTimeout(scrollToBottom, 100)
            })
            .subscribe()

        // Real-time subscription for reactions
        const reactionsChannel = supabase
            .channel(`reactions-${chat.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'message_reactions'
            }, () => {
                fetchReactionsForMessages()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(messagesChannel)
            supabase.removeChannel(reactionsChannel)
        }
    }, [chat?.id])

    async function fetchReactionsForMessages() {
        if (messages.length === 0) return

        const messageIds = messages.map(m => m.id)
        const { data, error } = await supabase
            .from('message_reactions')
            .select('*')
            .in('message_id', messageIds)

        if (error) {
            console.error('Error fetching reactions:', error)
            return
        }

        if (data) {
            const grouped = {}
            data.forEach(r => {
                if (!grouped[r.message_id]) grouped[r.message_id] = []
                grouped[r.message_id].push(r)
            })
            setReactions(grouped)
        }
    }

    useEffect(() => {
        fetchReactionsForMessages()
    }, [messages])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    async function fetchUserInfo(userIds) {
        const newIds = userIds.filter(id => id && !users[id])
        if (newIds.length === 0) return

        console.log('Fetching user info for:', newIds)

        const { data, error } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', newIds)

        if (error) {
            console.error('Error fetching users:', error)
            // Even on error, mark these users as attempted so we don't keep retrying
            const fallbackUsers = {}
            newIds.forEach(id => {
                fallbackUsers[id] = { id, name: null, email: null }
            })
            setUsers(prev => ({ ...prev, ...fallbackUsers }))
            return
        }

        console.log('User data received:', data)

        // Create a map of found users
        const foundUsers = {}
        if (data) {
            data.forEach(u => {
                foundUsers[u.id] = u
            })
        }

        // For any IDs not found in users table, create placeholder entries
        newIds.forEach(id => {
            if (!foundUsers[id]) {
                foundUsers[id] = { id, name: null, email: null }
            }
        })

        setUsers(prev => ({ ...prev, ...foundUsers }))
    }

    // Send message handler
    const handleSendMessage = async (e) => {
        e.preventDefault()

        if (!newMessage.trim() || !chat?.id || !currentUser?.id) return

        const messageData = {
            chat_id: chat.id,
            sender_id: currentUser.id,
            text: newMessage.trim(),
            reply_to_message_id: replyingTo?.id || null
        }

        console.log('Sending:', messageData)

        try {
            const { error } = await supabase.from('messages').insert(messageData)

            if (error) {
                console.error('Send error:', error)
                alert('Failed to send: ' + error.message)
                return
            }

            setNewMessage('')
            setReplyingTo(null)
        } catch (err) {
            console.error('Send catch:', err)
        }
    }

    const handleReaction = async (messageId, emoji) => {
        if (!currentUser) return

        const existingReaction = reactions[messageId]?.find(
            r => r.user_id === currentUser.id && r.emoji === emoji
        )

        try {
            if (existingReaction) {
                await supabase.from('message_reactions').delete().eq('id', existingReaction.id)
            } else {
                await supabase.from('message_reactions').insert({
                    message_id: messageId,
                    user_id: currentUser.id,
                    emoji
                })
            }
        } catch (err) {
            console.error('Reaction error:', err)
        }

        setShowEmojiPicker(null)
    }

    const getDisplayName = (userId) => {
        const u = users[userId]
        // If user not found yet, show truncated ID
        if (!u) return `Traveler`
        // Return name if available, otherwise email prefix, otherwise Traveler
        if (u.name && u.name.trim()) return u.name.trim()
        if (u.email) return u.email.split('@')[0]
        return 'Traveler'
    }

    const getRepliedMessage = (replyToId) => messages.find(m => m.id === replyToId)

    const getGroupedReactions = (messageId) => {
        const msgReactions = reactions[messageId] || []
        const grouped = {}
        msgReactions.forEach(r => {
            if (!grouped[r.emoji]) grouped[r.emoji] = []
            grouped[r.emoji].push(r.user_id)
        })
        return grouped
    }

    // Auth guard
    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[#F5F5F0]">
                <p className="text-gray-500 mb-4">You need to be logged in to access the chat.</p>
                <Link to="/auth" className="text-turquoise font-bold">Log In</Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-[#F5F5F0]">
            {/* Header - No message counter */}
            <div className="bg-white shadow-sm px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => navigate(`/town/${townId}`)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="font-bold text-lg">{town?.name || 'Town'} Chat</h1>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loading ? (
                    <div className="text-center text-gray-400 py-10">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">
                        <p className="mb-2">No messages yet!</p>
                        <p className="text-sm">Be the first to say something 👋</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUser.id
                        const repliedMsg = msg.reply_to_message_id ? getRepliedMessage(msg.reply_to_message_id) : null
                        const groupedReactions = getGroupedReactions(msg.id)

                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                {!isMe && (
                                    <span className="text-xs text-gray-400 mb-1 px-2">
                                        {getDisplayName(msg.sender_id)}
                                    </span>
                                )}

                                <div
                                    className={`relative max-w-[80%] rounded-2xl px-4 py-2 shadow-sm cursor-pointer ${isMe ? 'bg-turquoise text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md'
                                        }`}
                                    onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                >
                                    {repliedMsg && (
                                        <div className={`text-xs mb-2 p-2 rounded-lg border-l-2 ${isMe ? 'bg-white/20 border-white/50' : 'bg-gray-100 border-gray-300'
                                            }`}>
                                            <span className="font-bold">{getDisplayName(repliedMsg.sender_id)}</span>
                                            <p className="truncate opacity-80">{repliedMsg.text}</p>
                                        </div>
                                    )}

                                    <p className="break-words">{msg.text}</p>

                                    <span className={`text-[10px] block mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setReplyingTo(msg)
                                            inputRef.current?.focus()
                                        }}
                                        className={`absolute -bottom-2 ${isMe ? 'left-0' : 'right-0'} p-1 bg-white rounded-full shadow-md hover:scale-110 transition-transform`}
                                    >
                                        <Reply size={14} className="text-gray-500" />
                                    </button>
                                </div>

                                {Object.keys(groupedReactions).length > 0 && (
                                    <div className={`flex gap-1 mt-1 ${isMe ? 'mr-2' : 'ml-2'}`}>
                                        {Object.entries(groupedReactions).map(([emoji, userIds]) => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleReaction(msg.id, emoji)}
                                                className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${userIds.includes(currentUser.id) ? 'bg-turquoise/20 border border-turquoise' : 'bg-gray-100'
                                                    }`}
                                            >
                                                <span>{emoji}</span>
                                                <span className="text-gray-500">{userIds.length}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {showEmojiPicker === msg.id && (
                                    <div className={`flex gap-1 mt-2 p-2 bg-white rounded-xl shadow-lg ${isMe ? 'mr-2' : 'ml-2'}`}>
                                        {EMOJI_OPTIONS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleReaction(msg.id, emoji)}
                                                className="text-xl hover:scale-125 transition-transform p-1"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Reply preview bar */}
            {replyingTo && (
                <div className="bg-white border-t border-gray-100 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <Reply size={16} className="text-turquoise" />
                        <div>
                            <span className="font-bold text-turquoise">Replying to {getDisplayName(replyingTo.sender_id)}</span>
                            <p className="text-gray-500 text-xs truncate max-w-[200px]">{replyingTo.text}</p>
                        </div>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-100 rounded-full">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>
            )}

            {/* Message Input Form */}
            <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3">
                <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-turquoise/20"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() || !chat?.id}
                    className="w-10 h-10 bg-turquoise text-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    )
}
