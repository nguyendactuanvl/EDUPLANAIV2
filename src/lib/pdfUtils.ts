import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Cấu hình Worker cục bộ (bundle qua Vite) cho PDF.js 4.10.38 để không bao giờ bị chặn CDN/CORS trong iframe
if (typeof window !== 'undefined') {
  try {
    const workerVersion = '4.10.38';
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorkerUrl || `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF worker setup failed:', e);
  }
}

export interface PdfDetectedFigure {
  /** Normalized [ymin, xmin, ymax, xmax] in 0..1000 page coordinates */
  box: [number, number, number, number];
  /** Nearest question label on the page (e.g. "Câu 3", "Bài 1", or "") */
  questionLabel: string;
  description: string;
  /** True when the PDF page is an answer-key / grading rubric page ("ĐÁP ÁN", "HƯỚNG DẪN CHẤM") */
  isAnswerKeyPage?: boolean;
  /** True when this figure contains an embedded raster image (paintImageXObject) */
  isRasterImg?: boolean;
}

/**
 * Helper to safely clone buffer so pdfjsLib worker thread transfers never detach original ArrayBuffer
 */
function getSafePdfData(pdfData: ArrayBuffer | Uint8Array): Uint8Array {
  if (!pdfData) {
    throw new Error('No PDF data provided');
  }
  if (pdfData instanceof ArrayBuffer) {
    if (pdfData.byteLength === 0) {
      throw new Error('PDF ArrayBuffer is detached');
    }
    return new Uint8Array(pdfData.slice(0));
  }
  if (ArrayBuffer.isView(pdfData)) {
    if (pdfData.buffer.byteLength === 0) {
      throw new Error('PDF Uint8Array buffer is detached');
    }
    return new Uint8Array(pdfData.slice(0));
  }
  return new Uint8Array(pdfData);
}

/**
 * Standard configuration options for getDocument
 */
function getDocumentOptions(safeData: Uint8Array) {
  const workerVersion = '4.10.38';
  return {
    data: safeData,
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/standard_fonts/`
  };
}

const mulMat = (m1: number[], m2: number[]): number[] => [
  m1[0] * m2[0] + m1[2] * m2[1],
  m1[1] * m2[0] + m1[3] * m2[1],
  m1[0] * m2[2] + m1[2] * m2[3],
  m1[1] * m2[2] + m1[3] * m2[3],
  m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
  m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
];

const applyPt = (m: number[], x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

const VN_DIACRITIC_RE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúụủũưừứựửữỳýỵỷỹđ]/i;
const EXAM_HEADER_KW_RE = /(?:S\s*Ở\s*GIÁO\s*D\s*Ụ\s*C|PHÒNG\s*GIÁO\s*D\s*Ụ\s*C|TRƯỜ\s*NG\s+(?:THPT|THCS|TIỂU)|Đ\s*Ề\s*(?:KI\s*Ể\s*M\s*TRA|THI|THAM\s*KHẢO)|ĐÁP\s*ÁN\s*Đ\s*Ề|MÃ\s*ĐỀ|NĂM\s*HỌ\s*C|HỌ\s*VÀ\s*TÊN|THỜI\s*GIAN\s*LÀM\s*BÀI)/i;
const EXAM_FOOTER_KW_RE = /^\s*Trang\s*\d+\s*\/\s*\d+/i;
const STAT_TABLE_KW_RE = /(?:M\s*ứ\s*c\s*lương|S\s*ố\s*(?:tuổi|học\s*sinh|công\s*nhân|người|cây|tháng|ngày|giờ|lần|xe|sản\s*phẩm)|Đ\s*ộ\s*ẩ\s*m|Th\s*ờ\s*i\s*gian|Giá\s*tr\s*ị\s*đ\s*ạ\s*i\s*di\s*ệ\s*n|T\s*ầ\s*n\s*s\s*ố|T\s*ầ\s*n\s*su\s*ấ\s*t|Cân\s*nặng|Chiều\s*cao|Doanh\s*thu|Nhiệt\s*độ|Điểm\s*kiểm\s*tra|Khoảng\s*biến\s*thiên)/i;
const QUESTION_OR_CHOICE_LINE_RE = /^(?:PH\s*ẦN\s*(?:I{1,3}|IV|[1-4])|(?:Câu|Bài|Question)\s*\d+|[A-D]\.\s|[a-d]\)\s)/i;

