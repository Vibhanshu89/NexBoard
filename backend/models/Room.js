const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['host', 'editor', 'viewer'], default: 'editor' },
  joinedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  cursorColor: { type: String, default: '#6366f1' },
});

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      unique: true,
      default: () => uuidv4().slice(0, 8).toUpperCase(),
    },
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: [100, 'Room name cannot exceed 100 characters'],
    },
    description: { type: String, maxlength: 500 },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [participantSchema],
    isPrivate: { type: Boolean, default: false },
    password: { type: String, select: false },
    maxParticipants: { type: Number, default: 50, max: 100 },
    isActive: { type: Boolean, default: true },
    thumbnail: { type: String, default: '' },
    settings: {
      allowAnonymous: { type: Boolean, default: false },
      lockCanvas: { type: Boolean, default: false },
      allowChat: { type: Boolean, default: true },
      allowVideo: { type: Boolean, default: true },
    },
    lastActivity: { type: Date, default: Date.now },
    tags: [{ type: String, trim: true, maxlength: 30 }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// roomId already has unique:true above — no duplicate index needed
roomSchema.index({ host: 1 });
roomSchema.index({ isActive: 1, isPrivate: 1 });

roomSchema.virtual('activeParticipantCount').get(function () {
  return this.participants.filter((p) => p.isActive).length;
});

module.exports = mongoose.model('Room', roomSchema);
