/**
 * Deterministic Parametric Mathematical SVG Illustration Engine
 * Generates 100% mathematically accurate, textbook-grade vector diagrams
 * for real-world Applied (Vận dụng) and High-Applied (Vận dụng cao) math problems.
 */

export interface RealWorldFigureSpec {
  type:
    | 'function_plot'
    | 'triangle_survey'
    | 'geometry_2d'
    | 'solid_3d'
    | 'sequence_chart'
    | 'vector_physics'
    | 'statistics_chart'
    | 'probability_tree';
  title?: string;
  caption?: string;
  params?: Record<string, any>;
  // Allow flat fields as fallback if model places keys at top level
  [key: string]: any;
}

function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmtNum(n: number, maxDecimals = 2): string {
  if (!Number.isFinite(n)) return '0';
  const rounded = Number(n.toFixed(maxDecimals));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

/**
 * Safe deterministic math expression evaluator for function_plot curves.
 * Supports: + - * / ^, parentheses, x/t variable, sin, cos, tan, sqrt, abs, ln, log, exp, pi, e
 */
export function evaluateMathExpression(rawExpr: string, xVal: number): number {
  if (!rawExpr || typeof rawExpr !== 'string') return NaN;
  let expr = rawExpr
    .trim()
    .replace(/\$+/g, '')
    .replace(/^[a-zA-Z]\s*\(\s*[xt]\s*\)\s*=\s*/i, '')
    .replace(/^y\s*=\s*/i, '')
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))')
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/\\(?:sin|cos|tan|ln|log|exp|abs)\b/g, (m) => m.slice(1))
    .replace(/\\pi\b|π/g, 'pi')
    .replace(/\\cdot|\\times|×|·/g, '*')
    .replace(/−|–|—/g, '-')
    .replace(/,/g, '.')
    .replace(/\bt\b/g, 'x')
    .replace(/\s+/g, '');

  // Security whitelist: only math characters and known function names
  const stripped = expr.replace(/\b(?:sin|cos|tan|sqrt|abs|ln|log|exp|pi|e|x)\b/g, '');
  if (/[^0-9.+\-*/^()]/.test(stripped)) {
    return NaN;
  }

  // Insert implicit multiplication: 2x -> 2*x, 2( -> 2*(, )x -> )*x, )( -> )*(, x( -> x*(, 2sin -> 2*sin
  expr = expr
    .replace(/(\d)(?=[a-zA-Z(])/g, '$1*')
    .replace(/(\))(?=[0-9a-zA-Z(])/g, '$1*')
    .replace(/\b(x|pi|e)(?=\()/g, '$1*')
    .replace(/\b(x|pi|e)(?=\d)/g, '$1*');

  // Replace math tokens with JS Math equivalents
  const jsExpr = expr
    .replace(/\^/g, '**')
    .replace(/\bpi\b/g, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/\bsin\b/g, 'Math.sin')
    .replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan')
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\babs\b/g, 'Math.abs')
    .replace(/\bln\b/g, 'Math.log')
    .replace(/\blog\b/g, 'Math.log10')
    .replace(/\bexp\b/g, 'Math.exp')
    .replace(/\bx\b/g, `(${xVal})`);

  try {
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${jsExpr});`)();
    return typeof val === 'number' && Number.isFinite(val) ? val : NaN;
  } catch {
    return NaN;
  }
}

function svgDefs(): string {
  return `<defs>
    <marker id="rw-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" fill="#334155"/>
    </marker>
    <marker id="rw-arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" fill="#1d4ed8"/>
    </marker>
    <marker id="rw-arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" fill="#047857"/>
    </marker>
    <marker id="rw-arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" fill="#dc2626"/>
    </marker>
    <marker id="rw-dim-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto">
      <path d="M 8.5 1.5 L 1.5 5 L 8.5 8.5 z" fill="#475569"/>
    </marker>
    <marker id="rw-dim-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto">
      <path d="M 1.5 1.5 L 8.5 5 L 1.5 8.5 z" fill="#475569"/>
    </marker>
    <pattern id="rw-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#94a3b8" stroke-width="1.2" opacity="0.55"/>
    </pattern>
    <linearGradient id="rw-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="rw-fill-blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="rw-fill-emerald" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0.05"/>
    </linearGradient>
  </defs>`;
}

function wrapSvgContainer(
  width: number,
  height: number,
  body: string,
  title?: string,
  caption?: string
): string {
  const titleBlock = title
    ? `<text x="${width / 2}" y="22" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>`
    : '';
  const captionBlock = caption
    ? `<text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="11.5" font-style="italic" fill="#475569">${escapeXml(caption)}</text>`
    : '';

  return `<svg data-realworld-figure="true" class="realworld-math-figure max-w-full h-auto mx-auto my-3 bg-white rounded-lg" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${svgDefs()}
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="10" fill="url(#rw-sky)" stroke="#cbd5e1" stroke-width="1.2"/>
  ${titleBlock}
  ${body}
  ${captionBlock}
</svg>`;
}

/**
 * Draw an offset double-headed dimension arrow between two SVG points (x1,y1) and (x2,y2).
 */
function drawDimensionLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  offsetPx = 18,
  color = '#334155'
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 6) return '';
  // Normal unit vector (pointing outward)
  const nx = (-dy / len) * offsetPx;
  const ny = (dx / len) * offsetPx;
  const ax = x1 + nx;
  const ay = y1 + ny;
  const bx = x2 + nx;
  const by = y2 + ny;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const labelW = Math.max(26, label.length * 6.8 + 10);

  return `<g class="rw-dim">
    <line x1="${fmtNum(x1)}" y1="${fmtNum(y1)}" x2="${fmtNum(ax)}" y2="${fmtNum(ay)}" stroke="#94a3b8" stroke-width="0.9" stroke-dasharray="3,2"/>
    <line x1="${fmtNum(x2)}" y1="${fmtNum(y2)}" x2="${fmtNum(bx)}" y2="${fmtNum(by)}" stroke="#94a3b8" stroke-width="0.9" stroke-dasharray="3,2"/>
    <line x1="${fmtNum(ax)}" y1="${fmtNum(ay)}" x2="${fmtNum(bx)}" y2="${fmtNum(by)}" stroke="${color}" stroke-width="1.2" marker-start="url(#rw-dim-start)" marker-end="url(#rw-dim-end)"/>
    <rect x="${fmtNum(mx - labelW / 2)}" y="${fmtNum(my - 9)}" width="${fmtNum(labelW)}" height="18" rx="4" fill="#ffffff" fill-opacity="0.92" stroke="#e2e8f0" stroke-width="0.7"/>
    <text x="${fmtNum(mx)}" y="${fmtNum(my + 4)}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="11.5" font-weight="700" fill="${color}">${escapeXml(label)}</text>
  </g>`;
}

/**
 * Draw right-angle square at vertex B for angle ABC (in SVG pixel coordinates).
 */
function drawRightAngleMark(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  size = 11
): string {
  const v1x = ax - bx;
  const v1y = ay - by;
  const v2x = cx - bx;
  const v2y = cy - by;
  const l1 = Math.hypot(v1x, v1y) || 1;
  const l2 = Math.hypot(v2x, v2y) || 1;
  const u1x = (v1x / l1) * size;
  const u1y = (v1y / l1) * size;
  const u2x = (v2x / l2) * size;
  const u2y = (v2y / l2) * size;

  const p1x = bx + u1x;
  const p1y = by + u1y;
  const p2x = bx + u1x + u2x;
  const p2y = by + u1y + u2y;
  const p3x = bx + u2x;
  const p3y = by + u2y;

  return `<path d="M ${fmtNum(p1x)} ${fmtNum(p1y)} L ${fmtNum(p2x)} ${fmtNum(p2y)} L ${fmtNum(p3x)} ${fmtNum(p3y)}" fill="none" stroke="#dc2626" stroke-width="1.4"/>`;
}

/**
 * Draw angle arc at vertex V between rays to P1 and P2, with clean label.
 */
function drawAngleArc(
  vx: number,
  vy: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  label: string,
  radius = 28,
  color = '#d97706'
): string {
  const a1 = Math.atan2(p1y - vy, p1x - vx);
  const a2 = Math.atan2(p2y - vy, p2x - vx);
  let diff = a2 - a1;
  while (diff <= -Math.PI) diff += 2 * Math.PI;
  while (diff > Math.PI) diff -= 2 * Math.PI;

  const sx = vx + radius * Math.cos(a1);
  const sy = vy + radius * Math.sin(a1);
  const ex = vx + radius * Math.cos(a1 + diff);
  const ey = vy + radius * Math.sin(a1 + diff);
  const sweepFlag = diff >= 0 ? 1 : 0;

  const midA = a1 + diff / 2;
  const lx = vx + (radius + 16) * Math.cos(midA);
  const ly = vy + (radius + 16) * Math.sin(midA);

  return `<g>
    <path d="M ${fmtNum(sx)} ${fmtNum(sy)} A ${radius} ${radius} 0 0 ${sweepFlag} ${fmtNum(ex)} ${fmtNum(ey)}" fill="none" stroke="${color}" stroke-width="1.7"/>
    <text x="${fmtNum(lx)}" y="${fmtNum(ly + 4)}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="11.5" font-weight="700" fill="${color}">${escapeXml(label)}</text>
  </g>`;
}

// ============================================================================
// 1. FUNCTION PLOT (Parabola Bridge/Gate, Projectile, Sine Wave, Economics, Integrals)
// ============================================================================
function renderFunctionPlot(spec: RealWorldFigureSpec): string {
  const p = { ...spec, ...(spec.params || {}) };
  const width = 560;
  const height = 320;
  const padL = 56;
  const padR = 36;
  const padT = 44;
  const padB = 50;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const fnExpr: string = String(p.fn || p.expression || '-0.1*x^2 + 4');
  const fn2Expr: string = p.fn2 ? String(p.fn2) : '';
  let xMin = Number(p.xMin ?? -6);
  let xMax = Number(p.xMax ?? 6);
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax <= xMin) {
    xMin = -6;
    xMax = 6;
  }

  const samples = 180;
  const pts1: Array<{ x: number; y: number }> = [];
  const pts2: Array<{ x: number; y: number }> = [];
  let autoYMin = Infinity;
  let autoYMax = -Infinity;

  for (let i = 0; i <= samples; i++) {
    const x = xMin + ((xMax - xMin) * i) / samples;
    const y1 = evaluateMathExpression(fnExpr, x);
    if (Number.isFinite(y1) && Math.abs(y1) < 1e6) {
      pts1.push({ x, y: y1 });
      autoYMin = Math.min(autoYMin, y1);
      autoYMax = Math.max(autoYMax, y1);
    } else {
      pts1.push({ x, y: NaN });
    }
    if (fn2Expr) {
      const y2 = evaluateMathExpression(fn2Expr, x);
      if (Number.isFinite(y2) && Math.abs(y2) < 1e6) {
        pts2.push({ x, y: y2 });
        autoYMin = Math.min(autoYMin, y2);
        autoYMax = Math.max(autoYMax, y2);
      } else {
        pts2.push({ x, y: NaN });
      }
    }
  }

  let yMin = Number.isFinite(Number(p.yMin)) ? Number(p.yMin) : Math.min(0, autoYMin);
  let yMax = Number.isFinite(Number(p.yMax)) ? Number(p.yMax) : Math.max(1, autoYMax);
  if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMax <= yMin) {
    yMin = -1;
    yMax = 10;
  }
  const yPad = (yMax - yMin) * 0.12;
  const yMinDraw = p.yMin !== undefined ? yMin : yMin - (yMin < 0 ? yPad : yPad * 0.25);
  const yMaxDraw = p.yMax !== undefined ? yMax : yMax + yPad;

  const toX = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
  const toY = (y: number) => padT + ((yMaxDraw - y) / (yMaxDraw - yMinDraw)) * plotH;

  const parts: string[] = [];

  // Subtle grid
  const xTicks = 6;
  const yTicks = 5;
  for (let i = 0; i <= xTicks; i++) {
    const xv = xMin + ((xMax - xMin) * i) / xTicks;
    const px = toX(xv);
    parts.push(`<line x1="${fmtNum(px)}" y1="${padT}" x2="${fmtNum(px)}" y2="${padT + plotH}" stroke="#e2e8f0" stroke-width="0.9"/>`);
  }
  for (let i = 0; i <= yTicks; i++) {
    const yv = yMinDraw + ((yMaxDraw - yMinDraw) * i) / yTicks;
    const py = toY(yv);
    parts.push(`<line x1="${padL}" y1="${fmtNum(py)}" x2="${padL + plotW}" y2="${fmtNum(py)}" stroke="#e2e8f0" stroke-width="0.9"/>`);
  }

  // Shaded area (under curve or between fn1 and fn2)
  const shadeFrom = Number(p.shadeFrom);
  const shadeTo = Number(p.shadeTo);
  if (Number.isFinite(shadeFrom) && Number.isFinite(shadeTo) && shadeTo > shadeFrom) {
    const shadePts = pts1.filter((pt) => Number.isFinite(pt.y) && pt.x >= shadeFrom && pt.x <= shadeTo);
    if (shadePts.length >= 2) {
      const topPath = shadePts.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${fmtNum(toX(pt.x))} ${fmtNum(toY(pt.y))}`).join(' ');
      let bottomPath = '';
      if (fn2Expr) {
        const bPts = pts2.filter((pt) => Number.isFinite(pt.y) && pt.x >= shadeFrom && pt.x <= shadeTo).reverse();
        bottomPath = bPts.map((pt) => `L ${fmtNum(toX(pt.x))} ${fmtNum(toY(pt.y))}`).join(' ');
      } else {
        const baseY = toY(Math.max(yMinDraw, Math.min(yMaxDraw, 0)));
        bottomPath = `L ${fmtNum(toX(shadePts[shadePts.length - 1].x))} ${fmtNum(baseY)} L ${fmtNum(toX(shadePts[0].x))} ${fmtNum(baseY)}`;
      }
      parts.push(`<path d="${topPath} ${bottomPath} Z" fill="url(#rw-fill-blue)" stroke="none"/>`);
    }
  }

  // Bridge / Arch vertical suspension cables accent if theme === 'bridge' or 'gate'
  const theme = String(p.theme || '').toLowerCase();
  if ((theme === 'bridge' || theme === 'gate') && pts1.length > 10) {
    const zeroY = toY(Math.max(yMinDraw, Math.min(yMaxDraw, 0)));
    const cableCount = 7;
    for (let i = 1; i < cableCount; i++) {
      const cx = xMin + ((xMax - xMin) * i) / cableCount;
      const cy = evaluateMathExpression(fnExpr, cx);
      if (Number.isFinite(cy) && cy > 0) {
        parts.push(`<line x1="${fmtNum(toX(cx))}" y1="${fmtNum(toY(cy))}" x2="${fmtNum(toX(cx))}" y2="${fmtNum(zeroY)}" stroke="#64748b" stroke-width="1.1" stroke-dasharray="3,2" opacity="0.65"/>`);
      }
    }
    parts.push(`<rect x="${padL}" y="${fmtNum(zeroY)}" width="${plotW}" height="5" fill="#94a3b8" opacity="0.45"/>`);
  }

  // Axes (X & Y)
  const axisX_y = yMinDraw <= 0 && yMaxDraw >= 0 ? toY(0) : padT + plotH;
  const axisY_x = xMin <= 0 && xMax >= 0 ? toX(0) : padL;

  parts.push(`<line x1="${padL - 6}" y1="${fmtNum(axisX_y)}" x2="${padL + plotW + 14}" y2="${fmtNum(axisX_y)}" stroke="#1e293b" stroke-width="1.6" marker-end="url(#rw-arrow)"/>`);
  parts.push(`<line x1="${fmtNum(axisY_x)}" y1="${padT + plotH + 6}" x2="${fmtNum(axisY_x)}" y2="${padT - 12}" stroke="#1e293b" stroke-width="1.6" marker-end="url(#rw-arrow)"/>`);

  // Axis labels
  const xLabel = String(p.xLabel || 'x');
  const yLabel = String(p.yLabel || 'y');
  parts.push(`<text x="${padL + plotW + 18}" y="${fmtNum(axisX_y + 4)}" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="700" font-style="italic" fill="#0f172a">${escapeXml(xLabel)}</text>`);
  parts.push(`<text x="${fmtNum(axisY_x + 8)}" y="${padT - 10}" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="700" font-style="italic" fill="#0f172a">${escapeXml(yLabel)}</text>`);
  if (xMin <= 0 && xMax >= 0 && yMinDraw <= 0 && yMaxDraw >= 0) {
    parts.push(`<text x="${fmtNum(axisY_x - 12)}" y="${fmtNum(axisX_y + 14)}" font-family="'Segoe UI', Arial, sans-serif" font-size="11" font-weight="600" fill="#475569">O</text>`);
  }

  // Tick numbers
  for (let i = 0; i <= xTicks; i++) {
    const xv = xMin + ((xMax - xMin) * i) / xTicks;
    if (Math.abs(xv) < 1e-6 && xMin <= 0 && xMax >= 0) continue;
    const px = toX(xv);
    parts.push(`<line x1="${fmtNum(px)}" y1="${fmtNum(axisX_y - 3)}" x2="${fmtNum(px)}" y2="${fmtNum(axisX_y + 3)}" stroke="#334155" stroke-width="1.2"/>`);
    parts.push(`<text x="${fmtNum(px)}" y="${fmtNum(axisX_y + 16)}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="10.5" fill="#475569">${fmtNum(xv, 1)}</text>`);
  }
  for (let i = 0; i <= yTicks; i++) {
    const yv = yMinDraw + ((yMaxDraw - yMinDraw) * i) / yTicks;
    if (Math.abs(yv) < 1e-6 && yMinDraw <= 0 && yMaxDraw >= 0) continue;
    const py = toY(yv);
    parts.push(`<line x1="${fmtNum(axisY_x - 3)}" y1="${fmtNum(py)}" x2="${fmtNum(axisY_x + 3)}" y2="${fmtNum(py)}" stroke="#334155" stroke-width="1.2"/>`);
    parts.push(`<text x="${fmtNum(axisY_x - 8)}" y="${fmtNum(py + 3.5)}" text-anchor="end" font-family="'Segoe UI', Arial, sans-serif" font-size="10.5" fill="#475569">${fmtNum(yv, 1)}</text>`);
  }

  // Build curve path helper (clips safely to plot bounds)
  const buildCurvePaths = (pts: Array<{ x: number; y: number }>, strokeColor: string, strokeWidth = 2.6, dashed = false) => {
    let d = '';
    let drawing = false;
    for (const pt of pts) {
      if (!Number.isFinite(pt.y) || pt.y < yMinDraw - (yMaxDraw - yMinDraw) * 0.4 || pt.y > yMaxDraw + (yMaxDraw - yMinDraw) * 0.4) {
        drawing = false;
        continue;
      }
      const px = toX(pt.x);
      const py = Math.max(padT - 4, Math.min(padT + plotH + 4, toY(pt.y)));
      d += `${drawing ? 'L' : 'M'} ${fmtNum(px)} ${fmtNum(py)} `;
      drawing = true;
    }
    if (d) {
      parts.push(`<path d="${d.trim()}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dashed ? ' stroke-dasharray="6,4"' : ''}/>`);
    }
  };

  buildCurvePaths(pts1, '#1d4ed8', 2.7, false);
  if (fn2Expr) buildCurvePaths(pts2, '#059669', 2.2, true);

  // Curve equation badge
  if (p.fnLabel) {
    parts.push(`<rect x="${padL + 8}" y="${padT + 4}" width="${Math.min(220, String(p.fnLabel).length * 7 + 18)}" height="21" rx="5" fill="#eff6ff" stroke="#93c5fd" stroke-width="1"/>`);
    parts.push(`<text x="${padL + 16}" y="${padT + 18}" font-family="'Segoe UI', Arial, sans-serif" font-size="11.5" font-weight="700" fill="#1e40af">${escapeXml(String(p.fnLabel))}</text>`);
  }

  // Highlighted key points with dashed projections
  const keyPoints: Array<{ x: number; y?: number; label?: string }> = Array.isArray(p.points) ? p.points : [];
  for (const kp of keyPoints) {
    const kx = Number(kp.x);
    if (!Number.isFinite(kx)) continue;
    const ky = Number.isFinite(Number(kp.y)) ? Number(kp.y) : evaluateMathExpression(fnExpr, kx);
    if (!Number.isFinite(ky)) continue;
    const px = toX(kx);
    const py = toY(ky);
    if (px < padL - 10 || px > padL + plotW + 10 || py < padT - 10 || py > padT + plotH + 10) continue;

    // Dashed drop lines to axes
    parts.push(`<line x1="${fmtNum(px)}" y1="${fmtNum(py)}" x2="${fmtNum(px)}" y2="${fmtNum(axisX_y)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3"/>`);
    parts.push(`<line x1="${fmtNum(px)}" y1="${fmtNum(py)}" x2="${fmtNum(axisY_x)}" y2="${fmtNum(py)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3"/>`);
    parts.push(`<circle cx="${fmtNum(px)}" cy="${fmtNum(py)}" r="4.2" fill="#dc2626" stroke="#ffffff" stroke-width="1.5"/>`);
    if (kp.label) {
      const labelY = py - 10 < padT + 12 ? py + 18 : py - 10;
      parts.push(`<text x="${fmtNum(px + 6)}" y="${fmtNum(labelY)}" font-family="'Segoe UI', Arial, sans-serif" font-size="11.5" font-weight="700" fill="#0f172a">${escapeXml(String(kp.label))}</text>`);
    }
  }

  return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
}

