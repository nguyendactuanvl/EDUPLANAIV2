import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { embedTikzSvgsInText } from "../components/TikzRenderer";
import { embedBbtSvgsInText, convertBbtTableToSvg, analyzeFunctionToBbt, generateBbtSvg } from "../lib/bbtRenderer";
import { apiFetch } from '../lib/apiFetch';

import { fullPlan } from "../data/mockData";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import LZString from 'lz-string';
import { Link } from 'lucide-react';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { exportHtmlToWord } from '../lib/exportUtils';
import { cn, fixMath, cleanQuestionStem, parseApiResponse, cleanOptionText, getPublicAppUrl, isRealWorldQuestion, sanitizeShortAnswerInput, validateShortAnswer, compareShortAnswers, sanitizeLatexString } from '../lib/utils';
import { ensureMathRendered } from '../lib/print';
import { saveExamToCloud, SYSTEM_EXAM_WEBHOOK } from '../lib/cloudExamStore';
import { 
  STANDARDIZED_EXAM_TYPES, 
  getDefaultDurationForExamType, 
  formatExamTitle, 
  normalizeExamType,
  SCHOOL_LEVELS,
  GRADES_BY_LEVEL,
  SUBJECTS_BY_LEVEL,
  NUM_EXAM_CODES_OPTIONS,
  PARAMETER_PROBLEM_OPTIONS,
  ParameterOption
} from '../lib/examConfig';
import { OnlineExamConfigModal } from "../components/OnlineExamConfigModal";
import { SAMPLE_MATH_QUESTIONS, SAMPLE_MATH_QUESTIONS_10, SAMPLE_MATH_QUESTIONS_11, SAMPLE_MATH_EXAM_NAME, SAMPLE_MATH_DURATION } from '../data/sampleMathExam';
import { parseRawExamText, formatAiQuestionsToParsed } from '../lib/examParser';
import { attachCroppedFiguresToQuestions } from '../lib/cropUtils';
import { UploadTeacherExamModal } from "../components/UploadTeacherExamModal";
import { WordEquationModal } from "../components/WordEquationModal";
import { SimilarExamsModal } from "../components/SimilarExamsModal";
import { QuestionEditModal } from "../components/QuestionEditModal";
import { HeaderConfigModal } from "../components/HeaderConfigModal";
import { HeaderConfig, getHeaderConfig, saveHeaderConfig } from "../lib/headerConfig";
import { QuestionVisualizerPanel } from "../components/math-tools/QuestionVisualizerPanel";
import { GeoGebraDrawer } from "../components/math-tools/GeoGebraDrawer";
import { ScientificCalculatorModal } from "../components/math-tools/ScientificCalculatorModal";

import {
  mixExam,
  identifyQuestionSection,
  SECTION_NAMES,
  SECTION_SHORT_NAMES,
  generateTNMakerCSV,
  exportTNMakerExcelFile,
  getQuestionAnswerString,
  MixerQuestion
} from '../lib/examMixer';
import React, { useState, useRef, useEffect, useMemo } from "react";
import * as XLSX from 'xlsx';
import { School, FileCheck, Sparkles, Shuffle, Download, Share2, Plus, Trash2, Printer, UploadCloud, FileSpreadsheet, FileText, FileCode, X, ExternalLink, Smartphone, Copy, Check, Edit3, ListPlus, Globe, Compass, RefreshCw, Eye, RotateCw, ZoomIn, ZoomOut, CheckCircle2, XCircle, AlertCircle, Save, MessageSquare, Award, Maximize2, Camera, TrendingUp, BarChart2, Box, BarChart3, Calculator, Wand2 } from "lucide-react";
import { run1ClickMathFix } from "../components/math-tools/MathFormulaFixer";

interface Question {
  type?: "mc" | "tf" | "sa" | "essay" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";
  explanation?: string;
  solution?: string;
  id: number;
  content: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  tfStatements?: { statement: string; correct: boolean }[];
  level: string;
  isRealWorld?: boolean;
  topic?: string;
  subtopic?: string;
  imageUrl?: string;
  hasFigure?: boolean;
  section?: 1 | 2 | 3 | 4;
  originalId?: number;
}

interface MatrixConfig {
  id: string;
  name: string;
  schoolLevel: string;
  subject: string;
  grade: string;
  duration: number;
  examType: string;
  numCodes: number;
  parameterOption?: ParameterOption;
  qCounts: any;
  qPoints: any;
  qEnabled: any;
  levels: any;
  outputConfig: any;
  realWorldConfig?: {
    enabled: boolean;
    level: "standard" | "high" | "max";
  };
  matrix: string;
  customPrompt: string;
  timestamp: number;
}


const MultiPointInput = ({ count, value, onChange, disabled }: { count: number, value: string, onChange: (val: string) => void, disabled: boolean }) => {
  const points = value.split(',').map(s => s.trim()).filter(s => s !== '');
  if (points.length === 0) points.push("1");
  
  // Create an array of length `count`
  const currentPoints = [];
  for (let i = 0; i < count; i++) {
    currentPoints.push(points[i] !== undefined ? points[i] : (points[points.length - 1] || "1"));
  }

  if (count > 0 && count <= 6) {
  
  
  return (
      <div className="flex flex-wrap gap-1 justify-center">
        {currentPoints.map((pt, i) => (
          <input 
            key={i}
            type="text"
            className="w-10 text-center border border-slate-300 rounded py-1 text-xs focus:ring-1 focus:ring-blue-500"
            value={pt}
            disabled={disabled}
            onChange={e => {
              const newPoints = [...currentPoints];
              newPoints[i] = e.target.value;
              onChange(newPoints.join(', '));
            }}
            title={`Điểm câu ${i+1}`}
          />
        ))}
      </div>
    );
  }

  return (
    <input type="text" value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" placeholder="VD: 0.5 hoặc 0.75, 1.0" title="Nhập điểm số (vd: 0.5) hoặc chuỗi (vd: 0.75, 1.0) cho các câu hỏi" />
  );
};

