/**
 * GLOBAL MATH HANDLER FOR THE ENTIRE APP
 * Provides:
 * 1. normalizeMathText: Universal text preprocessor converting backticks, fixing broken TeX backslashes
 * 2. triggerGlobalMathRender: Debounced call to window.MathJax.typesetPromise()
 * 3. setupGlobalMathObserver: MutationObserver auto-typesetting any DOM updates app-wide
 */

/**
 * Loại bỏ hoàn toàn các thẻ <script>...</script> khỏi chuỗi HTML / SVG trước khi truyền vào dangerouslySetInnerHTML
 * Giúp ngăn chặn triệt để lỗi React: "Encountered a script tag while rendering React component"
 */
export function sanitizeSvgOrHtmlForReact(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script[^>]*type=["']text\/tikz["'][^>]*>([\s\S]*?)<\/script>/gi, (_m, inner) => {
      const trimmed = (inner || '').trim();
      if (!trimmed) return '';
      return trimmed.includes('\\begin{tikzpicture}') ? trimmed : `\\begin{tikzpicture}\n${trimmed}\n\\end{tikzpicture}`;
    })
    .replace(/<script[^>]*type=["']math\/tex;\s*mode=display["'][^>]*>([\s\S]*?)<\/script>/gi, (_m, inner) => `$$${(inner || '').trim()}$$`)
    .replace(/<script[^>]*type=["']math\/tex["'][^>]*>([\s\S]*?)<\/script>/gi, (_m, inner) => `$${(inner || '').trim()}$`)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*>/gi, '')
    .replace(/<\/script>/gi, '');
}

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

/**
 * Tự động bọc $...$ cho các biểu thức toán học trần trụi (naked math) hoặc khoảng/đoạn thiếu $
 * Phục vụ cho các phương án trắc nghiệm hoặc biểu thức ngắn chưa được kẹp $
 */
export function autoWrapNakedMathExpression(text: string): string {
  if (!text) return '';
  let t = text.trim();
  if (!t) return '';

  // Tuyệt đối KHÔNG bọc nhãn phương án (A., B., C., D., a), b)...), dấu câu, gạch ngang, năm học (2026 - 2027), Đ/S
  if (
    /^(?:[-*•●]\s*)?(?:\*{0,3})?\(?[A-Da-d]\)?[\.\:\)](?:\*{0,3})?$/.test(t) ||
    /^[ĐS]$/.test(t) ||
    /^[\s\-–—.,:;!?\/\\•●*()\[\]{}]+$/.test(t) ||
    /^\d{4}\s*[-–—]\s*\d{4}$/.test(t) ||
    /^\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4}$/.test(t)
  ) {
    return t;
  }

  // Balance odd dollar count first if present (e.g. '$19' -> '$19$')
  const dollarCount = (t.match(/(?<!\\)\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    if (t.startsWith('$') && !t.endsWith('$')) {
      t = t + '$';
    } else if (!t.startsWith('$') && t.endsWith('$')) {
      t = '$' + t;
    } else {
      t = t + '$';
    }
  }

  if (t.includes('$') || t.includes('\\begin{')) return t;

  const withoutConj = t.replace(/(?:^|\s+)(?:và|hoặc|hay)(?:\s+|$)/gi, ' ').trim();
  const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(withoutConj);
  const isSentential = hasVietnamese && (t.length > 80 || t.split(/\s+/).length > 12);

  // Không bọc văn bản chữ ASCII thuần (như THPT, EDUPLAN AI, STT) nếu không có số, toán tử hoặc ký hiệu toán
  const hasAnyMathSignal = /[\d\^_\\=<>+\-*/|{}\[\]]|\((?:[^()]+)\)/.test(t);

  if (!hasVietnamese && !isSentential && hasAnyMathSignal) {
    if (/\s+(?:và|hoặc|hay)\s+/i.test(t)) {
      const parts = t.split(/(\s+(?:và|hoặc|hay)\s+)/i);
      return parts.map(p => {
        if (/^\s*(?:và|hoặc|hay)\s*$/i.test(p)) return p;
        let sub = p.trim();
        if (/^[\[\(].+[\]\)]$/.test(sub) || /[\^_\\]/.test(sub) || /^[a-zA-Z0-9\+\-\*\/\=><\s,;]+$/.test(sub)) {
          return `$${sub}$`;
        }
        return p;
      }).join('');
    } else {
      if (/^[\[\(].+[\]\)]$/.test(t) || /[\^_\\]/.test(t) || /^-?\s*\d*(?:\/\d+|\\frac)/.test(t) || /^[a-zA-Z0-9\+\-\*\/=><\s,;\.\(\)]+$/.test(t) || /^\\?\{[^}\n]+\\?\}$/.test(t) || /^-?[0-9]+(?:\.[0-9]+)?$/.test(t)) {
        return `$${t}$`;
      }
    }
  }
  return t;
}

export function fixUnbalancedLeftRight(mathStr: string): string {
  if (!mathStr) return mathStr;
  let s = mathStr;
  // Heal previously corrupted \le ft -> \left and \right \right. -> \right]
  s = s.replace(/\\le\s+ft\b/g, '\\left');
  s = s.replace(/\\right\s+\\right\.\$\s*[\r\n]*\s*\]\$/g, '\\right]$');
  s = s.replace(/\\right\s+\\right\./g, '\\right]');
  if (!s.includes('\\left') && !s.includes('\\right')) return s;

  // 0. Sửa các ngoặc đơn giản \left( SCD \right) -> (SCD), \left[ a; b \right] -> [a; b] không chứa phân số phức tạp
  s = s.replace(/\\left\s*\(([a-zA-Z0-9\s,;._\+\-\*\/]+?)\\right\s*\)/g, '($1)');
  s = s.replace(/\\left\s*\[([a-zA-Z0-9\s,;._\+\-\*\/]+?)\\right\s*\]/g, '[$1]');
  s = s.replace(/\\left\s*\\\{([a-zA-Z0-9\s,;._\+\-\*\/]+?)\\right\s*\\\}/g, '\\{$1\\}');

  // 1. Sửa ngoặc nhọn unescaped sau \left / \right (vd: \left{ -> \left\{, \right} -> \right\})
  s = s.replace(/\\left\s*\{/g, '\\left\\{');
  s = s.replace(/\\right\s*\}/g, '\\right\\}');
  s = s.replace(/\\left\s*\}/g, '\\left\\}');
  s = s.replace(/\\right\s*\{/g, '\\right\\{');

  // 1.5. Chuyển đổi hệ phương trình / hàm số từng khúc từ \left\{ ... \right. sang \begin{cases} ... \end{cases}
  // Giúp KaTeX và MathJax hiển thị trơn tru, triệt tiêu 100% lỗi "Missing \left or extra \right"
  s = s.replace(/\\left\s*\\\{\s*(?:\\begin\s*\{(?:matrix|array|aligned)\}(?:\{[^}]*\})?)?([\s\S]*?)(?:\\end\s*\{(?:matrix|array|aligned)\})?\s*\\right\s*\./g, (_m, body) => {
    return `\\begin{cases} ${body.trim()} \\end{cases}`;
  });
  s = s.replace(/\\left\s*\\\{\s*(\\begin\s*\{cases\}[\s\S]*?\\end\s*\{cases\})\s*(?:\\right\s*\.)?/g, '$1');

  // 2. Tự động cân bằng số lượng \left và \right trong từng khối $...$
  s = s.replace(/\$([^$]+)\$/g, (match, inner) => {
    const lefts = (inner.match(/\\left\b/g) || []).length;
    const rights = (inner.match(/\\right\b/g) || []).length;
    if (lefts > rights) {
      return `$${inner}${' \\right.'.repeat(lefts - rights)}$`;
    } else if (rights > lefts) {
      return `$${'\\left.'.repeat(rights - lefts)} ${inner}$`;
    }
    return match;
  });

  // 3. Nếu chuỗi không chứa $ nhưng có \left và \right không cân bằng
  if (!s.includes('$')) {
    const lefts = (s.match(/\\left\b/g) || []).length;
    const rights = (s.match(/\\right\b/g) || []).length;
    if (lefts > rights) {
      s += ' \\right.'.repeat(lefts - rights);
    } else if (rights > lefts) {
      s = '\\left.'.repeat(rights - lefts) + ' ' + s;
    }
  }

  return s;
}

export function fixTrigAndMathSyntax(text: string): string {
  if (!text) return '';
  let s = String(text);

  // 1. Cân bằng \left và \right phòng chống lỗi KaTeX/MathJax "Missing \left or extra \right"
  s = fixUnbalancedLeftRight(s);

  // 2. Sửa các lệnh lượng giác/logarit/giới hạn/lượng giác ngược dính chữ hoặc dính số (vd: \sinA -> \sin A, \cosB -> \cos B, cos60 -> \cos 60, \cos 30 -> \cos 30)
  s = s.replace(/(?<![\\a-zA-Z])(arcsin|arccos|arctan|sin|cos|tan|cot)(?=\d)/g, '\\$1 ');
  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (mathSeg) =>
    mathSeg.replace(/(?<![\\a-zA-Z])(arcsin|arccos|arctan|sin|cos|tan|cot)(?![a-zA-Z])(?=\s*(?:\d|[A-Za-z]\b|\\|\(|\{|\^))/g, '\\$1')
  );
  s = s.replace(/\\(sin|cos|tan|cot|lim|ln|log|arcsin|arccos|arctan)(?!h\b)([A-Za-z0-9])(?![a-zA-Z])/g, (_m, fn, arg) => `\\${fn} ${arg}`);

  // 3. Chuẩn hóa khoảng cách quanh dấu $$ và dọn dẹp số lượng $ thừa
  s = s.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');
  s = s.replace(/\$\$\s*(\\Leftrightarrow|\\Rightarrow|\\Leftarrow|=|\\iff)\s*\$\$/g, ' $1 ');

  // 4. Dọn khoảng trắng thừa
  s = s.replace(/ {2,}/g, ' ');

  // 5. Cân bằng dấu $ nếu có số lượng $ lẻ
  const dollarMatches = s.match(/\$/g) || [];
  if (dollarMatches.length % 2 !== 0) {
    if (s.trim().startsWith('$') && !s.trim().endsWith('$')) {
      s = s.trim() + '$';
    } else if (!s.trim().startsWith('$') && s.trim().endsWith('$')) {
      const withoutTrailingDollar = s.trim().replace(/\$$/, '');
      const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(withoutTrailingDollar);
      if (!hasVietnamese) {
        s = '$' + s.trim();
      } else {
        s = withoutTrailingDollar;
      }
    }
  }

  return s;
}

/**
 * Tự động bảo toàn và bổ sung ngoặc tròn cho hàm mũ có cơ số là phân số hoặc số âm:
 * Ví dụ:
 * - \frac{5}{3}^n -> \left(\frac{5}{3}\right)^n
 * - {\frac{4}{3}}^n -> \left(\frac{4}{3}\right)^n
 * - {-2}^n -> \left(-2\right)^n
 * - u_n = -2^n -> u_n = \left(-2\right)^n
 * - {-\frac{1}{2}}^n -> \left(-\frac{1}{2}\right)^n
 */
export function wrapFractionAndNegativePowers(text: string): string {
  if (!text) return '';
  let s = String(text);

  // 1. {-2}^n, {-3}^{n+1}, {-a}^n -> \left(-2\right)^n
  s = s.replace(/(?<!\\left\s*\(|\()\{\s*(-\s*(?:[0-9]+(?:\.[0-9]+)?|[a-zA-Z]))\s*\}\^(\{?[^{}\s\$,]+\}?)/g, '\\left($1\\right)^$2');

  // 2. {\frac{a}{b}}^n hoặc {-\frac{a}{b}}^n -> \left(\frac{a}{b}\right)^n
  s = s.replace(/(?<!\\left\s*\(|\()\{\s*(-?\\frac\{[^{}]+\}\{[^{}]+\})\s*\}\^(\{?[^{}\s\$,]+\}?)/g, '\\left($1\\right)^$2');

  // 3. \frac{a}{b}^n hoặc -\frac{a}{b}^n -> \left(\frac{a}{b}\right)^n
  s = s.replace(/(?<!\\left\s*\(|\()(?<![\w\\])(-?\\frac\{[^{}]+\}\{[^{}]+\})\^(\{?[^{}\s\$,]+\}?)/g, '\\left($1\\right)^$2');

  // 4. Phân số có biểu thức lồng dấu ngoặc nhọn: {\frac{\sqrt{2}}{3}}^n hoặc \frac{\sqrt{2}}{3}^n
  s = s.replace(/(?<!\\left\s*\(|\()\{\s*(-?\\frac\{(?:[^{}]|\{[^{}]*\})+\}\{(?:[^{}]|\{[^{}]*\})+\})\s*\}\^(\{?[^{}\s\$,]+\}?)/g, '\\left($1\\right)^$2');
  s = s.replace(/(?<!\\left\s*\(|\()(?<![\w\\])(-?\\frac\{(?:[^{}]|\{[^{}]*\})+\}\{(?:[^{}]|\{[^{}]*\})+\})\^(\{?[^{}\s\$,]+\}?)/g, '\\left($1\\right)^$2');

  // 5. Trong dãy số / cấp số nhân / giới hạn dạng u_n = -2^n hoặc q = -2 => (-2)^n
  s = s.replace(/(\bu_n\s*=\s*)(-\s*[0-9]+)\^([a-zA-Z0-9]+|\{[^}]+\})/g, '$1\\left($2\\right)^$3');

  return s;
}

/**
 * Chuyển đổi môi trường LaTeX tabular (\begin{center}\begin{tabular}...\end{tabular}\end{center})
 * sang định dạng Markdown table chuẩn để hiển thị đẹp mắt, có viền, co giãn tốt trên mọi thiết bị.
 */
export function convertLatexTabularToMarkdown(text: string): string {
  if (!text || !text.includes('tabular')) return text;

  // 1. Gỡ bỏ \begin{center} ... \end{center} bọc ngoài tabular
  let s = text.replace(/\\begin\s*\{center\}\s*(\\begin\s*\{tabular\}[\s\S]*?\\end\s*\{tabular\})\s*\\end\s*\{center\}/gi, '$1');

  // 2. Chuyển đổi từng khối tabular
  s = s.replace(/\\begin\s*\{tabular\}\s*\{[^}]*\}\s*([\s\S]*?)\s*\\end\s*\{tabular\}/gi, (_match, body) => {
    const cleanBody = body
      .replace(/\\hline/gi, '')
      .replace(/\\cline\s*\{[^}]*\}/gi, '')
      .trim();

    const rawRows = cleanBody.split(/\\\\/);
    const rows = rawRows
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0);

    if (rows.length === 0) return '';

    const parsedRows = rows.map((r: string) => {
      return r.split('&').map((cell: string) => {
        let c = cell.trim();
        // Nếu ô bảng chứa biến hoặc công thức nhưng chưa được kẹp $, tự động kẹp $
        if (c && !c.includes('$') && (/^[a-zA-Z0-9\+\-\*\/\=><\s,;\.\^_{}]+$/.test(c) || /\\frac|\\sqrt|\\pi/.test(c))) {
          c = `$${c}$`;
        }
        return c;
      });
    });

    const maxCols = Math.max(...parsedRows.map((r: string[]) => r.length));
    if (maxCols === 0) return '';

    const tableLines: string[] = [];
    const headerRow = parsedRows[0];
    while (headerRow.length < maxCols) headerRow.push('');
    tableLines.push('| ' + headerRow.join(' | ') + ' |');
    tableLines.push('| ' + Array(maxCols).fill(':---:').join(' | ') + ' |');

    for (let i = 1; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      while (row.length < maxCols) row.push('');
      tableLines.push('| ' + row.join(' | ') + ' |');
    }

    return '\n\n' + tableLines.join('\n') + '\n\n';
  });

  return s;
}

export function fixSystemOfEquationsAndCases(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  let s = text;

  // 1. Remove garbage patterns like \begin{cases} 2} or \begin{cases} 2} = ...
  s = s.replace(/\\begin\s*\{cases\*?\}\s*2\}\s*=/gi, '=');
  s = s.replace(/\\begin\s*\{cases\*?\}\s*2\}/gi, '');
  s = s.replace(/(?:\\end\s*\{cases\*?\}\s*){2,}/gi, '\\end{cases}');

  // 1.5. Auto-close any unclosed \begin{cases} blocks truncated before the next option (A./B./C./D.), next \begin{cases}, blank line, or EOF
  s = s.replace(
    /(\$\$?|\n|^)?([ \t]*)(\\begin\s*\{cases\*?\})([\s\S]*?)(?=(?:\r?\n\s*\r?\n|\r?\n[ \t]*(?:[-*•]\s*)?(?:\*{0,2})?[A-D][\.\:\)]|\r?\n[ \t]*\*{0,2}(?:Câu|Bài)\s*\d+|\\begin\s*\{cases\*?\}|\\end\s*\{cases\*?\}|#{1,4}\s|$))/gi,
    (fullMatch, preDollar, indent, beginCmd, body, offset, str) => {
      const after = str.slice(offset + fullMatch.length);
      if (/^\s*\\end\s*\{cases\*?\}/i.test(after)) {
        return fullMatch;
      }
      const cleanBody = body
        .replace(/(?<!\\)\$/g, '')
        .replace(/(?<!\\)\\(?=\s*(?:\r?\n|$))/g, ' \\\\ ')
        .trim();
      const lines = cleanBody.split(/(?:\\\\|\n+)/).map((l: string) => l.trim()).filter(Boolean);
      const wrappedCases = lines.length >= 1
        ? `\\begin{cases} ${lines.join(' \\\\ ')} \\end{cases}`
        : `${beginCmd} ${cleanBody} \\end{cases}`;
      return `${preDollar && preDollar !== '$' && preDollar !== '$$' ? preDollar : ''}${indent}$${wrappedCases}$`;
    }
  );

  // 2. Standardize genuine \begin{cases} ... \end{cases} blocks onto a clean single line
  // so inline $...$ options and line-based sanitizers never split or break them:
  s = s.replace(/\\begin\s*\{cases\*?\}\s*([\s\S]*?)\s*\\end\s*\{cases\*?\}/gi, (fullMatch, body) => {
    let cleanBody = body
      .replace(/(?<!\\)\$/g, '')
      .replace(/(?<!\\)\\(?=\s*(?:\r?\n|$))/g, ' \\\\ ')
      .trim();
    const lines = cleanBody.split(/(?:\\\\|\n+)/).map((l: string) => l.trim()).filter(Boolean);
    if (lines.length >= 1) {
      return `\\begin{cases} ${lines.join(' \\\\ ')} \\end{cases}`;
    }
    return fullMatch;
  });

  // 3. Normalize explicit \left\{ ... \right. only when containing at least 2 distinct equations
  s = s.replace(/\\left\s*\\\{\s*([\s\S]*?)\s*\\right\s*[.\}]/gi, (fullMatch, body) => {
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i.test(body) && !body.includes('=')) {
      return fullMatch;
    }
    let cleanBody = body
      .replace(/(?<!\\)\$/g, '')
      .replace(/(?<!\\)\\(?=\s*(?:\r?\n|$))/g, ' \\\\ ')
      .trim();
    const lines = cleanBody.split(/(?:\\\\|\n+)/).map((l: string) => l.trim()).filter(Boolean);
    if (lines.length >= 2 && lines.every((l: string) => /[=<>]|\\le|\\ge|\\neq/.test(l))) {
      return `\\begin{cases} ${lines.join(' \\\\ ')} \\end{cases}`;
    }
    return fullMatch;
  });

  // 4. Deduplicate repeated \end{cases} without deleting valid closing delimiters or single-line \end{cases}
  s = s.replace(/(\\end\{cases\})\s*\\end\{cases\}/gi, '$1');

  return s;
}

export function fixMergedVietnameseWords(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  let s = text;

  s = s.replace(/\bTacó\b/gi, 'Ta có');
  s = s.replace(/\bSốhạngtổngquátcủacấpsốcộng\b/gi, 'Số hạng tổng quát của cấp số cộng');
  s = s.replace(/\bSốhạngtổngquát\b/gi, 'Số hạng tổng quát');
  s = s.replace(/\bcủacấpsốcộng\b/gi, 'của cấp số cộng');
  s = s.replace(/\bcósốhạngđầu\b/gi, 'có số hạng đầu');
  s = s.replace(/\bvàcôngsai\b/gi, 'và công sai');
  s = s.replace(/\bđượcxácđịnhbởi\b/gi, 'được xác định bởi');
  s = s.replace(/\bcôngthức\b/gi, 'công thức');
  s = s.replace(/\bđượctínhbằng\b/gi, 'được tính bằng');
  s = s.replace(/\bcôngthứcnàosauđây\b/gi, 'công thức nào sau đây');
  s = s.replace(/\bcôngsai\b/gi, 'công sai');
  s = s.replace(/\blậpthànhCSC\b/gi, 'lập thành CSC');
  s = s.replace(/\blậpthànhcấpsốcộng\b/gi, 'lập thành cấp số cộng');
  s = s.replace(/\bChocấpsốcộng\b/gi, 'Cho cấp số cộng');
  s = s.replace(/\bChodãysố\b/gi, 'Cho dãy số');
  s = s.replace(/\bcócácsốhạngđầulầnlượtlà\b/gi, 'có các số hạng đầu lần lượt là');
  s = s.replace(/\bcôngsaidcủacấpsốcộngnàylàbaonhiêu\b/gi, 'công sai d của cấp số cộng này là bao nhiêu');
  s = s.replace(/\blàbaonhiêu\b/gi, 'là bao nhiêu');
  s = s.replace(/\blàsốhạngthứmấy\b/gi, 'là số hạng thứ mấy');
  s = s.replace(/\bcủacấpsốcộng\b/gi, 'của cấp số cộng');
  s = s.replace(/\bSốhạngthứ\b/gi, 'Số hạng thứ');
  s = s.replace(/\bphụthuộcvàobiến\b/gi, 'phụ thuộc vào biến');
  s = s.replace(/\bHàngthứ(\d+)có\b/gi, 'Hàng thứ $1 có');
  s = s.replace(/\bSốghếmỗihàng\b/gi, 'Số ghế mỗi hàng');
  s = s.replace(/\bLươngmỗinămlậpthànhCSC\b/gi, 'Lương mỗi năm lập thành CSC');
  s = s.replace(/\bLươngmỗinăm\b/gi, 'Lương mỗi năm');
  s = s.replace(/\bTổnglươngsau(\d+)nămlà\b/gi, 'Tổng lương sau $1 năm là');
  s = s.replace(/\bTổnglương\b/gi, 'Tổng lương');
  s = s.replace(/\bVậycôngsai\b/gi, 'Vậy công sai');
  s = s.replace(/\bĐịnhnghĩa\b/gi, 'Định nghĩa');
  s = s.replace(/\bTínhchất\b/gi, 'Tính chất');
  s = s.replace(/\bTínhchấtcácsốhạngcủacấpsốcộng\b/gi, 'Tính chất các số hạng của cấp số cộng');
  s = s.replace(/\bTổngnsốhạngđầutiên\b/gi, 'Tổng $n$ số hạng đầu tiên');
  s = s.replace(/\bThayvào\b/gi, 'Thay vào');
  s = s.replace(/\bSuyra\b/gi, 'Suy ra');
  s = s.replace(/\bMặtkhác\b/gi, 'Mặt khác');
  s = s.replace(/\bDođó\b/gi, 'Do đó');
  s = s.replace(/\bTacần\b/gi, 'Ta cần');
  s = s.replace(/\bXétphươngtrình\b/gi, 'Xét phương trình');
  s = s.replace(/\bnhỏnhất\b/gi, 'nhỏ nhất');
  s = s.replace(/\bthỏamãn\b/gi, 'thỏa mãn');
  s = s.replace(/\blần\b(?=\s*=\s*\d+)/gi, 'là n');
  s = s.replace(/\bnguyêndương\b/gi, 'nguyên dương');
  s = s.replace(/\bđạtcựcđại\b/gi, 'đạt cực đại');
  s = s.replace(/\blớnnhất\b/gi, 'lớn nhất');
  s = s.replace(/\bduynhất\b/gi, 'duy nhất');
  s = s.replace(/\bbướctính:\*/gi, '');
  s = s.replace(/\*\(Lưu\s*ý\s*bảng\s*đáp\s*án\s*cập\s*nhật:/gi, '');

  return s;
}

export function cleanSectionTitles(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  let s = text;

  // Tách riêng nếu tiêu đề PHẦN bị dính với Câu hỏi, mệnh đề a), hoặc mục đánh số (vd: PHẦN III: 1. Với n=4...) trên cùng 1 dòng:
  s = s.replace(/(PHẦN\s*(?:[1-4]|I{1,4}|IV)\b[^:\n]*:?)(?=[ \t]+(?:\*{0,2}(?:Câu|Bài)\s*\d+|\d+[\.\)](?:\s+(?![A-D]\b)|\s*$)|(?:[-*]\s*)?\*{0,2}[a-d]\)\s+))/gi, '$1\n\n');

  // Nếu tiêu đề ngắn "PHẦN II:", "PHẦN III:", "PHẦN IV:" bị dính trực tiếp với công thức hoặc nội dung câu 1 (không phải tên tiêu đề phần):
  s = s.replace(/(PHẦN\s*(?:[2-4]|II|III|IV)\s*:)[ \t]+(?!(?:TRẮC\s*NGHIỆM|CÂU\s*HỎI|BÀI\s*TẬP|TỰ\s*LUẬN|ĐÚNG|TRẢ\s*LỜI|NHIỀU|LỰA\s*CHỌN|PHẦN|MỖI|HƯỚNG\s*DẪN|ĐÁP\s*ÁN|LỜI\s*GIẢI)\b)(\S)/gi, '$1\n\n$2');

  // Clean dollar math tags and asterisks inside section headers ONLY:
  s = s.replace(/(?:^|\n)[ \t]*(?:\*{1,3}|#{1,4}|<[^>]+>)*[ \t]*(PHẦN\s*(?:[1-4]|I{1,4}|IV)\b[^\n]*)/gi, (_fullMatch, header) => {
    // Nếu là dòng đáp án nhanh kiểu "PHẦN I: 1.C, 2.B, 3.C..." thì giữ nguyên phần đáp án, không xóa dấu
    const quickAnsMatch = header.match(/^(PHẦN\s*(?:I|1)\s*:?)\s*(\d+\s*[\.\):-]?\s*[A-D]\b[\s\S]*)$/i);
    if (quickAnsMatch) {
      return `\n\n### ${quickAnsMatch[1].replace(/[\$\*]/g, '').trim()} ${quickAnsMatch[2].trim()}`;
    }

    // Nếu có Câu hỏi, mệnh đề a), hoặc mục 1. 2. lọt vào header do dính dòng, tách ra để bảo vệ công thức toán và Câu 1
    const qMatch = header.match(/^(.*?)(\s+(?:\*{0,2}(?:Câu|Bài)\s*\d+|\d+[\.\)](?:\s+(?![A-D]\b)|\s*$)|(?:[-*]\s*)?\*{0,2}[a-d]\)\s+)[\s\S]*)$/i);
    let title = header;
    let rest = '';
    if (qMatch) {
      title = qMatch[1];
      rest = '\n\n' + qMatch[2].trim();
    } else {
      const partColonMatch = header.match(/^(PHẦN\s*(?:[2-4]|II|III|IV)\s*:)\s+(?!(?:TRẮC\s*NGHIỆM|CÂU\s*HỎI|BÀI\s*TẬP|TỰ\s*LUẬN|ĐÚNG|TRẢ\s*LỜI|NHIỀU|LỰA\s*CHỌN|PHẦN|MỖI|HƯỚNG\s*DẪN|ĐÁP\s*ÁN|LỜI\s*GIẢI)\b)([\s\S]+)$/i);
      if (partColonMatch) {
        title = partColonMatch[1];
        rest = '\n\n' + partColonMatch[2].trim();
      }
    }
    let clean = title.replace(/[\$\*]/g, '').trim();
    clean = clean.replace(/TRẮC\s*NGHI\s*ỆM/gi, 'TRẮC NGHIỆM');
    clean = clean.replace(/NGHI\s*ỆM/gi, 'NGHIỆM');
    clean = clean.replace(/NHI\s*ỀU/gi, 'NHIỀU');
    clean = clean.replace(/TRẢ\s*LỜI\s*NGẮN/gi, 'TRẢ LỜI NGẮN');
    clean = clean.replace(/ĐÚNG\s*[\/\-]?\s*SAI/gi, 'ĐÚNG / SAI');
    clean = clean.replace(/NHIỀU\s*PHƯƠNG\s*ÁN\s*LỰA\s*CHỌN/gi, 'NHIỀU PHƯƠNG ÁN LỰA CHỌN');
    clean = clean.replace(/LỰA\s*CHỌN\s*A,?\s*B,?\s*C,?\s*D/gi, 'LỰA CHỌN A, B, C, D');
    return `\n\n### ${clean}${rest}`;
  });

  return fixAndMergeMathArrows(s);
}

export function fixBrokenLatexSyntax(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  let s = text;

  // 1. Fix missing opening brace in \frac: \frac -3n^2 + 43n}{2} -> \frac{-3n^2 + 43n}{2}
  s = s.replace(/\\frac\s*(-?[a-zA-Z0-9\+\-\*\/\^\_\.]+)[\s\}]*\{([^{}\n]+)\}/g, '\\frac{$1}{$2}');
  s = s.replace(/\\frac\s*(-?[a-zA-Z0-9\+\-\*\/\^\_\.]+)(?=\{)/g, '\\frac{$1}');

  // 1.5. Fix double braces inside subscripts (e.g. x_{\{\frac{n+1}{2}\}} -> x_{\frac{n+1}{2}}, x_{\{\frac{n}{2} + 1\}} -> x_{\frac{n}{2}+1})
  s = s.replace(/_\{\s*\\\{/g, '_{');
  s = s.replace(/_\{\s*\{(\\frac\{[^{}]*\}\{[^{}]*\})\s*\}\}/g, '_{$1}');
  s = s.replace(/_\{\s*\{(\\frac\{[^{}]*\}\{[^{}]*\})\s*([\+\-\*\/])\s*([a-zA-Z0-9_]+)\s*\}\}/g, '_{$1 $2 $3}');
  s = s.replace(/_\{\s*\{(\\frac\{[^{}]*\}\{[^{}]*\})\}/g, '_{$1}');
  s = s.replace(/_\{\s*\\text\{/g, '_{\\text{');

  // 1.55. Heal nested fractions missing closing brace of numerator before denominator: \frac{3 - \frac{2}{n}{4 + \frac{5}{n}} -> \frac{3 - \frac{2}{n}}{4 + \frac{5}{n}}
  s = s.replace(/\\frac\s*\{([^{}\n\$]+?\\frac\s*\{[^{}]+\}\s*\{[^{}]+\})\s*\{/g, '\\frac{$1}{');

  // 1.6 Fix dollar signs trapped inside \frac{...}{...}, \sqrt{...}, \vec{...}
  s = s.replace(/\\frac\{([^{}]*)\$([^{}]*)\}\{([^{}]*)\}/g, '\\frac{$1$2}{$3}');
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\$([^{}]*)\}/g, '\\frac{$1}{$2$3}');
  s = s.replace(/\\sqrt\{([^{}]*)\$([^{}]*)\}/g, '\\sqrt{$1$2}');
  s = s.replace(/\\vec\{([^{}]*)\$([^{}]*)\}/g, '\\vec{$1$2}');

  // 2. Fix sub/superscript brackets when opening brace is missing: u_n + 1} -> u_{n+1}, u_k - 1} -> u_{k-1}
  s = s.replace(/\b([uSa-zA-Z])_([a-zA-Z0-9]+)\s*\+\s*(\d+)\}/g, '$1_{$2+$3}');
  s = s.replace(/\b([uSa-zA-Z])_([a-zA-Z0-9]+)\s*-\s*(\d+)\}/g, '$1_{$2-$3}');
  s = s.replace(/\b([uSa-zA-Z])_\{([a-zA-Z0-9]+)\}\s*-\s*(\d+)\}/g, '$1_{$2-$3}');
  s = s.replace(/\b([uSa-zA-Z])_\{([a-zA-Z0-9]+)\}\s*\+\s*(\d+)\}/g, '$1_{$2+$3}');

  // 3. Fix space after backslash in arrows: \ Leftrightarrow -> \Leftrightarrow, \ Rightarrow -> \Rightarrow
  s = s.replace(/\\\s+(Leftrightarrow|Rightarrow|Leftarrow|iff|implies)\b/gi, '\\$1');
  s = s.replace(/\\(Leftrightarrow|Rightarrow|Leftarrow)([a-zA-Z0-9_]+)/g, '\\$1 $2');

  // 4. Fix 'e' or 'dưóin' typos in OCR / math generation: dưóin \ge 2 -> với n \ge 2
  s = s.replace(/\bdưóin\s*\\ge\b/gi, 'với $n \\ge$');
  s = s.replace(/\bdưóin\b/gi, 'với');
  s = s.replace(/(\d+)\s+e\s+(\d+)/g, '$1 \\neq $2');
  s = s.replace(/(\d+(?:[.,]\d+)?\\text\{[^{}]*\})\s+e\s+(\d+)/g, '$1 \\neq $2');

  // 5. Fix option dollars at start of option text: $B. 2; 4; 8; 16; 32. -> B. $2; 4; 8; 16; 32.$
  s = s.replace(/(?:^|\n)\s*\$([A-D])[\.\):]\s*([^$\n]+)/g, (_m, letter, optText) => {
    let clean = optText.trim();
    if (!clean.endsWith('$')) clean = `$${clean}$`;
    else clean = `$${clean}`;
    return `${letter}. ${clean}`;
  });

  // 6. Fix "Chọn: $**B**.$" or "Chọn C.$" or "Chọn: **A**. \end{cases} $" in solutions
  s = s.replace(/Chọn[:\s]*\$?\s*\*+\s*([A-D])\s*\*+\s*\$?[\.\$]*/gi, '**Chọn $1.**');
  s = s.replace(/Chọn\s+([A-D])\.\$/gi, '**Chọn $1.**');
  s = s.replace(/Chọn[:\s]*([A-D])\b[^\n]*\\end\{cases\}[^\n]*/gi, '**Chọn $1.**');

  return s;
}

/**
 * Bỏ hoàn toàn phần BẢNG ĐÁP ÁN NHANH khỏi Phiếu học tập theo yêu cầu của giáo viên,
 * chỉ giữ lại HƯỚNG DẪN GIẢI CHI TIẾT.
 */
export function stripQuickAnswerSection(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  let s = text;
  // Chỉ bóc khối BẢNG ĐÁP ÁN NHANH khi phía sau có HƯỚNG DẪN GIẢI / LỜI GIẢI CHI TIẾT, tuyệt đối không xóa tới cuối tài liệu ($)
  s = s.replace(/(?:(?:###|##|#|\*\*)\s*)?(?:---\s*)?BẢNG\s*ĐÁP\s*ÁN(?:\s*NHANH)?(?:\s*---)?(?:\*\*)?[\s\S]*?(?=(?:(?:###|##|#|\*\*)\s*)?(?:HƯỚNG\s*DẪN\s*(?:CHẤM|GIẢI)|LỜI\s*GIẢI\s*CHI\s*TIẾT|ĐÁP\s*ÁN\s*(?:VÀ|&)\s*HƯỚNG\s*DẪN\s*GIẢI))/gi, '');
  return s.trim();
}

/**
 * Chuẩn hóa và làm sạch BẢNG ĐÁP ÁN NHANH trong phần Lời giải/Đáp án
 * Biến các đường ống raw pipes '|' bị rách thành Bảng Markdown Table phẳng đẹp mắt
 */
export function formatQuickAnswerTables(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  if (!/BẢNG\s*ĐÁP\s*ÁN/i.test(text)) return text;

  // Always fix column numbering in header row '| Câu | 1 | 2 | ... |'
  let cleanText = text.replace(/(\|\s*Câu\s*\|)([\s\d\|]+)(\|)/gi, (_m, prefix, body) => {
    const cols = body.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2 && cols.every(c => /^\d+$/.test(c))) {
      const fixedCols = cols.map((_, idx) => `${idx + 1}`).join(' | ');
      return `${prefix} ${fixedCols} |`;
    }
    return _m;
  });

  return cleanText.replace(/(BẢNG\s*ĐÁP\s*ÁN(?:\s*NHANH)?[\s\S]*?)(?=(?:---+|\n\s*#{1,3}\s+)?\s*(?:HƯỚNG\s*DẪN\s*GIẢI|LỜI\s*GIẢI\s*CHI\s*TIẾT|\n\s*#{1,3}\s+)|$)/i, (ansBlock) => {
    let b = ansBlock;
    b = b.replace(/^[ \t]*\|[ \t]*$/gm, '');
    b = b.replace(/^[ \t]*Câu\s*\d+\s*:\s*\|[ \t]*$/gm, '');
    b = b.replace(/\\begin\s*\{matrix\}[\s\S]*?\\end\s*\{matrix\}/gi, '');

    // 1. Format PHẦN I Quick Answer Table
    b = b.replace(/(PHẦN\s*I\b[\s\S]*?)(?=PHẦN\s*II|PHẦN\s*III|PHẦN\s*IV|HƯỚNG\s*DẪN|LỜI\s*GIẢI|##|$)/i, (partIMatch) => {
      const letters: string[] = [];
      const itemRegex = /(?:Câu\s*)?(\d+)\s*[:.\-\s|]*\b([A-D])\b/gi;
      let m: RegExpExecArray | null;
      while ((m = itemRegex.exec(partIMatch)) !== null) {
        letters.push(m[2].toUpperCase());
      }
      
      let finalLetters = letters;
      if (finalLetters.length < 2) {
        const matches = partIMatch.match(/\b[A-D]\b/g) || [];
        finalLetters = matches.map(a => a.replace(/[\$\*\s]+/g, '').toUpperCase());
      }

      if (finalLetters.length >= 2) {
        const cleanAns = finalLetters.slice(0, 12).map(a => a.replace(/[\$\*\s]+/g, ''));
        const headerRow = '| Câu | ' + cleanAns.map((_, i) => `${i + 1}`).join(' | ') + ' |';
        const alignRow = '|:---:|' + cleanAns.map(() => ':---:').join('|') + '|';
        const ansRow = '| Chọn | ' + cleanAns.map(a => `**${a}**`).join(' | ') + ' |';
        return `PHẦN I\n\n${headerRow}\n${alignRow}\n${ansRow}\n\n`;
      }
      return partIMatch;
    });

    // 2. Format PHẦN II Quick Answer Table
    b = b.replace(/(PHẦN\s*II\b[\s\S]*?)(?=PHẦN\s*III|PHẦN\s*IV|HƯỚNG\s*DẪN|LỜI\s*GIẢI|##|$)/i, (partIIMatch) => {
      const qBlocks = partIIMatch.split(/(?=(?:^|\n)\s*(?:\*\*)?Câu\s*\d+)/i).filter(bl => /Câu\s*\d+/i.test(bl));
      
      if (qBlocks.length > 0) {
        const questionsData: { num: number; a: string; b: string; c: string; d: string }[] = [];
        
        qBlocks.forEach((qText, idx) => {
          const numMatch = qText.match(/Câu\s*(\d+)/i);
          const qNum = numMatch ? parseInt(numMatch[1], 10) : (idx + 1);

          const getVal = (letter: string) => {
            const r = new RegExp(`(?:^|[\\s|,\\[(])${letter}[\\):.\\-\\s]+(?<![a-zA-Z0-9À-ỹ])([ĐS]|Đúng|Sai)(?![a-zA-Z0-9À-ỹ])`, 'i');
            const found = qText.match(r);
            if (found) {
              return found[1].toUpperCase().startsWith('Đ') ? 'Đ' : 'S';
            }
            return 'Đ';
          };

          questionsData.push({
            num: qNum,
            a: getVal('a'),
            b: getVal('b'),
            c: getVal('c'),
            d: getVal('d')
          });
        });

        if (questionsData.length >= 1) {
          const headers = '| Câu | ' + questionsData.map((_, idx) => `${idx + 1}`).join(' | ') + ' |';
          const aligns = '| :---: | ' + questionsData.map(() => ':---:').join(' | ') + ' |';
          const rowA = '| a | ' + questionsData.map(q => q.a).join(' | ') + ' |';
          const rowB = '| b | ' + questionsData.map(q => q.b).join(' | ') + ' |';
          const rowC = '| c | ' + questionsData.map(q => q.c).join(' | ') + ' |';
          const rowD = '| d | ' + questionsData.map(q => q.d).join(' | ') + ' |';

          return `PHẦN II\n\n${headers}\n${aligns}\n${rowA}\n${rowB}\n${rowC}\n${rowD}\n\n`;
        }
      }

      return partIIMatch;
    });

    // 3. Format PHẦN III Quick Answer Table
    b = b.replace(/(PHẦN\s*III\b[\s\S]*?)(?=PHẦN\s*IV|HƯỚNG\s*DẪN|LỜI\s*GIẢI|##|$)/i, (partIIIMatch) => {
      let cleanPart3 = partIIIMatch;
      cleanPart3 = cleanPart3.replace(/^[ \t]*[•*]\s*$/gm, '');
      cleanPart3 = cleanPart3.replace(/^[ \t]*Câu\s*\d+\s*:\s*\|[ \t]*$/gm, '');

      const numbers: string[] = [];
      const itemRegex = /(?:Câu\s*)?(\d+)\s*[:.\-\s|]*(-?\d+(?:(?:[.,]|\{,\})\d+)?|-?\d+\/\d+)/gi;
      let m: RegExpExecArray | null;
      while ((m = itemRegex.exec(cleanPart3)) !== null) {
        numbers.push(m[2].replace(/\{,\}/g, ','));
      }

      if (numbers.length < 2) {
        const valRegex = /(?:^|[|:\s])\s*(-?\d+(?:(?:[.,]|\{,\})\d+)?|-?\d+\/\d+)\s*(?=[|\s]|$)/g;
        while ((m = valRegex.exec(cleanPart3)) !== null) {
          const val = m[1].replace(/\{,\}/g, ',');
          if (!['1', '2', '3', '4', '5', '6'].includes(val) || numbers.length >= 6) {
            numbers.push(val);
          }
        }
      }

      if (numbers.length >= 1) {
        const cleanNums = numbers.slice(0, 6).map(n => n.replace(/^['"]+|['"]+$/g, ''));
        const headers = '| Câu | ' + cleanNums.map((_, i) => `${i + 1}`).join(' | ') + ' |';
        const aligns = '| :---: | ' + cleanNums.map(() => ':---:').join(' | ') + ' |';
        const ansRow = '| Đáp án | ' + cleanNums.map(n => `**${n}**`).join(' | ') + ' |';
        return `PHẦN III\n\n${headers}\n${aligns}\n${ansRow}\n\n`;
      }

      cleanPart3 = cleanPart3.replace(/(Câu\s*\d+)\s*:\s*(\d+(?:[.,]\d+)?)/gi, '**$1:** $2');
      return cleanPart3;
    });

    return b;
  });
}


/**
 * Làm sạch công thức toán, tự động giải phóng các khối $$ bọc lầm tiêu đề,
 * loại bỏ ký tự rác \{=, \left[\right., và cứu chữ tiếng Việt bị nhốt trong $...$
 */
export function cleanMathAndUnwrapHeadings(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  let s = sanitizeSvgOrHtmlForReact(text);

  // 0. Gỡ bỏ thụt lề 4+ khoảng trắng / tab (gây indented <pre><code> trong CommonMark) ngoài các khối ```fenced```
  const fencedBlocks: string[] = [];
  s = s.replace(/```[\s\S]*?```/g, (m) => {
    fencedBlocks.push(m);
    return `\uE000FENCE_${fencedBlocks.length - 1}\uE001`;
  });
  s = s.replace(/^[ \t]{4,}(?=[-*+•]\s|\d+\.\s)/gm, '  ');
  s = s.replace(/^[ \t]{2,8}(?![-*+•]\s|\d+\.\s)/gm, '');
  s = s.replace(/\uE000FENCE_(\d+)\uE001/g, (_m, idx) => fencedBlocks[Number(idx)] || '');

  // 0.0005 Chuẩn hóa dấu đô la thừa (vd: $$$ -> $, $$$$ -> $$); tuyệt đối KHÔNG xóa $\n$ hay $ $ giữa 2 công thức
  s = s.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');
  s = s.replace(/^[ \t]*\$\$[ \t]*\$\$[ \t]*$/gm, '');
  s = s.replace(/(?<!\$)\$\$[ \t]+\$\$(?!\$)/g, '');

  // 0.001 Dọn dẹp khoảng trắng rác trong lệnh TeX (\ begin{cases}, \ end{cases}, \\ end{cases}, endcases, begincases)
  s = s.replace(/(?<!\\)\b(endcases|begincases)\b/gi, '\\$1');
  s = s.replace(/\\{2,}\s*end\s*\{\s*cases\s*\}/gi, '\\end{cases}');
  s = s.replace(/\\?\s*end\s*\{\s*cases\s*\}/gi, '\\end{cases}');
  s = s.replace(/\\?\s*begin\s*\{\s*cases\s*\}/gi, '\\begin{cases}');
  s = s.replace(/\\+\s*(begin|end)\s*\{\s*(cases|aligned|array|matrix|pmatrix|bmatrix)\*?\}/gi, '\\$1{$2}');
  s = s.replace(/(\\end\{cases\})(?:\s*\\?\s*end\{cases\})+/gi, '$1');
  s = s.replace(/(\\begin\{cases\})(?:\s*\\?\s*begin\{cases\})+/gi, '$1');
  s = s.replace(/(?:\\\\|\s)+\\end\{cases\}/gi, ' \\end{cases}');
  s = s.replace(/\\begin\s*\{cases\*?\}\s*(?:\\\\|\s)*\\end\s*\{cases\*?\}/gi, '');

  // 0.0015 Chuẩn hóa các mũi tên suy luận TeX bị double backslash
  s = s.replace(/\\{2,}(Leftarrow|Rightarrow|Leftrightarrow|iff|implies)\b/gi, '\\$1');

  // 0.002 Loại bỏ các dòng rác chứa duy nhất dấu $ mồ côi
  s = s.replace(/^[ \t]*\$[ \t]*$/gm, '');

  // 0.003 Khôi phục \cdot viết thiếu backslash (vd: 5cdot33 -> 5 \cdot 33, 2cdot3 -> 2 \cdot 3)
  s = s.replace(/(\d+|[a-zA-Z\)\}])\s*\\?cdot\s*(\d+|[a-zA-Z\(\{])/g, '$1 \\cdot $2');
  s = s.replace(/(?<!\\)\bcdot\b/g, '\\cdot');

  // 0.005 Khôi phục các lệnh LaTeX bị rách hoặc biến dạng thành |vec{ hoặc \ vec{
  s = s.replace(/\|vec\s*\{/g, '\\vec{');
  s = s.replace(/\\\s+vec\s*\{/g, '\\vec{');
  s = s.replace(/(?<!\\)\bvec\s*\{/g, '\\vec{');

  // Khôi phục |sqrt{ và \ sqrt{
  s = s.replace(/\|sqrt\s*\{/g, '\\sqrt{');
  s = s.replace(/\\\s+sqrt\s*\{/g, '\\sqrt{');

  // Khôi phục |cos( và \ cos(
  s = s.replace(/\|cos\s*\(/g, '\\cos(');
  s = s.replace(/\\\s+cos\s*\(/g, '\\cos(');
  s = s.replace(/\|(sin|tan|cot|lim|ln|log)\s*\(/g, '\\$1(');

  // 0.007 Gộp dấu sao bị cách rời: * * -> ** và chuẩn hóa tiêu đề quy tắc **...:**
  s = s.replace(/\*\s+\*/g, '**');
  s = s.replace(/\*\*\s+([^*]+?)\s*:\s*\*\*/g, '**$1:**');

  // Chuẩn hóa tên hình học có dấu chấm (ví dụ ABCD.A'B'C'D' hoặc S.ABCD -> $ABCD.A'B'C'D'$, $S.ABCD$)
  // CHỈ chạy ngoài các cặp $...$/$$...$$, KHÔNG có khoảng trắng sau dấu chấm, và BẮT BUỘC có ít nhất 1 chữ cái in hoa sau dấu chấm (tránh match nhầm "A. 90^\circ")
  const geomDotParts = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g);
  for (let gi = 0; gi < geomDotParts.length; gi += 2) {
    if (!geomDotParts[gi]) continue;
    geomDotParts[gi] = geomDotParts[gi].replace(
      /(?<![\$\wÀ-ỹ])([A-Z]{1,6}\.(?=[A-Z0-9']*[A-Z])[A-Z0-9']{2,16})(?![\$\wÀ-ỹ])/g,
      '$$$1$$'
    );
  }
  s = geomDotParts.join('');

  // 0.008 Bổ sung dấu đóng ngoặc nhọn } cho \vec{...} bị thiếu dấu } trước dấu chấm câu
  s = s.replace(/\\vec\s*\{([A-Za-z]{1,4})\./g, '\\vec{$1}');

  // Sửa lỗi \vec{AC$; hoặc \vec{CB$.$ hoặc \vec{AC . hoặc \vec{AC'S.
  s = s.replace(/\$\\vec\{([A-Za-z0-9_'\^]{1,6})\$;/g, '$\\vec{$1}$;');
  s = s.replace(/\\vec\{([A-Za-z0-9_'\^]{1,6})\$\.\$/g, '\\vec{$1}$.');
  s = s.replace(/\\vec\s*\{([A-Za-z0-9_'\^]+?)S\.(?=\s|[.,;!?]|$)/g, '\\vec{$1}');
  s = s.replace(/\\vec\s*\{([A-Za-z0-9_'\^]+?)\.(?=\s|[.,;!?]|$)/g, '\\vec{$1}');
  s = s.replace(/(\\vec\{[^{}]+\})\s*[\.S]\s*(?=\s|[=+\-]|$)/g, '$1 ');
  s = s.replace(/(?<![\$\w])\$([A-Z]{2,6})\s*\\(Rightarrow|Leftrightarrow|Leftarrow)/g, '$$$1 \\$2$$');

  // Chuẩn hóa quy tắc hình học tiếng Việt bị dính chữ
  s = s.replace(/Q\s*u\s*y\s*t\s*ắ\s*c\s*h\s*ì\s*n\s*h\s*b\s*ì\s*n\s*h\s*h\s*à\s*n\s*h/gi, 'Quy tắc hình bình hành');
  s = s.replace(/Q\s*u\s*y\s*t\s*ắ\s*c\s*h\s*ì\s*n\s*h\s*h\s*ộ\s*p/gi, 'Quy tắc hình hộp');
  s = s.replace(/Q\s*u\s*y\s*t\s*ắ\s*c\s*b\s*a\s*đ\s*i\s*ể\s*m/gi, 'Quy tắc ba điểm');
  s = s.replace(/Q\s*u\s*y\s*t\s*ắ\s*c\s*t\s*r\s*u\s*n\s*g\s*đ\s*i\s*ể\s*m/gi, 'Quy tắc trung điểm');
  s = s.replace(/l\s*à\s*h\s*ì\s*n\s*h\s*b\s*ì\s*n\s*h\s*h\s*à\s*n\s*h/gi, 'là hình bình hành');
  s = s.replace(/l\s*à\s*h\s*ì\s*n\s*h\s*h\s*ộ\s*p/gi, 'là hình hộp');

  // 0.009 Chuẩn hóa các điểm hình học có dấu phẩy/nháy đơn ($A'$, $B'$, $C'$, $D'$), chỉ chạy ngoài $...$/$$...$$
  const primeParts = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g);
  for (let pi = 0; pi < primeParts.length; pi += 2) {
    if (!primeParts[pi]) continue;
    primeParts[pi] = primeParts[pi].replace(/(?<![\$\wÀ-ỹ])\b([A-Z])'(?!\s*[A-Z]'?\s*(?:=|<|>|\\le|\\ge))([,;\s\.\)\]]|$)/g, '$$$1\'$$$2');
  }
  s = primeParts.join('');

  // 0.01 Sửa lỗi thiếu ngoặc đóng chỉ số dưới: S_{15 = \frac{...} -> S_{15} = \frac{...}, u_{12 = u_1 -> u_{12} = u_1
  s = s.replace(/([uSa-zA-Z])_\{(\d{1,3})\s*=\s*/g, '$1_{$2} = ');
  s = s.replace(/([uSa-zA-Z])_\{(\d{1,3})\s*([\+\-\*\/])/g, '$1_{$2} $3 ');
  s = s.replace(/([uSa-zA-Z])_\{(\d{1,3})\s+(\\frac|\\cdot|[a-zA-Z]{2,})/g, '$1_{$2} $3');

  // 0.015 Vá lỗi rách cú pháp phân số \frac:
  // a) Tự động sửa {frac{a}{b}} -> \frac{a}{b}, {frac{ và |frac{ và frac{ thành \frac{
  s = s.replace(/\{frac\s*(\{(?:[^{}]|\{[^{}]*\})*\}\s*\{(?:[^{}]|\{[^{}]*\})*\})\}/g, '\\frac$1');
  s = s.replace(/[\{\|]frac\s*\{/g, '\\frac{');
  s = s.replace(/(?<!\\)\bfrac\s*\{/g, '\\frac{');
  // b) Khôi phục dấu } bị mất ở tử số của phân số phức hợp: \frac{3 - \frac{2}{n}{4 + \frac{5}{n}} -> \frac{3 - \frac{2}{n}}{4 + \frac{5}{n}}
  s = s.replace(/\\frac\s*\{([^{}\n\$]+?\\frac\s*\{[^{}]+\}\s*\{[^{}]+\})\s*\{/g, '\\frac{$1}{');
  // c) Tự động bù dấu đóng ngoặc } cho phân số nếu cuối biểu thức bị thiếu ngay trước $ hoặc $$ hoặc cuối dòng (chỉ khi tổng số { lớn hơn })
  s = s.replace(/(\\frac\s*\{(?:[^{}]|\{[^{}]*\})*\}\s*\{[^{}\n\$]+?)(?=\s*(?:\$\$?|[\r\n]|$))/g, (m) => {
    const opens = (m.match(/\{/g) || []).length;
    const closes = (m.match(/\}/g) || []).length;
    return opens > closes ? m + '}'.repeat(opens - closes) : m;
  });

  // 0.016 Tự động tách dòng cho các mục Tóm tắt kiến thức / Lý thuyết (- **...:**) khi bị dính trên cùng 1 dòng
  // Lưu ý: chỉ dùng [ \t]* (không nuốt \n) và không khớp ký tự đầu dòng là dấu gạch đầu dòng '-' để không tạo dòng trống thừa
  s = s.replace(/([^\n\-*•–—\u2022\s])[ \t]*(?:[-*•–—]|\u2022)?[ \t]*(\*\*\s*(?:Định\s*nghĩa|Khái\s*niệm|Số\s*hạng\s*tổng\s*quát|Tính\s*chất|Tổng\s*\$?n\$?\s*số\s*hạng|Quy\s*tắc|Công\s*thức|Định\s*lý|Hệ\s*thức|Chú\s*ý|Nhận\s*xét|Ví\s*dụ|Lưu\s*ý)[^*:]*?:\s*\*\*)/gi, '$1\n- $2');
  s = s.replace(/([^\n\-*•–—\u2022\s])[ \t]+[-*•–—][ \t]*(\*\*[^*:]+?:\s*\*\*)/g, '$1\n- $2');
  s = s.replace(/([^\n\-*•–—\u2022\s])[ \t]*(?:[-*•–—]|\u2022)[ \t]*(\*\*\s*[^:*]+?:\s*\*\*)/g, '$1\n- $2');
  // Xóa các dòng chỉ có dấu bullet trống mồ côi đứng trước dòng bullet kế tiếp
  s = s.replace(/^[ \t]*[-*•●][ \t]*\r?\n+(?=[ \t]*[-*•●]\s)/gm, '');
  // Khôi phục công thức $q \n \neq 1$ bị ngắt dòng nhầm bên trong dấu $
  s = s.replace(/\\n\s+\\neq\b/g, '\\neq');
  s = s.replace(/\$([^$\n]*?)[ \t]*[\r\n]+[ \t]*(\\(?:neq|ne|le|ge|leq|geq)\b[^$\n]*?)\$/g, '$$$1 $2$$');
  // Sửa lỗi chính tả tiêu đề TRỌNG TẮM -> TRỌNG TÂM
  s = s.replace(/TRỌNG\s*T(?:Ắ|Ằ|Ẳ|Ẵ|Ặ|Ă|Ấ|Ầ|Ẩ|Ẫ|Ậ)M/gi, 'TRỌNG TÂM');
  s = s.replace(/trọng\s*t(?:ắ|ằ|ẳ|ẵ|ặ|ă)m/g, 'trọng tâm');

  // 0.018 Loại bỏ các đoạn suy luận nháp, tự kiểm tra đề bài, câu "xin lỗi, đáp án đúng là..." và tự động đồng bộ lại Đúng/Sai:
  s = s.replace(/^([ \t]*(?:[-*]\s*)?\*{0,2}[a-d]\)\s*)(Đúng|Sai|Đ|S)(?=\s|\()([^\n]*?),\s*(?:xin\s*lỗi|nhầm|đính\s*chính|sửa\s*lại|thực\s*ra)[^\)\n]*?(?:ý\s*[a-d]\s+|mệnh\s*đề\s+|phát\s*biểu\s+)(sai|đúng)[^\)\n]*(?=\))/gim, (_m, prefix, oldVerdict, exprPart, trueVerdict) => {
    const isShort = oldVerdict.length === 1;
    const isCorrectedTrue = /^đúng$/i.test(trueVerdict);
    const finalVerdict = isShort ? (isCorrectedTrue ? 'Đ' : 'S') : (isCorrectedTrue ? 'Đúng' : 'Sai');
    return `${prefix}${finalVerdict}${exprPart}`;
  });
  s = s.replace(/,\s*(?:xin\s*lỗi|đính\s*chính|nhầm\s*lẫn|sửa\s*lại)[^\)\n\$]*(?=\))/gi, '');
  s = s.replace(/(?:\(|\[)?\s*(?:Kiểm\s*tra\s*lại(?:\s*đề)?|Xem\s*lại\s*tính\s*chất|Đính\s*chính(?:\s*:\s*Chọn\s*[A-D])?|Chỉnh\s*số\s*liệu|vô\s*lý\s*nếu\s*số\s*nguyên|đề\s*gốc\s*phương\s*án\s*[A-D]\s*là|nhưng\s*thực\s*ra\s*u_1\s*\+\s*d\s*>\s*0)[^\)\n\$]*?(?:\)|\])?/gi, '');
  s = s.replace(/(?:^|\n)\s*(?:Kiểm\s*tra\s*:|Nếu\s*u_1\s*=\s*\d+,\s*S_\d+\$\$)[^\n]*/gi, '');

  // 0.02 Sửa gạch chéo ngược dư thừa trong số có 3 chữ số phần ngàn: 100\ 000 -> 100 000, 1\ 600 -> 1 600, 30\ 000 -> 30 000
  s = s.replace(/(\d{1,3})\s*\\\s*(\d{3})\b/g, '$1 $2');
  s = s.replace(/(\d{1,3})\s*\\\s*(\d{1,3})\b/g, '$1 $2');

  // 0.03 Sửa 3+ gạch chéo ngược: \\\ frac -> \frac, \\\ Rightarrow -> \Rightarrow, \\\ end{cases} -> \end{cases}
  s = s.replace(/\\{3,}\s*(frac|sqrt|begin|end|Rightarrow|Leftrightarrow|Leftarrow|iff|implies|cdot|text|quad|qquad|in|notin|le|ge|leq|geq|neq|sin|cos|tan|cot|lim|ln|log|mathbb|circ|dots|cdots|ldots)\b/gi, '\\$1');
  s = s.replace(/\\{3,}/g, '\\\\');

  // 0.04 Tự động bổ sung khoảng trắng giữa từ tiếng Việt và số dính liền (có25 -> có 25, 30số -> 30 số, sau14ngày -> sau 14 ngày)
  s = s.replace(/\b(gồm|có|và|cắt|nối)\s*(\d+)(điểm|cạnh|mặt|đỉnh|đoạn)\b/gi, '$1 $2 $3');
  s = s.replace(/\b(\d+)(điểm|cạnh|mặt|đỉnh|đoạn|thẳng)\b/gi, '$1 $2');
  s = s.replace(/\b(đáy\s*lớn|đáy\s*nhỏ|cạnh|mặt|tam\s*giác|tứ\s*diện)([A-Z]{2,4})\b/gi, '$1 $2');
  s = s.replace(/\b(hình\s*thang)(với:)/gi, '$1 $2');
  s = s.replace(/\b(song\s*song)(với:)/gi, '$1 $2');
  s = s.replace(/\b(với|phân\s*biệt)([A-Za-z0-9_\^]+)/gi, '$1 $2');
  s = s.replace(/\b(có|với|sau|trước|khoảng|thứ|hơn|bằng|còn|được|gồm|chạy)(\d+)\b/gi, '$1 $2');
  s = s.replace(/\b(\d+)(số|ngày|ghế|khách|đồng|mét|lần|khúc|hàng|triệu|năm|tháng|tuần|giờ|phút|giây)\b/gi, '$1 $2');

  // 0.045 Tách các nhãn câu bị dính chùm:
  // - **Câu 6:** * **Câu 7:**
  // - **Đáp số: 200****Câu 2.** hoặc **...****Câu 2:**
  // - ... kết thúc câu (., !, ?, $, **) ngay trước **Câu 2.** / **Bài 2.** (chỉ ngoài $...$/$$...$$ và ngoài dòng bảng |...|)
  s = s.replace(/(\*\*(?:Câu|Bài)\s*\d+[:\.]?\*\*)\s*[\*•-]\s*(\*\*(?:Câu|Bài)\s*\d+[:\.]?\*\*)/gi, '$1\n\n$2');
  const qSplitParts = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g);
  for (let qi = 0; qi < qSplitParts.length; qi += 2) {
    if (!qSplitParts[qi]) continue;
    qSplitParts[qi] = qSplitParts[qi]
      .split('\n')
      .map((line) => {
        if (/^[ \t]*\|/.test(line)) {
          return line.replace(/(?<=\|[ \t]*)'(-?\d+(?:[.,]\d+)?)'(?=[ \t]*\|)/g, '$1');
        }
        let l = line.replace(/\*{3,4}[ \t]*((?:Câu|Bài)\s*\d+[ \t]*[:\.])/gi, '**\n\n**$1');
        l = l.replace(/([^\n*])\*{2}[ \t]*\*{2}[ \t]*((?:Câu|Bài)\s*\d+[ \t]*[:\.])/gi, '$1**\n\n**$2');
        l = l.replace(/([.!?)\]$])[ \t]*(\*{1,2}(?:Câu|Bài)\s*\d+[ \t]*[:\.]\*{0,2})/gi, '$1\n\n$2');
        return l;
      })
      .join('\n');
  }
  s = qSplitParts.join('');

  // 0.05 Dọn dẹp cases / endcases / begincases mồ côi hoặc dính khoảng trắng (\ end{cases}, \\ end{cases})
  s = s.replace(/\\+\s*(begin|end)\s*\{\s*(cases|aligned|array|matrix|pmatrix|bmatrix)\*?\}/gi, '\\$1{$2}');
  s = s.replace(/(\\end\{cases\})(?:\s*\\?\s*end\{cases\})+/gi, '$1');
  s = s.replace(/(\\begin\{cases\})(?:\s*\\?\s*begin\{cases\})+/gi, '$1');
  s = s.replace(/(?:\\\\|\s)+\\end\{cases\}/gi, '\\end{cases}');
  s = s.replace(/\\begin\s*\{cases\*?\}\s*(Vì\s+[^\}\n]+?)\\end\s*\{cases\*?\}/gi, '$1');

  // 0.06 Chuẩn hóa BẢNG ĐÁP ÁN NHANH (chỉ thao tác trong section BẢNG ĐÁP ÁN, không chạm vào PHẦN I đề bài)
  s = formatQuickAnswerTables(s);

  // 0.1 Gỡ bỏ khoảng trắng cách chữ trong các tiêu đề/thuật ngữ tiếng Việt bị phân tách sai
  s = s.replace(/T\s*ổ\s*n\s*g\s*n\s*s\s*ố\s*h\s*ạ\s*n\s*g\s*đ\s*ầ\s*u\s*t\s*i\s*ê\s*n/gi, 'Tổng n số hạng đầu tiên');
  s = s.replace(/c\s*ấ\s*p\s*s\s*ố\s*c\s*ộ\s*n\s*g/gi, 'cấp số cộng');
  s = s.replace(/c\s*ô\s*n\s*g\s*s\s*a\s*i/gi, 'công sai');
  s = s.replace(/l\s*ậ\s*p\s*t\s*h\s*à\s*n\s*h\s*c\s*ấ\s*p\s*s\s*ố\s*c\s*ộ\s*n\s*g/gi, 'lập thành cấp số cộng');
  s = s.replace(/đ\s*ề\s*g\s*ố\s*c\s*p\s*h\s*ư\s*ơ\s*n\s*g\s*á\s*n/gi, 'đề gốc phương án');
  s = s.replace(/K\s*i\s*ể\s*m\s*t\s*r\s*a/gi, 'Kiểm tra');

  // 1. Loại bỏ các khối math rỗng trên cùng dòng (KHÔNG xóa xuống dòng giữa hai công thức)
  s = s.replace(/^[ \t]*\$\$[ \t\r\n]*\$\$[ \t]*$/gm, '');
  s = s.replace(/You can't use 'macro parameter character #' in math mode/gi, '');
  s = s.replace(/Extra\s*close\s*brace\s*or\s*missing\s*open\s*brace/gi, '');
  s = s.replace(/Math\s*output\s*error/gi, '');

  // 2. Tự động giải phóng các khối $$ vô tình bọc các tiêu đề Markdown, tiêu đề phần, câu hỏi, hoặc đoạn văn tiếng Việt nhiều dòng
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (fullMatch, body) => {
    const strippedText = body.replace(/\\text\{[^{}]*\}/g, '');
    const vnLetters = (strippedText.match(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi) || []).length;
    if (
      /(?:#{1,6}\s+|(?:\*{0,2})(?:Câu|Bài)\s*\d+[:\.]?|PHẦN\s*(?:[1-4]|I{1,3}|IV)|^\s*[-*]\s+\*\*[A-D]\.\*\*|^\s*[a-d]\)|\n\s*\n)/m.test(body) ||
      vnLetters > 20
    ) {
      return body.replace(/\$\$/g, '');
    }
    return fullMatch;
  });

  // 2.5 Gỡ $$ mồ côi đứng đầu dòng văn bản tiếng Việt nếu tổng số $$ bị lẻ hoặc không có $$ đóng trên dòng
  const allDoubleDollars = s.match(/\$\$/g) || [];
  if (allDoubleDollars.length % 2 !== 0) {
    s = s.replace(/^[ \t]*\$\$(?=[ \t]*(?:Trong\s+đó|Với|Khi|Từ|Để|Gọi|Xét|Ta\s+có|Phương\s+pháp|Các\s+trường|Mô\s+hình|[A-ZÀ-Ỹ][a-zà-ỹ]+\s+[a-zà-ỹ]+))/gm, '');
  }

  // 3. Chuẩn hóa hệ phương trình \begin{cases} ... \end{cases} thành 1 dòng chuẩn
  s = s.replace(/\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\}/gi, (match) => {
    let clean = match.replace(/(?<!\\)\$/g, '');
    clean = clean.replace(/(?<!\\)\\(?=\s*(?:\r?\n|$))/g, ' \\\\ ');
    clean = clean.replace(/\\{3,}/g, ' \\\\ ');
    clean = clean.replace(/\\\\(?:\s*\\\\)+/g, ' \\\\ ');
    clean = clean.replace(/\\\\(?=\s*\\end\{cases)/gi, ' ');
    clean = clean.replace(/\\?\{\s*=/g, ' =');
    clean = clean.replace(/\\?\{\s*([0-9a-zA-Z_\-+\=]+)\s*=/g, '$1 =');
    const innerMatch = clean.match(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/i);
    if (innerMatch) {
      const rows = innerMatch[1].split(/(?:\\\\|\n+)/).map((l: string) => l.trim()).filter(Boolean);
      if (rows.length >= 1) {
        return `\\begin{cases} ${rows.join(' \\\\ ')} \\end{cases}`;
      }
    }
    return clean;
  });
  // b) Bọc $ hoặc $$ nếu \begin{cases} đứng trần ngoài math: chỉ quét các đoạn NGOÀI $...$ / $$...$$
  const caseParts = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g);
  for (let i = 0; i < caseParts.length; i += 2) {
    if (caseParts[i] && caseParts[i].includes('\\begin')) {
      caseParts[i] = caseParts[i].replace(/(?<!\$)(?:\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\}(?:\s*(?:\\Leftrightarrow|\\Leftarrow|\\Rightarrow|\\iff|\\implies|<=>|=>)\s*\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})*)(?!\$)/gi, (match, offset) => {
        const lineStart = caseParts[i].lastIndexOf('\n', offset - 1) + 1;
        const beforeOnLine = caseParts[i].slice(lineStart, offset).trim();
        if (beforeOnLine.length > 0) {
          return `$${match.trim()}$`;
        }
        return `\n\n$$\n${match.trim()}\n$$\n\n`;
      });
    }
  }
  s = caseParts.join('');

  // Gộp các khối display math liên tiếp ngăn cách bởi mũi tên tương đương thành một khối thống nhất
  s = s.replace(/\$\$\s*(\\Leftrightarrow|\\Leftarrow|\\Rightarrow|\\iff|\\implies|<=>|=>)\s*\$\$/g, ' \\\\ $1 ');
  s = fixAndMergeMathArrows(s);

  // Sửa lỗi rách mẫu số cấp số nhân: \frac{u_1(1-q^n)}{1} - q} -> \frac{u_1(1-q^n)}{1-q}
  s = s.replace(/\\frac\s*\{\s*u_?1\s*\(\s*1\s*-\s*q\s*\^?\s*\{?n\}?\s*\)\s*\}\s*\{\s*1\s*\}\s*-\s*q\s*\}/g, '\\frac{u_1(1-q^n)}{1-q}');
  s = s.replace(/\\frac\s*\{\s*u_?1\s*\(\s*q\s*\^?\s*\{?n\}?\s*-\s*1\s*\)\s*\}\s*\{\s*1\s*\}\s*-\s*q\s*\}/g, '\\frac{u_1(q^n-1)}{q-1}');
  s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{\s*1\s*\}\s*-\s*q\s*\}/gi, '\\frac{$1}{1-q}');
  s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{\s*q\s*\}\s*-\s*1\s*\}/gi, '\\frac{$1}{q-1}');
  s = s.replace(/\{\s*1\s*\}\s*-\s*q\s*\}/g, '{1 - q}');
  s = s.replace(/\{\s*q\s*\}\s*-\s*1\s*\}/g, '{q - 1}');

  // 4. Loại bỏ các ký hiệu ngoặc rác \left[ \right. hoặc \left. \right.
  s = s.replace(/\\left\s*\[\s*\\right\s*\./gi, ' ');
  s = s.replace(/\\left\s*\.\s*\\right\s*\./gi, ' ');
  s = s.replace(/\\left\s*\[\s*\\right\s*\]/gi, ' ');

  // 4.1 Khôi phục ngoặc nhọn đóng } bị thiếu ngay trước $ cho \vec{... và chữa lành lỗi rách ngoặc S_{\Delta} ABC} -> S_{\Delta ABC}, 8^} 2} -> 8^2}
  s = s.replace(/(\\vec\{[A-Za-z0-9_'\^]+?)\s*\$/g, '$1}$');
  s = s.replace(/\\le\s+ft\b/g, '\\left');
  s = s.replace(/([SV]_\{\\Delta)\}\s*([A-Z]+)\}/g, '$1 $2}');
  s = s.replace(/([SV]_\{[^{}]+)\}\s*([A-Z']{2,6})\}/g, '$1 $2}');
  s = s.replace(/\^\}\s*(\d+)\}/g, '^$1}');

  // 4.2 Khắc phục lỗi rách ngoặc trong \sqrt{...} và \frac{...}{...} (ví dụ: \sqrt{1} + 9 + 4} -> \sqrt{1 + 9 + 4}, \frac -1+5}{2} -> \frac{-1+5}{2})
  s = s.replace(/\\sqrt\s*\{([^{}\$\n]+)\}\s*((?:[\+\-]\s*[0-9a-zA-Z_\^\(\)]+\s*)+)\}/g, '\\sqrt{$1 $2}');
  s = s.replace(/\\frac\s+([\+\-]?[0-9a-zA-Z_\^\(\)\+\-\s]+)\}\s*\{([^{}\$\n]+)\}/g, '\\frac{$1}{$2}');
  s = s.replace(/\\frac\s*\{([^{}\$\n]+)\}\s+([\+\-]?[0-9a-zA-Z_\^\(\)\+\-\s]+)\}/g, '\\frac{$1}{$2}');

  // 5. Giải cứu chữ tiếng Việt bị nhốt trong cặp dấu $...$
  s = s.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (fullMatch, inner) => {
    const vietnamesePhraseRegex = /(lập\s*thành\s*cấp\s*số\s*cộng|đều\s*dương|loại\s*vì|các\s*số\s*hạng|kiểm\s*tra\s*lại|kết\s*quả|loại\s*do|nhưng\s*thực\s*ra)/i;
    if (vietnamesePhraseRegex.test(inner)) {
      let clean = inner;
      clean = clean.replace(/(lập\s*thành\s*cấp\s*số\s*cộng|đều\s*dương|loại\s*vì|các\s*số\s*hạng|kiểm\s*tra\s*lại|kết\s*quả|loại\s*do|nhưng\s*thực\s*ra)/gi, '$ $1 ');
      clean = clean.replace(/\b(với|khi|thì|do\s+đó)\b/gi, '$ $1 ');
      if (clean !== inner) {
        return `$${clean.trim()}`.replace(/\$\$/g, '').replace(/\$\s*\$/g, '');
      }
    }
    return fullMatch;
  });

  let out = fixAndMergeMathArrows(s);
  out = out.replace(
    /\$\$([\s\S]*?)\$\$[ \t\r\n]*([.,;])(?!(?:\.|[0-9a-zA-Zà-ỹÀ-Ỹ]))(?=[ \t]*(?:\r?\n|$))/g,
    (fullMatch, body: string, punct: string) => {
      const trimmed = body.trim();
      if (!trimmed) return fullMatch;
      const isDisplayBlock =
        trimmed.includes('\n') ||
        /\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)/i.test(trimmed) ||
        /\\left\s*\[/.test(trimmed);
      if (!isDisplayBlock && !fullMatch.includes('\n')) {
        return `$$${trimmed}${/[.,;]$/.test(trimmed) ? '' : punct}$$`;
      }
      const nextBody = /[.,;]$/.test(trimmed) ? trimmed : `${trimmed}${punct}`;
      return `\n\n$$\n${nextBody}\n$$\n\n`;
    }
  );
  return out;
}

const GM_LATEX_CMD_ATOM = `\\\\[a-zA-Z]+(?:\\[[^\\]]*\\])?(?:\\{(?:[^{}]|\\{[^{}]*\\})*\\}){0,3}`;
const GM_NON_SPACE_MATH_ATOM = `(?:${GM_LATEX_CMD_ATOM}|[0-9a-zA-Z_{}()\\[\\]+\\-*/^=><,.'|]+)+`;
const GM_ARROW_EXPR_REGEX = new RegExp(
  `(?:\\\\(Rightarrow|Leftrightarrow|Leftarrow|iff|implies)|=>|<=>)\\s*(${GM_NON_SPACE_MATH_ATOM}(?:\\s+(?!\\\\(?:Rightarrow|Leftrightarrow|Leftarrow|iff|implies)\\b|=>|<=>|[A-ZÀ-Ỹ][a-zà-ỹ]{2,}|Đáp\\b|Kết\\b|Với\\b|Trong\\b)${GM_NON_SPACE_MATH_ATOM}){0,16})`,
  'g'
);

const GM_BRACE3 = `\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*\\}`;
const GM_D_ATOM = `(?:\\\\[a-zA-Z]+(?:\\[[^\\]]*\\])?(?:\\{(?:[^{}]|\\{[^{}]*\\})*\\}){0,3}|[0-9a-zA-Z_{}()\\[\\]+\\-*/^=><,.'|]+)+`;
const GM_D_ARROW = `\\\\(?:Rightarrow|Leftarrow|Leftrightarrow|iff|implies)`;
const GM_D_CHAIN_REGEX = new RegExp(
  `(?<![\\$\\\\\\wÀ-ỹ])(${GM_D_ATOM}(?:\\s+${GM_D_ATOM}){0,12}\\s*${GM_D_ARROW}(?:\\s*${GM_D_ATOM}(?:\\s+(?!${GM_D_ARROW}|[A-ZÀ-Ỹ][a-zà-ỹ]{2,}|được\\b|là\\b|tính\\b|theo\\b|bằng\\b|với\\b|khi\\b|thì\\b|tại\\b|trong\\b|ta\\b|Đáp\\b|Kết\\b)${GM_D_ATOM}){0,12}){1,6})`,
  'g'
);

const GM_NORM_TERM = `(?:\\\\left\\s*)?(?:\\||\\\\vert)\\s*(?:\\\\left\\s*\\[[^\\]\\n\\$]+\\\\right\\s*\\]|\\[[^\\]\\n\\$]+\\]|\\\\(?:vec|overrightarrow)\\s*${GM_BRACE3}|[A-Za-z0-9_']+)\\s*(?:\\\\right\\s*)?(?:\\||\\\\vert)(?:\\^\\s*(?:${GM_BRACE3}|[0-9]+))?`;
const GM_CROSS_TERM = `(?:\\\\left\\s*)?\\[\\s*\\\\(?:vec|overrightarrow)\\s*${GM_BRACE3}\\s*[,;]\\s*\\\\(?:vec|overrightarrow)\\s*${GM_BRACE3}\\s*(?:\\\\right\\s*)?\\]`;
const GM_TEX_CMD_TERM = `(?:[0-9]+\\s*)?\\\\(?:frac\\s*${GM_BRACE3}\\s*${GM_BRACE3}|sqrt(?:\\[[^\\]]*\\])?\\s*${GM_BRACE3}|(?:vec|overrightarrow|widehat)\\s*${GM_BRACE3}|(?:sin|cos|tan|cot|arcsin|arccos|arctan|ln|log|lim)\\s*(?:(?:_(?:${GM_BRACE3}|[A-Za-z0-9.,]+)|\\^\\s*(?:${GM_BRACE3}|[A-Za-z0-9\\-+]+))){0,2}(?:\\s*\\([^()\\n\\$]*\\)|\\s*\\\\(?:varphi|phi|alpha|beta|gamma|theta|pi|widehat\\s*${GM_BRACE3})\\b|\\s*[A-Za-z0-9]+)?|(?:cdot|times|le|ge|leq|geq|neq|ne|approx|pi|infty|alpha|beta|gamma|varphi|phi|theta|Delta|Sigma|pm|mp|circ|perp|parallel)\\b)`;
const GM_PAREN_TERM = `\\((?!\\s*[A-D]\\.\\s)[^()\\n\\$]*\\)(?:[\\^_](?:${GM_BRACE3}|[A-Za-z0-9]+))?`;
const GM_ID_TERM = `[A-Za-z0-9_']+(?:,[0-9]+)?(?:[\\^_](?:${GM_BRACE3}|\\\\circ\\b|[A-Za-z0-9]+)){1,4}|[A-Za-z0-9_']+(?:,[0-9]+)?`;
const GM_TEX_ATOM = `(?:${GM_NORM_TERM}|${GM_CROSS_TERM}|${GM_TEX_CMD_TERM}|${GM_PAREN_TERM}|${GM_ID_TERM})`;
const GM_TEX_BIN_OP = `(?:\\s*(?:=|\\\\le|\\\\ge|\\\\neq|\\\\ne|\\\\approx|<=|>=|<|>|\\+|\\-|\\*|/|\\\\cdot|\\\\times|\\\\perp|\\\\parallel)\\s*)`;
const GM_VN_STOP_WORDS = `(?:Với|Kết|Đáp|Tìm|Cho|Biết|Tính|Gọi|Vậy|Nên|Suy|Do|Khi|Từ|Theo|Trong|và|với|khi|thì|tại|trong|ta|được|là|nếu|theo|cùng|hay|hoặc|cho|tìm|tính|biết|bằng)\\b`;
const GM_VN_ACCENTED_WORD = `[a-zA-ZÀ-ỹ]*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ][a-zA-ZÀ-ỹ]*`;
const GM_FULL_EQ_SIGNAL = /\\(?:frac|sqrt|cdot|times|vec|overrightarrow|widehat|le|ge|leq|geq|neq|ne|pi|infty|alpha|beta|varphi|phi|theta|cos|sin|tan|cot|arcsin|arccos|arctan|log|ln|lim|circ|pm|mp|perp|parallel)|[\^_]/;
const GM_FULL_EQ_REGEX = new RegExp(`(?<![\\$\\\\\\wÀ-ỹ])(?!\\d+\\.\\s)(${GM_TEX_ATOM}(?:${GM_TEX_BIN_OP}${GM_TEX_ATOM}|\\s+(?!${GM_VN_STOP_WORDS}|${GM_VN_ACCENTED_WORD})${GM_TEX_ATOM}){0,16})(?=[;!?\\)]|\\.\\s|\\.$|,\\s|\\s+(?:${GM_VN_STOP_WORDS}|${GM_VN_ACCENTED_WORD})|\\n|$)`, 'g');

const GM_FRAC_BRACE3_REGEX = new RegExp(`(?<!\\$)\\\\frac${GM_BRACE3}${GM_BRACE3}(?!\\$)`, 'g');
const GM_SQRT_BRACE3_REGEX = new RegExp(`(?<!\\$)\\\\sqrt(?:\\[[^\\]]*\\])?${GM_BRACE3}(?!\\$)`, 'g');

const GM_VEC_ATOM = `(?:(?:\\\\left\\s*)?(?:\\||\\\\vert)\\s*(?:\\\\left\\s*\\[[^\\]\\n\\$]+\\\\right\\s*\\]|\\[[^\\]\\n\\$]+\\]|\\\\(?:vec|overrightarrow)\\{[^{}]+\\})\\s*(?:\\\\right\\s*)?(?:\\||\\\\vert)|(?:\\\\left\\s*)?\\[\\s*\\\\(?:vec|overrightarrow)\\{[^{}]+\\}\\s*[,;]\\s*\\\\(?:vec|overrightarrow)\\{[^{}]+\\}\\s*(?:\\\\right\\s*)?\\]|\\\\(?:vec|overrightarrow)\\{[^{}]+\\}|\\\\cdot|\\\\times|\\\\frac${GM_BRACE3}${GM_BRACE3}|\\\\sqrt${GM_BRACE3}|[0-9a-zA-Z()+\\-=.,;'/^_\\{\\}]+)+`;
const GM_VEC_EXPR_REGEX = new RegExp(`(?<![\\$\\\\\\w])(${GM_VEC_ATOM}(?:\\s+(?!với\\b|khi\\b|thì\\b|tại\\b|trong\\b|ta\\b|được\\b|là\\b|nếu\\b|theo\\b|và\\b|bằng\\b|cùng\\b|đồng\\b|vuông\\b)${GM_VEC_ATOM}){0,16})(?=[;!?]|\\.\\s|\\.$|\\s+(?:với|khi|thì|tại|trong|ta|được|là|nếu|theo|và|bằng|cùng|đồng|vuông)|\\n|$)`, 'g');

const GM_SEQ_ATOM = `(?:\\\\(?:dots|cdots|ldots|frac\\{[^{}]*\\}\\{[^{}]*\\})|[0-9a-zA-Z()\\[\\]{}+\\-*/^_.]+)+`;
const GM_SEQ_REGEX = new RegExp(`(?<![\\$\\\\\\w])\\b([uS]_(?:[a-zA-Z0-9]+|\\{[^}]+\\})\\s*=\\s*${GM_SEQ_ATOM}(?:\\s+(?!được\\b|là\\b|tính\\b|theo\\b|bằng\\b|với\\b|khi\\b|thì\\b|tại\\b|trong\\b|ta\\b|đáp\\b|công\\b|sai\\b|số\\b|[A-D][.:)])${GM_SEQ_ATOM}){0,16})(?=[,;!?]|\\s+(?:được|là|tính|theo|bằng|với|khi|thì|tại|trong|ta(?:\\s+được)?|đáp\\s+án|công|sai|số|[A-D][\\.:\\)])|\\n|$)(?!\\$)`, 'g');

export function fixAndMergeMathArrows(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  if (!/(?:\\(?:RightArrow|LeftArrow|Leftarrow|Rightarrow|Leftrightarrow|iff|implies)|=>|<=>|Đáp\s*số|Đáp\s*án)/i.test(text)) {
    return text;
  }
  let s = text;

  // 1. Chuẩn hóa các biến thể viết hoa hoặc double backslash
  s = s.replace(/\\RightArrow\b/g, '\\Rightarrow');
  s = s.replace(/\\LeftArrow\b/g, '\\Leftarrow');
  s = s.replace(/\\{2,}(Leftarrow|Rightarrow|Leftrightarrow|iff|implies)\b/gi, '\\$1');

  // 2. Gộp các khối math cạnh nhau được nối bởi mũi tên suy luận / tương đương thành một khối thống nhất:
  // $A$ $\Rightarrow$ $B$ -> $A \Rightarrow B$
  // $A$ \Rightarrow $B$ -> $A \Rightarrow B$
  // $A$ \Leftrightarrow $B$ -> $A \Leftrightarrow B$
  let prev = '';
  let mergeIter1 = 0;
  while (prev !== s && mergeIter1++ < 20) {
    prev = s;
    s = s.replace(/\$([^\$\n]+?)\$\s*(?:\\(Rightarrow|Leftrightarrow|Leftarrow|iff|implies)|\$\s*\\(Rightarrow|Leftrightarrow|Leftarrow|iff|implies)\s*\$|<=>|=>)\s*\$([^\$\n]+?)\$/g, (_m, a, arrow1, arrow2, b) => {
      const arr = arrow1 || arrow2;
      const cleanArrow = arr ? `\\${arr}` : (_m.includes('<=>') ? '\\Leftrightarrow' : '\\Rightarrow');
      return `$${a.trim()} ${cleanArrow} ${b.trim()}$`;
    });
  }

  // 3 & 4. Chỉ bọc suy diễn / mũi tên ở các đoạn NGOÀI $...$ / $$...$$ (không bao giờ cắt ngang công thức đã bọc $...$)
  const arrowExprRegex = GM_ARROW_EXPR_REGEX;
  const segs34 = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
  for (let i = 0; i < segs34.length; i += 2) {
    if (!segs34[i]) continue;
    let seg = segs34[i];
    // 3. Bọc chuỗi biến đổi suy ra / tương đương trần chưa có $
    seg = seg.replace(/((?:^|[:.?!]|\s)(?:Ta có|Suy ra|Do đó|Khi đó|Vậy|Đúng\.|Sai\.|Đúng|Sai)[:\s]*)([a-zA-Z0-9_\{\}\(\)\[\]\+\-\*\/\^\=\s\.\,\;\\|]+?\\(?:Rightarrow|Leftrightarrow|Leftarrow|iff|implies)[a-zA-Z0-9_\{\}\(\)\[\]\+\-\*\/\^\=\s\.\,\;\\|]+?)(?=(?:\.\s+[A-ZÀ-Ỹ]|\.\s*$|\.\s*\n|\s*\((?:là|với|điều)|Đáp\s*số|\n|$))/gi, (_m, lead, math) => {
      let clean = math.trim().replace(/\$+$/, '').replace(/^\$+/, '');
      if (!clean || clean.includes('$')) return _m;
      return `${lead}$${clean}$`;
    });
    // 4. Nếu mũi tên đứng cạnh biểu thức toán chưa bọc $
    seg = seg.replace(arrowExprRegex, (_m, arrow, expr) => {
      const cleanArrow = arrow ? `\\${arrow}` : (_m.includes('<=>') ? '\\Leftrightarrow' : '\\Rightarrow');
      let cleanExpr = (expr || '').trim();
      const hasTrailingDot = cleanExpr.endsWith('.');
      cleanExpr = cleanExpr.replace(/\.+$/, '');
      if (!cleanExpr || cleanExpr.includes('$')) return _m;
      if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanExpr.replace(/\\text\{[^{}]*\}/g, ''))) {
        return _m;
      }
      return `$${cleanArrow} ${cleanExpr}$${hasTrailingDot ? '.' : ''}`;
    });
    segs34[i] = seg;
  }
  s = segs34.join('');

  // 5. Nếu còn bất kỳ mũi tên suy luận trần nào hoàn toàn đứng một mình NGOÀI $: bọc $\Rightarrow$
  const parts = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i]) {
      parts[i] = parts[i].replace(/(?<![\$\\\w])(\\RightArrow|\\Rightarrow|\\Leftrightarrow|\\Leftarrow|\\iff|\\implies)(?![\$\w])/g, '$$$1$$');
    }
  }
  s = parts.join('');

  // 6. Gộp lại các khối math liền kề trên CÙNG DÒNG (chỉ dùng [ \t]*, không nuốt \n):
  prev = '';
  let mergeIter2 = 0;
  while (prev !== s && mergeIter2++ < 20) {
    prev = s;
    s = s.replace(/(?<!\$)\$([^\$\n]+?)\$(?!\$)[ \t]*(?<!\$)\$[ \t]*\\(Rightarrow|Leftrightarrow|Leftarrow|iff|implies)[ \t]*\$(?!\$)[ \t]*(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, (_m, a, arrow, b) => {
      return `$${a.trim()} \\${arrow} ${b.trim()}$`;
    });
    s = s.replace(/(?<!\$)\$([^\$\n]+?)\$(?!\$)[ \t]*\\(Rightarrow|Leftrightarrow|Leftarrow|iff|implies)[ \t]*(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, (_m, a, arrow, b) => {
      return `$${a.trim()} \\${arrow} ${b.trim()}$`;
    });
    s = s.replace(/(?<!\$)\$([^\$\n]+?)\$(?!\$)[ \t]*(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, (_m, a, b) => {
      if (
        /\\(?:Rightarrow|Leftrightarrow|Leftarrow|iff|implies)\s*$/.test(a) ||
        /^\s*\\(?:Rightarrow|Leftrightarrow|Leftarrow|iff|implies)\b/.test(b)
      ) {
        return `$${a.trim()} ${b.trim()}$`;
      }
      return _m;
    });
  }

  // 7. Bọc số trong "Đáp số: 4." hoặc "Đáp án: 4." thành "Đáp số: $4$."
  s = s.replace(/(\b(?:Đáp\s*số|Đáp\s*án)\s*:\s*)([+\-]?(?:\d+(?:[.,]\d+)?|\b[a-zA-Z]\b))(?!\$)(?=[.,;!?\s]|$)/gi, '$1$$$2$$');

  return s;
}

/**
 * Tiền xử lý triệt để công thức Toán LaTeX và ký tự xuống dòng:
 * 1. Thay thế toàn bộ chuỗi escaped literal \n hoặc \\n thành ký tự xuống dòng thực tế.
 * 2. Tách các câu văn dính liền sau dấu chấm hoặc công thức toán.
 * 3. Loại bỏ ký tự rác hoặc dấu gạch ngang dính liền vào công thức (như --- hoặc SS_n = -).
 * 4. Quét và tự động bọc dấu $ vào các khối công thức toán bị thiếu delimiters (\frac, \sqrt, u_n, S_n...).
 */
export function sanitizeLatexMathAndDelimiters(raw: string): string {
  if (!raw) return '';
  let s = cleanMathAndUnwrapHeadings(String(raw));

  // 1. Xử lý triệt để ký tự escaped literal \n hoặc \\n bị in thô trên giao diện
  // Tuyệt đối KHÔNG biến các lệnh TeX bắt đầu bằng \n (\ne, \neq, \notin, \nexists, \nearrow, \nabla, \nu, \natural...) thành xuống dòng!
  s = s.replace(/\\\\n(?![a-zA-Z])/g, '\n');
  s = s.replace(/\\n(?![a-zA-Z])/g, '\n');
  // Chữa lành trường hợp \ne đã bị tách thành xuống dòng + e trước đó (vd: \vec{a} \n e \vec{0})
  s = s.replace(/(\\(?:vec|overrightarrow)\{[^{}]+\}|[a-zA-Z0-9\)\}\]])[ \t]*[\r\n]+[ \t]*e[ \t]+(\\(?:vec|overrightarrow)\{[^{}]+\}|0\b)/g, '$1 \\neq $2');

  // 2. Tách các câu văn dính liền sau dấu chấm (chỉ chạy ngoài $...$/$$...$$ và không phá tên hình học như S.ABCD)
  const dotParts = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g);
  for (let di = 0; di < dotParts.length; di += 2) {
    if (!dotParts[di]) continue;
    dotParts[di] = dotParts[di].replace(/([a-zà-ỹ\)\]\$])\.([A-ZÀ-Ỹ])/g, '$1. $2');
  }
  s = dotParts.join('');

  // 3. Loại bỏ ký tự rác hoặc dấu gạch ngang dính liền vào công thức (--- hoặc SS_n = -)
  s = s.replace(/\bSS_([a-zA-Z0-9]+|\{[^}]+\})/g, 'S_$1');
  s = s.replace(/\buu_([a-zA-Z0-9]+|\{[^}]+\})/g, 'u_$1');
  s = s.replace(/(?:^|\n)\s*(?:---|--)\s*([a-zA-ZÀ-ỹ])/g, '\n- $1');
  s = s.replace(/(?<=\$\$|\$)\s*---+\s*$/gm, '');
  s = s.replace(/\s*---\s*$/gm, '');
  s = s.replace(/-\s*--\s*(?=\$\$|\$|\n|$)/g, '');
  s = s.replace(/([uSxya-zA-Z]\b|S_|u_)\s*=\s*-\s*(?=[a-zA-Z0-9])/g, '$1 = -');

  // Standardize capitalized TeX arrow aliases and fix double backslashes
  s = s.replace(/\\RightArrow\b/g, '\\Rightarrow');
  s = s.replace(/\\LeftArrow\b/g, '\\Leftarrow');
  s = s.replace(/\\{2,}(Leftarrow|Rightarrow|Leftrightarrow|iff|implies)\b/gi, '\\$1');
  // Chuẩn hóa và gộp các mũi tên suy luận / tương đương thành công thức LaTeX hoàn chỉnh
  s = fixAndMergeMathArrows(s);
  s = s.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');

  // Clean orphan artifacts and MathJax raw error strings
  s = s.replace(/You can't use 'macro parameter character #' in math mode/gi, '');
  s = s.replace(/(?:^|\n)\s*(?:SS|S)?0?\s*\$\.\s*/gi, '\n');
  s = s.replace(/(?:^|\n)\s*SS0\.\s*\*{0,2}Câu\s*\d+:?\*{0,2}SS\s*/gi, '\n');
  s = s.replace(/(?:^|\n)\s*d\$\.\s*/gi, '\n');

  // Đảm bảo các tiêu đề câu hỏi **Câu X:** trong lời giải được ngắt dòng riêng biệt (KHÔNG cắt trong bảng Markdown |...| và KHÔNG cắt sau dấu bullet •/-/*)
  s = s.split('\n').map((line) => {
    if (/^\s*\|/.test(line)) return line;
    return line.replace(/([^\n\-*•●+])\s+(\*{0,2}Câu\s*\d+[:\.]?\*{0,2})/gi, '$1\n\n$2');
  }).join('\n');

  // 3.4. Giải cứu thẻ <br/> nếu bị nhốt bên trong cặp dấu $...$
  s = s.replace(/(?<!\$)\$(?!\$)([^\$\n]*?<br\s*\/?>[^\$\n]*?)(?<!\$)\$(?!\$)/gi, (_m, inner) => {
    return inner
      .split(/<br\s*\/?>/i)
      .map((seg: string) => {
        const cleanSeg = seg.trim();
        if (!cleanSeg) return '';
        if (/^[A-ZÀ-Ỹa-zà-ỹ\s:,;.]+$/.test(cleanSeg)) return cleanSeg;
        return `$${cleanSeg}$`;
      })
      .filter(Boolean)
      .join(' <br/> ');
  });

  // 3.5. Giải phóng các khối $$ vô tình bọc trần toàn bộ câu hỏi hoặc nhiều tiêu đề/mục nhỏ hoặc văn bản tiếng Việt
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (fullMatch, body) => {
    const stripped = body.replace(/\\text\{[^{}]*\}/g, '');
    const vnCount = (stripped.match(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi) || []).length;
    if (/(?:\*\*(?:Câu|Bài)\s*\d+:?\*\*|#{1,4}\s*PHẦN|^\s*[-*]\s+[a-d]\)|^\s*[a-d]\)|\n\s*\n)/m.test(body) || vnCount > 20) {
      return body.replace(/\$\$/g, '');
    }
    return fullMatch;
  });

  // 3.6. Chuyển đổi hệ phương trình trần dạng { eq1 \n { eq2 thành \begin{cases} eq1 \\ eq2 \end{cases}
  s = s.replace(/(?:(?:^|\n)\s*\\?\{\s*[^{}\n]+=[^\n]+){2,}/g, (match) => {
    const eqLines = match.trim().split('\n').map(l => l.replace(/^\s*\\?\{\s*/, '').trim()).filter(Boolean);
    if (eqLines.length >= 2) {
      return `\n\n$$\\begin{cases} ${eqLines.join(' \\\\ ')} \\end{cases}$$\n\n`;
    }
    return match;
  });

  // 4. Quét và tự động bọc dấu $ vào các khối công thức toán học bị thiếu delimiters
  const parts = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g);
  for (let i = 0; i < parts.length; i++) {
    // Chỉ xử lý các đoạn nằm NGOÀI cặp dấu $ (chỉ số chẵn)
    if (i % 2 === 0 && parts[i]) {
      let p = parts[i];
      const mathTokens: string[] = [];
      const saveMath = (expr: string) => {
        mathTokens.push(expr);
        return `\x02MATH${mathTokens.length - 1}\x03`;
      };

      // Bảo vệ toàn bộ thẻ HTML (<br/>, <strong>, <b>, <em>, <u>...) để TUYỆT ĐỐI không bị nhận nhầm là toán tử < và >
      p = p.replace(/<(?:br\s*\/?|\/?(?:strong|b|i|em|u|sub|sup|span|div|p)\b[^>\n]*)>/gi, (m) => saveMath(m));

      // d. Bọc chuỗi biến đổi suy ra / tương đương (sử dụng regex precompiled có giới hạn lặp tránh ReDoS)
      if (/\\(?:Rightarrow|Leftarrow|Leftrightarrow|iff|implies)/.test(p)) {
        p = p.replace(GM_D_CHAIN_REGEX, (match) => {
          let clean = match.trim().replace(/\.+$/, '');
          if (!clean || clean.includes('$')) return match;
          if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean.replace(/\\text\{[^{}]*\}/g, ''))) return match;
          return saveMath(`$${clean}$`);
        });
      }

      // Auto-wrap standalone \Rightarrow or \Leftrightarrow or \to lines
      if (/\\(?:RightArrow|Rightarrow|Leftrightarrow|Leftarrow|iff|implies|to|rightarrow)/.test(p)) {
        p = p.replace(/(?<![\$\w])(\\RightArrow|\\Rightarrow|\\Leftrightarrow|\\Leftarrow|\\iff|\\implies|\\to\b|\\rightarrow\b)(?![\$\w])/g, (m) => saveMath(`$${m}$`));
      }

      // a. Bọc chuỗi cases liên tiếp hoặc đơn lẻ
      if (p.includes('\\begin')) {
        p = p.replace(/(?<!\$)(?:(?:\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})(?:\s*\\(?:Leftrightarrow|Rightarrow|Leftarrow|iff|implies)\s*\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})+)(?!\$)/g, (m) => saveMath(`\n\n$$\n${m.trim()}\n$$\n\n`));
        p = p.replace(/(?<!\$)(?:\\begin\s*\{(?:cases|aligned|matrix|pmatrix|bmatrix)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|matrix|pmatrix|bmatrix)\*?\})(?!\$)/g, (m, offset) => {
          const lineStart = p.lastIndexOf('\n', offset - 1) + 1;
          const beforeOnLine = p.slice(lineStart, offset).trim();
          if (beforeOnLine.length > 0) {
            return saveMath(`$${m.trim()}$`);
          }
          return saveMath(`\n\n$$\n${m.trim()}\n$$\n\n`);
        });
      }

      // b. Bọc Tích phân, Đạo hàm, Giới hạn, Tổng, Tích
      if (p.includes('\\int')) {
        p = p.replace(/(?<![\$\\\w])(\\int(?:_\{[^{}]*\}|\^\{[^{}]*\}|_[a-zA-Z0-9\-+\\infty]+|\^[a-zA-Z0-9\-+\\infty]+)*[^\n$]*?(?:d[xtus\theta]|\\mathrm\{d\}[xtus]))/g, (match) => {
          if (match.includes('$')) return match;
          return saveMath(`$${match.trim()}$`);
        });
      }
      p = p.replace(/(?<![\$\\\w])(\\frac\{d[a-zA-Z]?\}\{d[a-zA-Z]\}|\\frac\{\\partial[^{}]*\}\{\\partial[^{}]*\}|[a-zA-Z]\s*'\s*\([a-zA-Z0-9]+\)|[a-zA-Z]\s*''\s*\([a-zA-Z0-9]+\)|[yfg]\s*''?)(?![a-zA-Z0-9\$\}])/g, (match) => {
        if (match.includes('$')) return match;
        return saveMath(`$${match.trim()}$`);
      });
      if (/\\(?:lim|sum|prod)\b/.test(p)) {
        p = p.replace(/(?<![\$\\\w])(\\(?:lim|sum|prod)(?:_\{[^{}]*\}|\^\{[^{}]*\}|_[a-zA-Z0-9\-+\\infty]+|\^[a-zA-Z0-9\-+\\infty]+)+[^\n,$;!?]*?)(?=[,;!?]|\s+(?:được|là|tính|theo|bằng|với|khi|thì|tại|trong|ta)|\n|$)/g, (match) => {
          if (match.includes('$')) return match;
          return saveMath(`$${match.trim()}$`);
        });
      }

      // b5. Bọc trọn vẹn phương trình / biểu thức toán dài chưa có $ chứa \frac, \sqrt, \cdot, \times, |\vec{...}|, lượng giác, góc độ, ^, _
      if (GM_FULL_EQ_SIGNAL.test(p)) {
        p = p.replace(GM_FULL_EQ_REGEX, (match) => {
          const clean = match.trim().replace(/\.+$/, '');
          if (!clean || clean.includes('$') || clean.includes('\x02MATH')) return match;
          if (/\b[A-D]\.\s/.test(clean)) return match;
          if (!GM_FULL_EQ_SIGNAL.test(clean)) return match;
          if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean.replace(/\\text\{[^{}]*\}/g, ''))) {
            return match;
          }
          const trailingDot = match.endsWith('.') ? '.' : '';
          return saveMath(`$${clean}$`) + trailingDot;
        });
      }

      // Bọc phương trình so sánh đơn giản có 2 vế như n=4, x>0, B'(x, 0) đứng trần
      p = p.replace(/(?<![\$\\\wÀ-ỹ])([a-zA-Z]\s*'\s*\([a-zA-Z0-9,\s]+\)|[a-zA-Z]\s*(?:=|>|<)\s*-?\d+(?:[.,]\d+)?)(?=[,.;:!?\s\)]|$)/g, (match) => {
        const clean = match.trim();
        if (clean.includes('$') || clean.includes('\x02MATH')) return match;
        return saveMath(`$${clean}$`);
      });

      // c. Bọc biểu thức chứa \frac{...}{...} hoặc \sqrt{...} còn sót (hỗ trợ 3 tầng ngoặc nhọn lồng nhau)
      if (p.includes('\\frac')) {
        p = p.replace(GM_FRAC_BRACE3_REGEX, (match) => saveMath(`$${match}$`));
      }
      if (p.includes('\\sqrt')) {
        p = p.replace(GM_SQRT_BRACE3_REGEX, (match) => saveMath(`$${match}$`));
      }

      // c1. Bọc biểu thức chứa vector (\vec{...} hoặc \overrightarrow{...}) kể cả tích có hướng \left[\vec{a}, \vec{b}\right] và độ dài |\vec{AB}| = ...
      if (p.includes('\\vec{') || p.includes('\\overrightarrow{')) {
        p = p.replace(GM_VEC_EXPR_REGEX, (match) => {
          if (!match.includes('\\vec{') && !match.includes('\\overrightarrow{')) return match;
          let clean = match.trim().replace(/\.+$/, "");
          if (!clean || clean.includes('$')) return match;
          if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean.replace(/\\text\{[^{}]*\}/g, ''))) return match;
          return saveMath(`$${clean}$`);
        });
      }

      // e. Bọc biểu thức cấp số cộng / cấp số nhân / dãy số (u_n = ..., S_n = ...) không bị ngắt ở dấu ba chấm
      if (/[uS]_/.test(p)) {
        p = p.replace(GM_SEQ_REGEX, (match) => {
          let clean = match.trim();
          if (clean.includes('$')) return match;
          return saveMath(`$${clean}$`);
        });
      }

      // f. Bọc các biến dãy số đơn lẻ u_1, u_2, (u_n), S_n hoặc có chỉ số ngoặc nhọn u_{10}, S_{10}, u_{n+1} ngoài công thức
      p = p.replace(/(?<![\$\\\w])(\(?[uS]_(?:[0-9a-zA-Z]+|\{[^{}]+\})\)?)(?![\$\w\{\}\+\-])/g, (match) => saveMath(`$${match}$`));

      // g. Bọc các hệ thức so sánh / tập hợp: x \in \mathbb{R}, a \le b, x \ge 0, a \ne b (dừng trước thẻ HTML, dấu ngoặc tiếng Việt hoặc chữ có dấu)
      p = p.replace(/(?<![\$\\\w])\b([a-zA-Z0-9_']+(?:\([a-zA-Z0-9_']+\))?\s*(?:\\in|\\notin|\\le|\\ge|\\ne|\\subset)\s*[^,\n\.\;<(\x02àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+)(?!\$)/g, (match) => saveMath(`$${match.trim()}$`));

      // h. Bọc các ký hiệu toán đơn lẻ bị trần: \infty, \pi, \alpha, \beta, \varphi, \phi, \theta, \Delta, \circ (TUYỆT ĐỐI không bọc khi đang nằm trong ngoặc nhọn {...} như S_{\Delta ABC})
      p = p.replace(/(?<![\$\\\w\{])\\(?:alpha|beta|gamma|delta|pi|theta|varphi|phi|sigma|omega|Delta|Sigma|infty|pm|mp|circ)\b(?![\$\}])/g, (match, offset) => {
        const before = p.slice(Math.max(0, offset - 15), offset);
        if (/\{[^{}]*$/.test(before)) return match;
        return saveMath(`$${match}$`);
      });

      // Khôi phục tất cả các khối toán đã được bọc an toàn (giải nén triệt để nếu có lồng nhau, giới hạn số vòng lặp)
      let mathUnpackIter = 0;
      while (/\x02MATH\d+\x03/.test(p) && mathUnpackIter++ < 10) {
        p = p.replace(/\x02MATH(\d+)\x03/g, (_, idx) => mathTokens[Number(idx)] ?? '');
      }

      parts[i] = p;
    }
  }
  s = parts.join('');

  // 5. Gộp các khối $$ hoặc $ liền kề nhau được nối bởi dấu tương đương / suy ra
  s = s.replace(/\$\$\s*(\\Leftrightarrow|\\Rightarrow|\\Leftarrow|=|\\iff)\s*\$\$/g, ' \\\\ $1 ');
  s = fixAndMergeMathArrows(s);

  // 6. Triệt tiêu 100% lỗi lồng dấu $ bên trong khối $$...$$ hoặc $...$
  s = s.replace(/(\$\$[\s\S]*?\$\$)/g, (match) => {
    const inner = match.slice(2, -2);
    return `$$${inner.replace(/(?<!\\)\$/g, '')}$$`;
  });
  s = s.replace(/(\$[^\$\n]+?\$)/g, (match) => {
    const inner = match.slice(1, -1);
    return `$${inner.replace(/(?<!\\)\$/g, '')}$`;
  });

  // 7. Trên các dòng bảng Markdown (| ... |), thay thế ký tự | nằm trong $...$ (như |\vec{a}|, \left|...\right|) bằng \vert để remark-gfm KHÔNG cắt đôi ô bảng tại dấu trị tuyệt đối / độ dài vectơ!
  s = s.split('\n').map((line) => {
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

  return s;
}

export function normalizeMathText(text: any): string {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') text = String(text);
  if (!text) return '';

  // Fast-path: pure Vietnamese prose without math delimiters, operators, symbols, or LaTeX keywords
  if (
    !/[\\$\{\}\^_=<>\|*~/+\-×÷≤≥≠≈→⇒⇔√παβγθφωσΔΩ∞°∈∉∪∩∅\[\]()\r\n]/.test(text) &&
    !/\b(?:frac|dfrac|sqrt|sin|cos|tan|cot|lim|ln|log|vec|cdot|times|ge|le|ne|neq|iff|Delta|pi|alpha|beta|gamma|theta|phi|omega|begin|end|underline|textbf|mathbb|overline|left|right|forall|exists|setminus|emptyset|varnothing|mid|circ|vdots|nearrow|searrow|undefined|null)\b|TẮM|dưóin|SS_|uu_|Đáp\s*(?:số|án)|You can't|Extra\s*close|Missing\s*\\/i.test(text)
  ) {
    return text.normalize('NFC');
  }

  // 0. Sửa lỗi `_\{` và `^\{` bị escape nhầm làm hỏng chỉ số dưới/trên TeX (S_{20}, u_n, S_n)
  text = text.replace(/_\\\{([^{}\n]+?)\\\}/g, '_{$1}');
  text = text.replace(/\^\\\{([^{}\n]+?)\\\}/g, '^{$1}');
  text = text.replace(/_\\\{/g, '_{');
  text = text.replace(/\^\\\{/g, '^{');

  // 0.1 Sửa ngoặc nhọn mở trần trong trường hợp cụ thể u_1 {+ 11d -> u_1 + 11d (không chạm vào \frac{-1}, 10^{-3}, u_{n-1})
  text = text.replace(/(\(?u_\d+)\s*\{\s*\+/g, '$1 + ');

  // 0.2 Nối liền các công thức phân số bị tách \cdot trên dòng mới (\frac{...}{2} \n \cdot 17 = 85$.)
  text = text.replace(/(\\frac\{[^{}]*\}\{[^{}]*\})\s*[\r\n]+\s*\\cdot\s*(\d+\s*=\s*\d+)\$\.?/gi, '$1 \\cdot $2$.');
  text = text.replace(/(\\frac\{[^{}]*\}\{[^{}]*\})\s*[\r\n]+\s*\\cdot\s*/gi, '$1 \\cdot ');

  // 0.3 Giải phóng các nhãn markdown (**Đúng**), (**Sai**), (**Chọn A.**) bị nhốt lầm trong $...$ (TUYỆT ĐỐI không vượt qua dấu xuống dòng \n)
  text = text.replace(/\$([^\$\n]*?)[ \t]*(\(\*\*(?:Đúng|Sai)\*\*\)|\*\*Chọn[ \t]*[A-D]\.\*\*)[ \t]*([^\$\n]*?)\$/gi, (_m, m1, label, m2) => {
    let res = '';
    if (m1.trim()) res += `$${m1.trim()}$ `;
    res += label + ' ';
    if (m2.trim()) res += `$${m2.trim()}$`;
    return res.trim();
  });

  // 0.4 Sửa gạch chéo ngược đơn \ trong \begin{cases} ... \end{cases} thành \\ ngắt dòng chuẩn TeX
  text = text.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/gi, (_match, body) => {
    let cleanBody = body
      .replace(/(?<!\\)\\(?!\\|\{|\}|begin|end|frac|sqrt|text|ge|le|neq|in|notin|mathbb|vec|alpha|beta|pi)/g, ' \\\\ ')
      .replace(/\s*\\{2,}\s*/g, ' \\\\ ')
      .replace(/\\\\(?:\s*\\\\)+/g, ' \\\\ ')
      .replace(/\\\\(?=\s*$)/, '');
    return `\\begin{cases} ${cleanBody.trim()} \\end{cases}`;
  });

  // 0.5 Xóa triệt để các chuỗi thông báo lỗi thô rác do MathJax ném ra
  text = text.replace(/You can't use 'macro parameter character #' in math mode/gi, '');
  text = text.replace(/Extra\s*close\s*brace\s*or\s*missing\s*open\s*brace/gi, '');
  text = text.replace(/Missing\s*\\?(?:begin|end)\{cases\}(?:\s*or\s*extra\s*\\?(?:begin|end)\{cases\})?/gi, '');
  text = text.replace(/Missing\s*\\?\{[^{}]*\}/gi, '');

  // Tiền xử lý dọn rác và unescape \n, bọc công thức trần
  text = sanitizeLatexMathAndDelimiters(text);

  // 0. Chuyển đổi môi trường LaTeX tabular sang Markdown table
  text = convertLatexTabularToMarkdown(text);

  // Chuẩn hóa \underline{A}, \underline{B}, \underline{C}, \underline{D} và \textbf{...} ngoài công thức
  text = text.replace(/\\underline\{([A-D])\}/g, '**$1**');
  text = text.replace(/\\underline\{([^}]+)\}/g, '<u>**$1**</u>');
  text = text.replace(/\\textbf\{([^}]+)\}/g, '**$1**');

  // Gỡ bỏ thẻ LaTeX \begin{center} và \end{center} trôi nổi
  text = text.replace(/\\begin\s*\{center\}/gi, '\n');
  text = text.replace(/\\end\s*\{center\}/gi, '\n');

  let t = fixTrigAndMathSyntax(text.normalize("NFC"));
  t = wrapFractionAndNegativePowers(t);

  // 0. Chuẩn hóa các dấu ngoặc kép bị escape \" bên trong hoặc xung quanh công thức
  t = t.replace(/\\"/g, '"');
  t = t.replace(/\\dfrac\b/g, '\\frac');

  // Khắc phục triệt để lỗi double-backslash cho các lệnh TeX cụ thể, KHÔNG làm phá hỏng dấu \\ ngắt dòng trong \begin{cases}...\end{cases}
  t = t.replace(/\\{2,}(frac|sqrt|begin|end|alpha|beta|gamma|delta|pi|theta|sigma|omega|Delta|Sigma|infty|pm|mp|le|ge|leq|geq|neq|ne|in|notin|subset|supset|subseteq|supseteq|times|cdot|to|lim|ln|log|sin|cos|tan|cot|arcsin|arccos|arctan|vec|overrightarrow|underline|textbf|left|right|mathbb|mathcal|mathrm|text|quad|qquad|mid|parallel|perp|dots|cdots|ldots|vdots|ddots)\b/gi, '\\$1');
  t = t.replace(/\\{3,}/g, '\\\\');

  // Loại bỏ triệt để các thuộc tính sự kiện inline HTML nguy hiểm (onclick, onmouseover...) gây lỗi React event listener string
  let evtIter = 0;
  while (/(<\w+[^>]*?)\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(t) && evtIter++ < 20) {
    t = t.replace(/(<\w+[^>]*?)\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '$1');
  }

  // Tự động bọc $ cho các phương án trắc nghiệm hoặc biểu thức toán trần thiếu $
  t = autoWrapNakedMathExpression(t);

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

  // 3. Khôi phục các ký tự thoát bị rách hoặc nuốt gạch chéo ngược cho \neq và các lệnh TeX
  // A. Khôi phục \backslash leq, \backslash geq, \backslash neq -> \le, \ge, \neq
  t = t.replace(/\\backslash\s*(leq|geq|neq|frac|sqrt|in|notin|cap|cup|setminus|forall|exists|mathbb|pi|alpha|beta)\b/gi, '\\$1');
  t = t.replace(/\\backslash\s*/gi, '\\');

  // B. Chuẩn hóa ngay \geq và \leq trước tiên để tránh nhầm lẫn với eq (TUYỆT ĐỐI không cắt nhầm \left, \leftarrow...)
  t = t.replace(/\\(geq|ge)(?![a-zA-Z])/g, '\\ge ');
  t = t.replace(/\\(leq|le)(?![a-zA-Z])/g, '\\le ');
  t = t.replace(/\\(geq|ge)([0-9])/g, '\\ge $2');
  t = t.replace(/\\(leq|le)([0-9])/g, '\\le $2');
  t = t.replace(/\\(geq|ge)([xyzmnabckXYZMNABCK])(?![a-zA-Z])/g, '\\ge $2');
  t = t.replace(/\\(leq|le)([xyzmnabckXYZMNABCK])(?![a-zA-Z])/g, '\\le $2');
  t = t.replace(/([0-9a-zA-Z\$\)\}\]])\s*(?:\\)?(geq)\s*([0-9a-zA-Z\$\(\{\]\-\+])/gi, '$1 \\ge $3');
  t = t.replace(/([0-9a-zA-Z\$\)\}\]])\s*(?:\\)?(leq)\s*([0-9a-zA-Z\$\(\{\]\-\+])/gi, '$1 \\le $3');

  // C. Khôi phục \neq khi \n bị biến thành newline character trong JSON string parsing
  t = t.replace(/([\r\n]+|\s*\\n\s*)\s*eq\s*(0|\d+|[a-zA-Z]+|\-|\+|\$|\\|\)|\}|\])/gi, ' \\neq $2');
  t = t.replace(/([\r\n]+|\s*\\n\s*)\s*eq\b/gi, ' \\neq ');
  t = t.replace(/([\r\n]+|\s*\\n\s*)\s*neq\b/gi, ' \\neq ');
  t = t.replace(/([\r\n]+|\s*\\n\s*)\s*notin\b/gi, ' \\notin ');
  t = t.replace(/([\r\n]+|\s*\\n\s*)\s*nexists\b/gi, ' \\nexists ');

  // D. Khôi phục \neq khi bị biến dạng thành 1eq0, + 1eq0, x^2 + 1eq0, (x)eq0, a eq b, 1 eq 0, 1eq, 1neq0...
  // TUYỆT ĐỐI KHÔNG match nhầm đuôi của geq (g+eq) hay leq (l+eq)!
  t = t.replace(/(?<![\\a-zA-Z])\b1\s*eq\s*0\b/gi, '1 \\neq 0');
  t = t.replace(/(?<![\\a-zA-Z])\b1eq0\b/gi, '1 \\neq 0');
  t = t.replace(/(?<![\\a-zA-Z])\b1neq0\b/gi, '1 \\neq 0');
  t = t.replace(/([0-9\)\}\]\^])\s*1?eq\s*(0|\d+|[a-zA-Z]+|\-|\+|\$|\\|\)|\}|\])/gi, '$1 \\neq $2');
  t = t.replace(/([xyztabcmXYZTABCM])\s+eq\s+(0|\d+|[a-zA-Z]+|\-|\+|\$|\\|\)|\}|\])/gi, '$1 \\neq $2');
  t = t.replace(/\((?:\s*|\$)*([a-zA-Z0-9\)\}\]\^]+)\s*(?:a?e|eq)\s*0(?:\s*|\$)*\)/gi, '($1 \\neq 0)');
  t = t.replace(/(?<![glGL\\a-zA-Z])\beq\s*(0|\d+|[a-zA-Z]+|\-|\+|\$|\\|\)|\}|\])/gi, ' \\neq $1');
  t = t.replace(/(?<!\\)\bneq\b/g, '\\neq');
  t = t.replace(/(?<!\\)\bne\b(?=\s*0|\s*\d|\s*\$|\s*[a-zA-Z]|\s*-|\s*\\)/g, '\\neq');
  t = t.replace(/(?<![glGL\\a-zA-Z])\bne\b/g, '\\neq');
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
  t = t.replace(/(?<!\\)\b(setminus|emptyset|varnothing)\b/g, '\\$1');
  t = t.replace(/(?<!\\)\bmid\b(?=\s*[^a-zA-Z])/g, '\\mid');
  t = t.replace(/(?<=[a-zA-Z0-9\$\s])\bin\s+(?=\\mathbb|[RZNQ]\b)/g, '\\in ');
  t = t.replace(/(?<=\\in\s*)\\?([RZNQ])\b/g, '\\mathbb{$1}');

  // E. Chuẩn hóa dứt điểm \ge, \le, \neq, \frac
  t = t.replace(/\\dfrac\b/g, '\\frac');
  t = t.replace(/\\geq(?![a-zA-Z])/g, '\\ge');
  t = t.replace(/\\leq(?![a-zA-Z])/g, '\\le');
  t = t.replace(/\\ge([0-9])/g, '\\ge $1');
  t = t.replace(/\\le([0-9])/g, '\\le $1');
  t = t.replace(/\\ge([xyzmnabckXYZMNABCK])(?![a-zA-Z])/g, '\\ge $1');
  t = t.replace(/\\le([xyzmnabckXYZMNABCK])(?![a-zA-Z])/g, '\\le $1');
  t = t.replace(/\\neq([0-9])/g, '\\neq $1');
  t = t.replace(/\\neq([xyzmnabckXYZMNABCK])(?![a-zA-Z])/g, '\\neq $1');

  // Chuẩn hóa dấu + và - đứng độc lập trong mô tả bảng biến thiên (vd: từ + sang -)
  t = t.replace(/(\btừ\s*)([+\-])(\s*sang\s*)([+\-])/gi, '$1$$$2$$$3$$$4$$');

  // Sửa lỗi \frac{NUM} thiếu mẫu số thứ 2 {DENOMINATOR} trước \iff, \Rightarrow, $, $$...
  t = fixIncompleteFractions(t);

  // Fix common math environments and piecewise cases
  t = t.replace(/(?:\\+begin|\bbegin)\s*\{?cases\*?\}?/gi, '\\begin{cases}');
  t = t.replace(/(?:\\+end|\bend)\s*\{?cases\*?\}?/gi, '\\end{cases}');
  t = t.replace(/(?:\\+begin|\bbegin)\s*\{?aligned\*?\}?/gi, '\\begin{aligned}');
  t = t.replace(/(?:\\+end|\bend)\s*\{?aligned\*?\}?/gi, '\\end{aligned}');
  t = t.replace(/\\left\s*\\\{\s*(?:\\begin\s*\{(?:matrix|array|aligned)\}(?:\{[^}]*\})?)?([\s\S]*?)(?:\\end\s*\{(?:matrix|array|aligned)\})?\s*\\right\s*\./g, (_m, body) => {
    return `\\begin{cases} ${body.trim()} \\end{cases}`;
  });
  t = t.replace(/\\left\s*\\\{\s*(\\begin\s*\{cases\}[\s\S]*?\\end\s*\{cases\})\s*(?:\\right\s*\.)?/g, '$1');

  // Cân bằng triệt để các khối \begin{cases} ... \end{cases}
  t = balanceCasesEnvironments(t);

  // Chuẩn hóa \begin{array} {|c|c|c|\n\n} -> \begin{array}{|c|c|c|}
  t = t.replace(/\\begin\s*\{array\}\s*\{([\s\S]*?)\}/gi, (_match, cols) => {
    const cleanCols = cols.replace(/[\r\n\s]+/g, '').trim();
    return `\\begin{array}{${cleanCols}}`;
  });
  t = t.replace(/(\\begin\s*\{array\}[\s\S]*?\\end\s*\{array\})/gi, (match) => {
    return match.replace(/\r\n/g, '\n').replace(/\n\s*\n+/g, '\n');
  });

  // Convert \(...\) to $...$ and \[...\] to $$...$$
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

  // 4. Chuẩn hóa công thức Cấp số cộng & Cấp số nhân & Tách chữ tiếng Việt ra khỏi dấu $
  t = normalizeArithmeticProgressionFormulas(t);
  t = normalizeGeometricProgressionFormulas(t);

  // 5. Cứu hộ tiếng Việt bị lọt vào trong cặp $...$ (như "ta được:", "với", "khi", options bị nuốt lồng)
  t = rescueTrappedVietnameseFromMath(t);

  // 6. Tự động bọc $...$ cho các biểu thức toán trần trụi (options, bất đẳng thức, tập hợp)
  t = wrapNakedMathInDocument(t);

  // Clean orphan dots right after display math
  t = t.replace(
    /\$\$([\s\S]*?)\$\$[ \t\r\n]*([.,;])(?!(?:\.|[0-9a-zA-Zà-ỹÀ-Ỹ]))(?=[ \t]*(?:\r?\n|$))/g,
    (fullMatch, body: string, punct: string) => {
      const trimmed = body.trim();
      if (!trimmed) return fullMatch;
      const isDisplayBlock =
        trimmed.includes('\n') ||
        /\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)/i.test(trimmed) ||
        /\\left\s*\[/.test(trimmed);
      if (!isDisplayBlock && !fullMatch.includes('\n')) {
        return `$$${trimmed}${/[.,;]$/.test(trimmed) ? '' : punct}$$`;
      }
      const nextBody = /[.,;]$/.test(trimmed) ? trimmed : `${trimmed}${punct}`;
      return `\n\n$$\n${nextBody}\n$$\n\n`;
    }
  );
  t = t.replace(/(\$\$[\s\S]*?\$\$)\s*\.\s*(?=(?:[A-ZÀ-Ỹ]|\*{1,2}(?:Câu|Bài)\s*\d))/g, '$1\n\n');

  // Clean leaked undefined/null
  t = t.replace(/(?<![a-zA-Z0-9_\$])(?:undefined|null)(?![a-zA-Z0-9_\$])/g, '');

  t = wrapFractionAndNegativePowers(t);
  t = fixIncompleteFractions(t);
  t = balanceCasesEnvironments(t);
  return fixAndMergeMathArrows(t);
}

