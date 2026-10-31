/**
 * @file CircuitDiagramModal.tsx
 * @description Modal tạo sơ đồ mạch điện & quang hình thấu kính bằng SVG tương tác cho Vật lý THPT.
 * Cho phép tùy chỉnh phần tử mạch (R, L, C, Nguồn, Công tắc) và thông số quang học (Tiêu cự f, khoảng cách d).
 * Xuất file ảnh .SVG, .PNG và sao chép mã nhúng SVG/Markdown.
 */

import React, { useState } from 'react';
import { X, Download, Copy, Plus, Trash2, Eye, Share2, Check, Zap, Eye as OpticsIcon } from 'lucide-react';
import {
  CircuitDiagramConfig, OpticsDiagramConfig, ComponentType, OpticsDeviceType
} from '../types/physics.types';
import { generateCircuitSvgString, generateOpticsSvgString } from '../utils/physicsParser';

interface CircuitDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToExam?: (svgMarkup: string) => void;
}

const DEFAULT_CIRCUIT_CONFIG: CircuitDiagramConfig = {
  title: 'Mạch Điện Xoay Chiều RLC Nối Tiếp',
  connectionType: 'series',
  sourceVoltage: 220,
  sourceFrequency: 50,
  isSwitchClosed: true,
  components: [
    { id: 'c1', type: 'resistor', label: 'R1', value: 100, unit: 'Ω' },
    { id: 'c2', type: 'inductor', label: 'L', value: 0.318, unit: 'H' },
    { id: 'c3', type: 'capacitor', label: 'C', value: 31.8, unit: 'μF' },
  ]
};

const DEFAULT_OPTICS_CONFIG: OpticsDiagramConfig = {
  title: 'Tạo Ảnh Qua Thấu Kính Hội Tụ (d > f)',
  deviceType: 'convex_lens',
  focalLength: 20, // f = 20 cm
  objectDistance: 35, // d = 35 cm
  objectHeight: 10, // h = 10 cm
  showSpecialRays: true
};

