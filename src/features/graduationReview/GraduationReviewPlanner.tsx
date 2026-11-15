import React, { useState, useEffect, useRef } from "react";
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  Download,
  Copy,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Key,
  Eye,
  FileCode,
  RotateCw,
  Target,
  FileCheck,
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  BookOpenText,
  Landmark,
  Globe,
  Scale,
  Terminal,
  Languages,
  RefreshCw,
  Check,
  FileText,
  Upload,
  Search,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { MarkdownRenderer, typesetMathJax } from "../../components/MarkdownRenderer";
import { exportHtmlToWord } from "../../lib/exportUtils";
import { printElement } from "../../lib/print";
import { apiFetch, API_KEY_STORAGE, setCustomApiKey } from "../../lib/apiFetch";
import { cleanDocumentContent } from "../../pages/Worksheets";
import {
  normalizeMathText,
  cleanMathAndUnwrapHeadings,
  fixBrokenLatexSyntax,
  rescueTrappedVietnameseFromMath,
  sanitizeLatexMathAndDelimiters,
  fixAndMergeMathArrows
} from "../../lib/globalMath";
import { generateContent } from "../../services/geminiService";
import {
  GRADUATION_SUBJECTS,
  DEFAULT_AI_MODELS,
  SubjectConfig,
  AiModelItem,
  MATH_105_PERIOD_TOPICS,
  TopicItem,
  getSubjectCategory
} from "./graduationSubjects";
import { getSampleLessonPlan, SAMPLE_MATH_PLAN } from "./sampleLessonPlans";

export const STUDENT_LEVELS = [
  {
    id: "intermediate",
    label: "Lớp đại trà: Mục tiêu 6.5 - 8.0 (Xét TN & ĐH khối chính)",
    tag: "Nhận biết - Thông hiểu - Vận dụng vừa sức",
    color: "blue",
    desc: "Bám sát kiến thức cốt lõi, nhận diện nhanh dạng đồ thị và bảng biến thiên; thành thạo xử lý câu hỏi Đúng/Sai và trả lời ngắn mức độ cơ bản - thông hiểu.",
  },
  {
    id: "advanced",
    label: "Nhóm lớp phân hóa nâng cao 12A1, 12A2, 12A3: Mục tiêu 8.0+ (Tham số m, VDC)",
    tag: "Vận dụng cao - Phân hóa sâu",
    color: "purple",
    desc: "Chuyên sâu các bài toán chứa tham số m, bài toán cực trị/đơn điệu nâng cao, mô hình hóa thực tế tối ưu phức hợp và rèn luyện tư duy chinh phục điểm 8+ đến 10.",
  },
  {
    id: "basic",
    label: "Mục tiêu 5.0 - 6.5 (Cơ bản / Chống trượt tốt nghiệp)",
    tag: "Nhận biết - Thông hiểu căn bản",
    color: "emerald",
    desc: "Củng cố kiến thức nền tảng, công thức then chốt, đọc hiểu bảng biến thiên cơ bản và phương pháp tránh bẫy trắc nghiệm.",
  },
];

export const PERIOD_OPTIONS = [
  { value: 1, label: "1 tiết (45 phút - Ôn trọng điểm nhanh)" },
  { value: 2, label: "2 tiết (90 phút - Ôn tập tiêu chuẩn)" },
  { value: 3, label: "3 tiết (135 phút - Mặc định PPCT 105 tiết)" },
  { value: 4, label: "4 tiết (180 phút - Chuyên đề nâng cao mở rộng)" },
  { value: 5, label: "5 tiết (225 phút - Chuyên đề lớn / Tích phân)" },
  { value: 8, label: "8 tiết (360 phút - Chuyên đề lớn Tổ hợp & Xác suất)" },
];

// Kế hoạch bài dạy mẫu chuẩn Công văn 5512/BGDĐT cho các môn
export const SAMPLE_LESSON_PLAN = SAMPLE_MATH_PLAN;


// Icon Helper Component
const SubjectIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className = "w-4 h-4" }) => {
  switch (iconName) {
    case "Calculator":
      return <Calculator className={className} />;
    case "Atom":
      return <Atom className={className} />;
    case "FlaskConical":
      return <FlaskConical className={className} />;
    case "Dna":
      return <Dna className={className} />;
    case "BookOpenText":
      return <BookOpenText className={className} />;
    case "Landmark":
      return <Landmark className={className} />;
    case "Globe":
      return <Globe className={className} />;
    case "Scale":
      return <Scale className={className} />;
    case "Terminal":
      return <Terminal className={className} />;
    case "Languages":
      return <Languages className={className} />;
    default:
      return <BookOpen className={className} />;
  }
};

