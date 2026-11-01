import { XLSX } from '../lib/xlsxUtils';

// =====================================================================
// DATA TYPES FOR OMR & EXAM GRADING (CHUẨN BỘ GD&ĐT 2018)
// =====================================================================

export interface OMRPart1AnswerKey {
  // question number (1-40) -> 'A' | 'B' | 'C' | 'D'
  [qNum: number]: string;
}

export interface OMRPart2AnswerKey {
  // question number (1-8) -> { a: boolean, b: boolean, c: boolean, d: boolean }
  [qNum: number]: {
    a?: boolean;
    b?: boolean;
    c?: boolean;
    d?: boolean;
  };
}

export interface OMRPart3AnswerKey {
  // question number (1-6) -> answer string (e.g. "12.5" or "-3,4" or "4")
  [qNum: number]: string;
}

export interface OMRExamKey {
  code: string; // e.g. "101", "102", "1001"
  name?: string;
  part1: OMRPart1AnswerKey;
  part2: OMRPart2AnswerKey;
  part3: OMRPart3AnswerKey;
  essayMaxPoints?: number; // Optional essay max score
}

export interface StudentPart1ScanResult {
  qNum: number;
  chosen: string | null; // 'A' | 'B' | 'C' | 'D' | null (nếu không tô / tô đè)
  correctKey: string | null;
  isCorrect: boolean;
  score: number;
  confidence: number;
}

export interface StudentPart2StatementResult {
  label: 'a' | 'b' | 'c' | 'd';
  chosen: boolean | null; // true = Đ, false = S, null = chưa tô/lỗi
  correctKey: boolean | null;
  isCorrect: boolean;
}

export interface StudentPart2ScanResult {
  qNum: number;
  statements: StudentPart2StatementResult[];
  correctCount: number; // 0, 1, 2, 3, 4
  score: number; // 0.1, 0.25, 0.5, 1.0
}

export interface StudentPart3ScanResult {
  qNum: number;
  rawString: string; // parsed string e.g. "-2,5"
  normalizedString: string;
  correctKey: string | null;
  isCorrect: boolean;
  score: number; // 0.5 if correct
  confidence: number;
}

export interface StudentOMRResult {
  id: string; // unique ID
  timestamp: number;
  studentId: string; // SBD (6 digits e.g. "012345")
  examCode: string; // Mã đề (3 digits e.g. "101")
  examCodeConfidence: number;
  studentIdConfidence: number;
  needsReview: boolean; // true if exam code or sbd has low confidence
  reviewReason?: string;

  // Breakdown results
  part1Results: StudentPart1ScanResult[];
  part2Results: StudentPart2ScanResult[];
  part3Results: StudentPart3ScanResult[];

  // Scores
  scorePart1: number;
  scorePart2: number;
  scorePart3: number;
  essayScore?: number;
  totalScore: number; // Out of 10.0

  // Visuals
  annotatedImageUrl?: string; // Image with green/red circles and score header
  originalImageUrl?: string;
}

// =====================================================================
// MOET 2018 SCORING FORMULAS
// =====================================================================

/**
 * Tính điểm Phần II lũy tiến chuẩn Bộ GD&ĐT:
 * - Đúng 1 ý: 0.1 điểm
 * - Đúng 2 ý: 0.25 điểm
 * - Đúng 3 ý: 0.50 điểm
 * - Đúng 4 ý: 1.00 điểm
 */
export function calculatePart2QuestionScore(correctCount: number): number {
  switch (correctCount) {
    case 1:
      return 0.1;
    case 2:
      return 0.25;
    case 3:
      return 0.5;
    case 4:
      return 1.0;
    default:
      return 0.0;
  }
}

/**
 * Chuẩn hóa số học Phần III để so sánh:
 * Hỗ trợ dấu chấm '.' và phẩy ',' tương đương nhau, loại bỏ số 0 thừa.
 */
export function normalizeShortAnswer(val: string | null | undefined): string {
  if (!val) return '';
  let clean = val.trim().replace(/\s+/g, '').replace(/\$/g, '');
  // Đổi dấu phẩy sang dấu chấm để so sánh số thực
  clean = clean.replace(/,/g, '.');
  
  // Kiểm tra nếu là số thực hợp lệ
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    // Trả về số làm tròn đến 4 chữ số thập phân nếu cần
    return Number(num.toFixed(4)).toString();
  }
  return clean.toLowerCase();
}

export function isShortAnswerMatch(studentAns: string, keyAns: string): boolean {
  if (!studentAns || !keyAns) return false;
  const sNorm = normalizeShortAnswer(studentAns);
  const kNorm = normalizeShortAnswer(keyAns);
  if (sNorm === kNorm) return true;

  // Trường hợp phân số hoặc căn thức đặc biệt
  const sClean = studentAns.trim().replace(/\s+/g, '').replace(/,/g, '.');
  const kClean = keyAns.trim().replace(/\s+/g, '').replace(/,/g, '.');
  return sClean === kClean;
}

// =====================================================================
// PARSER FOR FAST TEXT INPUT & EXCEL ANSWER KEYS
// =====================================================================

