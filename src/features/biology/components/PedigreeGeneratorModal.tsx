/**
 * @file PedigreeGeneratorModal.tsx
 * @description Modal tạo sơ đồ phả hệ mini bằng SVG (Pedigree Builder Studio) cho Sinh học THPT.
 * Hỗ trợ thêm/sửa/xóa cá thể, liên kết hôn nhân/con cái, xuất file .SVG, .PNG và sao chép mã nhúng SVG.
 */

import React, { useState, useRef } from 'react';
import { X, Download, Copy, Plus, Trash2, Edit2, Share2, Check, Eye } from 'lucide-react';
import { PedigreeData, PedigreeIndividual, PedigreeGender, PedigreePhenotype } from '../types/biology.types';
import { generatePedigreeSvgString } from '../utils/geneticsParser';

interface PedigreeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToExam?: (svgMarkup: string) => void;
}

const DEFAULT_PEDIGREE_DATA: PedigreeData = {
  title: 'Phả hệ Bệnh Máu Khó Đông (Gen lặn trên NST X)',
  diseaseName: 'Máu khó đông (Hemophilia)',
  inheritanceType: 'x_linked_recessive',
  individuals: [
    { id: 'I-1', generation: 1, order: 1, gender: 'male', phenotype: 'normal', genotype: 'X^A Y', spouseId: 'I-2' },
    { id: 'I-2', generation: 1, order: 2, gender: 'female', phenotype: 'carrier', genotype: 'X^A X^a', spouseId: 'I-1' },

    { id: 'II-1', generation: 2, order: 1, gender: 'female', phenotype: 'normal', genotype: 'X^A X^A', fatherId: 'I-1', motherId: 'I-2' },
    { id: 'II-2', generation: 2, order: 2, gender: 'male', phenotype: 'affected', genotype: 'X^a Y', fatherId: 'I-1', motherId: 'I-2' },
    { id: 'II-3', generation: 2, order: 3, gender: 'female', phenotype: 'carrier', genotype: 'X^A X^a', fatherId: 'I-1', motherId: 'I-2', spouseId: 'II-4' },
    { id: 'II-4', generation: 2, order: 4, gender: 'male', phenotype: 'normal', genotype: 'X^A Y', spouseId: 'II-3' },

    { id: 'III-1', generation: 3, order: 1, gender: 'male', phenotype: 'affected', genotype: 'X^a Y', fatherId: 'II-4', motherId: 'II-3' },
    { id: 'III-2', generation: 3, order: 2, gender: 'female', phenotype: 'normal', genotype: 'X^A X^-', fatherId: 'II-4', motherId: 'II-3' }
  ]
};

