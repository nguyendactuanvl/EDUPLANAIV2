import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { unflattenMarkdownTables, embedBbtSvgsInText } from './bbtRenderer';
import { normalizeMathText, triggerGlobalMathRender, normalizeArithmeticProgressionFormulas, formatWorksheetQuestionsAndSections, autoWrapNakedMathExpression } from './globalMath';

export { unflattenMarkdownTables, embedBbtSvgsInText, normalizeMathText, triggerGlobalMathRender, normalizeArithmeticProgressionFormulas, formatWorksheetQuestionsAndSections, autoWrapNakedMathExpression };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Làm sạch chuỗi JSON bên trong chuỗi string, tự động sửa các lỗi:
 * - Ký tự backslash không hợp lệ trong LaTeX (\frac, \alpha, \le, \vec, \Omega, ...)
 * - Unicode escape không hợp lệ (\upsilon, \underline, ...)
 * - Xuống dòng hoặc tab chưa được escape trong chuỗi string
 * - Dấu phẩy thừa cuối mảng/object (, } hoặc , ])
 */
export function sanitizeJsonString(str: string): string {
  let result = "";
  let inString = false;
  let i = 0;
  const len = str.length;

  while (i < len) {
    const ch = str[i];

    if (!inString) {
      if (ch === "\"") {
        inString = true;
        result += ch;
        i++;
      } else {
        result += ch;
        i++;
      }
    } else {
      if (ch === "\"") {
        inString = false;
        result += ch;
        i++;
      } else if (ch === "\\") {
        if (i + 1 >= len) {
          result += "\\\\";
          i++;
        } else {
          let slashCount = 0;
          let k = i;
          while (k < len && str[k] === "\\") {
            slashCount++;
            k++;
          }

          const nextChar = (k < len) ? str[k] : "";
          const isLetterOrMathSymbol = /[a-zA-Z\{\}\[\]\(\)\$\%]/.test(nextChar);

          if (isLetterOrMathSymbol) {
            if (slashCount === 1) {
              if (nextChar === "b" || nextChar === "f" || nextChar === "n" || nextChar === "r" || nextChar === "t") {
                const charAfter = (k + 1 < len) ? str[k + 1] : "";
                if (charAfter && /[a-zA-Z]/.test(charAfter)) {
                  result += "\\\\";
                  i += 1;
                } else {
                  result += "\\" + nextChar;
                  i += 2;
                }
              } else if (nextChar === "u") {
                const hex = str.slice(k + 1, k + 5);
                if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                  result += "\\u" + hex;
                  i += 5;
                } else {
                  result += "\\\\";
                  i += 1;
                }
              } else {
                result += "\\\\";
                i += 1;
              }
            } else {
              result += "\\\\";
              i += slashCount;
            }
          } else {
            if (nextChar === "\"") {
              result += "\\\"";
              i += slashCount + 1;
            } else if (nextChar === "/") {
              result += "/";
              i += slashCount + 1;
            } else {
              result += "\\\\\\\\";
              i += slashCount;
            }
          }
        }
      } else if (ch === "\n") {
        result += "\\n";
        i++;
      } else if (ch === "\r") {
        result += "\\r";
        i++;
      } else if (ch === "\t") {
        result += "\\t";
        i++;
      } else {
        result += ch;
        i++;
      }
    }
  }

  return result.replace(/,\s*([\}\]])/g, "$1");
}

export function repairTruncatedJson(str: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
    } else {
      if (ch === "\"") {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}" && stack[stack.length - 1] === "{") {
        stack.pop();
      } else if (ch === "]" && stack[stack.length - 1] === "[") {
        stack.pop();
      }
    }
  }

  let repaired = str;
  if (inString) {
    repaired += "\"";
  }
  repaired = repaired.replace(/,\s*$/, "");
  while (stack.length > 0) {
    const top = stack.pop();
    if (top === "{") repaired += "}";
    if (top === "[") repaired += "]";
  }
  return repaired;
}

/**
 * An toàn phân tích chuỗi JSON trả về từ AI, xử lý triệt để lỗi "Bad escaped character in JSON"
 * do công thức toán học LaTeX chứa các ký tự \ chưa được escape hợp lệ (như \frac, \le, \Omega, \alpha, ...)
 */
export function safeJsonParse<T = any>(text: string, fallback?: T): T {
  if (!text || typeof text !== 'string') return (text as any) || (fallback as T);
  let cleaned = text
    .replace(/^```json\s*/gi, '')
    .replace(/^```\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    try {
      const sanitized = sanitizeJsonString(cleaned);
      return JSON.parse(sanitized);
    } catch (e2) {
      const match = cleaned.match(/(\{|\[)[\s\S]*(\}|\])/);
      if (match) {
        try {
          return JSON.parse(sanitizeJsonString(match[0]));
        } catch (e3) {}
      }

      try {
        const repaired = repairTruncatedJson(cleaned);
        return JSON.parse(sanitizeJsonString(repaired));
      } catch (e4) {}

      if (fallback !== undefined && fallback !== null) {
        return fallback;
      }
      throw e1;
    }
  }
}

export function parseApiResponse<T = any>(text: string): T {
  if (!text || !text.trim()) {
    throw new Error("Máy chủ phản hồi rỗng (kết nối bị gián đoạn hoặc hết thời gian chờ). Vui lòng thử lại.");
  }
  const clean = text.trim();
  if (clean.includes("SERVER_ERROR:")) {
    const rawError = clean.substring(clean.indexOf("SERVER_ERROR:") + 13).trim();
    let errorMsg = rawError;
    try {
      const parsed = safeJsonParse(rawError);
      if (parsed?.error?.message) errorMsg = parsed.error.message;
      else if (parsed?.message) errorMsg = parsed.message;
    } catch (e) {
      const jsonMatch = rawError.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = safeJsonParse(jsonMatch[0]);
          if (parsed?.error?.message) errorMsg = parsed.error.message;
          else if (parsed?.message) errorMsg = parsed.message;
        } catch (e2) {}
      }
    }
    // Clean up single braces or broken fragments
    errorMsg = errorMsg.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    if (errorMsg === "{" || errorMsg === "}" || !errorMsg) {
      errorMsg = "Hệ thống AI xử lý quá thời gian chờ hoặc tạm thời quá tải. Vui lòng bấm tạo lại hoặc giảm bớt số lượng câu hỏi.";
    }
    throw new Error(errorMsg);
  }

  try {
    return safeJsonParse<T>(clean);
  } catch (e) {
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return safeJsonParse<T>(jsonMatch[0]);
      } catch (inner) {
        // Try salvaging valid question objects if JSON was truncated
        const questionsMatch = jsonMatch[0].match(/"questions"\s*:\s*\[([\s\S]*)/);
        if (questionsMatch) {
          const salvagedQuestions: any[] = [];
          const questionRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
          let qm: RegExpExecArray | null;
          while ((qm = questionRegex.exec(questionsMatch[1])) !== null) {
            try {
              const qObj = safeJsonParse(qm[0]);
              if (qObj.content && (qObj.options || qObj.tfStatements || qObj.correctAnswer)) {
                salvagedQuestions.push(qObj);
              }
            } catch (ignore) {}
          }
          if (salvagedQuestions.length > 0) {
            return {
              examName: "Đề kiểm tra",
              questions: salvagedQuestions
            } as unknown as T;
          }
        }
      }
    }
    throw new Error("Phản hồi từ máy chủ không đúng định dạng. Vui lòng bấm tạo lại.");
  }
}

export function normalizeInfinity(text: any): string {
  if (!text && text !== 0) return '';
  let s = String(text);

  // 1. Cưỡng chế sửa mọi biến thể âm/dương vô cực và dấu gạch chéo bị rách chuỗi
  s = s.replace(/[-–—]\s*\\+\s*infty\b/gi, '-\\infty');
  s = s.replace(/\+\s*\\+\s*infty\b/gi, '+\\infty');
  s = s.replace(/[-–—]\s*infty\b/gi, '-\\infty');
  s = s.replace(/\+\s*infty\b/gi, '+\\infty');

  // 2. Chữa lỗi dấu gạch chéo ngược có khoảng trắng: "\ infty", "\\ infty"
  s = s.replace(/\\+\s+infty\b/gi, '\\infty');
  s = s.replace(/([+\-–—±])\s*\\+\s*infty\b/gi, (m, sign) => (sign === '+' ? '+\\infty' : '-\\infty'));

  // 3. Normalize OCR / font ligature splits: "in fty", "in  fty", "in\tfty"
  s = s.replace(/\bin\s+fty\b/gi, '\\infty');
  s = s.replace(/([+\-–—±])\s*in\s*fty\b/gi, '$1\\infty');

  // 4. Normalize "infty" not preceded by backslash: e.g. "-infty", "+infty", "infty"
  s = s.replace(/(?<!\\)\binfty\b/g, '\\infty');

  // 5. Normalize spaces between sign and \infty: e.g. "- \infty" -> "-\infty", "+ \infty" -> "+\infty"
  s = s.replace(/([+\-–—±])\s+\\infty\b/g, '$1\\infty');

  // 6. Normalize informal "oo" used as infinity in intervals, limits, or signs:
  // e.g. "(-oo; -1)", "(1; +oo)", "[-oo; +oo]", "x \to +oo"
  s = s.replace(/([\(\[\{;,]\s*)([+\-–—±]?)\s*oo\b/gi, '$1$2\\infty');
  s = s.replace(/\b([+\-–—±])\s*oo\b/gi, '$1\\infty');
  s = s.replace(/\\to\s*([+\-–—±]?)\s*oo\b/gi, '\\to $1\\infty');
  s = s.replace(/\b([+\-–—±]?)\s*oo(\s*[\)\]\};,])/gi, '$1\\infty$2');

  // 7. Normalize intervals where \infty had stray internal dollars:
  // e.g. "(-$\infty$; -1)" -> "(-\infty; -1)", "(-1; +$\infty$)" -> "(-1; +\infty)"
  s = s.replace(/([\[\(])\s*([+\-–—±]?)\s*\$\\infty\$\s*([;,])/g, '$1$2\\infty$3');
  s = s.replace(/([;,]\s*)([+\-–—±]?)\s*\$\\infty\$\s*([\]\)])/g, '$1$2\\infty$3');

  return s;
}

/**
 * Xóa bỏ các ký tự $ mồ côi (trailing dollar sign) ở cuối văn bản hoặc nằm sau dấu chấm câu (ví dụ: ".$" hay ". $" -> ".")
 */
export function cleanMath(text: string): string {
  if (!text) return '';
  let s = String(text);
  // Xóa bỏ các ký tự $ mồ côi nằm sau dấu chấm câu (., ;, :)
  s = s.replace(/([\.\;\,])\s*\$+$/g, '$1');
  s = s.replace(/([\.\;\,])\s*\$+(\s)/g, '$1$2');

  // Nếu chuỗi kết thúc bằng dấu $ nhưng tổng số lượng dấu $ là số lẻ (dấu $ mồ côi chưa đóng) -> cắt bỏ dấu $ thừa
  const dollarCount = (s.match(/(?<!\\)\$/g) || []).length;
  if (dollarCount % 2 !== 0 && s.trimEnd().endsWith('$')) {
    s = s.replace(/\s*\$+$/, '');
  }
  return s;
}

/**
 * Giải cứu văn bản tiếng Việt bị lỡ bọc nhầm vào bên trong môi trường toán $...$ hoặc $$...$$
 * (Ví dụ: "$.Xét tính đúng sai của các khẳng định sau?$" -> ". Xét tính đúng sai của các khẳng định sau?")
 */
export function rescueVietnameseFromMath(text: string): string {
  if (!text) return '';
  let s = text;
  s = s.replace(/(?<!\$)\$(?!\$)([\s\S]+?)(?<!\$)\$(?!\$)/g, (match, formula) => {
    if (formula.includes('$$')) return match;
    const cleanFormula = formula.replace(/\\text\{[^{}]*\}/g, '');
    const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanFormula) ||
      /\b(Xét\s+tính\s+đúng\s+sai|khẳng\s+định|mệnh\s+đề|đúng\s+sai|Cho\s+hàm\s+số|tập\s+hợp)\b/i.test(cleanFormula);
    if (isVietnamese) {
      return ` ${formula.trim()} `;
    }
    return match;
  });
  return s;
}

/**
 * Chuẩn hóa thân môi trường cases (\begin{cases} ... \end{cases}):
 * 1. Khôi phục các bất đẳng thức kép (bđt kép) bị đứt gãy hoặc rách dòng (0 \le x \\ le4 -> 0 \le x \le 4)
 * 2. Bảo vệ toàn diện các bất đẳng thức kép (0 \le x \le 4, -1 < x \le 3, 0 \le y \le 5...)
 * 3. Phân tách nếu hai điều kiện cách nhau bởi dấu phẩy (như x \ge 0, y \ge 0 hoặc x > 0, y > 0, x + y \le 10)
 * 4. Thay thế các ký tự gãy dòng `\ `, `\-` thành `\\ `
 * 5. Tuyệt đối KHÔNG làm biến dạng các lệnh LaTeX hợp lệ (\le, \ge, \sqrt, \frac, \sin, \cos...)
 * 6. Đảm bảo mọi bất phương trình/phương trình LUÔN NẰM TRÊN MỘT DÒNG RIÊNG BIỆT với double backslash `\\`
 */
