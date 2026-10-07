import { apiFetch } from '../lib/apiFetch';
import { exportHtmlToWord } from '../lib/exportUtils';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Copy, Save, Upload, X, Sparkles, Loader2, Download, Presentation, 
  ChevronLeft, ChevronRight, Maximize2, FileText, BookmarkPlus, Camera, 
  Image as ImageIcon, Send, ArrowLeft, Crop, CheckCircle2, ImagePlus, 
  Clipboard, Eye, EyeOff, RefreshCw, Trash2, Scissors, Calculator, Wand2
} from 'lucide-react';

import { MarkdownRenderer, fixMath } from "../components/MarkdownRenderer";
import { MathView } from "../components/MathView";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ImageCropperModal } from "../components/ImageCropperModal";
import { GeoGebraDrawer } from "../components/math-tools/GeoGebraDrawer";
import { ScientificCalculatorModal } from "../components/math-tools/ScientificCalculatorModal";
import { run1ClickMathFix } from "../components/math-tools/MathFormulaFixer";

import { renderAllPdfPages } from "../lib/pdfUtils";
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

import mammoth from 'mammoth';
import { printElement } from '../lib/print';
import { saveToHistory, getHistory } from '../lib/history';
import { parseApiResponse } from '../lib/utils';
import { HistoryItem } from '../types';

// Utility to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

