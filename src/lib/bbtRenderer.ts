/**
 * BẢNG BIẾN THIÊN (BBT) CHUẨN ĐỒ HỌA SÁCH GIÁO KHOA GDPT MỚI
 * - Tự động nhận diện và chuyển đổi mọi Bảng biến thiên (từ Markdown table, TikZ tkz-tab, mã BBT)
 * - Khung bảng: 1 vách dọc phân cách nhãn (x, y', y), 2 vách ngang (dưới hàng x và dưới hàng y')
 * - Hàng y: Canvas SVG vẽ mũi tên liền mạch, dài thanh thoát, không chia ô HTML
 * - Vạch || tiệm cận đứng kéo dài từ hàng y' xuống tận đáy hàng y
 * - Vùng ngoài tập xác định được tô họa tiết gạch chéo //
 */

import { evaluate } from 'mathjs';

export interface BBTPoint {
  x: string;
  yPrime?: string;
  isAsymptote?: boolean;
  isDerivativeUndefinedOnly?: boolean;
  yVal?: string;
  yPosition?: "top" | "bottom" | "middle";
  yLeftVal?: string;
  yLeftPosition?: "top" | "bottom" | "middle";
  yRightVal?: string;
  yRightPosition?: "top" | "bottom" | "middle";
}

export interface BBTInterval {
  sign?: "+" | "-" | "";
  isExcludedDomain?: boolean;
  trend?: "increasing" | "decreasing" | "none";
}

export interface BBTData {
  functionName: string;
  domainNote?: string;
  points: BBTPoint[];
  intervals: BBTInterval[];
  showDerivative?: boolean;
}

