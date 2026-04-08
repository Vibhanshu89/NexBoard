/**
 * Whiteboard Model
 * Stores canvas state, drawing elements, chat history
 */

const mongoose = require('mongoose');

const drawingElementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['pencil', 'line', 'rectangle', 'circle', 'ellipse', 'triangle', 'arrow', 'text', 'image', 'eraser'],
    required: true,
  },
  points: [{ x: Number, y: Number }],
  startX: Number,
  startY: Number,
  endX: Number,
  endY: Number,
  color: { type: String, default: '#ffffff' },
  fillColor: { type: String, default: 'transparent' },
  strokeWidth: { type: Number, default: 3 },
  opacity: { type: Number, default: 1, min: 0, max: 1 },
  fontSize: { type: Number, default: 16 },
  fontFamily: { type: String, default: 'Inter' },
  text: String,
  imageUrl: String,
  imageWidth: Number,
  imageHeight: Number,
  roughness: { type: Number, default: 0 },
  smoothing: { type: Number, default: 0.5 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userAvatar: String,
  message: { type: String, required: true, maxlength: 2000 },
  type: { type: String, enum: ['text', 'system', 'image'], default: 'text' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const whiteboardSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, unique: true },
    elements: { type: [drawingElementSchema], default: [] },
    background: { type: String, default: '#0f1117' },
    gridEnabled: { type: Boolean, default: false },
    canvasWidth: { type: Number, default: 3000 },
    canvasHeight: { type: Number, default: 2000 },
    undoStack: { type: [[drawingElementSchema]], default: [] },
    chatHistory: { type: [chatMessageSchema], default: [] },
    version: { type: Number, default: 0 }, // For optimistic concurrency
    lastSavedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

// ─── Methods ─────────────────────────────────────────────────────────────────
whiteboardSchema.methods.addElement = function (element) {
  this.elements.push(element);
  this.version += 1;
  this.lastSavedAt = new Date();
};

whiteboardSchema.methods.clearCanvas = function () {
  if (this.elements.length > 0) {
    this.undoStack.push([...this.elements]);
    if (this.undoStack.length > 30) this.undoStack.shift();
  }
  this.elements = [];
  this.version += 1;
};

module.exports = mongoose.model('Whiteboard', whiteboardSchema);
