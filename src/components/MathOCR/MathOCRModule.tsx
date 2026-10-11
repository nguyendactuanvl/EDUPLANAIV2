import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Copy, Crop, RefreshCw, Check, Sparkles, FileText, 
  Eye, Code2, AlertCircle, FileUp, Image as ImageIcon, CheckCircle2, 
  HelpCircle, Layers, Wand2, ArrowRight
} from 'lucide-react';
import { MathView } from '../MathView';
import { MathOCRCropModal } from './MathOCRCropModal';
import { ToastMessage } from './types';
import { FeatureQuickGuideBanner } from '../FeatureQuickGuideBanner';

// Load PDF.JS dynamically
const loadPdfJS = async () => {
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error("Không thể tải thư viện hiển thị PDF."));
    document.head.appendChild(script);
  });
};

export const MathOCRModule: React.FC = () => {
  // State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedImageSrc, setCroppedImageSrc] = useState<string | null>(null);
  const [isCroppingModalOpen, setIsCroppingModalOpen] = useState(false);
  
  // PDF processing states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPdfPage, setSelectedPdfPage] = useState<number>(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // OCR Processing
  const [isLoadingOCR, setIsLoadingOCR] = useState(false);
  const [latexOutput, setLatexOutput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const activeImage = croppedImageSrc || imageSrc;

  const showToast = (title: string, description?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Global Paste Listener (Ctrl + V anywhere)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              const base64 = evt.target?.result as string;
              setImageSrc(base64);
              setCroppedImageSrc(null);
              showToast('Đã dán ảnh từ Clipboard!', 'Đang chuẩn bị nhận dạng công thức...', 'info');
              runMathOCR(base64);
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Handle Image File Upload
  const handleImageUpload = (file: File) => {
    if (file.type === 'application/pdf') {
      processPdfFile(file);
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('File không hợp lệ', 'Vui lòng chọn file hình ảnh (PNG, JPG, WebP) hoặc PDF.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImageSrc(base64);
      setCroppedImageSrc(null);
      runMathOCR(base64);
    };
    reader.readAsDataURL(file);
  };

  // Render PDF pages to images
  const processPdfFile = async (file: File) => {
    try {
      setIsLoadingPdf(true);
      setPdfFile(file);
      showToast('Đang xử lý file PDF...', 'Vui lòng chờ trong giây lát', 'info');

      const pdfjsLib: any = await loadPdfJS();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const renderedPages: string[] = [];
      const numPages = Math.min(pdf.numPages, 10); // Process up to first 10 pages

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        renderedPages.push(canvas.toDataURL('image/png'));
      }

      setPdfPages(renderedPages);
      setSelectedPdfPage(0);
      setIsLoadingPdf(false);

      if (renderedPages.length > 0) {
        setImageSrc(renderedPages[0]);
        setCroppedImageSrc(null);
        runMathOCR(renderedPages[0]);
      }
    } catch (err: any) {
      console.error("PDF Render Error:", err);
      setIsLoadingPdf(false);
      showToast('Lỗi đọc file PDF', err.message || 'Không thể render các trang PDF', 'error');
    }
  };

  // Run Math OCR API Call
  const runMathOCR = async (base64Img: string) => {
    setIsLoadingOCR(true);
    setLatexOutput('');

    try {
      const apiKey = localStorage.getItem('eduplan_gemini_api_key_v2') || '';
      const response = await fetch('/api/math-ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType: 'image/png'
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Lỗi nhận dạng công thức Toán.');
      }

      setLatexOutput(data.latex || '');
      setIsLoadingOCR(false);
      showToast('Nhận dạng thành công!', 'Công thức và bảng biểu đã được chuyển sang mã LaTeX.', 'success');

    } catch (error: any) {
      console.error("Math OCR Error:", error);
      setIsLoadingOCR(false);
      showToast('Lỗi nhận dạng Math OCR', error.message || 'Vui lòng thử lại với ảnh rõ nét hơn.', 'error');
    }
  };

  // Copy Formatted LaTeX for Word / MathType (Toggle TeX Alt + \)
  const handleCopyForWordMathType = () => {
    if (!latexOutput) return;

    // Clean and ensure proper dollar sign delimiters for Word MathType Toggle TeX
    let wordFormatted = latexOutput.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(wordFormatted).then(() => {
      showToast(
        'Đã sao chép cho Word (Toggle TeX)!',
        'Dán vào Microsoft Word và bấm phím tắt Alt + \\ để chuyển tự động thành công thức MathType.',
        'success'
      );
    });
  };

  // Copy Raw LaTeX Code
  const handleCopyRawLaTeX = () => {
    if (!latexOutput) return;
    navigator.clipboard.writeText(latexOutput).then(() => {
      showToast('Đã sao chép mã LaTeX gốc!', 'Sẵn sàng dán vào Overleaf, TeXStudio hoặc LaTeX editor.', 'success');
    });
  };

  // Reset All
  const handleReset = () => {
    setImageSrc(null);
    setCroppedImageSrc(null);
    setLatexOutput('');
    setPdfFile(null);
    setPdfPages([]);
    setSelectedPdfPage(0);
    setIsEditingMode(false);
  };

  // Quick Samples for Testing
  const loadSample = (sampleType: 'calculus' | 'table' | 'geometry') => {
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 750, 300);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "Times New Roman", serif';

    if (sampleType === 'calculus') {
      ctx.fillText('Câu 1. Tính tích phân sau:', 40, 60);
      ctx.font = 'italic 28px "Times New Roman", serif';
      ctx.fillText('I = ∫ (2x + 1) e^x dx  từ 0 đến 1', 60, 130);
      ctx.fillText('Phương trình đạo hàm: f\'(x) + 2f(x) = sin(x) + cos(x)', 60, 210);
    } else if (sampleType === 'table') {
      ctx.fillText('Bảng biến thiên hàm số y = f(x):', 40, 50);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(40, 80, 670, 170);
      ctx.beginPath();
      ctx.moveTo(40, 130); ctx.lineTo(710, 130);
      ctx.moveTo(40, 180); ctx.lineTo(710, 180);
      ctx.moveTo(140, 80); ctx.lineTo(140, 250);
      ctx.stroke();

      ctx.font = '20px sans-serif';
      ctx.fillText('x', 70, 110); ctx.fillText('-∞', 180, 110); ctx.fillText('1', 350, 110); ctx.fillText('3', 520, 110); ctx.fillText('+∞', 650, 110);
      ctx.fillText('y\'', 70, 160); ctx.fillText('+', 260, 160); ctx.fillText('0', 350, 160); ctx.fillText('-', 430, 160); ctx.fillText('0', 520, 160); ctx.fillText('+', 600, 160);
      ctx.fillText('y', 70, 220); ctx.fillText('-∞ ↗ 5 ↘ -2 ↗ +∞', 200, 220);
    } else {
      ctx.fillText('Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a.', 40, 60);
      ctx.font = '20px "Times New Roman", serif';
      ctx.fillText('Biết SA ⊥ (ABCD) và SA = a√3. Tính thể tích khối chóp:', 40, 120);
      ctx.font = 'bold 24px "Times New Roman", serif';
      ctx.fillText('V_{S.ABCD} = (1/3) * S_{ABCD} * SA = (a^3 * √3) / 3', 60, 190);
    }

    const sampleBase64 = canvas.toDataURL('image/png');
    setImageSrc(sampleBase64);
    setCroppedImageSrc(null);
    runMathOCR(sampleBase64);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md pointer-events-auto animate-in slide-in-from-top-5 fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-sky-950/90 border-sky-500/50 text-sky-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <h4 className="font-bold text-sm text-white">{toast.title}</h4>
                {toast.description && (
                  <p className="text-xs mt-1 leading-relaxed opacity-90">{toast.description}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <FeatureQuickGuideBanner sectionId="math_ocr" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
              <Wand2 className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">EduPlan AI MathOCR</h1>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full uppercase">
                  Mathpix Equivalent
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Trích xuất công thức Toán học, hình vẽ & bảng biểu từ ảnh chụp/PDF sang mã LaTeX chuẩn xác cao cho Microsoft Word (Alt + \) & MathType.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => showToast('Mẹo dùng Ctrl + V', 'Bạn có thể chụp màn hình (Win + Shift + S) rồi bấm Ctrl + V ở bất kỳ đâu trên ứng dụng để nhận dạng ngay lập tức!', 'info')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Hướng dẫn dùng</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="max-w-7xl mx-auto">
        {!activeImage ? (
          /* Step 1: Dropzone & Upload Area */
          <div className="space-y-6">
            <div
              ref={dropzoneRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleImageUpload(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/80 bg-slate-900/60 hover:bg-slate-900 transition-all rounded-3xl p-12 text-center cursor-pointer group relative shadow-2xl overflow-hidden"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />

              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-5 bg-slate-800 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all rounded-2xl text-emerald-400 border border-slate-700 group-hover:border-emerald-500/40">
                  <Upload className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Kéo & thả file ảnh (.png, .jpg) hoặc file PDF bài giảng vào đây
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Hoặc bấm để chọn file từ máy tính. Bạn cũng có thể bấm <span className="font-bold text-emerald-400">Ctrl + V</span> để dán trực tiếp ảnh từ Clipboard!
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-medium border border-slate-700">
                    📋 Dán Ctrl + V từ Snipping Tool
                  </span>
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-medium border border-slate-700">
                    📄 Tải file PDF bài giảng
                  </span>
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-medium border border-slate-700">
                    🖼️ File ảnh PNG, JPG, WebP
                  </span>
                </div>
              </div>
            </div>

            {/* Built-in Sample Test Dataset */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Dữ liệu mẫu kiểm thử nhanh Math OCR (One-Click Test)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => loadSample('calculus')}
                  className="p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-left transition-all group"
                >
                  <div className="font-bold text-sm text-emerald-400 group-hover:text-emerald-300">
                    Sample 1: Tích phân & Đạo hàm
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Công thức Tích phân hàm ẩn $I = \int (2x+1)e^x dx$ và phương trình vi phân.
                  </p>
                </button>

                <button
                  onClick={() => loadSample('table')}
                  className="p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-left transition-all group"
                >
                  <div className="font-bold text-sm text-emerald-400 group-hover:text-emerald-300">
                    Sample 2: Bảng biến thiên hàm số
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Trích xuất bảng biến thiên đa hàng thành môi trường LaTeX array chuẩn.
                  </p>
                </button>

                <button
                  onClick={() => loadSample('geometry')}
                  className="p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-left transition-all group"
                >
                  <div className="font-bold text-sm text-emerald-400 group-hover:text-emerald-300">
                    Sample 3: Hình học & Thể tích
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Ký hiệu vuông góc $\perp$, căn thức $\sqrt{3}$, chỉ số dưới và phân số.
                  </p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: Dual Preview Workspace */
          <div className="space-y-6">
            {/* PDF Pages Picker Bar if PDF loaded */}
            {pdfPages.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 overflow-x-auto custom-scrollbar">
                <span className="text-xs font-bold text-emerald-400 shrink-0 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Chọn trang PDF ({pdfPages.length} trang):
                </span>
                <div className="flex items-center gap-2">
                  {pdfPages.map((pageImg, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedPdfPage(idx);
                        setImageSrc(pageImg);
                        setCroppedImageSrc(null);
                        runMathOCR(pageImg);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        selectedPdfPage === idx
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Trang {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyForWordMathType}
                  disabled={!latexOutput || isLoadingOCR}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  title="Copy công thức chuẩn $...$ hoặc $$...$$ dán vào Word bấm Alt + \ chuyển MathType ngay lập tức!"
                >
                  <Copy className="w-4 h-4" />
                  <span>📋 Sao chép cho Word (Toggle TeX Alt + \)</span>
                </button>

                <button
                  onClick={handleCopyRawLaTeX}
                  disabled={!latexOutput || isLoadingOCR}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
                  title="Sao chép nguyên bản cho Overleaf / TeXStudio"
                >
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span>Copy Mã Gốc</span>
                </button>

                <button
                  onClick={() => setIsCroppingModalOpen(true)}
                  disabled={!imageSrc || isLoadingOCR}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
                  title="Cắt vùng công thức hoặc một câu cụ thể"
                >
                  <Crop className="w-4 h-4 text-amber-400" />
                  <span>Cắt vùng ảnh</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => runMathOCR(activeImage)}
                  disabled={isLoadingOCR}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingOCR ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Nhận dạng lại</span>
                </button>

                <button
                  onClick={handleReset}
                  className="px-3.5 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>📷 Tải ảnh khác</span>
                </button>
              </div>
            </div>

            {/* Dual Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Panel: Original / Cropped Image */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Ảnh gốc / Vùng đã chọn</span>
                    {croppedImageSrc && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                        Đã cắt
                      </span>
                    )}
                  </div>

                  {croppedImageSrc && (
                    <button
                      onClick={() => {
                        setCroppedImageSrc(null);
                        if (imageSrc) runMathOCR(imageSrc);
                      }}
                      className="text-xs text-amber-400 hover:underline font-semibold"
                    >
                      Bỏ cắt (Dùng ảnh gốc)
                    </button>
                  )}
                </div>

                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 flex items-center justify-center p-4 min-h-[320px] max-h-[550px]">
                  <img
                    src={activeImage}
                    alt="Math OCR Target"
                    className="max-w-full max-h-[500px] object-contain rounded-lg shadow-md"
                  />
                  {isLoadingOCR && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold text-emerald-400 animate-pulse">
                        Đang phân tích trí tuệ nhân tạo Gemini Multimodal OCR...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Dual Tabs Preview vs Code */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        activeTab === 'preview'
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span>1. Hiển thị trực quan (MathJax)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('code')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        activeTab === 'code'
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Code2 className="w-4 h-4" />
                      <span>2. Mã LaTeX & Word</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsEditingMode(!isEditingMode)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                      isEditingMode
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {isEditingMode ? '✏️ Đang sửa' : '✏️ Chỉnh sửa mã'}
                  </button>
                </div>

                {/* Tab 1: Rendered MathJax Preview */}
                {activeTab === 'preview' && (
                  <div className="min-h-[320px] max-h-[500px] overflow-y-auto p-5 bg-slate-950 border border-slate-800/80 rounded-xl custom-scrollbar leading-relaxed">
                    {isLoadingOCR ? (
                      <div className="space-y-4 animate-pulse p-4">
                        <div className="h-4 bg-slate-800 rounded w-3/4" />
                        <div className="h-4 bg-slate-800 rounded w-1/2" />
                        <div className="h-12 bg-slate-800 rounded w-full" />
                        <div className="h-4 bg-slate-800 rounded w-2/3" />
                      </div>
                    ) : latexOutput ? (
                      <MathView content={latexOutput} />
                    ) : (
                      <div className="text-center text-slate-500 py-16 text-xs">
                        Chưa có dữ liệu nhận dạng. Vui lòng tải ảnh lên hoặc bấm dán Ctrl + V.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Code Editor */}
                {activeTab === 'code' && (
                  <div className="min-h-[320px] flex flex-col space-y-2">
                    <textarea
                      value={latexOutput}
                      onChange={(e) => setLatexOutput(e.target.value)}
                      placeholder="Mã LaTeX nhận dạng sẽ hiển thị ở đây..."
                      rows={14}
                      className="w-full font-mono text-xs p-4 bg-slate-950 text-emerald-300 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed custom-scrollbar resize-none"
                    />
                    <span className="text-[10px] text-slate-500 block text-right">
                      *Bạn có thể trực tiếp sửa mã LaTeX tại đây, bản xem trước trực quan sẽ tự động cập nhật!
                    </span>
                  </div>
                )}

                {/* Bottom Instruction Alert Box */}
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300/90 leading-relaxed flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">
                      Cách dán vào Microsoft Word chuyển thành MathType ngay lập tức:
                    </span>
                    1. Bấm nút <b className="text-white">[📋 Sao chép cho Word (Toggle TeX)]</b>.<br/>
                    2. Sang Microsoft Word, bấm <b className="text-white">Ctrl + V</b> để dán.<br/>
                    3. Bôi đen đoạn vừa dán (hoặc đặt con trỏ chuột) và bấm tổ hợp phím <b className="text-white">Alt + \</b>. Công thức sẽ tự động biến thành công thức MathType / Word Equation chuẩn đẹp không bị lỗi font!
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Cropper Modal */}
      {imageSrc && (
        <MathOCRCropModal
          isOpen={isCroppingModalOpen}
          imageUrl={imageSrc}
          onClose={() => setIsCroppingModalOpen(false)}
          onCropComplete={(croppedData) => {
            setCroppedImageSrc(croppedData);
            setIsCroppingModalOpen(false);
            runMathOCR(croppedData);
          }}
        />
      )}
    </div>
  );
};