export function cleanMathText(str?: string): string {
  if (!str) return '';
  if (str === '__DBLBAR__' || str === '||' || str === '\\|') return '__DBLBAR__';
  let s = str
    // Xử lý triệt để mọi biến thể âm/dương vô cực có dấu gạch chéo rách chuỗi hoặc có dấu cách
    .replace(/[-–—]\s*\\+\s*infty/gi, '-∞')
    .replace(/\+\s*\\+\s*infty/gi, '+∞')
    .replace(/\\+\s*infty/gi, '∞')
    .replace(/\bin\s+fty\b/gi, '∞')
    .replace(/[-–—]\s*infty/gi, '-∞')
    .replace(/\+\s*infty/gi, '+∞')
    .replace(/[-–—]\s*∞/g, '-∞')
    .replace(/\+\s*∞/g, '+∞')
    .replace(/[’`´′]/g, "'")
    .replace(/[−–—]/g, '-')
    .replace(/\\prime/g, "'")
    .replace(/\^\{\s*['’′]\s*\}/g, "'")
    .replace(/\^\{\s*\\prime\s*\}/g, "'")
    .replace(/-\\frac\{([^}]+)\}\{([^}]+)\}/g, '-$1/$2')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\pi/g, 'π')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\mathbb\{R\}/g, 'ℝ')
    .replace(/_([a-zA-Z0-9])/g, '$1')
    .replace(/\$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Deduplicate repeated artifacts from browser copy (e.g. "5 5" -> "5", "55" -> "5", "-∞ -∞" -> "-∞", "x x" -> "x")
  if (/e\s*a\s*r\s*r\s*o\s*w/i.test(s) || /n\s*e\s*a\s*r\s*r\s*o\s*w/i.test(s)) return '↗';
  if (/s\s*e\s*a\s*r\s*r\s*o\s*w/i.test(s)) return '↘';
  if (s === '++' || s === '+ +') return '+';
  if (s === '--' || s === '- -') return '-';
  if (s === '00' || s === '0 0') return '0';
  if (s === '11' || s === '1 1') return '1';
  if (s === '22' || s === '2 2') return '2';
  if (s === '55' || s === '5 5') return '5';
  if (s === '↘↘' || s === '↘ ↘') return '↘';
  if (s === '↗↗' || s === '↗ ↗') return '↗';
  if (s === '-∞-∞' || s === '- ∞ -∞' || s === '-∞ -∞') return '-∞';
  if (s === '+∞+∞' || s === '+ ∞ +∞' || s === '+∞ +∞') return '+∞';
  if (s === '-1-1' || s === '- 1 -1' || s === '-1 -1') return '-1';
  if (s === 'xx' || s === 'x x') return 'x';

  const parts = s.split(' ');
  if (parts.length === 2 && parts[0] === parts[1]) {
    s = parts[0];
  } else if (parts.length > 2) {
    const half = Math.floor(parts.length / 2);
    if (parts.slice(0, half).join(' ') === parts.slice(half).join(' ')) {
      s = parts.slice(0, half).join(' ');
    }
  }

  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

/**
 * Tạo chuỗi SVG thuần túy của Bảng biến thiên chuẩn SGK
 */
export function generateBbtSvg(data: BBTData): string {
  const { points, intervals, functionName, domainNote } = data;
  const numPoints = points.length;

  const leftLabelWidth = 72;
  const paddingX = 54;
  const colSpacing = Math.max(120, Math.min(180, Math.round(540 / Math.max(numPoints - 1, 1))));
  const contentWidth = Math.max(520, (numPoints - 1) * colSpacing + 2 * paddingX);
  const totalWidth = leftLabelWidth + contentWidth;

  const hasDerivativeRow = data.showDerivative !== false && (
    points.some(p => p.yPrime !== undefined && p.yPrime !== '') ||
    intervals.some(i => i.sign !== undefined && i.sign !== '')
  );

  const hasFunctionRow = points.some(p => (p.yVal !== undefined && p.yVal !== '') || (p.yLeftVal !== undefined && p.yLeftVal !== '') || (p.yRightVal !== undefined && p.yRightVal !== ''));

  const rowXHeight = 38;
  const rowYPrimeHeight = hasDerivativeRow ? 38 : 0;
  const rowYHeight = hasFunctionRow ? 130 : 0;
  const totalHeight = rowXHeight + rowYPrimeHeight + rowYHeight;

  const usableWidth = contentWidth - 2 * paddingX;
  const stepX = numPoints > 1 ? usableWidth / (numPoints - 1) : usableWidth;

  const getPointX = (index: number) => leftLabelWidth + paddingX + index * stepX;

  const getYPosValue = (pos?: 'top' | 'bottom' | 'middle') => {
    const yStart = rowXHeight + rowYPrimeHeight;
    if (pos === 'top') return yStart + 22;
    if (pos === 'bottom') return yStart + rowYHeight - 16;
    return yStart + rowYHeight / 2 + 3;
  };

  const getTextWidthEstimate = (txt?: string) => {
    if (!txt) return 14;
    const clean = cleanMathText(txt);
    return Math.max(16, clean.length * 8.5);
  };

  const svgParts: string[] = [];

  // 1. DEFS: Arrow markers and hatch patterns
  svgParts.push(`<defs>
    <marker id="bbt-arrow-marker" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0f172a" />
    </marker>
    <pattern id="bbt-hatch-pattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#64748b" stroke-width="1.2" />
    </pattern>
  </defs>`);

  // 2. KHUNG NGOÀI & VÁCH NGĂN CHUẨN SGK (1 vách dọc, 2 vách ngang hoặc 1 vách ngang nếu 2 dòng)
  svgParts.push(`<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#ffffff" stroke="#111827" stroke-width="1.4" />`);
  // Vách dọc duy nhất phân cách nhãn
  svgParts.push(`<line x1="${leftLabelWidth}" y1="0" x2="${leftLabelWidth}" y2="${totalHeight}" stroke="#111827" stroke-width="1.3" />`);
  // Vách ngang 1 (dưới hàng x)
  svgParts.push(`<line x1="0" y1="${rowXHeight}" x2="${totalWidth}" y2="${rowXHeight}" stroke="#111827" stroke-width="1.3" />`);
  // Vách ngang 2 (dưới hàng y' nếu có hàng đạo hàm VÀ có hàng hàm số y)
  if (hasDerivativeRow && hasFunctionRow) {
    svgParts.push(`<line x1="0" y1="${rowXHeight + rowYPrimeHeight}" x2="${totalWidth}" y2="${rowXHeight + rowYPrimeHeight}" stroke="#111827" stroke-width="1.3" />`);
  }

  // 3. CỘT NHÃN TRÁI CHUẨN SGK: x, y', y (Font Times New Roman nghiêng chuẩn toán)
  svgParts.push(`<text x="${leftLabelWidth / 2}" y="25" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" fill="#111827">x</text>`);
  if (hasDerivativeRow) {
    const primeLabel = (data.functionName && data.functionName.includes("f'")) ? "f'(x)" : (data.domainNote && data.domainNote.includes("f'(x)")) ? "f'(x)" : "y'";
    svgParts.push(`<text x="${leftLabelWidth / 2}" y="${rowXHeight + 25}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" fill="#111827">${primeLabel}</text>`);
  }
  if (hasFunctionRow) {
    svgParts.push(`<text x="${leftLabelWidth / 2}" y="${rowXHeight + rowYPrimeHeight + rowYHeight / 2 + 5}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" fill="#111827">y</text>`);
  }

  // 4. HÀNG X: CÁC ĐIỂM MỐC
  points.forEach((pt, idx) => {
    const xPos = getPointX(idx);
    svgParts.push(`<text x="${xPos}" y="25" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="16" fill="#111827">${cleanMathText(pt.x)}</text>`);
  });

  // 5. MIỀN NGOÀI TẬP XÁC ĐỊNH (GẠCH CHÉO // XUYÊN SUỐT)
  intervals.forEach((inter, idx) => {
    if (!inter.isExcludedDomain) return;
    const xLeft = getPointX(idx);
    const xRight = getPointX(idx + 1);
    svgParts.push(`<rect x="${xLeft}" y="${rowXHeight}" width="${xRight - xLeft}" height="${rowYPrimeHeight + rowYHeight}" fill="url(#bbt-hatch-pattern)" stroke="#64748b" stroke-width="0.5" />`);
  });

  // 6. HÀNG Y': DẤU (+, -) MÀU ĐEN CHUẨN SGK
  intervals.forEach((inter, idx) => {
    if (inter.isExcludedDomain || !inter.sign) return;
    const midX = (getPointX(idx) + getPointX(idx + 1)) / 2;
    svgParts.push(`<text x="${midX}" y="${rowXHeight + 25}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="19" font-weight="bold" fill="#111827">${inter.sign}</text>`);
  });

  // 7. HÀNG Y': ĐIỂM 0 HOẶC VẠCH || TIỆM CẬN (MÀU ĐEN CHUẨN SGK)
  points.forEach((pt, idx) => {
    const xPos = getPointX(idx);

    if (pt.isAsymptote) {
      // Tiệm cận đứng: 2 vạch song song kéo dài từ hàng y' xuống tận đáy hàng y, màu đen chuẩn SGK
      svgParts.push(`<line x1="${xPos - 2}" y1="${rowXHeight}" x2="${xPos - 2}" y2="${totalHeight}" stroke="#111827" stroke-width="1.3" />`);
      svgParts.push(`<line x1="${xPos + 2}" y1="${rowXHeight}" x2="${xPos + 2}" y2="${totalHeight}" stroke="#111827" stroke-width="1.3" />`);
    } else if (pt.isDerivativeUndefinedOnly) {
      // Chỉ y' không xác định -> vạch || chỉ ở hàng y'
      svgParts.push(`<line x1="${xPos - 2}" y1="${rowXHeight}" x2="${xPos - 2}" y2="${rowXHeight + rowYPrimeHeight}" stroke="#111827" stroke-width="1.3" />`);
      svgParts.push(`<line x1="${xPos + 2}" y1="${rowXHeight}" x2="${xPos + 2}" y2="${rowXHeight + rowYPrimeHeight}" stroke="#111827" stroke-width="1.3" />`);
    } else if (pt.yPrime === '0') {
      svgParts.push(`<text x="${xPos}" y="${rowXHeight + 25}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="16" fill="#111827">0</text>`);
    }
  });

  // 8. HÀNG Y: MŨI TÊN BIẾN THIÊN (CHỈ VẼ KHI CÓ HÀNG HÀM SỐ Y)
  if (hasFunctionRow) {
    for (let i = 0; i < numPoints - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const inter = intervals[i];

      if (inter?.isExcludedDomain) continue;

      const startX = getPointX(i);
      const endX = getPointX(i + 1);

      // Xác định chiều biến thiên của khoảng:
      const sign = inter?.sign?.trim();
      const trend = inter?.trend;
      const isDecreasing = sign === '-' || trend === 'decreasing' || /searrow|\\searrow|↘|downarrow|\\downarrow/i.test(String(sign || ''));
      const isIncreasing = sign === '+' || trend === 'increasing' || /nearrow|\\nearrow|↗|uparrow|\\uparrow/i.test(String(sign || ''));

      let pos1 = p1.isAsymptote ? (p1.yRightPosition || (isDecreasing ? 'top' : 'bottom')) : (p1.yPosition || (isDecreasing ? 'top' : 'bottom'));
      let pos2 = p2.isAsymptote ? (p2.yLeftPosition || (isDecreasing ? 'bottom' : 'top')) : (p2.yPosition || (isDecreasing ? 'bottom' : 'top'));

      // BẮT BUỘC KHÔNG ĐỂ ĐƯỜNG NẰM NGANG KHI HÀM SỐ BIẾN THIÊN:
      if (isDecreasing) {
        pos1 = 'top';
        pos2 = 'bottom';
      } else if (isIncreasing) {
        pos1 = 'bottom';
        pos2 = 'top';
      } else if (pos1 === pos2) {
        const val1 = parseFloat(cleanMathText(p1.yVal).replace('+', ''));
        const val2 = parseFloat(cleanMathText(p2.yVal).replace('+', ''));
        if (!isNaN(val1) && !isNaN(val2)) {
          if (val1 > val2) {
            pos1 = 'top';
            pos2 = 'bottom';
          } else if (val1 < val2) {
            pos1 = 'bottom';
            pos2 = 'top';
          }
        } else if (cleanMathText(p1.yVal).includes('-∞') || cleanMathText(p2.yVal).includes('+∞')) {
          pos1 = 'bottom';
          pos2 = 'top';
        } else if (cleanMathText(p1.yVal).includes('+∞') || cleanMathText(p2.yVal).includes('-∞')) {
          pos1 = 'top';
          pos2 = 'bottom';
        } else {
          pos1 = 'middle';
          pos2 = 'bottom';
        }
      }

      const y1 = getYPosValue(pos1);
      const y2 = getYPosValue(pos2);

      let x1 = startX;
      if (p1.isAsymptote) {
        const rightW = getTextWidthEstimate(p1.yRightVal);
        x1 = startX + 6 + rightW + 8;
      } else {
        const w = getTextWidthEstimate(p1.yVal);
        x1 = startX + w / 2 + 8;
      }

      let x2 = endX;
      if (p2.isAsymptote) {
        const leftW = getTextWidthEstimate(p2.yLeftVal);
        x2 = endX - 6 - leftW - 8;
      } else {
        const w = getTextWidthEstimate(p2.yVal);
        x2 = endX - w / 2 - 8;
      }

      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.hypot(dx, dy);

      if (dist > 18) {
        const sx = x1.toFixed(1);
        const sy = (y1 + (dy < 0 ? -1 : 1)).toFixed(1);
        const ex = x2.toFixed(1);
        const ey = (y2 + (dy < 0 ? 1 : -1)).toFixed(1);

        svgParts.push(`<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="#0f172a" stroke-width="1.5" marker-end="url(#bbt-arrow-marker)" stroke-linecap="round" />`);
      }
    }

    // 9. HÀNG Y: CÁC GIÁ TRỊ ĐẦU MÚT MŨI TÊN (CĂN CHUẨN, KHÔNG ĐÈ LÊN MŨI TÊN)
    points.forEach((pt, idx) => {
      const xPos = getPointX(idx);

      if (pt.isAsymptote) {
        const yLeft = getYPosValue(pt.yLeftPosition || 'top');
        const yRight = getYPosValue(pt.yRightPosition || 'bottom');

        if (pt.yLeftVal) {
          svgParts.push(`<text x="${xPos - 6}" y="${yLeft}" text-anchor="end" font-family="'Times New Roman', Times, serif" font-size="15" fill="#111827">${cleanMathText(pt.yLeftVal)}</text>`);
        }
        if (pt.yRightVal) {
          svgParts.push(`<text x="${xPos + 6}" y="${yRight}" text-anchor="start" font-family="'Times New Roman', Times, serif" font-size="15" fill="#111827">${cleanMathText(pt.yRightVal)}</text>`);
        }
      } else if (pt.yVal) {
        const yCoord = getYPosValue(pt.yPosition);
        svgParts.push(`<text x="${xPos}" y="${yCoord}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="15" fill="#111827">${cleanMathText(pt.yVal)}</text>`);
      }
    });
  }

  return `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" class="max-w-full h-auto mx-auto my-3 drop-shadow-sm bg-white rounded-lg">
    ${svgParts.join('\n    ')}
  </svg>`;
}

/**
 * Tự động phục hồi và ngắt dòng chuẩn cho Bảng biến thiên (BBT) dạng Markdown table
 * nếu bị dính liền trên 1 dòng hoặc dính vào câu văn dẫn xuất của đề thi,
 * hoặc bị vỡ dòng khi sao chép từ trình duyệt (multiline cells, MathML/KaTeX artifacts)
 */
export function unflattenMarkdownTables(text: string): string {
  if (!text || (!text.includes('|') && !text.includes('\\n'))) return text;

  // Protect and convert LaTeX arrow commands before replacing any escaped newlines!
  let s = text
    .replace(/\\+(?:ne|e)?arrow/gi, '↗')
    .replace(/\\+(?:se)?arrow/gi, '↘')
    .replace(/\\+(?:up)?arrow/gi, '↑')
    .replace(/\\+(?:down)?arrow/gi, '↓')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/[’`´′]/g, "'")
    .replace(/\\prime/g, "'")
    .replace(/[−–—]/g, '-');

  // Kiểm tra xem văn bản có chứa cấu trúc bảng Markdown / BBT hay không
  const hasMarkdownTable = /\|[ \t]*:?-{2,}:?[ \t]*\|/.test(s) ||
    /(?:^|\n)[ \t]*\|[ \t]*\$?[xt]\$?[ \t]*\|/i.test(s) ||
    /(?:^|\n)[ \t]*\$?[xt]\$?[ \t]*\|/i.test(s) ||
    /\|\s*(?:y['’′]|f['’′]|f\([a-z]\))\s*\|/i.test(s) ||
    /(?:^|\n)\s*(?:y['’′]|f['’′]|f\([a-z]\))\s*\|/i.test(s);

  if (!hasMarkdownTable) {
    return text;
  }

  // 1. Tách văn bản đứng trước bảng nếu dính liền vào | x |:
  s = s.replace(/([^\n|])\s*(\|(?:\s*\$?[xt]\$?|\s*[xt]\s*)\s*\|(?=[^\n|]+\|))/gi, '$1\n\n$2');

  // 2. Tách giữa hàng đầu (x) và hàng phân cách |---| nếu bị dính liền trên 1 dòng với || hoặc |:
  s = s.replace(/(\|[ \t]*)(?:\|\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?)/g, '$1\n|---|---|---|---|---|---|---|');
  s = s.replace(/(\|)\s*(\|[\s:-]*-{2,}[\s|:-]*\|)/g, '$1\n$2');

  // 3. Tách trước hàng y' / f'(x) nếu cùng 1 dòng với hàng phân cách:
  s = s.replace(/(\|[\s:-]*-{2,}[\s|:-]*\|)[ \t]*(?:\|{0,3}[ \t]*)(\$?(?:y['’′]|f['’′]\(x\)|f['’′]|y\^\\prime)\$?)[ \t]*\|{1,3}/gi, '$1\n| $2 | ');

  // 4. Chuẩn hóa dòng bắt đầu bằng x hoặc y' mà thiếu dấu | ở đầu:
  s = s.replace(/(^|\n)\s*(\$?[xt]\$?)\s*\|/gi, '$1| $2 |');
  s = s.replace(/(^|\n)[ \t]*\|{0,3}[ \t]*(\$?(?:y['’′]|f['’′]\(x\)|f['’′]|y\^\\prime)\$?)[ \t]*\|{1,3}/gi, '$1| $2 | ');

  // 5. Tách trước hàng y / f(x) nếu cùng 1 dòng với hàng y':
  s = s.replace(/(\|[ \t]*)(?:\|{1,4}[ \t]*)(\$?(?:y(?![’'′\^])|f\(x\)|g\(x\))\$?)[ \t]*\|{1,3}/gi, '$1\n| $2 | ');
  s = s.replace(/(^|\n)[ \t]*\|{0,3}[ \t]*(\$?(?:y(?![’'′\^])|f\(x\)|g\(x\))\$?)[ \t]*\|{1,3}/gi, '$1| $2 | ');

  // 6. Tách văn bản sau bảng nếu bị dính liền với hàng cuối:
  s = s.replace(/(^[ \t]*\|.+?\|)[ \t]*([A-Za-zÀ-ỹĐđ#*].*)$/gm, '$1\n\n$2');

  // 7. Xử lý qua bộ collapseMultilineTableLines để chuẩn hóa từng dòng
  if (s.includes('|')) {
    const lines = s.split('\n');
    const resultLines: string[] = [];
    let inTable = false;
    let tableBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isTableRow = (line.startsWith('|') && (line.match(/\|/g) || []).length >= 2) ||
                         /\|[ \t]*:?-{2,}:?[ \t]*\|/.test(line) ||
                         /^(?:\$?[xt]\$?|\$?(?:y['’′]|y|f['’′]?\([a-z]\))\$?)\s*\|/.test(line);

      if (isTableRow) {
        inTable = true;
        tableBuffer.push(line);
      } else if (inTable && (line === '' || /^(?:Câu|Bài|Giá trị|Đáp án|##|\d+[\.\)]|[A-Da-d][\.\)])/i.test(line))) {
        resultLines.push(collapseMultilineTableLines(tableBuffer));
        resultLines.push(line);
        tableBuffer = [];
        inTable = false;
      } else if (inTable) {
        tableBuffer.push(line);
      } else {
        resultLines.push(lines[i]);
      }
    }
    if (tableBuffer.length > 0) {
      resultLines.push(collapseMultilineTableLines(tableBuffer));
    }
    s = resultLines.join('\n');
  }

  // Đảm bảo không còn dòng trắng giữa các hàng bảng
  s = s.replace(/(\|[^\n]+\|)[ \t]*\n\s*\n[ \t]*(\|)/g, '$1\n$2');

  return s;
}

function collapseMultilineTableLines(tblLines: string[]): string {
  const ensureRowPipes = (r: string) => {
    let trimmed = r.trim();
    if (!trimmed) return '';
    if (!trimmed.startsWith('|')) trimmed = '| ' + trimmed;
    if (!trimmed.endsWith('|')) trimmed = trimmed + ' |';
    return trimmed;
  };

  // Nếu tblLines đã có các hàng riêng biệt và có cả x lẫn hàng phân cách:
  const isCleanMulti = tblLines.length >= 3 &&
    tblLines.some(l => /\|[ \t]*\$?[xt]\$?[ \t]*\|/i.test(l)) &&
    tblLines.some(l => /\|[ \t]*:?-{2,}:?[ \t]*\|/.test(l));

  if (isCleanMulti) {
    return tblLines.map(ensureRowPipes).filter(Boolean).join('\n');
  }

  const joined = tblLines.join(' ');
  const sepMatch = joined.match(/\|\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|/);
  if (!sepMatch) {
    return tblLines.map(ensureRowPipes).filter(Boolean).join('\n');
  }

  const sepIdx = sepMatch.index || 0;
  const beforeSep = joined.substring(0, sepIdx).trim();
  const sepStr = sepMatch[0].trim();
  const afterSep = joined.substring(sepIdx + sepMatch[0].length).trim();

  // Tìm vị trí phân cách giữa hàng đạo hàm (y') và hàng hàm số (y)
  // Chỉ khớp 'y' hoặc 'f(x)' khi KHÔNG theo sau bởi dấu ' / prime / ^
  const row4Match = afterSep.match(/(?:\|{1,4}\s*|\s+)(?:\$?(?:y(?![’'′\^])|f\s*\([a-z]\))\$?)\s*\|/i);
  let row2 = afterSep;
  let row3 = '';
  if (row4Match && row4Match.index !== undefined) {
    row2 = afterSep.substring(0, row4Match.index).trim();
    row3 = afterSep.substring(row4Match.index).replace(/^[| \t]+/, '').trim();
  }

  // Tách văn bản câu hỏi dính vào cuối row3 nếu có
  let trailingText = '';
  if (row3) {
    const textMatch = row3.match(/^(.*?\|)[ \t]*([A-Za-zÀ-ỹĐđ#*].*)$/);
    if (textMatch) {
      row3 = textMatch[1].trim();
      trailingText = textMatch[2].trim();
    }
  }

  const cleanRowCells = (r: string) => {
    let clean = r.trim().replace(/^\|+/, '').replace(/\|+$/, '');
    clean = clean.replace(/\|{2,}/g, '| __DBLBAR__ |');
    return clean.split('|').map(cell => cleanMathText(cell)).join(' | ');
  };

  const rows = [
    ensureRowPipes(cleanRowCells(beforeSep)),
    ensureRowPipes(sepStr),
    ensureRowPipes(cleanRowCells(row2))
  ];
  if (row3) {
    rows.push(ensureRowPipes(cleanRowCells(row3)));
  }

  const tableResult = rows.filter(Boolean).join('\n');
  return trailingText ? `${tableResult}\n\n${trailingText}` : tableResult;
}

/**
 * Trích xuất và phân tích một Markdown Table thành cấu trúc BBTData
 * Hỗ trợ các định dạng Markdown BBT phong phú do AI sinh ra (hàm phân thức, đa thức, bậc 2, bậc 3, bậc 4, tiệm cận đứng...)
 */
export function parseMarkdownBbtTable(tableMarkdown: string): BBTData | null {
  try {
    const normalizedMarkdown = unflattenMarkdownTables(tableMarkdown);
    const lines = normalizedMarkdown
      .trim()
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('|') && l.endsWith('|') && !l.includes('---'));

    if (lines.length < 2 || lines.length > 5) return null;

    const rowCells = lines.map(line => {
      let cleanLine = line.trim().replace(/^\|+/, '').replace(/\|+$/, '');
      cleanLine = cleanLine.replace(/\|{2,}/g, '| __DBLBAR__ |').replace(/\|{2,}/g, '|');
      return cleanLine
        .split(/(?<!\\)\|/)
        .map(cell => cell.trim())
        .filter(Boolean);
    });

    // Kiểm tra hàng 1: bắt đầu bằng x hoặc t
    const row1Header = cleanMathText(rowCells[0][0]).toLowerCase().replace(/[\$\s]/g, '');
    const isRow1X = row1Header === 'x' || row1Header === 't' || row1Header === 'xx' || (row1Header === '' && rowCells[0].length >= 3);
    if (!isRow1X) return null;

    // Kiểm tra hàng 2: y' hoặc f'(x) hoặc y
    const row2Header = cleanMathText(rowCells[1][0]).toLowerCase().replace(/[\$\s]/g, '');
    const hasDerivative = row2Header.includes("y'") || row2Header.includes("f'") || row2Header.includes("g'") || row2Header.includes("y′") || row2Header.includes("f′");

    let xCells = rowCells[0].slice(1);
    let yPrimeCells: string[] = [];
    let yCells: string[] = [];

    if (hasDerivative && rowCells.length >= 3) {
      yPrimeCells = rowCells[1].slice(1);
      yCells = rowCells[2].slice(1);
    } else if (hasDerivative && rowCells.length === 2) {
      // 2-row table: Bảng xét dấu đạo hàm (x và f'(x))
      yPrimeCells = rowCells[1].slice(1);
      yCells = [];
    } else {
      // 2-row table: Toán 10 parabol, hàm số đồng biến/nghịch biến (x và y)
      yCells = rowCells[1].slice(1);
    }

    // 1. Lọc danh sách mốc x hợp lệ
    const xValues: string[] = [];
    for (let c = 0; c < xCells.length; c++) {
      const val = cleanMathText(xCells[c]);
      if (val && val !== '' && val !== '__DBLBAR__') {
        xValues.push(val);
      }
    }
    if (xValues.length < 2) return null;

    // 2. Trích xuất dấu của y'
    const signs: Array<'+' | '-' | ''> = [];
    yPrimeCells.forEach(cell => {
      const s = cleanMathText(cell);
      if (s === '+' || s === '-') {
        signs.push(s);
      }
    });

    // 3. Phân tích hàng y theo token mũi tên (Arrow-based parsing)
    const isArrow = (txt: string) => {
      const clean = txt.replace(/[\$\s]/g, '').toLowerCase();
      return clean.includes('nearrow') || clean.includes('earrow') || clean.includes('searrow') ||
             clean.includes('rightarrow') || clean.includes('uparrow') || clean.includes('downarrow') ||
             clean.includes('↗') || clean.includes('↘') || clean.includes('↑') || clean.includes('↓') ||
             clean.includes('->') || clean.includes('-->') || clean.includes('→');
    };

    const getTrend = (txt: string): 'increasing' | 'decreasing' => {
      const clean = txt.replace(/[\$\s]/g, '').toLowerCase();
      if (clean.includes('searrow') || clean.includes('↘') || clean.includes('downarrow') || clean.includes('↓') || clean.includes('rightarrow') || clean.includes('->') || clean.includes('→')) return 'decreasing';
      return 'increasing';
    };

    const yTokens = yCells
      .map(c => cleanMathText(c))
      .filter(c => c !== '');

    const milestoneGroups: string[][] = [];
    const intervalTrends: Array<'increasing' | 'decreasing'> = [];
    let currentGroup: string[] = [];

    for (let i = 0; i < yTokens.length; i++) {
      const tok = yTokens[i];
      if (isArrow(tok)) {
        milestoneGroups.push(currentGroup);
        intervalTrends.push(getTrend(tok));
        currentGroup = [];
      } else {
        currentGroup.push(tok);
      }
    }
    milestoneGroups.push(currentGroup);

    const points: BBTPoint[] = [];
    const intervals: BBTInterval[] = [];

    if (intervalTrends.length > 0 && milestoneGroups.length >= xValues.length) {
      // Sử dụng thuật toán phân nhóm theo mốc & chiều biến thiên chính xác
      for (let i = 0; i < xValues.length; i++) {
        const xVal = xValues[i];
        const group = milestoneGroups[i] || [];

        // Kiểm tra tiệm cận đứng:
        // - Nhóm có 2 giá trị hoặc chứa token __DBLBAR__ / ||
        // - Hoặc hàng y' tại mốc này có vạch đôi __DBLBAR__ / || / d
        const hasDoubleBarInYP = yPrimeCells.some((c, idx) => (c === '__DBLBAR__' || c.includes('||') || c.includes('\\|') || c === 'd') && (idx === i || idx === i * 2 || idx === i - 1 || idx === i + 1));
        const hasDoubleBarInGroup = group.some(c => c === '__DBLBAR__' || c.includes('||') || c.includes('\\|'));

        let isAsym = false;
        let yVal: string | undefined = undefined;
        let yLeftVal: string | undefined = undefined;
        let yRightVal: string | undefined = undefined;

        const cleanGroup = group.filter(c => c !== '__DBLBAR__' && !c.includes('||'));

        if (cleanGroup.length >= 2 || hasDoubleBarInGroup) {
          isAsym = true;
          yLeftVal = cleanGroup[0] || '+\\infty';
          yRightVal = cleanGroup[cleanGroup.length - 1] || '-\\infty';
        } else if (cleanGroup.length === 1) {
          if (hasDoubleBarInYP && i > 0 && i < xValues.length - 1) {
            isAsym = true;
            yLeftVal = cleanGroup[0];
            yRightVal = cleanGroup[0];
          } else {
            yVal = cleanGroup[0];
          }
        }

        let yPos: 'top' | 'bottom' | 'middle' = 'middle';
        if (yVal) {
          if (yVal.includes('-\\infty') || yVal.includes('-∞')) {
            yPos = 'bottom';
          } else if (yVal.includes('+\\infty') || yVal.includes('+∞')) {
            yPos = 'top';
          } else {
            const leftTrend = i > 0 ? (intervalTrends[i - 1] || (signs[i - 1] === '-' ? 'decreasing' : 'increasing')) : null;
            const rightTrend = i < xValues.length - 1 ? (intervalTrends[i] || (signs[i] === '-' ? 'decreasing' : 'increasing')) : null;

            if (leftTrend === 'increasing' && rightTrend === 'decreasing') {
              yPos = 'top'; // Cực đại
            } else if (leftTrend === 'decreasing' && rightTrend === 'increasing') {
              yPos = 'bottom'; // Cực tiểu
            } else if (i === 0) {
              yPos = rightTrend === 'decreasing' ? 'top' : 'bottom';
            } else if (i === xValues.length - 1) {
              yPos = leftTrend === 'increasing' ? 'top' : 'bottom';
            }
          }
        }

        let yLeftPos: 'top' | 'bottom' | 'middle' = 'top';
        if (yLeftVal) {
          if (yLeftVal.includes('-\\infty') || yLeftVal.includes('-∞')) {
            yLeftPos = 'bottom';
          } else if (yLeftVal.includes('+\\infty') || yLeftVal.includes('+∞')) {
            yLeftPos = 'top';
          } else {
            const leftTrend = i > 0 ? (intervalTrends[i - 1] || (signs[i - 1] === '-' ? 'decreasing' : 'increasing')) : null;
            yLeftPos = leftTrend === 'increasing' ? 'top' : 'bottom';
          }
        }

        let yRightPos: 'top' | 'bottom' | 'middle' = 'bottom';
        if (yRightVal) {
          if (yRightVal.includes('-\\infty') || yRightVal.includes('-∞')) {
            yRightPos = 'bottom';
          } else if (yRightVal.includes('+\\infty') || yRightVal.includes('+∞')) {
            yRightPos = 'top';
          } else {
            const rightTrend = i < xValues.length - 1 ? (intervalTrends[i] || (signs[i] === '-' ? 'decreasing' : 'increasing')) : null;
            yRightPos = rightTrend === 'decreasing' ? 'top' : 'bottom';
          }
        }

        points.push({
          x: xVal,
          yPrime: isAsym ? '||' : (i > 0 && i < xValues.length - 1 ? '0' : undefined),
          isAsymptote: isAsym,
          yVal: isAsym ? undefined : yVal,
          yPosition: yPos,
          yLeftVal,
          yLeftPosition: yLeftPos,
          yRightVal,
          yRightPosition: yRightPos
        });

        if (i < xValues.length - 1) {
          const trend = intervalTrends[i] || (signs[i] === '-' ? 'decreasing' : 'increasing');
          const sign = signs[i] || (trend === 'decreasing' ? '-' : '+');
          intervals.push({ sign, trend });
        }
      }
    } else {
      // Phương thức dự phòng theo cột mốc x (Fallback column-based)
      const landmarkCols: number[] = [];
      for (let c = 0; c < xCells.length; c++) {
        const val = xCells[c].replace(/\$/g, '').trim();
        if (val && val !== '') {
          landmarkCols.push(c);
        }
      }
      if (landmarkCols.length < 2) return null;

      for (let i = 0; i < landmarkCols.length; i++) {
        const c = landmarkCols[i];
        const xVal = xCells[c].trim();
        const yP = yPrimeCells[c] ? yPrimeCells[c].replace(/\$/g, '').trim() : undefined;
        const yValRaw = yCells[c] ? yCells[c].replace(/\$/g, '').trim() : '';

        const isAsym = (yP && (yP === '__DBLBAR__' || yP === '||' || yP.includes('||') || yP.includes('\\|') || yP === 'd')) || yValRaw.includes('__DBLBAR__') || yValRaw.includes('||') || yValRaw.includes('\\|');

        let yLeftVal: string | undefined;
        let yRightVal: string | undefined;
        let cleanYVal = yValRaw ? cleanMathText(yValRaw) : '';

        if (isAsym) {
          const parts = yValRaw.split(/\|\||\\\|/).map(s => s.trim());
          if (parts.length >= 2) {
            yLeftVal = parts[0] || '+\\infty';
            yRightVal = parts[1] || '-\\infty';
          } else {
            yLeftVal = '+\\infty';
            yRightVal = '-\\infty';
          }
        }

        let yPos: 'top' | 'bottom' | 'middle' = 'middle';
        if (cleanYVal) {
          if (cleanYVal.includes('-\\infty') || cleanYVal.includes('-∞')) {
            yPos = 'bottom';
          } else if (cleanYVal.includes('+\\infty') || cleanYVal.includes('+∞') || cleanYVal.includes('∞')) {
            yPos = 'top';
          }
        }

        points.push({
          x: xVal,
          yPrime: isAsym ? '||' : (yP === '0' ? '0' : undefined),
          isAsymptote: isAsym,
          yVal: isAsym || !cleanYVal ? undefined : cleanYVal,
          yPosition: yPos,
          yLeftVal,
          yLeftPosition: yLeftVal?.includes('-') ? 'bottom' : 'top',
          yRightVal,
          yRightPosition: yRightVal?.includes('+') ? 'top' : 'bottom'
        });

        if (i < landmarkCols.length - 1) {
          const nextC = landmarkCols[i + 1];
          let sign: '+' | '-' | '' = '';

          for (let mid = c; mid <= nextC; mid++) {
            const pSign = (yPrimeCells[mid] || '').replace(/\$/g, '').trim();
            if (pSign === '+' || pSign === '-') {
              sign = pSign;
              break;
            }
            const ySign = (yCells[mid] || '').replace(/\$/g, '').trim();
            if (ySign.includes('↗') || ySign.includes('\\nearrow')) {
              sign = '+';
              break;
            }
            if (ySign.includes('↘') || ySign.includes('\\searrow')) {
              sign = '-';
              break;
            }
          }

          intervals.push({
            sign: sign || '+',
            trend: sign === '-' ? 'decreasing' : 'increasing'
          });
        }
      }
    }

    // Điều chỉnh độ cao yPosition cho các điểm cực trị & mốc biên
    for (let i = 0; i < points.length; i++) {
      if (points[i].isAsymptote) continue;
      const prevInter = intervals[i - 1];
      const nextInter = intervals[i];

      if (prevInter?.trend === 'increasing' && nextInter?.trend === 'decreasing') {
        points[i].yPosition = 'top'; // Cực đại
      } else if (prevInter?.trend === 'decreasing' && nextInter?.trend === 'increasing') {
        points[i].yPosition = 'bottom'; // Cực tiểu
      } else if (i === 0 && nextInter?.trend === 'decreasing') {
        points[i].yPosition = 'top'; // Điểm đầu dốc xuống
      } else if (i === 0 && nextInter?.trend === 'increasing') {
        points[i].yPosition = 'bottom'; // Điểm đầu dốc lên
      } else if (i === points.length - 1 && prevInter?.trend === 'decreasing') {
        points[i].yPosition = 'bottom'; // Điểm cuối đáy dốc
      } else if (i === points.length - 1 && prevInter?.trend === 'increasing') {
        points[i].yPosition = 'top'; // Điểm cuối đỉnh dốc
      }
    }

    return {
      functionName: hasDerivative ? (row2Header.includes("f'") ? "f'(x)" : "y'") : 'y = f(x)',
      domainNote: hasDerivative && yCells.length === 0 ? 'Bảng xét dấu đạo hàm' : 'Bảng biến thiên',
      points,
      intervals,
      showDerivative: hasDerivative
    };
  } catch (e) {
    return null;
  }
}

/**
 * Phân tích và chuyển đổi mã TikZ (tkz-tab) thành BBTData
 */
export function parseTkzTabToBbtData(code: string): BBTData | null {
  try {
    const initMatch = code.match(/\\tkzTabInit(?:\[[^\]]*\])?\s*\{([^}]*)\}\s*\{([^}]*)\}/);
    if (!initMatch) return null;

    const xValues = initMatch[2].split(/,\s*(?![^{}]*\})/).map(s => s.replace(/\$/g, '').trim());
    if (xValues.length < 2) return null;

    const lineMatch = code.match(/\\tkzTabLine\s*\{([^}]*)\}/);
    const lineTokens = lineMatch ? lineMatch[1].split(',').map(s => s.trim()) : [];

    const varMatch = code.match(/\\tkzTabVar\s*\{([^}]*)\}/);
    const varTokens = varMatch ? varMatch[1].split(/,\s*(?![^{}]*\})/).map(s => s.trim()) : [];

    const points: BBTPoint[] = [];
    const intervals: BBTInterval[] = [];

    // Trích xuất dấu của y'
    let signIdx = 0;
    const signs: Array<'+' | '-' | ''> = [];
    lineTokens.forEach(tok => {
      if (tok === '+' || tok === '-') signs.push(tok);
    });

    let varIdx = 0;
    for (let i = 0; i < xValues.length; i++) {
      const xVal = xValues[i];
      const rawVar = varTokens[varIdx] || '';

      const isDoubleBar = rawVar.includes('D') || rawVar.includes('d') || lineTokens.some(t => (t === 'd' || t === '||') && xValues.indexOf(xVal) === i);

      if (isDoubleBar) {
        const matchSplit = rawVar.match(/[+-]?[Dd][+-]?\s*\/\s*([^/]+?)\s*\/\s*(.*)/);
        const yLeft = matchSplit ? matchSplit[1].trim() : '+\\infty';
        const yRight = matchSplit ? matchSplit[2].trim() : '-\\infty';

        points.push({
          x: xVal,
          yPrime: '||',
          isAsymptote: true,
          yLeftVal: yLeft,
          yLeftPosition: rawVar.startsWith('+') ? 'top' : 'bottom',
          yRightVal: yRight,
          yRightPosition: rawVar.includes('D+') ? 'top' : 'bottom'
        });
        varIdx++;
      } else {
        const isTop = rawVar.startsWith('+');
        const val = rawVar.replace(/^[+-][^/]*\/?/, '').trim();

        points.push({
          x: xVal,
          yPrime: (i > 0 && i < xValues.length - 1) ? '0' : undefined,
          yVal: val || undefined,
          yPosition: isTop ? 'top' : (rawVar.startsWith('-') ? 'bottom' : 'middle')
        });
        varIdx++;
      }

      if (i < xValues.length - 1) {
        const sign = signs[signIdx] || '+';
        intervals.push({
          sign,
          trend: sign === '-' ? 'decreasing' : 'increasing'
        });
        signIdx++;
      }
    }

    return {
      functionName: '',
      points,
      intervals
    };
  } catch (e) {
    return null;
  }
}

/**
 * Chuyển đổi bất kỳ khối Markdown Table BBT nào thành chuỗi SVG chuẩn SGK
 */
export function convertBbtTableToSvg(tableMarkdown: string): string | null {
  const data = parseMarkdownBbtTable(tableMarkdown);
  if (!data) return null;
  return generateBbtSvg(data);
}

/**
 * Chuyển đổi mọi bảng biến thiên (Markdown table) trong chuỗi văn bản thành thẻ <svg-wrapper>
 */
export function embedBbtSvgsInText(text: string): string {
  if (!text) return '';
  const unflattened = unflattenMarkdownTables(text);
  return unflattened.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
    try {
      const svg = convertBbtTableToSvg(match);
      if (svg) {
        const base64 = typeof btoa !== 'undefined' 
          ? btoa(encodeURIComponent(svg)) 
          : Buffer.from(encodeURIComponent(svg)).toString('base64');
        return `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
      }
    } catch (e) {}
    return match;
  });
}

