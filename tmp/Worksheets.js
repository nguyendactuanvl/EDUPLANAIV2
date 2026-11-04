import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { apiFetch } from "../lib/apiFetch";
import { useSubjects } from "../lib/subjects";
import LZString from "lz-string";
import { exportHtmlToWord, exportElementToImage } from "../lib/exportUtils";
import { useState, useRef, useEffect } from "react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  BookOpen,
  Download,
  AlertCircle,
  Edit3,
  Eye,
  Printer,
  Share2,
  Copy,
  CheckCircle2,
  ExternalLink,
  Upload,
  FileText,
  Palette,
  GitFork,
  Sparkles,
  Zap,
  Image as ImageIcon,
  Sliders,
  Check,
  TrendingUp,
  BarChart2,
  Box,
  BarChart3,
  School,
  Wand2,
  Users,
  BarChart,
  Loader2,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  X,
  ShieldCheck,
  Key
} from "lucide-react";
import { StudentExamView } from "./StudentExamView";
import * as XLSX from "xlsx";
import {
  googleSignIn,
  googleSignOut,
  initAuth,
  createGoogleSheet,
  syncSubmissionsToSheet,
  getCachedToken
} from "../lib/googleAuth";
import { MathView } from "../components/MathView";
import { run1ClickMathFix } from "../components/math-tools/MathFormulaFixer";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { UploadTeacherExamModal } from "../components/UploadTeacherExamModal";
import { QuestionEditModal } from "../components/QuestionEditModal";
import { HeaderConfigModal } from "../components/HeaderConfigModal";
import { getHeaderConfig, saveHeaderConfig } from "../lib/headerConfig";
import { QuestionVisualizerPanel } from "../components/math-tools/QuestionVisualizerPanel";
import { WorksheetAiInspectorModal } from "../components/WorksheetAiInspectorModal";
import { analyzeFunctionToBbt, generateBbtSvg, convertBbtTableToSvg, autoEnrichTextWithVisuals } from "../lib/bbtRenderer";
import { embedTikzSvgsInText } from "../components/TikzRenderer";
import { saveToHistory, getHistory, deleteFromHistory } from "../lib/history";
import { cn, parseApiResponse, preProcessMathContent, fixMath, cleanQuestionStem, cleanOptionText, normalizeMathText, triggerGlobalMathRender, normalizeArithmeticProgressionFormulas, formatWorksheetQuestionsAndSections, sanitizeExamQuestion, sanitizeAndPolishMath, normalizeArrayAndTableEnvironments } from "../lib/utils";
import { parseRawExamText } from "../lib/examParser";
import { printElement, ensureMathRendered } from "../lib/print";
import { saveExamToCloud } from "../lib/cloudExamStore";
import { registerExamUrlMapping } from "../lib/smartRouter";
import { getKnttCurriculum } from "../data/knttCurriculum";
import { LanguageSpeechControls } from "../components/LanguageSpeechControls";
import { FeatureQuickGuideBanner } from "../components/FeatureQuickGuideBanner";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
export function getFormattedLessonTitle(rawName) {
  if (!rawName) return "CH\u1EE6 \u0110\u1EC0: C\u1EA4P S\u1ED0 C\u1ED8NG";
  const trimmed = rawName.trim();
  if (/cấp\s*số\s*cộng/i.test(trimmed)) {
    return "CH\u1EE6 \u0110\u1EC0: C\u1EA4P S\u1ED0 C\u1ED8NG";
  }
  const upper = trimmed.toUpperCase();
  if (upper.startsWith("CH\u1EE6 \u0110\u1EC0:") || upper.startsWith("CH\u1EE6 \u0110\u1EC0 ")) {
    return upper.replace(/^CHỦ\s*ĐỀ\s*[:\s]*/i, "CH\u1EE6 \u0110\u1EC0: ");
  }
  const matchLessonNum = trimmed.match(/^bài\s*\d+\s*[:\.]?\s*(.+)$/i);
  if (matchLessonNum) {
    return `CH\u1EE6 \u0110\u1EC0: ${matchLessonNum[1].trim().toUpperCase()}`;
  }
  if (/^bài\s*/i.test(upper)) {
    return upper;
  }
  return `CH\u1EE6 \u0110\u1EC0: ${upper}`;
}
export function cleanDocumentContent(content, lessonName) {
  if (!content) return "";
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^\s*#+\s*(?:PHIẾU\s*HỌC\s*TẬP[^\n]*|BÀI\s*\d*[^\n]*|CHỦ\s*ĐỀ[^\n]*)\n+/gi, "");
  cleaned = cleaned.replace(/^\s*\*\*+(?:PHIẾU\s*HỌC\s*TẬP[^\n]*|BÀI\s*\d*[^\n]*|CHỦ\s*ĐỀ[^\n]*)\*\*+\n+/gi, "");
  if (lessonName && !/lượng\s*giác/i.test(lessonName)) {
    cleaned = cleaned.replace(/^\s*(?:#+\s*|\*\*+)?(?:BÀI\s*\d*\s*:\s*)?Góc\s*lượng\s*giác[^\n]*(?:\*\*+)?\n+/gi, "");
    cleaned = cleaned.replace(/(?:^|\n)\s*#+\s*(?:BÀI\s*\d*\s*:\s*)?Góc\s*lượng\s*giác[^\n]*/gi, "");
  }
  cleaned = normalizeArithmeticProgressionFormulas(cleaned);
  cleaned = normalizeArrayAndTableEnvironments(cleaned);
  cleaned = formatWorksheetQuestionsAndSections(cleaned);
  cleaned = autoEnrichTextWithVisuals(cleaned);
  return cleaned.trim();
}
const LAYOUT_STYLE_OPTIONS = [
  {
    id: "a4_print",
    title: "A4 Chu\u1EA9n in \u1EA5n",
    shortTitle: "A4 In \u1EA5n",
    badge: "\u0110en tr\u1EAFng / Ti\u1EBFt ki\u1EC7m m\u1EF1c",
    desc: "B\u1ED1 c\u1EE5c truy\u1EC1n th\u1ED1ng, b\u1EA3ng th\xF4ng tin h\u1ECDc sinh, k\u1EBB khung s\u1EAFc n\xE9t, t\u1ED1i \u01B0u trang in gi\u1EA5y h\u1ECDc sinh.",
    icon: FileText,
    activeColor: "border-slate-800 ring-2 ring-slate-800/10 bg-slate-50/80 text-slate-900",
    badgeBg: "bg-slate-200 text-slate-800"
  },
  {
    id: "infographic",
    title: "Phi\u1EBFu h\u1ECDc t\u1EADp 2 c\u1ED9t (Phong c\xE1ch \u1EA3nh)",
    shortTitle: "Phi\u1EBFu 2 c\u1ED9t m\xE0u s\u1EAFc",
    badge: "B\u1ED1 c\u1EE5c 2 c\u1ED9t Tr\u1EF1c quan / M\xE0u s\u1EAFc sinh \u0111\u1ED9ng",
    desc: "B\u1ED1 c\u1EE5c 2 c\u1ED9t \u0111\u1EB7c bi\u1EC7t: L\xFD thuy\u1EBFt b\xEAn tr\xE1i, c\xE2u h\u1ECFi th\u1EF1c h\xE0nh b\xEAn ph\u1EA3i, trang tr\xED banner xanh \u0111\u1EADm gi\u1ED1ng \u1EA3nh m\u1EABu.",
    icon: Palette,
    activeColor: "border-blue-600 ring-2 ring-blue-600/15 bg-blue-50/70 text-blue-950",
    badgeBg: "bg-blue-100 text-blue-700"
  }
];
export function Worksheets() {
  const [selectedGrade, setSelectedGrade] = useState(11);
  const [customLessonName, setCustomLessonName] = useState("CH\u1EE6 \u0110\u1EC0: C\u1EA4P S\u1ED0 C\u1ED8NG");
  const [subject, setSubject] = useState("To\xE1n");
  const { subjects } = useSubjects();
  const [worksheetType, setWorksheetType] = useState("K\u1EBFt h\u1EE3p tr\u1EAFc nghi\u1EC7m v\xE0 t\u1EF1 lu\u1EADn");
  const [layoutStyle, setLayoutStyle] = useState("a4_print");
  const [selectedSemester, setSelectedSemester] = useState("semester_1");
  const [selectedChapterId, setSelectedChapterId] = useState("g11_s1_c2");
  const [selectedLessonId, setSelectedLessonId] = useState("g11_s1_c2_l2");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [numPartI, setNumPartI] = useState(12);
  const [numPartII, setNumPartII] = useState(4);
  const [numPartIII, setNumPartIII] = useState(6);
  const [numPartIV, setNumPartIV] = useState(2);
  const [realWorldPercent, setRealWorldPercent] = useState(40);
  const [hasParametric, setHasParametric] = useState(true);
  const [numMC, setNumMC] = useState("auto");
  const [numEssay, setNumEssay] = useState("auto");
  const [includeRealWorld, setIncludeRealWorld] = useState(true);
  const [answerMode, setAnswerMode] = useState("full");
  useEffect(() => {
    const semData = getKnttCurriculum(subject, selectedGrade, selectedSemester);
    if (semData && semData.chapters.length > 0) {
      let chapId = selectedChapterId;
      let chapter = semData.chapters.find((c) => c.id === chapId);
      if (!chapter) {
        chapter = semData.chapters[0];
        setSelectedChapterId(chapter.id);
        chapId = chapter.id;
      }
      let lesId = selectedLessonId;
      let lesson = chapter.lessons.find((l) => l.id === lesId);
      if (!lesson) {
        lesson = chapter.lessons[0];
        setSelectedLessonId(lesson.id);
        lesId = lesson.id;
      }
      if (lesson) {
        if (/cấp\s*số\s*cộng/i.test(lesson.name)) {
          setCustomLessonName("CH\u1EE6 \u0110\u1EC0: C\u1EA4P S\u1ED0 C\u1ED8NG");
        } else {
          setCustomLessonName(lesson.name);
        }
      }
    }
  }, [subject, selectedGrade, selectedSemester, selectedChapterId, selectedLessonId]);
  const [suggestion, setSuggestion] = useState("");
  const [showInspectorModal, setShowInspectorModal] = useState(false);
  const [streamProgress, setStreamProgress] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [includeDetailedSolution, setIncludeDetailedSolution] = useState(true);
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const [openSolutions, setOpenSolutions] = useState({});
  const [worksheetQuestions, setWorksheetQuestions] = useState([]);
  const [viewMode, setViewMode] = useState("document");
  const [resultsViewTab, setResultsViewTab] = useState("table");
  const [integrationSolutionTab, setIntegrationSolutionTab] = useState("quick");
  const [quickCodeInput, setQuickCodeInput] = useState("");
  const [manualSheetUrlInput, setManualSheetUrlInput] = useState("");
  const [activeVisualizer, setActiveVisualizer] = useState(null);
  const [isDocVisualizerOpen, setIsDocVisualizerOpen] = useState(false);
  const [docVisualizerTab, setDocVisualizerTab] = useState("bbt");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isAutoGeneratingImages, setIsAutoGeneratingImages] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [headerConfig, setHeaderConfig] = useState(() => getHeaderConfig());
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const handleSaveHeaderConfig = (newCfg) => {
    setHeaderConfig(newCfg);
    saveHeaderConfig(newCfg);
    showToast("\u0110\xE3 l\u01B0u th\xF4ng tin ti\xEAu \u0111\u1EC1 tr\u01B0\u1EDDng & gi\xE1o vi\xEAn!");
  };
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };
  const isMissingBbt = (content) => {
    if (!content) return false;
    const mentionsBbt = /(bảng\s*biến\s*thiên|BBT|bbt|dấu\s*của\s*f'\(x\)|chiều\s*biến\s*thiên|khảo\s*sát\s*sự\s*biến\s*thiên)/i.test(content);
    const hasTable = /\|[^\n]+\|[^\n]+\|/.test(content);
    const hasImgOrSvg = /<(?:img|svg|svg-wrapper)/i.test(content) || /!\[.*?\]\(.*?\)/.test(content);
    return mentionsBbt && !hasTable && !hasImgOrSvg;
  };
  const isMissingGraph = (content) => {
    if (!content) return false;
    const mentionsGraph = /(đồ\s*thị|hình\s*bên|hình\s*vẽ|như\s*hình)/i.test(content);
    const hasImgOrSvg = /<(?:img|svg|svg-wrapper)/i.test(content) || /!\[.*?\]\(.*?\)/.test(content);
    return mentionsGraph && !hasImgOrSvg;
  };
  const handleInsertVisualizerSnippet = (qIndex, target, snippet) => {
    setWorksheetQuestions((prev) => {
      const next = [...prev];
      if (!next[qIndex]) return prev;
      const item = { ...next[qIndex] };
      if (target === "content") {
        const cur = item.content || item.question || "";
        const optRegex = /(\n\s*(?:\*{0,2}|[-*]\s*)?(?:[Aa][\.\:\)]|[Aa]\)))/i;
        if (optRegex.test(cur)) {
          item.content = cur.replace(optRegex, `

${snippet}

$1`);
        } else {
          item.content = cur ? `${cur}

${snippet}` : snippet;
        }
        item.question = item.content;
      } else {
        const cur = item.solution || item.explanation || "";
        item.solution = cur ? `${cur}

${snippet}` : snippet;
        item.explanation = item.solution;
      }
      next[qIndex] = item;
      return next;
    });
    setSuggestion((prev) => {
      if (!prev) return prev;
      const qNum = qIndex + 1;
      const solutionBoxIndex = prev.search(/(?:<details\s*class=["']solution-box["']|---\s*HƯỚNG\s*DẪN\s*CHẤM|---\s*BẢNG\s*ĐÁP\s*ÁN|##\s*Hướng\s*dẫn\s*giải|##\s*Lời\s*giải\s*chi\s*tiết)/i);
      let qBody = solutionBoxIndex !== -1 ? prev.substring(0, solutionBoxIndex) : prev;
      const qSol = solutionBoxIndex !== -1 ? prev.substring(solutionBoxIndex) : "";
      const qRegex = new RegExp(`((?:\\*\\*)?(?:C\xE2u|B\xE0i)\\s*${qNum}[:\\.][\\s\\S]*?)(?=(?:\\*\\*)?(?:C\xE2u|B\xE0i)\\s*${qNum + 1}[:\\.]|---|#|$)`, "i");
      if (qRegex.test(qBody)) {
        qBody = qBody.replace(qRegex, (match) => {
          const optRegex = /(\n\s*(?:\*{0,2}|[-*]\s*)?(?:[Aa][\.\:\)]|[Aa]\)))/i;
          if (optRegex.test(match)) {
            return match.replace(optRegex, `

${snippet}

$1`);
          }
          return `${match.trimEnd()}

${snippet}

`;
        });
        return qBody + qSol;
      }
      return `${prev.trimEnd()}

${snippet}

`;
    });
    showToast(`\u0110\xE3 ch\xE8n ${snippet.includes("<svg-wrapper") ? "BBT (\u1EA3nh SVG)" : "\u0110\u1ED3 th\u1ECB (\u1EA3nh PNG)"} v\xE0o ${target === "content" ? "c\xE2u h\u1ECFi" : "l\u1EDDi gi\u1EA3i"}!`);
  };
  const handleInsertDocVisualizerSnippet = (target, snippet) => {
    setSuggestion((prev) => `${prev.trimEnd()}

${snippet}

`);
    setIsDocVisualizerOpen(false);
    showToast(`\u0110\xE3 ch\xE8n ${snippet.includes("<svg-wrapper") ? "BBT (\u1EA3nh SVG)" : "\u0110\u1ED3 th\u1ECB (\u1EA3nh PNG)"} v\xE0o phi\u1EBFu h\u1ECDc t\u1EADp!`);
  };
  const handleAiFixBbtForWorksheetQuestion = async (q, idx) => {
    try {
      const content = q.content || q.question || "";
      const formulaMatch = content.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);
      if (formulaMatch) {
        const formula = formulaMatch[1].trim();
        const bbtData = analyzeFunctionToBbt(formula);
        if (bbtData) {
          const svg = generateBbtSvg(bbtData);
          if (svg) {
            const base642 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(svg)) : "";
            if (base642) {
              const snippet2 = `

<svg-wrapper data-svg="${base642}"></svg-wrapper>

`;
              handleInsertVisualizerSnippet(idx, "content", snippet2);
              showToast("\u2728 \u0110\xE3 t\u1EF1 \u0111\u1ED9ng t\u1EA1o \u1EA3nh BBT (SVG chu\u1EA9n SGK) th\xE0nh c\xF4ng!");
              return;
            }
          }
        }
      }
      const res = await apiFetch("/api/fix-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, mode: "fix_bbt", subject, grade: selectedGrade })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.question) {
          let newContent = data.question.content || "";
          const tableMatch = newContent.match(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/m);
          if (tableMatch) {
            const svg = convertBbtTableToSvg(tableMatch[1]);
            if (svg) {
              const base642 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(svg)) : "";
              if (base642) {
                newContent = newContent.replace(tableMatch[1], `

<svg-wrapper data-svg="${base642}"></svg-wrapper>

`);
              }
            }
          }
          const updatedQ = { ...data.question, content: newContent };
          setWorksheetQuestions((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...updatedQ };
            return next;
          });
          showToast("\u2728 AI \u0111\xE3 v\u1EBD B\u1EA3ng bi\u1EBFn thi\xEAn (d\u1EA1ng \u1EA3nh SVG chu\u1EA9n SGK) ho\xE0n ch\u1EC9nh!");
          return;
        }
      }
    } catch (e) {
      console.warn("L\u1ED7i v\u1EBD BBT:", e);
    }
    const fallbackBbtTable = `| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |
|---|---|---|---|---|---|---|---|
| $y'$ | | $+$ | $0$ | $-$ | $0$ | $+$ |
| $y$ | $-\\infty$ | $\\nearrow$ | $3$ | $\\searrow$ | $-1$ | $\\nearrow$ | $+\\infty$ |`;
    const fallbackSvg = convertBbtTableToSvg(fallbackBbtTable);
    const base64 = fallbackSvg && typeof btoa !== "undefined" ? btoa(encodeURIComponent(fallbackSvg)) : "";
    const snippet = base64 ? `

<svg-wrapper data-svg="${base64}"></svg-wrapper>

` : `

${fallbackBbtTable}

`;
    handleInsertVisualizerSnippet(idx, "content", snippet);
    showToast("\u0110\xE3 th\xEAm BBT d\u1EA1ng \u1EA3nh SVG v\xE0o c\xE2u h\u1ECFi!");
  };
  const handleAutoGenerateGraphForWorksheetQuestion = (q, idx) => {
    const content = q.content || q.question || "";
    const formulaMatch = content.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);
    if (formulaMatch) {
      const formula = formulaMatch[1].trim();
      const bbtData = analyzeFunctionToBbt(formula);
      if (bbtData && bbtData.points && bbtData.points.length > 0) {
        setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" });
        showToast(`\u0110\xE3 nh\u1EADn di\u1EC7n h\xE0m s\u1ED1 ${formula}, s\u1EB5n s\xE0ng xu\u1EA5t \u1EA3nh \u0111\u1ED3 th\u1ECB!`);
        return;
      }
    }
    setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" });
  };
  const handleAutoGenerateAllBbtAndGraphs = async () => {
    setIsAutoGeneratingImages(true);
    let count = 0;
    try {
      const updatedQuestions = [...worksheetQuestions];
      for (let i = 0; i < updatedQuestions.length; i++) {
        const q = updatedQuestions[i];
        let content = q.content || q.question || "";
        let solution = q.solution || q.explanation || "";
        const enrichedContent = autoEnrichTextWithVisuals(content, false);
        const enrichedSolution = autoEnrichTextWithVisuals(solution, true);
        if (enrichedContent !== content || enrichedSolution !== solution) {
          count++;
          updatedQuestions[i] = {
            ...q,
            content: enrichedContent,
            solution: enrichedSolution,
            explanation: enrichedSolution
          };
        }
      }
      setWorksheetQuestions(updatedQuestions);
      if (suggestion) {
        const newSuggestion = autoEnrichTextWithVisuals(suggestion);
        if (newSuggestion !== suggestion) {
          count++;
          setSuggestion(newSuggestion);
        }
      }
      showToast(`\u{1F389} \u0110\xE3 t\u1EF1 \u0111\u1ED9ng t\u1EA1o v\xE0 xu\u1EA5t \u1EA3nh vector cho ${count > 0 ? `${count} ph\u1EA7n (BBT/\u0110\u1ED3 th\u1ECB)` : "t\u1EA5t c\u1EA3 ph\u1EA7n trong phi\u1EBFu b\xE0i t\u1EADp"}!`);
    } catch (err) {
      console.warn("L\u1ED7i auto generate:", err);
      showToast("\u0110\xE3 ho\xE0n t\u1EA5t ki\u1EC3m tra BBT v\xE0 \u0110\u1ED3 th\u1ECB.");
    } finally {
      setIsAutoGeneratingImages(false);
    }
  };
  const toggleSolution = (id) => {
    setOpenSolutions((prev) => ({
      ...prev,
      [id]: !(prev[id] !== void 0 ? prev[id] : showAllSolutions)
    }));
  };
  const toggleAllSolutions = () => {
    const nextState = !showAllSolutions;
    setShowAllSolutions(nextState);
    const updated = { "doc-solution": nextState };
    if (worksheetQuestions && worksheetQuestions.length > 0) {
      worksheetQuestions.forEach((q, idx) => {
        updated[q.id || idx + 1] = nextState;
      });
    }
    setOpenSolutions(updated);
  };
  const isSolutionOpen = (id) => {
    return openSolutions[id] !== void 0 ? openSolutions[id] : showAllSolutions;
  };
  useEffect(() => {
    setHistoryItems(getHistory().filter((item) => item.type === "PHT"));
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isGeneratingInteractive, setIsGeneratingInteractive] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [isUploadExamModalOpen, setIsUploadExamModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [examsHistory, setExamsHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("eduplan_worksheet_exams_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedRoomForResults, setSelectedRoomForResults] = useState(null);
  const [selectedRoomResultsData, setSelectedRoomResultsData] = useState(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [previewRoomCode, setPreviewRoomCode] = useState(null);
  useEffect(() => {
    const unsubscribe = initAuth((user, token) => {
      setGoogleUser(user);
      setGoogleToken(token || null);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        alert(`\u0110\u0103ng nh\u1EADp Google th\xE0nh c\xF4ng: ${res.user.displayName}`);
      }
    } catch (err) {
      alert("L\u1ED7i \u0111\u0103ng nh\u1EADp Google: " + err.message);
    }
  };
  const handleGoogleLogout = async () => {
    if (confirm("B\u1EA1n c\xF3 ch\u1EAFc ch\u1EAFn mu\u1ED1n \u0111\u0103ng xu\u1EA5t t\xE0i kho\u1EA3n Google kh\xF4ng?")) {
      await googleSignOut();
      setGoogleUser(null);
      setGoogleToken(null);
    }
  };
  const isValidGoogleSheetUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    if (!url.includes("docs.google.com/spreadsheets/d/")) return false;
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match || !match[1]) return false;
    return match[1].length >= 15;
  };
  const handleCreateAndLinkSheet = async () => {
    if (!selectedRoomResultsData) return;
    const code = selectedRoomForResults;
    if (!code) return;
    setIsSyncingSheet(true);
    try {
      let token = getCachedToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (authRes) {
          setGoogleUser(authRes.user);
          setGoogleToken(authRes.accessToken);
          token = authRes.accessToken;
        }
      }
      if (!token) {
        throw new Error("Ch\u01B0a x\xE1c th\u1EF1c t\xE0i kho\u1EA3n Google. Vui l\xF2ng nh\u1EA5n \u0111\u0103ng nh\u1EADp Google.");
      }
      const sheet = await createGoogleSheet(selectedRoomResultsData.examTitle || code);
      const updatedData = {
        ...selectedRoomResultsData,
        linkedSheetId: sheet.id,
        linkedSheetUrl: sheet.url
      };
      const saveRes = await fetch("/api/exams/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updatedData, customId: code })
      });
      if (!saveRes.ok) {
        throw new Error("Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt li\xEAn k\u1EBFt t\u1EC7p Trang t\xEDnh l\xEAn m\xE1y ch\u1EE7.");
      }
      const subs = updatedData.submissions || [];
      if (subs.length > 0) {
        await syncSubmissionsToSheet(sheet.id, updatedData.examTitle || code, subs).catch(() => {
        });
      }
      setSelectedRoomResultsData(updatedData);
      const updatedHistory = examsHistory.map((h) => {
        if (h.code === code) {
          return { ...h, linkedSheetId: sheet.id, linkedSheetUrl: sheet.url };
        }
        return h;
      });
      setExamsHistory(updatedHistory);
      localStorage.setItem("eduplan_worksheet_exams_history", JSON.stringify(updatedHistory));
      window.open(sheet.url, "_blank");
    } catch (err) {
      if (err?.message) {
        alert("L\u1ED7i t\u1EA1o/li\xEAn k\u1EBFt Trang t\xEDnh: " + err.message);
      }
    } finally {
      setIsSyncingSheet(false);
    }
  };
  const handleSyncExistingSheet = async () => {
    if (!selectedRoomResultsData) return;
    const code = selectedRoomForResults;
    if (!code) return;
    const sheetId = selectedRoomResultsData.linkedSheetId;
    if (!sheetId) return;
    setIsSyncingSheet(true);
    try {
      const subs = selectedRoomResultsData.submissions || [];
      await syncSubmissionsToSheet(sheetId, selectedRoomResultsData.examTitle || code, subs);
      alert("\u26A1 \u0110\xE3 \u0111\u1ED3ng b\u1ED9 h\xF3a d\u1EEF li\u1EC7u b\u1EA3ng \u0111i\u1EC3m m\u1EDBi nh\u1EA5t l\xEAn Google Sheets th\xE0nh c\xF4ng!");
    } catch (err) {
      alert("L\u1ED7i \u0111\u1ED3ng b\u1ED9 Trang t\xEDnh: " + err.message);
    } finally {
      setIsSyncingSheet(false);
    }
  };
  const handleSaveCustomSheetUrl = async (urlToSave) => {
    const targetUrl = (urlToSave || manualSheetUrlInput || "").trim();
    if (!targetUrl) {
      alert("Vui l\xF2ng nh\u1EADp \u0111\u01B0\u1EDDng link Google Sheet (v\xED d\u1EE5: https://docs.google.com/spreadsheets/d/.../edit).");
      return;
    }
    if (!isValidGoogleSheetUrl(targetUrl)) {
      alert("\u0110\u01B0\u1EDDng link Google Sheet kh\xF4ng h\u1EE3p l\u1EC7. Link ph\u1EA3i c\xF3 d\u1EA1ng: https://docs.google.com/spreadsheets/d/.../edit");
      return;
    }
    const match = targetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const sheetId = match ? match[1] : "";
    const code = selectedRoomForResults;
    if (!code) return;
    const updatedData = {
      ...selectedRoomResultsData || {},
      linkedSheetId: sheetId,
      linkedSheetUrl: targetUrl
    };
    try {
      await fetch("/api/exams/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updatedData, customId: code })
      }).catch(() => {
      });
      setSelectedRoomResultsData(updatedData);
      const updatedHistory = examsHistory.map((h) => {
        if (h.code === code) {
          return { ...h, linkedSheetId: sheetId, linkedSheetUrl: targetUrl };
        }
        return h;
      });
      setExamsHistory(updatedHistory);
      localStorage.setItem("eduplan_worksheet_exams_history", JSON.stringify(updatedHistory));
      showToast(`\u2705 \u0110\xE3 li\xEAn k\u1EBFt Google Sheet th\xE0nh c\xF4ng v\u1EDBi ph\xF2ng thi ${code}!`);
    } catch (e) {
      alert("L\u1ED7i khi l\u01B0u li\xEAn k\u1EBFt: " + e.message);
    }
  };
  const handleUnlinkSheet = async () => {
    const code = selectedRoomForResults;
    if (!code) return;
    const updatedData = {
      ...selectedRoomResultsData || {},
      linkedSheetId: null,
      linkedSheetUrl: null
    };
    try {
      await fetch("/api/exams/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updatedData, customId: code })
      }).catch(() => {
      });
      setSelectedRoomResultsData(updatedData);
      const updatedHistory = examsHistory.map((h) => {
        if (h.code === code) {
          return { ...h, linkedSheetId: null, linkedSheetUrl: null };
        }
        return h;
      });
      setExamsHistory(updatedHistory);
      localStorage.setItem("eduplan_worksheet_exams_history", JSON.stringify(updatedHistory));
      setManualSheetUrlInput("");
      showToast(`\u0110\xE3 h\u1EE7y li\xEAn k\u1EBFt Google Sheet cho ph\xF2ng ${code}`);
    } catch (e) {
      alert("L\u1ED7i: " + e.message);
    }
  };
  const handleOneClickQuickConnectSheet = async () => {
    if (!selectedRoomForResults) return;
    const existingUrl = selectedRoomResultsData?.linkedSheetUrl;
    if (isValidGoogleSheetUrl(existingUrl)) {
      window.open(existingUrl, "_blank");
      return;
    }
    setIsSyncingSheet(true);
    try {
      const code = selectedRoomForResults;
      const title = selectedRoomResultsData?.examTitle || `Ph\xF2ng thi ${code}`;
      let token = getCachedToken();
      if (!token) {
        try {
          const authRes = await googleSignIn();
          if (authRes) {
            setGoogleUser(authRes.user);
            setGoogleToken(authRes.accessToken);
            token = authRes.accessToken;
          }
        } catch (authErr) {
          console.warn("Google auth bypassed or not available in this environment:", authErr);
        }
      }
      if (token) {
        const sheet = await createGoogleSheet(title);
        const subs2 = selectedRoomResultsData?.submissions || [];
        if (subs2.length > 0) {
          await syncSubmissionsToSheet(sheet.id, title, subs2).catch(() => {
          });
        }
        const updatedData = {
          ...selectedRoomResultsData || {},
          linkedSheetId: sheet.id,
          linkedSheetUrl: sheet.url
        };
        await fetch("/api/exams/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...updatedData, customId: code })
        }).catch(() => {
        });
        setSelectedRoomResultsData(updatedData);
        const updatedHistory = examsHistory.map((h) => {
          if (h.code === code) {
            return { ...h, linkedSheetId: sheet.id, linkedSheetUrl: sheet.url };
          }
          return h;
        });
        setExamsHistory(updatedHistory);
        localStorage.setItem("eduplan_worksheet_exams_history", JSON.stringify(updatedHistory));
        setManualSheetUrlInput(sheet.url);
        window.open(sheet.url, "_blank");
        showToast("\u2705 \u0110\xE3 t\u1EA1o Google Sheet v\xE0 \u0111\u1ED3ng b\u1ED9 d\u1EEF li\u1EC7u \u0111i\u1EC3m s\u1ED1 th\xE0nh c\xF4ng!");
        return;
      }
      const subs = selectedRoomResultsData?.submissions || [];
      const tsvHeaders = ["STT", "H\u1ECD v\xE0 t\xEAn h\u1ECDc sinh", "L\u1EDBp", "T\u1ED5ng \u0111i\u1EC3m (10)", "Th\u1EDDi gian n\u1ED9p"].join("	");
      const tsvRows = subs.map((s, idx) => [
        idx + 1,
        s.studentName || "H\u1ECDc sinh",
        s.studentClass || "N/A",
        s.totalScore ?? 0,
        new Date(s.submittedAt || Date.now()).toLocaleString("vi-VN")
      ].join("	")).join("\n");
      const tsvContent = `${tsvHeaders}
${tsvRows}`;
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsvContent).catch(() => {
        });
      }
      handleExportResultsToExcel();
      window.open("https://sheets.new", "_blank");
      showToast(`\u26A1 \u0110\xE3 m\u1EDF Google Sheets & sao ch\xE9p b\u1EA3ng \u0111i\u1EC3m ph\xF2ng ${code}! D\xE1n (Ctrl+V) v\xE0o \xF4 A1 \u0111\u1EC3 xem.`);
    } catch (e) {
      if (e?.message) {
        showToast("Th\xF4ng b\xE1o: " + e.message);
      }
    } finally {
      setIsSyncingSheet(false);
    }
  };
  const handleLoadRoomResults = async (code) => {
    const cleanCode = code.trim().toUpperCase();
    setSelectedRoomForResults(cleanCode);
    setIsLoadingResults(true);
    try {
      let data = null;
      try {
        const res = await fetch(`/api/exams/${cleanCode}?fresh=true`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
      }
      if (!data) {
        data = await fetchExamFromCloud(cleanCode);
      }
      if (data) {
        setSelectedRoomResultsData(data);
        if (data.linkedSheetUrl) {
          setManualSheetUrlInput(data.linkedSheetUrl);
        } else {
          setManualSheetUrlInput("");
        }
      } else {
        throw new Error("Kh\xF4ng th\u1EC3 t\u1EA3i k\u1EBFt qu\u1EA3 t\u1EEB m\xE1y ch\u1EE7.");
      }
    } catch (err) {
      alert("L\u1ED7i t\u1EA3i k\u1EBFt qu\u1EA3 ph\xF2ng thi: " + err.message);
    } finally {
      setIsLoadingResults(false);
    }
  };
  const handleExportResultsToExcel = () => {
    if (!selectedRoomResultsData || !selectedRoomResultsData.submissions) return;
    const excelRows = selectedRoomResultsData.submissions.map((sub, idx) => ({
      "STT": idx + 1,
      "H\u1ECD v\xE0 t\xEAn": sub.studentName,
      "L\u1EDBp": sub.studentClass,
      "\u0110i\u1EC3m s\u1ED1": sub.totalScore,
      "Th\u1EDDi gian n\u1ED9p": new Date(sub.submittedAt || Date.now()).toLocaleString("vi-VN")
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "K\u1EBFt qu\u1EA3 ph\xF2ng thi");
    XLSX.writeFile(workbook, `BangDiem_${selectedRoomForResults}.xlsx`);
  };
  const handleDeleteRoomFromHistory = async (code) => {
    let confirmed = true;
    try {
      if (typeof window !== "undefined" && window.confirm) {
        confirmed = window.confirm(`B\u1EA1n c\xF3 ch\u1EAFc mu\u1ED1n x\xF3a ph\xF2ng thi / phi\u1EBFu online ${code} kh\u1ECFi l\u1ECBch s\u1EED?`);
      }
    } catch (e) {
      confirmed = true;
    }
    if (confirmed) {
      setExamsHistory((prev) => {
        const updated = prev.filter((r) => r.code !== code);
        try {
          localStorage.setItem("eduplan_worksheet_exams_history", JSON.stringify(updated));
          localStorage.removeItem(`examCache_${code}`);
        } catch (e) {
          console.warn("Could not update localStorage on room delete:", e);
        }
        return updated;
      });
      try {
        const teacherSaved = localStorage.getItem("eduplan_teacher_exams_history");
        if (teacherSaved) {
          const parsed = JSON.parse(teacherSaved);
          if (Array.isArray(parsed)) {
            const updatedTeacher = parsed.filter((r) => r.code !== code && r.id !== code);
            localStorage.setItem("eduplan_teacher_exams_history", JSON.stringify(updatedTeacher));
          }
        }
      } catch (e) {
        console.warn("Could not clean teacher history:", e);
      }
      if (selectedRoomForResults === code) {
        setSelectedRoomForResults(null);
        setSelectedRoomResultsData(null);
      }
      try {
        await fetch(`/api/exams/${code}`, { method: "DELETE" });
      } catch (err) {
        console.warn("L\u1ED7i g\u1EEDi y\xEAu c\u1EA7u x\xF3a t\u1EDBi m\xE1y ch\u1EE7:", err);
      }
      showToast(`\u0110\xE3 x\xF3a phi\u1EBFu online ${code} th\xE0nh c\xF4ng!`);
    }
  };
  const handleRefreshExamUrl = async (roomCode) => {
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return;
    try {
      let examData = null;
      try {
        const res = await fetch(`/api/exams/${cleanCode}?fresh=true`);
        if (res.ok) {
          examData = await res.json();
        }
      } catch (e) {
      }
      if (!examData) {
        examData = await fetchExamFromCloud(cleanCode);
      }
      if (!examData) {
        throw new Error(`Kh\xF4ng t\xECm th\u1EA5y d\u1EEF li\u1EC7u phi\u1EBFu b\xE0i t\u1EADp / \u0111\u1EC1 thi cho m\xE3 "${cleanCode}".`);
      }
      const refreshedPayload = {
        ...examData,
        id: cleanCode,
        customId: cleanCode,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await saveExamToCloud(cleanCode, refreshedPayload);
      registerExamUrlMapping(cleanCode, cleanCode);
      registerExamUrlMapping(`/exam/${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/p/${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/thi/${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/worksheet/${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/?pin=${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/#/exam/${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/?view=worksheet&data=${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/?data=${cleanCode}`, cleanCode);
      const newShareUrl = `${window.location.origin}/?pin=${cleanCode}`;
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(newShareUrl);
      }
      showToast(`\u{1F389} \u0110\xE3 l\xE0m m\u1EDBi & t\xE1i \xE1nh x\u1EA1 URL k\u1EF3 thi ${cleanCode} th\xE0nh c\xF4ng! Link \u0111\xE3 \u0111\u01B0\u1EE3c sao ch\xE9p.`);
    } catch (err) {
      alert("L\u1ED7i khi l\xE0m m\u1EDBi URL k\u1EF3 thi: " + err.message);
    }
  };
  const handleDeleteSubmission = async (subIndex) => {
    if (!selectedRoomResultsData) return;
    const code = selectedRoomForResults;
    if (!code) return;
    const student = selectedRoomResultsData.submissions?.[subIndex];
    if (!student) return;
    if (!confirm(`B\u1EA1n c\xF3 ch\u1EAFc ch\u1EAFn mu\u1ED1n x\xF3a b\xE0i l\xE0m c\u1EE7a h\u1ECDc sinh ${student.studentName} (L\u1EDBp ${student.studentClass})?`)) {
      return;
    }
    const updatedSubmissions = selectedRoomResultsData.submissions.filter((_, i) => i !== subIndex);
    const updatedData = {
      ...selectedRoomResultsData,
      submissions: updatedSubmissions
    };
    try {
      const saveRes = await fetch("/api/exams/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updatedData, customId: code })
      });
      if (!saveRes.ok) {
        throw new Error("Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt danh s\xE1ch b\xE0i l\xE0m l\xEAn m\xE1y ch\u1EE7.");
      }
      setSelectedRoomResultsData(updatedData);
      showToast("\u0110\xE3 x\xF3a k\u1EBFt qu\u1EA3 b\xE0i l\xE0m c\u1EE7a h\u1ECDc sinh!");
    } catch (err) {
      alert("L\u1ED7i khi x\xF3a b\xE0i l\xE0m: " + err.message);
    }
  };
  const exportRef = useRef(null);
  const worksheetTypes = [
    "\u0110\u1EC1 3 ph\u1EA7n (12 c\xE2u TN nhi\u1EC1u l\u1EF1a ch\u1ECDn; 4 c\xE2u \u0110/S; 6 c\xE2u TL ng\u1EAFn)",
    "\u0110\u1EC1 4 ph\u1EA7n (12 c\xE2u TN; 2 c\xE2u \u0110/S; 4 c\xE2u TL ng\u1EAFn; 3 c\xE2u T\u1EF1 lu\u1EADn)",
    "K\u1EBFt h\u1EE3p tr\u1EAFc nghi\u1EC7m v\xE0 t\u1EF1 lu\u1EADn",
    "Ch\u1EC9 tr\u1EAFc nghi\u1EC7m kh\xE1ch quan",
    "Ch\u1EC9 t\u1EF1 lu\u1EADn",
    "B\xE0i t\u1EADp th\u1EF1c h\xE0nh / D\u1EF1 \xE1n nh\u1ECF"
  ];
  const handleGenerateInteractive = async () => {
    if (!customLessonName) {
      setError("Vui l\xF2ng nh\u1EADp t\xEAn b\xE0i h\u1ECDc / ch\u1EE7 \u0111\u1EC1.");
      return;
    }
    setIsGeneratingInteractive(true);
    setError(null);
    setShareLink("");
    try {
      const response = await apiFetch("/api/generate-interactive-worksheet", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
          // Dùng text/plain để tránh bị lỗi CORS preflight với Apps Script
        },
        body: JSON.stringify({
          lesson: customLessonName,
          subject,
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
        redirect: "follow"
        // Bắt buộc để theo dõi chuyển hướng 302 từ Google Script sang Googleusercontent
      });
      if (!response.ok) {
        throw new Error("L\u1ED7i khi t\u1EA1o phi\u1EBFu b\xE0i t\u1EADp t\u01B0\u01A1ng t\xE1c.");
      }
      const rawText = await response.text();
      if (rawText.trim().startsWith("<") || rawText.includes("<!DOCTYPE html>")) {
        console.error("Server tr\u1EA3 v\u1EC1 trang HTML thay v\xEC JSON:", rawText);
        throw new Error("D\u1ECBch v\u1EE5 t\u1EA1o \u0111\u1EC1 t\u1EA1m th\u1EDDi gi\xE1n \u0111o\u1EA1n ho\u1EB7c API Key ch\u01B0a \u0111\u01B0\u1EE3c n\u1EA1p \u0111\xFAng. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i c\u1EA5u h\xECnh API.");
      }
      let examData;
      try {
        examData = JSON.parse(rawText);
      } catch (e) {
        console.error("L\u1ED7i parse JSON:", rawText);
        try {
          examData = parseApiResponse(rawText);
        } catch (e2) {
          throw new Error("Ph\u1EA3n h\u1ED3i t\u1EEB m\xE1y ch\u1EE7 kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng d\u1EEF li\u1EC7u.");
        }
      }
      const sanitizedInteractiveQuestions = (examData.questions || []).map((q, idx) => {
        const sol = (q.solution || q.explanation || "").trim();
        return {
          ...q,
          id: idx + 1,
          number: idx + 1,
          content: sanitizeExamQuestion(q.content || q.question || ""),
          question: sanitizeExamQuestion(q.question || q.content || ""),
          options: Array.isArray(q.options) ? q.options.map((opt) => cleanOptionText(opt)) : q.options,
          tfStatements: Array.isArray(q.tfStatements) ? q.tfStatements.map((tf) => ({
            ...tf,
            statement: sanitizeExamQuestion(tf.statement || "")
          })) : q.tfStatements,
          correctAnswer: q.correctAnswer ? sanitizeAndPolishMath(q.correctAnswer) : void 0,
          solution: sanitizeAndPolishMath(sol),
          explanation: sanitizeAndPolishMath(sol)
        };
      });
      const payload = {
        examData: {
          examName: examData.examName || `Phi\u1EBFu b\xE0i t\u1EADp: ${customLessonName}`,
          subject,
          grade: selectedGrade
        },
        codes: [
          {
            code: "PHT_01",
            questions: sanitizedInteractiveQuestions
          }
        ]
      };
      const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
      let fallbackCode = "";
      for (let i = 0; i < 6; i++) {
        fallbackCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      let examId = fallbackCode;
      try {
        const shareRes = await apiFetch("/api/exams/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, customId: fallbackCode }),
          redirect: "follow"
        });
        if (shareRes.ok) {
          const shareRaw = await shareRes.text();
          if (!shareRaw.trim().startsWith("<") && !shareRaw.includes("<!DOCTYPE html>")) {
            try {
              const shareJson = JSON.parse(shareRaw);
              if (shareJson.examId) {
                examId = shareJson.examId;
              }
            } catch (e) {
            }
          }
        }
      } catch (e) {
        console.warn("Share to api failed:", e);
      }
      try {
        await saveExamToCloud(examId, payload);
        registerExamUrlMapping(`/exam/${examId}`, examId);
        registerExamUrlMapping(`/p/${examId}`, examId);
        registerExamUrlMapping(`/thi/${examId}`, examId);
        registerExamUrlMapping(`/?pin=${examId}`, examId);
        registerExamUrlMapping(`/#/exam/${examId}`, examId);
      } catch (e) {
      }
      const shortLink = `${window.location.origin}/?pin=${examId}`;
      let compressed = "";
      try {
        compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
      } catch (compErr) {
        console.warn("LZString compression error:", compErr);
      }
      const fullBackupLink = compressed ? `${window.location.origin}/?pin=${examId}&d=${compressed}` : shortLink;
      setShareLink(shortLink);
      const roomCode = examId;
      const newRoom = {
        code: roomCode,
        examTitle: payload.examData.examName,
        subject,
        grade: selectedGrade,
        duration: 45,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        shareLink: shortLink,
        backupLink: fullBackupLink,
        linkedSheetId: null,
        linkedSheetUrl: null
      };
      const updatedHistory = [newRoom, ...examsHistory.filter((h) => h.code !== newRoom.code)];
      setExamsHistory(updatedHistory);
      localStorage.setItem("eduplan_worksheet_exams_history", JSON.stringify(updatedHistory));
      localStorage.setItem(`examCache_${roomCode}`, JSON.stringify(payload));
      const formattedQuestions = (examData.questions || []).map((q, idx) => {
        let content = embedTikzSvgsInText(q.content || q.question || "");
        let solution = embedTikzSvgsInText((q.solution || q.explanation || "").trim());
        content = content.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
          if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
            const svg = convertBbtTableToSvg(match);
            if (svg) {
              const b64 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(svg)) : "";
              if (b64) return `

<svg-wrapper data-svg="${b64}"></svg-wrapper>

`;
            }
          }
          return match;
        });
        solution = solution.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
          if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
            const svg = convertBbtTableToSvg(match);
            if (svg) {
              const b64 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(svg)) : "";
              if (b64) return `

<svg-wrapper data-svg="${b64}"></svg-wrapper>

`;
            }
          }
          return match;
        });
        if (isMissingBbt(content)) {
          const fMatch = content.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);
          if (fMatch) {
            const bbt = analyzeFunctionToBbt(fMatch[1].trim());
            if (bbt) {
              const svg = generateBbtSvg(bbt);
              if (svg) {
                const b64 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(svg)) : "";
                if (b64) content += `

<svg-wrapper data-svg="${b64}"></svg-wrapper>

`;
              }
            }
          }
        }
        let finalContent = content;
        let finalOptions = q.options ? q.options.map((opt) => cleanOptionText(opt)) : [];
        if (q.type === "mc" || !q.type || finalOptions.length < 2) {
          const mcMatch = content.match(/^(.*?)(?:\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>)?A[\.\):]\s*([\s\S]*?)(?:\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>)?B[\.\):]\s*([\s\S]*?)(?:\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>)?C[\.\):]\s*([\s\S]*?)(?:\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>)?D[\.\):]\s*([\s\S]*)$/i);
          if (mcMatch) {
            finalContent = mcMatch[1].trim();
            finalOptions = [
              cleanOptionText(mcMatch[2]),
              cleanOptionText(mcMatch[3]),
              cleanOptionText(mcMatch[4]),
              cleanOptionText(mcMatch[5])
            ];
          } else {
            finalContent = cleanQuestionStem(content, finalOptions, q.tfStatements);
          }
        } else {
          finalContent = cleanQuestionStem(content, finalOptions, q.tfStatements);
        }
        return {
          ...q,
          id: q.id || idx + 1,
          content: finalContent,
          solution,
          explanation: solution,
          options: finalOptions
        };
      });
      setWorksheetQuestions(formattedQuestions);
      setViewMode("questions");
      const generatedDoc = formattedQuestions.map((q, i) => {
        let t = `### C\xE2u ${i + 1}: ${q.content}
`;
        if (q.options && q.options.length > 0) {
          t += q.options.map((opt, oIdx) => `- **${String.fromCharCode(65 + oIdx)}.** ${opt}`).join("\n") + "\n";
        }
        if (q.tfStatements && q.tfStatements.length > 0) {
          t += q.tfStatements.map((s, sIdx) => `- **${String.fromCharCode(97 + sIdx)})** ${s.statement || s}`).join("\n") + "\n";
        }
        if (q.solution) {
          t += `
*L\u1EDDi gi\u1EA3i chi ti\u1EBFt:*
${q.solution}
`;
        }
        return t;
      }).join("\n---\n\n");
      setSuggestion(generatedDoc);
    } catch (err) {
      console.error(err);
      setError(err.message || "Kh\xF4ng th\u1EC3 t\u1EA1o phi\u1EBFu b\xE0i t\u1EADp t\u01B0\u01A1ng t\xE1c l\xFAc n\xE0y.");
    } finally {
      setIsGeneratingInteractive(false);
    }
  };
  const handleGenerate = async () => {
    if (!customLessonName) {
      setError("Vui l\xF2ng nh\u1EADp t\xEAn b\xE0i h\u1ECDc ho\u1EB7c ch\u1EE7 \u0111\u1EC1.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestion("");
    setStreamProgress({ percentage: 10, text: "Kh\u1EDFi t\u1EA1o k\u1EBFt n\u1ED1i t\u1EA1o phi\u1EBFu h\u1ECDc t\u1EADp..." });
    try {
      const semData = getKnttCurriculum(subject, selectedGrade, selectedSemester);
      const currentChapter = semData?.chapters.find((c) => c.id === selectedChapterId);
      const selectedChapterName = currentChapter?.name || "";
      const response = await fetch("/api/generate-worksheet-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lesson: customLessonName,
          chapter: selectedChapterName,
          semester: selectedSemester,
          subject,
          grade: selectedGrade,
          type: worksheetType,
          layoutStyle,
          numMC: numMC !== "auto" ? Number(numMC) : void 0,
          numEssay: numEssay !== "auto" ? Number(numEssay) : void 0,
          includeRealWorld,
          answerMode,
          additionalNotes,
          numPartI,
          numPartII,
          numPartIII,
          numPartIV,
          realWorldPercent,
          hasParametric
        })
      });
      if (!response.ok || !response.body) {
        try {
          const resNonStream = await apiFetch("/api/generate-worksheet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lesson: customLessonName,
              chapter: selectedChapterName,
              semester: selectedSemester,
              subject,
              grade: selectedGrade,
              type: worksheetType,
              layoutStyle,
              answerMode,
              additionalNotes,
              numPartI,
              numPartII,
              numPartIII,
              numPartIV,
              realWorldPercent,
              hasParametric
            })
          });
          const data = await resNonStream.json();
          if (data && data.result) {
            setSuggestion(normalizeMathText(data.result || ""));
            setStreamProgress({ percentage: 100, text: "T\u1EA1o phi\u1EBFu h\u1ECDc t\u1EADp ho\xE0n t\u1EA5t!" });
            setTimeout(() => setStreamProgress(null), 1e3);
            setIsLoading(false);
            triggerGlobalMathRender();
            return;
          }
        } catch (nonStreamErr) {
          console.warn("Non-stream fallback also failed:", nonStreamErr);
        }
        setError("M\xE1y ch\u1EE7 AI hi\u1EC7n \u0111ang t\u1EA1m th\u1EDDi qu\xE1 t\u1EA3i (L\u1ED7i 503 Service Unavailable). Th\u1EA7y c\xF4 vui l\xF2ng nh\u1EA5n n\xFAt 'T\u1EF1 \u0111\u1ED9ng t\u1EA1o Phi\u1EBFu h\u1ECDc t\u1EADp' \u0111\u1EC3 th\u1EED l\u1EA1i sau \xEDt ph\xFAt.");
        setIsLoading(false);
        setStreamProgress(null);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let rawAccumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        rawAccumulated += chunk;
        if (rawAccumulated.includes("SERVER_ERROR:") || rawAccumulated.includes('"code": 503') || rawAccumulated.includes('"code":503') || rawAccumulated.includes("Service Unavailable")) {
          setError("M\xE1y ch\u1EE7 AI hi\u1EC7n \u0111ang qu\xE1 t\u1EA3i (L\u1ED7i 503 Service Unavailable). Th\u1EA7y c\xF4 vui l\xF2ng nh\u1EA5n n\xFAt 'T\u1EF1 \u0111\u1ED9ng t\u1EA1o Phi\u1EBFu h\u1ECDc t\u1EADp' b\xEAn d\u01B0\u1EDBi \u0111\u1EC3 th\u1EED l\u1EA1i.");
          const cleanText = rawAccumulated.replace(/SERVER_ERROR:[\s\S]*/g, "").replace(/\{"error":[\s\S]*/g, "").trim();
          setSuggestion(normalizeMathText(cleanText));
          setIsLoading(false);
          setStreamProgress(null);
          return;
        }
        setSuggestion(normalizeMathText(rawAccumulated));
        if (rawAccumulated.includes("PH\u1EA6N IV")) {
          setStreamProgress({ percentage: 85, text: "\u0110ang sinh PH\u1EA6N IV: B\xE0i t\u1EADp t\u1EF1 lu\u1EADn..." });
        } else if (rawAccumulated.includes("PH\u1EA6N III")) {
          setStreamProgress({ percentage: 65, text: "\u0110ang sinh PH\u1EA6N III: Tr\u1EAFc nghi\u1EC7m tr\u1EA3 l\u1EDDi ng\u1EAFn..." });
        } else if (rawAccumulated.includes("PH\u1EA6N II")) {
          setStreamProgress({ percentage: 45, text: "\u0110ang sinh PH\u1EA6N II: Tr\u1EAFc nghi\u1EC7m \u0110\xFAng / Sai..." });
        } else if (rawAccumulated.includes("PH\u1EA6N I")) {
          setStreamProgress({ percentage: 25, text: "\u0110ang sinh PH\u1EA6N I: Tr\u1EAFc nghi\u1EC7m l\u1EF1a ch\u1ECDn..." });
        } else if (rawAccumulated.includes("details") || rawAccumulated.includes("\u0110\xC1P \xC1N")) {
          setStreamProgress({ percentage: 95, text: "\u0110ang ho\xE0n thi\u1EC7n B\u1EA3ng \u0111\xE1p \xE1n & H\u01B0\u1EDBng d\u1EABn gi\u1EA3i..." });
        } else {
          setStreamProgress({ percentage: 15, text: "\u0110ang ph\xE2n t\xEDch c\u1EA5u tr\xFAc phi\u1EBFu h\u1ECDc t\u1EADp..." });
        }
      }
      let processedResult = preProcessMathContent(rawAccumulated);
      processedResult = embedTikzSvgsInText(processedResult);
      processedResult = processedResult.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
        if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
          const svg = convertBbtTableToSvg(match);
          if (svg) {
            const b64 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(svg)) : "";
            if (b64) return `

<svg-wrapper data-svg="${b64}"></svg-wrapper>

`;
          }
        }
        return match;
      });
      setSuggestion(processedResult);
      setStreamProgress({ percentage: 100, text: "T\u1EA1o phi\u1EBFu h\u1ECDc t\u1EADp th\xE0nh c\xF4ng!" });
      try {
        const parsed = parseRawExamText(processedResult);
        if (parsed && parsed.length > 0) {
          const enriched = parsed.map((q, idx) => {
            let content = embedTikzSvgsInText(q.content || "");
            let solution = embedTikzSvgsInText(q.solution || q.explanation || "");
            content = content.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
              if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
                const svg = convertBbtTableToSvg(match);
                if (svg) {
                  const b64 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(svg)) : "";
                  if (b64) return `

<svg-wrapper data-svg="${b64}"></svg-wrapper>

`;
                }
              }
              return match;
            });
            solution = solution.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
              if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(match)) {
                const svg = convertBbtTableToSvg(match);
                if (svg) {
                  const b64 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(svg)) : "";
                  if (b64) return `

<svg-wrapper data-svg="${b64}"></svg-wrapper>

`;
                }
              }
              return match;
            });
            if (isMissingBbt(content)) {
              const fMatch = content.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);
              if (fMatch) {
                const bbt = analyzeFunctionToBbt(fMatch[1].trim());
                if (bbt) {
                  const svg = generateBbtSvg(bbt);
                  if (svg) {
                    const b64 = typeof btoa !== "undefined" ? btoa(encodeURIComponent(svg)) : "";
                    if (b64) content += `

<svg-wrapper data-svg="${b64}"></svg-wrapper>

`;
                  }
                }
              }
            }
            return {
              ...q,
              id: q.id || idx + 1,
              content,
              solution,
              explanation: solution,
              options: q.options ? q.options.map((opt) => cleanOptionText(opt)) : []
            };
          });
          setWorksheetQuestions(enriched);
          setViewMode("document");
        } else {
          setWorksheetQuestions([]);
          setViewMode("document");
        }
      } catch (e) {
        setWorksheetQuestions([]);
        setViewMode("document");
      }
      saveToHistory({
        type: "PHT",
        grade: selectedGrade,
        subject,
        lessonName: customLessonName,
        content: processedResult
      });
      setHistoryItems(getHistory().filter((item) => item.type === "PHT"));
      triggerGlobalMathRender();
      setTimeout(() => setStreamProgress(null), 1200);
    } catch (err) {
      console.error(err);
      setError(err.message || "Kh\xF4ng th\u1EC3 t\u1EA1o phi\u1EBFu h\u1ECDc t\u1EADp l\xFAc n\xE0y. Vui l\xF2ng th\u1EED l\u1EA1i sau.");
      setStreamProgress(null);
    } finally {
      setIsLoading(false);
    }
  };
  const handleExportPNG = async () => {
    if (!exportRef.current) return;
    if (isEditing) {
      alert("Vui l\xF2ng chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 'Xem tr\u01B0\u1EDBc' (con m\u1EAFt) tr\u01B0\u1EDBc khi t\u1EA3i \u1EA3nh Poster.");
      return;
    }
    setIsExportingImage(true);
    try {
      const cleanTitle = customLessonName ? customLessonName.replace(/\s+/g, "_") : "PhieuHocTap";
      await exportElementToImage(exportRef.current, `Poster_${cleanTitle}_${layoutStyle}.png`);
    } catch (err) {
      console.error("L\u1ED7i khi t\u1EA3i \u1EA3nh Poster:", err);
      alert("Kh\xF4ng th\u1EC3 t\u1EA3i \u1EA3nh l\xFAc n\xE0y. B\u1EA1n c\xF3 th\u1EC3 d\xF9ng n\xFAt 'In / Xu\u1EA5t PDF' \u0111\u1EC3 l\u01B0u t\xE0i li\u1EC7u.");
    } finally {
      setIsExportingImage(false);
    }
  };
  const handleExportPDF = async () => {
    if (isEditing) {
      alert("Vui l\xF2ng chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 'Xem tr\u01B0\u1EDBc' (con m\u1EAFt) tr\u01B0\u1EDBc khi in ho\u1EB7c xu\u1EA5t PDF.");
      return;
    }
    const cleanTitle = customLessonName ? `PhieuHocTap_${customLessonName.replace(/\s+/g, "_")}` : "PhieuHocTap";
    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
    }
    printElement(exportRef.current, cleanTitle);
  };
  const handleExportWord = async () => {
    if (isEditing) {
      if (window.confirm("B\u1EA1n \u0111ang \u1EDF ch\u1EBF \u0111\u1ED9 ch\u1EC9nh s\u1EEDa (hi\u1EC3n th\u1ECB m\xE3 Markdown). B\u1EA1n c\xF3 mu\u1ED1n chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 Xem tr\u01B0\u1EDBc \u0111\u1EC3 xu\u1EA5t file \u0111\u1EB9p h\u01A1n kh\xF4ng?")) {
        setIsEditing(false);
        setTimeout(async () => {
          if (exportRef.current) {
            await ensureMathRendered(exportRef.current);
            exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, "_")}.doc`);
          }
        }, 500);
      } else {
        alert("Vui l\xF2ng chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 'Xem tr\u01B0\u1EDBc' (con m\u1EAFt) tr\u01B0\u1EDBc khi t\u1EA3i xu\u1ED1ng.");
      }
      return;
    }
    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
      exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, "_")}.doc`);
    }
  };
  const handleExportWordLatex = async () => {
    if (isEditing) {
      alert("Vui l\xF2ng chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 'Xem tr\u01B0\u1EDBc' (con m\u1EAFt) tr\u01B0\u1EDBc khi t\u1EA3i xu\u1ED1ng.");
      return;
    }
    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
      exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, "_")}_LaTeX.doc`, true);
    }
  };
  const handleExportWordImage = async () => {
    if (isEditing) {
      alert("Vui l\xF2ng chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 'Xem tr\u01B0\u1EDBc' (con m\u1EAFt) tr\u01B0\u1EDBc khi t\u1EA3i xu\u1ED1ng.");
      return;
    }
    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
      exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, "_")}_Anh.doc`, "image");
    }
  };
  const splitContent = (content) => {
    const regex = /(?:PHẦN BÀI TẬP|BÀI TẬP|CÂU HỎI TRẮC NGHIỆM|##\s*Bài tập|##\s*Luyện tập|Câu 1:|Câu 1\.|###\s*A\.\s*Trắc nghiệm|##\s*A\.\s*TRẮC NGHIỆM|##\s*Bài tập tự luyện)/i;
    const match = content.match(regex);
    if (match && match.index !== void 0) {
      return {
        left: content.substring(0, match.index),
        right: content.substring(match.index)
      };
    }
    const paragraphs = content.split("\n\n");
    const half = Math.ceil(paragraphs.length / 2);
    return {
      left: paragraphs.slice(0, half).join("\n\n"),
      right: paragraphs.slice(half).join("\n\n")
    };
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col lg:flex-row min-h-full bg-slate-50 lg:overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "w-full lg:w-[400px] lg:border-r border-b lg:border-b-0 border-slate-200 bg-white flex flex-col h-auto lg:h-full shrink-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-4 border-b border-slate-200 bg-slate-50/50", children: [
        /* @__PURE__ */ jsx(FeatureQuickGuideBanner, { sectionId: "worksheet_generator" }),
        /* @__PURE__ */ jsxs("h2", { className: "text-xl font-bold text-slate-800 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(BookOpen, { className: "w-5 h-5 text-emerald-600" }),
          "Phi\u1EBFu h\u1ECDc t\u1EADp"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500 mt-1", children: "T\u1EA1o phi\u1EBFu b\xE0i t\u1EADp, t\xF3m t\u1EAFt ki\u1EBFn th\u1EE9c cho h\u1ECDc sinh" })
      ] }),
      historyItems.length > 0 && /* @__PURE__ */ jsxs("div", { className: "p-4 border-b border-slate-200 bg-white space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-sm font-medium text-slate-700", children: [
            "L\u1ECBch s\u1EED \u0111\xE3 t\u1EA1o (",
            historyItems.length,
            ")"
          ] }),
          selectedHistoryId && /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => {
                if (confirm("B\u1EA1n c\xF3 ch\u1EAFc mu\u1ED1n x\xF3a phi\u1EBFu h\u1ECDc t\u1EADp n\xE0y kh\u1ECFi l\u1ECBch s\u1EED?")) {
                  deleteFromHistory(selectedHistoryId);
                  const updated = getHistory().filter((item) => item.type === "PHT");
                  setHistoryItems(updated);
                  setSelectedHistoryId("");
                  setToastMessage("\u0110\xE3 x\xF3a phi\u1EBFu h\u1ECDc t\u1EADp kh\u1ECFi l\u1ECBch s\u1EED!");
                }
              },
              className: "px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded flex items-center gap-1 cursor-pointer",
              children: [
                /* @__PURE__ */ jsx(Trash2, { className: "w-3 h-3" }),
                " X\xF3a phi\u1EBFu"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            className: "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm",
            value: selectedHistoryId,
            onChange: (e) => {
              const val = e.target.value;
              setSelectedHistoryId(val);
              if (val) {
                const item = historyItems.find((h) => h.id === val);
                if (item) {
                  setSuggestion(item.content);
                  setCustomLessonName(item.lessonName);
                  if (item.subject) setSubject(item.subject);
                  if (item.grade) setSelectedGrade(item.grade);
                }
              }
            },
            children: [
              /* @__PURE__ */ jsx("option", { value: "", children: "-- Ch\u1ECDn phi\u1EBFu h\u1ECDc t\u1EADp \u0111\xE3 t\u1EA1o --" }),
              historyItems.map((item) => /* @__PURE__ */ jsxs("option", { value: item.id, children: [
                new Date(item.createdAt).toLocaleDateString("vi-VN"),
                " - ",
                item.lessonName
              ] }, item.id))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto p-4 space-y-6", children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "M\xF4n h\u1ECDc" }),
          /* @__PURE__ */ jsx(
            "select",
            {
              className: "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500",
              value: subject,
              onChange: (e) => {
                setSubject(e.target.value);
                setSelectedChapterId("");
                setSelectedLessonId("");
              },
              children: subjects.map((sub) => /* @__PURE__ */ jsx("option", { value: sub, children: sub }, sub))
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50/50 rounded-xl border border-slate-200/60 space-y-3.5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider", children: [
            /* @__PURE__ */ jsx(Sliders, { className: "w-3.5 h-3.5 text-emerald-600" }),
            /* @__PURE__ */ jsx("span", { children: "Ch\u01B0\u01A1ng tr\xECnh SGK K\u1EBFt n\u1ED1i tri th\u1EE9c" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "Kh\u1ED1i l\u1EDBp" }),
              /* @__PURE__ */ jsx(
                "select",
                {
                  className: "w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs font-semibold text-slate-800",
                  value: selectedGrade,
                  onChange: (e) => {
                    const gradeVal = Number(e.target.value);
                    setSelectedGrade(gradeVal);
                    setSelectedChapterId("");
                    setSelectedLessonId("");
                  },
                  children: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => /* @__PURE__ */ jsxs("option", { value: g, children: [
                    "L\u1EDBp ",
                    g
                  ] }, g))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "H\u1ECDc k\u1EF3" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  className: "w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs font-semibold text-slate-800",
                  value: selectedSemester,
                  onChange: (e) => {
                    setSelectedSemester(e.target.value);
                    setSelectedChapterId("");
                    setSelectedLessonId("");
                  },
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "semester_1", children: "H\u1ECDc k\u1EF3 1" }),
                    /* @__PURE__ */ jsx("option", { value: "semester_2", children: "H\u1ECDc k\u1EF3 2" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "Ch\u01B0\u01A1ng / Ch\u1EE7 \u0111\u1EC1" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                className: "w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs font-semibold text-slate-800",
                value: selectedChapterId,
                onChange: (e) => {
                  setSelectedChapterId(e.target.value);
                  setSelectedLessonId("");
                },
                children: (() => {
                  const semData = getKnttCurriculum(subject, selectedGrade, selectedSemester);
                  const chapters = semData?.chapters || [];
                  return chapters.map((chap) => /* @__PURE__ */ jsx("option", { value: chap.id, children: chap.name }, chap.id));
                })()
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "B\xE0i h\u1ECDc c\u1EE5 th\u1EC3" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                className: "w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs font-semibold text-slate-800",
                value: selectedLessonId,
                onChange: (e) => {
                  const lId = e.target.value;
                  setSelectedLessonId(lId);
                  const semData = getKnttCurriculum(subject, selectedGrade, selectedSemester);
                  const chapters = semData?.chapters || [];
                  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];
                  const lesson = selectedChapter?.lessons.find((l) => l.id === lId);
                  if (lesson) {
                    if (/cấp\s*số\s*cộng/i.test(lesson.name)) {
                      setCustomLessonName("CH\u1EE6 \u0110\u1EC0: C\u1EA4P S\u1ED0 C\u1ED8NG");
                    } else {
                      setCustomLessonName(lesson.name);
                    }
                  }
                },
                children: (() => {
                  const semData = getKnttCurriculum(subject, selectedGrade, selectedSemester);
                  const chapters = semData?.chapters || [];
                  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];
                  const lessons = selectedChapter?.lessons || [];
                  return lessons.map((les) => /* @__PURE__ */ jsx("option", { value: les.id, children: les.name }, les.id));
                })()
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "Ti\xEAu \u0111\u1EC1 chu\u1EA9n b\xE0i h\u1ECDc / Ch\u1EE7 \u0111\u1EC1" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "V\xED d\u1EE5: CH\u1EE6 \u0110\u1EC0: C\u1EA4P S\u1ED0 C\u1ED8NG",
                className: "w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs text-slate-800 font-semibold uppercase",
                value: customLessonName,
                onChange: (e) => setCustomLessonName(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "N\u1ED9i dung b\u1ED5 sung / Tr\u1ECDng t\xE2m nh\u1EA5n m\u1EA1nh (n\u1EBFu c\xF3)" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "V\xED d\u1EE5: T\u1EADp trung v\xE0o GTLN c\u1EE7a h\xE0m ph\xE2n th\u1EE9c...",
                className: "w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-xs text-slate-800 font-medium",
                value: additionalNotes,
                onChange: (e) => setAdditionalNotes(e.target.value)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "pt-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-sm font-bold text-slate-800 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Palette, { className: "w-4 h-4 text-indigo-600" }),
              "Phong c\xE1ch tr\xECnh b\xE0y (Layout Style)"
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium border border-indigo-200/60", children: "2 phong c\xE1ch" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5", children: LAYOUT_STYLE_OPTIONS.map((style) => {
            const Icon = style.icon;
            const isSelected = layoutStyle === style.id;
            return /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => setLayoutStyle(style.id),
                className: cn(
                  "relative text-left p-3 rounded-xl border transition-all flex flex-col justify-between group",
                  isSelected ? style.activeColor : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 shadow-2xs"
                ),
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-1.5 mb-1.5", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsx("div", { className: cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-white shadow-xs" : "bg-slate-100 group-hover:bg-white text-slate-600"
                      ), children: /* @__PURE__ */ jsx(Icon, { className: "w-4 h-4" }) }),
                      /* @__PURE__ */ jsx("span", { className: "text-xs font-bold leading-tight line-clamp-1", children: style.title })
                    ] }),
                    isSelected && /* @__PURE__ */ jsx("div", { className: "w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsx(Check, { className: "w-2.5 h-2.5 stroke-[3]" }) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "mt-1", children: [
                    /* @__PURE__ */ jsx("span", { className: cn(
                      "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mb-1 border border-current/20",
                      style.badgeBg
                    ), children: style.badge }),
                    /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-500 line-clamp-2 leading-relaxed", children: style.desc })
                  ] })
                ]
              },
              style.id
            );
          }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "pt-2 border-t border-slate-200/80", children: /* @__PURE__ */ jsxs("div", { className: "bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3.5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider", children: [
              /* @__PURE__ */ jsx(Sliders, { className: "w-3.5 h-3.5 text-slate-600" }),
              /* @__PURE__ */ jsx("span", { children: "C\u1EA5u tr\xFAc 4 Ph\u1EA7n C\u1EA5u h\xECnh S\u1ED1 c\xE2u" })
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full", children: [
              "T\u1ED5ng: ",
              numPartI + numPartII + numPartIII + numPartIV,
              " c\xE2u"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("label", { className: "block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("span", { children: "H\xECnh th\u1EE9c c\u1EA5u tr\xFAc phi\u1EBFu h\u1ECDc t\u1EADp:" }),
              numPartIV === 0 ? /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full", children: "\u0110\u1EC1 3 ph\u1EA7n (KH\xD4NG T\u1EF0 LU\u1EACN)" }) : /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full", children: [
                "\u0110\u1EC1 4 ph\u1EA7n (+ ",
                numPartIV,
                " T\u1EF1 lu\u1EADn)"
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              "select",
              {
                className: "w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 shadow-2xs",
                value: worksheetType,
                onChange: (e) => {
                  const val = e.target.value;
                  setWorksheetType(val);
                  if (val.includes("\u0110\u1EC1 3 ph\u1EA7n")) {
                    setNumPartI(12);
                    setNumPartII(4);
                    setNumPartIII(6);
                    setNumPartIV(0);
                  } else if (val.includes("\u0110\u1EC1 4 ph\u1EA7n")) {
                    setNumPartI(12);
                    setNumPartII(2);
                    setNumPartIII(4);
                    setNumPartIV(3);
                  } else if (val.includes("Ch\u1EC9 tr\u1EAFc nghi\u1EC7m")) {
                    setNumPartI(20);
                    setNumPartII(0);
                    setNumPartIII(0);
                    setNumPartIV(0);
                  } else if (val.includes("Ch\u1EC9 t\u1EF1 lu\u1EADn")) {
                    setNumPartI(0);
                    setNumPartII(0);
                    setNumPartIII(0);
                    setNumPartIV(4);
                  }
                },
                children: worksheetTypes.map((t) => /* @__PURE__ */ jsx("option", { value: t, children: t }, t))
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-bold text-slate-600 block", children: "\u26A1 M\u1EABu c\u1EA5u tr\xFAc nhanh BGD 2025:" }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-1.5 text-[11px]", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setNumPartI(12);
                    setNumPartII(4);
                    setNumPartIII(6);
                    setNumPartIV(0);
                    setWorksheetType("\u0110\u1EC1 3 ph\u1EA7n (12 c\xE2u TN nhi\u1EC1u l\u1EF1a ch\u1ECDn; 4 c\xE2u \u0110/S; 6 c\xE2u TL ng\u1EAFn)");
                  },
                  className: cn(
                    "p-1.5 rounded-lg border text-left font-medium transition-all cursor-pointer",
                    numPartI === 12 && numPartII === 4 && numPartIII === 6 && numPartIV === 0 ? "bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                  ),
                  children: "\u{1F3AF} 3 Ph\u1EA7n BGD (12 TN + 4 \u0110S + 6 TLN - 0 T\u1EF1 lu\u1EADn)"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setNumPartI(12);
                    setNumPartII(4);
                    setNumPartIII(6);
                    setNumPartIV(2);
                    setWorksheetType("\u0110\u1EC1 4 ph\u1EA7n (12 c\xE2u TN; 4 c\xE2u \u0110/S; 6 c\xE2u TL ng\u1EAFn; 2 c\xE2u T\u1EF1 lu\u1EADn)");
                  },
                  className: cn(
                    "p-1.5 rounded-lg border text-left font-medium transition-all cursor-pointer",
                    numPartI === 12 && numPartII === 4 && numPartIII === 6 && numPartIV === 2 ? "bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                  ),
                  children: "\u2B50 4 Ph\u1EA7n \u0110\u1EA7y \u0111\u1EE7 (+ 2 T\u1EF1 lu\u1EADn)"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setNumPartI(20);
                    setNumPartII(0);
                    setNumPartIII(0);
                    setNumPartIV(0);
                    setWorksheetType("Ch\u1EC9 tr\u1EAFc nghi\u1EC7m kh\xE1ch quan");
                  },
                  className: cn(
                    "p-1.5 rounded-lg border text-left font-medium transition-all cursor-pointer",
                    numPartI === 20 && numPartII === 0 && numPartIII === 0 && numPartIV === 0 ? "bg-indigo-600 text-white border-indigo-700 font-bold shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-400"
                  ),
                  children: "\u{1F4DD} Ch\u1EC9 Tr\u1EAFc nghi\u1EC7m (20 c\xE2u ABCD)"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setNumPartI(0);
                    setNumPartII(0);
                    setNumPartIII(0);
                    setNumPartIV(4);
                    setWorksheetType("Ch\u1EC9 t\u1EF1 lu\u1EADn");
                  },
                  className: cn(
                    "p-1.5 rounded-lg border text-left font-medium transition-all cursor-pointer",
                    numPartI === 0 && numPartII === 0 && numPartIII === 0 && numPartIV === 4 ? "bg-indigo-600 text-white border-indigo-700 font-bold shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-400"
                  ),
                  children: "\u270D\uFE0F Ch\u1EC9 T\u1EF1 lu\u1EADn (4 B\xE0i T\u1EF1 lu\u1EADn)"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 pt-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-white p-2 border border-slate-200 rounded-lg", children: [
              /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "Ph\u1EA7n I: Tr\u1EAFc nghi\u1EC7m (A,B,C,D)" }),
              /* @__PURE__ */ jsx(
                "select",
                {
                  className: "w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-semibold",
                  value: numPartI,
                  onChange: (e) => setNumPartI(Number(e.target.value)),
                  children: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 20, 24, 30, 40].map((n) => /* @__PURE__ */ jsxs("option", { value: n, children: [
                    n,
                    " c\xE2u"
                  ] }, n))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-white p-2 border border-slate-200 rounded-lg", children: [
              /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "Ph\u1EA7n II: \u0110\xFAng - Sai (a,b,c,d)" }),
              /* @__PURE__ */ jsx(
                "select",
                {
                  className: "w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-semibold",
                  value: numPartII,
                  onChange: (e) => setNumPartII(Number(e.target.value)),
                  children: [0, 1, 2, 3, 4, 5, 6, 8, 10].map((n) => /* @__PURE__ */ jsxs("option", { value: n, children: [
                    n,
                    " c\xE2u"
                  ] }, n))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-white p-2 border border-slate-200 rounded-lg", children: [
              /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "Ph\u1EA7n III: Tr\u1EA3 l\u1EDDi ng\u1EAFn" }),
              /* @__PURE__ */ jsx(
                "select",
                {
                  className: "w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-semibold",
                  value: numPartIII,
                  onChange: (e) => setNumPartIII(Number(e.target.value)),
                  children: [0, 1, 2, 3, 4, 5, 6, 8, 10].map((n) => /* @__PURE__ */ jsxs("option", { value: n, children: [
                    n,
                    " c\xE2u"
                  ] }, n))
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-white p-2 border border-slate-200 rounded-lg", children: [
              /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "Ph\u1EA7n IV: T\u1EF1 lu\u1EADn r\xE8n luy\u1EC7n" }),
              /* @__PURE__ */ jsx(
                "select",
                {
                  className: "w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-semibold",
                  value: numPartIV,
                  onChange: (e) => setNumPartIV(Number(e.target.value)),
                  children: [0, 1, 2, 3, 4, 5, 6, 8].map((n) => /* @__PURE__ */ jsxs("option", { value: n, children: [
                    n,
                    " b\xE0i"
                  ] }, n))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white p-2.5 border border-slate-200 rounded-lg space-y-1.5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-[11px] font-bold text-slate-600", children: [
              /* @__PURE__ */ jsx("span", { children: "T\u1EF7 l\u1EC7 b\xE0i to\xE1n th\u1EF1c t\u1EBF" }),
              /* @__PURE__ */ jsxs("span", { className: "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono", children: [
                realWorldPercent,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "range",
                min: "0",
                max: "100",
                step: "5",
                className: "w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg",
                value: realWorldPercent,
                onChange: (e) => setRealWorldPercent(Number(e.target.value))
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white p-2.5 border border-slate-200 rounded-lg space-y-2", children: [
            /* @__PURE__ */ jsx("span", { className: "block text-[11px] font-bold text-slate-600", children: "Ph\xE2n h\xF3a tham s\u1ED1 th\u1EF1c" }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5 text-xs text-slate-700", children: [
              /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer font-medium", children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "radio",
                    name: "parametric_option",
                    className: "w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300",
                    checked: !hasParametric,
                    onChange: () => setHasParametric(false)
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: "Kh\xF4ng c\xF3 b\xE0i to\xE1n ch\u1EE9a tham s\u1ED1" })
              ] }),
              /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer font-medium", children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "radio",
                    name: "parametric_option",
                    className: "w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300",
                    checked: hasParametric,
                    onChange: () => setHasParametric(true)
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: "C\xF3 b\xE0i to\xE1n ch\u1EE9a tham s\u1ED1 ($m, a, b...$) \u0111\u1EC3 ph\xE2n h\xF3a h\u1ECDc sinh" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white p-2.5 border border-slate-200 rounded-lg", children: [
            /* @__PURE__ */ jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "Ch\u1EBF \u0111\u1ED9 \u0111\xE1p \xE1n hi\u1EC3n th\u1ECB" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                className: "w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none",
                value: answerMode,
                onChange: (e) => setAnswerMode(e.target.value),
                children: [
                  /* @__PURE__ */ jsx("option", { value: "full", children: "\u0110\u1EA7y \u0111\u1EE7 l\u1EDDi gi\u1EA3i & h\u01B0\u1EDBng d\u1EABn ch\u1EA5m chi ti\u1EBFt" }),
                  /* @__PURE__ */ jsx("option", { value: "summary", children: "Ch\u1EC9 k\xE8m b\u1EA3ng \u0111\xE1p \xE1n nhanh / k\u1EBFt s\u1ED1" }),
                  /* @__PURE__ */ jsx("option", { value: "none", children: "Kh\xF4ng k\xE8m \u0111\xE1p \xE1n (cho h\u1ECDc sinh l\xE0m b\xE0i)" })
                ]
              }
            )
          ] })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "p-4 border-t border-slate-200 bg-slate-50", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleGenerate,
              disabled: isLoading || isGeneratingInteractive || !customLessonName,
              className: "flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors",
              children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("div", { className: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }),
                /* @__PURE__ */ jsx("span", { children: "\u0110ang t\u1EA1o b\u1EA3n In..." })
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Printer, { className: "w-5 h-5" }),
                /* @__PURE__ */ jsx("span", { children: "T\u1EA1o b\u1EA3n Word/In" })
              ] })
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleGenerateInteractive,
              disabled: isLoading || isGeneratingInteractive || !customLessonName,
              className: "flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors",
              children: isGeneratingInteractive ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("div", { className: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }),
                /* @__PURE__ */ jsx("span", { children: "\u0110ang x\u1EED l\xFD..." })
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Share2, { className: "w-5 h-5" }),
                /* @__PURE__ */ jsx("span", { children: "T\u1EA1o Link L\xE0m Online" })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-2.5", children: /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setIsUploadExamModalOpen(true),
            className: "w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow",
            title: "T\u1EA3i \u0111\u1EC1 Word/PDF/Text c\u1EE7a gi\xE1o vi\xEAn l\xEAn \u0111\u1EC3 t\u1EA1o link l\xE0m online k\xE8m s\u1EEDa l\u1ED7i",
            children: [
              /* @__PURE__ */ jsx(Upload, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsx("span", { children: "T\u1EA3i \u0111\u1EC1 c\u1EE7a t\xF4i l\xEAn (Word/PDF/Text)" })
            ]
          }
        ) }),
        shareLink && /* @__PURE__ */ jsxs("div", { className: "mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-sm font-bold text-emerald-900 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-600 shrink-0" }),
              "Link online cho h\u1ECDc sinh (\u0111\xE3 r\xFAt g\u1ECDn):"
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium", children: "G\u1EEDi qua Zalo / Facebook" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                readOnly: true,
                value: shareLink,
                className: "flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm text-emerald-800 font-semibold shadow-inner focus:outline-none select-all"
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => {
                  navigator.clipboard.writeText(shareLink);
                  alert("\u0110\xE3 sao ch\xE9p link!\nC\xF4 c\xF3 th\u1EC3 d\xE1n tr\u1EF1c ti\u1EBFp v\xE0o nh\xF3m Zalo/Facebook \u0111\u1EC3 h\u1ECDc sinh l\xE0m b\xE0i ngay.");
                },
                className: "px-3.5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer",
                children: [
                  /* @__PURE__ */ jsx(Copy, { className: "w-4 h-4" }),
                  " Sao ch\xE9p"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => {
                  const matchPin = shareLink.match(/pin=([A-Za-z0-9_-]+)/);
                  const pin = matchPin ? matchPin[1] : "";
                  if (pin) {
                    handleRefreshExamUrl(pin);
                  }
                },
                title: "L\xE0m m\u1EDBi li\xEAn k\u1EBFt chia s\u1EBB & t\xE1i \xE1nh x\u1EA1 m\xE3 ph\xF2ng thi v\xE0o h\u1EC7 th\u1ED1ng",
                className: "px-3.5 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer",
                children: [
                  /* @__PURE__ */ jsx(RefreshCw, { className: "w-4 h-4" }),
                  " L\xE0m m\u1EDBi URL"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "a",
              {
                href: shareLink,
                target: "_blank",
                rel: "noreferrer",
                className: "px-3.5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 shrink-0 flex items-center gap-1.5 transition-colors",
                children: [
                  /* @__PURE__ */ jsx(ExternalLink, { className: "w-4 h-4" }),
                  " M\u1EDF th\u1EED"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-2", children: "\u{1F4A1} Link ng\u1EAFn g\u1ECDn, h\u1ECDc sinh m\u1EDF tr\u1EF1c ti\u1EBFp tr\xEAn \u0111i\u1EC7n tho\u1EA1i/m\xE1y t\xEDnh m\xE0 kh\xF4ng b\u1ECB l\u1ED7i \u0111\u1EE9t link." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4", children: [
          /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3", children: /* @__PURE__ */ jsxs("span", { className: "text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(FileText, { className: "w-4 h-4 text-emerald-600" }),
            "Qu\u1EA3n l\xFD Ph\xF2ng thi Online / Phi\u1EBFu b\xE0i t\u1EADp (",
            examsHistory.length,
            ")"
          ] }) }),
          examsHistory.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-6 border border-dashed border-slate-200 rounded-xl text-center text-slate-400", children: [
            /* @__PURE__ */ jsx(AlertCircle, { className: "w-8 h-8 mx-auto text-slate-300 mb-1" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold", children: "Ch\u01B0a c\xF3 ph\xF2ng thi tr\u1EF1c tuy\u1EBFn n\xE0o \u0111\u01B0\u1EE3c t\u1EA1o t\u1EEB phi\u1EBFu h\u1ECDc t\u1EADp n\xE0y." }),
            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-400 mt-1", children: 'B\u1EA5m n\xFAt "T\u1EA1o Link L\xE0m Online" \u0111\u1EC3 kh\u1EDFi t\u1EA1o ph\xF2ng thi tr\u1EF1c tuy\u1EBFn cho h\u1ECDc sinh.' })
          ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: examsHistory.map((room) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: `p-3 border rounded-xl flex flex-col gap-2 transition-all ${selectedRoomForResults === room.code ? "bg-emerald-50/50 border-emerald-300 shadow-xs" : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"}`,
              children: [
                /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between gap-2", children: /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-800 line-clamp-1", children: room.examTitle }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded", children: [
                    "M\xE3 ph\xF2ng: ",
                    room.code
                  ] })
                ] }) }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-2 border-t border-slate-100", children: [
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => setPreviewRoomCode(room.code),
                      className: "py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-colors",
                      title: "Xem tr\u01B0\u1EDBc giao di\u1EC7n l\xE0m b\xE0i c\u1EE7a h\u1ECDc sinh",
                      children: [
                        /* @__PURE__ */ jsx(Eye, { className: "w-3 h-3" }),
                        " Xem tr\u01B0\u1EDBc"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => handleLoadRoomResults(room.code),
                      className: "py-1 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-colors",
                      children: [
                        /* @__PURE__ */ jsx(BarChart, { className: "w-3 h-3" }),
                        " K\u1EBFt qu\u1EA3"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => handleRefreshExamUrl(room.code),
                      title: "C\u1EADp nh\u1EADt ho\u1EB7c t\u1EA1o l\u1EA1i li\xEAn k\u1EBFt chia s\u1EBB m\u1EDBi & t\xE1i \xE1nh x\u1EA1 m\xE3 ph\xF2ng thi",
                      className: "py-1 px-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-colors",
                      children: [
                        /* @__PURE__ */ jsx(RefreshCw, { className: "w-3 h-3" }),
                        " L\xE0m m\u1EDBi URL"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => {
                        const rawLink = room.shareLink || `${window.location.origin}/?pin=${room.code}`;
                        const cleanLink = rawLink.includes("&d=") ? rawLink.split("&d=")[0] : rawLink;
                        navigator.clipboard.writeText(cleanLink);
                        alert("\u0110\xE3 copy Link R\xFAt G\u1ECDn h\u1ECDc sinh cho ph\xF2ng: " + room.code + "\nLink: " + cleanLink);
                      },
                      className: "py-1 px-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-colors",
                      children: [
                        /* @__PURE__ */ jsx(Copy, { className: "w-3 h-3" }),
                        " Link Ng\u1EAFn"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: (e) => {
                        e.stopPropagation();
                        handleDeleteRoomFromHistory(room.code);
                      },
                      className: "py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-colors",
                      children: [
                        /* @__PURE__ */ jsx(Trash2, { className: "w-3 h-3" }),
                        " X\xF3a"
                      ]
                    }
                  )
                ] })
              ]
            },
            room.code
          )) }),
          selectedRoomForResults && /* @__PURE__ */ jsxs("div", { className: "mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 pb-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("h4", { className: "text-xs font-bold text-slate-800 flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsx(Users, { className: "w-4 h-4 text-indigo-600" }),
                  "B\xE1o c\xE1o \u0111i\u1EC3m s\u1ED1 ph\xF2ng: ",
                  /* @__PURE__ */ jsx("span", { className: "font-mono text-indigo-600", children: selectedRoomForResults })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500", children: selectedRoomResultsData?.examTitle })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: handleExportResultsToExcel,
                    disabled: isLoadingResults || !selectedRoomResultsData?.submissions?.length,
                    className: "px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-50",
                    children: [
                      /* @__PURE__ */ jsx(Download, { className: "w-3 h-3" }),
                      " Excel"
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => handleLoadRoomResults(selectedRoomForResults),
                    disabled: isLoadingResults,
                    className: "px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1",
                    children: /* @__PURE__ */ jsx(RefreshCw, { className: `w-3 h-3 ${isLoadingResults ? "animate-spin" : ""}` })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-sm", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx(Sparkles, { className: "w-4 h-4 text-amber-500 animate-pulse" }),
                  /* @__PURE__ */ jsx("h5", { className: "text-xs font-bold text-slate-800 uppercase tracking-wide", children: "T\xF9y Ch\u1ECDn Ph\u01B0\u01A1ng \xC1n Xem Th\u1ED1ng K\xEA & Li\xEAn K\u1EBFt" })
                ] }),
                /* @__PURE__ */ jsx("span", { className: "text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100", children: "D\xE0nh cho Gi\xE1o vi\xEAn EduPlan" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => setIntegrationSolutionTab("quick"),
                    className: `p-3 rounded-xl border text-left transition-all cursor-pointer ${integrationSolutionTab === "quick" ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-200 shadow-xs" : "bg-slate-50/70 border-slate-200 hover:border-slate-300"}`,
                    children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-1", children: [
                        /* @__PURE__ */ jsxs("span", { className: "text-xs font-black text-emerald-800 flex items-center gap-1", children: [
                          /* @__PURE__ */ jsx(Zap, { className: "w-3.5 h-3.5 text-emerald-600 fill-emerald-500" }),
                          " PA 1: 1-Click Si\xEAu T\u1ED1c"
                        ] }),
                        integrationSolutionTab === "quick" && /* @__PURE__ */ jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-600" })
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500 leading-tight", children: "T\u1EA1o B\u1EA3ng \u0111i\u1EC3m Google Sheets t\u1EF1 \u0111\u1ED9ng. Kh\xF4ng c\u1EA7n \u0111\u0103ng nh\u1EADp hay thao t\xE1c k\u1EF9 thu\u1EADt." })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => setIntegrationSolutionTab("link"),
                    className: `p-3 rounded-xl border text-left transition-all cursor-pointer ${integrationSolutionTab === "link" ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-200 shadow-xs" : "bg-slate-50/70 border-slate-200 hover:border-slate-300"}`,
                    children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-1", children: [
                        /* @__PURE__ */ jsxs("span", { className: "text-xs font-black text-indigo-800 flex items-center gap-1", children: [
                          /* @__PURE__ */ jsx(Share2, { className: "w-3.5 h-3.5 text-indigo-600" }),
                          " PA 2: Link Xem Zalo"
                        ] }),
                        integrationSolutionTab === "link" && /* @__PURE__ */ jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-indigo-600" })
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500 leading-tight", children: "T\u1EA1o Link b\xE1o c\xE1o g\u1EEDi Zalo cho Ban Gi\xE1m Hi\u1EC7u, GVCN ho\u1EB7c Ph\u1EE5 huynh nh\u1EA5p xem ngay." })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => setIntegrationSolutionTab("custom"),
                    className: `p-3 rounded-xl border text-left transition-all cursor-pointer ${integrationSolutionTab === "custom" ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400 shadow-xs" : "bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800"}`,
                    children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-1", children: [
                        /* @__PURE__ */ jsxs("span", { className: `text-xs font-black flex items-center gap-1 ${integrationSolutionTab === "custom" ? "text-amber-300" : "text-slate-800"}`, children: [
                          /* @__PURE__ */ jsx(Key, { className: "w-3.5 h-3.5 text-amber-400" }),
                          " PA 3: Sheet C\xE1 Nh\xE2n"
                        ] }),
                        integrationSolutionTab === "custom" && /* @__PURE__ */ jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-amber-300" })
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: `text-[10px] leading-tight ${integrationSolutionTab === "custom" ? "text-slate-300" : "text-slate-500"}`, children: "\u0110\u0103ng nh\u1EADp t\xE0i kho\u1EA3n Google c\xE1 nh\xE2n \u0111\u1EC3 \u0111\u1ED3ng b\u1ED9 tr\u1EF1c ti\u1EBFp v\xE0o Google Drive c\xE1 nh\xE2n." })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "pt-2", children: [
                integrationSolutionTab === "quick" && /* @__PURE__ */ jsxs("div", { className: "p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-xl space-y-3", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-emerald-200/80 pb-2", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsx(Zap, { className: "w-4 h-4 text-emerald-600 fill-emerald-500" }),
                      /* @__PURE__ */ jsx("span", { className: "text-xs font-black text-emerald-900 uppercase", children: "Gi\u1EA3i Ph\xE1p Li\xEAn K\u1EBFt Nhanh Qua M\xE3 Code (3 B\u01B0\u1EDBc)" })
                    ] }),
                    /* @__PURE__ */ jsx("span", { className: "text-[9px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full", children: "D\xE0nh cho GV y\u1EBFu CNTT" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]", children: [
                    /* @__PURE__ */ jsxs("div", { className: "p-2.5 bg-white rounded-xl border border-emerald-100 shadow-2xs space-y-1", children: [
                      /* @__PURE__ */ jsxs("div", { className: "font-bold text-emerald-800 flex items-center gap-1.5", children: [
                        /* @__PURE__ */ jsx("span", { className: "w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0", children: "1" }),
                        "M\xE3 K\u1EBFt N\u1ED1i Ph\xF2ng"
                      ] }),
                      /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-slate-500 leading-tight", children: [
                        "M\xE3 ph\xF2ng thi l\xE0 ",
                        /* @__PURE__ */ jsx("strong", { className: "font-mono text-indigo-600", children: selectedRoomForResults }),
                        " (t\u1EF1 \u0111\u1ED9ng l\u1EA5y theo ph\xF2ng ch\u1ECDn)."
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "p-2.5 bg-white rounded-xl border border-emerald-100 shadow-2xs space-y-1", children: [
                      /* @__PURE__ */ jsxs("div", { className: "font-bold text-emerald-800 flex items-center gap-1.5", children: [
                        /* @__PURE__ */ jsx("span", { className: "w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0", children: "2" }),
                        "X\xE1c Nh\u1EADn M\xE3"
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500 leading-tight", children: "Nh\u1EADp ho\u1EB7c gi\u1EEF nguy\xEAn m\xE3 x\xE1c nh\u1EADn \u1EDF \xF4 b\xEAn d\u01B0\u1EDBi (kh\xF4ng c\u1EA7n nh\u1EDB m\u1EADt kh\u1EA9u Google)." })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "p-2.5 bg-white rounded-xl border border-emerald-100 shadow-2xs space-y-1", children: [
                      /* @__PURE__ */ jsxs("div", { className: "font-bold text-emerald-800 flex items-center gap-1.5", children: [
                        /* @__PURE__ */ jsx("span", { className: "w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0", children: "3" }),
                        "B\u1EA5m K\xEDch Ho\u1EA1t"
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500 leading-tight", children: 'B\u1EA5m "X\xE1c Nh\u1EADn K\u1EBFt N\u1ED1i 1-Click" \u0111\u1EC3 t\u1EF1 m\u1EDF B\u1EA3ng \u0111i\u1EC3m Google Sheet t\u1EE9c th\xEC!' })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-200/60", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-1 max-w-xs", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-[11px] font-bold text-emerald-900 whitespace-nowrap", children: "M\xE3 Code:" }),
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          type: "text",
                          value: quickCodeInput || selectedRoomForResults || "EDU2026",
                          onChange: (e) => setQuickCodeInput(e.target.value.toUpperCase()),
                          placeholder: "VD: 3M835U ho\u1EB7c EDU2026",
                          className: "px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-indigo-700 w-full focus:ring-2 focus:ring-emerald-400 outline-none shadow-2xs"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: isValidGoogleSheetUrl(selectedRoomResultsData?.linkedSheetUrl) ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsxs(
                        "a",
                        {
                          href: selectedRoomResultsData.linkedSheetUrl,
                          target: "_blank",
                          rel: "noreferrer",
                          className: "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1 text-[11px]",
                          children: [
                            /* @__PURE__ */ jsx(FileSpreadsheet, { className: "w-3.5 h-3.5" }),
                            " M\u1EDF Google Sheet \u0110\xE3 K\u1EBFt N\u1ED1i \u2197"
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: handleUnlinkSheet,
                          className: "p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer",
                          title: "H\u1EE7y li\xEAn k\u1EBFt sheet n\xE0y \u0111\u1EC3 d\xE1n link kh\xE1c",
                          children: /* @__PURE__ */ jsx(Trash2, { className: "w-3.5 h-3.5" })
                        }
                      )
                    ] }) : /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: handleOneClickQuickConnectSheet,
                          disabled: isSyncingSheet,
                          className: "px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-xs flex items-center gap-1.5 text-[11px] disabled:opacity-50 cursor-pointer",
                          children: [
                            /* @__PURE__ */ jsx(Zap, { className: "w-3.5 h-3.5 fill-white" }),
                            isSyncingSheet ? "\u0110ang x\u1EED l\xFD..." : "\u26A1 X\xE1c Nh\u1EADn K\u1EBFt N\u1ED1i 1-Click (T\u1EA1o Google Sheet)"
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: handleExportResultsToExcel,
                          className: "px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold rounded-lg shadow-2xs flex items-center gap-1 text-[11px] cursor-pointer",
                          title: "T\u1EA3i b\u1EA3ng \u0111i\u1EC3m Excel v\u1EC1 m\xE1y t\xEDnh",
                          children: [
                            /* @__PURE__ */ jsx(Download, { className: "w-3.5 h-3.5" }),
                            " T\u1EA3i Excel (.xlsx)"
                          ]
                        }
                      )
                    ] }) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "pt-2 border-t border-emerald-200/50 flex flex-wrap items-center gap-2 text-[11px]", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-700 whitespace-nowrap", children: "\u{1F517} Ho\u1EB7c d\xE1n link Google Sheet c\xF3 s\u1EB5n:" }),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "url",
                        value: manualSheetUrlInput,
                        onChange: (e) => setManualSheetUrlInput(e.target.value),
                        placeholder: "https://docs.google.com/spreadsheets/d/.../edit",
                        className: "flex-1 min-w-[200px] px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleSaveCustomSheetUrl(),
                        className: "px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer",
                        children: "L\u01B0u Link"
                      }
                    )
                  ] })
                ] }),
                integrationSolutionTab === "link" && /* @__PURE__ */ jsxs("div", { className: "p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-[11px]", children: [
                  /* @__PURE__ */ jsxs("div", { className: "space-y-0.5", children: [
                    /* @__PURE__ */ jsxs("p", { className: "font-bold text-indigo-900 flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx(Share2, { className: "w-3.5 h-3.5 text-indigo-600" }),
                      " Ph\u01B0\u01A1ng \xE1n 2: Chia s\u1EBB Link B\xE1o C\xE1o Th\u1ED1ng K\xEA Zalo"
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: "text-[10px] text-indigo-700", children: "Kh\xF4ng c\u1EA7n file Excel hay Google Sheet, ng\u01B0\u1EDDi nh\u1EADn ch\u1EC9 c\u1EA7n nh\u1EA5p v\xE0o link l\xE0 xem ngay \u0111\u1ED3 th\u1ECB ph\u1ED5 \u0111i\u1EC3m." })
                  ] }),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        const url = `${window.location.origin}/?room=${selectedRoomForResults}&mode=stats`;
                        navigator.clipboard.writeText(url);
                        alert("\u{1F517} \u0110\xE3 copy Link B\xE1o C\xE1o Th\u1ED1ng K\xEA ph\xF2ng " + selectedRoomForResults + "!\nTh\u1EA7y c\xF4 g\u1EEDi qua Zalo cho BGH / GVCN \u0111\u1EC3 xem tr\u1EF1c ti\u1EBFp.");
                      },
                      className: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1 text-[11px] cursor-pointer",
                      children: [
                        /* @__PURE__ */ jsx(Copy, { className: "w-3.5 h-3.5" }),
                        " Sao Ch\xE9p Link B\xE1o C\xE1o Zalo"
                      ]
                    }
                  )
                ] }),
                integrationSolutionTab === "custom" && /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-2 text-[11px]", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxs("div", { className: "space-y-0.5", children: [
                      /* @__PURE__ */ jsxs("p", { className: "font-bold text-slate-800 flex items-center gap-1", children: [
                        /* @__PURE__ */ jsx(Key, { className: "w-3.5 h-3.5 text-amber-600" }),
                        " Ph\u01B0\u01A1ng \xE1n 3: K\u1EBFt n\u1ED1i Google Drive C\xE1 nh\xE2n"
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500", children: "Y\xEAu c\u1EA7u \u0111\u0103ng nh\u1EADp t\xE0i kho\u1EA3n Google \u0111\u1EC3 t\u1EA1o t\u1EC7p Sheet v\xE0o th\u01B0 m\u1EE5c Drive c\xE1 nh\xE2n c\u1EE7a th\u1EA7y c\xF4." })
                    ] }),
                    googleUser ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold", children: googleUser.displayName || googleUser.email }),
                      /* @__PURE__ */ jsx("button", { onClick: handleGoogleLogout, className: "text-[10px] text-rose-600 font-bold hover:underline", children: "\u0110\u0103ng xu\u1EA5t" })
                    ] }) : /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: handleGoogleLogin,
                        className: "px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer",
                        children: "\u{1F511} \u0110\u0103ng Nh\u1EADp T\xE0i Kho\u1EA3n Google"
                      }
                    )
                  ] }),
                  googleUser && /* @__PURE__ */ jsxs("div", { className: "pt-2 border-t border-slate-200 flex items-center justify-between", children: [
                    isValidGoogleSheetUrl(selectedRoomResultsData?.linkedSheetUrl) ? /* @__PURE__ */ jsxs("div", { className: "text-emerald-700 font-bold flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-600" }),
                      /* @__PURE__ */ jsx("a", { href: selectedRoomResultsData.linkedSheetUrl, target: "_blank", rel: "noreferrer", className: "underline hover:text-indigo-600", children: "M\u1EDF Google Sheet C\xE1 nh\xE2n \u2197" })
                    ] }) : /* @__PURE__ */ jsx("span", { className: "text-amber-700 font-medium", children: "\u26A0\uFE0F Ch\u01B0a li\xEAn k\u1EBFt t\u1EC7p Google Sheets c\xE1 nh\xE2n." }),
                    /* @__PURE__ */ jsx("div", { children: selectedRoomResultsData?.linkedSheetId ? /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: handleSyncExistingSheet,
                        disabled: isSyncingSheet,
                        className: "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer",
                        children: isSyncingSheet ? "\u0110ang \u0111\u1ED3ng b\u1ED9..." : "\u26A1 \u0110\u1ED3ng B\u1ED9 Trang T\xEDnh C\xE1 Nh\xE2n"
                      }
                    ) : /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: handleCreateAndLinkSheet,
                        disabled: isSyncingSheet,
                        className: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer",
                        children: isSyncingSheet ? "\u0110ang kh\u1EDFi t\u1EA1o..." : "\u{1F680} T\u1EA1o T\u1EC7p Sheet Trong Drive C\xE1 Nh\xE2n"
                      }
                    ) })
                  ] })
                ] })
              ] })
            ] }),
            isLoadingResults ? /* @__PURE__ */ jsxs("div", { className: "py-6 text-center text-slate-400", children: [
              /* @__PURE__ */ jsx(Loader2, { className: "w-6 h-6 animate-spin mx-auto text-indigo-600 mb-1" }),
              /* @__PURE__ */ jsx("p", { className: "text-[11px]", children: "\u0110ang t\u1EA3i b\xE0i n\u1ED9p..." })
            ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: !selectedRoomResultsData?.submissions || selectedRoomResultsData.submissions.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-center text-[11px] text-slate-400 py-4", children: "Ch\u01B0a c\xF3 h\u1ECDc sinh n\u1ED9p b\xE0i." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              (() => {
                const subs = selectedRoomResultsData.submissions;
                const scores = subs.map((s) => Number(s.totalScore) || 0);
                const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
                const max = Math.max(...scores).toFixed(2);
                const min = Math.min(...scores).toFixed(2);
                return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "bg-white p-2.5 rounded-xl border border-slate-200", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 font-bold block", children: "T\u1ED5ng s\u1ED1 HS" }),
                    /* @__PURE__ */ jsxs("span", { className: "text-base font-black text-slate-800", children: [
                      subs.length,
                      " em"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "bg-blue-50/50 p-2.5 rounded-xl border border-blue-100", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-blue-600 font-bold block", children: "\u0110i\u1EC3m trung b\xECnh" }),
                    /* @__PURE__ */ jsxs("span", { className: "text-base font-black text-blue-800", children: [
                      avg,
                      "\u0111"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-emerald-600 font-bold block", children: "\u0110i\u1EC3m cao nh\u1EA5t" }),
                    /* @__PURE__ */ jsxs("span", { className: "text-base font-black text-emerald-800", children: [
                      max,
                      "\u0111"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "bg-rose-50/50 p-2.5 rounded-xl border border-rose-100", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-rose-600 font-bold block", children: "\u0110i\u1EC3m th\u1EA5p nh\u1EA5t" }),
                    /* @__PURE__ */ jsxs("span", { className: "text-base font-black text-rose-800", children: [
                      min,
                      "\u0111"
                    ] })
                  ] })
                ] });
              })(),
              /* @__PURE__ */ jsxs("div", { className: "flex border-b border-slate-200 text-xs font-bold", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => setResultsViewTab("table"),
                    className: `px-3 py-1.5 border-b-2 transition-all cursor-pointer ${resultsViewTab === "table" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`,
                    children: [
                      "\u{1F4CB} Danh s\xE1ch h\u1ECDc sinh (",
                      selectedRoomResultsData.submissions.length,
                      ")"
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setResultsViewTab("analytics"),
                    className: `px-3 py-1.5 border-b-2 transition-all cursor-pointer ${resultsViewTab === "analytics" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`,
                    children: "\u{1F4CA} Bi\u1EC3u \u0111\u1ED3 th\u1ED1ng k\xEA (Recharts)"
                  }
                )
              ] }),
              resultsViewTab === "table" ? /* @__PURE__ */ jsx("div", { className: "max-h-60 overflow-y-auto space-y-1.5", children: selectedRoomResultsData.submissions.map((sub, sIdx) => /* @__PURE__ */ jsxs("div", { className: "bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("p", { className: "font-bold text-slate-800", children: [
                    sub.studentName,
                    " ",
                    /* @__PURE__ */ jsxs("span", { className: "font-normal text-slate-500", children: [
                      "(L\u1EDBp ",
                      sub.studentClass,
                      ")"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-400", children: new Date(sub.submittedAt || Date.now()).toLocaleString("vi-VN") })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxs("span", { className: "font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-sm", children: [
                    sub.totalScore,
                    "\u0111"
                  ] }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => handleDeleteSubmission(sIdx),
                      className: "p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors",
                      title: "X\xF3a b\xE0i l\xE0m c\u1EE7a h\u1ECDc sinh n\xE0y",
                      children: /* @__PURE__ */ jsx(Trash2, { className: "w-3.5 h-3.5" })
                    }
                  )
                ] })
              ] }, sIdx)) }) : /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-xl border border-slate-200 space-y-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "text-xs font-bold text-slate-800 flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsx(BarChart2, { className: "w-4 h-4 text-indigo-600" }),
                  " Ph\u1ED5 \u0111i\u1EC3m h\u1ECDc sinh (Recharts)"
                ] }),
                /* @__PURE__ */ jsx("div", { className: "h-52 w-full", children: (() => {
                  const scores = selectedRoomResultsData.submissions.map((s) => Number(s.totalScore) || 0);
                  const distribution = [
                    { range: "0 - <2", count: scores.filter((s) => s >= 0 && s < 2).length },
                    { range: "2 - <4", count: scores.filter((s) => s >= 2 && s < 4).length },
                    { range: "4 - <6", count: scores.filter((s) => s >= 4 && s < 6).length },
                    { range: "6 - <8", count: scores.filter((s) => s >= 6 && s < 8).length },
                    { range: "8 - 10", count: scores.filter((s) => s >= 8 && s <= 10).length }
                  ];
                  return /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(RechartsBarChart, { data: distribution, children: [
                    /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false, stroke: "#e2e8f0" }),
                    /* @__PURE__ */ jsx(XAxis, { dataKey: "range", tick: { fontSize: 10 }, stroke: "#64748b" }),
                    /* @__PURE__ */ jsx(YAxis, { allowDecimals: false, tick: { fontSize: 10 }, stroke: "#64748b" }),
                    /* @__PURE__ */ jsx(Tooltip, { contentStyle: { fontSize: "11px", borderRadius: "8px", border: "1px solid #cbd5e1" } }),
                    /* @__PURE__ */ jsx(Bar, { dataKey: "count", name: "S\u1ED1 h\u1ECDc sinh", fill: "#4f46e5", radius: [4, 4, 0, 0] })
                  ] }) });
                })() })
              ] })
            ] }) })
          ] })
        ] }),
        error && /* @__PURE__ */ jsxs("div", { className: "mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2", children: [
          /* @__PURE__ */ jsx(AlertCircle, { className: "w-4 h-4 mt-0.5 shrink-0" }),
          /* @__PURE__ */ jsx("span", { children: error })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col min-h-screen lg:min-h-0 lg:overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-wrap justify-between items-center gap-2.5 shrink-0 min-h-[73px]", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-base sm:text-lg font-bold text-slate-800", children: "K\u1EBFt qu\u1EA3 hi\u1EC3n th\u1ECB" }),
          /* @__PURE__ */ jsx("div", { className: "hidden sm:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs", children: LAYOUT_STYLE_OPTIONS.map((style) => /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setLayoutStyle(style.id),
              className: cn(
                "px-2.5 py-1 rounded-md font-medium transition-all",
                layoutStyle === style.id ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
              ),
              title: style.desc,
              children: style.shortTitle
            },
            style.id
          )) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-wrap items-center gap-2", children: (suggestion || worksheetQuestions.length > 0) && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            LanguageSpeechControls,
            {
              content: suggestion,
              onContentChange: (translatedContent) => setSuggestion(translatedContent),
              subject
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                if (suggestion) setSuggestion((prev) => run1ClickMathFix(prev));
                if (worksheetQuestions.length > 0) {
                  setWorksheetQuestions((prev) => prev.map((q) => ({
                    ...q,
                    content: run1ClickMathFix(q.content),
                    solution: q.solution ? run1ClickMathFix(q.solution) : q.solution,
                    explanation: q.explanation ? run1ClickMathFix(q.explanation) : q.explanation,
                    options: q.options ? q.options.map((opt) => run1ClickMathFix(opt)) : q.options
                  })));
                }
              },
              className: "flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg transition-all shadow-xs text-xs font-bold cursor-pointer active:scale-95",
              title: "T\u1EF1 \u0111\u1ED9ng s\u1EEDa l\u1ED7i r\xE1ch d\u1EA5u $, l\u1ED7i d\xEDnh ch\u1EEF v\xE0 l\u1ED7i KaTeX trong phi\u1EBFu h\u1ECDc t\u1EADp",
              children: [
                /* @__PURE__ */ jsx(Wand2, { className: "w-3.5 h-3.5 text-emerald-200 animate-pulse" }),
                /* @__PURE__ */ jsx("span", { children: "\u26A1 S\u1EEDa l\u1ED7i To\xE1n 1-Click" })
              ]
            }
          ),
          worksheetQuestions.length > 0 && /* @__PURE__ */ jsxs("div", { className: "flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => setViewMode("document"),
                className: cn(
                  "px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === "document" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                ),
                title: "Hi\u1EC3n th\u1ECB b\u1ED1 c\u1EE5c to\xE0n trang phi\u1EBFu h\u1ECDc t\u1EADp chu\u1EA9n GDPT 2018 (Kh\u1ED5 A4 in \u1EA5n / Xu\u1EA5t Word)",
                children: [
                  /* @__PURE__ */ jsx(FileText, { className: "w-3.5 h-3.5" }),
                  " B\u1EA3n in phi\u1EBFu h\u1ECDc t\u1EADp (A4)"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => setViewMode("questions"),
                className: cn(
                  "px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === "questions" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                ),
                title: "Hi\u1EC3n th\u1ECB t\u1EEBng c\xE2u h\u1ECFi k\xE8m thanh c\xF4ng c\u1EE5 ch\xE8n BBT, \u0110\u1ED3 th\u1ECB v\xE0 l\u1EDDi gi\u1EA3i chi ti\u1EBFt",
                children: [
                  /* @__PURE__ */ jsx(CheckCircle2, { className: "w-3.5 h-3.5" }),
                  " Chi ti\u1EBFt t\u1EEBng c\xE2u (",
                  worksheetQuestions.length,
                  ")"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: toggleAllSolutions,
              className: "px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer",
              title: "B\u1EADt/T\u1EAFt hi\u1EC3n th\u1ECB l\u1EDDi gi\u1EA3i chi ti\u1EBFt cho t\u1EA5t c\u1EA3 c\xE2u h\u1ECFi",
              children: /* @__PURE__ */ jsx("span", { children: showAllSolutions ? "\u{1F648} \u1EA8n t\u1EA5t c\u1EA3 l\u1EDDi gi\u1EA3i" : "\u{1F441}\uFE0F Hi\u1EC7n t\u1EA5t c\u1EA3 l\u1EDDi gi\u1EA3i" })
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleAutoGenerateAllBbtAndGraphs,
              disabled: isAutoGeneratingImages,
              className: "px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer",
              title: "T\u1EF1 \u0111\u1ED9ng qu\xE9t v\xE0 k\u1EBFt xu\u1EA5t to\xE0n b\u1ED9 B\u1EA3ng bi\u1EBFn thi\xEAn v\xE0 \u0110\u1ED3 th\u1ECB d\u01B0\u1EDBi d\u1EA1ng \u1EA3nh SVG/PNG s\u1EAFc n\xE9t (kh\xF4ng d\xF9ng m\xE3 tex)",
              children: isAutoGeneratingImages ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("div", { className: "w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" }),
                /* @__PURE__ */ jsx("span", { children: "\u0110ang xu\u1EA5t \u1EA3nh..." })
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Sparkles, { className: "w-3.5 h-3.5 text-amber-200" }),
                /* @__PURE__ */ jsx("span", { children: "\u2728 T\u1EF1 \u0111\u1ED9ng xu\u1EA5t BBT & \u0110\u1ED3 th\u1ECB \u1EA3nh" })
              ] })
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setShowInspectorModal(true),
              className: "px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95",
              title: "AI Ki\u1EC3m tra k\u1EBFt qu\u1EA3 phi\u1EBFu h\u1ECDc t\u1EADp: ki\u1EC3m tra \u0111\xFAng b\xE0i/ch\u1EE7 \u0111\u1EC1, \u0111\u1EE7 s\u1ED1 l\u01B0\u1EE3ng c\xE2u h\u1ECFi, kh\xF4ng sai s\xF3t",
              children: [
                /* @__PURE__ */ jsx(ShieldCheck, { className: "w-4 h-4 text-amber-300 animate-pulse" }),
                /* @__PURE__ */ jsx("span", { children: "\u{1F50D} AI Ki\u1EC3m Tra K\u1EBFt Qu\u1EA3" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                setDocVisualizerTab("bbt");
                setIsDocVisualizerOpen((prev) => docVisualizerTab === "bbt" ? !prev : true);
              },
              className: cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border shadow-2xs transition-colors cursor-pointer",
                isDocVisualizerOpen && docVisualizerTab === "bbt" ? "bg-emerald-600 text-white border-emerald-700" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
              ),
              title: "M\u1EDF Module B\u1EA3ng bi\u1EBFn thi\xEAn (chu\u1EA9n SGK) \u0111\u1EC3 t\u1EA1o v\xE0 ch\xE8n v\xE0o phi\u1EBFu",
              children: [
                /* @__PURE__ */ jsx(TrendingUp, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsx("span", { children: "\u{1F4C8} BBT" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                setDocVisualizerTab("graph");
                setIsDocVisualizerOpen((prev) => docVisualizerTab === "graph" ? !prev : true);
              },
              className: cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border shadow-2xs transition-colors cursor-pointer",
                isDocVisualizerOpen && docVisualizerTab === "graph" ? "bg-blue-600 text-white border-blue-700" : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300"
              ),
              title: "M\u1EDF Module \u0110\u1ED3 th\u1ECB & BPT \u0111\u1EC3 v\u1EBD v\xE0 ch\xE8n \u1EA3nh v\xE0o phi\u1EBFu",
              children: [
                /* @__PURE__ */ jsx(BarChart2, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsx("span", { children: "\u{1F4CA} \u0110\u1ED3 th\u1ECB" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                setDocVisualizerTab("geometry3d");
                setIsDocVisualizerOpen((prev) => docVisualizerTab === "geometry3d" ? !prev : true);
              },
              className: cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border shadow-2xs transition-colors cursor-pointer",
                isDocVisualizerOpen && docVisualizerTab === "geometry3d" ? "bg-purple-600 text-white border-purple-700" : "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300"
              ),
              title: "M\u1EDF Module H\xECnh h\u1ECDc kh\xF4ng gian 3D (Ch\xF3p, L\u0103ng tr\u1EE5, H\u1ED9p, N\xF3n, Tr\u1EE5, C\u1EA7u)",
              children: [
                /* @__PURE__ */ jsx(Box, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsx("span", { children: "\u{1F9CA} H\xECnh 3D" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                setDocVisualizerTab("statistics");
                setIsDocVisualizerOpen((prev) => docVisualizerTab === "statistics" ? !prev : true);
              },
              className: cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border shadow-2xs transition-colors cursor-pointer",
                isDocVisualizerOpen && docVisualizerTab === "statistics" ? "bg-amber-600 text-white border-amber-700" : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
              ),
              title: "M\u1EDF Module Bi\u1EC3u \u0111\u1ED3 & B\u1EA3ng Th\u1ED1ng k\xEA (M\u1EABu s\u1ED1 li\u1EC7u gh\xE9p nh\xF3m v\xE0 r\u1EDDi r\u1EA1c)",
              children: [
                /* @__PURE__ */ jsx(BarChart3, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsx("span", { children: "\u{1F4C9} Th\u1ED1ng k\xEA" })
              ]
            }
          ),
          viewMode === "document" && suggestion && /* @__PURE__ */ jsxs("div", { className: "flex bg-slate-100 p-1 rounded-lg border border-slate-200", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => setIsEditing(false),
                className: cn(
                  "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                  !isEditing ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
                ),
                children: [
                  /* @__PURE__ */ jsx(Eye, { className: "w-4 h-4" }),
                  " Xem tr\u01B0\u1EDBc"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => setIsEditing(true),
                className: cn(
                  "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                  isEditing ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
                ),
                children: [
                  /* @__PURE__ */ jsx(Edit3, { className: "w-4 h-4" }),
                  " Ch\u1EC9nh s\u1EEDa"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleExportPNG,
              disabled: isExportingImage,
              className: cn(
                "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
              ),
              title: "T\u1EA3i \u1EA3nh Poster s\u1EAFc n\xE9t (PNG) \u0111\u1EC3 chia s\u1EBB Zalo/Facebook ho\u1EB7c in m\xE0u",
              children: isExportingImage ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
                /* @__PURE__ */ jsx("span", { children: "\u0110ang t\u1EA1o \u1EA3nh..." })
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(ImageIcon, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsx("span", { children: "T\u1EA3i \u1EA3nh Poster (PNG)" })
              ] })
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setIsHeaderModalOpen(true),
              className: "px-3 py-1.5 sm:py-2 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer",
              title: "T\xF9y ch\u1EC9nh th\xF4ng tin Tr\u01B0\u1EDDng h\u1ECDc, H\u1ECD v\xE0 t\xEAn gi\xE1o vi\xEAn, N\u0103m h\u1ECDc 2026 - 2027 xu\u1EA5t hi\u1EC7n \u1EDF \u0111\u1EA7u phi\u1EBFu...",
              children: [
                /* @__PURE__ */ jsx(School, { className: "w-4 h-4 text-emerald-600" }),
                /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "Ti\xEAu \u0111\u1EC1 (Tr\u01B0\u1EDDng, GV, 2026-2027)" }),
                /* @__PURE__ */ jsx("span", { className: "sm:hidden", children: "Ti\xEAu \u0111\u1EC1" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleExportPDF,
              className: cn(
                "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-800"
              ),
              title: "In tr\u1EF1c ti\u1EBFp ho\u1EB7c L\u01B0u file PDF chu\u1EA9n A4/A3",
              children: [
                /* @__PURE__ */ jsx(Printer, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsx("span", { children: "In / PDF" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleExportWord,
              className: cn(
                "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
              ),
              title: isEditing ? "Chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 xem tr\u01B0\u1EDBc \u0111\u1EC3 t\u1EA3i xu\u1ED1ng" : "Xu\u1EA5t file Word .docx chu\u1EA9n font v\xE0 b\u1EA3ng bi\u1EC3u",
              children: [
                /* @__PURE__ */ jsx(Download, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsx("span", { children: "Xu\u1EA5t Word" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleExportWordImage,
              className: cn(
                "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700"
              ),
              title: "Xu\u1EA5t file Word v\u1EDBi to\xE0n b\u1ED9 B\u1EA3ng bi\u1EBFn thi\xEAn, \u0110\u1ED3 th\u1ECB v\xE0 c\xF4ng th\u1EE9c to\xE1n h\u1ECDc d\u01B0\u1EDBi d\u1EA1ng \u1EA3nh ch\u1EA5t l\u01B0\u1EE3ng cao (kh\xF4ng lo l\u1ED7i font/l\u1ED7i tex)",
              children: [
                /* @__PURE__ */ jsx(Download, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsx("span", { children: "Word (\u1EA2nh)" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleExportWordLatex,
              className: cn(
                "hidden xl:flex px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg items-center gap-1.5 shadow-xs transition-colors",
                isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              ),
              title: isEditing ? "Chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 xem tr\u01B0\u1EDBc \u0111\u1EC3 t\u1EA3i xu\u1ED1ng" : "Xu\u1EA5t Word gi\u1EEF nguy\xEAn m\xE3 LaTeX \u0111\u1EC3 d\xF9ng ch\u1EE9c n\u0103ng Toggle TeX c\u1EE7a MathType",
              children: [
                /* @__PURE__ */ jsx(Download, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsx("span", { children: "Word (LaTeX)" })
              ]
            }
          )
        ] }) })
      ] }),
      (suggestion || worksheetQuestions.length > 0) && /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs shrink-0", children: [
        /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-700 flex items-center gap-1", children: "\u{1F4C4} Ch\u1EBF \u0111\u1ED9 In & Xu\u1EA5t file:" }),
        /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-1.5 cursor-pointer", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "radio",
              name: "worksheet-solution-mode",
              checked: includeDetailedSolution,
              onChange: () => setIncludeDetailedSolution(true),
              className: "w-4 h-4 text-emerald-600 focus:ring-emerald-500"
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "font-bold text-emerald-800", children: "K\xE8m theo l\u1EDDi gi\u1EA3i chi ti\u1EBFt (B\u1EA3n d\xE0nh cho Gi\xE1o vi\xEAn)" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-1.5 cursor-pointer", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "radio",
              name: "worksheet-solution-mode",
              checked: !includeDetailedSolution,
              onChange: () => setIncludeDetailedSolution(false),
              className: "w-4 h-4 text-slate-600 focus:ring-slate-500"
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "font-medium text-slate-600", children: "Kh\xF4ng k\xE8m l\u1EDDi gi\u1EA3i chi ti\u1EBFt (B\u1EA3n d\xE0nh cho H\u1ECDc sinh)" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8", children: isLoading ? /* @__PURE__ */ jsxs("div", { className: "h-full min-h-[400px] flex flex-col items-center justify-center space-y-4", children: [
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" }),
        /* @__PURE__ */ jsxs("div", { className: "text-emerald-700 font-bold text-base", children: [
          "\u0110ang kh\u1EDFi t\u1EA1o phi\u1EBFu h\u1ECDc t\u1EADp phong c\xE1ch ",
          LAYOUT_STYLE_OPTIONS.find((s) => s.id === layoutStyle)?.title,
          "..."
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-slate-500 text-sm max-w-sm text-center", children: "AI \u0111ang c\u1EA5u tr\xFAc h\xF3a ki\u1EBFn th\u1EE9c tr\u1ECDng t\xE2m, b\xE0i to\xE1n th\u1EF1c t\u1EBF v\xE0 l\u1EDDi gi\u1EA3i chi ti\u1EBFt. Vui l\xF2ng \u0111\u1EE3i trong gi\xE2y l\xE1t..." })
      ] }) : /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto", children: (() => {
        const SOLUTION_DELIMITER_REGEX = /(?:(?:^|\n)\s*---+\s*(?:HƯỚNG DẪN CHẤM|ĐÁP ÁN|LỜI GIẢI|HƯỚNG DẪN GIẢI|BẢNG ĐÁP ÁN)[^\n]*(?:---+)?\s*(?:\n|$)|(?:^|\n)\s*(?:#{1,4}|\*{2,3})\s*(?:(?:PHẦN|Phần)\s*(?:[1-5]|I{1,3}|IV|V)\s*[:.]?\s*)?(?:[1-5]|I{1,3}|IV|V)?\.?\s*(?:HƯỚNG DẪN CHẤM|ĐÁP ÁN|LỜI GIẢI|HƯỚNG DẪN GIẢI|BẢNG ĐÁP ÁN)\b[^\n]*(?:\n|$))/i;
        let mainDocContent = suggestion;
        let solutionDocContent = "";
        const detailsMatch = suggestion ? suggestion.match(/<details(?:\s+class=["\']solution-box["\'])?[^>]*>([\s\S]*?)<\/details>/i) : null;
        if (detailsMatch) {
          const startIndex = suggestion.indexOf(detailsMatch[0]);
          mainDocContent = suggestion.substring(0, startIndex).trim();
          let detailsInner = detailsMatch[1];
          detailsInner = detailsInner.replace(/<summary[\s\S]*?<\/summary>/i, "").trim();
          solutionDocContent = detailsInner;
        } else {
          const delimiterMatch = suggestion ? suggestion.match(SOLUTION_DELIMITER_REGEX) : null;
          if (delimiterMatch && delimiterMatch.index !== void 0) {
            mainDocContent = suggestion.substring(0, delimiterMatch.index).trim();
            solutionDocContent = suggestion.substring(delimiterMatch.index).trim();
          }
        }
        if (!includeDetailedSolution) {
          mainDocContent = mainDocContent.replace(/<details[\s\S]*?<\/details>/gi, "").trim();
          solutionDocContent = "";
        }
        mainDocContent = cleanDocumentContent(mainDocContent, customLessonName);
        if (solutionDocContent) {
          solutionDocContent = cleanDocumentContent(solutionDocContent, customLessonName);
        }
        if (viewMode === "questions" && worksheetQuestions.length > 0) {
          return /* @__PURE__ */ jsxs(
            "div",
            {
              ref: exportRef,
              style: {
                fontFamily: "'Times New Roman', 'Tinos', 'Liberation Serif', 'Be Vietnam Pro', Georgia, serif"
              },
              className: "bg-white p-8 md:p-12 shadow-sm border border-slate-300 rounded-xl min-h-[500px] font-serif text-slate-900 max-w-[210mm] mx-auto space-y-6 text-[15px] leading-relaxed",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "border-2 border-slate-800 mb-6 p-4 bg-white text-xs sm:text-sm text-slate-800 leading-normal", children: [
                  /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 pb-3 border-b border-slate-300", children: [
                    /* @__PURE__ */ jsxs("div", { className: "text-center font-bold", children: [
                      /* @__PURE__ */ jsx("div", { className: "uppercase text-[11px] sm:text-xs tracking-wider text-slate-700", children: headerConfig.department || "S\u1EDE GI\xC1O D\u1EE4C V\xC0 \u0110\xC0O T\u1EA0O" }),
                      /* @__PURE__ */ jsx("div", { className: "uppercase text-[12px] sm:text-sm text-slate-900 font-extrabold", children: headerConfig.schoolName ? `TR\u01AF\u1EDCNG: ${headerConfig.schoolName}` : "TR\u01AF\u1EDCNG THPT: ................................................" }),
                      /* @__PURE__ */ jsx("div", { className: "text-[11px] font-semibold text-slate-600 uppercase", children: headerConfig.subjectGroup || `T\u1ED4 CHUY\xCAN M\xD4N: ${subject || "TO\xC1N - TIN H\u1ECCC"}` }),
                      /* @__PURE__ */ jsx("div", { className: "text-[11px] font-semibold text-slate-800 mt-0.5", children: headerConfig.teacherName ? `Gi\xE1o vi\xEAn: ${headerConfig.teacherName}` : "Gi\xE1o vi\xEAn: ................................................" }),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => setIsHeaderModalOpen(true),
                          className: "no-print mt-1 text-[10px] text-emerald-600 hover:text-emerald-800 underline font-normal cursor-pointer flex items-center justify-center gap-1 mx-auto",
                          children: "\u270F\uFE0F Ch\u1EC9nh s\u1EEDa th\xF4ng tin Tr\u01B0\u1EDDng / GV / N\u0103m h\u1ECDc"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
                      /* @__PURE__ */ jsx("div", { className: "font-black uppercase text-slate-900 text-sm sm:text-base tracking-wide", children: "PHI\u1EBEU H\u1ECCC T\u1EACP" }),
                      /* @__PURE__ */ jsx("div", { className: "font-bold text-emerald-800 text-xs sm:text-sm mt-0.5 uppercase", children: getFormattedLessonTitle(customLessonName) }),
                      /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-slate-600 mt-0.5", children: [
                        "M\xF4n: ",
                        subject,
                        " \u2022 L\u1EDBp ",
                        selectedGrade,
                        " \u2022 N\u0103m h\u1ECDc ",
                        headerConfig.schoolYear || "2026 - 2027"
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-dashed border-slate-300 text-xs sm:text-sm", children: [
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "H\u1ECD v\xE0 t\xEAn h\u1ECDc sinh:" }),
                      " ................................................."
                    ] }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "L\u1EDBp:" }),
                      " .................... ",
                      /* @__PURE__ */ jsx("span", { className: "font-semibold ml-2", children: "STT:" }),
                      " ......"
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "sm:text-right", children: [
                      /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Ng\xE0y n\u1ED9p:" }),
                      " ...... / ...... / 202..."
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2 pt-2.5 items-stretch", children: [
                    /* @__PURE__ */ jsxs("div", { className: "col-span-3 border border-slate-700 p-2 text-center rounded bg-slate-50 flex flex-col justify-center", children: [
                      /* @__PURE__ */ jsx("span", { className: "font-bold block text-[11px] uppercase text-slate-700", children: "\u0110I\u1EC2M S\u1ED0" }),
                      /* @__PURE__ */ jsx("span", { className: "text-base font-bold text-slate-400 italic mt-0.5", children: "......... / 10" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "col-span-9 pl-3 border-l border-slate-200", children: [
                      /* @__PURE__ */ jsx("span", { className: "font-bold block text-slate-800 text-xs", children: "L\u1EDDi ph\xEA & Nh\u1EADn x\xE9t c\u1EE7a Th\u1EA7y / C\xF4:" }),
                      /* @__PURE__ */ jsx("div", { className: "border-b border-dotted border-slate-400 mt-2 h-4" }),
                      /* @__PURE__ */ jsx("div", { className: "border-b border-dotted border-slate-400 mt-2.5 h-4" })
                    ] })
                  ] })
                ] }),
                mainDocContent && /* @__PURE__ */ jsx("div", { className: "mb-6 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl no-print", children: /* @__PURE__ */ jsxs("details", { className: "group", children: [
                  /* @__PURE__ */ jsxs("summary", { className: "font-bold text-emerald-900 cursor-pointer list-none flex items-center justify-between text-sm", children: [
                    /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsx(BookOpen, { className: "w-4 h-4 text-emerald-700" }),
                      /* @__PURE__ */ jsx("span", { children: "\u{1F4DA} Xem M\u1EE5c ti\xEAu & Ki\u1EBFn th\u1EE9c tr\u1ECDng t\xE2m c\u1EE7a phi\u1EBFu h\u1ECDc t\u1EADp" })
                    ] }),
                    /* @__PURE__ */ jsx("span", { className: "text-xs text-emerald-700 group-open:rotate-180 transition-transform", children: "\u25BC" })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "mt-3 pt-3 border-t border-emerald-200/80 text-slate-800 text-sm prose max-w-none", children: /* @__PURE__ */ jsx(MathView, { content: mainDocContent }) })
                ] }) }),
                /* @__PURE__ */ jsx("div", { className: "space-y-6", children: worksheetQuestions.map((q, idx) => /* @__PURE__ */ jsxs("div", { className: "pb-4 border-b border-slate-200 last:border-0 relative", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-2.5 no-print", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsxs("span", { className: "font-bold text-slate-900 text-sm", children: [
                        "C\xE2u ",
                        idx + 1,
                        ":"
                      ] }),
                      q.level && /* @__PURE__ */ jsxs("span", { className: "text-xs text-emerald-600 font-medium px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200", children: [
                        "[",
                        q.level,
                        "]"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 flex-wrap", children: [
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "content") {
                              setActiveVisualizer(null);
                            } else {
                              setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "content" });
                            }
                          },
                          className: `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-colors cursor-pointer ${activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "content" ? "bg-emerald-600 text-white border-emerald-700" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"}`,
                          title: "T\xEDch h\u1EE3p Module BBT: Ch\xE8n B\u1EA3ng bi\u1EBFn thi\xEAn (d\u1EA1ng \u1EA3nh SVG chu\u1EA9n SGK) v\xE0o c\xE2u h\u1ECFi",
                          children: [
                            /* @__PURE__ */ jsx(TrendingUp, { className: "w-3.5 h-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: "+ BBT" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "content") {
                              setActiveVisualizer(null);
                            } else {
                              setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" });
                            }
                          },
                          className: `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-colors cursor-pointer ${activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "content" ? "bg-blue-600 text-white border-blue-700" : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300"}`,
                          title: "T\xEDch h\u1EE3p Module \u0110\u1ED3 th\u1ECB: Ch\xE8n \u0110\u1ED3 th\u1ECB & BPT (d\u1EA1ng \u1EA3nh \u0111\u1ED3 h\u1ECDa) v\xE0o c\xE2u h\u1ECFi",
                          children: [
                            /* @__PURE__ */ jsx(BarChart2, { className: "w-3.5 h-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: "+ \u0110\u1ED3 th\u1ECB" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "content") {
                              setActiveVisualizer(null);
                            } else {
                              setActiveVisualizer({ qIndex: idx, tab: "geometry3d", target: "content" });
                            }
                          },
                          className: `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-colors cursor-pointer ${activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "content" ? "bg-purple-600 text-white border-purple-700" : "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300"}`,
                          title: "T\xEDch h\u1EE3p Module H\xECnh h\u1ECDc kh\xF4ng gian 3D: Ch\xF3p, L\u0103ng tr\u1EE5, H\u1ED9p, N\xF3n, Tr\u1EE5, C\u1EA7u",
                          children: [
                            /* @__PURE__ */ jsx(Box, { className: "w-3.5 h-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: "+ H\xECnh 3D" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "content") {
                              setActiveVisualizer(null);
                            } else {
                              setActiveVisualizer({ qIndex: idx, tab: "statistics", target: "content" });
                            }
                          },
                          className: `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-colors cursor-pointer ${activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "content" ? "bg-amber-600 text-white border-amber-700" : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"}`,
                          title: "T\xEDch h\u1EE3p Module Th\u1ED1ng k\xEA: Ch\xE8n Bi\u1EC3u \u0111\u1ED3 ho\u1EB7c B\u1EA3ng t\u1EA7n s\u1ED1",
                          children: [
                            /* @__PURE__ */ jsx(BarChart3, { className: "w-3.5 h-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: "+ Th\u1ED1ng k\xEA" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => handleAiFixBbtForWorksheetQuestion(q, idx),
                          className: "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs transition-colors cursor-pointer",
                          title: "AI t\u1EF1 \u0111\u1ED9ng ph\xE2n t\xEDch h\xE0m s\u1ED1 v\xE0 v\u1EBD BBT d\u1EA1ng \u1EA3nh SVG chu\u1EA9n SGK",
                          children: [
                            /* @__PURE__ */ jsx(Sparkles, { className: "w-3.5 h-3.5 text-amber-600" }),
                            /* @__PURE__ */ jsx("span", { children: "\u2728 AI v\u1EBD BBT \u1EA3nh" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "ai_sim" && activeVisualizer?.target === "content") {
                              setActiveVisualizer(null);
                            } else {
                              setActiveVisualizer({ qIndex: idx, tab: "ai_sim", target: "content" });
                            }
                          },
                          className: `inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border shadow-2xs transition-colors cursor-pointer ${activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "ai_sim" && activeVisualizer?.target === "content" ? "bg-purple-600 text-white border-purple-700" : "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300"}`,
                          title: "AI V\u1EBD h\xECnh m\xF4 ph\u1ECFng sinh \u0111\u1ED9ng t\u1EEB \u0111\u1EC1 b\xE0i (Flat Design SVG)",
                          children: [
                            /* @__PURE__ */ jsx(Sparkles, { className: "w-3.5 h-3.5 text-purple-600" }),
                            /* @__PURE__ */ jsx("span", { children: "\u2728 AI M\xF4 ph\u1ECFng" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => setEditingQuestion({ question: q, index: idx }),
                          className: "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer",
                          title: "Ch\u1EC9nh s\u1EEDa chi ti\u1EBFt n\u1ED9i dung, ph\u01B0\u01A1ng \xE1n v\xE0 l\u1EDDi gi\u1EA3i c\xE2u h\u1ECFi",
                          children: [
                            /* @__PURE__ */ jsx(Edit3, { className: "w-3 h-3 text-slate-500" }),
                            /* @__PURE__ */ jsx("span", { children: "S\u1EEDa" })
                          ]
                        }
                      )
                    ] })
                  ] }),
                  isMissingBbt(q.content || q.question) && /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between p-2.5 my-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 shadow-2xs gap-2 no-print", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 font-medium", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-base", children: "\u26A0\uFE0F" }),
                      /* @__PURE__ */ jsxs("span", { children: [
                        "\u0110\u1EC1 b\xE0i nh\u1EAFc \u0111\u1EBFn ",
                        /* @__PURE__ */ jsx("strong", { children: "B\u1EA3ng bi\u1EBFn thi\xEAn" }),
                        " nh\u01B0ng ch\u01B0a c\xF3 b\u1EA3ng/h\xECnh hi\u1EC3n th\u1ECB."
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "content" }),
                          className: "px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors",
                          title: "M\u1EDF Module B\u1EA3ng bi\u1EBFn thi\xEAn \u0111\u1EC3 ch\u1ECDn m\u1EABu ho\u1EB7c tinh ch\u1EC9nh v\xE0 ch\xE8n v\xE0o c\xE2u h\u1ECFi",
                          children: [
                            /* @__PURE__ */ jsx(TrendingUp, { className: "w-3.5 h-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: "\u{1F4C8} M\u1EDF Module BBT & Ch\u1ECDn" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => handleAiFixBbtForWorksheetQuestion(q, idx),
                          className: "px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors",
                          title: "T\u1EF1 \u0111\u1ED9ng v\u1EBD BBT d\u1EA1ng \u1EA3nh SVG chu\u1EA9n SGK",
                          children: /* @__PURE__ */ jsx("span", { children: "\u2728 T\u1EF1 \u0111\u1ED9ng xu\u1EA5t BBT \u1EA3nh" })
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => setEditingQuestion({ question: q, index: idx }),
                          className: "px-2 py-1 bg-white hover:bg-slate-100 text-amber-800 border border-amber-300 rounded-md font-medium cursor-pointer",
                          children: /* @__PURE__ */ jsx("span", { children: "\u270F\uFE0F T\u1EF1 ch\xE8n BBT" })
                        }
                      )
                    ] })
                  ] }),
                  isMissingGraph(q.content || q.question) && /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between p-2.5 my-2 bg-blue-50 border border-blue-300 rounded-lg text-xs text-blue-900 shadow-2xs gap-2 no-print", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 font-medium", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-base", children: "\u{1F4CA}" }),
                      /* @__PURE__ */ jsxs("span", { children: [
                        "\u0110\u1EC1 b\xE0i nh\u1EAFc \u0111\u1EBFn ",
                        /* @__PURE__ */ jsx("strong", { children: "\u0110\u1ED3 th\u1ECB / H\xECnh v\u1EBD" }),
                        " nh\u01B0ng ch\u01B0a c\xF3 h\xECnh hi\u1EC3n th\u1ECB."
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" }),
                          className: "px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors",
                          title: "M\u1EDF Module \u0110\u1ED3 th\u1ECB \u0111\u1EC3 v\u1EBD v\xE0 ch\xE8n h\xECnh v\xE0o c\xE2u h\u1ECFi",
                          children: [
                            /* @__PURE__ */ jsx(BarChart2, { className: "w-3.5 h-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: "\u{1F4CA} M\u1EDF Module \u0110\u1ED3 th\u1ECB & Ch\xE8n" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => handleAutoGenerateGraphForWorksheetQuestion(q, idx),
                          className: "px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors",
                          children: /* @__PURE__ */ jsx("span", { children: "\u2728 T\u1EF1 \u0111\u1ED9ng xu\u1EA5t \u0110\u1ED3 th\u1ECB \u1EA3nh" })
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "font-medium text-slate-800 mb-3 flex items-start gap-2", children: [
                    /* @__PURE__ */ jsxs("span", { className: "font-bold whitespace-nowrap mt-1", children: [
                      "C\xE2u ",
                      idx + 1,
                      ":"
                    ] }),
                    /* @__PURE__ */ jsx(MathView, { className: "inline-block flex-1", content: cleanQuestionStem(q.content || q.question || "", q.options, q.tfStatements) }),
                    q.level && /* @__PURE__ */ jsxs("span", { className: "text-xs text-emerald-600 font-normal mt-1 shrink-0", children: [
                      "[",
                      q.level,
                      "]"
                    ] })
                  ] }),
                  q.type === "tf" && q.tfStatements && /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2 pl-4 mb-3", children: q.tfStatements.map((stmt, sIdx) => /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-1 p-2 rounded-md bg-slate-50 border border-slate-200 text-sm", children: [
                    /* @__PURE__ */ jsx("span", { className: "shrink-0 font-medium", children: ["a)", "b)", "c)", "d)"][sIdx] || String.fromCharCode(97 + sIdx) + ")" }),
                    /* @__PURE__ */ jsx("span", { className: "flex-1", children: /* @__PURE__ */ jsx(MathView, { content: stmt.statement || "" }) }),
                    includeDetailedSolution && /* @__PURE__ */ jsx("span", { className: `shrink-0 font-bold px-2 rounded text-xs ${stmt.correct ? "text-emerald-700 bg-emerald-100" : "text-red-700 bg-red-100"}`, children: stmt.correct ? "\u0110" : "S" })
                  ] }, sIdx)) }),
                  q.type === "mc" && q.options && (() => {
                    const cleanedOpts = q.options.map((opt) => cleanOptionText(opt));
                    const maxLen = Math.max(...cleanedOpts.map((o) => (o || "").length), 0);
                    const gridCols = maxLen <= 18 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4" : maxLen <= 45 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1";
                    return /* @__PURE__ */ jsx("div", { className: cn("w-full grid gap-2 pl-2 mt-2 mb-3", gridCols), children: cleanedOpts.map((opt, oIdx) => /* @__PURE__ */ jsxs("div", { className: cn(
                      "min-h-[38px] flex items-center px-3.5 py-1.5 text-left rounded-lg border text-sm break-words overflow-hidden",
                      includeDetailedSolution && oIdx === q.correctOptionIndex ? "bg-emerald-50 border-emerald-300 font-medium text-emerald-950" : "bg-slate-50/50 border-slate-200/80 text-slate-800"
                    ), children: [
                      /* @__PURE__ */ jsxs("span", { className: "shrink-0 font-bold select-none min-w-[1.75rem] whitespace-nowrap text-slate-900", children: [
                        String.fromCharCode(65 + oIdx),
                        "."
                      ] }),
                      /* @__PURE__ */ jsx("span", { className: "flex-1 break-words overflow-hidden", children: /* @__PURE__ */ jsx(MathView, { inline: true, content: opt }) })
                    ] }, oIdx)) });
                  })(),
                  q.type === "mc" && includeDetailedSolution && q.correctOptionIndex !== void 0 && q.correctOptionIndex >= 0 && /* @__PURE__ */ jsxs("div", { className: "mt-1 mb-3 pl-4 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-sm flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-semibold text-emerald-800", children: "\u0110\xE1p \xE1n \u0111\xFAng:" }),
                    /* @__PURE__ */ jsx("span", { className: "font-bold text-base text-emerald-900 px-2.5 py-0.5 rounded bg-emerald-100 border border-emerald-300", children: String.fromCharCode(65 + q.correctOptionIndex) })
                  ] }),
                  q.type !== "mc" && q.type !== "tf" && q.correctAnswer && includeDetailedSolution && /* @__PURE__ */ jsxs("div", { className: "mt-2 pl-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-semibold text-emerald-800", children: "\u0110\xE1p \xE1n:" }),
                    " ",
                    /* @__PURE__ */ jsx(MathView, { inline: true, content: q.correctAnswer || "" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "mt-3 pl-2 no-print", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => toggleSolution(q.id || idx + 1),
                          className: "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer",
                          children: /* @__PURE__ */ jsx("span", { children: isSolutionOpen(q.id || idx + 1) ? "\u{1F648} \u1EA8n l\u1EDDi gi\u1EA3i" : "\u{1F4A1} Xem l\u1EDDi gi\u1EA3i chi ti\u1EBFt" })
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                            if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "solution") {
                              setActiveVisualizer(null);
                            } else {
                              setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "solution" });
                            }
                          },
                          className: `inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "solution" ? "bg-emerald-600 text-white border-emerald-700" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"}`,
                          title: "T\xEDch h\u1EE3p Module BBT: Ch\xE8n B\u1EA3ng bi\u1EBFn thi\xEAn (d\u1EA1ng \u1EA3nh SVG chu\u1EA9n SGK) v\xE0o l\u1EDDi gi\u1EA3i chi ti\u1EBFt",
                          children: [
                            /* @__PURE__ */ jsx(TrendingUp, { className: "w-3.5 h-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: "+ BBT v\xE0o l\u1EDDi gi\u1EA3i" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                            if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "solution") {
                              setActiveVisualizer(null);
                            } else {
                              setActiveVisualizer({ qIndex: idx, tab: "graph", target: "solution" });
                            }
                          },
                          className: `inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "solution" ? "bg-blue-600 text-white border-blue-700" : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300"}`,
                          title: "T\xEDch h\u1EE3p Module \u0110\u1ED3 th\u1ECB: Ch\xE8n \u0110\u1ED3 th\u1ECB & BPT (d\u1EA1ng \u1EA3nh \u0111\u1ED3 h\u1ECDa) v\xE0o l\u1EDDi gi\u1EA3i chi ti\u1EBFt",
                          children: [
                            /* @__PURE__ */ jsx(BarChart2, { className: "w-3.5 h-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: "+ \u0110\u1ED3 th\u1ECB v\xE0o l\u1EDDi gi\u1EA3i" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                            if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "solution") {
                              setActiveVisualizer(null);
                            } else {
                              setActiveVisualizer({ qIndex: idx, tab: "geometry3d", target: "solution" });
                            }
                          },
                          className: `inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "solution" ? "bg-purple-600 text-white border-purple-700" : "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300"}`,
                          title: "T\xEDch h\u1EE3p Module H\xECnh kh\xF4ng gian 3D: Ch\xE8n h\xECnh ch\xF3p, l\u0103ng tr\u1EE5, n\xF3n, tr\u1EE5, c\u1EA7u v\xE0o l\u1EDDi gi\u1EA3i",
                          children: [
                            /* @__PURE__ */ jsx(Box, { className: "w-3.5 h-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: "+ H\xECnh 3D v\xE0o l\u1EDDi gi\u1EA3i" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                            if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "solution") {
                              setActiveVisualizer(null);
                            } else {
                              setActiveVisualizer({ qIndex: idx, tab: "statistics", target: "solution" });
                            }
                          },
                          className: `inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "solution" ? "bg-amber-600 text-white border-amber-700" : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"}`,
                          title: "T\xEDch h\u1EE3p Module Th\u1ED1ng k\xEA: Ch\xE8n Bi\u1EC3u \u0111\u1ED3 ho\u1EB7c B\u1EA3ng t\u1EA7n s\u1ED1 v\xE0o l\u1EDDi gi\u1EA3i",
                          children: [
                            /* @__PURE__ */ jsx(BarChart3, { className: "w-3.5 h-3.5" }),
                            /* @__PURE__ */ jsx("span", { children: "+ Th\u1ED1ng k\xEA v\xE0o l\u1EDDi gi\u1EA3i" })
                          ]
                        }
                      )
                    ] }),
                    isSolutionOpen(q.id || idx + 1) && /* @__PURE__ */ jsxs(
                      "div",
                      {
                        style: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px", marginTop: "8px" },
                        className: "text-slate-800 text-sm leading-relaxed",
                        children: [
                          /* @__PURE__ */ jsxs("div", { className: "font-bold text-slate-900 mb-1.5 flex items-center justify-between", children: [
                            /* @__PURE__ */ jsx("div", { className: "flex items-center gap-1.5", children: /* @__PURE__ */ jsx("span", { children: "\u{1F4A1} L\u1EDDi gi\u1EA3i chi ti\u1EBFt:" }) }),
                            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-xs flex-wrap", children: [
                              /* @__PURE__ */ jsxs(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "solution" }),
                                  className: "text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-0.5 rounded bg-emerald-100/70 border border-emerald-200 cursor-pointer flex items-center gap-1 shadow-2xs",
                                  title: "M\u1EDF Module BBT \u0111\u1EC3 ch\xE8n v\xE0o l\u1EDDi gi\u1EA3i",
                                  children: [
                                    /* @__PURE__ */ jsx(TrendingUp, { className: "w-3 h-3" }),
                                    /* @__PURE__ */ jsx("span", { children: "M\u1EDF BBT" })
                                  ]
                                }
                              ),
                              /* @__PURE__ */ jsxs(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setActiveVisualizer({ qIndex: idx, tab: "graph", target: "solution" }),
                                  className: "text-blue-700 hover:text-blue-900 font-semibold px-2 py-0.5 rounded bg-blue-100/70 border border-blue-200 cursor-pointer flex items-center gap-1 shadow-2xs",
                                  title: "M\u1EDF Module \u0110\u1ED3 th\u1ECB \u0111\u1EC3 ch\xE8n v\xE0o l\u1EDDi gi\u1EA3i",
                                  children: [
                                    /* @__PURE__ */ jsx(BarChart2, { className: "w-3 h-3" }),
                                    /* @__PURE__ */ jsx("span", { children: "M\u1EDF \u0110\u1ED3 th\u1ECB" })
                                  ]
                                }
                              ),
                              /* @__PURE__ */ jsxs(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setActiveVisualizer({ qIndex: idx, tab: "geometry3d", target: "solution" }),
                                  className: "text-purple-700 hover:text-purple-900 font-semibold px-2 py-0.5 rounded bg-purple-100/70 border border-purple-200 cursor-pointer flex items-center gap-1 shadow-2xs",
                                  title: "M\u1EDF Module H\xECnh 3D \u0111\u1EC3 ch\xE8n v\xE0o l\u1EDDi gi\u1EA3i",
                                  children: [
                                    /* @__PURE__ */ jsx(Box, { className: "w-3 h-3" }),
                                    /* @__PURE__ */ jsx("span", { children: "M\u1EDF H\xECnh 3D" })
                                  ]
                                }
                              ),
                              /* @__PURE__ */ jsxs(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setActiveVisualizer({ qIndex: idx, tab: "statistics", target: "solution" }),
                                  className: "text-amber-700 hover:text-amber-900 font-semibold px-2 py-0.5 rounded bg-amber-100/70 border border-amber-200 cursor-pointer flex items-center gap-1 shadow-2xs",
                                  title: "M\u1EDF Module Th\u1ED1ng k\xEA \u0111\u1EC3 ch\xE8n v\xE0o l\u1EDDi gi\u1EA3i",
                                  children: [
                                    /* @__PURE__ */ jsx(BarChart3, { className: "w-3 h-3" }),
                                    /* @__PURE__ */ jsx("span", { children: "M\u1EDF Th\u1ED1ng k\xEA" })
                                  ]
                                }
                              ),
                              /* @__PURE__ */ jsxs(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setActiveVisualizer({ qIndex: idx, tab: "ai_sim", target: "solution" }),
                                  className: "text-purple-700 hover:text-purple-900 font-semibold px-2 py-0.5 rounded bg-purple-100/70 border border-purple-200 cursor-pointer flex items-center gap-1 shadow-2xs",
                                  title: "M\u1EDF Module AI M\xF4 ph\u1ECFng \u0111\u1EC3 v\u1EBD h\xECnh v\xE0o l\u1EDDi gi\u1EA3i",
                                  children: [
                                    /* @__PURE__ */ jsx(Sparkles, { className: "w-3 h-3 text-purple-600" }),
                                    /* @__PURE__ */ jsx("span", { children: "M\u1EDF AI M\xF4 ph\u1ECFng" })
                                  ]
                                }
                              )
                            ] })
                          ] }),
                          /* @__PURE__ */ jsx("div", { className: "text-slate-800", children: /* @__PURE__ */ jsx(MathView, { content: q.solution || q.explanation || "Ch\u01B0a c\xF3 l\u1EDDi gi\u1EA3i chi ti\u1EBFt cho c\xE2u h\u1ECFi n\xE0y." }) })
                        ]
                      }
                    )
                  ] }),
                  activeVisualizer?.qIndex === idx && /* @__PURE__ */ jsx("div", { className: "mt-3 no-print", children: /* @__PURE__ */ jsx(
                    QuestionVisualizerPanel,
                    {
                      questionNumber: idx + 1,
                      questionContent: q.content || q.question,
                      solutionContent: q.solution || q.explanation,
                      defaultTab: activeVisualizer.tab,
                      defaultTarget: activeVisualizer.target,
                      onInsertSnippet: (target, snippet) => handleInsertVisualizerSnippet(idx, target, snippet),
                      onClose: () => setActiveVisualizer(null)
                    }
                  ) }),
                  includeDetailedSolution && (q.solution || q.explanation) && /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: "export-solution-block",
                      style: {
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "8pt 10pt",
                        marginTop: "6pt",
                        marginBottom: "8pt",
                        pageBreakInside: "avoid"
                      },
                      children: [
                        /* @__PURE__ */ jsx("div", { style: { fontWeight: "bold", color: "#0f172a", marginBottom: "3pt", fontSize: "11pt" }, children: "\u{1F4A1} L\u1EDDi gi\u1EA3i chi ti\u1EBFt:" }),
                        /* @__PURE__ */ jsx("div", { style: { fontSize: "11pt", color: "#1e293b" }, children: /* @__PURE__ */ jsx(MarkdownRenderer, { className: "markdown-body inline-block", content: fixMath(q.solution || q.explanation || "") }) })
                      ]
                    }
                  )
                ] }, idx)) })
              ]
            }
          );
        }
        if (suggestion) {
          return isEditing ? /* @__PURE__ */ jsx(
            "textarea",
            {
              className: "w-full h-[70vh] min-h-[500px] p-6 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm bg-white",
              value: suggestion,
              onChange: (e) => setSuggestion(e.target.value)
            }
          ) : /* @__PURE__ */ jsxs(Fragment, { children: [
            isDocVisualizerOpen && /* @__PURE__ */ jsxs("div", { className: "mb-6 p-4 bg-white rounded-2xl border-2 border-emerald-400 shadow-md no-print max-w-[210mm] mx-auto", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-3 mb-3 border-b border-slate-200", children: [
                /* @__PURE__ */ jsxs("h3", { className: "font-bold text-slate-800 text-sm flex items-center gap-2", children: [
                  docVisualizerTab === "bbt" && /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(TrendingUp, { className: "w-4 h-4 text-emerald-600" }),
                    /* @__PURE__ */ jsx("span", { children: "Module T\u1EA1o B\u1EA3ng Bi\u1EBFn Thi\xEAn D\u1EA1ng \u1EA2nh Vector SVG (Chu\u1EA9n SGK)" })
                  ] }),
                  docVisualizerTab === "graph" && /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(BarChart2, { className: "w-4 h-4 text-blue-600" }),
                    /* @__PURE__ */ jsx("span", { children: "Module V\u1EBD & Xu\u1EA5t \u0110\u1ED3 Th\u1ECB 2D & B\u1EA5t Ph\u01B0\u01A1ng Tr\xECnh" })
                  ] }),
                  docVisualizerTab === "geometry3d" && /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(Box, { className: "w-4 h-4 text-purple-600" }),
                    /* @__PURE__ */ jsx("span", { children: "Module V\u1EBD H\xECnh H\u1ECDc Kh\xF4ng Gian 3D (Ch\xF3p, L\u0103ng tr\u1EE5, N\xF3n, Tr\u1EE5, C\u1EA7u)" })
                  ] }),
                  docVisualizerTab === "statistics" && /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(BarChart3, { className: "w-4 h-4 text-amber-600" }),
                    /* @__PURE__ */ jsx("span", { children: "Module Bi\u1EC3u \u0110\u1ED3 & B\u1EA3ng Th\u1ED1ng K\xEA (M\u1EABu s\u1ED1 li\u1EC7u gh\xE9p nh\xF3m v\xE0 r\u1EDDi r\u1EA1c)" })
                  ] })
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setIsDocVisualizerOpen(false),
                    className: "text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium cursor-pointer",
                    children: "\u0110\xF3ng"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(
                QuestionVisualizerPanel,
                {
                  questionNumber: 1,
                  questionContent: customLessonName || "H\xE0m s\u1ED1",
                  solutionContent: "",
                  defaultTab: docVisualizerTab,
                  defaultTarget: "content",
                  onInsertSnippet: handleInsertDocVisualizerSnippet,
                  onClose: () => setIsDocVisualizerOpen(false)
                }
              )
            ] }),
            streamProgress && /* @__PURE__ */ jsxs("div", { className: "bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4 mb-6 shadow-sm space-y-2 backdrop-blur-xs", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs font-bold text-emerald-900", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx("div", { className: "w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" }),
                  /* @__PURE__ */ jsx("span", { children: streamProgress.text })
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "font-mono text-emerald-700 font-extrabold", children: [
                  streamProgress.percentage,
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "w-full bg-emerald-200/80 rounded-full h-2.5 overflow-hidden", children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: "bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out",
                  style: { width: `${streamProgress.percentage}%` }
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxs(
              "div",
              {
                ref: exportRef,
                style: {
                  fontFamily: layoutStyle === "a4_print" ? "'Times New Roman', 'Tinos', 'Liberation Serif', 'Be Vietnam Pro', Georgia, serif" : "'Be Vietnam Pro', 'Inter', system-ui, -apple-system, sans-serif"
                },
                className: cn(
                  "transition-all duration-300 antialiased",
                  layoutStyle === "a4_print" && "bg-white p-8 md:p-12 shadow-sm border border-slate-300 rounded-xl min-h-[500px] text-slate-900 max-w-[210mm] mx-auto text-[15px] leading-relaxed",
                  layoutStyle === "infographic" && "bg-gradient-to-b from-sky-50/40 via-white to-indigo-50/30 p-6 md:p-10 shadow-md border-2 border-indigo-200/80 rounded-2xl min-h-[500px]",
                  layoutStyle === "poster" && "bg-white p-6 md:p-10 shadow-xl border-4 border-indigo-500/80 rounded-3xl min-h-[500px]",
                  layoutStyle === "mindmap" && "bg-slate-50/80 p-6 md:p-10 shadow-md border-2 border-emerald-300/80 rounded-2xl min-h-[500px]"
                ),
                children: [
                  layoutStyle === "a4_print" && /* @__PURE__ */ jsxs("div", { className: "border-2 border-slate-800 mb-8 p-4 bg-white text-xs sm:text-sm text-slate-800 leading-normal", children: [
                    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 pb-3 border-b border-slate-300", children: [
                      /* @__PURE__ */ jsxs("div", { className: "text-center font-bold", children: [
                        /* @__PURE__ */ jsx("div", { className: "uppercase text-[11px] sm:text-xs tracking-wider text-slate-700", children: headerConfig.department || "S\u1EDE GI\xC1O D\u1EE4C V\xC0 \u0110\xC0O T\u1EA0O" }),
                        /* @__PURE__ */ jsx("div", { className: "uppercase text-[12px] sm:text-sm text-slate-900 font-extrabold", children: headerConfig.schoolName ? `TR\u01AF\u1EDCNG: ${headerConfig.schoolName}` : "TR\u01AF\u1EDCNG THPT: ................................................" }),
                        /* @__PURE__ */ jsx("div", { className: "text-[11px] font-semibold text-slate-600 uppercase", children: headerConfig.subjectGroup || `T\u1ED4 CHUY\xCAN M\xD4N: ${subject || "TO\xC1N - TIN H\u1ECCC"}` }),
                        /* @__PURE__ */ jsx("div", { className: "text-[11px] font-semibold text-slate-800 mt-0.5", children: headerConfig.teacherName ? `Gi\xE1o vi\xEAn: ${headerConfig.teacherName}` : "Gi\xE1o vi\xEAn: ................................................" }),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => setIsHeaderModalOpen(true),
                            className: "no-print mt-1 text-[10px] text-emerald-600 hover:text-emerald-800 underline font-normal cursor-pointer flex items-center justify-center gap-1 mx-auto",
                            children: "\u270F\uFE0F Ch\u1EC9nh s\u1EEDa th\xF4ng tin Tr\u01B0\u1EDDng / GV / N\u0103m h\u1ECDc"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
                        /* @__PURE__ */ jsx("div", { className: "font-black uppercase text-slate-900 text-sm sm:text-base tracking-wide", children: "PHI\u1EBEU H\u1ECCC T\u1EACP" }),
                        /* @__PURE__ */ jsx("div", { className: "font-bold text-emerald-800 text-xs sm:text-sm mt-0.5 uppercase", children: getFormattedLessonTitle(customLessonName) }),
                        /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-slate-600 mt-0.5", children: [
                          "M\xF4n: ",
                          subject,
                          " \u2022 L\u1EDBp ",
                          selectedGrade,
                          " \u2022 N\u0103m h\u1ECDc ",
                          headerConfig.schoolYear || "2026 - 2027"
                        ] })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-dashed border-slate-300 text-xs sm:text-sm", children: [
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "H\u1ECD v\xE0 t\xEAn h\u1ECDc sinh:" }),
                        " ................................................."
                      ] }),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "L\u1EDBp:" }),
                        " .................... ",
                        /* @__PURE__ */ jsx("span", { className: "font-semibold ml-2", children: "STT:" }),
                        " ......"
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "sm:text-right", children: [
                        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Ng\xE0y n\u1ED9p:" }),
                        " ...... / ...... / 202..."
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2 pt-2.5 items-stretch", children: [
                      /* @__PURE__ */ jsxs("div", { className: "col-span-3 border border-slate-700 p-2 text-center rounded bg-slate-50 flex flex-col justify-center", children: [
                        /* @__PURE__ */ jsx("span", { className: "font-bold block text-[11px] uppercase text-slate-700", children: "\u0110I\u1EC2M S\u1ED0" }),
                        /* @__PURE__ */ jsx("span", { className: "text-base font-bold text-slate-400 italic mt-0.5", children: "......... / 10" })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "col-span-9 pl-3 border-l border-slate-200", children: [
                        /* @__PURE__ */ jsx("span", { className: "font-bold block text-slate-800 text-xs", children: "L\u1EDDi ph\xEA & Nh\u1EADn x\xE9t c\u1EE7a Th\u1EA7y / C\xF4:" }),
                        /* @__PURE__ */ jsx("div", { className: "border-b border-dotted border-slate-400 mt-2 h-4" }),
                        /* @__PURE__ */ jsx("div", { className: "border-b border-dotted border-slate-400 mt-2.5 h-4" })
                      ] })
                    ] })
                  ] }),
                  layoutStyle === "poster" && /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 text-white p-7 sm:p-9 rounded-2xl shadow-xl border-2 border-indigo-400/40 relative overflow-hidden", children: [
                    /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 -mt-10 -mr-10 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" }),
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 mb-3", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                        /* @__PURE__ */ jsxs("span", { className: "px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1", children: [
                          /* @__PURE__ */ jsx(Zap, { className: "w-3.5 h-3.5 fill-current" }),
                          " CHEAT SHEET T\u01AF DUY"
                        ] }),
                        /* @__PURE__ */ jsxs("span", { className: "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-200 border border-indigo-400/30", children: [
                          subject,
                          " ",
                          selectedGrade
                        ] })
                      ] }),
                      /* @__PURE__ */ jsx("span", { className: "text-xs text-indigo-300 font-mono hidden sm:inline-block", children: "B\u1EA2N T\u1ED4NG H\u1EE2P C\u1ED0T L\xD5I KH\u1ED4 L\u1EDAN" })
                    ] }),
                    /* @__PURE__ */ jsx("h1", { className: "text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 uppercase", children: getFormattedLessonTitle(customLessonName) }),
                    /* @__PURE__ */ jsx("p", { className: "text-xs sm:text-sm text-indigo-200/90 font-medium max-w-2xl leading-relaxed", children: "To\xE0n b\u1ED9 c\xF4ng th\u1EE9c then ch\u1ED1t, quy tr\xECnh c\xE1c b\u01B0\u1EDBc gi\u1EA3i to\xE1n m\u1EABu v\xE0 m\u1EB9o th\u1EF1c chi\u1EBFn d\xE1n g\xF3c h\u1ECDc t\u1EADp ho\u1EB7c l\u01B0u \u0111i\u1EC7n tho\u1EA1i." })
                  ] }) }),
                  layoutStyle === "mindmap" && /* @__PURE__ */ jsxs("div", { className: "mb-8 text-center", children: [
                    /* @__PURE__ */ jsxs("div", { className: "inline-flex flex-col items-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-8 py-5 rounded-2xl shadow-lg border-2 border-emerald-300 ring-4 ring-emerald-100 max-w-2xl mx-auto", children: [
                      /* @__PURE__ */ jsxs("span", { className: "text-xs font-bold tracking-widest uppercase text-emerald-200 mb-1 flex items-center gap-1.5", children: [
                        /* @__PURE__ */ jsx(GitFork, { className: "w-4 h-4" }),
                        " B\u1EA2N \u0110\u1ED2 T\u01AF DUY & PH\xC2N NH\xC1NH"
                      ] }),
                      /* @__PURE__ */ jsxs("h1", { className: "text-xl sm:text-2xl font-black tracking-tight text-white", children: [
                        "\u{1F333} ",
                        getFormattedLessonTitle(customLessonName)
                      ] }),
                      /* @__PURE__ */ jsxs("span", { className: "text-xs text-emerald-100 mt-1 font-medium", children: [
                        "M\xF4n ",
                        subject,
                        " - L\u1EDBp ",
                        selectedGrade,
                        " \u2022 Chu\u1EA9n GDPT 2018"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-center items-center gap-2 mt-4 text-xs font-semibold text-emerald-800", children: [
                      /* @__PURE__ */ jsx("span", { className: "bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200", children: "\u{1F33F} Kh\xE1i ni\u1EC7m" }),
                      /* @__PURE__ */ jsx("span", { className: "text-emerald-500", children: "\u2794" }),
                      /* @__PURE__ */ jsx("span", { className: "bg-teal-100/80 px-2.5 py-1 rounded-full border border-teal-200", children: "\u26A1 C\xF4ng th\u1EE9c" }),
                      /* @__PURE__ */ jsx("span", { className: "text-emerald-500", children: "\u2794" }),
                      /* @__PURE__ */ jsx("span", { className: "bg-cyan-100/80 px-2.5 py-1 rounded-full border border-cyan-200", children: "\u{1F3AF} D\u1EA1ng b\xE0i" }),
                      /* @__PURE__ */ jsx("span", { className: "text-emerald-500", children: "\u2794" }),
                      /* @__PURE__ */ jsx("span", { className: "bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200", children: "\u26A0\uFE0F B\u1EABy sai l\u1EA7m" })
                    ] })
                  ] }),
                  layoutStyle === "infographic" ? /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch text-slate-900 font-sans leading-relaxed", children: [
                    /* @__PURE__ */ jsxs("div", { className: "lg:col-span-6 bg-white border-2 border-blue-900 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs", children: [
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsxs("div", { className: "bg-[#1e40af] text-white p-5 text-center border-b-2 border-blue-900", children: [
                          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2 mb-1.5", children: [
                            /* @__PURE__ */ jsx(BookOpen, { className: "w-5 h-5 text-sky-300" }),
                            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-bold uppercase tracking-widest text-sky-200", children: "PHI\u1EBEU H\u1ECCC T\u1EACP: L\xDD THUY\u1EBET" })
                          ] }),
                          /* @__PURE__ */ jsx("h2", { className: "text-sm sm:text-base font-black uppercase text-white leading-tight", children: getFormattedLessonTitle(customLessonName) }),
                          /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-sky-100 font-semibold mt-0.5", children: [
                            "Ch\u01B0\u01A1ng tr\xECnh ",
                            subject,
                            " ",
                            selectedGrade,
                            " (KNTT)"
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50 border-b border-slate-100 text-[11px] sm:text-xs flex justify-between font-semibold text-slate-700", children: [
                          /* @__PURE__ */ jsx("span", { children: "H\u1ECD v\xE0 t\xEAn: ................................................................" }),
                          /* @__PURE__ */ jsx("span", { children: "L\u1EDBp: ........................" })
                        ] }),
                        /* @__PURE__ */ jsx("div", { className: "p-5 prose prose-blue prose-sm max-w-none [&_h2]:bg-blue-50/80 [&_h2]:text-blue-950 [&_h2]:p-3 [&_h2]:rounded-xl [&_h2]:border-l-4 [&_h2]:border-blue-600 [&_h2]:text-[12px] [&_h2]:font-black [&_h2]:mt-5 [&_h2]:mb-3 [&_blockquote]:bg-amber-50/80 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:p-3.5 [&_blockquote]:rounded-r-xl [&_blockquote]:text-amber-950 [&_blockquote]:text-[11px] [&_blockquote]:font-semibold [&_blockquote]:not-italic [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-300 leading-relaxed font-sans", children: /* @__PURE__ */ jsx(MathView, { content: splitContent(mainDocContent).left }) })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "p-4 m-5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3", children: [
                        /* @__PURE__ */ jsx(Sparkles, { className: "w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" }),
                        /* @__PURE__ */ jsxs("div", { children: [
                          /* @__PURE__ */ jsx("div", { className: "text-[10px] font-black uppercase text-amber-800 tracking-wider", children: "G\xF3c \xF4n t\u1EADp c\u1ED1t l\xF5i" }),
                          /* @__PURE__ */ jsx("div", { className: "text-[11px] font-semibold text-amber-950 mt-0.5 leading-relaxed", children: "N\u1EAFm ch\u1EAFc kh\xE1i ni\u1EC7m v\xE0 ph\xE2n t\xEDch c\xE1c v\xED d\u1EE5 m\u1EABu s\u1EBD gi\xFAp th\u1EA7y c\xF4 r\xE8n luy\u1EC7n t\u01B0 duy t\u1EF1 lu\u1EADn v\xE0 t\u0103ng t\u1ED1c \u0111\u1ED9 l\xE0m tr\u1EAFc nghi\u1EC7m c\u1EE7a h\u1ECDc sinh!" })
                        ] })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "lg:col-span-6 bg-white border-2 border-blue-900 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs", children: [
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsxs("div", { className: "bg-[#1e40af] text-white p-5 text-center border-b-2 border-blue-900", children: [
                          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2 mb-1.5", children: [
                            /* @__PURE__ */ jsx(Edit3, { className: "w-5 h-5 text-sky-300" }),
                            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-bold uppercase tracking-widest text-sky-200", children: "PH\u1EA6N B\xC0I T\u1EACP TH\u1EF0C H\xC0NH" })
                          ] }),
                          /* @__PURE__ */ jsx("h2", { className: "text-sm sm:text-base font-black uppercase text-white leading-tight", children: "(Ph\u1EA7n D\xE0nh Cho H\u1ECDc Sinh Luy\u1EC7n T\u1EADp)" }),
                          /* @__PURE__ */ jsx("div", { className: "text-[10px] text-sky-100 font-semibold mt-0.5", children: "Y\xEAu c\u1EA7u ho\xE0n th\xE0nh \u0111\u1EA7y \u0111\u1EE7 c\xE1c ph\u1EA7n b\xEAn d\u01B0\u1EDBi" })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50 border-b border-slate-100 text-[11px] sm:text-xs flex justify-between font-semibold text-slate-700", children: [
                          /* @__PURE__ */ jsx("span", { children: "H\u1ECD v\xE0 t\xEAn: ................................................................" }),
                          /* @__PURE__ */ jsx("span", { children: "L\u1EDBp: ........................" })
                        ] }),
                        /* @__PURE__ */ jsx("div", { className: "p-5 prose prose-indigo prose-sm max-w-none [&_h2]:bg-indigo-50/80 [&_h2]:text-indigo-950 [&_h2]:p-3 [&_h2]:rounded-xl [&_h2]:border-l-4 [&_h2]:border-indigo-600 [&_h2]:text-[12px] [&_h2]:font-black [&_h2]:mt-5 [&_h2]:mb-3 [&_blockquote]:bg-rose-50/80 [&_blockquote]:border-l-4 [&_blockquote]:border-rose-400 [&_blockquote]:p-3.5 [&_blockquote]:rounded-r-xl [&_blockquote]:text-rose-950 [&_blockquote]:text-[11px] [&_blockquote]:font-semibold [&_blockquote]:not-italic [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-300 leading-relaxed font-sans", children: /* @__PURE__ */ jsx(MathView, { content: splitContent(mainDocContent).right }) })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "bg-[#1e40af] text-white p-4 text-center border-t-2 border-blue-900 mt-5 flex items-center justify-center gap-2", children: [
                        /* @__PURE__ */ jsx(Sparkles, { className: "w-4 h-4 text-amber-300 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-wider text-sky-100", children: 'H\u1ECDc t\u1ED1t To\xE1n! \u2022 "Ki\u1EBFn th\u1EE9c h\xF4m nay l\xE0 h\xE0nh trang cho t\u01B0\u01A1ng lai!"' })
                      ] })
                    ] })
                  ] }) : /* @__PURE__ */ jsx("div", { className: cn(
                    "prose max-w-none",
                    layoutStyle === "a4_print" && "prose-slate font-serif [&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif [&_table]:border-collapse [&_th]:border [&_th]:border-slate-800 [&_td]:border [&_td]:border-slate-800 leading-relaxed",
                    layoutStyle === "poster" && "prose-blue [&_h2]:bg-gradient-to-r [&_h2]:from-slate-900 [&_h2]:to-indigo-900 [&_h2]:text-white [&_h2]:p-3.5 [&_h2]:rounded-xl [&_h2]:font-black [&_blockquote]:bg-blue-50/80 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-600 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl [&_blockquote]:shadow-2xs",
                    layoutStyle === "mindmap" && "prose-emerald [&_h2]:bg-emerald-50 [&_h2]:text-emerald-950 [&_h2]:p-3.5 [&_h2]:rounded-xl [&_h2]:border-l-4 [&_h2]:border-emerald-600 [&_h2]:font-bold [&_blockquote]:bg-teal-50 [&_blockquote]:border-l-4 [&_blockquote]:border-teal-500 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl"
                  ), children: /* @__PURE__ */ jsx(ErrorBoundary, { children: /* @__PURE__ */ jsx(MathView, { content: mainDocContent }) }) }),
                  includeDetailedSolution && solutionDocContent && /* @__PURE__ */ jsxs("div", { className: "mt-8 pt-6 border-t border-slate-200", children: [
                    /* @__PURE__ */ jsxs("div", { className: "no-print", children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => toggleSolution("doc-solution"),
                          className: "inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer shadow-2xs",
                          children: /* @__PURE__ */ jsx("span", { children: isSolutionOpen("doc-solution") ? "\u{1F648} \u1EA8n l\u1EDDi gi\u1EA3i chi ti\u1EBFt" : "\u{1F4A1} Xem l\u1EDDi gi\u1EA3i chi ti\u1EBFt" })
                        }
                      ),
                      isSolutionOpen("doc-solution") && /* @__PURE__ */ jsxs(
                        "div",
                        {
                          style: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "16px", marginTop: "10px" },
                          className: "text-slate-800 text-sm leading-relaxed not-prose",
                          children: [
                            /* @__PURE__ */ jsx("div", { className: "font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-base", children: /* @__PURE__ */ jsx("span", { children: "\u{1F4A1} L\u1EDDi gi\u1EA3i chi ti\u1EBFt & H\u01B0\u1EDBng d\u1EABn ch\u1EA5m:" }) }),
                            /* @__PURE__ */ jsx("div", { className: "text-slate-800", children: /* @__PURE__ */ jsx(MarkdownRenderer, { content: fixMath(solutionDocContent) }) })
                          ]
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "docx-page-break page-break", style: { pageBreakBefore: "always" } }),
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: "export-solution-block mt-6 pt-4 border-t border-slate-400 not-prose",
                        children: [
                          /* @__PURE__ */ jsx("div", { className: "font-bold text-slate-900 mb-2 text-base", children: /* @__PURE__ */ jsx("span", { children: "\u{1F4A1} L\u1EDDi gi\u1EA3i chi ti\u1EBFt & H\u01B0\u1EDBng d\u1EABn ch\u1EA5m:" }) }),
                          /* @__PURE__ */ jsx(MarkdownRenderer, { content: fixMath(solutionDocContent) })
                        ]
                      }
                    )
                  ] })
                ]
              }
            )
          ] });
        }
        return /* @__PURE__ */ jsxs("div", { className: "h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 bg-white/50 rounded-xl border border-dashed border-slate-300 p-8", children: [
          /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-400", children: /* @__PURE__ */ jsx(BookOpen, { className: "w-8 h-8" }) }),
          /* @__PURE__ */ jsx("div", { className: "text-lg font-bold text-slate-700", children: "Phi\u1EBFu h\u1ECDc t\u1EADp s\u1EBD xu\u1EA5t hi\u1EC7n \u1EDF \u0111\xE2y" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm mt-1 text-slate-500 max-w-md text-center", children: 'Ch\u1ECDn m\xF4n h\u1ECDc, ch\u1EE7 \u0111\u1EC1 v\xE0 phong c\xE1ch tr\xECnh b\xE0y mong mu\u1ED1n (A4 Chu\u1EA9n in \u1EA5n ho\u1EB7c Phi\u1EBFu h\u1ECDc t\u1EADp d\u1EA1ng \u1EA3nh 2 c\u1ED9t) r\u1ED3i nh\u1EA5n "T\u1EA1o b\u1EA3n Word/In".' }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap justify-center gap-2 mt-4", children: LAYOUT_STYLE_OPTIONS.map((s) => /* @__PURE__ */ jsx("span", { className: "text-xs bg-white px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 font-medium", children: s.shortTitle }, s.id)) })
        ] });
      })() }) })
    ] }),
    /* @__PURE__ */ jsx(
      UploadTeacherExamModal,
      {
        isOpen: isUploadExamModalOpen,
        onClose: () => setIsUploadExamModalOpen(false),
        defaultSubject: subject,
        defaultGrade: selectedGrade
      }
    ),
    /* @__PURE__ */ jsx(
      HeaderConfigModal,
      {
        isOpen: isHeaderModalOpen,
        onClose: () => setIsHeaderModalOpen(false),
        config: headerConfig,
        onSave: handleSaveHeaderConfig,
        title: "T\xF9y ch\u1EC9nh th\xF4ng tin ti\xEAu \u0111\u1EC1 phi\u1EBFu h\u1ECDc t\u1EADp (Tr\u01B0\u1EDDng, GV, N\u0103m h\u1ECDc 2026 - 2027...)"
      }
    ),
    editingQuestion && /* @__PURE__ */ jsx(
      QuestionEditModal,
      {
        isOpen: true,
        question: editingQuestion.question,
        questionNumber: editingQuestion.index + 1,
        subject,
        grade: String(selectedGrade),
        onClose: () => setEditingQuestion(null),
        onSave: (updated) => {
          setWorksheetQuestions((prev) => {
            const next = [...prev];
            next[editingQuestion.index] = { ...next[editingQuestion.index], ...updated };
            return next;
          });
          setEditingQuestion(null);
          showToast("\u0110\xE3 l\u01B0u c\u1EADp nh\u1EADt c\xE2u h\u1ECFi!");
        }
      }
    ),
    previewRoomCode && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200", children: /* @__PURE__ */ jsxs("div", { className: "bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-3 px-4 bg-slate-900 text-white flex items-center justify-between shrink-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Eye, { className: "w-5 h-5 text-emerald-400" }),
          /* @__PURE__ */ jsxs("span", { className: "font-semibold text-sm sm:text-base", children: [
            "Xem tr\u01B0\u1EDBc giao di\u1EC7n h\u1ECDc sinh (M\xE3 ph\xF2ng: ",
            /* @__PURE__ */ jsx("span", { className: "font-mono text-emerald-300", children: previewRoomCode }),
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => window.open(`/?examId=${previewRoomCode}`, "_blank"),
              className: "text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-200 flex items-center gap-1.5 transition-colors",
              title: "M\u1EDF trong tab m\u1EDBi",
              children: [
                /* @__PURE__ */ jsx(ExternalLink, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsx("span", { children: "M\u1EDF Tab M\u1EDBi" })
              ]
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setPreviewRoomCode(null),
              className: "p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors",
              title: "\u0110\xF3ng",
              children: /* @__PURE__ */ jsx(X, { className: "w-5 h-5" })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto bg-slate-100 p-2 sm:p-4", children: /* @__PURE__ */ jsx(StudentExamView, { examId: previewRoomCode }) })
    ] }) }),
    /* @__PURE__ */ jsx(
      WorksheetAiInspectorModal,
      {
        isOpen: showInspectorModal,
        onClose: () => setShowInspectorModal(false),
        worksheetText: suggestion,
        selectedGrade,
        selectedSubject: subject,
        selectedSemester,
        selectedChapterName: getKnttCurriculum(subject, selectedGrade, selectedSemester)?.chapters.find((c) => c.id === selectedChapterId)?.name || "",
        selectedLessonName: customLessonName,
        configCounts: {
          numPartI,
          numPartII,
          numPartIII,
          numPartIV
        },
        onApplyAutoFix: (fixedText) => {
          setSuggestion(fixedText);
          showToast("\u0110\xE3 t\u1EF1 \u0111\u1ED9ng s\u1EEDa l\u1ED7i v\xE0 ho\xE0n thi\u1EC7n phi\u1EBFu h\u1ECDc t\u1EADp!");
          setTimeout(() => triggerGlobalMathRender(), 100);
        },
        onRegenerateWorksheet: () => {
          setShowInspectorModal(false);
          handleGenerate();
        }
      }
    ),
    toastMessage && /* @__PURE__ */ jsxs("div", { className: "fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 no-print", children: [
      /* @__PURE__ */ jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-400 shrink-0" }),
      /* @__PURE__ */ jsx("span", { children: toastMessage })
    ] })
  ] });
}
export default Worksheets;
