import React, { useState, useMemo } from 'react';
import {
  FileDiff,
  AlertTriangle,
  CheckCircle2,
  X,
  Shuffle,
  Wand2,
  Download,
  Eye,
  FileText,
  Search,
  RotateCcw,
  Edit3,
  Check,
  Zap,
  ArrowRight
} from 'lucide-react';
import { MathView } from './MathView';
import { cleanQuestionStem, sanitizeExamQuestion } from '../lib/utils';
import { exportHtmlToWord } from '../lib/exportUtils';

export interface Question {
  id: number;
  content: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  tfStatements?: { statement: string; correct: boolean }[];
  type?: "mc" | "tf" | "sa" | "essay" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";
  section?: 1 | 2 | 3 | 4;
  level?: string;
  topic?: string;
  imageUrl?: string;
  hasFigure?: boolean;
  originalId?: number;
  solution?: string;
  explanation?: string;
}

export interface ShuffledExam {
  code: string;
  questions: Question[];
}

interface ExamDiffViewerProps {
  originalQuestions: Question[];
  shuffledExams: ShuffledExam[];
  examTitle?: string;
  onUpdateOriginalQuestion?: (index: number, updated: Question) => void;
  onUpdateShuffledExamQuestion?: (code: string, qIndex: number, updated: Question) => void;
  onClose: () => void;
}

export type IssueType = 'MATH' | 'FORMAT' | 'TOKEN_LEAK' | 'OPTION_MISMATCH' | 'IMAGE_MISSING';

export interface QuestionIssue {
  type: IssueType;
  severity: 'error' | 'warning';
  message: string;
  highlightStr?: string;
}

export interface DiffPair {
  originalIndex: number;
  originalQ: Question;
  shuffledIndex: number;
  shuffledQ: Question;
  issues: QuestionIssue[];
  optionMap: number[]; // index mapping from original option index to shuffled option index
  status: 'clean' | 'warning' | 'error';
}

/**
 * Detects formula errors, token leaks, formatting bugs, and content distortion between
 * original questions and shuffled variants.
 */
