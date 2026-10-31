/**
 * @file EnglishView.tsx
 * @description Màn hình chính của Phân hệ Tiếng Anh THPT GDPT 2018 (English Toolkit).
 */

import React, { useState } from 'react';
import {
  BookOpen, Volume2, FileText, Shuffle, Megaphone, Sparkles, Check
} from 'lucide-react';
import { IPASymbolBar } from './components/IPASymbolBar';
import { ReadingSplitEditor } from './components/ReadingSplitEditor';
import { ExamLayout } from '../shared/components/ExamLayout';
import { StandardExamPaper } from '../shared/types';
import {
  SentenceOrderingProblem, AnnouncementClozeProblem
} from './types';
import {
  createSentenceOrderingOptions, SAMPLE_ANNOUNCEMENT
} from './utils/englishHelper';

// Mẫu câu hỏi Sắp xếp trật tự đoạn văn/bức thư GDPT 2018
const SAMPLE_ORDERING_PROBLEM: SentenceOrderingProblem = {
  id: 'ord_1',
  contextType: 'letter',
  title: 'Arrange the following sentences (a-e) to make a meaningful letter',
  sentences: [
    { id: 'a', text: 'Dear Professor Harrison,' },
    { id: 'b', text: 'I am writing to express my gratitude for your inspiring lecture on environmental conservation yesterday.' },
    { id: 'c', text: 'In particular, your explanation regarding renewable energy solutions opened up new research ideas for my upcoming project.' },
    { id: 'd', text: 'I would be extremely honored if I could meet you during your office hours next Tuesday for some academic advice.' },
    { id: 'e', text: 'Sincerely yours,\nNguyen Van An.' }
  ],
  correctOrder: 'a-b-c-d-e',
  permutations: createSentenceOrderingOptions('a-b-c-d-e'),
  explanation: 'Trật tự chuẩn của một bức thư trang trọng: Lời chào (a) -> Mục đích viết thư cảm ơn (b) -> Chi tiết ấn tượng (c) -> Đề xuất hẹn gặp (d) -> Lời kết trang trọng (e).'
};

// Đề thi Tiếng Anh GDPT 2018 mẫu chuẩn
const SAMPLE_ENGLISH_EXAM: StandardExamPaper = {
  id: 'ENGLISH_GDPT2018_DEMO',
  subjectId: 'english',
  title: 'ĐỀ THI THỬ TỐT NGHIỆP THPT MÔN TIẾNG ANH - CHUẨN ĐỊNH DẠNG MỚI',
  grade: '12',
  durationMinutes: 50,
  schoolYear: '2025 - 2026',
  examCode: 'ENG-301',
  description: 'Đề thi 40 câu trắc nghiệm chuẩn ma trận: Phát âm, Trọng âm, Từ vựng, Sắp xếp câu, Tờ rơi và Đọc hiểu.',
  part1: [
    {
      id: 'ep1_1',
      number: 1,
      stem: 'Mark the letter A, B, C, or D to indicate the word whose underlined part differs from the other three in pronunciation:',
      options: ['plann<u>ed</u>', 'play<u>ed</u>', 'watch<u>ed</u>', 'rain<u>ed</u>'],
      correctAnswer: 'C',
      explanation: 'watched phát âm là /t/, các từ còn lại phát âm là /d/.'
    },
    {
      id: 'ep1_2',
      number: 2,
      stem: 'Mark the letter A, B, C, or D to indicate the word that differs from the other three in the position of primary stress:',
      options: ['ˈstudent', 'ˈteacher', 'beˈgin', 'ˈpencil'],
      correctAnswer: 'C',
      explanation: 'begin có trọng âm rơi vào âm tiết thứ 2, các từ còn lại rơi vào âm tiết thứ 1.'
    },
    {
      id: 'ep1_3',
      number: 3,
      stem: 'If she had studied harder for the national examination, she _______ with flying colors.',
      options: ['would have passed', 'will pass', 'would pass', 'passes'],
      correctAnswer: 'A',
      explanation: 'Câu điều kiện loại 3 diễn tả giả định trái ngược thực tế trong quá khứ: If + S + had + P2, S + would have + P2.'
    },
    {
      id: 'ep1_4',
      number: 4,
      stem: 'Arrange the sentences (a-e) to make a meaningful letter: (a) Dear Sir, (b) I am writing to apply for the volunteer position, (c) I have previous experience in tutoring, (d) I hope to hear from you soon, (e) Yours faithfully.',
      options: ['a-b-c-d-e', 'b-a-c-d-e', 'a-c-b-e-d', 'c-a-b-d-e'],
      correctAnswer: 'A',
      explanation: 'Cấu trúc thư ứng tuyển chuẩn: Salutation (a) -> Purpose (b) -> Experience (c) -> Call to action (d) -> Sign off (e).'
    }
  ],
  part2: [],
  part3: []
};

