import React, { useEffect, useMemo, useRef, useState } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';

export const safeMarkdownUrlTransform = (url: string, key?: string): string => {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  // Allow safe raster data:image/* URIs (cropped PDF figures, embedded DOCX images) on img src
  if (
    (!key || key === 'src') &&
    /^data:image\/(?:png|jpe?g|gif|webp|bmp);base64,/i.test(trimmed)
  ) {
    return trimmed;
  }
  if ((!key || key === 'src') && /^blob:/i.test(trimmed)) {
    return trimmed;
  }
  return defaultUrlTransform(trimmed);
};
import { rehypeSanitizeEventHandlers, cleanProps, cleanMathAndUnwrapHeadings, fixAndMergeMathArrows, scheduleBatchedMathJaxTypeset, protectHtmlMediaTags, restoreHtmlMediaTags } from '../lib/globalMath';
import { TikzRenderer, getTikzSvg } from './TikzRenderer';
import { convertBbtTableToSvg, unflattenMarkdownTables } from '../lib/bbtRenderer';
import { MathView, preprocessMath, wrapRawSvgBlocks } from './MathView';
import { 
  fixMath, 
  formatMathContent, 
  convertOmmlToLatex, 
  polishMathText, 
  sanitizeAndFormatMath, 
  cleanVietnameseUnicode, 
  rescueAccidentalFullMathBlock, 
  sanitizeAndPolishMath, 
  sanitizeExamQuestion,
  sanitizeMathBeforeRender,
  normalizeMathLatex,
  normalizeMathContent,
  normalizeSetNotation,
  fixNakedLeqGeq,
  rescueVietnameseFromMath,
  normalizeLogicAndSetSymbols,
  sanitizeLatexString,
  preProcessMathContent,
  rescueCodeAndNestedText,
  normalizePropositionQuotes,
  normalizeArrayAndTableEnvironments,
  sanitizeSvgOrHtmlForReact,
  wrapNakedLatexExpressions,
  fixDisplayMathTrailingPunctuation
} from '../lib/utils';

export { 
  polishMathText, 
  sanitizeAndFormatMath, 
  cleanVietnameseUnicode, 
  rescueAccidentalFullMathBlock, 
  sanitizeAndPolishMath, 
  sanitizeExamQuestion, 
  sanitizeMathBeforeRender, 
  normalizeMathLatex, 
  normalizeMathContent,
  normalizeSetNotation,
  fixNakedLeqGeq,
  rescueVietnameseFromMath,
  normalizeLogicAndSetSymbols,
  sanitizeLatexString,
  preProcessMathContent,
  rescueCodeAndNestedText,
  normalizePropositionQuotes
};

/**
 * Triggers MathJax 3 typesetPromise using the unified batched, time-sliced scheduler
 * to prevent concurrent collisions and browser main-thread freezes when many formulas render at once.
 */
export const typesetMathJax = (element?: HTMLElement | null): Promise<void> => {
  return scheduleBatchedMathJaxTypeset(element);
};

/**
 * Khắc phục triệt để lỗi rách dấu $$ và dính chữ tiếng Việt ("hoặc", "và", "hay") trong 4 phương án trắc nghiệm:
 * 1. Tách rời các từ nối tiếng Việt bị dính liền với số/ký tự (vd: 3hoặcm -> 3 hoặc m, avàa -> a và a)
 * 2. Sửa lỗi đóng/mở $$ bị rách giữa biểu thức (vd: \ge 3$$ hoặc $$m \le -1)
 * 3. Tách từ nối ra ngoài dấu $ và tự động bọc $ cho các vế công thức
 */
