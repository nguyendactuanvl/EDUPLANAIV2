export interface HeaderConfig {
  department: string;   // SỞ GIÁO DỤC VÀ ĐÀO TẠO
  schoolName: string;   // Tên trường của giáo viên (ví dụ: TRƯỜNG THPT CHUYÊN...)
  teacherName: string;  // Họ và tên giáo viên (ví dụ: Thầy Nguyễn Đắc Tuấn)
  subjectGroup: string; // Tổ chuyên môn (ví dụ: TỔ TOÁN - TIN HỌC)
  schoolYear: string;   // Năm học (mặc định: 2026 - 2027)
}

const STORAGE_KEY = 'edu_header_config_v2026';

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  department: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO',
  schoolName: '',
  teacherName: '',
  subjectGroup: 'TỔ TOÁN - TIN HỌC',
  schoolYear: '2026 - 2027',
};

export function getHeaderConfig(): HeaderConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_HEADER_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        department: parsed.department ?? DEFAULT_HEADER_CONFIG.department,
        schoolName: parsed.schoolName ?? DEFAULT_HEADER_CONFIG.schoolName,
        teacherName: parsed.teacherName ?? DEFAULT_HEADER_CONFIG.teacherName,
        subjectGroup: parsed.subjectGroup ?? DEFAULT_HEADER_CONFIG.subjectGroup,
        schoolYear: parsed.schoolYear || '2026 - 2027',
      };
    }
  } catch (e) {
    console.warn('Error reading header config:', e);
  }
  return { ...DEFAULT_HEADER_CONFIG };
}

export function saveHeaderConfig(config: Partial<HeaderConfig>): HeaderConfig {
  const current = getHeaderConfig();
  const updated: HeaderConfig = {
    ...current,
    ...config,
    schoolYear: config.schoolYear || current.schoolYear || '2026 - 2027',
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving header config:', e);
    }
  }
  return updated;
}
