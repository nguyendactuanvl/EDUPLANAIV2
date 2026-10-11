/**
 * Utility to convert LaTeX math formulas and symbols into natural spoken language
 * for high-quality Speech Synthesis in Vietnamese and English.
 */

export function convertMathToSpeech(text: string, lang: 'vi' | 'en' = 'vi'): string {
  if (!text) return '';
  let clean = text;

  // Remove HTML tags except text
  clean = clean.replace(/<[^>]+>/g, ' ');

  // Process display math $$...$$ and inline math $...$
  clean = clean.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => processFormula(math, lang));
  clean = clean.replace(/\$([^\$]+)\$/g, (_, math) => processFormula(math, lang));

  // Clean remaining formatting chars like *, #, _, ~, |
  clean = clean.replace(/[\*\_~`#|]/g, ' ');

  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

function processFormula(latex: string, lang: 'vi' | 'en'): string {
  let s = latex.trim();

  if (lang === 'vi') {
    // 1. Fractions \frac{a}{b} -> a trên b (hoặc a phần b)
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 trên $2');

    // 2. Square roots \sqrt{x} -> căn bậc hai của x, \sqrt[n]{x} -> căn bậc n của x
    s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, 'căn bậc $1 của $2');
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, 'căn bậc hai của $1');

    // 3. Powers x^2 -> x bình phương, x^3 -> x lập phương, x^n -> x mũ n
    s = s.replace(/([a-zA-Z0-9_\)\}\]\$\\\-]+)\^2/g, '$1 bình phương');
    s = s.replace(/([a-zA-Z0-9_\)\}\]\$\\\-]+)\^3/g, '$1 lập phương');
    s = s.replace(/([a-zA-Z0-9_\)\}\]\$\\\-]+)\^\{([^{}]+)\}/g, '$1 mũ $2');
    s = s.replace(/([a-zA-Z0-9_\)\}\]\$\\\-]+)\^([0-9a-zA-Z]+)/g, '$1 mũ $2');

    // 4. Subscripts x_n -> x chỉ số n, x_1 -> x 1
    s = s.replace(/([a-zA-Z])_\{([^{}]+)\}/g, '$1 $2');
    s = s.replace(/([a-zA-Z])_([0-9a-zA-Z]+)/g, '$1 $2');

    // 5. Calculus & Limits & Integrals
    s = s.replace(/\\lim_\{([^\}]+)\}/g, 'giới hạn của $1');
    s = s.replace(/\\int_\{([^\}]+)\}\^\{([^\}]+)\}/g, 'tích phân từ $1 đến $2 của');
    s = s.replace(/\\int/g, 'tích phân');

    // 6. Trigonometry & Logarithms
    s = s.replace(/\\sin/g, 'xin');
    s = s.replace(/\\cos/g, 'cốt');
    s = s.replace(/\\tan/g, 'tang');
    s = s.replace(/\\cot/g, 'cô tang');
    s = s.replace(/\\log_\{([^{}]+)\}/g, 'lô ga rit cơ số $1 của');
    s = s.replace(/\\ln/g, 'lô ga rit tự nhiên');

    // 7. Greek letters & Math symbols
    s = s.replace(/\\alpha/g, 'an pha');
    s = s.replace(/\\beta/g, 'bê ta');
    s = s.replace(/\\gamma/g, 'ga ma');
    s = s.replace(/\\delta/g, 'đeo ta');
    s = s.replace(/\\Delta/g, 'Đen-ta');
    s = s.replace(/\\pi/g, 'pi');
    s = s.replace(/\\theta/g, 'thê ta');
    s = s.replace(/\\omega/g, 'ô mê ga');
    s = s.replace(/\\infty/g, 'vô cực');

    // 8. Operators & Relations
    s = s.replace(/\\le|\\leq/g, ' nhỏ hơn hoặc bằng ');
    s = s.replace(/\\ge|\\geq/g, ' lớn hơn hoặc bằng ');
    s = s.replace(/\\neq|\\ne/g, ' khác ');
    s = s.replace(/\\approx/g, ' xấp xỉ ');
    s = s.replace(/\\in/g, ' thuộc ');
    s = s.replace(/\\notin/g, ' không thuộc ');
    s = s.replace(/\\subset/g, ' là tập con của ');
    s = s.replace(/\\cup/g, ' hợp với ');
    s = s.replace(/\\cap/g, ' giao với ');
    s = s.replace(/\\Rightarrow/g, ' suy ra ');
    s = s.replace(/\\Leftrightarrow/g, ' tương đương ');
    s = s.replace(/\\forall/g, ' với mọi ');
    s = s.replace(/\\exists/g, ' tồn tại ');
    s = s.replace(/\\pm/g, ' cộng trừ ');
    s = s.replace(/\\times/g, ' nhân ');
    s = s.replace(/\\cdot/g, ' nhân ');

    // Clean remaining backslashes
    s = s.replace(/\\/g, ' ');
  } else {
    // English Math Speech Rules
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 over $2');
    s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, 'the $1th root of $2');
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, 'square root of $1');

    s = s.replace(/([a-zA-Z0-9_\)\}\]\$\\\-]+)\^2/g, '$1 squared');
    s = s.replace(/([a-zA-Z0-9_\)\}\]\$\\\-]+)\^3/g, '$1 cubed');
    s = s.replace(/([a-zA-Z0-9_\)\}\]\$\\\-]+)\^\{([^{}]+)\}/g, '$1 to the power of $2');
    s = s.replace(/([a-zA-Z0-9_\)\}\]\$\\\-]+)\^([0-9a-zA-Z]+)/g, '$1 to the power of $2');

    s = s.replace(/([a-zA-Z])_\{([^{}]+)\}/g, '$1 sub $2');
    s = s.replace(/([a-zA-Z])_([0-9a-zA-Z]+)/g, '$1 sub $2');

    s = s.replace(/\\lim_\{([^\}]+)\}/g, 'limit as $1');
    s = s.replace(/\\int_\{([^\}]+)\}\^\{([^\}]+)\}/g, 'integral from $1 to $2 of');
    s = s.replace(/\\int/g, 'integral');

    s = s.replace(/\\sin/g, 'sine');
    s = s.replace(/\\cos/g, 'cosine');
    s = s.replace(/\\tan/g, 'tangent');
    s = s.replace(/\\cot/g, 'cotangent');
    s = s.replace(/\\log_\{([^{}]+)\}/g, 'logarithm base $1 of');

    s = s.replace(/\\alpha/g, 'alpha');
    s = s.replace(/\\beta/g, 'beta');
    s = s.replace(/\\delta/g, 'delta');
    s = s.replace(/\\Delta/g, 'Delta');
    s = s.replace(/\\pi/g, 'pi');
    s = s.replace(/\\infty/g, 'infinity');

    s = s.replace(/\\le|\\leq/g, ' less than or equal to ');
    s = s.replace(/\\ge|\\geq/g, ' greater than or equal to ');
    s = s.replace(/\\neq|\\ne/g, ' not equal to ');
    s = s.replace(/\\in/g, ' belongs to ');
    s = s.replace(/\\subset/g, ' subset of ');
    s = s.replace(/\\Rightarrow/g, ' implies ');
    s = s.replace(/\\Leftrightarrow/g, ' is equivalent to ');
    s = s.replace(/\\forall/g, ' for all ');
    s = s.replace(/\\exists/g, ' there exists ');

    s = s.replace(/\\/g, ' ');
  }

  return s;
}