/**
 * Phân tích chuỗi đáp án nhanh dạng Text do giáo viên nhập:
 * Hỗ trợ:
 * - Phần I: "1A 2B 3C..." hoặc "1.A 2.B" hoặc "1-A, 2-B"
 * - Phần II: "1(ĐĐSS) 2(ĐSĐS)..." hoặc "1: aĐ, bS, cĐ, dS" hoặc "1: TTFF" hoặc "1: a-Đ b-S..."
 * - Phần III: "1: 1.5 | 2: -2.5 | 3: 4" hoặc "1: 1.5, 2: -2.5" hoặc mỗi câu 1 dòng
 */
export function parseFastTextAnswerKey(rawText: string, examCode: string): OMRExamKey {
  const part1: OMRPart1AnswerKey = {};
  const part2: OMRPart2AnswerKey = {};
  const part3: OMRPart3AnswerKey = {};

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  // Split into sections if markers exist (PHẦN I, PHẦN II, PHẦN III)
  let currentSection = 0; // 0 = auto-detect, 1 = Part 1, 2 = Part 2, 3 = Part 3

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.includes('PHẦN I') || upper.includes('PHAN I') || upper.includes('PART 1')) {
      currentSection = 1;
      continue;
    }
    if (upper.includes('PHẦN II') || upper.includes('PHAN II') || upper.includes('PART 2')) {
      currentSection = 2;
      continue;
    }
    if (upper.includes('PHẦN III') || upper.includes('PHAN III') || upper.includes('PART 3')) {
      currentSection = 3;
      continue;
    }

    // Try Part 2 pattern: e.g. "1(ĐĐSS)" or "1: ĐĐSS" or "Câu 1: TTFF" or "1: aĐ, bS, cĐ, dS"
    const part2BlockMatch = line.match(/(?:Câu\s*)?(\d+)[:\s]*[\(\[]?\s*([ĐDSTFdstf]{4})\s*[\)\]]?/gi);
    if (part2BlockMatch && (currentSection === 2 || currentSection === 0)) {
      for (const m of part2BlockMatch) {
        const sub = m.match(/(\d+)[:\s]*[\(\[]?\s*([ĐDSTFdstf]{4})/i);
        if (sub) {
          const qNum = parseInt(sub[1], 10);
          const chars = sub[2].toUpperCase().split('');
          part2[qNum] = {
            a: chars[0] === 'Đ' || chars[0] === 'T' || chars[0] === 'D',
            b: chars[1] === 'Đ' || chars[1] === 'T' || chars[1] === 'D',
            c: chars[2] === 'Đ' || chars[2] === 'T' || chars[2] === 'D',
            d: chars[3] === 'Đ' || chars[3] === 'T' || chars[3] === 'D',
          };
        }
      }
      if (part2BlockMatch.length > 0) continue;
    }

    // Part 2 individual format: "1: aĐ bS cĐ dS" or "1. a: Đúng, b: Sai..."
    if (currentSection === 2 || (line.includes('a') && line.includes('b') && (line.includes('Đ') || line.includes('S')))) {
      const qMatch = line.match(/(?:Câu\s*)?(\d+)/i);
      if (qMatch) {
        const qNum = parseInt(qMatch[1], 10);
        const aVal = /a[\:\s\)]*(?:Đ|Đúng|True|T)/i.test(line);
        const bVal = /b[\:\s\)]*(?:Đ|Đúng|True|T)/i.test(line);
        const cVal = /c[\:\s\)]*(?:Đ|Đúng|True|T)/i.test(line);
        const dVal = /d[\:\s\)]*(?:Đ|Đúng|True|T)/i.test(line);
        part2[qNum] = { a: aVal, b: bVal, c: cVal, d: dVal };
        continue;
      }
    }

    // Part 3 pattern: "1: 12.5 | 2: -3" or "Câu 1: 12.5"
    if (currentSection === 3 || line.includes('|') || /^(?:Câu\s*)?\d+[\:\=\s]+[-+]?\d+/i.test(line)) {
      const p3Items = line.split(/[|;\n]/);
      for (const item of p3Items) {
        const match = item.match(/(?:Câu\s*)?(\d+)[\:\=\s]+([^\s,;]+)/i);
        if (match) {
          const qNum = parseInt(match[1], 10);
          const val = match[2].trim();
          part3[qNum] = val;
        }
      }
      if (currentSection === 3) continue;
    }

    // Part 1 pattern: "1A 2B 3C..." or "1.A 2.B" or "1-A, 2-B"
    const p1Matches = line.matchAll(/(?:Câu\s*)?(\d+)[\.\:\-\s]*([A-D])\b/gi);
    let matchedP1 = false;
    for (const match of p1Matches) {
      const qNum = parseInt(match[1], 10);
      const opt = match[2].toUpperCase();
      part1[qNum] = opt;
      matchedP1 = true;
    }

    if (!matchedP1 && currentSection === 3) {
      // Direct key value: "Câu 1. 25"
      const m = line.match(/(?:Câu\s*)?(\d+)[\.\:\s]+([^\n\r]+)/i);
      if (m) {
        part3[parseInt(m[1], 10)] = m[2].trim();
      }
    }
  }

  return {
    code: examCode.trim() || '101',
    part1,
    part2,
    part3,
  };
}

