/**
 * @file geneticsParser.ts
 * @description Các hàm helper xử lý kiểu gen, chuỗi KaTeX, OMML XML Word, tính toán ADN & Hardy-Weinberg, và SVG Phả hệ.
 */

import {
  DnaInputParams,
  DnaCalculationResult,
  HardyWeinbergInput,
  HardyWeinbergResult,
  PedigreeData,
  PedigreeIndividual
} from '../types/biology.types';

/**
 * Chuẩn hóa chuỗi kiểu gen (VD: "AB/ab", "Ab/aB", "AB/ab, f=20%") thành mã KaTeX LaTeX
 */
export function formatGenotypeToLatex(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const clean = input.trim();

  // Mẫu kiểu gen phân số kèm tần số hoán vị: "AB/ab, f=20%" hoặc "AB/ab, f=20"
  const crossoverMatch = clean.match(/^([A-Za-z]+)\/([A-Za-z]+)\s*,\s*f\s*=\s*(\d+(?:\.\d+)?)\s*%?$/i);
  if (crossoverMatch) {
    return `$\\frac{${crossoverMatch[1]}}{${crossoverMatch[2]}}\\text{ (với } f = ${crossoverMatch[3]}\\%\\text{)}$`;
  }

  // Mẫu kiểu gen phân số thuần túy: "AB/ab", "Ab/aB", "aB/ab"
  const fractionMatch = clean.match(/^([A-Za-z]+)\/([A-Za-z]+)$/);
  if (fractionMatch) {
    return `$\\frac{${fractionMatch[1]}}{${fractionMatch[2]}}$`;
  }

  // Kiểu gen trên NST giới tính: X^A X^a, X^a Y
  if (clean.includes('X^') || clean.includes('Y^')) {
    return `$${clean}$`;
  }

  if (!clean.startsWith('$') && !clean.endsWith('$')) {
    return `$${clean}$`;
  }

  return clean;
}

/**
 * Chuyển đổi chuỗi phân số kiểu gen sang thẻ XML Word OMML
 * Dùng khi copy hoặc export sang Microsoft Word (.docx)
 */
