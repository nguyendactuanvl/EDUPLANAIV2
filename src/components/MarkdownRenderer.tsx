import React, { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import { rehypeSanitizeEventHandlers, cleanProps } from '../lib/globalMath';
import { TikzRenderer, getTikzSvg } from './TikzRenderer';
import { ImageViewerModal } from './ImageViewerModal';
import { convertBbtTableToSvg, unflattenMarkdownTables } from '../lib/bbtRenderer';
import { MathView, preprocessMath } from './MathView';
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
  normalizePropositionQuotes
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
 * Triggers MathJax 3 typesetPromise on a given container or globally across the document.
 */
export const typesetMathJax = (element?: HTMLElement | null) => {
  if (typeof window !== 'undefined' && (window as any).MathJax) {
    const mj = (window as any).MathJax;
    if (mj.typesetPromise) {
      if (element) {
        if (mj.typesetClear) {
          try { mj.typesetClear([element]); } catch (e) {}
        }
        mj.typesetPromise([element]).catch((err: any) => console.warn('MathJax typeset error:', err));
      } else {
        mj.typesetPromise().catch((err: any) => console.warn('MathJax typeset error:', err));
      }
    }
  }
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
        <div className="pt-2 sm:pt-4" dangerouslySetInnerHTML={{ __html: svgCode }} />
      </div>
    </div>
  );
};

const CustomImageRenderer: React.FC<{ cleanSrc: string; alt?: string; [key: string]: any }> = ({ cleanSrc, alt, ...props }) => {
  const [copied, setCopied] = useState(false);
  const isGraph = /đồ\s*thị|do_thi|graph|plot|hàm\s*số/i.test(alt || '') || cleanSrc.includes('Do_Thi') || cleanSrc.includes('graph');
  const isBbt = /bảng\s*biến\s*thiên|bang_bien_thien|bbt/i.test(alt || '') || cleanSrc.includes('Bang_Bien_Thien');
  const badgeLabel = isBbt ? 'BBT Chuẩn SGK' : isGraph ? 'Đồ thị Chuẩn SGK' : 'Hình vẽ SGK';

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
      img.src = cleanSrc;
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `${isBbt ? 'Bang_Bien_Thien' : isGraph ? 'Do_Thi_Ham_So' : 'Hinh_Minh_Hoa'}_${Date.now()}.png`;
    link.href = cleanSrc;
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
          src={cleanSrc}
          alt={alt || 'Hình minh họa SGK'}
          loading="eager"
          className="max-w-full h-auto rounded-lg mx-auto pt-1 sm:pt-2 cursor-zoom-in hover:ring-2 hover:ring-indigo-400 transition-all"
          onClick={() => window.dispatchEvent(new CustomEvent('open-fullscreen-image', { detail: cleanSrc }))}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};

