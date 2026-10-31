/**
 * @file PhysicsView.tsx
 * @description Màn hình chính của Phân hệ Vật lý THPT GDPT 2018 (Physics Toolkit).
 */

import React, { useState } from 'react';
import {
  Zap, Calculator, FileText, Activity, Layers, Sparkles
} from 'lucide-react';
import { PhysicsSymbolBar } from './components/PhysicsSymbolBar';
import { CircuitAndWaveModal } from './components/CircuitAndWaveModal';
import { ExamLayout } from '../shared/components/ExamLayout';
import { StandardExamPaper } from '../shared/types';
import {
  DhoInput, RlcInput, IdealGasThermalInput
} from './types';
import {
  calculateDho, calculateRlc, calculateIdealGasThermal
} from './utils/physicsCalc';

// Mẫu đề thi Vật lý GDPT 2018 chuẩn
const SAMPLE_PHYSICS_EXAM: StandardExamPaper = {
  id: 'PHYSICS_GDPT2018_DEMO',
  subjectId: 'physics',
  title: 'ĐỀ ÔN TẬP KIỂM TRA MÔN VẬT LÝ 12 - CHUẨN GDPT 2018',
  grade: '12',
  durationMinutes: 50,
  schoolYear: '2025 - 2026',
  examCode: 'VL-101',
  description: 'Đề thi gồm 3 phần: Trắc nghiệm 4 lựa chọn, Đúng/Sai và Trả lời ngắn.',
  part1: [
    {
      id: 'p1_1',
      number: 1,
      stem: 'Một vật dao động điều hòa theo phương trình $x = 6\\cos(4\\pi t + \\pi/3)\\,\\text{cm}$. Tần số dao động của vật là:',
      options: ['2 Hz', '4 Hz', '0,5 Hz', '4π Hz'],
      correctAnswer: 'A',
      explanation: 'Tần số $f = \\omega / (2\\pi) = 4\\pi / (2\\pi) = 2\\,\\text{Hz}$.'
    },
    {
      id: 'p1_2',
      number: 2,
      stem: 'Đặt điện áp xoay chiều $u = 200\\sqrt{2}\\cos(100\\pi t)\\,\\text{V}$ vào hai đầu cuộn cảm thuần có độ tự cảm $L = 1/\\pi\\,\\text{H}$. Cảm kháng của cuộn cảm là:',
      options: ['100 Ω', '200 Ω', '50 Ω', '100π Ω'],
      correctAnswer: 'A',
      explanation: '$Z_L = \\omega L = 100\\pi \\cdot (1/\\pi) = 100\\,\\Omega$.'
    },
    {
      id: 'p1_3',
      number: 3,
      stem: 'Hệ thức nào sau đây diễn tả đúng định luật I nhiệt động lực học đối với hệ kín?',
      options: ['$\\Delta U = A + Q$', '$\\Delta U = A - Q$', '$A = \\Delta U + Q$', '$Q = \\Delta U \\cdot A$'],
      correctAnswer: 'A',
      explanation: 'Định luật I nhiệt động lực học: Biến thiên nội năng $\\Delta U = A + Q$.'
    }
  ],
  part2: [
    {
      id: 'p2_1',
      number: 1,
      stem: 'Một khối khí lý tưởng đơn nguyên tử thực hiện quá trình biến đổi trạng thái từ (1) sang (2) có thể tích giảm từ 4 lít xuống 2 lít dưới áp suất không đổi $p = 10^5\\,\\text{Pa}$, đồng thời truyền ra môi trường nhiệt lượng $Q = -350\\,\\text{J}$.',
      statements: [
        { subId: 'a', text: 'Đây là quá trình biến đổi đẳng áp.', isCorrect: true, explanation: 'Áp suất được giữ không đổi $p = 10^5\\,\\text{Pa}$.' },
        { subId: 'b', text: 'Chất khí nhận công từ ngoại lực và có giá trị $A = 200\\,\\text{J}$.', isCorrect: true, explanation: '$A = -p\\Delta V = -10^5 \\cdot (2 - 4) \\cdot 10^{-3} = 200\\,\\text{J}$.' },
        { subId: 'c', text: 'Nhiệt lượng khối khí trao đổi là $Q = +350\\,\\text{J}$.', isCorrect: false, explanation: 'Khí truyền nhiệt ra ngoài nên $Q = -350\\,\\text{J}$.' },
        { subId: 'd', text: 'Nội năng của khối khí giảm một lượng $\\Delta U = -150\\,\\text{J}$.', isCorrect: true, explanation: '$\\Delta U = A + Q = 200 + (-350) = -150\\,\\text{J}$.' }
      ],
      explanation: 'Vận dụng định luật 1 nhiệt động lực học $\\Delta U = A + Q$ và công đẳng áp $A = -p\\Delta V$.'
    }
  ],
  part3: [
    {
      id: 'p3_1',
      number: 1,
      stem: 'Một đoạn mạch xoay chiều RLC nối tiếp gồm $R = 80\\,\\Omega$, $Z_L = 120\\,\\Omega$ và $Z_C = 60\\,\\Omega$. Tổng trở $Z$ của đoạn mạch bằng bao nhiêu ôm (Ω)?',
      correctAnswer: '100',
      unit: 'Ω',
      explanation: '$Z = \\sqrt{R^2 + (Z_L - Z_C)^2} = \\sqrt{80^2 + (120 - 60)^2} = 100\\,\\Omega$.'
    },
    {
      id: 'p3_2',
      number: 2,
      stem: 'Một vật dao động điều hòa với biên độ $A = 5\\,\\text{cm}$ và tần số góc $\\omega = 10\\,\\text{rad/s}$. Tốc độ cực đại $v_{\\max}$ của vật là bao nhiêu cm/s?',
      correctAnswer: '50',
      unit: 'cm/s',
      explanation: '$v_{\\max} = \\omega A = 10 \\cdot 5 = 50\\,\\text{cm/s}$.'
    }
  ]
};

