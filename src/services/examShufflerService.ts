import mammoth from 'mammoth';
import JSZip from 'jszip';
import fileSaver from 'file-saver';
const saveAs = (fileSaver as any)?.saveAs || fileSaver;
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
  Packer,
  ImageRun,
  PageBreak,
  HeadingLevel,
  type ParagraphChild,
} from 'docx';
import katex from 'katex';
import { mml2omml } from 'mathml2omml-plus';
import { ImportedXmlComponent } from 'docx';
import { wrapFractionAndNegativePowers } from '../lib/globalMath';

export type QuestionType = 'mcq' | 'tf' | 'sa' | 'essay';

export interface ShufflerOption {
  id: string;
  label: string; // 'A', 'B', 'C', 'D'
  originalLabel: string;
  text: string;
  isCorrect?: boolean;
  isLocked?: boolean; // If true, this option won't be shuffled (e.g. #D. Cả A, B, C đều đúng)
}

export interface ShufflerTfStatement {
  id: string;
  label: string; // 'a', 'b', 'c', 'd'
  originalLabel: string;
  text: string;
  isCorrect: boolean; // true = Đúng, false = Sai
  isLocked?: boolean;
}

export interface ShufflerQuestion {
  id: string;
  originalIndex: number; // 1-based index in original exam
  type: QuestionType;
  part: 1 | 2 | 3 | 4;
  stem: string;
  options?: ShufflerOption[]; // Part 1
  tfStatements?: ShufflerTfStatement[]; // Part 2
  shortAnswer?: string; // Part 3
  solution?: string; // Part 4 solution / grading rubric
  points?: string; // e.g. "(1,0 điểm)"
  explanation?: string;
  hasImage?: boolean;
  tableWarning?: string;
}

export interface ShufflerExam {
  title?: string;
  school?: string;
  examName?: string;
  subject?: string;
  duration?: string;
  academicYear?: string;
  questions: ShufflerQuestion[];
  imageStore: Record<string, string>; // [[IMG_0]] -> data:image/png;base64,...
  tableWarnings: string[];
  detectedTableCount: number;
  detectedImageCount: number;
  rawHtml?: string;
}

export interface ShuffledExamVariant {
  code: string;
  questions: ShufflerQuestion[];
  answerKeyPart1: Record<number, string>; // qNum -> 'A' | 'B' | 'C' | 'D'
  answerKeyPart2: Record<number, Record<'a' | 'b' | 'c' | 'd', boolean>>; // qNum -> { a: true, b: false... }
  answerKeyPart3: Record<number, string>; // qNum -> "12.5"
  originalMapping: Record<number, number>; // newQNum -> originalQNum
}

export interface ShuffleConfig {
  numCodes: number;
  examCodes: string[];
  codeFormat: 'sequential_3' | 'sequential_4' | 'random_4' | 'custom';
  shuffleQuestionsPart1: boolean;
  shuffleQuestionsPart2: boolean;
  shuffleQuestionsPart3: boolean;
  shuffleQuestionsPart4?: boolean; // Essay shuffle (default false)
  shuffleOptionsPart1: boolean;
  shuffleStatementsPart2: boolean;
  header: {
    school: string;
    examName: string;
    subject: string;
    duration: string;
    note: string;
  };
}

// -------------------------------------------------------------
// HELPER: Simple Seeded PRNG for Deterministic Shuffling
// -------------------------------------------------------------
function createPrng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// -------------------------------------------------------------
// HELPER: Deterministic Fisher-Yates Shuffle with Lock Support
// -------------------------------------------------------------
function shuffleArrayWithLocks<T extends { isLocked?: boolean }>(
  array: T[],
  rng: () => number
): T[] {
  const result = [...array];
  const unlockedIndices: number[] = [];

  for (let i = 0; i < result.length; i++) {
    if (!result[i].isLocked) {
      unlockedIndices.push(i);
    }
  }

  // Fisher-Yates on unlocked elements
  for (let i = unlockedIndices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const idxA = unlockedIndices[i];
    const idxB = unlockedIndices[j];
    const temp = result[idxA];
    result[idxA] = result[idxB];
    result[idxB] = temp;
  }

  return result;
}

function shuffleSimpleArray<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// STEP 1: PARSING DOCX WITH IMAGE TOKENIZATION & ZERO OVERCUTTING
// -------------------------------------------------------------

/**
 * Chuyển đổi mã OMML XML của Microsoft Word (<m:oMath>) sang công thức LaTeX chuẩn.
 * Sử dụng DOM parser đệ quy để xử lý hoàn hảo các thẻ lồng nhau (phân số trong lũy thừa,
 * căn thức lồng số mũ, hàm từng khúc piecewise cases...) mà không bị regex nuốt thẻ.
 */
