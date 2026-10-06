/**
 * Standardized Exam Types & Duration Configuration (Chuẩn GDPT 2018)
 */

export const STANDARDIZED_EXAM_TYPES = [
  "Đề kiểm tra 15 phút",
  "Đề kiểm tra 45 phút",
  "Đề kiểm tra giữa kỳ 1",
  "Đề kiểm tra giữa kỳ 2",
  "Đề kiểm tra cuối kỳ 1",
  "Đề kiểm tra cuối kỳ 2",
  "Đề khảo sát chất lượng",
  "Đề thi thử tốt nghiệp THPT",
  "Đề tuyển sinh vào lớp 10",
  "Đề thi vào lớp 6",
  "Đề thi học sinh giỏi",
  "Đề ôn tập chuyên đề"
] as const;

export type StandardExamType = typeof STANDARDIZED_EXAM_TYPES[number];

export const SCHOOL_LEVELS = ["THPT", "THCS", "Tiểu học"] as const;
export type SchoolLevel = typeof SCHOOL_LEVELS[number];

export const GRADES_BY_LEVEL: Record<string, { value: string; label: string }[]> = {
  "THPT": [
    { value: "10", label: "Lớp 10" },
    { value: "11", label: "Lớp 11" },
    { value: "12", label: "Lớp 12" }
  ],
  "THCS": [
    { value: "6", label: "Lớp 6" },
    { value: "7", label: "Lớp 7" },
    { value: "8", label: "Lớp 8" },
    { value: "9", label: "Lớp 9" }
  ],
  "Tiểu học": [
    { value: "1", label: "Lớp 1" },
    { value: "2", label: "Lớp 2" },
    { value: "3", label: "Lớp 3" },
    { value: "4", label: "Lớp 4" },
    { value: "5", label: "Lớp 5" }
  ]
};

export const SUBJECTS_BY_LEVEL: Record<string, string[]> = {
  "THPT": [
    "Toán học",
    "Vật lí",
    "Hóa học",
    "Sinh học",
    "Tin học",
    "Ngữ văn",
    "Lịch sử",
    "Địa lí",
    "Giáo dục kinh tế và pháp luật (GDKT&PL)",
    "Tiếng Anh",
    "Công nghệ",
    "Hoạt động trải nghiệm, hướng nghiệp (HĐTN, HN)",
    "Nội dung Giáo dục địa phương",
    "Giáo dục quốc phòng và an ninh (GDQP-AN)",
    "Giáo dục thể chất (Thể dục)",
    "Âm nhạc",
    "Mĩ thuật"
  ],
  "THCS": [
    "Toán học",
    "Khoa học tự nhiên",
    "Tin học",
    "Ngữ văn",
    "Lịch sử và Địa lí",
    "Giáo dục công dân (GDCD)",
    "Tiếng Anh",
    "Công nghệ",
    "Hoạt động trải nghiệm, hướng nghiệp (HĐTN, HN)",
    "Nội dung Giáo dục địa phương",
    "Giáo dục thể chất (Thể dục)",
    "Âm nhạc",
    "Mĩ thuật"
  ],
  "Tiểu học": [
    "Toán học",
    "Tiếng Việt",
    "Tiếng Anh",
    "Tin học và Công nghệ",
    "Tự nhiên và Xã hội",
    "Lịch sử và Địa lí",
    "Khoa học",
    "Đạo đức",
    "Hoạt động trải nghiệm (HĐTN)",
    "Nội dung Giáo dục địa phương",
    "Giáo dục thể chất (Thể dục)",
    "Âm nhạc",
    "Mĩ thuật"
  ]
};

export const NUM_EXAM_CODES_OPTIONS = [
  { value: 1, label: "1 mã đề (Đề gốc)" },
  { value: 2, label: "2 mã đề" },
  { value: 4, label: "4 mã đề (Chuẩn phòng thi)" },
  { value: 6, label: "6 mã đề" },
  { value: 8, label: "8 mã đề" },
  { value: 10, label: "10 mã đề" },
  { value: 12, label: "12 mã đề" },
  { value: 16, label: "16 mã đề" },
  { value: 20, label: "20 mã đề" },
  { value: 24, label: "24 mã đề (Chuẩn thi QG)" }
];

export const PARAMETER_PROBLEM_OPTIONS = [
  { value: "auto", label: "Tự nhiên / Mặc định (Cả bài thuần túy và bài có tham số)" },
  { value: "with_params", label: "Có bài toán chứa tham số (m, a, b...)" },
  { value: "without_params", label: "Không chứa tham số (Chỉ dùng hệ số số thực cụ thể)" }
] as const;

export type ParameterOption = typeof PARAMETER_PROBLEM_OPTIONS[number]["value"];

