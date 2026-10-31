/**
 * @file SubjectHubWorkspace.tsx
 * @description Màn hình Container điều phối trung tâm cho bộ 3 môn THPT GDPT 2018:
 * 1. VẬT LÝ (Physics Toolkit)
 * 2. HÓA HỌC (Chemistry Toolkit)
 * 3. TIẾNG ANH (English Toolkit)
 * 
 * Thiết kế Zero Collision & Plug-and-play: Hoàn toàn độc lập, không phụ thuộc router hay core state.
 */

import React, { useState, useEffect } from 'react';
import {
  Zap, FlaskConical, BookOpen, GraduationCap, Sparkles
} from 'lucide-react';
import { PhysicsView } from './physics/PhysicsView';
import { ChemistryView } from './chemistry/ChemistryView';
import { EnglishView } from './english/EnglishView';
import { SubjectId } from './shared/types';

interface SubjectHubWorkspaceProps {
  initialSubject?: SubjectId;
  className?: string;
}

export const SubjectHubWorkspace: React.FC<SubjectHubWorkspaceProps> = ({
  initialSubject = 'physics',
  className = ''
}) => {
  const [activeSubject, setActiveSubject] = useState<SubjectId>(initialSubject);

  useEffect(() => {
    if (initialSubject) {
      setActiveSubject(initialSubject);
    }
  }, [initialSubject]);

  return (
    <div className={`w-full min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col ${className}`}>
      {/* Top Banner Navigation */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Bộ Công Cụ Chuyên Môn 3 Môn THPT (GDPT 2018)
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Lớp 10 - 11 - 12
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Vật lý • Hóa học • Tiếng Anh chuẩn cấu trúc đánh giá năng lực & đề thi tốt nghiệp mới
              </p>
            </div>
          </div>

          {/* 3 Subject Switch Buttons */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shrink-0">
            {/* 1. Vật lý */}
            <button
              type="button"
              onClick={() => setActiveSubject('physics')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                activeSubject === 'physics'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>1. Vật Lý</span>
            </button>

            {/* 2. Hóa học */}
            <button
              type="button"
              onClick={() => setActiveSubject('chemistry')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                activeSubject === 'chemistry'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              <span>2. Hóa Học</span>
            </button>

            {/* 3. Tiếng Anh */}
            <button
              type="button"
              onClick={() => setActiveSubject('english')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                activeSubject === 'english'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>3. Tiếng Anh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeSubject === 'physics' && <PhysicsView />}
        {activeSubject === 'chemistry' && <ChemistryView />}
        {activeSubject === 'english' && <EnglishView />}
      </div>
    </div>
  );
};

export default SubjectHubWorkspace;
