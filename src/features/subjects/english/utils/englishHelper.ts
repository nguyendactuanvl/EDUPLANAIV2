/**
 * @file englishHelper.ts
 * @description Các tiện ích cho môn Tiếng Anh: Bảng IPA, bộ sinh câu hỏi sắp xếp trật tự câu,
 * sinh bài tập đọc điền khuyết (Cloze test) và mẫu thông báo/tờ rơi (Announcement/Leaflet).
 */

import { IPASymbol, SentenceOrderingProblem, AnnouncementClozeProblem } from '../types';

// ----------------------------------------------------
// 1. DANH SÁCH BẢNG PHIÊN ÂM QUỐC TẾ (IPA)
// ----------------------------------------------------
export const IPA_SYMBOLS: IPASymbol[] = [
  // Trọng âm
  { char: 'ˈ', name: 'Primary Stress', example: 'Trọng âm chính (ˈdoctor)', type: 'stress' },
  { char: 'ˌ', name: 'Secondary Stress', example: 'Trọng âm phụ (ˌeduˈcation)', type: 'stress' },

  // Nguyên âm đơn (Monophthongs)
  { char: 'iː', name: 'Long i', example: 'see, sheep', type: 'monophthong' },
  { char: 'ɪ', name: 'Short i', example: 'sit, ship', type: 'monophthong' },
  { char: 'ʊ', name: 'Short u', example: 'put, good', type: 'monophthong' },
  { char: 'uː', name: 'Long u', example: 'too, food', type: 'monophthong' },
  { char: 'e', name: 'Short e', example: 'bed, men', type: 'monophthong' },
  { char: 'ə', name: 'Schwa', example: 'about, teacher', type: 'monophthong' },
  { char: 'ɜː', name: 'Long er', example: 'bird, learn', type: 'monophthong' },
  { char: 'ɔː', name: 'Long o', example: 'door, saw', type: 'monophthong' },
  { char: 'æ', name: 'Ash / Short a', example: 'cat, black', type: 'monophthong' },
  { char: 'ʌ', name: 'Strut', example: 'cup, money', type: 'monophthong' },
  { char: 'ɑː', name: 'Long a', example: 'car, father', type: 'monophthong' },
  { char: 'ɒ', name: 'Short o', example: 'hot, stop', type: 'monophthong' },

  // Nguyên âm đôi (Diphthongs)
  { char: 'eɪ', name: 'ei', example: 'face, day', type: 'diphthong' },
  { char: 'aɪ', name: 'ai', example: 'price, my', type: 'diphthong' },
  { char: 'ɔɪ', name: 'oi', example: 'boy, choice', type: 'diphthong' },
  { char: 'aʊ', name: 'au', example: 'mouth, now', type: 'diphthong' },
  { char: 'əʊ', name: 'ou', example: 'go, home', type: 'diphthong' },
  { char: 'ɪə', name: 'ia', example: 'near, here', type: 'diphthong' },
  { char: 'eə', name: 'ea', example: 'hair, there', type: 'diphthong' },
  { char: 'ʊə', name: 'ua', example: 'pure, tour', type: 'diphthong' },

  // Phụ âm đặc thù (Consonants)
  { char: 'θ', name: 'Voiceless th', example: 'think, tooth', type: 'consonant' },
  { char: 'ð', name: 'Voiced th', example: 'this, mother', type: 'consonant' },
  { char: 'ʃ', name: 'esh (sh)', example: 'ship, shoe', type: 'consonant' },
  { char: 'ʒ', name: 'ezh (zh)', example: 'vision, measure', type: 'consonant' },
  { char: 'tʃ', name: 'ch', example: 'chair, match', type: 'consonant' },
  { char: 'dʒ', name: 'j', example: 'job, bridge', type: 'consonant' },
  { char: 'ŋ', name: 'eng (ng)', example: 'sing, bank', type: 'consonant' },
  { char: 'j', name: 'yod (y)', example: 'yes, yellow', type: 'consonant' }
];

// ----------------------------------------------------
// 2. TỰ ĐỘNG SINH BÀI ĐỌC ĐIỀN KHUYẾT (CLOZE TEST)
// ----------------------------------------------------
/**
 * Thay thế các từ trong danh sách bằng (1) _______, (2) _______...
 */
export function generateClozePassage(
  passage: string,
  targetWords: string[]
): { clozeText: string; blanks: { number: number; originalWord: string }[] } {
  let clozeText = passage;
  const blanks: { number: number; originalWord: string }[] = [];

  targetWords.forEach((word, idx) => {
    const blankNumber = idx + 1;
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(clozeText)) {
      clozeText = clozeText.replace(regex, `(${blankNumber}) _______`);
      blanks.push({ number: blankNumber, originalWord: word });
    }
  });

  return { clozeText, blanks };
}

// ----------------------------------------------------
// 3. BỘ SINH DẠNG BÀI SẮP XẾP TRẬT TỰ CÂU (SENTENCE ORDERING)
// ----------------------------------------------------
/**
 * Tự động tạo 4 phương án lựa chọn A, B, C, D cho câu hỏi sắp xếp thứ tự
 */
export function createSentenceOrderingOptions(
  correctSequence: string // vd: "a-c-b-e-d"
): [string, string, string, string] {
  const parts = correctSequence.split('-');
  const options: string[] = [correctSequence];

  // Sinh 3 hoán vị gây nhiễu hợp lý
  const distractor1 = [parts[1], parts[0], parts[2], parts[4], parts[3]].join('-');
  const distractor2 = [parts[0], parts[2], parts[1], parts[3], parts[4]].join('-');
  const distractor3 = [parts[2], parts[0], parts[1], parts[4], parts[3]].join('-');

  options.push(distractor1, distractor2, distractor3);
  return options as [string, string, string, string];
}

// ----------------------------------------------------
// 4. MẪU THÔNG BÁO / TỜ RƠI (ANNOUNCEMENT / LEAFLET)
// ----------------------------------------------------
export const SAMPLE_ANNOUNCEMENT: AnnouncementClozeProblem = {
  id: 'ann_demo_1',
  title: 'SCHOOL VOLUNTEER CAMPAIGN 2026',
  announcementType: 'volunteer',
  rawText: `Are you passionate about helping the community? Join our Green Horizon Campaign this weekend!
• Date: Saturday, November 15th
• Location: City Central Park
• Tasks: We are looking for volunteers to (1) _______ trees, collect plastic waste, and guide visitors.
• Requirements: All students must register before Thursday. Please remember to wear your school (2) _______ and bring a reusable water bottle.
For further details, please contact the Youth Union Office or (3) _______ our official website!`,
  blankCount: 3,
  questions: [
    {
      blankNumber: 1,
      options: ['plant', 'planting', 'planted', 'plants'],
      correctAnswer: 'A',
      explanation: 'Cấu trúc "to + V-inf" chỉ mục đích: to plant trees.'
    },
    {
      blankNumber: 2,
      options: ['uniform', 'suit', 'costume', 'fashion'],
      correctAnswer: 'A',
      explanation: 'School uniform = đồng phục trường học.'
    },
    {
      blankNumber: 3,
      options: ['visit', 'attend', 'join', 'call'],
      correctAnswer: 'A',
      explanation: 'Cụm từ đi với website: visit our official website.'
    }
  ]
};