export function genotypeToOMML(input: string): string {
  if (!input) return '';
  const match = input.trim().match(/^([A-Za-z]+)\/([A-Za-z]+)/);
  if (match) {
    const num = match[1];
    const den = match[2];
    return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:f><m:fPr><m:type m:val="bar"/></m:fPr><m:num><m:r><m:t>${num}</m:t></m:r></m:num><m:den><m:r><m:t>${den}</m:t></m:r></m:den></m:f></m:oMath>`;
  }
  return formatGenotypeToLatex(input);
}

/**
 * TÍNH TOÁN TOÀN BỘ ĐẠI LƯỢNG ADN, ARN & PROTEIN
 * Từ 1 trong các thông số (N, L, M, C, A, G) -> Tính đầy đủ các đại lượng còn lại
 */
export function calculateDnaProperties(params: DnaInputParams): DnaCalculationResult {
  let N = 0;

  if (params.totalNucleotides && params.totalNucleotides > 0) {
    N = params.totalNucleotides;
  } else if (params.lengthAngstrom && params.lengthAngstrom > 0) {
    N = Math.round((params.lengthAngstrom / 3.4) * 2);
  } else if (params.lengthNanometer && params.lengthNanometer > 0) {
    N = Math.round(((params.lengthNanometer * 10) / 3.4) * 2);
  } else if (params.massDalton && params.massDalton > 0) {
    N = Math.round(params.massDalton / 300);
  } else if (params.turnsC && params.turnsC > 0) {
    N = params.turnsC * 20;
  } else if (params.countA !== undefined && params.countG !== undefined) {
    N = 2 * (params.countA + params.countG);
  } else {
    N = 3000; // Giá trị mặc định
  }

  if (N % 2 !== 0) N += 1; // Đảm bảo N là số chẵn

  const L_angstrom = (N / 2) * 3.4;
  const L_nanometer = L_angstrom / 10;
  const M_dalton = N * 300;
  const C_turns = N / 20;

  let countA = 0;
  let countT = 0;
  let countG = 0;
  let countC = 0;
  let percentA = 25;
  let percentG = 25;

  if (params.countA !== undefined && params.countA > 0) {
    countA = params.countA;
    countT = countA;
    countG = Math.max(0, (N / 2) - countA);
    countC = countG;
    percentA = Number(((countA / N) * 100).toFixed(2));
    percentG = Number(((countG / N) * 100).toFixed(2));
  } else if (params.countG !== undefined && params.countG > 0) {
    countG = params.countG;
    countC = countG;
    countA = Math.max(0, (N / 2) - countG);
    countT = countA;
    percentG = Number(((countG / N) * 100).toFixed(2));
    percentA = Number(((countA / N) * 100).toFixed(2));
  } else if (params.percentA !== undefined && params.percentA > 0) {
    percentA = params.percentA;
    percentG = 50 - percentA;
    countA = Math.round((N * percentA) / 100);
    countT = countA;
    countG = Math.round((N * percentG) / 100);
    countC = countG;
  } else if (params.percentG !== undefined && params.percentG > 0) {
    percentG = params.percentG;
    percentA = 50 - percentG;
    countG = Math.round((N * percentG) / 100);
    countC = countG;
    countA = Math.round((N * percentA) / 100);
    countT = countA;
  } else {
    percentA = 20;
    percentG = 30;
    countA = Math.round(N * 0.2);
    countT = countA;
    countG = Math.round(N * 0.3);
    countC = countG;
  }

  const percentT = percentA;
  const percentC = percentG;
  const H_bonds = 2 * countA + 3 * countG;

  const rN_arn = N / 2;
  const m_arn_dalton = rN_arn * 300;
  const aminoAcidsPolypeptide = Math.max(0, Math.floor(N / 6) - 1);
  const aminoAcidsProtein = Math.max(0, Math.floor(N / 6) - 2);

  const explanationLatex: string[] = [
    `Tổng số nucleotit của gen: $N = ${N.toLocaleString()}$ (nu)`,
    `Chiều dài phân tử ADN: $L = \\frac{N}{2} \\times 3.4 = \\frac{${N}}{2} \\times 3.4 = ${L_angstrom.toLocaleString()}\\,\\text{Å} = ${L_nanometer.toLocaleString()}\\,\\text{nm}$`,
    `Khối lượng phân tử của ADN: $M = N \\times 300 = ${N} \\times 300 = ${M_dalton.toLocaleString()}\\,\\text{ĐvC}$`,
    `Số chu kỳ xoắn của ADN: $C = \\frac{N}{20} = \\frac{${N}}{20} = ${C_turns.toLocaleString()}\\,\\text{chu kỳ}$`,
    `Số nucleotit từng loại: $A = T = ${countA.toLocaleString()}\\,\\text{nu}\\,(${percentA}\\%)$; $G = C = ${countG.toLocaleString()}\\,\\text{nu}\\,(${percentG}\\%)$`,
    `Số liên kết hidro: $H = 2A + 3G = 2(${countA}) + 3(${countG}) = ${H_bonds.toLocaleString()}\\,\\text{liên kết}$`,
    `Số nucleotit trên mạch mARN: $rN = \\frac{N}{2} = ${rN_arn.toLocaleString()}\\,\\text{nu}$`,
    `Số axít amin chuỗi polipeptit: $N_{\\text{aa}} = \\frac{N}{6} - 1 = \\frac{${N}}{6} - 1 = ${aminoAcidsPolypeptide}\\,\\text{axit amin}$`,
    `Số axít amin phân tử protein hoàn chỉnh: $N_{\\text{protein}} = \\frac{N}{6} - 2 = ${aminoAcidsProtein}\\,\\text{axit amin}$`
  ];

  return {
    N,
    L_angstrom,
    L_nanometer,
    M_dalton,
    C_turns,
    H_bonds,
    countA,
    countT,
    countG,
    countC,
    percentA,
    percentT,
    percentG,
    percentC,
    rN_arn,
    m_arn_dalton,
    aminoAcidsPolypeptide,
    aminoAcidsProtein,
    explanationLatex
  };
}

/**
 * KIỂM TRA TRẠNG THÁI CÂN BẰNG DI TRUYỀN HARDY - WEINBERG
 * Từ số lượng 3 kiểu gen AA, Aa, aa -> Tính p(A), q(a), kiểm tra p^2 * q^2 == (2pq/2)^2
 */
export function calculateHardyWeinberg(input: HardyWeinbergInput): HardyWeinbergResult {
  let countAA = input.countAA || 0;
  let countAa = input.countAa || 0;
  let countaa = input.countaa || 0;

  let total = countAA + countAa + countaa;

  if (total === 0 && (input.freqAA !== undefined || input.freqAa !== undefined || input.freqaa !== undefined)) {
    const d = input.freqAA || 0;
    const h = input.freqAa || 0;
    const r = input.freqaa || Math.max(0, 1 - d - h);
    total = 1000;
    countAA = Math.round(d * total);
    countAa = Math.round(h * total);
    countaa = Math.round(r * total);
  }

  if (total === 0) {
    countAA = 360;
    countAa = 480;
    countaa = 160;
    total = 1000;
  }

  const freqD = Number((countAA / total).toFixed(4));
  const freqH = Number((countAa / total).toFixed(4));
  const freqR = Number((countaa / total).toFixed(4));

  const p_alleleA = Number((freqD + freqH / 2).toFixed(4));
  const q_allelea = Number((1 - p_alleleA).toFixed(4));

  const expectedAA = Number((Math.pow(p_alleleA, 2)).toFixed(4));
  const expectedAa = Number((2 * p_alleleA * q_allelea).toFixed(4));
  const expectedaa = Number((Math.pow(q_allelea, 2)).toFixed(4));

  // ĐIỀU KIỆN CÂN BẰNG HARDY-WEINBERG:
  // p^2 * q^2 == (2pq / 2)^2 <=> D * R == (H / 2)^2
  const leftSide = Number((freqD * freqR).toFixed(6));
  const rightSide = Number((Math.pow(freqH / 2, 2)).toFixed(6));
  const isEquilibrium = Math.abs(leftSide - rightSide) < 0.002 || (Math.abs(freqD - expectedAA) < 0.015 && Math.abs(freqH - expectedAa) < 0.015);

  // Chi-Square Test
  const expAA = expectedAA * total;
  const expAa = expectedAa * total;
  const expaa = expectedaa * total;

  const chiSquare = Number((
    (expAA > 0 ? Math.pow(countAA - expAA, 2) / expAA : 0) +
    (expAa > 0 ? Math.pow(countAa - expAa, 2) / expAa : 0) +
    (expaa > 0 ? Math.pow(countaa - expaa, 2) / expaa : 0)
  ).toFixed(3));

  const structureLatex = `$${freqD}\\,AA : ${freqH}\\,Aa : ${freqR}\\,aa$`;

  const explanationLatex: string[] = [
    `Cấu trúc di truyền thực tế của quần thể: $${freqD}\\,AA : ${freqH}\\,Aa : ${freqR}\\,aa$`,
    `Tần số alen $A$: $p(A) = d + \\frac{h}{2} = ${freqD} + \\frac{${freqH}}{2} = ${p_alleleA}$`,
    `Tần số alen $a$: $q(a) = r + \\frac{h}{2} = 1 - p(A) = 1 - ${p_alleleA} = ${q_allelea}$`,
    `Cấu trúc lý thuyết theo định luật Hardy - Weinberg ($p^2 AA + 2pq Aa + q^2 aa = 1$):`,
    `$AA = p^2 = (${p_alleleA})^2 = ${expectedAA}$`,
    `$Aa = 2pq = 2 \\times ${p_alleleA} \\times ${q_allelea} = ${expectedAa}$`,
    `$aa = q^2 = (${q_allelea})^2 = ${expectedaa}$`,
    `Kiểm tra công thức đẳng thức $p^2 \\cdot q^2 = (2pq / 2)^2$: $${leftSide} \\approx ${rightSide}$`,
    `Giá trị Ki-bình phương (\\chi^2): \\chi^2 = ${chiSquare}`,
    isEquilibrium
      ? `\\textbf{Kết luận:} Quần thể \\textbf{đạt trạng thái cân bằng di truyền} Hardy - Weinberg vì $d \\cdot r \\approx (h/2)^2$ ($${structureLatex}$).`
      : `\\textbf{Kết luận:} Quần thể \\textbf{chưa đạt trạng thái cân bằng di truyền} Hardy - Weinberg.`
  ];

  return {
    total,
    freqD,
    freqH,
    freqR,
    p_alleleA,
    q_allelea,
    expectedAA,
    expectedAa,
    expectedaa,
    isEquilibrium,
    chiSquare,
    structureLatex,
    explanationLatex
  };
}

/**
 * TẠO MÃ SVG HÌNH VẼ PHẢ HỆ CHO PEDIGREE BUILDER
 */
export function generatePedigreeSvgString(data: PedigreeData): string {
  const individuals = data.individuals || [];
  if (individuals.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="20" y="30" fill="#64748b">Chưa có dữ liệu phả hệ</text></svg>`;
  }

  const genMap: Record<number, PedigreeIndividual[]> = {};
  individuals.forEach(ind => {
    if (!genMap[ind.generation]) genMap[ind.generation] = [];
    genMap[ind.generation].push(ind);
  });

  const genKeys = Object.keys(genMap).map(Number).sort((a, b) => a - b);
  const rowHeight = 110;
  const startY = 60;
  const nodeRadius = 18;

  const nodePositions: Record<string, { x: number; y: number }> = {};

  genKeys.forEach((gNum, gIndex) => {
    const genList = genMap[gNum];
    const y = startY + gIndex * rowHeight;
    const totalWidth = 640;
    const spacing = totalWidth / (genList.length + 1);

    genList.forEach((ind, i) => {
      const x = Math.round(spacing * (i + 1));
      nodePositions[ind.id] = { x, y };
    });
  });

  let svgElements = '';

  // Vẽ các đường liên kết
  individuals.forEach(ind => {
    const pos = nodePositions[ind.id];
    if (!pos) return;

    if (ind.spouseId && nodePositions[ind.spouseId]) {
      const spousePos = nodePositions[ind.spouseId];
      if (ind.id < ind.spouseId) {
        svgElements += `<line x1="${pos.x}" y1="${pos.y}" x2="${spousePos.x}" y2="${spousePos.y}" stroke="#1e293b" stroke-width="2.5" />`;
      }
    }

    if (ind.fatherId && ind.motherId && nodePositions[ind.fatherId] && nodePositions[ind.motherId]) {
      const fPos = nodePositions[ind.fatherId];
      const mPos = nodePositions[ind.motherId];
      const midX = (fPos.x + mPos.x) / 2;
      const midY = (fPos.y + mPos.y) / 2;

      svgElements += `<path d="M ${midX} ${midY} L ${midX} ${pos.y - nodeRadius - 8} L ${pos.x} ${pos.y - nodeRadius - 8} L ${pos.x} ${pos.y - nodeRadius}" fill="none" stroke="#475569" stroke-width="2" />`;
    }
  });

  // Vẽ hình nút cho từng cá thể
  individuals.forEach(ind => {
    const pos = nodePositions[ind.id];
    if (!pos) return;

    const fillStyle = ind.phenotype === 'affected' ? '#0f172a' : '#ffffff';
    const strokeStyle = '#0f172a';

    if (ind.gender === 'male') {
      svgElements += `<rect x="${pos.x - nodeRadius}" y="${pos.y - nodeRadius}" width="${nodeRadius * 2}" height="${nodeRadius * 2}" fill="${fillStyle}" stroke="${strokeStyle}" stroke-width="2.5" rx="3" />`;
      if (ind.phenotype === 'carrier') {
        svgElements += `<rect x="${pos.x - nodeRadius}" y="${pos.y - nodeRadius}" width="${nodeRadius}" height="${nodeRadius * 2}" fill="#0f172a" />`;
      }
    } else {
      svgElements += `<circle cx="${pos.x}" cy="${pos.y}" r="${nodeRadius}" fill="${fillStyle}" stroke="${strokeStyle}" stroke-width="2.5" />`;
      if (ind.phenotype === 'carrier') {
        svgElements += `<path d="M ${pos.x} ${pos.y - nodeRadius} A ${nodeRadius} ${nodeRadius} 0 0 0 ${pos.x} ${pos.y + nodeRadius} Z" fill="#0f172a" />`;
      }
    }

    svgElements += `<text x="${pos.x}" y="${pos.y + nodeRadius + 18}" text-anchor="middle" font-size="12" font-weight="bold" fill="#334155">${ind.id}</text>`;

    if (ind.genotype) {
      svgElements += `<text x="${pos.x}" y="${pos.y + nodeRadius + 32}" text-anchor="middle" font-size="11" font-style="italic" fill="#0d9488">${ind.genotype}</text>`;
    }
  });

  const romanNums = ['I', 'II', 'III', 'IV', 'V'];
  genKeys.forEach((gNum, idx) => {
    const y = startY + idx * rowHeight;
    const label = romanNums[idx] || `${gNum}`;
    svgElements += `<text x="25" y="${y + 5}" font-size="16" font-weight="extrabold" fill="#0284c7">${label}</text>`;
  });

  const svgWidth = 680;
  const svgHeight = startY + genKeys.length * rowHeight + 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%" style="background-color: #ffffff;">
    <style>text { font-family: system-ui, -apple-system, sans-serif; }</style>
    <text x="${svgWidth / 2}" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">${data.title || 'Sơ đồ Phả hệ Di truyền'}</text>
    ${svgElements}
  </svg>`;
}
