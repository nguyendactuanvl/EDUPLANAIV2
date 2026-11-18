import { apiFetch } from '../lib/apiFetch';
import { exportHtmlToWord, exportToLatexTexFile } from '../lib/exportUtils';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, FileText, Loader2, Download, AlertCircle, 
  Clipboard, CheckCircle2, Clock, Layers, Sliders, Sparkles, Zap, Wand2,
  Image as ImageIcon, Scissors, FileCode, Palette, TrendingUp
} from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { parseApiResponse, normalizeOcrChoicesAndFormatting, normalizeMathText } from '../lib/utils';
import { run1ClickMathFix } from '../components/math-tools/MathFormulaFixer';
import { getPdfTotalPages, renderPdfPageToDataUrl } from '../lib/pdfUtils';
import { ImageCropperModal } from '../components/ImageCropperModal';
import { QuestionVisualizerPanel } from '../components/math-tools/QuestionVisualizerPanel';
import mammoth from 'mammoth';
import { FeatureQuickGuideBanner } from '../components/FeatureQuickGuideBanner';
import { ApiErrorBanner } from '../components/ApiErrorBanner';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const optimizeImageForOcr = async (file: File): Promise<{ data: string; type: string; name: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1800; // Optimal resolution for Gemini math & OCR
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
          const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve({
            data: dataUrl.split(',')[1],
            type: mimeType,
            name: file.name
          });
          return;
        }
        const raw = (e.target?.result as string).split(',')[1];
        resolve({ data: raw, type: file.type || 'image/png', name: file.name });
      };
      img.onerror = () => {
        const raw = (e.target?.result as string).split(',')[1];
        resolve({ data: raw, type: file.type || 'image/png', name: file.name });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ data: '', type: file.type || 'image/png', name: file.name });
    };
    reader.readAsDataURL(file);
  });
};

const cropFigureFromDataUrl = (
  pageDataUrl: string,
  boxStr: string
): Promise<{ dataUrl: string; displayW: number; displayH: number } | null> => {
  return new Promise((resolve) => {
    if (!pageDataUrl || !boxStr) {
      resolve(null);
      return;
    }
    const parts = boxStr
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !Number.isNaN(n));
    if (parts.length !== 4) {
      resolve(null);
      return;
    }

    let [ymin, xmin, ymax, xmax] = parts;
    if (ymin >= ymax || xmin >= xmax) {
      resolve(null);
      return;
    }
    const boxH = ymax - ymin;
    const boxW = xmax - xmin;
    // Reject tiny noise or accidental full-page bounding boxes
    if (boxH < 22 || boxW < 22 || (boxH > 860 && boxW > 860)) {
      resolve(null);
      return;
    }

    // Add gentle 1.2% margin padding so axis ticks/labels are never clipped
    const pad = 12;
    ymin = Math.max(0, ymin - pad);
    xmin = Math.max(0, xmin - pad);
    ymax = Math.min(1000, ymax + pad);
    xmax = Math.min(1000, xmax + pad);

    const img = new Image();
    img.onload = () => {
      try {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        if (!natW || !natH) {
          resolve(null);
          return;
        }
        const sx = Math.max(0, Math.floor((xmin / 1000) * natW));
        const sy = Math.max(0, Math.floor((ymin / 1000) * natH));
        const sw = Math.min(natW - sx, Math.max(10, Math.ceil(((xmax - xmin) / 1000) * natW)));
        const sh = Math.min(natH - sy, Math.max(10, Math.ceil(((ymax - ymin) / 1000) * natH)));

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sw, sh);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        const displayW = Math.max(240, Math.min(540, Math.round(sw * 0.52)));
        const displayH = Math.max(80, Math.round(sh * (displayW / sw)));

        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          displayW,
          displayH,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = pageDataUrl;
  });
};

const measureImageDisplaySize = (
  dataUrl: string
): Promise<{ displayW: number; displayH: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const natW = img.naturalWidth || 480;
      const natH = img.naturalHeight || 300;
      const displayW = Math.max(220, Math.min(560, Math.round(natW * 0.6)));
      const displayH = Math.max(60, Math.round(natH * (displayW / Math.max(1, natW))));
      resolve({ displayW, displayH });
    };
    img.onerror = () => resolve({ displayW: 480, displayH: 300 });
    img.src = dataUrl;
  });
};

