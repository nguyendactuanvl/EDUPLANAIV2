/**
 * @file PhysicsExamBuilder.tsx
 * @description Trình soạn đề thi môn Vật lý GDPT 2018 (Khung đề 3 phần chuẩn Bộ GD&ĐT).
 * Cho phép chỉnh sửa câu hỏi Trắc nghiệm 4 lựa chọn (Phần I), Trắc nghiệm Đúng/Sai 4 ý (Phần II) và Trả lời ngắn - điền số/đơn vị (Phần III).
 * Xuất định dạng Word (.docx / text) chuẩn quy cách phân đoạn.
 */

import React, { useState } from 'react';
import {
  FileText, Plus, Trash2, Check, Copy, Download, Zap
} from 'lucide-react';
import {
  PhysicsExamPaper, PhysicsMcQuestion, PhysicsTfQuestion, PhysicsSaQuestion
} from '../types/physics.types';

interface PhysicsExamBuilderProps {
  initialExam?: PhysicsExamPaper;
  onExamChange?: (exam: PhysicsExamPaper) => void;
  className?: string;
}

const DEFAULT_SAMPLE_PHYSICS_EXAM: PhysicsExamPaper = {
  id: 'PHYSICS_12_GDPT2018',
  title: 'ĐỀ ÔN TẬP KIỂM TRA MÔN VẬT LÝ 12 - DAO ĐỘNG & ĐIỆN XOAY CHIỀU',
  grade: '12',
  durationMinutes: 50,
  schoolYear: '2025 - 2026',
  part1_mc: [
    {
      id: 'mc_p1',
      type: 'mc',
      topic: 'Dao động điều hòa',
      content: 'Một vật dao động điều hòa theo phương trình $x = 10\\cos(2\\pi t + \\pi/3)\\,\\text{cm}$. Biên độ dao động của vật là:',
      options: ['$10\\,\\text{cm}$', '$2\\pi\\,\\text{cm}$', '$\\pi/3\\,\\text{cm}$', '$20\\,\\text{cm}$'],
      correctOption: 'A',
      explanation: 'So sánh với phương trình tổng quát $x = A\\cos(\\omega t + \\varphi)$, ta có biên độ $A = 10\\,\\text{cm}$.'
    },
    {
      id: 'mc_p2',
      type: 'mc',
      topic: 'Mạch điện xoay chiều',
      content: 'Đặt điện áp xoay chiều $u = 220\\sqrt{2}\\cos(100\\pi t)\\,\\text{V}$ vào hai đầu đoạn mạch RLC nối tiếp. Điện áp hiệu dụng giữa hai đầu đoạn mạch là:',
      options: ['$220\\sqrt{2}\\,\\text{V}$', '$220\\,\\text{V}$', '$100\\,\\text{V}$', '$440\\,\\text{V}$'],
      correctOption: 'B',
      explanation: 'Điện áp hiệu dụng $U = \\frac{U_0}{\\sqrt{2}} = \\frac{220\\sqrt{2}}{\\sqrt{2}} = 220\\,\\text{V}$.'
    }
  ],
  part2_tf: [
    {
      id: 'tf_p1',
      type: 'tf',
      topic: 'Đồ thị dao động & Sóng cơ',
      stemContent: 'Một con lắc đơn có chiều dài $\\ell = 1\\,\\text{m}$ dao động điều hòa tại nơi có gia tốc trọng trường $g = \\pi^2 = 10\\,\\text{m/s}^2$. Xét tính đúng/sai của các phát biểu sau:',
      statements: [
        { id: 'a', statement: 'Chu kỳ dao động riêng của con lắc là $T = 2\\,\\text{s}$.', isCorrect: true, explanation: '$T = 2\\pi\\sqrt{\\ell/g} = 2\\pi\\sqrt{1/\\pi^2} = 2\\,\\text{s}$.' },
        { id: 'b', statement: 'Tần số dao động của con lắc là $f = 2\\,\\text{Hz}$.', isCorrect: false, explanation: '$f = 1/T = 0,5\\,\\text{Hz}$.' },
        { id: 'c', statement: 'Nếu tăng chiều dài dây treo lên $4$ lần thì chu kỳ tăng lên $2$ lần.', isCorrect: true, explanation: '$T$ tỉ lệ thuận với $\\sqrt{\\ell}$.' },
        { id: 'd', statement: 'Gia tốc cực đại của con lắc tỉ lệ nghịch với biên độ góc.', isCorrect: false, explanation: '$a_{\\max} = g \\cdot \\alpha_0$, tỉ lệ thuận với biên độ góc.' }
      ],
      explanation: 'Phân tích các công thức cơ bản của con lắc đơn $T = 2\\pi\\sqrt{\\ell/g}$.'
    }
  ],
  part3_sa: [
    {
      id: 'sa_p1',
      type: 'sa',
      topic: 'Mạch RLC nối tiếp',
      content: 'Mạch RLC nối tiếp có $R = 100\\,\\Omega$, cuộn cảm thuần $L = \\frac{1}{\\pi}\\,\\text{H}$, tụ điện $C = \\frac{10^{-4}}{2\\pi}\\,\\text{F}$. Đặt vào hai đầu đoạn mạch điện áp xoay chiều có tần số $f = 50\\,\\text{Hz}$. Cường độ dòng điện hiệu dụng trong mạch là bao nhiêu ampe nếu $U = 220\\,\\text{V}$?',
      correctAnswer: '1.55',
      unit: 'A',
      tolerance: 0.05,
      explanation: '$Z_L = 100\\,\\Omega, Z_C = 200\\,\\Omega \\Rightarrow Z = \\sqrt{100^2 + (100-200)^2} = 100\\sqrt{2}\\,\\Omega \\Rightarrow I = 220 / (100\\sqrt{2}) \\approx 1,55\\,\\text{A}$.'
    }
  ]
};

