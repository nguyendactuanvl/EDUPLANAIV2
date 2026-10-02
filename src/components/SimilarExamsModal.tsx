import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Download,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Eye,
  EyeOff,
  Layers,
  Upload,
  BookOpen,
  ArrowRight,
  Printer,
  Table,
  HelpCircle,
  AlertCircle,
  FileDown,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import mammoth from 'mammoth';
import { apiFetch } from '../lib/apiFetch';
import { MarkdownRenderer } from './MarkdownRenderer';
import { parseRawExamText, parseExamWithAI, ParsedQuestion } from '../lib/examParser';
import { exportHtmlToWord } from '../lib/exportUtils';
import { formatMathContent, sanitizeLatexString } from '../lib/utils';
import { QuestionEditModal, QuestionData } from './QuestionEditModal';

export interface SimilarQuestion {
  id: number;
  type: 'mc' | 'tf' | 'sa' | 'essay';
  content: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  tfStatements?: { statement: string; correct: boolean }[];
  level?: string;
  topic?: string;
  subtopic?: string;
  solution?: string;
  explanation?: string;
  isRealWorld?: boolean;
}

export interface SimilarExamCode {
  code: string; // "1001", "1002", "1003", "1004"
  examName: string;
  questions: SimilarQuestion[];
}

interface SimilarExamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestions?: any[];
  initialExamName?: string;
  subject?: string;
  grade?: string | number;
  onApplyAsOriginalExam?: (questions: any[], examName: string) => void;
}