export const fixInlineOptionText = (text: string): string => {
  if (!text) return '';
  let res = text;

  // Giữ lại nhãn phương án nếu có (vd: A., B., C., D. hoặc **A.**, - A.)
  // KHÔNG bóc nhầm tên tập hợp như A = {1; 2} hoặc A = [-1; 3]
  let prefix = '';
  const prefixMatch = res.match(/^(\s*(?:[-*]\s*)?(?:\*{0,2})[A-Da-d][\.\:\)](?:\*{0,2})\s*(?!=\s*))/);
  if (prefixMatch) {
    prefix = prefixMatch[1];
    res = res.slice(prefix.length);
  }

  // Bảo vệ tạm thời các khối \text{...} để không bị bóc tách nhầm các từ hoặc, và, hay bên trong \text{}
  const textTokens: string[] = [];
  res = res.replace(/\\text\{[^{}]*\}/g, (match) => {
    textTokens.push(match);
    return `___TEXT_TOKEN_${textTokens.length - 1}___`;
  });

  // Bước 1: Tách rời các từ nối tiếng Việt bị dính liền với số/ký tự (vd: 3hoặcm -> 3 hoặc m, avàa -> a và a)
  res = res
    .replace(/\b([a-z])(hoặc|hay)\b/gi, (match, letter, conj) => {
      if (/^(thay|chay)$/i.test(match)) return match;
      return `${letter} ${conj}`;
    })
    .replace(/([0-9\$\)\]\}])(?<!\s)(hoặc|hay)(?=[a-zA-Z0-9\$\\])/gi, '$1 $2 ')
    .replace(/([0-9\$\)\]\}])(?<!\s)và(?!(?:o|i|ng|c|t)\b)(?=[a-zA-Z0-9\$\\])/gi, '$1 và ')
    .replace(/(?<=[0-9\$\)\]\}])(hoặc|hay)/gi, ' $1')
    .replace(/(?<=[0-9\$\)\]\}])và(?!(?:o|i|ng|c|t)\b)/gi, ' và');

  // Bước 2: Đảm bảo khoảng trắng rõ ràng giữa các biểu thức toán nối bằng liên từ (không làm rách cặp dấu $...$)
  res = res
    .replace(/(?<!\$)\$(?!\$)\s*(hoặc|và|hay|với)\s*(?<!\$)\$(?!\$)/gi, '$$ $1 $$')
    .replace(/\$\$\s*(hoặc|và|hay|với)\s*\$\$/gi, '$$ $1 $$');

  // Bước 3: Nếu một phương án chứa công thức nhưng thiếu cặp dấu $ ở đầu/cuối:
  // Ví dụ: `m \ge 3 hoặc m+2 \le 1` -> `$m \ge 3$ hoặc $m+2 \le 1$`
  const parts = res.split(/\s+(hoặc|và|hay)\s+/gi);
  if (parts.length > 1) {
    res = parts.map(part => {
      const trimmed = part.trim();
      if (['hoặc', 'và', 'hay'].includes(trimmed.toLowerCase())) {
        return trimmed;
      }
      // Nếu vế có chứa ký hiệu toán (\ge, \le, <, >, +, -, =, v.v.) mà chưa bọc đủ dấu $
      if (/[\\<>=+\-\^_\/]/.test(trimmed) || /\b\d+[a-zA-Z]\b/.test(trimmed)) {
        if (/^[“"”]|:\s*[“"”]/.test(trimmed)) {
          return trimmed;
        }
        const cleanPart = trimmed.replace(/\$/g, '').trim();
        return `$${cleanPart}$`;
      }
      return trimmed;
    }).join(' ');
  } else {
    // Nếu không có từ nối nhưng có lệnh LaTeX trần trụi thiếu $ (vd: b \le a)
    if (/[\\<>=]/.test(res) && !res.includes('$')) {
      res = `$${res}$`;
    }
  }

  // Khôi phục lại các khối \text{...}
  res = res.replace(/___TEXT_TOKEN_(\d+)___/g, (_m, idx) => textTokens[Number(idx)] || '');

  // Dọn dẹp khoảng trắng và dấu $ thừa
  return (prefix + res.replace(/\${3,}/g, '$$')).trim();
};

export { formatMathContent };
export { fixMath } from '../lib/utils';

const SvgImageRenderer: React.FC<{ svgCode: string }> = ({ svgCode }) => {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isGraph = svgCode.includes('arrow-axis') || svgCode.includes('plot') || svgCode.includes('grid') || /<path[^>]*class=["'](?:graph|curve)/.test(svgCode) || (svgCode.includes('x') && svgCode.includes('y') && svgCode.includes('path') && !svgCode.includes('bbt-'));
  const isBbt = svgCode.includes('bbt-') || (!isGraph && (svgCode.includes("y'") || (svgCode.includes('x') && svgCode.includes('y'))));
  const badgeLabel = isBbt ? 'BBT Chuẩn SGK' : isGraph ? 'Đồ thị Chuẩn SGK' : 'Hình vẽ SGK';
  const downloadFilename = isBbt ? `Bang_Bien_Thien_${Date.now()}.png` : isGraph ? `Do_Thi_Ham_So_${Date.now()}.png` : `Hinh_Ve_${Date.now()}.png`;
  const copyBtnLabel = isBbt ? '📋 Chép BBT' : isGraph ? '📋 Chép Đồ thị' : '📋 Chép ảnh';
  const downloadBtnLabel = isBbt ? '📸 Tải BBT (PNG)' : isGraph ? '📸 Tải Đồ thị (PNG)' : '📸 Tải ảnh (PNG)';

  const getCanvasFromSvg = async (scale = 3): Promise<HTMLCanvasElement> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) throw new Error('SVG not found');

    const width = parseInt(svgEl.getAttribute('width') || '600', 10);
    const height = parseInt(svgEl.getAttribute('height') || '210', 10);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = dataUri;
    });
  };

  const handleDownloadPng = async () => {
    try {
      setIsExporting(true);
      const canvas = await getCanvasFromSvg(3);
      const link = document.createElement('a');
      link.download = downloadFilename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
      alert('Không thể tạo ảnh PNG');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    try {
      setIsExporting(true);
      const canvas = await getCanvasFromSvg(3);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } else {
            // Fallback
            const link = document.createElement('a');
            link.download = downloadFilename;
            link.href = canvas.toDataURL('image/png');
            link.click();
          }
        } catch (err) {
          console.error('Clipboard write error', err);
        }
      }, 'image/png');
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="svg-wrapper my-4 flex flex-col items-center">
      <div 
        ref={containerRef}
        className="relative group bg-white p-3 sm:p-4 rounded-xl border border-slate-300 shadow-sm max-w-full overflow-x-auto"
      >
        <div className="no-print absolute top-2 right-2 flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-xs px-2 py-1 rounded-md border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mr-1 hidden sm:inline">{badgeLabel}</span>
          <button
            type="button"
            onClick={handleCopyImage}
            title={isBbt ? "Sao chép ảnh BBT vào clipboard" : "Sao chép ảnh Đồ thị vào clipboard"}
            className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{copied ? '✓ Đã chép' : copyBtnLabel}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isExporting}
            title="Tải ảnh định dạng PNG độ nét cao (300 DPI)"
            className="px-2 py-0.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{downloadBtnLabel}</span>
          </button>
        </div>
        <div className="pt-2 sm:pt-4" dangerouslySetInnerHTML={{ __html: sanitizeSvgOrHtmlForReact(svgCode) }} />
      </div>
    </div>
  );
};

