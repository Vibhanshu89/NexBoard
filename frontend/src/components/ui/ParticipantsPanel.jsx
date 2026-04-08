import React from 'react';
import { motion } from 'framer-motion';
import { X, Crown, Edit3, Eye, MoreVertical } from 'lucide-react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { useAuthStore } from '../../store/authStore';
import { roomAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ROLE_ICONS = { host: Crown, editor: Edit3, viewer: Eye };
const ROLE_COLORS = { host: 'text-amber-400', editor: 'text-brand-400', viewer: 'text-white/40' };

function ParticipantRow({ participant, isCurrentHost, roomId, socket }) {
  const { user } = useAuthStore();
  const RoleIcon = ROLE_ICONS[participant.role] || Edit3;
  const isMe = participant._id === user?._id;

  const handleRoleChange = async (newRole) => {
    try {
      await roomAPI.updateRole(roomId, participant._id, newRole);
      toast.success(`${participant.name}'s role updated to ${newRole}`);
    } catch { toast.error('Failed to update role'); }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl group transition-colors">
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center overflow-hidden"
          style={{ borderColor: participant.cursorColor, borderWidth: 2 }}>
          {participant.avatar
            ? <img src={participant.avatar} alt={participant.name} className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-brand-400">{participant.name?.[0]}</span>
          }
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-850 ${
          participant.isOnline !== false ? 'bg-emerald-400' : 'bg-white/20'
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">
          {participant.name} {isMe && <span className="text-white/30 text-xs">(you)</span>}
        </p>
        <div className={`flex items-center gap-1 text-xs ${ROLE_COLORS[participant.role]}`}>
          <RoleIcon className="w-3 h-3" />
          <span className="capitalize">{participant.role}</span>
        </div>
      </div>

      {/* Cursor color dot */}
      <div className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ background: participant.cursorColor || '#6366f1' }} />

      {/* Role change (host only, not self) */}
      {isCurrentHost && !isMe && (
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <select
            defaultValue={participant.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-800 border border-white/10 rounded-lg text-white/60 text-xs px-1 py-0.5 cursor-pointer"
          >
            <option value="host">Host</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default function ParticipantsPanel({ room, userRole, socket, roomId }) {
  const { toggleParticipants, roomUsers } = useWhiteboardStore();
  const { user } = useAuthStore();
  const isHost = userRole === 'host';

  // Merge room participants with live socket users
  const allParticipants = room?.participants?.map((p) => {
    const liveUser = roomUsers.find((u) => u._id === (p.user?._id || p.user));
    return {
      _id: p.user?._id || p.user,
      name: p.user?.name || 'Unknown',
      avatar: p.user?.avatar,
      role: p.role,
      cursorColor: p.cursorColor,
      isOnline: !!liveUser,
    };
  }) || [];

  const online = allParticipants.filter((p) => p.isOnline);
  const offline = allParticipants.filter((p) => !p.isOnline);

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="w-72 bg-surface-850/98 backdrop-blur-xl border-l border-white/10 flex flex-col h-full z-20"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h3 className="font-display font-semibold text-white text-sm">Participants</h3>
          <p className="text-white/30 text-xs">{online.length} online · {allParticipants.length} total</p>
        </div>
        <button onClick={toggleParticipants} className="btn-icon w-7 h-7">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {online.length > 0 && (
          <>
            <p className="text-white/25 text-xs px-4 py-2 uppercase tracking-wider font-medium">Online</p>
            {online.map((p) => (
              <ParticipantRow key={p._id} participant={p} isCurrentHost={isHost} roomId={roomId} socket={socket} />
            ))}
          </>
        )}
        {offline.length > 0 && (
          <>
            <p className="text-white/25 text-xs px-4 py-2 uppercase tracking-wider font-medium mt-2">Offline</p>
            {offline.map((p) => (
              <ParticipantRow key={p._id} participant={p} isCurrentHost={isHost} roomId={roomId} socket={socket} />
            ))}
          </>
        )}
      </div>

      {/* Live cursors count */}
      {roomUsers.length > 0 && (
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-white/25 text-xs text-center">
            {roomUsers.length} active cursor{roomUsers.length !== 1 ? 's' : ''} visible
          </p>
        </div>
      )}
    </motion.div>
  );
}
