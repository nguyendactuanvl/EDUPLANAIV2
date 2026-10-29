import React, { useState, useRef, useEffect } from 'react';
import {
  Shuffle,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Lock,
  Unlock,
  Plus,
  Trash2,
  RefreshCw,
  FileDown,
  Layers,
  Settings2,
  Copy,
  Printer,
  ChevronRight,
  ChevronLeft,
  Info,
  ImageIcon,
  Sparkles,
  HelpCircle,
  FolderArchive,
  ArrowRight,
  Camera,
  Key,
  FileSpreadsheet
} from 'lucide-react';
import {
  ShufflerExam,
  ShufflerQuestion,
  ShufflerOption,
  ShufflerTfStatement,
  ShuffledExamVariant,
  ShuffleConfig,
  parseDocxToShufflerExam,
  parseRawTextToShufflerExam,
  generateShuffledExamVariants,
  createDocxForVariant,
  createMasterAnswerKeyDocx,
  createCombinedDocx,
  exportAllVariantsAsZip,
  downloadSampleExamDocx,
  downloadSampleExamPdf,
  convertShuffledVariantsToOmrKeys
} from '../../services/examShufflerService';
import {
  saveShuffledExam,
  getSavedShuffledExams,
  deleteShuffledExam,
  clearAllShuffledExams,
  SavedShuffledExamRecord
} from '../../services/shuffledExamStorage';
import { SavedShuffledExamsModal } from './SavedShuffledExamsModal';
import { OMRExamKey } from '../../services/omrScannerService';
import { OMRScannerView } from './OMRScannerView';
import { AnswerKeyManagerModal } from './AnswerKeyManagerModal';
import { OMRPrintSheetModal } from './OMRPrintSheetModal';
import MathView from '../MathView';
import { saveAs } from 'file-saver';

