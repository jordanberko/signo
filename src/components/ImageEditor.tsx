'use client';

import { useState, useRef, useEffect, useCallback, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCw, Crop, Check, RotateCcw } from 'lucide-react';

// ── Types ──

interface ImageEditorProps {
  /** The image source — a blob: URL or remote URL. */
  src: string;
  /** Called with the corrected File when the user applies. */
  onApply: (file: File) => void;
  /** Called when the user cancels without changes. */
  onCancel: () => void;
}

type Tool = 'straighten' | 'crop';

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type CropHandle =
  | 'nw' | 'ne' | 'sw' | 'se'
  | 'n' | 's' | 'e' | 'w'
  | 'move'
  | null;

// ── Constants ──

const MIN_CROP = 40; // min crop dimension in display pixels
const GRID_LINES = 3; // for rule-of-thirds

// ── Component ──

export default function ImageEditor({ src, onApply, onCancel }: ImageEditorProps) {
  const [tool, setTool] = useState<Tool>('straighten');
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const [applying, setApplying] = useState(false);

  // Full-resolution source image
  const fullImageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Canvas for preview
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Display dimensions (how large the image appears on screen)
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  // Scale factor: display / natural
  const scaleRef = useRef(1);

  // Crop drag state
  const activeHandle = useRef<CropHandle>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const cropStart = useRef<CropBox>({ x: 0, y: 0, w: 0, h: 0 });

  // ── Load source image ──
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      fullImageRef.current = img;
      setImageLoaded(true);
    };
    img.src = src;
  }, [src]);

  // ── Lock body scroll ──
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ── Compute display size and initial crop ──
  useEffect(() => {
    if (!imageLoaded || !fullImageRef.current || !containerRef.current) return;

    const img = fullImageRef.current;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Fit image within container with padding
    const pad = 32;
    const maxW = rect.width - pad * 2;
    const maxH = rect.height - pad * 2;

    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    scaleRef.current = scale;

    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    setDisplaySize({ w, h });

    // Initial crop = full image
    setCrop({ x: 0, y: 0, w, h });
  }, [imageLoaded]);

  // ── Draw preview ──
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = fullImageRef.current;
    if (!canvas || !img || !displaySize.w) return;

    // Account for Retina / HiDPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(displaySize.w * dpr);
    canvas.height = Math.round(displaySize.h * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale all drawing ops by dpr so coordinates stay in CSS-pixel space
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, displaySize.w, displaySize.h);
    ctx.save();

    // Apply rotation around center
    const cx = displaySize.w / 2;
    const cy = displaySize.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    ctx.drawImage(img, 0, 0, displaySize.w, displaySize.h);
    ctx.restore();

    // ── Draw crop overlay (only on crop tool) ──
    if (tool === 'crop') {
      // Darken outside crop (use displaySize since ctx is scaled by dpr)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      // Top
      ctx.fillRect(0, 0, displaySize.w, crop.y);
      // Bottom
      ctx.fillRect(0, crop.y + crop.h, displaySize.w, displaySize.h - crop.y - crop.h);
      // Left
      ctx.fillRect(0, crop.y, crop.x, crop.h);
      // Right
      ctx.fillRect(crop.x + crop.w, crop.y, displaySize.w - crop.x - crop.w, crop.h);

      // Crop border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);

      // Rule-of-thirds grid inside crop
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i < GRID_LINES; i++) {
        const gx = crop.x + (crop.w * i) / GRID_LINES;
        const gy = crop.y + (crop.h * i) / GRID_LINES;
        ctx.beginPath();
        ctx.moveTo(gx, crop.y);
        ctx.lineTo(gx, crop.y + crop.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(crop.x, gy);
        ctx.lineTo(crop.x + crop.w, gy);
        ctx.stroke();
      }

      // Corner handles
      const hs = 10;
      ctx.fillStyle = '#ffffff';
      const corners = [
        [crop.x, crop.y],
        [crop.x + crop.w, crop.y],
        [crop.x, crop.y + crop.h],
        [crop.x + crop.w, crop.y + crop.h],
      ];
      for (const [hx, hy] of corners) {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      }
    }

    // ── Grid overlay for straighten ──
    if (tool === 'straighten' && rotation !== 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      const lines = 6;
      for (let i = 1; i < lines; i++) {
        const gx = (displaySize.w * i) / lines;
        const gy = (displaySize.h * i) / lines;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, displaySize.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(displaySize.w, gy);
        ctx.stroke();
      }
    }
  }, [displaySize, rotation, crop, tool]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // ── Crop handle hit test ──
  function hitTestHandle(px: number, py: number): CropHandle {
    const threshold = 20;
    const { x, y, w, h } = crop;

    // Corners
    if (Math.abs(px - x) < threshold && Math.abs(py - y) < threshold) return 'nw';
    if (Math.abs(px - (x + w)) < threshold && Math.abs(py - y) < threshold) return 'ne';
    if (Math.abs(px - x) < threshold && Math.abs(py - (y + h)) < threshold) return 'sw';
    if (Math.abs(px - (x + w)) < threshold && Math.abs(py - (y + h)) < threshold) return 'se';

    // Edges
    if (Math.abs(py - y) < threshold && px > x && px < x + w) return 'n';
    if (Math.abs(py - (y + h)) < threshold && px > x && px < x + w) return 's';
    if (Math.abs(px - x) < threshold && py > y && py < y + h) return 'w';
    if (Math.abs(px - (x + w)) < threshold && py > y && py < y + h) return 'e';

    // Inside = move
    if (px > x && px < x + w && py > y && py < y + h) return 'move';

    return null;
  }

  // ── Pointer events for crop ──
  function getCanvasPos(e: RPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  const handlePointerDown = useCallback(
    (e: RPointerEvent<HTMLCanvasElement>) => {
      if (tool !== 'crop') return;
      const pos = getCanvasPos(e);
      const handle = hitTestHandle(pos.x, pos.y);
      if (!handle) return;

      activeHandle.current = handle;
      dragStart.current = pos;
      cropStart.current = { ...crop };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, crop]
  );

  const handlePointerMove = useCallback(
    (e: RPointerEvent<HTMLCanvasElement>) => {
      if (tool !== 'crop') return;

      const pos = getCanvasPos(e);

      // Update cursor
      if (!activeHandle.current) {
        const handle = hitTestHandle(pos.x, pos.y);
        const canvas = canvasRef.current;
        if (canvas) {
          if (handle === 'nw' || handle === 'se') canvas.style.cursor = 'nwse-resize';
          else if (handle === 'ne' || handle === 'sw') canvas.style.cursor = 'nesw-resize';
          else if (handle === 'n' || handle === 's') canvas.style.cursor = 'ns-resize';
          else if (handle === 'e' || handle === 'w') canvas.style.cursor = 'ew-resize';
          else if (handle === 'move') canvas.style.cursor = 'move';
          else canvas.style.cursor = 'default';
        }
        return;
      }

      const dx = pos.x - dragStart.current.x;
      const dy = pos.y - dragStart.current.y;
      const s = cropStart.current;
      const maxW = displaySize.w;
      const maxH = displaySize.h;

      let nx = s.x, ny = s.y, nw = s.w, nh = s.h;

      switch (activeHandle.current) {
        case 'move':
          nx = Math.max(0, Math.min(maxW - s.w, s.x + dx));
          ny = Math.max(0, Math.min(maxH - s.h, s.y + dy));
          break;
        case 'nw':
          nx = Math.max(0, Math.min(s.x + s.w - MIN_CROP, s.x + dx));
          ny = Math.max(0, Math.min(s.y + s.h - MIN_CROP, s.y + dy));
          nw = s.w - (nx - s.x);
          nh = s.h - (ny - s.y);
          break;
        case 'ne':
          ny = Math.max(0, Math.min(s.y + s.h - MIN_CROP, s.y + dy));
          nw = Math.max(MIN_CROP, Math.min(maxW - s.x, s.w + dx));
          nh = s.h - (ny - s.y);
          break;
        case 'sw':
          nx = Math.max(0, Math.min(s.x + s.w - MIN_CROP, s.x + dx));
          nw = s.w - (nx - s.x);
          nh = Math.max(MIN_CROP, Math.min(maxH - s.y, s.h + dy));
          break;
        case 'se':
          nw = Math.max(MIN_CROP, Math.min(maxW - s.x, s.w + dx));
          nh = Math.max(MIN_CROP, Math.min(maxH - s.y, s.h + dy));
          break;
        case 'n':
          ny = Math.max(0, Math.min(s.y + s.h - MIN_CROP, s.y + dy));
          nh = s.h - (ny - s.y);
          break;
        case 's':
          nh = Math.max(MIN_CROP, Math.min(maxH - s.y, s.h + dy));
          break;
        case 'w':
          nx = Math.max(0, Math.min(s.x + s.w - MIN_CROP, s.x + dx));
          nw = s.w - (nx - s.x);
          break;
        case 'e':
          nw = Math.max(MIN_CROP, Math.min(maxW - s.x, s.w + dx));
          break;
      }

      setCrop({ x: nx, y: ny, w: nw, h: nh });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, crop, displaySize]
  );

  const handlePointerUp = useCallback(() => {
    activeHandle.current = null;
  }, []);

  // ── Reset crop when switching to crop tool ──
  useEffect(() => {
    if (tool === 'crop' && displaySize.w > 0) {
      setCrop({ x: 0, y: 0, w: displaySize.w, h: displaySize.h });
    }
  }, [tool, displaySize]);

  // ── Reset all ──
  function resetAll() {
    setRotation(0);
    setCrop({ x: 0, y: 0, w: displaySize.w, h: displaySize.h });
  }

  // ── Apply: render full-res to canvas and export ──
  async function handleApply() {
    const img = fullImageRef.current;
    if (!img) return;

    setApplying(true);

    // Use requestAnimationFrame to let the UI update before heavy canvas work
    await new Promise((r) => requestAnimationFrame(r));

    try {
      const scale = scaleRef.current;

      // Map crop from display coords to natural coords
      const natCrop = {
        x: crop.x / scale,
        y: crop.y / scale,
        w: crop.w / scale,
        h: crop.h / scale,
      };

      // Step 1: draw rotated full-res image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Canvas not supported');

      const cx = tempCanvas.width / 2;
      const cy = tempCanvas.height / 2;
      tempCtx.translate(cx, cy);
      tempCtx.rotate((rotation * Math.PI) / 180);
      tempCtx.translate(-cx, -cy);
      tempCtx.drawImage(img, 0, 0);

      // Step 2: crop from rotated canvas
      const outCanvas = document.createElement('canvas');
      outCanvas.width = Math.round(natCrop.w);
      outCanvas.height = Math.round(natCrop.h);
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) throw new Error('Canvas not supported');

      outCtx.drawImage(
        tempCanvas,
        Math.round(natCrop.x),
        Math.round(natCrop.y),
        Math.round(natCrop.w),
        Math.round(natCrop.h),
        0,
        0,
        outCanvas.width,
        outCanvas.height
      );

      // Export as JPEG
      const blob = await new Promise<Blob>((resolve, reject) => {
        outCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Export failed'))),
          'image/jpeg',
          0.92
        );
      });

      const file = new File([blob], 'edited.jpg', { type: 'image/jpeg' });
      onApply(file);
    } catch (err) {
      console.error('[ImageEditor] Apply failed:', err);
      setApplying(false);
    }
  }

  const hasChanges = rotation !== 0 || crop.x !== 0 || crop.y !== 0 || crop.w !== displaySize.w || crop.h !== displaySize.h;

  const content = (
    <div className="fixed inset-0 z-[9999] bg-[#111] flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-white/10 flex-shrink-0">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>

        <div className="flex items-center gap-1 bg-white/10 rounded-full p-0.5">
          <button
            onClick={() => setTool('straighten')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tool === 'straighten'
                ? 'bg-white text-[#111]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <RotateCw className="h-3.5 w-3.5" />
            Straighten
          </button>
          <button
            onClick={() => setTool('crop')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tool === 'crop'
                ? 'bg-white text-[#111]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Crop className="h-3.5 w-3.5" />
            Crop
          </button>
        </div>

        <button
          onClick={handleApply}
          disabled={applying || !hasChanges}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-[#111] text-sm font-semibold rounded-full hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {applying ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Applying...
            </span>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Apply</span>
            </>
          )}
        </button>
      </div>

      {/* ── Canvas area ── */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative"
      >
        {!imageLoaded ? (
          <div className="text-white/50 text-sm">Loading image...</div>
        ) : (
          <canvas
            ref={canvasRef}
            className="touch-none select-none"
            style={{
              width: displaySize.w || undefined,
              height: displaySize.h || undefined,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex-shrink-0 bg-[#1a1a1a] border-t border-white/10 px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        {tool === 'straighten' && (
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/50 uppercase tracking-wide">
                Rotation
              </label>
              <span className="text-xs text-white/70 font-mono tabular-nums w-16 text-right">
                {rotation > 0 ? '+' : ''}{rotation.toFixed(1)}&deg;
              </span>
            </div>
            <input
              type="range"
              min={-15}
              max={15}
              step={0.1}
              value={rotation}
              onChange={(e) => setRotation(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
            />
            {/* Tick marks */}
            <div className="flex justify-between text-[10px] text-white/30 px-0.5">
              <span>-15&deg;</span>
              <span>0&deg;</span>
              <span>+15&deg;</span>
            </div>
          </div>
        )}

        {tool === 'crop' && (
          <div className="max-w-md mx-auto flex items-center justify-between">
            <p className="text-xs text-white/50">
              Drag corners or edges to crop
            </p>
            <button
              onClick={() => setCrop({ x: 0, y: 0, w: displaySize.w, h: displaySize.h })}
              className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset crop
            </button>
          </div>
        )}

        {/* Reset all */}
        {hasChanges && (
          <div className="max-w-md mx-auto mt-3 text-center">
            <button
              onClick={resetAll}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Reset all changes
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