export function normalizeCasesBody(body: string): string {
  if (!body) return '';
  let s = body.trim();

  // Strip column alignment specs like {l}, {c}, {r}, {ll}, {l|l}, etc. at the start (from \begin{array}{l})
  s = s.replace(/^\s*\{[a-zA-Z*| ]+\}\s*/, '');
  s = s.replace(/^\s*\b[lcr]+\b\s*(?=[a-zA-Z0-9\-\+\{\(\\])/, '');

  const normIneq = (op: string): string => {
    const o = op.toLowerCase().replace(/^\\/, '');
    if (o === '<=' || o === 'le' || o === 'leq' || o === 'leqslant') return '\\le';
    if (o === '>=' || o === 'ge' || o === 'geq' || o === 'geqslant') return '\\ge';
    if (o === '<' || o === '>') return o;
    if (o === '!=' || o === 'ne' || o === 'neq') return '\\neq';
    return op.startsWith('\\') ? op : `\\${op}`;
  };

  // 0. Khôi phục các bất đẳng thức kép (bđt kép) bị đứt gãy hoặc rách dòng từ trước:
  // Ví dụ: "0 \le x \\ le4" hoặc "0 \le x \\ le 4" -> "0 \le x \le 4"
  s = s.replace(/([0-9a-zA-Z\)\}\]])\s*\\\\\s*(?:\\)?(le|leq|ge|geq|ne|neq|<|>|<=|>=)\s*([+-]?\d+|[a-zA-Z0-9\(\{\]])/gi, (_m, a, op, b) => {
    return `${a} ${normIneq(op)} ${b}`;
  });

  // Khôi phục dạng le4, le5, ge0 dính liền trong thân hệ:
  s = s.replace(/(?<=[0-9a-zA-Z\s])\b(le|ge|leq|geq|ne|neq)(\d+)\b/gi, (_m, op, num) => {
    return `${normIneq(op)} ${num}`;
  });

  // Bảo vệ toàn diện các bất đẳng thức kép (BĐT kép) trên cùng 1 dòng
  // (Tuyệt đối KHÔNG nuốt qua ký tự xuống dòng, \\ hoặc dấu phẩy phân tách điều kiện)
  const compoundTokens: string[] = [];
  const ineqOpStr = "(?:<=|>=|<|>|\\\\le|\\\\ge|\\\\leq|\\\\geq|\\\\leqslant|\\\\geqslant|\\ble\\b|\\bge\\b|\\bleq\\b|\\bgeq\\b)";
  const compoundRegex = new RegExp(
    `([+-]?(?:\\d+(?:[.,]\\d+)?|[a-zA-Z]|\\\\[a-zA-Z]+(?:\\{[^{}]*\\})*))\\s*(${ineqOpStr})\\s*([^\\\\\\n,;]+?)\\s*(${ineqOpStr})\\s*([+-]?(?:\\d+(?:[.,]\\d+)?|[a-zA-Z]|\\\\[a-zA-Z]+(?:\\{[^{}]*\\})*))`,
    "gi"
  );
  s = s.replace(compoundRegex, (_m, left, op1, mid, op2, right) => {
    const token = `___COMPOUND_INEQ_${compoundTokens.length}___`;
    compoundTokens.push(`${left.trim()} ${normIneq(op1)} ${mid.trim()} ${normIneq(op2)} ${right.trim()}`);
    return token;
  });

  // 1. Chuẩn hóa double-backslashes, dấu gạch đứng (|) và ngắt dòng thành ký hiệu phân tách duy nhất
  s = s.replace(/\\\\+/g, ' ___SPLIT___ ');
  s = s.replace(/\|+/g, ' ___SPLIT___ ');

  // 2. Phân tách nếu hai điều kiện cách nhau bởi dấu phẩy, chấm phẩy hoặc ngắt dòng
  s = s.replace(/,\s*(?=[a-zA-Z0-9\-\+\{\(\\]|___COMPOUND_INEQ_)/g, ' ___SPLIT___ ');
  s = s.replace(/;\s*(?=[a-zA-Z0-9\-\+\{\(\\]|___COMPOUND_INEQ_)/g, ' ___SPLIT___ ');
  s = s.replace(/\n+/g, ' ___SPLIT___ ');

  // 3. Phân tách nếu hai biểu thức đứng sát nhau chỉ cách nhau bởi khoảng trắng
  s = s.replace(/([<>=]|\\ge|\\le|\\leq|\\geq|\\neq)\s*(-?\d+)\s+(?=(?:[-+]?\s*(?:\d+[a-zA-Z]|[a-zA-Z]|\\sqrt|\\frac|\\sin|\\cos|\\tan|\\cot|___COMPOUND_INEQ_)\b))/g, '$1 $2 ___SPLIT___ ');

  // 4. Tách thành từng dòng độc lập và làm sạch
  const rawRows = s.split('___SPLIT___');
  const cleanRows = rawRows.map(r => {
    let row = r.trim();
    // Khôi phục lại các bất đẳng thức kép nguyên vẹn 100%
    row = row.replace(/___COMPOUND_INEQ_(\d+)___/g, (_m, idx) => compoundTokens[Number(idx)] || '');
    // Xóa sạch các dấu backslash đơn sót lại ở đầu hoặc cuối dòng
    row = row.replace(/^\\+(?![a-zA-Z])\s*/, '');
    row = row.replace(/\\+$/, '');
    // Xóa sạch các dấu backslash đơn sót lại trước biến đơn lẻ (như \x -> x, \y -> y), không xóa lệnh LaTeX
    row = row.replace(/(?:^|\s)\\([xyzmtanbcdfghijkopqrsuvwXYZMT])\b(?!le|ge|leq|geq|ne|neq|sqrt|frac|sin|cos|tan|cot|ln|log|pi)/g, ' $1');
    return row.trim();
  }).filter(r => r.length > 0 && r !== '\\');

  return cleanRows.join(' \\\\\n');
}

/**
 * Định dạng thân aligned cho họ nghiệm phương trình lượng giác:
 * Mỗi phương trình trên một dòng, nếu có dấu '=' thì căn chỉnh bằng '&='
 */
export function formatAlignedTrigBody(body: string): string {
  if (!body) return '';
  const normalized = normalizeCasesBody(body);
  const rawLines = normalized.split('\\\\');
  const formattedLines = rawLines.map(rawLine => {
    let line = rawLine.trim();
    if (!line) return '';
    // Nếu dòng có '=' và chưa có '&' đứng trước '=', thêm '&' để căn chỉnh dấu bằng đẹp trong aligned
    if (line.includes('=') && !line.includes('&=')) {
      line = line.replace(/=\s*/, '&= ');
    }
    return line;
  }).filter(Boolean);

  return formattedLines.join(' \\\\\n');
}

/**
 * Chuẩn hóa biểu diễn họ nghiệm phương trình lượng giác:
 * - Khi biểu diễn họ nghiệm tuyển của phương trình lượng giác (\sin, \cos, \tan, \cot...):
 *   + BẮT BUỘC sử dụng dấu móc vuông \left[ thay vì dấu móc nhọn \begin{cases}.
 *   + Cú pháp chuẩn KaTeX:
 *     $$\left[\begin{aligned} x &= \alpha + k2\pi \\ x &= \pi - \alpha + k2\pi \end{aligned}\right. \quad (k \in \mathbb{Z})$$
 *   + Giữ nguyên dấu móc nhọn \begin{cases} ... \end{cases} cho hệ phương trình / hệ bất phương trình.
 */
export function normalizeTrigSolutions(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Chuyển \left[\begin{cases} ... \end{cases}\right. hoặc \left[\begin{matrix} ... \end{matrix}\right. hoặc \left[\begin{array} ... \end{array}\right.
  //    thành \left[\begin{aligned} ... \end{aligned}\right.
  s = s.replace(/\\left\s*\[\s*\\begin\s*\{(?:cases|matrix|array)\*?\}(?:\s*\{[a-zA-Z*| ]+\})?([\s\S]*?)\\end\s*\{(?:cases|matrix|array)\*?\}\s*\\right\.?/g, (_m, body) => {
    return `\\left[\\begin{aligned}\n${formatAlignedTrigBody(body)}\n\\end{aligned}\\right.`;
  });

  // 2. Chuyển \begin{cases} ... \end{cases} chứa nghiệm lượng giác (k2\pi, 2k\pi, k\pi, k \in \mathbb{Z}, ...)
  //    thành dấu móc vuông chuẩn KaTeX: \left[\begin{aligned} ... \end{aligned}\right.
  s = s.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (match, body) => {
    // Nhận diện họ nghiệm lượng giác:
    // Chứa tham số chu kỳ góc lượng giác: k2\pi, 2k\pi, k\pi, k \in \mathbb{Z}, k \in Z, hoặc \pi / ... + k
    const isTrigSolution = /(?:k\s*2\s*\\pi|2\s*k\s*\\pi|k\s*\\pi|\b\d*k\pi\b|k\s*\\in\s*(?:\\mathbb\{Z\}|Z)|[+\-]\s*k\s*\\pi|[+\-]\s*k2\\pi)/i.test(body);
    if (!isTrigSolution) {
      // GIỮ NGUYÊN \begin{cases} cho hệ phương trình / hệ bất phương trình
      return match;
    }
    return `\\left[\\begin{aligned}\n${formatAlignedTrigBody(body)}\n\\end{aligned}\\right.`;
  });

  return s;
}

/**
 * Kiểm tra xem tại vị trí pos trong chuỗi text có đang nằm trong môi trường toán ($...$ hoặc $$...$$) hay không
 */
export function isInsideMath(text: string, pos: number): boolean {
  const before = text.slice(0, pos);
  let inInline = false;
  let inDisplay = false;
  let i = 0;
  while (i < before.length) {
    if (before[i] === '\\' && i + 1 < before.length && before[i+1] === '$') {
      i += 2;
      continue;
    }
    if (before.slice(i, i + 2) === '$$') {
      inDisplay = !inDisplay;
      i += 2;
      continue;
    }
    if (before[i] === '$') {
      inInline = !inInline;
      i += 1;
      continue;
    }
    i++;
  }
  return inInline || inDisplay;
}

/**
 * Làm sạch và chuẩn hóa chuỗi công thức LaTeX:
 * 1. Chuẩn hóa ký hiệu Hy Lạp viết thiếu backslash: thay thế các từ độc lập như \bDelta\b thành \Delta, \bpi\b thành \pi (nếu chưa có \)
 * 2. Sửa lỗi escape đơn vị đo:
 *    - Thay thế các dạng (\d+)\s*text\s*([a-zA-Z]+) hoặc (\d+)\s*\\text\s*([a-zA-Z]+) thành $1\\text{ $2} (ví dụ: 6textcm -> 6\text{ cm})
 *    - Đảm bảo đơn vị hiển thị thẳng đứng và có khoảng cách hợp lý
 * 3. Sửa lỗi cú pháp số mũ / ký hiệu độ:
 *    - Thay thế \^\\+\s*circ hoặc \^\{\\+\s*circ\} thành ^\circ (xóa triệt để các dấu backslash dư thừa \\)
 * 4. Không can thiệp vào các chuỗi LaTeX đã chuẩn sẵn để tránh làm hỏng các công thức bình thường.
 */
export function sanitizeLatexString(text: string): string {
  if (!text) return '';
  let s = text.replace(/\\dfrac\b/g, '\\frac');

  // 0. Khắc phục triệt để lỗi double-backslash (\\ thay vì \) do tàn dư KaTeX cũ hoặc escape thừa:
  // Đổi \\frac, \\sqrt, \\begin, \\alpha, \\le, \\in... thành \frac, \sqrt, \begin, \alpha, \le, \in...
  // Bảo vệ tuyệt đối dấu \\ dùng để ngắt dòng trong \begin{cases}...\end{cases} hoặc matrix/aligned
  s = s.replace(/\\{2,}([a-zA-Z]+)/g, (_m, g1) => '\\' + g1);
  s = s.replace(/\\{2,}([\{\}\[\]\(\)\$\%])/g, (_m, g1) => '\\' + g1);
  s = s.replace(/\\{3,}/g, '\\\\');
  s = s.replace(/(?<!\\)\\\s+(frac|sqrt|sin|cos|tan|cot|left|right|begin|end|text|pi|infty|mathbb|setminus|quad|mid|cap|cup|in|notin|subset|supset|subseteq|supseteq|ne|neq|le|ge|leq|geq|times|cdot|pm|lim|to|alpha|beta|gamma|theta|Delta|Omega|circ|overline|vert|parallel|perp|cases|aligned|matrix|array)\b/gi, '\\$1');

  // Sửa lỗi đóng mở ngoặc nhọn bị dính nhiều backslash: "\\ \left\\\{\\" -> "\left\{", "\\ \right\\\}" -> "\right\}"
  s = s.replace(/\\+\s*left\s*\\+\s*\{/gi, '\\left\\{');
  s = s.replace(/\\+\s*right\s*\\+\s*\}/gi, '\\right\\}');
  s = s.replace(/\\+\s*left\s*\[/gi, '\\left[');
  s = s.replace(/\\+\s*right\s*\]/gi, '\\right]');
  s = s.replace(/\\+\s*left\s*\(/gi, '\\left(');
  s = s.replace(/\\+\s*right\s*\)/gi, '\\right)');

  // 1. Chuẩn hóa ký hiệu Hy Lạp viết thiếu backslash:
  s = s.replace(/(?<!\\)\bDelta\b/g, '\\Delta');

  // Chuẩn hóa pi: thay thế 2pi, k2pi, hoặc \bpi\b đứng độc lập thành \pi
  // Bảo vệ không đụng vào từ tiếng Anh thông thường (pin, topic, spin, opinion, v.v.)
  s = s.replace(/(\d+)\s*pi\b/g, '$1\\pi');
  s = s.replace(/k(\d*)\s*pi\b/gi, 'k$1\\pi');
  s = s.replace(/(?<![\\a-zA-Z])\bpi\b(?![a-zA-Z])/g, '\\pi');

  // 2. Sửa lỗi escape đơn vị đo:
  s = s.replace(/(\d+)\s*\\*text\s*\{?\s*([a-zA-Z]+)\s*\}?/g, '$1\\text{ $2}');

  // 3. Sửa lỗi cú pháp số mũ / ký hiệu độ:
  s = s.replace(/\^\{\s*\\+\s*circ\s*\}/g, '^\\circ');
  s = s.replace(/\^\{\s*circ\s*\}/g, '^\\circ');
  s = s.replace(/\^\s*\\+\s*circ\b/g, '^\\circ');
  s = s.replace(/(?<=\d)\s*\^\s*circ\b/g, '^\\circ');

  return s;
}

/**
 * Tự động bọc $$...$$ cho các môi trường toán trần (naked LaTeX environments) khi chưa có $ hoặc $$ bao bọc:
 * - \left[\begin{aligned}...\end{aligned}\right. (kèm tham số họ nghiệm lượng giác \quad (k \in \mathbb{Z}))
 * - \left[\begin{array}...\end{array}\right. hoặc \left[...\right.
 * - \begin{cases}...\end{cases} (hệ phương trình / hệ BPT)
 * - Các môi trường khác: matrix, pmatrix, bmatrix, vmatrix, array, align, gather...
 */
export function wrapNakedMathEnvironments(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Tự động bọc naked \left[ ... \right. (bao gồm có hoặc không có aligned/array bên trong)
  s = s.replace(/(\\left\s*\[[\s\S]*?\\right\.?(?:\s*\\quad\s*\([^\)]+\))?)/g, (match, env, offset) => {
    if (isInsideMath(s, offset)) return match;
    let safeEnv = env.trim();
    // Tự động bổ sung \right. nếu thiếu
    if (!/\\right\s*[.\]\)\}]/.test(safeEnv)) {
      safeEnv = safeEnv + ' \\right.';
    }
    const isBlock = safeEnv.includes('\n') || safeEnv.length > 35;
    return isBlock ? `\n\n$$\n${safeEnv}\n$$\n\n` : ` $${safeEnv}$ `;
  });

  // 1.5 Tự động chuẩn hóa và bọc \left\{ ... \\ ... \right. thành \begin{cases}...\end{cases}
  s = s.replace(/\\left\s*\\\{([\s\S]*?)\\right\.?/g, (match, body, offset) => {
    if (!body.includes('\\\\') && !body.includes('\n')) return match;
    const safeBody = normalizeCasesBody(body);
    if (isInsideMath(s, offset)) {
      return `\\begin{cases}\n${safeBody}\n\\end{cases}`;
    }
    return `\n\n$$\n\\begin{cases}\n${safeBody}\n\\end{cases}\n$$\n\n`;
  });

  // 2. Tự động bọc các môi trường trần khác: cases, aligned, array, matrix... (trừ khi nằm sau \left[ hoặc đã nằm trong math)
  s = s.replace(/(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})/g, (match, env, offset) => {
    const before = s.slice(Math.max(0, offset - 25), offset);
    if (/\\left\s*[\(\[\{\.]$/.test(before.trim()) || isInsideMath(s, offset)) return match;
    const isBlock = env.includes('\n') || env.length > 35;
    return isBlock ? `\n\n$$\n${env.trim()}\n$$\n\n` : ` $${env.trim()}$ `;
  });

  return s;
}

/**
 * Chuẩn hóa các phương án trắc nghiệm và văn bản từ OCR số hóa:
 * - Xóa sạch các thực thể HTML dư thừa (&nbsp;, &ensp;, &emsp;).
 * - Sửa lỗi phương án B, C, D bị kẹp chung vào bên trong một dấu $...$ của phương án trước.
 * - Tách các lựa chọn trắc nghiệm A., B., C., D. đứng chung dòng thành các dòng độc lập.
 * - Đảm bảo mỗi phương án A., B., C., D. và mệnh đề a), b), c), d) rõ ràng, sạch đẹp.
 */
export function normalizeOcrChoicesAndFormatting(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Xóa sạch &nbsp;, &ensp;, &emsp;
  s = s.replace(/&(?:nbsp|ensp|emsp);+/gi, ' ');

  // 1.5 Tách các phương án trắc nghiệm bị dính liền vào nhau hoặc dính vào đuôi câu hỏi
  // Chỉ tách khi KHÔNG nằm sau các từ ngữ hình học hoặc giới từ (vd: "tại A.", "điểm B.", "từ C.")
  const geoWordPattern = /(?:tại|điểm|đỉnh|gọi|qua|với|từ|trên|của|cho|và|thuộc|đến|cạnh|đường|mặt\s*phẳng|chiếu\s*lên|tọa\s*độ|tâm|trọng\s*tâm|trực\s*tâm|bán\s*kính|vectơ|vector|tam\s*giác(?:\s+[a-zA-Z\.]+)?|tứ\s*diện(?:\s+[a-zA-Z\.]+)?|hình\s*chóp(?:\s+[a-zA-Z\.]+)?|đoạn\s*thẳng)$/i;

  s = s.replace(/([0-9\$\)\}\],.:;?!])\s*(?=(?:[-*]\s*)?(?:\*{0,2}|<b>|\()?[B-D][\.:\)])/g, (match, p1, offset) => {
    const before = s.slice(Math.max(0, offset - 25), offset + p1.length);
    if (geoWordPattern.test(before.trim())) return match;
    return `${p1}\n`;
  });

  s = s.replace(/([0-9\$\)\}\],.:;?!])\s*(?=(?:[-*]\s*)?(?:\*{0,2}|<b>|\()?A[\.:\)])/g, (match, p1, offset) => {
    const before = s.slice(Math.max(0, offset - 25), offset + p1.length);
    if (geoWordPattern.test(before.trim())) return match;
    return `${p1}\n`;
  });

  // Tách các mệnh đề a), b), c), d) của câu hỏi Đúng/Sai ra từng dòng riêng biệt
  s = s.replace(/([^\n])\s*(?=(?:^|\s)(?:[-*]\s*)?(?:\(?\s*[a-d]\s*\)))\s*/g, '$1\n');

  // 2. Tách các phương án trắc nghiệm A., B., C., D. đứng cùng một dòng thành các dòng độc lập
  // Ngoại trừ các dòng bảng Markdown (| ... |)
  const lines = s.split('\n');
  const processedLines: string[] = [];

  for (let line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      processedLines.push(line);
      continue;
    }

    // Nếu dòng chứa nhiều phương án trắc nghiệm dính liền nhau (ví dụ: A. ... B. ... C. ... D. ...)
    if (/(?:^|\s+)(?:[-*]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s*[\s\S]*?(?:[-*]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s*/i.test(line) ||
        /(?:^|\s+)(?:[-*]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s*[\s\S]*?(?:[-*]\s*)?(?:\*{0,2})C[\.\)](?:\*{0,2})\s*/i.test(line) ||
        /(?:^|\s+)(?:[-*]\s*)?(?:\*{0,2})C[\.\)](?:\*{0,2})\s*[\s\S]*?(?:[-*]\s*)?(?:\*{0,2})D[\.\)](?:\*{0,2})\s*/i.test(line)) {
      let splitLine = line.replace(/(\s*)(?=(?:[-*]\s*)?(?:\*{0,2})[B-D][\.\)](?:\*{0,2})\s*)/g, '\n');
      splitLine = splitLine.replace(/([^\n])\s*(?=(?:[-*]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s*(?!Trắc nghiệm|Tự luận|Khẳng định|Mệnh đề))/g, '$1\n');
      processedLines.push(splitLine);
    } else {
      processedLines.push(line);
    }
  }

  s = processedLines.join('\n');
  return s;
}

/**
 * Tiền xử lý nội dung toán tổng thể trước khi xuất Word (.docx) hoặc xuất HTML In
 */
export function preProcessMathContent(content: string): string {
  if (!content) return '';
  let res = rescueCodeAndNestedText(sanitizeLatexString(content));
  res = cleanVietnameseUnicode(res);
  res = normalizeOcrChoicesAndFormatting(res);
  // Sanitize dangling tikz code blocks that pollute Word export
  res = res.replace(/```(?:tikz|latex)?\s*\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}\s*```/gi, '\n[Hình vẽ minh họa]\n');
  res = res.replace(/```tikz[\s\S]*?```/gi, '\n[Hình vẽ minh họa]\n');
  res = res.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '\n[Hình vẽ minh họa]\n');
  res = wrapNakedMathEnvironments(res);
  res = res.replace(/(?:=\s*)?undefined(?![a-zA-Z0-9_\$])/gi, '').replace(/\bundefined\b/gi, '');
  return res;
}

/**
 * Chuyển đổi mã OMML (Office Math Markup Language) từ Word Equation sang LaTeX
 */
export const convertOmmlToLatex = (content: string): string => {
  if (!content || !content.includes('<m:')) return content;

  const ommlNodeToLatex = (nodeXml: string): string => {
    if (!nodeXml) return '';
    let xml = nodeXml.trim();

    // Phân số: <m:f><m:num>...</m:num><m:den>...</m:den></m:f>
    xml = xml.replace(/<m:f[\s\S]*?>[\s\S]*?<m:num>([\s\S]*?)<\/m:num>[\s\S]*?<m:den>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/gi, (_m, num, den) => {
      return `\\frac{${ommlNodeToLatex(num)}}{${ommlNodeToLatex(den)}}`;
    });

    // Căn thức: <m:rad>
    xml = xml.replace(/<m:rad[\s\S]*?>([\s\S]*?)<\/m:rad>/gi, (_m, inner) => {
      const degMatch = inner.match(/<m:deg>([\s\S]*?)<\/m:deg>/i);
      const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/i);
      const deg = degMatch ? ommlNodeToLatex(degMatch[1]).trim() : '';
      const e = eMatch ? ommlNodeToLatex(eMatch[1]).trim() : '';
      return deg ? `\\sqrt[${deg}]{${e}}` : `\\sqrt{${e}}`;
    });

    // Chỉ số trên / dưới: sSubSup, sSub, sSup
    xml = xml.replace(/<m:sSubSup[\s\S]*?>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub>([\s\S]*?)<\/m:sub>[\s\S]*?<m:sup>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSubSup>/gi, (_m, b, sub, sup) => {
      return `{${ommlNodeToLatex(b)}}_{${ommlNodeToLatex(sub)}}^{${ommlNodeToLatex(sup)}}`;
    });
    xml = xml.replace(/<m:sSub[\s\S]*?>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub>([\s\S]*?)<\/m:sub>[\s\S]*?<\/m:sSub>/gi, (_m, b, sub) => {
      return `{${ommlNodeToLatex(b)}}_{${ommlNodeToLatex(sub)}}`;
    });
    xml = xml.replace(/<m:sSup[\s\S]*?>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<m:sup>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSup>/gi, (_m, b, sup) => {
      return `{${ommlNodeToLatex(b)}}^{${ommlNodeToLatex(sup)}}`;
    });

    // Dấu ngoặc và hệ phương trình: <m:d>
    xml = xml.replace(/<m:d[\s\S]*?>([\s\S]*?)<\/m:d>/gi, (_m, inner) => {
      const begChrMatch = inner.match(/<m:begChr\s+m:val="([^"]*)"/i);
      const endChrMatch = inner.match(/<m:endChr\s+m:val="([^"]*)"/i);
      const begChr = begChrMatch ? begChrMatch[1] : '(';
      const endChr = endChrMatch ? endChrMatch[1] : ')';

      const eqArrMatch = inner.match(/<m:eqArr[\s\S]*?>([\s\S]*?)<\/m:eqArr>/i);
      if (eqArrMatch) {
        const rows: string[] = [];
        const eMatches = eqArrMatch[1].matchAll(/<m:e[\s\S]*?>([\s\S]*?)<\/m:e>/gi);
        for (const em of eMatches) {
          const rowContent = ommlNodeToLatex(em[1]).trim();
          if (rowContent) rows.push(rowContent);
        }
        if (begChr === '{' && (!endChr || endChr === '')) {
          return `\\begin{cases} ${rows.join(' \\\\ ')} \\end{cases}`;
        }
        if (begChr === '[' && (!endChr || endChr === '')) {
          return `\\left[ \\begin{array}{l} ${rows.join(' \\\\ ')} \\end{array} \\right.`;
        }
        return `\\left${begChr === '{' ? '\\{' : (begChr || '.')} \\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned} \\right${endChr === '}' ? '\\}' : (endChr || '.')}`;
      }

      const eMatch = inner.match(/<m:e[\s\S]*?>([\s\S]*?)<\/m:e>/i);
      const content = eMatch ? ommlNodeToLatex(eMatch[1]).trim() : '';
      const leftBracket = begChr === '{' ? '\\{' : (begChr || '.');
      const rightBracket = endChr === '}' ? '\\}' : (endChr || '.');
      return `\\left${leftBracket} ${content} \\right${rightBracket}`;
    });

    // Trích xuất văn bản trong <m:t>
    xml = xml.replace(/<m:t[\s\S]*?>([\s\S]*?)<\/m:t>/gi, (_m, t) => t);

    // Dọn các thẻ rác còn lại
    return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  let text = content;

  // Xử lý container <m:oMathPara>
  text = text.replace(/<m:oMathPara[\s\S]*?>[\s\S]*?<\/m:oMathPara>/gi, (match) => {
    const math = ommlNodeToLatex(match);
    return math ? `$$${math}$$` : '';
  });

  // Xử lý container <m:oMath>
  text = text.replace(/<m:oMath[\s\S]*?>[\s\S]*?<\/m:oMath>/gi, (match) => {
    const math = ommlNodeToLatex(match);
    return math ? `$${math}$` : '';
  });

  // Xử lý khối <m:d> độc lập
  text = text.replace(/<m:d[\s\S]*?>[\s\S]*?<\/m:d>/gi, (match) => {
    const math = ommlNodeToLatex(match);
    return math ? `$$${math}$$` : '';
  });

  return text;
};

/**
 * Chuẩn hóa các mệnh đề có chứa dấu ngoặc kép (P: "..." hoặc \overline{P}: "...")
 * Đảm bảo nhãn mệnh đề ở trong $, dấu ngoặc kép ở ngoài math, và mệnh đề toán ở trong $ riêng biệt.
 * Triệt tiêu hoàn toàn lỗi vỡ dấu đô la $ hoặc lồng MATH_BLOCK khi xử lý mệnh đề có trích dẫn.
 */
