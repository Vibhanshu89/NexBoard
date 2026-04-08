import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useWhiteboardStore } from '../store/whiteboardStore';
import { roomAPI, whiteboardAPI } from '../services/api';
import { initSocket, getSocket, disconnectSocket } from '../services/socket';
import toast from 'react-hot-toast';

import CanvasBoard from '../components/canvas/CanvasBoard';
import Toolbar from '../components/toolbar/Toolbar';
import ChatPanel from '../components/chat/ChatPanel';
import ParticipantsPanel from '../components/ui/ParticipantsPanel';
import VideoPanel from '../components/video/VideoPanel';
import TopBar from '../components/ui/TopBar';
import CursorOverlay from '../components/canvas/CursorOverlay';
import PageLoader from '../components/ui/PageLoader';

export default function WhiteboardPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const {
    setElements, addElement, removeElement, updateElement, clearCanvas,
    addMessage, setRoomUsers, addRoomUser, removeRoomUser,
    updateCursor, removeCursor, setCanvasLocked, isChatOpen, isVideoOpen, isParticipantsOpen,
  } = useWhiteboardStore();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('editor');
  const socketRef = useRef(null);
  const autoSaveTimer = useRef(null);

  // ── Initialize room + socket ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Join room via API
        const roomRes = await roomAPI.join(roomId);
        if (!mounted) return;
        const roomData = roomRes.data.room;
        setRoom(roomData);

        // Determine user role
        const participant = roomData.participants?.find(
          (p) => p.user?._id === user?._id || p.user === user?._id
        );
        setUserRole(participant?.role || 'editor');

        // Get chat history
        const chatRes = await whiteboardAPI.getChatHistory(roomId);
        if (mounted && chatRes.data.chatHistory) {
          chatRes.data.chatHistory.forEach((msg) => addMessage(msg));
        }

        // Init socket
        const cursorColor = participant?.cursorColor || '#6366f1';
        const socket = initSocket(token);
        socketRef.current = socket;

        socket.emit('room:join', { roomId, cursorColor });

        // Socket event listeners
        socket.on('room:users', (users) => setRoomUsers(users));
        socket.on('room:user-joined', (u) => {
          addRoomUser(u);
          toast(`${u.name} joined`, { icon: '👋', duration: 2000 });
        });
        socket.on('room:user-left', ({ socketId, name }) => {
          removeRoomUser(socketId);
          removeCursor(socketId);
          toast(`${name} left`, { icon: '👋', duration: 2000 });
        });
        socket.on('whiteboard:init', ({ elements }) => {
          if (elements?.length) setElements(elements);
        });
        socket.on('draw:end', ({ element }) => {
          if (element) addElement(element);
        });
        socket.on('draw:undo', ({ elementId }) => removeElement(elementId));
        socket.on('draw:redo', ({ element }) => addElement(element));
        socket.on('draw:clear', () => clearCanvas());
        socket.on('draw:update-element', ({ element }) => updateElement(element.id, element));
        socket.on('cursor:move', (data) => updateCursor(data.socketId, data));
        socket.on('chat:message', (msg) => addMessage(msg));
        socket.on('chat:system', (msg) => addMessage({ ...msg, type: 'system', userName: 'System' }));
        socket.on('room:canvas-locked', ({ locked }) => setCanvasLocked(locked));
        socket.on('error', ({ message }) => toast.error(message));

      } catch (err) {
        if (mounted) {
          toast.error('Failed to join room');
          navigate('/dashboard');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      const socket = getSocket();
      if (socket) {
        socket.emit('room:leave', { roomId });
        socket.off('room:users');
        socket.off('room:user-joined');
        socket.off('room:user-left');
        socket.off('whiteboard:init');
        socket.off('draw:end');
        socket.off('draw:undo');
        socket.off('draw:redo');
        socket.off('draw:clear');
        socket.off('draw:update-element');
        socket.off('cursor:move');
        socket.off('chat:message');
        socket.off('chat:system');
        socket.off('room:canvas-locked');
      }
      clearTimeout(autoSaveTimer.current);

      // Reset store
      setElements([]);
      setRoomUsers([]);
    };
  }, [roomId, token]);

  // ── Auto-save every 30s ──────────────────────────────────────────────────
  const { elements, background, gridEnabled } = useWhiteboardStore.getState();
  useEffect(() => {
    autoSaveTimer.current = setInterval(async () => {
      const state = useWhiteboardStore.getState();
      try {
        await whiteboardAPI.save(roomId, {
          elements: state.elements,
          background: state.background,
          gridEnabled: state.gridEnabled,
        });
      } catch {}
    }, 30000);
    return () => clearInterval(autoSaveTimer.current);
  }, [roomId]);

  if (loading) return <PageLoader message="Joining room..." />;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-surface-900">
      {/* Top bar */}
      <TopBar room={room} userRole={userRole} roomId={roomId} socket={socketRef.current} />

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar */}
        <Toolbar socket={socketRef.current} roomId={roomId} userRole={userRole} />

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <CanvasBoard socket={socketRef.current} roomId={roomId} userRole={userRole} />
          <CursorOverlay />
        </div>

        {/* Right Panels */}
        <div className="flex">
          {isChatOpen && (
            <ChatPanel socket={socketRef.current} roomId={roomId} />
          )}
          {isParticipantsOpen && (
            <ParticipantsPanel room={room} userRole={userRole} socket={socketRef.current} roomId={roomId} />
          )}
        </div>
      </div>

      {/* Video panel (floating) */}
      {isVideoOpen && (
        <VideoPanel socket={socketRef.current} roomId={roomId} />
      )}
    </div>
  );
}
