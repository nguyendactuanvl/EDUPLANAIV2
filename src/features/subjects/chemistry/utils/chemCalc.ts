/**
 * @file chemCalc.ts
 * @description Các thuật toán tính toán Hóa học GDPT 2018, định dạng công thức/danh pháp IUPAC
 * và engine sinh mã SVG cấu trúc hóa hữu cơ.
 */

import {
  EnthalpyCalculationInput, EnthalpyCalculationOutput,
  EquilibriumAndPhInput, EquilibriumAndPhOutput,
  GalvanicCellInput, GalvanicCellOutput,
  OrganicStructureConfig
} from '../types';

// ----------------------------------------------------
// 1. TỪ ĐIỂN DANH PHÁP IUPAC MỚI GDPT 2018
// ----------------------------------------------------
export interface IupacNameMapping {
  traditional: string;
  iupac: string;
  formula: string;
  note: string;
}

export const IUPAC_DICTIONARY: IupacNameMapping[] = [
  { traditional: 'Axit axetic', iupac: 'Acetic acid (Ethanoic acid)', formula: 'CH₃COOH', note: 'Axit hữu cơ quen thuộc' },
  { traditional: 'Axit fomic', iupac: 'Formic acid (Methanoic acid)', formula: 'HCOOH', note: 'Có trong nọc kiến' },
  { traditional: 'Ancol etylic (Rượu)', iupac: 'Ethanol', formula: 'C₂H₅OH', note: 'Cồn y tế, đồ uống' },
  { traditional: 'Ancol metylic', iupac: 'Methanol', formula: 'CH₃OH', note: 'Cồn công nghiệp độc' },
  { traditional: 'Axetilen', iupac: 'Ethyne', formula: 'C₂H₂', note: 'Khí hàn xì đất đèn' },
  { traditional: 'Etilen', iupac: 'Ethene', formula: 'C₂H₄', note: 'Khí giấm chín hoa quả' },
  { traditional: 'Đồng sunfat', iupac: 'Copper(II) sulfate', formula: 'CuSO₄', note: 'Muối tinh thể xanh' },
  { traditional: 'Sắt(III) clorua', iupac: 'Iron(III) chloride', formula: 'FeCl₃', note: 'Chất oxi hóa mạnh' },
  { traditional: 'Natri hiđroxit (Xút)', iupac: 'Sodium hydroxide', formula: 'NaOH', note: 'Kiềm mạnh' },
  { traditional: 'Axit sunfuric', iupac: 'Sulfuric acid', formula: 'H₂SO₄', note: 'Axit quan trọng nhất' },
  { traditional: 'Benzen', iupac: 'Benzene', formula: 'C₆H₆', note: 'Hydrocarbon thơm' },
  { traditional: 'Anilin', iupac: 'Aniline (Benzenamine)', formula: 'C₆H₅NH₂', note: 'Amin thơm bậc 1' },
  { traditional: 'Phenol', iupac: 'Phenol', formula: 'C₆H₅OH', note: 'Hợp chất chứa nhóm -OH thơm' }
];

/**
 * Tự động format chuỗi công thức phân tử sang chỉ số dưới và trên Unicode
 * VD: H2SO4 -> H₂SO₄, Fe3+ -> Fe³⁺, SO4 2- -> SO₄²⁻
 */
export function formatChemicalFormula(input: string): string {
  if (!input) return '';

  const subscriptMap: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
  };

  const superscriptMap: Record<string, string> = {
    '+': '⁺', '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³',
    '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };

  let formatted = input;

  // 1. Chuyển điện tích: 3+, 2+, +, 2-, 3-
  formatted = formatted.replace(/([0-9]*)([+\-])/g, (_, num, sign) => {
    let res = '';
    for (const ch of num) res += superscriptMap[ch] || ch;
    res += superscriptMap[sign] || sign;
    return res;
  });

  // 2. Chuyển số nguyên tử phía sau nguyên tố (H2 -> H₂, O4 -> O₄)
  formatted = formatted.replace(/([A-Za-z)\]])([0-9]+)/g, (_, letter, digits) => {
    let sub = '';
    for (const d of digits) sub += subscriptMap[d] || d;
    return letter + sub;
  });

  return formatted;
}

