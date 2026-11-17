import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Upload,
  FileText,
  FileCheck,
  Award,
  GraduationCap,
  Layers,
  Shuffle,
  Download,
  Printer,
  Copy,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Eye,
  Code2,
  ArrowRight,
  Trash2,
  Wand2,
  Table,
  BookOpen,
  Sliders,
  Check
} from "lucide-react";
import mammoth from "mammoth";
import { apiFetch } from "../../lib/apiFetch";
import { MarkdownRenderer, typesetMathJax } from "../../components/MarkdownRenderer";
import { exportHtmlToWord } from "../../lib/exportUtils";
import { printElement } from "../../lib/print";
import { unflattenMarkdownTables } from "../../lib/bbtRenderer";
import { wrapNakedLatexExpressions, fixDisplayMathTrailingPunctuation } from "../../lib/utils";
import {
  ISOMORPHIC_PRESETS,
  IsomorphicPresetId,
  ExamBlueprint,
  DEFAULT_ISOMORPHIC_BLUEPRINT,
  DEFAULT_ISOMORPHIC_MATRIX_MARKDOWN,
  DEFAULT_ISOMORPHIC_EXAM_MARKDOWN,
  DEFAULT_ISOMORPHIC_GRADING_MARKDOWN,
  buildMatrixMarkdownFromBlueprint
} from "./isomorphicPresetsAndSamples";

interface UploadedSourceFile {
  name: string;
  type: string;
  size: number;
  data: string; // base64 Data URL
}

/**
 * Clean Markdown & LaTeX output before rendering or exporting to Word (.docx):
 * - Removes raw ** bold markers by converting them to <strong>...</strong>
 * - Ensures Vietnamese words with diacritics are never trapped inside $...$
 * - Preserves embedded <svg>...</svg> blocks intact
 */
export function cleanIsomorphicMarkdown(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(/\r\n/g, "\n");

  // Protect <svg>...</svg> blocks from text regex mutations
  const svgVault: string[] = [];
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
    const idx = svgVault.length;
    svgVault.push(match);
    return `@@ISO_SVG_BLOCK_${idx}@@`;
  });

  // Remove code fences around SVG or markdown if AI accidentally wrapped them
  s = s.replace(/```(?:xml|svg|html|markdown)?\s*(@@ISO_SVG_BLOCK_\d+@@)\s*```/gi, "$1");

  // Unflatten any Markdown tables (BBT or statistical/frequency tables jammed on one line or glued after ':')
  s = unflattenMarkdownTables(s);

  // Wrap any naked LaTeX equations outside $...$/$$...$$ (e.g. \log_b^2 a + 5\log_b^2 c - ... = 0) before inner normalization
  s = wrapNakedLatexExpressions(s);

  // Normalize LaTeX inside $...$ and $$...$$: \dfrac -> \frac, naked log/ln/trig -> \log/\ln/\sin..., rescue trapped Vietnamese
  const fixMathBody = (inner: string): string => {
    let fixed = inner.replace(/\\dfrac\b/g, "\\frac");
    // Protect \text{...} / \mathrm{...} before fixing unescaped math functions
    const textVault: string[] = [];
    fixed = fixed.replace(/\\(?:text|mathrm|textbf|textit)\s*\{[^{}]*\}/g, (m) => {
      const idx = textVault.length;
      textVault.push(m);
      return `@@TX_${idx}@@`;
    });
    fixed = fixed.replace(
      /(?<![\\a-zA-Z])(arcsin|arccos|arctan|sin|cos|tan|cot|log|ln|lim)(?!h\b)(?=\s*[\(\[_^0-9a-zA-Z\\])/g,
      "\\$1"
    );
    fixed = fixed.replace(/@@TX_(\d+)@@/g, (_m, idx) => textVault[Number(idx)] || "");
    return fixed;
  };

  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_full, inner: string) => {
    return `$$${fixMathBody(inner)}$$`;
  });

  s = s.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, (_full, inner: string) => {
    let fixed = fixMathBody(inner);
    fixed = fixed.replace(/<br\s*\/?>/gi, "$ <br/> $");
    fixed = fixed.replace(
      /\(\s*(hoặc|với|và|hay|thỏa mãn|điều kiện|loại|nhận)\s+([^()]+)\)/gi,
      "$$ ($1 $$$2$$) $$"
    );
    fixed = fixed.replace(
      /\s+(trên\s+khoảng|trên\s+đoạn|trên\s+nửa\s+khoảng|với\s+mọi|khi\s+và\s+chỉ\s+khi)\s+/gi,
      "$$ $1 $$"
    );
    return `$${fixed}$`;
  });
  s = s.replace(/\$\s*\$/g, "");

  // Normalize bold **...** into <strong>...</strong> outside math so zero raw ** remains
  const mathVault: string[] = [];
  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (m) => {
    const idx = mathVault.length;
    mathVault.push(m);
    return `@@ISO_MATH_${idx}@@`;
  });

  // Strip orphan bullet markers before headings, questions, sections, or choice items
  s = s.replace(/^[ \t]*[-*+•●][ \t]+(?=#{1,6}\s)/gm, "");
  s = s.replace(
    /^[ \t]*[-*+•●][ \t]+(?=(?:\*\*)?(?:Câu|Bài|PHẦN|Mục|Phần|[A-D]\.|[a-d]\))\b)/gm,
    ""
  );
  s = s.replace(/^[ \t]*---+[ \t]*$/gm, "");

  // Ensure exam header lines (not inside tables) are separated by blank lines so Word/PDF never glue them together
  const headerLineRegex =
    /^\s*(?:\*\*|\*)?(?:SỞ\s+GIÁO\s+DỤC|PHÒNG\s+GIÁO\s+DỤC|BỘ\s+GIÁO\s+DỤC|UBND|TRƯỜNG\s+(?:THPT|THCS)|KỲ\s+THI|ĐỀ\s+(?:THI|KIỂM\s+TRA|CHÍNH\s+THỨC|ĐẲNG\s+CẤU)|MÔN\s*[:]|MÃ\s+ĐỀ|Thời\s+gian\s+làm\s+bài|Họ\s+và\s+tên)/i;
  const rawLines = s.split("\n");
  const separatedLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const cur = rawLines[i];
    const prev = separatedLines.length > 0 ? separatedLines[separatedLines.length - 1] : "";
    const curIsTable = /^\s*\|.*\|\s*$/.test(cur);
    const prevIsTable = /^\s*\|.*\|\s*$/.test(prev);
    if (
      !curIsTable &&
      !prevIsTable &&
      prev.trim() !== "" &&
      cur.trim() !== "" &&
      (headerLineRegex.test(cur) || headerLineRegex.test(prev))
    ) {
      separatedLines.push("");
    }
    separatedLines.push(cur);
  }
  s = separatedLines.join("\n");

  // Ensure clean space after **...** if glued to following word
  s = s.replace(/\*\*([^*\n]+?)\*\*(?=[A-Za-zÀ-ỹ0-9])/g, "**$1** ");
  s = s.replace(/\*\*\s*([^*\n]+?)\s*\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*\*/g, "");

  // Restore math
  s = s.replace(/@@ISO_MATH_(\d+)@@/g, (_m, idx) => mathVault[Number(idx)] || "");
  // Restore SVG blocks
  s = s.replace(/@@ISO_SVG_BLOCK_(\d+)@@/g, (_m, idx) => svgVault[Number(idx)] || "");

  s = fixDisplayMathTrailingPunctuation(s);
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Deterministically shuffle multiple-choice options and question order in an exam Markdown
 * to create a new Exam Code (e.g., 102, 103, 104) while updating the quick answer key.
 */