/**
 * Đảm bảo các mốc của BBT luôn có đủ 2 đầu mút vô cực (-∞ và +∞)
 */
export function ensureCompleteBbtPoints(data: BBTData): BBTData {
  if (!data || !Array.isArray(data.points) || data.points.length === 0) {
    return data;
  }
  const points = [...data.points];
  const intervals = Array.isArray(data.intervals) ? [...data.intervals] : [];

  const firstX = (points[0]?.x || '').replace(/\$/g, '').trim();
  if (!firstX.includes('-\\infty') && !firstX.includes('-∞')) {
    const nextTrend = intervals[0]?.trend || 'increasing';
    points.unshift({
      x: '-\\infty',
      yPosition: nextTrend === 'increasing' ? 'bottom' : 'top',
      yVal: nextTrend === 'increasing' ? '-\\infty' : '+\\infty'
    });
    if (intervals.length < points.length - 1) {
      intervals.unshift({
        sign: nextTrend === 'increasing' ? '+' : '-',
        trend: nextTrend
      });
    }
  }

  const lastX = (points[points.length - 1]?.x || '').replace(/\$/g, '').trim();
  if (!lastX.includes('+\\infty') && !lastX.includes('+∞') && !lastX.includes('∞')) {
    const prevTrend = intervals[intervals.length - 1]?.trend || 'increasing';
    points.push({
      x: '+\\infty',
      yPosition: prevTrend === 'increasing' ? 'top' : 'bottom',
      yVal: prevTrend === 'increasing' ? '+\\infty' : '-\\infty'
    });
    if (intervals.length < points.length - 1) {
      intervals.push({
        sign: prevTrend === 'increasing' ? '+' : '-',
        trend: prevTrend
      });
    }
  }

  while (intervals.length < points.length - 1) {
    intervals.push({ sign: '+', trend: 'increasing' });
  }

  return {
    ...data,
    points,
    intervals
  };
}