export function analyzeQuestionDiff(orig: Question, shuf: Question): { issues: QuestionIssue[]; optionMap: number[] } {
  const issues: QuestionIssue[] = [];

  const rawOrigContent = orig.content || '';
  const rawShufContent = shuf.content || '';

  // 1. Detect Token Leaks (___VISUAL_TOKEN___, undefined, ENV_BLOCK, etc.)
  const tokenLeakRegex = /(?:___?VISUAL_?TOKEN_\d+___?|__ENV_\d+__|__MATH_\d+__|__TEXT_\d+__|(?<![a-zA-Z0-9_])undefined(?![a-zA-Z0-9_]))/gi;
  const tokenMatches: string[] = rawShufContent.match(tokenLeakRegex) || [];
  
  // Check options for token leaks
  shuf.options?.forEach((opt) => {
    const optLeak = opt.match(tokenLeakRegex);
    if (optLeak) {
      tokenMatches.push(...optLeak);
    }
  });

  if (tokenMatches.length > 0) {
    issues.push({
      type: 'TOKEN_LEAK',
      severity: 'error',
      message: `Rò rỉ token hệ thống (${tokenMatches.slice(0, 2).join(', ')}) trong nội dung hoặc phương án`,
      highlightStr: tokenMatches[0]
    });
  }

  // 2. MathJax / LaTeX formula balance check ($...$ unmatched, broken \frac, etc.)
  const dollarCountShuf = (rawShufContent.match(/(?<!\\)\$/g) || []).length;
  if (dollarCountShuf % 2 !== 0) {
    issues.push({
      type: 'MATH',
      severity: 'error',
      message: 'Công thức MathJax chưa đóng đủ cặp dấu $...$',
      highlightStr: '$'
    });
  }

  const brokenFracRegex = /\\frac\s*\{[^{}]*$/;
  if (brokenFracRegex.test(rawShufContent)) {
    issues.push({
      type: 'MATH',
      severity: 'error',
      message: 'Cú pháp \\frac bị thiếu ngoặc nhọn }'
    });
  }

  // 3. Option count mismatch (e.g. lost option A/B/C/D)
  if (orig.options && shuf.options) {
    if (orig.options.length !== shuf.options.length) {
      issues.push({
        type: 'OPTION_MISMATCH',
        severity: 'error',
        message: `Số lượng lựa chọn không khớp: Đề gốc (${orig.options.length}) vs Đề đã trộn (${shuf.options.length})`
      });
    }

    // Check for empty options or option label duplication (e.g. "A. A.")
    shuf.options.forEach((opt, idx) => {
      if (!opt || !opt.trim()) {
        issues.push({
          type: 'FORMAT',
          severity: 'warning',
          message: `Lựa chọn thứ ${idx + 1} (${String.fromCharCode(65 + idx)}) bị rỗng`
        });
      }
      if (/^[A-D]\.\s*[A-D]\./i.test(opt.trim())) {
        issues.push({
          type: 'FORMAT',
          severity: 'warning',
          message: `Trùng lặp ký hiệu tiền tố (${opt.slice(0, 5)})`
        });
      }
    });
  }

  // 4. True/False Statements count check (Section II)
  if (orig.tfStatements && shuf.tfStatements) {
    if (orig.tfStatements.length !== shuf.tfStatements.length) {
      issues.push({
        type: 'FORMAT',
        severity: 'error',
        message: `Mệnh đề Đúng/Sai không khớp: Đề gốc (${orig.tfStatements.length}) vs Đề trộn (${shuf.tfStatements.length})`
      });
    }
  }

  // 5. Image / Graph / BBT preservation check
  const origHasFigure = orig.hasFigure || !!orig.imageUrl || /<svg|<img|data-svg|tikz/i.test(rawOrigContent);
  const shufHasFigure = shuf.hasFigure || !!shuf.imageUrl || /<svg|<img|data-svg|tikz/i.test(rawShufContent);

  if (origHasFigure && !shufHasFigure) {
    issues.push({
      type: 'IMAGE_MISSING',
      severity: 'warning',
      message: 'Đề gốc có hình vẽ/BBT/đồ thị nhưng bản trộn chưa khôi phục SVG/Image'
    });
  }

  // Build Option Shuffle Mapping matrix
  const optionMap: number[] = [];
  if (orig.options && shuf.options) {
    orig.options.forEach((origOpt) => {
      const cleanOrig = origOpt.replace(/^[A-D][.:)]\s*/i, '').trim();
      const matchedIdx = shuf.options!.findIndex((shufOpt) => {
        const cleanShuf = shufOpt.replace(/^[A-D][.:)]\s*/i, '').trim();
        return cleanShuf === cleanOrig;
      });
      optionMap.push(matchedIdx !== -1 ? matchedIdx : -1);
    });
  }

  return { issues, optionMap };
}

/**
 * Auto-fix cleanups for a question item
 */
export function autoFixQuestion(q: Question): Question {
  let cleanedContent = q.content || '';
  
  // Clean token leaks
  cleanedContent = cleanedContent
    .replace(/(?:___?VISUAL_?TOKEN_\d+___?|__ENV_\d+__|__MATH_\d+__|__TEXT_\d+__|(?<![a-zA-Z0-9_])undefined(?![a-zA-Z0-9_]))/gi, '')
    .replace(/=\s*undefined/g, '=');

  // Clean double option prefixes
  const cleanedOptions = q.options?.map((opt) => {
    let o = opt || '';
    o = o.replace(/(?:___?VISUAL_?TOKEN_\d+___?|__ENV_\d+__|__MATH_\d+__|__TEXT_\d+__|undefined)/gi, '');
    o = o.replace(/^[A-D]\.\s*([A-D]\.\s*)+/i, (m) => m.slice(0, 3));
    return o;
  });

  // Balance dollar signs if odd
  const dollarMatches = cleanedContent.match(/(?<!\\)\$/g) || [];
  if (dollarMatches.length % 2 !== 0) {
    cleanedContent += '$';
  }

  return {
    ...q,
    content: cleanQuestionStem(cleanedContent),
    options: cleanedOptions
  };
}

