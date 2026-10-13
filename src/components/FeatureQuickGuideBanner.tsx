import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronUp, PlayCircle, Lightbulb, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { GUIDE_SECTIONS, GuideSection } from '../data/guideSections';
import { MathSpan } from './MarkdownRenderer';

interface FeatureQuickGuideBannerProps {
  sectionId: string;
  titleOverride?: string;
  className?: string;
}

export const FeatureQuickGuideBanner: React.FC<FeatureQuickGuideBannerProps> = ({
  sectionId,
  titleOverride,
  className = ''
}) => {
  const guideSection: GuideSection | undefined = GUIDE_SECTIONS.find((s) => s.id === sectionId);

  // Storage key for collapse state
  const storageKey = `eduplan_guide_collapsed_${sectionId}`;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch (e) {
      console.error(e);
    }
  };

  const openFullGuide = () => {
    window.dispatchEvent(
      new CustomEvent('show-user-guide-modal', {
        detail: { sectionId }
      })
    );
  };

  if (!guideSection) return null;

  return (
    <div
      className={`mb-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 text-slate-100 shadow-md transition-all overflow-hidden ${className}`}
    >
      {/* Banner Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
              <span>{titleOverride || `Hướng dẫn sử dụng: ${guideSection.title.replace(/^Mục \d+:\s*/, '')}`}</span>
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              {guideSection.badge}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openFullGuide}
            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Mở tài liệu và video hướng dẫn chi tiết"
          >
            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Xem Video & Đủ Bước</span>
            <span className="sm:hidden">Chi tiết</span>
          </button>

          <button
            onClick={toggleCollapse}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng hướng dẫn' : 'Thu gọn hướng dẫn'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Banner Content (Steps & Tips) */}
      {!isCollapsed && (
        <div className="p-4 space-y-3 animate-in fade-in duration-200">
          <p className="text-xs text-slate-300 leading-relaxed">
            {guideSection.description}
          </p>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            {guideSection.steps.map((step, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-start gap-2.5"
              >
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-500/30 shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-emerald-300 line-clamp-1">
                    {step.title}
                  </h4>
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-normal line-clamp-2">
                    <MathSpan content={step.detail} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Tip Footer */}
          {guideSection.tips && guideSection.tips.length > 0 && (
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-800/60">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>Mẹo hay:</strong> <MathSpan content={guideSection.tips[0]} />
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