/**
 * Đọc file Excel đáp án (.xlsx) do giáo viên tải lên:
 * Hỗ trợ bảng theo cột (Cột 1: Câu, Cột 2: Mã 101, Cột 3: Mã 102...)
 * hoặc bảng theo dòng.
 */
export async function parseExcelAnswerKeys(fileBuffer: ArrayBuffer): Promise<OMRExamKey[]> {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rawData.length === 0) return [];

  // Identify exam codes from header row
  const headerRow = rawData[0];
  const examKeysMap: Record<string, OMRExamKey> = {};

  // Check column-based format: Row 0 has ["Câu", "101", "102", "103", ...]
  const codeCols: { colIndex: number; code: string }[] = [];
  for (let c = 1; c < headerRow.length; c++) {
    const val = String(headerRow[c] || '').trim();
    if (val && /\d+/.test(val)) {
      const code = val.replace(/^[^\d]*/, '').trim();
      codeCols.push({ colIndex: c, code });
      examKeysMap[code] = {
        code,
        part1: {},
        part2: {},
        part3: {},
      };
    }
  }

  if (codeCols.length > 0) {
    // Process rows
    let currentPart = 1;
    for (let r = 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row || row.length === 0) continue;
      const firstCell = String(row[0] || '').trim().toUpperCase();

      if (firstCell.includes('PHẦN II') || firstCell.includes('PHAN II')) {
        currentPart = 2;
        continue;
      }
      if (firstCell.includes('PHẦN III') || firstCell.includes('PHAN III')) {
        currentPart = 3;
        continue;
      }

      const qNumMatch = firstCell.match(/\d+/);
      if (!qNumMatch) continue;
      const qNum = parseInt(qNumMatch[0], 10);

      for (const { colIndex, code } of codeCols) {
        const cellVal = String(row[colIndex] || '').trim();
        if (!cellVal) continue;

        if (currentPart === 1) {
          const letter = cellVal.toUpperCase().match(/[A-D]/);
          if (letter) {
            examKeysMap[code].part1[qNum] = letter[0];
          }
        } else if (currentPart === 2) {
          // Expecting e.g. "ĐĐSS" or "T,T,F,F"
          const clean = cellVal.replace(/[^ĐDSTFdstf]/g, '').toUpperCase();
          if (clean.length >= 4) {
            examKeysMap[code].part2[qNum] = {
              a: clean[0] === 'Đ' || clean[0] === 'T' || clean[0] === 'D',
              b: clean[1] === 'Đ' || clean[1] === 'T' || clean[1] === 'D',
              c: clean[2] === 'Đ' || clean[2] === 'T' || clean[2] === 'D',
              d: clean[3] === 'Đ' || clean[3] === 'T' || clean[3] === 'D',
            };
          }
        } else if (currentPart === 3) {
          examKeysMap[code].part3[qNum] = cellVal;
        }
      }
    }
  }

  return Object.values(examKeysMap);
}

// =====================================================================
// BROWSER-BASED OMR ENGINE (CANVAS COMPUTER VISION)
// =====================================================================

export interface OMRPoint {
  x: number;
  y: number;
}

export interface OMRBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Mẫu Phiếu Trả lời Trắc nghiệm chuẩn Bộ GD&ĐT (Normalized Frame 1200 x 1700):
 * - 4 Corner Alignment Markers tại các góc
 * - SBD (6 cột, 10 hàng 0-9)
 * - Mã đề (3 cột, 10 hàng 0-9)
 * - Phần I (40 câu: 4 cột lựa chọn A, B, C, D)
 * - Phần II (8 câu: mỗi câu 4 ý a,b,c,d; 2 lựa chọn Đ, S)
 * - Phần III (6 câu: 4 cột dọc ký tự -, ,, 0-9)
 */
export const OMR_SHEET_SPEC = {
  width: 1200,
  height: 1700,
  // 4 Corner Markers (outer coordinates in normalized 1200 x 1700)
  markers: {
    topLeft: { x: 40, y: 40, size: 40 },
    topRight: { x: 1120, y: 40, size: 40 },
    bottomLeft: { x: 40, y: 1620, size: 40 },
    bottomRight: { x: 1120, y: 1620, size: 40 },
  },
  // SBD Box (6 columns x 10 rows: 0 to 9)
  sbd: {
    x: 620,
    y: 200,
    cols: 6,
    rows: 10,
    cellW: 24,
    cellH: 20,
    radius: 7,
  },
  // Exam Code Box (4 columns x 10 rows: 0 to 9)
  examCode: {
    x: 880,
    y: 200,
    cols: 4,
    rows: 10,
    cellW: 24,
    cellH: 20,
    radius: 7,
  },
  // Phần I: 40 câu chia làm 2 cột lớn (Câu 1-20 bên trái, Câu 21-40 bên phải)
  part1: {
    col1: { x: 80, y: 480, startQ: 1, endQ: 20, qH: 24, optSpacing: 30, radius: 7 },
    col2: { x: 340, y: 480, startQ: 21, endQ: 40, qH: 24, optSpacing: 30, radius: 7 },
  },
  // Phần II: 8 câu (mỗi câu 4 ý a,b,c,d - 2 cột Đ/S)
  part2: {
    x: 600,
    y: 480,
    questions: 8,
    qH: 58,
    statementH: 14,
    trueXOffset: 95,
    falseXOffset: 125,
    radius: 6,
  },
  // Phần III: 6 câu trả lời ngắn (100% TÔ TRÒN)
  // Mỗi câu gồm 4 cột dọc.
  // Row 0: ô dấu '-' (chỉ cột 1)
  // Row 1: ô dấu ',' (cả 4 cột)
  // Row 2-11: ô chữ số '0' đến '9'
  part3: {
    x: 820,
    y: 480,
    questions: 6,
    qW: 52,
    qH: 180,
    colSpacing: 12,
    rowH: 14,
    radius: 5,
  },
};

