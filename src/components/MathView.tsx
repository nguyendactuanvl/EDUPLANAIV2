import React, { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import { normalizeMathText, rehypeSanitizeEventHandlers, cleanProps } from '../lib/globalMath';

interface MathViewProps {
  content?: string | null;
  className?: string;
  inline?: boolean;
}

/**
  * Tiền xử lý tự động chuỗi toán học:
  * 1. Đổi tất cả dấu huyền `...` thành $...$
  * 2. Khôi phục các ký tự thoát bị rách hoặc nuốt gạch chéo ngược (\neq, \lim, \frac, \left, \right, \mathbb, \iff, \nearrow, \searrow)
  */
export function preprocessMath(raw?: string | null): string {
  if (!raw) return '';
  return normalizeMathText(raw);
}

/**
  * COMPONENT CHUYÊN BIỆT HIỂN THỊ TOÁN HỌC (src/components/MathView.tsx)
  * Tự động tiền xử lý, tự động kích hoạt MathJax typesetPromise mỗi khi content thay đổi.
  */
export const MathView: React.FC<MathViewProps> = ({ content, className, inline = false }) => {
  const containerRef = useRef<HTMLDivElement | HTMLSpanElement | null>(null);
  const processed = preprocessMath(content);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

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

  const customCodeRenderer = ({ children, className, ...props }: any) => {
    const codeStr = String(children || '').replace(/\n$/, '');
    if (/\b(?:if|for|while|def|class|return|import|print|input|const|let|var|function)\b/.test(codeStr)) {
      return <code className={className || "font-mono bg-slate-100 px-1 py-0.5 rounded text-xs"} {...cleanProps(props)}>{children}</code>;
    }
    const cleanMath = codeStr.replace(/^\$+|\$+$/g, '').trim();
    return cleanMath ? <span className="math-inline font-serif" data-latex={cleanMath}>{`$${cleanMath}$`}</span> : null;
  };

  if (inline) {
    return (
      <span
        ref={containerRef as React.RefObject<HTMLSpanElement>}
        className={className || "inline-flex items-center gap-1 align-baseline font-serif"}
      >
        <Markdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitizeEventHandlers]}
          components={{
            p: ({ children, ...props }: any) => <span className="inline" {...cleanProps(props)}>{children}</span>,
            div: ({ children, ...props }: any) => <span className="inline" {...cleanProps(props)}>{children}</span>,
            code: customCodeRenderer
          }}
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
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitizeEventHandlers]}
        components={{
          code: customCodeRenderer
        }}
      >
        {processed}
      </Markdown>
    </div>
  );
};

export default MathView;
