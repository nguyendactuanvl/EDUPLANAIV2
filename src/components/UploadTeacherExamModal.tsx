import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Share2, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Plus, 
  X, 
  AlertCircle, 
  ArrowLeft, 
  Check, 
  Download,
  Eye,
  Clock,
  HelpCircle,
  QrCode,
  Image,
  ImagePlus,
  Link2,
  Clipboard
} from 'lucide-react';
import { 
  STANDARDIZED_EXAM_TYPES, 
  getDefaultDurationForExamType, 
  formatExamTitle, 
  normalizeExamType 
} from '../lib/examConfig';
import mammoth from 'mammoth';
import QRCode from 'qrcode';
import LZString from 'lz-string';
import { MarkdownRenderer } from './MarkdownRenderer';
import { 
  parseRawExamText, 
  parseExamWithAI, 
  ParsedQuestion, 
  detectExamDurationFromText, 
  suggestDurationByQuestionCount 
} from '../lib/examParser';
import { saveExamToCloud } from '../lib/cloudExamStore';
import { apiFetch } from '../lib/apiFetch';
import { GDPT_2018_SUBJECTS } from '../lib/subjects';
import { formatMathContent, sanitizeShortAnswerInput, validateShortAnswer, sanitizeExamQuestion } from '../lib/utils';
import { attachCroppedFiguresToQuestions } from '../lib/cropUtils';
import { SimilarExamsModal } from './SimilarExamsModal';
import { QuestionEditModal } from './QuestionEditModal';

export { formatMathContent };

interface UploadTeacherExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubject?: string;
  defaultGrade?: number;
}

const SAMPLE_EXAM_TEXT = `PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu 2.
Câu 1: Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ có bảng biến thiên trên đoạn $[-1; 3]$. Giá trị lớn nhất của hàm số trên đoạn $[-1; 3]$ bằng
A. $\\max_{[-1; 3]} f(x) = 5$
B. $\\max_{[-1; 3]} f(x) = 2$
C. $\\max_{[-1; 3]} f(x) = -1$
D. $\\max_{[-1; 3]} f(x) = 0$
Đáp án: A
Lời giải: Dựa vào bảng biến thiên, ta thấy giá trị cao nhất của hàm số trên đoạn $[-1; 3]$ đạt tại $x = 1$ với $y = 5$. Vậy giá trị lớn nhất bằng $5$.

Câu 2: Nghiệm của phương trình $\\log_2(x - 1) = 3$ là
A. $x = 7$
B. $x = 9$
C. $x = 8$
D. $x = 10$
Đáp án: B
Lời giải: Điều kiện $x - 1 > 0 \\Leftrightarrow x > 1$. Phương trình tương đương: $x - 1 = 2^3 = 8 \\Leftrightarrow x = 9$ (thỏa mãn điều kiện).

PHẦN II. Câu trắc nghiệm đúng sai. Thí sinh trả lời câu 3.
Câu 3: Cho hàm số bậc ba $y = f(x) = ax^3 + bx^2 + cx + d$ có đồ thị như hình vẽ.
a) Hàm số đồng biến trên khoảng $(-\\infty; -1)$. [Đ]
b) Điểm cực đại của đồ thị hàm số là $(1; 2)$. [S]
c) Giá trị nhỏ nhất của hàm số trên đoạn $[0; 2]$ bằng $-2$. [Đ]
d) Phương trình $2f(x) - 3 = 0$ có đúng 3 nghiệm phân biệt. [S]
Lời giải: Dựa vào đồ thị ta thấy hàm số đồng biến trên $(-\\infty; -1)$, có điểm cực đại $(-1; 4)$ và cực tiểu $(1; -2)$.

PHẦN III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời câu 4.
Câu 4: Cho hình chóp $S.ABC$ có đáy là tam giác vuông tại $B$, $SA \\perp (ABC)$, $SA = 3$, $AB = 4$, $BC = 5$. Tính thể tích khối chóp $S.ABC$.
Đáp án: 10
Lời giải: Diện tích đáy $S_{ABC} = \\frac{1}{2} \\cdot 4 \\cdot 5 = 10$. Thể tích $V = \\frac{1}{3} S_{ABC} \\cdot SA = \\frac{1}{3} \\cdot 10 \\cdot 3 = 10$.

PHẦN IV. Tự luận. Thí sinh trả lời câu 5.
Câu 5: (1.5 điểm) Trong không gian $Oxyz$, cho hai điểm $A(1; 2; -1)$, $B(3; 0; 1)$ và mặt phẳng $(P): 2x - y + z + 1 = 0$. Viết phương trình mặt phẳng $(Q)$ đi qua hai điểm $A, B$ và vuông góc với mặt phẳng $(P)$.
Hướng dẫn chấm:
- Vectơ $\\vec{AB} = (2; -2; 2)$ và vectơ pháp tuyến của $(P)$ là $\\vec{n}_P = (2; -1; 1)$. (0.5 điểm)
- Vectơ pháp tuyến của $(Q)$ là $\\vec{n}_Q = [\\vec{AB}, \\vec{n}_P] = (0; 2; 2) = 2(0; 1; 1)$. (0.5 điểm)
- Mặt phẳng $(Q)$ đi qua $A(1; 2; -1)$ có phương trình: $0(x - 1) + 1(y - 2) + 1(z + 1) = 0 \\Leftrightarrow y + z - 1 = 0$. (0.5 điểm)`;

