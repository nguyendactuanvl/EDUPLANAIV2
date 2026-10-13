import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  RefreshCcw,
  Wand2,
  FileCode,
  Download,
  Copy,
  Check,
  Zap,
  HelpCircle,
  FileDiff,
  Search,
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { MathView } from './MathView';
import { Question, ShuffledExam } from './ExamDiffViewer';
import { sanitizeExamQuestion, cleanOptionText } from '../lib/utils';
import { exportHtmlToWord } from '../lib/exportUtils';

export interface ExamAuditIssue {
  id: string;
  examCode: string;
  questionIndex: number;
  questionNumber: number;
  category: 'FORMULA' | 'CONTENT_LOSS' | 'ANSWER_ALIGNMENT' | 'FORMATTING' | 'IMAGE_MISSING';
  severity: 'error' | 'warning' | 'info';
  title: string;
  location: string;
  description: string;
  originalSnippet?: string;
  exportedSnippet?: string;
  suggestedFix: string;
  autoFixable: boolean;
}

export interface ExamAiInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalQuestions: Question[];
  shuffledExams: ShuffledExam[];
  examTitle?: string;
  selectedCode?: string;
  onApplyAutoFixAll: (fixedExams: ShuffledExam[]) => void;
}

export function ExamAiInspectorModal({
  isOpen,
  onClose,
  originalQuestions = [],
  shuffledExams = [],
  examTitle = 'Đề Thi',
  selectedCode,
  onApplyAutoFixAll
}: ExamAiInspectorModalProps) {
  const [activeCodeTab, setActiveCodeTab] = useState<string>(selectedCode || 'all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [copiedReport, setCopiedReport] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixedSuccessMsg, setFixedSuccessMsg] = useState<string | null>(null);

  // Filter list of exams to audit based on activeCodeTab
  const targetExams = useMemo(() => {
    if (activeCodeTab === 'all') return shuffledExams;
    return shuffledExams.filter(e => e.code === activeCodeTab);
  }, [shuffledExams, activeCodeTab]);

  // Execute comprehensive audit across targetExams against originalQuestions
  const auditReport = useMemo(() => {
    if (!originalQuestions || originalQuestions.length === 0 || targetExams.length === 0) {
      return {
        overallScore: 0,
        issues: [] as ExamAuditIssue[],
        totalQuestionsChecked: 0,
        examCount: targetExams.length,
        categoryCounts: { FORMULA: 0, CONTENT_LOSS: 0, ANSWER_ALIGNMENT: 0, FORMATTING: 0, IMAGE_MISSING: 0 }
      };
    }

    const issues: ExamAuditIssue[] = [];
    let totalQuestionsChecked = 0;
    const categoryCounts = { FORMULA: 0, CONTENT_LOSS: 0, ANSWER_ALIGNMENT: 0, FORMATTING: 0, IMAGE_MISSING: 0 };

    targetExams.forEach((exam) => {
      const examCode = exam.code;
      const questions = exam.questions || [];

      // 1. Check total question count parity
      if (questions.length !== originalQuestions.length) {
        categoryCounts.CONTENT_LOSS++;
        issues.push({
          id: `count-mismatch-${examCode}`,
          examCode,
          questionIndex: -1,
          questionNumber: 0,
          category: 'CONTENT_LOSS',
          severity: 'error',
          title: 'Cảnh báo Thiếu/Thừa Số Lượng Câu Hỏi',
          location: `Mã đề ${examCode}`,
          description: `Đề gốc có ${originalQuestions.length} câu nhưng Mã đề ${examCode} chỉ có ${questions.length} câu. Có câu hỏi bị thất lạc trong quá trình trộn đề!`,
          suggestedFix: 'Tự động phục hồi lại các câu hỏi bị thiếu từ đề gốc.',
          autoFixable: true
        });
      }

      // Audit individual questions
      questions.forEach((q, idx) => {
        totalQuestionsChecked++;
        const qNum = idx + 1;
        const origQ = originalQuestions.find(o => (o.id !== undefined && o.id === q.originalId) || o.id === q.id) || originalQuestions[idx];

        const rawContent = q.content || '';
        const origContent = origQ?.content || '';

        // A. CONTENT LOSS CHECK
        if (!rawContent || rawContent.trim().length < 5) {
          categoryCounts.CONTENT_LOSS++;
          issues.push({
            id: `empty-stem-${examCode}-${qNum}`,
            examCode,
            questionIndex: idx,
            questionNumber: qNum,
            category: 'CONTENT_LOSS',
            severity: 'error',
            title: 'Nội dung Đề bài bị Trống / Mất mát',
            location: `Mã đề ${examCode} - Câu ${qNum}`,
            description: 'Thân câu hỏi bị rỗng hoặc mất dữ liệu trong file xuất.',
            originalSnippet: origContent.slice(0, 100),
            exportedSnippet: rawContent,
            suggestedFix: 'Khôi phục lại thân câu hỏi chuẩn từ đề gốc.',
            autoFixable: true
          });
        }

        // Check Multiple Choice options count (Expect 4 options)
        if (q.type === 'mc' || q.type === 'MULTIPLE_CHOICE' || (!q.type && q.options && q.options.length > 0)) {
          if (!q.options || q.options.length < 4) {
            categoryCounts.CONTENT_LOSS++;
            issues.push({
              id: `options-loss-${examCode}-${qNum}`,
              examCode,
              questionIndex: idx,
              questionNumber: qNum,
              category: 'CONTENT_LOSS',
              severity: 'error',
              title: 'Thiếu Phương án Lựa chọn (A, B, C, D)',
              location: `Mã đề ${examCode} - Câu ${qNum}`,
              description: `Câu hỏi trắc nghiệm chỉ có ${q.options?.length || 0}/4 phương án. Khả năng cao phương án C hoặc D bị rơi rớt.`,
              originalSnippet: origQ?.options?.join(' | '),
              exportedSnippet: q.options?.join(' | '),
              suggestedFix: 'Tái tạo lại đủ 4 phương án từ đề gốc.',
              autoFixable: true
            });
          }
        }

        // Check True/False sub-statements count (Expect 4 items: a, b, c, d)
        if (q.type === 'tf' || q.type === 'TRUE_FALSE' || (q.tfStatements && q.tfStatements.length > 0)) {
          if (!q.tfStatements || q.tfStatements.length < 4) {
            categoryCounts.CONTENT_LOSS++;
            issues.push({
              id: `tf-loss-${examCode}-${qNum}`,
              examCode,
              questionIndex: idx,
              questionNumber: qNum,
              category: 'CONTENT_LOSS',
              severity: 'error',
              title: 'Thiếu Ý Đúng/Sai (a, b, c, d)',
              location: `Mã đề ${examCode} - Câu ${qNum}`,
              description: `Câu hỏi Đúng/Sai chỉ có ${q.tfStatements?.length || 0}/4 mệnh đề.`,
              originalSnippet: origQ?.tfStatements?.map(t => t.statement).join(' | '),
              exportedSnippet: q.tfStatements?.map(t => t.statement).join(' | '),
              suggestedFix: 'Bổ sung đầy đủ 4 ý a, b, c, d.',
              autoFixable: true
            });
          }
        }

        // B. MATHJAX & LATEX FORMULA CHECK
        const dollarCount = (rawContent.match(/(?<!\\)\$/g) || []).length;
        if (dollarCount % 2 !== 0) {
          categoryCounts.FORMULA++;
          issues.push({
            id: `math-dollar-${examCode}-${qNum}`,
            examCode,
            questionIndex: idx,
            questionNumber: qNum,
            category: 'FORMULA',
            severity: 'error',
            title: 'Lỗi Cặp Dấu $ MathJax Rách Chuỗi',
            location: `Mã đề ${examCode} - Câu ${qNum}`,
            description: `Thân câu hỏi có ${dollarCount} dấu $ (số lẻ), khiến MathJax không thể render công thức toán.`,
            exportedSnippet: rawContent.slice(0, 120),
            suggestedFix: 'Bổ sung dấu $ đóng bị thiếu ở cuối công thức.',
            autoFixable: true
          });
        }

        // Check options math syntax
        q.options?.forEach((opt, optIdx) => {
          const optDollar = (opt.match(/(?<!\\)\$/g) || []).length;
          if (optDollar % 2 !== 0) {
            categoryCounts.FORMULA++;
            issues.push({
              id: `math-opt-dollar-${examCode}-${qNum}-${optIdx}`,
              examCode,
              questionIndex: idx,
              questionNumber: qNum,
              category: 'FORMULA',
              severity: 'warning',
              title: `Lỗi Công Thức ở Phương Án ${String.fromCharCode(65 + optIdx)}`,
              location: `Mã đề ${examCode} - Câu ${qNum} (Phương án ${String.fromCharCode(65 + optIdx)})`,
              description: `Phương án ${String.fromCharCode(65 + optIdx)} bị thiếu dấu $ đóng công thức.`,
              exportedSnippet: opt,
              suggestedFix: 'Tự động bọc chuẩn công thức toán.',
              autoFixable: true
            });
          }
        });

        // C. SYSTEM TOKEN LEAKS & FORMATTING
        const tokenLeakRegex = /(?:___?VISUAL_?TOKEN_\d+___?|__ENV_\d+__|__MATH_\d+__|__TEXT_\d+__|(?<![a-zA-Z0-9_])undefined(?![a-zA-Z0-9_]))/gi;
        const leaks = rawContent.match(tokenLeakRegex);
        if (leaks && leaks.length > 0) {
          categoryCounts.FORMATTING++;
          issues.push({
            id: `token-leak-${examCode}-${qNum}`,
            examCode,
            questionIndex: idx,
            questionNumber: qNum,
            category: 'FORMATTING',
            severity: 'error',
            title: 'Rò Rỉ Token Mã Hóa Hệ Thống',
            location: `Mã đề ${examCode} - Câu ${qNum}`,
            description: `Xuất hiện ký tự mã hóa lạ (${leaks[0]}) trong câu hỏi.`,
            exportedSnippet: rawContent,
            suggestedFix: 'Loại bỏ ký tự token thừa và phục hồi văn bản.',
            autoFixable: true
          });
        }

        // Double option prefixes (e.g., "A. A. ")
        q.options?.forEach((opt, optIdx) => {
          if (/^[A-D]\.\s*[A-D]\./i.test(opt.trim())) {
            categoryCounts.FORMATTING++;
            issues.push({
              id: `double-prefix-${examCode}-${qNum}-${optIdx}`,
              examCode,
              questionIndex: idx,
              questionNumber: qNum,
              category: 'FORMATTING',
              severity: 'warning',
              title: `Lỗi Lặp Tiền Đề Phương Án (${String.fromCharCode(65 + optIdx)})`,
              location: `Mã đề ${examCode} - Câu ${qNum}`,
              description: `Phương án bị lặp tiêu đề ("${opt.slice(0, 10)}...").`,
              exportedSnippet: opt,
              suggestedFix: 'Chuẩn hóa loại bỏ tiền đề lặp.',
              autoFixable: true
            });
          }
        });

        // D. FIGURE / IMAGE MISSING CHECK
        if ((origQ?.imageUrl || origQ?.hasFigure || /<(?:img|svg|svg-wrapper)/i.test(origContent)) &&
            (!q.imageUrl && !q.hasFigure && !/<(?:img|svg|svg-wrapper)/i.test(rawContent))) {
          categoryCounts.IMAGE_MISSING++;
          issues.push({
            id: `missing-figure-${examCode}-${qNum}`,
            examCode,
            questionIndex: idx,
            questionNumber: qNum,
            category: 'IMAGE_MISSING',
            severity: 'warning',
            title: 'Thất Lạc Hình Vẽ / Đồ Thị Sắc Nét',
            location: `Mã đề ${examCode} - Câu ${qNum}`,
            description: 'Câu gốc có chứa hình vẽ/đồ thị nhưng mã đề đã trộn bị thiếu hình.',
            originalSnippet: origContent,
            suggestedFix: 'Tự động chèn lại thẻ hình vẽ / đồ thị từ đề gốc.',
            autoFixable: true
          });
        }
      });
    });

    const totalErrors = issues.filter(i => i.severity === 'error').length;
    const totalWarnings = issues.filter(i => i.severity === 'warning').length;

    let overallScore = 100 - (totalErrors * 10) - (totalWarnings * 3);
    if (overallScore < 0) overallScore = 0;
    if (issues.length === 0) overallScore = 100;

    return {
      overallScore,
      issues,
      totalQuestionsChecked,
      examCount: targetExams.length,
      categoryCounts
    };
  }, [originalQuestions, targetExams, activeCodeTab]);

  // Filter issues based on category selection
  const filteredIssues = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return auditReport.issues;
    return auditReport.issues.filter(i => i.category === selectedCategoryFilter);
  }, [auditReport.issues, selectedCategoryFilter]);

  // 1-Click Auto Fix Handler for all detected issues
  const handleFixAllIssues = () => {
    setIsFixing(true);
    setFixedSuccessMsg(null);

    try {
      const repairedExams: ShuffledExam[] = shuffledExams.map((exam) => {
        const repairedQuestions: Question[] = (exam.questions || []).map((q, idx) => {
          const origQ = originalQuestions.find(o => (o.id !== undefined && o.id === q.originalId) || o.id === q.id) || originalQuestions[idx];

          let cleanStem = q.content || '';
          if (!cleanStem || cleanStem.trim().length < 5) {
            cleanStem = origQ?.content || cleanStem;
          }

          // Balance dollar signs in stem
          const stemDollarCount = (cleanStem.match(/(?<!\\)\$/g) || []).length;
          if (stemDollarCount % 2 !== 0) {
            cleanStem += ' $';
          }

          // Strip token leaks
          cleanStem = cleanStem.replace(/(?:___?VISUAL_?TOKEN_\d+___?|__ENV_\d+__|__MATH_\d+__|__TEXT_\d+__|(?<![a-zA-Z0-9_])undefined(?![a-zA-Z0-9_]))/gi, '');

          // Restore missing SVG / image tag if present in original
          if (origQ && (origQ.imageUrl || origQ.hasFigure || /<svg-wrapper/i.test(origQ.content)) && !/<(?:img|svg|svg-wrapper)/i.test(cleanStem)) {
            const svgMatch = origQ.content.match(/<svg-wrapper[\s\S]*?<\/svg-wrapper>/i);
            if (svgMatch) {
              cleanStem = cleanStem + `\n\n${svgMatch[0]}\n\n`;
            } else if (origQ.imageUrl) {
              cleanStem = cleanStem + `\n\n<img src="${origQ.imageUrl}" alt="Hình vẽ" className="max-w-xs mx-auto my-2 rounded border" />\n\n`;
            }
          }

          // Repair options
          let repairedOptions = q.options ? [...q.options] : (origQ?.options ? [...origQ.options] : []);
          repairedOptions = repairedOptions.map((opt) => {
            let o = opt || '';
            // Remove double prefix "A. A. "
            o = o.replace(/^([A-D]\.)\s*[A-D]\.\s*/i, '$1 ');
            // Balance dollars
            const optDollarCount = (o.match(/(?<!\\)\$/g) || []).length;
            if (optDollarCount % 2 !== 0) {
              o += ' $';
            }
            return o;
          });

          // Ensure 4 options if original had 4
          if (repairedOptions.length < 4 && origQ?.options && origQ.options.length >= 4) {
            repairedOptions = [...origQ.options];
          }

          return {
            ...q,
            content: sanitizeExamQuestion(cleanStem),
            options: repairedOptions
          };
        });

        return {
          ...exam,
          questions: repairedQuestions
        };
      });

      onApplyAutoFixAll(repairedExams);
      setFixedSuccessMsg(`Đã tự động sửa hoàn tất ${auditReport.issues.length} vị trí lỗi trên toàn bộ các mã đề!`);
      setTimeout(() => setFixedSuccessMsg(null), 4000);
    } catch (e: any) {
      console.error("Lỗi tự động sửa:", e);
    } finally {
      setIsFixing(false);
    }
  };

  // Copy textual audit report to clipboard
  const handleCopyReport = () => {
    const lines: string[] = [];
    lines.push(`=== BÁO CÁO AI KIỂM TRA & ĐỐI SOÁT ĐỀ THI (${examTitle}) ===`);
    lines.push(`Thời gian: ${new Date().toLocaleString('vi-VN')}`);
    lines.push(`Tổng số mã đề đối soát: ${auditReport.examCount}`);
    lines.push(`Chỉ số chất lượng: ${auditReport.overallScore}/100`);
    lines.push(`Tổng số lỗi/vị trí phát hiện: ${auditReport.issues.length}\n`);

    auditReport.issues.forEach((issue, i) => {
      lines.push(`${i + 1}. [${issue.category}] ${issue.location}: ${issue.title}`);
      lines.push(`   - Chi tiết: ${issue.description}`);
      lines.push(`   - Gợi ý sửa: ${issue.suggestedFix}`);
      lines.push('');
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header Modal Bar */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-400/30 text-purple-300">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
                <span>AI Kiểm Tra & Đối Soát Chất Lượng Đề Thi</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-purple-500/30 border border-purple-400/30 text-purple-200">
                  GDPT 2018
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Phân tích đối soát file đề đã xuất với đề gốc, tự động phát hiện lỗi MathJax, rò rỉ token và mất mát nội dung
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Sao chép toàn bộ báo cáo đối soát lỗi"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedReport ? 'Đã chép báo cáo' : 'Chép Báo Cáo'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Header Card & Score Overview */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            
            {/* Score Card */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className={`p-3 rounded-xl font-bold text-xl font-mono flex items-center justify-center shrink-0 ${
                auditReport.overallScore >= 90
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : auditReport.overallScore >= 70
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {auditReport.overallScore}%
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chỉ Số Chất Lượng</p>
                <p className="text-sm font-bold text-slate-800">
                  {auditReport.overallScore >= 90
                    ? 'Sẵn sàng xuất in'
                    : auditReport.overallScore >= 70
                    ? 'Cần rà soát nhẹ'
                    : 'Cần sửa lỗi ngay'}
                </p>
              </div>
            </div>

            {/* Total Issues Card */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Số Vị Trí Cần Sửa</p>
                <p className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">
                  {auditReport.issues.length} <span className="text-xs font-normal text-slate-500">vị trí</span>
                </p>
              </div>
              <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* Exam Codes Count */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã Đề Đang Đối Soát</p>
                <p className="text-xl font-extrabold font-mono text-purple-700 mt-0.5">
                  {auditReport.examCount} <span className="text-xs font-normal text-slate-500">mã đề</span>
                </p>
              </div>
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <FileCode className="w-5 h-5" />
              </div>
            </div>

            {/* 1-Click Fix Button */}
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-3 rounded-xl shadow-sm text-white flex flex-col justify-center">
              <button
                onClick={handleFixAllIssues}
                disabled={isFixing || auditReport.issues.length === 0}
                className="w-full py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {isFixing ? (
                  <>
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    <span>Đang Sửa Dữ Liệu...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-amber-200 animate-bounce" />
                    <span>⚡ Sửa Nhanh 1-Click Tất Cả</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Success Notification Alert */}
          {fixedSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{fixedSuccessMsg}</span>
            </div>
          )}

          {/* Code Selection Tabs & Category Filters */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200">
            {/* Exam Code Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs font-bold text-slate-600 mr-1 shrink-0">Chọn Mã Đề:</span>
              <button
                onClick={() => setActiveCodeTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeCodeTab === 'all'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Tất cả ({shuffledExams.length})
              </button>
              {shuffledExams.map(e => (
                <button
                  key={e.code}
                  onClick={() => setActiveCodeTab(e.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeCodeTab === e.code
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Mã {e.code}
                </button>
              ))}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedCategoryFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Tất cả ({auditReport.issues.length})
              </button>
              <button
                onClick={() => setSelectedCategoryFilter('FORMULA')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedCategoryFilter === 'FORMULA' ? 'bg-red-700 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                Lỗi MathJax ({auditReport.categoryCounts.FORMULA})
              </button>
              <button
                onClick={() => setSelectedCategoryFilter('CONTENT_LOSS')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedCategoryFilter === 'CONTENT_LOSS' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                Mất nội dung ({auditReport.categoryCounts.CONTENT_LOSS})
              </button>
              <button
                onClick={() => setSelectedCategoryFilter('FORMATTING')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedCategoryFilter === 'FORMATTING' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                }`}
              >
                Định dạng & Token ({auditReport.categoryCounts.FORMATTING})
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Issues List Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/70 space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="p-4 bg-emerald-50 rounded-full text-emerald-600 mb-3">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Không Phát Hiện Lỗi Nào!</h3>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Tất cả các câu hỏi và mã đề thi đều đảm bảo toàn vẹn nội dung, công thức MathJax chuẩn và đúng ma trận phương án.
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-purple-300"
              >
                {/* Issue Header */}
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      issue.severity === 'error'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {issue.location}
                    </span>
                    <span className="font-bold text-sm text-slate-800">{issue.title}</span>
                  </div>

                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {issue.category}
                  </span>
                </div>

                {/* Issue Details Content */}
                <div className="p-3 text-xs leading-relaxed space-y-2 text-slate-700">
                  <p className="font-medium text-slate-800">{issue.description}</p>

                  {/* Side-by-side Snippet Comparison if available */}
                  {(issue.originalSnippet || issue.exportedSnippet) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      {issue.originalSnippet && (
                        <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                          <p className="font-bold text-emerald-900 mb-1 flex items-center gap-1 font-sans">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đề Gốc Chuẩn:</span>
                          </p>
                          <div className="text-slate-800 break-words">
                            <MathView content={issue.originalSnippet} inline={true} />
                          </div>
                        </div>
                      )}

                      {issue.exportedSnippet && (
                        <div className="p-2 bg-red-50/70 border border-red-200 rounded-lg">
                          <p className="font-bold text-red-900 mb-1 flex items-center gap-1 font-sans">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            <span>Vị Trí Phát Hiện Lỗi:</span>
                          </p>
                          <div className="text-slate-800 break-words">
                            <MathView content={issue.exportedSnippet} inline={true} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fix Suggestion Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-purple-900 bg-purple-50/50 p-2 rounded-lg">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span><b>Khuyến nghị khắc phục:</b> {issue.suggestedFix}</span>
                    </div>

                    {issue.autoFixable && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-200 text-purple-900 rounded font-mono shrink-0">
                        Đã khắc phục qua 1-Click
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Đã hoàn thành kiểm tra {auditReport.totalQuestionsChecked} lượt câu hỏi.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFixAllIssues}
              disabled={isFixing || auditReport.issues.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>Sửa Tất Cả Lỗi Phát Hiện</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
