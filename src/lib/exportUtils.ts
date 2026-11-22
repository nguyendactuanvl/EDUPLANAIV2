const saveAs = (blob: Blob | any, filename: string) => {
  if (typeof window === 'undefined') return;
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('Error saving file:', err);
  }
};
import html2canvas from 'html2canvas';
import { mml2omml } from 'mathml2omml-plus';
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  convertMillimetersToTwip,
  Packer,
  ImportedXmlComponent,
  ImageRun,
  PageBreak,
  VerticalMergeType,
  VerticalAlign,
  ShadingType,
  PageOrientation,
  type ParagraphChild,
  type FileChild,
} from 'docx';
import {
  cleanOptionText,
  fixInlineOptionText,
  sanitizeMathBeforeRender,
  sanitizeLatexString,
  wrapNakedMathEnvironments,
  preProcessMathContent
} from './utils';
import { convertBbtTableToSvg, autoEnrichTextWithVisuals } from './bbtRenderer';
import { getTikzSvg } from '../components/TikzRenderer';
import { normalizeMathText, normalizeArithmeticProgressionFormulas, preprocessMathText, fixAndMergeMathArrows } from './globalMath';

export interface ElectronMathTypeBridge {
  isSupported: boolean;
  convertAndSave: (buffer: ArrayBuffer, fileName: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronMathType?: ElectronMathTypeBridge;
  }
}

/**
 * Quy đổi các lệnh KaTeX/MathJax đặc thù bên trong công thức sang chuẩn LaTeX cổ điển của MathType:
 * \dfrac và \tfrac -> \frac, \geqslant -> \geq, \leqslant -> \leq.
 */
export function normalizeLatexCommandsForMathType(tex: string): string {
  if (!tex) return '';
  return tex
    .replace(/\\(?:d|t)frac(?![a-zA-Z])/g, '\\frac')
    .replace(/\\geqslant(?![a-zA-Z])/g, '\\geq')
    .replace(/\\leqslant(?![a-zA-Z])/g, '\\leq')
    .replace(/\\ge\s+slant(?![a-zA-Z])/g, '\\geq')
    .replace(/\\le\s+slant(?![a-zA-Z])/g, '\\leq');
}

/**
 * Kiểm tra chuỗi TeX đã được bọc bởi đúng một cặp ngoặc nhọn ngoài cùng {...} hay chưa
 * (tránh nhận nhầm dạng {a} + {b} và tránh bọc trùng {{ABC}}).
 */
function isWrappedInSingleBraceGroup(tex: string): boolean {
  if (!tex.startsWith('{') || !tex.endsWith('}')) return false;
  let depth = 0;
  for (let i = 0; i < tex.length; i++) {
    const ch = tex[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && i < tex.length - 1) return false;
    }
  }
  return depth === 0;
}

/**
 * Bọc thêm cặp ngoặc nhọn {} cho các công thức inline dạng tên hình học/biến/số/tọa độ
 * (như ${ABC}$, ${12}$, ${Oxy}$, ${d}$, ${(-3; 0)}$, ${5\text{ cm}}$, ${2x - 3y \le -6}$...)
 * để khi chuyển sang MathType (Toggle TeX / Alt + \) luôn nhận diện chuẩn 100%,
 * không bị bỏ sót số hoặc chuỗi chữ cái thường.
 */
function wrapInlineTexForMathType(cleanTex: string): string {
  if (!cleanTex) return '';
  if (isWrappedInSingleBraceGroup(cleanTex)) return cleanTex;
  if (/\\begin\s*\{/.test(cleanTex)) return cleanTex;

  const hasBackslashCmd = /\\[a-zA-Z]+/.test(cleanTex);
  const startsWithNumberOrSign = /^[+-]?\d/.test(cleanTex);
  const onlyTextOrUnitCmd =
    hasBackslashCmd &&
    !cleanTex
      .replace(/\\(?:text|mathrm|operatorname)\s*\{[^{}]*\}/g, '')
      .replace(/\\(?:circ|degree|quad|qquad)(?![a-zA-Z])/g, '')
      .match(/\\[a-zA-Z]+/);

  if (!hasBackslashCmd || startsWithNumberOrSign || onlyTextOrUnitCmd) {
    return `{${cleanTex}}`;
  }
  return cleanTex;
}

/**
 * Chuẩn hóa toàn bộ nội dung LaTeX cho MathType trước khi tạo file .docx:
 * - Chuyển công thức display $$ ... $$ thành \[ ... \] (xóa khoảng trắng thừa ở 2 đầu bên trong).
 * - Giữ nguyên công thức inline $ ... $ và xóa khoảng trắng thừa sát dấu $ bên trong (ví dụ $ x^2 $ -> ${x^2}$).
 * - Bọc {} cho các công thức inline dạng chữ/số/tọa độ (${ABC}$, ${12}$, ${Oxy}$...) để MathType nhận diện chuẩn.
 * - Quy đổi các lệnh KaTeX/MathJax đặc thù sang chuẩn LaTeX cổ điển của MathType:
 *   \dfrac và \tfrac -> \frac, \geqslant -> \geq, \leqslant -> \leq.
 */
export function normalizeLatexForMathType(text: string): string {
  if (!text) return '';

  // 1. Quy đổi các lệnh KaTeX/MathJax đặc thù sang chuẩn LaTeX cổ điển của MathType
  let result = normalizeLatexCommandsForMathType(text);

  // 2. Chuyển công thức display $$ ... $$ thành \[ ... \] (xóa khoảng trắng thừa ở 2 đầu bên trong)
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_match, inner: string) => {
    const cleanInner = normalizeLatexCommandsForMathType(inner)
      .replace(/(?<!\\)\$/g, '')
      .replace(/\\\[|\\\]/g, '')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    return cleanInner ? `\\[${cleanInner}\\]` : '';
  });

  // Chuẩn hóa các khối \[ ... \] có sẵn (xóa khoảng trắng thừa ở 2 đầu bên trong)
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner: string) => {
    const cleanInner = normalizeLatexCommandsForMathType(inner)
      .replace(/(?<!\\)\$/g, '')
      .replace(/\\\[|\\\]/g, '')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    return cleanInner ? `\\[${cleanInner}\\]` : '';
  });

  // Chuẩn hóa công thức inline \( ... \) sang $...$
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_match, inner: string) => {
    const cleanInner = normalizeLatexCommandsForMathType(inner)
      .replace(/(?<!\\)\$/g, '')
      .replace(/\\\(|\\\)/g, '')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    return cleanInner ? `$${wrapInlineTexForMathType(cleanInner)}$` : '';
  });

  // 3. Giữ nguyên công thức inline $ ... $ và xóa khoảng trắng thừa sát dấu $ bên trong (ví dụ $ ABC $ -> ${ABC}$)
  result = result.replace(/\$([^$\r\n]+?)\$/g, (_match, inner: string) => {
    const cleanInner = normalizeLatexCommandsForMathType(inner)
      .replace(/(?<!\\)\$/g, '')
      .replace(/\\\[|\\\]/g, '')
      .trim();
    return cleanInner ? `$${wrapInlineTexForMathType(cleanInner)}$` : '';
  });

  return result;
}

/**
 * Định dạng một token toán học đơn lẻ sang chuỗi chuẩn MathType ($...$ hoặc \[...\]).
 * Loại bỏ mọi dấu phân cách $ / \[ / \] thừa bên trong để lệnh Toggle TeX (Alt + \)
 * của MathType không bao giờ bắt cặp sai xuyên qua hình ảnh hoặc đoạn văn khác.
 */
function formatMathTokenForMathType(rawTex: string, isBlock?: boolean): string {
  if (!rawTex) return '';
  let inner = rawTex.trim();
  // Gỡ vỏ phân cách bên ngoài (kể cả khi bị lệch 1 đầu)
  inner = inner
    .replace(/^(?:\$\$|\\\[|\\\(|(?<!\\)\$)+/, '')
    .replace(/(?:\$\$|\\\]|\\\)|(?<!\\)\$)+$/, '');

  const cleanTex = normalizeLatexCommandsForMathType(inner)
    .replace(/(?<!\\)\$/g, '')
    .replace(/\\\[|\\\]|\\\(|\\\)/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  if (!cleanTex) return '';
  return isBlock ? `\\[${cleanTex}\\]` : `$${wrapInlineTexForMathType(cleanTex)}$`;
}

/**
 * Làm sạch các ký tự phân cách TeX mồ côi trong văn bản thường (ngoài công thức)
 * khi xuất Word chuẩn MathType để tránh MathType Toggle TeX (Alt + \) nuốt mất hình ảnh.
 */
function sanitizePlainTextForMathType(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?<!\\)\$/g, '')
    .replace(/\\\[/g, '\\ [')
    .replace(/\\\]/g, '\\ ]')
    .replace(/\\\(/g, '\\ (')
    .replace(/\\\)/g, '\\ )');
}

/**
 * Hiển thị Modal hướng dẫn chuyển đổi công thức MathType sau khi tải file .docx trên trình duyệt Web hoặc bản Desktop vỏ cũ.
 */
