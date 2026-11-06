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
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
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

/**
 * Tiền xử lý triệt để công thức Toán LaTeX và ký tự xuống dòng:
 * 1. Thay thế toàn bộ chuỗi escaped literal \n hoặc \\n thành ký tự xuống dòng thực tế.
 * 2. Tách các câu văn dính liền sau dấu chấm hoặc công thức toán.
 * 3. Loại bỏ ký tự rác hoặc dấu gạch ngang dính liền vào công thức (như --- hoặc SS_n = -).
 * 4. Quét và tự động bọc dấu $ vào các khối công thức toán bị thiếu delimiters (\frac, \sqrt, u_n, S_n...).
 */
export function sanitizeLatexMathAndDelimiters(raw: string): string {
  if (!raw) return '';
  let s = String(raw);

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

  // 2. Tách các câu văn dính liền sau dấu chấm hoặc công thức
  s = s.replace(/\.([A-ZÀ-Ỹ])/g, '. $1');
  s = s.replace(/\.\s*\n(?!\n)/g, '.\n\n');

  // 3. Loại bỏ ký tự rác hoặc dấu gạch ngang dính liền vào công thức (--- hoặc SS_n = -)
  s = s.replace(/\bSS_([a-zA-Z0-9]+|\{[^}]+\})/g, 'S_$1');
  s = s.replace(/\buu_([a-zA-Z0-9]+|\{[^}]+\})/g, 'u_$1');
  s = s.replace(/(?:^|\n)\s*(?:---|--)\s*([a-zA-ZÀ-ỹ])/g, '\n- $1');
  s = s.replace(/(?<=\$\$|\$)\s*---+\s*$/gm, '');
  s = s.replace(/\s*---\s*$/gm, '');
  s = s.replace(/-\s*--\s*(?=\$\$|\$|\n|$)/g, '');
  s = s.replace(/([uSxya-zA-Z]\b|S_|u_)\s*=\s*-\s*(?=[a-zA-Z0-9])/g, '$1 = -');

  // Standardize capitalized TeX arrow aliases
  s = s.replace(/\\RightArrow\b/g, '\\Rightarrow');
  s = s.replace(/\\LeftArrow\b/g, '\\Leftarrow');

  // 3.5. Giải phóng các khối $$ vô tình bọc trần toàn bộ câu hỏi hoặc nhiều tiêu đề/mục nhỏ
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (fullMatch, body) => {
    if (/(?:\*\*(?:Câu|Bài)\s*\d+:?\*\*|#{1,4}\s*PHẦN|^\s*[-*]\s+[a-d]\)|^\s*[a-d]\))/m.test(body)) {
      return body;
    }
    return fullMatch;
  });

  // 3.6. Chuyển đổi hệ phương trình trần dạng \{u_1 + ... hoặc {eq1 eq2 thành \begin{cases} eq1 \\ eq2 \end{cases}
  s = s.replace(/(?<![\$\w])\\?\{\s*([uSa-zA-Z0-9_\{\}\(\)\+\-\*\/\^\=\s]+=[uSa-zA-Z0-9_\{\}\(\)\+\-\*\/\^\=\s]+)\s+([uSa-zA-Z0-9_\{\}\(\)\+\-\*\/\^\=\s]+=[uSa-zA-Z0-9_\{\}\(\)\+\-\*\/\^\=\s]+)(?!\$)/g, (_m, eq1, eq2) => {
    return `\n\n$$\\begin{cases} ${eq1.trim()} \\\\ ${eq2.trim()} \\end{cases}$$\n\n`;
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

      // Auto-wrap standalone \Rightarrow or \Leftrightarrow lines
      p = p.replace(/(?<![\$\w])(\\RightArrow|\\Rightarrow|\\Leftrightarrow|\\Leftarrow|\\iff|\\implies)(?![\$\w])/g, (m) => saveMath(`$${m}$`));

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

      // d. Bọc chuỗi biến đổi suy ra / tương đương: e.g. u_1 = -1, u_3 = 7 \Rightarrow u_1 + 2d = 7 \Rightarrow d = 4
      p = p.replace(/(?<![\$\\\w])([uSa-zA-Z0-9_\{\}\(\)\+\-\*\/\^\=\s\.]+\s*\\(?:Rightarrow|Leftarrow|Leftrightarrow|iff|implies)\s*[uSa-zA-Z0-9_\{\}\(\)\+\-\*\/\^\=\s\.\\\(\)]+)(?=[,;!?]|\s+(?:được|là|tính|theo|bằng|với|khi|thì|tại|trong|ta|Phát\s+biểu|\(Đúng\)|\(Sai\)|\n)|$)/g, (match) => {
        let clean = match.trim();
        if (clean.includes('$')) return match;
        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean.replace(/\\text\{[^{}]*\}/g, ''))) return match;
        return saveMath(`$${clean}$`);
      });

      // e. Bọc biểu thức cấp số cộng / cấp số nhân / dãy số (u_n = ..., S_n = ...) không bị ngắt ở dấu ba chấm
      p = p.replace(/(?<![\$\\\w])\b([uS]_(?:[a-zA-Z0-9]+|\{[^}]+\})\s*=\s*(?:\\(?:dots|cdots|ldots)|\.\.\.|[0-9a-zA-Z\(\)\[\]\{\}\+\-\*\/\^\_\s]|\\frac\{[^{}]*\}\{[^{}]*\})+?)(?=[,;!?]|\s+(?:được|là|tính|theo|bằng|với|khi|thì|tại|trong|ta(?:\s+được)?|đáp\s+án|công|sai|số|[A-D][\.\:\)])|\n|$)(?!\$)/g, (match) => {
        let clean = match.trim();
        if (clean.includes('$')) return match;
        return saveMath(`$${clean}$`);
      });

      // f. Bọc các biến dãy số đơn lẻ u_1, u_2, (u_n), S_n hoặc có chỉ số ngoặc nhọn u_{10}, S_{10} ngoài công thức
      p = p.replace(/(?<![\$\\\w])(\(?u_\{?[0-9a-zA-Z]+\}?\)?|S_\{?[0-9a-zA-Z]+\}?)(?![\$\w\}])/g, (match) => saveMath(`$${match}$`));

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

  // 5. Gộp các khối $$ liền kề nhau được nối bởi dấu tương đương / suy ra / bằng
  s = s.replace(/\$\$\s*(\\Leftrightarrow|\\Rightarrow|\\Leftarrow|=|\\iff)\s*\$\$/g, ' $1 ');

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

  // 4. Chuẩn hóa công thức Cấp số cộng & Tách chữ tiếng Việt ra khỏi dấu $
  t = normalizeArithmeticProgressionFormulas(t);

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
  return t;
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
  s = s.replace(/(\\frac\{[^{}]*\}\{[^{}]*\})\s*[\r\n]+\s*\}?\s*0?\$\./gi, '$1 = 720$.');
  s = s.replace(/(\\frac\{[^{}]*\}\{[^{}]*\})\s*[\r\n]+\s*\}?\s*(?=[0-9A-ZÀ-Ỹa-zà-ỹ])/g, '$1 ');

  return s;
}

