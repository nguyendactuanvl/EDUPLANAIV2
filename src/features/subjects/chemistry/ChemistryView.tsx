/**
 * @file ChemistryView.tsx
 * @description Màn hình chính của Phân hệ Hóa học THPT GDPT 2018 (Chemistry Toolkit).
 */

import React, { useState } from 'react';
import {
  FlaskConical, Calculator, FileText, Atom, Flame, Zap
} from 'lucide-react';
import { ChemSymbolBar } from './components/ChemSymbolBar';
import { OrganicStructureModal } from './components/OrganicStructureModal';
import { ExamLayout } from '../shared/components/ExamLayout';
import { StandardExamPaper } from '../shared/types';
import {
  EnthalpyCalculationInput, EquilibriumAndPhInput, GalvanicCellInput
} from './types';
import {
  calculateEnthalpy, calculateEquilibriumAndPh, calculateGalvanicCell
} from './utils/chemCalc';

// Mẫu đề thi Hóa học GDPT 2018 chuẩn
const SAMPLE_CHEM_EXAM: StandardExamPaper = {
  id: 'CHEMISTRY_GDPT2018_DEMO',
  subjectId: 'chemistry',
  title: 'ĐỀ ÔN TẬP KIỂM TRA MÔN HÓA HỌC 12 - CHUẨN GDPT 2018',
  grade: '12',
  durationMinutes: 50,
  schoolYear: '2025 - 2026',
  examCode: 'HH-201',
  description: 'Đề thi 3 phần chuẩn: Nhiệt hóa học, Hóa hữu cơ, Cân bằng hóa học & Pin điện hóa.',
  part1: [
    {
      id: 'cp1_1',
      number: 1,
      stem: 'Tên thay thế theo danh pháp IUPAC của hợp chất $CH_3COOH$ là gì?',
      options: ['Acetic acid', 'Methanoic acid', 'Ethanal', 'Ethanol'],
      correctAnswer: 'A',
      explanation: 'Hợp chất $CH_3COOH$ có tên thông thường là axit axetic, tên IUPAC là acetic acid (hoặc ethanoic acid).'
    },
    {
      id: 'cp1_2',
      number: 2,
      stem: 'Cho phản ứng hóa học: $N_2(g) + 3H_2(g) \\rightleftharpoons 2NH_3(g)$ có $\\Delta_r H^\\circ_{298} = -92\\,\\text{kJ}$. Đây là phản ứng:',
      options: ['Tỏa nhiệt', 'Thu nhiệt', 'Không trao đổi nhiệt', 'Phản ứng quang hóa'],
      correctAnswer: 'A',
      explanation: 'Vì $\\Delta_r H^\\circ_{298} = -92\\,\\text{kJ} < 0$ nên đây là phản ứng tỏa nhiệt.'
    },
    {
      id: 'cp1_3',
      number: 3,
      stem: 'Pin điện hóa Daniell (Zn - Cu) có thế điện cực chuẩn $E^\\circ_{Zn^{2+}/Zn} = -0,76\\,\\text{V}$ và $E^\\circ_{Cu^{2+}/Cu} = +0,34\\,\\text{V}$. Sức điện động chuẩn của pin là:',
      options: ['1,10 V', '0,42 V', '-1,10 V', '0,76 V'],
      correctAnswer: 'A',
      explanation: '$E^\\circ_{\\text{pin}} = E^\\circ_{\\text{catot}} - E^\\circ_{\\text{anot}} = 0,34 - (-0,76) = 1,10\\,\\text{V}$.'
    }
  ],
  part2: [
    {
      id: 'cp2_1',
      number: 1,
      stem: 'Cho dung dịch axit axetic (acetic acid, $CH_3COOH$) $0,1\\,\\text{M}$ có hằng số phân li axit $K_a = 1,75 \\times 10^{-5}$ ở $25^\\circ\\text{C}$. Xét tính đúng/sai của các nhận định sau:',
      statements: [
        { subId: 'a', text: 'Acetic acid là một axit yếu, điện li không hoàn toàn trong nước.', isCorrect: true, explanation: 'Axit axetic là chất điện li yếu có Ka << 1.' },
        { subId: 'b', text: 'Giá trị pH của dung dịch trên xấp xỉ bằng 1,0.', isCorrect: false, explanation: '[H+] = sqrt(Ka * C) = sqrt(1.75e-5 * 0.1) = 1.32e-3 M => pH ≈ 2.88 (không thể bằng 1.0).' },
        { subId: 'c', text: 'Khi nhỏ vài giọt quỳ tím vào dung dịch thì quỳ tím hóa đỏ (hoặc hồng).', isCorrect: true, explanation: 'Môi trường axit pH < 7 làm quỳ tím hóa đỏ nhạt.' },
        { subId: 'd', text: 'Khi thêm một lượng muối $CH_3COONa$ vào dung dịch, cân bằng điện li dịch chuyển theo chiều thuận.', isCorrect: false, explanation: 'Theo nguyên lí Le Chatelier, thêm ion CH3COO- làm cân bằng dịch chuyển theo chiều nghịch.' }
      ],
      explanation: 'Cân bằng điện li axit yếu trong dung dịch nước.'
    }
  ],
  part3: [
    {
      id: 'cp3_1',
      number: 1,
      stem: 'Dung dịch $HCl$ có nồng độ $0,001\\,\\text{M}$. Giá trị pH của dung dịch này bằng bao nhiêu?',
      correctAnswer: '3',
      unit: '',
      explanation: '$[H^+] = 10^{-3}\\,\\text{M} \\Rightarrow \\text{pH} = -\\log(10^{-3}) = 3$.'
    },
    {
      id: 'cp3_2',
      number: 2,
      stem: 'Cho phản ứng: $H_2(g) + Cl_2(g) \\rightarrow 2HCl(g)$. Năng lượng liên kết $E_b(H-H) = 436\\,\\text{kJ/mol}$, $E_b(Cl-Cl) = 243\\,\\text{kJ/mol}$, $E_b(H-Cl) = 432\\,\\text{kJ/mol}$. Biến thiên enthalpy chuẩn của phản ứng bằng bao nhiêu kJ?',
      correctAnswer: '-185',
      unit: 'kJ',
      explanation: '$\\Delta_r H^\\circ_{298} = E_b(H-H) + E_b(Cl-Cl) - 2 \\cdot E_b(H-Cl) = 436 + 243 - 2 \\cdot 432 = -185\\,\\text{kJ}$.'
    }
  ]
};