/**
 * Helper: Tính độ tối (darkness score / fill ratio) của 1 ô tròn (bubble)
 */
export function measureBubbleFill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
): number {
  const r = Math.max(2, Math.round(radius));
  const diameter = r * 2;
  const startX = Math.max(0, Math.round(cx - r));
  const startY = Math.max(0, Math.round(cy - r));

  try {
    const imgData = ctx.getImageData(startX, startY, diameter, diameter);
    const data = imgData.data;
    let totalDarkness = 0;
    let count = 0;

    for (let y = 0; y < diameter; y++) {
      for (let x = 0; x < diameter; x++) {
        const dx = x - r;
        const dy = y - r;
        if (dx * dx + dy * dy <= r * r) {
          const idx = (y * diameter + x) * 4;
          // Grayscale luminance = 0.299R + 0.587G + 0.114B
          const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          // Darker pixel -> higher darkness (255 = completely black, 0 = pure white)
          totalDarkness += 255 - lum;
          count++;
        }
      }
    }

    if (count === 0) return 0;
    return totalDarkness / (count * 255); // Ratio from 0.0 to 1.0
  } catch (err) {
    return 0;
  }
}

/**
 * Perspective Warping: Kéo phẳng ảnh chụp từ 4 góc về khung chuẩn 1200 x 1700
 */
export function warpPerspectiveToStandard(
  sourceCanvas: HTMLCanvasElement,
  corners: { tl: OMRPoint; tr: OMRPoint; br: OMRPoint; bl: OMRPoint }
): HTMLCanvasElement {
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = OMR_SHEET_SPEC.width;
  targetCanvas.height = OMR_SHEET_SPEC.height;
  const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!targetCtx) return sourceCanvas;

  // Simple bilinear/mesh approximation or fallback draw
  // For standard browser performance without heavy OpenCV wasm:
  // We perform an affine/perspective subdivision render
  const sCtx = sourceCanvas.getContext('2d');
  if (!sCtx) return sourceCanvas;

  // Fast mapping: draw sliced triangles/rectangles across a 16x16 grid for high fidelity
  const gridSteps = 16;
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const dstW = OMR_SHEET_SPEC.width;
  const dstH = OMR_SHEET_SPEC.height;

  function interpolatePoint(u: number, v: number): OMRPoint {
    const top = {
      x: corners.tl.x + (corners.tr.x - corners.tl.x) * u,
      y: corners.tl.y + (corners.tr.y - corners.tl.y) * u,
    };
    const bottom = {
      x: corners.bl.x + (corners.br.x - corners.bl.x) * u,
      y: corners.bl.y + (corners.br.y - corners.bl.y) * u,
    };
    return {
      x: top.x + (bottom.x - top.x) * v,
      y: top.y + (bottom.y - top.y) * v,
    };
  }

  for (let gy = 0; gy < gridSteps; gy++) {
    for (let gx = 0; gx < gridSteps; gx++) {
      const u0 = gx / gridSteps;
      const u1 = (gx + 1) / gridSteps;
      const v0 = gy / gridSteps;
      const v1 = (gy + 1) / gridSteps;

      const p00 = interpolatePoint(u0, v0);
      const p10 = interpolatePoint(u1, v0);
      const p01 = interpolatePoint(u0, v1);
      const p11 = interpolatePoint(u1, v1);

      const dx0 = u0 * dstW;
      const dy0 = v0 * dstH;
      const dW = (u1 - u0) * dstW;
      const dH = (v1 - v0) * dstH;

      const sx0 = Math.min(p00.x, p01.x);
      const sy0 = Math.min(p00.y, p10.y);
      const sW = Math.max(p10.x, p11.x) - sx0;
      const sH = Math.max(p01.y, p11.y) - sy0;

      if (sW > 0 && sH > 0 && dW > 0 && dH > 0) {
        targetCtx.drawImage(
          sourceCanvas,
          Math.max(0, sx0),
          Math.max(0, sy0),
          Math.min(srcW - sx0, sW),
          Math.min(srcH - sy0, sH),
          dx0,
          dy0,
          dW,
          dH
        );
      }
    }
  }

  return targetCanvas;
}

/**
 * Tự động tìm 4 góc đen (Corner Alignment Markers) trên ảnh chụp
 */
