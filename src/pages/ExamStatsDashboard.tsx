import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart3, Users, CheckCircle2, Clock, Award, ArrowUpDown, Search,
  Download, RefreshCw, Share2, Copy, ExternalLink, AlertTriangle, ShieldAlert,
  Filter, Eye, X, ChevronDown, ChevronUp, FileSpreadsheet,
  TrendingUp, Sparkles, Check, Printer, PieChart, Info, HelpCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import { fetchExamFromCloud, saveExamToCloud } from "../lib/cloudExamStore";
import { registerExamUrlMapping } from "../lib/smartRouter";

interface Submission {
  studentName?: string;
  name?: string;
  studentClass?: string;
  className?: string;
  totalScore?: number;
  score?: number;
  scorePart1?: number;
  scorePart2?: number;
  scorePart3?: number;
  submitTime?: string;
  submittedAt?: string;
  timestamp?: string;
  timeSpent?: number | string;
  isViolation?: boolean;
  violationReason?: string;
  violationTime?: string;
  details?: any;
  answers?: any;
  code?: string;
  examCode?: string;
}

interface ExamRoom {
  id?: string;
  code?: string;
  examId?: string;
  pin?: string;
  title?: string;
  examName?: string;
  examTitle?: string;
  examType?: string;
  duration?: number;
  examDuration?: number;
  subject?: string;
  grade?: string;
  createdAt?: string;
  shareUrl?: string;
  antiCheatMode?: boolean;
  submissions?: Submission[];
  totalQuestions?: number;
  codes?: any[];
}

interface ExamStatsDashboardProps {
  initialExamId?: string;
  onBackToExam?: () => void;
}

