import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Zap, Shield, Video, MessageSquare, Share2, ArrowRight, Github } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Feature = ({ icon: Icon, title, desc, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="glass rounded-2xl p-6 hover:border-white/20 transition-all duration-300 group"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
    <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
  </motion.div>
);

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-900 overflow-auto">
      {/* Grid background */}
      <div className="fixed inset-0 canvas-grid opacity-40 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-brand-900/20 via-transparent to-surface-900 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow">
            <span className="text-white font-display font-bold text-lg">N</span>
          </div>
          <span className="font-display font-bold text-xl text-white">NexBoard</span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
              <Link to="/register" className="btn-primary text-sm">Get Started Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-8 pt-20 pb-32 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 text-sm text-white/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Real-time collaboration, redefined
          </div>

          <h1 className="font-display text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Create together,<br />
            <span className="text-gradient">anywhere</span>
          </h1>

          <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            NexBoard is a real-time collaborative whiteboard with video calls, smart drawing tools,
            and seamless team synchronization — built for modern creative teams.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn-primary px-8 py-3 text-base shadow-glow">
              Start collaborating free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="btn-ghost px-8 py-3 text-base">
              Sign in
            </Link>
          </div>
        </motion.div>

        {/* App Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 relative"
        >
          <div className="glass rounded-3xl overflow-hidden shadow-glass border-white/10" style={{ minHeight: 400 }}>
            <div className="bg-surface-850 px-4 py-3 flex items-center gap-2 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-4 text-white/30 text-xs font-mono">nexboard.app/room/7F3A2B1C</span>
            </div>
            <div className="canvas-grid flex items-center justify-center" style={{ height: 340 }}>
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl font-display font-bold text-brand-400">N</span>
                </div>
                <p className="text-white/30 text-sm">Your collaborative canvas</p>
              </div>
            </div>
          </div>
          <div className="absolute -inset-1 rounded-3xl bg-brand-500/10 blur-xl -z-10" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-8 py-20 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-display text-4xl font-bold text-white mb-4">Everything your team needs</h2>
          <p className="text-white/50 text-lg">Powerful features for seamless real-time collaboration</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Feature icon={Zap} title="Real-time Sync" desc="Instant synchronization across all participants. See changes as they happen with sub-50ms latency via Socket.io." color="bg-brand-500/20 text-brand-400" />
          <Feature icon={Video} title="Video Calls" desc="Built-in WebRTC video conferencing. No external tools needed — collaborate face-to-face while drawing." color="bg-purple-500/20 text-purple-400" />
          <Feature icon={Users} title="Multi-user Rooms" desc="Create or join rooms by ID. Role-based access control with Host, Editor, and Viewer permissions." color="bg-teal-500/20 text-teal-400" />
          <Feature icon={MessageSquare} title="In-room Chat" desc="Contextual chat panel that persists with the whiteboard. Full message history saved to MongoDB Atlas." color="bg-pink-500/20 text-pink-400" />
          <Feature icon={Share2} title="Screen Sharing" desc="Share your screen directly inside the room. WebRTC-powered, works natively in the browser." color="bg-amber-500/20 text-amber-400" />
          <Feature icon={Shield} title="Secure by Design" desc="Google OAuth 2.0, JWT sessions, rate limiting, and MongoDB sanitization. Production-hardened security." color="bg-emerald-500/20 text-emerald-400" />
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-8 py-24 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="max-w-2xl mx-auto glass rounded-3xl p-12">
          <h2 className="font-display text-4xl font-bold text-white mb-4">Ready to collaborate?</h2>
          <p className="text-white/50 mb-8">Join thousands of teams creating together on NexBoard.</p>
          <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn-primary px-10 py-4 text-base shadow-glow mx-auto">
            Get started — it's free <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-white/20 text-sm border-t border-white/5">
        <p>© 2024 NexBoard. Built with ♥ using MERN Stack + Socket.io + WebRTC</p>
      </footer>
    </div>
  );
}