export const normalizePropositionQuotes = (text: string): string => {
  if (!text) return "";
  let s = text;

  // 0. Triệt tiêu hoàn toàn các dấu gạch chéo rác :// hoặc // bị AI hoặc regex trước chèn nhầm vào mệnh đề
  s = s.replace(/:\s*\\text\{\/\/\}\s*/g, ': ');
  s = s.replace(/:\s*\/\/\s*/g, ': ');
  s = s.replace(/:\s*"\s*\/\/\s*/g, ': "');
  s = s.replace(/\/\/\s*([\\$\w]+)/g, '$1');

  // 1. Dạng $ \overline{P} : "..." $ hoặc $ P : "..." $ (toàn bộ nằm trong math mode)
  s = s.replace(/(?<!\$)\$\s*((?:\\overline\{[A-Za-z]\}|[A-Za-z]))\s*:\s*([“"”])([\s\S]*?)([”"”])\s*\$(?!\$)/g, (_m, prop, q1, body, q2) => {
    let cleanBody = body.trim().replace(/^\/\/\s*/, '').replace(/^\$+|\$+$/g, "").trim();
    return `$${prop}$: ${q1}$${cleanBody}$${q2}`;
  });

  // 2. Dạng $\overline{P}: \text{"}...\text{"}$ hoặc biến thể có \text quanh dấu ngoặc kép
  s = s.replace(/(?<!\$)\$\s*((?:\\overline\{[A-Za-z]\}|[A-Za-z]))\s*:\s*(?:\\text\{)?([“"”])(?:\})?([\s\S]*?)(?:\\text\{)?([”"“])(?:\})?\s*\$(?!\$)/g, (_m, prop, q1, body, q2) => {
    let cleanBody = body.trim().replace(/^\$+|\$+$/g, "").trim();
    return `$${prop}$: ${q1}$${cleanBody}$${q2}`;
  });

  // 3. Dạng ngoài math: \overline{P}: "..." hoặc P: "..." hoặc \overline{P}: “...”
  s = s.replace(/(^|[\s\n])(?<!\$)(?:\\overline\{([A-Za-z])\}|([A-Za-z]))\s*:\s*([“"”])\s*([^\$\n"”]+?)\s*([”"“])/g, (_m, pre, p1, p2, q1, body, q2) => {
    const prop = p1 ? `\\overline{${p1}}` : p2;
    let cleanBody = body.trim().replace(/^\$+|\$+$/g, "").trim();
    if (/[\\^_=><\+\-\*\/]/.test(cleanBody)) {
      return `${pre}$${prop}$: ${q1}$${cleanBody}$${q2}`;
    }
    return `${pre}$${prop}$: ${q1}${cleanBody}${q2}`;
  });

  // 4. Dạng ngoài math: P : ”\forall ...” (có ký hiệu toán \forall, \exists)
  s = s.replace(/([“"”])\s*(\\(?:forall|exists)[\s\S]*?)([”"“])/g, (_m, q1, formula, q2) => {
    let cleanForm = formula.trim().replace(/^\$+|\$+$/g, "").trim();
    return `${q1}$${cleanForm}$${q2}`;
  });

  // 5. Chuẩn hóa "mệnh đề P" hoặc "mệnh đề Q" ngoài math thành "mệnh đề $P$", "mệnh đề $Q$"
  s = s.replace(/(mệnh\s+đề)\s+([PQAB])(?![a-zA-Z0-9\$\\])/gi, (_m, mWord, letter) => `${mWord} $${letter}$`);

  // 6. Tự động bọc $...$ cho \overline{P}, \overline{Q} trần trụi ngoài math
  s = s.replace(/(?<![\$\\])\\(?:overline|bar)\{([A-Za-z])\}(?!\$)/g, '$\\overline{$1}$');

  return s;
};

/**
 * Giải cứu mã lập trình (Python, Scratch, code block) và triệt tiêu lỗi lồng \text{\text{...{"}}}}
 * 1. Thu gọn các chuỗi \text{\text{...}} lồng nhau thành \text{...}
 * 2. Giải phóng các dấu ngoặc kép bị bọc thừa \text{"} hoặc nhiều lớp \text{
 * 3. Giải cứu các lời gọi hàm lập trình như print(...), input(...), println(...) bị bọc $...$ nhầm
 * 4. Giải phóng các chuỗi văn bản hoặc từ đơn giản bị bọc $...$ không cần thiết (vd: $"Pass"$ -> "Pass")
 * 5. Loại bỏ từ rác undefined rò rỉ trong công thức hoặc văn bản
 */
export const rescueCodeAndNestedText = (text: string): string => {
  if (!text) return '';
  let s = text;

  // 0. Triệt tiêu từ rác "undefined" rò rỉ vào chuỗi ở mọi vị trí
  s = s.replace(/(?:=\s*)?undefined(?![a-zA-Z0-9_\$])/gi, '');
  s = s.replace(/\bundefined\b/gi, '');
  s = s.replace(/=\s*undefined/gi, '=');

  // 0.1 Triệt tiêu mọi token hoặc placeholder rò rỉ từ các bước tokenizer
  s = s.replace(/[\uE000\uE001]/g, '');
  s = s.replace(/___?(?:MATH|ENV|SET_MATH|WRAPPED_MATH|TEXT|CODE)_BLOCK_(\d+)___?/g, '');
  s = s.replace(/___SET_MATH_TOKEN_\d+___/g, '');
  s = s.replace(/(?<![a-zA-Z0-9_\$])(?:MATH|ENV|SET_MATH|WRAPPED_MATH)_BLOCK_\d+(?![a-zA-Z0-9_\$])/g, '');

  // 1. Thu gọn \text{\text{...}} lồng nhau bất kể độ sâu
  let prev = '';
  let iter = 0;
  while (prev !== s && iter < 20) {
    prev = s;
    iter++;
    s = s.replace(/\\text\s*\{\s*\\text\s*\{([\s\S]*?)\}\s*\}/g, '\\text{$1}');
  }

  // 2. Thu gọn \text{”} hoặc \text{"} hoặc nhiều lớp \text{} quanh dấu ngoặc kép
  s = s.replace(/(?:\\text\s*\{\s*)+([“"”])(?:\s*\})+/g, '$1');
  s = s.replace(/\\text\s*\{\s*([“"”][^{}]*?[”"“])\s*\}/g, '$1');

  // 3. Giải cứu hàm lập trình trong môn Tin học, Năng lực số, STEM (print, input, ...) bị kẹp $...$ hoặc bọc \text{"}
  s = s.replace(/(?:print|println|input)\s*\(\s*\$(?:\\text\{[^{}]*\})+\s*([“"”][^$\n]+?[”"“])\s*(?:\})+\s*\$\s*\)/g, 'print($1)');
  s = s.replace(/print\s*\(\s*\$*(?:\\text\{[^{}]*\})*\s*([“"”]?)([^$\n"”]+)\1\s*(?:\})*\$*\s*\)/g, 'print("$2")');
  s = s.replace(/print\s*\(\s*\$+(?:\\text\{)*\s*([“"”]?)([^$\n"”]+)\1(?:\})*\s*\$+\s*\)/g, 'print("$2")');
  s = s.replace(/\b(print|println|input|write|range|len|str|int|float)\s*\(\s*\$([^\$\n]+)\$\s*\)/g, '$1($2)');
  s = s.replace(/\b(print|println|input)\s*\(\s*\$?\\text\{[“"”]\}([^$\n]+?)\\text\{[“"”]\}\$?\s*\)/g, '$1("$2")');
  s = s.replace(/\b(print|println|input)\s*\(\s*\$([“"”][^$\n]+?[”"“])\$\s*\)/g, '$1($2)');

  // 4. Giải phóng chuỗi thuần túy trong dấu ngoặc kép bị bọc $...$ mà không có toán tử toán học: $"Pass"$ -> "Pass"
  s = s.replace(/(?<!\$)\$([“"”][^$\\\n+=\/<>^_]+?[”"“])\$(?!\$)/g, '$1');

  // 5. Chuẩn hóa đoạn code inline có if ...: print("...") nếu bị sót $ quanh chuỗi:
  s = s.replace(/(if\s+[^\n:]+:\s*print\()\s*\$([^$\n]+)\$\s*(\))/g, '$1$2$3');
  s = s.replace(/(if\s+[^\n:]+:\s*print\()\s*\$?\\text\{[“"”]\}([^$\n]+?)\\text\{[“"”]\}\$?\s*(\))/g, '$1"$2"$3');

  // 6. Chuẩn hóa mệnh đề có ngoặc kép
  s = normalizePropositionQuotes(s);

  return s;
};

/**
 * Chuẩn hóa dấu tiếng Việt (Unicode NFD -> NFC) và triệt tiêu dấu thanh bị gãy rụng:
 */
export const cleanVietnameseUnicode = (str: string): string => {
  if (!str) return '';
  let res = rescueCodeAndNestedText(str);

  // 1. Luôn chuẩn hóa trực tiếp sang NFC (Precomposed Form) để ghép liền dấu thanh tiếng Việt
  res = res.normalize('NFC');

  // 2. Triệt tiêu triệt để các ký tự dấu thanh bị gãy rụng hoặc dấu phẩy/accent tách rời
  res = res
    .replace(/PHÂ\s*[`'´’^]\s*N/gi, 'PHẦN')
    .replace(/TẮ\s*[`'´’^]\s*T/gi, 'TẮT')
    .replace(/THUYẾ\s*[`'´’^]\s*T/gi, 'THUYẾT')
    .replace(/TRỌ\s*[`'´’^]\s*NG/gi, 'TRỌNG')
    .replace(/TÂ\s*[`'´’^]\s*M/gi, 'TÂM')
    .replace(/THỐ\s*[´'’^]\s*NG/gi, 'THỐNG')
    .replace(/TRĂ\s*[´'’^]\s*C/gi, 'TRẮC')
    .replace(/NHIÊ\s*[`'´’^]\s*U/gi, 'NHIỀU')
    .replace(/PHƯƠ\s*[`'´’^]\s*NG/gi, 'PHƯƠNG')
    .replace(/LỰ\s*[`'´’^]\s*A/gi, 'LỰA')
    .replace(/CHỌ\s*[`'´’^]\s*N/gi, 'CHỌN')
    .replace(/nhấ\s*[´'’^]\s*t/gi, 'nhất')
    .replace(/viế\s*[´'’^]\s*t/gi, 'viết')
    .replace(/biế\s*[´'’^]\s*n/gi, 'biến')
    .replace(/tiế\s*[´'’^]\s*p/gi, 'tiếp')
    .replace(/kiế\s*[´'’^]\s*n/gi, 'kiến')
    .replace(/thứ\s*[´'’^]\s*c/gi, 'thức')
    .replace(/bằ\s*[`'´’^]\s*ng/gi, 'bằng')
    .replace(/số\s*[´'’^]\s*ng|số\s*[`'´’^]\s*ng/gi, 'sống')
    .replace(/thế\s*[´'’^]|thế\s*[`'´’^]/gi, 'thế')
    .replace(/cấ\s*[´'’^]\s*p|cấp\s*[`'´’^]/gi, 'cấp')
    .replace(/cấ\s*[´'’^]\s*u|cấu\s*[`'´’^]/gi, 'cấu')
    .replace(/điề\s*[`'´’^]\s*u|điều\s*[`'´’^]/gi, 'điều')
    .replace(/Đố\s*[´'’^]\s*i|Đối\s*[`'´’^]|Đố\s*[`'´’^]\s*i/gi, 'Đối')
    .replace(/đố\s*[´'’^]\s*i|đối\s*[`'´’^]|đố\s*[`'´’^]\s*i/gi, 'đối')
    .replace(/tố\s*[´'’^]|tố\s*[`'´’^]/gi, 'tố')
    .replace(/Số\s*[´'’^]/gi, 'Số')
    .replace(/đề\s*[`'´’^]/gi, 'đề')
    .replace(/Â[`'´’^]/g, 'Ầ')
    .replace(/Ă[´'’^]/g, 'Ắ')
    .replace(/Ă[`']/g, 'Ằ')
    .replace(/ô[´'’^]/g, 'ố')
    .replace(/ô[`']/g, 'ồ')
    .replace(/ê[´'’^]/g, 'ế')
    .replace(/ê[`']/g, 'ề')
    .replace(/ế[´'’^]/g, 'ế')
    .replace(/ố[´'’^]/g, 'ố')
    // Chỉ loại bỏ dấu thanh gãy rụng trên nguyên âm tiếng Việt, TUYỆT ĐỐI KHÔNG xóa dấu đạo hàm y', f'(x), y'', ...
    .replace(/([aAeEiIoOuU\u00C0-\u1EF9])[\s]*[`´^](?=[a-zA-Z\u00C0-\u1EF9\s]|$)/g, '$1')
    .replace(/´([A-ZÀ-Ỹa-zà-ỹ])/g, '$1');

  // Chuẩn hóa lần cuối về NFC
  res = res.normalize('NFC');

  // 3. Sửa lỗi dính chữ tiếng Việt với công thức và hàm lượng giác
  res = res
    .replace(/\bcủasinxluôn\b/gi, 'của $\\sin x$ luôn')
    .replace(/\bcủasinx\b/gi, 'của $\\sin x$')
    .replace(/\bthànhcos2x\b/gi, 'thành $\\cos 2x$')
    .replace(/\bthànhcos\b/gi, 'thành $\\cos$')
    .replace(/\bvớit\b/gi, 'với $t$')
    .replace(/\bgồmx\b/gi, 'gồm $x$')
    .replace(/\bgồm(?=\\frac|\d|[a-zA-Z]\b)/gi, 'gồm ')
    .replace(/\bvếphảibằng\b/gi, 'vế phải bằng')
    .replace(/\bvếphải\b/gi, 'vế phải')
    .replace(/\bvếtrái\b/gi, 'vế trái')
    .replace(/\bĐểmnguyên\b/gi, 'Để $m$ nguyên')
    .replace(/\bđểmnguyên\b/gi, 'để $m$ nguyên')
    .replace(/\bĐểm\b/gi, 'Để $m$')
    .replace(/\bđểm\b/gi, 'để $m$')
    .replace(/\bcó(\d+)nghiệm\b/gi, 'có $1 nghiệm')
    .replace(/\bxétm\b/gi, 'xét $m$')
    .replace(/\bchọnm\b/gi, 'chọn $m$')
    .replace(/(\b(?:sin|cos|tan|cot)[a-z0-9]*)eq0/gi, '$1 \\neq 0')
    .replace(/(\b(?:sin|cos|tan|cot)[a-z0-9]*)eq1/gi, '$1 \\neq 1')
    .replace(/(?<![\\a-zA-Z])([xymtabckuvwz])eq(\d+)/gi, '$1 \\neq $2')
    .replace(/(?<![\\a-zA-Z])([xymtabckuvwz])eq(?=\\frac|\d)/gi, '$1 \\neq ');

  // 4. Xử lý thiếu gạch đầu mệnh đề phủ định (\overline{P}, \overline{Q}, ...)
  res = res
    .replace(/([PQAB])[\u0304\u0305]/g, '$\\overline{$1}$')
    .replace(/\\bar\{([A-Za-z])\}/g, '\\overline{$1}')
    .replace(/(?<!\\)\b(bar|overline)\s*\{([A-Za-z])\}/g, '\\overline{$2}');

  return res;
};

export function fixSequencesAndFractions(text: string): string {
  if (!text) return '';
  
  // Split by '$' to only replace OUTSIDE of existing math blocks
  const parts = text.split('$');
  for (let i = 0; i < parts.length; i += 2) {
    let p = parts[i];
    if (!p) continue;
    
    // 1. Standalone sequence terms list: "u1, u2, u3" -> "$u_1, u_2, u_3$", "u1, u2, ..., un" -> "$u_1, u_2, ..., u_n$"
    p = p.replace(/\b([uv])(\d+)\s*,\s*([uv])(\d+)\s*,\s*([uv])(\d+)\b/g, (_, a, b, c, d, e, f) => `$${a}_${b}, ${c}_${d}, ${e}_${f}$`);
    p = p.replace(/\b([uv])(\d+)\s*,\s*([uv])(\d+)\s*,\s*\.\.\.\s*,\s*([uv])(n)\b/g, (_, a, b, c, d, e, f) => `$${a}_${b}, ${c}_${d}, ..., ${e}_${f}$`);

    // 2. Parentheses sequence notation: "(un)" -> "$(u_n)$", "(vn)" -> "$(v_n)$"
    p = p.replace(/\(([uv])(n)\)/g, (_, a, b) => `$(${a}_${b})$`);

    // 3. Standalone sequence terms equations: "u1 = 2", "un = 2n + 1", "u_n = u_{n-1} + 3"
    p = p.replace(/\b([uv])(\d+)\s*=\s*([+-]?\d+(?:\/\d+)?)\b/g, (_, a, b, c) => `$${a}_${b} = ${c}$`);
    p = p.replace(/\b([uv])(n)\s*=\s*([+-]?\d+(?:\/\d+)?)\b/g, (_, a, b, c) => `$${a}_${b} = ${c}$`);
    p = p.replace(/\b([uv])(\d+)\s*=\s*(\\frac\{[^{}]*\}\s*\{[^{}]*\})/g, (_, a, b, c) => `$${a}_${b} = ${c}$`);
    p = p.replace(/\b([uv])(n)\s*=\s*(\\frac\{[^{}]*\}\s*\{[^{}]*\})/g, (_, a, b, c) => `$${a}_${b} = ${c}$`);

    // 4. Standalone parameters d (công sai) and q (công bội): e.g. "d = 5/3", "d = -3", "q = \frac{1}{2}"
    p = p.replace(/\b([dq])\s*=\s*([+-]?\d+(?:\/\d+)?)\b/g, (_, a, b) => `$${a} = ${b}$`);
    p = p.replace(/\b([dq])\s*=\s*(\\frac\{[^{}]*\}\s*\{[^{}]*\})/g, (_, a, b) => `$${a} = ${b}$`);

    // 5. Raw LaTeX fractions with variables: "d=\frac{5}{3}", "u_n=\frac{n}{n+1}"
    p = p.replace(/\b([a-zA-Z0-9_{}\(\)\+\-\*\/']+[ \t]*=[ \t]*\\frac\{[^{}]*\}\s*\{[^{}]*\})/g, (_, a) => `$${a}$`);
    
    // 5.5 Match equations or declarations containing LaTeX symbols: e.g. "D = \mathbb{R} \setminus {1}"
    p = p.replace(/(?<![\$\w])([a-zA-Z0-9_']+\s*=\s*(?:\\[a-zA-Z]+(?:\{[^{}]*\}|\s)*)+)/g, (_, a) => `$${a}$`);

    // 6. Naked fractions: "\frac{5}{3}"
    p = p.replace(/(?<![\$\\\w])(\\frac\{[^{}]*\}\s*\{[^{}]*\})/g, (_, a) => `$${a}$`);

    // 6.5 Naked limit expressions: e.g. "\lim_{x \to +\infty}" -> "$\lim_{x \to +\infty}$"
    p = p.replace(/(?<![\$\\\w])(\\lim_\{[^{}]*\}\s*[a-zA-Z0-9\(\)\s=+\-*\/_']*(?:\\[a-zA-Z]+)?)/g, (_, a) => `$${a}$`);

    // 7. General standalone subscript sequence variables: "u1" -> "$u_1$", "un" -> "$u_n$"
    p = p.replace(/\b([uv])(\d+)\b/g, (_, a, b) => `$${a}_${b}$`);
    p = p.replace(/\b([uv])(n)\b/g, (_, a, b) => `$${a}_${b}$`);
    
    // 8. General sequence terms with subscript notation like u_n, u_{n+1}
    p = p.replace(/\b([uv])_\{([a-zA-Z0-9\+\-]+)\}\b/g, (_, a, b) => `$${a}_{${b}}$`);
    p = p.replace(/\b([uv])_([a-zA-Z0-9])\b/g, (_, a, b) => `$${a}_${b}$`);
    p = p.replace(/\b([uv])\(([a-zA-Z0-9\+\-]+)\)\b/g, (_, a, b) => `$${a}_{${b}}$`);

    // 9. Raw interval and coordinate notations outside math: e.g. "(-\infty; 1)", "(1; +\infty)"
    p = p.replace(/(?<![\$\w])([\[\(]\s*[+-]?\\?(?:infty|[0-9a-zA-Z\pi\theta]+)\s*[;,]\s*[+-]?\\?(?:infty|[0-9a-zA-Z\pi\theta]+)\s*[\]\)])/g, (_, a) => `$${a}$`);

    parts[i] = p;
  }
  
  return parts.join('$');
}

/**
 * Chuẩn hóa văn bản & công thức toán trước khi render:
 * 1. Sửa lỗi chính tả văn bản thông dụng (ví dụ: "và o các khoảng trống" -> "vào các khoảng trống")
 * 2. Tự động tách liên từ "và", "hoặc", "với" bị dính giữa 2 công thức (vd: )vàB =, ]vàB =)
 * 3. Tách cặp $ nếu liên từ "và", "hoặc", "hay", "với" bị bao bọc bên trong công thức math
 * 4. Tự động bao bọc các biểu thức tập hợp trần A = [a; b) vào cặp dấu $...$
 * 5. Định dạng typography dòng "Đáp số: ........" cho đồng đều và đẹp mắt
 */
export const polishMathText = (content: string): string => {
  if (!content) return '';
  let text = fixSequencesAndFractions(content);

  // 1. Sửa lỗi chính tả văn bản thông dụng
  text = text.replace(/và\s+o\s+các\s+khoảng\s+trống/gi, 'vào các khoảng trống');
  text = text.replace(/và\s+o\s+(?:các\s+)?(?:khoảng|chỗ)\s+trống/gi, 'vào các khoảng trống');

  // 2. Tự động tách liên từ "và", "hoặc", "với" bị dính giữa 2 công thức (vd: )vàB =, ]vàB =)
  // Trường hợp nằm ngoài hoặc trong dấu $, bảo vệ không phá vỡ từ tiếng Việt (vào, vàng, vài)
  text = text
    .replace(/\b1vàm\b/gi, '1 và m')
    .replace(/\bvàtìm\b/gi, 'và tìm')
    .replace(/([\)\]\}0-9a-zA-Z])(?<!\s)và(?!(?:o|i|ng|c|t)\b)([a-zA-Z0-9\$\\])/g, '$1 và $2')
    .replace(/([\)\]\}0-9a-zA-Z])(?<!\s)hoặc(?=[a-zA-Z0-9\$\\])/g, '$1 hoặc $2')
    .replace(/([\)\]\}0-9a-zA-Z])(?<!\s)với(?=[a-zA-Z0-9\$\\])/g, '$1 với $2')
    .replace(/([\)\]\}0-9a-zA-Z])\s*và\s*([A-Z])/g, '$1 và $2')
    .replace(/([\)\]\}0-9a-zA-Z])\s*hoặc\s*([A-Z])/g, '$1 hoặc $2')
    .replace(/([\)\]\}0-9a-zA-Z])\s*với\s*([A-Z])/g, '$1 với $2');

  // Bảo vệ tạm thời các khối \text{...} để không vô tình xé rách văn bản đã được bọc chuẩn
  const textTokens: string[] = [];
  text = text.replace(/\\text\{[^{}]*\}/g, (match) => {
    textTokens.push(match);
    return `___POLISH_TEXT_${textTokens.length - 1}___`;
  });

  // 3. Tách cặp $ nếu liên từ "và", "hoặc", "hay", "với" bị bao bọc bên trong công thức math
  // Ví dụ: $A = [-4; 5) và B = (-2; 7]$ -> $A = [-4; 5)$ và $B = (-2; 7]$
  // Đảm bảo p1 và p2 không phải chỉ toàn khoảng trắng hoặc rỗng (tránh match nhầm $ và $)
  let prev = '';
  let iter = 0;
  while (prev !== text && iter < 4) {
    prev = text;
    iter++;
    text = text.replace(/\$([^\$\s][^\$]*?)\s+(và|hoặc|hay|với)\s+([^\$]*?[^\$\s])\$/g, (_match, p1, conj, p2) => {
      return `$${p1.trim()}$ ${conj} $${p2.trim()}$`;
    });
    // Xử lý trường hợp không có khoảng trắng: $A = [-4; 5)vàB = (-2; 7]$
    text = text.replace(/\$([^\$\s][^\$]*?)(và|hoặc|hay|với)([^\$]*?[^\$\s])\$/g, (_match, p1, conj, p2) => {
      return `$${p1.trim()}$ ${conj} $${p2.trim()}$`;
    });
  }

  // Khôi phục các khối \text{...}
  text = text.replace(/___POLISH_TEXT_(\d+)___/g, (_m, idx) => textTokens[Number(idx)] || '');

  // 4. Bọc các biểu thức tập hợp đứng trần như B \setminus A = [5; 7), A \cap B = [2; 5], hoặc A = [-4; 5) thành $...$
  text = text.replace(/(?<![a-zA-Z0-9\$\\])\b([A-Z]\s*(?:\\(?:setminus|cap|cup|subset|supset|subseteq|supseteq)\s*[A-Z]\s*)+=\s*[\[\(]\s*[^;,\]\)\n]+\s*[;,]\s*[^;,\]\)\n]+\s*[\]\)])(?![a-zA-Z0-9\$\\])/g, (_m, g1) => `$${g1}$`);
  text = text.replace(/(?<![a-zA-Z0-9\$\\]|\\(?:setminus|cap|cup)\s*)\b([A-Z]\s*=\s*[\[\(]\s*[^;,\]\)\n]+\s*[;,]\s*[^;,\]\)\n]+\s*[\]\)])(?![a-zA-Z0-9\$\\])/g, (_m, g1) => `$${g1}$`);

  // 5. Định dạng dòng "Đáp số: ........" cho đồng đều và đẹp mắt
  text = text.replace(/(?:\*?Đáp số:\*?\s*)[\.]{3,}/gi, '*Đáp số:* ................................................................');

  // 6. Phục hồi triệt để bất kỳ sự rò rỉ nào của \infty, \pm\infty, \ne
  text = text
    .replace(/\\in\s*fty\b/g, '\\infty')
    .replace(/pm\s*\\in\s*fty\b/g, '\\pm\\infty')
    .replace(/\\pm\s*\\in\s*fty\b/g, '\\pm\\infty')
    .replace(/\bpm\s*\\infty\b/g, '\\pm\\infty')
    .replace(/(?<!\\)\binfty\b/g, '\\infty')
    .replace(/(?<![\\a-zA-Z])([xymtabckuvwz])\s+e\s+(-?\d+)/g, '$1 \\ne $2');

  // 7. Chuẩn hóa công thức Cấp số cộng và tách chữ tiếng Việt ra khỏi dấu $
  text = normalizeArithmeticProgressionFormulas(text);

  return text;
};

export const sanitizeAndFormatMath = polishMathText;

/**
 * Chuẩn hóa các toán tử so sánh bị thiếu dấu gạch chéo ngược hoặc dính liền ký tự (vd: -2leqx -> -2 \le x, |x|leq3 -> |x| \le 3)
 */
export const fixNakedLeqGeq = (str: string): string => {
  if (!str) return "";
  let s = str;
  // Sửa leq, geq, neq dính liền chữ số hoặc ký tự: -2leqx -> -2 \le x, |x|leq3 -> |x| \le 3
  s = s.replace(/([0-9a-zA-Z\$\(\]\}|\_])\s*(?:\\)?(leq|geq|neq)\s*([0-9a-zA-Z\$\(\]\}|\_])/gi, (_m, a, op, b) => {
    const latexOp = op.toLowerCase() === "leq" ? "\\le" : op.toLowerCase() === "geq" ? "\\ge" : "\\neq";
    return `${a} ${latexOp} ${b}`;
  });
  s = s.replace(/(?<=[0-9a-zA-Z\$\(\]\}|\_])\s*(?:\\)?(leq|geq|neq)\s*(?=[0-9a-zA-Z\$\(\]\}|\_]|\-)/gi, (_m, op) => {
    return op.toLowerCase() === "leq" ? " \\le " : op.toLowerCase() === "geq" ? " \\ge " : " \\neq ";
  });
  s = s.replace(/(?<!\\)\b(leq|geq)\b/gi, (_m, op) => op.toLowerCase() === "leq" ? "\\le" : "\\ge");
  s = s.replace(/(?<!\\)\b(neq)\b/gi, "\\neq");
  s = s.replace(/\\leq\b/g, "\\le");
  s = s.replace(/\\geq\b/g, "\\ge");
  return s;
};

/**
 * Chuẩn hóa các ký hiệu Logic mệnh đề & Lý thuyết tập hợp (Chương trình Toán THPT):
 * 1. Khôi phục ký hiệu với mọi (\forall) và tồn tại (\exists) bị mất dấu gạch chéo hoặc dính chữ (forallx -> \forall x, existsx -> \exists x)
 * 2. Khôi phục phép hiệu tập hợp (\setminus) bị dính chữ hoặc mất gạch chéo (BsetminusA -> B \setminus A, \setminus)
 * 3. Khôi phục tập rỗng (\emptyset / \varnothing) bị mất gạch chéo (A \cap B = emptyset -> A \cap B = \emptyset)
 * 4. Khôi phục phép giao (\cap), phép hợp (\cup), tập con (\subset, \supset, \subseteq, \supseteq) bị dính chữ (AcapB -> A \cap B)
 * 5. Khôi phục quan hệ thuộc (\in, \notin) và tập số thực/nguyên (\mathbb{R}, \mathbb{Z}, \mathbb{N}, \mathbb{Q})
 * 6. Xử lý dấu ngoặc kép dạng ”\forall...” hoặc "\exists..." bọc gọn vào khối math hoặc dùng \text{...} chuẩn KaTeX
 */
export const normalizeLogicAndSetSymbols = (text: string): string => {
  if (!text) return "";
  let s = text;

  // 1. Phục hồi ký hiệu phổ dụng (\forall) và tồn tại (\exists):
  s = s.replace(/(?<!\\)\bforall\s*([a-zA-Z])/g, '\\forall $1');
  s = s.replace(/(?<!\\)\bforall\b/g, '\\forall');
  s = s.replace(/\\forall([a-zA-Z])/g, '\\forall $1');

  s = s.replace(/(?<!\\)\bexists\s*([a-zA-Z])/g, '\\exists $1');
  s = s.replace(/(?<!\\)\bexists\b/g, '\\exists');
  s = s.replace(/\\exists([a-zA-Z])/g, '\\exists $1');

  // Chuẩn hóa tập số thực, số tự nhiên, số nguyên, số hữu tỉ sau lượng từ (\forall x \in R -> \forall x \in \mathbb{R})
  s = s.replace(/\\(?:forall|exists)\s*([a-zA-Z0-9,\s]+?)\s*\\in\s*(R|N|Z|Q)(?![a-zA-Z])/g, (_m, vars, set) => {
    return `${_m.startsWith("\\forall") ? "\\forall" : "\\exists"} ${vars.trim()} \\in \\mathbb{${set}}`;
  });

  // Hợp nhất các khối mệnh đề lượng từ bị tách đôi bởi dấu phẩy/hai chấm:
  // Ví dụ 1: `$\forall x \in \mathbb{R}$, $x^2 \ge 0$` -> `$\forall x \in \mathbb{R}, x^2 \ge 0$`
  s = s.replace(/(?<!\$)\$(?!\$)\s*(\\(?:forall|exists)[^\$]+?)\s*\$(?!\$)\s*([,;:]|\s+)\s*(?<!\$)\$(?!\$)\s*([^\$]+?)\s*\$(?!\$)/g, (_m, qPart, sep, pred) => {
    return `$${qPart.trim()}${sep.trim() ? sep : ' '} ${pred.trim()}$`;
  });

  // Ví dụ 2: `$\forall x \in \mathbb{R}$, x^2 \ge 0` (vế sau bị rơi ra ngoài dấu $)
  s = s.replace(/(?<!\$)\$(?!\$)\s*(\\(?:forall|exists)[^\$]+?)\s*\$(?!\$)\s*([,;:])\s*([^$\n\.,;!?"”]+?(?:[=><\le\ge\approx\neq\\+\-*\/^\_]|\\vdots|\bchia hết\b|\bchẵn\b|\blẻ\b)[^$\n\.,;!?"”]*)(?=[.,;!?\n"”]|$)/g, (_m, qPart, sep, pred) => {
    return `$${qPart.trim()}${sep} ${pred.trim()}$`;
  });

  // Tự động bọc trọn vẹn mệnh đề lượng từ trần trụi (\forall, \exists) ngoài math:
  // Ví dụ: \forall x \in \mathbb{R}, x^2 \ge 0 -> $\forall x \in \mathbb{R}, x^2 \ge 0$
  s = s.replace(/(?<![\\$a-zA-Z0-9])(\\(?:forall|exists)\s+[a-zA-Z0-9,\s\\]+?(?:\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z]|\[[^\]\n]+\]|\([^\)\n]+\)|\{[^\}\n]+\}))?\s*[,;:]\s*[^$\n\.,;!?"”]+?(?:[=><\le\ge\approx\neq\\+\-*\/^\_]|\\vdots|\bchia hết\b|\bchẵn\b|\blẻ\b)[^$\n\.,;!?"”]*)(?=[.,;!?\n"”]|$)/g, (_m, prop) => {
    return `$${prop.trim()}$`;
  });

  // 2. Phục hồi phép hiệu tập hợp (\setminus):
  s = s.replace(/([A-Za-z0-9\)])\s*(?<!\\)setminus\s*([A-Za-z0-9\(])/g, '$1 \\setminus $2');
  s = s.replace(/([A-Za-z0-9\)])\s*\\setminus([A-Za-z0-9\(])/g, '$1 \\setminus $2');
  s = s.replace(/(?<!\\)\bsetminus\b/g, '\\setminus');

  // 3. Phục hồi tập rỗng (\emptyset):
  s = s.replace(/(?<!\\)\b(emptyset|varnothing)\b/g, '\\emptyset');
  s = s.replace(/(?<=[=\s])emptyset(?=[\s\?,;\.\)]|$)/g, '\\emptyset');

  // 4. Phục hồi phép giao (\cap) và phép hợp (\cup) khi bị dính chữ:
  s = s.replace(/([A-Z0-9\)])\s*(?<!\\)cap\s*([A-Z0-9\(])/g, '$1 \\cap $2');
  s = s.replace(/([A-Z0-9\)])\s*(?<!\\)cup\s*([A-Z0-9\(])/g, '$1 \\cup $2');
  s = s.replace(/([A-Z0-9\)])\s*\\cap([A-Z0-9\(])/g, '$1 \\cap $2');
  s = s.replace(/([A-Z0-9\)])\s*\\cup([A-Z0-9\(])/g, '$1 \\cup $2');

  // Phục hồi tập con \subset, \supset, \subseteq, \supseteq bị dính chữ:
  s = s.replace(/([A-Z0-9\)])\s*(?<!\\)(subset|supset|subseteq|supseteq)\s*([A-Z0-9\(])/g, '$1 \\$2 $3');
  s = s.replace(/([A-Z0-9\)])\s*\\(subset|supset|subseteq|supseteq)([A-Z0-9\(])/g, '$1 \\$2 $3');

  // 5. Phục hồi ký hiệu thuộc (\in, \notin) và tập hợp số:
  s = s.replace(/([a-zA-Z0-9])\s*\\in\s*(mathbb[A-Z]|[A-Z])/g, '$1 \\in \\$2');
  s = s.replace(/\\mathbb([A-Z])/g, '\\mathbb{$1}');
  s = s.replace(/(?<!\\)\bnotin\b/g, '\\notin');

  // Phục hồi mệnh đề phủ định \overline{P}, \bar{P}
  s = s.replace(/(?<!\\)\b(overline|bar)\{([A-Za-z])\}/g, '\\overline{$2}');
  s = s.replace(/\\bar\{([A-Za-z])\}/g, '\\overline{$1}');

  // 6. Chuẩn hóa mệnh đề có dấu ngoặc kép hoặc lượng từ
  s = normalizePropositionQuotes(s);

  // 7. Xử lý dấu ngoặc kép trong hoặc quanh mệnh đề toán:
  s = rescueCodeAndNestedText(s);

  // Tách dấu ngoặc kép ra ngoài math mode thay vì bọc \text{"} làm rách KaTeX
  s = s.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (_m, formula) => {
    // Nếu toàn bộ công thức chỉ là một chuỗi văn bản thuần trong ngoặc kép, không có lệnh LaTeX -> giải phóng khỏi $
    if (!/\\|[=<>_^\+\*]/.test(formula) && /^[“"”][^“"”]+[“"”]$/.test(formula.trim())) {
      return formula.trim();
    }
    // Nếu công thức chứa hàm code print/input -> giải cứu
    if (/\b(print|input|println)\s*\(/.test(formula)) {
      return rescueCodeAndNestedText(formula);
    }
    // Nếu có dạng \overline{P}: "..." hoặc P: "..." bên trong $ -> kéo ngoặc kép ra ngoài
    const propMatch = formula.match(/^\s*((?:\\overline\{[A-Za-z]\}|[A-Za-z]))\s*:\s*([“"”])([\s\S]*?)([”"“])\s*$/);
    if (propMatch) {
      const cleanBody = propMatch[3].trim().replace(/^\$+|\$+$/g, '').trim();
      return `$${propMatch[1]}$: ${propMatch[2]}$${cleanBody}$${propMatch[4]}`;
    }
    // Nếu cả công thức bị bọc ngoặc kép bên ngoài: "x^2 + 1 > 0"
    const quoteWrapMatch = formula.match(/^\s*([“"”])([\s\S]*?)([”"“])\s*$/);
    if (quoteWrapMatch) {
      const cleanInner = quoteWrapMatch[2].trim().replace(/^\$+|\$+$/g, '').trim();
      if (!cleanInner || !/[\\<>=+\-\^_\/]/.test(cleanInner)) {
        return `${quoteWrapMatch[1]}${cleanInner}${quoteWrapMatch[3]}`;
      }
      return `${quoteWrapMatch[1]}$${cleanInner}$${quoteWrapMatch[3]}`;
    }
    return `$${formula.trim()}$`;
  });

  return rescueCodeAndNestedText(s);
};

/**
 * Chuẩn hóa toàn diện ký hiệu tập hợp chứa dấu ngoặc nhọn { } (đặc trưng tập hợp, liệt kê phần tử):
 * 1. Thoát dấu \{ và \} chuẩn LaTeX để KaTeX không nuốt mất dấu ngoặc nhọn
 * 2. Tách các khối math bị dính liên từ (vd: $A = ... và B = ...$) thành $A = ...$ và $B = ...$
 * 3. Tự động bọc $...$ cho các tập hợp trần trụi ngoài math (A = {x \in ...} hoặc {x \in ...} hoặc A = {1; 2; 3})
 * 4. Tự động phục hồi cặp dấu ngoặc nhọn nếu đề bài bị thiếu (vd: A = x \in Z \mid ... -> A = \{x \in Z \mid ...\})
 */
export const normalizeSetNotation = (text: string): string => {
  if (!text) return "";
  let s = normalizePropositionQuotes(text);
  s = normalizeLogicAndSetSymbols(fixNakedLeqGeq(s));

  // Tách khối math nếu lỡ bọc nhầm liên từ tiếng Việt nối giữa 2 tập hợp:
  // Ví dụ: $A = x \in \mathbb{R} \mid ... và B = x \in \mathbb{R} \mid ...$ -> $A = ...$ và $B = ...$
  s = s.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (wholeMath, inner) => {
    if (/\s+(?:và|hoặc|hay)\s+[A-Z]\s*=/i.test(inner)) {
      return `$${inner.replace(/\s+(và|hoặc|hay)\s+([A-Z]\s*=)/gi, (_m, conj, name) => `$ ${conj} $${name}`)}$`;
    }
    return wholeMath;
  });

  // 1. Chuẩn hóa tập hợp bên trong các khối math đã có ($...$ hoặc $$...$$)
  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (mathMatch) => {
    const isDouble = mathMatch.startsWith("$$");
    let inner = isDouble ? mathMatch.slice(2, -2) : mathMatch.slice(1, -1);

    // Thoát dấu ngoặc nhọn trần thành \{ và \}
    let result = "";
    let i = 0;
    while (i < inner.length) {
      const match = inner.slice(i).match(/(?:([A-Za-z]\s*(?:\\(?:cap|cup|setminus)\s*[A-Za-z]\s*)*=\s*))?(\{)/);
      if (!match || match.index === undefined) {
        result += inner.slice(i);
        break;
      }
      const startIdx = i + match.index;
      const name = match[1] || "";
      const braceStart = startIdx + name.length;

      const before = inner.slice(0, braceStart);
      if (/(?:\\[a-zA-Z]+_?|[_^])\s*$/.test(before) && !/\\[a-zA-Z]+$/.test(before.replace(/\\(setminus|cup|cap|subset|supset|subseteq|supseteq|in|notin)$/, ""))) {
        result += inner.slice(i, braceStart + 1);
        i = braceStart + 1;
        continue;
      }

      // Đếm ngoặc nhọn cân bằng
      let depth = 0;
      let endIdx = -1;
      let j = braceStart;
      while (j < inner.length) {
        const ch = inner[j];
        if (ch === "\\") {
          j += 2;
          continue;
        }
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            endIdx = j + 1;
            break;
          }
        }
        j++;
      }

      if (endIdx !== -1) {
        let setBody = inner.slice(braceStart + 1, endIdx - 1).trim();
        const isSet = !!name || /\\in|\\mid|[;]|\b[a-zA-Z]\s*(=|<|>|\\le|\\ge)|\\emptyset|\b\d+\s*,\s*\d+\b/.test(setBody);
        if (isSet) {
          // Chuẩn hóa dấu phân cách | thành \mid sau miền xác định (không chạm vào trị tuyệt đối |x|)
          setBody = setBody.replace(/(?<=\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z]))\s*\|\s*/g, " \\mid ");
          result += inner.slice(i, startIdx);
          result += `${name}\\{${setBody}\\}`;
          i = endIdx;
          continue;
        }
      }

      result += inner.slice(i, braceStart + 1);
      i = braceStart + 1;
    }

    // Tự động phục hồi ngoặc nhọn nếu đề bài bị thiếu (A = x \in Z \mid ... -> A = \{x \in Z \mid ...\})
    result = result.replace(/(^|[^\\{])\b([A-Z]\s*=\s*)([a-zA-Z]\s*\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z])\s*(?:\\mid|\|)\s*[^$}]+)/g, (_m, pre, n, body) => {
      const cleanBody = body.replace(/(?<=\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z]))\s*\|\s*/g, " \\mid ").trim();
      return `${pre}${n}\\{${cleanBody}\\}`;
    });

    return isDouble ? `$$${result}$$` : `$${result}$`;
  });

  // 2. Bọc các tập hợp trần trụi nằm ngoài khối math
  const mathTokens: string[] = [];
  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
    mathTokens.push(match);
    return `\uE000SM_${mathTokens.length - 1}\uE001`;
  });

  let result = "";
  let i = 0;
  while (i < s.length) {
    const match = s.slice(i).match(/(?:(?<![a-zA-Z0-9\$\\\_\^])([A-Za-z]\s*(?:\\(?:cap|cup|setminus)\s*[A-Za-z]\s*)*=\s*))?(\\?\{)/);
    if (!match || match.index === undefined) {
      result += s.slice(i);
      break;
    }
    const startIdx = i + match.index;
    const name = match[1] || "";
    const openBrace = match[2];
    const braceStart = startIdx + name.length;

    const before = s.slice(0, braceStart);
    if (/(?:\\[a-zA-Z]+_?|[_^])\s*$/.test(before) && !/\\[a-zA-Z]+$/.test(before.replace(/\\(setminus|cup|cap|subset|supset|subseteq|supseteq|in|notin)$/, ""))) {
      result += s.slice(i, braceStart + openBrace.length);
      i = braceStart + openBrace.length;
      continue;
    }

    let depth = 0;
    let endIdx = -1;
    let j = braceStart;
    while (j < s.length) {
      const ch = s[j];
      if (ch === "\\") {
        if (j + 1 < s.length && (s[j + 1] === "{" || s[j + 1] === "}")) {
          if (s[j + 1] === "{") depth++;
          else if (s[j + 1] === "}") {
            depth--;
            if (depth === 0) {
              endIdx = j + 2;
              break;
            }
          }
          j += 2;
          continue;
        }
        j += 2;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          endIdx = j + 1;
          break;
        }
      }
      j++;
    }

    if (endIdx !== -1) {
      let setBody = s.slice(braceStart, endIdx);
      setBody = setBody.replace(/^\\?\{/, "").replace(/\\?\}$/, "").trim();
      setBody = setBody.replace(/\$/g, "");

      const isSet = !!name || /\\in|\\mid|[;]|\b[a-zA-Z]\s*(=|<|>|\\le|\\ge)|\\emptyset|\b\d+\s*,\s*\d+\b/.test(setBody);
      if (isSet) {
        setBody = setBody.replace(/(?<=\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z]))\s*\|\s*/g, " \\mid ");
        result += s.slice(i, startIdx);
        result += `$${name}\\{${setBody}\\}$`;
        i = endIdx;
        continue;
      }
    }

    result += s.slice(i, braceStart + openBrace.length);
    i = braceStart + openBrace.length;
  }

  // Tự động bọc tập hợp trần trụi không có ngoặc nhọn ngoài math: A = x \in Z \mid ...
  result = result.replace(/(?<![a-zA-Z0-9\$\\])\b([A-Z]\s*=\s*)([a-zA-Z]\s*\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z])\s*(?:\\mid|\|)\s*[^,$\.\n]+)/g, (_m, n, body) => {
    const cleanBody = body.replace(/(?<=\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z]))\s*\|\s*/g, " \\mid ").trim();
    return `$${n}\\{${cleanBody}\\}$`;
  });

  // Dọn dẹp dấu $ rách bị dán trước ngoặc nhọn: ví dụ: =$ {1; 2} hoặc =${0; 1}
  result = result.replace(/(?<=[=+\-*\/])\s*\$\s*\\?\{/g, ' \\{');

  // Khôi phục đệ quy toàn bộ token toán tránh rò rỉ token
  let prevIter = '';
  let iter = 0;
  while ((result.includes('\uE000SM_') || result.includes('___SET_MATH_TOKEN_')) && prevIter !== result && iter < 10) {
    prevIter = result;
    iter++;
    result = result.replace(/\uE000SM_(\d+)\uE001/g, (_m, idx) => mathTokens[Number(idx)] || "");
    result = result.replace(/___SET_MATH_TOKEN_(\d+)___/g, (_m, idx) => mathTokens[Number(idx)] || "");
  }
  result = result.replace(/\bSET_MATH_TOKEN_(\d+)\b/g, (_m, idx) => mathTokens[Number(idx)] || "");

  return result;
};

