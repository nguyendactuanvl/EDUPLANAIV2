/**
 * BẢNG BIẾN THIÊN (BBT) CHUẨN ĐỒ HỌA SÁCH GIÁO KHOA GDPT MỚI
 * - Tự động nhận diện và chuyển đổi mọi Bảng biến thiên (từ Markdown table, TikZ tkz-tab, mã BBT)
 * - Khung bảng: 1 vách dọc phân cách nhãn (x, y', y), 2 vách ngang (dưới hàng x và dưới hàng y')
 * - Hàng y: Canvas SVG vẽ mũi tên liền mạch, dài thanh thoát, không chia ô HTML
 * - Vạch || tiệm cận đứng kéo dài từ hàng y' xuống tận đáy hàng y
 * - Vùng ngoài tập xác định được tô họa tiết gạch chéo //
 */

import { BBTData, BBTPoint, BBTInterval } from '../components/math-tools/VariationTableGenerator';

export function cleanMathText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/[’`´]/g, "'")
    .replace(/\\prime/g, "'")
    .replace(/\^\{\s*['’]\s*\}/g, "'")
    .replace(/\^\{\s*\\prime\s*\}/g, "'")
    .replace(/\\infty/g, '∞')
    .replace(/\+\\infty/g, '+∞')
    .replace(/-\\infty/g, '-∞')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\mathbb\{R\}/g, 'ℝ')
    .replace(/_([a-zA-Z0-9])/g, '$1')
    .replace(/\$/g, '')
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
  const colSpacing = Math.max(100, Math.min(160, Math.round(520 / Math.max(numPoints - 1, 1))));
  const contentWidth = Math.max(480, (numPoints - 1) * colSpacing + 80);
  const totalWidth = leftLabelWidth + contentWidth;

  const rowXHeight = 40;
  const rowYPrimeHeight = 40;
  const rowYHeight = 135;
  const totalHeight = rowXHeight + rowYPrimeHeight + rowYHeight;

  const paddingX = 40;
  const usableWidth = contentWidth - 2 * paddingX;
  const stepX = numPoints > 1 ? usableWidth / (numPoints - 1) : usableWidth;

  const getPointX = (index: number) => leftLabelWidth + paddingX + index * stepX;

  const getYPosValue = (pos?: 'top' | 'bottom' | 'middle') => {
    const yStart = rowXHeight + rowYPrimeHeight;
    if (pos === 'top') return yStart + 24;
    if (pos === 'bottom') return yStart + rowYHeight - 16;
    return yStart + rowYHeight / 2 + 4;
  };

  const svgParts: string[] = [];

  // 1. DEFS: Arrow markers and hatch patterns
  svgParts.push(`<defs>
    <marker id="bbt-arrow-marker" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e40af" />
    </marker>
    <pattern id="bbt-hatch-pattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" stroke-width="1.2" />
    </pattern>
  </defs>`);

  // 2. KHUNG NGOÀI & VÁCH NGĂN CHUẨN SGK (1 vách dọc, 2 vách ngang)
  svgParts.push(`<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#ffffff" stroke="#1e293b" stroke-width="1.6" rx="6" />`);
  // Vách dọc duy nhất
  svgParts.push(`<line x1="${leftLabelWidth}" y1="0" x2="${leftLabelWidth}" y2="${totalHeight}" stroke="#1e293b" stroke-width="1.5" />`);
  // Vách ngang 1 (dưới hàng x)
  svgParts.push(`<line x1="0" y1="${rowXHeight}" x2="${totalWidth}" y2="${rowXHeight}" stroke="#1e293b" stroke-width="1.5" />`);
  // Vách ngang 2 (dưới hàng y')
  svgParts.push(`<line x1="0" y1="${rowXHeight + rowYPrimeHeight}" x2="${totalWidth}" y2="${rowXHeight + rowYPrimeHeight}" stroke="#1e293b" stroke-width="1.5" />`);

  // 3. CỘT NHÃN TRÁI: x, y', y
  svgParts.push(`<text x="${leftLabelWidth / 2}" y="26" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" font-weight="bold" fill="#0f172a">x</text>`);
  svgParts.push(`<text x="${leftLabelWidth / 2}" y="${rowXHeight + 26}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" font-weight="bold" fill="#0f172a">y'</text>`);
  svgParts.push(`<text x="${leftLabelWidth / 2}" y="${rowXHeight + rowYPrimeHeight + rowYHeight / 2 + 6}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="18" font-style="italic" font-weight="bold" fill="#0f172a">y</text>`);

  // 4. HÀNG X: CÁC ĐIỂM MỐC
  points.forEach((pt, idx) => {
    const xPos = getPointX(idx);
    svgParts.push(`<text x="${xPos}" y="26" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="16" font-weight="bold" fill="#0f172a">${cleanMathText(pt.x)}</text>`);
  });

  // 5. MIỀN NGOÀI TẬP XÁC ĐỊNH (GẠCH CHÉO // XUYÊN SUỐT)
  intervals.forEach((inter, idx) => {
    if (!inter.isExcludedDomain) return;
    const xLeft = getPointX(idx);
    const xRight = getPointX(idx + 1);
    svgParts.push(`<rect x="${xLeft}" y="${rowXHeight}" width="${xRight - xLeft}" height="${rowYPrimeHeight + rowYHeight}" fill="url(#bbt-hatch-pattern)" stroke="#64748b" stroke-width="0.5" />`);
  });

  // 6. HÀNG Y': DẤU (+, -)
  intervals.forEach((inter, idx) => {
    if (inter.isExcludedDomain || !inter.sign) return;
    const midX = (getPointX(idx) + getPointX(idx + 1)) / 2;
    svgParts.push(`<text x="${midX}" y="${rowXHeight + 27}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="20" font-weight="bold" fill="#1e40af">${inter.sign}</text>`);
  });

  // 7. HÀNG Y': ĐIỂM 0 HOẶC VẠCH ||
  points.forEach((pt, idx) => {
    const xPos = getPointX(idx);

    if (pt.isAsymptote) {
      // Tiệm cận đứng: kéo dài từ hàng y' xuống tận đáy hàng y
      svgParts.push(`<line x1="${xPos - 2}" y1="${rowXHeight}" x2="${xPos - 2}" y2="${totalHeight}" stroke="#dc2626" stroke-width="1.5" />`);
      svgParts.push(`<line x1="${xPos + 2}" y1="${rowXHeight}" x2="${xPos + 2}" y2="${totalHeight}" stroke="#dc2626" stroke-width="1.5" />`);
    } else if (pt.isDerivativeUndefinedOnly) {
      // Chỉ y' không xác định (ví dụ biên hàm căn thức) -> vạch || chỉ ở hàng y'
      svgParts.push(`<line x1="${xPos - 2}" y1="${rowXHeight}" x2="${xPos - 2}" y2="${rowXHeight + rowYPrimeHeight}" stroke="#dc2626" stroke-width="1.4" />`);
      svgParts.push(`<line x1="${xPos + 2}" y1="${rowXHeight}" x2="${xPos + 2}" y2="${rowXHeight + rowYPrimeHeight}" stroke="#dc2626" stroke-width="1.4" />`);
    } else if (pt.yPrime === '0') {
      svgParts.push(`<text x="${xPos}" y="${rowXHeight + 26}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="16" fill="#334155">0</text>`);
    }
  });

  // 8. HÀNG Y: MŨI TÊN BIẾN THIÊN
  for (let i = 0; i < numPoints - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const inter = intervals[i];

    if (inter?.isExcludedDomain) continue;

    const startX = getPointX(i);
    const endX = getPointX(i + 1);

    const y1 = getYPosValue(p1.isAsymptote ? p1.yRightPosition || 'bottom' : p1.yPosition);
    const x1 = p1.isAsymptote ? startX + 16 : startX + 18;

    const y2 = getYPosValue(p2.isAsymptote ? p2.yLeftPosition || 'top' : p2.yPosition);
    const x2 = p2.isAsymptote ? endX - 16 : endX - 18;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);

    if (dist > 28) {
      const margin = 10;
      const nx = dx / dist;
      const ny = dy / dist;
      const sx = (x1 + nx * margin).toFixed(1);
      const sy = (y1 + ny * margin - 4).toFixed(1);
      const ex = (x2 - nx * margin).toFixed(1);
      const ey = (y2 - ny * margin - 4).toFixed(1);

      svgParts.push(`<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="#1d4ed8" stroke-width="1.8" marker-end="url(#bbt-arrow-marker)" stroke-linecap="round" />`);
    }
  }

  // 9. HÀNG Y: CÁC GIÁ TRỊ ĐẦU MÚT MŨI TÊN
  points.forEach((pt, idx) => {
    const xPos = getPointX(idx);

    if (pt.isAsymptote) {
      const yLeft = getYPosValue(pt.yLeftPosition || 'top');
      const yRight = getYPosValue(pt.yRightPosition || 'bottom');

      if (pt.yLeftVal) {
        svgParts.push(`<text x="${xPos - 12}" y="${yLeft}" text-anchor="end" font-family="'Times New Roman', Times, serif" font-size="15" font-weight="bold" fill="#0f172a">${cleanMathText(pt.yLeftVal)}</text>`);
      }
      if (pt.yRightVal) {
        svgParts.push(`<text x="${xPos + 12}" y="${yRight}" text-anchor="start" font-family="'Times New Roman', Times, serif" font-size="15" font-weight="bold" fill="#0f172a">${cleanMathText(pt.yRightVal)}</text>`);
      }
    } else if (pt.yVal) {
      const yCoord = getYPosValue(pt.yPosition);
      svgParts.push(`<text x="${xPos}" y="${yCoord}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="15" font-weight="bold" fill="#0f172a">${cleanMathText(pt.yVal)}</text>`);
    }
  });

  return `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" class="max-w-full h-auto mx-auto my-3 drop-shadow-sm bg-white rounded-lg">
    ${svgParts.join('\n    ')}
  </svg>`;
}

