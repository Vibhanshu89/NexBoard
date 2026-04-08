/**
 * Room Controller
 * CRUD operations for collaborative whiteboard rooms
 */

const Room = require('../models/Room');
const Whiteboard = require('../models/Whiteboard');
const User = require('../models/User');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// ─── Cursor Colors Pool ───────────────────────────────────────────────────────
const CURSOR_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#10b981', '#f97316', '#84cc16',
];

// ─── Create Room ──────────────────────────────────────────────────────────────
exports.createRoom = async (req, res, next) => {
  try {
    const { name, description, isPrivate, password, maxParticipants, tags, settings } = req.body;

    const room = await Room.create({
      name,
      description,
      isPrivate: isPrivate || false,
      password: isPrivate ? password : undefined,
      maxParticipants: maxParticipants || 50,
      host: req.user._id,
      tags: tags || [],
      settings: settings || {},
      participants: [{
        user: req.user._id,
        role: 'host',
        cursorColor: CURSOR_COLORS[0],
      }],
    });

    // Create associated whiteboard
    await Whiteboard.create({ room: room._id });

    // Add room to user's rooms
    await User.findByIdAndUpdate(req.user._id, { $push: { rooms: room._id } });

    const populated = await Room.findById(room._id)
      .populate('host', 'name avatar email')
      .populate('participants.user', 'name avatar email');

    res.status(201).json({ success: true, room: populated });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Public Rooms ─────────────────────────────────────────────────────
exports.getRooms = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, search, tags } = req.query;

    const query = { isActive: true, isPrivate: false };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (tags) query.tags = { $in: tags.split(',') };

    const rooms = await Room.find(query)
      .populate('host', 'name avatar')
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    const total = await Room.countDocuments(query);

    res.json({
      success: true,
      rooms,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Room by ID ───────────────────────────────────────────────────────────
exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('host', 'name avatar email')
      .populate('participants.user', 'name avatar email isOnline')
      .select('-password');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

// ─── Join Room ────────────────────────────────────────────────────────────────
exports.joinRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;

    const room = await Room.findOne({ roomId }).select('+password');
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (!room.isActive) return res.status(403).json({ success: false, message: 'Room is closed' });

    if (room.participants.length >= room.maxParticipants) {
      return res.status(403).json({ success: false, message: 'Room is full' });
    }

    // Check if already a participant
    const existing = room.participants.find(
      (p) => p.user.toString() === req.user._id.toString()
    );

    if (!existing) {
      const colorIndex = room.participants.length % CURSOR_COLORS.length;
      room.participants.push({
        user: req.user._id,
        role: 'editor',
        cursorColor: CURSOR_COLORS[colorIndex],
      });
      await room.save();

      // Add room to user
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { rooms: room._id },
      });
    }

    const populated = await Room.findById(room._id)
      .populate('host', 'name avatar email')
      .populate('participants.user', 'name avatar email isOnline')
      .select('-password');

    res.json({ success: true, room: populated });
  } catch (err) {
    next(err);
  }
};

// ─── Get User's Rooms ─────────────────────────────────────────────────────────
exports.getMyRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id },
      ],
      isActive: true,
    })
      .populate('host', 'name avatar')
      .sort({ lastActivity: -1 })
      .select('-password');

    res.json({ success: true, rooms });
  } catch (err) {
    next(err);
  }
};

// ─── Update Room ──────────────────────────────────────────────────────────────
exports.updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only host can update room' });
    }

    const updatable = ['name', 'description', 'isPrivate', 'maxParticipants', 'tags', 'settings', 'thumbnail'];
    updatable.forEach((field) => {
      if (req.body[field] !== undefined) room[field] = req.body[field];
    });

    await room.save();
    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Room ──────────────────────────────────────────────────────────────
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only host can delete room' });
    }

    room.isActive = false;
    await room.save();

    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Update Participant Role ───────────────────────────────────────────────────
exports.updateParticipantRole = async (req, res, next) => {
  try {
    const { roomId, userId } = req.params;
    const { role } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only host can change roles' });
    }

    const participant = room.participants.find((p) => p.user.toString() === userId);
    if (!participant) return res.status(404).json({ success: false, message: 'Participant not found' });

    participant.role = role;
    await room.save();

    res.json({ success: true, message: 'Role updated' });
  } catch (err) {
    next(err);
  }
};
