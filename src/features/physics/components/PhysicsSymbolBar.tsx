/**
 * @file PhysicsSymbolBar.tsx
 * @description Thanh công cụ Ký hiệu & Đại lượng Vật lý THPT (Vectơ, Đơn vị SI, Thẻ OMML/Word).
 * Hỗ trợ 2 chế độ:
 * 1. Click sao chép nhanh vào Clipboard (kèm Toast)
 * 2. Callback `onInsert(symbol)` chèn trực tiếp vào vị trí con trỏ trong ô soạn thảo hiện tại.
 */

import React, { useState } from 'react';
import { Copy, Check, Zap, FileCode, Sparkles, HelpCircle } from 'lucide-react';
import { formatPhysicsVectorToLatex, physicsToOMML } from '../utils/physicsParser';
import { PhysicsSymbolItem, PhysicsCategory } from '../types/physics.types';

interface PhysicsSymbolBarProps {
  onInsert?: (symbol: string) => void;
  className?: string;
}

const PHYSICS_SYMBOL_ITEMS: PhysicsSymbolItem[] = [
  // 1. Cơ - Dao động
  { id: 'vec_v', label: 'Vận tốc', symbol: 'v⃗', latex: '$\\vec{v}$', category: 'mechanics', description: 'Vectơ vận tốc v', unit: 'm/s' },
  { id: 'vec_a', label: 'Gia tốc', symbol: 'a⃗', latex: '$\\vec{a}$', category: 'mechanics', description: 'Vectơ gia tốc a', unit: 'm/s²' },
  { id: 'vec_f', label: 'Lực', symbol: 'F⃗', latex: '$\\vec{F}$', category: 'mechanics', description: 'Vectơ lực F', unit: 'N' },
  { id: 'vec_p', label: 'Động lượng', symbol: 'p⃗', latex: '$\\vec{p}$', category: 'mechanics', description: 'Vectơ động lượng p', unit: 'kg·m/s' },
  { id: 'omega', label: 'Tần số góc ω', symbol: 'ω', latex: '$\\omega$', category: 'mechanics', description: 'Tần số góc omega', unit: 'rad/s' },
  { id: 'phi', label: 'Pha ban đầu φ', symbol: 'φ', latex: '$\\varphi$', category: 'mechanics', description: 'Pha ban đầu phi', unit: 'rad' },
  { id: 'deltat', label: 'Khoảng thời gian Δt', symbol: 'Δt', latex: '$\\Delta t$', category: 'mechanics', description: 'Khoảng thời gian Delta t', unit: 's' },

  // 2. Điện - Từ
  { id: 'vec_e', label: 'Cường độ điện trường', symbol: 'E⃗', latex: '$\\vec{E}$', category: 'electricity', description: 'Vectơ điện trường E', unit: 'V/m' },
  { id: 'vec_b', label: 'Cảm ứng từ', symbol: 'B⃗', latex: '$\\vec{B}$', category: 'electricity', description: 'Vectơ cảm ứng từ B', unit: 'T' },
  { id: 'phi_mag', label: 'Từ thông Φ', symbol: 'Φ', latex: '$\\Phi$', category: 'electricity', description: 'Từ thông Phi', unit: 'Wb' },
  { id: 'ohms', label: 'Điện trở Ω', symbol: 'Ω', latex: '$\\Omega$', category: 'electricity', description: 'Đơn vị Ôm', unit: 'Ω' },
  { id: 'micro', label: 'Micrô μ', symbol: 'μ', latex: '$\\mu$', category: 'electricity', description: 'Tiền tố micro 10^-6' },
  { id: 'zl', label: 'Cảm kháng Z_L', symbol: 'Z_L', latex: '$Z_L$', category: 'electricity', description: 'Trở kháng cuộn cảm', unit: 'Ω' },
  { id: 'zc', label: 'Dung kháng Z_C', symbol: 'Z_C', latex: '$Z_C$', category: 'electricity', description: 'Trở kháng tụ điện', unit: 'Ω' },

  // 3. Quang học
  { id: 'lambda', label: 'Bước sóng λ', symbol: 'λ', latex: '$\\lambda$', category: 'optics', description: 'Bước sóng lambda', unit: 'm/nm' },
  { id: 'focal', label: 'Tiêu cự f', symbol: 'f', latex: '$f$', category: 'optics', description: 'Tiêu cự thấu kính', unit: 'cm' },
  { id: 'diopter', label: 'Độ tụ D', symbol: 'D', latex: '$D$', category: 'optics', description: 'Độ tụ thấu kính', unit: 'dp' },
  { id: 'refractive', label: 'Chiết suất n', symbol: 'n', latex: '$n$', category: 'optics', description: 'Chiết suất môi trường' },
  { id: 'angle_i', label: 'Góc tới i', symbol: 'i', latex: '$i$', category: 'optics', description: 'Góc tới tia sáng', unit: 'độ' },

  // 4. Nhiệt - Hạt nhân
  { id: 'temp_k', label: 'Nhiệt độ K', symbol: 'K', latex: '$K$', category: 'thermo_nuclear', description: 'Nhiệt độ Kelvin', unit: 'K' },
  { id: 'temp_c', label: 'Nhiệt độ ℃', symbol: '℃', latex: '$^\\circ\\text{C}$', category: 'thermo_nuclear', description: 'Nhiệt độ Celsius', unit: '℃' },
  { id: 'ev', label: 'Êlectronvôn eV', symbol: 'eV', latex: '$\\text{eV}$', category: 'thermo_nuclear', description: 'Năng lượng eV', unit: 'eV' },
  { id: 'alpha', label: 'Tia Alpha α', symbol: 'α', latex: '$\\alpha$', category: 'thermo_nuclear', description: 'Hạt nhân Heli 2 4' },
  { id: 'beta', label: 'Tia Beta β', symbol: 'β', latex: '$\\beta$', category: 'thermo_nuclear', description: 'Dòng êlectron hoặc pôzitron' },
  { id: 'gamma', label: 'Tia Gamma γ', symbol: 'γ', latex: '$\\gamma$', category: 'thermo_nuclear', description: 'Sóng điện từ tần số cực cao' },

  // 5. Đơn vị đo SI
  { id: 'unit_ms', label: 'm/s', symbol: 'm/s', latex: '$\\text{m/s}$', category: 'si_units', description: 'Đơn vị vận tốc' },
  { id: 'unit_rads', label: 'rad/s', symbol: 'rad/s', latex: '$\\text{rad/s}$', category: 'si_units', description: 'Đơn vị tần số góc' },
  { id: 'unit_hz', label: 'Héc (Hz)', symbol: 'Hz', latex: '$\\text{Hz}$', category: 'si_units', description: 'Đơn vị tần số' },
  { id: 'unit_joule', label: 'Jun (J)', symbol: 'J', latex: '$\\text{J}$', category: 'si_units', description: 'Đơn vị công & năng lượng' },
  { id: 'unit_watt', label: 'Oát (W)', symbol: 'W', latex: '$\\text{W}$', category: 'si_units', description: 'Đơn vị công suất' },
  { id: 'unit_tesla', label: 'Tét-la (T)', symbol: 'T', latex: '$\\text{T}$', category: 'si_units', description: 'Đơn vị cảm ứng từ' }
];

