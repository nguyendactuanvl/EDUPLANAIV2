/**
 * @file CircuitAndWaveModal.tsx
 * @description Modal Studio trực quan để vẽ và xuất sơ đồ mạch điện & đồ thị dao động/sóng cơ dạng SVG.
 */

import React, { useState } from 'react';
import { X, Download, Copy, Check, Zap, Activity } from 'lucide-react';
import { CircuitConfig, WaveGraphConfig } from '../types';
import { generateCircuitSvg, generateWaveGraphSvg } from '../utils/physicsCalc';

interface CircuitAndWaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'circuit' | 'wave';
}

export const CircuitAndWaveModal: React.FC<CircuitAndWaveModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'circuit'
}) => {
  const [mode, setMode] = useState<'circuit' | 'wave'>(initialMode);
  const [copied, setCopied] = useState(false);

  // Circuit states
  const [circuitConfig, setCircuitConfig] = useState<CircuitConfig>({
    type: 'series',
    hasR: true,
    hasL: true,
    hasC: true,
    hasAmmeter: true,
    hasVoltmeter: false,
    hasSwitch: true,
    isSwitchClosed: true,
    sourceVoltage: 220
  });

  // Wave states
  const [waveConfig, setWaveConfig] = useState<WaveGraphConfig>({
    graphType: 'dho_x',
    amplitudeA: 5,
    periodT: 2,
    wavelengthLambda: 20,
    phasePhi: 0
  });

  if (!isOpen) return null;

  const currentSvg = mode === 'circuit'
    ? generateCircuitSvg(circuitConfig)
    : generateWaveGraphSvg(waveConfig);

  const handleCopySvg = async () => {
    await navigator.clipboard.writeText(currentSvg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([currentSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'circuit' ? 'so_do_mach_dien_rlc.svg' : 'do_thi_dao_dong_song.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('circuit')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'circuit'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Sơ đồ Mạch điện RLC</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('wave')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'wave'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Đồ thị Dao động & Sóng cơ</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySvg}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Copy mã SVG'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSvg}
              className="px-3 py-1.5 text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file SVG</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Controls Column */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {mode === 'circuit' ? 'Cấu hình Phần tử Mạch' : 'Thông số Sóng / Dao động'}
            </h4>

            {mode === 'circuit' ? (
              <div className="space-y-2.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={circuitConfig.hasR}
                    onChange={(e) => setCircuitConfig(p => ({ ...p, hasR: e.target.checked }))}
                    className="rounded text-amber-600"
                  />
                  <span>Điện trở thuần R</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={circuitConfig.hasL}
                    onChange={(e) => setCircuitConfig(p => ({ ...p, hasL: e.target.checked }))}
                    className="rounded text-amber-600"
                  />
                  <span>Cuộn cảm thuần L</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={circuitConfig.hasC}
                    onChange={(e) => setCircuitConfig(p => ({ ...p, hasC: e.target.checked }))}
                    className="rounded text-amber-600"
                  />
                  <span>Tụ điện C</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={circuitConfig.hasAmmeter}
                    onChange={(e) => setCircuitConfig(p => ({ ...p, hasAmmeter: e.target.checked }))}
                    className="rounded text-amber-600"
                  />
                  <span>Ampe kế (A)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={circuitConfig.hasVoltmeter}
                    onChange={(e) => setCircuitConfig(p => ({ ...p, hasVoltmeter: e.target.checked }))}
                    className="rounded text-amber-600"
                  />
                  <span>Vôn kế (V)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={circuitConfig.isSwitchClosed}
                    onChange={(e) => setCircuitConfig(p => ({ ...p, isSwitchClosed: e.target.checked }))}
                    className="rounded text-amber-600"
                  />
                  <span>Trạng thái khóa K ({circuitConfig.isSwitchClosed ? 'Đóng' : 'Mở'})</span>
                </label>

                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Điện áp nguồn U (V)
                  </label>
                  <input
                    type="number"
                    value={circuitConfig.sourceVoltage}
                    onChange={(e) => setCircuitConfig(p => ({ ...p, sourceVoltage: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Loại đồ thị
                  </label>
                  <select
                    value={waveConfig.graphType}
                    onChange={(e) => setWaveConfig(p => ({ ...p, graphType: e.target.value as any }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    <option value="dho_x">Li độ theo thời gian x(t)</option>
                    <option value="dho_v">Vận tốc theo thời gian v(t)</option>
                    <option value="wave_sine">Sóng cơ hình sin u(x)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Biên độ A (cm): {waveConfig.amplitudeA} cm
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={waveConfig.amplitudeA}
                    onChange={(e) => setWaveConfig(p => ({ ...p, amplitudeA: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Chu kỳ T (s): {waveConfig.periodT} s
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={waveConfig.periodT}
                    onChange={(e) => setWaveConfig(p => ({ ...p, periodT: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Pha ban đầu φ (rad): {(waveConfig.phasePhi / Math.PI).toFixed(2)}π
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={2 * Math.PI}
                    step={Math.PI / 6}
                    value={waveConfig.phasePhi}
                    onChange={(e) => setWaveConfig(p => ({ ...p, phasePhi: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SVG Preview Column */}
          <div className="md:col-span-2 flex flex-col">
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 flex items-center justify-center min-h-[320px]">
              <div
                className="w-full h-auto max-h-[400px] flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: currentSvg }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Lưới ô chuẩn milimet giúp học sinh và giáo viên dễ dàng đọc tọa độ và chu kỳ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