/**
 * Tự động phục hồi và ngắt dòng chuẩn cho Bảng biến thiên (BBT) dạng Markdown table
 * nếu bị dính liền trên 1 dòng hoặc dính vào câu văn dẫn xuất của đề thi
 */
export function unflattenMarkdownTables(text: string): string {
  if (!text || !text.includes('|')) return text;
  let s = text.replace(/[’`´]/g, "'").replace(/\\prime/g, "'");

  // 1. Tách văn bản đứng trước bảng nếu bị dính liền trên 1 dòng:
  // e.g. "như sau? | x |" hoặc "sau?|$x$|" hoặc "sau? | $x$ |"
  s = s.replace(/([^\n|])\s*(\|(?:\s*\$?[xt]\$?|\s*[xt]\s*)\s*\|)/gi, '$1\n\n$2');

  // 2. Tách giữa hàng đầu (x) và hàng phân cách |---| nếu có:
  s = s.replace(/(\|\s*)(?:[ \t]*)(\|\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|)/g, '$1\n$2');

  // 3. Tách trước hàng y' (kể cả có hàng |---| hay không có hàng |---|):
  s = s.replace(/(\|\s*)(?:[ \t]*)(\|\s*\$?(?:y['’]|y\^\{\s*['’\\prime]\s*\}|y\^\\prime|f['’]|g['’]|f\^\{\s*['’\\prime]\s*\}|g\^\{\s*['’\\prime]\s*\}|f['’]\s*\([a-z]\)|g['’]\s*\([a-z]\))\$?[\s|])/gi, '$1\n$2');

  // 4. Tách trước hàng y / f(x):
  s = s.replace(/(\|\s*)(?:[ \t]*)(\|\s*\$?(?:y|f\s*\([a-z]\)|g\s*\([a-z]\))\$?[\s|])/gi, '$1\n$2');

  // 5. Tách văn bản đứng sau bảng nếu dính liền với hàng cuối:
  s = s.replace(/(\|\s*)([^\n|]+)$/gm, (_match, pipe, rest) => {
    const trimmedRest = rest.trim();
    if (trimmedRest && !trimmedRest.startsWith('|')) {
      return `${pipe.trim()}\n\n${trimmedRest}`;
    }
    return `${pipe}${rest}`;
  });

  return s;
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
    const isRow1X = row1Header === 'x' || row1Header === 't' || (row1Header === '' && rowCells[0].length >= 3);
    if (!isRow1X) return null;

    // Kiểm tra hàng 2: y' hoặc f'(x) hoặc y
    const row2Header = cleanMathText(rowCells[1][0]).toLowerCase().replace(/[\$\s]/g, '');
    const hasDerivative = row2Header.includes("y'") || row2Header.includes("f'") || row2Header.includes("g'");

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
      const val = xCells[c].replace(/\$/g, '').trim();
      if (val && val !== '') {
        xValues.push(val);
      }
    }
    if (xValues.length < 2) return null;

    // 2. Trích xuất dấu của y'
    const signs: Array<'+' | '-' | ''> = [];
    yPrimeCells.forEach(cell => {
      const s = cell.replace(/\$/g, '').trim();
      if (s === '+' || s === '-') {
        signs.push(s);
      }
    });

    // 3. Phân tích hàng y theo token mũi tên (Arrow-based parsing)
    const isArrow = (txt: string) => {
      const clean = txt.replace(/\$/g, '').trim();
      return clean.includes('\\nearrow') || clean.includes('↗') || clean.includes('\\searrow') || clean.includes('↘');
    };

    const getTrend = (txt: string): 'increasing' | 'decreasing' => {
      const clean = txt.replace(/\$/g, '').trim();
      if (clean.includes('\\searrow') || clean.includes('↘')) return 'decreasing';
      return 'increasing';
    };

    const yTokens = yCells
      .map(c => c.replace(/\$/g, '').trim())
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

/**
 * Bộ giải tích toán học tự động (Deterministic Math Analyzer):
 * Tự động tính toán giải tích chuẩn xác 100% cho các hàm số phổ biến (Lớp 10, 11, 12):
 * - Hàm phân thức bậc nhất/bậc nhất y = (ax+b)/(cx+d)
 * - Hàm bậc ba y = ax^3 + bx^2 + cx + d
 * - Hàm trùng phương y = ax^4 + bx^2 + c
 * - Hàm bậc hai (Parabol) y = ax^2 + bx + c
 * Hoạt động offline 0ms, không phụ thuộc vào Gemini API hay quota mạng!
 */
export function analyzeFunctionToBbt(expression: string): BBTData | null {
  if (!expression || !expression.trim()) return null;

  try {
    let clean = expression
      .replace(/\s+/g, '')
      .replace(/\$/g, '')
      .replace(/^y\s*=\s*/i, '')
      .replace(/^f\([a-z]\)\s*=\s*/i, '');

    // 1. Hàm phân thức bậc nhất / bậc nhất y = (ax+b)/(cx+d) hoặc \frac{ax+b}{cx+d}
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
      const parseLinear = (s: string): { a: number; b: number } | null => {
        const m = s.match(/^([+-]?\d*(?:\.\d+)?)x([+-]\d+(?:\.\d+)?)?$/i) ||
                  s.match(/^([+-]?\d*(?:\.\d+)?)x$/i) ||
                  s.match(/^([+-]\d+(?:\.\d+)?)\+([+-]?\d*(?:\.\d+)?)x$/i);
        if (!m) return null;
        let aVal = 1;
        let bVal = 0;
        if (m[2] !== undefined) {
          const aStr = m[1];
          aVal = aStr === '' || aStr === '+' ? 1 : (aStr === '-' ? -1 : parseFloat(aStr));
          bVal = parseFloat(m[2]);
        } else {
          const aStr = m[1];
          aVal = aStr === '' || aStr === '+' ? 1 : (aStr === '-' ? -1 : parseFloat(aStr));
        }
        return { a: aVal, b: bVal };
      };

      const linNum = parseLinear(numStr);
      const linDen = parseLinear(denStr);

      if (linNum && linDen && linDen.a !== 0) {
        const a = linNum.a;
        const b = linNum.b;
        const c = linDen.a;
        const d = linDen.b;

        const x0 = -d / c;
        const x0Str = Number.isInteger(x0) ? String(x0) : (x0 > 0 ? `${-d}/${c}` : `-${d}/${-c}`);
        const det = a * d - b * c;
        const isIncreasing = det > 0;
        const horizVal = Number.isInteger(a / c) ? String(a / c) : `${a}/${c}`;

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
          points,
          intervals
        };
      }
    }

    // 2. Hàm bậc 3: y = ax^3 + bx^2 + cx + d
    const cubicRegex = /^(?:([+-]?\d*(?:\.\d+)?)x\^3)?(?:([+-]\d*(?:\.\d+)?)x\^2)?(?:([+-]\d*(?:\.\d+)?)x)?([+-]\d+(?:\.\d+)?)?$/i;
    const cubicMatch = clean.match(cubicRegex);
    if (cubicMatch && (clean.includes('x^3') || clean.includes('x³'))) {
      const parseCoeff = (s?: string, def = 0): number => {
        if (!s) return def;
        if (s === '' || s === '+') return 1;
        if (s === '-') return -1;
        return parseFloat(s);
      };

      const a = parseCoeff(cubicMatch[1], 1);
      const b = parseCoeff(cubicMatch[2], 0);
      const c = parseCoeff(cubicMatch[3], 0);
      const d = cubicMatch[4] ? parseFloat(cubicMatch[4]) : 0;

      if (a !== 0) {
        // y' = 3ax^2 + 2bx + c
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

          const formatNum = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

          const points: BBTPoint[] = [
            { x: '-\\infty', yVal: a > 0 ? '-\\infty' : '+\\infty', yPosition: a > 0 ? 'bottom' : 'top' },
            { x: formatNum(x1), yPrime: '0', yVal: formatNum(y1), yPosition: a > 0 ? 'top' : 'bottom' },
            { x: formatNum(x2), yPrime: '0', yVal: formatNum(y2), yPosition: a > 0 ? 'bottom' : 'top' },
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
            functionName: `y = ${expression.replace(/^y\s*=\s*/i, '')}`,
            points,
            intervals
          };
        }
      }
    }

    // 3. Hàm bậc 2 (Parabol): y = ax^2 + bx + c
    const quadRegex = /^(?:([+-]?\d*(?:\.\d+)?)x\^2)?(?:([+-]\d*(?:\.\d+)?)x)?([+-]\d+(?:\.\d+)?)?$/i;
    const quadMatch = clean.match(quadRegex);
    if (quadMatch && (clean.includes('x^2') || clean.includes('x²')) && !clean.includes('x^3') && !clean.includes('x^4')) {
      const parseCoeff = (s?: string, def = 0): number => {
        if (!s) return def;
        if (s === '' || s === '+') return 1;
        if (s === '-') return -1;
        return parseFloat(s);
      };

      const a = parseCoeff(quadMatch[1], 1);
      const b = parseCoeff(quadMatch[2], 0);
      const c = quadMatch[3] ? parseFloat(quadMatch[3]) : 0;

      if (a !== 0) {
        const xv = -b / (2 * a);
        const yv = a * xv * xv + b * xv + c;
        const formatNum = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

        const points: BBTPoint[] = [
          { x: '-\\infty', yVal: a > 0 ? '+\\infty' : '-\\infty', yPosition: a > 0 ? 'top' : 'bottom' },
          { x: formatNum(xv), yPrime: '0', yVal: formatNum(yv), yPosition: a > 0 ? 'bottom' : 'top' },
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
          functionName: `y = ${expression.replace(/^y\s*=\s*/i, '')}`,
          points,
          intervals
        };
      }
    }
  } catch (err) {}

  return null;
}
