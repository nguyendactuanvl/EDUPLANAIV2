import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Camera, Settings, Users, FileText, BarChart2, CheckSquare, 
  RotateCcw, Volume2, Upload, Download, Printer, Eye, Trash2, 
  Plus, Check, X, RefreshCw, Zap, ShieldCheck, Sparkles, Filter, 
  Search, AlertCircle, Award, Smartphone, FileSpreadsheet, Play, Pause, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { XLSX } from '../lib/xlsxUtils';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';
import { 
  OMRTemplateType, Student, ExamAnswerKey, OMRGradingResult 
} from './omr/OMRTypes';
import { 
  generateOMRPdf, exportExamSheetPDF 
} from './omr/OMRPdfGenerator';
import { 
  playBeepSound, triggerVibration, detectCornerAnchors, 
  analyzeNormalizedSheet, gradeStudentSubmission, NORM_WIDTH, NORM_HEIGHT 
} from './omr/OMREngine';

export { exportExamSheetPDF };

// ============================================================================
// INITIAL SEED DATA GENERATORS
// ============================================================================
const DEFAULT_PRESET_CODES = [
  '1201', '1202', '1203', '1204',
  '1101', '1102', '1103', '1104',
  '1001', '1002', '1003', '1004'
];

function generateDefaultKeys(): Record<string, ExamAnswerKey> {
  const keys: Record<string, ExamAnswerKey> = {};
  DEFAULT_PRESET_CODES.forEach((code, idx) => {
    const opts = ['A', 'B', 'C', 'D'];
    const partI: Record<number, string> = {};
    for (let q = 1; q <= 12; q++) {
      partI[q] = opts[(q + idx) % 4];
    }
    const partII: Record<number, { a: boolean; b: boolean; c: boolean; d: boolean }> = {
      1: { a: true, b: false, c: true, d: false },
      2: { a: false, b: true, c: true, d: true },
      3: { a: true, b: true, c: false, d: false },
      4: { a: false, b: false, c: true, d: true }
    };
    const partIII: Record<number, string> = {
      1: '12', 2: '4.5', 3: '25', 4: '-3', 5: '0.8', 6: '100'
    };
    keys[code] = {
      code,
      templateType: 'gdpt_2018',
      title: `Đề thi trắc nghiệm Mã ${code}`,
      partI,
      partII,
      partIII,
      pointsConfig: {
        partI_per_question: 0.25,
        partII_1: 0.1,
        partII_2: 0.25,
        partII_3: 0.5,
        partII_4: 1.0,
        partIII_per_question: 0.5
      }
    };
  });
  return keys;
}

function generateDefaultStudents(): Student[] {
  const students: Student[] = [];
  const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
  const midNames = ['Văn', 'Thị', 'Đức', 'Thanh', 'Hữu', 'Minh', 'Ngọc', 'Quốc', 'Gia', 'Hải'];
  const firstNames = ['An', 'Bình', 'Châu', 'Dũng', 'Đạt', 'Giang', 'Hà', 'Hải', 'Khánh', 'Linh', 'Minh', 'Nam', 'Nhi', 'Phúc', 'Quân', 'Sơn', 'Tâm', 'Thảo', 'Trí', 'Tú', 'Uyên', 'Việt', 'Vy', 'Xuân'];

  for (let i = 1; i <= 35; i++) {
    const sbd = `000${(100 + i).toString().slice(-3)}`;
    const l = lastNames[i % lastNames.length];
    const m = midNames[i % midNames.length];
    const f = firstNames[i % firstNames.length];
    students.push({
      sbd,
      name: `${l} ${m} ${f}`,
      className: '12A1',
      dob: '2008-05-15',
      note: 'Học sinh chính thức'
    });
  }
  return students;
}

