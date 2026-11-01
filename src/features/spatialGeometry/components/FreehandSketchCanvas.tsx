import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PenTool, Highlighter, Eraser, RotateCcw, RotateCw, 
  Trash2, Eye, EyeOff, X, Palette, Circle, Check 
} from 'lucide-react';
import { SketchStroke, SketchPoint } from '../types/geometry.types';

interface FreehandSketchCanvasProps {
  isActive: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'White', value: '#ffffff' },
  { name: 'Yellow', value: '#eab308' }
];

const STROKE_WIDTHS = [
  { name: 'Mỏng', size: 2 },
  { name: 'Vừa', size: 4 },
  { name: 'Dày', size: 8 }
];

export const FreehandSketchCanvas: React.FC<FreehandSketchCanvasProps> = ({
  isActive,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isVisible, setIsVisible] = useState(true);

  // Stroke histories for Undo / Redo
  const [strokes, setStrokes] = useState<SketchStroke[]>([]);
  const [redoStack, setRedoStack] = useState<SketchStroke[]>([]);
  const currentPointsRef = useRef<SketchPoint[]>([]);

  // Resize canvas according to container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const { clientWidth, clientHeight } = canvas.parentElement;
    if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
      canvas.width = clientWidth;
      canvas.height = clientHeight;
      redrawAll();
    }
  }, [strokes, isVisible]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Redraw all strokes on canvas
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isVisible) return;

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        const xc = (stroke.points[i].x + stroke.points[i - 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i - 1].y) / 2;
        ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, xc, yc);
      }

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = stroke.opacity;

      if (stroke.toolType === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.stroke();
      ctx.restore();
    });
  }, [strokes, isVisible]);

  useEffect(() => {
    redrawAll();
  }, [strokes, isVisible, redrawAll]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive || !isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    currentPointsRef.current = [{ x, y }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isActive || !isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentPointsRef.current.push({ x, y });

    // Live render current stroke
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = currentPointsRef.current;
    if (pts.length >= 2) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(x, y);

      ctx.strokeStyle = currentTool === 'eraser' ? '#000' : selectedColor;
      ctx.lineWidth = currentTool === 'eraser' ? strokeWidth * 4 : (currentTool === 'highlighter' ? strokeWidth * 3 : strokeWidth);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = currentTool === 'highlighter' ? 0.4 : 1.0;

      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.stroke();
      ctx.restore();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    setIsDrawing(false);

    if (currentPointsRef.current.length > 1) {
      const newStroke: SketchStroke = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        points: [...currentPointsRef.current],
        color: selectedColor,
        width: currentTool === 'eraser' ? strokeWidth * 4 : (currentTool === 'highlighter' ? strokeWidth * 3 : strokeWidth),
        opacity: currentTool === 'highlighter' ? 0.4 : 1.0,
        toolType: currentTool
      };

      setStrokes(prev => [...prev, newStroke]);
      setRedoStack([]); // Clear redo stack on new action
    }
    currentPointsRef.current = [];
  };

  // Undo / Redo / Clear
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes(prev => prev.slice(0, -1));
    setRedoStack(prev => [last, ...prev]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack(prev => prev.slice(1));
    setStrokes(prev => [...prev, next]);
  };

  const handleClearAll = () => {
    if (strokes.length === 0) return;
    setStrokes([]);
    setRedoStack([]);
  };

  return (
    <div className={`absolute inset-0 z-30 pointer-events-none flex flex-col justify-between ${isActive ? '' : 'hidden'}`}>
      
      {/* Floating Sketch Control Bar */}
      <div className="pointer-events-auto self-center mt-3 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-3 max-w-full overflow-x-auto">
        
        {/* Tool Selector */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setCurrentTool('pen')}
            className={`p-1.5 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTool === 'pen' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
            title="Bút vẽ tự do nét đơn"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bút vẽ</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool('highlighter')}
            className={`p-1.5 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTool === 'highlighter' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
            title="Bút dạ quang đánh dấu bán trong suốt"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dạ quang</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool('eraser')}
            className={`p-1.5 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTool === 'eraser' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
            title="Cục tẩy nét vẽ"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tẩy nháp</span>
          </button>
        </div>

        {/* Color Palette */}
        {currentTool !== 'eraser' && (
          <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
            {PRESET_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setSelectedColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer border border-slate-700 flex items-center justify-center ${
                  selectedColor === c.value ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : 'hover:scale-110'
                }`}
                title={c.name}
              />
            ))}
          </div>
        )}

        {/* Stroke Thickness Picker */}
        <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
          {STROKE_WIDTHS.map(w => (
            <button
              key={w.size}
              type="button"
              onClick={() => setStrokeWidth(w.size)}
              className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg cursor-pointer border transition-colors ${
                strokeWidth === w.size
                  ? 'bg-slate-700 text-emerald-400 border-emerald-500'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {w.size}px
            </button>
          ))}
        </div>

        {/* Undo / Redo / Clear Controls */}
        <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Hoàn tác nét vẽ trước (Ctrl+Z)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Làm lại nét vẽ vừa hoàn tác"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={strokes.length === 0}
            className="p-1.5 text-rose-400 hover:text-rose-300 disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Xóa toàn bộ bảng nháp"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title={isVisible ? 'Ẩn tạm thời nét nháp' : 'Hiện lại nét nháp'}
          >
            {isVisible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
          </button>
        </div>

        {/* Exit Sketch Mode */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
          title="Thoát chế độ Vẽ nháp"
        >
          <X className="w-4 h-4" />
        </button>

      </div>

      {/* HTML5 Canvas Surface */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full pointer-events-auto touch-none ${
          currentTool === 'eraser' ? 'cursor-crosshair' : 'cursor-crosshair'
        }`}
      />

    </div>
  );
};
