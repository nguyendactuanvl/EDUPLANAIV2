/**
 * @file ChemSymbolBar.tsx
 * @description Bàn phím ký hiệu, mũi tên phản ứng và tra cứu danh pháp IUPAC Hóa học GDPT 2018.
 */

import React, { useState } from 'react';
import { Copy, Check, FlaskConical, Search, Sparkles } from 'lucide-react';
import { formatChemicalFormula, IUPAC_DICTIONARY } from '../utils/chemCalc';

interface ChemSymbolBarProps {
  onInsert?: (symbol: string) => void;
  className?: string;
}

interface SymbolItem {
  id: string;
  label: string;
  symbol: string;
  latex: string;
  category: 'arrow' | 'script' | 'state';
}

const CHEM_SYMBOLS: SymbolItem[] = [
  // Mũi tên phản ứng
  { id: 'rev_arrow', label: 'Thuận nghịch', symbol: '⇌', latex: '$\\rightleftharpoons$', category: 'arrow' },
  { id: 'gas_up', label: 'Khí thoát ra', symbol: '↑', latex: '$\\uparrow$', category: 'arrow' },
  { id: 'precipitate_down', label: 'Kết tủa', symbol: '↓', latex: '$\\downarrow$', category: 'arrow' },
  { id: 'arrow_right', label: 'Phản ứng 1 chiều', symbol: '→', latex: '$\\rightarrow$', category: 'arrow' },
  { id: 'arrow_temp', label: 'Nhiệt độ xt', symbol: '→(t°, xt)', latex: '$\\xrightarrow{t^\\circ, xt}$', category: 'arrow' },

  // Chỉ số & Liên kết
  { id: 'triple_bond', label: 'Liên kết ba', symbol: '≡', latex: '$\\equiv$', category: 'script' },
  { id: 'double_bond', label: 'Liên kết đôi', symbol: '=', latex: '$=$', category: 'script' },
  { id: 'delta_symbol', label: 'Ký hiệu Delta', symbol: 'Δ', latex: '$\\Delta$', category: 'script' },
  { id: 'degree_symbol', label: 'Độ chuẩn', symbol: '°', latex: '$^\\circ$', category: 'script' },
  { id: 'radical_dot', label: 'Gốc tự do', symbol: '•', latex: '$\\bullet$', category: 'script' },

  // Trạng thái chất
  { id: 'state_aq', label: 'Dung dịch nước (aq)', symbol: '(aq)', latex: '$\\text{(aq)}$', category: 'state' },
  { id: 'state_s', label: 'Chất rắn (s)', symbol: '(s)', latex: '$\\text{(s)}$', category: 'state' },
  { id: 'state_l', label: 'Chất lỏng (l)', symbol: '(l)', latex: '$\\text{(l)}$', category: 'state' },
  { id: 'state_g', label: 'Chất khí (g)', symbol: '(g)', latex: '$\\text{(g)}$', category: 'state' }
];

export const ChemSymbolBar: React.FC<ChemSymbolBarProps> = ({
  onInsert,
  className = ''
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formulaInput, setFormulaInput] = useState('H2SO4');
  const [searchTerm, setSearchTerm] = useState('');

  const handleCopy = (text: string, id: string) => {
    if (onInsert) onInsert(text);
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formattedFormula = formatChemicalFormula(formulaInput);

  const filteredIupac = searchTerm.trim()
    ? IUPAC_DICTIONARY.filter(item =>
        item.traditional.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.iupac.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.formula.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Bàn phím Ký hiệu, Mũi tên phản ứng & IUPAC Hóa học
            </h3>
            <p className="text-[11px] text-slate-500">
              Nhấp để chèn hoặc copy ký hiệu đặc thù theo GDPT 2018
            </p>
          </div>
        </div>
      </div>

      {/* Symbol buttons grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {CHEM_SYMBOLS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleCopy(item.symbol, item.id)}
            title={item.label}
            className="p-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group relative cursor-pointer"
          >
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 font-mono">
              {item.symbol}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
              {item.label}
            </span>
            {copiedId === item.id && (
              <span className="absolute top-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full">
                <Check className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Auto Chemical Formatter & IUPAC Search Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Tool 1: Auto Formula Subscript Formatter */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            Tự động định dạng Chỉ số Dưới/Trên:
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={formulaInput}
              onChange={(e) => setFormulaInput(e.target.value)}
              placeholder="VD: H2SO4, Fe3+, SO4 2-"
              className="flex-1 px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleCopy(formattedFormula, 'custom_formula')}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedId === 'custom_formula' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{formattedFormula}</span>
            </button>
          </div>
        </div>

        {/* Tool 2: IUPAC Lookup */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tra cứu Danh pháp IUPAC Mới:</span>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Gõ tên cũ hoặc mới: Axit axetic, Đồng sunfat..."
            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
          />

          {filteredIupac.length > 0 && (
            <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
              {filteredIupac.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCopy(`${item.iupac} (${item.formula})`, `iupac_${idx}`)}
                  className="p-1.5 bg-white dark:bg-slate-900 rounded text-xs flex items-center justify-between border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <span className="text-slate-500">{item.traditional} →</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">{item.iupac}</span>
                  <span className="font-mono text-[11px] text-slate-400">{item.formula}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
