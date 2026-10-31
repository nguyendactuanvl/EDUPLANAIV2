/**
 * @file physics.types.ts
 * @description Type definitions cho Module Physics Toolkit (Vật lý THPT GDPT 2018).
 * Hoàn toàn độc lập, không ảnh hưởng đến type chung của ứng dụng.
 */

// ----------------------------------------------------
// 1. Cấu trúc Đề thi Vật lý GDPT 2018 (3 Phần chuẩn)
// ----------------------------------------------------

export type PhysicsQuestionType = 'mc' | 'tf' | 'sa';

/**
 * Phần I: Trắc nghiệm 4 lựa chọn (A, B, C, D)
 */
export interface PhysicsMcQuestion {
  id: string;
  type: 'mc';
  topic: string; // VD: Cơ học, Điện xoay chiều, Quang học, Nhiệt học
  content: string; // Hỗ trợ KaTeX $...$
  options: [string, string, string, string]; // [A, B, C, D]
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

/**
 * Phần II: Trắc nghiệm Đúng/Sai (4 lệnh hỏi a, b, c, d)
 */
export interface PhysicsTfStatement {
  id: 'a' | 'b' | 'c' | 'd';
  statement: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface PhysicsTfQuestion {
  id: string;
  type: 'tf';
  topic: string;
  stemContent: string; // Đoạn dẫn / dữ liệu gốc
  statements: [PhysicsTfStatement, PhysicsTfStatement, PhysicsTfStatement, PhysicsTfStatement];
  explanation: string;
}

/**
 * Phần III: Trắc nghiệm trả lời ngắn (Điền số thực + đơn vị)
 */
export interface PhysicsSaQuestion {
  id: string;
  type: 'sa';
  topic: string;
  content: string;
  correctAnswer: string; // Đáp số chuẩn (VD: "0,5" hoặc "120")
  unit?: string; // Đơn vị đo (VD: "cm", "rad/s", "V", "J")
  tolerance?: number; // Sai số cho phép (nếu có, VD: 0.01)
  explanation: string;
}

/**
 * Cấu trúc Đề thi Vật lý GDPT 2018 hoàn chỉnh
 */
export interface PhysicsExamPaper {
  id: string;
  title: string;
  grade: '10' | '11' | '12';
  durationMinutes: number;
  schoolYear: string;
  part1_mc: PhysicsMcQuestion[];
  part2_tf: PhysicsTfQuestion[];
  part3_sa: PhysicsSaQuestion[];
}

// ----------------------------------------------------
// 2. Ký hiệu Vật lý & Vectơ
// ----------------------------------------------------

export type PhysicsCategory = 'mechanics' | 'electricity' | 'optics' | 'thermo_nuclear' | 'si_units';

export interface PhysicsSymbolItem {
  id: string;
  label: string;
  symbol: string; // Ký hiệu hiển thị
  latex: string;  // Mã KaTeX ($...$)
  category: PhysicsCategory;
  description: string;
  unit?: string;
}

// ----------------------------------------------------
// 3. Sơ đồ Mạch điện & Quang học (SVG Diagram Generator)
// ----------------------------------------------------

export type ComponentType = 'resistor' | 'inductor' | 'capacitor' | 'source_dc' | 'source_ac' | 'switch' | 'ammeter' | 'voltmeter' | 'lamp';

export interface CircuitComponentItem {
  id: string;
  type: ComponentType;
  label: string; // VD: R1, L, C, A, V, K
  value?: number; // Giá trị định mức (VD: 100 Ohm, 0.1 H, 100 uF)
  unit?: string;
}

export interface CircuitDiagramConfig {
  title: string;
  connectionType: 'series' | 'parallel';
  components: CircuitComponentItem[];
  sourceVoltage?: number; // Điện áp nguồn (V)
  sourceFrequency?: number; // Tần số f (Hz) nếu là AC
  isSwitchClosed: boolean;
}

// Quang học & Thấu kính
export type OpticsDeviceType = 'convex_lens' | 'concave_lens' | 'flat_mirror';

export interface OpticsDiagramConfig {
  title: string;
  deviceType: OpticsDeviceType;
  focalLength: number; // Tiêu cự f (cm) - dương với HT, âm với PK
  objectDistance: number; // Khoảng cách vật d (cm)
  objectHeight: number; // Chiều cao vật h (cm)
  showSpecialRays: boolean; // Hiện các tia sáng đặc biệt
}

// ----------------------------------------------------
// 4. Đồ thị Dao động & Sóng cơ (Oscillation & Wave Graph)
// ----------------------------------------------------

export type PhysicsGraphType = 'xt_harmonic' | 'vt_velocity' | 'at_acceleration' | 'spatial_wave';

export interface OscillationGraphConfig {
  title: string;
  graphType: PhysicsGraphType;
  amplitude: number; // Biên độ A (cm hoặc m/s)
  angularFrequency: number; // Tần số góc \omega (rad/s)
  initialPhaseRad: number; // Pha ban đầu \varphi (rad)
  timeCycles: number; // Số chu kỳ T hiển thị (VD: 2 hoặc 3)
  wavelengthCm?: number; // Bước sóng \lambda (cm) đối với sóng cơ
}

// ----------------------------------------------------
// 5. Kết quả Máy tính Vật lý Nhanh
// ----------------------------------------------------

export interface DhoCalcInput {
  amplitudeA?: number; // A (cm)
  omega?: number; // \omega (rad/s)
  frequencyF?: number; // f (Hz)
  periodT?: number; // T (s)
}

export interface DhoCalcResult {
  amplitudeA: number;
  omega: number;
  frequencyF: number;
  periodT: number;
  vMax: number; // v_max = A * \omega (cm/s)
  aMax: number; // a_max = A * \omega^2 (cm/s^2)
  explanationLatex: string[];
}

export interface AcCircuitCalcInput {
  resistanceR: number; // R (\Omega)
  inductanceL: number; // L (H)
  capacitanceC: number; // C (F)
  frequencyF: number; // f (Hz)
  voltageU: number; // U_rms (V)
}

export interface AcCircuitCalcResult {
  R: number;
  ZL: number;
  ZC: number;
  Z: number; // Trở kháng tổng
  I: number; // Cường độ dòng điện hiệu dụng
  cosPhi: number; // Hệ số công suất
  phasePhiRad: number; // Độ lệch pha \varphi (rad)
  powerP: number; // Công suất P (W)
  resonanceFreqF: number; // Tần số cộng hưởng f_0 (Hz)
  explanationLatex: string[];
}

export interface LensCalcInput {
  focalLength: number; // f (cm)
  objectDistance: number; // d (cm)
  objectHeight: number; // h (cm)
}

export interface LensCalcResult {
  focalLength: number;
  objectDistance: number;
  imageDistance: number; // d' (cm)
  magnificationK: number; // k = -d'/d
  imageHeight: number; // h' = |k| * h (cm)
  opticalPowerD: number; // Độ tụ D = 1/f (độ điốp dp)
  isRealImage: boolean;
  isErect: boolean; // Cùng chiều hay ngược chiều
  explanationLatex: string[];
}

export interface IdealGasInput {
  pressureP?: number; // p (Pa hoặc atm)
  volumeV?: number; // V (m^3 hoặc lít)
  temperatureK?: number; // T (K)
  molesN?: number; // n (mol)
}

export interface IdealGasResult {
  pressureP: number;
  volumeV: number;
  temperatureK: number;
  temperatureC: number;
  molesN: number;
  explanationLatex: string[];
}
