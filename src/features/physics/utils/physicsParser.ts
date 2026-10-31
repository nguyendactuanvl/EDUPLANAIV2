/**
 * @file physicsParser.ts
 * @description Utility functions & SVG Rendering Engine cho Module Physics Toolkit.
 * Hỗ trợ tính toán Vật lý chuẩn xác, sinh mã KaTeX, OMML Word và SVG đồ họa thời gian thực.
 */

import {
  DhoCalcInput, DhoCalcResult,
  AcCircuitCalcInput, AcCircuitCalcResult,
  LensCalcInput, LensCalcResult,
  IdealGasInput, IdealGasResult,
  CircuitDiagramConfig, OpticsDiagramConfig, OscillationGraphConfig
} from '../types/physics.types';

// ----------------------------------------------------
// 1. Chuyển đổi Ký hiệu / Vectơ Vật lý sang LaTeX & OMML
// ----------------------------------------------------

/**
 * Chuẩn hóa biểu thức ký hiệu vectơ hoặc phân số sang KaTeX
 */
export function formatPhysicsVectorToLatex(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // Kiểm tra nếu đã có $...$
  if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
    return trimmed;
  }

  // Chuyển đổi biểu thức dạng vec(F) hoặc F_vec thành \vec{F}
  let formatted = trimmed
    .replace(/vec\((.*?)\)/g, '\\vec{$1}')
    .replace(/(\w+)_vec/g, '\\vec{$1}');

  // Chuyển đổi phân số a/b thành \frac{a}{b} nếu có chứa dấu /
  if (formatted.includes('/') && !formatted.includes('\\frac')) {
    const parts = formatted.split('/');
    if (parts.length === 2) {
      formatted = `\\frac{${parts[0].trim()}}{${parts[1].trim()}}`;
    }
  }

  return `$${formatted}$`;
}

/**
 * Chuyển đổi phân số / ký hiệu vật lý sang thẻ OMML XML của Microsoft Word
 */
