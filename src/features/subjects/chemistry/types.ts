/**
 * @file types.ts
 * @description Các kiểu dữ liệu chuyên biệt cho Chemistry Toolkit (Hóa học THPT GDPT 2018).
 */

export interface EnthalpyCalculationInput {
  calcMethod: 'formation' | 'bond_energy'; // Theo nhiệt tạo thành hay năng lượng liên kết
  // Phản ứng tổng quát: a A + b B -> c C + d D
  reactants: { name: string; coeff: number; value: number }[]; // Chất đầu
  products: { name: string; coeff: number; value: number }[];  // Sản phẩm
}

export interface EnthalpyCalculationOutput {
  deltaRH298: number;      // kJ
  isExothermic: boolean;   // Tỏa nhiệt (< 0) hay Thu nhiệt (> 0)
  explanation: string[];
}

export interface EquilibriumAndPhInput {
  reactionType: 'equilibrium_kc' | 'strong_acid' | 'strong_base';
  // Cho KC: a A + b B <=> c C + d D
  concs?: {
    reactants: { coeff: number; conc: number }[];
    products: { coeff: number; conc: number }[];
  };
  // Cho pH
  cM?: number;             // Nồng độ mol/L
}

export interface EquilibriumAndPhOutput {
  kc?: number;
  pH?: number;
  pOH?: number;
  explanation: string[];
}

export interface GalvanicCellInput {
  anodeName: string;       // Kim loại / Cặp oxi hóa khử cực âm (anot)
  anodePotential: number;  // Thế điện cực chuẩn E0(anot) (V)
  cathodeName: string;     // Cực dương (catot)
  cathodePotential: number;// E0(catot) (V)
}

export interface GalvanicCellOutput {
  eCellStandard: number;   // E0 pin = E0 catot - E0 anot
  isSpontaneous: boolean;  // Phản ứng tự phát nếu E0 pin > 0
  explanation: string[];
}

export interface OrganicStructureConfig {
  carbonCount: number;     // 1 đến 8
  chainType: 'alkane' | 'alkene' | 'alkyne' | 'benzene';
  functionalGroup: 'none' | 'OH' | 'CHO' | 'COOH' | 'COO' | 'NH2' | 'NO2';
  branchPosition?: number;
}