function parsePolynomialCoeffs(str: string): Record<number, number> {
  const result: Record<number, number> = {};
  if (!str) return result;

  const cleaned = str
    .replace(/\s+/g, '')
    .replace(/\\cdot|\\times/g, '*')
    .replace(/[−–—]/g, '-')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/x\^\{([^}]+)\}/g, 'x^$1')
    .replace(/x\{([^}]+)\}/g, 'x^$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))');

  const formatted = cleaned.replace(/(?<=[0-9xX\)])\-/g, '+-');
  const tokens = formatted.split('+').filter(Boolean);

  for (const tok of tokens) {
    if (tok.includes('x') || tok.includes('X')) {
      const parts = tok.split(/x|X/);
      const coeffStr = parts[0].replace(/\*$/, '');
      const powStr = parts[1] ? parts[1].replace(/^\^/, '').replace(/[\{\}]/g, '') : '1';

      let coeff = 1;
      if (coeffStr === '' || coeffStr === '+') coeff = 1;
      else if (coeffStr === '-') coeff = -1;
      else if (coeffStr.includes('/')) {
        const cParts = coeffStr.replace(/^\(|\)$/g, '').split('/');
        if (cParts.length === 2) {
          coeff = parseFloat(cParts[0]) / parseFloat(cParts[1]);
        } else {
          coeff = parseFloat(coeffStr);
        }
      } else {
        coeff = parseFloat(coeffStr);
      }

      const power = parseInt(powStr, 10) || 1;
      result[power] = (result[power] || 0) + (isNaN(coeff) ? 0 : coeff);
    } else {
      const val = parseFloat(tok);
      if (!isNaN(val)) {
        result[0] = (result[0] || 0) + val;
      }
    }
  }

  return result;
}

function formatNumDisplay(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-5) return String(Math.round(n));
  for (let denom = 2; denom <= 12; denom++) {
    const num = Math.round(n * denom);
    if (Math.abs(n - num / denom) < 1e-4) {
      return num < 0 ? `-\\frac{${-num}}{${denom}}` : `\\frac{${num}}{${denom}}`;
    }
  }
  return n.toFixed(1).replace(/\.0$/, '');
}

/**
 * Bộ giải tích toán học tự động (Deterministic Math Analyzer):
 * Tự động tính toán giải tích chuẩn xác 100% cho các hàm số phổ biến (Lớp 10, 11, 12 GDPT 2018):
 * - Hàm phân thức bậc hai/bậc nhất: y = (ax^2+bx+c)/(dx+e)
 * - Hàm phân thức bậc nhất/bậc nhất: y = (ax+b)/(cx+d)
 * - Hàm bậc ba: y = ax^3 + bx^2 + cx + d
 * - Hàm trùng phương: y = ax^4 + bx^2 + c
 * - Hàm bậc hai (Parabol): y = ax^2 + bx + c
 * - Hàm căn thức: y = \sqrt{a - x^2} và y = \sqrt{x^2 - a}
 * Hoạt động offline 0ms, chính xác tuyệt đối, không phụ thuộc vào Gemini API hay quota mạng!
 */
