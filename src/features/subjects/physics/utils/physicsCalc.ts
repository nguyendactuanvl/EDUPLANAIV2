/**
 * @file physicsCalc.ts
 * @description Các hàm tính toán đại lượng Vật lý và thuật toán sinh đồ thị/sơ đồ SVG cho Physics Toolkit.
 */

import {
  DhoInput, DhoOutput,
  RlcInput, RlcOutput,
  IdealGasThermalInput, IdealGasThermalOutput,
  CircuitConfig, WaveGraphConfig
} from '../types';

/**
 * 1. Tính toán Dao động điều hòa (DHO)
 */
export function calculateDho(input: DhoInput): DhoOutput {
  const A = input.amplitudeA || 5;
  let omega = input.omega || 0;

  if (!omega && input.frequencyF) {
    omega = 2 * Math.PI * input.frequencyF;
  } else if (!omega && input.periodT && input.periodT > 0) {
    omega = (2 * Math.PI) / input.periodT;
  } else if (!omega) {
    omega = 2 * Math.PI; // Mặc định 2\pi rad/s
  }

  const f = omega / (2 * Math.PI);
  const T = 1 / f;
  const vMax = A * omega;
  const aMax = A * Math.pow(omega, 2);

  let xCurrent: number | undefined;
  let vCurrent: number | undefined;
  let aCurrent: number | undefined;

  const phi = input.phasePhi || 0;
  if (input.timeT !== undefined) {
    const phaseAtT = omega * input.timeT + phi;
    xCurrent = Number((A * Math.cos(phaseAtT)).toFixed(2));
    vCurrent = Number((-A * omega * Math.sin(phaseAtT)).toFixed(2));
    aCurrent = Number((-A * Math.pow(omega, 2) * Math.cos(phaseAtT)).toFixed(2));
  }

  const explanation = [
    `Tần số góc: \\omega = 2\\pi f = \\frac{2\\pi}{T} = ${omega.toFixed(2)}\\text{ rad/s}`,
    `Chu kỳ dao động: T = \\frac{2\\pi}{\\omega} = ${T.toFixed(2)}\\text{ s}`,
    `Tần số: f = \\frac{1}{T} = ${f.toFixed(2)}\\text{ Hz}`,
    `Vận tốc cực đại: v_{\\max} = A \\cdot \\omega = ${A} \\cdot ${omega.toFixed(2)} = ${vMax.toFixed(2)}\\text{ cm/s}`,
    `Gia tốc cực đại: a_{\\max} = A \\cdot \\omega^2 = ${A} \\cdot (${omega.toFixed(2)})^2 = ${aMax.toFixed(2)}\\text{ cm/s}^2`
  ];

  if (xCurrent !== undefined && vCurrent !== undefined && aCurrent !== undefined) {
    explanation.push(`Tại thời điểm t = ${input.timeT} s: x = ${xCurrent} cm, v = ${vCurrent} cm/s, a = ${aCurrent} cm/s^2`);
  }

  return {
    amplitudeA: A,
    periodT: Number(T.toFixed(2)),
    frequencyF: Number(f.toFixed(2)),
    omega: Number(omega.toFixed(2)),
    vMax: Number(vMax.toFixed(2)),
    aMax: Number(aMax.toFixed(2)),
    xCurrent,
    vCurrent,
    aCurrent,
    explanation
  };
}

/**
 * 2. Tính toán Mạch xoay chiều RLC nối tiếp
 */