const sanitizeHtmlTableInlineMarkdown = (tableHtml: string): string => {
  const mathParts: string[] = [];
  let s = tableHtml.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g, (m) => {
    const idx = mathParts.length;
    mathParts.push(m);
    return `\uE000TBL_M_${idx}\uE001`;
  });
  s = s
    .replace(/\*\*([^\*\n]+?)\*\*\*([^\*\n]+?)\*/g, '<strong>$1</strong><br/><em>$2</em>')
    .replace(/\*\*([^\*\n<>]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[>\s])\*([^\*\n<>]+?)\*(?=$|[<\s.,;:])/g, '$1<em>$2</em>')
    .replace(/(<\/table>)[ \t]*(?!\n\n)/i, '$1\n\n');
  return s.replace(/\uE000TBL_M_(\d+)\uE001/g, (_m, idx) => mathParts[Number(idx)] || '');
};

const cleanAndNormalizePageMarkdown = (rawText: string): string => {
  if (!rawText) return '';
  let text = rawText;
  text = text.replace(/```(?:tikz|latex)?\s*\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}\s*```/gi, '\n[Hình vẽ minh họa]\n');
  text = text.replace(/```tikz[\s\S]*?```/gi, '\n[Hình vẽ minh họa]\n');
  text = text.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '\n[Hình vẽ minh họa]\n');

  const cropTokens: string[] = [];
  text = text.replace(/\[CROP_FIG\b[^\]]*\]/gi, (m) => {
    const idx = cropTokens.length;
    cropTokens.push(m);
    return `\uE000CROP_TOK_${idx}\uE001`;
  });

  // Protect HTML <table> blocks (e.g. 2-column borderless exam headers) from math/OCR line-splitting regexes
  const htmlTableTokens: string[] = [];
  text = text.replace(/<table\b[\s\S]*?<\/table>/gi, (m) => {
    const idx = htmlTableTokens.length;
    htmlTableTokens.push(sanitizeHtmlTableInlineMarkdown(m));
    return `\n\n\uE000TBL_TOK_${idx}\uE001\n\n`;
  });

  // Fix colliding markdown bold/italic markers like **Môn thi: TOÁN***Thời gian:...* or **A****B**
  text = text.replace(/\*\*([^\*\n]+?)\*\*\*([^\*\n]+?)\*/g, '**$1**\n\n*$2*');
  text = text.replace(/\*\*([^\*\n]+?)\*\*\*\*/g, '**$1**\n\n**');
  text = text.replace(/(\)|\*)[ \t]*(?=(?:\*\*|\*)?(?:SỞ\s+GIÁO\s+DỤC|ĐỀ\s+(?:THAM\s+KHẢO|KIỂM\s+TRA|THI|CHÍNH\s+THỨC)|\(Đề\s+thi\s+gồm|K[ÌỲ]\s+THI\b|CẤP\s+(?:THÀNH\s+PHỐ|TỈNH|HUYỆN|QUẬN|TRƯỜNG)|NĂM\s+HỌC\b|Môn\s*thi\s*:|Thời\s*gian\s*:))/g, '$1\n\n');

  // Separate known plain-text exam header & footer lines when separated only by a single newline
  const headerLineRe = /^[ \t]*(?:\*{1,2}|<em>|<strong>)?(?:UBND\b|SỞ\s+GIÁO\s+DỤC|PHÒNG\s+GIÁO\s+DỤC|TRƯỜNG\s+|ĐỀ\s+(?:THAM\s+KHẢO|KIỂM\s+TRA|THI|CHÍNH\s+THỨC)|\(Đề\s+thi\s+gồm|K[ÌỲ]\s+THI\b|CẤP\s+(?:THÀNH\s+PHỐ|TỈNH|HUYỆN|QUẬN|TRƯỜNG)|NĂM\s+HỌC\b|Môn\s*thi\s*:|Thời\s*gian\s*:|[-–—]{2,}\s*HẾT|Họ\s+và\s+tên\s+thí\s+sinh\s*:)/i;
  const rawLines = text.split('\n');
  const spacedLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const cur = rawLines[i];
    const prev = spacedLines.length > 0 ? spacedLines[spacedLines.length - 1] : '';
    if (
      i > 0 &&
      prev.trim() !== '' &&
      cur.trim() !== '' &&
      (headerLineRe.test(cur) || headerLineRe.test(prev)) &&
      !/^\|.*\|$/.test(cur.trim()) &&
      !/^\|.*\|$/.test(prev.trim())
    ) {
      spacedLines.push('');
    }
    spacedLines.push(cur);
  }
  text = spacedLines.join('\n');

  // Ensure line break before PHẦN I / PHẦN II / PHẦN III if glued to title
  text = text.replace(/([^\n])(PHẦN\s+[IVX]+[\.\:\s])/g, '$1\n\n$2');
  text = normalizeMathText(normalizeOcrChoicesAndFormatting(text));

  text = text.replace(/\uE000TBL_TOK_(\d+)\uE001/g, (_m, idx) => htmlTableTokens[Number(idx)] || '');
  text = text.replace(/\uE000CROP_TOK_(\d+)\uE001/g, (_m, idx) => cropTokens[Number(idx)] || '');
  return text.trim();
};

