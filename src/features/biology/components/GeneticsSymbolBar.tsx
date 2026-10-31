/**
 * @file GeneticsSymbolBar.tsx
 * @description Thanh công cụ ký hiệu di truyền Sinh học THPT (♀, ♂, P, F₁, F₂, B_c, ×, 2n+1, 2n-1, AB/ab, C₃, C₄, CAM, Operon Lac...).
 * Hỗ trợ 2 chế độ:
 * 1. Click sao chép vào Clipboard (kèm Toast)
 * 2. Callback `onInsert(symbol)` chèn trực tiếp vào vị trí con trỏ trong ô soạn thảo hiện tại.
 */

import React, { useState } from 'react';
import { Copy, Check, Dna, FileCode, Sparkles, HelpCircle } from 'lucide-react';
import { formatGenotypeToLatex, genotypeToOMML } from '../utils/geneticsParser';
import { GeneticSymbolItem } from '../types/biology.types';

interface GeneticsSymbolBarProps {
  onInsert?: (symbol: string) => void; // Callback chèn ký hiệu vào văn bản hiện tại
  className?: string;
}

const GENETIC_SYMBOL_ITEMS: GeneticSymbolItem[] = [
  // 1. Ký hiệu di truyền & Giới tính
  { id: 'female', label: 'Cái', symbol: '♀', latex: '$♀$', category: 'symbol', description: 'Giao tử / Cá thể cái' },
  { id: 'male', label: 'Đực', symbol: '♂', latex: '$♂$', category: 'symbol', description: 'Giao tử / Cá thể đực' },
  { id: 'cross', label: 'Phép lai', symbol: '×', latex: '$\\times$', category: 'symbol', description: 'Dấu phép lai' },
  { id: 'p_parent', label: 'Thế hệ P', symbol: 'P', latex: '$P$', category: 'symbol', description: 'Thế hệ bố mẹ P' },
  { id: 'p_tc', label: 'P thuần chủng', symbol: 'P_tc', latex: '$P_{tc}$', category: 'symbol', description: 'P thuần chủng' },
  { id: 'f1', label: 'Thế hệ F₁', symbol: 'F₁', latex: '$F_1$', category: 'symbol', description: 'Thế hệ con lai F1' },
  { id: 'f2', label: 'Thế hệ F₂', symbol: 'F₂', latex: '$F_2$', category: 'symbol', description: 'Thế hệ con lai F2' },
  { id: 'bc', label: 'Lai phân tích B_c', symbol: 'B_c', latex: '$B_c$', category: 'symbol', description: 'Phép lai phân tích Backcross' },
  { id: 'trisomy', label: 'Thể một 2n-1', symbol: '2n-1', latex: '$2n-1$', category: 'symbol', description: 'Đột biến thể một' },
  { id: 'monosomy', label: 'Thể ba 2n+1', symbol: '2n+1', latex: '$2n+1$', category: 'symbol', description: 'Đột biến thể ba' },

  // 2. Kiểu gen mẫu & Hoán vị
  { id: 'gt_ab_ab', label: 'AB/ab (Đồng dị)', symbol: 'AB/ab', latex: '$\\frac{AB}{ab}$', category: 'genotype', description: 'Kiểu gen dị hợp 2 cặp dị dị' },
  { id: 'gt_ab_ab2', label: 'Ab/aB (Dị chéo)', symbol: 'Ab/aB', latex: '$\\frac{Ab}{aB}$', category: 'genotype', description: 'Kiểu gen dị hợp 2 cặp dị chéo' },
  { id: 'gt_xaxa', label: 'X^A X^a', symbol: 'X^A X^a', latex: '$X^A X^a$', category: 'genotype', description: 'Cái dị hợp liên kết giới tính' },
  { id: 'gt_xay', label: 'X^a Y', symbol: 'X^a Y', latex: '$X^a Y$', category: 'genotype', description: 'Đực mang gen lặn trên X' },

  // 3. Chu trình & Cụm từ thuật ngữ
  { id: 'term_c3', label: 'Chu trình C₃', symbol: 'C₃', latex: 'C₃ (Calvin)', category: 'term', description: 'Thực vật C3' },
  { id: 'term_c4', label: 'Chu trình C₄', symbol: 'C₄', latex: 'C₄ (Hatch-Slack)', category: 'term', description: 'Thực vật C4' },
  { id: 'term_cam', label: 'Thực vật CAM', symbol: 'CAM', latex: 'Chu trình CAM', category: 'term', description: 'Thực vật mọng nước' },
  { id: 'term_operon', label: 'Operon Lac', symbol: 'Operon Lac', latex: 'Operon Lac (E. coli)', category: 'term', description: 'Cụm gen điều hòa Operon Lac' },
  { id: 'term_hwe', label: 'Hardy - Weinberg', symbol: 'Hardy - Weinberg', latex: 'Định luật Hardy - Weinberg', category: 'term', description: 'Cân bằng di truyền quần thể' }
];