export function fixIncompleteFractions(text: string): string {
  if (!text || !text.includes('\\frac')) return text;
  let s = text;

  // Khôi phục dấu } bị mất ở tử số của phân số phức hợp: \frac{3 - \frac{2}{n}{4 + \frac{5}{n}} -> \frac{3 - \frac{2}{n}}{4 + \frac{5}{n}}
  s = s.replace(/\\frac\s*\{([^{}\n\$]+?\\frac\s*\{[^{}]+\}\s*\{[^{}]+\})\s*\{/g, '\\frac{$1}{');

  // Sửa lỗi \frac{NUM} thiếu mẫu số thứ 2 {DENOMINATOR} trước \iff, \Rightarrow, \Leftrightarrow, $, $$, \end, =, +, -, hoặc ngắt dòng
  s = s.replace(/\\frac\s*\{([^{}]+)\}(?!\s*\{)(?=\s*(?:\\iff|\\Rightarrow|\\Leftrightarrow|\\Leftarrow|=|\$|\\end|\n|$))/gi, (_match, num) => {
    const trimmedNum = num.trim();
    if (/\d+\[|n\[|n\(|\d+\(|u_1|d/.test(trimmedNum)) {
      return `\\frac{${trimmedNum}}{2}`;
    }
    return `\\frac{${trimmedNum}}{1}`;
  });

  // Dọn dẹp dòng rác "0$." hoặc "}" ngay sau phân số do rách dấu math
  s = s.replace(/(\\frac\{[^{}]*\}\{[^{}]*\})\s*[\r\n]+\s*\}?\s*0?\$\./gi, '$1$.');
  s = s.replace(/(\\frac\{[^{}]*\}\{[^{}]*\})\s*[\r\n]+\s*\}?\s*(?=[0-9A-ZÀ-Ỹa-zà-ỹ])/g, '$1 ');

  // Chữa lành trường hợp bị chèn thừa dấu $ hoặc $$ trước \Rightarrow trên cùng 1 dòng toán học
  s = s.replace(/(\$[^\$\n]+?)\$\$?\s*(\\(?:Rightarrow|Leftrightarrow|Leftarrow)\b[^\$\n]+?\$)/g, '$1 $2');

  // Chỉ bổ sung dấu $ đóng ở cuối dòng nếu dòng đó có số lượng dấu $ lẻ
  s = s.split('\n').map((line) => {
    const dollars = (line.match(/(?<!\\)\$/g) || []).length;
    if (dollars % 2 === 1 && /\$[^\$\n]*\\frac\{[^{}]*\}\{[^{}]*\}[^{}\$\n]*$/.test(line)) {
      return line.replace(/(\\frac\{[^{}]*\}\{[^{}]*\}[0-9a-zA-Z\+\-\*\/\=\(\)\s]*)(?=\s*(?:\.\s*(?:Chọn|\*\*)|\.?$))/, '$1$');
    }
    return line;
  }).join('\n');

  return s;
}

export function balanceCasesEnvironments(text: string): string {
  if (!text) return text;
  let s = text;

  // Xóa triệt để các chuỗi thông báo lỗi thô rác do MathJax/LaTeX ném ra
  s = s.replace(/You can't use 'macro parameter character #' in math mode/gi, '');
  s = s.replace(/Missing\s*\\?(?:begin|end)\{cases\}(?:\s*or\s*extra\s*\\?(?:begin|end)\{cases\})?/gi, '');
  s = s.replace(/Extra\s*close\s*brace\s*or\s*missing\s*open\s*brace/gi, '');
  s = s.replace(/Missing\s*\\?\{[^{}]*\}/gi, '');

  // Sửa các tiền tố rác SS\begin{cases}, $S\begin{cases}, S\begin{cases}
  s = s.replace(/(?:SS|\$S|S\$)?\\begin\s*\{cases\*?\}/gi, '\\begin{cases}');
  s = s.replace(/(?:SS|\$S|S\$)?\\end\s*\{cases\*?\}/gi, '\\end{cases}');

  if (!s.includes('cases')) return s;

  const balanceBlock = (body: string): string => {
    let b = body;
    const begins = (b.match(/\\begin\s*\{cases\*?\}/gi) || []).length;
    const ends = (b.match(/\\end\s*\{cases\*?\}/gi) || []).length;

    if (begins > ends) {
      b = b + '\\end{cases}'.repeat(begins - ends);
    } else if (ends > begins) {
      const diff = ends - begins;
      for (let k = 0; k < diff; k++) {
        b = b.replace(/\\end\s*\{cases\*?\}/i, '');
      }
    }
    return b;
  };

  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g, (match) => {
    const isDisplay = match.startsWith('$$');
    const delimiter = isDisplay ? '$$' : '$';
    const inner = match.slice(delimiter.length, -delimiter.length);
    const fixedInner = balanceBlock(inner);
    return `${delimiter}${fixedInner}${delimiter}`;
  });

  // Chỉ bọc \begin{cases}...\end{cases} ở các đoạn NGOÀI $...$ / $$...$$ (tránh tuyệt đối bọc chồng lên $...$ sẵn có)
  const caseWrapParts = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g);
  for (let i = 0; i < caseWrapParts.length; i += 2) {
    if (caseWrapParts[i] && caseWrapParts[i].includes('\\begin')) {
      caseWrapParts[i] = caseWrapParts[i].replace(/(?<!\$)(?:\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})(?!\$)/gi, (match, offset) => {
        const lineStart = caseWrapParts[i].lastIndexOf('\n', offset - 1) + 1;
        const beforeOnLine = caseWrapParts[i].slice(lineStart, offset).trim();
        if (beforeOnLine.length > 0) {
          return `$${match.trim()}$`;
        }
        return `\n\n$$\n${match.trim()}\n$$\n\n`;
      });
    }
  }
  s = caseWrapParts.join('');

  return s;
}

/**
 * Tách chữ tiếng Việt bị nhốt bên trong cặp $...$ hoặc $$...$$
 * Đặc biệt xử lý trường hợp như:
 * "$P = \frac{...}{...} (x \neq ...) ta được: A. P = \sin x B. P = \cos x$"
 */
export function rescueTrappedVietnameseFromMath(text: string): string {
  if (!text || !text.includes('$')) return text;

  let s = text;

  // 0. Sửa lỗi dịch chuyển dấu $ làm nhốt câu tiếng Việt đầu câu hoặc giữa câu:
  // Ví dụ: "$Số hạng tổng quát : Nếu cấp số cộng(u_n)..." hoặc "$(u_n)biếtrằng : u_1 = 2$" hoặc "$Tính tổngS_{10} của $10$"
  s = s.replace(/\(\s*u_n\s*\)\s*bi\s*ế\s*t\s*r\s*ằ\s*n\s*g\s*:/gi, '$(u_n)$ biết rằng:');
  s = s.replace(/\(\s*u_n\s*\)\s*th\s*ỏ\s*a\s*m\s*ã\s*n\s*:/gi, '$(u_n)$ thỏa mãn:');
  s = s.replace(/\$\s*\(\s*u_n\s*\)\s*(biết\s*rằng|thỏa\s*mãn|có\s*số\s*hạng\s*đầu)\s*:?\s*([^\$\n]+?)\$/gi, (_m, phrase, rest) => {
    const hasColon = _m.includes(':');
    return `$(u_n)$ ${phrase}${hasColon ? ':' : ''} $${rest.trim()}$`;
  });

  // 0.5. Tách thẻ <br/>, cụm "(hoặc ...)", "(với ...)", "(thỏa mãn)", "(loại)", "trên khoảng", "Lưu ý:" nếu bị nhốt trong $...$
  s = s.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (fullMatch, inner) => {
    let cur = inner;
    // Giải phóng \text{...} chứa tiếng Việt có dấu ở cấp ngoài (trừ chỉ số dưới _{ \text{CĐ} })
    cur = cur.replace(/(?<!_\s*\{?\s*)\\text\{\s*([^}]*?[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ][^}]*?)\s*\}/gi, ' $1 ');

    if (
      /<br\s*\/?>/i.test(cur) ||
      /\(\s*(?:hoặc|với|hay|thỏa\s*mãn|nhận|loại|không\s*xác\s*định|luôn\s*đúng|vô\s*nghiệm)\b/i.test(cur) ||
      /\b(?:trên\s+khoảng|trên\s+đoạn|trên\s+nửa\s+khoảng|trên\s+tập|tại\s+hữu\s+hạn|Lưu\s+ý)\b/i.test(cur)
    ) {
      let splitOut = cur
        // Tách <br/>
        .replace(/<br\s*\/?>/gi, '$ <br/> $')
        // Tách (hoặc \le 0), (với a \ne 0)
        .replace(/\(\s*(hoặc|với|hay)\s+([^()$\n]+?)\)/gi, '$$ ($1 $$$2$$) $$')
        // Tách (thỏa mãn), (loại), (không xác định)
        .replace(/\(\s*(thỏa\s*mãn|nhận|loại|không\s*xác\s*định|luôn\s*đúng|vô\s*nghiệm)\s*\)/gi, '$$ ($1) $$')
        // Tách "trên khoảng", "trên đoạn", "trên nửa khoảng", "trên tập"
        .replace(/\s+(trên\s+khoảng|trên\s+đoạn|trên\s+nửa\s+khoảng|trên\s+tập|với\s+mọi)\s+/gi, '$$ $1 $$')
        // Tách "Lưu ý: ..."
        .replace(/\s*(Lưu\s+ý\s*:[\s\S]*)$/i, '$$ $1');
      let rebuilt = `$${splitOut}$`
        .replace(/\$\s*\$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      return rebuilt;
    }
    return fullMatch;
  });

  // 1. Tách câu dẫn tiếng Việt dính liền công thức trong $: ví dụ "$... ta được:$" hoặc "$Cho cấp số cộng (u_n)...$"
  s = s.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (fullMatch, inner) => {
    const strippedOfTextCmd = inner.replace(/\\(?:text|mathrm|mathbf)\{[^{}]*\}/g, '');
    const vietnameseWords = strippedOfTextCmd.match(/[a-zA-ZÀ-ỹ]*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ][a-zA-ZÀ-ỹ]*/gi) || [];

    // Nếu bắt đầu bằng từ tiếng Việt có dấu (do lệch dấu $): ví dụ "$Tính tổng S_{10} của $" hoặc "$Cho cấp số cộng (u_n) $"
    if (/^\s*[A-ZÀ-Ỹa-zà-ỹ]+\s+[a-zA-ZÀ-ỹ]+/.test(strippedOfTextCmd) && vietnameseWords.length >= 2) {
      let clean = inner.trim();
      // Bọc lại các ký hiệu toán bên trong đoạn văn tiếng Việt bị bọc nhầm $
      clean = clean.replace(/(\([uS]_\{?[a-zA-Z0-9+\-]+\}?\)|[uS]_(?:[a-zA-Z0-9]+|\{[^{}]+\})(?:\s*=\s*[^,;\s]+)?)/g, '$$$1$$');
      return clean;
    }

    const vietnameseClues = /(?:\s+|^)(ta\s+được|khi\s+đó|thì|trong\s+đó|thỏa\s+mãn|biết\s+rằng|đáp\s+án|kết\s+quả|chọn|mệnh\s+đề|đúng|sai)[:\s]/i;
    if (vietnameseClues.test(strippedOfTextCmd) || (vietnameseWords.length >= 2 && strippedOfTextCmd.length > 18)) {
      let replaced = inner.replace(/^([^\$\n]+?)\s*(ta\s+được|khi\s+đó|thì|trong\s+đó|thỏa\s+mãn|biết\s+rằng|đáp\s+án|kết\s+quả|chọn)\s*(:?)\s*([\s\S]*)$/i, (_m, mathPart, phrase, colon, rest) => {
        let cleanMath = mathPart.trim();
        let cleanRest = rest.trim();
        let res = '';
        if (cleanMath) res += `$${cleanMath}$ `;
        res += `${phrase}${colon ? ':' : ''} `;
        if (cleanRest) {
          if (/[A-D][\.\:\)]/.test(cleanRest)) {
            res += cleanRest;
          } else if (/[\\^_=><\+\-\*\/]|[uS]_/.test(cleanRest)) {
            res += `$${cleanRest}$`;
          } else {
            res += cleanRest;
          }
        }
        return res.trim();
      });

      if (replaced !== inner) {
        return replaced;
      }
    }
    return fullMatch;
  });

  // 2. Xử lý dòng chứa $...$$ inline sai cú pháp hoặc số lẻ dấu single $ (unclosed math dollar)
  const lines = s.split('\n');
  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx];
    if (!line.includes('$')) continue;

    // 2a. Nếu một dòng không phải display block $$...$$ mà lại dính lỗi $expr$$ (mở 1 $, đóng 2 $$) -> sửa thành $expr$
    const ddCount = (line.match(/\$\$/g) || []).length;
    if (ddCount % 2 !== 0 && !/^\s*\$\$/.test(line)) {
      line = line.replace(/(?<!\$)\$([^$\n]{1,120}?)\$\$(?!\$)/g, '$$$1$$');
    }

    // 2b. Tạm che các cặp $$...$$ hợp lệ trên dòng để kiểm tra dấu $ đơn lẻ còn lại
    const dMasks: string[] = [];
    let masked = line.replace(/\$\$[^\n]*?\$\$/g, (m) => {
      dMasks.push(m);
      return `\uE000DM${dMasks.length - 1}\uE001`;
    });

    // Nếu vẫn còn dấu $$ lẻ mồ côi trên dòng văn bản -> gỡ bỏ hoặc chuyển thành $
    if (masked.includes('$$')) {
      masked = masked.replace(/(?<!\$)\$([^$\n]{1,120}?)\$\$(?!\$)/g, '$$$1$$');
      masked = masked.replace(/\$\$/g, '');
    }

    const dollars = (masked.match(/(?<!\\)\$/g) || []).length;
    if (dollars % 2 !== 0) {
      const lastDollarIndex = masked.lastIndexOf('$');
      const afterDollar = masked.slice(lastDollarIndex + 1);
      const beforeDollar = masked.slice(0, lastDollarIndex);
      // Nếu dấu $ lẻ nằm ngay đầu câu tiếng Việt (ví dụ: "**Câu 2:** $Số hạng tổng quát...") -> xóa dấu $ thừa đó
      if (!beforeDollar.includes('$') && /^\s*[A-ZÀ-Ỹa-zà-ỹ]{2,}\s+[a-zA-ZÀ-ỹ]{2,}/.test(afterDollar)) {
        masked = beforeDollar + afterDollar;
      } else if (/[\\=_\^\+\-\/]|u_\d|S_\d|\d+/.test(afterDollar)) {
        if (masked.endsWith('.')) {
          masked = masked.slice(0, -1) + '$.';
        } else {
          masked = masked + '$';
        }
      } else {
        // Dấu $ lẻ mồ côi không chứa biểu thức toán nào theo sau -> xóa bỏ để không nuốt xuống dòng tiếp theo hay ký tự #
        masked = beforeDollar + afterDollar;
      }
    }

    lines[idx] = masked.replace(/\uE000DM(\d+)\uE001/g, (_m, k) => dMasks[Number(k)] || '');
  }
  s = lines.join('\n');

  return s;
}