export function physicsToOMML(input: string): string {
  const parts = input.split('/');
  const num = parts[0]?.trim() || 'F';
  const den = parts[1]?.trim() || 'm';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:oMath>
    <m:f>
      <m:num><m:r><m:t>${num}</m:t></m:r></m:num>
      <m:den><m:r><m:t>${den}</m:t></m:r></m:den>
    </m:f>
  </m:oMath>
</m:oMathPara>`;
}

// ----------------------------------------------------
// 2. Máy tính Vật lý THPT (Calculators)
// ----------------------------------------------------

/**
 * Tính toán Dao động điều hòa
 */
export function calculateDho(input: DhoCalcInput): DhoCalcResult {
  let A = input.amplitudeA ?? 10; // cm
  let omega = input.omega ?? 0;

  if (!omega && input.frequencyF) {
    omega = 2 * Math.PI * input.frequencyF;
  } else if (!omega && input.periodT && input.periodT > 0) {
    omega = (2 * Math.PI) / input.periodT;
  } else if (!omega) {
    omega = 2 * Math.PI; // Mặc định \omega = 2\pi rad/s
  }

  const f = omega / (2 * Math.PI);
  const T = 1 / f;
  const vMax = A * omega;
  const aMax = A * Math.pow(omega, 2);

  const explanationLatex = [
    `$\\omega = 2\\pi f = \\frac{2\\pi}{T} = ${omega.toFixed(2)}\\text{ rad/s}$`,
    `$T = \\frac{2\\pi}{\\omega} = ${T.toFixed(2)}\\text{ s}$`,
    `$f = \\frac{1}{T} = ${f.toFixed(2)}\\text{ Hz}$`,
    `$v_{\\max} = A \\cdot \\omega = ${A} \\cdot ${omega.toFixed(2)} = ${vMax.toFixed(2)}\\text{ cm/s}$`,
    `$a_{\\max} = A \\cdot \\omega^2 = ${A} \\cdot (${omega.toFixed(2)})^2 = ${aMax.toFixed(2)}\\text{ cm/s}^2$`
  ];

  return {
    amplitudeA: A,
    omega: Number(omega.toFixed(2)),
    frequencyF: Number(f.toFixed(2)),
    periodT: Number(T.toFixed(2)),
    vMax: Number(vMax.toFixed(2)),
    aMax: Number(aMax.toFixed(2)),
    explanationLatex
  };
}

/**
 * Tính toán Điện xoay chiều RLC Nối tiếp
 */
export function calculateAcCircuit(input: AcCircuitCalcInput): AcCircuitCalcResult {
  const { resistanceR: R, inductanceL: L, capacitanceC: C, frequencyF: f, voltageU: U } = input;
  const omega = 2 * Math.PI * f;

  const ZL = omega * L;
  const ZC = C > 0 ? 1 / (omega * C) : 0;
  const Z = Math.sqrt(Math.pow(R, 2) + Math.pow(ZL - ZC, 2));

  const I = Z > 0 ? U / Z : 0;
  const cosPhi = Z > 0 ? R / Z : 1;
  const phasePhiRad = Math.atan2(ZL - ZC, R);
  const powerP = U * I * cosPhi;
  const resonanceFreqF = (L > 0 && C > 0) ? 1 / (2 * Math.PI * Math.sqrt(L * C)) : 0;

  const explanationLatex = [
    `$Z_L = \\omega L = 2\\pi \\cdot ${f} \\cdot ${L} = ${ZL.toFixed(2)}\\text{ }\\Omega$`,
    `$Z_C = \\frac{1}{\\omega C} = \\frac{1}{2\\pi \\cdot ${f} \\cdot ${C}} = ${ZC.toFixed(2)}\\text{ }\\Omega$`,
    `$Z = \\sqrt{R^2 + (Z_L - Z_C)^2} = \\sqrt{${R}^2 + (${ZL.toFixed(2)} - ${ZC.toFixed(2)})^2} = ${Z.toFixed(2)}\\text{ }\\Omega$`,
    `$I = \\frac{U}{Z} = \\frac{${U}}{${Z.toFixed(2)}} = ${I.toFixed(2)}\\text{ A}$`,
    `$\\cos\\varphi = \\frac{R}{Z} = \\frac{${R}}{${Z.toFixed(2)}} = ${cosPhi.toFixed(3)}$`,
    `$P = U \\cdot I \\cdot \\cos\\varphi = ${U} \\cdot ${I.toFixed(2)} \\cdot ${cosPhi.toFixed(3)} = ${powerP.toFixed(2)}\\text{ W}$`,
    `f_0 = \\frac{1}{2\\pi\\sqrt{LC}} = ${resonanceFreqF.toFixed(2)}\\text{ Hz (Tần số cộng hưởng)}$`
  ];

  return {
    R,
    ZL: Number(ZL.toFixed(2)),
    ZC: Number(ZC.toFixed(2)),
    Z: Number(Z.toFixed(2)),
    I: Number(I.toFixed(2)),
    cosPhi: Number(cosPhi.toFixed(3)),
    phasePhiRad: Number(phasePhiRad.toFixed(3)),
    powerP: Number(powerP.toFixed(2)),
    resonanceFreqF: Number(resonanceFreqF.toFixed(2)),
    explanationLatex
  };
}

/**
 * Tính toán Thấu kính mỏng & Quang hình
 */
export function calculateLens(input: LensCalcInput): LensCalcResult {
  const { focalLength: f, objectDistance: d, objectHeight: h } = input;

  // Công thức thấu kính: 1/f = 1/d + 1/d' => d' = (d * f) / (d - f)
  let dDash = 0;
  if (d !== f) {
    dDash = (d * f) / (d - f);
  }

  const k = -dDash / d;
  const hDash = Math.abs(k) * h;
  const D = f !== 0 ? 100 / f : 0; // f tính bằng cm => D = 100/f (độ điốp dp)

  const isRealImage = dDash > 0;
  const isErect = k > 0;

  const explanationLatex = [
    `$D = \\frac{1}{f} = \\frac{100}{${f}} = ${D.toFixed(2)}\\text{ dp (Độ tụ)}$`,
    `\\text{Công thức thấu kính: } \\frac{1}{f} = \\frac{1}{d} + \\frac{1}{d'}` ,
    `d' = \\frac{d \\cdot f}{d - f} = \\frac{${d} \\cdot ${f}}{${d} - ${f}} = ${dDash.toFixed(2)}\\text{ cm}$`,
    `\\text{Hệ số phóng đại: } k = -\\frac{d'}{d} = -\\frac{${dDash.toFixed(2)}}{${d}} = ${k.toFixed(2)}`,
    `h' = |k| \\cdot h = |${k.toFixed(2)}| \\cdot ${h} = ${hDash.toFixed(2)}\\text{ cm}$`,
    `\\text{Tính chất ảnh: } ${isRealImage ? 'Ảnh thật' : 'Ảnh ảo'}, ${isErect ? 'Cùng chiều với vật' : 'Ngược chiều với vật'}`
  ];

  return {
    focalLength: f,
    objectDistance: d,
    imageDistance: Number(dDash.toFixed(2)),
    magnificationK: Number(k.toFixed(2)),
    imageHeight: Number(hDash.toFixed(2)),
    opticalPowerD: Number(D.toFixed(2)),
    isRealImage,
    isErect,
    explanationLatex
  };
}

