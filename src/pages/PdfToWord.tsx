import { apiFetch, getActiveApiKeyPool } from '../lib/apiFetch';
import { exportHtmlToWord, exportToLatexTexFile } from '../lib/exportUtils';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, FileText, Loader2, Download, AlertCircle, 
  Clipboard, CheckCircle2, Clock, Layers, Sliders, Sparkles, Zap, Wand2,
  Image as ImageIcon, Scissors, FileCode, Palette, TrendingUp,
  Plus, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { parseApiResponse, normalizeOcrChoicesAndFormatting, normalizeMathText } from '../lib/utils';
import { run1ClickMathFix } from '../components/math-tools/MathFormulaFixer';
import {
  getPdfTotalPages,
  openPdfDocument,
  renderLoadedPdfPageWithFigures,
  renderPdfPageWithFigures,
  PdfDetectedFigure,
} from '../lib/pdfUtils';
import {
  BoxTuple,
  CROP_FIG_TAG_RE,
  buildCroppedFigureImgTag,
  measureImageDisplaySize,
  resolveCropFigMarkers,
  injectFigureIntoPageMarkdown,
  applyPdfDetectedFigures,
  recoverMissingPageFigures,
} from '../lib/figureExtraction';
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

const optimizeImageForOcr = async (
  file: File
): Promise<{
  data: string;
  type: string;
  name: string;
  hdDataUrl: string;
}> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalDataUrl = (e.target?.result as string) || '';
      const img = new Image();
      img.onload = () => {
        // Keep a crisp HD copy (up to 1800px) for razor-sharp original-figure cropping (BBT/graphs)
        const HD_DIM = 1800;
        let hdW = img.width;
        let hdH = img.height;
        if (hdW > HD_DIM || hdH > HD_DIM) {
          if (hdW > hdH) {
            hdH = Math.round((hdH * HD_DIM) / hdW);
            hdW = HD_DIM;
          } else {
            hdW = Math.round((hdW * HD_DIM) / hdH);
            hdH = HD_DIM;
          }
        }
        let hdDataUrl = originalDataUrl;
        const hdCanvas = document.createElement('canvas');
        hdCanvas.width = hdW;
        hdCanvas.height = hdH;
        const hdCtx = hdCanvas.getContext('2d');
        if (hdCtx) {
          hdCtx.fillStyle = '#ffffff';
          hdCtx.fillRect(0, 0, hdW, hdH);
          hdCtx.drawImage(img, 0, 0, hdW, hdH);
          hdDataUrl = hdCanvas.toDataURL('image/jpeg', 0.9);
        }

        // Send a lean 1200px JPEG (~80-140KB) to Gemini Vision for 40% faster upload & tokenization
        const AI_DIM = 1200;
        let aiW = img.width;
        let aiH = img.height;
        if (aiW > AI_DIM || aiH > AI_DIM) {
          if (aiW > aiH) {
            aiH = Math.round((aiH * AI_DIM) / aiW);
            aiW = AI_DIM;
          } else {
            aiW = Math.round((aiW * AI_DIM) / aiH);
            aiH = AI_DIM;
          }
        }
        const aiCanvas = document.createElement('canvas');
        aiCanvas.width = aiW;
        aiCanvas.height = aiH;
        const aiCtx = aiCanvas.getContext('2d');
        if (aiCtx) {
          aiCtx.fillStyle = '#ffffff';
          aiCtx.fillRect(0, 0, aiW, aiH);
          aiCtx.drawImage(img, 0, 0, aiW, aiH);
          const mimeType = 'image/jpeg';
          const aiDataUrl = aiCanvas.toDataURL(mimeType, 0.78);
          resolve({
            data: aiDataUrl.split(',')[1],
            type: mimeType,
            name: file.name.replace(/\.png$/i, '.jpg'),
            hdDataUrl,
          });
          return;
        }
        const raw = originalDataUrl.split(',')[1] || '';
        resolve({ data: raw, type: file.type || 'image/png', name: file.name, hdDataUrl: originalDataUrl });
      };
      img.onerror = () => {
        const raw = originalDataUrl.split(',')[1] || '';
        resolve({ data: raw, type: file.type || 'image/png', name: file.name, hdDataUrl: originalDataUrl });
      };
      img.src = originalDataUrl;
    };
    reader.onerror = () => {
      resolve({ data: '', type: file.type || 'image/png', name: file.name, hdDataUrl: '' });
    };
    reader.readAsDataURL(file);
  });
};

