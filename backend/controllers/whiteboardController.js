/**
 * Whiteboard Controller
 * Manages canvas state persistence and retrieval
 */

const Whiteboard = require('../models/Whiteboard');
const Room = require('../models/Room');

// ─── Get Whiteboard State ─────────────────────────────────────────────────────
exports.getWhiteboard = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    let whiteboard = await Whiteboard.findOne({ room: room._id });
    if (!whiteboard) {
      whiteboard = await Whiteboard.create({ room: room._id });
    }

    res.json({ success: true, whiteboard });
  } catch (err) {
    next(err);
  }
};

// ─── Save Whiteboard State ────────────────────────────────────────────────────
exports.saveWhiteboard = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { elements, background, gridEnabled } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const whiteboard = await Whiteboard.findOneAndUpdate(
      { room: room._id },
      {
        $set: {
          elements: elements || [],
          background,
          gridEnabled,
          lastSavedAt: new Date(),
        },
        $inc: { version: 1 },
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, whiteboard, savedAt: whiteboard.lastSavedAt });
  } catch (err) {
    next(err);
  }
};

// ─── Clear Whiteboard ─────────────────────────────────────────────────────────
exports.clearWhiteboard = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    // Only host can clear
    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only host can clear whiteboard' });
    }

    const whiteboard = await Whiteboard.findOne({ room: room._id });
    if (whiteboard) {
      whiteboard.clearCanvas();
      await whiteboard.save();
    }

    res.json({ success: true, message: 'Whiteboard cleared' });
  } catch (err) {
    next(err);
  }
};

// ─── Add Chat Message ─────────────────────────────────────────────────────────
exports.addChatMessage = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const whiteboard = await Whiteboard.findOneAndUpdate(
      { room: room._id },
      {
        $push: {
          chatHistory: {
            $each: [{
              user: req.user._id,
              userName: req.user.name,
              userAvatar: req.user.avatar,
              message,
              type: 'text',
              timestamp: new Date(),
            }],
            $slice: -500, // Keep last 500 messages
          },
        },
      },
      { new: true }
    );

    res.json({ success: true, chatHistory: whiteboard.chatHistory });
  } catch (err) {
    next(err);
  }
};

// ─── Get Chat History ─────────────────────────────────────────────────────────
exports.getChatHistory = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { limit = 100 } = req.query;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const whiteboard = await Whiteboard.findOne({ room: room._id })
      .select('chatHistory')
      .lean();

    if (!whiteboard) return res.json({ success: true, chatHistory: [] });

    const chatHistory = whiteboard.chatHistory.slice(-limit);
    res.json({ success: true, chatHistory });
  } catch (err) {
    next(err);
  }
};
