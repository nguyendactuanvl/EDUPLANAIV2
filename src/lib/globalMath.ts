/**
 * GLOBAL MATH HANDLER FOR THE ENTIRE APP
 * Provides:
 * 1. normalizeMathText: Universal text preprocessor converting backticks, fixing broken TeX backslashes
 * 2. triggerGlobalMathRender: Debounced call to window.MathJax.typesetPromise()
 * 3. setupGlobalMathObserver: MutationObserver auto-typesetting any DOM updates app-wide
 */

export function convertBacktickMathToDollars(text: string): string {
  if (!text) return '';
  let t = String(text);

  // 1. Handle backtick-wrapped proposition statements with quoted equations, e.g.:
  // `P`: "\forall x \in \mathbb{R}, x^2 + 1 > 0"
  t = t.replace(/`([^`\n]+?)`?\s*:\s*"([^"\n]+)"/g, (_match, prop, expr) => {
    const cleanProp = prop.replace(/^\$+|\$+$/g, '').trim();
    const cleanExpr = expr.replace(/^\$+|\$+$/g, '').trim();
    return `$${cleanProp}$: "$${cleanExpr}$"`;
  });

  t = t.replace(/`([^`\n]+?):\s*"([^"\n]+)"`/g, (_match, prop, expr) => {
    const cleanProp = prop.replace(/^\$+|\$+$/g, '').trim();
    const cleanExpr = expr.replace(/^\$+|\$+$/g, '').trim();
    return `$${cleanProp}$: "$${cleanExpr}$"`;
  });

  // 2. Handle Vietnamese phrase with backtick math, e.g. `tam giác ABC` -> tam giác $ABC$, `góc A` -> góc $A$
  t = t.replace(/`((?:tam giác|góc|đoạn thẳng|đường thẳng|mặt phẳng|khối chóp|hình chóp|hình lăng trụ|lăng trụ|tứ diện|vevtơ|vectơ|vận tốc|bán kính|đường kính|chu kỳ|tần số|diện tích|thể tích)\s+[^`\n]+)`/gi, (_match, inner) => {
    return inner.replace(/([A-Z]{1,5}(?:\.[A-Z]{1,5})?|[0-9]+(?:\.[0-9]+)?)/g, '$$$1$$');
  });

  // 3. Convert any remaining backtick-wrapped math `...` to $...$
  t = t.replace(/`([^`]+)`/g, (match, inner) => {
    // Preserve code blocks with programming keywords
    if (/\b(?:if|for|while|def|class|return|import|print|input|const|let|var|function)\b/.test(inner)) {
      return match;
    }
    let clean = inner.trim();
    clean = clean.replace(/^"([^"\n]+)"$/, '$1');
    clean = clean.replace(/^\$+|\$+$/g, '').trim();
    if (!clean) return match;

    // If clean text contains Vietnamese words, separate words from math letters/numbers
    if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(clean)) {
      return clean.replace(/([A-Z]{1,5}(?:\.[A-Z]{1,5})?|[a-zA-Z0-9\=\+\-\<\>\le\ge]+)/g, (m) => {
        if (/^(tam|giác|góc|đoạn|thẳng|đường|mặt|phẳng|khối|chóp|hình|lăng|trụ|tứ|diện|vectơ|vevtơ|với|hoặc|hay|và)$/i.test(m)) {
          return m;
        }
        return `$${m}$`;
      });
    }

    return `$${clean}$`;
  });

  return t;
}