function ommlNodeToLatex(node: any): string {
  if (!node) return '';
  if (node.nodeType === 3) return node.nodeValue || '';
  if (node.nodeType !== 1) return '';

  const tag = node.localName || node.nodeName.replace(/^.*:/, '');

  switch (tag) {
    case 'root':
    case 'oMathPara':
    case 'oMath':
    case 'deg':
    case 'fName':
    case 'lim':
    case 'sub':
    case 'sup': {
      let res = '';
      for (const child of node.childNodes) {
        res += ommlNodeToLatex(child);
      }
      return res;
    }
    case 'r': { // math run
      let res = '';
      for (const child of node.childNodes) {
        res += ommlNodeToLatex(child);
      }
      return res;
    }
    case 't': { // text
      let txt = node.textContent || '';
      return txt
        .replace(/±/g, ' \\pm ')
        .replace(/×/g, ' \\times ')
        .replace(/÷/g, ' \\div ')
        .replace(/≤/g, ' \\le ')
        .replace(/≥/g, ' \\ge ')
        .replace(/≠/g, ' \\neq ')
        .replace(/∈/g, ' \\in ')
        .replace(/∉/g, ' \\notin ')
        .replace(/⊂/g, ' \\subset ')
        .replace(/∪/g, ' \\cup ')
        .replace(/∩/g, ' \\cap ')
        .replace(/∅/g, ' \\emptyset ')
        .replace(/∞/g, ' \\infty ')
        .replace(/→/g, ' \\rightarrow ')
        .replace(/⇒/g, ' \\Rightarrow ')
        .replace(/⇔/g, ' \\Leftrightarrow ')
        .replace(/π/g, ' \\pi ')
        .replace(/α/g, ' \\alpha ')
        .replace(/β/g, ' \\beta ')
        .replace(/γ/g, ' \\gamma ')
        .replace(/θ/g, ' \\theta ')
        .replace(/Δ/g, ' \\Delta ')
        .replace(/ℝ/g, ' \\mathbb{R} ')
        .replace(/ℤ/g, ' \\mathbb{Z} ')
        .replace(/ℕ/g, ' \\mathbb{N} ')
        .replace(/ℚ/g, ' \\mathbb{Q} ');
    }
    case 'f': { // fraction <m:f> -> \frac{num}{den}
      let num = '';
      let den = '';
      for (const child of node.children) {
        const cTag = child.localName || child.nodeName.replace(/^.*:/, '');
        if (cTag === 'num') num = ommlNodeToLatex(child).trim();
        else if (cTag === 'den') den = ommlNodeToLatex(child).trim();
      }
      return `\\frac{${num}}{${den}}`;
    }
    case 'rad': { // radical <m:rad> -> \sqrt[deg]{base}
      let deg = '';
      let base = '';
      for (const child of node.children) {
        const cTag = child.localName || child.nodeName.replace(/^.*:/, '');
        if (cTag === 'deg') deg = ommlNodeToLatex(child).trim();
        else if (cTag === 'e') base = ommlNodeToLatex(child).trim();
      }
      return deg ? `\\sqrt[${deg}]{${base}}` : `\\sqrt{${base}}`;
    }
    case 'sSup': { // superscript <m:sSup> -> {base}^{sup}
      let base = '';
      let sup = '';
      for (const child of node.children) {
        const cTag = child.localName || child.nodeName.replace(/^.*:/, '');
        if (cTag === 'e') base = ommlNodeToLatex(child).trim();
        else if (cTag === 'sup') sup = ommlNodeToLatex(child).trim();
      }
      // Tự động bổ sung ngoặc tròn cho hàm mũ dạng phân số hoặc số âm: (5/3)^n, (-2)^n
      if ((base.includes('\\frac') || base.includes('/')) && !/^\\left\s*[\(\[]|^[\(\[]/.test(base)) {
        base = `\\left(${base}\\right)`;
      } else if (/^\s*-\s*[0-9a-zA-Z\\]+/.test(base) && !/^\\left\s*[\(\[]|^[\(\[]/.test(base)) {
        base = `\\left(${base}\\right)`;
      }
      return `{${base}}^{${sup}}`;
    }
    case 'sSub': { // subscript <m:sSub> -> {base}_{sub}
      let base = '';
      let sub = '';
      for (const child of node.children) {
        const cTag = child.localName || child.nodeName.replace(/^.*:/, '');
        if (cTag === 'e') base = ommlNodeToLatex(child).trim();
        else if (cTag === 'sub') sub = ommlNodeToLatex(child).trim();
      }
      return `{${base}}_{${sub}}`;
    }
    case 'sSubSup': { // <m:sSubSup> -> {base}_{sub}^{sup}
      let base = '';
      let sub = '';
      let sup = '';
      for (const child of node.children) {
        const cTag = child.localName || child.nodeName.replace(/^.*:/, '');
        if (cTag === 'e') base = ommlNodeToLatex(child).trim();
        else if (cTag === 'sub') sub = ommlNodeToLatex(child).trim();
        else if (cTag === 'sup') sup = ommlNodeToLatex(child).trim();
      }
      if ((base.includes('\\frac') || base.includes('/')) && !/^\\left\s*[\(\[]|^[\(\[]/.test(base)) {
        base = `\\left(${base}\\right)`;
      } else if (/^\s*-\s*[0-9a-zA-Z\\]+/.test(base) && !/^\\left\s*[\(\[]|^[\(\[]/.test(base)) {
        base = `\\left(${base}\\right)`;
      }
      return `{${base}}_{${sub}}^{${sup}}`;
    }
    case 'limLow': { // <m:limLow> -> \lim_{lim}
      let base = '';
      let lim = '';
      for (const child of node.children) {
        const cTag = child.localName || child.nodeName.replace(/^.*:/, '');
        if (cTag === 'e') base = ommlNodeToLatex(child).trim();
        else if (cTag === 'lim') lim = ommlNodeToLatex(child).trim();
      }
      const cleanBase = base.replace(/^\\?lim\b/i, '\\lim');
      return `${cleanBase}_{${lim}}`;
    }
    case 'func': { // <m:func> -> funcName e
      let fName = '';
      let e = '';
      for (const child of node.children) {
        const cTag = child.localName || child.nodeName.replace(/^.*:/, '');
        if (cTag === 'fName') fName = ommlNodeToLatex(child).trim();
        else if (cTag === 'e') e = ommlNodeToLatex(child).trim();
      }
      return `${fName} ${e}`;
    }
    case 'eqArr': { // equation array (hệ phương trình / hàm từng khúc)
      const rows: string[] = [];
      for (const child of node.children) {
        const cTag = child.localName || child.nodeName.replace(/^.*:/, '');
        if (cTag === 'e') {
          rows.push(ommlNodeToLatex(child).trim());
        }
      }
      return rows.join(' \\\\ ');
    }
    case 'm': { // matrix
      const rows: string[] = [];
      for (const mr of node.children) {
        const mrTag = mr.localName || mr.nodeName.replace(/^.*:/, '');
        if (mrTag === 'mr') {
          const cols: string[] = [];
          for (const c of mr.children) {
            cols.push(ommlNodeToLatex(c).trim());
          }
          rows.push(cols.join(' & '));
        }
      }
      return rows.join(' \\\\ ');
    }
    case 'd': { // delimiter <m:d>
      let beg = '(';
      let end = ')';
      const eList: string[] = [];

      for (const child of node.children) {
        const cTag = child.localName || child.nodeName.replace(/^.*:/, '');
        if (cTag === 'dPr') {
          for (const dChild of child.children) {
            const dcTag = dChild.localName || dChild.nodeName.replace(/^.*:/, '');
            if (dcTag === 'begChr') beg = dChild.getAttribute('m:val') ?? dChild.getAttribute('val') ?? '(';
            else if (dcTag === 'endChr') end = dChild.getAttribute('m:val') ?? dChild.getAttribute('val') ?? ')';
          }
        } else if (cTag === 'e') {
          eList.push(ommlNodeToLatex(child).trim());
        }
      }

      // Xử lý hàm số từng khúc piecewise hoặc hệ phương trình có ngoặc nhọn mở nhưng không đóng ngoặc
      if (beg === '{' && (!end || end === '.' || end === '')) {
        return `\\begin{cases} ${eList.join(' \\\\ ')} \\end{cases}`;
      }

      const content = eList.join('; ');
      if (beg === '(' && end === ')') {
        return `\\left( ${content} \\right)`;
      }
      if (beg === '[' && end === ']') {
        return `\\left[ ${content} \\right]`;
      }
      if (beg === '{' && end === '}') {
        return `\\left\\{ ${content} \\right\\}`;
      }
      const l = beg ? (beg === '{' ? '\\{' : beg) : '.';
      const r = end ? (end === '}' ? '\\}' : end) : '.';
      return `\\left${l} ${content} \\right${r}`;
    }
    default: {
      let res = '';
      for (const child of node.childNodes) {
        res += ommlNodeToLatex(child);
      }
      return res;
    }
  }
}

function ommlXmlToLatex(xmlStr: string): string {
  if (!xmlStr) return '';

  // 1. Cố gắng phân tích cú pháp bằng DOMParser (chuẩn xác 100% về cấu trúc cây DOM)
  try {
    let parser: any;
    if (typeof DOMParser !== 'undefined') {
      parser = new DOMParser();
    }
    if (parser) {
      const wrapped = xmlStr.includes('xmlns:m')
        ? xmlStr
        : `<root xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">${xmlStr}</root>`;
      const doc = parser.parseFromString(wrapped, 'text/xml');
      if (!doc.querySelector('parsererror')) {
        const parsed = ommlNodeToLatex(doc.documentElement).trim();
        if (parsed) return parsed.replace(/\s{2,}/g, ' ');
      }
    }
  } catch (_e) {}

  // 2. Fallback regex nếu môi trường không có DOMParser
  let tex = xmlStr;
  tex = tex.replace(/<m:f\b[^>]*>[\s\S]*?<m:num\b[^>]*>([\s\S]*?)<\/m:num>[\s\S]*?<m:den\b[^>]*>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/gi, (_, num, den) => {
    return `\\frac{${ommlXmlToLatex(num).trim()}}{${ommlXmlToLatex(den).trim()}}`;
  });
  tex = tex.replace(/<m:rad\b[^>]*>[\s\S]*?<m:deg\b[^>]*>([\s\S]*?)<\/m:deg>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:rad>/gi, (_, deg, e) => {
    const degStr = ommlXmlToLatex(deg).trim();
    const eStr = ommlXmlToLatex(e).trim();
    return degStr ? `\\sqrt[${degStr}]{${eStr}}` : `\\sqrt{${eStr}}`;
  });
  tex = tex.replace(/<m:limLow\b[^>]*>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:lim\b[^>]*>([\s\S]*?)<\/m:lim>[\s\S]*?<\/m:limLow>/gi, (_, e, lim) => {
    const limStr = ommlXmlToLatex(lim).trim();
    const eStr = ommlXmlToLatex(e).trim();
    const cleanE = eStr.replace(/^\\?lim\b/i, '\\lim');
    return `${cleanE}_{${limStr}}`;
  });
  tex = tex.replace(/<m:sSubSup\b[^>]*>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub\b[^>]*>([\s\S]*?)<\/m:sub>[\s\S]*?<m:sup\b[^>]*>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSubSup>/gi, (_, e, sub, sup) => {
    let base = ommlXmlToLatex(e).trim();
    const subStr = ommlXmlToLatex(sub).trim();
    const supStr = ommlXmlToLatex(sup).trim();
    if ((base.includes('\\frac') || base.includes('/')) && !/^\\left\s*[\(\[]|^[\(\[]/.test(base)) {
      base = `\\left(${base}\\right)`;
    } else if (/^\s*-\s*[0-9a-zA-Z\\]+/.test(base) && !/^\\left\s*[\(\[]|^[\(\[]/.test(base)) {
      base = `\\left(${base}\\right)`;
    }
    if (!subStr && supStr) {
      return `{${base}}^{${supStr}}`;
    }
    if (subStr && !supStr) {
      return `{${base}}_{${subStr}}`;
    }
    return `{${base}}_{${subStr}}^{${supStr}}`;
  });
  tex = tex.replace(/<m:sSup\b[^>]*>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sup\b[^>]*>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSup>/gi, (_, e, sup) => {
    let base = ommlXmlToLatex(e).trim();
    if ((base.includes('\\frac') || base.includes('/')) && !/^\\left\s*[\(\[]|^[\(\[]/.test(base)) {
      base = `\\left(${base}\\right)`;
    } else if (/^\s*-\s*[0-9a-zA-Z\\]+/.test(base) && !/^\\left\s*[\(\[]|^[\(\[]/.test(base)) {
      base = `\\left(${base}\\right)`;
    }
    return `{${base}}^{${ommlXmlToLatex(sup).trim()}}`;
  });
  tex = tex.replace(/<m:sSub\b[^>]*>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub\b[^>]*>([\s\S]*?)<\/m:sub>[\s\S]*?<\/m:sSub>/gi, (_, e, sub) => {
    return `{${ommlXmlToLatex(e).trim()}}_{${ommlXmlToLatex(sub).trim()}}`;
  });
  tex = tex.replace(/<m:d\b[^>]*>([\s\S]*?)<\/m:d>/gi, (match) => {
    let beg = '(';
    let end = ')';
    const begMatch = match.match(/<m:begChr\b[^>]*m:val="([^"]*)"/i);
    const endMatch = match.match(/<m:endChr\b[^>]*m:val="([^"]*)"/i);
    if (begMatch) beg = begMatch[1] ?? '';
    if (endMatch) end = endMatch[1] ?? '';
    if (beg === '{' && (!end || end === '.' || end === '')) {
      const eItems: string[] = [];
      const eAllMatches = match.matchAll(/<m:e\b[^>]*>([\s\S]*?)<\/m:e>/gi);
      for (const em of eAllMatches) {
        if (em[1]) eItems.push(ommlXmlToLatex(em[1]).trim());
      }
      return `\\begin{cases} ${eItems.join(' \\\\ ')} \\end{cases}`;
    }
    const eItems: string[] = [];
    const eAllMatches = match.matchAll(/<m:e\b[^>]*>([\s\S]*?)<\/m:e>/gi);
    for (const em of eAllMatches) {
      if (em[1]) eItems.push(ommlXmlToLatex(em[1]).trim());
    }
    const eContent = eItems.join('; ').trim();
    if (beg === '(' && end === ')') return `\\left( ${eContent} \\right)`;
    if (beg === '[' && end === ']') return `\\left[ ${eContent} \\right]`;
    if (beg === '{' && end === '}') return `\\left\\{ ${eContent} \\right\\}`;
    const l = beg ? (beg === '{' ? '\\{' : beg) : '.';
    const r = end ? (end === '}' ? '\\}' : end) : '.';
    return `\\left${l} ${eContent} \\right${r}`;
  });
  tex = tex.replace(/<m:t\b[^>]*>([\s\S]*?)<\/m:t>/gi, (_, t) => t);
  let result = tex.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return result
    .replace(/±/g, ' \\pm ')
    .replace(/×/g, ' \\times ')
    .replace(/÷/g, ' \\div ')
    .replace(/≤/g, ' \\le ')
    .replace(/≥/g, ' \\ge ')
    .replace(/≠/g, ' \\neq ')
    .replace(/∈/g, ' \\in ')
    .replace(/∉/g, ' \\notin ')
    .replace(/⊂/g, ' \\subset ')
    .replace(/∪/g, ' \\cup ')
    .replace(/∩/g, ' \\cap ')
    .replace(/∅/g, ' \\emptyset ')
    .replace(/∞/g, ' \\infty ')
    .replace(/→/g, ' \\rightarrow ')
    .replace(/⇒/g, ' \\Rightarrow ')
    .replace(/⇔/g, ' \\Leftrightarrow ')
    .replace(/π/g, ' \\pi ')
    .replace(/α/g, ' \\alpha ')
    .replace(/β/g, ' \\beta ')
    .replace(/γ/g, ' \\gamma ')
    .replace(/θ/g, ' \\theta ')
    .replace(/Δ/g, ' \\Delta ')
    .replace(/ℝ/g, ' \\mathbb{R} ')
    .replace(/ℤ/g, ' \\mathbb{Z} ')
    .replace(/ℕ/g, ' \\mathbb{N} ')
    .replace(/ℚ/g, ' \\mathbb{Q} ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Xử lý trước file .docx để giữ trọn vẹn công thức MathType và Word Equation OMML
 */
async function preprocessDocxMathAndOmml(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) return arrayBuffer;

    let xml = await docXmlFile.async('string');

    // 1. Chuyển đổi khối OMML đoạn văn <m:oMathPara>
    if (xml.includes('<m:oMathPara')) {
      xml = xml.replace(/<m:oMathPara\b[\s\S]*?<\/m:oMathPara>/gi, (match) => {
        const latex = ommlXmlToLatex(match);
        if (!latex) return match;
        const cleanLatex = wrapFractionAndNegativePowers(latex.trim().replace(/^\$+|\$+$/g, '').trim());
        return `<w:r><w:t xml:space="preserve"> $${cleanLatex}$ </w:t></w:r>`;
      });
    }

    // 2. Chuyển đổi khối OMML nội dòng <m:oMath>
    if (xml.includes('<m:oMath')) {
      xml = xml.replace(/<m:oMath\b[\s\S]*?<\/m:oMath>/gi, (match) => {
        const latex = ommlXmlToLatex(match);
        if (!latex) return match;
        const cleanLatex = wrapFractionAndNegativePowers(latex.trim().replace(/^\$+|\$+$/g, '').trim());
        return `<w:r><w:t xml:space="preserve"> $${cleanLatex}$ </w:t></w:r>`;
      });
    }

    // 3. Chuyển đổi đối tượng MathType có trường EQ
    if (xml.includes('Equation.3') || xml.includes('supportFields')) {
      xml = xml.replace(/<!--\[if\s+supportFields\]>[\s\S]*?EQ\s+([^<]+)[\s\S]*?<!\[endif\]-->/gi, (_, eq) => {
        const cleanEq = wrapFractionAndNegativePowers(eq.trim().replace(/^\$+|\$+$/g, '').trim());
        return `<w:r><w:t xml:space="preserve"> $${cleanEq}$ </w:t></w:r>`;
      });
    }

    // 4. Bảo tồn định dạng gạch chân / in đậm / tô đỏ trong Word XML (<w:u/>, <w:b/>, <w:color/>)
    // Phân tích theo từng đoạn văn <w:p> để kiểm tra xem option (A., B., C., D.) có gạch chân/in đậm ở nhãn HOẶC nội dung không
    xml = markUnderlinedOptionsInDocXml(xml);

    zip.file('word/document.xml', xml);
    return await zip.generateAsync({ type: 'arraybuffer' });
  } catch (err) {
    console.warn('Bỏ qua tiền xử lý XML do lỗi zip:', err);
    return arrayBuffer;
  }
}

function markUnderlinedOptionsInDocXml(xml: string): string {
  // Quét từng đoạn văn <w:p>...</w:p>
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi, (pXml) => {
    // Kiểm tra nhanh xem đoạn văn có chứa nhãn phương án A, B, C, D hay a), b), c), d) không (cho phép thẻ XML rải giữa chữ cái và dấu)
    if (!/(?:A|B|C|D|a|b|c|d)(?:<[^>]+>|\s)*[\.:\)]/i.test(pXml)) {
      return pXml;
    }

    // Kiểm tra nhanh xem đoạn văn có thẻ gạch chân (<w:u), in đậm (<w:b) hay màu chữ (<w:color) không
    if (!/<w:(?:u|b|color)\b/i.test(pXml)) {
      return pXml;
    }

    // Tách các thẻ run <w:r>...</w:r> trong đoạn văn
    const runRegex = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/gi;
    interface RunInfo {
      fullMatch: string;
      hasUnderline: boolean;
      hasBold: boolean;
      hasRedColor: boolean;
      text: string;
    }

    const runs: RunInfo[] = [];
    let rm: RegExpExecArray | null;
    while ((rm = runRegex.exec(pXml)) !== null) {
      const runContent = rm[0];
      const hasUnderline = /<w:u\b/i.test(runContent);
      const hasBold = /<w:b\b/i.test(runContent);
      const hasRedColor = /<w:color\b[^>]*w:val=["']?(?:FF0000|RED|C00000|E00000)["']?/i.test(runContent);

      const tMatch = runContent.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/i);
      const text = tMatch ? tMatch[1] : '';

      runs.push({
        fullMatch: runContent,
        hasUnderline,
        hasBold,
        hasRedColor,
        text,
      });
    }

    if (runs.length === 0) return pXml;

    // Xây dựng bản đồ chỉ số ký tự -> chỉ số run
    let fullPText = '';
    const charToRunIndex: number[] = [];
    for (let rIdx = 0; rIdx < runs.length; rIdx++) {
      const r = runs[rIdx];
      for (let c = 0; c < r.text.length; c++) {
        charToRunIndex.push(rIdx);
      }
      fullPText += r.text;
    }

    // Định vị các nhãn phương án trong chuỗi văn bản của đoạn: A., B., C., D. hoặc a), b), c), d)
    const optRegex = /(?:^|\s+)(?:[-•]\s*)?(?:(\*+|#)?\s*([A-D]|[a-d])\s*[\.\:\)])/gi;
    interface OptRange {
      letter: string;
      rawLetter: string;
      startCharIdx: number;
      endCharIdx: number;
      labelRunIdx: number;
      hasStar: boolean;
    }

    const optRanges: OptRange[] = [];
    let om: RegExpExecArray | null;
    while ((om = optRegex.exec(fullPText)) !== null) {
      const matchStr = om[0];
      const rawLetter = om[2];
      const letter = rawLetter.toUpperCase();
      const hasStar = !!(om[1] && om[1].includes('*'));

      // Bảo vệ: Nếu trùng với từ khóa "Câu 1", "Bài 1", "PHẦN I", "ĐỀ A"
      if (/(?:Câu|Bài|Phần|Đề|Đáp|Key)\s/i.test(matchStr)) {
        continue;
      }

      // Xác định chính xác chỉ số ký tự của chữ cái nhãn trong fullPText
      const letterIdxInMatch = matchStr.search(new RegExp(`\\b${rawLetter}\\b`, 'i'));
      const letterCharIdx = om.index + (letterIdxInMatch >= 0 ? letterIdxInMatch : 0);
      const labelRunIdx = charToRunIndex[letterCharIdx] ?? 0;

      optRanges.push({
        letter,
        rawLetter,
        startCharIdx: om.index,
        endCharIdx: fullPText.length,
        labelRunIdx,
        hasStar,
      });
    }

    if (optRanges.length === 0) return pXml;

    // Xác định điểm kết thúc của từng phương án
    for (let i = 0; i < optRanges.length; i++) {
      if (i < optRanges.length - 1) {
        optRanges[i].endCharIdx = optRanges[i + 1].startCharIdx;
      }
    }

    // Đếm xem trong đoạn văn này có phương án nào có gạch chân hoặc màu đỏ riêng biệt không
    const hasAnyUnderlineOrRed = optRanges.some((o) => {
      const rs = charToRunIndex[o.startCharIdx] ?? 0;
      const re = charToRunIndex[o.endCharIdx - 1] ?? runs.length - 1;
      for (let r = rs; r <= re; r++) {
        if (runs[r].hasUnderline || runs[r].hasRedColor) return true;
      }
      return false;
    });

    // Nếu tất cả phương án đều in đậm (định dạng tiêu đề chung), không dùng in đậm để xác định đáp án đúng
    const allBold = optRanges.every((o) => {
      const rs = charToRunIndex[o.startCharIdx] ?? 0;
      const re = charToRunIndex[o.endCharIdx - 1] ?? runs.length - 1;
      for (let r = rs; r <= re; r++) {
        if (runs[r].hasBold) return true;
      }
      return false;
    });

    // Kiểm tra định dạng cho từng vùng phương án
    let newPXml = pXml;
    for (const optRange of optRanges) {
      // Nếu phương án đã có dấu sao sẵn (* hoặc **), không cần chèn thêm dấu sao tránh biến thành **
      if (optRange.hasStar) continue;

      const rStart = charToRunIndex[optRange.startCharIdx] ?? 0;
      const rEnd = charToRunIndex[optRange.endCharIdx - 1] ?? runs.length - 1;

      let isUnderlinedOrBold = false;
      for (let r = rStart; r <= rEnd; r++) {
        if (runs[r].hasUnderline || runs[r].hasRedColor) {
          isUnderlinedOrBold = true;
          break;
        }
        // Chỉ dùng in đậm nếu không có phương án nào có gạch chân/đỏ và không phải tất cả phương án đều in đậm
        // TUYỆT ĐỐI không dùng in đậm để xác định đáp án Đúng cho mệnh đề a-d (phần II Đúng/Sai) vì nhãn mệnh đề luôn in đậm
        if (
          !/^[a-d]$/.test(optRange.rawLetter) &&
          !hasAnyUnderlineOrRed &&
          !allBold &&
          runs[r].hasBold
        ) {
          isUnderlinedOrBold = true;
          break;
        }
      }

      if (isUnderlinedOrBold) {
        // Tìm run thực sự chứa chữ cái nhãn phương án
        let actualRunIdx = optRange.labelRunIdx;
        while (
          actualRunIdx < runs.length &&
          actualRunIdx <= rEnd &&
          !new RegExp(`\\b${optRange.rawLetter}\\b`, 'i').test(runs[actualRunIdx].text)
        ) {
          actualRunIdx++;
        }
        if (actualRunIdx > rEnd) actualRunIdx = optRange.labelRunIdx;

        const targetRun = runs[actualRunIdx];
        if (targetRun && !targetRun.text.includes('*')) {
          const oldRunXml = targetRun.fullMatch;
          const letterPunctRegex = new RegExp(`(\\b${optRange.rawLetter}\\s*[\\.:\\)])`, 'i');
          const letterBareRegex = new RegExp(`(\\b${optRange.rawLetter}\\b)`, 'i');

          const newRunXml = oldRunXml.replace(
            /(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/i,
            (_, openT, tContent, closeT) => {
              if (letterPunctRegex.test(tContent)) {
                return `${openT}${tContent.replace(letterPunctRegex, '*$1')}${closeT}`;
              }
              if (letterBareRegex.test(tContent)) {
                return `${openT}${tContent.replace(letterBareRegex, '*$1')}${closeT}`;
              }
              return `${openT}${tContent}${closeT}`;
            }
          );

          if (newPXml.includes(oldRunXml)) {
            newPXml = newPXml.replace(oldRunXml, newRunXml);
          }
        }
      }
    }

    return newPXml;
  });
}

export async function parseDocxToShufflerExam(arrayBuffer: ArrayBuffer): Promise<ShufflerExam> {
  // 1. Tiền xử lý MathType, OMML & Gạch chân XML để không bị bỏ sót
  const processedBuffer = await preprocessDocxMathAndOmml(arrayBuffer);

  const imageStore: Record<string, string> = {};
  let imageCounter = 0;

  // Convert docx using mammoth with explicit styleMap for underline (u => u) and inline image extraction
  const options = {
    styleMap: [
      'u => u',
      'strike => del',
      'b => strong',
      'i => em',
    ],
    convertImage: mammoth.images.imgElement((image: any) => {
      return image.read('base64').then((imageBuffer: string) => {
        const tokenId = `IMG_${imageCounter++}`;
        const dataUrl = `data:${image.contentType || 'image/png'};base64,${imageBuffer}`;
        imageStore[tokenId] = dataUrl;
        // Return a clean marker that won't be broken by paragraph joins
        return { src: `[[${tokenId}]]` };
      });
    }),
  };

  const mammothResult = await mammoth.convertToHtml({ arrayBuffer: processedBuffer }, options);
  let html = mammothResult.value;

  // Detect tables
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  const detectedTableCount = tableMatches.length;
  const tableWarnings: string[] = [];
  if (detectedTableCount > 0) {
    tableWarnings.push(
      `Phát hiện ${detectedTableCount} bảng kẻ Word trong tài liệu. Khuyến nghị: Giáo viên nên chuyển bảng biến thiên/bảng số liệu sang dạng Ảnh (Picture PNG) trong Word để đảm bảo độ sắc nét 100% khi trộn đề.`
    );
  }

  // Replace <img src="[[IMG_X]]"... /> with clean text tokens [[IMG_X]]
  html = html.replace(/<img[^>]*src=["']\[\[(IMG_\d+)\]\]["'][^>]*>/gi, ' [[$1]] ');

  // Parse HTML into text while keeping structure
  return parseStructuredContentToExam(html, imageStore, detectedTableCount, tableWarnings);
}

// Alias function required by user brief
export const parseWordDocument = parseDocxToShufflerExam;

export function parseRawTextToShufflerExam(rawText: string): ShufflerExam {
  return parseStructuredContentToExam(rawText, {}, 0, []);
}

function parseStructuredContentToExam(
  content: string,
  imageStore: Record<string, string>,
  detectedTableCount: number,
  tableWarnings: string[]
): ShufflerExam {
  // 0. Pre-process Underline, Color, and Bold formatting before stripping HTML
  // Khớp tất cả hình thức gạch chân/in đậm:
  // - Bọc cả nhãn và dấu (<u>A.</u>)
  // - Chỉ bọc chữ cái (<u>A</u>. hoặc <u>A</u> .)
  // - Bọc nội dung ngay sau nhãn (A. <u>Nội dung</u> hoặc A . <u>Nội dung</u>)
  const replaceFormattedOptionLabels = (htmlText: string): string => {
    // Định dạng đáp án Đúng cho trắc nghiệm 4 lựa chọn (A, B, C, D)
    const formatTagPattern =
      '<(?:u|ins|strong|b)\\b[^>]*>|<span\\b[^>]*(?:text-decoration:\\s*underline|font-weight:\\s*(?:bold|[7-9]00)|color:\\s*(?:red|#f00|#ff0000|#c00000|#e00000|#dc2626))[^>]*>|<font\\b[^>]*color=["\']?(?:red|#f00|#ff0000|#c00000|#e00000|#dc2626)["\']?[^>]*>';

    // Định dạng đáp án Đúng cho mệnh đề Đúng/Sai (a, b, c, d):
    // CHỈ CÓ GẠCH CHÂN (u, ins, text-decoration: underline) hoặc MÀU ĐỎ.
    // TUYỆT ĐỐI KHÔNG dùng in đậm (strong, b) vì giáo viên mặc định in đậm nhãn a), b), c), d)
    const tfUnderlineFormatPattern =
      '<(?:u|ins)\\b[^>]*>|<span\\b[^>]*(?:text-decoration:\\s*underline|color:\\s*(?:red|#f00|#ff0000|#c00000|#e00000|#dc2626))[^>]*>|<font\\b[^>]*color=["\']?(?:red|#f00|#ff0000|#c00000|#e00000|#dc2626)["\']?[^>]*>';

    // 1. Mệnh đề Đúng/Sai a), b), c), d) nằm TRONG thẻ định dạng gạch chân / màu đỏ
    // Ví dụ: "<u>a)</u>", "<u>a</u>)", "<u>a) Hai đường thẳng...</u>"
    const regexTfInside = new RegExp(
      `(^|\\n|\\s|>|&nbsp;)\\s*(?:${tfUnderlineFormatPattern})\\s*(\\*|#)?\\s*\\(?([a-d])\\)?(?![a-zA-Zà-ỹÀ-Ỹ0-9])(?:\\s*([\\.:\\)]))?\\s*(?:<\\/[^>]+>)?\\s*([\\.:\\)])?`,
      'g'
    );
    htmlText = htmlText.replace(regexTfInside, (_match, prefix, _star, letter) => {
      return `${prefix || ''} *${letter.toLowerCase()}) `;
    });

    // 2. Mệnh đề Đúng/Sai a), b), c), d) đứng ngoài nhưng nội dung nằm TRONG thẻ gạch chân / màu đỏ
    // Ví dụ: "a) <u>Giao lưu văn hóa</u>", "a) <u>Đường thẳng MN...</u>"
    const regexTfOutsideContentInside = new RegExp(
      `(^|\\n|\\s|>|&nbsp;)\\s*\\(?([a-d])\\)?(?![a-zA-Zà-ỹÀ-Ỹ0-9])\\s*([\\.:\\)])\\s*(?:&nbsp;)?\\s*(${tfUnderlineFormatPattern})`,
      'g'
    );
    htmlText = htmlText.replace(regexTfOutsideContentInside, (_match, prefix, letter, _punc, openTag) => {
      return `${prefix || ''} *${letter.toLowerCase()}) ${openTag}`;
    });

    // 3. Nhãn phương án A, B, C, D nằm TRONG thẻ định dạng (ví dụ <u>A.</u>, <u>A</u>., <strong>A.</strong>, <strong>A</strong>.)
    // BẮT BUỘC: Giữ lại tiền tố prefix ($1) như '>' của thẻ <p> để không làm rách thẻ HTML khiến nội dung phương án bị nuốt
    const regexMcqInside = new RegExp(
      `(^|\\n|\\s|>|&nbsp;)\\s*(?:${formatTagPattern})\\s*(\\*|#)?\\s*\\(?([A-D])\\)?(?![a-zA-Zà-ỹÀ-Ỹ0-9])(?:\\s*([\\.:\\)]))?\\s*(?:<\\/[^>]+>)?\\s*([\\.:\\)])?`,
      'g'
    );
    htmlText = htmlText.replace(regexMcqInside, (_match, prefix, _star, letter) => {
      return `${prefix || ''} *${letter.toUpperCase()}. `;
    });

    // 4. Nhãn phương án A, B, C, D đứng NGOÀI nhưng nội dung ngay sau nhãn nằm TRONG thẻ định dạng
    // Ví dụ: "A. <u>Tự tin.</u>", "A . <u>Tự tin.</u>", "A.&nbsp;<strong>Tự tin</strong>"
    const regexMcqOutsideContentInside = new RegExp(
      `(^|\\n|\\s|>|&nbsp;)\\s*\\(?([A-D])\\)?(?![a-zA-Zà-ỹÀ-Ỹ0-9])\\s*([\\.:\\)])\\s*(?:&nbsp;)?\\s*(${formatTagPattern})`,
      'g'
    );
    htmlText = htmlText.replace(regexMcqOutsideContentInside, (_match, prefix, letter, _punc, openTag) => {
      return `${prefix || ''} *${letter.toUpperCase()}. ${openTag}`;
    });

    return htmlText;
  };

  content = replaceFormattedOptionLabels(content);

  // In plain text / markdown: <u>a)</u> or _a)_ or __a)__ or **A.** or **a)**
  content = content.replace(/(^|[\s>])<u>\s*(\*?)\(?([a-d])\)?(?:\s*[\.\:\)])?\s*<\/u>\s*[\.\:\)]?/gi, '$1 *$3) ');
  content = content.replace(/(^|[\s>])<u>\s*(\*?)([A-D])(?:\s*[\.\:\)])?\s*<\/u>\s*[\.\:\)]?/gi, '$1 *$3. ');
  // Cho mệnh đề Đúng/Sai [a-d], markdown in đậm **a)** không phải là đáp án đúng trừ khi có dấu sao *
  content = content.replace(/(^|[\s>])_{1,2}\s*(\*?)\(?([a-d])\)?(?:\s*[\.\:\)])?\s*_{1,2}\s*[\.\:\)]?/gi, (_m, p, star, letter) => {
    return `${p}${star ? '*' : ''}${letter.toLowerCase()}) `;
  });
  content = content.replace(/(^|[\s>])_{1,2}\s*(\*?)([A-D])(?:\s*[\.\:\)])?\s*_{1,2}\s*[\.\:\)]?/gi, '$1 *$3. ');
  content = content.replace(/(^|[\s>])\*{1,2}\s*(\*?)\(?([a-d])\)?(?:\s*[\.\:\)])?\s*\*{1,2}\s*[\.\:\)]?/gi, (_m, p, star, letter) => {
    return `${p}${star ? '*' : ''}${letter.toLowerCase()}) `;
  });
  content = content.replace(/(^|[\s>])\*{1,2}\s*(\*?)([A-D])(?:\s*[\.\:\)])?\s*\*{1,2}\s*[\.\:\)]?/gi, '$1 *$3. ');

  // Bảo vệ đáp án câu hỏi trả lời ngắn: <Key= -17>, <Key = 120>, <Key= 0,67>, <Key: -17>, &lt;Key= -17&gt;
  content = content.replace(/(?:<|&lt;)\s*Key\s*[:=]\s*([^>&]+)\s*(?:>|&gt;)/gi, (_m, keyVal) => {
    return `\n[[SHORT_ANSWER_KEY: ${keyVal.trim()}]]\n`;
  });

  // Pre-process HTML tags into text lines
  let text = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<tr[\s\S]*?<\/tr>/gi, (tr) => {
      return tr.replace(/<\/td>/gi, ' | ').replace(/<\/?(?:[a-zA-Z][a-zA-Z0-9]*|!--[\s\S]*?--)(?:\s+[^>]*)?>/g, '') + '\n';
    })
    .replace(/<\/?(?:[a-zA-Z][a-zA-Z0-9]*|!--[\s\S]*?--)(?:\s+[^>]*)?>/g, ' '); // Strip only real HTML tags

  // Unescape HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]{4,}/g, '   ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Kiểm tra lần 2 nếu sau unescape còn sót dạng <Key= ...>
  text = text.replace(/<\s*Key\s*[:=]\s*([^>]+)\s*>/gi, (_m, keyVal) => {
    return `\n[[SHORT_ANSWER_KEY: ${keyVal.trim()}]]\n`;
  });

  // Detect and extract answer key table at the end of the document if available
  // e.g. "BẢNG ĐÁP ÁN: 1.A 2.B 3.C..." or "1A 2B 3C 4D"
  const answersMap: Record<number, string> = {};
  const answerSectionMatch = text.match(/(?:BẢNG ĐÁP ÁN|ĐÁP ÁN THAM KHẢO|ĐÁP ÁN CHI TIẾT|ĐÁP ÁN TRẮC NGHIỆM)([\s\S]*)$/i);
  if (answerSectionMatch) {
    const ansText = answerSectionMatch[1];
    const pairRegex = /(?:Câu\s*)?(\d+)[\s.:=-]*([A-D]|[a-d]|Đúng|Sai|[ĐS]|True|False|\d+(?:[.,]\d+)?)/gi;
    let pm: RegExpExecArray | null;
    while ((pm = pairRegex.exec(ansText)) !== null) {
      const qNum = parseInt(pm[1], 10);
      const val = pm[2].trim().toUpperCase();
      answersMap[qNum] = val;
    }
  }

  // Divide into Parts: PHẦN I, PHẦN II, PHẦN III, PHẦN IV / TỰ LUẬN
  const partSplits = divideIntoParts(text);

  const questions: ShufflerQuestion[] = [];
  let globalQIndex = 1;

  // Process Part 1: MCQ (A, B, C, D)
  if (partSplits.part1) {
    const p1Questions = parsePart1Questions(partSplits.part1, globalQIndex, answersMap);
    questions.push(...p1Questions);
    globalQIndex += p1Questions.length;
  }

  // Process Part 2: True/False (a, b, c, d)
  if (partSplits.part2) {
    const p2Questions = parsePart2Questions(partSplits.part2, globalQIndex, answersMap);
    questions.push(...p2Questions);
    globalQIndex += p2Questions.length;
  }

  // Process Part 3: Short Answer
  if (partSplits.part3) {
    const p3Questions = parsePart3Questions(partSplits.part3, globalQIndex, answersMap);
    questions.push(...p3Questions);
    globalQIndex += p3Questions.length;
  }

  // Process Part 4: Essay / Tự luận (Essay Block Mode)
  if (partSplits.part4) {
    const p4Questions = parsePart4Questions(partSplits.part4, globalQIndex);
    questions.push(...p4Questions);
    globalQIndex += p4Questions.length;
  }

  // If no sections were explicitly detected, run general question parser
  if (questions.length === 0) {
    const fallbackQuestions = parseGeneralQuestions(text, answersMap);
    questions.push(...fallbackQuestions);
  }

  // Mark questions that contain images
  for (const q of questions) {
    const combined =
      q.stem +
      (q.options?.map((o) => o.text).join(' ') || '') +
      (q.tfStatements?.map((t) => t.text).join(' ') || '') +
      (q.solution || '');
    if (/\[\[IMG_\d+\]\]/.test(combined)) {
      q.hasImage = true;
    }
  }

  // Extract header metadata if present
  const headerMeta = extractExamHeader(text);

  return {
    title: headerMeta.examName || 'ĐỀ KIỂM TRA',
    school: headerMeta.school || 'SỞ GD&ĐT ................... / TRƯỜNG THPT ...................',
    examName: headerMeta.examName || 'KIỂM TRA CHẤT LƯỢNG',
    subject: headerMeta.subject || 'Môn: TOÁN HỌC',
    duration: headerMeta.duration || '90 phút',
    academicYear: 'Năm học 2025 - 2026',
    questions,
    imageStore,
    tableWarnings,
    detectedTableCount,
    detectedImageCount: Object.keys(imageStore).length,
    rawHtml: content,
  };
}

function divideIntoParts(text: string): {
  part1: string;
  part2: string;
  part3: string;
  part4: string;
} {
  interface SectionMarker {
    part: 1 | 2 | 3 | 4;
    index: number;
    title: string;
  }

  const markersMap = new Map<number, SectionMarker>();

  // Regex line matcher for section titles
  const headerLineRegex = /(?:^|\n)\s*(?:###?\s*|\*{0,2})?((?:PHẦN\s*(?:[I|V|X|0-9]+)[.:\s-]*)?[^\n]*)/gi;

  let m: RegExpExecArray | null;
  while ((m = headerLineRegex.exec(text)) !== null) {
    const lineText = m[1].trim();
    if (!lineText) continue;

    // Check if line is a section header line:
    // MUST match "PHẦN ...", "TRẮC NGHIỆM", "TỰ LUẬN", "TRẢ LỜI NGẮN", "ĐÚNG SAI"
    const isSectionHeader =
      /^(?:PHẦN\s*(?:IV|III|II|I|4|3|2|1|BỐN|BA|HAI|MỘT|\d+)|(?:[A-D]|\bII|\bIII|\bIV|\bI)[.:\s-]+(?:TỰ\s*LUẬN|TRẮC\s*NGHIỆM|ĐÚNG\s*SAI|TRẢ\s*LỜI\s*NGẮN)|\bTỰ\s*LUẬN\b|\bTRẮC\s*NGHIỆM\b|\bTRẢ\s*LỜI\s*NGẮN\b)/i.test(
        lineText
      );

    if (!isSectionHeader) continue;

    const idx = m.index;

    // RULE: If line contains "TỰ LUẬN" or "Tự luận" (case-insensitive), it MUST be Part 4!
    if (/tự\s*luận/i.test(lineText)) {
      markersMap.set(idx, { part: 4, index: idx, title: lineText });
    } else if (/trả\s*lời\s*ngắn/i.test(lineText) || /PHẦN\s*(?:III\b|3\b|BA\b)/i.test(lineText)) {
      if (!markersMap.has(idx)) {
        markersMap.set(idx, { part: 3, index: idx, title: lineText });
      }
    } else if (/đúng\s*[\/\-]?\s*sai/i.test(lineText) || /PHẦN\s*(?:II\b|2\b|HAI\b)/i.test(lineText)) {
      if (!markersMap.has(idx)) {
        markersMap.set(idx, { part: 2, index: idx, title: lineText });
      }
    } else if (/trắc\s*nghiệm/i.test(lineText) || /PHẦN\s*(?:I\b|1\b|MỘT\b)/i.test(lineText)) {
      if (!markersMap.has(idx)) {
        markersMap.set(idx, { part: 1, index: idx, title: lineText });
      }
    } else if (/PHẦN\s*(?:IV\b|4\b|BỐN\b)/i.test(lineText)) {
      markersMap.set(idx, { part: 4, index: idx, title: lineText });
    }
  }

  const markers = Array.from(markersMap.values());

  // Check end marker: answer key table
  const ansMatch = text.match(/(?:^|\n)\s*(?:###?\s*|\*{0,2})?(?:BẢNG\s*ĐÁP\s*ÁN|ĐÁP\s*ÁN\s*CHI\s*TIẾT|ĐÁP\s*ÁN\s*TRẮC\s*NGHIỆM)/i);
  const endIndex = ansMatch && ansMatch.index !== undefined ? ansMatch.index : text.length;

  // Sort markers in reading order
  markers.sort((a, b) => a.index - b.index);

  const result = {
    part1: '',
    part2: '',
    part3: '',
    part4: '',
  };

  if (markers.length === 0) {
    return result;
  }

  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i];
    const nextIndex = i + 1 < markers.length ? markers[i + 1].index : endIndex;
    let chunk = text.substring(cur.index, nextIndex).trim();

    // Strip initial section title header line and exam instructions from chunk so it doesn't pollute questions
    chunk = chunk
      .replace(/^(?:###?\s*|\*{0,2})?(?:PHẦN\s*(?:[I|V|X|0-9]+|[A-D])[.:\s-]*)?(?:(?:Câu\s+trắc\s+nghiệm\s+)?(?:TRẮC\s*NGHIỆM|ĐÚNG\s*[\/\-]?\s*SAI|TRẢ\s*LỜI\s*NGẮN|TỰ\s*LUẬN))[^\n]*\n?/i, '')
      .replace(/^(?:Thí\s+sinh\s+trả\s+lời\s+từ\s+câu\s+\d+\s+đến\s+câu\s+\d+[^\n]*\n?|Trong\s+mỗi\s+ý\s+a\)[^\n]*\n?|\([0-9.,]+\s*điểm\)[^\n]*\n?|\s*)+/i, '')
      .trim();

    if (cur.part === 1 && !result.part1) result.part1 = chunk;
    else if (cur.part === 2 && !result.part2) result.part2 = chunk;
    else if (cur.part === 3 && !result.part3) result.part3 = chunk;
    else if (cur.part === 4 && !result.part4) result.part4 = chunk;
  }

  return result;
}

// -------------------------------------------------------------
// PART 1 PARSER: MCQ (A, B, C, D)
// -------------------------------------------------------------
function parsePart1Questions(
  partText: string,
  startIndex: number,
  answersMap: Record<number, string>
): ShufflerQuestion[] {
  const questions: ShufflerQuestion[] = [];
  const questionBlocks = splitQuestionBlocks(partText);

  for (let i = 0; i < questionBlocks.length; i++) {
    const rawBlock = questionBlocks[i];
    // Tách nhỏ nếu trong rawBlock vẫn còn nhiều câu ghép lại
    const subBlocks = rawBlock
      .split(/(?=(?:^|\n)\s*(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+[\s.:\)-])/i)
      .filter((b) => b.trim().length > 5);
    const effectiveBlocks = subBlocks.length > 1 ? subBlocks : [rawBlock];

    for (let j = 0; j < effectiveBlocks.length; j++) {
      const block = effectiveBlocks[j];
      const qIndex = startIndex + questions.length;

      // Detect question number in block if present
      const qNumMatch = block.match(/(?:^|\n)\s*(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*(\d+)[\s.:\)-]/i);
      const parsedQNum = qNumMatch ? parseInt(qNumMatch[1], 10) : qIndex;

      // Split Stem and 4 Options
      const { stem, options } = extractMcqOptions(block, parsedQNum, answersMap);

      if (options.length >= 2) {
        questions.push({
          id: `q_p1_${parsedQNum}_${Date.now()}_${questions.length}`,
          originalIndex: parsedQNum,
          type: 'mcq',
          part: 1,
          stem: stem.trim(),
          options,
        });
      }
    }
  }

  return questions;
}

function extractMcqOptions(
  block: string,
  qNum: number,
  answersMap: Record<number, string>
): { stem: string; options: ShufflerOption[] } {
  // Regex finding positions of A., B., C., D. (supports 1-space, 2-column, or multi-line layouts, and handles multiple asterisks like **A.)
  const optionRegex = /(?:^|\n|\s+)(?:[-•]\s*)?(?:(\*+|#)?\s*\(?([A-D]|[a-d])\)?\s*[\.\:\)])\s*/gi;
  
  const matches: { index: number; fullMatchLength: number; modifier?: string; letter: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = optionRegex.exec(block)) !== null) {
    matches.push({
      index: m.index,
      fullMatchLength: m[0].length,
      modifier: m[1],
      letter: m[2].toUpperCase(),
    });
  }

  // Nếu có đúng 4 matches theo thứ tự xuất hiện nhưng bị trùng chữ cái (ví dụ A, C, C, D do lỗi đánh máy của GV)
  // và thiếu đúng 1 chữ cái chuẩn trong [A, B, C, D], ta tái ánh xạ thứ tự xuất hiện sang [A, B, C, D]
  let effectiveMatches = matches;
  if (matches.length === 4) {
    const rawLetters = matches.map((m) => m.letter);
    const standardLetters = ['A', 'B', 'C', 'D'];
    const missing = standardLetters.filter((l) => !rawLetters.includes(l));
    if (missing.length === 1 && rawLetters[0] === 'A') {
      effectiveMatches = matches.map((m, idx) => ({
        ...m,
        letter: standardLetters[idx],
      }));
    }
  }

  // Filter matches so we keep unique letters A, B, C, D (first appearance of each letter in block)
  const seenLetters = new Set<string>();
  const uniqueMatches: typeof matches = [];
  for (const match of effectiveMatches) {
    if (!seenLetters.has(match.letter)) {
      seenLetters.add(match.letter);
      uniqueMatches.push(match);
    }
  }

  // Sort unique matches by their appearance index in text order
  uniqueMatches.sort((a, b) => a.index - b.index);

  if (uniqueMatches.length >= 2) {
    const firstOptionIdx = uniqueMatches[0].index;
    const stem = block
      .substring(0, firstOptionIdx)
      .replace(/^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+[:.]\s*(?:\*{0,2})/i, '')
      .replace(/[\s*#]+$/, '')
      .trim();

    const options: ShufflerOption[] = [];
    for (let k = 0; k < uniqueMatches.length; k++) {
      const cur = uniqueMatches[k];
      const startPos = cur.index + cur.fullMatchLength;
      let endPos = k < uniqueMatches.length - 1 ? uniqueMatches[k + 1].index : block.length;

      // Nếu là phương án cuối cùng (Option D), đảm bảo không nuốt câu hỏi tiếp theo
      if (k === uniqueMatches.length - 1) {
        const nextQMatch = block.substring(startPos).match(/(?:^|\n|\s{2,})(?:[-*•]\s*)?(?:\*{0,2})(?:(?:Câu|Bài)\s*\d+|\*+[A-D][.:\)])/i);
        if (nextQMatch && nextQMatch.index !== undefined && nextQMatch.index > 0) {
          endPos = startPos + nextQMatch.index;
        }
      }

      let optText = block.substring(startPos, endPos).trim();

      // Clean leading dots, colons, or dashes left by formatting replacements
      optText = optText.replace(/^[\.\:\)\-–—\s]+/, '').trim();

      // Check if text has trailing asterisk indicating correct answer
      let isCorrect = !!(cur.modifier && cur.modifier.includes('*'));
      if (optText.endsWith('*')) {
        isCorrect = true;
        optText = optText.slice(0, -1).trim();
      }

      // Check if option text starts with * or contains [Đ] / (Đ) / Đúng
      if (!isCorrect && (/^\*+/.test(optText) || /\[Đ\]|\(Đ\)|\bĐúng\b/i.test(optText))) {
        isCorrect = true;
      }
      optText = optText.replace(/^\*+\s*/, '').trim();

      // Check external answer map
      if (!isCorrect && answersMap[qNum] === cur.letter) {
        isCorrect = true;
      }

      // Check if question block explicitly states "Đáp án: A" or "Đáp án A" or "Key: A" or "Chọn A" or "Hướng dẫn: A"
      if (!isCorrect) {
        const ansRegex = new RegExp(`(?:Đáp\\s*án|Key|Chọn|Câu\\s*trả\\s*lời|Hướng\\s*dẫn|Lời\\s*giải)\\s*[:\\s=-]*\\s*${cur.letter}\\b`, 'i');
        if (ansRegex.test(block)) {
          isCorrect = true;
        }
      }

      // Check if option is locked (starts with # or contains specific lock phrases)
      let isLocked = cur.modifier === '#';
      if (
        !isLocked &&
        /^(?:Cả\s*[A-D]\s*,\s*[A-D]|Không\s*có\s*đáp\s*án\s*nào|Tất\s*cả\s*các\s*đáp\s*án|Cả\s*3\s*đáp\s*án|Tất\s*cả\s*đều\s*đúng|Tất\s*cả\s*đều\s*sai)/i.test(
          optText
        )
      ) {
        isLocked = true;
      }

      options.push({
        id: `opt_${cur.letter}_${k}`,
        label: cur.letter,
        originalLabel: cur.letter,
        text: optText,
        isCorrect,
        isLocked,
      });
    }

    // Ràng buộc trắc nghiệm đơn (Single-choice): Phần I trắc nghiệm chỉ được phép có DUY NHẤT 1 đáp án đúng
    const correctCount = options.filter((o) => o.isCorrect).length;
    if (correctCount > 1) {
      if (answersMap[qNum]) {
        options.forEach((o) => {
          o.isCorrect = o.label === answersMap[qNum];
        });
      } else {
        // Ưu tiên phương án có dấu sao rõ ràng (* hoặc **) trên nhãn ban đầu
        const starOpt = options.find((o) => {
          const match = uniqueMatches.find((um) => um.letter === o.label);
          return match && match.modifier && match.modifier.includes('*');
        });

        if (starOpt) {
          options.forEach((o) => {
            o.isCorrect = o.id === starOpt.id;
          });
        } else if (correctCount === options.length) {
          // Tất cả đều bị đánh dấu đúng (do in đậm toàn bộ) -> bỏ chọn hết
          options.forEach((o) => {
            o.isCorrect = false;
          });
        } else {
          // Nếu có nhiều đáp án vô tình khớp, chỉ giữ lại đúng đáp án đầu tiên
          let foundFirst = false;
          options.forEach((o) => {
            if (o.isCorrect) {
              if (!foundFirst) {
                foundFirst = true;
              } else {
                o.isCorrect = false;
              }
            }
          });
        }
      }
    }

    // Re-sort options into standard letter order: A, B, C, D
    const letterOrder: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    options.sort((a, b) => (letterOrder[a.label] ?? 99) - (letterOrder[b.label] ?? 99));

    return { stem, options };
  }

  // Fallback if regex didn't catch 4 distinct options
  return {
    stem: block.replace(/^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+[:.]\s*(?:\*{0,2})/i, '').trim(),
    options: [],
  };
}

// -------------------------------------------------------------
// PART 2 PARSER: TRUE / FALSE (a, b, c, d)
// -------------------------------------------------------------
function parsePart2Questions(
  partText: string,
  startIndex: number,
  answersMap: Record<number, string>
): ShufflerQuestion[] {
  const questions: ShufflerQuestion[] = [];
  const questionBlocks = splitQuestionBlocks(partText);

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    const qIndex = startIndex + i;

    const qNumMatch = block.match(/(?:^|\n)\s*(?:Câu|Bài)\s*(\d+)[:.]/i);
    const parsedQNum = qNumMatch ? parseInt(qNumMatch[1], 10) : qIndex;

    const { stem, tfStatements } = extractTfStatements(block, parsedQNum, answersMap);

    if (tfStatements.length >= 2) {
      questions.push({
        id: `q_p2_${parsedQNum}_${Date.now()}_${i}`,
        originalIndex: parsedQNum,
        type: 'tf',
        part: 2,
        stem: stem.trim(),
        tfStatements,
      });
    }
  }

  return questions;
}

function extractTfStatements(
  block: string,
  _qNum: number,
  _answersMap: Record<number, string>
): { stem: string; tfStatements: ShufflerTfStatement[] } {
  // Regex nhận diện các nhãn mệnh đề: a), b), c), d) hoặc *a), *b), <u>a)</u>, (*a), *(a), * a)
  // Chỉ cho phép chữ hoa A-D nếu đứng ĐẦU DÒNG (tránh nuốt các điểm hình học như "đi qua A.")
  const statementRegex = /(?:^|\n|\s+)(?:[-•]\s*)?(?:(\*+|#|<u>|<ins>)?\s*\(?([a-d])\)?\s*[\.\:\)]|\(?\s*(\*+)\s*([a-d])\s*\)?\s*[\.\:\)]?)\s*|(?:^|\n)\s*(?:[-•]\s*)?(?:(\*+|#|<u>|<ins>)?\s*\(?([A-D])\)?\s*[\.\:\)]|\(?\s*(\*+)\s*([A-D])\s*\)?\s*[\.\:\)]?)\s*/g;

  const matches: { index: number; fullMatchLength: number; modifier?: string; letter: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = statementRegex.exec(block)) !== null) {
    const rawMod = m[1] || m[3] || m[5] || m[7];
    const letter = (m[2] || m[4] || m[6] || m[8]).toLowerCase();
    const isUnderlinedOrStar = (rawMod && rawMod.includes('*')) || rawMod === '<u>' || rawMod === '<ins>';
    matches.push({
      index: m.index,
      fullMatchLength: m[0].length,
      modifier: isUnderlinedOrStar ? '*' : rawMod === '#' ? '#' : undefined,
      letter,
    });
  }

  if (matches.length >= 2) {
    const stem = block.substring(0, matches[0].index).replace(/^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+[:.]\s*(?:\*{0,2})/i, '').trim();

    const tfStatements: ShufflerTfStatement[] = [];
    for (let k = 0; k < matches.length; k++) {
      const cur = matches[k];
      const startPos = cur.index + cur.fullMatchLength;
      const endPos = k < matches.length - 1 ? matches[k + 1].index : block.length;
      let textLine = block.substring(startPos, endPos).trim();

      // Check for true/false indicators:
      // - Có dấu sao (*a, *b) hoặc gạch chân (<u>...</u>, style underline) là ĐÚNG
      // - Hoặc có dấu hiệu [Đ], (Đ), Đúng, True ở cuối mệnh đề
      // - Không có dấu hiệu trên (hoặc có [S], (S), Sai, False) là SAI
      let isCorrect = cur.modifier === '*' || /^\s*\*+/.test(textLine) || /<(?:u|ins)\b|style=["'][^"']*underline/i.test(textLine);
      if (/(?:^|\s|--|-)(?:\[[Đđ]\]|\([Đđ]\)|--\s*[Đđ]|-\s*[Đđ]|\bĐúng\b|\bTrue\b)(?:\s*[\.;,]|\s*$)/i.test(textLine)) {
        isCorrect = true;
      }
      if (/(?:^|\s|--|-)(?:\[[Ss]\]|\([Ss]\)|--\s*[Ss]|-\s*[Ss]|\bSai\b|\bFalse\b)(?:\s*[\.;,]|\s*$)/i.test(textLine)) {
        isCorrect = false;
      }

      // Check external answersMap if present for Part 2
      if (_answersMap && _answersMap[_qNum]) {
        const qAns = _answersMap[_qNum].toUpperCase();
        const specificLetterMatch = qAns.match(new RegExp(`${cur.letter}\\s*[:=-]?\\s*([ĐDSTF])`, 'i'));
        if (specificLetterMatch) {
          isCorrect = /^[ĐDT]$/i.test(specificLetterMatch[1]);
        } else if (/^[ĐDSTF]{4}$/i.test(qAns.replace(/\s+/g, ''))) {
          const clean4 = qAns.replace(/\s+/g, '');
          const letterIdx = { a: 0, b: 1, c: 2, d: 3 }[cur.letter] ?? -1;
          if (letterIdx >= 0 && letterIdx < clean4.length) {
            isCorrect = /^[ĐDT]$/i.test(clean4[letterIdx]);
          }
        }
      }

      // Clean tags from statement text
      textLine = textLine
        .replace(/\s*(?:\[[ĐSđs]\]|\([ĐSđs]\)|--\s*[ĐSđs]|-\s*[ĐSđs]|\bĐúng\b|\bSai\b|\bTrue\b|\bFalse\b)\s*$/i, '')
        .replace(/<\/?(?:u|ins|b|strong|span|font)[^>]*>/gi, '')
        .trim();

      tfStatements.push({
        id: `tf_${cur.letter}_${k}`,
        label: cur.letter,
        originalLabel: cur.letter,
        text: textLine,
        isCorrect,
      });
    }

    return { stem, tfStatements };
  }

  return {
    stem: block.replace(/^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+[:.]\s*(?:\*{0,2})/i, '').trim(),
    tfStatements: [],
  };
}

// -------------------------------------------------------------
// PART 3 PARSER: SHORT ANSWER (Trả lời ngắn)
// -------------------------------------------------------------
function parsePart3Questions(
  partText: string,
  startIndex: number,
  answersMap: Record<number, string>
): ShufflerQuestion[] {
  const questions: ShufflerQuestion[] = [];

  // 1. Dọn dẹp triệt để tiêu đề phần và câu hướng dẫn khỏi partText
  let cleanPartText = partText
    .replace(/^(?:###?\s*|\*{0,2})?(?:PHẦN\s*(?:[I|V|X|0-9]+|[A-D])[.:\s-]*)?(?:(?:Câu\s+trắc\s+nghiệm\s+)?(?:TRẮC\s*NGHIỆM|ĐÚNG\s*[\/\-]?\s*SAI|TRẢ\s*LỜI\s*NGẮN|TỰ\s*LUẬN))[^\n]*\n?/i, '')
    .replace(/^(?:Thí\s+sinh\s+trả\s+lời\s+từ\s+câu\s+\d+\s+đến\s+câu\s+\d+[^\n]*\n?|Trong\s+mỗi\s+ý\s+a\)[^\n]*\n?|\([0-9.,]+\s*điểm\)[^\n]*\n?|\s*)+/i, '')
    .trim();

  // 2. Nếu câu hỏi trả lời ngắn không có tiền tố "Câu X:" nhưng được phân tách bởi token [[SHORT_ANSWER_KEY: ...]] hoặc <Key= ...>
  // Tự động chèn "\nCâu auto: " ngay sau token đáp án nếu đoạn văn tiếp theo không bắt đầu bằng "Câu" hoặc "Bài"
  cleanPartText = cleanPartText.replace(
    /(\[\[SHORT_ANSWER_KEY:\s*[^\]]+\]\]|<Key\s*=\s*[^>]+>)\s*([\r\n]+|\s{2,})(?!(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài|PHẦN)\s*\d+)(?=[^\s])/gi,
    '$1\n\nCâu auto: '
  );

  const questionBlocks = splitQuestionBlocks(cleanPartText);

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    const qIndex = startIndex + i;

    const qNumMatch = block.match(/(?:^|\n)\s*(?:Câu|Bài)\s*(\d+)[:.]/i);
    const parsedQNum = qNumMatch ? parseInt(qNumMatch[1], 10) : qIndex;

    let shortAnswer = answersMap[parsedQNum] || '';
    let cleanStem = block
      .replace(/^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*(?:\d+|auto)[:.]\s*(?:\*{0,2})/i, '')
      .trim();

    // 1. Kiểm tra token được bảo vệ [[SHORT_ANSWER_KEY: ...]]
    const protectedKeyMatch = cleanStem.match(/\[\[SHORT_ANSWER_KEY:\s*([^\]]+)\]\]/i);
    if (protectedKeyMatch) {
      if (!shortAnswer) {
        shortAnswer = protectedKeyMatch[1]
          .replace(/^\$+|\$+$/g, '')
          .replace(/[<>=;.]+/g, '')
          .trim();
      }
      cleanStem = cleanStem.replace(protectedKeyMatch[0], '').trim();
    }

    // 2. Kiểm tra các định dạng <Key= ...>, <Key = ...>, <Key: ...>, Key: ..., Đáp án: ...
    const keyTagMatch = cleanStem.match(/(?:<|&lt;)?\s*Key\s*[:=]\s*([^>&]+)\s*(?:>|&gt;)?/i);
    if (keyTagMatch) {
      if (!shortAnswer) {
        shortAnswer = keyTagMatch[1]
          .replace(/^\$+|\$+$/g, '')
          .replace(/[<>=;]+/g, '')
          .trim();
      }
      cleanStem = cleanStem.replace(keyTagMatch[0], '').trim();
    }

    // ansRegex: BẮT BUỘC có dấu : hoặc = hoặc Key trước số. TUYỆT ĐỐI không khớp cụm từ "kết quả làm tròn"
    const ansRegex = /(?:^|\n|\s*)(?:(?:Đáp\s*(?:án|số)|Kết\s*quả(?!\s*(?:làm\s*tròn|quy\s*định))|Ans|Answer)\s*[:=]\s*|\bKey\s*[:=]\s*|\bKey\s*(?=[-+0-9]))([^\n\r]+)/i;
    const ansMatch = cleanStem.match(ansRegex);
    if (ansMatch) {
      if (!shortAnswer) {
        shortAnswer = ansMatch[1]
          .replace(/^\$+|\$+$/g, '')
          .replace(/[<>=;]+$/g, '')
          .trim();
      }
      cleanStem = cleanStem.replace(ansMatch[0], '').trim();
    }

    // Dọn dẹp triệt để bất kỳ tàn dư token key nào còn sót lại trong stem
    cleanStem = cleanStem
      .replace(/\[\[SHORT_ANSWER_KEY:[^\]]*\]\]/gi, '')
      .replace(/(?:<|&lt;)?\s*Key\s*[:=][^>&\n]*(?:>|&gt;)?/gi, '')
      .replace(/\(\s*<Key[^>]*>\s*\)/gi, '')
      .trim();

    // Chuẩn hóa shortAnswer: loại bỏ hoàn toàn các ký tự thừa như >, <, ;, . ở đầu/cuối nhưng giữ nguyên dấu phẩy/chấm thập phân ở giữa
    shortAnswer = shortAnswer
      .replace(/^[<>=:\s]+|[>.;\s]+$/g, '')
      .trim();

    questions.push({
      id: `q_p3_${parsedQNum}_${Date.now()}_${i}`,
      originalIndex: parsedQNum,
      type: 'sa',
      part: 3,
      stem: cleanStem,
      shortAnswer,
    });
  }

  return questions;
}

// -------------------------------------------------------------
// PART 4 PARSER: ESSAY / TỰ LUẬN (Essay Block Mode)
// -------------------------------------------------------------
function parsePart4Questions(
  partText: string,
  startIndex: number
): ShufflerQuestion[] {
  const questions: ShufflerQuestion[] = [];
  const questionBlocks = splitEssayQuestionBlocks(partText);

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    const qIndex = startIndex + i;

    // Detect question number and points in block
    // e.g. "Câu 1 (1,0 điểm):" or "Câu 2 (2.0 điểm)." or "Bài 1:"
    const qNumMatch = block.match(/(?:^|\n)\s*(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*(\d+)(?:\s*\(([^)]+)\))?[:.]/i);
    const parsedQNum = qNumMatch ? parseInt(qNumMatch[1], 10) : qIndex;
    const points = qNumMatch && qNumMatch[2] ? `(${qNumMatch[2].trim()})` : undefined;

    // Strip question header from stem, keeping sub-parts a), b), c) intact
    let cleanStem = block
      .replace(/^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+(?:\s*\([^)]+\))?[:.]\s*(?:\*{0,2})/i, '')
      .trim();

    // Check if solution / grading rubric is included in block
    let stem = cleanStem;
    let solution: string | undefined = undefined;

    const solRegex = /(?:^|\n)\s*(?:\*{0,2})(?:Lời\s*giải(?:\s*chi\s*tiết)?|Hướng\s*dẫn\s*chấm|Đáp\s*án\s*(?:và|&)?\s*Hướng\s*dẫn\s*chấm|HD\s*chấm)[:.]?\s*(?:\*{0,2})([\s\S]*)$/i;
    const solMatch = cleanStem.match(solRegex);
    if (solMatch) {
      stem = cleanStem.substring(0, solMatch.index).trim();
      solution = solMatch[1].trim();
    }

    questions.push({
      id: `q_p4_${parsedQNum}_${Date.now()}_${i}`,
      originalIndex: parsedQNum,
      type: 'essay',
      part: 4,
      stem,
      solution,
      points,
    });
  }

  return questions;
}

function splitEssayQuestionBlocks(text: string): string[] {
  // Split on "Câu 1", "Câu 2 (1,0 điểm):", "Bài 1:" at line starts
  const lines = text.split('\n');
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip section header lines if at start of current block
    if (/^(?:PHẦN\s*|TỰ\s*LUẬN|TRẮC\s*NGHIỆM)/i.test(trimmed) && currentBlock.length === 0) {
      continue;
    }

    const isQStart = /^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+/i.test(trimmed);
    if (isQStart) {
      if (currentBlock.length > 0) {
        const blkText = currentBlock.join('\n').trim();
        if (/^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+/i.test(blkText)) {
          blocks.push(blkText);
        }
        currentBlock = [];
      }
    }
    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    const blkText = currentBlock.join('\n').trim();
    if (/^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+/i.test(blkText)) {
      blocks.push(blkText);
    }
  }

  return blocks.filter((b) => b.length > 5);
}

// -------------------------------------------------------------
// GENERAL QUESTION SPLITTER & FALLBACK
// -------------------------------------------------------------
function splitQuestionBlocks(text: string): string[] {
  // 1. Chuẩn hóa để các tiêu đề "Câu 11:", "Câu 11.", "Bài 2." ở ranh giới đoạn văn/khoảng trắng được đưa ra đầu dòng mới
  // Chú ý: Bỏ qua các cụm từ hướng dẫn thi như "từ câu 1 đến câu 4"
  const normalizedText = text.replace(
    /(?:^|\s+|\n)\s*(?:[-*•]\s*)?(?:\*{0,2})((?<!(?:từ|đến)\s+)(?:Câu|Bài)\s*(?:\d+|auto)[\s.:\)-]?)/gi,
    '\n$1'
  );

  const lines = normalizedText.split('\n');
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Bỏ qua dòng hướng dẫn đầu bài thi
    if (/^(?:thí\s+sinh\s+trả\s+lời|trong\s+mỗi\s+ý|\([0-9.,]+\s*điểm\))/i.test(trimmed) && currentBlock.length === 0) {
      continue;
    }

    const isQStart = /^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*(?:\d+|auto)/i.test(trimmed);
    if (isQStart) {
      if (currentBlock.length > 0) {
        const blk = currentBlock.join('\n').trim();
        if (blk.length > 0) blocks.push(blk);
        currentBlock = [];
      }
    }
    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    const blk = currentBlock.join('\n').trim();
    if (blk.length > 0) blocks.push(blk);
  }

  return blocks.filter((b) => b.length > 5);
}

function parseGeneralQuestions(text: string, answersMap: Record<number, string>): ShufflerQuestion[] {
  const blocks = splitQuestionBlocks(text);
  const questions: ShufflerQuestion[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const qIndex = i + 1;

    // Check if MCQ
    if (/(?:^|\n|\s)\*{0,3}[A-D][\.\:\)]\s*/.test(block) && (/(?:\*|\b)A[\.:\)]/.test(block)) && (/(?:\*|\b)B[\.:\)]/.test(block))) {
      const { stem, options } = extractMcqOptions(block, qIndex, answersMap);
      if (options.length >= 2) {
        questions.push({
          id: `q_gen_${qIndex}_${i}`,
          originalIndex: qIndex,
          type: 'mcq',
          part: 1,
          stem,
          options,
        });
        continue;
      }
    }

    // Check if True/False
    if (/(?:^|\n|\s)[a-d]\)[\.\:\)]?\s*/i.test(block)) {
      const { stem, tfStatements } = extractTfStatements(block, qIndex, answersMap);
      if (tfStatements.length >= 2) {
        questions.push({
          id: `q_gen_${qIndex}_${i}`,
          originalIndex: qIndex,
          type: 'tf',
          part: 2,
          stem,
          tfStatements,
        });
        continue;
      }
    }

    // Default to Short Answer
    let shortAnswer = answersMap[qIndex] || '';
    let cleanStem = block.replace(/^(?:[-*•]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+[:.]\s*(?:\*{0,2})/i, '').trim();
    const ansRegex = /(?:^|\n|\s*)(?:(?:Đáp\s*(?:án|số)|Kết\s*quả|Ans|Answer)[:\s=]+|\bKey\s*[:=]?\s*|\bKey(?=[-+0-9]))([^\n\r]+)/i;
    const ansMatch = cleanStem.match(ansRegex);
    if (ansMatch) {
      if (!shortAnswer) {
        shortAnswer = ansMatch[1]
          .replace(/^\$+|\$+$/g, '')
          .replace(/[.;]+$/, '')
          .trim();
      }
      cleanStem = cleanStem.replace(ansMatch[0], '').trim();
    }

    questions.push({
      id: `q_gen_${qIndex}_${i}`,
      originalIndex: qIndex,
      type: 'sa',
      part: 3,
      stem: cleanStem,
      shortAnswer,
    });
  }

  return questions;
}

function extractExamHeader(text: string) {
  const schoolMatch = text.match(/(?:SỞ\s*GD&ĐT[^\n]+|TRƯỜNG\s*THPT[^\n]+)/i);
  const examNameMatch = text.match(/(?:KIỂM TRA[^\n]+|ĐỀ THI[^\n]+|KHẢO SÁT[^\n]+)/i);
  const subjectMatch = text.match(/(?:MÔN|Môn)[:\s]+([^\n]+)/i);
  const durationMatch = text.match(/(?:Thời gian|Thời lượng)[:\s]+(\d+[\s\w]+)/i);

  return {
    school: schoolMatch ? schoolMatch[0].trim() : '',
    examName: examNameMatch ? examNameMatch[0].trim() : '',
    subject: subjectMatch ? subjectMatch[0].trim() : '',
    duration: durationMatch ? durationMatch[1].trim() : '',
  };
}

// -------------------------------------------------------------
// STEP 2: DETERMINISTIC SHUFFLE ENGINE (100% Client-Side)
// -------------------------------------------------------------
export function generateShuffledVariants(
  exam: ShufflerExam,
  config: ShuffleConfig
): ShuffledExamVariant[] {
  const variants: ShuffledExamVariant[] = [];

  for (let cIdx = 0; cIdx < config.examCodes.length; cIdx++) {
    const code = config.examCodes[cIdx];
    const rng = createPrng(`${code}_${cIdx}_eduplan`);

    // Separate original questions by part
    const part1 = exam.questions.filter((q) => q.part === 1);
    const part2 = exam.questions.filter((q) => q.part === 2);
    const part3 = exam.questions.filter((q) => q.part === 3);
    const part4 = exam.questions.filter((q) => q.part === 4);

    // 1. Shuffle questions order within each part
    const shuffledPart1 = config.shuffleQuestionsPart1 ? shuffleSimpleArray(part1, rng) : [...part1];
    const shuffledPart2 = config.shuffleQuestionsPart2 ? shuffleSimpleArray(part2, rng) : [...part2];
    const shuffledPart3 = config.shuffleQuestionsPart3 ? shuffleSimpleArray(part3, rng) : [...part3];
    const shuffledPart4 = config.shuffleQuestionsPart4 ? shuffleSimpleArray(part4, rng) : [...part4];

    const answerKeyPart1: Record<number, string> = {};
    const answerKeyPart2: Record<number, Record<'a' | 'b' | 'c' | 'd', boolean>> = {};
    const answerKeyPart3: Record<number, string> = {};
    const originalMapping: Record<number, number> = {};

    let currentQNumber = 1;
    const finalQuestions: ShufflerQuestion[] = [];

    // Process Part 1: Options shuffle
    const letters = ['A', 'B', 'C', 'D'];
    for (const originalQ of shuffledPart1) {
      const qNum = currentQNumber++;
      originalMapping[qNum] = originalQ.originalIndex;

      let newOptions: ShufflerOption[] | undefined = undefined;
      if (originalQ.options && originalQ.options.length > 0) {
        let opts = [...originalQ.options];
        if (config.shuffleOptionsPart1) {
          opts = shuffleArrayWithLocks(opts, rng);
        }
        // Assign new display labels A, B, C, D
        newOptions = opts.map((opt, idx) => ({
          ...opt,
          label: letters[idx] || String.fromCharCode(65 + idx),
        }));

        // Find which option is correct to record answer key
        const correctOpt = newOptions.find((o) => o.isCorrect);
        if (correctOpt) {
          answerKeyPart1[qNum] = correctOpt.label;
        }
      }

      finalQuestions.push({
        ...originalQ,
        options: newOptions,
      });
    }

    // Process Part 2: True/False statements shuffle
    const tfLetters: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];
    for (const originalQ of shuffledPart2) {
      const qNum = currentQNumber++;
      originalMapping[qNum] = originalQ.originalIndex;

      let newTf: ShufflerTfStatement[] | undefined = undefined;
      if (originalQ.tfStatements && originalQ.tfStatements.length > 0) {
        let stmts = [...originalQ.tfStatements];
        if (config.shuffleStatementsPart2) {
          stmts = shuffleArrayWithLocks(stmts, rng);
        }
        newTf = stmts.map((st, idx) => ({
          ...st,
          label: tfLetters[idx] || 'a',
        }));

        const keyObj: Record<'a' | 'b' | 'c' | 'd', boolean> = {
          a: false,
          b: false,
          c: false,
          d: false,
        };
        for (const st of newTf) {
          if (['a', 'b', 'c', 'd'].includes(st.label)) {
            keyObj[st.label as 'a' | 'b' | 'c' | 'd'] = !!st.isCorrect;
          }
        }
        answerKeyPart2[qNum] = keyObj;
      }

      finalQuestions.push({
        ...originalQ,
        tfStatements: newTf,
      });
    }

    // Process Part 3: Short answer
    for (const originalQ of shuffledPart3) {
      const qNum = currentQNumber++;
      originalMapping[qNum] = originalQ.originalIndex;

      if (originalQ.shortAnswer) {
        answerKeyPart3[qNum] = originalQ.shortAnswer;
      }

      finalQuestions.push({
        ...originalQ,
      });
    }

    // Process Part 4: Essay (Tự luận)
    for (const originalQ of shuffledPart4) {
      const qNum = currentQNumber++;
      originalMapping[qNum] = originalQ.originalIndex;

      finalQuestions.push({
        ...originalQ,
      });
    }

    variants.push({
      code,
      questions: finalQuestions,
      answerKeyPart1,
      answerKeyPart2,
      answerKeyPart3,
      originalMapping,
    });
  }

  return variants;
}

export const generateShuffledExamVariants = generateShuffledVariants;

// -------------------------------------------------------------
// STEP 3: EXPORT ENGINE (DOCX & ZIP)
// -------------------------------------------------------------

/**
 * Converts LaTeX formula to docx OMML component using KaTeX + mathml2omml-plus
 */
function latexToOmml(latex: string): any {
  if (!latex || !latex.trim()) return new TextRun({ text: '' });
  try {
    let clean = latex.trim().replace(/^\$+|\$+$/g, '').trim();

    // Chuẩn hóa ký hiệu phẩy (prime) như A', B', C', D', y', f' thành A^{\prime}, B^{\prime}, ...
    // Tránh việc KaTeX tạo ra thẻ MathML <msubsup> với <mrow> chỉ số dưới rỗng khiến mml2omml tạo ra <m:sSubSup> có <m:sub><m:e/></m:sub> bị Word hiển thị ô vuông lấm chấm trước dấu phẩy
    clean = clean
      .replace(/([a-zA-Z0-9\)\}\]\>\xFF-\uFFFF])'{3}/g, '$1^{\\prime\\prime\\prime}')
      .replace(/([a-zA-Z0-9\)\}\]\>\xFF-\uFFFF])'{2}/g, '$1^{\\prime\\prime}')
      .replace(/([a-zA-Z0-9\)\}\]\>\xFF-\uFFFF])'/g, '$1^{\\prime}');

    const mathml = katex.renderToString(clean, {
      output: 'mathml',
      throwOnError: false,
    });
    // Extract <math> tag
    const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/i);
    if (mathMatch) {
      let ommlXml = mml2omml(mathMatch[0]);
      if (ommlXml) {
        // 1. Ép buộc tất cả thẻ <m:grow> có thuộc tính m:val="1" (thay thế triệt để m:val="0" hoặc m:val="off" do mml2omml tạo ra khiến dấu ngoặc hệ/hàm số bị nhỏ)
        ommlXml = ommlXml.replace(/<m:grow\b[^/>]*\/?>/gi, '<m:grow m:val="1"/>');
        // 2. Bổ sung <m:grow m:val="1"/> cho bất kỳ thẻ <m:dPr> nào chưa có <m:grow>
        ommlXml = ommlXml.replace(/<m:dPr>(?![\s\S]*?<m:grow)/gi, '<m:dPr><m:grow m:val="1"/>');
        // 3. Căn trái các dòng trong hệ phương trình / ma trận / hàm từng khúc (thay vì center)
        ommlXml = ommlXml.replace(/(<m:mcJc\s+m:val=")center(")/gi, '$1left$2');

        // Khắc phục triệt để lỗi ô vuông dotted square (\square) trước/dưới dấu phẩy (prime) trong Word:
        // 1. Chuyển đổi mọi cấu trúc <m:sSubSup> chứa <m:sub> rỗng thành <m:sSup> sạch
        ommlXml = ommlXml.replace(
          /<m:sSubSup\b([^>]*)>([\s\S]*?)<m:sub>\s*(?:<m:e\s*\/>|<m:e>\s*<\/m:e>|)\s*<\/m:sub>([\s\S]*?)<\/m:sSubSup>/gi,
          (_match, p1, p2, p3) => {
            const body = (p2 + p3).replace(/<m:sSubSupPr/gi, '<m:sSupPr').replace(/<\/m:sSubSupPr>/gi, '</m:sSupPr>');
            return `<m:sSup${p1}>${body}</m:sSup>`;
          }
        );

        // 2. Chuyển đổi mọi cấu trúc <m:sSubSup> chứa <m:sup> rỗng thành <m:sSub>
        ommlXml = ommlXml.replace(
          /<m:sSubSup\b([^>]*)>([\s\S]*?)<m:sup>\s*(?:<m:e\s*\/>|<m:e>\s*<\/m:e>|)\s*<\/m:sup>([\s\S]*?)<\/m:sSubSup>/gi,
          (_match, p1, p2, p3) => {
            const body = (p2 + p3).replace(/<m:sSubSupPr/gi, '<m:sSubPr').replace(/<\/m:sSubSupPr>/gi, '</m:sSubPr>');
            return `<m:sSub${p1}>${body}</m:sSub>`;
          }
        );

        // 3. Loại bỏ triệt để các thẻ <m:sub> hoặc <m:sup> đơn lẻ chứa <m:e/> rỗng còn sót lại
        ommlXml = ommlXml.replace(/<(?:m:sub|m:sup)>\s*(?:<m:e\s*\/>|<m:e>\s*<\/m:e>|)\s*<\/(?:m:sub|m:sup)>/gi, '');

        const comp = ImportedXmlComponent.fromXmlString(ommlXml);
        const root = comp && (comp as any).root && (comp as any).root[0] ? (comp as any).root[0] : comp;
        return root;
      }
    }
  } catch (err) {
    // Fallback to text representation
  }
  return new TextRun({ text: `$${latex.replace(/^\$+|\$+$/g, '')}$`, italics: true, font: 'Cambria Math', size: 24 });
}

/**
 * Parses mixed text with LaTeX ($...$) and image tokens ([[IMG_X]]) into docx Paragraph children
 */
function parseTextWithMathAndImages(
  rawText: string,
  imageStore: Record<string, string>,
  isBold = false
): ParagraphChild[] {
  const children: ParagraphChild[] = [];
  if (!rawText) return children;

  // Split by [[IMG_X]] tokens and $...$
  const tokenRegex = /(\[\[IMG_\d+\]\]|\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      const plainText = rawText.substring(lastIndex, match.index);
      if (plainText) {
        children.push(new TextRun({ text: plainText, bold: isBold, font: 'Times New Roman', size: 24 }));
      }
    }

    const token = match[0];
    if (token.startsWith('[[IMG_')) {
      const imgKey = token.slice(2, -2);
      const dataUrl = imageStore[imgKey];
      if (dataUrl && dataUrl.includes('base64,')) {
        try {
          const base64Data = dataUrl.split('base64,')[1];
          const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          children.push(
            new ImageRun({
              data: buffer,
              transformation: {
                width: 320,
                height: 180,
              },
            })
          );
        } catch (e) {
          children.push(new TextRun({ text: '[Hình ảnh]', italics: true, font: 'Times New Roman', size: 22 }));
        }
      }
    } else if (token.startsWith('$')) {
      children.push(latexToOmml(token));
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < rawText.length) {
    const trailing = rawText.substring(lastIndex);
    if (trailing) {
      children.push(new TextRun({ text: trailing, bold: isBold, font: 'Times New Roman', size: 24 }));
    }
  }

  return children;
}

function appendSectionHeaderToDoc(
  docChildren: any[],
  partNum: number,
  allQuestions: ShufflerQuestion[]
) {
  const p1Count = allQuestions.filter((item) => item.part === 1).length;
  const p2Count = allQuestions.filter((item) => item.part === 2).length;
  const p3Count = allQuestions.filter((item) => item.part === 3).length;
  const p4Count = allQuestions.filter((item) => item.part === 4).length;

  let partTitle = '';
  let partDesc = '';

  if (partNum === 1) {
    partTitle = 'PHẦN I. CÂU HỎI TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN';
    partDesc = p1Count > 0
      ? `Thí sinh trả lời từ câu 1 đến câu ${p1Count}. Mỗi câu hỏi chỉ chọn một phương án.`
      : 'Thí sinh chọn một phương án đúng nhất.';
  } else if (partNum === 2) {
    partTitle = 'PHẦN II. CÂU HỎI TRẮC NGHIỆM ĐÚNG SAI';
    partDesc = p2Count > 0
      ? `Thí sinh trả lời từ câu 1 đến câu ${p2Count}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn Đúng hoặc Sai.`
      : 'Thí sinh chọn Đúng hoặc Sai ở mỗi ý.';
  } else if (partNum === 3) {
    partTitle = 'PHẦN III. CÂU HỎI TRẮC NGHIỆM TRẢ LỜI NGẮN';
    partDesc = p3Count > 0
      ? `Thí sinh trả lời từ câu 1 đến câu ${p3Count}. Điền kết quả số vào phiếu trả lời.`
      : 'Thí sinh điền kết quả số vào phiếu trả lời.';
  } else {
    partTitle = 'PHẦN IV. TỰ LUẬN';
    partDesc = p4Count > 0
      ? `Thí sinh trình bày lời giải chi tiết từ câu 1 đến câu ${p4Count} vào tờ giấy làm bài thi.`
      : 'Thí sinh trình bày lời giải chi tiết vào tờ giấy làm bài thi.';
  }

  docChildren.push(
    new Paragraph({
      spacing: { before: 280, after: 60 },
      children: [
        new TextRun({
          text: partTitle,
          bold: true,
          font: 'Times New Roman',
          size: 26,
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: partDesc,
          italics: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    })
  );
}

/**
 * Builds a clean Word exam document for a specific variant
 */
export async function createDocxForVariant(
  variant: ShuffledExamVariant,
  config: ShuffleConfig,
  imageStore: Record<string, string>
): Promise<Blob> {
  const docChildren: any[] = [];

  // 1. Header Table (School on left, Exam Info & Code on right)
  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: config.header.school || 'SỞ GD&ĐT ................... / TRƯỜNG THPT ...................',
                      bold: true,
                      font: 'Times New Roman',
                      size: 22,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: config.header.examName || 'KỲ THI KHẢO SÁT CHẤT LƯỢNG',
                      bold: true,
                      font: 'Times New Roman',
                      size: 22,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '(Đề thi có ..... trang)',
                      italics: true,
                      font: 'Times New Roman',
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: config.header.subject || 'BÀI THI MÔN: TOÁN HỌC',
                      bold: true,
                      font: 'Times New Roman',
                      size: 24,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `Thời gian làm bài: ${config.header.duration || '90 phút'}`,
                      font: 'Times New Roman',
                      size: 20,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `MÃ ĐỀ THI: ${variant.code}`,
                      bold: true,
                      font: 'Times New Roman',
                      size: 26,
                      color: '1E3A8A',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Student info line
  docChildren.push(
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: 'Họ và tên thí sinh: ......................................................................... Số báo danh: .............................',
          font: 'Times New Roman',
          size: 22,
          italics: true,
        }),
      ],
    })
  );

  let currentPart = 0;
  let qNumInPart = 1;

  for (const q of variant.questions) {
    // Print Part Header if changed
    if (q.part !== currentPart) {
      currentPart = q.part;
      qNumInPart = 1; // Reset question numbering for each Part!
      appendSectionHeaderToDoc(docChildren, currentPart, variant.questions);
    }

    // Print Question Stem
    const qPrefix = `Câu ${qNumInPart}${q.points ? ` ${q.points}` : ''}: `;
    const stemRuns = parseTextWithMathAndImages(q.stem, imageStore);
    docChildren.push(
      new Paragraph({
        spacing: { before: 180, after: 80 },
        children: [
          new TextRun({
            text: qPrefix,
            bold: true,
            font: 'Times New Roman',
            size: 24,
          }),
          ...stemRuns,
        ],
      })
    );

    // Print Options for Part 1
    if (q.part === 1 && q.options && q.options.length > 0) {
      const maxOptLen = Math.max(...q.options.map((o) => o.text.length));
      if (maxOptLen <= 25 && q.options.length === 4) {
        // 4 options in 1 row table
        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            },
            rows: [
              new TableRow({
                children: q.options.map((opt) => {
                  const runs = parseTextWithMathAndImages(opt.text, imageStore);
                  return new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: `${opt.label}. `,
                            bold: true,
                            font: 'Times New Roman',
                            size: 24,
                          }),
                          ...runs,
                        ],
                      }),
                    ],
                  });
                }),
              }),
            ],
          })
        );
      } else if (maxOptLen <= 55 && q.options.length === 4) {
        // 2x2 grid table
        const row1 = q.options.slice(0, 2);
        const row2 = q.options.slice(2, 4);
        docChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            },
            rows: [row1, row2].map(
              (row) =>
                new TableRow({
                  children: row.map((opt) => {
                    const runs = parseTextWithMathAndImages(opt.text, imageStore);
                    return new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          spacing: { before: 60, after: 60 },
                          children: [
                            new TextRun({
                              text: `${opt.label}. `,
                              bold: true,
                              font: 'Times New Roman',
                              size: 24,
                            }),
                            ...runs,
                          ],
                        }),
                      ],
                    });
                  }),
                })
            ),
          })
        );
      } else {
        // 1 option per line
        for (const opt of q.options) {
          const runs = parseTextWithMathAndImages(opt.text, imageStore);
          docChildren.push(
            new Paragraph({
              indent: { left: 400 },
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: `${opt.label}. `,
                  bold: true,
                  font: 'Times New Roman',
                  size: 24,
                }),
                ...runs,
              ],
            })
          );
        }
      }
    }

    // Print Statements for Part 2
    if (q.part === 2 && q.tfStatements && q.tfStatements.length > 0) {
      for (const st of q.tfStatements) {
        const runs = parseTextWithMathAndImages(st.text, imageStore);
        docChildren.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text: `${st.label}) `,
                bold: true,
                font: 'Times New Roman',
                size: 24,
              }),
              ...runs,
            ],
          })
        );
      }
    }

    // Print Answer fill line for Part 3
    if (q.part === 3) {
      docChildren.push(
        new Paragraph({
          indent: { left: 400 },
          spacing: { before: 60, after: 80 },
          children: [
            new TextRun({
              text: 'Trả lời: ................................................................',
              italics: true,
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        })
      );
    }

    qNumInPart++;
  }

  // Footer: End of exam marker
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: `---------- HẾT MÃ ĐỀ ${variant.code} ----------`,
          bold: true,
          font: 'Times New Roman',
          size: 22,
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              bottom: 1134,
              left: 1417, // ~2.5cm
              right: 1134,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Creates the Master Answer Key Comparison Matrix docx and detailed essay rubric
 */
export async function createMasterAnswerKeyDocx(
  variants: ShuffledExamVariant[],
  config: ShuffleConfig,
  imageStore: Record<string, string> = {}
): Promise<Blob> {
  const docChildren: any[] = [];

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'BẢNG MA TRẬN ĐÁP ÁN SO SÁNH GIỮA CÁC MÃ ĐỀ',
          bold: true,
          font: 'Times New Roman',
          size: 28,
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 300 },
      children: [
        new TextRun({
          text: `Môn: ${config.header.subject || 'Toán học'} • Số lượng mã đề: ${variants.length}`,
          font: 'Times New Roman',
          size: 22,
          italics: true,
        }),
      ],
    })
  );

  const codes = variants.map((v) => v.code);
  const totalQuestions = variants[0]?.questions.length || 0;

  // Header Row
  const headerCells = [
    new TableCell({
      width: { size: 15, type: WidthType.PERCENTAGE },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Câu', bold: true, size: 22 })] })],
    }),
    ...codes.map(
      (code) =>
        new TableCell({
          width: { size: 85 / codes.length, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Mã ${code}`, bold: true, size: 22 })] })],
        })
    ),
  ];

  const tableRows: TableRow[] = [new TableRow({ children: headerCells })];

  for (let q = 1; q <= totalQuestions; q++) {
    // Determine which part question q belongs to
    const firstVarQ = variants[0]?.questions[q - 1];
    const isP1 = firstVarQ?.part === 1;
    const isP2 = firstVarQ?.part === 2;
    const isP3 = firstVarQ?.part === 3;
    const isP4 = firstVarQ?.part === 4;

    const rowCells = [
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${q} ${isP1 ? '(I)' : isP2 ? '(II)' : isP3 ? '(III)' : '(TL)'}`,
                bold: true,
                size: 20,
              }),
            ],
          }),
        ],
      }),
      ...variants.map((v) => {
        let ansText = '-';
        if (isP1) {
          ansText = v.answerKeyPart1[q] || '-';
        } else if (isP2) {
          const tf = v.answerKeyPart2[q];
          if (tf) {
            ansText = `a:${tf.a ? 'Đ' : 'S'} b:${tf.b ? 'Đ' : 'S'} c:${tf.c ? 'Đ' : 'S'} d:${tf.d ? 'Đ' : 'S'}`;
          }
        } else if (isP3) {
          ansText = v.answerKeyPart3[q] || '-';
        } else if (isP4) {
          ansText = 'Xem đáp án TL';
        }

        return new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: ansText,
                  bold: isP1,
                  size: isP2 ? 18 : 20,
                }),
              ],
            }),
          ],
        });
      }),
    ];

    tableRows.push(new TableRow({ children: rowCells }));
  }

  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    })
  );

  // Appending Essay Grading Rubric & Detailed Solutions for Teachers
  const essayQuestions = variants[0]?.questions.filter((q) => q.part === 4) || [];
  if (essayQuestions.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 120 },
        children: [
          new TextRun({
            text: 'HƯỚNG DẪN CHẤM & LỜI GIẢI CHI TIẾT PHẦN TỰ LUẬN',
            bold: true,
            font: 'Times New Roman',
            size: 26,
            color: '1E3A8A',
          }),
        ],
      })
    );

    for (const eq of essayQuestions) {
      const stemRuns = parseTextWithMathAndImages(eq.stem, imageStore);
      docChildren.push(
        new Paragraph({
          spacing: { before: 180, after: 80 },
          children: [
            new TextRun({
              text: `Câu ${eq.originalIndex}${eq.points ? ` ${eq.points}` : ''}: `,
              bold: true,
              font: 'Times New Roman',
              size: 24,
            }),
            ...stemRuns,
          ],
        })
      );

      if (eq.solution) {
        const solRuns = parseTextWithMathAndImages(eq.solution, imageStore);
        docChildren.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 80, after: 160 },
            children: [
              new TextRun({
                text: 'Hướng dẫn chấm / Lời giải chi tiết:\n',
                bold: true,
                italics: true,
                font: 'Times New Roman',
                size: 22,
                color: '047857',
              }),
              ...solRuns,
            ],
          })
        );
      } else {
        docChildren.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 60, after: 120 },
            children: [
              new TextRun({
                text: '(Chưa cập nhật nội dung hướng dẫn chấm trong đề gốc)',
                italics: true,
                font: 'Times New Roman',
                size: 20,
                color: '64748B',
              }),
            ],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Exports all shuffled exam variants and Master Answer key as a single ZIP file
 */