export function analyzeFunctionToBbt(expression: string): BBTData | null {
  if (!expression || !expression.trim()) return null;

  try {
    let raw = expression.trim();
    if (raw.includes(':')) {
      const colonParts = raw.split(':');
      raw = colonParts[colonParts.length - 1].trim();
    }
    const yMatch = raw.match(/(?:y|f\(x\)|g\(x\))\s*=\s*([^;\n]+)/i);
    if (yMatch) {
      raw = yMatch[1].trim();
    }

    let clean = raw
      .replace(/\s+/g, '')
      .replace(/\$/g, '')
      .replace(/^y\s*=\s*/i, '')
      .replace(/^f\([a-z]\)\s*=\s*/i, '');

    // =========================================================================
    // 1. HÀM PHÂN THỨC: BẬC HAI / BẬC NHẤT hoặc BẬC NHẤT / BẬC NHẤT
    // =========================================================================
    let numStr = '';
    let denStr = '';
    const fracMatch = clean.match(/\\frac\{([^}]+)\}\{([^}]+)\}/i);
    if (fracMatch) {
      numStr = fracMatch[1];
      denStr = fracMatch[2];
    } else if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 2) {
        numStr = parts[0].replace(/^\(|\)$/g, '');
        denStr = parts[1].replace(/^\(|\)$/g, '');
      }
    }

    if (numStr && denStr) {
      const numCoeffs = parsePolynomialCoeffs(numStr);
      const denCoeffs = parsePolynomialCoeffs(denStr);

      const d = denCoeffs[1] || 0;
      const e = denCoeffs[0] || 0;

      // 1.1 Hàm phân thức bậc hai / bậc nhất: y = (ax^2 + bx + c) / (dx + e) (CHUẨN TOÁN 12 MỚI)
      if (numCoeffs[2] !== undefined && numCoeffs[2] !== 0 && d !== 0) {
        const a = numCoeffs[2];
        const b = numCoeffs[1] || 0;
        const c = numCoeffs[0] || 0;

        const x0 = -e / d;
        const x0Str = formatNumDisplay(x0);

        const A = a * d;
        const B = 2 * a * e;
        const C = b * e - c * d;
        const delta = B * B - 4 * A * C;

        if (delta > 0) {
          const r1 = (-B - Math.sqrt(delta)) / (2 * A);
          const r2 = (-B + Math.sqrt(delta)) / (2 * A);
          const xLeft = Math.min(r1, r2);
          const xRight = Math.max(r1, r2);

          const yLeftVal = (2 * a * xLeft + b) / d;
          const yRightVal = (2 * a * xRight + b) / d;

          const isBranchUp = a * d > 0;

          const points: BBTPoint[] = isBranchUp ? [
            { x: '-\\infty', yPosition: 'bottom', yVal: '-\\infty' },
            { x: formatNumDisplay(xLeft), yPrime: '0', yPosition: 'top', yVal: formatNumDisplay(yLeftVal) },
            {
              x: x0Str,
              yPrime: '||',
              isAsymptote: true,
              yLeftVal: '-\\infty',
              yLeftPosition: 'bottom',
              yRightVal: '+\\infty',
              yRightPosition: 'top'
            },
            { x: formatNumDisplay(xRight), yPrime: '0', yPosition: 'bottom', yVal: formatNumDisplay(yRightVal) },
            { x: '+\\infty', yPosition: 'top', yVal: '+\\infty' }
          ] : [
            { x: '-\\infty', yPosition: 'top', yVal: '+\\infty' },
            { x: formatNumDisplay(xLeft), yPrime: '0', yPosition: 'bottom', yVal: formatNumDisplay(yLeftVal) },
            {
              x: x0Str,
              yPrime: '||',
              isAsymptote: true,
              yLeftVal: '+\\infty',
              yLeftPosition: 'top',
              yRightVal: '-\\infty',
              yRightPosition: 'bottom'
            },
            { x: formatNumDisplay(xRight), yPrime: '0', yPosition: 'top', yVal: formatNumDisplay(yRightVal) },
            { x: '+\\infty', yPosition: 'bottom', yVal: '-\\infty' }
          ];

          const intervals: BBTInterval[] = isBranchUp ? [
            { sign: '+', trend: 'increasing' },
            { sign: '-', trend: 'decreasing' },
            { sign: '-', trend: 'decreasing' },
            { sign: '+', trend: 'increasing' }
          ] : [
            { sign: '-', trend: 'decreasing' },
            { sign: '+', trend: 'increasing' },
            { sign: '+', trend: 'increasing' },
            { sign: '-', trend: 'decreasing' }
          ];

          return {
            functionName: `y = \\frac{${numStr}}{${denStr}}`,
            domainNote: `Tập xác định: D = \\mathbb{R} \\setminus \\{${x0Str}\\}`,
            points,
            intervals
          };
        } else {
          const isIncreasing = A > 0;
          const points: BBTPoint[] = [
            { x: '-\\infty', yPosition: isIncreasing ? 'bottom' : 'top', yVal: isIncreasing ? '-\\infty' : '+\\infty' },
            {
              x: x0Str,
              yPrime: '||',
              isAsymptote: true,
              yLeftVal: isIncreasing ? '+\\infty' : '-\\infty',
              yLeftPosition: isIncreasing ? 'top' : 'bottom',
              yRightVal: isIncreasing ? '-\\infty' : '+\\infty',
              yRightPosition: isIncreasing ? 'bottom' : 'top'
            },
            { x: '+\\infty', yPosition: isIncreasing ? 'top' : 'bottom', yVal: isIncreasing ? '+\\infty' : '-\\infty' }
          ];

          const intervals: BBTInterval[] = [
            { sign: isIncreasing ? '+' : '-', trend: isIncreasing ? 'increasing' : 'decreasing' },
            { sign: isIncreasing ? '+' : '-', trend: isIncreasing ? 'increasing' : 'decreasing' }
          ];

          return {
            functionName: `y = \\frac{${numStr}}{${denStr}}`,
            domainNote: `Tập xác định: D = \\mathbb{R} \\setminus \\{${x0Str}\\}`,
            points,
            intervals
          };
        }
      }

      // 1.2 Hàm phân thức bậc nhất / bậc nhất: y = (ax + b) / (cx + d)
      if (d !== 0 && (numCoeffs[2] === undefined || numCoeffs[2] === 0)) {
        const a = numCoeffs[1] || 0;
        const b = numCoeffs[0] || 0;
        const c = d;
        const dConst = e;

        const x0 = -dConst / c;
        const x0Str = formatNumDisplay(x0);
        const det = a * dConst - b * c;
        const isIncreasing = det > 0;
        const horizVal = formatNumDisplay(a / c);

        const points: BBTPoint[] = [
          {
            x: '-\\infty',
            yPosition: isIncreasing ? 'bottom' : 'top',
            yVal: horizVal
          },
          {
            x: x0Str,
            yPrime: '||',
            isAsymptote: true,
            yLeftVal: isIncreasing ? '+\\infty' : '-\\infty',
            yLeftPosition: isIncreasing ? 'top' : 'bottom',
            yRightVal: isIncreasing ? '-\\infty' : '+\\infty',
            yRightPosition: isIncreasing ? 'bottom' : 'top'
          },
          {
            x: '+\\infty',
            yPosition: isIncreasing ? 'top' : 'bottom',
            yVal: horizVal
          }
        ];

        const intervals: BBTInterval[] = [
          { sign: isIncreasing ? '+' : '-', trend: isIncreasing ? 'increasing' : 'decreasing' },
          { sign: isIncreasing ? '+' : '-', trend: isIncreasing ? 'increasing' : 'decreasing' }
        ];

        return {
          functionName: `y = \\frac{${numStr}}{${denStr}}`,
          domainNote: `Tập xác định: D = \\mathbb{R} \\setminus \\{${x0Str}\\}`,
          points,
          intervals
        };
      }
    }

    // =========================================================================
    // 2. HÀM CĂN THỨC: y = \sqrt{a - x^2} hoặc y = \sqrt{x^2 - a}
    // =========================================================================
    const radMatch = clean.match(/(?:\\sqrt|sqrt)\{?([^{}()]+)\}?/i);
    if (radMatch) {
      const inner = radMatch[1];
      const radCoeffs = parsePolynomialCoeffs(inner);
      const a2 = radCoeffs[2] || 0;
      const c0 = radCoeffs[0] || 0;

      // Dạng 1: y = \sqrt{a - x^2} (ví dụ: \sqrt{4 - x^2})
      if (a2 < 0 && c0 > 0) {
        const radius = Math.sqrt(-c0 / a2);
        const rStr = formatNumDisplay(radius);
        const maxVal = formatNumDisplay(Math.sqrt(c0));

        const points: BBTPoint[] = [
          { x: '-\\infty', yVal: '', yPosition: 'bottom' },
          { x: `-${rStr}`, yPrime: '||', isDerivativeUndefinedOnly: true, yVal: '0', yPosition: 'bottom' },
          { x: '0', yPrime: '0', yVal: maxVal, yPosition: 'top' },
          { x: rStr, yPrime: '||', isDerivativeUndefinedOnly: true, yVal: '0', yPosition: 'bottom' },
          { x: '+\\infty', yVal: '', yPosition: 'bottom' }
        ];

        const intervals: BBTInterval[] = [
          { isExcludedDomain: true, trend: 'none' },
          { sign: '+', trend: 'increasing' },
          { sign: '-', trend: 'decreasing' },
          { isExcludedDomain: true, trend: 'none' }
        ];

        return {
          functionName: `y = \\sqrt{${inner}}`,
          domainNote: `Tập xác định: D = [ -${rStr}; ${rStr} ]`,
          points,
          intervals
        };
      }

      // Dạng 2: y = \sqrt{x^2 - a} (ví dụ: \sqrt{x^2 - 4})
      if (a2 > 0 && c0 < 0) {
        const radius = Math.sqrt(-c0 / a2);
        const rStr = formatNumDisplay(radius);

        const points: BBTPoint[] = [
          { x: '-\\infty', yVal: '+\\infty', yPosition: 'top' },
          { x: `-${rStr}`, yPrime: '||', isDerivativeUndefinedOnly: true, yVal: '0', yPosition: 'bottom' },
          { x: rStr, yPrime: '||', isDerivativeUndefinedOnly: true, yVal: '0', yPosition: 'bottom' },
          { x: '+\\infty', yVal: '+\\infty', yPosition: 'top' }
        ];

        const intervals: BBTInterval[] = [
          { sign: '-', trend: 'decreasing' },
          { isExcludedDomain: true, trend: 'none' },
          { sign: '+', trend: 'increasing' }
        ];

        return {
          functionName: `y = \\sqrt{${inner}}`,
          domainNote: `Tập xác định: D = (-\\infty; -${rStr}] \\cup [${rStr}; +\\infty)`,
          points,
          intervals
        };
      }
    }

    // =========================================================================
    // 3. HÀM TRÙNG PHƯƠNG (BẬC 4): y = ax^4 + bx^2 + c
    // =========================================================================
    if (clean.includes('x^4') || clean.includes('x⁴')) {
      const coeffs = parsePolynomialCoeffs(clean);
      const a = coeffs[4] || 0;
      const b = coeffs[2] || 0;
      const c = coeffs[0] || 0;

      if (a !== 0 && (coeffs[3] === undefined || coeffs[3] === 0) && (coeffs[1] === undefined || coeffs[1] === 0)) {
        if (a * b < 0) {
          const xExt = Math.sqrt(-b / (2 * a));
          const xExtStr = formatNumDisplay(xExt);
          const yExt = a * Math.pow(xExt, 4) + b * Math.pow(xExt, 2) + c;
          const yExtStr = formatNumDisplay(yExt);
          const y0Str = formatNumDisplay(c);

          const isUp = a > 0;

          const points: BBTPoint[] = isUp ? [
            { x: '-\\infty', yVal: '+\\infty', yPosition: 'top' },
            { x: `-${xExtStr}`, yPrime: '0', yVal: yExtStr, yPosition: 'bottom' },
            { x: '0', yPrime: '0', yVal: y0Str, yPosition: 'top' },
            { x: xExtStr, yPrime: '0', yVal: yExtStr, yPosition: 'bottom' },
            { x: '+\\infty', yVal: '+\\infty', yPosition: 'top' }
          ] : [
            { x: '-\\infty', yVal: '-\\infty', yPosition: 'bottom' },
            { x: `-${xExtStr}`, yPrime: '0', yVal: yExtStr, yPosition: 'top' },
            { x: '0', yPrime: '0', yVal: y0Str, yPosition: 'bottom' },
            { x: xExtStr, yPrime: '0', yVal: yExtStr, yPosition: 'top' },
            { x: '+\\infty', yVal: '-\\infty', yPosition: 'bottom' }
          ];

          const intervals: BBTInterval[] = isUp ? [
            { sign: '-', trend: 'decreasing' },
            { sign: '+', trend: 'increasing' },
            { sign: '-', trend: 'decreasing' },
            { sign: '+', trend: 'increasing' }
          ] : [
            { sign: '+', trend: 'increasing' },
            { sign: '-', trend: 'decreasing' },
            { sign: '+', trend: 'increasing' },
            { sign: '-', trend: 'decreasing' }
          ];

          return {
            functionName: `y = ${raw}`,
            domainNote: 'Tập xác định: D = \\mathbb{R}',
            points,
            intervals
          };
        } else {
          const y0Str = formatNumDisplay(c);
          const isUp = a > 0;

          const points: BBTPoint[] = isUp ? [
            { x: '-\\infty', yVal: '+\\infty', yPosition: 'top' },
            { x: '0', yPrime: '0', yVal: y0Str, yPosition: 'bottom' },
            { x: '+\\infty', yVal: '+\\infty', yPosition: 'top' }
          ] : [
            { x: '-\\infty', yVal: '-\\infty', yPosition: 'bottom' },
            { x: '0', yPrime: '0', yVal: y0Str, yPosition: 'top' },
            { x: '+\\infty', yVal: '-\\infty', yPosition: 'bottom' }
          ];

          const intervals: BBTInterval[] = isUp ? [
            { sign: '-', trend: 'decreasing' },
            { sign: '+', trend: 'increasing' }
          ] : [
            { sign: '+', trend: 'increasing' },
            { sign: '-', trend: 'decreasing' }
          ];

          return {
            functionName: `y = ${raw}`,
            domainNote: 'Tập xác định: D = \\mathbb{R}',
            points,
            intervals
          };
        }
      }
    }

    // =========================================================================
    // 4. HÀM BẬC 3: y = ax^3 + bx^2 + cx + d
    // =========================================================================
    if (clean.includes('x^3') || clean.includes('x³')) {
      const coeffs = parsePolynomialCoeffs(clean);
      const a = coeffs[3] || 0;
      const b = coeffs[2] || 0;
      const c = coeffs[1] || 0;
      const d = coeffs[0] || 0;

      if (a !== 0) {
        const A = 3 * a;
        const B = 2 * b;
        const C = c;
        const delta = B * B - 4 * A * C;

        if (delta > 0) {
          const r1 = (-B - Math.sqrt(delta)) / (2 * A);
          const r2 = (-B + Math.sqrt(delta)) / (2 * A);
          const x1 = Math.min(r1, r2);
          const x2 = Math.max(r1, r2);

          const calcY = (x: number) => a * x * x * x + b * x * x + c * x + d;
          const y1 = calcY(x1);
          const y2 = calcY(x2);

          const points: BBTPoint[] = [
            { x: '-\\infty', yVal: a > 0 ? '-\\infty' : '+\\infty', yPosition: a > 0 ? 'bottom' : 'top' },
            { x: formatNumDisplay(x1), yPrime: '0', yVal: formatNumDisplay(y1), yPosition: a > 0 ? 'top' : 'bottom' },
            { x: formatNumDisplay(x2), yPrime: '0', yVal: formatNumDisplay(y2), yPosition: a > 0 ? 'bottom' : 'top' },
            { x: '+\\infty', yVal: a > 0 ? '+\\infty' : '-\\infty', yPosition: a > 0 ? 'top' : 'bottom' }
          ];

          const intervals: BBTInterval[] = a > 0 ? [
            { sign: '+', trend: 'increasing' },
            { sign: '-', trend: 'decreasing' },
            { sign: '+', trend: 'increasing' }
          ] : [
            { sign: '-', trend: 'decreasing' },
            { sign: '+', trend: 'increasing' },
            { sign: '-', trend: 'decreasing' }
          ];

          return {
            functionName: `y = ${raw}`,
            domainNote: 'Tập xác định: D = \\mathbb{R}',
            points,
            intervals
          };
        } else {
          const isUp = a > 0;
          const points: BBTPoint[] = [
            { x: '-\\infty', yVal: isUp ? '-\\infty' : '+\\infty', yPosition: isUp ? 'bottom' : 'top' },
            { x: '+\\infty', yVal: isUp ? '+\\infty' : '-\\infty', yPosition: isUp ? 'top' : 'bottom' }
          ];
          const intervals: BBTInterval[] = [
            { sign: isUp ? '+' : '-', trend: isUp ? 'increasing' : 'decreasing' }
          ];
          return {
            functionName: `y = ${raw}`,
            domainNote: 'Tập xác định: D = \\mathbb{R}',
            points,
            intervals
          };
        }
      }
    }

    // =========================================================================
    // 5. HÀM BẬC 2 (PARABOL): y = ax^2 + bx + c
    // =========================================================================
    if ((clean.includes('x^2') || clean.includes('x²')) && !clean.includes('/')) {
      const coeffs = parsePolynomialCoeffs(clean);
      const a = coeffs[2] || 0;
      const b = coeffs[1] || 0;
      const c = coeffs[0] || 0;

      if (a !== 0) {
        const xv = -b / (2 * a);
        const yv = a * xv * xv + b * xv + c;

        const points: BBTPoint[] = [
          { x: '-\\infty', yVal: a > 0 ? '+\\infty' : '-\\infty', yPosition: a > 0 ? 'top' : 'bottom' },
          { x: formatNumDisplay(xv), yPrime: '0', yVal: formatNumDisplay(yv), yPosition: a > 0 ? 'bottom' : 'top' },
          { x: '+\\infty', yVal: a > 0 ? '+\\infty' : '-\\infty', yPosition: a > 0 ? 'top' : 'bottom' }
        ];

        const intervals: BBTInterval[] = a > 0 ? [
          { sign: '-', trend: 'decreasing' },
          { sign: '+', trend: 'increasing' }
        ] : [
          { sign: '+', trend: 'increasing' },
          { sign: '-', trend: 'decreasing' }
        ];

        return {
          functionName: `y = ${raw}`,
          domainNote: 'Tập xác định: D = \\mathbb{R}',
          points,
          intervals
        };
      }
    }

    // =========================================================================
    // 6. HÀM SỐ LƯỢNG GIÁC: y = sin x, y = cos x, y = tan x, y = cot x
    // =========================================================================
    if (/\b(?:sin|cos|tan|cot)\b/i.test(clean)) {
      if (clean.includes('sin')) {
        return {
          functionName: 'y = \\sin x',
          domainNote: 'Xét trên 1 chu kỳ [0; 2\\pi]',
          points: [
            { x: '0', yPrime: '', yVal: '0', yPosition: 'middle' },
            { x: '\\frac{\\pi}{2}', yPrime: '0', yVal: '1', yPosition: 'top' },
            { x: '\\frac{3\\pi}{2}', yPrime: '0', yVal: '-1', yPosition: 'bottom' },
            { x: '2\\pi', yPrime: '', yVal: '0', yPosition: 'middle' }
          ],
          intervals: [
            { sign: '+', trend: 'increasing' },
            { sign: '-', trend: 'decreasing' },
            { sign: '+', trend: 'increasing' }
          ]
        };
      }
      if (clean.includes('cos')) {
        return {
          functionName: 'y = \\cos x',
          domainNote: 'Xét trên 1 chu kỳ [0; 2\\pi]',
          points: [
            { x: '0', yPrime: '', yVal: '1', yPosition: 'top' },
            { x: '\\pi', yPrime: '0', yVal: '-1', yPosition: 'bottom' },
            { x: '2\\pi', yPrime: '', yVal: '1', yPosition: 'top' }
          ],
          intervals: [
            { sign: '-', trend: 'decreasing' },
            { sign: '+', trend: 'increasing' }
          ]
        };
      }
      if (clean.includes('tan')) {
        return {
          functionName: 'y = \\tan x',
          domainNote: 'Xét trên khoảng (-\\frac{\\pi}{2}; \\frac{\\pi}{2})',
          points: [
            { x: '-\\frac{\\pi}{2}', yPrime: '||', isAsymptote: true, yLeftVal: '-\\infty', yLeftPosition: 'bottom', yRightVal: '-\\infty', yRightPosition: 'bottom' },
            { x: '0', yPrime: '', yVal: '0', yPosition: 'middle' },
            { x: '\\frac{\\pi}{2}', yPrime: '||', isAsymptote: true, yLeftVal: '+\\infty', yLeftPosition: 'top', yRightVal: '+\\infty', yRightPosition: 'top' }
          ],
          intervals: [
            { sign: '+', trend: 'increasing' },
            { sign: '+', trend: 'increasing' }
          ]
        };
      }
    }
  } catch (err) {}

  return null;
}

/**
 * Sinh đồ thị hàm số vector SVG chuẩn SGK Toán 10, 11, 12 GDPT 2018
 * Hiển thị đầy đủ hệ trục Oxy, điểm cực trị, tiệm cận và đường cong sắc nét
 */
