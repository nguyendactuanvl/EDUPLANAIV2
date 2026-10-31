/**
 * @file ExamLayout.tsx
 * @description Khung giao diện dùng chung để hiển thị, chỉnh sửa và xuất đề thi 3 phần chuẩn GDPT 2018
 * (Phần I: 4 lựa chọn, Phần II: Đúng/Sai 4 ý, Phần III: Trả lời ngắn).
 */

import React, { useState } from 'react';
import {
  FileText, Copy, Download, Check, Plus, Trash2, Eye, EyeOff, Sparkles
} from 'lucide-react';
import { StandardExamPaper, Part1MultipleChoiceQuestion, Part2TrueFalseQuestion, Part3ShortAnswerQuestion } from '../types';
import { exportExamToText, downloadWordDocument } from '../utils/ommlExporter';

interface ExamLayoutProps {
  exam: StandardExamPaper;
  onChangeExam: (newExam: StandardExamPaper) => void;
  accentColorClass?: string; // e.g., 'amber' | 'emerald' | 'indigo'
  subjectLabel: string;
}

export const ExamLayout: React.FC<ExamLayoutProps> = ({
  exam,
  onChangeExam,
  accentColorClass = 'indigo',
  subjectLabel
}) => {
  const [activeTab, setActiveTab] = useState<'part1' | 'part2' | 'part3' | 'preview'>('part1');
  const [showExplanation, setShowExplanation] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyText = async () => {
    const text = exportExamToText(exam);
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadWordDocument(exam);
  };

  // Thêm câu hỏi nhanh
  const handleAddPart1 = () => {
    const newQ: Part1MultipleChoiceQuestion = {
      id: `p1_${Date.now()}`,
      number: exam.part1.length + 1,
      stem: 'Câu hỏi mới: Điền nội dung câu hỏi tại đây...',
      options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
      correctAnswer: 'A',
      explanation: 'Giải thích chi tiết cho câu hỏi...'
    };
    onChangeExam({
      ...exam,
      part1: [...exam.part1, newQ]
    });
  };

  const handleAddPart2 = () => {
    const newQ: Part2TrueFalseQuestion = {
      id: `p2_${Date.now()}`,
      number: exam.part2.length + 1,
      stem: 'Xét tính đúng/sai của các nhận định sau đây:',
      statements: [
        { subId: 'a', text: 'Mệnh đề nhận định ý a', isCorrect: true },
        { subId: 'b', text: 'Mệnh đề nhận định ý b', isCorrect: false },
        { subId: 'c', text: 'Mệnh đề nhận định ý c', isCorrect: true },
        { subId: 'd', text: 'Mệnh đề nhận định ý d', isCorrect: false }
      ],
      explanation: 'Giải thích nhận định đúng/sai...'
    };
    onChangeExam({
      ...exam,
      part2: [...exam.part2, newQ]
    });
  };

  const handleAddPart3 = () => {
    const newQ: Part3ShortAnswerQuestion = {
      id: `p3_${Date.now()}`,
      number: exam.part3.length + 1,
      stem: 'Tính toán giá trị đại lượng sau:',
      correctAnswer: '10',
      unit: '',
      explanation: 'Các bước tính toán chi tiết...'
    };
    onChangeExam({
      ...exam,
      part3: [...exam.part3, newQ]
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {exam.title}
            </h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Lớp {exam.grade}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Môn {subjectLabel} • Mã đề: {exam.examCode} • Thời lượng: {exam.durationMinutes} phút • Năm học: {exam.schoolYear}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {showExplanation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showExplanation ? 'Ẩn Lời giải' : 'Hiện Lời giải'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Đã sao chép' : 'Sao chép văn bản'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải Word (.doc)</span>
          </button>
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('part1')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'part1'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Phần I: Trắc nghiệm 4 Lựa chọn ({exam.part1.length} câu)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('part2')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'part2'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Phần II: Đúng / Sai 4 ý ({exam.part2.length} câu)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('part3')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'part3'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Phần III: Trả lời ngắn ({exam.part3.length} câu)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ml-auto ${
            activeTab === 'preview'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Toàn bộ đề thi
        </button>
      </div>

      {/* Tab 1: Multiple Choice */}
      {activeTab === 'part1' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Thí sinh chọn 1 phương án đúng duy nhất trong 4 phương án A, B, C, D.
            </span>
            <button
              type="button"
              onClick={handleAddPart1}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm câu hỏi Phần I</span>
            </button>
          </div>

          <div className="space-y-3">
            {exam.part1.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white shrink-0 pt-0.5">
                      Câu {q.number}:
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {q.stem}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded shrink-0">
                    Đáp án: {q.correctAnswer}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                  {q.options.map((opt, optIdx) => {
                    const label = String.fromCharCode(65 + optIdx);
                    const isCorrect = label === q.correctAnswer;
                    return (
                      <div
                        key={optIdx}
                        className={`p-2 rounded-lg text-xs font-mono border ${
                          isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="mr-1.5 font-bold">{label}.</span>
                        {opt}
                      </div>
                    );
                  })}
                </div>

                {showExplanation && q.explanation && (
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 pl-6 italic">
                    <span className="font-semibold not-italic text-slate-700 dark:text-slate-300">Hướng dẫn giải: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: True/False */}
      {activeTab === 'part2' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Trong mỗi ý a, b, c, d của từng câu hỏi, thí sinh chọn Đúng (Đ) hoặc Sai (S).
            </span>
            <button
              type="button"
              onClick={handleAddPart2}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm câu hỏi Phần II</span>
            </button>
          </div>

          <div className="space-y-3">
            {exam.part2.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-start gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white shrink-0 pt-0.5">
                    Câu {q.number}:
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {q.stem}
                  </p>
                </div>

                <div className="space-y-1.5 pl-6">
                  {q.statements.map((st) => (
                    <div
                      key={st.subId}
                      className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <span className="text-slate-800 dark:text-slate-200">
                        <strong className="mr-2 uppercase">{st.subId})</strong>
                        {st.text}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded font-bold text-[11px] shrink-0 ml-3 ${
                          st.isCorrect
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {st.isCorrect ? 'ĐÚNG' : 'SAI'}
                      </span>
                    </div>
                  ))}
                </div>

                {showExplanation && q.explanation && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 pl-6 italic">
                    <span className="font-semibold not-italic text-slate-700 dark:text-slate-300">Hướng dẫn giải: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Short Answer */}
      {activeTab === 'part3' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Thí sinh tự tính toán và điền đáp số dạng số thực hoặc nguyên vào ô trả lời.
            </span>
            <button
              type="button"
              onClick={handleAddPart3}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm câu hỏi Phần III</span>
            </button>
          </div>

          <div className="space-y-3">
            {exam.part3.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white shrink-0 pt-0.5">
                      Câu {q.number}:
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {q.stem}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 block">Đáp số chuẩn</span>
                    <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {q.correctAnswer} {q.unit || ''}
                    </span>
                  </div>
                </div>

                {showExplanation && q.explanation && (
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 pl-6 italic">
                    <span className="font-semibold not-italic text-slate-700 dark:text-slate-300">Hướng dẫn giải: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Preview: Full exam view */}
      {activeTab === 'preview' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
          {exportExamToText(exam)}
        </div>
      )}
    </div>
  );
};
