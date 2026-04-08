import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, Clock, TrendingUp, ArrowRight, Hash } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { roomAPI } from '../services/api';
import AppLayout from '../components/ui/AppLayout';
import CreateRoomModal from '../components/ui/CreateRoomModal';
import RoomCard from '../components/ui/RoomCard';
import toast from 'react-hot-toast';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="panel p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-white/40 text-xs mb-0.5">{label}</p>
      <p className="font-display font-bold text-2xl text-white">{value}</p>
    </div>
  </div>
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [myRooms, setMyRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');

  const fetchRooms = async () => {
    try {
      const [myRes, pubRes] = await Promise.all([roomAPI.getMy(), roomAPI.getAll({ limit: 6 })]);
      setMyRooms(myRes.data.rooms);
      setPublicRooms(pubRes.data.rooms);
    } catch (err) {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleJoinById = async (e) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    try {
      await roomAPI.join(joinRoomId.trim().toUpperCase());
      navigate(`/room/${joinRoomId.trim().toUpperCase()}`);
    } catch (err) {
      toast.error(err.message || 'Room not found');
    }
  };

  const handleRoomCreated = (room) => {
    setShowCreate(false);
    navigate(`/room/${room.roomId}`);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-8 overflow-y-auto h-full">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
              <span className="text-gradient">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-white/40 mt-1">Ready to create something amazing?</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Room
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Hash} label="My Rooms" value={myRooms.length} color="bg-brand-500/20 text-brand-400" />
          <StatCard icon={Users} label="Collaborators" value={myRooms.reduce((a, r) => a + (r.participants?.length || 0), 0)} color="bg-purple-500/20 text-purple-400" />
          <StatCard icon={TrendingUp} label="Public Rooms" value={publicRooms.length} color="bg-teal-500/20 text-teal-400" />
          <StatCard icon={Clock} label="Active Today" value={myRooms.filter(r => {
            const d = new Date(r.lastActivity); const now = new Date();
            return d.toDateString() === now.toDateString();
          }).length} color="bg-amber-500/20 text-amber-400" />
        </div>

        {/* Quick Join */}
        <div className="panel p-5">
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-brand-400" /> Join by Room ID
          </h2>
          <form onSubmit={handleJoinById} className="flex gap-3">
            <input
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              placeholder="Enter 8-character Room ID (e.g. 7F3A2B1C)"
              className="input-field flex-1 font-mono tracking-widest uppercase"
              maxLength={8}
            />
            <button type="submit" className="btn-primary px-6">
              Join <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* My Rooms */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-white text-lg">My Rooms</h2>
            <button onClick={() => navigate('/rooms')} className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="panel p-5 h-36 shimmer rounded-2xl" />
              ))}
            </div>
          ) : myRooms.length === 0 ? (
            <div className="panel p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-brand-400" />
              </div>
              <p className="text-white/50 mb-4">No rooms yet. Create your first collaborative whiteboard!</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
                <Plus className="w-4 h-4" /> Create Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myRooms.slice(0, 6).map((room) => (
                <RoomCard key={room._id} room={room} onRefresh={fetchRooms} />
              ))}
            </div>
          )}
        </div>

        {/* Public Rooms */}
        {publicRooms.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-white text-lg">Explore Public Rooms</h2>
              <button onClick={() => navigate('/rooms')} className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
                Explore <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicRooms.slice(0, 3).map((room) => (
                <RoomCard key={room._id} room={room} onRefresh={fetchRooms} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={handleRoomCreated} />}
    </AppLayout>
  );
}