export function calculateRlc(input: RlcInput): RlcOutput {
  const { resistanceR: R, inductanceL: L, capacitanceC: C, frequencyF: f, voltageU: U } = input;
  const omega = 2 * Math.PI * f;

  const ZL = omega * L;
  const ZC = C > 0 ? 1 / (omega * C) : 0;
  const Z = Math.sqrt(Math.pow(R, 2) + Math.pow(ZL - ZC, 2));

  const I = Z > 0 ? U / Z : 0;
  const cosPhi = Z > 0 ? R / Z : 1;
  const phasePhiRad = Math.atan2(ZL - ZC, R);
  const powerP = U * I * cosPhi;
  const f0Resonance = (L > 0 && C > 0) ? 1 / (2 * Math.PI * Math.sqrt(L * C)) : 0;

  const explanation = [
    `Tần số góc: \\omega = 2\\pi f = 2\\pi \\cdot ${f} = ${omega.toFixed(1)}\\text{ rad/s}`,
    `Cảm kháng: Z_L = \\omega L = ${ZL.toFixed(2)}\\text{ }\\Omega`,
    `Dung kháng: Z_C = \\frac{1}{\\omega C} = ${ZC.toFixed(2)}\\text{ }\\Omega`,
    `Tổng trở đoạn mạch: Z = \\sqrt{R^2 + (Z_L - Z_C)^2} = ${Z.toFixed(2)}\\text{ }\\Omega`,
    `Cường độ dòng điện hiệu dụng: I = \\frac{U}{Z} = \\frac{${U}}{${Z.toFixed(2)}} = ${I.toFixed(2)}\\text{ A}`,
    `Hệ số công suất: \\cos\\varphi = \\frac{R}{Z} = ${cosPhi.toFixed(3)} (Độ lệch pha: \\varphi = ${(phasePhiRad * 180 / Math.PI).toFixed(1)}^\\circ)`,
    `Công suất tiêu thụ: P = U \\cdot I \\cdot \\cos\\varphi = ${powerP.toFixed(2)}\\text{ W}`,
    `Tần số cộng hưởng điện: f_0 = \\frac{1}{2\\pi\\sqrt{LC}} = ${f0Resonance.toFixed(2)}\\text{ Hz}`
  ];

  return {
    omega: Number(omega.toFixed(1)),
    ZL: Number(ZL.toFixed(2)),
    ZC: Number(ZC.toFixed(2)),
    Z: Number(Z.toFixed(2)),
    I: Number(I.toFixed(2)),
    cosPhi: Number(cosPhi.toFixed(3)),
    phasePhiRad: Number(phasePhiRad.toFixed(3)),
    powerP: Number(powerP.toFixed(2)),
    f0Resonance: Number(f0Resonance.toFixed(2)),
    explanation
  };
}

/**
 * 3. Tính toán Nhiệt học & Khí lý tưởng Lớp 12
 */
export function calculateIdealGasThermal(input: IdealGasThermalInput): IdealGasThermalOutput {
  const R_GAS = 8.314; // J/(mol.K)
  let p = input.pressureP ?? 101325; // Pa
  let V = input.volumeV ?? 0.0224; // m^3
  let T = input.temperatureK ?? 273; // K
  let n = input.molesN ?? 1; // mol

  // Tính đại lượng còn thiếu theo pV = nRT
  if (p && V && T && !input.molesN) {
    n = (p * V) / (R_GAS * T);
  } else if (p && V && n && !input.temperatureK) {
    T = (p * V) / (n * R_GAS);
  } else if (p && T && n && !input.volumeV) {
    V = (n * R_GAS * T) / p;
  } else if (V && T && n && !input.pressureP) {
    p = (n * R_GAS * T) / V;
  }

  // Định luật I Nhiệt động lực học: ΔU = A + Q
  const A = input.workDoneA ?? 0;
  const Q = input.heatAddedQ ?? 0;
  const deltaU = A + Q;

  const explanation = [
    `Phương trình Clapeyron - Mendeleev: pV = nRT`,
    `Áp suất: p = ${p.toFixed(0)}\\text{ Pa } (${(p / 101325).toFixed(2)}\\text{ atm})`,
    `Thể tích: V = ${V.toFixed(4)}\\text{ m}^3 (${(V * 1000).toFixed(1)}\\text{ lít})`,
    `Nhiệt độ tuyệt đối: T = ${T.toFixed(1)}\\text{ K } (${(T - 273).toFixed(1)}^\\circ\\text{C})`,
    `Số mol chất khí: n = \\frac{pV}{RT} = ${n.toFixed(2)}\\text{ mol}`,
    `Định luật I Nhiệt động lực học: \\Delta U = A + Q = ${A} + ${Q} = ${deltaU}\\text{ J}`
  ];

  return {
    pressureP: Number(p.toFixed(0)),
    volumeV: Number(V.toFixed(4)),
    temperatureK: Number(T.toFixed(1)),
    molesN: Number(n.toFixed(2)),
    deltaU,
    explanation
  };
}

/**
 * 4. Sinh chuỗi SVG Sơ đồ Mạch điện RLC + Ampe kế + Vôn kế + Khóa K
 */
