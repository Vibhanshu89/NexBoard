import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export const TOOLS = {
  SELECT: 'select',
  PENCIL: 'pencil',
  PEN: 'pen',
  ERASER: 'eraser',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  ELLIPSE: 'ellipse',
  TRIANGLE: 'triangle',
  ARROW: 'arrow',
  TEXT: 'text',
  IMAGE: 'image',
  LASER: 'laser',
};

const DEFAULT_TOOL_SETTINGS = {
  color: '#6366f1',
  fillColor: 'transparent',
  strokeWidth: 3,
  opacity: 1,
  fontSize: 18,
  fontFamily: 'Space Grotesk',
  roughness: 0,
  smoothing: 0.4,
};

export const useWhiteboardStore = create((set, get) => ({
  // Tool state
  activeTool: TOOLS.PENCIL,
  toolSettings: { ...DEFAULT_TOOL_SETTINGS },
  recentColors: ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#10b981'],

  // Canvas state
  elements: [],
  undoStack: [],
  redoStack: [],
  selectedElement: null,
  background: '#0f1117',
  gridEnabled: false,
  zoom: 1,
  panOffset: { x: 0, y: 0 },

  // Room state
  roomUsers: [],
  cursors: {},
  isCanvasLocked: false,

  // UI state
  isChatOpen: false,
  isVideoOpen: false,
  isParticipantsOpen: false,
  isSettingsOpen: false,
  unreadMessages: 0,

  // Chat
  messages: [],

  // Actions
  setActiveTool: (tool) => set({ activeTool: tool, selectedElement: null }),

  updateToolSettings: (settings) =>
    set((state) => ({
      toolSettings: { ...state.toolSettings, ...settings },
    })),

  addRecentColor: (color) =>
    set((state) => {
      const filtered = state.recentColors.filter((c) => c !== color);
      return { recentColors: [color, ...filtered].slice(0, 12) };
    }),

  // Elements
  addElement: (element) => {
    const el = { ...element, id: element.id || uuidv4() };
    set((state) => ({
      elements: [...state.elements, el],
      redoStack: [],
    }));
    return el;
  },

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
    })),

  setElements: (elements) => set({ elements }),

  // Undo / Redo
  pushToUndoStack: () =>
    set((state) => ({
      undoStack: [...state.undoStack, [...state.elements]],
      redoStack: [],
    })),

  undo: () => {
    const { undoStack, elements } = get();
    if (!undoStack.length) return null;
    const prev = undoStack[undoStack.length - 1];
    const lastElement = elements[elements.length - 1];
    set((state) => ({
      elements: prev,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, [...state.elements]],
    }));
    return lastElement;
  },

  redo: () => {
    const { redoStack } = get();
    if (!redoStack.length) return null;
    const next = redoStack[redoStack.length - 1];
    const newElement = next[next.length - 1];
    set((state) => ({
      elements: next,
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, [...state.elements]],
    }));
    return newElement;
  },

  clearCanvas: () =>
    set((state) => ({
      undoStack: [...state.undoStack, [...state.elements]],
      elements: [],
      redoStack: [],
    })),

  // Room
  setRoomUsers: (users) => set({ roomUsers: users }),

  addRoomUser: (user) =>
    set((state) => ({
      roomUsers: [...state.roomUsers.filter((u) => u.socketId !== user.socketId), user],
    })),

  removeRoomUser: (socketId) =>
    set((state) => ({ roomUsers: state.roomUsers.filter((u) => u.socketId !== socketId) })),

  updateCursor: (socketId, cursor) =>
    set((state) => ({ cursors: { ...state.cursors, [socketId]: cursor } })),

  removeCursor: (socketId) =>
    set((state) => {
      const { [socketId]: _, ...rest } = state.cursors;
      return { cursors: rest };
    }),

  setCanvasLocked: (locked) => set({ isCanvasLocked: locked }),

  // Chat
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
      unreadMessages: state.isChatOpen ? 0 : state.unreadMessages + 1,
    })),

  setMessages: (messages) => set({ messages }),

  clearUnread: () => set({ unreadMessages: 0 }),

  // Canvas transforms
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.1), 5) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  resetView: () => set({ zoom: 1, panOffset: { x: 0, y: 0 } }),

  // UI toggles
  toggleChat: () =>
    set((state) => ({
      isChatOpen: !state.isChatOpen,
      unreadMessages: !state.isChatOpen ? 0 : state.unreadMessages,
    })),
  toggleVideo: () => set((state) => ({ isVideoOpen: !state.isVideoOpen })),
  toggleParticipants: () => set((state) => ({ isParticipantsOpen: !state.isParticipantsOpen })),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  setBackground: (bg) => set({ background: bg }),
  toggleGrid: () => set((state) => ({ gridEnabled: !state.gridEnabled })),

  setSelectedElement: (el) => set({ selectedElement: el }),
}));
