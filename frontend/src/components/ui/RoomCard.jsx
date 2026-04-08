import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Clock, Lock, ArrowRight, Trash2, MoreVertical } from 'lucide-react';
import { roomAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const CANVAS_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function RoomCard({ room, onRefresh }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isHost = room.host?._id === user?._id || room.host === user?._id;
  const color = CANVAS_COLORS[room.name?.charCodeAt(0) % CANVAS_COLORS.length];
  const activeCount = room.participants?.filter(p => p.isActive).length || 0;

  const handleJoin = async () => {
    setLoading(true);
    try {
      await roomAPI.join(room.roomId);
      navigate(`/room/${room.roomId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this room?')) return;
    try {
      await roomAPI.delete(room.roomId);
      toast.success('Room deleted');
      onRefresh?.();
    } catch { toast.error('Failed to delete'); }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.005 }}
      className="panel p-5 cursor-pointer hover:border-white/15 transition-all duration-200 group relative"
      onClick={handleJoin}
    >
      {/* Color accent */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: color }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-bold text-lg"
          style={{ background: `${color}25`, color }}>
          {room.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex items-center gap-1">
          {room.isPrivate && <Lock className="w-3.5 h-3.5 text-white/30" />}
          {isHost && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 bg-surface-800 border border-white/10 rounded-xl overflow-hidden z-10 shadow-glass min-w-32">
                  <button onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 text-sm transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Name & desc */}
      <h3 className="font-display font-semibold text-white text-sm mb-1 truncate">{room.name}</h3>
      {room.description && (
        <p className="text-white/35 text-xs line-clamp-2 mb-3">{room.description}</p>
      )}

      {/* Tags */}
      {room.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {room.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="badge bg-white/5 text-white/40 text-[10px]">{tag}</span>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-white/30 text-xs mt-auto">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" /> {room.participants?.length || 0}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {timeAgo(room.lastActivity || room.updatedAt)}
        </span>
        <div className="flex items-center gap-1 text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {loading
            ? <span className="w-3 h-3 border border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
            : <><span className="text-xs">Open</span><ArrowRight className="w-3 h-3" /></>
          }
        </div>
      </div>
    </motion.div>
  );
}
