import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Filter } from 'lucide-react';
import { roomAPI } from '../services/api';
import AppLayout from '../components/ui/AppLayout';
import RoomCard from '../components/ui/RoomCard';
import CreateRoomModal from '../components/ui/CreateRoomModal';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function RoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchRooms = async (p = 1, q = '') => {
    setLoading(true);
    try {
      const res = await roomAPI.getAll({ page: p, limit: 12, search: q });
      setRooms(res.data.rooms);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchRooms(1, search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 overflow-y-auto h-full">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Explore Rooms</h1>
            <p className="text-white/40 mt-1">Discover and join public collaborative spaces</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Create Room
          </button>
        </motion.div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms..."
            className="input-field pl-10"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="panel p-5 h-40 shimmer rounded-2xl" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-lg">No public rooms found</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-6 mx-auto">
              <Plus className="w-4 h-4" /> Create the first one
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <RoomCard key={room._id} room={room} onRefresh={() => fetchRooms(page, search)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            {[...Array(pagination.pages)].map((_, i) => (
              <button
                key={i}
                onClick={() => { setPage(i + 1); fetchRooms(i + 1, search); }}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                  page === i + 1 ? 'bg-brand-500 text-white' : 'glass text-white/50 hover:text-white'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={(room) => { setShowCreate(false); navigate(`/room/${room.roomId}`); }}
        />
      )}
    </AppLayout>
  );
}
