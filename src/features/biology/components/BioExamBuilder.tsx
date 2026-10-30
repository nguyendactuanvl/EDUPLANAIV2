/**
 * @file BioExamBuilder.tsx
 * @description Trình soạn đề thi môn Sinh học GDPT 2018 (Khung đề 3 phần chuẩn Bộ GD&ĐT).
 * Cho phép chỉnh sửa câu hỏi Trắc nghiệm 4 lựa chọn (Phần I), Trắc nghiệm Đúng/Sai 4 ý (Phần II) và Trả lời ngắn (Phần III).
 * Hỗ trợ xuất định dạng Word (.docx / text) chuẩn quy cách phân đoạn.
 */

import React, { useState } from 'react';
import {
  FileText, Plus, Trash2, Edit3, CheckCircle2, Copy, Check, Download, Layers, HelpCircle
} from 'lucide-react';
import {
  BiologyExamPaper, BiologyMcQuestion, BiologyTfQuestion, BiologySaQuestion
} from '../types/biology.types';

interface BioExamBuilderProps {
  initialExam?: BiologyExamPaper;
  onExamChange?: (exam: BiologyExamPaper) => void;
  className?: string;
}

const DEFAULT_SAMPLE_EXAM: BiologyExamPaper = {
  id: 'BIO_12_GDPT2018',
  title: 'ĐỀ ÔN TẬP KIỂM TRA MÔN SINH HỌC 12 - CHƯƠNG DI TRUYỀN HỌC',
  grade: '12',
  durationMinutes: 50,
  schoolYear: '2025 - 2026',
  part1_mc: [
    {
      id: 'mc_1',
      type: 'mc',
      topic: 'Cơ chế di truyền và biến dị',
      content: 'Trong quá trình nhân đôi ADN, enzim có vai trò tháo xoắn phân tử ADN là:',
      options: ['ADN polimeraza', 'ARN polimeraza', 'Helicase (Enzim tháo xoắn)', 'Ligaza'],
      correctOption: 'C',
      explanation: 'Enzim Helicase cắt các liên kết hydro và tháo xoắn hai mạch đơn của phân tử ADN.'
    },
    {
      id: 'mc_2',
      type: 'mc',
      topic: 'Di truyền liên kết giới tính',
      content: 'Ở người, bệnh máu khó đông do alen lặn $a$ nằm trên NST giới tính $X$ quy định. Bố mẹ bình thường sinh con trai bị bệnh máu khó đông. Kiểu gen của bố mẹ là:',
      options: ['$X^A X^A \\times X^A Y$', '$X^A X^a \\times X^A Y$', '$X^A X^a \\times X^a Y$', '$X^a X^a \\times X^A Y$'],
      correctOption: 'B',
      explanation: 'Con trai bị bệnh ($X^a Y$) nhận $Y$ từ bố ($X^A Y$) và nhận $X^a$ từ mẹ. Do mẹ bình thường nên kiểu gen mẹ là $X^A X^a$.'
    }
  ],
  part2_tf: [
    {
      id: 'tf_1',
      type: 'tf',
      topic: 'Di truyền quần thể - Hardy Weinberg',
      stemContent: 'Cho cấu trúc di truyền của một quần thể thực vật tự phối qua các thế hệ là $P: 0.4\\,AA : 0.4\\,Aa : 0.2\\,aa$. Xét tính đúng/sai của các phát biểu sau:',
      statements: [
        { id: 'a', statement: 'Tần số alen $A$ ở thế hệ $P$ là $0.6$.', isCorrect: true, explanation: '$p(A) = 0.4 + 0.4/2 = 0.6$.' },
        { id: 'b', statement: 'Tỷ lệ kiểu gen dị hợp $Aa$ ở thế hệ $F_1$ là $0.2$.', isCorrect: true, explanation: '$Aa_{F_1} = 0.4 / 2 = 0.2$.' },
        { id: 'c', statement: 'Quần thể trên đạt trạng thái cân bằng di truyền ở thế hệ $P$.', isCorrect: false, explanation: 'Quần thể tự phối có tỷ lệ dị hợp giảm dần qua các thế hệ nên chưa cân bằng.' },
        { id: 'd', statement: 'Tỷ lệ kiểu gen đồng hợp $AA$ ở thế hệ $F_2$ là $0.55$.', isCorrect: true, explanation: '$AA_{F_2} = 0.4 + 0.4 \\times (1 - 1/4)/2 = 0.55$.' }
      ],
      explanation: 'Quần thể tự phối làm tăng tỉ lệ đồng hợp và giảm tỉ lệ dị hợp qua các thế hệ.'
    }
  ],
  part3_sa: [
    {
      id: 'sa_1',
      type: 'sa',
      topic: 'Cấu trúc gen & ADN',
      content: 'Một phân tử ADN có chiều dài $L = 4080\\,\\text{Å}$ và có tổng số $3120$ liên kết hidro. Số nucleotit loại $G$ của gen là bao nhiêu?',
      correctAnswer: '720',
      unit: 'nu',
      explanation: '$N = (4080/3.4) \\times 2 = 2400\\,\\text{nu}$. $H = 2A + 3G = 3120 \\Rightarrow G = 3120 - 2400 = 720\\,\\text{nu}$.'
    }
  ]
};