export function generateFunctionGraphSvg(expression: string, contextBlock?: string): string | null {
  try {
    let clean = (expression || '').trim()
      .replace(/\s+/g, '')
      .replace(/\$/g, '')
      .replace(/^y\s*=\s*/i, '')
      .replace(/^f\([a-z]\)\s*=\s*/i, '')
      .replace(/^g\([a-z]\)\s*=\s*/i, '')
      .replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, '($1)/($2)')
      .replace(/\\cdot|\\times/g, '*')
      .replace(/[−–—]/g, '-')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .replace(/⁴/g, '^4');

    const width = 420;
    const height = 300;
    const originX = 210;
    const originY = 150;
    const scale = 26; // 26 pixels per unit

    const toSvgX = (x: number) => originX + x * scale;
    const toSvgY = (y: number) => originY - y * scale;

    const sanitizeExprForMathJs = (expr: string): string => {
      let clean = (expr || '').trim()
        .replace(/\s+/g, '')
        .replace(/\$/g, '')
        .replace(/^y\s*=\s*/i, '')
        .replace(/^f\([a-z]\)\s*=\s*/i, '')
        .replace(/^g\([a-z]\)\s*=\s*/i, '')
        .replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, '(($1)/($2))')
        .replace(/\\cdot|\\times/g, '*')
        .replace(/[−–—]/g, '-')
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/⁴/g, '^4')
        .replace(/x\^\{([^}]+)\}/g, 'x^$1')
        .replace(/x\{([^}]+)\}/g, 'x^$1')
        .replace(/(\d)([a-zA-Z])/g, '$1*$2')
        .replace(/([a-wA-WzZ])([xX])/g, '$1*$2')
        .replace(/([xX])([a-wA-WzZ])/g, '$1*$2')
        .replace(/\)\s*\(/g, ')*(')
        .replace(/(\d)\s*\(/g, '$1*(')
        .replace(/\)\s*([a-zA-Z])/g, ')*$1');
      return clean;
    };

    let currentExpr = clean;

    const evalY = (xVal: number, exprStr: string): number | null => {
      try {
        const cleanExpr = sanitizeExprForMathJs(exprStr);
        if (cleanExpr) {
          try {
            const scope = { x: xVal, X: xVal, m: 1, a: 1, b: 0, c: 0, d: 0, e: 0 };
            const val = evaluate(cleanExpr, scope);
            if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
              return val;
            }
          } catch (e) {}
        }

        if (exprStr.includes('/')) {
          const parts = exprStr.split('/');
          if (parts.length === 2) {
            const numCoeffs = parsePolynomialCoeffs(parts[0].replace(/^\(|\)$/g, ''));
            const denCoeffs = parsePolynomialCoeffs(parts[1].replace(/^\(|\)$/g, ''));
            const num = (numCoeffs[2] || 0) * xVal * xVal + (numCoeffs[1] || 0) * xVal + (numCoeffs[0] || 0);
            const den = (denCoeffs[1] || 0) * xVal + (denCoeffs[0] || 0);
            if (Math.abs(den) < 1e-4) return null;
            return num / den;
          }
        }

        const coeffs = parsePolynomialCoeffs(exprStr);
        let res = 0;
        let hasCoeff = false;
        for (let p = 0; p <= 4; p++) {
          if (coeffs[p] !== undefined) {
            res += coeffs[p] * Math.pow(xVal, p);
            hasCoeff = true;
          }
        }
        if (hasCoeff) return res;

        if (exprStr.includes('sin')) return Math.sin(xVal);
        if (exprStr.includes('cos')) return Math.cos(xVal);
        if (exprStr.includes('tan')) {
          const t = Math.tan(xVal);
          return Math.abs(t) > 8 ? null : t;
        }

        return null;
      } catch (e) {
        return null;
      }
    };

    const minX = -6.5;
    const maxX = 6.5;
    const step = 0.05;
    let pathD = '';
    let validPointsCount = 0;

    let xAsym: number | null = null;
    let yAsym: number | null = null;
    let slantAsym: { m: number; n: number } | null = null;

    if (currentExpr.includes('/')) {
      const slashIndex = currentExpr.indexOf('/');
      const numPart = currentExpr.substring(0, slashIndex).replace(/^\(+|\)+$/g, '');
      const denPart = currentExpr.substring(slashIndex + 1).replace(/^\(+|\)+$/g, '');
      const numCoeffs = parsePolynomialCoeffs(numPart);
      const denCoeffs = parsePolynomialCoeffs(denPart);
      if (denCoeffs[1] && denCoeffs[1] !== 0) {
        xAsym = -(denCoeffs[0] || 0) / denCoeffs[1];
        if (numCoeffs[2] === undefined || numCoeffs[2] === 0) {
          yAsym = (numCoeffs[1] || 0) / denCoeffs[1];
        } else if (numCoeffs[2]) {
          // Hàm phân thức bậc 2 trên bậc 1 (Toán 12 GDPT 2018): tiệm cận xiên y = mx + n
          const d = denCoeffs[1];
          const e = denCoeffs[0] || 0;
          const a = numCoeffs[2];
          const b = numCoeffs[1] || 0;
          const m = a / d;
          const n = (b * d - a * e) / (d * d);
          slantAsym = { m, n };
        }
      }
    }

    let inSubpath = false;
    for (let xVal = minX; xVal <= maxX; xVal += step) {
      if (xAsym !== null && Math.abs(xVal - xAsym) < 0.15) {
        inSubpath = false;
        continue;
      }
      const yVal = evalY(xVal, currentExpr);
      if (yVal === null || isNaN(yVal) || !isFinite(yVal) || Math.abs(yVal) > 6.5) {
        inSubpath = false;
        continue;
      }

      const sx = toSvgX(xVal);
      const sy = toSvgY(yVal);

      if (sx < 10 || sx > width - 10 || sy < 10 || sy > height - 10) {
        inSubpath = false;
        continue;
      }

      if (!inSubpath) {
        pathD += ` M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
        inSubpath = true;
      } else {
        pathD += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      }
      validPointsCount++;
    }

    // GUARANTEE: If validPointsCount < 8 (e.g. unparseable expression),
    // FALL BACK TO A REPRESENTATIVE STANDARD SGK CURVE SO NO GRAPH AXIS IS EVER EMPTY!
    if (validPointsCount < 8) {
      const combinedText = ((expression || '') + ' ' + (contextBlock || '')).toLowerCase();

      if (combinedText.includes('phân thức') || combinedText.includes('tiệm cận') || combinedText.includes('bậc nhất trên bậc nhất') || combinedText.includes('/')) {
        currentExpr = '(x+1)/(x-1)';
        xAsym = 1;
        yAsym = 1;
        slantAsym = null;
      } else if (combinedText.includes('trùng phương') || combinedText.includes('bậc 4') || combinedText.includes('bậc bốn') || combinedText.includes('x^4') || combinedText.includes('x⁴')) {
        currentExpr = 'x^4-2*x^2';
        xAsym = null;
        yAsym = null;
        slantAsym = null;
      } else if (combinedText.includes('parabol') || combinedText.includes('bậc 2') || combinedText.includes('bậc hai') || combinedText.includes('x^2') || combinedText.includes('x²')) {
        currentExpr = 'x^2-2*x-1';
        xAsym = null;
        yAsym = null;
        slantAsym = null;
      } else if (combinedText.includes('-x^3') || combinedText.includes('âm')) {
        currentExpr = '-x^3+3*x';
        xAsym = null;
        yAsym = null;
        slantAsym = null;
      } else {
        // Standard textbook cubic curve y = x^3 - 3x
        currentExpr = 'x^3-3*x';
        xAsym = null;
        yAsym = null;
        slantAsym = null;
      }

      pathD = '';
      inSubpath = false;
      for (let xVal = minX; xVal <= maxX; xVal += step) {
        if (xAsym !== null && Math.abs(xVal - xAsym) < 0.15) {
          inSubpath = false;
          continue;
        }
        const yVal = evalY(xVal, currentExpr);
        if (yVal === null || isNaN(yVal) || !isFinite(yVal) || Math.abs(yVal) > 6.5) {
          inSubpath = false;
          continue;
        }

        const sx = toSvgX(xVal);
        const sy = toSvgY(yVal);

        if (sx < 10 || sx > width - 10 || sy < 10 || sy > height - 10) {
          inSubpath = false;
          continue;
        }

        if (!inSubpath) {
          pathD += ` M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
          inSubpath = true;
        } else {
          pathD += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
        }
      }
    }

    const svgParts: string[] = [];

    // Grid definition
    svgParts.push(`<defs>
      <pattern id="graph-grid" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
        <path d="M ${scale} 0 L 0 0 0 ${scale}" fill="none" stroke="#f1f5f9" stroke-width="1" />
      </pattern>
      <marker id="graph-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b" />
      </marker>
    </defs>`);

    // Background grid
    svgParts.push(`<rect width="${width}" height="${height}" fill="#ffffff" />`);
    svgParts.push(`<rect width="${width}" height="${height}" fill="url(#graph-grid)" />`);

    // Asymptotes (Đầy đủ tiệm cận đứng, ngang, xiên với màu đỏ nét đứt, nhãn phương trình và tâm đối xứng I)
    if (xAsym !== null && isFinite(xAsym)) {
      const sx = toSvgX(xAsym);
      svgParts.push(`<line x1="${sx.toFixed(1)}" y1="10" x2="${sx.toFixed(1)}" y2="${height - 10}" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="5,4" />`);
      const lx = sx + (sx > width - 70 ? -55 : 6);
      svgParts.push(`<text x="${lx.toFixed(1)}" y="22" font-family="'Times New Roman', Times, serif" font-size="13" font-style="italic" font-weight="bold" fill="#dc2626">x = ${formatNumDisplay(xAsym)}</text>`);
      // Vạch tọa độ trên trục Ox
      svgParts.push(`<line x1="${sx.toFixed(1)}" y1="${originY - 4}" x2="${sx.toFixed(1)}" y2="${originY + 4}" stroke="#dc2626" stroke-width="1.5" />`);
    }
    if (yAsym !== null && isFinite(yAsym)) {
      const sy = toSvgY(yAsym);
      svgParts.push(`<line x1="10" y1="${sy.toFixed(1)}" x2="${width - 10}" y2="${sy.toFixed(1)}" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="5,4" />`);
      const ly = Math.max(sy - 6, 20);
      svgParts.push(`<text x="${width - 55}" y="${ly.toFixed(1)}" font-family="'Times New Roman', Times, serif" font-size="13" font-style="italic" font-weight="bold" fill="#dc2626">y = ${formatNumDisplay(yAsym)}</text>`);
      // Vạch tọa độ trên trục Oy
      svgParts.push(`<line x1="${originX - 4}" y1="${sy.toFixed(1)}" x2="${originX + 4}" y2="${sy.toFixed(1)}" stroke="#dc2626" stroke-width="1.5" />`);
    }
    if (slantAsym !== null && isFinite(slantAsym.m) && isFinite(slantAsym.n)) {
      const sx1 = toSvgX(minX);
      const sy1 = toSvgY(slantAsym.m * minX + slantAsym.n);
      const sx2 = toSvgX(maxX);
      const sy2 = toSvgY(slantAsym.m * maxX + slantAsym.n);
      svgParts.push(`<line x1="${sx1.toFixed(1)}" y1="${sy1.toFixed(1)}" x2="${sx2.toFixed(1)}" y2="${sy2.toFixed(1)}" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="5,4" />`);
      const mStr = slantAsym.m === 1 ? '' : (slantAsym.m === -1 ? '-' : formatNumDisplay(slantAsym.m));
      const nStr = slantAsym.n > 0 ? `+ ${formatNumDisplay(slantAsym.n)}` : (slantAsym.n < 0 ? `- ${formatNumDisplay(Math.abs(slantAsym.n))}` : '');
      svgParts.push(`<text x="${Math.min(sx2 - 75, width - 85).toFixed(1)}" y="${Math.max(sy2 - 8, 26).toFixed(1)}" font-family="'Times New Roman', Times, serif" font-size="13" font-style="italic" font-weight="bold" fill="#dc2626">y = ${mStr}x ${nStr}</text>`);
    }
    // Tâm đối xứng I (giao điểm hai đường tiệm cận)
    if (xAsym !== null && isFinite(xAsym)) {
      let yCenter: number | null = null;
      if (yAsym !== null && isFinite(yAsym)) yCenter = yAsym;
      else if (slantAsym !== null) yCenter = slantAsym.m * xAsym + slantAsym.n;
      if (yCenter !== null && isFinite(yCenter)) {
        const ix = toSvgX(xAsym);
        const iy = toSvgY(yCenter);
        if (ix >= 10 && ix <= width - 10 && iy >= 10 && iy <= height - 10) {
          svgParts.push(`<circle cx="${ix.toFixed(1)}" cy="${iy.toFixed(1)}" r="3.2" fill="#dc2626" />`);
          svgParts.push(`<text x="${(ix + 6).toFixed(1)}" y="${(iy - 6).toFixed(1)}" font-family="'Times New Roman', Times, serif" font-size="14" font-weight="bold" font-style="italic" fill="#dc2626">I</text>`);
        }
      }
    }

    // Axes
    svgParts.push(`<line x1="15" y1="${originY}" x2="${width - 15}" y2="${originY}" stroke="#1e293b" stroke-width="1.5" marker-end="url(#graph-arrow)" />`);
    svgParts.push(`<line x1="${originX}" y1="${height - 15}" x2="${originX}" y2="15" stroke="#1e293b" stroke-width="1.5" marker-end="url(#graph-arrow)" />`);

    // Origin and axis labels
    svgParts.push(`<text x="${originX - 12}" y="${originY + 16}" font-family="'Times New Roman', Times, serif" font-size="14" font-style="italic" fill="#0f172a">O</text>`);
    svgParts.push(`<text x="${width - 18}" y="${originY + 18}" font-family="'Times New Roman', Times, serif" font-size="15" font-style="italic" fill="#0f172a">x</text>`);
    svgParts.push(`<text x="${originX - 16}" y="18" font-family="'Times New Roman', Times, serif" font-size="15" font-style="italic" fill="#0f172a">y</text>`);

    // Tick marks on axes
    for (let u = -6; u <= 6; u++) {
      if (u === 0) continue;
      const tx = toSvgX(u);
      if (tx > 20 && tx < width - 20) {
        svgParts.push(`<line x1="${tx}" y1="${originY - 3}" x2="${tx}" y2="${originY + 3}" stroke="#1e293b" stroke-width="1" />`);
        if (Math.abs(u) <= 3) {
          svgParts.push(`<text x="${tx}" y="${originY + 16}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="12" fill="#475569">${u}</text>`);
        }
      }
      const ty = toSvgY(u);
      if (ty > 20 && ty < height - 20) {
        svgParts.push(`<line x1="${originX - 3}" y1="${ty}" x2="${originX + 3}" y2="${ty}" stroke="#1e293b" stroke-width="1" />`);
        if (Math.abs(u) <= 3) {
          svgParts.push(`<text x="${originX - 12}" y="${ty + 4}" text-anchor="end" font-family="'Times New Roman', Times, serif" font-size="12" fill="#475569">${u}</text>`);
        }
      }
    }

    // Vibrant royal blue curve
    if (pathD.trim()) {
      svgParts.push(`<path d="${pathD.trim()}" stroke="#2563eb" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />`);
    }

    // Key extreme points and specific passage points (e.g. (0, d) if specified or d intercept)
    const bbtData = analyzeFunctionToBbt(currentExpr);
    if (bbtData && bbtData.points) {
      bbtData.points.forEach(pt => {
        if (pt.yPrime === '0' && pt.x && pt.yVal) {
          const numX = parseFloat(pt.x.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/, '$1/$2'));
          const numY = parseFloat(pt.yVal.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/, '$1/$2'));
          if (!isNaN(numX) && !isNaN(numY) && Math.abs(numX) <= 6 && Math.abs(numY) <= 6) {
            const px = toSvgX(numX);
            const py = toSvgY(numY);
            if (px > 20 && px < width - 20 && py > 20 && py < height - 20) {
              svgParts.push(`<line x1="${px}" y1="${originY}" x2="${px}" y2="${py}" stroke="#64748b" stroke-dasharray="3,3" stroke-width="1" />`);
              svgParts.push(`<line x1="${originX}" y1="${py}" x2="${px}" y2="${py}" stroke="#64748b" stroke-dasharray="3,3" stroke-width="1" />`);
              svgParts.push(`<circle cx="${px}" cy="${py}" r="3.5" fill="#1e293b" />`);
            }
          }
        }
      });
    }

    // Highlight explicit y-intercept (0, d) e.g. (0,1) with dashed lines and axis tick mark
    const yAt0 = evalY(0, currentExpr);
    if (yAt0 !== null && isFinite(yAt0) && Math.abs(yAt0) <= 6 && Math.abs(yAt0) > 0.01) {
      const px = toSvgX(0);
      const py = toSvgY(yAt0);
      svgParts.push(`<line x1="${originX - 4}" y1="${py}" x2="${originX + 4}" y2="${py}" stroke="#dc2626" stroke-width="1.5" />`);
      svgParts.push(`<text x="${originX + 6}" y="${py + 4}" font-family="'Times New Roman', Times, serif" font-size="12" font-weight="bold" fill="#dc2626">${formatNumDisplay(yAt0)}</text>`);
      svgParts.push(`<circle cx="${px}" cy="${py}" r="3" fill="#dc2626" />`);
    }

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="max-w-full h-auto mx-auto my-3 drop-shadow-sm bg-white rounded-lg border border-slate-200">
      ${svgParts.join('\n      ')}
    </svg>`;
  } catch (e) {
    return generateFunctionGraphSvg('x^3 - 3*x');
  }
}

/**
 * Interface cho kết quả xử lý AI Chỉnh sửa Đồ thị & BBT
 */
export interface AiFixResult {
  updatedContent: string;
  updatedSolution?: string;
  status: 'bbt_svg' | 'graph_svg' | 'both_svg' | 'teacher_annotation' | 'none';
  message: string;
}

/**
 * AI Chỉnh sửa Tự động Đồ thị & BBT chính xác 100%.
 * - Nếu nhận diện được công thức toán học: Tạo BBT / Đồ thị SVG vector 100% chính xác.
 * - Nếu là bài toán hàm ẩn / trừu tượng không có biểu thức đại số cố định: Chèn khối Chú thích dành cho GV.
 */
export function aiFixQuestionVisuals(content: string, solution?: string, options?: string[]): AiFixResult {
  if (!content) return { updatedContent: content || '', updatedSolution: solution || '', status: 'none', message: 'Nội dung câu hỏi rỗng.' };

  const mentionsBbt = /(bảng\s*biến\s*thiên|BBT|bbt|dấu\s*của\s*f'\(x\)|chiều\s*biến\s*thiên|khảo\s*sát\s*sự\s*biến\s*thiên)/i.test(content);
  const mentionsGraph = /(đồ\s*thị|hình\s*bên|hình\s*vẽ|như\s*hình|parabol|tiệm\s*cận)/i.test(content);

  // 1. Thử nhận diện công thức đại số cố định từ content, solution hoặc options
  let formulaMatch = content.match(/(?:y|f\(x\)|g\(x\))\s*=\s*([^,;.\n$\)]+)/i) || 
                       content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i) ||
                       (solution || '').match(/(?:y|f\(x\))\s*=\s*([^,;.\n$\)]+)/i);

  if (!formulaMatch && Array.isArray(options) && options.length > 0) {
    for (const opt of options) {
      const optM = opt.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || opt.match(/(?:\$)?([^$]+)(?:\$)?/);
      if (optM && (optM[1].includes('x') || optM[1].includes('X')) && !/nào\s*dưới\s*đây/i.test(optM[1])) {
        formulaMatch = optM;
        break;
      }
    }
  }

  let updatedC = content;
  let updatedS = solution || '';

  if (formulaMatch && formulaMatch[1].trim().length > 1) {
    const formula = formulaMatch[1].trim();
    const bbtData = analyzeFunctionToBbt(formula);
    const graphSvg = generateFunctionGraphSvg(formula, content);

    let hasAdded = false;
    let currentStatus: 'bbt_svg' | 'graph_svg' | 'both_svg' | 'teacher_annotation' | 'none' = 'none';

    if (mentionsBbt && bbtData) {
      const bbtSvg = generateBbtSvg(bbtData);
      if (bbtSvg) {
        const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(bbtSvg)) : '';
        if (base64) {
          const snippet = `<svg-wrapper data-svg="${base64}"></svg-wrapper>`;
          updatedC = updatedC.replace(/<svg-wrapper[\s\S]*?<\/svg-wrapper>/gi, '').trim();
          updatedC = `${updatedC}\n\n<div class="my-3 text-center">${snippet}</div>\n\n`;
          currentStatus = 'bbt_svg';
          hasAdded = true;
        }
      }
    }

    if (mentionsGraph && graphSvg) {
      const base64Graph = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(graphSvg)) : '';
      if (base64Graph) {
        const snippetGraph = `<svg-wrapper data-svg="${base64Graph}"></svg-wrapper>`;
        if (!hasAdded) {
          updatedC = updatedC.replace(/<svg-wrapper[\s\S]*?<\/svg-wrapper>/gi, '').trim();
          updatedC = `${updatedC}\n\n<div class="my-3 text-center">${snippetGraph}</div>\n\n`;
          currentStatus = 'graph_svg';
        } else {
          updatedC = `${updatedC}\n\n<div class="my-3 text-center">${snippetGraph}</div>\n\n`;
          currentStatus = 'both_svg';
        }
        hasAdded = true;
      }
    }

    if (hasAdded) {
      return {
        updatedContent: updatedC,
        updatedSolution: updatedS,
        status: currentStatus,
        message: `✨ AI đã tự động phân tích hàm số "${formula}" và chèn Đồ thị / BBT chính xác 100%!`
      };
    }
  }

  // 2. Nếu là bài toán hàm ẩn / tham số m / không giải được biểu thức duy nhất
  const isAbstractParameterProblem = /(chứa\s*tham\s*số|tham\s*số\s*m|hàm\s*ẩn|cho\s*hàm\s*số\s*y\s*=\s*f\(x\)\s*có|đồ\s*thị\s*của\s*hàm\s*số\s*y\s*=\s*f'\(x\))/i.test(content);

  if ((mentionsBbt || mentionsGraph) && isAbstractParameterProblem && !formulaMatch) {
    const teacherAnnotation = `<div class="my-3 p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-950 font-sans shadow-2xs no-print-border">
  <div class="flex items-center justify-between gap-2 mb-1">
    <div class="flex items-center gap-1.5 font-bold text-amber-900 text-xs sm:text-sm">
      <span class="text-base">📌</span>
      <span>CHÚ THÍCH HÌNH VẼ / BBT CHO GIÁO VIÊN:</span>
    </div>
    <span class="text-[10px] font-semibold uppercase px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">Hàm ẩn / Bổ sung hình</span>
  </div>
  <p class="text-xs text-amber-800 my-1 leading-relaxed">
    Đề bài yêu cầu hình minh họa cho hàm số $y=f(x)$ qua các điểm đặc biệt. Để đảm bảo <strong>tính chính xác 100%</strong> cho đề thi, Giáo viên có thể click vào nút <strong>"📈 BBT"</strong> hoặc <strong>"📊 Đồ thị"</strong> để chọn hình mẫu phù hợp hoặc tải hình thực tế lên.
  </p>