export const ChemistryView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'calc' | 'exam'>('calc');
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [exam, setExam] = useState<StandardExamPaper>(SAMPLE_CHEM_EXAM);

  // Enthalpy Calculator States
  const [enthalpyInput, setEnthalpyInput] = useState<EnthalpyCalculationInput>({
    calcMethod: 'formation',
    reactants: [
      { name: 'CH₄(g)', coeff: 1, value: -74.8 },
      { name: 'O₂(g)', coeff: 2, value: 0 }
    ],
    products: [
      { name: 'CO₂(g)', coeff: 1, value: -393.5 },
      { name: 'H₂O(l)', coeff: 2, value: -285.8 }
    ]
  });

  // pH Calculator States
  const [phAcidConc, setPhAcidConc] = useState(0.01);

  // Galvanic Cell States
  const [galvanicInput, setGalvanicInput] = useState<GalvanicCellInput>({
    anodeName: 'Zn²⁺/Zn',
    anodePotential: -0.76,
    cathodeName: 'Cu²⁺/Cu',
    cathodePotential: 0.34
  });

  const enthalpyResult = calculateEnthalpy(enthalpyInput);
  const phResult = calculateEquilibriumAndPh({ reactionType: 'strong_acid', cM: phAcidConc });
  const galvanicResult = calculateGalvanicCell(galvanicInput);

  return (
    <div className="space-y-6">
      {/* Chemistry Header and Modal Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Hóa học THPT GDPT 2018 (Chemistry Toolkit)
            </h2>
            <p className="text-xs text-slate-500">
              Tra cứu IUPAC, format công thức, tính Enthalpy, pH, Pin điện hóa & Studio vẽ cấu trúc hữu cơ SVG
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsStructureModalOpen(true)}
          className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Atom className="w-4 h-4" />
          <span>Studio Cấu Trúc Hữu Cơ (SVG)</span>
        </button>
      </div>

      {/* Chem Symbol & IUPAC Bar */}
      <ChemSymbolBar />

      {/* Section Switcher */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSection('calc')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            activeSection === 'calc'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Máy tính Hóa học GDPT 2018 (Enthalpy Δr H° / pH / Pin điện hóa)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('exam')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            activeSection === 'exam'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Soạn & Xuất Đề thi GDPT 2018 (3 Phần)</span>
        </button>
      </div>

      {/* SECTION 1: CALCULATORS */}
      {activeSection === 'calc' && (
        <div className="space-y-6">
          {/* 1. Máy tính Enthalpy */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  1. Tính Biến Thiên Enthalpy Chuẩn Phản Ứng (Δr H°₂₉₈)
                </h3>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setEnthalpyInput(p => ({ ...p, calcMethod: 'formation' }))}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    enthalpyInput.calcMethod === 'formation'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                  }`}
                >
                  Theo nhiệt tạo thành Δf H°₂₉₈
                </button>
                <button
                  type="button"
                  onClick={() => setEnthalpyInput(p => ({ ...p, calcMethod: 'bond_energy' }))}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    enthalpyInput.calcMethod === 'bond_energy'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                  }`}
                >
                  Theo năng lượng liên kết Eb
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Chất đầu phản ứng:</span>
                {enthalpyInput.reactants.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-slate-600 w-24 truncate">{r.name}</span>
                    <span className="text-slate-400">hệ số:</span>
                    <input
                      type="number"
                      value={r.coeff}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const next = [...enthalpyInput.reactants];
                        next[i].coeff = val;
                        setEnthalpyInput(p => ({ ...p, reactants: next }));
                      }}
                      className="w-14 px-1.5 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center"
                    />
                    <span className="text-slate-400">kJ/mol:</span>
                    <input
                      type="number"
                      value={r.value}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const next = [...enthalpyInput.reactants];
                        next[i].value = val;
                        setEnthalpyInput(p => ({ ...p, reactants: next }));
                      }}
                      className="w-20 px-1.5 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center"
                    />
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Sản phẩm phản ứng:</span>
                {enthalpyInput.products.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-slate-600 w-24 truncate">{p.name}</span>
                    <span className="text-slate-400">hệ số:</span>
                    <input
                      type="number"
                      value={p.coeff}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const next = [...enthalpyInput.products];
                        next[i].coeff = val;
                        setEnthalpyInput(prev => ({ ...prev, products: next }));
                      }}
                      className="w-14 px-1.5 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center"
                    />
                    <span className="text-slate-400">kJ/mol:</span>
                    <input
                      type="number"
                      value={p.value}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const next = [...enthalpyInput.products];
                        next[i].value = val;
                        setEnthalpyInput(prev => ({ ...prev, products: next }));
                      }}
                      className="w-20 px-1.5 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Enthalpy result badge */}
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block uppercase tracking-wider">
                  Kết quả tính Δr H°₂₉₈:
                </span>
                <span className="text-xl font-extrabold text-emerald-950 dark:text-emerald-100 font-mono">
                  {enthalpyResult.deltaRH298} kJ
                </span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                enthalpyResult.isExothermic
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
              }`}>
                {enthalpyResult.isExothermic ? 'Phản ứng Tỏa nhiệt (ΔH < 0)' : 'Phản ứng Thu nhiệt (ΔH > 0)'}
              </span>
            </div>
          </div>

          {/* 2. pH & 3. Pin điện hóa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* pH dung dịch */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  2. Tính Nhanh pH Dung Dịch Axit/Bazơ
                </h3>
              </div>
              <div className="text-xs space-y-2">
                <label className="block text-[11px] font-semibold text-slate-500">
                  Nồng độ mol/L dung dịch axit mạnh (VD: HCl, HNO₃):
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={phAcidConc}
                  onChange={(e) => setPhAcidConc(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block">pH = -log[H⁺]</span>
                  <span className="text-lg font-extrabold text-emerald-600">{phResult.pH}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block">pOH = 14 - pH</span>
                  <span className="text-lg font-extrabold text-slate-600">{phResult.pOH}</span>
                </div>
              </div>
            </div>

            {/* Pin điện hóa Lớp 12 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  3. Sức Điện Động Chuẩn Pin Điện Hóa (Lớp 12)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">E° Anot (-)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={galvanicInput.anodePotential}
                    onChange={(e) => setGalvanicInput(p => ({ ...p, anodePotential: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">E° Catot (+)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={galvanicInput.cathodePotential}
                    onChange={(e) => setGalvanicInput(p => ({ ...p, cathodePotential: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">
                  E°pin = E°catot - E°anot
                </span>
                <span className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100 font-mono">
                  {galvanicResult.eCellStandard} V
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  {galvanicResult.isSpontaneous ? 'Phản ứng pin diễn ra tự phát.' : 'Phản ứng không tự diễn biến.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: EXAM BUILDER */}
      {activeSection === 'exam' && (
        <ExamLayout
          exam={exam}
          onChangeExam={setExam}
          subjectLabel="Hóa học"
          accentColorClass="emerald"
        />
      )}

      {/* Organic Structure SVG Modal */}
      <OrganicStructureModal
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
      />
    </div>
  );
};
