/**
 * BẢNG BIẾN THIÊN (BBT) CHUẨN ĐỒ HỌA SÁCH GIÁO KHOA GDPT MỚI
 * - Tự động nhận diện và chuyển đổi mọi Bảng biến thiên (từ Markdown table, TikZ tkz-tab, mã BBT)
 * - Khung bảng: 1 vách dọc phân cách nhãn (x, y', y), 2 vách ngang (dưới hàng x và dưới hàng y')
 * - Hàng y: Canvas SVG vẽ mũi tên liền mạch, dài thanh thoát, không chia ô HTML
 * - Vạch || tiệm cận đứng kéo dài từ hàng y' xuống tận đáy hàng y
 * - Vùng ngoài tập xác định được tô họa tiết gạch chéo //
 */

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
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
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

  const leftLabelWidth = 68;
  const colSpacing = Math.max(105, Math.min(160, Math.round(520 / Math.max(numPoints - 1, 1))));
  const contentWidth = Math.max(480, (numPoints - 1) * colSpacing + 80);
  const totalWidth = leftLabelWidth + contentWidth;

  const hasDerivativeRow = data.showDerivative !== false && (
    points.some(p => p.yPrime !== undefined && p.yPrime !== '') ||
    intervals.some(i => i.sign !== undefined && i.sign !== '')
  );

  const rowXHeight = 38;
  const rowYPrimeHeight = hasDerivativeRow ? 38 : 0;
  const rowYHeight = 130;
  const totalHeight = rowXHeight + rowYPrimeHeight + rowYHeight;

  const paddingX = 42;
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
  // Vách ngang 2 (dưới hàng y' nếu có hàng đạo hàm)
  if (hasDerivativeRow) {
    svgParts.push(`<line x1="0" y1="${rowXHeight + rowYPrimeHeight}" x2="${totalWidth}" y2="${rowXHeight + rowYPrimeHeight}" stroke="#111827" stroke-width="1.3" />`);
  }

  // 3. CỘT NHÃN TRÁI CHUẨN SGK: x, y', y (Font Times New Roman nghiêng chuẩn toán)
  svgParts.push(`<text x="${leftLabelWidth / 2}" y="25" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" fill="#111827">x</text>`);
  if (hasDerivativeRow) {
    svgParts.push(`<text x="${leftLabelWidth / 2}" y="${rowXHeight + 25}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" fill="#111827">y'</text>`);
  }
  svgParts.push(`<text x="${leftLabelWidth / 2}" y="${rowXHeight + rowYPrimeHeight + rowYHeight / 2 + 5}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" fill="#111827">y</text>`);

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

  // 8. HÀNG Y: MŨI TÊN BIẾN THIÊN (TÍNH TOÁN KHOẢNG CÁCH CHÍNH XÁC, KHÔNG CẮT CHỮ)
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
      // Khi đạo hàm y' mang dấu "-" (nghịch biến): BẮT BUỘC điểm bắt đầu ở tầng trên (top) dốc chéo xuống tầng dưới (bottom)
      pos1 = 'top';
      pos2 = 'bottom';
    } else if (isIncreasing) {
      // Khi đạo hàm y' mang dấu "+" (đồng biến): BẮT BUỘC điểm bắt đầu ở tầng dưới (bottom) dốc chéo lên tầng trên (top)
      pos1 = 'bottom';
      pos2 = 'top';
    } else if (pos1 === pos2) {
      // Nếu 2 vị trí trùng nhau, so sánh giá trị y nếu có hoặc ép dốc nhẹ tránh đường nằm ngang tuyệt đối
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

    // Tính toán vùng biên của giá trị điểm xuất phát
    let x1 = startX;
    if (p1.isAsymptote) {
      const rightW = getTextWidthEstimate(p1.yRightVal);
      x1 = startX + 6 + rightW + 8;
    } else {
      const w = getTextWidthEstimate(p1.yVal);
      x1 = startX + w / 2 + 8;
    }

    // Tính toán vùng biên của giá trị điểm kết thúc
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
  let s = text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/[’`´′]/g, "'")
    .replace(/\\prime/g, "'")
    .replace(/[−–—]/g, '-');

  // Xử lý tiền xử lý đặc biệt cho các bảng copy từ web/HTML có dòng bị bẻ đôi giữa các ô
  if (s.includes('|')) {
    const lines = s.split('\n');
    const resultLines: string[] = [];
    let inTable = false;
    let tableBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('|')) {
        inTable = true;
        tableBuffer.push(line);
      } else if (inTable && (line === '' || /^(?:Câu|Bài|Giá trị|Đáp án|##|\d+[\.\)])/i.test(line))) {
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

  // 1. Tách văn bản đứng trước bảng nếu bị dính liền trên 1 dòng:
  s = s.replace(/([^\n|])\s*(\|(?:\s*\$?[xt]\$?|\s*[xt]\s*)\s*\|)/gi, '$1\n\n$2');

  // 1.1 Xóa các dòng trống hoặc khoảng trắng thừa giữa các hàng bảng để đảm bảo các hàng nối liền nhau
  s = s.replace(/(\|[^\n]+\|)[ \t]*\n\s*\n[ \t]*(\|)/g, '$1\n$2');

  // 2. Tách giữa hàng đầu (x) và hàng phân cách |---| nếu có:
  s = s.replace(/(\|)[ \t]+(\|\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|)/g, '$1\n$2');

  // 3. Tách trước hàng y' / f'(x) nếu cùng 1 dòng
  s = s.replace(/(\|)[ \t]+(\|\s*\$?(?:y['’′]|y\^\{\s*['’′\\prime]\s*\}|y\^\\prime|f['’′]|g['’′]|f\^\{\s*['’′\\prime]\s*\}|g\^\{\s*['’′\\prime]\s*\}|f['’′]?\s*\([a-z]\)|g['’′]?\s*\([a-z]\))\$?[\s|])/gi, '$1\n$2');

  // 4. Tách trước hàng y / f(x) nếu cùng 1 dòng:
  s = s.replace(/(\|)[ \t]+(\|\s*\$?(?:y|f\s*\([a-z]\)|g\s*\([a-z]\))\$?[\s|])/gi, '$1\n$2');

  // 5. Tách văn bản đứng sau bảng nếu dính liền với hàng cuối:
  s = s.replace(/(\|\s*)([^\n|]+)$/gm, (_match, pipe, rest) => {
    const trimmedRest = rest.trim();
    if (trimmedRest && !trimmedRest.startsWith('|')) {
      return `${pipe.trim()}\n\n${trimmedRest}`;
    }
    return `${pipe}${rest}`;
  });

  // Đảm bảo không còn dòng trắng nào giữa các hàng markdown table
  s = s.replace(/(\|[^\n]+\|)[ \t]*\n\s*\n[ \t]*(\|)/g, '$1\n$2');

  return s;
}

function collapseMultilineTableLines(tblLines: string[]): string {
  const joined = tblLines.join(' ');
  const sepMatch = joined.match(/\|\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|/);
  if (!sepMatch) return tblLines.join('\n');

  const sepIdx = sepMatch.index || 0;
  const beforeSep = joined.substring(0, sepIdx).trim();
  const sepStr = sepMatch[0].trim();
  const afterSep = joined.substring(sepIdx + sepMatch[0].length).trim();

  // Tìm vị trí phân cách giữa hàng đạo hàm (row 3) và hàng giá trị f(x) (row 4)
  const row4Match = afterSep.match(/(?:\|\s*)(?:f\s*\([a-z]\)|y\b)/i);
  let row2 = afterSep;
  let row3 = '';
  if (row4Match && row4Match.index !== undefined && row4Match.index > 3) {
    row2 = afterSep.substring(0, row4Match.index).trim();
    row3 = afterSep.substring(row4Match.index).trim();
    if (!row3.startsWith('|')) row3 = '| ' + row3;
  }

  const cleanRowCells = (r: string) => {
    return r.split('|').map(cell => {
      let c = cell.replace(/\s+/g, ' ').trim();
      if (/e\s*a\s*r\s*r\s*o\s*w/i.test(c) || /n\s*e\s*a\s*r\s*r\s*o\s*w/i.test(c)) return '↗';
      if (/s\s*e\s*a\s*r\s*r\s*o\s*w/i.test(c)) return '↘';
      if (c === '--' || c === '- -') return '-';
      if (c === '++' || c === '+ +') return '+';
      if (c === '00' || c === '0 0') return '0';
      if (c === '11' || c === '1 1') return '1';
      if (c === '22' || c === '2 2') return '2';
      if (c === '55' || c === '5 5') return '5';
      if (c === '↘↘' || c === '↘ ↘') return '↘';
      if (c === '↗↗' || c === '↗ ↗') return '↗';
      if (c === '-∞-∞' || c === '- ∞ -∞' || c === '-∞ -∞') return '-∞';
      if (c === '+∞+∞' || c === '+ ∞ +∞' || c === '+∞ +∞') return '+∞';
      if (c === '-1-1' || c === '- 1 -1' || c === '-1 -1') return '-1';
      if (c.includes("f'(x)") || c.includes("f ′ (x)") || c.includes("f' (x)")) return "f'(x)";
      if (c.includes("f(x)")) return "f(x)";
      if (c === 'xx' || c === 'x x') return 'x';
      const parts = c.split(' ');
      if (parts.length === 2 && parts[0] === parts[1]) return parts[0];
      return c;
    }).join(' | ');
  };

  const rows = [cleanRowCells(beforeSep).trim(), sepStr, cleanRowCells(row2).trim()];
  if (row3) rows.push(cleanRowCells(row3).trim());
  return rows.join('\n');
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
      return line
        .slice(1, -1)
        .split(/(?<!\\)\|/)
        .map(cell => cell.trim());
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
    } else {
      // 2-row table (Toán 10 parabol, hàm số đồng biến/nghịch biến đơn giản)
      yCells = rowCells[1].slice(1);
    }

    // 1. Lọc danh sách mốc x hợp lệ
    const xValues: string[] = [];
    for (let c = 0; c < xCells.length; c++) {
      const val = cleanMathText(xCells[c]);
      if (val && val !== '') {
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
        // - Nhóm có 2 giá trị (ví dụ: ["-\\infty", "+\\infty"])
        // - Hoặc giá trị chứa vạch đôi || (ví dụ: "-\\infty || +\\infty")
        // - Hoặc hàng y' tại mốc này có vạch đôi || hoặc d
        const yPcell = yPrimeCells.find((c, idx) => (c.includes('||') || c.includes('\\|') || c === 'd') && (idx === i || idx === i * 2));
        const hasDoubleBarInYP = !!yPcell;

        let isAsym = false;
        let yVal: string | undefined = undefined;
        let yLeftVal: string | undefined = undefined;
        let yRightVal: string | undefined = undefined;

        if (group.length >= 2) {
          isAsym = true;
          yLeftVal = group[0];
          yRightVal = group[1];
        } else if (group.length === 1 && (group[0].includes('||') || group[0].includes('\\|'))) {
          isAsym = true;
          const parts = group[0].split(/\|\||\\\|/).map(s => s.trim());
          yLeftVal = parts[0] || '+\\infty';
          yRightVal = parts[1] || '-\\infty';
        } else if (group.length === 1) {
          if (hasDoubleBarInYP && i > 0 && i < xValues.length - 1) {
            isAsym = true;
            yLeftVal = group[0];
            yRightVal = group[0];
          } else {
            yVal = group[0];
          }
        }

        let yPos: 'top' | 'bottom' | 'middle' = 'middle';
        if (yVal) {
          if (yVal.includes('-\\infty') || yVal.includes('-∞')) yPos = 'bottom';
          else if (yVal.includes('+\\infty') || yVal.includes('+∞')) yPos = 'top';
        }

        points.push({
          x: xVal,
          yPrime: isAsym ? '||' : (i > 0 && i < xValues.length - 1 ? '0' : undefined),
          isAsymptote: isAsym,
          yVal: isAsym ? undefined : yVal,
          yPosition: yPos,
          yLeftVal,
          yLeftPosition: yLeftVal?.includes('-') ? 'bottom' : 'top',
          yRightVal,
          yRightPosition: yRightVal?.includes('+') ? 'top' : 'bottom'
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

        const isAsym = (yP && (yP === '||' || yP.includes('||') || yP.includes('\\|') || yP === 'd')) || yValRaw.includes('||') || yValRaw.includes('\\|');

        let yLeftVal: string | undefined;
        let yRightVal: string | undefined;
        let cleanYVal = yValRaw;

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
        if (cleanYVal.includes('-\\infty') || cleanYVal.includes('-∞')) {
          yPos = 'bottom';
        } else if (cleanYVal.includes('+\\infty') || cleanYVal.includes('+∞') || cleanYVal.includes('∞')) {
          yPos = 'top';
        }

        points.push({
          x: xVal,
          yPrime: isAsym ? '||' : (yP === '0' ? '0' : undefined),
          isAsymptote: isAsym,
          yVal: isAsym ? undefined : cleanYVal,
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
      functionName: '',
      points,
      intervals
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
  const cleaned = str
    .replace(/\s+/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4');

  const formatted = cleaned.replace(/(?<=[0-9x])\-/g, '+-');
  const tokens = formatted.split('+').filter(Boolean);

  for (const tok of tokens) {
    if (tok.includes('x')) {
      const parts = tok.split('x');
      const coeffStr = parts[0];
      const powStr = parts[1] ? parts[1].replace(/^\^/, '') : '1';

      let coeff = 1;
      if (coeffStr === '' || coeffStr === '+') coeff = 1;
      else if (coeffStr === '-') coeff = -1;
      else coeff = parseFloat(coeffStr);

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
  } catch (err) {}

  return null;
}