/**
 * Tự động bọc $...$ cho toàn bộ các biểu thức toán học trần trụi trong tài liệu:
 * 1. Các phương án A., B., C., D. (như A. x - 1 \ge 0, B. a \ge 1, C. xy \ge 1, D. P = \sin x)
 * 2. Các tập hợp (như A = {x \in R | x + 2y \le 0}, B = {x \in R | -1/2 < x \le 3})
 * 3. Các phép toán tập hợp (A \cap B, A \cup B, A \setminus B)
 * 4. Các điều kiện trong ngoặc đơn (x \neq \pi/2 + k\pi, k \in \mathbb{Z})
 */
export function wrapNakedMathInDocument(text: string): string {
  if (!text) return '';
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g);
  for (let i = 0; i < parts.length; i += 2) {
    let s = parts[i];
    if (!s) continue;

    // 1. Tự động bọc các tập hợp trần trụi: A = {x \in R | ...} hoặc B = {x \in \mathbb{R} | ...}
    s = s.replace(/(?<![\$\w])([A-Z]\s*=\s*)\\?\{\s*([a-zA-Z]\s*(?:\\in|in)\s*(?:\\mathbb\{[A-Z]\}|[A-Z]|R|N|Z|Q)\s*(?:\\mid|\|)\s*(?:\{[^{}]*\}|[^\}\n])+?)\\?\}(?![\$\w])/g, (_m, name, body) => {
      let cleanBody = body
        .replace(/(?:\\in|in)\s*R\b/g, '\\in \\mathbb{R}')
        .replace(/(?:\\in|in)\s*Z\b/g, '\\in \\mathbb{Z}')
        .replace(/(?:\\in|in)\s*N\b/g, '\\in \\mathbb{N}')
        .replace(/(?:\\in|in)\s*Q\b/g, '\\in \\mathbb{Q}')
        .replace(/\|/g, '\\mid ')
        .replace(/\\geq\b/g, '\\ge ')
        .replace(/\\leq\b/g, '\\le ')
        .trim();
      return `$${name}\\{${cleanBody}\\}$`;
    });

    // 1.5 Tự động bọc phép toán tập hợp: A \cap B, A \cup B, A \setminus B
    s = s.replace(/(?<![\$\w])([A-Z]\s*\\(?:cap|cup|setminus)\s*[A-Z])(?![\$\w])/g, '$$$1$$');

    // 2. Tự động bọc điều kiện trong ngoặc đơn chứa \neq hoặc \in: (x \neq \frac{\pi}{2} + k\pi, k \in \mathbb{Z})
    s = s.replace(/(?<![\$\w])\(\s*([a-zA-Z0-9_\+\-\*\/\s\\]*?(?:\\neq|\\ge|\\le|\\in)[^$\n\(\)]+?)\s*\)(?![\$\w])/g, '($$$1$$)');

    // 3. Tự động bọc các phương án trắc nghiệm A., B., C., D. đứng đầu dòng hoặc theo sau nhãn
    s = s.replace(/(^|\n|\r)[ \t]*((?:[-*−]\s*)?(?:\*{0,2})[A-Da-d][\.\:\)](?:\*{0,2}))[ \t]+([^\n\r]+)/g, (fullLine, prefix, label, content) => {
      let trimmed = content.trim();
      if (trimmed.includes('$') || trimmed.startsWith('|') || trimmed.startsWith('```')) {
        return fullLine;
      }
      const strippedOfMarkdown = trimmed.replace(/\*+/g, '').trim();
      if (!strippedOfMarkdown) return fullLine;

      if (/^(?:Mục\s*tiêu|Nội\s*dung|Sản\s*phẩm|Tổ\s*chức|Khẳng\s*định|Đạo\s*hàm|Hàm\s*số|Giá\s*trị|Phương\s*trình|Bất\s*phương\s*trình|Lời\s*giải|Đáp\s*án|Đúng|Sai|Do\s*đó|Vì|Vậy|Ta\s*có|Khi|Nếu|Gọi)/i.test(strippedOfMarkdown)) {
        return fullLine;
      }

      const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(strippedOfMarkdown);
      if (hasVietnamese) {
        return fullLine;
      }

      const hasMathSymbol = /[\\^_=><\+\-\/]|\b(?:le|ge|leq|geq|neq|sin|cos|tan|cot|sqrt|frac)\b|[0-9a-zA-Z]\s*(?:<=|>=|<|>|=)/.test(strippedOfMarkdown);
      if (hasMathSymbol) {
        let cleanMath = strippedOfMarkdown
          .replace(/\\geq\b/g, '\\ge ')
          .replace(/\\leq\b/g, '\\le ')
          .replace(/\\ge([0-9])/g, '\\ge $1')
          .replace(/\\le([0-9])/g, '\\le $1')
          .replace(/\\ge([xyzmnabckXYZMNABCK])(?![a-zA-Z])/g, '\\ge $1')
          .replace(/\\le([xyzmnabckXYZMNABCK])(?![a-zA-Z])/g, '\\le $1')
          .replace(/\\neq([0-9a-zA-Z])/g, '\\neq $1');
        return `${prefix}${label} $${cleanMath}$`;
      }
      return fullLine;
    });

    // 4. Tự động bọc phương trình đứng độc lập trong câu hỏi
    s = s.replace(/(?<![\$\w])\b([yfxP]\s*=\s*(?:\\(?:frac|sqrt)|[0-9a-zA-Z\(\)\+\-\*\/\^\_]+)(?:\{[^{}]*\}|[0-9a-zA-Z\(\)\+\-\*\/\^\_\s\\]*?))(?=[,;!?]|\s+[a-zà-ỹÀ-Ỹ]|\s+(?:với|khi|thì|tại|trong|ta\s+được|đáp\s+án|[A-D][\.\:\)])|\n|$)/g, (_m, expr) => {
      let clean = expr.trim();
      if (clean.includes('$')) return expr;
      if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean)) return expr;
      return `$${clean}$`;
    });

    // 4.5. Tự động bọc $ hoặc $$ cho các môi trường toán trần trụi: \begin{cases}...\end{cases}, f(x) = \begin{cases}...\end{cases}
    if (s.includes('\\begin')) {
      s = s.replace(/(?<!\$)(?:([a-zA-Z]\s*(?:\([a-zA-Z0-9,\s]+\))?\s*=\s*)?(\\begin\s*\{(?:cases|aligned|matrix|pmatrix|bmatrix)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|matrix|pmatrix|bmatrix)\*?\}))(?!\$)/gi, (_m, prefix, env, offset) => {
        const lineStart = s.lastIndexOf('\n', offset - 1) + 1;
        const beforeOnLine = s.slice(lineStart, offset).trim();
        if (beforeOnLine.length > 0) {
          return `$${(prefix || '')}${env.trim()}$`;
        }
        return `\n\n$$\n${(prefix || '')}${env.trim()}\n$$\n\n`;
      });
    }

    parts[i] = s;
  }
  let res = parts.join('');
  res = fixAndMergeMathArrows(res);

  return cleanMathAndUnwrapHeadings(res);
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
  // NHƯNG bảo toàn nguyên vẹn nếu nằm trong \text{với } hoặc nằm trong ngoặc đơn (\text{với } n \ge 1)
  t = t.replace(/(?<!\$)\$([^\$\s][^\$\n]*?)\s+(với|khi|nếu|và|hoặc|hay)\s+([^\$\n]*?[^\$\s])\$(?!\$)/gi, (fullMatch, p1, conj, p2) => {
    if (/\\text\s*\{\s*$/.test(p1) || /^\s*\}/.test(p2)) return fullMatch;
    const openParens1 = (p1.match(/\(/g) || []).length;
    const closeParens1 = (p1.match(/\)/g) || []).length;
    if (openParens1 !== closeParens1) return fullMatch;
    const openBraces1 = (p1.match(/\{/g) || []).length;
    const closeBraces1 = (p1.match(/\}/g) || []).length;
    if (openBraces1 !== closeBraces1) return fullMatch;
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

/**
 * Chuẩn hóa các công thức Cấp số nhân (GP) và tách biệt chữ tiếng Việt ra khỏi dấu $
 * Đảm bảo 100% hiển thị chuẩn xác:
 * 1. Định nghĩa: Cấp số nhân $(u_n)$ có công bội $q \Rightarrow u_{n+1} = u_n \cdot q$ (với $n \ge 1$).
 * 2. Số hạng tổng quát: $u_n = u_1 \cdot q^{n-1}$ (với $n \ge 2$).
 * 3. Tính chất: $u_k^2 = u_{k-1} \cdot u_{k+1}$ (với $k \ge 2$).
 * 4. Tổng n số hạng đầu tiên: $S_n = \frac{u_1(1-q^n)}{1-q}$ (với $q \ne 1$). Nếu $q = 1$ thì $S_n = n \cdot u_1$.
 */
export function normalizeGeometricProgressionFormulas(text: string): string {
  if (!text) return '';
  let t = text;

  // Vá lỗi phân số bị cắt vỡ do regex cũ: \frac{u_1(1-q^n)}{1} - q} -> \frac{u_1(1-q^n)}{1-q}
  t = t.replace(/\\frac\s*\{\s*u_?1\s*\(\s*1\s*-\s*q\s*\^?\s*\{?n\}?\s*\)\s*\}\s*\{\s*1\s*\}\s*-\s*q\s*\}/g, '\\frac{u_1(1-q^n)}{1-q}');
  t = t.replace(/\\frac\s*\{\s*u_?1\s*\(\s*q\s*\^?\s*\{?n\}?\s*-\s*1\s*\)\s*\}\s*\{\s*1\s*\}\s*-\s*q\s*\}/g, '\\frac{u_1(q^n-1)}{q-1}');
  t = t.replace(/\{\s*1\s*\}\s*-\s*q\s*\}/g, '{1 - q}');

  // 1. Khái niệm / Định nghĩa Cấp số nhân
  t = t.replace(/(?:Dãy\s*số\s*\(?u_?n\)?\s*là\s*một\s*cấp\s*số\s*nhân|(?:\$)?\s*Dãy\s*số\s*\(?u_?n\)?\s*là\s*một\s*cấp\s*số\s*nhân(?:\$)?)\s*(?:\\Rightarrow|=>|->)?\s*(?:\$)?(?:\\Rightarrow|=>)?\s*u_?\{?n\+1\}?\s*=\s*u_?n\s*(?:\\cdot|\*|\.)\s*q(?:\$)?\s*(?:\(?\s*(?:\$)?q(?:\$)?\s*:\s*công\s*bội\s*\)?|\(?q\s*:\s*công\s*bội\)?)[.]?(?:\$)?/gi,
    'Dãy số $(u_n)$ là cấp số nhân $\\Rightarrow u_{n+1} = u_n \\cdot q$ ($q$: công bội).'
  );
  t = t.replace(/(?:hệ\s*thức\s*truy\s*hồi\s*là\s*:?\s*)u_?\{?n\+1\}?\s*=\s*u_?n\s*\\cdot\s*q/gi, 'hệ thức truy hồi là: $u_{n+1} = u_n \\cdot q$');

  // 2. Số hạng tổng quát
  t = t.replace(/(?:\$)?\s*u_?n\s*=\s*u_?1\s*(?:\\cdot|\*|\.)\s*q\s*\^?\s*\{?n\s*-\s*1\}?(?:\$)?\s*(?:\\text\{\s*với\s*\}|,\s*với|với)\s*(?:\$)?\s*n\s*(?:\\ge|\\geq|>=)\s*2(?:\$)?/gi,
    '$u_n = u_1 \\cdot q^{n-1}$ với $n \\ge 2$'
  );

  // 3. Tính chất số hạng
  t = t.replace(/(?:\$)?\s*u_?k\s*\^?\s*\{?2\}?\s*=\s*u_?\{?k-1\}?\s*(?:\\cdot|\*|\.)\s*u_?\{?k\+1\}?(?:\$)?\s*(?:\\text\{\s*với\s*\}|,\s*với|với)\s*(?:\$)?\s*k\s*(?:\\ge|\\geq|>=)\s*2(?:\$)?/gi,
    '$u_k^2 = u_{k-1} \\cdot u_{k+1}$ với $k \\ge 2$'
  );

  // 4. Tổng n số hạng đầu tiên (kể cả chữa lành trường hợp bị rách dấu $ từ dữ liệu lịch sử cũ)
  t = t.replace(/công\s*bội\s*\$?q\s*[\r\n\s]*\$*\\neq\s*1\$*\s*\.\s*\$*T\s*ổ\s*n\s*g\s*\$?n\$?\s*s\s*ố\s*h\s*ạ\s*n\s*g\s*đ\s*ầ\s*u\s*t\s*i\s*ê\s*n\s*l\s*à\$*\s*\$*S_?n\s*=\s*\\(?:d)?frac\{u_?1\(1-q\^n\)\}\{1-q\}\$*[\s\r\n.]*Nếu\s*\$*q\s*=\s*1\$*\s*\$*thì\$*\s*\$*S_?n\$*\s*=\s*\$*n\s*\\cdot\s*u_?1\$*\s*\.?/gi,
    'công bội $q \\neq 1$. Tổng $n$ số hạng đầu tiên là $S_n = \\frac{u_1(1-q^n)}{1-q}$. Nếu $q = 1$ thì $S_n = n \\cdot u_1$.'
  );
  t = t.replace(/(?:\$)?\s*S_?n\s*=\s*\\(?:d)?frac\{\s*u_?1\s*\(1\s*-\s*q\s*\^?\s*\{?n\}?\)\s*\}\{\s*1\s*-\s*q\s*\}(?:\$)?/gi,
    '$S_n = \\frac{u_1(1-q^n)}{1-q}$'
  );
  t = t.replace(/(?:\$)?\s*S_?n\s*=\s*n\s*(?:\\cdot|\*|\.)\s*u_?1(?:\$)?/gi,
    '$S_n = n \\cdot u_1$'
  );

  return t;
}