export function detectCornerMarkers(canvas: HTMLCanvasElement): {
  tl: OMRPoint;
  tr: OMRPoint;
  br: OMRPoint;
  bl: OMRPoint;
  found: boolean;
} {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');

  if (!ctx || w < 200 || h < 200) {
    return {
      tl: { x: 0, y: 0 },
      tr: { x: w, y: 0 },
      br: { x: w, y: h },
      bl: { x: 0, y: h },
      found: false,
    };
  }

  // Scan corner quadrants (15% from edges)
  const quadW = Math.floor(w * 0.22);
  const quadH = Math.floor(h * 0.22);

  function findDarkestCluster(x0: number, y0: number, qW: number, qH: number): OMRPoint {
    try {
      const imgData = ctx!.getImageData(x0, y0, qW, qH);
      const data = imgData.data;

      // 1. Calculate mean luminance in quadrant
      let sumLum = 0;
      let count = 0;
      for (let y = 4; y < qH - 4; y += 4) {
        for (let x = 4; x < qW - 4; x += 4) {
          const idx = (y * qW + x) * 4;
          const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          sumLum += lum;
          count++;
        }
      }
      const meanLum = count > 0 ? sumLum / count : 128;
      const darkThreshold = Math.min(85, meanLum * 0.55);

      // 2. Centroid of mass calculation for the black corner square
      let sumX = 0;
      let sumY = 0;
      let darkCount = 0;

      for (let y = 4; y < qH - 4; y += 2) {
        for (let x = 4; x < qW - 4; x += 2) {
          const idx = (y * qW + x) * 4;
          const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          if (lum < darkThreshold) {
            sumX += x0 + x;
            sumY += y0 + y;
            darkCount++;
          }
        }
      }

      if (darkCount >= 12) {
        return { x: Math.round(sumX / darkCount), y: Math.round(sumY / darkCount) };
      }

      // 3. Fallback: absolute minimum luminance pixel
      let minLum = 255;
      let bestX = x0 + qW / 2;
      let bestY = y0 + qH / 2;

      for (let y = 8; y < qH - 8; y += 3) {
        for (let x = 8; x < qW - 8; x += 3) {
          const idx = (y * qW + x) * 4;
          const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          if (lum < minLum) {
            minLum = lum;
            bestX = x0 + x;
            bestY = y0 + y;
          }
        }
      }
      return { x: bestX, y: bestY };
    } catch {
      return { x: x0 + qW / 2, y: y0 + qH / 2 };
    }
  }

  const tl = findDarkestCluster(0, 0, quadW, quadH);
  const tr = findDarkestCluster(w - quadW, 0, quadW, quadH);
  const bl = findDarkestCluster(0, h - quadH, quadW, quadH);
  const br = findDarkestCluster(w - quadW, h - quadH, quadW, quadH);

  return {
    tl,
    tr,
    br,
    bl,
    found: true,
  };
}

/**
 * Đọc Số Báo Danh (6 cột, 10 số 0-9)
 */
export function scanStudentId(ctx: CanvasRenderingContext2D): { sbd: string; confidence: number } {
  const { x, y, cols, rows, cellW, cellH, radius } = OMR_SHEET_SPEC.sbd;
  let sbd = '';
  let totalConf = 0;

  for (let c = 0; c < cols; c++) {
    const colX = x + c * cellW;
    let maxFill = -1;
    let secondMaxFill = -1;
    let bestDigit = -1;

    for (let r = 0; r < rows; r++) {
      const rowY = y + r * cellH;
      const fill = measureBubbleFill(ctx, colX, rowY, radius);
      if (fill > maxFill) {
        secondMaxFill = maxFill;
        maxFill = fill;
        bestDigit = r; // 0 to 9
      } else if (fill > secondMaxFill) {
        secondMaxFill = fill;
      }
    }

    if (maxFill > 0.35 && (maxFill - secondMaxFill > 0.12 || secondMaxFill < 0.25)) {
      sbd += bestDigit.toString();
      totalConf += Math.min(1.0, (maxFill - secondMaxFill) * 2);
    } else {
      // Fallback digit
      sbd += bestDigit >= 0 ? bestDigit.toString() : '0';
      totalConf += 0.3;
    }
  }

  return {
    sbd: sbd.length === 6 ? sbd : sbd.padEnd(6, '0'),
    confidence: Math.round((totalConf / cols) * 100),
  };
}

/**
 * Đọc Mã Đề Thi (3 cột, 10 số 0-9)
 */
export function scanExamCode(ctx: CanvasRenderingContext2D): { examCode: string; confidence: number } {
  const { x, y, cols, rows, cellW, cellH, radius } = OMR_SHEET_SPEC.examCode;
  let code = '';
  let totalConf = 0;

  for (let c = 0; c < cols; c++) {
    const colX = x + c * cellW;
    let maxFill = -1;
    let secondMaxFill = -1;
    let bestDigit = -1;

    for (let r = 0; r < rows; r++) {
      const rowY = y + r * cellH;
      const fill = measureBubbleFill(ctx, colX, rowY, radius);
      if (fill > maxFill) {
        secondMaxFill = maxFill;
        maxFill = fill;
        bestDigit = r;
      } else if (fill > secondMaxFill) {
        secondMaxFill = fill;
      }
    }

    if (maxFill > 0.35 && (maxFill - secondMaxFill > 0.12 || secondMaxFill < 0.25)) {
      code += bestDigit.toString();
      totalConf += Math.min(1.0, (maxFill - secondMaxFill) * 2);
    } else {
      code += bestDigit >= 0 ? bestDigit.toString() : '1';
      totalConf += 0.3;
    }
  }

  return {
    examCode: code.length === 4 ? code : code.padEnd(4, '0'),
    confidence: Math.round((totalConf / cols) * 100),
  };
}