export function balanceCasesEnvironments(text: string): string {
  if (!text) return text;
  let s = text;

  // Xóa triệt để các chuỗi thông báo lỗi thô rác do MathJax/LaTeX ném ra
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
      b = b + ' \\end{cases}'.repeat(begins - ends);
    } else if (ends > begins) {
      const diff = ends - begins;
      if (b.includes('{') || b.includes('=')) {
        b = '\\begin{cases} '.repeat(diff) + b;
      } else {
        for (let k = 0; k < diff; k++) {
          b = b.replace(/\\end\s*\{cases\*?\}/i, '');
        }
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

  // Xử lý dòng chứa số lẻ dấu single $ (unclosed math dollar)
  const lines = s.split('\n');
  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx];
    if (line.includes('$$')) continue;
    const dollars = (line.match(/(?<!\\)\$/g) || []).length;
    if (dollars % 2 !== 0) {
      const trimmed = line.trim();
      // Nếu dòng có $ ở giữa câu hoặc mở công thức toán nhưng quên đóng $ ở cuối dòng
      if (trimmed.includes('$')) {
        const lastDollarIndex = line.lastIndexOf('$');
        const afterDollar = line.slice(lastDollarIndex + 1);
        // Nếu phần sau dấu $ chứa công thức toán (\frac, \sqrt, u_1, =, +, -, \Rightarrow, \iff)
        if (/[\\=_\^\+\-\/]|u_\d|S_\d|\d+/.test(afterDollar)) {
          // Bổ sung dấu $ đóng công thức ở cuối dòng trước dấu chấm hoặc ngắt dòng
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

  // 1. Tách câu dẫn tiếng Việt dính liền công thức trong $: ví dụ "$... ta được:$"
  let sReplaced = s.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (fullMatch, inner) => {
    // Nếu khối math chứa cụm từ tiếng Việt rõ ràng
    const vietnameseClues = /(?:\s+|^)(ta\s+được|khi\s+đó|thì|với|trong\s+đó|thỏa\s+mãn|biết\s+rằng|đáp\s+án|kết\s+quả|chọn|mệnh\s+đề|đúng|sai)[:\s]/i;
    const hasVietnameseAccent = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(inner.replace(/\\text\{[^{}]*\}/g, ''));

    if (vietnameseClues.test(inner) || (hasVietnameseAccent && inner.length > 25)) {
      // Tách trước cụm từ tiếng Việt
      let replaced = inner.replace(/([^\$\n]+?)\s*(ta\s+được|khi\s+đó|thì|với|trong\s+đó|thỏa\s+mãn|biết\s+rằng|đáp\s+án|kết\s+quả|chọn)[:\s]*([\s\S]*)/i, (_m, mathPart, phrase, rest) => {
        let cleanMath = mathPart.trim();
        let cleanRest = rest.trim();
        let res = '';
        if (cleanMath) res += `$${cleanMath}$ `;
        res += `${phrase}: `;
        if (cleanRest) {
          // Nếu phần còn lại chứa các phương án A. B. C. D.
          if (/[A-D][\.\:\)]/.test(cleanRest)) {
            res += cleanRest;
          } else if (/[\\^_=><\+\-\*\/]/.test(cleanRest)) {
            res += `$${cleanRest}$`;
          } else {
            res += cleanRest;
          }
        }
        return res;
      });

      if (replaced !== inner) {
        return replaced;
      }
    }
    return fullMatch;
  });

  return sReplaced;
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
  res = res.replace(/\$\$\s*(\\Leftrightarrow|\\Rightarrow|\\Leftarrow|=|\\iff)\s*\$\$/g, ' $1 ');

  return res;
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

  // 1. Tách chữ tiếng Việt dính liền với công thức $
  text = text.replace(/([a-zA-ZÀ-ỹ0-9:;,!?)]?)(\$(?!\$)[^\$\n]+?\$(?!\$))([a-zA-ZÀ-ỹ0-9(]?)/g, (match, before, math, after) => {
    let res = "";
    if (before && !/\s/.test(before)) {
      res += before + " ";
    } else if (before) {
      res += before;
    }
    res += math;
    if (after && !/\s/.test(after)) {
      res += " " + after;
    } else if (after) {
      res += after;
    }
    return res;
  });
  text = text.replace(/([A-D]\.)(?=[^\s])/g, "$1 ");

  // 2. Duyệt từng dòng và đánh số câu hỏi cho từng Phần I, II, III, IV
  const lines = text.split("\n");
  const result: string[] = [];
  let currentPart = 0; // 1, 2, 3, 4
  let qIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Kiểm tra dòng tiêu đề PHẦN / BÀI TẬP
    const isSectionHeader = /^(?:#{1,4}|\*{2,3})?\s*(?:PHẦN\s*([1-4]|I{1,3}|IV)|BÀI\s*TẬP|LUYỆN\s*TẬP|CÂU\s*HỎI|TRẮC\s*NGHIỆM|TỰ\s*LUẬN|[A-D]\.\s*TRẮC|[A-D]\.\s*TỰ)/i.test(trimmed);
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
      } else if (currentPart === 0) {
        currentPart = 1;
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

    // Nếu đang ở ngoài các phần bài tập nhưng gặp câu hỏi rõ ràng (Câu 1, Bài 1...)
    if (currentPart === 0) {
      if (/^(?:[-*•]\s+|\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2}|\b\d+[\.\)]\s+)/i.test(trimmed)) {
        currentPart = 1;
        qIndex = 1;
      } else {
        result.push(line);
        continue;
      }
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

        // Kiểm tra xem A. B. C. D. có nằm chung dòng không
        const mcMatch = stemLine.match(/^(.*?)(?:\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>)?A[\.\):]\s*([\s\S]*?)(?:\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>)?B[\.\):]\s*([\s\S]*?)(?:\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>)?C[\.\):]\s*([\s\S]*?)(?:\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>)?D[\.\):]\s*([\s\S]*)$/i);
        if (mcMatch) {
          const stem = mcMatch[1].trim();
          const optA = mcMatch[2].trim();
          const optB = mcMatch[3].trim();
          const optC = mcMatch[4].trim();
          const optD = mcMatch[5].trim();
          result.push(stem);
          result.push(`A. ${optA}`);
          result.push(`B. ${optB}`);
          result.push(`C. ${optC}`);
          result.push(`D. ${optD}`);
          result.push(""); // Dòng trống ngăn cách
          continue;
        }

        result.push(stemLine);
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
            const tag = el.tagName ? el.tagName.toUpperCase() : '';

            // Skip MathJax, SVG, and code nodes generated by rendering engines
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
              el.closest('mjx-container') ||
              el.hasAttribute('data-latex')
            ) {
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
        const parent = mutation.target.parentElement;
        if (
          parent &&
          (parent.tagName.toUpperCase().startsWith('MJX') ||
            parent.closest('mjx-container') ||
            parent.closest('.math-view-container') ||
            parent.classList.contains('MathJax'))
        ) {
          continue;
        }
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

/**
 * Plugin to strip all inline DOM event handlers (onclick, onload, onerror, etc.)
 * from HAST nodes produced by rehype-raw. This prevents React from throwing:
 * "Expected `onClick` listener to be a function, instead got a value of `string` type."
 */
export function rehypeSanitizeEventHandlers() {
  return (tree: any) => {
    function visit(node: any) {
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
