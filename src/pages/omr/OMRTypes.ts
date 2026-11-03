export type OMRTemplateType = 'gdpt_2018' | 'tnmaker_20' | 'tnmaker_40' | 'tnmaker_50';

export interface Student {
  sbd: string; // 6 digits, e.g. "000101"
  name: string;
  className: string;
  dob?: string;
  note?: string;
}

export interface ExamAnswerKey {
  code: string; // 4 digits, e.g. "1001", "1101", "1201"
  templateType: OMRTemplateType;
  title?: string;
  // Part I: multiple choice (1-indexed -> 'A' | 'B' | 'C' | 'D')
  partI: Record<number, string>;
  // Part II: true/false (1-indexed -> { a: boolean, b: boolean, c: boolean, d: boolean })
  partII: Record<number, { a?: boolean; b?: boolean; c?: boolean; d?: boolean }>;
  // Part III: short answer string (1-indexed -> string, e.g. "25", "-3.5")
  partIII: Record<number, string>;
  // Scoring points config
  pointsConfig?: {
    partI_per_question?: number;
    partII_1?: number;
    partII_2?: number;
    partII_3?: number;
    partII_4?: number;
    partIII_per_question?: number;
  };
}

export interface OMRGradingResult {
  id: string;
  timestamp: number;
  sbd: string;
  studentName: string;
  studentClass: string;
  examCode: string;
  templateType: OMRTemplateType;
  // Detected answers
  partI_answers: Record<number, string>;
  partII_answers: Record<number, { a?: boolean; b?: boolean; c?: boolean; d?: boolean }>;
  partIII_answers: Record<number, string>;
  // Score breakdown
  partI_score: number;
  partII_score: number;
  partIII_score: number;
  totalScore: number;
  maxScore: number;
  // Statistics
  partI_correct: number;
  partI_total: number;
  partII_correctCount: number;
  partIII_correct: number;
  partIII_total: number;
  // Review photo data URL
  capturedImageUrl?: string;
  manualOverride?: boolean;
}

export interface OMRCornerPoint {
  x: number;
  y: number;
}