const downscaleDataUrlForAi = async (
  dataUrl: string,
  maxDim = 1200,
  quality = 0.78
): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve) => {
    const fallbackMime = dataUrl.match(/^data:([^;]+);base64,/)?.[1] || 'image/jpeg';
    const fallbackData = dataUrl.split(',')[1] || '';
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
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
      if (!ctx) {
        resolve({ data: fallbackData, mimeType: fallbackMime });
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const compactUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({ data: compactUrl.split(',')[1] || fallbackData, mimeType: 'image/jpeg' });
    };
    img.onerror = () => resolve({ data: fallbackData, mimeType: fallbackMime });
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

const encodePuaNum = (n: number): string =>
  String(n)
    .split('')
    .map((c) => String.fromCharCode(0xe200 + Number(c)))
    .join('');

const decodePuaNum = (s: string): number =>
  Number(
    s
      .split('')
      .map((c) => String(c.charCodeAt(0) - 0xe200))
      .join('')
  );

const cleanAndNormalizePageMarkdown = (rawText: string): string => {
  if (!rawText) return '';
  let text = rawText;
  text = text.replace(/```(?:tikz|latex)?\s*\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}\s*```/gi, '\n[Hình vẽ minh họa]\n');
  text = text.replace(/```tikz[\s\S]*?```/gi, '\n[Hình vẽ minh họa]\n');
  text = text.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '\n[Hình vẽ minh họa]\n');
  text = text.replace(/```(?:svg|xml|html)?\s*<svg[\s\S]*?<\/svg>\s*```/gi, '\n[Hình vẽ minh họa]\n');
  text = text.replace(/<svg\b[\s\S]*?<\/svg>/gi, '\n[Hình vẽ minh họa]\n');
  text = text.replace(/<svg-wrapper\b[^>]*>[\s\S]*?<\/svg-wrapper>/gi, '\n[Hình vẽ minh họa]\n');

  const cropTokens: string[] = [];
  text = text.replace(CROP_FIG_TAG_RE, (m) => {
    const idx = cropTokens.length;
    cropTokens.push(m);
    return `\uE020${encodePuaNum(idx)}\uE021`;
  });

  // Protect [DOCX_IMG_N] tokens and existing <img> tags from math/OCR regexes
  const mediaTokens: string[] = [];
  text = text.replace(/\[DOCX_IMG_\d+\]|<img\b[^>]*>/gi, (m) => {
    const idx = mediaTokens.length;
    mediaTokens.push(m);
    return `\uE022${encodePuaNum(idx)}\uE023`;
  });

  // Protect HTML <table> blocks (e.g. 2-column borderless exam headers) from math/OCR line-splitting regexes
  const htmlTableTokens: string[] = [];
  text = text.replace(/<table\b[\s\S]*?<\/table>/gi, (m) => {
    const idx = htmlTableTokens.length;
    htmlTableTokens.push(sanitizeHtmlTableInlineMarkdown(m));
    return `\n\n\uE024${encodePuaNum(idx)}\uE025\n\n`;
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

  text = text.replace(/\uE024([\uE200-\uE209]+)\uE025/g, (_m, enc) => htmlTableTokens[decodePuaNum(enc)] || '');
  text = text.replace(/\uE022([\uE200-\uE209]+)\uE023/g, (_m, enc) => mediaTokens[decodePuaNum(enc)] || '');
  text = text.replace(/\uE020([\uE200-\uE209]+)\uE021/g, (_m, enc) => cropTokens[decodePuaNum(enc)] || '');
  return text.trim();
};

type PageMode = 'recommended' | 'range' | 'all';
type VisualMode = 'auto_crop' | 'crop_manual' | 'tables_only';

interface QueuedImage {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  source: 'clipboard' | 'upload';
}

export function PdfToWord() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<QueuedImage[]>([]);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
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
  const addMoreImagesInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<any>(null);
  const pasteNoticeTimerRef = useRef<any>(null);
  const pdfPageImagesRef = useRef<{ [pageNum: number]: string }>({});
  const resultTextRef = useRef<string>('');
  const fromPageRef = useRef<number>(1);
  const isUploadingRef = useRef<boolean>(false);
  const cancelRunIdRef = useRef<number>(0);
  const createdUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    pdfPageImagesRef.current = pdfPageImages;
  }, [pdfPageImages]);

  useEffect(() => {
    resultTextRef.current = resultText;
  }, [resultText]);

  useEffect(() => {
    fromPageRef.current = fromPage;
  }, [fromPage]);

  useEffect(() => {
    isUploadingRef.current = isUploading;
  }, [isUploading]);

  // Clean up progress timer, paste toast timer, and object URLs on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (pasteNoticeTimerRef.current) clearTimeout(pasteNoticeTimerRef.current);
      createdUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      createdUrlsRef.current.clear();
    };
  }, []);

  const showTransientPasteNotice = (msg: string) => {
    setPasteNotice(msg);
    if (pasteNoticeTimerRef.current) clearTimeout(pasteNoticeTimerRef.current);
    pasteNoticeTimerRef.current = setTimeout(() => {
      setPasteNotice(null);
    }, 3500);
  };

  const clearQueuedImages = () => {
    setImageFiles((prev) => {
      prev.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
        createdUrlsRef.current.delete(item.previewUrl);
      });
      return [];
    });
  };

  const clearAllInputs = () => {
    setSelectedFile(null);
    setFileArrayBuffer(null);
    clearQueuedImages();
    setPdfPageImages({});
    setError(null);
    setPasteNotice(null);
  };

  const addImagesToQueue = (files: File[], source: 'clipboard' | 'upload') => {
    if (!files || files.length === 0) return;

    const now = Date.now();
    const newItems: QueuedImage[] = files.map((file, idx) => {
      const previewUrl = URL.createObjectURL(file);
      createdUrlsRef.current.add(previewUrl);
      return {
        id: `img_${now}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        source,
      };
    });

    // Switch from PDF/DOCX mode to multi-image queue cleanly
    setSelectedFile(null);
    setFileArrayBuffer(null);
    setError(null);
    setPageMode('all');

    setImageFiles((prev) => {
      const next = [...prev, ...newItems];
      setPdfTotalPages(next.length);
      setFromPage(1);
      setToPage(next.length);
      showTransientPasteNotice(
        source === 'clipboard'
          ? `Đã dán thêm ${newItems.length} ảnh từ Clipboard (Tổng: ${next.length} ảnh) — Nhấn Ctrl + V để dán tiếp`
          : `Đã thêm ${newItems.length} ảnh vào danh sách (Tổng: ${next.length} ảnh)`
      );
      return next;
    });
  };

  const removeQueuedImage = (id: string) => {
    setImageFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        createdUrlsRef.current.delete(target.previewUrl);
      }
      const next = prev.filter((item) => item.id !== id);
      setPdfTotalPages(Math.max(1, next.length));
      setFromPage(1);
      setToPage(Math.max(1, next.length));
      return next;
    });
  };

  const moveQueuedImage = (index: number, direction: -1 | 1) => {
    setImageFiles((prev) => {
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  // Detect total pages when file is selected
  const handleInspectFile = async (file: File) => {
    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name)) {
      addImagesToQueue([file], 'upload');
      return;
    }

    clearQueuedImages();
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
    }
  };

  const handleIncomingFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const imageList = files.filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(f.name)
    );
    const nonImage = files.find(
      (f) => !f.type.startsWith('image/') && !/\.(png|jpe?g|webp|bmp|gif)$/i.test(f.name)
    );

    if (imageList.length > 0 && !nonImage) {
      addImagesToQueue(imageList, 'upload');
    } else if (nonImage) {
      handleInspectFile(nonImage);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleIncomingFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleAddMoreImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const imgs = Array.from(e.target.files).filter(
        (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(f.name)
      );
      if (imgs.length > 0) {
        addImagesToQueue(imgs, 'upload');
      }
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  };

  // Multi-image Clipboard Paste Support (Ctrl + V / Cmd + V)
  const processClipboardData = (clipboardData: DataTransfer | null) => {
    if (!clipboardData || isUploadingRef.current) return false;

    const extractedImages: File[] = [];
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (clipboardData.items && clipboardData.items.length > 0) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.kind === 'file' && item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png';
            const namedFile = new File(
              [file],
              `Anh_Clipboard_${dateStr}_${extractedImages.length + 1}.${ext}`,
              { type: file.type || 'image/png' }
            );
            extractedImages.push(namedFile);
          }
        }
      }
    }

    // Fallback: some OS file-copy operations expose multiple image files via clipboardData.files
    if (extractedImages.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name)) {
          extractedImages.push(file);
        }
      }
    }

    if (extractedImages.length > 0) {
      addImagesToQueue(extractedImages, 'clipboard');
      return true;
    }
    return false;
  };

  const handlePasteEvent = (e: React.ClipboardEvent) => {
    if (processClipboardData(e.clipboardData)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleReadClipboardButton = async () => {
    if (isUploadingRef.current) return;
    if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
      try {
        const clipboardItems = await navigator.clipboard.read();
        const extracted: File[] = [];
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const ext = imageType === 'image/jpeg' ? 'jpg' : imageType === 'image/webp' ? 'webp' : 'png';
            extracted.push(
              new File([blob], `Anh_Clipboard_${dateStr}_${extracted.length + 1}.${ext}`, {
                type: imageType,
              })
            );
          }
        }

        if (extracted.length > 0) {
          addImagesToQueue(extracted, 'clipboard');
          return;
        }
        showTransientPasteNotice('Clipboard hiện chưa có hình ảnh. Hãy chụp/sao chép ảnh rồi nhấn Ctrl + V.');
        return;
      } catch {
        // Fallback hint when iframe/browser restricts navigator.clipboard.read()
      }
    }
    showTransientPasteNotice('Hãy nhấn phím tắt Ctrl + V (hoặc Cmd + V) trực tiếp trên bàn phím để dán ảnh.');
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
      if (e.defaultPrevented) return;
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

  const processDocx = async (file: File): Promise<{ textWithPlaceholders: string; imageMap: Record<string, string> }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        mammoth.convertToHtml({ arrayBuffer })
          .then(function(result) {
            const imageMap: Record<string, string> = {};
            let imgCounter = 0;
            const htmlWithTokens = (result.value || '').replace(/<img\b[^>]*src=["'](data:image\/[^"']+)["'][^>]*>/gi, (_m, src) => {
              imgCounter += 1;
              const token = `[DOCX_IMG_${imgCounter}]`;
              imageMap[token] = src;
              return `\n\n${token}\n\n`;
            });
            resolve({ textWithPlaceholders: htmlWithTokens, imageMap });
          })
          .catch(function(err) { reject(err); });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Start real-time progress animation
  const startProgressTracking = (targetPages: number, isImageBatch = false) => {
    const estimatedSec = Math.max(6, Math.round(targetPages * 3.5));
    setEstimatedTimeSec(estimatedSec);
    setElapsedSec(0);
    setProgressPercent(5);
    setProgressStatus(
      isImageBatch
        ? `🖼️ Đang khởi tạo và chuẩn bị số hóa ${targetPages} ảnh...`
        : `📄 Đang khởi tạo và chuẩn bị phân tích ${targetPages} trang...`
    );

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSec(elapsed);

      // Smooth percentage calculation up to 94% without regressing real page completion progress
      const ratio = elapsed / estimatedSec;
      const currentPercent = Math.min(94, Math.round(ratio * 88 + 5));

      setProgressStatus((prev) => {
        if (
          prev.startsWith('✨ Đã số hóa xong') ||
          prev.startsWith('📄 Đang số hóa') ||
          prev.startsWith('🖼️ Đang số hóa')
        ) {
          return prev;
        }
        if (currentPercent < 25) {
          return isImageBatch
            ? `🖼️ Đang tối ưu độ nét và xử lý ${targetPages} ảnh theo thứ tự...`
            : `📄 Đang đọc và tách trang PDF...`;
        }
        if (currentPercent < 55) {
          return `🧮 Đang bóc tách hình ảnh, chữ số và công thức Toán/Lý/Hóa...`;
        }
        if (currentPercent < 80) {
          return `✂️ Đang dò khung hình vẽ gốc và chuẩn hóa công thức LaTeX...`;
        }
        return `✨ Đang kiểm tra định dạng và tổng hợp văn bản Word (.docx)...`;
      });

      setProgressPercent((prev) => Math.max(prev, currentPercent));
    }, 400);
  };

  const handleCancelConvert = () => {
    cancelRunIdRef.current += 1;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setIsUploading(false);
    setProgressPercent(0);
    setProgressStatus('');
    setError('Đã hủy quá trình chuyển đổi theo yêu cầu.');
  };

  const handleConvert = async () => {
    const hasImages = imageFiles.length > 0 && !selectedFile;
    if (!selectedFile && !hasImages) {
      setError('Vui lòng chọn file hoặc dán ảnh bằng Ctrl + V trước.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResultText('');

    const isPdf = Boolean(
      selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf'))
    );
    
    // Determine target page range
    let startP = 1;
    let endP = hasImages ? imageFiles.length : pdfTotalPages;
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
    } else if (hasImages) {
      setFromPage(1);
      setToPage(imageFiles.length);
      setPdfTotalPages(imageFiles.length);
    }

    const runId = ++cancelRunIdRef.current;
    const isCancelled = () => cancelRunIdRef.current !== runId;

    const pagesToProcess = isPdf ? (endP - startP + 1) : (hasImages ? imageFiles.length : 1);
    startProgressTracking(pagesToProcess, hasImages);

    try {
      let finalResult = '';

      const fetchPdfToWordWithRetry = async (
        payloadObj: Record<string, any>,
        pageLabel: string,
        onTransientBusy?: () => void
      ): Promise<{ ok: boolean; status: number; text: string }> => {
        const retryDelaysMs = [1500, 3500, 6500];
        let lastStatus = 500;
        let lastText = '';

        for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
          if (isCancelled()) {
            return { ok: false, status: 499, text: '' };
          }
          // Use fast unary generateContent by default (with automatic stream recovery inside generateWithFallback),
          // and explicitly try stream-first transport on retry attempt 2 if unary encounters sustained 503 spikes
          const attemptPayload = JSON.stringify({
            ...payloadObj,
            preferStream: attempt === 2,
          });
          try {
            const resp = await apiFetch('/api/pdf-to-word', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: attemptPayload,
            });
            lastStatus = resp.status;
            lastText = await resp.text();

            const trimmedText = lastText.trim();
            let bodyErrorMsg = '';
            if (trimmedText.startsWith('{')) {
              try {
                const parsedBody = JSON.parse(trimmedText);
                if (parsedBody && parsedBody.error && !parsedBody.result) {
                  bodyErrorMsg =
                    typeof parsedBody.error === 'string'
                      ? parsedBody.error
                      : parsedBody.error?.message || JSON.stringify(parsedBody.error);
                }
              } catch (_) {}
            }

            const isEmptyOk = resp.ok && !trimmedText;
            const isBodyError = resp.ok && Boolean(bodyErrorMsg);
            const combinedErrText = (bodyErrorMsg || trimmedText).toLowerCase();

            const isHardAuthOrBadReq =
              resp.status === 400 ||
              resp.status === 401 ||
              resp.status === 403 ||
              combinedErrText.includes('api_key_invalid') ||
              combinedErrText.includes('api key not valid') ||
              combinedErrText.includes('missing gemini api key');

            const isTransientStatus =
              resp.status === 503 ||
              resp.status === 504 ||
              resp.status === 500 ||
              resp.status === 502 ||
              resp.status === 429;
            const isBodyTransientError =
              isBodyError &&
              /high demand|unavailable|overloaded|503|504|429|quota|rate.?limit|resource_exhausted|try again later|timed?\s*out|timeout|quá tải/i.test(
                combinedErrText
              );

            if (resp.ok && !isEmptyOk && !isBodyError) {
              return { ok: true, status: resp.status, text: lastText };
            }

            if (
              !isHardAuthOrBadReq &&
              (isTransientStatus || isEmptyOk || isBodyTransientError) &&
              attempt < retryDelaysMs.length
            ) {
              onTransientBusy?.();
              const waitMs = retryDelaysMs[attempt] + Math.floor(Math.random() * 500);
              if (!isCancelled()) {
                setProgressStatus(`⏳ Máy chủ AI đang bận, tự động thử lại ${pageLabel} (lần ${attempt + 2})...`);
              }
              await new Promise((r) => setTimeout(r, waitMs));
              continue;
            }

            return { ok: false, status: isBodyError ? 503 : resp.status, text: lastText };
          } catch (netErr: any) {
            onTransientBusy?.();
            lastStatus = 503;
            lastText = JSON.stringify({ error: netErr?.message || 'Lỗi kết nối mạng tới dịch vụ AI.' });
            if (attempt < retryDelaysMs.length) {
              const waitMs = retryDelaysMs[attempt] + Math.floor(Math.random() * 500);
              await new Promise((r) => setTimeout(r, waitMs));
              continue;
            }
          }
        }
        return { ok: false, status: lastStatus, text: lastText };
      };

      const joinCompletedPages = (results: Array<string | undefined>, firstPageNum: number): string => {
        const completedParts: Array<{ pageNum: number; text: string }> = [];
        for (let idx = 0; idx < results.length; idx++) {
          if (typeof results[idx] === 'string' && results[idx]!.trim().length > 0) {
            completedParts.push({ pageNum: firstPageNum + idx, text: results[idx]! });
          }
        }
        return completedParts
          .map((item, idx) => {
            const sep =
              idx < completedParts.length - 1
                ? `\n\n--- [Hết Trang ${item.pageNum} / Sang Trang ${completedParts[idx + 1].pageNum}] ---\n\n`
                : '';
            return item.text + sep;
          })
          .join('');
      };

      // Continuous adaptive concurrency: 3 workers when >=2 active keys, 2 workers for 1 key,
      // automatically throttling to 1 worker immediately if Google returns 503/429.
      const initialConcurrency = getActiveApiKeyPool().length >= 2 ? 3 : 2;

      if (hasImages) {
        // Multi-image OCR with continuous worker pool & live progressive preview
        const totalImages = imageFiles.length;
        const pageImagesMap: { [pageNum: number]: string } = {};
        const pageResults: Array<string | undefined> = new Array(totalImages);
        let completedCount = 0;
        let maxActiveWorkers = Math.min(initialConcurrency, totalImages);
        let nextIndex = 0;
        let firstError: Error | null = null;

        const runImageWorker = async (workerId: number) => {
          if (workerId > 0) {
            await new Promise((r) => setTimeout(r, workerId * 220));
          }
          while (!isCancelled() && !firstError) {
            if (workerId >= maxActiveWorkers) {
              return;
            }
            const imgIdx = nextIndex++;
            if (imgIdx >= totalImages) return;

            const p = imgIdx + 1;
            const imgItem = imageFiles[imgIdx];
            const optimized = await optimizeImageForOcr(imgItem.file);
            if (isCancelled() || firstError) return;
            pageImagesMap[p] = optimized.hdDataUrl || `data:${optimized.type};base64,${optimized.data}`;

            const payloadObj = {
              files: [{ data: optimized.data, type: optimized.type, name: optimized.name }],
              pageNum: p,
              totalPages: totalImages,
            };

            const fetched = await fetchPdfToWordWithRetry(payloadObj, `ảnh ${p}`, () => {
              maxActiveWorkers = 1;
            });
            if (isCancelled() || firstError) return;

            if (!fetched.ok) {
              let errorData: any;
              try { errorData = JSON.parse(fetched.text); } catch { errorData = { error: fetched.text }; }
              const errorMsg = typeof errorData.error === 'object' ? JSON.stringify(errorData.error) : (errorData.error || `Lỗi xử lý ảnh ${p}`);
              firstError = new Error(errorMsg);
              return;
            }

            const data = parseApiResponse<any>(fetched.text);
            let pageText =
              typeof data.result === 'string'
                ? data.result
                : data.result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            if (pageText) {
              pageText = cleanAndNormalizePageMarkdown(pageText);
              const resolved = await resolveCropFigMarkers(pageText, pageImagesMap, visualMode === 'auto_crop', p);
              pageText = resolved.text;
              if (visualMode === 'auto_crop' && pageImagesMap[p]) {
                pageText = await recoverMissingPageFigures(pageText, pageImagesMap[p], p, resolved.croppedBoxes, {
                  replaceLeakedBbtTable: true,
                });
              }
            }

            pageResults[imgIdx] = pageText.trim();
            completedCount += 1;
            if (!isCancelled() && !firstError) {
              setPdfPageImages({ ...pageImagesMap });
              setResultText(joinCompletedPages(pageResults, 1));
              setProgressPercent(Math.min(96, Math.round((completedCount / totalImages) * 90 + 5)));
              setProgressStatus(`✨ Đã số hóa xong ${completedCount}/${totalImages} ảnh...`);
            }
          }
        };

        await Promise.all(
          Array.from({ length: maxActiveWorkers }, (_v, idx) => runImageWorker(idx))
        );
        if (firstError) throw firstError;
        if (isCancelled()) return;
        setPdfPageImages({ ...pageImagesMap });
        finalResult = joinCompletedPages(pageResults, 1);
      } else if (isPdf && selectedFile) {
        // Multi-page PDF: Open PDF ONCE, render HD page for figure cropping + lean 1200px JPEG for fast AI OCR,
        // stream through continuous worker pool with live page-by-page preview!
        const pageImagesMap: { [pageNum: number]: string } = {};
        const pageDetectedFiguresMap: { [pageNum: number]: PdfDetectedFigure[] } = {};

        let renderFailed = false;
        try {
          const freshBuffer = await selectedFile.arrayBuffer();
          const pageResults: Array<string | undefined> = new Array(pagesToProcess);
          let completedCount = 0;

          let docHandle: { pdf: any; numPages: number; destroy: () => Promise<void> } | null = null;
          try {
            docHandle = await openPdfDocument(freshBuffer.slice(0));
          } catch (openErr) {
            renderFailed = true;
            throw openErr;
          }

          try {
            // Pre-render pages into HD map + compact AI copy sequentially on the single PDF.js handle (~120ms/page)
            // while AI workers consume pages as soon as each page is rendered!
            type RenderedJob = {
              batchIdx: number;
              p: number;
              aiData: string;
              aiMimeType: string;
              detectedFigures: PdfDetectedFigure[];
            };
            const renderedJobs: Array<Promise<RenderedJob>> = [];
            let renderChain: Promise<void> = Promise.resolve();

            for (let j = 0; j < pagesToProcess; j++) {
              const batchIdx = j;
              const p = startP + batchIdx;
              const jobPromise = new Promise<RenderedJob>((resolve, reject) => {
                renderChain = renderChain.then(async () => {
                  if (isCancelled()) {
                    reject(new Error('CANCELLED'));
                    return;
                  }
                  try {
                    const rendered = await renderLoadedPdfPageWithFigures(docHandle!.pdf, p, 1.55, 'jpeg');
                    pageImagesMap[p] = rendered.dataUrl;
                    pageDetectedFiguresMap[p] = rendered.detectedFigures;
                    const compact = await downscaleDataUrlForAi(rendered.dataUrl, 1200, 0.78);
                    resolve({
                      batchIdx,
                      p,
                      aiData: compact.data,
                      aiMimeType: compact.mimeType,
                      detectedFigures: rendered.detectedFigures,
                    });
                  } catch (rErr) {
                    renderFailed = true;
                    reject(rErr);
                  }
                });
              });
              // Prevent unhandled rejection if worker aborts early
              jobPromise.catch(() => {});
              renderedJobs.push(jobPromise);
            }

            let maxActiveWorkers = Math.min(initialConcurrency, pagesToProcess);
            let nextIdx = 0;
            let firstError: any = null;

            const runPdfWorker = async (workerId: number) => {
              if (workerId > 0) {
                await new Promise((r) => setTimeout(r, workerId * 220));
              }
              while (!isCancelled() && !firstError) {
                if (workerId >= maxActiveWorkers) {
                  return;
                }
                const idx = nextIdx++;
                if (idx >= pagesToProcess) return;

                let job: RenderedJob;
                try {
                  job = await renderedJobs[idx];
                } catch (rErr: any) {
                  if (rErr?.message !== 'CANCELLED' && !firstError) {
                    firstError = rErr;
                  }
                  return;
                }
                if (isCancelled() || firstError) return;

                const { batchIdx, p, aiData, aiMimeType, detectedFigures } = job;
                const payloadObj = {
                  files: [{
                    data: aiData,
                    type: aiMimeType,
                    name: `Trang_${p}.jpg`
                  }],
                  pageNum: p,
                  totalPages: pdfTotalPages
                };

                const fetched = await fetchPdfToWordWithRetry(payloadObj, `trang ${p}`, () => {
                  maxActiveWorkers = 1;
                });
                if (isCancelled() || firstError) return;

                if (!fetched.ok) {
                  let errorData: any;
                  try { errorData = JSON.parse(fetched.text); } catch { errorData = { error: fetched.text }; }
                  const errorMsg = typeof errorData.error === 'object' ? JSON.stringify(errorData.error) : (errorData.error || `Lỗi xử lý trang ${p}`);
                  firstError = new Error(errorMsg);
                  return;
                }

                const data = parseApiResponse<any>(fetched.text);
                let pageText = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || '');

                if (pageText) {
                  pageText = cleanAndNormalizePageMarkdown(pageText);
                  const resolved = await resolveCropFigMarkers(pageText, pageImagesMap, visualMode === 'auto_crop', p);
                  pageText = resolved.text;
                  let croppedBoxes = resolved.croppedBoxes;

                  // Layer 2: Deterministic PDF vector/image figure recovery (instant, zero AI calls)
                  if (visualMode === 'auto_crop' && pageImagesMap[p] && detectedFigures.length > 0) {
                    const pdfFigRes = await applyPdfDetectedFigures(
                      pageText,
                      pageImagesMap[p],
                      p,
                      detectedFigures,
                      croppedBoxes,
                      { replaceLeakedBbtTable: true }
                    );
                    pageText = pdfFigRes.text;
                    croppedBoxes = pdfFigRes.croppedBoxes;
                  }

                  // Layer 3: Pass-2 Vision recovery ONLY when a printed figure/BBT/graph is explicitly missing
                  if (visualMode === 'auto_crop' && pageImagesMap[p]) {
                    pageText = await recoverMissingPageFigures(pageText, pageImagesMap[p], p, croppedBoxes, {
                      replaceLeakedBbtTable: true,
                    });
                  }
                }
                pageResults[batchIdx] = pageText.trim();
                completedCount += 1;
                if (!isCancelled() && !firstError) {
                  setPdfPageImages({ ...pageImagesMap });
                  setResultText(joinCompletedPages(pageResults, startP));
                  setProgressPercent(Math.min(96, Math.round((completedCount / pagesToProcess) * 90 + 5)));
                  setProgressStatus(`✨ Đã số hóa xong ${completedCount}/${pagesToProcess} trang PDF...`);
                }
              }
            };

            await Promise.all(
              Array.from({ length: maxActiveWorkers }, (_v, idx) => runPdfWorker(idx))
            );
            if (firstError) throw firstError;
          } finally {
            await docHandle?.destroy();
          }

          if (isCancelled()) return;
          setPdfPageImages({ ...pageImagesMap });

          // Combine all pages with standard page separation markers
          finalResult = joinCompletedPages(pageResults, startP);
        } catch (pageErr: any) {
          if (isCancelled()) return;
          // Never waste 60s+ retrying whole-PDF fallback if the error came from Gemini API (401/404/429/503/timeout)
          if (!renderFailed) {
            throw pageErr;
          }
          console.warn('PDF.js page render failed, falling back to direct multimodal PDF processing:', pageErr);
          setProgressStatus('⚡ Đang xử lý bóc tách tài liệu PDF trực tiếp bằng AI...');
          setProgressPercent(60);

          const rawBase64 = await fileToBase64(selectedFile);
          const directPayloadObj = {
            files: [{
              data: rawBase64,
              type: 'application/pdf',
              name: selectedFile.name
            }],
            totalPages: pdfTotalPages
          };
          const fetchedDirect = await fetchPdfToWordWithRetry(directPayloadObj, 'tài liệu PDF');
          if (isCancelled()) return;

          if (!fetchedDirect.ok) {
            let errorData;
            try { errorData = JSON.parse(fetchedDirect.text); } catch { errorData = { error: fetchedDirect.text }; }
            let errorMsg = errorData.error || 'Có lỗi xảy ra khi số hóa tài liệu PDF';
            if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
            throw new Error(errorMsg);
          }

          const data = parseApiResponse<any>(fetchedDirect.text);
          let rawRes = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data.result));
          finalResult = cleanAndNormalizePageMarkdown(rawRes);

          // Try rendering PDF pages + detecting vector figures so auto-crop & manual cropper still work even after direct-PDF fallback
          try {
            const fallbackBuf = await selectedFile.arrayBuffer();
            for (let p = startP; p <= endP; p++) {
              if (!pageImagesMap[p]) {
                try {
                  const rendered = await renderPdfPageWithFigures(fallbackBuf.slice(0), p, 1.8);
                  pageImagesMap[p] = rendered.dataUrl;
                  pageDetectedFiguresMap[p] = rendered.detectedFigures;
                } catch {}
              }
            }
          } catch {}

          if (Object.keys(pageImagesMap).length > 0) {
            setPdfPageImages({ ...pageImagesMap });
            const resolvedFallback = await resolveCropFigMarkers(finalResult, pageImagesMap, visualMode === 'auto_crop', startP);
            finalResult = resolvedFallback.text;
            if (visualMode === 'auto_crop') {
              const sepRegex = /(\n*---\s*\[Hết Trang \d+\s*\/\s*Sang Trang \d+\]\s*---\n*)/gi;
              const segs = finalResult.split(sepRegex);
              let pageCursor = startP;
              for (let sIdx = 0; sIdx < segs.length; sIdx += 2) {
                const imgUrl = pageImagesMap[pageCursor];
                if (imgUrl && segs[sIdx]) {
                  let segText = segs[sIdx];
                  let segBoxes: BoxTuple[] = [];
                  const detFigs = pageDetectedFiguresMap[pageCursor] || [];
                  if (detFigs.length > 0) {
                    const pdfFigRes = await applyPdfDetectedFigures(segText, imgUrl, pageCursor, detFigs, segBoxes, {
                      replaceLeakedBbtTable: true,
                    });
                    segText = pdfFigRes.text;
                    segBoxes = pdfFigRes.croppedBoxes;
                  }
                  segs[sIdx] = await recoverMissingPageFigures(segText, imgUrl, pageCursor, segBoxes, {
                    replaceLeakedBbtTable: true,
                  });
                }
                pageCursor += 1;
              }
              finalResult = segs.join('');
            }
          }
        }

        // Tuyệt đối không tự bịa đồ thị vector bằng autoEnrichTextWithVisuals khi chuyển PDF sang Word

      } else if (selectedFile) {
        // Single Image or DOCX
        let fileListForApi: { data: string; type: string; name: string }[] = [];
        const isDocx = selectedFile.name.toLowerCase().endsWith('.docx');
        const singlePageImages: { [pageNum: number]: string } = {};
        let docxImageMap: Record<string, string> = {};

        if (isDocx) {
          const { textWithPlaceholders, imageMap } = await processDocx(selectedFile);
          docxImageMap = imageMap;
          const fileData = btoa(unescape(encodeURIComponent(textWithPlaceholders)));
          fileListForApi = [{ data: fileData, type: 'text/plain', name: selectedFile.name }];
        } else {
          // Keep HD copy for cropping original figures & send lean 1200px JPEG to Gemini for fast OCR
          const optimized = await optimizeImageForOcr(selectedFile);
          fileListForApi = [{ data: optimized.data, type: optimized.type, name: optimized.name }];
          singlePageImages[1] = optimized.hdDataUrl || `data:${optimized.type};base64,${optimized.data}`;
          setPdfPageImages(singlePageImages);
        }

        const singlePayloadObj = {
          files: fileListForApi,
          ...(isDocx ? {} : { pageNum: 1, totalPages: 1 })
        };
        const fetchedSingle = await fetchPdfToWordWithRetry(singlePayloadObj, selectedFile.name);
        if (isCancelled()) return;

        if (!fetchedSingle.ok) {
          let errorData;
          try {
             errorData = JSON.parse(fetchedSingle.text);
          } catch {
             errorData = { error: fetchedSingle.text };
          }
          let errorMsg = errorData.error || 'Có lỗi xảy ra khi xử lý file';
          if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
          throw new Error(errorMsg);
        }

        const data = parseApiResponse<any>(fetchedSingle.text);
        let rawRes = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data.result));
        finalResult = cleanAndNormalizePageMarkdown(rawRes);

        if (isDocx) {
          const docxEntries = Object.entries(docxImageMap);
          for (const [token, dataUrl] of docxEntries) {
            const { displayW, displayH } = await measureImageDisplaySize(dataUrl);
            const imgTag = buildCroppedFigureImgTag(dataUrl, 'Hình vẽ từ tài liệu Word gốc', 1, displayW, displayH);
            if (finalResult.includes(token)) {
              finalResult = finalResult.split(token).join(imgTag);
            } else {
              finalResult = injectFigureIntoPageMarkdown(finalResult, '', imgTag);
            }
          }
        } else {
          const resolved = await resolveCropFigMarkers(finalResult, singlePageImages, visualMode === 'auto_crop', 1);
          finalResult = resolved.text;
          if (visualMode === 'auto_crop' && singlePageImages[1]) {
            finalResult = await recoverMissingPageFigures(finalResult, singlePageImages[1], 1, resolved.croppedBoxes, {
              replaceLeakedBbtTable: true,
            });
          }
        }
      }

      if (isCancelled()) return;

      // Stop progress timer & jump to 100%
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgressPercent(100);
      setProgressStatus('🎉 Số hóa hoàn tất thành công!');

      setTimeout(() => {
        if (isCancelled()) return;
        setResultText(finalResult);
        setIsUploading(false);
      }, 300);

    } catch (err: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (isCancelled()) return;
      console.error(err);
      const errorMsg = err.message || '';
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        setError("Hệ thống đang quá tải hoặc tạm thời không khả dụng do nhu cầu cao. Vui lòng thử lại sau ít phút hoặc chọn khoảng trang ngắn hơn.");
      } else if (errorMsg.includes("timed out") || errorMsg.includes("504") || errorMsg.includes("quá thời gian") || errorMsg.includes("AbortError")) {
        setError("Máy chủ AI phản hồi quá thời gian chờ. Vui lòng bấm chuyển đổi lại (hoặc kiểm tra kết nối mạng / API Key).");
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
    const imgTag = `\n\n<img src="${croppedDataUrl}" alt="Hình vẽ minh họa đề thi" data-cropped-figure="true" class="max-w-[540px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm block" data-width="${displayW}" data-height="${displayH}" />\n\n`;

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

  const handleExportWord = (useMathType: boolean = false) => {
    if (!resultText || !exportRef.current) return;
    exportHtmlToWord(
      exportRef.current,
      `TaiLieu_DaChuyenDoi_${new Date().getTime()}${useMathType ? '_MathType' : ''}.docx`,
      useMathType ? 'mathtype' : 'omml'
    );
  };

  const handleExportLatex = () => {
    if (!resultText) return;
    const rawName = selectedFile
      ? selectedFile.name.replace(/\.[^/.]+$/, '')
      : imageFiles.length === 1
        ? imageFiles[0].name.replace(/\.[^/.]+$/, '')
        : imageFiles.length > 1
          ? `TaiLieu_${imageFiles.length}_Anh`
          : 'TaiLieu_DaChuyenDoi';
    exportToLatexTexFile(resultText, `${rawName}_LaTeX.tex`);
  };

  const isPdf = Boolean(
    selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf'))
  );
  const isImageQueue = imageFiles.length > 0 && !selectedFile;
  const hasInput = Boolean(selectedFile) || isImageQueue;

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
            Công cụ số hóa tài liệu thông minh bám sát chuẩn 100% công thức Toán/Lý/Hóa LaTeX, hỗ trợ dán liên tiếp nhiều ảnh bằng Ctrl + V, tự động phân đoạn trang và bảo toàn cấu trúc đề thi.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {pasteNotice && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{pasteNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setPasteNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded shrink-0 cursor-pointer"
                aria-label="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!hasInput ? (
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
                accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
                multiple
              />
              <div className="bg-blue-100/80 p-4 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center mb-4 text-blue-600 shadow-2xs">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Kéo thả file hoặc nhấn để tải lên</h3>
              <p className="text-slate-500 mb-4 text-sm">Hỗ trợ file PDF, chọn nhiều Ảnh (.png, .jpg, .webp), hoặc Word (.docx)</p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold mb-6 border border-blue-200 shadow-2xs">
                <Clipboard className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Nhấn <b>Ctrl + V</b> (Cmd + V) liên tiếp để dán <b>nhiều ảnh</b> trực tiếp từ Clipboard</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                >
                  Chọn File Tài Liệu
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReadClipboardButton();
                  }}
                  className="px-5 py-2.5 bg-white text-blue-700 border border-blue-300 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-2xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Clipboard className="w-4 h-4" />
                  <span>Dán ảnh từ Clipboard</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 shadow-2xs space-y-6"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPaste={handlePasteEvent}
            >
              {/* Selected Single File Overview OR Multi-Image Queue */}
              {isImageQueue ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700 shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          Danh sách ảnh chờ số hóa ({imageFiles.length} ảnh)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Nhấn <b className="text-slate-700">Ctrl + V</b> để dán thêm ảnh tiếp theo · Kéo thả hoặc sắp xếp thứ tự trước khi chuyển sang Word
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        ref={addMoreImagesInputRef}
                        onChange={handleAddMoreImagesSelect}
                        className="hidden"
                        accept=".png,.jpg,.jpeg,.webp"
                        multiple
                      />
                      <button
                        type="button"
                        onClick={handleReadClipboardButton}
                        disabled={isUploading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                        title="Đọc ảnh đang có trong Clipboard hoặc nhấn Ctrl + V"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Dán thêm (Ctrl+V)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addMoreImagesInputRef.current?.click()}
                        disabled={isUploading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chọn thêm ảnh</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearAllInputs}
                        disabled={isUploading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                        title="Xóa toàn bộ ảnh đã dán"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa hết</span>
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {imageFiles.map((img, idx) => (
                      <div
                        key={img.id}
                        className="group bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-blue-400 transition-colors"
                      >
                        <div className="relative aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
                          <img
                            src={img.previewUrl}
                            alt={`Ảnh ${idx + 1}`}
                            className="w-full h-full object-contain"
                          />
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-900/80 text-white text-[11px] font-bold rounded-md tabular-nums">
                            Trang {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeQueuedImage(img.id)}
                            disabled={isUploading}
                            className="absolute top-1.5 right-1.5 p-1 bg-white/90 hover:bg-rose-600 text-slate-600 hover:text-white rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            title="Xóa ảnh này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="p-2 bg-white border-t border-slate-100 flex items-center justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-slate-700 truncate" title={img.name}>
                              {img.name}
                            </p>
                            <p className="text-[10px] text-slate-400 tabular-nums">
                              {(img.size / 1024).toFixed(0)} KB · {img.source === 'clipboard' ? 'Ctrl+V' : 'Tải lên'}
                            </p>
                          </div>
                          {imageFiles.length > 1 && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveQueuedImage(idx, -1)}
                                disabled={idx === 0 || isUploading}
                                className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-30 cursor-pointer"
                                title="Di chuyển lên trước"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveQueuedImage(idx, 1)}
                                disabled={idx === imageFiles.length - 1 || isUploading}
                                className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-30 cursor-pointer"
                                title="Di chuyển ra sau"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Quick Paste / Add Card */}
                    <button
                      type="button"
                      onClick={() => addMoreImagesInputRef.current?.click()}
                      disabled={isUploading}
                      className="min-h-[140px] border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl flex flex-col items-center justify-center gap-1.5 p-3 text-center text-slate-500 hover:text-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-xs font-bold">Thêm ảnh</span>
                      <span className="text-[11px] text-slate-400">Hoặc nhấn Ctrl + V</span>
                    </button>
                  </div>
                </div>
              ) : selectedFile ? (
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
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    onClick={clearAllInputs}
                    title="Đổi file khác"
                    disabled={isUploading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : null}

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
                        <span>Tự cắt ảnh gốc 100% (Khuyên dùng)</span>
                      </div>
                      <div className="font-normal text-slate-500 text-[11px] mt-1 leading-relaxed">
                        Tự động cắt chính xác 100% ảnh gốc của Bảng biến thiên (BBT), Đồ thị và Hình vẽ từ tài liệu gốc chèn vào Word — không tự ý vẽ lại.
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
                        Chỉ số hóa văn bản, công thức LaTeX và bảng số liệu thống kê; không tự động cắt ảnh hay tự vẽ lại BBT/đồ thị.
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

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {isImageQueue ? (
                          <>Số ảnh xử lý: <b>{imageFiles.length} ảnh</b> (Trang 1 – {imageFiles.length})</>
                        ) : (
                          <>Số trang chọn: <b>{isPdf ? `${fromPage} - ${toPage}` : '1'}</b> ({isPdf ? toPage - fromPage + 1 : 1} trang)</>
                        )}
                      </span>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Thời gian: <b>{elapsedSec}s</b> / Dự kiến ~{estimatedTimeSec}s</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelConvert}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Hủy xử lý
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center gap-3">
                  <button 
                    className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-xl hover:bg-white flex items-center gap-2 font-medium text-sm transition-colors cursor-pointer"
                    onClick={clearAllInputs}
                  >
                    <X className="w-4 h-4" /> Hủy
                  </button>
                  <button 
                    className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center gap-2 text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                    onClick={handleConvert}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isImageQueue && imageFiles.length > 1
                        ? `Số hóa ${imageFiles.length} ảnh sang Word`
                        : 'Số hóa sang Word'}
                    </span>
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
                - Với <b>Bảng biến thiên (BBT), Bảng xét dấu, Đồ thị hàm số và Hình vẽ</b>: hệ thống <b>tự động cắt giữ nguyên 100% ảnh gốc từ trang tài liệu</b> đúng vị trí câu hỏi — tuyệt đối không tự ý vẽ lại. Chỉ các bảng số liệu thống kê thông thường mới chuyển sang dạng bảng Word. Thầy/cô vẫn có thể bấm <b>Cắt Trang</b> bên dưới để tinh chỉnh lại vùng cắt nếu muốn.
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
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span>Đang hiển thị kết quả từng trang...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <span>Tài liệu đã số hóa thành công!</span>
                  </>
                )}
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
                onClick={() => {
                  clearAllInputs();
                  setResultText('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-bold cursor-pointer"
              >
                Chuyển file khác
              </button>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => handleExportWord(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-bold text-xs cursor-pointer"
                  title="Xuất file Word (.docx) công thức chuẩn Word Equation (OMML)"
                >
                  <FileText className="w-4 h-4" /> Xuất Word (Equation)
                </button>
                <button 
                  onClick={() => handleExportWord(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-bold text-xs cursor-pointer"
                  title="Xuất file Word (.docx) công thức chuẩn Word MathType"
                >
                  <Download className="w-4 h-4" /> Xuất Word (MathType)
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
                    <span>
                      {isImageQueue
                        ? 'Cắt hình vẽ / Đồ thị từ ảnh gốc đã dán chèn vào Word:'
                        : 'Cắt hình vẽ / Đồ thị từ trang PDF gốc chèn vào Word:'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-full">Tiện ích</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nếu cần chỉnh vùng cắt ảnh, bấm chọn {isImageQueue ? 'ảnh' : 'trang'} dưới đây để cắt lại và nhúng trực tiếp vào văn bản:
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {Object.keys(pdfPageImages).map(pStr => {
                  const pNum = Number(pStr);
                  return (
                    <button
                      key={pNum}
                      onClick={() => handleOpenCropper(pNum)}
                      className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{isImageQueue ? `Cắt Ảnh ${pNum}` : `Cắt Trang ${pNum}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-slate-50/70 rounded-xl p-6 lg:p-8 border border-slate-200">
            <div ref={exportRef} data-no-auto-graph="true">
              <MarkdownRenderer content={resultText} disableAutoBbtSvg />
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