// ----------------------------------------------------
// 2. MÁY TÍNH ENTHALPY CHUẨN Δ_r H°_298
// ----------------------------------------------------
export function calculateEnthalpy(input: EnthalpyCalculationInput): EnthalpyCalculationOutput {
  let deltaRH298 = 0;
  const explanation: string[] = [];

  if (input.calcMethod === 'formation') {
    // Δr H0 298 = sum(nu * Δf H0 sp) - sum(nu * Δf H0 cd)
    const sumProducts = input.products.reduce((acc, p) => acc + p.coeff * p.value, 0);
    const sumReactants = input.reactants.reduce((acc, r) => acc + r.coeff * r.value, 0);
    deltaRH298 = Number((sumProducts - sumReactants).toFixed(2));

    explanation.push('Áp dụng công thức biến thiên enthalpy theo nhiệt tạo thành:');
    explanation.push('\\Delta_r H^\\circ_{298} = \\sum \\nu \\cdot \\Delta_f H^\\circ_{298}(\\text{sản phẩm}) - \\sum \\nu \\cdot \\Delta_f H^\\circ_{298}(\\text{chất đầu})');
    explanation.push(`= (${sumProducts.toFixed(2)}) - (${sumReactants.toFixed(2)}) = ${deltaRH298} kJ`);
  } else {
    // Theo năng lượng liên kết Eb:
    // Δr H0 298 = sum(nu * Eb cd) - sum(nu * Eb sp)
    const sumReactants = input.reactants.reduce((acc, r) => acc + r.coeff * r.value, 0);
    const sumProducts = input.products.reduce((acc, p) => acc + p.coeff * p.value, 0);
    deltaRH298 = Number((sumReactants - sumProducts).toFixed(2));

    explanation.push('Áp dụng công thức biến thiên enthalpy theo năng lượng liên kết:');
    explanation.push('\\Delta_r H^\\circ_{298} = \\sum \\nu \\cdot E_b(\\text{chất đầu}) - \\sum \\nu \\cdot E_b(\\text{sản phẩm})');
    explanation.push(`= (${sumReactants.toFixed(2)}) - (${sumProducts.toFixed(2)}) = ${deltaRH298} kJ`);
  }

  const isExothermic = deltaRH298 < 0;
  explanation.push(isExothermic
    ? 'Kết luận: \\Delta_r H^\\circ_{298} < 0 \\Rightarrow Phản ứng tỏa nhiệt ra môi trường.'
    : 'Kết luận: \\Delta_r H^\\circ_{298} > 0 \\Rightarrow Phản ứng thu nhiệt từ môi trường.'
  );

  return { deltaRH298, isExothermic, explanation };
}

// ----------------------------------------------------
// 3. MÁY TÍNH HẰNG SỐ CÂN BẰNG KC VÀ pH DUNG DỊCH
// ----------------------------------------------------
export function calculateEquilibriumAndPh(input: EquilibriumAndPhInput): EquilibriumAndPhOutput {
  const explanation: string[] = [];

  if (input.reactionType === 'equilibrium_kc' && input.concs) {
    let num = 1;
    let den = 1;

    input.concs.products.forEach(p => {
      num *= Math.pow(p.conc, p.coeff);
    });

    input.concs.reactants.forEach(r => {
      den *= Math.pow(r.conc, r.coeff);
    });

    const kc = den > 0 ? Number((num / den).toExponential(3)) : 0;
    explanation.push('Biểu thức hằng số cân bằng: K_C = \\frac{\\prod [\\text{sản phẩm}]^{\\nu}}{\\prod [\\text{chất đầu}]^{\\nu}}');
    explanation.push(`Giá trị tính được: K_C = ${kc}`);

    return { kc, explanation };
  }

  if (input.reactionType === 'strong_acid' && input.cM) {
    const pH = Number((-Math.log10(input.cM)).toFixed(2));
    const pOH = Number((14 - pH).toFixed(2));
    explanation.push(`Axit mạnh điện li hoàn toàn: [H^+] = C_M = ${input.cM} M`);
    explanation.push(`\\text{pH} = -\\log[H^+] = -\\log(${input.cM}) = ${pH}`);
    explanation.push(`\\text{pOH} = 14 - \\text{pH} = ${pOH}`);
    return { pH, pOH, explanation };
  }

  if (input.reactionType === 'strong_base' && input.cM) {
    const pOH = Number((-Math.log10(input.cM)).toFixed(2));
    const pH = Number((14 - pOH).toFixed(2));
    explanation.push(`Bazơ mạnh điện li hoàn toàn: [OH^-] = C_M = ${input.cM} M`);
    explanation.push(`\\text{pOH} = -\\log[OH^-] = -\\log(${input.cM}) = ${pOH}`);
    explanation.push(`\\text{pH} = 14 - \\text{pOH} = ${pH}`);
    return { pH, pOH, explanation };
  }

  return { explanation: ['Vui lòng nhập nồng độ hợp lệ'] };
}

// ----------------------------------------------------
// 4. MÁY TÍNH ĐIỆN HÓA HỌC: SỨC ĐIỆN ĐỘNG CHUẨN PIN
// ----------------------------------------------------
export function calculateGalvanicCell(input: GalvanicCellInput): GalvanicCellOutput {
  // E0 pin = E0 catot - E0 anot
  const eCellStandard = Number((input.cathodePotential - input.anodePotential).toFixed(3));
  const isSpontaneous = eCellStandard > 0;

  const explanation = [
    'Sức điện động chuẩn của pin điện hóa (Galvanic cell):',
    'E^\\circ_{\\text{pin}} = E^\\circ_{\\text{catot}} - E^\\circ_{\\text{anot}}',
    `= (${input.cathodePotential} V) - (${input.anodePotential} V) = ${eCellStandard} V`,
    isSpontaneous
      ? 'Vì E^\\circ_{\\text{pin}} > 0 nên phản ứng oxi hóa - khử tự phát sinh ra dòng điện.'
      : 'E^\\circ_{\\text{pin}} \\le 0 nên phản ứng không tự diễn biến theo chiều thuận ở điều kiện chuẩn.'
  ];

  return { eCellStandard, isSpontaneous, explanation };
}

