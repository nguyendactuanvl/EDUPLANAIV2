import { apiFetch } from './apiFetch';
import { parseApiResponse } from './utils';
import type { PdfDetectedFigure } from './pdfUtils';

export type BoxTuple = [number, number, number, number];

export const CROP_FIG_TAG_RE = /`?\\?\[CROP_FIG\b((?:[^\[\]]|\[[^\]]*\])*)\\?\]`?/gi;
export const UNRESOLVED_FIG_PLACEHOLDER_RE =
  /\[(?:Hình\s*(?:vẽ|ảnh)|Đồ\s*thị|Bảng\s*biến\s*thiên|Bảng\s*xét\s*dấu|BBT|Biểu\s*đồ|Sơ\s*đồ|Hình\s*minh\s*họa|Hình)(?:\s*\([^)]*\))?(?:\s*:[^\]]*)?\]/i;
export const VISUAL_QUESTION_CUE_RE =
  /(?:hình\s*(?:vẽ|bên|dưới|trên|sau|minh\s*họa|dưới\s*đây|bên\s*dưới|bên\s*phải|bên\s*trái|\d+)|như\s*hình|trong\s*hình|quan\s*sát\s*hình|cho\s*hình|biểu\s*diễn\s*đúng\s*như\s*sau|bảng\s*biến\s*thiên|bảng\s*xét\s*dấu|đồ\s*thị|miền\s*nghiệm|gạch\s*chéo|tô\s*đậm|mặt\s*phẳng\s*tọa\s*độ|hệ\s*trục|parabol|đường\s*cong|hình\s*chóp|lăng\s*trụ|tứ\s*diện|hình\s*nón|hình\s*trụ|hình\s*cầu|đường\s*tròn|sơ\s*đồ|biểu\s*đồ|mạch\s*điện|\[Hình|\[Đồ\s*thị|\[Bảng\s*biến\s*thiên|\[Bảng\s*xét\s*dấu|\[BBT|figure|diagram|graph|variation\s+table|shaded|shown\s+below|shown\s+above|coordinate\s+plane)/i;

// High-precision cues that explicitly indicate a printed figure/BBT/graph exists on the page
// (avoids triggering a slow redundant Pass-2 Vision API call on pure-text geometry/algebra questions)
export const EXPLICIT_PRINTED_FIGURE_CUE_RE =
  /(?:hình\s*(?:vẽ|bên|dưới|trên|sau|minh\s*họa|dưới\s*đây|bên\s*dưới|bên\s*phải|bên\s*trái|\d+)|như\s*hình|trong\s*hình|quan\s*sát\s*hình|cho\s*hình\s*vẽ|biểu\s*diễn\s*đúng\s*như\s*sau|(?:có|cho|như)\s*bảng\s*biến\s*thiên|bảng\s*biến\s*thiên\s*(?:như|sau|dưới|bên|ở|trên|của\s*hàm)|(?:có|cho|như)\s*bảng\s*xét\s*dấu|bảng\s*xét\s*dấu\s*(?:như|sau|dưới|bên|ở)|(?:phần\s*(?:mặt\s*phẳng\s*)?(?:không\s*bị\s*)?gạch\s*chéo)|(?:miền\s*không\s*bị\s*gạch)|(?:tô\s*đậm\s*(?:trong|ở|như|bên|dưới))|(?:(?:có\s*)?đồ\s*thị\s*(?:như\s*hình|hàm\s*số\s*như|bên|dưới|trên|sau|ở\s*hình|là\s*đường\s*cong))|(?:đường\s*cong\s*(?:trong\s*hình|ở\s*hình|như\s*hình|bên|dưới|sau))|(?:sơ\s*đồ\s*(?:bên|dưới|sau|mạch\s*điện))|(?:biểu\s*đồ\s*(?:bên|dưới|sau|hình))|\[Hình|\[Đồ\s*thị|\[Bảng\s*biến\s*thiên|\[Bảng\s*xét\s*dấu|\[BBT|shown\s+(?:below|above|in\s+the\s+figure)|in\s+the\s+(?:figure|diagram|graph)|variation\s+table\s+(?:below|above)|shaded\s+region\s+(?:in|below|above))/i;

const MARKDOWN_TABLE_BLOCK_RE = /((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$)){2,})/gm;

export const isMarkdownBbtTable = (tableBlock: string): boolean => {
  if (!tableBlock) return false;
  if (/(?:tần\s*số|tần\s*suất|phân\s*bố\s*xác\s*suất|biến\s*ngẫu\s*nhiên|số\s*học\s*sinh|nhóm\s*tuổi|điểm\s*thi)/i.test(tableBlock)) {
    return false;
  }
  const rows = tableBlock
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|') && !/^\|\s*[-:|\s]+\|$/.test(line));
  if (rows.length < 2) return false;

  const firstCells = rows.map((row) => {
    const cells = row.split('|').slice(1, -1);
    return (cells[0] || '').replace(/[\$\s\\*_{}]/g, '').toLowerCase();
  });

  const hasXRow = firstCells.some((c) => c === 'x' || c === 't');
  const hasDerivOrYRow = firstCells.some(
    (c) =>
      c === "y'" ||
      c === "f'(x)" ||
      c === "g'(x)" ||
      c === "h'(x)" ||
      c === 'y' ||
      c === 'f(x)' ||
      c === 'g(x)'
  );
  const hasBbtMarkers =
    /\\nearrow|\\searrow|↗|↘|-\s*\\infty|\+\s*\\infty|-∞|\+∞|\|\||\\Vert/.test(tableBlock) ||
    (firstCells.some((c) => c.includes("'")) && /[+-]/.test(tableBlock));

  return hasXRow && hasDerivOrYRow && hasBbtMarkers;
};

export const hasLeakedMarkdownBbtTable = (text: string): boolean => {
  if (!text || !text.includes('|')) return false;
  const matches = text.match(MARKDOWN_TABLE_BLOCK_RE);
  if (!matches) return false;
  return matches.some((tbl) => isMarkdownBbtTable(tbl));
};

const PROBLEM_IMAGE_TOKEN_RE = /\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]/g;
const SOLUTION_IMAGE_TOKEN_RE = /\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/g;

export const parseBoxCoords = (boxInput: string | number[] | undefined | null): BoxTuple | null => {
  if (!boxInput) return null;
  let parts: number[] = [];
  if (Array.isArray(boxInput)) {
    parts = boxInput.map((n) => Number(n)).filter((n) => !Number.isNaN(n));
  } else {
    const cleaned = String(boxInput).replace(/[\[\]\(\)]/g, '').trim();
    parts = cleaned
      .split(/[,;\s]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !Number.isNaN(n));
  }
  if (parts.length !== 4) return null;

  let [ymin, xmin, ymax, xmax] = parts;
  // Auto-scale 0..1 normalized floats into 0..1000 space
  if (Math.max(ymin, xmin, ymax, xmax) <= 1.01) {
    ymin *= 1000;
    xmin *= 1000;
    ymax *= 1000;
    xmax *= 1000;
  }

  ymin = Math.max(0, Math.min(1000, ymin));
  xmin = Math.max(0, Math.min(1000, xmin));
  ymax = Math.max(0, Math.min(1000, ymax));
  xmax = Math.max(0, Math.min(1000, xmax));

  if (ymin >= ymax || xmin >= xmax) return null;
  const boxH = ymax - ymin;
  const boxW = xmax - xmin;
  // Reject tiny noise or accidental full-page bounding boxes
  if (boxH < 15 || boxW < 15 || (boxH > 960 && boxW > 960)) {
    return null;
  }
  return [ymin, xmin, ymax, xmax];
};

export const computeBoxIoU = (a: BoxTuple, b: BoxTuple): number => {
  const interY1 = Math.max(a[0], b[0]);
  const interX1 = Math.max(a[1], b[1]);
  const interY2 = Math.min(a[2], b[2]);
  const interX2 = Math.min(a[3], b[3]);
  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;
  if (interArea <= 0) return 0;
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  const union = areaA + areaB - interArea;
  return union > 0 ? interArea / union : 0;
};

export const computeBoxContainment = (a: BoxTuple, b: BoxTuple): number => {
  const interY1 = Math.max(a[0], b[0]);
  const interX1 = Math.max(a[1], b[1]);
  const interY2 = Math.min(a[2], b[2]);
  const interX2 = Math.min(a[3], b[3]);
  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;
  if (interArea <= 0) return 0;
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  const minArea = Math.min(areaA, areaB);
  return minArea > 0 ? interArea / minArea : 0;
};

/**
 * Validates and trims a figure bounding box against known Vietnamese prose/header/footer lines
 * (normalized 0..1000). Rejects page headers and prose-heavy text blocks, and trims top/bottom
 * edges that slightly graze an adjacent line of question text.
 */
export const sanitizeBoxAgainstProse = (
  box: BoxTuple,
  proseLineBoxes?: BoxTuple[]
): BoxTuple | null => {
  let [ymin, xmin, ymax, xmax] = box;
  const boxH = ymax - ymin;
  const boxW = xmax - xmin;

  // Reject full-width exam title header zone at top of page (e.g. SỞ GIÁO DỤC ... ĐỀ KIỂM TRA ...)
  if (ymax < 165 && xmin < 220 && xmax > 780) {
    return null;
  }

  if (!proseLineBoxes || proseLineBoxes.length === 0) {
    return box;
  }

  // Find prose lines with meaningful horizontal overlap inside this box
  const overlappingProse = proseLineBoxes.filter((pl) => {
    const ox = Math.min(xmax, pl[3]) - Math.max(xmin, pl[1]);
    const oy = Math.min(ymax, pl[2]) - Math.max(ymin, pl[0]);
    if (ox <= 0 || oy <= 0) return false;
    const plW = Math.max(1, pl[3] - pl[1]);
    return ox >= Math.min(45, plW * 0.35);
  });

  // Reject boxes that enclose 3 or more full prose lines (pure text / equation / statistical table block)
  const interiorProse = overlappingProse.filter((pl) => {
    const midY = (pl[0] + pl[2]) / 2;
    return midY > ymin + boxH * 0.14 && midY < ymax - boxH * 0.14;
  });
  if (interiorProse.length >= 3) {
    return null;
  }

  // Gently clip outer top/bottom edge if a prose line grazes ONLY the top 20% or bottom 20% edge
  for (const pl of overlappingProse) {
    const plMidY = (pl[0] + pl[2]) / 2;
    if (plMidY <= ymin + boxH * 0.22 && pl[2] < ymax - 25) {
      ymin = Math.max(ymin, pl[2] + 2);
    } else if (plMidY >= ymax - boxH * 0.22 && pl[0] > ymin + 25) {
      ymax = Math.min(ymax, pl[0] - 2);
    }
  }

  if (ymax - ymin < 22 || boxW < 20) return null;
  return [ymin, xmin, ymax, xmax];
};

export const trimWhiteBordersOnCanvas = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement | null => {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx || w < 4 || h < 4) return sourceCanvas;

  try {
    const imgData = ctx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    const step = w * h > 400000 ? 2 : 1;

    for (let y = 0; y < h; y += step) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x += step) {
        const idx = rowOffset + x * 4;
        const a = imgData[idx + 3];
        if (a < 20) continue;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        if (r < 244 || g < 244 || b < 244) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Completely blank crop -> reject
    if (maxX <= minX || maxY <= minY) return null;
    if (maxX - minX < 12 || maxY - minY < 12) return null;

    // Strip thin clipped text-bleed fragments at the very top or bottom edge that are separated
    // from the main figure body by a pure-white horizontal gap (>= 4px tall)
    const contentH = maxY - minY + 1;
    if (contentH >= 70) {
      const rowHasInk = (y: number): boolean => {
        const rowOff = y * w * 4;
        for (let x = minX; x <= maxX; x++) {
          const idx = rowOff + x * 4;
          if (imgData[idx + 3] >= 20 && (imgData[idx] < 238 || imgData[idx + 1] < 238 || imgData[idx + 2] < 238)) {
            return true;
          }
        }
        return false;
      };

      const maxBleedH = Math.min(28, Math.floor(contentH * 0.19));
      // Check top edge bleed: find first white gap of >= 4 rows after an initial thin ink strip
      let topStripEnd = -1;
      for (let dy = 2; dy <= maxBleedH; dy++) {
        if (!rowHasInk(minY + dy)) {
          let gapLen = 0;
          while (minY + dy + gapLen < maxY && !rowHasInk(minY + dy + gapLen)) {
            gapLen++;
          }
          if (gapLen >= 4 && minY + dy + gapLen < maxY - 30) {
            topStripEnd = minY + dy + gapLen;
            break;
          }
        }
      }
      if (topStripEnd > minY) {
        minY = topStripEnd;
      }

      // Check bottom edge bleed: scan upward from maxY for a white gap of >= 4 rows
      const curH = maxY - minY + 1;
      const maxBotBleedH = Math.min(28, Math.floor(curH * 0.19));
      let botStripStart = -1;
      for (let dy = 2; dy <= maxBotBleedH; dy++) {
        if (!rowHasInk(maxY - dy)) {
          let gapLen = 0;
          while (maxY - dy - gapLen > minY && !rowHasInk(maxY - dy - gapLen)) {
            gapLen++;
          }
          if (gapLen >= 4 && maxY - dy - gapLen > minY + 30) {
            botStripStart = maxY - dy - gapLen;
            break;
          }
        }
      }
      if (botStripStart > minY && botStripStart < maxY) {
        maxY = botStripStart;
      }

      // Recompute tight minX/maxX on the cleaned [minY..maxY] band
      let nMinX = w;
      let nMaxX = -1;
      for (let y = minY; y <= maxY; y += step) {
        const rowOff = y * w * 4;
        for (let x = minX; x <= maxX; x += step) {
          const idx = rowOff + x * 4;
          if (imgData[idx + 3] >= 20 && (imgData[idx] < 244 || imgData[idx + 1] < 244 || imgData[idx + 2] < 244)) {
            if (x < nMinX) nMinX = x;
            if (x > nMaxX) nMaxX = x;
          }
        }
      }
      if (nMaxX > nMinX) {
        minX = nMinX;
        maxX = nMaxX;
      }
    }

    if (maxX - minX < 12 || maxY - minY < 12) return null;

    const margin = 8;
    const cropX = Math.max(0, minX - margin);
    const cropY = Math.max(0, minY - margin);
    const cropW = Math.min(w - cropX, (maxX - minX) + margin * 2 + 1);
    const cropH = Math.min(h - cropY, (maxY - minY) + margin * 2 + 1);

    const out = document.createElement('canvas');
    out.width = cropW;
    out.height = cropH;
    const outCtx = out.getContext('2d');
    if (!outCtx) return sourceCanvas;
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, cropW, cropH);
    outCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return out;
  } catch {
    return sourceCanvas;
  }
};

export const cropFigureFromDataUrl = (
  pageDataUrl: string,
  boxInput: string | number[],
  pad: number = 6
): Promise<{ dataUrl: string; displayW: number; displayH: number; box: BoxTuple } | null> => {
  return new Promise((resolve) => {
    const parsedBox = parseBoxCoords(boxInput);
    if (!pageDataUrl || !parsedBox) {
      resolve(null);
      return;
    }

    const [ymin, xmin, ymax, xmax] = parsedBox;

    // Small crisp margin padding so axis labels (O, x, y, tick marks) are never clipped
    // without pulling adjacent question text lines into the figure.
    const padYmin = Math.max(0, ymin - pad);
    const padXmin = Math.max(0, xmin - pad);
    const padYmax = Math.min(1000, ymax + pad);
    const padXmax = Math.min(1000, xmax + pad);

    const img = new Image();
    img.onload = () => {
      try {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        if (!natW || !natH) {
          resolve(null);
          return;
        }
        const sx = Math.max(0, Math.floor((padXmin / 1000) * natW));
        const sy = Math.max(0, Math.floor((padYmin / 1000) * natH));
        const sw = Math.min(natW - sx, Math.max(12, Math.ceil(((padXmax - padXmin) / 1000) * natW)));
        const sh = Math.min(natH - sy, Math.max(12, Math.ceil(((padYmax - padYmin) / 1000) * natH)));

        const rawCanvas = document.createElement('canvas');
        rawCanvas.width = sw;
        rawCanvas.height = sh;
        const ctx = rawCanvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sw, sh);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        const trimmedCanvas = trimWhiteBordersOnCanvas(rawCanvas);
        if (!trimmedCanvas) {
          resolve(null);
          return;
        }

        const outW = trimmedCanvas.width;
        const outH = trimmedCanvas.height;
        const displayW = Math.max(200, Math.min(520, Math.round(outW * 0.56)));
        const displayH = Math.max(70, Math.round(outH * (displayW / Math.max(1, outW))));

        resolve({
          dataUrl: trimmedCanvas.toDataURL('image/png'),
          displayW,
          displayH,
          box: parsedBox,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = pageDataUrl;
  });
};

export const buildCroppedFigureImgTag = (
  dataUrl: string,
  alt: string,
  page: number,
  displayW: number,
  displayH: number
): string => {
  const safeAlt = (alt || 'Hình vẽ minh họa đề thi').replace(/[\[\]"]/g, '').trim() || 'Hình vẽ minh họa đề thi';
  return `\n\n<img src="${dataUrl}" alt="${safeAlt}" data-cropped-figure="true" data-page="${page}" data-width="${displayW}" data-height="${displayH}" class="max-w-[520px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm block" />\n\n`;
};

export const measureImageDisplaySize = (
  dataUrl: string
): Promise<{ displayW: number; displayH: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const natW = img.naturalWidth || 480;
      const natH = img.naturalHeight || 300;
      const displayW = Math.max(200, Math.min(540, Math.round(natW * 0.6)));
      const displayH = Math.max(60, Math.round(natH * (displayW / Math.max(1, natW))));
      resolve({ displayW, displayH });
    };
    img.onerror = () => resolve({ displayW: 480, displayH: 300 });
    img.src = dataUrl;
  });
};

export const resolveCropFigMarkers = async (
  text: string,
  pageImagesMap: { [pageNum: number]: string },
  autoCropEnabled: boolean,
  defaultPage: number = 1,
  options?: {
    /** When processing a single page image, ALWAYS crop from defaultPage (prevents multi-exam PDF footers like "Trang 1/4" on PDF page 5 from cropping PDF page 1!) */
    lockToDefaultPage?: boolean;
    /** Optional normalized 0..1000 prose line boxes on defaultPage to reject false-positive text/header crops and trim edge bleed */
    proseLineBoxes?: BoxTuple[];
  }
): Promise<{
  text: string;
  croppedBoxes: BoxTuple[];
  croppedBoxesByPage: Record<number, BoxTuple[]>;
  croppedImgTags: string[];
}> => {
  const regex = new RegExp(CROP_FIG_TAG_RE.source, 'gi');
  const matches = Array.from(text.matchAll(regex));
  if (matches.length === 0) {
    return { text, croppedBoxes: [], croppedBoxesByPage: {}, croppedImgTags: [] };
  }

  let output = '';
  let lastIndex = 0;
  const croppedBoxes: BoxTuple[] = [];
  const croppedBoxesByPage: Record<number, BoxTuple[]> = {};
  const croppedImgTags: string[] = [];

  for (const m of matches) {
    const fullMatch = m[0];
    const attrs = m[1] || '';
    const matchIndex = m.index ?? 0;
    output += text.slice(lastIndex, matchIndex);
    lastIndex = matchIndex + fullMatch.length;

    const pageMatch = attrs.match(/page\s*=\s*["']?(\d+)["']?/i);
    const boxMatch = attrs.match(/(?:box_2d|bbox|box)\s*=\s*["']?[\[\(]?\s*([0-9.,;\s]+)\s*[\]\)]?["']?/i);
    const descMatch = attrs.match(/desc\s*=\s*["']([^"']*)["']/i);

    const parsedPage = pageMatch ? Number(pageMatch[1]) : defaultPage;
    const page = options?.lockToDefaultPage
      ? defaultPage
      : (pageImagesMap[parsedPage] ? parsedPage : (pageImagesMap[defaultPage] ? defaultPage : parsedPage));
    const box = boxMatch ? boxMatch[1].trim() : '';
    const rawDesc = (descMatch ? descMatch[1] : 'Hình vẽ minh họa')
      .replace(/[\[\]]/g, '')
      .replace(/"/g, "'")
      .trim();

    let replacement = `\n\n[Hình vẽ (Trang ${page}): ${rawDesc || 'Hình vẽ minh họa'}]\n\n`;

    if (autoCropEnabled && box && pageImagesMap[page]) {
      const parsedRaw = parseBoxCoords(box);
      const sanitized = parsedRaw
        ? sanitizeBoxAgainstProse(parsedRaw, page === defaultPage ? options?.proseLineBoxes : undefined)
        : null;
      if (parsedRaw && !sanitized) {
        // Rejected as an accidental header / pure-prose / statistical-table crop -> omit cleanly
        replacement = '';
      } else if (sanitized) {
        const cropped = await cropFigureFromDataUrl(pageImagesMap[page], sanitized, 6);
        if (cropped) {
          croppedBoxes.push(cropped.box);
          if (!croppedBoxesByPage[page]) croppedBoxesByPage[page] = [];
          croppedBoxesByPage[page].push(cropped.box);
          replacement = buildCroppedFigureImgTag(
            cropped.dataUrl,
            rawDesc || 'Hình vẽ minh họa đề thi',
            page,
            cropped.displayW,
            cropped.displayH
          );
          croppedImgTags.push(replacement);
        }
      }
    }

    output += replacement;
  }

  output += text.slice(lastIndex);
  return { text: output, croppedBoxes, croppedBoxesByPage, croppedImgTags };
};

export const injectFigureIntoPageMarkdown = (
  pageText: string,
  questionLabel: string,
  imgTag: string,
  options?: { replaceLeakedBbtTable?: boolean; box?: BoxTuple }
): string => {
  if (!pageText) return imgTag;

  const replaceLeakedBbtTable = Boolean(options?.replaceLeakedBbtTable);
  const trimmedLabel = (questionLabel || '').trim();
  const labelNumMatch = trimmedLabel.match(/(Câu|Bài|Question|Problem)\s*(\d+)/i);
  const subOptionMatch = trimmedLabel.match(/[-–—]\s*([A-D])\b/i);

  const insertBeforeChoicesOrEnd = (block: string): string => {
    // 0. If opted in (PdfToWord) and block contains a leaked Markdown BBT table, replace it directly with the original cropped BBT image
    if (replaceLeakedBbtTable && !subOptionMatch && block.includes('|')) {
      let replacedBbt = false;
      const nextBlock = block.replace(MARKDOWN_TABLE_BLOCK_RE, (tbl) => {
        if (!replacedBbt && isMarkdownBbtTable(tbl)) {
          replacedBbt = true;
          return imgTag;
        }
        return tbl;
      });
      if (replacedBbt) return nextBlock;
    }

    // 1. Replace an explicit [HÌNH_ẢNH_ĐỀ_BÀI] / [PROBLEM_IMAGE] / [Hình vẽ...] / [Bảng biến thiên...] placeholder first
    if (/\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]|\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/.test(block)) {
      return block.replace(
        /\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]|\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/,
        imgTag
      );
    }
    if (UNRESOLVED_FIG_PLACEHOLDER_RE.test(block)) {
      return block.replace(UNRESOLVED_FIG_PLACEHOLDER_RE, imgTag);
    }

    // 2. If this figure specifically belongs to a choice option A/B/C/D, place right after that option
    if (subOptionMatch) {
      const optLetter = subOptionMatch[1].toUpperCase();
      const optRe = new RegExp(`((?:^|\\n)[ \\t]*(?:\\*{0,2})${optLetter}[\\.\\)](?:\\*{0,2})[^\\n]*)`);
      if (optRe.test(block)) {
        return block.replace(optRe, `$1${imgTag}`);
      }
    }

    // 3. Insert right before the first choice option line (A. or a)) so the figure sits neatly between stem and options
    const firstOptionRe = /\n[ \t]*(?:[-*•]\s*)?(?:\*{0,2})(?:A[\.\)]|a\))(?:\*{0,2})(?:\s+|(?=\$))/;
    const optIdxMatch = block.match(firstOptionRe);
    if (optIdxMatch && typeof optIdxMatch.index === 'number') {
      const idx = optIdxMatch.index;
      return block.slice(0, idx) + imgTag + block.slice(idx);
    }

    // Also handle inline A. B. C. D. on the same line after a newline or sentence
    const inlineChoiceRe =
      /([.?!:])\s+((?:\*{0,2})A[\.\)](?:\*{0,2})(?:\s+|(?=\$))[\s\S]*?(?:\*{0,2})B[\.\)](?:\*{0,2})(?:\s+|(?=\$)))/;
    if (inlineChoiceRe.test(block)) {
      return block.replace(inlineChoiceRe, `$1${imgTag}$2`);
    }

    // 4. Essay / no options: place right at the end of the question block
    return block.trimEnd() + imgTag;
  };

  // Special case: Top-of-page figure belonging to a question carried over from the PREVIOUS page
  // (questionLabel === '' AND box is near the top AND page begins with continuation items a)/b)/A./B. before first Câu/Bài)
  if (!labelNumMatch && options?.box && options.box[0] < 320) {
    const firstQMatch = /(?:^|\n)[ \t]*(?:#{1,4}\s*)?(?:\*{0,2})(?:Câu|Bài|Question|Problem)\s+\d+/i.exec(pageText);
    const preamble = firstQMatch ? pageText.slice(0, firstQMatch.index) : pageText;
    const hasContinuationItems = /(?:^|\n)[ \t]*(?:\*{0,2})(?:[a-d]\)|[A-D]\.)/m.test(preamble);
    if (hasContinuationItems && !/<img\b/i.test(preamble)) {
      // Replace placeholder in preamble if any, otherwise place right at the top of the page above continuation items
      if (UNRESOLVED_FIG_PLACEHOLDER_RE.test(preamble)) {
        return preamble.replace(UNRESOLVED_FIG_PLACEHOLDER_RE, imgTag) + pageText.slice(preamble.length);
      }
      return imgTag.trimStart() + pageText;
    }
  }

  if (labelNumMatch) {
    const num = labelNumMatch[2];
    // Match Vietnamese or English question headers with this number across the whole document/section
    const qStartRe = new RegExp(
      `(?:^|\\n)([ \\t]*(?:#{1,4}\\s*)?(?:\\*{0,2})(?:Câu|Bài|Question|Problem)\\s+${num}\\s*[:.\\)]?(?:\\*{0,2})(?:\\s*[:.\\)])?)`,
      'gi'
    );
    const allMatches = Array.from(pageText.matchAll(qStartRe));
    if (allMatches.length > 0) {
      interface CandidateBlock {
        start: number;
        end: number;
        block: string;
        hasImg: boolean;
        hasPlaceholder: boolean;
        hasLeakedBbt: boolean;
        hasVisualCue: boolean;
      }
      const candidates: CandidateBlock[] = allMatches.map((m) => {
        const blockStart = m.index ?? 0;
        const searchAfter = blockStart + m[0].length;
        const nextHeaderRe =
          /\n[ \t]*(?:#{1,4}\s*)?(?:\*{0,2})(?:Câu\s+\d+|Bài\s+\d+|Question\s+\d+|Problem\s+\d+|PHẦN\s+[IVX1-4]+|PART\s+[IVX1-4]+)(?:\*{0,2})[\s:.\)]/gi;
        nextHeaderRe.lastIndex = searchAfter;
        const nextMatch = nextHeaderRe.exec(pageText);
        const blockEnd = nextMatch ? nextMatch.index : pageText.length;
        const block = pageText.slice(blockStart, blockEnd);
        return {
          start: blockStart,
          end: blockEnd,
          block,
          hasImg: /<img\b/i.test(block),
          hasPlaceholder:
            UNRESOLVED_FIG_PLACEHOLDER_RE.test(block) ||
            /\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]|\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/.test(block),
          hasLeakedBbt: replaceLeakedBbtTable && hasLeakedMarkdownBbtTable(block),
          hasVisualCue: VISUAL_QUESTION_CUE_RE.test(block),
        };
      });

      // Prefer a matching question block that (1) has placeholder, leaked BBT table, or sub-option,
      // (2) has no <img> yet AND mentions visual cues (avoids putting Part IV Câu 1 figure into Part I Câu 1),
      // (3) any matching block without an <img> yet.
      const chosen =
        candidates.find((c) => c.hasPlaceholder || c.hasLeakedBbt || Boolean(subOptionMatch)) ||
        candidates.find((c) => !c.hasImg && c.hasVisualCue) ||
        candidates.find((c) => !c.hasImg);

      if (chosen) {
        const updatedBlock = insertBeforeChoicesOrEnd(chosen.block);
        return pageText.slice(0, chosen.start) + updatedBlock + pageText.slice(chosen.end);
      }
      // Every matching question block with this number already has a figure -> avoid duplicating
      return pageText;
    }
  }

  // Fallback 0: replace explicit [HÌNH_ẢNH_ĐỀ_BÀI] / [HÌNH_ẢNH_ĐÁP_ÁN] / [PROBLEM_IMAGE] / [SOLUTION_IMAGE]
  if (/\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]|\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/.test(pageText)) {
    return pageText.replace(
      /\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]|\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/,
      imgTag
    );
  }

  // Fallback 1: replace first unresolved [Hình vẽ...] placeholder anywhere on the page
  if (UNRESOLVED_FIG_PLACEHOLDER_RE.test(pageText)) {
    const inlineImgTag = imgTag.trim();
    return pageText.replace(UNRESOLVED_FIG_PLACEHOLDER_RE, (_m, offset) => {
      const lineStart = pageText.lastIndexOf('\n', offset) + 1;
      const lineEnd = pageText.indexOf('\n', offset);
      const line = pageText.slice(lineStart, lineEnd === -1 ? pageText.length : lineEnd);
      // Inside a Markdown table row, keep inline <br/><img> so table pipes stay valid
      if (/^\s*\|.*\|\s*$/.test(line)) {
        return `<br/>${inlineImgTag}<br/>`;
      }
      return imgTag;
    });
  }

  // Fallback 1.5: handle grading rubric Markdown table cue like "| Biểu diễn đúng như sau: |"
  const rubricCueRe = /(Biểu\s*diễn\s*đúng\s*như\s*sau\s*:?|như\s*hình\s*(?:vẽ|minh\s*họa)\s*bên\s*dưới\s*\)?\.?)/i;
  const rubricMatch = rubricCueRe.exec(pageText);
  if (rubricMatch && typeof rubricMatch.index === 'number') {
    const pos = rubricMatch.index + rubricMatch[0].length;
    const lineStart = pageText.lastIndexOf('\n', rubricMatch.index) + 1;
    const lineEnd = pageText.indexOf('\n', rubricMatch.index);
    const line = pageText.slice(lineStart, lineEnd === -1 ? pageText.length : lineEnd);
    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (!/<img\b/i.test(line)) {
        return pageText.slice(0, pos) + `<br/>${imgTag.trim()}` + pageText.slice(pos);
      }
    } else {
      const nearby = pageText.slice(Math.max(0, rubricMatch.index - 80), Math.min(pageText.length, pos + 200));
      if (!/<img\b/i.test(nearby)) {
        return pageText.slice(0, pos) + imgTag + pageText.slice(pos);
      }
    }
  }

  // Fallback 2: locate first question mentioning a visual cue that doesn't have an <img> yet
  const qHeaders = Array.from(
    pageText.matchAll(/(?:^|\n)([ \t]*(?:#{1,4}\s*)?(?:\*{0,2})(?:Câu|Bài|Question|Problem)\s+\d+\s*[:.\)]?(?:\*{0,2}))/gi)
  );
  for (let i = 0; i < qHeaders.length; i++) {
    const start = qHeaders[i].index ?? 0;
    const end = i + 1 < qHeaders.length ? (qHeaders[i + 1].index ?? pageText.length) : pageText.length;
    const block = pageText.slice(start, end);
    if (!/<img\b/i.test(block) && VISUAL_QUESTION_CUE_RE.test(block)) {
      const updatedBlock = insertBeforeChoicesOrEnd(block);
      return pageText.slice(0, start) + updatedBlock + pageText.slice(end);
    }
  }

  // Fallback 3: insert before first choice block or append cleanly
  return insertBeforeChoicesOrEnd(pageText);
};

const findQuestionBlockByLabel = (pageText: string, label: string): string | null => {
  const m = (label || '').trim().match(/(Câu|Bài|Question|Problem)\s*(\d+)/i);
  if (!m) return null;
  const num = m[2];
  const qStartRe = new RegExp(
    `(?:^|\\n)[ \\t]*(?:#{1,4}\\s*)?(?:\\*{0,2})(?:Câu|Bài|Question|Problem)\\s+${num}\\s*[:.\\)]?(?:\\*{0,2})(?:\\s*[:.\\)])?`,
    'gi'
  );
  const allMatches = Array.from(pageText.matchAll(qStartRe));
  if (allMatches.length === 0) return null;
  const blocks = allMatches.map((hit) => {
    const start = hit.index ?? 0;
    const nextHeaderRe =
      /\n[ \t]*(?:#{1,4}\s*)?(?:\*{0,2})(?:Câu\s+\d+|Bài\s+\d+|Question\s+\d+|Problem\s+\d+|PHẦN\s+[IVX1-4]+|PART\s+[IVX1-4]+)(?:\*{0,2})[\s:.\)]/gi;
    nextHeaderRe.lastIndex = start + hit[0].length;
    const nextHit = nextHeaderRe.exec(pageText);
    return pageText.slice(start, nextHit ? nextHit.index : pageText.length);
  });
  return blocks.find((b) => !/<img\b/i.test(b)) || blocks[0];
};

export const applyPdfDetectedFigures = async (
  pageText: string,
  pageDataUrl: string,
  pageNum: number,
  detectedFigures: PdfDetectedFigure[],
  existingBoxes: BoxTuple[],
  options?: { replaceLeakedBbtTable?: boolean; proseLineBoxes?: BoxTuple[] }
): Promise<{ text: string; croppedBoxes: BoxTuple[] }> => {
  if (!pageDataUrl || !detectedFigures || detectedFigures.length === 0) {
    return { text: pageText, croppedBoxes: existingBoxes };
  }

  let updated = pageText;
  const allBoxes: BoxTuple[] = [...existingBoxes];

  for (const fig of detectedFigures) {
    const parsedRaw = parseBoxCoords(fig.box);
    if (!parsedRaw) continue;

    // For vector-only detections, sanitize against prose lines; embedded raster images keep exact bounds
    const parsed = fig.isRasterImg
      ? parsedRaw
      : sanitizeBoxAgainstProse(parsedRaw, options?.proseLineBoxes);
    if (!parsed) continue;

    // Skip if Pass 1 AI already cropped substantially the same or containing region
    if (allBoxes.some((b) => computeBoxIoU(b, parsed) > 0.25 || computeBoxContainment(b, parsed) > 0.55)) {
      continue;
    }

    // For non-raster vector clusters attached to a known question label, verify the target block actually needs a figure
    if (!fig.isRasterImg && !fig.isAnswerKeyPage && fig.questionLabel) {
      const targetBlock = findQuestionBlockByLabel(updated, fig.questionLabel);
      if (targetBlock) {
        const hasPlaceholderOrLeakedBbt =
          UNRESOLVED_FIG_PLACEHOLDER_RE.test(targetBlock) ||
          (Boolean(options?.replaceLeakedBbtTable) && hasLeakedMarkdownBbtTable(targetBlock));
        if (/<img\b/i.test(targetBlock) && !hasPlaceholderOrLeakedBbt) {
          continue;
        }
        if (!VISUAL_QUESTION_CUE_RE.test(targetBlock) && !hasPlaceholderOrLeakedBbt) {
          continue;
        }
      }
    }

    // PDF raster/vector bounds are exact -> use tight 4/1000 padding so adjacent text never bleeds in
    const cropped = await cropFigureFromDataUrl(pageDataUrl, parsed, fig.isRasterImg ? 3 : 5);
    if (!cropped) continue;

    allBoxes.push(cropped.box);
    const imgTag = buildCroppedFigureImgTag(
      cropped.dataUrl,
      fig.description || 'Hình vẽ minh họa từ tài liệu gốc',
      pageNum,
      cropped.displayW,
      cropped.displayH
    );
    updated = injectFigureIntoPageMarkdown(updated, fig.questionLabel || '', imgTag, {
      ...options,
      box: parsed,
    });
  }

  return { text: updated, croppedBoxes: allBoxes };
};

export const shouldRunPass2FigureDetection = (
  pageText: string,
  options?: { replaceLeakedBbtTable?: boolean }
): boolean => {
  if (!pageText || !pageText.trim()) return false;
  // Always run Pass 2 if there is an unresolved [Hình vẽ...] / [Đồ thị...] / [Bảng biến thiên...] / [HÌNH_ẢNH_ĐỀ_BÀI] placeholder
  if (
    UNRESOLVED_FIG_PLACEHOLDER_RE.test(pageText) ||
    /\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]/.test(pageText)
  ) {
    return true;
  }

  // If PdfToWord opted in to replace leaked Markdown BBT tables with original images, trigger Pass 2 whenever a BBT table leaked
  if (options?.replaceLeakedBbtTable && hasLeakedMarkdownBbtTable(pageText)) {
    return true;
  }

  // Count how many question blocks explicitly reference a printed figure/BBT/graph vs how many already have an <img>
  const qHeaders = Array.from(
    pageText.matchAll(/(?:^|\n)([ \t]*(?:#{1,4}\s*)?(?:\*{0,2})(?:Câu|Bài|Question|Problem)\s+\d+\s*[:.\)]?(?:\*{0,2}))/gi)
  );
  if (qHeaders.length > 0) {
    for (let i = 0; i < qHeaders.length; i++) {
      const start = qHeaders[i].index ?? 0;
      const end = i + 1 < qHeaders.length ? (qHeaders[i + 1].index ?? pageText.length) : pageText.length;
      const block = pageText.slice(start, end);
      if (EXPLICIT_PRINTED_FIGURE_CUE_RE.test(block) && !/<img\b/i.test(block)) {
        return true;
      }
    }
    return false;
  }

  // Standalone snippet / rubric table (no Câu/Bài header): run Pass 2 only if explicit printed figure cues exist and no <img> was cropped
  return EXPLICIT_PRINTED_FIGURE_CUE_RE.test(pageText) && !/<img\b/i.test(pageText);
};

export const detectPageFiguresViaVision = async (
  pageText: string,
  pageDataUrl: string,
  pageNum: number
): Promise<Array<{ questionLabel?: string; box_2d?: number[]; description?: string }>> => {
  try {
    const mimeMatch = pageDataUrl.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const imageBase64 = pageDataUrl.replace(/^data:[^;]+;base64,/, '');

    const res = await apiFetch('/api/detect-page-figures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        pageNum,
        pageMarkdown: pageText.replace(/<img\b[^>]*>/gi, '[Đã chèn hình ảnh]'),
      }),
    });
    if (!res.ok) return [];

    const raw = await res.text();
    const data = parseApiResponse<{ figures?: Array<{ questionLabel?: string; box_2d?: number[]; description?: string }> }>(raw);
    return Array.isArray(data?.figures) ? data.figures : [];
  } catch (err) {
    console.warn(`Pass-2 figure detection failed for page ${pageNum}:`, err);
    return [];
  }
};

export const recoverMissingPageFigures = async (
  pageText: string,
  pageDataUrl: string,
  pageNum: number,
  existingBoxes: BoxTuple[],
  options?: { replaceLeakedBbtTable?: boolean; proseLineBoxes?: BoxTuple[] }
): Promise<string> => {
  if (!pageDataUrl || !shouldRunPass2FigureDetection(pageText, options)) {
    return pageText;
  }

  const figures = await detectPageFiguresViaVision(pageText, pageDataUrl, pageNum);
  if (figures.length === 0) return pageText;

  let updated = pageText;
  const allBoxes: BoxTuple[] = [...existingBoxes];

  for (const fig of figures) {
    const parsedRaw = parseBoxCoords(fig?.box_2d);
    if (!parsedRaw) continue;
    const parsed = sanitizeBoxAgainstProse(parsedRaw, options?.proseLineBoxes);
    if (!parsed) continue;
    if (allBoxes.some((b) => computeBoxIoU(b, parsed) > 0.3 || computeBoxContainment(b, parsed) > 0.55)) {
      continue;
    }
    const cropped = await cropFigureFromDataUrl(pageDataUrl, parsed, 6);
    if (!cropped) continue;

    allBoxes.push(cropped.box);
    const imgTag = buildCroppedFigureImgTag(
      cropped.dataUrl,
      fig.description || 'Hình vẽ minh họa đề thi',
      pageNum,
      cropped.displayW,
      cropped.displayH
    );
    updated = injectFigureIntoPageMarkdown(updated, fig.questionLabel || '', imgTag, {
      ...options,
      box: parsed,
    });
  }

  return updated;
};

/**
 * Full 3-layer original-figure enrichment for ExerciseSolver ("Giải bài tập"):
 * - Supports PDF (digital vector/TikZ + scanned), single images/screenshots/camera, and Word (.docx) embedded images.
 * - Injects crisp cropped original figures directly into the matching question in "## Đề bài" / "## Problem Statement"
 *   and (when showInSolution is true) into "## Lời giải chi tiết" / "## Detailed Solution".
 */
export const enrichExerciseSolutionWithOriginalFigures = async (
  rawSolution: string,
  options: {
    pageImagesMap?: Record<number, string>;
    pageDetectedFiguresMap?: Record<number, PdfDetectedFigure[]>;
    docxImageMap?: Record<string, string>;
    showInSolution?: boolean;
  }
): Promise<string> => {
  if (!rawSolution || !rawSolution.trim()) return rawSolution;
  const {
    pageImagesMap = {},
    pageDetectedFiguresMap = {},
    docxImageMap = {},
    showInSolution = true,
  } = options;

  let text = rawSolution;
  const injectedForSolution: Array<{ questionLabel: string; imgTag: string }> = [];

  // 0. Replace embedded Word (.docx) image tokens if present
  const docxEntries = Object.entries(docxImageMap);
  if (docxEntries.length > 0) {
    for (const [token, dataUrl] of docxEntries) {
      const { displayW, displayH } = await measureImageDisplaySize(dataUrl);
      const imgTag = buildCroppedFigureImgTag(dataUrl, 'Hình vẽ từ tài liệu gốc', 1, displayW, displayH);
      if (text.includes(token)) {
        text = text.split(token).join(imgTag);
      } else {
        text = injectFigureIntoPageMarkdown(text, '', imgTag);
      }
      injectedForSolution.push({ questionLabel: '', imgTag });
    }
  }

  // 1. Layer 1: Resolve any [CROP_FIG page=N box_2d=[...] desc="..."] emitted by AI
  const resolved = await resolveCropFigMarkers(text, pageImagesMap, true, 1);
  text = resolved.text;
  const boxesByPage: Record<number, BoxTuple[]> = { ...resolved.croppedBoxesByPage };

  // Split into "## Đề bài" (problemPart) and "## Lời giải chi tiết" (solutionPart)
  const solHeadingRe = /\n(?=##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution|Answer))/i;
  const solMatch = solHeadingRe.exec(text);
  let problemPart = solMatch ? text.slice(0, solMatch.index) : text;
  let solutionPart = solMatch ? text.slice(solMatch.index) : '';

  // Record any Layer 1 images already inside problemPart so we can mirror them into solutionPart if placeholders exist
  const problemImgMatches = Array.from(problemPart.matchAll(/<img\b[^>]*data-cropped-figure="true"[^>]*\/?>/gi));
  for (const m of problemImgMatches) {
    injectedForSolution.push({ questionLabel: '', imgTag: `\n\n${m[0]}\n\n` });
  }

  const pageNumbers = Object.keys(pageImagesMap)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  // 2. Layer 2: Deterministic PDF vector / embedded raster figure recovery
  for (const p of pageNumbers) {
    const pageDataUrl = pageImagesMap[p];
    const detFigs = pageDetectedFiguresMap[p] || [];
    if (!pageDataUrl || detFigs.length === 0) continue;
    if (!boxesByPage[p]) boxesByPage[p] = [];

    for (const fig of detFigs) {
      const parsed = parseBoxCoords(fig.box);
      if (!parsed) continue;
      if (boxesByPage[p].some((b) => computeBoxIoU(b, parsed) > 0.35)) {
        continue;
      }
      const cropped = await cropFigureFromDataUrl(pageDataUrl, parsed, 8);
      if (!cropped) continue;

      boxesByPage[p].push(cropped.box);
      const imgTag = buildCroppedFigureImgTag(
        cropped.dataUrl,
        fig.description || 'Hình vẽ minh họa từ tài liệu gốc',
        p,
        cropped.displayW,
        cropped.displayH
      );

      if (fig.isAnswerKeyPage) {
        // Rubric / answer-key page figures belong to the solution section
        if (solutionPart && showInSolution) {
          solutionPart = injectFigureIntoPageMarkdown(solutionPart, fig.questionLabel || '', imgTag);
        }
      } else {
        problemPart = injectFigureIntoPageMarkdown(problemPart, fig.questionLabel || '', imgTag);
        injectedForSolution.push({ questionLabel: fig.questionLabel || '', imgTag });
      }
    }
  }

  // 3. Layer 3: Pass-2 Vision recovery for uploaded images / screenshots / scanned PDFs
  for (const p of pageNumbers) {
    const pageDataUrl = pageImagesMap[p];
    const detFigs = pageDetectedFiguresMap[p] || [];
    if (!pageDataUrl) continue;
    // Skip pages that already had deterministic PDF figures detected
    if (detFigs.length > 0) continue;
    if (!shouldRunPass2FigureDetection(problemPart)) break;

    if (!boxesByPage[p]) boxesByPage[p] = [];
    const visionFigs = await detectPageFiguresViaVision(problemPart, pageDataUrl, p);
    for (const fig of visionFigs) {
      const parsed = parseBoxCoords(fig?.box_2d);
      if (!parsed) continue;
      if (boxesByPage[p].some((b) => computeBoxIoU(b, parsed) > 0.4)) {
        continue;
      }
      const cropped = await cropFigureFromDataUrl(pageDataUrl, parsed, 18);
      if (!cropped) continue;

      boxesByPage[p].push(cropped.box);
      const imgTag = buildCroppedFigureImgTag(
        cropped.dataUrl,
        fig.description || 'Hình vẽ minh họa đề thi',
        p,
        cropped.displayW,
        cropped.displayH
      );
      problemPart = injectFigureIntoPageMarkdown(problemPart, fig.questionLabel || '', imgTag);
      injectedForSolution.push({ questionLabel: fig.questionLabel || '', imgTag });
    }
  }

  // 4. Mirror extracted figures into "## Lời giải chi tiết" when showInSolution is enabled
  if (solutionPart) {
    if (showInSolution && injectedForSolution.length > 0) {
      for (const item of injectedForSolution) {
        // Skip if this exact image data URL is already in solutionPart
        const srcMatch = item.imgTag.match(/src="([^"]+)"/i);
        if (srcMatch && solutionPart.includes(srcMatch[1])) continue;

        if (item.questionLabel) {
          solutionPart = injectFigureIntoPageMarkdown(solutionPart, item.questionLabel, item.imgTag);
        } else if (SOLUTION_IMAGE_TOKEN_RE.test(solutionPart)) {
          solutionPart = solutionPart.replace(
            /\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/,
            item.imgTag
          );
        } else if (!/<img\b/i.test(solutionPart)) {
          // Single-problem solution with no question label: insert right below ## Lời giải chi tiết
          solutionPart = solutionPart.replace(
            /(##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution|Answer)[^\n]*\n)/i,
            `$1${item.imgTag}`
          );
        }
      }
    }
  }

  // 5. Clean up any remaining unreplaced placeholder tokens so raw tags never leak to the UI
  problemPart = problemPart.replace(PROBLEM_IMAGE_TOKEN_RE, '').replace(SOLUTION_IMAGE_TOKEN_RE, '');
  solutionPart = solutionPart.replace(PROBLEM_IMAGE_TOKEN_RE, '').replace(SOLUTION_IMAGE_TOKEN_RE, '');

  return `${problemPart}${solutionPart}`.trim();
};