/**
 * Deterministically detects vector drawings (TikZ/LaTeX/Word diagrams, coordinate axes,
 * shaded half-planes, geometric figures) and embedded raster images directly from a PDF page's
 * OperatorList + TextContent, and associates each figure with its question label (e.g. "Câu 3").
 */
export async function detectFiguresAndLabelsFromPdfPage(page: any): Promise<{
  detectedFigures: PdfDetectedFigure[];
  detectedQuestionLabels: string[];
  proseLineBoxes: [number, number, number, number][];
}> {
  try {
    const vp = page.getViewport({ scale: 1 });
    const W = vp.width;
    const H = vp.height;
    if (!W || !H) return { detectedFigures: [], detectedQuestionLabels: [], proseLineBoxes: [] };

    const [ops, textContent] = await Promise.all([
      page.getOperatorList(),
      page.getTextContent().catch(() => ({ items: [] })),
    ]);

    const OPS = pdfjsLib.OPS;
    const vpTransform: number[] = Array.from(vp.transform);

    // 1. Extract text items in 1x viewport coordinates
    interface TextItemBox {
      str: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      w: number;
      h: number;
    }
    const textItems: TextItemBox[] = [];
    for (const item of (textContent?.items || []) as any[]) {
      if (!item || typeof item.str !== 'string' || !item.str.trim()) continue;
      const tx = mulMat(vpTransform, item.transform || [1, 0, 0, 1, 0, 0]);
      const fontH = Math.max(6, Math.hypot(tx[2], tx[3]) || Math.abs(item.height || 0) || 10);
      const x1 = tx[4];
      const y2 = tx[5];
      const y1 = y2 - fontH;
      const x2 = x1 + Math.max(4, item.width || fontH * item.str.length * 0.5);
      textItems.push({ str: item.str.trim(), x1, y1, x2, y2, w: x2 - x1, h: fontH });
    }

    // Group text items into visual lines to identify question headers & prose lines
    const sortedItems = [...textItems].sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1);
    interface TextLine {
      items: TextItemBox[];
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      text: string;
      compactText: string;
      isProse: boolean;
      isHeader: boolean;
      isFooter: boolean;
    }
    const lines: TextLine[] = [];
    for (const it of sortedItems) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y1 - it.y1) < 5) {
        last.items.push(it);
        last.x1 = Math.min(last.x1, it.x1);
        last.x2 = Math.max(last.x2, it.x2);
        last.y1 = Math.min(last.y1, it.y1);
        last.y2 = Math.max(last.y2, it.y2);
      } else {
        lines.push({
          items: [it],
          x1: it.x1,
          y1: it.y1,
          x2: it.x2,
          y2: it.y2,
          text: '',
          compactText: '',
          isProse: false,
          isHeader: false,
          isFooter: false,
        });
      }
    }

    const qHeaders: { label: string; y1: number; y2: number; x1: number; col: number }[] = [];
    let isAnswerKeyPage = false;
    let leftColLines = 0;
    let rightColLines = 0;

    // Detect if the page uses a 2-column exam layout (many independent lines on left half & right half)
    for (const ln of lines) {
      ln.items.sort((a, b) => a.x1 - b.x1);
      ln.text = ln.items.map((i) => i.str).join(' ');
      ln.compactText = ln.text.replace(/\s+/g, ' ').trim();
      if (/^(?:ĐÁP\s*ÁN|HƯỚNG\s*DẪN\s*CHẤM|BIỂU\s*ĐIỂM)/i.test(ln.compactText)) {
        isAnswerKeyPage = true;
      }
      ln.isFooter =
        (ln.y1 > H * 0.91 && EXAM_FOOTER_KW_RE.test(ln.compactText)) ||
        (ln.y1 > H * 0.935 && /Trang\s*\d+|Mã\s*đề/i.test(ln.compactText));
      ln.isHeader = ln.y1 < H * 0.165 && EXAM_HEADER_KW_RE.test(ln.compactText);

      const lineW = ln.x2 - ln.x1;
      const nonSpaceLen = ln.compactText.replace(/\s+/g, '').length;
      const hasVn = VN_DIACRITIC_RE.test(ln.compactText);
      const isQorChoice = QUESTION_OR_CHOICE_LINE_RE.test(ln.compactText);
      const isStat = STAT_TABLE_KW_RE.test(ln.compactText);
      ln.isProse =
        ln.isHeader ||
        ln.isFooter ||
        isQorChoice ||
        isStat ||
        (hasVn && nonSpaceLen >= 10 && lineW >= 48);

      if (ln.x2 < W * 0.51 && lineW > W * 0.12) leftColLines++;
      if (ln.x1 > W * 0.49 && lineW > W * 0.12) rightColLines++;
    }
    const isTwoColumnPage = leftColLines >= 4 && rightColLines >= 4;

    const proseLineBoxes: [number, number, number, number][] = lines
      .filter((ln) => ln.isProse)
      .map((ln) => [
        Math.max(0, Math.min(1000, Math.round((ln.y1 / H) * 1000))),
        Math.max(0, Math.min(1000, Math.round((ln.x1 / W) * 1000))),
        Math.max(0, Math.min(1000, Math.round((ln.y2 / H) * 1000))),
        Math.max(0, Math.min(1000, Math.round((ln.x2 / W) * 1000))),
      ]);

    const footerMinY = lines
      .filter((ln) => ln.isFooter)
      .reduce((minY, ln) => Math.min(minY, ln.y1), H);

    // Extract question/section headers from each visual line (including left & right halves on 2-col pages)
    const headerPattern = /^(Câu\s*\d+|Bài\s*\d+|Question\s*\d+|PHẦN\s*(?:I{1,3}|IV|[1-4]))\b\s*[\.:\)]?/i;
    for (const ln of lines) {
      const segments = isTwoColumnPage
        ? [
            { col: 0, items: ln.items.filter((it) => (it.x1 + it.x2) / 2 < W * 0.5) },
            { col: 1, items: ln.items.filter((it) => (it.x1 + it.x2) / 2 >= W * 0.5) },
          ]
        : [{ col: 0, items: ln.items }];

      for (const seg of segments) {
        if (seg.items.length === 0) continue;
        const segText = seg.items.map((i) => i.str).join(' ').trim();
        const m = segText.match(headerPattern);
        if (m) {
          const cleanLabel = m[1].replace(/\s+/g, ' ').trim();
          qHeaders.push({
            label: cleanLabel,
            y1: ln.y1,
            y2: ln.y2,
            x1: seg.items[0].x1,
            col: seg.col,
          });
        }
      }
    }

    // Sort strictly in natural reading order: 2-column -> left col top-to-bottom then right col; 1-column -> top-to-bottom
    qHeaders.sort((a, b) => a.col - b.col || a.y1 - b.y1 || a.x1 - b.x1);
    const detectedQuestionLabels: string[] = [];
    for (const q of qHeaders) {
      if (detectedQuestionLabels[detectedQuestionLabels.length - 1] !== q.label) {
        detectedQuestionLabels.push(q.label);
      }
    }

    // 2. Walk PDF drawing operators to collect embedded raster images & vector graphics SEPARATELY
    const stack: number[][] = [];
    let ctm: number[] = vpTransform.slice();
    interface RawGraphicBox {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      kind: 'img' | 'diag' | 'rect';
      segCount: number;
    }
    const rawImgBoxes: RawGraphicBox[] = [];
    const rawVecBoxes: RawGraphicBox[] = [];
    const hRules: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];

      if (fn === OPS.save) {
        stack.push(ctm.slice());
      } else if (fn === OPS.restore) {
        if (stack.length) ctm = stack.pop()!;
      } else if (fn === OPS.transform && Array.isArray(args) && args.length >= 6) {
        ctm = mulMat(ctm, args);
      } else if (
        fn === OPS.paintImageXObject ||
        fn === OPS.paintInlineImageXObject ||
        fn === OPS.paintImageMaskXObject
      ) {
        const pts = [applyPt(ctm, 0, 0), applyPt(ctm, 1, 0), applyPt(ctm, 0, 1), applyPt(ctm, 1, 1)];
        const xs = pts.map((q) => q[0]);
        const ys = pts.map((q) => q[1]);
        const x1 = Math.max(0, Math.min(...xs));
        const y1 = Math.max(0, Math.min(...ys));
        const x2 = Math.min(W, Math.max(...xs));
        const y2 = Math.min(H, Math.max(...ys));
        const bw = x2 - x1;
        const bh = y2 - y1;
        // Skip tiny icons or full-page scanned background images (Pass 2 handles scanned pages)
        const isFullPageScan = bw > W * 0.86 && bh > H * 0.78;
        if (bw >= 45 && bh >= 35 && !isFullPageScan) {
          rawImgBoxes.push({ x1, y1, x2, y2, kind: 'img', segCount: 4 });
        }
      } else if (fn === OPS.constructPath && Array.isArray(args)) {
        const subOps: number[] = args[0] || [];
        const coords: number[] = args[1] || [];
        let ci = 0;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let segCount = 0;
        let hasDiagonal = false;
        let curX = 0;
        let curY = 0;

        const addPt = (x: number, y: number) => {
          const [tx, ty] = applyPt(ctm, x, y);
          if (tx < minX) minX = tx;
          if (tx > maxX) maxX = tx;
          if (ty < minY) minY = ty;
          if (ty > maxY) maxY = ty;
        };

        for (const op of subOps) {
          if (op === OPS.moveTo) {
            curX = coords[ci++];
            curY = coords[ci++];
            addPt(curX, curY);
          } else if (op === OPS.lineTo) {
            const nx = coords[ci++];
            const ny = coords[ci++];
            if (Math.abs(nx - curX) > 1.5 && Math.abs(ny - curY) > 1.5) {
              hasDiagonal = true;
            }
            curX = nx;
            curY = ny;
            addPt(curX, curY);
            segCount++;
          } else if (op === OPS.curveTo) {
            hasDiagonal = true;
            addPt(coords[ci++], coords[ci++]);
            addPt(coords[ci++], coords[ci++]);
            curX = coords[ci++];
            curY = coords[ci++];
            addPt(curX, curY);
            segCount++;
          } else if (op === OPS.curveTo2 || op === OPS.curveTo3) {
            hasDiagonal = true;
            addPt(coords[ci++], coords[ci++]);
            curX = coords[ci++];
            curY = coords[ci++];
            addPt(curX, curY);
            segCount++;
          } else if (op === OPS.rectangle) {
            const rx = coords[ci++];
            const ry = coords[ci++];
            const rw = coords[ci++];
            const rh = coords[ci++];
            addPt(rx, ry);
            addPt(rx + rw, ry);
            addPt(rx, ry + rh);
            addPt(rx + rw, ry + rh);
            segCount += 4;
          }
        }

        if (minX < Infinity) {
          const bw = maxX - minX;
          const bh = maxY - minY;
          if (!hasDiagonal && bw >= 70 && bh < 4 && minY > H * 0.08 && maxY < H * 0.92) {
            hRules.push({
              x1: Math.max(0, minX),
              y1: Math.max(0, minY),
              x2: Math.min(W, maxX),
              y2: Math.min(H, maxY),
            });
          }
          const isPageRule = (bw > W * 0.65 && bh < 4) || (bh > H * 0.55 && bw < 4);
          const isTinyRule = (bw < 3 && bh < 3) || (bw < 28 && bh < 3) || (bh < 28 && bw < 3);
          const isTableCellRect = !hasDiagonal && segCount <= 4 && (bw > W * 0.5 || bh > H * 0.35);
          const isHeaderBox = minY < H * 0.14 && !hasDiagonal && bh < 35;
          const isInlineMathOrGridBox = !hasDiagonal && bw < 150 && bh < 28 && segCount <= 4;
          const isFooterStroke = minY > footerMinY - 4;
          if (!isPageRule && !isTinyRule && !isTableCellRect && !isHeaderBox && !isInlineMathOrGridBox && !isFooterStroke) {
            rawVecBoxes.push({
              x1: Math.max(0, minX),
              y1: Math.max(0, minY),
              x2: Math.min(W, maxX),
              y2: Math.min(H, maxY),
              kind: hasDiagonal ? 'diag' : 'rect',
              segCount,
            });
          }
        }
      }
    }

    if (rawImgBoxes.length === 0 && rawVecBoxes.length === 0) {
      return { detectedFigures: [], detectedQuestionLabels, proseLineBoxes };
    }

    interface GraphicCluster {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      count: number;
      diagCount: number;
      isRasterImg: boolean;
    }

    // 3A. Cluster vector primitives tightly (pad = 10) BEFORE considering raster images
    const vecPad = 10;
    const vecClusters: GraphicCluster[] = [];
    for (const b of rawVecBoxes) {
      let merged = false;
      for (const c of vecClusters) {
        if (b.x1 <= c.x2 + vecPad && b.x2 >= c.x1 - vecPad && b.y1 <= c.y2 + vecPad && b.y2 >= c.y1 - vecPad) {
          c.x1 = Math.min(c.x1, b.x1);
          c.y1 = Math.min(c.y1, b.y1);
          c.x2 = Math.max(c.x2, b.x2);
          c.y2 = Math.max(c.y2, b.y2);
          c.count++;
          if (b.kind === 'diag') c.diagCount++;
          merged = true;
          break;
        }
      }
      if (!merged) {
        vecClusters.push({
          x1: b.x1,
          y1: b.y1,
          x2: b.x2,
          y2: b.y2,
          count: 1,
          diagCount: b.kind === 'diag' ? 1 : 0,
          isRasterImg: false,
        });
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < vecClusters.length; i++) {
        for (let j = i + 1; j < vecClusters.length; j++) {
          const a = vecClusters[i];
          const b = vecClusters[j];
          if (b.x1 <= a.x2 + vecPad && b.x2 >= a.x1 - vecPad && b.y1 <= a.y2 + vecPad && b.y2 >= a.y1 - vecPad) {
            a.x1 = Math.min(a.x1, b.x1);
            a.y1 = Math.min(a.y1, b.y1);
            a.x2 = Math.max(a.x2, b.x2);
            a.y2 = Math.max(a.y2, b.y2);
            a.count += b.count;
            a.diagCount += b.diagCount;
            vecClusters.splice(j, 1);
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }

    // Filter out false-positive vector clusters (page headers, footers, statistical tables, MathType equation blocks)
    const validVecClusters = vecClusters.filter((c) => {
      const bw = c.x2 - c.x1;
      const bh = c.y2 - c.y1;
      if (bw < 50 || bh < 38) return false;
      if (bw > W * 0.88 && bh > H * 0.55) return false;

      const overlappingLines = lines.filter(
        (ln) => ln.y2 >= c.y1 - 2 && ln.y1 <= c.y2 + 2 && ln.x2 >= c.x1 - 2 && ln.x1 <= c.x2 + 2
      );
      const joinedText = overlappingLines.map((ln) => ln.compactText).join(' ');

      // Reject exam headers & footers
      if (c.y1 < H * 0.165 && (EXAM_HEADER_KW_RE.test(joinedText) || overlappingLines.some((l) => l.isHeader))) {
        return false;
      }
      if (c.y1 > H * 0.91 || (overlappingLines.length > 0 && overlappingLines.every((l) => l.isFooter))) {
        return false;
      }

      // Reject statistical / frequency / data tables
      if (STAT_TABLE_KW_RE.test(joinedText)) {
        return false;
      }

      // Count real Vietnamese prose / question / choice lines strictly INSIDE this vector cluster
      const proseLinesInside = overlappingLines.filter((ln) => {
        if (!ln.isProse) return false;
        const midY = (ln.y1 + ln.y2) / 2;
        if (midY < c.y1 + 4 || midY > c.y2 - 4) return false;
        const ox = Math.min(c.x2, ln.x2) - Math.max(c.x1, ln.x1);
        return ox >= Math.min(25, (ln.x2 - ln.x1) * 0.4);
      });
      if (proseLinesInside.length >= 2) {
        return false;
      }
      if (c.diagCount < 8 && proseLinesInside.some((ln) => QUESTION_OR_CHOICE_LINE_RE.test(ln.compactText))) {
        return false;
      }

      // Purely horizontal/vertical vector cluster (diagCount === 0):
      // ONLY keep if it clearly looks like a BBT (variation table) with y'/f'(x) and infinity symbols
      if (c.diagCount === 0) {
        const hasBbtHeader = /(?:y'|f'\s*\(\s*x\s*\)|g'\s*\(\s*x\s*\)|h'\s*\(\s*x\s*\))/.test(joinedText);
        const hasBbtInfty = /[∞]|infty|-\s*∞|\+\s*∞|↗|↘/.test(joinedText);
        return hasBbtHeader && hasBbtInfty && c.count >= 4;
      }

      return true;
    });

    // 3B. Keep embedded raster images SEPARATE (only merge two raster images if they genuinely overlap <= 2pt)
    const imgClusters: GraphicCluster[] = [];
    for (const imgBox of rawImgBoxes) {
      let merged = false;
      for (const c of imgClusters) {
        if (imgBox.x1 <= c.x2 + 2 && imgBox.x2 >= c.x1 - 2 && imgBox.y1 <= c.y2 + 2 && imgBox.y2 >= c.y1 - 2) {
          c.x1 = Math.min(c.x1, imgBox.x1);
          c.y1 = Math.min(c.y1, imgBox.y1);
          c.x2 = Math.max(c.x2, imgBox.x2);
          c.y2 = Math.max(c.y2, imgBox.y2);
          c.count++;
          merged = true;
          break;
        }
      }
      if (!merged) {
        imgClusters.push({
          x1: imgBox.x1,
          y1: imgBox.y1,
          x2: imgBox.x2,
          y2: imgBox.y2,
          count: 1,
          diagCount: 0,
          isRasterImg: true,
        });
      }
    }

    // 3C. Merge a surviving diag-rich vector diagram into an adjacent raster image ONLY when they form
    // a single composite illustration (e.g., side-by-side real-world photo + 3D coordinate diagram on the same Y-band)
    const remainingVecClusters: GraphicCluster[] = [];
    for (const vc of validVecClusters) {
      let fusedWithImg = false;
      if (vc.diagCount >= 4) {
        for (const ic of imgClusters) {
          const nearHoriz = vc.x1 <= ic.x2 + 28 && vc.x2 >= ic.x1 - 28;
          const overlapY = Math.min(vc.y2, ic.y2) - Math.max(vc.y1, ic.y1);
          const minH = Math.min(vc.y2 - vc.y1, ic.y2 - ic.y1);
          const sameYBand = overlapY >= minH * 0.45;
          if (nearHoriz && sameYBand) {
            ic.x1 = Math.min(ic.x1, vc.x1);
            ic.y1 = Math.min(ic.y1, vc.y1);
            ic.x2 = Math.max(ic.x2, vc.x2);
            ic.y2 = Math.max(ic.y2, vc.y2);
            ic.count += vc.count;
            ic.diagCount += vc.diagCount;
            fusedWithImg = true;
            break;
          }
        }
      }
      if (!fusedWithImg) {
        remainingVecClusters.push(vc);
      }
    }

    const validClusters = [...imgClusters, ...remainingVecClusters].sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1);

    // 4. Expand each vector figure box to include full BBT horizontal borders & adjacent short diagram labels
    //    (NEVER absorb footer lines or Vietnamese prose lines)
    const detected: PdfDetectedFigure[] = [];
    for (const f of validClusters) {
      if (!f.isRasterImg && f.diagCount > 0 && hRules.length >= 2) {
        const overlappingRules = hRules.filter(
          (r) =>
            r.y1 >= f.y1 - 32 &&
            r.y2 <= Math.min(footerMinY - 4, f.y2 + 32) &&
            r.x1 <= f.x2 + 40 &&
            r.x2 >= f.x1 - 80 &&
            r.x2 - r.x1 <= W * 0.9
        );
        if (overlappingRules.length >= 2) {
          const maxRuleW = Math.max(...overlappingRules.map((r) => r.x2 - r.x1));
          const alignedRules = overlappingRules.filter((r) => r.x2 - r.x1 >= maxRuleW * 0.72);
          if (alignedRules.length >= 2) {
            for (const r of alignedRules) {
              f.x1 = Math.min(f.x1, r.x1);
              f.x2 = Math.max(f.x2, r.x2);
              f.y1 = Math.min(f.y1, r.y1);
              f.y2 = Math.max(f.y2, r.y2);
            }
          }
        }
      }

      const orig = { x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2 };
      // Expand labels for pure vector diagrams OR composite (photo + diag) clusters
      if (!f.isRasterImg || f.diagCount >= 4) {
        for (const it of textItems) {
          if (it.str.length > 14 || it.w > 65) continue;
          if (it.y1 > footerMinY - 6 || it.y1 > H * 0.925) continue;
          if (/^(?:Câu|Bài|Phần|Trang|Đáp|Biểu|Họ|Mã|A\.|B\.|C\.|D\.)/i.test(it.str)) continue;
          const nearX = it.x1 <= orig.x2 + 20 && it.x2 >= orig.x1 - 16;
          const nearY = it.y1 <= orig.y2 + 14 && it.y2 >= orig.y1 - 18;
          if (!nearX || !nearY) continue;

          const sameLine = lines.find((ln) => Math.abs(ln.y1 - it.y1) < 5 && ln.items.includes(it));
          let isAttachedToProse = false;
          if (sameLine) {
            if (sameLine.isFooter || sameLine.isHeader) {
              isAttachedToProse = true;
            } else if (VN_DIACRITIC_RE.test(sameLine.text)) {
              const idx = sameLine.items.indexOf(it);
              const prevItem = idx > 0 ? sameLine.items[idx - 1] : null;
              const nextItem = idx >= 0 && idx + 1 < sameLine.items.length ? sameLine.items[idx + 1] : null;
              const closeToLeftText = prevItem && it.x1 - prevItem.x2 < 22 && prevItem.x1 < orig.x1 - 4;
              const closeToRightText = nextItem && nextItem.x1 - it.x2 < 22 && nextItem.x2 > orig.x2 + 24;
              const insideLeftColumn = sameLine.x1 < orig.x1 - 45 && it.x1 < orig.x1 - 2;
              if (closeToLeftText || closeToRightText || insideLeftColumn || sameLine.isProse) {
                isAttachedToProse = true;
              }
            }
          }

          if (!isAttachedToProse) {
            f.x1 = Math.min(f.x1, it.x1 - 2);
            f.y1 = Math.min(f.y1, it.y1 - 2);
            f.x2 = Math.max(f.x2, it.x2 + 2);
            f.y2 = Math.max(f.y2, it.y2 + 2);
          }
        }
      }

      // Clip bottom strictly above page footer so "Trang X/Y - Mã đề ..." never bleeds into the bottom of a graph
      if (footerMinY < H && f.y2 > footerMinY - 3) {
        f.y2 = Math.max(f.y1 + 20, footerMinY - 3);
      }

      // Associate nearest question header (same column when 2-col) at or above the figure's top edge
      // (anchoring to f.y1 avoids right-floated figures extending downward past the next question header from mis-labeling!)
      let questionLabel = '';
      const figCol = isTwoColumnPage && (f.x1 + f.x2) / 2 >= W * 0.5 ? 1 : 0;
      for (const q of qHeaders) {
        if (/^PHẦN/i.test(q.label)) continue;
        if (isTwoColumnPage && q.col !== figCol) continue;
        if (q.y1 <= f.y1 + 25) {
          questionLabel = q.label;
        }
      }

      const ymin = Math.max(0, Math.min(1000, Math.round((f.y1 / H) * 1000)));
      const xmin = Math.max(0, Math.min(1000, Math.round((f.x1 / W) * 1000)));
      const ymax = Math.max(0, Math.min(1000, Math.round((f.y2 / H) * 1000)));
      const xmax = Math.max(0, Math.min(1000, Math.round((f.x2 / W) * 1000)));

      if (ymax - ymin >= 25 && xmax - xmin >= 25) {
        detected.push({
          box: [ymin, xmin, ymax, xmax],
          questionLabel,
          description: questionLabel
            ? `Hình vẽ minh họa ${questionLabel}`
            : 'Hình vẽ minh họa từ tài liệu gốc',
          isAnswerKeyPage,
          isRasterImg: f.isRasterImg,
        });
      }
    }

    return { detectedFigures: detected, detectedQuestionLabels, proseLineBoxes };
  } catch (err) {
    console.warn('Deterministic PDF figure detection skipped:', err);
    return { detectedFigures: [], detectedQuestionLabels: [], proseLineBoxes: [] };
  }
}