export default function ExamShufflerView() {
  // Main Module Tabs: 'shuffle' = Trộn đề, 'keys' = Quản lý đáp án, 'omr' = Chấm OMR Camera
  const [mainModuleTab, setMainModuleTab] = useState<'shuffle' | 'keys' | 'omr'>('shuffle');
  const [omrKeys, setOmrKeys] = useState<Record<string, OMRExamKey>>(() => {
    try {
      const saved = localStorage.getItem('eduplan_omr_exam_keys');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [isKeyManagerModalOpen, setIsKeyManagerModalOpen] = useState(false);
  const [isPrintSheetModalOpen, setIsPrintSheetModalOpen] = useState(false);
  const [isSavedExamsModalOpen, setIsSavedExamsModalOpen] = useState(false);
  const [savedExamsList, setSavedExamsList] = useState<SavedShuffledExamRecord[]>([]);

  // Load saved shuffled exams on mount
  const loadSavedExams = async () => {
    try {
      const list = await getSavedShuffledExams();
      setSavedExamsList(list);
    } catch (err) {
      console.error('Failed to load saved shuffled exams:', err);
    }
  };

  useEffect(() => {
    loadSavedExams();
  }, []);

  // Wizard Step: 1 = Upload, 2 = Review & Fix, 3 = Config, 4 = Results & Export
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Data State
  const [exam, setExam] = useState<ShufflerExam | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [rawTextInput, setRawTextInput] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Shuffle Configuration
  const [config, setConfig] = useState<ShuffleConfig>({
    numCodes: 4,
    examCodes: ['101', '102', '103', '104'],
    codeFormat: 'sequential_3',
    shuffleQuestionsPart1: true,
    shuffleQuestionsPart2: true,
    shuffleQuestionsPart3: true,
    shuffleQuestionsPart4: false, // Default false: keep essay questions in original order
    shuffleOptionsPart1: true,
    shuffleStatementsPart2: false, // Default false according to GDPT 2018 guidelines
    header: {
      school: 'SỞ GD&ĐT ................... / TRƯỜNG THPT ...................',
      examName: 'KỲ THI KHẢO SÁT CHẤT LƯỢNG HỌC KỲ',
      subject: 'Môn: TOÁN HỌC',
      duration: 'Thời gian làm bài: 90 phút',
      note: '(Thí sinh không được sử dụng tài liệu)',
    },
  });

  // Results State
  const [variants, setVariants] = useState<ShuffledExamVariant[]>([]);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [copiedMatrix, setCopiedMatrix] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // STEP 1 HANDLERS: UPLOAD & PARSE
  // -------------------------------------------------------------
  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      setErrorMessage('Vui lòng chỉ tải lên file định dạng Word (.docx)');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setUploadedFileName(file.name);

      const arrayBuffer = await file.arrayBuffer();
      const parsed = await parseDocxToShufflerExam(arrayBuffer);

      if (parsed.questions.length === 0) {
        setErrorMessage(
          'Không nhận diện được câu hỏi nào trong file. Vui lòng đảm bảo các câu hỏi bắt đầu bằng "Câu 1.", "Câu 2." và có các phần "PHẦN I", "PHẦN II", "PHẦN III".'
        );
        setIsProcessing(false);
        return;
      }

      setExam(parsed);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Error parsing docx:', err);
      setErrorMessage(`Lỗi khi xử lý file Word: ${err.message || 'Không thể đọc nội dung file'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePasteParse = () => {
    if (!rawTextInput.trim()) {
      setErrorMessage('Vui lòng dán nội dung đề thi vào khung văn bản.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const parsed = parseRawTextToShufflerExam(rawTextInput);

      if (parsed.questions.length === 0) {
        setErrorMessage(
          'Không nhận diện được câu hỏi. Đảm bảo câu hỏi có tiền tố "Câu 1.", "Câu 2." và các phần PHẦN I, PHẦN II, PHẦN III.'
        );
        setIsProcessing(false);
        return;
      }

      setExam(parsed);
      setUploadedFileName('Đề văn bản dán');
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMessage(`Lỗi phân tích: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // STEP 2 HANDLERS: EDITING & FIXING ANSWERS
  // -------------------------------------------------------------
  const toggleOptionCorrect = (qIndex: number, optId: string) => {
    if (!exam) return;
    const newQuestions = [...exam.questions];
    const targetQ = { ...newQuestions[qIndex] };

    if (targetQ.options) {
      targetQ.options = targetQ.options.map((opt) => ({
        ...opt,
        isCorrect: opt.id === optId,
      }));
    }
    newQuestions[qIndex] = targetQ;
    setExam({ ...exam, questions: newQuestions });
  };

  const toggleOptionLock = (qIndex: number, optId: string) => {
    if (!exam) return;
    const newQuestions = [...exam.questions];
    const targetQ = { ...newQuestions[qIndex] };

    if (targetQ.options) {
      targetQ.options = targetQ.options.map((opt) =>
        opt.id === optId ? { ...opt, isLocked: !opt.isLocked } : opt
      );
    }
    newQuestions[qIndex] = targetQ;
    setExam({ ...exam, questions: newQuestions });
  };

  const toggleTfCorrect = (qIndex: number, stId: string) => {
    if (!exam) return;
    const newQuestions = [...exam.questions];
    const targetQ = { ...newQuestions[qIndex] };

    if (targetQ.tfStatements) {
      targetQ.tfStatements = targetQ.tfStatements.map((st) =>
        st.id === stId ? { ...st, isCorrect: !st.isCorrect } : st
      );
    }
    newQuestions[qIndex] = targetQ;
    setExam({ ...exam, questions: newQuestions });
  };

  const updateShortAnswer = (qIndex: number, val: string) => {
    if (!exam) return;
    const newQuestions = [...exam.questions];
    newQuestions[qIndex] = { ...newQuestions[qIndex], shortAnswer: val };
    setExam({ ...exam, questions: newQuestions });
  };

  const updateEssaySolution = (qIndex: number, val: string) => {
    if (!exam) return;
    const newQuestions = [...exam.questions];
    newQuestions[qIndex] = { ...newQuestions[qIndex], solution: val };
    setExam({ ...exam, questions: newQuestions });
  };

  // -------------------------------------------------------------
  // STEP 3 HANDLERS: CONFIGURATION & SHUFFLING
  // -------------------------------------------------------------
  const handleNumCodesChange = (n: number) => {
    let codes: string[] = [];
    if (config.codeFormat === 'sequential_3') {
      codes = Array.from({ length: n }, (_, i) => String(101 + i));
    } else if (config.codeFormat === 'sequential_4') {
      codes = Array.from({ length: n }, (_, i) => String(1001 + i));
    } else if (config.codeFormat === 'random_4') {
      const set = new Set<string>();
      while (set.size < n) {
        set.add(String(Math.floor(1000 + Math.random() * 9000)));
      }
      codes = Array.from(set);
    } else {
      codes = Array.from({ length: n }, (_, i) => String(101 + i));
    }

    setConfig({
      ...config,
      numCodes: n,
      examCodes: codes,
    });
  };

  const handleFormatChange = (fmt: ShuffleConfig['codeFormat']) => {
    let codes: string[] = [];
    const n = config.numCodes;
    if (fmt === 'sequential_3') {
      codes = Array.from({ length: n }, (_, i) => String(101 + i));
    } else if (fmt === 'sequential_4') {
      codes = Array.from({ length: n }, (_, i) => String(1001 + i));
    } else if (fmt === 'random_4') {
      const set = new Set<string>();
      while (set.size < n) {
        set.add(String(Math.floor(1000 + Math.random() * 9000)));
      }
      codes = Array.from(set);
    } else {
      codes = [...config.examCodes];
    }

    setConfig({
      ...config,
      codeFormat: fmt,
      examCodes: codes,
    });
  };

  const handleStartShuffle = async () => {
    if (!exam) return;
    const generated = generateShuffledExamVariants(exam, config);
    setVariants(generated);
    setActiveVariantIndex(0);
    setCurrentStep(4);

    try {
      const title = uploadedFileName
        ? uploadedFileName.replace(/\.docx$/i, '')
        : config.header.examName || 'Đề thi đã trộn';
      await saveShuffledExam(title, generated, config, exam);
      await loadSavedExams();
    } catch (err) {
      console.error('Lỗi khi lưu đề đã trộn vào bộ nhớ:', err);
    }
  };

  // -------------------------------------------------------------
  // STEP 4 HANDLERS: EXPORTING
  // -------------------------------------------------------------
  const handleExportZip = async () => {
    if (!exam || variants.length === 0) return;
    try {
      setExportingZip(true);
      await exportAllVariantsAsZip(variants, config, exam.imageStore);
    } catch (e: any) {
      alert(`Lỗi khi tạo file zip: ${e.message}`);
    } finally {
      setExportingZip(false);
    }
  };

  const handleExportCombined = async () => {
    if (!exam || variants.length === 0) return;
    try {
      const blob = await createCombinedDocx(variants, config, exam.imageStore);
      saveAs(blob, `De_Tron_Tat_Ca_Ma_De_${Date.now()}.docx`);
    } catch (e: any) {
      alert(`Lỗi khi tạo file gộp: ${e.message}`);
    }
  };

  const handleExportSingle = async (variant: ShuffledExamVariant) => {
    if (!exam) return;
    try {
      const blob = await createDocxForVariant(variant, config, exam.imageStore);
      saveAs(blob, `De_Thi_Ma_${variant.code}.docx`);
    } catch (e: any) {
      alert(`Lỗi khi tạo file mã đề: ${e.message}`);
    }
  };

  const getRelativePartIndex = (questions: ShufflerQuestion[], index: number) => {
    if (!questions || index < 0 || index >= questions.length) return index + 1;
    const targetPart = questions[index].part;
    let count = 0;
    for (let i = 0; i <= index; i++) {
      if (questions[i].part === targetPart) {
        count++;
      }
    }
    return count;
  };

  const handleExportAnswerKeyOnly = async () => {
    if (variants.length === 0) return;
    try {
      const blob = await createMasterAnswerKeyDocx(variants, config, exam?.imageStore || {});
      saveAs(blob, `Bang_Dap_An_Ma_Tran_Cac_Ma_De.docx`);
    } catch (e: any) {
      alert(`Lỗi khi tạo bảng đáp án: ${e.message}`);
    }
  };

  const copyAnswerKeyMatrixToClipboard = () => {
    if (variants.length === 0) return;
    let tsv = 'Câu\t' + variants.map((v) => `Mã ${v.code}`).join('\t') + '\n';

    const maxQ = Math.max(...variants.map((v) => v.questions.length));
    for (let i = 1; i <= maxQ; i++) {
      const row = [String(i)];
      for (const v of variants) {
        if (v.answerKeyPart1[i]) {
          row.push(v.answerKeyPart1[i]);
        } else if (v.answerKeyPart2[i]) {
          const map = v.answerKeyPart2[i];
          const tfStr = `${map.a ? 'Đ' : 'S'}-${map.b ? 'Đ' : 'S'}-${map.c ? 'Đ' : 'S'}-${map.d ? 'Đ' : 'S'}`;
          row.push(tfStr);
        } else if (v.answerKeyPart3[i]) {
          row.push(v.answerKeyPart3[i]);
        } else if (v.questions[i - 1]?.part === 4) {
          row.push('Xem đáp án TL');
        } else {
          row.push('-');
        }
      }
      tsv += row.join('\t') + '\n';
    }

    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedMatrix(true);
      setTimeout(() => setCopiedMatrix(false), 2500);
    });
  };

  // Helper to render text with image tokens in preview
  const renderStemWithImages = (text: string, imageStore: Record<string, string>) => {
    const parts = text.split(/(\[\[IMG_\d+\]\])/g);
    return (
      <div>
        {parts.map((p, idx) => {
          if (p.startsWith('[[IMG_') && p.endsWith(']]')) {
            const key = p.slice(2, -2);
            const dataUrl = imageStore[key];
            if (dataUrl) {
              return (
                <div key={idx} className="my-3 flex justify-center">
                  <img
                    src={dataUrl}
                    alt="Bảng biến thiên / đồ thị"
                    className="max-h-64 max-w-full rounded border border-slate-300 dark:border-slate-700 bg-white p-1 shadow-sm object-contain"
                  />
                </div>
              );
            }
            return (
              <span key={idx} className="text-xs italic text-slate-400">
                [Hình ảnh {key}]
              </span>
            );
          }
          return <MathView key={idx} content={p} inline={true} />;
        })}
      </div>
    );
  };

  // Stats calculation
  const part1Count = exam ? exam.questions.filter((q) => q.part === 1).length : 0;
  const part2Count = exam ? exam.questions.filter((q) => q.part === 2).length : 0;
  const part3Count = exam ? exam.questions.filter((q) => q.part === 3).length : 0;
  const part4Count = exam ? exam.questions.filter((q) => q.part === 4).length : 0;
  const missingAnsCount = exam
    ? exam.questions.filter((q) => {
        if (q.part === 1) return !q.options?.some((o) => o.isCorrect);
        if (q.part === 2) return !q.tfStatements || q.tfStatements.length === 0;
        if (q.part === 3) return !q.shortAnswer;
        return false;
      }).length
    : 0;

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* 3 Main Module Navigation Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-2.5 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setMainModuleTab('shuffle')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mainModuleTab === 'shuffle'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              <span>1. Trộn đề từ File gốc (.docx)</span>
            </button>

            <button
              onClick={() => {
                setIsKeyManagerModalOpen(true);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mainModuleTab === 'keys'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>2. Quản lý & Nhập Đáp Án</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full font-mono border border-slate-700">
                {Object.keys(omrKeys).length} mã
              </span>
            </button>

            <button
              onClick={() => setMainModuleTab('omr')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mainModuleTab === 'omr'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>3. Chấm OMR Camera & Ảnh</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                Chuẩn Bộ 2018
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSavedExamsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              title="Kho đề đã trộn được lưu trữ trên trình duyệt"
            >
              <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
              <span>Kho đề đã trộn</span>
              {savedExamsList.length > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold border border-amber-500/30">
                  {savedExamsList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsPrintSheetModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tải / In Phiếu A4</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: OMR CAMERA SCANNER */}
      {mainModuleTab === 'omr' && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
          <OMRScannerView
            initialExamKeys={omrKeys}
            onBackToShuffle={() => setMainModuleTab('shuffle')}
          />
        </div>
      )}

      {/* VIEW 2: EXAM SHUFFLER (4-STEP WIZARD) */}
      {mainModuleTab === 'shuffle' && (
        <>
          {/* Top Breadcrumb & Wizard Steps Header */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
                    <Shuffle className="w-5 h-5" />
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Trộn đề từ File gốc (Thuật toán Pure Shuffle)
                  </h1>
                  <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800">
                    Chuẩn GDPT 2018
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Đảo câu & phương án tức thì (&lt; 0.2s), bảo toàn 100% văn phong, công thức Toán LaTeX và ảnh Bảng biến thiên / Đồ thị.
                </p>
              </div>

          {/* Stepper Wizard Indicator */}
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { num: 1, label: 'Tải đề gốc' },
              { num: 2, label: 'Kiểm duyệt' },
              { num: 3, label: 'Cấu hình trộn' },
              { num: 4, label: 'Xuất Word & ZIP' },
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => {
                    if (step.num === 1) setCurrentStep(1);
                    else if (step.num === 2 && exam) setCurrentStep(2);
                    else if (step.num === 3 && exam) setCurrentStep(3);
                    else if (step.num === 4 && variants.length > 0) setCurrentStep(4);
                  }}
                  disabled={(step.num > 1 && !exam) || (step.num === 4 && variants.length === 0)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentStep === step.num
                      ? 'bg-blue-600 text-white shadow-xs'
                      : (step.num < currentStep) || (step.num === 2 && exam)
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      currentStep === step.num
                        ? 'bg-white text-blue-600'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {step.num}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {idx < 3 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1 text-sm">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* BƯỚC 1: TẢI ĐỀ & KHUNG QUY ĐỊNH CHUẨN HÓA                  */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Banner Quy chuẩn đề gốc - CỰC KỲ NỔI BẬT & RÕ RÀNG */}
            <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-blue-700/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-blue-800/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
                    <Sparkles className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-wide">
                      QUY ĐỊNH CHUẨN HÓA FILE ĐỀ GỐC TRƯỚC KHI TẢI LÊN
                    </h2>
                    <p className="text-xs text-blue-200">
                      Chuẩn Image-First: Giữ trọn 100% định dạng, đồ thị và bảng biến thiên không bao giờ bị lệch dòng hay cắt nhầm
                    </p>
                  </div>
                </div>

                {/* Sample Download Buttons (Word & PDF) */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                  <button
                    onClick={downloadSampleExamDocx}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    title="Tải file Word đề mẫu (.docx) đầy đủ 4 phần"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Tải mẫu Word (.docx)</span>
                  </button>

                  <button
                    onClick={downloadSampleExamPdf}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    title="Tải file PDF đề mẫu (.pdf) đầy đủ 4 phần"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Tải mẫu PDF (.pdf)</span>
                  </button>
                </div>
              </div>

              {/* 4 Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 hover:border-blue-400/40 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-amber-200">
                        BBT, Đồ thị, Bảng biểu bắt buộc dạng Hình ảnh (PNG/JPG)
                      </h4>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                        Mọi Bảng biến thiên (BBT), đồ thị hàm số và bảng số liệu cần đặt chế độ <i>In Line with Text</i>.
                        Nếu đang là bảng kẻ Word hoặc shapes, chỉ cần tô chọn → bấm <kbd className="px-1 py-0.5 bg-black/40 rounded text-[10px]">Ctrl+X</kbd> → bấm <kbd className="px-1 py-0.5 bg-black/40 rounded text-[10px]">Ctrl+Alt+V</kbd> chọn <b>Picture (PNG)</b> trước khi lưu file.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 hover:border-blue-400/40 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-400 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-200">
                        Tiêu đề Phân phần (I, II, III, IV / Tự luận) & Điểm số
                      </h4>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                        Hỗ trợ cả đề mới GDPT 2018 (Phần I, II, III, IV) và đề truyền thống (Trắc nghiệm + Tự luận). Tiêu đề tự luận ghi rõ: <b className="text-white">PHẦN IV</b> hoặc <b className="text-white">TỰ LUẬN</b>.
                        Câu hỏi tự luận có thể kèm điểm số: <b className="text-white">Câu 1 (1,0 điểm):</b>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 hover:border-blue-400/40 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-400 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-200">
                        Quy tắc Đánh dấu Đáp án đúng & Lời giải Tự luận
                      </h4>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                        • <b>Phần I:</b> Thêm dấu sao trước đáp án đúng (<code className="text-amber-300 font-bold">*A.</code>), hoặc gạch chân/tô đỏ chữ cái A., hoặc bảng đáp án cuối đề. Thêm <code className="text-amber-300 font-bold">#D.</code> nếu muốn <i>cố định phương án không bị đảo</i>.<br />
                        • <b>Phần II:</b> Có <b>gạch chân</b> <code className="text-emerald-300 font-bold"><u>a)</u></code> là <b>Đúng</b>, không gạch chân là <b>Sai</b> (hoặc dùng dấu sao <code className="text-emerald-300 font-bold">*a)</code> / <code className="text-emerald-300 font-bold">[Đ]</code>, <code className="text-emerald-300 font-bold">[S]</code>).<br />
                        • <b>Phần III:</b> Ghi dòng <code className="text-cyan-300 font-bold">Đáp án: &lt;giá trị&gt;</code> hoặc <code className="text-cyan-300 font-bold">Key&lt;giá trị&gt;</code> / <code className="text-cyan-300 font-bold">Key: &lt;giá trị&gt;</code> ngay dưới câu hỏi.<br />
                        • <b>Phần IV (Tự luận):</b> Giữ nguyên các ý nhỏ a, b, c và ảnh. Tự động nhận diện <code className="text-emerald-300 font-bold">Hướng dẫn chấm:</code> hoặc <code className="text-emerald-300 font-bold">Lời giải:</code> để xuất vào file đáp án giáo viên.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 hover:border-blue-400/40 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-purple-400 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-purple-200">
                        Cơ chế Tách Ảnh Token hóa & Bảo toàn công thức LaTeX
                      </h4>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                        Hệ thống tự động bóc tách ảnh thành token nội bộ <code className="text-purple-300 font-mono">[[IMG_ID]]</code> để thuật toán trộn không bao giờ làm đứt vỡ ảnh. Công thức Toán học dạng <code className="text-purple-300">$...$</code> được chuyển đổi sang chuẩn OMML / MathType tự nhiên trong file Word.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Selection Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setInputMode('upload')}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                  inputMode === 'upload'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Tải file Word đề gốc (.docx)</span>
              </button>
              <button
                onClick={() => setInputMode('paste')}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                  inputMode === 'paste'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Dán nhanh nội dung văn bản</span>
              </button>
            </div>

            {/* Tab 1: Upload Word file */}
            {inputMode === 'upload' && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-12 text-center bg-white dark:bg-slate-900/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer flex flex-col items-center justify-center group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                  {isProcessing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {isProcessing ? 'Đang đọc và tách ảnh BBT/đồ thị...' : 'Kéo thả file .docx vào đây hoặc bấm để chọn'}
                </h3>
                <p className="text-xs text-slate-400 mt-2 max-w-md">
                  Hỗ trợ trọn vẹn đề thi trắc nghiệm GDPT 2018 (Phần I, Phần II, Phần III). Bảng biến thiên và đồ thị dạng ảnh sẽ được nhận diện tự động 100%.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Info className="w-3.5 h-3.5" />
                  <span>Dung lượng khuyến nghị: &lt; 25MB</span>
                </div>
              </div>
            )}

            {/* Tab 2: Paste Raw Text */}
            {inputMode === 'paste' && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Dán nội dung đề thi vào đây:
                  </label>
                  <button
                    onClick={() => {
                      setRawTextInput(`PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.
Câu 1. Tập xác định của hàm số $y = \\frac{1}{\\sqrt{x - 2}}$ là:
A. $D = [2; +\\infty)$
*B. $D = (2; +\\infty)$
C. $D = \\mathbb{R} \\setminus \\{2\\}$
D. $D = (-\\infty; 2)$

Câu 2. Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác đều cạnh $a$. Khẳng định nào sau đây là đúng?
*A. Tam giác $ABC$ có diện tích bằng $\\frac{a^2\\sqrt{3}}{4}$.
B. Diện tích tam giác $ABC$ bằng $\\frac{a^2}{2}$.
C. Chu vi tam giác $ABC$ bằng $2a$.
#D. Không có khẳng định nào đúng.

PHẦN II. Câu trắc nghiệm đúng sai.
Câu 3. Cho hàm số bậc ba $y = f(x) = x^3 - 3x + 1$. Xét tính đúng sai của các khẳng định sau:
<u>a)</u> Đạo hàm của hàm số là $f'(x) = 3x^2 - 3$.
<u>b)</u> Hàm số đồng biến trên các khoảng $(-\\infty; -1)$ và $(1; +\\infty)$.
c) Giá trị cực tiểu của hàm số bằng $3$.
d) Đồ thị hàm số đi qua gốc tọa độ $O(0; 0)$.

PHẦN III. Câu trắc nghiệm trả lời ngắn.
Câu 4. Tìm giá trị nhỏ nhất của hàm số $y = x + \\frac{4}{x}$ trên khoảng $(0; +\\infty)$.
Key: 4

PHẦN IV. Câu hỏi tự luận.
Câu 5 (1,5 điểm). Cho hàm số $y = \\frac{x + 1}{x - 1}$.
a) Khảo sát sự biến thiên và vẽ đồ thị $(C)$ của hàm số.
b) Viết phương trình tiếp tuyến của $(C)$ tại điểm có hoành độ $x_0 = 2$.
Hướng dẫn chấm:
a) Tập xác định $D = \\mathbb{R} \\setminus \\{1\\}$. Đạo hàm $y' = -\\frac{2}{(x-1)^2} < 0$. (0,75 điểm)
b) Tiếp tuyến tại $x_0 = 2$ có hệ số góc $k = -2$. Phương trình: $y = -2x + 7$. (0,75 điểm)`);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Dán mẫu thử nghiệm</span>
                  </button>
                </div>
                <textarea
                  value={rawTextInput}
                  onChange={(e) => setRawTextInput(e.target.value)}
                  placeholder="Dán toàn bộ nội dung đề thi từ Word hoặc Text editor..."
                  rows={14}
                  className="w-full p-4 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handlePasteParse}
                    disabled={isProcessing || !rawTextInput.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    <span>Phân tích & Kiểm duyệt câu hỏi</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* BƯỚC 2: KIỂM DUYỆT TRỰC QUAN & NHANH (LIVE PREVIEW & EDIT)   */}
        {/* ========================================================= */}
        {currentStep === 2 && exam && (
          <div className="space-y-6 animate-fadeIn">
            {/* Smart Table Warning if Tables Detected */}
            {exam.tableWarnings && exam.tableWarnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-xs">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold">Cảnh báo thông minh: Phát hiện bảng kẻ Word trong đề gốc!</h4>
                  <ul className="text-xs space-y-1 text-amber-800 dark:text-amber-300 list-disc list-inside">
                    {exam.tableWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-700 dark:text-amber-400 italic pt-1">
                    Khuyến nghị: Chuyển bảng kẻ/BBT sang dạng Hình ảnh (Picture PNG) trong Word để khi trộn mã đề bảng không bị co giãn hoặc lỗi định dạng.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Stats Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  <span>Tổng số câu: {exam.questions.length}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                  <span>Phần I: {part1Count} câu</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                  <span>Phần II: {part2Count} câu</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <span>Phần III: {part3Count} câu</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                  <span>Phần IV (Tự luận): {part4Count} câu</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>Ảnh BBT/Đồ thị: {exam.detectedImageCount}</span>
                </div>
                {missingAnsCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Thiếu đáp án: {missingAnsCount} câu</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
                >
                  Tải file khác
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <span>Tiếp tục: Cấu hình trộn</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Questions Inspection List */}
            <div className="space-y-4">
              {exam.questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        {getRelativePartIndex(exam.questions, qIdx)}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {q.part === 1
                          ? 'PHẦN I • Trắc nghiệm 4 lựa chọn'
                          : q.part === 2
                          ? 'PHẦN II • Đúng / Sai'
                          : q.part === 3
                          ? 'PHẦN III • Trả lời ngắn'
                          : 'PHẦN IV • Tự luận'}
                      </span>
                      {q.points && (
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                          {q.points}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Gốc: Câu {q.originalIndex}
                      </span>
                    </div>
                  </div>

                  {/* Question Stem with Images */}
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed mb-4">
                    {renderStemWithImages(q.stem, exam.imageStore)}
                  </div>

                  {/* PART 1 OPTIONS */}
                  {q.part === 1 && q.options && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[11px] font-semibold text-slate-400 mb-1">
                        Bấm vào chữ cái để chọn ĐÁP ÁN ĐÚNG • Bấm icon ổ khóa để CỐ ĐỊNH PHƯƠNG ÁN không bị đảo:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all ${
                              opt.isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {/* Correct toggle button */}
                            <button
                              type="button"
                              onClick={() => toggleOptionCorrect(qIdx, opt.id)}
                              className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                                opt.isCorrect
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                              }`}
                              title={opt.isCorrect ? 'Đáp án Đúng' : 'Bấm để đặt làm Đáp án Đúng'}
                            >
                              {opt.label}
                            </button>

                            {/* Option content */}
                            <div className="flex-1 text-xs text-slate-800 dark:text-slate-200 pt-1">
                              {renderStemWithImages(opt.text, exam.imageStore)}
                            </div>

                            {/* Lock toggle button */}
                            <button
                              type="button"
                              onClick={() => toggleOptionLock(qIdx, opt.id)}
                              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer shrink-0 ${
                                opt.isLocked
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                              }`}
                              title={
                                opt.isLocked
                                  ? 'Phương án đang CỐ ĐỊNH (Không đảo vị trí)'
                                  : 'Bấm để Cố định phương án này (Ví dụ: "Cả 3 phương án đều đúng")'
                              }
                            >
                              {opt.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PART 2 STATEMENTS */}
                  {q.part === 2 && q.tfStatements && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[11px] font-semibold text-slate-400 mb-1">
                        Bấm vào nút [Đúng] hoặc [Sai] để điều chỉnh tính đúng sai của từng ý:
                      </p>
                      <div className="space-y-2">
                        {q.tfStatements.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex items-start gap-2 flex-1">
                              <span className="font-bold text-xs text-blue-600 dark:text-blue-400 w-5 shrink-0">
                                {st.label})
                              </span>
                              <div className="text-xs text-slate-800 dark:text-slate-200">
                                {renderStemWithImages(st.text, exam.imageStore)}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleTfCorrect(qIdx, st.id)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                  st.isCorrect
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                Đúng [Đ]
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleTfCorrect(qIdx, st.id)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                  !st.isCorrect
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                Sai [S]
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PART 3 SHORT ANSWER */}
                  {q.part === 3 && (
                    <div className="pt-2">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800">
                        <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 shrink-0">
                          Đáp số trắc nghiệm ngắn:
                        </span>
                        <input
                          type="text"
                          value={q.shortAnswer || ''}
                          onChange={(e) => updateShortAnswer(qIdx, e.target.value)}
                          placeholder="Ví dụ: 4 hoặc 12.5"
                          className="flex-1 px-3 py-1 text-xs rounded-lg border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* PART 4 ESSAY / TỰ LUẬN */}
                  {q.part === 4 && (
                    <div className="space-y-3 pt-2">
                      <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Hướng dẫn chấm / Lời giải chi tiết (Dành cho file Đáp án GV):</span>
                          </span>
                          <span className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                            * Tự động ẩn trên đề thi học sinh
                          </span>
                        </div>
                        <textarea
                          value={q.solution || ''}
                          onChange={(e) => updateEssaySolution(qIdx, e.target.value)}
                          placeholder="Nhập hoặc dán hướng dẫn chấm, biểu điểm chi tiết từng ý a, b, c của câu tự luận..."
                          rows={4}
                          className="w-full p-2.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-sans"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Floating Bar */}
            <div className="sticky bottom-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                ← Quay lại Tải đề
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                <span>Chuyển sang Bước 3: Cấu hình trộn đề</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* BƯỚC 3: CẤU HÌNH TRỘN ĐỀ (SHUFFLE SETTINGS)                */}
        {/* ========================================================= */}
        {currentStep === 3 && exam && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <Settings2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Cấu hình Tham số Trộn đề Thi
                </h3>
              </div>

              {/* Number of Variants */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Số lượng mã đề cần tạo:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[2, 4, 6, 8, 12, 16, 24].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumCodesChange(num)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        config.numCodes === num
                          ? 'bg-blue-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {num} mã đề
                    </button>
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-slate-500">Hoặc tự nhập:</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={config.numCodes}
                      onChange={(e) => handleNumCodesChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-16 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Code Format */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Định dạng Mã đề thi:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'sequential_3', label: 'Tự động 3 chữ số (101, 102...)', example: '101, 102, 103, 104' },
                    { id: 'sequential_4', label: 'Tự động 4 chữ số (1001, 1002...)', example: '1001, 1002, 1003, 1004' },
                    { id: 'random_4', label: 'Ngẫu nhiên 4 chữ số', example: '4821, 9152, 3810, 7729' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => handleFormatChange(fmt.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        config.codeFormat === fmt.id
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{fmt.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        Ví dụ: {fmt.example}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Codes Input */}
                <div className="pt-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Danh sách mã đề dự kiến (ngăn cách bằng dấu phẩy):
                  </label>
                  <input
                    type="text"
                    value={config.examCodes.join(', ')}
                    onChange={(e) => {
                      const list = e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      setConfig({ ...config, examCodes: list, numCodes: list.length || 1 });
                    }}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
                  />
                </div>
              </div>

              {/* Shuffle Options Checkboxes */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Quy tắc Đảo thứ tự (Shuffle Rules):
                </label>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.shuffleQuestionsPart1}
                      onChange={(e) => setConfig({ ...config, shuffleQuestionsPart1: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Đảo thứ tự câu hỏi trong PHẦN I
                      </span>
                      <p className="text-[11px] text-slate-500">Xáo trộn vị trí các câu hỏi trắc nghiệm 4 lựa chọn</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.shuffleOptionsPart1}
                      onChange={(e) => setConfig({ ...config, shuffleOptionsPart1: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Đảo vị trí phương án A, B, C, D trong PHẦN I
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Phương án có dấu # hoặc khóa sẽ được giữ nguyên vị trí
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.shuffleQuestionsPart2}
                      onChange={(e) => setConfig({ ...config, shuffleQuestionsPart2: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Đảo thứ tự câu hỏi trong PHẦN II (Đúng/Sai)
                      </span>
                      <p className="text-[11px] text-slate-500">Xáo trộn vị trí các câu hỏi Đúng/Sai</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.shuffleStatementsPart2}
                      onChange={(e) => setConfig({ ...config, shuffleStatementsPart2: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Đảo thứ tự các ý a), b), c), d) trong PHẦN II (Mặc định: TẮT)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Theo hướng dẫn Bộ GD&ĐT, các ý a, b, c, d thường theo bậc thang tư duy nên mặc định giữ nguyên
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.shuffleQuestionsPart3}
                      onChange={(e) => setConfig({ ...config, shuffleQuestionsPart3: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Đảo thứ tự câu hỏi trong PHẦN III (Trả lời ngắn)
                      </span>
                      <p className="text-[11px] text-slate-500">Xáo trộn thứ tự câu hỏi, giữ nguyên đáp số của mỗi câu</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!config.shuffleQuestionsPart4}
                      onChange={(e) => setConfig({ ...config, shuffleQuestionsPart4: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Đảo thứ tự các câu lớn trong PHẦN TỰ LUẬN (Mặc định: TẮT)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Mặc định giữ nguyên thứ tự câu lớn để dễ chấm thi theo biểu điểm; nếu BẬT chỉ đảo vị trí câu lớn và giữ nguyên ý nhỏ a, b, c
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Header Information */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Thông tin Tiêu đề Header trong file Word xuất ra:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Đơn vị / Trường:</span>
                    <input
                      type="text"
                      value={config.header.school}
                      onChange={(e) =>
                        setConfig({ ...config, header: { ...config.header, school: e.target.value } })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Tên kỳ thi:</span>
                    <input
                      type="text"
                      value={config.header.examName}
                      onChange={(e) =>
                        setConfig({ ...config, header: { ...config.header, examName: e.target.value } })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Môn thi:</span>
                    <input
                      type="text"
                      value={config.header.subject}
                      onChange={(e) =>
                        setConfig({ ...config, header: { ...config.header, subject: e.target.value } })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Thời gian làm bài:</span>
                    <input
                      type="text"
                      value={config.header.duration}
                      onChange={(e) =>
                        setConfig({ ...config, header: { ...config.header, duration: e.target.value } })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  ← Quay lại Kiểm duyệt
                </button>
                <button
                  onClick={handleStartShuffle}
                  className="flex items-center gap-2 px-8 py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all transform hover:scale-[1.02]"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Bắt đầu Trộn đề ngay (&lt; 0.2s)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* BƯỚC 4: XUẤT FILE WORD (.DOCX) & MA TRẬN ĐÁP ÁN             */}
        {/* ========================================================= */}
        {currentStep === 4 && exam && variants.length > 0 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Success Top Banner */}
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                    Đã hoàn thành trộn {variants.length} mã đề thi thành công!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Thuật toán Fisher-Yates Deterministic Shuffle đã tạo ma trận đáp án chuẩn xác 100%. Sẵn sàng xuất file Word.
                  </p>
                </div>
              </div>

              {/* Download Main ZIP Button */}
              <button
                onClick={handleExportZip}
                disabled={exportingZip}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap self-start md:self-auto disabled:opacity-50"
              >
                {exportingZip ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderArchive className="w-4 h-4" />
                )}
                <span>📦 Tải trọn bộ Đề & Bảng đáp án (.ZIP)</span>
              </button>
            </div>

            {/* Quick Action Download Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleExportCombined}
                className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl text-left transition-all flex items-center gap-3 cursor-pointer group shadow-xs"
              >
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Tải File Word Gộp Tất Cả Mã Đề
                  </div>
                  <div className="text-[11px] text-slate-400">Một file .docx phân tách từng mã đề bằng ngắt trang</div>
                </div>
              </button>

              <button
                onClick={handleExportAnswerKeyOnly}
                className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 rounded-xl text-left transition-all flex items-center gap-3 cursor-pointer group shadow-xs"
              >
                <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Tải Bảng Đáp Án Ma Trận (.docx)
                  </div>
                  <div className="text-[11px] text-slate-400">Bảng tổng hợp đáp án gọn gàng dùng cho chấm thi</div>
                </div>
              </button>

              <button
                onClick={() => {
                  const keys = convertShuffledVariantsToOmrKeys(variants);
                  setOmrKeys(keys);
                  try {
                    localStorage.setItem('eduplan_omr_exam_keys', JSON.stringify(keys));
                  } catch {}
                  setMainModuleTab('omr');
                }}
                className="p-3.5 bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-left transition-all flex items-center gap-3 cursor-pointer group shadow-sm hover:from-emerald-500 hover:to-teal-600"
              >
                <div className="p-2.5 rounded-lg bg-white/20 text-white group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Chuyển Sang Chấm Camera OMR</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <div className="text-[11px] text-emerald-100">
                    Tự động đồng bộ {variants.length} mã đề vừa trộn sang bộ chấm camera
                  </div>
                </div>
              </button>

              <button
                onClick={() => setCurrentStep(3)}
                className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 rounded-xl text-left transition-all flex items-center gap-3 cursor-pointer group shadow-xs"
              >
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 group-hover:scale-105 transition-transform">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Đổi Cấu Hình & Trộn Lại
                  </div>
                  <div className="text-[11px] text-slate-400">Chỉnh sửa số mã đề hoặc quy tắc đảo</div>
                </div>
              </button>
            </div>

            {/* MASTER ANSWER KEY COMPARISON MATRIX */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-purple-600 text-white rounded-lg">
                    <Layers className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    BẢNG MA TRẬN ĐỐI CHIẾU ĐÁP ÁN TẤT CẢ CÁC MÃ ĐỀ
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyAnswerKeyMatrixToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedMatrix ? 'Đã sao chép!' : 'Copy ma trận đáp án (Excel)'}</span>
                  </button>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto max-h-96 border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 z-10 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 border-b border-r border-slate-200 dark:border-slate-700 text-center w-16">
                        Câu
                      </th>
                      {variants.map((v) => (
                        <th
                          key={v.code}
                          className="py-2.5 px-3 border-b border-r border-slate-200 dark:border-slate-700 text-center font-bold text-blue-700 dark:text-blue-400"
                        >
                          Mã {v.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from({ length: variants[0].questions.length }, (_, idx) => {
                      const qNum = idx + 1;
                      return (
                        <tr
                          key={qNum}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-bold text-center bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            Câu {getRelativePartIndex(variants[0].questions, idx)} (P.{variants[0].questions[idx]?.part === 1 ? 'I' : variants[0].questions[idx]?.part === 2 ? 'II' : variants[0].questions[idx]?.part === 3 ? 'III' : 'IV'})
                          </td>
                          {variants.map((v) => {
                            const isP1 = v.answerKeyPart1[qNum];
                            const isP2 = v.answerKeyPart2[qNum];
                            const isP3 = v.answerKeyPart3[qNum];

                            return (
                              <td
                                key={v.code}
                                className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-center font-mono font-bold"
                              >
                                {isP1 && (
                                  <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                    {isP1}
                                  </span>
                                )}
                                {isP2 && (
                                  <span className="text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded text-[11px] border border-purple-200 dark:border-purple-800">
                                    {isP2.a ? 'Đ' : 'S'}-{isP2.b ? 'Đ' : 'S'}-{isP2.c ? 'Đ' : 'S'}-{isP2.d ? 'Đ' : 'S'}
                                  </span>
                                )}
                                {isP3 && (
                                  <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                    {isP3}
                                  </span>
                                )}
                                {v.questions[idx]?.part === 4 && (
                                  <span className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded text-[11px] border border-amber-200 dark:border-amber-800">
                                    Tự luận
                                  </span>
                                )}
                                {!isP1 && !isP2 && !isP3 && v.questions[idx]?.part !== 4 && (
                                  <span className="text-slate-300">-</span>
                                )}
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

            {/* PREVIEW OF SHUFFLED VARIANTS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Xem trước chi tiết nội dung từng Mã đề:
                  </h3>
                </div>

                {/* Variant Switcher Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {variants.map((v, vIdx) => (
                    <button
                      key={v.code}
                      onClick={() => setActiveVariantIndex(vIdx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeVariantIndex === vIdx
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Mã {v.code}
                    </button>
                  ))}
                  <button
                    onClick={() => handleExportSingle(variants[activeVariantIndex])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors ml-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải riêng Mã {variants[activeVariantIndex].code} (.docx)</span>
                  </button>
                </div>
              </div>

              {/* Variant Content Card */}
              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 space-y-4 max-h-[600px] overflow-y-auto">
                <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {config.header.school}
                  </div>
                  <div className="text-base font-bold text-blue-700 dark:text-blue-400">
                    MÃ ĐỀ THI: {variants[activeVariantIndex].code}
                  </div>
                  <div className="text-xs text-slate-500 italic">
                    {config.header.subject} • {config.header.duration}
                  </div>
                </div>

                {variants[activeVariantIndex].questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span className="text-blue-600 dark:text-blue-400">
                        Câu {getRelativePartIndex(variants[activeVariantIndex].questions, idx)} (PHẦN {q.part === 1 ? 'I' : q.part === 2 ? 'II' : q.part === 3 ? 'III' : 'IV'}):
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (Từ Câu {q.originalIndex} đề gốc)
                      </span>
                    </div>

                    <div className="text-slate-900 dark:text-slate-100 font-medium">
                      {renderStemWithImages(q.stem, exam.imageStore)}
                    </div>

                    {q.part === 1 && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`p-2 rounded-lg border flex items-start gap-2 ${
                              opt.isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-300 font-semibold'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-bold">{opt.label}.</span>
                            <div className="flex-1">{renderStemWithImages(opt.text, exam.imageStore)}</div>
                            {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.part === 2 && q.tfStatements && (
                      <div className="space-y-1.5 pt-2">
                        {q.tfStatements.map((st) => (
                          <div
                            key={st.id}
                            className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-blue-600">{st.label})</span>
                              <div>{renderStemWithImages(st.text, exam.imageStore)}</div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                st.isCorrect
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                              }`}
                            >
                              {st.isCorrect ? 'Đúng' : 'Sai'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.part === 3 && (
                      <div className="pt-2 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        Đáp án: {q.shortAnswer || '(Chưa điền)'}
                      </div>
                    )}

                    {q.part === 4 && (
                      <div className="pt-2 text-xs text-slate-700 dark:text-slate-300 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                        <div className="font-bold text-amber-800 dark:text-amber-400">
                          [Câu hỏi Tự luận - Học sinh làm bài trực tiếp]
                        </div>
                        {q.solution && (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 italic">
                            ✓ Đã có Lời giải / Hướng dẫn chấm (Tự động ẩn trên đề học sinh, hiển thị trên file Đáp án GV)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      </>
    )}

      {/* Saved Shuffled Exams Vault Modal */}
      <SavedShuffledExamsModal
        isOpen={isSavedExamsModalOpen}
        onClose={() => setIsSavedExamsModalOpen(false)}
        savedExams={savedExamsList}
        onSelectExam={(record) => {
          setExam(record.exam);
          setConfig(record.config);
          setVariants(record.variants);
          setActiveVariantIndex(0);
          setUploadedFileName(record.title);
          setCurrentStep(4);
        }}
        onDeleteExam={async (id) => {
          await deleteShuffledExam(id);
          await loadSavedExams();
        }}
        onClearAll={async () => {
          await clearAllShuffledExams();
          await loadSavedExams();
        }}
      />

      {/* Answer Key Manager Modal */}
      <AnswerKeyManagerModal
        isOpen={isKeyManagerModalOpen}
        onClose={() => setIsKeyManagerModalOpen(false)}
        examKeys={omrKeys}
        onSaveKeys={(updated) => {
          setOmrKeys(updated);
          try {
            localStorage.setItem('eduplan_omr_exam_keys', JSON.stringify(updated));
          } catch {}
        }}
        onNavigateToScanner={() => {
          setMainModuleTab('omr');
        }}
      />

      {/* Standard Printable Sheet Modal */}
      <OMRPrintSheetModal
        isOpen={isPrintSheetModalOpen}
        onClose={() => setIsPrintSheetModalOpen(false)}
      />
    </div>
  );
}