// ============================================================================
// 2. TRIANGLE SURVEY (Heights, Distances, Angles of Elevation/Depression, Law of Sines/Cosines)
// ============================================================================
function renderTriangleSurvey(spec: RealWorldFigureSpec): string {
  const p = { ...spec, ...(spec.params || {}) };
  const mode = String(p.mode || 'right').toLowerCase();
  const width = 540;
  const height = 300;
  const parts: string[] = [];

  if (mode === 'two_stations') {
    const alphaDeg = Math.max(10, Math.min(72, Number(p.alphaDeg ?? 30)));
    const betaDeg = Math.max(alphaDeg + 6, Math.min(82, Number(p.betaDeg ?? 45)));
    const dVal = Number(p.distanceAB ?? p.d ?? 50);
    const alphaRad = (alphaDeg * Math.PI) / 180;
    const betaRad = (betaDeg * Math.PI) / 180;
    const xDist = (dVal * Math.tan(alphaRad)) / Math.max(0.05, Math.tan(betaRad) - Math.tan(alphaRad));
    const hVal = xDist * Math.tan(betaRad);
    const totalW = dVal + xDist;

    const padL = 55;
    const padR = 75;
    const padT = 52;
    const padB = 62;
    const availW = width - padL - padR;
    const availH = height - padT - padB;
    const scale = Math.min(availW / Math.max(totalW, 1), availH / Math.max(hVal, 1));

    const groundY = height - padB;
    const hx = padL + totalW * scale;
    const hy = groundY;
    const sx = hx;
    const sy = groundY - hVal * scale;
    const bx = hx - xDist * scale;
    const by = groundY;
    const ax = padL;
    const ay = groundY;

    // Ground line
    parts.push(`<line x1="${padL - 25}" y1="${groundY}" x2="${hx + 35}" y2="${groundY}" stroke="#64748b" stroke-width="2"/>`);
    // Object / tower silhouette on SH
    parts.push(`<rect x="${fmtNum(hx - 6)}" y="${fmtNum(sy)}" width="12" height="${fmtNum(hy - sy)}" fill="#e2e8f0" stroke="#475569" stroke-width="1.3"/>`);
    // Sightlines
    parts.push(`<polygon points="${fmtNum(ax)},${fmtNum(ay)} ${fmtNum(hx)},${fmtNum(hy)} ${fmtNum(sx)},${fmtNum(sy)}" fill="url(#rw-fill-blue)"/>`);
    parts.push(`<line x1="${fmtNum(ax)}" y1="${fmtNum(ay)}" x2="${fmtNum(sx)}" y2="${fmtNum(sy)}" stroke="#1d4ed8" stroke-width="2" stroke-dasharray="5,3"/>`);
    parts.push(`<line x1="${fmtNum(bx)}" y1="${fmtNum(by)}" x2="${fmtNum(sx)}" y2="${fmtNum(sy)}" stroke="#059669" stroke-width="2" stroke-dasharray="5,3"/>`);
    parts.push(`<line x1="${fmtNum(hx)}" y1="${fmtNum(hy)}" x2="${fmtNum(sx)}" y2="${fmtNum(sy)}" stroke="#0f172a" stroke-width="2.2"/>`);

    // Right angle & angle arcs
    parts.push(drawRightAngleMark(ax, ay, hx, hy, sx, sy, 11));
    parts.push(drawAngleArc(ax, ay, hx, hy, sx, sy, String(p.alphaLabel || `${alphaDeg}°`), 32, '#1d4ed8'));
    parts.push(drawAngleArc(bx, by, hx, hy, sx, sy, String(p.betaLabel || `${betaDeg}°`), 26, '#059669'));

    // Vertices
    const labels = [
      { x: ax, y: ay, name: String(p.labelA || 'A'), dx: -10, dy: 18 },
      { x: bx, y: by, name: String(p.labelB || 'B'), dx: 0, dy: 18 },
      { x: hx, y: hy, name: String(p.labelH || 'H'), dx: 12, dy: 18 },
      { x: sx, y: sy, name: String(p.labelS || 'S'), dx: 12, dy: -6 }
    ];
    for (const pt of labels) {
      parts.push(`<circle cx="${fmtNum(pt.x)}" cy="${fmtNum(pt.y)}" r="3.6" fill="#0f172a"/>`);
      parts.push(`<text x="${fmtNum(pt.x + pt.dx)}" y="${fmtNum(pt.y + pt.dy)}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">${escapeXml(pt.name)}</text>`);
    }

    // Dimensions
    const dLabel = String(p.dLabel || `${fmtNum(dVal)} ${p.unit || 'm'}`);
    const hLabel = String(p.hLabel || 'h = ?');
    parts.push(drawDimensionLine(ax, ay, bx, by, dLabel, 30, '#1e293b'));
    parts.push(drawDimensionLine(hx, hy, sx, sy, hLabel, 32, '#dc2626'));

    return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
  }

  if (mode === 'general') {
    const bLen = Math.max(1, Number(p.b ?? p.sideAC ?? 8));
    const cLen = Math.max(1, Number(p.c ?? p.sideAB ?? 10));
    let aLen = Number(p.a ?? p.sideBC);
    let angleADeg = Number(p.angleADeg ?? p.angleA);

    if (Number.isFinite(angleADeg) && angleADeg > 5 && angleADeg < 175) {
      const rad = (angleADeg * Math.PI) / 180;
      aLen = Math.sqrt(bLen * bLen + cLen * cLen - 2 * bLen * cLen * Math.cos(rad));
    } else if (Number.isFinite(aLen) && aLen > 0 && aLen < bLen + cLen && bLen < aLen + cLen && cLen < aLen + bLen) {
      const cosA = (bLen * bLen + cLen * cLen - aLen * aLen) / (2 * bLen * cLen);
      angleADeg = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
    } else {
      angleADeg = 60;
      const rad = Math.PI / 3;
      aLen = Math.sqrt(bLen * bLen + cLen * cLen - 2 * bLen * cLen * Math.cos(rad));
    }

    const radA = (angleADeg * Math.PI) / 180;
    const rawPts = [
      { x: 0, y: 0, name: String(p.labelA || 'A') },
      { x: cLen, y: 0, name: String(p.labelB || 'B') },
      { x: bLen * Math.cos(radA), y: bLen * Math.sin(radA), name: String(p.labelC || 'C') }
    ];

    const minX = Math.min(...rawPts.map((q) => q.x));
    const maxX = Math.max(...rawPts.map((q) => q.x));
    const minY = Math.min(...rawPts.map((q) => q.y));
    const maxY = Math.max(...rawPts.map((q) => q.y));

    const padL = 70;
    const padR = 70;
    const padT = 56;
    const padB = 60;
    const scale = Math.min(
      (width - padL - padR) / Math.max(maxX - minX, 0.1),
      (height - padT - padB) / Math.max(maxY - minY, 0.1)
    );
    const drawW = (maxX - minX) * scale;
    const offX = (width - drawW) / 2 - minX * scale;
    const offY = height - padB + minY * scale;

    const pts = rawPts.map((q) => ({
      name: q.name,
      sx: offX + q.x * scale,
      sy: offY - q.y * scale
    }));

    const [A, B, C] = pts;
    parts.push(`<polygon points="${fmtNum(A.sx)},${fmtNum(A.sy)} ${fmtNum(B.sx)},${fmtNum(B.sy)} ${fmtNum(C.sx)},${fmtNum(C.sy)}" fill="url(#rw-fill-emerald)" stroke="#0f172a" stroke-width="2.2" stroke-linejoin="round"/>`);

    // Angles
    if (p.angleALabel || p.angleADeg || p.angleA) {
      parts.push(drawAngleArc(A.sx, A.sy, B.sx, B.sy, C.sx, C.sy, String(p.angleALabel || `${fmtNum(angleADeg, 1)}°`), 28, '#d97706'));
    }
    if (p.angleBLabel) {
      parts.push(drawAngleArc(B.sx, B.sy, A.sx, A.sy, C.sx, C.sy, String(p.angleBLabel), 28, '#1d4ed8'));
    }
    if (p.angleCLabel) {
      parts.push(drawAngleArc(C.sx, C.sy, A.sx, A.sy, B.sx, B.sy, String(p.angleCLabel), 28, '#059669'));
    }

    // Side labels
    const unit = p.unit ? ` ${p.unit}` : '';
    const labAB = p.labelAB || `${fmtNum(cLen)}${unit}`;
    const labAC = p.labelAC || `${fmtNum(bLen)}${unit}`;
    const labBC = p.labelBC || (p.unknownSide === 'BC' ? '?' : `${fmtNum(aLen, 1)}${unit}`);

    parts.push(drawDimensionLine(A.sx, A.sy, B.sx, B.sy, String(labAB), 24, '#1e293b'));
    parts.push(drawDimensionLine(C.sx, C.sy, A.sx, A.sy, String(labAC), 22, '#1e293b'));
    parts.push(drawDimensionLine(B.sx, B.sy, C.sx, C.sy, String(labBC), 22, p.unknownSide === 'BC' ? '#dc2626' : '#1e293b'));

    // Vertices
    const cxMean = (A.sx + B.sx + C.sx) / 3;
    const cyMean = (A.sy + B.sy + C.sy) / 3;
    for (const v of pts) {
      const vx = v.sx - cxMean;
      const vy = v.sy - cyMean;
      const l = Math.hypot(vx, vy) || 1;
      parts.push(`<circle cx="${fmtNum(v.sx)}" cy="${fmtNum(v.sy)}" r="3.8" fill="#0f172a"/>`);
      parts.push(`<text x="${fmtNum(v.sx + (vx / l) * 16)}" y="${fmtNum(v.sy + (vy / l) * 16 + 4)}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#0f172a">${escapeXml(v.name)}</text>`);
    }

    return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
  }

  // Default: Right triangle (mode === 'right')
  let base = Number(p.base ?? p.adjacent ?? 40);
  let vertical = Number(p.height ?? p.opposite ?? 30);
  const angleDeg = Number(p.angleDeg ?? p.alphaDeg);
  if (Number.isFinite(angleDeg) && angleDeg > 5 && angleDeg < 85) {
    if (p.base !== undefined && p.height === undefined) {
      vertical = base * Math.tan((angleDeg * Math.PI) / 180);
    } else if (p.height !== undefined && p.base === undefined) {
      base = vertical / Math.tan((angleDeg * Math.PI) / 180);
    }
  }
  base = Math.max(1, base);
  vertical = Math.max(1, vertical);

  const padL = 75;
  const padR = 85;
  const padT = 50;
  const padB = 60;
  const scale = Math.min((width - padL - padR) / base, (height - padT - padB) / vertical);
  const wPx = base * scale;
  const hPx = vertical * scale;

  const ax = (width - wPx) / 2;
  const ay = height - padB;
  const bx = ax + wPx;
  const by = ay;
  const cx = bx;
  const cy = ay - hPx;

  // Ground line
  parts.push(`<line x1="${fmtNum(ax - 28)}" y1="${fmtNum(ay)}" x2="${fmtNum(bx + 36)}" y2="${fmtNum(by)}" stroke="#64748b" stroke-width="2"/>`);
  // Triangle fill & edges
  parts.push(`<polygon points="${fmtNum(ax)},${fmtNum(ay)} ${fmtNum(bx)},${fmtNum(by)} ${fmtNum(cx)},${fmtNum(cy)}" fill="url(#rw-fill-blue)" stroke="#0f172a" stroke-width="2.2" stroke-linejoin="round"/>`);
  // Right angle mark at B
  parts.push(drawRightAngleMark(ax, ay, bx, by, cx, cy, 12));

  // Angle arc at A
  const computedAngle = (Math.atan2(vertical, base) * 180) / Math.PI;
  const angleText = p.angleLabel || (Number.isFinite(angleDeg) ? `${angleDeg}°` : `${fmtNum(computedAngle, 1)}°`);
  parts.push(drawAngleArc(ax, ay, bx, by, cx, cy, String(angleText), 32, '#d97706'));

  const unit = p.unit ? ` ${p.unit}` : ' m';
  if (p.baseLabel !== '') {
    parts.push(drawDimensionLine(ax, ay, bx, by, String(p.baseLabel || `${fmtNum(base)}${unit}`), 24, '#1e293b'));
  }
  if (p.heightLabel !== '') {
    parts.push(drawDimensionLine(bx, by, cx, cy, String(p.heightLabel || `${fmtNum(vertical)}${unit}`), 28, '#dc2626'));
  }
  if (p.hypLabel) {
    parts.push(drawDimensionLine(cx, cy, ax, ay, String(p.hypLabel), 22, '#1d4ed8'));
  }

  // Vertex labels
  const vList = [
    { x: ax, y: ay, name: String(p.labelA || 'A'), dx: -14, dy: 16 },
    { x: bx, y: by, name: String(p.labelB || 'H'), dx: 14, dy: 16 },
    { x: cx, y: cy, name: String(p.labelC || 'S'), dx: 12, dy: -8 }
  ];
  for (const v of vList) {
    parts.push(`<circle cx="${fmtNum(v.x)}" cy="${fmtNum(v.y)}" r="3.8" fill="#0f172a"/>`);
    parts.push(`<text x="${fmtNum(v.x + v.dx)}" y="${fmtNum(v.y + v.dy)}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#0f172a">${escapeXml(v.name)}</text>`);
  }

  return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
}