/**
 * Tự động gợi ý thời gian làm bài mặc định theo Loại đề:
 * - "Đề kiểm tra 15 phút" -> 15 phút
 * - "Đề kiểm tra 45 phút", "Đề kiểm tra giữa kỳ 1", "Đề kiểm tra giữa kỳ 2" -> 45 phút (hoặc 60 phút nếu cấp THPT)
 * - "Đề kiểm tra cuối kỳ 1", "Đề kiểm tra cuối kỳ 2" -> 90 phút
 * - "Đề khảo sát chất lượng" -> 90 phút (THPT) / 60 phút (THCS) / 45 phút (Tiểu học)
 * - "Đề thi thử tốt nghiệp THPT" -> 90 phút (môn Toán) / 50 phút (các môn khác)
 * - "Đề tuyển sinh vào lớp 10" -> 120 phút
 * - "Đề thi vào lớp 6" -> 45 phút / 60 phút (mặc định 45 phút)
 */
export function getDefaultDurationForExamType(
  examType: string,
  schoolLevel?: string,
  grade?: string,
  subject?: string
): number {
  const normType = (examType || '').toLowerCase().trim();
  const normLevel = (schoolLevel || '').toLowerCase().trim();
  const normGrade = (grade || '').toLowerCase().trim();
  const normSubj = (subject || '').toLowerCase().trim();

  const isTHPT = normLevel.includes('thpt') || ['10', '11', '12'].some(g => normGrade.includes(g));

  if (normType.includes('15 phút') || normType === '15p') {
    return 15;
  }
  if (normType.includes('giữa kỳ 1') || normType.includes('giữa kỳ 2') || normType === 'mid') {
    return isTHPT ? 60 : 45;
  }
  if (normType.includes('45 phút') || normType === '45p') {
    return isTHPT ? 60 : 45;
  }
  if (normType.includes('khảo sát chất lượng') || normType.includes('kscl')) {
    return isTHPT ? 90 : 60;
  }
  if (
    normType.includes('cuối kỳ 1') ||
    normType.includes('cuối kỳ 2') ||
    normType.includes('học kỳ') ||
    normType === 'final'
  ) {
    return 90;
  }
  if (normType.includes('tốt nghiệp thpt') || normType.includes('thpt quốc gia')) {
    // Môn Toán / Văn -> 90 phút, các môn trắc nghiệm thành phần khác -> 50 phút
    if (!normSubj || normSubj.includes('toán') || normSubj.includes('ngữ văn') || normSubj.includes('văn')) {
      return 90;
    }
    return 50;
  }
  if (normType.includes('tuyển sinh vào lớp 10') || normType.includes('vào 10') || normType.includes('vào lớp 10')) {
    return 120;
  }
  if (normType.includes('vào lớp 6') || normType.includes('vào 6')) {
    return 45;
  }
  return 45;
}

/**
 * Chuẩn hóa giá trị loại đề cũ (nếu có)
 */
export function normalizeExamType(val: string): string {
  if (!val) return STANDARDIZED_EXAM_TYPES[0];
  if (val === '15p') return "Đề kiểm tra 15 phút";
  if (val === '45p') return "Đề kiểm tra 45 phút";
  if (val === 'mid') return "Đề kiểm tra giữa kỳ 1";
  if (val === 'final') return "Đề kiểm tra cuối kỳ 1";
  const found = STANDARDIZED_EXAM_TYPES.find(t => t.toLowerCase() === val.toLowerCase());
  return found || val;
}

/**
 * Đồng bộ tiêu đề chính của đề thi theo format chuẩn:
 * VD: "ĐỀ KIỂM TRA GIỮA KỲ 1 - MÔN TOÁN 10"
 */
export function formatExamTitle(examType: string, subject: string, grade: string): string {
  const cleanType = (normalizeExamType(examType) || 'ĐỀ KIỂM TRA').trim().toUpperCase();
  const cleanSubj = (subject || 'TOÁN HỌC').trim().toUpperCase();
  const cleanGrade = (grade || '').trim().toUpperCase();

  let titlePrefix = cleanType;
  if (!titlePrefix.startsWith('ĐỀ')) {
    titlePrefix = `ĐỀ ${titlePrefix}`;
  }

  let gradePart = '';
  if (cleanGrade) {
    gradePart = cleanGrade.replace(/^(LỚP|KHỐI)\s*/i, '').trim();
    if (gradePart) {
      gradePart = `${gradePart}`;
    }
  }

  if (gradePart) {
    return `${titlePrefix} - MÔN ${cleanSubj} ${gradePart}`.replace(/\s+/g, ' ');
  }
  return `${titlePrefix} - MÔN ${cleanSubj}`.replace(/\s+/g, ' ');
}