export function showMathTypeGuideModal(): void {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('mathtype-export-guide-modal');
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'mathtype-export-guide-modal';
  overlay.style.cssText = [
    'position: fixed',
    'inset: 0',
    'background: rgba(15, 23, 42, 0.65)',
    'backdrop-filter: blur(4px)',
    'z-index: 1000000',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'padding: 16px',
    'font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  ].join(';');

  const card = document.createElement('div');
  card.style.cssText = [
    'background: #ffffff',
    'color: #0f172a',
    'max-width: 520px',
    'width: 100%',
    'border-radius: 16px',
    'box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    'border: 1px solid #e2e8f0',
    'overflow: hidden',
    'animation: mtModalFadeIn 0.2s ease-out',
  ].join(';');

  card.innerHTML = `
    <style>
      @keyframes mtModalFadeIn {
        from { opacity: 0; transform: translateY(8px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    </style>
    <div style="background: linear-gradient(135deg, #4f46e5, #3730a3); padding: 16px 20px; display: flex; align-items: center; gap: 12px; color: #ffffff;">
      <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; flex-shrink: 0;">
        ∑
      </div>
      <div>
        <div style="font-size: 16px; font-weight: 700; line-height: 1.3;">Xuất Word (MathType) thành công</div>
        <div style="font-size: 12px; color: #e0e7ff; margin-top: 2px;">Hướng dẫn chuyển đổi nhanh sang đối tượng MathType</div>
      </div>
    </div>
    <div style="padding: 20px;">
      <p style="margin: 0; font-size: 14px; line-height: 1.65; color: #1e293b; font-weight: 500; background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #4f46e5; border-radius: 10px; padding: 14px 16px;">
        Đã tải file Word chuẩn MathType! Để chuyển toàn bộ công thức sang đối tượng MathType trong 1 giây: Mở file Word vừa tải -&gt; Nhấn <strong>Ctrl + A</strong> -&gt; Nhấn tổ hợp phím <strong>Alt + \\</strong> (hoặc bấm nút <strong>Toggle TeX</strong> trên thanh công cụ MathType).
      </p>
      <div style="margin-top: 18px; display: flex; justify-content: flex-end;">
        <button id="mathtype-guide-close-btn" type="button" style="background: #4f46e5; color: #ffffff; border: none; border-radius: 10px; padding: 10px 24px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25); transition: background 0.15s;">
          Đã hiểu
        </button>
      </div>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
    window.removeEventListener('keydown', onKeyDown);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      closeModal();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  const closeBtn = card.querySelector('#mathtype-guide-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
}

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
  font?: string;
  superScript?: boolean;
  subScript?: boolean;
}

interface ExportOptions {
  mathFormat: 'omml' | 'mathtype' | 'latex' | 'image';
}

const yieldToMain = (ms: number = 0): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
};

let activeOmmlXmlCache: Map<string, string> | null = null;
let activeMathmlOmmlCache: Map<string, string> | null = null;
let activeNormalizeCache: Map<string, string> | null = null;

function cachedNormalizeAndFixArrows(input: string): string {
  if (!input) return '';
  if (activeNormalizeCache) {
    const hit = activeNormalizeCache.get(input);
    if (hit !== undefined) return hit;
  }
  const normalized = normalizeMathText(input);
  if (activeNormalizeCache && activeNormalizeCache.size < 1500) {
    activeNormalizeCache.set(input, normalized);
    if (normalized !== input && activeNormalizeCache.size < 1500) {
      activeNormalizeCache.set(normalized, normalized);
    }
  }
  return normalized;
}

function extractBalancedTag(
  xml: string,
  startIdx: number,
  tagName: string
): { fullMatch: string; inner: string; endIdx: number } | null {
  const openStart = xml.indexOf(`<${tagName}`, startIdx);
  if (openStart === -1) return null;
  const nextChar = xml[openStart + tagName.length + 1];
  if (nextChar && nextChar !== '>' && !/\s/.test(nextChar) && nextChar !== '/') return null;
  const openClose = xml.indexOf('>', openStart);
  if (openClose === -1) return null;
  if (xml[openClose - 1] === '/') {
    return {
      fullMatch: xml.slice(openStart, openClose + 1),
      inner: '',
      endIdx: openClose + 1,
    };
  }
  const contentStart = openClose + 1;
  let depth = 1;
  const openTagRe = new RegExp(`</?${tagName}(?:\\s[^>]*)?>`, 'g');
  openTagRe.lastIndex = contentStart;
  let m: RegExpExecArray | null;
  while ((m = openTagRe.exec(xml)) !== null) {
    const token = m[0];
    if (token.startsWith('</')) {
      depth--;
      if (depth === 0) {
        return {
          fullMatch: xml.slice(openStart, m.index + token.length),
          inner: xml.slice(contentStart, m.index),
          endIdx: m.index + token.length,
        };
      }
    } else if (!token.endsWith('/>')) {
      depth++;
    }
  }
  return null;
}

const TOP_ACCENT_MAP: Record<string, string> = {
  '\u2192': '\u20D7',
  '\u27F6': '\u20D7',
  '\u20D7': '\u20D7',
  '\u2190': '\u20D6',
  '\u27F5': '\u20D6',
  '\u20D6': '\u20D6',
  '\u2194': '\u20E1',
  '\u27F7': '\u20E1',
  '\u20E1': '\u20E1',
  '^': '\u0302',
  '\u02C6': '\u0302',
  '\u0302': '\u0302',
  '~': '\u0303',
  '\u02DC': '\u0303',
  '\u0303': '\u0303',
};

const OVERBAR_CHARS = new Set(['¯', '\u00AF', '\u0304', '\u0305', '\u2015', '\u2014', '\u2013', '_', '-']);

/**
 * Post-processes OMML generated by mathml2omml-plus:
 * - Fixes { / [ delimiters around <m:eqArr>/<m:m>
 * - Converts <m:groupChr> and <m:limUpp> vectors/hats/tildes (\vec{a}, \overrightarrow{AB}, \widehat{BAD})
 *   into native Word Equation <m:acc> / <m:bar> elements so arrows & hats never drop or shift off-baseline.
 * - Ensures <m:vertJc> on remaining <m:groupChr> (\overbrace/\underbrace).
 */
export function postProcessOmml(omml: string): string {
  if (!omml) return omml;

  let res = omml
    .replace(
      /(?:<m:r(?:\s[^>]*)?>(?:(?!<\/m:r>)[\s\S])*?<m:t(?:\s[^>]*)?>\s*\{\s*<\/m:t>(?:(?!<\/m:r>)[\s\S])*?<\/m:r>\s*)(<(?:m:eqArr|m:m)\b(?:(?!<\/(?:m:eqArr|m:m)>)[\s\S])*?<\/(?:m:eqArr|m:m)>)/g,
      '<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/><m:grow m:val="1"/></m:dPr><m:e>$1</m:e></m:d>'
    )
    .replace(
      /(?:<m:r(?:\s[^>]*)?>(?:(?!<\/m:r>)[\s\S])*?<m:t(?:\s[^>]*)?>\s*\[\s*<\/m:t>(?:(?!<\/m:r>)[\s\S])*?<\/m:r>\s*)(<(?:m:eqArr|m:m)\b(?:(?!<\/(?:m:eqArr|m:m)>)[\s\S])*?<\/(?:m:eqArr|m:m)>)/g,
      '<m:d><m:dPr><m:begChr m:val="["/><m:endChr m:val=""/><m:grow m:val="1"/></m:dPr><m:e>$1</m:e></m:d>'
    )
    .replace(/(<m:dPr><m:begChr m:val="[\{\[]"(?:(?!<\/m:d>)[\s\S])*?<m:mcJc m:val=")center(")/g, '$1left$2')
    .replace(/<m:dPr>((?:(?!<m:grow|<\/m:dPr>)[\s\S])*?)<\/m:dPr>/g, '<m:dPr><m:grow m:val="1"/>$1</m:dPr>');

  const fixGroupChr = (input: string): string => {
    let out = '';
    let cursor = 0;
    while (cursor < input.length) {
      const idx = input.indexOf('<m:groupChr>', cursor);
      const idxAttr = input.indexOf('<m:groupChr ', cursor);
      const nextIdx = idx === -1 ? idxAttr : idxAttr === -1 ? idx : Math.min(idx, idxAttr);
      if (nextIdx === -1) {
        out += input.slice(cursor);
        break;
      }
      out += input.slice(cursor, nextIdx);
      const tag = extractBalancedTag(input, nextIdx, 'm:groupChr');
      if (!tag) {
        out += input.slice(nextIdx);
        break;
      }

      const prMatch = tag.inner.match(/<m:groupChrPr\b[^>]*>([\s\S]*?)<\/m:groupChrPr>/);
      const prInner = prMatch ? prMatch[1] : '';
      const chrMatch = prInner.match(/<m:chr\b[^>]*m:val="([^"]*)"/);
      const posMatch = prInner.match(/<m:pos\b[^>]*m:val="([^"]*)"/);
      const chrVal = chrMatch ? chrMatch[1] : '';
      const posVal = posMatch ? posMatch[1] : 'top';

      const eTag = extractBalancedTag(tag.inner, 0, 'm:e');
      const eInner = eTag ? postProcessOmml(eTag.inner) : '';

      if (eTag && posVal === 'top' && TOP_ACCENT_MAP[chrVal]) {
        out += `<m:acc><m:accPr><m:chr m:val="${TOP_ACCENT_MAP[chrVal]}"/></m:accPr><m:e>${eInner}</m:e></m:acc>`;
      } else if (eTag && posVal === 'top' && OVERBAR_CHARS.has(chrVal)) {
        out += `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${eInner}</m:e></m:bar>`;
      } else if (prMatch && eTag) {
        let newPr = prInner;
        if (!/<m:vertJc\b/.test(newPr)) {
          const vertJc = posVal === 'bot' ? 'top' : 'bot';
          newPr += `<m:vertJc m:val="${vertJc}"/>`;
        }
        out += `<m:groupChr><m:groupChrPr>${newPr}</m:groupChrPr><m:e>${eInner}</m:e></m:groupChr>`;
      } else {
        out += tag.fullMatch;
      }

      cursor = tag.endIdx;
    }
    return out;
  };

  const fixLimUpp = (input: string): string => {
    let out = '';
    let cursor = 0;
    while (cursor < input.length) {
      const idx = input.indexOf('<m:limUpp>', cursor);
      const idxAttr = input.indexOf('<m:limUpp ', cursor);
      const nextIdx = idx === -1 ? idxAttr : idxAttr === -1 ? idx : Math.min(idx, idxAttr);
      if (nextIdx === -1) {
        out += input.slice(cursor);
        break;
      }
      out += input.slice(cursor, nextIdx);
      const tag = extractBalancedTag(input, nextIdx, 'm:limUpp');
      if (!tag) {
        out += input.slice(nextIdx);
        break;
      }

      const eTag = extractBalancedTag(tag.inner, 0, 'm:e');
      const limTag = eTag ? extractBalancedTag(tag.inner, eTag.endIdx, 'm:lim') : null;
      if (eTag && limTag) {
        const eInner = postProcessOmml(eTag.inner);
        const limText = limTag.inner.replace(/<[^>]+>/g, '').trim();
        if (TOP_ACCENT_MAP[limText]) {
          out += `<m:acc><m:accPr><m:chr m:val="${TOP_ACCENT_MAP[limText]}"/></m:accPr><m:e>${eInner}</m:e></m:acc>`;
        } else if (OVERBAR_CHARS.has(limText)) {
          out += `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${eInner}</m:e></m:bar>`;
        } else {
          out += `<m:limUpp><m:e>${eInner}</m:e><m:lim>${postProcessOmml(limTag.inner)}</m:lim></m:limUpp>`;
        }
      } else {
        out += tag.fullMatch;
      }

      cursor = tag.endIdx;
    }
    return out;
  };

  res = fixGroupChr(res);
  res = fixLimUpp(res);
  return res;
}

/**
 * Converts a LaTeX formula into a native Word OMML equation component.
 * Uses MathJax (generating MathML) + mathml2omml-plus (generating OMML <m:oMath>)
 * + docx ImportedXmlComponent to embed a real Word Equation.
 */
function latexToOmmlComponent(rawTex: string, isBlock: boolean = false): any {
  if (!rawTex || !rawTex.trim()) {
    return new TextRun({ text: '' });
  }

  let cleanTex = sanitizeLatexString(rawTex.trim())
    .replace(/^\\\[|\\\]$/g, '')
    .replace(/^\\\(|\\\)$/g, '')
    .replace(/^\$+|\$+$/g, '')
    .replace(/^\\\$|\\\$$/g, '')
    .replace(/\\dotfill\b/g, '')
    .replace(/You can't use 'macro parameter character #' in math mode/gi, '')
    .trim();

  if (!cleanTex) {
    return new TextRun({ text: '' });
  }

  // Bảo vệ khỏi lỗi MathJax 'macro parameter character #' khi dấu # xuất hiện trần trong công thức
  cleanTex = cleanTex.replace(/^#{1,6}\s+/gm, '').replace(/(?<!\\)#/g, '\\#');

  // Tự động đóng môi trường LaTeX bị thiếu \end{...} (như \begin{cases} không có \end{cases})
  const envs = ['cases', 'aligned', 'array', 'matrix', 'pmatrix', 'bmatrix', 'vmatrix', 'Vmatrix', 'split', 'gather', 'align'];
  for (const env of envs) {
    const beginCount = (cleanTex.match(new RegExp(`\\\\begin\\s*\\{${env}\\*?\\}`, 'g')) || []).length;
    const endCount = (cleanTex.match(new RegExp(`\\\\end\\s*\\{${env}\\*?\\}`, 'g')) || []).length;
    if (beginCount > endCount) {
      for (let i = 0; i < beginCount - endCount; i++) {
        cleanTex += ` \\end{${env}}`;
      }
    }
  }

  // Đảm bảo không bị thiếu delimiter \right. khi có \left[, \left\{, \left(
  const leftDelims = (cleanTex.match(/\\left\s*[\{\[\(]/g) || []).length;
  const rightDelims = (cleanTex.match(/\\right\s*[.\}\]\)]/g) || []).length;
  if (leftDelims > rightDelims) {
    for (let i = 0; i < leftDelims - rightDelims; i++) {
      cleanTex += ' \\right.';
    }
  }

  // Đảm bảo môi trường đa dòng (aligned, cases, array, matrix, split, gather, align) sử dụng displayMode
  const hasMultlineEnv = /\\begin\s*\{(?:aligned|cases|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}/.test(cleanTex);
  const effectiveDisplayMode = isBlock || hasMultlineEnv;
  const cacheKey = `${effectiveDisplayMode ? 'B' : 'I'}:${cleanTex}`;

  try {
    if (activeOmmlXmlCache) {
      const cachedOmml = activeOmmlXmlCache.get(cacheKey);
      if (cachedOmml) {
        const comp = ImportedXmlComponent.fromXmlString(cachedOmml);
        return comp && (comp as any).root && (comp as any).root[0] ? (comp as any).root[0] : comp;
      }
    }

    let mathmlHtml = '';
    if (typeof window !== 'undefined' && (window as any).MathJax?.tex2mml) {
      try {
        mathmlHtml = (window as any).MathJax.tex2mml(cleanTex, { display: effectiveDisplayMode });
      } catch (e) {
        console.warn('MathJax.tex2mml conversion error:', e);
      }
    }

    if (mathmlHtml && !/<(?:mjx-)?merror\b/i.test(mathmlHtml) && !/macro parameter character #/i.test(mathmlHtml)) {
      const match = mathmlHtml.match(/<math[\s\S]*?<\/math>/i);
      if (match) {
        const convertFn = typeof mml2omml === 'function' ? mml2omml : ((mml2omml as any)?.mml2omml || (mml2omml as any)?.default || mml2omml);
        let omml = convertFn(match[0]);
        if (omml && omml.includes('m:oMath')) {
          const rawOmml = omml;
          const processedOmml = postProcessOmml(omml);
          let comp: any = null;
          let validOmml = processedOmml;
          try {
            comp = ImportedXmlComponent.fromXmlString(processedOmml);
          } catch {
            comp = ImportedXmlComponent.fromXmlString(rawOmml);
            validOmml = rawOmml;
          }

          if (activeOmmlXmlCache && activeOmmlXmlCache.size < 800) {
            activeOmmlXmlCache.set(cacheKey, validOmml);
          }

          const root = comp && (comp as any).root && (comp as any).root[0] ? (comp as any).root[0] : comp;
          return root;
        }
      }
    }
  } catch (err) {
    console.warn('OMML equation conversion error for LaTeX:', rawTex, err);
  }

  // Fallback: styled italic text in Cambria Math (native Word mathematical typography)
  return new TextRun({
    text: normalizeRawMathSymbols(cleanTex.replace(/\\#/g, '#')),
    italics: true,
    font: 'Cambria Math',
    size: 24,
  });
}

/**
 * Converts a raw MathML XML string directly into a Word OMML Equation component.
 */
function mathmlToOmmlComponent(mathmlHtml: string): ParagraphChild | null {
  try {
    if (!mathmlHtml || /<(?:mjx-)?merror\b/i.test(mathmlHtml) || /macro parameter character #/i.test(mathmlHtml)) {
      return null;
    }
    const match = mathmlHtml.match(/<math[\s\S]*?<\/math>/i);
    if (!match) return null;
    if (activeMathmlOmmlCache) {
      const cachedOmml = activeMathmlOmmlCache.get(match[0]);
      if (cachedOmml) {
        const comp = ImportedXmlComponent.fromXmlString(cachedOmml);
        return comp && (comp as any).root && (comp as any).root[0] ? (comp as any).root[0] : comp;
      }
    }
    const convertFn = typeof mml2omml === 'function' ? mml2omml : ((mml2omml as any)?.mml2omml || (mml2omml as any)?.default || mml2omml);
    let omml = convertFn(match[0]);
    if (omml && omml.includes('m:oMath')) {
      const rawOmml = omml;
      const processedOmml = postProcessOmml(omml);
      let comp: any = null;
      let validOmml = processedOmml;
      try {
        comp = ImportedXmlComponent.fromXmlString(processedOmml);
      } catch {
        comp = ImportedXmlComponent.fromXmlString(rawOmml);
        validOmml = rawOmml;
      }

      if (activeMathmlOmmlCache && activeMathmlOmmlCache.size < 800) {
        activeMathmlOmmlCache.set(match[0], validOmml);
      }

      const root = comp && (comp as any).root && (comp as any).root[0] ? (comp as any).root[0] : comp;
      return root;
    }
  } catch (e) {
    console.warn('mathmlToOmmlComponent error:', e);
  }
  return null;
}

/**
 * Converts an SVG element (e.g. from TikZ / geometry diagram / BBT) into a high-res PNG data URL with accurate dimensions.
 */
export async function svgToPngDataUrl(
  svgNode: SVGSVGElement
): Promise<{ dataUrl: string; width: number; height: number }> {
  const rect = svgNode.isConnected ? svgNode.getBoundingClientRect() : { width: 0, height: 0 };
  let width = Math.round(rect.width);
  let height = Math.round(rect.height);

  if (!width || !height) {
    const rawW = (svgNode.getAttribute('width') || '').trim();
    const rawH = (svgNode.getAttribute('height') || '').trim();
    if (rawW && !rawW.includes('%')) {
      const parsedW = parseFloat(rawW);
      if (Number.isFinite(parsedW) && parsedW > 0) width = Math.round(parsedW);
    }
    if (rawH && !rawH.includes('%')) {
      const parsedH = parseFloat(rawH);
      if (Number.isFinite(parsedH) && parsedH > 0) height = Math.round(parsedH);
    }
  }

  if (!width || !height) {
    const vb = (svgNode.getAttribute('viewBox') || '').trim().split(/[\s,]+/);
    if (vb.length === 4) {
      width = width || Math.round(parseFloat(vb[2])) || 480;
      height = height || Math.round(parseFloat(vb[3])) || 200;
    }
  }

  if (!width || width <= 0) width = 500;
  if (!height || height <= 0) height = 200;

  const hasForeignObject = !!svgNode.querySelector('foreignObject');

  if (!hasForeignObject) {
    try {
      const svgClone = svgNode.cloneNode(true) as SVGSVGElement;
      if (!svgClone.getAttribute('xmlns')) {
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }
      if (!svgClone.getAttribute('xmlns:xlink')) {
        svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      }
      if (!svgClone.getAttribute('viewBox')) {
        svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
      }
      svgClone.setAttribute('width', String(width));
      svgClone.setAttribute('height', String(height));
      if (!svgClone.style.color) {
        svgClone.style.color = '#0f172a';
      }

      // Normalize currentColor & CSS variables inside standalone SVG XML so Image rasterization succeeds without falling back to slow html2canvas
      const svgElements = [svgClone, ...Array.from(svgClone.querySelectorAll('*'))];
      for (const svgEl of svgElements) {
        for (const attrName of ['fill', 'stroke', 'stop-color', 'color']) {
          const val = svgEl.getAttribute(attrName);
          if (val && /currentColor/i.test(val)) {
            svgEl.setAttribute(attrName, val.replace(/currentColor/gi, '#0f172a'));
          }
        }
        const styleAttr = svgEl.getAttribute('style');
        if (styleAttr && (/currentColor/i.test(styleAttr) || /var\(/i.test(styleAttr))) {
          svgEl.setAttribute(
            'style',
            styleAttr
              .replace(/currentColor/gi, '#0f172a')
              .replace(/var\([^)]+\)/gi, '#0f172a')
          );
        }
      }

      const svgHtml = new XMLSerializer().serializeToString(svgClone);

      const loadSvgToCanvas = (src: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          if (src.startsWith('http://') || src.startsWith('https://')) {
            img.crossOrigin = 'anonymous';
          }
          const timer = setTimeout(() => {
            img.src = '';
            reject(new Error('SVG Image render timeout'));
          }, 3000);

          img.onload = () => {
            clearTimeout(timer);
            try {
              const canvas = document.createElement('canvas');
              const scale = 2; // 2x high resolution
              canvas.width = Math.max(2, width * scale);
              canvas.height = Math.max(2, height * scale);
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('No canvas context');

              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/png'));
            } catch (err) {
              reject(err);
            }
          };

          img.onerror = (err) => {
            clearTimeout(timer);
            reject(err);
          };

          img.src = src;
        });
      };

      // 1. Try base64 Data URI first (immune to iframe CSP / blob URL restrictions)
      let pngDataUrl = '';
      try {
        const utf8Bytes = new TextEncoder().encode(svgHtml);
        let binary = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
          binary += String.fromCharCode(utf8Bytes[i]);
        }
        const dataUri = 'data:image/svg+xml;base64,' + btoa(binary);
        pngDataUrl = await loadSvgToCanvas(dataUri);
      } catch (_e1) {
        // 2. Try UTF-8 URL-encoded SVG Data URI
        try {
          const utf8Uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgHtml);
          pngDataUrl = await loadSvgToCanvas(utf8Uri);
        } catch (_e2) {
          // 3. Try Blob URL fallback
          const svgBlob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
          const blobUrl = URL.createObjectURL(svgBlob);
          try {
            pngDataUrl = await loadSvgToCanvas(blobUrl);
          } finally {
            URL.revokeObjectURL(blobUrl);
          }
        }
      }

      if (pngDataUrl) {
        return { dataUrl: pngDataUrl, width, height };
      }
    } catch (err) {
      console.warn('Direct SVG to PNG failed, falling back to html2canvas:', err);
    }
  }

  // 4. Fallback: html2canvas on a guaranteed document-connected offscreen host
  // (html2canvas throws "Unable to find element in cloned iframe" on detached nodes)
  let offscreenHost: HTMLDivElement | null = null;
  try {
    offscreenHost = document.createElement('div');
    offscreenHost.style.position = 'fixed';
    offscreenHost.style.left = '-99999px';
    offscreenHost.style.top = '0';
    offscreenHost.style.width = `${width}px`;
    offscreenHost.style.height = `${height}px`;
    offscreenHost.style.backgroundColor = '#ffffff';
    offscreenHost.style.color = '#0f172a';
    offscreenHost.style.pointerEvents = 'none';
    offscreenHost.style.zIndex = '-1';
    offscreenHost.style.overflow = 'hidden';

    const svgForCanvas = svgNode.cloneNode(true) as SVGSVGElement;
    svgForCanvas.setAttribute('width', String(width));
    svgForCanvas.setAttribute('height', String(height));
    if (!svgForCanvas.getAttribute('viewBox')) {
      svgForCanvas.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
    offscreenHost.appendChild(svgForCanvas);
    document.body.appendChild(offscreenHost);

    const canvas = await withTimeout(
      html2canvas(offscreenHost, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        removeContainer: true,
        ignoreElements: (node: Element) => {
          if (!offscreenHost) return false;
          if (node === offscreenHost || offscreenHost.contains(node)) return false;
          if (node.contains(offscreenHost)) return false;
          if (node.tagName === 'HEAD' || node.closest('head')) return false;
          return true;
        },
      }),
      5000,
      'html2canvas SVG fallback'
    );
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width,
      height,
    };
  } catch (hErr) {
    console.error('All SVG rasterization methods failed:', hErr);
    throw hErr;
  } finally {
    if (offscreenHost && offscreenHost.parentNode) {
      offscreenHost.parentNode.removeChild(offscreenHost);
    }
  }
}

/**
 * Converts a base64 / data URL string to a Uint8Array buffer for docx ImageRun.
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const b64 = (parts.length > 1 ? parts[1] : parts[0]).replace(/\s+/g, '');
  const binaryString = atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Extracts plain text from a node, preserving LaTeX formulas.
 */
function getNodeLatexOrText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tagName = el.tagName.toUpperCase();

    // Check for preprocessed OMML math token or MathJax container
    if (
      el.classList.contains('omml-math-node') ||
      tagName === 'MJX-CONTAINER' ||
      el.classList.contains('MathJax') ||
      el.classList.contains('MathJax_SVG') ||
      el.classList.contains('mjx-chtml') ||
      el.hasAttribute('data-latex')
    ) {
      let rawAttr = el.getAttribute('data-latex') || el.getAttribute('data-tex') || '';
      let tex = '';
      if (rawAttr) {
        try {
          tex = decodeURIComponent(rawAttr).trim();
        } catch (e) {
          tex = rawAttr.trim();
        }
      }
      if (!tex) {
        const ann =
          el.querySelector("annotation[encoding='application/x-tex']") ||
          el.querySelector('annotation') ||
          el.querySelector("script[type*='math/tex']");
        if (ann?.textContent) tex = ann.textContent.trim();
      }
      const isBlock =
        el.getAttribute('data-block') === '1' ||
        el.getAttribute('display') === 'true' ||
        el.classList.contains('katex-display');
      if (tex) {
        return isBlock ? `\n\n$$${tex}$$\n\n` : ` $${tex}$ `;
      }
      return '';
    }

    // Check for KaTeX element
    if (el.classList.contains('katex') || el.classList.contains('katex-display')) {
      const ann = el.querySelector("annotation[encoding='application/x-tex']") || el.querySelector("annotation");
      const isBlock = el.classList.contains('katex-display') || !!el.closest('.katex-display');
      if (ann && ann.textContent) {
        return isBlock ? `\n\n$$${ann.textContent.trim()}$$\n\n` : ` $${ann.textContent.trim()}$ `;
      }
      const texAttr = el.getAttribute('data-tex') || el.getAttribute('data-latex');
      if (texAttr) return isBlock ? `\n\n$$${texAttr}$$\n\n` : ` $${texAttr}$ `;
      return '';
    }

    if (tagName === 'BR') {
      return '\n';
    }

    // Guard: ignore internal KaTeX / MathJax assistive structures and SVGs so they never leak raw text
    if (
      el.classList.contains('katex-mathml') ||
      el.classList.contains('katex-html') ||
      tagName === 'MJX-ASSISTIVE-MML' ||
      tagName === 'MJX-MERROR' ||
      tagName === 'MERROR' ||
      tagName === 'MATH' ||
      tagName === 'ANNOTATION' ||
      tagName === 'SEMANTICS' ||
      tagName === 'SVG' ||
      tagName === 'SVG-WRAPPER' ||
      tagName === 'TIKZ-DIAGRAM'
    ) {
      return '';
    }

    let text = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      let part = getNodeLatexOrText(el.childNodes[i]);
      if (!part) continue;
      if (/^\s+\$/.test(part) && (!text || /[\s([{<"'\''“]$/.test(text))) {
        part = part.replace(/^\s+/, '');
      }
      if (/\$ $/.test(text) && /^[.,:;?!%)\]}>"'\''”]/.test(part)) {
        text = text.slice(0, -1);
      } else if (/\s$/.test(text) && /^[ \t]+/.test(part)) {
        part = part.replace(/^[ \t]+/, '');
      }
      text += part;
    }
    return text;
  }
  return '';
}

function getNodesLatexOrText(nodes: Node[]): string {
  let text = '';
  for (const n of nodes) {
    let part = getNodeLatexOrText(n);
    if (!part) continue;
    if (/^\s+\$/.test(part) && (!text || /[\s([{<"'\''“]$/.test(text))) {
      part = part.replace(/^\s+/, '');
    }
    if (/\$ $/.test(text) && /^[.,:;?!%)\]}>"'\''”]/.test(part)) {
      text = text.slice(0, -1);
    } else if (/\s$/.test(text) && /^[ \t]+/.test(part)) {
      part = part.replace(/^[ \t]+/, '');
    }
    text += part;
  }
  return text;
}

/**
 * Strips internal system type tags like (Loại tf), (Loại mcq), [Loại: tf], (Loại Đúng/Sai), etc.
 */
function stripInternalTags(text: string, trimEdges: boolean = true): string {
  if (!text) return '';
  let res = text
    .replace(/You can't use 'macro parameter character #' in math mode/gi, '')
    .replace(/(?<![a-zA-Z0-9_\$])undefined(?![a-zA-Z0-9_\$])/g, '')
    .replace(/\bundefined\b/g, '')
    .replace(/=\s*undefined/g, '=')
    .replace(/___?(?:MATH|ENV|SET_MATH|WRAPPED_MATH|TEXT|VISUAL)_BLOCK_(\d+)___?/gi, '')
    .replace(/___?VISUAL\\?_TOKEN_(\d+)___?/gi, '')
    .replace(/___[A-Z0-9_]+_TOKEN_\d+___/gi, '')
    .replace(/___SET_MATH_TOKEN_\d+___/g, '')
    .replace(/(?<![a-zA-Z0-9_\$])(?:MATH|ENV|SET_MATH|VISUAL)_BLOCK_\d+(?![a-zA-Z0-9_\$])/gi, '')
    .replace(/(Câu\s*\d+)\s*[:\.]?\s*[\(\[]\s*Loại(?:\s*trắc\s*nghiệm|\s*đúng\s*sai|\s*trả\s*lời\s*ngắn|\s*tự\s*luận|[:\s]+[a-z0-9_\-]+)?\s*[\)\]]\s*[:\.]?/gi, '$1:')
    .replace(/[\(\[]\s*Loại(?:\s*trắc\s*nghiệm|\s*đúng\s*sai|\s*trả\s*lời\s*ngắn|\s*tự\s*luận|[:\s]+[a-z0-9_\-]+)?\s*[\)\]]\s*:?/gi, '')
    .replace(/(Câu\s*\d+[:\.])[ \t]*/gi, '$1 ')
    .replace(/[ \t]{2,}/g, ' ');
  return trimEdges ? res.trim() : res;
}

interface TextOrMathToken {
  type: 'text' | 'math';
  content: string;
  isBlock?: boolean;
}

/**
 * Robust tokenizer that splits a string into alternating plain text and LaTeX math tokens.
 * Accurately parses $...$, $$...$$, \(...\), \[...\] without stripping or losing any math content or punctuation.
 * Also catches un-delimited naked math environments (\begin{aligned}, \begin{cases}, \left[...\right.).
 */
function tokenizeTextAndMath(rawText: string): TextOrMathToken[] {
  if (!rawText) return [];
  const tokens: TextOrMathToken[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?!\$)(?:[\s\S]+?)(?<!\$)\$|\\left\s*\[[\s\S]*?\\right\.?|\\begin\{(?:aligned|cases|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\{(?:aligned|cases|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(rawText)) !== null) {
    if (match.index > lastIdx) {
      const textPart = rawText.slice(lastIdx, match.index);
      if (textPart) {
        tokens.push({ type: 'text', content: textPart });
      }
    }

    const fullMath = match[0];
    let isBlock = false;
    let cleanMath = fullMath;

    if (fullMath.startsWith('$$') && fullMath.endsWith('$$')) {
      cleanMath = fullMath.slice(2, -2).trim();
      isBlock = true;
    } else if (fullMath.startsWith('$') && fullMath.endsWith('$')) {
      cleanMath = fullMath.slice(1, -1).trim();
      if (/\\begin\{(?:aligned|cases|array|matrix|split|gather|align)\*?\}|\\left\s*\[/i.test(cleanMath) && cleanMath.includes('\n')) {
        isBlock = true;
      }
    } else if (fullMath.startsWith('\\[') && fullMath.endsWith('\\]')) {
      cleanMath = fullMath.slice(2, -2).trim();
      isBlock = true;
    } else if (fullMath.startsWith('\\(') && fullMath.endsWith('\\)')) {
      cleanMath = fullMath.slice(2, -2).trim();
    } else {
      // Naked math environment detected
      cleanMath = fullMath.trim();
      isBlock = cleanMath.includes('\n') || cleanMath.length > 35;
    }

    tokens.push({
      type: 'math',
      content: cleanMath,
      isBlock,
    });

    lastIdx = match.index + fullMath.length;
  }

  if (lastIdx < rawText.length) {
    const trailingPart = rawText.slice(lastIdx);
    if (trailingPart) {
      tokens.push({ type: 'text', content: trailingPart });
    }
  }

  // Sanitize orphan stray $$ or lone trailing $ inside non-math text tokens
  for (const tok of tokens) {
    if (tok.type === 'text') {
      tok.content = tok.content
        .replace(/(?<!\\)\$\$/g, '')
        .replace(/(?<!\\)\$(?=\s*$|[.,;:!?\)\]\s])/g, '');
    }
  }

  return tokens;
}

/**
 * Regex matching math symbols, set symbols, logic operators, arrows, etc.
 * that must be rendered using 'Cambria Math' font to avoid empty square boxes on machines
 * running older Word/Windows where 'Times New Roman' lacks these glyphs.
 */
const MATH_SYMBOL_SPLIT_REGEX = /([\u2100-\u214F\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u25A0-\u25FF\u27C0-\u27EF\u27F0-\u27FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u00B1\u00D7\u00F7\u00AC\u00B7]|[\uD835][\uDC00-\uDFFF])/g;

const MATH_SYMBOL_CHAR_REGEX = /^([\u2100-\u214F\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u25A0-\u25FF\u27C0-\u27EF\u27F0-\u27FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u00B1\u00D7\u00F7\u00AC\u00B7]|[\uD835][\uDC00-\uDFFF])+$/;

/**
 * Normalizes raw LaTeX math macros in non-delimited text into standard Unicode math characters.
 */
function normalizeRawMathSymbols(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\mathbb\{R\}|\b\\mathbb\s*R\b/g, 'ℝ')
    .replace(/\\mathbb\{N\}|\b\\mathbb\s*N\b/g, 'ℕ')
    .replace(/\\mathbb\{Z\}|\b\\mathbb\s*Z\b/g, 'ℤ')
    .replace(/\\mathbb\{Q\}|\b\\mathbb\s*Q\b/g, 'ℚ')
    .replace(/\\mathbb\{C\}|\b\\mathbb\s*C\b/g, 'ℂ')
    .replace(/\\forall\b/g, '∀')
    .replace(/\\exists\b/g, '∃')
    .replace(/\\nexists\b/g, '∄')
    .replace(/\\in\b/g, '∈')
    .replace(/\\notin\b/g, '∉')
    .replace(/\\cap\b/g, '∩')
    .replace(/\\cup\b/g, '∪')
    .replace(/\\setminus\b/g, '∖')
    .replace(/\\subset\b/g, '⊂')
    .replace(/\\subseteq\b/g, '⊆')
    .replace(/\\supset\b/g, '⊃')
    .replace(/\\supseteq\b/g, '⊇')
    .replace(/\\emptyset\b|\\varnothing\b/g, '∅')
    .replace(/\\le\b|\\leq\b/g, '≤')
    .replace(/\\ge\b|\\geq\b/g, '≥')
    .replace(/\\ne\b|\\neq\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\equiv\b/g, '≡')
    .replace(/\\pm\b/g, '±')
    .replace(/\\times\b/g, '×')
    .replace(/\\div\b/g, '÷')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\to\b|\\rightarrow\b/g, '→')
    .replace(/\\Leftarrow\b/g, '⇐')
    .replace(/\\Rightarrow\b/g, '⇒')
    .replace(/\\Leftrightarrow\b|\\iff\b/g, '⇔')
    .replace(/\\perp\b/g, '⊥')
    .replace(/\\parallel\b/g, '∥');
}

/**
 * Creates TextRun items from a text string.
 * Special mathematical symbols (ℝ, ℕ, ℤ, ∀, ∃, ∈, ∉, ∩, ∪, ∅, ≤, ≥, ≠, etc.)
 * are explicitly assigned font: 'Cambria Math' to prevent empty square boxes on Windows/Office.
 */
function createTextRunsWithMathFont(
  rawText: string,
  style: RunStyle = {}
): TextRun[] {
  if (!rawText) return [];
  const collapsedNewlines = rawText.replace(/[\r\n]+/g, ' ');
  const normalized = normalizeRawMathSymbols(collapsedNewlines);
  const parts = normalized.split(MATH_SYMBOL_SPLIT_REGEX);
  const runs: TextRun[] = [];

  for (const part of parts) {
    if (!part) continue;

    const isMathSymbol = MATH_SYMBOL_CHAR_REGEX.test(part);

    runs.push(
      new TextRun({
        text: part,
        font: isMathSymbol ? 'Cambria Math' : (style.font || 'Times New Roman'),
        size: style.size || 24,
        bold: style.bold,
        italics: style.italics,
        superScript: style.superScript,
        subScript: style.subScript,
        color: style.color,
      })
    );
  }

  return runs;
}

function pushMarkdownFormattedTextRuns(
  rawSegment: string,
  style: RunStyle,
  runs: ParagraphChild[]
) {
  if (!rawSegment) return;
  // Convert paired **bold** or *italic* if literal markdown markers remain in plain text
  const parts = rawSegment.split(/(\*\*[^*\n]+\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      runs.push(...createTextRunsWithMathFont(part.slice(2, -2), { ...style, bold: true }));
    } else {
      runs.push(...createTextRunsWithMathFont(part.replace(/\*{2,}/g, ''), style));
    }
  }
}

/**
 * Converts an array of TextOrMathTokens into Word ParagraphChild runs (TextRun and OMML equations).
 */
function tokensToRuns(
  rawTokens: TextOrMathToken[],
  style: RunStyle = {},
  options: ExportOptions
): ParagraphChild[] {
  // Clone tokens so we don't mutate input
  const tokens = rawTokens.map(t => ({ ...t }));

  // Ensure spacing between text and math so formulas never stick to Vietnamese words,
  // and strip stray spaces immediately before closing punctuation (.,:;?!%)]})
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'math') {
      // Check previous token
      if (i > 0 && tokens[i - 1].type === 'text') {
        tokens[i - 1].content = tokens[i - 1].content.replace(/([([{<"'\''“])[ \t]+$/, '$1');
        const prevContent = tokens[i - 1].content;
        if (prevContent && !/\s$/.test(prevContent) && !/[([{<"'\''“]/.test(prevContent.slice(-1))) {
          tokens[i - 1].content += ' ';
        }
      }
      // Check next token
      if (i < tokens.length - 1 && tokens[i + 1].type === 'text') {
        tokens[i + 1].content = tokens[i + 1].content.replace(/^[ \t]+(?=[.,:;?!%)\]}>"'\''”])/, '');
        const nextContent = tokens[i + 1].content;
        if (nextContent && !/^\s/.test(nextContent) && !/[.,:;?!%)\]}>"'\''”]/.test(nextContent[0])) {
          tokens[i + 1].content = ' ' + tokens[i + 1].content;
        }
      }
    }
  }

  const runs: ParagraphChild[] = [];

  const isMathType = options.mathFormat === 'mathtype' || options.mathFormat === 'latex';

  for (const token of tokens) {
    if (token.type === 'text') {
      const safeTokenText = isMathType ? sanitizePlainTextForMathType(token.content) : token.content;
      const qMatch = safeTokenText.match(/^(\s*(?:\*\*)?(?:Câu|Bài)\s*\d+[:\.]?(?:\*\*)?)([\s\S]*)$/i);
      if (qMatch && !style.bold) {
        const cleanLabel = qMatch[1].replace(/\*\*/g, '').trim();
        runs.push(
          ...createTextRunsWithMathFont(`${cleanLabel} `, {
            ...style,
            bold: true,
            font: style.font || 'Times New Roman',
            size: style.size || 24,
          })
        );
        const rest = qMatch[2].replace(/^\s+/, '');
        if (rest) {
          pushMarkdownFormattedTextRuns(rest, style, runs);
        }
      } else {
        // Kiểm tra nếu text bắt đầu bằng nhãn phương án A-D (in hoa) hoặc a-d) (Đúng/Sai - giữ nguyên chữ thường!)
        const optMatch = safeTokenText.match(/^(\s*(?:[-*•●]\s*)?(?:\*{0,3})([A-D]\.|[A-D]\)|[a-d]\))(?:\*{0,3})[ \t]*)([\s\S]*)$/);
        const isActivitySubHeader = optMatch && /^[a-d]\)/i.test(optMatch[2]) && /^\s*(?:Mục\s*tiêu|Nội\s*dung|Sản\s*phẩm|Tổ\s*chức\s*thực\s*hiện)\s*:/i.test(optMatch[3]);
        if (optMatch && !style.bold && !isActivitySubHeader) {
          const rawLabel = optMatch[2].trim();
          const cleanLabel = /^[a-d]\)/.test(rawLabel) ? rawLabel.toLowerCase() : rawLabel.toUpperCase();
          runs.push(
            ...createTextRunsWithMathFont(`${cleanLabel} `, {
              ...style,
              bold: true,
              font: style.font || 'Times New Roman',
              size: style.size || 24,
            })
          );
          const hadTrailingSpace = /[ \t]$/.test(optMatch[3]);
          let rest = optMatch[3].replace(/^[\s\*_•●]+/, '').replace(/[\*_]+$/, '');
          if (hadTrailingSpace && rest && !/\s$/.test(rest)) {
            rest += ' ';
          }
          if (rest) {
            pushMarkdownFormattedTextRuns(rest, style, runs);
          }
        } else {
          // Chỉ chuẩn hóa nhãn phương án A., B., C., D. IN HOA ở đầu dòng/tách biệt (KHÔNG dùng /i trên lowercase a), b), c), d) và KHÔNG nuốt dấu ngoặc mở '(')
          let cleanedContent = safeTokenText
            .replace(/(^|\n)[ \t]*(?:[-*•●]\s*)?(?:\*{1,3}|<b>)?(?:\(([A-D])\)|([A-D])[\.\:\)])(?:\*{1,3}|<\/b>)?[ \t]*/g, (_m, p1, g1, g2) => `${p1}${g1 || g2}. `)
            .replace(/(?<=\b[A-D][\.\:\)])\s*\*\*+(?=\s|$)/g, '')
            .replace(/\*\*+(?=[A-D][\.\:\)])/g, '');
          pushMarkdownFormattedTextRuns(cleanedContent, style, runs);
        }
      }
    } else {
      // Math token
      if (options.mathFormat === 'mathtype' || options.mathFormat === 'latex') {
        const mathText = formatMathTokenForMathType(token.content, token.isBlock);
        if (mathText) {
          runs.push(
            new TextRun({
              text: mathText,
              font: style.font || 'Times New Roman',
              size: style.size || 24,
              bold: style.bold,
              italics: style.italics,
              color: style.color,
            })
          );
        }
      } else {
        runs.push(latexToOmmlComponent(token.content, token.isBlock));
      }
    }
  }

  return runs;
}

/**
 * Parses plain text that may contain $...$, $$...$$, \(...\), \[...\] into TextRuns and OMML math components.
 */
function parseTextWithMath(
  text: string,
  style: RunStyle,
  options: ExportOptions,
  trimEdges: boolean = true
): ParagraphChild[] {
  if (!text) return [];
  // Clean \dotfill in raw text
  let safeText = text.replace(/\\dotfill\b/g, '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .');
  const leadSpace = !trimEdges ? (safeText.match(/^\s+/)?.[0] ? ' ' : '') : '';
  const trailSpace = !trimEdges ? (safeText.match(/\s+$/)?.[0] ? ' ' : '') : '';
  safeText = stripInternalTags(safeText, trimEdges);
  safeText = cachedNormalizeAndFixArrows(safeText);
  if (options.mathFormat === 'mathtype' || options.mathFormat === 'latex') {
    safeText = normalizeLatexForMathType(safeText);
  }
  if (!trimEdges) {
    if (leadSpace && !/^\s/.test(safeText)) safeText = leadSpace + safeText;
    if (trailSpace && !/\s$/.test(safeText)) safeText = safeText + trailSpace;
  }

  const tokens = tokenizeTextAndMath(safeText);
  return tokensToRuns(tokens, style, options);
}

function isInlineMathElement(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  const tagName = el.tagName.toUpperCase();
  return (
    tagName === 'MJX-CONTAINER' ||
    el.classList.contains('MathJax') ||
    el.classList.contains('MathJax_SVG') ||
    el.classList.contains('mjx-chtml') ||
    el.classList.contains('math-inline') ||
    el.classList.contains('katex') ||
    el.classList.contains('katex-display') ||
    el.classList.contains('omml-math-node') ||
    el.hasAttribute('data-latex') ||
    el.hasAttribute('data-tex')
  );
}

function parseInlineChildSequence(
  childNodes: Node[],
  style: RunStyle,
  options: ExportOptions
): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  let prevWasMath = false;

  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];
    const currIsMath = isInlineMathElement(child);
    let effectiveChild = child;

    // Never insert/leave space between an inline math node and following closing punctuation (e.g. "$\vec{BD}$ .")
    if (prevWasMath && !currIsMath && child.nodeType === Node.TEXT_NODE) {
      const raw = child.textContent || '';
      if (/^[ \t]+[.,:;?!%)\]}>"'\''”]/.test(raw)) {
        const cleanedText = raw.replace(/^[ \t]+(?=[.,:;?!%)\]}>"'\''”])/, '');
        const cloneText = child.cloneNode(false);
        cloneText.textContent = cleanedText;
        effectiveChild = cloneText;
      }
    }

    const childRuns = parseInlineContent(effectiveChild, style, options);
    if (childRuns.length === 0) continue;

    // Preserve natural word separation across math / inline boundaries
    if (runs.length > 0 && (prevWasMath || currIsMath)) {
      const prevNode = childNodes[i - 1];
      const prevTxt = prevNode?.textContent || '';
      const currTxt = effectiveChild.textContent || '';
      if (currIsMath && !prevWasMath && prevTxt && !/\s$/.test(prevTxt) && !/[([{<"'\''“]$/.test(prevTxt)) {
        runs.push(new TextRun({ text: ' ', font: style.font || 'Times New Roman', size: style.size || 24 }));
      } else if (prevWasMath && !currIsMath && currTxt && !/^\s/.test(currTxt) && !/^[.,:;?!%)\]}>"'\''”]/.test(currTxt)) {
        runs.push(new TextRun({ text: ' ', font: style.font || 'Times New Roman', size: style.size || 24 }));
      }
    }

    runs.push(...childRuns);
    prevWasMath = currIsMath;
  }
  return runs;
}

/**
 * Parses inline HTML nodes (spans, bold, italic, katex, img, breaks) into ParagraphChild items.
 */
function parseInlineContent(
  node: Node,
  style: RunStyle = {},
  options: ExportOptions
): ParagraphChild[] {
  const runs: ParagraphChild[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) return [];
    // If pure whitespace node (including "\n") between inline tags (like " " between </strong> and <strong> or math), preserve a single space
    if (/^\s+$/.test(text)) {
      return [
        new TextRun({
          text: ' ',
          font: style.font || 'Times New Roman',
          size: style.size || 24,
          bold: style.bold,
          italics: style.italics,
        }),
      ];
    }
    return parseTextWithMath(text, style, options, false);
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tagName = el.tagName.toUpperCase();

    // Check if it's a MathJax container, KaTeX element, OMML math node, or has data-latex
    const isMathJaxNode = tagName === 'MJX-CONTAINER' || el.classList.contains('MathJax') || el.classList.contains('MathJax_SVG') || el.classList.contains('mjx-chtml') || el.classList.contains('math-inline');
    const isKaTeXNode = el.classList.contains('katex') || el.classList.contains('katex-display');
    const isOmmlNode = el.classList.contains('omml-math-node');
    const hasMathAttr = el.hasAttribute('data-latex') || el.hasAttribute('data-tex');

    if (isMathJaxNode || isKaTeXNode || isOmmlNode || hasMathAttr) {
      let tex = el.getAttribute('data-latex') || el.getAttribute('data-tex') || '';
      let mathml = el.getAttribute('data-mathml') || '';
      if (!tex) {
        const ann = el.querySelector("annotation[encoding='application/x-tex']") || el.querySelector("annotation") || el.querySelector("script[type*='math/tex']");
        tex = ann ? ann.textContent || '' : '';
      }
      if (!mathml) {
        const m = el.querySelector('math');
        if (m) mathml = new XMLSerializer().serializeToString(m);
      }

      if (tex) {
        try { tex = decodeURIComponent(tex).trim(); } catch { tex = tex.trim(); }
      }
      if (mathml) {
        try { mathml = decodeURIComponent(mathml).trim(); } catch { mathml = mathml.trim(); }
      }

      const isBlock = el.classList.contains('katex-display') || el.getAttribute('display') === 'true' || el.getAttribute('data-block') === '1' || (tagName === 'MJX-CONTAINER' && el.getAttribute('display') === 'true');

      if (tex && (options.mathFormat === 'mathtype' || options.mathFormat === 'latex')) {
        const mathText = formatMathTokenForMathType(tex, isBlock);
        if (!mathText) return [];
        return [
          new TextRun({
            text: mathText,
            font: style.font || 'Times New Roman',
            size: style.size || 24,
            bold: style.bold,
            italics: style.italics,
            color: style.color,
          }),
        ];
      }

      if (mathml) {
        const comp = mathmlToOmmlComponent(mathml);
        if (comp) return [comp];
      }

      if (tex) {
        return [latexToOmmlComponent(tex, isBlock)];
      }
    }

    // Guard: ignore internal KaTeX or MathJax assistive structures so they never leak raw text
    if (
      el.classList.contains('katex-mathml') ||
      el.classList.contains('katex-html') ||
      el.tagName === 'MJX-ASSISTIVE-MML' ||
      tagName === 'MJX-MERROR' ||
      tagName === 'MERROR' ||
      tagName === 'MATH' ||
      tagName === 'ANNOTATION' ||
      tagName === 'SEMANTICS'
    ) {
      return [];
    }

    if (tagName === 'STRONG' || tagName === 'B') {
      return parseInlineChildSequence(Array.from(el.childNodes), { ...style, bold: true }, options);
    }

    if (tagName === 'EM' || tagName === 'I') {
      return parseInlineChildSequence(Array.from(el.childNodes), { ...style, italics: true }, options);
    }

    if (tagName === 'SUP') {
      return parseInlineChildSequence(Array.from(el.childNodes), { ...style, superScript: true }, options);
    }

    if (tagName === 'SUB') {
      return parseInlineChildSequence(Array.from(el.childNodes), { ...style, subScript: true }, options);
    }

    if (tagName === 'BR') {
      return [new TextRun({ break: 1 })];
    }

    if (tagName === 'IMG') {
      const img = el as HTMLImageElement;
      if (img.src && (img.src.startsWith('data:image/') || img.src.startsWith('blob:'))) {
        try {
          const bytes = dataUrlToUint8Array(img.src);
          const isCroppedFigure = img.getAttribute('data-cropped-figure') === 'true' || img.hasAttribute('data-page');
          const rawW =
            parseInt(img.getAttribute('data-width') || '', 10) ||
            parseInt(img.getAttribute('width') || '', 10) ||
            img.naturalWidth ||
            420;
          const rawH =
            parseInt(img.getAttribute('data-height') || '', 10) ||
            parseInt(img.getAttribute('height') || '', 10) ||
            img.naturalHeight ||
            280;

          // Keep cropped PDF/exam figures crisp at natural readable size (200..520px),
          // while keeping generated diagrams readable (min 420px, max 600px)
          const minW = isCroppedFigure ? 200 : 420;
          const maxW = isCroppedFigure ? 520 : 620;
          const maxH = isCroppedFigure ? 400 : 460;

          let finalW = Math.min(maxW, Math.max(rawW, minW));
          let finalH = Math.round(rawH * (finalW / Math.max(1, rawW)));

          if (finalH > maxH) {
            const hScale = maxH / finalH;
            finalH = maxH;
            finalW = Math.max(140, Math.round(finalW * hScale));
          }

          const imgType: 'png' | 'jpg' = /^data:image\/jpe?g/i.test(img.src) ? 'jpg' : 'png';

          return [
            new ImageRun({
              type: imgType,
              data: bytes,
              transformation: {
                width: finalW,
                height: finalH,
              },
            }),
          ];
        } catch (e) {
          console.warn('Failed to embed image in run:', e);
        }
      }
      return [];
    }

    // Default container (SPAN, DIV, etc.)
    return parseInlineChildSequence(Array.from(el.childNodes), style, options);
  }

  return runs;
}

/**
 * Strips leading true/false statement letters (a), b), c), d)) so labels are not duplicated.
 * BẮT BUỘC có dấu ngoặc hoặc dấu phân cách để TUYỆT ĐỐI không cắt nhầm chữ cái đầu câu như "Công thức...", "Dãy số...", "Biết rằng...".
 */
function cleanTfText(text: string): string {
  return text
    .replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})(?:\([a-d]\)[\.\:\)]?|[a-d][\.\:\)])(?:\*{0,2})\s*/i, '')
    .trim();
}

const INVISIBLE_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

/**
 * Parses an uppercase multiple-choice option line (A., B., C., D.) even if its label
 * was accidentally enclosed in $...$ / \(...\) or markdown bold markers.
 */
function matchChoiceOptionText(raw: string): { letter: string; body: string } | null {
  let t = (raw || '').trim();
  if (!t) return null;

  // Case 1: Entire option wrapped inside single/double dollar, e.g. "$A. 7$" -> letter A, body "$7$"
  const wholeWrapped = t.match(/^(?:\$\$?|\\\()\s*(?:[-*•●]\s*)?(?:\*{0,3})?\(?([A-D])\)?[\.\:\)](?:\*{0,3})\s+([\s\S]+?)\s*(?:\$\$?|\\\))$/);
  if (wholeWrapped) {
    const innerBody = wholeWrapped[2].trim();
    return {
      letter: wholeWrapped[1].toUpperCase(),
      body: innerBody ? `$${innerBody}$` : '',
    };
  }

  // Case 2: Only label wrapped inside $...$ / \(...\), e.g. "$A.$ $7$" or "$A.$ Đây là..."
  t = t.replace(/^\s*(?:\$\$?|\\\()\s*(?:[-*•●]\s*)?(?:\*{0,3})?\(?([A-D])\)?([\.\:\)])(?:\*{0,3})?\s*(?:\$\$?|\\\))\s*/, '$1$2 ');

  // Case 3: Standard uppercase label A., B., C., D., (A), A), **A.**
  const m = t.match(/^\s*(?:[-*•●]\s*)?(?:\*{0,3}|\s*)?\(?([A-D])\)?[\.\:\)](?:\*{0,3})[ \t]*([\s\S]*)$/);
  if (!m) return null;

  return {
    letter: m[1].toUpperCase(),
    body: (m[2] || '').trim(),
  };
}

/**
 * Builds a borderless Word Table for 4 multiple choice options.
 * Rule: 1 row x 4 cols (25% width each) if short, or 2 rows x 2 cols (50% width each) if long.
 */
function buildInvisibleChoiceTable(
  optionsList: { label: string; node?: Node; text?: string }[],
  options: ExportOptions
): Table {
  // Ensure we have up to 4 options
  const cleanOpts = optionsList.slice(0, 4);

  // Measure content lengths
  const texts = cleanOpts.map((opt) => {
    if (opt.text) return cleanOptionText(opt.text);
    if (opt.node) return cleanOptionText(getNodeLatexOrText(opt.node));
    return '';
  });

  const maxLen = Math.max(...texts.map((t) => t.length), 0);
  const use1Col = maxLen > 45;
  const use4Cols = maxLen <= 22;

  const createCell = (opt: { label: string; node?: Node; text?: string }, colPct: number) => {
    let childRuns: ParagraphChild[] = [];
    const imgParagraphs: Paragraph[] = [];

    if (opt.node) {
      const hasImg = opt.node instanceof HTMLElement && !!opt.node.querySelector('img');
      if (hasImg) {
        const cloned = opt.node.cloneNode(true) as HTMLElement;
        const bolds = Array.from(cloned.querySelectorAll('b, strong'));
        for (const b of bolds) {
          if (/^\s*(?:[-*•●]\s*)?(?:\$\$?|\\\()?(?:\*{0,2})[A-D][\.\:\)]?(?:\*{0,2})(?:\$\$?|\\\))?\s*$/i.test(b.textContent || '')) {
            b.remove();
          }
        }
        // Tách riêng ảnh ra Paragraph độc lập để MathType Toggle TeX không ảnh hưởng đến ảnh trong phương án
        const imgs = Array.from(cloned.querySelectorAll('img'));
        for (const imgEl of imgs) {
          const imgRuns = parseInlineContent(imgEl, {}, options);
          if (imgRuns.length > 0) {
            imgParagraphs.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 288, before: 40, after: 40 },
                children: imgRuns,
              })
            );
          }
          imgEl.remove();
        }
        childRuns = parseInlineContent(cloned, {}, options);
      } else {
        const rawContent = getNodeLatexOrText(opt.node);
        childRuns = parseTextWithMath(cleanOptionText(rawContent), {}, options);
      }
    } else if (opt.text) {
      childRuns = parseTextWithMath(cleanOptionText(opt.text), {}, options);
    }

    return new TableCell({
      width: { size: colPct, type: WidthType.PERCENTAGE },
      borders: INVISIBLE_BORDER,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [
        new Paragraph({
          spacing: { line: 288, after: 40 },
          children: [
            new TextRun({
              text: `${opt.label} `,
              bold: true,
              font: 'Times New Roman',
              size: 24,
            }),
            ...childRuns,
          ],
        }),
        ...imgParagraphs,
      ],
    });
  };

  const rows: TableRow[] = [];

  if (use1Col) {
    // 1 column x 4 rows
    cleanOpts.forEach((opt) => {
      rows.push(new TableRow({ children: [createCell(opt, 100)] }));
    });
  } else if (use4Cols) {
    const cells = cleanOpts.map((opt) => createCell(opt, 25));
    // Pad to 4 cells if needed
    while (cells.length < 4) {
      cells.push(
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: INVISIBLE_BORDER,
          children: [new Paragraph({ children: [] })],
        })
      );
    }
    rows.push(new TableRow({ children: cells }));
  } else {
    // 2 rows x 2 cols
    const cellA = cleanOpts[0] ? createCell(cleanOpts[0], 50) : new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: INVISIBLE_BORDER, children: [new Paragraph({})] });
    const cellB = cleanOpts[1] ? createCell(cleanOpts[1], 50) : new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: INVISIBLE_BORDER, children: [new Paragraph({})] });
    const cellC = cleanOpts[2] ? createCell(cleanOpts[2], 50) : new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: INVISIBLE_BORDER, children: [new Paragraph({})] });
    const cellD = cleanOpts[3] ? createCell(cleanOpts[3], 50) : new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: INVISIBLE_BORDER, children: [new Paragraph({})] });

    rows.push(new TableRow({ children: [cellA, cellB] }));
    rows.push(new TableRow({ children: [cellC, cellD] }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: use1Col ? [9355] : (use4Cols ? [2338, 2339, 2339, 2339] : [4677, 4678]),
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows,
  });
}

/**
 * Parses a single statement line text into ParagraphChild items (TextRuns and OMML math components),
 * guaranteeing that 100% of formulas inside $...$ or $$...$$ are preserved with no lost characters,
 * and trailing punctuation (e.g. ".") is never truncated.
 * Sử dụng trực tiếp hàm parseTextWithMath của hệ thống để xử lý nguyên vẹn toàn bộ chuỗi.
 */
function parseStatementRuns(
  statementText: string,
  options: ExportOptions
): ParagraphChild[] {
  let cleanText = (statementText || '').trim();
  // Xóa bỏ nhãn tiền tố của ý (a), b), c), d) nếu có ở đầu chuỗi (BẮT BUỘC có dấu ngoặc hoặc dấu chấm/hai chấm để không cắt nhầm chữ cái đầu câu như "Công thức...", "Dãy số...", "Biết rằng...")
  cleanText = cleanText.replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})(?:\([a-d]\)[\.\:\)]?|[a-d][\.\:\)])(?:\*{0,2})\s*/i, '').trim();

  if (!cleanText) {
    return [];
  }

  // Tận dụng chính hàm bóc tách văn bản kèm công thức đang dùng cho đề bài (parseTextWithMath)
  // để xử lý NGUYÊN VẸN toàn bộ chuỗi của từng ý a), b), c), d), bảo toàn công thức toán và dấu chấm kết thúc.
  return parseTextWithMath(cleanText, {}, options);
}

/**
 * Builds separate Paragraphs for True/False statements a), b), c), d) indented by 0.5 cm.
 * Guarantees that every statement has its label, text, and formula seamlessly rendered in a single paragraph.
 * Ghép toàn bộ nhãn a), phần chữ, phần công thức toán (MathRun/OMML) và dấu chấm kết thúc vào CÙNG MỘT ĐỐI TƯỢNG new Paragraph.
 * Tuyệt đối không tạo Paragraph riêng cho dấu chấm . hay ký tự rác.
 */
function buildTrueFalseParagraphs(
  statements: { label: string; node?: Node; text?: string }[],
  options: ExportOptions
): Paragraph[] {
  const out: Paragraph[] = [];
  for (const stmt of statements) {
    let childRuns: ParagraphChild[] = [];
    const imgParagraphs: Paragraph[] = [];

    if (stmt.node) {
      // Check if node contains an image (e.g. geometric figure)
      const hasImg = stmt.node instanceof HTMLElement && !!stmt.node.querySelector('img');
      if (hasImg) {
        const cloned = stmt.node.cloneNode(true) as HTMLElement;
        const bolds = Array.from(cloned.querySelectorAll('b, strong'));
        for (const b of bolds) {
          if (/^\s*(?:[-*]\s*)?(?:\*{0,2})\(?[a-d]\)?[\.\:\)]?(?:\*{0,2})\s*$/i.test(b.textContent || '')) {
            b.remove();
          }
        }
        const imgs = Array.from(cloned.querySelectorAll('img'));
        for (const imgEl of imgs) {
          const imgRuns = parseInlineContent(imgEl, {}, options);
          if (imgRuns.length > 0) {
            imgParagraphs.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 288, before: 60, after: 60 },
                children: imgRuns,
              })
            );
          }
          imgEl.remove();
        }
        childRuns = parseInlineContent(cloned, {}, options);
      } else {
        // Extract complete text + math intact, preserving every formula and trailing punctuation
        const fullContent = getNodeLatexOrText(stmt.node);
        childRuns = parseStatementRuns(fullContent, options);
      }
    } else if (stmt.text) {
      childRuns = parseStatementRuns(stmt.text, options);
    }

    // Ghép toàn bộ nhãn a), phần chữ, phần công thức toán (MathRun/OMML) và dấu chấm kết thúc vào CÙNG MỘT ĐỐI TƯỢNG new Paragraph
    out.push(
      new Paragraph({
        indent: { left: convertMillimetersToTwip(5) }, // 0.5 cm
        spacing: { line: 288, after: 80 }, // 1.2 lines, 4pt after
        children: [
          new TextRun({
            text: `${stmt.label} `,
            bold: true,
            font: 'Times New Roman',
            size: 24,
          }),
          ...childRuns,
        ],
      }),
      ...imgParagraphs
    );
  }
  return out;
}

/**
 * Groups fragmented multiple-choice option paragraphs (A, B, C, D) or stems with trailing A
 * into a single unified invisible choice table for high-fidelity Word export.
 */
function nodeContainsImg(node: Node | undefined): boolean {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  return el.tagName.toUpperCase() === 'IMG' || !!el.querySelector('img');
}

function tryExtractChoiceCluster(
  nodes: Node[],
  idx: number,
  options: ExportOptions
): { consumed: number; items: (Paragraph | Table)[] } | null {
  if (idx >= nodes.length) return null;
  const current = nodes[idx];
  if (current.nodeType !== Node.ELEMENT_NODE) return null;
  const currentEl = current as HTMLElement;
  const currentText = stripInternalTags(getNodeLatexOrText(currentEl)).trim();

  // TH1: Đề bài dính phương án A ở đuôi (ví dụ: "... là A. 15." hoặc "... bằng A. u_5 = 48.")
  // và các node tiếp theo chứa B., C., D. (CHỈ áp dụng chữ IN HOA A, B, C, D)
  // Tuyệt đối không gom khi currentEl chứa hình ảnh (tránh làm rơi ảnh đề bài)
  const stemWithAMatch = !nodeContainsImg(currentEl)
    ? currentText.match(/^(.*?)\s+(?:[-*]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s*([^\n]+)$/)
    : null;
  if (stemWithAMatch) {
    const nextEls: HTMLElement[] = [];
    for (let j = idx + 1; j < Math.min(idx + 6, nodes.length); j++) {
      if (nodes[j].nodeType === Node.ELEMENT_NODE) {
        const elJ = nodes[j] as HTMLElement;
        const text = stripInternalTags(getNodeLatexOrText(elJ)).trim();
        // Nếu gặp khối chỉ chứa hình ảnh chen giữa -> không nuốt khối ảnh
        if (!text && nodeContainsImg(elJ)) break;
        if (text) nextEls.push(elJ);
      }
    }
    if (nextEls.length >= 3) {
      const tB = stripInternalTags(getNodeLatexOrText(nextEls[0])).trim();
      const tC = stripInternalTags(getNodeLatexOrText(nextEls[1])).trim();
      const tD = stripInternalTags(getNodeLatexOrText(nextEls[2])).trim();
      if (
        /^\s*(?:[-*]\s*)?(?:\*{0,2})B[\.\)]/.test(tB) &&
        /^\s*(?:[-*]\s*)?(?:\*{0,2})C[\.\)]/.test(tC) &&
        /^\s*(?:[-*]\s*)?(?:\*{0,2})D[\.\)]/.test(tD)
      ) {
        const lastConsumedEl = nextEls[2];
        let consumed = 1;
        let hasInterveningImage = false;
        for (let k = idx + 1; k < nodes.length; k++) {
          consumed++;
          if (nodes[k] === lastConsumedEl) break;
          if (!nextEls.includes(nodes[k] as HTMLElement) && nodeContainsImg(nodes[k])) {
            hasInterveningImage = true;
            break;
          }
        }
        if (hasInterveningImage) return null;

        const stemText = stemWithAMatch[1].trim();
        const optA = stemWithAMatch[2].trim();
        const optB = tB.replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s*/, '').trim();
        const optC = tC.replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})C[\.\)](?:\*{0,2})\s*/, '').trim();
        const optD = tD.replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})D[\.\)](?:\*{0,2})\s*/, '').trim();

        const items: (Paragraph | Table)[] = [];
        if (stemText) {
          items.push(new Paragraph({
            spacing: { line: 288, after: 80 },
            children: parseTextWithMath(stemText, {}, options)
          }));
        }
        items.push(buildInvisibleChoiceTable([
          { label: 'A.', text: optA },
          nodeContainsImg(nextEls[0]) ? { label: 'B.', node: nextEls[0] } : { label: 'B.', text: optB },
          nodeContainsImg(nextEls[1]) ? { label: 'C.', node: nextEls[1] } : { label: 'C.', text: optC },
          nodeContainsImg(nextEls[2]) ? { label: 'D.', node: nextEls[2] } : { label: 'D.', text: optD }
        ], options));

        return { consumed, items };
      }
    }
  }

  // TH2: Node hiện tại là riêng phương án A. ...
  // và 3 node tiếp theo chứa B, C, D (CHỈ áp dụng chữ IN HOA A, B, C, D - không bắt nhầm a), b), c), d) Đúng/Sai)
  const parsedA = matchChoiceOptionText(currentText);
  if (parsedA && parsedA.letter === 'A') {
    const nextEls: HTMLElement[] = [];
    for (let j = idx + 1; j < Math.min(idx + 6, nodes.length); j++) {
      if (nodes[j].nodeType === Node.ELEMENT_NODE) {
        const elJ = nodes[j] as HTMLElement;
        const text = stripInternalTags(getNodeLatexOrText(elJ)).trim();
        if (!text && nodeContainsImg(elJ)) break;
        if (text) nextEls.push(elJ);
      }
    }
    if (nextEls.length >= 3) {
      const parsedB = matchChoiceOptionText(stripInternalTags(getNodeLatexOrText(nextEls[0])).trim());
      const parsedC = matchChoiceOptionText(stripInternalTags(getNodeLatexOrText(nextEls[1])).trim());
      const parsedD = matchChoiceOptionText(stripInternalTags(getNodeLatexOrText(nextEls[2])).trim());
      if (parsedB?.letter === 'B' && parsedC?.letter === 'C' && parsedD?.letter === 'D') {
        const lastConsumedEl = nextEls[2];
        let consumed = 1;
        let hasInterveningImage = false;
        for (let k = idx + 1; k < nodes.length; k++) {
          consumed++;
          if (nodes[k] === lastConsumedEl) break;
          if (!nextEls.includes(nodes[k] as HTMLElement) && nodeContainsImg(nodes[k])) {
            hasInterveningImage = true;
            break;
          }
        }
        if (hasInterveningImage) return null;

        const table = buildInvisibleChoiceTable([
          nodeContainsImg(currentEl) ? { label: 'A.', node: currentEl } : { label: 'A.', text: parsedA.body },
          nodeContainsImg(nextEls[0]) ? { label: 'B.', node: nextEls[0] } : { label: 'B.', text: parsedB.body },
          nodeContainsImg(nextEls[1]) ? { label: 'C.', node: nextEls[1] } : { label: 'C.', text: parsedC.body },
          nodeContainsImg(nextEls[2]) ? { label: 'D.', node: nextEls[2] } : { label: 'D.', text: parsedD.body }
        ], options);

        return { consumed, items: [table] };
      }
    }
  }

  return null;
}

/**
 * Recursively converts a DOM node or tree into an array of docx FileChild (Paragraph | Table).
 */
async function parseDomToDocxChildren(
  root: HTMLElement,
  options: ExportOptions
): Promise<FileChild[]> {
  const result: FileChild[] = [];
  let processedNodeCount = 0;

  // Helper to process child nodes of an element
  async function processNode(node: Node): Promise<void> {
    if (++processedNodeCount % 12 === 0) {
      await yieldToMain();
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = (node.textContent || '').trim();
      // Không tạo Paragraph riêng cho dấu chấm . hay ký tự rác
      if (txt && !/^[.,:;?!]+$/.test(txt)) {
        result.push(
          new Paragraph({
            spacing: { line: 288, after: 80 },
            children: parseTextWithMath(txt, {}, options),
          })
        );
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tagName = el.tagName.toUpperCase();

    // 0.0 Direct standalone <img> or inline/display math node inside a block container
    if (tagName === 'IMG') {
      const imgRuns = parseInlineContent(el, {}, options);
      if (imgRuns.length > 0) {
        result.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 288, before: 100, after: 100 },
            children: imgRuns,
          })
        );
      }
      return;
    }

    if (isInlineMathElement(el)) {
      const mathRuns = parseInlineContent(el, {}, options);
      if (mathRuns.length > 0) {
        const isBlockMath =
          el.getAttribute('data-block') === '1' ||
          el.getAttribute('display') === 'true' ||
          el.classList.contains('katex-display') ||
          el.classList.contains('math-display');
        result.push(
          new Paragraph({
            alignment: isBlockMath ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { line: 288, after: 80 },
            children: mathRuns,
          })
        );
      }
      return;
    }

    // 0. Page Breaks
    const isExplicitDivider =
      (el.classList.contains('page-break') || 
       el.classList.contains('docx-page-break') ||
       el.getAttribute('data-page-break') === 'true' ||
       el.style.pageBreakBefore === 'always' || 
       el.style.pageBreakAfter === 'always' || 
       el.style.breakBefore === 'page' || 
       el.style.breakAfter === 'page') &&
      !el.textContent?.trim() &&
      el.children.length === 0;

    if (isExplicitDivider) {
      result.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
      return;
    }

    // Element has page-break-before style but contains child content (e.g. export-solution-block):
    // Insert a PageBreak into docx first, then CONTINUE processing the element and all its children!
    if (
      el.style.pageBreakBefore === 'always' || 
      el.style.breakBefore === 'page' ||
      el.classList.contains('page-break-before')
    ) {
      result.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    // 0.5. Structured A4 Worksheet Header Box (render as crisp 4-col grid bordered Word Table)
    if (el.hasAttribute('data-docx-worksheet-header')) {
      const department = el.getAttribute('data-department') || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO';
      const school = el.getAttribute('data-school') || 'TRƯỜNG THPT: ................................................';
      const subjectGroup = el.getAttribute('data-subject-group') || 'TỔ CHUYÊN MÔN: TOÁN - TIN HỌC';
      const teacher = el.getAttribute('data-teacher') || 'Giáo viên: ................................................';
      const title = el.getAttribute('data-title') || 'PHIẾU HỌC TẬP';
      const lesson = el.getAttribute('data-lesson') || '';
      const meta = el.getAttribute('data-meta') || '';

      const boxOuter = { style: BorderStyle.SINGLE, size: 12, color: '1E293B' };
      const boxInner = { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' };
      const boxDashed = { style: BorderStyle.DOTTED, size: 6, color: '64748B' };

      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [2338, 2339, 2339, 2339],
        borders: {
          top: boxOuter,
          bottom: boxOuter,
          left: boxOuter,
          right: boxOuter,
          insideHorizontal: boxInner,
          insideVertical: boxInner,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 2,
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 100, bottom: 100, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { line: 240, after: 30 },
                    children: [new TextRun({ text: department.toUpperCase(), bold: true, font: 'Times New Roman', size: 21, color: '334155' })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { line: 240, after: 30 },
                    children: [new TextRun({ text: school.toUpperCase(), bold: true, font: 'Times New Roman', size: 23, color: '0F172A' })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { line: 240, after: 30 },
                    children: [new TextRun({ text: subjectGroup.toUpperCase(), bold: true, font: 'Times New Roman', size: 20, color: '475569' })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { line: 240, after: 0 },
                    children: [new TextRun({ text: teacher, bold: true, font: 'Times New Roman', size: 21, color: '1E293B' })],
                  }),
                ],
              }),
              new TableCell({
                columnSpan: 2,
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 100, bottom: 100, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { line: 260, after: 40 },
                    children: [new TextRun({ text: title.toUpperCase(), bold: true, font: 'Times New Roman', size: 26, color: '0F172A' })],
                  }),
                  ...(lesson
                    ? [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { line: 260, after: 40 },
                          children: [new TextRun({ text: lesson.toUpperCase(), bold: true, font: 'Times New Roman', size: 22, color: '065F46' })],
                        }),
                      ]
                    : []),
                  ...(meta
                    ? [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { line: 240, after: 0 },
                          children: [new TextRun({ text: meta, font: 'Times New Roman', size: 20, color: '475569' })],
                        }),
                      ]
                    : []),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 4,
                width: { size: 100, type: WidthType.PERCENTAGE },
                margins: { top: 90, bottom: 90, left: 120, right: 120 },
                borders: {
                  top: boxInner,
                  bottom: boxDashed,
                  left: boxOuter,
                  right: boxOuter,
                },
                children: [
                  new Paragraph({
                    spacing: { line: 260, after: 0 },
                    children: [
                      new TextRun({ text: 'Họ và tên học sinh: ', bold: true, font: 'Times New Roman', size: 22 }),
                      new TextRun({ text: '...............................................   ', font: 'Times New Roman', size: 22 }),
                      new TextRun({ text: 'Lớp: ', bold: true, font: 'Times New Roman', size: 22 }),
                      new TextRun({ text: '..............   ', font: 'Times New Roman', size: 22 }),
                      new TextRun({ text: 'STT: ', bold: true, font: 'Times New Roman', size: 22 }),
                      new TextRun({ text: '......   ', font: 'Times New Roman', size: 22 }),
                      new TextRun({ text: 'Ngày nộp: ', bold: true, font: 'Times New Roman', size: 22 }),
                      new TextRun({ text: '....../....../202...', font: 'Times New Roman', size: 22 }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 1,
                width: { size: 25, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
                margins: { top: 90, bottom: 90, left: 100, right: 100 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { line: 240, after: 40 },
                    children: [new TextRun({ text: 'ĐIỂM SỐ', bold: true, font: 'Times New Roman', size: 21, color: '334155' })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { line: 260, after: 0 },
                    children: [new TextRun({ text: '......... / 10', bold: true, italics: true, font: 'Times New Roman', size: 26, color: '64748B' })],
                  }),
                ],
              }),
              new TableCell({
                columnSpan: 3,
                width: { size: 75, type: WidthType.PERCENTAGE },
                margins: { top: 90, bottom: 90, left: 140, right: 140 },
                children: [
                  new Paragraph({
                    spacing: { line: 240, after: 120 },
                    children: [new TextRun({ text: 'Lời phê & Nhận xét của Thầy / Cô:', bold: true, font: 'Times New Roman', size: 21, color: '1E293B' })],
                  }),
                  new Paragraph({
                    spacing: { line: 240, after: 160 },
                    border: { bottom: { style: BorderStyle.DOTTED, size: 6, color: '94A3B8' } },
                    children: [new TextRun({ text: ' ', font: 'Times New Roman', size: 20 })],
                  }),
                  new Paragraph({
                    spacing: { line: 240, after: 20 },
                    border: { bottom: { style: BorderStyle.DOTTED, size: 6, color: '94A3B8' } },
                    children: [new TextRun({ text: ' ', font: 'Times New Roman', size: 20 })],
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      result.push(headerTable);
      result.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      return;
    }

    // 0.6. 2-Column Infographic Grid (render side by side as a 50/50 Word Table)
    if (el.hasAttribute('data-docx-2col-grid')) {
      const colEls = Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement);
      if (colEls.length >= 2) {
        const leftChildren = await parseDomToDocxChildren(colEls[0], options);
        const rightChildren = await parseDomToDocxChildren(colEls[1], options);
        const gridBorder = { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' };
        result.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4677, 4678],
            borders: {
              top: gridBorder,
              bottom: gridBorder,
              left: gridBorder,
              right: gridBorder,
              insideHorizontal: gridBorder,
              insideVertical: gridBorder,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: { top: 120, bottom: 120, left: 140, right: 140 },
                    children: leftChildren.length > 0 ? leftChildren : [new Paragraph({ children: [] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: { top: 120, bottom: 120, left: 140, right: 140 },
                    children: rightChildren.length > 0 ? rightChildren : [new Paragraph({ children: [] })],
                  }),
                ],
              }),
            ],
          })
        );
        result.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        return;
      }
    }

    // 0.7. Worksheet Dotted Answer Lines (.worksheet-dotted-lines / data-docx-dotted-lines)
    if (el.hasAttribute('data-docx-dotted-lines') || el.classList.contains('worksheet-dotted-lines')) {
      const attrCount = parseInt(el.getAttribute('data-docx-dotted-lines') || '0', 10);
      const childLines = el.querySelectorAll('.worksheet-dotted-line').length;
      const lineCount = Math.max(1, Math.min(20, attrCount || childLines || 3));
      const label = el.getAttribute('data-label')?.trim();
      if (label) {
        result.push(
          new Paragraph({
            spacing: { line: 260, before: 60, after: 40 },
            children: [
              new TextRun({ text: label, bold: true, italics: true, font: 'Times New Roman', size: 22, color: '475569' }),
            ],
          })
        );
      }
      for (let i = 0; i < lineCount; i++) {
        result.push(
          new Paragraph({
            spacing: {
              line: 340,
              before: i === 0 && !label ? 40 : 0,
              after: i === lineCount - 1 ? 100 : 80,
            },
            border: {
              bottom: { style: BorderStyle.DOTTED, size: 6, color: '64748B' },
            },
            children: [new TextRun({ text: ' ', font: 'Times New Roman', size: 22 })],
          })
        );
      }
      return;
    }

    // 1. Headings
    if (/^H[1-6]$/.test(tagName)) {
      const level = parseInt(tagName[1], 10);
      const isH1 = level === 1;
      const isH2 = level === 2;
      const size = isH1 ? 28 : isH2 ? 26 : 24;
      const runs = parseInlineContent(el, { bold: true, size }, options);

      result.push(
        new Paragraph({
          spacing: { line: 288, before: isH1 ? 180 : 120, after: 80 },
          alignment: isH1 ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: runs,
        })
      );
      return;
    }

    // 2. Question blocks (.question-block)
    if (el.classList.contains('question-block')) {
      // Find question prompt and any options/tf inside
      const children = Array.from(el.children);
      for (const child of children) {
        await processNode(child);
      }
      return;
    }

    // 3. Tables
    if (tagName === 'TABLE') {
      const className = el.className || '';
      const style = el.getAttribute('style') || '';

      // Check if it's an options table
      if (className.includes('options-table')) {
        const cells = Array.from(el.querySelectorAll('td'));
        if (cells.length >= 2) {
          const optsList = cells.map((td, idx) => {
            const label = ['A.', 'B.', 'C.', 'D.'][idx] || `${String.fromCharCode(65 + idx)}.`;
            return { label, node: td };
          });
          result.push(buildInvisibleChoiceTable(optsList, options));
          return;
        }
      }

      // Check if it's a True/False table
      if (className.includes('tf-table')) {
        const rows = Array.from(el.querySelectorAll('tr'));
        const stmts: { label: string; node?: Node }[] = [];
        rows.forEach((tr, idx) => {
          const tds = Array.from(tr.querySelectorAll('td'));
          const label = ['a)', 'b)', 'c)', 'd)'][idx] || `${String.fromCharCode(97 + idx)})`;
          if (tds.length >= 2) {
            stmts.push({ label, node: tds[1] });
          } else if (tds.length === 1) {
            stmts.push({ label, node: tds[0] });
          }
        });
        if (stmts.length > 0) {
          result.push(...buildTrueFalseParagraphs(stmts, options));
          return;
        }
      }

      // General Tables (Header table, Matrix, Candidate box, etc.)
      const isBorderless =
        className.includes('borderless') ||
        style.includes('border: none') ||
        style.includes('border:none');

      const borderConfig = isBorderless
        ? INVISIBLE_BORDER
        : {
            top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          };

      const trElements = Array.from(el.querySelectorAll('tr'));
      if (trElements.length === 0) return;

      const numRows = trElements.length;
      interface GridCell {
        cellEl: HTMLElement;
        isOrigin: boolean;
        rowSpan: number;
        colSpan: number;
        isContinue: boolean;
      }
      const grid: (GridCell | null)[][] = Array.from({ length: numRows }, () => []);

      let maxCols = 0;
      for (let r = 0; r < numRows; r++) {
        const tr = trElements[r];
        const cells = Array.from(tr.querySelectorAll('th, td'));
        let c = 0;
        for (const cell of cells) {
          while (grid[r][c]) {
            c++;
          }
          const cellEl = cell as HTMLElement;
          const colSpan = Math.max(1, parseInt(cellEl.getAttribute('colspan') || '1', 10));
          const rowSpan = Math.max(1, parseInt(cellEl.getAttribute('rowspan') || '1', 10));

          for (let rr = r; rr < r + rowSpan && rr < numRows; rr++) {
            for (let cc = c; cc < c + colSpan; cc++) {
              grid[rr][cc] = {
                cellEl,
                isOrigin: rr === r && cc === c,
                rowSpan,
                colSpan,
                isContinue: rr > r,
              };
            }
          }
          c += colSpan;
          if (c > maxCols) maxCols = c;
        }
      }
      maxCols = Math.max(1, maxCols);

      const rows: TableRow[] = [];
      const isDenseTable = maxCols >= 8;

      // Compute smart column widths for 2-column / 3-column CV 5512 knowledge & solution tables (skip for borderless exam headers)
      let twoColWeights: [number, number] | null = null;
      if (maxCols === 2 && !isBorderless) {
        let col0Max = 0;
        let col1Max = 0;
        for (let rr = 0; rr < numRows; rr++) {
          const c0 = grid[rr][0]?.cellEl;
          const c1 = grid[rr][1]?.cellEl;
          if (c0) col0Max = Math.max(col0Max, (c0.textContent || '').trim().length);
          if (c1) col1Max = Math.max(col1Max, (c1.textContent || '').trim().length);
        }
        if (col1Max > 55 && col0Max <= 45) {
          twoColWeights = col0Max <= 16 ? [18, 82] : [28, 72];
        }
      }

      for (let r = 0; r < numRows; r++) {
        if (r > 0 && r % 4 === 0) await yieldToMain();
        const rowCells: TableCell[] = [];
        const tr = trElements[r];
        const isHeader = !isBorderless && (r < 3 || tr.closest('thead') !== null);

        let c = 0;
        while (c < maxCols) {
          const cellInfo = grid[r][c];
          if (!cellInfo) {
            c++;
            continue;
          }

          // In Word OOXML, a cell with columnSpan covers all colSpan columns in that row.
          // Skip columns that are part of the span horizontally.
          if (!cellInfo.isOrigin && !cellInfo.isContinue) {
            c++;
            continue;
          }
          if (cellInfo.isContinue && c > 0 && grid[r][c - 1]?.cellEl === cellInfo.cellEl) {
            c++;
            continue;
          }

          const { cellEl, rowSpan, colSpan, isContinue } = cellInfo;

          // Calculate percentage width for this cell (sum of widths of spanned columns)
          let cellWidthPct = 0;
          const cellStyleAttr = cellEl.getAttribute('style') || '';
          const explicitWidthMatch = cellStyleAttr.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)%/i);
          if (explicitWidthMatch && colSpan === 1) {
            cellWidthPct = Math.round(parseFloat(explicitWidthMatch[1]));
          } else if (maxCols >= 18) {
            // Proportional distribution for 19-column Vinh Loc Matrix:
            // TT (4%), Chu de (16%), Noi dung (16%), 12 question levels (3.6% each = 43.2%), 3 Totals (4.6% each = 13.8%), Tile (7%)
            const colWeights = [4, 16, 16, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 4.6, 4.6, 4.6, 7];
            for (let k = c; k < c + colSpan && k < colWeights.length; k++) {
              cellWidthPct += colWeights[k];
            }
            cellWidthPct = Math.round(cellWidthPct);
          } else if (maxCols >= 9 && maxCols <= 15) {
            // Quick Answer Table (e.g. 13 cols: Col 0 = "Câu", Cols 1..12 = 1..12)
            if (c === 0) {
              cellWidthPct = colSpan === 1 ? 12 : Math.round((colSpan / maxCols) * 100);
            } else {
              const remaining = 88 / (maxCols - 1);
              cellWidthPct = Math.round(remaining * colSpan);
            }
          } else if (twoColWeights && colSpan === 1) {
            cellWidthPct = twoColWeights[c] || 50;
          } else {
            cellWidthPct = Math.round((colSpan / maxCols) * 100);
          }
          if (cellWidthPct <= 0) cellWidthPct = Math.round((colSpan / maxCols) * 100);

          if (isContinue) {
            rowCells.push(
              new TableCell({
                verticalMerge: VerticalMergeType.CONTINUE,
                columnSpan: colSpan > 1 ? colSpan : undefined,
                width: { size: cellWidthPct, type: WidthType.PERCENTAGE },
                borders: borderConfig,
                children: [new Paragraph({})],
              })
            );
          } else {
            const cellStyle = cellEl.getAttribute('style') || '';
            const cellClass = cellEl.className || '';
            const textContent = (cellEl.textContent || '').trim();
            const isCenter =
              /text-align\s*:\s*center/i.test(cellStyle) ||
              cellClass.includes('text-center') ||
              cellEl.tagName === 'TH' ||
              (isDenseTable && textContent.length <= 15);
            const isHeaderCell = cellEl.tagName === 'TH';

            const formatCellRuns = (elTarget: Element) => {
              const runs = parseInlineContent(elTarget, isHeaderCell ? { bold: true } : {}, options);
              if (isDenseTable) {
                runs.forEach((run) => {
                  (run as any).options = {
                    ...(run as any).options,
                    size: maxCols >= 15 ? 17 : (c === 0 ? 18 : 20), // 9pt for Col 0 header, 10pt for numbers
                    font: 'Times New Roman',
                  };
                });
              }
              return runs;
            };

            const cellParagraphs: Paragraph[] = [];
            const cellHasImg = !!cellEl.querySelector('img');
            const cellChildren = Array.from(cellEl.children);

            const applyDenseStyle = (runs: ParagraphChild[]) => {
              if (isDenseTable) {
                runs.forEach((run) => {
                  if (run instanceof ImageRun) return;
                  (run as any).options = {
                    ...(run as any).options,
                    size: maxCols >= 15 ? 17 : (c === 0 ? 18 : 20),
                    font: 'Times New Roman',
                  };
                });
              }
            };

            if (cellHasImg || (cellChildren.length > 0 && cellChildren.some((ch) => /^(DIV|P|H[1-6]|BR)$/i.test(ch.tagName)))) {
              // Duyệt đầy đủ childNodes để không bao giờ rơi text node xen kẽ với <div><img></div> hoặc <br/>
              // Đồng thời tách mọi <img> sang Paragraph căn giữa độc lập (an toàn 100% khi chạy MathType Toggle TeX)
              let inlineBuf: Node[] = [];
              const flushInlineBuf = () => {
                if (inlineBuf.length === 0) return;
                const runs = parseInlineChildSequence(inlineBuf, isHeaderCell ? { bold: true } : {}, options);
                inlineBuf = [];
                applyDenseStyle(runs);
                if (runs.length > 0) {
                  cellParagraphs.push(
                    new Paragraph({
                      spacing: { line: isDenseTable ? 220 : 276, after: isDenseTable ? 10 : 40 },
                      alignment: isCenter ? AlignmentType.CENTER : AlignmentType.LEFT,
                      children: runs,
                    })
                  );
                }
              };

              const emitCellNode = (cn: Node) => {
                if (cn.nodeType === Node.ELEMENT_NODE) {
                  const cnEl = cn as HTMLElement;
                  const cnTag = cnEl.tagName.toUpperCase();
                  if (cnTag === 'BR') {
                    flushInlineBuf();
                    return;
                  }
                  if (cnTag === 'IMG') {
                    flushInlineBuf();
                    const imgRuns = parseInlineContent(cnEl, {}, options);
                    if (imgRuns.length > 0) {
                      cellParagraphs.push(
                        new Paragraph({
                          spacing: { line: 288, before: 60, after: 60 },
                          alignment: AlignmentType.CENTER,
                          children: imgRuns,
                        })
                      );
                    }
                    return;
                  }
                  if (/^(DIV|P|H[1-6])$/.test(cnTag)) {
                    flushInlineBuf();
                    const nestedImgs = Array.from(cnEl.querySelectorAll('img'));
                    if (nestedImgs.length > 0) {
                      const textOnlyClone = cnEl.cloneNode(true) as HTMLElement;
                      textOnlyClone.querySelectorAll('img').forEach(im => im.remove());
                      const txtRuns = parseInlineContent(textOnlyClone, isHeaderCell ? { bold: true } : {}, options);
                      applyDenseStyle(txtRuns);
                      if (txtRuns.length > 0) {
                        cellParagraphs.push(
                          new Paragraph({
                            spacing: { line: isDenseTable ? 220 : 276, after: isDenseTable ? 10 : 40 },
                            alignment: isCenter ? AlignmentType.CENTER : AlignmentType.LEFT,
                            children: txtRuns,
                          })
                        );
                      }
                      for (const imgEl of nestedImgs) {
                        const imgRuns = parseInlineContent(imgEl, {}, options);
                        if (imgRuns.length > 0) {
                          cellParagraphs.push(
                            new Paragraph({
                              spacing: { line: 288, before: 60, after: 60 },
                              alignment: AlignmentType.CENTER,
                              children: imgRuns,
                            })
                          );
                        }
                      }
                    } else {
                      const runs = formatCellRuns(cnEl);
                      if (runs.length > 0) {
                        cellParagraphs.push(
                          new Paragraph({
                            spacing: { line: isDenseTable ? 220 : 288, after: isDenseTable ? 10 : 40 },
                            alignment: isCenter ? AlignmentType.CENTER : AlignmentType.LEFT,
                            children: runs,
                          })
                        );
                      }
                    }
                    return;
                  }
                }
                inlineBuf.push(cn);
              };

              for (const cn of Array.from(cellEl.childNodes)) {
                emitCellNode(cn);
              }
              flushInlineBuf();
            } else {
              const runs = formatCellRuns(cellEl);
              cellParagraphs.push(
                new Paragraph({
                  spacing: { line: isDenseTable ? 220 : 288, after: isDenseTable ? 10 : 40 },
                  alignment: isCenter ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: runs,
                })
              );
            }

            rowCells.push(
              new TableCell({
                verticalMerge: rowSpan > 1 ? VerticalMergeType.RESTART : undefined,
                columnSpan: colSpan > 1 ? colSpan : undefined,
                width: { size: cellWidthPct, type: WidthType.PERCENTAGE },
                borders: borderConfig,
                shading: isHeaderCell && !isBorderless ? { fill: 'EFF6FF', type: ShadingType.CLEAR } : undefined,
                margins: isDenseTable
                  ? { top: 30, bottom: 30, left: (c === 0 ? 20 : 30), right: (c === 0 ? 20 : 30) }
                  : isBorderless
                  ? { top: 40, bottom: 40, left: 60, right: 60 }
                  : { top: 80, bottom: 80, left: 100, right: 100 },
                children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({})],
              })
            );
          }

          c += colSpan;
        }

        if (rowCells.length > 0) {
          rows.push(
            new TableRow({
              tableHeader: isHeader,
              cantSplit: true,
              children: rowCells,
            })
          );
        }
      }

      if (rows.length > 0) {
        result.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: isBorderless
              ? {
                  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                }
              : {
                  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                },
            rows,
          })
        );
      }
      return;
    }

    // 4. Lists (UL / OL)
    if (tagName === 'UL' || tagName === 'OL') {
      const isOrderedList = tagName === 'OL';
      const olStart = isOrderedList ? (parseInt(el.getAttribute('start') || '1', 10) || 1) : 1;
      const rawItems = Array.from(el.querySelectorAll(':scope > li'));
      // Lọc bỏ hoàn toàn các thẻ <li> rỗng hoặc chỉ chứa dấu chấm/bullet rác để không tạo dấu chấm đen mồ côi trong Word
      const items = rawItems.filter((li) => {
        if (li.querySelector('img')) return true;
        const txt = stripInternalTags(getNodeLatexOrText(li)).trim();
        return txt.length > 0 && !/^[-*•●.\s]+$/.test(txt);
      });
      if (items.length === 0) return;

      const itemLatexTexts = items.map((li) => stripInternalTags(getNodeLatexOrText(li)).trim());
      const parsedChoiceItems = itemLatexTexts.map((t) => matchChoiceOptionText(t));

      // Check if this UL represents multiple choice options A, B, C, D (uppercase sequence A, B...)
      const isChoiceList =
        items.length >= 2 &&
        items.length <= 4 &&
        parsedChoiceItems.every((p, idx) => p !== null && p.letter === String.fromCharCode(65 + idx));

      if (isChoiceList) {
        const optsList = items.map((li, idx) => {
          const parsed = parsedChoiceItems[idx]!;
          const label = `${parsed.letter}.`;
          if (li.querySelector('img')) {
            return { label, node: li };
          }
          return { label, text: parsed.body };
        });
        result.push(buildInvisibleChoiceTable(optsList, options));
        return;
      }

      // Check if this UL represents True/False statements a), b), c), d) (lowercase sequence a, b...)
      const isTfList =
        items.length >= 2 &&
        items.length <= 4 &&
        itemLatexTexts.every((t, idx) => {
          const expected = String.fromCharCode(97 + idx);
          return new RegExp(`^\\s*(?:[-*•●]\\s*)?(?:\\*{0,3})?\\(?${expected}\\)?[\\.\\)]`).test(t);
        });

      if (isTfList) {
        const stmts = items.map((li, idx) => {
          const label = ['a)', 'b)', 'c)', 'd)'][idx] || `${String.fromCharCode(97 + idx)})`;
          return { label, node: li };
        });
        result.push(...buildTrueFalseParagraphs(stmts, options));
        return;
      }

      // Standard list items (Kiểm tra nếu item là câu hỏi trắc nghiệm hoặc bắt đầu bằng Câu/Bài/PHẦN/Phương án thì không chèn bullet tròn)
      const mcRegex = /^(.*?)\s*(?:[-*•●]\s*)?(?:\*{0,3})A[\.\:\)](?:\*{0,3})\s+([\s\S]*?)(?:[-*•●]\s*)?(?:\*{0,3})B[\.\:\)](?:\*{0,3})\s+([\s\S]*?)(?:[-*•●]\s*)?(?:\*{0,3})(?<![a-zA-Z0-9_\$\\\(])C[\.\:\)](?:\*{0,3})\s+([\s\S]*?)(?:[-*•●]\s*)?(?:\*{0,3})(?<![a-zA-Z0-9_\$\\\(])D[\.\:\)](?:\*{0,3})\s+([\s\S]*)$/;

      for (let i = 0; i < items.length; i++) {
        const li = items[i];
        const rawText = itemLatexTexts[i];
        const ordNum = olStart + i;
        const hasExplicitNumber = /^\s*(?:\*{0,3})?(?:Câu\s*\d+|Bài\s*\d+|\d+[\.\)\:])/i.test(rawText);
        const mcMatch = !li.querySelector('img') ? rawText.match(mcRegex) : null;

        if (mcMatch) {
          let stemText = stripInternalTags(mcMatch[1].trim());
          const optA = mcMatch[2].trim();
          const optB = mcMatch[3].trim();
          const optC = mcMatch[4].trim();
          const optD = mcMatch[5].trim();

          if (isOrderedList && !hasExplicitNumber) {
            stemText = stemText ? `**Câu ${ordNum}.** ${stemText}` : `**Câu ${ordNum}.**`;
          }

          if (stemText) {
            result.push(
              new Paragraph({
                spacing: { line: 288, after: 80 },
                children: parseTextWithMath(stemText, {}, options),
              })
            );
          }

          result.push(
            buildInvisibleChoiceTable(
              [
                { label: 'A.', text: optA },
                { label: 'B.', text: optB },
                { label: 'C.', text: optC },
                { label: 'D.', text: optD },
              ],
              options
            )
          );
          continue;
        }

        // Kiểm tra nếu 4 item liên tiếp là A., B., C., D. -> Gom thành bảng phương án ẩn (không bao giờ có bullet ●)
        if (i + 3 < items.length) {
          const next4Parsed = [
            parsedChoiceItems[i],
            parsedChoiceItems[i + 1],
            parsedChoiceItems[i + 2],
            parsedChoiceItems[i + 3],
          ];
          const is4Opts = next4Parsed.every((p, idx) => p !== null && p.letter === String.fromCharCode(65 + idx));
          if (is4Opts) {
            const optsList = next4Parsed.map((parsed, idx) => {
              const liNode = items[i + idx];
              const label = `${parsed!.letter}.`;
              if (liNode.querySelector('img')) {
                return { label, node: liNode };
              }
              return { label, text: parsed!.body };
            });
            result.push(buildInvisibleChoiceTable(optsList, options));
            i += 3;
            continue;
          }
        }

        const isQuestionItem = /^\s*(?:\*\*)?(?:Câu|Bài)\s*\d+/i.test(rawText);
        const isSectionItem = /^\s*(?:\*\*)?(?:PHẦN\s*(?:[1-4]|I{1,3}|IV)\b|Đáp\s*án|Lời\s*giải|Hướng\s*dẫn)/i.test(rawText);
        const isChoiceItem =
          parsedChoiceItems[i] !== null ||
          /^\s*(?:[-*•●]\s*)?(?:\*{0,3}|\s*)?\(?[a-d]\)?[\.\:\)]/.test(rawText);
        if (li.querySelector('img')) {
          const liClone = li.cloneNode(true) as HTMLElement;
          const liImgs = Array.from(liClone.querySelectorAll('img'));
          const imgParas: Paragraph[] = [];
          for (const imgEl of liImgs) {
            const imgRuns = parseInlineContent(imgEl, {}, options);
            if (imgRuns.length > 0) {
              imgParas.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 288, before: 80, after: 80 },
                  children: imgRuns,
                })
              );
            }
            imgEl.remove();
          }
          const textRuns = parseInlineContent(liClone, {}, options);
          if (textRuns.length > 0) {
            if (isOrderedList && !hasExplicitNumber && !isSectionItem && !isChoiceItem) {
              textRuns.unshift(...createTextRunsWithMathFont(`${ordNum}. `, { bold: true }));
            }
            result.push(
              new Paragraph({
                bullet: (isOrderedList || isQuestionItem || isChoiceItem || isSectionItem) ? undefined : { level: 0 },
                spacing: { line: 288, after: (isQuestionItem || isOrderedList) ? 80 : 60 },
                children: textRuns,
              })
            );
          }
          result.push(...imgParas);
          continue;
        }

        const runs = parseInlineContent(li, {}, options);
        if (runs.length === 0) continue;

        if (isOrderedList && !hasExplicitNumber && !isSectionItem && !isChoiceItem) {
          runs.unshift(...createTextRunsWithMathFont(`${ordNum}. `, { bold: true }));
        }

        result.push(
          new Paragraph({
            bullet: (isOrderedList || isQuestionItem || isChoiceItem || isSectionItem) ? undefined : { level: 0 },
            spacing: { line: 288, after: (isQuestionItem || isOrderedList) ? 80 : 60 },
            children: runs,
          })
        );
      }
      return;
    }

    // 5. Paragraphs (<P>) or Question stem containers (ONLY if leaf node without block children)
    const hasBlockChildren = Array.from(el.children).some((c) =>
      /^(DIV|P|TABLE|UL|OL|H[1-6]|HR)$/i.test(c.tagName)
    );

    // Check if this container is a Multiple Choice Options grid or True/False block (2-4 child option elements)
    const blockChoiceChildren = Array.from(el.children).filter(c => /^(DIV|P|LI)$/i.test(c.tagName));
    if (blockChoiceChildren.length >= 2 && blockChoiceChildren.length <= 4) {
      const childTexts = blockChoiceChildren.map(c => stripInternalTags(getNodeLatexOrText(c)).trim());
      const parsedBlockChoices = childTexts.map(t => matchChoiceOptionText(t));
      const isGridChoice = parsedBlockChoices.every((p, i) => p !== null && p.letter === String.fromCharCode(65 + i));
      if (isGridChoice) {
        const optsList = blockChoiceChildren.map((c, i) => {
          const parsed = parsedBlockChoices[i]!;
          const label = `${parsed.letter}.`;
          if (c.querySelector('img')) {
            return { label, node: c };
          }
          return { label, text: parsed.body };
        });
        result.push(buildInvisibleChoiceTable(optsList, options));
        return;
      }

      const isGridTf = childTexts.every((t, i) => {
        const expectedLetter = String.fromCharCode(97 + i);
        return new RegExp(`^\\s*(?:[-*]\\s*)?(?:\\*{0,2})[${expectedLetter}][\\.\\:\\)]`).test(t);
      });
      if (isGridTf) {
        const stmts = blockChoiceChildren.map((c, i) => {
          const label = `${String.fromCharCode(97 + i)})`;
          return { label, node: c };
        });
        result.push(...buildTrueFalseParagraphs(stmts, options));
        return;
      }
    }

    if (tagName === 'P' || (tagName === 'DIV' && !hasBlockChildren)) {
      const splitNodesByBr = (container: HTMLElement): Node[][] => {
        const lines: Node[][] = [[]];
        const childArr = Array.from(container.childNodes);
        const isPreLine =
          container.classList.contains('whitespace-pre-line') ||
          !!container.closest('.whitespace-pre-line, .export-solution-block');
        const NEW_BLOCK_HEAD_RE = /^\s*(?:\*{0,2}(?:Câu|Bài)\s+\d+\s*[:.]|PHẦN\s+(?:I{1,3}|IV|[1-4])\b|[a-d]\)\s*(?:Đúng|Sai|\*{0,2}[A-ZÀ-Ỹ])|(?:UBND\b|SỞ\s+GIÁO\s+DỤC|PHÒNG\s+GIÁO\s+DỤC|TRƯỜNG\s+|ĐỀ\s+(?:THAM\s+KHẢO|KIỂM\s+TRA|THI|CHÍNH\s+THỨC)|\(Đề\s+thi\s+gồm|[Kk][ÌìỲỳ]\s+THI\b|CẤP\s+(?:THÀNH\s+PHỐ|TỈNH|HUYỆN|QUẬN|TRƯỜNG)|NĂM\s+HỌC\b|[Mm]ôn\s*thi\s*:|[Tt]hời\s*gian\s*:|[-–—]{2,}\s*HẾT|[Hh]ọ\s+và\s+tên\s+thí\s+sinh\s*:))/;

        for (let idx = 0; idx < childArr.length; idx++) {
          const child = childArr[idx];
          if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toUpperCase() === 'BR') {
            lines.push([]);
            continue;
          }
          if (child.nodeType === Node.TEXT_NODE && (child.textContent || '').includes('\n')) {
            const segs = (child.textContent || '').split('\n');
            for (let sIdx = 0; sIdx < segs.length; sIdx++) {
              const seg = segs[sIdx];
              if (sIdx > 0) {
                const prevTail = segs[sIdx - 1] || (sIdx === 1 && idx > 0 ? (childArr[idx - 1]?.textContent || '') : '');
                const isPrepositionRef = /(?:^|\s)(?:từ|theo|ở|tại|xem|như|của|trong|với|sau|trước|giống)\s*$/i.test(prevTail);
                const nextSiblingText = sIdx === segs.length - 1 ? (childArr[idx + 1]?.textContent || '') : '';
                const candidateHead = seg.trim() ? seg : nextSiblingText;
                if (!isPrepositionRef && (isPreLine || NEW_BLOCK_HEAD_RE.test(candidateHead))) {
                  lines.push([]);
                } else {
                  lines[lines.length - 1].push(document.createTextNode(' '));
                }
              }
              if (seg) {
                lines[lines.length - 1].push(document.createTextNode(seg));
              }
            }
            continue;
          }
          lines[lines.length - 1].push(child);
        }
        return lines.filter(group =>
          group.some(
            n =>
              (n.textContent || '').trim() !== '' ||
              (n.nodeType === Node.ELEMENT_NODE &&
                ((n as HTMLElement).matches?.('img, .omml-math-node') ||
                  !!(n as HTMLElement).querySelector?.('img, .omml-math-node')))
          )
        );
      };

      const hasImgs = !!el.querySelector('img');
      if (hasImgs) {
        const rawText = stripInternalTags(getNodeLatexOrText(el));
        if (rawText) {
          const textRuns = parseInlineChildSequence(
            Array.from(el.childNodes).filter(
              c =>
                !(
                  c.nodeType === Node.ELEMENT_NODE &&
                  ((c as HTMLElement).tagName.toUpperCase() === 'IMG' || !!(c as HTMLElement).querySelector?.('img'))
                )
            ),
            {},
            options
          );
          if (textRuns.length > 0) {
            result.push(
              new Paragraph({
                spacing: { line: 288, after: 80 },
                children: textRuns,
              })
            );
          }
        }
        const stemImgs = Array.from(el.querySelectorAll('img'));
        for (const imgEl of stemImgs) {
          const imgRuns = parseInlineContent(imgEl, {}, options);
          if (imgRuns.length > 0) {
            result.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 288, before: 100, after: 100 },
                children: imgRuns,
              })
            );
          }
        }
        return;
      }

      const lineGroups = splitNodesByBr(el);

      // Process each <br>-separated line inside P / DIV without merging consecutive lines or dropping <strong>/<em>
      for (let liIdx = 0; liIdx < lineGroups.length; liIdx++) {
        const groupNodes = lineGroups[liIdx];
        const rawText = stripInternalTags(getNodesLatexOrText(groupNodes));
        if (!rawText || (rawText.length < 6 && /^[.,:;?!]+$/.test(rawText))) continue;

        // Check 4 consecutive lines inside same DIV/P for A. B. C. D.
        if (liIdx + 3 < lineGroups.length && /^\s*(?:[-*]\s*)?(?:\*{0,2})A[\.\)]/.test(rawText)) {
          const tB = stripInternalTags(getNodesLatexOrText(lineGroups[liIdx + 1])).trim();
          const tC = stripInternalTags(getNodesLatexOrText(lineGroups[liIdx + 2])).trim();
          const tD = stripInternalTags(getNodesLatexOrText(lineGroups[liIdx + 3])).trim();
          if (
            /^\s*(?:[-*]\s*)?(?:\*{0,2})B[\.\)]/.test(tB) &&
            /^\s*(?:[-*]\s*)?(?:\*{0,2})C[\.\)]/.test(tC) &&
            /^\s*(?:[-*]\s*)?(?:\*{0,2})D[\.\)]/.test(tD)
          ) {
            result.push(
              buildInvisibleChoiceTable(
                [
                  { label: 'A.', text: rawText.replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s*/, '').trim() },
                  { label: 'B.', text: tB.replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s*/, '').trim() },
                  { label: 'C.', text: tC.replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})C[\.\)](?:\*{0,2})\s*/, '').trim() },
                  { label: 'D.', text: tD.replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})D[\.\)](?:\*{0,2})\s*/, '').trim() },
                ],
                options
              )
            );
            liIdx += 3;
            continue;
          }
        }

        // Check embedded multiple-choice A. ... B. ... C. ... D. ... inside single line
        const mcRegex = /^(.*?)\s*(?:[-*]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})(?<![a-zA-Z0-9_\$\\\(])C[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})(?<![a-zA-Z0-9_\$\\\(])D[\.\)](?:\*{0,2})\s+([\s\S]*)$/;
        const mcMatch = rawText.match(mcRegex);
        if (mcMatch && !/\([^)]*A\.[^)]*B\.[^)]*\)/.test(rawText)) {
          const stemText = stripInternalTags(mcMatch[1].trim());
          const optA = mcMatch[2].trim();
          const optB = mcMatch[3].trim();
          const optC = mcMatch[4].trim();
          const optD = mcMatch[5].trim();

          if (stemText) {
            result.push(
              new Paragraph({
                spacing: { line: 288, after: 80 },
                children: parseTextWithMath(stemText, {}, options),
              })
            );
          }

          let nextSib = el.nextElementSibling;
          while (nextSib && nextSib.tagName === 'P' && !nextSib.textContent?.trim()) {
            nextSib = nextSib.nextElementSibling;
          }
          const nextIsChoiceContainer =
            nextSib &&
            (nextSib.tagName === 'UL' ||
              nextSib.tagName === 'OL' ||
              nextSib.classList.contains('question-choices') ||
              nextSib.classList.contains('choices-grid') ||
              nextSib.classList.contains('options-table'));

          if (!nextIsChoiceContainer || liIdx < lineGroups.length - 1) {
            result.push(
              buildInvisibleChoiceTable(
                [
                  { label: 'A.', text: optA },
                  { label: 'B.', text: optB },
                  { label: 'C.', text: optC },
                  { label: 'D.', text: optD },
                ],
                options
              )
            );
          }
          continue;
        }

        const inSolutionBlock = !!el.closest('.export-solution-block');

        // Check embedded True/False statements a) ... b) ... c) ... d) ... inside single line
        const tfRegex = /^(.*?)\s*(?:[-*]\s*)?(?:\*{0,2})a[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})b[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})(?<![a-zA-Z0-9_\$\\\(])c[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})(?<![a-zA-Z0-9_\$\\\(])d[\.\)](?:\*{0,2})\s+([\s\S]*)$/;
        const tfMatch = !inSolutionBlock ? rawText.match(tfRegex) : null;
        if (tfMatch && !/Mục\s*tiêu|Nội\s*dung|Sản\s*phẩm|Tổ\s*chức/i.test(rawText)) {
          const stemText = stripInternalTags(tfMatch[1].trim());
          if (stemText) {
            result.push(
              new Paragraph({
                spacing: { line: 288, after: 80 },
                children: parseTextWithMath(stemText, {}, options),
              })
            );
          }
          result.push(
            ...buildTrueFalseParagraphs(
              [
                { label: 'a)', text: tfMatch[2].trim() },
                { label: 'b)', text: tfMatch[3].trim() },
                { label: 'c)', text: tfMatch[4].trim() },
                { label: 'd)', text: tfMatch[5].trim() },
              ],
              options
            )
          );
          continue;
        }

        // Check individual True/False statement (starts with lowercase a), b), c), d)) - NOT activity subheaders (a) Mục tiêu:) and NOT inside solution blocks where essay sub-parts a), b) have multi-line steps at margin 0
        const singleTfMatch = !inSolutionBlock ? rawText.match(/^\s*(?:\*{0,2})([a-d])\)[\.\:]?(?:\*{0,2})\s+([\s\S]*)$/) : null;
        if (singleTfMatch && !/^(?:Mục\s*tiêu|Nội\s*dung|Sản\s*phẩm|Tổ\s*chức\s*thực\s*hiện|Kỹ\s*năng|Nhận\s*diện)\s*:/i.test(singleTfMatch[2])) {
          const label = `${singleTfMatch[1].toLowerCase()})`;
          const stmtText = singleTfMatch[2];
          result.push(
            ...buildTrueFalseParagraphs([{ label, text: stmtText }], options)
          );
          continue;
        }

        // Default paragraph rendering preserving inline HTML (<strong>, <em>, <u>, <sup>, <sub>, OMML math)
        const runs = parseInlineChildSequence(groupNodes, {}, options);
        if (runs.length > 0) {
          result.push(
            new Paragraph({
              spacing: { line: 288, after: 80 },
              children: runs,
            })
          );
        }
      }
      return;
    }

    const childNodes = Array.from(el.childNodes);
    const isBlockChildNode = (n: Node): boolean => {
      if (n.nodeType !== Node.ELEMENT_NODE) return false;
      const t = (n as HTMLElement).tagName.toUpperCase();
      return /^(DIV|P|TABLE|UL|OL|H[1-6]|HR|IMG)$/.test(t);
    };
    const inlinePending: Node[] = [];
    const flushInlinePending = () => {
      if (inlinePending.length === 0) return;
      const meaningful = inlinePending.some(
        (n) =>
          (n.textContent || '').trim() !== '' ||
          (n.nodeType === Node.ELEMENT_NODE &&
            (isInlineMathElement(n) || !!(n as HTMLElement).querySelector?.('img, .omml-math-node')))
      );
      if (meaningful) {
        const runs = parseInlineChildSequence(inlinePending, {}, options);
        if (runs.length > 0) {
          result.push(
            new Paragraph({
              spacing: { line: 288, after: 80 },
              children: runs,
            })
          );
        }
      }
      inlinePending.length = 0;
    };

    for (let i = 0; i < childNodes.length; i++) {
      const cn = childNodes[i];
      if (!isBlockChildNode(cn)) {
        inlinePending.push(cn);
        continue;
      }
      flushInlinePending();
      const cluster = tryExtractChoiceCluster(childNodes, i, options);
      if (cluster) {
        result.push(...cluster.items);
        i += cluster.consumed - 1;
        continue;
      }
      await processNode(cn);
    }
    flushInlinePending();
  }

  const rootChildren = Array.from(root.childNodes);
  for (let i = 0; i < rootChildren.length; i++) {
    const cluster = tryExtractChoiceCluster(rootChildren, i, options);
    if (cluster) {
      result.push(...cluster.items);
      i += cluster.consumed - 1;
      continue;
    }
    await processNode(rootChildren[i]);
  }

  return result;
}

/**
 * Main export function for converting rendered DOM content to high-fidelity Word .docx files.
 */
export async function exportHtmlToWord(
  element: HTMLElement,
  filename: string,
  mathFormat: 'omml' | 'mathtype' | 'mathml' | 'latex' | 'image' | boolean = 'omml',
  skipDownload: boolean = false
) {
  let resolvedMathFormat: 'omml' | 'mathtype' | 'image' = 'omml';
  if (mathFormat === 'image') resolvedMathFormat = 'image';
  else if (mathFormat === 'mathtype' || mathFormat === true || mathFormat === 'latex') resolvedMathFormat = 'mathtype';
  else resolvedMathFormat = 'omml';

  const isMathTypeMode = resolvedMathFormat === 'mathtype';
  let loadingOverlay = document.getElementById('word-export-loading');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'word-export-loading';
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.width = '100vw';
    loadingOverlay.style.height = '100vh';
    loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
    loadingOverlay.style.zIndex = '999999';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.flexDirection = 'column';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.justifyContent = 'center';
    document.body.appendChild(loadingOverlay);
  }
  loadingOverlay.innerHTML = `
    <div style="width: 52px; height: 52px; border: 4px solid ${isMathTypeMode ? '#4f46e5' : '#10b981'}; border-bottom-color: transparent; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite;"></div>
    <style>@keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    <h2 style="margin-top: 20px; color: #0f172a; font-family: 'Times New Roman', serif; font-size: 18px; font-weight: bold;">Đang xử lý xuất file Word (.docx)...</h2>
    <p style="color: #475569; font-family: sans-serif; font-size: 14px; margin-top: 6px;">${
      isMathTypeMode
        ? 'Đang chuẩn hóa công thức LaTeX tương thích Word MathType và dàn trang...'
        : 'Đang biên dịch công thức toán sang chuẩn Equation (OMML) và dàn trang...'
    }</p>
  `;
  loadingOverlay.style.display = 'flex';

  // Yield briefly so browser paints the loading overlay cleanly before heavy processing starts
  await yieldToMain(25);

  activeOmmlXmlCache = new Map<string, string>();
  activeMathmlOmmlCache = new Map<string, string>();
  activeNormalizeCache = new Map<string, string>();

  // Đồng bộ tiến trình Xuất file Word với MathJax Typeset & gắn data-latex lên mọi mjx-container
  if (typeof window !== 'undefined' && (window as any).MathJax) {
    const mj = (window as any).MathJax;
    if (mj.typesetPromise) {
      try {
        await withTimeout(mj.typesetPromise([element]), 8000, 'MathJax typeset');
      } catch (e) {
        console.warn('MathJax typesetting error before exportHtmlToWord:', e);
      }
      await yieldToMain();
    }
    try {
      const mathList = mj.startup?.document?.math;
      if (mathList) {
        for (const item of mathList) {
          if (item && item.typesetRoot && typeof item.math === 'string') {
            const hasErr = !!item.typesetRoot.querySelector('mjx-merror, merror') || /You can't use 'macro parameter character #'/i.test(item.typesetRoot.textContent || '');
            if (!hasErr) {
              item.typesetRoot.setAttribute('data-latex', item.math);
              item.typesetRoot.setAttribute('data-block', item.display ? '1' : '0');
            } else {
              item.typesetRoot.setAttribute('data-mjx-error', '1');
              item.typesetRoot.setAttribute('data-raw-math', item.math);
            }
          }
        }
      }
    } catch (e) {}
  }

  try {
    const clone = element.cloneNode(true) as HTMLElement;

    // Preserve natural image dimensions & resolved src from live DOM onto detached clone
    const srcImgs = Array.from(element.querySelectorAll('img'));
    const cloneImgs = Array.from(clone.querySelectorAll('img'));
    cloneImgs.forEach((clonedImg, idx) => {
      const srcImg = srcImgs[idx];
      if (!srcImg) return;
      if (!clonedImg.getAttribute('src') && (srcImg.currentSrc || srcImg.src)) {
        clonedImg.src = srcImg.currentSrc || srcImg.src;
      }
      if (!clonedImg.getAttribute('data-width') && srcImg.naturalWidth > 0) {
        clonedImg.setAttribute('data-width', String(srcImg.naturalWidth));
      }
      if (!clonedImg.getAttribute('data-height') && srcImg.naturalHeight > 0) {
        clonedImg.setAttribute('data-height', String(srcImg.naturalHeight));
      }
    });

    // Convert form controls (input, textarea, select) to text spans to preserve all user data
    const srcControls = Array.from(element.querySelectorAll('input, textarea, select'));
    const cloneControls = Array.from(clone.querySelectorAll('input, textarea, select'));
    cloneControls.forEach((clonedCtrl, idx) => {
      const src = srcControls[idx] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | undefined;
      let val = '';
      if (src) {
        if (src.tagName === 'SELECT') {
          const sel = src as HTMLSelectElement;
          val = sel.options[sel.selectedIndex]?.text || sel.value || '';
        } else {
          val = (src as HTMLInputElement | HTMLTextAreaElement).value ?? src.getAttribute('value') ?? '';
        }
      } else {
        if (clonedCtrl.tagName === 'SELECT') {
          const sel = clonedCtrl as HTMLSelectElement;
          val = sel.options[sel.selectedIndex]?.text || sel.value || '';
        } else {
          val = (clonedCtrl as HTMLInputElement | HTMLTextAreaElement).value ?? clonedCtrl.getAttribute('value') ?? '';
        }
      }

      const span = document.createElement('span');
      span.textContent = val || '';
      if (clonedCtrl.classList.contains('text-center') || (clonedCtrl as HTMLElement).style.textAlign === 'center') {
        span.style.textAlign = 'center';
        span.style.display = 'inline-block';
        span.style.width = '100%';
      }
      if (clonedCtrl.classList.contains('font-bold') || (clonedCtrl as HTMLElement).style.fontWeight === 'bold') {
        span.style.fontWeight = 'bold';
      }
      clonedCtrl.parentNode?.replaceChild(span, clonedCtrl);
    });

    // Remove print-hidden elements, action buttons, and decorative UI Lucide icons
    clone.querySelectorAll('.no-print, button, [role="button"], svg.lucide').forEach(el => el.remove());

    // Ensure all print-only and export-solution-block elements are visible during export
    clone.querySelectorAll('.print-only, .only-print, .export-solution-block, .docx-page-break').forEach(el => {
      (el as HTMLElement).style.display = 'block';
      el.classList.remove('print-only', 'only-print', 'hidden');
    });

    // Ensure all details elements (like solution boxes) are opened and visible during export
    clone.querySelectorAll('details').forEach(details => {
      details.setAttribute('open', 'true');
      (details as HTMLElement).style.display = 'block';
    });

    // 0.0 Ensure Question Numbers (Câu 1:, Câu 2:...) and True/False items (a), b)...) in worksheets and exams
    // are merged with question prompt so they are strictly preserved as bold lead-ins in Word export
    // Never merge into an image wrapper div (e.g. CustomImageRenderer) or when inline text already follows firstChild
    const findTextContentContainer = (parentEl: Element, firstChild: Element): Element | null => {
      const hasDirectFollowingText = Array.from(parentEl.childNodes).some(
        (cn) => cn !== firstChild && cn.nodeType === Node.TEXT_NODE && (cn.textContent || '').trim().length > 0
      );
      if (hasDirectFollowingText) return null;
      const candidates = Array.from(parentEl.querySelectorAll('.math-view-container, div, p'));
      for (const cand of candidates) {
        if (cand === firstChild || cand.contains(firstChild)) continue;
        if (cand.querySelector('img') && !(cand.textContent || '').trim()) continue;
        if ((cand.textContent || '').trim().length > 0) return cand;
      }
      return null;
    };

    clone.querySelectorAll('div, li').forEach(qHeader => {
      const firstChild = qHeader.firstElementChild;
      if (!firstChild) return;
      const firstText = (firstChild.textContent || '').trim();
      const qMatch = firstText.match(/^\s*(?:\*\*)?(?:Câu|Bài|Question|Q)\s*\d+[:\.]?(?:\*\*)?\s*$/i);
      if (qMatch) {
        const qNumText = qMatch[0].replace(/\*+/g, '').trim();
        const mathContainer = findTextContentContainer(qHeader, firstChild);
        if (mathContainer) {
          const targetP = mathContainer.querySelector('p') || mathContainer;
          if (targetP && !targetP.textContent?.trim().startsWith(qNumText)) {
            const strong = document.createElement('strong');
            strong.textContent = qNumText + ' ';
            targetP.prepend(strong);
            firstChild.remove();
          }
        }
      }
    });

    clone.querySelectorAll('div, li').forEach(tfItem => {
      const firstChild = tfItem.firstElementChild;
      if (!firstChild) return;
      const firstText = (firstChild.textContent || '').trim();
      const tfMatch = firstText.match(/^\s*(?:\*\*)?[a-d][\)\.](?:\*\*)?\s*$/i);
      if (tfMatch) {
        const tfLabel = tfMatch[0].replace(/\*+/g, '').trim();
        const contentContainer = findTextContentContainer(tfItem, firstChild);
        if (contentContainer) {
          const targetP = contentContainer.querySelector('p') || contentContainer;
          if (targetP && !targetP.textContent?.trim().startsWith(tfLabel)) {
            const strong = document.createElement('strong');
            strong.textContent = tfLabel + ' ';
            targetP.prepend(strong);
            firstChild.remove();
          }
        }
      }
    });

    // 0.1. PRE-PROCESS ALL MATH ELEMENTS (MathJax & KaTeX) IN CLONE INTO LIGHTWEIGHT OMML TOKENS FIRST
    // This MUST run BEFORE walkAndPreprocessTextNodes and SVG rasterization so internal MathML/SVG nodes are never corrupted!
    const mathContainers = Array.from(
      clone.querySelectorAll('mjx-container, .MathJax, .MathJax_SVG, .mjx-chtml, .katex, .katex-display, .math-inline, [data-latex]')
    );

    for (const mc of mathContainers) {
      if (!mc.parentNode) continue;

      const hasMjxError =
        mc.getAttribute('data-mjx-error') === '1' ||
        !!mc.querySelector('mjx-merror, merror') ||
        /You can't use 'macro parameter character #'/i.test(mc.textContent || '');

      if (hasMjxError) {
        // Giải phóng nội dung lỗi MathJax về văn bản thuần đã làm sạch thay vì nhúng thẻ <merror> vào Word
        const rawBroken = mc.getAttribute('data-raw-math') || mc.getAttribute('data-latex') || mc.textContent || '';
        const cleanedFallback = rawBroken
          .replace(/You can't use 'macro parameter character #' in math mode/gi, '')
          .replace(/^#{1,6}\s*/gm, '')
          .trim();
        mc.parentNode.replaceChild(document.createTextNode(cleanedFallback ? ` $${cleanedFallback}$ ` : ''), mc);
        continue;
      }

      let latex = mc.getAttribute('data-latex') || mc.getAttribute('data-tex') || '';
      if (!latex) {
        const ann = mc.querySelector("annotation[encoding='application/x-tex']") || mc.querySelector("annotation");
        if (ann?.textContent) latex = ann.textContent;
      }

      // Check for MathML inside MathJax assistive-mml or direct <math>
      let mathMlStr = '';
      const mathEl = mc.querySelector('math') || (mc.tagName === 'MATH' ? mc : null);
      if (mathEl) {
        if (!latex) {
          const subAnn = mathEl.querySelector('annotation');
          if (subAnn?.textContent) latex = subAnn.textContent;
        }
        mathMlStr = new XMLSerializer().serializeToString(mathEl);
      }

      const isBlock =
        mc.classList.contains('katex-display') ||
        mc.getAttribute('display') === 'true' ||
        mc.getAttribute('data-block') === '1' ||
        (mc.tagName === 'MJX-CONTAINER' && mc.getAttribute('display') === 'true');

      if (latex || mathMlStr) {
        const token = document.createElement('span');
        token.className = 'omml-math-node';
        if (latex) {
          const finalLatex = isMathTypeMode ? normalizeLatexCommandsForMathType(latex.trim()) : latex.trim();
          token.setAttribute('data-latex', encodeURIComponent(finalLatex));
        }
        if (mathMlStr && (!isMathTypeMode || !latex)) {
          token.setAttribute('data-mathml', encodeURIComponent(mathMlStr.trim()));
        }
        token.setAttribute('data-block', isBlock ? '1' : '0');
        mc.parentNode.replaceChild(token, mc);
      }
    }

    // 0.2. Pre-process naked math environments & AP formulas in DOM text nodes before word translation
    let walkedCount = 0;
    const walkAndPreprocessTextNodes = async (rootNode: Node) => {
      const stack: Node[] = [rootNode];
      while (stack.length > 0) {
        const node = stack.pop()!;
        if (++walkedCount % 60 === 0) {
          await yieldToMain();
        }
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          // Tuyệt đối giữ nguyên text node chỉ chứa khoảng trắng để không làm mất dấu cách sau dấu ':' trước công thức
          if (!text.trim()) continue;
          const parent = node.parentNode;
          if (parent && !['SCRIPT', 'STYLE', 'CODE', 'PRE', 'MATH', 'ANNOTATION', 'SVG'].includes(parent.nodeName.toUpperCase())) {
            const trimmed = text.trim();
            // Không chạy normalizeMathText lên nhãn phương án độc lập (A., B., C., D., a), b)...) hoặc dấu gạch ngang/năm học
            if (
              /^(?:[-*•●]\s*)?(?:\*{0,3})?\(?[A-Da-d]\)?[\.\:\)]?(?:\*{0,3})?$/.test(trimmed) ||
              /^[\s\-–—.,:;!?\/\\•●*()\[\]{}]+$/.test(trimmed) ||
              /^\d{4}\s*[-–—]\s*\d{4}$/.test(trimmed)
            ) {
              continue;
            }
            const hadLeadNl = /^[ \t]*\r?\n/.test(text);
            const hadTrailNl = /\r?\n[ \t]*$/.test(text);
            const hadLeadWs = !hadLeadNl && /^[ \t]+/.test(text);
            const hadTrailWs = !hadTrailNl && /[ \t]+$/.test(text);
            const normalizedOnce = cachedNormalizeAndFixArrows(text);
            // Chỉ chuẩn hóa nhãn phương án A-D đầu dòng (KHÔNG xóa dấu ngoặc mở '(' trong câu văn như (A. 90°, B. 0°))
            const afterLabels = normalizedOnce
              .replace(/(^|\n)[ \t]*(?:[-*•●]\s*)?(?:\*{1,3}|<b>)?(?:\(([A-D])\)|([A-D])[\.\:\)])(?:\*{1,3}|<\/b>)?[ \t]*/g, (_m, p1, g1, g2) => `${p1}${g1 || g2}. `)
              .replace(/(?<=\b[A-D][\.\:\)])\s*\*\*+(?=\s|$)/g, '')
              .replace(/\*\*+(?=[A-D][\.\:\)])/g, '');
            let updated = afterLabels !== normalizedOnce ? fixAndMergeMathArrows(afterLabels) : normalizedOnce;
            if (isMathTypeMode) {
              updated = normalizeLatexForMathType(updated);
            }
            if (hadLeadNl && updated && !/^\r?\n/.test(updated)) updated = '\n' + updated;
            else if (hadLeadWs && updated && !/^\s/.test(updated)) updated = ' ' + updated;
            if (hadTrailNl && updated && !/\r?\n$/.test(updated)) updated = updated + '\n';
            else if (hadTrailWs && updated && !/\s$/.test(updated)) updated = updated + ' ';
            if (updated !== text) {
              node.textContent = updated;
            }
          }
          continue;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toUpperCase();
          if (
            el.classList.contains('katex') ||
            el.classList.contains('omml-math-node') ||
            tag === 'MJX-CONTAINER' ||
            tag === 'MATH' ||
            tag === 'SVG' ||
            tag === 'SVG-WRAPPER' ||
            tag === 'TIKZ-DIAGRAM'
          ) {
            continue;
          }

          // Chỉ tự động bổ sung BBT / Đồ thị cho khối thô chưa qua MarkdownRenderer / Step 0.1 (bỏ qua nếu vùng đã đánh dấu data-no-auto-graph)
          if (
            (el.classList.contains('question-block') || el.classList.contains('question-stem') || el.classList.contains('math-view-container')) &&
            !el.classList.contains('markdown-body') &&
            !el.closest('[data-no-auto-graph="true"]')
          ) {
            const html = el.innerHTML;
            if (
              /(?:bảng\s*biến\s*thiên|bảng\s*xét\s*dấu|đồ\s*thị|hình\s*bên|hình\s*vẽ)/i.test(html) &&
              !html.includes('svg-wrapper') &&
              !html.includes('img') &&
              !html.includes('svg') &&
              !html.includes('omml-math-node') &&
              !html.includes('mjx-container') &&
              !html.includes('katex') &&
              !html.includes('data-latex')
            ) {
              const enriched = autoEnrichTextWithVisuals(html);
              if (enriched !== html) {
                el.innerHTML = enriched;
              }
            }
          }

          const children = Array.from(node.childNodes);
          for (let i = children.length - 1; i >= 0; i--) {
            stack.push(children[i]);
          }
        }
      }
    };
    await walkAndPreprocessTextNodes(clone);

    // 1. Pre-process custom SVG and TikZ wrapper elements in clone into high-res PNG images
    const svgWrappers = Array.from(clone.querySelectorAll('svg-wrapper, .svg-wrapper'));
    for (const wrap of svgWrappers) {
      await yieldToMain();
      try {
        let svgCode = '';
        const base64 = wrap.getAttribute('data-svg') || (wrap as HTMLElement).dataset?.svg;
        if (base64) {
          try {
            svgCode = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
          } catch (e) {}
        }
        if (!svgCode) {
          const innerSvg = wrap.querySelector('svg');
          if (innerSvg) svgCode = new XMLSerializer().serializeToString(innerSvg);
        }
        if (svgCode) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = svgCode.trim();
          const svgEl = tempDiv.querySelector('svg') as SVGSVGElement | null;
          if (svgEl) {
            const { dataUrl, width: imgW, height: imgH } = await svgToPngDataUrl(svgEl);
            if (dataUrl && wrap.parentNode) {
              const img = document.createElement('img');
              img.src = dataUrl;
              img.className = 'diagram bbt-diagram';
              img.setAttribute('width', String(imgW));
              img.setAttribute('height', String(imgH));
              img.setAttribute('data-width', String(imgW));
              img.setAttribute('data-height', String(imgH));
              img.style.maxWidth = '480px';
              img.style.height = 'auto';
              wrap.parentNode.replaceChild(img, wrap);
              continue;
            }
          }
        }
      } catch (e) {
        console.error('Error rasterizing svg-wrapper:', e);
      }
    }

    const tikzWrappers = Array.from(clone.querySelectorAll('tikz-diagram, .tikz-wrapper'));
    for (const wrap of tikzWrappers) {
      await yieldToMain();
      try {
        let svgCode = '';
        const base64 = wrap.getAttribute('data-tikz') || (wrap as HTMLElement).dataset?.tikz;
        if (base64) {
          try {
            const tikzCode = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
            svgCode = getTikzSvg(tikzCode) || '';
          } catch (e) {}
        }
        if (!svgCode) {
          const innerSvg = wrap.querySelector('svg');
          if (innerSvg) svgCode = new XMLSerializer().serializeToString(innerSvg);
        }
        if (svgCode) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = svgCode.trim();
          const svgEl = tempDiv.querySelector('svg') as SVGSVGElement | null;
          if (svgEl) {
            const { dataUrl, width: imgW, height: imgH } = await svgToPngDataUrl(svgEl);
            if (dataUrl && wrap.parentNode) {
              const img = document.createElement('img');
              img.src = dataUrl;
              img.className = 'diagram tikz-diagram';
              img.setAttribute('width', String(imgW));
              img.setAttribute('height', String(imgH));
              img.setAttribute('data-width', String(imgW));
              img.setAttribute('data-height', String(imgH));
              img.style.maxWidth = '480px';
              img.style.height = 'auto';
              wrap.parentNode.replaceChild(img, wrap);
              continue;
            }
          }
        }
      } catch (e) {
        console.error('Error rasterizing tikz-wrapper:', e);
      }
    }

    // 1.1 Convert any remaining standalone SVGs (excluding KaTeX/MathJax glyphs and Lucide/UI button icons) in clone into high-res PNGs
    const clonedSvgs = Array.from(clone.querySelectorAll('svg')).filter((svg) => {
      if (svg.classList.contains('lucide')) return false;
      if (svg.closest('button, .no-print, [data-no-export="true"], .katex, .katex-html, .katex-mathml, math, mjx-container, .MathJax, .MathJax_SVG, .omml-math-node, [data-latex]')) {
        return false;
      }
      return true;
    }) as SVGSVGElement[];

    for (const clonedSvg of clonedSvgs) {
      if (!clonedSvg || !clonedSvg.parentNode) continue;
      try {
        const { dataUrl: pngDataUrl, width: imgW, height: imgH } = await svgToPngDataUrl(clonedSvg);
        if (pngDataUrl) {
          const img = document.createElement('img');
          img.src = pngDataUrl;
          img.className = 'diagram bbt-diagram';
          img.setAttribute('width', String(imgW));
          img.setAttribute('height', String(imgH));
          img.setAttribute('data-width', String(imgW));
          img.setAttribute('data-height', String(imgH));
          img.style.maxWidth = '480px';
          img.style.height = 'auto';

          const wrapper = clonedSvg.closest('.tikz-wrapper, .svg-wrapper');
          if (wrapper && wrapper.parentNode) {
            wrapper.parentNode.replaceChild(img, wrapper);
          } else {
            clonedSvg.parentNode.replaceChild(img, clonedSvg);
          }
        }
      } catch (e) {
        console.error('SVG to PNG conversion error:', e);
      }
      await yieldToMain();
    }

    // 1.2 Scan for any raw TikZ code blocks or BBT tables in clone text nodes that weren't converted
    const pendingVisualConversions: Promise<void>[] = [];
    const convertRawVisualElementsInDom = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const txt = node.textContent || '';
        if (/\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\}/i.test(txt)) {
          const match = txt.match(/(\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\})/i);
          if (match && node.parentNode) {
            const svg = getTikzSvg(match[1]);
            if (svg) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = svg;
              const svgEl = tempDiv.querySelector('svg');
              if (svgEl) {
                pendingVisualConversions.push(
                  svgToPngDataUrl(svgEl)
                    .then(({ dataUrl, width, height }) => {
                      const img = document.createElement('img');
                      img.src = dataUrl;
                      img.setAttribute('width', String(width));
                      img.setAttribute('height', String(height));
                      img.style.maxWidth = '480px';
                      img.style.height = 'auto';
                      node.parentNode?.replaceChild(img, node);
                    })
                    .catch(() => {})
                );
              }
            }
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'TABLE' && !el.classList.contains('borderless')) {
          const text = el.textContent || '';
          if (/(?:y'|f'\(x\)|\\searrow|\\nearrow)/i.test(text) && /\b(?:x|y)\b/i.test(text)) {
            // This is a BBT table! Convert it to a vector BBT SVG -> PNG image
            const rows = Array.from(el.querySelectorAll('tr')).map(tr => {
              const cells = Array.from(tr.querySelectorAll('th, td')).map(td => td.textContent?.trim() || '');
              return `| ${cells.join(' | ')} |`;
            });
            if (rows.length >= 2) {
              const tableMd = rows.join('\n');
              const svg = convertBbtTableToSvg(tableMd);
              if (svg && el.parentNode) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = svg;
                const svgEl = tempDiv.querySelector('svg');
                if (svgEl) {
                  pendingVisualConversions.push(
                    svgToPngDataUrl(svgEl)
                      .then(({ dataUrl, width, height }) => {
                        const img = document.createElement('img');
                        img.src = dataUrl;
                        img.className = 'diagram bbt-diagram';
                        img.setAttribute('width', String(width));
                        img.setAttribute('height', String(height));
                        img.style.maxWidth = '480px';
                        img.style.height = 'auto';
                        el.parentNode?.replaceChild(img, el);
                      })
                      .catch(() => {})
                  );
                }
              }
            }
          }
        } else {
          Array.from(node.childNodes).forEach(convertRawVisualElementsInDom);
        }
      }
    };
    convertRawVisualElementsInDom(clone);
    if (pendingVisualConversions.length > 0) {
      await Promise.all(pendingVisualConversions);
    }

    // 2. Pre-process remote/relative/blob/non-PNG-JPEG images to standard PNG data URLs
    const standardImgs = Array.from(clone.querySelectorAll('img'));
    for (let i = 0; i < standardImgs.length; i++) {
      const img = standardImgs[i];
      if (!img.src) continue;
      if (/^data:image\/(?:png|jpe?g);base64,/i.test(img.src)) continue;

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const originalImg = new Image();
        if (!img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
          originalImg.crossOrigin = 'Anonymous';
        }

        const base64Data = await withTimeout(
          new Promise<string>((resolve, reject) => {
            originalImg.onload = () => {
              canvas.width = originalImg.naturalWidth || originalImg.width || 300;
              canvas.height = originalImg.naturalHeight || originalImg.height || 150;
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(originalImg, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            };
            originalImg.onerror = () => reject(new Error('Failed to load image'));
            originalImg.src = img.src;
          }),
          4000,
          'Image rasterization'
        );

        img.src = base64Data;
      } catch (e) {
        if (img.src.startsWith('blob:') && typeof fetch === 'function' && typeof FileReader !== 'undefined') {
          try {
            const resp = await fetch(img.src);
            const blob = await resp.blob();
            const fallbackUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result || ''));
              reader.onerror = () => reject(new Error('FileReader failed'));
              reader.readAsDataURL(blob);
            });
            if (fallbackUrl.startsWith('data:image/')) {
              img.src = fallbackUrl;
              continue;
            }
          } catch {}
        }
        console.error('Image rasterization error:', e);
      }
    }

    // 2.5 Pre-process KaTeX elements in clone into lightweight OMML tokens
    // Xử lý các khối display math (.katex-display) trước, sau đó xử lý inline (.katex)
    const displayNodes = Array.from(clone.querySelectorAll('.katex-display'));
    for (const kn of displayNodes) {
      if (!kn.parentNode) continue;
      const ann = kn.querySelector("annotation[encoding='application/x-tex']") || kn.querySelector("annotation");
      let latex = ann?.textContent || kn.getAttribute('data-tex') || kn.getAttribute('data-latex') || '';
      if (!latex) {
        const mathEl = kn.querySelector('math');
        if (mathEl) {
          const subAnn = mathEl.querySelector('annotation');
          if (subAnn?.textContent) latex = subAnn.textContent;
        }
      }
      if (latex) {
        const token = document.createElement('span');
        token.className = 'omml-math-node';
        token.setAttribute('data-latex', encodeURIComponent(latex.trim()));
        token.setAttribute('data-block', '1');
        kn.parentNode.replaceChild(token, kn);
      } else {
        kn.remove();
      }
    }

    const inlineNodes = Array.from(clone.querySelectorAll('.katex'));
    for (const kn of inlineNodes) {
      if (!kn.parentNode) continue;
      const ann = kn.querySelector("annotation[encoding='application/x-tex']") || kn.querySelector("annotation");
      let latex = ann?.textContent || kn.getAttribute('data-tex') || kn.getAttribute('data-latex') || '';
      if (!latex) {
        const mathEl = kn.querySelector('math');
        if (mathEl) {
          const subAnn = mathEl.querySelector('annotation');
          if (subAnn?.textContent) latex = subAnn.textContent;
        }
      }
      if (latex) {
        const token = document.createElement('span');
        token.className = 'omml-math-node';
        token.setAttribute('data-latex', encodeURIComponent(latex.trim()));
        token.setAttribute('data-block', '0');
        kn.parentNode.replaceChild(token, kn);
      } else {
        kn.remove();
      }
    }

    // Triệt tiêu mọi tàn dư của MathML / KaTeX HTML
    const strayKatex = Array.from(clone.querySelectorAll('.katex-mathml, .katex-html, math, semantics'));
    for (const sk of strayKatex) {
      sk.remove();
    }

    // 3. Build docx children from the DOM tree
    const docxChildren = await parseDomToDocxChildren(clone, { mathFormat: resolvedMathFormat });

    // Check if the document contains wide tables (such as Matrix or Spec tables with >= 8 columns)
    const hasWideTable = Array.from(clone.querySelectorAll('table')).some(tbl => {
      const rows = Array.from(tbl.querySelectorAll('tr'));
      return rows.some(r => r.querySelectorAll('th, td').length >= 8);
    });

    const isMatrixOrSpecDoc =
      hasWideTable ||
      /ma_tran|ban_dac_ta|matrix|spec|vinh_loc|dac_ta/i.test(filename) ||
      clone.querySelector('#competency-matrix-export-wrap, #matrix-table-wrap, #spec-table-wrap, #pedagogical-matrix-export-doc, #pedagogical-inline-full-export, #pedagogical-inline-only-export, #pedagogical-inline-spec-only-export, .matrix-table') !== null;

    const pageProperties = isMatrixOrSpecDoc
      ? {
          page: {
            size: {
              width: 16838, // A4 landscape width (297mm)
              height: 11906, // A4 landscape height (210mm)
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: convertMillimetersToTwip(12), // 1.2cm
              bottom: convertMillimetersToTwip(12), // 1.2cm
              left: convertMillimetersToTwip(12), // 1.2cm
              right: convertMillimetersToTwip(12), // 1.2cm
            },
          },
        }
      : {
          page: {
            size: {
              width: 11906, // A4 portrait width (210mm)
              height: 16838, // A4 portrait height (297mm)
            },
            margin: {
              top: convertMillimetersToTwip(20), // 2cm
              bottom: convertMillimetersToTwip(20), // 2cm
              left: convertMillimetersToTwip(25), // 2.5cm
              right: convertMillimetersToTwip(20), // 2cm
            },
          },
        };

    // 4. Create Word Document with exact A4 page layout & typography specs
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: isMatrixOrSpecDoc ? 20 : 24, // 10pt for matrix/spec, 12pt for regular docs
              color: '000000',
            },
            paragraph: {
              spacing: {
                line: isMatrixOrSpecDoc ? 240 : 288, // tighter for matrix, 1.2 lines for exams
                after: isMatrixOrSpecDoc ? 20 : 80,
              },
            },
          },
        },
      },
      sections: [
        {
          properties: pageProperties,
          children: docxChildren.length > 0 ? docxChildren : [new Paragraph({ text: '' })],
        },
      ],
    });

    // 5. Generate and download genuine .docx file
    await yieldToMain(10);
    const docBlob = await Packer.toBlob(doc);
    await yieldToMain(0);
    const cleanBaseName = filename.replace(/\.(docx?|DOCX?)$/i, '').replace(/[:\\/*?"<>|]+/g, '_');
    const finalFilename = `${cleanBaseName}.docx`;

    if (!skipDownload) {
      if (isMathTypeMode) {
        const arrayBuffer = await docBlob.arrayBuffer();
        if (typeof window !== 'undefined' && window.electronMathType?.isSupported) {
          try {
            const result = await window.electronMathType.convertAndSave(arrayBuffer, finalFilename);
            if (!result?.success) {
              console.warn('Electron MathType convertAndSave returned unsuccessful:', result?.error);
              saveAs(docBlob, finalFilename);
              showMathTypeGuideModal();
            }
          } catch (bridgeErr) {
            console.error('Electron MathType bridge error, falling back to browser download:', bridgeErr);
            saveAs(docBlob, finalFilename);
            showMathTypeGuideModal();
          }
        } else {
          saveAs(docBlob, finalFilename);
          showMathTypeGuideModal();
        }
      } else {
        saveAs(docBlob, finalFilename);
      }
    }
    return docBlob;
  } catch (err) {
    console.error('DOCX Export failed:', err);
    return null;
  } finally {
    activeOmmlXmlCache = null;
    activeMathmlOmmlCache = null;
    activeNormalizeCache = null;
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }
}

/**
 * Generates a Word .docx Blob directly from an HTML element without triggering browser download
 */
export async function generateDocxBlobFromElement(
  element: HTMLElement,
  mathFormat: 'omml' | 'mathtype' | 'image' = 'omml'
): Promise<Blob | null> {
  try {
    const docBlob = await exportHtmlToWord(element, 'temp_drive_file.docx', mathFormat, true);
    return docBlob;
  } catch (e) {
    console.error('Lỗi tạo Word Blob cho Google Drive:', e);
    return null;
  }
}

/**
 * Chụp ảnh element hiển thị (Poster/Infographic/Worksheet) xuất ra file PNG chất lượng cao (2x scale)
 */
export async function exportElementToImage(
  element: HTMLElement | null,
  filename: string = "Poster_PhieuHocTap.png"
): Promise<void> {
  if (!element) return;

  // Đồng bộ tiến trình Xuất ảnh với MathJax Typeset
  if (typeof window !== 'undefined' && (window as any).MathJax && (window as any).MathJax.typesetPromise) {
    try {
      await (window as any).MathJax.typesetPromise();
    } catch (e) {
      console.warn('MathJax typesetting error before exportElementToImage:', e);
    }
  }

  const clone = element.cloneNode(true) as HTMLElement;
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  const naturalWidth = element.offsetWidth > 850 ? element.offsetWidth : 850;
  container.style.width = `${naturalWidth}px`;
  container.style.background = '#ffffff';

  container.appendChild(clone);
  document.body.appendChild(container);

  // Clean OKLCH and complex modern CSS colors so html2canvas renders without errors
  const cleanColors = (el: HTMLElement) => {
    if (el.nodeType !== Node.ELEMENT_NODE) return;
    const computed = window.getComputedStyle(el);
    const props = [
      'color', 'backgroundColor', 'borderColor', 
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'textDecorationColor', 'outlineColor', 'fill', 'stroke'
    ];
    props.forEach(prop => {
      const val = computed[prop as any];
      if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
        try {
          const cvs = document.createElement('canvas');
          cvs.width = 1; cvs.height = 1;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.fillStyle = val;
            ctx.fillRect(0, 0, 1, 1);
            const d = ctx.getImageData(0, 0, 1, 1).data;
            el.style[prop as any] = `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${d[3] / 255})`;
          }
        } catch (e) {}
      }
    });
    Array.from(el.children).forEach(child => cleanColors(child as HTMLElement));
  };

  try {
    cleanColors(clone);
    const canvas = await html2canvas(clone, {
      scale: 2, // HiDPI 2x scale for sharp posters/text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    canvas.toBlob((blob) => {
      if (blob) {
        const cleanImgName = (filename.endsWith('.png') ? filename : `${filename}.png`).replace(/[:\\/*?"<>|]+/g, '_');
        saveAs(blob, cleanImgName);
      }
    }, 'image/png');
  } catch (err) {
    console.error('Lỗi khi xuất ảnh Poster:', err);
    throw err;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Chuyển đổi nội dung văn bản / đề thi Markdown sang file mã nguồn LaTeX chuẩn (.tex)
 * và tự động kích hoạt tải xuống cho giáo viên.
 */
export function exportToLatexTexFile(
  markdownText: string, 
  filename: string = 'TaiLieu_DaChuyenDoi.tex'
): void {
  if (!markdownText) return;

  let body = markdownText.trim();

  // 1. Chuyển đổi các trang phân đoạn
  body = body.replace(/--- \[[^\]]*\] ---/g, '\n\\newpage\n');

  // 2. Chuyển đổi tiêu đề
  body = body.replace(/^#\s+(.*$)/gm, '\\section*{$1}');
  body = body.replace(/^##\s+(.*$)/gm, '\\subsection*{$1}');
  body = body.replace(/^###\s+(.*$)/gm, '\\subsubsection*{$1}');

  // 3. Chuyển đổi định dạng chữ in đậm và in nghiêng ngoài math
  const mathBlocks: string[] = [];
  body = body.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
    mathBlocks.push(match);
    return `___TEX_MATH_${mathBlocks.length - 1}___`;
  });

  // Chuyển đổi **text** -> \textbf{text}
  body = body.replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}');
  // Chuyển đổi *text* -> \textit{text}
  body = body.replace(/\*([^\*\n]+)\*/g, '\\textit{$1}');

  // Khôi phục math blocks
  body = body.replace(/___TEX_MATH_(\d+)___/g, (_m, idx) => mathBlocks[Number(idx)] || '');

  // 4. Tạo document LaTeX hoàn chỉnh chuẩn Việt Nam
  const texContent = `% =========================================================
