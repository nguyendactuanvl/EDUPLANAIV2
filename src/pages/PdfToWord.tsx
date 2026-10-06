import { apiFetch } from '../lib/apiFetch';
import { exportHtmlToWord } from '../lib/exportUtils';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, FileText, Loader2, Download, AlertCircle, 
  Clipboard, CheckCircle2, Clock, Layers, Sliders, Sparkles, Zap,
  Image as ImageIcon, Scissors, PlusCircle
} from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { parseApiResponse, normalizeOcrChoicesAndFormatting } from '../lib/utils';
import { getPdfTotalPages, renderPdfPageRange, renderPdfPageToDataUrl } from '../lib/pdfUtils';
import { ImageCropperModal } from '../components/ImageCropperModal';
import mammoth from 'mammoth';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

type PageMode = 'recommended' | 'range' | 'all';

export function PdfToWord() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileArrayBuffer, setFileArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(1);
  
  // Page selection options
  const [pageMode, setPageMode] = useState<PageMode>('recommended');
  const [fromPage, setFromPage] = useState<number>(1);
  const [toPage, setToPage] = useState<number>(5);

  // Conversion state & Progress tracking
  const [isUploading, setIsUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [estimatedTimeSec, setEstimatedTimeSec] = useState<number>(15);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  const [resultText, setResultText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // PDF Page image cache for cropping
  const [pdfPageImages, setPdfPageImages] = useState<{ [pageNum: number]: string }>({});
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperSourceImage, setCropperSourceImage] = useState<string>('');
  const [targetReplacePlaceholder, setTargetReplacePlaceholder] = useState<string | null>(null);
  
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<any>(null);

  // Clean up progress timer
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Detect total pages when file is selected
  const handleInspectFile = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setResultText('');
    setPdfPageImages({});

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      try {
        const buffer = await file.arrayBuffer();
        setFileArrayBuffer(buffer);
        const total = await getPdfTotalPages(buffer.slice(0));
        setPdfTotalPages(total);

        if (total <= 5) {
          setPageMode('all');
          setFromPage(1);
          setToPage(total);
        } else {
          setPageMode('recommended');
          setFromPage(1);
          setToPage(Math.min(5, total));
        }
      } catch (err) {
        console.warn('Could not inspect PDF total pages:', err);
        setPdfTotalPages(1);
        setPageMode('all');
      }
    } else {
      setFileArrayBuffer(null);
      setPdfTotalPages(1);
      setPageMode('all');
      setFromPage(1);
      setToPage(1);
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        setPdfPageImages({ 1: `data:${file.type || 'image/png'};base64,${base64}` });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleInspectFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleInspectFile(file);
    }
  };

  // Clipboard Paste Support (Ctrl + V / Cmd + V)
  const processClipboardData = (clipboardData: DataTransfer | null) => {
    if (!clipboardData || !clipboardData.items) return false;
    const items = clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const namedFile = new File([file], `Anh_Dan_Clipboard_${dateStr}.png`, { type: file.type || 'image/png' });
          handleInspectFile(namedFile);
          return true;
        }
      }
    }
    return false;
  };

  const handlePasteEvent = (e: React.ClipboardEvent) => {
    if (processClipboardData(e.clipboardData)) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    const onGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (processClipboardData(e.clipboardData)) {
        e.preventDefault();
      }
    };

    window.addEventListener('paste', onGlobalPaste);
    return () => {
      window.removeEventListener('paste', onGlobalPaste);
    };
  }, []);

  const processDocx = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        mammoth.convertToHtml({arrayBuffer: arrayBuffer})
          .then(function(result){ resolve(result.value); })
          .catch(function(err) { reject(err); });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Start real-time progress animation
  const startProgressTracking = (targetPages: number) => {
    const estimatedSec = Math.max(10, Math.round(targetPages * 4.5));
    setEstimatedTimeSec(estimatedSec);
    setElapsedSec(0);
    setProgressPercent(5);
    setProgressStatus(`📄 Đang khởi tạo và chuẩn bị phân tích ${targetPages} trang...`);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSec(elapsed);

      // Smooth percentage calculation up to 96%
      const ratio = elapsed / estimatedSec;
      let currentPercent = Math.min(96, Math.round(ratio * 90 + 5));

      if (currentPercent < 25) {
        setProgressStatus(`📄 Đang đọc và tách trang PDF từ trang ${fromPage} đến trang ${toPage}...`);
      } else if (currentPercent < 55) {
        setProgressStatus(`🧮 Đang bóc tách hình ảnh, chữ số và công thức Toán/Lý/Hóa...`);
      } else if (currentPercent < 80) {
        setProgressStatus(`📝 Đang chuẩn hóa cấu trúc LaTeX, phương án A, B, C, D và bảng biểu...`);
      } else {
        setProgressStatus(`✨ Đang kiểm tra định dạng và tổng hợp văn bản Word (.docx)...`);
      }

      setProgressPercent(currentPercent);
    }, 400);
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn file trước.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResultText('');

    const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
    
    // Determine target page range
    let startP = 1;
    let endP = pdfTotalPages;
    if (isPdf) {
      if (pageMode === 'recommended') {
        startP = 1;
        endP = Math.min(5, pdfTotalPages);
      } else if (pageMode === 'range') {
        startP = Math.max(1, Math.min(fromPage, pdfTotalPages));
        endP = Math.max(startP, Math.min(toPage, pdfTotalPages));
      } else {
        startP = 1;
        endP = pdfTotalPages;
      }
    }

    const pagesToProcess = isPdf ? (endP - startP + 1) : 1;
    startProgressTracking(pagesToProcess);

    try {
      let finalResult = '';

      if (isPdf && selectedFile) {
        // Multi-page PDF: Process page-by-page for 100% reliability, zero timeouts, and crisp progress tracking
        const freshBuffer = await selectedFile.arrayBuffer();
        const pageResults: string[] = [];
        const pageImagesMap: { [pageNum: number]: string } = {};

        for (let p = startP; p <= endP; p++) {
          const currentPageIndex = p - startP + 1;
          const pct = Math.min(95, Math.round(((currentPageIndex - 1) / pagesToProcess) * 90) + 8);
          setProgressPercent(pct);
          setProgressStatus(`📄 Đang bóc tách & số hóa Trang ${p}/${endP} (Tiến độ ${currentPageIndex}/${pagesToProcess} trang)...`);

          // Render only this 1 page to high-res PNG
          const { dataUrl } = await renderPdfPageToDataUrl(freshBuffer.slice(0), p, 1.5);
          pageImagesMap[p] = dataUrl;

          const singleFile = [{
            data: dataUrl.split(',')[1],
            type: 'image/png',
            name: `Trang_${p}.png`
          }];

          const response = await apiFetch('/api/pdf-to-word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: singleFile,
              pageNum: p,
              totalPages: pdfTotalPages
            })
          });

          if (!response.ok) {
            let errorData;
            let errText = await response.text();
            try {
               errorData = JSON.parse(errText);
            } catch {
               errorData = { error: errText };
            }
            let errorMsg = errorData.error || `Có lỗi xảy ra khi xử lý Trang ${p}`;
            if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
            throw new Error(errorMsg);
          }

          const text = await response.text();
          const data = parseApiResponse<any>(text);
          let pageText = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || '');
          
          if (pageText) {
            pageText = pageText.replace(/```(?:tikz|latex)?\s*\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}\s*```/gi, '\n[Hình vẽ minh họa]\n');
            pageText = pageText.replace(/```tikz[\s\S]*?```/gi, '\n[Hình vẽ minh họa]\n');
            pageText = pageText.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '\n[Hình vẽ minh họa]\n');
            pageText = normalizeOcrChoicesAndFormatting(pageText);
          }

          pageResults.push(pageText.trim());
        }

        setPdfPageImages(pageImagesMap);

        // Combine all pages with standard page separation markers
        finalResult = pageResults.map((t, idx) => {
          const currP = startP + idx;
          const nextP = currP + 1;
          const sep = idx < pageResults.length - 1 ? `\n\n--- [Hết Trang ${currP} / Sang Trang ${nextP}] ---\n\n` : '';
          return t + sep;
        }).join('');

        finalResult = normalizeOcrChoicesAndFormatting(finalResult);

      } else {
        // Single Image or DOCX
        let fileListForApi: { data: string; type: string; name: string }[] = [];
        if (selectedFile.name.endsWith('.docx')) {
          const text = await processDocx(selectedFile);
          const fileData = btoa(unescape(encodeURIComponent(text)));
          fileListForApi = [{ data: fileData, type: 'text/plain', name: selectedFile.name }];
        } else {
          // Image
          const fileData = await fileToBase64(selectedFile);
          fileListForApi = [{ data: fileData, type: selectedFile.type || 'image/png', name: selectedFile.name }];
        }

        const response = await apiFetch('/api/pdf-to-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: fileListForApi
          })
        });

        if (!response.ok) {
          let errorData;
          let errText = await response.text();
          try {
             errorData = JSON.parse(errText);
          } catch {
             errorData = { error: errText };
          }
          let errorMsg = errorData.error || 'Có lỗi xảy ra khi xử lý file';
          if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
          throw new Error(errorMsg);
        }

        const text = await response.text();
        const data = parseApiResponse<any>(text);
        let rawRes = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data.result));
        if (rawRes) {
          rawRes = rawRes.replace(/```(?:tikz|latex)?\s*\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}\s*```/gi, '\n[Hình vẽ minh họa]\n');
          rawRes = rawRes.replace(/```tikz[\s\S]*?```/gi, '\n[Hình vẽ minh họa]\n');
          rawRes = rawRes.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '\n[Hình vẽ minh họa]\n');
        }
        finalResult = rawRes;
      }

      // Stop progress timer & jump to 100%
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgressPercent(100);
      setProgressStatus('🎉 Số hóa hoàn tất thành công!');

      setTimeout(() => {
        setResultText(finalResult);
        setIsUploading(false);
      }, 400);

    } catch (err: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      console.error(err);
      const errorMsg = err.message || '';
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        setError("Hệ thống đang quá tải hoặc tạm thời không khả dụng do nhu cầu cao. Vui lòng thử lại sau ít phút hoặc chọn khoảng trang ngắn hơn.");
      } else if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg);
          setError(parsed.error?.message || "Có lỗi xảy ra khi xử lý file");
        } catch {
          setError("Có lỗi xảy ra trong quá trình số hóa tài liệu. Vui lòng thử lại.");
        }
      } else {
        setError(errorMsg || 'Lỗi kết nối. Vui lòng thử lại sau.');
      }
      setIsUploading(false);
    }
  };

  const handleOpenCropper = (pageNum: number, placeholderTag?: string) => {
    const src = pdfPageImages[pageNum] || (selectedFile && selectedFile.type.startsWith('image/') ? Object.values(pdfPageImages)[0] : '');
    if (src) {
      setCropperSourceImage(src);
      setTargetReplacePlaceholder(placeholderTag || null);
      setIsCropperOpen(true);
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setIsCropperOpen(false);
    if (!croppedDataUrl) return;

    const imgTag = `\n\n<img src="${croppedDataUrl}" alt="Hình vẽ / Đồ thị minh họa" class="max-w-[420px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm" />\n\n`;

    if (targetReplacePlaceholder && resultText.includes(targetReplacePlaceholder)) {
      setResultText(prev => prev.replace(targetReplacePlaceholder, imgTag));
    } else if (/\[Hình (?:vẽ|ảnh)[^\]]*\]/i.test(resultText)) {
      setResultText(prev => prev.replace(/\[Hình (?:vẽ|ảnh)[^\]]*\]/i, imgTag));
    } else {
      setResultText(prev => prev + imgTag);
    }
    setTargetReplacePlaceholder(null);
  };

  const handleExportWord = (keepLatex: boolean = false) => {
    if (!resultText || !exportRef.current) return;
    exportHtmlToWord(exportRef.current, `TaiLieu_DaChuyenDoi_${new Date().getTime()}${keepLatex ? '_LaTeX' : ''}.doc`, keepLatex);
  };

  const isPdf = selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf'));

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2 mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            Chuyển đổi tài liệu (PDF/Ảnh) sang Word
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Công cụ số hóa tài liệu thông minh bám sát chuẩn 100% công thức Toán/Lý/Hóa LaTeX, tự động phân đoạn trang và bảo toàn cấu trúc đề thi.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {!selectedFile ? (
            <div 
              tabIndex={0}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-6 lg:p-12 text-center hover:bg-slate-50/80 transition-all cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 shadow-2xs"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPaste={handlePasteEvent}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.docx"
              />
              <div className="bg-blue-100/80 p-4 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center mb-4 text-blue-600 shadow-2xs">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Kéo thả file hoặc nhấn để tải lên</h3>
              <p className="text-slate-500 mb-4 text-sm">Hỗ trợ file PDF, Ảnh (.png, .jpg), hoặc Word (.docx)</p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-6 border border-blue-200 shadow-2xs">
                <Clipboard className="w-4 h-4 text-blue-600" />
                <span>Hoặc nhấn <b>Ctrl + V</b> (Cmd + V) để dán ảnh trực tiếp từ Clipboard</span>
              </div>

              <div>
                <button className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm">
                  Chọn File Tài Liệu
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 shadow-2xs space-y-6">
              {/* Selected File Overview */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-800 truncate">{selectedFile.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB {isPdf && `• ${pdfTotalPages} trang PDF`}
                    </p>
                  </div>
                </div>
                <button 
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  onClick={() => setSelectedFile(null)}
                  title="Đổi file khác"
                  disabled={isUploading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* PDF Page Selection Controls & Recommendation */}
              {isPdf && (
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      <span>Tùy chọn số hóa & Khuyến nghị hiệu suất</span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                      Tổng số: {pdfTotalPages} trang PDF
                    </span>
                  </div>

                  {/* Recommendation banner */}
                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-blue-950">Khuyến nghị từ hệ thống:</p>
                      <p className="mt-0.5 leading-relaxed">
                        Để đạt tốc độ số hóa AI nhanh nhất (dưới 20 giây) và độ chính xác 100%, thầy/cô nên chọn từ <b>1 đến 5 trang</b> mỗi lượt. Nếu file PDF dài, hãy sử dụng tính năng chọn khoảng trang bên dưới.
                      </p>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5 text-xs font-semibold text-slate-700">
                    {/* Option 1: Recommended */}
                    {pdfTotalPages > 5 && (
                      <label className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${pageMode === 'recommended' ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-2xs' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'}`}>
                        <input 
                          type="radio" 
                          name="pageMode" 
                          checked={pageMode === 'recommended'}
                          onChange={() => {
                            setPageMode('recommended');
                            setFromPage(1);
                            setToPage(Math.min(5, pdfTotalPages));
                          }}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-bold">Khuyên dùng: Số hóa 5 trang đầu tiên (Trang 1 - 5)</p>
                          <p className="font-normal text-slate-500 text-[11px] mt-0.5">Tốc độ tối ưu nhất, xử lý nhanh gọn phù hợp với các đề kiểm tra ngắn.</p>
                        </div>
                      </label>
                    )}

                    {/* Option 2: Range */}
                    <label className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${pageMode === 'range' ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-2xs' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'}`}>
                      <input 
                        type="radio" 
                        name="pageMode" 
                        checked={pageMode === 'range'}
                        onChange={() => {
                          setPageMode('range');
                          setFromPage(1);
                          setToPage(Math.min(5, pdfTotalPages));
                        }}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold mb-2">Tùy chọn khoảng trang số hóa:</p>
                        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <span>Từ trang</span>
                          <input 
                            type="number" 
                            min={1} 
                            max={pdfTotalPages}
                            value={fromPage}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(Number(e.target.value) || 1, pdfTotalPages));
                              setFromPage(val);
                              if (val > toPage) setToPage(val);
                              setPageMode('range');
                            }}
                            className="w-16 px-2.5 py-1 border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                          <span>đến trang</span>
                          <input 
                            type="number" 
                            min={fromPage} 
                            max={pdfTotalPages}
                            value={toPage}
                            onChange={(e) => {
                              const val = Math.max(fromPage, Math.min(Number(e.target.value) || fromPage, pdfTotalPages));
                              setToPage(val);
                              setPageMode('range');
                            }}
                            className="w-16 px-2.5 py-1 border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                          <span className="text-slate-500 text-[11px]">(Đã chọn {Math.max(1, toPage - fromPage + 1)} trang)</span>
                        </div>
                      </div>
                    </label>

                    {/* Option 3: All */}
                    <label className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${pageMode === 'all' ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-2xs' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'}`}>
                      <input 
                        type="radio" 
                        name="pageMode" 
                        checked={pageMode === 'all'}
                        onChange={() => {
                          setPageMode('all');
                          setFromPage(1);
                          setToPage(pdfTotalPages);
                        }}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold">Toàn bộ tài liệu (Tất cả {pdfTotalPages} trang)</p>
                        <p className="font-normal text-slate-500 text-[11px] mt-0.5">Số hóa trọn vẹn từ trang 1 đến trang {pdfTotalPages}.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Progress Indicator when converting */}
              {isUploading ? (
                <div className="p-6 bg-white rounded-xl border border-blue-200 shadow-sm space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-800">
                    <span className="flex items-center gap-2 text-blue-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{progressStatus || 'Đang tiến hành số hóa...'}</span>
                    </span>
                    <span className="text-blue-600 text-base font-black">{progressPercent}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                    <div 
                      className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 shadow-xs"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Số trang chọn: <b>{isPdf ? `${fromPage} - ${toPage}` : '1'}</b> ({isPdf ? toPage - fromPage + 1 : 1} trang)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Thời gian: <b>{elapsedSec}s</b> / Dự kiến ~{estimatedTimeSec}s</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center gap-3">
                  <button 
                    className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-xl hover:bg-white flex items-center gap-2 font-medium text-sm transition-colors"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" /> Hủy
                  </button>
                  <button 
                    className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center gap-2 text-sm shadow-md hover:shadow-lg transition-all"
                    onClick={handleConvert}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Số hóa sang Word</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="max-w-3xl mx-auto mt-6">
          <div className="flex items-start gap-3 p-4 bg-amber-50 text-amber-900 rounded-xl text-xs sm:text-sm border border-amber-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-bold text-amber-950">Lưu ý về hình ảnh & quy chuẩn số hóa:</p>
              <p>
                - AI được tối ưu đặc biệt để nhận diện và gõ lại chuẩn 100% công thức Toán/Lý/Hóa LaTeX, phân đoạn trang dạng <i>--- [Hết Trang X / Sang Trang Y] ---</i> và giữ nguyên các phương án $A, B, C, D$.
              </p>
              <p>
                - Với hình vẽ/đồ thị, thầy/cô có thể dùng thanh công cụ <b>Cắt hình từ trang PDF gốc</b> bên dưới để nhúng trực tiếp đồ thị sắc nét vào tài liệu Word.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mt-4 p-4 bg-rose-50 text-rose-700 rounded-xl text-center font-medium border border-rose-200 text-sm">
            {error}
          </div>
        )}
      </div>

      {resultText && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:p-8 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span>Tài liệu đã số hóa thành công!</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Đã chuẩn hóa công thức LaTeX và đánh dấu phân đoạn trang từ {fromPage} đến {toPage}.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={() => setResultText('')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-bold"
              >
                Chuyển file khác
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleExportWord(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-bold text-xs"
                >
                  <Download className="w-4 h-4" /> Word (Chuẩn)
                </button>
                <button 
                  onClick={() => handleExportWord(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-bold text-xs"
                  title="Dành cho giáo viên dùng MathType"
                >
                  <Download className="w-4 h-4" /> Word (Mã LaTeX)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Crop & Attach Image from PDF pages */}
          {Object.keys(pdfPageImages).length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50/50 rounded-xl border border-blue-200/80 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Cắt hình vẽ / Đồ thị từ trang PDF gốc chèn vào Word:</span>
                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-full">Tiện ích</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Bấm chọn trang dưới đây để mở công cụ kéo chọn hình vẽ và nhúng trực tiếp vào văn bản:</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {Object.keys(pdfPageImages).map(pStr => {
                  const pNum = Number(pStr);
                  return (
                    <button
                      key={pNum}
                      onClick={() => handleOpenCropper(pNum)}
                      className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Cắt Trang {pNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-slate-50/70 rounded-xl p-6 lg:p-8 border border-slate-200">
            <div ref={exportRef}>
              <MarkdownRenderer content={resultText} />
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropperSourceImage}
        onCrop={handleCropComplete}
        onClose={() => setIsCropperOpen(false)}
      />
    </div>
  );
}

export default PdfToWord;