/**
 * Chuẩn hóa đánh số thứ tự câu hỏi (Câu 1, Câu 2...) và định dạng các Phần I, II, III, IV trong Phiếu học tập.
 * Đảm bảo:
 * - PHẦN I: Mỗi câu trắc nghiệm bắt đầu bằng **Câu X:**, tách riêng 4 phương án A, B, C, D rõ ràng (không dính hàng).
 * - PHẦN II: Mỗi câu bắt đầu bằng **Câu X:** [Lời dẫn], theo sau là các ý a), b), c), d).
 * - PHẦN III & IV: Mỗi câu bắt đầu bằng **Câu X:** (hoặc Bài X:), loại bỏ hoàn toàn bullet '-' hoặc '•'.
 * - Tự động chèn khoảng trắng giữa chữ tiếng Việt và công thức toán $...$ để chữ không bị dính vào công thức.
 */
export function formatWorksheetQuestionsAndSections(markdown: string): string {
  if (!markdown) return "";
  let text = markdown;

  // 0. Tự động ngắt dòng cho các mục Tóm tắt kiến thức / Lý thuyết (- **...:**) khi bị dính trên cùng 1 dòng
  text = text.replace(/([^\n\-*•–—\u2022\s])[ \t]*(?:[-*•]|\u2022)?[ \t]*(\*\*(?:Định\s*nghĩa|Khái\s*niệm|Số\s*hạng\s*tổng\s*quát|Tính\s*chất|Tổng\s*\$?n\$?\s*số\s*hạng|Quy\s*tắc|Công\s*thức|Định\s*lý|Hệ\s*thức|Chú\s*ý|Nhận\s*xét|Ví\s*dụ|Lưu\s*ý)[^*]*?:\*\*)/gi, '$1\n- $2');
  text = text.replace(/([^\n\-*•–—\u2022\s])[ \t]+[-*•][ \t]+(\*\*[^*]+?:\*\*)/g, '$1\n- $2');

  // 1. Tách chữ tiếng Việt dính liền với công thức $ bằng cách chia mảng token (tránh tuyệt đối ghép nhầm dấu $ đóng với dấu $ mở kế tiếp)
  text = text.replace(/([a-zA-ZÀ-ỹ]{2,})(\([uS]_\{?[a-zA-Z0-9+\-]+\}?\))/g, '$1 $$$2$$');
  text = text.replace(/(\([uS]_\{?[a-zA-Z0-9+\-]+\}?\))([a-zA-ZÀ-ỹ]{2,})/g, '$$$1$$ $2');
  text = text.replace(/([a-zA-ZÀ-ỹ]{2,})([uS]_\{[a-zA-Z0-9+\-]+\})/g, '$1 $$$2$$');

  // Tách dấu hai chấm dính chữ trên cùng 1 dòng (ví dụ "Định nghĩa:Cấp" -> "Định nghĩa: Cấp", tuyệt đối KHÔNG nuốt ký tự xuống dòng \n)
  text = text.replace(/:[ \t]*([a-zA-ZÀ-ỹ0-9])/g, ': $1');

  // Tách riêng nếu tiêu đề PHẦN bị dính liền với Câu 1, mệnh đề a), hoặc công thức câu 1 trên cùng 1 dòng
  text = text.replace(/(PHẦN\s*(?:[1-4]|I{1,4}|IV)\b[^:\n]*:?)[ \t]+(?=(?:[-*]\s*)?(?:\*{0,2}(?:Câu|Bài)\s*\d+|\d+[\.\)](?:\s+(?![A-D]\b)|\s*$)|\*{0,2}[a-d]\)\s+))/gi, '$1\n');
  text = text.replace(/(PHẦN\s*(?:[2-4]|II|III|IV)\s*:)[ \t]+(?!(?:TRẮC\s*NGHIỆM|CÂU\s*HỎI|BÀI\s*TẬP|TỰ\s*LUẬN|ĐÚNG|TRẢ\s*LỜI|NHIỀU|LỰA\s*CHỌN|PHẦN|MỖI|HƯỚNG\s*DẪN|ĐÁP\s*ÁN|LỜI\s*GIẢI)\b)(\S)/gi, '$1\n$2');

  const mathSplitParts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
  for (let i = 0; i < mathSplitParts.length; i++) {
    if (i % 2 === 1) {
      // Bên trong công thức: xóa khoảng trắng thừa sát dấu $ để remark-math nhận diện 100%
      if (mathSplitParts[i].startsWith('$$')) {
        mathSplitParts[i] = `$$${mathSplitParts[i].slice(2, -2).trim()}$$`;
      } else {
        mathSplitParts[i] = `$${mathSplitParts[i].slice(1, -1).trim()}$`;
      }
    }
  }
  for (let i = 0; i < mathSplitParts.length; i += 2) {
    let seg = mathSplitParts[i];
    if (!seg) continue;
    // Nếu trước công thức là chữ/số dính liền -> thêm khoảng trắng
    if (i + 1 < mathSplitParts.length && /[a-zA-ZÀ-ỹ0-9:]$/.test(seg)) {
      seg = seg + ' ';
    }
    // Nếu sau công thức là chữ/số dính liền -> thêm khoảng trắng
    if (i > 0 && /^[a-zA-ZÀ-ỹ0-9]/.test(seg)) {
      seg = ' ' + seg;
    }
    mathSplitParts[i] = seg;
  }
  text = mathSplitParts.join('');
  text = fixAndMergeMathArrows(text);
  // 1.1 Chỉ chuẩn hóa dấu sao quanh nhãn phương án [A-D] đứng đầu dòng nếu văn bản thực sự có PHẦN I, tuyệt đối không làm hỏng "(A. 90°, B. 0°, ...)" giữa câu hoặc "A.BCD"
  if (/PHẦN\s*(?:I\b|1\b)/i.test(text)) {
    text = text.replace(/(^|\n)[ \t]*(?:[-*•●]\s*)?(?:\*{1,3}|<b>)?(?:\(([A-D])\)|([A-D]))[\.\:](?:\*{1,3}|<\/b>)?(?:[ \t]+|(?=\$|\n|$))(?:\*{1,3}[ \t]*)?/g, (_m, nl, l1, l2) => {
      const letter = l1 || l2;
      return `${nl}${letter}. `;
    });
    text = text.replace(/(^|\n)[ \t]*([A-D]\.)(?![\s\*]|[A-Z]{2,})/gm, "$1$2 ");
  }

  // 2. Duyệt từng dòng và đánh số câu hỏi cho từng Phần I, II, III, IV
  const lines = text.split("\n");
  const result: string[] = [];
  let currentPart = 0; // 0 = Tóm tắt lý thuyết / ngoài bài tập; 1, 2, 3, 4 = Phần I, II, III, IV
  let qIndex = 0;
  let hasOpenQuestionInPart2 = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 0. Kiểm tra nếu là tiêu đề TÓM TẮT KIẾN THỨC / LÝ THUYẾT TRỌNG TÂM -> giữ currentPart = 0
    if (/^(?:#{1,4}|\*{2,3}|[I1]\.)?\s*(?:TÓM\s*TẮT|KIẾN\s*THỨC\s*TRỌNG\s*TÂM|LÝ\s*THUYẾT\s*TRỌNG\s*TÂM)/i.test(trimmed)) {
      currentPart = 0;
      hasOpenQuestionInPart2 = false;
      result.push(line);
      continue;
    }

    // 1. Kiểm tra dòng tiêu đề PHẦN I, II, III, IV
    const isSectionHeader = /^(?:#{1,4}|\*{2,3})?\s*(?:PHẦN\s*([1-4]|I{1,3}|IV)\b|TRẮC\s*NGHIỆM\s*NHIỀU\s*PHƯƠNG\s*ÁN|TRẮC\s*NGHIỆM\s*ĐÚNG\s*[\/\-]?\s*SAI|TRẮC\s*NGHIỆM\s*TRẢ\s*LỜI\s*NGẮN|BÀI\s*TẬP\s*TỰ\s*LUẬN|[A-D]\.\s*TRẮC\s*NGHIỆM|[A-D]\.\s*TỰ\s*LUẬN)/i.test(trimmed);
    if (isSectionHeader) {
      if (/TRẮC\s*NGHIỆM.*(?:NHIỀU|LỰA\s*CHỌN|A,?\s*B)|PHẦN\s*(?:I\b|1\b)|A\.\s*TRẮC/i.test(trimmed)) {
        currentPart = 1;
        qIndex = 1;
      } else if (/ĐÚNG\s*[\/\-]?\s*SAI|PHẦN\s*(?:II\b|2\b)|B\.\s*TRẮC/i.test(trimmed)) {
        currentPart = 2;
        qIndex = 1;
        hasOpenQuestionInPart2 = false;
      } else if (/TRẢ\s*LỜI\s*NGẮN|ĐIỀN\s*SỐ|PHẦN\s*(?:III\b|3\b)/i.test(trimmed)) {
        currentPart = 3;
        qIndex = 1;
      } else if (/TỰ\s*LUẬN|PHẦN\s*(?:IV\b|4\b)|B\.\s*TỰ|D\.\s*TỰ/i.test(trimmed)) {
        currentPart = 4;
        qIndex = 1;
      }
      result.push(line);
      continue;
    }

    // Nếu gặp tiêu đề kết thúc các phần bài tập (ví dụ Đáp án, Lời giải, Bảng đáp án, details)
    if (/^(?:#{1,4}|\*{2,3})?\s*(?:HƯỚNG DẪN|ĐÁP ÁN|LỜI GIẢI|BẢNG ĐÁP ÁN|<details)/i.test(trimmed)) {
      currentPart = 0;
      hasOpenQuestionInPart2 = false;
      result.push(line);
      continue;
    }

    // Nếu đang ở phần Tóm tắt lý thuyết (currentPart === 0):
    // TUYỆT ĐỐI KHÔNG biến các gạch đầu dòng '-' của phần lý thuyết thành "Câu 1:", "Câu 2:"!
    // Nếu trước đó lỡ bị biến thành "**Câu X:** Định nghĩa..." trong phần lý thuyết thì khôi phục lại gạch đầu dòng "- **...**"
    if (currentPart === 0) {
      if (/^\*{0,2}Câu\s*\d+[:\.]?\*{0,2}\s*(?:Định\s*nghĩa|Số\s*hạng\s*tổng\s*quát|Tính\s*chất|Tổng\s*n\s*số\s*hạng|Khái\s*niệm|Công\s*thức|Chú\s*ý|Nhận\s*xét|Ví\s*dụ)/i.test(trimmed)) {
        const restored = trimmed.replace(/^\*{0,2}Câu\s*\d+[:\.]?\*{0,2}\s*/i, '- ');
        result.push(restored);
        continue;
      }
      result.push(line);
      continue;
    }

    if (currentPart === 1) {
      // Bỏ qua nếu là dòng đáp án nhanh kiểu "1.C, 2.B, 3.C..."
      if (/^(?:Câu\s*)?1\s*[\.\):-]?\s*[A-D]\s*[,;-]\s*(?:Câu\s*)?2\s*[\.\):-]?\s*[A-D]/i.test(trimmed)) {
        result.push(line);
        continue;
      }

      // PHẦN I: Trắc nghiệm lựa chọn A, B, C, D
      const isQuestionStart =
        /^(?:[-*]\s+|\*{0,2}Câu\s*\d+[:\.]?\*{0,2}|\d+[\.\)]\s+)/i.test(trimmed) ||
        (!trimmed.startsWith("A.") && !trimmed.startsWith("B.") && !trimmed.startsWith("C.") && !trimmed.startsWith("D.") &&
         trimmed.includes("A.") && trimmed.includes("B.") && trimmed.includes("C.") && trimmed.includes("D."));

      if (isQuestionStart) {
        let stemLine = trimmed.replace(/^[-*]\s+/, "");
        if (/^(?:\*{0,2}Câu\s*\d+[:\.]?\*{0,2}|\d+[\.\)])\s*/i.test(stemLine)) {
          stemLine = stemLine.replace(/^(?:\*{0,2}Câu\s*\d+[:\.]?\*{0,2}|\d+[\.\)])\s*/i, `**Câu ${qIndex}:** `);
        } else {
          stemLine = `**Câu ${qIndex}:** ` + stemLine;
        }
        qIndex++;

        const cleanOpt = (s: string) => {
          if (!s) return '';
          return s
            .replace(/^[\s\-*•●_]+/, '')
            .replace(/[\s\*_]+$/, '')
            .replace(/^\*+\s*/, '')
            .replace(/\s*\*+$/, '')
            .trim();
        };

        // Kiểm tra xem A. B. C. D. có nằm chung dòng không (chỉ quét ngoài khối $...$/$$...$$ để bảo vệ $(SAD)$, $(BCD)$)
        const searchableStem = stemLine.replace(/\$\$[\s\S]*?\$\$|\$(?:\\.|[^\$\\\n])+?\$/g, (m) => 'M'.repeat(m.length));
        const mcMatch = searchableStem.match(/^(.*?)(?:\s+)(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?A[\.\):](?:\*{0,2}|<\/b>)?(?:\s+|(?=\$))([\s\S]*?)(?:\s+)(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?B[\.\):](?:\*{0,2}|<\/b>)?(?:\s+|(?=\$))([\s\S]*?)(?:\s+)(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?C[\.\):](?:\*{0,2}|<\/b>)?(?:\s+|(?=\$))([\s\S]*?)(?:\s+)(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?D[\.\):](?:\*{0,2}|<\/b>)?(?:\s+|(?=\$))([\s\S]*)$/);
        if (mcMatch) {
          const idxB = searchableStem.indexOf(mcMatch[3], mcMatch[1].length);
          const idxC = searchableStem.indexOf(mcMatch[4], idxB + mcMatch[3].length);
          const idxD = searchableStem.indexOf(mcMatch[5], idxC + mcMatch[4].length);
          const idxA = searchableStem.indexOf(mcMatch[2], mcMatch[1].length);
          const stem = stemLine.slice(0, mcMatch[1].length).trim();
          const optA = cleanOpt(stemLine.slice(idxA, idxA + mcMatch[2].length));
          const optB = cleanOpt(stemLine.slice(idxB, idxB + mcMatch[3].length));
          const optC = cleanOpt(stemLine.slice(idxC, idxC + mcMatch[4].length));
          const optD = cleanOpt(stemLine.slice(idxD));
          result.push(stem);
          result.push("");
          result.push(`- **A.** ${optA}`);
          result.push(`- **B.** ${optB}`);
          result.push(`- **C.** ${optC}`);
          result.push(`- **D.** ${optD}`);
          result.push(""); // Dòng trống ngăn cách
          continue;
        }

        // Kiểm tra nếu stemLine bị dính phương án A ở đuôi (ví dụ: "... là A. 15." hoặc "... bằng A. u_5 = 48.")
        // trong khi các phương án B, C, D nằm ở các dòng tiếp theo
        const trailingAMatch = searchableStem.match(/^(.*?)\s+(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?A[\.\):](?:\*{0,2}|<\/b>)?(?:\s+|(?=\$))([^\n]+)$/);
        if (trailingAMatch) {
          let hasNextB = false;
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (/^\s*(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?B[\.\):](?:\*{0,2}|<\/b>)?(?:\s+|(?=\$))/.test(lines[j].trim())) {
              hasNextB = true;
              break;
            }
          }
          if (hasNextB) {
            const optAStart = stemLine.length - trailingAMatch[2].length;
            const cleanStem = stemLine.slice(0, trailingAMatch[1].length).trim();
            const optA = cleanOpt(stemLine.slice(optAStart));
            result.push(cleanStem);
            result.push("");
            result.push(`- **A.** ${optA}`);
            continue;
          }
        }

        result.push(stemLine);
        continue;
      }

      // Chuẩn hóa các dòng phương án độc lập A., B., C., D. thành danh sách Markdown (- **A.** ...) để hiển thị dạng lưới 2/4 cột và xuất bảng Word chuẩn
      const cleanOpt = (s: string) => {
        if (!s) return '';
        return s
          .replace(/^[\s\-*•●_]+/, '')
          .replace(/[\s\*_]+$/, '')
          .replace(/^\*+\s*/, '')
          .replace(/\s*\*+$/, '')
          .trim();
      };

      // Nếu 1 dòng bắt đầu bằng A./B./C. nhưng lại dính tiếp nhiều phương án phía sau (vd: "B. ... C. ... D. ..." hoặc "C. ... D. ...")
      // Tách an toàn ngoài vùng $...$ để mọi câu hỏi luôn đủ 4 item tách biệt -> xuất bảng 4 cột / 2x2 chuẩn
      if (/^(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?[A-D][\.\):](?:\*{0,2}|<\/b>)?\s+[\s\S]+/.test(trimmed)) {
        const splitOptsOutsideMath = (lineStr: string): { letter: string; body: string }[] => {
          const found: { idx: number; markerLen: number; letter: string }[] = [];
          let inDollar = false;
          let inDoubleDollar = false;
          for (let k = 0; k < lineStr.length; k++) {
            const ch = lineStr[k];
            if (ch === '\\') { k++; continue; }
            if (ch === '$') {
              if (lineStr[k + 1] === '$') {
                inDoubleDollar = !inDoubleDollar;
                k++;
              } else if (!inDoubleDollar) {
                inDollar = !inDollar;
              }
              continue;
            }
            if (inDollar || inDoubleDollar) continue;
            if (k === 0 || /\s/.test(lineStr[k - 1])) {
              const sub = lineStr.slice(k);
              const m = sub.match(/^(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?([A-D])[\.\):](?:\*{0,2}|<\/b>)?\s+/);
              if (m) {
                const letter = m[1].toUpperCase();
                // Đảm bảo thứ tự chữ cái tăng dần (A -> B -> C -> D) để tránh tách nhầm chữ cái giữa câu
                if (found.length === 0 || letter.charCodeAt(0) === found[found.length - 1].letter.charCodeAt(0) + 1) {
                  found.push({ idx: k, markerLen: m[0].length, letter });
                  k += m[0].length - 1;
                }
              }
            }
          }
          if (found.length < 2) return [];
          const items: { letter: string; body: string }[] = [];
          for (let j = 0; j < found.length; j++) {
            const start = found[j].idx + found[j].markerLen;
            const end = j + 1 < found.length ? found[j + 1].idx : lineStr.length;
            items.push({
              letter: found[j].letter,
              body: cleanOpt(lineStr.slice(start, end)),
            });
          }
          return items;
        };

        const multiOpts = splitOptsOutsideMath(trimmed);
        if (multiOpts.length >= 2) {
          if (multiOpts[0].letter === 'A' && result.length > 0 && result[result.length - 1].trim() !== '' && !result[result.length - 1].trim().startsWith('- **')) {
            result.push("");
          }
          for (const opt of multiOpts) {
            result.push(`- **${opt.letter}.** ${opt.body}`);
          }
          if (multiOpts[multiOpts.length - 1].letter === 'D') {
            result.push("");
          }
          continue;
        }
      }

      const singleOptMatch = trimmed.match(/^(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?([A-D])[\.\):](?:\*{0,2}|<\/b>)?(?:\s+|(?=\$))([\s\S]+)$/);
      if (singleOptMatch) {
        const optLetter = singleOptMatch[1].toUpperCase();
        const optBody = cleanOpt(singleOptMatch[2]);
        if (optLetter === 'A' && result.length > 0 && result[result.length - 1].trim() !== '' && !result[result.length - 1].trim().startsWith('- **')) {
          result.push("");
        }
        result.push(`- **${optLetter}.** ${optBody}`);
        if (optLetter === 'D') {
          result.push("");
        }
        continue;
      }
    }

    if (currentPart === 2) {
      // PHẦN II: Trắc nghiệm Đúng/Sai
      // Các ý a), b), c), d) giữ nguyên vẹn; nếu gặp ý a) mà chưa có dòng "**Câu X:**" phía trước (do AI bỏ sót chữ Câu 1:) thì tự động chèn "**Câu X:**"
      if (/^(?:[-*]\s*)?\*{0,2}[a-d]\)[\s\S]*/i.test(trimmed)) {
        if (/^(?:[-*]\s*)?\*{0,2}a\)/i.test(trimmed) && !hasOpenQuestionInPart2) {
          result.push(`**Câu ${qIndex}:**`);
          qIndex++;
          hasOpenQuestionInPart2 = true;
        }
        if (/^(?:[-*]\s*)?\*{0,2}d\)/i.test(trimmed) || /\bd\)\s*(?:Đ|S|Đúng|Sai)\b/i.test(trimmed)) {
          hasOpenQuestionInPart2 = false;
        }
        result.push(line);
        continue;
      }
      // Dòng đề dẫn câu hỏi hoặc tiêu đề Câu X:
      if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("<")) {
        let stemLine = trimmed.replace(/^[-*]\s+/, "");
        if (/^(?:\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2}|\d+[\.\)])\s*/i.test(stemLine)) {
          stemLine = stemLine.replace(/^(?:\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2}|\d+[\.\)])\s*/i, `**Câu ${qIndex}:** `).trimEnd();
          qIndex++;
          hasOpenQuestionInPart2 = !/\bd\)\s*(?:Đ|S|Đúng|Sai)\b/i.test(stemLine);
        } else if (!hasOpenQuestionInPart2 && (/^(?:Cho|Xét|Trong|Giả sử|Biết)\b/i.test(stemLine) || qIndex === 1)) {
          stemLine = `**Câu ${qIndex}:** ` + stemLine;
          qIndex++;
          hasOpenQuestionInPart2 = !/\bd\)\s*(?:Đ|S|Đúng|Sai)\b/i.test(stemLine);
        }
        result.push(stemLine);
        continue;
      }
    }

    if (currentPart === 3 || currentPart === 4) {
      // PHẦN III & IV: Trắc nghiệm trả lời ngắn & Tự luận
      if (/^(?:[-*]\s+|\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2}|\d+[\.\)](?:\s+|$))/i.test(trimmed)) {
        let stemLine = trimmed.replace(/^[-*]\s+/, "");
        if (/^(?:\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2}|\d+[\.\)])\s*/i.test(stemLine)) {
          stemLine = stemLine.replace(/^(?:\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2}|\d+[\.\)])\s*/i, `**Câu ${qIndex}:** `);
        } else {
          stemLine = `**Câu ${qIndex}:** ` + stemLine;
        }
        qIndex++;
        result.push(stemLine);
        continue;
      } else if (qIndex === 1 && trimmed && !/^(?:#|<|\||---|\*{2,3}\s*(?:PHẦN|HƯỚNG|ĐÁP|LỜI))/i.test(trimmed)) {
        // Trường hợp câu 1 ngay sau PHẦN III / PHẦN IV bị AI bỏ sót nhãn "Câu 1:" (ví dụ mở đầu trực tiếp bằng công thức "$u_{10} = ...$")
        result.push(`**Câu ${qIndex}:** ${trimmed}`);
        qIndex++;
        continue;
      }
    }

    result.push(line);
  }

  return result.join("\n");
}

