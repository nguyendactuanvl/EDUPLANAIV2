import React, { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import { normalizeMathText, preprocessMathText, cleanMathAndUnwrapHeadings, rehypeSanitizeEventHandlers, cleanProps, sanitizeSvgOrHtmlForReact } from '../lib/globalMath';
import { convertBbtTableToSvg, unflattenMarkdownTables } from '../lib/bbtRenderer';
import { TikzRenderer, getTikzSvg } from './TikzRenderer';
import { typesetMathJax } from './MarkdownRenderer';

interface MathViewProps {
  content?: string | null;
  value?: string | null;
  tex?: string | null;
  math?: string | null;
  className?: string;
  inline?: boolean;
  deferTypeset?: boolean;
}

/**
 * Tiền xử lý tự động chuỗi toán học và đồ họa BBT:
 * 1. Chuyển đổi các bảng biến thiên (BBT) Markdown table thành <svg-wrapper>
 * 2. Đổi tất cả dấu huyền `...` thành $...$
 * 3. Khôi phục các ký tự thoát bị rách hoặc nuốt gạch chéo ngược
 */
export function preprocessMath(raw?: string | null): string {
  if (!raw) return '';
  let s = preprocessMathText(raw);

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
    const cleanMath = codeStr.replace(/^\$+|\$+$/g, '').trim();
    return cleanMath ? <span key={cleanMath} className="math-inline font-serif" data-latex={cleanMath}>{`$${cleanMath}$`}</span> : null;
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
    script: () => null,
    p: ({ children, ...props }: any) => (
      <div className="my-2.5 leading-relaxed whitespace-pre-line" {...cleanProps(props)}>
        {children}
      </div>
    ),
    div: ({ children, ...props }: any) => (
      <div {...cleanProps(props)}>
        {children}
      </div>
    ),
    span: ({ node, children, className, ...props }: any) => {
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
    },
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
              dangerouslySetInnerHTML={{ __html: sanitizeSvgOrHtmlForReact(decoded) }}
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
    ),
    ul: ({ node, children, ...props }: any) => {
      const getNodePlainText = (n: any): string => {
        if (!n) return '';
        if (typeof n === 'string' || typeof n === 'number') return String(n);
        if (Array.isArray(n)) return n.map(getNodePlainText).join(' ');
        if (React.isValidElement(n)) return getNodePlainText((n.props as any)?.children);
        return '';
      };

      const childArray = React.Children.toArray(children);
      const isChoiceList = childArray.length >= 2 && childArray.length <= 4 && childArray.some((child: any) => {
        const text = getNodePlainText(child?.props?.children);
        return /^\s*(?:\*{0,2}|[-*•])*\s*[A-D][\.\)]/i.test(text) || /\b[A-D][\.\)]/.test(text);
      });

      if (isChoiceList) {
        const fullText = getNodePlainText(children);
        const isLong = fullText.length > 140;
        const gridCols = isLong ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-4";
        return (
          <ul className={`grid ${gridCols} gap-2.5 my-2.5 pl-0 list-none text-slate-900`} {...cleanProps(props)}>
            {children}
          </ul>
        );
      }
      return <ul className="my-2.5 pl-6 list-disc space-y-1.5 text-slate-900" {...cleanProps(props)}>{children}</ul>;
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
      const isChoice = /^\s*(?:\*{0,2}|[-*•])*\s*[A-D][\.\)]/i.test(text) || /\b[A-D][\.\)]/.test(text);
      if (isChoice) {
        return (
          <li className="py-1 px-1 text-slate-900 list-none m-0 [&>div]:inline [&>p]:inline" {...cleanProps(props)}>
            {children}
          </li>
        );
      }
      return (
        <li className="my-1 leading-relaxed text-slate-900 [&>div]:inline [&>p]:inline" {...cleanProps(props)}>
          {children}
        </li>
      );
    }
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
              dangerouslySetInnerHTML={{ __html: sanitizeSvgOrHtmlForReact(decoded) }}
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
export const MathView: React.FC<MathViewProps> = React.memo(({ content, value, tex, math, className, inline = false, deferTypeset = false }) => {
  const containerRef = useRef<HTMLDivElement | HTMLSpanElement | null>(null);
  const rawInput = content ?? value ?? tex ?? math;
  const processed = React.useMemo(() => (deferTypeset ? String(rawInput || '') : preprocessMath(rawInput)), [rawInput, deferTypeset]);
  const lastProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    if (deferTypeset) return;
    const el = containerRef.current;
    if (!el) return;
    if (lastProcessedRef.current === processed) return;
    lastProcessedRef.current = processed;

    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      typesetMathJax(containerRef.current);
    }, 60);

    return () => clearTimeout(timer);
  }, [processed, deferTypeset]);

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
      className={className || "math-view-container font-serif leading-relaxed text-slate-800 whitespace-pre-line"}
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
export { AutoMathBoundary } from './AutoMathBoundary';

