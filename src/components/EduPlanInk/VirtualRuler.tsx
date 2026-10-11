import React, { useState, useRef } from 'react';
import { RotateCw, Move } from 'lucide-react';
import { RulerState } from './types';

interface VirtualRulerProps {
  rulerState: RulerState;
  onChange: (newState: RulerState) => void;
  onClose: () => void;
  scale: number;
  panX: number;
  panY: number;
}

export const VirtualRuler: React.FC<VirtualRulerProps> = ({
  rulerState,
  onChange,
  onClose,
  scale,
  panX,
  panY
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startRulerPos = useRef({ x: 0, y: 0 });
  const startAngle = useRef(0);

  if (!rulerState.enabled) return null;

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startRulerPos.current = { x: rulerState.x, y: rulerState.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - startPos.current.x) / scale;
    const dy = (e.clientY - startPos.current.y) / scale;
    onChange({
      ...rulerState,
      x: startRulerPos.current.x + dx,
      y: startRulerPos.current.y + dy
    });
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startAngle.current = rulerState.angle;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleRotateMove = (e: React.PointerEvent) => {
    if (!isRotating) return;
    const dx = e.clientX - startPos.current.x;
    const deltaAngle = (dx * 0.5) % 360;
    onChange({
      ...rulerState,
      angle: Math.round(startAngle.current + deltaAngle)
    });
  };

  const handleRotateEnd = (e: React.PointerEvent) => {
    setIsRotating(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const rulerWidth = rulerState.width || 600;
  const rulerHeight = 64;
  const cmCount = Math.floor(rulerWidth / 37.8); // Approx 37.8px per cm

  return (
    <div
      className="absolute z-20 select-none pointer-events-auto touch-none"
      style={{
        transform: `translate(${rulerState.x * scale + panX}px, ${rulerState.y * scale + panY}px) rotate(${rulerState.angle}deg)`,
        transformOrigin: '0 0',
        width: `${rulerWidth * scale}px`,
        height: `${rulerHeight * scale}px`
      }}
    >
      <div className="relative w-full h-full bg-amber-100/80 backdrop-blur border-2 border-amber-600/60 rounded-lg shadow-xl flex flex-col justify-between overflow-hidden text-amber-900 group">
        {/* Cm Ticks along top edge */}
        <div className="relative w-full h-8 border-b border-amber-400/50 flex">
          {Array.from({ length: cmCount + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${i * 37.8 * scale}px` }}
            >
              <div className="w-[1.5px] h-4 bg-amber-800" />
              <span className="text-[10px] font-mono font-bold mt-0.5">{i}</span>
              {/* Millimeter ticks */}
              {i < cmCount && Array.from({ length: 9 }).map((_, mm) => (
                <div
                  key={mm}
                  className="absolute top-0 w-[1px] bg-amber-700/60"
                  style={{
                    left: `${(mm + 1) * 3.78 * scale}px`,
                    height: (mm + 1) === 5 ? '10px' : '6px'
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Center Control Panel */}
        <div className="flex items-center justify-between px-4 py-1 text-xs font-semibold">
          <div
            onPointerDown={handlePointerDownDrag}
            onPointerMove={handlePointerMoveDrag}
            onPointerUp={handlePointerUpDrag}
            className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing px-2 py-0.5 rounded hover:bg-amber-200/60 transition-colors"
            title="Kéo để di chuyển thước"
          >
            <Move className="w-4 h-4 text-amber-800" />
            <span>Thước kẻ EduPlan</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-amber-200/80 px-2 py-0.5 rounded font-mono text-[11px]">
              {rulerState.angle}°
            </span>
            <button
              onPointerDown={handleRotateStart}
              onPointerMove={handleRotateMove}
              onPointerUp={handleRotateEnd}
              className="p-1 rounded hover:bg-amber-200/80 text-amber-800 cursor-ew-resize"
              title="Kéo sang ngang để xoay góc thước"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-red-200 text-red-700 font-bold ml-1 text-xs"
              title="Đóng thước kẻ"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