export async function exportAllVariantsAsZip(
  variants: ShuffledExamVariant[],
  config: ShuffleConfig,
  imageStore: Record<string, string>
): Promise<void> {
  const zip = new JSZip();

  // 1. Generate individual docx for each variant
  for (const v of variants) {
    const docBlob = await createDocxForVariant(v, config, imageStore);
    zip.file(`De_Thi_Ma_${v.code}.docx`, docBlob);
  }

  // 2. Generate Master Answer Key table & Essay Rubric
  const keyBlob = await createMasterAnswerKeyDocx(variants, config, imageStore);
  zip.file(`Bang_Dap_An_Ma_Tran_Cac_Ma_De.docx`, keyBlob);

  // 3. Generate Combined docx with page breaks
  const combinedBlob = await createCombinedDocx(variants, config, imageStore);
  zip.file(`File_Gop_Tat_Ca_Ma_De.docx`, combinedBlob);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = `Bo_De_Tron_${config.header.subject ? config.header.subject.replace(/[^a-zA-Z0-9à-ỹ]/gi, '_') : 'Exam'}_${Date.now()}.zip`;
  saveAs(zipBlob, filename);
}

/**
 * Creates a single combined docx file containing all variants separated by PageBreak
 */
export async function createCombinedDocx(
  variants: ShuffledExamVariant[],
  config: ShuffleConfig,
  imageStore: Record<string, string>
): Promise<Blob> {
  const combinedDocChildren: any[] = [];

  for (let idx = 0; idx < variants.length; idx++) {
    const v = variants[idx];
    if (idx > 0) {
      combinedDocChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Official GDPT 2018 Header table for variant
    combinedDocChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 55, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: config.header.school || 'SỞ GD&ĐT ................... / TRƯỜNG THPT ...................',
                        bold: true,
                        font: 'Times New Roman',
                        size: 22,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: config.header.examName || 'KỲ THI KHẢO SÁT CHẤT LƯỢNG',
                        bold: true,
                        font: 'Times New Roman',
                        size: 22,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 45, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: config.header.subject || 'BÀI THI MÔN: TOÁN HỌC',
                        bold: true,
                        font: 'Times New Roman',
                        size: 24,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: `MÃ ĐỀ THI: ${v.code}`,
                        bold: true,
                        font: 'Times New Roman',
                        size: 26,
                        color: '1E3A8A',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 180, after: 180 },
        children: [
          new TextRun({
            text: 'Họ và tên thí sinh: ......................................................................... Số báo danh: .............................',
            font: 'Times New Roman',
            size: 22,
            italics: true,
          }),
        ],
      })
    );

    // Add questions with Section headers (PHẦN I, PHẦN II, PHẦN III, PHẦN IV)
    let currentPart = 0;
    let qNumInPart = 1;

    for (const q of v.questions) {
      if (q.part !== currentPart) {
        currentPart = q.part;
        qNumInPart = 1; // Reset numbering to 1 for each Part!
        appendSectionHeaderToDoc(combinedDocChildren, currentPart, v.questions);
      }

      const qPrefix = `Câu ${qNumInPart}${q.points ? ` ${q.points}` : ''}: `;
      const runs = parseTextWithMathAndImages(q.stem, imageStore);
      combinedDocChildren.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [new TextRun({ text: qPrefix, bold: true, size: 24 }), ...runs],
        })
      );

      if (q.part === 1 && q.options) {
        for (const opt of q.options) {
          const optRuns = parseTextWithMathAndImages(opt.text, imageStore);
          combinedDocChildren.push(
            new Paragraph({
              indent: { left: 400 },
              children: [new TextRun({ text: `${opt.label}. `, bold: true, size: 24 }), ...optRuns],
            })
          );
        }
      } else if (q.part === 2 && q.tfStatements) {
        for (const st of q.tfStatements) {
          const stRuns = parseTextWithMathAndImages(st.text, imageStore);
          combinedDocChildren.push(
            new Paragraph({
              indent: { left: 400 },
              children: [new TextRun({ text: `${st.label}) `, bold: true, size: 24 }), ...stRuns],
            })
          );
        }
      } else if (q.part === 3) {
        combinedDocChildren.push(
          new Paragraph({
            indent: { left: 400 },
            children: [new TextRun({ text: 'Trả lời: .......................................', italics: true, size: 22 })],
          })
        );
      }

      qNumInPart++;
    }

    combinedDocChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 200 },
        children: [
          new TextRun({
            text: `---------- HẾT MÃ ĐỀ ${v.code} ----------`,
            bold: true,
            font: 'Times New Roman',
            size: 22,
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1417, right: 1134 } } },
        children: combinedDocChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

