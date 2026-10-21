/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Analytics } from '@vercel/analytics/react';
import { Menu, Sparkles, Key, AlertCircle, HelpCircle, Sun, Moon } from "lucide-react";
import React, { useState, Suspense, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SettingsModal } from "./components/SettingsModal";
import { UserGuideModal } from "./components/UserGuideModal";
import { getInitialTheme, applyTheme, ThemeMode } from "./lib/theme";

function safeLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<any>,
  componentName?: string,
  retries = 2
): React.LazyExoticComponent<T> {
  return React.lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (left: number) => {
        factory()
          .then((mod) => {
            const comp =
              mod?.default ||
              (componentName ? mod?.[componentName] : undefined) ||
              (typeof mod === 'function' ? mod : undefined) ||
              Object.values(mod || {}).find((v) => typeof v === 'function');
            if (comp) {
              resolve({ default: comp as T });
            } else {
              reject(new Error(`Không thể tìm thấy component ${componentName || ''} trong module tải về.`));
            }
          })
          .catch((error) => {
            if (left > 0) {
              setTimeout(() => attempt(left - 1), 500);
            } else {
              const isChunkLoadFailed = error?.message && (
                error.message.includes('Failed to fetch dynamically imported module') ||
                error.message.includes('Importing a module script failed') ||
                error.message.includes('error loading dynamically imported module') ||
                error.message.includes('Unexpected token')
              );
              if (isChunkLoadFailed && typeof window !== 'undefined' && !sessionStorage.getItem('chunk_retry_done')) {
                sessionStorage.setItem('chunk_retry_done', '1');
                window.location.reload();
                return;
              }
              reject(error);
            }
          });
      };
      attempt(retries);
    });
  });
}

const EducationalPlan = safeLazy(() => import("./pages/EducationalPlan"), "EducationalPlan");
const LessonPlan = safeLazy(() => import("./pages/LessonPlan"), "LessonPlan");
const Circulars = safeLazy(() => import("./pages/Circulars"), "Circulars");
const HistoryPage = safeLazy(() => import("./pages/HistoryPage"), "HistoryPage");
const Worksheets = safeLazy(() => import("./pages/Worksheets"), "Worksheets");
const ExerciseSolver = safeLazy(() => import('./pages/ExerciseSolver'), "ExerciseSolver");
const PdfToWord = safeLazy(() => import('./pages/PdfToWord'), "PdfToWord");
const ExamGenerator = safeLazy(() => import('./pages/ExamGenerator'), "ExamGenerator");
const StudentExamView = safeLazy(() => import('./pages/StudentExamView'), "StudentExamView");
const ClassMap = safeLazy(() => import('./pages/ClassMap'), "ClassMap");
const HomeroomManagement = safeLazy(() => import('./pages/HomeroomManagement'), "HomeroomManagement");
const WeeklyTimetable = safeLazy(() => import('./pages/WeeklyTimetable'), "WeeklyTimetable");
const Gamification = safeLazy(() => import('./pages/Gamification'), "Gamification");
const MathTools = safeLazy(() => import('./pages/MathTools'), "MathTools");
const DeOnlinePdf = safeLazy(() => import('./pages/DeOnlinePdf'), "DeOnlinePdf");
const AiStudioSuite = safeLazy(() => import('./pages/AiStudioSuite'), "AiStudioSuite");
const EduPlanInkPage = safeLazy(() => import('./pages/EduPlanInkPage'), "EduPlanInkPage");
const MathOCRPage = safeLazy(() => import('./pages/MathOCRPage'), "MathOCRPage");
const HsaTsaHub = safeLazy(() => import('./pages/HsaTsaHub'), "HsaTsaHub");
const ExamStatsDashboard = safeLazy(() => import('./pages/ExamStatsDashboard'), "ExamStatsDashboard");




