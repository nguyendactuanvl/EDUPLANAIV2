import { apiFetch } from '../lib/apiFetch';
import { GDPT_2018_SUBJECTS } from '../lib/subjects';
import LZString from 'lz-string';
import { exportHtmlToWord, exportElementToImage } from "../lib/exportUtils";
import React, { useState, useRef, useEffect } from "react";
import { 
  BookOpen, Download, AlertCircle, Edit3, Eye, Printer, Share2, Copy, CheckCircle2, 
  ExternalLink, Upload, FileText, Palette, LayoutTemplate, GitFork, Sparkles, Zap, Image as ImageIcon, Sliders, Check,
  TrendingUp, BarChart2, Plus, Box, BarChart3
} from "lucide-react";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { UploadTeacherExamModal } from "../components/UploadTeacherExamModal";
import { QuestionEditModal } from "../components/QuestionEditModal";
import { QuestionVisualizerPanel } from "../components/math-tools/QuestionVisualizerPanel";
import { analyzeFunctionToBbt, generateBbtSvg, convertBbtTableToSvg } from "../lib/bbtRenderer";
import { getTikzSvg, embedTikzSvgsInText } from "../components/TikzRenderer";
import { saveToHistory, getHistory } from '../lib/history';
import { HistoryItem } from '../types';
import { cn, parseApiResponse, preProcessMathContent, sanitizeLatexString, fixMath, cleanQuestionStem, cleanOptionText } from "../lib/utils";
import { parseRawExamText } from '../lib/examParser';
import { printElement, ensureMathRendered } from '../lib/print';
import { saveExamToCloud, saveExamToWebhook } from '../lib/cloudExamStore';
import { KNTT_CURRICULUM, getKnttCurriculum } from "../data/knttCurriculum";

export type LayoutStyle = 'a4_print' | 'infographic' | 'poster' | 'mindmap';

interface LayoutStyleOption {
  id: LayoutStyle;
  title: string;
  shortTitle: string;
  badge: string;
  desc: string;
  icon: any;
  activeColor: string;
  badgeBg: string;
}

const LAYOUT_STYLE_OPTIONS: LayoutStyleOption[] = [
  {
    id: 'a4_print',
    title: 'A4 Chuẩn in ấn',
    shortTitle: 'A4 In ấn',
    badge: 'Đen trắng / Tiết kiệm mực',
    desc: 'Bố cục truyền thống, bảng thông tin học sinh, kẻ khung sắc nét, tối ưu trang in giấy học sinh.',
    icon: FileText,
    activeColor: 'border-slate-800 ring-2 ring-slate-800/10 bg-slate-50/80 text-slate-900',
    badgeBg: 'bg-slate-200 text-slate-800'
  },
  {
    id: 'infographic',
    title: 'Phiếu học tập 2 cột (Phong cách ảnh)',
    shortTitle: 'Phiếu 2 cột màu sắc',
    badge: 'Bố cục 2 cột Trực quan / Màu sắc sinh động',
    desc: 'Bố cục 2 cột đặc biệt: Lý thuyết bên trái, câu hỏi thực hành bên phải, trang trí banner xanh đậm giống ảnh mẫu.',
    icon: Palette,
    activeColor: 'border-blue-600 ring-2 ring-blue-600/15 bg-blue-50/70 text-blue-950',
    badgeBg: 'bg-blue-100 text-blue-700'
  }
];

