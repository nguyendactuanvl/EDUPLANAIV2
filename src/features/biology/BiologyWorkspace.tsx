/**
 * @file BiologyWorkspace.tsx
 * @description Container Component điều phối chính cho Module Biology Toolkit (Sinh học THPT GDPT 2018).
 * Hoàn toàn độc lập, plug-and-play, không phụ thuộc vào state hay logic của các môn học khác.
 * 
 * Các Tab chính:
 * Tab 1: Soạn thảo & Ký hiệu (GeneticsSymbolBar + Trình soạn đề GDPT 2018)
 * Tab 2: Vẽ sơ đồ Phả hệ (Pedigree Studio)
 * Tab 3: Máy tính Di truyền & Tế bào (Quick ADN & HWE Calculator)
 */

import React, { useState } from 'react';
import {
  Dna, Calculator, FileText, Share2, Layers, Plus, Sparkles
} from 'lucide-react';
import { GeneticsSymbolBar } from './components/GeneticsSymbolBar';
import { PedigreeGeneratorModal } from './components/PedigreeGeneratorModal';
import { BioExamBuilder } from './components/BioExamBuilder';
import { DnaInputParams, HardyWeinbergInput } from './types/biology.types';
import { calculateDnaProperties, calculateHardyWeinberg } from './utils/geneticsParser';