% TÀI LIỆU CHUYỂN ĐỔI SỐ HÓA LATEX (ĐỊNH DẠNG CHUẨN VIỆT NAM)
% =========================================================
\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{vietnam}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb,amsfonts,amsbsy}
\\usepackage{graphicx}
\\usepackage{geometry}
\\geometry{a4paper, left=2cm, right=2cm, top=2cm, bottom=2cm}
\\usepackage{multicol}
\\usepackage{array}
\\usepackage{tabularx}
\\usepackage{enumitem}

\\title{Tài liệu Số hóa từ PDF/Ảnh}
\\author{Hệ thống Trợ lý Soạn giảng \\& Đề thi GDPT 2018}
\\date{\\today}

\\begin{document}

${body}

\\end{document}
`;

  // Trigger file download
  const blob = new Blob([texContent], { type: 'text/x-tex;charset=utf-8' });
  if (typeof window !== 'undefined') {
    saveAs(blob, filename.endsWith('.tex') ? filename : `${filename}.tex`);
  }
}

/**
 * Tự động trích xuất và tải về toàn bộ hình ảnh (BBT, Đồ thị, Bảng xét dấu, Hình 3D) 
 * từ vùng hiển thị đề thi/phiếu học tập dưới dạng bộ ảnh PNG HD sắc nét.
 */
export async function downloadAllExamImagesFromElement(
  element: HTMLElement,
  prefix: string = 'Hinh_Anh_De_Thi'
): Promise<number> {
  if (!element) return 0;

  let count = 0;
  const downloadedHashes = new Set<string>();

  // 0. Chuyển đổi các bảng BBT / Bảng xét dấu dạng HTML table sang SVG trước khi trích xuất
  const tables = Array.from(element.querySelectorAll('table'));
  for (const tableEl of tables) {
    if (tableEl.classList.contains('borderless')) continue;
    const text = tableEl.textContent || '';
    if (/(?:y'|f'\(x\)|\\searrow|\\nearrow|\+|\-)/i.test(text) && /\b(?:x|y)\b/i.test(text)) {
      try {
        const rows = Array.from(tableEl.querySelectorAll('tr')).map(tr => {
          const cells = Array.from(tr.querySelectorAll('th, td')).map(td => td.textContent?.trim() || '');
          return `| ${cells.join(' | ')} |`;
        });
        if (rows.length >= 2) {
          const tableMd = rows.join('\n');
          const svgCode = convertBbtTableToSvg(tableMd);
          if (svgCode) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = svgCode.trim();
            const svgEl = tempDiv.querySelector('svg');
            if (svgEl) {
              const { dataUrl } = await svgToPngDataUrl(svgEl);
              if (dataUrl && !downloadedHashes.has(dataUrl.slice(0, 100))) {
                downloadedHashes.add(dataUrl.slice(0, 100));
                count++;
                const link = document.createElement('a');
                link.download = `${prefix}_Cau_${count < 10 ? '0' + count : count}_BangBienThien.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to extract table as BBT SVG:', e);
      }
    }
  }

  // 1. Tải các thẻ svg-wrapper / tikz-wrapper / svg (loại trừ các biểu tượng MathJax/KaTeX nhỏ và icon UI)
  const svgWrappers = Array.from(element.querySelectorAll('svg-wrapper, .svg-wrapper, tikz-diagram, .tikz-wrapper, svg')).filter(el => {
    if (el.classList.contains('lucide')) return false;
    return !el.closest('button, .no-print, [data-no-export="true"], .katex, .katex-html, .katex-mathml, math, mjx-container, .MathJax, .omml-math-node');
  });

  for (let i = 0; i < svgWrappers.length; i++) {
    const wrap = svgWrappers[i];
    let svgCode = '';

    const base64 = wrap.getAttribute('data-svg') || wrap.getAttribute('data-tikz');
    if (base64) {
      try {
        svgCode = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
      } catch (e) {}
    }

    if (!svgCode) {
      const innerSvg = wrap.tagName === 'SVG' ? (wrap as SVGSVGElement) : wrap.querySelector('svg');
      if (innerSvg) {
        svgCode = new XMLSerializer().serializeToString(innerSvg);
      }
    }

    if (svgCode) {
      try {
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.innerHTML = svgCode.trim();
        document.body.appendChild(tempDiv);

        const svgEl = tempDiv.querySelector('svg') as SVGSVGElement | null;
        if (svgEl) {
          const { dataUrl } = await svgToPngDataUrl(svgEl);
          if (dataUrl && !downloadedHashes.has(dataUrl.slice(0, 100))) {
            downloadedHashes.add(dataUrl.slice(0, 100));
            count++;
            const link = document.createElement('a');
            link.download = `${prefix}_Hinh_${count < 10 ? '0' + count : count}_DoThi_BBT.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
        document.body.removeChild(tempDiv);
      } catch (e) {
        console.error('Error downloading SVG image:', e);
      }
    }
  }

  // 2. Trích xuất các khung JSXGraph hoặc Canvas vẽ đồ thị
  const canvases = Array.from(element.querySelectorAll('canvas, .jxgbox'));
  for (const cvs of canvases) {
    try {
      let dataUrl = '';
      if (cvs instanceof HTMLCanvasElement) {
        dataUrl = cvs.toDataURL('image/png');
      } else {
        const renderedCvs = await html2canvas(cvs as HTMLElement, { scale: 2, backgroundColor: '#ffffff' });
        dataUrl = renderedCvs.toDataURL('image/png');
      }

      if (dataUrl && !downloadedHashes.has(dataUrl.slice(0, 100))) {
        downloadedHashes.add(dataUrl.slice(0, 100));
        count++;
        const link = document.createElement('a');
        link.download = `${prefix}_VeDoThi_JSXGraph_${count < 10 ? '0' + count : count}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.warn('Canvas rasterization failed:', e);
    }
  }

  // 3. Tải các thẻ <img> chứa dataUrl hoặc blob
  const imgElements = Array.from(element.querySelectorAll('img')).filter(img => img.src && (img.src.startsWith('data:') || img.src.startsWith('blob:')));
  for (let i = 0; i < imgElements.length; i++) {
    const img = imgElements[i];
    if (!downloadedHashes.has(img.src.slice(0, 100))) {
      downloadedHashes.add(img.src.slice(0, 100));
      count++;
      const link = document.createElement('a');
      link.download = `${prefix}_Anh_${count < 10 ? '0' + count : count}.png`;
      link.href = img.src;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return count;
}