export const CircuitDiagramModal: React.FC<CircuitDiagramModalProps> = ({
  isOpen,
  onClose,
  onInsertToExam
}) => {
  const [activeDiagramType, setActiveDiagramType] = useState<'circuit' | 'optics'>('circuit');
  const [circuitConfig, setCircuitConfig] = useState<CircuitDiagramConfig>(DEFAULT_CIRCUIT_CONFIG);
  const [opticsConfig, setOpticsConfig] = useState<OpticsDiagramConfig>(DEFAULT_OPTICS_CONFIG);
  const [copiedSvg, setCopiedSvg] = useState(false);

  // Form states cho thêm linh kiện mạch điện
  const [newCompType, setNewCompType] = useState<ComponentType>('resistor');
  const [newCompLabel, setNewCompLabel] = useState('R2');
  const [newCompValue, setNewCompValue] = useState(50);

  if (!isOpen) return null;

  const currentSvgString = activeDiagramType === 'circuit'
    ? generateCircuitSvgString(circuitConfig)
    : generateOpticsSvgString(opticsConfig);

  const handleAddComponent = () => {
    if (!newCompLabel.trim()) return;
    const newItem = {
      id: `comp_${Date.now()}`,
      type: newCompType,
      label: newCompLabel.trim(),
      value: newCompValue,
      unit: newCompType === 'resistor' ? 'Ω' : newCompType === 'capacitor' ? 'μF' : 'H'
    };

    setCircuitConfig(prev => ({
      ...prev,
      components: [...prev.components, newItem]
    }));

    setNewCompLabel(`R${circuitConfig.components.length + 2}`);
  };

  const handleDeleteComponent = (id: string) => {
    setCircuitConfig(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== id)
    }));
  };

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
    link.download = `SoDo_VatLy_${activeDiagramType}_${Date.now()}.svg`;
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
      canvas.height = 720;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `SoDo_VatLy_${activeDiagramType}_${Date.now()}.png`;
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
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Circuit & Optics Diagram Studio (Sơ Đồ Mạch Điện & Quang Hình SVG)</h2>
              <p className="text-xs text-slate-300">
                Tạo sơ đồ mạch RLC nối tiếp/song song và đường truyền tia sáng qua thấu kính cho đề thi GDPT 2018
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

        {/* Diagram Mode Switch Tabs */}
        <div className="flex gap-2 p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveDiagramType('circuit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDiagramType === 'circuit'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Mode 1. Sơ đồ Mạch điện (R, L, C, Nguồn, Ampe kế)</span>
          </button>

          <button
            onClick={() => setActiveDiagramType('optics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDiagramType === 'optics'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
            }`}
          >
            <OpticsIcon className="w-4 h-4" />
            <span>Mode 2. Quang hình & Thấu kính (Hội tụ / Phân kỳ)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Controls Side */}
          <div className="lg:col-span-5 space-y-4">
            
            {activeDiagramType === 'circuit' ? (
              /* CIRCUIT CONTROLS */
              <div className="space-y-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên sơ đồ mạch điện</label>
                    <input
                      type="text"
                      value={circuitConfig.title}
                      onChange={(e) => setCircuitConfig(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Kiểu mắc mạch</label>
                      <select
                        value={circuitConfig.connectionType}
                        onChange={(e) => setCircuitConfig(prev => ({ ...prev, connectionType: e.target.value as any }))}
                        className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                      >
                        <option value="series">Nối tiếp (Series)</option>
                        <option value="parallel">Song song (Parallel)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Trạng thái khóa K</label>
                      <select
                        value={circuitConfig.isSwitchClosed ? 'true' : 'false'}
                        onChange={(e) => setCircuitConfig(prev => ({ ...prev, isSwitchClosed: e.target.value === 'true' }))}
                        className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-amber-800"
                      >
                        <option value="true">Đóng K (Có dòng điện)</option>
                        <option value="false">Mở K (Ngắt mạch)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Add Component Form */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    Thêm phần tử vào mạch điện
                  </span>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Loại linh kiện</label>
                      <select
                        value={newCompType}
                        onChange={(e) => setNewCompType(e.target.value as ComponentType)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                      >
                        <option value="resistor">Điện trở R</option>
                        <option value="capacitor">Tụ điện C</option>
                        <option value="inductor">Cuộn cảm L</option>
                        <option value="lamp">Bóng đèn</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Ký hiệu</label>
                      <input
                        type="text"
                        value={newCompLabel}
                        onChange={(e) => setNewCompLabel(e.target.value)}
                        placeholder="R2"
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Giá trị</label>
                      <input
                        type="number"
                        value={newCompValue}
                        onChange={(e) => setNewCompValue(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddComponent}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm linh kiện</span>
                  </button>
                </div>

                {/* List Components */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">Các linh kiện hiện có ({circuitConfig.components.length})</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-xs">
                    {circuitConfig.components.map(comp => (
                      <div key={comp.id} className="p-1.5 bg-white border border-slate-200 rounded flex items-center justify-between">
                        <span className="font-bold text-slate-800">{comp.label} ({comp.value} {comp.unit})</span>
                        <button onClick={() => handleDeleteComponent(comp.id)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* OPTICS CONTROLS */
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên sơ đồ quang học</label>
                  <input
                    type="text"
                    value={opticsConfig.title}
                    onChange={(e) => setOpticsConfig(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dụng cụ quang học</label>
                  <select
                    value={opticsConfig.deviceType}
                    onChange={(e) => setOpticsConfig(prev => ({ ...prev, deviceType: e.target.value as OpticsDeviceType }))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="convex_lens">Thấu kính hội tụ (f &gt; 0)</option>
                    <option value="concave_lens">Thấu kính phân kỳ (f &lt; 0)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiêu cự f (cm): <span className="text-amber-700">{opticsConfig.focalLength} cm</span></label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={opticsConfig.focalLength}
                    onChange={(e) => setOpticsConfig(prev => ({ ...prev, focalLength: Number(e.target.value) }))}
                    className="w-full accent-amber-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khoảng cách vật d (cm): <span className="text-amber-700">{opticsConfig.objectDistance} cm</span></label>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={opticsConfig.objectDistance}
                    onChange={(e) => setOpticsConfig(prev => ({ ...prev, objectDistance: Number(e.target.value) }))}
                    className="w-full accent-amber-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chiều cao vật h (cm): <span className="text-amber-700">{opticsConfig.objectHeight} cm</span></label>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    step="1"
                    value={opticsConfig.objectHeight}
                    onChange={(e) => setOpticsConfig(prev => ({ ...prev, objectHeight: Number(e.target.value) }))}
                    className="w-full accent-amber-600"
                  />
                </div>

                <label className="flex items-center gap-2 font-bold text-slate-800 pt-1">
                  <input
                    type="checkbox"
                    checked={opticsConfig.showSpecialRays}
                    onChange={(e) => setOpticsConfig(prev => ({ ...prev, showSpecialRays: e.target.checked }))}
                    className="rounded text-amber-600"
                  />
                  <span>Vẽ tia sáng đặc biệt qua O và F'</span>
                </label>
              </div>
            )}

          </div>

          {/* SVG Canvas Side */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-inner min-h-[360px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-600" />
                  Sơ Đồ SVG Render Thời Gian Thực
                </span>
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  Lưới chia milimét
                </span>
              </div>

              {/* Rendered SVG Canvas */}
              <div
                className="w-full flex items-center justify-center overflow-x-auto py-2"
                dangerouslySetInnerHTML={{ __html: currentSvgString }}
              />

              <p className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-2">
                Đồ họa SVG sắc nét, có thể chèn trực tiếp vào đề thi Vật lý hoặc nhúng vào file Word
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
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
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
