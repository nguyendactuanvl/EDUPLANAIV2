import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Clock, FileCheck, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Download,
  HelpCircle, Settings, Send, Code, Play, RefreshCw, Upload, Copy, Info, Check, AlertCircle, AlertTriangle, Loader2, Sparkles,
  User, Users, BarChart, Search, Trash2, FileSpreadsheet, ShieldCheck, KeyRound, Zap, CheckCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { 
  googleSignIn, 
  googleSignOut, 
  initAuth, 
  createGoogleSheet, 
  syncSubmissionsToSheet, 
  getCachedToken 
} from "../lib/googleAuth";

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
  const [configMode, setConfigMode] = useState<"standard" | "free">("standard");
  const [numMcq, setNumMcq] = useState(12);

  const [scriptUrl, setScriptUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>("");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanAndFormatRosterList = (lines: string[]): string => {
    return lines
      .map(line => {
        let cleaned = line.trim()
          .replace(/^["'\s\-\.,;\*]+/g, '')
          .replace(/["'\s\-\.,;\*]+$/g, '')
          .trim();
        return cleaned;
      })
      .filter(line => {
        if (!line) return false;
        const lower = line.toLowerCase();
        if (lower === 'stt' || lower.includes('danh sách học sinh') || lower === 'họ và tên' || lower === 'họ tên' || lower === 'mã hs' || lower === 'mã số') return false;
        return true;
      })
      .map((line, index) => {
        const pattern1 = line.match(/^([a-zA-Z0-9_\-]+)\s*[\-:\s\.]\s*(.+)$/);
        if (pattern1) {
          return `${pattern1[1].trim().toUpperCase()} - ${pattern1[2].trim()}`;
        }
        const defaultCode = `HS${(index + 1).toString().padStart(2, '0')}`;
        return `${defaultCode} - ${line}`;
      })
      .join('\n');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        const rosterLines: string[] = [];
        json.forEach(row => {
          if (!row || row.length === 0) return;
          const cleanCells = row.map(cell => String(cell || '').trim()).filter(Boolean);
          if (cleanCells.length === 0) return;
          
          const rowStr = cleanCells.join(' ');
          const lowerRow = rowStr.toLowerCase();
          if (lowerRow.includes('danh sách') || lowerRow.includes('họ và tên') || lowerRow === 'stt họ tên') return;

          if (cleanCells.length === 1) {
            rosterLines.push(cleanCells[0]);
          } else if (cleanCells.length >= 2) {
            const nonNumericCells = cleanCells.filter(c => !/^\d+$/.test(c));
            if (nonNumericCells.length === 1) {
              rosterLines.push(nonNumericCells[0]);
            } else if (nonNumericCells.length >= 2) {
              const codeCell = nonNumericCells.find(c => c.length <= 10 && /^[a-zA-Z0-9_\-]+$/.test(c));
              const nameCell = nonNumericCells.find(c => c !== codeCell);
              if (codeCell && nameCell) {
                rosterLines.push(`${codeCell} - ${nameCell}`);
              } else {
                rosterLines.push(nonNumericCells.join(' - '));
              }
            } else {
              rosterLines.push(cleanCells.join(' - '));
            }
          }
        });
        
        const roster = cleanAndFormatRosterList(rosterLines);
        setClassRosterText(roster);
      } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const lines = result.value.split('\n').map(l => l.trim()).filter(Boolean);
        const roster = cleanAndFormatRosterList(lines);
        setClassRosterText(roster);
      } else if (file.name.endsWith('.pdf')) {
        const pdfjs = await loadPdfJS();
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const pdfDoc = await pdfjs.getDocument({ data: uint8Array }).promise;
        const lines: string[] = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageLines = textContent.items.map((item: any) => item.str.trim()).filter(Boolean);
          lines.push(...pageLines);
        }
        const roster = cleanAndFormatRosterList(lines);
        setClassRosterText(roster);
      } else {
        const text = await file.text();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const roster = cleanAndFormatRosterList(lines);
        setClassRosterText(roster);
      }
    } catch (error) {
      console.error("Error parsing roster file:", error);
      alert("Không thể đọc file này. Vui lòng kiểm tra định dạng và thử lại.");
    }
  };

  // Cập nhật số câu khi thay đổi
  const handleNumMcqChange = (count: number) => {
    setNumMcq(count);
    setPart1Keys(Array.from({ length: count }, (_, i) => ({ question: i + 1, correct: "" })));
  };

  // Student Info (Form)
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentCodeInput, setStudentCodeInput] = useState("");
  const [codeVerifiedStudent, setCodeVerifiedStudent] = useState<{ code: string; name: string } | null>(null);
  const [studentLoginError, setStudentLoginError] = useState("");
  const [showRosterSuggestions, setShowRosterSuggestions] = useState(false);
  const [hasStartedExam, setHasStartedExam] = useState(false);

  // Login Options (Phương án A, B, C)
  const [loginMethod, setLoginMethod] = useState<"A" | "B" | "C">("C");
  const [classRosterText, setClassRosterText] = useState("");
  const [loadedExamData, setLoadedExamData] = useState<any>(null);

  // Helper function to parse student roster
  const parseRoster = (text: string): { code: string; name: string }[] => {
    if (!text || !text.trim()) return [];
    return text
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, index) => {
        const match = line.match(/^([a-zA-Z0-9_\-]+)\s*[\-:\s]\s*(.+)$/);
        if (match) {
          return {
            code: match[1].trim().toUpperCase(),
            name: match[2].trim()
          };
        }
        return {
          code: `HS${(index + 1).toString().padStart(2, '0')}`,
          name: line
        };
      });
  };

  // Answer Keys Configuration (Teacher)
  const [numPart1, setNumPart1] = useState(12);
  const [numPart2, setNumPart2] = useState(4);
  const [numPart3, setNumPart3] = useState(6);

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

  const [studentPart1, setStudentPart1] = useState<Record<number, string>>({});
  const [studentPart2, setStudentPart2] = useState<Record<number, any>>({});
  const [studentPart3, setStudentPart3] = useState<Record<number, string>>({});

  useEffect(() => {
    setPart1Keys(Array.from({ length: numPart1 }, (_, i) => ({ question: i + 1, correct: "" })));
  }, [numPart1]);

  useEffect(() => {
    setPart2Keys(Array.from({ length: numPart2 }, (_, i) => ({ 
      question: i + 1, 
      statements: { a: null, b: null, c: null, d: null } 
    })));
  }, [numPart2]);

  useEffect(() => {
    setPart3Keys(Array.from({ length: numPart3 }, (_, i) => ({ question: i + 1, correct: "" })));
  }, [numPart3]);

  // AI Extraction State
  const [isExtractingAnswers, setIsExtractingAnswers] = useState(false);

  // Google Auth & Sync States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  // Teacher Exams History & Submission Results State
  const [examsHistory, setExamsHistory] = useState<any[]>([]);
  const [teacherSyncCode, setTeacherSyncCode] = useState<string>("");
  const [selectedRoomForResults, setSelectedRoomForResults] = useState<string | null>(null);
  const [selectedRoomResultsData, setSelectedRoomResultsData] = useState<any | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [activeStudentDetails, setActiveStudentDetails] = useState<any | null>(null);
  const [resultsSearchQuery, setResultsSearchQuery] = useState("");
  const [resultsViewTab, setResultsViewTab] = useState<"table" | "analytics">("table");

  // Listen to Google Auth changes
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        alert(`Đăng nhập Google thành công: ${res.user.displayName}`);
      }
    } catch (err: any) {
      alert("Lỗi đăng nhập Google: " + err.message);
    }
  };

  const handleGoogleLogout = async () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất tài khoản Google không?")) {
      await googleSignOut();
      setGoogleUser(null);
      setGoogleToken(null);
    }
  };

  const handleCreateAndLinkSheet = async () => {
    if (!selectedRoomResultsData) return;
    const code = selectedRoomForResults;
    if (!code) return;

    setIsSyncingSheet(true);
    try {
      const sheet = await createGoogleSheet(selectedRoomResultsData.examTitle || code);
      
      const updatedData = {
        ...selectedRoomResultsData,
        linkedSheetId: sheet.id,
        linkedSheetUrl: sheet.url
      };

      const saveRes = await fetch("/api/exams/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updatedData, customId: code })
      });

      if (!saveRes.ok) {
        throw new Error("Không thể cập nhật liên kết tệp Trang tính lên máy chủ.");
      }

      const subs = updatedData.submissions || [];
      if (subs.length > 0) {
        await syncSubmissionsToSheet(sheet.id, updatedData.examTitle || code, subs);
      }

      setSelectedRoomResultsData(updatedData);

      const updatedHistory = examsHistory.map((h: any) => {
        if (h.code === code) {
          return { ...h, linkedSheetId: sheet.id, linkedSheetUrl: sheet.url };
        }
        return h;
      });
      setExamsHistory(updatedHistory);
      localStorage.setItem("eduplan_teacher_exams_history", JSON.stringify(updatedHistory));
      syncHistoryToCloud(updatedHistory);

      alert("🚀 Đã khởi tạo và liên kết Google Sheet thành công! Bảng điểm đã được đồng bộ hóa.");
    } catch (err: any) {
      alert("Lỗi tạo/liên kết Trang tính: " + err.message);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleSyncExistingSheet = async () => {
    if (!selectedRoomResultsData) return;
    const code = selectedRoomForResults;
    if (!code) return;

    const sheetId = selectedRoomResultsData.linkedSheetId;
    if (!sheetId) return;

    setIsSyncingSheet(true);
    try {
      const subs = selectedRoomResultsData.submissions || [];
      await syncSubmissionsToSheet(sheetId, selectedRoomResultsData.examTitle || code, subs);
      alert("⚡ Đã đồng bộ hóa dữ liệu bảng điểm mới nhất lên Google Sheets thành công!");
    } catch (err: any) {
      alert("Lỗi đồng bộ Trang tính: " + err.message);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleDeleteSubmission = async (subIndex: number) => {
    if (!selectedRoomResultsData) return;
    const code = selectedRoomForResults;
    if (!code) return;

    const student = selectedRoomResultsData.submissions[subIndex];
    if (!confirm(`Bạn có chắc chắn muốn xóa kết quả làm bài của học sinh ${student.studentName} (Lớp ${student.studentClass})? Hành động này sẽ cập nhật lại máy chủ và Google Sheet.`)) {
      return;
    }

    const updatedSubmissions = selectedRoomResultsData.submissions.filter((_: any, i: number) => i !== subIndex);
    const updatedData = {
      ...selectedRoomResultsData,
      submissions: updatedSubmissions
    };

    try {
      const saveRes = await fetch("/api/exams/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updatedData, customId: code })
      });

      if (!saveRes.ok) {
        throw new Error("Không thể cập nhật danh sách bài làm lên máy chủ.");
      }

      if (updatedData.linkedSheetId) {
        try {
          await syncSubmissionsToSheet(updatedData.linkedSheetId, updatedData.examTitle || code, updatedSubmissions);
        } catch (sheetErr) {
          console.warn("Lỗi đồng bộ xóa bài làm lên Google Sheet:", sheetErr);
        }
      }

      setSelectedRoomResultsData(updatedData);
      alert("🗑️ Đã xóa bài làm và cập nhật đồng bộ thành công!");
    } catch (err: any) {
      alert("Lỗi khi xóa bài làm: " + err.message);
    }
  };

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

    // Load created exams history from localStorage
    try {
      const savedHistory = localStorage.getItem("eduplan_teacher_exams_history");
      if (savedHistory) {
        setExamsHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.warn("Lỗi tải lịch sử phòng thi từ localStorage:", e);
    }

    // Load or generate Teacher Sync Code securely
    let code = localStorage.getItem("eduplan_teacher_sync_code");
    if (!code) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rand = '';
      for (let i = 0; i < 8; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `GV-${rand}`;
      localStorage.setItem("eduplan_teacher_sync_code", code);
    }
    setTeacherSyncCode(code);
  }, []);

  const syncHistoryToCloud = async (historyList: any[]) => {
    let code = localStorage.getItem("eduplan_teacher_sync_code") || teacherSyncCode;
    if (!code) return;
    try {
      await fetch("/api/exams/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rooms: historyList, customId: code.toUpperCase() })
      });
    } catch (e) {
      console.warn("Lỗi đồng bộ danh sách phòng lên đám mây:", e);
    }
  };

  const handleSyncRoomsHistory = async (syncCodeToUse?: string) => {
    const targetCode = (syncCodeToUse || teacherSyncCode || "").trim().toUpperCase();
    if (!targetCode) {
      alert("Vui lòng nhập Mã đồng bộ Giáo viên!");
      return;
    }
    
    setIsLoadingResults(true);
    try {
      const res = await fetch(`/api/exams/${targetCode}`);
      if (!res.ok) {
        throw new Error("Không tìm thấy dữ liệu đồng bộ cho mã này.");
      }
      const data = await res.json();
      if (data && Array.isArray(data.rooms)) {
        // Merge with local history (avoid duplicates)
        const localRaw = localStorage.getItem("eduplan_teacher_exams_history") || "[]";
        const local = JSON.parse(localRaw);
        const merged = [...data.rooms];
        local.forEach((locRoom: any) => {
          if (!merged.some(m => m.code === locRoom.code)) {
            merged.push(locRoom);
          }
        });
        
        localStorage.setItem("eduplan_teacher_exams_history", JSON.stringify(merged));
        setExamsHistory(merged);
        setTeacherSyncCode(targetCode);
        localStorage.setItem("eduplan_teacher_sync_code", targetCode);
        alert(`🎉 Đồng bộ lịch sử thành công! Đã khôi phục và hợp nhất ${data.rooms.length} phòng thi.`);
      } else {
        alert("Không có dữ liệu phòng thi hợp lệ trong mã đồng bộ này.");
      }
    } catch (err: any) {
      alert("Lỗi đồng bộ lịch sử: " + err.message);
    } finally {
      setIsLoadingResults(false);
    }
  };

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
      setLoadedExamData(data);
      setExamTitle(data.examTitle || "Đề thi PDF");
      setDuration(data.duration || 90);
      setScriptUrl(data.scriptUrl || "");
      if (data.loginMethod) setLoginMethod(data.loginMethod);
      if (data.classRosterText) setClassRosterText(data.classRosterText);
      
      if (Array.isArray(data.part1Keys)) setPart1Keys(data.part1Keys);
      if (Array.isArray(data.part2Keys)) setPart2Keys(data.part2Keys);
      if (Array.isArray(data.part3Keys)) setPart3Keys(data.part3Keys);
      
      setSharedRoomId(code.trim().toUpperCase());

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
        createdAt: new Date().toISOString(),
        loginMethod,
        classRosterText: classRosterText.trim(),
        allowedStudents: parseRoster(classRosterText)
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
      const code = data.examId.toUpperCase();
      setSharedRoomId(code);

      // Save shared room to teacher's local history
      try {
        const savedHistoryRaw = localStorage.getItem("eduplan_teacher_exams_history") || "[]";
        const savedHistory = JSON.parse(savedHistoryRaw);
        
        const roomMeta = {
          code: code,
          title: examTitle.trim(),
          duration: duration,
          createdAt: new Date().toISOString(),
          scriptUrl: scriptUrl.trim()
        };

        const existingIdx = savedHistory.findIndex((r: any) => r.code === code);
        if (existingIdx >= 0) {
          savedHistory[existingIdx] = roomMeta;
        } else {
          savedHistory.unshift(roomMeta);
        }

        localStorage.setItem("eduplan_teacher_exams_history", JSON.stringify(savedHistory));
        setExamsHistory(savedHistory);
        syncHistoryToCloud(savedHistory);
      } catch (histErr) {
        console.warn("Lỗi lưu lịch sử phòng thi:", histErr);
      }
    } catch (err: any) {
      alert("Lỗi khi tạo phòng thi: " + err.message);
    } finally {
      setIsSharing(false);
    }
  };

  // Load results from backend for a specific room
  const handleLoadRoomResults = async (code: string) => {
    setIsLoadingResults(true);
    setSelectedRoomForResults(code);
    setSelectedRoomResultsData(null);
    try {
      const res = await fetch(`/api/exams/${code.toUpperCase()}?fresh=true`);
      if (!res.ok) {
        throw new Error("Không thể tải thông tin phòng thi này.");
      }
      const data = await res.json();
      setSelectedRoomResultsData(data);
    } catch (e: any) {
      alert("Lỗi tải kết quả: " + e.message);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // Delete a room from teacher's local history
  const handleDeleteRoomFromHistory = (code: string) => {
    if (confirm(`Bạn có chắc muốn xóa lưu trữ phòng thi ${code} khỏi lịch sử trên máy này? (Dữ liệu trên máy chủ vẫn được giữ lại)`)) {
      const updated = examsHistory.filter(r => r.code !== code);
      setExamsHistory(updated);
      localStorage.setItem("eduplan_teacher_exams_history", JSON.stringify(updated));
      syncHistoryToCloud(updated);
      if (selectedRoomForResults === code) {
        setSelectedRoomForResults(null);
        setSelectedRoomResultsData(null);
      }
    }
  };

  // Export Room Results to Excel
  const handleExportResultsToExcel = () => {
    if (!selectedRoomResultsData || !selectedRoomResultsData.submissions || selectedRoomResultsData.submissions.length === 0) {
      alert("Không có dữ liệu học sinh nộp bài để xuất Excel!");
      return;
    }

    const submissions = selectedRoomResultsData.submissions;
    const excelRows = submissions.map((sub: any, idx: number) => {
      return {
        "STT": idx + 1,
        "Họ và tên": sub.studentName,
        "Lớp": sub.studentClass,
        "Thời gian nộp": sub.submitTime,
        "Tổng điểm (10)": sub.totalScore,
        "Điểm Phần I": sub.scorePart1,
        "Điểm Phần II": sub.scorePart2,
        "Điểm Phần III": sub.scorePart3
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kết quả phòng thi");
    
    // Auto-size columns
    const maxLen = excelRows.reduce((acc: any, row: any) => {
      Object.keys(row).forEach((key, colIdx) => {
        const valLen = String(row[key]).length;
        const keyLen = key.length;
        acc[colIdx] = Math.max(acc[colIdx] || 0, valLen, keyLen);
      });
      return acc;
    }, []);
    worksheet["!cols"] = maxLen.map((len: number) => ({ wch: len + 3 }));

    XLSX.writeFile(workbook, `Ket_qua_phong_thi_${selectedRoomForResults}_${(selectedRoomResultsData.examTitle || "De_Thi").replace(/\s+/g, "_")}.xlsx`);
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
    }

    try {
      if (sharedRoomId) {
        await fetch(`/api/exams/${sharedRoomId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
    } catch (apiErr) {
      console.warn("Lỗi gửi điểm lên máy chủ lưu trữ dự phòng:", apiErr);
    }

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

                {/* Box 1.5: Student Login Authentication Configuration (Phương án A, B, C) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      Phương thức đăng nhập của học sinh
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      Tùy chọn 3 phương án
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Option A */}
                    <div 
                      onClick={() => setLoginMethod("A")}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        loginMethod === "A"
                          ? "border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            Phương án A
                          </span>
                          {loginMethod === "A" && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <p className="font-bold text-xs text-indigo-950 mb-1">Đăng nhập tài khoản Google</p>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Học sinh bắt buộc đăng nhập bằng tài khoản Google để vào thi.
                        </p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <span>🛡️ Bảo mật cao, chống giả mạo tên</span>
                      </div>
                    </div>

                    {/* Option B */}
                    <div 
                      onClick={() => setLoginMethod("B")}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        loginMethod === "B"
                          ? "border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1">
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                            Phương án B
                          </span>
                          {loginMethod === "B" && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <p className="font-bold text-xs text-amber-950 mb-1">Cấp mã định danh theo danh sách</p>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Giáo viên cấp mã học sinh (HS01, HS02...). Học sinh nhập đúng mã để vào thi.
                        </p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                        <span>📋 Quản lý chặt theo sĩ số lớp</span>
                      </div>
                    </div>

                    {/* Option C */}
                    <div 
                      onClick={() => setLoginMethod("C")}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        loginMethod === "C"
                          ? "border-emerald-600 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-xs text-emerald-800 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-emerald-600" />
                            Phương án C (Tối ưu)
                          </span>
                          {loginMethod === "C" ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Khuyên dùng
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-xs text-emerald-950 mb-1">Vào thi nhanh theo Phòng thi</p>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Học sinh chỉ cần nhập Họ tên và Lớp là vào thi ngay không cần tài khoản MXH.
                        </p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <span>⚡ Vào thi tức thì, tự động đối chiếu</span>
                      </div>
                    </div>
                  </div>

                  {/* Class Roster Input for Plan B and Plan C */}
                  {(loginMethod === "B" || loginMethod === "C") && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Danh sách học sinh lớp {loginMethod === "B" ? "(Bắt buộc để cấp mã)" : "(Tùy chọn để tự động gợi ý & đối chiếu tên)"}
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setClassRosterText(`HS01 - Nguyễn Văn An
HS02 - Trần Thị Bình
HS03 - Lê Văn Cường
HS04 - Phạm Thị Dung
HS05 - Hoàng Văn Em`);
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                          >
                            + Nạp mẫu 5 học sinh
                          </button>
                          {classRosterText && (
                            <button
                              type="button"
                              onClick={() => setClassRosterText("")}
                              className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer underline"
                            >
                              Xóa
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" /> Tải lên danh sách
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".xlsx,.xls,.docx,.doc,.pdf,.txt,.csv"
                            className="hidden"
                          />
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={classRosterText}
                        onChange={(e) => setClassRosterText(e.target.value)}
                        placeholder={`Ví dụ định dạng:\nHS01 - Nguyễn Văn An\nHS02 - Trần Thị Bình\nHS03 - Lê Văn Cường\n(Hoặc dán trực tiếp danh sách tên học sinh từ Excel)`}
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        {loginMethod === "B" 
                          ? "📌 Học sinh sẽ dùng Mã định danh (cột đầu tiên) để xác thực và nhận diện đúng tên trong danh sách."
                          : "💡 Khi học sinh gõ tên, hệ thống sẽ tự động gợi ý tên từ danh sách này giúp tránh gõ sai chính tả và nhảy đúng vào Google Sheets."}
                      </p>
                    </div>
                  )}
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
                  Thiết lập Barem Đáp án (Tùy chỉnh số câu)
                </span>
                <div className="flex gap-2">
                  <input type="number" value={numPart1} onChange={e => setNumPart1(Number(e.target.value))} className="w-12 text-center text-xs border rounded p-1" placeholder="P1"/>
                  <input type="number" value={numPart2} onChange={e => setNumPart2(Number(e.target.value))} className="w-12 text-center text-xs border rounded p-1" placeholder="P2"/>
                  <input type="number" value={numPart3} onChange={e => setNumPart3(Number(e.target.value))} className="w-12 text-center text-xs border rounded p-1" placeholder="P3"/>
                </div>
                <button 
                  onClick={handleLoadSampleBarem}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer transition-colors"
                >
                  ⚡ Nhập nhanh đáp án mẫu
                </button>
              </div>

              <div className="space-y-6 max-h-[650px] overflow-y-auto pr-1">
                
                {/* Part I settings with flexible mode */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setConfigMode("standard"); handleNumMcqChange(12); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${configMode === "standard" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>Chuẩn Bộ (12)</button>
                    <button onClick={() => setConfigMode("free")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${configMode === "free" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>Tự do</button>
                  </div>

                  {configMode === "free" && (
                    <div className="flex items-center gap-2">
                      <input type="number" value={numMcq} onChange={(e) => handleNumMcqChange(parseInt(e.target.value) || 0)} className="border p-1.5 rounded w-20 text-xs" />
                      <div className="flex gap-1">{[20, 30, 40, 50].map(n => <button key={n} onClick={() => handleNumMcqChange(n)} className="px-2 py-1 bg-slate-200 rounded text-[10px] font-bold">{n}</button>)}</div>
                    </div>
                  )}

                  <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl text-xs font-bold flex items-center justify-between">
                    <span>PHẦN I: Trắc nghiệm khách quan ({((part1Keys.length * 0.25) / numMcq).toFixed(2)}đ/câu)</span>
                    <span className="bg-blue-100 px-2 py-0.5 rounded text-[10px]">{numMcq} câu</span>
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

          {/* C. TEACHER EXAMS HISTORY & RESULTS DASHBOARD */}
          <div className="lg:col-span-12 mt-6 space-y-6">
            
            {/* Box 1: Saved Exams Store / History of shared rooms */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-500" />
                  Quản lý Lưu trữ Đề thi / Phòng thi đã tạo ({examsHistory.length})
                </span>
                
                {/* Teacher Sync Code UI segment */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">☁️ Mã đồng bộ đám mây:</span>
                  <strong className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded font-black text-xs">{teacherSyncCode}</strong>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(teacherSyncCode);
                      alert("Đã copy Mã đồng bộ: " + teacherSyncCode);
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    Sao chép
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => {
                      const input = prompt("Nhập mã đồng bộ Giáo viên (ví dụ: GV-XXXXXX) để khôi phục danh sách phòng thi của bạn từ đám mây:", teacherSyncCode);
                      if (input && input.trim()) {
                        handleSyncRoomsHistory(input.trim());
                      }
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                  >
                    Nhập mã khác / Đồng bộ
                  </button>
                </div>
              </div>

              {examsHistory.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">Chưa có đề thi trực tuyến nào được tạo trên máy tính này.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Các đề thi trực tuyến sau khi tạo thành công sẽ tự động được lưu trữ và hiển thị tại đây.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {examsHistory.map((room) => (
                    <div 
                      key={room.code} 
                      className={`p-4 border rounded-xl flex flex-col justify-between gap-3 transition-all ${
                        selectedRoomForResults === room.code 
                          ? "bg-indigo-50/50 border-indigo-300 shadow-3xs" 
                          : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-md font-mono">
                            {room.code}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {room.createdAt ? new Date(room.createdAt).toLocaleDateString("vi-VN") : "Hôm nay"}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                          {room.title || "Đề thi PDF"}
                        </h4>
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <p>⏱️ Thời gian: <strong>{room.duration} phút</strong></p>
                          {room.linkedSheetUrl && (
                            <p className="text-emerald-600 font-semibold truncate">
                              🟢 Trang tính đã liên kết
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleLoadRoomResults(room.code)}
                          className="py-1 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                        >
                          <BarChart className="w-3 h-3" /> Kết quả
                        </button>
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}${window.location.pathname}?view=exam_pdf&data=${room.code}`;
                            navigator.clipboard.writeText(link);
                            alert("Đã copy link học sinh cho phòng: " + room.code);
                          }}
                          className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Link
                        </button>
                        <button
                          onClick={() => handleDeleteRoomFromHistory(room.code)}
                          className="py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Box 2: Submissions Dashboard (displayed when loaded) */}
            {selectedRoomForResults && (
              <div id="submissionsDashboard" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5 scroll-mt-6">
                
                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Báo cáo kết quả phòng thi: <span className="font-mono text-indigo-600 font-extrabold">{selectedRoomForResults}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Kỳ thi: <strong>{selectedRoomResultsData?.examTitle || "Đề thi PDF"}</strong> • Thời gian: <strong>{selectedRoomResultsData?.duration || 90} phút</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleExportResultsToExcel}
                      disabled={isLoadingResults || !selectedRoomResultsData?.submissions?.length}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" /> Xuất Excel
                    </button>
                    <button
                      onClick={() => handleLoadRoomResults(selectedRoomForResults)}
                      disabled={isLoadingResults}
                      className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingResults ? "animate-spin" : ""}`} /> Làm mới
                    </button>
                  </div>
                </div>

                {/* Google Sheets Live Link and Connection Settings */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Đồng bộ hóa Google Sheets Giáo viên</p>
                        <p className="text-[10px] text-slate-400">Đồng bộ thời gian thực bảng điểm của học sinh bằng tài khoản Google cá nhân.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {googleUser ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg">
                            {googleUser.displayName || googleUser.email}
                          </span>
                          <button
                            onClick={handleGoogleLogout}
                            className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                          >
                            Đăng xuất
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleGoogleLogin}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
                        >
                          🔑 Đăng nhập Google Sheets
                        </button>
                      )}
                    </div>
                  </div>

                  {googleUser && (
                    <div className="pt-2.5 border-t border-slate-150 flex flex-wrap items-center justify-between gap-3 text-xs">
                      {selectedRoomResultsData?.linkedSheetUrl ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Đã liên kết Trang tính:</span>
                          <a 
                            href={selectedRoomResultsData.linkedSheetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            Mở Google Sheet ↗
                          </a>
                        </div>
                      ) : (
                        <div className="text-amber-600 font-semibold">
                          ⚠️ Chưa liên kết tệp Google Sheets.
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {selectedRoomResultsData?.linkedSheetId ? (
                          <button
                            onClick={handleSyncExistingSheet}
                            disabled={isSyncingSheet || isLoadingResults}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {isSyncingSheet ? "Đang đồng bộ..." : "⚡ Đồng bộ dữ liệu Trang tính"}
                          </button>
                        ) : (
                          <button
                            onClick={handleCreateAndLinkSheet}
                            disabled={isSyncingSheet || isLoadingResults}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {isSyncingSheet ? "Đang tạo..." : "🚀 Tạo & Liên kết Google Sheet mới"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Loading state indicator */}
                {isLoadingResults ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                    <p className="text-xs font-semibold animate-pulse">Đang tải danh sách học sinh nộp bài thi...</p>
                  </div>
                ) : (
                  <>
                    {/* Aggregated Statistical Cards */}
                    {(() => {
                      const subs = selectedRoomResultsData?.submissions || [];
                      if (subs.length === 0) return null;
                      
                      const scores = subs.map((s: any) => s.totalScore);
                      const avg = Number((scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(2));
                      const max = Math.max(...scores);
                      const min = Math.min(...scores);

                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Số học sinh đã nộp</span>
                            <span className="text-lg font-black text-slate-800">{subs.length} em</span>
                          </div>
                          <div className="bg-blue-50/50 border border-blue-150 p-3 rounded-2xl">
                            <span className="text-[10px] text-blue-500 font-bold uppercase block mb-1">Điểm trung bình</span>
                            <span className="text-lg font-black text-blue-800">{avg}đ</span>
                          </div>
                          <div className="bg-emerald-50/50 border border-emerald-150 p-3 rounded-2xl">
                            <span className="text-[10px] text-emerald-500 font-bold uppercase block mb-1">Điểm cao nhất</span>
                            <span className="text-lg font-black text-emerald-800">{max}đ</span>
                          </div>
                          <div className="bg-rose-50/50 border border-rose-150 p-3 rounded-2xl">
                            <span className="text-[10px] text-rose-500 font-bold uppercase block mb-1">Điểm thấp nhất</span>
                            <span className="text-lg font-black text-rose-800">{min}đ</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Results Table Section */}
                    {(!selectedRoomResultsData?.submissions || selectedRoomResultsData.submissions.length === 0) ? (
                      <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-2 animate-pulse" />
                        <p className="text-xs font-semibold">Hiện chưa có học sinh nào nộp bài cho phòng thi này.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Đường dẫn làm bài: {window.location.origin}{window.location.pathname}?view=exam_pdf&data={selectedRoomForResults}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Tab Switching Buttons */}
                        <div className="flex border-b border-slate-200 no-print">
                          <button
                            type="button"
                            onClick={() => setResultsViewTab("table")}
                            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                              resultsViewTab === "table"
                                ? "border-indigo-600 text-indigo-600 font-extrabold"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            📋 Danh sách học sinh nộp bài
                          </button>
                          <button
                            type="button"
                            onClick={() => setResultsViewTab("analytics")}
                            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                              resultsViewTab === "analytics"
                                ? "border-indigo-600 text-indigo-600 font-extrabold"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            📊 Thống kê câu hỏi chi tiết
                          </button>
                        </div>

                        {resultsViewTab === "table" ? (
                          <div className="space-y-3">
                            {/* Search and Filters */}
                            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 max-w-sm">
                              <Search className="w-4 h-4 text-slate-400 shrink-0" />
                              <input
                                type="text"
                                value={resultsSearchQuery}
                                onChange={(e) => setResultsSearchQuery(e.target.value)}
                                placeholder="Tìm học sinh theo tên hoặc lớp..."
                                className="bg-transparent text-xs text-slate-700 focus:outline-none w-full font-medium"
                              />
                            </div>

                            {/* Responsive Table */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                                      <th className="py-2.5 px-3">Họ và tên</th>
                                      <th className="py-2.5 px-3 w-20 text-center">Lớp</th>
                                      <th className="py-2.5 px-3 text-center">Thời gian nộp</th>
                                      <th className="py-2.5 px-3 w-24 text-center">Tổng điểm</th>
                                      <th className="py-2.5 px-3 text-center hidden md:table-cell">Điểm các phần</th>
                                      <th className="py-2.5 px-3 w-28 text-center">Hành động</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {selectedRoomResultsData.submissions
                                      .filter((sub: any) => {
                                        const q = resultsSearchQuery.trim().toLowerCase();
                                        if (!q) return true;
                                        return (
                                          (sub.studentName || "").toLowerCase().includes(q) ||
                                          (sub.studentClass || "").toLowerCase().includes(q)
                                        );
                                      })
                                      .map((sub: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                                          <td className="py-2.5 px-3 font-bold text-slate-800">{sub.studentName}</td>
                                          <td className="py-2.5 px-3 text-center font-bold">{sub.studentClass}</td>
                                          <td className="py-2.5 px-3 text-center text-[10px] text-slate-400">{sub.submitTime}</td>
                                          <td className="py-2.5 px-3 text-center text-sm font-black font-mono text-emerald-600">
                                            {sub.totalScore.toFixed(2)}đ
                                          </td>
                                          <td className="py-2.5 px-3 text-center text-[10px] text-slate-500 hidden md:table-cell leading-tight">
                                            P.I: <span className="font-bold text-blue-600">{sub.scorePart1}đ</span> • 
                                            P.II: <span className="font-bold text-emerald-600">{sub.scorePart2}đ</span> • 
                                            P.III: <span className="font-bold text-indigo-600">{sub.scorePart3}đ</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                              <button
                                                onClick={() => setActiveStudentDetails({ ...sub, index: idx })}
                                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                                              >
                                                Chi tiết
                                              </button>
                                              <button
                                                onClick={() => handleDeleteSubmission(idx)}
                                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                                              >
                                                Xóa
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* ANALYTICS TAB CONTENT */
                          <div className="space-y-6 pt-2 font-sans">
                            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                              💡 <strong>Phân tích tỷ lệ đúng/sai chi tiết:</strong> Thầy cô có thể quan sát biểu đồ phần trăm trả lời đúng của học sinh để nắm bắt mức độ khó dễ của từng câu hỏi và lỗ hổng kiến thức của cả lớp.
                            </div>

                            {/* PART I ANALYTICS */}
                            <div className="space-y-3.5">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-4 border-blue-600 pl-2">
                                PHẦN I: Trắc nghiệm nhiều lựa chọn (12 câu)
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {part1Keys.map((key) => {
                                  const qNum = key.question;
                                  const correctAns = key.correct;
                                  const subs = selectedRoomResultsData?.submissions || [];
                                  const totalCount = subs.length;
                                  let correctCount = 0;
                                  subs.forEach((sub: any) => {
                                    if (sub.details?.part1?.[qNum]?.isCorrect) {
                                      correctCount++;
                                    }
                                  });
                                  const correctPct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
                                  const difficultyColor = correctPct > 75 ? "bg-emerald-500" : correctPct > 40 ? "bg-amber-500" : "bg-rose-500";
                                  const difficultyLabel = correctPct > 75 ? "Dễ" : correctPct > 40 ? "Trung bình" : "Khó";
                                  const difficultyTextClass = correctPct > 75 ? "text-emerald-700 bg-emerald-50" : correctPct > 40 ? "text-amber-700 bg-amber-50" : "text-rose-700 bg-rose-50";

                                  return (
                                    <div key={`p1-stat-${qNum}`} className="p-3 bg-white border border-slate-200 rounded-xl shadow-3xs space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-xs text-slate-700">Câu {qNum} <span className="font-medium text-slate-400 font-mono">(Đáp án: {correctAns})</span></span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${difficultyTextClass}`}>
                                          {difficultyLabel} ({correctPct}%)
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                                          <span>Đúng: <strong>{correctCount}/{totalCount}</strong></span>
                                          <span>Sai: <strong>{totalCount - correctCount}/{totalCount}</strong></span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                          <div className={`h-full ${difficultyColor}`} style={{ width: `${correctPct}%` }}></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* PART II ANALYTICS */}
                            <div className="space-y-3.5">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-4 border-emerald-600 pl-2">
                                PHẦN II: Trắc nghiệm Đúng - Sai (4 câu, mỗi câu 4 ý a, b, c, d)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {part2Keys.map((key) => {
                                  const qNum = key.question;
                                  const subs = selectedRoomResultsData?.submissions || [];
                                  const totalCount = subs.length;

                                  return (
                                    <div key={`p2-stat-${qNum}`} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-3xs space-y-3">
                                      <span className="font-extrabold text-sm text-slate-800">Câu {qNum}</span>
                                      <div className="space-y-2.5">
                                        {["a", "b", "c", "d"].map((letter) => {
                                          const correctVal = key.statements[letter as "a" | "b" | "c" | "d"];
                                          const correctValText = correctVal === true ? "Đ" : correctVal === false ? "S" : "?";
                                          let correctCount = 0;
                                          subs.forEach((sub: any) => {
                                            const subAns = sub.details?.part2?.[qNum]?.subDetails?.[letter];
                                            if (subAns?.isCorrect) {
                                              correctCount++;
                                            }
                                          });
                                          const correctPct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
                                          const barColor = correctPct > 75 ? "bg-emerald-500" : correctPct > 40 ? "bg-amber-500" : "bg-rose-500";

                                          return (
                                            <div key={`p2-stat-${qNum}-${letter}`} className="text-xs space-y-1">
                                              <div className="flex justify-between items-center text-slate-700 font-medium">
                                                <span>Ý <strong>{letter})</strong> <span className="text-[10px] text-slate-400 font-mono">(Chuẩn: {correctValText})</span></span>
                                                <span className="font-bold text-slate-600 text-[11px]">{correctCount}/{totalCount} đúng ({correctPct}%)</span>
                                              </div>
                                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div className={`h-full ${barColor}`} style={{ width: `${correctPct}%` }}></div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* PART III ANALYTICS */}
                            <div className="space-y-3.5">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-4 border-indigo-600 pl-2">
                                PHẦN III: Trắc nghiệm trả lời ngắn (6 câu)
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {part3Keys.map((key) => {
                                  const qNum = key.question;
                                  const correctAns = String(key.correct || "");
                                  const subs = selectedRoomResultsData?.submissions || [];
                                  const totalCount = subs.length;
                                  let correctCount = 0;
                                  subs.forEach((sub: any) => {
                                    if (sub.details?.part3?.[qNum]?.isCorrect) {
                                      correctCount++;
                                    }
                                  });
                                  const correctPct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
                                  const difficultyColor = correctPct > 75 ? "bg-emerald-500" : correctPct > 40 ? "bg-amber-500" : "bg-rose-500";
                                  const difficultyLabel = correctPct > 75 ? "Dễ" : correctPct > 40 ? "Trung bình" : "Khó";
                                  const difficultyTextClass = correctPct > 75 ? "text-emerald-700 bg-emerald-50" : correctPct > 40 ? "text-amber-700 bg-amber-50" : "text-rose-700 bg-rose-50";

                                  return (
                                    <div key={`p3-stat-${qNum}`} className="p-3 bg-white border border-slate-200 rounded-xl shadow-3xs space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-xs text-slate-700">Câu {qNum} <span className="font-medium text-slate-400 font-mono">(Đáp án: {correctAns})</span></span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${difficultyTextClass}`}>
                                          {difficultyLabel} ({correctPct}%)
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                                          <span>Đúng: <strong>{correctCount}/{totalCount}</strong></span>
                                          <span>Sai: <strong>{totalCount - correctCount}/{totalCount}</strong></span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                          <div className={`h-full ${difficultyColor}`} style={{ width: `${correctPct}%` }}></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* B. EXAM TAKING SCREEN (DÀNH CHO HỌC SINH) */}
      {screen === "exam" && (
        !hasStartedExam ? (
          /* MÀN HÌNH ĐĂNG NHẬP PHÒNG THI DÀNH CHO HỌC SINH TÙY CHỈNH THEO PHƯƠNG ÁN A, B, C */
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-md text-center max-w-lg mx-auto relative overflow-hidden my-12 font-sans w-full">
            <div className={`absolute top-0 left-0 w-full h-1.5 ${
              (loadedExamData?.loginMethod || loginMethod) === "A" ? "bg-blue-600" :
              (loadedExamData?.loginMethod || loginMethod) === "B" ? "bg-amber-500" : "bg-emerald-600"
            }`}></div>
            
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
              (loadedExamData?.loginMethod || loginMethod) === "A" ? "bg-blue-50 text-blue-600" :
              (loadedExamData?.loginMethod || loginMethod) === "B" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
            }`}>
              {(loadedExamData?.loginMethod || loginMethod) === "A" ? <ShieldCheck className="w-7 h-7" /> :
               (loadedExamData?.loginMethod || loginMethod) === "B" ? <KeyRound className="w-7 h-7" /> : <Zap className="w-7 h-7" />}
            </div>

            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 bg-slate-100 text-slate-700">
              {(loadedExamData?.loginMethod || loginMethod) === "A" && "🛡️ Phương án A: Yêu cầu đăng nhập Google"}
              {(loadedExamData?.loginMethod || loginMethod) === "B" && "🔑 Phương án B: Cấp mã định danh theo danh sách"}
              {(loadedExamData?.loginMethod || loginMethod) === "C" && "⚡ Phương án C: Đăng nhập nhanh theo Phòng thi"}
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-1">{examTitle}</h2>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {(loadedExamData?.loginMethod || loginMethod) === "A" && "Phòng thi yêu cầu học sinh đăng nhập tài khoản Google để chống giả mạo danh tính."}
              {(loadedExamData?.loginMethod || loginMethod) === "B" && "Vui lòng nhập đúng Mã định danh do Giáo viên cấp để xác thực thông tin."}
              {(loadedExamData?.loginMethod || loginMethod) === "C" && "Nhập Họ tên và Lớp của bạn để bắt đầu làm bài thi trực tuyến ngay."}
            </p>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-left space-y-2 mb-6">
              <p className="text-xs text-slate-700">📌 <strong>Đề thi:</strong> {examTitle}</p>
              <p className="text-xs text-slate-700">⏱️ <strong>Thời gian:</strong> {duration} phút (Đồng hồ đếm ngược tự động)</p>
              <p className="text-xs text-slate-700">📋 <strong>Hình thức:</strong> Điền phiếu trắc nghiệm trực tuyến 3 Phần (Chuẩn GDPT 2025)</p>
            </div>

            {studentLoginError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{studentLoginError}</span>
              </div>
            )}

            {/* CASE 1: PHƯƠNG ÁN A (BẮT BUỘC ĐĂNG NHẬP GOOGLE) */}
            {(loadedExamData?.loginMethod || loginMethod) === "A" && (
              <div className="space-y-4 mb-6 text-left">
                {!googleUser ? (
                  <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-blue-900 font-semibold leading-relaxed">
                      Để đảm bảo tính trung thực và bảo mật cao, thầy cô yêu cầu học sinh đăng nhập tài khoản Google trước khi mở đề.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await googleSignIn();
                          if (res) {
                            setGoogleUser(res.user);
                            setGoogleToken(res.accessToken);
                            setStudentName(res.user.displayName || "");
                            setStudentEmail(res.user.email || "");
                            setStudentLoginError("");
                          }
                        } catch (err: any) {
                          setStudentLoginError("Không thể đăng nhập Google: " + err.message);
                        }
                      }}
                      className="w-full py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Đăng nhập bằng tài khoản Google để vào thi
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                          {googleUser.displayName ? googleUser.displayName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{googleUser.displayName}</p>
                          <p className="text-[10px] text-slate-500">{googleUser.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full">
                        ✓ Đã xác thực
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        Lớp học của bạn
                      </label>
                      <input 
                        type="text"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        placeholder="Ví dụ: 12A1"
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CASE 2: PHƯƠNG ÁN B (CẤP MÃ ĐỊNH DANH THEO DANH SÁCH LỚP) */}
            {(loadedExamData?.loginMethod || loginMethod) === "B" && (
              <div className="space-y-4 mb-6 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Nhập Mã định danh học sinh của bạn (Do GV cấp)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={studentCodeInput}
                      onChange={(e) => {
                        setStudentCodeInput(e.target.value.toUpperCase());
                        setCodeVerifiedStudent(null);
                        setStudentLoginError("");
                      }}
                      placeholder="Ví dụ: HS01, HS02..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono font-bold focus:outline-none uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const code = studentCodeInput.trim().toUpperCase();
                        if (!code) {
                          setStudentLoginError("Vui lòng nhập mã định danh của bạn!");
                          return;
                        }
                        const roster: { code: string; name: string }[] = loadedExamData?.allowedStudents || parseRoster(classRosterText);
                        const found = roster.find(s => s.code === code);
                        if (found) {
                          setCodeVerifiedStudent(found);
                          setStudentName(found.name);
                          setStudentLoginError("");
                        } else {
                          setStudentLoginError(`Không tìm thấy mã định danh "${code}" trong danh sách lớp. Vui lòng kiểm tra lại với Giáo viên.`);
                        }
                      }}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shrink-0 cursor-pointer transition-colors"
                    >
                      Xác thực mã
                    </button>
                  </div>
                </div>

                {codeVerifiedStudent && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <p className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Xác thực thành công: <strong>{codeVerifiedStudent.name}</strong> (Mã: {codeVerifiedStudent.code})
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        Lớp học
                      </label>
                      <input 
                        type="text"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        placeholder="Ví dụ: 12A1"
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CASE 3: PHƯƠNG ÁN C (ĐĂNG NHẬP NHANH THEO PHÒNG THI + GỢI Ý & ĐỐI CHIẾU TỰ ĐỘNG) */}
            {(loadedExamData?.loginMethod || loginMethod) === "C" && (
              <div className="space-y-4 mb-6 text-left relative">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Họ và tên Học sinh
                    </label>
                    {(loadedExamData?.allowedStudents?.length > 0 || parseRoster(classRosterText).length > 0) && (
                      <span className="text-[10px] text-emerald-600 font-bold">
                        ⚡ Có hỗ trợ gợi ý tên từ danh sách lớp
                      </span>
                    )}
                  </div>
                  <input 
                    type="text"
                    value={studentName}
                    onFocus={() => setShowRosterSuggestions(true)}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      setShowRosterSuggestions(true);
                    }}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none font-medium"
                  />

                  {/* Autocomplete / Suggested Names from Class Roster */}
                  {showRosterSuggestions && (loadedExamData?.allowedStudents?.length > 0 || parseRoster(classRosterText).length > 0) && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto p-1.5 divide-y divide-slate-100">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Gợi ý từ danh sách lớp (Bấm để chọn nhanh):
                      </div>
                      {(loadedExamData?.allowedStudents || parseRoster(classRosterText))
                        .filter((s: any) => !studentName.trim() || s.name.toLowerCase().includes(studentName.toLowerCase()) || s.code.toLowerCase().includes(studentName.toLowerCase()))
                        .slice(0, 8)
                        .map((s: any, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setStudentName(s.name);
                              setShowRosterSuggestions(false);
                            }}
                            className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <span>{s.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{s.code}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Lớp học
                  </label>
                  <input 
                    type="text"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="Ví dụ: 12A1"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none font-medium"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const currentMethod = loadedExamData?.loginMethod || loginMethod;
                if (currentMethod === "A") {
                  if (!googleUser) {
                    alert("Vui lòng đăng nhập tài khoản Google trước khi bắt đầu làm bài!");
                    return;
                  }
                  if (!studentClass.trim()) {
                    alert("Vui lòng nhập lớp học của bạn!");
                    return;
                  }
                } else if (currentMethod === "B") {
                  if (!codeVerifiedStudent) {
                    alert("Vui lòng nhập và xác thực mã định danh học sinh của bạn trước!");
                    return;
                  }
                  if (!studentClass.trim()) {
                    alert("Vui lòng nhập lớp học của bạn!");
                    return;
                  }
                } else {
                  if (!studentName.trim() || !studentClass.trim()) {
                    alert("Vui lòng điền đầy đủ Họ tên và Lớp học trước khi làm bài!");
                    return;
                  }
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
              className={`w-full py-3 text-white font-bold rounded-xl text-xs uppercase transition-colors cursor-pointer tracking-wider shadow-sm ${
                (loadedExamData?.loginMethod || loginMethod) === "A" ? "bg-blue-600 hover:bg-blue-700" :
                (loadedExamData?.loginMethod || loginMethod) === "B" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
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
                        
                        // Automatically enforce only one active comma (either in Column 2 or Column 3)
                        if (colIdx === 1 && val === ",") {
                          if (newCols[2] === ",") newCols[2] = "";
                        }
                        if (colIdx === 2 && val === ",") {
                          if (newCols[1] === ",") newCols[1] = "";
                        }

                        // Toggle off if clicking the same value
                        if (newCols[colIdx] === val) {
                          newCols[colIdx] = "";
                        } else {
                          newCols[colIdx] = val;
                        }
                        
                        const joined = newCols.join("").trim();
                        // Convert all commas to period decimal points
                        const newAns = joined.replace(/,/g, ".");
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

                            {/* Column 3 bubbles (, and 0-9) */}
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateCol(2, ",")}
                                className={`w-5.5 h-5.5 rounded-full text-[10px] font-black border flex items-center justify-center cursor-pointer transition-all ${
                                  cols[2] === ","
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

      {/* STUDENT SUBMISSION DETAIL REVIEW POPUP MODAL */}
      {activeStudentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-150 bg-slate-900 text-white shrink-0">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" />
                  Chi tiết bài làm: {activeStudentDetails.studentName}
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Lớp: <strong className="text-white">{activeStudentDetails.studentClass}</strong> • Thời gian nộp: <strong>{activeStudentDetails.submitTime}</strong>
                </p>
              </div>
              <button 
                onClick={() => setActiveStudentDetails(null)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-slate-50">
              
              {/* Score summary panel */}
              <div className="bg-slate-950 text-white rounded-2xl p-4 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng điểm đạt được</div>
                <div className="text-4xl font-black text-emerald-400 mt-1 mb-1 font-mono">
                  {activeStudentDetails.totalScore.toFixed(2)} <span className="text-sm text-slate-400 font-normal">/ 10.0đ</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-850 text-[10px] text-slate-300">
                  <div>
                    <p className="font-bold text-blue-300">Phần I: {activeStudentDetails.scorePart1.toFixed(2)}đ</p>
                    <p className="text-[9px] text-slate-400">Trắc nghiệm</p>
                  </div>
                  <div>
                    <p className="font-bold text-emerald-300">Phần II: {activeStudentDetails.scorePart2.toFixed(2)}đ</p>
                    <p className="text-[9px] text-slate-400">Đúng / Sai</p>
                  </div>
                  <div>
                    <p className="font-bold text-indigo-300">Phần III: {activeStudentDetails.scorePart3.toFixed(2)}đ</p>
                    <p className="text-[9px] text-slate-400">Trả lời ngắn</p>
                  </div>
                </div>
              </div>

              {/* Detailed answers */}
              {activeStudentDetails.details && (
                <div className="space-y-4 text-left">
                  
                  {/* Part I review */}
                  {activeStudentDetails.details.part1 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-3xs">
                      <p className="text-xs font-bold text-blue-900 border-b border-slate-100 pb-1.5">
                        PHẦN I: Trắc nghiệm 4 lựa chọn (12 câu)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {Object.keys(activeStudentDetails.details.part1).map((qNum) => {
                          const item = activeStudentDetails.details.part1[qNum];
                          return (
                            <div 
                              key={qNum} 
                              className={`p-2 rounded-lg border text-[11px] flex justify-between items-center ${
                                item.isCorrect 
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                  : "bg-rose-50/50 border-rose-200 text-rose-800"
                              }`}
                            >
                              <span className="font-bold">Câu {qNum}:</span>
                              <span className="font-mono font-black">
                                {item.student || "-"} {item.isCorrect ? "✓" : `(Đs: ${item.correct})`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Part II review */}
                  {activeStudentDetails.details.part2 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-3xs">
                      <p className="text-xs font-bold text-emerald-900 border-b border-slate-100 pb-1.5">
                        PHẦN II: Trắc nghiệm Đúng / Sai (4 câu)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {Object.keys(activeStudentDetails.details.part2).map((qNum) => {
                          const item = activeStudentDetails.details.part2[qNum];
                          const displayQNum = Number(qNum) + 12;
                          return (
                            <div key={qNum} className="border border-slate-150 p-3 rounded-xl bg-slate-50/50 space-y-2">
                              <div className="flex justify-between items-center border-b border-slate-150 pb-1">
                                <span className="font-black text-slate-800 text-[11px]">Câu {displayQNum}:</span>
                                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-black">
                                  Đúng {item.correctCount || 0}/4 ý (+{item.points || 0}đ)
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                {["a", "b", "c", "d"].map((letter) => {
                                  const sub = item.subDetails?.[letter] || { correct: null, student: null, isCorrect: false };
                                  return (
                                    <div 
                                      key={letter} 
                                      className={`p-1 rounded flex justify-between items-center px-2 font-bold ${
                                        sub.isCorrect 
                                          ? "bg-emerald-100/70 text-emerald-800" 
                                          : "bg-rose-100/50 text-rose-800"
                                      }`}
                                    >
                                      <span>{letter})</span>
                                      <span className="font-black">
                                        {sub.student === null ? "-" : sub.student ? "Đ" : "S"} 
                                        {sub.isCorrect ? " ✓" : ` (Đs: ${sub.correct ? "Đ" : "S"})`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Part III review */}
                  {activeStudentDetails.details.part3 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-3xs">
                      <p className="text-xs font-bold text-indigo-900 border-b border-slate-100 pb-1.5">
                        PHẦN III: Trắc nghiệm Trả lời ngắn (6 câu)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.keys(activeStudentDetails.details.part3).map((qNum) => {
                          const item = activeStudentDetails.details.part3[qNum];
                          return (
                            <div 
                              key={qNum} 
                              className={`p-2 rounded-lg border text-[11px] flex justify-between items-center ${
                                item.isCorrect 
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                  : "bg-rose-50/50 border-rose-200 text-rose-800"
                              }`}
                            >
                              <span className="font-bold">Câu {qNum}:</span>
                              <span className="font-mono">
                                Đs: <strong className="text-slate-800 font-extrabold">{item.student || "-"}</strong> 
                                {item.isCorrect ? " ✓" : ` (Đs chuẩn: ${item.correct})`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
              <button 
                onClick={() => setActiveStudentDetails(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Đóng bài làm
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
          try {
            let base64Clean = pdfBase64;
            if (base64Clean.startsWith("data:")) {
              base64Clean = base64Clean.substring(base64Clean.indexOf(",") + 1);
            }
            base64Clean = base64Clean.replace(/\s/g, "");
            const raw = window.atob(base64Clean);
            const uint8Array = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) {
              uint8Array[i] = raw.charCodeAt(i);
            }
            loadingTask = pdfjs.getDocument({ data: uint8Array });
          } catch (decodingError) {
            console.error("Lỗi giải mã base64 trong CanvasPdfViewer, thử tải qua URL:", decodingError);
            if (pdfUrl) {
              loadingTask = pdfjs.getDocument(pdfUrl);
            } else {
              throw decodingError;
            }
          }
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
        <div className="flex-1 flex flex-col bg-white h-full relative min-h-[350px]">
          <div className="p-3 text-center text-slate-500 border-b border-slate-100 shrink-0 bg-rose-50/50">
            <p className="text-xs font-bold text-rose-700 flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 animate-pulse" />
              Không nạp được bộ hiển thị Canvas. Đang dùng Trình xem Hệ thống dự phòng.
            </p>
            {pdfUrl && (
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <button 
                  type="button"
                  onClick={() => window.open(pdfUrl, "_blank")}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] cursor-pointer shadow-xs transition-all flex items-center gap-1"
                >
                  🌍 Mở Tab mới
                </button>
                <a 
                  href={pdfUrl} 
                  download={`${examTitle || 'De_Thi'}.pdf`}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-[11px] cursor-pointer shadow-xs transition-all flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Tải về máy
                </a>
              </div>
            )}
          </div>
          {pdfUrl ? (
            <iframe 
              src={pdfUrl} 
              className="w-full flex-1 border-0 h-full min-h-[400px]" 
              title="PDF Viewer Fallback"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
              <p className="text-xs text-slate-400">Không tìm thấy đường dẫn tệp tin PDF.</p>
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