const CustomImageRenderer: React.FC<{ cleanSrc: string; alt?: string; [key: string]: any }> = ({ cleanSrc, alt, ...props }) => {
  const [copied, setCopied] = useState(false);
  const [hasError, setHasError] = useState(false);

  const altText = alt || 'Hình vẽ / Đồ thị bài toán';
  const isGraph = /đồ\s*thị|do_thi|graph|plot|hàm\s*số/i.test(altText) || cleanSrc?.includes('Do_Thi') || cleanSrc?.includes('graph');
  const isBbt = /bảng\s*biến\s*thiên|bang_bien_thien|bbt/i.test(altText) || cleanSrc?.includes('Bang_Bien_Thien');
  const badgeLabel = isBbt ? 'BBT Chuẩn SGK' : isGraph ? 'Đồ thị Chuẩn SGK' : 'Hình vẽ / Đồ thị bài toán';

  // Normalize cleanSrc: remove linebreaks/whitespace, add data:image/png;base64, if raw base64
  let imgSrc = (cleanSrc || '').trim().replace(/[\r\n]+/g, '');
  if (imgSrc && !imgSrc.startsWith('http://') && !imgSrc.startsWith('https://') && !imgSrc.startsWith('data:') && !imgSrc.startsWith('/') && !imgSrc.startsWith('./')) {
    if (/^(iVBORw0|\|9j\/|R0lGOD|UklGR|[A-Za-z0-9+/=]{30,})/.test(imgSrc)) {
      imgSrc = `data:image/png;base64,${imgSrc}`;
    }
  }

  const isBase64 = imgSrc.startsWith('data:image/');

  if (!imgSrc || imgSrc === 'undefined' || imgSrc === 'null' || imgSrc.trim() === '' || (hasError && !isBase64)) {
    // Tuyệt đối không tự bịa đồ thị hàm số thay cho ảnh bị thiếu; hiển thị khung gợi ý cắt ảnh gốc PDF.
    return (
      <div className="no-print my-4 p-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left max-w-[600px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <span className="text-xl">🖼️</span>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{altText || 'Hình vẽ minh họa đề thi'}</p>
            <p className="text-xs text-slate-500">Chèn ảnh cắt từ trang PDF gốc hoặc tải ảnh minh họa</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-pdf-cropper', { detail: { placeholder: altText } }))}
          className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
        >
          <span>✂️ Cắt ảnh PDF gốc</span>
        </button>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 600;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          try {
            if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          } catch (e) {
            console.warn(e);
          }
        }, 'image/png');
      };
      img.src = imgSrc;
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `${isBbt ? 'Bang_Bien_Thien' : isGraph ? 'Do_Thi_Ham_So' : 'Hinh_Minh_Hoa'}_${Date.now()}.png`;
    link.href = imgSrc;
    link.click();
  };

  return (
    <div className="relative group max-w-fit mx-auto my-3 flex flex-col items-center">
      <div className="relative bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="no-print absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-xs px-2 py-1 rounded-md border border-slate-200 shadow-2xs z-10">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mr-1 hidden sm:inline">{badgeLabel}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{copied ? '✓ Đã chép' : '📋 Chép ảnh'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-2 py-0.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>📸 Tải ảnh</span>
          </button>
        </div>
        <img
          {...cleanProps(props)}
          src={imgSrc || undefined}
          alt={altText}
          loading="eager"
          className="max-w-full sm:max-w-[560px] w-auto h-auto rounded-lg mx-auto pt-1 sm:pt-2 cursor-zoom-in hover:ring-2 hover:ring-indigo-400 transition-all object-contain block"
          onClick={() => window.dispatchEvent(new CustomEvent('open-fullscreen-image', { detail: imgSrc }))}
          onError={() => {
            setHasError(true);
          }}
        />
      </div>
    </div>
  );
};

