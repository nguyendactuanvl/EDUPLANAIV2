import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart3, Users, CheckCircle2, Clock, Award, TrendingUp, Sparkles,
  PieChart, School, BookOpen, Activity, Search, RefreshCw, AlertTriangle, Printer, Download
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
  duration?: number;
  subject?: string;
  grade?: string;
  createdAt?: string;
  submissions?: Submission[];
}

export function OverallAnalyticsDashboard() {
  const [roomsList, setRoomsList] = useState<ExamRoom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadAllData = () => {
    setIsLoading(true);
    const combined: ExamRoom[] = [];
    const seenCodes = new Set<string>();

    const addRooms = (rawList: any[]) => {
      if (!Array.isArray(rawList)) return;
      rawList.forEach((item: any) => {
        const code = String(item.code || item.id || item.examId || item.pin || "").trim().toUpperCase();
        if (code && !seenCodes.has(code)) {
          seenCodes.add(code);
          combined.push({
            ...item,
            id: code,
            code: code,
            title: item.title || item.examTitle || item.examName || `Phòng thi ${code}`,
            duration: item.duration || item.examDuration || 45,
            submissions: Array.isArray(item.submissions) ? item.submissions : []
          });
        }
      });
    };

    try {
      const raw1 = localStorage.getItem("eduplan_teacher_exams_history");
      if (raw1) addRooms(JSON.parse(raw1));
    } catch (e) {}

    try {
      const raw2 = localStorage.getItem("eduplan_worksheet_exams_history");
      if (raw2) addRooms(JSON.parse(raw2));
    } catch (e) {}

    try {
      const raw3 = localStorage.getItem("eduplan_shuffled_exams_history");
      if (raw3) addRooms(JSON.parse(raw3));
    } catch (e) {}

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("examCache_")) {
          const code = key.replace("examCache_", "").trim().toUpperCase();
          if (code && !seenCodes.has(code)) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key) || "{}");
              if (parsed && typeof parsed === 'object') {
                seenCodes.add(code);
                combined.push({
                  ...parsed,
                  id: code,
                  code: code,
                  title: parsed.examTitle || parsed.title || parsed.examName || `Phòng thi ${code}`,
                  duration: parsed.duration || parsed.examDuration || 45,
                  submissions: Array.isArray(parsed.submissions) ? parsed.submissions : []
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    setRoomsList(combined);
    setIsLoading(false);
  };

  const handleExportPdf = async () => {
    if (!dashboardRef.current) return;
    try {
      setIsExportingPdf(true);
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1280
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Bao_Cao_Tong_Quan_Hoc_Tap_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("Export PDF error:", error);
      alert("Không thể xuất file PDF. Vui lòng thử lại.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Aggregate all submissions across all rooms
  const allSubmissions = useMemo(() => {
    const list: { roomTitle: string; roomCode: string; submission: Submission }[] = [];
    roomsList.forEach(room => {
      const subs = Array.isArray(room.submissions) ? room.submissions : [];
      subs.forEach(sub => {
        list.push({
          roomTitle: room.title || room.examTitle || room.code || 'Phòng thi',
          roomCode: room.code || room.id || '',
          submission: sub
        });
      });
    });
    return list;
  }, [roomsList]);

  // Extract unique classes
  const availableClasses = useMemo(() => {
    const classesSet = new Set<string>();
    allSubmissions.forEach(item => {
      const cls = item.submission.studentClass || item.submission.className;
      if (cls && typeof cls === 'string' && cls.trim()) {
        classesSet.add(cls.trim());
      }
    });
    return Array.from(classesSet).sort();
  }, [allSubmissions]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return allSubmissions.filter(item => {
      const sub = item.submission;
      const cls = (sub.studentClass || sub.className || "").trim();
      const name = (sub.studentName || sub.name || "").toLowerCase();

      if (selectedClassFilter !== "all" && cls !== selectedClassFilter) {
        return false;
      }
      if (searchQuery.trim() && !name.includes(searchQuery.trim().toLowerCase()) && !item.roomTitle.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [allSubmissions, selectedClassFilter, searchQuery]);

  // Overall statistics calculation
  const stats = useMemo(() => {
    const total = filteredSubmissions.length;
    if (total === 0) {
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
        scoreDistribution: Array(10).fill(0)
      };
    }

    let sum = 0;
    let max = -1;
    let min = 11;
    let passed = 0;
    let excellent = 0; // >= 9.0
    let good = 0;      // 8.0 - < 9.0
    let fair = 0;      // 6.5 - < 8.0
    let avgCount = 0;   // 5.0 - < 6.5
    let weak = 0;       // < 5.0
    let violations = 0;
    const distribution = Array(10).fill(0);

    filteredSubmissions.forEach(item => {
      const sub = item.submission;
      const raw = sub.totalScore !== undefined ? Number(sub.totalScore) : (sub.score !== undefined ? Number(sub.score) : 0);
      const score = Math.max(0, Math.min(10, isNaN(raw) ? 0 : raw));

      sum += score;
      if (score > max) max = score;
      if (score < min) min = score;

      if (score >= 5.0) passed++;
      if (score >= 9.0) excellent++;
      else if (score >= 8.0) good++;
      else if (score >= 6.5) fair++;
      else if (score >= 5.0) avgCount++;
      else weak++;

      if (sub.isViolation) violations++;

      const bin = Math.min(9, Math.floor(score));
      distribution[bin]++;
    });

    return {
      totalSubmissions: total,
      averageScore: Number((sum / total).toFixed(2)),
      maxScore: Number(max.toFixed(2)),
      minScore: min === 11 ? 0 : Number(min.toFixed(2)),
      passedCount: passed,
      passedRate: Number(((passed / total) * 100).toFixed(1)),
      excellentCount: excellent,
      goodCount: good,
      fairCount: fair,
      averageCount: avgCount,
      weakCount: weak,
      violationCount: violations,
      scoreDistribution: distribution
    };
  }, [filteredSubmissions]);

  return (
    <div ref={dashboardRef} className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" /> Thống kê toàn diện
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-200 border border-white/20">
              Không cần Google Sheet
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            📊 Dashboard Tổng Quan Kết Quả Học Tập
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-2xl leading-relaxed">
            Phân tích xu hướng học tập, biểu đồ phổ điểm và kết quả thi của tất cả các lớp học được lưu trữ trực tiếp trên hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadAllData}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm border border-emerald-500 flex items-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
          >
            <Printer className={`w-4 h-4 ${isExportingPdf ? 'animate-spin' : ''}`} />
            <span>{isExportingPdf ? "Đang xuất PDF..." : "Xuất báo cáo PDF"}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase text-slate-700">Lọc theo lớp:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">Tất cả các lớp ({availableClasses.length} lớp)</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>Lớp {cls}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-700">Tổng phòng thi:</span>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200">
              {roomsList.length} phòng
            </span>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm học sinh hoặc bài thi..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Tổng bài nộp</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalSubmissions}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">✓ Đã ghi nhận đồng bộ</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Điểm trung bình chung</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{stats.averageScore} <span className="text-sm font-normal text-slate-500">/ 10</span></div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Thấp nhất: {stats.minScore} • Cao nhất: {stats.maxScore}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Tỷ lệ đạt (≥ 5.0)</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.passedRate}%</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">{stats.passedCount} / {stats.totalSubmissions} học sinh đạt</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Cảnh báo gian lận</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.violationCount}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Thoát tab / vi phạm quy chế</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Distribution Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <span>Biểu đồ Phổ Điểm Tổng Hợp (0 đến 10)</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">Toàn hệ thống</span>
            </div>

            {/* Custom Bar Visualization */}
            <div className="space-y-3 py-4">
              {stats.scoreDistribution.map((count, idx) => {
                const maxVal = Math.max(...stats.scoreDistribution, 1);
                const percent = Math.round((count / maxVal) * 100);
                const rangeLabel = idx === 9 ? '[9.0 - 10]' : `[${idx}.0 - ${idx + 1}.0)`;
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <span className="w-20 font-mono font-bold text-slate-600 text-right">{rangeLabel}</span>
                    <div className="flex-1 bg-slate-100 h-6 rounded-lg overflow-hidden relative flex items-center">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-blue-600 h-full rounded-lg transition-all duration-500"
                        style={{ width: `${Math.max(percent, count > 0 ? 6 : 0)}%` }}
                      />
                      <span className="absolute right-3 font-bold text-slate-700">{count} bài</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <span>💡 Dữ liệu được thống kê tự động từ tất cả các phòng thi và phiếu bài tập.</span>
            <span className="font-semibold text-indigo-600">{filteredSubmissions.length} kết quả đang hiển thị</span>
          </div>
        </div>

        {/* Grade Classification Breakdown */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-indigo-600" />
              <span>Phân Loại Học Lực Học Sinh</span>
            </h2>

            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                  <span className="text-xs font-bold text-emerald-900">Giỏi (≥ 8.0)</span>
                </div>
                <span className="text-sm font-black text-emerald-700">{stats.excellentCount + stats.goodCount} HS</span>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                  <span className="text-xs font-bold text-blue-900">Khá (6.5 - &lt; 8.0)</span>
                </div>
                <span className="text-sm font-black text-blue-700">{stats.fairCount} HS</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold text-amber-900">Trung bình (5.0 - &lt; 6.5)</span>
                </div>
                <span className="text-sm font-black text-amber-700">{stats.averageCount} HS</span>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                  <span className="text-xs font-bold text-rose-900">Yếu (&lt; 5.0)</span>
                </div>
                <span className="text-sm font-black text-rose-700">{stats.weakCount} HS</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800">📌 Ghi chú sư phạm:</div>
            <div>Hệ thống tự động tổng hợp để giáo viên nắm bắt nhanh chất lượng bộ môn qua các đợt khảo sát.</div>
          </div>
        </div>
      </div>

      {/* Submissions List Table Across All Classes */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <span>Danh Sách Chi Tiết Bài Làm Học Sinh ({filteredSubmissions.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Tập trung toàn bộ kết quả</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <th className="p-3.5 pl-5">STT</th>
                <th className="p-3.5">Học sinh</th>
                <th className="p-3.5">Lớp</th>
                <th className="p-3.5">Phòng thi / Đề kiểm tra</th>
                <th className="p-3.5 text-center">Tổng điểm</th>
                <th className="p-3.5 text-center">Thời gian nộp</th>
                <th className="p-3.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    Chưa có dữ liệu bài nộp nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((item, idx) => {
                  const sub = item.submission;
                  const raw = sub.totalScore !== undefined ? Number(sub.totalScore) : (sub.score !== undefined ? Number(sub.score) : 0);
                  const score = Math.max(0, Math.min(10, isNaN(raw) ? 0 : raw));
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-5 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-900">{sub.studentName || sub.name || "Học sinh"}</td>
                      <td className="p-3.5 font-semibold text-slate-700">{sub.studentClass || sub.className || "Chưa rõ"}</td>
                      <td className="p-3.5 text-slate-600 font-medium">{item.roomTitle}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${score >= 8 ? 'bg-emerald-100 text-emerald-800' : score >= 5 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'}`}>
                          {score.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-3.5 text-center text-slate-500 font-mono">
                        {sub.submitTime || sub.submittedAt || "Mới nộp"}
                      </td>
                      <td className="p-3.5 text-center">
                        {sub.isViolation ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Vi phạm
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Hợp lệ
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OverallAnalyticsDashboard;
