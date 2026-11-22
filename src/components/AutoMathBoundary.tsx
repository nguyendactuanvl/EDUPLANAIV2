import React, { useEffect, useRef } from 'react';
import { triggerGlobalMathRender, isMathJaxTypesetting } from '../lib/globalMath';

export interface AutoMathBoundaryProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  onTypeset?: () => void;
  debounceMs?: number;
  dependencies?: any[];
}

/**
 * AutoMathBoundary
 * React component wrapping dynamic content containing math formulas.
 * Uses MutationObserver to automatically detect dynamic DOM text/element updates
 * and triggers debounced MathJax typesetting specifically on this subtree.
 */
export const AutoMathBoundary: React.FC<AutoMathBoundaryProps> = ({
  children,
  className = '',
  as: Component = 'div',
  onTypeset,
  debounceMs = 120,
  dependencies,
  ...restProps
}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const onTypesetRef = useRef(onTypeset);
  onTypesetRef.current = onTypeset;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Trigger initial typesetting when component mounts
    triggerGlobalMathRender(el);
    onTypesetRef.current?.();

    let isScheduled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const scheduleRender = () => {
      if (isScheduled) return;
      isScheduled = true;

      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        isScheduled = false;
        if (containerRef.current) {
          triggerGlobalMathRender(containerRef.current);
          onTypesetRef.current?.();
        }
      }, debounceMs);
    };

    const observer = new MutationObserver((mutations) => {
      if (isMathJaxTypesetting()) return;
      let shouldRender = false;
      let inspected = 0;

      for (const mutation of mutations) {
        if (++inspected > 50) break;
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            if (++inspected > 50) break;
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              const elem = node as HTMLElement;
              const tag = elem.tagName ? elem.tagName.toUpperCase() : '';

              // Skip MathJax internally generated SVG and container elements
              if (
                tag.startsWith('MJX') ||
                tag === 'SVG' ||
                tag === 'PATH' ||
                tag === 'G' ||
                tag === 'RECT' ||
                tag === 'TEXT' ||
                ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'PRE', 'CODE'].includes(tag) ||
                elem.classList.contains('MathJax') ||
                elem.classList.contains('math-view-container') ||
                elem.classList.contains('markdown-body') ||
                elem.closest('mjx-container, .math-view-container, .markdown-body') ||
                elem.hasAttribute('data-latex')
              ) {
                continue;
              }

              const text = elem.textContent || '';
              if (text.includes('$') || text.includes('\\(') || text.includes('\\[')) {
                shouldRender = true;
                break;
              }
            }
          }
        } else if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          if (
            parent &&
            (parent.tagName.toUpperCase().startsWith('MJX') ||
              parent.closest('mjx-container, .math-view-container, .markdown-body') ||
              parent.classList.contains('MathJax'))
          ) {
            continue;
          }
          const text = mutation.target.textContent || '';
          if (text.includes('$') || text.includes('\\(') || text.includes('\\[')) {
            shouldRender = true;
          }
        }
        if (shouldRender) break;
      }

      if (shouldRender) {
        scheduleRender();
      }
    });

    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (timerId) clearTimeout(timerId);
    };
  }, [debounceMs]);

  useEffect(() => {
    if (!dependencies || dependencies.length === 0) return;
    const el = containerRef.current;
    if (el) {
      triggerGlobalMathRender(el);
      onTypesetRef.current?.();
    }
  }, dependencies || []);

  const Tag = Component as any;

  return (
    <Tag ref={containerRef} className={className} {...restProps}>
      {children}
    </Tag>
  );
};

export default AutoMathBoundary;
