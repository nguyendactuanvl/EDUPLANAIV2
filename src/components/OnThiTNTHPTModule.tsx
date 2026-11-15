import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Minus,
  Sparkles,
  FileDown,
  Copy,
  Search,
  RotateCw,
  AlertCircle,
  BookOpen,
  FileText,
  ClipboardCheck,
  SlidersHorizontal,
  Code2,
  Eye,
  Printer,
  CheckCircle2,
  Target,
} from "lucide-react";
import {
  TN_THPT_CURRICULUM_TREE,
  ALL_FORM_ITEMS,
  MATERIAL_TYPES,
  DIFFICULTY_LEVELS,
  DEFAULT_SELECTED_FORM_IDS,
  getSamplePreviewMarkdown,
  type MaterialTypeId,
  type DifficultyLevelId,
  type CurriculumGradeBlock,
  type CurriculumTopicNode,
} from "../data/tnThptCurriculumTree";
import { MarkdownRenderer, typesetMathJax } from "./MarkdownRenderer";
import { exportHtmlToWord } from "../lib/exportUtils";
import { printElement } from "../lib/print";
import { apiFetch } from "../lib/apiFetch";
import { unflattenMarkdownTables } from "../lib/bbtRenderer";

function sanitizeOnThiMarkdown(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(/\r\n/g, "\n");

  const svgVault: string[] = [];
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
    const idx = svgVault.length;
    svgVault.push(match);
    return `@@OT_SVG_${idx}@@`;
  });

  s = s.replace(/```(?:xml|svg|html|markdown)?\s*(@@OT_SVG_\d+@@)\s*```/gi, "$1");
  s = unflattenMarkdownTables(s);

  const fixMathBody = (inner: string): string => {
    let fixed = inner.replace(/\\dfrac\b/g, "\\frac");
    const textVault: string[] = [];
    fixed = fixed.replace(/\\(?:text|mathrm|textbf|textit)\s*\{[^{}]*\}/g, (m) => {
      const idx = textVault.length;
      textVault.push(m);
      return `@@OT_TX_${idx}@@`;
    });
    fixed = fixed.replace(
      /(?<![\\a-zA-Z])(arcsin|arccos|arctan|sin|cos|tan|cot|log|ln|lim)(?!h\b)(?=\s*[\(\[_^0-9a-zA-Z\\])/g,
      "\\$1"
    );
    return fixed.replace(/@@OT_TX_(\d+)@@/g, (_m, idx) => textVault[Number(idx)] || "");
  };

  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_full, inner: string) => `$$${fixMathBody(inner)}$$`);
  s = s.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, (_full, inner: string) => {
    let fixed = fixMathBody(inner);
    fixed = fixed.replace(/<br\s*\/?>/gi, "$ <br/> $");
    return `$${fixed}$`;
  });
  s = s.replace(/\$\s*\$/g, "");

  // Protect math before stripping stray bullet prefixes and separating glued question headings
  const mathVault: string[] = [];
  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (m) => {
    const idx = mathVault.length;
    mathVault.push(m);
    return `@@OT_MATH_${idx}@@`;
  });

  // Separate glued bold/question markers onto a fresh paragraph (e.g. "**Đáp số: 200****Câu 2.**")
  s = s
    .split("\n")
    .map((line) => {
      if (/^[ \t]*\|/.test(line)) {
        return line.replace(/(?<=\|[ \t]*)'(-?\d+(?:[.,]\d+)?)'(?=[ \t]*\|)/g, "$1");
      }
      let l = line.replace(/\*{3,4}[ \t]*((?:Câu|Bài)\s*\d+[ \t]*[:\.])/gi, "**\n\n**$1");
      l = l.replace(/([^\n*])\*{2}[ \t]*\*{2}[ \t]*((?:Câu|Bài)\s*\d+[ \t]*[:\.])/gi, "$1**\n\n**$2");
      l = l.replace(/([.!?\)\]]|@@OT_MATH_\d+@@)[ \t]*(\*{1,2}(?:Câu|Bài)\s*\d+[ \t]*[:\.]\*{0,2})/gi, "$1\n\n$2");
      l = l.replace(/(Đáp\s*số[ \t]*:[ \t]*[^\n*]+?)[ \t]*\*{2,}[ \t]*((?:Câu|Bài)\s*\d+[ \t]*[:\.])/gi, "$1**\n\n**$2");
      return l;
    })
    .join("\n");

  s = s.replace(/^[ \t]*[-*+•●][ \t]+(?=#{1,6}\s)/gm, "");
  s = s.replace(
    /^[ \t]*[-*+•●][ \t]+(?=(?:\*\*)?(?:Câu|Bài|PHẦN|Mục|Phần|[A-D]\.|[a-d]\))\b)/gm,
    ""
  );
  s = s.replace(/@@OT_MATH_(\d+)@@/g, (_m, idx) => mathVault[Number(idx)] || "");
  s = s.replace(/@@OT_SVG_(\d+)@@/g, (_m, idx) => svgVault[Number(idx)] || "");
  return s.trim();
}