/**
 * Phương trình Trạng thái Khí Lý Tưởng (Clapeyron - Mendeleev)
 */
export function calculateIdealGas(input: IdealGasInput): IdealGasResult {
  const R_GAS = 8.31; // J/(mol.K)
  let p = input.pressureP ?? 101325; // Pa
  let V = input.volumeV ?? 0.0224; // m^3
  let T = input.temperatureK ?? 273; // K
  let n = input.molesN ?? 1; // mol

  if (p && V && T && !input.molesN) {
    n = (p * V) / (R_GAS * T);
  } else if (p && V && n && !input.temperatureK) {
    T = (p * V) / (n * R_GAS);
  } else if (p && T && n && !input.volumeV) {
    V = (n * R_GAS * T) / p;
  } else if (V && T && n && !input.pressureP) {
    p = (n * R_GAS * T) / V;
  }

  const tempC = T - 273;

  const explanationLatex = [
    `\\text{Phương trình Clapeyron - Mendeleev: } pV = nRT`,
    `p = ${p.toFixed(0)}\\text{ Pa (hoặc } ${(p / 101325).toFixed(2)}\\text{ atm)}$`,
    `V = ${V.toFixed(4)}\\text{ m}^3\\text{ (tương đương } ${(V * 1000).toFixed(1)}\\text{ lít)}$`,
    `T = ${T.toFixed(1)}\\text{ K (bằng } ${tempC.toFixed(1)}^\\circ\\text{C)}$`,
    `n = \\frac{pV}{RT} = \\frac{${p.toFixed(0)} \\cdot ${V.toFixed(4)}}{8.31 \\cdot ${T.toFixed(1)}} = ${n.toFixed(2)}\\text{ mol}$`
  ];

  return {
    pressureP: Number(p.toFixed(0)),
    volumeV: Number(V.toFixed(4)),
    temperatureK: Number(T.toFixed(1)),
    temperatureC: Number(tempC.toFixed(1)),
    molesN: Number(n.toFixed(2)),
    explanationLatex
  };
}

// ----------------------------------------------------
// 3. Đồ họa SVG Trực Quan (SVG Generator Engine)
// ----------------------------------------------------

/**
 * Sinh chuỗi mã SVG cho Sơ đồ Mạch điện
 */
