import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  Check,
  Sparkles,
  FileText,
  Layers,
  Cpu,
  BookOpen,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  LESSON_PLAN_TEMPLATES,
  LESSON_PLAN_TEMPLATE_CATEGORIES,
  LessonPlanTemplate,
  LessonPlanTemplateCategory,
} from '../data/lessonPlanTemplates';

interface LessonPlanTemplateLibraryProps {
  isOpen: boolean;
  selectedTemplateId: string;
  onClose: () => void;
  onSelectTemplate: (template: LessonPlanTemplate) => void;
  onApplyAndGenerate: (template: LessonPlanTemplate) => void;
  onInsertSkeleton: (template: LessonPlanTemplate) => void;
  subject: string;
  grade: number;
  lessonName: string;
}

export const LessonPlanTemplateLibrary: React.FC<LessonPlanTemplateLibraryProps> = ({
  isOpen,
  selectedTemplateId,
  onClose,
  onSelectTemplate,
  onApplyAndGenerate,
  onInsertSkeleton,
  subject,
  grade,
  lessonName,
}) => {
  const [category, setCategory] = useState<'all' | LessonPlanTemplateCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewId, setPreviewId] = useState<string>(
    selectedTemplateId || LESSON_PLAN_TEMPLATES[0].id
  );

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return LESSON_PLAN_TEMPLATES.filter((tpl) => {
      if (category !== 'all' && tpl.category !== category) return false;
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.shortName.toLowerCase().includes(q) ||
        tpl.standardRef.toLowerCase().includes(q) ||
        tpl.summary.toLowerCase().includes(q) ||
        tpl.suitableFor.toLowerCase().includes(q) ||
        tpl.digitalCompetencies.some((d) => d.toLowerCase().includes(q)) ||
        tpl.stemElements.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [category, searchQuery]);

  const activePreview: LessonPlanTemplate = useMemo(() => {
    return (
      filteredTemplates.find((t) => t.id === previewId) ||
      filteredTemplates[0] ||
      LESSON_PLAN_TEMPLATES[0]
    );
  }, [filteredTemplates, previewId]);

  if (!isOpen) return null;

  const getCategoryIcon = (cat: LessonPlanTemplateCategory) => {
    if (cat === 'stem') return <Layers className="w-4 h-4 text-emerald-700 shrink-0" />;
    if (cat === 'digital') return <Cpu className="w-4 h-4 text-sky-700 shrink-0" />;
    return <BookOpen className="w-4 h-4 text-slate-700 shrink-0" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-library-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 bg-white">
          <div className="min-w-0">
            <h2
              id="template-library-title"
              className="text-lg font-bold text-slate-900 tracking-tight truncate"
            >
              Thư viện Mẫu Kế hoạch Bài dạy Chuẩn GDPT 2018
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Chọn khung mẫu giáo án STEM/STEAM, tích hợp Năng lực số (TT 02/2025), AI (QĐ 2422) hoặc Công văn 5512
              {lessonName ? ` · Đang soạn: ${lessonName} (${subject} ${grade})` : ` · Môn ${subject} · Lớp ${grade}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Đóng thư viện mẫu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
            {LESSON_PLAN_TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === cat.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo STEM, 5E, TT 02/2025, LMS, phân hóa..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Body: 2-column master-detail layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left list */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto p-4 space-y-2.5 bg-slate-50/40">
            {filteredTemplates.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Không tìm thấy mẫu phù hợp với từ khóa "{searchQuery}".
              </div>
            ) : (
              filteredTemplates.map((tpl) => {
                const isPreviewed = tpl.id === activePreview.id;
                const isSelected = tpl.id === selectedTemplateId;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setPreviewId(tpl.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isPreviewed
                        ? 'bg-white border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getCategoryIcon(tpl.category)}
                        <span className="text-xs font-medium text-slate-500 truncate">
                          {tpl.categoryLabel} · {tpl.periodsLabel} · {tpl.stages.length} giai đoạn
                        </span>
                      </div>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          Đang chọn
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {tpl.summary}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 truncate">
                      Căn cứ: {tpl.standardRef}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Right detail preview */}
          <div className="lg:col-span-7 overflow-y-auto p-6 bg-white flex flex-col">
            <div className="space-y-6 flex-1">
              {/* Preview header */}
              <div className="pb-4 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-emerald-700">{activePreview.categoryLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activePreview.standardRef}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Gợi ý {activePreview.periodsLabel}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-2 leading-snug">
                  {activePreview.name}
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {activePreview.summary}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  <span className="font-semibold text-slate-700">Phù hợp cho:</span> {activePreview.suitableFor}
                </p>
              </div>

              {/* Pedagogical stages */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">
                  Cấu trúc tiến trình dạy học ({activePreview.stages.length} bước)
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {activePreview.stages.map((st, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4"
                    >
                      <span className="text-xs font-bold text-emerald-700 w-28 shrink-0 tabular-nums">
                        {st.step}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{st.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{st.focus}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Competency & STEM mapping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Chỉ báo Năng lực số tích hợp
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                    {activePreview.digitalCompetencies.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-sky-600 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Định hướng STEM / STEAM & AI
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                    {activePreview.stemElements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                    <li className="flex items-start gap-2 pt-1 text-slate-700">
                      <span className="text-indigo-600 font-bold shrink-0">•</span>
                      <span>
                        <strong className="font-semibold">Tích hợp AI:</strong> {activePreview.aiIntegration}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="pt-5 mt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(activePreview);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Chỉ chọn khung mẫu này
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onInsertSkeleton(activePreview);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="Chèn ngay khung sườn giáo án vào trình soạn thảo để chỉnh sửa thủ công (không tốn lượt AI)"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Mở khung sườn ngay</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onApplyAndGenerate(activePreview);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Áp dụng mẫu & Soạn bằng AI</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