export function ExamDiffViewer({
  originalQuestions,
  shuffledExams,
  examTitle = 'Đề thi chuẩn GDPT',
  onUpdateOriginalQuestion,
  onUpdateShuffledExamQuestion,
  onClose
}: ExamDiffViewerProps) {
  const [selectedCode, setSelectedCode] = useState<string>(
    shuffledExams[0]?.code || '101'
  );
  const [filterMode, setFilterMode] = useState<'all' | 'issues_only' | 'math' | 'format'>('all');
  const [viewMode, setViewMode] = useState<'diff' | 'word_preview'>('diff');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingQIndex, setEditingQIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [manualFlags, setManualFlags] = useState<Record<number, string>>({});

  // Active shuffled exam variant
  const activeExam = useMemo(() => {
    return shuffledExams.find((e) => e.code === selectedCode) || shuffledExams[0];
  }, [shuffledExams, selectedCode]);

  // Compute Diff Pairs between Original and Active Shuffled Exam
  const diffPairs: DiffPair[] = useMemo(() => {
    if (!activeExam) return [];

    return originalQuestions.map((origQ, origIdx) => {
      // Find corresponding question in shuffled exam (by originalId or position)
      const shufQ =
        activeExam.questions.find((q) => q.originalId === origQ.id) ||
        activeExam.questions[origIdx] ||
        origQ;

      const shufIdx = activeExam.questions.findIndex((q) => q === shufQ);
      const { issues, optionMap } = analyzeQuestionDiff(origQ, shufQ);

      const hasError = issues.some((i) => i.severity === 'error');
      const hasWarning = issues.length > 0;
      const status = hasError ? 'error' : hasWarning ? 'warning' : 'clean';

      return {
        originalIndex: origIdx,
        originalQ: origQ,
        shuffledIndex: shufIdx !== -1 ? shufIdx : origIdx,
        shuffledQ: shufQ,
        issues,
        optionMap,
        status
      };
    });
  }, [originalQuestions, activeExam]);

  // Statistics summaries
  const stats = useMemo(() => {
    let totalIssues = 0;
    let mathErrorCount = 0;
    let formatErrorCount = 0;
    let tokenLeakCount = 0;
    let cleanCount = 0;

    diffPairs.forEach((pair) => {
      if (pair.issues.length === 0) {
        cleanCount++;
      } else {
        totalIssues += pair.issues.length;
        pair.issues.forEach((issue) => {
          if (issue.type === 'MATH') mathErrorCount++;
          if (issue.type === 'FORMAT' || issue.type === 'OPTION_MISMATCH') formatErrorCount++;
          if (issue.type === 'TOKEN_LEAK') tokenLeakCount++;
        });
      }
    });

    return {
      total: diffPairs.length,
      totalIssues,
      mathErrorCount,
      formatErrorCount,
      tokenLeakCount,
      cleanCount,
      accuracyPct: Math.round((cleanCount / (diffPairs.length || 1)) * 100)
    };
  }, [diffPairs]);

  // Filtered Diff Pairs
  const filteredPairs = useMemo(() => {
    return diffPairs.filter((pair) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContent =
          pair.originalQ.content.toLowerCase().includes(q) ||
          pair.shuffledQ.content.toLowerCase().includes(q) ||
          `câu ${pair.originalIndex + 1}`.includes(q) ||
          `câu ${pair.shuffledIndex + 1}`.includes(q);
        if (!matchesContent) return false;
      }

      if (filterMode === 'issues_only') return pair.issues.length > 0 || !!manualFlags[pair.originalIndex];
      if (filterMode === 'math') return pair.issues.some((i) => i.type === 'MATH' || i.type === 'TOKEN_LEAK');
      if (filterMode === 'format') return pair.issues.some((i) => i.type === 'FORMAT' || i.type === 'OPTION_MISMATCH' || i.type === 'IMAGE_MISSING');
      return true;
    });
  }, [diffPairs, filterMode, searchQuery, manualFlags]);

  // Quick Auto-Fix All for Active Code
  const handleAutoFixAll = () => {
    if (!activeExam || !onUpdateShuffledExamQuestion) return;

    let fixedCount = 0;
    diffPairs.forEach((pair) => {
      if (pair.issues.length > 0) {
        const fixed = autoFixQuestion(pair.shuffledQ);
        onUpdateShuffledExamQuestion(activeExam.code, pair.shuffledIndex, fixed);
        fixedCount++;
      }
    });

    alert(`⚡ Đã tự động tối ưu & sửa lỗi cho ${fixedCount} câu hỏi trong Mã đề ${activeExam.code}!`);
  };

  // Export current code to Word
  const handleDownloadWord = () => {
    const printContainerId = `print-exam-${activeExam.code}`;
    const printEl = document.getElementById(printContainerId);
    if (printEl) {
      exportHtmlToWord(printEl, `${examTitle}_Ma_${activeExam.code}`);
    } else {
      // Fallback: create temporary DOM element
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-diff-export';
      tempDiv.className = 'p-6 bg-white font-serif';
      tempDiv.innerHTML = `
        <h2 style="text-align: center; font-weight: bold; font-size: 16pt;">${examTitle.toUpperCase()}</h2>
        <p style="text-align: center; font-style: italic; font-size: 11pt;">Mã đề thi: ${activeExam.code}</p>
        <hr style="margin: 15px 0;" />
        ${activeExam.questions
          .map(
            (q, idx) => `
          <div style="margin-bottom: 15px;">
            <p><strong>Câu ${idx + 1}:</strong> ${q.content}</p>
            ${
              q.options
                ? `<div style="margin-left: 20px;">
                    ${q.options.map((opt, oIdx) => `<p>${String.fromCharCode(65 + oIdx)}. ${opt}</p>`).join('')}
                   </div>`
                : ''
            }
          </div>
        `
          )
          .join('')}
      `;
      document.body.appendChild(tempDiv);
      exportHtmlToWord(tempDiv, `${examTitle}_Ma_${activeExam.code}`);
      setTimeout(() => document.body.removeChild(tempDiv), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      {/* HEADER TOP BAR */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <FileDiff className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg flex items-center gap-2 text-slate-100">
              Giao diện So Sánh Song Song (Diff Viewer)
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                GDPT 2025
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              So sánh chi tiết Đề gốc (Đề số 01) với Mã đề {selectedCode} · Kiểm định công thức MathJax & Tối ưu Word
            </p>
          </div>
        </div>

        {/* CONTROLS RIGHT */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mã đề Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <span className="text-xs font-semibold text-slate-300 pl-2">Mã đề:</span>
            {shuffledExams.map((exam) => (
              <button
                key={exam.code}
                onClick={() => setSelectedCode(exam.code)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  selectedCode === exam.code
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                }`}
              >
                {exam.code}
              </button>
            ))}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'diff'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileDiff className="w-3.5 h-3.5" /> So sánh Trực tiếp
            </button>
            <button
              onClick={() => setViewMode('word_preview')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'word_preview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Mô phỏng Word (.docx)
            </button>
          </div>

          {/* Auto-Fix Button */}
          <button
            onClick={handleAutoFixAll}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            title="Sửa nhanh tất cả token rò rỉ, cân bằng dấu $ và xóa tiền tố thừa"
          >
            <Zap className="w-3.5 h-3.5" /> Sửa Tự Động (Auto-Fix)
          </button>

          {/* Download Word */}
          <button
            onClick={handleDownloadWord}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Tải Word Mã {selectedCode}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            title="Đóng giao diện so sánh"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* DASHBOARD STATS BAR */}
      <div className="bg-slate-800/90 border-b border-slate-700/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300 shrink-0">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Độ chính xác toán học:</span>
            <span className={`font-mono font-bold text-sm ${stats.accuracyPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {stats.accuracyPct}%
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-3">
            <span className="text-slate-400">Tổng: <strong className="text-slate-100">{stats.total} câu</strong></span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {stats.cleanCount} chuẩn
            </span>
            {stats.totalIssues > 0 && (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {stats.totalIssues} phát hiện
              </span>
            )}
          </div>

          {stats.tokenLeakCount > 0 && (
            <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono border border-rose-500/30">
              🔴 {stats.tokenLeakCount} Token mồ côi
            </span>
          )}

          {stats.mathErrorCount > 0 && (
            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono border border-amber-500/30">
              ⚠️ {stats.mathErrorCount} Lỗi $ / MathJax
            </span>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-md pl-8 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-32 sm:w-44"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-700">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                filterMode === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất cả ({diffPairs.length})
            </button>
            <button
              onClick={() => setFilterMode('issues_only')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                filterMode === 'issues_only' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Có cảnh báo ({stats.totalIssues})
            </button>
            <button
              onClick={() => setFilterMode('math')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                filterMode === 'math' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lỗi Công thức
            </button>
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTENT AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 space-y-6">
        {filteredPairs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
            <p className="font-semibold text-base text-slate-200">Không tìm thấy câu hỏi nào có lỗi theo bộ lọc!</p>
            <p className="text-xs text-slate-500">Tất cả các câu hỏi trong Mã đề {selectedCode} đều đảm bảo toàn vẹn toán học và chuẩn định dạng.</p>
            <button
              onClick={() => {
                setFilterMode('all');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-700 border border-slate-700"
            >
              Xem tất cả các câu
            </button>
          </div>
        ) : viewMode === 'diff' ? (
          /* SIDE-BY-SIDE DIFF COMPARISON CARDS */
          filteredPairs.map((pair) => {
            const isEditing = editingQIndex === pair.originalIndex;
            const manualFlagNote = manualFlags[pair.originalIndex];

            return (
              <div
                key={pair.originalIndex}
                className={`rounded-xl border transition-all ${
                  pair.status === 'error'
                    ? 'border-rose-500/50 bg-slate-900/90 shadow-lg shadow-rose-950/20'
                    : pair.status === 'warning'
                    ? 'border-amber-500/50 bg-slate-900/90'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {/* QUESTION CARD HEADER */}
                <div className="bg-slate-800/80 px-4 py-2.5 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-200 text-sm">
                      Câu {pair.originalIndex + 1} (Đề gốc)
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-bold text-emerald-400 text-sm">
                      Câu {pair.shuffledIndex + 1} (Mã {selectedCode})
                    </span>

                    {pair.originalQ.section && (
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-medium">
                        Phần {pair.originalQ.section}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    {pair.status === 'clean' ? (
                      <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Chuẩn MathJax & Word
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {pair.issues.length} Cảnh báo
                      </span>
                    )}

                    {/* Manual flag note indicator */}
                    {manualFlagNote && (
                      <span className="text-[11px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 font-medium">
                        🚩 {manualFlagNote}
                      </span>
                    )}

                    {/* Manual Fix Button */}
                    <button
                      onClick={() => {
                        const fixed = autoFixQuestion(pair.shuffledQ);
                        if (onUpdateShuffledExamQuestion && activeExam) {
                          onUpdateShuffledExamQuestion(activeExam.code, pair.shuffledIndex, fixed);
                        }
                      }}
                      className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                      title="Sửa tự động các rò rỉ token và công thức chưa đóng dấu $"
                    >
                      <Zap className="w-3 h-3" /> Sửa nhanh
                    </button>

                    {/* Manual Flag/Edit toggle */}
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditingQIndex(null);
                        } else {
                          setEditingQIndex(pair.originalIndex);
                          setEditContent(pair.shuffledQ.content);
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> {isEditing ? 'Đóng' : 'Sửa nội dung'}
                    </button>
                  </div>
                </div>

                {/* ISSUES ALERT BANNER */}
                {pair.issues.length > 0 && (
                  <div className="bg-amber-950/40 border-b border-amber-500/20 px-4 py-2 space-y-1 text-xs">
                    {pair.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-amber-300 uppercase tracking-wider font-mono text-[10px] mr-1">
                            [{issue.type}]
                          </strong>
                          {issue.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* INLINE EDIT MODE FORM */}
                {isEditing && (
                  <div className="p-4 bg-slate-800/90 border-b border-slate-700 space-y-3">
                    <label className="block text-xs font-bold text-slate-300">
                      Chỉnh sửa trực tiếp nội dung Đề trộn (Mã {selectedCode} - Câu {pair.shuffledIndex + 1}):
                    </label>
                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          const note = prompt('Nhập ghi chú đánh dấu sai sót (ví dụ: Thiếu dấu phẩy, hình vẽ bị mờ):');
                          if (note !== null) {
                            setManualFlags((prev) => ({ ...prev, [pair.originalIndex]: note }));
                          }
                        }}
                        className="px-3 py-1 bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-medium rounded"
                      >
                        🚩 Thêm Ghi chú Báo lỗi
                      </button>

                      <button
                        onClick={() => {
                          if (onUpdateShuffledExamQuestion && activeExam) {
                            onUpdateShuffledExamQuestion(activeExam.code, pair.shuffledIndex, {
                              ...pair.shuffledQ,
                              content: editContent
                            });
                          }
                          setEditingQIndex(null);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Lưu thay đổi
                      </button>
                    </div>
                  </div>
                )}

                {/* SIDE BY SIDE COMPARISON GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-sm">
                  {/* LEFT COLUMN: ORIGINAL QUESTION (ĐỀ GỐC) */}
                  <div className="p-4 space-y-3 bg-slate-900/40">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/60">
                      <span className="font-bold text-slate-300">📄 ĐỀ GỐC (Đề số 01)</span>
                      <span>Thứ tự: Câu {pair.originalIndex + 1}</span>
                    </div>

                    {/* Original Content Rendered */}
                    <div className="text-slate-200 text-xs sm:text-sm leading-relaxed prose prose-invert max-w-none">
                      <MathView content={pair.originalQ.content} />
                    </div>

                    {/* Original Options */}
                    {pair.originalQ.options && pair.originalQ.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {pair.originalQ.options.map((opt, oIdx) => {
                          const isCorrect = pair.originalQ.correctOptionIndex === oIdx;
                          return (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-lg text-xs border ${
                                isCorrect
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 font-semibold'
                                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                              }`}
                            >
                              <span className="font-bold text-slate-400 mr-1.5">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <MathView content={opt} inline />
                              {isCorrect && (
                                <span className="ml-1 text-[10px] text-emerald-400 font-bold">(Đúng)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Original TF Statements */}
                    {pair.originalQ.tfStatements && (
                      <div className="space-y-1.5 pt-2">
                        {pair.originalQ.tfStatements.map((tf, tIdx) => (
                          <div key={tIdx} className="p-2 rounded bg-slate-800/50 border border-slate-700 text-xs flex items-center justify-between">
                            <span>{String.fromCharCode(97 + tIdx)}) <MathView content={tf.statement} inline /></span>
                            <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${tf.correct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                              {tf.correct ? 'ĐÚNG' : 'SAI'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: SHUFFLED EXAM QUESTION (ĐỀ ĐÃ TRỘN) */}
                  <div className="p-4 space-y-3 bg-slate-900/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/60">
                      <span className="font-bold text-emerald-400">🔀 ĐỀ ĐÃ TRỘN (Mã {selectedCode})</span>
                      <span>Thứ tự: Câu {pair.shuffledIndex + 1}</span>
                    </div>

                    {/* Shuffled Content Rendered with highlight for visual tokens */}
                    <div className="text-slate-100 text-xs sm:text-sm leading-relaxed prose prose-invert max-w-none relative">
                      <MathView content={pair.shuffledQ.content} />
                    </div>

                    {/* Shuffled Options & Option Map Indicator */}
                    {pair.shuffledQ.options && pair.shuffledQ.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {pair.shuffledQ.options.map((opt, oIdx) => {
                          const isCorrect = pair.shuffledQ.correctOptionIndex === oIdx;
                          const origMappedIdx = pair.optionMap.indexOf(oIdx);

                          return (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-lg text-xs border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-100 font-semibold'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-emerald-400">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                {origMappedIdx !== -1 && (
                                  <span className="text-[10px] text-slate-400 font-mono" title="Nguồn từ đáp án gốc">
                                    (Gốc {String.fromCharCode(65 + origMappedIdx)})
                                  </span>
                                )}
                              </div>
                              <MathView content={opt} inline />
                              {isCorrect && (
                                <span className="ml-1 text-[10px] text-emerald-400 font-bold">(Đúng)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Shuffled TF Statements */}
                    {pair.shuffledQ.tfStatements && (
                      <div className="space-y-1.5 pt-2">
                        {pair.shuffledQ.tfStatements.map((tf, tIdx) => (
                          <div key={tIdx} className="p-2 rounded bg-slate-800/80 border border-slate-700 text-xs flex items-center justify-between">
                            <span>{String.fromCharCode(97 + tIdx)}) <MathView content={tf.statement} inline /></span>
                            <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${tf.correct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                              {tf.correct ? 'ĐÚNG' : 'SAI'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* WORD DOCUMENT (.DOCX) SIMULATION VIEW */
          <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-xl shadow-2xl p-8 space-y-6 font-serif">
            <div className="text-center space-y-1 border-b pb-4 border-slate-200">
              <h3 className="font-bold text-xl uppercase tracking-wide">{examTitle}</h3>
              <p className="text-sm font-semibold text-slate-700">MÃ ĐỀ THI: {selectedCode}</p>
              <p className="text-xs text-slate-500 italic">
                (Mô phỏng 100% định dạng xuất tệp Word .docx chuẩn Times New Roman & công thức OMML)
              </p>
            </div>

            <div className="space-y-6 text-sm leading-relaxed">
              {activeExam.questions.map((q, idx) => (
                <div key={idx} className="space-y-2 border-b border-slate-100 pb-4">
                  <div className="font-semibold text-slate-900 flex items-start gap-1.5">
                    <span className="font-bold shrink-0">Câu {idx + 1}:</span>
                    <div className="flex-1">
                      <MathView content={q.content} />
                    </div>
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-6 pt-1 text-xs sm:text-sm">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-start gap-1">
                          <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                          <MathView content={opt} inline />
                        </div>
                      ))}
                    </div>
                  )}

                  {q.tfStatements && (
                    <div className="pl-6 space-y-1 text-xs sm:text-sm">
                      {q.tfStatements.map((tf, tIdx) => (
                        <div key={tIdx} className="flex items-start gap-1">
                          <span className="font-bold">{String.fromCharCode(97 + tIdx)})</span>
                          <MathView content={tf.statement} inline />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ANSWER KEY MATRIX AT BOTTOM */}
            <div className="pt-6 border-t-2 border-slate-800 space-y-3">
              <h4 className="font-bold text-center text-base uppercase">BẢNG ĐÁP ÁN MÃ ĐỀ {selectedCode}</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-400 text-xs text-center">
                  <thead>
                    <tr className="bg-slate-100 font-bold">
                      <th className="border border-slate-400 p-1.5">Câu</th>
                      {activeExam.questions.slice(0, 20).map((_, i) => (
                        <th key={i} className="border border-slate-400 p-1 w-7">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-1 font-bold bg-slate-50">Đ.Án</td>
                      {activeExam.questions.slice(0, 20).map((q, i) => {
                        const ansChar =
                          q.correctOptionIndex !== undefined
                            ? String.fromCharCode(65 + q.correctOptionIndex)
                            : q.correctAnswer || '-';
                        return (
                          <td key={i} className="border border-slate-400 p-1 font-mono font-bold text-emerald-800">
                            {ansChar}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ACTION BAR */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Hệ thống tự động đồng bộ & làm sạch file Word trước khi tải về.</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoFixAll}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" /> Sửa Tự Động Tất Cả Lỗi (Auto-Fix)
          </button>
          <button
            onClick={handleDownloadWord}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Tải File Word Mã {selectedCode} (.docx)
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
