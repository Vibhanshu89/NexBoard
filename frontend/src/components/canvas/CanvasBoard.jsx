import React, { useRef, useEffect, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardStore, TOOLS } from '../../store/whiteboardStore';
import { getSocket } from '../../services/socket';

// ─── Smooth Bezier interpolation ─────────────────────────────────────────────
function getSmoothPath(points, smoothing = 0.3) {
  if (points.length < 2) return '';
  const line = (a, b) => ({
    length: Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)),
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  });
  const controlPoint = (cur, prev, next, reverse) => {
    const p = prev || cur, n = next || cur;
    const o = line(p, n);
    const angle = o.angle + (reverse ? Math.PI : 0);
    const length = o.length * smoothing;
    return { x: cur.x + Math.cos(angle) * length, y: cur.y + Math.sin(angle) * length };
  };
  const bezierCmd = (point, i, arr) => {
    const cps = controlPoint(arr[i - 1], arr[i - 2], point);
    const cpe = controlPoint(point, arr[i - 1], arr[i + 1], true);
    return `C ${cps.x},${cps.y} ${cpe.x},${cpe.y} ${point.x},${point.y}`;
  };
  return points.reduce((acc, point, i, arr) =>
    i === 0 ? `M ${point.x},${point.y}` : `${acc} ${bezierCmd(point, i, arr)}`, '');
}

