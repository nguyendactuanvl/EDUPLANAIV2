import React, { useState, useEffect } from 'react';
import { School, User, Calendar, BookOpen, Building2, Check, X, RotateCcw } from 'lucide-react';
import { HeaderConfig, DEFAULT_HEADER_CONFIG } from '../lib/headerConfig';

interface HeaderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: HeaderConfig;
  onSave: (config: HeaderConfig) => void;
  title?: string;
}

export const HeaderConfigModal: React.FC<HeaderConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  title = "Tùy chỉnh thông tin tiêu đề (Trường, Giáo viên, Năm học...)"
}) => {
  const [formData, setFormData] = useState<HeaderConfig>({ ...config });

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...config });
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleChange = (field: keyof HeaderConfig, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData({ ...DEFAULT_HEADER_CONFIG });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{title}</h3>
              <p className="text-xs text-slate-500">Thông tin xuất hiện ở đầu đề thi, phiếu học tập và bản in Word</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm text-slate-700">
          <div>
            <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Sở / Phòng GD&ĐT
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="Ví dụ: SỞ GIÁO DỤC VÀ ĐÀO TẠO HÀ NỘI"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <School className="w-4 h-4 text-emerald-600" />
              Tên trường của giáo viên
            </label>
            <input
              type="text"
              value={formData.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)}
              placeholder="Ví dụ: TRƯỜNG THPT CHUYÊN HÀ NỘI - AMSTERDAM"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
            />
            <p className="text-[11px] text-slate-500 mt-0.5">Để trống sẽ tự động hiển thị dòng chấm "TRƯỜNG THPT ............................"</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                Họ và tên giáo viên
              </label>
              <input
                type="text"
                value={formData.teacherName}
                onChange={(e) => handleChange('teacherName', e.target.value)}
                placeholder="Ví dụ: Thầy Nguyễn Đắc Tuấn"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Năm học
              </label>
              <input
                type="text"
                value={formData.schoolYear}
                onChange={(e) => handleChange('schoolYear', e.target.value)}
                placeholder="2026 - 2027"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-semibold text-emerald-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Tổ chuyên môn
            </label>
            <input
              type="text"
              value={formData.subjectGroup}
              onChange={(e) => handleChange('subjectGroup', e.target.value)}
              placeholder="Ví dụ: TỔ TOÁN - TIN HỌC"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
            />
          </div>

          {/* Xem trước tiêu đề thực tế */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-[11px] font-bold text-slate-600 uppercase mb-2 flex items-center justify-between">
              <span>👀 Xem trước tiêu đề trên Đề thi & Phiếu học tập:</span>
              <span className="text-emerald-700 font-semibold">{formData.schoolYear || '2026 - 2027'}</span>
            </div>
            <div className="bg-white p-3 border border-slate-300 rounded font-serif text-xs text-slate-800 leading-snug">
              <div className="grid grid-cols-2 gap-2 text-center pb-1 border-b border-slate-300">
                <div>
                  <div className="font-bold uppercase text-[10px] text-slate-600">
                    {formData.department || "SỞ GIÁO DỤC VÀ ĐÀO TẠO"}
                  </div>
                  <div className="font-extrabold uppercase text-[11px] text-slate-900">
                    {formData.schoolName ? (formData.schoolName.trim().toUpperCase().startsWith("TRƯỜNG") ? formData.schoolName.trim().toUpperCase() : `TRƯỜNG ${formData.schoolName.trim().toUpperCase()}`) : "TRƯỜNG THPT ........................"}
                  </div>
                  <div className="text-[10.5px] font-semibold text-slate-800 mt-0.5">
                    {formData.teacherName ? `GV: ${formData.teacherName}` : "Giáo viên: ........................"}
                  </div>
                  <div className="text-[10px] text-slate-500 italic">
                    {formData.subjectGroup || "TỔ TOÁN - TIN HỌC"}
                  </div>
                </div>
                <div>
                  <div className="font-extrabold uppercase text-[11px] text-slate-900">ĐỀ KIỂM TRA / PHIẾU HỌC TẬP</div>
                  <div className="font-bold text-[10.5px] text-emerald-800 mt-0.5">NĂM HỌC {formData.schoolYear || "2026 - 2027"}</div>
                  <div className="text-[10px] text-slate-600 italic">Môn: Toán học • Thời gian: 45 phút</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>💡 Thông tin này được lưu tự động trên trình duyệt cho mọi đề thi và phiếu học tập.</span>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Mặc định
            </button>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" /> Lưu thông tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
