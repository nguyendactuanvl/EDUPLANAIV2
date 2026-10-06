import katex from 'katex';
import { mml2omml } from 'mathml2omml-plus';
import { sanitizeLatexString } from './utils';

/**
 * Chuẩn hóa mã LaTeX thành định dạng tương thích tối đa với tính năng Word Equation (Alt + =)
 */
export function latexToWordAltEqual(rawTex: string): string {
  if (!rawTex) return '';
  let tex = sanitizeLatexString(rawTex.trim())
    .replace(/^\\\[|\\\]$/g, '')
    .replace(/^\\\(|\\\)$/g, '')
    .replace(/^\\\$|\\\$$/g, '')
    .replace(/^\${1,2}|\${1,2}$/g, '')
    .replace(/\\dotfill\b/g, '')
    .trim();

  // Đổi dfrac -> frac
  tex = tex.replace(/\\dfrac\b/g, '\\frac');

  // Đảm bảo không bị thiếu delimiter \right. khi có \left[
  const leftBracketCount = (tex.match(/\\left\s*\[/g) || []).length;
  const rightBracketCount = (tex.match(/\\right\s*[.\]\)\}]/g) || []).length;
  if (leftBracketCount > rightBracketCount) {
    tex += ' \\right.';
  }

  return tex;
}

/**
 * Chuyển đổi mã LaTeX sang MathML (W3C Standard)
 */
export function latexToMathML(rawTex: string, isBlock: boolean = false): string {
  if (!rawTex) return '';
  const cleanTex = latexToWordAltEqual(rawTex);
  try {
    const mathmlHtml = katex.renderToString(cleanTex, {
      displayMode: isBlock,
      output: 'mathml',
      throwOnError: false,
    });
    const match = mathmlHtml.match(/<math[\s\S]*?<\/math>/i);
    return match ? match[0] : '';
  } catch (err) {
    console.warn('Lỗi chuyển đổi MathML:', err);
    return '';
  }
}

/**
 * Chuyển đổi mã LaTeX sang OMML XML (<m:oMath>...</m:oMath>) của Microsoft Word
 */
export function latexToOMML(rawTex: string, isBlock: boolean = false): string {
  const mathml = latexToMathML(rawTex, isBlock);
  if (!mathml) return '';
  try {
    const convertFn = typeof mml2omml === 'function' ? mml2omml : ((mml2omml as any)?.mml2omml || (mml2omml as any)?.default || mml2omml);
    let omml = convertFn(mathml);
    if (omml && omml.includes('m:oMath')) {
      // Tối ưu hóa dấu ngoặc nhọn hệ phương trình/bất phương trình (\begin{cases}, \left\{...) sang cấu trúc OMML Stretchy Delimiter <m:d>
      // Bắt mọi trường hợp dấu { đứng trước ma trận <m:m> hoặc <m:eqArr> (kể cả có xml:space="preserve")
      omml = omml.replace(
        /(?:<m:r[^>]*>[\s\S]*?<m:t[^>]*>\s*\{\s*<\/m:t>[\s\S]*?<\/m:r>\s*)(<(?:m:eqArr|m:m)[\s\S]*?<\/(?:m:eqArr|m:m)>)/g,
        '<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/><m:grow m:val="1"/></m:dPr><m:e>$1</m:e></m:d>'
      );

      // Tối ưu hóa dấu ngoặc vuông hệ tuyển nghiệm lượng giác (\left[...) sang OMML Stretchy Delimiter <m:d>
      omml = omml.replace(
        /(?:<m:r[^>]*>[\s\S]*?<m:t[^>]*>\s*\[\s*<\/m:t>[\s\S]*?<\/m:r>\s*)(<(?:m:eqArr|m:m)[\s\S]*?<\/(?:m:eqArr|m:m)>)/g,
        '<m:d><m:dPr><m:begChr m:val="["/><m:endChr m:val=""/><m:grow m:val="1"/></m:dPr><m:e>$1</m:e></m:d>'
      );

      // Căn trái nội dung trong hệ phương trình/bất phương trình để trình bày chuẩn mực trong Word
      omml = omml.replace(/(<m:dPr><m:begChr m:val="[\{\[]"[\s\S]*?<m:mcJc m:val=")center(")/g, '$1left$2');

      // Đảm bảo mọi thẻ <m:dPr> đều có <m:grow m:val="1"/> để dấu ngoặc tự động co giãn full chiều cao của hệ
      omml = omml.replace(/<m:dPr>((?:(?!<m:grow)[\s\S])*?)<\/m:dPr>/g, '<m:dPr><m:grow m:val="1"/>$1</m:dPr>');
    }
    return omml || '';
  } catch (err) {
    console.warn('Lỗi chuyển đổi OMML:', err);
    return '';
  }
}

/**
 * Sao chép công thức vào Clipboard tối ưu cho Word:
 * - Đưa MathML vào mime text/html và application/mathml+xml (Word nhận diện ngay trên Ctrl+V)
 * - Đưa LaTeX chuẩn vào text/plain (để dán vào hộp thoại Alt + =)
 */
export async function copyFormulaForWord(rawTex: string): Promise<boolean> {
  const wordTex = latexToWordAltEqual(rawTex);
  const mathml = latexToMathML(wordTex);
  const omml = latexToOMML(wordTex);

  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      const items: Record<string, Blob> = {
        'text/plain': new Blob([wordTex], { type: 'text/plain' }),
      };

      if (mathml) {
        // Gói HTML chứa MathML cho Word
        const htmlWrapper = `<!DOCTYPE html><html><body>${mathml}</body></html>`;
        items['text/html'] = new Blob([htmlWrapper], { type: 'text/html' });
      }

      await navigator.clipboard.write([new ClipboardItem(items)]);
      return true;
    }
  } catch (err) {
    console.warn('ClipboardItem error, falling back to writeText:', err);
  }

  // Fallback: Copy plain text LaTeX
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(wordTex);
      return true;
    }
  } catch (e) {
    console.error('Copy failed:', e);
  }

  return false;
}

/**
 * Trích xuất toàn bộ công thức toán trong một tài liệu
 */
export function extractMathFormulas(text: string): { original: string; cleanLatex: string; mathml: string; omml: string; isBlock: boolean }[] {
  if (!text) return [];
  const results: { original: string; cleanLatex: string; mathml: string; omml: string; isBlock: boolean }[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\(|\\\)|\$(?!\$)(?:[\s\S]+?)(?<!\$)\$|\\begin\{(?:aligned|cases|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\{(?:aligned|cases|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})/g;

  let match: RegExpExecArray | null;
  while ((match = mathRegex.exec(text)) !== null) {
    const raw = match[0];
    const isBlock = raw.startsWith('$$') || raw.startsWith('\\[') || raw.includes('\\begin{');
    const clean = latexToWordAltEqual(raw);
    if (clean) {
      results.push({
        original: raw,
        cleanLatex: clean,
        mathml: latexToMathML(clean, isBlock),
        omml: latexToOMML(clean, isBlock),
        isBlock,
      });
    }
  }

  return results;
}