const MARKDOWN_REMARK_PLUGINS = [remarkMath, remarkGfm];
const MARKDOWN_REHYPE_PLUGINS = [rehypeRaw, rehypeSanitizeEventHandlers];

const markdownCodeRenderer = ({ children, className, ...props }: any) => {
  const codeStr = String(children || '').replace(/\n$/, '');
  const isMath = className && (className.includes('math') || className.includes('language-math'));
  if (isMath) {
    const cleanMath = codeStr.replace(/^\$+|\$+$/g, '').trim();
    const isDisplay = className.includes('math-display');
    return isDisplay ? (
      <div key={cleanMath} className="math-display my-2.5 text-center font-serif overflow-x-auto" data-latex={cleanMath}>
        {`$$${cleanMath}$$`}
      </div>
    ) : (
      <span key={cleanMath} className="math-inline font-serif" data-latex={cleanMath}>
        {`$${cleanMath}$`}
      </span>
    );
  }
  if (className && className.includes('language-') && !className.includes('math')) {
    return <code className={className || "font-mono bg-slate-100 px-1 py-0.5 rounded text-xs"} {...cleanProps(props)}>{children}</code>;
  }
  if (/(?:^|\n)\s*(?:function|const|let|var|import|export|class|def|return)\b/.test(codeStr) && !codeStr.includes('\\')) {
    return <code className={className || "font-mono bg-slate-100 px-1 py-0.5 rounded text-xs"} {...cleanProps(props)}>{children}</code>;
  }
  const isAccidentalProse =
    codeStr.includes('\n') ||
    /\*\*|###|PHẦN\s*(?:[1-4]|I{1,3}|IV)|Câu\s*\d+/i.test(codeStr) ||
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ].*\s+[a-zA-ZÀ-ỹ]*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(codeStr);
  if (isAccidentalProse) {
    return <span className="font-serif whitespace-pre-line">{children}</span>;
  }
  const cleanMath = codeStr.replace(/^\$+|\$+$/g, '').trim();
  return cleanMath ? <span key={cleanMath} className="math-inline font-serif" data-latex={cleanMath}>{`$${cleanMath}$`}</span> : null;
};

const markdownSpanRenderer = ({ node, children, className, ...props }: any) => {
  if (className && className.includes('math-inline')) {
    const text = String(children || '').trim();
    const cleanMath = text.replace(/^\$+|\$+$/g, '').trim();
    return (
      <span key={cleanMath} className="math-inline font-serif" data-latex={cleanMath} {...cleanProps(props)}>
        {`$${cleanMath}$`}
      </span>
    );
  }
  return <span className={className} {...cleanProps(props)}>{children}</span>;
};

