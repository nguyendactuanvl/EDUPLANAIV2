/**
 * @file PhysicsWorkspace.tsx
 * @description Container Component điều phối chính cho Module Physics Toolkit (Vật lý THPT GDPT 2018).
 * Hoàn toàn độc lập, plug-and-play, không phụ thuộc vào state hay logic của các môn học khác.
 * 
 * Các Tab chính:
 * Tab 1: Soạn thảo Đề thi & Bàn phím Ký hiệu Vật lý (PhysicsSymbolBar + Trình soạn đề GDPT 2018)
 * Tab 2: Xưởng vẽ Đồ thị & Sơ đồ (Mạch điện RLC, Quang hình Thấu kính & Đồ thị Sóng)
 * Tab 3: Máy tính Vật lý THPT (Dao động điều hòa, Mạch RLC xoay chiều, Thấu kính & Khí lý tưởng)
 */

import React, { useState } from 'react';
import {
  Zap, Calculator, FileText, Share2, Activity, Eye as OpticsIcon, Sparkles
} from 'lucide-react';
import { PhysicsSymbolBar } from './components/PhysicsSymbolBar';
import { CircuitDiagramModal } from './components/CircuitDiagramModal';
import { OscillationGraphModal } from './components/OscillationGraphModal';
import { PhysicsExamBuilder } from './components/PhysicsExamBuilder';
import {
  DhoCalcInput, AcCircuitCalcInput, LensCalcInput, IdealGasInput
} from './types/physics.types';
import {
  calculateDho, calculateAcCircuit, calculateLens, calculateIdealGas
} from './utils/physicsParser';

