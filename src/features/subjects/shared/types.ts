/**
 * @file types.ts
 * @description Các kiểu dữ liệu cốt lõi dùng chung cho 3 phân hệ môn học THPT GDPT 2018:
 * Vật lý, Hóa học và Tiếng Anh.
 */

export type SubjectId = 'physics' | 'chemistry' | 'english';

export interface SubjectMetadata {
  id: SubjectId;
  name: string;
  code: string;
  accentColor: string;
  tagline: string;
  iconName: string;
}

// ----------------------------------------------------
// CẤU TRÚC ĐỀ THI ĐÁNH GIÁ NĂNG LỰC / TỐT NGHIỆP GDPT 2018
// ----------------------------------------------------

/** Phần I: Trắc nghiệm nhiều lựa chọn (4 phương án A, B, C, D) */
export interface Part1MultipleChoiceQuestion {
  id: string;
  number: number;
  stem: string;
  options: [string, string, string, string]; // [A, B, C, D]
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  topic?: string;
  grade?: '10' | '11' | '12';
}

/** Phần II: Trắc nghiệm Đúng/Sai (Mỗi câu gồm 4 ý a, b, c, d) */
export interface TrueFalseStatement {
  subId: 'a' | 'b' | 'c' | 'd';
  text: string;
  isCorrect: boolean; // Đúng = true, Sai = false
  explanation?: string;
}

export interface Part2TrueFalseQuestion {
  id: string;
  number: number;
  stem: string;
  statements: [
    TrueFalseStatement,
    TrueFalseStatement,
    TrueFalseStatement,
    TrueFalseStatement
  ];
  explanation?: string;
  topic?: string;
  grade?: '10' | '11' | '12';
}

/** Phần III: Câu hỏi trả lời ngắn (Điền số thực hoặc đơn vị) */
export interface Part3ShortAnswerQuestion {
  id: string;
  number: number;
  stem: string;
  correctAnswer: string; // VD: "12.5", "-4", "240"
  unit?: string;         // VD: "J", "V", "g/mol", "m/s"
  tolerance?: number;    // Sai số chấp nhận được (VD: 0.1)
  explanation?: string;
  topic?: string;
  grade?: '10' | '11' | '12';
}

/** Cấu trúc đề thi hoàn chỉnh chuẩn GDPT 2018 */
export interface StandardExamPaper {
  id: string;
  subjectId: SubjectId;
  title: string;
  grade: '10' | '11' | '12';
  durationMinutes: number;
  schoolYear: string;
  examCode: string;
  description?: string;
  part1: Part1MultipleChoiceQuestion[];
  part2: Part2TrueFalseQuestion[];
  part3: Part3ShortAnswerQuestion[];
}
