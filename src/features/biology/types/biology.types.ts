/**
 * @file biology.types.ts
 * @description Định nghĩa toàn bộ interfaces, types cho Module Sinh học THPT (GDPT 2018).
 * Hoàn toàn độc lập, không phụ thuộc vào các module khác.
 */

// ==========================================
// 1. DẠNG CÂU HỎI ĐỀ THI SINH HỌC GDPT 2018
// ==========================================

export type BiologyQuestionType = 'mc' | 'tf' | 'sa';

// Phần I: Trắc nghiệm 4 lựa chọn (A, B, C, D)
export interface BiologyMcQuestion {
  id: string;
  type: 'mc';
  topic: string; // Chủ đề (Di truyền, Tiến hóa, Sinh thái, Tế bào)
  content: string; // Nội dung câu hỏi (chứa LaTeX)
  options: [string, string, string, string]; // 4 phương án A, B, C, D
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string; // Lời giải chi tiết
}

// Phần II: Trắc nghiệm Đúng/Sai với 4 ý a, b, c, d
export interface BiologyTfStatement {
  id: 'a' | 'b' | 'c' | 'd';
  statement: string; // Nội dung lệnh hỏi a, b, c, d
  isCorrect: boolean; // Đúng (true) hay Sai (false)
  explanation?: string;
}

export interface BiologyTfQuestion {
  id: string;
  type: 'tf';
  topic: string;
  stemContent: string; // Dữ liệu/đoạn văn gốc
  statements: [BiologyTfStatement, BiologyTfStatement, BiologyTfStatement, BiologyTfStatement];
  explanation: string;
}

// Phần III: Trắc nghiệm trả lời ngắn (Điền con số)
export interface BiologySaQuestion {
  id: string;
  type: 'sa';
  topic: string;
  content: string; // Nội dung câu hỏi tính toán
  correctAnswer: string; // Con số đáp án (VD: "3900", "0.25")
  unit?: string; // Đơn vị (VD: "liên kết", "%")
  explanation: string;
}

export type BiologyQuestion = BiologyMcQuestion | BiologyTfQuestion | BiologySaQuestion;

export interface BiologyExamPaper {
  id: string;
  title: string;
  grade: '10' | '11' | '12';
  durationMinutes: number;
  schoolYear: string;
  part1_mc: BiologyMcQuestion[];
  part2_tf: BiologyTfQuestion[];
  part3_sa: BiologySaQuestion[];
  createdAt: string;
}

// ==========================================
// 2. PHẢ HỆ (PEDIGREE NODE & DATA)
// ==========================================

export type PedigreeGender = 'male' | 'female';
export type PedigreePhenotype = 'normal' | 'affected' | 'carrier';

export interface PedigreeIndividual {
  id: string; // ID duy nhất (VD: "I-1", "II-2")
  generation: number; // Thế hệ (1, 2, 3...)
  order: number; // Thứ tự trong thế hệ (1, 2, 3...)
  gender: PedigreeGender; // male = Hình vuông, female = Hình tròn
  phenotype: PedigreePhenotype; // normal = Trắng, affected = Đen, carrier = Nửa đen
  name?: string;
  fatherId?: string;
  motherId?: string;
  spouseId?: string;
  genotype?: string; // Kiểu gen (VD: "X^A X^a")
}

export interface PedigreeData {
  title: string;
  diseaseName: string;
  inheritanceType: 'autosomal_dominant' | 'autosomal_recessive' | 'x_linked_dominant' | 'x_linked_recessive';
  individuals: PedigreeIndividual[];
}

// ==========================================
// 3. TÍNH TOÁN CỐT LÕI (ADN & HARDY - WEINBERG)
// ==========================================

export interface DnaInputParams {
  lengthAngstrom?: number; // Chiều dài L (Å)
  lengthNanometer?: number; // Chiều dài L (nm)
  massDalton?: number; // Khối lượng M (ĐvC)
  totalNucleotides?: number; // Tổng số Nu (N)
  turnsC?: number; // Số chu kỳ xoắn C
  countA?: number; // Số Nu loại A
  countT?: number; // Số Nu loại T
  countG?: number; // Số Nu loại G
  countC?: number; // Số Nu loại C
  percentA?: number;
  percentG?: number;
}

export interface DnaCalculationResult {
  N: number; // Tổng số Nu
  L_angstrom: number; // Chiều dài L (Å)
  L_nanometer: number; // Chiều dài L (nm)
  M_dalton: number; // Khối lượng M (ĐvC)
  C_turns: number; // Số chu kỳ xoắn C
  H_bonds: number; // Số liên kết hidro H = 2A + 3G
  countA: number;
  countT: number;
  countG: number;
  countC: number;
  percentA: number;
  percentT: number;
  percentG: number;
  percentC: number;
  rN_arn: number; // Số Nu trên mARN = N/2
  m_arn_dalton: number;
  aminoAcidsPolypeptide: number; // N/6 - 1
  aminoAcidsProtein: number; // N/6 - 2
  explanationLatex: string[];
}

export interface HardyWeinbergInput {
  countAA?: number; // Số cá thể AA
  countAa?: number; // Số cá thể Aa
  countaa?: number; // Số cá thể aa
  totalPopulation?: number;
  freqAA?: number;
  freqAa?: number;
  freqaa?: number;
}

export interface HardyWeinbergResult {
  total: number;
  freqD: number; // D = AA / N
  freqH: number; // H = Aa / N
  freqR: number; // R = aa / N
  p_alleleA: number; // p = D + H/2
  q_allelea: number; // q = R + H/2
  expectedAA: number; // p^2
  expectedAa: number; // 2pq
  expectedaa: number; // q^2
  isEquilibrium: boolean; // p^2 * q^2 == (2pq / 2)^2
  chiSquare: number;
  structureLatex: string;
  explanationLatex: string[];
}

// ==========================================
// 4. KÝ HIỆU DI TRUYỀN (SYMBOL TOOLBAR)
// ==========================================

export interface GeneticSymbolItem {
  id: string;
  label: string;
  symbol: string;
  latex: string;
  category: 'symbol' | 'genotype' | 'term';
  description?: string;
}