export const PhysicsView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'calc' | 'exam'>('calc');
  const [modalMode, setModalMode] = useState<'circuit' | 'wave' | null>(null);
  const [exam, setExam] = useState<StandardExamPaper>(SAMPLE_PHYSICS_EXAM);

  // Quick Calculator States
  const [dhoInput, setDhoInput] = useState<DhoInput>({ amplitudeA: 5, periodT: 2 });
  const [rlcInput, setRlcInput] = useState<RlcInput>({
    resistanceR: 60,
    inductanceL: 0.255,
    capacitanceC: 0.0000318,
    frequencyF: 50,
    voltageU: 220
  });
  const [gasInput, setGasInput] = useState<IdealGasThermalInput>({
    pressureP: 101325,
    volumeV: 0.0224,
    temperatureK: 273,
    workDoneA: 150,
    heatAddedQ: -50
  });

  const dhoResult = calculateDho(dhoInput);
  const rlcResult = calculateRlc(rlcInput);
  const gasResult = calculateIdealGasThermal(gasInput);

  return (
    <div className="space-y-6">
      {/* Physics Toolbar and Modals Launch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Vật lý THPT GDPT 2018 (Physics Toolkit)
            </h2>
            <p className="text-xs text-slate-500">
              Công cụ tính toán chuyên sâu, bộ gõ ký hiệu vectơ, xuất đồ thị SVG và soạn đề thi 3 phần
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setModalMode('circuit')}
            className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Studio Sơ đồ Mạch điện</span>
          </button>

          <button
            type="button"
            onClick={() => setModalMode('wave')}
            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Studio Đồ thị Sóng & DHO</span>
          </button>
        </div>
      </div>

      {/* Physics Symbols Bar */}
      <PhysicsSymbolBar />

      {/* Switcher: Máy tính nhanh vs Soạn đề */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSection('calc')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            activeSection === 'calc'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Máy tính Vật lý Chuyên sâu (DHO / RLC / Khí lý tưởng & Nhiệt học)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('exam')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            activeSection === 'exam'
              ? 'bg-amber-600 text-white'
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
          {/* 1. Mạch xoay chiều RLC */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                1. Mạch Xoay Chiều RLC Nối Tiếp
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">R (Ω)</label>
                <input
                  type="number"
                  value={rlcInput.resistanceR}
                  onChange={(e) => setRlcInput(p => ({ ...p, resistanceR: Number(e.target.value) }))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">L (H)</label>
                <input
                  type="number"
                  step="0.01"
                  value={rlcInput.inductanceL}
                  onChange={(e) => setRlcInput(p => ({ ...p, inductanceL: Number(e.target.value) }))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">C (F)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={rlcInput.capacitanceC}
                  onChange={(e) => setRlcInput(p => ({ ...p, capacitanceC: Number(e.target.value) }))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">f (Hz)</label>
                <input
                  type="number"
                  value={rlcInput.frequencyF}
                  onChange={(e) => setRlcInput(p => ({ ...p, frequencyF: Number(e.target.value) }))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">U (V)</label>
                <input
                  type="number"
                  value={rlcInput.voltageU}
                  onChange={(e) => setRlcInput(p => ({ ...p, voltageU: Number(e.target.value) }))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                />
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block">Tổng trở Z</span>
                <span className="text-base font-extrabold text-amber-900 dark:text-amber-100">{rlcResult.Z} Ω</span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold block">Dòng điện I</span>
                <span className="text-base font-extrabold text-blue-900 dark:text-blue-100">{rlcResult.I} A</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">Hệ số cos φ</span>
                <span className="text-base font-extrabold text-emerald-900 dark:text-emerald-100">{rlcResult.cosPhi}</span>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl">
                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold block">Cộng hưởng f₀</span>
                <span className="text-base font-extrabold text-purple-900 dark:text-purple-100">{rlcResult.f0Resonance} Hz</span>
              </div>
            </div>
          </div>

          {/* 2. Dao động điều hòa & 3. Khí lý tưởng / Nhiệt học */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* DHO */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  2. Dao Động Điều Hòa
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Biên độ A (cm)</label>
                  <input
                    type="number"
                    value={dhoInput.amplitudeA}
                    onChange={(e) => setDhoInput(p => ({ ...p, amplitudeA: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Chu kỳ T (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dhoInput.periodT || ''}
                    onChange={(e) => setDhoInput(p => ({ ...p, periodT: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block">Vận tốc cực đại</span>
                  <span className="font-extrabold text-blue-600">{dhoResult.vMax} cm/s</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block">Gia tốc cực đại</span>
                  <span className="font-extrabold text-blue-600">{dhoResult.aMax} cm/s²</span>
                </div>
              </div>
            </div>

            {/* Nhiệt học Lớp 12 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  3. Nhiệt Học & Khí Lý Tưởng Lớp 12
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Công A (J)</label>
                  <input
                    type="number"
                    value={gasInput.workDoneA}
                    onChange={(e) => setGasInput(p => ({ ...p, workDoneA: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nhiệt lượng Q (J)</label>
                  <input
                    type="number"
                    value={gasInput.heatAddedQ}
                    onChange={(e) => setGasInput(p => ({ ...p, heatAddedQ: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">
                  Biến thiên nội năng ΔU = A + Q
                </span>
                <span className="text-base font-extrabold text-emerald-900 dark:text-emerald-100">
                  {gasResult.deltaU} J
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Khí nhận công A &gt; 0, sinh công A &lt; 0. Khí nhận nhiệt Q &gt; 0, tỏa nhiệt Q &lt; 0.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: EXAM LAYOUT */}
      {activeSection === 'exam' && (
        <ExamLayout
          exam={exam}
          onChangeExam={setExam}
          subjectLabel="Vật lý"
          accentColorClass="amber"
        />
      )}

      {/* Circuit & Wave SVG Modal */}
      <CircuitAndWaveModal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        initialMode={modalMode || 'circuit'}
      />
    </div>
  );
};