/**
 * Đọc Phần I (40 câu trắc nghiệm ABCD)
 */
export function scanPart1(
  ctx: CanvasRenderingContext2D,
  answerKey: OMRPart1AnswerKey
): StudentPart1ScanResult[] {
  const results: StudentPart1ScanResult[] = [];
  const options = ['A', 'B', 'C', 'D'];

  function readBlock(colCfg: { x: number; y: number; startQ: number; endQ: number; qH: number; optSpacing: number; radius: number }) {
    for (let q = colCfg.startQ; q <= colCfg.endQ; q++) {
      const qRowY = colCfg.y + (q - colCfg.startQ) * colCfg.qH;
      let maxFill = -1;
      let secondMax = -1;
      let chosenOpt: string | null = null;

      for (let oIdx = 0; oIdx < 4; oIdx++) {
        const optX = colCfg.x + 40 + oIdx * colCfg.optSpacing;
        const fill = measureBubbleFill(ctx, optX, qRowY, colCfg.radius);
        if (fill > maxFill) {
          secondMax = maxFill;
          maxFill = fill;
          chosenOpt = options[oIdx];
        } else if (fill > secondMax) {
          secondMax = fill;
        }
      }

      // Check if clearly marked
      const isMarked = maxFill > 0.32 && (maxFill - secondMax > 0.1 || secondMax < 0.22);
      const finalChosen = isMarked ? chosenOpt : null;
      const key = answerKey[q] || null;
      const isCorrect = !!(finalChosen && key && finalChosen === key);

      results.push({
        qNum: q,
        chosen: finalChosen,
        correctKey: key,
        isCorrect,
        score: isCorrect ? 0.25 : 0.0,
        confidence: isMarked ? Math.round((maxFill - secondMax) * 100) : 0,
      });
    }
  }

  readBlock(OMR_SHEET_SPEC.part1.col1);
  readBlock(OMR_SHEET_SPEC.part1.col2);

  return results.sort((a, b) => a.qNum - b.qNum);
}

/**
 * Đọc Phần II (8 câu Đúng/Sai - mỗi câu 4 ý a, b, c, d)
 */
export function scanPart2(
  ctx: CanvasRenderingContext2D,
  answerKey: OMRPart2AnswerKey
): StudentPart2ScanResult[] {
  const results: StudentPart2ScanResult[] = [];
  const { x, y, questions, qH, statementH, trueXOffset, falseXOffset, radius } = OMR_SHEET_SPEC.part2;
  const labels: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];

  for (let q = 1; q <= questions; q++) {
    const qTopY = y + (q - 1) * qH;
    const statements: StudentPart2StatementResult[] = [];
    let correctCount = 0;

    for (let sIdx = 0; sIdx < 4; sIdx++) {
      const sY = qTopY + 14 + sIdx * statementH;
      const label = labels[sIdx];

      const trueX = x + trueXOffset;
      const falseX = x + falseXOffset;

      const fillTrue = measureBubbleFill(ctx, trueX, sY, radius);
      const fillFalse = measureBubbleFill(ctx, falseX, sY, radius);

      let chosen: boolean | null = null;
      if (fillTrue > 0.32 && fillTrue - fillFalse > 0.1) {
        chosen = true; // Tô Đúng
      } else if (fillFalse > 0.32 && fillFalse - fillTrue > 0.1) {
        chosen = false; // Tô Sai
      }

      const qKeyObj = answerKey[q];
      const correctVal = qKeyObj ? qKeyObj[label] ?? null : null;
      const isCorrect = chosen !== null && correctVal !== null && chosen === correctVal;

      if (isCorrect) correctCount++;

      statements.push({
        label,
        chosen,
        correctKey: correctVal,
        isCorrect,
      });
    }

    results.push({
      qNum: q,
      statements,
      correctCount,
      score: calculatePart2QuestionScore(correctCount),
    });
  }

  return results;
}

/**
 * Đọc Phần III (6 câu Trả lời ngắn - 100% TÔ TRÒN chuẩn Bộ GD&ĐT):
 * Mỗi câu gồm 4 cột dọc.
 * - Cột 1: Dòng 1 có ô dấu âm '-', Dòng 2-11 là '0' đến '9' (không có dấu phẩy '.')
 * - Cột 2: Dòng 1 có ô dấu phẩy '.', Dòng 2-11 là '0' đến '9'
 * - Cột 3: Dòng 1 có ô dấu phẩy '.', Dòng 2-11 là '0' đến '9'
 * - Cột 4: Dòng 2-11 là '0' đến '9' (không có dấu phẩy '.')
 */
