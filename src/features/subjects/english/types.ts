/**
 * @file types.ts
 * @description Các kiểu dữ liệu chuyên biệt cho English Toolkit (Tiếng Anh THPT GDPT 2018).
 */

export interface IPASymbol {
  char: string;
  name: string;
  example: string;
  type: 'monophthong' | 'diphthong' | 'consonant' | 'stress';
}

export interface SentenceOrderingProblem {
  id: string;
  contextType: 'letter' | 'conversation'; // Bức thư hay đoạn hội thoại
  title: string;
  sentences: { id: 'a' | 'b' | 'c' | 'd' | 'e'; text: string }[];
  correctOrder: string;                   // VD: "a-c-b-e-d"
  permutations: [string, string, string, string]; // [A, B, C, D]
  explanation: string;
}

export interface AnnouncementClozeProblem {
  id: string;
  title: string;
  announcementType: 'school_event' | 'volunteer' | 'competition' | 'club_notice';
  rawText: string;
  blankCount: number;
  questions: {
    blankNumber: number;
    options: [string, string, string, string];
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    explanation: string;
  }[];
}

export interface ReadingPassageItem {
  id: string;
  title: string;
  wordCount: number;
  content: string;
  questions: {
    id: string;
    questionNumber: number;
    stem: string;
    options: [string, string, string, string];
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
  }[];
}
