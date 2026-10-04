import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCcw } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ imageUrl, isOpen, onClose }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-2" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.2, 3)); }} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30"><ZoomIn size={28} /></button>
        <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s - 0.2, 0.5)); }} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30"><ZoomOut size={28} /></button>
        <button onClick={(e) => { e.stopPropagation(); setRotation(r => r + 90); }} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30"><RotateCw size={28} /></button>
        <button onClick={(e) => { e.stopPropagation(); setScale(1); setRotation(0); }} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30"><RefreshCcw size={28} /></button>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30"><X size={28} /></button>
      </div>
      
      <div 
        className="w-full h-full flex items-center justify-center" 
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt="Full screen view" 
          style={{ transform: `scale(${scale}) rotate(${rotation}deg)`, transition: 'transform 0.2s' }}
          className="max-w-[95vw] max-h-[95vh] object-contain"
        />
      </div>
    </div>
  );
};
