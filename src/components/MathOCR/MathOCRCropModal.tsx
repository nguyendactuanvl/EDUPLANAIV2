import React, { useState, useRef, useEffect } from 'react';
import { Crop, Check, X, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { CropArea } from './types';

interface MathOCRCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export const MathOCRCropModal: React.FC<MathOCRCropModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onCropComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [crop, setCrop] = useState<CropArea>({ x: 10, y: 10, width: 80, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, initialCrop: { x: 0, y: 0, width: 0, height: 0 } });

  if (!isOpen || !imageUrl) return null;

  const handleMouseDown = (e: React.MouseEvent, handle?: string) => {
    e.preventDefault();
    if (handle) {
      setIsResizing(handle);
    } else {
      setIsDragging(true);
    }
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      initialCrop: { ...crop }
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;

    const initial = dragStart.current.initialCrop;

    if (isDragging) {
      let newX = Math.max(0, Math.min(100 - initial.width, initial.x + dx));
      let newY = Math.max(0, Math.min(100 - initial.height, initial.y + dy));
      setCrop({ ...crop, x: newX, y: newY });
    } else if (isResizing) {
      let newCrop = { ...crop };
      if (isResizing.includes('r')) {
        newCrop.width = Math.max(10, Math.min(100 - initial.x, initial.width + dx));
      }
      if (isResizing.includes('b')) {
        newCrop.height = Math.max(10, Math.min(100 - initial.y, initial.height + dy));
      }
      if (isResizing.includes('l')) {
        const possibleW = initial.width - dx;
        if (possibleW >= 10 && initial.x + dx >= 0) {
          newCrop.x = initial.x + dx;
          newCrop.width = possibleW;
        }
      }
      if (isResizing.includes('t')) {
        const possibleH = initial.height - dy;
        if (possibleH >= 10 && initial.y + dy >= 0) {
          newCrop.y = initial.y + dy;
          newCrop.height = possibleH;
        }
      }
      setCrop(newCrop);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  const executeCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    const cropX = (crop.x / 100) * img.clientWidth * scaleX;
    const cropY = (crop.y / 100) * img.clientHeight * scaleY;
    const cropW = (crop.width / 100) * img.clientWidth * scaleX;
    const cropH = (crop.height / 100) * img.clientHeight * scaleY;

    canvas.width = Math.max(1, cropW);
    canvas.height = Math.max(1, cropH);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    const croppedBase64 = canvas.toDataURL('image/png');
    onCropComplete(croppedBase64);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white bg-slate-950">
          <div className="flex items-center gap-2 font-bold text-emerald-400 text-base">
            <Crop className="w-5 h-5" />
            <span>Cắt vùng ảnh chứa công thức / câu hỏi</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Canvas & Crop Box */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center p-6 select-none"
        >
          <div className="relative inline-block max-w-full max-h-[60vh] overflow-hidden">
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop target"
              className="max-w-full max-h-[60vh] object-contain block pointer-events-none"
            />

            {/* Darkened Overlay */}
            <div
              className="absolute inset-0 bg-black/50 pointer-events-none"
              style={{
                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%,
                  0% 0%,
                  ${crop.x}% ${crop.y}%,
                  ${crop.x}% ${crop.y + crop.height}%,
                  ${crop.x + crop.width}% ${crop.y + crop.height}%,
                  ${crop.x + crop.width}% ${crop.y}%,
                  ${crop.x}% ${crop.y}%
                )`
              }}
            />

            {/* Draggable Crop Selection Box */}
            <div
              onMouseDown={(e) => handleMouseDown(e)}
              className="absolute border-2 border-emerald-400 cursor-move shadow-2xl group"
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.width}%`,
                height: `${crop.height}%`
              }}
            >
              {/* Corner Resize Handles */}
              {['tl', 'tr', 'bl', 'br'].map((h) => (
                <div
                  key={h}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, h);
                  }}
                  className={`absolute w-3.5 h-3.5 bg-emerald-400 border border-slate-900 rounded-sm ${
                    h === 'tl' ? '-top-2 -left-2 cursor-nwse-resize' :
                    h === 'tr' ? '-top-2 -right-2 cursor-nesw-resize' :
                    h === 'bl' ? '-bottom-2 -left-2 cursor-nesw-resize' :
                    '-bottom-2 -right-2 cursor-nwse-resize'
                  }`}
                />
              ))}

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-slate-900/90 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                  Kéo di chuyển hoặc co giãn góc
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs font-semibold">
          <button
            onClick={() => setCrop({ x: 5, y: 5, width: 90, height: 90 })}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chọn lại toàn bộ</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={executeCrop}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận cắt & Trích xuất OCR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
