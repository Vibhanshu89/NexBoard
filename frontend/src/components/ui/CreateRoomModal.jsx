import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Globe, Plus, Tag } from 'lucide-react';
import { roomAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function CreateRoomModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    isPrivate: false,
    maxParticipants: 20,
    tags: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Room name is required');
    setLoading(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await roomAPI.create({ ...form, tags });
      toast.success(`Room "${res.data.room.name}" created!`);
      onCreated(res.data.room);
    } catch (err) {
      toast.error(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative panel p-6 w-full max-w-md z-10"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold text-white">Create New Room</h2>
            <button onClick={onClose} className="btn-icon w-8 h-8">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Room Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Collaborative Board"
                className="input-field"
                maxLength={100}
                autoFocus
              />
            </div>

            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What's this room for?"
                className="input-field resize-none h-20"
                maxLength={500}
              />
            </div>

            <div>
              <label className="text-white/50 text-xs mb-1.5 block">
                <Tag className="w-3 h-3 inline mr-1" /> Tags (comma-separated)
              </label>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="design, brainstorm, team"
                className="input-field"
              />
            </div>

            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Max Participants</label>
              <input
                type="number"
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: parseInt(e.target.value) })}
                min={2} max={100}
                className="input-field"
              />
            </div>

            {/* Visibility */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isPrivate: false })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-sm ${
                  !form.isPrivate
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                <Globe className="w-4 h-4" /> Public
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, isPrivate: true })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-sm ${
                  form.isPrivate
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                <Lock className="w-4 h-4" /> Private
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Plus className="w-4 h-4" /> Create Room</>
                }
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