function shuffleExamMarkdownForNewCode(
  examMd: string,
  gradingMd: string,
  newCode: string
): { shuffledExam: string; shuffledGrading: string } {
  const updatedExamHeader = examMd.replace(/Mã đề:\s*\d+/gi, `Mã đề: ${newCode}`);
  const updatedGradingHeader = gradingMd.replace(/MÃ ĐỀ\s*\d+/gi, `MÃ ĐỀ ${newCode}`);

  // Permute A/B/C/D options inside each multiple-choice question block (supports both newline and same-line spacing)
  const answerSwaps: Record<number, { oldAns: string; newAns: string }> = {};
  let mcCounter = 0;

  const shuffledExam = updatedExamHeader.replace(
    /((?:<strong>|\*\*)?Câu\s+(\d+)[\.:](?:<\/strong>|\*\*)?[\s\S]*?)(?:\n|[ \t]{2,})A\.\s*([^\n]+?)(?:\n|[ \t]{2,})B\.\s*([^\n]+?)(?:\n|[ \t]{2,})C\.\s*([^\n]+?)(?:\n|[ \t]{2,})D\.\s*([^\n]+)/g,
    (_full, stem: string, qNumStr: string, optA: string, optB: string, optC: string, optD: string) => {
      mcCounter++;
      const qNum = Number(qNumStr) || mcCounter;
      const originalOpts = [
        { letter: "A", text: optA.trim() },
        { letter: "B", text: optB.trim() },
        { letter: "C", text: optC.trim() },
        { letter: "D", text: optD.trim() }
      ];
      // Deterministic cyclic permutation based on newCode and qNum
      const shift = (Number(newCode) + qNum) % 4;
      const rotated = [
        originalOpts[shift],
        originalOpts[(shift + 1) % 4],
        originalOpts[(shift + 2) % 4],
        originalOpts[(shift + 3) % 4]
      ];
      const letters = ["A", "B", "C", "D"];
      // Record mapping for answer key update
      rotated.forEach((item, newIdx) => {
        if (!answerSwaps[qNum]) answerSwaps[qNum] = { oldAns: "", newAns: "" };
        (answerSwaps[qNum] as any)[item.letter] = letters[newIdx];
      });
      return `${stem}\nA. ${rotated[0].text}\nB. ${rotated[1].text}\nC. ${rotated[2].text}\nD. ${rotated[3].text}`;
    }
  );

  // Update answer key references for Phần I
  let shuffledGrading = updatedGradingHeader;
  Object.entries(answerSwaps).forEach(([qNumStr, mapObj]) => {
    const qNum = Number(qNumStr);
    const mapAny = mapObj as Record<string, string>;
    shuffledGrading = shuffledGrading.replace(
      new RegExp(`(Câu\\s*${qNum}\\s*(?:<\\/strong>|\\*\\*)?\\s*[:\\(]\\s*(?:Chọn\\s+)?)([ABCD])\\b`, "g"),
      (_m, prefix: string, oldLetter: string) => `${prefix}${mapAny[oldLetter] || oldLetter}`
    );
  });

  return { shuffledExam, shuffledGrading };
}