export function generateCircuitSvgString(config: CircuitDiagramConfig): string {
  const width = 640;
  const height = 360;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #ffffff; border-radius: 12px;">`;

  // Millimeter Grid Pattern
  svg += `<defs>
    <pattern id="grid_mm" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.8"/>
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#cbd5e1" stroke-width="1.2"/>
    </pattern>
  </defs>`;

  svg += `<rect width="100%" height="100%" fill="url(#grid_mm)" />`;

  // Circuit Title
  svg += `<text x="20" y="30" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">${config.title}</text>`;
  svg += `<text x="20" y="50" font-family="sans-serif" font-size="11" fill="#64748b">Mạch điện ${config.connectionType === 'series' ? 'Nối tiếp' : 'Song song'} | ${config.isSwitchClosed ? 'Khóa K: Đóng (Có dòng điện)' : 'Khóa K: Mở'}</text>`;

  // Main Wires Box (Rectangular loop)
  const leftX = 80;
  const rightX = 560;
  const topY = 100;
  const bottomY = 280;

  // Bottom Wire: Source DC or AC
  svg += `<line x1="${leftX}" y1="${bottomY}" x2="${leftX + 200}" y2="${bottomY}" stroke="#1e293b" stroke-width="2.5" />`;
  svg += `<line x1="${rightX - 200}" y1="${bottomY}" x2="${rightX}" y2="${bottomY}" stroke="#1e293b" stroke-width="2.5" />`;

  // Source Symbol (Nguồn điện)
  const sourceCenterX = 320;
  svg += `<g transform="translate(${sourceCenterX}, ${bottomY})">`;
  // DC Battery symbol: Long thin line (+), short thick line (-)
  svg += `<line x1="-30" y1="0" x2="-10" y2="0" stroke="#1e293b" stroke-width="2.5" />`;
  svg += `<line x1="-10" y1="-20" x2="-10" y2="20" stroke="#059669" stroke-width="3" />`; // Positive (+)
  svg += `<line x1="10" y1="-12" x2="10" y2="12" stroke="#dc2626" stroke-width="5" />`; // Negative (-)
  svg += `<line x1="10" y1="0" x2="30" y2="0" stroke="#1e293b" stroke-width="2.5" />`;
  svg += `<text x="-12" y="-25" font-family="sans-serif" font-size="11" font-weight="bold" fill="#059669">+</text>`;
  svg += `<text x="8" y="-18" font-family="sans-serif" font-size="11" font-weight="bold" fill="#dc2626">-</text>`;
  svg += `<text x="0" y="35" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">Nguồn ${config.sourceVoltage || 12}V</text>`;
  svg += `</g>`;

  // Switch K on Left wire
  svg += `<line x1="${leftX}" y1="${bottomY}" x2="${leftX}" y2="${bottomY - 70}" stroke="#1e293b" stroke-width="2.5" />`;
  svg += `<line x1="${leftX}" y1="${topY + 70}" x2="${leftX}" y2="${topY}" stroke="#1e293b" stroke-width="2.5" />`;

  // Switch Symbol
  svg += `<circle cx="${leftX}" cy="${bottomY - 70}" r="4" fill="#1e293b" />`;
  svg += `<circle cx="${leftX}" cy="${topY + 70}" r="4" fill="#1e293b" />`;
  if (config.isSwitchClosed) {
    svg += `<line x1="${leftX}" y1="${bottomY - 70}" x2="${leftX}" y2="${topY + 70}" stroke="#059669" stroke-width="3" />`;
  } else {
    svg += `<line x1="${leftX}" y1="${bottomY - 70}" x2="${leftX - 25}" y2="${topY + 80}" stroke="#dc2626" stroke-width="3" />`;
  }
  svg += `<text x="${leftX - 30}" y="${(topY + bottomY) / 2}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">K</text>`;

  // Right Wire with Ammeter
  svg += `<line x1="${rightX}" y1="${bottomY}" x2="${rightX}" y2="${bottomY - 60}" stroke="#1e293b" stroke-width="2.5" />`;
  svg += `<line x1="${rightX}" y1="${topY + 60}" x2="${rightX}" y2="${topY}" stroke="#1e293b" stroke-width="2.5" />`;
  // Ammeter Circle
  svg += `<circle cx="${rightX}" cy="${(topY + bottomY) / 2}" r="18" fill="#ffffff" stroke="#2563eb" stroke-width="2.5" />`;
  svg += `<text x="${rightX}" y="${(topY + bottomY) / 2 + 5}" font-family="sans-serif" font-size="13" font-weight="bold" fill="#2563eb" text-anchor="middle">A</text>`;

  // Top Wire Components
  if (config.connectionType === 'series') {
    // Draw components sequentially along top wire
    const count = config.components.length || 1;
    const step = (rightX - leftX) / (count + 1);

    svg += `<line x1="${leftX}" y1="${topY}" x2="${rightX}" y2="${topY}" stroke="#1e293b" stroke-width="2.5" />`;

    config.components.forEach((comp, idx) => {
      const compX = leftX + step * (idx + 1);

      if (comp.type === 'resistor') {
        // Resistor Box
        svg += `<rect x="${compX - 30}" y="${topY - 12}" width="60" height="24" fill="#ffffff" stroke="#059669" stroke-width="2.5" rx="3" />`;
        svg += `<text x="${compX}" y="${topY - 18}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#059669" text-anchor="middle">${comp.label} (${comp.value || 100}Ω)</text>`;
      } else if (comp.type === 'capacitor') {
        // Capacitor Parallel Plates
        svg += `<line x1="${compX - 10}" y1="${topY - 18}" x2="${compX - 10}" y2="${topY + 18}" stroke="#2563eb" stroke-width="3" />`;
        svg += `<line x1="${compX + 10}" y1="${topY - 18}" x2="${compX + 10}" y2="${topY + 18}" stroke="#2563eb" stroke-width="3" />`;
        svg += `<text x="${compX}" y="${topY - 24}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2563eb" text-anchor="middle">${comp.label} (${comp.value || 100}μF)</text>`;
      } else if (comp.type === 'inductor') {
        // Inductor Coils
        svg += `<path d="M ${compX - 30} ${topY} Q ${compX - 20} ${topY - 20} ${compX - 10} ${topY} Q ${compX} ${topY - 20} ${compX + 10} ${topY} Q ${compX + 20} ${topY - 20} ${compX + 30} ${topY}" fill="none" stroke="#d97706" stroke-width="2.5" />`;
        svg += `<text x="${compX}" y="${topY - 24}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#d97706" text-anchor="middle">${comp.label} (${comp.value || 0.1}H)</text>`;
      } else if (comp.type === 'lamp') {
        // Lamp Circle with X
        svg += `<circle cx="${compX}" cy="${topY}" r="16" fill="#ffffff" stroke="#ea580c" stroke-width="2.5" />`;
        svg += `<line x1="${compX - 10}" y1="${topY - 10}" x2="${compX + 10}" y2="${topY + 10}" stroke="#ea580c" stroke-width="2" />`;
        svg += `<line x1="${compX + 10}" y1="${topY - 10}" x2="${compX - 10}" y2="${topY + 10}" stroke="#ea580c" stroke-width="2" />`;
        svg += `<text x="${compX}" y="${topY - 22}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ea580c" text-anchor="middle">${comp.label}</text>`;
      }
    });
  } else {
    // Parallel Branches
    svg += `<line x1="${leftX}" y1="${topY}" x2="${leftX + 80}" y2="${topY}" stroke="#1e293b" stroke-width="2.5" />`;
    svg += `<line x1="${rightX - 80}" y1="${topY}" x2="${rightX}" y2="${topY}" stroke="#1e293b" stroke-width="2.5" />`;

    // 2 Parallel Branches
    const branch1Y = topY - 35;
    const branch2Y = topY + 35;

    svg += `<line x1="${leftX + 80}" y1="${branch1Y}" x2="${leftX + 80}" y2="${branch2Y}" stroke="#1e293b" stroke-width="2.5" />`;
    svg += `<line x1="${rightX - 80}" y1="${branch1Y}" x2="${rightX - 80}" y2="${branch2Y}" stroke="#1e293b" stroke-width="2.5" />`;

    // Branch 1: Resistor R
    svg += `<line x1="${leftX + 80}" y1="${branch1Y}" x2="${rightX - 80}" y2="${branch1Y}" stroke="#1e293b" stroke-width="2" />`;
    svg += `<rect x="290" y="${branch1Y - 12}" width="60" height="24" fill="#ffffff" stroke="#059669" stroke-width="2.5" rx="3" />`;
    svg += `<text x="320" y="${branch1Y - 16}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#059669" text-anchor="middle">R1 (100Ω)</text>`;

    // Branch 2: Capacitor C
    svg += `<line x1="${leftX + 80}" y1="${branch2Y}" x2="${rightX - 80}" y2="${branch2Y}" stroke="#1e293b" stroke-width="2" />`;
    svg += `<line x1="310" y1="${branch2Y - 18}" x2="310" y2="${branch2Y + 18}" stroke="#2563eb" stroke-width="3" />`;
    svg += `<line x1="330" y1="${branch2Y - 18}" x2="330" y2="${branch2Y + 18}" stroke="#2563eb" stroke-width="3" />`;
    svg += `<text x="320" y="${branch2Y + 32}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2563eb" text-anchor="middle">C (100μF)</text>`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Sinh chuỗi mã SVG cho Quang học & Thấu kính
 */
export function generateOpticsSvgString(config: OpticsDiagramConfig): string {
  const width = 640;
  const height = 360;
  const centerX = width / 2; // Quang tâm O
  const centerY = height / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #ffffff; border-radius: 12px;">`;

  // Grid background
  svg += `<defs>
    <pattern id="grid_optics" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="0.8"/>
    </pattern>
  </defs>`;
  svg += `<rect width="100%" height="100%" fill="url(#grid_optics)" />`;

  // Title
  svg += `<text x="20" y="30" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">${config.title}</text>`;

  // Optical Axis (Trục chính \Delta)
  svg += `<line x1="30" y1="${centerY}" x2="${width - 30}" y2="${centerY}" stroke="#475569" stroke-width="1.5" stroke-dasharray="6 4" />`;
  svg += `<text x="${width - 25}" y="${centerY - 8}" font-family="sans-serif" font-size="12" font-style="italic" fill="#475569">Δ</text>`;

  // Scale factor (1 cm in physics = 6 px in SVG)
  const scalePx = 6;
  const fPx = Math.abs(config.focalLength) * scalePx;
  const dPx = config.objectDistance * scalePx;
  const hPx = config.objectHeight * scalePx * 1.5;

  // Lens Optical Center O
  svg += `<circle cx="${centerX}" cy="${centerY}" r="3" fill="#0f172a" />`;
  svg += `<text x="${centerX + 6}" y="${centerY + 16}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">O</text>`;

  // Lens Symbol (Thấu kính hội tụ hoặc phân kỳ)
  const lensHeight = 220;
  if (config.deviceType === 'convex_lens') {
    // Thấu kính hội tụ (mũi tên hướng ra 2 đầu)
    svg += `<line x1="${centerX}" y1="${centerY - lensHeight / 2}" x2="${centerX}" y2="${centerY + lensHeight / 2}" stroke="#0284c7" stroke-width="3" />`;
    // Mũi tên trên
    svg += `<path d="M ${centerX - 8} ${centerY - lensHeight / 2 + 10} L ${centerX} ${centerY - lensHeight / 2} L ${centerX + 8} ${centerY - lensHeight / 2 + 10}" stroke="#0284c7" stroke-width="3" fill="none" />`;
    // Mũi tên dưới
    svg += `<path d="M ${centerX - 8} ${centerY + lensHeight / 2 - 10} L ${centerX} ${centerY + lensHeight / 2} L ${centerX + 8} ${centerY + lensHeight / 2 - 10}" stroke="#0284c7" stroke-width="3" fill="none" />`;
  } else if (config.deviceType === 'concave_lens') {
    // Thấu kính phân kỳ (mũi tên loe hướng vào)
    svg += `<line x1="${centerX}" y1="${centerY - lensHeight / 2}" x2="${centerX}" y2="${centerY + lensHeight / 2}" stroke="#0284c7" stroke-width="3" />`;
    svg += `<path d="M ${centerX - 8} ${centerY - lensHeight / 2} L ${centerX} ${centerY - lensHeight / 2 + 10} L ${centerX + 8} ${centerY - lensHeight / 2}" stroke="#0284c7" stroke-width="3" fill="none" />`;
    svg += `<path d="M ${centerX - 8} ${centerY + lensHeight / 2} L ${centerX} ${centerY + lensHeight / 2 - 10} L ${centerX + 8} ${centerY + lensHeight / 2}" stroke="#0284c7" stroke-width="3" fill="none" />`;
  }

  // Focal Points F and F'
  const fLeftX = centerX - fPx;
  const fRightX = centerX + fPx;

  svg += `<circle cx="${fLeftX}" cy="${centerY}" r="3" fill="#dc2626" />`;
  svg += `<text x="${fLeftX - 6}" y="${centerY + 16}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#dc2626">F</text>`;

  svg += `<circle cx="${fRightX}" cy="${centerY}" r="3" fill="#dc2626" />`;
  svg += `<text x="${fRightX - 6}" y="${centerY + 16}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#dc2626">F'</text>`;

  // Object Arrow AB (Vật sáng AB vuông góc trục chính)
  const objectX = centerX - dPx;
  const objectTopY = centerY - hPx;

  // Arrow shaft
  svg += `<line x1="${objectX}" y1="${centerY}" x2="${objectX}" y2="${objectTopY}" stroke="#059669" stroke-width="3" />`;
  // Arrow head (point B)
  svg += `<path d="M ${objectX - 5} ${objectTopY + 8} L ${objectX} ${objectTopY} L ${objectX + 5} ${objectTopY + 8}" fill="#059669" />`;
  svg += `<text x="${objectX - 12}" y="${centerY + 16}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#059669">A</text>`;
  svg += `<text x="${objectX - 12}" y="${objectTopY - 6}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#059669">B</text>`;

  // Image calculation & drawing (A'B')
  const fVal = config.focalLength;
  const dVal = config.objectDistance;
  if (dVal !== fVal) {
    const dDashVal = (dVal * fVal) / (dVal - fVal);
    const kVal = -dDashVal / dVal;

    const imageX = centerX + dDashVal * scalePx;
    const imageTopY = centerY - (hPx * kVal);

    // Image Arrow A'B'
    const isReal = dDashVal > 0;
    const strokeDash = isReal ? '' : 'stroke-dasharray="5 3"';

    svg += `<line x1="${imageX}" y1="${centerY}" x2="${imageX}" y2="${imageTopY}" stroke="#d97706" stroke-width="2.5" ${strokeDash} />`;
    svg += `<text x="${imageX - 12}" y="${centerY + 16}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#d97706">A'</text>`;
    svg += `<text x="${imageX - 12}" y="${imageTopY < centerY ? imageTopY - 6 : imageTopY + 16}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#d97706">B'</text>`;

    // Special Light Rays from B
    if (config.showSpecialRays) {
      // Ray 1: Parallel to axis -> passes through F'
      svg += `<line x1="${objectX}" y1="${objectTopY}" x2="${centerX}" y2="${objectTopY}" stroke="#2563eb" stroke-width="1.8" />`;
      svg += `<line x1="${centerX}" y1="${objectTopY}" x2="${imageX}" y2="${imageTopY}" stroke="#2563eb" stroke-width="1.8" />`;

      // Ray 2: Passes straight through center O
      svg += `<line x1="${objectX}" y1="${objectTopY}" x2="${imageX}" y2="${imageTopY}" stroke="#9333ea" stroke-width="1.8" stroke-dasharray="3 3" />`;
    }
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Sinh chuỗi mã SVG cho Đồ thị Hình sin Dao động & Sóng cơ
 */
export function generateOscillationSvgString(config: OscillationGraphConfig): string {
  const width = 640;
  const height = 320;
  const originX = 70;
  const originY = height / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #ffffff; border-radius: 12px;">`;

  // Millimeter Grid Pattern
  svg += `<defs>
    <pattern id="grid_sine" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
    </pattern>
  </defs>`;
  svg += `<rect width="100%" height="100%" fill="url(#grid_sine)" />`;

  // Graph Title
  svg += `<text x="20" y="25" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a">${config.title}</text>`;

  // Axes: Horizontal (t or x) & Vertical (x, v, a)
  const axisRightX = width - 40;
  const axisTopY = 40;
  const axisBottomY = height - 40;

  // X Axis (Time t or Space x)
  svg += `<line x1="${originX - 10}" y1="${originY}" x2="${axisRightX}" y2="${originY}" stroke="#334155" stroke-width="2" />`;
  svg += `<path d="M ${axisRightX - 8} ${originY - 4} L ${axisRightX} ${originY} L ${axisRightX - 8} ${originY + 4}" fill="#334155" />`;
  const xLabel = config.graphType === 'spatial_wave' ? 'x (cm)' : 't (s)';
  svg += `<text x="${axisRightX - 10}" y="${originY + 20}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155">${xLabel}</text>`;

  // Y Axis (Displacement x, Velocity v, or Accel a)
  svg += `<line x1="${originX}" y1="${axisBottomY}" x2="${originX}" y2="${axisTopY}" stroke="#334155" stroke-width="2" />`;
  svg += `<path d="M ${originX - 4} ${axisTopY + 8} L ${originX} ${axisTopY} L ${originX + 4} ${axisTopY + 8}" fill="#334155" />`;

  let yLabel = 'x (cm)';
  if (config.graphType === 'vt_velocity') yLabel = 'v (cm/s)';
  if (config.graphType === 'at_acceleration') yLabel = 'a (cm/s²)';
  svg += `<text x="${originX - 35}" y="${axisTopY - 10}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155">${yLabel}</text>`;

  // Amplitude Labels: +A and -A
  const amplitudePx = 90;
  const plusAY = originY - amplitudePx;
  const minusAY = originY + amplitudePx;

  svg += `<line x1="${originX - 5}" y1="${plusAY}" x2="${originX + 5}" y2="${plusAY}" stroke="#0f172a" stroke-width="2" />`;
  svg += `<text x="${originX - 35}" y="${plusAY + 4}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#059669">+${config.amplitude}</text>`;

  svg += `<line x1="${originX - 5}" y1="${minusAY}" x2="${originX + 5}" y2="${minusAY}" stroke="#0f172a" stroke-width="2" />`;
  svg += `<text x="${originX - 35}" y="${minusAY + 4}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#dc2626">-${config.amplitude}</text>`;

  // Origin O
  svg += `<text x="${originX - 15}" y="${originY + 15}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#475569">0</text>`;

  // Plot Sine Curve
  const cycles = config.timeCycles || 2;
  const plotWidth = axisRightX - originX - 30;
  const points: string[] = [];

  const totalPoints = 300;
  for (let i = 0; i <= totalPoints; i++) {
    const progress = i / totalPoints;
    const px = originX + progress * plotWidth;

    // Equation: y = A * cos(\omega * t + \varphi)
    const angle = progress * (cycles * 2 * Math.PI) + config.initialPhaseRad;
    let val = Math.cos(angle);

    if (config.graphType === 'vt_velocity') {
      val = -Math.sin(angle); // v = -A\omega \sin(...)
    } else if (config.graphType === 'at_acceleration') {
      val = -Math.cos(angle); // a = -A\omega^2 \cos(...)
    }

    const py = originY - val * amplitudePx;
    points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }

  svg += `<polyline points="${points.join(' ')}" fill="none" stroke="#2563eb" stroke-width="3" />`;

  svg += `</svg>`;
  return svg;
}
