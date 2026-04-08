import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, X, SmilePlus } from 'lucide-react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { useAuthStore } from '../../store/authStore';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👀'];

function ChatMessage({ msg, isOwn }) {
  if (msg.type === 'system') {
    return (
      <div className="text-center py-1">
        <span className="text-white/25 text-xs">{msg.message}</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {msg.userAvatar
          ? <img src={msg.userAvatar} alt={msg.userName} className="w-full h-full object-cover" />
          : <span className="text-xs font-bold text-brand-400">{msg.userName?.[0]}</span>
        }
      </div>
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOwn && <span className="text-white/30 text-xs mb-0.5 ml-1">{msg.userName}</span>}
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
          isOwn ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-white/10 text-white/90 rounded-tl-sm'
        }`}>
          {msg.message}
        </div>
        <span className="text-white/20 text-[10px] mt-0.5 mx-1">
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </span>
      </div>
    </div>
  );
}

export default function ChatPanel({ socket, roomId }) {
  const { messages, toggleChat, clearUnread } = useWhiteboardStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    clearUnread();
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, clearUnread]);

  useEffect(() => {
    if (!socket) return;
    socket.on('chat:typing', ({ name, isTyping }) => {
      setTypingUsers((prev) =>
        isTyping ? [...new Set([...prev, name])] : prev.filter((n) => n !== name)
      );
    });
    return () => socket.off('chat:typing');
  }, [socket]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    socket?.emit('chat:message', { roomId, message: input.trim() });
    setInput('');
    socket?.emit('chat:typing', { roomId, isTyping: false });
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    socket?.emit('chat:typing', { roomId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket?.emit('chat:typing', { roomId, isTyping: false });
    }, 1500);
  };

  const sendReaction = (emoji) => {
    socket?.emit('chat:message', { roomId, message: emoji });
    setShowEmoji(false);
  };

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="w-80 bg-surface-850/98 backdrop-blur-xl border-l border-white/10 flex flex-col h-full z-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="font-display font-semibold text-white text-sm">Room Chat</h3>
        <button onClick={toggleChat} className="btn-icon w-7 h-7">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/20 text-sm">No messages yet</p>
            <p className="text-white/15 text-xs mt-1">Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <ChatMessage key={i} msg={msg} isOwn={msg.user === user?._id || msg.userName === user?.name} />
          ))
        )}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 pl-9">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-white/30 text-xs">{typingUsers.join(', ')} typing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="relative">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <div className="relative flex-1">
              <input
                value={input}
                onChange={handleTyping}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
                placeholder="Type a message..."
                className="w-full bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none"
                maxLength={2000}
              />
            </div>
            <button onClick={() => setShowEmoji(!showEmoji)} className="text-white/30 hover:text-white/70 transition-colors">
              <SmilePlus className="w-4 h-4" />
            </button>
            <button onClick={handleSend} disabled={!input.trim()}
              className="w-7 h-7 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-30 flex items-center justify-center transition-all">
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* Emoji quick reactions */}
          {showEmoji && (
            <div className="absolute bottom-full mb-2 right-0 flex gap-1 bg-surface-800 border border-white/10 rounded-xl p-2">
              {QUICK_REACTIONS.map((emoji) => (
                <button key={emoji} onClick={() => sendReaction(emoji)}
                  className="w-8 h-8 text-lg hover:bg-white/10 rounded-lg flex items-center justify-center transition-all hover:scale-125">
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