// ============================================================================
// 3. GEOMETRY 2D (Uniform-scale exact polygons, circles, feasible regions, fencing)
// ============================================================================
function renderGeometry2D(spec: RealWorldFigureSpec): string {
  const p = { ...spec, ...(spec.params || {}) };
  const width = 540;
  const height = 320;
  const padL = 62;
  const padR = 62;
  const padT = 48;
  const padB = 54;

  const rawPoints: Array<{ name: string; x: number; y: number }> = Array.isArray(p.points)
    ? p.points.filter((pt: any) => Number.isFinite(Number(pt?.x)) && Number.isFinite(Number(pt?.y)))
        .map((pt: any) => ({ name: String(pt.name || ''), x: Number(pt.x), y: Number(pt.y) }))
    : [];
  const rawCircles: Array<{ cx: number; cy: number; r: number; fill?: string; stroke?: string; dashed?: boolean; label?: string }> =
    Array.isArray(p.circles) ? p.circles : [];

  if (rawPoints.length === 0 && rawCircles.length === 0) {
    return renderTriangleSurvey(spec);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of rawPoints) {
    minX = Math.min(minX, pt.x);
    maxX = Math.max(maxX, pt.x);
    minY = Math.min(minY, pt.y);
    maxY = Math.max(maxY, pt.y);
  }
  for (const c of rawCircles) {
    if (Number.isFinite(Number(c.cx)) && Number.isFinite(Number(c.cy)) && Number.isFinite(Number(c.r))) {
      minX = Math.min(minX, Number(c.cx) - Number(c.r));
      maxX = Math.max(maxX, Number(c.cx) + Number(c.r));
      minY = Math.min(minY, Number(c.cy) - Number(c.r));
      maxY = Math.max(maxY, Number(c.cy) + Number(c.r));
    }
  }

  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  // UNIFORM SCALE ensures circles remain true circles and 90° remains true 90°!
  const scale = Math.min((width - padL - padR) / spanX, (height - padT - padB) / spanY);
  const drawW = spanX * scale;
  const drawH = spanY * scale;
  const offX = (width - drawW) / 2 - minX * scale;
  const offY = padT + (height - padT - padB - drawH) / 2 + maxY * scale;

  const toX = (x: number) => offX + x * scale;
  const toY = (y: number) => offY - y * scale;

  const ptMap: Record<string, { x: number; y: number; sx: number; sy: number }> = {};
  for (const pt of rawPoints) {
    ptMap[pt.name] = { x: pt.x, y: pt.y, sx: toX(pt.x), sy: toY(pt.y) };
  }

  const parts: string[] = [];

  // Optional coordinate axes
  if (p.showAxes) {
    const ox = toX(0);
    const oy = toY(0);
    parts.push(`<line x1="${padL - 18}" y1="${fmtNum(oy)}" x2="${width - padR + 18}" y2="${fmtNum(oy)}" stroke="#94a3b8" stroke-width="1.3" marker-end="url(#rw-arrow)"/>`);
    parts.push(`<line x1="${fmtNum(ox)}" y1="${height - padB + 16}" x2="${fmtNum(ox)}" y2="${padT - 14}" stroke="#94a3b8" stroke-width="1.3" marker-end="url(#rw-arrow)"/>`);
    parts.push(`<text x="${width - padR + 22}" y="${fmtNum(oy + 4)}" font-size="11.5" font-style="italic" font-weight="700" fill="#475569">x</text>`);
    parts.push(`<text x="${fmtNum(ox + 7)}" y="${padT - 10}" font-size="11.5" font-style="italic" font-weight="700" fill="#475569">y</text>`);
  }

  // Shaded polygons
  const polygons: Array<{ vertices: string[]; fill?: string; stroke?: string }> = Array.isArray(p.polygons)
    ? p.polygons
    : rawPoints.length >= 3 && (!Array.isArray(p.segments) || p.segments.length === 0)
      ? [{ vertices: rawPoints.map((pt) => pt.name), fill: 'url(#rw-fill-blue)', stroke: '#0f172a' }]
      : [];

  for (const poly of polygons) {
    const coords = (poly.vertices || []).map((name) => ptMap[name]).filter(Boolean);
    if (coords.length >= 3) {
      const pStr = coords.map((c) => `${fmtNum(c.sx)},${fmtNum(c.sy)}`).join(' ');
      parts.push(`<polygon points="${pStr}" fill="${escapeXml(poly.fill || 'url(#rw-fill-blue)')}" stroke="${escapeXml(poly.stroke || '#0f172a')}" stroke-width="2" stroke-linejoin="round"/>`);
    }
  }

  // Circles / semicircles
  for (const c of rawCircles) {
    const cx = toX(Number(c.cx));
    const cy = toY(Number(c.cy));
    const r = Number(c.r) * scale;
    parts.push(`<circle cx="${fmtNum(cx)}" cy="${fmtNum(cy)}" r="${fmtNum(r)}" fill="${escapeXml(c.fill || 'none')}" stroke="${escapeXml(c.stroke || '#1d4ed8')}" stroke-width="2"${c.dashed ? ' stroke-dasharray="5,3"' : ''}/>`);
    if (c.label) {
      parts.push(`<text x="${fmtNum(cx + r * 0.55)}" y="${fmtNum(cy - r * 0.55)}" font-size="11.5" font-weight="700" fill="#1d4ed8">${escapeXml(String(c.label))}</text>`);
    }
  }

  // Segments
  const segments: Array<{ from: string; to: string; dashed?: boolean; color?: string; label?: string }> = Array.isArray(p.segments) ? p.segments : [];
  for (const seg of segments) {
    const a = ptMap[seg.from];
    const b = ptMap[seg.to];
    if (!a || !b) continue;
    parts.push(`<line x1="${fmtNum(a.sx)}" y1="${fmtNum(a.sy)}" x2="${fmtNum(b.sx)}" y2="${fmtNum(b.sy)}" stroke="${escapeXml(seg.color || '#0f172a')}" stroke-width="2"${seg.dashed ? ' stroke-dasharray="5,3"' : ''}/>`);
    if (seg.label) {
      const mx = (a.sx + b.sx) / 2;
      const my = (a.sy + b.sy) / 2;
      parts.push(`<text x="${fmtNum(mx)}" y="${fmtNum(my - 6)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1e293b">${escapeXml(String(seg.label))}</text>`);
    }
  }

  // Right angle marks
  const rightAngles: Array<[string, string, string]> = Array.isArray(p.rightAngles) ? p.rightAngles : [];
  for (const tri of rightAngles) {
    if (!Array.isArray(tri) || tri.length < 3) continue;
    const A = ptMap[tri[0]];
    const B = ptMap[tri[1]];
    const C = ptMap[tri[2]];
    if (A && B && C) {
      parts.push(drawRightAngleMark(A.sx, A.sy, B.sx, B.sy, C.sx, C.sy, 10));
    }
  }

  // Dimensions
  const dims: Array<{ from: string; to: string; label: string; offset?: number }> = Array.isArray(p.dims) ? p.dims : [];
  for (const dim of dims) {
    const A = ptMap[dim.from];
    const B = ptMap[dim.to];
    if (A && B && dim.label) {
      parts.push(drawDimensionLine(A.sx, A.sy, B.sx, B.sy, String(dim.label), Number(dim.offset ?? 20)));
    }
  }

  // Points and smart outward labels
  const centerX = rawPoints.length > 0 ? rawPoints.reduce((s, q) => s + toX(q.x), 0) / rawPoints.length : width / 2;
  const centerY = rawPoints.length > 0 ? rawPoints.reduce((s, q) => s + toY(q.y), 0) / rawPoints.length : height / 2;
  for (const pt of rawPoints) {
    const sx = toX(pt.x);
    const sy = toY(pt.y);
    const vx = sx - centerX;
    const vy = sy - centerY;
    const l = Math.hypot(vx, vy) || 1;
    parts.push(`<circle cx="${fmtNum(sx)}" cy="${fmtNum(sy)}" r="3.5" fill="#0f172a"/>`);
    if (pt.name) {
      parts.push(`<text x="${fmtNum(sx + (vx / l) * 15)}" y="${fmtNum(sy + (vy / l) * 15 + 4)}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">${escapeXml(pt.name)}</text>`);
    }
  }

  return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
}

