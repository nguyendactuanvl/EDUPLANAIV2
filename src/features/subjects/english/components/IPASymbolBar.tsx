/**
 * @file IPASymbolBar.tsx
 * @description Bàn phím ký hiệu ngữ âm quốc tế (IPA) dành cho giáo viên và học sinh Tiếng Anh THPT.
 */

import React, { useState } from 'react';
import { Copy, Check, Volume2, Sparkles } from 'lucide-react';
import { IPA_SYMBOLS } from '../utils/englishHelper';

interface IPASymbolBarProps {
  onInsert?: (char: string) => void;
  className?: string;
}

export const IPASymbolBar: React.FC<IPASymbolBarProps> = ({
  onInsert,
  className = ''
}) => {
  const [copiedChar, setCopiedChar] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'monophthong' | 'diphthong' | 'consonant' | 'stress'>('all');

  const handleCopy = (char: string) => {
    if (onInsert) onInsert(char);
    navigator.clipboard.writeText(char);
    setCopiedChar(char);
    setTimeout(() => setCopiedChar(null), 1500);
  };

  const filtered = filterType === 'all'
    ? IPA_SYMBOLS
    : IPA_SYMBOLS.filter(s => s.type === filterType);

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Bàn phím Ký hiệu Phiên âm Quốc tế (IPA Keyboard)
            </h3>
            <p className="text-[11px] text-slate-500">
              Nhấp để chèn ký tự phiên âm hoặc dấu trọng âm (ˈ, ˌ) vào câu hỏi phát âm
            </p>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'monophthong', 'diphthong', 'consonant', 'stress'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterType === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {type === 'all' ? 'Tất cả' : type === 'monophthong' ? 'Nguyên âm đơn' : type === 'diphthong' ? 'Nguyên âm đôi' : type === 'consonant' ? 'Phụ âm' : 'Trọng âm'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of IPA buttons */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {filtered.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleCopy(s.char)}
            title={`${s.name} - Ví dụ: ${s.example}`}
            className="p-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all group relative cursor-pointer"
          >
            <span className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 font-mono">
              /{s.char}/
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[70px]">
              {s.example}
            </span>
            {copiedChar === s.char && (
              <span className="absolute top-1 right-1 bg-indigo-600 text-white p-0.5 rounded-full">
                <Check className="w-2 h-2" />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