/**
 * Quick inspection to get total number of pages in a PDF
 */
export async function getPdfTotalPages(pdfData: ArrayBuffer | Uint8Array): Promise<number> {
  let loadingTask: any = null;
  try {
    const safeData = getSafePdfData(pdfData);
    loadingTask = pdfjsLib.getDocument(getDocumentOptions(safeData));
    const pdf = await loadingTask.promise;
    const num = pdf.numPages || 1;
    try {
      if (loadingTask?.destroy) await loadingTask.destroy();
    } catch {}
    return num;
  } catch (err) {
    console.error('Failed to inspect PDF total pages:', err);
    try {
      if (loadingTask?.destroy) await loadingTask.destroy();
    } catch {}
    return 1;
  }
}

/**
 * Open a PDF document once so multiple pages can be rendered without re-parsing the PDF each time.
 */
export async function openPdfDocument(pdfData: ArrayBuffer | Uint8Array): Promise<{
  pdf: any;
  numPages: number;
  destroy: () => Promise<void>;
}> {
  const safeData = getSafePdfData(pdfData);
  const loadingTask = pdfjsLib.getDocument(getDocumentOptions(safeData));
  const pdf = await loadingTask.promise;
  return {
    pdf,
    numPages: pdf.numPages,
    destroy: async () => {
      try {
        if (loadingTask?.destroy) await loadingTask.destroy();
      } catch {}
    },
  };
}