// ─── Render all elements to canvas ───────────────────────────────────────────
function renderElement(ctx, el) {
  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;
  ctx.strokeStyle = el.color || '#fff';
  ctx.fillStyle = el.fillColor || 'transparent';
  ctx.lineWidth = el.strokeWidth || 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (el.type) {
    case 'pencil':
    case 'pen': {
      if (!el.points || el.points.length < 2) break;
      const path = new Path2D(getSmoothPath(el.points, el.smoothing ?? 0.3));
      ctx.stroke(path);
      break;
    }
    case 'eraser': {
      if (!el.points || el.points.length < 2) break;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = el.strokeWidth * 3;
      const path = new Path2D(getSmoothPath(el.points, 0.2));
      ctx.stroke(path);
      break;
    }
    case 'line': {
      ctx.beginPath();
      ctx.moveTo(el.startX, el.startY);
      ctx.lineTo(el.endX, el.endY);
      ctx.stroke();
      break;
    }
    case 'arrow': {
      const dx = el.endX - el.startX, dy = el.endY - el.startY;
      const angle = Math.atan2(dy, dx);
      const headLen = Math.max(16, el.strokeWidth * 4);
      ctx.beginPath();
      ctx.moveTo(el.startX, el.startY);
      ctx.lineTo(el.endX, el.endY);
      ctx.lineTo(el.endX - headLen * Math.cos(angle - Math.PI / 6), el.endY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(el.endX, el.endY);
      ctx.lineTo(el.endX - headLen * Math.cos(angle + Math.PI / 6), el.endY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      break;
    }
    case 'rectangle': {
      const w = el.endX - el.startX, h = el.endY - el.startY;
      if (el.fillColor && el.fillColor !== 'transparent') {
        ctx.fillStyle = el.fillColor;
        ctx.fillRect(el.startX, el.startY, w, h);
      }
      ctx.strokeRect(el.startX, el.startY, w, h);
      break;
    }
    case 'circle': {
      const rx = Math.abs(el.endX - el.startX) / 2;
      const ry = Math.abs(el.endY - el.startY) / 2;
      const cx = el.startX + (el.endX - el.startX) / 2;
      const cy = el.startY + (el.endY - el.startY) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (el.fillColor && el.fillColor !== 'transparent') { ctx.fillStyle = el.fillColor; ctx.fill(); }
      ctx.stroke();
      break;
    }
    case 'triangle': {
      ctx.beginPath();
      ctx.moveTo((el.startX + el.endX) / 2, el.startY);
      ctx.lineTo(el.endX, el.endY);
      ctx.lineTo(el.startX, el.endY);
      ctx.closePath();
      if (el.fillColor && el.fillColor !== 'transparent') { ctx.fillStyle = el.fillColor; ctx.fill(); }
      ctx.stroke();
      break;
    }
    case 'text': {
      ctx.font = `${el.fontSize || 18}px '${el.fontFamily || 'Space Grotesk'}'`;
      ctx.fillStyle = el.color || '#fff';
      if (el.text) ctx.fillText(el.text, el.startX, el.startY);
      break;
    }
    case 'image': {
      if (el.imageUrl && el._img) {
        ctx.drawImage(el._img, el.startX, el.startY, el.imageWidth || 200, el.imageHeight || 200);
      }
      break;
    }
  }
  ctx.restore();
}

export default function CanvasBoard({ socket, roomId, userRole }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null); // Live drawing layer
  const isDrawing = useRef(false);
  const currentElement = useRef(null);
  const currentPoints = useRef([]);
  const lastThrottleTime = useRef(0);
  const imgCache = useRef({});

  const {
    elements, activeTool, toolSettings, background, gridEnabled,
    zoom, panOffset, addElement, pushToUndoStack, isCanvasLocked,
    setActiveTool,
  } = useWhiteboardStore();

  // ── Render full canvas (all persisted elements) ───────────────────────────
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    if (gridEnabled) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Load images & render
    elements.forEach((el) => {
      if (el.type === 'image' && el.imageUrl && !imgCache.current[el.imageUrl]) {
        const img = new Image();
        img.src = el.imageUrl;
        img.onload = () => { imgCache.current[el.imageUrl] = img; renderCanvas(); };
        imgCache.current[el.imageUrl] = img;
      }
      renderElement(ctx, el.type === 'image' ? { ...el, _img: imgCache.current[el.imageUrl] } : el);
    });

    ctx.restore();
  }, [elements, background, gridEnabled, zoom, panOffset]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  // ── Canvas size ───────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      overlay.width = overlay.offsetWidth;
      overlay.height = overlay.offsetHeight;
      renderCanvas();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Socket: draw:start / draw:move from remote ────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const remoteDrawing = {};

    socket.on('draw:start', ({ element, socketId }) => {
      remoteDrawing[socketId] = element;
    });

    socket.on('draw:move', ({ id, points, socketId }) => {
      if (!remoteDrawing[socketId]) return;
      remoteDrawing[socketId] = { ...remoteDrawing[socketId], points };
      // Draw on overlay
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      Object.values(remoteDrawing).forEach((el) => {
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(zoom, zoom);
        renderElement(ctx, el);
        ctx.restore();
      });
    });

    socket.on('draw:end', () => {
      const overlay = overlayRef.current;
      if (overlay) {
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
    });

    return () => { socket.off('draw:start'); socket.off('draw:move'); };
  }, [socket, zoom, panOffset]);

  // ── Pointer event helpers ─────────────────────────────────────────────────
  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom,
    };
  }, [zoom, panOffset]);

  const canDraw = userRole !== 'viewer' && !isCanvasLocked;

  // ── Pointer Down ──────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    if (!canDraw) return;
    if (e.button !== 0) return;
    e.preventDefault();

    const { x, y } = getCanvasPos(e);
    isDrawing.current = true;
    currentPoints.current = [{ x, y }];
    pushToUndoStack();

    const id = uuidv4();
    const base = {
      id,
      type: activeTool,
      color: toolSettings.color,
      fillColor: toolSettings.fillColor,
      strokeWidth: toolSettings.strokeWidth,
      opacity: toolSettings.opacity,
      fontSize: toolSettings.fontSize,
      fontFamily: toolSettings.fontFamily,
      smoothing: toolSettings.smoothing,
    };

    if ([TOOLS.PENCIL, TOOLS.PEN, TOOLS.ERASER].includes(activeTool)) {
      currentElement.current = { ...base, points: [{ x, y }] };
    } else if (activeTool === TOOLS.TEXT) {
      const text = window.prompt('Enter text:');
      if (!text) { isDrawing.current = false; return; }
      const el = { ...base, startX: x, startY: y, text };
      addElement(el);
      socket?.emit('draw:end', { roomId, element: el });
      isDrawing.current = false;
      return;
    } else {
      currentElement.current = { ...base, startX: x, startY: y, endX: x, endY: y };
    }

    socket?.emit('draw:start', { roomId, element: currentElement.current });
  }, [canDraw, activeTool, toolSettings, getCanvasPos, pushToUndoStack, socket, roomId, addElement]);

  // ── Pointer Move ──────────────────────────────────────────────────────────
  const handlePointerMove = useCallback((e) => {
    if (!isDrawing.current || !currentElement.current) return;
    e.preventDefault();

    const { x, y } = getCanvasPos(e);
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    if ([TOOLS.PENCIL, TOOLS.PEN, TOOLS.ERASER].includes(activeTool)) {
      currentPoints.current.push({ x, y });
      currentElement.current.points = [...currentPoints.current];
    } else {
      currentElement.current = { ...currentElement.current, endX: x, endY: y };
    }

    renderElement(ctx, currentElement.current);
    ctx.restore();

    // Throttle socket emit to 30fps
    const now = Date.now();
    if (now - lastThrottleTime.current > 33) {
      lastThrottleTime.current = now;
      socket?.emit('draw:move', {
        roomId,
        id: currentElement.current.id,
        points: currentElement.current.points || [],
        endX: currentElement.current.endX,
        endY: currentElement.current.endY,
      });
    }

    // Emit cursor position
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    socket?.emit('cursor:move', { roomId, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [activeTool, getCanvasPos, zoom, panOffset, socket, roomId]);

  // ── Pointer Up ────────────────────────────────────────────────────────────
  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current || !currentElement.current) return;
    isDrawing.current = false;

    const el = { ...currentElement.current };
    if ([TOOLS.PENCIL, TOOLS.PEN, TOOLS.ERASER].includes(activeTool)) {
      el.points = [...currentPoints.current];
    }

    // Clear overlay
    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
    }

    addElement(el);
    socket?.emit('draw:end', { roomId, element: el });
    currentElement.current = null;
    currentPoints.current = [];
  }, [activeTool, addElement, socket, roomId]);

  // ── Drag-drop image onto canvas ───────────────────────────────────────────
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const el = {
          id: uuidv4(), type: 'image',
          startX: x, startY: y,
          imageUrl: ev.target.result,
          imageWidth: img.width * scale,
          imageHeight: img.height * scale,
          opacity: 1,
        };
        addElement(el);
        socket?.emit('draw:end', { roomId, element: el });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }, [zoom, panOffset, addElement, socket, roomId]);

  // ── Cursor style ──────────────────────────────────────────────────────────
  const getCursor = () => {
    if (!canDraw) return 'default';
    switch (activeTool) {
      case TOOLS.PENCIL: case TOOLS.PEN: return 'crosshair';
      case TOOLS.ERASER: return 'cell';
      case TOOLS.TEXT: return 'text';
      case TOOLS.SELECT: return 'default';
      default: return 'crosshair';
    }
  };

  return (
    <div
      className="whiteboard-container w-full h-full"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Base canvas (persisted elements) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: getCursor() }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {/* Overlay canvas (live drawing) */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