// ============================================================================
// 4. SOLID 3D (Cylinder, Cone, Frustum, Box, Open Box Cutout, Pyramid, Prism, Sphere)
// ============================================================================
function renderSolid3D(spec: RealWorldFigureSpec): string {
  const p = { ...spec, ...(spec.params || {}) };
  const shape = String(p.shape || 'cylinder').toLowerCase();
  const width = 520;
  const height = 300;
  const parts: string[] = [];

  if (shape === 'open_box_cut') {
    // Classic optimization: cardboard sheet a x b with 4 corners x cut out
    const a = Math.max(1, Number(p.a ?? p.length ?? 30));
    const b = Math.max(1, Number(p.b ?? p.width ?? 20));
    const xCut = Math.max(Math.min(a, b) * 0.14, Math.min(Math.min(a, b) * 0.34, Number(p.x ?? Math.min(a, b) * 0.22)));
    const scale = Math.min(340 / a, 175 / b);
    const rw = a * scale;
    const rh = b * scale;
    const rx = xCut * scale;
    const x0 = (width - rw) / 2;
    const y0 = (height - rh) / 2 + 4;

    // Full sheet
    parts.push(`<rect x="${fmtNum(x0)}" y="${fmtNum(y0)}" width="${fmtNum(rw)}" height="${fmtNum(rh)}" fill="#eff6ff" stroke="#1e293b" stroke-width="2"/>`);
    // 4 cut corners hatched
    const corners = [
      [x0, y0],
      [x0 + rw - rx, y0],
      [x0, y0 + rh - rx],
      [x0 + rw - rx, y0 + rh - rx]
    ];
    for (const [cx, cy] of corners) {
      parts.push(`<rect x="${fmtNum(cx)}" y="${fmtNum(cy)}" width="${fmtNum(rx)}" height="${fmtNum(rx)}" fill="url(#rw-hatch)" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4,2"/>`);
    }
    // Inner fold rectangle
    parts.push(`<rect x="${fmtNum(x0 + rx)}" y="${fmtNum(y0 + rx)}" width="${fmtNum(rw - 2 * rx)}" height="${fmtNum(rh - 2 * rx)}" fill="#dbeafe" fill-opacity="0.45" stroke="#1d4ed8" stroke-width="1.6" stroke-dasharray="5,3"/>`);

    // Corner x labels
    const xLabel = String(p.xLabel || 'x');
    parts.push(`<text x="${fmtNum(x0 + rx / 2)}" y="${fmtNum(y0 - 5)}" text-anchor="middle" font-size="12" font-weight="700" fill="#dc2626">${escapeXml(xLabel)}</text>`);
    parts.push(`<text x="${fmtNum(x0 - 10)}" y="${fmtNum(y0 + rx / 2 + 4)}" text-anchor="middle" font-size="12" font-weight="700" fill="#dc2626">${escapeXml(xLabel)}</text>`);

    const unit = p.unit ? ` ${p.unit}` : ' cm';
    parts.push(drawDimensionLine(x0, y0 + rh, x0 + rw, y0 + rh, String(p.aLabel || `${fmtNum(a)}${unit}`), 24, '#0f172a'));
    parts.push(drawDimensionLine(x0 + rw, y0, x0 + rw, y0 + rh, String(p.bLabel || `${fmtNum(b)}${unit}`), 28, '#0f172a'));

    return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
  }

  if (shape === 'cone') {
    const r = Math.max(1, Number(p.r ?? p.radius ?? 5));
    const h = Math.max(1, Number(p.h ?? p.height ?? 12));
    const scale = Math.min(130 / r, 165 / h);
    const rx = Math.max(48, Math.min(130, r * scale));
    const ry = rx * 0.28;
    const hPx = Math.max(90, Math.min(175, h * scale));
    const cx = width / 2 - 10;
    const cy = height - 62;
    const sy = cy - hPx;

    // Fill cone body
    parts.push(`<path d="M ${fmtNum(cx)} ${fmtNum(sy)} L ${fmtNum(cx - rx)} ${fmtNum(cy)} A ${fmtNum(rx)} ${fmtNum(ry)} 0 0 0 ${fmtNum(cx + rx)} ${fmtNum(cy)} Z" fill="url(#rw-fill-blue)" stroke="none"/>`);
    // Back half of base ellipse (dashed)
    parts.push(`<path d="M ${fmtNum(cx - rx)} ${fmtNum(cy)} A ${fmtNum(rx)} ${fmtNum(ry)} 0 0 1 ${fmtNum(cx + rx)} ${fmtNum(cy)}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`);
    // Front half of base ellipse (solid)
    parts.push(`<path d="M ${fmtNum(cx - rx)} ${fmtNum(cy)} A ${fmtNum(rx)} ${fmtNum(ry)} 0 0 0 ${fmtNum(cx + rx)} ${fmtNum(cy)}" fill="none" stroke="#0f172a" stroke-width="2.1"/>`);
    // Slant edges
    parts.push(`<line x1="${fmtNum(cx)}" y1="${fmtNum(sy)}" x2="${fmtNum(cx - rx)}" y2="${fmtNum(cy)}" stroke="#0f172a" stroke-width="2.1"/>`);
    parts.push(`<line x1="${fmtNum(cx)}" y1="${fmtNum(sy)}" x2="${fmtNum(cx + rx)}" y2="${fmtNum(cy)}" stroke="#0f172a" stroke-width="2.1"/>`);
    // Axis SO & Radius OA
    parts.push(`<line x1="${fmtNum(cx)}" y1="${fmtNum(sy)}" x2="${fmtNum(cx)}" y2="${fmtNum(cy)}" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="5,3"/>`);
    parts.push(`<line x1="${fmtNum(cx)}" y1="${fmtNum(cy)}" x2="${fmtNum(cx + rx)}" y2="${fmtNum(cy)}" stroke="#1d4ed8" stroke-width="1.6" stroke-dasharray="4,3"/>`);
    parts.push(drawRightAngleMark(cx, sy, cx, cy, cx + rx, cy, 10));

    // Points & labels
    parts.push(`<circle cx="${fmtNum(cx)}" cy="${fmtNum(sy)}" r="3.2" fill="#0f172a"/>`);
    parts.push(`<circle cx="${fmtNum(cx)}" cy="${fmtNum(cy)}" r="3" fill="#0f172a"/>`);
    parts.push(`<text x="${fmtNum(cx)}" y="${fmtNum(sy - 10)}" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">S</text>`);
    parts.push(`<text x="${fmtNum(cx - 12)}" y="${fmtNum(cy + 14)}" font-size="12.5" font-weight="700" fill="#0f172a">O</text>`);

    const unit = p.unit ? ` ${p.unit}` : '';
    const rLabel = String(p.rLabel || `r = ${fmtNum(r)}${unit}`);
    const hLabel = String(p.hLabel || `h = ${fmtNum(h)}${unit}`);
    parts.push(`<text x="${fmtNum(cx + rx / 2)}" y="${fmtNum(cy - 6)}" text-anchor="middle" font-size="12" font-weight="700" fill="#1d4ed8">${escapeXml(rLabel)}</text>`);
    parts.push(`<text x="${fmtNum(cx - 8)}" y="${fmtNum((sy + cy) / 2)}" text-anchor="end" font-size="12" font-weight="700" fill="#dc2626">${escapeXml(hLabel)}</text>`);
    if (p.lLabel) {
      parts.push(`<text x="${fmtNum(cx + rx / 2 + 18)}" y="${fmtNum((sy + cy) / 2 - 4)}" font-size="12" font-weight="700" fill="#059669">${escapeXml(String(p.lLabel))}</text>`);
    }

    return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
  }

  if (shape === 'frustum') {
    const R = Math.max(2, Number(p.R ?? p.rBottom ?? 8));
    const r = Math.max(1, Number(p.r ?? p.rTop ?? 5));
    const h = Math.max(1, Number(p.h ?? p.height ?? 10));
    const maxR = Math.max(R, r);
    const scale = Math.min(125 / maxR, 155 / h);
    const Rx = Math.max(45, R * scale);
    const rx = Math.max(30, r * scale);
    const Ry = Rx * 0.26;
    const ry = rx * 0.26;
    const hPx = Math.max(85, Math.min(165, h * scale));
    const cx = width / 2;
    const botY = height - 62;
    const topY = botY - hPx;

    parts.push(`<path d="M ${fmtNum(cx - rx)} ${fmtNum(topY)} L ${fmtNum(cx - Rx)} ${fmtNum(botY)} A ${fmtNum(Rx)} ${fmtNum(Ry)} 0 0 0 ${fmtNum(cx + Rx)} ${fmtNum(botY)} L ${fmtNum(cx + rx)} ${fmtNum(topY)} Z" fill="url(#rw-fill-blue)"/>`);
    parts.push(`<ellipse cx="${fmtNum(cx)}" cy="${fmtNum(topY)}" rx="${fmtNum(rx)}" ry="${fmtNum(ry)}" fill="#dbeafe" fill-opacity="0.6" stroke="#0f172a" stroke-width="2"/>`);
    parts.push(`<path d="M ${fmtNum(cx - Rx)} ${fmtNum(botY)} A ${fmtNum(Rx)} ${fmtNum(Ry)} 0 0 1 ${fmtNum(cx + Rx)} ${fmtNum(botY)}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`);
    parts.push(`<path d="M ${fmtNum(cx - Rx)} ${fmtNum(botY)} A ${fmtNum(Rx)} ${fmtNum(Ry)} 0 0 0 ${fmtNum(cx + Rx)} ${fmtNum(botY)}" fill="none" stroke="#0f172a" stroke-width="2.1"/>`);
    parts.push(`<line x1="${fmtNum(cx - rx)}" y1="${fmtNum(topY)}" x2="${fmtNum(cx - Rx)}" y2="${fmtNum(botY)}" stroke="#0f172a" stroke-width="2.1"/>`);
    parts.push(`<line x1="${fmtNum(cx + rx)}" y1="${fmtNum(topY)}" x2="${fmtNum(cx + Rx)}" y2="${fmtNum(botY)}" stroke="#0f172a" stroke-width="2.1"/>`);
    parts.push(`<line x1="${fmtNum(cx)}" y1="${fmtNum(topY)}" x2="${fmtNum(cx)}" y2="${fmtNum(botY)}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="5,3"/>`);
    parts.push(`<line x1="${fmtNum(cx)}" y1="${fmtNum(topY)}" x2="${fmtNum(cx + rx)}" y2="${fmtNum(topY)}" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="4,2"/>`);
    parts.push(`<line x1="${fmtNum(cx)}" y1="${fmtNum(botY)}" x2="${fmtNum(cx + Rx)}" y2="${fmtNum(botY)}" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="4,2"/>`);

    const unit = p.unit ? ` ${p.unit}` : '';
    parts.push(`<text x="${fmtNum(cx + rx / 2)}" y="${fmtNum(topY - 7)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1d4ed8">${escapeXml(String(p.rLabel || `r = ${fmtNum(r)}${unit}`))}</text>`);
    parts.push(`<text x="${fmtNum(cx + Rx / 2)}" y="${fmtNum(botY - 6)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1d4ed8">${escapeXml(String(p.RLabel || `R = ${fmtNum(R)}${unit}`))}</text>`);
    parts.push(`<text x="${fmtNum(cx - 8)}" y="${fmtNum((topY + botY) / 2)}" text-anchor="end" font-size="12" font-weight="700" fill="#dc2626">${escapeXml(String(p.hLabel || `h = ${fmtNum(h)}${unit}`))}</text>`);

    return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
  }

  if (shape === 'box' || shape === 'prism') {
    const a = Math.max(1, Number(p.a ?? p.length ?? 12));
    const b = Math.max(1, Number(p.b ?? p.width ?? 8));
    const h = Math.max(1, Number(p.h ?? p.height ?? 7));
    const scale = Math.min(200 / a, 120 / h, 140 / b);
    const wPx = Math.max(90, Math.min(210, a * scale));
    const hPx = Math.max(70, Math.min(130, h * scale));
    const dPx = Math.max(36, Math.min(80, b * scale * 0.55));
    const dx = dPx * 0.78;
    const dy = -dPx * 0.52;

    const x0 = (width - (wPx + dx)) / 2;
    const y0 = height - 62;

    // Front face A(x0,y0), B(x0+wPx,y0), B'(x0+wPx,y0-hPx), A'(x0,y0-hPx)
    const A = [x0, y0];
    const B = [x0 + wPx, y0];
    const C = [x0 + wPx + dx, y0 + dy];
    const D = [x0 + dx, y0 + dy];
    const A1 = [x0, y0 - hPx];
    const B1 = [x0 + wPx, y0 - hPx];
    const C1 = [x0 + wPx + dx, y0 - hPx + dy];
    const D1 = [x0 + dx, y0 - hPx + dy];

    // Shaded faces
    parts.push(`<polygon points="${A1} ${B1} ${C1} ${D1}" fill="#dbeafe" fill-opacity="0.55"/>`);
    parts.push(`<polygon points="${A} ${B} ${B1} ${A1}" fill="#eff6ff" fill-opacity="0.7"/>`);
    parts.push(`<polygon points="${B} ${C} ${C1} ${B1}" fill="#bfdbfe" fill-opacity="0.45"/>`);

    // Hidden edges (dashed)
    parts.push(`<line x1="${A[0]}" y1="${A[1]}" x2="${D[0]}" y2="${D[1]}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`);
    parts.push(`<line x1="${D[0]}" y1="${D[1]}" x2="${C[0]}" y2="${C[1]}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`);
    parts.push(`<line x1="${D[0]}" y1="${D[1]}" x2="${D1[0]}" y2="${D1[1]}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`);

    // Solid visible edges
    const solidEdges = [
      [A, B], [B, C], [A, A1], [B, B1], [C, C1],
      [A1, B1], [B1, C1], [C1, D1], [D1, A1]
    ];
    for (const [u, v] of solidEdges) {
      parts.push(`<line x1="${fmtNum(u[0])}" y1="${fmtNum(u[1])}" x2="${fmtNum(v[0])}" y2="${fmtNum(v[1])}" stroke="#0f172a" stroke-width="2"/>`);
    }

    const unit = p.unit ? ` ${p.unit}` : '';
    parts.push(drawDimensionLine(A[0], A[1], B[0], B[1], String(p.aLabel || `${fmtNum(a)}${unit}`), 22, '#0f172a'));
    parts.push(drawDimensionLine(B[0], B[1], C[0], C[1], String(p.bLabel || `${fmtNum(b)}${unit}`), 20, '#1d4ed8'));
    parts.push(drawDimensionLine(A1[0], A1[1], A[0], A[1], String(p.hLabel || `${fmtNum(h)}${unit}`), 24, '#dc2626'));

    return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
  }

  if (shape === 'pyramid') {
    const a = Math.max(1, Number(p.a ?? p.baseSide ?? 10));
    const h = Math.max(1, Number(p.h ?? p.height ?? 12));
    const wPx = 175;
    const dx = 54;
    const dy = -34;
    const hPx = Math.max(105, Math.min(160, (h / a) * 120));

    const x0 = (width - (wPx + dx)) / 2;
    const y0 = height - 60;
    const A = [x0, y0];
    const B = [x0 + wPx, y0];
    const C = [x0 + wPx + dx, y0 + dy];
    const D = [x0 + dx, y0 + dy];
    const O = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
    const S = [O[0], O[1] - hPx];

    parts.push(`<polygon points="${A} ${B} ${C} ${D}" fill="#eff6ff" fill-opacity="0.7"/>`);
    parts.push(`<polygon points="${S} ${A} ${B}" fill="url(#rw-fill-blue)"/>`);
    parts.push(`<polygon points="${S} ${B} ${C}" fill="#bfdbfe" fill-opacity="0.35"/>`);

    // Hidden edges
    parts.push(`<line x1="${A[0]}" y1="${A[1]}" x2="${D[0]}" y2="${D[1]}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`);
    parts.push(`<line x1="${D[0]}" y1="${D[1]}" x2="${C[0]}" y2="${C[1]}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`);
    parts.push(`<line x1="${S[0]}" y1="${S[1]}" x2="${D[0]}" y2="${D[1]}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`);
    parts.push(`<line x1="${A[0]}" y1="${A[1]}" x2="${C[0]}" y2="${C[1]}" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3"/>`);
    parts.push(`<line x1="${B[0]}" y1="${B[1]}" x2="${D[0]}" y2="${D[1]}" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3"/>`);
    parts.push(`<line x1="${S[0]}" y1="${S[1]}" x2="${O[0]}" y2="${O[1]}" stroke="#dc2626" stroke-width="1.7" stroke-dasharray="5,3"/>`);
    parts.push(drawRightAngleMark(S[0], S[1], O[0], O[1], B[0], B[1], 10));

    // Visible edges
    for (const [u, v] of [[A, B], [B, C], [S, A], [S, B], [S, C]]) {
      parts.push(`<line x1="${fmtNum(u[0])}" y1="${fmtNum(u[1])}" x2="${fmtNum(v[0])}" y2="${fmtNum(v[1])}" stroke="#0f172a" stroke-width="2.1"/>`);
    }

    const vLabels = [
      { pt: S, name: 'S', dx: 0, dy: -10 },
      { pt: A, name: 'A', dx: -14, dy: 14 },
      { pt: B, name: 'B', dx: 12, dy: 16 },
      { pt: C, name: 'C', dx: 14, dy: 2 },
      { pt: D, name: 'D', dx: -14, dy: -4 },
      { pt: O, name: 'O', dx: -12, dy: 14 }
    ];
    for (const v of vLabels) {
      parts.push(`<text x="${fmtNum(v.pt[0] + v.dx)}" y="${fmtNum(v.pt[1] + v.dy)}" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">${v.name}</text>`);
    }
    const unit = p.unit ? ` ${p.unit}` : '';
    parts.push(drawDimensionLine(A[0], A[1], B[0], B[1], String(p.aLabel || `${fmtNum(a)}${unit}`), 22, '#0f172a'));
    parts.push(`<text x="${fmtNum(O[0] + 10)}" y="${fmtNum((S[1] + O[1]) / 2)}" font-size="12" font-weight="700" fill="#dc2626">${escapeXml(String(p.hLabel || `h = ${fmtNum(h)}${unit}`))}</text>`);

    return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
  }

  if (shape === 'sphere') {
    const r = Math.max(1, Number(p.r ?? p.radius ?? 6));
    const Rpx = 92;
    const cx = width / 2;
    const cy = height / 2 + 4;
    const ry = Rpx * 0.28;

    parts.push(`<circle cx="${cx}" cy="${cy}" r="${Rpx}" fill="url(#rw-fill-blue)" stroke="#0f172a" stroke-width="2.2"/>`);
    parts.push(`<path d="M ${cx - Rpx} ${cy} A ${Rpx} ${fmtNum(ry)} 0 0 1 ${cx + Rpx} ${cy}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`);
    parts.push(`<path d="M ${cx - Rpx} ${cy} A ${Rpx} ${fmtNum(ry)} 0 0 0 ${cx + Rpx} ${cy}" fill="none" stroke="#1e293b" stroke-width="1.7"/>`);
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${fmtNum(cx + Rpx * 0.78)}" y2="${fmtNum(cy - Rpx * 0.62)}" stroke="#dc2626" stroke-width="2" marker-end="url(#rw-arrow-red)"/>`);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="3.5" fill="#0f172a"/>`);
    parts.push(`<text x="${cx - 12}" y="${cy + 16}" font-size="13" font-weight="700" fill="#0f172a">O</text>`);
    const unit = p.unit ? ` ${p.unit}` : '';
    parts.push(`<text x="${fmtNum(cx + Rpx * 0.44)}" y="${fmtNum(cy - Rpx * 0.42)}" font-size="12.5" font-weight="700" fill="#dc2626">${escapeXml(String(p.rLabel || `R = ${fmtNum(r)}${unit}`))}</text>`);

    return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
  }

  // Default: Cylinder
  const r = Math.max(1, Number(p.r ?? p.radius ?? 5));
  const h = Math.max(1, Number(p.h ?? p.height ?? 12));
  const scale = Math.min(115 / r, 155 / h);
  const rx = Math.max(46, Math.min(115, r * scale));
  const ry = rx * 0.27;
  const hPx = Math.max(82, Math.min(160, h * scale));
  const cx = width / 2 - 12;
  const botY = height - 62;
  const topY = botY - hPx;

  parts.push(`<rect x="${fmtNum(cx - rx)}" y="${fmtNum(topY)}" width="${fmtNum(rx * 2)}" height="${fmtNum(hPx)}" fill="url(#rw-fill-blue)"/>`);
  parts.push(`<ellipse cx="${fmtNum(cx)}" cy="${fmtNum(topY)}" rx="${fmtNum(rx)}" ry="${fmtNum(ry)}" fill="#dbeafe" fill-opacity="0.6" stroke="#0f172a" stroke-width="2.1"/>`);
  parts.push(`<path d="M ${fmtNum(cx - rx)} ${fmtNum(botY)} A ${fmtNum(rx)} ${fmtNum(ry)} 0 0 1 ${fmtNum(cx + rx)} ${fmtNum(botY)}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`);
  parts.push(`<path d="M ${fmtNum(cx - rx)} ${fmtNum(botY)} A ${fmtNum(rx)} ${fmtNum(ry)} 0 0 0 ${fmtNum(cx + rx)} ${fmtNum(botY)}" fill="none" stroke="#0f172a" stroke-width="2.1"/>`);
  parts.push(`<line x1="${fmtNum(cx - rx)}" y1="${fmtNum(topY)}" x2="${fmtNum(cx - rx)}" y2="${fmtNum(botY)}" stroke="#0f172a" stroke-width="2.1"/>`);
  parts.push(`<line x1="${fmtNum(cx + rx)}" y1="${fmtNum(topY)}" x2="${fmtNum(cx + rx)}" y2="${fmtNum(botY)}" stroke="#0f172a" stroke-width="2.1"/>`);
  parts.push(`<line x1="${fmtNum(cx)}" y1="${fmtNum(topY)}" x2="${fmtNum(cx)}" y2="${fmtNum(botY)}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="5,3"/>`);
  parts.push(`<line x1="${fmtNum(cx)}" y1="${fmtNum(botY)}" x2="${fmtNum(cx + rx)}" y2="${fmtNum(botY)}" stroke="#1d4ed8" stroke-width="1.6" stroke-dasharray="4,3"/>`);
  parts.push(drawRightAngleMark(cx, topY, cx, botY, cx + rx, botY, 9));

  const unit = p.unit ? ` ${p.unit}` : '';
  parts.push(`<text x="${fmtNum(cx + rx / 2)}" y="${fmtNum(botY - 6)}" text-anchor="middle" font-size="12" font-weight="700" fill="#1d4ed8">${escapeXml(String(p.rLabel || `r = ${fmtNum(r)}${unit}`))}</text>`);
  parts.push(drawDimensionLine(cx + rx, topY, cx + rx, botY, String(p.hLabel || `h = ${fmtNum(h)}${unit}`), 30, '#dc2626'));

  return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
}