export function generateCircuitSvg(config: CircuitConfig): string {
  const width = 600;
  const height = 300;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #ffffff; border-radius: 8px;">`;

  // Millimeter Grid
  svg += `<defs>
    <pattern id="phy_grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="0.8"/>
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e2e8f0" stroke-width="1.2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#phy_grid)" />`;

  const left = 80;
  const right = 520;
  const top = 80;
  const bottom = 220;

  // Dây nguồn dưới
  svg += `<line x1="${left}" y1="${bottom}" x2="260" y2="${bottom}" stroke="#1e293b" stroke-width="2"/>`;
  svg += `<line x1="340" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#1e293b" stroke-width="2"/>`;

  // Nguồn điện xoay chiều hoặc 1 chiều
  svg += `<circle cx="300" cy="${bottom}" r="16" fill="#ffffff" stroke="#d97706" stroke-width="2"/>`;
  svg += `<path d="M 292 ${bottom} Q 296 ${bottom - 8} 300 ${bottom} T 308 ${bottom}" fill="none" stroke="#d97706" stroke-width="2"/>`;
  svg += `<text x="300" y="${bottom + 32}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">~ ${config.sourceVoltage}V</text>`;

  // Khóa K bên trái
  svg += `<line x1="${left}" y1="${bottom}" x2="${left}" y2="${top + 80}" stroke="#1e293b" stroke-width="2"/>`;
  svg += `<line x1="${left}" y1="${top + 40}" x2="${left}" y2="${top}" stroke="#1e293b" stroke-width="2"/>`;
  svg += `<circle cx="${left}" cy="${top + 80}" r="3" fill="#1e293b"/>`;
  svg += `<circle cx="${left}" cy="${top + 40}" r="3" fill="#1e293b"/>`;
  if (config.isSwitchClosed) {
    svg += `<line x1="${left}" y1="${top + 80}" x2="${left}" y2="${top + 40}" stroke="#059669" stroke-width="2.5"/>`;
  } else {
    svg += `<line x1="${left}" y1="${top + 80}" x2="${left - 18}" y2="${top + 45}" stroke="#dc2626" stroke-width="2.5"/>`;
  }
  svg += `<text x="${left - 24}" y="${top + 65}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">K</text>`;

  // Nhánh trên: chứa các phần tử R, L, C
  let currentX = left;
  svg += `<line x1="${left}" y1="${top}" x2="160" y2="${top}" stroke="#1e293b" stroke-width="2"/>`;
  currentX = 160;

  // Điện trở R
  if (config.hasR) {
    svg += `<rect x="${currentX}" y="${top - 12}" width="60" height="24" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>`;
    svg += `<text x="${currentX + 30}" y="${top - 18}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2563eb" text-anchor="middle">R</text>`;
    currentX += 60;
  }

  svg += `<line x1="${currentX}" y1="${top}" x2="${currentX + 30}" y2="${top}" stroke="#1e293b" stroke-width="2"/>`;
  currentX += 30;

  // Cuộn cảm L
  if (config.hasL) {
    svg += `<path d="M ${currentX} ${top} A 10 10 0 0 1 ${currentX + 20} ${top} A 10 10 0 0 1 ${currentX + 40} ${top} A 10 10 0 0 1 ${currentX + 60} ${top}" fill="none" stroke="#7c3aed" stroke-width="2"/>`;
    svg += `<text x="${currentX + 30}" y="${top - 14}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#7c3aed" text-anchor="middle">L</text>`;
    currentX += 60;
  }

  svg += `<line x1="${currentX}" y1="${top}" x2="${currentX + 30}" y2="${top}" stroke="#1e293b" stroke-width="2"/>`;
  currentX += 30;

  // Tụ điện C
  if (config.hasC) {
    svg += `<line x1="${currentX + 15}" y1="${top - 18}" x2="${currentX + 15}" y2="${top + 18}" stroke="#059669" stroke-width="3"/>`;
    svg += `<line x1="${currentX + 25}" y1="${top - 18}" x2="${currentX + 25}" y2="${top + 18}" stroke="#059669" stroke-width="3"/>`;
    svg += `<line x1="${currentX}" y1="${top}" x2="${currentX + 15}" y2="${top}" stroke="#1e293b" stroke-width="2"/>`;
    svg += `<line x1="${currentX + 25}" y1="${top}" x2="${currentX + 40}" y2="${top}" stroke="#1e293b" stroke-width="2"/>`;
    svg += `<text x="${currentX + 20}" y="${top - 22}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#059669" text-anchor="middle">C</text>`;
    currentX += 40;
  }

  svg += `<line x1="${currentX}" y1="${top}" x2="${right}" y2="${top}" stroke="#1e293b" stroke-width="2"/>`;

  // Ampe kế bên phải
  svg += `<line x1="${right}" y1="${top}" x2="${right}" y2="130" stroke="#1e293b" stroke-width="2"/>`;
  if (config.hasAmmeter) {
    svg += `<circle cx="${right}" cy="150" r="16" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>`;
    svg += `<text x="${right}" y="154" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0284c7" text-anchor="middle">A</text>`;
    svg += `<line x1="${right}" y1="166" x2="${right}" y2="${bottom}" stroke="#1e293b" stroke-width="2"/>`;
  } else {
    svg += `<line x1="${right}" y1="130" x2="${right}" y2="${bottom}" stroke="#1e293b" stroke-width="2"/>`;
  }

  // Vôn kế đo hai đầu mạch (nếu có)
  if (config.hasVoltmeter) {
    const vY = top - 45;
    svg += `<path d="M 160 ${top} L 160 ${vY} L 280 ${vY}" fill="none" stroke="#e11d48" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    svg += `<circle cx="300" cy="${vY}" r="15" fill="#ffffff" stroke="#e11d48" stroke-width="2"/>`;
    svg += `<text x="300" y="${vY + 4}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#e11d48" text-anchor="middle">V</text>`;
    svg += `<path d="M 320 ${vY} L 440 ${vY} L 440 ${top}" fill="none" stroke="#e11d48" stroke-width="1.5" stroke-dasharray="3,3"/>`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * 5. Sinh chuỗi SVG Đồ thị Dao động điều hòa hoặc Sóng cơ
 */
export function generateWaveGraphSvg(config: WaveGraphConfig): string {
  const width = 640;
  const height = 320;
  const originX = 60;
  const originY = 160;
  const graphWidth = 540;
  const scaleY = 18; // px / cm

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #ffffff; border-radius: 8px;">`;

  // Millimeter Grid
  svg += `<defs>
    <pattern id="wave_grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="0.8"/>
      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e2e8f0" stroke-width="1.2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wave_grid)" />`;

  // Trục Ox & Oy
  svg += `<line x1="${originX - 20}" y1="${originY}" x2="${originX + graphWidth}" y2="${originY}" stroke="#334155" stroke-width="1.8"/>`;
  svg += `<line x1="${originX}" y1="${height - 20}" x2="${originX}" y2="20" stroke="#334155" stroke-width="1.8"/>`;

  // Mũi tên trục
  svg += `<polygon points="${originX + graphWidth},${originY} ${originX + graphWidth - 8},${originY - 4} ${originX + graphWidth - 8},${originY + 4}" fill="#334155"/>`;
  svg += `<polygon points="${originX},20 ${originX - 4},28 ${originX + 4},28" fill="#334155"/>`;

  const xLabel = config.graphType === 'wave_sine' ? 'x (cm)' : 't (s)';
  const yLabel = config.graphType === 'dho_v' ? 'v (cm/s)' : 'x (cm)';

  svg += `<text x="${originX + graphWidth - 10}" y="${originY + 22}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155">${xLabel}</text>`;
  svg += `<text x="${originX + 15}" y="28" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155">${yLabel}</text>`;
  svg += `<text x="${originX - 14}" y="${originY + 16}" font-family="sans-serif" font-size="11" fill="#64748b">O</text>`;

  // Đánh dấu biên độ +A và -A
  const yPosPlusA = originY - config.amplitudeA * scaleY;
  const yPosMinusA = originY + config.amplitudeA * scaleY;

  svg += `<line x1="${originX - 4}" y1="${yPosPlusA}" x2="${originX + 4}" y2="${yPosPlusA}" stroke="#334155" stroke-width="1.5"/>`;
  svg += `<text x="${originX - 28}" y="${yPosPlusA + 4}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2563eb">+${config.amplitudeA}</text>`;

  svg += `<line x1="${originX - 4}" y1="${yPosMinusA}" x2="${originX + 4}" y2="${yPosMinusA}" stroke="#334155" stroke-width="1.5"/>`;
  svg += `<text x="${originX - 28}" y="${yPosMinusA + 4}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2563eb">-${config.amplitudeA}</text>`;

  // Vẽ đường cong Sine
  let pathD = '';
  const pointsCount = 200;
  const totalPeriods = 2.5; // Vẽ 2.5 chu kỳ
  const periodPx = 200;     // Độ rộng 1 chu kỳ trên đồ thị

  for (let i = 0; i <= pointsCount; i++) {
    const px = originX + (i / pointsCount) * (totalPeriods * periodPx);
    const theta = (i / pointsCount) * totalPeriods * 2 * Math.PI + config.phasePhi;
    const py = originY - config.amplitudeA * scaleY * Math.cos(theta);

    if (i === 0) {
      pathD += `M ${px.toFixed(1)} ${py.toFixed(1)}`;
    } else {
      pathD += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
  }

  svg += `<path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"/>`;

  // Đánh dấu mốc T và 2T
  const t1X = originX + periodPx;
  const t2X = originX + 2 * periodPx;
  svg += `<line x1="${t1X}" y1="${originY - 4}" x2="${t1X}" y2="${originY + 4}" stroke="#334155" stroke-width="1.5"/>`;
  svg += `<text x="${t1X}" y="${originY + 18}" font-family="sans-serif" font-size="11" fill="#475569" text-anchor="middle">T (${config.periodT}s)</text>`;

  svg += `<line x1="${t2X}" y1="${originY - 4}" x2="${t2X}" y2="${originY + 4}" stroke="#334155" stroke-width="1.5"/>`;
  svg += `<text x="${t2X}" y="${originY + 18}" font-family="sans-serif" font-size="11" fill="#475569" text-anchor="middle">2T (${(config.periodT * 2).toFixed(1)}s)</text>`;

  svg += `</svg>`;
  return svg;
}