const resolveCropFigMarkers = async (
  text: string,
  pageImagesMap: { [pageNum: number]: string },
  autoCropEnabled: boolean
): Promise<string> => {
  const regex = /\[CROP_FIG\b([^\]]*)\]/gi;
  const matches = Array.from(text.matchAll(regex));
  if (matches.length === 0) return text;

  let output = '';
  let lastIndex = 0;

  for (const m of matches) {
    const fullMatch = m[0];
    const attrs = m[1] || '';
    const matchIndex = m.index ?? 0;
    output += text.slice(lastIndex, matchIndex);
    lastIndex = matchIndex + fullMatch.length;

    const pageMatch = attrs.match(/page=["']?(\d+)["']?/i);
    const boxMatch = attrs.match(/box=["']?([0-9.,\s]+)["']?/i);
    const descMatch = attrs.match(/desc=["']([^"']*)["']/i);

    const page = pageMatch ? Number(pageMatch[1]) : 1;
    const box = boxMatch ? boxMatch[1].trim() : '';
    const rawDesc = (descMatch ? descMatch[1] : 'Hình vẽ minh họa')
      .replace(/[\[\]]/g, '')
      .replace(/"/g, "'")
      .trim();

    let replacement = `\n\n[Hình vẽ (Trang ${page}): ${rawDesc || 'Hình vẽ minh họa'}]\n\n`;

    if (autoCropEnabled && box && pageImagesMap[page]) {
      const cropped = await cropFigureFromDataUrl(pageImagesMap[page], box);
      if (cropped) {
        replacement = `\n\n<img src="${cropped.dataUrl}" alt="${rawDesc || 'Hình vẽ minh họa đề thi'}" data-page="${page}" data-width="${cropped.displayW}" data-height="${cropped.displayH}" class="max-w-[520px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm block" />\n\n`;
      }
    }

    output += replacement;
  }

  output += text.slice(lastIndex);
  return output;
};

type PageMode = 'recommended' | 'range' | 'all';
type VisualMode = 'auto_crop' | 'crop_manual' | 'tables_only';

export function PdfToWord() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileArrayBuffer, setFileArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(1);
  
  // Page selection options
  const [pageMode, setPageMode] = useState<PageMode>('recommended');
  const [fromPage, setFromPage] = useState<number>(1);
  const [toPage, setToPage] = useState<number>(5);

  // Visual extraction options (auto-crop original figures & keep tables as tables)
  const [visualMode, setVisualMode] = useState<VisualMode>('auto_crop');

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
  
  // Interactive Visualizer Panel Modal
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [visualizerTab, setVisualizerTab] = useState<'bbt' | 'graph' | 'geometry3d' | 'statistics'>('bbt');

  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<any>(null);
  const pdfPageImagesRef = useRef<{ [pageNum: number]: string }>({});
  const resultTextRef = useRef<string>('');
  const fromPageRef = useRef<number>(1);

  useEffect(() => {
    pdfPageImagesRef.current = pdfPageImages;
  }, [pdfPageImages]);

  useEffect(() => {
    resultTextRef.current = resultText;
  }, [resultText]);

  useEffect(() => {
    fromPageRef.current = fromPage;
  }, [fromPage]);

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

  const detectPageForPlaceholder = (text: string, placeholderTag?: string): number => {
    if (placeholderTag) {
      const explicitMatch = placeholderTag.match(/Trang\s*(\d+)/i);
      if (explicitMatch) {
        const p = Number(explicitMatch[1]);
        if (pdfPageImagesRef.current[p]) return p;
      }
      const idx = text.indexOf(placeholderTag);
      if (idx !== -1) {
        const prefix = text.slice(0, idx);
        const sepMatches = Array.from(prefix.matchAll(/---\s*\[Hết Trang \d+\s*\/\s*Sang Trang (\d+)\]\s*---/gi));
        if (sepMatches.length > 0) {
          const lastPage = Number(sepMatches[sepMatches.length - 1][1]);
          if (pdfPageImagesRef.current[lastPage]) return lastPage;
        }
      }
    }
    const availablePages = Object.keys(pdfPageImagesRef.current).map(Number).sort((a, b) => a - b);
    if (availablePages.includes(fromPageRef.current)) return fromPageRef.current;
    return availablePages[0] || 1;
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

    const onOpenPdfCropper = (e: any) => {
      const placeholder = e.detail?.placeholder;
      const targetPage = detectPageForPlaceholder(resultTextRef.current, placeholder);
      handleOpenCropper(targetPage, placeholder);
    };

    window.addEventListener('paste', onGlobalPaste);
    window.addEventListener('open-pdf-cropper', onOpenPdfCropper as any);
    return () => {
      window.removeEventListener('paste', onGlobalPaste);
      window.removeEventListener('open-pdf-cropper', onOpenPdfCropper as any);
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
        // Multi-page PDF: Process page-by-page when possible for crisp progress tracking & cropping,
        // with automatic fallback to direct multimodal PDF AI processing if page rendering encounters any issue
        let pageConversionSuccess = false;

        try {
          const freshBuffer = await selectedFile.arrayBuffer();


          const pageResults: string[] = new Array(pagesToProcess);
          const pageImagesMap: { [pageNum: number]: string } = {};

          const batchSize = 3;
          for (let i = 0; i < pagesToProcess; i += batchSize) {
            const batch = [];
            for (let j = i; j < i + batchSize && j < pagesToProcess; j++) {
              batch.push(j);
            }

            await Promise.all(batch.map(async (batchIdx) => {
              const p = startP + batchIdx;
              const { dataUrl } = await renderPdfPageToDataUrl(freshBuffer.slice(0), p, 2.0);
              pageImagesMap[p] = dataUrl;

              const response = await apiFetch('/api/pdf-to-word', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  files: [{
                    data: dataUrl.split(',')[1],
                    type: 'image/png',
                    name: `Trang_${p}.png`
                  }],
                  pageNum: p,
                  totalPages: pdfTotalPages
                })
              });

              if (!response.ok) throw new Error(`Lỗi xử lý trang ${p}`);
              const text = await response.text();
              const data = parseApiResponse<any>(text);
              let pageText = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || '');
              
              if (pageText) {
                pageText = cleanAndNormalizePageMarkdown(pageText);
                pageText = await resolveCropFigMarkers(pageText, pageImagesMap, visualMode === 'auto_crop');
              }
              pageResults[batchIdx] = pageText.trim();
            }));
          }

          setPdfPageImages(pageImagesMap);

          // Combine all pages with standard page separation markers
          finalResult = pageResults.map((t, idx) => {
            const currP = startP + idx;
            const nextP = currP + 1;
            const sep = idx < pageResults.length - 1 ? `\n\n--- [Hết Trang ${currP} / Sang Trang ${nextP}] ---\n\n` : '';
            return t + sep;
          }).join('');

          pageConversionSuccess = true;
        } catch (pageErr: any) {
          console.warn('Page-by-page render failed, falling back to direct server-side PDF processing:', pageErr);
          setProgressStatus('⚡ Đang xử lý bóc tách tài liệu PDF trực tiếp bằng AI...');
          setProgressPercent(60);

          const rawBase64 = await fileToBase64(selectedFile);
          const response = await apiFetch('/api/pdf-to-word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: [{
                data: rawBase64,
                type: 'application/pdf',
                name: selectedFile.name
              }],
              totalPages: pdfTotalPages
            })
          });

          if (!response.ok) {
            let errorData;
            let errText = await response.text();
            try { errorData = JSON.parse(errText); } catch { errorData = { error: errText }; }
            let errorMsg = errorData.error || 'Có lỗi xảy ra khi số hóa tài liệu PDF';
            if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
            throw new Error(errorMsg);
          }

          const text = await response.text();
          const data = parseApiResponse<any>(text);
          let rawRes = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data.result));
          finalResult = cleanAndNormalizePageMarkdown(rawRes);
          pageConversionSuccess = true;
        }

        // Tuyệt đối không tự bịa đồ thị vector bằng autoEnrichTextWithVisuals khi chuyển PDF sang Word

      } else {
        // Single Image or DOCX
        let fileListForApi: { data: string; type: string; name: string }[] = [];
        const isDocx = selectedFile.name.toLowerCase().endsWith('.docx');
        const singlePageImages: { [pageNum: number]: string } = {};

        if (isDocx) {
          const text = await processDocx(selectedFile);
          const fileData = btoa(unescape(encodeURIComponent(text)));
          fileListForApi = [{ data: fileData, type: 'text/plain', name: selectedFile.name }];
        } else {
          // Optimize image (downscale to max 1800px if large, keeping math/text razor sharp)
          const optimized = await optimizeImageForOcr(selectedFile);
          fileListForApi = [optimized];
          singlePageImages[1] = `data:${optimized.type};base64,${optimized.data}`;
          setPdfPageImages(singlePageImages);
        }

        let response = await apiFetch('/api/pdf-to-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: fileListForApi,
            ...(isDocx ? {} : { pageNum: 1, totalPages: 1 })
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

        let text = await response.text();
        // If response is empty or whitespace, retry once seamlessly
        if (!text || !text.trim()) {
          setProgressStatus('⏳ Đang kết nối lại máy chủ để hoàn tất bóc tách...');
          await new Promise(r => setTimeout(r, 1200));
          response = await apiFetch('/api/pdf-to-word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: fileListForApi,
              ...(isDocx ? {} : { pageNum: 1, totalPages: 1 })
            })
          });
          text = await response.text();
        }

        const data = parseApiResponse<any>(text);
        let rawRes = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data.result));
        finalResult = cleanAndNormalizePageMarkdown(rawRes);
        if (!isDocx) {
          finalResult = await resolveCropFigMarkers(finalResult, singlePageImages, visualMode === 'auto_crop');
        }
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
    const map = pdfPageImagesRef.current;
    const fallbackSrc = Object.values(map)[0] || '';
    const src = map[pageNum] || fallbackSrc;
    if (src) {
      setCropperSourceImage(src);
      setTargetReplacePlaceholder(placeholderTag || null);
      setIsCropperOpen(true);
    }
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    setIsCropperOpen(false);
    if (!croppedDataUrl) return;

    const { displayW, displayH } = await measureImageDisplaySize(croppedDataUrl);
    const imgTag = `\n\n<img src="${croppedDataUrl}" alt="Hình vẽ minh họa đề thi" class="max-w-[540px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm block" data-width="${displayW}" data-height="${displayH}" />\n\n`;

    if (targetReplacePlaceholder && resultTextRef.current.includes(targetReplacePlaceholder)) {
      const target = targetReplacePlaceholder;
      setResultText(prev => prev.replace(target, imgTag));
    } else if (/\[(?:Hình\s*(?:vẽ|ảnh)|Đồ\s*thị|Bảng\s*biến\s*thiên|BBT)[^\]]*\]/i.test(resultTextRef.current)) {
      setResultText(prev => prev.replace(/\[(?:Hình\s*(?:vẽ|ảnh)|Đồ\s*thị|Bảng\s*biến\s*thiên|BBT)[^\]]*\]/i, imgTag));
    } else {
      setResultText(prev => prev + imgTag);
    }
    setTargetReplacePlaceholder(null);
  };

  const handleExportWord = (keepLatex: boolean = false) => {
    if (!resultText || !exportRef.current) return;
    exportHtmlToWord(exportRef.current, `TaiLieu_DaChuyenDoi_${new Date().getTime()}${keepLatex ? '_LaTeX' : ''}.doc`, keepLatex);
  };

  const handleExportLatex = () => {
    if (!resultText) return;
    const rawName = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'TaiLieu_DaChuyenDoi';
    exportToLatexTexFile(resultText, `${rawName}_LaTeX.tex`);
  };

  const isPdf = selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf'));

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-8">
      <FeatureQuickGuideBanner sectionId="pdf2word" />
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

              {/* Visual & Table Conversion Options */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Tùy chọn xử lý Hình ảnh, Đồ thị & Bảng biểu từ PDF gốc</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-semibold">
                  <label className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${visualMode === 'auto_crop' ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-2xs' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'}`}>
                    <input 
                      type="radio" 
                      name="visualMode" 
                      checked={visualMode === 'auto_crop'}
                      onChange={() => setVisualMode('auto_crop')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-indigo-950 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Tự cắt ảnh gốc & Vẽ bảng biểu (Khuyên dùng)</span>
                      </div>
                      <div className="font-normal text-slate-500 text-[11px] mt-1 leading-relaxed">
                        Tự động cắt chính xác đồ thị, hình vẽ từ PDF gốc chèn vào Word; chỉ chuyển bảng số liệu/BBT sang dạng bảng biểu chuẩn, không vẽ đồ thị giả.
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${visualMode === 'crop_manual' ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-2xs' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'}`}>
                    <input 
                      type="radio" 
                      name="visualMode" 
                      checked={visualMode === 'crop_manual'}
                      onChange={() => setVisualMode('crop_manual')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-indigo-950 flex items-center gap-1">
                        <Scissors className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Giữ thẻ [Hình vẽ] để tự Cắt ảnh gốc PDF</span>
                      </div>
                      <div className="font-normal text-slate-500 text-[11px] mt-1 leading-relaxed">
                        Giữ các thẻ đánh dấu đúng vị trí từng trang để thầy/cô tự kéo cắt từng ảnh trực tiếp từ trang PDF gốc.
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${visualMode === 'tables_only' ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-2xs' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'}`}>
                    <input 
                      type="radio" 
                      name="visualMode" 
                      checked={visualMode === 'tables_only'}
                      onChange={() => setVisualMode('tables_only')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-indigo-950 flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Chỉ xuất văn bản & Bảng biểu chuẩn</span>
                      </div>
                      <div className="font-normal text-slate-500 text-[11px] mt-1 leading-relaxed">
                        Chỉ số hóa văn bản, công thức LaTeX và bảng biểu/BBT dạng bảng; có thể mở công cụ tự vẽ BBT/đồ thị khi cần.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

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
              <p className="font-bold text-amber-950">Lưu ý về hình ảnh &amp; quy chuẩn số hóa:</p>
              <p>
                - AI được tối ưu để nhận diện và gõ lại chuẩn 100% công thức Toán/Lý/Hóa LaTeX, giữ nguyên số thứ tự câu hỏi, loại bỏ header/footer thừa và phân đoạn trang dạng <i>--- [Hết Trang X / Sang Trang Y] ---</i>.
              </p>
              <p>
                - Với hình vẽ, đồ thị, sơ đồ: hệ thống <b>tự động cắt ảnh trực tiếp từ trang PDF gốc</b> đúng vị trí câu hỏi (không tự bịa hay chèn đồ thị sai bản gốc). Các bảng số liệu thống kê và Bảng biến thiên được trình bày chuẩn dạng bảng biểu. Thầy/cô vẫn có thể bấm <b>Cắt Trang</b> bên dưới để tinh chỉnh lại vùng ảnh nếu muốn.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mt-4">
            <ApiErrorBanner 
              error={error} 
              onDismiss={() => setError(null)} 
              onRetry={handleConvert} 
            />
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
                onClick={() => {
                  setVisualizerTab('bbt');
                  setIsVisualizerOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg transition-all shadow-sm font-bold text-xs cursor-pointer active:scale-95"
                title="Mở công cụ tự chọn vẽ Bảng biến thiên hoặc Đồ thị hàm số theo thông số chính xác"
              >
                <Palette className="w-4 h-4 text-purple-200" />
                <span>🎨 Tự vẽ BBT / Đồ thị</span>
              </button>

              <button 
                onClick={() => {
                  setResultText(prev => run1ClickMathFix(prev));
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg transition-all shadow-sm font-bold text-xs cursor-pointer active:scale-95"
                title="Tự động phát hiện và làm sạch 100% lỗi OCR công thức Toán"
              >
                <Wand2 className="w-4 h-4 text-emerald-200 animate-pulse" />
                <span>⚡ Sửa lỗi Toán OCR 1-Click</span>
              </button>
              <button 
                onClick={() => setResultText('')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-bold"
              >
                Chuyển file khác
              </button>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => handleExportWord(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-bold text-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Word (Chuẩn)
                </button>
                <button 
                  onClick={() => handleExportWord(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-bold text-xs cursor-pointer"
                  title="Dành cho giáo viên dùng MathType"
                >
                  <Download className="w-4 h-4" /> Word (Mã LaTeX)
                </button>
                <button 
                  onClick={handleExportLatex}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-sm font-bold text-xs cursor-pointer active:scale-95"
                  title="Tải file mã nguồn LaTeX (.tex) chuẩn biên dịch TeXMaker / Overleaf / TeXStudio"
                >
                  <FileCode className="w-4 h-4 text-purple-200" /> Tải mã LaTeX (.tex)
                </button>
              </div>
            </div>
          </div>

          {/* Detected Figure Placeholders Manager */}
          {(() => {
            const matches = Array.from(resultText.matchAll(/\[(?:Hình\s*vẽ|Đồ\s*thị|Bảng\s*biến\s*thiên|Hình\s*ảnh|Hình|BBT)[^\]]*\]/gi));
            if (matches.length === 0) return null;

            return (
              <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Phát hiện {matches.length} vị trí hình vẽ / đồ thị cần cắt bổ sung từ file gốc:</span>
                  </h4>
                  <span className="text-[11px] text-amber-800 font-medium">Bấm cắt từ đúng trang PDF để chèn ảnh gốc:</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {matches.map((m, idx) => {
                    const tag = m[0];
                    const targetPage = detectPageForPlaceholder(resultText, tag);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-200/80 text-xs gap-2">
                        <span className="font-semibold text-slate-800 truncate max-w-md">{tag}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setTargetReplacePlaceholder(tag);
                              setVisualizerTab(tag.toLowerCase().includes('bbt') || tag.toLowerCase().includes('biến thiên') ? 'bbt' : 'graph');
                              setIsVisualizerOpen(true);
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded font-bold border border-indigo-200 flex items-center gap-1 transition-all"
                          >
                            <Palette className="w-3.5 h-3.5" />
                            <span>🎨 Tự vẽ BBT/Đồ thị</span>
                          </button>
                          <button
                            onClick={() => handleOpenCropper(targetPage, tag)}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-600 hover:text-white text-amber-800 rounded font-bold border border-amber-300 flex items-center gap-1 transition-all"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            <span>✂️ Cắt từ Trang {targetPage}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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
                  <p className="text-[11px] text-slate-500 mt-0.5">Nếu cần chỉnh vùng cắt ảnh, bấm chọn trang dưới đây để cắt lại và nhúng trực tiếp vào văn bản:</p>
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
            <div ref={exportRef} data-no-auto-graph="true">
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

      {/* Question Visualizer Modal for interactive BBT & Graph redraw */}
      {isVisualizerOpen && (
        <QuestionVisualizerPanel
          questionNumber={1}
          questionContent={resultText.slice(0, 500)}
          defaultTab={visualizerTab}
          onInsertSnippet={(_target, snippet) => {
            setIsVisualizerOpen(false);
            if (!snippet) return;
            if (targetReplacePlaceholder && resultText.includes(targetReplacePlaceholder)) {
              setResultText(prev => prev.replace(targetReplacePlaceholder, `\n\n${snippet}\n\n`));
            } else {
              setResultText(prev => prev + `\n\n${snippet}\n\n`);
            }
            setTargetReplacePlaceholder(null);
          }}
          onClose={() => setIsVisualizerOpen(false)}
        />
      )}
    </div>
  );
}

export default PdfToWord;