export function scanPart3(
  ctx: CanvasRenderingContext2D,
  answerKey: OMRPart3AnswerKey
): StudentPart3ScanResult[] {
  const results: StudentPart3ScanResult[] = [];
  const { x, y, questions, qW, qH, colSpacing, rowH, radius } = OMR_SHEET_SPEC.part3;

  for (let q = 1; q <= questions; q++) {
    const qLeftX = x + ((q - 1) % 2) * (qW * 4 + 40);
    const qTopY = y + Math.floor((q - 1) / 2) * (qH + 30);

    let parsedString = '';
    let totalConf = 0;

    for (let c = 0; c < 4; c++) {
      const colX = qLeftX + 30 + c * colSpacing;
      let maxFill = -1;
      let secondMax = -1;
      let chosenChar: string | null = null;

      // 1. Cột 1 (c === 0): Dòng 1 có ô dấu âm '-'
      if (c === 0) {
        const minusY = qTopY + 18;
        const fillMinus = measureBubbleFill(ctx, colX, minusY, radius);
        if (fillMinus > 0.35) {
          maxFill = fillMinus;
          chosenChar = '-';
        }
      }

      // 2. Cột 2 & Cột 3 (c === 1 hoặc c === 2): Dòng 1 có ô dấu phẩy '.' / ','
      if (c === 1 || c === 2) {
        const commaY = qTopY + 18;
        const fillComma = measureBubbleFill(ctx, colX, commaY, radius);
        if (fillComma > maxFill) {
          secondMax = maxFill;
          maxFill = fillComma;
          chosenChar = ',';
        }
      }

      // 3. Kiểm tra các chữ số '0' đến '9' ở các dòng bên dưới
      for (let digit = 0; digit <= 9; digit++) {
        const digitY = qTopY + 18 + (digit + 1) * rowH;
        const fill = measureBubbleFill(ctx, colX, digitY, radius);
        if (fill > maxFill) {
          secondMax = maxFill;
          maxFill = fill;
          chosenChar = digit.toString();
        } else if (fill > secondMax) {
          secondMax = fill;
        }
      }

      if (maxFill > 0.32 && (maxFill - secondMax > 0.1 || secondMax < 0.22) && chosenChar) {
        parsedString += chosenChar;
        totalConf += Math.min(1.0, (maxFill - secondMax) * 2);
      }
    }

    const key = answerKey[q] || null;
    const isCorrect = !!(parsedString && key && isShortAnswerMatch(parsedString, key));

    results.push({
      qNum: q,
      rawString: parsedString,
      normalizedString: normalizeShortAnswer(parsedString),
      correctKey: key,
      isCorrect,
      score: isCorrect ? 0.5 : 0.0,
      confidence: parsedString ? Math.round((totalConf / parsedString.length) * 100) : 0,
    });
  }

  return results;
}

/**
 * Xử lý toàn diện 1 tờ phiếu OMR từ HTMLCanvasElement
 */