export function ExamStatsDashboard({ initialExamId, onBackToExam }: ExamStatsDashboardProps) {
  // Rooms and Selected Room State
  const [roomsList, setRoomsList] = useState<ExamRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialExamId || "");
  const [currentExam, setCurrentExam] = useState<ExamRoom | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [searchPinInput, setSearchPinInput] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Filters & Search State
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<"all" | "excellent" | "good" | "fair" | "average" | "weak" | "violation">("all");
  const [sortBy, setSortBy] = useState<"score_desc" | "score_asc" | "time_asc" | "name_asc">("score_desc");
  const [selectedSubmissionForReview, setSelectedSubmissionForReview] = useState<Submission | null>(null);

  // Auto-refresh interval ref
  const autoRefreshTimerRef = useRef<any>(null);

  // 1. Load history from localStorage
  const loadSavedRooms = () => {
    try {
      const raw = localStorage.getItem("eduplan_teacher_exams_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Normalize room keys
          const normalized: ExamRoom[] = parsed.map((item: any) => ({
            ...item,
            id: String(item.id || item.code || item.examId || item.pin || "").toUpperCase(),
            code: String(item.code || item.id || item.examId || item.pin || "").toUpperCase(),
            title: item.title || item.examTitle || item.examName || `Phòng thi ${item.code || item.id || ""}`
          }));
          setRoomsList(normalized);
          return normalized;
        }
      }
    } catch (e) {
      console.warn("Lỗi tải lịch sử phòng thi:", e);
    }
    return [];
  };

  // Initial load
  useEffect(() => {
    const list = loadSavedRooms();
    let target = initialExamId ? initialExamId.toUpperCase() : "";

    if (!target) {
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const urlExam = urlParams.get("examId") || urlParams.get("exam") || urlParams.get("pin") || urlParams.get("code");
      if (urlExam) {
        target = urlExam.toUpperCase();
      } else if (list.length > 0) {
        target = list[0].id || list[0].code || "";
      }
    }

    if (target) {
      setSelectedRoomId(target);
      fetchExamData(target);
    }
  }, [initialExamId]);

  // Listen to custom event 'open-exam-stats'
  useEffect(() => {
    const handleOpenStats = (e: any) => {
      if (e?.detail?.examId) {
        const examCode = String(e.detail.examId).trim().toUpperCase();
        setSelectedRoomId(examCode);
        fetchExamData(examCode);
      }
    };
    window.addEventListener("open-exam-stats", handleOpenStats);
    return () => window.removeEventListener("open-exam-stats", handleOpenStats);
  }, []);

  // 2. Fetch specific exam data from server & cloud KV
  const fetchExamData = async (code: string) => {
    if (!code) return;
    setIsLoading(true);
    const cleanCode = code.trim().toUpperCase();

    try {
      let serverData = null;
      try {
        const res = await fetch(`/api/exams/${cleanCode}?fresh=true`);
        if (res.ok) {
          serverData = await res.json();
        }
      } catch (e) {}

      if (!serverData) {
        serverData = await fetchExamFromCloud(cleanCode);
      }

      if (serverData) {
        // Normalize server data
        const title = serverData.examTitle || serverData.title || serverData.examData?.examName || serverData.examName || `Phòng thi ${cleanCode}`;
        const duration = serverData.duration || serverData.examDuration || serverData.examData?.duration || 45;
        const submissions = Array.isArray(serverData.submissions) ? serverData.submissions : [];

        const normalizedExam: ExamRoom = {
          ...serverData,
          id: cleanCode,
          code: cleanCode,
          title: title,
          examName: title,
          duration: duration,
          submissions: submissions
        };

        setCurrentExam(normalizedExam);
        setLastRefreshed(new Date());

        // Update in history list if missing or update submissions count
        setRoomsList(prev => {
          const exists = prev.some(r => r.id === cleanCode || r.code === cleanCode);
          if (!exists) {
            const newEntry: ExamRoom = {
              id: cleanCode,
              code: cleanCode,
              title: title,
              duration: duration,
              createdAt: serverData.createdAt || new Date().toISOString(),
              submissions: submissions
            };
            const updated = [newEntry, ...prev];
            try {
              localStorage.setItem("eduplan_teacher_exams_history", JSON.stringify(updated));
            } catch (e) {}
            return updated;
          } else {
            return prev.map(r => (r.id === cleanCode || r.code === cleanCode) ? { ...r, submissions, title } : r);
          }
        });
      } else {
        // Fallback: check in local list
        const localFound = roomsList.find(r => r.id === cleanCode || r.code === cleanCode);
        if (localFound) {
          setCurrentExam(localFound);
        } else {
          setCurrentExam(null);
        }
      }
    } catch (err) {
      console.warn("Lỗi tải thông tin phòng thi từ máy chủ:", err);
      const localFound = roomsList.find(r => r.id === cleanCode || r.code === cleanCode);
      if (localFound) {
        setCurrentExam(localFound);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh interval (every 12 seconds when enabled)
  useEffect(() => {
    if (autoRefresh && selectedRoomId) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchExamData(selectedRoomId);
      }, 12000);
    }
    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefresh, selectedRoomId]);

  const handleRoomChange = (code: string) => {
    setSelectedRoomId(code);
    fetchExamData(code);
  };

  const handleSearchPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPinInput.trim()) {
      const code = searchPinInput.trim().toUpperCase();
      setSelectedRoomId(code);
      fetchExamData(code);
      setSearchPinInput("");
    }
  };

  // 3. Computed Statistics
  const submissions: Submission[] = useMemo(() => {
    return currentExam?.submissions || [];
  }, [currentExam]);

  const stats = useMemo(() => {
    const totalCount = submissions.length;
    if (totalCount === 0) {
      return {
        totalSubmissions: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        passedCount: 0,
        passedRate: 0,
        excellentCount: 0,
        goodCount: 0,
        fairCount: 0,
        averageCount: 0,
        weakCount: 0,
        violationCount: 0,
        avgTimeMinutes: 0,
        scoreDistribution: Array(10).fill(0),
        topStudentName: "Chưa có"
      };
    }

    let sumScore = 0;
    let max = -1;
    let min = 999;
    let passed = 0;
    let excellent = 0; // >= 9.0
    let good = 0;      // 8.0 - < 9.0
    let fair = 0;      // 6.5 - < 8.0
    let avgCount = 0;   // 5.0 - < 6.5
    let weak = 0;       // < 5.0
    let violations = 0;
    let sumTimeSec = 0;
    let validTimeCount = 0;
    let topStudent = "";

    // 10 score bins: [0, 1), [1, 2), ..., [9, 10]
    const distribution = Array(10).fill(0);

    submissions.forEach(sub => {
      const rawScore = sub.totalScore !== undefined ? Number(sub.totalScore) : (sub.score !== undefined ? Number(sub.score) : 0);
      const score = Math.max(0, Math.min(10, isNaN(rawScore) ? 0 : rawScore));

      sumScore += score;
      if (score > max) {
        max = score;
        topStudent = sub.studentName || sub.name || "Học sinh";
      }
      if (score < min) {
        min = score;
      }

      if (score >= 5.0) passed++;
      if (score >= 9.0) excellent++;
      else if (score >= 8.0) good++;
      else if (score >= 6.5) fair++;
      else if (score >= 5.0) avgCount++;
      else weak++;

      if (sub.isViolation) violations++;

      // Distribution bin
      let binIdx = Math.floor(score);
      if (binIdx >= 10) binIdx = 9;
      distribution[binIdx]++;

      // Time spent
      if (typeof sub.timeSpent === "number" && sub.timeSpent > 0) {
        sumTimeSec += sub.timeSpent;
        validTimeCount++;
      } else if (typeof sub.timeSpent === "string") {
        const match = sub.timeSpent.match(/(\d+)\s*phút/);
        if (match) {
          sumTimeSec += parseInt(match[1]) * 60;
          validTimeCount++;
        }
      }
    });

    const avgScore = Number((sumScore / totalCount).toFixed(2));
    const avgTimeSec = validTimeCount > 0 ? Math.round(sumTimeSec / validTimeCount) : 0;
    const avgTimeMin = (avgTimeSec / 60).toFixed(1);

    return {
      totalSubmissions: totalCount,
      averageScore: avgScore,
      maxScore: max === -1 ? 0 : max,
      minScore: min === 999 ? 0 : min,
      passedCount: passed,
      passedRate: Math.round((passed / totalCount) * 100),
      excellentCount: excellent,
      goodCount: good,
      fairCount: fair,
      averageCount: avgCount,
      weakCount: weak,
      violationCount: violations,
      avgTimeMinutes: Number(avgTimeMin),
      scoreDistribution: distribution,
      topStudentName: topStudent
    };
  }, [submissions]);

  // 4. Filtered & Sorted Submissions
  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];

    // Search query
    if (studentSearch.trim()) {
      const q = studentSearch.trim().toLowerCase();
      result = result.filter(sub => {
        const name = (sub.studentName || sub.name || "").toLowerCase();
        const sClass = (sub.studentClass || sub.className || "").toLowerCase();
        return name.includes(q) || sClass.includes(q);
      });
    }

    // Grade classification filter
    if (gradeFilter !== "all") {
      result = result.filter(sub => {
        const score = sub.totalScore !== undefined ? Number(sub.totalScore) : (sub.score !== undefined ? Number(sub.score) : 0);
        if (gradeFilter === "excellent") return score >= 9.0;
        if (gradeFilter === "good") return score >= 8.0 && score < 9.0;
        if (gradeFilter === "fair") return score >= 6.5 && score < 8.0;
        if (gradeFilter === "average") return score >= 5.0 && score < 6.5;
        if (gradeFilter === "weak") return score < 5.0;
        if (gradeFilter === "violation") return Boolean(sub.isViolation);
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const scoreA = a.totalScore !== undefined ? Number(a.totalScore) : (a.score !== undefined ? Number(a.score) : 0);
      const scoreB = b.totalScore !== undefined ? Number(b.totalScore) : (b.score !== undefined ? Number(b.score) : 0);
      const timeA = new Date(a.submittedAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.submittedAt || b.timestamp || 0).getTime();

      if (sortBy === "score_desc") return scoreB - scoreA;
      if (sortBy === "score_asc") return scoreA - scoreB;
      if (sortBy === "time_asc") return timeB - timeA;
      if (sortBy === "name_asc") {
        const nameA = a.studentName || a.name || "";
        const nameB = b.studentName || b.name || "";
        return nameA.localeCompare(nameB, "vi");
      }
      return 0;
    });

    return result;
  }, [submissions, studentSearch, gradeFilter, sortBy]);

  // 5. Export to Excel
  const handleExportExcel = () => {
    if (!submissions || submissions.length === 0) {
      alert("Chưa có lượt nộp bài nào để xuất Excel!");
      return;
    }

    try {
      const rows = submissions.map((sub, idx) => {
        const score = sub.totalScore !== undefined ? Number(sub.totalScore) : (sub.score !== undefined ? Number(sub.score) : 0);
        
        let classification = "Chưa đạt";
        if (score >= 9.0) classification = "Xuất sắc";
        else if (score >= 8.0) classification = "Giỏi";
        else if (score >= 6.5) classification = "Khá";
        else if (score >= 5.0) classification = "Trung bình";

        let timeFormatted = "";
        if (typeof sub.timeSpent === "number") {
          timeFormatted = `${Math.floor(sub.timeSpent / 60)} phút ${sub.timeSpent % 60} giây`;
        } else {
          timeFormatted = String(sub.timeSpent || "");
        }

        return {
          "STT": idx + 1,
          "Họ và tên học sinh": sub.studentName || sub.name || "Ẩn danh",
          "Lớp": sub.studentClass || sub.className || "",
          "Điểm số (Thang 10)": score,
          "Xếp loại học lực": classification,
          "Điểm Phần I": sub.scorePart1 !== undefined ? sub.scorePart1 : "",
          "Điểm Phần II": sub.scorePart2 !== undefined ? sub.scorePart2 : "",
          "Điểm Phần III": sub.scorePart3 !== undefined ? sub.scorePart3 : "",
          "Thời gian làm bài": timeFormatted,
          "Thời điểm nộp": sub.submitTime || sub.submittedAt || sub.timestamp || "",
          "Trạng thái giám sát": sub.isViolation ? "🚨 Vi phạm: Thoát tab/màn hình" : "✅ Hợp lệ",
          "Chi tiết vi phạm": sub.violationReason || ""
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Auto-fit column widths
      const colWidths = Object.keys(rows[0] || {}).map(key => {
        const maxLen = Math.max(
          key.length,
          ...rows.map(r => String((r as any)[key] || "").length)
        );
        return { wch: Math.min(45, maxLen + 3) };
      });
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bang_Diem_Hoc_Sinh");

      const safeTitle = (currentExam?.title || currentExam?.examTitle || "De_Kiem_Tra").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      const fileName = `Bang_Diem_Thong_Ke_${selectedRoomId}_${safeTitle}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (e: any) {
      alert("Lỗi xuất file Excel: " + e.message);
    }
  };

  const copyRoomLink = () => {
    const origin = window.location.origin;
    const link = `${origin}/?pin=${selectedRoomId}`;
    navigator.clipboard.writeText(link);
    setCopyFeedback("Đã chép link!");
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const copyPinOnly = () => {
    navigator.clipboard.writeText(selectedRoomId);
    setCopyFeedback("Đã chép mã PIN!");
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleRefreshExamUrl = async () => {
    if (!selectedRoomId) return;
    const cleanCode = selectedRoomId.trim().toUpperCase();
    try {
      let examData = currentExam;
      if (!examData || !examData.code) {
        examData = await fetchExamFromCloud(cleanCode);
      }
      if (!examData) {
        alert(`Không tìm thấy dữ liệu cho mã phòng "${cleanCode}".`);
        return;
      }

      const refreshedPayload = {
        ...examData,
        id: cleanCode,
        customId: cleanCode,
        updatedAt: new Date().toISOString()
      };

      await saveExamToCloud(cleanCode, refreshedPayload);

      registerExamUrlMapping(cleanCode, cleanCode);
      registerExamUrlMapping(`/exam/${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/p/${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/thi/${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/room/${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/?pin=${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/#/exam/${cleanCode}`, cleanCode);
      registerExamUrlMapping(`/?data=${cleanCode}`, cleanCode);

      const newShareUrl = `${window.location.origin}/?pin=${cleanCode}`;
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(newShareUrl);
      }

      setCopyFeedback("Đã làm mới URL!");
      setTimeout(() => setCopyFeedback(null), 2500);
      alert(`🎉 Đã làm mới & tái ánh xạ URL kỳ thi thành công!\n\nMã PIN: ${cleanCode}\nLiên kết mới đã được sao chép vào khay nhớ tạm:\n${newShareUrl}`);
    } catch (e: any) {
      alert("Lỗi làm mới URL: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Báo cáo Giáo viên
            </span>
            {currentExam?.antiCheatMode && (
              <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-semibold rounded-md flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Giám sát Chống thoát tab
              </span>
            )}
            <span className="text-xs text-slate-400">
              Cập nhật: {lastRefreshed.toLocaleTimeString("vi-VN")}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Dashboard Thống Kê Kết Quả Bài Kiểm Tra
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi số lượng hoàn thành, phổ điểm, điểm trung bình và chi tiết bài làm học sinh theo thời gian thực.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Room Selector Dropdown */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <select
              value={selectedRoomId}
              onChange={(e) => handleRoomChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="">-- Chọn bài kiểm tra --</option>
              {roomsList.map((room) => {
                const subCount = room.submissions?.length || 0;
                return (
                  <option key={room.id || room.code} value={room.id || room.code}>
                    [{room.id || room.code}] {room.title?.slice(0, 30)} ({subCount} bài)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search other PIN Form */}
          <form onSubmit={handleSearchPinSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Nhập mã PIN..."
              value={searchPinInput}
              onChange={(e) => setSearchPinInput(e.target.value.toUpperCase())}
              maxLength={8}
              className="w-28 sm:w-32 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
            <button
              type="submit"
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
              title="Tìm và nạp dữ liệu phòng thi"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Refresh Button */}
          <button
            onClick={() => fetchExamData(selectedRoomId)}
            disabled={isLoading || !selectedRoomId}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            title="Làm mới dữ liệu bài nộp từ học sinh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Làm mới</span>
          </button>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
              autoRefresh
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
            title="Tự động đồng bộ kết quả mới nộp mỗi 12 giây"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            <span>{autoRefresh ? "Tự động: BẬT" : "Tự động: TẮT"}</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={!submissions.length}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Selected Exam Information Banner */}
      {selectedRoomId ? (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/10 rounded-lg text-emerald-300 font-mono text-sm font-extrabold tracking-wider border border-white/15">
                PIN: {selectedRoomId}
              </span>
              <span className="text-xs text-indigo-200">
                • Thời lượng: <strong>{currentExam?.duration || 45} phút</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {currentExam?.title || currentExam?.examTitle || `Phòng thi ${selectedRoomId}`}
            </h2>
            <p className="text-xs text-indigo-200/80">
              Đường dẫn làm bài của học sinh:{" "}
              <span className="font-mono underline text-white/90">
                {window.location.origin}/?pin={selectedRoomId}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRefreshExamUrl}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Làm mới liên kết chia sẻ & tái ánh xạ mã PIN kỳ thi"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới URL</span>
            </button>
            <button
              onClick={copyRoomLink}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copyFeedback === "Đã chép link!" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copyFeedback === "Đã chép link!" ? "Đã sao chép link" : "Chia sẻ link"}</span>
            </button>
            <button
              onClick={copyPinOnly}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copyFeedback === "Đã chép mã PIN!" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Sao chép PIN</span>
            </button>
            <a
              href={`${window.location.origin}/?pin=${selectedRoomId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Thử làm bài</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-sm flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Vui lòng chọn một đề kiểm tra từ danh sách hoặc nhập mã PIN phòng thi ở góc trên để bắt đầu theo dõi thống kê.</span>
        </div>
      )}

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Số lượng hoàn thành */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Số lượng hoàn thành</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 tracking-tight">{stats.totalSubmissions}</span>
            <span className="text-xs font-semibold text-slate-400">học sinh đã nộp</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-700 font-semibold bg-indigo-50/60 px-2.5 py-1 rounded-lg w-fit">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tỉ lệ đạt: {stats.passedRate}%</span>
          </div>
        </div>

        {/* Card 2: Điểm trung bình */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm trung bình</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 tracking-tight">{stats.averageScore}</span>
            <span className="text-xs font-semibold text-slate-400">/ 10 điểm</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50/60 px-2.5 py-1 rounded-lg w-fit">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {stats.averageScore >= 8.0 ? "Chất lượng Giỏi" : (stats.averageScore >= 6.5 ? "Chất lượng Khá" : (stats.averageScore >= 5.0 ? "Đạt chuẩn" : "Cần ôn tập thêm"))}
            </span>
          </div>
        </div>

        {/* Card 3: Phổ điểm & Cao/Thấp nhất */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm cao nhất & thấp nhất</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-black text-amber-600">{stats.maxScore}đ</span>
              <p className="text-[10px] text-slate-400 font-medium">Cao nhất ({stats.topStudentName.slice(0, 14)})</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-2xl font-black text-slate-600">{stats.minScore}đ</span>
              <p className="text-[10px] text-slate-400 font-medium">Thấp nhất</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-amber-700 font-semibold bg-amber-50/60 px-2.5 py-1 rounded-lg w-fit">
            <span>{stats.excellentCount + stats.goodCount} em đạt loại Giỏi/Xuất sắc</span>
          </div>
        </div>

        {/* Card 4: Thời gian & Giám sát */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian & Giám sát</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 tracking-tight">{stats.avgTimeMinutes || 0}</span>
            <span className="text-xs font-semibold text-slate-400">phút / bài trung bình</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg w-fit transition-colors">
            {stats.violationCount > 0 ? (
              <span className="bg-rose-100 text-rose-700 flex items-center gap-1 px-2 py-0.5 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                {stats.violationCount} lượt cảnh báo vi phạm tab
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 flex items-center gap-1 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                100% bài thi hợp lệ
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Visual Analytics & Score Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Score Distribution Bar Chart (2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Biểu Đồ Phổ Điểm Chi Tiết (0 - 10 Điểm)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Phân bố số lượng học sinh đạt các dải điểm theo thang điểm chuẩn
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Tổng số bài: <strong>{stats.totalSubmissions}</strong>
            </span>
          </div>

          {/* Histogram Bars */}
          {stats.totalSubmissions === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium">Chưa có bài nộp nào để hiển thị biểu đồ phổ điểm.</p>
            </div>
          ) : (
            <div className="pt-4 space-y-4">
              <div className="h-44 sm:h-52 flex items-end gap-2 sm:gap-3 px-2 pt-6 pb-2 border-b border-slate-200">
                {stats.scoreDistribution.map((count, idx) => {
                  const maxBin = Math.max(...stats.scoreDistribution, 1);
                  const heightPercent = Math.round((count / maxBin) * 100);
                  const isPass = idx >= 5;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded-md shadow-md pointer-events-none whitespace-nowrap z-10">
                        {count} học sinh ({stats.totalSubmissions ? Math.round((count / stats.totalSubmissions) * 100) : 0}%)
                      </div>

                      {/* Number above bar */}
                      <span className="text-[11px] font-bold text-slate-600 mb-1">
                        {count > 0 ? count : ""}
                      </span>

                      {/* Bar Fill */}
                      <div
                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          idx >= 9
                            ? "bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:brightness-110"
                            : idx >= 8
                            ? "bg-gradient-to-t from-emerald-500 to-emerald-400 group-hover:brightness-110"
                            : idx >= 6.5
                            ? "bg-gradient-to-t from-indigo-500 to-blue-400 group-hover:brightness-110"
                            : isPass
                            ? "bg-gradient-to-t from-blue-400 to-sky-300 group-hover:brightness-110"
                            : "bg-gradient-to-t from-rose-400 to-amber-300 group-hover:brightness-110"
                        }`}
                      />

                      {/* Label on X-axis */}
                      <span className="text-[11px] font-mono font-bold text-slate-500 mt-2">
                        {idx}-{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  Xuất sắc (9-10đ)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  Giỏi (8-&lt;9đ)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  Khá (6.5-&lt;8đ)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-400" />
                  Trung bình (5-&lt;6.5đ)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400" />
                  Chưa đạt (&lt;5đ)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Academic Classification Breakdown (1 column) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-600" />
                Xếp Loại Học Lực (Chuẩn Bộ GD&ĐT)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tỉ lệ phân loại học lực cả lớp
              </p>
            </div>

            <div className="space-y-3.5 pt-4">
              {/* Xuất sắc */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-emerald-700">Xuất sắc (9.0 - 10.0)</span>
                  <span className="text-slate-800">
                    {stats.excellentCount} em ({stats.totalSubmissions ? Math.round((stats.excellentCount / stats.totalSubmissions) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.totalSubmissions ? (stats.excellentCount / stats.totalSubmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Giỏi */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-emerald-600">Giỏi (8.0 - 8.9)</span>
                  <span className="text-slate-800">
                    {stats.goodCount} em ({stats.totalSubmissions ? Math.round((stats.goodCount / stats.totalSubmissions) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.totalSubmissions ? (stats.goodCount / stats.totalSubmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Khá */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-indigo-600">Khá (6.5 - 7.9)</span>
                  <span className="text-slate-800">
                    {stats.fairCount} em ({stats.totalSubmissions ? Math.round((stats.fairCount / stats.totalSubmissions) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.totalSubmissions ? (stats.fairCount / stats.totalSubmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Trung bình */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-blue-600">Trung bình (5.0 - 6.4)</span>
                  <span className="text-slate-800">
                    {stats.averageCount} em ({stats.totalSubmissions ? Math.round((stats.averageCount / stats.totalSubmissions) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.totalSubmissions ? (stats.averageCount / stats.totalSubmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Chưa đạt / Yếu */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-rose-600">Chưa đạt (&lt; 5.0)</span>
                  <span className="text-slate-800">
                    {stats.weakCount} em ({stats.totalSubmissions ? Math.round((stats.weakCount / stats.totalSubmissions) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.totalSubmissions ? (stats.weakCount / stats.totalSubmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-600 mt-4">
            <p className="font-semibold text-slate-700">💡 Nhận xét nhanh sư phạm:</p>
            <p className="mt-1 leading-relaxed">
              {stats.passedRate >= 80
                ? "Lớp đạt kết quả rất tốt với tỉ lệ trên trung bình cao. Giáo viên có thể triển khai bài học nâng cao tiếp theo."
                : stats.passedRate >= 50
                ? "Đa số học sinh nắm được kiến thức trọng tâm, nên lưu ý củng cố lại các câu hỏi học sinh hay nhầm lẫn."
                : "Tỉ lệ đạt yêu cầu chưa cao. Cần bố trí buổi chữa đề chi tiết và củng cố lại các dạng bài cơ bản."}
            </p>
          </div>
        </div>

      </div>

      {/* Submissions Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4">
        
        {/* Table Controls Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Danh Sách Học Sinh Hoàn Thành ({filteredSubmissions.length} / {submissions.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Bảng điểm trực tuyến được cập nhật tự động khi học sinh nhấn Nộp bài
            </p>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên, lớp..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
              {studentSearch && (
                <button
                  onClick={() => setStudentSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Classification Filter Dropdown */}
            <select
              value={gradeFilter}
              onChange={(e: any) => setGradeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="all">Tất cả xếp loại</option>
              <option value="excellent">Xuất sắc (≥ 9.0)</option>
              <option value="good">Giỏi (8.0 - 8.9)</option>
              <option value="fair">Khá (6.5 - 7.9)</option>
              <option value="average">Trung bình (5.0 - 6.4)</option>
              <option value="weak">Chưa đạt (&lt; 5.0)</option>
              <option value="violation">🚨 Có vi phạm thoát tab</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="score_desc">Điểm: Cao → Thấp</option>
              <option value="score_asc">Điểm: Thấp → Cao</option>
              <option value="time_asc">Mới nộp nhất</option>
              <option value="name_asc">Tên học sinh: A → Z</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Không tìm thấy bài nộp nào phù hợp.</p>
            <p className="text-xs text-slate-400">
              {submissions.length === 0
                ? "Chưa có học sinh nào nộp bài cho phòng thi này. Hãy chia sẻ đường dẫn cho học sinh tham gia."
                : "Thử thay đổi bộ lọc xếp loại hoặc từ khóa tìm kiếm."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Hạng</th>
                  <th className="py-3 px-4">Họ và tên học sinh</th>
                  <th className="py-3 px-4 w-24">Lớp</th>
                  <th className="py-3 px-4 w-28 text-center">Điểm số</th>
                  <th className="py-3 px-4 w-32">Xếp loại</th>
                  <th className="py-3 px-4 w-32">Thời gian làm</th>
                  <th className="py-3 px-4 w-40">Thời điểm nộp</th>
                  <th className="py-3 px-4 w-40">Giám sát</th>
                  <th className="py-3 px-4 w-24 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSubmissions.map((sub, idx) => {
                  const score = sub.totalScore !== undefined ? Number(sub.totalScore) : (sub.score !== undefined ? Number(sub.score) : 0);
                  const isTop1 = idx === 0 && sortBy === "score_desc";
                  const isTop2 = idx === 1 && sortBy === "score_desc";
                  const isTop3 = idx === 2 && sortBy === "score_desc";

                  let classification = "Chưa đạt";
                  let classColor = "bg-rose-50 text-rose-700 border-rose-200";
                  if (score >= 9.0) {
                    classification = "Xuất sắc";
                    classColor = "bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold";
                  } else if (score >= 8.0) {
                    classification = "Giỏi";
                    classColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  } else if (score >= 6.5) {
                    classification = "Khá";
                    classColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                  } else if (score >= 5.0) {
                    classification = "Trung bình";
                    classColor = "bg-blue-50 text-blue-700 border-blue-200";
                  }

                  let timeFormatted = "";
                  if (typeof sub.timeSpent === "number") {
                    timeFormatted = `${Math.floor(sub.timeSpent / 60)}p ${sub.timeSpent % 60}s`;
                  } else {
                    timeFormatted = String(sub.timeSpent || "-");
                  }

                  return (
                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Rank */}
                      <td className="py-3 px-4 text-center">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black text-xs shadow-xs" title="Hạng 1">
                            🥇
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs" title="Hạng 2">
                            🥈
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs" title="Hạng 3">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold text-xs">{idx + 1}</span>
                        )}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {sub.studentName || sub.name || "Học sinh ẩn danh"}
                      </td>

                      {/* Class */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {sub.studentClass || sub.className || "-"}
                      </td>

                      {/* Score */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-xl text-base font-black ${
                          score >= 8.0 ? "text-emerald-700 bg-emerald-50" : (score >= 5.0 ? "text-indigo-700 bg-indigo-50" : "text-rose-700 bg-rose-50")
                        }`}>
                          {score.toFixed(1)}
                        </span>
                      </td>

                      {/* Classification Badge */}
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${classColor}`}>
                          {classification}
                        </span>
                      </td>

                      {/* Time Spent */}
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {timeFormatted}
                      </td>

                      {/* Submission Timestamp */}
                      <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                        {sub.submitTime || sub.submittedAt || sub.timestamp || "-"}
                      </td>

                      {/* Proctoring Status */}
                      <td className="py-3 px-4">
                        {sub.isViolation ? (
                          <div className="flex flex-col">
                            <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-md flex items-center gap-1 w-fit">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              Thoát tab (Tự động nộp)
                            </span>
                            {sub.violationReason && (
                              <span className="text-[10px] text-rose-500 mt-0.5 line-clamp-1" title={sub.violationReason}>
                                {sub.violationReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-xs rounded-md flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Hợp lệ
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedSubmissionForReview(sub)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                          title="Xem chi tiết câu trả lời"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Submission Detail Modal */}
      {selectedSubmissionForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Chi Tiết Bài Làm: {selectedSubmissionForReview.studentName || selectedSubmissionForReview.name || "Học sinh"}
                </h3>
                <p className="text-xs text-slate-500">
                  Lớp: <strong>{selectedSubmissionForReview.studentClass || selectedSubmissionForReview.className || "Chưa rõ"}</strong> • Nộp lúc: {selectedSubmissionForReview.submitTime || selectedSubmissionForReview.submittedAt || selectedSubmissionForReview.timestamp || "Không rõ"}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmissionForReview(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4 text-sm">
              {/* Score Highlight Box */}
              <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase block">Tổng điểm đạt được</span>
                  <span className="text-3xl font-black text-indigo-700">
                    {Number(selectedSubmissionForReview.totalScore || selectedSubmissionForReview.score || 0).toFixed(1)} / 10
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-bold uppercase block">Thời gian làm</span>
                  <span className="text-sm font-bold text-slate-700">
                    {typeof selectedSubmissionForReview.timeSpent === "number"
                      ? `${Math.floor(selectedSubmissionForReview.timeSpent / 60)} phút ${selectedSubmissionForReview.timeSpent % 60} giây`
                      : String(selectedSubmissionForReview.timeSpent || "-")}
                  </span>
                </div>
              </div>

              {/* Violation Alert Box */}
              {selectedSubmissionForReview.isViolation && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Cảnh Báo Vi Phạm Giám Sát</span>
                  </div>
                  <p>Học sinh đã rời khỏi màn hình làm bài kiểm tra hoặc chuyển tab khác trong khi làm bài.</p>
                  {selectedSubmissionForReview.violationReason && (
                    <p className="font-semibold text-rose-600">Lý do: {selectedSubmissionForReview.violationReason}</p>
                  )}
                  {selectedSubmissionForReview.violationTime && (
                    <p className="text-[11px] text-rose-500">Thời điểm ghi nhận: {selectedSubmissionForReview.violationTime}</p>
                  )}
                </div>
              )}

              {/* Part Scores Breakdown if available */}
              {(selectedSubmissionForReview.scorePart1 !== undefined || selectedSubmissionForReview.scorePart2 !== undefined || selectedSubmissionForReview.scorePart3 !== undefined) && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Phần I (Trắc nghiệm)</span>
                    <span className="text-base font-bold text-slate-800">{selectedSubmissionForReview.scorePart1 ?? "-"}đ</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Phần II (Đúng/Sai)</span>
                    <span className="text-base font-bold text-slate-800">{selectedSubmissionForReview.scorePart2 ?? "-"}đ</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Phần III (Trả lời ngắn)</span>
                    <span className="text-base font-bold text-slate-800">{selectedSubmissionForReview.scorePart3 ?? "-"}đ</span>
                  </div>
                </div>
              )}

              {/* Details & Answers summary if present */}
              {selectedSubmissionForReview.details && typeof selectedSubmissionForReview.details === "object" && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">Chi tiết các câu trả lời:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                    {Array.isArray(selectedSubmissionForReview.details) ? (
                      selectedSubmissionForReview.details.map((item: any, qIdx: number) => (
                        <div key={qIdx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-150">
                          <span className="font-semibold text-slate-700">Câu {item.questionNumber || qIdx + 1}:</span>
                          <span className="font-mono text-slate-600">Đã chọn: <strong>{item.studentChoice || item.selectedAnswer || "-"}</strong></span>
                          <span className={item.isCorrect ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                            {item.isCorrect ? "✅ Đúng" : "❌ Sai"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <pre className="text-[11px] font-mono bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto">
                        {JSON.stringify(selectedSubmissionForReview.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSubmissionForReview(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs"
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

export default ExamStatsDashboard;