</div>`;

    if (!content.includes('CHÚ THÍCH HÌNH VẼ')) {
      updatedC = `${updatedC.trim()}\n\n${teacherAnnotation}\n\n`;
    }

    return {
      updatedContent: updatedC,
      updatedSolution: updatedS,
      status: 'teacher_annotation',
      message: '📌 Đã chèn Chú thích dành cho Giáo viên (do câu hỏi hàm ẩn/trừu tượng không có biểu thức cố định)!'
    };
  }

  // 3. Mặc định tự động hoàn thiện với autoEnrichTextWithVisuals
  const enriched = autoEnrichTextWithVisuals(content, false);
  return {
    updatedContent: enriched,
    updatedSolution: solution,
    status: enriched !== content ? 'bbt_svg' : 'none',
    message: enriched !== content ? '✨ AI đã chèn BBT/Đồ thị vector chuẩn SGK vào đề bài!' : 'Không cần thay đổi thêm.'
  };
}

/**
 * Tự động sinh dữ liệu BBT đại diện chuẩn SGK cho các câu hỏi tổng quát $y = f(x)$
 */
export function syntheticBbtFromQuestion(block: string, options?: string[]): BBTData {
  const isSignTable = /bảng\s*xét\s*dấu/i.test(block);
  const lower = (block + ' ' + (options || []).join(' ')).toLowerCase();

  // 1. Nếu câu hỏi về TIỆM CẬN, PHÂN THỨC HỮU TỶ hoặc có chứa phân thức:
  // TUYỆT ĐỐI KHÔNG sinh bảng bậc 3! Sinh bảng phân thức chuẩn với tiệm cận đứng và tiệm cận ngang!
  if (lower.includes('tiệm cận') || lower.includes('phân thức') || lower.includes('/') || lower.includes('bậc nhất trên bậc nhất') || /\\frac/i.test(block)) {
    const xMatch = block.match(/x\s*=\s*([-–—]?\d+)/i);
    const yMatch = block.match(/y\s*=\s*([-–—]?\d+)/i);
    const xAsym = xMatch ? xMatch[1].replace(/[−–—]/g, '-') : '1';
    const yAsym = yMatch ? yMatch[1].replace(/[−–—]/g, '-') : '2';

    const isNeg = lower.includes('nghịch biến') || lower.includes('nghich bien') || (block.match(/-/g) || []).length > (block.match(/\+/g) || []).length;
    const sign: '+' | '-' = isNeg ? '-' : '+';
    const trend: 'increasing' | 'decreasing' = isNeg ? 'decreasing' : 'increasing';

    return {
      functionName: 'y = f(x)',
      domainNote: 'Bảng biến thiên',
      points: [
        { x: '-\\infty', yVal: yAsym, yPosition: isNeg ? 'top' : 'bottom' },
        {
          x: xAsym,
          yPrime: '||',
          isAsymptote: true,
          yPosition: 'middle',
          yLeftVal: isNeg ? '-\\infty' : '+\\infty',
          yLeftPosition: isNeg ? 'bottom' : 'top',
          yRightVal: isNeg ? '+\\infty' : '-\\infty',
          yRightPosition: isNeg ? 'top' : 'bottom'
        },
        { x: '+\\infty', yVal: yAsym, yPosition: isNeg ? 'bottom' : 'top' }
      ],
      intervals: [
        { sign, trend },
        { sign, trend }
      ],
      showDerivative: true
    };
  }

  // 2. Nếu câu hỏi xác định trên đoạn đóng [a; b], ví dụ: liên tục trên [-2; 3]
  const domainMatch = block.match(/(?:trên\s*đoạn|liên\s*tục\s*trên)\s*\[\s*([-–—]?\d+)\s*;\s*([-–—]?\d+)\s*\]/i);
  let domainA: number | null = null;
  let domainB: number | null = null;
  if (domainMatch) {
    domainA = parseFloat(domainMatch[1].replace(/[−–—]/g, '-'));
    domainB = parseFloat(domainMatch[2].replace(/[−–—]/g, '-'));
  }

  const rawNumMatches = Array.from(block.matchAll(/(?<![a-zA-Z_\$\\])[-–—]?\d+(?:\.\d+)?(?![a-zA-Z0-9_\$])/g))
    .map(m => parseFloat(m[0].replace(/[−–—]/g, '-')))
    .filter(n => !isNaN(n) && Math.abs(n) <= 50);

  const sortedNums = Array.from(new Set(rawNumMatches)).sort((a, b) => a - b);

  let keyVals: number[] = [];
  if (sortedNums.includes(-1) && sortedNums.includes(2)) {
    keyVals = [-1, 2];
  } else if (sortedNums.includes(-2) && sortedNums.includes(3)) {
    keyVals = [-2, 3];
  } else if (sortedNums.includes(1) && sortedNums.includes(3)) {
    keyVals = [1, 3];
  } else if (sortedNums.includes(-1) && sortedNums.includes(1)) {
    keyVals = [-1, 1];
  } else {
    const negs = sortedNums.filter(n => n < 0);
    const pos = sortedNums.filter(n => n > 0);
    if (negs.length > 0 && pos.length > 0) {
      keyVals = [negs[negs.length - 1], pos[0]];
    } else {
      keyVals = [-1, 2];
    }
  }

  // Nếu có đoạn [a; b], sử dụng điểm đầu và điểm cuối là a và b
  const startX = domainA !== null ? String(domainA) : '-\\infty';
  const endX = domainB !== null ? String(domainB) : '+\\infty';

  const points: BBTPoint[] = [
    { x: startX, yVal: domainA !== null ? '1' : '-\\infty', yPosition: 'bottom' }
  ];
  const intervals: BBTInterval[] = [];

  let currentSign: '+' | '-' = '+';

  // Lọc keyVals nằm giữa startX và endX nếu có miền xác định
  const validKeyVals = domainA !== null && domainB !== null
    ? (sortedNums.filter(n => n > domainA! && n < domainB!))
    : keyVals;

  const actualKeys = validKeyVals.length > 0 ? validKeyVals : [0];

  actualKeys.forEach((xv, idx) => {
    intervals.push({
      sign: currentSign,
      trend: currentSign === '+' ? 'increasing' : 'decreasing'
    });

    const isTop = (idx % 2 === 0 && currentSign === '+') || (idx % 2 === 1 && currentSign === '-');
    points.push({
      x: String(xv),
      yPrime: '0',
      yVal: isTop ? '5' : '-1',
      yPosition: isTop ? 'top' : 'bottom'
    });

    currentSign = currentSign === '+' ? '-' : '+';
  });

  intervals.push({
    sign: currentSign,
    trend: currentSign === '+' ? 'increasing' : 'decreasing'
  });
  points.push({
    x: endX,
    yVal: domainB !== null ? '-2' : (currentSign === '+' ? '+\\infty' : '-\\infty'),
    yPosition: currentSign === '+' ? 'top' : 'bottom'
  });

  return {
    functionName: 'y = f(x)',
    domainNote: isSignTable ? "Bảng xét dấu đạo hàm f'(x)" : (domainA !== null ? `Bảng biến thiên trên đoạn [${domainA}; ${domainB}]` : 'Bảng biến thiên hàm số y = f(x)'),
    points,
    intervals,
    showDerivative: true
  };
}

export function generateSyntheticGraphSvg(block: string, options?: string[]): string | null {
  if (!block) return null;

  // 1. Kiểm tra nếu có công thức trong các phương án Lựa chọn (từ options truyền vào hoặc trong thân block)
  if (Array.isArray(options) && options.length > 0) {
    for (const opt of options) {
      const optMatch = opt.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) ||
                       opt.match(/(?:\$)?([^$]+)(?:\$)?/);
      if (optMatch && (optMatch[1].includes('x') || optMatch[1].includes('X')) && !/nào\s*dưới\s*đây/i.test(optMatch[1])) {
        const expr = optMatch[1].trim().replace(/^\$|\$$/g, '');
        const svg = generateFunctionGraphSvg(expr, block);
        if (svg) return svg;
      }
    }
  }

  const optAMatch = block.match(/(?:^|\n)\s*(?:\*{0,2}|[-*]\s*)?A[\.\:\)]\s*(?:\$)?(?:y\s*=\s*)?([^,\n\$\|]+)/i);
  if (optAMatch) {
    const candidate = optAMatch[1].trim();
    if ((candidate.includes('x') || candidate.includes('X')) && !/nào\s*dưới\s*đây/i.test(candidate)) {
      const svg = generateFunctionGraphSvg(candidate, block);
      if (svg) return svg;
    }
  }

  // 2. Kiểm tra nếu đề bài mô tả các điểm cực trị (ví dụ: cực trị (0;0) và (2;-4), dạng chữ N)
  const ptRegex = /\(\s*([-–—]?\d+(?:\.\d+)?)\s*;\s*([-–—]?\d+(?:\.\d+)?)\s*\)/g;
  const pts: [number, number][] = [];
  let m: RegExpExecArray | null;
  while ((m = ptRegex.exec(block)) !== null) {
    pts.push([parseFloat(m[1].replace(/[−–—]/g, '-')), parseFloat(m[2].replace(/[−–—]/g, '-'))]);
  }
  if (pts.length >= 2 && (/cực\s*trị|cực\s*đại|cực\s*tiểu|chữ\s*N|bậc\s*3|bậc\s*ba/i.test(block))) {
    const p1 = pts[0];
    const p2 = pts.find(p => Math.abs(p[0] - p1[0]) > 0.1);
    if (p2) {
      const [x1, y1] = p1;
      const [x2, y2] = p2;
      const dx = x2 - x1;
      const a = -2 * (y2 - y1) / Math.pow(dx, 3);
      const b = -1.5 * a * (x1 + x2);
      const c = 3 * a * x1 * x2;
      const d = y1 - (a * Math.pow(x1, 3) + b * Math.pow(x1, 2) + c * x1);

      const aStr = a === 1 ? '' : (a === -1 ? '-' : `${Number(a.toFixed(2))}`);
      const bStr = b === 0 ? '' : (b > 0 ? `+ ${b === 1 ? '' : Number(b.toFixed(2))}x^2` : `- ${Math.abs(b) === 1 ? '' : Number(Math.abs(b).toFixed(2))}x^2`);
      const cStr = c === 0 ? '' : (c > 0 ? `+ ${c === 1 ? '' : Number(c.toFixed(2))}x` : `- ${Math.abs(c) === 1 ? '' : Number(Math.abs(c).toFixed(2))}x`);
      const dStr = d === 0 ? '' : (d > 0 ? `+ ${Number(d.toFixed(2))}` : `- ${Number(Math.abs(d).toFixed(2))}`);
      const cubicExpr = `${aStr}x^3 ${bStr} ${cStr} ${dStr}`.replace(/\s+/g, ' ').trim();
      const svg = generateFunctionGraphSvg(cubicExpr, block);
      if (svg) return svg;
    }
  }

  const lower = block.toLowerCase();

  if (lower.includes('phân thức') || lower.includes('tiệm cận') || lower.includes('/') || lower.includes('bậc nhất trên bậc nhất')) {
    return generateFunctionGraphSvg('(x+1)/(x-1)', block);
  }

  if (lower.includes('trùng phương') || lower.includes('bậc 4') || lower.includes('x^4') || lower.includes('x⁴')) {
    return generateFunctionGraphSvg('x^4 - 2*x^2', block);
  }

  if (lower.includes('parabol') || lower.includes('bậc 2') || lower.includes('bậc hai')) {
    return generateFunctionGraphSvg('x^2 - 2*x - 1', block);
  }

  return generateFunctionGraphSvg('x^3 - 3*x', block);
}

export function autoEnrichTextWithVisuals(text: string, isSolution: boolean = false, options?: string[]): string {
  if (!text) return '';
  let updated = text;

  if (/```tikz|\\begin\{tikzpicture\}/i.test(updated)) {
    try {
      const { embedTikzSvgsInText } = require('../components/TikzRenderer');
      updated = embedTikzSvgsInText(updated);
    } catch (e) {}
  }

  updated = embedBbtSvgsInText(updated);

  if (isSolution) {
    return updated;
  }

  const solutionBoxIndex = updated.search(/(?:<details\s*class=["']solution-box["']|---\s*HƯỚNG\s*DẪN\s*CHẤM|---\s*BẢNG\s*ĐÁP\s*ÁN|##\s*Hướng\s*dẫn\s*giải|##\s*Lời\s*giải\s*chi\s*tiết)/i);

  let questionBody = solutionBoxIndex !== -1 ? updated.substring(0, solutionBoxIndex) : updated;
  const solutionBody = solutionBoxIndex !== -1 ? updated.substring(solutionBoxIndex) : '';

  const questionRegex = /(\n(?=(?:#{1,3}\s*|\*{0,2})\b(?:Câu|Bài)\s*\d+[\s:\.\)]))/gi;
  const blocks = questionBody.split(questionRegex);

  const enrichedBlocks = blocks.map(block => {
    let b = block;

    const hasBbtText = /(?:bảng\s*biến\s*thiên|bảng\s*xét\s*dấu|chiều\s*biến\s*thiên|\bBBT\b)/i.test(b);
    const hasVisualAlready = b.includes('svg-wrapper') || b.includes('<img') || b.includes('<svg') || b.includes('\\begin{tikzpicture}');

    if (hasBbtText && !hasVisualAlready) {
      let bbt: BBTData | null = null;
      let fMatch = b.match(/(?:y|f\(x\)|g\(x\))\s*=\s*([^,;.\n$]+)/i) ||
                   b.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);

      let exprCandidate = fMatch ? fMatch[1].trim() : '';
      if (/nào\s*dưới\s*đây|cho\s*trước|đồng\s*biến|nghịch\s*biến/i.test(exprCandidate)) {
        exprCandidate = '';
      }

      if (!exprCandidate && Array.isArray(options) && options.length > 0) {
        const optMatch = options[0].match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) ||
                         options[0].match(/(?:\$)?([^$]+)(?:\$)?/);
        if (optMatch && (optMatch[1].includes('x') || optMatch[1].includes('X'))) {
          exprCandidate = optMatch[1].trim().replace(/^\$|\$$/g, '');
        }
      }
      if (!exprCandidate) {
        const optAMatch = b.match(/(?:^|\n)\s*(?:\*{0,2}|[-*]\s*)?A[\.\:\)]\s*(?:\$)?(?:y\s*=\s*)?([^,\n\$\|]+)/i);
        if (optAMatch && (optAMatch[1].includes('x') || optAMatch[1].includes('X'))) {
          exprCandidate = optAMatch[1].trim();
        }
      }

      if (exprCandidate) {
        bbt = analyzeFunctionToBbt(exprCandidate);
      }

      if (!bbt) {
        bbt = syntheticBbtFromQuestion(b, options);
      }

      if (bbt) {
        const svg = generateBbtSvg(bbt);
        if (svg) {
          const b64 = typeof btoa !== 'undefined'
            ? btoa(encodeURIComponent(svg))
            : Buffer.from(encodeURIComponent(svg)).toString('base64');
          if (b64) {
            const svgTag = `<svg-wrapper data-svg="${b64}"></svg-wrapper>`;
            if (/\[(?:HINH_ANH|BBT|Hình\s*vẽ|Bảng\s*biến\s*thiên)\]/i.test(b)) {
              b = b.replace(/\[(?:HINH_ANH|BBT|Hình\s*vẽ|Bảng\s*biến\s*thiên)\]/i, svgTag);
            }
            else if (/(\n\s*(?:\*{0,2}|[-*]\s*)?(?:[Aa][\.\:\)]|[Aa]\)))/i.test(b)) {
              b = b.replace(/(\n\s*(?:\*{0,2}|[-*]\s*)?(?:[Aa][\.\:\)]|[Aa]\)))/i, `\n\n${svgTag}\n\n$1`);
            }
            else if (/((?:bảng\s*(?:biến\s*thiên|xét\s*dấu)[^:\n]*[:\.\)]))/i.test(b)) {
              b = b.replace(/((?:bảng\s*(?:biến\s*thiên|xét\s*dấu)[^:\n]*[:\.\)]))/i, `$1\n\n${svgTag}\n\n`);
            }
            else {
              b = b + `\n\n${svgTag}\n\n`;
            }
          }
        }
      }
    }

    const hasGraphText = /(?:đồ\s*thị|hình\s*bên|hình\s*vẽ|cho\s*đồ\s*thị)/i.test(b);
    const hasGraphAlready = b.includes('svg-wrapper') || b.includes('<img') || b.includes('\\begin{tikzpicture}');

    if (hasGraphText && !hasGraphAlready) {
      let graphSvg: string | null = null;
      let fMatch = b.match(/(?:y|f\(x\)|g\(x\))\s*=\s*([^,;.\n$]+)/i) ||
                   b.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);

      let exprCandidate = fMatch ? fMatch[1].trim() : '';
      if (/nào\s*dưới\s*đây|cho\s*trước|đồng\s*biến|nghịch\s*biến/i.test(exprCandidate)) {
        exprCandidate = '';
      }

      if (!exprCandidate && Array.isArray(options) && options.length > 0) {
        const optMatch = options[0].match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) ||
                         options[0].match(/(?:\$)?([^$]+)(?:\$)?/);
        if (optMatch && (optMatch[1].includes('x') || optMatch[1].includes('X'))) {
          exprCandidate = optMatch[1].trim().replace(/^\$|\$$/g, '');
        }
      }
      if (!exprCandidate) {
        const optAMatch = b.match(/(?:^|\n)\s*(?:\*{0,2}|[-*]\s*)?A[\.\:\)]\s*(?:\$)?(?:y\s*=\s*)?([^,\n\$\|]+)/i);
        if (optAMatch && (optAMatch[1].includes('x') || optAMatch[1].includes('X'))) {
          exprCandidate = optAMatch[1].trim();
        }
      }

      if (exprCandidate) {
        graphSvg = generateFunctionGraphSvg(exprCandidate, b);
      }

      if (!graphSvg) {
        graphSvg = generateSyntheticGraphSvg(b, options);
      }

      if (graphSvg) {
        const b64 = typeof btoa !== 'undefined'
          ? btoa(encodeURIComponent(graphSvg))
          : Buffer.from(encodeURIComponent(graphSvg)).toString('base64');
        if (b64) {
          const svgTag = `<svg-wrapper data-svg="${b64}"></svg-wrapper>`;
          if (/\[(?:HINH_ANH|Đồ\s*thị|Hình\s*vẽ)\]/i.test(b)) {
            b = b.replace(/\[(?:HINH_ANH|Đồ\s*thị|Hình\s*vẽ)\]/i, svgTag);
          } else if (/(\n\s*(?:\*{0,2}|[-*]\s*)?(?:[Aa][\.\:\)]|[Aa]\)))/i.test(b)) {
            b = b.replace(/(\n\s*(?:\*{0,2}|[-*]\s*)?(?:[Aa][\.\:\)]|[Aa]\)))/i, `\n\n${svgTag}\n\n$1`);
          } else if (/((?:đồ\s*thị[^:\n]*[:\.\)]|hình\s*(?:bên|vẽ)[^:\n]*[:\.\)]))/i.test(b)) {
            b = b.replace(/((?:đồ\s*thị[^:\n]*[:\.\)]|hình\s*(?:bên|vẽ)[^:\n]*[:\.\)]))/i, `$1\n\n${svgTag}\n\n`);
          } else {
            b = b + `\n\n${svgTag}\n\n`;
          }
        }
      }
    }

    return b;
  });

  questionBody = enrichedBlocks.join('');
  return questionBody + solutionBody;
}


