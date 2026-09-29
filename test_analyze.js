// Test script for analyzeFunctionToBbt

function extractFormula(raw) {
  if (!raw) return '';
  let str = raw.trim();

  const dollarMatch = str.match(/\$([^$]+)\$/);
  if (dollarMatch) {
    str = dollarMatch[1].trim();
  }

  const yMatch = str.match(/(?:y|f\([a-z]\)|g\([a-z]\))\s*=\s*([^,;\n\.]+)/i);
  if (yMatch) {
    return yMatch[1].trim();
  }

  const fracMatch = str.match(/(\\frac\{[^}]+\}\{[^}]+\})/);
  if (fracMatch) {
    return fracMatch[1].trim();
  }

  const slashMatch = str.match(/(\([^)]+\)\s*\/\s*\([^)]+\))/);
  if (slashMatch) {
    return slashMatch[1].trim();
  }

  const colonMatch = str.match(/:\s*([^,;\n]+)$/);
  if (colonMatch) {
    const afterColon = colonMatch[1].trim();
    if (afterColon.includes('x') || afterColon.includes('^')) {
      return afterColon.replace(/^(?:y|f\([a-z]\))\s*=\s*/i, '').trim();
    }
  }

  str = str
    .replace(/^.*?(?:hàm số|khảo sát|vẽ bảng biến thiên|bảng biến thiên|cho)\s+/i, '')
    .replace(/^(?:y|f\([a-z]\))\s*=\s*/i, '')
    .trim();

  return str;
}

function parsePolyCoeffs(str) {
  let s = str.replace(/\s+/g, '').replace(/\u2212/g, '-').replace(/\u2013/g, '-').replace(/\u2014/g, '-');
  s = s.replace(/x²/g, 'x^2').replace(/x³/g, 'x^3').replace(/x⁴/g, 'x^4');
  if (!s.startsWith('+') && !s.startsWith('-')) s = '+' + s;
  const regex = /([+-])(?:(\d*(?:\.\d+)?)\*?)?(?:x(?:\^(\d+))?)?/g;
  let match;
  const coeffs = {};
  let maxDeg = 0;
  while ((match = regex.exec(s)) !== null) {
    if (match[0] === '') break;
    const sign = match[1] === '-' ? -1 : 1;
    const numStr = match[2];
    const hasX = match[0].includes('x');
    const powerStr = match[3];
    let val = 1;
    if (numStr !== undefined && numStr !== '') {
      val = parseFloat(numStr);
    } else if (!hasX) {
      continue;
    }
    const power = hasX ? (powerStr ? parseInt(powerStr, 10) : 1) : 0;
    coeffs[power] = (coeffs[power] || 0) + sign * val;
  }
  for (const p in coeffs) {
    if (coeffs[p] !== 0 && parseInt(p, 10) > maxDeg) maxDeg = parseInt(p, 10);
  }
  return { deg: maxDeg, coeffs };
}

function formatFrac(num, den) {
  if (den < 0) { num = -num; den = -den; }
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const g = Math.abs(gcd(Math.round(num * 1000), Math.round(den * 1000)));
  const n = Math.round(num * 1000) / g;
  const d = Math.round(den * 1000) / g;
  if (d === 1) return String(n);
  return n + '/' + d;
}

function formatNum(n) {
  if (Math.abs(n - Math.round(n)) < 1e-4) return String(Math.round(n));
  return n.toFixed(1).replace(/\.0$/, '');
}

function testAnalyze(expression) {
  const formula = extractFormula(expression);
  console.log("Input:", expression);
  console.log(" Extracted formula:", formula);

  let clean = formula
    .replace(/\s+/g, '')
    .replace(/\$/g, '')
    .replace(/^y\s*=\s*/i, '')
    .replace(/^f\([a-z]\)\s*=\s*/i, '');

  // Radical?
  const sqrtMatch = clean.match(/\\sqrt\{([^}]+)\}|sqrt\(([^)]+)\)/i);
  if (sqrtMatch) {
    const inside = sqrtMatch[1] || sqrtMatch[2];
    console.log(" -> Radical function inside:", inside);
    return;
  }

  // Fraction?
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
    const pNum = parsePolyCoeffs(numStr);
    const pDen = parsePolyCoeffs(denStr);
    console.log(" -> Rational: num deg", pNum.deg, pNum.coeffs, "den deg", pDen.deg, pDen.coeffs);
    return;
  }

  // Polynomial
  const p = parsePolyCoeffs(clean);
  console.log(" -> Polynomial deg", p.deg, p.coeffs);
}

const samples = [
  "Khảo sát và vẽ Bảng biến thiên hàm số bậc ba: y = x^3 - 3x^2 + 4",
  "Khảo sát và vẽ Bảng biến thiên hàm phân thức hữu tỉ có tiệm cận: y = (2x - 1) / (x + 1)",
  "Khảo sát và vẽ Bảng biến thiên hàm số chứa căn thức: y = \\sqrt{x^2 - 4}",
  "y = (2x+1)/(x-1)",
  "y = (1-2x)/(x+3)",
  "y = 2/(x-1)",
  "y = (x^2 - 3x + 2) / (x - 1)",
  "y = x^3 - 3x^2 + 2",
  "y = x^3",
  "y = -x^4 + 2x^2 + 1",
  "y = x^2 - 4x + 3",
  "y = 2x - 3"
];

samples.forEach(testAnalyze);
