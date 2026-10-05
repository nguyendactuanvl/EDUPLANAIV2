import React, { useState, useEffect } from 'react';
import { GeoGebraDrawer } from './math-tools/GeoGebraDrawer';
import { ScientificCalculatorModal } from './math-tools/ScientificCalculatorModal';
import { MarkdownRenderer } from './MarkdownRenderer';
import { apiFetch } from '../lib/apiFetch';
import { QuestionVisualizerPanel } from './math-tools/QuestionVisualizerPanel';
import { TrendingUp, BarChart2, Box, BarChart3, Calculator, ImagePlus, Link2 } from 'lucide-react';

export interface QuestionData {
  id?: number;
  type?: 'mc' | 'tf' | 'sa' | 'essay';
  content?: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  tfStatements?: { statement: string; correct: boolean }[];
  level?: string;
  topic?: string;
  subtopic?: string;
  solution?: string;
  explanation?: string;
  imageUrl?: string;
  hasFigure?: boolean;
}

interface QuestionEditModalProps {
  isOpen: boolean;
  question: QuestionData | null;
  questionNumber?: number;
  subject?: string;
  grade?: string | number;
  onClose: () => void;
  onSave: (updated: QuestionData) => void;
}

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  isOpen,
  question,
  questionNumber = 1,
  subject = 'Toán',
  grade = '12',
  onClose,
  onSave
}) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'mc' | 'tf' | 'sa' | 'essay'>('mc');
  const [level, setLevel] = useState('Thông hiểu');
  const [topic, setTopic] = useState('Hàm số và đồ thị');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [tfStatements, setTfStatements] = useState<{ statement: string; correct: boolean }[]>([
    { statement: '', correct: true },
    { statement: '', correct: false },
    { statement: '', correct: true },
    { statement: '', correct: false }
  ]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [solution, setSolution] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [activeVisualizer, setActiveVisualizer] = useState<{
    tab: 'bbt' | 'graph' | 'geometry3d' | 'statistics';
    target: 'content' | 'solution';
  } | null>(null);
  const [showGeoGebra, setShowGeoGebra] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const handleInsertSnippet = (target: 'content' | 'solution', snippet: string) => {
    if (target === 'content') {
      setContent(prev => (prev ? `${prev}\n\n${snippet}` : snippet));
    } else {
      setSolution(prev => (prev ? `${prev}\n\n${snippet}` : snippet));
    }
  };

  useEffect(() => {
    if (question) {
      setContent(question.content || '');
      setType(question.type || 'mc');
      setLevel(question.level || 'Thông hiểu');
      setTopic(question.topic || 'Hàm số và đồ thị');
      setOptions(question.options && question.options.length === 4 ? [...question.options] : ['', '', '', '']);
      setCorrectOptionIndex(typeof question.correctOptionIndex === 'number' ? question.correctOptionIndex : 0);
      setTfStatements(
        question.tfStatements && question.tfStatements.length === 4
          ? question.tfStatements.map(st => ({ ...st }))
          : [
              { statement: '', correct: true },
              { statement: '', correct: false },
              { statement: '', correct: true },
              { statement: '', correct: false }
            ]
      );
      setCorrectAnswer(question.correctAnswer || '');
      setSolution(question.solution || question.explanation || '');
      setActiveTab('edit');
      setAiStatus('');
    }
  }, [question, isOpen]);

  if (!isOpen || !question) return null;

  // Insert BBT template
  const insertBbtTemplate = (variant: 'cubic' | 'quartic' | 'rational') => {
    let bbt = '';
    if (variant === 'cubic') {
      bbt = `\n\n| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |\n|---|---|---|---|---|---|---|---|\n| $y'$ | | $+$ | $0$ | $-$ | $0$ | $+$ |\n| $y$ | $-\\infty$ | $\\nearrow$ | $4$ | $\\searrow$ | $-1$ | $\\nearrow$ | $+\\infty$ |`;
    } else if (variant === 'quartic') {
      bbt = `\n\n| $x$ | $-\\infty$ | | $-2$ | | $0$ | | $2$ | | $+\\infty$ |\n|---|---|---|---|---|---|---|---|---|---|\n| $y'$ | | $-$ | $0$ | $+$ | $0$ | $-$ | $0$ | $+$ | |\n| $y$ | $+\\infty$ | $\\searrow$ | $-3$ | $\\nearrow$ | $1$ | $\\searrow$ | $-3$ | $\\nearrow$ | $+\\infty$ |`;
    } else {
      bbt = `\n\n| $x$ | $-\\infty$ | | $1$ | | $+\\infty$ |\n|---|---|---|---|---|---|\n| $y'$ | | $-$ | $\\|$ | $-$ | |\n| $y$ | $2$ | $\\searrow$ | $-\\infty \\| +\\infty$ | $\\searrow$ | $2$ |`;
    }
    setContent(prev => prev + bbt);
  };

  // Quick LaTeX snippet insertion
  const insertLatex = (snippet: string) => {
    setContent(prev => prev + ' ' + snippet + ' ');
  };

  // AI Helper: Fix BBT, Regenerate, or Replace
  const handleAiAction = async (mode: 'fix_bbt' | 'regenerate' | 'replace_similar') => {
    setIsAiProcessing(true);
    if (mode === 'fix_bbt') {
      setAiStatus('AI đang đọc đề và tự động vẽ Bảng Biến Thiên chuẩn xác...');
    } else if (mode === 'regenerate') {
      setAiStatus('AI đang tạo lại câu hỏi chuẩn cấu trúc kèm lời giải chi tiết...');
    } else {
      setAiStatus('AI đang sinh một câu hỏi tương đương mới thay thế...');
    }

    try {
      const currentQ: QuestionData = {
        ...question,
        content,
        type,
        level,
        topic,
        options,
        correctOptionIndex,
        tfStatements,
        correctAnswer,
        solution
      };

      const res = await apiFetch('/api/fix-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ,
          mode,
          subject,
          grade
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.question) {
          const q = data.question;
          if (q.content) setContent(q.content);
          if (q.options && q.options.length === 4) setOptions(q.options);
          if (typeof q.correctOptionIndex === 'number') setCorrectOptionIndex(q.correctOptionIndex);
          if (q.correctAnswer) setCorrectAnswer(q.correctAnswer);
          if (q.tfStatements && q.tfStatements.length === 4) setTfStatements(q.tfStatements);
          if (q.solution) setSolution(q.solution);
          if (q.level) setLevel(q.level);
          setAiStatus('Hoàn thành!');
          setTimeout(() => setAiStatus(''), 2000);
          return;
        }
      }
      throw new Error('Máy chủ phản hồi không thành công');
    } catch (err: any) {
      console.warn('AI action error:', err);
      // Fallback local insertion if BBT was requested
      if (mode === 'fix_bbt' && !content.includes('|')) {
        insertBbtTemplate('cubic');
        setAiStatus('Đã chèn Bảng biến thiên mẫu!');
      } else {
        alert('Không thể kết nối AI: ' + (err?.message || 'Vui lòng thử lại.'));
      }
      setTimeout(() => setAiStatus(''), 2000);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSave = () => {
    if (!content.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi.');
      return;
    }

    // Robust image URL / base64 extraction
    let extractedImageUrl = question.imageUrl;
    let hasFig = question.hasFigure || false;

    if (content.includes('![Hình vẽ](')) {
      try {
        const parts = content.split('![Hình vẽ](');
        if (parts[1]) {
          extractedImageUrl = parts[1].split(')')[0];
          hasFig = true;
        }
      } catch (e) {
        console.error("Lỗi trích xuất ảnh ![Hình vẽ]:", e);
      }
    } else if (content.includes('src="')) {
      try {
        const match = content.match(/src=["']([^"']+)["']/);
        if (match && match[1]) {
          extractedImageUrl = match[1];
          hasFig = true;
        }
      } catch (e) {
        console.error("Lỗi trích xuất ảnh src=:", e);
      }
    } else if (content.includes('data:image/')) {
      try {
        const match = content.match(/(data:image\/[a-zA-Z+]+;base64,[a-zA-Z0-9+/=]+)/);
        if (match && match[1]) {
          extractedImageUrl = match[1];
          hasFig = true;
        }
      } catch (e) {
        console.error("Lỗi trích xuất ảnh base64:", e);
      }
    }

    const updated: QuestionData = {
      ...question,
      content,
      type,
      level,
      topic,
      options: type === 'mc' ? options : undefined,
      correctOptionIndex: type === 'mc' ? correctOptionIndex : undefined,
      correctAnswer: type === 'mc' ? String.fromCharCode(65 + correctOptionIndex) : correctAnswer,
      tfStatements: type === 'tf' ? tfStatements : undefined,
      solution,
      explanation: solution,
      imageUrl: extractedImageUrl,
      hasFigure: hasFig
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-linear-to-r from-blue-700 via-indigo-700 to-emerald-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/15 rounded-lg text-lg">✏️</span>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>Chỉnh Sửa Câu {questionNumber}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-normal">
                  {type === 'mc' ? 'Trắc nghiệm 4 lựa chọn' : type === 'tf' ? 'Đúng/Sai 4 ý' : type === 'sa' ? 'Trả lời ngắn' : 'Tự luận'}
                </span>
              </h3>
              <p className="text-xs text-blue-100">
                Chỉnh sửa nội dung, chèn Bảng biến thiên, sửa đáp án và lời giải chi tiết
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-white/10 p-0.5 rounded-lg border border-white/20 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'edit' ? 'bg-white text-blue-900 shadow-xs' : 'text-white hover:bg-white/10'}`}
              >
                Soạn thảo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${activeTab === 'preview' ? 'bg-white text-blue-900 shadow-xs' : 'text-white hover:bg-white/10'}`}
              >
                Xem trước
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
              title="Đóng"
            >
              ✕
            </button>
          </div>
        </div>

        {/* AI Action Status Banner */}
        {aiStatus && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs font-semibold text-amber-900 flex items-center gap-2">
            <span className="animate-spin text-sm">⏳</span>
            <span>{aiStatus}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Quick AI Assist Bar */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
              <span>🤖 Trợ lý AI:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={isAiProcessing}
                onClick={() => handleAiAction('fix_bbt')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Tự động nhận diện hàm số trong câu hỏi và vẽ bảng biến thiên Markdown chuẩn SVG"
              >
                <span>✨ AI Vẽ Bảng Biến Thiên</span>
              </button>
              <button
                type="button"
                disabled={isAiProcessing}
                onClick={() => handleAiAction('regenerate')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Tạo lại câu này với đồ thị/BBT và lời giải chi tiết từng bước"
              >
                <span>⚡ AI Tạo Lại Đúng Câu Này</span>
              </button>
              <button
                type="button"
                disabled={isAiProcessing}
                onClick={() => handleAiAction('replace_similar')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Sinh 1 câu hỏi tương đương mới toanh cùng dạng toán và độ khó"
              >
                <span>🔄 Đổi Câu Tương Đương</span>
              </button>
            </div>

            {/* Direct Tool integration buttons: BBT, Graph, 3D, Statistics, GeoGebra, Calculator */}
            <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3 w-full sm:w-auto flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('questionImageUploader');
                  if (input) (input as any).click();
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs flex items-center gap-1 cursor-pointer transition-colors bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300"
                title="Tải ảnh hoặc đồ thị lên từ máy tính (Sơ đồ, đồ thị hàm số, hình vẽ hình học...)"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Chèn ảnh/Đồ thị</span>
              </button>
              <input
                type="file"
                id="questionImageUploader"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64 = reader.result as string;
                      setContent(prev => `${prev}\n\n![Hình vẽ](${base64})`);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const url = prompt("Vui lòng nhập đường link hình ảnh (URL):");
                  if (url && url.trim()) {
                    setContent(prev => `${prev}\n\n![Hình vẽ](${url.trim()})`);
                  }
                }}
                className="px-2 py-1 text-xs font-bold rounded-lg border shadow-2xs flex items-center gap-1 cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300"
                title="Chèn hình vẽ thông qua liên kết ảnh trực tiếp"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Nhập URL ảnh</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGeoGebra(true)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs flex items-center gap-1 cursor-pointer transition-colors bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-300"
                title="Mở GeoGebra vẽ hình"
              >
                <span>📐 GeoGebra</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCalculator(true)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs flex items-center gap-1 cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                title="Mở máy tính Casio fx-580VN X"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Máy tính</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveVisualizer(prev => prev?.tab === 'bbt' ? null : { tab: 'bbt', target: 'content' })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs flex items-center gap-1 cursor-pointer transition-colors ${
                  activeVisualizer?.tab === 'bbt'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
                title="Mở Module Bảng biến thiên (BBT): Khảo sát hàm số, tinh chỉnh và chèn vào câu hỏi/lời giải"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>📈 BBT</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveVisualizer(prev => prev?.tab === 'graph' ? null : { tab: 'graph', target: 'content' })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs flex items-center gap-1 cursor-pointer transition-colors ${
                  activeVisualizer?.tab === 'graph'
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300'
                }`}
                title="Mở Module Đồ thị: Khảo sát đồ thị tương tác, điều chỉnh hệ số và chèn vào câu hỏi/lời giải"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>📊 Đồ thị</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveVisualizer(prev => prev?.tab === 'geometry3d' ? null : { tab: 'geometry3d', target: 'content' })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs flex items-center gap-1 cursor-pointer transition-colors ${
                  activeVisualizer?.tab === 'geometry3d'
                    ? 'bg-purple-600 text-white border-purple-700'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300'
                }`}
                title="Mở Module Hình không gian 3D: Chóp, Lăng trụ, Hộp, Nón, Trụ, Cầu"
              >
                <Box className="w-3.5 h-3.5" />
                <span>📦 Hình 3D</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveVisualizer(prev => prev?.tab === 'statistics' ? null : { tab: 'statistics', target: 'content' })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs flex items-center gap-1 cursor-pointer transition-colors ${
                  activeVisualizer?.tab === 'statistics'
                    ? 'bg-amber-600 text-white border-amber-700'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                }`}
                title="Mở Module Thống kê: Biểu đồ đoạn thẳng, cột, ghép nhóm, bảng tần số"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>📉 Thống kê</span>
              </button>
            </div>
          </div>

          {showGeoGebra && (
            <GeoGebraDrawer
              onInsertImage={(base64) => {
                setContent(prev => `${prev}\n\n![Hình vẽ](${base64})`);
                // Assume the question has an `imageUrl` field that can be updated.
                // The current interface `QuestionData` doesn't have it, but the requirement implies it.
                // I might need to update the interface `QuestionData`.
                // Actually, I will check the requirement again.
                // "tự động gán ảnh vào trường imageUrl và bật hasFigure: true cho câu hỏi đó."
                // I will add these fields to `updated` object in `handleSave`.
                setShowGeoGebra(false);
              }}
              onClose={() => setShowGeoGebra(false)}
            />
          )}

          {showCalculator && (
            <ScientificCalculatorModal onClose={() => setShowCalculator(false)} />
          )}

          {/* Integrated BBT & Graph Visualizer Panel */}
          {activeVisualizer && (
            <div className="my-2">
              <QuestionVisualizerPanel
                questionNumber={questionNumber}
                questionContent={content}
                solutionContent={solution}
                defaultTab={activeVisualizer.tab}
                defaultTarget={activeVisualizer.target}
                onInsertSnippet={handleInsertSnippet}
                onClose={() => setActiveVisualizer(null)}
              />
            </div>
          )}

          {activeTab === 'edit' ? (
            <>
              {/* Type and Level Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dạng thức câu hỏi:</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="mc">Phần I: Trắc nghiệm 4 lựa chọn (mc)</option>
                    <option value="tf">Phần II: Đúng / Sai 4 ý (tf)</option>
                    <option value="sa">Phần III: Trả lời ngắn (sa)</option>
                    <option value="essay">Phần IV: Tự luận (essay)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mức độ nhận thức:</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Nhận biết">Nhận biết</option>
                    <option value="Thông hiểu">Thông hiểu</option>
                    <option value="Vận dụng">Vận dụng</option>
                    <option value="Vận dụng cao">Vận dụng cao</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chủ đề kiến thức:</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="VD: Hàm số, Hình không gian..."
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Question Content */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Nội dung câu hỏi (hỗ trợ công thức $...$ và Bảng biến thiên):</span>
                  </label>
                  
                  {/* Quick BBT insert buttons */}
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    <span className="text-slate-500 font-medium">Chèn BBT mẫu:</span>
                    <button
                      type="button"
                      onClick={() => insertBbtTemplate('cubic')}
                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-medium cursor-pointer"
                      title="Chèn bảng biến thiên hàm bậc 3"
                    >
                      Bậc 3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertBbtTemplate('quartic')}
                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-medium cursor-pointer"
                      title="Chèn bảng biến thiên hàm bậc 4 trùng phương"
                    >
                      Trùng phương
                    </button>
                    <button
                      type="button"
                      onClick={() => insertBbtTemplate('rational')}
                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-medium cursor-pointer"
                      title="Chèn bảng biến thiên hàm phân thức có tiệm cận"
                    >
                      Phân thức
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setActiveVisualizer({ tab: 'geometry3d', target: 'content' })}
                      className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-md font-medium cursor-pointer"
                      title="Mở Module vẽ Hình không gian 3D chèn vào câu hỏi"
                    >
                      + Hình 3D
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVisualizer({ tab: 'statistics', target: 'content' })}
                      className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-md font-medium cursor-pointer"
                      title="Mở Module vẽ Biểu đồ & Bảng Thống kê chèn vào câu hỏi"
                    >
                      + Thống kê
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => insertLatex('\\frac{a}{b}')}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono"
                    >
                      \frac
                    </button>
                    <button
                      type="button"
                      onClick={() => insertLatex('\\sqrt{x}')}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono"
                    >
                      \sqrt
                    </button>
                    <button
                      type="button"
                      onClick={() => insertLatex('\\infty')}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono"
                    >
                      \infty
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                  placeholder="Nhập nội dung câu hỏi kèm công thức LaTeX ($...$) và bảng biến thiên dạng bảng Markdown..."
                />
              </div>

              {/* Answers & Options based on type */}
              {type === 'mc' && (
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>4 Phương án trắc nghiệm:</span>
                    <span className="text-emerald-700 font-normal">Chọn radio tròn để đặt làm đáp án đúng</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {options.map((opt, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isCorrect = correctOptionIndex === oIdx;
                      return (
                        <div
                          key={oIdx}
                          className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${isCorrect ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-200'}`}
                        >
                          <label className="flex items-center gap-1.5 cursor-pointer pt-1 shrink-0">
                            <input
                              type="radio"
                              name="mc_correct"
                              checked={isCorrect}
                              onChange={() => setCorrectOptionIndex(oIdx)}
                              className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="font-bold text-xs">{letter}.</span>
                          </label>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...options];
                              newOpts[oIdx] = e.target.value;
                              setOptions(newOpts);
                            }}
                            placeholder={`Nội dung phương án ${letter}...`}
                            className="flex-1 text-xs border border-slate-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {type === 'tf' && (
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>4 Mệnh đề Đúng / Sai:</span>
                    <span className="text-slate-500 font-normal">Đánh dấu Đúng (Đ) hoặc Sai (S) cho từng mệnh đề</span>
                  </div>
                  <div className="space-y-2">
                    {tfStatements.map((st, sIdx) => {
                      const letter = ['a)', 'b)', 'c)', 'd)'][sIdx];
                      return (
                        <div key={sIdx} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg">
                          <span className="font-bold text-xs w-6 shrink-0">{letter}</span>
                          <input
                            type="text"
                            value={st.statement}
                            onChange={(e) => {
                              const newStmts = [...tfStatements];
                              newStmts[sIdx].statement = e.target.value;
                              setTfStatements(newStmts);
                            }}
                            placeholder={`Mệnh đề ${letter}...`}
                            className="flex-1 text-xs border border-slate-300 rounded-md p-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newStmts = [...tfStatements];
                              newStmts[sIdx].correct = !newStmts[sIdx].correct;
                              setTfStatements(newStmts);
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-md shrink-0 transition-colors cursor-pointer ${
                              st.correct ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                            }`}
                          >
                            {st.correct ? 'ĐÚNG' : 'SAI'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {type === 'sa' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Đáp án câu trả lời ngắn (Một số cụ thể tối đa 4 ký tự):
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="VD: 5, -2.5, 12..."
                    className="w-full max-w-xs text-xs font-mono font-bold border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-emerald-800"
                  />
                </div>
              )}

              {type === 'essay' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Hướng dẫn chấm / Tiêu chí đáp án tự luận:
                  </label>
                  <textarea
                    rows={2}
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="Tóm tắt thang điểm và các mốc kết quả chính..."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Solution Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>💡 Lời giải chi tiết từng bước (Bắt buộc giải rõ ràng toán học, không nói chung chung):</span>
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveVisualizer({ tab: 'bbt', target: 'solution' })}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shadow-2xs transition-colors"
                      title="Chèn Bảng biến thiên trực tiếp vào lời giải"
                    >
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      <span>+ BBT vào lời giải</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVisualizer({ tab: 'graph', target: 'solution' })}
                      className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold cursor-pointer flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shadow-2xs transition-colors"
                      title="Chèn Đồ thị trực tiếp vào lời giải"
                    >
                      <BarChart2 className="w-3 h-3 text-blue-600" />
                      <span>+ Đồ thị vào lời giải</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVisualizer({ tab: 'geometry3d', target: 'solution' })}
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold cursor-pointer flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 shadow-2xs transition-colors"
                      title="Chèn Hình không gian 3D trực tiếp vào lời giải"
                    >
                      <Box className="w-3 h-3 text-purple-600" />
                      <span>+ Hình 3D vào lời giải</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVisualizer({ tab: 'statistics', target: 'solution' })}
                      className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shadow-2xs transition-colors"
                      title="Chèn Biểu đồ & Thống kê trực tiếp vào lời giải"
                    >
                      <BarChart3 className="w-3 h-3 text-amber-600" />
                      <span>+ Thống kê vào lời giải</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!solution.trim()) {
                          setSolution(
                            `**Lời giải chi tiết:**\n- **Bước 1 (Tập xác định & đạo hàm):** Hàm số có $D = \\mathbb{R}$. Ta có đạo hàm $y' = ...$\n- **Bước 2 (Giải phương trình $y' = 0$):** Cho $y' = 0 \\Leftrightarrow x = ...$\n- **Bước 3 (Bảng xét dấu / Lập luận):** Dựa vào bảng biến thiên hoặc dấu của $y'$, ta suy ra hàm số đồng biến trên ... và nghịch biến trên ...\n- **Bước 4 (Kết luận):** Do đó ta chọn phương án đúng.`
                          );
                        }
                      }}
                      className="text-[11px] text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      + Khung mẫu
                    </button>
                  </div>
                </div>
                <textarea
                  rows={5}
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                  placeholder="Viết lời giải chi tiết từng bước: đạo hàm, giải phương trình, bảng xét dấu, giải thích tại sao chọn đáp án..."
                />
              </div>
            </>
          ) : (
            /* Live Preview Tab */
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                <span>Câu {questionNumber}</span>
                <span className="text-emerald-700">[{level}]</span>
                <span className="text-slate-500 font-normal">({topic})</span>
              </div>

              {/* Question stem */}
              <div className="text-slate-900 text-sm leading-relaxed">
                <MarkdownRenderer content={content} />
              </div>

              {/* Multiple choice options */}
              {type === 'mc' && options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {options.map((opt, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const isCorrect = correctOptionIndex === oIdx;
                    return (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-1.5 ${
                          isCorrect ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-950' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="font-bold">{letter}.</span>
                        <div className="flex-1">
                          <MarkdownRenderer inline={true} content={opt} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* True/False statements */}
              {type === 'tf' && tfStatements && (
                <div className="space-y-1.5 pt-2">
                  {tfStatements.map((st, sIdx) => (
                    <div key={sIdx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{['a)', 'b)', 'c)', 'd)'][sIdx]}</span>
                        <MarkdownRenderer inline={true} content={st.statement} />
                      </div>
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${st.correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {st.correct ? 'ĐÚNG' : 'SAI'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Short answer */}
              {type === 'sa' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-900">
                  <span>Đáp án ngắn: </span>
                  <span className="font-mono text-sm underline">{correctAnswer || 'Chưa đặt'}</span>
                </div>
              )}

              {/* Solution Preview */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                <div className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                  <span>💡 Lời giải chi tiết:</span>
                </div>
                <div className="text-slate-800 text-xs">
                  <MarkdownRenderer content={solution || 'Chưa có lời giải chi tiết.'} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 italic">
            * Thay đổi sẽ được cập nhật ngay lập tức vào đề thi và các bản xuất file Word.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