export function PhysicsWorkspace() {
  const [activeTab, setActiveTab] = useState<'editor' | 'diagrams' | 'calculator'>('calculator');
  const [isCircuitModalOpen, setIsCircuitModalOpen] = useState(false);
  const [isOscillationModalOpen, setIsOscillationModalOpen] = useState(false);

  // Quick Calculator States
  const [dhoInput, setDhoInput] = useState<DhoCalcInput>({ amplitudeA: 10, periodT: 1 });
  const [acInput, setAcInput] = useState<AcCircuitCalcInput>({ resistanceR: 100, inductanceL: 0.318, capacitanceC: 0.0000318, frequencyF: 50, voltageU: 220 });
  const [lensInput, setLensInput] = useState<LensCalcInput>({ focalLength: 20, objectDistance: 35, objectHeight: 10 });
  const [gasInput, setGasInput] = useState<IdealGasInput>({ pressureP: 101325, volumeV: 0.0224, temperatureK: 273 });

  const dhoResult = calculateDho(dhoInput);
  const acResult = calculateAcCircuit(acInput);
  const lensResult = calculateLens(lensInput);
  const gasResult = calculateIdealGas(gasInput);

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 flex flex-col overflow-y-auto">
      
      {/* Workspace Header */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-md shadow-amber-600/20">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Physics Toolkit GDPT 2018
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Môn Vật lý THPT 10 - 11 - 12
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Bộ công cụ độc lập: Bàn phím ký hiệu & vectơ, Trình soạn đề 3 phần, Sơ đồ mạch điện/quang hình SVG & Máy tính RLC/Khí lý tưởng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCircuitModalOpen(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Sơ Đồ Mạch Điện & Quang Hình</span>
            </button>

            <button
              onClick={() => setIsOscillationModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Đồ Thị Dao Động & Sóng</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-5 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'calculator'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Tab 1. Máy tính Vật lý THPT (RLC / Thấu kính / Khí lý tưởng)</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tab 2. Soạn thảo Đề GDPT 2018 & Bàn phím Ký hiệu Vectơ</span>
          </button>

          <button
            onClick={() => setActiveTab('diagrams')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'diagrams'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <OpticsIcon className="w-4 h-4" />
            <span>Tab 3. Xưởng vẽ Sơ đồ Mạch điện, Quang hình & Đồ thị Sóng</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* TAB 1: CALCULATORS */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            
            {/* RLC AC Circuit Calculator */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Zap className="w-5 h-5 text-amber-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Máy Tính Mạch Điện Xoay Chiều RLC Nối Tiếp
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tính Z_L = omega L, Z_C = 1/(omega C), Z = căn bậc hai của (R^2 + (Z_L-Z_C)^2), hệ số công suất cos(phi) và tần số cộng hưởng f_0
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điện trở R (Ω)</label>
                  <input type="number" value={acInput.resistanceR} onChange={(e) => setAcInput(prev => ({ ...prev, resistanceR: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 rounded-xl text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Độ tự cảm L (H)</label>
                  <input type="number" step="0.01" value={acInput.inductanceL} onChange={(e) => setAcInput(prev => ({ ...prev, inductanceL: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 rounded-xl text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điện dung C (F)</label>
                  <input type="number" step="0.000001" value={acInput.capacitanceC} onChange={(e) => setAcInput(prev => ({ ...prev, capacitanceC: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 rounded-xl text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tần số f (Hz)</label>
                  <input type="number" value={acInput.frequencyF} onChange={(e) => setAcInput(prev => ({ ...prev, frequencyF: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 rounded-xl text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điện áp U (V)</label>
                  <input type="number" value={acInput.voltageU} onChange={(e) => setAcInput(prev => ({ ...prev, voltageU: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 rounded-xl text-xs font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-800 block">Tổng trở Z</span>
                  <span className="text-lg font-black text-amber-900">{acResult.Z} Ω</span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-800 block">Dòng điện I</span>
                  <span className="text-lg font-black text-blue-900">{acResult.I} A</span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-800 block">Hệ số cos(phi)</span>
                  <span className="text-lg font-black text-emerald-900">{acResult.cosPhi}</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200">
                  <span className="text-[11px] font-bold text-purple-800 block">Công suất P</span>
                  <span className="text-lg font-black text-purple-900">{acResult.powerP} W</span>
                </div>
              </div>
            </div>

            {/* Thin Lens Calculator */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <OpticsIcon className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Máy Tính Thấu Kính Mỏng & Quang Hình
                  </h2>
                  <p className="text-xs text-slate-500">
                    Áp dụng 1/f = 1/d + 1/d', độ tụ D = 1/f và phóng đại k = -d'/d
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu cự f (cm)</label>
                  <input type="number" value={lensInput.focalLength} onChange={(e) => setLensInput(prev => ({ ...prev, focalLength: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khoảng cách vật d (cm)</label>
                  <input type="number" value={lensInput.objectDistance} onChange={(e) => setLensInput(prev => ({ ...prev, objectDistance: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chiều cao vật h (cm)</label>
                  <input type="number" value={lensInput.objectHeight} onChange={(e) => setLensInput(prev => ({ ...prev, objectHeight: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                  <span className="text-[11px] font-bold text-indigo-800 block">Khoảng cách ảnh d'</span>
                  <span className="text-lg font-black text-indigo-900">{lensResult.imageDistance} cm</span>
                </div>
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                  <span className="text-[11px] font-bold text-indigo-800 block">Hệ số phóng đại k</span>
                  <span className="text-lg font-black text-indigo-900">{lensResult.magnificationK}</span>
                </div>
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                  <span className="text-[11px] font-bold text-indigo-800 block">Chiều cao ảnh h'</span>
                  <span className="text-lg font-black text-indigo-900">{lensResult.imageHeight} cm</span>
                </div>
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                  <span className="text-[11px] font-bold text-indigo-800 block">Tính chất ảnh</span>
                  <span className="text-xs font-extrabold text-indigo-900">{lensResult.isRealImage ? 'Ảnh thật' : 'Ảnh ảo'}, {lensResult.isErect ? 'Cùng chiều' : 'Ngược chiều'}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SOẠN THẢO & KÝ HIỆU */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            <PhysicsSymbolBar />
            <PhysicsExamBuilder />
          </div>
        )}

        {/* TAB 3: XƯỞNG VẼ SƠ ĐỒ & ĐỒ THỊ */}
        {activeTab === 'diagrams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center space-y-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl inline-block">
                <Zap className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Sơ Đồ Mạch Điện & Quang Hình (SVG)
              </h2>
              <p className="text-xs text-slate-500">
                Tạo sơ đồ mạch điện RLC nối tiếp/song song và đường truyền tia sáng thấu kính
              </p>
              <button
                onClick={() => setIsCircuitModalOpen(true)}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Mở Studio Sơ Đồ Mạch Điện & Quang Hình</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center space-y-4">
              <div className="p-3 bg-blue-100 text-blue-800 rounded-2xl inline-block">
                <Activity className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Đồ Thị Dao Động & Sóng Cơ (SVG)
              </h2>
              <p className="text-xs text-slate-500">
                Vẽ đồ thị li độ x(t), v(t), a(t) và sóng cơ hình sin chuẩn lưới milimét
              </p>
              <button
                onClick={() => setIsOscillationModalOpen(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Mở Studio Đồ Thị Dao Động & Sóng</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      <CircuitDiagramModal
        isOpen={isCircuitModalOpen}
        onClose={() => setIsCircuitModalOpen(false)}
      />

      <OscillationGraphModal
        isOpen={isOscillationModalOpen}
        onClose={() => setIsOscillationModalOpen(false)}
      />

    </div>
  );
}

export default PhysicsWorkspace;
