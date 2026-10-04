import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Crop, RotateCcw, Maximize2, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  title?: string;
  onCrop: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export function ImageCropperModal({
  isOpen,
  imageSrc,
  title = "Cắt ảnh đề bài / đồ thị",
  onCrop,
  onClose
}: ImageCropperModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Selection coordinates relative to display image (in pixels)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'create' | 'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; origBox?: { x: number; y: number; width: number; height: number } }>({ x: 0, y: 0 });

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Initialize or reset crop box when image loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 600;
    const nh = img.naturalHeight || 400;
    setNaturalSize({ width: nw, height: nh });

    const dw = img.width || img.clientWidth || nw;
    const dh = img.height || img.clientHeight || nh;
    setDisplaySize({ width: dw, height: dh });

    // Default crop box: center 70% of image
    const padX = Math.round(dw * 0.15);
    const padY = Math.round(dh * 0.15);
    setCropBox({
      x: padX,
      y: padY,
      width: Math.max(50, dw - 2 * padX),
      height: Math.max(50, dh - 2 * padY)
    });
  };

  const getContainerCoords = (clientX: number, clientY: number) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent, mode: 'create' | 'move' | 'nw' | 'ne' | 'se' | 'sw' = 'create') => {
    e.preventDefault();
    const { x, y } = getContainerCoords(e.clientX, e.clientY);
    setIsDragging(true);
    setDragMode(mode);
    setDragStart({ x, y, origBox: cropBox ? { ...cropBox } : undefined });

    if (mode === 'create') {
      setCropBox({ x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !imgRef.current) return;
    const { x: curX, y: curY } = getContainerCoords(e.clientX, e.clientY);
    const maxW = imgRef.current.clientWidth;
    const maxH = imgRef.current.clientHeight;

    if (dragMode === 'create') {
      const startX = dragStart.x;
      const startY = dragStart.y;
      const x = Math.min(startX, curX);
      const y = Math.min(startY, curY);
      const width = Math.abs(curX - startX);
      const height = Math.abs(curY - startY);
      setCropBox({ x, y, width, height });
    } else if (dragMode === 'move' && dragStart.origBox) {
      const dx = curX - dragStart.x;
      const dy = curY - dragStart.y;
      const orig = dragStart.origBox;
      let newX = orig.x + dx;
      let newY = orig.y + dy;
      newX = Math.max(0, Math.min(newX, maxW - orig.width));
      newY = Math.max(0, Math.min(newY, maxH - orig.height));
      setCropBox({ x: newX, y: newY, width: orig.width, height: orig.height });
    } else if (dragStart.origBox) {
      const orig = dragStart.origBox;
      let newX = orig.x;
      let newY = orig.y;
      let newW = orig.width;
      let newH = orig.height;

      if (dragMode === 'se') {
        newW = Math.max(20, Math.min(curX - orig.x, maxW - orig.x));
        newH = Math.max(20, Math.min(curY - orig.y, maxH - orig.y));
      } else if (dragMode === 'sw') {
        const right = orig.x + orig.width;
        newX = Math.max(0, Math.min(curX, right - 20));
        newW = right - newX;
        newH = Math.max(20, Math.min(curY - orig.y, maxH - orig.y));
      } else if (dragMode === 'ne') {
        const bottom = orig.y + orig.height;
        newY = Math.max(0, Math.min(curY, bottom - 20));
        newH = bottom - newY;
        newW = Math.max(20, Math.min(curX - orig.x, maxW - orig.x));
      } else if (dragMode === 'nw') {
        const right = orig.x + orig.width;
        const bottom = orig.y + orig.height;
        newX = Math.max(0, Math.min(curX, right - 20));
        newY = Math.max(0, Math.min(curY, bottom - 20));
        newW = right - newX;
        newH = bottom - newY;
      }
      setCropBox({ x: newX, y: newY, width: newW, height: newH });
    }
  }, [isDragging, dragMode, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Perform crisp cropping using native resolution
  const handleConfirmCrop = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const dw = img.clientWidth;
    const dh = img.clientHeight;

    if (!nw || !nh || !dw || !dh) return;

    const scaleX = nw / dw;
    const scaleY = nh / dh;

    const box = cropBox && cropBox.width > 10 && cropBox.height > 10
      ? cropBox
      : { x: 0, y: 0, width: dw, height: dh };

    const cropX = Math.round(box.x * scaleX);
    const cropY = Math.round(box.y * scaleY);
    const cropW = Math.round(box.width * scaleX);
    const cropH = Math.round(box.height * scaleY);

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropW, cropH);
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const dataUrl = canvas.toDataURL('image/png');
    onCrop(dataUrl);
    onClose();
  };

  const handleSelectFull = () => {
    if (!imgRef.current) return;
    setCropBox({
      x: 0,
      y: 0,
      width: imgRef.current.clientWidth,
      height: imgRef.current.clientHeight
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-2xs">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{title}</h3>
              <p className="text-xs text-slate-500">
                Kéo chuột để chọn vùng hình vẽ / đồ thị cần cắt đưa vào đề bài và lời giải
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop canvas area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-900/90 p-4 flex items-center justify-center min-h-[340px] select-none"
        >
          <div className="relative inline-block border-2 border-slate-700 rounded-lg overflow-hidden shadow-2xl">
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Source crop"
              onLoad={handleImageLoad}
              onMouseDown={(e) => handleMouseDown(e, 'create')}
              className="max-h-[60vh] max-w-full object-contain cursor-crosshair block"
              draggable={false}
            />

            {/* Dark overlay with transparent cutout */}
            {cropBox && cropBox.width > 5 && cropBox.height > 5 && (
              <>
                {/* SVG cutout mask */}
                <div 
                  className="absolute pointer-events-none inset-0"
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    clipPath: `polygon(
                      0% 0%, 0% 100%, 
                      ${cropBox.x}px 100%, 
                      ${cropBox.x}px ${cropBox.y}px, 
                      ${cropBox.x + cropBox.width}px ${cropBox.y}px, 
                      ${cropBox.x + cropBox.width}px ${cropBox.y + cropBox.height}px, 
                      ${cropBox.x}px ${cropBox.y + cropBox.height}px, 
                      ${cropBox.x}px 100%, 
                      100% 100%, 100% 0%
                    )`
                  }}
                />

                {/* Crop boundary box */}
                <div
                  className="absolute border-2 border-emerald-400 shadow-sm cursor-move bg-emerald-500/10"
                  style={{
                    left: `${cropBox.x}px`,
                    top: `${cropBox.y}px`,
                    width: `${cropBox.width}px`,
                    height: `${cropBox.height}px`
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, 'move');
                  }}
                >
                  {/* Grid lines inside crop */}
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                    <div className="border-r border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-white"></div>
                    <div className="border-r border-white"></div>
                    <div></div>
                  </div>

                  {/* Corner handles */}
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'nw'); }}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full cursor-nwse-resize"
                  />
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'ne'); }}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full cursor-nesw-resize"
                  />
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'se'); }}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full cursor-nwse-resize"
                  />
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'sw'); }}
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-full cursor-nesw-resize"
                  />

                  {/* Dimension tag */}
                  <div className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none">
                    {Math.round(cropBox.width)} × {Math.round(cropBox.height)} px
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectFull}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Chọn toàn bộ ảnh</span>
            </button>
            <span className="text-xs text-slate-400 hidden sm:inline">
              | Kéo các góc chấm tròn màu trắng để chỉnh kích thước
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận cắt ảnh & Chèn</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
