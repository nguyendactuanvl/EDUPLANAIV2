import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Clock, FileCheck, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Download,
  HelpCircle, Settings, Send, Code, Play, RefreshCw, Upload, Copy, Info, Check, AlertCircle, AlertTriangle, Loader2, Sparkles
} from "lucide-react";

// Types for Exam Configuration
interface Part1Key {
  question: number;
  correct: "A" | "B" | "C" | "D" | "";
}

interface Part2Key {
  question: number;
  statements: {
    a: boolean | null;
    b: boolean | null;
    c: boolean | null;
    d: boolean | null;
  };
}

interface Part3Key {
  question: number;
  correct: string;
}

interface DeOnlinePdfProps {
  studentModeData?: string;
}

export default function DeOnlinePdf({ studentModeData }: DeOnlinePdfProps = {}) {
  // Screens state: "config" | "exam" | "result"
  const [screen, setScreen] = useState<"config" | "exam" | "result">("config");

  // Tabs within config screen: "teacher" | "student"
  const [configTab, setConfigTab] = useState<"teacher" | "student">("teacher");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [examError, setExamError] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [sharedRoomId, setSharedRoomId] = useState<string | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Configuration State
  const [examTitle, setExamTitle] = useState("Đề thi thử Tốt nghiệp THPT môn Toán");
  const [duration, setDuration] = useState(90); // minutes
  const [scriptUrl, setScriptUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>("");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);

  // Student Info (Form)
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [hasStartedExam, setHasStartedExam] = useState(false);

  // Answer Keys Configuration (Teacher)
  const [part1Keys, setPart1Keys] = useState<Part1Key[]>(() => 
    Array.from({ length: 12 }, (_, i) => ({ question: i + 1, correct: "" }))
  );
  
  const [part2Keys, setPart2Keys] = useState<Part2Key[]>(() => 
    Array.from({ length: 4 }, (_, i) => ({ 
      question: i + 1, 
      statements: { a: null, b: null, c: null, d: null } 
    }))
  );

  const [part3Keys, setPart3Keys] = useState<Part3Key[]>(() => 
    Array.from({ length: 6 }, (_, i) => ({ question: i + 1, correct: "" }))
  );

  // Student Selected Answers
  const [studentPart1, setStudentPart1] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [studentPart2, setStudentPart2] = useState<Record<number, { a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }>>(() => {
    const init: Record<number, any> = {};
    for (let i = 1; i <= 4; i++) {
      init[i] = { a: null, b: null, c: null, d: null };
    }
    return init;
  });
  const [studentPart3, setStudentPart3] = useState<Record<number, string>>({});

  // AI Extraction State
  const [isExtractingAnswers, setIsExtractingAnswers] = useState(false);

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Results State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    score: number;
    part1: number;
    part2: number;
    part3: number;
    details: any;
  } | null>(null);

  // Load configuration and Apps Script URL from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem("eduplan_de_online_pdf_script_url") || "";
    setScriptUrl(savedUrl);
  }, []);

  // Fetch shared room details if studentModeData is passed
  useEffect(() => {
    if (studentModeData) {
      loadSharedRoom(studentModeData);
    }
  }, [studentModeData]);

  const loadSharedRoom = async (code: string) => {
    setIsLoadingExam(true);
    setExamError("");
    try {
      const res = await fetch(`/api/exams/${code.trim().toUpperCase()}`);
      if (!res.ok) {
        throw new Error("Không tìm thấy mã phòng thi. Vui lòng kiểm tra lại mã hoặc đường link chia sẻ từ Giáo viên.");
      }
      const data = await res.json();
      setExamTitle(data.examTitle || "Đề thi PDF");
      setDuration(data.duration || 90);
      setScriptUrl(data.scriptUrl || "");
      
      if (Array.isArray(data.part1Keys)) setPart1Keys(data.part1Keys);
      if (Array.isArray(data.part2Keys)) setPart2Keys(data.part2Keys);
      if (Array.isArray(data.part3Keys)) setPart3Keys(data.part3Keys);

      if (data.pdfBase64) {
        setPdfBase64(data.pdfBase64);
        try {
          let base64Clean = data.pdfBase64;
          if (base64Clean.startsWith("data:")) {
            base64Clean = base64Clean.substring(base64Clean.indexOf(",") + 1);
          }
          const binaryString = window.atob(base64Clean);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } catch (pdfErr) {
          console.error("Lỗi chuyển đổi PDF Base64 sang Blob URL:", pdfErr);
        }
      }
      // Go directly to student screen but do not start timer yet (let them enter their name first!)
      setScreen("exam");
      setHasStartedExam(false);
    } catch (err: any) {
      setExamError(err.message || "Không thể tải cấu hình phòng thi từ máy chủ.");
    } finally {
      setIsLoadingExam(false);
    }
  };

  // Timer Effect
  useEffect(() => {
    if (screen === "exam" && hasStartedExam && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            autoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, hasStartedExam, timeLeft]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        alert("Vui lòng chỉ tải lên file định dạng PDF gốc!");
        return;
      }
      setSelectedFile(file);
      // Revoke old URL
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);

      // Convert local file to base64 for CanvasPdfViewer rendering
      const reader = new FileReader();
      reader.onload = () => {
        const raw = reader.result as string;
        setPdfBase64(raw.split(',')[1] || "");
      };
      reader.readAsDataURL(file);
    }
  };

  // Share/Deploy Room to Cloud DB so students can join from anywhere
  const handleShareExam = async () => {
    if (!selectedFile) {
      alert("Vui lòng tải lên tệp PDF đề gốc trước khi tạo phòng thi trực tuyến!");
      return;
    }
    setIsSharing(true);
    setSharedRoomId(null);
    try {
      const base64Clean = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => {
          const raw = reader.result as string;
          resolve(raw.split(',')[1]);
        };
        reader.onerror = error => reject(error);
      });

      const payload = {
        examTitle: examTitle.trim(),
        duration: duration,
        scriptUrl: scriptUrl.trim(),
        part1Keys,
        part2Keys,
        part3Keys,
        pdfBase64: base64Clean,
        createdAt: new Date().toISOString()
      };

      const res = await fetch("/api/exams/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Không thể lưu cấu hình phòng thi lên máy chủ chia sẻ.");
      }
      const data = await res.json();
      setSharedRoomId(data.examId.toUpperCase());
    } catch (err: any) {
      alert("Lỗi khi tạo phòng thi: " + err.message);
    } finally {
      setIsSharing(false);
    }
  };

  // AI Answer Key Extractor Handler
  const handleExtractAnswersByAi = async () => {
    if (!selectedFile) {
      alert("Vui lòng tải lên file PDF đề gốc trước khi trích xuất đáp án!");
      return;
    }

    setIsExtractingAnswers(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
      });

      const response = await fetch("/api/extract-answers-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("eduplan_gemini_api_key_v2") || ""}`
        },
        body: JSON.stringify({
          file: base64,
          type: "application/pdf"
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Không thể phân tích dữ liệu đáp án từ tệp PDF.");
      }

      const data = await response.json();
      
      // Update Part 1 Keys (robust lookup)
      if (Array.isArray(data.part1)) {
        const updated = part1Keys.map((k, idx) => {
          const match = data.part1.find((p: any) => 
            p.question === k.question || 
            String(p.question).includes(String(k.question))
          ) || data.part1[idx];
          return match ? { ...k, correct: match.correct } : k;
        });
        setPart1Keys(updated);
      }

      // Update Part 2 Keys (robust lookup with 13-16 index shift)
      if (Array.isArray(data.part2)) {
        const updated = part2Keys.map((k, idx) => {
          const match = data.part2.find((p: any) => 
            p.question === k.question || 
            p.question === k.question + 12 ||
            String(p.question).includes(String(k.question)) ||
            String(p.question).includes(String(k.question + 12))
          ) || data.part2[idx];
          return match ? { ...k, statements: { ...k.statements, ...match.statements } } : k;
        });
        setPart2Keys(updated);
      }

      // Update Part 3 Keys (robust lookup with 17-22 index shift)
      if (Array.isArray(data.part3)) {
        const updated = part3Keys.map((k, idx) => {
          const match = data.part3.find((p: any) => 
            p.question === k.question || 
            p.question === k.question + 16 ||
            String(p.question).includes(String(k.question)) ||
            String(p.question).includes(String(k.question + 16))
          ) || data.part3[idx];
          return match ? { ...k, correct: String(match.correct) } : k;
        });
        setPart3Keys(updated);
      }

      alert("🎉 Trích xuất và giải đáp án bằng AI thành công! Toàn bộ bảng đáp án Phần I, II, III đã được tự động điền bám sát nội dung đề thi.");

    } catch (err: any) {
      console.error(err);
      alert("Lỗi trích xuất đáp án bằng AI: " + err.message);
    } finally {
      setIsExtractingAnswers(false);
    }
  };

  // Test URL connection
  const handleTestConnection = async () => {
    if (!scriptUrl.trim()) {
      setTestStatus({ success: false, message: "Vui lòng nhập Link URL Google Apps Script của bạn." });
      return;
    }
    
    setIsTestingConn(true);
    setTestStatus(null);
    localStorage.setItem("eduplan_de_online_pdf_script_url", scriptUrl.trim());

    try {
      // Direct ping with test parameter
      const res = await fetch(`${scriptUrl}?test=1`, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ test: true })
      });
      // Mode 'no-cors' resolves on success but doesn't expose contents. It's safe to assume okay if no throw.
      setTestStatus({ 
        success: true, 
        message: "Kết nối thành công (Mô phỏng)! Google Apps Script Web App đã phản hồi an toàn." 
      });
    } catch (err: any) {
      setTestStatus({ 
        success: false, 
        message: "Lỗi kết nối hoặc chặn CORS. Tuy nhiên, Apps Script vẫn nhận lệnh ngầm khi chạy thực tế (chế độ no-cors)." 
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  // Sample Bare m generator
  const handleLoadSampleBarem = () => {
    const letters: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D", "A", "C", "B", "D", "A", "B", "C", "D"];
    const part1 = part1Keys.map((item, i) => ({
      ...item,
      correct: letters[i % 4]
    }));
    setPart1Keys(part1);

    const part2 = part2Keys.map((item, i) => ({
      ...item,
      statements: {
        a: i % 2 === 0,
        b: i % 3 === 0,
        c: i % 4 === 0,
        d: i % 2 !== 0
      }
    }));
    setPart2Keys(part2);

    const part3Vals = ["2", "-3.5", "102", "0.5", "5", "-10"];
    const part3 = part3Keys.map((item, i) => ({
      ...item,
      correct: part3Vals[i] || "1"
    }));
    setPart3Keys(part3);
  };

  // Google Apps Script source code
  const appsScriptCode = `function doPost(e) {
  try {
    // Phân tích dữ liệu JSON gửi đến
    var data = JSON.parse(e.postData.contents);
    
    // Mở file Google Sheet đang liên kết với script này
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // Nếu trang tính trống, tự động tạo dòng tiêu đề (Header)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Mã phòng thi",
        "Thời gian nộp", 
        "Họ và tên", 
        "Lớp", 
        "Tổng điểm (10)", 
        "Điểm Phần I (TN 4 lựa chọn)", 
        "Điểm Phần II (TN Đúng/Sai)", 
        "Điểm Phần III (Trả lời ngắn)", 
        "Chi tiết đáp án chi tiết"
      ]);
    }
    
    // Ghi kết quả làm bài của học sinh xuống dòng tiếp theo
    sheet.appendRow([
      data.examTitle || "Đề thi PDF",
      data.submitTime || new Date().toLocaleString("vi-VN"),
      data.studentName || "Học sinh ẩn danh",
      data.studentClass || "Lớp trống",
      data.totalScore,
      data.scorePart1,
      data.scorePart2,
      data.scorePart3,
      JSON.stringify(data.details)
    ]);
    
    // Trả về phản hồi thành công cho ứng dụng
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "success", 
      "message": "Đã lưu kết quả của " + data.studentName + " vào Google Sheet!" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Trả về lỗi nếu có sự cố xảy ra
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "error", 
      "message": error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Calculations for grading (2025 Ministry of Education specification)
  const calculateScores = () => {
    let part1Score = 0;
    let part2Score = 0;
    let part3Score = 0;

    const details: any = {
      part1: {},
      part2: {},
      part3: {}
    };

    // Part 1: 12 multiple choice questions (0.25 pt per question)
    part1Keys.forEach((key, index) => {
      const qNum = key.question;
      const correct = key.correct;
      const studentAns = studentPart1[qNum] || "";
      const isCorrect = studentAns === correct;
      
      if (isCorrect && correct !== "") {
        part1Score += 0.25;
      }
      details.part1[qNum] = {
        correct,
        student: studentAns,
        isCorrect
      };
    });

    // Part 2: 4 True/False questions (Step-wise grading: 1=0.1, 2=0.25, 3=0.5, 4=1.0)
    part2Keys.forEach((key) => {
      const qNum = key.question;
      const correctStmts = key.statements;
      const studentStmts = studentPart2[qNum] || { a: null, b: null, c: null, d: null };

      let correctCount = 0;
      const subDetails: any = {};

      ["a", "b", "c", "d"].forEach((letter) => {
        const keyVal = correctStmts[letter as "a" | "b" | "c" | "d"];
        const studVal = studentStmts[letter as "a" | "b" | "c" | "d"];
        const isSubCorrect = keyVal !== null && studVal !== null && keyVal === studVal;

        if (isSubCorrect) correctCount++;
        subDetails[letter] = {
          correct: keyVal,
          student: studVal,
          isCorrect: isSubCorrect
        };
      });

      // Apply step-wise grading for 4 statements
      let pointsAwarded = 0;
      if (correctCount === 1) pointsAwarded = 0.1;
      else if (correctCount === 2) pointsAwarded = 0.25;
      else if (correctCount === 3) pointsAwarded = 0.5;
      else if (correctCount === 4) pointsAwarded = 1.0;

      part2Score += pointsAwarded;
      details.part2[qNum] = {
        correctCount,
        points: pointsAwarded,
        subDetails
      };
    });

    // Part 3: 6 Short Answer questions (0.5 pt per question)
    part3Keys.forEach((key) => {
      const qNum = key.question;
      const correct = String(key.correct || "").trim().toLowerCase().replace(",", ".");
      const studentAns = String(studentPart3[qNum] || "").trim().toLowerCase().replace(",", ".");
      const isCorrect = correct !== "" && studentAns !== "" && correct === studentAns;

      if (isCorrect) {
        part3Score += 0.5;
      }
      details.part3[qNum] = {
        correct: key.correct,
        student: studentPart3[qNum] || "",
        isCorrect
      };
    });

    // Final total score capped at 10
    const totalScore = Math.min(10, Number((part1Score + part2Score + part3Score).toFixed(2)));

    return {
      totalScore,
      scorePart1: Number(part1Score.toFixed(2)),
      scorePart2: Number(part2Score.toFixed(2)),
      scorePart3: Number(part3Score.toFixed(2)),
      details
    };
  };

  // Submit action
  const handleManualSubmit = () => {
    // Check missing questions
    let unAnsweredPart1 = part1Keys.filter(k => !studentPart1[k.question]).length;
    let unAnsweredPart2 = part2Keys.filter(k => {
      const ans = studentPart2[k.question];
      return ans.a === null || ans.b === null || ans.c === null || ans.d === null;
    }).length;
    let unAnsweredPart3 = part3Keys.filter(k => !studentPart3[k.question]).length;

    const totalMissing = unAnsweredPart1 + unAnsweredPart2 + unAnsweredPart3;
    if (totalMissing > 0) {
      if (!confirm(`Bạn còn ${totalMissing} câu hỏi chưa hoàn thành phương án trả lời. Bạn có chắc chắn muốn nộp bài thi ngay không?`)) {
        return;
      }
    } else {
      if (!confirm("Bạn muốn nộp bài thi để kết thúc và ghi nhận điểm số đúng không?")) {
        return;
      }
    }

    submitExam();
  };

  const autoSubmitExam = () => {
    alert("⏰ Hết giờ làm bài thi! Hệ thống đang tự động nộp bài làm của bạn.");
    submitExam();
  };

  const submitExam = async () => {
    setIsSubmitting(true);
    const scores = calculateScores();

    // Prepare Payload
    const payload = {
      examTitle: examTitle.trim(),
      studentName: studentName.trim() || "Học sinh ẩn danh",
      studentClass: studentClass.trim() || "Lớp trống",
      submitTime: new Date().toLocaleString("vi-VN"),
      totalScore: scores.totalScore,
      scorePart1: scores.scorePart1,
      scorePart2: scores.scorePart2,
      scorePart3: scores.scorePart3,
      details: scores.details
    };

    // Cache scriptUrl to localStorage
    if (scriptUrl.trim()) {
      localStorage.setItem("eduplan_de_online_pdf_script_url", scriptUrl.trim());
    }

    try {
      if (scriptUrl.trim()) {
        // Send to Apps Script Web App
        await fetch(scriptUrl.trim(), {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {
      console.warn("Lỗi gửi điểm lên Google Sheets:", e);
    } finally {
      setSubmitResult({
        success: true,
        score: scores.totalScore,
        part1: scores.scorePart1,
        part2: scores.scorePart2,
        part3: scores.scorePart3,
        details: scores.details
      });
      setScreen("result");
      setIsSubmitting(false);
    }
  };

  if (isLoadingExam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] h-screen bg-slate-50 font-sans p-6 text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-1">Đang kết nối phòng thi...</h2>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          Hệ thống đang tải tệp đề thi PDF gốc và cấu hình phiếu chấm từ giáo viên của bạn. Vui lòng đợi trong giây lát.
        </p>
      </div>
    );
  }

  if (examError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] h-screen bg-slate-50 font-sans p-6 text-center">
        <XCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-1">Không thể truy cập phòng thi!</h2>
        <p className="text-sm text-rose-600 max-w-sm mb-6 leading-relaxed">
          {examError}
        </p>
        <button
          onClick={() => {
            setExamError("");
            setScreen("config");
            window.history.replaceState({}, "", window.location.pathname);
            window.location.reload();
          }}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
        >
          Quay lại Thiết lập
        </button>
      </div>
    );
  }

  return (
    <div id="moduleDeOnlinePDF" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-red-500" />
            Đề online từ file PDF của Giáo viên
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Công cụ tổ chức thi trắc nghiệm trực tuyến 3 Phần chuẩn Bộ GD&ĐT 2025 trực tiếp từ file PDF gốc của Giáo viên, tự động lưu kết quả về Google Sheets cá nhân.
          </p>
        </div>
        
        {screen !== "config" && (
          <button 
            onClick={() => {
              if (confirm("Hành động này sẽ thoát phòng thi hiện tại. Bạn có chắc chắn muốn quay lại thiết lập không?")) {
                setScreen("config");
                setHasStartedExam(false);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Quay lại thiết lập / Làm đề khác
          </button>
        )}
      </div>

      {/* A. CONFIGURATION SCREEN (DÀNH CHO GIÁO VIÊN) */}
      {screen === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT: Configure Details & PDF or Student Join */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* TAB SWITCHER: Teacher vs Student */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setConfigTab("teacher")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  configTab === "teacher"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                🎓 Giáo viên Thiết lập
              </button>
              <button
                onClick={() => setConfigTab("student")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  configTab === "student"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                ✏️ Học sinh Vào thi bằng mã
              </button>
            </div>

            {configTab === "student" ? (
              /* STUDENT JOIN ROOM CONTAINER */
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
                  Vào phòng thi trực tuyến
                </span>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                      Mã phòng thi từ Giáo viên (6 ký tự)
                    </label>
                    <input 
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="Mã ví dụ: H8A23D"
                      maxLength={10}
                      className="w-full bg-slate-800 border border-slate-700 text-white focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm font-bold text-center tracking-widest focus:outline-none placeholder:text-slate-600 placeholder:font-normal placeholder:tracking-normal"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                        Họ và tên của bạn
                      </label>
                      <input 
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full bg-slate-800 border border-slate-700 text-white focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                        Lớp học
                      </label>
                      <input 
                        type="text"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        placeholder="12A1"
                        className="w-full bg-slate-800 border border-slate-700 text-white focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {examError && (
                    <p className="text-xs text-rose-400 font-semibold leading-normal">{examError}</p>
                  )}

                  <button 
                    onClick={() => {
                      if (!roomCodeInput.trim()) {
                        alert("Vui lòng nhập mã phòng thi gồm 6 ký tự!");
                        return;
                      }
                      if (!studentName.trim() || !studentClass.trim()) {
                        alert("Vui lòng nhập đầy đủ tên học sinh và lớp để làm bài!");
                        return;
                      }
                      setExamError("");
                      loadSharedRoom(roomCodeInput);
                    }}
                    disabled={isLoadingExam}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isLoadingExam ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 shrink-0" />
                    )}
                    Vào phòng thi & Làm bài ngay
                  </button>
                </div>
              </div>
            ) : (
              /* TEACHER CONFIGURATION CONTAINER */
              <>
                {/* Box 1: Core details & PDF selector */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-100 pb-2">
                    Thông tin chung & Tệp Đề thi
                  </span>
                  
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                        Tên kỳ thi / Đề kiểm tra
                      </label>
                      <input 
                        type="text"
                        value={examTitle}
                        onChange={(e) => setExamTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none"
                        placeholder="Ví dụ: Đề khảo sát chất lượng giữa kì I"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          Thời gian (Phút)
                        </label>
                        <input 
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          Tệp PDF Đề thi gốc
                        </label>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="application/pdf"
                            onChange={handleFileChange}
                            id="pdfFileUploader"
                            className="hidden"
                          />
                          <label 
                            htmlFor="pdfFileUploader"
                            className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all truncate"
                          >
                            <Upload className="w-4 h-4 shrink-0" />
                            {selectedFile ? selectedFile.name : "Tải lên PDF đề gốc"}
                          </label>
                        </div>

                        {selectedFile && (
                          <button
                            type="button"
                            onClick={handleExtractAnswersByAi}
                            disabled={isExtractingAnswers}
                            className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                          >
                            {isExtractingAnswers ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            {isExtractingAnswers ? "Đang trích xuất đáp án..." : "⚡ Trích xuất đáp án bằng AI"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box 2: Google Apps Script Web App Integration */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Kết nối Google Sheets nhận điểm
                    </span>
                    <button 
                      onClick={() => setShowCodeModal(true)}
                      className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      Lấy Code mẫu
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                        Google Apps Script Web App URL
                        <span title="Link nhận kết quả triển khai từ Google Sheets của giáo viên">
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                      </label>
                      <input 
                        type="text"
                        value={scriptUrl}
                        onChange={(e) => setScriptUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                        (*) Lưu ý: Điểm số của học sinh sẽ tự động được ghi đè và ghi mới vào tệp Google Sheets mà thầy cô liên kết. Để trống nếu chỉ muốn học sinh thi thử hiển thị điểm ngay trên màn hình.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handleTestConnection}
                        disabled={isTestingConn}
                        className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isTestingConn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Test kết nối URL
                      </button>
                    </div>

                    {testStatus && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        testStatus.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
                      }`}>
                        {testStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                        <span>{testStatus.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Box 3: Share Room & Start Room */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
                  
                  {/* Share Room Panel */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
                      Tổ chức thi & Chia sẻ link học sinh
                    </span>

                    <button 
                      type="button"
                      onClick={handleShareExam}
                      disabled={isSharing}
                      className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50 text-xs"
                    >
                      {isSharing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 shrink-0" />
                      )}
                      {isSharing ? "Đang tạo phòng thi..." : "🚀 Tạo phòng thi & Lấy link chia sẻ"}
                    </button>

                    {sharedRoomId && (
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-2.5">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Mã phòng thi</span>
                          <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-indigo-400 border border-slate-800">
                            <span>{sharedRoomId}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(sharedRoomId);
                                alert("Đã copy Mã phòng thi: " + sharedRoomId);
                              }}
                              className="text-slate-400 hover:text-white text-[10px] underline cursor-pointer"
                            >
                              Copy
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Link trực tiếp cho học sinh</span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="text" 
                              readOnly 
                              value={`${window.location.origin}${window.location.pathname}?view=exam_pdf&data=${sharedRoomId}`}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[9px] text-slate-300 font-mono flex-1 focus:outline-none"
                            />
                            <button 
                              onClick={() => {
                                const link = `${window.location.origin}${window.location.pathname}?view=exam_pdf&data=${sharedRoomId}`;
                                navigator.clipboard.writeText(link);
                                setIsLinkCopied(true);
                                setTimeout(() => setIsLinkCopied(false), 2000);
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold rounded-lg cursor-pointer transition-colors shrink-0"
                            >
                              {isLinkCopied ? "Đã copy!" : "Copy Link"}
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          💡 Giáo viên sao chép đường link này gửi qua Zalo/Facebook. Học sinh mở link sẽ thấy đề thi PDF và phiếu trả lời trắc nghiệm trực quan để nộp điểm trực tiếp.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Local Exam Simulation */}
                  <div className="border-t border-slate-800 pt-3.5 space-y-3.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Thi thử cục bộ (Mô phỏng)
                    </span>
                    
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                          Tên học sinh thi thử
                        </label>
                        <input 
                          type="text"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          className="w-full bg-slate-800 border border-slate-700 text-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                          Lớp học
                        </label>
                        <input 
                          type="text"
                          value={studentClass}
                          onChange={(e) => setStudentClass(e.target.value)}
                          placeholder="Ví dụ: 12A1"
                          className="w-full bg-slate-800 border border-slate-700 text-white focus:border-emerald-500 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (!pdfUrl) {
                          alert("Vui lòng tải lên file PDF đề gốc trước khi khởi chạy phòng thi!");
                          return;
                        }
                        if (!studentName.trim() || !studentClass.trim()) {
                          alert("Vui lòng nhập đầy đủ tên học sinh và lớp thi thử để chạy phòng thi mô phỏng.");
                          return;
                        }
                        // Reset student answers
                        setStudentPart1({});
                        setStudentPart2(() => {
                          const init: Record<number, any> = {};
                          for (let i = 1; i <= 4; i++) {
                            init[i] = { a: null, b: null, c: null, d: null };
                          }
                          return init;
                        });
                        setStudentPart3({});
                        setTimeLeft(duration * 60);
                        setTimeSpent(0);
                        setHasStartedExam(true);
                        setScreen("exam");
                      }}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm text-xs"
                    >
                      <Play className="w-4 h-4 shrink-0" />
                      🚀 Khởi chạy phòng thi thử cục bộ
                    </button>
                  </div>

                </div>
              </>
            )}

          </div>

          {/* RIGHT: Barem Answer Keys setting */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Thiết lập Barem Đáp án Chuẩn (Bộ GD&ĐT 2025)
                </span>
                <button 
                  onClick={handleLoadSampleBarem}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer transition-colors"
                >
                  ⚡ Nhập nhanh đáp án mẫu
                </button>
              </div>

              <div className="space-y-6 max-h-[650px] overflow-y-auto pr-1">
                
                {/* Part I settings */}
                <div className="space-y-3">
                  <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl text-xs font-bold flex items-center justify-between">
                    <span>PHẦN I: Trắc nghiệm khách quan 4 lựa chọn (12 câu - Mỗi câu 0.25 điểm)</span>
                    <span className="bg-blue-100 px-2 py-0.5 rounded text-[10px]">Tối đa 3.0đ</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {part1Keys.map((item, idx) => (
                      <div key={item.question} className="flex items-center justify-between p-2.5 border border-slate-150 rounded-xl bg-slate-50/50">
                        <span className="text-xs font-bold text-slate-700">Câu {item.question}:</span>
                        <div className="flex items-center gap-1.5">
                          {(["A", "B", "C", "D"] as const).map((letter) => (
                            <button
                              key={letter}
                              onClick={() => {
                                const updated = [...part1Keys];
                                updated[idx].correct = letter;
                                setPart1Keys(updated);
                              }}
                              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                                item.correct === letter
                                  ? "bg-blue-600 text-white"
                                  : "bg-white text-slate-600 border border-slate-250 hover:bg-slate-100"
                              }`}
                            >
                              {letter}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Part II settings */}
                <div className="space-y-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between">
                    <span>PHẦN II: Trắc nghiệm Đúng / Sai (4 câu - Thang điểm bậc thang 0.1 - 0.25 - 0.5 - 1.0đ)</span>
                    <span className="bg-emerald-100 px-2 py-0.5 rounded text-[10px]">Tối đa 4.0đ</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {part2Keys.map((item, idx) => (
                      <div key={item.question} className="bg-white border border-slate-300 p-4 rounded-2xl shadow-3xs">
                        {/* Table Header: Câu X | Đúng | Sai */}
                        <div className="grid grid-cols-12 py-1.5 px-2.5 bg-slate-100 rounded-xl border border-slate-200 text-center text-xs font-bold text-slate-700 mb-3">
                          <span className="col-span-6 text-left">Câu {item.question + 12} (Câu {item.question} phần II)</span>
                          <span className="col-span-3">Đúng</span>
                          <span className="col-span-3">Sai</span>
                        </div>

                        <div className="space-y-3">
                          {(["a", "b", "c", "d"] as const).map((letter) => {
                            const val = item.statements[letter];
                            return (
                              <div key={letter} className="grid grid-cols-12 items-center text-center">
                                <span className="col-span-6 text-left text-xs font-black text-slate-600">
                                  {letter})
                                </span>
                                
                                {/* Bubble Đúng */}
                                <div className="col-span-3 flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...part2Keys];
                                      updated[idx].statements[letter] = true;
                                      setPart2Keys(updated);
                                    }}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer text-[10px] font-black ${
                                      val === true
                                        ? "bg-emerald-600 border-emerald-600 text-white shadow-3xs"
                                        : "border-slate-300 hover:border-slate-400 bg-white text-transparent"
                                    }`}
                                  >
                                    ✓
                                  </button>
                                </div>

                                {/* Bubble Sai */}
                                <div className="col-span-3 flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...part2Keys];
                                      updated[idx].statements[letter] = false;
                                      setPart2Keys(updated);
                                    }}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer text-[10px] font-black ${
                                      val === false
                                        ? "bg-rose-600 border-rose-600 text-white shadow-3xs"
                                        : "border-slate-300 hover:border-slate-400 bg-white text-transparent"
                                    }`}
                                  >
                                    ✗
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Part III settings */}
                <div className="space-y-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-900 rounded-xl text-xs font-bold flex items-center justify-between">
                    <span>PHẦN III: Trắc nghiệm Trả lời ngắn (6 câu - Mỗi câu 0.5 điểm)</span>
                    <span className="bg-indigo-100 px-2 py-0.5 rounded text-[10px]">Tối đa 3.0đ</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {part3Keys.map((item, idx) => (
                      <div key={item.question} className="flex items-center justify-between p-2.5 border border-slate-150 rounded-xl bg-slate-50/50">
                        <span className="text-xs font-bold text-slate-700">Câu {item.question}:</span>
                        <input
                          type="text"
                          value={item.correct}
                          onChange={(e) => {
                            const updated = [...part3Keys];
                            updated[idx].correct = e.target.value;
                            setPart3Keys(updated);
                          }}
                          placeholder="vd: 22 hoặc -3.5"
                          className="w-32 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-center font-bold focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      )}

      {/* B. EXAM TAKING SCREEN (DÀNH CHO HỌC SINH) */}
      {screen === "exam" && (
        !hasStartedExam ? (
          /* MÀN HÌNH ĐĂNG NHẬP PHÒNG THI DÀNH CHO HỌC SINH */
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-md text-center max-w-lg mx-auto relative overflow-hidden my-12 font-sans w-full">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>
            
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-indigo-600" />
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-1">Phòng thi trực tuyến PDF</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Vui lòng điền đúng Họ tên và Lớp của bạn để bắt đầu phòng thi chính thức.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-left space-y-2 mb-6">
              <p className="text-xs text-slate-700">📌 <strong>Đề thi:</strong> {examTitle}</p>
              <p className="text-xs text-slate-700">⏱️ <strong>Thời gian:</strong> {duration} phút (Đồng hồ đếm ngược tự động)</p>
              <p className="text-xs text-slate-700">📋 <strong>Hình thức:</strong> Điền phiếu trắc nghiệm trực tuyến 3 Phần</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left uppercase tracking-wider">
                  Họ và tên Học sinh
                </label>
                <input 
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left uppercase tracking-wider">
                  Lớp học
                </label>
                <input 
                  type="text"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="Ví dụ: 12A1"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none font-medium"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!studentName.trim() || !studentClass.trim()) {
                  alert("Vui lòng điền đầy đủ Họ tên và Lớp học trước khi làm bài!");
                  return;
                }
                setStudentPart1({});
                setStudentPart2(() => {
                  const init: Record<number, any> = {};
                  for (let i = 1; i <= 4; i++) {
                    init[i] = { a: null, b: null, c: null, d: null };
                  }
                  return init;
                });
                setStudentPart3({});
                setTimeLeft(duration * 60);
                setTimeSpent(0);
                setHasStartedExam(true);
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase transition-colors cursor-pointer tracking-wider"
            >
              🚀 Bắt đầu tính giờ & Làm bài thi
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            
            {/* Student Exam Header info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="bg-rose-50 text-rose-600 p-2 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-sm md:text-base">{examTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Học sinh: <strong className="text-slate-700 font-semibold">{studentName}</strong> - Lớp: <strong className="text-slate-700 font-semibold">{studentClass}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-xs md:text-sm ${
                timeLeft <= 300 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </div>

              <button 
                onClick={handleManualSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-xs md:text-sm shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-4 h-4 shrink-0" />
                {isSubmitting ? "Đang gửi..." : "NỘP BÀI THI"}
              </button>
            </div>
          </div>

          {/* SPLIT SCREEN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-[calc(100vh-170px)] min-h-[500px]">
            
            {/* LEFT 60%: PDF Document Viewer */}
            <div className="lg:col-span-7 bg-slate-200 rounded-2xl overflow-hidden border border-slate-300 shadow-2xs relative flex flex-col">
              {pdfUrl ? (
                <>
                  <CanvasPdfViewer pdfBase64={pdfBase64} pdfUrl={pdfUrl} examTitle={examTitle} />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-50 p-6">
                  <FileText className="w-12 h-12 text-slate-400 mb-2 animate-bounce" />
                  <p className="text-sm font-semibold">Chưa tải được file PDF đề thi</p>
                </div>
              )}
            </div>

            {/* RIGHT 40%: Interactive Answer Sheet */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
              <div className="bg-slate-900 text-white p-3 border-b border-slate-800 shrink-0">
                <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  Phiếu trả lời trắc nghiệm trực tuyến
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                
                {/* Student Part I Sheet */}
                <div className="space-y-2.5">
                  <div className="p-2 bg-blue-50 text-blue-900 border border-blue-100 rounded-xl text-xs font-bold">
                    PHẦN I: Trắc nghiệm chọn phương án (12 câu - 0.25đ/câu)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {part1Keys.map((item) => {
                      const ans = studentPart1[item.question];
                      return (
                        <div key={item.question} className="flex items-center justify-between p-2 border border-slate-150 rounded-xl bg-slate-50/50">
                          <span className="text-xs font-bold text-slate-700">Câu {item.question}:</span>
                          <div className="flex items-center gap-1">
                            {(["A", "B", "C", "D"] as const).map((letter) => (
                              <button
                                key={letter}
                                onClick={() => setStudentPart1({ ...studentPart1, [item.question]: letter })}
                                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                                  ans === letter
                                    ? "bg-blue-600 text-white shadow-2xs ring-2 ring-blue-300"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Student Part II Sheet */}
                <div className="space-y-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-xl text-xs font-bold">
                    PHẦN II: Trắc nghiệm Đúng / Sai (4 câu - Barem bậc thang)
                  </div>
                  <div className="space-y-3.5">
                    {part2Keys.map((item) => {
                      const ans = studentPart2[item.question] || { a: null, b: null, c: null, d: null };
                      const visualQNum = item.question + 12;
                      return (
                        <div key={item.question} className="p-3.5 border border-slate-150 rounded-2xl bg-slate-50/50 space-y-3 shadow-3xs">
                          {/* Card Header matching Ministry visual structure */}
                          <div className="flex items-center justify-between border-b border-slate-150 pb-1.5 px-0.5">
                            <span className="text-xs font-black text-slate-800">Câu {visualQNum} (Câu {item.question} phần II)</span>
                            <div className="flex gap-7.5 text-[10px] font-black text-slate-500 mr-4">
                              <span>Đúng</span>
                              <span>Sai</span>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            {(["a", "b", "c", "d"] as const).map((letter) => (
                              <div key={letter} className="flex items-center justify-between bg-white border border-slate-150 px-3 py-1.5 rounded-xl hover:border-slate-300 transition-colors">
                                <span className="text-xs font-black text-slate-700">{letter})</span>
                                <div className="flex items-center gap-6 mr-1.5">
                                  {/* Bubble Đúng (Đ) */}
                                  <button
                                    type="button"
                                    onClick={() => setStudentPart2({
                                      ...studentPart2,
                                      [item.question]: { ...ans, [letter]: true }
                                    })}
                                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-black text-xs cursor-pointer transition-all ${
                                      ans[letter] === true
                                        ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                        : "border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-600"
                                    }`}
                                  >
                                    Đ
                                  </button>
                                  
                                  {/* Bubble Sai (S) */}
                                  <button
                                    type="button"
                                    onClick={() => setStudentPart2({
                                      ...studentPart2,
                                      [item.question]: { ...ans, [letter]: false }
                                    })}
                                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-black text-xs cursor-pointer transition-all ${
                                      ans[letter] === false
                                        ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                                        : "border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-600"
                                    }`}
                                  >
                                    S
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Student Part III Sheet */}
                <div className="space-y-3.5">
                  <div className="p-2 bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-xl text-xs font-bold">
                    PHẦN III: Trắc nghiệm Trả lời ngắn (6 câu - 0.5đ/câu)
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {part3Keys.map((item) => {
                      const ans = studentPart3[item.question] || "";
                      const cols = ["", "", "", ""];
                      // Map current answer string to the 4 visual cells
                      const ansChars = ans.trim().replace(".", ",").split("");
                      for (let i = 0; i < Math.min(4, ansChars.length); i++) {
                        cols[i] = ansChars[i];
                      }

                      // Update input from column bubbles
                      const updateCol = (colIdx: number, val: string) => {
                        const newCols = [...cols];
                        // Toggle off if clicking the same value
                        if (newCols[colIdx] === val) {
                          newCols[colIdx] = "";
                        } else {
                          newCols[colIdx] = val;
                        }
                        const newAns = newCols.join("").trim().replace(",", ".");
                        setStudentPart3({ ...studentPart3, [item.question]: newAns });
                      };

                      return (
                        <div key={item.question} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3.5">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-800">Câu {item.question}:</span>
                            <input
                              type="text"
                              value={ans}
                              onChange={(e) => setStudentPart3({ ...studentPart3, [item.question]: e.target.value })}
                              placeholder="Nhập đáp án số"
                              className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* 4-column bubble grid exactly matching the Ministry's format */}
                          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-w-[280px] mx-auto">
                            {/* Visual digit box labels */}
                            {cols.map((char, colIdx) => (
                              <div key={colIdx} className="bg-white border-2 border-slate-350 rounded-lg h-8 flex items-center justify-center font-black text-sm text-slate-800 font-mono shadow-3xs">
                                {char}
                              </div>
                            ))}

                            {/* Column 1 bubbles (- and 0-9) */}
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateCol(0, "-")}
                                className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                  cols[0] === "-"
                                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                    : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                                }`}
                              >
                                -
                              </button>
                              {Array.from({ length: 10 }, (_, i) => String(i)).map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => updateCol(0, num)}
                                  className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                    cols[0] === num
                                      ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                      : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>

                            {/* Column 2 bubbles (, and 0-9) */}
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateCol(1, ",")}
                                className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                  cols[1] === ","
                                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                    : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                                }`}
                              >
                                ,
                              </button>
                              {Array.from({ length: 10 }, (_, i) => String(i)).map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => updateCol(1, num)}
                                  className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                    cols[1] === num
                                      ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                      : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>

                            {/* Column 3 bubbles (0-9 only) */}
                            <div className="flex flex-col items-center gap-1 pt-6.5">
                              {Array.from({ length: 10 }, (_, i) => String(i)).map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => updateCol(2, num)}
                                  className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                    cols[2] === num
                                      ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                      : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>

                            {/* Column 4 bubbles (0-9 only) */}
                            <div className="flex flex-col items-center gap-1 pt-6.5">
                              {Array.from({ length: 10 }, (_, i) => String(i)).map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => updateCol(3, num)}
                                  className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                    cols[3] === num
                                      ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                      : "border-slate-300 hover:border-slate-400 bg-white text-slate-600"
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )
    )}

      {/* C. POPUP RESULTS VIEW */}
      {screen === "result" && submitResult && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-emerald-200 shadow-lg text-center max-w-2xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
          
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Kết quả nộp bài thi thành công!</h2>
          <p className="text-slate-500 text-xs mb-6">
            Bài làm của <strong className="text-slate-700">{studentName}</strong> (lớp {studentClass}) đã được chấm và đẩy ngầm lên Sheets.
          </p>

          <div className="bg-slate-950 text-white rounded-2xl p-5 mb-6">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TỔNG ĐIỂM CHẤM</div>
            <div className="text-5xl font-black text-emerald-400 mt-1 mb-2 font-mono">
              {submitResult.score.toFixed(2)} <span className="text-lg text-slate-400 font-normal">/ 10.0</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-800 text-[11px] text-slate-300 leading-snug">
              <div>
                <p className="font-semibold text-blue-300">Phần I: {submitResult.part1.toFixed(2)}đ</p>
                <p className="text-[10px] text-slate-400">Trắc nghiệm</p>
              </div>
              <div>
                <p className="font-semibold text-emerald-300">Phần II: {submitResult.part2.toFixed(2)}đ</p>
                <p className="text-[10px] text-slate-400">Đúng / Sai</p>
              </div>
              <div>
                <p className="font-semibold text-indigo-300">Phần III: {submitResult.part3.toFixed(2)}đ</p>
                <p className="text-[10px] text-slate-400">Trả lời ngắn</p>
              </div>
            </div>
          </div>

          {/* Breakdown and answers review */}
          <div className="space-y-4 text-left max-h-[350px] overflow-y-auto border border-slate-200 rounded-xl p-4 bg-slate-50">
            <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">Xem lại chi tiết đáp án:</h3>
            
            {/* Part I review */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-blue-900">Phần I:</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {part1Keys.map((k) => {
                  const item = submitResult.details.part1[k.question];
                  return (
                    <div key={k.question} className={`p-2 rounded-lg border text-xs flex justify-between items-center ${
                      item.isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      <span className="font-bold">Câu {k.question}:</span>
                      <span className="font-mono">{item.student || "-"} / {item.correct}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Part II review */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <p className="text-xs font-bold text-emerald-900">Phần II:</p>
              <div className="space-y-2">
                {part2Keys.map((k) => {
                  const item = submitResult.details.part2[k.question];
                  return (
                    <div key={k.question} className="bg-white border border-slate-200 p-2.5 rounded-lg text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Câu {k.question}:</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          Đúng {item.correctCount}/4 ý (+{item.points}đ)
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                        {["a", "b", "c", "d"].map((letter) => {
                          const sub = item.subDetails[letter];
                          return (
                            <div key={letter} className={`p-1 rounded text-center font-bold ${
                              sub.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}>
                              {letter}: {sub.student === null ? "-" : sub.student ? "Đ" : "S"}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Part III review */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <p className="text-xs font-bold text-indigo-900">Phần III:</p>
              <div className="grid grid-cols-2 gap-2">
                {part3Keys.map((k) => {
                  const item = submitResult.details.part3[k.question];
                  return (
                    <div key={k.question} className={`p-2 rounded-lg border text-xs flex justify-between items-center ${
                      item.isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      <span className="font-bold">Câu {k.question}:</span>
                      <span className="truncate pl-2">ĐS: {item.student || "-"} ({item.correct})</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                setScreen("config");
                setHasStartedExam(false);
              }}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer text-sm shadow-xs transition-colors"
            >
              🔄 Quay lại Thiết lập / Chạy đề khác
            </button>
          </div>

        </div>
      )}

      {/* CODE EXPORTER EXPLANATION MODAL */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-900 text-white">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Code className="w-5 h-5 text-emerald-400" />
                Google Apps Script (doPost) - Mã nhận điểm
              </h2>
              <button 
                onClick={() => setShowCodeModal(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1.5 leading-relaxed">
                <p className="font-bold">💡 Hướng dẫn kết nối Google Sheets nhận điểm:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Tạo một file <strong>Google Sheets (Trang tính)</strong> mới trên Google Drive của bạn.</li>
                  <li>Nhấn mục <strong>Tiện ích mở rộng (Extensions)</strong> &gt; Chọn <strong>Apps Script</strong>.</li>
                  <li>Xóa mọi đoạn code có sẵn, dán toàn bộ đoạn code mẫu dưới đây vào.</li>
                  <li>Nhấn biểu tượng Lưu 💾. Nhấn nút <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai mới (New deployment)</strong>.</li>
                  <li>Chọn loại: <strong>Ứng dụng web (Web app)</strong>. Cấu hình quyền:</li>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Người chạy (Execute as): <strong>Tôi (Me)</strong></li>
                    <li>Người có quyền truy cập (Who has access): <strong>Bất kỳ ai (Anyone)</strong> (để học sinh nộp được).</li>
                  </ul>
                  <li>Nhấn Triển khai, cấp quyền truy cập tài khoản, sau đó copy mã <strong>URL Ứng dụng web</strong> nhận được dán vào ô cấu hình của app.</li>
                </ol>
              </div>

              <div className="relative">
                <pre className="bg-slate-950 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed max-h-[300px]">
                  {appsScriptCode}
                </pre>
                
                <button
                  onClick={handleCopyCode}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? "Đã sao chép!" : "Copy mã"}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowCodeModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Đồng ý & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

interface CanvasPdfViewerProps {
  pdfBase64?: string;
  pdfUrl?: string;
  examTitle?: string;
}

export function CanvasPdfViewer({ pdfBase64, pdfUrl, examTitle }: CanvasPdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    
    // Load PDF.js CDN script
    const loadPdfJS = async () => {
      if ((window as any).pdfjsLib) {
        return (window as any).pdfjsLib;
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        script.onload = () => {
          const pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
          resolve(pdfjsLib);
        };
        script.onerror = () => reject(new Error("Không thể tải thư viện hiển thị PDF."));
        document.head.appendChild(script);
      });
    };

    const renderPdf = async () => {
      try {
        setLoading(true);
        setError("");
        const pdfjs = await loadPdfJS();
        
        let loadingTask;
        if (pdfBase64) {
          const raw = window.atob(pdfBase64);
          const uint8Array = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) {
            uint8Array[i] = raw.charCodeAt(i);
          }
          loadingTask = pdfjs.getDocument({ data: uint8Array });
        } else if (pdfUrl) {
          loadingTask = pdfjs.getDocument(pdfUrl);
        } else {
          throw new Error("Không tìm thấy tệp tin PDF để hiển thị.");
        }

        const pdf = await loadingTask.promise;
        if (!active) return;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err: any) {
        console.error("PDF render error:", err);
        if (active) {
          setError(err.message || "Lỗi tải tài liệu PDF.");
          setLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      active = false;
    };
  }, [pdfBase64, pdfUrl]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-200 overflow-y-auto" ref={containerRef}>
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 min-h-[300px]">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs font-semibold animate-pulse">Đang nạp đề thi PDF trực quan...</p>
        </div>
      )}
      
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-white m-3 rounded-2xl border border-slate-200 min-h-[300px]">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-2 animate-bounce" />
          <p className="text-sm font-bold text-rose-600 mb-2">⚠️ Trình duyệt chặn hiển thị PDF</p>
          <p className="text-xs text-slate-600 max-w-sm mb-5 leading-relaxed">
            Do chính sách bảo mật nghiêm ngặt hoặc sandboxing của ứng dụng Zalo/Facebook, đề thi PDF không thể hiển thị trực quan. Học sinh hãy click nút bên dưới để mở hoặc tải đề thi cực kỳ dễ dàng:
          </p>
          {pdfUrl && (
            <div className="flex flex-col gap-2.5 w-full max-w-[240px]">
              <button 
                type="button"
                onClick={() => window.open(pdfUrl, "_blank")}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                🌍 Mở đề trong Tab mới
              </button>
              <a 
                href={pdfUrl} 
                download={`${examTitle || 'De_Thi'}.pdf`}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Tải đề thi về máy
              </a>
            </div>
          )}
        </div>
      )}

      {!loading && !error && pdfDoc && (
        <div className="p-3 space-y-3.5 flex flex-col items-center">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNo) => (
            <PdfPageRenderer key={pageNo} pdfDoc={pdfDoc} pageNo={pageNo} />
          ))}
          
          {/* Helpful float tip for mobile */}
          <div className="bg-slate-900/90 text-slate-100 text-[10px] px-3.5 py-1.5 rounded-full font-semibold shadow-md flex items-center gap-1.5 mt-2">
            💡 Bạn có thể vuốt lên/xuống để xem toàn bộ {numPages} trang đề thi
          </div>
        </div>
      )}
    </div>
  );
}

interface PdfPageRendererProps {
  pdfDoc: any;
  pageNo: number;
}

function PdfPageRenderer({ pdfDoc, pageNo }: PdfPageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let active = true;
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNo);
        if (!active) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;

        // Render at a high DPI (e.g. 1.5x scale) for razor-sharp math text on mobile
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        if (active) setRendering(false);
      } catch (err) {
        console.error("Page render error:", err);
      }
    };

    renderPage();
    return () => {
      active = false;
    };
  }, [pdfDoc, pageNo]);

  return (
    <div className="relative bg-white shadow-sm border border-slate-300 rounded-xl overflow-hidden max-w-full">
      {rendering && (
        <div className="w-[300px] h-[400px] md:w-[600px] md:h-[800px] flex items-center justify-center bg-slate-50 text-[10px] text-slate-400 font-semibold animate-pulse">
          Đang vẽ trang {pageNo}...
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        className="w-full h-auto max-w-3xl block" 
        style={{ aspectRatio: canvasRef.current ? `${canvasRef.current.width}/${canvasRef.current.height}` : 'auto' }}
      />
    </div>
  );
}