export function GraduationReviewPlannerModule() {
  // Subject Control (Defaults to 'toan' as requested)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("toan");
  const currentSubject: SubjectConfig =
    GRADUATION_SUBJECTS.find((s) => s.id === selectedSubjectId) || GRADUATION_SUBJECTS[0];

  // Cơ chế tiếp nhận thông tin đầu vào từ giáo viên (3 trường hợp linh hoạt):
  // 'ppct105': Trường hợp 1: Chọn bài từ Khung PPCT 105 tiết mặc định (2026-2027)
  // 'file_ppct': Trường hợp 2: Tệp PPCT đính kèm / Tải lên (Đọc cấu trúc file PDF 105 tiết)
  // 'custom': Trường hợp 3: Giáo viên tự gõ chủ đề / nội dung ôn tập bất kỳ
  const [inputMode, setInputMode] = useState<"ppct105" | "file_ppct" | "custom">("ppct105");

  // Selected topic from default 105-period syllabus (or subject topics)
  const [selectedMathTopicId, setSelectedMathTopicId] = useState<string>("bai_1");
  const [topicSearchKeyword, setTopicSearchKeyword] = useState<string>("");

  // Custom Topic inputs (Trường hợp 3)
  const [customTopicTitle, setCustomTopicTitle] = useState<string>("");
  const [customPeriodRange, setCustomPeriodRange] = useState<string>("Tiết bổ trợ ôn thi buổi chiều");
  const [customFocusGoals, setCustomFocusGoals] = useState<string>("");

  // File PPCT inputs (Trường hợp 2)
  const attachedPdfPath = "/assets/aistudio/PPCT__n_TN_12_n_m_26-27_105_ti_t_824c6e08.pdf";
  const [attachedFileName, setAttachedFileName] = useState<string>("PPCT__n_TN_12_n_m_26-27_105_ti_t_824c6e08.pdf");
  const [uploadedFileStatus, setUploadedFileStatus] = useState<string>("Tệp PPCT ôn TN THPT 105 tiết (2026-2027) đã sẵn sàng.");

  // General controls
  const [periods, setPeriods] = useState<number>(3); // Default 3 periods for Lesson 1
  const [studentTarget, setStudentTarget] = useState<string>("intermediate");
  const [includeExamFormats, setIncludeExamFormats] = useState<boolean>(true);

  // AI Model Controls & User Account Live Fetching
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      localStorage.getItem(API_KEY_STORAGE) ||
      localStorage.getItem("gemini_api_key") ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      ""
    );
  });
  const [geminiModel, setGeminiModel] = useState<string>("gemini-3.8-flash");
  const [availableModels, setAvailableModels] = useState<AiModelItem[]>(DEFAULT_AI_MODELS);
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
  const [modelsFetchedFromAccount, setModelsFetchedFromAccount] = useState<boolean>(false);

  // Output and Status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [resultPlan, setResultPlan] = useState<string>(() => cleanGraduationPlanMarkdown(SAMPLE_LESSON_PLAN));
  const [activeTab, setActiveTab] = useState<"preview" | "markdown">("preview");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Current active topic item
  const currentMathTopic: TopicItem =
    currentSubject.topics.find((t) => t.id === selectedMathTopicId) || currentSubject.topics[0];

  // Auto-set duration when choosing a topic from curriculum
  const handleSelectTopicItem = (topic: TopicItem) => {
    setSelectedMathTopicId(topic.id);
    if (topic.defaultPeriods) {
      setPeriods(topic.defaultPeriods);
    }
  };

  useEffect(() => {
    if (activeTab === "preview" && previewContainerRef.current) {
      typesetMathJax(previewContainerRef.current);
      const t1 = setTimeout(() => {
        if (previewContainerRef.current) typesetMathJax(previewContainerRef.current);
      }, 100);
      const t2 = setTimeout(() => {
        if (previewContainerRef.current) typesetMathJax(previewContainerRef.current);
      }, 400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [activeTab, resultPlan]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Dynamic Query: Fetch live models supported by user's Gemini API Key via Server Proxy
  const fetchAvailableModels = async (keyToUse?: string, notifyUser: boolean = false) => {
    const activeKey = (keyToUse !== undefined ? keyToUse : apiKey).trim();
    if (!activeKey) {
      if (notifyUser) showToast("Vui lòng nhập API Key trước khi làm mới danh sách mô hình.");
      return;
    }

    setIsFetchingModels(true);
    try {
      localStorage.setItem(API_KEY_STORAGE, activeKey);
      const res = await apiFetch("/api/list-gemini-models");
      if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể truy vấn danh sách mô hình.`);
      const data = await res.json();
      if (Array.isArray(data.models)) {
        const filtered = data.models
          .filter((m: any) => {
            const rawName = (m.name || "").replace("models/", "");
            const methods = m.supportedGenerationMethods || [];
            const canGenContent = methods.includes("generateContent");
            const isDeprecated =
              rawName.startsWith("gemini-1.") ||
              rawName.startsWith("gemini-2.") ||
              rawName.startsWith("gemini-3.5") ||
              rawName.includes("2.5") ||
              rawName.includes("3-flash") ||
              rawName.includes("preview") ||
              rawName.includes("latest") ||
              rawName === "gemini-pro";
            const isSpecialized =
              rawName.includes("embedding") ||
              rawName.includes("imagen") ||
              rawName.includes("aqa") ||
              rawName.includes("whisper") ||
              rawName.includes("tts") ||
              rawName.includes("transcribe");
            return canGenContent && !isDeprecated && !isSpecialized;
          })
          .map((m: any) => {
            const id = m.name.replace("models/", "");
            return {
              id,
              name: m.displayName || id,
              desc: m.description ? m.description.slice(0, 70) + "..." : "Mô hình khả dụng trong tài khoản của bạn",
              fromAccount: true,
            };
          });

        if (filtered.length > 0) {
          setAvailableModels(filtered);
          setModelsFetchedFromAccount(true);
          const exists = filtered.some((m: any) => m.id === geminiModel);
          if (!exists) {
            const preferred =
              filtered.find((m: any) => m.id === "gemini-3.8-flash") ||
              filtered.find((m: any) => m.id.includes("flash")) ||
              filtered[0];
            setGeminiModel(preferred.id);
          }
          if (notifyUser) {
            showToast(`Đã đồng bộ ${filtered.length} mô hình AI khả dụng từ tài khoản của bạn!`);
          }
        }
      }
    } catch (err: any) {
      if (notifyUser) {
        showToast("Không thể tải danh sách từ API Key. Đang sử dụng danh sách mô hình chuẩn.");
      }
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Sync API Key to localStorage & trigger model fetch
  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    if (val.trim()) {
      localStorage.setItem(API_KEY_STORAGE, val.trim());
      fetchAvailableModels(val, false);
    }
  };

  // Initial fetch if API Key exists
  useEffect(() => {
    if (apiKey.trim()) {
      fetchAvailableModels(apiKey, false);
    }
  }, []);

  // Handle switching subjects
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const sub = GRADUATION_SUBJECTS.find((s) => s.id === subjectId) || GRADUATION_SUBJECTS[0];
    if (sub.topics && sub.topics.length > 0) {
      setSelectedMathTopicId(sub.topics[0].id);
      if (sub.topics[0].defaultPeriods) {
        setPeriods(sub.topics[0].defaultPeriods);
      }
    }
    // Load corresponding CV 5512 sample plan for the selected subject
    const sample = getSampleLessonPlan(subjectId);
    setResultPlan(cleanGraduationPlanMarkdown(sample));
    showToast(`Đã chuyển sang môn ${sub.name}! Đã tải giáo án mẫu chuẩn CV 5512.`);
  };

  // Calculate effective lesson parameters based on current input mode
  let effectiveTopicTitle = "";
  let effectivePeriodRange = "";
  let effectiveYccd = "";
  let effectiveDiffNotes = "";

  if (inputMode === "custom") {
    effectiveTopicTitle = customTopicTitle.trim() || `Chuyên đề ôn tập nâng cao môn ${currentSubject.name}`;
    effectivePeriodRange = customPeriodRange.trim() || `Tiết bổ trợ ôn thi`;
    effectiveYccd = customFocusGoals.trim() || `Hệ thống hóa kiến thức trọng tâm, rèn luyện kỹ năng giải đề và phòng chống bẫy đề thi tốt nghiệp môn ${currentSubject.name}.`;
    effectiveDiffNotes = studentTarget === "advanced" ? "Tập trung các dạng bài vận dụng cao phân hóa sâu cho mục tiêu 8.0+." : "Mức độ nhận biết, thông hiểu và vận dụng vừa sức dành cho lớp đại trà mục tiêu 6.5 - 7.5.";
  } else {
    effectiveTopicTitle = currentMathTopic.title;
    effectivePeriodRange = currentMathTopic.periodRange || `Tiết 1 – ${periods}`;
    effectiveYccd = currentMathTopic.learningOutcomes || currentMathTopic.desc;
    effectiveDiffNotes = currentMathTopic.differentiatedNotes || "";
  }

  const effectiveTopicName = effectiveTopicTitle;

  // Build pedagogical prompt tailored to CV 5512 and new exam format for ALL subjects
  const buildSystemPrompt = () => {
    const studentInfo =
      STUDENT_LEVELS.find((l) => l.id === studentTarget) || STUDENT_LEVELS[0];

    const category = getSubjectCategory(currentSubject.id);
    const isMath = currentSubject.id === "toan";
    const isKhtn = category === "khtn";
    const isKhxh = category === "khxh";
    const isEnglish = category === "tieng_anh";
    const isLiterature = category === "ngu_van";
    const isTinHoc = category === "tin_hoc";
    const isExamPracticeTopic = /Luyện đề|Kiểm tra giữa kỳ/i.test(effectiveTopicTitle);

    const totalMinutes = periods * 45;
    const periodBreakdownRows = Array.from({ length: periods }, (_, idx) => {
      const pNum = idx + 1;
      if (periods === 1) {
        return `| **Tiết 1** | HĐ 1: Khởi động ($5$ phút)<br/>HĐ 2: Hệ thống kiến thức ($15$ phút)<br/>HĐ 3: Luyện tập dạng bài ($18$ phút)<br/>HĐ 4: Vận dụng & Nhận diện bẫy ($7$ phút) | Trọn vẹn kiến thức trọng tâm, các dạng bài cốt lõi & hướng dẫn Phiếu học tập | $45$ phút |`;
      }
      if (pNum === 1) {
        return `| **Tiết 1** | HĐ 1: Khởi động ($10$ phút)<br/>HĐ 2: Hệ thống kiến thức trọng tâm ($35$ phút) | Tình huống mở đầu & Hệ thống hóa toàn bộ lý thuyết, công thức, lưu ý tránh sai sót | $45$ phút |`;
      }
      if (pNum < periods) {
        return `| **Tiết ${pNum}** | HĐ 3: Luyện tập theo dạng bài (Phần ${pNum - 1}) ($45$ phút) | Phương pháp giải tổng quát + Ví dụ minh họa + Lời giải từng bước các dạng bài trọng tâm | $45$ phút |`;
      }
      return `| **Tiết ${pNum}** | HĐ 3: Luyện tập dạng bài nâng cao/thực tế ($30$ phút)<br/>HĐ 4: Vận dụng, Nhận diện bẫy & Giao Phiếu học tập ($15$ phút) | Giải các dạng toán vận dụng, phân tích $5$ bẫy đề thi kinh điển & hướng dẫn tự luyện | $45$ phút |`;
    }).join("\n");

    let subjectFormatInstructions = "";

    if (isMath) {
      const targetFormsCount = periods >= 3 ? "4 - 5 DẠNG TOÁN TRỌNG TÂM" : "3 - 4 DẠNG TOÁN TRỌNG TÂM";
      const targetMcCount = isExamPracticeTopic ? "12 CÂU (Từ Câu 1 đến Câu 12)" : (periods >= 3 ? "8 CÂU (Từ Câu 1 đến Câu 8)" : "6 CÂU (Từ Câu 1 đến Câu 6)");
      const targetTfCount = isExamPracticeTopic ? "4 CÂU (Từ Câu 1 đến Câu 4 - Đủ 16 ý a, b, c, d)" : "3 CÂU (Từ Câu 1 đến Câu 3 - Đủ 12 ý a, b, c, d)";
      const targetShortCount = isExamPracticeTopic ? "6 CÂU (Từ Câu 1 đến Câu 6)" : "4 CÂU (Từ Câu 1 đến Câu 4)";

      subjectFormatInstructions = `QUY CHUẨN MÔN TOÁN HỌC BÁM SÁT KHUNG PPCT 105 TIẾT & CÔNG VĂN 5512 (${periods} TIẾT = ${totalMinutes} PHÚT):
- **HOẠT ĐỘNG 2 (HỆ THỐNG HÓA KIẾN THỨC TRỌNG TÂM):** Bắt buộc trình bày **Bảng kiến thức trọng tâm chuẩn hóa** dạng Markdown 2 cột:
  \`| Đơn vị kiến thức | Nội dung, Công thức chuẩn & Lưu ý tránh sai sót |\`
  Mỗi dòng trình bày đầy đủ định nghĩa, định lý, công thức chuẩn, điều kiện áp dụng và lưu ý tránh sai sót (dùng \`<br/>\` bên ngoài dấu \`$\` để xuống dòng trong ô bảng).
- **HOẠT ĐỘNG 3 (LUYỆN TẬP THEO DẠNG BÀI):**
  + Triển khai đầy đủ **${targetFormsCount}** (\`##### Dạng 1: ...\`, \`##### Dạng 2: ...\`) bao phủ 100% Yêu cầu cần đạt (\`${effectiveYccd}\`) và Ghi chú phân hóa (\`${effectiveDiffNotes}\`).
  + MỖI DẠNG BÀI BẮT BUỘC PHẢI CÓ ĐỦ:
    1) **Phương pháp giải tổng quát:** Nêu rõ quy trình giải từng bước + mẹo bấm máy tính Casio fx-580VN X / fx-880BTG hoặc GeoGebra.
    2) **Ít nhất 1 - 2 Ví dụ minh họa cụ thể:** Có đề bài rõ ràng, đầy đủ số liệu/giả thiết và **Lời giải chi tiết từng bước** ngay bên dưới (hoặc giải chi tiết tường minh trong tiểu mục \`c) Sản phẩm\`).
- **HOẠT ĐỘNG 4 (VẬN DỤNG, NHẬN DIỆN BẪY ĐỀ THI & HƯỚNG DẪN TỰ HỌC):**
  + Phân tích tối thiểu **5 bẫy sai lầm kinh điển** trong đề thi TN THPT gắn với bài học (kèm ví dụ phản chứng và cách khắc phục) + bài toán vận dụng thực tiễn.
- **MỤC IV (PHIẾU HỌC TẬP TỰ LUYỆN):** Bắt buộc soạn ĐẦY ĐỦ 100% từng câu hỏi cụ thể bám sát mức độ **${studentInfo.label}**:
  + \`### PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN\`: Soạn đầy đủ **${targetMcCount}**. Mỗi câu có đề bài tường minh và đủ 4 phương án \`A.\`, \`B.\`, \`C.\`, \`D.\` trên 4 dòng riêng biệt (KHÔNG lộ đáp án ở phần đề, CẤM viết câu đại ý tóm tắt).
  + \`### PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG / SAI\`: Soạn đầy đủ **${targetTfCount}**. Mỗi câu có phần dẫn rõ ràng và đủ 4 ý \`a)\`, \`b)\`, \`c)\`, \`d)\` trên 4 dòng riêng biệt phân hóa từ Nhận biết -> Thông hiểu -> Vận dụng -> Vận dụng cao.
  + \`### PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN\`: Soạn đầy đủ **${targetShortCount}** (bài toán tính toán, tham số $m$, cực trị/tối ưu thực tế có kết quả là một số thực/nguyên cụ thể, kèm yêu cầu làm tròn rõ ràng).
- **MỤC V (BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT):**
  + **5.1. Bảng đáp án nhanh:** Kẻ bảng Markdown tổng hợp đáp án nhanh cho toàn bộ các câu Phần I, Phần II (Đúng/Sai cho từng ý a, b, c, d), và Phần III (đáp số từng câu).
  + **5.2. Lời giải chi tiết từng bước:** Giải chi tiết từng bước cho TOÀN BỘ 100% các câu hỏi ở Mục IV (giải thích rõ từng câu Phần I; chứng minh rõ đúng/sai cho từng ý a, b, c, d ở Phần II; trình bày đầy đủ các bước biến đổi và kết quả câu VDC ở Phần III).`;
    } else if (isKhtn) {
      subjectFormatInstructions = `QUY CHUẨN MÔN ${currentSubject.name.toUpperCase()} BÁM SÁT CÔNG VĂN 5512 (${periods} TIẾT = ${totalMinutes} PHÚT):
- **HOẠT ĐỘNG 2:** Bảng tổng hợp kiến thức trọng tâm 2 cột (\`| Đơn vị kiến thức | Nội dung, Định luật, Công thức & Lưu ý tránh sai sót |\`).
- **HOẠT ĐỘNG 3:** Triển khai tối thiểu ${periods >= 3 ? 4 : 3} dạng bài trọng tâm (\`##### Dạng 1...\`), mỗi dạng có Phương pháp giải tổng quát + ít nhất 1 - 2 Ví dụ minh họa cụ thể kèm Lời giải chi tiết từng bước.
- **HOẠT ĐỘNG 4:** Phân tích đồ thị/thí nghiệm thực tiễn và tối thiểu 5 bẫy đề thi hay gặp.
- **MỤC IV (PHIẾU HỌC TẬP TỰ LUYỆN):** Soạn đầy đủ từng câu hỏi cụ thể cho 3 phần (Phần I: ${periods >= 3 ? 8 : 6} câu ABCD; Phần II: 3 câu Đúng/Sai đủ 4 ý a, b, c, d; Phần III: 4 câu Trả lời ngắn điền số).
- **MỤC V (BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT):** Gồm **1. Bảng đáp án nhanh** và **2. Lời giải chi tiết từng bước** cho toàn bộ các câu hỏi ở Mục IV.`;
    } else if (isKhxh) {
      subjectFormatInstructions = `QUY CHUẨN MÔN ${currentSubject.name.toUpperCase()} BÁM SÁT CÔNG VĂN 5512 (${periods} TIẾT = ${totalMinutes} PHÚT):
- **HOẠT ĐỘNG 2:** Bảng hệ thống kiến thức cốt lõi 2 cột (\`| Đơn vị kiến thức | Nội dung trọng tâm & Lưu ý phân biệt |\`).
- **HOẠT ĐỘNG 3:** Phân dạng câu hỏi khai thác tư liệu / bảng số liệu / tình huống kèm Phương pháp giải tổng quát + 1 - 2 Ví dụ minh họa cụ thể và Lời giải chi tiết.
- **HOẠT ĐỘNG 4:** Kỹ năng đọc tư liệu và tối thiểu 5 bẫy ngôn từ đánh lừa trong đề thi.
- **MỤC IV (PHIẾU HỌC TẬP TỰ LUYỆN):** Soạn đầy đủ từng câu hỏi cụ thể cho 2 phần (Phần I: 8 câu ABCD; Phần II: 3 câu Đúng/Sai đủ 4 ý a, b, c, d gắn tư liệu/tình huống).
- **MỤC V (BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT):** Gồm **1. Bảng đáp án nhanh** và **2. Lời giải chi tiết từng bước** giải thích rõ từng câu và từng ý a, b, c, d.`;
    } else if (isEnglish) {
      subjectFormatInstructions = `QUY CHUẨN MÔN TIẾNG ANH BÁM SÁT CÔNG VĂN 5512 (${periods} TIẾT = ${totalMinutes} PHÚT):
- **HOẠT ĐỘNG 2:** Bảng hệ thống ngữ pháp/từ vựng/kỹ năng đọc hiểu 2 cột (\`| Kiến thức trọng tâm | Cấu trúc chuẩn & Lưu ý bẫy đề thi |\`).
- **HOẠT ĐỘNG 3:** Mỗi dạng bài có Phương pháp làm bài tổng quát + 1 - 2 Ví dụ minh họa cụ thể kèm Lời giải chi tiết.
- **MỤC IV (PHIẾU HỌC TẬP TỰ LUYỆN):** Soạn đầy đủ từng câu hỏi trắc nghiệm 4 lựa chọn A, B, C, D theo cấu trúc đề mới.
- **MỤC V (BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT):** Gồm **1. Bảng đáp án nhanh** và **2. Lời giải chi tiết từng bước** (dịch nghĩa và giải thích cấu trúc cho toàn bộ câu hỏi).`;
    } else if (isLiterature) {
      subjectFormatInstructions = `QUY CHUẨN MÔN NGỮ VĂN BÁM SÁT CÔNG VĂN 5512 (100% TỰ LUẬN - ${periods} TIẾT = ${totalMinutes} PHÚT):
- **HOẠT ĐỘNG 2:** Bảng hệ thống tri thức thể loại, kỹ năng đọc hiểu & làm văn 2 cột.
- **HOẠT ĐỘNG 3:** Mỗi dạng câu hỏi Đọc hiểu và Viết đều có Phương pháp làm bài tổng quát + Ví dụ ngữ liệu minh họa kèm Hướng dẫn giải chi tiết.
- **MỤC IV (PHIẾU HỌC TẬP TỰ LUYỆN):** Đề thi tự luận đầy đủ gồm Phần I. Đọc hiểu (4,0 điểm, ngữ liệu đầy đủ + 5 câu hỏi) và Phần II. Viết (6,0 điểm).
- **MỤC V (HƯỚNG DẪN CHẤM VÀ LỜI GIẢI CHI TIẾT):** Bảng hướng dẫn chấm chi tiết từng câu, từng ý và dàn ý/bài viết tham khảo.`;
    } else if (isTinHoc) {
      subjectFormatInstructions = `QUY CHUẨN MÔN TIN HỌC BÁM SÁT CÔNG VĂN 5512 (${periods} TIẾT = ${totalMinutes} PHÚT):
- **HOẠT ĐỘNG 2:** Bảng tổng hợp kiến thức Python / CSDL / Mạng máy tính 2 cột (\`| Đơn vị kiến thức | Cú pháp, Thuật toán & Lưu ý |\`).
- **HOẠT ĐỘNG 3:** Mỗi dạng bài có Phương pháp giải tổng quát + 1 - 2 Ví dụ minh họa kèm Lời giải chạy vết từng bước.
- **MỤC IV (PHIẾU HỌC TẬP TỰ LUYỆN):** Đủ 3 phần (Phần I: 8 câu ABCD; Phần II: 3 câu Đúng/Sai đủ 4 ý a, b, c, d; Phần III: 3 câu Trả lời ngắn).
- **MỤC V (BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT):** Gồm **1. Bảng đáp án nhanh** và **2. Lời giải chi tiết từng bước** cho toàn bộ câu hỏi.`;
    }

    return `Bạn là chuyên gia thẩm định chương trình giáo dục phổ thông kiêm giáo viên dạy giỏi cốt cán cấp Tỉnh/Thành phố môn ${currentSubject.name}.
Nhiệm vụ của bạn là soạn một KẾ HOẠCH BÀI DẠY (GIÁO ÁN) ÔN THI TỐT NGHIỆP THPT LỚP 12 CHUẨN CÔNG VĂN 5512/BGDĐT hoàn chỉnh, chi tiết 100%, chuẩn mực để dạy trực tiếp trên lớp và in phát ngay Phiếu học tập cho học sinh.

=========================================
THÔNG TIN ĐẦU VÀO BẮT BUỘC BÁM SÁT 100%:
- Môn học: ${currentSubject.name} - Lớp 12
- Bộ sách tham chiếu: Kết nối tri thức với cuộc sống (Chương trình GDPT 2018)
- Tên chủ đề/Bài học: ${effectiveTopicTitle}
- Tiết PPCT: ${effectivePeriodRange}
- Thời lượng thực dạy đã chọn: ${periods} tiết (${totalMinutes} phút)
- Yêu cầu cần đạt (PPCT 105 tiết — PHẢI ĐÁP ỨNG ĐỦ 100% MỌI Ý): ${effectiveYccd}
- Ghi chú phân hóa đối tượng: ${effectiveDiffNotes}
- Đối tượng học sinh & Mục tiêu: ${studentInfo.label} (${studentInfo.desc})
- Cấu trúc đề thi tham chiếu: ${currentSubject.examNote}

=========================================
4 QUY TẮC BẮT BUỘC TUYỆT ĐỐI KHI SOẠN GIÁO ÁN:

1. QUY TẮC CHỐNG TÓM TẮT (ANTI-LAZINESS):
- TUYỆT ĐỐI CẤM viết các câu mô tả đại ý trong ngoặc đơn như: "(Các câu hỏi từ 1 đến 8 tập trung vào...)", "(Giải thích chi tiết: Áp dụng quy tắc...)", "(Tương tự các câu trên)", "(Học sinh tự giải tương tự)", "...".
- Bắt buộc sinh đầy đủ, chi tiết 100% nội dung có thể dùng để dạy và in phát ngay cho học sinh.

2. CHUẨN HÓA CẤU TRÚC CÔNG VĂN 5512 & PHÂN BỔ THỜI GIAN (${periods} TIẾT = ${totalMinutes} PHÚT):
- Bảng tổng hợp Tiến trình dạy học ở đầu Mục III BẮT BUỘC phải chia đủ **${periods} tiết** người dùng đã chọn trên giao diện (thể hiện rõ đủ từ **Tiết 1** đến **Tiết ${periods}** với tổng thời lượng đúng bằng **$${totalMinutes}$ phút**).
- Tất cả 4 Hoạt động (**Hoạt động 1: Khởi động**, **Hoạt động 2: Hệ thống kiến thức**, **Hoạt động 3: Luyện tập theo dạng bài**, **Hoạt động 4: Vận dụng / Nhận diện bẫy**) ĐỀU PHẢI CÓ ĐỦ 4 TIỂU MỤC:
  + **a) Mục tiêu:** (Nêu rõ mục tiêu kiến thức, kỹ năng của hoạt động).
  + **b) Nội dung:** (Trình bày đầy đủ câu hỏi/nhiệm vụ, bảng lý thuyết, các dạng bài kèm phương pháp và ví dụ minh họa cụ thể).
  + **c) Sản phẩm:** (Trình bày đầy đủ câu trả lời, bảng hệ thống hóa hoàn chỉnh và **lời giải chi tiết từng bước của các ví dụ minh họa**).
  + **d) Tổ chức thực hiện:** (Bắt buộc trình bày đầy đủ 4 bước: **Bước 1: Chuyển giao nhiệm vụ** -> **Bước 2: Thực hiện nhiệm vụ** -> **Bước 3: Báo cáo, thảo luận** -> **Bước 4: Kết luận, nhận định**).
- Ở **Hoạt động 3 (Luyện tập theo dạng bài)**, mỗi dạng bài BẮT BUỘC phải có: **Phương pháp giải tổng quát** + **Ít nhất 1 - 2 Ví dụ minh họa** có đề bài cụ thể và **Lời giải từng bước**.

3. CHI TIẾT HÓA PHIẾU HỌC TẬP & ĐÁP ÁN (MỤC IV & V):
- **Mục IV (Phiếu học tập tự luyện):** Phải soạn đầy đủ từng câu hỏi cụ thể (đề bài rõ ràng, đủ 4 phương án A, B, C, D cho Phần I; đủ 4 ý a, b, c, d cho Phần II; câu hỏi điền số thực cho Phần III) bám sát mức độ mục tiêu học sinh đã chọn (${studentInfo.label}).
- **Mục V (Bảng đáp án và hướng dẫn giải chi tiết):** Phải có **1. Bảng đáp án nhanh** cho tất cả các câu, tiếp theo là phần **2. Lời giải chi tiết từng bước** cho toàn bộ các câu hỏi ở Mục IV (đặc biệt là giải thích rõ đúng/sai cho từng ý a, b, c, d ở Phần II và các bước giải câu VDC ở Phần III).

4. QUY TẮC ĐỊNH DẠNG MARKDOWN & LATEX NGHIÊM NGẶT (TRÁNH LỖI HIỂN THỊ & XUẤT FILE):
- Dùng cú pháp in đậm chuẩn \`**text**\` (không để khoảng trắng sát bên trong dấu \`**\`, luôn có khoảng trắng sau \`**Nhãn:**\`). TUYỆT ĐỐI KHÔNG đặt dấu gạch đầu dòng \`-\` hay \`+\` trước các tiêu đề \`#\`, \`##\`, \`###\`, \`####\`.
- Chỉ sử dụng cú pháp LaTeX chuẩn trong cặp dấu \`$ ... $\` (nội dòng) và \`$$ ... $$\` (khối riêng). Luôn dùng \`\\frac\` thay vì \`\\dfrac\`.
- TUYỆT ĐỐI KHÔNG chèn các từ tiếng Việt có dấu (như "Lưu ý", "với", "hoặc", "trên khoảng", "thỏa mãn", "loại") hoặc thẻ \`<br/>\` vào bên trong cặp dấu \`$ ... $\` hoặc \`$$ ... $$\` để tránh lỗi vỡ chữ khi render MathJax/KaTeX!
  + Viết ĐÚNG: \`$f'(x) \\ge 0$ (hoặc $f'(x) \\le 0$) trên khoảng $(a; b)$\`, \`$\\Delta' \\le 0$ (với $a \\ne 0$)\`, \`$x = 2$ (thỏa mãn)\`.
  + Viết SAI (CẤM TUYỆT ĐỐI): \`$f'(x) \\ge 0 (hoặc \\le 0) trên khoảng (a; b)$\`, \`$\\Delta' \\le 0 (với a \\ne 0)$\`, \`$f'(x) = 0 <br/> Lưu ý: ...$\`.

=========================================
KHUNG CẤU TRÚC TRÌNH BÀY BẮT BUỘC (THEO ĐÚNG THỨ TỰ NÀY):

# KẾ HOẠCH BÀI DẠY ÔN THI TỐT NGHIỆP THPT NĂM HỌC 2026 - 2027
**Môn học:** ${currentSubject.name} 12 | **Bộ sách:** Kết nối tri thức với cuộc sống (GDPT 2018)  
**Chủ đề:** **${effectiveTopicTitle.toUpperCase()}**  
**Thời lượng:** $${periods}$ tiết ($${totalMinutes}$ phút) | **Tiết PPCT:** ${effectivePeriodRange}  
**Đối tượng áp dụng:** ${studentInfo.label}

## I. MỤC TIÊU DẠY HỌC
### 1. Về kiến thức
### 2. Về năng lực
### 3. Về phẩm chất

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
### 1. Giáo viên
### 2. Học sinh

## III. TIẾN TRÌNH DẠY HỌC (CHUẨN CÔNG VĂN 5512)
### Bảng tổng hợp Tiến trình dạy học (${periods} tiết = $${totalMinutes}$ phút)
| Tiết học | Hoạt động dạy học | Nội dung trọng tâm | Thời lượng |
| :---: | :--- | :--- | :---: |
${periodBreakdownRows}

### HOẠT ĐỘNG 1: KHỞI ĐỘNG (XÁC ĐỊNH VẤN ĐỀ)
**a) Mục tiêu:**
**b) Nội dung:**
**c) Sản phẩm:**
**d) Tổ chức thực hiện:** (Đủ 4 bước: Bước 1: Chuyển giao nhiệm vụ -> Bước 2: Thực hiện nhiệm vụ -> Bước 3: Báo cáo, thảo luận -> Bước 4: Kết luận, nhận định)

### HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI (HỆ THỐNG HÓA KIẾN THỨC TRỌNG TÂM)
**a) Mục tiêu:**
**b) Nội dung:** (Bảng hệ thống kiến thức trọng tâm 2 cột chi tiết)
**c) Sản phẩm:**
**d) Tổ chức thực hiện:** (Đủ 4 bước: Bước 1: Chuyển giao nhiệm vụ -> Bước 2: Thực hiện nhiệm vụ -> Bước 3: Báo cáo, thảo luận -> Bước 4: Kết luận, nhận định)

### HOẠT ĐỘNG 3: LUYỆN TẬP (PHÂN DẠNG BÀI TẬP TRỌNG TÂM)
**a) Mục tiêu:**
**b) Nội dung:** (Chia rõ từng Dạng 1, Dạng 2, Dạng 3, Dạng 4... Mỗi dạng có: **Phương pháp giải tổng quát** + **Ví dụ minh họa 1**, **Ví dụ minh họa 2** có đề bài cụ thể)
**c) Sản phẩm:** (Trình bày **Lời giải chi tiết từng bước** cho toàn bộ các Ví dụ minh họa ở mục b)
**d) Tổ chức thực hiện:** (Đủ 4 bước: Bước 1: Chuyển giao nhiệm vụ -> Bước 2: Thực hiện nhiệm vụ -> Bước 3: Báo cáo, thảo luận -> Bước 4: Kết luận, nhận định)

### HOẠT ĐỘNG 4: VẬN DỤNG, NHẬN DIỆN BẪY ĐỀ THI VÀ HƯỚNG DẪN TỰ HỌC
**a) Mục tiêu:**
**b) Nội dung:** (Tối thiểu 5 bẫy sai lầm kinh điển trong đề thi + Bài toán vận dụng thực tế + Hướng dẫn tự học)
**c) Sản phẩm:** (Phân tích phản ví dụ cho từng bẫy và lời giải chi tiết bài toán vận dụng)
**d) Tổ chức thực hiện:** (Đủ 4 bước: Bước 1: Chuyển giao nhiệm vụ -> Bước 2: Thực hiện nhiệm vụ -> Bước 3: Báo cáo, thảo luận -> Bước 4: Kết luận, nhận định)

## IV. PHIẾU HỌC TẬP TỰ LUYỆN: ${effectiveTopicTitle.toUpperCase()}
*Họ và tên học sinh: .................................................... Lớp: 12..... Điểm: .......... / 10*
(Soạn đầy đủ 100% từng câu hỏi cụ thể của Phần I, Phần II, Phần III)

## V. BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT
### 1. Bảng đáp án nhanh
### 2. Lời giải chi tiết từng bước
(Giải chi tiết từng bước cho toàn bộ 100% các câu hỏi của Phần I, từng ý a, b, c, d của Phần II và từng bài của Phần III)

### PHÊ DUYỆT CỦA TỔ CHUYÊN MÔN

=========================================
${subjectFormatInstructions}`;
  };

  function cleanGraduationPlanMarkdown(raw: string): string {
    if (!raw) return "";
    let s = raw.normalize("NFC");

    // 0. Loại bỏ dấu gạch đầu dòng (-, +, *, •, ●) đặt nhầm trước các tiêu đề Markdown (#, ##, ###...) gây ra chấm đen mồ côi
    s = s.replace(/(^|\n)[ \t]*[-*+•●]+[ \t]+(#{1,6}\s+)/g, "$1$2");

    // 0.1. Sửa các từ tiếng Việt bị tách chữ hoặc dính chữ do lỗi nhốt trong công thức Toán trước đó
    s = s
      .replace(/\bhoặ\s+c\b/gi, "hoặc")
      .replace(/\bv\s+ới\b/gi, "với")
      .replace(/\btrênkhoảng\b/gi, "trên khoảng")
      .replace(/\btrênđoạn\b/gi, "trên đoạn")
      .replace(/\btrênnửakhoảng\b/gi, "trên nửa khoảng")
      .replace(/\btạihữuhạnđiểm\b/gi, "tại hữu hạn điểm");

    s = fixBrokenLatexSyntax(s);
    s = rescueTrappedVietnameseFromMath(s);
    s = sanitizeLatexMathAndDelimiters(s);
    s = normalizeMathText(s);
    s = cleanMathAndUnwrapHeadings(s);

    // 1. Sửa lỗi dính 3 dấu sao hoặc dính sát chữ quanh nhãn **Label:** (vd: **Chủ đề:***BÀI 8. -> **Chủ đề:** **BÀI 8.**)
    s = s.replace(/(\*\*[^*\n]+?:\*\*)\*{1,3}([^\n]+)/g, (_m, label, rest) => {
      const cleanRest = rest.replace(/^\*+|\*+$/g, "").trim();
      return `${label} **${cleanRest}**`;
    });
    s = s.replace(/\*\*([^*\n]+?:)\*{3}([^\n]+)/g, "**$1** **$2**");
    s = s.replace(/(\*\*[^*\n]+?:\*\*)([^\s*\n])/g, "$1 $2");

    // 2. Chuẩn hóa cú pháp in đậm **text** bị dư khoảng trắng bên trong (vd: ** text ** -> **text**)
    s = s.replace(/\*\*[ \t]+([^*\n]+?)[ \t]*\*\*/g, (_m, inner) => `**${inner.trim()}**`);
    s = s.replace(/\*\*([^*\n]+?)[ \t]+\*\*/g, (_m, inner) => `**${inner.trim()}**`);

    // 3. Đảm bảo mỗi dòng metadata đầu giáo án, tiêu đề Markdown và các mục CV 5512 tách dòng rõ ràng
    s = s.replace(/([^\n])\s*(#{1,5}\s+)/g, "$1\n\n$2");
    // Tách dòng nếu tiêu đề ## IV. PHIẾU HỌC TẬP... bị dính liền với *Họ và tên...*
    s = s.replace(/(#{1,4}\s+[^\n*]+?)(\*Họ\s+và\s+tên)/gi, "$1\n\n$2");
    s = s.replace(/([^\n])\s*(\*\*(?:Môn học|Chủ đề|Thời lượng|Đối tượng áp dụng):\*\*|(?:I|II|III|IV|V)\.\s+(?:MỤC TIÊU|THIẾT BỊ|TIẾN TRÌNH|PHỤ LỤC|PHIẾU HỌC TẬP|BẢNG ĐÁP ÁN)\b|TIẾT\s+\$?\d+\$?\s*(?:\(|:)|Hoạt động\s+\$?\d+\$?\s*:)/gi, "$1\n\n$2");
    s = s.replace(/([^\n])\s*\*{0,2}([a-d]\)\s*(?:Mục tiêu|Nội dung|Sản phẩm|Tổ chức thực hiện)[^:\n]*:)\*{0,2}/gi, "$1\n\n**$2** ");
    s = s.replace(/(^|\n)[ \t]*([a-d]\)\s*(?:Mục tiêu|Nội dung|Sản phẩm|Tổ chức thực hiện)[^:\n]*:)(?!\*)/gim, "$1**$2**");

    // 4. Tách dòng các mục Phương pháp / Ví dụ / Lời giải nếu bị viết dính trên cùng 1 dòng
    s = s.replace(/([^\n|])\s+(\*\*(?:Phương\s*pháp(?:\s*giải)?|Ví\s*dụ(?:\s*minh\s*họa|\s*mẫu)?(?:\s*\d+)?|Lời\s*giải(?:\s*chi\s*tiết)?|Bước\s*[1-4])\s*[:\.]?\*\*)/gi, "$1\n- $2");

    // 5. Tách dòng tiêu đề bị dính **** (vd: **TIÊU ĐỀ****Môn: ...**)
    s = s.replace(/\*{4,}/g, "**\n\n**");
    // Đảm bảo khoảng trắng sau dấu hai chấm trước chữ cái viết hoa tiếng Việt (vd: Mục tiêu:HS -> Mục tiêu: HS)
    s = s.replace(/([a-zà-ỹ]):([A-ZÀ-Ỹ])/g, "$1: $2");
    // Đảm bảo dấu ngoặc kép không dính sát vào dấu $ khiến trình phân tích Markdown bỏ sót công thức
    s = s.replace(/(["“”])(\$[^$\n]+\$)(["“”])/g, "$1 $2 $3");
    s = s.replace(/(\$[^$\n]+\$)(["”])/g, "$1 $2");
    s = s.replace(/(["“])(\$[^$\n]+\$)/g, "$1 $2");

    // 6. Chuẩn hóa và làm sạch dấu sao (**) quanh nhãn phương án A., B., C., D. CHỈ ở đầu dòng
    if (/PHẦN\s*(?:I\b|1\b)/i.test(s)) {
      s = s.replace(/(^|\n)[ \t]*(?:[-*•●]\s*)?(?:\*{1,3}|<b>)?(?:\(([A-D])\)|([A-D]))[\.\:](?:\*{1,3}|<\/b>)?[ \t]*(?:\*{1,3}[ \t]*)?/g, (_m, nl, l1, l2) => {
        const letter = l1 || l2;
        return `${nl}${letter}. `;
      });
    }

    // 7. Xóa hoàn toàn các dòng chỉ chứa dấu gạch đầu dòng rỗng (- , * , • , ● ) hoặc đường kẻ ngang --- dư thừa gây chấm đen trong Word/PDF
    s = s.replace(/^[ \t]*[-*+•●][ \t]*$/gm, "");
    s = s.replace(/^[ \t]*---+[ \t]*$/gm, "");

    // 8. Khôi phục mọi thẻ <strong> / < strong > bị rò rỉ về chuẩn Markdown **text** để không bao giờ hiển thị thẻ HTML thô
    s = s.replace(/<\s*strong\s*>([\s\S]*?)<\s*\/\s*strong\s*>/gi, "**$1**");
    s = s.replace(/<\s*\/?\s*strong\s*>/gi, "");
    s = s.replace(/\\le\s+ft\b/g, "\\left");
    s = s.replace(/\\right\s+\\right\.\$\s*[\r\n]*\s*\]\$/g, "\\right]$");
    s = s.replace(/\\right\s+\\right\./g, "\\right]");

    // Tách dòng giữa các công thức đứng riêng từng dòng liên tiếp để Markdown không gộp chung một hàng
    s = s.replace(/^([ \t]*\$[^\$\n]+\$[ \t]*)\n(?=[ \t]*\$[^\$\n]+\$[ \t]*$)/gm, "$1\n\n");

    // Quét lại 1 lần để chắc chắn không còn $...$$ hay dấu $ lẻ chưa đóng trước ### Heading
    s = rescueTrappedVietnameseFromMath(s);
    s = fixAndMergeMathArrows(s);

    return s.replace(/\n{3,}/g, "\n\n").trim();
  }

  // Generate Lesson Plan
  const handleGeneratePlan = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    setProgressPercent(10);
    setProgressStage(`Khởi tạo cấu trúc Công văn 5512 môn ${currentSubject.name}...`);

    try {
      const cleanKey = apiKey.trim();
      if (cleanKey) {
        localStorage.setItem(API_KEY_STORAGE, cleanKey);
        localStorage.setItem("eduplan_gemini_api_key_v2", cleanKey);
        setCustomApiKey(cleanKey);
      }
      const prompt = buildSystemPrompt();

      const t1 = setTimeout(() => {
        setProgressPercent(30);
        setProgressStage(`Đang hệ thống hóa kiến thức cốt lõi môn ${currentSubject.name}...`);
      }, 1200);

      const t2 = setTimeout(() => {
        setProgressPercent(60);
        setProgressStage(`Đang biên soạn câu hỏi ôn thi TN THPT định dạng mới 2025...`);
      }, 3500);

      const t3 = setTimeout(() => {
        setProgressPercent(85);
        setProgressStage("Đang hoàn thiện sản phẩm học tập & phân tích phương án...");
      }, 7000);

      // Call server proxy endpoint to prevent PROXY_GENERATION_DISABLED in client iframe
      const response = await apiFetch("/api/generate-graduation-review-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: cleanKey,
          prompt: prompt,
          model: geminiModel,
          subject: currentSubject.name,
          topic: effectiveTopicName,
          periods: periods,
        }),
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText.trim());
      } catch (parseErr) {
        const serverErrorMatch = rawText.match(/SERVER_ERROR:\s*([^\n\r]+)/);
        if (serverErrorMatch) {
          throw new Error(serverErrorMatch[1].trim());
        }
        throw new Error("Lỗi phản hồi máy chủ: " + rawText.slice(0, 150));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const generatedMarkdown = data?.result || data?.text || "";
      if (!generatedMarkdown) {
        throw new Error("Phản hồi từ AI không có nội dung văn bản hợp lệ.");
      }

      const cleanedPlan = cleanGraduationPlanMarkdown(generatedMarkdown);
      setProgressPercent(100);
      setProgressStage("Đã tạo kế hoạch bài dạy thành công!");
      setResultPlan(cleanedPlan);
      setActiveTab("preview");
      showToast(`Đã tạo xong kế hoạch ôn tập môn ${currentSubject.name} chuẩn CV 5512!`);
    } catch (err: any) {
      console.error("Lỗi khi sinh KHDH:", err);
      setErrorMsg(
        err?.message || "Đã xảy ra lỗi không xác định khi liên hệ với dịch vụ AI."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Copy Markdown
  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(resultPlan);
      showToast("Đã sao chép nội dung Markdown vào bộ nhớ tạm!");
    } catch (err) {
      showToast("Lỗi khi sao chép. Vui lòng chọn văn bản thủ công.");
    }
  };

  // Export to Word (.docx)
  const handleExportWord = async () => {
    if (!previewContainerRef.current) return;
    setIsExportingWord(true);
    try {
      await typesetMathJax(previewContainerRef.current);
      const fileName = `KHDH_OnThi_TN_THPT_${currentSubject.shortName}_${effectiveTopicName
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, "_")
        .slice(0, 35)}.docx`;
      await exportHtmlToWord(previewContainerRef.current, fileName, "omml");
      showToast("Đã xuất file Word (.docx) với công thức Equation (OMML) thành công!");
    } catch (e: any) {
      console.error("Lỗi xuất file Word:", e);
      showToast("Lỗi khi xuất file Word: " + (e?.message || "Vui lòng thử lại"));
    } finally {
      setIsExportingWord(false);
    }
  };

  // Print or Save as PDF
  const handlePrintPdf = async () => {
    if (!previewContainerRef.current) return;
    try {
      const docTitle = `KHDH_OnThi_TN_THPT_${currentSubject.shortName}_${effectiveTopicName
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, "_")
        .slice(0, 35)}`;
      await printElement(previewContainerRef.current, docTitle);
    } catch (e) {
      showToast("Không thể mở cửa sổ in/PDF. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 lg:p-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-700/50 p-6 md:p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <FileCheck className="w-3.5 h-3.5" /> Chuẩn CV 5512/BGDĐT
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <Layers className="w-3.5 h-3.5" /> CT 2018 - Kết nối tri thức
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Target className="w-3.5 h-3.5" /> Đề thi TN THPT 2026-2027
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <GraduationCap className="w-8 h-8 text-indigo-400" />
                Ôn Thi Tốt Nghiệp THPT 12 - Chuẩn CV 5512
              </h1>
              <p className="text-sm md:text-base text-slate-300 max-w-3xl leading-relaxed">
                Biên soạn Kế hoạch bài dạy ôn tập tăng cường buổi chiều chuẩn Công văn 5512/BGDĐT, bám sát Khung PPCT 105 tiết Toán 12 (2026-2027), tích hợp đề thi định dạng mới (3 phần) và công thức MathJax chuẩn mực.
              </p>
            </div>

            {/* Quick action: Load sample */}
            <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const sample = getSampleLessonPlan(selectedSubjectId);
                  setResultPlan(cleanGraduationPlanMarkdown(sample));
                  setActiveTab("preview");
                  showToast(`Đã nạp Kế hoạch bài dạy mẫu môn ${currentSubject.name} chuẩn CV 5512!`);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2 shadow-sm"
              >
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Xem giáo án mẫu môn {currentSubject.shortName} (CV 5512)
              </button>
            </div>
          </div>
        </div>

        {/* Configuration & Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-800/90 backdrop-blur border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-3">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Thiết lập thông số giáo án ôn tập
              </h2>

              {/* 1. Subject Selector: All 10 graduation exam subjects */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    1. Môn thi Tốt nghiệp THPT
                  </label>
                  <span className="text-[11px] text-indigo-400 font-medium">
                    Mặc định: {currentSubject.name}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {GRADUATION_SUBJECTS.map((sub) => {
                    const isSelected = sub.id === selectedSubjectId;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSubjectChange(sub.id)}
                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/40 ring-1 ring-indigo-300"
                            : "bg-slate-900/70 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                        title={sub.name}
                      >
                        <SubjectIcon iconName={sub.iconName} className="w-4 h-4" />
                        <span className="text-[11px] font-semibold truncate max-w-full">
                          {sub.shortName}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                  <span className="text-indigo-400 font-bold shrink-0">Cấu trúc đề thi:</span>
                  <span>{currentSubject.examNote}</span>
                </div>
              </div>

              {/* 2. Mode Selection: 3 flexible input mechanisms */}
              <div className="space-y-3 pt-2 border-t border-slate-700/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    2. Cơ chế nạp Kế hoạch ôn tập
                  </label>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {currentSubject.topics.length} bài PPCT
                  </span>
                </div>

                {/* 3 Mode buttons */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInputMode("ppct105")}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                      inputMode === "ppct105"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{currentSubject.id === "toan" ? "Khung PPCT 105 tiết" : "PPCT chuẩn SGK"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("file_ppct")}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                      inputMode === "file_ppct"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>Tệp PPCT tải lên</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("custom")}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                      inputMode === "custom"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>Tự nhập chủ đề</span>
                  </button>
                </div>

                {/* Mode 1: Chọn bài từ Khung PPCT 105 tiết */}
                {inputMode === "ppct105" && (
                  <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-medium">Danh mục bài học ({currentSubject.topics.length} bài):</span>
                      <span className="text-[11px] text-indigo-400">{currentSubject.curriculum}</span>
                    </div>

                    {/* Filter / Search input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={topicSearchKeyword}
                        onChange={(e) => setTopicSearchKeyword(e.target.value)}
                        placeholder="Tìm bài học (VD: đơn điệu, tích phân, toạ độ, tối ưu...)"
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
                      />
                    </div>

                    {/* Select Dropdown */}
                    <select
                      value={selectedMathTopicId}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        const found = currentSubject.topics.find((t) => t.id === targetId);
                        if (found) handleSelectTopicItem(found);
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {currentSubject.topics
                        .filter(
                          (t) =>
                            !topicSearchKeyword.trim() ||
                            t.title.toLowerCase().includes(topicSearchKeyword.toLowerCase()) ||
                            t.desc.toLowerCase().includes(topicSearchKeyword.toLowerCase()) ||
                            (t.periodRange && t.periodRange.includes(topicSearchKeyword))
                        )
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.order ? `[Bài ${t.order}] ` : ""}{t.title} {t.periodRange ? `(Tiết ${t.periodRange})` : ""}
                          </option>
                        ))}
                    </select>

                    {/* Rich card for active topic */}
                    <div className="p-3 bg-indigo-950/20 border border-indigo-800/40 rounded-xl space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-indigo-300">{currentMathTopic.title}</span>
                        {currentMathTopic.periodRange && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 shrink-0">
                            Tiết PPCT: {currentMathTopic.periodRange}
                          </span>
                        )}
                      </div>
                      {currentMathTopic.learningOutcomes && (
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          <span className="text-emerald-400 font-semibold">Yêu cầu cần đạt: </span>
                          {currentMathTopic.learningOutcomes}
                        </p>
                      )}
                      {currentMathTopic.differentiatedNotes && (
                        <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/30 text-[11px] text-amber-200/90 leading-tight">
                          <span className="font-semibold text-amber-300">Ghi chú phân hóa: </span>
                          {currentMathTopic.differentiatedNotes}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode 2: Tệp PPCT đính kèm / Tải lên */}
                {inputMode === "file_ppct" && (
                  <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-700/80 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-white">{attachedFileName}</div>
                          <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã nạp bảng 35 bài ôn thi TN 105 tiết (2026-2027)
                          </div>
                        </div>
                      </div>
                      <a
                        href={attachedPdfPath}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" /> Xem PDF
                      </a>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-300">Chọn nhanh bài học từ tệp kế hoạch PDF:</div>
                      <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5">
                        {currentSubject.topics.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleSelectTopicItem(t)}
                            className={`w-full p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-2 ${
                              selectedMathTopicId === t.id
                                ? "bg-indigo-600/30 border-indigo-500 text-white font-medium"
                                : "bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <span className="truncate">{t.title}</span>
                            <span className="text-[10px] text-indigo-400 shrink-0 font-mono">
                              Tiết {t.periodRange || t.defaultPeriods}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode 3: Tự nhập chủ đề ôn tập bất kỳ */}
                {inputMode === "custom" && (
                  <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Tên chuyên đề / bài học ôn tập:
                      </label>
                      <input
                        type="text"
                        value={customTopicTitle}
                        onChange={(e) => setCustomTopicTitle(e.target.value)}
                        placeholder="VD: Kỹ thuật xử lý bài toán tối ưu thực tế và min-max hình học không gian"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Tiết theo PPCT:</label>
                        <input
                          type="text"
                          value={customPeriodRange}
                          onChange={(e) => setCustomPeriodRange(e.target.value)}
                          placeholder="VD: Tiết 12 – 14 hoặc Tiết bổ trợ"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Số tiết thực dạy:</label>
                        <select
                          value={periods}
                          onChange={(e) => setPeriods(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {PERIOD_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.value} tiết ({p.value * 45} phút)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Yêu cầu cần đạt trọng tâm:</label>
                      <textarea
                        rows={2}
                        value={customFocusGoals}
                        onChange={(e) => setCustomFocusGoals(e.target.value)}
                        placeholder="VD: Nắm vững quy trình thiết lập hàm mục tiêu và giải quyết bài toán tối ưu thực tiễn..."
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Duration Selector (Allows custom override of periods) */}
              <div className="space-y-2 pt-2 border-t border-slate-700/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    3. Số tiết thực dạy (Tùy chỉnh)
                  </label>
                  <span className="text-[11px] text-indigo-400">
                    PPCT: {currentMathTopic.defaultPeriods || 3} tiết
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPeriods(opt.value)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        periods === opt.value
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold"
                          : "bg-slate-900/60 border-slate-700/80 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.value}T</div>
                      <div className="text-[9px] text-slate-400">{opt.value * 45}p</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Target Level */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  4. Đối tượng học sinh & Mức độ yêu cầu
                </label>
                <div className="space-y-2">
                  {STUDENT_LEVELS.map((level) => (
                    <label
                      key={level.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        studentTarget === level.id
                          ? "bg-slate-900 border-indigo-500/80 ring-1 ring-indigo-500/40"
                          : "bg-slate-900/50 border-slate-700/70 hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="studentLevel"
                        value={level.id}
                        checked={studentTarget === level.id}
                        onChange={() => setStudentTarget(level.id)}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-600"
                      />
                      <div className="text-xs space-y-0.5">
                        <div className="font-semibold text-slate-200">{level.label}</div>
                        <div className="text-slate-400 text-[11px] leading-relaxed">
                          {level.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Checkbox: New exam question formats */}
              <div className="pt-2 border-t border-slate-700">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExamFormats}
                    onChange={(e) => setIncludeExamFormats(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <div className="text-xs space-y-0.5">
                    <span className="font-semibold text-indigo-200 block">
                      Kèm phiếu bài tập theo định dạng Đề thi TN THPT mới (2025)
                    </span>
                    <span className="text-slate-400 text-[11px] block leading-relaxed">
                      Áp dụng đúng thể thức của Bộ GD&ĐT cho môn {currentSubject.name}: {currentSubject.examNote}.
                    </span>
                  </div>
                </label>
              </div>

              {/* API Key & AI Model Configuration */}
              <div className="pt-2 border-t border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    Google Gemini API Key
                  </label>
                  <span className="text-[11px] text-slate-400">Tự động lưu trình duyệt</span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Dán mã AI Studio API Key (AIzaSy...)"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                </div>

                {/* AI Model Selector with dynamic account refresh */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <span>Mô hình AI:</span>
                      {modelsFetchedFromAccount && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300 text-[10px]">
                          <Check className="w-2.5 h-2.5" /> Từ tài khoản Google của bạn
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchAvailableModels(apiKey, true)}
                      disabled={isFetchingModels || !apiKey.trim()}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-40 transition-colors"
                      title="Làm mới danh sách mô hình từ API Key"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingModels ? "animate-spin" : ""}`} />
                      <span>{isFetchingModels ? "Đang đồng bộ..." : "Làm mới mô hình"}</span>
                    </button>
                  </div>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.desc ? `— ${m.desc}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    * Đã cập nhật các mô hình AI mới nhất (Gemini 3.8 Flash, 3.1 Flash Lite, Gemini 4 Argon) và tự động chuyển dự phòng khi chạm hạn mức.
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMsg}</div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGeneratePlan}
                className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all ${
                  isLoading
                    ? "bg-indigo-700/60 cursor-not-allowed text-indigo-200"
                    : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-[0.99]"
                }`}
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Đang biên soạn KHDH môn {currentSubject.shortName}... ({progressPercent}%)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Tạo kế hoạch bài dạy ôn thi ({currentSubject.shortName})</span>
                  </>
                )}
              </button>

              {/* Progress Bar when loading */}
              {isLoading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-indigo-300">
                    <span>{progressStage}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Result Preview Panel (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="bg-slate-800/90 backdrop-blur border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col h-full min-h-[600px]">
              {/* Preview Header & Tab Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      activeTab === "preview"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-900/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Bản hiển thị công thức (MathJax)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("markdown")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      activeTab === "markdown"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-900/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    Mã nguồn Markdown
                  </button>
                </div>

                {/* Export & Copy Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    title="Sao chép toàn bộ mã Markdown"
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sao chép</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportWord}
                    disabled={isExportingWord}
                    title="Xuất kế hoạch bài dạy sang tệp Word (.docx) chuẩn định dạng A4 in ấn"
                    className="p-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    {isExportingWord ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    <span>Xuất file A4 (.docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    title="In hoặc Lưu thành PDF"
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">In / PDF</span>
                  </button>
                </div>
              </div>

              {/* Preview Body */}
              <div className="flex-1 mt-4 overflow-y-auto max-h-[750px] pr-2 custom-scrollbar">
                {activeTab === "preview" ? (
                  <div
                    ref={previewContainerRef}
                    className="bg-white text-slate-900 p-6 md:p-8 rounded-xl shadow-inner font-serif leading-relaxed text-sm md:text-base border border-slate-200 tex2jax_process"
                    style={{ fontFamily: "'Times New Roman', serif" }}
                  >
                    <MarkdownRenderer key={`plan_${resultPlan.length}_${resultPlan.slice(0, 40)}`} content={resultPlan} skipWorksheetFormatting />
                  </div>
                ) : (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed select-all">
                      {resultPlan}
                    </pre>
                  </div>
                )}
              </div>

              {/* Bottom Quick Footnote */}
              <div className="mt-4 pt-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Chuẩn 4 bước Công văn 5512: Chuyển giao → Thực hiện → Báo cáo → Kết luận.
                </span>
                <span className="text-[11px] text-slate-500 tex2jax_ignore">
                  Hiển thị công thức Toán bằng MathJax 3 ($...$ và $$...$$), tương thích Word MathType & OMML.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GraduationReviewPlannerModule;
