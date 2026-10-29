import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileText,
  Key,
  CheckCircle2,
  Sparkles,
  Download,
  Upload,
  Camera,
  Layers,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  OMRExamKey,
  parseFastTextAnswerKey,
  parseExcelAnswerKeys,
  exportToQmOrTnMakerFormat,
  processOMRSheetCanvas,
} from '../../services/omrScannerService';

interface AnswerKeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  examKeys: Record<string, OMRExamKey>;
  onSaveKeys: (keys: Record<string, OMRExamKey>) => void;
  onNavigateToScanner?: () => void;
}

export const AnswerKeyManagerModal: React.FC<AnswerKeyManagerModalProps> = ({
  isOpen,
  onClose,
  examKeys,
  onSaveKeys,
  onNavigateToScanner,
}) => {
  const [activeCode, setActiveCode] = useState<string>(() => {
    const codes = Object.keys(examKeys);
    return codes.length > 0 ? codes[0] : '101';
  });

  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'camera_key'>('text');

  // Fast text input state
  const [fastTextCode, setFastTextCode] = useState<string>('101');
  const [fastTextInput, setFastTextInput] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyByDoingInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  if (!isOpen) return null;

  const currentKey = examKeys[activeCode];

  // Helper to trigger message
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // -------------------------------------------------------------
  // METHOD 1: PARSE FAST TEXT
  // -------------------------------------------------------------
  const handleSaveFastText = () => {
    if (!fastTextInput.trim()) {
      showFeedback('error', 'Vui lòng nhập chuỗi đáp án trước khi lưu.');
      return;
    }

    const code = fastTextCode.trim() || '101';
    const parsedKey = parseFastTextAnswerKey(fastTextInput, code);

    const updated = {
      ...examKeys,
      [code]: parsedKey,
    };

    onSaveKeys(updated);
    setActiveCode(code);
    showFeedback('success', `Đã lưu đáp án cho Mã đề ${code} thành công!`);
  };

  const handleInsertSampleFastText = () => {
    setFastTextCode('101');
    setFastTextInput(`PHẦN I.
1A 2B 3C 4D 5A 6B 7C 8D 9A 10B
11C 12D 13A 14B 15C 16D 17A 18B 19C 20D
21A 22B 23C 24D 25A 26B 27C 28D 29A 30B
31C 32D 33A 34B 35C 36D 37A 38B 39C 40D

PHẦN II.
1(ĐĐSS) 2(ĐSĐS) 3(SĐSĐ) 4(SSSS)
5(ĐĐĐĐ) 6(SĐĐS) 7(ĐSĐĐ) 8(SĐSĐ)

PHẦN III.
1: 4 | 2: -2.5 | 3: 0.75 | 4: 12 | 5: -3 | 6: 100`);
  };

  // -------------------------------------------------------------
  // METHOD 2: UPLOAD EXCEL / DOCX
  // -------------------------------------------------------------
  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessingFile(true);
      const buffer = await file.arrayBuffer();
      const parsedList = await parseExcelAnswerKeys(buffer);

      if (parsedList.length === 0) {
        showFeedback(
          'error',
          'Không tìm thấy bảng đáp án hợp lệ trong file Excel. Vui lòng tải file mẫu để xem định dạng chuẩn.'
        );
        setIsProcessingFile(false);
        return;
      }

      const updated = { ...examKeys };
      parsedList.forEach((k) => {
        updated[k.code] = k;
      });

      onSaveKeys(updated);
      if (parsedList[0]) setActiveCode(parsedList[0].code);
      showFeedback('success', `Đã nhập thành công ${parsedList.length} mã đề từ file Excel!`);
    } catch (err: any) {
      showFeedback('error', `Lỗi xử lý file: ${err.message}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      ['Câu', 'Mã 101', 'Mã 102', 'Mã 103', 'Mã 104'],
      // Phần I (Câu 1-40)
      ['PHẦN I', '', '', '', ''],
      ['1', 'A', 'B', 'C', 'D'],
      ['2', 'B', 'C', 'D', 'A'],
      ['3', 'C', 'D', 'A', 'B'],
      ['4', 'D', 'A', 'B', 'C'],
      ['5', 'A', 'A', 'B', 'C'],
      // Phần II (Câu 1-8)
      ['PHẦN II', '', '', '', ''],
      ['1', 'ĐĐSS', 'ĐSĐS', 'SĐSĐ', 'ĐĐĐS'],
      ['2', 'ĐSĐS', 'SĐSĐ', 'ĐĐSS', 'SSSS'],
      ['3', 'SĐSĐ', 'ĐĐSS', 'ĐSĐS', 'ĐĐĐĐ'],
      // Phần III (Câu 1-6)
      ['PHẦN III', '', '', '', ''],
      ['1', '4', '12', '-2.5', '0.5'],
      ['2', '-2.5', '4', '12', '100'],
      ['3', '0.75', '-3', '4', '-2.5'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dap_An');
    XLSX.writeFile(workbook, 'Mau_Nhap_Dap_An_Excel_EduPlan.xlsx');
  };

  // -------------------------------------------------------------
  // METHOD 3: KEY BY DOING (QUÉT PHIẾU ĐÁP ÁN MẪU)
  // -------------------------------------------------------------
  const handleKeyByDoingUpload = async (file: File) => {
    try {
      setIsProcessingFile(true);
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((res) => (img.onload = res));

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      // Process sheet using OMR engine
      const scanRes = processOMRSheetCanvas(canvas, examKeys, activeCode);
      const code = scanRes.examCode || activeCode || '101';

      // Convert scanned items to Key
      const newKey: OMRExamKey = {
        code,
        part1: {},
        part2: {},
        part3: {},
      };

      scanRes.part1Results.forEach((r) => {
        if (r.chosen) newKey.part1[r.qNum] = r.chosen;
      });

      scanRes.part2Results.forEach((r) => {
        const stmtObj: any = {};
        r.statements.forEach((s) => {
          if (s.chosen !== null) stmtObj[s.label] = s.chosen;
        });
        newKey.part2[r.qNum] = stmtObj;
      });

      scanRes.part3Results.forEach((r) => {
        if (r.rawString) newKey.part3[r.qNum] = r.rawString;
      });

      const updated = {
        ...examKeys,
        [code]: newKey,
      };

      onSaveKeys(updated);
      setActiveCode(code);
      showFeedback(
        'success',
        `Đã trích xuất thành công đáp án mã ${code} từ phiếu mẫu (P.I: ${Object.keys(newKey.part1).length} câu, P.II: ${Object.keys(newKey.part2).length} câu, P.III: ${Object.keys(newKey.part3).length} câu)!`
      );
    } catch (err: any) {
      showFeedback('error', `Lỗi đọc phiếu mẫu: ${err.message}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Export QM format
  const handleDownloadQmFormat = (key: OMRExamKey) => {
    const content = exportToQmOrTnMakerFormat(key);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dap_An_Ma_${key.code}_QM_TNMaker.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteCode = (code: string) => {
    const updated = { ...examKeys };
    delete updated[code];
    onSaveKeys(updated);
    const remaining = Object.keys(updated);
    if (remaining.length > 0) setActiveCode(remaining[0]);
  };

  const codesList = Object.keys(examKeys);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
              <Key className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Hệ Thống Nhập & Quản Lý Đáp Án Nhanh
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dành cho GV không trộn đề trên app: Nhập text siêu tốc, tải Excel hoặc quét trực tiếp phiếu tô đáp án mẫu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-b border-red-200 dark:border-red-800'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Modal Body: 2 columns layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left Column: Code list & preview (5 cols) */}
          <div className="lg:col-span-4 p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Danh sách Mã Đề ({codesList.length})
              </span>
              <button
                onClick={() => {
                  const newCode = (100 + codesList.length + 1).toString();
                  setFastTextCode(newCode);
                  setActiveCode(newCode);
                  setActiveTab('text');
                }}
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm mã mới</span>
              </button>
            </div>

            {codesList.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-400">
                Chưa có mã đề nào. Vui lòng nhập đáp án ở khung bên phải.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {codesList.map((code) => {
                  const key = examKeys[code];
                  const p1Count = Object.keys(key.part1 || {}).length;
                  const p2Count = Object.keys(key.part2 || {}).length;
                  const p3Count = Object.keys(key.part3 || {}).length;
                  const isSelected = activeCode === code;

                  return (
                    <div
                      key={code}
                      onClick={() => setActiveCode(code)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            Mã {code}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">
                              Đang chọn
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex gap-2">
                          <span>P.I: {p1Count}c</span>
                          <span>•</span>
                          <span>P.II: {p2Count}c</span>
                          <span>•</span>
                          <span>P.III: {p3Count}c</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadQmFormat(key);
                          }}
                          title="Tải file dạng QM / TNMaker"
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCode(code);
                          }}
                          title="Xóa mã đề này"
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Answer Key View for Active Code */}
            {currentKey && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Ma trận đáp án: Mã {currentKey.code}</span>
                  <button
                    onClick={() => handleDownloadQmFormat(currentKey)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Xuất QM/TNMaker</span>
                  </button>
                </div>

                {/* Preview Part 1 */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Phần I ({Object.keys(currentKey.part1).length} câu):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto font-mono text-[11px]">
                    {Object.entries(currentKey.part1).map(([q, ans]) => (
                      <span
                        key={q}
                        className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                      >
                        {q}:{ans}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preview Part 2 */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Phần II ({Object.keys(currentKey.part2).length} câu):
                  </span>
                  <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                    {Object.entries(currentKey.part2).map(([q, s]: any) => (
                      <span
                        key={q}
                        className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                      >
                        {q}({s.a ? 'Đ' : 'S'}
                        {s.b ? 'Đ' : 'S'}
                        {s.c ? 'Đ' : 'S'}
                        {s.d ? 'Đ' : 'S'})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preview Part 3 */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Phần III ({Object.keys(currentKey.part3).length} câu):
                  </span>
                  <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                    {Object.entries(currentKey.part3).map(([q, ans]) => (
                      <span
                        key={q}
                        className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800 font-bold"
                      >
                        {q}: {ans}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: 3 Input Methods (8 cols) */}
          <div className="lg:col-span-8 p-6 space-y-5">
            {/* 3 Input Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-xs transition-colors cursor-pointer ${
                  activeTab === 'text'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Cách 1: Nhập nhanh dạng chuỗi Text</span>
              </button>

              <button
                onClick={() => setActiveTab('file')}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-xs transition-colors cursor-pointer ${
                  activeTab === 'file'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Cách 2: Tải file Đáp án (.xlsx / Word)</span>
              </button>

              <button
                onClick={() => setActiveTab('camera_key')}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-xs transition-colors cursor-pointer ${
                  activeTab === 'camera_key'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Cách 3: Chấm bằng phiếu mẫu (Key by Doing)</span>
              </button>
            </div>

            {/* TAB 1: FAST TEXT INPUT */}
            {activeTab === 'text' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    Mã đề áp dụng:
                  </label>
                  <input
                    type="text"
                    value={fastTextCode}
                    onChange={(e) => setFastTextCode(e.target.value)}
                    placeholder="101"
                    className="w-28 px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                  <div className="flex-1" />
                  <button
                    onClick={handleInsertSampleFastText}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Dán chuỗi mẫu</span>
                  </button>
                </div>

                <div>
                  <textarea
                    value={fastTextInput}
                    onChange={(e) => setFastTextInput(e.target.value)}
                    placeholder="Dán chuỗi đáp án vào đây...
Ví dụ:
PHẦN I: 1A 2B 3C 4D 5A...
PHẦN II: 1(ĐĐSS) 2(ĐSĐS)...
PHẦN III: 1: 4 | 2: -2.5 | 3: 0.75..."
                    rows={10}
                    className="w-full p-4 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-400">
                    Cú pháp linh hoạt: tự động nhận diện cả <code className="text-blue-500">1A</code>, <code className="text-blue-500">1.A</code>, <code className="text-blue-500">1:A</code>, và các dấu phân cách.
                  </div>
                  <button
                    onClick={handleSaveFastText}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Key className="w-4 h-4" />
                    <span>Lưu đáp án mã {fastTextCode}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: FILE UPLOAD (.XLSX) */}
            {activeTab === 'file' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Tải bảng ma trận đáp án chính thức từ file Excel (.xlsx). Hệ thống hỗ trợ đọc nhiều mã đề cùng 1 lúc.
                  </p>
                  <button
                    onClick={handleDownloadSampleExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file Excel mẫu (.xlsx)</span>
                  </button>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-10 text-center bg-white dark:bg-slate-950/50 hover:bg-blue-50/20 transition-all cursor-pointer flex flex-col items-center justify-center group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {isProcessingFile ? 'Đang phân tích bảng đáp án...' : 'Bấm vào đây để chọn file Excel (.xlsx)'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Cột: Câu | Mã 101 | Mã 102 | Mã 103...
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: KEY BY DOING (QUÉT PHIẾU ĐÁP ÁN MẪU) */}
            {activeTab === 'camera_key' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <b>Tính năng Key by Doing:</b> Giáo viên chỉ cần lấy 1 tờ phiếu trả lời trắc nghiệm, tô sẵn đáp án chuẩn bằng bút chì, sau đó tải ảnh phiếu lên (hoặc chụp qua camera). Hệ thống sẽ tự động quét và lưu làm Key cho mã đề tương ứng!
                </div>

                <div
                  onClick={() => keyByDoingInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-2xl p-10 text-center bg-white dark:bg-slate-950/50 hover:bg-amber-50/20 transition-all cursor-pointer flex flex-col items-center justify-center group"
                >
                  <input
                    ref={keyByDoingInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleKeyByDoingUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Camera className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {isProcessingFile ? 'Đang nhận diện phiếu đáp án mẫu...' : 'Tải ảnh phiếu đáp án đã tô của giáo viên'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Đảm bảo chụp thẳng góc và thấy rõ 4 góc vuông màu đen định vị của phiếu.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tổng cộng: <b className="text-slate-900 dark:text-white">{codesList.length} mã đề</b> sẵn sàng cho chấm Camera OMR.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            {onNavigateToScanner && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToScanner();
                }}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Chuyển sang Chấm Camera ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