export function balanceDollarSigns(text: string): string {
  if (!text) return '';
  let s = text;
  
  // Count single dollar signs (not including $$)
  const count = (s.match(/(?<!\$)\$(?!\$)/g) || []).length;
  if (count % 2 !== 0) {
    // There is an odd number of $ signs, let's locate the likely orphan dollar sign
    const positions: number[] = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '$') {
        if (s[i+1] === '$') {
          i++; // skip double $$
        } else {
          positions.push(i);
        }
      }
    }
    
    if (positions.length > 0) {
      // Find the position most likely to be an orphan
      let orphanIndex = -1;
      let minScore = Infinity;
      
      for (let idx = 0; idx < positions.length; idx++) {
        const pos = positions[idx];
        let score = 100;
        
        // If it is at the very end or very start of the string
        if (pos === 0 || pos === s.length - 1) {
          score -= 50;
        }
        
        // If it is adjacent to option markers or boundaries
        const after = s.slice(pos + 1, pos + 10);
        const before = s.slice(Math.max(0, pos - 10), pos);
        if (/^\s*[A-D][\.\:\)]/.test(after) || /[\.\:\)]\s*$/.test(before)) {
          score -= 40;
        }
        
        // If adjacent to punctuation
        if (pos > 0 && /[\.,;\?\s]/.test(s[pos - 1])) score -= 15;
        if (pos < s.length - 1 && /[\.,;\?\s]/.test(s[pos + 1])) score -= 15;
        
        if (score < minScore) {
          minScore = score;
          orphanIndex = pos;
        }
      }
      
      if (orphanIndex !== -1) {
        s = s.substring(0, orphanIndex) + s.substring(orphanIndex + 1);
      }
    }
  }
  
  // Clean empty or redundant math blocks
  s = s.replace(/\$\s*\$/g, '');
  return s;
}

export function autoScanAndFixMath(text: string): string {
  if (!text) return '';
  let s = text;
  
  // 1. Balance dollar signs
  s = balanceDollarSigns(s);
  
  // 2. Fix KaTeX-crashing unescaped % inside math blocks
  s = s.replace(/\$([^\$\n]*?)\$/g, (match, inner) => {
    if (inner.includes('%') && !inner.includes('\\%')) {
      return `$${inner.replace(/%/g, '\\%')}$`;
    }
    return match;
  });
  
  // 3. Fix double subscripts y_cđ_1 -> y_{\text{CĐ}_1}
  s = s.replace(/y_\{?(?:CĐ|cđ)\}?_(\d+)/g, 'y_{\\text{CĐ}_$1}');
  s = s.replace(/y_\{?(?:CT|ct)\}?_(\d+)/g, 'y_{\\text{CT}_$1}');
  
  // 4. Ensure y_{CĐ} and y_{CT} are beautifully upright roman
  s = s.replace(/y_\{?(?:CĐ|cđ)\}?/g, 'y_{\\text{CĐ}}')
       .replace(/y_\{?(?:CT|ct)\}?/g, 'y_{\\text{CT}}');
       
  // 5. Clean up duplicate options if they somehow slipped in
  s = s.replace(/\b([A-D])\.\s+\1\.\b/g, '$1.');
  
  return s;
}

