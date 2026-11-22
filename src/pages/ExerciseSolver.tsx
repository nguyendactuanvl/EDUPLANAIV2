import { apiFetch, API_KEY_STORAGE } from '../lib/apiFetch';
import { exportHtmlToWord } from '../lib/exportUtils';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Copy, Save, Upload, X, Sparkles, Loader2, Download, Presentation, 
  ChevronLeft, ChevronRight, Maximize2, FileText, BookmarkPlus, Camera, 
  Image as ImageIcon, Send, ArrowLeft, Crop, CheckCircle2, ImagePlus, 
  Clipboard, Eye, EyeOff, RefreshCw, Trash2, Scissors, Calculator, Wand2,
  ShieldCheck, AlertTriangle, XCircle, Check, Globe, BookOpen, ArrowLeftRight, Table as TableIcon, LayoutGrid, Compass, Lightbulb, HelpCircle
} from 'lucide-react';

import { MarkdownRenderer, fixMath } from "../components/MarkdownRenderer";
import { MathView } from "../components/MathView";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ApiErrorBanner } from "../components/ApiErrorBanner";
import { ImageCropperModal } from "../components/ImageCropperModal";
import { GeoGebraDrawer } from "../components/math-tools/GeoGebraDrawer";
import { ScientificCalculatorModal } from "../components/math-tools/ScientificCalculatorModal";
import { run1ClickMathFix } from "../components/math-tools/MathFormulaFixer";

import { getPdfTotalPages, renderPdfPageWithFigures, PdfDetectedFigure } from "../lib/pdfUtils";
import { enrichExerciseSolutionWithOriginalFigures, resolveCropFigMarkers } from "../lib/figureExtraction";
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';

import mammoth from 'mammoth';
import { printElement } from '../lib/print';
import { saveToHistory, getHistory } from '../lib/history';
import { parseApiResponse, safeJsonParse } from '../lib/utils';
import { HistoryItem } from '../types';
import { FeatureQuickGuideBanner } from '../components/FeatureQuickGuideBanner';
import {
  CORE_MATH_TERMINOLOGY,
  extractMatchedMathTerms,
  exportMathTerminologyToDocx,
  formatTerminologyMarkdownTable,
  MathTermEntry,
} from '../lib/mathTerminology';

const cleanBase64String = (str: string): string => {
  if (!str) return '';
  if (str.includes(',')) {
    return str.split(',')[1] || str;
  }
  return str.trim();
};

// Utility to convert file to base64, with client-side optimization for large images
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If it's an image and larger than 700KB, optimize it before uploading
    if (file.type.startsWith('image/') && file.size > 700 * 1024) {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = reject;
      img.onload = () => {
        try {
          const maxDim = 1800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(mime, 0.92);
            resolve(cleanBase64String(dataUrl));
            return;
          }
        } catch (canvasErr) {
          console.warn('Canvas optimization fallback:', canvasErr);
        }
        const raw = (reader.result as string) || '';
        resolve(cleanBase64String(raw));
      };
      img.onerror = () => {
        const fallbackReader = new FileReader();
        fallbackReader.onload = () => resolve(cleanBase64String((fallbackReader.result as string) || ''));
        fallbackReader.onerror = reject;
        fallbackReader.readAsDataURL(file);
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(cleanBase64String((reader.result as string) || ''));
    reader.onerror = error => reject(error);
  });
};

