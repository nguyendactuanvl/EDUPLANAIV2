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

  // 1. Handle backtick-wrapped proposition statements with quoted equations (straight or curly quotes), e.g.:
  // `P`: "\forall x \in \mathbb{R}, x^2 + 1 > 0" or `\overline{P}`: “\exists x \in \mathbb{R}, ...”
  t = t.replace(/`([^`\n]+?)`?\s*:\s*[“"”]([^"”\n]+)[“"”]/g, (_match, prop, expr) => {
    const cleanProp = prop.replace(/^\$+|\$+$/g, '').trim();
    const cleanExpr = expr.replace(/^\$+|\$+$/g, '').trim();
    return `$${cleanProp}$: "$${cleanExpr}$"`;
  });

  t = t.replace(/`([^`\n]+?):\s*[“"”]([^"”\n]+)[“"”]`?/g, (_match, prop, expr) => {
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
    clean = clean.replace(/^[“"”]([^"”\n]+)[“"”]$/, '$1');
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

  // 0. Chuẩn hóa các dấu ngoặc kép bị escape \" bên trong hoặc xung quanh công thức
  t = t.replace(/\\"/g, '"');

  // 1. Chuyển đổi toàn bộ dấu huyền backtick sang $...$
  t = convertBacktickMathToDollars(t);

  // 2. Chuẩn hóa mệnh đề logic có nhãn (P, Q, \overline{P}, \overline{Q}) và công thức có/không có dấu ngoặc kép:
  // Dạng 1: toàn bộ nằm trong $...$: $\overline{P}: "..."$ hoặc $P: "..."$
  t = t.replace(/(?<!\$)\$\s*((?:\\overline\{[A-Za-z]\}|\\bar\{[A-Za-z]\}|[A-Za-z]))\s*:\s*(?:[“"”])([\s\S]*?)(?:[”"“])\s*\$(?!\$)/g, (_m, prop, body) => {
    const cleanProp = prop.replace(/\\bar\{/, '\\overline{');
    const cleanBody = body.trim().replace(/^\$+|\$+$/g, '').trim();
    return `$${cleanProp}$: "$${cleanBody}$"`;
  });
  t = t.replace(/(?<!\$)\$\s*((?:\\overline\{[A-Za-z]\}|\\bar\{[A-Za-z]\}|[A-Za-z]))\s*:\s*(\\(?:forall|exists)[\s\S]*?)\s*\$(?!\$)/g, (_m, prop, body) => {
    const cleanProp = prop.replace(/\\bar\{/, '\\overline{');
    const cleanBody = body.trim().replace(/^\$+|\$+$/g, '').trim();
    return `$${cleanProp}$: $${cleanBody}$`;
  });

  // Dạng 2: ngoài math: P: "..." hoặc \overline{P}: "..."
  t = t.replace(/(^|[\s\n])(?<!\$)(?:\\(?:overline|bar)\{([A-Za-z])\}|([A-Za-z]))\s*:\s*(?:[“"”])([\s\S]*?)(?:[”"“])/g, (_m, pre, p1, p2, body) => {
    const prop = p1 ? `\\overline{${p1}}` : p2;
    const cleanBody = body.trim().replace(/^\$+|\$+$/g, '').trim();
    return `${pre}$${prop}$: "$${cleanBody}$"`;
  });

  // Dạng 3: ngoài math: P: \forall ... hoặc \overline{P}: \exists ...
  t = t.replace(/(^|[\s\n])(?<!\$)(?:\\(?:overline|bar)\{([A-Za-z])\}|([A-Za-z]))\s*:\s*(\\(?:forall|exists)[\s\S]*?)(?=[,\.\n;]|\s+[a-zà-ỹ]|\s*$)/g, (_m, pre, p1, p2, body) => {
    const prop = p1 ? `\\overline{${p1}}` : p2;
    const cleanBody = body.trim().replace(/^\$+|\$+$/g, '').trim();
    return `${pre}$${prop}$: $${cleanBody}$`;
  });

  // Dạng 4: Ngoặc kép bọc công thức \forall hoặc \exists: "\forall x \in \mathbb{R}, ..."
  t = t.replace(/(?<!\$)(?:[“"”])\s*(\\(?:forall|exists)[\s\S]*?)\s*(?:[”"“])(?!\$)/g, (_m, body) => {
    const cleanBody = body.trim().replace(/^\$+|\$+$/g, '').trim();
    return `"$${cleanBody}$"`;
  });

  // 3. Khôi phục các ký tự thoát bị rách hoặc nuốt gạch chéo ngược
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

  // Enforce LaTeX standard syntax: \frac, \ge, \le, \in
  t = t.replace(/\\dfrac\b/g, '\\frac');
  t = t.replace(/\\geq\b/g, '\\ge');
  t = t.replace(/\\leq\b/g, '\\le');

  // 4. Chuẩn hóa công thức Cấp số cộng & Tách chữ tiếng Việt ra khỏi dấu $
  t = normalizeArithmeticProgressionFormulas(t);

  // Clean orphan dots right after display math
  t = t.replace(/(\$\$[\s\S]*?\$\$)\s*\.\s*(?=[A-ZÀ-Ỹ])/g, '$1\n\n');

  // Clean leaked undefined/null
  t = t.replace(/(?<![a-zA-Z0-9_\$])(?:undefined|null)(?![a-zA-Z0-9_\$])/g, '');

  return t;
}

/**
 * Chuẩn hóa các công thức Cấp số cộng (AP) và tách biệt chữ tiếng Việt ra khỏi dấu $
 * Đảm bảo 100% hiển thị chuẩn xác:
 * 1. Dãy số $(u_n)$ là một cấp số cộng $\Rightarrow u_{n+1} = u_n + d$ ($d$: công sai).
 * 2. $u_n = u_1 + (n-1)d$ với $n \ge 2$.
 * 3. $u_k = \frac{u_{k-1} + u_{k+1}}{2}$ với $k \ge 2$.
 */
export function normalizeArithmeticProgressionFormulas(text: string): string {
  if (!text) return '';
  let t = text;

  // 1. Khái niệm / Định nghĩa Cấp số cộng
  t = t.replace(/(?:Dãy\s*số\s*\(?u_?n\)?\s*là\s*một\s*cấp\s*số\s*cộng|(?:\$)?\s*Dãy\s*số\s*\(?u_?n\)?\s*là\s*một\s*cấp\s*số\s*cộng(?:\$)?)\s*(?:\\Rightarrow|=>|->)?\s*(?:\$)?(?:\\Rightarrow|=>)?\s*u_?\{?n\+1\}?\s*=\s*u_?n\s*\+\s*d(?:\$)?\s*(?:\(?\s*(?:\$)?d(?:\$)?\s*:\s*công\s*sai\s*\)?|\(?d\s*:\s*công\s*sai\)?|(?:\$)?\s*\(d:\s*công\s*sai\)(?:\$)?)[.]?(?:\$)?/gi,
    'Dãy số $(u_n)$ là một cấp số cộng $\\Rightarrow u_{n+1} = u_n + d$ ($d$: công sai).'
  );
  t = t.replace(/Dãy\s*số\s*(?:\$\(?u_?n\)?\$|\(?u_?n\)?|\$u_n\$)\s*là\s*một\s*cấp\s*số\s*cộng\s*(?:\$?\\Rightarrow\$?|=>)?\s*(?:\$)?u_?\{?n\+1\}?\s*=\s*u_?n\s*\+\s*d(?:\$)?\s*(?:\(\s*\$?d\$?\s*:\s*công\s*sai\s*\)|\(d:\s*công\s*sai\))[.]?(?:\$)?/gi,
    'Dãy số $(u_n)$ là một cấp số cộng $\\Rightarrow u_{n+1} = u_n + d$ ($d$: công sai).'
  );

  // 2. Công thức số hạng tổng quát Cấp số cộng
  t = t.replace(/(?:\$)?\s*u_?n\s*=\s*u_?1\s*\+\s*\(n\s*-\s*1\)\s*d(?:\$)?\s*(?:\\text\{\s*với\s*\}|,\s*với|với)\s*(?:\$)?\s*n\s*(?:\\ge|\\geq|>=)\s*2(?:\$)?/gi,
    '$u_n = u_1 + (n-1)d$ với $n \\ge 2$'
  );

  // 3. Tính chất số hạng trung bình Cấp số cộng
  t = t.replace(/(?:\$)?\s*u_?k\s*=\s*\\(?:d)?frac\{\s*u_?\{?k-1\}?\s*\+\s*u_?\{?k\+1\}?\s*\}\{\s*2\s*\}(?:\$)?\s*(?:\\text\{\s*với\s*\}|,\s*với|với)\s*(?:\$)?\s*k\s*(?:\\ge|\\geq|>=)\s*2(?:\$)?/gi,
    '$u_k = \\frac{u_{k-1} + u_{k+1}}{2}$ với $k \\ge 2$'
  );

  // 4. Tách các từ nối tiếng Việt ("với", "khi", "nếu", "và", "hoặc") bị nhốt bên trong dấu $
  t = t.replace(/(?<!\$)\$([^\$\s][^\$]*?)\s*(?:\\text\{\s*)?(với|khi|nếu|và|hoặc|hay)(?:\s*\})?\s*([^\$]*?[^\$\s])\$(?!\$)/gi, (_m, p1, conj, p2) => {
    return `$${p1.trim()}$ ${conj} $${p2.trim()}$`;
  });

  // Tách từ nối dính liền với dấu $ (ví dụ $u_n = u_1 + (n-1)d$với$n \ge 2$)
  t = t.replace(/\$([^\$\n]+)\$(với|khi|nếu|và|hoặc|hay)\$([^\$\n]+)\$/gi, '$$$1$$ $2 $$$3$$');

  // Tách chữ "Dãy số" nếu bị nhốt trong $: $Dãy số (u_n)$ -> Dãy số $(u_n)$
  t = t.replace(/\$\s*Dãy\s*số\s*(\([uv]_?n?\)|[uv]_?n)\s*\$/gi, 'Dãy số $$$1$$');

  // Chuẩn hóa ($d$: công sai) và ($q$: công bội)
  t = t.replace(/\(?\$?([dq])\$?\s*:\s*(?:\\text\{)?công\s*(sai|bội)\}?\)?/gi, '($$$1$$: công $2)');

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