/**
 * Chuẩn hóa định dạng khu vực Đáp án & Hướng dẫn giải chi tiết trong Phiếu học tập:
 * - Tách các tiêu đề PHẦN I, II, III, IV ra dòng riêng với dòng trống ngăn cách.
 * - Đảm bảo mỗi "Câu 1:", "Câu 2:", ... (kể cả khi bị AI viết dính liền "Câu 1: ACâu 2: B" hoặc chỉ cách nhau 1 dấu xuống dòng)
 *   luôn nằm trên một đoạn (paragraph) tách biệt hoàn toàn với dòng trống ngăn cách.
 * - Trong PHẦN II (Đúng/Sai), tách riêng các ý a), b), c), d) thành từng đoạn rõ ràng.
 */
export function formatWorksheetSolutionSections(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') return markdown || '';

  // Bảo vệ các khối không được chỉnh sửa ($$...$$, $...$, <summary>...</summary>, <svg>...</svg>)
  const protectedBlocks: string[] = [];
  const protect = (src: string, regex: RegExp) =>
    src.replace(regex, (m) => {
      const idx = protectedBlocks.push(m) - 1;
      return `___SOL_PROTECTED_${idx}___`;
    });

  let s = markdown;
  s = protect(s, /<svg[\s\S]*?<\/svg>/gi);
  s = protect(s, /<summary[\s\S]*?<\/summary>/gi);
  s = protect(s, /\$\$[\s\S]*?\$\$/g);
  s = protect(s, /\\begin\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}/g);
  s = protect(s, /\$[^$\n]+\$/g);

  // 1. Tách tiêu đề PHẦN I/II/III/IV bị dính vào cuối dòng trước
  s = s.replace(/([^\n])\s*(#{1,4}\s*PHẦN\s+(?:I{1,3}|IV|[1-4])\b[^\n]*)/gi, '$1\n\n$2');
  s = s.replace(/([^\n])\s*(\*{2,3}\s*PHẦN\s+(?:I{1,3}|IV|[1-4])\b[^\n]*\*{2,3})/gi, '$1\n\n$2');

  // 2. Xử lý từng dòng (bỏ qua dòng bảng Markdown "|...|")
  const lines = s.split('\n');
  const processedLines: string[] = [];
  let inPartII = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^(?:#{1,4}|\*{2,3})?\s*PHẦN\s+(?:I{1,3}|IV|[1-4])\b/i.test(trimmed)) {
      inPartII = /PHẦN\s*(?:II\b|2\b)(?!\s*I)/i.test(trimmed);
      if (processedLines.length > 0 && processedLines[processedLines.length - 1].trim() !== '') {
        processedLines.push('');
      }
      processedLines.push(trimmed);
      processedLines.push('');
      continue;
    }

    if (/^\|.*\|$/.test(trimmed) || /^<details\b|^<\/details>/i.test(trimmed)) {
      processedLines.push(line);
      continue;
    }

    // Tách trường hợp các câu giải bị dính trên cùng 1 dòng:
    // Vd: "**Câu 1:** A **Câu 2:** B" hoặc "Câu 1: ACâu 2: B" hoặc "... 200.Câu 2:" hoặc "... ).Câu 2:"
    // Không tách nếu ngay trước "Câu N:" là giới từ tham chiếu tiếng Việt (từ, theo, ở, tại, xem, như, của, trong, với, sau, trước, giống)
    let expanded = line.replace(
      /([^\s\n*])([ \t]*)(\*{0,2}(?:Câu|Bài)\s+\d+\s*:)/g,
      (full, prevCh, _sp, qLabel, offset, whole) => {
        const beforeContext = whole.slice(Math.max(0, offset - 14), offset + 1);
        if (/(?:^|\s)(?:từ|theo|ở|tại|xem|như|của|trong|với|sau|trước|giống|giữa|về|sang|tới|đến)\s*$/i.test(beforeContext)) {
          return full;
        }
        if (/[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(prevCh)) {
          return full;
        }
        return `${prevCh}\n\n${qLabel}`;
      }
    );

    // Trường hợp kết thúc cụm in đậm rồi sang câu mới cách nhau bởi dấu cách: "**Đáp số: 200.** **Câu 2:**"
    expanded = expanded.replace(
      /(\*{2})([ \t]+)(\*{0,2}(?:Câu|Bài)\s+\d+\s*:)/g,
      (full, prevBold, _sp, qLabel, offset, whole) => {
        const beforeContext = whole.slice(Math.max(0, offset - 16), offset);
        if (/(?:^|\s)(?:từ|theo|ở|tại|xem|như|của|trong|với|sau|trước|giống|giữa|về)\s*$/i.test(beforeContext)) {
          return full;
        }
        return `${prevBold}\n\n${qLabel}`;
      }
    );

    const subLines = expanded.split('\n');
    for (const sub of subLines) {
      const subTrim = sub.trim();
      if (!subTrim) {
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('');
        }
        continue;
      }

      if (/^(?:[-*•●]\s*)?\*{0,2}(?:Câu|Bài)\s+\d+\s*[:.]/i.test(subTrim)) {
        const cleanedQ = subTrim
          .replace(/^[-*•●]\s*/, '')
          .replace(/^(?:\*{0,2})((?:Câu|Bài)\s+\d+\s*[:.])(?:\*{0,2})\s*/i, '**$1** ');
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('');
        }
        processedLines.push(cleanedQ);
        continue;
      }

      if (inPartII && /^(?:[-*•●]\s*)?\*{0,2}[a-d]\)(?:\*{0,2})\s+/i.test(subTrim)) {
        const cleanedSubItem = subTrim.replace(/^[-*•●]\s*/, '');
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('');
        }
        processedLines.push(cleanedSubItem);
        continue;
      }

      processedLines.push(sub);
    }
  }

  let res = processedLines.join('\n').replace(/\n{3,}/g, '\n\n');

  for (let pass = 0; pass < 3; pass++) {
    if (!res.includes('___SOL_PROTECTED_')) break;
    res = res.replace(/___SOL_PROTECTED_(\d+)___/g, (_, idx) => protectedBlocks[Number(idx)] ?? '');
  }

  return res.trim();
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