// ============================================================================
// 5. SEQUENCE CHART (Arithmetic/Geometric progressions, Stadium seats, Bouncing ball)
// ============================================================================
function renderSequenceChart(spec: RealWorldFigureSpec): string {
  const p = { ...spec, ...(spec.params || {}) };
  const subtype = String(p.subtype || 'bars').toLowerCase();
  const width = 540;
  const height = 290;
  const parts: string[] = [];

  if (subtype === 'bouncing_ball') {
    const h0 = Math.max(1, Number(p.h0 ?? 10));
    const q = Math.max(0.25, Math.min(0.92, Number(p.q ?? 0.6)));
    const bounces = Math.max(3, Math.min(6, Number(p.bounces ?? 5)));
    const groundY = height - 56;
    const topY = 56;
    const availH = groundY - topY;
    const xStart = 66;
    const xEnd = width - 48;
    const spanW = xEnd - xStart;

    // Ground
    parts.push(`<line x1="42" y1="${groundY}" x2="${width - 36}" y2="${groundY}" stroke="#475569" stroke-width="2.2"/>`);

    // Initial drop from h0
    const firstDropW = spanW * 0.14;
    let curX = xStart;
    parts.push(`<circle cx="${fmtNum(curX)}" cy="${fmtNum(topY)}" r="7" fill="#ef4444" stroke="#991b1b" stroke-width="1.5"/>`);
    parts.push(`<path d="M ${fmtNum(curX)} ${fmtNum(topY)} Q ${fmtNum(curX + firstDropW * 0.45)} ${fmtNum(topY)} ${fmtNum(curX + firstDropW)} ${fmtNum(groundY)}" fill="none" stroke="#1d4ed8" stroke-width="2.2" stroke-dasharray="5,3"/>`);
    parts.push(drawDimensionLine(curX, groundY, curX, topY, String(p.h0Label || `h₀ = ${fmtNum(h0)}${p.unit ? ' ' + p.unit : ' m'}`), -24, '#dc2626'));
    curX += firstDropW;

    const remW = xEnd - curX;
    let totalWeight = 0;
    for (let k = 1; k <= bounces; k++) totalWeight += Math.pow(Math.sqrt(q), k - 1);

    let curH = h0;
    for (let k = 1; k <= bounces; k++) {
      curH *= q;
      const segW = (remW * Math.pow(Math.sqrt(q), k - 1)) / totalWeight;
      const peakY = groundY - (curH / h0) * availH;
      const midX = curX + segW / 2;
      const nextX = curX + segW;
      // True quadratic Bezier control point for exact parabola height: ctrlY = 2*peakY - groundY
      const ctrlY = 2 * peakY - groundY;
      parts.push(`<path d="M ${fmtNum(curX)} ${fmtNum(groundY)} Q ${fmtNum(midX)} ${fmtNum(ctrlY)} ${fmtNum(nextX)} ${fmtNum(groundY)}" fill="none" stroke="#1d4ed8" stroke-width="2.2"/>`);
      parts.push(`<line x1="${fmtNum(midX)}" y1="${fmtNum(peakY)}" x2="${fmtNum(midX)}" y2="${fmtNum(groundY)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3"/>`);
      parts.push(`<circle cx="${fmtNum(midX)}" cy="${fmtNum(peakY)}" r="4.5" fill="#f97316" stroke="#ffffff" stroke-width="1.2"/>`);
      if (k <= 3) {
        parts.push(`<text x="${fmtNum(midX)}" y="${fmtNum(peakY - 10)}" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a">h${k} = ${fmtNum(curH, 2)}</text>`);
      }
      curX = nextX;
    }

    return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
  }

  if (subtype === 'seats') {
    const u1 = Math.max(1, Number(p.u1 ?? 15));
    const d = Number(p.d ?? 3);
    const totalRows = Math.max(3, Number(p.n ?? 10));
    const showRows = Math.min(5, totalRows);
    const cx = width / 2;
    const stageY = height - 42;

    // Stage block
    parts.push(`<rect x="${cx - 70}" y="${stageY - 22}" width="140" height="24" rx="6" fill="#0f172a"/>`);
    parts.push(`<text x="${cx}" y="${stageY - 6}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff">SÂN KHẤU</text>`);

    for (let i = 0; i < showRows; i++) {
      const r = 68 + i * 32;
      const rowNum = i < showRows - 1 || totalRows <= 5 ? i + 1 : totalRows;
      const seatsCount = u1 + (rowNum - 1) * d;
      const startAngle = -Math.PI * 0.82;
      const endAngle = -Math.PI * 0.18;
      const sx = cx + r * Math.cos(startAngle);
      const sy = stageY + r * Math.sin(startAngle);
      const ex = cx + r * Math.cos(endAngle);
      const ey = stageY + r * Math.sin(endAngle);
      const isLast = i === showRows - 1 && totalRows > 5;

      parts.push(`<path d="M ${fmtNum(sx)} ${fmtNum(sy)} A ${r} ${r} 0 0 1 ${fmtNum(ex)} ${fmtNum(ey)}" fill="none" stroke="${isLast ? '#059669' : '#2563eb'}" stroke-width="5" stroke-linecap="round"${isLast ? ' stroke-dasharray="8,5"' : ''}/>`);
      parts.push(`<text x="${fmtNum(ex + 10)}" y="${fmtNum(ey + 4)}" font-size="11.5" font-weight="700" fill="#1e293b">Hàng ${rowNum}: ${fmtNum(seatsCount)} ghế</text>`);
    }

    return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
  }

  // Default: proportional bar/step chart for u_1, u_2, ..., u_k
  const values: number[] = Array.isArray(p.values) && p.values.length > 0
    ? p.values.map((v: any) => Number(v)).filter((v: number) => Number.isFinite(v))
    : [10, 14, 18, 22, 26];
  const labels: string[] = Array.isArray(p.labels) && p.labels.length === values.length
    ? p.labels.map(String)
    : values.map((_, idx) => `u${idx + 1}`);

  const padL = 56;
  const padR = 32;
  const padT = 48;
  const padB = 54;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const maxVal = Math.max(...values, 1) * 1.15;

  // Axes & grid
  for (let i = 0; i <= 4; i++) {
    const v = (maxVal * i) / 4;
    const py = padT + plotH - (v / maxVal) * plotH;
    parts.push(`<line x1="${padL}" y1="${fmtNum(py)}" x2="${padL + plotW}" y2="${fmtNum(py)}" stroke="#e2e8f0" stroke-width="1"/>`);
    parts.push(`<text x="${padL - 8}" y="${fmtNum(py + 4)}" text-anchor="end" font-size="10.5" fill="#475569">${fmtNum(v, 1)}</text>`);
  }
  parts.push(`<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW + 8}" y2="${padT + plotH}" stroke="#1e293b" stroke-width="1.6"/>`);
  parts.push(`<line x1="${padL}" y1="${padT + plotH}" x2="${padL}" y2="${padT - 8}" stroke="#1e293b" stroke-width="1.6"/>`);

  const slotW = plotW / values.length;
  const barW = Math.min(46, slotW * 0.62);
  values.forEach((v, idx) => {
    const bh = Math.max(2, (Math.max(0, v) / maxVal) * plotH);
    const bx = padL + idx * slotW + (slotW - barW) / 2;
    const by = padT + plotH - bh;
    parts.push(`<rect x="${fmtNum(bx)}" y="${fmtNum(by)}" width="${fmtNum(barW)}" height="${fmtNum(bh)}" rx="4" fill="#3b82f6" fill-opacity="0.82" stroke="#1d4ed8" stroke-width="1.2"/>`);
    parts.push(`<text x="${fmtNum(bx + barW / 2)}" y="${fmtNum(by - 6)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1e3a8a">${fmtNum(v, 1)}</text>`);
    parts.push(`<text x="${fmtNum(bx + barW / 2)}" y="${fmtNum(padT + plotH + 17)}" text-anchor="middle" font-size="11" font-weight="600" fill="#334155">${escapeXml(labels[idx] || '')}</text>`);
  });

  if (p.yLabel) {
    parts.push(`<text x="${padL + 6}" y="${padT - 12}" font-size="11" font-weight="700" fill="#475569">${escapeXml(String(p.yLabel))}</text>`);
  }

  return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
}