// ----------------------------------------------------
// 5. MINI SVG ENGINE CHO CẤU TRÚC HỮU CƠ
// ----------------------------------------------------
export function generateOrganicStructureSvg(config: OrganicStructureConfig): string {
  const width = 500;
  const height = 220;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #ffffff; border-radius: 8px;">`;

  if (config.chainType === 'benzene') {
    // Vẽ vòng Benzen Lục giác kèm vòng tròn hoặc 3 nối đôi
    const centerX = 250;
    const centerY = 110;
    const radius = 55;

    let points = '';
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 30) * (Math.PI / 180);
      const px = centerX + radius * Math.cos(angle);
      const py = centerY + radius * Math.sin(angle);
      points += `${px.toFixed(1)},${py.toFixed(1)} `;
    }

    svg += `<polygon points="${points}" fill="#f0fdf4" stroke="#059669" stroke-width="3"/>`;
    svg += `<circle cx="${centerX}" cy="${centerY}" r="32" fill="none" stroke="#059669" stroke-width="2.5" stroke-dasharray="6,4"/>`;

    // Nhóm thế trên vòng
    if (config.functionalGroup !== 'none') {
      const topAngle = -90 * (Math.PI / 180);
      const topX = centerX + radius * Math.cos(topAngle);
      const topY = centerY + radius * Math.sin(topAngle);
      svg += `<line x1="${topX}" y1="${topY}" x2="${topX}" y2="${topY - 30}" stroke="#059669" stroke-width="2.5"/>`;
      svg += `<text x="${topX}" y="${topY - 38}" font-family="sans-serif" font-size="14" font-weight="bold" fill="#047857" text-anchor="middle">-${config.functionalGroup}</text>`;
    }
  } else {
    // Mạch Carbon ziczac
    const count = Math.min(8, Math.max(1, config.carbonCount));
    const startX = 60;
    const stepX = 50;
    const baseLineY = 110;
    const zigOffset = 25;

    let prevX = startX;
    let prevY = baseLineY;

    for (let i = 0; i < count; i++) {
      const curX = startX + i * stepX;
      const curY = baseLineY + (i % 2 === 0 ? -zigOffset : zigOffset);

      if (i > 0) {
        // Nối đôi hay ba ở liên kết đầu tiên nếu là alkene/alkyne
        if (i === 1 && config.chainType === 'alkene') {
          svg += `<line x1="${prevX}" y1="${prevY - 3}" x2="${curX}" y2="${curY - 3}" stroke="#059669" stroke-width="2.5"/>`;
          svg += `<line x1="${prevX}" y1="${prevY + 3}" x2="${curX}" y2="${curY + 3}" stroke="#059669" stroke-width="2.5"/>`;
        } else if (i === 1 && config.chainType === 'alkyne') {
          svg += `<line x1="${prevX}" y1="${prevY - 5}" x2="${curX}" y2="${curY - 5}" stroke="#059669" stroke-width="2"/>`;
          svg += `<line x1="${prevX}" y1="${prevY}" x2="${curX}" y2="${curY}" stroke="#059669" stroke-width="2"/>`;
          svg += `<line x1="${prevX}" y1="${prevY + 5}" x2="${curX}" y2="${curY + 5}" stroke="#059669" stroke-width="2"/>`;
        } else {
          svg += `<line x1="${prevX}" y1="${prevY}" x2="${curX}" y2="${curY}" stroke="#059669" stroke-width="2.5"/>`;
        }
      }

      // Điểm nút Carbon
      svg += `<circle cx="${curX}" cy="${curY}" r="4" fill="#047857"/>`;
      svg += `<text x="${curX}" y="${curY + (i % 2 === 0 ? -12 : 20)}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle">C${i + 1}</text>`;

      prevX = curX;
      prevY = curY;
    }

    // Nhóm chức gắn ở C cuối cùng
    if (config.functionalGroup !== 'none') {
      const endX = prevX;
      const endY = prevY;
      svg += `<line x1="${endX}" y1="${endY}" x2="${endX + 35}" y2="${endY}" stroke="#059669" stroke-width="2.5"/>`;
      svg += `<text x="${endX + 42}" y="${endY + 5}" font-family="sans-serif" font-size="13" font-weight="bold" fill="#047857">-${config.functionalGroup}</text>`;
    }
  }

  svg += `</svg>`;
  return svg;
}