export function wrapUnenclosedLatexMath(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  let s = text;

  // 1. Fix common TeX command typos and symbols
  s = s.replace(/\\RightArrow\b/g, '\\Rightarrow');
  s = s.replace(/\\LeftArrow\b/g, '\\Leftarrow');
  s = s.replace(/\\LeftRightArrow\b/g, '\\Leftrightarrow');
  s = s.replace(/\bChoa\\vec\b/gi, 'Cho \\vec{a}');
  s = s.replace(/\bChoA\b/g, 'Cho $A$');
  s = s.replace(/\bChoB\b/g, 'Cho $B$');
  s = s.replace(/\bChoC\b/g, 'Cho $C$');
  s = s.replace(/\bChoO\b/g, 'Cho $O$');

  // 2. Strip stray asterisks around line-start option letters only when inside an explicit PHẦN I / Câu trắc nghiệm block (never strip '(' in inline '(A. 90°, B. 0°)')
  if (/PHẦN\s*(?:I\b|1\b)/i.test(s)) {
    s = s.replace(/(^|\n)[ \t]*(?:[-*•●]\s*)?(?:\*{1,3}|<b>)?(?:\(([A-D])\)|([A-D]))[\.\:](?:\*{1,3}|<\/b>)?[ \t]*(?:\*{1,3}[ \t]*)?/g, (_m, nl, l1, l2) => {
      const letter = l1 || l2;
      return `${nl}${letter}. `;
    });
  }

  return s;
}