// ============================================================================
// 6. VECTOR PHYSICS (Force equilibrium, Boat/River, Airplane/Wind, Resultant)
// ============================================================================
function renderVectorPhysics(spec: RealWorldFigureSpec): string {
  const p = { ...spec, ...(spec.params || {}) };
  const width = 520;
  const height = 300;
  const rawVecs: Array<{ label: string; magnitude: number; angleDeg: number; color?: string }> =
    Array.isArray(p.vectors) && p.vectors.length > 0
      ? p.vectors
      : [
          { label: 'F₁', magnitude: 40, angleDeg: 0, color: '#1d4ed8' },
          { label: 'F₂', magnitude: 30, angleDeg: 60, color: '#059669' }
        ];

  const vecs = rawVecs.map((v, i) => {
    const mag = Math.max(0.1, Number(v.magnitude ?? 10));
    const ang = Number(v.angleDeg ?? i * 60);
    const rad = (ang * Math.PI) / 180;
    return {
      label: String(v.label || `v${i + 1}`),
      mag,
      ang,
      dx: mag * Math.cos(rad),
      dy: mag * Math.sin(rad),
      color: v.color || (i === 0 ? '#1d4ed8' : i === 1 ? '#059669' : '#7c3aed')
    };
  });

  const showResultant = p.showResultant !== false && vecs.length >= 2;
  const sumDx = vecs.reduce((s, v) => s + v.dx, 0);
  const sumDy = vecs.reduce((s, v) => s + v.dy, 0);
  const sumMag = Math.hypot(sumDx, sumDy);

  const allX = [0, ...vecs.map((v) => v.dx), ...(showResultant ? [sumDx] : [])];
  const allY = [0, ...vecs.map((v) => v.dy), ...(showResultant ? [sumDy] : [])];
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  const padL = 70;
  const padR = 70;
  const padT = 50;
  const padB = 52;
  const scale = Math.min(
    (width - padL - padR) / Math.max(maxX - minX, 1),
    (height - padT - padB) / Math.max(maxY - minY, 1)
  );
  const drawW = (maxX - minX) * scale;
  const drawH = (maxY - minY) * scale;
  const ox = (width - drawW) / 2 - minX * scale;
  const oy = padT + (height - padT - padB - drawH) / 2 + maxY * scale;

  const parts: string[] = [];

  // Reference horizontal dashed axis through O
  parts.push(`<line x1="${fmtNum(ox - 24)}" y1="${fmtNum(oy)}" x2="${fmtNum(ox + drawW + 24)}" y2="${fmtNum(oy)}" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="4,3"/>`);

  // Parallelogram dashed completion if 2 vectors + resultant
  if (showResultant && vecs.length === 2) {
    const x1 = ox + vecs[0].dx * scale;
    const y1 = oy - vecs[0].dy * scale;
    const x2 = ox + vecs[1].dx * scale;
    const y2 = oy - vecs[1].dy * scale;
    const rx = ox + sumDx * scale;
    const ry = oy - sumDy * scale;
    parts.push(`<line x1="${fmtNum(x1)}" y1="${fmtNum(y1)}" x2="${fmtNum(rx)}" y2="${fmtNum(ry)}" stroke="#94a3b8" stroke-width="1.4" stroke-dasharray="5,3"/>`);
    parts.push(`<line x1="${fmtNum(x2)}" y1="${fmtNum(y2)}" x2="${fmtNum(rx)}" y2="${fmtNum(ry)}" stroke="#94a3b8" stroke-width="1.4" stroke-dasharray="5,3"/>`);
    const angleBetween = Math.abs(vecs[1].ang - vecs[0].ang);
    if (angleBetween > 5 && angleBetween < 175) {
      parts.push(drawAngleArc(ox, oy, x1, y1, x2, y2, `${fmtNum(angleBetween, 1)}°`, 34, '#d97706'));
    }
  }

  // Draw vectors
  vecs.forEach((v, idx) => {
    const ex = ox + v.dx * scale;
    const ey = oy - v.dy * scale;
    const marker = idx === 0 ? 'url(#rw-arrow-blue)' : idx === 1 ? 'url(#rw-arrow-emerald)' : 'url(#rw-arrow)';
    parts.push(`<line x1="${fmtNum(ox)}" y1="${fmtNum(oy)}" x2="${fmtNum(ex)}" y2="${fmtNum(ey)}" stroke="${v.color}" stroke-width="2.6" marker-end="${marker}"/>`);
    const lx = ex + (v.dx >= 0 ? 12 : -12);
    const ly = ey + (v.dy >= 0 ? -8 : 16);
    parts.push(`<text x="${fmtNum(lx)}" y="${fmtNum(ly)}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${v.color}">${escapeXml(v.label)}</text>`);
  });

  // Resultant vector
  if (showResultant && sumMag > 1e-4) {
    const rx = ox + sumDx * scale;
    const ry = oy - sumDy * scale;
    parts.push(`<line x1="${fmtNum(ox)}" y1="${fmtNum(oy)}" x2="${fmtNum(rx)}" y2="${fmtNum(ry)}" stroke="#dc2626" stroke-width="2.8" marker-end="url(#rw-arrow-red)"/>`);
    parts.push(`<text x="${fmtNum(rx + 14)}" y="${fmtNum(ry - 6)}" font-size="12.5" font-weight="700" fill="#dc2626">${escapeXml(String(p.resultantLabel || 'F'))}</text>`);
  }

  parts.push(`<circle cx="${fmtNum(ox)}" cy="${fmtNum(oy)}" r="4" fill="#0f172a"/>`);
  parts.push(`<text x="${fmtNum(ox - 12)}" y="${fmtNum(oy + 16)}" font-size="12.5" font-weight="700" fill="#0f172a">O</text>`);

  return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
}