// Helper to inject cropped image into problem stem and solution cleanly
export const injectCroppedImageIntoSolution = (rawSolution: string, imgDataUrl: string, inSolution: boolean = true): string => {
  if (!rawSolution || !imgDataUrl) return rawSolution;
  let text = rawSolution;
  const imgTag = `\n\n<img src="${imgDataUrl}" alt="Hình vẽ / Đồ thị bài toán" class="max-w-[480px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm" />\n\n`;

  // Remove existing auto-injected images to avoid duplicates when re-cropping
  text = text.replace(/<img[^>]*alt=["'](?:Hình vẽ \/ Đồ thị bài toán|Đồ thị \/ Hình vẽ minh họa lời giải|Hình minh họa đề bài|cropped_figure)[^>]*\/?>\s*/gi, '');

  // 1. Inject into Đề bài (Problem statement)
  if (text.includes('[HÌNH_ẢNH_ĐỀ_BÀI]')) {
    text = text.replace(/\[HÌNH_ẢNH_ĐỀ_BÀI\]/g, imgTag);
  } else if (/##\s*(?:Đề bài|Đề thi|Câu hỏi)/i.test(text)) {
    text = text.replace(/(##\s*(?:Đề bài|Đề thi|Câu hỏi)[^\n]*\n)([\s\S]*?)(?=\n##\s*(?:Lời giải|Đáp án|Hướng dẫn giải)|$)/i, (_m, h2, body) => {
      return `${h2}${body.trim()}${imgTag}`;
    });
  } else {
    text = `${imgTag}${text}`;
  }

  // 2. Inject into Lời giải chi tiết / Đáp án (Solution / Answer) for intuitive visual comparison
  if (inSolution) {
    if (text.includes('[HÌNH_ẢNH_ĐÁP_ÁN]')) {
      text = text.replace(/\[HÌNH_ẢNH_ĐÁP_ÁN\]/g, imgTag);
    } else if (text.includes('[HÌNH_ẢNH_LỜI_GIẢI]')) {
      text = text.replace(/\[HÌNH_ẢNH_LỜI_GIẢI\]/g, imgTag);
    } else if (/##\s*(?:Lời giải|Đáp án|Hướng dẫn giải)/i.test(text)) {
      const solIdx = text.search(/##\s*(?:Lời giải|Đáp án|Hướng dẫn giải)/i);
      const solPart = text.slice(solIdx);
      if (!solPart.includes(imgDataUrl)) {
        text = text.replace(/(##\s*(?:Lời giải|Đáp án|Hướng dẫn giải)[^\n]*\n)/i, `$1${imgTag}`);
      }
    }
  } else {
    // If turned off in solution, remove any remaining placeholders in solution
    text = text.replace(/\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]/g, '');
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

  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSimilar, setIsGeneratingSimilar] = useState(false);
  const [solution, setSolution] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

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

  // Process incoming file (image, PDF, docx, txt)
  const processIncomingFile = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setCroppedImage(null);
    setPdfPages([]);
    setSelectedPdfPageIdx(0);

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
        const pages = await renderAllPdfPages(buffer, 8, 1.5);
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
    }
  };

  const handleToggleShowInAnswer = () => {
    const nextVal = !showInBothQuestionAndAnswer;
    setShowInBothQuestionAndAnswer(nextVal);
    if (solution && croppedImage) {
      const updated = injectCroppedImageIntoSolution(solution, croppedImage, nextVal);
      setSolution(updated);
    }
  };

  const handleRemoveCroppedImage = () => {
    setCroppedImage(null);
    if (solution) {
      const updated = solution.replace(/<img[^>]*alt=["'](?:Hình vẽ \/ Đồ thị bài toán|Đồ thị \/ Hình vẽ minh họa lời giải|Hình minh họa đề bài|cropped_figure)[^>]*\/?>\s*/gi, '');
      setSolution(updated);
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
          files: fileData ? [{ data: fileData, type: mimeType }] : [],
          croppedImage: croppedImage || undefined
        })
      });

      const text = await response.text();
      const data = parseApiResponse<any>(text);
      if (!response.ok) throw new Error(data.error || 'Failed to generate similar exercise');
      
      let newSimilar = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data.result));
      if (croppedImage) {
        newSimilar = injectCroppedImageIntoSolution(newSimilar, croppedImage, showInBothQuestionAndAnswer);
      }
      setSolution(newSimilar);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã xảy ra lỗi khi tạo bài tập tương tự. Vui lòng thử lại.');
    } finally {
      setIsGeneratingSimilar(false);
    }
  };
  
  const handleSolve = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn file bài tập trước.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSolution('');

    try {
      let fileData = '';
      let mimeType = selectedFile.type;

      if (selectedFile.name.endsWith('.docx')) {
        const text = await processDocx(selectedFile);
        fileData = btoa(unescape(encodeURIComponent(text)));
        mimeType = 'text/plain';
      } else {
        fileData = await fileToBase64(selectedFile);
      }

      const response = await apiFetch('/api/solve-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{ data: fileData, type: mimeType }],
          croppedImage: croppedImage || undefined
        })
      });

      if (!response.ok) {
        const text = await response.text();
        const data = parseApiResponse<any>(text);
        throw new Error(data.error || 'Có lỗi xảy ra khi xử lý file');
      }

      const text = await response.text();
      const data = parseApiResponse<any>(text);
      let newSolution = typeof data.result === 'string' 
        ? data.result 
        : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || (data.result ? JSON.stringify(data.result) : ''));
      newSolution = (newSolution || '').replace(/\s*(?:undefined|null)\s*$/gi, '').trim();

      // Ensure cropped image is injected into both Đề bài and Lời giải chi tiết
      if (croppedImage) {
        newSolution = injectCroppedImageIntoSolution(newSolution, croppedImage, showInBothQuestionAndAnswer);
      }

      setSolution(newSolution);
      saveToHistory({
        type: "GBT",
        grade: 0,
        subject: "Chung",
        lessonName: selectedFile ? "Giải bài tập: " + selectedFile.name : "Giải bài tập mới",
        content: newSolution
      });
      setHistoryItems(getHistory().filter(item => item.type === 'GBT'));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!solution) return;
    saveToHistory({
      type: "GBT",
      grade: 0,
      subject: "Chung",
      lessonName: selectedFile ? "Giải bài tập: " + selectedFile.name : "Giải bài tập",
      content: solution
    });
    alert("Đã lưu vào thư viện lịch sử thành công!");
  };

  const handleExportPDF = () => {
    printElement(exportRef.current, "LoiGiai_ChiTiet");
  };

  const handleExportWord = (keepLatex: boolean = false) => {
    if (!solution || !exportRef.current) return;
    exportHtmlToWord(exportRef.current, `LoiGiai_${new Date().getTime()}${keepLatex ? '_LaTeX' : ''}.doc`, keepLatex);
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
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Trợ lý Giải Bài Tập Thông Minh</h2>
        
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
                    setSolution(item.content);
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
                  <div className="bg-blue-100 p-4 rounded-full mb-3">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-1">Tải lên hoặc chụp ảnh đề bài</h3>
                  <p className="text-slate-500 mb-5 text-sm">Hỗ trợ file ảnh (.png, .jpg), PDF, Word (.docx), hoặc phím tắt dán <b>Ctrl+V</b></p>
                  
                  <div className="flex flex-wrap justify-center items-center gap-2.5">
                    <button 
                      type="button"
                      className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-xs text-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" /> Chọn File
                    </button>
                    <button 
                      type="button"
                      className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-xs text-sm"
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
                  </div>
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
                            <img src={pageData} alt={`Trang ${idx + 1}`} className="w-14 h-18 object-cover rounded bg-white mb-1 shadow-2xs" />
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
                        <img src={croppedImage} alt="Ảnh đã cắt" className="max-h-48 object-contain rounded" />
                      </div>
                      <p className="text-[11px] text-emerald-800 text-center font-medium">
                        ✨ Ảnh này sẽ được tự động chèn vào cả <b>Đề bài</b> và <b>Lời giải chi tiết</b> để giáo viên và học sinh đối chiếu trực quan.
                      </p>
                    </div>
                  )}

                  {/* Solver Action Trigger */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                    <button 
                      type="button"
                      className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-medium transition-colors"
                      onClick={() => { setSelectedFile(null); setCroppedImage(null); setCropperSourceImage(''); setPdfPages([]); }}
                    >
                      Hủy
                    </button>
                    <button 
                      type="button"
                      className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm text-sm"
                      onClick={handleSolve}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isUploading ? 'Đang phân tích & giải bài...' : 'Giải Bài Tập Ngay'}
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
                  Nếu đề bài có đồ thị hàm số, bảng biến thiên hay hình học không gian, hãy nhấn <b>Cắt ảnh đề bài / đồ thị</b> để AI tự động đính kèm hình ảnh sắc nét vào cả <b>Đề bài</b> và <b>Lời giải chi tiết</b>. Khi xuất ra file Word (.doc), hình ảnh và công thức Toán sẽ được giữ nguyên 100%.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-lg text-sm text-center border border-rose-200">
                {error}
              </div>
            )}
          </div>
        )}

        {solution && (
          <div className="space-y-4">
            {/* Solution Header Toolbar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSolution(''); }}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Làm bài khác
                </button>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Lời giải chi tiết
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                  onClick={() => {
                    setSolution(prev => run1ClickMathFix(prev));
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all rounded-lg shadow-xs text-xs font-bold cursor-pointer active:scale-95"
                  title="Tự động sửa lỗi rách dấu $, lỗi dính chữ và lỗi ký hiệu KaTeX trong lời giải"
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
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Word
                  </button>
                  <button 
                    onClick={() => handleExportWord(true)}
                    className="flex items-center gap-1 px-2.5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-xs text-xs font-semibold"
                    title="Giữ nguyên mã LaTeX để dùng MathType"
                  >
                    LaTeX
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
                .custom-presentation .katex { font-size: 1.8rem !important; }
                .custom-presentation .katex-display { margin: 2rem 0 !important; }
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