export function normalizeMathText(text: any): string {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') text = String(text);

  let t = text.normalize("NFC");

  // 1. Convert backticks to dollars
  t = convertBacktickMathToDollars(t);

  // 2. Khôi phục các ký tự thoát bị rách hoặc nuốt gạch chéo ngược
  t = t.replace(/(?<=^|[\s$])([a-z])eq(?=0|\d|\s|\$)/gi, ' \\neq ');
  t = t.replace(/(?<!\\)\bneq\b/g, '\\neq');
  t = t.replace(/(?<!\\)\blim\b/g, '\\lim');
  t = t.replace(/(?<!\\)\bfrac\b/g, '\\frac');
  t = t.replace(/(?<!\\)\bleft\b/g, '\\left');
  t = t.replace(/(?<!\\)\bright\b/g, '\\right');
  t = t.replace(/(?<!\\)\bmathbb\b/g, '\\mathbb');
  t = t.replace(/(?<!\\)\biff\b/g, '\\iff');
  t = t.replace(/(?<!\\)\bnearrow\b/g, '\\nearrow');
  t = t.replace(/(?<!\\)\bsearrow\b/g, '\\searrow');
  t = t.replace(/(?<!\\)\bforall\b/g, '\\forall');
  t = t.replace(/(?<!\\)\bexists\b/g, '\\exists');
  t = t.replace(/(?<!\\)\boverline\b/g, '\\overline');
  t = t.replace(/(?<!\\)\bRightarrow\b/g, '\\Rightarrow');
  t = t.replace(/(?<!\\)\bLeftrightarrow\b/g, '\\Leftrightarrow');
  t = t.replace(/(?<!\\)\bLeftrightarrow\b/g, '\\Leftrightarrow');
  t = t.replace(/(?<!\\)\bvdots\b/g, '\\vdots');
  t = t.replace(/(?<!\\)\bcirc\b/g, '\\circ');
  t = t.replace(/(?<!\\)\bleq\b/g, '\\leq');
  t = t.replace(/(?<!\\)\bgeq\b/g, '\\geq');

  // Fix common math environments
  t = t.replace(/\\*begin\s*\{?cases\*?\}?/gi, '\\begin{cases}');
  t = t.replace(/\\*end\s*\{?cases\*?\}?/gi, '\\end{cases}');
  t = t.replace(/\\*begin\s*\{?aligned\*?\}?/gi, '\\begin{aligned}');
  t = t.replace(/\\*end\s*\{?aligned\*?\}?/gi, '\\end{aligned}');

  // Convert \(...\) to $...$ and \[...\] to $$...$$
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

  // Clean orphan dots right after display math
  t = t.replace(/(\$\$[\s\S]*?\$\$)\s*\.\s*(?=[A-ZÀ-Ỹ])/g, '$1\n\n');

  // Clean leaked undefined/null
  t = t.replace(/(?<![a-zA-Z0-9_\$])(?:undefined|null)(?![a-zA-Z0-9_\$])/g, '');

  return t;
}

let mathRenderTimer: any = null;

export function triggerGlobalMathRender(targetElement?: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  if (mathRenderTimer) clearTimeout(mathRenderTimer);

  mathRenderTimer = setTimeout(() => {
    const mj = (window as any).MathJax;
    if (mj && mj.typesetPromise) {
      if (targetElement) {
        if (mj.typesetClear) {
          try { mj.typesetClear([targetElement]); } catch (e) {}
        }
        mj.typesetPromise([targetElement]).catch(() => {});
      } else {
        mj.typesetPromise().catch(() => {});
      }
    }
  }, 100);
}

let isObserverActive = false;

export function setupGlobalMathObserver() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (isObserverActive) return;

  isObserverActive = true;

  // Expose global helpers on window
  (window as any).normalizeMathText = normalizeMathText;
  (window as any).triggerGlobalMathRender = triggerGlobalMathRender;

  const observer = new MutationObserver((mutations) => {
    let shouldRender = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName;
            if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'PRE', 'CODE'].includes(tag)) {
              continue;
            }
            const text = el.textContent || '';
            if (text.includes('$') || text.includes('`') || text.includes('\\')) {
              shouldRender = true;
              break;
            }
          }
        }
      } else if (mutation.type === 'characterData') {
        const text = mutation.target.textContent || '';
        if (text.includes('$') || text.includes('`') || text.includes('\\')) {
          shouldRender = true;
        }
      }
      if (shouldRender) break;
    }

    if (shouldRender) {
      triggerGlobalMathRender();
    }
  });

  const attachObserver = () => {
    const root = document.getElementById('root') || document.body;
    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachObserver);
  } else {
    attachObserver();
  }

  // Also initial trigger when MathJax finishes loading script
  window.addEventListener('load', () => {
    triggerGlobalMathRender();
  });
}