export function preprocessMathText(text: any): string {
  if (text === null || text === undefined) return '';
  let str = String(text);
  str = fixAndMergeMathArrows(str);
  str = wrapUnenclosedLatexMath(str);
  str = cleanSectionTitles(str);
  str = fixSystemOfEquationsAndCases(str);
  str = fixMergedVietnameseWords(str);
  str = fixBrokenLatexSyntax(str);
  str = rescueTrappedVietnameseFromMath(str);
  str = sanitizeLatexMathAndDelimiters(str);
  str = normalizeMathText(str);
  str = cleanMathAndUnwrapHeadings(str);
  str = formatWorksheetQuestionsAndSections(str);
  str = fixAndMergeMathArrows(str);
  str = formatQuickAnswerTables(str);
  str = cleanSectionTitles(str);
  str = fixAndMergeMathArrows(str);
  return str;
}


/**
 * Hàm tiền xử lý nhẹ dành riêng cho chuỗi LaTeX bên trong cặp dấu $...$ của MathJax preFilter.
 * TUYỆT ĐỐI KHÔNG tự chèn thêm dấu $ hay chạy định dạng văn bản Markdown để tránh làm hỏng cú pháp TeX hoặc treo trình duyệt.
 */
export function cleanInnerMathLatex(tex: any): string {
  if (tex === null || tex === undefined) return '';
  let s = String(tex);
  s = s.replace(/\\dfrac\b/g, '\\frac');
  s = s.replace(/\\geq(?![a-zA-Z])/g, '\\ge ');
  s = s.replace(/\\leq(?![a-zA-Z])/g, '\\le ');
  s = s.replace(/\\{2,}(Leftarrow|Rightarrow|Leftrightarrow|iff|implies)\b/gi, '\\$1');
  s = s.replace(/\b([uSa-zA-Z])_([a-zA-Z0-9]+)\s*\+\s*(\d+)\}/g, '$1_{$2+$3}');
  s = s.replace(/\b([uSa-zA-Z])_([a-zA-Z0-9]+)\s*-\s*(\d+)\}/g, '$1_{$2-$3}');
  s = s.replace(/\\frac\s*\{\s*u_?1\s*\(\s*1\s*-\s*q\s*\^?\s*\{?n\}?\s*\)\s*\}\s*\{\s*1\s*\}\s*-\s*q\s*\}/g, '\\frac{u_1(1-q^n)}{1-q}');
  s = s.replace(/\\frac\s*\{\s*u_?1\s*\(\s*q\s*\^?\s*\{?n\}?\s*-\s*1\s*\)\s*\}\s*\{\s*1\s*\}\s*-\s*q\s*\}/g, '\\frac{u_1(q^n-1)}{q-1}');
  s = s.replace(/\{\s*1\s*\}\s*-\s*q\s*\}/g, '{1 - q}');
  s = s.replace(/\\sqrt\s*\{([^{}\$\n]+)\}\s*((?:[\+\-]\s*[0-9a-zA-Z_\^\(\)]+\s*)+)\}/g, '\\sqrt{$1 $2}');
  s = s.replace(/\\frac\s+([\+\-]?[0-9a-zA-Z_\^\(\)\+\-\s]+)\}\s*\{([^{}\$\n]+)\}/g, '\\frac{$1}{$2}');
  s = s.replace(/\\frac\s*\{([^{}\$\n]+)\}\s+([\+\-]?[0-9a-zA-Z_\^\(\)\+\-\s]+)\}/g, '\\frac{$1}{$2}');

  // Sửa lỗi Extra close brace or missing open brace: cân bằng ngoặc nhọn { và } trong biểu thức TeX
  const openCount = (s.match(/(?<!\\)\{/g) || []).length;
  const closeCount = (s.match(/(?<!\\)\}/g) || []).length;
  if (closeCount > openCount) {
    let diff = closeCount - openCount;
    while (diff > 0 && /\}/.test(s)) {
      if (s.trim().endsWith('}')) {
        s = s.trim().replace(/\}$/, '');
      } else {
        s = s.replace(/\}(?![^{}]*\{)/, '');
      }
      diff--;
    }
  } else if (openCount > closeCount) {
    s = s + '}'.repeat(openCount - closeCount);
  }
  return s;
}