export const BioExamBuilder: React.FC<BioExamBuilderProps> = ({
  initialExam = DEFAULT_SAMPLE_EXAM,
  onExamChange,
  className = ''
}) => {
  const [exam, setExam] = useState<BiologyExamPaper>(initialExam);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState<'part1' | 'part2' | 'part3' | 'preview'>('part1');

  // Form states cho thêm câu hỏi
  const [newMcContent, setNewMcContent] = useState('');
  const [newMcOptA, setNewMcOptA] = useState('');
  const [newMcOptB, setNewMcOptB] = useState('');
  const [newMcOptC, setNewMcOptC] = useState('');
  const [newMcOptD, setNewMcOptD] = useState('');
  const [newMcCorrect, setNewMcCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [newMcExp, setNewMcExp] = useState('');

  // Form states cho Trắc nghiệm Đúng/Sai
  const [newTfStem, setNewTfStem] = useState('');
  const [newTfA, setNewTfA] = useState('');
  const [newTfAAns, setNewTfAAns] = useState(true);
  const [newTfB, setNewTfB] = useState('');
  const [newTfBAns, setNewTfBAns] = useState(false);
  const [newTfC, setNewTfC] = useState('');
  const [newTfCAns, setNewTfCAns] = useState(true);
  const [newTfD, setNewTfD] = useState('');
  const [newTfDAns, setNewTfDAns] = useState(false);
  const [newTfExp, setNewTfExp] = useState('');

  // Form states cho Trả lời ngắn
  const [newSaContent, setNewSaContent] = useState('');
  const [newSaAns, setNewSaAns] = useState('');
  const [newSaUnit, setNewSaUnit] = useState('nu');
  const [newSaExp, setNewSaExp] = useState('');

  const updateExamState = (next: BiologyExamPaper) => {
    setExam(next);
    if (onExamChange) onExamChange(next);
  };

  // Thêm câu hỏi Trắc nghiệm 4 lựa chọn (Phần I)
  const handleAddMcQuestion = () => {
    if (!newMcContent.trim()) return;
    const newQ: BiologyMcQuestion = {
      id: `mc_${Date.now()}`,
      type: 'mc',
      topic: 'Sinh học THPT',
      content: newMcContent.trim(),
      options: [newMcOptA || 'Phương án A', newMcOptB || 'Phương án B', newMcOptC || 'Phương án C', newMcOptD || 'Phương án D'],
      correctOption: newMcCorrect,
      explanation: newMcExp.trim() || 'Lời giải chi tiết.'
    };

    updateExamState({
      ...exam,
      part1_mc: [...exam.part1_mc, newQ]
    });

    setNewMcContent('');
    setNewMcOptA('');
    setNewMcOptB('');
    setNewMcOptC('');
    setNewMcOptD('');
    setNewMcExp('');
  };

  // Xóa câu hỏi MC
  const handleDeleteMc = (id: string) => {
    updateExamState({
      ...exam,
      part1_mc: exam.part1_mc.filter(q => q.id !== id)
    });
  };

  // Thêm câu hỏi Đúng/Sai (Phần II)
  const handleAddTfQuestion = () => {
    if (!newTfStem.trim()) return;
    const newQ: BiologyTfQuestion = {
      id: `tf_${Date.now()}`,
      type: 'tf',
      topic: 'Sinh học THPT',
      stemContent: newTfStem.trim(),
      statements: [
        { id: 'a', statement: newTfA || 'Mệnh đề a', isCorrect: newTfAAns },
        { id: 'b', statement: newTfB || 'Mệnh đề b', isCorrect: newTfBAns },
        { id: 'c', statement: newTfC || 'Mệnh đề c', isCorrect: newTfCAns },
        { id: 'd', statement: newTfD || 'Mệnh đề d', isCorrect: newTfDAns }
      ],
      explanation: newTfExp.trim() || 'Phân tích tính đúng sai của từng lệnh hỏi.'
    };

    updateExamState({
      ...exam,
      part2_tf: [...exam.part2_tf, newQ]
    });

    setNewTfStem('');
    setNewTfA('');
    setNewTfB('');
    setNewTfC('');
    setNewTfD('');
    setNewTfExp('');
  };

  // Xóa câu hỏi TF
  const handleDeleteTf = (id: string) => {
    updateExamState({
      ...exam,
      part2_tf: exam.part2_tf.filter(q => q.id !== id)
    });
  };

  // Thêm câu hỏi Trả lời ngắn (Phần III)
  const handleAddSaQuestion = () => {
    if (!newSaContent.trim() || !newSaAns.trim()) return;
    const newQ: BiologySaQuestion = {
      id: `sa_${Date.now()}`,
      type: 'sa',
      topic: 'Sinh học THPT',
      content: newSaContent.trim(),
      correctAnswer: newSaAns.trim(),
      unit: newSaUnit.trim(),
      explanation: newSaExp.trim() || 'Các bước tính toán đáp số.'
    };

    updateExamState({
      ...exam,
      part3_sa: [...exam.part3_sa, newQ]
    });

    setNewSaContent('');
    setNewSaAns('');
    setNewSaExp('');
  };

  // Xóa câu hỏi SA
  const handleDeleteSa = (id: string) => {
    updateExamState({
      ...exam,
      part3_sa: exam.part3_sa.filter(q => q.id !== id)
    });
  };

  // Xuất định dạng văn bản Word (.docx / text)
  const generateFormattedWordText = (): string => {
    let output = `${exam.title}\nNĂM HỌC: ${exam.schoolYear} - THỜI GIAN: ${exam.durationMinutes} PHÚT\n\n`;

    output += `==================================================\n`;
    output += `PHẦN I. CÂU HỎI TRẮC NGHIỆM NHIỀU LỰA CHỌN (18 CÂU)\n`;
    output += `Thí sinh chọn một phương án đúng nhất từ A đến D.\n`;
    output += `==================================================\n\n`;

    exam.part1_mc.forEach((q, idx) => {
      output += `Câu ${idx + 1}: ${q.content}\n`;
      q.options.forEach((opt, oIdx) => {
        const letter = String.fromCharCode(65 + oIdx);
        output += `${letter}. ${opt}\n`;
      });
      output += `[Đáp án: ${q.correctOption}] - Lời giải: ${q.explanation}\n\n`;
    });

    output += `==================================================\n`;
    output += `PHẦN II. CÂU HỎI TRẮC NGHIỆM ĐÚNG/SAI (4 CÂU)\n`;
    output += `Thí sinh chọn Đúng hoặc Sai cho mỗi ý a), b), c), d).\n`;
    output += `==================================================\n\n`;

    exam.part2_tf.forEach((q, idx) => {
      output += `Câu ${idx + 1}: ${q.stemContent}\n`;
      q.statements.forEach((st) => {
        output += `${st.id}) ${st.statement} -> ${st.isCorrect ? '[ĐÚNG]' : '[SAI]'}\n`;
      });
      output += `Lời giải chi tiết: ${q.explanation}\n\n`;
    });

    output += `==================================================\n`;
    output += `PHẦN III. CÂU HỎI TRẮC NGHIỆM TRẢ LỜI NGẮN (6 CÂU)\n`;
    output += `Thí sinh điền con số đáp án vào ô trả lời.\n`;
    output += `==================================================\n\n`;

    exam.part3_sa.forEach((q, idx) => {
      output += `Câu ${idx + 1}: ${q.content}\n`;
      output += `[Đáp số: ${q.correctAnswer} ${q.unit || ''}] - Lời giải: ${q.explanation}\n\n`;
    });

    return output;
  };

  const handleCopyWordFormat = () => {
    const text = generateFormattedWordText();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadWordFile = () => {
    const text = generateFormattedWordText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DeThi_SinhHoc_${exam.grade}_GDPT2018.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5 ${className}`}>
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Trình Soạn Đề Thi Môn Sinh Học GDPT 2018 (3 Phần)
            </h3>
            <p className="text-[11px] text-slate-500">
              Phần I: 18 câu MC | Phần II: 4 câu True/False 4 ý | Phần III: 6 câu Trả lời ngắn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyWordFormat}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText ? 'Đã copy văn bản Word!' : 'Sao chép dạng Word'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWordFile}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải file .TXT / Word</span>
          </button>
        </div>
      </div>

      {/* Part Selection Tabs */}
      <div className="flex flex-wrap gap-2 text-xs font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('part1')}
          className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'part1'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Phần I. Trắc nghiệm ABCD ({exam.part1_mc.length} câu)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('part2')}
          className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'part2'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Phần II. Đúng / Sai 4 ý ({exam.part2_tf.length} câu)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('part3')}
          className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'part3'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Phần III. Trả lời ngắn ({exam.part3_sa.length} câu)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'preview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
          }`}
        >
          👁 Xem trước toàn bộ đề
        </button>
      </div>

      {/* TAB PART 1: MC QUESTIONS */}
      {activeTab === 'part1' && (
        <div className="space-y-4">
          
          {/* Add MC Form */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase">
              <Plus className="w-4 h-4 text-emerald-600" />
              Thêm câu hỏi Trắc nghiệm 4 phương án (Phần I)
            </span>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Nội dung câu hỏi (hỗ trợ LaTeX $...$)</label>
              <textarea
                rows={2}
                value={newMcContent}
                onChange={(e) => setNewMcContent(e.target.value)}
                placeholder="VD: Ở người, gen quy định nhóm máu nằm trên NST số bao nhiêu?..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Phương án A</label>
                <input
                  type="text"
                  value={newMcOptA}
                  onChange={(e) => setNewMcOptA(e.target.value)}
                  placeholder="Phương án A"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Phương án B</label>
                <input
                  type="text"
                  value={newMcOptB}
                  onChange={(e) => setNewMcOptB(e.target.value)}
                  placeholder="Phương án B"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Phương án C</label>
                <input
                  type="text"
                  value={newMcOptC}
                  onChange={(e) => setNewMcOptC(e.target.value)}
                  placeholder="Phương án C"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Phương án D</label>
                <input
                  type="text"
                  value={newMcOptD}
                  onChange={(e) => setNewMcOptD(e.target.value)}
                  placeholder="Phương án D"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Đáp án đúng</label>
                <select
                  value={newMcCorrect}
                  onChange={(e) => setNewMcCorrect(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-emerald-800"
                >
                  <option value="A">Đáp án A</option>
                  <option value="B">Đáp án B</option>
                  <option value="C">Đáp án C</option>
                  <option value="D">Đáp án D</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Lời giải chi tiết</label>
                <input
                  type="text"
                  value={newMcExp}
                  onChange={(e) => setNewMcExp(e.target.value)}
                  placeholder="Giải thích vì sao chọn đáp án này..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddMcQuestion}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm câu hỏi vào Phần I</span>
            </button>
          </div>

          {/* List MC Questions */}
          <div className="space-y-3">
            {exam.part1_mc.map((q, idx) => (
              <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs relative">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    Câu {idx + 1}: {q.content}
                  </p>
                  <button
                    onClick={() => handleDeleteMc(q.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                    title="Xóa câu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                  {q.options.map((opt, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const isCorrect = letter === q.correctOption;
                    return (
                      <div key={oIdx} className={`p-2 rounded border ${isCorrect ? 'bg-emerald-100 border-emerald-300 font-bold text-emerald-900' : 'bg-white border-slate-200'}`}>
                        {letter}. {opt}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-emerald-700 italic">💡 {q.explanation}</p>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB PART 2: TRUE / FALSE QUESTIONS */}
      {activeTab === 'part2' && (
        <div className="space-y-4">
          
          {/* Add TF Form */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase">
              <Plus className="w-4 h-4 text-indigo-600" />
              Thêm câu hỏi Trắc nghiệm Đúng/Sai 4 lệnh hỏi (Phần II)
            </span>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Dữ liệu / Đoạn dẫn câu hỏi gốc</label>
              <textarea
                rows={2}
                value={newTfStem}
                onChange={(e) => setNewTfStem(e.target.value)}
                placeholder="VD: Cho sơ đồ phả hệ di truyền tính trạng nhóm máu ABO ở một gia đình..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* 4 Statements Inputs with Radio True/False */}
            <div className="space-y-2 text-xs">
              {/* Ý a */}
              <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg">
                <span className="font-bold text-indigo-700">a)</span>
                <input
                  type="text"
                  value={newTfA}
                  onChange={(e) => setNewTfA(e.target.value)}
                  placeholder="Nội dung ý a)..."
                  className="flex-1 text-xs border-b border-slate-200 focus:outline-none"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="radio" name="tf_a" checked={newTfAAns === true} onChange={() => setNewTfAAns(true)} />
                    <span className="font-bold text-emerald-700">Đúng</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="radio" name="tf_a" checked={newTfAAns === false} onChange={() => setNewTfAAns(false)} />
                    <span className="font-bold text-rose-700">Sai</span>
                  </label>
                </div>
              </div>

              {/* Ý b */}
              <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg">
                <span className="font-bold text-indigo-700">b)</span>
                <input
                  type="text"
                  value={newTfB}
                  onChange={(e) => setNewTfB(e.target.value)}
                  placeholder="Nội dung ý b)..."
                  className="flex-1 text-xs border-b border-slate-200 focus:outline-none"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="radio" name="tf_b" checked={newTfBAns === true} onChange={() => setNewTfBAns(true)} />
                    <span className="font-bold text-emerald-700">Đúng</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="radio" name="tf_b" checked={newTfBAns === false} onChange={() => setNewTfBAns(false)} />
                    <span className="font-bold text-rose-700">Sai</span>
                  </label>
                </div>
              </div>

              {/* Ý c */}
              <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg">
                <span className="font-bold text-indigo-700">c)</span>
                <input
                  type="text"
                  value={newTfC}
                  onChange={(e) => setNewTfC(e.target.value)}
                  placeholder="Nội dung ý c)..."
                  className="flex-1 text-xs border-b border-slate-200 focus:outline-none"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="radio" name="tf_c" checked={newTfCAns === true} onChange={() => setNewTfCAns(true)} />
                    <span className="font-bold text-emerald-700">Đúng</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="radio" name="tf_c" checked={newTfCAns === false} onChange={() => setNewTfCAns(false)} />
                    <span className="font-bold text-rose-700">Sai</span>
                  </label>
                </div>
              </div>

              {/* Ý d */}
              <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg">
                <span className="font-bold text-indigo-700">d)</span>
                <input
                  type="text"
                  value={newTfD}
                  onChange={(e) => setNewTfD(e.target.value)}
                  placeholder="Nội dung ý d)..."
                  className="flex-1 text-xs border-b border-slate-200 focus:outline-none"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="radio" name="tf_d" checked={newTfDAns === true} onChange={() => setNewTfDAns(true)} />
                    <span className="font-bold text-emerald-700">Đúng</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="radio" name="tf_d" checked={newTfDAns === false} onChange={() => setNewTfDAns(false)} />
                    <span className="font-bold text-rose-700">Sai</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Lời giải chi tiết cho 4 ý</label>
              <input
                type="text"
                value={newTfExp}
                onChange={(e) => setNewTfExp(e.target.value)}
                placeholder="Giải thích lý do từng mệnh đề a, b, c, d là Đúng hoặc Sai..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
              />
            </div>

            <button
              type="button"
              onClick={handleAddTfQuestion}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm câu hỏi Đúng/Sai vào Phần II</span>
            </button>
          </div>

          {/* List TF Questions */}
          <div className="space-y-3">
            {exam.part2_tf.map((q, idx) => (
              <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    Câu {idx + 1}: {q.stemContent}
                  </p>
                  <button onClick={() => handleDeleteTf(q.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {q.statements.map((st) => (
                    <div key={st.id} className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200">
                      <span><strong>{st.id})</strong> {st.statement}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${st.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {st.isCorrect ? 'ĐÚNG' : 'SAI'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-indigo-700 italic">💡 {q.explanation}</p>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB PART 3: SHORT ANSWER QUESTIONS */}
      {activeTab === 'part3' && (
        <div className="space-y-4">
          
          {/* Add SA Form */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase">
              <Plus className="w-4 h-4 text-amber-600" />
              Thêm câu hỏi Trả lời ngắn / Điền số (Phần III)
            </span>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Nội dung câu hỏi tính toán</label>
              <textarea
                rows={2}
                value={newSaContent}
                onChange={(e) => setNewSaContent(e.target.value)}
                placeholder="VD: Một gen có chiều dài L = 4080 Å có 3120 liên kết hidro. Số nu loại G là bao nhiêu?"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Con số đáp án chính xác</label>
                <input
                  type="text"
                  value={newSaAns}
                  onChange={(e) => setNewSaAns(e.target.value)}
                  placeholder="VD: 720 hoặc 0.35"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold font-mono text-amber-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Đơn vị (Tùy chọn)</label>
                <input
                  type="text"
                  value={newSaUnit}
                  onChange={(e) => setNewSaUnit(e.target.value)}
                  placeholder="VD: nu, %, liên kết"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Hướng dẫn tính chi tiết</label>
              <input
                type="text"
                value={newSaExp}
                onChange={(e) => setNewSaExp(e.target.value)}
                placeholder="Nêu rõ các công thức áp dụng..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
              />
            </div>

            <button
              type="button"
              onClick={handleAddSaQuestion}
              className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm câu hỏi Trả lời ngắn vào Phần III</span>
            </button>
          </div>

          {/* List SA Questions */}
          <div className="space-y-3">
            {exam.part3_sa.map((q, idx) => (
              <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    Câu {idx + 1}: {q.content}
                  </p>
                  <button onClick={() => handleDeleteSa(q.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Đáp số:</span>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold font-mono rounded">
                    {q.correctAnswer} {q.unit || ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 italic">💡 {q.explanation}</p>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB PREVIEW: COMPLETE EXAM VIEW */}
      {activeTab === 'preview' && (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-5 text-xs">
          <div className="text-center border-b border-slate-200 pb-3 space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 uppercase">
              {exam.title}
            </h3>
            <p className="text-[11px] text-emerald-800 font-bold">
              Năm học: {exam.schoolYear} | Thời gian làm bài: {exam.durationMinutes} phút
            </p>
          </div>

          {/* Part I */}
          <div className="space-y-3">
            <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded block uppercase">
              PHẦN I. Câu hỏi trắc nghiệm nhiều lựa chọn ({exam.part1_mc.length} câu)
            </span>
            {exam.part1_mc.map((q, idx) => (
              <div key={q.id} className="p-2.5 bg-white rounded border border-slate-200 space-y-1">
                <p className="font-bold">Câu {idx + 1}: {q.content}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[11px]">
                  {q.options.map((opt, oIdx) => (
                    <span key={oIdx}><strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Part II */}
          <div className="space-y-3">
            <span className="font-bold text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded block uppercase">
              PHẦN II. Câu hỏi trắc nghiệm Đúng/Sai ({exam.part2_tf.length} câu)
            </span>
            {exam.part2_tf.map((q, idx) => (
              <div key={q.id} className="p-2.5 bg-white rounded border border-slate-200 space-y-1">
                <p className="font-bold">Câu {idx + 1}: {q.stemContent}</p>
                {q.statements.map((st) => (
                  <p key={st.id} className="text-[11px]">
                    <strong>{st.id})</strong> {st.statement} -&gt; <strong>[{st.isCorrect ? 'ĐÚNG' : 'SAI'}]</strong>
                  </p>
                ))}
              </div>
            ))}
          </div>

          {/* Part III */}
          <div className="space-y-3">
            <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded block uppercase">
              PHẦN III. Câu hỏi trắc nghiệm trả lời ngắn ({exam.part3_sa.length} câu)
            </span>
            {exam.part3_sa.map((q, idx) => (
              <div key={q.id} className="p-2.5 bg-white rounded border border-slate-200 space-y-1">
                <p className="font-bold">Câu {idx + 1}: {q.content}</p>
                <p className="text-[11px] font-bold text-amber-900">
                  Đáp số: {q.correctAnswer} {q.unit || ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
