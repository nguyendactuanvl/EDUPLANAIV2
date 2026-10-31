/**
 * @file OscillationGraphModal.tsx
 * @description Modal Studio tạo đồ thị hình sin dao động điều hòa x(t), v(t), a(t) và sóng cơ theo không gian x.
 * Hỗ trợ kéo thanh trượt (slider) điều chỉnh Biên độ A, Tần số góc \omega, Pha ban đầu \varphi.
 * Xuất file ảnh .SVG, .PNG và chèn trực tiếp vào đề thi GDPT 2018.
 */

import React, { useState } from 'react';
import { X, Download, Copy, Eye, Share2, Check, Activity } from 'lucide-react';
import { OscillationGraphConfig, PhysicsGraphType } from '../types/physics.types';
import { generateOscillationSvgString } from '../utils/physicsParser';

interface OscillationGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToExam?: (svgMarkup: string) => void;
}

const DEFAULT_GRAPH_CONFIG: OscillationGraphConfig = {
  title: 'Đồ Thị Li Độ x(t) Dao Động Điều Hòa',
  graphType: 'xt_harmonic',
  amplitude: 10, // A = 10 cm
  angularFrequency: 2 * Math.PI, // \omega = 2\pi rad/s
  initialPhaseRad: 0, // \varphi = 0 rad
  timeCycles: 2, // 2 chu kỳ T
  wavelengthCm: 20 // \lambda = 20 cm
};

export const OscillationGraphModal: React.FC<OscillationGraphModalProps> = ({
  isOpen,
  onClose,
  onInsertToExam
}) => {
  const [config, setConfig] = useState<OscillationGraphConfig>(DEFAULT_GRAPH_CONFIG);
  const [copiedSvg, setCopiedSvg] = useState(false);

  if (!isOpen) return null;

  const currentSvgString = generateOscillationSvgString(config);

  const handleCopySvgCode = () => {
    navigator.clipboard.writeText(currentSvgString);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DoThi_DaoDong_${config.graphType}_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const svgBlob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 1280;
      canvas.height = 640;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `DoThi_DaoDong_${config.graphType}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Wave & Oscillation Graph Studio (Xưởng Đồ Thị Dao Động & Sóng Cơ)</h2>
              <p className="text-xs text-slate-300">
                Tạo đồ thị li độ x(t), vận tốc v(t), gia tốc a(t) và sóng truyền chuẩn lưới chia milimét
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Controls Side */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên đồ thị</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại đồ thị</label>
                <select
                  value={config.graphType}
                  onChange={(e) => setConfig(prev => ({ ...prev, graphType: e.target.value as PhysicsGraphType }))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-blue-800"
                >
                  <option value="xt_harmonic">Đồ thị Li độ x(t) = A·cos(ωt + φ)</option>
                  <option value="vt_velocity">Đồ thị Vận tốc v(t) = -Aω·sin(ωt + φ)</option>
                  <option value="at_acceleration">Đồ thị Gia tốc a(t) = -Aω²·cos(ωt + φ)</option>
                  <option value="spatial_wave">Đồ thị Sóng truyền theo không gian u(x)</option>
                </select>
              </div>

              {/* Sliders */}
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700">Biên độ A (cm):</span>
                  <span className="text-blue-700 font-mono">{config.amplitude} cm</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  step="1"
                  value={config.amplitude}
                  onChange={(e) => setConfig(prev => ({ ...prev, amplitude: Number(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700">Số chu kỳ T hiển thị:</span>
                  <span className="text-blue-700 font-mono">{config.timeCycles} T</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={config.timeCycles}
                  onChange={(e) => setConfig(prev => ({ ...prev, timeCycles: Number(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700">Pha ban đầu φ (rad):</span>
                  <span className="text-blue-700 font-mono">{(config.initialPhaseRad / Math.PI).toFixed(2)}π rad</span>
                </div>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step={Math.PI / 4}
                  value={config.initialPhaseRad}
                  onChange={(e) => setConfig(prev => ({ ...prev, initialPhaseRad: Number(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
              </div>

            </div>

          </div>

          {/* SVG Canvas Side */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-inner min-h-[360px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-600" />
                  Đồ Thị Hình Sin SVG Thời Gian Thực
                </span>
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  Lưới milimét
                </span>
              </div>

              {/* Rendered SVG Canvas */}
              <div
                className="w-full flex items-center justify-center overflow-x-auto py-2"
                dangerouslySetInnerHTML={{ __html: currentSvgString }}
              />

              <p className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-2">
                Đồ thị phẳng hình sin sắc nét, có thể dán trực tiếp vào đề thi GDPT 2018
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCopySvgCode}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedSvg ? <Check className="w-4 h-4 text-amber-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSvg ? 'Đã copy mã SVG!' : 'Sao chép mã SVG'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải file .SVG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải ảnh .PNG</span>
              </button>

              {onInsertToExam && (
                <button
                  type="button"
                  onClick={() => {
                    onInsertToExam(currentSvgString);
                    onClose();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Chèn vào đề thi</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