// ============================================================================
// 7. STATISTICS CHART (Histogram / Grouped Frequency Bar Chart)
// ============================================================================
function renderStatisticsChart(spec: RealWorldFigureSpec): string {
  const p = { ...spec, ...(spec.params || {}) };
  const bins: Array<{ label: string; value: number }> = Array.isArray(p.bins) && p.bins.length > 0
    ? p.bins.map((b: any) => ({ label: String(b.label || ''), value: Number(b.value ?? b.freq ?? 0) }))
    : [
        { label: '[10; 20)', value: 5 },
        { label: '[20; 30)', value: 12 },
        { label: '[30; 40)', value: 18 },
        { label: '[40; 50)', value: 9 }
      ];

  const width = 540;
  const height = 290;
  const padL = 56;
  const padR = 32;
  const padT = 46;
  const padB = 56;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const maxVal = Math.max(...bins.map((b) => b.value), 1) * 1.18;

  const parts: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const v = (maxVal * i) / 4;
    const py = padT + plotH - (v / maxVal) * plotH;
    parts.push(`<line x1="${padL}" y1="${fmtNum(py)}" x2="${padL + plotW}" y2="${fmtNum(py)}" stroke="#e2e8f0" stroke-width="1"/>`);
    parts.push(`<text x="${padL - 8}" y="${fmtNum(py + 4)}" text-anchor="end" font-size="10.5" fill="#475569">${fmtNum(v, 1)}</text>`);
  }

  const barW = plotW / bins.length;
  bins.forEach((b, idx) => {
    const bh = Math.max(2, (Math.max(0, b.value) / maxVal) * plotH);
    const bx = padL + idx * barW + 2;
    const by = padT + plotH - bh;
    parts.push(`<rect x="${fmtNum(bx)}" y="${fmtNum(by)}" width="${fmtNum(Math.max(10, barW - 4))}" height="${fmtNum(bh)}" fill="#10b981" fill-opacity="0.78" stroke="#047857" stroke-width="1.3"/>`);
    parts.push(`<text x="${fmtNum(bx + (barW - 4) / 2)}" y="${fmtNum(by - 6)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#065f46">${fmtNum(b.value, 1)}</text>`);
    parts.push(`<text x="${fmtNum(bx + (barW - 4) / 2)}" y="${fmtNum(padT + plotH + 17)}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#334155">${escapeXml(b.label)}</text>`);
  });

  parts.push(`<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW + 8}" y2="${padT + plotH}" stroke="#1e293b" stroke-width="1.6"/>`);
  parts.push(`<line x1="${padL}" y1="${padT + plotH}" x2="${padL}" y2="${padT - 8}" stroke="#1e293b" stroke-width="1.6"/>`);
  if (p.yLabel) parts.push(`<text x="${padL + 6}" y="${padT - 10}" font-size="11" font-weight="700" fill="#475569">${escapeXml(String(p.yLabel))}</text>`);
  if (p.xLabel) parts.push(`<text x="${padL + plotW / 2}" y="${height - 16}" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">${escapeXml(String(p.xLabel))}</text>`);

  return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
}

