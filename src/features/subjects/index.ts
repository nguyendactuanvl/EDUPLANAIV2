/**
 * @file index.ts
 * @description Điểm tích hợp duy nhất (Single Entry Point) cho toàn bộ 3 phân hệ môn học THPT GDPT 2018:
 * - Vật lý (Physics Toolkit)
 * - Hóa học (Chemistry Toolkit)
 * - Tiếng Anh (English Toolkit)
 * 
 * Đảm bảo kiến trúc Zero Collision: Ứng dụng EduPlan AI chỉ cần import đúng 1 dòng:
 * import { SubjectHubWorkspace } from './features/subjects';
 */

export { SubjectHubWorkspace, default } from './SubjectHubWorkspace';
export { PhysicsView } from './physics/PhysicsView';
export { ChemistryView } from './chemistry/ChemistryView';
export { EnglishView } from './english/EnglishView';

export * from './shared/types';
export * from './shared/utils/ommlExporter';
export { ExamLayout } from './shared/components/ExamLayout';

// Cấu hình navigation mẫu để nhúng vào Sidebar nếu cần
export const SUBJECT_NAV_ITEMS = [
  { id: 'subjects_hub', label: 'Bộ 3 Môn THPT (Lý - Hóa - Anh)', icon: 'GraduationCap' },
  { id: 'physics_toolkit', label: 'Physics Toolkit (Vật lý 10-11-12)', icon: 'Zap' },
  { id: 'chemistry_toolkit', label: 'Chemistry Toolkit (Hóa học 10-11-12)', icon: 'FlaskConical' },
  { id: 'english_toolkit', label: 'English Toolkit (Tiếng Anh 10-11-12)', icon: 'BookOpen' }
];