export const PhysicsExamBuilder: React.FC<PhysicsExamBuilderProps> = ({
  initialExam = DEFAULT_SAMPLE_PHYSICS_EXAM,
  onExamChange,
  className = ''
}) => {
  const [exam, setExam] = useState<PhysicsExamPaper>(initialExam);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState<'part1' | 'part2' | 'part3' | 'preview'>('part1');

  // Form states Phần I MC
  const [newMcContent, setNewMcContent] = useState('');
  const [newMcOptA, setNewMcOptA] = useState('');
  const [newMcOptB, setNewMcOptB] = useState('');
  const [newMcOptC, setNewMcOptC] = useState('');
  const [newMcOptD, setNewMcOptD] = useState('');
  const [newMcCorrect, setNewMcCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [newMcExp, setNewMcExp] = useState('');

  // Form states Phần II True/False
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

  // Form states Phần III Short Answer
  const [newSaContent, setNewSaContent] = useState('');
  const [newSaAns, setNewSaAns] = useState('');
  const [newSaUnit, setNewSaUnit] = useState('V');
  const [newSaExp, setNewSaExp] = useState('');

  const updateExamState = (next: PhysicsExamPaper) => {
    setExam(next);
    if (onExamChange) onExamChange(next);
  };

  const handleAddMcQuestion = () => {
    if (!newMcContent.trim()) return;
    const newQ: PhysicsMcQuestion = {
      id: `mc_${Date.now()}`,
      type: 'mc',
      topic: 'Vật lý THPT',
      content: newMcContent.trim(),
      options: [newMcOptA || 'Phương án A', newMcOptB || 'Phương án B', newMcOptC || 'Phương án C', newMcOptD || 'Phương án D'],
      correctOption: newMcCorrect,
      explanation: newMcExp.trim() || 'Lời giải chi tiết.'
    };

    updateExamState({ ...exam, part1_mc: [...exam.part1_mc, newQ] });
    setNewMcContent('');
    setNewMcOptA('');
    setNewMcOptB('');
    setNewMcOptC('');
    setNewMcOptD('');
    setNewMcExp('');
  };

  const handleDeleteMc = (id: string) => {
    updateExamState({ ...exam, part1_mc: exam.part1_mc.filter(q => q.id !== id) });
  };

  const handleAddTfQuestion = () => {
    if (!newTfStem.trim()) return;
    const newQ: PhysicsTfQuestion = {
      id: `tf_${Date.now()}`,
      type: 'tf',
      topic: 'Vật lý THPT',
      stemContent: newTfStem.trim(),
      statements: [
        { id: 'a', statement: newTfA || 'Mệnh đề a', isCorrect: newTfAAns },
        { id: 'b', statement: newTfB || 'Mệnh đề b', isCorrect: newTfBAns },
        { id: 'c', statement: newTfC || 'Mệnh đề c', isCorrect: newTfCAns },
        { id: 'd', statement: newTfD || 'Mệnh đề d', isCorrect: newTfDAns }
      ],
      explanation: newTfExp.trim() || 'Phân tích lý do Đúng/Sai cho từng câu lệnh.'
    };

    updateExamState({ ...exam, part2_tf: [...exam.part2_tf, newQ] });
    setNewTfStem('');
    setNewTfA('');
    setNewTfB('');
    setNewTfC('');
    setNewTfD('');
    setNewTfExp('');
  };

  const handleDeleteTf = (id: string) => {
    updateExamState({ ...exam, part2_tf: exam.part2_tf.filter(q => q.id !== id) });
  };

  const handleAddSaQuestion = () => {
    if (!newSaContent.trim() || !newSaAns.trim()) return;
    const newQ: PhysicsSaQuestion = {
      id: `sa_${Date.now()}`,
      type: 'sa',
      topic: 'Vật lý THPT',
      content: newSaContent.trim(),
      correctAnswer: newSaAns.trim(),
      unit: newSaUnit.trim(),
      explanation: newSaExp.trim() || 'Các bước tính toán ra kết quả.'
    };

    updateExamState({ ...exam, part3_sa: [...exam.part3_sa, newQ] });
    setNewSaContent('');
    setNewSaAns('');
    setNewSaExp('');
  };

  const handleDeleteSa = (id: string) => {
    updateExamState({ ...exam, part3_sa: exam.part3_sa.filter(q => q.id !== id) });
  };

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
    link.download = `DeThi_VatLy_${exam.grade}_GDPT2018.txt`;
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
          <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Trình Soạn Đề Thi Môn Vật Lý GDPT 2018 (3 Phần)
            </h3>
            <p className="text-[11px] text-slate-500">
              Phần I: 18 câu MC | Phần II: 4 câu True/False 4 ý | Phần III: 6 câu Trả lời ngắn điền số/đơn vị
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyWordFormat}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText ? 'Đã copy văn bản Word!' : 'Sao chép dạng Word'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWordFile}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
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
              ? 'bg-amber-600 text-white shadow-xs'
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
              ? 'bg-emerald-600 text-white shadow-xs'
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

      {/* TAB PART 1: MC */}
      {activeTab === 'part1' && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase">
              <Plus className="w-4 h-4 text-amber-600" />
              Thêm câu hỏi Trắc nghiệm 4 phương án (Phần I)
            </span>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Nội dung câu hỏi (hỗ trợ KaTeX $...$)</label>
              <textarea
                rows={2}
                value={newMcContent}
                onChange={(e) => setNewMcContent(e.target.value)}
                placeholder="VD: Đặt điện áp xoay chiều u = 220√2 cos(100πt) V vào hai đầu đoạn mạch RLC..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input type="text" value={newMcOptA} onChange={(e) => setNewMcOptA(e.target.value)} placeholder="Phương án A" className="px-2.5 py-1.5 bg-white border border-slate-300 rounded" />
              <input type="text" value={newMcOptB} onChange={(e) => setNewMcOptB(e.target.value)} placeholder="Phương án B" className="px-2.5 py-1.5 bg-white border border-slate-300 rounded" />
              <input type="text" value={newMcOptC} onChange={(e) => setNewMcOptC(e.target.value)} placeholder="Phương án C" className="px-2.5 py-1.5 bg-white border border-slate-300 rounded" />
              <input type="text" value={newMcOptD} onChange={(e) => setNewMcOptD(e.target.value)} placeholder="Phương án D" className="px-2.5 py-1.5 bg-white border border-slate-300 rounded" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <select value={newMcCorrect} onChange={(e) => setNewMcCorrect(e.target.value as any)} className="px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-amber-800">
                <option value="A">Đáp án A</option>
                <option value="B">Đáp án B</option>
                <option value="C">Đáp án C</option>
                <option value="D">Đáp án D</option>
              </select>
              <input type="text" value={newMcExp} onChange={(e) => setNewMcExp(e.target.value)} placeholder="Giải thích chi tiết..." className="px-2.5 py-1.5 bg-white border border-slate-300 rounded" />
            </div>

            <button type="button" onClick={handleAddMcQuestion} className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Thêm câu hỏi vào Phần I</span>
            </button>
          </div>

          <div className="space-y-3">
            {exam.part1_mc.map((q, idx) => (
              <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">Câu {idx + 1}: {q.content}</p>
                  <button onClick={() => handleDeleteMc(q.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className={`p-2 rounded border ${String.fromCharCode(65 + oIdx) === q.correctOption ? 'bg-amber-100 border-amber-300 font-bold text-amber-900' : 'bg-white border-slate-200'}`}>
                      {String.fromCharCode(65 + oIdx)}. {opt}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-amber-700 italic">💡 {q.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB PART 2: TRUE / FALSE */}
      {activeTab === 'part2' && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase">
              <Plus className="w-4 h-4 text-indigo-600" />
              Thêm câu hỏi Trắc nghiệm Đúng/Sai 4 lệnh hỏi (Phần II)
            </span>
            <textarea rows={2} value={newTfStem} onChange={(e) => setNewTfStem(e.target.value)} placeholder="VD: Cho đồ thị li độ - thời gian của một con lắc lò xo..." className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium" />
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg">
                <span className="font-bold text-indigo-700">a)</span>
                <input type="text" value={newTfA} onChange={(e) => setNewTfA(e.target.value)} placeholder="Mệnh đề a..." className="flex-1 text-xs border-b border-slate-200 focus:outline-none" />
                <label className="flex items-center gap-1"><input type="radio" checked={newTfAAns} onChange={() => setNewTfAAns(true)} /> Đúng</label>
                <label className="flex items-center gap-1"><input type="radio" checked={!newTfAAns} onChange={() => setNewTfAAns(false)} /> Sai</label>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg">
                <span className="font-bold text-indigo-700">b)</span>
                <input type="text" value={newTfB} onChange={(e) => setNewTfB(e.target.value)} placeholder="Mệnh đề b..." className="flex-1 text-xs border-b border-slate-200 focus:outline-none" />
                <label className="flex items-center gap-1"><input type="radio" checked={newTfBAns} onChange={() => setNewTfBAns(true)} /> Đúng</label>
                <label className="flex items-center gap-1"><input type="radio" checked={!newTfBAns} onChange={() => setNewTfBAns(false)} /> Sai</label>
              </div>
            </div>

            <button type="button" onClick={handleAddTfQuestion} className="py-2 px-4 bg-indigo-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Thêm câu hỏi Đúng/Sai vào Phần II</span>
            </button>
          </div>

          <div className="space-y-3">
            {exam.part2_tf.map((q, idx) => (
              <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">Câu {idx + 1}: {q.stemContent}</p>
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB PART 3: SHORT ANSWER */}
      {activeTab === 'part3' && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase">
              <Plus className="w-4 h-4 text-emerald-600" />
              Thêm câu hỏi Trả lời ngắn / Điền số (Phần III)
            </span>
            <textarea rows={2} value={newSaContent} onChange={(e) => setNewSaContent(e.target.value)} placeholder="VD: Mạch RLC nối tiếp có R = 100 Ohm, ZL = 100 Ohm, ZC = 200 Ohm. Cường độ dòng điện hiệu dụng là bao nhiêu Ampe nếu U = 220V?" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input type="text" value={newSaAns} onChange={(e) => setNewSaAns(e.target.value)} placeholder="Đáp số chuẩn (VD: 1.55)" className="px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold font-mono text-emerald-800" />
              <input type="text" value={newSaUnit} onChange={(e) => setNewSaUnit(e.target.value)} placeholder="Đơn vị (VD: A, V, rad/s)" className="px-2.5 py-1.5 bg-white border border-slate-300 rounded" />
            </div>
            <button type="button" onClick={handleAddSaQuestion} className="py-2 px-4 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Thêm câu hỏi Trả lời ngắn vào Phần III</span>
            </button>
          </div>

          <div className="space-y-3">
            {exam.part3_sa.map((q, idx) => (
              <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">Câu {idx + 1}: {q.content}</p>
                  <button onClick={() => handleDeleteSa(q.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Đáp số:</span>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold font-mono rounded">
                    {q.correctAnswer} {q.unit || ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB PREVIEW */}
      {activeTab === 'preview' && (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-5 text-xs">
          <div className="text-center border-b border-slate-200 pb-3 space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 uppercase">{exam.title}</h3>
            <p className="text-[11px] text-amber-800 font-bold">Năm học: {exam.schoolYear} | Thời gian làm bài: {exam.durationMinutes} phút</p>
          </div>

          <div className="space-y-3">
            <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded block uppercase">
              PHẦN I. Câu hỏi trắc nghiệm nhiều lựa chọn ({exam.part1_mc.length} câu)
            </span>
            {exam.part1_mc.map((q, idx) => (
              <div key={q.id} className="p-2.5 bg-white rounded border border-slate-200 space-y-1">
                <p className="font-bold">Câu {idx + 1}: {q.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
