import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Trash2,
  Edit2,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  Key,
  Download,
  X,
  FileText,
} from 'lucide-react';
import {
  OMRExamKey,
  StudentOMRResult,
  processOMRSheetCanvas,
  exportScoresToExcel,
  exportToQmOrTnMakerFormat,
} from '../../services/omrScannerService';
import { OMRPrintSheetModal } from './OMRPrintSheetModal';
import { AnswerKeyManagerModal } from './AnswerKeyManagerModal';

interface OMRScannerViewProps {
  initialExamKeys?: Record<string, OMRExamKey>;
  onBackToShuffle?: () => void;
}

export const OMRScannerView: React.FC<OMRScannerViewProps> = ({
  initialExamKeys = {},
  onBackToShuffle,
}) => {
  // Exam Keys State
  const [examKeys, setExamKeys] = useState<Record<string, OMRExamKey>>(() => {
    // Try loading from localStorage if empty
    if (Object.keys(initialExamKeys).length > 0) return initialExamKeys;
    try {
      const saved = localStorage.getItem('eduplan_omr_exam_keys');
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default fallback sample key
    return {
      '101': {
        code: '101',
        part1: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'A', 6: 'B', 7: 'C', 8: 'D' },
        part2: { 1: { a: true, b: true, c: false, d: false }, 2: { a: true, b: false, c: true, d: false } },
        part3: { 1: '4', 2: '-2.5', 3: '12' },
      },
    };
  });

  // Save keys to localStorage
  const handleSaveKeys = (updated: Record<string, OMRExamKey>) => {
    setExamKeys(updated);
    try {
      localStorage.setItem('eduplan_omr_exam_keys', JSON.stringify(updated));
    } catch {}
  };

  // Modals state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isKeyManagerOpen, setIsKeyManagerOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<StudentOMRResult | null>(null);

  // Scan Mode: 'camera' | 'batch'
  const [scanMode, setScanMode] = useState<'camera' | 'batch'>('camera');

  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Native Camera File Input (works 100% on mobile without WebRTC permission blocks)
  const cameraFileInputRef = useRef<HTMLInputElement>(null);

  // Batch Upload State
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Scanned Results
  const [scannedStudents, setScannedStudents] = useState<StudentOMRResult[]>(() => {
    try {
      const saved = localStorage.getItem('eduplan_omr_scanned_students');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('eduplan_omr_scanned_students', JSON.stringify(scannedStudents));
    } catch {}
  }, [scannedStudents]);

  // Handle single photo capture from native camera or file picker
  const handleSingleImageCapture = async (file: File) => {
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((res) => (img.onload = res));

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      const firstKey = Object.keys(examKeys)[0] || '101';
      const result = processOMRSheetCanvas(canvas, examKeys, firstKey);
      setScannedStudents((prev) => [result, ...prev]);
      setDetailStudent(result);
      URL.revokeObjectURL(img.src);
    } catch (err: any) {
      console.error('Error processing captured sheet:', err);
    }
  };

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Môi trường hiện tại không hỗ trợ WebRTC Camera trực tiếp. Vui lòng bấm "Mở Camera Chụp Ảnh" hoặc "Tải ảnh bài làm" để chấm bài.'
        );
        setIsCameraActive(false);
        return;
      }

      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      const isDenied =
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.message?.toLowerCase().includes('denied') ||
        err.message?.toLowerCase().includes('permission');

      if (isDenied) {
        setCameraError(
          'Quyền truy cập Camera bị từ chối trong trình duyệt hoặc iframe. Bạn hãy bấm nút "Mở Camera Chụp Ảnh" bên dưới để chụp trực tiếp từ máy (không cần quyền WebRTC), hoặc chuyển sang chế độ "Tải ảnh hàng loạt".'
        );
      } else {
        setCameraError(
          `Không thể kết nối Camera (${err.name || err.message || 'Thiết bị bận'}). Vui lòng thử lại hoặc bấm chụp/tải ảnh bài làm.`
        );
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scanMode, facingMode]);

  // Capture from live camera
  const handleCaptureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const firstKey = Object.keys(examKeys)[0] || '101';
    const result = processOMRSheetCanvas(canvas, examKeys, firstKey);

    setScannedStudents((prev) => [result, ...prev]);
    setDetailStudent(result); // Show detail preview immediately
  };

  // Batch Image Upload
  const handleBatchUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setBatchProgress({ current: 0, total: files.length });
    const newResults: StudentOMRResult[] = [];
    const firstKey = Object.keys(examKeys)[0] || '101';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((res) => (img.onload = res));

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);

        const result = processOMRSheetCanvas(canvas, examKeys, firstKey);
        newResults.push(result);
        URL.revokeObjectURL(img.src);
      } catch (err) {
        console.error('Error processing batch image:', err);
      }
      setBatchProgress({ current: i + 1, total: files.length });
    }

    setScannedStudents((prev) => [...newResults, ...prev]);
    setBatchProgress(null);
  };

  // Quick edit SBD, Code, Essay Score
  const handleUpdateStudent = (id: string, updates: Partial<StudentOMRResult>) => {
    setScannedStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...updates };
        if (updates.essayScore !== undefined || updates.examCode !== undefined) {
          const essay = updated.essayScore || 0;
          updated.totalScore = Number(Math.min(10.0, updated.scorePart1 + updated.scorePart2 + updated.scorePart3 + essay).toFixed(2));
        }
        return updated;
      })
    );
    if (detailStudent && detailStudent.id === id) {
      setDetailStudent((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const handleDeleteStudent = (id: string) => {
    setScannedStudents((prev) => prev.filter((s) => s.id !== id));
    if (detailStudent?.id === id) setDetailStudent(null);
  };

  // Summary statistics
  const totalCount = scannedStudents.length;
  const avgScore =
    totalCount > 0
      ? Number((scannedStudents.reduce((sum, s) => sum + s.totalScore, 0) / totalCount).toFixed(2))
      : 0;
  const maxScore = totalCount > 0 ? Math.max(...scannedStudents.map((s) => s.totalScore)) : 0;
  const minScore = totalCount > 0 ? Math.min(...scannedStudents.map((s) => s.totalScore)) : 0;
  const reviewCount = scannedStudents.filter((s) => s.needsReview).length;

  const keyCount = Object.keys(examKeys).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <Camera className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Chấm Bài Bằng Camera OMR (Chuẩn Bộ GD&ĐT 2018)
              </h2>
              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200 dark:border-emerald-800">
                100% Client-side
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhận diện 4 góc định vị, SBD 6 số, Mã đề 3 số, Phần I, Phần II lũy tiến và Phần III 100% tô tròn các cột dọc.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Answer Key Manager Button */}
            <button
              onClick={() => setIsKeyManagerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Quản lý Đáp án ({keyCount} mã)</span>
            </button>

            {/* Print Standard Sheet Button */}
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>In Phiếu Chuẩn Bộ (A4)</span>
            </button>

            {/* Export Scores to Excel */}
            <button
              onClick={() => exportScoresToExcel(scannedStudents)}
              disabled={scannedStudents.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Bảng Điểm (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Warning if no keys exist */}
        {keyCount === 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Chưa có mã đề nào trong hệ thống! Vui lòng nhập đáp án hoặc trộn đề từ file gốc trước khi chấm.</span>
            </div>
            <button
              onClick={() => setIsKeyManagerOpen(true)}
              className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
            >
              Nhập đáp án ngay
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left Scanner / Right Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera & Upload (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scanner Mode Toggle */}
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setScanMode('camera')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                scanMode === 'camera'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Quét trực tiếp Camera</span>
            </button>

            <button
              onClick={() => setScanMode('batch')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                scanMode === 'batch'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Tải ảnh hàng loạt ({totalCount})</span>
            </button>
          </div>

          {/* Camera View */}
          {scanMode === 'camera' && (
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-3/4 flex items-center justify-center border border-slate-700 shadow-md">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Overlay Guide (4 Corners) */}
              <div className="absolute inset-4 pointer-events-none border border-white/20 rounded-xl">
                {/* 4 corner brackets */}
                <div className="absolute top-2 left-2 w-10 h-10 border-t-4 border-l-4 border-emerald-400" />
                <div className="absolute top-2 right-2 w-10 h-10 border-t-4 border-r-4 border-emerald-400" />
                <div className="absolute bottom-2 left-2 w-10 h-10 border-b-4 border-l-4 border-emerald-400" />
                <div className="absolute bottom-2 right-2 w-10 h-10 border-b-4 border-r-4 border-emerald-400" />

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white/70 text-xs px-3 py-1.5 bg-black/50 backdrop-blur-xs rounded-full">
                  Căn chỉnh 4 góc đen vào trong khung
                </div>
              </div>

              {/* Native Device Camera File Input */}
              <input
                ref={cameraFileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSingleImageCapture(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {/* Camera Error banner */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center text-white space-y-3 z-20">
                  <AlertTriangle className="w-10 h-10 text-amber-400" />
                  <div className="text-xs font-semibold text-amber-200 max-w-sm leading-relaxed">
                    {cameraError}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 w-full max-w-xs">
                    <button
                      onClick={() => cameraFileInputRef.current?.click()}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Chụp ảnh từ điện thoại</span>
                    </button>
                    <button
                      onClick={() => setScanMode('batch')}
                      className="flex-1 py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Tải ảnh từ máy</span>
                    </button>
                  </div>
                  <button
                    onClick={startCamera}
                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer pt-1"
                  >
                    Thử lại cấp quyền WebRTC
                  </button>
                </div>
              )}

              {/* Camera Controls Bar */}
              <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-auto">
                <button
                  onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="p-3 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-full transition-all cursor-pointer"
                  title="Đổi camera trước/sau"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                <button
                  onClick={handleCaptureFromCamera}
                  className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-full shadow-lg transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>CHỤP & CHẤM NGAY</span>
                </button>

                <button
                  onClick={() => cameraFileInputRef.current?.click()}
                  className="p-3 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-full transition-all cursor-pointer"
                  title="Chụp bằng Camera máy hoặc chọn ảnh từ máy"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Batch Upload View */}
          {scanMode === 'batch' && (
            <div className="space-y-4">
              <div
                onClick={() => batchFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-10 text-center bg-white dark:bg-slate-900/50 hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col items-center justify-center group"
              >
                <input
                  ref={batchFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) handleBatchUpload(e.target.files);
                  }}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Kéo thả hoặc bấm để chọn ảnh phiếu bài làm
                </h4>
                <p className="text-xs text-slate-400 mt-2 max-w-sm">
                  Hỗ trợ tải 10, 20, 50 ảnh chụp cùng một lúc. Tốc độ nhận diện tức thì (&lt; 0.1s / phiếu).
                </p>
                <div className="mt-4 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold">
                  Chấp nhận định dạng: JPG, PNG, JPEG
                </div>
              </div>

              {batchProgress && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Đang xử lý OMR...</span>
                    <span>
                      {batchProgress.current} / {batchProgress.total} phiếu
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-150"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Classroom Summary & Graded Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Tổng số bài</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Điểm trung bình</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{avgScore}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Cao nhất / Thấp nhất</span>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {maxScore} <span className="text-slate-300 font-normal">/</span> {minScore}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Cần xem lại</span>
              <div className={`text-2xl font-black mt-1 ${reviewCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                {reviewCount}
              </div>
            </div>
          </div>

          {/* Graded Students Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Bảng Điểm Chi Tiết Lớp ({scannedStudents.length} học sinh)
              </span>

              {scannedStudents.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Bạn có chắc muốn xóa tất cả kết quả chấm hiện tại để chấm đợt mới?')) {
                      setScannedStudents([]);
                    }
                  }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa đợt chấm</span>
                </button>
              )}
            </div>

            {scannedStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Chưa có bài thi nào được chấm. Bấm <b>Chụp & Chấm ngay</b> hoặc <b>Tải ảnh hàng loạt</b> để bắt đầu.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[520px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">STT</th>
                      <th className="px-3 py-2.5">SBD</th>
                      <th className="px-3 py-2.5">Mã đề</th>
                      <th className="px-2 py-2.5">P.I</th>
                      <th className="px-2 py-2.5">P.II</th>
                      <th className="px-2 py-2.5">P.III</th>
                      <th className="px-2 py-2.5">Tự luận</th>
                      <th className="px-3 py-2.5 text-right">Tổng điểm</th>
                      <th className="px-3 py-2.5 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {scannedStudents.map((s, idx) => (
                      <tr
                        key={s.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                          s.needsReview ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-bold font-mono text-slate-800 dark:text-slate-100">
                          {s.studentId}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono rounded font-bold border border-blue-200 dark:border-blue-900">
                            {s.examCode}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-slate-600 dark:text-slate-300 font-mono">{s.scorePart1}</td>
                        <td className="px-2 py-2.5 text-slate-600 dark:text-slate-300 font-mono">{s.scorePart2}</td>
                        <td className="px-2 py-2.5 text-slate-600 dark:text-slate-300 font-mono">{s.scorePart3}</td>
                        <td className="px-2 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.25"
                            value={s.essayScore ?? 0}
                            onChange={(e) => handleUpdateStudent(s.id, { essayScore: parseFloat(e.target.value) || 0 })}
                            className="w-14 px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-sm text-red-600 dark:text-red-400 font-mono">
                          {s.totalScore.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setDetailStudent(s)}
                              title="Xem chi tiết & Overlay tờ phiếu"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(s.id)}
                              title="Xóa bài này"
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DETAIL MODAL: VIEW ANNOTATED SHEET WITH GREEN/RED OVERLAY */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Eye className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Chi Tiết Bài Chấm — SBD: {detailStudent.studentId} • Mã Đề: {detailStudent.examCode}
                  </h3>
                  <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                    <span>P.I: {detailStudent.scorePart1}đ</span>
                    <span>•</span>
                    <span>P.II: {detailStudent.scorePart2}đ</span>
                    <span>•</span>
                    <span>P.III: {detailStudent.scorePart3}đ</span>
                    <span>•</span>
                    <span className="font-bold text-red-600">Tổng điểm: {detailStudent.totalScore} / 10.0</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDetailStudent(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Annotated Image Column (7 cols) */}
              <div className="md:col-span-7 bg-slate-950 p-2 rounded-xl flex items-center justify-center">
                {detailStudent.annotatedImageUrl ? (
                  <img
                    src={detailStudent.annotatedImageUrl}
                    alt="Phiếu bài thi kèm overlay"
                    className="max-h-[600px] w-auto object-contain rounded border border-slate-800"
                  />
                ) : (
                  <div className="text-slate-400 text-xs py-20">Không có ảnh tờ phiếu</div>
                )}
              </div>

              {/* Answers Breakdown Column (5 cols) */}
              <div className="md:col-span-5 space-y-4 text-xs overflow-y-auto max-h-[600px] pr-1">
                {/* Manual Edit Header */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Chỉnh sửa thông tin học sinh:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">SBD:</label>
                      <input
                        type="text"
                        value={detailStudent.studentId}
                        onChange={(e) => handleUpdateStudent(detailStudent.id, { studentId: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Mã đề:</label>
                      <input
                        type="text"
                        value={detailStudent.examCode}
                        onChange={(e) => handleUpdateStudent(detailStudent.id, { examCode: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Điểm tự luận (nếu có):</label>
                    <input
                      type="number"
                      step="0.25"
                      value={detailStudent.essayScore ?? 0}
                      onChange={(e) => handleUpdateStudent(detailStudent.id, { essayScore: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>

                {/* Part 1 Breakdown */}
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                    Phần I: Trắc nghiệm ({detailStudent.part1Results.length} câu)
                  </h5>
                  <div className="grid grid-cols-4 gap-1">
                    {detailStudent.part1Results.map((r) => (
                      <div
                        key={r.qNum}
                        className={`p-1.5 rounded border text-center font-mono ${
                          r.isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-800 dark:text-red-300'
                        }`}
                      >
                        <div className="font-bold">C{r.qNum}</div>
                        <div>{r.chosen || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Part 2 Breakdown */}
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                    Phần II: Đúng / Sai ({detailStudent.part2Results.length} câu)
                  </h5>
                  <div className="space-y-1">
                    {detailStudent.part2Results.map((r) => (
                      <div
                        key={r.qNum}
                        className="p-1.5 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                      >
                        <span className="font-bold">Câu {r.qNum}:</span>
                        <div className="flex gap-1">
                          {r.statements.map((s) => (
                            <span
                              key={s.label}
                              className={`px-1 rounded text-[10px] font-bold ${
                                s.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {s.label}:{s.chosen ? 'Đ' : s.chosen === false ? 'S' : '—'}
                            </span>
                          ))}
                        </div>
                        <span className="font-bold text-blue-600">+{r.score}đ</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Part 3 Breakdown */}
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                    Phần III: Trả lời ngắn ({detailStudent.part3Results.length} câu)
                  </h5>
                  <div className="space-y-1">
                    {detailStudent.part3Results.map((r) => (
                      <div
                        key={r.qNum}
                        className={`p-1.5 rounded border flex items-center justify-between ${
                          r.isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-800 dark:text-red-300'
                        }`}
                      >
                        <span className="font-bold">Câu {r.qNum}:</span>
                        <span className="font-mono">Tô: "{r.rawString || '—'}"</span>
                        <span className="font-mono text-slate-500">ĐA: {r.correctKey}</span>
                        <span className="font-bold">+{r.score}đ</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setDetailStudent(null)}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Answer Key Manager Modal */}
      <AnswerKeyManagerModal
        isOpen={isKeyManagerOpen}
        onClose={() => setIsKeyManagerOpen(false)}
        examKeys={examKeys}
        onSaveKeys={handleSaveKeys}
      />

      {/* Print Standard Sheet Modal */}
      <OMRPrintSheetModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