const markdownInlineComponents = {
  script: () => null,
  p: ({ node, children, ...props }: any) => (
    <span className="inline" {...cleanProps(props)}>
      {children}
    </span>
  ),
  div: ({ node, children, ...props }: any) => (
    <span className="inline" {...cleanProps(props)}>
      {children}
    </span>
  ),
  // @ts-ignore
  'svg-wrapper': ({ node }: any) => {
    try {
      const base64 = node.properties?.dataSvg || node.properties?.['data-svg'];
      if (!base64) return null;
      const decoded = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
      return <SvgImageRenderer svgCode={decoded} />;
    } catch (e) {
      return <span className="text-red-500">Lỗi hiển thị hình ảnh SVG</span>;
    }
  },
  span: markdownSpanRenderer,
  code: markdownCodeRenderer,
  img: ({ node, src, alt, ...props }: any) => {
    let cleanSrc = (src || '').trim();
    if (!cleanSrc || cleanSrc === '#' || cleanSrc === 'about:blank' || cleanSrc === '...' || cleanSrc === 'undefined' || cleanSrc === 'null') {
      return null;
    }
    if (cleanSrc.startsWith('[Hình') || cleanSrc.startsWith('[Đồ thị') || cleanSrc.includes('placeholder')) {
      return null;
    }
    if (cleanSrc.includes('drive.google.com/file/d/')) {
      const fileId = cleanSrc.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      if (fileId) {
        cleanSrc = `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }
    return (
      <CustomImageRenderer
        cleanSrc={cleanSrc}
        alt={alt || 'Hình minh họa SGK'}
        referrerPolicy="no-referrer"
        {...cleanProps(props)}
      />
    );
  },
};

const ChoiceListContext = React.createContext<boolean>(false);

const getNodePlainText = (n: any): string => {
  if (!n) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(getNodePlainText).join(' ');
  if (React.isValidElement(n)) return getNodePlainText((n.props as any)?.children);
  return '';
};

const hasNestedListOrBlock = (n: any): boolean => {
  if (!n) return false;
  if (Array.isArray(n)) return n.some(hasNestedListOrBlock);
  if (React.isValidElement(n)) {
    const t = n.type;
    if (t === 'ul' || t === 'ol' || t === 'table' || t === 'pre') return true;
    return hasNestedListOrBlock((n.props as any)?.children);
  }
  return false;
};

const isGenuineChoiceOptionText = (rawText: string): boolean => {
  const trimmed = rawText.trim();
  // Strictly uppercase A/B/C/D at the start of the item followed by . or ) and whitespace
  if (!/^(?:\*{0,2})?[A-D][\.\)](?:\*{0,2})?\s+/.test(trimmed)) return false;
  // Never classify True/False verdict items or solution lines as ABCD choice cards
  if (/^(?:\*{0,2})?[A-D][\.\)](?:\*{0,2})?\s*(?:Đúng|Sai)\b/i.test(trimmed)) return false;
  return true;
};

const markdownFullComponents = {
  script: () => null,
  p: ({ node, children, ...props }: any) => {
    const firstChild = React.Children.toArray(children)[0];
    const isQuestion = typeof firstChild === 'string' && /^\s*(?:\*\*)?(?:Câu|Bài|\d+\.)\s*\d*/i.test(firstChild);
    return (
      <div className={`leading-relaxed ${isQuestion ? 'mt-6 mb-2 font-medium text-slate-900 text-base sm:text-lg' : 'my-3'}`} {...cleanProps(props)}>
        {children}
      </div>
    );
  },
  div: ({ node, children, ...props }: any) => {
    const dottedRaw =
      props['data-docx-dotted-lines'] ??
      node?.properties?.['data-docx-dotted-lines'] ??
      node?.properties?.dataDocxDottedLines;
    if (dottedRaw !== undefined) {
      const count = Math.max(1, Math.min(20, parseInt(String(dottedRaw), 10) || 3));
      return (
        <div data-docx-dotted-lines={count} className="worksheet-dotted-lines my-2 space-y-0.5">
          {Array.from({ length: count }).map((_, idx) => (
            <div
              key={idx}
              className="worksheet-dotted-line"
              style={{ borderBottom: '1px dotted #94a3b8', height: '22px', width: '100%' }}
            />
          ))}
        </div>
      );
    }
    return <div {...cleanProps(props)}>{children}</div>;
  },
  span: markdownSpanRenderer,
  code: markdownCodeRenderer,
  // @ts-ignore
  'svg-wrapper': ({ node }: any) => {
    try {
      const base64 = node.properties?.dataSvg || node.properties?.['data-svg'];
      if (!base64) return null;
      const decoded = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
      return <SvgImageRenderer svgCode={decoded} />;
    } catch (e) {
      return <span className="text-red-500">Lỗi hiển thị hình ảnh SVG</span>;
    }
  },
  // @ts-ignore
  'tikz-diagram': ({ node }: any) => {
    try {
      const base64 = node.properties?.dataTikz || node.properties?.['data-tikz'];
      if (!base64) return null;
      const decoded = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
      return (
        <span className="flex justify-center my-6 overflow-x-auto bg-white p-4 rounded-xl border border-slate-200">
          <TikzRenderer content={decoded} />
        </span>
      );
    } catch (e) {
      return <span className="text-red-500">Lỗi hiển thị hình ảnh TikZ</span>;
    }
  },
  img: ({ node, src, alt, ...props }: any) => {
    let cleanSrc = (src || '').trim();
    if (!cleanSrc || cleanSrc === '#' || cleanSrc === 'about:blank' || cleanSrc === '...' || cleanSrc === 'undefined') {
      return null;
    }
    if (cleanSrc.startsWith('[Hình') || cleanSrc.startsWith('[Đồ thị') || cleanSrc.includes('placeholder')) {
      return (
        <div className="no-print my-4 p-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <span className="text-xl">🖼️</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{alt || cleanSrc || 'Hình vẽ minh họa đề thi'}</p>
              <p className="text-xs text-slate-500">Chèn ảnh cắt từ trang PDF gốc hoặc vẽ đồ thị / hình 3D</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-pdf-cropper', { detail: { placeholder: alt || cleanSrc } }))}
            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>✂️ Cắt ảnh PDF gốc</span>
          </button>
        </div>
      );
    }
    if (cleanSrc.includes('drive.google.com/file/d/')) {
      const fileId = cleanSrc.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      if (fileId) {
        cleanSrc = `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }
    return (
      <CustomImageRenderer
        cleanSrc={cleanSrc}
        alt={alt || 'Hình minh họa SGK'}
        referrerPolicy="no-referrer"
        {...cleanProps(props)}
      />
    );
  },
  table: ({ node, children, ...props }: any) => {
    const cls = String(props.className || '');
    const isBorderless =
      cls.includes('borderless') ||
      props.style?.border === 'none' ||
      props.style?.border === '0' ||
      props.style?.borderStyle === 'none';
    if (isBorderless) {
      return (
        <div className="overflow-x-auto my-3 max-w-full">
          <table
            {...cleanProps(props)}
            className={`borderless w-full mx-auto border-collapse !border-0 bg-transparent text-sm shadow-none [&_tr]:!border-0 [&_th]:!border-0 [&_th]:bg-transparent [&_td]:!border-0 [&_td]:bg-transparent [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_td]:whitespace-normal ${cls}`}
          >
            {children}
          </table>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto my-4 max-w-full">
        <table
          {...cleanProps(props)}
          className={`min-w-fit w-full mx-auto border-collapse border border-slate-300 text-sm shadow-xs rounded-md overflow-hidden bg-white ${cls}`}
        >
          {children}
        </table>
      </div>
    );
  },
  th: ({ node, children, ...props }: any) => (
    <th
      {...cleanProps(props)}
      className={`border border-slate-300 bg-blue-50/90 px-3.5 py-2 font-semibold text-slate-800 text-center whitespace-normal ${String(props.className || '')}`}
    >
      {children}
    </th>
  ),
  td: ({ node, children, ...props }: any) => {
    const extractLen = (n: any): number => {
      if (!n) return 0;
      if (typeof n === 'string' || typeof n === 'number') return String(n).trim().length;
      if (Array.isArray(n)) return n.reduce((acc, item) => acc + extractLen(item), 0);
      if (React.isValidElement(n) && (n.props as any)?.children) return extractLen((n.props as any).children);
      return 0;
    };
    const isLongOrMultiline = extractLen(children) > 28 || (Array.isArray(children) && children.some((c: any) => React.isValidElement(c) && c.type === 'br'));
    const isBorderlessCell =
      props.style?.border === 'none' ||
      props.style?.border === '0' ||
      props.style?.borderStyle === 'none' ||
      String(props.className || '').includes('borderless');
    const alignClass =
      props.style?.textAlign === 'center'
        ? 'text-center whitespace-normal leading-relaxed'
        : props.style?.textAlign === 'right'
        ? 'text-right whitespace-normal leading-relaxed'
        : isLongOrMultiline
        ? 'text-left align-top whitespace-normal leading-relaxed'
        : 'text-center whitespace-nowrap';
    return (
      <td
        {...cleanProps(props)}
        className={`${isBorderlessCell ? 'border-0 px-2 py-1' : 'border border-slate-300 px-3.5 py-2'} text-slate-800 ${alignClass} ${String(props.className || '')}`}
      >
        {children}
      </td>
    );
  },
  pre({ node, children, ...props }: any) {
    const getTxt = (n: any): string => {
      if (!n) return '';
      if (typeof n === 'string' || typeof n === 'number') return String(n);
      if (Array.isArray(n)) return n.map(getTxt).join('');
      if (React.isValidElement(n) && (n.props as any)?.children) return getTxt((n.props as any).children);
      return '';
    };
    const txt = getTxt(children).trim();
    if (!txt || txt === '$$$$' || txt === '$$' || txt === '$ $') return null;
    const isProgrammingCode =
      /(?:^|\n)\s*(?:function|const|let|var|import|export|class|def |print\(|console\.log|SELECT |INSERT |CREATE TABLE|<!DOCTYPE|<html)/i.test(txt) &&
      !/\\(?:begin|end|frac|sqrt|ge|le|neq|Rightarrow|Leftrightarrow|vec)|PHẦN|Câu\s*\d+/i.test(txt);
    if (!isProgrammingCode) {
      return <div className="my-2.5 text-slate-800 leading-relaxed font-serif whitespace-pre-line">{children}</div>;
    }
    return (
      <pre className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 overflow-x-auto my-3 text-sm font-mono" {...cleanProps(props)}>
        {children}
      </pre>
    );
  },
  ul: ({ node, children, ...props }: any) => {
    const cleanListChildren = React.Children.toArray(children).filter(
      (child: any) => !(typeof child === 'string' && /^\s*$/.test(child))
    );
    const hasNested = cleanListChildren.some((child: any) => hasNestedListOrBlock(child?.props?.children));
    const isChoiceList =
      !hasNested &&
      cleanListChildren.length >= 2 &&
      cleanListChildren.length <= 4 &&
      cleanListChildren.every((child: any) => isGenuineChoiceOptionText(getNodePlainText(child?.props?.children)));

    if (isChoiceList) {
      const itemLengths = cleanListChildren.map((child: any) => getNodePlainText(child?.props?.children).length);
      const totalLen = itemLengths.reduce((a, b) => a + b, 0);
      const maxLen = Math.max(...itemLengths, 0);
      const gridCols = totalLen > 140 || maxLen > 38 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-4';
      return (
        <ChoiceListContext.Provider value={true}>
          <ul className={`grid ${gridCols} gap-2.5 my-3 pl-0 list-none text-slate-800 whitespace-normal`} {...cleanProps(props)}>
            {cleanListChildren}
          </ul>
        </ChoiceListContext.Provider>
      );
    }
    return (
      <ChoiceListContext.Provider value={false}>
        <ul className="my-3 pl-6 list-disc space-y-1.5 text-slate-800 whitespace-normal" {...cleanProps(props)}>
          {cleanListChildren}
        </ul>
      </ChoiceListContext.Provider>
    );
  },
  ol: ({ node, children, start, ...props }: any) => {
    const cleanListChildren = React.Children.toArray(children).filter(
      (child: any) => !(typeof child === 'string' && /^\s*$/.test(child))
    );
    return (
      <ChoiceListContext.Provider value={false}>
        <ol
          start={start}
          className="my-3 pl-6 list-decimal space-y-1.5 text-slate-800 whitespace-normal"
          {...cleanProps(props)}
        >
          {cleanListChildren}
        </ol>
      </ChoiceListContext.Provider>
    );
  },
  li: ({ node, children, ...props }: any) => {
    const inChoiceList = React.useContext(ChoiceListContext);
    const cleanItemChildren = React.Children.toArray(children).filter(
      (child: any) => !(typeof child === 'string' && /^\s*$/.test(child))
    );
    const text = getNodePlainText(cleanItemChildren);
    if (!text.trim()) return null;
    const isChoice = inChoiceList && !hasNestedListOrBlock(cleanItemChildren) && isGenuineChoiceOptionText(text);
    if (isChoice) {
      return (
        <li
          className="block py-1.5 px-3 rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors shadow-none list-none m-0 whitespace-normal leading-relaxed [&>div]:inline [&>div]:my-0 [&>p]:inline [&>p]:my-0"
          {...cleanProps(props)}
        >
          {cleanItemChildren}
        </li>
      );
    }
    return (
      <li
        className="my-1 leading-relaxed text-slate-800 whitespace-normal [&>div]:my-1 [&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
        {...cleanProps(props)}
      >
        {cleanItemChildren}
      </li>
    );
  }
};

export const MarkdownRenderer = React.memo(({ 
  content, 
  className, 
  inline = false,
  skipWorksheetFormatting = false
}: { 
  content: string; 
  className?: string; 
  inline?: boolean; 
  skipWorksheetFormatting?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const processedContent = useMemo(() => {
    const { masked: mediaSafeInput, tokens: mediaTokens } = protectHtmlMediaTags(String(content || ''));
    // Normalize math text without running worksheet-only section manglers when rendering lesson plans
    let res = skipWorksheetFormatting
      ? cleanMathAndUnwrapHeadings(normalizeMathLatex(mediaSafeInput))
      : cleanMathAndUnwrapHeadings(preprocessMath(mediaSafeInput));

    // Normalize array and table environments (repair \begin{array} column specifiers and remove inner blank lines)
    res = normalizeArrayAndTableEnvironments(res);

    // Clean leaked undefined/null strings
    res = res.replace(/(?<![a-zA-Z0-9_\$])(?:undefined|null)(?![a-zA-Z0-9_\$])/g, () => '');

    // 1. Chuyển đổi trực tiếp các BẢNG BIẾN THIÊN (BBT) Markdown table sang <svg-wrapper>
    res = unflattenMarkdownTables(res);
    res = res.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match, _g1, offset) => {
      try {
        const preceding = res.slice(Math.max(0, offset - 220), offset);
        if (/(?:phân\s*bố\s*xác\s*suất|biến\s*ngẫu\s*nhiên|bảng\s*tần\s*số|bảng\s*tần\s*suất|mẫu\s*số\s*liệu|bảng\s*thống\s*kê|bảng\s*giá\s*trị)/i.test(preceding)) {
          return match;
        }
        const svg = convertBbtTableToSvg(match);
        if (svg) {
          const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : Buffer.from(encodeURIComponent(svg)).toString('base64');
          return `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
        }
      } catch (e) {}
      return match;
    });

    // 2. Chuyển đổi các khối tikz code block
    res = res.replace(/```tikz\s*([\s\S]*?)```/gi, (_, inner) => {
      let cleaned = inner.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '').trim();
      if (!cleaned.includes('\\begin{tikzpicture}')) {
         return `\\begin{tikzpicture}\n${cleaned}\n\\end{tikzpicture}`;
      }
      return cleaned;
    });

    // 2.5. Tự động chuyển đổi toàn bộ các công thức toán bị bọc bởi dấu backtick `...` sang $...$
    res = res.replace(/`([^`]+)`/g, (match, inner) => {
      if (/\b(?:if|for|while|def|class|return|import|print|input|const|let|var|function)\b/.test(inner)) {
        return match;
      }
      const cleanInner = inner.trim().replace(/^\$+|\$+$/g, '');
      if (!cleanInner) return match;
      return `$${cleanInner}$`;
    });

    // 3. Chuẩn hóa phân định công thức LaTeX \(...\) thành $...$ và \[...\] thành $$...$$
    res = res.replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => `$${formula}$`);
    res = res.replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => `\n\n$$${formula}$$\n\n`);
    res = res.replace(/\\(\$)/g, '$1');
    res = wrapNakedLatexExpressions(res);

    // 3.5 Dọn sạch các dấu * đơn đánh dấu đáp án đúng (vd: *A. hoặc A.*), nhưng bảo toàn **A.** in đậm cân xứng
    res = res.replace(/^([ \t]*(?:[-•]\s*)?)\*\*([A-D][\.\:\)])\*\*(?=\s|$)/gm, '$1**$2**');
    res = res.replace(/^([ \t]*(?:[-•]\s*)?)\*(?!\*)([A-D][\.\:\)])(?!\*)/gm, '$1$2');
    res = res.replace(/^([ \t]*(?:[-•]\s*)?(?:<b>)?[A-D][\.\:\)](?:<\/b>)?)\*(?!\*)/gm, '$1');
    res = res.replace(/^([ \t]*(?:[-•]\s*)?\*{2}[A-D][\.\:\)]\*{2}\s*)\*+([^\*\n]+?)\*+(?=\s*$)/gm, '$1$2');
    res = res.replace(/^([ \t]*(?:[-•]\s*)?(?:<b>)?[A-D][\.\:\)](?:<\/b>)?\s*)\*+([^\*\n]+?)\*+(?=\s*$)/gm, '$1$2');

    // Chuẩn hóa khối display math $$...$$
    res = res.replace(/\$\$([\s\S]*?)\$\$/g, (_match, body) => {
      const trimmed = body.trim();
      if (!trimmed.includes('\n')) {
        return `$$${trimmed}$$`;
      }
      return `\n\n$$\n${trimmed}\n$$\n\n`;
    });

    // Gắn dấu chấm/phẩy/chấm phẩy mồ côi ngay sau khối $$...$$ vào cuối khối toán để không rớt xuống dòng trống
    res = fixDisplayMathTrailingPunctuation(res);
    res = res.replace(/(\$\$[\s\S]*?\$\$)\s*\.\s*(?=(?:[A-ZÀ-Ỹ]|\*{1,2}(?:Câu|Bài)\s*\d))/g, '$1\n\n');

    // Base64 encode TikZ blocks
    res = res.replace(/(\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\})/gi, (match) => {
      try {
        const svg = getTikzSvg(match);
        if (svg) {
          const svgBase64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : Buffer.from(encodeURIComponent(svg)).toString('base64');
          return `\n\n<svg-wrapper data-svg="${svgBase64}"></svg-wrapper>\n\n`;
        }
        const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(match)) : Buffer.from(encodeURIComponent(match)).toString('base64');
        return `\n\n<tikz-diagram data-tikz="${base64}"></tikz-diagram>\n\n`;
      } catch (e) {
        return match;
      }
    });

    // Wrap raw <svg> blocks safely
    res = wrapRawSvgBlocks(res);

    // Clean leaked undefined/null and normalize table pipes in math
    res = res.replace(/(?<![a-zA-Z0-9_\$])(?:undefined|null)(?![a-zA-Z0-9_\$])/g, '');
    res = fixAndMergeMathArrows(res);
    res = res.split('\n').map((line) => {
      if (/^\s*\|.*\|\s*$/.test(line)) {
        return line.replace(/\$[^\$\n]+\$/g, (mathChunk) => {
          return mathChunk
            .replace(/\\left\s*\|/g, '\\left\\vert ')
            .replace(/\\right\s*\|/g, '\\right\\vert ')
            .replace(/\\\|/g, '\\Vert ')
            .replace(/\|/g, '\\vert ');
        });
      }
      return line;
    }).join('\n');

    return restoreHtmlMediaTags(res, mediaTokens);
  }, [content, skipWorksheetFormatting]);

  // 4. Auto-scanner effect with batched MathJax 3 scheduler
  useEffect(() => {
    if (!processedContent || (!processedContent.includes('$') && !processedContent.includes('\\(') && !processedContent.includes('\\['))) {
      return;
    }
    const el = containerRef.current;
    if (el) {
      typesetMathJax(el);
    }
  }, [processedContent]);

  if (inline) {
    const inlineClass = className
      ? (className.includes('markdown-body') ? className : `markdown-body ${className}`)
      : 'markdown-body inline-flex items-center gap-1 align-baseline';
    return (
      <span
        ref={containerRef as any}
        className={inlineClass}
      >
        <Markdown
          remarkPlugins={MARKDOWN_REMARK_PLUGINS}
          rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
          urlTransform={safeMarkdownUrlTransform}
          components={markdownInlineComponents}
        >
          {processedContent}
        </Markdown>
      </span>
    );
  }

  const blockClass = className
    ? (className.includes('markdown-body') ? className : `markdown-body ${className}`)
    : 'markdown-body prose prose-slate max-w-none prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600 prose-table:border-collapse prose-th:border prose-th:bg-slate-50 prose-td:border prose-td:p-2';

  return (
    <div 
      ref={containerRef}
      className={blockClass}
    >
      <Markdown 
        remarkPlugins={MARKDOWN_REMARK_PLUGINS} 
        rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
        urlTransform={safeMarkdownUrlTransform}
        components={markdownFullComponents}
      >
        {processedContent}
      </Markdown>
    </div>
  );
});

export const MathSpan: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  return <MathView content={content} inline className={className} />;
};