/**
 * XỬ LÝ TỔNG QUÁT & TRIỆT ĐỂ 100% LỖI DÍNH CHỮ TIẾNG VIỆT IN NGHIÊNG VÀ LỘ LỆNH LATEX TRÊN TRANG LÀM BÀI ONLINE

 * Tokenizer & Sanitizer bảo vệ tiếng Việt cho đề thi toán
 */
export const sanitizeExamQuestion = (rawContent: string): string => {
  if (!rawContent) return '';
  // Chuẩn hóa y_{CĐ}, y_{CT} thành dạng LaTeX đẹp \text{CĐ}, \text{CT} trên toàn bộ văn bản trước khi bọc
  rawContent = String(rawContent)
    .replace(/y_\{?(?:CĐ|cđ)\}?/g, 'y_{\\text{CĐ}}')
    .replace(/y_\{?(?:CT|ct)\}?/g, 'y_{\\text{CT}}');
  let content = rescueCodeAndNestedText(sanitizeLatexString(rawContent.trim()));
  content = normalizePropositionQuotes(content);
  content = normalizeSetNotation(content);

  const hasVietnameseWords = (str: string): boolean => {
    const withoutText = str.replace(/\\text\{[^{}]*\}/g, '');
    return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(withoutText) ||
      /\b(tập\s+hợp|trên\s+trục\s+số|biểu\s+diễn|xác\s+định|tìm|giá\s+trị|khoảng|đoạn|với\s+m|tham\s+số|mệnh\s+đề|đúng|sai)\b/i.test(withoutText);
  };

  // BƯỚC 1: GIẢI CỨU CHUỖI NẾU BỊ BỌC NHẦM CẢ CÂU TRONG DẤU $ HOẶC $$
  // Nếu chuỗi bắt đầu và kết thúc bằng $ hoặc $$ nhưng bên trong có nhiều từ tiếng Việt
  if ((content.startsWith('$$') && content.endsWith('$$') && content.length > 4) ||
      (content.startsWith('$') && content.endsWith('$') && content.length > 2)) {
    const isDouble = content.startsWith('$$');
    const inner = isDouble ? content.slice(2, -2).trim() : content.slice(1, -1).trim();
    // Nếu có chứa tiếng Việt có dấu -> tháo bỏ cặp $ hoặc $$ ngoài cùng
    if (hasVietnameseWords(inner)) {
      content = inner;
    }
  }

  // BƯỚC 2: BẢO VỆ CÁC KHỐI MÔI TRƯỜNG TOÁN HỌC, KHỐI CODE, BẢNG BIẾN THIÊN, ẢNH VÀ MATH HỢP LỆ TRƯỚC HẾT
  // Chuẩn hóa và chữa lành các hệ phương trình / bất phương trình chứa bất đẳng thức kép (bđt kép) trước khi bảo vệ
  content = content.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (_m, body) => `\\begin{cases}\n${normalizeCasesBody(body)}\n\\end{cases}`);
  const envTokens: string[] = [];
  content = unflattenMarkdownTables(content);
  content = content.replace(/(```[\s\S]*?```|`[^`\n]+`|<img[\s\S]*?>|<svg[\s\S]*?<\/svg>|<tikz-diagram[\s\S]*?<\/tikz-diagram>|<svg-wrapper[\s\S]*?<\/svg-wrapper>|\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\}|\\left\s*\[\s*\\begin\s*\{aligned\*?\}[\s\S]*?\\end\s*\{aligned\*?\}\s*\\right\.?|\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}|(?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gim, (match) => {
    envTokens.push(match);
    return `\uE000EB_${envTokens.length - 1}\uE001`;
  });

  const mathTokens: string[] = [];

  // 2.1 Bảo vệ $$...$$ (không nuốt lồng các token đã được bảo vệ)
  content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
    if (inner.includes('\uE000') || inner.includes('___MATH_BLOCK_') || inner.includes('___ENV_BLOCK_')) {
      return match;
    }
    // Nếu khối $$ lỡ bao trùm cả câu tiếng Việt dài mà KHÔNG chứa lệnh LaTeX toán
    const isLatexFormula = /\\(?:frac|lim|begin|end|text|iff|implies|infty|pm|le|ge|leq|geq|cap|cup|setminus|sqrt|sin|cos|tan|cot|log|ln)|[=+\-*\/^_\<\>]/.test(inner);
    if (!isLatexFormula && hasVietnameseWords(inner)) {
      return inner;
    }
    mathTokens.push(match);
    return `\uE000MB_${mathTokens.length - 1}\uE001`;
  });

  // 2.2 Bảo vệ $...$ (không nuốt lồng các token đã được bảo vệ)
  content = content.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (match, inner) => {
    if (inner.includes('\uE000') || inner.includes('___MATH_BLOCK_') || inner.includes('___ENV_BLOCK_')) {
      return match;
    }
    // Nếu khối $ lỡ bọc nhầm cả câu tiếng Việt không có toán tử
    const isLatexFormula = /\\(?:frac|lim|begin|end|text|iff|implies|infty|pm|le|ge|leq|geq|cap|cup|setminus|sqrt|sin|cos|tan|cot|log|ln)|[=+\-*\/^_\<\>]/.test(inner);
    if (!isLatexFormula && hasVietnameseWords(inner)) {
      return inner;
    }
    mathTokens.push(match);
    return `\uE000MB_${mathTokens.length - 1}\uE001`;
  });

  // BƯỚC 3: XỬ LÝ VĂN BẢN NGOÀI KHỐI MATH (BẢO ĐẢM KHÔNG ẢNH HƯỞNG CÔNG THỨC TOÁN ĐÃ CÓ)
  // 3.0 Xử lý các chỉ số dưới dạng text (y_{CĐ} -> y_{CĐ}, bỏ dấu gạch dưới nếu không cần thiết trong text)
  // Sửa lỗi chỉ số y_{CĐ} và y_{CT} hiển thị xấu bằng cách chuyển thành LaTeX chuẩn y_{\text{CĐ}} và y_{\text{CT}}
  content = content
    .replace(/y_\\text\{CĐ\}/g, '$y_{\\text{CĐ}}$')
    .replace(/y_\\text\{CT\}/g, '$y_{\\text{CT}}$')
    .replace(/y_\{CĐ\}/g, '$y_{\\text{CĐ}}$')
    .replace(/y_\{CT\}/g, '$y_{\\text{CT}}$')
    .replace(/y_\{cđ\}/g, '$y_{\\text{CĐ}}$')
    .replace(/y_\{ct\}/g, '$y_{\\text{CT}}$');

  // 3.1 Dọn dẹp rác markdown thừa (dấu * dính liền đáp án)
  content = content
    .replace(/\.\*\*\s*([A-D])\.\*\*/g, '$1.')
    .replace(/\.\*\*\s*([A-D])\.\*\*/g, '$1.')
    .replace(/\.\*\*\s*([A-D])\s*\*\*/g, '$1.')
    .replace(/\.\*"([A-D])"\./g, '$1.')
    .replace(/"\*\*"([A-D])"\*\*"/g, '$1.')
    .replace(/(\*\*\s*|\.\*\*|\*\*\.)([A-D])(\.\*|\*)/g, '$2.')
    .replace(/(\n|\r|^)\s*([A-D])\s*\./g, '$1$2. ');

  // 3.2 Sửa lỗi dư dấu $ xung quanh các giá trị phần trăm (%, VD: $30%, 45%$)
  content = content
    .replace(/\$([0-9]+\s*%)\$?/g, '$1')
    .replace(/([0-9]+\s*%)\$/g, '$1')
    .replace(/\bundefined\b/gi, ''); // Thêm dòng này để xóa sạch 'undefined'
  
  // 3.3 Sửa lỗi dính chữ tiếng Việt thông dụng
  content = content
    .replace(/Chohaitậphợp\s*([A-Za-z])/gi, 'Cho hai tập hợp $1')
    .replace(/Chohaitậphợp/gi, 'Cho hai tập hợp ')
    .replace(/Cho\s*tậphợp\s*([A-Za-z])/gi, 'Cho tập hợp $1')
    .replace(/Cho\s*tậphợp/gi, 'Cho tập hợp ')
    .replace(/\bBiết\s*([A-Za-z])(?![a-zà-ỹ])/gi, 'Biết $1')
    .replace(/Tì\s*m\s*giá\s*trị\s*nguyên\s*lớn\s*nhất\s*của/gi, 'Tìm giá trị nguyên lớn nhất của ')
    .replace(/Tì\s*m\s*giá\s*trị\s*nguyên\s*lớn\s*nhất/gi, 'Tìm giá trị nguyên lớn nhất ')
    .replace(/Tìmgiátrịcủa/gi, 'Tính giá trị của ')
    .replace(/Tìmgiátrị/gi, 'Tìm giá trị ')
    .replace(/Tínhgiátrịcủa/gi, 'Tính giá trị của ')
    .replace(/Tínhgiátrị/gi, 'Tính giá trị ')
    .replace(/Hãyliệtkêcácphầntửcủatậphợp/gi, 'Hãy liệt kê các phần tử của tập hợp ')
    .replace(/Hãyliệtkê/gi, 'Hãy liệt kê ')
    .replace(/Hãyxácđịnhcáctậphợp/gi, 'Hãy xác định các tập hợp ')
    .replace(/cáctậphợp/gi, 'các tập hợp ')
    .replace(/tậphợp/gi, 'tập hợp ')
    .replace(/vàtìm/gi, ' và tìm ')
    .replace(/trêntrụcsố/gi, ' trên trục số')
    .replace(/độdài/gi, ' độ dài ')
    .replace(/thỏamãnđiềukiện/gi, ' thỏa mãn điều kiện ')
    .replace(/nguyênlớnnhấtcủa/gi, ' nguyên lớn nhất của ')
    .replace(/là\s*một\s*đoạn/gi, ' là một đoạn ')
    .replace(/\bm\s*để/gi, '$m$ để ')
    .replace(/mđể/gi, '$m$ để ')
    .replace(/vàtính/gi, ' và tính ');

  // Tách dính liên từ: )vàB, ]vàB, }vàB (không match chữ cái tiếng Việt như "Thay")
  content = content
    .replace(/([\)\]\}\$0-9])\s*(và|hoặc|hay)\s*([A-Za-z\$])/g, '$1 $2 $3')
    .replace(/([\)\]\}\$0-9])(và|hoặc|hay)/g, '$1 $2')
    .replace(/(và|hoặc|hay)([A-Z])(?![a-zà-ỹ])/g, '$1 $2');

  // Sửa lỗi cú pháp LaTeX dính chữ:
  content = content
    .replace(/\\\\\s*cup/gi, ' \\cup ')
    .replace(/(?<!\\)\b(emptyset|varnothing)\b/g, '\\emptyset')
    .replace(/(?<!\\)\bforall\s*([a-zA-Z])/g, '\\forall $1')
    .replace(/(?<!\\)\bexists\s*([a-zA-Z])/g, '\\exists $1')
    .replace(/([A-Za-z0-9\)])\s*(?<!\\)setminus\s*([A-Za-z0-9\(])/g, '$1 \\setminus $2')
    .replace(/(?<!\\)\bsetminus\b/g, '\\setminus')
    .replace(/=\s*emptyset/gi, '= \\emptyset')
    .replace(/(?<![a-zA-Z\\])\b(le|leq)(\d+)\b/gi, '\\le $2')
    .replace(/(?<![a-zA-Z\\])\b(ge|geq)(\d+)\b/gi, '\\ge $2')
    .replace(/leq(\d+)\s*và\s*([A-Za-z])/gi, '\\le $1 và $2')
    .replace(/leq(\d+)/gi, '\\le $1 ')
    .replace(/geq(\d+)/gi, '\\ge $1 ')
    .replace(/(?<=[0-9a-zA-Z\$\(\]\}])\s*leq(\d+)/gi, ' \\le $1 ')
    .replace(/(?<=[0-9a-zA-Z\$\(\]\}])\s*geq(\d+)/gi, ' \\ge $1 ')
    .replace(/([A-Z]\s*=\s*[\[\(][^\]\)]+[\]\)])\s*\$\$\.?\s*Gọi/gi, '$1. Gọi');

  // Dọn dẹp dấu $$ bị rách dán sát trước toán tử (vd: [-3; 2)$$\cap hoặc (-2; 3)$$\Rightarrow)
  content = content.replace(/([\)\]\}0-9a-zA-Z])\s*\$\$\s*(?=(\\(?:cap|cup|setminus|Rightarrow|Leftrightarrow|in|notin|subset|supset|subseteq|supseteq|approx|neq|le|ge|leq|geq)|[=+\-*\/]))/gi, '$1 ');

  // Bọc bất đẳng thức kép trần trụi ngoài math (vd: 0 \le x \le 4, -1 < x \le 3, a \le 2x - 1 \le b, 0 <= x <= 4)
  content = content.replace(/(?<![a-zA-Z0-9\$\\\(\[\{\^\-\+])([+-]?(?:\d+(?:[.,]\d+)?|[a-zA-Z]|\\\w+(?:\{[^{}]*\})*))\s*\\?(le|ge|leq|geq|leqslant|geqslant|ne|neq|<|>|<=|>=)(?![a-zA-Z])\s*([a-zA-Z0-9\+\-\s\*\/\(\)\{\}\^\_\\]+?)\s*\\?(le|ge|leq|geq|leqslant|geqslant|ne|neq|<|>|<=|>=)(?![a-zA-Z])\s*([+-]?(?:\d+(?:[.,]\d+)?|[a-zA-Z]|\\\w+(?:\{[^{}]*\})*))(?![a-zA-Z0-9\$\\])/g, (_m, a, op1, mid, op2, b) => {
    const norm = (o: string) => {
      const lower = o.toLowerCase().replace(/^\\/, '');
      if (lower === '<=' || lower === 'le' || lower === 'leq' || lower === 'leqslant') return '\\le';
      if (lower === '>=' || lower === 'ge' || lower === 'geq' || lower === 'geqslant') return '\\ge';
      if (lower === '<' || lower === '>') return lower;
      return `\\${lower}`;
    };
    mathTokens.push(`$${a.trim()} ${norm(op1)} ${mid.trim()} ${norm(op2)} ${b.trim()}$`);
    return `\uE000MB_${mathTokens.length - 1}\uE001`;
  });

  // Bọc các lệnh toán học trần trụi ngoài math:
  content = content.replace(/\b([a-zA-Z0-9]+)\s*\\(in|notin|subset|subseteq)\s*([a-zA-Z0-9]+)\b/g, (_m, a, op, b) => `$${a} \\${op} ${b}$`);
  // Bọc phương trình tập rỗng: A \cap B = \emptyset, A = \emptyset
  content = content.replace(/(?<![a-zA-Z0-9\$\\])\b([A-Z]\s*(?:\\(?:cap|cup|setminus)\s*[A-Z]\s*)*=\s*\\(?:emptyset|varnothing))\b/g, (_m, a) => `$${a}$`);
  content = content.replace(/(?<![\$\\])\\(emptyset|varnothing)\b(?!\$)/g, (_m, a) => `$\\${a}$`);
  // Không match nhầm \left và \right bằng cách thêm negative lookahead (?![a-zA-Z])
  // Tránh cắt đứt biến có số mũ (như x^2 \ge 0) bằng cách không bắt đầu sau dấu ^ và bọc trọn vẹn cả số mũ
  content = content.replace(/(?<![a-zA-Z0-9\$\\\(\[\{\^])\b([a-zA-Z0-9]+(?:\^[0-9a-zA-Z]+)?)\s*\\(le|ge|leq|geq|ne|neq)(?![a-zA-Z])\s*([a-zA-Z0-9\-]+)\b(?![a-zA-Z0-9\$\\])/g, (_m, a, op, b) => `$${a} \\${op} ${b}$`);

  // Bọc phép toán tập hợp trần trụi: B \setminus A = [5; 7), A \cap B = [2; 5], hoặc A = [-4; 5) thành $...$
  content = content.replace(/(?<![a-zA-Z0-9\$\\])\b([A-Z]\s*(?:\\(?:setminus|cap|cup|subset|supset|subseteq|supseteq)\s*[A-Z]\s*)+=\s*[\[\(]\s*[^;,\]\)\n]+\s*[;,]\s*[^;,\]\)\n]+\s*[\]\)])(?![a-zA-Z0-9\$\\])/g, (_m, a) => `$${a}$`);
  content = content.replace(/(?<![a-zA-Z0-9\$\\]|\\(?:setminus|cap|cup)\s*)\b([A-Z]\s*=\s*[\[\(]\s*[^;,\]\)\n]+\s*[;,]\s*[^;,\]\)\n]+\s*[\]\)])(?![a-zA-Z0-9\$\\])/g, (_m, a) => `$${a}$`);

  // BƯỚC 4: KHÔI PHỤC CÁC KHỐI MATH VÀ ENV ĐÃ BẢO VỆ (LẶP ĐỆ QUY CHO ĐẾN KHI HẾT TOKEN)
  let prevIterToken = '';
  let iterCount = 0;
  while ((content.includes('\uE000') || content.includes('___MATH_BLOCK_') || content.includes('___ENV_BLOCK_')) && prevIterToken !== content && iterCount < 10) {
    prevIterToken = content;
    iterCount++;
    content = content.replace(/\uE000MB_(\d+)\uE001/g, (_m, idx) => mathTokens[Number(idx)] !== undefined ? mathTokens[Number(idx)] : _m);
    content = content.replace(/\uE000EB_(\d+)\uE001/g, (_m, idx) => envTokens[Number(idx)] !== undefined ? envTokens[Number(idx)] : _m);
    content = content.replace(/___MATH_BLOCK_(\d+)___/g, (_m, idx) => mathTokens[Number(idx)] !== undefined ? mathTokens[Number(idx)] : '');
    content = content.replace(/___ENV_BLOCK_(\d+)___/g, (_m, idx) => envTokens[Number(idx)] !== undefined ? envTokens[Number(idx)] : '');
  }
  content = content.replace(/\uE000MB_(\d+)\uE001/g, (_m, idx) => mathTokens[Number(idx)] !== undefined ? mathTokens[Number(idx)] : '');
  content = content.replace(/\uE000EB_(\d+)\uE001/g, (_m, idx) => envTokens[Number(idx)] !== undefined ? envTokens[Number(idx)] : '');
  content = content.replace(/___?MATH_BLOCK_(\d+)___?/g, (_m, idx) => mathTokens[Number(idx)] !== undefined ? mathTokens[Number(idx)] : '');
  content = content.replace(/___?ENV_BLOCK_(\d+)___?/g, (_m, idx) => envTokens[Number(idx)] !== undefined ? envTokens[Number(idx)] : '');
  content = content.replace(/\bMATH_BLOCK_(\d+)\b/g, (_m, idx) => mathTokens[Number(idx)] !== undefined ? mathTokens[Number(idx)] : '');

  // Dọn dẹp khoảng trắng ngang và dòng trống dư thừa (BẢO VỆ DÒNG MỚI \n CỦA MARKDOWN)
  content = content
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Khắc phục triệt để các dấu $ dư thừa hoặc mồ côi
  content = balanceDollarSigns(content);

  // Triệt tiêu hoàn toàn rò rỉ của chữ "undefined" hoặc "null" lẻ loi trong tài liệu ở mọi vị trí (kể cả trong các khối toán)
  content = content
    .replace(/(?<![a-zA-Z0-9_\$\\])(?:undefined|null)(?![a-zA-Z0-9_\$])/gi, '')
    .replace(/=\s*(?:undefined|null)/gi, '=')
    .replace(/(?:undefined|null)\s*=\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return content;
};

export const rescueAccidentalFullMathBlock = sanitizeExamQuestion;

/**
 * Tiền xử lý kết hợp cứu hộ câu hỏi và chuẩn hóa công thức toán
 */
export const sanitizeAndPolishMath = (content: string): string => {
  if (!content) return '';
  let text = sanitizeExamQuestion(content);
  text = cleanVietnameseUnicode(text);
  text = normalizeLogicAndSetSymbols(text);
  text = polishMathText(text);
  text = sanitizeMathBeforeRender(text);
  text = normalizeLogicAndSetSymbols(text);
  text = sanitizeExamQuestion(text);
  return text;
};

/**
 * Chuẩn hóa và khắc phục triệt để lỗi vỡ công thức:
 * 1. Dấu khác bị tách: / =, /=, \not= -> \ne
 * 2. Dấu không thuộc: ∈/, ∈ /, \in/, \in /, \not\in -> \notin
 * 3. Dấu không phải tập con: ⊂/, \subset/, \not\subset -> \not\subset
 * 4. Hàn gắn khối Phép Hiệu {x | x ∈ A và x ∉ B} bị vỡ hoặc rách dấu $$
 * 5. Dọn dẹp dấu $ thừa hoặc cọc cạch
 * 6. Tự động chuyển đổi các thẻ OMML Word Math sang LaTeX KaTeX
 * 7. Tách bạch liên từ và, hoặc, với giữa các công thức math
 */
export const sanitizeMathBeforeRender = (content: string): string => {
  if (!content) return '';
  let text = sanitizeLatexString(content);
  text = normalizeLogicAndSetSymbols(polishMathText(text));

  // BƯỚC 0: Tự động chuyển đổi XML OMML Word Equation nếu có
  text = convertOmmlToLatex(text);

  // BƯỚC 1: Xử lý dứt điểm dấu "khác" (/ =, /=, \not=, =)
  text = text
    .replace(/\/\s*=\s*/g, ' \\ne ')
    .replace(/=\s*\/\s*/g, ' \\ne ')
    .replace(/\\not\s*=\s*/g, ' \\ne ');

  // BƯỚC 1.5: Xử lý mệnh đề phủ định \overline{P}, \overline{Q}, ...
  text = text
    .replace(/\\bar\{([A-Za-z])\}/g, '\\overline{$1}')
    .replace(/(?<!\\)\b(overline|bar)\{([A-Za-z])\}/g, '\\overline{$2}')
    .replace(/([PQAB])[\u0304\u0305]/g, '$\\overline{$1}$');

  // BƯỚC 2: Xử lý dứt điểm dấu "không thuộc" (∈/, ∈ /, \in/, \in /, \not\in)
  text = text
    .replace(/(?:\\in|∈)\s*\/\s*/g, ' \\notin ')
    .replace(/\\not\s*\\in\s*/g, ' \\notin ')
    .replace(/\\not\s+in(?![a-zA-Z])/g, ' \\notin ');

  // BƯỚC 3: Xử lý dấu "không phải tập con" (⊂/, \subset/, \not\subset)
  text = text
    .replace(/(?:\\subset|⊂)(?:eq)?\s*\/\s*/g, ' \\not\\subset ')
    .replace(/\\not\s*\\subset(?:eq)?(?![a-zA-Z])/g, ' \\not\\subset ');

  // BƯỚC 4: Hàn gắn khối Phép Hiệu {x | x ∈ A và x ∉ B}
  // Bắt mọi trường hợp vỡ khối kể cả khi có \mid, |, chữ "và", "hoặc"
  text = text.replace(
    /A\s*\\setminus\s*B\s*=\s*\{?\s*x\s*(?:\\mid|\|)\s*x\s*(?:\\in|∈)\s*A\s*(?:\\text\{\s*và\s*\}|và)\s*x\s*(?:\\notin|\\in\s*\/|∈\s*\/)\s*B\s*\}?\s*\${0,2}/gi,
    '$$A \\setminus B = \\{x \\mid x \\in A \\text{ và } x \\notin B\\}$$'
  );

  // Bắt các khối tổng quát dạng {x \mid ... và ...} bị rách dấu $$
  text = text.replace(/\{\s*x\s*\\mid\s*x\s*\\in\s*([A-Z])\s*và\s*x\s*\\notin\s*([A-Z])\s*\}\${1,2}/gi, 
    '$$\\{x \\mid x \\in $1 \\text{ và } x \\notin $2\\}$$'
  );

  // Bắt các trường hợp tổng quát X \setminus Y
  text = text.replace(
    /(?<!\\text\{\s*)([A-Z])\s*\\setminus\s*([A-Z])\s*=\s*\{?\s*x\s*(?:\\mid|\|)\s*x\s*(?:\\in|∈)\s*\1\s*(?<!\\text\{\s*)và\s*x\s*(?:\\notin|\\in\s*\/|∈\s*\/)\s*\2\s*\}?\s*\${0,2}/gi,
    (_m, p1, p2) => `$$${p1} \\setminus ${p2} = \\{x \\mid x \\in ${p1} \\text{ và } x \\notin ${p2}\\}$$`
  );

  // BƯỚC 5: Dọn dẹp các dấu $ thừa hoặc cọc cạch
  text = text
    .replace(/\${3,}/g, '$$')
    .replace(/([a-zA-Z0-9\emptyset\\])\s*\/\s*=\s*([a-zA-Z0-9\emptyset\\])/g, '$1 \\ne $2');

  return text;
};

export const normalizeMathContent = sanitizeMathBeforeRender;

/**
 * Chuẩn hóa toàn cục công thức toán LaTeX (Khóa vĩnh viễn bộ lọc chuẩn hóa):
 * 1. Khắc phục dấu phủ định bị tách rời trên Web KaTeX (\not =, \not \in, \not \subset, ...)
 * 2. Tự động bọc ngoặc nhọn cases nếu thiếu cặp $$
 * 3. Chuẩn hóa dấu ngắt dòng cho cases
 */
export const normalizeMathLatex = (rawText: string): string => {
  if (!rawText) return '';
  let text = normalizeLogicAndSetSymbols(sanitizeMathBeforeRender(rawText)).replace(/\\dfrac\b/g, '\\frac');
  text = text.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (_m, body) => `\\begin{cases}\n${normalizeCasesBody(body)}\n\\end{cases}`);

  // BƯỚC 0: Tách rời các từ nối tiếng Việt bị dính liền với ký tự toán và sửa rách dấu $$ (vd: 3hoặcm -> 3 hoặc m, $$hoặc$$ -> hoặc)
  text = text
    .replace(/\b([a-z])(hoặc|hay)\b/gi, (match, letter, conj) => {
      if (/^(thay|chay)$/i.test(match)) return match;
      return `${letter} ${conj}`;
    })
    .replace(/([0-9\$\)\]\}])(?<!\s)(hoặc|hay)(?=[a-zA-Z0-9\$\\])/gi, '$1 $2 ')
    .replace(/([0-9\$\)\]\}])(?<!\s)và(?!(?:o|i|ng|c|t)\b)(?=[a-zA-Z0-9\$\\])/gi, '$1 và ')
    .replace(/(?<=[0-9\$\)\]\}])(hoặc|hay)/gi, ' $1')
    .replace(/(?<=[0-9\$\)\]\}])và(?!(?:o|i|ng|c|t)\b)/gi, ' và')
    .replace(/(?<!\$)\$(?!\$)\s*(hoặc|và|hay|với)\s*(?<!\$)\$(?!\$)/gi, '$$ $1 $$')
    .replace(/\$\$\s*(hoặc|và|hay|với)\s*\$\$/gi, '$$ $1 $$');

  // BƯỚC 1: Xử lý các biến thể ký hiệu gạch chéo bị lệch sang phải hoặc tách rời
  text = text
    // Dấu không thuộc: \in/, \in /, \not\in, \not \in
    .replace(/\\in\s*\//g, ' \\notin ')
    .replace(/\\not\s*\\in/g, ' \\notin ')
    .replace(/\\not\s+in(?![a-zA-Z])/g, ' \\notin ')
    // Dấu không phải tập con: \subset/, \subset /, \not\subset
    .replace(/\\subset(eq)?\s*\//g, ' \\not\\subset ')
    .replace(/\\not\s*\\subset(eq)?(?![a-zA-Z])/g, ' \\not\\subset ')
    // Dấu khác: =/, = /, /=, \not=
    .replace(/=\s*\//g, ' \\ne ')
    .replace(/\/\s*=/g, ' \\ne ')
    .replace(/\\not\s*=/g, ' \\ne ')
    .replace(/\\not\s*\\equiv/g, ' \\not\\equiv ');

  // BƯỚC 2: Tự động khôi phục dấu backslash (\) bị mất bên trong công thức
  // Áp dụng cho nội dung nằm trong cặp dấu $...$ hoặc các cụm từ khóa toán học đặc trưng
  text = text.replace(/\$([^\$]+)\$/g, (match, formula) => {
    let fixed = formula
      // Khôi phục các toán tử tập hợp & quan hệ
      .replace(/(?<!\\)\b(cap|cup|in|notin|subset|supset|subseteq|supseteq|setminus|emptyset|varnothing|forall|exists)\b/g, '\\$1')
      .replace(/(?<!\\)\b(mathbb|mathbf|mathcal)\b/g, '\\$1')
      .replace(/(?<!\\)\b(mid)\b/g, '\\mid ')
      // Khôi phục lượng giác & hàm số
      .replace(/(?<!\\)\b(sin|cos|tan|cot|lim)\b/g, '\\$1')
      // Khôi phục ký hiệu phép toán & so sánh
      .replace(/(?<!\\)\b(sqrt|frac|left|right|le|ge|ne|times|pm|cdot)\b/g, '\\$1');
    return `$${fixed}$`;
  });

  // BƯỚC 3: Xử lý trường hợp chuỗi toán không bọc dấu $ nhưng bị dính chữ (ví dụ: xinmathbbZmid, BsetminusA, forallx)
  text = normalizeLogicAndSetSymbols(text);

  // BƯỚC 4: Tự động bọc an toàn cho các môi trường toán trần (nếu chưa nằm trong $ hoặc $$)
  text = wrapNakedMathEnvironments(text);
  // Khắc phục triệt để lỗi double-backslash (\\ thay vì \) do tàn dư KaTeX cũ hoặc escape thừa:
  // Đổi \\frac, \\sqrt, \\begin, \\alpha, \\le, \\in, \\infty... thành \frac, \sqrt, \begin, \alpha, \le, \in, \infty...
  text = text.replace(/\\{2,}([a-zA-Z]+)/g, (_m, g1) => '\\' + g1);
  text = text.replace(/\\{2,}([\{\}\[\]\(\)\$\%])/g, (_m, g1) => '\\' + g1);

  return text;
};

/**
 * Khắc phục triệt để lỗi rách dấu $$ và dính chữ tiếng Việt ("hoặc", "và", "hay") trong 4 phương án trắc nghiệm:
 * 1. Tách rời các từ nối tiếng Việt bị dính liền với số/ký tự (vd: 3hoặcm -> 3 hoặc m, avàa -> a và a)
 * 2. Sửa lỗi đóng/mở $$ bị rách giữa biểu thức (vd: \ge 3$$ hoặc $$m \le -1)
 * 3. Tách từ nối ra ngoài dấu $ và tự động bọc $ cho các vế công thức
 */
export const fixInlineOptionText = (text: string): string => {
  if (!text) return '';
  let res = text;

  // 0. Dọn dẹp rác markdown thừa trước khi xử lý
  res = res
    .replace(/\.\*\*\s*([A-D])\.\*\*/g, '$1.')
    .replace(/\.\*\*\s*([A-D])\s*\*\*/g, '$1.')
    .replace(/\.\*"([A-D])"\./g, '$1.')
    .replace(/"\*\*"([A-D])"\*\*"/g, '$1.')
    .replace(/(\*\*\s*|\.\*\*|\*\*\.)([A-D])(\.\*|\*)/g, '$2.');

  // Giữ lại nhãn phương án nếu có
  let prefix = '';
  const prefixMatch = res.match(/^(\s*(?:[-*]\s*)?(?:\*{0,2})[A-Da-d][\.\:\)](?:\*{0,2})\s*)/);
  if (prefixMatch) {
    prefix = prefixMatch[1];
    res = res.slice(prefix.length);
  }

  // Bảo vệ tạm thời các khối \text{...}
  const textTokens: string[] = [];
  res = res.replace(/\\text\{[^{}]*\}/g, (match) => {
    textTokens.push(match);
    return `___TEXT_TOKEN_${textTokens.length - 1}___`;
  });

  // Bước 1: Tách rời các từ nối tiếng Việt bị dính liền với số/ký tự
  res = res
    .replace(/([0-9a-zA-Z\$\\])(?<!\s)(hoặc|hay)(?=[a-zA-Z0-9\$\\])/gi, '$1 $2 ')
    .replace(/([0-9a-zA-Z\$\\])(?<!\s)và(?!(?:o|i|ng|c|t)\b)(?=[a-zA-Z0-9\$\\])/gi, '$1 và ')
    .replace(/(hoặc|hay)(?=[a-zA-Z0-9])/gi, '$1 ')
    .replace(/và(?!(?:o|i|ng|c|t)\b)(?=[a-zA-Z0-9])/gi, 'và ')
    .replace(/(?<=[a-zA-Z0-9\$\\])(hoặc|hay)/gi, ' $1')
    .replace(/(?<=[a-zA-Z0-9\$\\])và(?!(?:o|i|ng|c|t)\b)/gi, ' và');

  // Bước 2: Sửa lỗi đóng/mở $$ bị rách
  res = res
    .replace(/\$\$\s*(hoặc|và|hay)\s*\$\$/gi, ' $1 ')
    .replace(/\$\$\s*(hoặc|và|hay)\s*/gi, '$ $1 ')
    .replace(/\s*(hoặc|và|hay)\s*\$\$/gi, ' $1 $')
    .replace(/\$\s*(hoặc|và|hay)\s*\$/gi, ' $1 ');

  // Bước 3: Đảm bảo công thức toán được bọc $
  const parts = res.split(/\s+(hoặc|và|hay)\s+/gi);
  if (parts.length > 1) {
    res = parts.map(part => {
      const trimmed = part.trim();
      if (['hoặc', 'và', 'hay'].includes(trimmed.toLowerCase())) {
        return trimmed;
      }
      const cleanPart = trimmed.replace(/\$/g, '').trim();
      if (cleanPart === '') return '';
      return `$${cleanPart}$`;
    }).join(' ');
  } else {
    // Nếu không có từ nối nhưng có lệnh LaTeX hoặc toán tử trần thiếu $
    if (/[\\<>=+\-\^_\/]/.test(res) && !res.includes('$')) {
      res = `$${res}$`;
    }
  }

  // Khôi phục lại các khối \text{...}
  res = res.replace(/___TEXT_TOKEN_(\d+)___/g, (_m, idx) => textTokens[Number(idx)] || '');

  // Dọn dẹp khoảng trắng, dấu $ thừa và rác còn sót lại
  res = res.replace(/\${3,}/g, '$$').replace(/\$\s+\$/g, '');
  return (prefix + res).trim();
};

/**
 * Chuẩn hóa công thức toán trước khi truyền vào MarkdownRenderer:
 * 1. Tự động phát hiện và chuẩn hóa họ nghiệm phương trình lượng giác sang móc vuông KaTeX: \left[\begin{aligned} ... \end{aligned}\right.
 * 2. Tự động phát hiện và chuẩn hóa môi trường \begin{cases} ... \end{cases} (cho hệ PT/BPT):
 *    - Phân tách dính dòng (1002x -> 100 \\ 2x, 80x -> 80 \\ x, v.v.)
 *    - Chuyển \ thành \\
 *    - Đảm bảo mỗi dòng có \\ ngắt dòng chuẩn xác
 * 3. Tự động bọc $$\begin{cases} ... \end{cases}$$ hoặc $$\left[\begin{aligned}...\end{aligned}\right.$$ nếu chưa có $$ hoặc $ bao bọc
 * 4. Nếu cases bị bọc trong single $...$, nâng cấp lên display block $$...$$ để KaTeX hiển thị ngoặc nhọn lớn và ngắt dòng riêng biệt
 */
export function formatMathContent(raw?: string | null): string {
  if (!raw && raw !== '') return '';
  let str = normalizeMathLatex(normalizeMathText(String(raw)));

  // Tự động sửa dứt điểm các lỗi gãy / mất dấu backslash hoặc thừa dấu gạch chéo cho cases
  str = str.replace(/\\*begin\s*\{?cases\*?\}?/gi, '\\begin{cases}');
  str = str.replace(/\\*begincases/gi, '\\begin{cases}');
  str = str.replace(/\\*end\s*\{?cases\*?\}?/gi, '\\end{cases}');
  str = str.replace(/\\*endcases/gi, '\\end{cases}');

  // 1. Chuẩn hóa họ nghiệm lượng giác (đổi \begin{cases} có chứa k2\pi, k\pi, k \in \mathbb{Z}... sang \left[\begin{aligned}...\end{aligned}\right.)
  str = normalizeTrigSolutions(str);

  // 1.8 Tự động chuyển đổi các biểu thức hệ dạng { bpt1 \ bpt2 \ ... } hoặc { bpt1 \\ bpt2 } hoặc \left\{ bpt1 \ bpt2 sang \begin{cases} ... \end{cases}
  str = str.replace(/\\?\{\s*([^{}]+?(?:[<>=]|\\ge|\\le|\\leq|\\geq|\\neq)[^{}]+?(?:\\\\|\\|\n|,)[^{}]+?(?:[<>=]|\\ge|\\le|\\leq|\\geq|\\neq)[^{}]+?)\s*\\?\}/g, (_match, body) => {
    return `\\begin{cases}\n${normalizeCasesBody(body)}\n\\end{cases}`;
  });

  // 2. Chuẩn hóa \left\{ \begin{aligned} ... \end{aligned} \right. hoặc \left\{ \begin{array} ... \end{array} \right. sang \begin{cases} ... \end{cases}
  str = str.replace(/\\left\s*\\\{\s*\\begin\s*\{(?:aligned|array|matrix)\*?\}([\s\S]*?)\\end\s*\{(?:aligned|array|matrix)\*?\}\s*\\right\.?/g, (_m, body) => {
    return `\\begin{cases}\n${normalizeCasesBody(body)}\n\\end{cases}`;
  });
  str = str.replace(/\\left\s*\\\{\s*\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}\s*\\right\.?/g, (_m, body) => {
    return `\\begin{cases}\n${normalizeCasesBody(body)}\n\\end{cases}`;
  });

  // 3. Chuẩn hóa thân môi trường cases còn lại (hệ phương trình / hệ bất phương trình)
  str = str.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (_match, inner) => {
    const fixedInner = normalizeCasesBody(inner);
    return `\\begin{cases}\n${fixedInner}\n\\end{cases}`;
  });

  // 4. Tự động bọc naked math environments (bao gồm \left[\begin{aligned}...\end{aligned}\right. và \begin{cases})
  str = wrapNakedMathEnvironments(str);

  // 5. Nếu cases bị bọc trong single $...$ ngoài danh sách phương án A-D hoặc bảng, nâng cấp lên display block $$...$$
  str = str.replace(/(^|\n)(?!\s*\||\s*[-\*]\s*\*{0,2}[A-D][\.\:\)])\s*(?<!\$)\$\s*(\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})\s*\$(?!\$)/g, '$1\n\n$$\n$2\n$$\n\n');

  // 6. Dọn dẹp rách/thừa dấu $ (vd: $$$ -> $, $$$$ -> $$)
  str = str.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');

  return str;
}

/**
 * Chuẩn hóa bọc công thức toán LaTeX:
 * Tuyệt đối KHÔNG tự động gắn thêm dấu $ vào cuối chuỗi nếu chuỗi đã có cặp dấu $...$ hoàn chỉnh.
 */
export function wrapLatex(text: string): string {
  if (!text) return '';
  let s = cleanMath(text.trim());
  // Kiểm tra nếu đã có cặp dấu $...$ hoàn chỉnh hoặc số lượng dấu $ chẵn >= 2
  const hasMatchedDollars = /(?<!\\)\$[^$\n]+?(?<!\\)\$/.test(s);
  const dollarCount = (s.match(/(?<!\\)\$/g) || []).length;
  if (hasMatchedDollars || (dollarCount >= 2 && dollarCount % 2 === 0)) {
    return cleanMath(s);
  }
  if (!s.startsWith('$') && !s.endsWith('$')) {
    return `$${s}$`;
  }
  return cleanMath(s);
}

export function cleanOptionText(opt: any): string {
  if (opt === undefined || opt === null) return '';
  let text = String(opt).trim();
  
  // 0. Triệt tiêu undefined/null rò rỉ
  text = text.replace(/(?:=\s*)?undefined(?![a-zA-Z0-9_\$])/gi, '').replace(/\bundefined\b/gi, '');
  
  // Dọn dẹp thẻ HTML nếu có
  text = text.replace(/<\/?[^>]+(>|$)/g, "");

  // 1. Loại bỏ nhãn phương án ở đầu (A., B., C., D., a., b., c., d., - A., **A.**, etc.)
  text = text
    .replace(/^[\s\-*•]*([A-Da-d])[\.\:\)\s]+/, '')
    .replace(/^\s*\**([A-Da-d])[\.\:\)]\**\s*/, '')
    .trim();

  // 2. Loại bỏ hoàn toàn dấu sao (*) hoặc gạch dưới (_) đánh dấu phương án đúng ở đầu hoặc cuối phương án
  // Kể cả khi dấu sao nằm ngay trong hoặc ngoài cặp dấu $...$ (vd: *[-2; 3]*, *$[-2; 3]*$, * $[-2; 3] *)
  text = text
    .replace(/^[\s\*_]+/, '')
    .replace(/[\s\*_]+$/, '')
    .replace(/^\$\s*\*+/, '$')
    .replace(/\*+\s*\$$/, '$')
    .replace(/\*+\s*\$([^\$]+)\$\s*\*+/g, '$$$1$')
    .replace(/\$([^\$]+)\*\$/g, '$$$1$')
    .replace(/\$\*([^\$]+)\$/g, '$$$1$')
    .trim();

  // 3. Tự động bọc $ cho phương án là biểu thức toán học hoặc khoảng/đoạn thiếu $
  text = autoWrapNakedMathExpression(text);

  // 4. Chuẩn hóa KaTeX double backslash (\\) thành MathJax single backslash (\)
  text = sanitizeLatexString(text);

  return text;
}

export function getPublicAppUrl(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem('custom_public_app_url');
  if (custom && custom.trim().startsWith('http')) {
    return custom.trim().replace(/\/+$/, '');
  }
  let origin = window.location.origin;
  const mode = localStorage.getItem('ai_studio_url_mode');
  // Only convert to ais-pre- if user explicitly configured 'pre' mode after clicking Share in AI Studio
  if (mode === 'pre' && origin.includes("ais-dev-")) {
    origin = origin.replace("ais-dev-", "ais-pre-");
  }
  return origin;
}

export function cleanQuestionStem(content: any, options?: any[], tfStatements?: any[]): string {
  if (!content) return '';
  let rawStr = String(content).replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  let text = unflattenMarkdownTables(rawStr.trim());
  
  // Bảo vệ an toàn tuyệt đối cho Bảng biến thiên (BBT), Đồ thị, SVGs, Images & Markdown tables
  // TRƯỚC KHI sanitizeLatexString hoặc bất kỳ regex nào can thiệp!
  const visualTokens: string[] = [];
  const protectVisual = (m: string) => {
    visualTokens.push(m);
    return `\n\n___VISUAL_TOKEN_${visualTokens.length - 1}___\n\n`;
  };

  text = text.replace(/<svg-wrapper[\s\S]*?<\/svg-wrapper>/gi, protectVisual);
  text = text.replace(/<tikz-diagram[\s\S]*?<\/tikz-diagram>/gi, protectVisual);
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, protectVisual);
  text = text.replace(/<img\b[\s\S]*?>/gi, protectVisual);
  text = text.replace(/(?:```[a-z]*\s*[\s\S]*?\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\}\s*```|```tikz\s*[\s\S]*?```|\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\})/gi, protectVisual);
  text = text.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, protectVisual);

  text = sanitizeLatexString(text);

  // Chuẩn hóa và chữa lành các hệ phương trình / bất phương trình chứa bất đẳng thức kép (bđt kép)
  text = text.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (_m, body) => `\\begin{cases}\n${normalizeCasesBody(body)}\n\\end{cases}`);
  
  // Strip any leaked preamble packages
  text = text.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');

  // Strip any leaked HTML fragments or image placeholder tokens
  text = text
    .replace(/\[HINH_ANH\]/gi, '')
    .replace(/class=["'][^"']*max-h-[^"']*["']\s*\/?>/gi, '')
    .replace(/<div\b[^>]*>\s*<\/div>/gi, '');

  // Strip system prefixes like (Loại tf), (Loại mcq), [Loại: tf], (Loại Đúng/Sai), etc.
  text = text
    .replace(/(Câu\s*\d+)\s*[:\.]?\s*[\(\[]\s*Loại(?:\s*trắc\s*nghiệm|\s*đúng\s*sai|\s*trả\s*lời\s*ngắn|\s*tự\s*luận|[:\s]+[a-z0-9_\-]+)?\s*[\)\]]\s*[:\.]?/gi, '$1:')
    .replace(/[\(\[]\s*Loại(?:\s*trắc\s*nghiệm|\s*đúng\s*sai|\s*trả\s*lời\s*ngắn|\s*tự\s*luận|[:\s]+[a-z0-9_\-]+)?\s*[\)\]]\s*:?/gi, '')
    .replace(/(Câu\s*\d+[:\.])\s*/gi, '$1 ');

  text = text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 1. Remove HTML grid of options if present
  text = text.replace(/<div\s+class=["']grid[\s\S]*?<\/div>\s*<\/div>/gi, '');
  text = text.replace(/<div\s+class=["']grid[\s\S]*?<\/div>/gi, '');

  // 2. Tách và xóa sạch các phương án A. ... B. ... C. ... D. bị dính liền vào cuối thân câu hỏi
  // Chỉ xóa khi thực sự có chuỗi phương án trắc nghiệm ở đuôi đề bài (sau dấu hỏi, hai chấm, hoặc dòng riêng)
  // TUYỆT ĐỐI không xóa nhầm các điểm hình học trong câu dẫn như "tại A.", "điểm B.", "tọa độ A."
  const geoWordPattern = /(?:tại|điểm|đỉnh|gọi|qua|với|từ|trên|của|cho|và|thuộc|đến|cạnh|đường|mặt\s*phẳng|chiếu\s*lên|tọa\s*độ|tâm|trọng\s*tâm|trực\s*tâm|bán\s*kính|vectơ|vector|tam\s*giác(?:\s+[a-zA-Z\.]+)?|tứ\s*diện(?:\s+[a-zA-Z\.]+)?|hình\s*chóp(?:\s+[a-zA-Z\.]+)?|đoạn\s*thẳng)\s*$/i;

  const aMatches = [...text.matchAll(/(?:(?:\r?\n)+\s*|[.:;?!]\s*|\$|\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>|\()?A(?:\*{0,2}|<\/b>|\))?[\.:\)]\s*/gi)];
  if (aMatches.length > 0) {
    for (let i = aMatches.length - 1; i >= 0; i--) {
      const m = aMatches[i];
      const aIdx = m.index! + m[0].indexOf('A');
      const beforeA = text.substring(0, aIdx).trim();

      if (geoWordPattern.test(beforeA)) continue;

      const afterA = text.substring(aIdx);
      const hasB = /(?:^|\n|\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>|\()?B(?:\*{0,2}|<\/b>|\))?[\.:\)]\s*/i.test(afterA);
      const hasC = /(?:^|\n|\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>|\()?C(?:\*{0,2}|<\/b>|\))?[\.:\)]\s*/i.test(afterA);
      const hasD = /(?:^|\n|\s+)(?:[-*]\s*)?(?:\*{0,2}|<b>|\()?D(?:\*{0,2}|<\/b>|\))?[\.:\)]\s*/i.test(afterA);

      if (hasB && (hasC || hasD)) {
        text = text.substring(0, m.index).trim();
        break;
      }

      if (options && options.length >= 2 && options[0]) {
        const opt0 = String(options[0]).trim().replace(/^\$|\$$/g, '').slice(0, 10);
        if (opt0 && afterA.includes(opt0)) {
          text = text.substring(0, m.index).trim();
          break;
        }
      }
    }
  }

  // If the question has separate tfStatements array (True/False question)
  if (tfStatements && tfStatements.length >= 2) {
    // Remove duplicate trailing sub-statements: a) ... b) ... c) ... d) ... from stem
    text = text.replace(/(?:\r?\n|\s)*(?:[-*]\s*)?(?:\*{0,2}|<b>)?\(?a[\.:\)](?:\*{0,2}|<\/b>)?\s+[\s\S]*$/i, '');
  }
  
  // Xóa sạch các dấu gạch nối, gạch ngang sót lại ở đuôi câu hỏi (như "?-", ":-", ".-")
  text = text.replace(/([?!.:])\s*[-–—_]+\s*$/g, '$1');
  text = text.replace(/\s*[-–—_]+\s*$/g, '');

  let cleaned = sanitizeExamQuestion(text.trim());

  // Khôi phục các hình vẽ BBT & đồ thị nguyên vẹn 100%
  cleaned = cleaned.replace(/___VISUAL_TOKEN_(\d+)___/g, (_m, idx) => {
    const raw = visualTokens[Number(idx)];
    return raw ? `\n\n${raw}\n\n` : '';
  });

  return cleaned.trim();
}

export const wrapAllNakedMath = (str: string): string => {
  if (!str) return "";

  // 0. Bảo vệ các khối math và code đã có sẵn trước khi tìm kiếm naked math
  const protectedTokens: string[] = [];
  let s = normalizeInfinity(str);
  s = s.replace(/(```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
    protectedTokens.push(match);
    return `___WRAPPED_MATH_TOKEN_${protectedTokens.length - 1}___`;
  });

  s = normalizeLogicAndSetSymbols(s);

  // Bảo vệ tiếp các khối math mới sinh từ normalizeLogicAndSetSymbols
  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
    protectedTokens.push(match);
    return `___WRAPPED_MATH_TOKEN_${protectedTokens.length - 1}___`;
  });

  // Tự động nhận diện và bọc các bất đẳng thức kép trần trụi (bđt kép):
  // vd: 0 \le x \le 4, -1 < x \le 3, 0 <= x <= 4, -2 < x < 5, 0 \le y \le 5
  const ineqOpPattern = "(?:<=|>=|<|>|\\\\le|\\\\ge|\\\\leq|\\\\geq|\\\\leqslant|\\\\geqslant|\\ble\\b|\\bge\\b|\\bleq\\b|\\bgeq\\b)";
  const compoundNakedRegex = new RegExp(
    `(?<![\\$a-zA-Z0-9\\\\\\(\\[\\{])([+-]?(?:\\d+(?:[.,]\\d+)?|[a-zA-Z]|\\\\[a-zA-Z]+(?:\\{[^{}]*\\})*))\\s*(${ineqOpPattern})\\s*([^\\\\\\n,;]+?)\\s*(${ineqOpPattern})\\s*([+-]?(?:\\d+(?:[.,]\\d+)?|[a-zA-Z]|\\\\[a-zA-Z]+(?:\\{[^{}]*\\})*))(?![\\$a-zA-Z0-9\\\\])`,
    "gi"
  );
  s = s.replace(compoundNakedRegex, (_m, a, op1, mid, op2, b) => {
    const norm = (o: string) => {
      const lower = o.toLowerCase().replace(/^\\/, '');
      if (lower === '<=' || lower === 'le' || lower === 'leq' || lower === 'leqslant') return '\\le';
      if (lower === '>=' || lower === 'ge' || lower === 'geq' || lower === 'geqslant') return '\\ge';
      if (lower === '<' || lower === '>') return lower;
      return `\\${lower}`;
    };
    const token = `___WRAPPED_MATH_TOKEN_${protectedTokens.length}___`;
    protectedTokens.push(`$${a.trim()} ${norm(op1)} ${mid.trim()} ${norm(op2)} ${b.trim()}$`);
    return token;
  });

  const mathCmds = [
    "dfrac", "frac", "sqrt", "vec", "overrightarrow", "int", "iint", "iiint", "oint", 
    "lim", "sum", "prod", "log", "ln", "sin", "cos", "tan", "cot", "arcsin", "arccos", "arctan",
    "alpha", "beta", "gamma", "delta", "Delta", "pi", "theta", "Theta", "lambda", "Lambda",
    "mu", "sigma", "Sigma", "omega", "Omega", "phi", "Phi", "in", "notin", "subset", "supset", "subseteq", "supseteq",
    "cup", "cap", "setminus", "emptyset", "forall", "exists", "infty", "pm", "mp", "times", "div",
    "le", "ge", "leq", "geq", "neq", "approx", "equiv", "sim", "cong", "parallel", "perp", "angle", "circ", "partial", "nabla",
    "mathbb", "mathbf", "mathrm", "mathcal", "text", "to", "rightarrow", "Rightarrow", "leftarrow", "Leftarrow", "leftrightarrow", "Leftrightarrow",
    "cdots", "ldots", "cdot"
  ].join("|");

  const stopWords = /^(và|hoặc|với|khi|thì|là|bằng|thuộc|trên|trong|tại|sao\s+cho|đồng\s+biến|nghịch\s+biến|liên\s+tục|có|tìm|tính|chứng\s+minh|xét|giải|cho|gọi|biết|nếu|suy\s+ra|tương\s+đương|kết\s+luận|hãy|để|đáp\s+án|phương\s+trình|hệ\s+phương\s+trình|bất\s+phương\s+trình|hàm\s+số|đồ\s+thị|vectơ|vecto|tọa\s+độ|mặt\s+phẳng|đường\s+thẳng|điểm|khoảng|đoạn|nửa\s+khoảng)(?![a-zA-Z0-9_\u00C0-\u1EF9])/i;

  const findStartWithPrefix = (text: string, cmdIndex: number): number => {
    const before = text.slice(0, cmdIndex);
    // Tìm vị trí kết thúc của từ tiếng Việt, ký tự dừng, ngoặc đóng không đối xứng hoặc nhãn danh sách
    let lastStop = -1;
    for (let i = before.length - 1; i >= 0; i--) {
      const ch = before[i];
      if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(ch) ||
          ch === '$' || ch === '`' || ch === '“' || ch === '"' || ch === '”' || ch === '\n' || ch === '\r' ||
          ch === ')' || ch === ']' || ch === '}' || ch === ':' || ch === '.' || ch === ';' || ch === ',') {
        lastStop = i;
        break;
      }
    }
    let candidate = lastStop >= 0 ? before.slice(lastStop + 1) : before;
    candidate = candidate.replace(/^(?:[-*]\s*)?(?:\*{0,2})[a-zA-Z0-9]+[\.\:\)](?:\*{0,2})\s*/, '');
    candidate = candidate.replace(stopWords, '');
    const trimmed = candidate.trimStart();
    if (trimmed && /^[a-zA-Z0-9\(\[\{\-+\\\^]/.test(trimmed)) {
      return cmdIndex - trimmed.length;
    }
    const prefixMatch = before.match(/(?:^|[\s\(\[\{;,])((?:C_\{?|[a-zA-Z0-9\(\)]+(?:[\^_]\{?[0-9a-zA-Z+\-]+\}?)*(?:\([a-zA-Z0-9,\s]*\))?(?:\s*(?:[+\-*\/=><\le\ge\approx\neq]|>=|<=|==|!=|\\le|\\ge|\\approx|\\neq|\\sim)\s*-?\d+(?:\.\d+)?)?\s*))$/);
    if (prefixMatch && prefixMatch[1]) {
      return cmdIndex - prefixMatch[1].length;
    }
    return cmdIndex;
  };

  const findMathSpan = (s: string, startIdx: number): { endIndex: number; formula: string } => {
    let i = startIdx;
    const len = s.length;
    let braceDepth = 0;
    let bracketDepth = 0;
    let parenDepth = 0;
    let lastValidEnd = startIdx;

    while (i < len) {
      const ch = s[i];

      if (ch === "\\") {
        const restCmd = s.slice(i).match(/^\\[a-zA-Z]+/);
        if (restCmd) {
          i += restCmd[0].length;
          lastValidEnd = i;
          continue;
        } else {
          i += 2;
          lastValidEnd = i;
          continue;
        }
      }

      if (ch === "{") {
        braceDepth++;
      } else if (ch === "}") {
        braceDepth--;
        if (braceDepth < 0) break;
        if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
          lastValidEnd = i + 1;
        }
      } else if (ch === "[") {
        bracketDepth++;
      } else if (ch === "]") {
        bracketDepth--;
        if (bracketDepth < 0) {
          if (parenDepth > 0) {
            parenDepth--;
            bracketDepth = 0;
            if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
              lastValidEnd = i + 1;
            }
          } else {
            break;
          }
        } else if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
          lastValidEnd = i + 1;
        }
      } else if (ch === "(") {
        parenDepth++;
      } else if (ch === ")") {
        parenDepth--;
        if (parenDepth < 0) {
          if (bracketDepth > 0) {
            bracketDepth--;
            parenDepth = 0;
            if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
              lastValidEnd = i + 1;
            }
          } else {
            break;
          }
        } else if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
          lastValidEnd = i + 1;
        }
      } else if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
        // Tuyệt đối dừng lại nếu gặp dấu ngoặc kép, dấu backtick, ký tự markdown hoặc token placeholder
        if (/^[“"”'‘`*#|]/.test(ch) || s.slice(i).startsWith('___')) {
          break;
        }

        if (/^[.,:;?!](\s|$)/.test(s.slice(i))) {
          const currentFormula = s.slice(startIdx, i);
          const hasQuantifier = /\\(?:forall|exists)\b/.test(currentFormula);
          if (hasQuantifier && /^[.,;:](\s|$)/.test(s.slice(i))) {
            const afterPunct = s.slice(i + 1).trimStart();
            if (afterPunct && !stopWords.test(afterPunct) && !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(afterPunct.charAt(0)) && /^([a-zA-Z0-9\+\-\*\/\=><\(\)\[\]\{\}\\])/.test(afterPunct)) {
              i += (s.slice(i).length - afterPunct.length);
              lastValidEnd = i;
              continue;
            }
          }
          break;
        }

        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(ch)) {
          break;
        }

        if (/[\s\n\r]/.test(ch)) {
          const afterSpace = s.slice(i).trimStart();
          if (!afterSpace) break;

          if (stopWords.test(afterSpace) || /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(afterSpace.charAt(0))) {
            break;
          }

          if (/^([+\-*\/=<>]|\\|\d+|[a-zA-Z]{1,4}\b|\(|\)|\[|\]|\{|\})/.test(afterSpace)) {
            i += (s.slice(i).length - afterSpace.length);
            lastValidEnd = i;
            continue;
          } else {
            break;
          }
        }

        lastValidEnd = i + 1;
      }
      i++;
    }

    if (lastValidEnd <= startIdx) {
      lastValidEnd = Math.max(startIdx + 1, i);
    }

    return { endIndex: lastValidEnd, formula: s.slice(startIdx, lastValidEnd).trim() };
  };

  let result = "";
  let idx = 0;
  const cmdRegex = new RegExp(`\\\\(?:${mathCmds})(?=[^a-zA-Z]|$)`, "g");

  while (idx < s.length) {
    cmdRegex.lastIndex = idx;
    const match = cmdRegex.exec(s);
    if (!match) {
      result += s.slice(idx);
      break;
    }

    let startWithPrefix = findStartWithPrefix(s, match.index);
    let span = findMathSpan(s, startWithPrefix);
    if (span.endIndex <= match.index) {
      startWithPrefix = match.index;
      span = findMathSpan(s, startWithPrefix);
    }
    result += s.slice(idx, startWithPrefix);
    result += `$${span.formula}$`;
    idx = Math.max(span.endIndex, match.index + match[0].length);
  }

  // Auto-wrap remaining standalone naked intervals like (-\infty; -1), (-1; +\infty), [0; 1), [-2; 3]
  result = result.replace(/(?<![\\$a-zA-Z0-9])([\[\(]\s*(?:[+\-±]?\\infty|-?\d+(?:\.\d+)?(?:\\frac\{[^{}]*\}\{[^{}]*\}|\/[0-9]+)?)\s*[;,]\s*(?:[+\-±]?\\infty|-?\d+(?:\.\d+)?(?:\\frac\{[^{}]*\}\{[^{}]*\}|\/[0-9]+)?)\s*[\]\)])(?![\\$a-zA-Z0-9])/g, (m, g1, offset) => {
    if (isInsideMath(result, offset)) return m;
    return `$${g1}$`;
  });

  // Khôi phục các token đã được bảo vệ
  let prevIter = '';
  let iter = 0;
  while (result.includes('___WRAPPED_MATH_TOKEN_') && prevIter !== result && iter < 10) {
    prevIter = result;
    iter++;
    result = result.replace(/___WRAPPED_MATH_TOKEN_(\d+)___/g, (_m, id) => protectedTokens[Number(id)] ?? '');
  }

  return result;
};

