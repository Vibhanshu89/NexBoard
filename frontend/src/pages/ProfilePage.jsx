import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Save, Camera, Moon, Sun, Palette } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import AppLayout from '../components/ui/AppLayout';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser, updatePreferences } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' });
  const [loading, setLoading] = useState(false);
  const theme = user?.preferences?.theme || 'dark';

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', form);
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    updatePreferences({ ...user?.preferences, theme: theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <AppLayout>
      <div className="p-6 overflow-y-auto h-full max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-white/40 mt-1">Manage your account and preferences</p>
        </motion.div>

        {/* Avatar */}
        <div className="panel p-6 flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-brand-500/20 border-2 border-brand-500/30 flex items-center justify-center overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : <span className="text-3xl font-display font-bold text-brand-400">{user?.name?.[0]}</span>
              }
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center hover:bg-brand-600 transition-colors">
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div>
            <p className="font-display font-semibold text-white text-lg">{user?.name}</p>
            <p className="text-white/40 text-sm">{user?.email}</p>
            <span className="badge bg-brand-500/20 text-brand-400 mt-1">
              {user?.authProvider === 'google' ? 'Google Account' : 'Email Account'}
            </span>
          </div>
        </div>

        {/* Edit Form */}
        <div className="panel p-6">
          <h2 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-400" /> Personal Info
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Full Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field" placeholder="Your name" />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Email</label>
              <input value={user?.email} disabled className="input-field opacity-50 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="input-field resize-none h-24" placeholder="Tell us about yourself..." maxLength={200} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </form>
        </div>

        {/* Preferences */}
        <div className="panel p-6">
          <h2 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
            <Palette className="w-4 h-4 text-brand-400" /> Preferences
          </h2>
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-white font-medium text-sm">Theme</p>
              <p className="text-white/40 text-xs">Toggle dark/light mode</p>
            </div>
            <button onClick={toggleTheme}
              className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${theme === 'dark' ? 'bg-brand-500' : 'bg-white/20'}`}>
              <span className={`w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center ${theme === 'light' ? 'translate-x-6' : ''}`}>
                {theme === 'dark' ? <Moon className="w-2.5 h-2.5 text-brand-500" /> : <Sun className="w-2.5 h-2.5 text-amber-500" />}
              </span>
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-white font-medium text-sm">Default Brush Color</p>
              <p className="text-white/40 text-xs">Starting color when you open a room</p>
            </div>
            <input type="color" value={user?.preferences?.defaultColor || '#6366f1'}
              onChange={(e) => updatePreferences({ ...user?.preferences, defaultColor: e.target.value })}
              className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent" />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
