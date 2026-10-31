/**
 * @file PhysicsSymbolBar.tsx
 * @description Bàn phím ký hiệu, đại lượng & vectơ môn Vật lý THPT GDPT 2018.
 * Hỗ trợ sao chép nhanh, chèn trực tiếp và tạo OMML cho Word.
 */

import React, { useState } from 'react';
import { Copy, Check, Zap, Sparkles } from 'lucide-react';
import { createOMMLVector, createOMMLFraction } from '../../shared/utils/ommlExporter';

interface PhysicsSymbolBarProps {
  onInsert?: (symbol: string) => void;
  className?: string;
}

interface SymbolItem {
  id: string;
  label: string;
  display: string;
  latex: string;
  category: 'vector' | 'constant' | 'unit' | 'wave';
}

const SYMBOL_LIST: SymbolItem[] = [
  // Vectơ
  { id: 'v_vec', label: 'Véc-tơ vận tốc', display: 'v⃗', latex: '$\\vec{v}$', category: 'vector' },
  { id: 'f_vec', label: 'Véc-tơ lực', display: 'F⃗', latex: '$\\vec{F}$', category: 'vector' },
  { id: 'b_vec', label: 'Cảm ứng từ', display: 'B⃗', latex: '$\\vec{B}$', category: 'vector' },
  { id: 'e_vec', label: 'Điện trường', display: 'E⃗', latex: '$\\vec{E}$', category: 'vector' },
  { id: 'a_vec', label: 'Gia tốc', display: 'a⃗', latex: '$\\vec{a}$', category: 'vector' },
  { id: 'p_vec', label: 'Động lượng', display: 'p⃗', latex: '$\\vec{p}$', category: 'vector' },

  // Dao động & Sóng
  { id: 'omega', label: 'Tần số góc', display: 'ω', latex: '$\\omega$', category: 'wave' },
  { id: 'phi', label: 'Pha ban đầu', display: 'φ', latex: '$\\varphi$', category: 'wave' },
  { id: 'lambda', label: 'Bước sóng', display: 'λ', latex: '$\\lambda$', category: 'wave' },
  { id: 'delta_t', label: 'Độ biến thiên t', display: 'Δt', latex: '$\\Delta t$', category: 'wave' },
  { id: 'delta_u', label: 'Độ biến thiên nội năng', display: 'ΔU', latex: '$\\Delta U$', category: 'wave' },

  // Đơn vị & Tiền tố
  { id: 'ohm', label: 'Điện trở Ôm', display: 'Ω', latex: '$\\Omega$', category: 'unit' },
  { id: 'micro', label: 'Tiền tố micro', display: 'μ', latex: '$\\mu$', category: 'unit' },
  { id: 'rad_s', label: 'Radian trên giây', display: 'rad/s', latex: '$\\text{rad/s}$', category: 'unit' },
  { id: 'hz', label: 'Héc (Hz)', display: 'Hz', latex: '$\\text{Hz}$', category: 'unit' },
  { id: 'joule', label: 'Jun (J)', display: 'J', latex: '$\\text{J}$', category: 'unit' },
  { id: 'watt', label: 'Oát (W)', display: 'W', latex: '$\\text{W}$', category: 'unit' },
  { id: 'tesla', label: 'Tét-la (T)', display: 'T', latex: '$\\text{T}$', category: 'unit' },
  { id: 'kelvin', label: 'Kelvin', display: 'K', latex: '$K$', category: 'unit' }
];

export const PhysicsSymbolBar: React.FC<PhysicsSymbolBarProps> = ({
  onInsert,
  className = ''
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customVector, setCustomVector] = useState('F');
  const [filterCat, setFilterCat] = useState<'all' | 'vector' | 'wave' | 'unit'>('all');

  const handleSelect = (latex: string, id: string) => {
    if (onInsert) {
      onInsert(latex);
    }
    navigator.clipboard.writeText(latex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyCustomVector = () => {
    const val = `$\\vec{${customVector.trim()}}$`;
    if (onInsert) onInsert(val);
    navigator.clipboard.writeText(val);
    setCopiedId('custom_vec');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyOmml = () => {
    const omml = createOMMLVector(customVector.trim());
    navigator.clipboard.writeText(omml);
    setCopiedId('omml_vec');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = filterCat === 'all'
    ? SYMBOL_LIST
    : SYMBOL_LIST.filter(item => item.category === filterCat);

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Bàn phím Ký hiệu & Vectơ Vật lý
            </h3>
            <p className="text-[11px] text-slate-500">
              Nhấp để chèn hoặc sao chép mã KaTeX / OMML sang Word
            </p>
          </div>
        </div>

        {/* Filter categories */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'vector', 'wave', 'unit'] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterCat === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'Tất cả' : cat === 'vector' ? 'Vectơ' : cat === 'wave' ? 'Dao động - Sóng' : 'Đơn vị SI'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of symbols */}
      <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-2">
        {filtered.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.latex, item.id)}
            title={item.label}
            className="p-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 hover:border-amber-400 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group relative cursor-pointer"
          >
            <span className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 font-mono">
              {item.display}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[70px]">
              {item.label}
            </span>
            {copiedId === item.id && (
              <span className="absolute top-1 right-1 bg-amber-600 text-white p-0.5 rounded-full">
                <Check className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Custom Vector Builder */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-xl">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tạo Véc-tơ tùy ý:
          </span>
          <input
            type="text"
            value={customVector}
            onChange={(e) => setCustomVector(e.target.value)}
            placeholder="vd: F, v, a"
            className="w-20 px-2 py-1 text-xs font-bold font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center"
          />
          <span className="text-xs font-bold text-amber-600 font-mono">
            → \vec{"{"}{customVector}{"}"}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleCopyCustomVector}
            className="px-3 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedId === 'custom_vec' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>Copy KaTeX</span>
          </button>

          <button
            type="button"
            onClick={handleCopyOmml}
            className="px-3 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedId === 'omml_vec' ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            <span>Copy OMML Word</span>
          </button>
        </div>
      </div>
    </div>
  );
};
