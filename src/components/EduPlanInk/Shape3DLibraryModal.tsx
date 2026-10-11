import React, { useEffect, useRef, useState } from 'react';
import { X, Rotate3d, Plus, Sparkles, Check, Move, Box, HelpCircle } from 'lucide-react';
import { Shape3DKind } from './types';
import { render3DShapeOnCanvas } from './render3DShape';

interface Shape3DLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd3DShape: (kind: Shape3DKind, color: string) => void;
  currentColor: string;
}

const SHAPE_3D_ITEMS: {
  kind: Shape3DKind;
  name: string;
  description: string;
  badge: string;
}[] = [
  { kind: 'cube', name: 'Hình lập phương / Hình hộp', description: '6 mặt vuông/chữ nhật, cạnh khuất nét đứt', badge: 'Hình 11/12' },
  { kind: 'pyramid', name: 'Hình chóp tứ giác S.ABCD', description: 'Chóp đều đáy ABCD, các cạnh khuất nét đứt', badge: 'Hình học 11' },
  { kind: 'tetrahedron', name: 'Tứ diện S.ABC (Chóp tam giác)', description: '4 mặt tam giác, cạnh khuất AC nét đứt', badge: 'Hình học 11' },
  { kind: 'frustum', name: 'Hình chóp cụt ABCD.A\'B\'C\'D\'', description: 'Chóp cụt 2 đáy song song, các cạnh bên & cạnh khuất nét đứt', badge: 'Hình học 11' },
  { kind: 'prism', name: 'Hình lăng trụ tam giác', description: '2 đáy tam giác, 3 mặt bên chữ nhật', badge: 'Hình học 11' },
  { kind: 'cone', name: 'Hình nón 3D', description: 'Đỉnh S, đáy elip nét đứt nửa sau & chiều cao SO', badge: 'Nón-Trụ-Cầu' },
  { kind: 'cylinder', name: 'Hình trụ 3D', description: '2 đáy elip song song, đường sinh 2 bên', badge: 'Nón-Trụ-Cầu' },
  { kind: 'sphere', name: 'Hình cầu 3D', description: 'Mặt cầu bán kính R, vòng xích đạo 3D', badge: 'Nón-Trụ-Cầu' },
];

export const Shape3DLibraryModal: React.FC<Shape3DLibraryModalProps> = ({
  isOpen,
  onClose,
  onAdd3DShape,
  currentColor
}) => {
  const [selectedKind, setSelectedKind] = useState<Shape3DKind>('cube');
  const [color, setColor] = useState<string>(currentColor || '#38bdf8');
  const [previewRotX, setPreviewRotX] = useState<number>(25);
  const [previewRotY, setPreviewRotY] = useState<number>(35);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (currentColor) {
      setColor(currentColor);
    }
  }, [currentColor]);

  // Live rotating 3D preview loop in modal
  useEffect(() => {
    if (!isOpen) return;

    let rotY = previewRotY;
    const renderPreview = () => {
      rotY = (rotY + 0.6) % 360;
      setPreviewRotY(rotY);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          render3DShapeOnCanvas(
            ctx,
            {
              id: 'preview',
              kind: selectedKind,
              x: canvas.width / 2,
              y: canvas.height / 2,
              scale: 75,
              rotX: previewRotX,
              rotY: rotY,
              rotZ: 0,
              color: color,
              lineWidth: 2.5,
              showLabels: true
            },
            false
          );
        }
      }

      animFrameId.current = requestAnimationFrame(renderPreview);
    };

    animFrameId.current = requestAnimationFrame(renderPreview);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isOpen, selectedKind, color, previewRotX]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Rotate3d className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Thư viện Hình Không Gian 3D Interative
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold">
                  Xoay 3D Cảm Ứng
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Chọn mô hình 3D để đưa vào bảng, xoay không gian 360° theo lực nhấn ngòi bút stylus và thao tác vuốt!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Grid: Shape List */}
          <div className="md:col-span-7 p-4 border-r border-slate-800 overflow-y-auto space-y-2 custom-scrollbar">
            <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
              Danh sách khối hình học không gian (Hình 11, 12, THCS):
            </span>
            {SHAPE_3D_ITEMS.map((item) => (
              <div
                key={item.kind}
                onClick={() => setSelectedKind(item.kind)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedKind === item.kind
                    ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                    : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      selectedKind === item.kind
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700/80 text-slate-300'
                    }`}
                  >
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                      {item.name}
                      <span className="px-2 py-0.5 text-[10px] bg-slate-700/80 text-slate-300 rounded-md font-medium">
                        {item.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                  </div>
                </div>
                {selectedKind === item.kind && (
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Right Column: Live Interactive 3D Preview & Settings */}
          <div className="md:col-span-5 p-5 bg-slate-900/50 flex flex-col justify-between items-center text-center">
            <div className="w-full">
              <span className="text-xs font-semibold text-slate-400 block mb-3 uppercase tracking-wider">
                Xem trước góc xoay 3D động:
              </span>

              {/* Canvas Preview Container */}
              <div className="w-full h-56 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-inner group">
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={220}
                  className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                />
                <div className="absolute top-2 left-2 px-2.5 py-1 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg text-[11px] text-slate-300 flex items-center gap-1.5">
                  <Rotate3d className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
                  <span>Xoay 3D 360°</span>
                </div>
              </div>

              {/* Color Selector */}
              <div className="mt-4 flex items-center justify-between bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                <span className="text-xs font-semibold text-slate-300">Màu nét vẽ 3D:</span>
                <div className="flex items-center gap-2">
                  {['#ffffff', '#facc15', '#38bdf8', '#4ade80', '#f43f5e', '#a855f7'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border border-white/20 transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color.startsWith('#') ? color : '#38bdf8'}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-6 h-6 rounded border-0 p-0 cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full pt-4 space-y-2">
              <button
                onClick={() => {
                  onAdd3DShape(selectedKind, color);
                  onClose();
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span>Chèn khối hình 3D vào bảng</span>
              </button>
              <p className="text-[11px] text-slate-400">
                💡 Sau khi chèn, giáo viên có thể dùng ngòi bút/tay xoay trực tiếp các trục X, Y, Z ngay trên bảng!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