export function OMRWorkspace() {
  const [activeTab, setActiveTab] = useState<'scan' | 'config' | 'students' | 'print' | 'results'>('scan');

  // Persistence States
  const [templateType, setTemplateType] = useState<OMRTemplateType>(() => {
    return (localStorage.getItem('eduplan_omr_template') as OMRTemplateType) || 'gdpt_2018';
  });

  const [answerKeys, setAnswerKeys] = useState<Record<string, ExamAnswerKey>>(() => {
    try {
      const saved = localStorage.getItem('eduplan_omr_keys');
      return saved ? JSON.parse(saved) : generateDefaultKeys();
    } catch (e) {
      return generateDefaultKeys();
    }
  });

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('eduplan_omr_students');
      return saved ? JSON.parse(saved) : generateDefaultStudents();
    } catch (e) {
      return generateDefaultStudents();
    }
  });

  const [submissions, setSubmissions] = useState<OMRGradingResult[]>(() => {
    try {
      const saved = localStorage.getItem('eduplan_omr_submissions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('eduplan_omr_template', templateType);
  }, [templateType]);

  useEffect(() => {
    localStorage.setItem('eduplan_omr_keys', JSON.stringify(answerKeys));
  }, [answerKeys]);

  useEffect(() => {
    localStorage.setItem('eduplan_omr_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('eduplan_omr_submissions', JSON.stringify(submissions));
  }, [submissions]);

  const tabs = [
    { id: 'scan', label: '1. Chấm bài trực tiếp', icon: Camera, badge: submissions.length },
    { id: 'config', label: '2. Ma trận đáp án (Mã đề)', icon: Settings, badge: Object.keys(answerKeys).length },
    { id: 'students', label: '3. Danh sách thí sinh', icon: Users, badge: students.length },
    { id: 'print', label: '4. In phiếu thi PDF', icon: FileText },
    { id: 'results', label: '5. Kết quả & Xuất Excel', icon: BarChart2, badge: submissions.length },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
      {/* Top Header */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              EDUPLANAI MARK <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">OMR 100% Client-Side</span>
            </h1>
            <p className="text-xs text-slate-400">Chấm thi trắc nghiệm bằng Camera chuẩn Bộ GD&ĐT 2018 & TNMaker</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                    isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'scan' && (
          <ScannerTab 
            templateType={templateType}
            answerKeys={answerKeys}
            students={students}
            onSaveSubmission={(sub) => {
              setSubmissions(prev => [sub, ...prev.filter(s => s.id !== sub.id)]);
            }}
            onSwitchTab={setActiveTab}
          />
        )}

        {activeTab === 'config' && (
          <ConfigTab 
            templateType={templateType}
            setTemplateType={setTemplateType}
            answerKeys={answerKeys}
            setAnswerKeys={setAnswerKeys}
          />
        )}

        {activeTab === 'students' && (
          <StudentsTab 
            students={students} 
            setStudents={setStudents} 
          />
        )}

        {activeTab === 'print' && (
          <TemplatesTab 
            templateType={templateType}
            setTemplateType={setTemplateType}
          />
        )}

        {activeTab === 'results' && (
          <ResultsTab 
            submissions={submissions}
            setSubmissions={setSubmissions}
            students={students}
            answerKeys={answerKeys}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// TAB 1: SCANNER TAB (CAMERA & UPLOAD OMR ENGINE)
// ============================================================================
function ScannerTab({ 
  templateType, 
  answerKeys, 
  students, 
  onSaveSubmission,
  onSwitchTab
}: { 
  templateType: OMRTemplateType; 
  answerKeys: Record<string, ExamAnswerKey>; 
  students: Student[]; 
  onSaveSubmission: (s: OMRGradingResult) => void;
  onSwitchTab: (tab: any) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Settings
  const [continuousMode, setContinuousMode] = useState(true);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [vibrateFeedback, setVibrateFeedback] = useState(true);
  const [showResultModal, setShowResultModal] = useState(true);

  // Real-time states
  const [scanStatus, setScanStatus] = useState<string>("Sẵn sàng bật camera để chấm bài");
  const [currentGradedResult, setCurrentGradedResult] = useState<OMRGradingResult | null>(null);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lastGradedTime = useRef<number>(0);

  // Query media devices
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevs = devices.filter(d => d.kind === 'videoinput');
        setCameraDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          // Default to environment (back) camera
          const backCam = videoDevs.find(d => /back|environment|sau/i.test(d.label)) || videoDevs[videoDevs.length - 1];
          setSelectedDeviceId(backCam.deviceId);
        }
      }).catch(console.warn);
    }
  }, []);

  // Start / Stop Camera Stream
  const startCamera = async () => {
    try {
      setScanStatus("Đang khởi động camera...");
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setScanStatus("Đang tìm và căn 4 góc phiếu thi...");

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(Boolean(capabilities.torch));
    } catch (err: any) {
      console.error("Camera error:", err);
      setScanStatus(`Lỗi mở camera: ${err.message || 'Không thể truy cập camera'}. Hãy kiểm tra quyền cấp phép.`);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setScanStatus("Camera đã tắt");
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({ advanced: [{ torch: nextTorch }] });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch toggle failed:", e);
    }
  };

  // Perform single frame processing
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;
    if (isProcessingFrame) return;

    // Throttle scan rate to prevent overheating (~3 scans per second)
    const now = Date.now();
    if (now - lastGradedTime.current < (continuousMode ? 1800 : 800)) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video stream
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 960;
      canvas.height = video.videoHeight || 720;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 1. Detect 4 Corner Anchors
    const anchors = detectCornerAnchors(ctx, canvas.width, canvas.height);

    // Draw visual feedback overlay on the preview
    ctx.lineWidth = 3;
    if (anchors) {
      ctx.strokeStyle = '#10b981';
      ctx.fillStyle = '#10b981';
      // Draw 4 corner indicators
      [anchors.topLeft, anchors.topRight, anchors.bottomLeft, anchors.bottomRight].forEach(pt => {
        ctx.strokeRect(pt.x - 14, pt.y - 14, 28, 28);
        ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
      });
      // Draw polygon outline
      ctx.beginPath();
      ctx.moveTo(anchors.topLeft.x, anchors.topLeft.y);
      ctx.lineTo(anchors.topRight.x, anchors.topRight.y);
      ctx.lineTo(anchors.bottomRight.x, anchors.bottomRight.y);
      ctx.lineTo(anchors.bottomLeft.x, anchors.bottomLeft.y);
      ctx.closePath();
      ctx.stroke();

      setScanStatus("✅ Đã bắt trúng 4 góc phiếu! Đang đọc dữ liệu...");

      // Warp / normalize to standard A4 sheet
      const normCanvas = document.createElement('canvas');
      normCanvas.width = NORM_WIDTH;
      normCanvas.height = NORM_HEIGHT;
      const normCtx = normCanvas.getContext('2d')!;

      // Simple perspective / affine map
      normCtx.drawImage(
        canvas,
        anchors.topLeft.x,
        anchors.topLeft.y,
        Math.max(10, anchors.topRight.x - anchors.topLeft.x),
        Math.max(10, anchors.bottomLeft.y - anchors.topLeft.y),
        0,
        0,
        NORM_WIDTH,
        NORM_HEIGHT
      );

      // Execute OMR decoding
      executeGrading(normCanvas);
    } else {
      // Draw centered guide box to help user position the sheet
      const boxW = canvas.width * 0.72;
      const boxH = boxW * 1.414 > canvas.height * 0.9 ? canvas.height * 0.88 : boxW * 1.414;
      const bx = (canvas.width - boxW) / 2;
      const by = (canvas.height - boxH) / 2;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(bx, by, boxW, boxH);
      ctx.setLineDash([]);

      // Corner markers
      const cLen = 24;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      // TL
      ctx.beginPath(); ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by); ctx.stroke();
      // TR
      ctx.beginPath(); ctx.moveTo(bx + boxW - cLen, by); ctx.lineTo(bx + boxW, by); ctx.lineTo(bx + boxW, by + cLen); ctx.stroke();
      // BL
      ctx.beginPath(); ctx.moveTo(bx, by + boxH - cLen); ctx.lineTo(bx, by + boxH); ctx.lineTo(bx + cLen, by + boxH); ctx.stroke();
      // BR
      ctx.beginPath(); ctx.moveTo(bx + boxW - cLen, by + boxH); ctx.lineTo(bx + boxW, by + boxH); ctx.lineTo(bx + boxW, by + boxH - cLen); ctx.stroke();

      setScanStatus("Căn 4 góc phiếu thi vào khung ngắm để tự động chấm...");
    }
  }, [isProcessingFrame, continuousMode, selectedDeviceId]);

  // Main grading executor
  const executeGrading = (normCanvas: HTMLCanvasElement) => {
    setIsProcessingFrame(true);
    try {
      const scanDetail = analyzeNormalizedSheet(normCanvas, templateType);

      // Grade submission
      const result = gradeStudentSubmission(scanDetail, answerKeys, students, templateType);

      // Feedback
      if (audioFeedback) playBeepSound('success');
      if (vibrateFeedback) triggerVibration();

      lastGradedTime.current = Date.now();
      setCurrentGradedResult(result);
      onSaveSubmission(result);

      setScanStatus(`🎉 Đã chấm xong! SBD: ${result.sbd} - Điểm: ${result.totalScore}đ (${result.studentName})`);

      if (continuousMode) {
        setAutoNextCountdown(2);
      }
    } catch (err: any) {
      console.warn("Grading error:", err);
      if (audioFeedback) playBeepSound('warning');
      setScanStatus(`Lỗi đọc phiếu: ${err.message || 'Chưa nhận diện rõ ô tô'}`);
    } finally {
      setIsProcessingFrame(false);
    }
  };

  // Continuous loop
  useEffect(() => {
    if (isCameraActive) {
      const loop = () => {
        processFrame();
        animFrameId.current = requestAnimationFrame(loop);
      };
      animFrameId.current = requestAnimationFrame(loop);
      return () => {
        if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      };
    }
  }, [isCameraActive, processFrame]);

  // Auto-next countdown for continuous mode
  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown <= 0) {
      setAutoNextCountdown(null);
      setCurrentGradedResult(null);
      return;
    }
    const timer = setTimeout(() => {
      setAutoNextCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoNextCountdown]);

  // Handle Image File Upload (Fallback for testing or desktop without webcam)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanStatus("Đang đọc ảnh bài thi tải lên...");
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const normCanvas = document.createElement('canvas');
        normCanvas.width = NORM_WIDTH;
        normCanvas.height = NORM_HEIGHT;
        const normCtx = normCanvas.getContext('2d')!;
        normCtx.drawImage(img, 0, 0, NORM_WIDTH, NORM_HEIGHT);
        executeGrading(normCanvas);
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer",
              isCameraActive 
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
            )}
          >
            <Camera className="w-4 h-4" />
            <span>{isCameraActive ? 'Dừng Camera' : 'Bật Camera Chấm Thi'}</span>
          </button>

          {/* Camera Device Selector */}
          {cameraDevices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                if (isCameraActive) {
                  stopCamera();
                  setTimeout(startCamera, 300);
                }
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-hidden focus:border-emerald-500"
            >
              {cameraDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Flash Toggle */}
          {hasTorch && isCameraActive && (
            <button
              onClick={toggleTorch}
              className={cn(
                "p-2.5 rounded-xl border transition-colors cursor-pointer",
                isTorchOn 
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
              )}
              title="Bật/Tắt Đèn Flash"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}

          {/* Upload Picture Fallback */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Tải ảnh phiếu thi</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Mode Toggles */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <input 
              type="checkbox" 
              checked={continuousMode} 
              onChange={e => setContinuousMode(e.target.checked)} 
              className="rounded-sm accent-emerald-500" 
            />
            <span className="text-slate-300">Chấm liên tiếp (1.5s)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <input 
              type="checkbox" 
              checked={audioFeedback} 
              onChange={e => setAudioFeedback(e.target.checked)} 
              className="rounded-sm accent-emerald-500" 
            />
            <span className="text-slate-300">Âm báo Bíp</span>
          </label>
        </div>
      </div>

      {/* Main Viewport & Overlay */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Video Scanner Viewport */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
            {/* Live Video */}
            <video 
              ref={videoRef} 
              playsInline 
              muted 
              className={cn("w-full h-full object-cover", !isCameraActive && "hidden")} 
            />
            {/* Canvas for rendering edge detection & anchors */}
            <canvas 
              ref={canvasRef} 
              className={cn("absolute inset-0 w-full h-full object-cover pointer-events-none", !isCameraActive && "hidden")} 
            />

            {/* Offline / Placeholder Screen */}
            {!isCameraActive && (
              <div className="text-center p-6 space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <Smartphone className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Camera đang tắt</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Nhấn nút <strong className="text-emerald-400 font-semibold">"Bật Camera Chấm Thi"</strong> để bắt đầu quét tự động hoặc bấm <strong className="text-sky-400 font-semibold">"Tải ảnh phiếu thi"</strong> để chấm từ file ảnh có sẵn.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={startCamera}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" /> Bật Camera Ngay
                  </button>
                </div>
              </div>
            )}

            {/* Scanning Status Bar */}
            <div className="absolute bottom-3 inset-x-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2 truncate">
                <span className={cn("w-2 h-2 rounded-full", isCameraActive ? "bg-emerald-400 animate-ping" : "bg-slate-500")} />
                {scanStatus}
              </span>
              {autoNextCountdown !== null && (
                <span className="text-emerald-400 font-bold shrink-0">
                  Tự chuyển bài tiếp sau {autoNextCountdown}s...
                </span>
              )}
            </div>
          </div>

          {/* Quick Guide */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Mẹo chấm chính xác 100%:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Để phiếu thi phẳng trên mặt bàn có đủ ánh sáng, tránh bóng đổ tay hoặc điện thoại lên vùng ô tô.</li>
              <li>Giữ camera song song với mặt bàn sao cho 4 góc màu đen của phiếu lọt trọn vào khung ngắm.</li>
              <li>Hệ thống tự động nhận diện Mã đề thi 4 chữ số (ví dụ: <span className="text-emerald-400 font-mono">1201</span>) và Số báo danh 6 số.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Instant Graded Result Card */}
        <div className="space-y-4">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Kết Quả Vừa Chấm</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {currentGradedResult ? new Date(currentGradedResult.timestamp).toLocaleTimeString('vi-VN') : 'Chờ bài thi...'}
              </span>
            </div>

            {currentGradedResult ? (
              <div className="space-y-4">
                {/* Score Hero */}
                <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 p-4 rounded-xl border border-emerald-500/30 text-center space-y-1">
                  <div className="text-4xl font-extrabold text-emerald-400 tracking-tight">
                    {currentGradedResult.totalScore.toFixed(2)}
                    <span className="text-sm text-slate-400 font-normal"> / 10đ</span>
                  </div>
                  <div className="text-xs text-slate-300 font-medium truncate">
                    {currentGradedResult.studentName}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    SBD: <strong className="text-white">{currentGradedResult.sbd}</strong> • Lớp: <strong className="text-white">{currentGradedResult.studentClass || '12A1'}</strong> • Mã đề: <strong className="text-emerald-400">{currentGradedResult.examCode}</strong>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-300">Phần I (Trắc nghiệm):</span>
                    <span className="font-bold text-white">{currentGradedResult.partI_correct}/{currentGradedResult.partI_total} câu ({currentGradedResult.partI_score}đ)</span>
                  </div>

                  {templateType === 'gdpt_2018' && (
                    <>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-300">Phần II (Đúng/Sai):</span>
                        <span className="font-bold text-white">{currentGradedResult.partII_score} điểm</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-300">Phần III (Trả lời ngắn):</span>
                        <span className="font-bold text-white">{currentGradedResult.partIII_correct}/{currentGradedResult.partIII_total} câu ({currentGradedResult.partIII_score}đ)</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Photo Review Thumbnail */}
                {currentGradedResult.capturedImageUrl && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">Ảnh bài thi có đánh dấu kết quả:</span>
                    <div className="rounded-xl overflow-hidden border border-slate-800 aspect-[3/4] bg-black">
                      <img 
                        src={currentGradedResult.capturedImageUrl} 
                        alt="Bài chấm" 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <CheckSquare className="w-10 h-10 mx-auto text-slate-700" />
                <p className="text-xs">Chưa có bài thi nào được chấm trong phiên này.</p>
              </div>
            )}

            {/* Quick Link to Results Tab */}
            <button
              onClick={() => onSwitchTab('results')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
            >
              <span>Xem toàn bộ bảng điểm đã chấm</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2: CONFIG / ANSWER KEY MATRIX TAB
// ============================================================================
function ConfigTab({
  templateType,
  setTemplateType,
  answerKeys,
  setAnswerKeys
}: {
  templateType: OMRTemplateType;
  setTemplateType: (t: OMRTemplateType) => void;
  answerKeys: Record<string, ExamAnswerKey>;
  setAnswerKeys: React.Dispatch<React.SetStateAction<Record<string, ExamAnswerKey>>>;
}) {
  const codes = Object.keys(answerKeys);
  const [selectedCode, setSelectedCode] = useState<string>(codes[0] || '1201');
  const [newCodeInput, setNewCodeInput] = useState<string>('');

  const activeKey = answerKeys[selectedCode] || {
    code: selectedCode,
    templateType,
    partI: {},
    partII: {},
    partIII: {}
  };

  // Switch question answer for Part I
  const handlePartIChange = (qNum: number, opt: string) => {
    setAnswerKeys(prev => {
      const current = prev[selectedCode] || { code: selectedCode, templateType, partI: {}, partII: {}, partIII: {} };
      return {
        ...prev,
        [selectedCode]: {
          ...current,
          partI: {
            ...current.partI,
            [qNum]: current.partI[qNum] === opt ? '' : opt
          }
        }
      };
    });
  };

  // Switch statement answer for Part II (True / False)
  const handlePartIIChange = (qNum: number, stmt: 'a' | 'b' | 'c' | 'd', val: boolean) => {
    setAnswerKeys(prev => {
      const current = prev[selectedCode] || { code: selectedCode, templateType, partI: {}, partII: {}, partIII: {} };
      const currentQ = current.partII[qNum] || {};
      return {
        ...prev,
        [selectedCode]: {
          ...current,
          partII: {
            ...current.partII,
            [qNum]: {
              ...currentQ,
              [stmt]: currentQ[stmt] === val ? undefined : val
            }
          }
        }
      };
    });
  };

  // Part III Short Answer input
  const handlePartIIIChange = (qNum: number, val: string) => {
    setAnswerKeys(prev => {
      const current = prev[selectedCode] || { code: selectedCode, templateType, partI: {}, partII: {}, partIII: {} };
      return {
        ...prev,
        [selectedCode]: {
          ...current,
          partIII: {
            ...current.partIII,
            [qNum]: val
          }
        }
      };
    });
  };

  // Add 4-digit code
  const handleAddCode = () => {
    const clean = newCodeInput.trim().replace(/\D/g, '').padStart(4, '0').slice(-4);
    if (!clean) return;
    if (answerKeys[clean]) {
      alert(`Mã đề ${clean} đã tồn tại!`);
      setSelectedCode(clean);
      setNewCodeInput('');
      return;
    }
    const defaultPartI: Record<number, string> = {};
    const totalQ = templateType === 'gdpt_2018' ? 12 : templateType === 'tnmaker_20' ? 20 : templateType === 'tnmaker_40' ? 40 : 50;
    for (let i = 1; i <= totalQ; i++) defaultPartI[i] = ['A', 'B', 'C', 'D'][i % 4];

    setAnswerKeys(prev => ({
      ...prev,
      [clean]: {
        code: clean,
        templateType,
        partI: defaultPartI,
        partII: {
          1: { a: true, b: false, c: true, d: false },
          2: { a: false, b: true, c: false, d: true },
          3: { a: true, b: true, c: false, d: false },
          4: { a: false, b: false, c: true, d: true }
        },
        partIII: { 1: '10', 2: '2.5', 3: '-5', 4: '100', 5: '0.5', 6: '12' }
      }
    }));
    setSelectedCode(clean);
    setNewCodeInput('');
  };

  // Add Preset Set
  const handleApplyPresetSet = (prefix: '10' | '11' | '12') => {
    const newSet: Record<string, ExamAnswerKey> = { ...answerKeys };
    for (let i = 1; i <= 4; i++) {
      const c = `${prefix}0${i}`;
      if (!newSet[c]) {
        const defaultPartI: Record<number, string> = {};
        const totalQ = templateType === 'gdpt_2018' ? 12 : 20;
        for (let q = 1; q <= totalQ; q++) defaultPartI[q] = ['A', 'B', 'C', 'D'][(q + i) % 4];
        newSet[c] = {
          code: c,
          templateType,
          partI: defaultPartI,
          partII: {
            1: { a: true, b: false, c: true, d: false },
            2: { a: false, b: true, c: false, d: true },
            3: { a: true, b: true, c: false, d: false },
            4: { a: false, b: false, c: true, d: true }
          },
          partIII: { 1: '15', 2: '3', 3: '4.5', 4: '20', 5: '-1', 6: '80' }
        };
      }
    }
    setAnswerKeys(newSet);
    setSelectedCode(`${prefix}01`);
  };

  // Randomize current key for testing
  const handleRandomize = () => {
    const opts = ['A', 'B', 'C', 'D'];
    const totalQ = templateType === 'gdpt_2018' ? 12 : templateType === 'tnmaker_20' ? 20 : templateType === 'tnmaker_40' ? 40 : 50;
    const newP1: Record<number, string> = {};
    for (let q = 1; q <= totalQ; q++) {
      newP1[q] = opts[Math.floor(Math.random() * 4)];
    }
    const newP2: any = {};
    for (let q = 1; q <= 4; q++) {
      newP2[q] = {
        a: Math.random() > 0.5,
        b: Math.random() > 0.5,
        c: Math.random() > 0.5,
        d: Math.random() > 0.5
      };
    }
    setAnswerKeys(prev => ({
      ...prev,
      [selectedCode]: {
        ...prev[selectedCode],
        partI: newP1,
        partII: newP2
      }
    }));
  };

  // Export answer keys to Excel (.xlsx)
  const handleExportExcel = () => {
    const rows: any[] = [];
    Object.values(answerKeys).forEach(k => {
      // Part I
      Object.entries(k.partI).forEach(([q, ans]) => {
        rows.push({
          "Mã đề": k.code,
          "Phần": "Phần I",
          "Câu": parseInt(q, 10),
          "Đáp án Đúng": ans
        });
      });
      // Part II
      Object.entries(k.partII || {}).forEach(([q, stmts]) => {
        (['a', 'b', 'c', 'd'] as const).forEach(letter => {
          rows.push({
            "Mã đề": k.code,
            "Phần": "Phần II",
            "Câu": `${q}${letter}`,
            "Đáp án Đúng": stmts[letter] === true ? "Đúng" : stmts[letter] === false ? "Sai" : ""
          });
        });
      });
      // Part III
      Object.entries(k.partIII || {}).forEach(([q, ans]) => {
        rows.push({
          "Mã đề": k.code,
          "Phần": "Phần III",
          "Câu": parseInt(q, 10),
          "Đáp án Đúng": ans
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DapAn_OMR");
    XLSX.writeFile(wb, `MaTran_DapAn_OMR_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalQuestionsPartI = templateType === 'gdpt_2018' ? 12 : templateType === 'tnmaker_20' ? 20 : templateType === 'tnmaker_40' ? 40 : 50;

  return (
    <div className="space-y-6">
      {/* Template Type & Presets */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Cấu Hình Định Dạng & Mã Đề 4 Chữ Số</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Chọn mẫu phiếu và thiết lập đáp án cho từng mã đề thi</p>
          </div>

          {/* Template Format Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'gdpt_2018', label: 'Chuẩn GDPT 2018 (12-4-6)' },
              { id: 'tnmaker_20', label: 'TNMaker 20 câu' },
              { id: 'tnmaker_40', label: 'TNMaker 40 câu' },
              { id: 'tnmaker_50', label: 'TNMaker 50 câu' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTemplateType(t.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                  templateType === t.id
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Presets for Grade 10, 11, 12 */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Tạo nhanh bộ mã:</span>
            <button
              onClick={() => handleApplyPresetSet('12')}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 rounded-md font-mono font-bold transition-colors cursor-pointer"
            >
              + Khối 12 (1201-1204)
            </button>
            <button
              onClick={() => handleApplyPresetSet('11')}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-500/30 rounded-md font-mono font-bold transition-colors cursor-pointer"
            >
              + Khối 11 (1101-1104)
            </button>
            <button
              onClick={() => handleApplyPresetSet('10')}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 rounded-md font-mono font-bold transition-colors cursor-pointer"
            >
              + Khối 10 (1001-1004)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nhập mã 4 số..."
              value={newCodeInput}
              onChange={e => setNewCodeInput(e.target.value)}
              maxLength={4}
              className="w-28 px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md font-mono text-center outline-hidden focus:border-emerald-500"
            />
            <button
              onClick={handleAddCode}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold transition-colors cursor-pointer"
            >
              + Thêm mã
            </button>
          </div>
        </div>

        {/* Code Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 border-t border-slate-800/60">
          <span className="text-xs text-slate-400 mr-1 shrink-0 font-medium">Chọn Mã Đề:</span>
          {codes.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCode(c)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                selectedCode === c
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Answer Key Matrix Editor for Selected Code */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-black font-mono text-emerald-400 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              {selectedCode}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Ma Trận Đáp Án Mã {selectedCode}</h4>
              <p className="text-xs text-slate-400">Click chọn đáp án đúng cho từng câu hỏi</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRandomize}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Sinh đáp án ngẫu nhiên</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Section 1: Multiple Choice */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Phần I: Trắc nghiệm 4 lựa chọn ({totalQuestionsPartI} câu)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">0.25 điểm / câu</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: totalQuestionsPartI }).map((_, idx) => {
              const qNum = idx + 1;
              const selectedOpt = activeKey.partI[qNum] || '';
              return (
                <div key={qNum} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-slate-300 w-7">{qNum}.</span>
                  <div className="flex items-center gap-1">
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const isSelected = selectedOpt === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => handlePartIChange(qNum, opt)}
                          className={cn(
                            "w-6 h-6 rounded-full text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center justify-center",
                            isSelected
                              ? "bg-emerald-500 text-slate-950 shadow-sm"
                              : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: True / False (For GDPT 2018) */}
        {templateType === 'gdpt_2018' && (
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Phần II: Đúng / Sai (4 câu - Lũy tiến điểm chuẩn Bộ GD&ĐT)</span>
              </span>
              <span className="text-[11px] text-slate-400">1 ý = 0.1đ • 2 ý = 0.25đ • 3 ý = 0.5đ • 4 ý = 1.0đ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(qNum => {
                const qData = activeKey.partII[qNum] || {};
                return (
                  <div key={qNum} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="text-xs font-bold text-slate-200 border-b border-slate-800/80 pb-1.5 flex justify-between">
                      <span>CÂU {qNum}</span>
                      <span className="text-[10px] text-slate-500 font-normal">Tối đa 1.0đ</span>
                    </div>
                    {(['a', 'b', 'c', 'd'] as const).map(stmt => {
                      const val = qData[stmt];
                      return (
                        <div key={stmt} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-400">{stmt})</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handlePartIIChange(qNum, stmt, true)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                                val === true
                                  ? "bg-emerald-500 text-slate-950"
                                  : "bg-slate-800 text-slate-400 hover:text-white"
                              )}
                            >
                              ĐÚNG
                            </button>
                            <button
                              onClick={() => handlePartIIChange(qNum, stmt, false)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                                val === false
                                  ? "bg-rose-500 text-white"
                                  : "bg-slate-800 text-slate-400 hover:text-white"
                              )}
                            >
                              SAI
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3: Short Answer (For GDPT 2018) */}
        {templateType === 'gdpt_2018' && (
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Phần III: Trả lời ngắn (6 câu - Điền số)</span>
              </span>
              <span className="text-[11px] text-slate-400">0.5 điểm / câu</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map(qNum => {
                const ans = activeKey.partIII[qNum] || '';
                return (
                  <div key={qNum} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <label className="text-xs font-bold font-mono text-slate-300 block">Câu {qNum}:</label>
                    <input
                      type="text"
                      value={ans}
                      onChange={e => handlePartIIIChange(qNum, e.target.value)}
                      placeholder="VD: 25"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg text-xs font-mono text-center outline-hidden focus:border-amber-400"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB 3: STUDENTS ROSTER TAB
// ============================================================================
function StudentsTab({
  students,
  setStudents
}: {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}) {
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classes = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.className) set.add(s.className); });
    return Array.from(set);
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.sbd.includes(search);
      const matchClass = filterClass === 'all' || s.className === filterClass;
      return matchSearch && matchClass;
    });
  }, [students, search, filterClass]);

  // Import from Excel (.xlsx)
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = XLSX.read(evt.target?.result, { type: 'binary' });
        const wsName = data.SheetNames[0];
        const rows: any[] = XLSX.utils.sheet_to_json(data.Sheets[wsName]);

        const newStudents: Student[] = rows.map((r, i) => {
          const rawSbd = r['SBD'] || r['Số báo danh'] || r['sbd'] || (i + 1);
          const sbd = String(rawSbd).trim().padStart(6, '0').slice(-6);
          const name = r['Họ và tên'] || r['Họ tên'] || r['Tên'] || r['Name'] || `Học sinh ${sbd}`;
          const className = r['Lớp'] || r['Class'] || '12A1';
          return { sbd, name, className };
        });

        if (newStudents.length > 0) {
          setStudents(newStudents);
          alert(`Đã nạp thành công ${newStudents.length} học sinh từ file Excel!`);
        }
      } catch (err: any) {
        alert(`Lỗi đọc file Excel: ${err.message || 'File không đúng định dạng'}`);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Download template Excel
  const handleDownloadTemplate = () => {
    const sample = [
      { "SBD": "000101", "Họ và tên": "Nguyễn Văn An", "Lớp": "12A1" },
      { "SBD": "000102", "Họ và tên": "Trần Thị Bình", "Lớp": "12A1" },
      { "SBD": "000103", "Họ và tên": "Lê Quốc Dũng", "Lớp": "12A1" }
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachHocSinh");
    XLSX.writeFile(wb, "Mau_DanhSach_ThiSinh_OMR.xlsx");
  };

  // Add 40 mock students
  const handleAddMockClass = () => {
    const newStudents = generateDefaultStudents();
    setStudents(newStudents);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Quản Lý Danh Sách Thí Sinh ({students.length} em)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Hệ thống tự động liên kết SBD 6 số với Họ tên và Lớp khi quét camera</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddMockClass}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Nạp 35 HS Mẫu (12A1)</span>
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
            <span>Tải mẫu Excel</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập từ Excel</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleExcelImport} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
          <div className="flex items-center gap-2 w-full sm:w-72 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo SBD hoặc Họ tên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-white outline-hidden w-full placeholder:text-slate-500"
            />
          </div>

          {classes.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Lớp:</span>
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5"
              >
                <option value="all">Tất cả lớp ({students.length})</option>
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
              <tr>
                <th className="p-3 w-14 text-center">STT</th>
                <th className="p-3 w-28 font-mono">SBD (6 số)</th>
                <th className="p-3">Họ và tên thí sinh</th>
                <th className="p-3 w-24">Lớp</th>
                <th className="p-3 text-right w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((st, idx) => (
                  <tr key={st.sbd} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">{st.sbd}</td>
                    <td className="p-3 font-semibold text-slate-200">{st.name}</td>
                    <td className="p-3 text-slate-400">{st.className}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setStudents(prev => prev.filter(s => s.sbd !== st.sbd));
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer"
                        title="Xóa học sinh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Không tìm thấy thí sinh nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 4: PRINTABLE PDF TEMPLATES TAB
// ============================================================================
function TemplatesTab({
  templateType,
  setTemplateType
}: {
  templateType: OMRTemplateType;
  setTemplateType: (t: OMRTemplateType) => void;
}) {
  const [schoolName, setSchoolName] = useState('SỞ GD&ĐT HÀ NỘI - TRƯỜNG THPT CHUYÊN');
  const [examTitle, setExamTitle] = useState('KIỂM TRA HỌC KỲ I - NĂM HỌC 2026 - 2027');
  const [isGenerating, setIsGenerating] = useState(false);

  const templates = [
    {
      id: 'gdpt_2018',
      title: 'Mẫu Chuẩn Bộ GD&ĐT (GDPT 2018)',
      desc: 'Gồm Phần I (12 trắc nghiệm), Phần II (4 Đúng/Sai), Phần III (6 trả lời ngắn). SBD 6 số, Mã đề 4 số.',
      badge: 'Khuyên dùng'
    },
    {
      id: 'tnmaker_20',
      title: 'Mẫu TNMaker 20 câu',
      desc: '20 câu trắc nghiệm 4 lựa chọn (A, B, C, D). SBD 6 số, Mã đề 4 số.',
      badge: 'Bài 15 phút'
    },
    {
      id: 'tnmaker_40',
      title: 'Mẫu TNMaker 40 câu',
      desc: '40 câu trắc nghiệm 4 lựa chọn (A, B, C, D). SBD 6 số, Mã đề 4 số.',
      badge: 'Kiểm tra 1 tiết'
    },
    {
      id: 'tnmaker_50',
      title: 'Mẫu TNMaker 50 câu',
      desc: '50 câu trắc nghiệm 4 lựa chọn (A, B, C, D). SBD 6 số, Mã đề 4 số.',
      badge: 'Thi thử THPT'
    }
  ];

  const handleDownloadPdf = (tId: OMRTemplateType) => {
    setIsGenerating(true);
    try {
      const doc = exportExamSheetPDF(tId, { schoolName, examTitle });
      doc.save(`Phieu_Thi_Trac_Nghiem_${tId.toUpperCase()}_A4.pdf`);
    } catch (e: any) {
      alert(`Lỗi tạo PDF: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintDirect = (tId: OMRTemplateType) => {
    try {
      const doc = exportExamSheetPDF(tId, { schoolName, examTitle });
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (e: any) {
      alert(`Lỗi in: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Config */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Tạo & In Phiếu Trả Lời Trắc Nghiệm Vector (PDF A4)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            File PDF vector in ấn độ phân giải cao sắc nét, có 4 điểm neo định vị hình vuông màu đen ở 4 góc để camera nhận diện chuẩn 100%
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-medium">Tiêu đề Sở / Trường học:</label>
            <input
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl outline-hidden focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-medium">Tên kỳ thi / bài kiểm tra:</label>
            <input
              type="text"
              value={examTitle}
              onChange={e => setExamTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map(tmpl => {
          const isSelected = templateType === tmpl.id;
          return (
            <div
              key={tmpl.id}
              className={cn(
                "p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 bg-slate-950",
                isSelected
                  ? "border-emerald-500/80 shadow-lg shadow-emerald-500/10"
                  : "border-slate-800 hover:border-slate-700"
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {tmpl.badge}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>4 Corner Anchors</span>
                  </div>
                </div>

                <h4 className="text-base font-bold text-white">{tmpl.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{tmpl.desc}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => handleDownloadPdf(tmpl.id as any)}
                  disabled={isGenerating}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải File PDF In (A4)</span>
                </button>
                <button
                  onClick={() => handlePrintDirect(tmpl.id as any)}
                  className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="In trực tiếp"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In ngay</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// TAB 5: RESULTS & EXCEL ANALYTICS TAB
// ============================================================================
function ResultsTab({
  submissions,
  setSubmissions,
  students,
  answerKeys
}: {
  submissions: OMRGradingResult[];
  setSubmissions: React.Dispatch<React.SetStateAction<OMRGradingResult[]>>;
  students: Student[];
  answerKeys: Record<string, ExamAnswerKey>;
}) {
  const [selectedSubDetail, setSelectedSubDetail] = useState<OMRGradingResult | null>(null);
  const [search, setSearch] = useState('');
  const [filterCode, setFilterCode] = useState('all');

  const examCodes = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach(s => { if (s.examCode) set.add(s.examCode); });
    return Array.from(set);
  }, [submissions]);

  const filteredSubs = useMemo(() => {
    return submissions.filter(s => {
      const matchSearch = s.studentName.toLowerCase().includes(search.toLowerCase()) || s.sbd.includes(search);
      const matchCode = filterCode === 'all' || s.examCode === filterCode;
      return matchSearch && matchCode;
    });
  }, [submissions, search, filterCode]);

  // Statistics
  const stats = useMemo(() => {
    if (submissions.length === 0) return { total: 0, avg: 0, max: 0, min: 0, passRate: 0 };
    const scores = submissions.map(s => s.totalScore);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = parseFloat((sum / scores.length).toFixed(2));
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passCount = scores.filter(sc => sc >= 5.0).length;
    const passRate = parseFloat(((passCount / scores.length) * 100).toFixed(1));
    return { total: scores.length, avg, max, min, passRate };
  }, [submissions]);

  // Distribution Data for Recharts
  const chartData = useMemo(() => {
    const buckets = [
      { range: '0 - 2đ', count: 0, color: '#ef4444' },
      { range: '2 - 4đ', count: 0, color: '#f97316' },
      { range: '4 - 6đ', count: 0, color: '#eab308' },
      { range: '6 - 8đ', count: 0, color: '#3b82f6' },
      { range: '8 - 10đ', count: 0, color: '#10b981' }
    ];
    submissions.forEach(s => {
      const sc = s.totalScore;
      if (sc < 2) buckets[0].count++;
      else if (sc < 4) buckets[1].count++;
      else if (sc < 6) buckets[2].count++;
      else if (sc < 8) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [submissions]);

  // Export full gradebook to Excel
  const handleExportGradebook = () => {
    if (submissions.length === 0) {
      alert("Chưa có dữ liệu bài thi để xuất Excel!");
      return;
    }
    const rows = submissions.map((sub, idx) => ({
      "STT": idx + 1,
      "Số báo danh": sub.sbd,
      "Họ và tên": sub.studentName,
      "Lớp": sub.studentClass || '12A1',
      "Mã đề thi": sub.examCode,
      "Điểm Phần I": sub.partI_score,
      "Điểm Phần II": sub.partII_score,
      "Điểm Phần III": sub.partIII_score,
      "TỔNG ĐIỂM (Thang 10)": sub.totalScore,
      "Số câu đúng (Phần I)": `${sub.partI_correct}/${sub.partI_total}`,
      "Thời gian chấm": new Date(sub.timestamp).toLocaleString('vi-VN')
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BangDiem_OMR");
    XLSX.writeFile(wb, `BangDiem_Thi_OMR_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Đã chấm</span>
          <div className="text-2xl font-black text-white">{stats.total} bài</div>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Điểm trung bình</span>
          <div className="text-2xl font-black text-emerald-400">{stats.avg} đ</div>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Điểm cao nhất</span>
          <div className="text-2xl font-black text-sky-400">{stats.max} đ</div>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Điểm thấp nhất</span>
          <div className="text-2xl font-black text-rose-400">{stats.min} đ</div>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-1 col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-400">Tỷ lệ Đạt (≥ 5đ)</span>
          <div className="text-2xl font-black text-amber-400">{stats.passRate}%</div>
        </div>
      </div>

      {/* Chart Section */}
      {submissions.length > 0 && (
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Phổ Điểm Toàn Khóa Thi
          </h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} 
                />
                <Bar dataKey="count" name="Số học sinh" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Submissions List Header */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700/60 w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm SBD, Tên học sinh..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-xs text-white outline-hidden w-full placeholder:text-slate-500"
              />
            </div>

            {examCodes.length > 1 && (
              <select
                value={filterCode}
                onChange={e => setFilterCode(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5"
              >
                <option value="all">Tất cả mã đề</option>
                {examCodes.map(c => (
                  <option key={c} value={c}>Mã đề {c}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportGradebook}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Bảng Điểm (.xlsx)</span>
            </button>
            {submissions.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Thầy/cô có chắc chắn muốn xóa toàn bộ lịch sử bài đã chấm?")) {
                    setSubmissions([]);
                  }
                }}
                className="p-1.5 bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 rounded-xl text-xs transition-colors cursor-pointer"
                title="Xóa tất cả kết quả"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Submissions Table */}
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
              <tr>
                <th className="p-3 w-12 text-center">STT</th>
                <th className="p-3 w-24 font-mono">SBD</th>
                <th className="p-3">Họ và tên</th>
                <th className="p-3 w-20">Lớp</th>
                <th className="p-3 w-20 font-mono">Mã đề</th>
                <th className="p-3 text-center">Phần I</th>
                <th className="p-3 text-center">Phần II</th>
                <th className="p-3 text-center">Phần III</th>
                <th className="p-3 text-center font-bold">Tổng Điểm</th>
                <th className="p-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSubs.length > 0 ? (
                filteredSubs.map((sub, idx) => (
                  <tr key={sub.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">{sub.sbd}</td>
                    <td className="p-3 font-semibold text-slate-200">{sub.studentName}</td>
                    <td className="p-3 text-slate-400">{sub.studentClass || '12A1'}</td>
                    <td className="p-3 font-mono text-sky-400 font-bold">{sub.examCode}</td>
                    <td className="p-3 text-center text-slate-300">{sub.partI_score}đ</td>
                    <td className="p-3 text-center text-slate-300">{sub.partII_score}đ</td>
                    <td className="p-3 text-center text-slate-300">{sub.partIII_score}đ</td>
                    <td className="p-3 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg font-black text-xs inline-block",
                        sub.totalScore >= 8 
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : sub.totalScore >= 5
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      )}>
                        {sub.totalScore.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedSubDetail(sub)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-700/80 inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Xem bài</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    Chưa có bài thi nào được chấm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submission Detail Modal */}
      {selectedSubDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Bài Thi: {selectedSubDetail.studentName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                    SBD: {selectedSubDetail.sbd}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lớp: {selectedSubDetail.studentClass || '12A1'} • Mã đề: {selectedSubDetail.examCode} • Thời gian: {new Date(selectedSubDetail.timestamp).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Banner */}
            <div className="flex items-center justify-around p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div>
                <span className="text-xs text-slate-400 block">Tổng Điểm</span>
                <span className="text-3xl font-extrabold text-emerald-400">{selectedSubDetail.totalScore.toFixed(2)}</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-xs text-slate-400 block">Phần I</span>
                <span className="text-lg font-bold text-white">{selectedSubDetail.partI_score}đ</span>
              </div>
              {selectedSubDetail.templateType === 'gdpt_2018' && (
                <>
                  <div className="h-8 w-px bg-slate-800" />
                  <div>
                    <span className="text-xs text-slate-400 block">Phần II</span>
                    <span className="text-lg font-bold text-white">{selectedSubDetail.partII_score}đ</span>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div>
                    <span className="text-xs text-slate-400 block">Phần III</span>
                    <span className="text-lg font-bold text-white">{selectedSubDetail.partIII_score}đ</span>
                  </div>
                </>
              )}
            </div>

            {/* Annotated Image */}
            {selectedSubDetail.capturedImageUrl && (
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 font-medium">Ảnh bài thi quét thực tế (đánh dấu ô tô):</span>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-[3/4] max-h-96">
                  <img
                    src={selectedSubDetail.capturedImageUrl}
                    alt="Review sheet"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setSubmissions(prev => prev.filter(s => s.id !== selectedSubDetail.id));
                  setSelectedSubDetail(null);
                }}
                className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa bài thi này</span>
              </button>
              <button
                onClick={() => setSelectedSubDetail(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