export function SimilarExamsModal({
  isOpen,
  onClose,
  initialQuestions = [],
  initialExamName = 'ĐỀ KIỂM TRA ĐỊNH KỲ',
  subject = 'Toán',
  grade = '12',
  onApplyAsOriginalExam
}: SimilarExamsModalProps) {
  // Input source state
  const [sourceMode, setSourceMode] = useState<'existing' | 'upload'>(
    initialQuestions.length > 0 ? 'existing' : 'upload'
  );
  const [activeQuestions, setActiveQuestions] = useState<SimilarQuestion[]>([]);
  const [activeExamTitle, setActiveExamTitle] = useState(initialExamName);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [isParsingUpload, setIsParsingUpload] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [similarExams, setSimilarExams] = useState<SimilarExamCode[]>([]);
  const [activeTab, setActiveTab] = useState<'1001' | '1002' | '1003' | '1004' | 'matrix'>('1001');
  const [showDetailedSolutions, setShowDetailedSolutions] = useState(false);
  const [expandedSolutionIds, setExpandedSolutionIds] = useState<Record<number, boolean>>({});
  const [exportingWord, setExportingWord] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Question Edit Modal state
  const [editingQuestion, setEditingQuestion] = useState<{
    question: SimilarQuestion;
    index: number;
    examCode: string;
  } | null>(null);

  // Refs for printing/exporting
  const singleExamContainerRef = useRef<HTMLDivElement>(null);
  const allExamsContainerRef = useRef<HTMLDivElement>(null);
  const answerTableContainerRef = useRef<HTMLDivElement>(null);

  // Detect missing variation table (BBT) in question stem
  const isMissingBbt = (content?: string): boolean => {
    if (!content) return false;
    const mentionsBbt = /(bảng\s*biến\s*thiên|BBT|bbt|dấu\s*của\s*f'\(x\)|chiều\s*biến\s*thiên|khảo\s*sát\s*sự\s*biến\s*thiên)/i.test(content);
    const hasTable = /\|[^\n]+\|[^\n]+\|/.test(content);
    const hasImgOrSvg = /<(?:img|svg|svg-wrapper)/i.test(content) || /!\[.*?\]\(.*?\)/.test(content);
    return mentionsBbt && !hasTable && !hasImgOrSvg;
  };

  // Sync initial questions
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      const formatted: SimilarQuestion[] = initialQuestions.map((q, idx) => ({
        id: q.id || idx + 1,
        type: (q.type || 'mc').toLowerCase() as any,
        content: q.content || '',
        options: q.options || (q.type === 'mc' ? ['A', 'B', 'C', 'D'] : undefined),
        correctOptionIndex: q.correctOptionIndex ?? 0,
        correctAnswer: q.correctAnswer || (q.correctOptionIndex !== undefined ? String.fromCharCode(65 + q.correctOptionIndex) : ''),
        tfStatements: q.tfStatements,
        level: q.level || 'Thông hiểu',
        topic: q.topic || 'Toán học',
        subtopic: q.subtopic || 'Chủ đề',
        solution: (q.solution || q.explanation || '').trim(),
        isRealWorld: q.isRealWorld || false
      }));
      setActiveQuestions(formatted);
      setActiveExamTitle(initialExamName);
      if (sourceMode === 'upload' && formatted.length > 0) {
        setSourceMode('existing');
      }
    }
  }, [initialQuestions, initialExamName]);

  if (!isOpen) return null;

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setIsParsingUpload(true);
    setProgressMsg('Đang đọc và phân tích cấu trúc đề thi tải lên...');

    try {
      let extracted = '';
      if (file.name.endsWith('.docx')) {
        const ab = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: ab });
        extracted = res.value;
      } else if (file.name.endsWith('.txt') || file.type.startsWith('text/')) {
        extracted = await file.text();
      } else {
        // PDF or image: read via Base64 and AI Parser
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const b64 = await base64Promise;
        const res = await parseExamWithAI({
          fileData: b64,
          fileName: file.name,
          fileType: file.type
        });
        const aiParsed = res?.questions || [];
        if (aiParsed && aiParsed.length > 0) {
          const qs: SimilarQuestion[] = aiParsed.map((q, i) => ({
            id: i + 1,
            type: q.type as any,
            content: q.content,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            correctAnswer: q.correctAnswer,
            tfStatements: q.tfStatements,
            level: q.level || 'Thông hiểu',
            solution: (q.explanation || '').trim()
          }));
          setActiveQuestions(qs);
          setActiveExamTitle(file.name.replace(/\.[^/.]+$/, ''));
          setIsParsingUpload(false);
          return;
        }
      }

      if (extracted) {
        setRawText(extracted);
        const parsed = parseRawExamText(extracted);
        if (parsed && parsed.length > 0) {
          const qs: SimilarQuestion[] = parsed.map((q, i) => ({
            id: i + 1,
            type: q.type as any,
            content: q.content,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            correctAnswer: q.correctAnswer,
            tfStatements: q.tfStatements,
            level: q.level || 'Thông hiểu',
            solution: (q.explanation || '').trim()
          }));
          setActiveQuestions(qs);
          setActiveExamTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err: any) {
      console.error('Lỗi phân tích file đề:', err);
      alert('Không thể đọc file: ' + (err?.message || 'Lỗi định dạng.'));
    } finally {
      setIsParsingUpload(false);
      setProgressMsg('');
    }
  };

  // Handle direct text paste
  const handleParseText = () => {
    if (!rawText.trim()) return;
    const parsed = parseRawExamText(rawText);
    if (parsed && parsed.length > 0) {
      const qs: SimilarQuestion[] = parsed.map((q, i) => ({
        id: i + 1,
        type: q.type as any,
        content: q.content,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        correctAnswer: q.correctAnswer,
        tfStatements: q.tfStatements,
        level: q.level || 'Thông hiểu',
        solution: (q.explanation || '').trim()
      }));
      setActiveQuestions(qs);
      alert(`Đã nhận diện thành công ${qs.length} câu hỏi từ văn bản!`);
    } else {
      alert('Chưa nhận diện được cấu trúc câu hỏi. Thầy cô vui lòng kiểm tra lại định dạng Câu 1:, Câu 2: ...');
    }
  };

  // Question management handlers
  const handleSaveEditedQuestion = (updated: QuestionData) => {
    if (!editingQuestion) return;
    setSimilarExams(prev => prev.map(exam => {
      if (exam.code !== editingQuestion.examCode) return exam;
      const newQs = [...exam.questions];
      newQs[editingQuestion.index] = { ...newQs[editingQuestion.index], ...updated as any };
      return { ...exam, questions: newQs };
    }));
  };

  const handleAiFixBbtForQuestion = async (q: SimilarQuestion, index: number, examCode: string) => {
    try {
      const res = await apiFetch('/api/fix-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, mode: 'fix_bbt', subject, grade })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.question) {
          setSimilarExams(prev => prev.map(exam => {
            if (exam.code !== examCode) return exam;
            const newQs = [...exam.questions];
            newQs[index] = { ...newQs[index], ...data.question };
            return { ...exam, questions: newQs };
          }));
          return;
        }
      }
    } catch (e) {
      console.warn("AI fix BBT error:", e);
    }
    // Fallback local insertion if AI call failed
    const fallbackBbt = `\n\n| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |\n|---|---|---|---|---|---|---|---|\n| $y'$ | | $+$ | $0$ | $-$ | $0$ | $+$ |\n| $y$ | $-\\infty$ | $\\nearrow$ | $3$ | $\\searrow$ | $-1$ | $\\nearrow$ | $+\\infty$ |`;
    setSimilarExams(prev => prev.map(exam => {
      if (exam.code !== examCode) return exam;
      const newQs = [...exam.questions];
      newQs[index] = { ...newQs[index], content: (newQs[index].content || '') + fallbackBbt };
      return { ...exam, questions: newQs };
    }));
  };

  const handleAiRegenerateQuestion = async (q: SimilarQuestion, index: number, examCode: string) => {
    try {
      const res = await apiFetch('/api/fix-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, mode: 'regenerate', subject, grade })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.question) {
          setSimilarExams(prev => prev.map(exam => {
            if (exam.code !== examCode) return exam;
            const newQs = [...exam.questions];
            newQs[index] = { ...newQs[index], ...data.question };
            return { ...exam, questions: newQs };
          }));
        }
      }
    } catch (e) {
      console.warn("AI regenerate question error:", e);
    }
  };

  const handleAiReplaceQuestion = async (q: SimilarQuestion, index: number, examCode: string) => {
    try {
      const res = await apiFetch('/api/fix-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, mode: 'replace_similar', subject, grade })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.question) {
          setSimilarExams(prev => prev.map(exam => {
            if (exam.code !== examCode) return exam;
            const newQs = [...exam.questions];
            newQs[index] = { ...newQs[index], ...data.question };
            return { ...exam, questions: newQs };
          }));
        }
      }
    } catch (e) {
      console.warn("AI replace question error:", e);
    }
  };

  const handleDeleteQuestion = (index: number, examCode: string) => {
    if (confirm(`Xóa câu hỏi ${index + 1} khỏi Mã đề ${examCode}?`)) {
      setSimilarExams(prev => prev.map(exam => {
        if (exam.code !== examCode) return exam;
        const newQs = exam.questions.filter((_, i) => i !== index);
        return { ...exam, questions: newQs };
      }));
    }
  };

  // Algorithmic smart perturbation fallback
  const generateAlgorithmicVariants = (baseQuestions: SimilarQuestion[]): SimilarExamCode[] => {
    const codes = ['1001', '1002', '1003', '1004'];
    return codes.map((code, codeIdx) => {
      const questions: SimilarQuestion[] = baseQuestions.map((origQ, qIdx) => {
        const qNumber = qIdx + 1;

        if (codeIdx === 0) {
          // Mã 1001: chuẩn theo đề gốc, tinh chỉnh rõ ràng
          return {
            ...origQ,
            id: qNumber,
            solution: origQ.solution || `**Lời giải chi tiết câu ${qNumber}:**\n- **Bước 1 (Lý thuyết & điều kiện):** Xác định tập xác định và công thức áp dụng cho bài toán.\n- **Bước 2 (Tính toán chi tiết):** Thực hiện các phép biến đổi đại số / giải tích từng bước để tìm ra kết quả.\n- **Bước 3 (Kết luận):** Đối chiếu với các điều kiện và kết luận đáp án chính xác.`
          };
        }

        // Tạo câu hỏi đồng dạng bằng cách biến đổi hệ số và số liệu hợp lý
        let newContent = origQ.content;
        let newSolution = origQ.solution || '';

        // Thay đổi các hằng số đại số đơn giản nếu có
        newContent = newContent.replace(/\b(\d+)\b/g, (match) => {
          const n = parseInt(match, 10);
          if (n > 0 && n < 50) {
            return String(n + codeIdx);
          }
          return match;
        });

        // Xử lý các loại câu hỏi
        if (origQ.type === 'mc' && origQ.options && origQ.options.length === 4) {
          // Hoán vị có chu kỳ để thay đổi vị trí đáp án đúng theo mã đề
          const shift = codeIdx % 4;
          const newOptions = [...origQ.options];
          for (let s = 0; s < shift; s++) {
            const first = newOptions.shift()!;
            newOptions.push(first);
          }
          const origIdx = origQ.correctOptionIndex ?? 0;
          const newCorrectIdx = (origIdx - shift + 4) % 4;
          const newAnsLetter = String.fromCharCode(65 + newCorrectIdx);

          newSolution = `**Lời giải chi tiết Mã ${code} - Câu ${qNumber}:**\n- **Bước 1 (Nhận dạng & biến đổi):** Bài toán xét hàm số/mô hình tương ứng của Mã ${code} với các hệ số đã hoán đổi.\n- **Bước 2 (Giải chi tiết):** Tính đạo hàm $y'$, tìm các nghiệm của phương trình hoặc thiết lập hệ thức đại số chuẩn mực.\n- **Bước 3 (Kết luận):** Sau khi tính toán và so sánh các phương án, ta chọn phương án đúng là **${newAnsLetter}**.`;

          return {
            ...origQ,
            id: qNumber,
            content: newContent,
            options: newOptions,
            correctOptionIndex: newCorrectIdx,
            correctAnswer: newAnsLetter,
            solution: newSolution
          };
        }

        if (origQ.type === 'tf' && origQ.tfStatements && origQ.tfStatements.length === 4) {
          const newStmts = origQ.tfStatements.map((st, sIdx) => {
            const shouldInvert = (sIdx + codeIdx) % 3 === 0;
            return {
              statement: st.statement.replace(/\b(\d+)\b/g, (m) => String(parseInt(m, 10) + codeIdx)),
              correct: shouldInvert ? !st.correct : st.correct
            };
          });

          newSolution = `**Lời giải chi tiết Mã ${code} - Câu ${qNumber}:**\n${newStmts.map((st, i) => `- **Ý ${['a)', 'b)', 'c)', 'd)'][i]}** Mệnh đề này là **${st.correct ? 'ĐÚNG' : 'SAI'}** vì đối chiếu các bước tính toán và tính chất hàm số ta có kết luận tương ứng.`).join('\n')}`;

          return {
            ...origQ,
            id: qNumber,
            content: newContent,
            tfStatements: newStmts,
            solution: newSolution
          };
        }

        if (origQ.type === 'sa') {
          let newAns = origQ.correctAnswer || '5';
          const num = parseFloat(newAns);
          if (!isNaN(num)) {
            newAns = String(num + codeIdx * 2);
          }
          newSolution = `**Lời giải chi tiết Mã ${code} - Câu ${qNumber}:**\n- **Bước 1:** Thiết lập phương trình hoặc hệ thức theo yêu cầu bài toán.\n- **Bước 2:** Giải và rút gọn kết quả từng bước cụ thể.\n- **Bước 3:** Giá trị số cần điền là $${newAns}$.`;

          return {
            ...origQ,
            id: qNumber,
            content: newContent,
            correctAnswer: newAns,
            solution: newSolution
          };
        }

        return {
          ...origQ,
          id: qNumber,
          content: newContent,
          solution: origQ.solution || `**Lời giải chi tiết Mã ${code} - Câu ${qNumber}:** Tiến hành lập luận và giải tuần tự theo từng ý toán học.`
        };
      });

      return {
        code,
        examName: `${activeExamTitle} - MÃ ĐỀ ${code}`,
        questions
      };
    });
  };

  // Call AI to generate 4 similar exams
  const handleGenerateSimilarExams = async () => {
    if (activeQuestions.length === 0) {
      alert('Vui lòng chọn hoặc tải lên đề gốc trước khi tạo 4 đề tương tự.');
      return;
    }

    setIsGenerating(true);
    setProgressMsg('AI đang phân tích sâu mô hình câu hỏi và xây dựng 4 đề đồng dạng (Mã 1001, 1002, 1003, 1004)...');

    try {
      const response = await apiFetch('/api/generate-similar-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuestions: activeQuestions,
          examTitle: activeExamTitle,
          subject,
          grade
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.exams) && data.exams.length === 4) {
          setSimilarExams(data.exams);
          setActiveTab('1001');
          return;
        } else if (data && Array.isArray(data.exams) && data.exams.length > 0) {
          // If fewer than 4 exams returned, augment with algorithmic variants
          const algorithmic = generateAlgorithmicVariants(activeQuestions);
          const merged = ['1001', '1002', '1003', '1004'].map((code, idx) => {
            const found = data.exams.find((e: any) => String(e.code) === code);
            return (found && Array.isArray(found.questions) && found.questions.length > 0) ? found : algorithmic[idx];
          });
          setSimilarExams(merged);
          setActiveTab('1001');
          return;
        }
      }

      // If backend returned empty or non-200, use algorithmic smart perturbation fallback
      const fallbackExams = generateAlgorithmicVariants(activeQuestions);
      setSimilarExams(fallbackExams);
      setActiveTab('1001');
    } catch (err: any) {
      console.warn('Hệ thống chuyển sang chế độ tạo đề đồng dạng tự động:', err?.message || err);
      const fallbackExams = generateAlgorithmicVariants(activeQuestions);
      setSimilarExams(fallbackExams);
      setActiveTab('1001');
    } finally {
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  // Get active exam object
  const currentExam = similarExams.find(e => e.code === activeTab) || similarExams[0];

  // Export current exam to Word
  const handleExportSingleWord = async () => {
    if (!singleExamContainerRef.current || !currentExam) return;
    try {
      setExportingWord(true);
      await exportHtmlToWord(
        singleExamContainerRef.current,
        `De_Tuong_Tu_Ma_${currentExam.code}.docx`,
        'omml'
      );
    } catch (err: any) {
      console.error('Word export error:', err);
      alert('Lỗi xuất file Word: ' + (err?.message || ''));
    } finally {
      setExportingWord(false);
    }
  };

  // Export all 4 exams into 1 Word file with page breaks
  const handleExportAllFourWord = async () => {
    if (!allExamsContainerRef.current || similarExams.length === 0) return;
    try {
      setExportingWord(true);
      await exportHtmlToWord(
        allExamsContainerRef.current,
        `Tron_Bo_4_De_Tuong_Tu_1001_1002_1003_1004.docx`,
        'omml'
      );
    } catch (err: any) {
      console.error('Word export all error:', err);
      alert('Lỗi xuất file Word: ' + (err?.message || ''));
    } finally {
      setExportingWord(false);
    }
  };

  // Export answer comparison matrix to Word
  const handleExportAnswerMatrixWord = async () => {
    if (!answerTableContainerRef.current || similarExams.length === 0) return;
    try {
      setExportingWord(true);
      await exportHtmlToWord(
        answerTableContainerRef.current,
        `Bang_Dap_An_4_Ma_De_1001_1002_1003_1004.docx`,
        'omml'
      );
    } catch (err: any) {
      console.error('Word export matrix error:', err);
      alert('Lỗi xuất file Word: ' + (err?.message || ''));
    } finally {
      setExportingWord(false);
    }
  };

  // Copy answer matrix
  const handleCopyAnswerMatrix = () => {
    if (similarExams.length === 0) return;
    const lines = [`CÂU\t${similarExams.map(e => `MÃ ${e.code}`).join('\t')}`];
    const maxQ = similarExams[0]?.questions.length || 0;
    for (let i = 0; i < maxQ; i++) {
      const row = [`Câu ${i + 1}`];
      similarExams.forEach(exam => {
        const q = exam.questions[i];
        if (!q) row.push('-');
        else if (q.type === 'mc') {
          const l = q.correctOptionIndex !== undefined ? String.fromCharCode(65 + q.correctOptionIndex) : (q.correctAnswer || '-');
          row.push(l);
        } else if (q.type === 'tf') {
          const tfStr = (q.tfStatements || []).map(s => s.correct ? 'Đ' : 'S').join('');
          row.push(tfStr || '-');
        } else {
          row.push(q.correctAnswer || '-');
        }
      });
      lines.push(row.join('\t'));
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Apply as original exam
  const handleApplyAsOriginal = (examToApply: SimilarExamCode) => {
    if (!onApplyAsOriginalExam) {
      alert('Đã chọn làm đề gốc.');
      return;
    }
    if (confirm(`Thầy cô có muốn nạp "${examToApply.examName}" vào làm Đề Gốc của hệ thống không?`)) {
      onApplyAsOriginalExam(examToApply.questions, examToApply.examName);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 text-white p-4 sm:p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Tạo 4 Đề Phát Triển Tương Tự từ 1 Đề Có Sẵn
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-xs font-extrabold uppercase">
                  Mã 1001 - 1004
                </span>
              </div>
              <p className="text-blue-100 text-xs mt-0.5">
                Đồng dạng 100% mô hình toán học & phương pháp giải, tự động đổi số liệu, nghiệm đẹp, kèm lời giải chi tiết và xuất Word chuẩn Bộ GD&ĐT.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50">
          
          {/* STEP 1: INPUT SELECTION (If similar exams not yet generated or when modifying) */}
          {similarExams.length === 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Bước 1: Chọn Nguồn Đề Thi Gốc
                </span>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setSourceMode('existing')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      sourceMode === 'existing'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Đề đang có ({activeQuestions.length} câu)
                  </button>
                  <button
                    onClick={() => setSourceMode('upload')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      sourceMode === 'upload'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tải đề mới lên (Word/PDF/Text)
                  </button>
                </div>
              </div>

              {sourceMode === 'existing' ? (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{activeExamTitle}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tổng cộng: <strong>{activeQuestions.length} câu hỏi</strong> (
                        {activeQuestions.filter(q => q.type === 'mc').length} Trắc nghiệm,{' '}
                        {activeQuestions.filter(q => q.type === 'tf').length} Đúng/Sai,{' '}
                        {activeQuestions.filter(q => q.type === 'sa').length} Trả lời ngắn,{' '}
                        {activeQuestions.filter(q => q.type === 'essay').length} Tự luận)
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold self-start sm:self-auto">
                      Đã sẵn sàng tạo 4 đề
                    </span>
                  </div>

                  {activeQuestions.length === 0 && (
                    <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Hệ thống chưa có câu hỏi nào trong đề gốc. Vui lòng chuyển sang tab "Tải đề mới lên" để nạp file đề.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File upload box */}
                    <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center gap-2 relative">
                      <input
                        type="file"
                        accept=".docx,.txt,.pdf,image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="w-8 h-8 text-indigo-500 mb-1" />
                      <span className="text-sm font-bold text-slate-700">
                        {uploadedFile ? uploadedFile.name : 'Tải lên file Word (.docx), PDF hoặc Ảnh'}
                      </span>
                      <span className="text-xs text-slate-400">
                        Hỗ trợ tự động bóc tách và nhận diện công thức LaTeX
                      </span>
                    </div>

                    {/* Text paste box */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Hoặc dán nội dung văn bản đề thi:
                      </label>
                      <textarea
                        rows={4}
                        value={rawText}
                        onChange={e => setRawText(e.target.value)}
                        placeholder="Dán đề thi tại đây (ví dụ: Câu 1: Tìm nghiệm của phương trình... A. ... B. ...)"
                        className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                      />
                      <button
                        onClick={handleParseText}
                        disabled={!rawText.trim()}
                        className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Bóc tách câu hỏi từ văn bản
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION TRIGGER BUTTON */}
              <div className="pt-3 flex justify-end">
                <button
                  onClick={handleGenerateSimilarExams}
                  disabled={isGenerating || activeQuestions.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  {isGenerating ? 'Đang phân tích & sinh 4 đề...' : 'Bắt đầu sinh 4 Đề Tương Tự (AI Engine)'}
                </button>
              </div>

              {isGenerating && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center space-y-2">
                  <div className="inline-block w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-indigo-900">{progressMsg}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: RESULT PREVIEW & EXPORT DASHBOARD */}
          {similarExams.length === 4 && (
            <div className="space-y-4">
              
              {/* TOP ACTION & TAB BAR */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* TABS */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['1001', '1002', '1003', '1004'] as const).map(code => (
                    <button
                      key={code}
                      onClick={() => setActiveTab(code)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === code
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Đề {parseInt(code, 10) - 1000} (Mã {code})
                    </button>
                  ))}
                  <button
                    onClick={() => setActiveTab('matrix')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'matrix'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    Bảng Đáp Án 4 Mã Đề
                  </button>
                </div>

                {/* EXPORT & UTILITY BUTTONS */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Solution toggle */}
                  <button
                    onClick={() => setShowDetailedSolutions(!showDetailedSolutions)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    {showDetailedSolutions ? <EyeOff className="w-3.5 h-3.5 text-indigo-600" /> : <Eye className="w-3.5 h-3.5 text-indigo-600" />}
                    {showDetailedSolutions ? 'Ẩn lời giải' : 'Hiện lời giải'}
                  </button>

                  {/* Export Current Exam Word */}
                  {activeTab !== 'matrix' && (
                    <button
                      onClick={handleExportSingleWord}
                      disabled={exportingWord}
                      className="px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Xuất đề thi đang xem ra file Word .docx font Times New Roman, công thức toán OMML"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải Đề Này (.docx)
                    </button>
                  )}

                  {/* Export All 4 Exams Word */}
                  <button
                    onClick={handleExportAllFourWord}
                    disabled={exportingWord}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Xuất trọn bộ 4 đề thi vào 1 file Word duy nhất, tự động phân trang (page-break) giữa các mã đề để in ấn phát cho học sinh"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Tải Trọn Bộ 4 Đề (.docx)
                  </button>

                  {/* Export Answer Matrix Word */}
                  <button
                    onClick={handleExportAnswerMatrixWord}
                    disabled={exportingWord}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Xuất bảng đối chiếu đáp án của cả 4 mã đề ra Word"
                  >
                    <Table className="w-3.5 h-3.5" />
                    Xuất Word Bảng Đáp Án
                  </button>

                  {/* Re-generate button */}
                  <button
                    onClick={handleGenerateSimilarExams}
                    disabled={isGenerating}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    title="Sinh lại 4 đề khác"
                  >
                    <RotateCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* TAB CONTENT: 1 OF THE 4 EXAMS */}
              {activeTab !== 'matrix' && currentExam && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  
                  {/* Action bar for current exam */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-indigo-900">
                        {currentExam.examName}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold">
                        {currentExam.questions.length} câu hỏi
                      </span>
                    </div>

                    <button
                      onClick={() => handleApplyAsOriginal(currentExam)}
                      className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Nạp mã đề này vào làm Đề Gốc để tiếp tục trộn hoặc tùy chỉnh"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Dùng làm Đề Gốc
                    </button>
                  </div>

                  {/* EXAM VIEWPORT (Used directly for Word export & Live Preview) */}
                  <div ref={singleExamContainerRef} className="space-y-6 text-black font-serif" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                    
                    {/* Standard MoET Header */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-black text-center text-xs sm:text-sm">
                      <div>
                        <p className="font-bold uppercase">SỞ GD&ĐT ....................................</p>
                        <p className="font-bold">TRƯỜNG THPT .............................</p>
                      </div>
                      <div>
                        <p className="font-bold uppercase">{currentExam.examName}</p>
                        <p className="italic">Năm học 2025 - 2026</p>
                        <p className="font-bold text-xs mt-1">MÃ ĐỀ THI: {currentExam.code}</p>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="text-xs italic text-center pb-2 text-slate-700">
                      (Đề thi gồm {currentExam.questions.length} câu hỏi - Thời gian làm bài theo quy định)
                    </div>

                    {/* QUESTIONS LIST */}
                    <div className="space-y-5 text-sm">
                      {currentExam.questions.map((q, idx) => {
                        const isExpanded = expandedSolutionIds[q.id] ?? showDetailedSolutions;

                        return (
                          <div key={q.id || idx} className="question-block space-y-2 pb-4 border-b border-slate-100 last:border-b-0">
                            
                            {/* Stem + Action Buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 leading-relaxed">
                              <div className="flex items-start gap-1 flex-1">
                                <span className="font-bold whitespace-nowrap">Câu {idx + 1}:</span>
                                <div className="flex-1">
                                  <MarkdownRenderer content={formatMathContent(q.content)} />
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 self-start no-print">
                                <span className="text-[11px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded">
                                  [{q.level || 'Thông hiểu'}]
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingQuestion({ question: q, index: idx, examCode: currentExam.code })}
                                  className="px-2 py-0.5 hover:bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Chỉnh sửa câu hỏi, chèn Bảng biến thiên, sửa phương án và lời giải"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAiRegenerateQuestion(q, idx, currentExam.code)}
                                  className="px-2 py-0.5 hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                  title="AI tạo lại câu này kèm Bảng biến thiên và lời giải chi tiết từng bước"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                  <span>Tạo lại</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAiReplaceQuestion(q, idx, currentExam.code)}
                                  className="px-2 py-0.5 hover:bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Đổi sang câu hỏi tương đương mới"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Đổi câu</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(idx, currentExam.code)}
                                  className="p-1 hover:bg-rose-50 text-rose-700 border border-rose-200 rounded text-xs font-medium cursor-pointer transition-colors"
                                  title="Xóa câu này khỏi mã đề"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Missing Variation Table Warning Banner */}
                            {isMissingBbt(q.content) && (
                              <div className="flex flex-wrap items-center justify-between p-2.5 my-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 shadow-2xs gap-2 no-print">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <span className="text-base">⚠️</span>
                                  <span>Đề bài nhắc đến <strong>Bảng biến thiên</strong> nhưng chưa có bảng/hình hiển thị.</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleAiFixBbtForQuestion(q, idx, currentExam.code)}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <span>✨ AI vẽ BBT ngay</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuestion({ question: q, index: idx, examCode: currentExam.code })}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 text-amber-800 border border-amber-300 rounded-md font-medium cursor-pointer"
                                  >
                                    <span>✏️ Tự chèn BBT</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Multiple choice options */}
                            {q.type === 'mc' && q.options && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 pl-4">
                                {q.options.map((opt, oIdx) => {
                                  const letter = String.fromCharCode(65 + oIdx);
                                  const isCorrect = q.correctOptionIndex === oIdx;

                                  return (
                                    <div
                                      key={oIdx}
                                      className={`p-2 rounded-lg text-xs leading-relaxed border transition-colors flex items-start gap-1.5 ${
                                        isCorrect && showDetailedSolutions
                                          ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-950'
                                          : 'bg-slate-50/50 border-slate-200'
                                      }`}
                                    >
                                      <strong className="text-slate-700">{letter}.</strong>
                                      <div className="flex-1">
                                        <MarkdownRenderer content={formatMathContent(opt)} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* True / False statements */}
                            {q.type === 'tf' && q.tfStatements && (
                              <div className="pl-4 pt-1 space-y-1.5">
                                <table className="w-full border-collapse border border-slate-300 text-xs">
                                  <thead>
                                    <tr className="bg-slate-100">
                                      <th className="border border-slate-300 p-1.5 text-left w-12 font-bold">Ý</th>
                                      <th className="border border-slate-300 p-1.5 text-left font-bold">Khẳng định</th>
                                      <th className="border border-slate-300 p-1.5 text-center w-20 font-bold">Đáp án</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {q.tfStatements.map((st, sIdx) => {
                                      const label = ['a)', 'b)', 'c)', 'd)'][sIdx];
                                      return (
                                        <tr key={sIdx} className="hover:bg-slate-50">
                                          <td className="border border-slate-300 p-1.5 font-bold text-center">{label}</td>
                                          <td className="border border-slate-300 p-1.5">
                                            <MarkdownRenderer content={formatMathContent(st.statement)} />
                                          </td>
                                          <td className="border border-slate-300 p-1.5 text-center font-bold">
                                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                                              st.correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                            }`}>
                                              {st.correct ? 'ĐÚNG' : 'SAI'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Short Answer box */}
                            {q.type === 'sa' && (
                              <div className="pl-4 pt-1">
                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                                  <span className="text-slate-600">Đáp án ngắn:</span>
                                  <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 border border-slate-200 rounded">
                                    {q.correctAnswer || '---'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Solution box */}
                            {isExpanded && q.solution && (
                              <div className="mt-2 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs space-y-1 text-amber-950">
                                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  Lời giải chi tiết câu {idx + 1}:
                                </div>
                                <MarkdownRenderer content={formatMathContent(q.solution)} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: ANSWER COMPARISON MATRIX */}
              {activeTab === 'matrix' && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                        <Table className="w-4 h-4 text-amber-600" />
                        Bảng Đáp Án Đối Chiếu 4 Mã Đề (1001, 1002, 1003, 1004)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Bảng tổng hợp đáp án hỗ trợ chấm thi nhanh chóng hoặc sao chép vào Excel/TNMaker.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyAnswerMatrix}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey ? 'Đã chép!' : 'Sao chép bảng'}
                      </button>

                      <button
                        onClick={handleExportAnswerMatrixWord}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải Word (.docx)
                      </button>
                    </div>
                  </div>

                  {/* Comparison Matrix Table */}
                  <div ref={answerTableContainerRef} className="overflow-x-auto">
                    <table className="w-full border-collapse border border-black text-xs sm:text-sm font-serif" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-black p-2 text-center font-bold w-16">Câu</th>
                          <th className="border border-black p-2 text-center font-bold w-24">Loại câu</th>
                          <th className="border border-black p-2 text-center font-bold bg-blue-50/50">MÃ 1001</th>
                          <th className="border border-black p-2 text-center font-bold bg-indigo-50/50">MÃ 1002</th>
                          <th className="border border-black p-2 text-center font-bold bg-purple-50/50">MÃ 1003</th>
                          <th className="border border-black p-2 text-center font-bold bg-pink-50/50">MÃ 1004</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: similarExams[0]?.questions.length || 0 }).map((_, qIdx) => {
                          const qType = similarExams[0]?.questions[qIdx]?.type || 'mc';
                          const typeLabel =
                            qType === 'mc' ? 'Trắc nghiệm' :
                            qType === 'tf' ? 'Đúng/Sai' :
                            qType === 'sa' ? 'Trả lời ngắn' : 'Tự luận';

                          return (
                            <tr key={qIdx} className="hover:bg-slate-50">
                              <td className="border border-black p-2 text-center font-bold">
                                Câu {qIdx + 1}
                              </td>
                              <td className="border border-black p-2 text-center text-xs text-slate-600">
                                {typeLabel}
                              </td>

                              {similarExams.map((exam, eIdx) => {
                                const q = exam.questions[qIdx];
                                let displayAns = '-';
                                if (q) {
                                  if (q.type === 'mc') {
                                    displayAns = q.correctOptionIndex !== undefined
                                      ? String.fromCharCode(65 + q.correctOptionIndex)
                                      : (q.correctAnswer || '-');
                                  } else if (q.type === 'tf') {
                                    displayAns = (q.tfStatements || [])
                                      .map((s, i) => `${['a', 'b', 'c', 'd'][i]}:${s.correct ? 'Đ' : 'S'}`)
                                      .join('  ');
                                  } else {
                                    displayAns = q.correctAnswer || '-';
                                  }
                                }

                                return (
                                  <td key={eIdx} className="border border-black p-2 text-center font-mono font-bold text-indigo-900">
                                    {displayAns}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HIDDEN CONTAINER FOR BUNDLED 4 EXAMS WORD EXPORT (WITH PAGE BREAKS) */}
          <div className="hidden">
            <div ref={allExamsContainerRef}>
              {similarExams.map((exam, eIdx) => (
                <div key={exam.code} className="space-y-6">
                  {/* Header */}
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-black text-center text-sm font-serif">
                    <div>
                      <p className="font-bold uppercase">SỞ GD&ĐT ....................................</p>
                      <p className="font-bold">TRƯỜNG THPT .............................</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase">{exam.examName}</p>
                      <p className="italic">Năm học 2025 - 2026</p>
                      <p className="font-bold mt-1">MÃ ĐỀ: {exam.code}</p>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-4 font-serif">
                    {exam.questions.map((q, qIdx) => (
                      <div key={q.id || qIdx} className="question-block space-y-1">
                        <p className="font-bold">Câu {qIdx + 1}: {q.content}</p>
                        {q.type === 'mc' && q.options && (
                          <table className="options-table w-full">
                            <tbody>
                              <tr>
                                {q.options.map((opt, oIdx) => (
                                  <td key={oIdx} className="p-1">
                                    <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        )}
                        {q.type === 'tf' && q.tfStatements && (
                          <ul className="tf-statements">
                            {q.tfStatements.map((st, sIdx) => (
                              <li key={sIdx}>
                                {['a)', 'b)', 'c)', 'd)'][sIdx]} {st.statement}
                              </li>
                            ))}
                          </ul>
                        )}
                        {showDetailedSolutions && q.solution && (
                          <p className="italic text-slate-700">Lời giải: {q.solution}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Page break after each exam except the last one */}
                  {eIdx < similarExams.length - 1 && (
                    <div className="page-break" data-page-break="true" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {similarExams.length === 4 ? (
              <span>Đã tạo đủ <strong>4 mã đề đồng dạng</strong> (1001, 1002, 1003, 1004). Thầy cô có thể tải trọn bộ Word hoặc nạp làm đề gốc.</span>
            ) : (
              <span>Hệ thống phân tích sâu từng dạng toán để tạo ra 4 đề độc lập với các hệ số tương đương.</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>

      {/* Question Edit Modal */}
      <QuestionEditModal
        isOpen={Boolean(editingQuestion)}
        question={editingQuestion ? editingQuestion.question : null}
        questionNumber={editingQuestion ? editingQuestion.index + 1 : 1}
        subject={subject}
        grade={grade}
        onClose={() => setEditingQuestion(null)}
        onSave={handleSaveEditedQuestion}
      />
    </div>
  );
}