/**
 * Render a single page from an already-opened PDF.js document to crisp JPEG (15x smaller than PNG)
 * and deterministically extract vector/embedded figure bounding boxes.
 */
export async function renderLoadedPdfPageWithFigures(
  pdf: any,
  pageNum: number = 1,
  scale: number = 1.65,
  format: 'jpeg' | 'png' = 'jpeg'
): Promise<{
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  numPages: number;
  detectedFigures: PdfDetectedFigure[];
  detectedQuestionLabels: string[];
  proseLineBoxes: [number, number, number, number][];
}> {
  const numPages = pdf.numPages;
  const validPageNum = Math.max(1, Math.min(pageNum, numPages));
  const page = await pdf.getPage(validPageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context not available');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // White background (critical for JPEG and transparent PDF pages)
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext: any = {
    canvasContext: context,
    canvas,
    viewport: viewport
  };

  await page.render(renderContext).promise;
  const { detectedFigures, detectedQuestionLabels, proseLineBoxes } = await detectFiguresAndLabelsFromPdfPage(page);

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = format === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.86);

  try {
    page.cleanup?.();
  } catch {}

  return {
    dataUrl,
    mimeType,
    width: viewport.width,
    height: viewport.height,
    numPages,
    detectedFigures,
    detectedQuestionLabels,
    proseLineBoxes,
  };
}