export function OnThiTNTHPTModule() {
  // Tree Selection & Expansion State
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>(DEFAULT_SELECTED_FORM_IDS);
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({
    grade_10: true,
    grade_11: true,
    grade_12: true,
  });
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    TN_THPT_CURRICULUM_TREE.forEach((g) =>
      g.topics.forEach((t) => {
        initial[t.id] = g.id === "grade_12";
      })
    );
    return initial;
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Right Pane Configuration State
  const [materialType, setMaterialType] = useState<MaterialTypeId>("chuyen_de");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevelId>("kha_8_plus");
  const [part1Count, setPart1Count] = useState<number>(8);
  const [part2Count, setPart2Count] = useState<number>(2);
  const [part3Count, setPart3Count] = useState<number>(4);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [teacherHeader, setTeacherHeader] = useState("");
  const [customNote, setCustomNote] = useState("");

  // Generated Document State
  const [documentTitle, setDocumentTitle] = useState("Tài liệu Chuyên đề Ôn thi Tốt nghiệp THPT (Mẫu)");
  const [markdownContent, setMarkdownContent] = useState<string>(() =>
    getSamplePreviewMarkdown("chuyen_de")
  );
  const [isCustomGenerated, setIsCustomGenerated] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");

  // UI Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  const selectedSet = useMemo(() => new Set(selectedFormIds), [selectedFormIds]);

  const selectedFormDetails = useMemo(
    () => ALL_FORM_ITEMS.filter((item) => selectedSet.has(item.id)),
    [selectedSet]
  );

  // Filtered curriculum tree for live search
  const filteredTree = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TN_THPT_CURRICULUM_TREE;
    return TN_THPT_CURRICULUM_TREE.map((grade) => {
      const gradeMatches = grade.title.toLowerCase().includes(q);
      const matchingTopics = grade.topics
        .map((topic) => {
          const topicMatches =
            topic.code.toLowerCase().includes(q) || topic.title.toLowerCase().includes(q);
          const matchingForms = topic.forms.filter(
            (f) =>
              f.label.toLowerCase().includes(q) ||
              f.description.toLowerCase().includes(q) ||
              f.levelTag.toLowerCase().includes(q)
          );
          if (gradeMatches || topicMatches) return topic;
          if (matchingForms.length > 0) return { ...topic, forms: matchingForms };
          return null;
        })
        .filter((t): t is CurriculumTopicNode => t !== null);
      if (matchingTopics.length === 0) return null;
      return { ...grade, topics: matchingTopics };
    }).filter((g): g is CurriculumGradeBlock => g !== null);
  }, [searchQuery]);

  const cleanedMarkdown = useMemo(
    () => sanitizeOnThiMarkdown(markdownContent),
    [markdownContent]
  );

  // Sync MathJax 3 rendering on preview paper and topic tree
  useEffect(() => {
    if (viewMode === "preview" && previewRef.current) {
      const timer = setTimeout(() => {
        typesetMathJax(previewRef.current);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [cleanedMarkdown, viewMode]);

  useEffect(() => {
    if (treeRef.current) {
      const timer = setTimeout(() => {
        typesetMathJax(treeRef.current);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [expandedGrades, expandedTopics, searchQuery]);

  // Handlers for material type tabs
  const handleSelectMaterialType = (nextType: MaterialTypeId) => {
    setMaterialType(nextType);
    const meta = MATERIAL_TYPES.find((m) => m.id === nextType);
    if (meta) {
      setPart1Count(meta.defaultCounts.part1);
      setPart2Count(meta.defaultCounts.part2);
      setPart3Count(meta.defaultCounts.part3);
    }
    if (!isCustomGenerated) {
      setMarkdownContent(getSamplePreviewMarkdown(nextType));
      setDocumentTitle(`${meta?.title || "Tài liệu Ôn thi TN THPT"} (Mẫu)`);
    }
  };

  // Checkbox Tree Handlers
  const toggleFormId = (formId: string) => {
    setSelectedFormIds((prev) =>
      prev.includes(formId) ? prev.filter((id) => id !== formId) : [...prev, formId]
    );
  };

  const toggleTopicAll = (topic: CurriculumTopicNode) => {
    const ids = topic.forms.map((f) => f.id);
    const allSelected = ids.every((id) => selectedSet.has(id));
    setSelectedFormIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const toggleGradeAll = (grade: CurriculumGradeBlock) => {
    const ids = grade.topics.flatMap((t) => t.forms.map((f) => f.id));
    const allSelected = ids.every((id) => selectedSet.has(id));
    setSelectedFormIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const handleSelectAll = () => {
    setSelectedFormIds(ALL_FORM_ITEMS.map((f) => f.id));
  };

  const handleClearAll = () => {
    setSelectedFormIds([]);
  };

  const handleResetDefault = () => {
    setSelectedFormIds(DEFAULT_SELECTED_FORM_IDS);
  };

  // Gemini AI Generation Handler
  const handleGenerate = async () => {
    if (selectedFormDetails.length === 0) {
      setErrorMessage("Vui lòng tích chọn ít nhất 1 dạng bài ở cây thư mục bên trái.");
      return;
    }
    if (part1Count + part2Count + part3Count <= 0) {
      setErrorMessage("Vui lòng nhập số lượng ít nhất 1 câu hỏi cho Phần I, II hoặc III.");
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const response = await apiFetch("/api/on-thi-tn-thpt/generate", {
        method: "POST",
        body: JSON.stringify({
          selectedTopics: selectedFormDetails.map((f) => ({
            id: f.id,
            gradeTitle: f.gradeTitle,
            topicTitle: f.topicTitle,
            label: f.label,
            levelTag: f.levelTag,
            description: f.description,
          })),
          materialType,
          part1Count,
          part2Count,
          part3Count,
          difficultyLevel,
          teacherHeader: teacherHeader.trim(),
          customNote: customNote.trim(),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || `Máy chủ trả về lỗi (${response.status}). Vui lòng thử lại.`
        );
      }

      setDocumentTitle(data.title || "Tài liệu Ôn thi Tốt nghiệp THPT");
      setMarkdownContent(
        data.combinedMarkdown || data.mainContentMarkdown || ""
      );
      setIsCustomGenerated(true);
      setViewMode("preview");
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Không thể kết nối máy chủ AI để tạo tài liệu. Vui lòng thử lại."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Export Word (.docx) using OMML Equations
  const handleExportWord = async () => {
    if (!previewRef.current) {
      if (viewMode === "source") {
        setViewMode("preview");
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    if (!previewRef.current) return;

    setIsExportingWord(true);
    setErrorMessage(null);
    try {
      await typesetMathJax(previewRef.current);
      const safeSlug = documentTitle
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 60);
      const fileName = `${safeSlug || "OnThi_TN_THPT_Toan"}_OMML.docx`;
      await exportHtmlToWord(previewRef.current, fileName, "omml");
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Có lỗi khi chuyển đổi sang file Word (.docx)."
      );
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(cleanedMarkdown);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2200);
    } catch {
      setErrorMessage("Trình duyệt không cho phép sao chép tự động.");
    }
  };

  const renderLevelTextColor = (tag: string) => {
    if (tag === "VDC") return "text-rose-700 dark:text-rose-400";
    if (tag === "VD-VDC" || tag === "VD") return "text-amber-700 dark:text-amber-400";
    if (tag === "TH-VD") return "text-sky-700 dark:text-sky-400";
    return "text-emerald-700 dark:text-emerald-400";
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* LEFT PANE (35%): Cây thư mục Chuyên đề 3 khối lớp */}
      <aside className="w-full lg:w-[35%] lg:min-w-[330px] lg:max-w-[460px] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col max-h-[46vh] lg:max-h-full overflow-hidden shrink-0">
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                Ôn thi TN THPT (Toán)
              </h2>
            </div>
            <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
              {selectedFormIds.length}/{ALL_FORM_ITEMS.length} dạng
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cấu trúc GDPT 2018 · Tích chọn đa dạng bài để tổng hợp
          </p>

          {/* Search & Batch Controls */}
          <div className="mt-3 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh chuyên đề, dạng bài..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] font-medium">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
              >
                Mặc định (12)
              </button>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        </div>

        {/* Tree-View List */}
        <div
          ref={treeRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5"
        >
          {filteredTree.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
              Không tìm thấy dạng bài phù hợp với "{searchQuery}".
            </div>
          ) : (
            filteredTree.map((grade) => {
              const gradeFormIds = grade.topics.flatMap((t) => t.forms.map((f) => f.id));
              const selectedInGrade = gradeFormIds.filter((id) => selectedSet.has(id)).length;
              const isGradeAll =
                gradeFormIds.length > 0 && selectedInGrade === gradeFormIds.length;
              const isGradePartial =
                selectedInGrade > 0 && selectedInGrade < gradeFormIds.length;
              const isGradeExpanded =
                searchQuery.trim().length > 0 || !!expandedGrades[grade.id];

              return (
                <div
                  key={grade.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 overflow-hidden"
                >
                  {/* Grade Header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100/80 dark:bg-slate-800/70 border-b border-slate-200/70 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGrades((prev) => ({
                          ...prev,
                          [grade.id]: !prev[grade.id],
                        }))
                      }
                      className="p-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                      aria-label={`Đóng mở ${grade.title}`}
                    >
                      {isGradeExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleGradeAll(grade)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        isGradeAll
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : isGradePartial
                            ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600"
                            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                      }`}
                      aria-label={`Chọn toàn bộ ${grade.title}`}
                    >
                      {isGradeAll && <Check className="w-3 h-3" />}
                      {isGradePartial && <Minus className="w-3 h-3" />}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGrades((prev) => ({
                          ...prev,
                          [grade.id]: !prev[grade.id],
                        }))
                      }
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {grade.title}
                        </span>
                        <span className="text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                          {grade.weightLabel} · {selectedInGrade}/{gradeFormIds.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {grade.subtitle}
                      </p>
                    </button>
                  </div>

                  {/* Topics inside Grade */}
                  {isGradeExpanded && (
                    <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
                      {grade.topics.map((topic) => {
                        const topicIds = topic.forms.map((f) => f.id);
                        const selectedInTopic = topicIds.filter((id) =>
                          selectedSet.has(id)
                        ).length;
                        const isTopicAll =
                          topicIds.length > 0 && selectedInTopic === topicIds.length;
                        const isTopicPartial =
                          selectedInTopic > 0 && selectedInTopic < topicIds.length;
                        const isTopicExpanded =
                          searchQuery.trim().length > 0 || !!expandedTopics[topic.id];

                        return (
                          <div key={topic.id} className="bg-white dark:bg-slate-900/40">
                            <div className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTopics((prev) => ({
                                    ...prev,
                                    [topic.id]: !prev[topic.id],
                                  }))
                                }
                                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                aria-label={`Đóng mở ${topic.title}`}
                              >
                                {isTopicExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleTopicAll(topic)}
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                  isTopicAll
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : isTopicPartial
                                      ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-600"
                                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                                }`}
                                aria-label={`Chọn toàn bộ ${topic.title}`}
                              >
                                {isTopicAll && <Check className="w-3 h-3" />}
                                {isTopicPartial && <Minus className="w-3 h-3" />}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTopics((prev) => ({
                                    ...prev,
                                    [topic.id]: !prev[topic.id],
                                  }))
                                }
                                className="flex-1 text-left min-w-0 cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                                    {topic.code}: {topic.title}
                                  </span>
                                  <span className="text-[11px] tabular-nums text-slate-400 shrink-0">
                                    {selectedInTopic}/{topicIds.length}
                                  </span>
                                </div>
                              </button>
                            </div>

                            {isTopicExpanded && (
                              <div className="pl-8 pr-3 pb-2 space-y-1">
                                {topic.forms.map((form) => {
                                  const checked = selectedSet.has(form.id);
                                  return (
                                    <label
                                      key={form.id}
                                      className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                        checked
                                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70"
                                          : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleFormId(form.id)}
                                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2">
                                          <span
                                            className={`font-medium leading-snug ${
                                              checked
                                                ? "text-slate-900 dark:text-slate-100"
                                                : "text-slate-700 dark:text-slate-300"
                                            }`}
                                          >
                                            {form.label}
                                          </span>
                                          <span
                                            className={`text-[10px] font-bold shrink-0 tabular-nums ${renderLevelTextColor(
                                              form.levelTag
                                            )}`}
                                          >
                                            {form.levelTag}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                          {form.description}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT PANE (65%): Cấu hình loại tài liệu & Khung xem trước A4 */}
      <section className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Config & Toolbar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 shrink-0 space-y-3">
          {/* 3 Material Type Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {MATERIAL_TYPES.map((mt) => {
              const active = materialType === mt.id;
              const Icon =
                mt.id === "chuyen_de"
                  ? BookOpen
                  : mt.id === "giao_an_5512"
                    ? FileText
                    : ClipboardCheck;
              return (
                <button
                  key={mt.id}
                  type="button"
                  onClick={() => handleSelectMaterialType(mt.id)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-tight">{mt.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {mt.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Numeric Question Counts + Difficulty Target */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Phần I (ABCD):
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={part1Count}
                  onChange={(e) =>
                    setPart1Count(Math.max(0, Math.min(30, Number(e.target.value) || 0)))
                  }
                  className="w-16 px-2 py-1 text-xs font-semibold tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Phần II (Đ/S):
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={part2Count}
                  onChange={(e) =>
                    setPart2Count(Math.max(0, Math.min(10, Number(e.target.value) || 0)))
                  }
                  className="w-14 px-2 py-1 text-xs font-semibold tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Phần III (TLN):
                </label>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={part3Count}
                  onChange={(e) =>
                    setPart3Count(Math.max(0, Math.min(15, Number(e.target.value) || 0)))
                  }
                  className="w-14 px-2 py-1 text-xs font-semibold tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center"
                />
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Mục tiêu:
                </label>
                <select
                  value={difficultyLevel}
                  onChange={(e) =>
                    setDifficultyLevel(e.target.value as DifficultyLevelId)
                  }
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  {DIFFICULTY_LEVELS.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedOptions((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Tùy chọn</span>
              </button>
            </div>
          </div>

          {/* Collapsible Teacher Header & Custom Note */}
          {showAdvancedOptions && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              <input
                type="text"
                value={teacherHeader}
                onChange={(e) => setTeacherHeader(e.target.value)}
                placeholder="Tên trường / Tổ chuyên môn / Lớp ôn tập (tùy chọn)..."
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Yêu cầu thêm cho AI (vd: ưu tiên bài toán Oxyz thực tế, mẹo bấm fx-880BTG)..."
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          )}

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || selectedFormDetails.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Đang biên soạn bằng Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Tạo tài liệu bằng Gemini AI</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportWord}
                disabled={isExportingWord || !cleanedMarkdown}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {isExportingWord ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>Xuất file Word (.DOCX) chuẩn OMML</span>
              </button>

              <button
                type="button"
                onClick={handleCopyMarkdown}
                disabled={!cleanedMarkdown}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {copiedSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Đã sao chép
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy nội dung Markdown/LaTeX</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setViewMode((prev) => (prev === "preview" ? "source" : "preview"))
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {viewMode === "preview" ? (
                  <>
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Mã Markdown/LaTeX</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem trước A4</span>
                  </>
                )}
              </button>

              {viewMode === "preview" && (
                <button
                  type="button"
                  onClick={() => previewRef.current && printElement(previewRef.current)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="In hoặc xuất PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">In PDF</span>
                </button>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Scrollable A4 Document Canvas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-100/80 dark:bg-slate-950">
          {viewMode === "source" ? (
            <div className="max-w-[820px] mx-auto">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Chỉnh sửa trực tiếp mã nguồn Markdown / LaTeX (tự động đồng bộ khi quay lại Xem trước A4)
                </span>
              </div>
              <textarea
                value={markdownContent}
                onChange={(e) => {
                  setMarkdownContent(e.target.value);
                  setIsCustomGenerated(true);
                }}
                rows={26}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          ) : (
            <div className="max-w-[820px] mx-auto">
              {/* Metadata summary strip above paper */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>
                  {isCustomGenerated ? "Bản biên soạn bởi AI" : "Bản xem trước mẫu"} ·{" "}
                  {selectedFormDetails.length} dạng bài đã chọn ·{" "}
                  {DIFFICULTY_LEVELS.find((d) => d.id === difficultyLevel)?.shortLabel}
                </span>
                <span className="tabular-nums">
                  Cấu trúc: {part1Count} P.I · {part2Count} P.II · {part3Count} P.III
                </span>
              </div>

              {/* A4 White Paper Sheet with MathJax 3 & OMML-compatible light rendering */}
              <div
                ref={previewRef}
                className="solution-box-light bg-white text-slate-900 border border-slate-200 rounded-xl shadow-sm px-6 sm:px-10 py-8 min-h-[720px] relative"
              >
                {isGenerating && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
                    <RotateCw className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">
                        Đang biên soạn {MATERIAL_TYPES.find((m) => m.id === materialType)?.title}...
                      </div>
                      <div className="text-emerald-700 mt-0.5">
                        Hệ thống đang tổng hợp {selectedFormDetails.length} dạng bài, tối ưu công thức LaTeX MathJax và kiểm tra đáp số từng câu.
                      </div>
                    </div>
                  </div>
                )}

                <MarkdownRenderer
                  key={`on_thi_${materialType}_${cleanedMarkdown.length}_${cleanedMarkdown.slice(0, 48)}`}
                  content={cleanedMarkdown}
                  skipWorksheetFormatting
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default OnThiTNTHPTModule;