// ============================================================================
// 8. PROBABILITY TREE (Conditional probability, Bayes, Real-world multi-stage events)
// ============================================================================
function renderProbabilityTree(spec: RealWorldFigureSpec): string {
  const p = { ...spec, ...(spec.params || {}) };
  const branches: Array<{
    label: string;
    prob: string;
    children?: Array<{ label: string; prob: string }>;
  }> = Array.isArray(p.branches) && p.branches.length > 0
    ? p.branches
    : [
        {
          label: 'A',
          prob: '0,6',
          children: [
            { label: 'B', prob: '0,8' },
            { label: 'B̄', prob: '0,2' }
          ]
        },
        {
          label: 'Ā',
          prob: '0,4',
          children: [
            { label: 'B', prob: '0,3' },
            { label: 'B̄', prob: '0,7' }
          ]
        }
      ];

  const width = 540;
  const totalLeaves = branches.reduce((s, b) => s + Math.max(1, (b.children || []).length), 0);
  const height = Math.max(250, 76 + totalLeaves * 46);
  const rootX = 56;
  const midX = 225;
  const leafX = 410;
  const padT = 50;
  const padB = 34;
  const usableH = height - padT - padB;

  const parts: string[] = [];
  const leafStep = usableH / Math.max(totalLeaves, 1);
  let leafIdx = 0;

  const rootY = padT + usableH / 2;

  for (const b of branches) {
    const kids = Array.isArray(b.children) && b.children.length > 0 ? b.children : [];
    const startIdx = leafIdx;
    const count = Math.max(1, kids.length);
    const midY = padT + (startIdx + (count - 1) / 2 + 0.5) * leafStep;

    // Root -> Level 1 branch
    parts.push(`<line x1="${rootX}" y1="${fmtNum(rootY)}" x2="${midX - 24}" y2="${fmtNum(midY)}" stroke="#1d4ed8" stroke-width="1.9"/>`);
    const p1x = (rootX + midX - 24) / 2;
    const p1y = (rootY + midY) / 2 - 7;
    parts.push(`<rect x="${fmtNum(p1x - 24)}" y="${fmtNum(p1y - 10)}" width="48" height="17" rx="4" fill="#eff6ff" stroke="#bfdbfe" stroke-width="0.8"/>`);
    parts.push(`<text x="${fmtNum(p1x)}" y="${fmtNum(p1y + 2)}" text-anchor="middle" font-size="11" font-weight="700" fill="#1e40af">${escapeXml(String(b.prob || ''))}</text>`);

    // Level 1 node
    parts.push(`<rect x="${midX - 24}" y="${fmtNum(midY - 14)}" width="62" height="28" rx="7" fill="#ffffff" stroke="#1d4ed8" stroke-width="1.6"/>`);
    parts.push(`<text x="${midX + 7}" y="${fmtNum(midY + 4)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a">${escapeXml(String(b.label || ''))}</text>`);

    if (kids.length === 0) {
      leafIdx += 1;
    } else {
      for (const kid of kids) {
        const ky = padT + (leafIdx + 0.5) * leafStep;
        parts.push(`<line x1="${midX + 38}" y1="${fmtNum(midY)}" x2="${leafX - 20}" y2="${fmtNum(ky)}" stroke="#059669" stroke-width="1.8"/>`);
        const p2x = (midX + 38 + leafX - 20) / 2;
        const p2y = (midY + ky) / 2 - 6;
        parts.push(`<rect x="${fmtNum(p2x - 24)}" y="${fmtNum(p2y - 10)}" width="48" height="17" rx="4" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="0.8"/>`);
        parts.push(`<text x="${fmtNum(p2x)}" y="${fmtNum(p2y + 2)}" text-anchor="middle" font-size="11" font-weight="700" fill="#065f46">${escapeXml(String(kid.prob || ''))}</text>`);

        parts.push(`<rect x="${leafX - 20}" y="${fmtNum(ky - 13)}" width="98" height="26" rx="7" fill="#f8fafc" stroke="#059669" stroke-width="1.5"/>`);
        parts.push(`<text x="${leafX + 29}" y="${fmtNum(ky + 4)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a">${escapeXml(String(kid.label || ''))}</text>`);
        leafIdx += 1;
      }
    }
  }

  // Root circle
  parts.push(`<circle cx="${rootX}" cy="${fmtNum(rootY)}" r="7" fill="#0f172a"/>`);

  return wrapSvgContainer(width, height, parts.join('\n'), spec.title, spec.caption);
}

// ============================================================================
// MAIN DISPATCHER + RESILIENT TAG PARSER
// ============================================================================
export function renderRealWorldMathFigureSvg(spec: RealWorldFigureSpec): string | null {
  if (!spec || typeof spec !== 'object') return null;
  const type = String(spec.type || '').toLowerCase().trim();
  try {
    switch (type) {
      case 'function_plot':
      case 'parabola':
      case 'graph':
      case 'curve':
        return renderFunctionPlot(spec);
      case 'triangle_survey':
      case 'triangle':
      case 'survey':
        return renderTriangleSurvey(spec);
      case 'geometry_2d':
      case 'polygon':
      case 'circle':
      case 'plane':
        return renderGeometry2D(spec);
      case 'solid_3d':
      case '3d':
      case 'solid':
        return renderSolid3D(spec);
      case 'sequence_chart':
      case 'sequence':
      case 'progression':
        return renderSequenceChart(spec);
      case 'vector_physics':
      case 'vector':
      case 'vectors':
        return renderVectorPhysics(spec);
      case 'statistics_chart':
      case 'statistics':
      case 'histogram':
        return renderStatisticsChart(spec);
      case 'probability_tree':
      case 'probability':
      case 'tree':
        return renderProbabilityTree(spec);
      default:
        return null;
    }
  } catch (err) {
    console.warn('Error rendering real-world math figure:', err);
    return null;
  }
}

function encodeSvgToWrapper(svg: string): string {
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(encodeURIComponent(svg))
      : Buffer.from(encodeURIComponent(svg)).toString('base64');
  return `\n\n<svg-wrapper data-svg="${b64}"></svg-wrapper>\n\n`;
}

function tryParseSpecJson(rawJson: string): RealWorldFigureSpec | null {
  const cleaned = rawJson
    .trim()
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
  try {
    return JSON.parse(cleaned);
  } catch {
    // Retry escaping stray single backslashes inside string values
    try {
      const fixedBackslash = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      return JSON.parse(fixedBackslash);
    } catch {
      return null;
    }
  }
}

/**
 * Finds balanced `[REALWORLD_FIG:{...}]` markers (even with nested arrays/objects)
 * and replaces them with crisp, mathematically exact `<svg-wrapper data-svg="..."></svg-wrapper>` blocks.
 */
export function resolveRealWorldFiguresInText(input: string, isStreaming = false): string {
  if (!input) return input;
  let text = input;

  // 1. Unwrap fenced ```svg ... ``` or ```xml ... ``` containing <svg>...</svg>
  text = text.replace(/```(?:svg|xml|html)?\s*(<svg[\s\S]*?<\/svg>)\s*```/gi, (_m, svgBody) => {
    const tagged = /data-realworld-figure/i.test(svgBody)
      ? svgBody
      : svgBody.replace(/<svg\b/i, '<svg data-realworld-figure="true"');
    return encodeSvgToWrapper(tagged);
  });

  // 2. Parse balanced [REALWORLD_FIG:{...}] markers (optionally wrapped in backticks)
  const markerRegex = /`?\[REALWORLD_FIG\s*:\s*/gi;
  let out = '';
  let cursor = 0;

  while (cursor < text.length) {
    markerRegex.lastIndex = cursor;
    const match = markerRegex.exec(text);
    if (!match) {
      out += text.slice(cursor);
      break;
    }

    const startIdx = match.index;
    out += text.slice(cursor, startIdx);

    const jsonStart = match.index + match[0].length;
    if (text[jsonStart] !== '{') {
      out += text.slice(startIdx, jsonStart);
      cursor = jsonStart;
      continue;
    }

    // Walk forward tracking brace depth & string literals
    let depth = 0;
    let inStr = false;
    let escapeNext = false;
    let jsonEnd = -1;

    for (let i = jsonStart; i < text.length; i++) {
      const ch = text[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === '\\' && inStr) {
        escapeNext = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        continue;
      }
      if (!inStr) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            jsonEnd = i;
            break;
          }
        }
      }
    }

    if (jsonEnd === -1) {
      // Incomplete tag while streaming — show clean subtle status instead of raw JSON
      if (isStreaming) {
        out += '\n\n*(🎨 Đang dựng hình minh họa toán học chuẩn xác...)*\n\n';
        cursor = text.length;
        break;
      }
      // If finished streaming and truncated, drop cleanly
      cursor = text.length;
      break;
    }

    const rawJson = text.slice(jsonStart, jsonEnd + 1);
    let afterEnd = jsonEnd + 1;
    // Consume closing `]` and optional trailing backtick
    while (afterEnd < text.length && /\s/.test(text[afterEnd])) afterEnd++;
    if (text[afterEnd] === ']') afterEnd++;
    if (text[afterEnd] === '`') afterEnd++;

    const spec = tryParseSpecJson(rawJson);
    const svg = spec ? renderRealWorldMathFigureSvg(spec) : null;
    if (svg) {
      out += encodeSvgToWrapper(svg);
    }
    cursor = afterEnd;
  }

  return out;
}