export function BiologyWorkspace() {
  const [activeTab, setActiveTab] = useState<'editor' | 'pedigree' | 'calculator'>('calculator');
  const [isPedigreeModalOpen, setIsPedigreeModalOpen] = useState(false);

  // Quick Calculator States
  const [dnaInput, setDnaInput] = useState<DnaInputParams>({
    lengthAngstrom: 4080,
    countA: 480
  });

  const [hweInput, setHweInput] = useState<HardyWeinbergInput>({
    countAA: 360,
    countAa: 480,
    countaa: 160
  });

  const dnaResult = calculateDnaProperties(dnaInput);
  const hweResult = calculateHardyWeinberg(hweInput);

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 flex flex-col overflow-y-auto">
      
      {/* Workspace Header */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
              <Dna className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Biology Toolkit GDPT 2018
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Môn Sinh học THPT 10 - 11 - 12
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Bộ công cụ độc lập: Bàn phím ký hiệu di truyền, Trình soạn đề 3 phần, Sơ đồ phả hệ SVG & Máy tính ADN/HWE
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPedigreeModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Sơ Đồ Phả Hệ (Pedigree Studio)</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-5 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'calculator'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Tab 1. Máy tính Di truyền & Tế bào (ADN / HWE)</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tab 2. Soạn thảo Đề GDPT 2018 & Bàn phím Ký hiệu</span>
          </button>

          <button
            onClick={() => setActiveTab('pedigree')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pedigree'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tab 3. Vẽ Sơ Đồ Phả Hệ (Pedigree Studio)</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* TAB 1: QUICK BIO CALCULATOR */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            
            {/* ADN Calculator */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Dna className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Máy Tính Đại Lượng ADN, ARN & Chuỗi Polipeptit
                  </h2>
                  <p className="text-xs text-slate-500">
                    Nhập 1 trong các thông số ($N, L, M, C, A, G$) -&gt; Tự động tính toàn bộ các đại lượng còn lại và liên kết hydro $H = 2A + 3G$
                  </p>
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chiều dài $L$ (Å)
                  </label>
                  <input
                    type="number"
                    value={dnaInput.lengthAngstrom || ''}
                    onChange={(e) => setDnaInput(prev => ({ ...prev, lengthAngstrom: Number(e.target.value) }))}
                    placeholder="4080"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số lượng Nu loại $A$ (hoặc $T$)
                  </label>
                  <input
                    type="number"
                    value={dnaInput.countA || ''}
                    onChange={(e) => setDnaInput(prev => ({ ...prev, countA: Number(e.target.value) }))}
                    placeholder="480"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số lượng Nu loại $G$ (hoặc $C$)
                  </label>
                  <input
                    type="number"
                    value={dnaInput.countG || ''}
                    onChange={(e) => setDnaInput(prev => ({ ...prev, countG: Number(e.target.value) }))}
                    placeholder="720"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tổng số Nu $N$ (Tùy chọn)
                  </label>
                  <input
                    type="number"
                    value={dnaInput.totalNucleotides || ''}
                    onChange={(e) => setDnaInput(prev => ({ ...prev, totalNucleotides: Number(e.target.value) }))}
                    placeholder="2400"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Output Result Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">Tổng số Nu ($N$)</span>
                  <span className="text-lg font-black text-emerald-900 dark:text-emerald-200">{dnaResult.N.toLocaleString()} nu</span>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                  <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block">Chiều dài ($L$)</span>
                  <span className="text-lg font-black text-blue-900 dark:text-blue-200">{dnaResult.L_angstrom.toLocaleString()} Å ({dnaResult.L_nanometer} nm)</span>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
                  <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 block">Số liên kết H</span>
                  <span className="text-lg font-black text-purple-900 dark:text-purple-200">{dnaResult.H_bonds.toLocaleString()} liên kết</span>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">Số aa Polipeptit</span>
                  <span className="text-lg font-black text-amber-900 dark:text-amber-200">{dnaResult.aminoAcidsPolypeptide} aa</span>
                </div>
              </div>

              {/* Steps Explanation */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide block">
                  Các bước giải thích toán học đầy đủ bằng LaTeX:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-mono">
                  {dnaResult.explanationLatex.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold shrink-0">{idx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Hardy - Weinberg Calculator */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Calculator className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Kiểm Tra Trạng Thái Cân Bằng Hardy - Weinberg
                  </h2>
                  <p className="text-xs text-slate-500">
                    Nhập số lượng 3 kiểu gen $AA, Aa, aa$ -&gt; Tính $p(A), q(a)$, kiểm tra $p^2 \cdot q^2 == (2pq/2)^2$ và xuất phương trình cấu trúc di truyền
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số cá thể $AA$
                  </label>
                  <input
                    type="number"
                    value={hweInput.countAA || ''}
                    onChange={(e) => setHweInput(prev => ({ ...prev, countAA: Number(e.target.value) }))}
                    placeholder="360"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số cá thể $Aa$
                  </label>
                  <input
                    type="number"
                    value={hweInput.countAa || ''}
                    onChange={(e) => setHweInput(prev => ({ ...prev, countAa: Number(e.target.value) }))}
                    placeholder="480"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số cá thể $aa$
                  </label>
                  <input
                    type="number"
                    value={hweInput.countaa || ''}
                    onChange={(e) => setHweInput(prev => ({ ...prev, countaa: Number(e.target.value) }))}
                    placeholder="160"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* HWE Results */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 block">Tần số $p(A)$</span>
                  <span className="text-lg font-black text-indigo-900 dark:text-indigo-200">{hweResult.p_alleleA}</span>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 block">Tần số $q(a)$</span>
                  <span className="text-lg font-black text-indigo-900 dark:text-indigo-200">{hweResult.q_allelea}</span>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Cấu trúc quần thể</span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">{hweResult.structureLatex}</span>
                </div>

                <div className={`p-3 rounded-xl border ${hweResult.isEquilibrium ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                  <span className="text-[11px] font-bold block">Trạng thái HWE</span>
                  <span className="text-xs font-extrabold">{hweResult.isEquilibrium ? '✅ Cân bằng di truyền' : '❌ Chưa cân bằng'}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide block">
                  Phân tích quần thể từng bước:
                </span>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 font-mono">
                  {hweResult.explanationLatex.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold shrink-0">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SOẠN THẢO & KÝ HIỆU */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            <GeneticsSymbolBar />
            <BioExamBuilder />
          </div>
        )}

        {/* TAB 3: PEDIGREE STUDIO */}
        {activeTab === 'pedigree' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center space-y-4">
            <div className="max-w-md mx-auto space-y-2">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl inline-block">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Sơ Đồ Phả Hệ Tương Tác (Pedigree Studio)
              </h2>
              <p className="text-xs text-slate-500">
                Tạo sơ đồ phả hệ dạng visual, vẽ tự động đường hôn nhân/con cái, xuất file SVG/PNG cho đề thi GDPT 2018
              </p>
            </div>

            <button
              onClick={() => setIsPedigreeModalOpen(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Khởi tạo / Chỉnh sửa Sơ đồ Phả hệ SVG</span>
            </button>
          </div>
        )}

      </div>

      {/* Modal Sơ đồ Phả hệ */}
      <PedigreeGeneratorModal
        isOpen={isPedigreeModalOpen}
        onClose={() => setIsPedigreeModalOpen(false)}
      />

    </div>
  );
}

export default BiologyWorkspace;
