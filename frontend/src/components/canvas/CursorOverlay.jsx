import React from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { useAuthStore } from '../../store/authStore';

export default function CursorOverlay() {
  const { cursors } = useWhiteboardStore();
  const { user } = useAuthStore();

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {Object.entries(cursors).map(([socketId, cursor]) => {
        if (cursor._id === user?._id) return null;
        return (
          <div
            key={socketId}
            className="absolute transition-transform duration-75"
            style={{ left: cursor.x, top: cursor.y, transform: 'translate(-2px, -2px)' }}
          >
            {/* SVG cursor */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3L9 17L11.5 11.5L17 9L3 3Z" fill={cursor.color || '#6366f1'} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            {/* Name label */}
            <span
              className="cursor-label text-xs px-2 py-0.5 rounded-full text-white font-medium ml-3 mt-1"
              style={{ background: cursor.color || '#6366f1', boxShadow: `0 0 8px ${cursor.color}60` }}
            >
              {cursor.name?.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
