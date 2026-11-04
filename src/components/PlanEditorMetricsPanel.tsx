import React, { useMemo } from 'react';
import { Clock, FileText, CheckCircle2 } from 'lucide-react';
import { KHGDRow } from '../types';

interface PlanEditorMetricsPanelProps {
  mode?: 'khgd' | 'content';
  plans?: KHGDRow[];
  selectedGrade?: number;
  content?: string;
  periods?: number;
  title?: string;
}

export const PlanEditorMetricsPanel: React.FC<PlanEditorMetricsPanelProps> = ({
  mode = 'khgd',
  plans = [],
  selectedGrade,
  content = '',
  periods = 2,
  title = "Bảng điều khiển soạn thảo (Số từ & Thời lượng dự kiến)"
}) => {
  const metrics = useMemo(() => {
    let wordCount = 0;
    let charCount = 0;
    let totalPeriods = periods;
    let completionRate = 100;

    if (mode === 'khgd') {
      const filtered = selectedGrade ? plans.filter(p => p.grade === selectedGrade) : plans;
      let text = '';
      let periodsSum = 0;
      let filled = 0;
      filtered.forEach(p => {
        text += ` ${p.lesson || ''} ${p.requirement || ''} ${p.digitalComp || ''} ${p.stem || ''}`;
        periodsSum += Number(p.periods) || 0;
        if (p.requirement?.trim()) filled++;
      });
      const trimmed = text.trim();
      wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
      charCount = trimmed.length;
      totalPeriods = periodsSum || filtered.length * 2;
      completionRate = filtered.length > 0 ? Math.round((filled / filtered.length) * 100) : 100;
    } else {
      const trimmed = (content || '').trim();
      wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
      charCount = trimmed.length;
      totalPeriods = periods;
      completionRate = wordCount > 50 ? 100 : Math.round((wordCount / 50) * 100);
    }

    const readingMins = Math.max(1, Math.ceil(wordCount / 180));
    const teachingMins = totalPeriods * 45;

    return {
      wordCount,
      charCount,
      totalPeriods,
      readingMins,
      teachingMins,
      completionRate
    };
  }, [mode, plans, selectedGrade, content, periods]);

  return (
    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-md border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <h4 className="font-bold text-sm text-indigo-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>{title}</span>
        </h4>
        <p className="text-xs text-slate-300 mt-0.5">
          Thống kê thời gian và dung lượng theo chuẩn soạn thảo GDPT 2018
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-blue-300" />
          <span>Số từ: <strong className="text-white">{metrics.wordCount}</strong> ({metrics.charCount} ký tự)</span>
        </div>

        <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-300" />
          <span>Thời lượng dạy: <strong className="text-white">{metrics.totalPeriods} tiết</strong> ({metrics.teachingMins} phút)</span>
        </div>

        <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
          <span>Hoàn thành: <strong className="text-white">{metrics.completionRate}%</strong></span>
        </div>
      </div>
    </div>
  );
};
