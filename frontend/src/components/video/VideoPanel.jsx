import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, Phone, Monitor, MonitorOff, X, Minimize2 } from 'lucide-react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoPanel({ socket, roomId }) {
  const { toggleVideo, roomUsers } = useWhiteboardStore();
  const { user } = useAuthStore();

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId → stream
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const localVideoRef = useRef(null);
  const peersRef = useRef({}); // socketId → RTCPeerConnection
  const localStreamRef = useRef(null);

  // ── Start local media ─────────────────────────────────────────────────────
  useEffect(() => {
    let stream;
    const startMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        toast.error('Camera/microphone access denied');
        console.error('Media error:', err);
      }
    };
    startMedia();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      Object.values(peersRef.current).forEach((pc) => pc.close());
    };
  }, []);

  // ── Socket signaling ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // When another user's video comes in
    socket.on('webrtc:offer', async ({ offer, fromSocketId, fromUser }) => {
      const pc = createPeerConnection(fromSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { targetSocketId: fromSocketId, answer });
    });

    socket.on('webrtc:answer', async ({ answer, fromSocketId }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('webrtc:ice-candidate', async ({ candidate, fromSocketId }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('room:user-joined', ({ socketId }) => {
      // Initiate call to new user
      callUser(socketId);
    });

    socket.on('room:user-left', ({ socketId }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close();
        delete peersRef.current[socketId];
      }
      setRemoteStreams((prev) => { const { [socketId]: _, ...rest } = prev; return rest; });
    });

    return () => {
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
    };
  }, [socket, localStream]);

  const createPeerConnection = useCallback((socketId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[socketId] = pc;

    // Add local tracks
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('webrtc:ice-candidate', { targetSocketId: socketId, candidate: e.candidate });
      }
    };

    // Remote stream
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      setRemoteStreams((prev) => ({ ...prev, [socketId]: stream }));
    };

    return pc;
  }, [socket]);

  const callUser = useCallback(async (socketId) => {
    if (!localStreamRef.current) return;
    const pc = createPeerConnection(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket?.emit('webrtc:offer', { targetSocketId: socketId, offer });
  }, [createPeerConnection, socket]);

  const toggleMute = () => {
    const audioTracks = localStream?.getAudioTracks();
    audioTracks?.forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    const videoTracks = localStream?.getVideoTracks();
    videoTracks?.forEach((t) => { t.enabled = !t.enabled; });
    setIsVideoOff(!isVideoOff);
  };

  const toggleScreenShare = async () => {
    try {
      if (!isSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in all peer connections
        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        socket?.emit('webrtc:screen-share-start', { roomId });
        setIsSharing(true);

        screenTrack.onended = () => stopScreenShare();
      } else {
        stopScreenShare();
      }
    } catch (err) {
      toast.error('Screen share failed');
    }
  };

  const stopScreenShare = () => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      Object.values(peersRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        const videoTrack = localStream.getVideoTracks()[0];
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      });
    }
    socket?.emit('webrtc:screen-share-end', { roomId });
    setIsSharing(false);
  };

  const remoteEntries = Object.entries(remoteStreams);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed bottom-6 right-6 z-50 panel overflow-hidden transition-all duration-300 ${
        isMinimized ? 'w-64 h-14' : 'w-80'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-white/60 text-xs font-medium flex items-center gap-1.5">
          <Video className="w-3 h-3 text-brand-400" /> Video Call
          <span className="badge bg-brand-500/20 text-brand-400">{1 + remoteEntries.length}</span>
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="btn-icon w-6 h-6">
            <Minimize2 className="w-3 h-3" />
          </button>
          <button onClick={toggleVideo} className="btn-icon w-6 h-6 text-red-400/70 hover:text-red-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Video grid */}
          <div className="p-2 grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {/* Local video */}
            <div className="relative rounded-xl overflow-hidden bg-surface-900 aspect-video">
              <video ref={localVideoRef} autoPlay muted playsInline
                className="w-full h-full object-cover" />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-900">
                  <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <span className="text-brand-400 font-display font-bold">{user?.name?.[0]}</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-1 left-1 flex gap-1">
                {isMuted && <span className="w-4 h-4 rounded bg-red-500 flex items-center justify-center"><MicOff className="w-2.5 h-2.5 text-white" /></span>}
              </div>
              <span className="absolute bottom-1 right-1 text-[10px] text-white/60 bg-black/40 px-1 rounded">You</span>
            </div>

            {/* Remote videos */}
            {remoteEntries.map(([socketId, stream]) => {
              const remoteUser = roomUsers.find((u) => u.socketId === socketId);
              return (
                <RemoteVideo key={socketId} stream={stream} user={remoteUser} />
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 px-3 py-2 border-t border-white/10">
            <button onClick={toggleMute}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button onClick={toggleCamera}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
            <button onClick={toggleScreenShare}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isSharing ? 'bg-brand-500/20 text-brand-400' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
              {isSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </button>
            <button onClick={toggleVideo}
              className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-all">
              <Phone className="w-4 h-4 rotate-[135deg]" />
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

function RemoteVideo({ stream, user }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-surface-900 aspect-video">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <span className="absolute bottom-1 right-1 text-[10px] text-white/60 bg-black/40 px-1 rounded">
        {user?.name?.split(' ')[0] || 'Peer'}
      </span>
    </div>
  );
}
