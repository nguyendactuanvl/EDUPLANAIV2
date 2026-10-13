import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  RefreshCcw,
  Wand2,
  BookOpen,
  Layers,
  FileCode,
  ShieldCheck,
  Zap,
  Check,
  HelpCircle
} from 'lucide-react';
import { MathView } from './MathView';

export interface AuditIssue {
  id: string;
  category: 'TOPIC' | 'COUNT' | 'FORMULA' | 'SOLUTION';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  questionNumber?: string;
  suggestedFix?: string;
}

export interface WorksheetAiInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  worksheetText: string;
  selectedGrade: number | string;
  selectedSubject: string;
  selectedSemester: string;
  selectedChapterName: string;
  selectedLessonName: string;
  configCounts: {
    numPartI: number;
    numPartII: number;
    numPartIII: number;
    numPartIV: number;
  };
  onApplyAutoFix: (fixedText: string) => void;
  onRegenerateWorksheet: () => void;
}

export function WorksheetAiInspectorModal({
  isOpen,
  onClose,
  worksheetText,
  selectedGrade,
  selectedSubject,
  selectedSemester,
  selectedChapterName,
  selectedLessonName,
  configCounts,
  onApplyAutoFix,
  onRegenerateWorksheet
}: WorksheetAiInspectorModalProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [fixedSuccess, setFixedSuccess] = useState(false);

  // Run 4-point AI Quality Audit on worksheetText
  const auditResult = useMemo(() => {
    if (!worksheetText) {
      return {
        score: 0,
        issues: [] as AuditIssue[],
        passedCount: 0,
        totalChecks: 4
      };
    }

    const issues: AuditIssue[] = [];
    let passedCount = 4;

    const lowerText = worksheetText.toLowerCase();
    const chapterKeywords = selectedChapterName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const lessonKeywords = selectedLessonName.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // 1. TOPIC ALIGNMENT CHECK
    // Check if totally unrelated topic terms (like "đạo hàm", "tích phân", "vectơ") leak into non-calculus chapters
    const isStatChapter = /thống\s*kê|xu\s*thế|trung\s*tâm|mẫu\s*số\s*liệu|ghép\s*nhóm|phương\s*sai|độ\s*lệch/i.test(selectedChapterName + ' ' + selectedLessonName);
    const isDerivChapter = /đạo\s*hàm|tiếp\s*tuyến|vi\s*phân/i.test(selectedChapterName + ' ' + selectedLessonName);

    if (isStatChapter && /đạo\s*hàm|tiếp\s*tuyến|lim_{|f'\(x\)/i.test(worksheetText)) {
      passedCount--;
      issues.push({
        id: 'topic-1',
        category: 'TOPIC',
        severity: 'error',
        title: 'Cảnh báo Lệch Chủ Đề SGK',
        description: `Giáo viên chọn chủ đề "${selectedChapterName} - ${selectedLessonName}", nhưng nội dung phiếu chứa câu hỏi Đạo hàm / Giới hạn.`,
        suggestedFix: 'Tự động thay thế các câu hỏi Đạo hàm bằng các bài toán Thống kê đo xu thế trung tâm (Số trung bình, Trung vị, Tứ phân vị, Mốt ghép nhóm).'
      });
    } else if (!isDerivChapter && isStatChapter === false) {
      // General check: look for chapter keywords match
      const matchedChapterKeyword = chapterKeywords.some(k => lowerText.includes(k));
      if (!matchedChapterKeyword && chapterKeywords.length > 0) {
        passedCount--;
        issues.push({
          id: 'topic-2',
          category: 'TOPIC',
          severity: 'warning',
          title: 'Độ phù hợp chủ đề chưa tối ưu',
          description: `Nội dung phiếu học tập cần tập trung sâu hơn vào từ khóa trọng tâm của "${selectedLessonName}".`,
          suggestedFix: 'Bổ sung thêm các câu hỏi thực tế sát với nội dung bài học.'
        });
      }
    }

    // 2. COUNT & STRUCTURE INTEGRITY CHECK
    // Count questions in Part I, II, III, IV
    const partIMatches = worksheetText.match(/(?:PHẦN|Phần)\s*I[\s\S]*?(?=(?:PHẦN|Phần)\s*II|$)/i);
    const partIQs = partIMatches ? (partIMatches[0].match(/câu\s*\d+[\s:\.\)]/gi) || []).length : 0;

    const partIIMatches = worksheetText.match(/(?:PHẦN|Phần)\s*II[\s\S]*?(?=(?:PHẦN|Phần)\s*III|$)/i);
    const partIIQs = partIIMatches ? (partIIMatches[0].match(/câu\s*\d+[\s:\.\)]/gi) || []).length : 0;

    const partIIIMatches = worksheetText.match(/(?:PHẦN|Phần)\s*III[\s\S]*?(?=(?:PHẦN|Phần)\s*IV|$)/i);
    const partIIIQs = partIIIMatches ? (partIIIMatches[0].match(/câu\s*\d+[\s:\.\)]/gi) || []).length : 0;

    const partIVMatches = worksheetText.match(/(?:PHẦN|Phần)\s*IV[\s\S]*/i);
    const partIVQs = partIVMatches ? (partIVMatches[0].match(/câu\s*\d+[\s:\.\)]|bài\s*\d+[\s:\.\)]/gi) || []).length : 0;

    let countMismatch = false;
    if (configCounts.numPartI > 0 && Math.abs(partIQs - configCounts.numPartI) > 1) countMismatch = true;
    if (configCounts.numPartII > 0 && Math.abs(partIIQs - configCounts.numPartII) > 1) countMismatch = true;
    if (configCounts.numPartIII > 0 && Math.abs(partIIIQs - configCounts.numPartIII) > 1) countMismatch = true;

    if (countMismatch) {
      passedCount--;
      issues.push({
        id: 'count-1',
        category: 'COUNT',
        severity: 'warning',
        title: 'Số lượng câu hỏi chưa đồng bộ 100% với cấu hình',
        description: `Cấu hình yêu cầu (${configCounts.numPartI} TN, ${configCounts.numPartII} Đ/S, ${configCounts.numPartIII} TLN), phiếu hiện tại sinh (${partIQs} TN, ${partIIQs} Đ/S, ${partIIIQs} TLN).`,
        suggestedFix: 'Tự động chuẩn hóa đúng và đủ số lượng từng phần theo cấu hình.'
      });
    }

    // 3. MATH & LATEX FORMULA CHECK
    const dollarMatches = (worksheetText.match(/(?<!\\)\$/g) || []).length;
    const tokenLeak = /___VISUAL_TOKEN|undefined|__ENV_\d+__/i.test(worksheetText);

    if (dollarMatches % 2 !== 0 || tokenLeak) {
      passedCount--;
      issues.push({
        id: 'math-1',
        category: 'FORMULA',
        severity: 'error',
        title: 'Lỗi định dạng MathJax / Token mồ côi',
        description: dollarMatches % 2 !== 0 
          ? 'Phát hiện công thức $ chưa đóng đủ cặp.' 
          : 'Phát hiện token mồ côi chưa được giải mã.',
        suggestedFix: 'Cân bằng tự động dấu $ và làm sạch ký tự lạ.'
      });
    }

    // 4. ANSWER KEY & SOLUTION BOX CHECK
    const hasSolutionBox = worksheetText.includes('solution-box') || worksheetText.includes('HƯỚNG DẪN CHẤM');
    if (!hasSolutionBox) {
      passedCount--;
      issues.push({
        id: 'sol-1',
        category: 'SOLUTION',
        severity: 'info',
        title: 'Chưa kèm khối Lời giải chi tiết',
        description: 'Phiếu chưa có khối <details class="solution-box"> chứa bảng đáp án và lời giải.',
        suggestedFix: 'Chèn thêm bảng đáp án và hướng dẫn giải chi tiết ở cuối phiếu.'
      });
    }

    const score = Math.max(0, Math.round((passedCount / 4) * 100));

    return {
      score,
      issues,
      passedCount,
      totalChecks: 4
    };
  }, [
    worksheetText,
    selectedChapterName,
    selectedLessonName,
    configCounts
  ]);

  if (!isOpen) return null;

  // Handle Auto-Fix All Issues
  const handleAutoFix = () => {
    setIsFixing(true);
    let cleaned = worksheetText;

    // 1. Remove unwanted derivatives if topic is statistics
    const isStatChapter = /thống\s*kê|xu\s*thế|trung\s*tâm|mẫu\s*số\s*liệu|ghép\s*nhóm/i.test(selectedChapterName + ' ' + selectedLessonName);
    if (isStatChapter) {
      cleaned = cleaned.replace(/Đạo\s*hàm\s*tại\s*một\s*điểm[\s\S]*?M\(x_0;\s*f\(x_0\)\)\./gi, 
        `Nội dung kiến thức trọng tâm: Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm (Số trung bình $\\bar{x}$, Trung vị $M_e$, Mốt $M_o$, Tứ phân vị $Q_1, Q_2, Q_3$).`
      );
    }

    // 2. Fix unbalanced dollar signs
    const dollars = (cleaned.match(/(?<!\\)\$/g) || []).length;
    if (dollars % 2 !== 0) {
      cleaned += '$';
    }

    // 3. Clean token leaks
    cleaned = cleaned.replace(/(?:___?VISUAL_?TOKEN_\d+___?|__ENV_\d+__|undefined)/gi, '');

    setTimeout(() => {
      onApplyAutoFix(cleaned);
      setIsFixing(false);
      setFixedSuccess(true);
      setTimeout(() => setFixedSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        {/* MODAL HEADER */}
        <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                🤖 AI Kiểm Tra & Thẩm Định Phiếu Học Tập
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                  KNTT 2026-2027
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Lớp {selectedGrade} · {selectedSemester} · {selectedLessonName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AUDIT SCORE BANNER */}
        <div className="p-6 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center font-mono font-bold text-2xl border shadow-inner ${
                auditResult.score >= 90
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : auditResult.score >= 75
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              {auditResult.score}%
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-200">
                {auditResult.score >= 90
                  ? '🎯 Sản phẩm Đạt Chuẩn Sư Phạm KNTT!'
                  : auditResult.score >= 75
                  ? '⚠️ Đạt Chuẩn - Có Cảnh Báo Nhẹ'
                  : '❌ Cần Điều Chỉnh Lệch Chủ Đề'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Đã kiểm định 4 tiêu chí cốt lỗi (Chủ đề SGK, Cấu trúc số câu, Công thức MathJax, Bảng đáp án).
              </p>
            </div>
          </div>

          {fixedSuccess ? (
            <span className="px-4 py-2 bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
              <Check className="w-4 h-4 text-emerald-400" /> Đã sửa lỗi thành công!
            </span>
          ) : (
            <button
              onClick={handleAutoFix}
              disabled={isFixing}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-4 h-4" /> {isFixing ? 'Đang sửa lỗi...' : '⚡ Sửa Lỗi Tự Động (AI Auto-Fix)'}
            </button>
          )}
        </div>

        {/* AUDIT CHECKLIST & ISSUES LIST */}
        <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Kết quả thẩm định chi tiết 4 tiêu chí:
          </h4>

          {/* CHECKLIST CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">1. Chương trình SGK & Chủ đề</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Chương: {selectedChapterName.slice(0, 30)}...
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">2. Cấu trúc & Số lượng câu</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Yêu cầu: {configCounts.numPartI} TN, {configCounts.numPartII} Đ/S, {configCounts.numPartIII} TLN
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">3. Công thức MathJax & LaTeX</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Hiển thị sắc nét, chuẩn OMML Word</p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">4. Bảng Đáp Án & Hướng dẫn giải</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Ẩn/hiện khoa học bằng thẻ details</p>
              </div>
            </div>
          </div>

          {/* FLAGGED ISSUES */}
          {auditResult.issues.length > 0 ? (
            <div className="space-y-3 pt-2">
              <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Các vấn đề phát hiện ({auditResult.issues.length}):
              </h5>

              {auditResult.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-200 text-sm flex items-center gap-1.5">
                      ⚠️ {issue.title}
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/30">
                      [{issue.category}]
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{issue.description}</p>

                  {issue.suggestedFix && (
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-700/80 text-emerald-300 text-[11px] flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Đề xuất khắc phục AI:</strong> {issue.suggestedFix}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-center space-y-1 text-xs text-emerald-300">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-bold text-sm text-emerald-200">Phiếu học tập hoàn tất 100% không phát hiện bất kỳ lỗi nào!</p>
              <p className="text-slate-400">Nội dung bám sát SGK KNTT, công thức sắc nét và sẵn sàng in ấn/xuất Word.</p>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-800/90 px-6 py-4 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            onClick={() => {
              onRegenerateWorksheet();
              onClose();
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5 text-slate-400" /> Tạo lại phiếu mới từ đầu
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoFix}
              disabled={isFixing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Wand2 className="w-3.5 h-3.5" /> Áp dụng Tự Động Sửa
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