export function ExamGenerator() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [geoGebraTarget, setGeoGebraTarget] = useState<{ qIndex: number; target: "content" | "solution" } | null>(null);

  const [activeTab, setActiveTab] = useState<"matrix" | "exam" | "shuffle" | "banks" | "results">("matrix");
  const [examResults, setExamResults] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resultsSubTab, setResultsSubTab] = useState<"list" | "question_stats">("list");
  const [selectedStatsExamId, setSelectedStatsExamId] = useState<string>("");

  // 1. Lấy danh sách các mã đề thi độc nhất để điền vào dropdown lọc thống kê
  const uniqueExamIds = useMemo(() => {
    const ids = new Set<string>();
    examResults.forEach(r => {
      const id = String(r?.examId || r?.examName || '').trim();
      if (id) ids.add(id);
    });
    return Array.from(ids);
  }, [examResults]);

  // 2. Tính toán thống kê chi tiết theo từng câu hỏi (Chuẩn AZOTA)
  const questionDetailedStats = useMemo(() => {
    const filteredResults = selectedStatsExamId
      ? examResults.filter(r => String(r?.examId || r?.examName || '').trim() === selectedStatsExamId)
      : examResults;

    const statsMap: Record<number, {
      questionNumber: number;
      questionContent: string;
      type: string;
      total: number;
      correct: number;
      incorrect: number;
      unanswered: number;
    }> = {};

    filteredResults.forEach(res => {
      const detailed = getDetailedAnswersFromResult(res);
      detailed.forEach(qAns => {
        const qNum = qAns.questionNumber || qAns.questionIndex;
        if (!qNum) return;

        if (!statsMap[qNum]) {
          statsMap[qNum] = {
            questionNumber: qNum,
            questionContent: qAns.questionContent || qAns.questionText || '',
            type: qAns.type || 'mc',
            total: 0,
            correct: 0,
            incorrect: 0,
            unanswered: 0
          };
        }

        const stat = statsMap[qNum];
        stat.total += 1;
        if (qAns.type === 'essay') {
          if (qAns.hasAnswered) stat.correct += 1;
          else stat.unanswered += 1;
        } else {
          if (qAns.isCorrect) {
            stat.correct += 1;
          } else if (qAns.hasAnswered) {
            stat.incorrect += 1;
          } else {
            stat.unanswered += 1;
          }
        }
      });
    });

    return Object.values(statsMap).sort((a, b) => a.questionNumber - b.questionNumber);
  }, [examResults, selectedStatsExamId]);

  // Review & Grading state
  const [selectedResultForReview, setSelectedResultForReview] = useState<any | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong' | 'unanswered' | 'essay'>('all');
  const [essayGradingScore, setEssayGradingScore] = useState<string>('');
  const [teacherFeedback, setTeacherFeedback] = useState<string>('');
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [imageZoom, setImageZoom] = useState<number>(1);

  const handleExportCSV = () => {
    if (shuffledExams.length === 0) return;
    const csvContent = generateTNMakerCSV(shuffledExams as any[]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Dap_An_TNMaker_${(examName || 'De_Thi').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTNMakerExcel = () => {
    if (shuffledExams.length === 0) return;
    exportTNMakerExcelFile(shuffledExams as any[], examName);
  };

  const handlePrintBubbleSheet = (numQuestions: number = 40) => {
    const windowPrint = window.open('', '', 'width=900,height=650');
    if (!windowPrint) return;

    // Tính toán số cột: 40 câu -> 4 cột, 50 câu -> 5 cột, v.v.
    const numCols = Math.ceil(numQuestions / 10);
    let gridHtml = '';
    
    for (let col = 0; col < numCols; col++) {
      gridHtml += '<div style="flex: 1; min-width: 150px;">';
      for (let row = 1; row <= 10; row++) {
        const num = col * 10 + row;
        if (num > numQuestions) break; // Dừng nếu vượt quá số câu
        
        gridHtml += `
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span style="width: 35px; font-weight: bold; font-size: 13px;">${num.toString().padStart(numQuestions >= 100 ? 3 : 2, '0')}.</span>
            ${['A', 'B', 'C', 'D'].map(letter => `
              <div style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid #000; display: flex; align-items: center; justify-content: center; margin: 0 3px; font-size: 11px; font-weight: bold;">
                ${letter}
              </div>
            `).join('')}
          </div>
        `;
      }
      gridHtml += '</div>';
    }
    
    windowPrint.document.write(`
      <html>
        <head>
          <title>Phiếu Tô Trắc Nghiệm ${numQuestions} Câu</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; border: 1px solid #000; padding: 10px; border-radius: 8px; }
            .info-col { flex: 1; }
            .info-line { border-bottom: 1px dotted #000; display: inline-block; min-width: 150px; margin-left: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PHIẾU TRẢ LỜI TRẮC NGHIỆM (${numQuestions} câu)</div>
          </div>
          <div class="info-grid">
            <div class="info-col">
              <p style="margin: 5px 0;"><strong>Họ và tên:</strong> <span class="info-line"></span></p>
              <p style="margin: 5px 0;"><strong>Lớp:</strong> <span class="info-line"></span></p>
            </div>
            <div class="info-col">
              <p style="margin: 5px 0;"><strong>Môn thi:</strong> <span class="info-line"></span></p>
              <p style="margin: 5px 0;"><strong>Mã đề:</strong> <span class="info-line"></span></p>
            </div>
          </div>
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            ${gridHtml}
          </div>
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };

  // Helper để lấy danh sách chi tiết từng câu từ kết quả nộp bài
  function getDetailedAnswersFromResult(result: any): any[] {
    if (!result) return [];

    // Tìm nguồn dữ liệu chi tiết từng câu (từ detailedAnswers, details, detailed_answers, hoặc chiTiet)
    let rawList: any = null;
    if (result.detailedAnswers !== undefined && result.detailedAnswers !== null) {
      rawList = result.detailedAnswers;
    } else if (result.details !== undefined && result.details !== null) {
      rawList = result.details;
    } else if (result.detailed_answers !== undefined && result.detailed_answers !== null) {
      rawList = result.detailed_answers;
    } else if (result.chiTiet !== undefined && result.chiTiet !== null) {
      rawList = result.chiTiet;
    }

    // Xử lý parse an toàn nếu dữ liệu lưu dạng JSON chuỗi (ví dụ từ cột H của Google Sheets Webhook)
    let parsedList: any[] = [];
    if (Array.isArray(rawList)) {
      parsedList = rawList;
    } else if (typeof rawList === 'string' && rawList.trim().length > 0) {
      try {
        let parsed = JSON.parse(rawList);
        if (typeof parsed === 'string') {
          // Xử lý chuỗi JSON bị stringify 2 lần
          parsed = JSON.parse(parsed);
        }
        if (Array.isArray(parsed)) {
          parsedList = parsed;
        }
      } catch (e) {
        console.warn("Lỗi parse JSON detailedAnswers từ Google Sheet:", e);
      }
    }

    // Nếu đã có danh sách, chuẩn hóa đồng bộ 2 bộ key (questionIndex/Text/studentAnswer/correctAnswer và questionNumber/Content/studentChoice/correctChoice)
    if (parsedList.length > 0) {
      return parsedList.map((item: any, idx: number) => {
        const qNum = item.questionIndex || item.questionNumber || idx + 1;
        const qContent = item.questionText || item.questionContent || item.content || item.question || '';
        const sChoice = item.studentAnswer !== undefined 
          ? String(item.studentAnswer) 
          : (item.studentChoice !== undefined ? String(item.studentChoice) : 'Chưa làm');
        const cChoice = item.correctAnswer !== undefined 
          ? String(item.correctAnswer) 
          : (item.correctChoice !== undefined ? String(item.correctChoice) : '');

        const isCorr = typeof item.isCorrect === 'boolean' 
          ? item.isCorrect 
          : Boolean(sChoice && cChoice && sChoice.trim().toUpperCase() === cChoice.trim().toUpperCase());

        const hasAns = item.hasAnswered !== undefined 
          ? Boolean(item.hasAnswered) 
          : Boolean(sChoice && sChoice !== 'Chưa trả lời' && sChoice !== 'Chưa làm' && sChoice.trim() !== '');

        let type = String(item.type || '').toLowerCase();
        if (!type) {
          if (item.tfDetails || (item.tfStatements && item.tfStatements.length > 0)) type = 'tf';
          else if (item.essayImages?.length || item.essayText) type = 'essay';
          else if (item.options && item.options.length > 0) type = 'mc';
          else type = 'mc';
        }

        const expl = item.explanation || item.solution || '';

        return {
          ...item,
          questionIndex: qNum,
          questionNumber: qNum,
          questionText: qContent,
          questionContent: qContent,
          studentAnswer: sChoice,
          studentChoice: sChoice,
          correctAnswer: cChoice,
          correctChoice: cChoice,
          isCorrect: isCorr,
          hasAnswered: hasAns,
          type,
          options: item.options || [],
          explanation: expl,
          solution: expl,
          tfDetails: item.tfDetails,
          essayText: item.essayText || (type === 'essay' && !sChoice.startsWith('[Đã đính kèm') && sChoice !== 'Chưa làm' && sChoice !== 'Chưa trả lời' ? sChoice : ''),
          essayImages: Array.isArray(item.essayImages) ? item.essayImages : []
        };
      });
    }

    // Fallback 1: Trích xuất từ questionsSnapshot nếu có
    if (result.questionsSnapshot && Array.isArray(result.questionsSnapshot) && result.questionsSnapshot.length > 0) {
      return result.questionsSnapshot.map((q: any, idx: number) => {
        const typeStr = String(q.type || '').toLowerCase();
        const isMC = typeStr === 'mc' || typeStr === 'multiple_choice' || (!q.type && q.options);
        const isTF = typeStr === 'tf' || typeStr === 'true_false';
        const isSA = typeStr === 'sa' || typeStr === 'short_answer';
        const isEssay = typeStr === 'essay';

        if (isEssay) {
          return {
            questionIndex: q.index || idx + 1,
            questionNumber: q.index || idx + 1,
            type: 'essay',
            studentAnswer: q.studentAnswer || (q.studentImages?.length ? `[Đã đính kèm ${q.studentImages.length} ảnh]` : 'Chưa làm'),
            studentChoice: q.studentAnswer || (q.studentImages?.length ? `[Đã đính kèm ${q.studentImages.length} ảnh]` : 'Chưa làm'),
            correctAnswer: q.correctAnswer || q.explanation || 'Tự luận (GV chấm)',
            correctChoice: q.correctAnswer || q.explanation || 'Tự luận (GV chấm)',
            isCorrect: false,
            hasAnswered: Boolean((q.studentAnswer && String(q.studentAnswer).trim()) || (q.studentImages && q.studentImages.length > 0)),
            questionText: q.content,
            questionContent: q.content,
            essayText: q.studentAnswer,
            essayImages: q.studentImages || [],
            explanation: q.explanation,
            solution: q.explanation
          };
        }

        if (isTF) {
          const tfDetails = q.tfStatements?.map((stmt: any, sIdx: number) => {
            const sub = String.fromCharCode(97 + sIdx);
            const sAns = q.studentAnswer ? q.studentAnswer[sIdx] : undefined;
            const isTrue = stmt.correct === true || String(stmt.correct).toLowerCase() === 'true';
            return {
              sub,
              statement: stmt.statement || stmt.text || '',
              studentChoice: sAns === true ? 'Đúng' : sAns === false ? 'Sai' : 'Chưa chọn',
              correctChoice: isTrue ? 'Đúng' : 'Sai',
              isCorrect: sAns !== undefined && sAns === isTrue,
              hasAnswered: sAns !== undefined
            };
          }) || [];
          const isAllCorrect = tfDetails.length > 0 && tfDetails.every((t: any) => t.isCorrect);
          const hasAny = tfDetails.some((t: any) => t.hasAnswered);
          const studentChoiceStr = tfDetails.map((t: any) => `${t.sub}:${t.studentChoice === 'Đúng' ? 'Đ' : t.studentChoice === 'Sai' ? 'S' : '-'}`).join(' ');
          const correctChoiceStr = tfDetails.map((t: any) => `${t.sub}:${t.correctChoice === 'Đúng' ? 'Đ' : 'S'}`).join(' ');

          return {
            questionIndex: q.index || idx + 1,
            questionNumber: q.index || idx + 1,
            type: 'tf',
            studentAnswer: hasAny ? studentChoiceStr : 'Chưa làm',
            studentChoice: hasAny ? studentChoiceStr : 'Chưa làm',
            correctAnswer: correctChoiceStr,
            correctChoice: correctChoiceStr,
            isCorrect: isAllCorrect,
            hasAnswered: hasAny,
            questionText: q.content,
            questionContent: q.content,
            tfDetails,
            explanation: q.explanation,
            solution: q.explanation
          };
        }

        if (isSA) {
          const studentAns = String(q.studentAnswer || '').trim();
          const correctAns = String(q.correctAnswer || '').trim();
          const isCorrect = Boolean(correctAns && compareShortAnswers(studentAns, correctAns));
          return {
            questionIndex: q.index || idx + 1,
            questionNumber: q.index || idx + 1,
            type: 'sa',
            studentAnswer: studentAns || 'Chưa làm',
            studentChoice: studentAns || 'Chưa làm',
            correctAnswer: correctAns,
            correctChoice: correctAns,
            isCorrect,
            hasAnswered: studentAns.length > 0,
            questionText: q.content,
            questionContent: q.content,
            explanation: q.explanation,
            solution: q.explanation
          };
        }

        // MC mặc định
        const optLetter = (q.studentAnswer !== undefined && q.studentAnswer >= 0 && q.studentAnswer <= 3) ? String.fromCharCode(65 + q.studentAnswer) : '';
        const corrLetter = (q.correctOptionIndex !== undefined && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3) ? String.fromCharCode(65 + q.correctOptionIndex) : '';
        const isCorrect = q.studentAnswer !== undefined && q.studentAnswer === q.correctOptionIndex;
        return {
          questionIndex: q.index || idx + 1,
          questionNumber: q.index || idx + 1,
          type: 'mc',
          studentAnswer: optLetter || 'Chưa làm',
          studentChoice: optLetter || 'Chưa làm',
          correctAnswer: corrLetter,
          correctChoice: corrLetter,
          isCorrect,
          hasAnswered: q.studentAnswer !== undefined,
          questionText: q.content,
          questionContent: q.content,
          options: q.options || [],
          explanation: q.explanation,
          solution: q.explanation
        };
      });
    }

    // Fallback 2: Trích xuất từ answers object
    if (result.answers && typeof result.answers === 'object') {
      const list: any[] = [];
      const keys = Object.keys(result.answers);
      keys.forEach((k, idx) => {
        const qNum = parseInt(k, 10) + 1 || idx + 1;
        const ans = result.answers[k];
        const choice = typeof ans === 'number' && ans >= 0 && ans <= 3 ? String.fromCharCode(65 + ans) : String(ans || 'Chưa làm');
        list.push({
          questionIndex: qNum,
          questionNumber: qNum,
          type: 'mc',
          studentAnswer: choice,
          studentChoice: choice,
          correctAnswer: '',
          correctChoice: '',
          isCorrect: false,
          hasAnswered: ans !== undefined,
          questionText: `Câu ${qNum}`,
          questionContent: `Câu ${qNum}`
        });
      });
      return list;
    }

    return [];
  };

  const openReviewModal = (result: any) => {
    setSelectedResultForReview(result);
    setReviewFilter('all');
    setEssayGradingScore(result.essayScore !== undefined ? String(result.essayScore) : '');
    setTeacherFeedback(result.teacherFeedback || '');
  };

  const handleSaveGrading = () => {
    if (!selectedResultForReview) return;
    const numScore = essayGradingScore.trim() === '' ? undefined : Number(essayGradingScore);
    const updated = {
      ...selectedResultForReview,
      essayScore: numScore,
      teacherFeedback: teacherFeedback.trim(),
      isGraded: true,
      gradedAt: new Date().toISOString()
    };
    setSelectedResultForReview(updated);

    // Update in examResults
    const newResults = examResults.map((item: any) => {
      const match = (item === selectedResultForReview) ||
        (item.id && selectedResultForReview.id && item.id === selectedResultForReview.id) ||
        (item.studentName === selectedResultForReview.studentName && String(item.examId) === String(selectedResultForReview.examId) && (item.timestamp === selectedResultForReview.timestamp || item.submittedAt === selectedResultForReview.submittedAt));
      return match ? updated : item;
    });
    setExamResults(newResults);

    // Save to localStorage
    try {
      const local = JSON.parse(localStorage.getItem('eduplan_exam_results') || '[]');
      let found = false;
      const localUpdated = local.map((item: any) => {
        const match = (item.id && selectedResultForReview.id && item.id === selectedResultForReview.id) ||
          (item.studentName === selectedResultForReview.studentName && String(item.examId) === String(selectedResultForReview.examId));
        if (match) {
          found = true;
          return { ...item, essayScore: numScore, teacherFeedback: teacherFeedback.trim(), isGraded: true, gradedAt: new Date().toISOString() };
        }
        return item;
      });
      if (!found) {
        localUpdated.push(updated);
      }
      localStorage.setItem('eduplan_exam_results', JSON.stringify(localUpdated));
    } catch (e) {
      console.warn("Lỗi lưu điểm tự luận:", e);
    }

    setToastMessage(`Đã lưu điểm và nhận xét cho bài làm của ${selectedResultForReview.studentName || 'học sinh'}!`);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const fetchResults = async () => {
    setResultsLoading(true);
    let local: any[] = [];
    // 1. Đọc localStorage dự phòng trước
    try {
      local = JSON.parse(localStorage.getItem('eduplan_exam_results') || '[]');
      if (Array.isArray(local) && local.length > 0) {
        local.sort((a: any, b: any) => new Date(b.submittedAt || b.timestamp || 0).getTime() - new Date(a.submittedAt || a.timestamp || 0).getTime());
        setExamResults(local);
      }
    } catch (e) {
      console.warn("Lỗi đọc local results:", e);
    }

    // 2. Gọi API lấy dữ liệu thực tế từ Google Sheet Webhook và hợp nhất
    try {
      const res = await fetch(SYSTEM_EXAM_WEBHOOK);
      if (res.ok) {
        const cloudData = await res.json();
        if (Array.isArray(cloudData) && cloudData.length > 0) {
          const merged = [...local];
          cloudData.forEach((cloudItem: any) => {
            if (!cloudItem || typeof cloudItem !== 'object') return;
            const cName = String(cloudItem.studentName ?? '').trim().toLowerCase();
            const cExamId = String(cloudItem.examId ?? '');
            const cId = cloudItem.id ? String(cloudItem.id) : '';

            const index = merged.findIndex((m: any) => {
              if (!m) return false;
              const mName = String(m.studentName ?? '').trim().toLowerCase();
              const mExamId = String(m.examId ?? '');
              const mId = m.id ? String(m.id) : '';

              return (
                (mName && cName && mName === cName && mExamId && cExamId && mExamId === cExamId) ||
                (mId && cId && mId === cId)
              );
            });
            if (index === -1) {
              merged.push(cloudItem);
            } else {
              merged[index] = {
                ...cloudItem,
                ...merged[index],
                timestamp: cloudItem.timestamp || merged[index].timestamp || (merged[index].submittedAt ? new Date(merged[index].submittedAt).toLocaleString('vi-VN') : ''),
                details: cloudItem.details || merged[index].details,
                detailedAnswers: cloudItem.detailedAnswers || merged[index].detailedAnswers || cloudItem.details || merged[index].details,
                essayImages: cloudItem.essayImages || merged[index].essayImages
              };
            }
          });
          setExamResults(merged);
        }
      }
    } catch (error) {
      console.error("Lỗi tải kết quả từ máy chủ:", error);
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    if (activeTab === 'results') {
      fetchResults();
    }
  }, [activeTab]);

  const exportResultsToExcel = () => {
    if (!examResults || examResults.length === 0) {
      setToastMessage("Chưa có lượt nộp bài nào để xuất file!");
      return;
    }

    try {
      // Xác định số lượng câu hỏi tối đa để tạo các cột C1, C2... CN
      let maxQ = 0;
      examResults.forEach((res: any) => {
        const list = getDetailedAnswersFromResult(res);
        if (list.length > maxQ) maxQ = list.length;
        if (res.totalQuestions && res.totalQuestions > maxQ) maxQ = res.totalQuestions;
      });
      if (maxQ === 0 && questions && questions.length > 0) {
        maxQ = questions.length;
      }
      if (maxQ === 0) maxQ = 10;

      const dataToExport = examResults.map((res: any, index: number) => {
        const timeFormatted = typeof res.timeSpent === 'number'
          ? `${Math.floor(res.timeSpent / 60)} phút ${res.timeSpent % 60} giây`
          : (res.timeSpent || '');

        const timeSubmitted = res.timestamp || (res.submittedAt ? new Date(res.submittedAt).toLocaleString('vi-VN') : '');
        const examCode = res.examId || res.examName || "Đề thi Online";
        const correctCount = res.details 
          ? res.details 
          : (res.correct !== undefined ? `${res.correct}` : '');

        const row: Record<string, any> = {
          "STT": index + 1,
          "Mã đề": examCode,
          "Thời gian nộp": timeSubmitted,
          "Họ và tên": res.studentName || "Học sinh ẩn danh",
          "Lớp": res.className || res.studentClass || "",
          "Điểm số": res.score !== undefined ? Number(res.score) : 0,
          "Số câu đúng": correctCount,
          "Thời gian làm bài": timeFormatted
        };

        // Bổ sung các cột C1 đến CN ghi nhận đáp án học sinh chọn kèm đánh dấu (Đ/S)
        const detailed = getDetailedAnswersFromResult(res);
        for (let qNum = 1; qNum <= maxQ; qNum++) {
          const item = detailed.find((d: any) => d.questionNumber === qNum) || detailed[qNum - 1];
          const colKey = `C${qNum}`;
          if (!item) {
            row[colKey] = "-";
            continue;
          }

          const type = String(item.type || '').toLowerCase();
          if (type === 'essay') {
            if (res.essayScore !== undefined) {
              row[colKey] = `TL (${res.essayScore}đ)`;
            } else {
              row[colKey] = item.hasAnswered ? 'TL (Đã nộp)' : 'TL (Chưa nộp)';
            }
          } else if (type === 'mc') {
            if (item.hasAnswered === false || !item.studentChoice || item.studentChoice === 'Chưa làm') {
              row[colKey] = "- (Chưa làm)";
            } else {
              row[colKey] = `${item.studentChoice} (${item.isCorrect ? 'Đ' : 'S'})`;
            }
          } else if (type === 'tf') {
            if (item.hasAnswered === false || !item.studentChoice || item.studentChoice === 'Chưa làm') {
              row[colKey] = "- (Chưa làm)";
            } else {
              row[colKey] = `${item.studentChoice} (${item.isCorrect ? 'Đ' : 'S'})`;
            }
          } else if (type === 'sa') {
            if (item.hasAnswered === false || !item.studentChoice || item.studentChoice === 'Chưa làm') {
              row[colKey] = "- (Chưa làm)";
            } else {
              row[colKey] = `${item.studentChoice} (${item.isCorrect ? 'Đ' : 'S'})`;
            }
          } else {
            row[colKey] = item.studentChoice ? `${item.studentChoice} (${item.isCorrect ? 'Đ' : 'S'})` : "-";
          }
        }

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      const colWidths = [
        { wch: 6 },  // STT
        { wch: 16 }, // Mã đề
        { wch: 22 }, // Thời gian nộp
        { wch: 26 }, // Họ và tên
        { wch: 12 }, // Lớp
        { wch: 10 }, // Điểm số
        { wch: 14 }, // Số câu đúng
        { wch: 20 }  // Thời gian làm bài
      ];
      for (let i = 1; i <= maxQ; i++) {
        colWidths.push({ wch: 14 }); // Cột C1...CN
      }
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bảng điểm chi tiết");

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${pad(now.getDate())}_${pad(now.getMonth() + 1)}_${now.getFullYear()}`;
      const fileName = `Bang_Diem_Chi_Tiet_${dateStr}.xlsx`;

      try {
        XLSX.writeFile(workbook, fileName);
      } catch (errWrite) {
        // Fallback UTF-8 BOM CSV
        const csvContent = "\uFEFF" + XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Bang_Diem_Chi_Tiet_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setToastMessage("Đã xuất file Excel bảng điểm chi tiết thành công!");
    } catch (err: any) {
      console.error("Lỗi xuất Excel:", err);
      alert("Đã xảy ra lỗi khi tạo file Excel: " + (err?.message || ""));
    }
  };
  const [subject, setSubject] = useState("Toán học");
  const [grade, setGrade] = useState("10");
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [matrix, setMatrix] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [duration, setDuration] = useState(45);
  const [examType, setExamType] = useState<string>("Đề kiểm tra giữa kỳ 1");
  const [isOnlineConfigModalOpen, setIsOnlineConfigModalOpen] = useState(false);
  const [selectedStatsPin, setSelectedStatsPin] = useState<string>("");
  const [qCounts, setQCounts] = useState({ mc: 12, tf: 4, sa: 6, essay: 0 });
  const [schoolLevel, setSchoolLevel] = useState<string>("THPT");
  const [parameterOption, setParameterOption] = useState<ParameterOption>("auto");
  const [generateMode, setGenerateMode] = useState<"auto" | "from_matrix_file">("auto");
  const [autoDetectStructure, setAutoDetectStructure] = useState(false);

  // Header information (Trường học, Giáo viên, Năm học 2026-2027...)
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(() => getHeaderConfig());
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);

  const handleSaveHeaderConfig = (newCfg: HeaderConfig) => {
    setHeaderConfig(newCfg);
    saveHeaderConfig(newCfg);
  };

  const handleSchoolLevelChange = (lvl: string) => {
    setSchoolLevel(lvl);
    const availableGrades = GRADES_BY_LEVEL[lvl] || [];
    const isGradeValid = availableGrades.some(g => g.value === grade);
    const newGrade = isGradeValid ? grade : (availableGrades[0]?.value || "10");
    setGrade(newGrade);

    const availableSubjects = SUBJECTS_BY_LEVEL[lvl] || [];
    const isSubjValid = availableSubjects.includes(subject);
    const newSubj = isSubjValid ? subject : (availableSubjects[0] || "Toán học");
    setSubject(newSubj);

    const newDur = getDefaultDurationForExamType(examType, lvl, newGrade, newSubj);
    setDuration(newDur);
    if (!examName || examName === "Đề kiểm tra" || examName.startsWith("ĐỀ ")) {
      setExamName(formatExamTitle(examType, newSubj, newGrade));
    }
  };

  const handleGradeChange = (gr: string) => {
    setGrade(gr);
    const newDur = getDefaultDurationForExamType(examType, schoolLevel, gr, subject);
    setDuration(newDur);
    if (!examName || examName === "Đề kiểm tra" || examName.startsWith("ĐỀ ")) {
      setExamName(formatExamTitle(examType, subject, gr));
    }
  };

  const handleSubjectChange = (subj: string) => {
    setSubject(subj);
    const newDur = getDefaultDurationForExamType(examType, schoolLevel, grade, subj);
    setDuration(newDur);
    if (!examName || examName === "Đề kiểm tra" || examName.startsWith("ĐỀ ")) {
      setExamName(formatExamTitle(examType, subj, grade));
    }
  };

  const handleExamTypeChange = (newType: string) => {
    setExamType(newType);
    const newDur = getDefaultDurationForExamType(newType, schoolLevel, grade, subject);
    setDuration(newDur);
    if (!examName || examName === "Đề kiểm tra" || examName.startsWith("ĐỀ ")) {
      setExamName(formatExamTitle(newType, subject, grade));
    }
  };
  const [bankQuestions, setBankQuestions] = useState<Question[]>(() => {
    try {
      const saved = localStorage.getItem('question_banks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const saveToBank = (q: Question) => {
    const updated = [...bankQuestions, {...q, id: Date.now()}];
    setBankQuestions(updated);
    localStorage.setItem('question_banks', JSON.stringify(updated));
    alert("Đã lưu vào ngân hàng câu hỏi!");
  };
  
  const deleteFromBank = (id: number) => {
    const updated = bankQuestions.filter(q => q.id !== id);
    setBankQuestions(updated);
    localStorage.setItem('question_banks', JSON.stringify(updated));
  };
  
  const [bankFilterTopic, setBankFilterTopic] = useState("");
  const [bankFilterLevel, setBankFilterLevel] = useState("");

  const [qPoints, setQPoints] = useState({ mc: "0.25", tf: "0.5", sa: "0.5", essay: "2" });

  const calculatePoints = (ptStr: string | number, count: number) => {
    const str = String(ptStr).trim();
    if (!str.includes(',')) {
      const val = Number(str) || 0;
      return { total: val * count, average: val };
    }
    const parts = str.split(',').map(s => Number(s.trim()) || 0);
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += parts[i] !== undefined ? parts[i] : (parts[parts.length-1] || 0);
    }
    return { total, average: count > 0 ? total / count : 0 };
  };
  const [qEnabled, setQEnabled] = useState({ mc: true, tf: true, sa: true, essay: true });
  const [levels, setLevels] = useState({ nb: 40, th: 30, vd: 20, vdc: 10 });
  const [outputConfig, setOutputConfig] = useState({
    answers: true,
    matrix: true,
    spec: true,
    shuffleQuestions: true,
    shuffleOptions: true,
    groupBySection: true,
    detailedSolution: true
  });
  const [showAnswerMatrix, setShowAnswerMatrix] = useState(true);
  
  // Tùy chọn Ưu tiên câu hỏi bối cảnh thực tế (Chuẩn GDPT 2018)
  const [enableRealWorld, setEnableRealWorld] = useState<boolean>(true);
  const [realWorldLevel, setRealWorldLevel] = useState<"standard" | "high" | "max">("standard");
  
  const [savedConfigs, setSavedConfigs] = useState<MatrixConfig[]>(() => {
    try {
      const saved = localStorage.getItem('matrix_configs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const saveCurrentConfig = () => {
    const name = prompt("Nhập tên để lưu cấu hình ma trận này (ví dụ: Giữa kì 1 Toán 9):");
    if (!name) return;
    const newConfig: MatrixConfig = {
      id: Date.now().toString(),
      name,
      schoolLevel, subject, grade, duration, examType, numCodes,
      parameterOption,
      qCounts, qPoints, qEnabled, levels, outputConfig, matrix, customPrompt,
      realWorldConfig: {
        enabled: enableRealWorld,
        level: realWorldLevel
      },
      timestamp: Date.now()
    };
    const updated = [...savedConfigs, newConfig];
    setSavedConfigs(updated);
    localStorage.setItem('matrix_configs', JSON.stringify(updated));
    alert("Đã lưu cấu hình ma trận!");
  };

  const loadConfig = (id: string) => {
    if (!id) return;
    const conf = savedConfigs.find(c => c.id === id);
    if (conf) {
      setSchoolLevel(conf.schoolLevel);
      setSubject(conf.subject);
      setGrade(conf.grade);
      setDuration(conf.duration || getDefaultDurationForExamType(conf.examType, conf.schoolLevel, conf.grade, conf.subject));
      setExamType(normalizeExamType(conf.examType));
      if (!examName || examName === "Đề kiểm tra" || examName.startsWith("ĐỀ ")) {
        setExamName(formatExamTitle(conf.examType, conf.subject, conf.grade));
      }
      if (conf.parameterOption) {
        setParameterOption(conf.parameterOption);
      }
      setNumCodes(conf.numCodes);
      setQCounts(conf.qCounts);
      setQPoints(conf.qPoints);
      setQEnabled(conf.qEnabled);
      setLevels(conf.levels);
      setOutputConfig(conf.outputConfig);
      if (conf.realWorldConfig) {
        setEnableRealWorld(conf.realWorldConfig.enabled !== false);
        setRealWorldLevel(conf.realWorldConfig.level || "standard");
      }
      setMatrix(conf.matrix);
      setCustomPrompt(conf.customPrompt);
    }
  };

  const deleteConfig = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa cấu hình này?")) {
      const updated = savedConfigs.filter(c => c.id !== id);
      setSavedConfigs(updated);
      localStorage.setItem('matrix_configs', JSON.stringify(updated));
    }
  };

  
  const totalQuestionsCalc = (qEnabled.mc ? qCounts.mc : 0) + (qEnabled.tf ? qCounts.tf : 0) + (qEnabled.sa ? qCounts.sa : 0) + (qEnabled.essay ? qCounts.essay : 0);
  const ptMC = calculatePoints(qPoints.mc, qCounts.mc);
  const ptTF = calculatePoints(qPoints.tf, qCounts.tf);
  const ptSA = calculatePoints(qPoints.sa, qCounts.sa);
  const ptES = calculatePoints(qPoints.essay, qCounts.essay);
  const totalPointsCalc = (qEnabled.mc ? ptMC.total : 0) + (qEnabled.tf ? ptTF.total : 0) + (qEnabled.sa ? ptSA.total : 0) + (qEnabled.essay ? ptES.total : 0);

  const [matrixFile, setMatrixFile] = useState<File | null>(null);
  const [matrixBase64, setMatrixBase64] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [showSimilarExamsModal, setShowSimilarExamsModal] = useState(false);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMatrixFile(file);
      const isXls = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      const reader = new FileReader();
      reader.onloadend = () => {
        setMatrixBase64(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Nếu là tệp Excel, tự động đọc trước các Sheet để trích xuất ma trận
      if (isXls) {
        try {
          const ab = await file.arrayBuffer();
          const wb = XLSX.read(ab, { type: 'array' });
          let extractedSheets = '';
          wb.SheetNames.forEach(sheetName => {
            const sheet = wb.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            if (csv && csv.trim()) {
              extractedSheets += `\n[Sheet: ${sheetName}]\n${csv.trim()}\n`;
            }
          });
          if (extractedSheets) {
            setMatrix(prev => (prev ? `${prev}\n\n` : '') + `Ma trận từ file Excel:\n${extractedSheets}`);
          }
        } catch (xlsErr) {
          console.error("Lỗi đọc file Excel ma trận:", xlsErr);
        }
      }
    }
  };
  
  const availableTopics = subject.toLowerCase().includes("toán") ? fullPlan.filter(p => p.grade.toString() === grade).map(p => p.lesson) : [];

const [examName, setExamName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const [expandedSolutionIds, setExpandedSolutionIds] = useState<Record<number, boolean>>({});
  const [solutionDisplayMode, setSolutionDisplayMode] = useState<"none" | "under_question" | "appendix">("appendix");
  const [showWordEquationModal, setShowWordEquationModal] = useState(false);

  const toggleSolution = (qId: number) => {
    setExpandedSolutionIds(prev => ({
      ...prev,
      [qId]: !(prev[qId] ?? showAllSolutions)
    }));
  };
  const isSolutionOpen = (qId: number) => expandedSolutionIds[qId] ?? showAllSolutions;
  const toggleAllSolutions = () => {
    const next = !showAllSolutions;
    setShowAllSolutions(next);
    setExpandedSolutionIds({});
  };

  const sanitizeTopicOrSubtopic = (val: string, content: string = ""): string => {
    if (!val) return "Chủ đề trọng tâm";
    let cleaned = val.trim();
    
    // Remove starting prefix like "Phần I:", "Phần II:", "Phần III:", "Phần IV:", "Phần 1:", etc.
    cleaned = cleaned.replace(/^(?:Phần\s*(?:[IVX1-4]+|\d+)\s*[:\-\.]\s*)/gi, "");
    
    const lower = cleaned.toLowerCase();
    
    // If it contains non-math structural terms or section names, let's deduce a professional math topic from the question content!
    if (
      lower.includes("đúng sai") || 
      lower.includes("trắc nghiệm") || 
      lower.includes("trả lời ngắn") || 
      lower.includes("tự luận") ||
      lower.includes("phương án") ||
      lower.includes("phần i") ||
      lower.includes("phần ii") ||
      lower.includes("phần iii") ||
      lower.includes("phần iv") ||
      lower === "chung" ||
      lower === "chủ đề trọng tâm" ||
      lower === "nội dung kiến thức" ||
      lower.length < 3
    ) {
      // Deduce from content!
      const text = content.toLowerCase();
      if (text.includes("tiệm cận") || text.includes("đường tiệm cận")) {
        return "Đường tiệm cận của đồ thị hàm số";
      }
      if (text.includes("đồng biến") || text.includes("nghịch biến") || text.includes("khoảng đơn điệu") || text.includes("đơn điệu")) {
        return "Tính đơn điệu của hàm số";
      }
      if (text.includes("cực đại") || text.includes("cực tiểu") || text.includes("cực trị") || text.includes("điểm cực trị")) {
        return "Cực trị của hàm số";
      }
      if (text.includes("giá trị lớn nhất") || text.includes("giá trị nhỏ nhất") || text.includes("gtln") || text.includes("gtnn")) {
        return "Giá trị lớn nhất và nhỏ nhất của hàm số";
      }
      if (text.includes("khảo sát") || text.includes("vẽ đồ thị") || text.includes("nhận dạng đồ thị")) {
        return "Khảo sát và vẽ đồ thị hàm số";
      }
      if (text.includes("đạo hàm") || text.includes("vi phân")) {
        return "Đạo hàm và ứng dụng";
      }
      if (text.includes("hàm số") || text.includes("biến thiên")) {
        return "Khảo sát sự biến thiên của hàm số";
      }
      if (text.includes("mũ") || text.includes("lũy thừa")) {
        return "Hàm số mũ và lũy thừa";
      }
      if (text.includes("logarith") || text.includes("logarit") || text.includes("log")) {
        return "Hàm số lôgarit và phương trình logarit";
      }
      if (text.includes("tích phân") || text.includes("nguyên hàm")) {
        return "Nguyên hàm và tích phân";
      }
      if (text.includes("tọa độ") || text.includes("oxyz") || text.includes("mặt cầu") || text.includes("mặt phẳng") || text.includes("đường thẳng trong không gian")) {
        return "Phương pháp tọa độ trong không gian (Oxyz)";
      }
      if (text.includes("lượng giác") || text.includes("sin") || text.includes("cos") || text.includes("tan") || text.includes("cot")) {
        return "Lượng giác và phương trình lượng giác";
      }
      if (text.includes("dãy số") || text.includes("cấp số cộng") || text.includes("cấp số nhân")) {
        return "Dãy số. Cấp số cộng và cấp số nhân";
      }
      if (text.includes("xác suất") || text.includes("phương sai") || text.includes("độ lệch chuẩn") || text.includes("khoảng biến thiên") || text.includes("tứ phân vị")) {
        return "Xác suất và Thống kê";
      }
      if (text.includes("tổ hợp") || text.includes("chỉnh hợp") || text.includes("hoán vị") || text.includes("nhị thức")) {
        return "Tổ hợp và nhị thức Newton";
      }
      if (text.includes("mệnh đề") || text.includes("tập hợp")) {
        return "Mệnh đề và tập hợp";
      }
      if (text.includes("vectơ") || text.includes("vector") || text.includes("tích vô hướng")) {
        return "Vectơ và các phép toán";
      }
      if (text.includes("hình chóp") || text.includes("hình lăng trụ") || text.includes("thể tích") || text.includes("hình hộp") || text.includes("nón") || text.includes("trụ") || text.includes("cầu")) {
        return "Hình học không gian và thể tích";
      }
      if (text.includes("conic") || text.includes("elip") || text.includes("hyperbol") || text.includes("parabol")) {
        return "Phương pháp tọa độ phẳng và các đường Conic";
      }
      return "Chủ đề Toán học tổng hợp";
    }
    
    return cleaned;
  };

  const [matrixStructure, setMatrixStructure] = useState<{topic: string, subtopics: string[]}[]>([]);
  const [draggedTopicIdx, setDraggedTopicIdx] = useState<number | null>(null);
  const [draggedSubtopic, setDraggedSubtopic] = useState<{tIdx: number, sIdx: number} | null>(null);

  useEffect(() => {
     if (questions.length === 0) return;

     // On-the-fly clean up topics and subtopics inside the questions list to purge non-math terminology
     let changed = false;
     const cleanedQuestions = questions.map(q => {
       const cleanT = sanitizeTopicOrSubtopic(q.topic || "", q.content || "");
       const cleanSub = sanitizeTopicOrSubtopic(q.subtopic || "", q.content || "");
       const finalSub = cleanSub === cleanT ? "Ứng dụng và bài tập liên quan" : cleanSub;
       if (q.topic !== cleanT || q.subtopic !== finalSub) {
         changed = true;
         return { ...q, topic: cleanT, subtopic: finalSub };
       }
       return q;
     });
     
     if (changed) {
       setQuestions(cleanedQuestions);
       return;
     }

     const structure: {topic: string, subtopics: string[]}[] = [];
     const topics = Array.from(new Set(questions.map(q => q.topic || 'Chủ đề trọng tâm')));
     for (const t of topics) {
         const subs = Array.from(new Set(questions.filter(q => (q.topic || 'Chủ đề trọng tâm') === t).map(q => q.subtopic || 'Nội dung kiến thức')));
         structure.push({ topic: t, subtopics: subs });
     }
     setMatrixStructure(structure);
  }, [questions]);
  const [shuffledExams, setShuffledExams] = useState<{code: string, questions: Question[]}[]>([]);
  const [numCodes, setNumCodes] = useState(4);
  const [startCode, setStartCode] = useState<number>(1001);
  const [editingExamQuestion, setEditingExamQuestion] = useState<{ question: Question; index: number } | null>(null);
  const [isExamVisualizerOpen, setIsExamVisualizerOpen] = useState(false);
  const [examVisualizerTab, setExamVisualizerTab] = useState<"bbt" | "graph" | "geometry3d" | "statistics">("bbt");
  const [examVisualizerTargetQ, setExamVisualizerTargetQ] = useState<number>(1);
  const [activeVisualizer, setActiveVisualizer] = useState<{
    qIndex: number;
    tab: "bbt" | "graph" | "geometry3d" | "statistics";
    target: "content" | "solution";
  } | null>(null);

  const handleInsertVisualizerSnippet = (qIndex: number, target: "content" | "solution", snippet: string) => {
    setQuestions(prev => {
      const next = [...prev];
      const item = { ...next[qIndex] };
      if (target === "content") {
        item.content = (item.content || "") + snippet;
      } else {
        const cur = item.solution || item.explanation || "";
        item.solution = cur ? `${cur}\n\n${snippet}` : snippet;
        item.explanation = item.solution;
      }
      next[qIndex] = item;
      return next;
    });
  };

  const isMissingBbt = (content?: string): boolean => {
    if (!content) return false;
    const mentionsBbt = /(bảng\s*biến\s*thiên|BBT|bbt|dấu\s*của\s*f'\(x\)|chiều\s*biến\s*thiên|khảo\s*sát\s*sự\s*biến\s*thiên)/i.test(content);
    const hasTable = /\|[^\n]+\|[^\n]+\|/.test(content);
    const hasImgOrSvg = /<(?:img|svg|svg-wrapper)/i.test(content) || /!\[.*?\]\(.*?\)/.test(content);
    return mentionsBbt && !hasTable && !hasImgOrSvg;
  };

  const isMissingGraph = (content?: string): boolean => {
    if (!content) return false;
    const mentionsGraph = /(đồ\s*thị|hình\s*bên|hình\s*vẽ|như\s*hình)/i.test(content);
    const hasImgOrSvg = /<(?:img|svg|svg-wrapper)/i.test(content) || /!\[.*?\]\(.*?\)/.test(content);
    return mentionsGraph && !hasImgOrSvg;
  };

  const handleSaveEditedExamQuestion = (updated: any) => {
    if (!editingExamQuestion) return;
    const newQs = [...questions];
    newQs[editingExamQuestion.index] = { ...newQs[editingExamQuestion.index], ...updated };
    setQuestions(newQs);
  };

  const handleAiFixBbtForExamQuestion = async (q: Question, idx: number) => {
    try {
      // 1. Thử nhận diện hàm số từ đề bài để tạo BBT chuẩn xác 100% trong 0ms
      const content = q.content || (q as any).question || '';
      const formulaMatch = content.match(/(?:y|f\(x\))\s*=\s*([^,;.\n$]+)/i) || 
                           content.match(/hàm\s*số\s*(?:\$)?(?:y\s*=\s*)?([^,;.\n$]+)/i);
      if (formulaMatch) {
        const formula = formulaMatch[1].trim();
        const bbtData = analyzeFunctionToBbt(formula);
        if (bbtData) {
          const svg = generateBbtSvg(bbtData);
          if (svg) {
            const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : '';
            if (base64) {
              const snippet = `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
              const newQs = [...questions];
              newQs[idx] = { ...newQs[idx], content: (newQs[idx].content || '') + snippet };
              setQuestions(newQs);
              return;
            }
          }
        }
      }

      // 2. Gọi API fix-question nếu không phân tích trực tiếp được
      const res = await apiFetch('/api/fix-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, mode: 'fix_bbt', subject, grade })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.question) {
          const formattedContent = embedBbtSvgsInText(embedTikzSvgsInText(data.question.content || ''));
          const newQs = [...questions];
          newQs[idx] = { ...newQs[idx], ...data.question, content: formattedContent };
          setQuestions(newQs);
          return;
        }
      }
    } catch (e) {
      console.warn("AI fix BBT error:", e);
    }
    const fallbackBbt = `| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |\n|---|---|---|---|---|---|---|---|\n| $y'$ | | $+$ | $0$ | $-$ | $0$ | $+$ |\n| $y$ | $-\\infty$ | $\\nearrow$ | $3$ | $\\searrow$ | $-1$ | $\\nearrow$ | $+\\infty$ |`;
    const fallbackSvg = convertBbtTableToSvg(fallbackBbt);
    const base64 = fallbackSvg && typeof btoa !== 'undefined' ? btoa(encodeURIComponent(fallbackSvg)) : '';
    const snippet = base64 ? `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n` : `\n\n${fallbackBbt}\n\n`;
    const newQs = [...questions];
    newQs[idx] = { ...newQs[idx], content: (newQs[idx].content || '') + snippet };
    setQuestions(newQs);
  };

  const handleAutoGenerateGraphForExamQuestion = (q: Question, idx: number) => {
    setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" });
  };

  const handleAutoGenerateAllBbtAndGraphs = () => {
    let count = 0;
    const updated = questions.map((q) => {
      let content = q.content || (q as any).question || '';
      let solution = q.solution || q.explanation || '';
      const newContent = embedBbtSvgsInText(embedTikzSvgsInText(content));
      const newSolution = embedBbtSvgsInText(embedTikzSvgsInText(solution));
      if (newContent !== content || newSolution !== solution) {
        count++;
      }
      return {
        ...q,
        content: newContent,
        solution: newSolution,
        explanation: newSolution
      };
    });
    setQuestions(updated);
    alert(`✨ Đã quét và tự động chuyển đổi toàn bộ BBT & Đồ thị sang dạng ảnh SVG chuẩn SGK (${count} câu được cập nhật)!`);
  };

  const handleAiRegenerateExamQuestion = async (q: Question, idx: number) => {
    try {
      const res = await apiFetch('/api/fix-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, mode: 'regenerate', subject, grade })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.question) {
          const newQs = [...questions];
          newQs[idx] = { ...newQs[idx], ...data.question };
          setQuestions(newQs);
        }
      }
    } catch (e) {
      console.warn("AI regenerate error:", e);
    }
  };

  const handleAiReplaceExamQuestion = async (q: Question, idx: number) => {
    try {
      const res = await apiFetch('/api/fix-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, mode: 'replace_similar', subject, grade })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.question) {
          const newQs = [...questions];
          newQs[idx] = { ...newQs[idx], ...data.question };
          setQuestions(newQs);
        }
      }
    } catch (e) {
      console.warn("AI replace error:", e);
    }
  };
  const [shareLink, setShareLink] = useState("");
  const [sharePin, setSharePin] = useState("");
  const [showBubbleSheetModal, setShowBubbleSheetModal] = useState(false);
  const [showTeacherUploadModal, setShowTeacherUploadModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showImportTextModal, setShowImportTextModal] = useState(false);
  const [importRawText, setImportRawText] = useState("");
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<"mc" | "tf" | "sa" | "essay">("mc");
  const [newQuestionContent, setNewQuestionContent] = useState("");
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>(["", "", "", ""]);
  const [newQuestionCorrectIndex, setNewQuestionCorrectIndex] = useState(0);
  const [newQuestionAnswer, setNewQuestionAnswer] = useState("");
  const [newQuestionExplanation, setNewQuestionExplanation] = useState("");
  const [newQuestionLevel, setNewQuestionLevel] = useState("Nhận biết");
  const [newQuestionTopic, setNewQuestionTopic] = useState("");

  const handleLoadSampleExam = () => {
    setError(null);
    let sampleQuestions = SAMPLE_MATH_QUESTIONS as Question[];
    let examTitleName = SAMPLE_MATH_EXAM_NAME;
    if (grade.toString().includes("10")) {
      sampleQuestions = SAMPLE_MATH_QUESTIONS_10 as Question[];
      examTitleName = "ĐỀ KIỂM TRA ĐỊNH KỲ TOÁN HỌC LỚP 10 - KHUNG CHUẨN 2025";
    } else if (grade.toString().includes("11")) {
      sampleQuestions = SAMPLE_MATH_QUESTIONS_11 as Question[];
      examTitleName = "ĐỀ KIỂM TRA ĐỊNH KỲ TOÁN HỌC LỚP 11 - KHUNG CHUẨN 2025";
    }
    setQuestions(sampleQuestions);
    setExamName(examTitleName);
    setDuration(SAMPLE_MATH_DURATION);
    setActiveTab("exam");
  };

  const handleImportText = () => {
    const raw = importRawText.trim();
    if (!raw) return;

    // Nếu người dùng dán vào chuỗi JSON từ AI Studio (bắt đầu bằng '{' hoặc '[')
    if (raw.startsWith('{') || raw.startsWith('[')) {
      try {
        let jsonObj = JSON.parse(raw);
        let rawList: any[] = [];
        if (Array.isArray(jsonObj)) {
          rawList = jsonObj;
        } else if (jsonObj && typeof jsonObj === 'object') {
          if (Array.isArray(jsonObj.questions)) rawList = jsonObj.questions;
          else if (Array.isArray(jsonObj.result)) rawList = jsonObj.result;
          if (jsonObj.examTitle && typeof jsonObj.examTitle === 'string') {
            setExamName(jsonObj.examTitle.trim());
          }
          if (typeof jsonObj.duration === 'number' && jsonObj.duration > 0) {
            setDuration(jsonObj.duration);
          }
        }

        if (rawList && rawList.length > 0) {
          const parsed = formatAiQuestionsToParsed(rawList);
          const currentMaxId = questions.reduce((max, q) => Math.max(max, q.id || 0), 0);
          const formatted = parsed.map((q: any, idx: number) => ({
            ...q,
            id: currentMaxId + idx + 1,
            topic: q.topic || 'Chủ đề bóc tách',
            subtopic: q.subtopic || 'Nội dung kiến thức',
            level: q.level || 'Thông hiểu',
            content: embedBbtSvgsInText(embedTikzSvgsInText(q.content || (q as any).question || '')),
            solution: embedBbtSvgsInText(embedTikzSvgsInText((q.solution || q.explanation || "").trim())),
            explanation: embedBbtSvgsInText(embedTikzSvgsInText((q.solution || q.explanation || "").trim()))
          }));

          setQuestions(prev => [...prev, ...formatted]);
          setShowImportTextModal(false);
          setImportRawText("");
          setActiveTab("exam");
          alert(`Đã nhận diện định dạng JSON AI Studio và nạp thành công ${formatted.length} câu hỏi vào Đề Gốc!`);
          return;
        }
      } catch (jsonErr) {
        console.warn("Thử parse JSON không thành công, tiếp tục thử parse dạng văn bản thô:", jsonErr);
      }
    }

    const parsed = parseRawExamText(raw);
    if (parsed.length === 0) {
      alert("Không tìm thấy câu hỏi hợp lệ trong đoạn văn bản. Vui lòng định dạng theo mẫu: Câu 1: ... A. ... B. ... C. ... D. ... hoặc dán chuỗi JSON hợp lệ.");
      return;
    }
    setError(null);
    const currentMaxId = questions.reduce((max, q) => Math.max(max, q.id || 0), 0);
    const reindexed = parsed.map((q, idx) => ({ ...q, id: currentMaxId + idx + 1 }));
    setQuestions(prev => [...prev, ...reindexed]);
    setShowImportTextModal(false);
    setImportRawText("");
    setActiveTab("exam");
    alert(`Đã nhập thành công ${parsed.length} câu hỏi vào Đề Gốc!`);
  };

  const handleSaveManualQuestion = () => {
    if (!newQuestionContent.trim()) {
      alert("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    const maxId = questions.reduce((max, q) => Math.max(max, q.id || 0), 0);
    let createdQ: Question;

    if (newQuestionType === "sa") {
      const val = validateShortAnswer(newQuestionAnswer);
      if (!val.isValid) {
        alert(`Lỗi đáp án Trả lời ngắn (Phần III):\n${val.warning || "Vui lòng nhập đáp án là một số tối đa 4 ký tự."}`);
        return;
      }
    }

    if (newQuestionType === "mc") {
      createdQ = {
        id: maxId + 1,
        type: "mc",
        level: newQuestionLevel,
        topic: newQuestionTopic || "Chung",
        content: fixMath(newQuestionContent),
        options: newQuestionOptions.map(opt => fixMath(cleanOptionText(opt))),
        correctOptionIndex: newQuestionCorrectIndex,
        explanation: newQuestionExplanation ? fixMath(newQuestionExplanation) : undefined
      };
    } else if (newQuestionType === "tf") {
      createdQ = {
        id: maxId + 1,
        type: "tf",
        level: newQuestionLevel,
        topic: newQuestionTopic || "Chung",
        content: fixMath(newQuestionContent),
        tfStatements: [
          { statement: fixMath(newQuestionOptions[0] || "Ý a"), correct: true },
          { statement: fixMath(newQuestionOptions[1] || "Ý b"), correct: false },
          { statement: fixMath(newQuestionOptions[2] || "Ý c"), correct: true },
          { statement: fixMath(newQuestionOptions[3] || "Ý d"), correct: false },
        ],
        explanation: newQuestionExplanation ? fixMath(newQuestionExplanation) : undefined
      };
    } else {
      createdQ = {
        id: maxId + 1,
        type: newQuestionType,
        level: newQuestionLevel,
        topic: newQuestionTopic || "Chung",
        content: fixMath(newQuestionContent),
        correctAnswer: fixMath(newQuestionAnswer),
        explanation: newQuestionExplanation ? fixMath(newQuestionExplanation) : undefined
      };
    }

    setQuestions(prev => [...prev, createdQ]);
    setShowAddQuestionModal(false);
    setNewQuestionContent("");
    setNewQuestionOptions(["", "", "", ""]);
    setNewQuestionAnswer("");
    setNewQuestionExplanation("");
    setError(null);
    setActiveTab("exam");
  };

  const getZaloShareMessage = (url: string, pin: string, title?: string) => {
    const publicBase = getPublicAppUrl() || window.location.origin;
    return `📢 THÔNG BÁO BÀI THI ONLINE: ${title || examName}
👉 Link làm bài trực tiếp: ${url}
${pin ? `🔑 Hoặc vào trang: ${publicBase} và nhập Mã phòng thi: ${pin}\n` : ''}
📌 LƯU Ý KHI MỞ TRÊN ZALO (Nếu bị màn hình trắng, báo lỗi hoặc bị chặn):
1. Bấm vào biểu tượng 3 chấm (···) ở góc trên bên phải màn hình Zalo.
2. Chọn "Mở bằng trình duyệt" (Chrome trên Android hoặc Safari trên iPhone).
3. Hoặc mở trực tiếp trình duyệt Chrome/Safari, truy cập ${publicBase} và nhập Mã phòng thi: ${pin || 'đã cấp'} để vào thi ngay!`;
  };

  const applyPresetBGD3Phan = () => {
    setQEnabled({ mc: true, tf: true, sa: true, essay: false });
    setQCounts({ mc: 12, tf: 4, sa: 6, essay: 0 });
    setQPoints({ mc: "0.25", tf: "1", sa: "0.5", essay: "2" });
  };

  
  const applyPresetNguVan = () => {
    setQEnabled({ mc: false, tf: false, sa: true, essay: true });
    setQCounts({ mc: 0, tf: 0, sa: 4, essay: 2 });
    setQPoints({ mc: "0.25", tf: "0.5", sa: "0.75", essay: "2, 5" });
    setSubject("Ngữ Văn");
  };

  const applyPreset4Phan = () => {
    setQEnabled({ mc: true, tf: true, sa: true, essay: true });
    setQCounts({ mc: 12, tf: 2, sa: 4, essay: 3 });
    setQPoints({ mc: "0.25", tf: "1", sa: "0.5", essay: "1" });
  };

  const handleGenerate = async () => {
    if (generateMode === "from_matrix_file" && !matrixBase64) {
      alert("Bạn đã chọn 'Bám sát Ma trận đính kèm' nhưng chưa tải file lên. Vui lòng tải file ma trận lên trước.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      let detectedSa = qEnabled.sa ? qCounts.sa : 0;
      const combinedMatrixCheck = `${matrix || ''} ${customPrompt || ''}`;
      const tlnMatch = combinedMatrixCheck.match(/(\d+)\s*(?:câu)?\s*(?:TLN|trả\s*lời\s*ngắn)/i);
      if (tlnMatch && Number(tlnMatch[1]) > 0) {
        detectedSa = Number(tlnMatch[1]);
      } else if (detectedSa === 0 && (generateMode === "from_matrix_file" || /tln|trả\s*lời\s*ngắn|phần\s*iii/i.test(combinedMatrixCheck))) {
        detectedSa = 6;
      }

      const activeQCounts = {
        mc: qEnabled.mc ? qCounts.mc : 0,
        tf: qEnabled.tf ? qCounts.tf : 0,
        sa: detectedSa,
        essay: qEnabled.essay ? qCounts.essay : 0
      };

      let realWorldPrompt = "";
      if (enableRealWorld) {
        const levelText = 
          realWorldLevel === "high" ? "Tăng cường (~50% câu thực tế)" :
          realWorldLevel === "max" ? "Chuyên đề thực tế (~70% - 100% câu thực tế)" :
          "Tiêu chuẩn (~30% câu thực tế)";
        
        realWorldPrompt = `
ƯU TIÊN CÂU HỎI BỐI CẢNH THỰC TIỄN (CHUẨN GDPT 2018):
- Mức độ ưu tiên: ${levelText}.
- Thiết kế các câu hỏi có ngữ cảnh đời sống thực tế rõ ràng (kinh doanh, sản xuất xưởng cơ khí/may mặc, đo đạc hàng hải, đo chiều cao tháp/sông, bài toán chi tiêu/lãi suất).
- Tránh các bài toán thuần túy đại số khô khan nếu chủ đề có khả năng ứng dụng thực tế cao (nhất là Hệ bất phương trình bậc nhất hai ẩn và Hệ thức lượng trong tam giác).
- Đối với Phần III (Trả lời ngắn): Đặt câu hỏi thực tế yêu cầu tính một đại lượng cụ thể (mét, nghìn đồng, số sản phẩm, số giờ...) và làm tròn theo đúng yêu cầu để đáp số là một số nguyên hoặc số thập phân tối đa 4 ký tự.
- ĐẶC BIỆT: Đối với mỗi câu hỏi có ngữ cảnh thực tế đời sống, hãy thêm trường "isRealWorld": true vào đối tượng câu hỏi.
`.trim();
      }

      let paramPrompt = "";
      if (parameterOption === "with_params") {
        paramPrompt = `
YÊU CẦU VỀ BÀI TOÁN CHỨA THAM SỐ:
- Trong các câu hỏi ở mức độ Thông hiểu, Vận dụng và Vận dụng cao, hãy BAO GỒM các bài toán chứa tham số (ví dụ: tham số $m, a, b, k...$).
- Đảm bảo câu hỏi có tham số được phát biểu chặt chẽ, chuẩn xác về mặt toán học (ví dụ: tìm các giá trị nguyên của $m$ để hàm số đồng biến/nghịch biến/có cực trị, phương trình có nghiệm thỏa mãn điều kiện, bất phương trình nghiệm đúng với mọi x...).
`.trim();
      } else if (parameterOption === "without_params") {
        paramPrompt = `
YÊU CẦU VỀ BÀI TOÁN KHÔNG CHỨA THAM SỐ:
- TUYỆT ĐỐI KHÔNG sử dụng bài toán chứa tham số ($m, a, b, k...$).
- Tất cả các hàm số, phương trình, bất phương trình, tọa độ và bài toán PHẢI sử dụng hệ số số thực cụ thể.
`.trim();
      }

      const advancedPrompt = `
Thang điểm yêu cầu:
${qEnabled.mc ? `- Trắc nghiệm lựa chọn: ${qPoints.mc} điểm/câu` : ""}
${qEnabled.tf ? `- Đúng/Sai: ${qPoints.tf} điểm/câu` : ""}
${qEnabled.sa ? `- Trả lời ngắn: ${qPoints.sa} điểm/câu (nếu nhiều mức điểm thì lấy tuần tự)` : ""}
${qEnabled.essay ? `- Tự luận: ${qPoints.essay} điểm/câu (nếu nhiều mức điểm thì lấy tuần tự)` : ""}

Mức độ nhận thức yêu cầu:
- Nhận biết: ${levels.nb}%
- Thông hiểu: ${levels.th}%
- Vận dụng: ${levels.vd}%
- Vận dụng cao: ${levels.vdc}%

Yêu cầu xuất ra:
${outputConfig.answers ? "- Có đáp án chi tiết." : ""}
${outputConfig.spec ? "- Kèm theo bảng đặc tả." : ""}
${outputConfig.matrix ? "- Kèm theo ma trận đề." : ""}

${paramPrompt ? `${paramPrompt}\n\n` : ""}${realWorldPrompt ? `${realWorldPrompt}\n\n` : ""}${qEnabled.sa ? `RÀNG BUỘC ĐẶC BIỆT KHI RA CÂU HỎI PHẦN III (TRẢ LỜI NGẮN) CHO CHỦ ĐỀ TẬP HỢP:
- TUYỆT ĐỐI KHÔNG ra đề yêu cầu "Tìm tập hợp", "Viết kết quả dưới dạng khoảng/đoạn/nửa khoảng" hay biểu diễn nghiệm dưới dạng tập hợp.
- BẮT BUỘC câu hỏi phải có đáp số là một con số cụ thể, ví dụ:
  + "Tập hợp $A \\cap B$ có bao nhiêu phần tử là số nguyên?"
  + "Biết $A \\cap B = (a; b)$. Tính giá trị của biểu thức $T = a + b$ (hoặc $T = 2a - b$)?"
  + "Tính độ dài khoảng/đoạn..."
- Đảm bảo đáp số luôn là một số nguyên hoặc số thập phân có độ dài tối đa 4 ký tự.
\n` : ""}${customPrompt}
`.trim();

      let finalPrompt = advancedPrompt;
      if (generateMode === "from_matrix_file") {
        finalPrompt += "\n\nYÊU CẦU QUAN TRỌNG: Hãy sử dụng file đính kèm làm ma trận đề. Soạn các câu hỏi bám sát theo cấu trúc, số lượng câu, mức độ và nội dung được quy định trong file ma trận tải lên này.";
      }

      const response = await apiFetch("/api/generate-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          subject, grade, duration, examType, matrix, customPrompt: finalPrompt,
          qCounts: activeQCounts,
          matrixFile: matrixBase64,
          selectedTopics,
          detailedSolution: outputConfig.detailedSolution,
          realWorldConfig: {
            enabled: enableRealWorld,
            level: realWorldLevel
          }
        })
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = "Có lỗi xảy ra khi tạo đề.";
        try {
          const err = parseApiResponse(text);
          errorMsg = err.error || errorMsg;
        } catch(e: any) {
          errorMsg = e.message || errorMsg;
        }
        if (errorMsg.includes("UNAUTHENTICATED") || errorMsg.includes("Nhập mã API key") || response.status === 401) {
          window.dispatchEvent(new CustomEvent('show-api-key-modal'));
        }
        throw new Error(errorMsg);
      }

      const text = await response.text();
      const data = parseApiResponse<any>(text);
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setExamName(data.examName || "Đề kiểm tra");
        let formatted = data.questions.map((q: any, idx: number) => ({
          ...q,
          id: q.id || idx + 1,
          topic: q.topic || 'Chủ đề trọng tâm',
          subtopic: q.subtopic || 'Nội dung kiến thức',
          level: q.level || 'Thông hiểu',
          content: embedBbtSvgsInText(embedTikzSvgsInText(q.content || (q as any).question || (q as any).text || '')),
          solution: embedBbtSvgsInText(embedTikzSvgsInText((q.solution || q.explanation || "").trim())),
          explanation: embedBbtSvgsInText(embedTikzSvgsInText((q.solution || q.explanation || "").trim()))
        }));

        // Nếu có ảnh / file đính kèm (matrixBase64), tự động crop và nhúng ảnh vào câu hỏi
        if (matrixBase64) {
          try {
            formatted = await attachCroppedFiguresToQuestions(formatted, matrixBase64);
          } catch (cropErr) {
            console.warn("Lỗi tự động crop hình vẽ từ file ma trận/đề thi:", cropErr);
          }
        }

        setQuestions(formatted);

        // Tự động đồng bộ số lượng câu theo đúng ma trận tải lên
        if (generateMode === "from_matrix_file" || autoDetectStructure) {
          const mcCount = formatted.filter((q: any) => q.type === 'mc').length;
          const tfCount = formatted.filter((q: any) => q.type === 'tf').length;
          const saCount = formatted.filter((q: any) => q.type === 'sa').length;
          const esCount = formatted.filter((q: any) => q.type === 'essay').length;
          setQCounts({ mc: mcCount, tf: tfCount, sa: saCount, essay: esCount });
          setQEnabled({ mc: mcCount > 0, tf: tfCount > 0, sa: saCount > 0, essay: esCount > 0 });
        }

        setActiveTab("exam");
      } else {
        throw new Error("Không tìm thấy danh sách câu hỏi trong phản hồi của AI. Thầy cô có thể bấm nút 'Tải đề mẫu' bên dưới để dùng ngay hoặc thử tạo lại.");
      }
    } catch (err: any) {
      let msg = err.message || "Có lỗi xảy ra khi tạo đề.";
      if (msg === "{" || msg === "}" || msg.trim() === "") {
        msg = "Hệ thống AI xử lý quá thời gian chờ hoặc tạm thời quá tải. Thầy cô vui lòng bấm nút '+ TẠO ĐỀ BẰNG AI' lại một lần nữa hoặc bấm 'Tải đề mẫu' để xem đề chuẩn.";
      }
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShuffle = () => {
    if (questions.length === 0) return;
    const processedQuestions = questions.map((q: any) => ({
      ...q,
      content: embedBbtSvgsInText(embedTikzSvgsInText(q.content || q.question || q.text || '')),
      solution: embedBbtSvgsInText(embedTikzSvgsInText(q.solution || q.explanation || '')),
      explanation: embedBbtSvgsInText(embedTikzSvgsInText(q.solution || q.explanation || ''))
    }));
    const mixed = mixExam(processedQuestions as any[], {
      numCodes: Math.min(Math.max(1, numCodes), 24),
      groupBySection: outputConfig.groupBySection !== false,
      shuffleQuestions: outputConfig.shuffleQuestions !== false,
      shuffleOptions: outputConfig.shuffleOptions !== false,
      startCode: startCode || 1001
    });
    setShuffledExams(mixed as any[]);
    setActiveTab("shuffle");
  };

  
  const handleExportWord = (contentId: string, code: string) => {
    const printContent = document.getElementById(contentId);
    if (!printContent) return;
    exportHtmlToWord(printContent, `De_kiem_tra_Ma_${code}.doc`);
  };

  const handleExportWordLatex = (contentId: string, code: string) => {
    const printContent = document.getElementById(contentId);
    if (!printContent) return;
    exportHtmlToWord(printContent, `De_kiem_tra_Ma_${code}_LaTeX.doc`, true);
  };

  const handleExportWordImage = (contentId: string, code: string) => {
    const printContent = document.getElementById(contentId);
    if (!printContent) return;
    exportHtmlToWord(printContent, `De_kiem_tra_Ma_${code}_Anh.doc`, 'image');
  };

  const handlePrint = async (contentId: string) => {
    const printContent = document.getElementById(contentId);
    if (!printContent) return;
    await ensureMathRendered(printContent);
    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    windowPrint?.document.write(`
      <html>
        <head>
          <title>In Đề Kiểm Tra</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>
            body { font-family: "Times New Roman", Times, serif; line-height: 1.5; padding: 20px; }
            h2 { text-align: center; }
            .question { margin-bottom: 15px; }
            .options { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px; }
            .option { padding-left: 10px; }
            .answers-title { margin-top: 30px; font-weight: bold; }
            .answers-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    windowPrint?.document.close();
    windowPrint?.focus();
    setTimeout(() => {
      windowPrint?.print();
      windowPrint?.close();
    }, 250);
  };

  const handleShare = async () => {
    setIsOnlineConfigModalOpen(true);
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileCheck className="w-8 h-8 text-emerald-600" />
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Tạo & Trộn Đề Kiểm Tra</h2>
              <p className="text-slate-500 text-sm mt-1">Tạo ma trận, sinh câu hỏi tự động và đảo mã đề lên đến 24 đề</p>
            </div>
          </div>

          <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
            <button 
              onClick={() => setActiveTab("matrix")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'matrix' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              1. Tạo Ma Trận & Đề
            </button>
            <button 
              onClick={() => setActiveTab("exam")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'exam' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              2. Đề Gốc
            </button>
            <button 
              onClick={() => setActiveTab("shuffle")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'shuffle' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              3. Trộn Đề & Xuất Bản
            </button>
            <button 
              onClick={() => setActiveTab("banks")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'banks' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Ngân hàng câu hỏi
            </button>
            <button 
              onClick={() => setActiveTab("results")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'results' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Kết Quả Thi
            </button>
            <button 
              onClick={() => setShowBubbleSheetModal(true)}
              className="px-6 py-3 font-bold text-sm whitespace-nowrap text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Tải Phiếu Tô 2025
            </button>
            <button 
              onClick={() => setShowTeacherUploadModal(true)}
              className="px-5 py-3 font-bold text-sm whitespace-nowrap text-indigo-600 hover:text-indigo-800 flex items-center gap-2 bg-indigo-50/60 rounded-t-lg border-b-2 border-indigo-600"
            >
              <UploadCloud className="w-4 h-4" /> Tải đề của tôi lên (Word/PDF/Text)
            </button>
            <button 
              onClick={() => setShowSimilarExamsModal(true)}
              className="px-5 py-3 font-bold text-sm whitespace-nowrap text-purple-700 hover:text-purple-900 flex items-center gap-2 bg-purple-50/80 rounded-t-lg border-b-2 border-purple-600 transition-all cursor-pointer"
              title="Tạo 4 Đề Phát Triển Tương Tự từ 1 Đề Có Sẵn & Tải File Word"
            >
              <Sparkles className="w-4 h-4 text-purple-600" /> Tạo 4 Đề Tương Tự (.docx)
            </button>
          </div>

                    {activeTab === "matrix" && (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-1 space-y-6 w-full">
              
                <div className="flex flex-col md:flex-row md:items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100 gap-4">
                   <div className="flex-1">
                      <label className="block text-xs font-medium text-blue-800 mb-1">Mở cấu hình ma trận đã lưu</label>
                      <div className="flex gap-2">
                         <select onChange={e => loadConfig(e.target.value)} defaultValue="" className="flex-1 px-3 py-2 border border-blue-200 rounded-md text-sm bg-white focus:ring-blue-500">
                            <option value="" disabled>-- Chọn cấu hình đã lưu --</option>
                            {savedConfigs.map(c => (
                               <option key={c.id} value={c.id}>{c.name} ({new Date(c.timestamp).toLocaleDateString()})</option>
                            ))}
                         </select>
                         <button onClick={() => {
                            const sel = document.querySelector('select') as HTMLSelectElement;
                            if(sel && sel.value) deleteConfig(sel.value);
                         }} className="px-3 py-2 bg-red-50 text-red-600 rounded-md border border-red-200 hover:bg-red-100 transition" title="Xóa cấu hình đang chọn"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   </div>
                   <button onClick={saveCurrentConfig} className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition text-sm font-medium whitespace-nowrap">
                      + Lưu cấu hình hiện tại
                   </button>
                </div>

                {/* 1. THÔNG TIN ĐỀ */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span> THÔNG TIN ĐỀ THI & MA TRẬN
                  </h3>
                  
                  {/* Hàng 1: Cấp học - Lớp - Môn học */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Cấp học</label>
                      <select 
                        value={schoolLevel} 
                        onChange={e => handleSchoolLevelChange(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium bg-white"
                      >
                        {SCHOOL_LEVELS.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Lớp (Khối lớp)</label>
                      <select 
                        value={grade} 
                        onChange={e => handleGradeChange(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium bg-white"
                      >
                        {(GRADES_BY_LEVEL[schoolLevel] || GRADES_BY_LEVEL["THPT"]).map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học</label>
                      <select 
                        value={subject} 
                        onChange={e => handleSubjectChange(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium bg-white"
                      >
                        {(SUBJECTS_BY_LEVEL[schoolLevel] || SUBJECTS_BY_LEVEL["THPT"]).map(subj => (
                          <option key={subj} value={subj}>{subj}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Hàng 2: Loại đề - Thời gian - Số mã đề */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Loại đề <span className="text-emerald-600 font-normal">(Gợi ý số phút tự động)</span>
                      </label>
                      <select 
                        value={examType} 
                        onChange={e => handleExamTypeChange(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-slate-800 shadow-2xs bg-white"
                      >
                        {STANDARDIZED_EXAM_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Thời gian (phút) <span className="text-slate-400 font-normal">(Tùy chỉnh)</span>
                      </label>
                      <input 
                        type="number" 
                        min={5}
                        max={300}
                        value={duration} 
                        onChange={e => setDuration(Math.max(1, Number(e.target.value)))} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-bold text-slate-800 bg-white" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Số mã đề cần trộn</label>
                      <select 
                        value={numCodes} 
                        onChange={e => setNumCodes(Number(e.target.value))} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium bg-white"
                      >
                        {NUM_EXAM_CODES_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Hàng 3: Tùy chọn bài toán tham số & Tên bài / chủ đề */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Bài toán chứa tham số</span>
                        <span className="text-[11px] text-indigo-600 font-normal">$m, a, b...$</span>
                      </label>
                      <select 
                        value={parameterOption} 
                        onChange={e => setParameterOption(e.target.value as ParameterOption)} 
                        className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/40 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-800"
                      >
                        {PARAMETER_PROBLEM_OPTIONS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Tên bài / chủ đề / phạm vi kiến thức</label>
                      <input 
                        type="text" 
                        value={matrix} 
                        onChange={e => setMatrix(e.target.value)} 
                        placeholder="Ví dụ: Hàm số bậc hai, Khảo sát chất lượng đầu năm..." 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Yêu cầu riêng của giáo viên</label>
                    <textarea 
                      value={customPrompt} 
                      onChange={e => setCustomPrompt(e.target.value)} 
                      placeholder="Nhập yêu cầu bổ sung (VD: thêm câu vận dụng cao về min-max hình học, kiểm tra kỹ nghiệm ngoại lai...)" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" 
                      rows={2}
                    />
                  </div>
                </div>

                {/* 2. TÀI LIỆU GỐC & CHẾ ĐỘ TẠO */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</span> TÀI LIỆU GỐC & CHẾ ĐỘ TẠO
                  </h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Chế độ tạo đề:</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 flex-1 border-slate-200">
                        <input type="radio" name="generateMode" value="auto" checked={generateMode === "auto"} onChange={() => setGenerateMode("auto")} className="text-blue-600 focus:ring-blue-500 w-4 h-4" />
                        <span className="text-sm font-medium text-slate-700">Tạo tự động (Dựa vào AI)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 flex-1 border-slate-200">
                        <input type="radio" name="generateMode" value="from_matrix_file" checked={generateMode === "from_matrix_file"} onChange={() => setGenerateMode("from_matrix_file")} className="text-blue-600 focus:ring-blue-500 w-4 h-4" />
                        <span className="text-sm font-medium text-slate-700">Bám sát Ma trận đính kèm</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">File đính kèm (SGK / Ma trận / Học liệu):</label>
                    
                    <div className={`w-full px-4 py-3 border rounded-lg h-24 flex items-center justify-center bg-slate-50 border-dashed relative hover:bg-slate-100 transition-colors cursor-pointer mb-2 ${generateMode === 'from_matrix_file' && !matrixFile ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}>
                      <input 
                        type="file" 
                        accept=".pdf,image/*,.docx,.doc,.xlsx,.xls,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className="flex flex-col items-center gap-1 text-slate-500">
                        <UploadCloud className="w-6 h-6 text-slate-400" />
                        <span className="text-sm font-medium text-center px-2">
                          {matrixFile ? matrixFile.name : "Tải lên tệp Ma trận & Bản đặc tả (PDF, Word .docx/.doc, Excel .xlsx/.xls, Ảnh)"}
                        </span>
                      </div>
                    </div>
                    {generateMode === 'from_matrix_file' && (
                       <label className="flex items-center gap-2 mt-2 cursor-pointer text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                          <input type="checkbox" checked={autoDetectStructure} onChange={e => setAutoDetectStructure(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                          Tự động làm đúng số câu theo ma trận tải lên (Bỏ qua cấu trúc bên dưới)
                       </label>
                    )}
                    <p className="text-xs text-slate-400 mt-2">Hỗ trợ PDF, Word, Excel, Ảnh (JPG, PNG). Tối đa 50MB.</p>
                  </div>
                </div>

                {/* 3. CẤU TRÚC ĐỀ */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">3</span> CẤU TRÚC ĐỀ
                    </div>
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                     <span className="text-xs font-medium text-slate-500 flex items-center mr-1">Gợi ý nhanh:</span>
                     <button onClick={applyPresetBGD3Phan} className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-sm hover:bg-blue-100 transition-colors">Chuẩn BGD 3 phần (12 TN, 4 ĐS, 6 TLN)</button>
                     <button onClick={applyPreset4Phan} className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md text-sm hover:bg-emerald-100 transition-colors">Đề 4 phần (có Tự luận)</button>
                     <button onClick={applyPresetNguVan} className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-md text-sm hover:bg-amber-100 transition-colors">Đề Ngữ Văn (Đọc hiểu & Làm văn)</button>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 items-center">
                      <div className="col-span-5 text-left pl-2">Đang cấu hình</div>
                      <div className="col-span-2 text-center">Số câu</div>
                      <div className="col-span-2 text-center">Điểm/câu</div>
                      <div className="col-span-2 text-center">Tổng</div>
                      <div className="col-span-1 text-center">Dùng</div>
                    </div>

                    <div className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${qEnabled.mc ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                      <div className="col-span-5 flex flex-col">
                         <span className="font-medium text-sm text-slate-700">Trắc nghiệm lựa chọn</span>
                         <span className="text-xs text-slate-400">4 lựa chọn</span>
                      </div>
                      <div className="col-span-2">
                         <input type="number" value={qCounts.mc} onChange={e=>setQCounts({...qCounts, mc: Number(e.target.value)})} disabled={!qEnabled.mc} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                         <input type="text" value={qPoints.mc} onChange={e=>setQPoints({...qPoints, mc: e.target.value})} disabled={!qEnabled.mc} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" placeholder="VD: 0.25" title="Nhập điểm số (vd: 0.25) hoặc chuỗi (vd: 0.75, 1.0) cho các câu hỏi" />
                      </div>
                      <div className="col-span-2 text-center text-sm font-medium text-slate-700">
                         {qEnabled.mc ? ptMC.total : 0}
                      </div>
                      <div className="col-span-1 flex justify-center">
                         <input type="checkbox" checked={qEnabled.mc} onChange={e=>setQEnabled({...qEnabled, mc: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      </div>
                    </div>

                    <div className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${qEnabled.tf ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                      <div className="col-span-5 flex flex-col">
                         <span className="font-medium text-sm text-slate-700">Đúng / Sai</span>
                      </div>
                      <div className="col-span-2">
                         <input type="number" value={qCounts.tf} onChange={e=>setQCounts({...qCounts, tf: Number(e.target.value)})} disabled={!qEnabled.tf} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                         <input type="text" value={qPoints.tf} onChange={e=>setQPoints({...qPoints, tf: e.target.value})} disabled={!qEnabled.tf} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" placeholder="VD: 0.5" title="Nhập điểm số (vd: 0.5) hoặc chuỗi (vd: 0.75, 1.0) cho các câu hỏi" />
                      </div>
                      <div className="col-span-2 text-center text-sm font-medium text-slate-700">
                         {qEnabled.tf ? ptTF.total : 0}
                      </div>
                      <div className="col-span-1 flex justify-center">
                         <input type="checkbox" checked={qEnabled.tf} onChange={e=>setQEnabled({...qEnabled, tf: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      </div>
                    </div>

                    <div className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${qEnabled.sa ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                      <div className="col-span-5 flex flex-col">
                         <span className="font-medium text-sm text-slate-700">{subject.toLowerCase().includes("văn") ? "Đọc hiểu (Trả lời ngắn)" : "Trả lời ngắn"}</span>
                      </div>
                      <div className="col-span-2">
                         <input type="number" value={qCounts.sa} onChange={e=>setQCounts({...qCounts, sa: Number(e.target.value)})} disabled={!qEnabled.sa} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                         <MultiPointInput count={qCounts.sa} value={qPoints.sa} onChange={(val) => setQPoints({...qPoints, sa: val})} disabled={!qEnabled.sa} />
                      </div>
                      <div className="col-span-2 text-center text-sm font-medium text-slate-700">
                         {qEnabled.sa ? ptSA.total : 0}
                      </div>
                      <div className="col-span-1 flex justify-center">
                         <input type="checkbox" checked={qEnabled.sa} onChange={e=>setQEnabled({...qEnabled, sa: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      </div>
                    </div>

                    <div className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${qEnabled.essay ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                      <div className="col-span-5 flex flex-col">
                         <span className="font-medium text-sm text-slate-700">{subject.toLowerCase().includes("văn") ? "Làm văn (Tự luận)" : "Tự luận"}</span>
                      </div>
                      <div className="col-span-2">
                         <input type="number" value={qCounts.essay} onChange={e=>setQCounts({...qCounts, essay: Number(e.target.value)})} disabled={!qEnabled.essay} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                         <MultiPointInput count={qCounts.essay} value={qPoints.essay} onChange={(val) => setQPoints({...qPoints, essay: val})} disabled={!qEnabled.essay} />
                      </div>
                      <div className="col-span-2 text-center text-sm font-medium text-slate-700">
                         {qEnabled.essay ? ptES.total : 0}
                      </div>
                      <div className="col-span-1 flex justify-center">
                         <input type="checkbox" checked={qEnabled.essay} onChange={e=>setQEnabled({...qEnabled, essay: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center bg-blue-50/50 p-3 rounded-lg">
                       <span className="font-medium text-slate-600 text-sm flex items-center gap-1"><FileCheck className="w-4 h-4" /> Tổng Điểm = {totalPointsCalc}</span>
                       <span className="text-xs text-slate-400">Tự động tính</span>
                    </div>
                  </div>
                </div>

                {/* 4. MỨC ĐỘ NHẬN THỨC */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">4</span> MỨC ĐỘ NHẬN THỨC <span className="font-normal text-xs text-slate-400">(TỔNG: {levels.nb + levels.th + levels.vd + levels.vdc}%)</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                     <div className="flex flex-col gap-2">
                        <div className="font-medium text-slate-700">Nhận biết (%)</div>
                        <input type="number" min="0" max="100" className="border border-slate-300 rounded p-2 text-center" value={levels.nb} onChange={e=>setLevels({...levels, nb: Number(e.target.value)})} />
                     </div>
                     <div className="flex flex-col gap-2">
                        <div className="font-medium text-slate-700">Thông hiểu (%)</div>
                        <input type="number" min="0" max="100" className="border border-slate-300 rounded p-2 text-center" value={levels.th} onChange={e=>setLevels({...levels, th: Number(e.target.value)})} />
                     </div>
                     <div className="flex flex-col gap-2">
                        <div className="font-medium text-slate-700">Vận dụng (%)</div>
                        <input type="number" min="0" max="100" className="border border-slate-300 rounded p-2 text-center" value={levels.vd} onChange={e=>setLevels({...levels, vd: Number(e.target.value)})} />
                     </div>
                     <div className="flex flex-col gap-2">
                        <div className="font-medium text-slate-700">Vận dụng cao (%)</div>
                        <input type="number" min="0" max="100" className="border border-slate-300 rounded p-2 text-center" value={levels.vdc} onChange={e=>setLevels({...levels, vdc: Number(e.target.value)})} />
                     </div>
                  </div>
                  {(levels.nb + levels.th + levels.vd + levels.vdc) !== 100 && (
                     <div className="mt-4 text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-start gap-1">
                        <Sparkles className="w-4 h-4 shrink-0" /> Lưu ý: Tổng tỉ lệ hiện tại là {levels.nb + levels.th + levels.vd + levels.vdc}%. Vui lòng điều chỉnh để tổng bằng đúng 100%.
                     </div>
                  )}
                </div>

                {/* 5. CÂU HỎI ỨNG DỤNG THỰC TẾ (CHUẨN GDPT 2018) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">5</span> CÂU HỎI ỨNG DỤNG THỰC TẾ (CHUẨN GDPT 2018)
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> GDPT 2018
                    </span>
                  </div>

                  {/* Switch / Checkbox */}
                  <div className="flex items-start justify-between p-4 bg-blue-50/60 border border-blue-200 rounded-xl mb-4 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-600 text-white rounded-lg mt-0.5 shrink-0 shadow-xs">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <label htmlFor="enable-real-world-toggle" className="font-bold text-slate-800 text-sm cursor-pointer select-none">
                          Ưu tiên câu hỏi bối cảnh thực tế (Chuẩn GDPT 2018)
                        </label>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          Tự động lồng ghép các bài toán thực tiễn: tối ưu hóa chi phí/lợi nhuận bằng hệ BPT bậc nhất hai ẩn, bài toán đo đạc góc/khoảng cách bằng hệ thức lượng, thống kê, tài chính...
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4 mt-1">
                      <input
                        id="enable-real-world-toggle"
                        type="checkbox"
                        checked={enableRealWorld}
                        onChange={e => setEnableRealWorld(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Khi kích hoạt tùy chọn */}
                  {enableRealWorld && (
                    <div className="space-y-4 pt-1">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Tỷ lệ câu hỏi bối cảnh thực tế mong muốn:
                          </label>
                          <span className="text-xs font-bold text-blue-700 bg-blue-100/90 px-2.5 py-0.5 rounded-full">
                            {realWorldLevel === 'standard' && 'Tiêu chuẩn (~30% câu thực tế)'}
                            {realWorldLevel === 'high' && 'Tăng cường (~50% câu thực tế)'}
                            {realWorldLevel === 'max' && 'Chuyên đề thực tế (~70% - 100% câu thực tế)'}
                          </span>
                        </div>

                        {/* 3 Thẻ Lựa chọn Nhanh */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setRealWorldLevel("standard")}
                            className={`p-3.5 rounded-xl border text-left transition-all relative ${
                              realWorldLevel === "standard"
                                ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-sm text-slate-800">Tiêu chuẩn</span>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                realWorldLevel === "standard" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                              }`}>~30%</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-snug">
                              Mặc định: Phân bổ hài hòa giữa bài toán thuần túy và bài toán đời sống thường nhật.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRealWorldLevel("high")}
                            className={`p-3.5 rounded-xl border text-left transition-all relative ${
                              realWorldLevel === "high"
                                ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-sm text-slate-800">Tăng cường</span>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                realWorldLevel === "high" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                              }`}>~50%</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-snug">
                              Tùy chọn cao: Khoảng một nửa số câu gắn với kinh doanh, sản xuất, đo đạc khoảng cách.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRealWorldLevel("max")}
                            className={`p-3.5 rounded-xl border text-left transition-all relative ${
                              realWorldLevel === "max"
                                ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-sm text-slate-800">Chuyên đề thực tế</span>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                realWorldLevel === "max" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                              }`}>~70% - 100%</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-snug">
                              Tùy chọn tối đa: Tập trung vào bài toán ứng dụng thực tiễn, tối ưu chi phí và mô hình hóa.
                            </p>
                          </button>
                        </div>

                        {/* Thanh trượt tỷ lệ (Slider) */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                            <span className="font-medium">Thanh điều chỉnh mức độ:</span>
                            <span className="font-semibold text-blue-600">
                              {realWorldLevel === 'standard' && "Mức 1: Tiêu chuẩn (~30%)"}
                              {realWorldLevel === 'high' && "Mức 2: Tăng cường (~50%)"}
                              {realWorldLevel === 'max' && "Mức 3: Chuyên đề thực tế (~70% - 100%)"}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="1"
                            value={realWorldLevel === 'standard' ? 1 : realWorldLevel === 'high' ? 2 : 3}
                            onChange={e => {
                              const val = Number(e.target.value);
                              if (val === 1) setRealWorldLevel("standard");
                              else if (val === 2) setRealWorldLevel("high");
                              else setRealWorldLevel("max");
                            }}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                          <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 px-1">
                            <span className="cursor-pointer hover:text-blue-600" onClick={() => setRealWorldLevel("standard")}>30% (Tiêu chuẩn)</span>
                            <span className="cursor-pointer hover:text-blue-600 text-center" onClick={() => setRealWorldLevel("high")}>50% (Tăng cường)</span>
                            <span className="cursor-pointer hover:text-blue-600 text-right" onClick={() => setRealWorldLevel("max")}>70% - 100% (Chuyên đề)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. THÀNH PHẦN ĐẦU RA */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-12">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">6</span> THÀNH PHẦN ĐẦU RA
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
                     <label className="flex items-center gap-2 cursor-pointer col-span-1 sm:col-span-2 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
                       <input
                         type="checkbox"
                         checked={outputConfig.groupBySection !== false}
                         onChange={e => setOutputConfig({ ...outputConfig, groupBySection: e.target.checked })}
                         className="w-4 h-4 text-emerald-600 rounded border-slate-300 shrink-0"
                       />
                       <div>
                         <span className="font-semibold text-emerald-950">
                           Cố định nhóm theo từng Phần (Chuẩn GDPT):
                         </span>
                         <span className="ml-1 text-slate-600 text-xs">
                           Chỉ trộn câu hỏi trong nội bộ từng phần (Phần I, Phần II, Phần III, Phần IV), không làm xáo trộn lẫn lộn giữa các phần.
                         </span>
                       </div>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.shuffleOptions} onChange={e=>setOutputConfig({...outputConfig, shuffleOptions: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Đảo thứ tự phương án A, B, C, D trong từng câu hỏi trắc nghiệm</label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.shuffleQuestions} onChange={e=>setOutputConfig({...outputConfig, shuffleQuestions: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Trộn thứ tự câu giữa các mã đề (trong nội bộ từng phần)</label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.answers} onChange={e=>setOutputConfig({...outputConfig, answers: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Đáp án và thang điểm</label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.matrix} onChange={e=>setOutputConfig({...outputConfig, matrix: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Ma trận đề kiểm tra</label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.spec} onChange={e=>setOutputConfig({...outputConfig, spec: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Bản đặc tả đề kiểm tra</label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.detailedSolution} onChange={e=>setOutputConfig({...outputConfig, detailedSolution: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Lời giải chi tiết</label>
                  </div>
                  <div className="mt-8 flex flex-col gap-4">
                     {error && (
                       <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl space-y-3">
                         <div className="flex items-start gap-2">
                           <span className="text-red-500 text-lg leading-none mt-0.5">⚠️</span>
                           <div className="flex-1">
                             <p className="font-semibold text-red-900">Không thể hoàn tất tạo đề:</p>
                             <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">{error}</p>
                           </div>
                         </div>
                         <div className="flex flex-wrap gap-2 pt-1 border-t border-red-100">
                           <button
                             type="button"
                             onClick={handleGenerate}
                             disabled={isGenerating}
                             className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-1.5"
                           >
                             <Sparkles className="w-3.5 h-3.5" /> Thử tạo lại
                           </button>
                           <button
                             type="button"
                             onClick={handleLoadSampleExam}
                             className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-300 text-xs font-medium rounded-md transition-colors"
                           >
                             ⚡ Nạp Đề Mẫu Chuẩn 2025
                           </button>
                           <button
                             type="button"
                             onClick={() => window.dispatchEvent(new CustomEvent('show-api-key-modal'))}
                             className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-md transition-colors"
                           >
                             🔑 Nhập API Key riêng
                           </button>
                         </div>
                       </div>
                     )}
                     <div className="flex gap-4">
                     <button onClick={handleGenerate} disabled={isGenerating} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70 shadow-sm">
                        {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Sparkles className="w-5 h-5" />} 
                        {isGenerating ? "ĐANG TẠO ĐỀ..." : "+ TẠO ĐỀ BẰNG AI"}
                     </button>
                     <button onClick={() => {
                       setQCounts({ mc: 20, tf: 0, sa: 0, essay: 0 });
                       setMatrix(""); setCustomPrompt(""); setMatrixFile(null); setMatrixBase64(null);
                     }} className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors">
                        Làm mới
                     </button>
                     </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDEBAR - TÓM TẮT */}
              <div className="w-full lg:w-80 shrink-0 sticky top-6">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-blue-50 border-b border-slate-200 p-4">
                       <h3 className="font-bold text-slate-800 text-sm">TÓM TẮT CẤU HÌNH</h3>
                    </div>
                    <div className="p-4 space-y-4">
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Tổng số câu</span>
                          <span className="font-bold text-slate-800">{totalQuestionsCalc}</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Tổng điểm</span>
                          <span className="font-bold text-slate-800">{totalPointsCalc}</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Thời lượng ước tính</span>
                          <span className="font-bold text-slate-800">{duration}'</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Thời gian đề</span>
                          <span className="font-bold text-slate-800">{duration}'</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Số mã đề</span>
                          <span className="font-bold text-slate-800">{numCodes}</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Bối cảnh thực tế</span>
                          <span className={`font-semibold text-xs px-2 py-0.5 rounded ${
                             enableRealWorld ? 'text-blue-700 bg-blue-50 border border-blue-200' : 'text-slate-400 bg-slate-100'
                          }`}>
                             {enableRealWorld ? (
                               realWorldLevel === 'high' ? 'Tăng cường (~50%)' :
                               realWorldLevel === 'max' ? 'Chuyên đề (~70-100%)' :
                               'Tiêu chuẩn (~30%)'
                             ) : 'Đang tắt'}
                          </span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Học liệu</span>
                          <span className="font-bold text-slate-800">{matrixFile ? '1 tệp' : '0'}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Model</span>
                          <span className="font-bold text-slate-800">gemini-3.5-flash</span>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}


          {activeTab === "exam" && (
            <div className="space-y-6">
              {questions.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl p-8 lg:p-12 text-center max-w-3xl mx-auto shadow-sm">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa Có Đề Gốc Nào</h3>
                  <p className="text-slate-600 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
                    Thầy cô có thể tạo đề tự động bằng AI, nạp ngay bộ đề mẫu chuẩn khung 2025, hoặc tự nhập đề thủ công/dán từ Word vào đây để chỉnh sửa và trộn mã đề.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <button
                      onClick={handleLoadSampleExam}
                      className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-600 text-white rounded-lg">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-emerald-900 group-hover:text-emerald-700">⚡ Nạp Đề Mẫu Chuẩn 2025</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Nạp sẵn bộ đề chuẩn Toán học 2025 gồm 20 câu chuẩn 4 phần (Trắc nghiệm, Đúng/Sai, Trả lời ngắn, Tự luận) đầy đủ công thức LaTeX.
                      </p>
                    </button>

                    <button
                      onClick={() => setShowImportTextModal(true)}
                      className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-600 text-white rounded-lg">
                          <ListPlus className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-blue-900 group-hover:text-blue-700">📋 Dán Đề Từ Văn Bản (Word)</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Sao chép và dán nhanh văn bản câu hỏi từ Word/PDF vào hệ thống tự động bóc tách thành các câu trắc nghiệm.
                      </p>
                    </button>

                    <button
                      onClick={() => setShowAddQuestionModal(true)}
                      className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-600 text-white rounded-lg">
                          <Plus className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-amber-900 group-hover:text-amber-700">➕ Tự Soạn Câu Hỏi Thủ Công</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Thêm từng câu hỏi theo ý muốn, tùy chọn loại câu: Trắc nghiệm 4 lựa chọn, Đúng/Sai 4 ý, Trả lời ngắn hoặc Tự luận.
                      </p>
                    </button>

                    <button
                      onClick={() => setActiveTab("matrix")}
                      className="p-5 bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 rounded-xl hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-600 text-white rounded-lg">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-purple-900 group-hover:text-purple-700">🚀 Tạo Tự Động Bằng AI</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Quay lại Bước 1 để thiết lập ma trận đề, chương trình học và bấm nút tạo đề thông minh bằng Gemini AI.
                      </p>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1 w-full lg:w-auto">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tên Đề Gốc:</label>
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-full">
                          {questions.length} câu hỏi
                        </span>
                      </div>
                      <input
                        type="text"
                        value={examName}
                        onChange={e => setExamName(e.target.value)}
                        className="mt-1 w-full text-lg font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
                        placeholder="Nhập tên đề kiểm tra..."
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto justify-end">
                      {/* Nút tùy chỉnh tiêu đề (Trường, GV, Năm học 2026-2027) */}
                      <button
                        type="button"
                        onClick={() => setIsHeaderModalOpen(true)}
                        className="px-3 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold rounded-lg hover:bg-emerald-100 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        title="Tùy chỉnh thông tin Trường học, Họ và tên giáo viên, Năm học 2026 - 2027 xuất hiện ở đầu đề thi..."
                      >
                        <School className="w-4 h-4 text-emerald-600" />
                        <span>Tiêu đề (Trường, GV, 2026-2027)</span>
                      </button>

                      <button
                        onClick={() => setShowAddQuestionModal(true)}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                        title="Thêm câu hỏi mới vào đề"
                      >
                        <Plus className="w-4 h-4 text-emerald-600" /> Thêm câu hỏi
                      </button>

                      <button
                        onClick={() => setShowImportTextModal(true)}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                        title="Dán nhanh câu hỏi từ Word"
                      >
                        <ListPlus className="w-4 h-4 text-blue-600" /> Nhập từ Word
                      </button>

                      <button
                        onClick={handleLoadSampleExam}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                        title="Nạp đề kiểm tra mẫu chuẩn năm học 2026-2027"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" /> Mẫu 2026-2027
                      </button>

                      <button
                        onClick={() => setShowSimilarExamsModal(true)}
                        disabled={questions.length === 0}
                        className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        title="Tạo 4 Đề Phát Triển Tương Tự từ đề gốc này & Tải File Word"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" /> Tạo 4 Đề Tương Tự
                      </button>

                      <button
                        onClick={() => setIsOnlineConfigModalOpen(true)}
                        disabled={questions.length === 0}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                        title="Tạo Link Làm Online & Sinh Mã QR"
                      >
                        <Share2 className="w-4 h-4" /> Tạo Link Online
                      </button>

                      <button
                        onClick={() => {
                          if (confirm("Thầy cô có chắc muốn xóa toàn bộ câu hỏi trong đề gốc để làm lại?")) {
                            setQuestions([]);
                          }
                        }}
                        className="px-3 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 flex items-center gap-1.5 shadow-sm"
                        title="Xóa hết câu hỏi"
                      >
                        <Trash2 className="w-4 h-4" /> Xóa
                      </button>

                      <div className="h-6 w-[1px] bg-slate-300 mx-1 hidden sm:block"></div>

                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300">
                        <label className="text-xs font-semibold text-slate-600">Số mã đề:</label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={numCodes}
                          onChange={e => setNumCodes(Number(e.target.value))}
                          className="w-14 px-2 py-0.5 text-center font-bold border border-slate-300 rounded text-slate-800"
                        />
                      </div>

                      <button
                        onClick={handleShuffle}
                        className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-all"
                      >
                        <Shuffle className="w-4 h-4" /> Trộn Đề (Bước 3)
                      </button>
                    </div>
                  </div>
                  
                  
                  {/* MA TRẬN */}
                  {outputConfig.matrix && (
                    <div className="border border-slate-200 rounded-lg p-6 space-y-6 bg-white overflow-x-auto printable-matrix" id="matrix-container">
                      <div className="flex justify-between items-center mb-4 no-print">
                        <div className="flex-1 text-center">
                          <h2 className="text-xl font-bold">MA TRẬN ĐỀ KIỂM TRA</h2>
                          <p className="text-sm text-slate-500 font-normal no-print italic mt-1">💡 Mẹo: Bấm giữ và kéo thả các hàng (chủ đề hoặc nội dung) để sắp xếp lại thứ tự</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => {
                                const wrap = document.getElementById('matrix-table-wrap');
                                if (!wrap) return;
                                exportHtmlToWord(wrap, 'Ma_Tran_De_Kiem_Tra.doc');
                            }} className="px-3 py-1.5 bg-blue-50 text-blue-600 font-medium rounded hover:bg-blue-100 flex items-center gap-2 text-sm border border-blue-200 no-print">
                              Xuất Word
                            </button>
                            <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-50 text-slate-600 font-medium rounded hover:bg-slate-200 flex items-center gap-2 text-sm border border-slate-300 no-print">
                              <Printer className="w-4 h-4" /> In PDF
                            </button>
                        </div>
                      </div>
                      <div id="matrix-table-wrap">
                          <table className="w-full border-collapse border border-black text-[13px] min-w-[1000px] font-serif text-black" style={{fontFamily: '"Times New Roman", Times, serif'}}>
                            <thead>
                              <tr>
                                <th className="border border-black p-1 text-center font-bold" rowSpan={4}>TT</th>
                                <th className="border border-black p-1 text-center font-bold" rowSpan={4}>Chủ đề/Chương</th>
                                <th className="border border-black p-1 text-center font-bold" rowSpan={4}>Nội dung/đơn vị kiến thức</th>
                                <th className="border border-black p-1 text-center font-bold" colSpan={16}>Mức độ đánh giá</th>
                                <th className="border border-black p-1 text-center font-bold" colSpan={4} rowSpan={3}>Tổng</th>
                                <th className="border border-black p-1 text-center font-bold" rowSpan={4}>Tỉ lệ %<br/>điểm</th>
                              </tr>
                              <tr>
                                <th className="border border-black p-1 text-center font-bold" colSpan={8}>TNKQ</th>
                                <th className="border border-black p-1 text-center font-bold" colSpan={4} rowSpan={2}>Trả lời ngắn</th>
                                <th className="border border-black p-1 text-center font-bold" colSpan={4} rowSpan={2}>Tự luận</th>
                              </tr>
                              <tr>
                                <th className="border border-black p-1 text-center font-bold" colSpan={4}>Nhiều lựa chọn</th>
                                <th className="border border-black p-1 text-center font-bold" colSpan={4}>"Đúng - Sai"</th>
                              </tr>
                              <tr>
                                {Array.from({length: 4}).map((_, i) => (
                                    <td key={`sub-${i}`} className="p-0 border-0">
                                      <table className="w-full h-full border-collapse"><tbody><tr>
                                        <th className="border-r border-black p-1 text-center font-bold w-1/4">Biết</th>
                                        <th className="border-r border-black p-1 text-center font-bold w-1/4">Hiểu</th>
                                        <th className="border-r border-black p-1 text-center font-bold w-1/4">VD</th>
                                        <th className="border-0 p-1 text-center font-bold w-1/4">VDC</th>
                                      </tr></tbody></table>
                                    </td>
                                ))}
                                <th className="border border-black p-1 text-center font-bold">Biết</th>
                                <th className="border border-black p-1 text-center font-bold">Hiểu</th>
                                <th className="border border-black p-1 text-center font-bold">VD</th>
                                <th className="border border-black p-1 text-center font-bold">VDC</th>
                              </tr>
                            </thead>
                            
                              {matrixStructure.map((topicObj, tIdx) => {
                                 const topic = topicObj.topic;
                                 const topicQs = questions.filter(q => (q.topic || 'Chung') === topic);
                                 
                                 return (
                                   <tbody 
                                      key={`topic-${tIdx}`}
                                      draggable
                                      onDragStart={(e) => { 
                                          setDraggedTopicIdx(tIdx); 
                                      }}
                                      onDragOver={(e) => { 
                                          e.preventDefault(); 
                                      }}
                                      onDrop={(e) => {
                                         if (draggedTopicIdx !== null && draggedTopicIdx !== tIdx) {
                                             const newStruct = [...matrixStructure];
                                             const [moved] = newStruct.splice(draggedTopicIdx, 1);
                                             newStruct.splice(tIdx, 0, moved);
                                             setMatrixStructure(newStruct);
                                         }
                                         setDraggedTopicIdx(null);
                                      }}
                                      onDragEnd={() => setDraggedTopicIdx(null)}
                                      className={draggedTopicIdx === tIdx ? 'opacity-30 bg-slate-100' : 'hover:bg-slate-50 transition-colors'}
                                      title="💡 Kéo thả mảng chủ đề này để đổi vị trí"
                                   >
                                     {topicObj.subtopics.map((sub, sIdx) => {
                                        const subQs = topicQs.filter(q => (q.subtopic || 'Chung') === sub);
                                        
                                        const getLevelCount = (type: string, lvl: string) => {
                                            return subQs.filter(q => {
                                                if (q.type !== type) return false;
                                                const l = (q.level || '').toLowerCase();
                                                if (lvl === 'nb') return l.includes('biết');
                                                if (lvl === 'th') return l.includes('hiểu');
                                                if (lvl === 'vdc') return l.includes('cao');
                                                if (lvl === 'vd') return l.includes('dụng') && !l.includes('cao');
                                                return false;
                                            }).length;
                                        };

                                        const rowData = {
                                            mc: { nb: getLevelCount('mc','nb'), th: getLevelCount('mc','th'), vd: getLevelCount('mc','vd'), vdc: getLevelCount('mc','vdc') },
                                            tf: { nb: getLevelCount('tf','nb'), th: getLevelCount('tf','th'), vd: getLevelCount('tf','vd'), vdc: getLevelCount('tf','vdc') },
                                            sa: { nb: getLevelCount('sa','nb'), th: getLevelCount('sa','th'), vd: getLevelCount('sa','vd'), vdc: getLevelCount('sa','vdc') },
                                            es: { nb: getLevelCount('essay','nb'), th: getLevelCount('essay','th'), vd: getLevelCount('essay','vd'), vdc: getLevelCount('essay','vdc') }
                                        };
                                        
                                        const totalNB = rowData.mc.nb + rowData.tf.nb + rowData.sa.nb + rowData.es.nb;
                                        const totalTH = rowData.mc.th + rowData.tf.th + rowData.sa.th + rowData.es.th;
                                        const totalVD = rowData.mc.vd + rowData.tf.vd + rowData.sa.vd + rowData.es.vd;
                                        const totalVDC = rowData.mc.vdc + rowData.tf.vdc + rowData.sa.vdc + rowData.es.vdc;
                                        
                                        const rowPoints = 
                                            (rowData.mc.nb + rowData.mc.th + rowData.mc.vd + rowData.mc.vdc) * ptMC.average +
                                            (rowData.tf.nb + rowData.tf.th + rowData.tf.vd + rowData.tf.vdc) * ptTF.average +
                                            (rowData.sa.nb + rowData.sa.th + rowData.sa.vd + rowData.sa.vdc) * ptSA.average +
                                            (rowData.es.nb + rowData.es.th + rowData.es.vd + rowData.es.vdc) * ptES.average;
                                        const rowPercent = totalPointsCalc > 0 ? Math.round((rowPoints / totalPointsCalc) * 100) : 0;

                                        return (
                                          <tr 
                                            key={`sub-${tIdx}-${sIdx}`}
                                            draggable
                                            onDragStart={(e) => { 
                                                e.stopPropagation(); 
                                                setDraggedSubtopic({ tIdx, sIdx }); 
                                            }}
                                            onDragOver={(e) => { 
                                                e.preventDefault(); 
                                                e.stopPropagation(); 
                                            }}
                                            onDrop={(e) => {
                                                e.stopPropagation();
                                                if (draggedSubtopic && draggedSubtopic.tIdx === tIdx && draggedSubtopic.sIdx !== sIdx) {
                                                    const newStruct = [...matrixStructure];
                                                    const subs = [...newStruct[tIdx].subtopics];
                                                    const [moved] = subs.splice(draggedSubtopic.sIdx, 1);
                                                    subs.splice(sIdx, 0, moved);
                                                    newStruct[tIdx].subtopics = subs;
                                                    setMatrixStructure(newStruct);
                                                }
                                                setDraggedSubtopic(null);
                                            }}
                                            onDragEnd={(e) => { 
                                                e.stopPropagation(); 
                                                setDraggedSubtopic(null); 
                                            }}
                                            className={draggedSubtopic?.tIdx === tIdx && draggedSubtopic?.sIdx === sIdx ? 'opacity-30 bg-blue-100' : 'cursor-move'}
                                            title="💡 Kéo thả hàng này để đổi vị trí nội dung kiến thức"
                                          >
                                            {sIdx === 0 && <td className="border border-black p-1 text-center" rowSpan={topicObj.subtopics.length}>{tIdx + 1}</td>}
                                            {sIdx === 0 && <td className="border border-black p-1" rowSpan={topicObj.subtopics.length}>{topic}</td>}
                                            <td className="border border-black p-1">{sub}</td>
                                            
                                            {/* Nhiều lựa chọn */}
                                            <td className="border border-black p-1 text-center">{rowData.mc.nb || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.mc.th || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.mc.vd || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.mc.vdc || ''}</td>
                                            
                                            {/* Đúng sai */}
                                            <td className="border border-black p-1 text-center">{rowData.tf.nb || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.tf.th || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.tf.vd || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.tf.vdc || ''}</td>
                                            
                                            {/* Trả lời ngắn */}
                                            <td className="border border-black p-1 text-center">{rowData.sa.nb || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.sa.th || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.sa.vd || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.sa.vdc || ''}</td>
                                            
                                            {/* Tự luận */}
                                            <td className="border border-black p-1 text-center">{rowData.es.nb || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.es.th || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.es.vd || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.es.vdc || ''}</td>
                                            
                                            {/* Tổng */}
                                            <td className="border border-black p-1 text-center font-bold">{totalNB || ''}</td>
                                            <td className="border border-black p-1 text-center font-bold">{totalTH || ''}</td>
                                            <td className="border border-black p-1 text-center font-bold">{totalVD || ''}</td>
                                            <td className="border border-black p-1 text-center font-bold">{totalVDC || ''}</td>
                                            
                                            <td className="border border-black p-1 text-center">{rowPercent > 0 ? rowPercent + '%' : ''}</td>
                                          </tr>
                                        );
                                     })}
                                   </tbody>
                                 );
                              })}
                              
                              {/* Dòng TỔNG CỘNG */}
                              <tbody className="no-drag">
                                {(() => {
                                    const getGlobalCount = (type: string, lvl: string) => {
                                          return questions.filter(q => {
                                              if (q.type !== type) return false;
                                              const l = (q.level || '').toLowerCase();
                                              if (lvl === 'nb') return l.includes('biết');
                                              if (lvl === 'th') return l.includes('hiểu');
                                              if (lvl === 'vdc') return l.includes('cao');
                                              if (lvl === 'vd') return l.includes('dụng') && !l.includes('cao');
                                              return false;
                                          }).length;
                                    };
                                    const totals = {
                                        mc: { nb: getGlobalCount('mc','nb'), th: getGlobalCount('mc','th'), vd: getGlobalCount('mc','vd'), vdc: getGlobalCount('mc','vdc') },
                                        tf: { nb: getGlobalCount('tf','nb'), th: getGlobalCount('tf','th'), vd: getGlobalCount('tf','vd'), vdc: getGlobalCount('tf','vdc') },
                                        sa: { nb: getGlobalCount('sa','nb'), th: getGlobalCount('sa','th'), vd: getGlobalCount('sa','vd'), vdc: getGlobalCount('sa','vdc') },
                                        es: { nb: getGlobalCount('essay','nb'), th: getGlobalCount('essay','th'), vd: getGlobalCount('essay','vd'), vdc: getGlobalCount('essay','vdc') }
                                    };
                                    const gNB = totals.mc.nb + totals.tf.nb + totals.sa.nb + totals.es.nb;
                                    const gTH = totals.mc.th + totals.tf.th + totals.sa.th + totals.es.th;
                                    const gVD = totals.mc.vd + totals.tf.vd + totals.sa.vd + totals.es.vd;
                                    const gVDC = totals.mc.vdc + totals.tf.vdc + totals.sa.vdc + totals.es.vdc;
                                    
                                    const pts = {
                                        mc: totals.mc.nb*ptMC.average + totals.mc.th*ptMC.average + totals.mc.vd*ptMC.average + totals.mc.vdc*ptMC.average,
                                        tf: totals.tf.nb*ptTF.average + totals.tf.th*ptTF.average + totals.tf.vd*ptTF.average + totals.tf.vdc*ptTF.average,
                                        sa: totals.sa.nb*ptSA.average + totals.sa.th*ptSA.average + totals.sa.vd*ptSA.average + totals.sa.vdc*ptSA.average,
                                        es: totals.es.nb*ptES.average + totals.es.th*ptES.average + totals.es.vd*ptES.average + totals.es.vdc*ptES.average
                                    };
                                    const globalTotalPts = pts.mc + pts.tf + pts.sa + pts.es;
                                    
                                    return (
                                      <>
                                          <tr className="font-bold bg-slate-50">
                                              <td className="border border-black p-1 text-center" colSpan={3}>Tổng số câu</td>
                                              <td className="border border-black p-1 text-center">{totals.mc.nb || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.mc.th || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.mc.vd || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.mc.vdc || ''}</td>
                                              
                                              <td className="border border-black p-1 text-center">{totals.tf.nb || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.tf.th || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.tf.vd || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.tf.vdc || ''}</td>
                                              
                                              <td className="border border-black p-1 text-center">{totals.sa.nb || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.sa.th || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.sa.vd || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.sa.vdc || ''}</td>
                                              
                                              <td className="border border-black p-1 text-center">{totals.es.nb || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.es.th || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.es.vd || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.es.vdc || ''}</td>
                                              
                                              <td className="border border-black p-1 text-center">{gNB || ''}</td>
                                              <td className="border border-black p-1 text-center">{gTH || ''}</td>
                                              <td className="border border-black p-1 text-center">{gVD || ''}</td>
                                              <td className="border border-black p-1 text-center">{gVDC || ''}</td>
                                              <td className="border border-black p-1 text-center">{gNB+gTH+gVD+gVDC}</td>
                                          </tr>
                                          <tr className="font-bold bg-slate-50">
                                              <td className="border border-black p-1 text-center" colSpan={3}>Tổng số điểm</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{pts.mc > 0 ? pts.mc : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{pts.tf > 0 ? pts.tf : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{pts.sa > 0 ? pts.sa : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{pts.es > 0 ? pts.es : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{globalTotalPts > 0 ? globalTotalPts : ''}</td>
                                              <td className="border border-black p-1 text-center">10.0</td>
                                          </tr>
                                          <tr className="font-bold bg-slate-50">
                                              <td className="border border-black p-1 text-center" colSpan={3}>Tỉ lệ %</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{globalTotalPts > 0 ? Math.round(pts.mc/globalTotalPts*100) + '%' : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{globalTotalPts > 0 ? Math.round(pts.tf/globalTotalPts*100) + '%' : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{globalTotalPts > 0 ? Math.round(pts.sa/globalTotalPts*100) + '%' : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{globalTotalPts > 0 ? Math.round(pts.es/globalTotalPts*100) + '%' : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={5}>100%</td>
                                          </tr>
                                      </>
                                    );
                                })()}
                              </tbody>

                          </table>
                      </div>
                    </div>
                  )}

                  {/* BẢN ĐẶC TẢ ĐỀ KIỂM TRA */}
                  {outputConfig.spec && (
                    <div className="border border-slate-200 rounded-lg p-6 space-y-6 bg-white overflow-x-auto printable-spec mt-6" id="spec-container">
                      <div className="flex justify-between items-center mb-4 no-print">
                        <div className="flex-1 text-center">
                          <h2 className="text-xl font-bold">BẢN ĐẶC TẢ ĐỀ KIỂM TRA</h2>
                          <p className="text-sm text-slate-500 font-normal no-print italic mt-1">Bản mô tả chi tiết yêu cầu cần đạt và cấu trúc câu hỏi theo chuẩn Bộ GD&ĐT 2025</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => {
                                const wrap = document.getElementById('spec-table-wrap');
                                if (!wrap) return;
                                exportHtmlToWord(wrap, 'Ban_Dac_Ta_De_Kiem_Tra.doc');
                            }} className="px-3 py-1.5 bg-blue-50 text-blue-600 font-medium rounded hover:bg-blue-100 flex items-center gap-2 text-sm border border-blue-200 no-print">
                              Xuất Word
                            </button>
                            <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-50 text-slate-600 font-medium rounded hover:bg-slate-200 flex items-center gap-2 text-sm border border-slate-300 no-print">
                              <Printer className="w-4 h-4" /> In PDF
                            </button>
                        </div>
                      </div>
                      <div id="spec-table-wrap">
                          <table className="w-full border-collapse border border-black text-[13px] min-w-[1000px] font-serif text-black" style={{fontFamily: '"Times New Roman", Times, serif'}}>
                            <thead>
                              <tr className="bg-slate-50 text-center font-bold">
                                <th className="border border-black p-2 w-12" rowSpan={2}>TT</th>
                                <th className="border border-black p-2 w-48" rowSpan={2}>Chủ đề/Chương</th>
                                <th className="border border-black p-2 w-48" rowSpan={2}>Nội dung/Đơn vị kiến thức</th>
                                <th className="border border-black p-2" rowSpan={2}>Mức độ đánh giá / Yêu cầu cần đạt</th>
                                <th className="border border-black p-2" colSpan={4}>Số câu hỏi theo các mức độ nhận thức</th>
                                <th className="border border-black p-2 w-40" rowSpan={2}>Câu hỏi tương ứng</th>
                              </tr>
                              <tr className="bg-slate-50 text-center font-bold">
                                <th className="border border-black p-2 w-16">Biết</th>
                                <th className="border border-black p-2 w-16">Hiểu</th>
                                <th className="border border-black p-2 w-16">VD</th>
                                <th className="border border-black p-2 w-16">VDC</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                 const getSpecificationText = (subtopic: string, level: string): string => {
                                   const s = (subtopic || '').toLowerCase();
                                   const l = (level || '').toLowerCase();
                                   
                                   if (s.includes('đơn điệu') || s.includes('đồng biến') || s.includes('nghịch biến')) {
                                     if (l === 'nb') return "Nhận biết tính đơn điệu (đồng biến, nghịch biến) của hàm số dựa trên đồ thị hoặc bảng biến thiên cho trước.";
                                     if (l === 'th') return "Xác định các khoảng đơn điệu của một hàm số cho trước bằng cách xét dấu đạo hàm f'(x) hoặc lập bảng biến thiên.";
                                     if (l === 'vd') return "Vận dụng tính đơn điệu để giải quyết các bài toán chứa tham số thực m hoặc các bài toán liên hệ thực tế.";
                                     return "Vận dụng cao tìm tham số để các hàm liên kết, hàm hợp, hàm ẩn đồng biến hoặc nghịch biến trên khoảng xác định.";
                                   }
                                   if (s.includes('cực trị') || s.includes('cực đại') || s.includes('cực tiểu')) {
                                     if (l === 'nb') return "Nhận biết điểm cực đại, điểm cực tiểu, cực trị của hàm số hoặc đồ thị hàm số từ bảng biến thiên hoặc đồ thị.";
                                     if (l === 'th') return "Tìm cực trị của hàm số cho trước bằng quy tắc I hoặc quy tắc II đạo hàm.";
                                     if (l === 'vd') return "Tìm tham số m để hàm số đạt cực đại, cực tiểu tại điểm hoặc có số lượng cực trị thỏa mãn điều kiện.";
                                     return "Vận dụng cao giải quyết các bài toán cực trị liên quan đến hàm hợp, hàm ẩn, bất đẳng thức phức tạp.";
                                   }
                                   if (s.includes('tiệm cận')) {
                                     if (l === 'nb') return "Nhận biết đường tiệm cận đứng, tiệm cận ngang của đồ thị hàm số từ bảng biến thiên hoặc đồ thị.";
                                     if (l === 'th') return "Tìm các đường tiệm cận đứng, tiệm cận ngang của đồ thị hàm số phân thức cụ thể bằng giới hạn.";
                                     if (l === 'vd') return "Tìm tham số m để đồ thị hàm số có số lượng đường tiệm cận đứng, tiệm cận ngang thỏa mãn điều kiện cho trước.";
                                     return "Vận dụng cao giải quyết các bài toán về tiệm cận của đồ thị hàm số chứa căn thức, hàm ẩn phức tạp.";
                                   }
                                   if (s.includes('lớn nhất') || s.includes('nhỏ nhất') || s.includes('gtln') || s.includes('gtnn')) {
                                     if (l === 'nb') return "Nhận biết GTLN, GTNN của hàm số trên một đoạn từ bảng biến thiên hoặc đồ thị cho trước.";
                                     if (l === 'th') return "Tìm GTLN và GTNN của hàm số trên một đoạn hoặc khoảng xác định bằng đạo hàm.";
                                     if (l === 'vd') return "Vận dụng giá trị lớn nhất, giá trị nhỏ nhất của hàm số để giải quyết các bài toán tối ưu thực tiễn đời sống.";
                                     return "Vận dụng cao tìm GTLN, GTNN của biểu thức nhiều biến số, hàm hợp, hàm ẩn chứa tham số thực m.";
                                   }
                                   if (s.includes('đồ thị') || s.includes('khảo sát')) {
                                     if (l === 'nb') return "Nhận dạng đồ thị các hàm số bậc ba, bậc bốn trùng phương, phân thức bậc nhất/bậc nhất.";
                                     if (l === 'th') return "Xác định các hệ số của hàm số, tọa độ giao điểm, số nghiệm của phương trình từ đồ thị.";
                                     if (l === 'vd') return "Vận dụng đồ thị để biện luận số nghiệm của phương trình chứa tham số m.";
                                     return "Vận dụng cao đồ thị hàm số để giải các bài toán tương giao phức tạp, liên kết thực tế.";
                                   }
                                   if (s.includes('tọa độ') || s.includes('vectơ') || s.includes('vector')) {
                                     if (l === 'nb') return "Nhận biết tọa độ vectơ, tọa độ điểm, các phép toán cộng, trừ vectơ, nhân vectơ với số trong không gian.";
                                     if (l === 'th') return "Tính tích vô hướng, tích có hướng, độ dài vectơ, góc giữa hai vectơ, chứng minh đồng phẳng.";
                                     if (l === 'vd') return "Vận dụng tọa độ vectơ để giải quyết bài toán mô phỏng vật lý, địa chất, đường bay thực tế.";
                                     return "Vận dụng cao phương pháp tọa độ để giải bài toán hình học không gian, tìm cực trị khoảng cách.";
                                   }
                                   if (s.includes('mặt phẳng')) {
                                     if (l === 'nb') return "Nhận biết vectơ pháp tuyến của mặt phẳng, phương trình tổng quát mặt phẳng cơ bản.";
                                     if (l === 'th') return "Viết phương trình mặt phẳng đi qua các điểm, song song hoặc vuông góc với mặt phẳng khác.";
                                     if (l === 'vd') return "Vận dụng tính khoảng cách từ điểm đến mặt phẳng, vị trí tương đối giữa các mặt phẳng.";
                                     return "Vận dụng cao viết phương trình mặt phẳng thỏa mãn điều kiện tối ưu (khoảng cách cực đại, cực tiểu).";
                                   }
                                   if (s.includes('đường thẳng')) {
                                     if (l === 'nb') return "Nhận biết vectơ chỉ phương, phương trình tham số, phương trình chính tắc của đường thẳng.";
                                     if (l === 'th') return "Viết phương trình đường thẳng đi qua điểm, song song, vuông góc hoặc cắt đường thẳng khác.";
                                     if (l === 'vd') return "Xác định vị trí tương đối giữa hai đường thẳng, tính góc và khoảng cách giữa hai đường thẳng.";
                                     return "Vận dụng cao viết phương trình đường thẳng liên quan đến các yếu tố cực trị hình học, tương giao mặt cầu.";
                                   }
                                   if (s.includes('mặt cầu')) {
                                     if (l === 'nb') return "Nhận biết phương trình chính chính tắc, xác định tâm và bán kính mặt cầu cho trước.";
                                     if (l === 'th') return "Viết phương trình mặt cầu đi qua điểm, tiếp xúc với mặt phẳng hoặc có tâm thỏa mãn điều kiện.";
                                     if (l === 'vd') return "Xác định vị trí tương đối giữa mặt cầu và mặt phẳng, mặt cầu và đường thẳng.";
                                     return "Vận dụng cao bài toán tiếp xúc, tương giao cực trị liên quan đến mặt cầu, đường thẳng và mặt phẳng.";
                                   }
                                   if (s.includes('lượng giác')) {
                                     if (l === 'nb') return "Nhận biết góc lượng giác, giá trị lượng giác của góc lượng giác, công thức lượng giác cơ bản.";
                                     if (l === 'th') return "Giải phương trình lượng giác cơ bản, áp dụng công thức biến đổi lượng giác để rút gọn biểu thức.";
                                     if (l === 'vd') return "Vận dụng phương trình lượng giác giải quyết các bài toán chu kỳ, dao động điều hòa thực tế.";
                                     return "Vận dụng cao phương trình lượng giác chứa tham số, tìm nghiệm trong khoảng, cực trị lượng giác.";
                                   }
                                   if (s.includes('mũ') || s.includes('logarit') || s.includes('lôgarit')) {
                                     if (l === 'nb') return "Nhận biết lũy thừa, logarit, tính chất mũ và logarit cơ bản.";
                                     if (l === 'th') return "Giải phương trình mũ, phương trình logarit cơ bản bằng biến đổi biến số hoặc đưa về cùng cơ số.";
                                     if (l === 'vd') return "Vận dụng hàm số mũ và logarit giải quyết bài toán tăng trưởng dân số, lãi suất ngân hàng, độ phóng xạ.";
                                     return "Vận dụng cao phương trình, bất phương trình mũ/logarit chứa tham số thực m, hệ phương trình phức tạp.";
                                   }
                                   if (s.includes('tích phân') || s.includes('nguyên hàm')) {
                                     if (l === 'nb') return "Nhận biết khái niệm nguyên hàm, tính chất nguyên hàm, tích phân và bảng nguyên hàm cơ bản.";
                                     if (l === 'th') return "Tính nguyên hàm, tích phân bằng phương pháp đổi biến số, từng phần hoặc áp dụng tính chất định nghĩa.";
                                     if (l === 'vd') return "Vận dụng tích phân để tính diện tích hình phẳng, thể tích vật thể tròn xoay và bài toán chuyển động.";
                                     return "Vận dụng cao nguyên hàm, tích phân liên quan đến hàm ẩn, bài toán tối ưu kinh tế phức tạp.";
                                   }
                                   if (s.includes('xác suất') || s.includes('tổ hợp') || s.includes('nhị thức')) {
                                     if (l === 'nb') return "Nhận biết hoán vị, chỉnh hợp, tổ hợp, quy tắc cộng, quy tắc nhân cơ bản.";
                                     if (l === 'th') return "Tính xác suất của biến cố trong các trò chơi hoặc hoạt động chọn mẫu đơn giản.";
                                     if (l === 'vd') return "Vận dụng công thức nhị thức Newton, xác suất có điều kiện, sơ đồ hình cây giải quyết bài toán mẫu.";
                                     return "Vận dụng cao các bài toán xác suất thực tế phức tạp, phân phối nhị thức, trò chơi chiến thuật.";
                                   }
                                   
                                   // Fallback
                                   const lvlName = l === 'nb' ? 'Nhận biết' : l === 'th' ? 'Thông hiểu' : l === 'vd' ? 'Vận dụng' : 'Vận dụng cao';
                                   return `${lvlName}: Hiểu và vận dụng các kiến thức, kỹ năng giải toán về đơn vị kiến thức "${subtopic}".`;
                                 };

                                 return matrixStructure.map((topicObj, tIdx) => {
                                    const topic = topicObj.topic;
                                    const topicQs = questions.filter(q => (q.topic || 'Chủ đề trọng tâm') === topic);
                                    
                                    // Precalculate total rows for this topic
                                    let topicRowSpan = 0;
                                    const subtopicsData = topicObj.subtopics.map(sub => {
                                      const subQs = topicQs.filter(q => (q.subtopic || 'Nội dung kiến thức') === sub);
                                      const levels = ['nb', 'th', 'vd', 'vdc'].filter(lvl => {
                                        return subQs.some(q => {
                                          const l = (q.level || '').toLowerCase();
                                          if (lvl === 'nb') return l.includes('biết');
                                          if (lvl === 'th') return l.includes('hiểu');
                                          if (lvl === 'vdc') return l.includes('cao');
                                          if (lvl === 'vd') return l.includes('dụng') && !l.includes('cao');
                                          return false;
                                        });
                                      });
                                      const finalLevels = levels.length > 0 ? levels : ['nb']; // fallback
                                      topicRowSpan += finalLevels.length;
                                      return { sub, subQs, finalLevels };
                                    });

                                    return (
                                      <React.Fragment key={`spec-t-${tIdx}`}>
                                        {subtopicsData.map((subData, sIdx) => {
                                          const { sub, subQs, finalLevels } = subData;
                                          return finalLevels.map((lvl, lIdx) => {
                                            const isFirstRowOfTopic = sIdx === 0 && lIdx === 0;
                                            const isFirstRowOfSubtopic = lIdx === 0;
                                            
                                            // Get level specific count
                                            const getLevelCount = (lvlStr: string) => {
                                              return subQs.filter(q => {
                                                const l = (q.level || '').toLowerCase();
                                                if (lvlStr === 'nb') return l.includes('biết');
                                                if (lvlStr === 'th') return l.includes('hiểu');
                                                if (lvlStr === 'vdc') return l.includes('cao');
                                                if (lvlStr === 'vd') return l.includes('dụng') && !l.includes('cao');
                                                return false;
                                              }).length;
                                            };

                                            const countNB = lvl === 'nb' ? getLevelCount('nb') : 0;
                                            const countTH = lvl === 'th' ? getLevelCount('th') : 0;
                                            const countVD = lvl === 'vd' ? getLevelCount('vd') : 0;
                                            const countVDC = lvl === 'vdc' ? getLevelCount('vdc') : 0;

                                            // Get question list
                                            const matchingQs = subQs.filter(q => {
                                              const l = (q.level || '').toLowerCase();
                                              if (lvl === 'nb') return l.includes('biết');
                                              if (lvl === 'th') return l.includes('hiểu');
                                              if (lvl === 'vdc') return l.includes('cao');
                                              if (lvl === 'vd') return l.includes('dụng') && !l.includes('cao');
                                              return false;
                                            });

                                            const qLabels = matchingQs.map(q => {
                                              const qNum = questions.indexOf(q) + 1;
                                              return `Câu ${qNum}`;
                                            }).join(', ');

                                            const specDesc = getSpecificationText(sub, lvl);

                                            return (
                                              <tr key={`spec-sub-${tIdx}-${sIdx}-${lvl}`}>
                                                {isFirstRowOfTopic && (
                                                  <td className="border border-black p-2 text-center align-middle font-bold" rowSpan={topicRowSpan}>
                                                    {tIdx + 1}
                                                  </td>
                                                )}
                                                {isFirstRowOfTopic && (
                                                  <td className="border border-black p-2 font-bold align-middle" rowSpan={topicRowSpan}>
                                                    {topic}
                                                  </td>
                                                )}
                                                {isFirstRowOfSubtopic && (
                                                  <td className="border border-black p-2 align-middle font-medium" rowSpan={finalLevels.length}>
                                                    {sub}
                                                  </td>
                                                )}
                                                <td className="border border-black p-2">
                                                  {specDesc}
                                                </td>
                                                <td className="border border-black p-2 text-center font-semibold">{countNB || ''}</td>
                                                <td className="border border-black p-2 text-center font-semibold">{countTH || ''}</td>
                                                <td className="border border-black p-2 text-center font-semibold">{countVD || ''}</td>
                                                <td className="border border-black p-2 text-center font-semibold">{countVDC || ''}</td>
                                                <td className="border border-black p-2 text-center text-xs font-mono text-indigo-700">
                                                  {qLabels || ''}
                                                </td>
                                              </tr>
                                            );
                                          });
                                        })}
                                      </React.Fragment>
                                    );
                                 });
                              })()}
                            </tbody>
                          </table>
                      </div>
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-lg p-6 space-y-6 bg-white" id="original-exam">

                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                      <h2 className="text-xl font-bold text-slate-800">{examName}</h2>
                      <div className="flex flex-wrap items-center gap-2">
                        {(() => {
                          const rwCount = questions.filter(q => isRealWorldQuestion(q)).length;
                          return (
                            <>
                              <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-medium">
                                Tổng: {questions.length} câu
                              </span>
                              {rwCount > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-semibold flex items-center gap-1">
                                  <Compass className="w-3.5 h-3.5" /> {rwCount} câu thực tế ({Math.round(rwCount / questions.length * 100)}%)
                                </span>
                              )}
                            </>
                          );
                        })()}
                        {questions.length > 0 && (
                          <>
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                              <span className="text-[11px] font-bold text-slate-600 pl-1.5 pr-0.5 flex items-center gap-1">
                                🎨 Vẽ hình:
                              </span>
                              <button
                                type="button"
                                onClick={() => { setExamVisualizerTab("bbt"); setIsExamVisualizerOpen(true); }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="Mở Module Bảng biến thiên (BBT Chuẩn SGK)"
                              >
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                <span>BBT</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setExamVisualizerTab("graph"); setIsExamVisualizerOpen(true); }}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="Mở Module Đồ thị hàm số & Bất phương trình 2D"
                              >
                                <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Đồ thị</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setExamVisualizerTab("geometry3d"); setIsExamVisualizerOpen(true); }}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="Mở Module Hình học không gian 3D (Chóp, Lăng trụ, Hộp, Nón, Trụ, Cầu)"
                              >
                                <Box className="w-3.5 h-3.5 text-purple-600" />
                                <span>Hình 3D</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setExamVisualizerTab("statistics"); setIsExamVisualizerOpen(true); }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="Mở Module Biểu đồ & Thống kê"
                              >
                                <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                                <span>Thống kê</span>
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setQuestions(prev => prev.map((q: any) => ({
                                  ...q,
                                  content: run1ClickMathFix(q.content),
                                  solution: q.solution ? run1ClickMathFix(q.solution) : q.solution,
                                  explanation: q.explanation ? run1ClickMathFix(q.explanation) : q.explanation,
                                  options: q.options ? q.options.map((opt: string) => run1ClickMathFix(opt)) : q.options,
                                  tfStatements: q.tfStatements ? q.tfStatements.map((tf: any) => ({
                                    ...tf,
                                    statement: run1ClickMathFix(tf.statement)
                                  })) : q.tfStatements
                                })));
                              }}
                              className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-500 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                              title="Tự động phát hiện và làm sạch 100% công thức Toán trong toàn bộ câu hỏi và đáp án đề thi"
                            >
                              <Wand2 className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                              <span>⚡ Sửa lỗi Toán 1-Click</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleAutoGenerateAllBbtAndGraphs}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              title="Tự động quét và chuẩn hóa toàn bộ Bảng biến thiên (BBT) & Đồ thị trong đề thi thành dạng ảnh SVG chuẩn SGK"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✨ Tự động xuất BBT/Đồ thị ảnh</span>
                            </button>
                            <button
                              type="button"
                              onClick={toggleAllSolutions}
                              className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              title="Bật/Tắt hiển thị lời giải chi tiết cho tất cả câu hỏi"
                            >
                              <span>{showAllSolutions ? "🙈 Ẩn tất cả lời giải" : "👁️ Hiện tất cả lời giải"}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Modal Công cụ Vẽ hình Toán học GDPT 2018 Toàn diện */}
                    {isExamVisualizerOpen && (
                      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-2xs">
                                <Sparkles className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-800 text-base">
                                  Công cụ Vẽ hình & Đồ thị Toán học (Soạn thảo Đề thi GDPT 2018)
                                </h3>
                                <p className="text-xs text-slate-500">
                                  Vẽ BBT chuẩn SGK, Đồ thị 2D & Miền nghiệm BPT, Hình không gian 3D, Biểu đồ Thống kê chèn vào câu hỏi đề thi
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {questions.length > 0 && (
                                <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                  <span className="font-semibold text-slate-700">Chèn vào:</span>
                                  <select
                                    value={examVisualizerTargetQ}
                                    onChange={e => setExamVisualizerTargetQ(Number(e.target.value))}
                                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 cursor-pointer"
                                  >
                                    {questions.map((_, i) => (
                                      <option key={i} value={i + 1}>Câu {i + 1}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsExamVisualizerOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          <QuestionVisualizerPanel
                            questionNumber={examVisualizerTargetQ}
                            questionContent={questions[examVisualizerTargetQ - 1]?.content || ""}
                            solutionContent={questions[examVisualizerTargetQ - 1]?.solution || questions[examVisualizerTargetQ - 1]?.explanation || ""}
                            defaultTab={examVisualizerTab}
                            defaultTarget="content"
                            onInsertSnippet={(target, snippet) => {
                              handleInsertVisualizerSnippet(examVisualizerTargetQ - 1, target, snippet);
                              setIsExamVisualizerOpen(false);
                            }}
                            onClose={() => setIsExamVisualizerOpen(false)}
                          />
                        </div>
                      </div>
                    )}
                    {questions.map((q, idx) => (
                      <div key={idx} className="pb-5 border-b border-slate-100 last:border-0 space-y-3">
                        {/* 1. Professional Header Row for Question Actions & Metadata */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 no-print">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-sm text-indigo-950">Câu {idx + 1}:</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md uppercase">
                              [{q.level || 'Nhận biết'}]
                            </span>
                            {isRealWorldQuestion(q) && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md flex items-center gap-1 shadow-2xs" title="Câu hỏi có bối cảnh thực tế">
                                🌍 Thực tế
                              </span>
                            )}
                          </div>
                          
                          {/* Toolbar Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setGeoGebraTarget({ qIndex: idx, target: "content" })}
                              className="text-[11px] px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded border border-teal-300 flex items-center gap-1 cursor-pointer transition-colors font-semibold shadow-2xs"
                              title="Vẽ hình minh họa bằng GeoGebra và chèn vào câu hỏi"
                            >
                              <span>📐 GeoGebra</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "content") {
                                  setActiveVisualizer(null);
                                } else {
                                  setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "content" });
                                }
                              }}
                              className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-colors shadow-2xs font-semibold ${
                                activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "content"
                                  ? "bg-emerald-600 text-white border-emerald-700"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                              }`}
                              title="Tích hợp Module Bảng biến thiên (BBT): Phân tích hàm số, tinh chỉnh và chèn BBT vào câu hỏi"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>BBT</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAiFixBbtForExamQuestion(q, idx)}
                              className="text-[11px] px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-300 flex items-center gap-1 cursor-pointer transition-colors font-semibold shadow-2xs"
                              title="Tự động vẽ Bảng biến thiên (dạng ảnh SVG chuẩn SGK) cho câu hỏi này"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              <span>✨ AI vẽ BBT ảnh</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "content") {
                                  setActiveVisualizer(null);
                                } else {
                                  setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" });
                                }
                              }}
                              className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-colors shadow-2xs font-semibold ${
                                activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "content"
                                  ? "bg-blue-600 text-white border-blue-700"
                                  : "bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100"
                              }`}
                              title="Tích hợp Module Đồ thị & BPT: Khảo sát hàm số trực quan, điều chỉnh hệ số và chèn đồ thị vào câu hỏi"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                              <span>Đồ thị</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "content") {
                                  setActiveVisualizer(null);
                                } else {
                                  setActiveVisualizer({ qIndex: idx, tab: "geometry3d", target: "content" });
                                }
                              }}
                              className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-colors shadow-2xs font-semibold ${
                                activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "content"
                                  ? "bg-purple-600 text-white border-purple-700"
                                  : "bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100"
                              }`}
                              title="Tích hợp Module Hình không gian 3D: Chóp, Lăng trụ, Hộp, Nón, Trụ, Cầu"
                            >
                              <Box className="w-3.5 h-3.5" />
                              <span>Hình 3D</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "content") {
                                  setActiveVisualizer(null);
                                } else {
                                  setActiveVisualizer({ qIndex: idx, tab: "statistics", target: "content" });
                                }
                              }}
                              className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-colors shadow-2xs font-semibold ${
                                activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "content"
                                  ? "bg-amber-600 text-white border-amber-700"
                                  : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                              }`}
                              title="Tích hợp Module Thống kê: Chèn Biểu đồ hoặc Bảng tần số"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              <span>Thống kê</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAutoGenerateGraphForExamQuestion(q, idx)}
                              className="text-[11px] px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded border border-blue-300 flex items-center gap-1 cursor-pointer transition-colors font-semibold shadow-2xs"
                              title="Mở công cụ xuất Đồ thị hàm số dạng ảnh cho câu hỏi này"
                            >
                              <span>📊 Xuất Đồ thị ảnh</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingExamQuestion({ question: q, index: idx })}
                              className="text-[11px] px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded border border-amber-300 flex items-center gap-1 cursor-pointer transition-colors font-bold shadow-2xs"
                              title="Chỉnh sửa câu hỏi, chèn Bảng biến thiên, sửa phương án & lời giải"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAiRegenerateExamQuestion(q, idx)}
                              className="text-[11px] px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300 flex items-center gap-1 cursor-pointer transition-colors font-bold shadow-2xs"
                              title="AI tạo lại câu này kèm Bảng biến thiên và lời giải chi tiết từng bước"
                            >
                              ✨ AI tạo lại
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAiReplaceExamQuestion(q, idx)}
                              className="text-[11px] px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded border border-purple-300 flex items-center gap-1 cursor-pointer transition-colors font-bold shadow-2xs"
                              title="Đổi câu tương đương khác"
                            >
                              🔄 Đổi câu
                            </button>
                            <button 
                              type="button"
                              onClick={() => saveToBank(q)} 
                              className="text-[11px] px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-300 hover:bg-slate-200 font-semibold cursor-pointer shadow-2xs" 
                              title="Lưu vào Ngân hàng CH"
                            >
                              + Lưu NH
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                if (confirm("Xóa câu hỏi này khỏi đề?")) {
                                   const updated = questions.filter(item => item.id !== q.id);
                                   setQuestions(updated);
                                }
                              }} 
                              className="text-[11px] px-2 py-1 bg-red-100 text-red-700 rounded border border-red-300 hover:bg-red-200 font-bold cursor-pointer shadow-2xs" 
                              title="Xóa khỏi đề"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>

                        {/* 2. Full-Width Question Stem Content Block */}
                        <div className="font-medium text-slate-800 text-sm sm:text-base leading-relaxed pl-1 flex items-start gap-2">
                          <span className="font-black text-indigo-950 whitespace-nowrap mt-1">Câu {idx + 1}:</span>
                          <div className="flex-1 min-w-0">
                            <MarkdownRenderer className="markdown-body" content={cleanQuestionStem(q.content || (q as any).question || (q as any).text || '', q.options, q.tfStatements)} /> 
                          </div>
                        </div>

                        {/* Missing BBT alert */}
                        {isMissingBbt(q.content) && (
                          <div className="flex flex-wrap items-center justify-between p-2.5 my-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 shadow-2xs gap-2 no-print">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="text-base">⚠️</span>
                              <span>Đề bài nhắc đến <strong>Bảng biến thiên</strong> nhưng chưa có bảng/hình hiển thị.</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "content" })}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="Mở Module Bảng biến thiên để chọn mẫu hoặc tinh chỉnh và chèn vào câu hỏi"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>📈 Mở Module BBT & Chọn</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAiFixBbtForExamQuestion(q, idx)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>✨ AI vẽ BBT ngay</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingExamQuestion({ question: q, index: idx })}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-amber-800 border border-amber-300 rounded-md font-medium cursor-pointer"
                              >
                                <span>✏️ Tự chèn BBT</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Missing Graph alert */}
                        {isMissingGraph(q.content) && (
                          <div className="flex flex-wrap items-center justify-between p-2.5 my-2 bg-blue-50 border border-blue-300 rounded-lg text-xs text-blue-900 shadow-2xs gap-2 no-print">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="text-base">📊</span>
                              <span>Đề bài nhắc đến <strong>Đồ thị / Hình vẽ</strong> nhưng chưa có hình hiển thị.</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setActiveVisualizer({ qIndex: idx, tab: "graph", target: "content" })}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="Mở Module Đồ thị để vẽ và chèn hình vào câu hỏi"
                              >
                                <BarChart2 className="w-3.5 h-3.5" />
                                <span>📊 Mở Module Đồ thị & Chèn</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAutoGenerateGraphForExamQuestion(q, idx)}
                                className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>✨ Tự động xuất Đồ thị ảnh</span>
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {q.type === 'tf' && q.tfStatements && (
                          <div className="flex flex-col gap-3 pl-4">
                            {q.tfStatements.map((stmt, sIdx) => (
                              <div key={sIdx} className="flex items-start gap-1 p-2 rounded-md border border-transparent">
                                <span className="shrink-0 font-medium">{['a)', 'b)', 'c)', 'd)'][sIdx] || String.fromCharCode(97 + sIdx) + ')'}</span>
                                <MarkdownRenderer className="markdown-body inline-block" content={fixMath(stmt.statement || '')} />
                                <span className={`shrink-0 font-bold px-2 rounded ${stmt.correct ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>
                                  {stmt.correct ? 'Đ' : 'S'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'mc' && q.options && (() => {
                          const cleanedOpts = q.options.map((opt: string) => cleanOptionText(opt));
                          const maxLen = Math.max(...cleanedOpts.map((o: string) => (o || '').length), 0);
                          const gridCols = maxLen <= 18 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' : maxLen <= 45 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1';
                          return (
                            <div className={cn("w-full grid gap-2 pl-2 mt-2 mb-3", gridCols)}>
                              {cleanedOpts.map((opt, oIdx) => (
                                <div key={oIdx} className={`min-h-[40px] flex items-center px-3.5 py-1.5 text-left rounded-lg border transition-colors break-words overflow-hidden ${oIdx === q.correctOptionIndex ? 'bg-emerald-50 border-emerald-300 font-medium text-emerald-950' : 'bg-slate-50/50 border-slate-200/80 text-slate-800'}`}>
                                  <span className="shrink-0 font-bold select-none min-w-[1.75rem] whitespace-nowrap text-slate-900">{String.fromCharCode(65 + oIdx)}.</span>
                                  <span className="flex-1 break-words overflow-hidden"><MarkdownRenderer inline={true} className="markdown-body inline align-baseline" content={fixMath(opt)} /></span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        
                        {q.type !== 'mc' && q.correctAnswer && (
                          <div className="mt-2 pl-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <span className="font-semibold text-emerald-800">Đáp án:</span> <MarkdownRenderer className="markdown-body inline-block" content={fixMath(q.correctAnswer || '')} />
                          </div>
                        )}

                        {/* Lời giải chi tiết accordion */}
                        <div className="mt-3 pl-2 no-print">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => toggleSolution(q.id || idx + 1)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                            >
                              <span>{isSolutionOpen(q.id || idx + 1) ? "🙈 Ẩn lời giải" : "💡 Xem lời giải chi tiết"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                                if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "solution") {
                                  setActiveVisualizer(null);
                                } else {
                                  setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "solution" });
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                                activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "bbt" && activeVisualizer?.target === "solution"
                                  ? "bg-emerald-600 text-white border-emerald-700"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                              }`}
                              title="Tích hợp Module BBT: Chèn Bảng biến thiên vào lời giải chi tiết"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>+ BBT vào lời giải</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                                if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "solution") {
                                  setActiveVisualizer(null);
                                } else {
                                  setActiveVisualizer({ qIndex: idx, tab: "graph", target: "solution" });
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                                activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "graph" && activeVisualizer?.target === "solution"
                                  ? "bg-blue-600 text-white border-blue-700"
                                  : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300"
                              }`}
                              title="Tích hợp Module Đồ thị: Chèn Đồ thị & BPT vào lời giải chi tiết"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                              <span>+ Đồ thị vào lời giải</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                                if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "solution") {
                                  setActiveVisualizer(null);
                                } else {
                                  setActiveVisualizer({ qIndex: idx, tab: "geometry3d", target: "solution" });
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                                activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "geometry3d" && activeVisualizer?.target === "solution"
                                  ? "bg-purple-600 text-white border-purple-700"
                                  : "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300"
                              }`}
                              title="Tích hợp Module Hình không gian 3D: Chèn hình chóp, lăng trụ, nón, trụ, cầu vào lời giải"
                            >
                              <Box className="w-3.5 h-3.5" />
                              <span>+ Hình 3D vào lời giải</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSolutionOpen(q.id || idx + 1)) toggleSolution(q.id || idx + 1);
                                if (activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "solution") {
                                  setActiveVisualizer(null);
                                } else {
                                  setActiveVisualizer({ qIndex: idx, tab: "statistics", target: "solution" });
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                                activeVisualizer?.qIndex === idx && activeVisualizer?.tab === "statistics" && activeVisualizer?.target === "solution"
                                  ? "bg-amber-600 text-white border-amber-700"
                                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                              }`}
                              title="Tích hợp Module Thống kê: Chèn Biểu đồ hoặc Bảng tần số vào lời giải"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              <span>+ Thống kê vào lời giải</span>
                            </button>
                          </div>

                          {isSolutionOpen(q.id || idx + 1) && (
                            <div 
                              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginTop: '8px' }}
                              className="text-slate-800 text-sm leading-relaxed"
                            >
                              <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span>💡 Lời giải chi tiết:</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => setActiveVisualizer({ qIndex: idx, tab: "bbt", target: "solution" })}
                                    className="text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-0.5 rounded bg-emerald-100/70 border border-emerald-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Mở Module BBT để chèn vào lời giải"
                                  >
                                    <TrendingUp className="w-3 h-3" />
                                    <span>Mở BBT</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveVisualizer({ qIndex: idx, tab: "graph", target: "solution" })}
                                    className="text-blue-700 hover:text-blue-900 font-semibold px-2 py-0.5 rounded bg-blue-100/70 border border-blue-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Mở Module Đồ thị để chèn vào lời giải"
                                  >
                                    <BarChart2 className="w-3 h-3" />
                                    <span>Mở Đồ thị</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveVisualizer({ qIndex: idx, tab: "geometry3d", target: "solution" })}
                                    className="text-purple-700 hover:text-purple-900 font-semibold px-2 py-0.5 rounded bg-purple-100/70 border border-purple-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Mở Module Hình không gian 3D để chèn vào lời giải"
                                  >
                                    <Box className="w-3 h-3" />
                                    <span>Mở Hình 3D</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveVisualizer({ qIndex: idx, tab: "statistics", target: "solution" })}
                                    className="text-amber-700 hover:text-amber-900 font-semibold px-2 py-0.5 rounded bg-amber-100/70 border border-amber-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Mở Module Thống kê để chèn vào lời giải"
                                  >
                                    <BarChart3 className="w-3 h-3" />
                                    <span>Mở Thống kê</span>
                                  </button>
                                </div>
                              </div>
                              <div className="text-slate-800">
                                <MarkdownRenderer content={fixMath(q.solution || q.explanation || "Chưa có lời giải chi tiết cho câu hỏi này.")} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Integrated BBT & Graph Visualizer Panel directly inside the Question & Solution block */}
                        {activeVisualizer?.qIndex === idx && (
                          <div className="mt-3 no-print">
                            <QuestionVisualizerPanel
                              questionNumber={idx + 1}
                              questionContent={q.content}
                              solutionContent={q.solution || q.explanation}
                              defaultTab={activeVisualizer.tab}
                              defaultTarget={activeVisualizer.target}
                              onInsertSnippet={(target, snippet) => handleInsertVisualizerSnippet(idx, target, snippet)}
                              onClose={() => setActiveVisualizer(null)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "shuffle" && (
            <div className="space-y-6">
              {/* CẤU HÌNH TRỘN ĐỀ BƯỚC 3 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <Shuffle className="w-5 h-5 text-emerald-600" />
                      Cấu hình & Tạo Mã Đề Hoán Vị (Bước 3)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Hệ thống tự động phân loại {questions.length} câu hỏi theo từng phần chuẩn GDPT và xáo trộn độc lập.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Mã bắt đầu:</label>
                      <input
                        type="number"
                        min="1000"
                        max="9999"
                        value={startCode}
                        onChange={e => setStartCode(Number(e.target.value) || 1001)}
                        className="w-16 px-2 py-1 text-center font-bold text-sm border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                        title="Chuẩn mã đề 4 chữ số theo cấu trúc mới (VD: 1001, 1002, 1003, 1004...)"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Số lượng mã đề:</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={numCodes}
                        onChange={e => setNumCodes(Math.min(24, Math.max(1, Number(e.target.value))))}
                        className="w-14 px-2 py-1 text-center font-bold text-sm border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      onClick={handleShuffle}
                      disabled={questions.length === 0}
                      className="px-4 py-2 bg-emerald-600 text-white font-semibold text-sm rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                    >
                      <Shuffle className="w-4 h-4" /> {shuffledExams.length > 0 ? "Trộn lại đề" : "Thực hiện Trộn Đề"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 cursor-pointer transition-colors hover:bg-emerald-50">
                    <input
                      type="checkbox"
                      checked={outputConfig.groupBySection !== false}
                      onChange={e => setOutputConfig({ ...outputConfig, groupBySection: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 mt-0.5 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          Cố định nhóm theo từng Phần (Chuẩn GDPT)
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          BẬT MẶC ĐỊNH
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Chỉ trộn câu hỏi trong nội bộ từng phần (Phần I, Phần II, Phần III, Phần IV), không làm xáo trộn lẫn lộn giữa các phần.
                      </p>
                    </div>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={outputConfig.shuffleOptions !== false}
                        onChange={e => setOutputConfig({ ...outputConfig, shuffleOptions: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 shrink-0"
                      />
                      <span className="text-xs font-medium text-slate-800">
                        Đảo thứ tự phương án A, B, C, D trong từng câu hỏi trắc nghiệm
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={outputConfig.shuffleQuestions !== false}
                        onChange={e => setOutputConfig({ ...outputConfig, shuffleQuestions: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 shrink-0"
                      />
                      <span className="text-xs font-medium text-slate-800">
                        Đảo thứ tự câu hỏi giữa các mã đề (trong nội bộ từng phần)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {shuffledExams.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Shuffle className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-slate-700">Chưa có mã đề nào được trộn.</p>
                  <p className="text-sm text-slate-500 mt-1">Bấm nút "Thực hiện Trộn Đề" ở trên để sinh các mã đề hoán vị theo chuẩn GDPT.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-4 items-center justify-between bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                    <div>
                      <h3 className="font-bold text-emerald-800">Đã trộn thành công {shuffledExams.length} mã đề ({shuffledExams.map(e => e.code).join(', ')})</h3>
                      <p className="text-sm text-emerald-600 mt-1">Sẵn sàng in ấn, xuất file Word/PDF, xuất bảng đáp án TNMaker hoặc chia sẻ cho học sinh làm bài Online.</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <button onClick={handleShare} className="px-3 sm:px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm">
                        <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Chia sẻ Online</span>
                      </button>
                      <button onClick={handleExportTNMakerExcel} className="px-3 sm:px-4 py-2 bg-white border border-emerald-600 text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 flex items-center gap-2 shadow-sm" title="Xuất file Excel đầy đủ ma trận đáp án, form TNMaker và bảng tra câu gốc">
                        <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Excel Đáp Án (TNMaker)</span>
                      </button>
                      <button onClick={handleExportCSV} className="px-3 sm:px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2 shadow-sm" title="Xuất CSV cho app chấm TNMaker">
                        <Download className="w-4 h-4" /> <span className="hidden sm:inline">CSV TNMaker</span>
                      </button>
                      <button onClick={() => setShowAnswerMatrix(!showAnswerMatrix)} className="px-3 sm:px-4 py-2 bg-white border border-blue-500 text-blue-700 font-medium rounded-lg hover:bg-blue-50 flex items-center gap-2 shadow-sm">
                        <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">{showAnswerMatrix ? "Ẩn Ma Trận" : "Xem Ma Trận"}</span>
                      </button>
                      <button onClick={() => setShowBubbleSheetModal(true)} className="px-3 sm:px-4 py-2 bg-white border border-emerald-600 text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 flex items-center gap-2 shadow-sm">
                        <FileText className="w-4 h-4" /> <span className="hidden sm:inline">In Phiếu Tô</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowWordEquationModal(true)}
                        className="px-3 sm:px-4 py-2 bg-white border border-teal-600 text-teal-700 font-semibold rounded-lg hover:bg-teal-50 flex items-center gap-2 shadow-sm cursor-pointer"
                        title="Chuyển đổi công thức sang định dạng Word Equation (Alt += / MathML / OMML)"
                      >
                        <FileCode className="w-4 h-4" /> <span className="hidden sm:inline">Mã Word (Alt +=)</span>
                      </button>
                      <button 
                        type="button"
                        onClick={toggleAllSolutions}
                        className="px-3 sm:px-4 py-2 bg-amber-50 border border-amber-300 text-amber-900 font-bold rounded-lg hover:bg-amber-100 flex items-center gap-2 shadow-sm cursor-pointer"
                        title="Bật/Tắt hiển thị lời giải chi tiết cho tất cả mã đề"
                      >
                        <span>{showAllSolutions ? "🙈 Ẩn tất cả lời giải" : "👁️ Hiện tất cả lời giải"}</span>
                      </button>
                    </div>
                  </div>

                  {shareLink && (
                    <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 rounded-xl border border-emerald-200 shadow-sm space-y-4">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Link bài thi trực tuyến</span>
                            {sharePin && (
                              <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded font-mono font-bold">
                                Mã PIN: {sharePin}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={shareLink}
                            className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm text-blue-600 font-semibold focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(shareLink);
                              alert('Đã copy link bài thi vào clipboard!');
                            }}
                            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 flex items-center gap-1.5 shadow-sm"
                          >
                            <Copy className="w-4 h-4" /> Copy Link
                          </button>

                          <button
                            onClick={() => {
                              const zaloMsg = getZaloShareMessage(shareLink, sharePin);
                              navigator.clipboard.writeText(zaloMsg);
                              setCopiedZalo(true);
                              setTimeout(() => setCopiedZalo(false), 3000);
                              alert('Đã copy tin nhắn gửi Zalo kèm Mã PIN & Hướng dẫn mở trình duyệt!\nThầy cô chỉ cần mở Zalo và dán vào nhóm lớp.');
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                          >
                            <Smartphone className="w-4 h-4" /> {copiedZalo ? "✓ Đã copy Zalo!" : "📱 Copy Tin Nhắn Gửi Zalo"}
                          </button>
                        </div>
                      </div>

                      <div className="bg-white/80 p-3 rounded-lg border border-emerald-100 text-xs text-slate-700 space-y-1">
                        <p className="font-bold text-emerald-900 flex items-center gap-1">
                          💡 Hướng dẫn gửi cho học sinh qua Zalo (Tránh bị chặn / Trắng màn hình):
                        </p>
                        <p>
                          1. Hãy dùng nút <strong>"📱 Copy Tin Nhắn Gửi Zalo"</strong> ở trên để gửi tin nhắn có sẵn mã PIN và hướng dẫn.
                        </p>
                        <p>
                          2. Nếu học sinh bấm link trên Zalo mà bị lỗi "Bài thi không tồn tại" hoặc bị chặn: Nhắc học sinh bấm <strong>dấu 3 chấm (···)</strong> ở góc trên bên phải Zalo ➔ chọn <strong>"Mở bằng trình duyệt"</strong> (Chrome/Safari), hoặc mở trình duyệt nhập trực tiếp mã PIN <strong>{sharePin || "phòng thi"}</strong>.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">Tên miền phát hành:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">{getPublicAppUrl()}</span>
                        </div>
                        <button
                          onClick={() => {
                            const current = localStorage.getItem('custom_public_app_url') || '';
                            const newUrl = prompt('Nhập tên miền tùy chỉnh (Ví dụ: https://my-exam.vercel.app):\nĐể trống nếu muốn dùng tên miền hiện tại.', current);
                            if (newUrl !== null) {
                              if (newUrl.trim()) {
                                localStorage.setItem('custom_public_app_url', newUrl.trim());
                              } else {
                                localStorage.removeItem('custom_public_app_url');
                              }
                              handleShare();
                            }
                          }}
                          className="text-emerald-700 hover:text-emerald-800 underline font-medium cursor-pointer"
                        >
                          ⚙️ Đổi tên miền / Gắn domain Vercel riêng
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BẢNG ĐÁP ÁN MA TRẬN & TRA CỨU HOÁN VỊ TỔNG HỢP */}
                  {showAnswerMatrix && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                          <div>
                            <h3 className="font-bold text-slate-800 text-base">
                              Bảng Đáp Án Ma Trận & Tra Cứu Hoán Vị (Tất cả {shuffledExams.length} mã đề)
                            </h3>
                            <p className="text-xs text-slate-500">
                              Phân loại theo từng Phần chuẩn GDPT. Đáp án đồng bộ chính xác 100% với đề thi và file xuất TNMaker.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExportTNMakerExcel}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-md hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" /> Xuất File Excel (.xlsx)
                          </button>
                          <button
                            onClick={handleExportCSV}
                            className="px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5" /> File CSV TNMaker
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto max-h-[500px] border border-slate-200 rounded-lg">
                        <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm text-center">
                          <thead className="bg-slate-100 font-bold text-slate-800 sticky top-0 shadow-sm z-10">
                            <tr>
                              <th className="border border-slate-300 p-2 w-14 bg-slate-100">Câu</th>
                              <th className="border border-slate-300 p-2 text-left min-w-[160px] bg-slate-100">Phân loại Phần</th>
                              {shuffledExams.map(exam => (
                                <th key={exam.code} className="border border-slate-300 p-2 bg-emerald-50 text-emerald-900 font-bold">
                                  Mã {exam.code}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: shuffledExams[0]?.questions.length || 0 }).map((_, qIdx) => {
                              const firstQ = shuffledExams[0].questions[qIdx];
                              const section = firstQ.section || identifyQuestionSection(firstQ);
                              const prevQ = qIdx > 0 ? shuffledExams[0].questions[qIdx - 1] : null;
                              const isFirstOfSection = qIdx === 0 || ((prevQ?.section || (prevQ && identifyQuestionSection(prevQ))) !== section);

                              return (
                                <React.Fragment key={qIdx}>
                                  {isFirstOfSection && (
                                    <tr className="bg-blue-50/80 font-bold text-blue-900 text-xs text-left">
                                      <td colSpan={2 + shuffledExams.length} className="border border-slate-300 p-2 uppercase">
                                        {SECTION_NAMES[section as 1|2|3|4] || `PHẦN ${section}`}
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="border border-slate-300 p-2 font-bold text-slate-700 bg-slate-50/60">
                                      Câu {qIdx + 1}
                                    </td>
                                    <td className="border border-slate-300 p-2 text-left text-xs text-slate-600">
                                      {SECTION_SHORT_NAMES[section as 1|2|3|4] || `Phần ${section}`}
                                    </td>
                                    {shuffledExams.map(exam => {
                                      const q = exam.questions[qIdx];
                                      const ansStr = getQuestionAnswerString(q);
                                      const isMC = (q.section === 1 || q.type === 'mc');

                                      return (
                                        <td
                                          key={exam.code}
                                          className={`border border-slate-300 p-2 font-bold font-mono ${
                                            isMC
                                              ? 'text-emerald-700 bg-emerald-50/40'
                                              : q.section === 2
                                              ? 'text-blue-700 bg-blue-50/20 text-xs'
                                              : 'text-indigo-700 text-xs'
                                          }`}
                                        >
                                          {ansStr}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="space-y-8">
                    {shuffledExams.map((exam, index) => (
                      <div key={index} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                        <div className="bg-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200">
                          <h4 className="font-bold text-lg text-slate-800">Mã đề: {exam.code}</h4>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={async () => {
                                const currentTitle = examName || formatExamTitle(examType, subject, grade);
                                const singleData = {
                                    examData: { examName: currentTitle, examType, duration, subject, grade, schoolLevel },
                                    examType,
                                    duration,
                                    codes: [
                                        {
                                            code: exam.code,
                                            questions: exam.questions.map((q: any) => ({
                                                type: q.type,
                                                content: embedTikzSvgsInText(q.content || q.question || q.text || ''),
                                                options: q.options ? q.options.map((opt: string) => embedTikzSvgsInText(opt)) : undefined,
                                                correctOptionIndex: q.correctOptionIndex,
                                                correct: q.correct,
                                                correctAnswer: q.correctAnswer,
                                                tfStatements: q.tfStatements?.map((tf: any) => ({ statement: embedTikzSvgsInText(tf.statement || ''), correct: tf.correct })),
                                                imageUrl: q.imageUrl,
                                                hasFigure: q.hasFigure
                                            }))
                                        }
                                    ]
                                };
                                const publicBase = getPublicAppUrl() || window.location.origin;
                                const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(singleData));
                                const url = `${publicBase}/?examData=${compressed}`;
                                
                                try {
                                    const btn = document.getElementById(`share-btn-${exam.code}`);
                                    if (btn) btn.innerHTML = '<span class="animate-spin mr-1">⌛</span> Đang tạo link...';
                                    
                                    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
                                    let fallbackCode = '';
                                    for (let i = 0; i < 6; i++) {
                                      fallbackCode += chars.charAt(Math.floor(Math.random() * chars.length));
                                    }

                                    let examId = fallbackCode;
                                    try {
                                        const shareRes = await apiFetch("/api/exams/share", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ ...singleData, customId: fallbackCode })
                                        });
                                        if (shareRes.ok) {
                                            const sData = await shareRes.json();
                                            if (sData.examId) examId = sData.examId;
                                        }
                                    } catch (e) {}

                                    try {
                                        fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/jaku8xjm/${encodeURIComponent(examId.toUpperCase())}/${encodeURIComponent(compressed)}`, { method: 'POST' }).catch(() => {});
                                        localStorage.setItem(`examCache_${examId}`, JSON.stringify(singleData));
                                    } catch (e) {}

                                    const finalUrl = `${publicBase}/?pin=${examId}#d=${compressed}`;

                                    await navigator.clipboard.writeText(finalUrl);
                                    alert(`Đã copy link thi trực tiếp cho Mã đề ${exam.code} (Mã PIN: ${examId})!\nLink này mở mượt trên mọi thiết bị và Zalo.`);
                                    if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-share-2 w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg> Copy Link Thi';
                                } catch (e) {
                                    navigator.clipboard.writeText(url);
                                    alert(`Đã copy link thi cho Mã đề ${exam.code}.`);
                                    const btn = document.getElementById(`share-btn-${exam.code}`);
                                    if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-share-2 w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg> Copy Link Thi';
                                }
                            }} id={`share-btn-${exam.code}`} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded hover:bg-blue-100 flex items-center gap-2">
                              <Share2 className="w-4 h-4" /> Copy Link Thi
                            </button>

                            <button onClick={async () => {
                                const currentTitle = examName || formatExamTitle(examType, subject, grade);
                                const singleData = {
                                    examData: { examName: currentTitle, examType, duration, subject, grade, schoolLevel },
                                    examType,
                                    duration,
                                    codes: [
                                        {
                                            code: exam.code,
                                            questions: exam.questions.map((q: any) => ({
                                                type: q.type,
                                                content: embedTikzSvgsInText(q.content || q.question || q.text || ''),
                                                options: q.options ? q.options.map((opt: string) => embedTikzSvgsInText(opt)) : undefined,
                                                correctOptionIndex: q.correctOptionIndex,
                                                correct: q.correct,
                                                correctAnswer: q.correctAnswer,
                                                tfStatements: q.tfStatements?.map((tf: any) => ({ statement: embedTikzSvgsInText(tf.statement || ''), correct: tf.correct })),
                                                imageUrl: q.imageUrl,
                                                hasFigure: q.hasFigure
                                            }))
                                        }
                                    ]
                                };
                                const publicBase = getPublicAppUrl() || window.location.origin;
                                const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(singleData));
                                
                                const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
                                let fallbackCode = '';
                                for (let i = 0; i < 6; i++) {
                                  fallbackCode += chars.charAt(Math.floor(Math.random() * chars.length));
                                }

                                let examId = fallbackCode;
                                try {
                                    const shareRes = await apiFetch("/api/exams/share", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ ...singleData, customId: fallbackCode })
                                    });
                                    if (shareRes.ok) {
                                        const sData = await shareRes.json();
                                        if (sData.examId) examId = sData.examId;
                                    }
                                } catch (e) {}

                                // Dual-sync to persistent Cloud KV with hex chunking and local cache
                                await saveExamToCloud(examId, singleData);

                                const finalUrl = `${publicBase}/?pin=${examId}#d=${compressed}`;
                                const zaloMsg = getZaloShareMessage(finalUrl, examId, `${examName} (Mã đề ${exam.code})`);
                                await navigator.clipboard.writeText(zaloMsg);
                                alert(`Đã copy tin nhắn Zalo kèm Mã PIN & Hướng dẫn cho Mã đề ${exam.code}!`);
                            }} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded hover:bg-emerald-100 flex items-center gap-2">
                              <Smartphone className="w-4 h-4" /> Gửi Zalo
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsHeaderModalOpen(true)}
                              className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold rounded hover:bg-emerald-100 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              title="Tùy chỉnh thông tin Trường học, Họ và tên giáo viên, Năm học 2026 - 2027 xuất hiện ở đầu đề thi..."
                            >
                              <School className="w-4 h-4 text-emerald-600" />
                              <span>Tiêu đề (Trường, GV, 2026-2027)</span>
                            </button>
                            <button onClick={() => handlePrint(`print-exam-${exam.code}`)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 flex items-center gap-2">

                              <Printer className="w-4 h-4" /> In / PDF
                            </button>
                            <button onClick={() => handleExportWord(`print-exam-${exam.code}`, exam.code)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 flex items-center gap-2" title="Xuất Word định dạng chuẩn OMML, công thức có thể chỉnh sửa trực tiếp">
                              <Download className="w-4 h-4" /> Xuất Word (Chuẩn)
                            </button>
                            <button onClick={() => handleExportWordLatex(`print-exam-${exam.code}`, exam.code)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 flex items-center gap-2" title="Xuất Word giữ nguyên mã LaTeX để dùng chức năng Toggle TeX của MathType">
                              <Download className="w-4 h-4" /> Xuất Word (LaTeX)
                            </button>
                            <button onClick={() => handleExportWordImage(`print-exam-${exam.code}`, exam.code)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 flex items-center gap-2" title="Xuất Word với công thức dạng ảnh chất lượng cao (không lo lỗi hiển thị)">
                              <Download className="w-4 h-4" /> Xuất Word (Ảnh)
                            </button>
                          </div>
                        </div>

                        {/* Tùy chọn In & Xuất file: Kèm lời giải dưới câu vs Ở cuối đề vs Không kèm lời giải */}
                        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            📄 Chế độ In & Xuất file:
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`sol-mode-${exam.code}`}
                              checked={solutionDisplayMode === "none"}
                              onChange={() => setSolutionDisplayMode("none")}
                              className="w-4 h-4 text-slate-600 focus:ring-slate-500 cursor-pointer"
                            />
                            <span className="font-medium text-slate-600">
                              Không kèm lời giải chi tiết (Bản dành cho Học sinh)
                            </span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`sol-mode-${exam.code}`}
                              checked={solutionDisplayMode === "under_question"}
                              onChange={() => setSolutionDisplayMode("under_question")}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="font-bold text-emerald-800">
                              Lời giải dưới mỗi câu (Bản GV - Rút gọn)
                            </span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`sol-mode-${exam.code}`}
                              checked={solutionDisplayMode === "appendix"}
                              onChange={() => setSolutionDisplayMode("appendix")}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="font-bold text-emerald-800">
                              Toàn bộ lời giải ở cuối đề (Bản GV - Chuẩn khảo thí)
                            </span>
                          </label>
                        </div>
                        <div className="p-6">
                          {/* Banner tùy chỉnh tiêu đề (Trường, GV, Năm học 2026-2027) */}
                          <div className="no-print mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                                <School className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">Tiêu đề đề thi:</span>{" "}
                                <span>{headerConfig.department || "SỞ GIÁO DỤC VÀ ĐÀO TẠO"}</span> •{" "}
                                <span className="font-semibold">{headerConfig.schoolName ? `Trường: ${headerConfig.schoolName}` : "Trường: (chưa nhập)"}</span> •{" "}
                                <span className="font-semibold">{headerConfig.teacherName ? `GV: ${headerConfig.teacherName}` : "GV: (chưa nhập)"}</span> •{" "}
                                <span className="font-bold text-emerald-800">Năm học {headerConfig.schoolYear || "2026 - 2027"}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsHeaderModalOpen(true)}
                              className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              ✏️ Tùy chỉnh thông tin Trường / GV / Năm học
                            </button>
                          </div>

                          <div id={`print-exam-${exam.code}`} style={{ fontFamily: '"Times New Roman", Times, serif', color: '#000000', lineHeight: 1.35 }}>
                            {/* Standard Vietnamese School Exam Header */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '8pt', fontFamily: '"Times New Roman", Times, serif' }}>
                              <tbody>
                                <tr>
                                  <td style={{ width: '45%', border: 'none', textAlign: 'center', verticalAlign: 'top', padding: '0 4pt' }}>
                                    <div style={{ fontSize: '10.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                      {headerConfig.department || "SỞ GIÁO DỤC VÀ ĐÀO TẠO"}
                                    </div>
                                    <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '1pt' }}>
                                      {headerConfig.schoolName 
                                        ? (headerConfig.schoolName.trim().toUpperCase().startsWith("TRƯỜNG") ? headerConfig.schoolName.trim().toUpperCase() : `TRƯỜNG ${headerConfig.schoolName.trim().toUpperCase()}`)
                                        : "TRƯỜNG THPT ..........................."}
                                    </div>
                                    <div style={{ fontSize: '10pt', fontWeight: 'bold', marginTop: '1.5pt' }}>
                                      {headerConfig.teacherName ? `GV: ${headerConfig.teacherName}` : "Giáo viên: ......................................."}
                                    </div>
                                    {headerConfig.subjectGroup && (
                                      <div style={{ fontSize: '9.5pt', color: '#1e293b', fontStyle: 'italic', marginTop: '1pt' }}>
                                        {headerConfig.subjectGroup}
                                      </div>
                                    )}
                                    <div style={{ fontSize: '9pt', fontStyle: 'italic', marginTop: '2pt' }}>
                                      (Đề thi có {Math.max(1, Math.ceil(exam.questions.length / 8))} trang)
                                    </div>
                                  </td>
                                  <td style={{ width: '55%', border: 'none', textAlign: 'center', verticalAlign: 'top', padding: '0 4pt' }}>
                                    <div style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>{examName || 'KIỂM TRA ĐỊNH KỲ'}</div>
                                    <div style={{ fontSize: '10.5pt', fontWeight: 'bold', marginTop: '1pt' }}>NĂM HỌC {headerConfig.schoolYear || '2026 - 2027'}</div>
                                    <div style={{ fontSize: '11pt' }}>Môn: <b>{subject || 'Toán học'}</b> {grade ? `- Khối ${grade}` : ''}</div>
                                    <div style={{ fontSize: '10pt', fontStyle: 'italic', marginTop: '2pt' }}>Thời gian làm bài: <b>{duration} phút</b> (không kể thời gian phát đề)</div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Candidate Info and Exam Code Box */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '14pt', fontFamily: '"Times New Roman", Times, serif' }}>
                              <tbody>
                                <tr>
                                  <td style={{ border: 'none', verticalAlign: 'middle', fontSize: '11pt', padding: '2pt 0' }}>
                                    Họ và tên thí sinh: ................................................................ Lớp: ................ SBD: ................
                                  </td>
                                  <td style={{ width: '135px', border: '1.5pt solid black', textAlign: 'center', verticalAlign: 'middle', padding: '4pt 8pt', fontWeight: 'bold', fontSize: '11.5pt' }}>
                                    MÃ ĐỀ: {exam.code}
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Question List */}
                            {exam.questions.map((q, idx) => {
                              const currentSec = (q as any).section || identifyQuestionSection(q);
                              const prevSec = idx > 0 ? ((exam.questions[idx - 1] as any).section || identifyQuestionSection(exam.questions[idx - 1])) : null;
                              const isNewSection = currentSec && currentSec !== prevSec;

                              return (
                                <React.Fragment key={idx}>
                                  {isNewSection && (
                                    <div style={{ marginTop: idx > 0 ? '16pt' : '8pt', marginBottom: '8pt', pageBreakAfter: 'avoid' }}>
                                      <div style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a' }}>
                                        {SECTION_NAMES[currentSec as 1|2|3|4] || `PHẦN ${currentSec}`}
                                      </div>
                                      <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#334155', marginTop: '2pt', marginBottom: '4pt' }}>
                                        {currentSec === 1 && "Thí sinh trả lời từ câu hỏi này. Mỗi câu hỏi chỉ chọn một phương án trả lời."}
                                        {currentSec === 2 && "Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai."}
                                        {currentSec === 3 && "Thí sinh ghi câu trả lời/kết quả tính toán vào phiếu trả lời (Mỗi câu là một số có tối đa 4 ký tự)."}
                                        {currentSec === 4 && "Thí sinh trình bày lời giải chi tiết vào giấy làm bài."}
                                      </div>
                                    </div>
                                  )}
                                  <div className="question-block" style={{ marginBottom: '12pt', pageBreakInside: 'avoid' }}>
                                    <div style={{ fontSize: '12pt', marginBottom: '3pt' }}>
                                      <strong>Câu {idx + 1}:</strong> <MarkdownRenderer className="markdown-body" content={cleanQuestionStem(q.content || (q as any).question || (q as any).text || '', q.options, q.tfStatements)} />
                                    </div>
                                {q.type === 'mc' && q.options && (() => {
                                  const cleanedOpts = q.options.map((opt: string) => cleanOptionText(opt));
                                  const maxLen = Math.max(...cleanedOpts.map((o: string) => (o || '').length), 0);
                                  const cols = maxLen <= 18 ? 4 : maxLen <= 45 ? 2 : 1;

                                  if (cols === 4) {
                                    return (
                                      <table className="options-table borderless" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '3pt', marginBottom: '4pt' }}>
                                        <tbody>
                                          <tr>
                                            {cleanedOpts.map((opt: string, oIdx: number) => (
                                              <td key={oIdx} style={{ width: '25%', border: 'none', padding: '2pt 4pt', verticalAlign: 'top', fontSize: '12pt' }}>
                                                <b style={{ whiteSpace: 'nowrap' }}>{String.fromCharCode(65 + oIdx)}.</b> <MarkdownRenderer inline={true} className="markdown-body inline align-baseline" content={fixMath(opt)} />
                                              </td>
                                            ))}
                                          </tr>
                                        </tbody>
                                      </table>
                                    );
                                  }

                                  if (cols === 2) {
                                    return (
                                      <table className="options-table borderless" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '3pt', marginBottom: '4pt' }}>
                                        <tbody>
                                          <tr>
                                            <td style={{ width: '50%', border: 'none', padding: '2pt 4pt', verticalAlign: 'top', fontSize: '12pt' }}>
                                              <b style={{ whiteSpace: 'nowrap' }}>A.</b> <MarkdownRenderer inline={true} className="markdown-body inline align-baseline" content={fixMath(cleanedOpts[0] || '')} />
                                            </td>
                                            <td style={{ width: '50%', border: 'none', padding: '2pt 4pt', verticalAlign: 'top', fontSize: '12pt' }}>
                                              <b style={{ whiteSpace: 'nowrap' }}>B.</b> <MarkdownRenderer inline={true} className="markdown-body inline align-baseline" content={fixMath(cleanedOpts[1] || '')} />
                                            </td>
                                          </tr>
                                          <tr>
                                            <td style={{ width: '50%', border: 'none', padding: '2pt 4pt', verticalAlign: 'top', fontSize: '12pt' }}>
                                              <b style={{ whiteSpace: 'nowrap' }}>C.</b> <MarkdownRenderer inline={true} className="markdown-body inline align-baseline" content={fixMath(cleanedOpts[2] || '')} />
                                            </td>
                                            <td style={{ width: '50%', border: 'none', padding: '2pt 4pt', verticalAlign: 'top', fontSize: '12pt' }}>
                                              <b style={{ whiteSpace: 'nowrap' }}>D.</b> <MarkdownRenderer inline={true} className="markdown-body inline align-baseline" content={fixMath(cleanedOpts[3] || '')} />
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    );
                                  }

                                  return (
                                    <table className="options-table borderless" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '3pt', marginBottom: '4pt' }}>
                                      <tbody>
                                        {cleanedOpts.map((opt: string, oIdx: number) => (
                                          <tr key={oIdx}>
                                            <td style={{ width: '100%', border: 'none', padding: '2pt 4pt', verticalAlign: 'top', fontSize: '12pt' }}>
                                              <b style={{ whiteSpace: 'nowrap' }}>{String.fromCharCode(65 + oIdx)}.</b> <MarkdownRenderer inline={true} className="markdown-body inline align-baseline" content={fixMath(opt)} />
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  );
                                })()}
                                {q.type === 'tf' && q.tfStatements && (
                                  <table className="tf-table borderless" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '3pt', marginBottom: '4pt' }}>
                                    <tbody>
                                      {q.tfStatements.map((stmt: any, sIdx: number) => {
                                        let stmtText = (stmt.statement || '').trim();
                                        stmtText = stmtText
                                          .replace(/trà\s+sữ\s*\n*\s*a\./gi, 'trà sữa. ')
                                          .replace(/trà\s+sữ\s*\n*\s*a\)/gi, 'trà sữa) ')
                                          .replace(/sữ\s*\n+\s*a\./gi, 'sữa. ')
                                          .replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})[a-d][\.\:\)]?(?:\*{0,2})[\.\:\)]?\s*/i, '');
                                        return (
                                          <tr key={sIdx}>
                                            <td style={{ width: '32px', border: 'none', padding: '2pt 2pt', verticalAlign: 'top', fontWeight: 'bold', fontSize: '12pt', whiteSpace: 'nowrap' }}>
                                              {['a)', 'b)', 'c)', 'd)'][sIdx] || String.fromCharCode(97 + sIdx) + ')'}
                                            </td>
                                            <td style={{ border: 'none', padding: '2pt 4pt', verticalAlign: 'top', fontSize: '12pt' }}>
                                              <MarkdownRenderer className="markdown-body inline-block" content={fixMath(stmtText)} />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                                {q.type !== 'mc' && q.type !== 'tf' && (
                                  <div style={{ marginTop: '4pt', marginBottom: '12pt', fontStyle: 'italic', color: '#475569', fontSize: '11pt' }}>
                                    (Học sinh ghi câu trả lời vào phiếu thi)
                                  </div>
                                )}

                                {/* Lời giải chi tiết - Toggle trên màn hình xem thử */}
                                <div className="mt-2.5 no-print">
                                  <button
                                    type="button"
                                    onClick={() => toggleSolution(100000 + (index * 1000) + idx + 1)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                                  >
                                    <span>{isSolutionOpen(100000 + (index * 1000) + idx + 1) ? "🙈 Ẩn lời giải" : "💡 Xem lời giải chi tiết"}</span>
                                  </button>
                                  {isSolutionOpen(100000 + (index * 1000) + idx + 1) && (
                                    <div 
                                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginTop: '8px' }}
                                      className="text-slate-800 text-sm leading-relaxed"
                                    >
                                      <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                                        <span>💡 Lời giải chi tiết:</span>
                                      </div>
                                      <div className="text-slate-800">
                                        <MarkdownRenderer content={fixMath(q.solution || q.explanation || "Chưa có lời giải chi tiết.")} />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Lời giải chi tiết - Kèm theo khi In và Xuất Word (Bản Giáo viên) */}
                                {solutionDisplayMode === "under_question" && outputConfig.detailedSolution && (q.solution || q.explanation) && (
                                  <div 
                                    className="print-only"
                                    style={{ 
                                      backgroundColor: '#f8fafc', 
                                      border: '1px solid #cbd5e1', 
                                      borderRadius: '6px', 
                                      padding: '8pt 10pt', 
                                      marginTop: '6pt', 
                                      marginBottom: '8pt',
                                      pageBreakInside: 'avoid'
                                    }}
                                  >
                                    <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '3pt', fontSize: '11pt' }}>
                                      💡 Lời giải chi tiết:
                                    </div>
                                    <div style={{ fontSize: '11pt', color: '#1e293b' }}>
                                      <MarkdownRenderer className="markdown-body inline-block" content={fixMath(q.solution || q.explanation || '')} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })}

                            {/* End of test note */}
                            <div style={{ textAlign: 'center', marginTop: '20pt', marginBottom: '4pt', fontWeight: 'bold', fontSize: '11.5pt', letterSpacing: '1px' }}>
                              ----------------------- HẾT -----------------------
                            </div>
                            <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '10pt', marginBottom: '20pt' }}>
                              (Cán bộ coi thi không giải thích gì thêm. Thí sinh không được sử dụng tài liệu)
                            </div>
                            
                            {/* Answer Key Grid */}
                            {outputConfig.answers && (
                              <>
                                <div style={{ pageBreakBefore: 'always' }}></div>
                                <div className="answers-title text-center font-bold text-base uppercase mt-8 mb-4" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', textTransform: 'uppercase', marginBottom: '10pt' }}>
                                  BẢNG ĐÁP ÁN (Mã đề {exam.code})
                                </div>
                                <table className="w-full border-collapse border border-black mt-2 text-center text-sm" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', textAlign: 'center', fontSize: '11pt', fontFamily: '"Times New Roman", Times, serif' }}>
                                  <tbody>
                                    {Array.from({ length: Math.ceil(exam.questions.length / 10) }).map((_, rowIndex) => {
                                      const slice = exam.questions.slice(rowIndex * 10, rowIndex * 10 + 10);
                                      return (
                                        <React.Fragment key={rowIndex}>
                                          {/* Header Row: Câu 1, Câu 2, ... */}
                                          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                                            {slice.map((_, colIndex) => {
                                              const qNum = rowIndex * 10 + colIndex + 1;
                                              return (
                                                <td key={'h-' + colIndex} style={{ border: '1px solid black', padding: '4pt 2pt', width: '10%' }}>
                                                  Câu {qNum}
                                                </td>
                                              );
                                            })}
                                            {Array.from({ length: 10 - slice.length }).map((_, emptyIdx) => (
                                              <td key={'eh-' + emptyIdx} style={{ border: '1px solid black', padding: '4pt 2pt', width: '10%' }}></td>
                                            ))}
                                          </tr>
                                          {/* Answer Row: A, B, C, ... */}
                                          <tr>
                                            {slice.map((q, colIndex) => {
                                              let ans = "";
                                              if (q.type === 'mc' || (q as any).section === 1) {
                                                ans = String.fromCharCode(65 + (q.correctOptionIndex || 0));
                                              } else if ((q.type === 'tf' || (q as any).section === 2) && q.tfStatements) {
                                                ans = q.tfStatements.map(s => s.correct ? 'Đ' : 'S').join('');
                                              } else if (q.type === 'sa' || (q as any).section === 3) {
                                                ans = (q.correctAnswer || '').replace(/<[^>]*>?/gm, '').trim();
                                              } else {
                                                ans = "TL";
                                              }
                                              return (
                                                <td key={'a-' + colIndex} style={{ border: '1px solid black', padding: '5pt 2pt', fontWeight: 'bold' }}>
                                                  {q.type !== 'mc' && q.type !== 'tf' ? (
                                                    <MarkdownRenderer className="markdown-body inline-block" content={fixMath(ans)} />
                                                  ) : ans}
                                                </td>
                                              );
                                            })}
                                            {Array.from({ length: 10 - slice.length }).map((_, emptyIdx) => (
                                              <td key={'ea-' + emptyIdx} style={{ border: '1px solid black', padding: '5pt 2pt' }}></td>
                                            ))}
                                          </tr>
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </>
                            )}

                            {/* Hướng dẫn giải chi tiết đầy đủ ở cuối đề cho Bản Giáo viên */}
                            {solutionDisplayMode === "appendix" && outputConfig.detailedSolution && (
                              <div style={{ pageBreakBefore: 'always', marginTop: '20pt' }}>
                                <div className="answers-title text-center font-bold text-base uppercase mt-8 mb-4" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', textTransform: 'uppercase', marginBottom: '12pt' }}>
                                  HƯỚNG DẪN GIẢI CHI TIẾT (Mã đề {exam.code})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8pt' }}>
                                  {exam.questions.map((q, qIdx) => (
                                    <div 
                                      key={'sol-page-' + qIdx} 
                                      style={{ 
                                        backgroundColor: '#f8fafc', 
                                        border: '1px solid #cbd5e1', 
                                        borderRadius: '6px', 
                                        padding: '8pt 12pt', 
                                        pageBreakInside: 'avoid',
                                        fontSize: '11pt',
                                        lineHeight: 1.4
                                      }}
                                    >
                                      <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4pt' }}>
                                        Câu {qIdx + 1}:
                                      </div>
                                      <div style={{ color: '#1e293b' }}>
                                        <MarkdownRenderer className="markdown-body inline-block" content={fixMath(q.solution || q.explanation || 'Chưa có lời giải chi tiết.')} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
        
        {activeTab === "results" && (
          <div className="space-y-6">
            {/* GIẢI PHÁP TỐI ƯU CHO QUẢN LÝ LỚP HỌC & THỐNG KÊ */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 text-sm text-slate-800 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-800 font-bold text-base">
                <Award className="w-5 h-5 text-indigo-600" />
                <span>💡 ĐỀ XUẤT GIẢI PHÁP TỐI ƯU QUẢN LÝ PHÒNG THI & TK ĐĂNG NHẬP</span>
              </div>
              <p className="leading-relaxed font-medium">
                Để thầy/cô quản lý lớp học và theo dõi thống kê chi tiết kết quả học sinh tối ưu nhất, chúng tôi đề xuất phương án:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
                  <p className="font-bold text-indigo-700 flex items-center gap-1.5">
                    <span>🏫</span> 1. Nên tạo Phòng thi / Lớp học riêng
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hệ thống tự động gom nhóm học sinh nộp chung một đề thi theo Mã PIN. Thầy/cô chỉ cần lọc theo mã PIN ở biểu đồ bên dưới để xem bảng phân tích đúng sai từng câu của cả lớp, giúp nhận biết phần kiến thức học sinh còn yếu để bổ trợ.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
                  <p className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span>🔑</span> 2. Đăng nhập Google là giải pháp tối ưu nhất
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Với Giáo viên:</strong> Đăng nhập bằng Google giúp thầy/cô lưu trữ phòng thi vĩnh viễn trên Cloud và xuất bảng điểm trực tiếp sang Google Sheets.<br/>
                    <strong>Với Học sinh:</strong> Chỉ cần truy cập bằng link hoặc mã PIN (không cần tạo tài khoản mật khẩu để tránh rắc rối) là có thể thi ngay.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION: THỐNG KÊ CHI TIẾT THEO PHÒNG THI ONLINE */}
            {(() => {
              // Extract all unique exam PINs/IDs
              const uniqueExamIds = Array.from(new Set(examResults.map((r: any) => r.examId).filter(Boolean)));
              if (uniqueExamIds.length === 0) return null;

              const currentPin = selectedStatsPin || uniqueExamIds[0];
              const pinResults = examResults.filter((r: any) => r.examId === currentPin);

              if (pinResults.length === 0) return null;

              // Calculate statistics
              const totalStudents = pinResults.length;
              const scores = pinResults.map((r: any) => Number(r.score || 0));
              const avgScore = scores.reduce((sum, s) => sum + s, 0) / totalStudents;
              const maxScore = Math.max(...scores);
              const minScore = Math.min(...scores);

              const excelScores = scores.filter(s => s >= 8.0).length;
              const goodScores = scores.filter(s => s >= 6.5 && s < 8.0).length;
              const averageScores = scores.filter(s => s >= 5.0 && s < 6.5).length;
              const weakScores = scores.filter(s => s < 5.0).length;

              // Calculate item-by-item correctness
              const itemAnalysis: Record<number, { correct: number, wrong: number, blank: number, content: string, type: string }> = {};

              pinResults.forEach((res: any) => {
                let detailedList: any[] = [];
                if (typeof res.detailedAnswers === 'string') {
                  try { detailedList = JSON.parse(res.detailedAnswers); } catch(e){}
                } else if (Array.isArray(res.detailedAnswers)) {
                  detailedList = res.detailedAnswers;
                } else if (typeof res.details === 'string') {
                  try { detailedList = JSON.parse(res.details); } catch(e){}
                } else if (Array.isArray(res.details)) {
                  detailedList = res.details;
                }

                detailedList.forEach((item: any, qIdx: number) => {
                  const qNum = item.questionNumber || item.questionIndex || (qIdx + 1);
                  if (!itemAnalysis[qNum]) {
                    itemAnalysis[qNum] = { correct: 0, wrong: 0, blank: 0, content: item.questionContent || item.questionText || '', type: item.type || '' };
                  }
                  if (item.type === 'essay') {
                    if (item.hasAnswered) itemAnalysis[qNum].correct++;
                    else itemAnalysis[qNum].blank++;
                  } else {
                    if (item.isCorrect) {
                      itemAnalysis[qNum].correct++;
                    } else if (!item.hasAnswered) {
                      itemAnalysis[qNum].blank++;
                    } else {
                      itemAnalysis[qNum].wrong++;
                    }
                  }
                });
              });

              const sortedQuestionsKeys = Object.keys(itemAnalysis).map(Number).sort((a, b) => a - b);

              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        Phân Tích & Thống Kê Điểm Số Theo Phòng Thi (Mã PIN)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Chọn một Mã phòng thi trực tuyến bên dưới để phân tích chi tiết đúng/sai của từng câu hỏi
                      </p>
                    </div>
                    <div>
                      <select
                        value={currentPin}
                        onChange={(e) => setSelectedStatsPin(e.target.value)}
                        className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 outline-none shadow-3xs cursor-pointer"
                      >
                        {uniqueExamIds.map((pin: string) => (
                          <option key={pin} value={pin}>
                            📍 Phòng thi / Mã PIN: {pin}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cards stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tổng số bài thi</span>
                      <p className="text-3xl font-black text-slate-800">{totalStudents}</p>
                      <span className="text-[10px] text-slate-500">học sinh nộp thành công</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Điểm trung bình</span>
                      <p className="text-3xl font-black text-indigo-600">{avgScore.toFixed(2)}</p>
                      <span className="text-[10px] text-slate-500">trung bình cả lớp</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Điểm cao nhất</span>
                      <p className="text-3xl font-black text-emerald-600">{maxScore.toFixed(1)}</p>
                      <span className="text-[10px] text-slate-500">điểm thủ khoa phòng thi</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Phân bổ học lực</span>
                      <div className="flex justify-center gap-1.5 pt-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-sm border border-emerald-200" title="Giỏi (>=8.0)">G: {excelScores}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-sm border border-blue-200" title="Khá (6.5-7.9)">K: {goodScores}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-sm border border-amber-200" title="Trung bình (5.0-6.4)">TB: {averageScores}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-50 text-red-700 rounded-sm border border-red-200" title="Yếu (<5.0)">Y: {weakScores}</span>
                      </div>
                    </div>
                  </div>

                  {/* Item-by-item analysis table */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4.5 space-y-3.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                      📊 Chi tiết kết quả làm bài của học sinh theo từng câu hỏi:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedQuestionsKeys.map((qNum) => {
                        const analysis = itemAnalysis[qNum];
                        const correctCount = analysis.correct;
                        const wrongCount = analysis.wrong;
                        const blankCount = analysis.blank;
                        const total = correctCount + wrongCount + blankCount;
                        const correctPercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
                        const wrongPercent = total > 0 ? Math.round((wrongCount / total) * 100) : 0;
                        const blankPercent = total > 0 ? Math.round((blankCount / total) * 100) : 0;

                        const isEssay = analysis.type === 'essay';

                        return (
                          <div key={qNum} className="p-3 bg-white border border-slate-150 rounded-xl hover:shadow-2xs transition-all space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <span className="font-bold text-sm text-slate-800">Câu số {qNum}:</span>
                                {analysis.content && (
                                  <p className="text-xs text-slate-400 line-clamp-1 italic mt-0.5">
                                    {analysis.content.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs font-black px-2 py-0.5 rounded-full shrink-0 ${correctPercent >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : correctPercent >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {isEssay ? `Đã nộp: ${correctPercent}%` : `Đúng: ${correctPercent}%`}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                <div style={{ width: `${correctPercent}%` }} className="h-full bg-emerald-500" title={`Đúng: ${correctPercent}%`} />
                                <div style={{ width: `${wrongPercent}%` }} className="h-full bg-red-400" title={`Sai: ${wrongPercent}%`} />
                                <div style={{ width: `${blankPercent}%` }} className="h-full bg-slate-350" title={`Chưa trả lời: ${blankPercent}%`} />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-0.5">
                                <span className="text-emerald-700">✓ Đúng: {correctCount} em</span>
                                <span className="text-red-600">✗ Sai: {wrongCount} em</span>
                                <span className="text-slate-500">○ Chưa làm: {blankCount} em</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-3">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Thống Kê Kết Quả Làm Bài (Online)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động đồng bộ qua Webhook Google Sheets trung tâm và lưu trữ trên hệ thống
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={fetchResults}
                  disabled={resultsLoading}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                  title="Cập nhật điểm mới nhất của học sinh vừa nộp từ Webhook Google Sheets"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-600 ${resultsLoading ? 'animate-spin' : ''}`} />
                  <span>{resultsLoading ? 'Đang tải...' : '🔄 Làm mới dữ liệu'}</span>
                </button>
                <button 
                  onClick={exportResultsToExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Xuất file Excel bảng điểm
                </button>
                <button 
                  onClick={() => {
                    if (confirm("Bạn có chắc muốn xóa toàn bộ lịch sử kết quả thi trên thiết bị này?")) {
                      localStorage.removeItem('eduplan_exam_results');
                      setExamResults([]);
                    }
                  }}
                  className="px-3.5 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Xóa lịch sử
                </button>
              </div>
            </div>
            
            {resultsLoading && examResults.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-slate-600 font-medium text-sm">Đang tải danh sách kết quả nộp bài từ Google Sheets...</p>
              </div>
            ) : examResults.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <p className="text-slate-500">Chưa có kết quả làm bài nào được ghi nhận trên hệ thống.</p>
                <button
                  onClick={fetchResults}
                  className="mt-3 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Bấm để tải dữ liệu từ Google Sheets
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                        <th className="p-4 font-semibold text-slate-700">Thời gian nộp</th>
                        <th className="p-4 font-semibold text-slate-700">Mã đề / Đề thi</th>
                        <th className="p-4 font-semibold text-slate-700">Học sinh</th>
                        <th className="p-4 font-semibold text-slate-700">Lớp</th>
                        <th className="p-4 font-semibold text-slate-700">Điểm số</th>
                        <th className="p-4 font-semibold text-slate-700 text-center">Số câu đúng</th>
                        <th className="p-4 font-semibold text-slate-700 text-center">Trạng thái Tự luận</th>
                        <th className="p-4 font-semibold text-slate-700">Thời gian làm</th>
                        <th className="p-4 font-semibold text-slate-700 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {examResults.map((result: any, idx: number) => {
                        const timeSubmitted = result.timestamp || (result.submittedAt ? new Date(result.submittedAt).toLocaleString('vi-VN') : '-');
                        const examLabel = result.examId ? `Mã ${result.examId}` : (result.examName || "Đề thi Online");
                        const studentLabel = result.studentName || "Học sinh ẩn danh";
                        const classLabel = result.className || result.studentClass || "-";
                        const scoreVal = result.score !== undefined ? `${result.score} / 10` : "-";
                        const correctLabel = result.details
                          ? result.details
                          : (result.correct !== undefined ? `✓ ${result.correct}` : '-');
                        const timeSpentLabel = typeof result.timeSpent === 'number'
                          ? `${Math.floor(result.timeSpent / 60)} phút ${result.timeSpent % 60} giây`
                          : (result.timeSpent || '-');

                        const photoCount = result.essaySubmissions?.reduce((acc: number, curr: any) => acc + (curr.images?.length || 0), 0) || 0;
                        const essayCount = result.essaySubmissions?.length || 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                              {timeSubmitted}
                            </td>
                            <td className="p-4 text-sm font-medium text-slate-800">
                              {examLabel}
                            </td>
                            <td className="p-4 text-sm font-medium">
                              <button
                                onClick={() => openReviewModal(result)}
                                className="text-left font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5 cursor-pointer group transition-colors"
                                title={`Bấm để xem chi tiết bài thi của học sinh ${studentLabel}`}
                              >
                                <span className="group-hover:underline">{studentLabel}</span>
                                <Eye className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 text-blue-500 transition-opacity" />
                              </button>
                            </td>
                            <td className="p-4 text-sm text-slate-600">
                              {classLabel}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-emerald-600 text-sm sm:text-base">{scoreVal}</span>
                                {result.essayScore !== undefined && (
                                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 inline-block w-fit mt-0.5">
                                    ⭐ Tự luận: {result.essayScore}đ
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-center">
                              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-medium text-xs border border-emerald-200">
                                {correctLabel}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-center">
                              {result.hasEssay || essayCount > 0 ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-xs inline-flex items-center gap-1 border border-purple-200 shadow-2xs">
                                    📝 Có nộp tự luận ({photoCount} ảnh)
                                  </span>
                                  {result.isGraded && (
                                    <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã chấm
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">-</span>
                              )}
                            </td>
                            <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                              {timeSpentLabel}
                            </td>
                            <td className="p-4 text-sm text-center whitespace-nowrap">
                              <button
                                onClick={() => openReviewModal(result)}
                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-95"
                                title="Xem chi tiết câu đúng / sai và bài làm của học sinh"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>👁 Xem chi tiết</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      {/* MODAL CHI TIẾT BÀI THI CỦA HỌC SINH & CHẤM TỰ LUẬN */}
      {selectedResultForReview && (() => {
        const studentName = selectedResultForReview.studentName || 'Học sinh ẩn danh';
        const studentClass = selectedResultForReview.className || selectedResultForReview.studentClass || 'N/A';
        const examCode = selectedResultForReview.examId || selectedResultForReview.examName || 'Đề thi Online';
        const timeSubmitted = selectedResultForReview.timestamp || (selectedResultForReview.submittedAt ? new Date(selectedResultForReview.submittedAt).toLocaleString('vi-VN') : '-');
        const formattedTimeSpent = typeof selectedResultForReview.timeSpent === 'number'
          ? `${Math.floor(selectedResultForReview.timeSpent / 60)} phút ${selectedResultForReview.timeSpent % 60} giây`
          : (selectedResultForReview.timeSpent || '-');

        const detailedList = getDetailedAnswersFromResult(selectedResultForReview);
        const totalQ = detailedList.length > 0
          ? detailedList.length
          : (selectedResultForReview.totalQuestions || (questions ? questions.length : 0));

        const correctQCount = detailedList.filter((d: any) => d.isCorrect).length;
        const wrongQCount = detailedList.filter((d: any) => !d.isCorrect && d.hasAnswered && d.type !== 'essay').length;
        const unansweredQCount = detailedList.filter((d: any) => !d.hasAnswered && d.type !== 'essay').length;
        const essayQCount = detailedList.filter((d: any) => d.type === 'essay').length;

        const filteredItems = detailedList.filter((item: any) => {
          if (reviewFilter === 'correct') return item.isCorrect;
          if (reviewFilter === 'wrong') return !item.isCorrect && item.hasAnswered && item.type !== 'essay';
          if (reviewFilter === 'unanswered') return !item.hasAnswered && item.type !== 'essay';
          if (reviewFilter === 'essay') return item.type === 'essay';
          return true;
        });

        const hasAnyEssay = essayQCount > 0 || (selectedResultForReview.essaySubmissions && selectedResultForReview.essaySubmissions.length > 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Modal Header: Chi tiết bài thi của học sinh [Tên HS] - [Lớp] */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-blue-50/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-sm">
                    {studentName ? studentName.charAt(0).toUpperCase() : 'HS'}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Chi tiết bài thi của học sinh <span className="text-indigo-700">{studentName}</span> - Lớp <span className="text-emerald-700">{studentClass}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-semibold text-[11px]">
                        Mã đề: {examCode}
                      </span>
                      <span>•</span>
                      <span>🕒 Nộp lúc: {timeSubmitted}</span>
                      <span>•</span>
                      <span>⏱️ Thời gian làm bài: {formattedTimeSpent}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedResultForReview(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Thông tin chung (Tổng điểm, Số câu đúng / Tổng số câu, Thời gian làm bài, Tỷ lệ) */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: Tổng điểm */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tổng điểm
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                        {selectedResultForReview.score ?? 0}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">/ 10 điểm</span>
                    </div>
                    {selectedResultForReview.essayScore !== undefined ? (
                      <div className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 w-fit mt-1">
                        ⭐ Tự luận: {selectedResultForReview.essayScore}đ
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 mt-1">Điểm chấm trắc nghiệm</div>
                    )}
                  </div>

                  {/* Card 2: Số câu đúng / Tổng số câu */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Số câu đúng / Tổng số
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-blue-600">
                        {selectedResultForReview.correct !== undefined ? selectedResultForReview.correct : correctQCount}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">/ {totalQ} câu</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 font-medium">
                      {totalQ > 0 ? `Đạt ${Math.round(((selectedResultForReview.correct !== undefined ? selectedResultForReview.correct : correctQCount) / totalQ) * 100)}% số câu` : '-'}
                    </div>
                  </div>

                  {/* Card 3: Thời gian làm bài */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Thời gian làm bài
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-800">
                      {formattedTimeSpent}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate" title={timeSubmitted}>
                      Nộp: {timeSubmitted}
                    </div>
                  </div>

                  {/* Card 4: Thống kê nhanh Đúng / Sai / Chưa làm */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-center">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Thống kê kết quả
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="p-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <div className="text-xs font-black">{correctQCount}</div>
                        <div className="text-[10px] font-semibold">Đúng</div>
                      </div>
                      <div className="p-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                        <div className="text-xs font-black">{wrongQCount}</div>
                        <div className="text-[10px] font-semibold">Sai</div>
                      </div>
                      <div className="p-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                        <div className="text-xs font-black">{unansweredQCount}</div>
                        <div className="text-[10px] font-semibold">Chưa làm</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chấm Tự Luận & Lời phê của giáo viên (nếu có phần tự luận) */}
                {hasAnyEssay && (
                  <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs sm:text-sm">
                        <Award className="w-4 h-4 text-purple-600" />
                        <span>CHẤM ĐIỂM TỰ LUẬN & LỜI PHÊ CỦA GIÁO VIÊN:</span>
                      </div>
                      {selectedResultForReview.isGraded && (
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> Đã lưu điểm
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-bold text-purple-900 mb-1">
                          ⭐ Điểm tự luận:
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="10"
                          value={essayGradingScore}
                          onChange={(e) => setEssayGradingScore(e.target.value)}
                          placeholder="VD: 2.5"
                          className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none shadow-2xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-purple-900 mb-1">
                          💬 Lời phê / Nhận xét của giáo viên:
                        </label>
                        <input
                          type="text"
                          value={teacherFeedback}
                          onChange={(e) => setTeacherFeedback(e.target.value)}
                          placeholder="Nhận xét cách trình bày, lỗi sai hoặc lời khen cho học sinh..."
                          className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-purple-900 font-medium">
                        {essayGradingScore.trim() !== '' && (
                          <span>
                            Tổng kết: <strong className="text-slate-900">{selectedResultForReview.score ?? 0} (TN)</strong> + <strong className="text-purple-700">{essayGradingScore} (TL)</strong>
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleSaveGrading}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu kết quả chấm & Nhận xét</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Thanh bộ lọc & Lưới danh sách các câu hỏi nhanh (Câu 1, Câu 2...) */}
              {detailedList.length > 0 && (
                <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                      <span className="text-slate-500 mr-1 text-xs">Lọc danh sách:</span>
                      <button
                        onClick={() => setReviewFilter('all')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold ${
                          reviewFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả ({detailedList.length})
                      </button>
                      <button
                        onClick={() => setReviewFilter('correct')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                          reviewFilter === 'correct' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đúng ({correctQCount})
                      </button>
                      <button
                        onClick={() => setReviewFilter('wrong')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                          reviewFilter === 'wrong' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Sai ({wrongQCount})
                      </button>
                      <button
                        onClick={() => setReviewFilter('unanswered')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                          reviewFilter === 'unanswered' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5" /> Chưa làm ({unansweredQCount})
                      </button>
                      {essayQCount > 0 && (
                        <button
                          onClick={() => setReviewFilter('essay')}
                          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                            reviewFilter === 'essay' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                          }`}
                        >
                          📝 Tự luận ({essayQCount})
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 italic hidden md:inline">
                      💡 Bấm vào ô số câu bên dưới để cuộn nhanh đến câu hỏi
                    </span>
                  </div>

                  {/* Lưới các câu: Câu 1, Câu 2, Câu 3... */}
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {detailedList.map((item: any, idx: number) => {
                      const qNum = item.questionNumber || idx + 1;
                      const isEssay = item.type === 'essay';
                      const isCorr = item.isCorrect;
                      const hasAns = item.hasAnswered;

                      let btnStyle = "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
                      if (isEssay) {
                        btnStyle = "bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100";
                      } else if (isCorr) {
                        btnStyle = "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100";
                      } else if (hasAns) {
                        btnStyle = "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100";
                      } else {
                        btnStyle = "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            const el = document.getElementById(`review-question-${qNum}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.classList.add('ring-4', 'ring-indigo-400');
                              setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-400'), 1500);
                            }
                          }}
                          title={`Câu ${qNum}: ${isEssay ? 'Tự luận' : isCorr ? 'Đúng' : hasAns ? 'Sai' : 'Chưa làm'} (Học sinh: ${item.studentChoice})`}
                          className={`min-w-[34px] h-8 px-1.5 border rounded-lg text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-transform active:scale-95 shadow-2xs ${btnStyle}`}
                        >
                          <span>{qNum}</span>
                          {isCorr ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : hasAns && !isEssay ? (
                            <X className="w-3 h-3 text-rose-600" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Danh sách kết quả chi tiết từng câu */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {filteredItems.length > 0 ? (
                  <div className="space-y-6">
                    {filteredItems.map((item: any, qIdx: number) => {
                      const qNum = item.questionNumber || qIdx + 1;
                      const type = String(item.type || '').toLowerCase();
                      const isEssay = type === 'essay';
                      const isTF = type === 'tf';
                      const isSA = type === 'sa';
                      const isMC = type === 'mc';

                      let cardBorder = "border-slate-200 bg-white";
                      if (isEssay) {
                        cardBorder = "border-purple-200 bg-purple-50/20";
                      } else if (item.isCorrect) {
                        cardBorder = "border-emerald-200 bg-emerald-50/15";
                      } else if (item.hasAnswered) {
                        cardBorder = "border-rose-200 bg-rose-50/15";
                      } else {
                        cardBorder = "border-amber-200 bg-amber-50/15";
                      }

                      // Đối với tự luận: trích xuất ảnh và bài gõ
                      const essaySubmission = selectedResultForReview.essaySubmissions?.find((es: any) => es.questionIndex === qNum);
                      const essayText = item.essayText || essaySubmission?.textAnswer || (typeof item.studentChoice === 'string' && !item.studentChoice.startsWith('[Đã đính kèm') ? item.studentChoice : '');
                      
                      let rootImages: string[] = [];
                      if (selectedResultForReview.essayImages) {
                        if (Array.isArray(selectedResultForReview.essayImages)) rootImages = selectedResultForReview.essayImages;
                        else if (typeof selectedResultForReview.essayImages === 'string') {
                          try {
                            const parsed = JSON.parse(selectedResultForReview.essayImages);
                            if (Array.isArray(parsed)) rootImages = parsed;
                          } catch (e) {}
                        }
                      }
                      const essayPhotos: string[] = (item.essayImages && item.essayImages.length > 0) 
                        ? item.essayImages 
                        : (essaySubmission?.images && essaySubmission.images.length > 0 ? essaySubmission.images : rootImages);

                      return (
                        <div
                          key={qIdx}
                          id={`review-question-${qNum}`}
                          className={`border-2 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 transition-all duration-300 ${cardBorder}`}
                        >
                          {/* Header của câu */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-black text-xs sm:text-sm">
                                Câu {qNum}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                                {isMC ? 'Trắc nghiệm 4 lựa chọn' : isTF ? 'Trắc nghiệm Đúng / Sai' : isSA ? 'Trả lời ngắn' : 'Tự luận'}
                              </span>
                            </div>

                            {/* Status badge: Icon/Màu sắc: Xanh lá (Đúng), Đỏ (Sai), Vàng/Xám (Chưa làm), Tím (Tự luận) */}
                            {isEssay ? (
                              <span className="px-3 py-1 bg-purple-100 text-purple-900 rounded-full font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                                <Award className="w-3.5 h-3.5 text-purple-600" /> TỰ LUẬN
                              </span>
                            ) : item.isCorrect ? (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs flex items-center gap-1.5 border border-emerald-200">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ĐÚNG
                              </span>
                            ) : item.hasAnswered ? (
                              <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-xs flex items-center gap-1.5 border border-rose-200">
                                <XCircle className="w-4 h-4 text-rose-600" /> SAI
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs flex items-center gap-1.5 border border-amber-200">
                                <AlertCircle className="w-4 h-4 text-amber-600" /> CHƯA LÀM
                              </span>
                            )}
                          </div>

                          {/* Nội dung câu hỏi (Đề bài) */}
                          <div className="text-slate-900 text-sm sm:text-base leading-relaxed">
                            <MarkdownRenderer content={item.questionContent || 'Nội dung câu hỏi'} />
                          </div>

                          {/* Hiển thị trực quan kết quả theo loại câu hỏi */}
                          {/* 1. Trắc nghiệm 4 lựa chọn (MC) */}
                          {isMC && (
                            <div className="space-y-3">
                              {/* Banner so sánh rõ ràng: Học sinh chọn: [A] - Đáp án đúng: [B] */}
                              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Học sinh chọn:</span>
                                    <span className={`px-2.5 py-1 rounded-lg font-black text-sm ${
                                      item.isCorrect ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                      item.hasAnswered ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                      'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}>
                                      [{item.studentChoice || 'Chưa làm'}]
                                    </span>
                                  </div>
                                  <span className="text-slate-300 font-light">|</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Đáp án đúng:</span>
                                    <span className="px-2.5 py-1 rounded-lg font-black text-sm bg-emerald-600 text-white shadow-2xs">
                                      [{item.correctChoice || '?'}]
                                    </span>
                                  </div>
                                </div>

                                {item.isCorrect ? (
                                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                    <Check className="w-4 h-4 text-emerald-600" /> Kết quả chính xác (+ điểm)
                                  </span>
                                ) : item.hasAnswered ? (
                                  <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                                    <X className="w-4 h-4 text-rose-600" /> Lựa chọn chưa chính xác
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4 text-amber-600" /> Bỏ trống câu này
                                  </span>
                                )}
                              </div>

                              {/* Danh sách 4 phương án A, B, C, D với nhãn nổi bật */}
                              {item.options && item.options.length > 0 && (
                                <div className="w-full space-y-2 pt-1">
                                  {item.options.map((opt: string, optIdx: number) => {
                                    const optLetter = String.fromCharCode(65 + optIdx);
                                    const sChoiceTrim = String(item.studentChoice || item.studentAnswer || '').trim().toUpperCase();
                                    const cChoiceTrim = String(item.correctChoice || item.correctAnswer || '').trim().toUpperCase();
                                    const isChosen = sChoiceTrim === optLetter || sChoiceTrim.startsWith(optLetter + '.') || sChoiceTrim.startsWith(optLetter + ':') || sChoiceTrim.startsWith(optLetter + ' ');
                                    const isCorrect = cChoiceTrim === optLetter || cChoiceTrim.startsWith(optLetter + '.') || cChoiceTrim.startsWith(optLetter + ':') || cChoiceTrim.startsWith(optLetter + ' ');

                                    let optBoxStyle = "border-slate-200 bg-white text-slate-700";
                                    if (isChosen && isCorrect) {
                                      optBoxStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold shadow-xs";
                                    } else if (isChosen && !isCorrect) {
                                      optBoxStyle = "border-rose-400 bg-rose-50 text-rose-900 font-semibold shadow-xs";
                                    } else if (!isChosen && isCorrect) {
                                      optBoxStyle = "border-emerald-300 bg-emerald-50/40 text-emerald-800";
                                    }

                                    return (
                                      <div key={optIdx} className={`w-full min-h-[44px] flex items-center px-4 py-2 text-left rounded-lg border transition-colors break-words overflow-hidden text-xs sm:text-sm gap-2 ${optBoxStyle}`}>
                                        <span className="font-bold shrink-0 min-w-[1.5rem]">{optLetter}.</span>
                                        <div className="flex-1 break-words overflow-hidden">
                                          <MarkdownRenderer content={cleanOptionText(opt)} />
                                        </div>
                                        {isChosen && (
                                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-auto shrink-0 whitespace-nowrap ${
                                            isCorrect ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white'
                                          }`}>
                                            HS chọn
                                          </span>
                                        )}
                                        {isCorrect && !isChosen && (
                                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white ml-auto shrink-0 whitespace-nowrap">
                                            Đáp án đúng
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 2. Trắc nghiệm Đúng / Sai (TF) */}
                          {isTF && (
                            <div className="space-y-3">
                              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Học sinh chọn:</span>
                                    <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                                      item.isCorrect ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}>
                                      {item.studentChoice}
                                    </span>
                                  </div>
                                  <span className="text-slate-300 font-light">|</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Đáp án đúng:</span>
                                    <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-emerald-600 text-white shadow-2xs">
                                      {item.correctChoice}
                                    </span>
                                  </div>
                                </div>

                                <span className={`text-xs font-bold ${item.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {item.isCorrect ? '✓ Đúng hoàn toàn cả 4 ý' : 'Có ý chưa chính xác'}
                                </span>
                              </div>

                              {/* Hiển thị chi tiết từng ý a, b, c, d */}
                              {item.tfDetails && item.tfDetails.length > 0 && (
                                <div className="space-y-2 pt-1">
                                  <p className="text-xs font-bold text-slate-700">Trạng thái chi tiết từng ý:</p>
                                  {item.tfDetails.map((stmt: any, sIdx: number) => {
                                    const sub = stmt.sub || String.fromCharCode(97 + sIdx);
                                    const isSubCorrect = stmt.isCorrect;
                                    return (
                                      <div
                                        key={sIdx}
                                        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm ${
                                          isSubCorrect ? 'bg-emerald-50/40 border-emerald-200' : stmt.hasAnswered ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'
                                        }`}
                                      >
                                        <div className="flex items-start gap-2 flex-1 min-w-[220px]">
                                          <span className="font-bold text-slate-800">{sub})</span>
                                          <div className="text-slate-800">
                                            <MarkdownRenderer content={stmt.statement || ''} />
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <div className="text-xs">
                                            <span className="text-slate-500 font-medium">HS chọn: </span>
                                            <strong className={isSubCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                                              {stmt.studentChoice || 'Chưa chọn'}
                                            </strong>
                                          </div>
                                          <div className="text-xs">
                                            <span className="text-slate-500 font-medium">Đáp án: </span>
                                            <strong className="text-emerald-800">
                                              {stmt.correctChoice}
                                            </strong>
                                          </div>
                                          <div>
                                            {isSubCorrect ? (
                                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                                                <Check className="w-3 h-3 text-emerald-600" /> Đúng
                                              </span>
                                            ) : stmt.hasAnswered ? (
                                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] flex items-center gap-1">
                                                <X className="w-3 h-3 text-rose-600" /> Sai
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                                                Chưa chọn
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. Trả lời ngắn (SA) */}
                          {isSA && (
                            <div className="space-y-3">
                              <div className="p-3.5 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 shadow-2xs">
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Giá trị học sinh điền:
                                  </span>
                                  <div className={`p-2.5 rounded-lg border font-mono text-sm sm:text-base font-bold flex items-center justify-between ${
                                    item.isCorrect ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                    item.hasAnswered ? 'bg-rose-50 text-rose-800 border-rose-300' :
                                    'bg-amber-50 text-amber-800 border-amber-300'
                                  }`}>
                                    <span>{item.studentChoice || '(Để trống / Chưa làm)'}</span>
                                    {item.isCorrect ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    ) : item.hasAnswered ? (
                                      <XCircle className="w-5 h-5 text-rose-600" />
                                    ) : (
                                      <AlertCircle className="w-5 h-5 text-amber-600" />
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Đáp án chuẩn của đề:
                                  </span>
                                  <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/70 text-emerald-900 font-mono text-sm sm:text-base font-bold">
                                    {item.correctChoice || 'Chưa thiết lập'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 4. Tự luận (Essay) */}
                          {isEssay && (
                            <div className="space-y-4 pt-1">
                              {/* Bài giải học sinh gõ trực tiếp */}
                              <div className="bg-white border border-purple-200 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
                                <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                                  <span>✍️ Bài giải học sinh gõ trực tiếp:</span>
                                </p>
                                {essayText && essayText.trim().length > 0 ? (
                                  <div className="text-sm font-sans text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    {essayText}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">Học sinh không gõ bài giải bằng bàn phím.</p>
                                )}
                              </div>

                              {/* Ảnh bài giải học sinh đính kèm */}
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Camera className="w-4 h-4 text-purple-600" />
                                    <span>Ảnh bài giải đính kèm ({essayPhotos.length} ảnh):</span>
                                  </p>
                                  {essayPhotos.length > 0 && (
                                    <span className="text-[11px] text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                      💡 Bấm vào ảnh để phóng to & xoay ảnh
                                    </span>
                                  )}
                                </div>

                                {essayPhotos.length > 0 ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                                    {essayPhotos.map((imgUrl: string, pIdx: number) => (
                                      <div
                                        key={pIdx}
                                        onClick={() => {
                                          setPreviewModalImage(imgUrl);
                                          setImageRotation(0);
                                          setImageZoom(1);
                                        }}
                                        className="group relative border-2 border-purple-200 hover:border-purple-600 rounded-xl overflow-hidden bg-slate-100 aspect-3/4 flex items-center justify-center cursor-pointer shadow-2xs hover:shadow-md transition-all"
                                      >
                                        <img
                                          src={imgUrl}
                                          alt={`Ảnh bài làm trang ${pIdx + 1}`}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        />
                                        <div className="absolute top-2 left-2 bg-purple-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                                          Trang {pIdx + 1}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                                          <Maximize2 className="w-6 h-6 drop-shadow" />
                                          <span className="text-xs font-semibold drop-shadow">Phóng to & Xoay</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 italic">
                                    Học sinh không tải lên ảnh bài giải cho câu này.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Lời giải chi tiết nếu có */}
                          {item.explanation && (
                            <div className="text-xs text-slate-700 bg-blue-50/60 p-3 rounded-xl border border-blue-200/80 mt-2">
                              <p className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                                <span>💡 Lời giải chi tiết:</span>
                              </p>
                              <div className="text-slate-800">
                                <MarkdownRenderer content={item.explanation} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">
                      Không có câu hỏi nào khớp với bộ lọc đã chọn.
                    </p>
                    <button
                      onClick={() => setReviewFilter('all')}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                    >
                      Xem tất cả các câu
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {hasAnyEssay ? 'Nhấn [Lưu kết quả chấm & Nhận xét] ở thanh phía trên sau khi chấm tự luận.' : 'Dữ liệu được lưu trữ tự động trên thiết bị và đồng bộ đám mây.'}
                </div>
                <button
                  onClick={() => setSelectedResultForReview(null)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX PHÓNG TO & XOAY ẢNH BÀI LÀM TỰ LUẬN */}
      {previewModalImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex flex-col items-center justify-between p-3 sm:p-5 animate-in fade-in duration-200 select-none">
          {/* Top Control Bar */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white pb-3 border-b border-white/20">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base">📸 Xem ảnh bài làm tự luận của học sinh</span>
              <span className="text-xs text-slate-300 hidden sm:inline">
                (Góc xoay: {imageRotation}°, Thu phóng: {Math.round(imageZoom * 100)}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Rotate Button */}
              <button
                onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-emerald-300 hover:text-emerald-200"
                title="Xoay ảnh 90 độ theo chiều kim đồng hồ"
              >
                <RotateCw className="w-4 h-4 text-emerald-400" />
                <span>Xoay 90°</span>
              </button>

              {/* Zoom Out */}
              <button
                onClick={() => setImageZoom((prev) => Math.max(0.5, prev - 0.25))}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition-colors cursor-pointer text-white"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* Reset Zoom */}
              <button
                onClick={() => { setImageZoom(1); setImageRotation(0); }}
                className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer text-white"
                title="Đặt lại góc xoay và độ thu phóng chuẩn"
              >
                100%
              </button>

              {/* Zoom In */}
              <button
                onClick={() => setImageZoom((prev) => Math.min(3, prev + 0.25))}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition-colors cursor-pointer text-white"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Close Button */}
              <button
                onClick={() => setPreviewModalImage(null)}
                className="p-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-xs transition-colors cursor-pointer ml-2"
                title="Đóng xem ảnh"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Center Image Canvas */}
          <div className="flex-1 w-full max-w-5xl flex items-center justify-center overflow-auto p-2 sm:p-4">
            <img
              src={previewModalImage}
              alt="Bài làm tự luận"
              style={{
                transform: `rotate(${imageRotation}deg) scale(${imageZoom})`,
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                maxHeight: '78vh',
                maxWidth: '85vw',
                objectFit: 'contain'
              }}
              className="rounded-lg shadow-2xl shadow-black/80"
            />
          </div>

          {/* Bottom Footer info */}
          <div className="text-center text-xs text-slate-400 pt-2">
            💡 Mẹo: Bấm nút <strong>Xoay 90°</strong> nếu ảnh bài giải bị chụp ngang/nghiêng; bấm <strong>Phóng to</strong> để xem rõ nét từng nét chữ của học sinh.
          </div>
        </div>
      )}
      
      {showBubbleSheetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Tải/In Phiếu Tô Trắc Nghiệm</h3>
              <button onClick={() => setShowBubbleSheetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                 <p className="font-semibold text-slate-700 mb-2">1. Mẫu hệ thống (In trực tiếp - Trắc nghiệm 4 đáp án)</p>
                 <button onClick={() => handlePrintBubbleSheet(totalQuestionsCalc)} className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 flex items-center justify-between group transition-colors">
                   <div>
                                           <p className="font-medium text-slate-800 group-hover:text-emerald-700">Phiếu tô {totalQuestionsCalc} câu cơ bản</p>
                     <p className="text-sm text-slate-500">In siêu tốc trực tiếp từ trình duyệt</p>
                   </div>
                   <Printer className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                 </button>
              </div>
              
              <div>
                 <p className="font-semibold text-slate-700 mb-2">2. Mẫu chuẩn Bộ GD&ĐT 2025 (TNMaker)</p>
                 <a href="https://tnmaker.net/phieu-tltn-2025-bgd/" target="_blank" rel="noreferrer" className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group mb-2 transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-blue-700">Xem toàn bộ Kho Phiếu BGD 2025</p>
                     <p className="text-sm text-slate-500">Gồm Trắc nghiệm, Đúng/Sai, Trả lời ngắn</p>
                   </div>
                   <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                 </a>
                 <div className="grid grid-cols-2 gap-2">
                   <a href="https://tnmaker.net/wp-content/uploads/2023/12/Phieu-TLTN-50-cau-2025.pdf" target="_blank" rel="noreferrer" className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group transition-colors">
                     <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Mẫu 50 Câu</span>
                     <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                   </a>
                   <a href="https://tnmaker.net/wp-content/uploads/2023/12/Phieu-TLTN-40-cau-2025.pdf" target="_blank" rel="noreferrer" className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group transition-colors">
                     <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Mẫu 40 Câu</span>
                     <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                   </a>
                 </div>
              </div>

              <div>
                 <p className="font-semibold text-slate-700 mb-2">3. Mẫu phần mềm chấm thi QM 2025</p>
                 <a href="https://qmapp.vn/phieu-mau/" target="_blank" rel="noreferrer" className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-orange-50 hover:border-orange-200 flex items-center justify-between group mb-2 transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-orange-700">Xem toàn bộ Kho Phiếu QM</p>
                     <p className="text-sm text-slate-500">Mẫu quét cực nhạy cho Toán/Văn/Anh 2025</p>
                   </div>
                   <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-orange-600" />
                 </a>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowBubbleSheetModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Thêm Câu Hỏi Thủ Công */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" /> Thêm Câu Hỏi Mới Vào Đề Gốc
              </h3>
              <button onClick={() => setShowAddQuestionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dạng câu hỏi</label>
                  <select
                    value={newQuestionType}
                    onChange={(e: any) => setNewQuestionType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                  >
                    <option value="mc">Trắc nghiệm 4 lựa chọn</option>
                    <option value="tf">Đúng / Sai (4 ý a,b,c,d)</option>
                    <option value="sa">Trả lời ngắn</option>
                    <option value="essay">Tự luận</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mức độ</label>
                  <select
                    value={newQuestionLevel}
                    onChange={e => setNewQuestionLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                  >
                    <option value="Nhận biết">Nhận biết</option>
                    <option value="Thông hiểu">Thông hiểu</option>
                    <option value="Vận dụng">Vận dụng</option>
                    <option value="Vận dụng cao">Vận dụng cao</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Chủ đề (Topic)</label>
                  <input
                    type="text"
                    value={newQuestionTopic}
                    onChange={e => setNewQuestionTopic(e.target.value)}
                    placeholder="VD: Hàm số, Tích phân..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Nội dung câu hỏi <span className="text-slate-400 font-normal normal-case">(hỗ trợ LaTeX kẹp trong $...$)</span>
                </label>
                <textarea
                  rows={3}
                  value={newQuestionContent}
                  onChange={e => setNewQuestionContent(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi... Ví dụ: Cho hàm số $y = f(x)$ liên tục trên $\mathbb{R}$..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-sans focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {newQuestionType === "mc" && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase">4 Phương án & Chọn đáp án đúng</label>
                  {["A", "B", "C", "D"].map((lbl, idx) => (
                    <div key={lbl} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-opt"
                        checked={newQuestionCorrectIndex === idx}
                        onChange={() => setNewQuestionCorrectIndex(idx)}
                        className="w-4 h-4 text-emerald-600"
                        title={`Chọn ${lbl} là đáp án đúng`}
                      />
                      <span className="font-bold text-sm text-slate-700 w-6">{lbl}.</span>
                      <input
                        type="text"
                        value={newQuestionOptions[idx]}
                        onChange={e => {
                          const updated = [...newQuestionOptions];
                          updated[idx] = e.target.value;
                          setNewQuestionOptions(updated);
                        }}
                        placeholder={`Nội dung phương án ${lbl}...`}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {newQuestionType === "tf" && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Nội dung 4 mệnh đề (a, b, c, d)</label>
                  {["a", "b", "c", "d"].map((lbl, idx) => (
                    <div key={lbl} className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-700 w-6">{lbl})</span>
                      <input
                        type="text"
                        value={newQuestionOptions[idx]}
                        onChange={e => {
                          const updated = [...newQuestionOptions];
                          updated[idx] = e.target.value;
                          setNewQuestionOptions(updated);
                        }}
                        placeholder={`Mệnh đề ${lbl}...`}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {newQuestionType === "sa" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-indigo-900 uppercase">
                      Đáp án số (Tối đa 4 ký tự - Chuẩn GDPT 2018)
                    </label>
                    <span className="text-xs font-mono text-slate-500">
                      Đã nhập: <strong className={newQuestionAnswer.length === 4 ? 'text-amber-600' : 'text-indigo-600'}>{newQuestionAnswer.length}/4</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      maxLength={4}
                      value={newQuestionAnswer}
                      onChange={e => setNewQuestionAnswer(sanitizeShortAnswerInput(e.target.value))}
                      placeholder="Ví dụ: 22, -3.5, 102"
                      className="w-36 text-center text-lg font-mono font-bold tracking-widest px-3 py-2 border-2 border-indigo-300 rounded-lg text-indigo-800 bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    {/* Mô phỏng 4 ô vuông */}
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map(slotIdx => {
                        const ch = newQuestionAnswer[slotIdx];
                        return (
                          <div
                            key={slotIdx}
                            className={`w-7 h-9 border rounded flex items-center justify-center font-mono font-bold text-sm ${
                              ch
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                                : 'border-dashed border-slate-300 bg-white text-slate-300'
                            }`}
                          >
                            {ch || '•'}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      Chỉ chấp nhận số (0-9), dấu (-) và (, hoặc .)
                    </span>
                  </div>
                  {(() => {
                    if (!newQuestionAnswer) return null;
                    const val = validateShortAnswer(newQuestionAnswer);
                    if (!val.isValid && val.warning) {
                      return (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>{val.warning}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {newQuestionType === "essay" && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Lời giải vắn tắt / Thang điểm
                  </label>
                  <input
                    type="text"
                    value={newQuestionAnswer}
                    onChange={e => setNewQuestionAnswer(e.target.value)}
                    placeholder="Đáp số và barem điểm..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Lời giải chi tiết <span className="text-slate-400 font-normal normal-case">(Tùy chọn)</span>
                </label>
                <textarea
                  rows={2}
                  value={newQuestionExplanation}
                  onChange={e => setNewQuestionExplanation(e.target.value)}
                  placeholder="Nhập lời giải hoặc hướng dẫn làm bài..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveManualQuestion}
                className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" /> Lưu Câu Hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Nhanh Từ Văn Bản (Word / Text) */}
      {showImportTextModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 overflow-hidden border border-slate-200">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-blue-600" /> Nhập Nhanh Câu Hỏi Từ Văn Bản / Word
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Hệ thống tự động nhận diện dạng trắc nghiệm A/B/C/D hoặc Đúng/Sai a/b/c/d</p>
              </div>
              <button onClick={() => setShowImportTextModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-800 space-y-1">
                <p className="font-bold">Định dạng hỗ trợ:</p>
                <p>• Câu 1: Cho hàm số... A. ... B. ... C. ... D. ... Đáp án: A</p>
                <p>• Câu 2: Trong không gian Oxyz... a) ... b) ... c) ... d) ...</p>
                <p>• Có thể dán trực tiếp nhiều câu cùng lúc từ file Word.</p>
              </div>

              <textarea
                rows={12}
                value={importRawText}
                onChange={e => setImportRawText(e.target.value)}
                placeholder="Dán nội dung các câu hỏi tại đây...&#10;&#10;Câu 1: Tập xác định của hàm số $y = \log_2(x-1)$ là:&#10;A. $(1; +\infty)$&#10;B. $[1; +\infty)$&#10;C. $(-\infty; 1)$&#10;D. $\mathbb{R} \setminus \{1\}$&#10;Đáp án: A&#10;Lời giải: Điều kiện $x - 1 > 0 \Leftrightarrow x > 1$."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setImportRawText(`Câu 1: Đạo hàm của hàm số $y = x^3 - 3x + 1$ là:
A. $y' = 3x^2 - 3$
B. $y' = 3x^2 + 3$
C. $y' = x^2 - 3$
D. $y' = 3x^2$
Đáp án: A
Lời giải: Áp dụng công thức $(x^n)' = n x^{n-1}$.

Câu 2: Cho hàm số $y = \frac{x+1}{x-1}$. Xét tính đúng sai của các khẳng định sau:
a) Tập xác định của hàm số là $D = \mathbb{R} \setminus \{1\}$.
b) Đồ thị hàm số có tiệm cận đứng là $x = 1$.
c) Đồ thị hàm số có tiệm cận ngang là $y = 2$.
d) Hàm số nghịch biến trên từng khoảng xác định.
Lời giải: Tiệm cận ngang là $y = 1$ nên ý c sai.`);
                  }}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  ⚡ Điền văn bản mẫu thử nghiệm
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  {importRawText.split(/\n/).length} dòng
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowImportTextModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleImportText}
                className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" /> Bóc Tách & Nạp Vào Đề Gốc
              </button>
            </div>
          </div>
        </div>
      )}
      {showTeacherUploadModal && (
        <UploadTeacherExamModal
          isOpen={showTeacherUploadModal}
          onClose={() => setShowTeacherUploadModal(false)}
        />
      )}

      {showSimilarExamsModal && (
        <SimilarExamsModal
          isOpen={showSimilarExamsModal}
          onClose={() => setShowSimilarExamsModal(false)}
          initialQuestions={questions}
          initialExamName={examName || "ĐỀ KIỂM TRA"}
          subject={subject}
          grade={grade}
          onApplyAsOriginalExam={(newQs, newName) => {
            setQuestions(newQs);
            if (newName) setExamName(newName);
            setActiveTab("exam");
          }}
        />
      )}

      {isOnlineConfigModalOpen && (
        <OnlineExamConfigModal
          isOpen={isOnlineConfigModalOpen}
          onClose={() => setIsOnlineConfigModalOpen(false)}
          examName={examName}
          examType={examType}
          duration={duration}
          schoolLevel={schoolLevel}
          subject={subject}
          grade={grade}
          shuffledExams={shuffledExams}
          originalQuestions={questions}
          onExamUpdated={(upd) => {
            setExamName(upd.examName);
            setExamType(upd.examType);
            setDuration(upd.duration);
          }}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-amber-400 text-lg">⚠️</span>
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Word Equation Converter Modal */}
      <WordEquationModal
        isOpen={showWordEquationModal}
        onClose={() => setShowWordEquationModal(false)}
      />

      {/* Header Config Modal (Trường, GV, Năm học 2026-2027) */}
      <HeaderConfigModal
        isOpen={isHeaderModalOpen}
        onClose={() => setIsHeaderModalOpen(false)}
        config={headerConfig}
        onSave={handleSaveHeaderConfig}
        title="Tùy chỉnh tiêu đề đề thi (Trường, GV, Năm học 2026 - 2027...)"
      />

      {/* Question Edit / BBT Modal for ExamGenerator */}
      <QuestionEditModal
        isOpen={Boolean(editingExamQuestion)}
        question={editingExamQuestion ? editingExamQuestion.question as any : null}
        questionNumber={editingExamQuestion ? editingExamQuestion.index + 1 : 1}
        subject={subject}
        grade={grade}
        onClose={() => setEditingExamQuestion(null)}
        onSave={handleSaveEditedExamQuestion}
      />

      {/* Floating Casio Calculator Trigger Button & Modal */}
      <button
        onClick={() => setShowCalculator(!showCalculator)}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white hover:bg-slate-805 hover:scale-105 active:scale-95 p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all border border-slate-750 no-print"
        title="Mở Máy tính Khoa học Casio"
      >
        <Calculator className="w-6 h-6 text-emerald-400" />
      </button>

      {showCalculator && (
        <ScientificCalculatorModal onClose={() => setShowCalculator(false)} />
      )}

      {/* GeoGebra Drawer Integration Modal */}
      {geoGebraTarget !== null && (
        <GeoGebraDrawer
          onInsertImage={(base64) => {
            const idx = geoGebraTarget.qIndex;
            setQuestions(prev => {
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                imageUrl: base64,
                hasFigure: true
              };
              return next;
            });
            setGeoGebraTarget(null);
            setToastMessage(`Đã chèn hình vẽ GeoGebra thành công vào câu hỏi số ${idx + 1}!`);
          }}
          onClose={() => setGeoGebraTarget(null)}
        />
      )}
    </div>
    </div>
  );
}