export const fixMath = (text: any): string => {
    return normalizeMathText(text);
};

const old_fixMath_disabled_for_safety = (text: any) => {
    let t = typeof text === 'string' ? text : String(text || '');
    
    // 0. Remove stray preamble packages that might be generated in math or TikZ
    t = t.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');

    // 0.05. Sửa lỗi hệ phương trình bị mất gạch chéo và ngoặc nhọn hoặc thừa dấu gạch chéo ngược:
    // Bắt và chuyển đổi các chuỗi "begincases", "begin cases", "\\ begin{cases}" thành "\begin{cases}".
    // Bắt và chuyển đổi "endcases", "end cases", "\\ end{cases}" thành "\end{cases}".
    t = t.replace(/\\*begin\s*\{?cases\*?\}?/gi, '\\begin{cases}');
    t = t.replace(/\\*begincases/gi, '\\begin{cases}');
    t = t.replace(/\\*end\s*\{?cases\*?\}?/gi, '\\end{cases}');
    t = t.replace(/\\*endcases/gi, '\\end{cases}');

    // 0.06. Sửa lỗi ký hiệu tập hợp và toán học bị dính khoảng trắng sau gạch chéo:
    // "\ \in", "\\ \in" -> "\in"
    // "\ \mathbb", "\\ \mathbb" -> "\mathbb"
    // "\ \mid", "\\ \mid" -> "\mid"
    // "\ text", "\\ text" -> "\text"
    t = t.replace(/(?<!\\)\\+\s+in\b/g, '\\in');
    t = t.replace(/(?<!\\)\\+\s+mathbb\b/g, '\\mathbb');
    t = t.replace(/(?<!\\)\\+\s+mid\b/g, '\\mid');
    t = t.replace(/(?<!\\)\\+\s+text\b/g, '\\text');
    t = t.replace(/(?<!\\)\\+\s+notin\b/g, '\\notin');
    t = t.replace(/(?<!\\)\\+\s+subset\b/g, '\\subset');

    // Tự động thoát dấu ngoặc nhọn tập hợp "{" và "}" thành "\{" và "\}" để KaTeX hiển thị đúng
    t = t.replace(/([=:]|\\in|\\cap|\\cup|\\subset)\s*(?<!\\)\{([^{}\n]+?)(?<!\\)\}/g, '$1 \\{$2\\}');
    t = t.replace(/(?<!\\)\{\s*([a-zA-Z\d]\s*\\in\s*\\mathbb[^{}\n]+?)\s*(?<!\\)\}/g, '\\{$1\\}');

    // 0.1. Normalize infinity in all variations (in fty, infty without backslash, etc.)
    t = normalizeInfinity(t);

    // 1. Unescape escaped dollar signs (\$)
    t = t.replace(/\\(\$)/g, '$1');

    // 2. Convert standard LaTeX bracket delimiters \(...\) to $...$ and \[...\] to $$...$$
    t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
    t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

    // 2.01. Normalize trig solutions: convert \begin{cases} with k2\pi, k\pi, k \in \mathbb{Z} to \left[\begin{aligned}...\end{aligned}\right.
    // while strictly keeping \begin{cases} for systems of equations/inequalities
    t = normalizeTrigSolutions(t);

    // 2.02. Normalize newlines inside \begin{cases}...\end{cases}:
    // Ensure equations in cases are separated by LaTeX double-backslash \\ and no merged text
    t = t.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (_match, body) => {
        const fixedBody = normalizeCasesBody(body);
        return `\\begin{cases}\n${fixedBody}\n\\end{cases}`;
    });

    // 2.05 Auto-wrap naked math environments (\left[\begin{aligned}...\end{aligned}\right. or \begin{cases}...\end{cases}, etc.)
    // Safely checks isInsideMath so already-wrapped math environments are never duplicated
    t = wrapNakedMathEnvironments(t);

    // 2.1. Normalize informal not-equal signs (/ =, /=, !=, =/=) to standard LaTeX \neq
    t = t.replace(/=\/=/g, ' \\neq ');
    t = t.replace(/!\s*=\s*/g, ' \\neq ');
    t = t.replace(/(?<!\/)\/\s*=\s*/g, ' \\neq ');

    // 2.15. Preserve Markdown table integrity:
    // Markdown table rows start and end with '|'. They must NEVER contain raw newlines or unescaped pipe symbols inside math.
    const rawLines = t.split('\n');
    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
            // This is a Markdown table row
            // 1. Convert any $$...$$ inside table row to single $...$
            line = line.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, '$$$1$$');
            // 2. Replace any raw pipe '|' inside $...$ in table cell with \vert to prevent column splitting
            line = line.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (m, f) => {
                const safeFormula = f.replace(/(?<!\\)\|/g, '\\vert ');
                return `$${safeFormula}$`;
            });
            // 3. Cưỡng chế đổi mọi mũi tên ngang trong bảng biến thiên thành \searrow
            line = line.replace(/\\(?:rightarrow|longrightarrow)\b/g, '\\searrow');
            line = line.replace(/\|\s*-{1,2}>\s*\|/g, '| $\\searrow$ |');
            line = line.replace(/(?<=\|\s*(?:\$)?)\s*-{1,2}>\s*(?=(?:\$)?\s*\|)/g, '\\searrow');
            rawLines[i] = line;
        }
    }
    t = rawLines.join('\n');

    // 2.2. Normalize options formatted with environments or multiline expressions:
    // e.g. "A. $\n\begin{cases}...\end{cases}\n$" or "A. $ \begin{cases}...\end{cases} $" or "<div><strong>A.</strong> $\begin{cases}...</div>"
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\${0,2}\s*(\\left\s*\[\s*\\begin\s*\{aligned\*?\}[\s\S]*?\\end\s*\{aligned\*?\}\s*\\right\.?(?:\s*\\quad\s*\([^\)]+\))?)\s*\${0,2}\s*(<\/div>|$|\n)/g, (m, prefix, label, env, suffix) => {
        return `${prefix}${label} $${env.trim()}$ ${suffix}`;
    });
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\${0,2}\s*(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*\${0,2}\s*(<\/div>|$|\n)/g, (m, prefix, label, env, suffix) => {
        return `${prefix}${label} $${env.trim()}$ ${suffix}`;
    });

    // 2.25. Normalize list items formatted with environments (e.g. "- a) $\begin{cases}...", "a) $\begin{cases}...")
    // Keep them inline so the list item numbering/lettering is not broken by display block newlines
    t = t.replace(/(^|\n)\s*([-\*]\s+|(?:\d+|[a-d])[\.\:\)]\s+)\${0,2}\s*(\\left\s*\[\s*\\begin\s*\{aligned\*?\}[\s\S]*?\\end\s*\{aligned\*?\}\s*\\right\.?(?:\s*\\quad\s*\([^\)]+\))?)\s*\${0,2}\s*($|\n)/g, (m, prefix, bullet, env, suffix) => {
        return `${prefix}${bullet}$${env.trim()}$${suffix}`;
    });
    t = t.replace(/(^|\n)\s*([-\*]\s+|(?:\d+|[a-d])[\.\:\)]\s+)\${0,2}\s*(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*\${0,2}\s*($|\n)/g, (m, prefix, bullet, env, suffix) => {
        return `${prefix}${bullet}$${env.trim()}$${suffix}`;
    });

    // 2.3. Normalize options with multiline expressions e.g. "A. $\n x = 1 \n$" -> "A. $x = 1$"
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\$\s*\n+([\s\S]*?)\n+\s*\$\s*(<\/div>|$|\n)/g, (m, prefix, label, expr, suffix) => {
        return `${prefix}${label} $${expr.trim()}$ ${suffix}`;
    });

    // 2.4. Normalize options with simple inline math with extra spaces e.g. "A. $ x = 1 $" -> "A. $x = 1$"
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\$\s*([^\$\n]+?)\s*\$\s*(<\/div>|$|\n)/g, (m, prefix, label, expr, suffix) => {
        return `${prefix}${label} $${expr.trim()}$ ${suffix}`;
    });

    // 2.5. If wrapped in single $...$, upgrade to display block $$...$$ for aligned and cases when NOT inside table row '|', list bullet, or option label
    t = t.replace(/(^|\n)(?!\s*\||\s*[-\*]|\s*[A-D][\.\:\)]|\s*[a-d][\.\:\)])\s*(?<!\$)\$\s*(\\left\s*\[\s*\\begin\s*\{aligned\*?\}[\s\S]*?\\end\s*\{aligned\*?\}\s*\\right\.?(?:\s*\\quad\s*\([^\)]+\))?)\s*\$(?!\$)\s*($|\n)/g, (_m, p1, p2, p3) => `${p1}\n\n$$\n${p2.trim()}\n$$\n\n${p3}`);
    t = t.replace(/(^|\n)(?!\s*\||\s*[-\*]|\s*[A-D][\.\:\)]|\s*[a-d][\.\:\)])\s*(?<!\$)\$\s*(\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})\s*\$(?!\$)\s*($|\n)/g, (_m, p1, p2, p3) => `${p1}\n\n$$\n${p2.trim()}\n$$\n\n${p3}`);
    // Đảm bảo trong hướng dẫn giải / lời giải: các câu dẫn như "Ta có hệ phương trình: $\begin{cases}..." được nâng cấp lên display block $$...$$
    t = t.replace(/((?:Ta có|Xét|Giải|Do đó|Suy ra|Từ đó)\s+hệ(?:\s+phương\s+trình|\s+bất\s+phương\s+trình)?[:\.]?\s*)\${1,2}\s*(\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})\s*\${1,2}/gi, '$1\n\n$$\n$2\n$$\n\n');

    // 2.7. Clean stray single $ lines before or after $$...$$
    t = t.replace(/(^|\n)\s*\$\s*\n+(\$\$[\s\S]*?\$\$)/g, '$1$2');
    t = t.replace(/(\$\$[\s\S]*?\$\$)\n+\s*\$\s*($|\n)/g, '$1$2');
    t = t.replace(/(?<!\$)\$\s*(\$\$[\s\S]*?\$\$)\s*\$(?!\$)/g, '$1');

    // 2.72. Rescue any Vietnamese text accidentally wrapped inside math mode
    t = rescueVietnameseFromMath(t);

    // 2.73. Clean redundant/excessive dollar signs (e.g. $$$ -> $, $$$$ -> $$)
    t = t.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');

    // 2.74. Clean orphan dots right after display math blocks (e.g. "$$ ... $$ . Xét..." -> "$$ ... $$\n\nXét...")
    t = t.replace(/(\$\$[\s\S]*?\$\$)\s*\.\s*(?=[A-ZÀ-Ỹ])/g, '$1\n\n');

    // 2.75. Convert $$...$$ inside parentheses or parenthetical explanations (e.g. "(Vì $$...$$)") to single $...$
    t = t.replace(/\(([^()\n]*?)\$\$([\s\S]*?)\$\$([^()\n]*?)\)/g, (match, before, math, after) => {
        const cleanMath = math.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
        return `(${before}$${cleanMath}$${after})`;
    });

    // Convert $$...$$ in True/False statements or explanation lines (e.g. "c) Đúng (Vì $$...$$)" or "- a) Đúng ...")
    t = t.replace(/(^|\n)\s*([-\*]\s+|(?:\d+|[a-d])[\.\:\)]\s+)([^\n]*)($|\n)/g, (match, prefix, bullet, content, suffix) => {
        const cleaned = content.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (m, math) => {
            return `$${math.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()}$`;
        });
        return `${prefix}${bullet}${cleaned}${suffix}`;
    });

    // 2.8. Normalize spaces, trailing punctuation, infinity, and strip newlines inside inline $ ... $ so remark-math and KaTeX recognize them
    t = t.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (match, formula) => {
        if (formula.includes('$$')) return match;
        let trimmed = formula.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
        if (!trimmed) return match;
        
        // Ensure infinity & not-equal normalization inside math block as well
        trimmed = normalizeInfinity(trimmed);
        trimmed = trimmed.replace(/=\/=/g, ' \\neq ')
                         .replace(/!\s*=\s*/g, ' \\neq ')
                         .replace(/(?<!\/)\/\s*=\s*/g, ' \\neq ')
                         .replace(/\s*\\neq\s*/g, ' \\neq ');

        let trailingPunct = "";
        const punctMatch = trimmed.match(/([.,;:!?]+)$/);
        if (punctMatch && !/[\\\}]/.test(punctMatch[1])) {
            trailingPunct = punctMatch[1];
            trimmed = trimmed.slice(0, -trailingPunct.length).trim();
        }
        
        return `$${trimmed}$${trailingPunct}`;
    });

    // 2.81. Normalize infinity inside $$ ... $$ blocks as well
    t = t.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, formula) => {
        return `$$\n${normalizeInfinity(formula.trim())}\n$$`;
    });

    // 2.9. Protect existing math blocks, code blocks, inline code, TikZ, and SVGs/images while wrapping naked math commands
    const tokenRegex = /(```[\s\S]*?```|`[^`\n]+`|<img[\s\S]*?>|<svg[\s\S]*?<\/svg>|<tikz-diagram[\s\S]*?<\/tikz-diagram>|<svg-wrapper[\s\S]*?<\/svg-wrapper>|\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\}|\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}|\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$])+?\$)/gi;
    const parts: { isProtected: boolean; text: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(t)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ isProtected: false, text: t.substring(lastIndex, match.index) });
        }
        parts.push({ isProtected: true, text: match[0] });
        lastIndex = tokenRegex.lastIndex;
    }
    if (lastIndex < t.length) {
        parts.push({ isProtected: false, text: t.substring(lastIndex) });
    }

    t = parts.map(p => p.isProtected ? p.text : wrapAllNakedMath(p.text)).join('');

    // Clean stray accidental $$ before operators or between math fragments (vd: [-3; 2)$$\cap or (-2; 3)$$\Rightarrow)
    t = t.replace(/([\)\]\}0-9a-zA-Z])\s*\$\$\s*(?=(\\(?:cap|cup|setminus|Rightarrow|Leftrightarrow|in|notin|subset|supset|subseteq|supseteq|approx|neq|le|ge|leq|geq)|[=+\-*\/]))/gi, '$1 ');
    t = t.replace(/(?<!\$)\$(?!\$)\s*(?<!\$)\$(?!\$)/g, ' ');

    // 3. Fix BBT missing hlines and vertical lines
    if (t.includes('\\begin{array}')) {
        // fix vertical lines: keep only one after first column (only if it's a BBT)
        if (t.includes("f'(x)") || t.includes("y'") || (t.includes("x") && (t.includes("f(x)") || t.includes(" y &")))) {
            t = t.replace(/\\begin\s*\{array\}\s*\{([^}]+)\}/g, (match, formatString) => {
                let cols = formatString.replace(/[^a-zA-Z]/g, ''); // keep only c, l, r
                if (cols.length > 0) {
                   cols = cols.charAt(0) + '|' + cols.slice(1);
                }
                return `\\begin{array}{${cols}}`;
            });
        }
        
        let lines = t.split('\\n');
        // fallback if it doesn't have \\n but actual newlines
        if (lines.length === 1) lines = t.split('\n');
        
        let newLines = [];
        for (let line of lines) {
            let isDerivativeRow = line.includes("f'(x)") || line.includes("y'");
            let isFunctionRow = (line.includes("f(x)") || line.match(/^y\s*&/) || line.includes(" y &")) && !line.includes("f'(x)");
            
            if (isDerivativeRow || isFunctionRow) {
                 let prevIdx = newLines.length - 1;
                 while (prevIdx >= 0 && newLines[prevIdx].trim() === '') prevIdx--;
                 if (prevIdx >= 0) {
                     let prev = newLines[prevIdx];
                     if (prev.includes('\\\\') && !prev.includes('\\hline')) {
                         newLines[prevIdx] = prev.replace(/\\\\(\s*)$/, '\\\\ \\hline$1');
                         if (newLines[prevIdx] === prev) {
                             newLines[prevIdx] = prev + ' \\hline';
                         }
                     } else if (!prev.includes('\\\\') && !prev.includes('\\hline') && !prev.includes('\\begin')) {
                         newLines[prevIdx] = prev + ' \\\\ \\hline';
                     }
                 }
            }
            newLines.push(line);
        }
        t = newLines.join('\n');
        t = t.replace(/\|\|/g, '\\parallel');
    }

    // 4. Auto-wrap math intervals or expressions that are missing $ delimiters
    // ONLY for short option items like "(-\infty; -1) và (0; 1)" or "(-1; 1)" or "y = 2x + 1"
    // NEVER wrap full Vietnamese sentences, question stems, or text with words!
    const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(t);
    const isSentential = t.length > 50 || t.split(/\s+/).length > 6;
    if (!hasVietnamese && !isSentential && !t.includes('$') && !t.includes('\\begin{')) {
        if (/\s+(?:và|hoặc)\s+/i.test(t)) {
            const parts = t.split(/(\s+(?:và|hoặc)\s+)/i);
            t = parts.map(p => {
                if (/^\s*(?:và|hoặc)\s*$/i.test(p)) return p;
                let sub = p.trim();
                if (/^[\[\(].+[\]\)]$/.test(sub) || /[\^_\\]/.test(sub) || /^[a-zA-Z0-9\+\-\*\/\=><\s,;]+$/.test(sub)) {
                    return `$${sub}$`;
                }
                return p;
            }).join('');
        } else {
            if (/^[\[\(].+[\]\)]$/.test(t) || /[\^_\\]/.test(t) || /^[a-zA-Z]\s*[=><\le\ge]/.test(t) || /^\\?\{[^}\n]+\\?\}$/.test(t)) {
                t = `$${t}$`;
            }
        }
    }

    // 4.1. Cứu hộ câu hỏi bị lỡ bọc $ trọn vẹn cả câu hoặc dính chữ
    t = rescueAccidentalFullMathBlock(t);

    // 5. Clean stray single $ on isolated lines, rescue Vietnamese text, and clean excess dollars
    t = t.replace(/^\s*\$\s*$/gm, '');
    t = rescueVietnameseFromMath(t);
    t = t.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');

    // 6. Format multiple choice options into standard CSS Grid layout and ensure spacing between questions
    t = formatMultipleChoiceInMarkdown(t);

    // 7. Giải cứu triệt để mã code, nested \text và xóa placeholder/undefined sót lại
    t = rescueCodeAndNestedText(t);

    // Triệt tiêu hoàn toàn bất kỳ rò rỉ nào của chữ "undefined" hoặc "null" lẻ loi trong tài liệu tiếng Việt
    t = t.replace(/(?<![a-zA-Z0-9_\$])(?:undefined|null)(?![a-zA-Z0-9_\$])/g, '');

    return t;
};

/**
 * Tách dòng đề bài và chuẩn hóa định dạng trắc nghiệm sang Markdown thuần túy (không inject HTML)
 */
export function formatMultipleChoiceInMarkdown(content: string): string {
  if (!content) return '';
  let text = String(content);

  // 0. Dọn sạch các chuỗi rác `-**`, `** **`, hoặc `-` tích tụ từ trước
  text = text.replace(/(?:^|\n)\s*[-*]{2,}\s*(?:\n|$)/g, '\n');
  text = text.replace(/-+\*{2,}/g, '');
  text = text.replace(/\*{4,}/g, '**');

  // 1. TÁCH BIỆT GIỮA CÁC CÂU HỎI (Spacing):
  text = text.replace(/([^\n])\s*(?:\r?\n)?(\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2})/gi, '$1\n\n$2');

  // 2. QUY TẮC HIỂN THỊ PHẦN ĐÚNG/SAI (PHẦN II):
  // - Khi gặp các ký hiệu mệnh đề a), b), c), d) (chữ thường):
  //   chèn ngắt dòng phía trước để mỗi ý tự động rớt xuống 1 hàng riêng trực quan.
  // - KHÔNG dùng tiền tố gạch đầu dòng (-) để tránh bị Markdown biên dịch thành đường kẻ ngang (<hr>)
  // - Dùng \p{L} để tuyệt đối không khớp nhầm đuôi chữ tiếng Việt (như "thực.", "học.", "bậc.")
  text = text.replace(/(?:^|\n)\s*(?:\*\*)?\(?([a-d])\)(?:\*\*)?\s+/gu, '\n\n**$1)** ');
  text = text.replace(/([^\n])\s*(?:\r?\n)?(?<![\p{L}\p{N}\$_\*])([a-d]\))[ \t]+/gu, '$1\n\n**$2** ');

  // 3. TÁCH DÒNG ĐỀ BÀI VÀ 4 PHƯƠNG ÁN LỰA CHỌN (PHẦN I):
  const geoWordCheck = /(?:tại|điểm|đỉnh|gọi|qua|với|từ|trên|của|cho|và|thuộc|đến|cạnh|đường|mặt\s*phẳng|chiếu\s*lên|tọa\s*độ|tâm|trọng\s*tâm|trực\s*tâm|bán\s*kính|vectơ|vector|tam\s*giác(?:\s+[a-zA-Z\.]+)?|tứ\s*diện(?:\s+[a-zA-Z\.]+)?|hình\s*chóp(?:\s+[a-zA-Z\.]+)?|đoạn\s*thẳng)\s*$/i;

  text = text.replace(/([^\n])\s+(?=(?:[-*]\s*)?(?:\*{0,2})A[\.\:\)](?:\*{0,2})\s+(?!Trắc nghiệm|Tự luận|Khẳng định|Mệnh đề))/gi, (match, p1, offset) => {
    const before = text.slice(Math.max(0, offset - 25), offset + p1.length);
    if (geoWordCheck.test(before.trim())) return match;
    return `${p1}\n\n`;
  });

  text = text.replace(/([^\n])\s+(?=(?:[-*]\s*)?(?:\*{0,2})[B-D][\.\:\)](?:\*{0,2})\s+)/gi, (match, p1, offset) => {
    const before = text.slice(Math.max(0, offset - 25), offset + p1.length);
    if (geoWordCheck.test(before.trim())) return match;
    return `${p1}\n`;
  });

  // 4. CHUẨN HÓA TIỀN TỐ PHƯƠNG ÁN Ở ĐẦU DÒNG THÀNH MARKDOWN ĐẸP:
  text = text.replace(/(?:^|\n)[ \t]*(?:[-*−]\s*)?(?:\*\*)?([A-D])[\.\:\)](?:\*\*)?[ \t]*/g, '\n\n**$1.** ');

  // 5. CHUẨN HÓA 4 ĐÁP ÁN (PHẦN I) SANG CÚ PHÁP MARKDOWN THUẦN TÚY:
  const choicePattern = /(?:(?:\r?\n)+\s*|^\s*)((?:[-*]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s+(?!Trắc nghiệm|Tự luận|Khẳng định|Mệnh đề)(?:(?!(?:\r?\n)\s*(?:###?\s*|\*\*)?(?:Câu\s*\d+|Bài\s*\d+|\d+\.))[\s\S])*?)(?:(?:\r?\n)+\s*|\s+|\t)(?:[-*]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s+((?:(?!(?:\r?\n)\s*(?:###?\s*|\*\*)?(?:Câu\s*\d+|Bài\s*\d+|\d+\.))[\s\S])*?)(?:(?:\r?\n)+\s*|\s+|\t)(?:[-*]\s*)?(?:\*{0,2})(?<!\()C[\.\)](?:\*{0,2})\s+((?:(?!(?:\r?\n)\s*(?:###?\s*|\*\*)?(?:Câu\s*\d+|Bài\s*\d+|\d+\.))[\s\S])*?)(?:(?:\r?\n)+\s*|\s+|\t)(?:[-*]\s*)?(?:\*{0,2})(?<!\()D[\.\)](?:\*{0,2})\s+((?:(?!(?:\r?\n)\s*(?:###?\s*|\*\*)?(?:Câu\s*\d+|Bài\s*\d+|\d+\.))[\s\S])*?)(?=(?:\r?\n\s*(?:(?:###?\s*|\*\*)?(?:Câu\s*\d+|Bài\s*\d+|\d+\.)|Lời giải|Hướng dẫn|Đáp án|\*\*Lời giải|\*\*Hướng dẫn|\*\*Đáp án|---)|(?:\r?\n){2,}|$))/g;

  text = text.replace(choicePattern, (match, rawA, rawB, rawC, rawD) => {
    const stripOptionPrefix = (str: string) => {
      return str
        .replace(/^(?:[-*−\.\s]|\*{1,2})*([A-Da-d])[\.\:\)](?:<\/b>|\*{1,2})?\s*(?:[-*−\.\s]|\*{1,2})*/gi, '')
        .replace(/^(?:[-*]\s*)?(?:\*{0,2})[A-Da-d][\.\)](?:\*{0,2})\s*/gi, '')
        .trim();
    };

    let optA = stripOptionPrefix(rawA);
    let optB = stripOptionPrefix(rawB);
    let optC = stripOptionPrefix(rawC);
    let optD = stripOptionPrefix(rawD);

    const cleanOption = (s: string) => {
      let trimmed = s.replace(/[;,]+$/, '').trim();
      trimmed = cleanOptionText(trimmed);
      return trimmed;
    };

    optA = cleanOption(optA);
    optB = cleanOption(optB);
    optC = cleanOption(optC);
    optD = cleanOption(optD);

    return `\n\n**A.** ${optA}\n**B.** ${optB}\n**C.** ${optC}\n**D.** ${optD}\n\n`;
  });

  // Xóa các dòng trống thừa
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}

/**
 * Nhận diện câu hỏi có ngữ cảnh bối cảnh thực tế đời sống (Chuẩn GDPT 2018)
 */
export function isRealWorldQuestion(q?: any): boolean {
  if (!q) return false;
  if (q.isRealWorld === true || q.isRealWorld === 'true') return true;
  
  const content = String(q.content || q.question || q.text || '');
  const explanation = String(q.explanation || '');
  const combined = content + ' ' + explanation;
  if (!combined.trim()) return false;

  const realWorldRegex = /(thực tế|thực tiễn|đời sống|ứng dụng thực|bác\s+[A-ZÀ-Ỹ]|chú\s+[A-ZÀ-Ỹ]|cô\s+[A-ZÀ-Ỹ]|anh\s+[A-ZÀ-Ỹ]|chị\s+[A-ZÀ-Ỹ]|ông\s+[A-ZÀ-Ỹ]|bà\s+[A-ZÀ-Ỹ]|doanh nghiệp|công ty|nhà máy|phân xưởng|cửa hàng|tiệm|chủ tiệm|sản xuất|lợi nhuận|doanh thu|chi phí|kinh doanh|vốn đầu tư|nghìn đồng|triệu đồng|tỷ đồng|tiền lãi|lãi suất|tiền gửi|ngân hàng|mua bán|tiêu thụ|sản phẩm|ngọn hải đăng|hải đăng|chiều cao của tháp|bóng của tháp|chiều rộng khúc sông|hai bờ sông|hàng hải|tàu thủy|thuyền buồm|ca nô|xuồng|chiếc thuyền|khinh khí cầu|máy bay|bãi đỗ xe|thửa ruộng|khu đất|mảnh đất|mảnh vườn|bể bơi|hồ bơi|hồ nước|thùng chứa|bình chứa|bồn nước|hộp sữa|lon sữa|lon nước|hàng rào|rào chắn|xạ thủ|bắn bia|đo khoảng cách|góc nâng|góc hạ|giác kế|áp suất|nhiệt độ|quãng đường|vận tốc của xe|tiêu thụ nhiên liệu)/i;

  return realWorldRegex.test(combined);
}

/**
 * Chuẩn hóa và làm sạch chuỗi nhập đáp án Phần III (Trắc nghiệm trả lời ngắn):
 * - Chỉ cho phép các ký tự: chữ số (0-9), dấu '-' (chỉ ở đầu) và dấu ',' hoặc '.'
 * - Tối đa 4 ký tự theo quy định phiếu thi GDPT 2018
 */
export function sanitizeShortAnswerInput(val: string): string {
  if (!val) return '';
  // Xóa khoảng trắng
  let s = val.trim();
  // Giữ lại chỉ 0-9, '-', ',', '.'
  let clean = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch >= '0' && ch <= '9') {
      clean += ch;
    } else if (ch === '-' && clean.length === 0) {
      // Dấu âm chỉ được ở đầu
      clean += ch;
    } else if ((ch === ',' || ch === '.') && !clean.includes('.') && !clean.includes(',')) {
      // Chỉ cho phép 1 dấu ngăn cách thập phân
      clean += ch;
    }
  }
  return clean.slice(0, 4);
}

/**
 * Kiểm tra tính hợp lệ của đáp án Phần III theo chuẩn GDPT 2018:
 * - Tối đa 4 ký tự
 * - Phải là một số (kể cả số âm hoặc số thập phân)
 * - Không chứa chữ cái, công thức hoặc ký tự lạ
 */
export function validateShortAnswer(ans: string): { isValid: boolean; warning?: string } {
  const trimmed = String(ans || '').trim();
  if (!trimmed) {
    return { isValid: false, warning: 'Chưa nhập đáp án.' };
  }
  if (trimmed.length > 4) {
    return { 
      isValid: false, 
      warning: `Đáp án vượt quá 4 ký tự (${trimmed.length}/4 ký tự). Chuẩn phiếu thi GDPT 2018 chỉ cho phép tối đa 4 ký tự.` 
    };
  }
  // Kiểm tra có ký tự chữ cái hay công thức LaTeX
  if (/[a-zA-Z\\$]/.test(trimmed)) {
    return { 
      isValid: false, 
      warning: 'Đáp án Phần III chỉ chấp nhận MỘT SỐ cụ thể (0-9, dấu "-" và ","/"."), không chứa chữ cái hoặc công thức.' 
    };
  }
  // Kiểm tra cấu trúc số hợp lệ: ví dụ "22", "-3.5", "-3,5", "102", "13"
  const validNumberRegex = /^-?\d+([.,]\d+)?$/;
  if (!validNumberRegex.test(trimmed)) {
    return { 
      isValid: false, 
      warning: 'Định dạng số không hợp lệ (chỉ chấp nhận số nguyên hoặc số thập phân tối đa 4 ký tự như: 22, -3.5, 102).' 
    };
  }
  return { isValid: true };
}

/**
 * So sánh 2 đáp án Phần III (chấp nhận đồng nhất giữa dấu '.' và dấu ','):
 */
export function compareShortAnswers(userAns: string, correctAns: string): boolean {
  if (!userAns || !correctAns) return false;
  const normUser = String(userAns).trim().toLowerCase().replace(',', '.');
  const normCorrect = String(correctAns).trim().toLowerCase().replace(',', '.');
  if (normUser === normCorrect) return true;
  // So sánh giá trị số float nếu cả hai parse được
  const numUser = parseFloat(normUser);
  const numCorrect = parseFloat(normCorrect);
  if (!isNaN(numUser) && !isNaN(numCorrect)) {
    return Math.abs(numUser - numCorrect) < 0.0001;
  }
  return false;
}




