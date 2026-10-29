import localforage from 'localforage';
import type { ShuffledExamVariant, ShuffleConfig, ShufflerExam } from './examShufflerService';

export interface SavedShuffledExamRecord {
  id: string; // shuffled_${timestamp}
  createdAt: string; // ISO string
  formattedDate: string; // "25/10/2026, 11:05"
  title: string;
  originalFileName: string;
  questionCount: number;
  partCounts: {
    part1: number;
    part2: number;
    part3: number;
    part4: number;
  };
  variantCodes: string[];
  config: ShuffleConfig;
  variants: ShuffledExamVariant[];
  imageStore: Record<string, string>;
  exam?: ShufflerExam;
}

const STORAGE_KEY = 'eduplan_shuffled_exams_list';

// Khởi tạo instance LocalForage chuyên biệt cho Kho đề đã trộn (IndexedDB siêu bền, dung lượng lớn)
const shuffledExamStore = typeof window !== 'undefined'
  ? localforage.createInstance({
      name: 'EduPlanAI',
      storeName: 'shuffled_exams_vault',
      description: 'Kho lưu trữ các bộ đề đã trộn của giáo viên',
    })
  : null;

/**
 * Lấy danh sách toàn bộ các bộ đề đã trộn từ kho lưu trữ
 */
export async function getSavedShuffledExams(): Promise<SavedShuffledExamRecord[]> {
  try {
    if (shuffledExamStore) {
      const records = (await shuffledExamStore.getItem<SavedShuffledExamRecord[]>(STORAGE_KEY)) || [];
      return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('Lỗi khi đọc IndexedDB qua localforage, thử fallback localStorage:', err);
  }

  // Fallback: localStorage
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    }
  } catch (_e) {}

  return [];
}

/**
 * Lưu bộ đề đã trộn mới vào kho lưu trữ (không bị mất khi tắt app / reload trang)
 */
export async function saveShuffledExam(
  title: string,
  variants: ShuffledExamVariant[],
  config: ShuffleConfig,
  exam: ShufflerExam,
  originalFileName = 'De_Goc.docx'
): Promise<SavedShuffledExamRecord> {
  const now = new Date();
  const id = `shuffled_${Date.now()}`;
  const formattedDate = now.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const recordTitle =
    title ||
    (config.header.examName ? `${config.header.examName} - ` : '') +
    (config.header.subject || 'Đề thi Toán') +
    ` (${variants.length} mã đề)`;

  const part1 = variants[0]?.questions.filter((q) => q.part === 1).length || 0;
  const part2 = variants[0]?.questions.filter((q) => q.part === 2).length || 0;
  const part3 = variants[0]?.questions.filter((q) => q.part === 3).length || 0;
  const part4 = variants[0]?.questions.filter((q) => q.part === 4).length || 0;

  const record: SavedShuffledExamRecord = {
    id,
    createdAt: now.toISOString(),
    formattedDate,
    title: recordTitle,
    originalFileName: originalFileName || 'De_Thi_Goc.docx',
    questionCount: variants[0]?.questions.length || exam.questions.length,
    partCounts: { part1, part2, part3, part4 },
    variantCodes: variants.map((v) => v.code),
    config: JSON.parse(JSON.stringify(config)),
    variants: JSON.parse(JSON.stringify(variants)),
    imageStore: exam.imageStore || {},
    exam: JSON.parse(JSON.stringify(exam)),
  };

  const existing = await getSavedShuffledExams();
  // Giữ tối đa 50 bộ đề gần nhất
  const updated = [record, ...existing.filter((item) => item.id !== id)].slice(0, 50);

  if (shuffledExamStore) {
    try {
      await shuffledExamStore.setItem(STORAGE_KEY, updated);
    } catch (e) {
      console.warn('Lỗi lưu vào IndexedDB:', e);
    }
  }

  // Backup nhẹ nhàng vào localStorage (bỏ bớt ảnh base64 để không quá 5MB)
  try {
    if (typeof window !== 'undefined') {
      const lightweight = updated.slice(0, 10).map((r) => ({
        ...r,
        imageStore: {},
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
    }
  } catch (_e) {}

  return record;
}

/**
 * Xóa một bộ đề đã trộn khỏi kho lưu trữ
 */
export async function deleteShuffledExam(id: string): Promise<SavedShuffledExamRecord[]> {
  const existing = await getSavedShuffledExams();
  const updated = existing.filter((item) => item.id !== id);

  if (shuffledExamStore) {
    try {
      await shuffledExamStore.setItem(STORAGE_KEY, updated);
    } catch (e) {
      console.warn('Lỗi khi xóa khỏi IndexedDB:', e);
    }
  }

  try {
    if (typeof window !== 'undefined') {
      const lightweight = updated.slice(0, 10).map((r) => ({
        ...r,
        imageStore: {},
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
    }
  } catch (_e) {}

  return updated;
}

/**
 * Xóa toàn bộ kho đề đã trộn
 */
export async function clearAllShuffledExams(): Promise<void> {
  if (shuffledExamStore) {
    try {
      await shuffledExamStore.removeItem(STORAGE_KEY);
    } catch (e) {}
  }
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (_e) {}
}
