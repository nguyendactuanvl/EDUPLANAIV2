import React, { useState } from 'react';
import { 
  X, Sparkles, RefreshCw, Check, ArrowRight, Sliders, Clock, 
  BookOpen, Layers, CheckCircle2, AlertTriangle, Lightbulb, 
  HelpCircle, Eye, FileText, ChevronRight, Zap
} from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';
import { ExamMatrixTemplate } from '../data/matrixLibraryData';
import { MatrixRowItem, SpecUnitItem } from './CompetencyMatrixModal';

interface AiMatrixSuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialGrade?: string;
  onApplySuggestedMatrix: (suggestedData: {
    template: ExamMatrixTemplate;
    matrixRows: MatrixRowItem[];
    specUnits: SpecUnitItem[];
    title: string;
    grade: string;
    subject: string;
    durationMinutes: number;
    totalPoints: number;
    qCounts: { mc: number; tf: number; sa: number; essay: number };
    topicsList: string[];
  }, directToExam?: boolean) => void;
}

export function AiMatrixSuggestModal({
  isOpen,
  onClose,
  initialSubject = "Toán học",
  initialGrade = "11",
  onApplySuggestedMatrix
}: AiMatrixSuggestModalProps) {
  // Config inputs
  const [subject, setSubject] = useState<string>(initialSubject);
  const [grade, setGrade] = useState<string>(initialGrade);
  const [semester, setSemester] = useState<string>("Giữa kì I");
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [totalPoints, setTotalPoints] = useState<number>(10);

  // Question structure preset
  const [structurePreset, setStructurePreset] = useState<'sample_image' | 'gdpt2025' | 'mc_only' | 'custom'>('sample_image');
  const [qCounts, setQCounts] = useState<{ mc: number; tf: number; sa: number; essay: number }>({
    mc: 16,
    tf: 2,
    sa: 2,
    essay: 3
  });

  // Cognitive Level Target Ratios
  const [ratioPreset, setRatioPreset] = useState<'40_30_20_10' | '30_40_20_10' | '40_30_30_0' | '50_30_20_0'>('40_30_30_0');
  const [targetRatio, setTargetRatio] = useState<{ biet: number; hieu: number; vd: number; vdc: number }>({
    biet: 40,
    hieu: 30,
    vd: 20,
    vdc: 10
  });

  // Topics & Pedagogical notes
  const [customTopicsText, setCustomTopicsText] = useState<string>('');
  const [pedagogicalNote, setPedagogicalNote] = useState<string>('Phân hóa học sinh khá giỏi, tập trung vào các câu hỏi gắn với ứng dụng thực tiễn');

  // AI loading and result states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestedResult, setSuggestedResult] = useState<any | null>(null);

  if (!isOpen) return null;

  // Change preset for question structure
  const handleStructurePresetChange = (preset: 'sample_image' | 'gdpt2025' | 'mc_only' | 'custom') => {
    setStructurePreset(preset);
    if (preset === 'sample_image') {
      setQCounts({ mc: 16, tf: 2, sa: 2, essay: 3 });
      setDurationMinutes(90);
    } else if (preset === 'gdpt2025') {
      setQCounts({ mc: 12, tf: 4, sa: 6, essay: 0 });
      setDurationMinutes(90);
    } else if (preset === 'mc_only') {
      setQCounts({ mc: 40, tf: 0, sa: 0, essay: 0 });
      setDurationMinutes(50);
    }
  };

  // Change preset for cognitive target ratio
  const handleRatioPresetChange = (preset: '40_30_20_10' | '30_40_20_10' | '40_30_30_0' | '50_30_20_0') => {
    setRatioPreset(preset);
    if (preset === '40_30_20_10') {
      setTargetRatio({ biet: 40, hieu: 30, vd: 20, vdc: 10 });
    } else if (preset === '30_40_20_10') {
      setTargetRatio({ biet: 30, hieu: 40, vd: 20, vdc: 10 });
    } else if (preset === '40_30_30_0') {
      setTargetRatio({ biet: 40, hieu: 30, vd: 30, vdc: 0 });
    } else if (preset === '50_30_20_0') {
      setTargetRatio({ biet: 50, hieu: 30, vd: 20, vdc: 0 });
    }
  };

  const ratioTotal = targetRatio.biet + targetRatio.hieu + targetRatio.vd + targetRatio.vdc;

  // Handle Submit to AI
  const handleGenerateWithAi = async () => {
    if (ratioTotal !== 100) {
      setErrorMsg(`Tổng tỉ lệ mức độ nhận thức phải bằng 100% (Hiện tại: ${ratioTotal}%).`);
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationStep('Đang phân tích chương trình GDPT 2018 môn ' + subject + ' lớp ' + grade + '...');

    const topicsArray = customTopicsText
      .split('\n')
      .map(s => s.trim().replace(/^[-•*]\s*/, ''))
      .filter(Boolean);

    try {
      setTimeout(() => setGenerationStep('Đang tính toán phân bổ câu lệnh hỏi theo tỉ lệ ' + targetRatio.biet + '% Biết - ' + targetRatio.hieu + '% Hiểu - ' + targetRatio.vd + '% VD...'), 1500);
      setTimeout(() => setGenerationStep('Đang biên soạn bảng đặc tả kĩ thuật yêu cầu cần đạt chi tiết...'), 3500);

      const res = await apiFetch('/api/suggest-exam-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          grade,
          semester,
          durationMinutes,
          totalPoints,
          targetRatio,
          qCounts,
          customTopics: topicsArray,
          pedagogicalNote
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.result) {
        throw new Error(data?.error || 'Không thể đề xuất ma trận đề thi. Vui lòng thử lại.');
      }

      setSuggestedResult(data.result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi gọi AI phân tích ma trận.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Convert suggested result to ExamMatrixTemplate format and apply
  const handleApply = (directToExam: boolean = false) => {
    if (!suggestedResult) return;

    const res = suggestedResult;
    const template: ExamMatrixTemplate = {
      id: `ai_matrix_${Date.now()}`,
      subjectId: (subject === 'Toán học' ? 'toan' : subject === 'Vật lí' ? 'vat_li' : subject === 'Hóa học' ? 'hoa_hoc' : subject === 'Sinh học' ? 'sinh_hoc' : subject === 'Tiếng Anh' ? 'tieng_anh' : subject === 'Ngữ văn' ? 'ngu_van' : 'toan') as any,
      subjectName: subject,
      grade: grade as any,
      semester: semester as any,
      title: res.title || `ĐỀ KIỂM TRA ${semester.toUpperCase()} MÔN ${subject.toUpperCase()} - KHỐI ${grade}`,
      badge: `AI GDPT 2018 • Tỉ lệ ${targetRatio.biet}-${targetRatio.hieu}-${targetRatio.vd}`,
      description: `Ma trận được AI tối ưu hóa tự động theo phân bổ: ${qCounts.mc} TN + ${qCounts.tf} Đ/S + ${qCounts.sa} TLN + ${qCounts.essay} TL trong ${durationMinutes} phút.`,
      durationMinutes,
      totalPoints,
      competencyHeaders: res.competencyHeaders || {
        c1: 'Giải quyết vấn đề',
        c2: 'Tư duy toán học',
        c3: 'Mô hình hoá'
      },
      qCounts,
      matrixRows: res.matrixRows || [],
      specUnits: res.specUnits || [],
      topicsList: res.topicsList || []
    };

    onApplySuggestedMatrix({
      template,
      matrixRows: res.matrixRows || [],
      specUnits: res.specUnits || [],
      title: template.title,
      grade,
      subject,
      durationMinutes,
      totalPoints,
      qCounts,
      topicsList: template.topicsList
    }, directToExam);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex justify-between items-center shrink-0 shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-md ring-1 ring-white/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg tracking-tight drop-shadow-xs">
                  AI Tự Động Đề Xuất Phân Bổ Ma Trận Đề Thi GDPT 2018
                </h3>
                <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider shadow-xs">
                  Trợ lí Khảo thí AI
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 font-medium">
                Cân đối số câu hỏi, thời gian làm bài và mục tiêu năng lực (Nhận biết $40\%$, Thông hiểu $30\%$, Vận dụng $20\%$, Vận dụng cao $10\%$).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl cursor-pointer transition-all hover:rotate-90 duration-200 relative z-10"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* VÙNG 1: THIẾT LẬP THAM SỐ ĐẦU VÀO CHO AI */}
          {!suggestedResult ? (
            <div className="space-y-5">
              
              {/* Nhóm 1: Môn học, Khối lớp, Kì thi, Thời gian */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1. Thông tin chung về kì thi</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Môn học
                    </label>
                    <select
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Toán học">Toán học</option>
                      <option value="Vật lí">Vật lí</option>
                      <option value="Hóa học">Hóa học</option>
                      <option value="Sinh học">Sinh học</option>
                      <option value="Tin học">Tin học</option>
                      <option value="Tiếng Anh">Tiếng Anh</option>
                      <option value="Ngữ văn">Ngữ văn</option>
                      <option value="Lịch sử">Lịch sử</option>
                      <option value="Địa lí">Địa lí</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Khối lớp
                    </label>
                    <select
                      value={grade}
                      onChange={e => setGrade(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="10">Lớp 10</option>
                      <option value="11">Lớp 11</option>
                      <option value="12">Lớp 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kì thi
                    </label>
                    <select
                      value={semester}
                      onChange={e => setSemester(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Giữa kì I">Giữa kì I</option>
                      <option value="Cuối kì I">Cuối kì I</option>
                      <option value="Giữa kì II">Giữa kì II</option>
                      <option value="Cuối kì II">Cuối kì II (Cả năm)</option>
                      <option value="Tốt nghiệp THPT / ĐGNL">Tốt nghiệp THPT / ĐGNL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Thời gian làm bài
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={45}>45 phút (1 tiết)</option>
                      <option value={50}>50 phút</option>
                      <option value={60}>60 phút</option>
                      <option value={90}>90 phút (Học kì chuẩn)</option>
                      <option value={120}>120 phút</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Cấu trúc số lượng câu hỏi */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>2. Cấu trúc dạng thức câu hỏi & Số lượng</span>
                  </h4>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleStructurePresetChange('sample_image')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${structurePreset === 'sample_image' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                    >
                      Mẫu GDPT 11 (Chuẩn ảnh Bộ)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStructurePresetChange('gdpt2025')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${structurePreset === 'gdpt2025' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                    >
                      Mẫu THPT 2025 (3 phần trắc nghiệm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStructurePresetChange('mc_only')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${structurePreset === 'mc_only' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                    >
                      40 câu TNKQ
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-[11px] font-bold text-blue-700">Phần I: TN 4 Lựa chọn</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={qCounts.mc}
                        onChange={e => {
                          setStructurePreset('custom');
                          setQCounts(prev => ({ ...prev, mc: Number(e.target.value) }));
                        }}
                        className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded font-black text-sm text-center"
                      />
                      <span className="text-xs text-slate-500">câu (0.25đ/câu)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-[11px] font-bold text-indigo-700">Phần II: Đúng / Sai</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={qCounts.tf}
                        onChange={e => {
                          setStructurePreset('custom');
                          setQCounts(prev => ({ ...prev, tf: Number(e.target.value) }));
                        }}
                        className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded font-black text-sm text-center"
                      />
                      <span className="text-xs text-slate-500">câu (4 ý a,b,c,d)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-[11px] font-bold text-purple-700">Phần III: Trả lời ngắn</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={qCounts.sa}
                        onChange={e => {
                          setStructurePreset('custom');
                          setQCounts(prev => ({ ...prev, sa: Number(e.target.value) }));
                        }}
                        className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded font-black text-sm text-center"
                      />
                      <span className="text-xs text-slate-500">câu (0.5đ/câu)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-[11px] font-bold text-rose-700">Phần IV: Tự luận</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={qCounts.essay}
                        onChange={e => {
                          setStructurePreset('custom');
                          setQCounts(prev => ({ ...prev, essay: Number(e.target.value) }));
                        }}
                        className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded font-black text-sm text-center"
                      />
                      <span className="text-xs text-slate-500">câu (1.0đ/câu)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nhóm 3: Mục tiêu tỉ lệ mức độ nhận thức */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-600" />
                    <span>3. Mục tiêu tỉ lệ mức độ nhận thức (Tổng = 100%)</span>
                  </h4>

                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleRatioPresetChange('40_30_30_0')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${ratioPreset === '40_30_30_0' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}
                    >
                      40 - 30 - 30 (Chuẩn ảnh)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRatioPresetChange('40_30_20_10')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${ratioPreset === '40_30_20_10' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}
                    >
                      40 - 30 - 20 - 10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRatioPresetChange('30_40_20_10')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${ratioPreset === '30_40_20_10' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}
                    >
                      30 - 40 - 20 - 10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRatioPresetChange('50_30_20_0')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${ratioPreset === '50_30_20_0' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}
                    >
                      50 - 30 - 20
                    </button>
                  </div>
                </div>

                {/* 4 Thanh trượt tỉ lệ */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-700">1. Nhận biết</span>
                      <span className="font-black text-blue-700">{targetRatio.biet}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="70"
                      step="5"
                      value={targetRatio.biet}
                      onChange={e => setTargetRatio(prev => ({ ...prev, biet: Number(e.target.value) }))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-700">2. Thông hiểu</span>
                      <span className="font-black text-indigo-700">{targetRatio.hieu}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={targetRatio.hieu}
                      onChange={e => setTargetRatio(prev => ({ ...prev, hieu: Number(e.target.value) }))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-700">3. Vận dụng</span>
                      <span className="font-black text-purple-700">{targetRatio.vd}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={targetRatio.vd}
                      onChange={e => setTargetRatio(prev => ({ ...prev, vd: Number(e.target.value) }))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-700">4. Vận dụng cao</span>
                      <span className="font-black text-rose-700">{targetRatio.vdc}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="5"
                      value={targetRatio.vdc}
                      onChange={e => setTargetRatio(prev => ({ ...prev, vdc: Number(e.target.value) }))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Thanh cảnh báo tổng tỉ lệ */}
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border ${ratioTotal === 100 ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'}`}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
                    <span>Tổng tỉ lệ hiện tại: ${ratioTotal}\%$</span>
                  </span>
                  <span>{ratioTotal === 100 ? '✓ Tỉ lệ chuẩn $100\%$ hợp lệ' : '⚠️ Cần điều chỉnh slider để tổng bằng $100\%$'}</span>
                </div>
              </div>

              {/* Nhóm 4: Chủ đề & Ghi chú bổ sung */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chủ đề trọng tâm (Mỗi dòng một chủ đề, hoặc để trống để AI tự lấy theo PPCT):
                  </label>
                  <textarea
                    rows={3}
                    value={customTopicsText}
                    onChange={e => setCustomTopicsText(e.target.value)}
                    placeholder="VD:&#10;Hàm số lượng giác và phương trình lượng giác&#10;Dãy số, cấp số cộng và cấp số nhân&#10;Quan hệ song song trong không gian"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ghi chú sư phạm & Định hướng phân hóa học sinh:
                  </label>
                  <textarea
                    rows={3}
                    value={pedagogicalNote}
                    onChange={e => setPedagogicalNote(e.target.value)}
                    placeholder="VD: Cân đối bài toán thực tế, 2 câu trả lời ngắn phân hóa học sinh giỏi..."
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Nút hành động chính: Gọi AI */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleGenerateWithAi}
                  disabled={isGenerating || ratioTotal !== 100}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 transform active:scale-98"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-amber-300" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-amber-300 animate-bounce" />
                  )}
                  <span>{isGenerating ? 'AI đang phân tích và tính toán ma trận...' : '⚡ Phân Tích & Tự Động Đề Xuất Ma Trận Bằng AI'}</span>
                </button>
              </div>

              {isGenerating && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center space-y-1.5 animate-pulse">
                  <p className="text-xs font-bold text-indigo-900">{generationStep}</p>
                  <span className="text-[11px] text-indigo-600">Đang đồng bộ tỉ lệ và phân bố lệnh hỏi chuẩn theo hướng dẫn của Bộ GD&ĐT...</span>
                </div>
              )}

            </div>
          ) : (
            
            // VÙNG 2: KẾT QUẢ ĐỀ XUẤT TỪ AI
            <div className="space-y-6">
              
              {/* Thẻ chúc mừng & Tóm tắt kết quả */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white p-5 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[11px] rounded-full uppercase">
                      Đã hoàn thành đề xuất AI
                    </span>
                    <span className="text-xs font-bold text-emerald-100">
                      Môn {suggestedResult.subject} • Lớp {suggestedResult.grade} • {suggestedResult.durationMinutes} phút
                    </span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight">{suggestedResult.title}</h3>
                  <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                    Khung ma trận được phân bổ thành công với <strong>{suggestedResult.matrixRows?.length || 0} đơn vị kiến thức</strong> bám sát mục tiêu {targetRatio.biet}% Biết - {targetRatio.hieu}% Hiểu - {targetRatio.vd}% Vận dụng.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setSuggestedResult(null)}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                  >
                    ← Thiết lập lại
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApply(false)}
                    className="px-4 py-2 bg-white text-indigo-900 hover:bg-slate-100 font-extrabold rounded-lg text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>Mở Trình Tùy Chỉnh Ma Trận</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApply(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-lg text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Đồng Bộ Ngay Vào Đề Thi</span>
                  </button>
                </div>
              </div>

              {/* Lời khuyên sư phạm của AI */}
              {suggestedResult.aiPedagogicalAdvice && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
                    <strong className="block font-bold">💡 Nhận xét & Khuyến nghị sư phạm từ AI:</strong>
                    <p>{suggestedResult.aiPedagogicalAdvice}</p>
                    {suggestedResult.timeBreakdown && (
                      <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        <span>• TN Nhiều lựa chọn: {suggestedResult.timeBreakdown.mcAverageMinutes || '1.5 phút/câu'}</span>
                        <span>• TN Đúng/Sai: {suggestedResult.timeBreakdown.tfAverageMinutes || '4.0 phút/câu'}</span>
                        <span>• TN Trả lời ngắn: {suggestedResult.timeBreakdown.saAverageMinutes || '3.5 phút/câu'}</span>
                        <span>• Tự luận: {suggestedResult.timeBreakdown.essayAverageMinutes || '10.0 phút/câu'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Xem trước bảng ma trận đề xuất */}
              <div className="overflow-x-auto bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-center mb-3">
                  <h4 className="font-bold text-sm uppercase text-slate-900 dark:text-white">
                    BẢNG MA TRẬN ĐỀ KIỂM TRA ĐỀ XUẤT TỰ ĐỘNG
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Năng lực đánh giá: {suggestedResult.competencyHeaders?.c1 || 'C1'} • {suggestedResult.competencyHeaders?.c2 || 'C2'} • {suggestedResult.competencyHeaders?.c3 || 'C3'}
                  </p>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-[11px] min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center text-slate-800">
                      <th className="border border-slate-300 p-1.5 w-8">TT</th>
                      <th className="border border-slate-300 p-1.5 w-44">Chủ đề</th>
                      <th className="border border-slate-300 p-1.5 w-48">Nội dung kiến thức</th>
                      <th className="border border-slate-300 p-1.5" colSpan={3}>{suggestedResult.competencyHeaders?.c1 || 'Năng lực 1'}</th>
                      <th className="border border-slate-300 p-1.5" colSpan={3}>{suggestedResult.competencyHeaders?.c2 || 'Năng lực 2'}</th>
                      <th className="border border-slate-300 p-1.5" colSpan={3}>{suggestedResult.competencyHeaders?.c3 || 'Năng lực 3'}</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600 text-center font-semibold">
                      <th className="border border-slate-300 p-1" colSpan={3}></th>
                      <th className="border border-slate-300 p-1">Biết</th>
                      <th className="border border-slate-300 p-1">Hiểu</th>
                      <th className="border border-slate-300 p-1">VD</th>
                      <th className="border border-slate-300 p-1">Biết</th>
                      <th className="border border-slate-300 p-1">Hiểu</th>
                      <th className="border border-slate-300 p-1">VD</th>
                      <th className="border border-slate-300 p-1">Biết</th>
                      <th className="border border-slate-300 p-1">Hiểu</th>
                      <th className="border border-slate-300 p-1">VD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(suggestedResult.matrixRows || []).map((row: any, idx: number) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50 text-slate-800">
                        <td className="border border-slate-300 p-1 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-300 p-1 font-bold">{row.topic}</td>
                        <td className="border border-slate-300 p-1">{row.unit}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold text-blue-700">{row.gqvd?.biet || '-'}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold text-blue-700">{row.gqvd?.hieu || '-'}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold text-blue-700">{row.gqvd?.vd || '-'}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold text-indigo-700">{row.tuduy?.biet || '-'}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold text-indigo-700">{row.tuduy?.hieu || '-'}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold text-indigo-700">{row.tuduy?.vd || '-'}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold text-purple-700">{row.mohinh?.biet || '-'}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold text-purple-700">{row.mohinh?.hieu || '-'}</td>
                        <td className="border border-slate-300 p-1 text-center font-bold text-purple-700">{row.mohinh?.vd || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500">
            Hệ thống AI đề xuất tự động tối ưu hóa theo quy chuẩn Khảo thí GDPT 2018.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