export const MarkdownRenderer = ({ 
  content, 
  className, 
  inline = false 
}: { 
  content: string; 
  className?: string; 
  inline?: boolean; 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenFullscreen = (e: any) => {
      setFullscreenImage(e.detail);
    };
    window.addEventListener('open-fullscreen-image', handleOpenFullscreen);
    return () => window.removeEventListener('open-fullscreen-image', handleOpenFullscreen);
  }, []);

  // Let's rewrite the text preparation block of MarkdownRenderer in a pristine, robust way.
  // Normalize math text globally (converts backticks to $, fixes torn backslashes)
  let processedContent = preprocessMath(content);

  // Clean leaked undefined/null strings
  processedContent = processedContent.replace(/(?<![a-zA-Z0-9_\$])(?:undefined|null)(?![a-zA-Z0-9_\$])/g, () => '');

  // 1. Chuyển đổi trực tiếp các BẢNG BIẾN THIÊN (BBT) Markdown table sang <svg-wrapper>
  processedContent = unflattenMarkdownTables(processedContent);
  processedContent = processedContent.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
    try {
      const svg = convertBbtTableToSvg(match);
      if (svg) {
        const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : Buffer.from(encodeURIComponent(svg)).toString('base64');
        return `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
      }
    } catch (e) {}
    return match;
  });

  // 2. Chuyển đổi các khối tikz code block
  processedContent = processedContent.replace(/```tikz\s*([\s\S]*?)```/gi, (_, inner) => {
    let cleaned = inner.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '').trim();
    if (!cleaned.includes('\\begin{tikzpicture}')) {
       return `\\begin{tikzpicture}\n${cleaned}\n\\end{tikzpicture}`;
    }
    return cleaned;
  });

  // 2.5. Tự động chuyển đổi toàn bộ các công thức toán bị bọc bởi dấu backtick `...` sang $...$
  processedContent = processedContent.replace(/`([^`]+)`/g, (match, inner) => {
    if (/\b(?:if|for|while|def|class|return|import|print|input|const|let|var|function)\b/.test(inner)) {
      return match;
    }
    const cleanInner = inner.trim().replace(/^\$+|\$+$/g, '');
    if (!cleanInner) return match;
    return `$${cleanInner}$`;
  });

  // 3. Chuẩn hóa phân định công thức LaTeX \(...\) thành $...$ và \[...\] thành $$...$$
  // Bảo toàn 100% các ký tự gạch chéo ngược (\) bằng cách sử dụng các hàm phản hồi () => ...
  processedContent = processedContent.replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => `$${formula}$`);
  processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => `\n\n$$${formula}$$\n\n`);
  // Bỏ các bộ tiền xử lý và regex thủ công chồng chéo, sử dụng bộ render chuẩn.
  processedContent = processedContent.replace(/\\(\$)/g, '$1');

  // 3.5 Dọn sạch các dấu * đánh dấu đáp án trắc nghiệm ở đầu hoặc cuối phương án A, B, C, D
  processedContent = processedContent.replace(/^([ \t]*(?:[-*−]\s*)?(?:\*{1,2}|<b>)?([A-D])[\.\:\)](?:\*{1,2}|<\/b>)?\s*)\*+([^\*\n]+?)\*+(?=\s*$)/gm, '$1$3');
  processedContent = processedContent.replace(/^([ \t]*(?:[-*−]\s*)?(?:\*{1,2}|<b>)?([A-D])[\.\:\)](?:\*{1,2}|<\/b>)?\s*)\*+([^\*\n]+)(?=\s*$)/gm, '$1$3');
  processedContent = processedContent.replace(/^([ \t]*(?:[-*−]\s*)?(?:\*{1,2}|<b>)?([A-D])[\.\:\)](?:\*{1,2}|<\/b>)?\s*)([^\*\n]+?)\*+(?=\s*$)/gm, '$1$3');

  // Chuẩn hóa khối display math $$...$$: nếu có nhiều dòng, đảm bảo dấu mở $$ và đóng $$ luôn ở dòng riêng biệt
  // Điều này ngăn remark-math bị lỗi "Expected EOF got \end{cases}" và nuốt luôn câu văn tiếng Việt phía sau
  processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (_match, body) => {
    const trimmed = body.trim();
    if (!trimmed.includes('\n')) {
      return `$$${trimmed}$$`;
    }
    return `\n\n$$\n${trimmed}\n$$\n\n`;
  });

  // Xóa dấu chấm mồ côi ngay sau khối $$...$$ trước khi bắt đầu câu mới tiếng Việt
  processedContent = processedContent.replace(/(\$\$[\s\S]*?\$\$)\s*\.\s*(?=[A-ZÀ-Ỹ])/g, '$1\n\n');

  // Đã xử lý tất cả các phần tử BBT, TikZ, và hình vẽ tại phần trên của MarkdownRenderer.
  // Không cần xử lý lại để tránh trùng lặp.

  // Các khối HTML choices đã được dọn dẹp sạch sẽ ở Bước 6.

  // 2. Base64 encode TikZ blocks to prevent Markdown/KaTeX interference
  // If instant SVG can be generated (e.g. tkz-tab variation tables, function plots, geometry),
  // convert directly to svg-wrapper so it loads in 0.001s without any delay or spinning!
  processedContent = processedContent.replace(/(\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\})/gi, (match) => {
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

  // 3.5 Triệt tiêu hoàn toàn bất kỳ rò rỉ nào của chữ "undefined" hoặc "null" lẻ loi trong tài liệu tiếng Việt
  processedContent = processedContent.replace(/(?<![a-zA-Z0-9_\$])(?:undefined|null)(?![a-zA-Z0-9_\$])/g, '');

  // 4. Auto-scanner effect with MathJax 3: whenever content updates or AI streams in new text,
  // scan the rendered DOM container with MathJax typeset and attach data-latex attributes
  useEffect(() => {
    if (containerRef.current) {
      typesetMathJax(containerRef.current);
      setTimeout(() => {
        if (containerRef.current) {
          const containers = containerRef.current.querySelectorAll('mjx-container');
          containers.forEach((mjx) => {
            if (!mjx.hasAttribute('data-latex')) {
              const text = mjx.getAttribute('aria-label') || mjx.querySelector('mjx-assistive-mml')?.textContent || '';
              if (text) {
                mjx.setAttribute('data-latex', text.replace(/^\$+|\$+$/g, '').trim());
              }
            }
          });
        }
      }, 200);
    }
  }, [processedContent]);

  if (inline) {
    return (
      <span
        ref={containerRef as any}
        className={className || "inline-flex items-center gap-1 align-baseline"}
      >
        <Markdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitizeEventHandlers]}
          components={{
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
            code: ({ children, className, ...props }: any) => {
              const codeStr = String(children || '').replace(/\n$/, '');
              if (/\b(?:if|for|while|def|class|return|import|print|input|const|let|var|function)\b/.test(codeStr)) {
                return <code className={className || "font-mono bg-slate-100 px-1 py-0.5 rounded text-xs"} {...cleanProps(props)}>{children}</code>;
              }
              const cleanMath = codeStr.replace(/^\$+|\$+$/g, '').trim();
              return cleanMath ? <span className="math-inline font-serif" data-latex={cleanMath}>{`$${cleanMath}$`}</span> : null;
            }
          }}
        >
          {processedContent}
        </Markdown>
      </span>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={className || "markdown-body prose prose-slate max-w-none prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600 prose-table:border-collapse prose-th:border prose-th:bg-slate-50 prose-td:border prose-td:p-2"}
    >
      <Markdown 
        remarkPlugins={[remarkMath, remarkGfm]} 
        rehypePlugins={[rehypeRaw, rehypeSanitizeEventHandlers]}
        components={{
          p: ({ node, children, ...props }: any) => {
            const firstChild = React.Children.toArray(children)[0];
            const isQuestion = typeof firstChild === 'string' && /^\s*(?:\*\*)?(?:Câu|Bài|\d+\.)\s*\d*/i.test(firstChild);
            return (
              <div className={`leading-relaxed ${isQuestion ? 'mt-6 mb-2 font-medium text-slate-900 text-base sm:text-lg' : 'my-3'}`} {...cleanProps(props)}>
                {children}
              </div>
            );
          },
          code: ({ children, className, ...props }: any) => {
            const codeStr = String(children || '').replace(/\n$/, '');
            if (/\b(?:if|for|while|def|class|return|import|print|input|const|let|var|function)\b/.test(codeStr)) {
              return <code className={className || "font-mono bg-slate-100 px-1 py-0.5 rounded text-xs"} {...cleanProps(props)}>{children}</code>;
            }
            const cleanMath = codeStr.replace(/^\$+|\$+$/g, '').trim();
            return cleanMath ? <span className="math-inline font-serif" data-latex={cleanMath}>{`$${cleanMath}$`}</span> : null;
          },
          // @ts-ignore
          'svg-wrapper': ({node}: any) => {
            try {
              const base64 = node.properties?.dataSvg || node.properties?.['data-svg'];
              if (!base64) return null;
              const decoded = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
              return (
                <SvgImageRenderer svgCode={decoded} />
              );
            } catch(e) {
              return <span className="text-red-500">Lỗi hiển thị hình ảnh SVG</span>;
            }
          },
          'tikz-diagram': ({node}: any) => {
            try {
              const base64 = node.properties?.dataTikz || node.properties?.['data-tikz'];
              if (!base64) return null;
              const decoded = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
              return (
                <span className="flex justify-center my-6 overflow-x-auto bg-white p-4 rounded-xl border border-slate-200">
                  <TikzRenderer content={decoded} />
                </span>
              );
            } catch(e) {
              return <span className="text-red-500">Lỗi hiển thị hình ảnh TikZ</span>;
            }
          },
          img: ({node, src, alt, ...props}: any) => {
            let cleanSrc = (src || '').trim();
            if (!cleanSrc || cleanSrc === '#' || cleanSrc === 'about:blank' || cleanSrc === '...' || cleanSrc === 'undefined') {
              return null;
            }
            // Auto convert Google Drive preview/view links to direct streaming image links
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
          table: ({ node, children, ...props }: any) => (
            <div className="overflow-x-auto my-4 max-w-full">
              <table className="min-w-fit mx-auto border-collapse border border-slate-300 text-sm text-center shadow-xs rounded-md overflow-hidden bg-white" {...cleanProps(props)}>
                {children}
              </table>
            </div>
          ),
          th: ({ node, children, ...props }: any) => (
            <th className="border border-slate-300 bg-slate-100 px-3.5 py-2 font-semibold text-slate-800 text-center whitespace-nowrap" {...cleanProps(props)}>
              {children}
            </th>
          ),
          td: ({ node, children, ...props }: any) => (
            <td className="border border-slate-300 px-3.5 py-2 text-slate-800 text-center whitespace-nowrap" {...cleanProps(props)}>
              {children}
            </td>
          ),
          pre({node, children, ...props}: any) {
            return (
              <pre className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 overflow-x-auto my-3 text-sm font-mono" {...cleanProps(props)}>
                {children}
              </pre>
            );
          },
          ul: ({ node, children, ...props }: any) => {
            const getNodePlainText = (n: any): string => {
              if (!n) return '';
              if (typeof n === 'string' || typeof n === 'number') return String(n);
              if (Array.isArray(n)) return n.map(getNodePlainText).join(' ');
              if (React.isValidElement(n)) return getNodePlainText((n.props as any)?.children);
              return '';
            };

            const childArray = React.Children.toArray(children);
            // Check if items are multiple choice options (- **A.** ...)
            const isChoiceList = childArray.length >= 2 && childArray.length <= 4 && childArray.some((child: any) => {
              const text = getNodePlainText(child?.props?.children);
              return /\b[A-D][\.\)]/.test(text);
            });

            if (isChoiceList) {
              const fullText = getNodePlainText(children);
              const isLong = fullText.length > 140;
              const gridCols = isLong ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-4";
              return (
                <ul className={`grid ${gridCols} gap-2.5 my-3 pl-0 list-none text-slate-800`} {...cleanProps(props)}>
                  {children}
                </ul>
              );
            }
            return <ul className="my-3 pl-6 list-disc space-y-1 text-slate-800" {...cleanProps(props)}>{children}</ul>;
          },
          li: ({ node, children, ...props }: any) => {
            const getNodePlainText = (n: any): string => {
              if (!n) return '';
              if (typeof n === 'string' || typeof n === 'number') return String(n);
              if (Array.isArray(n)) return n.map(getNodePlainText).join(' ');
              if (React.isValidElement(n)) return getNodePlainText((n.props as any)?.children);
              return '';
            };

            const text = getNodePlainText(children);
            const isChoice = /^\s*(?:\*\*)?[A-D][\.\)]/.test(text) || /\b[A-D][\.\)]/.test(text);
            if (isChoice) {
              return (
                <li className="flex items-baseline gap-2 py-1.5 px-3 rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors shadow-none list-none m-0" {...cleanProps(props)}>
                  {children}
                </li>
              );
            }
            return <li className="my-1 leading-relaxed text-slate-800" {...cleanProps(props)}>{children}</li>;
          }
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
};

export const MathSpan: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  return <MathView content={content} inline className={className} />;
};


