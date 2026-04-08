import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Copy, Users, MessageSquare, Video, Settings,
  Save, Lock, Unlock, Share2, ChevronDown, Wifi, WifiOff,
} from 'lucide-react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { useAuthStore } from '../../store/authStore';
import { whiteboardAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function TopBar({ room, userRole, roomId, socket }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    toggleChat, toggleVideo, toggleParticipants, toggleSettings,
    isChatOpen, isVideoOpen, isParticipantsOpen,
    roomUsers, unreadMessages, isCanvasLocked, setCanvasLocked,
    zoom, elements,
  } = useWhiteboardStore();

  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(true);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success('Room ID copied!');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const state = useWhiteboardStore.getState();
      await whiteboardAPI.save(roomId, {
        elements: state.elements,
        background: state.background,
        gridEnabled: state.gridEnabled,
      });
      toast.success('Whiteboard saved!');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const toggleLock = () => {
    const newLocked = !isCanvasLocked;
    setCanvasLocked(newLocked);
    socket?.emit('room:lock-canvas', { roomId, locked: newLocked });
    toast(newLocked ? 'Canvas locked' : 'Canvas unlocked', { icon: newLocked ? '🔒' : '🔓' });
  };

  const shareRoom = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Room link copied!');
  };

  const isHost = userRole === 'host' || room?.host?._id === user?._id;

  return (
    <div className="h-12 bg-surface-850/98 backdrop-blur-xl border-b border-white/10 flex items-center px-3 gap-3 z-30 flex-shrink-0">
      {/* Back */}
      <button onClick={() => navigate('/dashboard')} className="btn-icon">
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Room info */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
        <span className="font-display font-semibold text-white text-sm truncate max-w-32">
          {room?.name || 'Loading...'}
        </span>
        <span className={`badge text-xs flex-shrink-0 ${
          userRole === 'host' ? 'bg-amber-500/20 text-amber-400'
          : userRole === 'editor' ? 'bg-brand-500/20 text-brand-400'
          : 'bg-white/10 text-white/50'
        }`}>
          {userRole}
        </span>
      </div>

      {/* Room ID */}
      <button
        onClick={copyRoomId}
        className="hidden md:flex items-center gap-1.5 glass px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all group"
        title="Click to copy Room ID"
      >
        <span className="font-mono text-xs text-white/50 group-hover:text-white/80 transition-colors tracking-widest">
          {roomId}
        </span>
        <Copy className="w-3 h-3 text-white/30 group-hover:text-white/60" />
      </button>

      {/* Zoom indicator */}
      <span className="text-white/30 text-xs font-mono hidden lg:block">
        {Math.round(zoom * 100)}%
      </span>

      {/* Elements count */}
      <span className="text-white/20 text-xs hidden lg:block">
        {elements.length} elements
      </span>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Save */}
        <button onClick={handleSave} disabled={saving} className="btn-ghost text-xs px-3 py-1.5 h-8">
          {saving
            ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
            : <><Save className="w-3.5 h-3.5" /> Save</>
          }
        </button>

        {/* Share */}
        <button onClick={shareRoom} className="btn-icon" title="Share Room">
          <Share2 className="w-4 h-4" />
        </button>

        {/* Lock (host only) */}
        {isHost && (
          <button onClick={toggleLock} className={`btn-icon ${isCanvasLocked ? 'text-amber-400' : ''}`} title={isCanvasLocked ? 'Unlock Canvas' : 'Lock Canvas'}>
            {isCanvasLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        )}

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Participants */}
        <button
          onClick={toggleParticipants}
          className={`btn-icon relative ${isParticipantsOpen ? 'text-brand-400 bg-brand-500/10' : ''}`}
          title="Participants"
        >
          <Users className="w-4 h-4" />
          {roomUsers.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] flex items-center justify-center font-bold">
              {roomUsers.length}
            </span>
          )}
        </button>

        {/* Chat */}
        <button
          onClick={toggleChat}
          className={`btn-icon relative ${isChatOpen ? 'text-brand-400 bg-brand-500/10' : ''}`}
          title="Chat"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadMessages > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] flex items-center justify-center font-bold">
              {unreadMessages}
            </span>
          )}
        </button>

        {/* Video */}
        <button
          onClick={toggleVideo}
          className={`btn-icon ${isVideoOpen ? 'text-brand-400 bg-brand-500/10' : ''}`}
          title="Video Call"
        >
          <Video className="w-4 h-4" />
        </button>

        {/* User avatar */}
        <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center overflow-hidden ml-1">
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            : <span className="text-xs font-bold text-brand-400">{user?.name?.[0]}</span>
          }
        </div>
      </div>
    </div>
  );
}