export const PedigreeGeneratorModal: React.FC<PedigreeGeneratorModalProps> = ({
  isOpen,
  onClose,
  onInsertToExam
}) => {
  const [pedigree, setPedigree] = useState<PedigreeData>(DEFAULT_PEDIGREE_DATA);
  const [editingIndId, setEditingIndId] = useState<string | null>(null);
  const [copiedSvg, setCopiedSvg] = useState(false);

  // Form thêm/sửa cá thể
  const [formId, setFormId] = useState('III-3');
  const [formGen, setFormGen] = useState<number>(3);
  const [formGender, setFormGender] = useState<PedigreeGender>('male');
  const [formPhenotype, setFormPhenotype] = useState<PedigreePhenotype>('normal');
  const [formGenotype, setFormGenotype] = useState('');
  const [formFatherId, setFormFatherId] = useState('');
  const [formMotherId, setFormMotherId] = useState('');
  const [formSpouseId, setFormSpouseId] = useState('');

  const svgContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentSvgString = generatePedigreeSvgString(pedigree);

  // Thêm cá thể mới
  const handleAddIndividual = () => {
    if (!formId.trim()) return;

    const newInd: PedigreeIndividual = {
      id: formId.trim(),
      generation: Number(formGen),
      order: pedigree.individuals.filter(i => i.generation === Number(formGen)).length + 1,
      gender: formGender,
      phenotype: formPhenotype,
      genotype: formGenotype.trim() || undefined,
      fatherId: formFatherId.trim() || undefined,
      motherId: formMotherId.trim() || undefined,
      spouseId: formSpouseId.trim() || undefined
    };

    setPedigree(prev => ({
      ...prev,
      individuals: [...prev.individuals.filter(i => i.id !== newInd.id), newInd]
    }));

    setEditingIndId(null);
    setFormId(`III-${pedigree.individuals.length + 2}`);
    setFormGenotype('');
  };

  // Xóa cá thể
  const handleDeleteIndividual = (id: string) => {
    setPedigree(prev => ({
      ...prev,
      individuals: prev.individuals.filter(i => i.id !== id)
    }));
  };

  // Nạp thông tin để sửa
  const handleEditIndividual = (ind: PedigreeIndividual) => {
    setEditingIndId(ind.id);
    setFormId(ind.id);
    setFormGen(ind.generation);
    setFormGender(ind.gender);
    setFormPhenotype(ind.phenotype);
    setFormGenotype(ind.genotype || '');
    setFormFatherId(ind.fatherId || '');
    setFormMotherId(ind.motherId || '');
    setFormSpouseId(ind.spouseId || '');
  };

  // Sao chép mã SVG
  const handleCopySvgCode = () => {
    navigator.clipboard.writeText(currentSvgString);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  // Tải file .SVG
  const handleDownloadSvg = () => {
    const blob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pedigree_${pedigree.title.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Tải file .PNG
  const handleDownloadPng = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const svgBlob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 1200;
      canvas.height = 800;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `Pedigree_${pedigree.title.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Pedigree Builder Studio (Phả Hệ Sinh Học SVG)</h2>
              <p className="text-xs text-slate-300">
                Thiết kế sơ đồ phả hệ trực quan, tự động căn nối thế hệ và xuất file SVG/PNG cho đề thi GDPT 2018
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Form Side */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Title & Inheritance */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên sơ đồ phả hệ</label>
                <input
                  type="text"
                  value={pedigree.title}
                  onChange={(e) => setPedigree(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dạng di truyền</label>
                <select
                  value={pedigree.inheritanceType}
                  onChange={(e) => setPedigree(prev => ({ ...prev, inheritanceType: e.target.value as any }))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="autosomal_recessive">Gen lặn NST thường (aa mắc bệnh)</option>
                  <option value="autosomal_dominant">Gen trội NST thường (A_ mắc bệnh)</option>
                  <option value="x_linked_recessive">Gen lặn NST X (X^a Y, X^a X^a)</option>
                  <option value="x_linked_dominant">Gen trội NST X (X^A Y, X^A X^-)</option>
                </select>
              </div>
            </div>

            {/* Individual Form */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  {editingIndId ? `Cập nhật cá thể ${editingIndId}` : 'Thêm cá thể mới'}
                </span>
                {editingIndId && (
                  <button
                    onClick={() => setEditingIndId(null)}
                    className="text-[10px] text-rose-600 hover:underline font-bold"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Ký hiệu ID (VD: I-1, II-2)</label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Thế hệ (I, II, III)</label>
                  <select
                    value={formGen}
                    onChange={(e) => setFormGen(Number(e.target.value))}
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                  >
                    <option value={1}>Thế hệ I (Hàng 1)</option>
                    <option value={2}>Thế hệ II (Hàng 2)</option>
                    <option value={3}>Thế hệ III (Hàng 3)</option>
                    <option value={4}>Thế hệ IV (Hàng 4)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Giới tính</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as PedigreeGender)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                  >
                    <option value="male">Nam (□ Vuông)</option>
                    <option value="female">Nữ (○ Tròn)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Trạng thái (Kiểu hình)</label>
                  <select
                    value={formPhenotype}
                    onChange={(e) => setFormPhenotype(e.target.value as PedigreePhenotype)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                  >
                    <option value="normal">Bình thường (Nền trắng)</option>
                    <option value="affected">Mắc bệnh (Nền đen)</option>
                    <option value="carrier">Dị hợp/Mang gen (Nửa đen)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Kiểu gen (Tùy chọn)</label>
                  <input
                    type="text"
                    value={formGenotype}
                    onChange={(e) => setFormGenotype(e.target.value)}
                    placeholder="X^A X^a"
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ID Vợ/Chồng (Hôn nhân)</label>
                  <select
                    value={formSpouseId}
                    onChange={(e) => setFormSpouseId(e.target.value)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                  >
                    <option value="">-- Không có --</option>
                    {pedigree.individuals.filter(i => i.id !== formId).map(ind => (
                      <option key={ind.id} value={ind.id}>{ind.id} ({ind.gender === 'male' ? 'Nam' : 'Nữ'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ID Cha</label>
                  <select
                    value={formFatherId}
                    onChange={(e) => setFormFatherId(e.target.value)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                  >
                    <option value="">-- Không có --</option>
                    {pedigree.individuals.filter(i => i.gender === 'male').map(ind => (
                      <option key={ind.id} value={ind.id}>{ind.id}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ID Mẹ</label>
                  <select
                    value={formMotherId}
                    onChange={(e) => setFormMotherId(e.target.value)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                  >
                    <option value="">-- Không có --</option>
                    {pedigree.individuals.filter(i => i.gender === 'female').map(ind => (
                      <option key={ind.id} value={ind.id}>{ind.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddIndividual}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{editingIndId ? 'Lưu cập nhật cá thể' : 'Thêm vào sơ đồ phả hệ'}</span>
              </button>
            </div>

            {/* List */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Các cá thể trong phả hệ ({pedigree.individuals.length})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {pedigree.individuals.map((ind) => (
                  <div
                    key={ind.id}
                    className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 border border-slate-800 ${ind.gender === 'female' ? 'rounded-full' : ''} ${ind.phenotype === 'affected' ? 'bg-slate-900' : 'bg-white'}`} />
                      <span className="font-bold font-mono text-slate-800">{ind.id}</span>
                      <span className="text-[10px] text-slate-500">
                        Hàng {ind.generation} ({ind.phenotype === 'affected' ? 'Bệnh' : ind.phenotype === 'carrier' ? 'Dị hợp' : 'Khỏe'})
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditIndividual(ind)} className="p-1 text-slate-500 hover:text-emerald-600 rounded">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDeleteIndividual(ind.id)} className="p-1 text-slate-500 hover:text-rose-600 rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SVG Canvas Side */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-inner min-h-[360px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  Sơ đồ Phả hệ Render Thời Gian Thực
                </span>
                <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 border border-slate-900 bg-white inline-block" /> Nam</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 border border-slate-900 bg-white rounded-full inline-block" /> Nữ</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 border border-slate-900 bg-slate-900 inline-block" /> Mắc bệnh</span>
                </div>
              </div>

              {/* Rendered SVG */}
              <div
                ref={svgContainerRef}
                className="w-full flex items-center justify-center overflow-x-auto py-2"
                dangerouslySetInnerHTML={{ __html: currentSvgString }}
              />

              <p className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-2">
                Đồ họa SVG sắc nét, có thể nhúng vào tài liệu Word hoặc in đính kèm đề thi GDPT 2018
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCopySvgCode}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedSvg ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSvg ? 'Đã copy mã SVG!' : 'Sao chép mã SVG'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải file .SVG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải ảnh .PNG</span>
              </button>

              {onInsertToExam && (
                <button
                  type="button"
                  onClick={() => {
                    onInsertToExam(currentSvgString);
                    onClose();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Chèn vào đề thi</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