export const GeneticsSymbolBar: React.FC<GeneticsSymbolBarProps> = ({ onInsert, className = '' }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'symbol' | 'genotype' | 'term'>('all');

  // Form custom kiểu gen phân số
  const [customTop, setCustomTop] = useState('AB');
  const [customBottom, setCustomBottom] = useState('ab');
  const [customFreq, setCustomFreq] = useState('20');
  const [showOmmlBox, setShowOmmlBox] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleSelectSymbol = (latexText: string, itemId: string, itemLabel: string) => {
    // 1. Gọi callback chèn nếu có
    if (onInsert) {
      onInsert(latexText);
    }
    // 2. Sao chép vào Clipboard
    navigator.clipboard.writeText(latexText);
    setCopiedId(itemId);
    showToast(`Đã sao chép "${itemLabel}" (${latexText}) vào Clipboard!`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCustomFractionInsert = () => {
    let str = `${customTop.trim()}/${customBottom.trim()}`;
    if (customFreq.trim()) {
      str += `, f=${customFreq.trim()}%`;
    }
    const formattedLatex = formatGenotypeToLatex(str);
    handleSelectSymbol(formattedLatex, 'custom_frac', `Kiểu gen ${str}`);
  };

  const filteredItems = selectedCategory === 'all'
    ? GENETIC_SYMBOL_ITEMS
    : GENETIC_SYMBOL_ITEMS.filter(item => item.category === selectedCategory);

  const customLatexPreview = formatGenotypeToLatex(`${customTop}/${customBottom}${customFreq ? `, f=${customFreq}%` : ''}`);
  const customOmmlSnippet = genotypeToOMML(`${customTop}/${customBottom}`);

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 ${className}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-emerald-400 px-4 py-2.5 rounded-xl shadow-xl font-medium text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <Dna className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Genetics Notation Pad (Bàn Phím Ký Hiệu Di Truyền)
            </h3>
            <p className="text-[11px] text-slate-500">
              Nhấp để chèn trực tiếp hoặc sao chép ký hiệu di truyền ♀, ♂, P, F₁, F₂, AB/ab, Operon Lac vào đề thi
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
              ? 'bg-emerald-600 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tất cả ký hiệu
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('symbol')}
          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
            selectedCategory === 'symbol'
              ? 'bg-emerald-600 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          ♀ Giới tính & Đột biến (2n+1, 2n-1)
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('genotype')}
          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
            selectedCategory === 'genotype'
              ? 'bg-emerald-600 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {"$\\frac{AB}{ab}$ Kiểu gen phân số"}
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('term')}
          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
            selectedCategory === 'term'
              ? 'bg-emerald-600 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          C₃, C₄, Operon Lac, HWE
        </button>
      </div>

      {/* Quick Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelectSymbol(item.latex, item.id, item.label)}
            className="p-2.5 bg-slate-50 hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-400 rounded-xl flex flex-col items-center justify-between gap-1 transition-all group cursor-pointer text-center relative"
            title={item.description}
          >
            <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">
              {item.symbol}
            </span>
            <span className="text-[10px] text-slate-500 line-clamp-1">
              {item.label}
            </span>

            {copiedId === item.id ? (
              <span className="absolute top-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full">
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

      {/* Section 2: Custom Genotype Fraction Builder */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Tạo Kiểu Gen Hoán Vị {"($\\frac{AB}{ab}$, $f\\%$)"}
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
            Tự động bọc KaTeX $...$
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Tử số (Alen trên)</label>
            <input
              type="text"
              value={customTop}
              onChange={(e) => setCustomTop(e.target.value)}
              placeholder="AB"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Mẫu số (Alen dưới)</label>
            <input
              type="text"
              value={customBottom}
              onChange={(e) => setCustomBottom(e.target.value)}
              placeholder="ab"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Tần số f (%) - Tùy chọn</label>
            <input
              type="text"
              value={customFreq}
              onChange={(e) => setCustomFreq(e.target.value)}
              placeholder="20"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleCustomFractionInsert}
            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            {copiedId === 'custom_frac' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Chèn / Sao chép KaTeX</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs bg-emerald-50/60 border border-emerald-200 px-3 py-2 rounded-lg text-emerald-900">
          <span className="font-semibold text-[11px] text-emerald-800 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            Xem trước mã KaTeX:
          </span>
          <code className="font-mono text-xs font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
            {customLatexPreview}
          </code>
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
          <pre className="p-2 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded overflow-x-auto max-h-24">
            {customOmmlSnippet}
          </pre>
        </div>
      )}

    </div>
  );
};