export const PhysicsSymbolBar: React.FC<PhysicsSymbolBarProps> = ({ onInsert, className = '' }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PhysicsCategory | 'all'>('all');

  // Form custom vectơ / phân số
  const [customVectorSymbol, setCustomVectorSymbol] = useState('F');
  const [customTop, setCustomTop] = useState('dp');
  const [customBottom, setCustomBottom] = useState('dt');
  const [showOmmlBox, setShowOmmlBox] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleSelectSymbol = (latexText: string, itemId: string, itemLabel: string) => {
    if (onInsert) {
      onInsert(latexText);
    }
    navigator.clipboard.writeText(latexText);
    setCopiedId(itemId);
    showToast(`Đã sao chép "${itemLabel}" (${latexText}) vào Clipboard!`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCustomVectorInsert = () => {
    const formattedLatex = formatPhysicsVectorToLatex(`vec(${customVectorSymbol.trim()})`);
    handleSelectSymbol(formattedLatex, 'custom_vector', `Vectơ ${customVectorSymbol}`);
  };

  const handleCustomFractionInsert = () => {
    const formattedLatex = formatPhysicsVectorToLatex(`${customTop.trim()}/${customBottom.trim()}`);
    handleSelectSymbol(formattedLatex, 'custom_frac', `Phân số ${customTop}/${customBottom}`);
  };

  const filteredItems = selectedCategory === 'all'
    ? PHYSICS_SYMBOL_ITEMS
    : PHYSICS_SYMBOL_ITEMS.filter(item => item.category === selectedCategory);

  const customVectorPreview = formatPhysicsVectorToLatex(`vec(${customVectorSymbol})`);
  const customFractionPreview = formatPhysicsVectorToLatex(`${customTop}/${customBottom}`);
  const customOmmlSnippet = physicsToOMML(`${customTop}/${customBottom}`);

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 ${className}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-amber-400 px-4 py-2.5 rounded-xl shadow-xl font-medium text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Physics Symbol & Vector Toolbar (Ký Hiệu & Vectơ Vật Lý)
            </h3>
            <p className="text-[11px] text-slate-500">
              Nhấp để chèn trực tiếp hoặc sao chép ký hiệu vectơ, đơn vị SI, chuỗi LaTeX vào đề thi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowOmmlBox(!showOmmlBox)}
          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Thẻ OMML Word</span>
        </button>
      </div>

      {/* Category Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tất cả ký hiệu
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('mechanics')}
          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
            selectedCategory === 'mechanics'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {"Cơ - Dao động ($\\vec{v}$, $\\vec{F}$, $\\omega$)"}
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('electricity')}
          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
            selectedCategory === 'electricity'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {"Điện - Từ ($\\vec{E}$, $\\vec{B}$, $\\Omega$)"}
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('optics')}
          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
            selectedCategory === 'optics'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {"Quang học ($\\lambda$, $f$, $D$)"}
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('thermo_nuclear')}
          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
            selectedCategory === 'thermo_nuclear'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {"Nhiệt - Hạt nhân ($\\alpha$, $\\beta$, $\\text{eV}$)"}
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('si_units')}
          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
            selectedCategory === 'si_units'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Đơn vị SI (m/s, rad/s, Hz, J)
        </button>
      </div>

      {/* Quick Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelectSymbol(item.latex, item.id, item.label)}
            className="p-2 bg-slate-50 hover:bg-amber-50/80 border border-slate-200 hover:border-amber-400 rounded-xl flex flex-col items-center justify-between gap-1 transition-all group cursor-pointer text-center relative"
            title={item.description}
          >
            <span className="text-sm font-bold text-slate-800 group-hover:text-amber-700 font-mono">
              {item.symbol}
            </span>
            <span className="text-[10px] text-slate-500 line-clamp-1">
              {item.label}
            </span>

            {copiedId === item.id ? (
              <span className="absolute top-1 right-1 bg-amber-600 text-white p-0.5 rounded-full">
                <Check className="w-2.5 h-2.5" />
              </span>
            ) : (
              <span className="absolute top-1 right-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <Copy className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Section 2: Custom Vector & Fraction Builder */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            {"Tạo Vectơ Tùy Chỉnh ($\\vec{X}$) & Phân Số ($\\frac{a}{b}$)"}
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
            Tự động bọc KaTeX $...$
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          {/* Custom Vector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-600">Tên Vectơ (VD: F, v, B, E)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customVectorSymbol}
                onChange={(e) => setCustomVectorSymbol(e.target.value)}
                placeholder="F"
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCustomVectorInsert}
                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Chèn Vectơ</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-500">Xem trước: <code className="font-bold text-amber-900">{customVectorPreview}</code></span>
          </div>

          {/* Custom Fraction */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-600">Tử số / Mẫu số (VD: dp/dt)</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customTop}
                onChange={(e) => setCustomTop(e.target.value)}
                placeholder="dp"
                className="w-1/2 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
              />
              <span className="self-center font-bold text-slate-400">/</span>
              <input
                type="text"
                value={customBottom}
                onChange={(e) => setCustomBottom(e.target.value)}
                placeholder="dt"
                className="w-1/2 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
              />
              <button
                type="button"
                onClick={handleCustomFractionInsert}
                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Chèn Phân Số</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-500">Xem trước: <code className="font-bold text-amber-900">{customFractionPreview}</code></span>
          </div>
        </div>
      </div>

      {/* OMML XML Box */}
      {showOmmlBox && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-900 flex items-center gap-1">
              <FileCode className="w-4 h-4 text-indigo-600" />
              Mã Thẻ OMML XML Cho Microsoft Word
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(customOmmlSnippet);
                showToast('Đã sao chép mã OMML XML Word vào Clipboard!');
              }}
              className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-[11px] rounded hover:bg-indigo-700 transition-colors"
            >
              Sao chép OMML XML
            </button>
          </div>
          <pre className="p-2 bg-slate-900 text-amber-400 font-mono text-[10px] rounded overflow-x-auto max-h-24">
            {customOmmlSnippet}
          </pre>
        </div>
      )}

    </div>
  );
};