// Helper to inject cropped image into problem stem and solution cleanly
export const injectCroppedImageIntoSolution = (rawSolution: string, imgDataUrl: string, inSolution: boolean = true): string => {
  if (!rawSolution || !imgDataUrl) return rawSolution;
  let cleanUrl = imgDataUrl.trim().replace(/[\r\n]+/g, '');
  if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:') && !cleanUrl.startsWith('/')) {
    cleanUrl = `data:image/png;base64,${cleanUrl}`;
  }

  let text = rawSolution;
  const imgTag = `\n\n<img src="${cleanUrl}" alt="Hình vẽ / Đồ thị bài toán" class="max-w-[480px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm" />\n\n`;

  // Remove existing auto-injected images and broken markdown image tags to avoid duplicates
  text = text.replace(/!\[(?:Hình vẽ \/ Đồ thị bài toán|Đồ thị \/ Hình vẽ minh họa lời giải|Hình minh họa đề bài|cropped_figure|Hình vẽ minh họa|Problem figure \/ graph)[^\]]*\]\([^\)]*\)/gi, '');
  text = text.replace(/<img[^>]*alt=["'](?:Hình vẽ \/ Đồ thị bài toán|Đồ thị \/ Hình vẽ minh họa lời giải|Hình minh họa đề bài|cropped_figure|Problem figure \/ graph)[^>]*\/?>\s*/gi, '');

  // 1. Inject into Đề bài / Problem Statement
  if (/\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]/.test(text)) {
    text = text.replace(/\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]/g, imgTag);
  } else if (/##\s*(?:Đề bài|Đề thi|Câu hỏi|Problem(?:\s+Statement)?|Question(?:s)?|Exercise)/i.test(text)) {
    text = text.replace(
      /(##\s*(?:Đề bài|Đề thi|Câu hỏi|Problem(?:\s+Statement)?|Question(?:s)?|Exercise)[^\n]*\n)([\s\S]*?)(?=\n##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution(?:s)?|Answer(?:s)?)|$)/i,
      (_m, h2, body) => {
        return `${h2}${body.trim()}${imgTag}`;
      }
    );
  } else {
    text = `${imgTag}${text}`;
  }

  // 2. Inject into Lời giải chi tiết / Detailed Solution
  if (inSolution) {
    if (/\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/.test(text)) {
      text = text.replace(/\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/g, imgTag);
    } else if (/##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution(?:s)?|Answer(?:s)?)/i.test(text)) {
      const solIdx = text.search(/##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution(?:s)?|Answer(?:s)?)/i);
      const solPart = text.slice(solIdx);
      if (!solPart.includes(cleanUrl)) {
        text = text.replace(/(##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution(?:s)?|Answer(?:s)?)[^\n]*\n)/i, `$1${imgTag}`);
      }
    }
  } else {
    // If turned off in solution, remove any remaining placeholders in solution
    text = text.replace(/\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/g, '');
  }

  return text;
};

export function ExerciseSolver() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [showGeoGebra, setShowGeoGebra] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [solveLanguage, setSolveLanguage] = useState<'vi' | 'en'>('vi');
  const [showTextInput, setShowTextInput] = useState(false);
  const [pastedProblemText, setPastedProblemText] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSimilar, setIsGeneratingSimilar] = useState(false);
  const [solution, setSolution] = useState<string>('');
  const [solutionByLang, setSolutionByLang] = useState<{ vi?: string; en?: string }>({});
  const [isTranslatingSolution, setIsTranslatingSolution] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [aiTerminology, setAiTerminology] = useState<MathTermEntry[]>([]);
  const [showTerminologyPanel, setShowTerminologyPanel] = useState(false);
  const [terminologyViewMode, setTerminologyViewMode] = useState<'table' | 'cards'>('table');
  const [termSearch, setTermSearch] = useState('');
  const [isExportingGlossaryDocx, setIsExportingGlossaryDocx] = useState(false);
  const [glossaryAppended, setGlossaryAppended] = useState(false);
  const [copiedGlossaryTable, setCopiedGlossaryTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // AI Verification state
  const [isVerifyingSolution, setIsVerifyingSolution] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    isCorrect: boolean;
    confidenceScore: number;
    summary: string;
    checks: { criterion: string; passed: boolean; detail: string }[];
    issues: { step: string; issue: string; correction: string }[];
    correctedSolution?: string;
  } | null>(null);
  const [hasAppliedCorrection, setHasAppliedCorrection] = useState(false);

  // Student Mistake Analysis & Progressive Scaffolding Hints state
  const [isAnalyzingMistakes, setIsAnalyzingMistakes] = useState(false);
  const [mistakeAnalysisError, setMistakeAnalysisError] = useState<string | null>(null);
  const [mistakeAnalysisResult, setMistakeAnalysisResult] = useState<{
    problemStatement: string;
    attemptDiagnosis: string;
    commonMistakes: {
      title: string;
      severity: 'high' | 'medium';
      wrongExample: string;
      whyWrong: string;
      howToAvoid: string;
    }[];
    nextStepHints: {
      stepNumber: number;
      title: string;
      guidingQuestion: string;
      hint: string;
      keyFormula: string;
      checkpoint: string;
    }[];
    finalNudge: string;
  } | null>(null);
  const [revealedHintCount, setRevealedHintCount] = useState<number>(1);
  const [studentAttemptText, setStudentAttemptText] = useState<string>('');
  const [mistakesAppended, setMistakesAppended] = useState(false);

  // Cropper and visual aids state
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperSourceImage, setCropperSourceImage] = useState<string>('');
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPdfPageIdx, setSelectedPdfPageIdx] = useState(0);
  const [isLoadingPdfPages, setIsLoadingPdfPages] = useState(false);
  const [showInBothQuestionAndAnswer, setShowInBothQuestionAndAnswer] = useState(true);

  useEffect(() => {
    setHistoryItems(getHistory().filter(item => item.type === 'GBT'));
  }, []);

  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperInputRef = useRef<HTMLInputElement>(null);
  const pdfPageImagesMapRef = useRef<Record<number, string>>({});
  const pdfPageFiguresMapRef = useRef<Record<number, PdfDetectedFigure[]>>({});
  const lastSourceFiguresRef = useRef<{
    pageImagesMap: Record<number, string>;
    pageDetectedFiguresMap: Record<number, PdfDetectedFigure[]>;
    docxImageMap: Record<string, string>;
  }>({ pageImagesMap: {}, pageDetectedFiguresMap: {}, docxImageMap: {} });

  // Process incoming file (image, PDF, docx, txt)
  const processIncomingFile = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setCroppedImage(null);
    setPdfPages([]);
    setSelectedPdfPageIdx(0);
    pdfPageImagesMapRef.current = {};
    pdfPageFiguresMapRef.current = {};

    if (file.type.startsWith('image/')) {
      try {
        const dataUrl = await fileToBase64(file);
        const fullDataUrl = `data:${file.type || 'image/png'};base64,${dataUrl}`;
        setCropperSourceImage(fullDataUrl);
      } catch (err) {
        console.error("Error reading image:", err);
      }
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setIsLoadingPdfPages(true);
      try {
        const buffer = await file.arrayBuffer();
        const total = await getPdfTotalPages(buffer.slice(0));
        const maxPages = Math.min(total, 12);
        const pages: string[] = [];
        const imgMap: Record<number, string> = {};
        const figMap: Record<number, PdfDetectedFigure[]> = {};
        for (let p = 1; p <= maxPages; p++) {
          try {
            const rendered = await renderPdfPageWithFigures(buffer.slice(0), p, 2.0);
            pages.push(rendered.dataUrl);
            imgMap[p] = rendered.dataUrl;
            figMap[p] = rendered.detectedFigures;
          } catch (pageErr) {
            console.warn(`Could not render PDF page ${p}:`, pageErr);
          }
        }
        pdfPageImagesMapRef.current = imgMap;
        pdfPageFiguresMapRef.current = figMap;
        setPdfPages(pages);
        if (pages.length > 0) {
          setCropperSourceImage(pages[0]);
          setSelectedPdfPageIdx(0);
        }
      } catch (err) {
        console.warn("Could not render PDF pages:", err);
      } finally {
        setIsLoadingPdfPages(false);
      }
    } else {
      setCropperSourceImage('');
    }
  };

  // Listen for paste anywhere on window (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            const file = new File([blob], `screenshot_${Date.now()}.png`, { type: blob.type });
            processIncomingFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleSelectPdfPage = (idx: number) => {
    setSelectedPdfPageIdx(idx);
    if (pdfPages[idx]) {
      setCropperSourceImage(pdfPages[idx]);
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setCroppedImage(croppedDataUrl);
    setIsCropperOpen(false);
    if (solution) {
      // Injects into both Đề bài and Lời giải chi tiết
      const updated = injectCroppedImageIntoSolution(solution, croppedDataUrl, showInBothQuestionAndAnswer);
      setSolution(updated);
      setSolutionByLang(prev => ({
        vi: prev.vi ? injectCroppedImageIntoSolution(prev.vi, croppedDataUrl, showInBothQuestionAndAnswer) : prev.vi,
        en: prev.en ? injectCroppedImageIntoSolution(prev.en, croppedDataUrl, showInBothQuestionAndAnswer) : prev.en,
      }));
    }
  };

  const handleToggleShowInAnswer = () => {
    const nextVal = !showInBothQuestionAndAnswer;
    setShowInBothQuestionAndAnswer(nextVal);
    if (solution && croppedImage) {
      const updated = injectCroppedImageIntoSolution(solution, croppedImage, nextVal);
      setSolution(updated);
      setSolutionByLang(prev => ({
        vi: prev.vi ? injectCroppedImageIntoSolution(prev.vi, croppedImage, nextVal) : prev.vi,
        en: prev.en ? injectCroppedImageIntoSolution(prev.en, croppedImage, nextVal) : prev.en,
      }));
    }
  };

  const handleRemoveCroppedImage = () => {
    setCroppedImage(null);
    const stripImg = (txt: string) =>
      txt.replace(/<img[^>]*alt=["'](?:Hình vẽ \/ Đồ thị bài toán|Đồ thị \/ Hình vẽ minh họa lời giải|Hình minh họa đề bài|cropped_figure|Problem figure \/ graph)[^>]*\/?>\s*/gi, '');
    if (solution) {
      setSolution(stripImg(solution));
      setSolutionByLang(prev => ({
        vi: prev.vi ? stripImg(prev.vi) : prev.vi,
        en: prev.en ? stripImg(prev.en) : prev.en,
      }));
    }
  };

  const startCamera = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Không thể truy cập camera. Vui lòng kiểm tra quyền hoặc kết nối.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            processIncomingFile(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processIncomingFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processIncomingFile(file);
    }
  };

  const processDocx = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        mammoth.extractRawText({arrayBuffer: arrayBuffer})
          .then(function(result){
            resolve(result.value);
          })
          .catch(function(err) {
            reject(err);
          });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const processDocxWithImages = async (
    file: File
  ): Promise<{ textWithPlaceholders: string; imageMap: Record<string, string> }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        mammoth.convertToHtml({ arrayBuffer })
          .then(function(result) {
            const imageMap: Record<string, string> = {};
            let imgCounter = 0;
            const htmlWithTokens = (result.value || '').replace(
              /<img\b[^>]*src=["'](data:image\/[^"']+)["'][^>]*>/gi,
              (_m, src) => {
                imgCounter += 1;
                const token = `[DOCX_IMG_${imgCounter}]`;
                imageMap[token] = src;
                return `\n\n${token}\n\n`;
              }
            );
            resolve({ textWithPlaceholders: htmlWithTokens, imageMap });
          })
          .catch(function(err) {
            reject(err);
          });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleGenerateSimilar = async () => {
    if (!selectedFile && !solution) {
      setError('Vui lòng chọn file bài tập trước.');
      return;
    }

    setIsGeneratingSimilar(true);
    setError(null);

    try {
      let fileData = '';
      let mimeType = selectedFile?.type || 'text/plain';

      if (selectedFile) {
        if (selectedFile.name.endsWith('.docx')) {
          const text = await processDocx(selectedFile);
          fileData = btoa(unescape(encodeURIComponent(text)));
          mimeType = 'text/plain';
        } else {
          fileData = await fileToBase64(selectedFile);
        }
      } else if (solution) {
        fileData = btoa(unescape(encodeURIComponent(solution)));
        mimeType = 'text/plain';
      }

      const response = await apiFetch('/api/generate-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: fileData ? [{ data: fileData, type: mimeType, name: selectedFile?.name }] : [],
          croppedImage: croppedImage || undefined,
          language: solveLanguage
        })
      });

      const text = await response.text();
      if (!text || !text.trim()) {
        throw new Error("Không nhận được dữ liệu từ máy chủ AI. Thầy cô vui lòng thử lại.");
      }
      const data = parseApiResponse<any>(text);
      if (data?.customKeyFailed) {
        localStorage.removeItem(API_KEY_STORAGE);
      }
      if (!response.ok) throw new Error(data.error || 'Đã xảy ra lỗi khi tạo bài tập tương tự');
      
      let newSimilar = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data.result));
      newSimilar = (newSimilar || '').replace(/\s*(?:undefined|null)\s*$/gi, '').trim();
      if (!newSimilar) {
        throw new Error("Không tạo được đề bài tương tự. Vui lòng bấm thử lại.");
      }

      if (croppedImage) {
        newSimilar = injectCroppedImageIntoSolution(newSimilar, croppedImage, showInBothQuestionAndAnswer);
      }
      setSolution(newSimilar);
      setSolutionByLang({ [solveLanguage]: newSimilar });
      setAiTerminology([]);
      setShowTerminologyPanel(false);
      setTranslateError(null);
      setVerifyResult(null);
      setVerifyError(null);
      setHasAppliedCorrection(false);
      setMistakeAnalysisResult(null);
      setMistakeAnalysisError(null);
      setRevealedHintCount(1);
      setStudentAttemptText('');
    } catch (err: any) {
      console.warn('Generate similar notice:', err?.message || err);
      setError(err.message || 'Đã xảy ra lỗi khi tạo bài tập tương tự. Vui lòng thử lại.');
    } finally {
      setIsGeneratingSimilar(false);
    }
  };
  
  const handleSolve = async () => {
    if (!selectedFile && !croppedImage) {
      setError('Vui lòng chọn file bài tập hoặc cắt vùng ảnh đề bài trước.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSolution('');
    setVerifyResult(null);
    setVerifyError(null);
    setHasAppliedCorrection(false);

    try {
      let fileData = '';
      let mimeType = selectedFile ? selectedFile.type : 'image/png';
      let pageImagesMap: Record<number, string> = {};
      let pageDetectedFiguresMap: Record<number, PdfDetectedFigure[]> = {};
      let docxImageMap: Record<string, string> = {};

      if (selectedFile) {
        const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
        const isDocx = selectedFile.name.toLowerCase().endsWith('.docx');
        if (isDocx) {
          const docxData = await processDocxWithImages(selectedFile);
          docxImageMap = docxData.imageMap;
          fileData = btoa(unescape(encodeURIComponent(docxData.textWithPlaceholders)));
          mimeType = 'text/plain';
        } else {
          fileData = await fileToBase64(selectedFile);
          if (selectedFile.type.startsWith('image/')) {
            pageImagesMap[1] = cropperSourceImage || `data:${selectedFile.type || 'image/png'};base64,${fileData}`;
          } else if (isPdf) {
            if (Object.keys(pdfPageImagesMapRef.current).length > 0) {
              pageImagesMap = { ...pdfPageImagesMapRef.current };
              pageDetectedFiguresMap = { ...pdfPageFiguresMapRef.current };
            } else {
              // Ensure PDF pages & deterministic vector figures are extracted even if Solve was clicked immediately
              try {
                const buf = await selectedFile.arrayBuffer();
                const total = await getPdfTotalPages(buf.slice(0));
                const maxPages = Math.min(total, 12);
                const renderedList: string[] = [];
                for (let p = 1; p <= maxPages; p++) {
                  try {
                    const rendered = await renderPdfPageWithFigures(buf.slice(0), p, 2.0);
                    pageImagesMap[p] = rendered.dataUrl;
                    pageDetectedFiguresMap[p] = rendered.detectedFigures;
                    renderedList.push(rendered.dataUrl);
                  } catch {}
                }
                if (renderedList.length > 0) {
                  pdfPageImagesMapRef.current = { ...pageImagesMap };
                  pdfPageFiguresMapRef.current = { ...pageDetectedFiguresMap };
                  setPdfPages(renderedList);
                  if (!cropperSourceImage) setCropperSourceImage(renderedList[0]);
                }
              } catch (pdfPrepErr) {
                console.warn('PDF figure pre-scan skipped:', pdfPrepErr);
              }
            }
          }
        }
      }

      lastSourceFiguresRef.current = { pageImagesMap, pageDetectedFiguresMap, docxImageMap };

      const filesPayload = fileData ? [{ data: fileData, type: mimeType, name: selectedFile?.name || 'de_bai.png' }] : [];

      const response = await apiFetch('/api/solve-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesPayload,
          croppedImage: croppedImage || undefined,
          language: solveLanguage
        })
      });

      const text = await response.text();
      if (!text || !text.trim()) {
        throw new Error("Không nhận được dữ liệu từ máy chủ AI. Thầy cô vui lòng bấm 'Giải Bài Tập Ngay' để thử lại hoặc cắt gọn vùng câu hỏi.");
      }

      const data = parseApiResponse<any>(text);
      if (data?.customKeyFailed) {
        localStorage.removeItem(API_KEY_STORAGE);
      }
      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi xử lý file');
      }

      let newSolution = typeof data.result === 'string' 
        ? data.result 
        : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || (data.result ? JSON.stringify(data.result) : ''));
      newSolution = (newSolution || '').replace(/\s*(?:undefined|null)\s*$/gi, '').trim();

      if (!newSolution) {
        throw new Error("Hệ thống chưa trích xuất được đề bài từ ảnh này. Thầy cô vui lòng nhấn nút 'Cắt ảnh ngay' để chọn vùng câu hỏi hoặc kiểm tra lại ảnh.");
      }

      // Attach original figures from uploaded PDF / image / DOCX (or manually cropped region)
      if (croppedImage) {
        const resolvedTags = await resolveCropFigMarkers(newSolution, pageImagesMap, true, 1);
        newSolution = injectCroppedImageIntoSolution(resolvedTags.text, croppedImage, showInBothQuestionAndAnswer);
      } else if (Object.keys(pageImagesMap).length > 0 || Object.keys(docxImageMap).length > 0) {
        newSolution = await enrichExerciseSolutionWithOriginalFigures(newSolution, {
          pageImagesMap,
          pageDetectedFiguresMap,
          docxImageMap,
          showInSolution: showInBothQuestionAndAnswer,
        });
      }

      setSolution(newSolution);
      setSolutionByLang({ [solveLanguage]: newSolution });
      setAiTerminology([]);
      setShowTerminologyPanel(false);
      setTranslateError(null);
      setMistakeAnalysisResult(null);
      setMistakeAnalysisError(null);
      setRevealedHintCount(1);
      const historyPrefix = solveLanguage === 'en' ? '[English Math] ' : '';
      saveToHistory({
        type: "GBT",
        grade: 0,
        subject: solveLanguage === 'en' ? "Toán (Tiếng Anh)" : "Chung",
        lessonName: selectedFile ? `${historyPrefix}Giải bài tập: ${selectedFile.name}` : `${historyPrefix}Giải bài tập mới`,
        content: newSolution
      });
      setHistoryItems(getHistory().filter(item => item.type === 'GBT'));
    } catch (err: any) {
      console.warn('Solve notice:', err?.message || err);
      setError(err.message || 'Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!solution) return;
    const historyPrefix = solveLanguage === 'en' ? '[English Math] ' : '';
    saveToHistory({
      type: "GBT",
      grade: 0,
      subject: solveLanguage === 'en' ? "Toán (Tiếng Anh)" : "Chung",
      lessonName: selectedFile ? `${historyPrefix}Giải bài tập: ${selectedFile.name}` : `${historyPrefix}Giải bài tập`,
      content: solution
    });
    setHistoryItems(getHistory().filter(item => item.type === 'GBT'));
    alert("Đã lưu vào thư viện lịch sử thành công!");
  };

  const handleExportPDF = () => {
    printElement(exportRef.current, solveLanguage === 'en' ? "Detailed_Solution_EN" : "LoiGiai_ChiTiet");
  };

  const handleExportWord = (useMathType: boolean = false) => {
    if (!solution || !exportRef.current) return;
    const prefix = solveLanguage === 'en' ? 'Detailed_Solution_EN_' : 'LoiGiai_';
    exportHtmlToWord(
      exportRef.current,
      `${prefix}${new Date().getTime()}${useMathType ? '_MathType' : ''}.docx`,
      useMathType ? 'mathtype' : 'omml'
    );
  };

  const handleVerifySolution = async () => {
    if (!solution || isVerifyingSolution) return;

    setIsVerifyingSolution(true);
    setVerifyError(null);
    setVerifyResult(null);
    setHasAppliedCorrection(false);

    try {
      let filesPayload: { data: string; type: string; name: string }[] = [];
      if (selectedFile) {
        let fileData = '';
        let mimeType = selectedFile.type || 'image/png';
        if (selectedFile.name.endsWith('.docx')) {
          const text = await processDocx(selectedFile);
          fileData = btoa(unescape(encodeURIComponent(text)));
          mimeType = 'text/plain';
        } else {
          fileData = await fileToBase64(selectedFile);
        }
        if (fileData) {
          filesPayload = [{ data: fileData, type: mimeType, name: selectedFile.name || 'de_bai.png' }];
        }
      }

      const response = await apiFetch('/api/verify-exercise-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solutionText: solution,
          files: filesPayload,
          croppedImage: croppedImage || undefined,
          language: solveLanguage
        })
      });

      const text = await response.text();
      if (!text || !text.trim()) {
        throw new Error('Không nhận được phản hồi kiểm tra từ máy chủ AI. Thầy cô vui lòng bấm thử lại.');
      }

      const data = parseApiResponse<any>(text);
      if (!response.ok) {
        throw new Error(data?.error || 'Có lỗi xảy ra khi kiểm tra lời giải.');
      }

      const result = data?.result;
      if (!result || typeof result !== 'object') {
        throw new Error('Dữ liệu kết quả kiểm tra chưa hợp lệ.');
      }

      setVerifyResult(result);
    } catch (err: any) {
      console.warn('Verify solution notice:', err?.message || err);
      setVerifyError(err?.message || 'Không thể kiểm tra lời giải lúc này. Vui lòng thử lại.');
    } finally {
      setIsVerifyingSolution(false);
    }
  };

  const handleApplyCorrectedSolution = async () => {
    if (!verifyResult?.correctedSolution) return;
    let updated = verifyResult.correctedSolution.trim();
    if (croppedImage) {
      updated = injectCroppedImageIntoSolution(updated, croppedImage, showInBothQuestionAndAnswer);
    } else if (
      Object.keys(lastSourceFiguresRef.current.pageImagesMap).length > 0 ||
      Object.keys(lastSourceFiguresRef.current.docxImageMap).length > 0
    ) {
      updated = await enrichExerciseSolutionWithOriginalFigures(updated, {
        ...lastSourceFiguresRef.current,
        showInSolution: showInBothQuestionAndAnswer,
      });
    }
    setSolution(updated);
    setSolutionByLang(prev => ({ ...prev, [solveLanguage]: updated }));
    setHasAppliedCorrection(true);
    const historyPrefix = solveLanguage === 'en' ? '[English Math] ' : '';
    saveToHistory({
      type: 'GBT',
      grade: 0,
      subject: solveLanguage === 'en' ? 'Toán (Tiếng Anh)' : 'Chung',
      lessonName: selectedFile ? `${historyPrefix}Giải bài tập (Đã kiểm tra): ${selectedFile.name}` : `${historyPrefix}Giải bài tập (Đã kiểm tra)`,
      content: updated
    });
    setHistoryItems(getHistory().filter(item => item.type === 'GBT'));
  };

  const handleSwitchSolutionLanguage = async (targetLang: 'vi' | 'en') => {
    if (!solution || isTranslatingSolution || targetLang === solveLanguage) return;

    setTranslateError(null);
    const currentSnapshot = solution;
    const cachedTarget = solutionByLang[targetLang];

    if (cachedTarget && cachedTarget.trim()) {
      setSolutionByLang(prev => ({ ...prev, [solveLanguage]: currentSnapshot }));
      setSolveLanguage(targetLang);
      setSolution(cachedTarget);
      setVerifyResult(null);
      setVerifyError(null);
      setHasAppliedCorrection(false);
      return;
    }

    setIsTranslatingSolution(true);
    try {
      const response = await apiFetch('/api/translate-exercise-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solutionText: currentSnapshot,
          targetLanguage: targetLang,
          croppedImage: croppedImage || undefined
        })
      });

      const text = await response.text();
      if (!text || !text.trim()) {
        throw new Error(
          targetLang === 'en'
            ? 'Không nhận được dữ liệu chuyển đổi sang Tiếng Anh. Vui lòng thử lại.'
            : 'Không nhận được dữ liệu chuyển đổi sang Tiếng Việt. Vui lòng thử lại.'
        );
      }

      const data = parseApiResponse<any>(text);
      if (data?.customKeyFailed) {
        localStorage.removeItem(API_KEY_STORAGE);
      }
      if (!response.ok) {
        throw new Error(data?.error || 'Có lỗi xảy ra khi chuyển đổi ngôn ngữ lời giải.');
      }

      const payload = data?.result;
      let translatedText = typeof payload === 'string'
        ? payload
        : (typeof payload?.translatedSolution === 'string' ? payload.translatedSolution : '');
      translatedText = translatedText.trim();

      if (!translatedText) {
        throw new Error('Dữ liệu lời giải sau khi chuyển đổi chưa hợp lệ. Vui lòng thử lại.');
      }

      if (croppedImage) {
        translatedText = injectCroppedImageIntoSolution(translatedText, croppedImage, showInBothQuestionAndAnswer);
      } else if (
        !/<img\b[^>]*data-cropped-figure="true"/i.test(translatedText) &&
        (Object.keys(lastSourceFiguresRef.current.pageImagesMap).length > 0 ||
          Object.keys(lastSourceFiguresRef.current.docxImageMap).length > 0)
      ) {
        translatedText = await enrichExerciseSolutionWithOriginalFigures(translatedText, {
          ...lastSourceFiguresRef.current,
          showInSolution: showInBothQuestionAndAnswer,
        });
      }

      const extractedTerms: MathTermEntry[] = Array.isArray(payload?.terminology)
        ? payload.terminology
            .filter((t: any) => t && t.vi && t.en)
            .map((t: any) => ({
              vi: String(t.vi).trim(),
              en: String(t.en).trim(),
              category: t.category ? String(t.category).trim() : 'Toán học'
            }))
        : [];

      setSolutionByLang(prev => ({
        ...prev,
        [solveLanguage]: currentSnapshot,
        [targetLang]: translatedText
      }));
      setSolveLanguage(targetLang);
      setSolution(translatedText);
      if (extractedTerms.length > 0) {
        setAiTerminology(extractedTerms);
      }
      setVerifyResult(null);
      setVerifyError(null);
      setHasAppliedCorrection(false);
    } catch (err: any) {
      console.warn('Translate solution notice:', err?.message || err);
      setTranslateError(err?.message || 'Không thể chuyển đổi ngôn ngữ lời giải lúc này. Vui lòng thử lại.');
    } finally {
      setIsTranslatingSolution(false);
    }
  };

  // Merge AI-extracted math terms + locally matched core math vocabulary for this exercise
  const displayedTerminology = useMemo(() => {
    const merged: MathTermEntry[] = [];
    const seen = new Set<string>();
    const addEntry = (item: MathTermEntry) => {
      const key = `${item.vi.toLowerCase()}::${item.en.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    };

    aiTerminology.forEach(addEntry);
    extractMatchedMathTerms(solutionByLang.vi || solution).forEach(addEntry);
    extractMatchedMathTerms(solutionByLang.en || '').forEach(addEntry);

    if (termSearch.trim()) {
      const q = termSearch.trim().toLowerCase();
      CORE_MATH_TERMINOLOGY.forEach(entry => {
        if (
          entry.vi.toLowerCase().includes(q) ||
          entry.en.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q)
        ) {
          addEntry(entry);
        }
      });
      return merged.filter(
        entry =>
          entry.vi.toLowerCase().includes(q) ||
          entry.en.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q)
      );
    }

    return merged.length > 0 ? merged : CORE_MATH_TERMINOLOGY.slice(0, 12);
  }, [aiTerminology, solution, solutionByLang.vi, solutionByLang.en, termSearch]);

  const handleExportGlossaryDocx = async () => {
    if (displayedTerminology.length === 0 || isExportingGlossaryDocx) return;
    setIsExportingGlossaryDocx(true);
    try {
      const baseName = selectedFile?.name
        ? selectedFile.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-\u00C0-\u1EF9]+/g, '_')
        : 'BaiTap_Toan';
      await exportMathTerminologyToDocx(displayedTerminology, {
        sourceTitle: selectedFile?.name || (solveLanguage === 'en' ? 'English Math Exercise' : 'Bài tập Toán học'),
        fileName: `TuVung_ToanAnhViet_${baseName}.docx`,
      });
    } catch (err: any) {
      console.error('Export terminology docx error:', err);
      setError(err?.message || 'Không thể xuất file Word bảng thuật ngữ. Vui lòng thử lại.');
    } finally {
      setIsExportingGlossaryDocx(false);
    }
  };

  const handleAppendGlossaryToSolution = () => {
    if (!solution || displayedTerminology.length === 0) return;
    const tableMd = formatTerminologyMarkdownTable(
      displayedTerminology,
      solveLanguage === 'en'
        ? '## Math Vocabulary Summary Table (English – Vietnamese)'
        : '## Bảng tổng hợp Thuật ngữ Toán học (Anh – Việt)'
    );
    const cleaned = solution.replace(/\n*##\s*(?:Bảng tổng hợp Thuật ngữ Toán học|Math Vocabulary Summary Table)[^\n]*[\s\S]*$/i, '').trim();
    const updated = `${cleaned}\n\n---\n\n${tableMd}`;
    setSolution(updated);
    setSolutionByLang(prev => ({ ...prev, [solveLanguage]: updated }));
    setGlossaryAppended(true);
    setTimeout(() => setGlossaryAppended(false), 3000);
  };

  const handleCopyGlossaryTable = async () => {
    if (displayedTerminology.length === 0) return;
    const tableMd = formatTerminologyMarkdownTable(displayedTerminology);
    try {
      await navigator.clipboard.writeText(tableMd);
      setCopiedGlossaryTable(true);
      setTimeout(() => setCopiedGlossaryTable(false), 2500);
    } catch {
      setError('Trình duyệt chưa cấp quyền sao chép clipboard.');
    }
  };

  const handleAnalyzeMistakes = async (overrideAttempt?: string) => {
    if ((!selectedFile && !croppedImage && !solution) || isAnalyzingMistakes) {
      if (!selectedFile && !croppedImage && !solution) {
        setError('Vui lòng chọn file bài tập hoặc cắt vùng ảnh đề bài trước.');
      }
      return;
    }

    setIsAnalyzingMistakes(true);
    setMistakeAnalysisError(null);
    setError(null);

    try {
      let filesPayload: { data: string; type: string; name: string }[] = [];
      if (selectedFile) {
        let fileData = '';
        let mimeType = selectedFile.type || 'image/png';
        if (selectedFile.name.endsWith('.docx')) {
          const text = await processDocx(selectedFile);
          fileData = btoa(unescape(encodeURIComponent(text)));
          mimeType = 'text/plain';
        } else {
          fileData = await fileToBase64(selectedFile);
        }
        if (fileData) {
          filesPayload = [{ data: fileData, type: mimeType, name: selectedFile.name || 'de_bai.png' }];
        }
      }

      const attemptToSend = typeof overrideAttempt === 'string' ? overrideAttempt : studentAttemptText;

      const response = await apiFetch('/api/analyze-student-mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesPayload,
          croppedImage: croppedImage || undefined,
          solutionText: solution || undefined,
          studentAttempt: attemptToSend.trim() || undefined,
          language: solveLanguage
        })
      });

      const text = await response.text();
      if (!text || !text.trim()) {
        setMistakeAnalysisError('Không nhận được phản hồi phân tích từ máy chủ AI. Thầy cô vui lòng bấm thử lại.');
        return;
      }

      if (!response.ok) {
        const errPayload = safeJsonParse<any>(text, {});
        if (errPayload?.customKeyFailed) {
          localStorage.removeItem(API_KEY_STORAGE);
        }
        const errMsg =
          typeof errPayload?.error === 'string'
            ? errPayload.error
            : (errPayload?.error?.message || errPayload?.message || 'Có lỗi xảy ra khi phân tích lỗi sai & gợi ý từng bước.');
        console.warn('Analyze mistakes notice:', errMsg);
        setMistakeAnalysisError(errMsg);
        return;
      }

      const data = parseApiResponse<any>(text);
      if (data?.customKeyFailed) {
        localStorage.removeItem(API_KEY_STORAGE);
      }

      const result = data?.result;
      if (!result || typeof result !== 'object') {
        setMistakeAnalysisError('Dữ liệu phân tích lỗi sai chưa hợp lệ. Vui lòng thử lại.');
        return;
      }

      setMistakeAnalysisResult(result);
      setRevealedHintCount(1);
    } catch (err: any) {
      console.warn('Analyze mistakes notice:', err?.message || err);
      setMistakeAnalysisError(err?.message || 'Không thể phân tích lỗi sai và tạo gợi ý lúc này. Vui lòng thử lại.');
    } finally {
      setIsAnalyzingMistakes(false);
    }
  };

  const handleAppendMistakesToSolution = () => {
    if (!solution || !mistakeAnalysisResult) return;
    const isEn = solveLanguage === 'en';
    const mistakesSection = mistakeAnalysisResult.commonMistakes
      .map((m, idx) =>
        `${idx + 1}. **${m.title}**\n   - ${isEn ? 'Common wrong step' : 'Lỗi hay gặp'}: ${m.wrongExample}\n   - ${isEn ? 'Why it fails' : 'Nguyên nhân'}: ${m.whyWrong}\n   - ${isEn ? 'How to avoid' : 'Cách phòng tránh'}: ${m.howToAvoid}`
      )
      .join('\n\n');
    const hintsSection = mistakeAnalysisResult.nextStepHints
      .map(h =>
        `- **${isEn ? `Step ${h.stepNumber}` : `Bước ${h.stepNumber}`}: ${h.title}** — ${h.hint}${h.keyFormula ? ` (${h.keyFormula})` : ''}`
      )
      .join('\n');

    const blockHeading = isEn
      ? '## Common Student Mistakes & Step-by-Step Scaffolding Guide'
      : '## Sai lầm phổ biến cần tránh & Gợi ý từng bước';
    const blockMd = [
      blockHeading,
      '',
      `### ${isEn ? '1. Common Misconceptions & Pitfalls' : '1. Các sai lầm phổ biến học sinh hay mắc'}`,
      mistakesSection,
      '',
      `### ${isEn ? '2. Progressive Next-Step Hints (Without Spoiling Final Answer)' : '2. Chuỗi gợi ý "Bước tiếp theo" dẫn dắt tư duy'}`,
      hintsSection,
    ].join('\n');

    const cleaned = solution
      .replace(/\n*##\s*(?:Sai lầm phổ biến cần tránh|Common Student Mistakes)[^\n]*[\s\S]*$/i, '')
      .trim();
    const updated = `${cleaned}\n\n---\n\n${blockMd}`;
    setSolution(updated);
    setSolutionByLang(prev => ({ ...prev, [solveLanguage]: updated }));
    setMistakesAppended(true);
    setTimeout(() => setMistakesAppended(false), 3000);
  };

  // Presentation slides logic
  const presentationSlides = useMemo(() => {
    if (!solution) return [];
    // Split by Markdown H2 or H3
    const parts = String(solution).split(/(?=\n##\s)/g).filter(p => p.trim());
    return parts;
  }, [solution]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-8">
      {/* Quick Launch Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white py-3.5 px-6 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <p className="text-xs font-semibold tracking-wide text-slate-300">
            Công cụ hỗ trợ làm bài & vẽ hình minh họa:
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowGeoGebra(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-indigo-500/30"
            title="Mở Vẽ hình GeoGebra để xuất hình ảnh chèn trực quan vào lời giải bài tập"
          >
            <span>📐</span> Vẽ hình GeoGebra (Lấy ảnh chèn lời giải)
          </button>
          <button
            onClick={() => setShowCalculator(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-emerald-500/30"
            title="Mở máy tính khoa học cầm tay Casio fx-580VN X"
          >
            <Calculator className="w-3.5 h-3.5 text-white" /> Máy tính Casio fx-580VN X
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 lg:p-8">
        <FeatureQuickGuideBanner sectionId="exercise_solver" />
        <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">Trợ lý Giải Bài Tập Thông Minh</h2>

        {/* Language Mode Selector: Tiếng Việt vs English Math */}
        <div className="max-w-2xl mx-auto mb-6 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSolveLanguage('vi')}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                solveLanguage === 'vi'
                  ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <span>🇻🇳</span>
              <span>Giải bài tập Tiếng Việt</span>
            </button>
            <button
              type="button"
              onClick={() => setSolveLanguage('en')}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                solveLanguage === 'en'
                  ? 'bg-emerald-600 text-white shadow-sm border border-emerald-700'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Giải Toán Tiếng Anh (English Math)</span>
            </button>
          </div>

          {solveLanguage === 'en' && (
            <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
              <Globe className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <b>Chế độ Toán Tiếng Anh (English Math):</b> Thầy/cô tải lên đề thi hoặc bài tập Toán bằng Tiếng Anh (PDF nhiều trang, ảnh chụp, Word hoặc dán chữ). AI sẽ trích xuất đề bài và viết <b>100% lời giải chi tiết bằng Tiếng Anh học thuật chuẩn</b> kèm công thức LaTeX sắc nét.
              </p>
            </div>
          )}
        </div>
        
        {historyItems.length > 0 && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-indigo-600" /> Lịch sử đã giải
            </label>
            <select
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  const item = historyItems.find(h => h.id === e.target.value);
                  if (item) {
                    const isEnItem = item.subject === 'Toán (Tiếng Anh)' || /^\[English Math\]/i.test(item.lessonName || '');
                    const itemLang: 'vi' | 'en' = isEnItem ? 'en' : 'vi';
                    setSolveLanguage(itemLang);
                    setSolution(item.content);
                    setSolutionByLang({ [itemLang]: item.content });
                    setAiTerminology([]);
                    setShowTerminologyPanel(false);
                    setTranslateError(null);
                    setVerifyResult(null);
                    setVerifyError(null);
                    setHasAppliedCorrection(false);
                    setMistakeAnalysisResult(null);
                    setMistakeAnalysisError(null);
                    setRevealedHintCount(1);
                    setStudentAttemptText('');
                  }
                }
              }}
            >
              <option value="">-- Chọn bài tập đã giải trong lịch sử --</option>
              {historyItems.map(item => (
                <option key={item.id} value={item.id}>
                  {new Date(item.createdAt).toLocaleDateString('vi-VN')} - {item.lessonName}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {!solution && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div 
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 lg:p-10 text-center hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[280px]"
              onClick={() => { if (!isCameraActive && !selectedFile) fileInputRef.current?.click() }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf,.docx,.doc,.txt,image/*" 
                onChange={handleFileSelect} 
              />
              <input
                type="file"
                ref={cropperInputRef}
                className="hidden"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const dataUrl = await fileToBase64(file);
                    setCropperSourceImage(`data:${file.type || 'image/png'};base64,${dataUrl}`);
                    setIsCropperOpen(true);
                  }
                }}
              />
              
              {isCameraActive ? (
                <div className="w-full flex flex-col items-center">
                   <div className="relative w-full max-w-md bg-black rounded-lg overflow-hidden mb-4">
                     <video ref={videoRef} className="w-full h-auto" playsInline autoPlay></video>
                     <canvas ref={canvasRef} className="hidden"></canvas>
                   </div>
                   <div className="flex gap-4">
                     <button onClick={stopCamera} className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors">
                       Hủy
                     </button>
                     <button onClick={capturePhoto} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
                       <Camera className="w-5 h-5" /> Chụp Ảnh
                     </button>
                   </div>
                </div>
              ) : !selectedFile ? (
                <>
                  <div className={`p-4 rounded-full mb-3 ${solveLanguage === 'en' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                    {solveLanguage === 'en' ? (
                      <Globe className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <Upload className="w-8 h-8 text-blue-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-1">
                    {solveLanguage === 'en' ? 'Tải lên đề Toán Tiếng Anh (PDF, Ảnh, Word) hoặc dán đề' : 'Tải lên hoặc chụp ảnh đề bài'}
                  </h3>
                  <p className="text-slate-500 mb-5 text-sm">Hỗ trợ file ảnh (.png, .jpg), PDF nhiều trang, Word (.docx), hoặc phím tắt dán <b>Ctrl+V</b></p>
                  
                  <div className="flex flex-wrap justify-center items-center gap-2.5">
                    <button 
                      type="button"
                      className={`px-5 py-2.5 text-white font-medium rounded-lg flex items-center gap-2 transition-colors shadow-xs text-sm ${
                        solveLanguage === 'en' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" /> Chọn File
                    </button>
                    <button 
                      type="button"
                      className="px-5 py-2.5 bg-teal-600 text-white font-medium rounded-lg flex items-center gap-2 hover:bg-teal-700 transition-colors shadow-xs text-sm"
                      onClick={startCamera}
                    >
                      <Camera className="w-4 h-4" /> Chụp Ảnh
                    </button>
                    <button 
                      type="button"
                      className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-100 flex items-center gap-2 transition-colors text-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const clipItems = await navigator.clipboard.read();
                          for (const item of clipItems) {
                            const imageType = item.types.find(t => t.startsWith('image/'));
                            if (imageType) {
                              const blob = await item.getType(imageType);
                              const file = new File([blob], `clipboard_${Date.now()}.png`, { type: imageType });
                              processIncomingFile(file);
                              return;
                            }
                          }
                          alert("Không tìm thấy ảnh trong clipboard. Bạn có thể nhấn Ctrl+V bất cứ lúc nào để dán ảnh chụp màn hình!");
                        } catch {
                          alert("Vui lòng nhấn phím tắt Ctrl + V (hoặc Cmd + V) để dán ảnh chụp màn hình đề bài!");
                        }
                      }}
                    >
                      <Clipboard className="w-4 h-4 text-slate-600" /> Dán Clipboard (Ctrl+V)
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2.5 border border-indigo-200 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 flex items-center gap-1.5 transition-colors text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTextInput(prev => !prev);
                      }}
                    >
                      <FileText className="w-4 h-4 text-indigo-600" /> Nhập / Dán chữ
                    </button>
                    {solveLanguage === 'en' ? (
                      <button 
                        type="button"
                        className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium rounded-lg flex items-center gap-1.5 hover:bg-emerald-100 transition-colors text-sm"
                        onClick={(e) => { 
                          e.stopPropagation();
                          const problemText = "Question 1. Find the limit $L = \\lim_{x \\to 2} \\frac{x^2 - 4}{\\sqrt{x + 2} - 2}$.\n\nQuestion 2. A box contains 4 red balls and 6 blue balls. Three balls are drawn at random simultaneously. Find the probability that at least 2 red balls are drawn.\n\nQuestion 3. Let triangle $ABC$ have $AB = 5$, $AC = 7$, and $\\angle BAC = 60^\\circ$. Calculate the length of $BC$ and the area of triangle $ABC$.";
                          const blob = new Blob([problemText], { type: 'text/plain' });
                          const file = new File([blob], "English_Math_Sample.txt", { type: 'text/plain' });
                          processIncomingFile(file);
                        }}
                      >
                        <Sparkles className="w-4 h-4 text-emerald-600" /> Demo English Math
                      </button>
                    ) : (
                      <button 
                        type="button"
                        className="px-4 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 font-medium rounded-lg flex items-center gap-1.5 hover:bg-purple-100 transition-colors text-sm"
                        onClick={(e) => { 
                          e.stopPropagation();
                          const problemText = "Cho hàm số bậc ba $y = f(x) = ax^3 + bx^2 + cx + d$ có đồ thị như hình vẽ.\n1. Tìm khoảng đồng biến và nghịch biến của hàm số.\n2. Xác định tọa độ điểm cực đại và cực tiểu.\n3. Tìm số nghiệm thực của phương trình $2f(x) - 3 = 0$.";
                          const blob = new Blob([problemText], { type: 'text/plain' });
                          const file = new File([blob], "BaiToan_KhaoSat_DoThi.txt", { type: 'text/plain' });
                          processIncomingFile(file);
                        }}
                      >
                        <Sparkles className="w-4 h-4 text-purple-600" /> Demo Toán đồ thị
                      </button>
                    )}
                  </div>

                  {showTextInput && (
                    <div
                      className="w-full mt-5 p-4 bg-white border border-slate-200 rounded-xl text-left shadow-xs space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="block text-xs font-bold text-slate-700">
                        {solveLanguage === 'en'
                          ? 'Dán hoặc nhập nội dung đề bài Toán Tiếng Anh (hỗ trợ LaTeX $...$):'
                          : 'Dán hoặc nhập nội dung đề bài (hỗ trợ LaTeX $...$):'}
                      </label>
                      <textarea
                        rows={4}
                        value={pastedProblemText}
                        onChange={(e) => setPastedProblemText(e.target.value)}
                        placeholder={
                          solveLanguage === 'en'
                            ? 'Ví dụ: Solve the equation $\\sin 2x + \\cos x = 0$ on $[0, 2\\pi]$...'
                            : 'Ví dụ: Giải phương trình $x^2 - 5x + 6 = 0$...'
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTextInput(false)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100"
                        >
                          Đóng
                        </button>
                        <button
                          type="button"
                          disabled={!pastedProblemText.trim()}
                          onClick={() => {
                            const trimmed = pastedProblemText.trim();
                            if (!trimmed) return;
                            const blob = new Blob([trimmed], { type: 'text/plain' });
                            const fileName = solveLanguage === 'en' ? 'English_Math_Problem.txt' : 'De_Bai_Van_Ban.txt';
                            const file = new File([blob], fileName, { type: 'text/plain' });
                            setShowTextInput(false);
                            processIncomingFile(file);
                          }}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg"
                        >
                          Dùng đề bài này
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full text-left">
                  {/* File Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2.5 rounded-lg text-emerald-700 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{selectedFile.name}</h4>
                        <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || 'Tệp tài liệu'}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-300 rounded-lg text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setCroppedImage(null); setCropperSourceImage(''); setPdfPages([]); }}
                    >
                      <X className="w-3.5 h-3.5" /> Chọn tệp khác
                    </button>
                  </div>

                  {/* PDF Multi-page Selector & Crop Option */}
                  {pdfPages.length > 0 && (
                    <div className="mb-4 p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-600" />
                          Trang tài liệu PDF ({pdfPages.length} trang)
                        </span>
                        <span className="text-[11px] text-blue-700 font-medium">Chọn trang để cắt câu hỏi / đồ thị</span>
                      </div>
                      
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {pdfPages.map((pageData, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectPdfPage(idx)}
                            className={`shrink-0 flex flex-col items-center p-1.5 rounded-lg border text-xs transition-all ${
                              selectedPdfPageIdx === idx 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                            }`}
                          >
                            {pageData ? (
                              <img src={pageData} alt={`Trang ${idx + 1}`} className="w-14 h-18 object-cover rounded bg-white mb-1 shadow-2xs" />
                            ) : null}
                            <span className="font-semibold">Trang {idx + 1}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-slate-600">Đang chọn: <b>Trang {selectedPdfPageIdx + 1}</b></p>
                        <button
                          type="button"
                          onClick={() => {
                            if (pdfPages[selectedPdfPageIdx]) {
                              setCropperSourceImage(pdfPages[selectedPdfPageIdx]);
                              setIsCropperOpen(true);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          Cắt câu hỏi & đồ thị từ Trang {selectedPdfPageIdx + 1}
                        </button>
                      </div>
                    </div>
                  )}

                  {isLoadingPdfPages && (
                    <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-600">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Đang nạp các trang PDF để hỗ trợ cắt câu hỏi trực quan...</span>
                    </div>
                  )}

                  {/* Image Crop trigger (when file is image) */}
                  {selectedFile.type.startsWith('image/') && !croppedImage && cropperSourceImage && (
                    <div className="mb-4 p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={cropperSourceImage} alt="Ảnh gốc" className="w-16 h-16 object-contain rounded-lg border border-indigo-200 bg-white shadow-2xs" />
                        <div>
                          <p className="text-xs font-bold text-indigo-950">Cắt vùng đề bài / đồ thị</p>
                          <p className="text-[11px] text-indigo-700">Khuyên dùng: Cắt gọn khung câu hỏi và đồ thị để AI giải chính xác và tự động chèn vào đề lẫn đáp án.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCropperOpen(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                      >
                        <Scissors className="w-4 h-4" />
                        Cắt ảnh ngay
                      </button>
                    </div>
                  )}

                  {/* Cropped Image Result Preview */}
                  {croppedImage && (
                    <div className="mb-4 p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Đã cắt ảnh câu hỏi / đồ thị thành công!
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsCropperOpen(true)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded flex items-center gap-1"
                          >
                            <Crop className="w-3.5 h-3.5" /> Cắt lại
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveCroppedImage}
                            className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600 rounded flex items-center gap-1"
                            title="Xóa ảnh cắt, dùng toàn bộ file gốc"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hủy cắt
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs flex justify-center">
                        <img src={croppedImage || undefined} alt="Ảnh đã cắt" className="max-h-48 object-contain rounded" />
                      </div>
                      <p className="text-[11px] text-emerald-800 text-center font-medium">
                        ✨ Ảnh này sẽ được tự động chèn vào cả <b>Đề bài</b> và <b>Lời giải chi tiết</b> để giáo viên và học sinh đối chiếu trực quan.
                      </p>
                    </div>
                  )}

                  {/* Solver Action Trigger */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-200">
                    <button 
                      type="button"
                      className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-medium transition-colors"
                      onClick={() => {
                        setSelectedFile(null);
                        setCroppedImage(null);
                        setCropperSourceImage('');
                        setPdfPages([]);
                        setMistakeAnalysisResult(null);
                        setMistakeAnalysisError(null);
                        setStudentAttemptText('');
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-2xs text-sm cursor-pointer disabled:opacity-60"
                      onClick={() => handleAnalyzeMistakes()}
                      disabled={isAnalyzingMistakes || isUploading}
                      title="AI phân tích các sai lầm học sinh hay mắc phải và gợi ý từng bước tiếp theo mà không lộ ngay đáp án cuối"
                    >
                      {isAnalyzingMistakes ? <Loader2 className="w-4 h-4 animate-spin text-amber-700" /> : <Compass className="w-4 h-4 text-amber-700" />}
                      <span>{isAnalyzingMistakes ? 'Đang phân tích lỗi & tạo gợi ý...' : 'Gợi ý từng bước & Lỗi sai HS'}</span>
                    </button>
                    <button 
                      type="button"
                      className={`px-6 py-2.5 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm ${
                        solveLanguage === 'en' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      onClick={handleSolve}
                      disabled={isUploading || isAnalyzingMistakes}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isUploading
                        ? (solveLanguage === 'en' ? 'Đang phân tích & giải bằng Tiếng Anh...' : 'Đang phân tích & giải bài...')
                        : (solveLanguage === 'en' ? 'Giải Toán Tiếng Anh Ngay' : 'Giải Bài Tập Ngay')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Visual helpful guide */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950 mb-0.5">Tính năng hình ảnh & đồ thị trực quan:</p>
                <p className="text-amber-800 leading-relaxed">
                  Nếu đề bài có đồ thị hàm số, bảng biến thiên hay hình học không gian, hãy nhấn <b>Cắt ảnh đề bài / đồ thị</b> để AI tự động đính kèm hình ảnh sắc nét vào cả <b>Đề bài</b> và <b>Lời giải chi tiết</b>. Hoặc chọn <b>Gợi ý từng bước & Lỗi sai HS</b> để dẫn dắt học sinh tự giải từng bước mà chưa lộ đáp án cuối.
                </p>
              </div>
            </div>

            {error && (
              <ApiErrorBanner 
                error={error} 
                onDismiss={() => setError(null)} 
                onRetry={handleSolve} 
              />
            )}

            {mistakeAnalysisError && !isAnalyzingMistakes && (
              <ApiErrorBanner
                error={mistakeAnalysisError}
                onDismiss={() => setMistakeAnalysisError(null)}
                onRetry={() => handleAnalyzeMistakes()}
              />
            )}

            {isAnalyzingMistakes && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-sm text-amber-950 shadow-2xs">
                <Loader2 className="w-5 h-5 animate-spin text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">AI đang phân tích bẫy sai lầm phổ biến & thiết kế lộ trình gợi ý từng bước...</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Đang xác định các lỗi biến đổi thường gặp và xây dựng câu hỏi gợi mở "Bước tiếp theo" mà không làm lộ đáp số cuối cùng.
                  </p>
                </div>
              </div>
            )}

            {/* Pre-solution Guided Scaffolding & Mistake Analysis View */}
            {mistakeAnalysisResult && !isAnalyzingMistakes && (
              <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 p-5 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        Chế độ Gia sư: Gợi ý Bước Tiếp Theo & Phân tích Sai lầm HS
                      </h4>
                      <p className="text-xs text-slate-600">
                        Chưa hiển thị đáp án cuối — học sinh tự suy luận theo từng nấc gợi ý và tránh các lỗi sai kinh điển.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSolve}
                      disabled={isUploading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Mở Lời giải chi tiết đầy đủ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMistakeAnalysisResult(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Đóng bảng phân tích"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {mistakeAnalysisResult.problemStatement && (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Đề bài đang hướng dẫn</p>
                    <div className="text-sm text-slate-800 leading-relaxed">
                      <ErrorBoundary><MathView content={mistakeAnalysisResult.problemStatement} /></ErrorBoundary>
                    </div>
                    {croppedImage && (
                      <div className="pt-2 flex justify-center">
                        <img src={croppedImage || undefined} alt="Hình đề bài" className="max-h-52 rounded-lg border border-slate-200" />
                      </div>
                    )}
                  </div>
                )}

                {mistakeAnalysisResult.attemptDiagnosis && (
                  <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-indigo-800">
                      <HelpCircle className="w-4 h-4 text-indigo-600" />
                      Nhận xét chẩn đoán ban đầu:
                    </p>
                    <div className="leading-relaxed">
                      <ErrorBoundary><MathView content={mistakeAnalysisResult.attemptDiagnosis} /></ErrorBoundary>
                    </div>
                  </div>
                )}

                {/* Student attempt diagnostic box */}
                <div className="p-3.5 bg-white border border-indigo-200 rounded-xl space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Chẩn đoán bài làm thử / chỗ đang bí của học sinh (tùy chọn):
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={studentAttemptText}
                      onChange={(e) => setStudentAttemptText(e.target.value)}
                      placeholder="VD: Em bình phương hai vế ra $x = 2$ và $x = 5$, hoặc em chưa biết đặt điều kiện thế nào..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAnalyzeMistakes(studentAttemptText)}
                      disabled={isAnalyzingMistakes || !studentAttemptText.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Phân tích bước làm này</span>
                    </button>
                  </div>
                </div>

                {/* Progressive Next-Step Scaffolding */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span>Gợi ý "Bước tiếp theo" từng nấc ({Math.min(revealedHintCount, mistakeAnalysisResult.nextStepHints.length)} / {mistakeAnalysisResult.nextStepHints.length})</span>
                    </h5>
                    <div className="flex items-center gap-2">
                      {revealedHintCount < mistakeAnalysisResult.nextStepHints.length && (
                        <>
                          <button
                            type="button"
                            onClick={() => setRevealedHintCount(prev => Math.min(mistakeAnalysisResult.nextStepHints.length, prev + 1))}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <span>Xem gợi ý bước tiếp theo →</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRevealedHintCount(mistakeAnalysisResult.nextStepHints.length)}
                            className="px-2.5 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Hiện tất cả
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {mistakeAnalysisResult.nextStepHints.slice(0, revealedHintCount).map((step, idx) => (
                      <div key={idx} className="p-4 bg-white border border-amber-200 rounded-xl shadow-2xs space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Bước {step.stepNumber}: {step.title}
                          </span>
                        </div>
                        {step.guidingQuestion && (
                          <div className="text-xs text-indigo-900 bg-indigo-50/70 px-3 py-2 rounded-lg border border-indigo-100">
                            <span className="font-bold">Câu hỏi gợi mở: </span>
                            <ErrorBoundary><MathView content={step.guidingQuestion} /></ErrorBoundary>
                          </div>
                        )}
                        <div className="text-xs text-slate-800 leading-relaxed">
                          <span className="font-bold text-amber-900">Gợi ý bước tiếp theo: </span>
                          <ErrorBoundary><MathView content={step.hint} /></ErrorBoundary>
                        </div>
                        {step.keyFormula && (
                          <div className="text-xs text-emerald-900 bg-emerald-50/70 px-3 py-2 rounded-lg border border-emerald-200">
                            <span className="font-bold">Kiến thức / Công thức chìa khóa: </span>
                            <ErrorBoundary><MathView content={step.keyFormula} /></ErrorBoundary>
                          </div>
                        )}
                        {step.checkpoint && (
                          <div className="text-[11px] text-slate-600 flex items-start gap-1.5 pt-1 border-t border-slate-100">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>
                              <b>Tự kiểm tra:</b> <ErrorBoundary><MathView content={step.checkpoint} /></ErrorBoundary>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {revealedHintCount >= mistakeAnalysisResult.nextStepHints.length && mistakeAnalysisResult.finalNudge && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Chốt bước cuối: </span>
                        <ErrorBoundary><MathView content={mistakeAnalysisResult.finalNudge} /></ErrorBoundary>
                      </div>
                    </div>
                  )}
                </div>

                {/* Common Student Mistakes */}
                {mistakeAnalysisResult.commonMistakes && mistakeAnalysisResult.commonMistakes.length > 0 && (
                  <div className="space-y-2.5">
                    <h5 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Các sai lầm phổ biến học sinh hay mắc ({mistakeAnalysisResult.commonMistakes.length})</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {mistakeAnalysisResult.commonMistakes.map((m, idx) => (
                        <div key={idx} className="p-3.5 bg-white border border-rose-200 rounded-xl shadow-2xs space-y-1.5 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-rose-900">{idx + 1}. {m.title}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                              m.severity === 'high'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {m.severity === 'high' ? 'Rất hay sai' : 'Cần lưu ý'}
                            </span>
                          </div>
                          {m.wrongExample && (
                            <div className="p-2 bg-rose-50/70 rounded-lg border border-rose-100 text-rose-900">
                              <span className="font-semibold">Cách làm sai thường gặp: </span>
                              <ErrorBoundary><MathView content={m.wrongExample} /></ErrorBoundary>
                            </div>
                          )}
                          <div className="text-slate-700 leading-relaxed">
                            <span className="font-semibold text-slate-900">Vì sao sai: </span>
                            <ErrorBoundary><MathView content={m.whyWrong} /></ErrorBoundary>
                          </div>
                          <div className="text-emerald-800 leading-relaxed">
                            <span className="font-semibold">Cách khắc phục: </span>
                            <ErrorBoundary><MathView content={m.howToAvoid} /></ErrorBoundary>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {solution && (
          <div className="space-y-4">
            {/* Solution Header Toolbar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setSolution('');
                    setSolutionByLang({});
                    setAiTerminology([]);
                    setShowTerminologyPanel(false);
                    setTranslateError(null);
                    setVerifyResult(null);
                    setVerifyError(null);
                    setHasAppliedCorrection(false);
                    setMistakeAnalysisResult(null);
                    setMistakeAnalysisError(null);
                    setRevealedHintCount(1);
                    setStudentAttemptText('');
                  }}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Làm bài khác
                </button>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <span>{solveLanguage === 'en' ? 'Detailed Solution (English Math)' : 'Lời giải chi tiết'}</span>
                  {solveLanguage === 'en' && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      🇬🇧 English Math
                    </span>
                  )}
                </h3>

                {/* In-Solution Language Switcher (Tiếng Việt <-> English Math) */}
                <div
                  className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-lg shadow-2xs"
                  title="Chuyển đổi qua lại ngôn ngữ lời giải giữa Tiếng Việt và Tiếng Anh (tự động ánh xạ thuật ngữ Toán học)"
                >
                  <button
                    type="button"
                    disabled={isTranslatingSolution}
                    onClick={() => handleSwitchSolutionLanguage('vi')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 ${
                      solveLanguage === 'vi'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'
                    }`}
                  >
                    {isTranslatingSolution && solveLanguage === 'en' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <span>🇻🇳</span>
                    )}
                    <span>Tiếng Việt</span>
                  </button>
                  <button
                    type="button"
                    disabled={isTranslatingSolution}
                    onClick={() => handleSwitchSolutionLanguage('en')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 ${
                      solveLanguage === 'en'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {isTranslatingSolution && solveLanguage === 'vi' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <span>🇬🇧</span>
                    )}
                    <span>English</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Bilingual Math Terminology Toggle & Quick Docx Export */}
                <button
                  type="button"
                  onClick={() => setShowTerminologyPanel(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors shadow-2xs cursor-pointer ${
                    showTerminologyPanel
                      ? 'bg-teal-600 text-white border-teal-700'
                      : 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100'
                  }`}
                  title="Xem bảng tổng hợp từ vựng & thuật ngữ Toán học Việt – Anh của bài giải này"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Thuật ngữ Toán ({displayedTerminology.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportGlossaryDocx}
                  disabled={isExportingGlossaryDocx || displayedTerminology.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 bg-cyan-50 border border-cyan-200 text-cyan-800 hover:bg-cyan-100 disabled:opacity-50 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                  title="Xuất bảng tổng hợp thuật ngữ Toán học Anh – Việt ra file Word (.docx) đính kèm để học sinh ôn tập"
                >
                  {isExportingGlossaryDocx ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-700" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-cyan-700" />
                  )}
                  <span>Xuất từ vựng (.docx)</span>
                </button>

                {/* Crop or change image trigger */}
                <button 
                  type="button"
                  onClick={() => {
                    if (cropperSourceImage) {
                      setIsCropperOpen(true);
                    } else {
                      cropperInputRef.current?.click();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                  title="Cắt hoặc thay đổi ảnh đồ thị để chèn vào đề bài và lời giải"
                >
                  <Scissors className="w-3.5 h-3.5 text-indigo-600" />
                  {croppedImage ? 'Cắt lại / Thay ảnh' : 'Cắt ảnh chèn vào'}
                </button>

                {/* Toggle image in both problem and solution */}
                {croppedImage && (
                  <button 
                    type="button"
                    onClick={handleToggleShowInAnswer}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
                      showInBothQuestionAndAnswer 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' 
                        : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Bật/Tắt hiển thị hình ảnh đồ thị ở cả phần Đề bài và Lời giải chi tiết"
                  >
                    {showInBothQuestionAndAnswer ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                    {showInBothQuestionAndAnswer ? 'Hiện ở cả Đề & Đáp án' : 'Chỉ hiện ở Đề bài'}
                  </button>
                )}

                <button 
                  type="button"
                  onClick={() => handleAnalyzeMistakes()}
                  disabled={isAnalyzingMistakes}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 text-white transition-all rounded-lg shadow-xs text-xs font-bold cursor-pointer active:scale-95"
                  title="Phân tích các sai lầm phổ biến của học sinh và cung cấp chuỗi gợi ý bước tiếp theo"
                >
                  {isAnalyzingMistakes ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-100" />
                  ) : (
                    <Compass className="w-4 h-4 text-amber-100" />
                  )}
                  <span>{isAnalyzingMistakes ? 'Đang phân tích lỗi...' : 'Lỗi sai HS & Gợi ý'}</span>
                </button>

                <button 
                  type="button"
                  onClick={handleVerifySolution}
                  disabled={isVerifyingSolution}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white transition-all rounded-lg shadow-xs text-xs font-bold cursor-pointer active:scale-95"
                  title="Dùng AI kiểm tra độc lập lại đề bài, từng bước tính toán và đáp số để tránh sai sót"
                >
                  {isVerifyingSolution ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-200" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                  )}
                  <span>{isVerifyingSolution ? 'AI đang kiểm tra...' : 'AI Kiểm tra lời giải'}</span>
                </button>

                <button 
                  onClick={() => {
                    const fixed = run1ClickMathFix(solution);
                    setSolution(fixed);
                    setSolutionByLang(prev => ({ ...prev, [solveLanguage]: fixed }));
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all rounded-lg shadow-xs text-xs font-bold cursor-pointer active:scale-95"
                  title="Tự động sửa lỗi rách dấu $, lỗi dính chữ và lỗi ký hiệu MathJax trong lời giải"
                >
                  <Wand2 className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                  <span>⚡ Sửa lỗi Toán 1-Click</span>
                </button>

                <button 
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-xs text-xs font-semibold"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Lưu thư viện
                </button>

                <button 
                  onClick={handleGenerateSimilar}
                  disabled={isGeneratingSimilar}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-xs text-xs font-semibold"
                >
                  {isGeneratingSimilar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  Tạo bài tương tự
                </button>

                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleExportWord(false)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-xs text-xs font-bold cursor-pointer active:scale-95"
                    title="Xuất lời giải chi tiết sang tệp Word (.docx) công thức chuẩn Word Equation (OMML)"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xuất Word (Equation)</span>
                  </button>
                  <button 
                    onClick={() => handleExportWord(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-xs text-xs font-bold cursor-pointer active:scale-95"
                    title="Xuất lời giải chi tiết sang tệp Word (.docx) công thức chuẩn Word MathType"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất Word (MathType)</span>
                  </button>
                </div>

                <button 
                  onClick={() => handleExportPDF()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-xs text-xs font-semibold"
                >
                  <span className="text-[10px] font-extrabold border border-current px-0.5 rounded">PDF</span> Xuất PDF
                </button>
                
                <button 
                  onClick={() => { setIsPresentationMode(true); setCurrentSlide(0); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-xs text-xs font-semibold"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Trình chiếu
                </button>
              </div>
            </div>

            {/* Informational banner when image is attached */}
            {croppedImage && (
              <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Hình vẽ / Đồ thị bài toán đã được cắt và chèn trực quan vào <b>Đề bài</b> {showInBothQuestionAndAnswer ? 'và' : 'nhưng không hiện ở'} <b>Lời giải chi tiết</b>.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCropperOpen(true)}
                    className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Crop className="w-3 h-3 text-emerald-600" /> Cắt lại vùng khác
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveCroppedImage}
                    className="px-2 py-1 text-slate-500 hover:text-rose-600 rounded"
                    title="Gỡ ảnh khỏi bài giải"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* AI Verification Loading / Error / Result Panel */}
            {isVerifyingSolution && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-sm text-indigo-900 shadow-2xs">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
                <div>
                  <p className="font-bold">AI đang kiểm tra độc lập lời giải bài tập...</p>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Đang đối chiếu giả thiết đề gốc, tính toán lại từng bước biến đổi, kiểm tra điều kiện xác định và đáp số cuối cùng.
                  </p>
                </div>
              </div>
            )}

            {verifyError && !isVerifyingSolution && (
              <ApiErrorBanner
                error={verifyError}
                onDismiss={() => setVerifyError(null)}
                onRetry={handleVerifySolution}
              />
            )}

            {verifyResult && !isVerifyingSolution && (
              <div
                className={`rounded-xl border p-4 lg:p-5 space-y-4 shadow-xs ${
                  verifyResult.isCorrect
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-amber-50/80 border-amber-300'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        verifyResult.isCorrect
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {verifyResult.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-sm font-bold ${
                            verifyResult.isCorrect ? 'text-emerald-950' : 'text-amber-950'
                          }`}
                        >
                          {verifyResult.isCorrect
                            ? 'Kết quả AI Kiểm tra: Lời giải chính xác'
                            : 'Kết quả AI Kiểm tra: Phát hiện điểm cần rà soát / chỉnh sửa'}
                        </h4>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            verifyResult.isCorrect
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          Độ tin cậy: {verifyResult.confidenceScore}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 mt-1 leading-relaxed">
                        <ErrorBoundary>
                          <MathView content={verifyResult.summary} />
                        </ErrorBoundary>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleVerifySolution}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Chạy kiểm tra lại"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Kiểm tra lại
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerifyResult(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/70 rounded-lg transition-colors cursor-pointer"
                      title="Đóng bảng kiểm tra"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 4-point checklist */}
                {verifyResult.checks && verifyResult.checks.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {verifyResult.checks.map((chk, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs bg-white/90 flex items-start gap-2 ${
                          chk.passed ? 'border-emerald-200' : 'border-rose-200'
                        }`}
                      >
                        {chk.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800">{chk.criterion}</div>
                          <div className="text-slate-600 mt-0.5 leading-relaxed">
                            <ErrorBoundary>
                              <MathView content={chk.detail} />
                            </ErrorBoundary>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Detected issues */}
                {verifyResult.issues && verifyResult.issues.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-rose-800">
                      Chi tiết các lỗi / điểm cần điều chỉnh ({verifyResult.issues.length}):
                    </p>
                    <div className="space-y-2">
                      {verifyResult.issues.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-white border border-rose-200 text-xs space-y-1"
                        >
                          <div className="font-bold text-rose-700">
                            {idx + 1}. {item.step}
                          </div>
                          <div className="text-slate-700">
                            <span className="font-semibold text-rose-800">Vấn đề: </span>
                            <ErrorBoundary>
                              <MathView content={item.issue} />
                            </ErrorBoundary>
                          </div>
                          <div className="text-emerald-800">
                            <span className="font-semibold">Cách sửa chuẩn: </span>
                            <ErrorBoundary>
                              <MathView content={item.correction} />
                            </ErrorBoundary>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply corrected solution action */}
                {verifyResult.correctedSolution && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
                    <span className="text-xs text-slate-700 font-medium">
                      AI đã biên soạn lại bản lời giải chuẩn xác để thay thế các điểm sai sót vừa phát hiện.
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyCorrectedSolution}
                      disabled={hasAppliedCorrection}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                        hasAppliedCorrection
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                      }`}
                    >
                      {hasAppliedCorrection ? (
                        <>
                          <Check className="w-4 h-4" />
                          Đã cập nhật lời giải chuẩn
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          Áp dụng bản sửa chuẩn vào lời giải
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Language translation status & error */}
            {isTranslatingSolution && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-3 text-sm text-teal-900 shadow-2xs">
                <Loader2 className="w-5 h-5 animate-spin text-teal-600 shrink-0" />
                <div>
                  <p className="font-bold">
                    {solveLanguage === 'vi'
                      ? 'Đang chuyển đổi lời giải sang Tiếng Anh học thuật...'
                      : 'Đang chuyển đổi lời giải sang Tiếng Việt chuẩn...'}
                  </p>
                  <p className="text-xs text-teal-700 mt-0.5">
                    Giữ nguyên 100% công thức LaTeX, số liệu, bảng biểu và tự động chuyển đổi toàn bộ thuật ngữ Toán học tương ứng.
                  </p>
                </div>
              </div>
            )}

            {translateError && !isTranslatingSolution && (
              <ApiErrorBanner
                error={translateError}
                onDismiss={() => setTranslateError(null)}
                onRetry={() => handleSwitchSolutionLanguage(solveLanguage === 'vi' ? 'en' : 'vi')}
              />
            )}

            {/* Collapsible Bilingual Math Terminology Panel */}
            {showTerminologyPanel && (
              <div className="p-4 lg:p-5 bg-teal-50/60 border border-teal-200 rounded-xl space-y-3.5 shadow-2xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-teal-700 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-teal-950">
                        Bảng tổng hợp Từ vựng & Thuật ngữ Toán học (Tiếng Việt ⇄ Tiếng Anh)
                      </h4>
                      <p className="text-[11px] text-teal-700">
                        Tổng hợp các thuật ngữ đã chuyển đổi từ bài tập để học sinh ôn tập từ vựng chuyên ngành hoặc xuất thành file .docx đính kèm.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={termSearch}
                      onChange={(e) => setTermSearch(e.target.value)}
                      placeholder="Tìm thuật ngữ (VD: đạo hàm, asymptote)..."
                      className="px-3 py-1.5 text-xs bg-white border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-52"
                    />
                    <div className="inline-flex items-center p-0.5 bg-white border border-teal-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setTerminologyViewMode('table')}
                        className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                          terminologyViewMode === 'table' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-teal-50'
                        }`}
                        title="Xem dạng Bảng tổng hợp"
                      >
                        <TableIcon className="w-3.5 h-3.5" /> Bảng
                      </button>
                      <button
                        type="button"
                        onClick={() => setTerminologyViewMode('cards')}
                        className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                          terminologyViewMode === 'cards' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-teal-50'
                        }`}
                        title="Xem dạng Thẻ từ vựng"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" /> Thẻ
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTerminologyPanel(false)}
                      className="p-1.5 text-teal-700 hover:text-teal-950 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                      title="Đóng bảng thuật ngữ"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Action bar for exporting / attaching glossary */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-2 border-b border-teal-200/80">
                  <span className="text-xs font-semibold text-teal-900">
                    Đang hiển thị: <span className="text-teal-700 font-bold">{displayedTerminology.length} thuật ngữ chuyên ngành</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyGlossaryTable}
                      disabled={displayedTerminology.length === 0}
                      className="px-3 py-1.5 bg-white hover:bg-teal-50 border border-teal-300 text-teal-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {copiedGlossaryTable ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedGlossaryTable ? 'Đã chép bảng!' : 'Sao chép bảng'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAppendGlossaryToSolution}
                      disabled={displayedTerminology.length === 0}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                      title="Chèn bảng tổng hợp từ vựng này vào cuối lời giải để xuất chung 1 file Word/PDF"
                    >
                      {glossaryAppended ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                      <span>{glossaryAppended ? 'Đã ghép vào cuối bài giải!' : 'Ghép bảng vào bài giải'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportGlossaryDocx}
                      disabled={isExportingGlossaryDocx || displayedTerminology.length === 0}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                      title="Tải xuống file Word (.docx) riêng chứa bảng thuật ngữ Toán học chuẩn A4 cho học sinh ôn tập"
                    >
                      {isExportingGlossaryDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>Xuất file ôn tập (.docx)</span>
                    </button>
                  </div>
                </div>

                {displayedTerminology.length > 0 ? (
                  terminologyViewMode === 'table' ? (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto bg-white border border-teal-200 rounded-lg shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-teal-700 text-white sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3 font-bold text-center w-12 border-r border-teal-600">STT</th>
                            <th className="py-2.5 px-3 font-bold border-r border-teal-600">Thuật ngữ Tiếng Việt</th>
                            <th className="py-2.5 px-3 font-bold border-r border-teal-600">Thuật ngữ Tiếng Anh (English Term)</th>
                            <th className="py-2.5 px-3 font-bold text-center w-36">Chuyên đề</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-teal-100">
                          {displayedTerminology.map((term, idx) => (
                            <tr
                              key={`${term.vi}-${idx}`}
                              className={idx % 2 === 1 ? 'bg-teal-50/40 hover:bg-teal-50' : 'bg-white hover:bg-teal-50/70'}
                            >
                              <td className="py-2 px-3 text-center font-medium text-slate-500 border-r border-teal-100">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800 border-r border-teal-100">
                                {term.vi}
                              </td>
                              <td className="py-2 px-3 font-bold text-emerald-700 border-r border-teal-100">
                                {term.en}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">
                                  {term.category}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                      {displayedTerminology.map((term, idx) => (
                        <div
                          key={`${term.vi}-${idx}`}
                          className="p-2.5 bg-white border border-teal-100 rounded-lg shadow-2xs flex flex-col justify-between gap-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800">{term.vi}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                              {term.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <ArrowLeftRight className="w-3 h-3 text-teal-500 shrink-0" />
                            <span>{term.en}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-600 italic py-2">
                    Không tìm thấy thuật ngữ phù hợp với từ khóa "{termSearch}".
                  </p>
                )}
              </div>
            )}

            {/* Student Mistake Analysis & Next-Step Hints inside Solution View */}
            {isAnalyzingMistakes && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-sm text-amber-950 shadow-2xs">
                <Loader2 className="w-5 h-5 animate-spin text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">AI đang phân tích sai lầm phổ biến của học sinh & tạo gợi ý từng bước...</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Đang tổng hợp các lỗi biến đổi thường gặp, câu hỏi gợi mở "Bước tiếp theo" và chẩn đoán hướng làm bài.
                  </p>
                </div>
              </div>
            )}

            {mistakeAnalysisError && !isAnalyzingMistakes && (
              <ApiErrorBanner
                error={mistakeAnalysisError}
                onDismiss={() => setMistakeAnalysisError(null)}
                onRetry={() => handleAnalyzeMistakes()}
              />
            )}

            {mistakeAnalysisResult && !isAnalyzingMistakes && (
              <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 p-4 lg:p-5 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-200 pb-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Phân tích Sai lầm Phổ biến & Chuỗi Gợi ý "Bước tiếp theo"
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Hỗ trợ giáo viên nhắc nhở các bẫy mất điểm và dẫn dắt học sinh tự suy luận từng bước trước khi xem đáp số.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleAppendMistakesToSolution}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Chèn mục Sai lầm phổ biến & Gợi ý từng bước vào cuối bài giảng để xuất Word/PDF"
                    >
                      {mistakesAppended ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                      <span>{mistakesAppended ? 'Đã ghép vào bài giảng!' : 'Ghép vào bài giảng'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnalyzeMistakes()}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Phân tích lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMistakeAnalysisResult(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg cursor-pointer"
                      title="Đóng bảng phân tích"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {mistakeAnalysisResult.attemptDiagnosis && (
                  <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950">
                    <span className="font-bold text-indigo-800">Nhận xét trọng tâm: </span>
                    <ErrorBoundary><MathView content={mistakeAnalysisResult.attemptDiagnosis} /></ErrorBoundary>
                  </div>
                )}

                {/* Student attempt input inside solution mode */}
                <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Kiểm tra & chẩn đoán bài làm thử của học sinh (tùy chọn):
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={studentAttemptText}
                      onChange={(e) => setStudentAttemptText(e.target.value)}
                      placeholder="Nhập bước giải sai hoặc chỗ học sinh đang bí..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAnalyzeMistakes(studentAttemptText)}
                      disabled={isAnalyzingMistakes || !studentAttemptText.trim()}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Chẩn đoán bước làm</span>
                    </button>
                  </div>
                </div>

                {/* Common Mistakes Cards */}
                {mistakeAnalysisResult.commonMistakes && mistakeAnalysisResult.commonMistakes.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wide text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Sai lầm phổ biến cần cảnh báo học sinh ({mistakeAnalysisResult.commonMistakes.length})</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {mistakeAnalysisResult.commonMistakes.map((m, idx) => (
                        <div key={idx} className="p-3 bg-white border border-rose-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-rose-900">{idx + 1}. {m.title}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                              m.severity === 'high'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {m.severity === 'high' ? 'Rất hay sai' : 'Cần lưu ý'}
                            </span>
                          </div>
                          {m.wrongExample && (
                            <div className="p-2 bg-rose-50/70 rounded-lg border border-rose-100 text-rose-900">
                              <span className="font-semibold">Lỗi hay gặp: </span>
                              <ErrorBoundary><MathView content={m.wrongExample} /></ErrorBoundary>
                            </div>
                          )}
                          <div className="text-slate-700">
                            <span className="font-semibold text-slate-900">Nguyên nhân: </span>
                            <ErrorBoundary><MathView content={m.whyWrong} /></ErrorBoundary>
                          </div>
                          <div className="text-emerald-800">
                            <span className="font-semibold">Cách tránh: </span>
                            <ErrorBoundary><MathView content={m.howToAvoid} /></ErrorBoundary>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progressive Next-Step Hints */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="text-xs font-bold uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span>Gợi ý "Bước tiếp theo" dẫn dắt từng phần ({Math.min(revealedHintCount, mistakeAnalysisResult.nextStepHints.length)} / {mistakeAnalysisResult.nextStepHints.length})</span>
                    </h5>
                    <div className="flex items-center gap-2">
                      {revealedHintCount < mistakeAnalysisResult.nextStepHints.length && (
                        <>
                          <button
                            type="button"
                            onClick={() => setRevealedHintCount(prev => Math.min(mistakeAnalysisResult.nextStepHints.length, prev + 1))}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Xem gợi ý bước tiếp theo →
                          </button>
                          <button
                            type="button"
                            onClick={() => setRevealedHintCount(mistakeAnalysisResult.nextStepHints.length)}
                            className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Hiện tất cả
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {mistakeAnalysisResult.nextStepHints.slice(0, revealedHintCount).map((step, idx) => (
                      <div key={idx} className="p-3 bg-white border border-amber-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                        <div className="font-bold text-amber-900">
                          Bước {step.stepNumber}: {step.title}
                        </div>
                        {step.guidingQuestion && (
                          <div className="text-indigo-900 bg-indigo-50/70 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                            <span className="font-bold">Câu hỏi gợi mở: </span>
                            <ErrorBoundary><MathView content={step.guidingQuestion} /></ErrorBoundary>
                          </div>
                        )}
                        <div className="text-slate-800">
                          <span className="font-bold text-amber-900">Gợi ý bước tiếp theo: </span>
                          <ErrorBoundary><MathView content={step.hint} /></ErrorBoundary>
                        </div>
                        {step.keyFormula && (
                          <div className="text-emerald-900 bg-emerald-50/70 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                            <span className="font-bold">Công thức cần nhớ: </span>
                            <ErrorBoundary><MathView content={step.keyFormula} /></ErrorBoundary>
                          </div>
                        )}
                        {step.checkpoint && (
                          <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                            <b>Tự kiểm tra:</b> <ErrorBoundary><MathView content={step.checkpoint} /></ErrorBoundary>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Markdown Solution Document View */}
            <div className="bg-slate-50 rounded-xl p-6 lg:p-8 border border-slate-200">
              <div ref={exportRef} className="markdown-body prose prose-slate max-w-none prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:text-blue-700 prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600">
                <ErrorBoundary><MathView content={solution} /></ErrorBoundary>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropperSourceImage}
        title={selectedFile?.type?.includes('pdf') ? `Cắt câu hỏi / đồ thị từ Trang ${selectedPdfPageIdx + 1}` : "Cắt ảnh đề bài / đồ thị bài toán"}
        onCrop={handleCropComplete}
        onClose={() => setIsCropperOpen(false)}
      />

      {/* Presentation Mode Modal */}
      {isPresentationMode && presentationSlides.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col">
          <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Presentation className="w-5 h-5 text-blue-400" /> Trình chiếu Bài giải</h3>
            <button 
              onClick={() => setIsPresentationMode(false)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-12 md:p-24 flex items-center justify-center">
            <div className="max-w-5xl w-full mx-auto markdown-body prose prose-invert prose-2xl prose-headings:text-white prose-p:text-slate-200 prose-li:text-slate-200 custom-presentation">
              <style>{`
                .custom-presentation { font-size: 1.5rem !important; line-height: 1.8 !important; }
                .custom-presentation h2 { font-size: 2.5rem !important; color: #60a5fa !important; margin-bottom: 2rem !important; border-bottom: 2px solid #334155; padding-bottom: 1rem; }
                .custom-presentation h3 { font-size: 2rem !important; color: #a7f3d0 !important; }
                .custom-presentation mjx-container { font-size: 1.8rem !important; }
                .custom-presentation mjx-container[display="true"] { margin: 2rem 0 !important; }
              `}</style>
              <ErrorBoundary><MathView content={presentationSlides[currentSlide]} /></ErrorBoundary>
            </div>
          </div>
          
          <div className="bg-slate-800 p-6 flex items-center justify-center gap-8 border-t border-slate-700">
            <button 
              onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
              disabled={currentSlide === 0}
              className="p-4 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <div className="flex gap-2">
              {presentationSlides.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-3 h-3 rounded-full transition-colors ${idx === currentSlide ? 'bg-blue-400' : 'bg-slate-600 hover:bg-slate-500'}`}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            <button 
              onClick={() => setCurrentSlide(prev => Math.min(presentationSlides.length - 1, prev + 1))}
              disabled={currentSlide === presentationSlides.length - 1}
              className="p-4 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}
      {/* Floating Action Buttons for Casio Calculator & GeoGebra */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 no-print">
        <button
          onClick={() => setShowGeoGebra(!showGeoGebra)}
          className="bg-slate-900 text-white hover:bg-slate-805 hover:scale-105 active:scale-95 p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all border border-slate-750"
          title="Mở Vẽ hình GeoGebra"
        >
          <span className="text-xl">📐</span>
        </button>
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="bg-slate-900 text-white hover:bg-slate-805 hover:scale-105 active:scale-95 p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all border border-slate-750"
          title="Mở Máy tính Khoa học Casio"
        >
          <Calculator className="w-6 h-6 text-emerald-400" />
        </button>
      </div>

      {showCalculator && (
        <ScientificCalculatorModal onClose={() => setShowCalculator(false)} />
      )}

      {showGeoGebra && (
        <GeoGebraDrawer
          onInsertImage={(base64) => {
            setCroppedImage(base64);
            if (solution) {
              const updated = injectCroppedImageIntoSolution(solution, base64, showInBothQuestionAndAnswer);
              setSolution(updated);
              setSolutionByLang(prev => ({
                vi: prev.vi ? injectCroppedImageIntoSolution(prev.vi, base64, showInBothQuestionAndAnswer) : prev.vi,
                en: prev.en ? injectCroppedImageIntoSolution(prev.en, base64, showInBothQuestionAndAnswer) : prev.en,
              }));
            }
            setShowGeoGebra(false);
          }}
          onClose={() => setShowGeoGebra(false)}
        />
      )}
    </div>
  );
}


export default ExerciseSolver;
