export const DEFAULT_GDPT_SUBJECTS = [
  "Toán học",
  "Toán",
  "Ngữ văn",
  "Tiếng Việt",
  "Tiếng Anh",
  "Ngoại ngữ 1",
  "Vật lí",
  "Hóa học",
  "Hoá học",
  "Sinh học",
  "Khoa học tự nhiên",
  "Lịch sử",
  "Địa lí",
  "Lịch sử và Địa lí",
  "Giáo dục công dân",
  "Giáo dục kinh tế và pháp luật",
  "Tin học",
  "Công nghệ",
  "Tự nhiên và Xã hội",
  "Khoa học",
  "Đạo đức",
  "Hoạt động trải nghiệm, hướng nghiệp",
  "Hoạt động trải nghiệm",
  "Nội dung giáo dục địa phương",
  "Giáo dục quốc phòng và an ninh",
  "Giáo dục thể chất",
  "Âm nhạc",
  "Mĩ thuật",
  "Chuyên đề học tập"
];

const STORAGE_KEY = "eduplan_custom_subjects_v1";

export function getStoredSubjects(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error loading stored subjects:", e);
  }
  return DEFAULT_GDPT_SUBJECTS;
}

export function saveStoredSubjects(subjects: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
    window.dispatchEvent(new Event("subjects_updated"));
  } catch (e) {
    console.error("Error saving subjects:", e);
  }
}

export const GDPT_2018_SUBJECTS = DEFAULT_GDPT_SUBJECTS;

import { useState, useEffect } from 'react';

export function useSubjects() {
  const [subjects, setSubjects] = useState<string[]>(getStoredSubjects());

  useEffect(() => {
    const handleUpdate = () => {
      setSubjects(getStoredSubjects());
    };
    window.addEventListener("subjects_updated", handleUpdate);
    return () => window.removeEventListener("subjects_updated", handleUpdate);
  }, []);

  return {
    subjects,
    addSubject: (subj: string) => {
      const trimmed = subj.trim();
      if (!trimmed) return;
      const current = getStoredSubjects();
      if (!current.includes(trimmed)) {
        const updated = [...current, trimmed];
        saveStoredSubjects(updated);
      }
    },
    removeSubject: (subj: string) => {
      const current = getStoredSubjects();
      const updated = current.filter(s => s !== subj);
      saveStoredSubjects(updated.length > 0 ? updated : DEFAULT_GDPT_SUBJECTS);
    },
    resetSubjects: () => {
      saveStoredSubjects(DEFAULT_GDPT_SUBJECTS);
    }
  };
}