/**
 * Render a single page of PDF to Data URL AND deterministically extract bounding boxes
 * of vector figures / embedded images on that page.
 */
export async function renderPdfPageWithFigures(
  pdfData: ArrayBuffer | Uint8Array,
  pageNum: number = 1,
  scale: number = 1.65,
  format: 'jpeg' | 'png' = 'jpeg'
): Promise<{
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  numPages: number;
  detectedFigures: PdfDetectedFigure[];
  detectedQuestionLabels: string[];
  proseLineBoxes: [number, number, number, number][];
}> {
  const docHandle = await openPdfDocument(pdfData);
  try {
    return await renderLoadedPdfPageWithFigures(docHandle.pdf, pageNum, scale, format);
  } finally {
    await docHandle.destroy();
  }
}

/**
 * Render a single page of PDF to image Data URL (PNG)
 */
export async function renderPdfPageToDataUrl(
  pdfData: ArrayBuffer | Uint8Array,
  pageNum: number = 1,
  scale: number = 1.5
): Promise<{ dataUrl: string; width: number; height: number; numPages: number }> {
  const safeData = getSafePdfData(pdfData);
  const loadingTask = pdfjsLib.getDocument(getDocumentOptions(safeData));
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const validPageNum = Math.max(1, Math.min(pageNum, numPages));
  const page = await pdf.getPage(validPageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context not available');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // White background
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext: any = {
    canvasContext: context,
    canvas,
    viewport: viewport
  };

  await page.render(renderContext).promise;

  const dataUrl = canvas.toDataURL('image/png');
  try {
    if (loadingTask?.destroy) await loadingTask.destroy();
  } catch {}

  return {
    dataUrl,
    width: viewport.width,
    height: viewport.height,
    numPages
  };
}

/**
 * Render a specific page range of a PDF to an array of PNG Data URLs
 * Supports progressive callback onPageRendered for instant display of initial pages
 */
export async function renderPdfPageRange(
  pdfData: ArrayBuffer | Uint8Array,
  fromPage: number = 1,
  toPage: number = 5,
  scale: number = 1.5,
  onPageRendered?: (pageNum: number, dataUrl: string) => void
): Promise<{ pages: string[]; totalPages: number }> {
  let loadingTask: any = null;
  try {
    const safeData = getSafePdfData(pdfData);
    loadingTask = pdfjsLib.getDocument(getDocumentOptions(safeData));
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    const start = Math.max(1, Math.min(fromPage, totalPages));
    const end = Math.max(start, Math.min(toPage, totalPages));
    const pages: string[] = [];

    for (let i = start; i <= end; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: context, canvas, viewport } as any).promise;
        const dataUrl = canvas.toDataURL('image/png');
        pages.push(dataUrl);

        if (onPageRendered) {
          onPageRendered(i, dataUrl);
        }
      } catch (pageErr) {
        console.warn(`Error rendering PDF page ${i}:`, pageErr);
      }
    }

    try {
      if (loadingTask?.destroy) await loadingTask.destroy();
    } catch {}

    return { pages, totalPages };
  } catch (err) {
    console.error('Failed to render PDF page range:', err);
    try {
      if (loadingTask?.destroy) await loadingTask.destroy();
    } catch {}
    return { pages: [], totalPages: 1 };
  }
}

/**
 * Render all pages of a PDF up to maxPages to an array of Data URLs
 */
export async function renderAllPdfPages(
  pdfData: ArrayBuffer | Uint8Array,
  maxPages: number = 10,
  scale: number = 1.5
): Promise<string[]> {
  const result = await renderPdfPageRange(pdfData, 1, maxPages, scale);
  return result.pages;
}
