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

  if (!hasVietnamese && !isSentential) {
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
  if (!mathStr || (!mathStr.includes('\\left') && !mathStr.includes('\\right'))) return mathStr;
  let s = mathStr;

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

  // 2. Sửa các lệnh lượng giác/logarit/giới hạn/lượng giác ngược dính chữ (vd: \sinA -> \sin A, \cosB -> \cos B)
  s = s.replace(/\\(sin|cos|tan|cot|lim|ln|log|arcsin|arccos|arctan)(?!h\b)([A-Za-z])(?![a-zA-Z0-9])/g, (_m, fn, arg) => `\\${fn} ${arg}`);

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

  // 2. Standardize genuine \begin{cases} ... \end{cases} blocks:
  // - Clean inner stray dollar signs
  // - Ensure line breaks inside cases use \\
  s = s.replace(/\\begin\s*\{cases\*?\}\s*([\s\S]*?)\s*\\end\s*\{cases\*?\}/gi, (fullMatch, body) => {
    const cleanBody = body.replace(/(?<!\\)\$/g, '').trim();
    let lines = cleanBody.split(/(?:\\\\|\n+)/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 1) {
      return `\\begin{cases}\n${lines.join(' \\\\\n')}\n\\end{cases}`;
    }
    return fullMatch;
  });

  // 3. Normalize explicit \left\{ ... \right. only when containing at least 2 distinct equations
  s = s.replace(/\\left\s*\\\{\s*([\s\S]*?)\s*\\right\s*[.\}]/gi, (fullMatch, body) => {
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i.test(body) && !body.includes('=')) {
      return fullMatch;
    }
    const cleanBody = body.replace(/(?<!\\)\$/g, '').trim();
    let lines = cleanBody.split(/(?:\\\\|\n+)/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2 && lines.every(l => /[=<>\le\ge\neq]/.test(l))) {
      return `\\begin{cases}\n${lines.join(' \\\\\n')}\n\\end{cases}`;
    }
    return fullMatch;
  });

  // 4. Clean stray dollars or orphan \end{cases}
  s = s.replace(/(\\end\{cases\})\s*\$+/gi, '$1');
  s = s.replace(/(\\end\{cases\})\s*\\end\{cases\}/gi, '$1');
  s = s.replace(/^[ \t]*\\end\{cases\}[ \t]*$/gm, '');

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

  // Tách riêng nếu tiêu đề PHẦN bị dính với Câu hỏi trên cùng 1 dòng:
  s = s.replace(/(PHẦN\s*(?:[1-4]|I{1,4}|IV)\b[^:\n]*:?[^\n]*?)(?=\s+(?:\*{0,2}(?:Câu|Bài)\s*\d+))/gi, '$1\n\n');

  // Clean dollar math tags and asterisks inside section headers ONLY:
  s = s.replace(/(?:^|\n)[ \t]*(?:\*{1,3}|#{1,4}|<[^>]+>)*[ \t]*(PHẦN\s*(?:[1-4]|I{1,4}|IV)\b[^\n]*)/gi, (_fullMatch, header) => {
    // Nếu có Câu hỏi lọt vào header do dính dòng, tách ra để bảo vệ công thức toán
    const qMatch = header.match(/^(.*?)(\s+(?:\*{0,2}(?:Câu|Bài)\s*\d+[\s\S]*))$/i);
    let title = header;
    let rest = '';
    if (qMatch) {
      title = qMatch[1];
      rest = '\n\n' + qMatch[2].trim();
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
  s = s.replace(/_\{\s*\{/g, '_{');
  s = s.replace(/(\\frac\{[^{}]*\}\{[^{}]*\})\}\}/g, '$1}');
  s = s.replace(/_\{\s*\\text\{/g, '_{\\text{');

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
        const cleanNums = numbers.slice(0, 6);
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

  // 0. Gỡ bỏ lề khoảng trắng / tab (indented code block) cho các dòng chứa công thức toán hoặc tiêu đề
  s = s.replace(/^[ \t]{2,8}(?=\$\$|\$|\\begin|\\end|\\frac|\\sqrt|\\vec|\\Left|\\Right|\\iff|\\implies|\*{0,2}(?:Câu|Bài)\s*\d+|#{1,4}|PHẦN|Lời giải|Đáp án|Hệ|Ta có|Suy ra|Do đó|[a-d]\))/gm, '');

  // 0.0005 Chuẩn hóa dấu đô la thừa (vd: $$$ -> $, $$$$ -> $$) và dọn các cặp $ rỗng
  s = s.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');
  s = s.replace(/(?<!\$)\$\s*\$(?!\$)/g, '');

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
  // TUYỆT ĐỐI KHÔNG bọc chữ tiếng Việt in hoa (như NGHIỆM, NHIỀU, PHẦN, III, SAI)
  s = s.replace(/(?<![\$\wÀ-ỹ])([A-Z]{1,4}\.\s*[A-Z0-9\']{2,8})(?![\$\wÀ-ỹ])/g, (m) => '$' + m.replace(/\.\s+/, '.') + '$');

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

  // 0.009 Chuẩn hóa các điểm hình học có dấu phẩy/nháy đơn ($A'$, $B'$, $C'$, $D'$)
  s = s.replace(/(?<![\$\wÀ-ỹ])([A-Z]{1,6}\.[A-Z0-9\']+)(?![\$\wÀ-ỹ])/g, '$$$1$$');
  s = s.replace(/(?<![\$\wÀ-ỹ])\b([A-Z])'([,;\s\.\)\]]|$)/g, '$$$1\'$$$2');

  // 0.01 Sửa lỗi thiếu ngoặc đóng chỉ số dưới: S_{15 = \frac{...} -> S_{15} = \frac{...}, u_{12 = u_1 -> u_{12} = u_1
  s = s.replace(/([uSa-zA-Z])_\{(\d{1,3})\s*=\s*/g, '$1_{$2} = ');
  s = s.replace(/([uSa-zA-Z])_\{(\d{1,3})\s*([\+\-\*\/])/g, '$1_{$2} $3 ');
  s = s.replace(/([uSa-zA-Z])_\{(\d{1,3})\s+(\\frac|\\cdot|[a-zA-Z]{2,})/g, '$1_{$2} $3');

  // 0.015 Vá lỗi rách cú pháp phân số \frac:
  // a) Tự động sửa {frac{ và |frac{ và frac{ thành \frac{
  s = s.replace(/[\{\|]frac\s*\{/g, '\\frac{');
  s = s.replace(/(?<!\\)\bfrac\s*\{/g, '\\frac{');
  // b) Tự động bù dấu đóng ngoặc } cho phân số nếu cuối biểu thức bị thiếu ngay trước $ hoặc $$ hoặc cuối dòng
  s = s.replace(/(\\frac\s*\{(?:[^{}]|\{[^{}]*\})*\}\s*\{[^{}\n\$]+?)(?=\s*(?:\$\$?|[\r\n]|$))/g, '$1}');
  // c) Dọn sạch dấu } thừa do {frac{...}{...}} -> \frac{...}{...}}
  s = s.replace(/(\\frac\s*\{(?:[^{}]|\{[^{}]*\})*\}\s*\{(?:[^{}]|\{[^{}]*\})*\})\}/g, '$1');

  // 0.016 Tự động tách dòng cho các mục Tóm tắt kiến thức / Lý thuyết (- **...:**)
  s = s.replace(/([^\n])\s*(?:[-*•–—]|\u2022)?\s*(\*\*\s*(?:Định\s*nghĩa|Khái\s*niệm|Số\s*hạng\s*tổng\s*quát|Tính\s*chất|Tổng\s*n\s*số\s*hạng|Quy\s*tắc|Công\s*thức|Định\s*lý|Hệ\s*thức|Chú\s*ý|Nhận\s*xét|Ví\s*dụ|Lưu\s*ý)[^*:]*?:\s*\*\*)/gi, '$1\n\n- $2');
  s = s.replace(/([^\n])\s+[-*•–—]\s*(\*\*[^*:]+?:\s*\*\*)/g, '$1\n\n- $2');
  s = s.replace(/([^\n])\s*(?:[-*•–—]|\u2022)\s*(\*\*\s*[^:*]+?:\s*\*\*)/g, '$1\n\n- $2');

  // 0.018 Loại bỏ các đoạn suy luận nháp, tự kiểm tra đề bài, hay câu bình luận ngoài lề của AI:
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

  // 0.045 Tách các nhãn câu bị dính chùm: **Câu 6:** * **Câu 7:**
  s = s.replace(/(\*\*(?:Câu|Bài)\s*\d+[:\.]?\*\*)\s*[\*•-]\s*(\*\*(?:Câu|Bài)\s*\d+[:\.]?\*\*)/gi, '$1\n\n$2');

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

  // 1. Loại bỏ các khối math rỗng $$$$, $$ $$, $ $
  s = s.replace(/\$\$\s*[\r\n]*\s*\$\$/g, '');
  s = s.replace(/(?<!\$)\$\s*[\r\n]*\s*\$(?!\$)/g, '');
  s = s.replace(/You can't use 'macro parameter character #' in math mode/gi, '');
  s = s.replace(/Extra\s*close\s*brace\s*or\s*missing\s*open\s*brace/gi, '');
  s = s.replace(/Math\s*output\s*error/gi, '');

  // 2. Tự động giải phóng các khối $$ vô tình bọc các tiêu đề Markdown, tiêu đề phần, hoặc tiêu đề câu
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (fullMatch, body) => {
    if (/(?:#{1,6}\s+|(?:\*{0,2})(?:Câu|Bài)\s*\d+[:\.]?|PHẦN\s*(?:[1-4]|I{1,3}|IV)|^\s*[-*]\s+\*\*[A-D]\.\*\*|^\s*[a-d]\))/m.test(body)) {
      return body.replace(/\$\$/g, '');
    }
    return fullMatch;
  });

  // 3. Chuẩn hóa hệ phương trình \begin{cases} ... \end{cases}:
  // a) Loại bỏ dấu $ lồng bên trong cases trước
  s = s.replace(/\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\}/gi, (match) => {
    let clean = match.replace(/(?<!\\)\$/g, '');
    clean = clean.replace(/(?<!\\)\\(?=\s*(?:\r?\n|$))/g, ' \\\\ ');
    clean = clean.replace(/\\{3,}/g, ' \\\\ ');
    clean = clean.replace(/\\\\(?:\s*\\\\)+/g, ' \\\\ ');
    clean = clean.replace(/\\\\(?=\s*\\end\{cases)/gi, ' ');
    clean = clean.replace(/\\?\{\s*=/g, ' =');
    clean = clean.replace(/\\?\{\s*([0-9a-zA-Z_\-+\=]+)\s*=/g, '$1 =');
    return clean;
  });
  // b) Bọc $$ nếu \begin{cases} đứng trần ngoài math (kể cả chuỗi hệ phương trình tương đương nối bằng \Leftrightarrow, \iff...)
  s = s.replace(/(?<!\$)(?:\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\}(?:\s*(?:\\Leftrightarrow|\\Leftarrow|\\Rightarrow|\\iff|\\implies|<=>|=>)\s*\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})*)(?!\$)/gi, (match) => {
    return `\n\n$$\n${match.trim()}\n$$\n\n`;
  });

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

  // 4.1 Khôi phục ngoặc nhọn đóng } bị thiếu ngay trước $ hoặc $. (vd: \vec{AC$, \vec{CA$., \frac{...}{2$, \sqrt{3$, \text{ J$)
  s = s.replace(/(\\vec\{[A-Za-z0-9_'\^]+?)\s*\$/g, '$1}$');
  s = s.replace(/(\\frac\{(?:[^{}]|\{[^{}]*\})+\}\{[^{}\$\n]+?)\s*\$/g, '$1}$');
  s = s.replace(/(\\sqrt(?:\[[^\]]*\])?\{[^{}\$\n]+?)\s*\$/g, '$1}$');
  s = s.replace(/(\\(?:text|mathrm|mathbf)\{[^{}\$\n]+?)\s*\$/g, '$1}$');
  s = s.replace(/([uSa-zA-Z]_\{[^{}\$\n]+?)\s*\$/g, '$1}$');
  s = s.replace(/(\^\{[^{}\$\n]+?)\s*\$/g, '$1}$');

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

  return fixAndMergeMathArrows(s);
}

export function fixAndMergeMathArrows(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
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
  while (prev !== s) {
    prev = s;
    s = s.replace(/\$([^\$\n]+?)\$\s*(?:\\(Rightarrow|Leftrightarrow|Leftarrow|iff|implies)|\$\s*\\(Rightarrow|Leftrightarrow|Leftarrow|iff|implies)\s*\$|<=>|=>)\s*\$([^\$\n]+?)\$/g, (_m, a, arrow1, arrow2, b) => {
      const arr = arrow1 || arrow2;
      const cleanArrow = arr ? `\\${arr}` : (_m.includes('<=>') ? '\\Leftrightarrow' : '\\Rightarrow');
      return `$${a.trim()} ${cleanArrow} ${b.trim()}$`;
    });
  }

  // 3. Bọc chuỗi biến đổi suy ra / tương đương trần chưa có $
  s = s.replace(/((?:^|[:.?!]|\s)(?:Ta có|Suy ra|Do đó|Khi đó|Vậy|Đúng\.|Sai\.|Đúng|Sai)[:\s]*)([a-zA-Z0-9_\{\}\(\)\[\]\+\-\*\/\^\=\s\.\,\;\\|]+?\\(?:Rightarrow|Leftrightarrow|Leftarrow|iff|implies)[a-zA-Z0-9_\{\}\(\)\[\]\+\-\*\/\^\=\s\.\,\;\\|]+?)(?=(?:\.\s+[A-ZÀ-Ỹ]|\.\s*$|\.\s*\n|\s*\((?:là|với|điều)|Đáp\s*số|\n|$))/gi, (_m, lead, math) => {
    let clean = math.trim().replace(/\$+$/, '').replace(/^\$+/, '');
    if (!clean || clean.includes('$')) return _m;
    return `${lead}$${clean}$`;
  });

  // 4. Nếu mũi tên đứng cạnh biểu thức toán chưa bọc $ (vd: \Rightarrow 46 = 10 + 9d)
  s = s.replace(/(?:\\(Rightarrow|Leftrightarrow|Leftarrow|iff|implies)|=>|<=>)\s*([0-9a-zA-Z_\{\}\(\)\[\]\+\-\*\/\^\=]+(?:\s*[=+\-\*\/]\s*[0-9a-zA-Z_\{\}\(\)\[\]\+\-\*\/\^\=]+)+)(?=(?:\.\s+[A-ZÀ-Ỹ]|\.\s*$|\.\s*\n|\s*\((?:là|với|điều)|Đáp\s*số|\\|;|,|\n|$))/g, (_m, arrow, expr) => {
    const cleanArrow = arrow ? `\\${arrow}` : (_m.includes('<=>') ? '\\Leftrightarrow' : '\\Rightarrow');
    let cleanExpr = expr.trim();
    if (cleanExpr.includes('$')) return _m;
    return `$${cleanArrow} ${cleanExpr}$`;
  });

  // 5. Nếu còn bất kỳ mũi tên suy luận trần nào hoàn toàn đứng một mình NGOÀI $: bọc $\Rightarrow$
  const parts = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i]) {
      parts[i] = parts[i].replace(/(?<![\$\\\w])(\\RightArrow|\\Rightarrow|\\Leftrightarrow|\\Leftarrow|\\iff|\\implies)(?![\$\w])/g, '$$$1$$');
    }
  }
  s = parts.join('');

  // 6. Gộp lại các khối math liền kề sau khi đã bọc:
  prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/\$([^\$\n]+?)\$\s*\$\s*\\(Rightarrow|Leftrightarrow|Leftarrow|iff|implies)\s*\$\s*\$([^\$\n]+?)\$/g, (_m, a, arrow, b) => {
      return `$${a.trim()} \\${arrow} ${b.trim()}$`;
    });
    s = s.replace(/\$([^\$\n]+?)\$\s*(?:\\(Rightarrow|Leftrightarrow|Leftarrow|iff|implies))\s*\$([^\$\n]+?)\$/g, (_m, a, arrow, b) => {
      return `$${a.trim()} \\${arrow} ${b.trim()}$`;
    });
    s = s.replace(/\$([^\$\n]+?)\$\s*\$([^\$\n]+?)\$/g, (_m, a, b) => {
      if (a.endsWith('\\Rightarrow') || a.endsWith('\\Leftrightarrow') || b.startsWith('\\Rightarrow') || b.startsWith('\\Leftrightarrow')) {
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
  // Bảo vệ các lệnh TeX bắt đầu bằng \n
  s = s.replace(/\\neq\b/g, '___TEX_NEQ___');
  s = s.replace(/\\notin\b/g, '___TEX_NOTIN___');
  s = s.replace(/\\nexists\b/g, '___TEX_NEXISTS___');
  s = s.replace(/\\nearrow\b/g, '___TEX_NEARROW___');
  s = s.replace(/\\nabla\b/g, '___TEX_NABLA___');
  s = s.replace(/\\nu\b/g, '___TEX_NU___');

  // Đổi các literal \n hoặc \\n thành ký tự xuống dòng thực tế
  s = s.replace(/\\\\n/g, '\n');
  s = s.replace(/\\n/g, '\n');

  // Khôi phục lại các lệnh TeX
  s = s.replace(/___TEX_NEQ___/g, '\\neq');
  s = s.replace(/___TEX_NOTIN___/g, '\\notin');
  s = s.replace(/___TEX_NEXISTS___/g, '\\nexists');
  s = s.replace(/___TEX_NEARROW___/g, '\\nearrow');
  s = s.replace(/___TEX_NABLA___/g, '\\nabla');
  s = s.replace(/___TEX_NU___/g, '\\nu');

  // 2. Tách các câu văn dính liền sau dấu chấm
  s = s.replace(/\.([A-ZÀ-Ỹ])/g, '. $1');

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
  s = s.replace(/(?<!\$)\$\s*\$(?!\$)/g, '');

  // Clean orphan artifacts and MathJax raw error strings
  s = s.replace(/You can't use 'macro parameter character #' in math mode/gi, '');
  s = s.replace(/(?:^|\n)\s*(?:SS|S)?0?\s*\$\.\s*/gi, '\n');
  s = s.replace(/(?:^|\n)\s*SS0\.\s*\*{0,2}Câu\s*\d+:?\*{0,2}SS\s*/gi, '\n');
  s = s.replace(/(?:^|\n)\s*d\$\.\s*/gi, '\n');

  // Đảm bảo các tiêu đề câu hỏi **Câu X:** trong lời giải được ngắt dòng riêng biệt
  s = s.replace(/([^\n])\s*(\*{0,2}Câu\s*\d+[:\.]?\*{0,2})/gi, '$1\n\n$2');

  // 3.5. Giải phóng các khối $$ vô tình bọc trần toàn bộ câu hỏi hoặc nhiều tiêu đề/mục nhỏ
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (fullMatch, body) => {
    if (/(?:\*\*(?:Câu|Bài)\s*\d+:?\*\*|#{1,4}\s*PHẦN|^\s*[-*]\s+[a-d]\)|^\s*[a-d]\))/m.test(body)) {
      return body.replace(/\$\$/g, '');
    }
    return fullMatch;
  });

  // 3.6. Chuyển đổi hệ phương trình trần dạng { eq1 \n { eq2 thành \begin{cases} eq1 \\ eq2 \end{cases}
  s = s.replace(/(?:(?:^|\n)\s*\\?\{\s*[^{}\n]+=[^\n]+){2,}/g, (match) => {
    const eqLines = match.trim().split('\n').map(l => l.replace(/^\s*\\?\{\s*/, '').trim()).filter(Boolean);
    if (eqLines.length >= 2) {
      return `\n\n$$\\begin{cases}\n${eqLines.join(' \\\\\n')}\n\\end{cases}$$\n\n`;
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

      // d. Bọc chuỗi biến đổi suy ra / tương đương: e.g. u_{10} = u_1 + 9d \Rightarrow 46 = 10 + 9d \Rightarrow 9d = 36 \Rightarrow d = 4
      p = p.replace(/(?<![\$\\\w])([uSa-zA-Z0-9_\{\}\(\)\[\]\+\-\*\/\^\=\s]+?\s*\\(?:Rightarrow|Leftarrow|Leftrightarrow|iff|implies)\s*[uSa-zA-Z0-9_\{\}\(\)\[\]\+\-\*\/\^\=\s\\\(\)]+?)(?=[,;.!?]|\s+(?:được|là|tính|theo|bằng|với|khi|thì|tại|trong|ta|Phát\s+biểu|Đáp|\(Đúng\)|\(Sai\)|\n)|$)/g, (match) => {
        let clean = match.trim();
        if (clean.includes('$')) return match;
        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean.replace(/\\text\{[^{}]*\}/g, ''))) return match;
        return saveMath(`$${clean}$`);
      });

      // Auto-wrap standalone \Rightarrow or \Leftrightarrow or \to lines
      p = p.replace(/(?<![\$\w])(\\RightArrow|\\Rightarrow|\\Leftrightarrow|\\Leftarrow|\\iff|\\implies|\\to\b|\\rightarrow\b)(?![\$\w])/g, (m) => saveMath(`$${m}$`));

      // a. Bọc chuỗi cases liên tiếp hoặc đơn lẻ
      p = p.replace(/(?<!\$)(?:(?:\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})(?:\s*\\(?:Leftrightarrow|Rightarrow|Leftarrow|iff|implies)\s*\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})+)(?!\$)/g, (m) => saveMath(`\n\n$$\n${m.trim()}\n$$\n\n`));
      p = p.replace(/(?<!\$)(?:\\begin\s*\{(?:cases|aligned|matrix|pmatrix|bmatrix)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|matrix|pmatrix|bmatrix)\*?\})(?!\$)/g, (m) => saveMath(`\n\n$$\n${m.trim()}\n$$\n\n`));

      // b. Bọc Tích phân, Đạo hàm, Giới hạn, Tổng, Tích
      p = p.replace(/(?<![\$\\\w])(\\int(?:_\{[^{}]*\}|\^\{[^{}]*\}|_[a-zA-Z0-9\-+\\infty]+|\^[a-zA-Z0-9\-+\\infty]+)*[\s\S]*?(?:d[x t u s \theta]|\\mathrm\{d\}[x t u s]))/g, (match) => {
        if (match.includes('$')) return match;
        return saveMath(`$${match.trim()}$`);
      });
      p = p.replace(/(?<![\$\\\w])(\\frac\{d[a-zA-Z]?\}\{d[a-zA-Z]\}|\\frac\{\\partial[^{}]*\}\{\\partial[^{}]*\}|[a-zA-Z]\s*'\s*\([a-zA-Z0-9]+\)|[a-zA-Z]\s*''\s*\([a-zA-Z0-9]+\)|[yfg]\s*''?)(?![a-zA-Z0-9\$\}])/g, (match) => {
        if (match.includes('$')) return match;
        return saveMath(`$${match.trim()}$`);
      });
      p = p.replace(/(?<![\$\\\w])(\\(?:lim|sum|prod)(?:_\{[^{}]*\}|\^\{[^{}]*\}|_[a-zA-Z0-9\-+\\infty]+|\^[a-zA-Z0-9\-+\\infty]+)+[\s\S]*?)(?=[,;!?]|\s+(?:được|là|tính|theo|bằng|với|khi|thì|tại|trong|ta|\n)|$)/g, (match) => {
        if (match.includes('$')) return match;
        return saveMath(`$${match.trim()}$`);
      });

      // c. Bọc biểu thức chứa \frac{...}{...} hoặc \sqrt{...}
      p = p.replace(/(?<!\$)\\frac\{[^{}]*\}\{[^{}]*\}(?!\$)/g, (match) => saveMath(`$${match}$`));
      p = p.replace(/(?<!\$)\\sqrt(?:\[[^\]]*\])?\{[^{}]*\}(?!\$)/g, (match) => saveMath(`$${match}$`));

      // c1. Bọc biểu thức chứa vector (\vec{...}):
      // e.g. \vec{AB} + \vec{BC} = \vec{AC}, \vec{AB} + \vec{AD} + \vec{AA'} = \vec{AC'}, 2\vec{OM}, \vec{0}
      p = p.replace(/(?<![\$\\\w])((?:[0-9]*\s*\\vec\{[^{}]+\}|[0-9a-zA-Z\(\)\+\-\=\s\.,'^\/]|\\cdot|\\frac\{[^{}]*\}\{[^{}]*\})*\\vec\{[^{}]+\}(?:[0-9a-zA-Z\(\)\+\-\=\s\.,'^\/]|\\vec\{[^{}]+\}|\\cdot|\\frac\{[^{}]*\}\{[^{}]*\})*?)(?=[;!?]|\s+(?:với|khi|thì|tại|trong|ta|được|là|nếu|theo)|\n|$)/g, (match) => {
        let clean = match.trim().replace(/\.+$/, "");
        if (!clean || clean.includes('$')) return match;
        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean.replace(/\\text\{[^{}]*\}/g, ''))) return match;
        return saveMath(`$${clean}$`);
      });

      // e. Bọc biểu thức cấp số cộng / cấp số nhân / dãy số (u_n = ..., S_n = ...) không bị ngắt ở dấu ba chấm
      p = p.replace(/(?<![\$\\\w])\b([uS]_(?:[a-zA-Z0-9]+|\{[^}]+\})\s*=\s*(?:\\(?:dots|cdots|ldots)|\.\.\.|[0-9a-zA-Z\(\)\[\]\{\}\+\-\*\/\^\_\s]|\\frac\{[^{}]*\}\{[^{}]*\})+?)(?=[,;!?]|\s+(?:được|là|tính|theo|bằng|với|khi|thì|tại|trong|ta(?:\s+được)?|đáp\s+án|công|sai|số|[A-D][\.\:\)])|\n|$)(?!\$)/g, (match) => {
        let clean = match.trim();
        if (clean.includes('$')) return match;
        return saveMath(`$${clean}$`);
      });

      // f. Bọc các biến dãy số đơn lẻ u_1, u_2, (u_n), S_n hoặc có chỉ số ngoặc nhọn u_{10}, S_{10}, u_{n+1} ngoài công thức
      p = p.replace(/(?<![\$\\\w])(\(?[uS]_(?:[0-9a-zA-Z]+|\{[^{}]+\})\)?)(?![\$\w\{\}\+\-])/g, (match) => saveMath(`$${match}$`));

      // g. Bọc các hệ thức so sánh / tập hợp: x \in \mathbb{R}, a \le b, x \ge 0, a \ne b
      p = p.replace(/(?<![\$\\\w])\b([a-zA-Z0-9_]+\s*(?:\\in|\\notin|\\le|\\ge|\\ne|\\subset)\s*[^,\n\.\;]+)(?!\$)/g, (match) => saveMath(`$${match.trim()}$`));

      // h. Bọc các ký hiệu toán đơn lẻ bị trần: \infty, \pi, \alpha, \beta, \Delta
      p = p.replace(/(?<![\$\\\w])\\(?:alpha|beta|gamma|delta|pi|theta|sigma|omega|Delta|Sigma|infty|pm|mp)\b(?!\$)/g, (match) => saveMath(`$${match}$`));

      // Khôi phục tất cả các khối toán đã được bọc an toàn (giải nén triệt để nếu có lồng nhau)
      while (p.includes('\x02MATH')) {
        p = p.replace(/\x02MATH(\d+)\x03/g, (_, idx) => mathTokens[Number(idx)]);
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

  return s;
}

export function normalizeMathText(text: any): string {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') text = String(text);

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
  while (/(<\w+[^>]*?)\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(t)) {
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
  t = t.replace(/(\$\$[\s\S]*?\$\$)\s*\.\s*(?=[A-ZÀ-Ỹ])/g, '$1\n\n');

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

  // Tự động bổ sung dấu $ đóng cho phân số \frac{...}{...} mở bằng $ nhưng thiếu $ đóng
  s = s.replace(/(\$[^\$\n]*?\\frac\{[^{}]*\}\{[^{}]*\})(?!\$)(?=\s*(?:\n|\.|\*\*|\\Rightarrow|\\quad|\\qquad|[A-ZÀ-Ỹ]|$))/g, '$1$');

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

  // Nếu \begin{cases} nằm ngoài $...$ hoặc $$...$$, bọc tự động vào $$...$$
  s = s.replace(/(?<!\$)(?:\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})(?!\$)/gi, (match) => {
    return `\n\n$$\n${match.trim()}\n$$\n\n`;
  });

  if (s.includes('cases') && !s.includes('$$')) {
    s = balanceBlock(s);
    if (s.includes('\\begin{cases}') && !s.includes('$$')) {
      s = s.replace(/(\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})/gi, '\n\n$$\n$1\n$$\n\n');
    }
  }

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

  // 2. Xử lý dòng chứa số lẻ dấu single $ (unclosed math dollar)
  const lines = s.split('\n');
  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx];
    if (line.includes('$$')) continue;
    const dollars = (line.match(/(?<!\\)\$/g) || []).length;
    if (dollars % 2 !== 0) {
      const trimmed = line.trim();
      if (trimmed.includes('$')) {
        const lastDollarIndex = line.lastIndexOf('$');
        const afterDollar = line.slice(lastDollarIndex + 1);
        const beforeDollar = line.slice(0, lastDollarIndex);
        // Nếu dấu $ lẻ nằm ngay đầu câu tiếng Việt (ví dụ: "**Câu 2:** $Số hạng tổng quát...") -> xóa dấu $ thừa đó
        if (!beforeDollar.includes('$') && /^\s*[A-ZÀ-Ỹa-zà-ỹ]{2,}\s+[a-zA-ZÀ-ỹ]{2,}/.test(afterDollar)) {
          line = beforeDollar + afterDollar;
          lines[idx] = line;
        } else if (/[\\=_\^\+\-\/]|u_\d|S_\d|\d+/.test(afterDollar)) {
          if (line.endsWith('.')) {
            line = line.slice(0, -1) + '$.';
          } else {
            line = line + '$';
          }
          lines[idx] = line;
        }
      }
    }
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
          .replace(/\\ge([0-9a-zA-Z])/g, '\\ge $1')
          .replace(/\\le([0-9a-zA-Z])/g, '\\le $1')
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

    // 4.5. Tự động bọc display $$...$$ cho các môi trường toán trần trụi: \begin{cases}...\end{cases}, f(x) = \begin{cases}...\end{cases}
    s = s.replace(/(?<!\$)(?:([a-zA-Z]\s*(?:\([a-zA-Z0-9,\s]+\))?\s*=\s*)?(\\begin\s*\{(?:cases|aligned|matrix|pmatrix|bmatrix)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|matrix|pmatrix|bmatrix)\*?\}))(?!\$)/g, (_m, prefix, env) => {
      return `\n\n$$\n${(prefix || '')}${env}\n$$\n\n`;
    });

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

  // 4. Tổng n số hạng đầu tiên
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

  // 0. Tự động ngắt dòng cho các mục Tóm tắt kiến thức / Lý thuyết (- **...:**)
  text = text.replace(/([^\n])\s*(?:[-*•]|\u2022)?\s*(\*\*(?:Định\s*nghĩa|Khái\s*niệm|Số\s*hạng\s*tổng\s*quát|Tính\s*chất|Tổng\s*n\s*số\s*hạng|Quy\s*tắc|Công\s*thức|Định\s*lý|Hệ\s*thức|Chú\s*ý|Nhận\s*xét|Ví\s*dụ|Lưu\s*ý)[^*]*?:\*\*)/gi, '$1\n\n- $2');
  text = text.replace(/([^\n])\s+[-*•]\s+(\*\*[^*]+?:\*\*)/g, '$1\n\n- $2');

  // 1. Tách chữ tiếng Việt dính liền với công thức $ bằng cách chia mảng token (tránh tuyệt đối ghép nhầm dấu $ đóng với dấu $ mở kế tiếp)
  text = text.replace(/([a-zA-ZÀ-ỹ]{2,})(\([uS]_\{?[a-zA-Z0-9+\-]+\}?\))/g, '$1 $$$2$$');
  text = text.replace(/(\([uS]_\{?[a-zA-Z0-9+\-]+\}?\))([a-zA-ZÀ-ỹ]{2,})/g, '$$$1$$ $2');
  text = text.replace(/([a-zA-ZÀ-ỹ]{2,})([uS]_\{[a-zA-Z0-9+\-]+\})/g, '$1 $$$2$$');

  // Tách chữ cái/số tiếng Việt đứng trước dấu $ (ví dụ "Số$q$" -> "Số $q$", "bội$q$" -> "bội $q$", "Nếu$(u_n)$" -> "Nếu $(u_n)$")
  text = text.replace(/([a-zA-ZÀ-ỹ0-9:;,!?])\$(?!\$)/g, '$1 $');
  text = text.replace(/(?<!\$)\$([a-zA-ZÀ-ỹ0-9])/g, '$ $1');
  // Tách dấu hai chấm dính chữ (ví dụ "Định nghĩa:Cấp" -> "Định nghĩa: Cấp")
  text = text.replace(/(:\s*)([a-zA-ZÀ-ỹ0-9])/g, ': $2');

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
  // 1.1 Làm sạch triệt để dấu sao (**) xung quanh và ngay sau nhãn phương án A, B, C, D (chỉ in hoa [A-D], tuyệt đối không đụng vào a), b), c), d) Đúng/Sai)
  // Loại bỏ các trường hợp như: "**A.** ** 11", "A. ** 11", "A.** 11", "● A.** 11", "- **A.** ** 11"
  text = text.replace(/(?:^|\n|\s+)(?:[-*•●]\s*)?(?:\*{1,3}|<b>)?\(?([A-D])\)?[\.\:](?:\*{1,3}|<\/b>)?\s*(?:\*{1,3}\s*)?/g, (m, letter) => {
    const isNewline = m.startsWith('\n') || m.startsWith('\r\n');
    const prefix = isNewline ? '\n' : ' ';
    return `${prefix}${letter}. `;
  });
  text = text.replace(/(?<!\*)([A-D]\.)(?=[^\s\*])/g, "$1 ");

  // 2. Duyệt từng dòng và đánh số câu hỏi cho từng Phần I, II, III, IV
  const lines = text.split("\n");
  const result: string[] = [];
  let currentPart = 0; // 0 = Tóm tắt lý thuyết / ngoài bài tập; 1, 2, 3, 4 = Phần I, II, III, IV
  let qIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 0. Kiểm tra nếu là tiêu đề TÓM TẮT KIẾN THỨC / LÝ THUYẾT TRỌNG TÂM -> giữ currentPart = 0
    if (/^(?:#{1,4}|\*{2,3}|[I1]\.)?\s*(?:TÓM\s*TẮT|KIẾN\s*THỨC\s*TRỌNG\s*TÂM|LÝ\s*THUYẾT\s*TRỌNG\s*TÂM)/i.test(trimmed)) {
      currentPart = 0;
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

        // Kiểm tra xem A. B. C. D. có nằm chung dòng không
        const mcMatch = stemLine.match(/^(.*?)(?:\s+)(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?A[\.\):](?:\*{0,2}|<\/b>)?\s*([\s\S]*?)(?:\s+)(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?B[\.\):](?:\*{0,2}|<\/b>)?\s*([\s\S]*?)(?:\s+)(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?C[\.\):](?:\*{0,2}|<\/b>)?\s*([\s\S]*?)(?:\s+)(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?D[\.\):](?:\*{0,2}|<\/b>)?\s*([\s\S]*)$/i);
        if (mcMatch) {
          const stem = mcMatch[1].trim();
          const optA = cleanOpt(mcMatch[2]);
          const optB = cleanOpt(mcMatch[3]);
          const optC = cleanOpt(mcMatch[4]);
          const optD = cleanOpt(mcMatch[5]);
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
        const trailingAMatch = stemLine.match(/^(.*?)\s+(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?A[\.\):](?:\*{0,2}|<\/b>)?\s*([^\n]+)$/i);
        if (trailingAMatch) {
          let hasNextB = false;
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (/^\s*(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?B[\.\):]/i.test(lines[j].trim())) {
              hasNextB = true;
              break;
            }
          }
          if (hasNextB) {
            const cleanStem = trailingAMatch[1].trim();
            const optA = cleanOpt(trailingAMatch[2]);
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
      const singleOptMatch = trimmed.match(/^(?:[-*•●]\s*)?(?:\*{0,2}|<b>)?([A-D])[\.\):](?:\*{0,2}|<\/b>)?\s*([\s\S]+)$/);
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
      // Các ý a), b), c), d) giữ nguyên vẹn
      if (/^[a-d]\)[\s\S]*/i.test(trimmed)) {
        result.push(line);
        continue;
      }
      // Dòng đề dẫn câu hỏi
      if (trimmed && !trimmed.startsWith("#")) {
        let stemLine = trimmed.replace(/^[-*]\s+/, "");
        if (/^(?:\*{0,2}Câu\s*\d+[:\.]?\*{0,2}|\d+[\.\)])\s*/i.test(stemLine)) {
          stemLine = stemLine.replace(/^(?:\*{0,2}Câu\s*\d+[:\.]?\*{0,2}|\d+[\.\)])\s*/i, `**Câu ${qIndex}:** `);
          qIndex++;
        } else if (/^(?:Cho|Xét|Trong|Giả sử|Biết)\b/i.test(stemLine) || qIndex === 1) {
          stemLine = `**Câu ${qIndex}:** ` + stemLine;
          qIndex++;
        }
        result.push(stemLine);
        continue;
      }
    }

    if (currentPart === 3 || currentPart === 4) {
      // PHẦN III & IV: Trắc nghiệm trả lời ngắn & Tự luận
      if (/^(?:[-*]\s+|\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2}|\d+[\.\)]\s+)/i.test(trimmed)) {
        let stemLine = trimmed.replace(/^[-*]\s+/, "");
        if (/^(?:\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2}|\d+[\.\)])\s*/i.test(stemLine)) {
          stemLine = stemLine.replace(/^(?:\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2}|\d+[\.\)])\s*/i, `**Câu ${qIndex}:** `);
        } else {
          stemLine = `**Câu ${qIndex}:** ` + stemLine;
        }
        qIndex++;
        result.push(stemLine);
        continue;
      }
    }

    result.push(line);
  }

  return result.join("\n");
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

  // 2. Strip stray asterisks, bullets or closing asterisks around option letters: '* A.', '*A.', '• *A.', '- *A.', 'A.**', '● A.**', '**A.**' -> 'A.'
  // Chỉ khớp chữ cái in hoa [A-D], bảo vệ tuyệt đối các ý a), b), c), d) Đúng/Sai
  s = s.replace(/(?:^|\n|\s+)(?:[-*•●]\s*)?(?:\*{1,3}|<b>)?\(?([A-D])\)?[\.\:](?:\*{1,3}|<\/b>)?\s*(?:\*{1,3}\s*)?/g, (m, letter) => {
    const isNewline = m.startsWith('\n') || m.startsWith('\r\n');
    const prefix = isNewline ? '\n' : ' ';
    return `${prefix}${letter}. `;
  });

  // 3. Automatically wrap un-enclosed LaTeX expressions in solution/explanation text
  if (/(?<!\\)\\(?:vec|perp|Leftrightarrow|Rightarrow|Leftarrow|iff|implies|frac|sqrt|neq|ge|le|geq|leq|cdot)\b/.test(s)) {
    const lines = s.split('\n');
    const processedLines = lines.map(line => {
      if (line.includes('$$') || line.trim().startsWith('#') || line.trim().startsWith('|')) {
        return line;
      }
      if (/(?<!\\)\\(?:vec|perp|Leftrightarrow|Rightarrow|Leftarrow|iff|implies|frac|sqrt|neq|ge|le|geq|leq|cdot)\b/.test(line)) {
        const parts = line.split(/(\$[^\$\n]+?\$)/g);
        for (let i = 0; i < parts.length; i += 2) {
          let seg = parts[i];
          if (!seg) continue;
          if (/(?<!\\)\\(?:vec|perp|Leftrightarrow|Rightarrow|Leftarrow|iff|implies|frac|sqrt|neq|ge|le|geq|leq|cdot)\b/.test(seg)) {
            seg = seg.replace(/((?:Giải|Ví dụ|Ta có|Suy ra|Do đó|Kỹ năng Casio|Bẫy đề thi|Bẫy|Lưu ý)[:\s]*)?([\s\S]+?)(?=\s*(?:\*\*?Chọn\s*[A-D]\b|Chọn\s*[A-D]\b|\.|$))/gi, (fullMatch, lead, mathPart) => {
              const leadStr = lead || '';
              const trimmedMath = (mathPart || '').trim();
              if (trimmedMath && /(?<!\\)\\(?:vec|perp|Leftrightarrow|Rightarrow|Leftarrow|iff|implies|frac|sqrt|neq|ge|le|geq|leq|cdot)\b/.test(trimmedMath)) {
                const cleanMath = trimmedMath.replace(/^\$+|\$+$/g, '').trim();
                return `${leadStr}$${cleanMath}$`;
              }
              return fullMatch;
            });
            parts[i] = seg;
          }
        }
        return parts.join('');
      }
      return line;
    });
    s = processedLines.join('\n');
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