export function processOMRSheetCanvas(
  rawCanvas: HTMLCanvasElement,
  examKeys: Record<string, OMRExamKey>,
  activeExamCodeFallback?: string
): StudentOMRResult {
  // 1. Perspective Transform
  const markers = detectCornerMarkers(rawCanvas);
  const normalizedCanvas = warpPerspectiveToStandard(rawCanvas, markers);
  const ctx = normalizedCanvas.getContext('2d', { willReadFrequently: true })!;

  // 2. Scan SBD & Exam Code
  const { sbd, confidence: sbdConf } = scanStudentId(ctx);
  let { examCode, confidence: codeConf } = scanExamCode(ctx);

  // Fallback to active code if not detected reliably
  if (!examKeys[examCode] && activeExamCodeFallback && examKeys[activeExamCodeFallback]) {
    examCode = activeExamCodeFallback;
  }

  const selectedKey = examKeys[examCode] || Object.values(examKeys)[0] || {
    code: examCode,
    part1: {},
    part2: {},
    part3: {},
  };

  // 3. Scan Parts
  const part1Results = scanPart1(ctx, selectedKey.part1);
  const part2Results = scanPart2(ctx, selectedKey.part2);
  const part3Results = scanPart3(ctx, selectedKey.part3);

  // 4. Calculate Scores
  const scorePart1 = Number(part1Results.reduce((sum, r) => sum + r.score, 0).toFixed(2));
  const scorePart2 = Number(part2Results.reduce((sum, r) => sum + r.score, 0).toFixed(2));
  const scorePart3 = Number(part3Results.reduce((sum, r) => sum + r.score, 0).toFixed(2));
  const totalScore = Number(Math.min(10.0, scorePart1 + scorePart2 + scorePart3).toFixed(2));

  const needsReview = sbdConf < 50 || codeConf < 50 || !examKeys[examCode];
  let reviewReason = '';
  if (!examKeys[examCode]) reviewReason = `Mã đề ${examCode} chưa có đáp án trong hệ thống.`;
  else if (sbdConf < 50) reviewReason = 'Số báo danh mờ hoặc tô chưa rõ.';

  // 5. Draw Visual Overlay (Green/Red circles and Score Banner)
  drawVisualOverlayOnSheet(ctx, {
    sbd,
    examCode,
    part1Results,
    part2Results,
    part3Results,
    scorePart1,
    scorePart2,
    scorePart3,
    totalScore,
  });

  const annotatedImageUrl = normalizedCanvas.toDataURL('image/jpeg', 0.88);

  return {
    id: `omr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    studentId: sbd,
    examCode,
    examCodeConfidence: codeConf,
    studentIdConfidence: sbdConf,
    needsReview,
    reviewReason,
    part1Results,
    part2Results,
    part3Results,
    scorePart1,
    scorePart2,
    scorePart3,
    totalScore,
    annotatedImageUrl,
  };
}

/**
 * Vẽ vòng tròn Xanh/Đỏ và Banner Điểm lên Canvas
 */
export function drawVisualOverlayOnSheet(
  ctx: CanvasRenderingContext2D,
  data: {
    sbd: string;
    examCode: string;
    part1Results: StudentPart1ScanResult[];
    part2Results: StudentPart2ScanResult[];
    part3Results: StudentPart3ScanResult[];
    scorePart1: number;
    scorePart2: number;
    scorePart3: number;
    totalScore: number;
  }
) {
  // Score Header Banner at Top
  ctx.save();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.92)'; // Red-600
  ctx.fillRect(80, 110, 480, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`TỔNG ĐIỂM: ${data.totalScore.toFixed(2)} / 10.0`, 100, 150);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`P.I: ${data.scorePart1.toFixed(2)}đ  |  P.II: ${data.scorePart2.toFixed(2)}đ  |  P.III: ${data.scorePart3.toFixed(2)}đ`, 100, 166);

  // Overlay Part 1
  const options = ['A', 'B', 'C', 'D'];
  for (const r of data.part1Results) {
    const isCol1 = r.qNum <= 20;
    const colCfg = isCol1 ? OMR_SHEET_SPEC.part1.col1 : OMR_SHEET_SPEC.part1.col2;
    const rowY = colCfg.y + (r.qNum - colCfg.startQ) * colCfg.qH;

    if (r.chosen) {
      const oIdx = options.indexOf(r.chosen);
      if (oIdx >= 0) {
        const x = colCfg.x + 40 + oIdx * colCfg.optSpacing;
        ctx.beginPath();
        ctx.arc(x, rowY, colCfg.radius + 3, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = r.isCorrect ? '#16a34a' : '#dc2626'; // Green / Red
        ctx.stroke();
      }
    }

    // If incorrect, draw dashed circle for correct key
    if (!r.isCorrect && r.correctKey) {
      const keyIdx = options.indexOf(r.correctKey);
      if (keyIdx >= 0) {
        const x = colCfg.x + 40 + keyIdx * colCfg.optSpacing;
        ctx.beginPath();
        ctx.arc(x, rowY, colCfg.radius + 3, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#2563eb'; // Blue dashed
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // Overlay Part 2
  const { x: p2X, y: p2Y, qH: p2QH, statementH, trueXOffset, falseXOffset, radius: p2R } = OMR_SHEET_SPEC.part2;
  for (const r of data.part2Results) {
    const qTopY = p2Y + (r.qNum - 1) * p2QH;
    for (let sIdx = 0; sIdx < r.statements.length; sIdx++) {
      const s = r.statements[sIdx];
      const sY = qTopY + 14 + sIdx * statementH;

      if (s.chosen !== null) {
        const chosenX = p2X + (s.chosen ? trueXOffset : falseXOffset);
        ctx.beginPath();
        ctx.arc(chosenX, sY, p2R + 3, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = s.isCorrect ? '#16a34a' : '#dc2626';
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

// =====================================================================
// EXPORTING HELPERS (EXCEL & APP QM / TNMAKER FORMATS)
// =====================================================================

/**
 * Xuất Bảng điểm lớp sang file Excel (.xlsx)
 */
export function exportScoresToExcel(students: StudentOMRResult[], examTitle: string = 'Ket_Qua_Thi'): void {
  const data = students.map((s, idx) => {
    return {
      STT: idx + 1,
      'Số Báo Danh': s.studentId,
      'Mã Đề': s.examCode,
      'Điểm Phần I (TN 4 lựa chọn)': s.scorePart1,
      'Điểm Phần II (Đúng/Sai)': s.scorePart2,
      'Điểm Phần III (Trả lời ngắn)': s.scorePart3,
      'Điểm Tự Luận': s.essayScore !== undefined ? s.essayScore : 0,
      'TỔNG ĐIỂM (Hệ 10)': s.totalScore,
      'Thời gian chấm': new Date(s.timestamp).toLocaleString('vi-VN'),
      'Ghi chú': s.needsReview ? s.reviewReason : 'Hợp lệ',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bang_Diem');
  XLSX.writeFile(workbook, `${examTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Xuất file Đáp án chuẩn App QM / TNMaker
 */
export function exportToQmOrTnMakerFormat(examKey: OMRExamKey): string {
  let output = `MÃ ĐỀ: ${examKey.code}\n`;
  output += `--- PHẦN I ---\n`;
  for (let q = 1; q <= 40; q++) {
    if (examKey.part1[q]) {
      output += `${q}${examKey.part1[q]} `;
      if (q % 10 === 0) output += `\n`;
    }
  }

  output += `\n--- PHẦN II ---\n`;
  for (let q = 1; q <= 8; q++) {
    const stmt = examKey.part2[q];
    if (stmt) {
      const a = stmt.a ? 'Đ' : 'S';
      const b = stmt.b ? 'Đ' : 'S';
      const c = stmt.c ? 'Đ' : 'S';
      const d = stmt.d ? 'Đ' : 'S';
      output += `${q}(${a}${b}${c}${d}) `;
    }
  }

  output += `\n--- PHẦN III ---\n`;
  for (let q = 1; q <= 6; q++) {
    if (examKey.part3[q]) {
      output += `${q}: ${examKey.part3[q]} | `;
    }
  }

  return output;
}