import { parseExamIdFromLocation, registerExamUrlMapping } from "./lib/smartRouter";

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || urlParams.get('view');
    if (tabParam === 'exam_stats' || tabParam === 'stats') return 'exam_stats';
    return "math_tools";
  });
  const [statsExamId, setStatsExamId] = useState<string | undefined>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('examId') || urlParams.get('pin') || urlParams.get('code') || undefined;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideSectionId, setGuideSectionId] = useState<string | undefined>(undefined);
  const [retryStatus, setRetryStatus] = useState<{ attempt: number, maxRetries: number, message?: string } | null>(null);

  // Theme State
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    // Auto-register exam URL mappings from teacher exam history
    try {
      const teacherHist = JSON.parse(localStorage.getItem("eduplan_teacher_exams_history") || "[]");
      const worksheetHist = JSON.parse(localStorage.getItem("eduplan_worksheet_exams_history") || "[]");
      const combined = [...(Array.isArray(teacherHist) ? teacherHist : []), ...(Array.isArray(worksheetHist) ? worksheetHist : [])];
      combined.forEach((item: any) => {
        const code = (item.code || item.id || item.examId || "").trim().toUpperCase();
        if (code) {
          registerExamUrlMapping(`/exam/${code}`, code);
          registerExamUrlMapping(`/p/${code}`, code);
          registerExamUrlMapping(`/thi/${code}`, code);
          registerExamUrlMapping(`/?pin=${code}`, code);
          registerExamUrlMapping(`/#/exam/${code}`, code);
        }
      });
    } catch (e) {}

    const handleShowModal = () => setIsSettingsOpen(true);
    const handleShowGuide = (e: any) => {
      if (e?.detail?.sectionId) {
        setGuideSectionId(e.detail.sectionId);
      }
      setIsGuideOpen(true);
    };
    const handleRetryStatus = (e: any) => {
      setRetryStatus(e.detail);
      setTimeout(() => setRetryStatus(null), 14000);
    };
    const handleFocusMode = (e: any) => {
      setIsFocusMode(Boolean(e?.detail));
    };

    const handleOpenStats = (e: any) => {
      if (e?.detail?.examId) {
        setStatsExamId(e.detail.examId);
      }
      setActiveTab("exam_stats");
    };

    window.addEventListener('show-api-key-modal', handleShowModal);
    window.addEventListener('show-user-guide-modal', handleShowGuide);
    window.addEventListener('api-retry-status', handleRetryStatus);
    window.addEventListener('hsa-focus-mode', handleFocusMode);
    window.addEventListener('open-exam-stats', handleOpenStats);
    
    const storedKey = localStorage.getItem("eduplan_gemini_api_key_v2");
    if (!storedKey) {
      setIsSettingsOpen(true);
    }

    return () => {
      window.removeEventListener('show-api-key-modal', handleShowModal);
      window.removeEventListener('show-user-guide-modal', handleShowGuide);
      window.removeEventListener('api-retry-status', handleRetryStatus);
      window.removeEventListener('hsa-focus-mode', handleFocusMode);
      window.removeEventListener('open-exam-stats', handleOpenStats);
    };
  }, []);

  // Smart URL parser & HashRouter redirect engine
  const { examId: studentExamId, examData: studentExamData, isStudentMode } = parseExamIdFromLocation();

  const urlParams = new URLSearchParams(window.location.search);
  const hashStr = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
  const hashParams = new URLSearchParams(hashStr);

  const viewMode = urlParams.get('view') || hashParams.get('view');
  const examPdfData = urlParams.get('data') || hashParams.get('d') || hashParams.get('data');

  if (viewMode === 'exam_pdf' && examPdfData) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-100 font-sans font-medium text-slate-500">Đang tải phòng thi PDF...</div>}>
        <DeOnlinePdf studentModeData={examPdfData} />
      </Suspense>
    );
  }

  if (studentExamData || studentExamId) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-100 font-sans">Đang tải phòng thi...</div>}>
        <StudentExamView examId={studentExamId || undefined} examRawData={studentExamData || undefined} />
      </Suspense>
    );
  }

  if (isStudentMode) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-100 font-sans">Đang tải phòng thi...</div>}>
        <StudentExamView />
      </Suspense>
    );
  }
  
  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {retryStatus && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
          <div className="text-sm">
            <p className="font-semibold">{retryStatus.message || "Hệ thống AI đang bận (Lỗi quá tải - 429)"}</p>
            <p>Đang tự động thử lại... ({retryStatus.attempt}/{retryStatus.maxRetries})</p>
          </div>
        </div>
      )}
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      {!isFocusMode && (
        <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setIsSidebarOpen(false);
            }} 
            onOpenSettings={() => {
              setIsSettingsOpen(true);
              setIsSidebarOpen(false);
            }}
            onOpenGuide={() => {
              setIsGuideOpen(true);
              setIsSidebarOpen(false);
            }}
            isDarkMode={theme === 'dark'}
            onToggleTheme={toggleTheme}
          />
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        {/* Mobile Header */}
        {!isFocusMode && (
          <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-sm z-10 relative">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
               <Sparkles className="h-6 w-6" />
               <span className="font-bold text-lg hidden sm:inline">EduPlan AI</span>
               <span className="font-bold text-lg sm:hidden">EduPlan</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs transition-colors"
                title="Chuyển giao diện Sáng/Tối"
              >
                {theme === 'dark' ? <Moon className="h-4 w-4 text-indigo-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
              </button>
              <button 
                onClick={() => setIsGuideOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-medium hover:bg-slate-200 transition-colors"
                title="Hướng dẫn sử dụng"
              >
                <HelpCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>HDSD</span>
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md text-xs font-medium hover:bg-emerald-100 transition-colors">
                <Key className="h-3.5 w-3.5" />
                <span>API Key</span>
              </button>
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-y-auto relative w-full h-full">
          <ErrorBoundary key={activeTab}>
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500">Đang tải...</div>}>
              {activeTab === "hsa_tsa" && <HsaTsaHub />}
              {activeTab === "math_ocr" && <MathOCRPage />}
              {activeTab === "ink" && <EduPlanInkPage />}
              {activeTab === "ai_studio" && <AiStudioSuite />}
              {activeTab === "khgd" && <EducationalPlan />}
              {activeTab === "khdh" && <LessonPlan />}
              {activeTab === "worksheets" && <Worksheets />}
              {activeTab === "exercise" && <ExerciseSolver />}
              {activeTab === "math_tools" && <MathTools />}
              {activeTab === "gamification" && <Gamification />}
              {activeTab === "classmap" && <ClassMap />}
              {activeTab === "homeroom" && <HomeroomManagement />}
              {activeTab === "timetable" && <WeeklyTimetable />}
              {activeTab === "exam" && <ExamGenerator />}
              {activeTab === "exam_stats" && <ExamStatsDashboard initialExamId={statsExamId} onBackToExam={() => setActiveTab("exam")} />}
              {activeTab === "pdf2word" && <PdfToWord />}
              {activeTab === "de_online_pdf" && <DeOnlinePdf />}
              {activeTab === "circulars" && <Circulars />}
              {activeTab === "history" && <HistoryPage />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} initialSectionId={guideSectionId} />
      <Analytics />
    </div>
  );
}

