import React from 'react';
import { motion } from 'framer-motion';

export default function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="h-screen w-screen bg-surface-900 flex flex-col items-center justify-center gap-4">
      <div className="fixed inset-0 canvas-grid opacity-20" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-10 h-10 rounded-full border-2 border-white/10 border-t-brand-500"
      />
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  );
}
