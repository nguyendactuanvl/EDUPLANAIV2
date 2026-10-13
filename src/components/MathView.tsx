import React, { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import { normalizeMathText, rehypeSanitizeEventHandlers, cleanProps } from '../lib/globalMath';
import { convertBbtTableToSvg, unflattenMarkdownTables } from '../lib/bbtRenderer';
import { TikzRenderer, getTikzSvg } from './TikzRenderer';

interface MathViewProps {
  content?: string | null;
  className?: string;
  inline?: boolean;
}

/**
 * Tiền xử lý tự động chuỗi toán học và đồ họa BBT:
 * 1. Chuyển đổi các bảng biến thiên (BBT) Markdown table thành <svg-wrapper>
 * 2. Đổi tất cả dấu huyền `...` thành $...$
 * 3. Khôi phục các ký tự thoát bị rách hoặc nuốt gạch chéo ngược
 */
export function preprocessMath(raw?: string | null): string {
  if (!raw) return '';
  let s = normalizeMathText(raw);

  // 1. Chuyển đổi trực tiếp các BẢNG BIẾN THIÊN (BBT) Markdown table sang <svg-wrapper>
  s = unflattenMarkdownTables(s);
  s = s.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
    try {
      const svg = convertBbtTableToSvg(match);
      if (svg) {
        const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : Buffer.from(encodeURIComponent(svg)).toString('base64');
        return `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
      }
    } catch (e) {}
    return match;
  });

  // 2. Chuyển đổi các khối tikz code block sang <svg-wrapper> hoặc <tikz-diagram>
  s = s.replace(/(\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\})/gi, (match) => {
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

  return s;
}

const REMARK_PLUGINS = [remarkMath, remarkGfm];
const REHYPE_PLUGINS = [rehypeRaw, rehypeSanitizeEventHandlers];

  const customCodeRenderer = ({ children, className, ...props }: any) => {
    const codeStr = String(children || '').replace(/\n$/, '');
    if (/\b(?:if|for|while|def|class|return|import|print|input|const|let|var|function)\b/.test(codeStr)) {
      return <code className={className || "font-mono bg-slate-100 px-1 py-0.5 rounded text-xs"} {...cleanProps(props)}>{children}</code>;
    }
    const cleanMath = codeStr.replace(/^\$+|\$+$/g, '').trim();
    return cleanMath ? <span className="math-inline font-serif" data-latex={cleanMath}>{`$${cleanMath}$`}</span> : null;
  };

  const decodeSafeBase64 = (base64: string): string => {
    if (!base64) return '';
    try {
      const raw = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8');
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    } catch (e) {
      try {
        return Buffer.from(base64, 'base64').toString('utf8');
      } catch {
        return '';
      }
    }
  };

  const sharedComponents = {
    p: ({ children, ...props }: any) => (
      <div className="my-2.5 leading-relaxed" {...cleanProps(props)}>
        {children}
      </div>
    ),
    div: ({ children, ...props }: any) => (
      <div {...cleanProps(props)}>
        {children}
      </div>
    ),
    code: customCodeRenderer,
    // @ts-ignore
    'svg-wrapper': ({ node }: any) => {
      try {
        const base64 = node.properties?.dataSvg || node.properties?.['data-svg'];
        if (!base64) return null;
        const decoded = decodeSafeBase64(base64);
        if (!decoded) return null;
        return (
          <div className="svg-wrapper my-3 flex flex-col items-center">
            <div
              className="bg-white p-2.5 sm:p-3.5 rounded-xl border border-slate-300 shadow-xs max-w-full overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: decoded }}
            />
          </div>
        );
      } catch (e) {
        return <span className="text-red-500">Lỗi hiển thị hình ảnh SVG</span>;
      }
    },
    // @ts-ignore
    'tikz-diagram': ({ node }: any) => {
      try {
        const base64 = node.properties?.dataTikz || node.properties?.['data-tikz'];
        if (!base64) return null;
        const decoded = decodeSafeBase64(base64);
        if (!decoded) return null;
        return (
          <span className="flex justify-center my-4 overflow-x-auto bg-white p-3 rounded-xl border border-slate-200">
            <TikzRenderer content={decoded} />
          </span>
        );
      } catch (e) {
        return <span className="text-red-500">Lỗi hiển thị hình ảnh TikZ</span>;
      }
    },
    table: ({ node, children, ...props }: any) => (
      <div className="overflow-x-auto my-3 max-w-full">
        <table className="min-w-fit mx-auto border-collapse border border-slate-300 text-sm text-center shadow-2xs rounded-md overflow-hidden bg-white" {...cleanProps(props)}>
          {children}
        </table>
      </div>
    ),
    th: ({ node, children, ...props }: any) => (
      <th className="border border-slate-300 bg-slate-100 px-3 py-1.5 font-semibold text-slate-800 text-center whitespace-nowrap" {...cleanProps(props)}>
        {children}
      </th>
    ),
    td: ({ node, children, ...props }: any) => (
      <td className="border border-slate-300 px-3 py-1.5 text-slate-800 text-center whitespace-nowrap" {...cleanProps(props)}>
        {children}
      </td>
    )
  };

  const inlineComponents = {
    ...sharedComponents,
    p: ({ children, ...props }: any) => <span className="inline" {...cleanProps(props)}>{children}</span>,
    div: ({ children, ...props }: any) => <span className="inline" {...cleanProps(props)}>{children}</span>,
    // @ts-ignore
    'svg-wrapper': ({ node }: any) => {
      try {
        const base64 = node.properties?.dataSvg || node.properties?.['data-svg'];
        if (!base64) return null;
        const decoded = decodeSafeBase64(base64);
        if (!decoded) return null;
        return (
          <span className="svg-wrapper my-1 inline-flex flex-col items-center align-middle">
            <span
              className="bg-white p-1.5 rounded-lg border border-slate-300 shadow-2xs max-w-full overflow-x-auto inline-block"
              dangerouslySetInnerHTML={{ __html: decoded }}
            />
          </span>
        );
      } catch (e) {
        return <span className="text-red-500">Lỗi hiển thị hình ảnh SVG</span>;
      }
    },
    table: ({ node, children, ...props }: any) => (
      <span className="overflow-x-auto my-1 max-w-full inline-block align-middle">
        <table className="min-w-fit mx-auto border-collapse border border-slate-300 text-sm text-center shadow-2xs rounded-md overflow-hidden bg-white" {...cleanProps(props)}>
          {children}
        </table>
      </span>
    )
  };

/**
 * COMPONENT CHUYÊN BIỆT HIỂN THỊ TOÁN HỌC & ĐỒ HỌA BBT/SVG (src/components/MathView.tsx)
 * Tự động tiền xử lý, tự động kích hoạt MathJax typesetPromise mỗi khi content thay đổi,
 * hỗ trợ render trực tiếp SVG Bảng biến thiên (BBT), Đồ thị và TikZ.
 */
export const MathView: React.FC<MathViewProps> = React.memo(({ content, className, inline = false }) => {
  const containerRef = useRef<HTMLDivElement | HTMLSpanElement | null>(null);
  const processed = preprocessMath(content);
  const lastProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (lastProcessedRef.current === processed) return;
    lastProcessedRef.current = processed;

    if (typeof window !== 'undefined' && (window as any).MathJax) {
      const mj = (window as any).MathJax;
      if (mj.typesetPromise) {
        if (mj.typesetClear) {
          try { mj.typesetClear([el]); } catch (e) {}
        }
        mj.typesetPromise([el]).then(() => {
          if (el) {
            const containers = el.querySelectorAll('mjx-container');
            containers.forEach((mjx) => {
              if (!mjx.hasAttribute('data-latex')) {
                const text = mjx.getAttribute('aria-label') || mjx.querySelector('mjx-assistive-mml')?.textContent || '';
                if (text) {
                  mjx.setAttribute('data-latex', text.replace(/^\$+|\$+$/g, '').trim());
                }
              }
            });
          }
        }).catch(() => {});
      }
    }
  }, [processed]);

  if (inline) {
    return (
      <span
        ref={containerRef as React.RefObject<HTMLSpanElement>}
        className={className || "inline-flex items-center gap-1 align-baseline font-serif"}
      >
        <Markdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={inlineComponents}
        >
          {processed}
        </Markdown>
      </span>
    );
  }

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={className || "math-view-container font-serif leading-relaxed text-slate-800"}
    >
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={sharedComponents}
      >
        {processed}
      </Markdown>
    </div>
  );
});

export default MathView;
