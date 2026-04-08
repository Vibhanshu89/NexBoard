import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2, Pencil, PenTool, Eraser, Minus, Square, Circle,
  Triangle, ArrowRight, Type, Image, Undo2, Redo2, Trash2,
  ZoomIn, ZoomOut, Maximize2, Grid3x3, Zap, ChevronDown,
} from 'lucide-react';
import { useWhiteboardStore, TOOLS } from '../../store/whiteboardStore';
import { whiteboardAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TOOL_GROUPS = [
  {
    label: 'Select',
    tools: [{ id: TOOLS.SELECT, icon: MousePointer2, label: 'Select' }],
  },
  {
    label: 'Draw',
    tools: [
      { id: TOOLS.PENCIL, icon: Pencil, label: 'Pencil', shortcut: 'P' },
      { id: TOOLS.PEN, icon: PenTool, label: 'Smooth Pen', shortcut: 'B' },
      { id: TOOLS.ERASER, icon: Eraser, label: 'Eraser', shortcut: 'E' },
      { id: TOOLS.LASER, icon: Zap, label: 'Laser Pointer', shortcut: 'L' },
    ],
  },
  {
    label: 'Shapes',
    tools: [
      { id: TOOLS.LINE, icon: Minus, label: 'Line' },
      { id: TOOLS.ARROW, icon: ArrowRight, label: 'Arrow' },
      { id: TOOLS.RECTANGLE, icon: Square, label: 'Rectangle' },
      { id: TOOLS.CIRCLE, icon: Circle, label: 'Circle' },
      { id: TOOLS.TRIANGLE, icon: Triangle, label: 'Triangle' },
    ],
  },
  {
    label: 'Insert',
    tools: [
      { id: TOOLS.TEXT, icon: Type, label: 'Text', shortcut: 'T' },
      { id: TOOLS.IMAGE, icon: Image, label: 'Image' },
    ],
  },
];

const STROKE_SIZES = [2, 4, 8, 14, 24];
const PRESET_COLORS = [
  '#ffffff', '#94a3b8', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#14b8a6', '#06b6d4', '#3b82f6', '#000000',
];

function ToolBtn({ tool, active, onClick }) {
  const [hover, setHover] = useState(false);
  const Icon = tool.icon;
  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        onClick={() => onClick(tool.id)}
        className={`btn-tool ${active ? 'active' : ''}`}
        title={tool.label}
      >
        <Icon className="w-5 h-5" />
        {tool.shortcut && (
          <span className="absolute bottom-0.5 right-1 text-[8px] font-mono text-white/30 leading-none">{tool.shortcut}</span>
        )}
      </button>
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="tooltip left-full ml-2 top-1/2 -translate-y-1/2"
          >
            {tool.label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Toolbar({ socket, roomId, userRole }) {
  const {
    activeTool, setActiveTool, toolSettings, updateToolSettings, addRecentColor,
    undo, redo, clearCanvas, undoStack, redoStack,
    zoom, setZoom, resetView, toggleGrid, gridEnabled,
    elements,
  } = useWhiteboardStore();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFillPicker, setShowFillPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isViewer = userRole === 'viewer';

  const handleUndo = useCallback(() => {
    const removed = undo();
    if (removed) socket?.emit('draw:undo', { roomId, elementId: removed.id });
    else toast('Nothing to undo', { icon: '↩️' });
  }, [undo, socket, roomId]);

  const handleRedo = useCallback(() => {
    const el = redo();
    if (el) socket?.emit('draw:redo', { roomId, element: el });
    else toast('Nothing to redo', { icon: '↪️' });
  }, [redo, socket, roomId]);

  const handleClear = useCallback(() => {
    if (!window.confirm('Clear the entire whiteboard?')) return;
    clearCanvas();
    socket?.emit('draw:clear', { roomId });
  }, [clearCanvas, socket, roomId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const state = useWhiteboardStore.getState();
      await whiteboardAPI.save(roomId, { elements: state.elements, background: state.background, gridEnabled: state.gridEnabled });
      toast.success('Saved!');
    } catch { toast.error('Save failed'); }
    finally { setIsSaving(false); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const el = {
          id: crypto.randomUUID(), type: 'image',
          startX: 100, startY: 100,
          imageUrl: ev.target.result,
          imageWidth: img.width * scale,
          imageHeight: img.height * scale,
          opacity: 1,
        };
        useWhiteboardStore.getState().addElement(el);
        socket?.emit('draw:end', { roomId, element: el });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-1 py-3 px-2 bg-surface-850/95 backdrop-blur-xl border-r border-white/10 w-14 overflow-y-auto no-scrollbar z-20">
      {/* Tool groups */}
      {TOOL_GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="w-8 h-px bg-white/10 my-1" />}
          {group.tools.map((tool) => (
            tool.id === TOOLS.IMAGE ? (
              <label key={tool.id} className={`btn-tool cursor-pointer ${activeTool === tool.id ? 'active' : ''}`} title="Upload Image">
                <Image className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isViewer} />
              </label>
            ) : (
              <ToolBtn
                key={tool.id}
                tool={tool}
                active={activeTool === tool.id}
                onClick={isViewer ? () => {} : setActiveTool}
              />
            )
          ))}
        </React.Fragment>
      ))}

      <div className="w-8 h-px bg-white/10 my-1" />

      {/* Stroke width */}
      {STROKE_SIZES.map((size) => (
        <button
          key={size}
          onClick={() => !isViewer && updateToolSettings({ strokeWidth: size })}
          className={`w-10 h-7 flex items-center justify-center rounded-lg transition-all ${toolSettings.strokeWidth === size ? 'bg-brand-500/20' : 'hover:bg-white/10'}`}
          title={`Stroke: ${size}px`}
        >
          <div
            className="rounded-full bg-white/70"
            style={{ width: Math.min(size * 2, 28), height: Math.min(size, 10) }}
          />
        </button>
      ))}

      <div className="w-8 h-px bg-white/10 my-1" />

      {/* Stroke color */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-9 h-9 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all overflow-hidden"
          title="Stroke Color"
          style={{ background: toolSettings.color }}
        />
        <AnimatePresence>
          {showColorPicker && (
            <motion.div
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              className="absolute left-full ml-3 top-0 panel p-3 w-48 z-50"
            >
              <p className="text-white/40 text-xs mb-2">Stroke Color</p>
              <div className="grid grid-cols-7 gap-1.5 mb-3">
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => { updateToolSettings({ color: c }); addRecentColor(c); }}
                    className={`w-6 h-6 rounded-lg border-2 transition-all ${toolSettings.color === c ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`}
                    style={{ background: c }} />
                ))}
              </div>
              <input type="color" value={toolSettings.color}
                onChange={(e) => { updateToolSettings({ color: e.target.value }); addRecentColor(e.target.value); }}
                className="w-full h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fill color */}
      <div className="relative">
        <button
          onClick={() => setShowFillPicker(!showFillPicker)}
          className="w-9 h-9 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 transition-all overflow-hidden relative"
          title="Fill Color"
          style={{ background: toolSettings.fillColor === 'transparent' ? 'transparent' : toolSettings.fillColor }}
        >
          {toolSettings.fillColor === 'transparent' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-0.5 bg-white/30 rotate-45 absolute" />
            </div>
          )}
        </button>
        <AnimatePresence>
          {showFillPicker && (
            <motion.div
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              className="absolute left-full ml-3 top-0 panel p-3 w-48 z-50"
            >
              <p className="text-white/40 text-xs mb-2">Fill Color</p>
              <button onClick={() => updateToolSettings({ fillColor: 'transparent' })}
                className={`w-full text-left text-xs px-2 py-1 rounded-lg mb-2 transition-all ${toolSettings.fillColor === 'transparent' ? 'bg-brand-500/20 text-brand-400' : 'text-white/50 hover:bg-white/10'}`}>
                No fill
              </button>
              <div className="grid grid-cols-7 gap-1.5 mb-3">
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => updateToolSettings({ fillColor: c })}
                    className={`w-6 h-6 rounded-lg border-2 transition-all ${toolSettings.fillColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`}
                    style={{ background: c }} />
                ))}
              </div>
              <input type="color" value={toolSettings.fillColor === 'transparent' ? '#ffffff' : toolSettings.fillColor}
                onChange={(e) => updateToolSettings({ fillColor: e.target.value })}
                className="w-full h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Opacity */}
      <div className="w-9">
        <input type="range" min="0.1" max="1" step="0.05" value={toolSettings.opacity}
          onChange={(e) => updateToolSettings({ opacity: parseFloat(e.target.value) })}
          className="w-full accent-brand-500 cursor-pointer" title={`Opacity: ${Math.round(toolSettings.opacity * 100)}%`} />
      </div>

      <div className="w-8 h-px bg-white/10 my-1" />

      {/* Actions */}
      <button onClick={handleUndo} disabled={!undoStack.length} className="btn-tool" title="Undo (Ctrl+Z)">
        <Undo2 className="w-4 h-4" />
      </button>
      <button onClick={handleRedo} disabled={!redoStack.length} className="btn-tool" title="Redo (Ctrl+Y)">
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="w-8 h-px bg-white/10 my-1" />

      <button onClick={() => setZoom(zoom + 0.1)} className="btn-tool" title="Zoom In">
        <ZoomIn className="w-4 h-4" />
      </button>
      <button onClick={() => setZoom(zoom - 0.1)} className="btn-tool" title="Zoom Out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button onClick={resetView} className="btn-tool" title="Reset View">
        <Maximize2 className="w-4 h-4" />
      </button>

      <button onClick={toggleGrid} className={`btn-tool ${gridEnabled ? 'active' : ''}`} title="Toggle Grid">
        <Grid3x3 className="w-4 h-4" />
      </button>

      <div className="w-8 h-px bg-white/10 my-1" />

      {!isViewer && (
        <button onClick={handleClear} className="btn-tool text-red-400/60 hover:text-red-400 hover:bg-red-500/10" title="Clear Canvas">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
