/**
 * @file ReadingSplitEditor.tsx
 * @description Giao diện chia đôi màn hình (Split View) chuyên biệt cho dạng bài Đọc hiểu & Điền khuyết (Reading Comprehension & Cloze Test).
 * Bên trái: Bài đọc / Đoạn văn / Tờ rơi.
 * Bên phải: Hệ thống câu hỏi trắc nghiệm tương ứng.
 */

import React, { useState } from 'react';
import {
  BookOpen, Plus, Trash2, Eye, EyeOff, Sparkles, Check, Copy
} from 'lucide-react';
import { ReadingPassageItem } from '../types';
import { generateClozePassage } from '../utils/englishHelper';

interface ReadingSplitEditorProps {
  initialPassage?: ReadingPassageItem;
  className?: string;
}

const DEFAULT_SAMPLE_READING: ReadingPassageItem = {
  id: 'rd_sample_1',
  title: 'Artificial Intelligence in Modern High School Education',
  wordCount: 220,
  content: `Artificial intelligence (AI) is transforming the way students learn and teachers instruct in high schools worldwide. Rather than replacing human educators, modern AI tools act as intelligent teaching assistants that personalize the educational journey for every learner.

For instance, adaptive learning algorithms can analyze a student's performance in real time. If a learner struggles with complex chemical equations or vector mechanics in physics, the system automatically provides tailored explanations and remedial exercises. This ensures that no student is left behind while allowing advanced learners to progress at their own pace.

However, the widespread integration of AI also raises significant ethical considerations. Educators emphasize that critical thinking, emotional intelligence, and interpersonal communication cannot be replicated by algorithms. Therefore, educational institutions must foster a balanced approach where technological innovation complements human pedagogical values.`,
  questions: [
    {
      id: 'q1',
      questionNumber: 1,
      stem: 'What is the main topic of the passage?',
      options: [
        'How AI tools are personalizing and enhancing high school education',
        'Why human teachers will soon be completely replaced by robots',
        'The financial cost of purchasing computers for schools',
        'Strict government regulations regarding classroom software'
      ],
      correctAnswer: 'A',
      explanation: 'Đoạn văn chủ yếu phân tích cách AI cá nhân hóa và hỗ trợ học tập cho học sinh phổ thông.'
    },
    {
      id: 'q2',
      questionNumber: 2,
      stem: 'The word "tailored" in paragraph 2 is closest in meaning to:',
      options: ['customized', 'expensive', 'traditional', 'complicated'],
      correctAnswer: 'A',
      explanation: 'Từ "tailored" có nghĩa là được may đo, thiết kế riêng phù hợp = customized.'
    },
    {
      id: 'q3',
      questionNumber: 3,
      stem: 'According to the passage, which quality CANNOT be replicated by algorithms?',
      options: [
        'Emotional intelligence and critical thinking',
        'Calculating arithmetic problems',
        'Translating foreign language sentences',
        'Storing vast databases of digital textbooks'
      ],
      correctAnswer: 'A',
      explanation: 'Đoạn cuối nêu rõ: "critical thinking, emotional intelligence, and interpersonal communication cannot be replicated by algorithms".'
    }
  ]
};

export const ReadingSplitEditor: React.FC<ReadingSplitEditorProps> = ({
  initialPassage = DEFAULT_SAMPLE_READING,
  className = ''
}) => {
  const [passage, setPassage] = useState<ReadingPassageItem>(initialPassage);
  const [showExplanations, setShowExplanations] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [clozeKeywords, setClozeKeywords] = useState('transforming, replace, ethical');
  const [isCopied, setIsCopied] = useState(false);

  const wordsCount = passage.content.trim().split(/\s+/).filter(Boolean).length;

  const handleSelectOption = (questionId: string, optLetter: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optLetter }));
  };

  const handleGenerateCloze = () => {
    const list = clozeKeywords.split(',').map(s => s.trim()).filter(Boolean);
    const { clozeText } = generateClozePassage(passage.content, list);
    setPassage(prev => ({ ...prev, content: clozeText }));
  };

  const handleCopyPassage = async () => {
    await navigator.clipboard.writeText(`${passage.title}\n\n${passage.content}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 ${className}`}>
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Studio Đọc Hiểu & Đoạn Văn Chia Đôi (Split View Reading)
            </h3>
            <p className="text-[11px] text-slate-500">
              Đọc đoạn văn song song với câu hỏi trắc nghiệm theo đúng cấu trúc đề thi Tốt nghiệp THPT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExplanations(!showExplanations)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {showExplanations ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showExplanations ? 'Ẩn giải thích' : 'Hiện giải thích'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPassage}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Đã sao chép' : 'Copy đoạn văn'}</span>
          </button>
        </div>
      </div>

      {/* Auto Cloze Generator Bar */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Tạo chỗ trống Cloze Test:</span>
          <input
            type="text"
            value={clozeKeywords}
            onChange={(e) => setClozeKeywords(e.target.value)}
            placeholder="Các từ khóa cách nhau bằng dấu phẩy"
            className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md flex-1 sm:w-64"
          />
        </div>
        <button
          type="button"
          onClick={handleGenerateCloze}
          className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer shrink-0"
        >
          Sinh chỗ trống (1) _______
        </button>
      </div>

      {/* Split View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
        {/* Left Pane: Reading Passage */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              {passage.title}
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              {wordsCount} words
            </span>
          </div>

          <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line font-serif overflow-y-auto max-h-[480px] pr-2">
            {passage.content}
          </div>
        </div>

        {/* Right Pane: Reading Questions */}
        <div className="space-y-3 overflow-y-auto max-h-[540px] pr-1">
          {passage.questions.map((q) => {
            const userChoice = selectedAnswers[q.id];
            return (
              <div
                key={q.id}
                className="p-3.5 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Question {q.questionNumber}: {q.stem}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const label = String.fromCharCode(65 + optIdx);
                    const isSelected = userChoice === label;
                    const isCorrect = label === q.correctAnswer;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(q.id, label)}
                        className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span>
                          <strong className="mr-1.5">{label}.</strong>
                          {opt}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold">
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {showExplanations && q.explanation && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800 italic">
                    <strong>Giải thích: </strong>{q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
