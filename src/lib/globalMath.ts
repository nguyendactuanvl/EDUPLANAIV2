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
  const isSentential = t.length > 70 || t.split(/\s+/).length > 8;

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
      if (/^[\[\(].+[\]\)]$/.test(t) || /[\^_\\]/.test(t) || /^[a-zA-Z]\s*[=><\le\ge]/.test(t) || /^\\?\{[^}\n]+\\?\}$/.test(t) || /^[0-9]+(?:\.[0-9]+)?$/.test(t)) {
        return `$${t}$`;
      }
    }
  }
  return t;
}

export function normalizeMathText(text: any): string {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') text = String(text);

  let t = text.normalize("NFC");

  // 0. Chuẩn hóa các dấu ngoặc kép bị escape \" bên trong hoặc xung quanh công thức
  t = t.replace(/\\"/g, '"');
  t = t.replace(/\\dfrac\b/g, '\\frac');

  // Khắc phục triệt để lỗi double-backslash (\\ thay vì \) do tàn dư KaTeX cũ hoặc escape thừa:
  // Đổi \\frac, \\sqrt, \\begin, \\alpha, \\le, \\in... thành \frac, \sqrt, \begin, \alpha, \le, \in...
  // Bảo vệ dấu \\ ngắt dòng phương trình trong \begin{cases}...\end{cases} hoặc matrix/aligned
  t = t.replace(/\\{2,}([a-zA-Z]+)/g, (_m, g1) => '\\' + g1);
  t = t.replace(/\\{2,}([\{\}\[\]\(\)\$\%])/g, (_m, g1) => '\\' + g1);
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

  // 3. Khôi phục các ký tự thoát bị rách hoặc nuốt gạch chéo ngược
  t = t.replace(/(?<![a-zA-Z\\])\b([a-zA-Z])\s*a?e\s*0\b/gi, '$1 \\neq 0');
  t = t.replace(/(?<![a-zA-Z\\])\b([a-zA-Z])\s*eq\s*0\b/gi, '$1 \\neq 0');
  t = t.replace(/\((?:\s*|\$)*([a-zA-Z])\s*a?e\s*0(?:\s*|\$)*\)/gi, '($1 \\neq 0)');
  t = t.replace(/(?<=^|[\s$])([a-z])\s*eq(?=0|\d|\s|\$)/gi, '$1 \\neq ');
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

  // Chuẩn hóa dấu + và - đứng độc lập trong mô tả bảng biến thiên (vd: từ + sang -)
  t = t.replace(/(\btừ\s*)([+\-])(\s*sang\s*)([+\-])/gi, '$1$$$2$$$3$$$4$$');

  // Fix common math environments
  t = t.replace(/\\*begin\s*\{?cases\*?\}?/gi, '\\begin{cases}');
  t = t.replace(/\\*end\s*\{?cases\*?\}?/gi, '\\end{cases}');
  t = t.replace(/\\*begin\s*\{?aligned\*?\}?/gi, '\\begin{aligned}');
  t = t.replace(/\\*end\s*\{?aligned\*?\}?/gi, '\\end{aligned}');

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