export function IsomorphicExamGenerator() {
  // 1. Selected Preset (4 Core Modes)
  const [selectedPreset, setSelectedPreset] = useState<IsomorphicPresetId>("periodic_7991");

  // 2. Source Input (Upload PDF / Word / Image or Paste Text)
  const [sourceOrigin, setSourceOrigin] = useState<"sample" | "custom">("sample");
  const [sourceText, setSourceText] = useState<string>(
    ISOMORPHIC_PRESETS[0].sampleSourceExamText
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadedSourceFile[]>([]);
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);

  // 3. School / Header customization
  const [schoolName, setSchoolName] = useState<string>(ISOMORPHIC_PRESETS[0].defaultSchoolName);
  const [schoolSubName, setSchoolSubName] = useState<string>(
    ISOMORPHIC_PRESETS[0].defaultSchoolSubName
  );
  const [examCode, setExamCode] = useState<string>(ISOMORPHIC_PRESETS[0].defaultExamCode);
  const [customNotes, setCustomNotes] = useState<string>("");

  // 4. 2-Step Pipeline States
  const [blueprint, setBlueprint] = useState<ExamBlueprint>(DEFAULT_ISOMORPHIC_BLUEPRINT);
  const [showRawBlueprintJson, setShowRawBlueprintJson] = useState<boolean>(false);
  const [matrixMarkdown, setMatrixMarkdown] = useState<string>(() =>
    cleanIsomorphicMarkdown(DEFAULT_ISOMORPHIC_MATRIX_MARKDOWN)
  );
  const [examMarkdown, setExamMarkdown] = useState<string>(() =>
    cleanIsomorphicMarkdown(DEFAULT_ISOMORPHIC_EXAM_MARKDOWN)
  );
  const [gradingMarkdown, setGradingMarkdown] = useState<string>(() =>
    cleanIsomorphicMarkdown(DEFAULT_ISOMORPHIC_GRADING_MARKDOWN)
  );

  // 5. Loading & Pipeline Progress
  const [pipelineStage, setPipelineStage] = useState<
    "idle" | "stage1_extracting" | "stage2_generating"
  >("idle");
  const [pipelineProgress, setPipelineProgress] = useState<number>(0);
  const [pipelineStatusText, setPipelineStatusText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 6. Active Result Tab (3 Required Tabs)
  const [activeResultTab, setActiveResultTab] = useState<"tab1_matrix" | "tab2_exam" | "tab3_grading">(
    "tab2_exam"
  );
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);

  // Refs for MathJax typesetting & Word/PDF export
  const tabContentRef = useRef<HTMLDivElement>(null);
  const fullBundleExportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPresetConfig =
    ISOMORPHIC_PRESETS.find((p) => p.id === selectedPreset) || ISOMORPHIC_PRESETS[0];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Trigger MathJax typesetting whenever tab or content changes
  useEffect(() => {
    if (tabContentRef.current) {
      typesetMathJax(tabContentRef.current);
      const t1 = setTimeout(() => {
        if (tabContentRef.current) typesetMathJax(tabContentRef.current);
      }, 150);
      return () => clearTimeout(t1);
    }
  }, [activeResultTab, matrixMarkdown, examMarkdown, gradingMarkdown, blueprint]);

  // Switch Preset Mode
  const handleSelectPreset = (presetId: IsomorphicPresetId) => {
    setSelectedPreset(presetId);
    const found = ISOMORPHIC_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setSourceOrigin("sample");
      setSourceText(found.sampleSourceExamText);
      setUploadedFiles([]);
      setBlueprint(found.sampleBlueprint);
      setMatrixMarkdown(cleanIsomorphicMarkdown(found.sampleMatrixMarkdown));
      setSchoolName(found.defaultSchoolName);
      setSchoolSubName(found.defaultSchoolSubName);
      setExamCode(found.defaultExamCode);

      if (presetId === "periodic_7991") {
        setExamMarkdown(cleanIsomorphicMarkdown(DEFAULT_ISOMORPHIC_EXAM_MARKDOWN));
        setGradingMarkdown(cleanIsomorphicMarkdown(DEFAULT_ISOMORPHIC_GRADING_MARKDOWN));
      } else {
        setExamMarkdown(
          cleanIsomorphicMarkdown(
            `### ĐÃ NẠP SẴN CẤU TRÚC & ĐỀ GỐC MẪU: ${found.fullTitle.toUpperCase()}\n\n` +
              `- **Ma trận & Bản đặc tả JSON Blueprint (${found.sampleBlueprint.items.length} mục/câu)** đã được phân tích và nạp sẵn ở **Tab 1: Ma trận & Đặc tả đối chiếu**.\n` +
              `- Bấm **"Chạy GĐ 2 từ Blueprint hiện tại"** (hoặc **"Chạy Trọn Bộ 2 Giai Đoạn"**) để AI sinh bộ **Đề đẳng cấu mới 100%** và **Đáp án - Hướng dẫn chấm chi tiết** theo đúng cấu trúc chuẩn của chế độ này.\n` +
              `- Nếu bạn tải lên đề thi gốc riêng (PDF / Word / Ảnh / Văn bản), hệ thống sẽ tự động thay thế đề mẫu và bám sát **100% đề gốc & yêu cầu của bạn**.`
          )
        );
        setGradingMarkdown(
          cleanIsomorphicMarkdown(
            `### HƯỚNG DẪN CHẤM SẼ ĐƯỢC SINH TỰ ĐỘNG CHO CHẾ ĐỘ: ${found.fullTitle.toUpperCase()}\n\n` +
              `Hãy bấm **"Chạy GĐ 2 từ Blueprint hiện tại"** hoặc **"Chạy Trọn Bộ 2 Giai Đoạn"** ở bảng điều khiển bên trái để tạo **Đề đẳng cấu** và **Đáp án – Hướng dẫn chấm chi tiết**.`
          )
        );
        setActiveResultTab("tab1_matrix");
      }

      showToast(`Đã nạp cấu trúc & đề gốc mẫu: ${found.shortTitle}`);
    }
  };

  // Clear sample exam to paste/upload user's own source exam
  const handleClearToCustomSource = () => {
    setSourceOrigin("custom");
    setSourceText("");
    setUploadedFiles([]);
    setErrorMsg(null);
    showToast("Đã xóa trắng đề mẫu. Hãy tải file hoặc dán đề gốc của bạn!");
  };

  // Handle Multi-file Upload (PDF, Word .docx, Images, Text)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsReadingFile(true);
    setErrorMsg(null);
    const newFiles: UploadedSourceFile[] = [];
    let appendedText = "";

    const isCurrentlySample =
      sourceOrigin === "sample" ||
      ISOMORPHIC_PRESETS.some((p) => p.sampleSourceExamText.trim() === sourceText.trim());

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith(".docx")) {
          const ab = await file.arrayBuffer();
          const res = await mammoth.extractRawText({ arrayBuffer: ab });
          if (res.value && res.value.trim()) {
            appendedText += `\n\n--- NỘI DUNG TỪ FILE WORD (${file.name}) ---\n` + res.value.trim();
          }
        } else if (lowerName.endsWith(".txt") || file.type.startsWith("text/")) {
          const txt = await file.text();
          if (txt.trim()) {
            appendedText += `\n\n--- NỘI DUNG TỪ FILE (${file.name}) ---\n` + txt.trim();
          }
        } else {
          // PDF or Image -> Read as base64 Data URL for Gemini multimodal inspection
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error(`Không thể đọc tệp ${file.name}`));
            reader.readAsDataURL(file);
          });
          newFiles.push({
            name: file.name,
            type: file.type || (lowerName.endsWith(".pdf") ? "application/pdf" : "image/png"),
            size: file.size,
            data: dataUrl
          });
        }
      }

      setSourceOrigin("custom");

      if (isCurrentlySample) {
        // Isolate user's uploaded exam: wipe built-in sample text so sample never mixes with user files
        setUploadedFiles(newFiles);
        setSourceText(appendedText.trim());
      } else {
        if (newFiles.length > 0) {
          setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
        if (appendedText.trim()) {
          setSourceText((prev) => (prev.trim() ? prev + appendedText : appendedText.trim()));
        }
      }

      showToast(
        `Đã nạp ${fileList.length} tệp đề gốc của bạn thành công! AI sẽ bám sát 100% đề gốc & yêu cầu.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi khi đọc tệp tải lên.");
    } finally {
      setIsReadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ============================================================================
  // GIAI ĐOẠN 1: TRÍCH XUẤT MA TRẬN & ĐẶC TẢ ĐỀ GỐC (BLUEPRINT EXTRACTION)
  // ============================================================================
  const runStage1ExtractBlueprint = async (standalone = true): Promise<ExamBlueprint | null> => {
    if (!sourceText.trim() && uploadedFiles.length === 0) {
      setErrorMsg("Vui lòng tải lên tệp PDF/Word/Ảnh đề gốc hoặc dán văn bản đề gốc vào ô bên dưới.");
      return null;
    }

    setErrorMsg(null);
    setPipelineStage("stage1_extracting");
    setPipelineProgress(20);
    setPipelineStatusText(
      sourceOrigin === "custom"
        ? "Giai đoạn 1/2: Đang bám sát 100% đề gốc của bạn để trích xuất Ma trận & JSON Blueprint..."
        : "Giai đoạn 1/2: Đang quét đề gốc và trích xuất Ma trận & Bản đặc tả JSON Blueprint..."
    );

    try {
      const response = await apiFetch("/api/isomorphic-exam/extract-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: sourceText,
          files: uploadedFiles,
          presetId: selectedPreset,
          customNotes,
          isCustomSource: sourceOrigin === "custom"
        })
      });

      const data = await response.json();
      if (!response.ok || !data?.blueprint) {
        throw new Error(
          data?.error || "Không thể trích xuất Ma trận Blueprint từ đề gốc. Vui lòng thử lại."
        );
      }

      setBlueprint(data.blueprint);
      setMatrixMarkdown(cleanIsomorphicMarkdown(buildMatrixMarkdownFromBlueprint(data.blueprint)));
      if (standalone) {
        setActiveResultTab("tab1_matrix");
        setPipelineStage("idle");
        setPipelineProgress(0);
      } else {
        setPipelineProgress(50);
      }
      showToast(
        `Giai đoạn 1 hoàn tất: Đã trích xuất ${data.blueprint.items?.length || 0} câu/ý từ đề gốc!`
      );
      return data.blueprint;
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi ở Giai đoạn 1 (Trích xuất Ma trận đề gốc).");
      setPipelineStage("idle");
      setPipelineProgress(0);
      return null;
    }
  };

  // ============================================================================
  // GIAI ĐOẠN 2: SINH ĐỀ ĐẲNG CẤU & HƯỚNG DẪN CHẤM CHI TIẾT (ISOMORPHIC GENERATION)
  // ============================================================================
  const runStage2GenerateIsomorphicExam = async (
    blueprintToUse?: ExamBlueprint,
    codeToUse?: string
  ) => {
    const activeBp = blueprintToUse || blueprint;
    const activeCode = codeToUse || examCode;

    if (!activeBp || !Array.isArray(activeBp.items) || activeBp.items.length === 0) {
      setErrorMsg("Chưa có dữ liệu Blueprint từ Giai đoạn 1. Vui lòng chạy Giai đoạn 1 trước.");
      return;
    }

    setErrorMsg(null);
    setPipelineStage("stage2_generating");
    setPipelineProgress(65);
    setPipelineStatusText(
      `Giai đoạn 2/2: Đang sinh Đề đẳng cấu (Mã đề ${activeCode}), vẽ hình SVG & lập Hướng dẫn chấm chi tiết...`
    );

    try {
      const response = await apiFetch("/api/isomorphic-exam/generate-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: activeBp,
          presetId: selectedPreset,
          examCode: activeCode,
          schoolName,
          schoolSubName,
          customNotes,
          isCustomSource: sourceOrigin === "custom"
        })
      });

      const data = await response.json();
      if (!response.ok || !data?.examMarkdown) {
        throw new Error(data?.error || "Không thể sinh Đề đẳng cấu ở Giai đoạn 2. Vui lòng thử lại.");
      }

      if (data.matrixMarkdown) {
        setMatrixMarkdown(cleanIsomorphicMarkdown(data.matrixMarkdown));
      }
      setExamMarkdown(cleanIsomorphicMarkdown(data.examMarkdown));
      if (data.gradingGuideMarkdown) {
        setGradingMarkdown(cleanIsomorphicMarkdown(data.gradingGuideMarkdown));
      }

      setPipelineProgress(100);
      setActiveResultTab("tab2_exam");
      showToast(`Đã sinh thành công Đề đẳng cấu (Mã đề ${activeCode}) và Hướng dẫn chấm chi tiết!`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi ở Giai đoạn 2 (Sinh Đề đẳng cấu).");
    } finally {
      setPipelineStage("idle");
      setTimeout(() => setPipelineProgress(0), 600);
    }
  };

  // Run Full 2-Step Pipeline sequentially in 1 click
  const handleRunFull2StepPipeline = async () => {
    const extractedBp = await runStage1ExtractBlueprint(false);
    if (extractedBp) {
      await runStage2GenerateIsomorphicExam(extractedBp, examCode);
    }
  };

  // Instantaneous Exam Code Shuffler in Tab 2
  const handleShuffleExamCode = () => {
    const nextCodeNum = (Number(examCode) || 101) + 1;
    const nextCode = String(nextCodeNum);
    setExamCode(nextCode);
    const { shuffledExam, shuffledGrading } = shuffleExamMarkdownForNewCode(
      examMarkdown,
      gradingMarkdown,
      nextCode
    );
    setExamMarkdown(shuffledExam);
    setGradingMarkdown(shuffledGrading);
    showToast(`Đã trộn sang Mã đề ${nextCode} và cập nhật Bảng đáp án tương ứng!`);
  };

  // Export Active Tab to Word (.docx)
  const handleExportActiveTabWord = async () => {
    if (!tabContentRef.current) return;
    setIsExportingWord(true);
    try {
      const tabSuffix =
        activeResultTab === "tab1_matrix"
          ? "MaTran_DacTa_CV7991"
          : activeResultTab === "tab2_exam"
          ? `DeDangCau_Ma${examCode}`
          : `DapAn_HDC_Ma${examCode}`;
      await exportHtmlToWord(tabContentRef.current, `${tabSuffix}.docx`);
      showToast(`Đã xuất tệp Word (${tabSuffix}.docx) chuẩn Equation OMML!`);
    } catch (err: any) {
      showToast("Lỗi khi xuất file Word: " + (err?.message || "Vui lòng thử lại."));
    } finally {
      setIsExportingWord(false);
    }
  };

  // Export Full 3-in-1 Package (Ma trận + Đề thi + Đáp án & HDC) to Word (.docx)
  const handleExportFullBundleWord = async () => {
    if (!fullBundleExportRef.current) return;
    setIsExportingWord(true);
    try {
      typesetMathJax(fullBundleExportRef.current);
      await new Promise((r) => setTimeout(r, 250));
      await exportHtmlToWord(
        fullBundleExportRef.current,
        `HoSo_DeDangCau_Ma${examCode}_Full_3in1.docx`
      );
      showToast("Đã xuất trọn bộ Hồ sơ Đề đẳng cấu (Ma trận + Đề thi + HDC) ra file Word (.docx)!");
    } catch (err: any) {
      showToast("Lỗi khi xuất trọn bộ Word: " + (err?.message || "Vui lòng thử lại."));
    } finally {
      setIsExportingWord(false);
    }
  };

  // Print / Save PDF
  const handlePrintPdf = async () => {
    if (!tabContentRef.current) return;
    try {
      await printElement(tabContentRef.current, `DeDangCau_Ma${examCode}`);
    } catch (_) {
      showToast("Không thể mở cửa sổ In/PDF.");
    }
  };

  const handleCopyActiveMarkdown = () => {
    const contentToCopy =
      activeResultTab === "tab1_matrix"
        ? matrixMarkdown
        : activeResultTab === "tab2_exam"
        ? examMarkdown
        : gradingMarkdown;
    navigator.clipboard.writeText(contentToCopy);
    showToast("Đã sao chép nội dung vào bộ nhớ tạm!");
  };

  const isBusy = pipelineStage !== "idle";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 border border-indigo-700/50 p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                2-Step AI Pipeline (Blueprint JSON → Isomorphic Exam)
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Chuẩn CV 7991/BGDĐT & GDPT 2018
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Tự động vẽ Hình SVG & Bảng biểu
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
              <Wand2 className="w-8 h-8 text-emerald-400 shrink-0" />
              Tạo Đề Tương Tự Từ Đề Gốc Bất Kỳ (Đề Đẳng Cấu)
            </h1>
            <p className="text-sm text-slate-300 max-w-4xl leading-relaxed">
              Phân tích sâu đề gốc bằng quy trình 2 giai đoạn: Trích xuất Ma trận &amp; Bản đặc tả (Blueprint JSON) giữ nguyên 100% cấu trúc, tỷ lệ nhận thức và kỹ thuật giải cốt lõi → Sinh đề mới đẳng cấu hoàn toàn về số liệu, hàm số, hình học SVG kèm Hướng dẫn chấm chia nhỏ đến 0,25 điểm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportFullBundleWord}
              disabled={isExportingWord}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
            >
              {isExportingWord ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Xuất Trọn Bộ Hồ Sơ 3-in-1 (.docx)</span>
            </button>
          </div>
        </div>

        {/* QUICK-SELECT 4 PRESETS BAR */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              Chọn nhanh 4 Chế độ Ra đề Đẳng cấu (Preset chuẩn Bộ/Sở GD&ĐT):
            </span>
            <span className="text-xs text-slate-400">
              Đang chọn: <strong className="text-emerald-400">{currentPresetConfig.fullTitle}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {ISOMORPHIC_PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? "bg-indigo-600/25 border-emerald-400 shadow-lg shadow-indigo-950/60 ring-1 ring-emerald-400/60"
                      : "bg-slate-900/80 border-slate-700/80 hover:bg-slate-800/80 hover:border-slate-600"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isSelected
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-slate-800 text-indigo-300"
                        }`}
                      >
                        {preset.badge}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {preset.defaultDuration} • Thang {preset.defaultTotalPoints}đ
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug">
                      {preset.shortTitle}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {preset.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-400 font-medium flex items-center justify-between">
                    <span className="truncate">{preset.standardsNote}</span>
                    {isSelected && <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE: LEFT INPUT & PIPELINE CONTROLS (5 COLS) | RIGHT 3-TAB PREVIEW (7 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                Nguồn Đề Gốc (PDF / Word / Ảnh / Văn bản)
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearToCustomSource}
                  className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  Xóa trắng / Nhập đề riêng
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(selectedPreset)}
                  className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
                >
                  Nạp lại đề gốc mẫu
                </button>
              </div>
            </div>

            {/* Source Origin Status Banner */}
            <div
              className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                sourceOrigin === "custom"
                  ? "bg-amber-950/50 border-amber-500/50 text-amber-200"
                  : "bg-indigo-950/50 border-indigo-500/40 text-indigo-200"
              }`}
            >
              <span className="font-semibold">
                {sourceOrigin === "custom"
                  ? "Đang dùng: Đề gốc của bạn — AI sẽ bám sát 100% cấu trúc, câu hỏi & yêu cầu bổ sung"
                  : `Đang dùng: Đề gốc mẫu nạp sẵn (${currentPresetConfig.badge})`}
              </span>
            </div>

            {/* File Dropzone */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReadingFile || isBusy}
                className="w-full py-3.5 px-4 rounded-xl border-2 border-dashed border-indigo-500/50 hover:border-emerald-400 bg-slate-900/70 hover:bg-slate-900 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Upload className="w-4 h-4" />
                  <span>
                    {isReadingFile
                      ? "Đang đọc tệp đề gốc..."
                      : "Tải lên tệp Đề gốc (.PDF, .DOCX, Ảnh chụp đề thi)"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Hỗ trợ đọc trực tiếp công thức Toán, bảng biến thiên và hình vẽ từ PDF / Ảnh bằng Gemini Multimodal
                </span>
              </button>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5">
                  {uploadedFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="truncate font-medium text-slate-200">{f.name}</span>
                        <span className="text-[10px] text-slate-500">
                          ({Math.round(f.size / 1024)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        title="Xóa tệp"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Source Exam Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Nội dung văn bản Đề gốc (có thể dán trực tiếp hoặc chỉnh sửa):
                </label>
                <span className="text-[11px] text-slate-400">
                  {sourceText.length} ký tự
                </span>
              </div>
              <textarea
                rows={9}
                value={sourceText}
                onChange={(e) => {
                  const val = e.target.value;
                  setSourceText(val);
                  if (val.trim() !== currentPresetConfig.sampleSourceExamText.trim()) {
                    setSourceOrigin("custom");
                  }
                }}
                placeholder="Dán nội dung đề thi gốc vào đây hoặc tải lên file PDF / Word / Ảnh ở trên..."
                className="w-full rounded-xl bg-slate-950/90 border border-slate-700 p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Header & Custom Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-700/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Cơ quan chủ quản
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tên Trường / Đơn vị
                </label>
                <input
                  type="text"
                  value={schoolSubName}
                  onChange={(e) => setSchoolSubName(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Mã đề khởi tạo
                </label>
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-emerald-400 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Yêu cầu bổ sung cho AI (Tùy chọn - VD: Giới hạn đến Chương II, đổi bối cảnh thực tế sang kinh tế...):
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Nhập ghi chú giới hạn kiến thức hoặc bối cảnh thực tế nếu muốn..."
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200"
              />
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 2-STEP PIPELINE EXECUTION BUTTONS */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleRunFull2StepPipeline}
                disabled={isBusy}
                className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all cursor-pointer ${
                  isBusy
                    ? "bg-indigo-800/60 text-indigo-200 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-900/40"
                }`}
              >
                {isBusy ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>{pipelineStatusText}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Chạy Trọn Bộ 2 Giai Đoạn: Trích Xuất Blueprint → Sinh Đề Đẳng Cấu</span>
                  </>
                )}
              </button>

              {/* Individual Stage Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => runStage1ExtractBlueprint()}
                  disabled={isBusy}
                  className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-indigo-300 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Chỉ chạy GĐ 1 (Trích xuất Ma trận)</span>
                </button>
                <button
                  type="button"
                  onClick={() => runStage2GenerateIsomorphicExam()}
                  disabled={isBusy}
                  className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Chạy GĐ 2 từ Blueprint hiện tại</span>
                </button>
              </div>

              {/* Pipeline Progress Bar */}
              {isBusy && (
                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-indigo-500 h-full transition-all duration-300"
                      style={{ width: `${pipelineProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* EXTRACTED BLUEPRINT QUICK SUMMARY CARD */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Tóm tắt JSON Blueprint Đề gốc (Giai đoạn 1)
              </h3>
              <button
                type="button"
                onClick={() => setShowRawBlueprintJson((v) => !v)}
                className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showRawBlueprintJson ? "Ẩn JSON thô" : "Xem/Sửa JSON"}</span>
              </button>
            </div>

            {/* Cognitive Level Ratio Bars */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
                <div className="text-[11px] text-slate-400">Nhận biết</div>
                <div className="text-base font-extrabold text-emerald-400">
                  {blueprint.cognitive_ratio?.nhan_biet_percent ?? 40}%
                </div>
                <div className="text-[10px] text-slate-500">
                  {blueprint.cognitive_ratio?.nhan_biet_points ?? 4.0} điểm
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
                <div className="text-[11px] text-slate-400">Thông hiểu</div>
                <div className="text-base font-extrabold text-blue-400">
                  {blueprint.cognitive_ratio?.thong_hieu_percent ?? 30}%
                </div>
                <div className="text-[10px] text-slate-500">
                  {blueprint.cognitive_ratio?.thong_hieu_points ?? 3.0} điểm
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
                <div className="text-[11px] text-slate-400">Vận dụng</div>
                <div className="text-base font-extrabold text-amber-400">
                  {blueprint.cognitive_ratio?.van_dung_percent ?? 20}%
                </div>
                <div className="text-[10px] text-slate-500">
                  {blueprint.cognitive_ratio?.van_dung_points ?? 2.0} điểm
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80">
                <div className="text-[11px] text-slate-400">Vận dụng cao</div>
                <div className="text-base font-extrabold text-rose-400">
                  {blueprint.cognitive_ratio?.van_dung_cao_percent ?? 10}%
                </div>
                <div className="text-[10px] text-slate-500">
                  {blueprint.cognitive_ratio?.van_dung_cao_points ?? 1.0} điểm
                </div>
              </div>
            </div>

            {showRawBlueprintJson ? (
              <textarea
                rows={10}
                value={JSON.stringify(blueprint, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    if (parsed && Array.isArray(parsed.items)) {
                      setBlueprint(parsed);
                    }
                  } catch (_) {}
                }}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-[11px] font-mono text-emerald-300"
              />
            ) : (
              <div className="text-xs text-slate-300 space-y-1.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Đề gốc:</span>{" "}
                  <strong className="text-white">{blueprint.metadata?.exam_title}</strong>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <span className="text-slate-400">Môn/Khối:</span>{" "}
                    <strong>
                      {blueprint.metadata?.subject} - {blueprint.metadata?.grade}
                    </strong>
                  </span>
                  <span>
                    <span className="text-slate-400">Thời gian:</span>{" "}
                    <strong>{blueprint.metadata?.duration}</strong>
                  </span>
                  <span>
                    <span className="text-slate-400">Số mục/ý:</span>{" "}
                    <strong className="text-emerald-400">{blueprint.items?.length || 0} mục</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: 3 VISUAL TABS & WORD EXPORT */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col flex-1 min-h-[720px]">
            {/* 3 TABS NAVIGATION HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-700">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveResultTab("tab1_matrix")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeResultTab === "tab1_matrix"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-900/80 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <Table className="w-4 h-4 text-amber-300" />
                  <span>Tab 1: Ma trận & Đặc tả đối chiếu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveResultTab("tab2_exam")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeResultTab === "tab2_exam"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-900/80 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-300" />
                  <span>Tab 2: Đề thi tương tự (Mã {examCode})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveResultTab("tab3_grading")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeResultTab === "tab3_grading"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-900/80 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <FileCheck className="w-4 h-4 text-cyan-300" />
                  <span>Tab 3: Đáp án & Thang điểm chi tiết</span>
                </button>
              </div>

              {/* Action Toolbar for Current Tab */}
              <div className="flex flex-wrap items-center gap-2">
                {activeResultTab === "tab2_exam" && (
                  <button
                    type="button"
                    onClick={handleShuffleExamCode}
                    title="Trộn thứ tự phương án A, B, C, D sang mã đề mới và tự động cập nhật bảng đáp án"
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Trộn mã đề ({Number(examCode) + 1})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyActiveMarkdown}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  title="Sao chép Markdown của Tab hiện tại"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sao chép</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportActiveTabWord}
                  disabled={isExportingWord}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Tab (.docx)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  title="In hoặc xuất PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">In / PDF</span>
                </button>
              </div>
            </div>

            {/* DOCUMENT RENDERING AREA (WHITE PAPER A4 PREVIEW) */}
            <div className="flex-1 mt-4 overflow-y-auto max-h-[800px] pr-1 custom-scrollbar">
              <div
                ref={tabContentRef}
                className="bg-white text-slate-900 p-6 md:p-8 rounded-xl shadow-inner border border-slate-200 tex2jax_process"
                style={{ fontFamily: "'Times New Roman', serif", lineHeight: 1.65 }}
              >
                {activeResultTab === "tab1_matrix" && (
                  <div className="space-y-6">
                    {/* Rendered Markdown Matrix & Specification Table */}
                    <MarkdownRenderer
                      key={`iso_matrix_${matrixMarkdown.length}`}
                      content={matrixMarkdown}
                      skipWorksheetFormatting
                    />

                    {/* Detailed Blueprint Items Table from Stage 1 */}
                    <div className="pt-4 border-t border-slate-300">
                      <h3 className="text-base font-bold text-slate-900 mb-3">
                        PHỤ LỤC: BẢNG ĐẶC TẢ CHI TIẾT KỸ THUẬT GIẢI & BẪY TƯ DUY TRÍCH XUẤT TỪ ĐỀ GỐC (GIAI ĐOẠN 1)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-slate-400 text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-900 font-bold">
                              <th className="border border-slate-400 px-2.5 py-2 text-center w-24">
                                Câu / Ý
                              </th>
                              <th className="border border-slate-400 px-2.5 py-2 text-center w-16">
                                Điểm
                              </th>
                              <th className="border border-slate-400 px-2.5 py-2 text-left">
                                Chuyên đề / Mạch kiến thức
                              </th>
                              <th className="border border-slate-400 px-2.5 py-2 text-center w-24">
                                Mức độ
                              </th>
                              <th className="border border-slate-400 px-2.5 py-2 text-left">
                                Kỹ thuật giải cốt lõi & Bẫy tư duy
                              </th>
                              <th className="border border-slate-400 px-2.5 py-2 text-left">
                                Bối cảnh thực tế / Hình vẽ & Bảng
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(blueprint.items || []).map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="border border-slate-400 px-2.5 py-2 font-bold text-center">
                                  {item.id}
                                </td>
                                <td className="border border-slate-400 px-2.5 py-2 text-center font-semibold">
                                  {item.points}đ
                                </td>
                                <td className="border border-slate-400 px-2.5 py-2">
                                  <div className="font-bold">{item.topic}</div>
                                  {item.subtopic && (
                                    <div className="text-slate-600 italic">{item.subtopic}</div>
                                  )}
                                </td>
                                <td className="border border-slate-400 px-2.5 py-2 text-center font-semibold">
                                  {item.cognitive_level}
                                </td>
                                <td className="border border-slate-400 px-2.5 py-2">
                                  <MarkdownRenderer
                                    content={item.core_technique || ""}
                                    skipWorksheetFormatting
                                  />
                                </td>
                                <td className="border border-slate-400 px-2.5 py-2">
                                  {item.real_world_context && (
                                    <div>
                                      <strong>Thực tế:</strong> {item.real_world_context}
                                    </div>
                                  )}
                                  {item.visual_description && (
                                    <div>
                                      <strong>Trực quan:</strong> {item.visual_description}
                                    </div>
                                  )}
                                  {!item.real_world_context && !item.visual_description && (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeResultTab === "tab2_exam" && (
                  <MarkdownRenderer
                    key={`iso_exam_${examCode}_${examMarkdown.length}`}
                    content={examMarkdown}
                    skipWorksheetFormatting
                  />
                )}

                {activeResultTab === "tab3_grading" && (
                  <MarkdownRenderer
                    key={`iso_grading_${examCode}_${gradingMarkdown.length}`}
                    content={gradingMarkdown}
                    skipWorksheetFormatting
                  />
                )}
              </div>
            </div>

            {/* Hidden Full Bundle Container for 3-in-1 Word Export */}
            <div
              ref={fullBundleExportRef}
              className="hidden tex2jax_process"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              <h1>PHẦN 1: MA TRẬN & BẢN ĐẶC TẢ ĐỐI CHIẾU (CHUẨN CÔNG VĂN 7991/BGDĐT)</h1>
              <MarkdownRenderer content={matrixMarkdown} skipWorksheetFormatting />
              <hr />
              <h1>PHẦN 2: ĐỀ THI ĐẲNG CẤU (MÃ ĐỀ {examCode})</h1>
              <MarkdownRenderer content={examMarkdown} skipWorksheetFormatting />
              <hr />
              <h1>PHẦN 3: ĐÁP ÁN – HƯỚNG DẪN CHẤM – THANG ĐIỂM CHI TIẾT</h1>
              <MarkdownRenderer content={gradingMarkdown} skipWorksheetFormatting />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IsomorphicExamGenerator;