export function Worksheets() {
  const [selectedGrade, setSelectedGrade] = useState<number>(10);
  const [customLessonName, setCustomLessonName] = useState("");
  const [subject, setSubject] = useState("Toán");
  const [worksheetType, setWorksheetType] = useState("Kết hợp trắc nghiệm và tự luận");
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('a4_print');

  // Hierarchy KNTT States
  const [selectedSemester, setSelectedSemester] = useState<"semester_1" | "semester_2">("semester_1");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");

  // Four custom part counts
  const [numPartI, setNumPartI] = useState<number>(12); // Trắc nghiệm 4 lựa chọn (0-12)
  const [numPartII, setNumPartII] = useState<number>(2); // Trắc nghiệm Đúng - Sai (0-6)
  const [numPartIII, setNumPartIII] = useState<number>(4); // Trắc nghiệm Trả lời ngắn (0-6)
  const [numPartIV, setNumPartIV] = useState<number>(2); // Tự luận (0-4)

  const [realWorldPercent, setRealWorldPercent] = useState<number>(40); // 0% - 100%
  const [hasParametric, setHasParametric] = useState<boolean>(true); // Có tham số

  // Legacy compatibility fallbacks
  const [numMC, setNumMC] = useState<string>("auto");
  const [numEssay, setNumEssay] = useState<string>("auto");
  const [includeRealWorld, setIncludeRealWorld] = useState<boolean>(true);
  const [answerMode, setAnswerMode] = useState<'full' | 'summary' | 'none'>('full');

  // Synchronize customLessonName with selected KNTT Lesson and Subject
  useEffect(() => {
    const semData = getKnttCurriculum(subject, selectedGrade, selectedSemester);
    if (semData && semData.chapters.length > 0) {
      let chapId = selectedChapterId;
      let chapter = semData.chapters.find(c => c.id === chapId);
      if (!chapter) {
        chapter = semData.chapters[0];
        setSelectedChapterId(chapter.id);
        chapId = chapter.id;
      }

      let lesId = selectedLessonId;
      let lesson = chapter.lessons.find(l => l.id === lesId);
      if (!lesson) {
        lesson = chapter.lessons[0];
        setSelectedLessonId(lesson.id);
        lesId = lesson.id;
      }

      if (lesson) {
        setCustomLessonName(lesson.name);
      }
    }
  }, [subject, selectedGrade, selectedSemester, selectedChapterId, selectedLessonId]);
  
  const [suggestion, setSuggestion] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  
  // Tùy chọn Lời giải chi tiết & Hiển thị
  const [includeDetailedSolution, setIncludeDetailedSolution] = useState<boolean>(true);
  const [showAllSolutions, setShowAllSolutions] = useState<boolean>(false);
  const [openSolutions, setOpenSolutions] = useState<Record<string | number, boolean>>({});
  const [worksheetQuestions, setWorksheetQuestions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'document' | 'questions'>('document');

  // BBT & Đồ thị & Hình 3D & Thống kê Visualizer State
  const [activeVisualizer, setActiveVisualizer] = useState<{
    qIndex: number;
    tab: "bbt" | "graph" | "geometry3d" | "statistics";
    target: "content" | "solution";
  } | null>(null);
  const [isDocVisualizerOpen, setIsDocVisualizerOpen] = useState(false);
  const [docVisualizerTab, setDocVisualizerTab] = useState<"bbt" | "graph" | "geometry3d" | "statistics">("bbt");
  const [editingQuestion, setEditingQuestion] = useState<{ question: any; index: number } | null>(null);
  const [isAutoGeneratingImages, setIsAutoGeneratingImages] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isMissingBbt = (content?: string): boolean => {
    if (!content) return false;
    const mentionsBbt = /(bảng\s*biến\s*thiên|BBT|bbt|dấu\s*của\s*f'\(x\)|chiều\s*biến\s*thiên|khảo\s*sát\s*sự\s*biến\s*thiên)/i.test(content);
    const hasTable = /\|[^\n]+\|[^\n]+\|/.test(content);
    const hasImgOrSvg = /<(?:img|svg|svg-wrapper)/i.test(content) || /!\[.*?\]\(.*?\)/.test(content);
    return mentionsBbt && !hasTable && !hasImgOrSvg;
  };

  const isMissingGraph = (content?: string): boolean => {
    if (!content) return false;
    const mentionsGraph = /(đồ\s*thị|hình\s*bên|hình\s*vẽ|như\s*hình)/i.test(content);
    const hasImgOrSvg = /<(?:img|svg|svg-wrapper)/i.test(content) || /!\[.*?\]\(.*?\)/.test(content);
    return mentionsGraph && !hasImgOrSvg;
  };

  const handleInsertVisualizerSnippet = (
    qIndex: number,
    target: "content" | "solution",
    snippet: string
  ) => {
    setWorksheetQuestions(prev => {
      const next = [...prev];
      if (!next[qIndex]) return prev;
      const item = { ...next[qIndex] };
      if (target === "content") {
        const cur = item.content || item.question || "";
        item.content = cur ? `${cur}\n\n${snippet}` : snippet;
      } else {
        const cur = item.solution || item.explanation || "";
        item.solution = cur ? `${cur}\n\n${snippet}` : snippet;
        item.explanation = item.solution;
      }
      next[qIndex] = item;
      return next;
    });

    // Đồng bộ vào suggestion văn bản
    setSuggestion(prev => {
      if (!prev) return prev;
      const qNum = qIndex + 1;
      const qRegex = new RegExp(`((?:\\*\\*)?(?:Câu|Bài)\\s*${qNum}[:\\.][\\s\\S]*?)(?=(?:\\*\\*)?(?:Câu|Bài)\\s*${qNum + 1}[:\\.]|---|#|$)`, 'i');
      if (qRegex.test(prev)) {
        return prev.replace(qRegex, (match) => {
          return `${match.trimEnd()}\n\n${snippet}\n\n`;
        });
      }
      return `${prev.trimEnd()}\n\n${snippet}\n\n`;
    });

    showToast(`Đã chèn ${snippet.includes('<svg-wrapper') ? 'BBT (ảnh SVG)' : 'Đồ thị (ảnh PNG)'} vào ${target === 'content' ? 'câu hỏi' : 'lời giải'}!`);
  };

  const handleInsertDocVisualizerSnippet = (target: "content" | "solution", snippet: string) => {
    setSuggestion(prev => `${prev.trimEnd()}\n\n${snippet}\n\n`);
    setIsDocVisualizerOpen(false);
    showToast(`Đã chèn ${snippet.includes('<svg-wrapper') ? 'BBT (ảnh SVG)' : 'Đồ thị (ảnh PNG)'} vào phiếu học tập!`);
  };

  const handleAiFixBbtForWorksheetQuestion = async (q: any, idx: number) => {
    try {
      // 1. Thử nhận diện hàm số từ nội dung câu hỏi
      const content = q.content || q.question || '';
      const formulaMatch = content.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || 
                           content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);
      if (formulaMatch) {
        const formula = formulaMatch[1].trim();
        const bbtData = analyzeFunctionToBbt(formula);
        if (bbtData) {
          const svg = generateBbtSvg(bbtData);
          if (svg) {
            const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
            if (base64) {
              const snippet = `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
              handleInsertVisualizerSnippet(idx, 'content', snippet);
              showToast('✨ Đã tự động tạo ảnh BBT (SVG chuẩn SGK) thành công!');
              return;
            }
          }
        }
      }

      // 2. Gọi API /api/fix-question nếu không phân tích trực tiếp được
      const res = await apiFetch('/api/fix-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, mode: 'fix_bbt', subject, grade: selectedGrade })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.question) {
          let newContent = data.question.content || '';
          const tableMatch = newContent.match(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/m);
          if (tableMatch) {
            const svg = convertBbtTableToSvg(tableMatch[1]);
            if (svg) {
              const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
              if (base64) {
                newContent = newContent.replace(tableMatch[1], `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`);
              }
            }
          }
          const updatedQ = { ...data.question, content: newContent };
          setWorksheetQuestions(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...updatedQ };
            return next;
          });
          showToast('✨ AI đã vẽ Bảng biến thiên (dạng ảnh SVG chuẩn SGK) hoàn chỉnh!');
          return;
        }
      }
    } catch (e) {
      console.warn("Lỗi vẽ BBT:", e);
    }

    // Fallback: chèn BBT mẫu chuẩn SGK dạng SVG
    const fallbackBbtTable = `| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |\n|---|---|---|---|---|---|---|---|\n| $y'$ | | $+$ | $0$ | $-$ | $0$ | $+$ |\n| $y$ | $-\\infty$ | $\\nearrow$ | $3$ | $\\searrow$ | $-1$ | $\\nearrow$ | $+\\infty$ |`;
    const fallbackSvg = convertBbtTableToSvg(fallbackBbtTable);
    const base64 = fallbackSvg && typeof btoa !== 'undefined' ? btoa(encodeURIComponent(fallbackSvg)) : '';
    const snippet = base64 ? `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n` : `\n\n${fallbackBbtTable}\n\n`;
    handleInsertVisualizerSnippet(idx, 'content', snippet);
    showToast('Đã thêm BBT dạng ảnh SVG vào câu hỏi!');
  };

  const handleAutoGenerateGraphForWorksheetQuestion = (q: any, idx: number) => {
    const content = q.content || q.question || '';
    const formulaMatch = content.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || 
                         content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);
    if (formulaMatch) {
      const formula = formulaMatch[1].trim();
      const bbtData = analyzeFunctionToBbt(formula);
      if (bbtData && bbtData.points && bbtData.points.length > 0) {
        // Mở Visualizer ở tab Graph với hàm số đã nhận diện để giáo viên chèn ảnh đồ họa ngay
        setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" });
        showToast(`Đã nhận diện hàm số ${formula}, sẵn sàng xuất ảnh đồ thị!`);
        return;
      }
    }
    setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" });
  };

  const handleAutoGenerateAllBbtAndGraphs = async () => {
    setIsAutoGeneratingImages(true);
    let count = 0;
    try {
      // 1. Quét toàn bộ worksheetQuestions
      const updatedQuestions = [...worksheetQuestions];
      for (let i = 0; i < updatedQuestions.length; i++) {
        const q = updatedQuestions[i];
        let changed = false;
        let content = q.content || q.question || '';
        let solution = q.solution || q.explanation || '';

        // Tự động chuyển đổi nếu có mã TikZ trần thành SVG
        if (/```tikz|\\begin\{tikzpicture\}/i.test(content)) {
          content = embedTikzSvgsInText(content);
          changed = true;
          count++;
        }
        if (/```tikz|\\begin\{tikzpicture\}/i.test(solution)) {
          solution = embedTikzSvgsInText(solution);
          changed = true;
          count++;
        }

        // Tự động chuyển đổi nếu có Markdown BBT table sang SVG wrapper
        if (/\|[^\n]+\|[^\n]+\|/.test(content) && /(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(content)) {
          const match = content.match(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/m);
          if (match) {
            const svg = convertBbtTableToSvg(match[1]);
            if (svg) {
              const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
              if (base64) {
                content = content.replace(match[1], `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`);
                changed = true;
                count++;
              }
            }
          }
        }

        // Nếu thiếu BBT mà có hàm số: tự động vẽ
        if (isMissingBbt(content)) {
          const fMatch = content.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || 
                         content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);
          if (fMatch) {
            const bbt = analyzeFunctionToBbt(fMatch[1].trim());
            if (bbt) {
              const svg = generateBbtSvg(bbt);
              if (svg) {
                const b64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
                if (b64) {
                  content += `\n\n<svg-wrapper data-svg="${b64}"></svg-wrapper>\n\n`;
                  changed = true;
                  count++;
                }
              }
            }
          }
        }

        if (changed) {
          updatedQuestions[i] = {
            ...q,
            content,
            solution,
            explanation: solution
          };
        }
      }
      setWorksheetQuestions(updatedQuestions);

      // 2. Quét và chuyển đổi trong suggestion (document view)
      if (suggestion) {
        let newSuggestion = suggestion;
        // Chuyển đổi toàn bộ mã TikZ thành SVG
        newSuggestion = embedTikzSvgsInText(newSuggestion);
        // Chuyển đổi toàn bộ BBT markdown tables thành SVG wrappers
        newSuggestion = newSuggestion.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
          if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
            const svg = convertBbtTableToSvg(match);
            if (svg) {
              const b64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
              if (b64) {
                count++;
                return `\n\n<svg-wrapper data-svg="${b64}"></svg-wrapper>\n\n`;
              }
            }
          }
          return match;
        });
        setSuggestion(newSuggestion);
      }

      showToast(`🎉 Đã tự động tạo và xuất ảnh cho ${count > 0 ? `${count} bảng/đồ thị` : 'tất cả phần'} (dạng ảnh đồ họa, không dùng tex)!`);
    } catch (err) {
      console.warn("Lỗi auto generate:", err);
      showToast("Đã hoàn tất kiểm tra BBT và Đồ thị.");
    } finally {
      setIsAutoGeneratingImages(false);
    }
  };

  const toggleSolution = (id: string | number) => {
    setOpenSolutions(prev => ({
      ...prev,
      [id]: !(prev[id] !== undefined ? prev[id] : showAllSolutions)
    }));
  };

  const toggleAllSolutions = () => {
    const nextState = !showAllSolutions;
    setShowAllSolutions(nextState);
    const updated: Record<string | number, boolean> = { 'doc-solution': nextState };
    if (worksheetQuestions && worksheetQuestions.length > 0) {
      worksheetQuestions.forEach((q, idx) => {
        updated[q.id || idx + 1] = nextState;
      });
    }
    setOpenSolutions(updated);
  };

  const isSolutionOpen = (id: string | number) => {
    return openSolutions[id] !== undefined ? openSolutions[id] : showAllSolutions;
  };
  
  useEffect(() => {
    setHistoryItems(getHistory().filter(item => item.type === 'PHT'));
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isGeneratingInteractive, setIsGeneratingInteractive] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [isUploadExamModalOpen, setIsUploadExamModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const exportRef = useRef<HTMLDivElement>(null);

  const subjects = GDPT_2018_SUBJECTS;
  const worksheetTypes = [
    "Đề 3 phần (12 câu TN nhiều lựa chọn; 4 câu Đ/S; 6 câu TL ngắn)",
    "Đề 4 phần (12 câu TN; 2 câu Đ/S; 4 câu TL ngắn; 3 câu Tự luận)",
    "Kết hợp trắc nghiệm và tự luận",
    "Chỉ trắc nghiệm khách quan",
    "Chỉ tự luận",
    "Bài tập thực hành / Dự án nhỏ"
  ];

  
  const handleGenerateInteractive = async () => {
    if (!customLessonName) {
      setError("Vui lòng nhập tên bài học / chủ đề.");
      return;
    }
    
    setIsGeneratingInteractive(true);
    setError(null);
    setShareLink("");
    
    try {
      // 1. Generate Interactive Worksheet JSON
      const response = await apiFetch('/api/generate-interactive-worksheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Dùng text/plain để tránh bị lỗi CORS preflight với Apps Script
        },
        body: JSON.stringify({
          lesson: customLessonName,
          subject: subject,
          grade: selectedGrade,
          type: worksheetType,
          additionalNotes,
          numPartI,
          numPartII,
          numPartIII,
          numPartIV,
          realWorldPercent,
          hasParametric
        }),
        redirect: 'follow', // Bắt buộc để theo dõi chuyển hướng 302 từ Google Script sang Googleusercontent
      });

      if (!response.ok) {
        throw new Error("Lỗi khi tạo phiếu bài tập tương tác.");
      }

      const rawText = await response.text();
      
      // Kiểm tra xem dữ liệu trả về có bị dính HTML không
      if (rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE html>')) {
        console.error("Server trả về trang HTML thay vì JSON:", rawText);
        throw new Error("Dịch vụ tạo đề tạm thời gián đoạn hoặc API Key chưa được nạp đúng. Vui lòng kiểm tra lại cấu hình API.");
      }

      let examData: any;
      try {
        examData = JSON.parse(rawText);
      } catch (e) {
        console.error("Lỗi parse JSON:", rawText);
        try {
          examData = parseApiResponse(rawText);
        } catch (e2) {
          throw new Error("Phản hồi từ máy chủ không đúng định dạng dữ liệu.");
        }
      }
      
      // 2. Wrap it for the StudentExamView
      const payload = {
        examData: {
          examName: examData.examName || `Phiếu bài tập: ${customLessonName}`,
          subject: subject,
          grade: selectedGrade,
        },
        codes: [
          {
            code: "PHT_01",
            questions: examData.questions
          }
        ]
      };
      
      // 3. Save to server to obtain short examId
      let examId = '';
      try {
        const shareRes = await apiFetch('/api/exams/share', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow',
        });
        if (shareRes.ok) {
          const shareRaw = await shareRes.text();
          if (!shareRaw.trim().startsWith('<') && !shareRaw.includes('<!DOCTYPE html>')) {
            try {
              const shareJson = JSON.parse(shareRaw);
              if (shareJson.examId) {
                examId = shareJson.examId;
              }
            } catch (e) {}
          }
        }
      } catch (e) {
        console.warn("Share to api failed:", e);
      }

      // Sync to cloud store & Webhook
      if (examId) {
        try {
          await saveExamToCloud(examId, payload);
        } catch (e) {}
      }
      try {
        await saveExamToWebhook({
          action: "saveExam",
          examId: examId || undefined,
          ...payload
        });
      } catch (e) {}

      // Standalone backup full URL with compressed payload
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
      const fullUrl = `${window.location.origin}/?examData=${compressed}`;
      
      // The short base link (around 45 chars)
      const baseShortUrl = examId ? `${window.location.origin}/?examId=${examId}` : fullUrl;

      // 4. Try shortening with URL shorteners (/api/shorten)
      let finalLink = '';
      try {
        const shortRes = await apiFetch('/api/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: baseShortUrl })
        });
        if (shortRes.ok) {
          const shortJson = await shortRes.json();
          if (shortJson.shortUrl && shortJson.shortUrl.startsWith('http')) {
            finalLink = shortJson.shortUrl;
          }
        }
      } catch (e) {
        console.warn("Shorten service error:", e);
      }

      // If URL shortener returned a link, use it; otherwise use baseShortUrl (examId link)
      if (!finalLink) {
        finalLink = baseShortUrl;
      }
      
      setShareLink(finalLink);
      
      // Cập nhật danh sách câu hỏi để giáo viên kiểm tra lời giải chi tiết trực quan
      const formattedQuestions = (examData.questions || []).map((q: any, idx: number) => {
        let content = embedTikzSvgsInText(q.content || q.question || '');
        let solution = embedTikzSvgsInText((q.solution || q.explanation || "").trim());

        // Chuyển đổi toàn bộ BBT markdown tables sang SVG vector chuẩn SGK
        content = content.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
          if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
            const svg = convertBbtTableToSvg(match);
            if (svg) {
              const b64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
              if (b64) return `\n\n<svg-wrapper data-svg="${b64}"></svg-wrapper>\n\n`;
            }
          }
          return match;
        });

        solution = solution.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
          if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
            const svg = convertBbtTableToSvg(match);
            if (svg) {
              const b64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
              if (b64) return `\n\n<svg-wrapper data-svg="${b64}"></svg-wrapper>\n\n`;
            }
          }
          return match;
        });

        // Tự động phân tích và tạo ảnh BBT nếu câu hỏi nhắc đến BBT mà chưa có bảng
        if (isMissingBbt(content)) {
          const fMatch = content.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || 
                         content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);
          if (fMatch) {
            const bbt = analyzeFunctionToBbt(fMatch[1].trim());
            if (bbt) {
              const svg = generateBbtSvg(bbt);
              if (svg) {
                const b64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
                if (b64) content += `\n\n<svg-wrapper data-svg="${b64}"></svg-wrapper>\n\n`;
              }
            }
          }
        }

        return {
          ...q,
          id: q.id || idx + 1,
          content,
          solution,
          explanation: solution
        };
      });

      setWorksheetQuestions(formattedQuestions);
      setViewMode('questions');

      // Tạo gợi ý hiển thị cho chế độ Bản in A4
      const generatedDoc = formattedQuestions.map((q: any, i: number) => {
        let t = `### Câu ${i + 1}: ${q.content}\n`;
        if (q.options && q.options.length > 0) {
          t += q.options.map((opt: string, oIdx: number) => `- **${String.fromCharCode(65 + oIdx)}.** ${opt}`).join('\n') + '\n';
        }
        if (q.tfStatements && q.tfStatements.length > 0) {
          t += q.tfStatements.map((s: any, sIdx: number) => `- **${String.fromCharCode(97 + sIdx)})** ${s.statement || s}`).join('\n') + '\n';
        }
        if (q.solution) {
          t += `\n*Lời giải chi tiết:*\n${q.solution}\n`;
        }
        return t;
      }).join('\n---\n\n');
      setSuggestion(generatedDoc);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể tạo phiếu bài tập tương tác lúc này.");
    } finally {
      setIsGeneratingInteractive(false);
    }
  };


  const handleGenerate = async () => {
    if (!customLessonName) {
      setError("Vui lòng nhập tên bài học hoặc chủ đề.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuggestion("");
    
    try {
      const response = await apiFetch('/api/generate-worksheet', {
        method: 'POST',
        headers: { 
          'Content-Type': 'text/plain;charset=utf-8', // Dùng text/plain để tránh bị lỗi CORS preflight với Apps Script
        },
        body: JSON.stringify({
          lesson: customLessonName,
          subject: subject,
          grade: selectedGrade,
          type: worksheetType,
          layoutStyle: layoutStyle,
          numMC: numMC !== "auto" ? Number(numMC) : undefined,
          numEssay: numEssay !== "auto" ? Number(numEssay) : undefined,
          includeRealWorld: includeRealWorld,
          answerMode: answerMode,
          // New advanced parameters from configured sidebar
          additionalNotes,
          numPartI,
          numPartII,
          numPartIII,
          numPartIV,
          realWorldPercent,
          hasParametric
        }),
        redirect: 'follow', // Bắt buộc để theo dõi chuyển hướng 302 từ Google Script sang Googleusercontent
      });

      if (!response.ok) {
        let errorMsg = "Lỗi khi kết nối với AI (API trả về lỗi).";
        try {
          const errText = await response.text();
          if (errText.trim().startsWith('<') || errText.includes('<!DOCTYPE html>')) {
            throw new Error("Dịch vụ tạo đề tạm thời gián đoạn hoặc API Key chưa được nạp đúng. Vui lòng kiểm tra lại cấu hình API.");
          }
          try {
             const errorData = JSON.parse(errText);
             errorMsg = errorData.error || errorMsg;
          } catch(e) {
             if (response.status === 503 || response.status === 504 || response.status === 502) {
                errorMsg = "Hệ thống đang quá tải hoặc hết thời gian chờ. Vui lòng thử lại sau.";
             } else {
                errorMsg = `Lỗi hệ thống (${response.status}): Không thể kết nối với máy chủ.`;
             }
          }
        } catch (e: any) {
          if (e.message && e.message.includes("API Key")) throw e;
        }
        throw new Error(errorMsg);
      }

      const rawText = await response.text();
      
      // Kiểm tra xem dữ liệu trả về có bị dính HTML không
      if (rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE html>')) {
        console.error("Server trả về trang HTML thay vì JSON:", rawText);
        throw new Error("Dịch vụ tạo đề tạm thời gián đoạn hoặc API Key chưa được nạp đúng. Vui lòng kiểm tra lại cấu hình API.");
      }

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        try {
          data = parseApiResponse<{ result: string }>(rawText);
        } catch (e2) {
          console.error("Lỗi parse JSON:", rawText);
          throw new Error("Phản hồi từ máy chủ không đúng định dạng dữ liệu.");
        }
      }
      const rawResult = (typeof data?.result === 'string' ? data.result : String(data?.result || '')).replace(/\s*(?:undefined|null)\s*$/gi, '').trim();
      let processedResult = preProcessMathContent(rawResult);
      // Tự động chuyển đổi toàn bộ mã TikZ sang ảnh SVG đồ họa sắc nét (không để mã tex)
      processedResult = embedTikzSvgsInText(processedResult);
      // Tự động chuyển đổi toàn bộ BBT markdown tables sang ảnh SVG vector chuẩn SGK
      processedResult = processedResult.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
        if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
          const svg = convertBbtTableToSvg(match);
          if (svg) {
            const b64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
            if (b64) return `\n\n<svg-wrapper data-svg="${b64}"></svg-wrapper>\n\n`;
          }
        }
        return match;
      });
      setSuggestion(processedResult);

      // Tự động phân tích các câu hỏi để hiển thị giao diện câu hỏi trực quan kèm bộ công cụ BBT & Đồ thị
      try {
        const parsed = parseRawExamText(processedResult);
        if (parsed && parsed.length > 0) {
          const enriched = parsed.map((q, idx) => {
            let content = embedTikzSvgsInText(q.content || '');
            let solution = embedTikzSvgsInText(q.solution || q.explanation || '');

            content = content.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
              if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
                const svg = convertBbtTableToSvg(match);
                if (svg) {
                  const b64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
                  if (b64) return `\n\n<svg-wrapper data-svg="${b64}"></svg-wrapper>\n\n`;
                }
              }
              return match;
            });

            solution = solution.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
              if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
                const svg = convertBbtTableToSvg(match);
                if (svg) {
                  const b64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
                  if (b64) return `\n\n<svg-wrapper data-svg="${b64}"></svg-wrapper>\n\n`;
                }
              }
              return match;
            });

            // Tự động tạo BBT dạng ảnh SVG nếu câu hỏi nhắc đến BBT
            if (isMissingBbt(content)) {
              const fMatch = content.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || 
                             content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);
              if (fMatch) {
                const bbt = analyzeFunctionToBbt(fMatch[1].trim());
                if (bbt) {
                  const svg = generateBbtSvg(bbt);
                  if (svg) {
                    const b64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
                    if (b64) content += `\n\n<svg-wrapper data-svg="${b64}"></svg-wrapper>\n\n`;
                  }
                }
              }
            }

            return {
              ...q,
              id: q.id || idx + 1,
              content,
              solution,
              explanation: solution
            };
          });

          setWorksheetQuestions(enriched);
          setViewMode('document');
        } else {
          setWorksheetQuestions([]);
          setViewMode('document');
        }
      } catch (e) {
        setWorksheetQuestions([]);
        setViewMode('document');
      }
      
      // Save to history
      saveToHistory({
        type: "PHT",
        grade: selectedGrade,
        subject: subject,
        lessonName: customLessonName,
        content: processedResult
      });
      setHistoryItems(getHistory().filter(item => item.type === 'PHT'));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể tạo phiếu học tập lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPNG = async () => {
    if (!exportRef.current) return;
    if (isEditing) {
      alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi tải ảnh Poster.");
      return;
    }
    setIsExportingImage(true);
    try {
      const cleanTitle = customLessonName ? customLessonName.replace(/\s+/g, '_') : 'PhieuHocTap';
      await exportElementToImage(exportRef.current, `Poster_${cleanTitle}_${layoutStyle}.png`);
    } catch (err) {
      console.error("Lỗi khi tải ảnh Poster:", err);
      alert("Không thể tải ảnh lúc này. Bạn có thể dùng nút 'In / Xuất PDF' để lưu tài liệu.");
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportPDF = async () => {
    if (isEditing) {
      alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi in hoặc xuất PDF.");
      return;
    }
    const cleanTitle = customLessonName ? `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}` : "PhieuHocTap";
    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
    }
    printElement(exportRef.current, cleanTitle);
  };

  const handleExportWord = async () => {
    if (isEditing) {
      if (window.confirm("Bạn đang ở chế độ chỉnh sửa (hiển thị mã Markdown). Bạn có muốn chuyển sang chế độ Xem trước để xuất file đẹp hơn không?")) {
        setIsEditing(false);
        setTimeout(async () => {
          if (exportRef.current) {
            await ensureMathRendered(exportRef.current);
            exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}.doc`);
          }
        }, 500);
      } else {
        alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi tải xuống.");
      }
      return;
    }

    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
      exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}.doc`);
    }
  };

  const handleExportWordLatex = async () => {
    if (isEditing) {
      alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi tải xuống.");
      return;
    }
    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
      exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}_LaTeX.doc`, true);
    }
  };

  const handleExportWordImage = async () => {
    if (isEditing) {
      alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi tải xuống.");
      return;
    }
    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
      exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}_Anh.doc`, 'image');
    }
  };

  const splitContent = (content: string) => {
    // Attempt to split content at first heading or question block mentioning "Bài tập", "Trắc nghiệm", "Câu 1", "Luyện tập"
    const regex = /(?:PHẦN BÀI TẬP|BÀI TẬP|CÂU HỎI TRẮC NGHIỆM|##\s*Bài tập|##\s*Luyện tập|Câu 1:|Câu 1\.|###\s*A\.\s*Trắc nghiệm|##\s*A\.\s*TRẮC NGHIỆM|##\s*Bài tập tự luyện)/i;
    const match = content.match(regex);
    if (match && match.index !== undefined) {
      return {
        left: content.substring(0, match.index),
        right: content.substring(match.index)
      };
    }
    // Fallback: split roughly in half by paragraph if no clear separator
    const paragraphs = content.split("\n\n");
    const half = Math.ceil(paragraphs.length / 2);
    return {
      left: paragraphs.slice(0, half).join("\n\n"),
      right: paragraphs.slice(half).join("\n\n")
    };
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-full bg-slate-50 lg:overflow-hidden">
      {/* Left Sidebar - Settings */}
      <div className="w-full lg:w-[400px] lg:border-r border-b lg:border-b-0 border-slate-200 bg-white flex flex-col h-auto lg:h-full shrink-0">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Phiếu học tập
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tạo phiếu bài tập, tóm tắt kiến thức cho học sinh
          </p>
        </div>

        {historyItems.length > 0 && (
          <div className="p-4 border-b border-slate-200 bg-white">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Lịch sử đã tạo
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  const item = historyItems.find(h => h.id === e.target.value);
                  if (item) {
                    setSuggestion(item.content);
                    setCustomLessonName(item.lessonName);
                    if (item.subject) setSubject(item.subject);
                    if (item.grade) setSelectedGrade(item.grade);
                  }
                }
              }}
            >
              <option value="">-- Chọn phiếu học tập đã tạo --</option>
              {historyItems.map(item => (
                <option key={item.id} value={item.id}>
                  {new Date(item.createdAt).toLocaleDateString('vi-VN')} - {item.lessonName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Môn học
              </label>
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setSelectedChapterId("");
                  setSelectedLessonId("");
                }}
              >
                {subjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Hierarchical KNTT Curriculum Selectors */}
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/60 space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chương trình SGK Kết nối tri thức</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Khối lớp
                  </label>
                  <select 
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs font-semibold text-slate-800"
                    value={selectedGrade}
                    onChange={(e) => {
                      const gradeVal = Number(e.target.value);
                      setSelectedGrade(gradeVal);
                      setSelectedChapterId("");
                      setSelectedLessonId("");
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                      <option key={g} value={g}>Lớp {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Học kỳ
                  </label>
                  <select 
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs font-semibold text-slate-800"
                    value={selectedSemester}
                    onChange={(e) => {
                      setSelectedSemester(e.target.value as any);
                      setSelectedChapterId("");
                      setSelectedLessonId("");
                    }}
                  >
                    <option value="semester_1">Học kỳ 1</option>
                    <option value="semester_2">Học kỳ 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Chương / Chủ đề
                </label>
                <select 
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs font-semibold text-slate-800"
                  value={selectedChapterId}
                  onChange={(e) => {
                    setSelectedChapterId(e.target.value);
                    setSelectedLessonId("");
                  }}
                >
                  {(() => {
                    const semData = getKnttCurriculum(subject, selectedGrade, selectedSemester);
                    const chapters = semData?.chapters || [];
                    return chapters.map(chap => (
                      <option key={chap.id} value={chap.id}>{chap.name}</option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Bài học cụ thể
                </label>
                <select 
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs font-semibold text-slate-800"
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                >
                  {(() => {
                    const semData = getKnttCurriculum(subject, selectedGrade, selectedSemester);
                    const chapters = semData?.chapters || [];
                    const selectedChapter = chapters.find(c => c.id === selectedChapterId) || chapters[0];
                    const lessons = selectedChapter?.lessons || [];
                    return lessons.map(les => (
                      <option key={les.id} value={les.id}>{les.name}</option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nội dung bổ sung / Trọng tâm nhấn mạnh (nếu có)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tập trung vào GTLN của hàm phân thức..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs text-slate-800 font-medium"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Layout Style Selector */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  Phong cách trình bày (Layout Style)
                </label>
                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium border border-indigo-200/60">
                  2 phong cách
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {LAYOUT_STYLE_OPTIONS.map((style) => {
                  const Icon = style.icon;
                  const isSelected = layoutStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setLayoutStyle(style.id)}
                      className={cn(
                        "relative text-left p-3 rounded-xl border transition-all flex flex-col justify-between group",
                        isSelected
                          ? style.activeColor
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 shadow-2xs"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-white shadow-xs" : "bg-slate-100 group-hover:bg-white text-slate-600"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold leading-tight line-clamp-1">
                            {style.title}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="mt-1">
                        <span className={cn(
                          "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mb-1 border border-current/20",
                          style.badgeBg
                        )}>
                          {style.badge}
                        </span>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {style.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced Exercise & Answer Settings - New 4 Parts Selector */}
            <div className="pt-2 border-t border-slate-200/80">
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cấu trúc 4 Phần Câu Hỏi</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700">
                  <div className="bg-white p-2 border border-slate-200 rounded-lg">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Phần I: Trắc nghiệm (A,B,C,D)
                    </label>
                    <select
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-semibold"
                      value={numPartI}
                      onChange={(e) => setNumPartI(Number(e.target.value))}
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <option key={n} value={n}>{n} câu</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white p-2 border border-slate-200 rounded-lg">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Phần II: Đúng - Sai (a,b,c,d)
                    </label>
                    <select
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-semibold"
                      value={numPartII}
                      onChange={(e) => setNumPartII(Number(e.target.value))}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map(n => (
                        <option key={n} value={n}>{n} câu</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white p-2 border border-slate-200 rounded-lg">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Phần III: Trả lời ngắn
                    </label>
                    <select
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-semibold"
                      value={numPartIII}
                      onChange={(e) => setNumPartIII(Number(e.target.value))}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map(n => (
                        <option key={n} value={n}>{n} câu</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white p-2 border border-slate-200 rounded-lg">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Phần IV: Tự luận rèn luyện
                    </label>
                    <select
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-semibold"
                      value={numPartIV}
                      onChange={(e) => setNumPartIV(Number(e.target.value))}
                    >
                      {[0, 1, 2, 3, 4].map(n => (
                        <option key={n} value={n}>{n} bài</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Real-world percentage slider */}
                <div className="bg-white p-2.5 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                    <span>Tỷ lệ bài toán thực tế</span>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono">{realWorldPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
                    value={realWorldPercent}
                    onChange={(e) => setRealWorldPercent(Number(e.target.value))}
                  />
                </div>

                {/* Parametric switch */}
                <div className="bg-white p-2.5 border border-slate-200 rounded-lg space-y-2">
                  <span className="block text-[11px] font-bold text-slate-600">Phân hóa tham số thực</span>
                  <div className="flex flex-col gap-1.5 text-xs text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="parametric_option"
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        checked={!hasParametric}
                        onChange={() => setHasParametric(false)}
                      />
                      <span>Không có bài toán chứa tham số</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="parametric_option"
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        checked={hasParametric}
                        onChange={() => setHasParametric(true)}
                      />
                      <span>Có bài toán chứa tham số ($m, a, b...$) để phân hóa học sinh</span>
                    </label>
                  </div>
                </div>

                {/* Answer Mode selection */}
                <div className="bg-white p-2.5 border border-slate-200 rounded-lg">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Chế độ đáp án hiển thị
                  </label>
                  <select
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    value={answerMode}
                    onChange={(e) => setAnswerMode(e.target.value as any)}
                  >
                    <option value="full">Đầy đủ lời giải & hướng dẫn chấm chi tiết</option>
                    <option value="summary">Chỉ kèm bảng đáp án nhanh / kết số</option>
                    <option value="none">Không kèm đáp án (cho học sinh làm bài)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading || isGeneratingInteractive || !customLessonName}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tạo bản In...</span>
                </>
              ) : (
                <>
                  <Printer className="w-5 h-5" />
                  <span>Tạo bản Word/In</span>
                </>
              )}
            </button>

            <button
              onClick={handleGenerateInteractive}
              disabled={isLoading || isGeneratingInteractive || !customLessonName}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {isGeneratingInteractive ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  <span>Tạo Link Làm Online</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-2.5">
            <button
              onClick={() => setIsUploadExamModalOpen(true)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow"
              title="Tải đề Word/PDF/Text của giáo viên lên để tạo link làm online kèm sửa lỗi"
            >
              <Upload className="w-4 h-4" />
              <span>Tải đề của tôi lên (Word/PDF/Text)</span>
            </button>
          </div>
          
          {shareLink && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Link online cho học sinh (đã rút gọn):
                </span>
                <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                  Gửi qua Zalo / Facebook
                </span>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={shareLink} 
                  className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm text-emerald-800 font-semibold shadow-inner focus:outline-none select-all" 
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink); 
                    alert('Đã sao chép link!\nCô có thể dán trực tiếp vào nhóm Zalo/Facebook để học sinh làm bài ngay.');
                  }} 
                  className="px-3.5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 shrink-0 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-4 h-4" /> Sao chép
                </button>
                <a 
                  href={shareLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-3.5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 shrink-0 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Mở thử
                </a>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 Link ngắn gọn, học sinh mở trực tiếp trên điện thoại/máy tính mà không bị lỗi đứt link.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Content - Preview */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-wrap justify-between items-center gap-2.5 shrink-0 min-h-[73px]">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              Kết quả hiển thị
            </h2>

            {/* Quick Layout Style Switcher Pills */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              {LAYOUT_STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setLayoutStyle(style.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-all",
                    layoutStyle === style.id
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                  title={style.desc}
                >
                  {style.shortTitle}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(suggestion || worksheetQuestions.length > 0) && (
              <>
                {worksheetQuestions.length > 0 && (
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                    <button
                      onClick={() => setViewMode('document')}
                      className={cn(
                        "px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        viewMode === 'document' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                      title="Hiển thị bố cục toàn trang phiếu học tập chuẩn GDPT 2018 (Khổ A4 in ấn / Xuất Word)"
                    >
                      <FileText className="w-3.5 h-3.5" /> Bản in phiếu học tập (A4)
                    </button>
                    <button
                      onClick={() => setViewMode('questions')}
                      className={cn(
                        "px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        viewMode === 'questions' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                      title="Hiển thị từng câu hỏi kèm thanh công cụ chèn BBT, Đồ thị và lời giải chi tiết"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Chi tiết từng câu ({worksheetQuestions.length})
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleAllSolutions}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Bật/Tắt hiển thị lời giải chi tiết cho tất cả câu hỏi"
                >
                  <span>{showAllSolutions ? "🙈 Ẩn tất cả lời giải" : "👁️ Hiện tất cả lời giải"}</span>
                </button>

                {/* Auto Generate BBT & Graph Images */}
                <button
                  type="button"
                  onClick={handleAutoGenerateAllBbtAndGraphs}
                  disabled={isAutoGeneratingImages}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Tự động quét và kết xuất toàn bộ Bảng biến thiên và Đồ thị dưới dạng ảnh SVG/PNG sắc nét (không dùng mã tex)"
                >
                  {isAutoGeneratingImages ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang xuất ảnh...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>✨ Tự động xuất BBT & Đồ thị ảnh</span>
                    </>
                  )}
                </button>

                {/* Manual Visualizer Drawer Toggles for Document Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setDocVisualizerTab("bbt");
                    setIsDocVisualizerOpen(prev => (docVisualizerTab === "bbt" ? !prev : true));
                  }}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border shadow-2xs transition-colors cursor-pointer",
                    isDocVisualizerOpen && docVisualizerTab === "bbt"
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                  )}
                  title="Mở Module Bảng biến thiên (chuẩn SGK) để tạo và chèn vào phiếu"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>📈 BBT</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocVisualizerTab("graph");
                    setIsDocVisualizerOpen(prev => (docVisualizerTab === "graph" ? !prev : true));
                  }}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border shadow-2xs transition-colors cursor-pointer",
                    isDocVisualizerOpen && docVisualizerTab === "graph"
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300"
                  )}
                  title="Mở Module Đồ thị & BPT để vẽ và chèn ảnh vào phiếu"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>📊 Đồ thị</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocVisualizerTab("geometry3d");
                    setIsDocVisualizerOpen(prev => (docVisualizerTab === "geometry3d" ? !prev : true));
                  }}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border shadow-2xs transition-colors cursor-pointer",
                    isDocVisualizerOpen && docVisualizerTab === "geometry3d"
                      ? "bg-purple-600 text-white border-purple-700"
                      : "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300"
                  )}
                  title="Mở Module Hình học không gian 3D (Chóp, Lăng trụ, Hộp, Nón, Trụ, Cầu)"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>🧊 Hình 3D</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocVisualizerTab("statistics");
                    setIsDocVisualizerOpen(prev => (docVisualizerTab === "statistics" ? !prev : true));
                  }}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border shadow-2xs transition-colors cursor-pointer",
                    isDocVisualizerOpen && docVisualizerTab === "statistics"
                      ? "bg-amber-600 text-white border-amber-700"
                      : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                  )}
                  title="Mở Module Biểu đồ & Bảng Thống kê (Mẫu số liệu ghép nhóm và rời rạc)"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>📉 Thống kê</span>
                </button>

                {viewMode === 'document' && suggestion && (
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setIsEditing(false)}
                      className={cn(
                        "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                        !isEditing ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Eye className="w-4 h-4" /> Xem trước
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className={cn(
                        "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                        isEditing ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Edit3 className="w-4 h-4" /> Chỉnh sửa
                    </button>
                  </div>
                )}

                {/* Export Poster Image (PNG) */}
                <button
                  onClick={handleExportPNG}
                  disabled={isExportingImage}
                  className={cn(
                    "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
                  )}
                  title="Tải ảnh Poster sắc nét (PNG) để chia sẻ Zalo/Facebook hoặc in màu"
                >
                  {isExportingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tạo ảnh...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      <span>Tải ảnh Poster (PNG)</span>
                    </>
                  )}
                </button>

                {/* Export PDF / In */}
                <button
                  onClick={handleExportPDF}
                  className={cn(
                    "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-800"
                  )}
                  title="In trực tiếp hoặc Lưu file PDF chuẩn A4/A3"
                >
                  <Printer className="w-4 h-4" />
                  <span>In / PDF</span>
                </button>

                {/* Export Word */}
                <button
                  onClick={handleExportWord}
                  className={cn(
                    "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                  )}
                  title={isEditing ? "Chuyển sang chế độ xem trước để tải xuống" : "Xuất file Word .docx chuẩn font và bảng biểu"}
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Word</span>
                </button>

                {/* Export Word (Ảnh) */}
                <button
                  onClick={handleExportWordImage}
                  className={cn(
                    "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700"
                  )}
                  title="Xuất file Word với toàn bộ Bảng biến thiên, Đồ thị và công thức toán học dưới dạng ảnh chất lượng cao (không lo lỗi font/lỗi tex)"
                >
                  <Download className="w-4 h-4" />
                  <span>Word (Ảnh)</span>
                </button>

                <button
                  onClick={handleExportWordLatex}
                  className={cn(
                    "hidden xl:flex px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg items-center gap-1.5 shadow-xs transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  )}
                  title={isEditing ? "Chuyển sang chế độ xem trước để tải xuống" : "Xuất Word giữ nguyên mã LaTeX để dùng chức năng Toggle TeX của MathType"}
                >
                  <Download className="w-4 h-4" />
                  <span>Word (LaTeX)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tùy chọn In & Xuất file: Kèm lời giải (Bản GV) vs Không kèm lời giải (Bản HS) */}
        {(suggestion || worksheetQuestions.length > 0) && (
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs shrink-0">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              📄 Chế độ In & Xuất file:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="worksheet-solution-mode"
                checked={includeDetailedSolution}
                onChange={() => setIncludeDetailedSolution(true)}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold text-emerald-800">
                Kèm theo lời giải chi tiết (Bản dành cho Giáo viên)
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="worksheet-solution-mode"
                checked={!includeDetailedSolution}
                onChange={() => setIncludeDetailedSolution(false)}
                className="w-4 h-4 text-slate-600 focus:ring-slate-500"
              />
              <span className="font-medium text-slate-600">
                Không kèm lời giải chi tiết (Bản dành cho Học sinh)
              </span>
            </label>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8">
          {isLoading ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-emerald-700 font-bold text-base">Đang khởi tạo phiếu học tập phong cách {LAYOUT_STYLE_OPTIONS.find(s => s.id === layoutStyle)?.title}...</p>
              <p className="text-slate-500 text-sm max-w-sm text-center">
                AI đang cấu trúc hóa kiến thức trọng tâm, bài toán thực tế và lời giải chi tiết. Vui lòng đợi trong giây lát...
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {(() => {
                const SOLUTION_DELIMITER_REGEX = /(?:\n\s*---+\s*(?:HƯỚNG DẪN CHẤM|ĐÁP ÁN CHI TIẾT|LỜI GIẢI CHI TIẾT|HƯỚNG DẪN GIẢI|BẢNG ĐÁP ÁN NHANH|BẢNG ĐÁP ÁN)[^\n]*---+\s*\n|\n\s*#{1,3}\s*(?:IV|V|III|Phần\s*(?:4|IV))?\.?\s*(?:HƯỚNG DẪN CHẤM|ĐÁP ÁN CHI TIẾT|LỜI GIẢI CHI TIẾT|HƯỚNG DẪN GIẢI|BẢNG ĐÁP ÁN NHANH|BẢNG ĐÁP ÁN)\b[^\n]*\n)/i;
                const delimiterMatch = suggestion ? suggestion.match(SOLUTION_DELIMITER_REGEX) : null;
                const mainDocContent = delimiterMatch && delimiterMatch.index !== undefined ? suggestion.substring(0, delimiterMatch.index).trim() : suggestion;
                const solutionDocContent = delimiterMatch && delimiterMatch.index !== undefined ? suggestion.substring(delimiterMatch.index).trim() : "";

                if (viewMode === 'questions' && worksheetQuestions.length > 0) {
                  return (
                    <div 
                      ref={exportRef}
                      className="bg-white p-8 md:p-12 shadow-sm border border-slate-300 rounded-xl min-h-[500px] font-serif text-slate-900 max-w-[210mm] mx-auto space-y-6"
                    >
                      {/* School Exam Header for A4 Print (Chuẩn Sư Phạm GDPT 2018) */}
                      <div className="border-2 border-slate-800 mb-6 p-4 bg-white text-xs sm:text-sm text-slate-800 leading-normal">
                        <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-300">
                          <div className="text-center font-bold">
                            <p className="uppercase text-[11px] sm:text-xs tracking-wider text-slate-700">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
                            <p className="uppercase text-[12px] sm:text-sm text-slate-900 font-extrabold">TRƯỜNG THPT: ................................................</p>
                            <p className="text-[11px] font-semibold text-slate-600">TỔ CHUYÊN MÔN: TOÁN - TIN HỌC</p>
                          </div>
                          <div className="text-center">
                            <p className="font-black uppercase text-slate-900 text-sm sm:text-base tracking-wide">PHIẾU HỌC TẬP</p>
                            <p className="font-bold text-emerald-800 text-xs sm:text-sm mt-0.5 uppercase">BÀI: {customLessonName || "BÀI HỌC"}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">Môn: {subject} • Lớp {selectedGrade} • Năm học 2024 - 2025</p>
                          </div>
                        </div>

                        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-dashed border-slate-300 text-xs sm:text-sm">
                          <div>
                            <span className="font-semibold">Họ và tên học sinh:</span> .................................................
                          </div>
                          <div>
                            <span className="font-semibold">Lớp:</span> .................... <span className="font-semibold ml-2">STT:</span> ......
                          </div>
                          <div className="sm:text-right">
                            <span className="font-semibold">Ngày nộp:</span> ...... / ...... / 202...
                          </div>
                        </div>

                        <div className="grid grid-cols-12 gap-2 pt-2.5 items-stretch">
                          <div className="col-span-3 border border-slate-700 p-2 text-center rounded bg-slate-50 flex flex-col justify-center">
                            <span className="font-bold block text-[11px] uppercase text-slate-700">ĐIỂM SỐ</span>
                            <span className="text-base font-bold text-slate-400 italic mt-0.5">......... / 10</span>
                          </div>
                          <div className="col-span-9 pl-3 border-l border-slate-200">
                            <span className="font-bold block text-slate-800 text-xs">Lời phê & Nhận xét của Thầy / Cô:</span>
                            <p className="border-b border-dotted border-slate-400 mt-2 h-4"></p>
                            <p className="border-b border-dotted border-slate-400 mt-2.5 h-4"></p>
                          </div>
                        </div>
                      </div>

                      {/* Optional Collapsible Theory Box at Top of Questions Mode */}
                      {mainDocContent && (
                        <div className="mb-6 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl no-print">
                          <details className="group">
                            <summary className="font-bold text-emerald-900 cursor-pointer list-none flex items-center justify-between text-sm">
                              <span className="flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-emerald-700" />
                                <span>📚 Xem Mục tiêu & Kiến thức trọng tâm của phiếu học tập</span>
                              </span>
                              <span className="text-xs text-emerald-700 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="mt-3 pt-3 border-t border-emerald-200/80 text-slate-800 text-sm prose max-w-none">
                              <MarkdownRenderer content={fixMath(mainDocContent)} />
                            </div>
                          </details>
                        </div>
                      )}

                      {/* Questions List with Accordion Toggle for Detailed Solution & Visualizer */}
                      <div className="space-y-6">
                        {worksheetQuestions.map((q, idx) => (
                          <div key={idx} className="pb-4 border-b border-slate-200 last:border-0 relative">
                            {/* Question Action Toolbar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 no-print">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-sm">Câu {idx + 1}:</span>
                                {q.level && <span className="text-xs text-emerald-600 font-medium px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">[{q.level}]</span>}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "content") {
                                      setActiveVisualizer(null);
                                    } else {
                                      setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "content" });
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-colors cursor-pointer ${
                                    activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "content"
                                      ? "bg-emerald-600 text-white border-emerald-700"
                                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                  }`}
                                  title="Tích hợp Module BBT: Chèn Bảng biến thiên (dạng ảnh SVG chuẩn SGK) vào câu hỏi"
                                >
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>+ BBT</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "content") {
                                      setActiveVisualizer(null);
                                    } else {
                                      setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" });
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-colors cursor-pointer ${
                                    activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "content"
                                      ? "bg-blue-600 text-white border-blue-700"
                                      : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300"
                                  }`}
                                  title="Tích hợp Module Đồ thị: Chèn Đồ thị & BPT (dạng ảnh đồ họa) vào câu hỏi"
                                >
                                  <BarChart2 className="w-3.5 h-3.5" />
                                  <span>+ Đồ thị</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "content") {
                                      setActiveVisualizer(null);
                                    } else {
                                      setActiveVisualizer({ qIndex: idx, tab: "geometry3d", target: "content" });
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-colors cursor-pointer ${
                                    activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "content"
                                      ? "bg-purple-600 text-white border-purple-700"
                                      : "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300"
                                  }`}
                                  title="Tích hợp Module Hình học không gian 3D: Chóp, Lăng trụ, Hộp, Nón, Trụ, Cầu"
                                >
                                  <Box className="w-3.5 h-3.5" />
                                  <span>+ Hình 3D</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "content") {
                                      setActiveVisualizer(null);
                                    } else {
                                      setActiveVisualizer({ qIndex: idx, tab: "statistics", target: "content" });
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-colors cursor-pointer ${
                                    activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "content"
                                      ? "bg-amber-600 text-white border-amber-700"
                                      : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                                  }`}
                                  title="Tích hợp Module Thống kê: Chèn Biểu đồ hoặc Bảng tần số"
                                >
                                  <BarChart3 className="w-3.5 h-3.5" />
                                  <span>+ Thống kê</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleAiFixBbtForWorksheetQuestion(q, idx)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                                  title="AI tự động phân tích hàm số và vẽ BBT dạng ảnh SVG chuẩn SGK"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                  <span>✨ AI vẽ BBT ảnh</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditingQuestion({ question: q, index: idx })}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                                  title="Chỉnh sửa chi tiết nội dung, phương án và lời giải câu hỏi"
                                >
                                  <Edit3 className="w-3 h-3 text-slate-500" />
                                  <span>Sửa</span>
                                </button>
                              </div>
                            </div>

                            {/* Missing BBT Alert Banner */}
                            {isMissingBbt(q.content || (q as any).question) && (
                              <div className="flex flex-wrap items-center justify-between p-2.5 my-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 shadow-2xs gap-2 no-print">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <span className="text-base">⚠️</span>
                                  <span>Đề bài nhắc đến <strong>Bảng biến thiên</strong> nhưng chưa có bảng/hình hiển thị.</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "content" })}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Mở Module Bảng biến thiên để chọn mẫu hoặc tinh chỉnh và chèn vào câu hỏi"
                                  >
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span>📈 Mở Module BBT & Chọn</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAiFixBbtForWorksheetQuestion(q, idx)}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Tự động vẽ BBT dạng ảnh SVG chuẩn SGK"
                                  >
                                    <span>✨ Tự động xuất BBT ảnh</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuestion({ question: q, index: idx })}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 text-amber-800 border border-amber-300 rounded-md font-medium cursor-pointer"
                                  >
                                    <span>✏️ Tự chèn BBT</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Missing Graph Alert Banner */}
                            {isMissingGraph(q.content || (q as any).question) && (
                              <div className="flex flex-wrap items-center justify-between p-2.5 my-2 bg-blue-50 border border-blue-300 rounded-lg text-xs text-blue-900 shadow-2xs gap-2 no-print">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <span className="text-base">📊</span>
                                  <span>Đề bài nhắc đến <strong>Đồ thị / Hình vẽ</strong> nhưng chưa có hình hiển thị.</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" })}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Mở Module Đồ thị để vẽ và chèn hình vào câu hỏi"
                                  >
                                    <BarChart2 className="w-3.5 h-3.5" />
                                    <span>📊 Mở Module Đồ thị & Chèn</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAutoGenerateGraphForWorksheetQuestion(q, idx)}
                                    className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <span>✨ Tự động xuất Đồ thị ảnh</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="font-medium text-slate-800 mb-3 flex items-start gap-2">
                              <span className="font-bold whitespace-nowrap mt-1">Câu {idx + 1}:</span>
                              <MarkdownRenderer className="markdown-body inline-block" content={cleanQuestionStem(q.content || (q as any).question || '', q.options, q.tfStatements)} />
                              {q.level && <span className="text-xs text-emerald-600 font-normal mt-1 shrink-0">[{q.level}]</span>}
                            </div>

                            {/* TF */}
                            {q.type === 'tf' && q.tfStatements && (
                              <div className="flex flex-col gap-2 pl-4 mb-3">
                                {q.tfStatements.map((stmt: any, sIdx: number) => (
                                  <div key={sIdx} className="flex items-start gap-1 p-2 rounded-md bg-slate-50 border border-slate-200 text-sm">
                                    <span className="shrink-0 font-medium">{['a)', 'b)', 'c)', 'd)'][sIdx] || String.fromCharCode(97 + sIdx) + ')'}</span>
                                    <span className="flex-1"><MarkdownRenderer className="markdown-body inline-block" content={fixMath(stmt.statement || '')} /></span>
                                    {includeDetailedSolution && (
                                      <span className={`shrink-0 font-bold px-2 rounded text-xs ${stmt.correct ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>
                                        {stmt.correct ? 'Đ' : 'S'}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* MC */}
                            {q.type === 'mc' && q.options && (() => {
                              const cleanedOpts = q.options.map((opt: string) => cleanOptionText(opt));
                              const maxLen = Math.max(...cleanedOpts.map((o: string) => (o || '').length), 0);
                              const gridCols = maxLen <= 18 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' : maxLen <= 45 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1';
                              return (
                                <div className={cn("w-full grid gap-2 pl-2 mt-2 mb-3", gridCols)}>
                                  {cleanedOpts.map((opt: string, oIdx: number) => (
                                    <div key={oIdx} className={cn(
                                      "min-h-[38px] flex items-center px-3.5 py-1.5 text-left rounded-lg border text-sm break-words overflow-hidden",
                                      includeDetailedSolution && oIdx === q.correctOptionIndex
                                        ? "bg-emerald-50 border-emerald-300 font-medium text-emerald-950"
                                        : "bg-slate-50/50 border-slate-200/80 text-slate-800"
                                    )}>
                                      <span className="shrink-0 font-bold select-none min-w-[1.75rem] whitespace-nowrap text-slate-900">{String.fromCharCode(65 + oIdx)}.</span>
                                      <span className="flex-1 break-words overflow-hidden">
                                        <MarkdownRenderer inline={true} className="markdown-body inline align-baseline" content={fixMath(opt)} />
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Short Answer / Essay answer */}
                            {q.type !== 'mc' && q.type !== 'tf' && q.correctAnswer && includeDetailedSolution && (
                              <div className="mt-2 pl-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                                <span className="font-semibold text-emerald-800">Đáp án:</span> <MarkdownRenderer className="markdown-body inline-block" content={fixMath(q.correctAnswer || '')} />
                              </div>
                            )}

                            {/* Lời giải chi tiết - Accordion toggle & BBT/Đồ thị buttons */}
                            <div className="mt-3 pl-2 no-print">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => toggleSolution(q.id || idx + 1)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                                >
                                  <span>{isSolutionOpen(q.id || idx + 1) ? "🙈 Ẩn lời giải" : "💡 Xem lời giải chi tiết"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                                    if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "solution") {
                                      setActiveVisualizer(null);
                                    } else {
                                      setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "solution" });
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                                    activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "solution"
                                      ? "bg-emerald-600 text-white border-emerald-700"
                                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                  }`}
                                  title="Tích hợp Module BBT: Chèn Bảng biến thiên (dạng ảnh SVG chuẩn SGK) vào lời giải chi tiết"
                                >
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>+ BBT vào lời giải</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                                    if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "solution") {
                                      setActiveVisualizer(null);
                                    } else {
                                      setActiveVisualizer({ qIndex: idx, tab: "graph", target: "solution" });
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                                    activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "solution"
                                      ? "bg-blue-600 text-white border-blue-700"
                                      : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300"
                                  }`}
                                  title="Tích hợp Module Đồ thị: Chèn Đồ thị & BPT (dạng ảnh đồ họa) vào lời giải chi tiết"
                                >
                                  <BarChart2 className="w-3.5 h-3.5" />
                                  <span>+ Đồ thị vào lời giải</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                                    if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "solution") {
                                      setActiveVisualizer(null);
                                    } else {
                                      setActiveVisualizer({ qIndex: idx, tab: "geometry3d", target: "solution" });
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                                    activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "solution"
                                      ? "bg-purple-600 text-white border-purple-700"
                                      : "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300"
                                  }`}
                                  title="Tích hợp Module Hình không gian 3D: Chèn hình chóp, lăng trụ, nón, trụ, cầu vào lời giải"
                                >
                                  <Box className="w-3.5 h-3.5" />
                                  <span>+ Hình 3D vào lời giải</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                                    if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "solution") {
                                      setActiveVisualizer(null);
                                    } else {
                                      setActiveVisualizer({ qIndex: idx, tab: "statistics", target: "solution" });
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                                    activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "solution"
                                      ? "bg-amber-600 text-white border-amber-700"
                                      : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                                  }`}
                                  title="Tích hợp Module Thống kê: Chèn Biểu đồ hoặc Bảng tần số vào lời giải"
                                >
                                  <BarChart3 className="w-3.5 h-3.5" />
                                  <span>+ Thống kê vào lời giải</span>
                                </button>
                              </div>

                              {isSolutionOpen(q.id || idx + 1) && (
                                <div 
                                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginTop: '8px' }}
                                  className="text-slate-800 text-sm leading-relaxed"
                                >
                                  <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span>💡 Lời giải chi tiết:</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "solution" })}
                                        className="text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-0.5 rounded bg-emerald-100/70 border border-emerald-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                                        title="Mở Module BBT để chèn vào lời giải"
                                      >
                                        <TrendingUp className="w-3 h-3" />
                                        <span>Mở BBT</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setActiveVisualizer({ qIndex: idx, tab: "graph", target: "solution" })}
                                        className="text-blue-700 hover:text-blue-900 font-semibold px-2 py-0.5 rounded bg-blue-100/70 border border-blue-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                                        title="Mở Module Đồ thị để chèn vào lời giải"
                                      >
                                        <BarChart2 className="w-3 h-3" />
                                        <span>Mở Đồ thị</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setActiveVisualizer({ qIndex: idx, tab: "geometry3d", target: "solution" })}
                                        className="text-purple-700 hover:text-purple-900 font-semibold px-2 py-0.5 rounded bg-purple-100/70 border border-purple-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                                        title="Mở Module Hình 3D để chèn vào lời giải"
                                      >
                                        <Box className="w-3 h-3" />
                                        <span>Mở Hình 3D</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setActiveVisualizer({ qIndex: idx, tab: "statistics", target: "solution" })}
                                        className="text-amber-700 hover:text-amber-900 font-semibold px-2 py-0.5 rounded bg-amber-100/70 border border-amber-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                                        title="Mở Module Thống kê để chèn vào lời giải"
                                      >
                                        <BarChart3 className="w-3 h-3" />
                                        <span>Mở Thống kê</span>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-slate-800">
                                    <MarkdownRenderer content={fixMath(q.solution || q.explanation || "Chưa có lời giải chi tiết cho câu hỏi này.")} />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Integrated BBT & Graph Visualizer Panel directly inside the Question & Solution block */}
                            {activeVisualizer?.qIndex === idx && (
                              <div className="mt-3 no-print">
                                <QuestionVisualizerPanel
                                  questionNumber={idx + 1}
                                  questionContent={q.content || (q as any).question}
                                  solutionContent={q.solution || q.explanation}
                                  defaultTab={activeVisualizer.tab}
                                  defaultTarget={activeVisualizer.target}
                                  onInsertSnippet={(target, snippet) => handleInsertVisualizerSnippet(idx, target, snippet)}
                                  onClose={() => setActiveVisualizer(null)}
                                />
                              </div>
                            )}

                            {/* Lời giải chi tiết - Kèm theo khi In và Xuất Word (Bản Giáo viên) */}
                            {includeDetailedSolution && (q.solution || q.explanation) && (
                              <div 
                                className="only-print"
                                style={{ 
                                  backgroundColor: '#f8fafc', 
                                  border: '1px solid #cbd5e1', 
                                  borderRadius: '6px', 
                                  padding: '8pt 10pt', 
                                  marginTop: '6pt', 
                                  marginBottom: '8pt',
                                  pageBreakInside: 'avoid'
                                }}
                              >
                                <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '3pt', fontSize: '11pt' }}>
                                  💡 Lời giải chi tiết:
                                </div>
                                <div style={{ fontSize: '11pt', color: '#1e293b' }}>
                                  <MarkdownRenderer className="markdown-body inline-block" content={fixMath(q.solution || q.explanation || '')} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (suggestion) {
                  return isEditing ? (
                    <textarea
                      className="w-full h-[70vh] min-h-[500px] p-6 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm bg-white"
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                    />
                  ) : (
                    <>
                      {/* Document-level BBT & Graph Visualizer Tool */}
                      {isDocVisualizerOpen && (
                        <div className="mb-6 p-4 bg-white rounded-2xl border-2 border-emerald-400 shadow-md no-print max-w-[210mm] mx-auto">
                          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                              {docVisualizerTab === 'bbt' && (
                                <>
                                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                                  <span>Module Tạo Bảng Biến Thiên Dạng Ảnh Vector SVG (Chuẩn SGK)</span>
                                </>
                              )}
                              {docVisualizerTab === 'graph' && (
                                <>
                                  <BarChart2 className="w-4 h-4 text-blue-600" />
                                  <span>Module Vẽ & Xuất Đồ Thị 2D & Bất Phương Trình</span>
                                </>
                              )}
                              {docVisualizerTab === 'geometry3d' && (
                                <>
                                  <Box className="w-4 h-4 text-purple-600" />
                                  <span>Module Vẽ Hình Học Không Gian 3D (Chóp, Lăng trụ, Nón, Trụ, Cầu)</span>
                                </>
                              )}
                              {docVisualizerTab === 'statistics' && (
                                <>
                                  <BarChart3 className="w-4 h-4 text-amber-600" />
                                  <span>Module Biểu Đồ & Bảng Thống Kê (Mẫu số liệu ghép nhóm và rời rạc)</span>
                                </>
                              )}
                            </h3>
                            <button
                              onClick={() => setIsDocVisualizerOpen(false)}
                              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium cursor-pointer"
                            >
                              Đóng
                            </button>
                          </div>
                          <QuestionVisualizerPanel
                            questionNumber={1}
                            questionContent={customLessonName || "Hàm số"}
                            solutionContent=""
                            defaultTab={docVisualizerTab}
                            defaultTarget="content"
                            onInsertSnippet={handleInsertDocVisualizerSnippet}
                            onClose={() => setIsDocVisualizerOpen(false)}
                          />
                        </div>
                      )}

                      {/* Preview Canvas Container Styled by LayoutStyle */}
                      <div 
                        ref={exportRef}
                        style={{
                          fontFamily: layoutStyle === 'a4_print' 
                            ? "'Times New Roman', 'Liberation Serif', 'Be Vietnam Pro', Georgia, serif" 
                            : "'Inter', 'Be Vietnam Pro', system-ui, -apple-system, sans-serif"
                        }}
                        className={cn(
                          "transition-all duration-300 antialiased",
                          layoutStyle === 'a4_print' && "bg-white p-8 md:p-12 shadow-sm border border-slate-300 rounded-xl min-h-[500px] text-slate-900 max-w-[210mm] mx-auto text-[15px] leading-relaxed",
                          layoutStyle === 'infographic' && "bg-gradient-to-b from-sky-50/40 via-white to-indigo-50/30 p-6 md:p-10 shadow-md border-2 border-indigo-200/80 rounded-2xl min-h-[500px]",
                          layoutStyle === 'poster' && "bg-white p-6 md:p-10 shadow-xl border-4 border-indigo-500/80 rounded-3xl min-h-[500px]",
                          layoutStyle === 'mindmap' && "bg-slate-50/80 p-6 md:p-10 shadow-md border-2 border-emerald-300/80 rounded-2xl min-h-[500px]"
                        )}
                      >
                      {/* 1. Header decor for A4 Chuẩn In Ấn (Chuẩn Sư Phạm GDPT 2018) */}
                      {layoutStyle === 'a4_print' && (
                        <div className="border-2 border-slate-800 mb-8 p-4 bg-white text-xs sm:text-sm text-slate-800 leading-normal">
                          <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-300">
                            <div className="text-center font-bold">
                              <p className="uppercase text-[11px] sm:text-xs tracking-wider text-slate-700">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
                              <p className="uppercase text-[12px] sm:text-sm text-slate-900 font-extrabold">TRƯỜNG: ................................................</p>
                              <p className="text-[11px] font-semibold text-slate-600 uppercase">TỔ CHUYÊN MÔN: {subject || "KHOA HỌC TỰ NHIÊN"}</p>
                            </div>
                            <div className="text-center">
                              <p className="font-black uppercase text-slate-900 text-sm sm:text-base tracking-wide">PHIẾU HỌC TẬP</p>
                              <p className="font-bold text-emerald-800 text-xs sm:text-sm mt-0.5 uppercase">BÀI: {customLessonName || "BÀI HỌC"}</p>
                              <p className="text-[11px] text-slate-600 mt-0.5">Môn: {subject} • Lớp {selectedGrade} • Năm học 2024 - 2025</p>
                            </div>
                          </div>

                          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-dashed border-slate-300 text-xs sm:text-sm">
                            <div>
                              <span className="font-semibold">Họ và tên học sinh:</span> .................................................
                            </div>
                            <div>
                              <span className="font-semibold">Lớp:</span> .................... <span className="font-semibold ml-2">STT:</span> ......
                            </div>
                            <div className="sm:text-right">
                              <span className="font-semibold">Ngày nộp:</span> ...... / ...... / 202...
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-2 pt-2.5 items-stretch">
                            <div className="col-span-3 border border-slate-700 p-2 text-center rounded bg-slate-50 flex flex-col justify-center">
                              <span className="font-bold block text-[11px] uppercase text-slate-700">ĐIỂM SỐ</span>
                              <span className="text-base font-bold text-slate-400 italic mt-0.5">......... / 10</span>
                            </div>
                            <div className="col-span-9 pl-3 border-l border-slate-200">
                              <span className="font-bold block text-slate-800 text-xs">Lời phê & Nhận xét của Thầy / Cô:</span>
                              <p className="border-b border-dotted border-slate-400 mt-2 h-4"></p>
                              <p className="border-b border-dotted border-slate-400 mt-2.5 h-4"></p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. Header decor for Poster tóm tắt tư duy */}
                      {layoutStyle === 'poster' && (
                        <div className="mb-8">
                          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 text-white p-7 sm:p-9 rounded-2xl shadow-xl border-2 border-indigo-400/40 relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 fill-current" /> CHEAT SHEET TƯ DUY
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-200 border border-indigo-400/30">
                                  {subject} {selectedGrade}
                                </span>
                              </div>
                              <span className="text-xs text-indigo-300 font-mono hidden sm:inline-block">BẢN TỔNG HỢP CỐT LÕI KHỔ LỚN</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 uppercase">
                              {customLessonName || "TỔNG HỢP KIẾN THỨC CỐT LÕI"}
                            </h1>
                            <p className="text-xs sm:text-sm text-indigo-200/90 font-medium max-w-2xl leading-relaxed">
                              Toàn bộ công thức then chốt, quy trình các bước giải toán mẫu và mẹo thực chiến dán góc học tập hoặc lưu điện thoại.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 4. Header decor for Mindmap / Sơ đồ nhánh */}
                      {layoutStyle === 'mindmap' && (
                        <div className="mb-8 text-center">
                          <div className="inline-flex flex-col items-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-8 py-5 rounded-2xl shadow-lg border-2 border-emerald-300 ring-4 ring-emerald-100 max-w-2xl mx-auto">
                            <span className="text-xs font-bold tracking-widest uppercase text-emerald-200 mb-1 flex items-center gap-1.5">
                              <GitFork className="w-4 h-4" /> BẢN ĐỒ TƯ DUY & PHÂN NHÁNH
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                              🌳 {customLessonName || "CHỦ ĐỀ TRUNG TÂM"}
                            </h1>
                            <span className="text-xs text-emerald-100 mt-1 font-medium">
                              Môn {subject} - Lớp {selectedGrade} • Chuẩn GDPT 2018
                            </span>
                          </div>
                          <div className="flex flex-wrap justify-center items-center gap-2 mt-4 text-xs font-semibold text-emerald-800">
                            <span className="bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">🌿 Khái niệm</span>
                            <span className="text-emerald-500">➔</span>
                            <span className="bg-teal-100/80 px-2.5 py-1 rounded-full border border-teal-200">⚡ Công thức</span>
                            <span className="text-emerald-500">➔</span>
                            <span className="bg-cyan-100/80 px-2.5 py-1 rounded-full border border-cyan-200">🎯 Dạng bài</span>
                            <span className="text-emerald-500">➔</span>
                            <span className="bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200">⚠️ Bẫy sai lầm</span>
                          </div>
                        </div>
                      )}

                      {/* Content Renderer with Layout-specific typography */}
                      {layoutStyle === 'infographic' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch text-slate-900 font-sans leading-relaxed">
                          
                          {/* COL 1: LEFT COLUMN (LÝ THUYẾT & ĐỊNH NGHĨA) */}
                          <div className="lg:col-span-6 bg-white border-2 border-blue-900 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs">
                            <div>
                              {/* Deep blue header banner */}
                              <div className="bg-[#1e40af] text-white p-5 text-center border-b-2 border-blue-900">
                                <div className="flex items-center justify-center gap-2 mb-1.5">
                                  <BookOpen className="w-5 h-5 text-sky-300" />
                                  <span className="text-[11px] font-bold uppercase tracking-widest text-sky-200">PHIẾU HỌC TẬP: LÝ THUYẾT</span>
                                </div>
                                <h2 className="text-sm sm:text-base font-black uppercase text-white leading-tight">
                                  {customLessonName || "TÓM TẮT LÝ THUYẾT"}
                                </h2>
                                <p className="text-[10px] text-sky-100 font-semibold mt-0.5">Chương trình {subject} {selectedGrade} (KNTT)</p>
                              </div>

                              {/* Student info */}
                              <div className="p-3 bg-slate-50 border-b border-slate-100 text-[11px] sm:text-xs flex justify-between font-semibold text-slate-700">
                                <span>Họ và tên: ................................................................</span>
                                <span>Lớp: ........................</span>
                              </div>

                              {/* Left Content prose rendering */}
                              <div className="p-5 prose prose-blue prose-sm max-w-none [&_h2]:bg-blue-50/80 [&_h2]:text-blue-950 [&_h2]:p-3 [&_h2]:rounded-xl [&_h2]:border-l-4 [&_h2]:border-blue-600 [&_h2]:text-[12px] [&_h2]:font-black [&_h2]:mt-5 [&_h2]:mb-3 [&_blockquote]:bg-amber-50/80 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:p-3.5 [&_blockquote]:rounded-r-xl [&_blockquote]:text-amber-950 [&_blockquote]:text-[11px] [&_blockquote]:font-semibold [&_blockquote]:not-italic [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-300 leading-relaxed font-sans">
                                <MarkdownRenderer content={fixMath(splitContent(mainDocContent).left)} />
                              </div>
                            </div>

                            {/* Decorative light bulb callout card at the bottom */}
                            <div className="p-4 m-5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                              <div>
                                <p className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Góc ôn tập cốt lõi</p>
                                <p className="text-[11px] font-semibold text-amber-950 mt-0.5 leading-relaxed">
                                  Nắm chắc khái niệm và phân tích các ví dụ mẫu sẽ giúp thầy cô rèn luyện tư duy tự luận và tăng tốc độ làm trắc nghiệm của học sinh!
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* COL 2: RIGHT COLUMN (PHẦN BÀI TẬP THỰC HÀNH) */}
                          <div className="lg:col-span-6 bg-white border-2 border-blue-900 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs">
                            <div>
                              {/* Deep blue header banner */}
                              <div className="bg-[#1e40af] text-white p-5 text-center border-b-2 border-blue-900">
                                <div className="flex items-center justify-center gap-2 mb-1.5">
                                  <Edit3 className="w-5 h-5 text-sky-300" />
                                  <span className="text-[11px] font-bold uppercase tracking-widest text-sky-200">PHẦN BÀI TẬP THỰC HÀNH</span>
                                </div>
                                <h2 className="text-sm sm:text-base font-black uppercase text-white leading-tight">
                                  (Phần Dành Cho Học Sinh Luyện Tập)
                                </h2>
                                <p className="text-[10px] text-sky-100 font-semibold mt-0.5">Yêu cầu hoàn thành đầy đủ các phần bên dưới</p>
                              </div>

                              {/* Student info */}
                              <div className="p-3 bg-slate-50 border-b border-slate-100 text-[11px] sm:text-xs flex justify-between font-semibold text-slate-700">
                                <span>Họ và tên: ................................................................</span>
                                <span>Lớp: ........................</span>
                              </div>

                              {/* Right Content prose rendering */}
                              <div className="p-5 prose prose-indigo prose-sm max-w-none [&_h2]:bg-indigo-50/80 [&_h2]:text-indigo-950 [&_h2]:p-3 [&_h2]:rounded-xl [&_h2]:border-l-4 [&_h2]:border-indigo-600 [&_h2]:text-[12px] [&_h2]:font-black [&_h2]:mt-5 [&_h2]:mb-3 [&_blockquote]:bg-rose-50/80 [&_blockquote]:border-l-4 [&_blockquote]:border-rose-400 [&_blockquote]:p-3.5 [&_blockquote]:rounded-r-xl [&_blockquote]:text-rose-950 [&_blockquote]:text-[11px] [&_blockquote]:font-semibold [&_blockquote]:not-italic [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-300 leading-relaxed font-sans">
                                <MarkdownRenderer content={fixMath(splitContent(mainDocContent).right)} />
                              </div>
                            </div>

                            {/* Decorative footer ribbon */}
                            <div className="bg-[#1e40af] text-white p-4 text-center border-t-2 border-blue-900 mt-5 flex items-center justify-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-sky-100">
                                Học tốt Toán! • "Kiến thức hôm nay là hành trang cho tương lai!"
                              </span>
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className={cn(
                          "prose max-w-none",
                          layoutStyle === 'a4_print' && "prose-slate font-serif [&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif [&_table]:border-collapse [&_th]:border [&_th]:border-slate-800 [&_td]:border [&_td]:border-slate-800 leading-relaxed",
                          layoutStyle === 'poster' && "prose-blue [&_h2]:bg-gradient-to-r [&_h2]:from-slate-900 [&_h2]:to-indigo-900 [&_h2]:text-white [&_h2]:p-3.5 [&_h2]:rounded-xl [&_h2]:font-black [&_blockquote]:bg-blue-50/80 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-600 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl [&_blockquote]:shadow-2xs",
                          layoutStyle === 'mindmap' && "prose-emerald [&_h2]:bg-emerald-50 [&_h2]:text-emerald-950 [&_h2]:p-3.5 [&_h2]:rounded-xl [&_h2]:border-l-4 [&_h2]:border-emerald-600 [&_h2]:font-bold [&_blockquote]:bg-teal-50 [&_blockquote]:border-l-4 [&_blockquote]:border-teal-500 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl"
                        )}>
                          <ErrorBoundary>
                            <MarkdownRenderer content={fixMath(mainDocContent)} />
                          </ErrorBoundary>
                        </div>
                      )}

                        {/* Document Solution Section Accordion Toggle on Screen */}
                        {includeDetailedSolution && solutionDocContent && (
                          <div className="mt-8 pt-6 border-t border-slate-200">
                            <div className="no-print">
                              <button
                                type="button"
                                onClick={() => toggleSolution('doc-solution')}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>{isSolutionOpen('doc-solution') ? "🙈 Ẩn lời giải chi tiết" : "💡 Xem lời giải chi tiết"}</span>
                              </button>

                              {isSolutionOpen('doc-solution') && (
                                <div 
                                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', marginTop: '10px' }}
                                  className="text-slate-800 text-sm leading-relaxed not-prose"
                                >
                                  <div className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-base">
                                    <span>💡 Lời giải chi tiết & Hướng dẫn chấm:</span>
                                  </div>
                                  <div className="text-slate-800">
                                    <MarkdownRenderer content={fixMath(solutionDocContent)} />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Khi In hoặc Xuất Word (Bản dành cho Giáo viên) */}
                            <div 
                              className="only-print mt-6 pt-4 border-t border-slate-400 not-prose"
                              style={{ pageBreakBefore: 'always' }}
                            >
                              <div className="font-bold text-slate-900 mb-2 text-base">
                                <span>💡 Lời giải chi tiết & Hướng dẫn chấm:</span>
                              </div>
                              <MarkdownRenderer content={fixMath(solutionDocContent)} />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
              }

                return (
                  <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 bg-white/50 rounded-xl border border-dashed border-slate-300 p-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-400">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-bold text-slate-700">Phiếu học tập sẽ xuất hiện ở đây</p>
                    <p className="text-sm mt-1 text-slate-500 max-w-md text-center">
                      Chọn môn học, chủ đề và phong cách trình bày mong muốn (A4 Chuẩn in ấn hoặc Phiếu học tập dạng ảnh 2 cột) rồi nhấn "Tạo bản Word/In".
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {LAYOUT_STYLE_OPTIONS.map(s => (
                        <span key={s.id} className="text-xs bg-white px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 font-medium">
                          {s.shortTitle}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Teacher Exam Upload & Edit Modal */}
      <UploadTeacherExamModal
        isOpen={isUploadExamModalOpen}
        onClose={() => setIsUploadExamModalOpen(false)}
        defaultSubject={subject}
        defaultGrade={selectedGrade}
      />

      {/* Question Edit Modal with integrated BBT & Graph visualizer */}
      {editingQuestion && (
        <QuestionEditModal
          isOpen={true}
          question={editingQuestion.question}
          questionNumber={editingQuestion.index + 1}
          subject={subject}
          grade={String(selectedGrade)}
          onClose={() => setEditingQuestion(null)}
          onSave={(updated) => {
            setWorksheetQuestions(prev => {
              const next = [...prev];
              next[editingQuestion.index] = { ...next[editingQuestion.index], ...updated };
              return next;
            });
            setEditingQuestion(null);
            showToast("Đã lưu cập nhật câu hỏi!");
          }}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default Worksheets;