let isObserverActive = false;

export function setupGlobalMathObserver() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (isObserverActive) return;

  isObserverActive = true;

  // Expose global helpers on window
  // LƯU Ý QUAN TRỌNG: index.html gọi window.preprocessMathText bên trong MathJax tex preFilter (trên chuỗi công thức nội bộ đã bóc $).
  // Do đó window.preprocessMathText phải là cleanInnerMathLatex để không bao giờ chèn thêm dấu $ vào bên trong công thức!
  (window as any).normalizeMathText = normalizeMathText;
  (window as any).preprocessMathText = cleanInnerMathLatex;
  (window as any).preprocessDocumentMathText = preprocessMathText;
  (window as any).triggerGlobalMathRender = triggerGlobalMathRender;

  const observer = new MutationObserver((mutations) => {
    let shouldRender = false;
    for (const mutation of mutations) {
      const targetEl = mutation.target.nodeType === Node.ELEMENT_NODE
        ? (mutation.target as HTMLElement)
        : mutation.target.parentElement;
      if (
        targetEl &&
        (targetEl.closest('.math-view-container') ||
          targetEl.closest('.markdown-body') ||
          targetEl.closest('[data-math-streaming="true"]'))
      ) {
        continue;
      }

      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName ? el.tagName.toUpperCase() : '';

            // Skip MathJax internal SVG/MJX elements, form inputs, and self-typesetting components
            if (
              tag.startsWith('MJX') ||
              tag === 'SVG' ||
              tag === 'PATH' ||
              tag === 'G' ||
              tag === 'RECT' ||
              tag === 'TEXT' ||
              ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'PRE', 'CODE'].includes(tag) ||
              el.classList.contains('MathJax') ||
              el.classList.contains('math-view-container') ||
              el.classList.contains('markdown-body') ||
              el.closest('mjx-container') ||
              el.closest('.math-view-container') ||
              el.closest('.markdown-body') ||
              el.closest('[data-math-streaming="true"]')
            ) {
              continue;
            }

            const text = el.textContent || '';
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
            parent.closest('mjx-container') ||
            parent.closest('.math-view-container') ||
            parent.closest('.markdown-body') ||
            parent.closest('[data-math-streaming="true"]') ||
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

/**
 * Plugin to strip all inline DOM event handlers (onclick, onload, onerror, etc.)
 * from HAST nodes produced by rehype-raw. This prevents React from throwing:
 * "Expected `onClick` listener to be a function, instead got a value of `string` type."
 */
export function rehypeSanitizeEventHandlers() {
  return (tree: any) => {
    function visit(node: any) {
      if (node && node.children && Array.isArray(node.children)) {
        node.children = node.children.filter((child: any) => {
          if (child && child.type === 'element' && typeof child.tagName === 'string') {
            const tag = child.tagName.toLowerCase();
            if (tag === 'script' || tag === 'noscript') {
              return false;
            }
          }
          return true;
        });
      }
      if (node && node.type === 'element' && node.properties) {
        for (const key of Object.keys(node.properties)) {
          if (
            /^on[a-zA-Z]/i.test(key) ||
            (typeof node.properties[key] === 'string' && key.toLowerCase().startsWith('on'))
          ) {
            delete node.properties[key];
          }
        }
      }
      if (node && node.children && Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
    }
    visit(tree);
  };
}

/**
 * Filter out any invalid event handler props (like onClick="string")
 * before spreading props onto React DOM elements.
 */
export function cleanProps<T extends Record<string, any>>(props: T): T {
  if (!props || typeof props !== 'object') return props;
  const result: any = {};
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on') && typeof value !== 'function') {
      continue;
    }
    result[key] = value;
  }
  return result;
}
