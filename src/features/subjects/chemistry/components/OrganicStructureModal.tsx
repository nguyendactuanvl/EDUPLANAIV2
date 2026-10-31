/**
 * @file OrganicStructureModal.tsx
 * @description Modal Studio tạo cấu trúc hóa hữu cơ (mạch carbon thẳng, nối đôi, nối ba, vòng benzen & nhóm chức) dạng SVG.
 */

import React, { useState } from 'react';
import { X, Download, Copy, Check, FlaskConical, Atom } from 'lucide-react';
import { OrganicStructureConfig } from '../types';
import { generateOrganicStructureSvg } from '../utils/chemCalc';

interface OrganicStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrganicStructureModal: React.FC<OrganicStructureModalProps> = ({
  isOpen,
  onClose
}) => {
  const [config, setConfig] = useState<OrganicStructureConfig>({
    carbonCount: 4,
    chainType: 'alkane',
    functionalGroup: 'OH'
  });
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentSvg = generateOrganicStructureSvg(config);

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
    a.download = `cau_truc_huu_co_${config.chainType}_${config.functionalGroup}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <Atom className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Studio Vẽ Cấu Trúc Hóa Hữu Cơ (SVG)
              </h3>
              <p className="text-[11px] text-slate-500">
                Tạo mạch carbon, vòng benzen và gắn nhóm chức -OH, -CHO, -COOH, -NH₂...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySvg}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Copy SVG'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSvg}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
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

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Controls */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Tùy biến Mạch & Nhóm chức
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Kiểu liên kết & Khung mạch
                </label>
                <select
                  value={config.chainType}
                  onChange={(e) => setConfig(p => ({ ...p, chainType: e.target.value as any }))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  <option value="alkane">Alkane (Liên kết đơn C-C)</option>
                  <option value="alkene">Alkene (Có liên kết đôi C=C)</option>
                  <option value="alkyne">Alkyne (Có liên kết ba C≡C)</option>
                  <option value="benzene">Vòng Benzen (Nhân thơm C₆H₆)</option>
                </select>
              </div>

              {config.chainType !== 'benzene' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Số lượng nguyên tử Carbon: {config.carbonCount} C
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={config.carbonCount}
                    onChange={(e) => setConfig(p => ({ ...p, carbonCount: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nhóm chức gắn vào mạch
                </label>
                <select
                  value={config.functionalGroup}
                  onChange={(e) => setConfig(p => ({ ...p, functionalGroup: e.target.value as any }))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  <option value="none">Không gắn (Hydrocarbon thuần)</option>
                  <option value="OH">-OH (Nhóm Hydroxyl / Alcohol)</option>
                  <option value="CHO">-CHO (Nhóm Aldehyde)</option>
                  <option value="COOH">-COOH (Nhóm Carboxylic Acid)</option>
                  <option value="NH2">-NH₂ (Nhóm Amino / Amine)</option>
                  <option value="NO2">-NO₂ (Nhóm Nitro)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SVG Preview */}
          <div className="md:col-span-2 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 p-4 min-h-[260px]">
            <div
              className="w-full h-auto flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: currentSvg }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