export const EnglishView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reading' | 'ordering' | 'announcement' | 'exam'>('reading');
  const [exam, setExam] = useState<StandardExamPaper>(SAMPLE_ENGLISH_EXAM);
  const [orderingAnswer, setOrderingAnswer] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Tiếng Anh THPT GDPT 2018 (English Toolkit)
            </h2>
            <p className="text-xs text-slate-500">
              Bàn phím IPA, Studio đọc hiểu chia đôi (Split View), Dạng bài sắp xếp trật tự câu văn & Tờ rơi thông báo
            </p>
          </div>
        </div>
      </div>

      {/* IPA Symbol Keyboard */}
      <IPASymbolBar />

      {/* English Toolkit Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('reading')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'reading'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Studio Đọc Hiểu Chia Đôi (Split View & Cloze Test)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ordering')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'ordering'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Shuffle className="w-4 h-4" />
          <span>2. Dạng Sắp Xếp Trật Tự Câu (a, b, c, d, e)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcement')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'announcement'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>3. Dạng Tờ Rơi / Thông Báo (Announcement/Leaflet)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exam')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'exam'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>4. Soạn Đề Chuẩn Bộ GD&ĐT</span>
        </button>
      </div>

      {/* TAB 1: READING COMPREHENSION SPLIT VIEW */}
      {activeTab === 'reading' && (
        <ReadingSplitEditor />
      )}

      {/* TAB 2: SENTENCE ORDERING STUDIO */}
      {activeTab === 'ordering' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Dạng bài mới GDPT 2018: Sắp xếp các câu văn thành bức thư/hội thoại có nghĩa
            </h3>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
              {SAMPLE_ORDERING_PROBLEM.title}:
            </span>
            <div className="space-y-1.5 pl-2 text-xs text-slate-700 dark:text-slate-300">
              {SAMPLE_ORDERING_PROBLEM.sentences.map(st => (
                <div key={st.id} className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600 uppercase w-4">{st.id}.</span>
                  <span className="whitespace-pre-line">{st.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4 Permutations Options */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Chọn thứ tự đúng:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_ORDERING_PROBLEM.permutations.map((perm, idx) => {
                const label = String.fromCharCode(65 + idx);
                const isCorrect = perm === SAMPLE_ORDERING_PROBLEM.correctOrder;
                const isSelected = orderingAnswer === label;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOrderingAnswer(label)}
                    className={`p-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-800 dark:text-rose-200'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{label}. {perm}</span>
                    {isSelected && (
                      <span className="text-[11px] font-sans">
                        {isCorrect ? 'Chính xác!' : 'Chưa đúng'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {orderingAnswer && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 italic mt-3">
                <strong>Giải thích phương pháp: </strong>
                {SAMPLE_ORDERING_PROBLEM.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ANNOUNCEMENT / LEAFLET */}
      {activeTab === 'announcement' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Dạng bài mới GDPT 2018: Điền khuyết vào tờ rơi / thông báo (Announcement/Leaflet)
            </h3>
          </div>

          <div className="p-4 bg-amber-50/50 dark:bg-slate-800/80 rounded-xl border border-amber-200 dark:border-slate-700 space-y-3">
            <div className="text-center pb-2 border-b border-amber-200 dark:border-slate-700">
              <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider">
                ★ {SAMPLE_ANNOUNCEMENT.title} ★
              </span>
            </div>
            <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line font-sans">
              {SAMPLE_ANNOUNCEMENT.rawText}
            </div>
          </div>

          {/* Questions for the Announcement */}
          <div className="space-y-3 pt-2">
            {SAMPLE_ANNOUNCEMENT.questions.map((q) => (
              <div key={q.blankNumber} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Câu hỏi chỗ trống ({q.blankNumber}):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const label = String.fromCharCode(65 + optIdx);
                    const isCorrect = label === q.correctAnswer;
                    return (
                      <div
                        key={optIdx}
                        className={`p-2 rounded-lg border text-center font-mono ${
                          isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700'
                        }`}
                      >
                        {label}. {opt}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  <strong>Giải thích: </strong>{q.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: EXAM LAYOUT */}
      {activeTab === 'exam' && (
        <ExamLayout
          exam={exam}
          onChangeExam={setExam}
          subjectLabel="Tiếng Anh"
          accentColorClass="indigo"
        />
      )}
    </div>
  );
};