export function UploadTeacherExamModal({
  isOpen,
  onClose,
  defaultSubject = "Toán",
  defaultGrade = 10
}: UploadTeacherExamModalProps) {
  // Step navigation: 'input' -> 'preview_edit' -> 'share_popup'
  const [step, setStep] = useState<'input' | 'preview_edit' | 'share_popup'>('input');
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  
  // Exam metadata
  const [examType, setExamType] = useState<string>("Đề kiểm tra giữa kỳ 1");
  const [examTitle, setExamTitle] = useState("Đề kiểm tra trắc nghiệm online");
  const [subject, setSubject] = useState(defaultSubject);
  const [grade, setGrade] = useState(defaultGrade);
  const [duration, setDuration] = useState<number>(45);
  const [durationInput, setDurationInput] = useState<string>("45");
  const [isUnlimitedTime, setIsUnlimitedTime] = useState<boolean>(false);
  const [detectedDurationSource, setDetectedDurationSource] = useState<string | null>(null);
  const userModifiedDuration = useRef(false);

  const handleExamTypeChange = (newType: string) => {
    setExamType(newType);
    userModifiedDuration.current = false;
    if (!isUnlimitedTime) {
      const defaultDur = getDefaultDurationForExamType(newType, "THPT", String(grade), subject);
      setDuration(defaultDur);
      setDurationInput(String(defaultDur));
      setDetectedDurationSource(`Gợi ý chuẩn (${newType}): ${defaultDur} phút`);
    }
    if (!examTitle || examTitle === "Đề kiểm tra trắc nghiệm online" || examTitle.startsWith("ĐỀ ")) {
      setExamTitle(formatExamTitle(newType, subject, String(grade)));
    }
  };

  // Raw exam text & input
  const [rawText, setRawText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed questions
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  
  // Question being edited
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [isQuestionEditModalOpen, setIsQuestionEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ParsedQuestion | null>(null);

  // Synchronize editingQuestion when editingId changes
  useEffect(() => {
    if (editingId !== null && editingId !== undefined) {
      if (!editingQuestion || editingQuestion.id !== editingId) {
        const target = questions.find(q => q.id === editingId);
        if (target) {
          setEditingQuestion({
            ...target,
            options: target.options ? [...target.options] : ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
            tfStatements: target.tfStatements ? target.tfStatements.map(s => ({ ...s })) : [
              { statement: "Ý a", correct: true },
              { statement: "Ý b", correct: false },
              { statement: "Ý c", correct: true },
              { statement: "Ý d", correct: false }
            ]
          });
        }
      }
    } else {
      setEditingQuestion(null);
    }
  }, [editingId, questions]);

  // Sharing state
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [sharePin, setSharePin] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setCopied(false);
    }
  }, [isOpen]);

  // Handle docx / pdf / txt file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);
    setIsReadingFile(true);

    // Auto set title if empty or default
    if (examTitle === "Đề kiểm tra trắc nghiệm online") {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      setExamTitle(cleanName);
    }

    try {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.pdf')) {
        // Read as Data URL (base64) to send directly to Gemini API
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          setUploadedFile({
            name: file.name,
            type: 'application/pdf',
            data: dataUrl
          });
          setRawText(`[Tệp PDF: ${file.name}]\nĐã nạp file PDF thành công! Đang chuẩn bị phân tích tự động các câu hỏi và công thức Toán qua Gemini AI...`);
          setIsReadingFile(false);

          // Tự động trích xuất văn bản từ PDF trong nền qua pdf-parse
          try {
            const extractRes = await apiFetch('/api/extract-file-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                files: [{
                  name: file.name,
                  type: 'application/pdf',
                  data: dataUrl
                }]
              })
            });
            if (extractRes.ok) {
              const extData = await extractRes.json();
              if (extData?.text && extData.text.trim()) {
                setRawText(extData.text.trim());
                const autoDur = detectExamDurationFromText(extData.text);
                if (autoDur && !userModifiedDuration.current) {
                  setDuration(autoDur);
                  setDurationInput(String(autoDur));
                  setIsUnlimitedTime(false);
                  setDetectedDurationSource(`Tự động nhận diện từ tệp PDF: ${autoDur} phút`);
                }
              }
            }
          } catch (e) {
            console.warn("Background text extraction optional notice:", e);
          }
        };
        reader.onerror = () => {
          setErrorMsg("Không thể đọc file PDF. Vui lòng thử lại hoặc kiểm tra tệp.");
          setIsReadingFile(false);
        };
        reader.readAsDataURL(file);
      } else if (lowerName.endsWith('.docx')) {
        // Extract raw text using mammoth for instant preview & fallback
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setRawText(result.value);

        // Auto-detect duration from docx text
        const autoDur = detectExamDurationFromText(result.value);
        if (autoDur && !userModifiedDuration.current) {
          setDuration(autoDur);
          setDurationInput(String(autoDur));
          setIsUnlimitedTime(false);
          setDetectedDurationSource(`Tự động nhận diện từ tệp Word: ${autoDur} phút`);
        }

        // Also save base64 for optional full AI document analysis
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setUploadedFile({
            name: file.name,
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            data: dataUrl
          });
          setIsReadingFile(false);
        };
        reader.onerror = () => {
          setIsReadingFile(false);
        };
        reader.readAsDataURL(file);
      } else if (lowerName.endsWith('.txt')) {
        const text = await file.text();
        setRawText(text);
        const autoDur = detectExamDurationFromText(text);
        if (autoDur && !userModifiedDuration.current) {
          setDuration(autoDur);
          setDurationInput(String(autoDur));
          setIsUnlimitedTime(false);
          setDetectedDurationSource(`Tự động nhận diện từ tệp: ${autoDur} phút`);
        }
        setUploadedFile(null);
        setIsReadingFile(false);
      } else {
        setErrorMsg("Định dạng file chưa được hỗ trợ. Vui lòng chọn tệp .docx, .pdf hoặc .txt");
        setIsReadingFile(false);
      }
    } catch (err: any) {
      console.error("Lỗi đọc file:", err);
      setErrorMsg("Không thể đọc nội dung file: " + (err.message || ""));
      setIsReadingFile(false);
    }
  };

  // Trigger parsing and go to Step 2 (Smart AI Parser with fallback)
  const handleParseExam = async (forceRegex = false) => {
    const hasPdf = uploadedFile?.type === 'application/pdf';
    const isPdfPlaceholder = rawText.startsWith('[Tệp PDF:');
    
    if (!hasPdf && !rawText.trim()) {
      setErrorMsg("Vui lòng dán nội dung đề thi hoặc tải lên file Word (.docx), PDF (.pdf) hoặc .txt trước khi tiếp tục.");
      return;
    }

    setErrorMsg(null);

    // Fast regex parsing (if user requested and plain text is available)
    if (forceRegex && !isPdfPlaceholder && rawText.trim()) {
      const parsed = parseRawExamText(rawText);
      if (parsed.length === 0) {
        setErrorMsg("Không bóc tách được câu hỏi nào bằng bộ phân tích nhanh. Bạn vui lòng sử dụng nút 'Bóc tách thông minh bằng AI'.");
        return;
      }
      setQuestions(parsed);

      // Auto-detect duration from raw text
      const autoDur = detectExamDurationFromText(rawText);
      if (autoDur && !userModifiedDuration.current) {
        setDuration(autoDur);
        setDurationInput(String(autoDur));
        setIsUnlimitedTime(false);
        setDetectedDurationSource(`Tự động nhận diện từ đề thi: ${autoDur} phút`);
      } else if (!userModifiedDuration.current && !isUnlimitedTime) {
        const suggested = suggestDurationByQuestionCount(parsed.length);
        setDuration(suggested);
        setDurationInput(String(suggested));
      }

      setStep('preview_edit');
      return;
    }

    // AI Smart Parser
    setIsParsingAI(true);
    try {
      const parsedRes = await parseExamWithAI({
        rawText: isPdfPlaceholder ? undefined : rawText,
        fileData: uploadedFile?.data,
        fileName: uploadedFile?.name,
        fileType: uploadedFile?.type
      });

      let parsedQuestions = parsedRes.questions || (Array.isArray(parsedRes) ? parsedRes : []);

      // Tự động cắt và nhúng ảnh/BBT vào câu hỏi nếu có file gốc tải lên
      if (uploadedFile?.data && parsedQuestions && parsedQuestions.length > 0) {
        try {
          parsedQuestions = await attachCroppedFiguresToQuestions(parsedQuestions, uploadedFile.data);
        } catch (cropErr) {
          console.warn("Lỗi tự động crop hình ảnh cho câu hỏi đề thi:", cropErr);
        }
      }

      if (!parsedQuestions || parsedQuestions.length === 0) {
        // Fallback to local regex parser if rawText exists
        if (!isPdfPlaceholder && rawText.trim()) {
          const fallbackParsed = parseRawExamText(rawText);
          if (fallbackParsed.length > 0) {
            setQuestions(fallbackParsed);
            const autoDur = detectExamDurationFromText(rawText);
            if (autoDur && !userModifiedDuration.current) {
              setDuration(autoDur);
              setDurationInput(String(autoDur));
              setIsUnlimitedTime(false);
              setDetectedDurationSource(`Tự động nhận diện từ đề thi: ${autoDur} phút`);
            } else if (!userModifiedDuration.current && !isUnlimitedTime) {
              const suggested = suggestDurationByQuestionCount(fallbackParsed.length);
              setDuration(suggested);
              setDurationInput(String(suggested));
            }
            setStep('preview_edit');
            return;
          }
        }
        throw new Error("Không nhận diện được câu hỏi trắc nghiệm nào từ tài liệu. Vui lòng kiểm tra lại nội dung đề thi.");
      }

      setQuestions(parsedQuestions);

      // 1. Tự động nhận diện thời gian làm bài từ phản hồi của máy chủ hoặc regex
      if (parsedRes.detectedDuration && !userModifiedDuration.current) {
        setDuration(parsedRes.detectedDuration);
        setDurationInput(String(parsedRes.detectedDuration));
        setIsUnlimitedTime(false);
        setDetectedDurationSource(`Tự động nhận diện từ file đề thi: ${parsedRes.detectedDuration} phút`);
      } else if (!userModifiedDuration.current && !isUnlimitedTime) {
        const textToScan = rawText && !isPdfPlaceholder ? rawText : '';
        const autoDur = detectExamDurationFromText(textToScan);
        if (autoDur) {
          setDuration(autoDur);
          setDurationInput(String(autoDur));
          setIsUnlimitedTime(false);
          setDetectedDurationSource(`Tự động nhận diện từ đề thi: ${autoDur} phút`);
        } else {
          // Gợi ý thông minh theo số lượng câu hỏi thực tế
          const suggested = suggestDurationByQuestionCount(parsedQuestions.length);
          setDuration(suggested);
          setDurationInput(String(suggested));
        }
      }

      // 2. Nhận diện tiêu đề nếu AI phát hiện
      if (parsedRes.detectedTitle && (!examTitle || examTitle === "Đề kiểm tra trắc nghiệm online")) {
        setExamTitle(parsedRes.detectedTitle);
      }

      setStep('preview_edit');
    } catch (err: any) {
      console.warn("AI parsing error:", err);
      // Fallback if plain text exists
      if (!isPdfPlaceholder && rawText.trim()) {
        const fallbackParsed = parseRawExamText(rawText);
        if (fallbackParsed.length > 0) {
          setQuestions(fallbackParsed);
          const autoDur = detectExamDurationFromText(rawText);
          if (autoDur && !userModifiedDuration.current) {
            setDuration(autoDur);
            setDurationInput(String(autoDur));
            setIsUnlimitedTime(false);
            setDetectedDurationSource(`Tự động nhận diện từ đề thi: ${autoDur} phút`);
          } else if (!userModifiedDuration.current && !isUnlimitedTime) {
            const suggested = suggestDurationByQuestionCount(fallbackParsed.length);
            setDuration(suggested);
            setDurationInput(String(suggested));
          }
          setStep('preview_edit');
          return;
        }
      }
      setErrorMsg(err.message || "Lỗi trong quá trình bóc tách bằng AI. Vui lòng thử lại hoặc dán trực tiếp nội dung văn bản.");
    } finally {
      setIsParsingAI(false);
    }
  };

  // Handle image upload from file for editing question
  const handleQuestionImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Vui lòng chọn một tệp hình ảnh (.png, .jpg, .jpeg, .webp, .svg)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        setEditingQuestion(prev => prev ? { ...prev, imageUrl: base64, hasFigure: true } : null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Ctrl+V paste image
  const handlePasteImage = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleQuestionImageUpload(file);
          break;
        }
      }
    }
  };

  // Start editing a specific question by ID
  const startEditQuestion = (qId: string | number) => {
    setEditingId(qId);
    const target = questions.find(q => q.id === qId);
    if (target) {
      setEditingQuestion({
        ...target,
        options: target.options ? [...target.options] : ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
        tfStatements: target.tfStatements ? target.tfStatements.map(s => ({ ...s })) : [
          { statement: "Ý a", correct: true },
          { statement: "Ý b", correct: false },
          { statement: "Ý c", correct: true },
          { statement: "Ý d", correct: false }
        ]
      });
    }
  };

  // Direct upload for a question (from "+ Thêm ảnh đồ thị cho câu này" button)
  const handleDirectUploadForQuestion = (qId: string | number, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Vui lòng chọn một tệp hình ảnh (.png, .jpg, .jpeg, .webp, .svg)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        setQuestions(prev => prev.map(item => item.id === qId ? { ...item, imageUrl: base64, hasFigure: true } : item));
        if (editingId === qId) {
          setEditingQuestion(prev => prev ? { ...prev, imageUrl: base64, hasFigure: true } : null);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Direct paste for a question outside edit mode
  const handleDirectPasteForQuestion = (qId: string | number, e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleDirectUploadForQuestion(qId, file);
          break;
        }
      }
    }
  };

  // Save edited question
  const saveEditedQuestion = () => {
    if (editingId === null || !editingQuestion) return;

    setQuestions(prev => prev.map(q => q.id === editingId ? {
      ...editingQuestion,
      options: editingQuestion.options || ["Phương án A", "Phương án B", "Phương án C", "Phương án D"]
    } : q));
    setEditingId(null);
    setEditingQuestion(null);
  };

  // Cancel editing
  const cancelEditQuestion = () => {
    setEditingId(null);
    setEditingQuestion(null);
  };

  // Delete question
  const deleteQuestion = (qId: string | number, index: number) => {
    if (confirm(`Bạn có chắc chắn muốn xóa Câu ${index + 1}?`)) {
      const updated = questions.filter(q => q.id !== qId);
      // Re-number IDs
      const renumbered = updated.map((q, i) => ({ ...q, id: i + 1 }));
      setQuestions(renumbered);
      if (editingId === qId) {
        setEditingId(null);
        setEditingQuestion(null);
      }
    }
  };

  // Add new blank question
  const addNewQuestion = () => {
    const newId = questions.length > 0 ? Math.max(...questions.map(q => Number(q.id) || 0)) + 1 : 1;
    const newQ: ParsedQuestion = {
      id: newId,
      section: 1,
      type: "mc",
      level: "Thông hiểu",
      content: "Nhập nội dung câu hỏi mới (ví dụ: Tìm tập xác định của hàm số $y = \\frac{1}{x-1}$)...",
      options: [
        "$D = \\mathbb{R} \\setminus \\{1\\}$",
        "$D = (1; +\\infty)$",
        "$D = \\mathbb{R}$",
        "$D = [1; +\\infty)$"
      ],
      correctOptionIndex: 0,
      correctAnswer: "A",
      explanation: "Điều kiện xác định: $x - 1 \\ne 0 \\Leftrightarrow x \\ne 1$."
    };

    const updated = [...questions, newQ];
    setQuestions(updated);
    // Start editing the newly added question immediately
    setEditingId(newId);
    setEditingQuestion(newQ);
  };

  // Generate Online Link & QR Code (Step 3)
  const handleCreateOnlineExam = async () => {
    if (questions.length === 0) {
      setErrorMsg("Bộ đề chưa có câu hỏi nào. Vui lòng thêm câu hỏi trước khi tạo link.");
      return;
    }

    setIsSharing(true);
    setErrorMsg(null);

    try {
      // 1. Generate 6-char PIN
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // 2. Format payload compatible with StudentExamView
      const finalDuration = isUnlimitedTime ? 0 : (parseInt(String(duration), 10) || 0);
      const finalTitle = examTitle || formatExamTitle(examType, subject, String(grade));

      const payload = {
        examData: {
          examName: finalTitle,
          examType: examType,
          subject: subject,
          grade: grade,
          duration: finalDuration,
          examDuration: finalDuration,
          isUnlimitedTime: isUnlimitedTime || finalDuration === 0,
          createdAt: new Date().toISOString()
        },
        examType: examType,
        duration: finalDuration,
        examDuration: finalDuration,
        isUnlimitedTime: isUnlimitedTime || finalDuration === 0,
        codes: [
          {
            code: "101",
            questions: questions.map((q, i) => ({
              id: i + 1,
              type: q.type || 'mc',
              level: q.level || 'Thông hiểu',
              content: sanitizeExamQuestion(q.content),
              options: (q.options || ["Phương án A", "Phương án B", "Phương án C", "Phương án D"]).map((opt: string) => sanitizeExamQuestion(opt)),
              correctOptionIndex: q.correctOptionIndex ?? 0,
              correctAnswer: q.correctAnswer ? sanitizeExamQuestion(q.correctAnswer) : q.correctAnswer,
              tfStatements: q.tfStatements ? q.tfStatements.map((tf: any) => ({
                ...tf,
                statement: sanitizeExamQuestion(tf.statement || '')
              })) : undefined,
              explanation: q.explanation ? sanitizeExamQuestion(q.explanation) : '',
              imageUrl: q.imageUrl,
              hasFigure: q.hasFigure
            }))
          }
        ]
      };

      let examId = code;

      // 3. Save to backend API
      try {
        const shareRes = await apiFetch('/api/exams/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, customId: code })
        });
        if (shareRes.ok) {
          const shareJson = await shareRes.json();
          if (shareJson.examId) examId = shareJson.examId;
        }
      } catch (e) {
        console.warn("Backend share notice:", e);
      }

      // 4. Save to distributed cloud KV store + localStorage
      await saveExamToCloud(examId, payload);

      // 5. Build clean direct link and fallback hash
      const cleanPinUrl = `${window.location.origin}/?pin=${examId}`;
      let finalUrl = cleanPinUrl;
      try {
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
        // Only append hash if reasonably sized (< 1800 chars) to prevent chat apps truncating the URL
        if (compressed && compressed.length < 1800) {
          finalUrl = `${cleanPinUrl}#d=${compressed}`;
        }
      } catch (compErr) {
        console.warn("Compression warning:", compErr);
      }

      setSharePin(examId);
      setShareLink(finalUrl);

      // 6. Generate QR Code safely using cleanPinUrl (short ~40 chars, perfectly sized for QR codes)
      try {
        const qrData = await QRCode.toDataURL(cleanPinUrl, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(qrData);
      } catch (qrErr: any) {
        console.warn("QR code generation warning:", qrErr);
        // Fallback: Use free QR API
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(cleanPinUrl)}`);
      }

      setStep('share_popup');
    } catch (err: any) {
      console.error("Lỗi tạo link:", err);
      setErrorMsg("Không thể tạo link làm bài: " + (err.message || ""));
    } finally {
      setIsSharing(false);
    }
  };

  // Copy link handler
  const handleCopyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Tải đề của giáo viên lên & Tạo link làm online
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Bóc tách đề Word/Text, hiệu đính công thức toán và sinh mã QR làm bài trực tuyến
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs Indicator */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-2 sm:gap-6">
            <button
              onClick={() => setStep('input')}
              className={`flex items-center gap-1.5 py-1 px-2.5 rounded-md transition-colors ${
                step === 'input' 
                  ? 'bg-white text-indigo-700 font-bold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">1</span>
              <span>1. Tải đề / Dán văn bản</span>
            </button>

            <span className="text-slate-300">→</span>

            <button
              onClick={() => {
                if (questions.length > 0) setStep('preview_edit');
                else handleParseExam();
              }}
              className={`flex items-center gap-1.5 py-1 px-2.5 rounded-md transition-colors ${
                step === 'preview_edit' 
                  ? 'bg-white text-indigo-700 font-bold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">2</span>
              <span>2. Hiệu đính câu hỏi ({questions.length})</span>
            </button>

            <span className="text-slate-300">→</span>

            <button
              onClick={() => {
                if (shareLink) setStep('share_popup');
              }}
              disabled={!shareLink}
              className={`flex items-center gap-1.5 py-1 px-2.5 rounded-md transition-colors ${
                step === 'share_popup' 
                  ? 'bg-white text-emerald-700 font-bold shadow-xs' 
                  : 'text-slate-400 disabled:opacity-50'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">3</span>
              <span>3. Link & Mã QR</span>
            </button>
          </div>

          {step === 'preview_edit' && (
            <button
              onClick={handleCreateOnlineExam}
              disabled={isSharing || questions.length === 0}
              className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              {isSharing ? "Đang xử lý..." : "Tạo Link Làm Online"}
            </button>
          )}
        </div>

        {/* Error notice */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ================= STEP 1: INPUT ================= */}
          {step === 'input' && (
            <div className="space-y-6">
              {/* Exam Info Card */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tên đề thi / Bài kiểm tra</label>
                    <input
                      type="text"
                      value={examTitle}
                      onChange={e => setExamTitle(e.target.value)}
                      placeholder="VD: Kiểm tra 1 tiết Đại số 10..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Loại đề</label>
                    <select
                      value={examType}
                      onChange={e => handleExamTypeChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                    >
                      {STANDARDIZED_EXAM_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Môn học</label>
                    <select
                      value={subject}
                      onChange={e => {
                        const newSub = e.target.value;
                        setSubject(newSub);
                        if (!examTitle || examTitle === "Đề kiểm tra trắc nghiệm online" || examTitle.startsWith("ĐỀ ")) {
                          setExamTitle(formatExamTitle(examType, newSub, String(grade)));
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                    >
                      {GDPT_2018_SUBJECTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Thời gian làm bài Controller */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Thời gian làm bài:</span>
                      </div>

                      {detectedDurationSource && (
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in duration-200">
                          <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                          {detectedDurationSource}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        userModifiedDuration.current = true;
                        const nextState = !isUnlimitedTime;
                        setIsUnlimitedTime(nextState);
                        if (nextState) {
                          setDetectedDurationSource(null);
                        } else if (!duration || duration === 0) {
                          setDuration(45);
                          setDurationInput("45");
                        }
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${
                        isUnlimitedTime 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isUnlimitedTime ? "✓ Đang chọn: Không giới hạn" : "Chọn: Không giới hạn thời gian"}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={600}
                        disabled={isUnlimitedTime}
                        value={isUnlimitedTime ? "" : durationInput}
                        placeholder={isUnlimitedTime ? "∞" : "45"}
                        onChange={e => {
                          userModifiedDuration.current = true;
                          setDurationInput(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) {
                            setDuration(val);
                          }
                        }}
                        className={`w-28 px-3 py-2 bg-white border rounded-lg text-slate-800 text-sm font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-2xs ${
                          isUnlimitedTime ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300'
                        }`}
                      />
                      <span className="text-xs text-slate-600 font-semibold">phút</span>
                    </div>

                    {/* Quick selection chips */}
                    {!isUnlimitedTime && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Gợi ý nhanh:</span>
                        {[15, 30, 45, 50, 60, 90, 120].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              userModifiedDuration.current = true;
                              setDuration(mins);
                              setDurationInput(String(mins));
                              setIsUnlimitedTime(false);
                            }}
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors border ${
                              duration === mins && !isUnlimitedTime
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {mins}p
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Cách 1: Tải tệp đề thi (.docx, .pdf hoặc .txt)</span>
                  {fileName && (
                    <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Đã chọn: {fileName}
                    </span>
                  )}
                </label>
                
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".docx,.pdf,.txt"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">
                    {isReadingFile ? "Đang tải và xử lý tệp..." : "Nhấn để chọn file Word (.docx), PDF (.pdf) hoặc Text (.txt) từ máy tính"}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md">
                    Hỗ trợ tự động đọc và nhận diện thông minh tiêu đề, thời gian làm bài, các câu hỏi và công thức Toán LaTeX.
                  </p>
                </div>

                {/* Friendly note */}
                <div className="mt-2.5 text-xs text-indigo-800 bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    Hệ thống tự động phát hiện số phút làm bài trong phần đầu đề thi (VD: <em>"Thời gian làm bài : 90 Phút"</em>) và tự động cập nhật vào ô thời gian. Bạn có thể tự do gõ sửa số phút theo ý muốn.
                  </span>
                </div>
              </div>

              {/* Direct Paste Textarea */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-800">
                    Cách 2: Hoặc dán trực tiếp đề thi vào khung dưới đây
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRawText(SAMPLE_EXAM_TEXT);
                      setExamTitle("Đề ôn tập giữa kì Toán 12 (Mẫu)");
                      setErrorMsg(null);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Dán đề mẫu thử nghiệm
                  </button>
                </div>

                <textarea
                  rows={9}
                  value={rawText}
                  onChange={e => {
                    const newText = e.target.value;
                    setRawText(newText);
                    if (!userModifiedDuration.current && newText.length > 20) {
                      const autoDur = detectExamDurationFromText(newText);
                      if (autoDur) {
                        setDuration(autoDur);
                        setDurationInput(String(autoDur));
                        setIsUnlimitedTime(false);
                        setDetectedDurationSource(`Tự động nhận diện từ văn bản: ${autoDur} phút`);
                      }
                    }
                  }}
                  placeholder={`Dán đề thi của bạn vào đây...\nVí dụ:\nĐỀ KIỂM TRA ĐẠI SỐ 10 - THỜI GIAN LÀM BÀI: 45 PHÚT\nCâu 1: Giải phương trình $2x + 1 = 5$.\nA. $x = 1$\nB. $x = 2$\nC. $x = 3$\nD. $x = 4$\nĐáp án: B\nLời giải: Ta có $2x = 4 \\Leftrightarrow x = 2$.`}
                  className="w-full p-4 border border-slate-300 rounded-xl font-mono text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
                />
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  Các công thức toán học đặt trong cặp dấu đô la $...$ hoặc $$...$$ sẽ được tự động nhận diện và hiển thị chuẩn LaTeX.
                </p>
              </div>

              {/* Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isParsingAI || isReadingFile}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  Đóng
                </button>
                
                <div className="flex items-center gap-2.5">
                  {rawText.trim() && !rawText.startsWith('[Tệp PDF:') && (
                    <button
                      type="button"
                      disabled={isParsingAI || isReadingFile}
                      onClick={() => handleParseExam(true)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors disabled:opacity-50 border border-slate-300"
                      title="Bóc tách nhanh trực tiếp không qua AI"
                    >
                      Bóc tách nhanh (Regex)
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isParsingAI || isReadingFile}
                    onClick={() => handleParseExam(false)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isParsingAI ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang AI bóc tách thông minh...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Bóc tách thông minh bằng AI & Chuyển sang chỉnh sửa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: PREVIEW & EDIT ================= */}
          {step === 'preview_edit' && (
            <div className="space-y-6">
              
              {/* Top toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-100">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm font-semibold text-indigo-900">
                    Đã bóc tách thành công <span className="font-bold text-indigo-700 text-base">{questions.length}</span> câu hỏi
                  </div>

                  {/* Inline Duration Adjuster */}
                  <div className="flex items-center gap-2 bg-white/90 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-slate-600 font-medium">Thời gian:</span>
                    {isUnlimitedTime ? (
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">Không giới hạn</span>
                    ) : (
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <input
                          type="number"
                          min={1}
                          max={600}
                          value={durationInput}
                          onChange={e => {
                            userModifiedDuration.current = true;
                            setDurationInput(e.target.value);
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val > 0) {
                              setDuration(val);
                            }
                          }}
                          className="w-14 px-1 py-0.5 border border-slate-300 rounded text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span>phút</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        userModifiedDuration.current = true;
                        const next = !isUnlimitedTime;
                        setIsUnlimitedTime(next);
                        if (!next && (!duration || duration === 0)) {
                          setDuration(45);
                          setDurationInput("45");
                        }
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 underline ml-1"
                    >
                      {isUnlimitedTime ? "Đổi sang có hạn giờ" : "Không giới hạn"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={addNewQuestion}
                    className="py-1.5 px-3 bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Thêm câu hỏi mới
                  </button>

                  <button
                    onClick={handleCreateOnlineExam}
                    disabled={isSharing || questions.length === 0}
                    className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    {isSharing ? "Đang tạo link..." : "Tạo Link Làm Online"}
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-8">
                {[1, 2, 3, 4].map(section => {
                  const sectionQuestions = questions.filter(q => q.section === section);
                  if (sectionQuestions.length === 0) return null;
                  return (
                    <div key={section} className="space-y-4">
                      <h3 className="font-bold text-base text-indigo-900 border-b-2 border-indigo-200 pb-1 pt-4">
                        {section === 1 ? 'PHẦN I: Trắc nghiệm nhiều phương án lựa chọn' : 
                         section === 2 ? 'PHẦN II: Trắc nghiệm Đúng / Sai' : 
                         section === 3 ? 'PHẦN III: Trắc nghiệm trả lời ngắn / Điền số' : 
                         'PHẦN IV: Tự luận'}
                      </h3>
                      {sectionQuestions.map((q, idx) => {
                        const isBeingEdited = editingId === q.id;

                        // NORMAL VIEW CARD
                        return (
                          <div
                            key={q.id || idx}
                            className={`bg-white border ${isBeingEdited ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'} rounded-xl p-4 sm:p-5 shadow-xs hover:border-indigo-300 transition-all space-y-3`}
                          >
                              {/* Header of question card */}
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-bold text-xs rounded-md">
                                    Câu {idx + 1}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingId(q.id);
                                      const target = questions.find(item => item.id === q.id);
                                      if (target) {
                                        setEditingQuestion(target);
                                        setIsQuestionEditModalOpen(true);
                                      }
                                    }}
                                    className="px-2.5 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Chỉnh sửa câu hỏi này"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" /> Sửa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteQuestion(q.id, idx)}
                                    className="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Xóa câu hỏi này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                                  </button>
                                </div>
                              </div>

                              {/* Question Stem Content */}
                              <div className="text-sm text-slate-800 font-medium">
                                <MarkdownRenderer content={formatMathContent(q.content)} />
                              </div>

                              {/* HIỂN THỊ ĐỒ THỊ / HÌNH VẼ CHO CÂU HỎI */}
                              {q.imageUrl ? (
                                <div className="flex flex-col items-center justify-center my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                  <img
                                    src={q.imageUrl}
                                    alt={`Hình minh họa / Đồ thị câu ${idx + 1}`}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="max-h-64 max-w-full object-contain rounded-lg border border-slate-200 bg-white shadow-2xs"
                                  />
                                  <span className="text-[11px] text-slate-500 mt-1.5 italic font-medium">
                                    Hình minh họa / Đồ thị câu {idx + 1}
                                  </span>
                                </div>
                              ) : (
                                /hình vẽ|hình bên|đồ thị/i.test(q.content || '') && (
                                  <div
                                    tabIndex={0}
                                    onPaste={(e) => handleDirectPasteForQuestion(q.id, e)}
                                    className="my-3 p-3 border-2 border-dashed border-amber-300 bg-amber-50/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 transition-colors focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Image className="w-5 h-5 text-amber-600 shrink-0" />
                                      <div>
                                        <p className="font-semibold text-amber-900">
                                          Câu hỏi có nhắc đến <em>hình vẽ / hình bên / đồ thị</em> nhưng chưa đính kèm ảnh.
                                        </p>
                                        <p className="text-[11px] text-amber-700">
                                          Bấm nút bên phải để tải ảnh lên hoặc nhấp vào đây và nhấn <strong>Ctrl + V</strong> để dán ảnh chụp màn hình nhanh.
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <input
                                        type="file"
                                        id={`figure-upload-${q.id || idx}`}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleDirectUploadForQuestion(q.id, file);
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          document.getElementById(`figure-upload-${q.id || idx}`)?.click();
                                        }}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                      >
                                        <ImagePlus className="w-3.5 h-3.5" /> + Thêm ảnh đồ thị
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}
                              {/* Options A, B, C, D (for Multiple Choice) */}
                              {(q.type === 'mc' || (q.type as string) === 'MULTIPLE_CHOICE' || (!q.type && q.options)) && q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                  {q.options.map((opt, optIdx) => {
                                    const isCorrect = q.correctOptionIndex === optIdx;
                                    const label = String.fromCharCode(65 + optIdx);
                                    return (
                                      <div
                                        key={optIdx}
                                        className={`p-2.5 rounded-lg border text-xs sm:text-sm flex items-start gap-2 ${
                                          isCorrect 
                                            ? 'bg-emerald-50/80 border-emerald-400 text-emerald-900 font-semibold shadow-2xs' 
                                            : 'bg-slate-50 border-slate-200 text-slate-700'
                                        }`}
                                      >
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                          {label}
                                        </span>
                                        <div className="flex-1">
                                          <MarkdownRenderer content={formatMathContent(opt)} />
                                        </div>
                                        {isCorrect && (
                                          <span className="text-emerald-600 shrink-0 font-bold text-xs flex items-center gap-0.5">
                                            <CheckCircle2 className="w-4 h-4" /> Đúng
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* True / False Statements (for Part II) */}
                              {(q.type === 'tf' || (q.type as string) === 'TRUE_FALSE') && q.tfStatements && q.tfStatements.length > 0 && (
                                <div className="space-y-2 pt-1">
                                  {q.tfStatements.map((stmt, sIdx) => {
                                    const isTrue = stmt.correct === true;
                                    const subLabel = ['a)', 'b)', 'c)', 'd)'][sIdx] || `${String.fromCharCode(97 + sIdx)})`;
                                    return (
                                      <div
                                        key={sIdx}
                                        className={`p-2.5 rounded-lg border text-xs sm:text-sm flex items-center justify-between gap-3 ${
                                          isTrue ? 'bg-emerald-50/70 border-emerald-300' : 'bg-rose-50/70 border-rose-300'
                                        }`}
                                      >
                                        <div className="flex items-start gap-2 flex-1">
                                          <span className="font-bold text-slate-700 shrink-0">{subLabel}</span>
                                          <div className="flex-1 text-slate-800">
                                            <MarkdownRenderer content={formatMathContent(stmt.statement)} />
                                          </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${
                                          isTrue ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                        }`}>
                                          {isTrue ? 'Đúng' : 'Sai'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      
                      {/* Bottom Add Question Button */}
                      <button
                        type="button"
                        onClick={addNewQuestion}
                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-semibold text-sm hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Thêm câu hỏi mới
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Nav */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại nhập đề
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSimilarModal(true)}
                    disabled={questions.length === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    title="Tạo 4 Đề Phát Triển Tương Tự từ đề vừa bóc tách & Tải File Word"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Tạo 4 Đề Tương Tự (.docx)
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateOnlineExam}
                    disabled={isSharing || questions.length === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    {isSharing ? "Đang lưu và tạo mã QR..." : "Tạo Link Làm Online"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SHARE POPUP ================= */}
          {step === 'share_popup' && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              
              {/* Success Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-emerald-950">
                  Tạo Link Làm Bài Trực Tuyến Thành Công!
                </h3>
                <p className="text-sm text-emerald-800">
                  Đề thi <strong>"{examTitle}"</strong> ({questions.length} câu - {isUnlimitedTime ? "Không giới hạn thời gian" : `${duration} phút`}) đã sẵn sàng.
                </p>
              </div>

              {/* PIN Code Box */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold">Mã phòng thi (PIN):</span>
                  <span className="text-2xl font-mono font-black text-indigo-700 tracking-widest">{sharePin}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sharePin);
                    alert(`Đã sao chép mã PIN: ${sharePin}`);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Sao chép PIN
                </button>
              </div>

              {/* Direct Link Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Đường link làm bài trực tiếp cho học sinh:</span>
                  {copied && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                      <Check className="w-3.5 h-3.5" /> Đã sao chép vào bộ nhớ tạm!
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 select-all outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                  >
                    <Copy className="w-4 h-4" /> Sao chép Link
                  </button>
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm flex items-center gap-1.5 shrink-0 transition-colors"
                    title="Mở làm bài thử trên giao diện học sinh"
                  >
                    <ExternalLink className="w-4 h-4" /> Làm thử
                  </a>
                </div>
              </div>

              {/* QR Code Section */}
              {qrCodeUrl && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <img
                      src={qrCodeUrl}
                      alt="Mã QR phòng thi"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                  <div className="space-y-3 text-center sm:text-left">
                    <h4 className="font-bold text-slate-800 text-base flex items-center justify-center sm:justify-start gap-1.5">
                      <QrCode className="w-5 h-5 text-indigo-600" />
                      Mã QR quét trên điện thoại
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Học sinh có thể dùng Camera điện thoại hoặc Zalo để quét mã và làm bài ngay lập tức mà không cần gõ link.
                    </p>
                    <a
                      href={qrCodeUrl}
                      download={`QR_${sharePin || 'DeThi'}.png`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs shadow-2xs transition-colors"
                    >
                      <Download className="w-4 h-4" /> Tải ảnh mã QR về máy
                    </a>
                  </div>
                </div>
              )}

              {/* Bottom Dialog buttons */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('preview_edit')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Tiếp tục chỉnh sửa câu hỏi
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  Hoàn tất
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

      {showSimilarModal && (
        <SimilarExamsModal
          isOpen={showSimilarModal}
          onClose={() => setShowSimilarModal(false)}
          initialQuestions={questions}
          initialExamName={examTitle || "ĐỀ KIỂM TRA"}
          subject={subject}
          grade={grade}
        />
      )}

      {editingQuestion && (
        <QuestionEditModal
          isOpen={!!editingQuestion}
          question={editingQuestion as any}
          questionNumber={questions.findIndex(q => q.id === editingId) + 1}
          subject={subject}
          grade={grade}
          onClose={() => setEditingQuestion(null)}
          onSave={(updated) => {
            const newQuestions = questions.map(q => q.id === editingId ? { ...q, ...updated } : q);
            setQuestions(newQuestions);
            setEditingQuestion(null);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

