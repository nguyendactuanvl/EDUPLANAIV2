import { apiFetch } from './apiFetch';
import { parseApiResponse } from './utils';
import type { PdfDetectedFigure } from './pdfUtils';

export type BoxTuple = [number, number, number, number];

export const CROP_FIG_TAG_RE = /`?\\?\[CROP_FIG\b((?:[^\[\]]|\[[^\]]*\])*)\\?\]`?/gi;
export const UNRESOLVED_FIG_PLACEHOLDER_RE =
  /\[(?:Hình\s*(?:vẽ|ảnh)|Đồ\s*thị|Biểu\s*đồ|Sơ\s*đồ|Hình\s*minh\s*họa|Hình)(?:\s*\([^)]*\))?(?:\s*:[^\]]*)?\]/i;
export const VISUAL_QUESTION_CUE_RE =
  /(?:hình\s*(?:vẽ|bên|dưới|trên|sau|minh\s*họa|dưới\s*đây|bên\s*dưới|bên\s*phải|bên\s*trái|\d+)|như\s*hình|trong\s*hình|quan\s*sát\s*hình|cho\s*hình|biểu\s*diễn\s*đúng\s*như\s*sau|đồ\s*thị|miền\s*nghiệm|gạch\s*chéo|tô\s*đậm|mặt\s*phẳng\s*tọa\s*độ|hệ\s*trục|parabol|đường\s*cong|hình\s*chóp|lăng\s*trụ|tứ\s*diện|hình\s*nón|hình\s*trụ|hình\s*cầu|đường\s*tròn|sơ\s*đồ|biểu\s*đồ|mạch\s*điện|\[Hình|\[Đồ\s*thị|figure|diagram|graph|shaded|shown\s+below|shown\s+above|coordinate\s+plane)/i;

// High-precision cues that explicitly indicate a printed figure/diagram exists on the page
// (avoids triggering a slow redundant Pass-2 Vision API call on pure-text geometry/algebra questions)
export const EXPLICIT_PRINTED_FIGURE_CUE_RE =
  /(?:hình\s*(?:vẽ|bên|dưới|trên|sau|minh\s*họa|dưới\s*đây|bên\s*dưới|bên\s*phải|bên\s*trái|\d+)|như\s*hình|trong\s*hình|quan\s*sát\s*hình|cho\s*hình\s*vẽ|biểu\s*diễn\s*đúng\s*như\s*sau|(?:phần\s*(?:mặt\s*phẳng\s*)?(?:không\s*bị\s*)?gạch\s*chéo)|(?:miền\s*không\s*bị\s*gạch)|(?:tô\s*đậm\s*(?:trong|ở|như|bên|dưới))|(?:đồ\s*thị\s*(?:như\s*hình|bên|dưới|trên|sau))|(?:đường\s*cong\s*(?:trong\s*hình|bên|dưới|sau))|(?:sơ\s*đồ\s*(?:bên|dưới|sau|mạch\s*điện))|(?:biểu\s*đồ\s*(?:bên|dưới|sau|hình))|\[Hình|\[Đồ\s*thị|shown\s+(?:below|above|in\s+the\s+figure)|in\s+the\s+(?:figure|diagram|graph)|shaded\s+region\s+(?:in|below|above))/i;

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

    const margin = 10;
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
  pad: number = 18
): Promise<{ dataUrl: string; displayW: number; displayH: number; box: BoxTuple } | null> => {
  return new Promise((resolve) => {
    const parsedBox = parseBoxCoords(boxInput);
    if (!pageDataUrl || !parsedBox) {
      resolve(null);
      return;
    }

    const [ymin, xmin, ymax, xmax] = parsedBox;

    // Add margin padding before slicing so axis labels (O, x, y, tick marks) are never clipped;
    // trimWhiteBordersOnCanvas cleans up any excess whitespace afterwards.
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
  defaultPage: number = 1
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
    const page = pageImagesMap[parsedPage] ? parsedPage : (pageImagesMap[defaultPage] ? defaultPage : parsedPage);
    const box = boxMatch ? boxMatch[1].trim() : '';
    const rawDesc = (descMatch ? descMatch[1] : 'Hình vẽ minh họa')
      .replace(/[\[\]]/g, '')
      .replace(/"/g, "'")
      .trim();

    let replacement = `\n\n[Hình vẽ (Trang ${page}): ${rawDesc || 'Hình vẽ minh họa'}]\n\n`;

    if (autoCropEnabled && box && pageImagesMap[page]) {
      const cropped = await cropFigureFromDataUrl(pageImagesMap[page], box);
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

    output += replacement;
  }

  output += text.slice(lastIndex);
  return { text: output, croppedBoxes, croppedBoxesByPage, croppedImgTags };
};

export const injectFigureIntoPageMarkdown = (
  pageText: string,
  questionLabel: string,
  imgTag: string
): string => {
  if (!pageText) return imgTag;

  const trimmedLabel = (questionLabel || '').trim();
  const labelNumMatch = trimmedLabel.match(/(Câu|Bài|Question|Problem)\s*(\d+)/i);
  const subOptionMatch = trimmedLabel.match(/[-–—]\s*([A-D])\b/i);

  const insertBeforeChoicesOrEnd = (block: string): string => {
    // 1. Replace an explicit [HÌNH_ẢNH_ĐỀ_BÀI] / [PROBLEM_IMAGE] / [Hình vẽ...] placeholder first
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
          hasVisualCue: VISUAL_QUESTION_CUE_RE.test(block),
        };
      });

      // Prefer a matching question block that (1) has placeholder or sub-option,
      // (2) has no <img> yet AND mentions visual cues (avoids putting Part IV Câu 1 figure into Part I Câu 1),
      // (3) any matching block without an <img> yet.
      const chosen =
        candidates.find((c) => c.hasPlaceholder || Boolean(subOptionMatch)) ||
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

export const applyPdfDetectedFigures = async (
  pageText: string,
  pageDataUrl: string,
  pageNum: number,
  detectedFigures: PdfDetectedFigure[],
  existingBoxes: BoxTuple[]
): Promise<{ text: string; croppedBoxes: BoxTuple[] }> => {
  if (!pageDataUrl || !detectedFigures || detectedFigures.length === 0) {
    return { text: pageText, croppedBoxes: existingBoxes };
  }

  let updated = pageText;
  const allBoxes: BoxTuple[] = [...existingBoxes];

  for (const fig of detectedFigures) {
    const parsed = parseBoxCoords(fig.box);
    if (!parsed) continue;
    // Skip if Pass 1 AI already cropped substantially the same region
    if (allBoxes.some((b) => computeBoxIoU(b, parsed) > 0.35)) {
      continue;
    }
    // PDF vector/image bounds already include adjacent diagram labels, so use crisp 8/1000 padding
    const cropped = await cropFigureFromDataUrl(pageDataUrl, parsed, 8);
    if (!cropped) continue;

    allBoxes.push(cropped.box);
    const imgTag = buildCroppedFigureImgTag(
      cropped.dataUrl,
      fig.description || 'Hình vẽ minh họa từ tài liệu gốc',
      pageNum,
      cropped.displayW,
      cropped.displayH
    );
    updated = injectFigureIntoPageMarkdown(updated, fig.questionLabel || '', imgTag);
  }

  return { text: updated, croppedBoxes: allBoxes };
};

export const shouldRunPass2FigureDetection = (pageText: string): boolean => {
  if (!pageText || !pageText.trim()) return false;
  // Always run Pass 2 if there is an unresolved [Hình vẽ...] / [Đồ thị...] / [HÌNH_ẢNH_ĐỀ_BÀI] placeholder
  if (
    UNRESOLVED_FIG_PLACEHOLDER_RE.test(pageText) ||
    /\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]/.test(pageText)
  ) {
    return true;
  }

  // Count how many question blocks explicitly reference a printed figure vs how many already have an <img>
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
  existingBoxes: BoxTuple[]
): Promise<string> => {
  if (!pageDataUrl || !shouldRunPass2FigureDetection(pageText)) {
    return pageText;
  }

  const figures = await detectPageFiguresViaVision(pageText, pageDataUrl, pageNum);
  if (figures.length === 0) return pageText;

  let updated = pageText;
  const allBoxes: BoxTuple[] = [...existingBoxes];

  for (const fig of figures) {
    const parsed = parseBoxCoords(fig?.box_2d);
    if (!parsed) continue;
    if (allBoxes.some((b) => computeBoxIoU(b, parsed) > 0.4)) {
      continue;
    }
    const cropped = await cropFigureFromDataUrl(pageDataUrl, parsed);
    if (!cropped) continue;

    allBoxes.push(cropped.box);
    const imgTag = buildCroppedFigureImgTag(
      cropped.dataUrl,
      fig.description || 'Hình vẽ minh họa đề thi',
      pageNum,
      cropped.displayW,
      cropped.displayH
    );
    updated = injectFigureIntoPageMarkdown(updated, fig.questionLabel || '', imgTag);
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
