/**
 * Socket.io Server
 * Real-time event architecture for NexBoard
 *
 * EVENT FLOW:
 * Client → Server → Broadcast to room
 *
 * Drawing Events:
 *   draw:start     → broadcast pointer down + tool state
 *   draw:move      → broadcast smooth bezier points
 *   draw:end       → broadcast final element, persist
 *   draw:undo      → remove last element by userId
 *   draw:redo      → reapply element
 *   draw:clear     → clear room canvas
 *   draw:update    → update specific element (text, resize)
 *
 * Cursor Events:
 *   cursor:move    → broadcast {x, y, userId, color, name}
 *
 * Chat Events:
 *   chat:message   → broadcast + persist to MongoDB
 *
 * Room Events:
 *   room:join      → join socket room, broadcast presence
 *   room:leave     → leave socket room, broadcast presence
 *   room:lock      → host locks canvas
 *
 * WebRTC Signaling:
 *   webrtc:offer       → relay SDP offer to peer
 *   webrtc:answer      → relay SDP answer to peer
 *   webrtc:ice-candidate → relay ICE candidate
 *   webrtc:screen-share → notify room of screen share
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Whiteboard = require('../models/Whiteboard');
const Room = require('../models/Room');
const logger = require('../utils/logger');

// In-memory room state: roomId → { users: Map<socketId, userInfo> }
const roomState = new Map();

const getUserInfo = (user) => ({
  _id: user._id.toString(),
  name: user.name,
  avatar: user.avatar,
  email: user.email,
});

const initializeSocket = (server) => {
  const { Server } = require('socket.io');

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 5e6, // 5MB for image data
  });

  // ─── Auth Middleware ────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = getUserInfo(user);
      socket.userId = user._id.toString();

      // Update user online status
      await User.findByIdAndUpdate(user._id, { isOnline: true, socketId: socket.id });

      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} | User: ${socket.user.name}`);

    // ── Room: Join ─────────────────────────────────────────────────────────────
    socket.on('room:join', async ({ roomId, cursorColor }) => {
      try {
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.cursorColor = cursorColor || '#6366f1';

        if (!roomState.has(roomId)) roomState.set(roomId, { users: new Map() });

        const roomUsers = roomState.get(roomId).users;
        roomUsers.set(socket.id, {
          ...socket.user,
          socketId: socket.id,
          cursorColor: socket.cursorColor,
          cursor: { x: 0, y: 0 },
          isDrawing: false,
        });

        // Send current users list to new joiner
        socket.emit('room:users', Array.from(roomUsers.values()));

        // Notify others
        socket.to(roomId).emit('room:user-joined', {
          ...socket.user,
          socketId: socket.id,
          cursorColor: socket.cursorColor,
        });

        // Send system chat message
        io.to(roomId).emit('chat:system', {
          message: `${socket.user.name} joined the room`,
          timestamp: new Date().toISOString(),
        });

        // Update room last activity
        await Room.findOneAndUpdate({ roomId }, { lastActivity: new Date() });

        // Send whiteboard state to new joiner
        const room = await Room.findOne({ roomId });
        if (room) {
          const wb = await Whiteboard.findOne({ room: room._id });
          if (wb) socket.emit('whiteboard:init', { elements: wb.elements, background: wb.background });
        }

        logger.info(`User ${socket.user.name} joined room ${roomId}`);
      } catch (err) {
        logger.error('room:join error:', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ── Room: Leave ────────────────────────────────────────────────────────────
    socket.on('room:leave', ({ roomId }) => {
      handleLeaveRoom(socket, io, roomId);
    });

    // ── Drawing: Smooth Pencil (batched points) ────────────────────────────────
    socket.on('draw:start', (data) => {
      socket.to(socket.currentRoom).emit('draw:start', {
        ...data,
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on('draw:move', (data) => {
      // Relay smoothed bezier points to all other clients in room
      socket.to(socket.currentRoom).emit('draw:move', {
        ...data,
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on('draw:end', async (data) => {
      try {
        const { roomId, element } = data;

        socket.to(roomId).emit('draw:end', {
          element,
          userId: socket.userId,
        });

        // Persist element to MongoDB
        if (element && roomId) {
          const room = await Room.findOne({ roomId });
          if (room) {
            await Whiteboard.findOneAndUpdate(
              { room: room._id },
              {
                $push: { elements: { ...element, author: socket.userId } },
                $inc: { version: 1 },
                $set: { lastSavedAt: new Date() },
              },
              { upsert: true }
            );
          }
        }
      } catch (err) {
        logger.error('draw:end error:', err);
      }
    });

    // ── Drawing: Undo ──────────────────────────────────────────────────────────
    socket.on('draw:undo', async ({ roomId, elementId }) => {
      try {
        socket.to(roomId).emit('draw:undo', { elementId, userId: socket.userId });

        const room = await Room.findOne({ roomId });
        if (room) {
          await Whiteboard.findOneAndUpdate(
            { room: room._id },
            { $pull: { elements: { id: elementId } }, $inc: { version: 1 } }
          );
        }
      } catch (err) {
        logger.error('draw:undo error:', err);
      }
    });

    // ── Drawing: Redo ──────────────────────────────────────────────────────────
    socket.on('draw:redo', async ({ roomId, element }) => {
      try {
        socket.to(roomId).emit('draw:redo', { element });

        const room = await Room.findOne({ roomId });
        if (room) {
          await Whiteboard.findOneAndUpdate(
            { room: room._id },
            { $push: { elements: element }, $inc: { version: 1 } },
            { upsert: true }
          );
        }
      } catch (err) {
        logger.error('draw:redo error:', err);
      }
    });

    // ── Drawing: Clear ─────────────────────────────────────────────────────────
    socket.on('draw:clear', async ({ roomId }) => {
      try {
        io.to(roomId).emit('draw:clear');

        const room = await Room.findOne({ roomId });
        if (room) {
          const wb = await Whiteboard.findOne({ room: room._id });
          if (wb) { wb.clearCanvas(); await wb.save(); }
        }
      } catch (err) {
        logger.error('draw:clear error:', err);
      }
    });

    // ── Drawing: Update element (text edit, resize, etc.) ──────────────────────
    socket.on('draw:update-element', async ({ roomId, element }) => {
      try {
        socket.to(roomId).emit('draw:update-element', { element });

        const room = await Room.findOne({ roomId });
        if (room) {
          await Whiteboard.findOneAndUpdate(
            { room: room._id, 'elements.id': element.id },
            { $set: { 'elements.$': element } }
          );
        }
      } catch (err) {
        logger.error('draw:update-element error:', err);
      }
    });

    // ── Cursor Tracking ────────────────────────────────────────────────────────
    socket.on('cursor:move', ({ x, y, roomId }) => {
      if (!roomId) return;
      const roomUsers = roomState.get(roomId)?.users;
      if (roomUsers?.has(socket.id)) {
        roomUsers.get(socket.id).cursor = { x, y };
      }
      socket.to(roomId).emit('cursor:move', {
        x, y,
        userId: socket.userId,
        socketId: socket.id,
        name: socket.user.name,
        avatar: socket.user.avatar,
        color: socket.cursorColor,
      });
    });

    // ── Chat ───────────────────────────────────────────────────────────────────
    socket.on('chat:message', async ({ roomId, message, type = 'text' }) => {
      try {
        if (!message?.trim()) return;

        const msgData = {
          user: socket.userId,
          userName: socket.user.name,
          userAvatar: socket.user.avatar,
          message: message.trim().substring(0, 2000),
          type,
          timestamp: new Date().toISOString(),
        };

        io.to(roomId).emit('chat:message', msgData);

        // Persist to MongoDB
        const room = await Room.findOne({ roomId });
        if (room) {
          await Whiteboard.findOneAndUpdate(
            { room: room._id },
            {
              $push: {
                chatHistory: {
                  $each: [msgData],
                  $slice: -500,
                },
              },
            },
            { upsert: true }
          );
        }
      } catch (err) {
        logger.error('chat:message error:', err);
      }
    });

    // ── Chat: Typing ───────────────────────────────────────────────────────────
    socket.on('chat:typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('chat:typing', {
        userId: socket.userId,
        name: socket.user.name,
        isTyping,
      });
    });

    // ── Canvas Lock ────────────────────────────────────────────────────────────
    socket.on('room:lock-canvas', ({ roomId, locked }) => {
      io.to(roomId).emit('room:canvas-locked', { locked, by: socket.user.name });
    });

    // ── WebRTC Signaling ───────────────────────────────────────────────────────
    socket.on('webrtc:offer', ({ targetSocketId, offer, fromUser }) => {
      io.to(targetSocketId).emit('webrtc:offer', {
        offer,
        fromSocketId: socket.id,
        fromUser: socket.user,
      });
    });

    socket.on('webrtc:answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc:answer', {
        answer,
        fromSocketId: socket.id,
      });
    });

    socket.on('webrtc:ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc:ice-candidate', {
        candidate,
        fromSocketId: socket.id,
      });
    });

    socket.on('webrtc:screen-share-start', ({ roomId }) => {
      socket.to(roomId).emit('webrtc:screen-share-start', {
        userId: socket.userId,
        socketId: socket.id,
        name: socket.user.name,
      });
    });

    socket.on('webrtc:screen-share-end', ({ roomId }) => {
      socket.to(roomId).emit('webrtc:screen-share-end', {
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on('webrtc:call-user', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('webrtc:incoming-call', {
        fromSocketId: socket.id,
        fromUser: socket.user,
        offer,
      });
    });

    socket.on('webrtc:call-accepted', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc:call-accepted', {
        fromSocketId: socket.id,
        answer,
      });
    });

    socket.on('webrtc:call-rejected', ({ targetSocketId }) => {
      io.to(targetSocketId).emit('webrtc:call-rejected', { fromSocketId: socket.id });
    });

    socket.on('webrtc:call-ended', ({ roomId }) => {
      socket.to(roomId).emit('webrtc:call-ended', { fromSocketId: socket.id });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id} | User: ${socket.user?.name}`);

      if (socket.currentRoom) handleLeaveRoom(socket, io, socket.currentRoom);

      try {
        await User.findByIdAndUpdate(socket.userId, { isOnline: false, socketId: null });
      } catch (err) {
        logger.error('Disconnect cleanup error:', err);
      }
    });
  });

  return io;
};

// ─── Helper: Leave Room ────────────────────────────────────────────────────────
function handleLeaveRoom(socket, io, roomId) {
  socket.leave(roomId);

  const roomUsers = roomState.get(roomId)?.users;
  if (roomUsers) {
    roomUsers.delete(socket.id);
    if (roomUsers.size === 0) roomState.delete(roomId);
  }

  socket.to(roomId).emit('room:user-left', {
    userId: socket.userId,
    socketId: socket.id,
    name: socket.user?.name,
  });

  io.to(roomId).emit('chat:system', {
    message: `${socket.user?.name} left the room`,
    timestamp: new Date().toISOString(),
  });

  socket.currentRoom = null;
}

module.exports = { initializeSocket };