// -------------------------------------------------------------
// STEP 4: SAMPLE TEMPLATE DOCX GENERATOR (.docx Blob)
// -------------------------------------------------------------
export async function downloadSampleExamDocx(): Promise<void> {
  const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="150" viewBox="0 0 450 150">
    <rect width="450" height="150" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <line x1="80" y1="0" x2="80" y2="150" stroke="#64748b" stroke-width="1.5"/>
    <line x1="0" y1="45" x2="450" y2="45" stroke="#64748b" stroke-width="1.5"/>
    <line x1="0" y1="90" x2="450" y2="90" stroke="#64748b" stroke-width="1.5"/>
    <text x="35" y="30" font-family="Times New Roman" font-size="18" font-style="italic">x</text>
    <text x="30" y="75" font-family="Times New Roman" font-size="18" font-style="italic">y'</text>
    <text x="35" y="130" font-family="Times New Roman" font-size="18" font-style="italic">y</text>
    <text x="100" y="30" font-family="Times New Roman" font-size="16">-∞</text>
    <text x="230" y="30" font-family="Times New Roman" font-size="16">1</text>
    <text x="380" y="30" font-family="Times New Roman" font-size="16">+∞</text>
    <text x="160" y="75" font-family="Times New Roman" font-size="18">+</text>
    <text x="230" y="75" font-family="Times New Roman" font-size="18">0</text>
    <text x="300" y="75" font-family="Times New Roman" font-size="18">-</text>
    <text x="100" y="140" font-family="Times New Roman" font-size="16">-∞</text>
    <text x="230" y="110" font-family="Times New Roman" font-size="18" font-weight="bold">3</text>
    <text x="380" y="140" font-family="Times New Roman" font-size="16">-∞</text>
    <line x1="120" y1="135" x2="210" y2="112" stroke="#2563eb" stroke-width="2" marker-end="url(#arrow)"/>
    <line x1="250" y1="112" x2="350" y2="135" stroke="#2563eb" stroke-width="2"/>
  </svg>`;

  // Convert SVG to PNG base64 for embedding into docx
  let samplePngBuffer: Uint8Array | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 450;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const img = new Image();
      const svgBlob = new Blob([sampleSvg], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          resolve(true);
        };
        img.src = blobURL;
      });
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split('base64,')[1];
      samplePngBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    }
  } catch (e) {
    // Canvas fallback
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1417, right: 1134 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'SỞ GD&ĐT ................... / TRƯỜNG THPT ...................', bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'ĐỀ THI MẪU CHUẨN GDPT 2018 (DÙNG CHO TRỘN ĐỀ)', bold: true, size: 26, color: '1E3A8A' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'Môn: Toán học • Thời gian: 90 phút (Mã đề gốc: 100)', italics: true, size: 22 }),
            ],
          }),

          // PHẦN I
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.', bold: true, size: 24 })],
          }),
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({ text: 'Câu 1. ', bold: true, size: 24 }),
              new TextRun({ text: 'Cho hàm số $y = f(x)$ có bảng biến thiên như hình vẽ dưới đây:', size: 24 }),
            ],
          }),
          ...(samplePngBuffer
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new ImageRun({ data: samplePngBuffer, transformation: { width: 320, height: 110 } })],
                }),
              ]
            : []),
          new Paragraph({
            children: [new TextRun({ text: 'Giá trị cực đại của hàm số đã cho bằng:', size: 24 })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '*A. ', bold: true, size: 24, color: 'DC2626' }),
              new TextRun({ text: '$3$', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'B. ', bold: true, size: 24 }),
              new TextRun({ text: '$1$', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'C. ', bold: true, size: 24 }),
              new TextRun({ text: '$-∞$', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '#D. ', bold: true, size: 24 }),
              new TextRun({ text: 'Không tồn tại (Cố định bằng #)', italics: true, size: 24 }),
            ],
          }),

          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({ text: 'Câu 2. ', bold: true, size: 24 }),
              new TextRun({ text: 'Tập xác định của hàm số $y = \\frac{1}{\\sqrt{x - 2}}$ là:', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'A. ', bold: true, size: 24 }),
              new TextRun({ text: '$D = [2; +\\infty)$', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '*B. ', bold: true, size: 24, color: 'DC2626' }),
              new TextRun({ text: '$D = (2; +\\infty)$', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'C. ', bold: true, size: 24 }),
              new TextRun({ text: '$D = \\mathbb{R} \\setminus \\{2\\}$', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'D. ', bold: true, size: 24 }),
              new TextRun({ text: '$D = (-\\infty; 2)$', size: 24 }),
            ],
          }),

          // PHẦN II
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 80 },
            children: [new TextRun({ text: 'PHẦN II. Câu trắc nghiệm đúng sai.', bold: true, size: 24 })],
          }),
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({ text: 'Câu 3. ', bold: true, size: 24 }),
              new TextRun({ text: 'Cho hàm số bậc ba $y = f(x) = x^3 - 3x + 1$. Xét tính đúng sai của các khẳng định sau:', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'a) ', bold: true, underline: {}, size: 24, color: 'DC2626' }),
              new TextRun({ text: 'Đạo hàm của hàm số là $f\'(x) = 3x^2 - 3$. (Có gạch chân là ĐÚNG)', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'b) ', bold: true, underline: {}, size: 24, color: 'DC2626' }),
              new TextRun({ text: 'Hàm số đồng biến trên các khoảng $(-\\infty; -1)$ và $(1; +\\infty)$. (Có gạch chân là ĐÚNG)', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'c) ', bold: true, size: 24 }),
              new TextRun({ text: 'Giá trị cực tiểu của hàm số bằng $3$. (Không gạch chân là SAI)', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'd) ', bold: true, size: 24 }),
              new TextRun({ text: 'Đồ thị hàm số đi qua gốc tọa độ $O(0; 0)$. (Không gạch chân là SAI)', size: 24 }),
            ],
          }),

          // PHẦN III
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 80 },
            children: [new TextRun({ text: 'PHẦN III. Câu trắc nghiệm trả lời ngắn.', bold: true, size: 24 })],
          }),
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({ text: 'Câu 4. ', bold: true, size: 24 }),
              new TextRun({ text: 'Tìm giá trị nhỏ nhất của hàm số $y = x + \\frac{4}{x}$ trên khoảng $(0; +\\infty)$.', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Key: 4', bold: true, size: 24, color: 'DC2626' })],
          }),

          // PHẦN IV. TỰ LUẬN
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 80 },
            children: [new TextRun({ text: 'PHẦN IV. Câu hỏi tự luận.', bold: true, size: 24 })],
          }),
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({ text: 'Câu 5 (1,5 điểm). ', bold: true, size: 24 }),
              new TextRun({ text: 'Cho hàm số $y = \\frac{x + 1}{x - 1}$.', size: 24 }),
            ],
          }),
          new Paragraph({
            indent: { left: 400 },
            children: [new TextRun({ text: 'a) Khảo sát sự biến thiên và vẽ đồ thị $(C)$ của hàm số.', size: 24 })],
          }),
          new Paragraph({
            indent: { left: 400 },
            children: [new TextRun({ text: 'b) Viết phương trình tiếp tuyến của $(C)$ tại điểm có hoành độ $x_0 = 2$.', size: 24 })],
          }),
          new Paragraph({
            spacing: { before: 80, after: 40 },
            indent: { left: 400 },
            children: [
              new TextRun({ text: 'Hướng dẫn chấm:', bold: true, italics: true, size: 22, color: '047857' }),
            ],
          }),
          new Paragraph({
            indent: { left: 600 },
            children: [
              new TextRun({ text: 'a) Tập xác định $D = \\mathbb{R} \\setminus \\{1\\}$. Đạo hàm $y\' = -\\frac{2}{(x-1)^2} < 0, \\forall x \\ne 1$. Hàm số nghịch biến trên từng khoảng xác định. (0,75 điểm)', size: 22 }),
            ],
          }),
          new Paragraph({
            indent: { left: 600 },
            children: [
              new TextRun({ text: 'b) Với $x_0 = 2 \\Rightarrow y(2) = 3$. Hệ số góc $k = y\'(2) = -2$. Phương trình tiếp tuyến: $y = -2(x - 2) + 3 \\Leftrightarrow y = -2x + 7$. (0,75 điểm)', size: 22 }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'De_Thi_Mau_Chuan_4_Phan_GDPT2018.docx');
}

/**
 * Tải file PDF mẫu chuẩn định dạng GDPT 2018 gồm 4 phần
 */
export async function downloadSampleExamPdf(): Promise<void> {
  const container = document.createElement('div');
  container.style.padding = '24px';
  container.style.fontFamily = 'Times New Roman, Arial, sans-serif';
  container.style.fontSize = '13px';
  container.style.lineHeight = '1.6';
  container.style.color = '#0f172a';
  container.style.backgroundColor = '#ffffff';

  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px; border-b: 1px solid #cbd5e1; padding-bottom: 12px;">
      <h3 style="margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">SỞ GD&ĐT ................... / TRƯỜNG THPT ...................</h3>
      <h2 style="margin: 6px 0; font-size: 16px; font-weight: bold; color: #1e3a8a;">ĐỀ KIỂM TRA MẪU CHUẨN GDPT 2018 (4 PHẦN)</h2>
      <p style="margin: 0; font-size: 13px; font-style: italic; color: #334155;">Môn: TOÁN HỌC — Thời gian làm bài: 90 phút (Không kể thời gian phát đề)</p>
    </div>

    <!-- PHẦN I -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin: 0 0 4px 0; background: #eff6ff; padding: 4px 8px; border-left: 4px solid #2563eb;">
        PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn. (3,0 điểm)
      </h3>
      <p style="font-size: 11px; font-style: italic; color: #64748b; margin: 0 0 10px 0;">
        Thí sinh trả lời từ câu 1 đến câu 12. Trong mỗi câu hỏi, thí sinh chỉ chọn một phương án.
      </p>

      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 2px 0;"><b>Câu 1.</b> Một cung tròn có số đo là 5π/4. Tìm số đo độ của cung tròn đó.</p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding-left: 12px;">
          <div>A. 15°.</div>
          <div>B. 5°.</div>
          <div style="font-weight: bold; color: #dc2626;">*C. 225°.</div>
          <div>D. 172°.</div>
        </div>
      </div>

      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 2px 0;"><b>Câu 2.</b> Hàm số y = sin x có chu kì là:</p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding-left: 12px;">
          <div style="font-weight: bold; color: #dc2626;">*A. 2π.</div>
          <div>B. π/2.</div>
          <div>C. π.</div>
          <div>D. -2π.</div>
        </div>
      </div>

      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 2px 0;"><b>Câu 3.</b> Cho dãy số (u_n) được xác định bởi u_n = 2n - 1 với n ≥ 1. Số hạng u_5 bằng:</p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding-left: 12px;">
          <div style="font-weight: bold; color: #dc2626;">*A. 9.</div>
          <div>B. 10.</div>
          <div>C. 5.</div>
          <div>D. 4.</div>
        </div>
      </div>

      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 2px 0;"><b>Câu 4.</b> Cho cấp số nhân (u_n) có u_9 = -5 và u_10 = 1. Tìm công bội q của cấp số nhân đã cho:</p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding-left: 12px;">
          <div>A. q = -5.</div>
          <div style="font-weight: bold; color: #dc2626;">*B. q = -1/5.</div>
          <div>C. q = -6.</div>
          <div>D. q = 6.</div>
        </div>
      </div>
    </div>

    <!-- PHẦN II -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin: 0 0 4px 0; background: #eff6ff; padding: 4px 8px; border-left: 4px solid #2563eb;">
        PHẦN II. Câu trắc nghiệm đúng sai. (2,0 điểm)
      </h3>
      <p style="font-size: 11px; font-style: italic; color: #64748b; margin: 0 0 10px 0;">
        Thí sinh trả lời từ câu 1 đến câu 2. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
      </p>

      <div style="margin-bottom: 12px;">
        <p style="margin: 0 0 4px 0;"><b>Câu 1.</b> Cho tứ diện ABCD. Gọi M, N lần lượt là trung điểm của hai cạnh AB, CD và G là trọng tâm của tam giác BCD.</p>
        <div style="padding-left: 12px;">
          <div><u>a)</u> Hai đường thẳng AB và CD cắt nhau. <span style="color: #059669; font-weight: bold;">(ĐÚNG)</span></div>
          <div><u>b)</u> Đường thẳng MN nằm trong mặt phẳng (MCD). <span style="color: #059669; font-weight: bold;">(ĐÚNG)</span></div>
          <div>c) M là điểm chung của hai mặt phẳng (ABD) và (ABC). <span style="color: #dc2626;">(SAI)</span></div>
          <div>d) Hai mặt phẳng (ABG) và (ACD) cắt nhau theo giao tuyến là đường thẳng AC. <span style="color: #dc2626;">(SAI)</span></div>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <p style="margin: 0 0 4px 0;"><b>Câu 2.</b> Cho hình chóp S.ABCD có ABCD là hình bình hành tâm O và M là trung điểm của SA.</p>
        <div style="padding-left: 12px;">
          <div>a) Hai đường thẳng AC và BD song song với nhau. <span style="color: #dc2626;">(SAI)</span></div>
          <div><u>b)</u> Đường thẳng OM cắt mặt phẳng (SBC). <span style="color: #059669; font-weight: bold;">(ĐÚNG)</span></div>
          <div><u>c)</u> Đường thẳng OM song song với mặt phẳng (SCD). <span style="color: #059669; font-weight: bold;">(ĐÚNG)</span></div>
          <div>d) Giao tuyến của hai mặt phẳng (SAD) và (SBC) là đường thẳng SO. <span style="color: #dc2626;">(SAI)</span></div>
        </div>
      </div>
    </div>

    <!-- PHẦN III -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin: 0 0 4px 0; background: #eff6ff; padding: 4px 8px; border-left: 4px solid #2563eb;">
        PHẦN III. Câu trắc nghiệm trả lời ngắn. (2,0 điểm)
      </h3>
      <p style="font-size: 11px; font-style: italic; color: #64748b; margin: 0 0 10px 0;">
        Thí sinh trả lời từ câu 1 đến câu 4. Điền đáp án số ngay bên dưới mỗi câu theo cú pháp &lt;Key= giá trị&gt;.
      </p>

      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 2px 0;"><b>Câu 1:</b> Biết tất cả các nghiệm của phương trình cos(x + 60°) + 1 = 0 có dạng x = a° + k360° (k ∈ ℤ, 0° &lt; a° &lt; 360°). Tìm a.</p>
        <p style="margin: 0 0 0 12px; font-weight: bold; color: #dc2626;">&lt;Key= 120&gt;</p>
      </div>

      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 2px 0;"><b>Câu 2:</b> Cho hai số thực a và b thỏa mãn lim_{x → +∞} ((4x^2 + 1)/(x + 1) - ax + b) = 3. Khi đó T = a - 3b có giá trị bằng bao nhiêu?</p>
        <p style="margin: 0 0 0 12px; font-weight: bold; color: #dc2626;">&lt;Key= -17&gt;</p>
      </div>

      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 2px 0;"><b>Câu 3:</b> Tính giới hạn lim_{n → +∞} √(4n^2 + 2n) / (1 + 3n) (kết quả làm tròn đến chữ số thập phân thứ hai).</p>
        <p style="margin: 0 0 0 12px; font-weight: bold; color: #dc2626;">&lt;Key= 0,67&gt;</p>
      </div>

      <div style="margin-bottom: 10px;">
        <p style="margin: 0 0 2px 0;"><b>Câu 4:</b> Cho hình chóp S.ABCD có ABCD là hình thang có đáy lớn AD và M là điểm thuộc SA sao cho SM = (2/3)SA. Gọi I là giao điểm của SD và mp(MBC). Tính tỉ số SD/ID.</p>
        <p style="margin: 0 0 0 12px; font-weight: bold; color: #dc2626;">&lt;Key= 3&gt;</p>
      </div>
    </div>

    <!-- PHẦN IV -->
    <div style="margin-bottom: 12px;">
      <h3 style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin: 0 0 4px 0; background: #eff6ff; padding: 4px 8px; border-left: 4px solid #2563eb;">
        PHẦN IV. TỰ LUẬN. (3,0 điểm)
      </h3>

      <div style="margin-bottom: 12px;">
        <p style="margin: 0 0 2px 0;"><b>Câu 1 (1,0 điểm - TH):</b></p>
        <div style="padding-left: 12px;">
          <p style="margin: 0 0 2px 0;">a) Tính lim_{n → +∞} (2n + 1) / (n - 1).</p>
          <p style="margin: 0 0 4px 0;">b) Cho hàm số f(x) = (x^2 + x - 2)/(x - 1) khi x ≠ 1, và f(1) = a. Tìm a để hàm số liên tục tại x = 1.</p>
          <p style="margin: 4px 0 0 0; font-style: italic; color: #047857; font-weight: bold;">Hướng dẫn chấm:</p>
          <p style="margin: 0 0 0 10px; color: #047857;">a) lim_{n → +∞} (2n + 1) / (n - 1) = 2. (0,5 điểm)</p>
          <p style="margin: 0 0 0 10px; color: #047857;">b) lim_{x → 1} f(x) = 3 ⇒ a = 3. (0,5 điểm)</p>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <p style="margin: 0 0 2px 0;"><b>Câu 2 (1,0 điểm - VDT):</b></p>
        <div style="padding-left: 12px;">
          <p style="margin: 0 0 2px 0;">Cho hình chóp S.ABCD có đáy ABCD là hình bình hành tâm O. Gọi I là trung điểm của AO, mp(α) đi qua I và song song với SA, AB.</p>
          <p style="margin: 0 0 2px 0;">a) Tìm giao tuyến của mp(α) và mp(ABCD).</p>
          <p style="margin: 0 0 2px 0;">b) Xác định giao điểm của đường thẳng SC với mp(α).</p>
        </div>
      </div>
    </div>
  `;

  const opt = {
    margin: [10, 10, 10, 10],
    filename: 'De_Thi_Mau_Chuan_4_Phan_GDPT2018.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    // @ts-ignore
    if (window.html2pdf) {
      // @ts-ignore
      await window.html2pdf().set(opt).from(container).save();
    } else {
      const html2pdfModule = await import('html2pdf.js');
      const h2p = html2pdfModule.default || html2pdfModule;
      await h2p().set(opt).from(container).save();
    }
  } catch (err) {
    console.error('Error exporting PDF:', err);
    alert('Không thể tải PDF. Hệ thống sẽ mở khung in để bạn lưu PDF.');
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`<html><head><title>Đề thi mẫu PDF</title></head><body>${container.innerHTML}</body></html>`);
      printWin.document.close();
      printWin.print();
    }
  }
}

/**
 * Chuyển đổi danh sách mã đề đã trộn sang bộ đáp án chuẩn OMR Scanner
 */
export function convertShuffledVariantsToOmrKeys(
  variants: ShuffledExamVariant[]
): Record<string, import('./omrScannerService').OMRExamKey> {
  const result: Record<string, import('./omrScannerService').OMRExamKey> = {};
  for (const v of variants) {
    result[v.code] = {
      code: v.code,
      part1: v.answerKeyPart1,
      part2: v.answerKeyPart2,
      part3: v.answerKeyPart3,
    };
  }
  return result;
}

