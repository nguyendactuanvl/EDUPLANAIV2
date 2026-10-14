import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, BookOpen, Award, Sparkles, Clock, CheckCircle2, 
  HelpCircle, Send, FileText, Brain, Compass, Layers, Calculator, 
  Play, RotateCcw, Check, XCircle, ChevronRight, ShieldCheck, 
  BookMarked, Lightbulb, Target, TrendingUp, BarChart3, RefreshCw,
  Printer, Download, Copy, Shuffle, Plus, PieChart, Activity,
  Users, UserPlus, MessageSquare
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { apiFetch } from '../lib/apiFetch';

interface PracticeQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
}

const HSA_QUESTION_BANK: PracticeQuestion[] = [
  {
    id: 1,
    topic: "Tư duy Định lượng (Toán học)",
    question: "Cho hàm số $y = x^3 - 3x^2 + 2$. Giá trị cực đại $y_{CĐ}$ và cực tiểu $y_{CT}$ của hàm số thỏa mãn biểu thức $2y_{CĐ} + 3y_{CT}$ bằng:",
    options: ["A. $4$", "B. $-2$", "C. $6$", "D. $0$"],
    correctAnswer: "B",
    explanation: "Ta có $y' = 3x^2 - 6x = 0 \\Leftrightarrow \\begin{cases} x = 0 \\implies y_{CĐ} = 2 \\\\ x = 2 \\implies y_{CT} = -2 \\end{cases}$. Khi đó $2y_{CĐ} + 3y_{CT} = 2(2) + 3(-2) = -2$."
  },
  {
    id: 2,
    topic: "Tư duy Định lượng (Toán học)",
    question: "Trong không gian với hệ tọa độ $Oxyz$, cho mặt phẳng $(P): 2x - y + 2z - 5 = 0$ và điểm $M(1; 2; -3)$. Khoảng cách từ điểm $M$ đến mặt phẳng $(P)$ là:",
    options: ["A. $\\frac{11}{3}$", "B. $\\frac{4}{3}$", "C. $2$", "D. $\\frac{7}{3}$"],
    correctAnswer: "A",
    explanation: "Áp dụng công thức khoảng cách $d(M, (P)) = \\frac{|2(1) - 2 + 2(-3) - 5|}{\\sqrt{4+1+4}} = \\frac{11}{3}$."
  },
  {
    id: 3,
    topic: "Tư duy Định tính (Ngữ văn)",
    question: "Đoạn thơ sau trích từ tác phẩm nào? \"Gió theo lối gió mây đường mây, / Dòng nước buồn thiu hoa bắp lay... / Thuyền ai đậu bến sông trăng đó, / Có chở trăng về kịp tối nay?\"",
    options: ["A. Đây thôn Vĩ Dạ - Hàn Mặc Tử", "B. Tràng giang - Huy Cận", "C. Tây Tiến - Quang Dũng", "D. Sóng - Xuân Quỳnh"],
    correctAnswer: "A",
    explanation: "Đoạn thơ trên là khổ đầu tiên của bài thơ *Đây thôn Vĩ Dạ* của Hàn Mặc Tử."
  },
  {
    id: 4,
    topic: "Khoa học (Vật lý)",
    question: "Một dòng điện xoay chiều chạy qua điện trở $R = 50\\,\\Omega$ có biểu thức $i = 2\\cos(100\\pi t - \\frac{\\pi}{3})\\,\\text{(A)}$. Nhiệt lượng tỏa ra trong $1$ phút là:",
    options: ["A. $6000\\,\\text{J}$", "B. $12000\\,\\text{J}$", "C. $3000\\,\\text{J}$", "D. $120\\,\\text{J}$"],
    correctAnswer: "A",
    explanation: "Cường độ hiệu dụng $I = \\sqrt{2}\\,\\text{A}$. Nhiệt lượng $Q = I^2 R t = 2 \\cdot 50 \\cdot 60 = 6000\\,\\text{J}$."
  },
  {
    id: 5,
    topic: "Khoa học (Sinh học)",
    question: "Trong operon Lac ở E. coli, vùng nào là nơi protein ức chế bám vào để ngăn cản phiên mã?",
    options: ["A. Vùng khởi động ($P$)", "B. Vùng vận hành ($O$)", "C. Gen điều hòa ($R$)", "D. Gen cấu trúc ($Z, Y, A$)"],
    correctAnswer: "B",
    explanation: "Vùng vận hành ($O$) là nơi protein ức chế liên kết để chặn quá trình phiên mã."
  },
  {
    id: 6,
    topic: "Tư duy Định lượng (Toán học)",
    question: "Cho số phức $z$ thỏa mãn $(1 + i)z = 3 - i$. Môđun của số phức $z$ là:",
    options: ["A. $\\sqrt{5}$", "B. $5$", "C. $2$", "D. $\\sqrt{10}$"],
    correctAnswer: "A",
    explanation: "$z = \\frac{3-i}{1+i} = \\frac{(3-i)(1-i)}{2} = \\frac{2 - 4i}{2} = 1 - 2i$. Môđun $|z| = \\sqrt{1^2 + (-2)^2} = \\sqrt{5}$."
  },
  {
    id: 7,
    topic: "Tư duy Định tính (Ngữ văn)",
    question: "Tác phẩm nào sau đây được viết bằng thể thơ tự do tiêu biểu trong chương trình Ngữ văn THPT?",
    options: ["A. Sóng (Xuân Quỳnh)", "B. Tây Tiến (Quang Dũng)", "C. Việt Bắc (Tố Hữu)", "D. Đất nước (Nguyễn Đình Thi)"],
    correctAnswer: "D",
    explanation: "Bài thơ *Đất nước* của Nguyễn Đình Thi tiêu biểu cho thơ tự do giai đoạn kháng chiến chống Pháp."
  }
];

const TSA_QUESTION_BANK: PracticeQuestion[] = [
  {
    id: 1,
    topic: "Tư duy Toán học",
    question: "Cho hàm số $f(x)$ liên tục trên $\\mathbb{R}$ và $\\int_{0}^{4} f(x)\\,dx = 10$. Giá trị của $I = \\int_{0}^{2} f(2x)\\,dx$ là:",
    options: ["A. $5$", "B. $10$", "C. $20$", "D. $2.5$"],
    correctAnswer: "A",
    explanation: "Đặt $u = 2x \\implies dx = \\frac{1}{2}du$. Đổi cận $x=0 \\to u=0, x=2 \\to u=4$. $I = \\frac{1}{2} \\int_{0}^{4} f(u)du = 5$."
  },
  {
    id: 2,
    topic: "Tư duy Đọc hiểu",
    question: "Theo tài liệu kỹ thuật về năng lượng mặt trời Perovskite, ưu điểm vượt trội so với Silicon là gì?",
    options: [
      "A. Chi phí sản xuất thấp, dễ chế tạo linh hoạt và quang phổ hấp thụ rộng.",
      "B. Độ bền vĩnh cửu không suy giảm.",
      "C. Không cần chất bán dẫn.",
      "D. Chỉ hoạt động ban đêm."
    ],
    correctAnswer: "A",
    explanation: "Perovskite có chi phí thấp và quang phổ hấp thụ rộng."
  },
  {
    id: 3,
    topic: "Tư duy Khoa học / GQVĐ",
    question: "Trong mạch RLC nối tiếp có $Z_L > Z_C$, độ lệch pha $\\varphi$ giữa điện áp và dòng điện là:",
    options: ["A. $\\varphi < 0$", "B. $\\varphi > 0$", "C. $\\varphi = 0$", "D. $\\varphi = \\pi/2$"],
    correctAnswer: "B",
    explanation: "Mạch có tính cảm kháng nên điện áp sớm pha hơn dòng điện, tức $\\varphi > 0$."
  },
  {
    id: 4,
    topic: "Tư duy Toán học",
    question: "Cho cấp số cộng $(u_n)$ có số hạng đầu $u_1 = 3$ và công sai $d = 4$. Số hạng thứ $10$ của cấp số cộng là:",
    options: ["A. $39$", "B. $43$", "C. $36$", "D. $40$"],
    correctAnswer: "A",
    explanation: "$u_{10} = u_1 + 9d = 3 + 9(4) = 39$."
  }
];

export function HsaTsaHub() {
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'practice' | 'generator' | 'progress' | 'analytics' | 'groups' | 'journal' | 'subjects' | 'ai_tutor'>('overview');
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<'math' | 'literature' | 'science' | 'logic'>('math');
  const [selectedExamType, setSelectedExamType] = useState<'hsa' | 'tsa'>('hsa');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isReaderMode, setIsReaderMode] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('hsa-focus-mode', { detail: isFocusMode }));
  }, [isFocusMode]);
  
  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentAnswers, setCurrentAnswers] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('hsa_tsa_current_answers');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(195 * 60);

  useEffect(() => {
    try {
      localStorage.setItem('hsa_tsa_current_answers', JSON.stringify(currentAnswers));
    } catch (e) {}
  }, [currentAnswers]);


  // Teacher Exam Generator state
  const [genCount, setGenCount] = useState<number>(5);
  const [genExamCode, setGenExamCode] = useState<string>("101");
  const [generatedExamList, setGeneratedExamList] = useState<PracticeQuestion[]>([]);
  const [showAnswersInGen, setShowAnswersInGen] = useState<boolean>(true);

  interface ExamScanWarning {
    type: 'error' | 'warning' | 'success';
    message: string;
  }
  const [examScanResults, setExamScanResults] = useState<ExamScanWarning[] | null>(null);
  const [isScanningExam, setIsScanningExam] = useState(false);

  const handleScanExamQuality = () => {
    setIsScanningExam(true);
    setTimeout(() => {
      const warnings: ExamScanWarning[] = [];
      if (generatedExamList.length === 0) {
        warnings.push({ type: 'error', message: 'Chưa có câu hỏi nào trong đề thi. Vui lòng bấm Trộn đề ngay.' });
      } else {
        generatedExamList.forEach((q, idx) => {
          if (!q.correctAnswer || !['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
            warnings.push({ type: 'error', message: `Câu ${idx + 1}: Thiếu hoặc sai định dạng đáp án đúng (${q.correctAnswer || 'Không có'}).` });
          }
          if (!q.explanation || q.explanation.trim().length < 5) {
            warnings.push({ type: 'warning', message: `Câu ${idx + 1}: Thiếu hoặc hướng dẫn giải chi tiết quá ngắn.` });
          }
          if (!q.options || q.options.length < 4) {
            warnings.push({ type: 'error', message: `Câu ${idx + 1}: Không đủ 4 phương án lựa chọn.` });
          }
        });

        const questionTexts = generatedExamList.map(q => q.question);
        const uniqueQuestions = new Set(questionTexts);
        if (uniqueQuestions.size < generatedExamList.length) {
          warnings.push({ type: 'error', message: 'Phát hiện câu hỏi trùng lặp trong đề thi được trộn.' });
        }
      }

      if (warnings.length === 0) {
        warnings.push({ type: 'success', message: 'Tuyệt vời! Đề thi đạt chuẩn 100% chất lượng sư phạm, không có lỗi thiếu đáp án hay thiếu lời giải.' });
      }

      setExamScanResults(warnings);
      setIsScanningExam(false);
    }, 400);
  };

  // Progress Tracking state (Recharts)
  const [progressHistory, setProgressHistory] = useState([
    { test: 'Đề số 1', score: 78, target: 110, math: 23, lang: 27, science: 28 },
    { test: 'Đề số 2', score: 85, target: 110, math: 26, lang: 30, science: 29 },
    { test: 'Đề số 3', score: 94, target: 110, math: 29, lang: 35, science: 30 },
    { test: 'Đề số 4', score: 102, target: 110, math: 34, lang: 36, science: 32 },
    { test: 'Đề số 5', score: 115, target: 110, math: 38, lang: 39, science: 38 },
  ]);
  const [newTestName, setNewTestName] = useState('');
  const [newTestScore, setNewTestScore] = useState('');
  const [newMathScore, setNewMathScore] = useState('');
  const [newLangScore, setNewLangScore] = useState('');
  const [newScienceScore, setNewScienceScore] = useState('');
  const [aiRoadmap, setAiRoadmap] = useState('');
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  // Daily Study Goals & Notification Reminder state
  interface DailyGoal {
    id: number;
    title: string;
    completed: boolean;
    category: 'math' | 'reading' | 'science' | 'practice';
    targetTime: string;
  }
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([
    { id: 1, title: 'Hoàn thành 20 câu hỏi Định lượng (Toán học) theo lộ trình AI', completed: false, category: 'math', targetTime: '09:00' },
    { id: 2, title: 'Đọc hiểu & Phân tích 2 bài báo khoa học kỹ thuật TSA', completed: true, category: 'reading', targetTime: '14:00' },
    { id: 3, title: 'Làm 1 bài thi thử mini 30 phút chống xao nhãng', completed: false, category: 'practice', targetTime: '20:00' }
  ]);
  const [isGeneratingAiGoals, setIsGeneratingAiGoals] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>("🔔 Nhắc nhở: Bạn còn 2 mục tiêu học tập hàng ngày chưa hoàn thành hôm nay!");

  const handleToggleGoal = (id: number) => {
    setDailyGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const handleGenerateAiDailyGoals = async () => {
    setIsGeneratingAiGoals(true);
    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Dựa trên kết quả ôn thi HSA/TSA và lộ trình học tập, hãy đề xuất 3 nhiệm vụ mục tiêu học tập hàng ngày cụ thể, ngắn gọn (mỗi nhiệm vụ 1 dòng) để học sinh hoàn thành trong ngày giúp cải thiện điểm yếu môn Toán, Văn, Khoa học. Trả về đúng 3 dòng.`,
          context: { history: progressHistory, roadmap: aiRoadmap }
        })
      });
      const data = await res.json();
      if (data?.text) {
        const lines = data.text.split('\n').filter((l: string) => l.trim().length > 5).slice(0, 3);
        const newGoals = lines.map((l: string, idx: number) => ({
          id: Date.now() + idx,
          title: l.replace(/^[-*0-9.)\s]+/, ''),
          completed: false,
          category: (idx === 0 ? 'math' : idx === 1 ? 'reading' : 'science') as any,
          targetTime: `${9 + idx * 4}:00`
        }));
        if (newGoals.length > 0) {
          setDailyGoals(newGoals);
          setReminderToast("✨ AI đã cập nhật bộ mục tiêu học tập hàng ngày mới dựa trên lộ trình cá nhân hóa!");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAiGoals(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Dựa trên lịch sử kết quả thi thử HSA/TSA của học sinh (${JSON.stringify(progressHistory)}), hãy thực hiện:
1. Phân tích chi tiết các điểm yếu của học sinh qua các phần thi (Định lượng/Toán, Định tính/Văn, Khoa học).
2. Xây dựng lộ trình ôn tập cá nhân hóa 4 tuần chi tiết (mỗi tuần tập trung vào các chủ đề còn yếu, bài tập rèn luyện và phương pháp cải thiện) để giúp học sinh đạt điểm mục tiêu 110+ trong kỳ thi ĐGNL/ĐGTD.
Hãy trình bày rõ ràng, chuyên nghiệp bằng tiếng Việt và sử dụng LaTeX trong cặp dấu $ hoặc $$ cho mọi công thức toán học.`,
          context: { examType: selectedExamType, history: progressHistory }
        })
      });
      const data = await res.json();
      if (data?.text) {
        setAiRoadmap(data.text);
      } else {
        setAiRoadmap('Không thể tạo lộ trình lúc này. Vui lòng thử lại sau.');
      }
    } catch (err) {
      setAiRoadmap('Lỗi kết nối khi gọi AI tạo lộ trình ôn tập.');
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };
  
  // AI Tutor state
  const [aiQuery, setAiQuery] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<Array<{role: string, content: string}>>([
    { role: 'assistant', content: 'Chào thầy/cô và các em! Thầy/cô là Trợ lý AI chuyên ôn thi Đánh giá năng lực (HSA) và Đánh giá tư duy (TSA). Em cần hỗ trợ soạn đề, giải bài tập hay ôn chuyên đề nào?' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    let timer: any;
    if (quizStarted && !quizSubmitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setQuizSubmitted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, quizSubmitted, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestions = selectedExamType === 'hsa' ? HSA_QUESTION_BANK : TSA_QUESTION_BANK;

  const handleSelectAnswer = (qId: number, optionLetter: string) => {
    if (quizSubmitted) return;
    setCurrentAnswers(prev => ({ ...prev, [qId]: optionLetter }));
  };

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true);
    const correctCount = Object.entries(currentAnswers).filter(([id, ans]) => currentQuestions.find(q => q.id === Number(id))?.correctAnswer === ans).length;
    const finalScore = Math.round((correctCount / currentQuestions.length) * 150);
    const testName = `Thi thử ${selectedExamType.toUpperCase()} #${progressHistory.length + 1}`;
    setProgressHistory(prev => [
      ...prev,
      { test: testName, score: finalScore, target: 110, math: Math.round(finalScore * 0.35), lang: Math.round(finalScore * 0.35), science: Math.round(finalScore * 0.3) }
    ]);
  };

  const handleResetQuiz = () => {
    setQuizStarted(false);
    setQuizSubmitted(false);
    setCurrentAnswers({});
    setTimeLeft(selectedExamType === 'hsa' ? 195 * 60 : 150 * 60);
  };

  const handleGenerateExam = () => {
    const bank = selectedExamType === 'hsa' ? HSA_QUESTION_BANK : TSA_QUESTION_BANK;
    const shuffled = [...bank].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(genCount, bank.length));
    setGeneratedExamList(selected);
  };

  const handlePrintExam = () => {
    window.print();
  };

  interface StudyGroup {
    id: string;
    name: string;
    description: string;
    examType: 'hsa' | 'tsa';
    membersCount: number;
    members: Array<{ name: string; score: number; status: string; avatar: string }>;
    code: string;
  }

  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([
    {
      id: 'g1',
      name: 'Đội tuyển HSA 130+ ĐHQGHN',
      description: 'Nhóm ôn thi chuyên sâu các chuyên đề Toán - Văn - Khoa học mục tiêu 130+ điểm.',
      examType: 'hsa',
      membersCount: 12,
      code: 'HSA130',
      members: [
        { name: 'Nguyễn Đức Tuấn (Trưởng nhóm)', score: 135, status: 'Đang làm bài', avatar: 'ND' },
        { name: 'Trần Minh Hoàng', score: 128, status: 'Hoàn thành đề #4', avatar: 'TH' },
        { name: 'Lê Thị Thu Thảo', score: 122, status: 'Đang ôn tài liệu', avatar: 'LT' },
        { name: 'Phạm Văn Nam', score: 118, status: 'Hoàn thành đề #3', avatar: 'PN' }
      ]
    },
    {
      id: 'g2',
      name: 'Luyện thi TSA Bách Khoa Top ĐẦU',
      description: 'Nhóm thảo luận tư duy toán học, đọc hiểu kỹ thuật và giải quyết vấn đề HUST.',
      examType: 'tsa',
      membersCount: 8,
      code: 'TSAHUST',
      members: [
        { name: 'Hoàng Gia Bảo', score: 92, status: 'Đang làm đề TSA #2', avatar: 'HB' },
        { name: 'Vũ Minh Thư', score: 88, status: 'Hoàn thành đề #1', avatar: 'VT' },
        { name: 'Đỗ Hoàng Long', score: 84, status: 'Nghỉ giải lao', avatar: 'ĐL' }
      ]
    }
  ]);

  const [activeGroupId, setActiveGroupId] = useState<string>('g1');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupExam, setNewGroupExam] = useState<'hsa' | 'tsa'>('hsa');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [groupMessageInput, setGroupMessageInput] = useState('');
  const [groupChatMessages, setGroupChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'Trần Minh Hoàng', text: 'Mọi người đã làm xong đề định lượng số 4 chưa? Câu tích phân hàm hợp khó phết!', time: '09:15' },
    { sender: 'Nguyễn Đức Tuấn', text: 'Đã giải xong rồi nhé, lát mình gửi lời giải chi tiết lên nhóm cho.', time: '09:18' }
  ]);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const created: StudyGroup = {
      id: `g_${Date.now()}`,
      name: newGroupName,
      description: newGroupDesc || 'Nhóm học tập luyện thi HSA & TSA trực tuyến',
      examType: newGroupExam,
      membersCount: 1,
      code: newCode,
      members: [
        { name: 'Bạn (Trưởng nhóm)', score: 110, status: 'Vừa tham gia', avatar: 'ME' }
      ]
    };
    setStudyGroups(prev => [created, ...prev]);
    setActiveGroupId(created.id);
    setNewGroupName('');
    setNewGroupDesc('');
  };

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    const found = studyGroups.find(g => g.code.toUpperCase() === joinCodeInput.trim().toUpperCase());
    if (found) {
      setActiveGroupId(found.id);
      setJoinCodeInput('');
      alert(`Đã tham gia thành công nhóm: ${found.name}`);
    } else {
      alert('Không tìm thấy nhóm với mã code này. Vui lòng kiểm tra lại!');
    }
  };

  const handleSendGroupMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupMessageInput.trim()) return;
    setGroupChatMessages(prev => [
      ...prev,
      { sender: 'Bạn', text: groupMessageInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setGroupMessageInput('');
  };

  // Teacher Journal state & handlers
  interface JournalEntry {
    id: string;
    date: string;
    title: string;
    studentName: string;
    category: 'Tiến bộ học sinh' | 'Điều chỉnh bài giảng' | 'Quan sát trên lớp' | 'Khác';
    content: string;
    aiSuggested?: string;
  }

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([
    {
      id: 'j1',
      date: '2026-10-14',
      title: 'Tiến bộ vượt bậc phần Tư duy định lượng (HSA)',
      studentName: 'Nguyễn Văn A',
      category: 'Tiến bộ học sinh',
      content: 'Học sinh giải quyết rất tốt các bài toán hàm số và tích phân nâng cao trong bài thi thử số 3. Điểm số tăng từ 28 lên 34 điểm phần toán.',
      aiSuggested: 'Đề xuất tiếp tục phát huy thế mạnh bằng bộ đề chuyên đề vận dụng cao (VDC) và rèn thêm tốc độ xử lý trắc nghiệm.'
    },
    {
      id: 'j2',
      date: '2026-10-12',
      title: 'Điều chỉnh tiến độ ôn tập chuyên đề Đọc hiểu TSA',
      studentName: 'Cả lớp 12A1',
      category: 'Điều chỉnh bài giảng',
      content: 'Phần lớn học sinh còn lúng túng với các câu hỏi suy luận logic và xử lý thông tin biểu đồ khoa học kỹ thuật. Cần bổ sung thêm 2 buổi luyện tập kỹ năng đọc lướt và phân tích dữ liệu.',
      aiSuggested: 'Tăng cường các bài tập đọc hiểu khoa học tự nhiên lấy từ đề thi thực tế các năm trước.'
    }
  ]);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalStudent, setJournalStudent] = useState('');
  const [journalCategory, setJournalCategory] = useState<'Tiến bộ học sinh' | 'Điều chỉnh bài giảng' | 'Quan sát trên lớp' | 'Khác'>('Tiến bộ học sinh');
  const [journalContent, setJournalContent] = useState('');
  const [isJournalAiLoading, setIsJournalAiLoading] = useState(false);

  const handleAddJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalTitle.trim() || !journalContent.trim()) return;
    const newEntry: JournalEntry = {
      id: 'j_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      title: journalTitle.trim(),
      studentName: journalStudent.trim() || 'Tất cả học sinh',
      category: journalCategory,
      content: journalContent.trim()
    };
    setJournalEntries(prev => [newEntry, ...prev]);
    setJournalTitle('');
    setJournalStudent('');
    setJournalContent('');
  };

  const handleJournalAiAssist = async (action: 'polish' | 'suggest_adjustments') => {
    if (!journalContent.trim()) {
      alert('Vui lòng nhập nội dung ghi chú ban đầu trước khi gọi AI hỗ trợ!');
      return;
    }
    setIsJournalAiLoading(true);
    try {
      const res = await apiFetch('/api/journal-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: journalContent,
          studentName: journalStudent,
          category: journalCategory
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        if (action === 'polish') {
          setJournalContent(data.result);
        } else {
          setJournalContent(prev => prev + '\n\n[Gợi ý điều chỉnh từ AI]:\n' + data.result);
        }
      } else {
        alert(data.error || 'Có lỗi xảy ra khi gọi AI.');
      }
    } catch (err: any) {
      alert('Lỗi kết nối máy chủ AI: ' + (err?.message || err));
    } finally {
      setIsJournalAiLoading(false);
    }
  };

  const handleAddProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName || !newTestScore) return;
    const s = Number(newTestScore);
    const m = Number(newMathScore) || 25;
    const l = Number(newLangScore) || 30;
    const sc = Number(newScienceScore) || 25;
    setProgressHistory(prev => [...prev, { test: newTestName, score: s, target: 110, math: m, lang: l, science: sc }]);
    setNewTestName('');
    setNewTestScore('');
    setNewMathScore('');
    setNewLangScore('');
    setNewScienceScore('');
  };

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || isAiLoading) return;

    const userMsg = aiQuery.trim();
    setAiQuery('');
    setAiChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsAiLoading(true);

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Bạn là chuyên gia luyện thi Đánh giá năng lực HSA & TSA. Hãy hỗ trợ giáo viên và học sinh giải đáp chi tiết, sử dụng LaTeX trong cặp dấu $ hoặc $$:\n\n${userMsg}`,
          context: { examType: selectedExamType }
        })
      });
      const data = await res.json();
      if (data?.text) {
        setAiChatHistory(prev => [...prev, { role: 'assistant', content: data.text }]);
      } else {
        setAiChatHistory(prev => [...prev, { role: 'assistant', content: 'Hệ thống AI đang bận. Vui lòng thử lại sau.' }]);
      }
    } catch (err) {
      setAiChatHistory(prev => [...prev, { role: 'assistant', content: 'Lỗi kết nối AI.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Banner */}
        {!(isFocusMode || (activeTab === 'materials' && isReaderMode)) && (
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-amber-300" />
                <span>Chương trình ôn thi ĐGNL & ĐGTD</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Trung tâm Luyện thi & Soạn đề HSA & TSA
              </h1>
              <p className="text-indigo-100 text-sm sm:text-base max-w-2xl leading-relaxed">
                Nền tảng toàn diện giúp giáo viên tạo đề thi ngẫu nhiên, xuất bản đề kèm đáp án và học sinh luyện tập trắc nghiệm thông minh.
              </p>
            </div>
            <div className="flex bg-black/20 p-1.5 rounded-xl backdrop-blur-md shrink-0 border border-white/10">
              <button
                onClick={() => { setSelectedExamType('hsa'); handleResetQuiz(); }}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${selectedExamType === 'hsa' ? 'bg-white text-indigo-900 shadow-md' : 'text-white hover:bg-white/10'}`}
              >
                HSA (ĐHQG Hà Nội)
              </button>
              <button
                onClick={() => { setSelectedExamType('tsa'); handleResetQuiz(); }}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${selectedExamType === 'tsa' ? 'bg-white text-indigo-900 shadow-md' : 'text-white hover:bg-white/10'}`}
              >
                TSA (ĐH Bách Khoa HN)
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        {!(isFocusMode || (activeTab === 'materials' && isReaderMode)) && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <Compass className="w-4 h-4" />
              <span>Tổng quan cấu trúc</span>
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'materials' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <BookMarked className="w-4 h-4" />
              <span>Kho tài liệu trọng tâm</span>
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'practice' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <FileText className="w-4 h-4" />
              <span>Thi thử trực tuyến (Học sinh)</span>
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'generator' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <Shuffle className="w-4 h-4 text-emerald-600" />
              <span>Tạo & Xuất đề thi (Giáo viên)</span>
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'progress' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Biểu đồ tiến độ</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'analytics' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <PieChart className="w-4 h-4 text-rose-500" />
              <span>Phân tích chuyên sâu</span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'groups' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <Users className="w-4 h-4 text-blue-500" />
              <span>Nhóm học tập ảo</span>
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'subjects' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>Phòng ôn luyện theo môn</span>
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'journal' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>Nhật ký giáo viên</span>
            </button>
            <button
              onClick={() => setActiveTab('ai_tutor')}
              className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'ai_tutor' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <Brain className="w-4 h-4 text-purple-600" />
              <span>Trợ lý AI Gia sư</span>
            </button>
          </div>
        )}

        {/* Focus Mode Banner */}
        {isFocusMode && (
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between sticky top-4 z-20">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Target className="w-5 h-5 animate-pulse text-amber-200" />
              <span>Chế độ tập trung đang bật (Đã ẩn toàn bộ menu và sidebar chống xao nhãng)</span>
            </div>
            <button
              onClick={() => setIsFocusMode(false)}
              className="px-4 py-2 bg-white text-amber-900 rounded-xl text-xs font-bold hover:bg-amber-50 transition-all shadow cursor-pointer"
            >
              Thoát Chế độ tập trung
            </button>
          </div>
        )}

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-lg">HSA</div>
                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Đánh giá năng lực (VNU - HSA)</h2>
                  <p className="text-xs text-slate-500">Đại học Quốc gia Hà Nội</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Bài thi gồm 150 câu hỏi trắc nghiệm khách quan 4 lựa chọn và câu hỏi điền đáp án, thực hiện trên máy tính trong thời gian <strong>195 phút</strong>.
              </p>
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Phần 1: Tư duy Định lượng (Toán học)</span>
                  <span className="font-bold text-indigo-600">50 câu / 75 phút</span>
                </div>
                <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Phần 2: Tư duy Định tính (Ngữ văn - Ngôn ngữ)</span>
                  <span className="font-bold text-indigo-600">50 câu / 60 phút</span>
                </div>
                <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Phần 3: Khoa học (Tự nhiên & Xã hội)</span>
                  <span className="font-bold text-indigo-600">50 câu / 60 phút</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold text-lg">TSA</div>
                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Đánh giá tư duy (HUST - TSA)</h2>
                  <p className="text-xs text-slate-500">Đại học Bách khoa Hà Nội</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Bài thi tập trung đánh giá năng lực tư duy toán học, tư duy đọc hiểu và tư duy khoa học/giải quyết vấn đề trong thời gian <strong>150 phút</strong>.
              </p>
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Tư duy Toán học (Đại số, Giải tích, Xác suất)</span>
                  <span className="font-bold text-purple-600">60 phút</span>
                </div>
                <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Tư duy Đọc hiểu (Khoa học, Xã hội, Kỹ thuật)</span>
                  <span className="font-bold text-purple-600">30 phút</span>
                </div>
                <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Tư duy Khoa học / Giải quyết vấn đề</span>
                  <span className="font-bold text-purple-600">60 phút</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Materials */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            {/* Reader Mode Banner */}
            {isReaderMode && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between sticky top-4 z-20">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <BookOpen className="w-5 h-5 animate-pulse text-emerald-200" />
                  <span>Chế độ đọc đang bật (Đã ẩn toàn bộ sidebar và thanh công cụ tập trung chuyên môn)</span>
                </div>
                <button
                  onClick={() => setIsReaderMode(false)}
                  className="px-4 py-2 bg-white text-emerald-900 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all shadow cursor-pointer"
                >
                  Thoát Chế độ đọc
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 no-print">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Tài liệu ôn thi trọng tâm HSA & TSA</h3>
                <p className="text-xs text-slate-500">Hệ thống công thức, kiến thức và chiến lược làm bài thi ĐGNL & ĐGTD</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsReaderMode(!isReaderMode)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${isReaderMode ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                  title="Ẩn toàn bộ sidebar và thanh công cụ để tập trung đọc giáo án"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{isReaderMode ? 'Thoát Chế độ đọc' : 'Bật Chế độ đọc'}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Xuất Tài Liệu PDF & In Ấn</span>
                </button>
              </div>
            </div>

            <div className="print-only-header">
              <h1 className="text-xl font-bold uppercase">TRUNG TÂM LUYỆN THI ĐGNL & ĐGTD - HSATSAHUB</h1>
              <h2 className="text-lg font-semibold">TÀI LIỆU ÔN THI TRỌNG TÂM MÔN {selectedExamType.toUpperCase()}</h2>
              <p className="text-xs italic">Tài liệu chuẩn sư phạm phục vụ ôn tập và giảng dạy</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                  <Calculator className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Toán học & Định lượng trọng tâm</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tổng hợp công thức đạo hàm, tích hợp, số phức, hình học Oxyz và các mẹo giải nhanh trắc nghiệm trong 30 giây.
                </p>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs space-y-2 font-mono">
                  <MarkdownRenderer content="Đạo hàm hàm hợp: $[u(v)]' = u'(v) \cdot v'$" />
                  <MarkdownRenderer content="Nguyên hàm cơ bản: $\int x^n dx = \frac{x^{n+1}}{n+1} + C$" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Đọc hiểu & Ngữ văn HSA/TSA</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Kỹ năng đọc nhanh (skimming & scanning), phân tích văn bản khoa học, văn bản nghị luận xã hội và văn học hiện đại.
                </p>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs space-y-2">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Chiến lược làm bài:</p>
                  <p className="text-slate-600 dark:text-slate-400">Đọc câu hỏi trước khi đọc đoạn văn bản để định vị thông tin chính xác.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Khoa học & Giải quyết vấn đề</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hệ thống kiến thức Vật lý, Hóa học, Sinh học và Khoa học ứng dụng kỹ thuật thường xuất hiện trong đề thi ĐGNL & ĐGTD.
                </p>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs space-y-2 font-mono">
                  <MarkdownRenderer content="Định luật Faraday: $m = \frac{1}{F} \cdot \frac{A}{n} \cdot I \cdot t$" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Practice Online */}
        {activeTab === 'practice' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-lg text-slate-900 dark:text-white">Thi thử trực tuyến môn {selectedExamType.toUpperCase()}</h2>
                <p className="text-xs text-slate-500">Làm bài trắc nghiệm mô phỏng với đồng hồ đếm ngược và chấm điểm tự động</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${isFocusMode ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                  title="Ẩn toàn bộ menu và sidebar để chống xao nhãng"
                >
                  <Target className="w-4 h-4" />
                  <span>{isFocusMode ? 'Thoát Chế độ tập trung' : 'Bật Chế độ tập trung'}</span>
                </button>
                {!quizStarted ? (
                  <button
                    onClick={() => { setQuizStarted(true); setIsFocusMode(true); }}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2 shadow"
                  >
                    <Play className="w-4 h-4" />
                    <span>Bắt đầu làm bài</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-xl font-mono font-bold text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(timeLeft)}</span>
                    </div>
                    {!quizSubmitted ? (
                      <button
                        onClick={handleSubmitQuiz}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm cursor-pointer"
                      >
                        Nộp bài
                      </button>
                    ) : (
                      <button
                        onClick={handleResetQuiz}
                        className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl text-sm cursor-pointer flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Làm lại</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!quizStarted ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Sẵn sàng thử thách năng lực?</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Bài thi mẫu gồm các câu hỏi chuẩn cấu trúc {selectedExamType.toUpperCase()}. Hệ thống sẽ chấm điểm và cung cấp lời giải chi tiết ngay sau khi nộp bài.
                  </p>
                </div>
                <button
                  onClick={() => { setQuizStarted(true); setIsFocusMode(true); }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm cursor-pointer shadow inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Vào thi ngay</span>
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {quizSubmitted && (
                  <div className="p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white rounded-2xl shadow-xl space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã chấm điểm & Lưu kết quả vào Biểu đồ tiến độ</span>
                        </div>
                        <h3 className="text-xl font-extrabold tracking-tight">BẢNG KẾT QUẢ TỔNG QUÁT BÀI THI THỬ</h3>
                        <p className="text-xs text-slate-300">
                          Đã tự động ghi nhận kết quả vào hệ thống theo dõi tiến độ học tập và gợi ý lộ trình AI.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setActiveTab('progress')}
                          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <TrendingUp className="w-4 h-4 text-amber-400" />
                          <span>Xem Biểu đồ & Lộ trình AI</span>
                        </button>
                        <button
                          onClick={handleResetQuiz}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Làm đề mới / Làm lại</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                      <div className="bg-white/10 p-4 rounded-xl text-center space-y-1">
                        <p className="text-xs text-slate-300 font-medium">Tổng điểm quy đổi</p>
                        <p className="text-2xl font-black text-amber-300">
                          {Math.round((Object.entries(currentAnswers).filter(([id, ans]) => currentQuestions.find(q => q.id === Number(id))?.correctAnswer === ans).length / currentQuestions.length) * 150)} <span className="text-xs text-slate-400">/ 150</span>
                        </p>
                      </div>
                      <div className="bg-white/10 p-4 rounded-xl text-center space-y-1">
                        <p className="text-xs text-slate-300 font-medium">Số câu trả lời đúng</p>
                        <p className="text-2xl font-black text-emerald-400">
                          {Object.entries(currentAnswers).filter(([id, ans]) => currentQuestions.find(q => q.id === Number(id))?.correctAnswer === ans).length} <span className="text-xs text-slate-400">/ {currentQuestions.length}</span>
                        </p>
                      </div>
                      <div className="bg-white/10 p-4 rounded-xl text-center space-y-1">
                        <p className="text-xs text-slate-300 font-medium">Số câu trả lời sai</p>
                        <p className="text-2xl font-black text-rose-400">
                          {Object.entries(currentAnswers).filter(([id, ans]) => {
                            const q = currentQuestions.find(item => item.id === Number(id));
                            return q && q.correctAnswer !== ans;
                          }).length}
                        </p>
                      </div>
                      <div className="bg-white/10 p-4 rounded-xl text-center space-y-1">
                        <p className="text-xs text-slate-300 font-medium">Số câu chưa làm</p>
                        <p className="text-2xl font-black text-slate-400">
                          {currentQuestions.length - Object.keys(currentAnswers).length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {currentQuestions.map((q, idx) => {
                    const isCorrect = currentAnswers[q.id] === q.correctAnswer;
                    return (
                      <div key={q.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <span className="inline-block px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs font-bold rounded-lg">
                              {q.topic}
                            </span>
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                              Câu {idx + 1}: <MarkdownRenderer content={q.question} />
                            </h4>
                          </div>
                          {quizSubmitted && (
                            <div>
                              {isCorrect ? (
                                <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold shrink-0">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold shrink-0">
                                  <XCircle className="w-3.5 h-3.5" /> Sai
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oIdx) => {
                            const optionLetter = opt.charAt(0);
                            const isSelected = currentAnswers[q.id] === optionLetter;
                            let btnStyle = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500";
                            if (isSelected) {
                              btnStyle = "bg-indigo-600 text-white border-indigo-600 shadow-sm";
                            }
                            if (quizSubmitted) {
                              if (optionLetter === q.correctAnswer) {
                                btnStyle = "bg-emerald-600 text-white border-emerald-600 shadow-sm";
                              } else if (isSelected && optionLetter !== q.correctAnswer) {
                                btnStyle = "bg-rose-600 text-white border-rose-600 shadow-sm";
                              }
                            }
                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleSelectAnswer(q.id, optionLetter)}
                                disabled={quizSubmitted}
                                className={`p-3 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${btnStyle}`}
                              >
                                <span className="w-6 h-6 rounded-lg bg-black/10 flex items-center justify-center font-bold text-xs shrink-0">{optionLetter}</span>
                                <span className="flex-1"><MarkdownRenderer content={opt.slice(3)} /></span>
                              </button>
                            );
                          })}
                        </div>

                        {quizSubmitted && (
                          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                            <span className="font-bold text-indigo-600">Hướng dẫn giải chi tiết:</span>
                            <MarkdownRenderer content={q.explanation} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Teacher Exam Generator */}
        {activeTab === 'generator' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-lg text-slate-900 dark:text-white">Bộ công cụ trộn đề thi ngẫu nhiên cho giáo viên</h2>
                <p className="text-xs text-slate-500">Tự động xáo trộn câu hỏi từ ngân hàng đề, xuất bản đề kèm đáp án và hướng dẫn giải chi tiết</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateExam}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2 shadow"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Trộn đề ngay</span>
                </button>
                {generatedExamList.length > 0 && (
                  <>
                    <button
                      onClick={handleScanExamQuality}
                      disabled={isScanningExam}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2 shadow"
                    >
                      {isScanningExam ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>Quét chất lượng đề</span>
                    </button>
                    <button
                      onClick={handlePrintExam}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2 shadow"
                    >
                      <Printer className="w-4 h-4" />
                      <span>In đề / Xuất PDF</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mã đề thi</label>
                <input
                  type="text"
                  value={genExamCode}
                  onChange={(e) => setGenExamCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  placeholder="Ví dụ: 101"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Số lượng câu hỏi</label>
                <select
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                >
                  <option value={3}>3 câu (Thử nghiệm nhanh)</option>
                  <option value={5}>5 câu</option>
                  <option value={10}>10 câu</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={showAnswersInGen}
                    onChange={(e) => setShowAnswersInGen(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Hiển thị bảng đáp án & lời giải</span>
                </label>
              </div>
            </div>

            {/* Exam Quality Scan Report Modal / Box */}
            {examScanResults && (
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-4 border border-slate-800 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-extrabold text-base">Báo cáo kiểm định chất lượng đề thi tự động</h3>
                  </div>
                  <button
                    onClick={() => setExamScanResults(null)}
                    className="text-slate-400 hover:text-white text-sm font-bold"
                  >
                    ✕ Đóng
                  </button>
                </div>
                <div className="space-y-2">
                  {examScanResults.map((warn, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl text-xs flex items-start gap-2 ${warn.type === 'error' ? 'bg-rose-950/80 text-rose-200 border border-rose-800/60' : warn.type === 'warning' ? 'bg-amber-950/80 text-amber-200 border border-amber-800/60' : 'bg-emerald-950/80 text-emerald-200 border border-emerald-800/60'}`}
                    >
                      <span className="font-bold shrink-0">
                        {warn.type === 'error' ? '❌ Lỗi:' : warn.type === 'warning' ? '⚠️ Cảnh báo:' : '✅ Đạt chuẩn:'}
                      </span>
                      <span>{warn.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedExamList.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-3">
                <FileText className="w-12 h-12 mx-auto opacity-40" />
                <p className="text-sm">Chưa có đề nào được tạo. Bấm <strong>Trộn đề ngay</strong> để bắt đầu!</p>
              </div>
            ) : (
              <div className="space-y-8 pt-4">
                <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white uppercase">
                    ĐỀ THI MÔ PHỎNG {selectedExamType.toUpperCase()} - MÃ ĐỀ: {genExamCode}
                  </h3>
                  <p className="text-xs text-slate-500">Thời gian làm bài: {selectedExamType === 'hsa' ? '195 phút' : '150 phút'}</p>
                </div>

                <div className="space-y-6">
                  {generatedExamList.map((q, idx) => (
                    <div key={q.id} className="space-y-2">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">
                        <span>Câu {idx + 1}: </span>
                        <MarkdownRenderer content={q.question} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="text-xs text-slate-700 dark:text-slate-300">
                            <MarkdownRenderer content={opt} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {showAnswersInGen && (
                  <div className="pt-8 border-t-2 border-slate-200 dark:border-slate-800 space-y-4">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">BẢNG ĐÁP ÁN & HƯỚNG DẪN GIẢI CHI TIẾT</h4>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 font-mono text-xs font-bold text-center">
                      {generatedExamList.map((q, idx) => (
                        <div key={q.id} className="p-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                          {idx + 1}: <span className="text-indigo-600">{q.correctAnswer}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4 pt-4">
                      {generatedExamList.map((q, idx) => (
                        <div key={q.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs space-y-1">
                          <span className="font-bold text-slate-900 dark:text-white">Câu {idx + 1} (Đáp án: {q.correctAnswer}):</span>
                          <MarkdownRenderer content={q.explanation} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Progress Tracking with Recharts */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Daily Study Goals & Notification Reminder System */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-amber-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Hệ thống nhắc nhở mục tiêu hàng ngày</span>
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight">Mục tiêu học tập hôm nay theo Lộ trình AI</h3>
                  <p className="text-xs text-slate-300">
                    Hoàn thành các mục tiêu định lượng và đọc hiểu để đạt chuẩn điểm số 110+ HSA/TSA.
                  </p>
                </div>
                <button
                  onClick={handleGenerateAiDailyGoals}
                  disabled={isGeneratingAiGoals}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all shadow flex items-center gap-2 cursor-pointer shrink-0"
                >
                  {isGeneratingAiGoals ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>AI đang tạo mục tiêu...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>🔄 AI tạo mục tiêu mới từ Lộ trình</span>
                    </>
                  )}
                </button>
              </div>

              {reminderToast && (
                <div className="bg-amber-500/20 border border-amber-500/40 p-3 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-2">
                  <span className="font-medium">{reminderToast}</span>
                  <button onClick={() => setReminderToast(null)} className="text-amber-200 hover:text-white font-bold text-sm">×</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {dailyGoals.map(goal => (
                  <div
                    key={goal.id}
                    onClick={() => handleToggleGoal(goal.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${goal.completed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' : 'bg-white/10 border-white/10 hover:bg-white/15 text-white'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold leading-relaxed">{goal.title}</span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${goal.completed ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-white/40'}`}>
                        {goal.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] opacity-80 pt-2 border-t border-white/10">
                      <span className="capitalize">Mục tiêu: {goal.category}</span>
                      <span className="font-mono">⏰ {goal.targetTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                <p className="text-xs text-slate-500 font-medium">Tổng số bài thi thử</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{progressHistory.length} đề</p>
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 pt-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +15% so với tháng trước
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                <p className="text-xs text-slate-500 font-medium">Điểm trung bình gần nhất</p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {Math.round(progressHistory.reduce((acc, cur) => acc + cur.score, 0) / progressHistory.length)} <span className="text-xs font-normal text-slate-400">/ 150</span>
                </p>
                <p className="text-xs text-slate-500 pt-1">Mục tiêu: 110+ điểm</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                <p className="text-xs text-slate-500 font-medium">Điểm cao nhất đạt được</p>
                <p className="text-2xl font-black text-emerald-600">
                  {Math.max(...progressHistory.map(p => p.score))} <span className="text-xs font-normal text-slate-400">/ 150</span>
                </p>
                <p className="text-xs text-emerald-600 font-semibold pt-1">Đạt chuẩn đỗ nguyện vọng 1</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                <p className="text-xs text-slate-500 font-medium">Mức độ sẵn sàng thi</p>
                <p className="text-2xl font-black text-purple-600">
                  {Math.min(100, Math.round((Math.max(...progressHistory.map(p => p.score)) / 130) * 100))}%
                </p>
                <p className="text-xs text-purple-600 font-semibold pt-1">Tiềm năng đỗ ĐH top đầu</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Line Chart: Score Progression */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Biểu đồ tiến độ điểm số qua các đề</h3>
                    <p className="text-xs text-slate-500">So sánh điểm đạt được thực tế với điểm mục tiêu</p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="test" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 150]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="score" name="Điểm thực tế" stroke="#6366f1" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="target" name="Điểm mục tiêu" stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart: Subject Breakdown */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Phân tích điểm theo từng phần thi</h3>
                    <p className="text-xs text-slate-500">Định lượng (Toán), Định tính (Văn), Khoa học</p>
                  </div>
                  <Layers className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="test" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                      <Legend />
                      <Bar dataKey="math" name="Định lượng (Toán)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="lang" name="Định tính (Văn)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="science" name="Khoa học" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* AI Personalized Roadmap Card */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Phân tích thông minh</span>
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight">Gợi ý lộ trình ôn tập cá nhân hóa</h3>
                  <p className="text-xs text-slate-300">
                    AI tự động quét biểu đồ tiến độ và lịch sử thi thử để phát hiện điểm yếu, đề xuất chuyên đề cần trọng tâm.
                  </p>
                </div>
                <button
                  onClick={handleGenerateRoadmap}
                  disabled={isGeneratingRoadmap}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
                >
                  {isGeneratingRoadmap ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>AI đang phân tích...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 text-slate-950" />
                      <span>Tạo lộ trình cá nhân hóa ngay</span>
                    </>
                  )}
                </button>
              </div>

              {aiRoadmap && (
                <div className="pt-6 border-t border-white/10 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-amber-300 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      <span>Lộ trình ôn tập & Khắc phục điểm yếu đề xuất bởi AI</span>
                    </h4>
                    <button
                      onClick={() => {
                        setAiQuery("Em muốn hỏi thêm về lộ trình ôn tập này để cải thiện điểm số.");
                        setActiveTab('ai_tutor');
                      }}
                      className="text-xs text-indigo-200 hover:text-white underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Hỏi sâu hơn với Gia sư AI</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl text-sm leading-relaxed space-y-3 text-slate-100 border border-white/10">
                    <MarkdownRenderer content={aiRoadmap} />
                  </div>
                </div>
              )}
            </div>

            {/* Add Score Form & History Table */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Thêm kết quả bài thi thử mới</h3>
              <form onSubmit={handleAddProgress} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <input
                  type="text"
                  placeholder="Tên đề (VD: Đề số 6)"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  required
                />
                <input
                  type="number"
                  placeholder="Tổng điểm (Max 150)"
                  value={newTestScore}
                  onChange={(e) => setNewTestScore(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  required
                />
                <input
                  type="number"
                  placeholder="Điểm Toán"
                  value={newMathScore}
                  onChange={(e) => setNewMathScore(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
                <input
                  type="number"
                  placeholder="Điểm Văn"
                  value={newLangScore}
                  onChange={(e) => setNewLangScore(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
                <input
                  type="number"
                  placeholder="Điểm Khoa học"
                  value={newScienceScore}
                  onChange={(e) => setNewScienceScore(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lưu kết quả</span>
                </button>
              </form>

              <div className="overflow-x-auto pt-4">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold text-xs">
                      <th className="pb-3">Bài thi / Đề thi</th>
                      <th className="pb-3">Tổng điểm</th>
                      <th className="pb-3">Định lượng (Toán)</th>
                      <th className="pb-3">Định tính (Văn)</th>
                      <th className="pb-3">Khoa học</th>
                      <th className="pb-3">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {progressHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 font-medium text-slate-900 dark:text-white">{item.test}</td>
                        <td className="py-3 font-bold text-indigo-600">{item.score} / 150</td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">{item.math}</td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">{item.lang}</td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">{item.science}</td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.score >= 110 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                            {item.score >= 110 ? 'Đạt mục tiêu' : 'Cần cố gắng'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Analytics & Subject Progression */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-rose-900 via-indigo-900 to-purple-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-rose-300">
                <PieChart className="w-3.5 h-3.5" />
                <span>Phân tích chuyên sâu xu hướng tiến bộ</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">Biểu đồ so sánh kết quả các lần thi thử qua từng môn</h2>
              <div className="text-xs sm:text-sm text-slate-200 max-w-3xl leading-relaxed">
                <MarkdownRenderer content="Đánh giá toàn diện sự tiến bộ của học sinh qua các môn Định lượng (Toán), Định tính (Văn) và Khoa học. Công thức thống kê học tập được tính toán tự động dựa trên mô hình định lượng $\bar{S} = \frac{1}{n}\sum_{i=1}^{n}S_i$ và phương sai độ lệch chuẩn $\sigma$." />
              </div>
            </div>

            {/* Area Chart Comparison */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Biểu đồ Vùng so sánh xu hướng tiến bộ từng môn thi</h3>
                  <p className="text-xs text-slate-500">So sánh trực quan điểm số Toán, Văn, Khoa học theo từng đợt thi thử</p>
                </div>
                <Activity className="w-5 h-5 text-rose-500" />
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressHistory}>
                    <defs>
                      <linearGradient id="colorMath" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLang" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorScience" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="test" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 60]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="math" name="Định lượng (Toán)" stroke="#6366f1" fillOpacity={1} fill="url(#colorMath)" />
                    <Area type="monotone" dataKey="lang" name="Định tính (Văn)" stroke="#10b981" fillOpacity={1} fill="url(#colorLang)" />
                    <Area type="monotone" dataKey="science" name="Khoa học" stroke="#f59e0b" fillOpacity={1} fill="url(#colorScience)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Statistical Summary & Math Formulas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                  <Calculator className="w-4 h-4" />
                  <MarkdownRenderer content="Điểm trung bình định lượng $\bar{M}$" />
                </div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {Math.round((progressHistory.reduce((acc, cur) => acc + cur.math, 0) / progressHistory.length) * 10) / 10} <span className="text-xs font-normal text-slate-400">/ 50</span>
                </p>
                <div className="text-xs text-slate-500 leading-relaxed">
                  <MarkdownRenderer content="Được tính theo công thức kỳ vọng toán học: $\bar{M} = \frac{1}{n} \sum_{i=1}^{n} M_i$. Mức độ vững chắc cao." />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <BookOpen className="w-4 h-4" />
                  <MarkdownRenderer content="Điểm trung bình định tính $\bar{L}$" />
                </div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {Math.round((progressHistory.reduce((acc, cur) => acc + cur.lang, 0) / progressHistory.length) * 10) / 10} <span className="text-xs font-normal text-slate-400">/ 50</span>
                </p>
                <div className="text-xs text-slate-500 leading-relaxed">
                  <MarkdownRenderer content="Đánh giá năng lực ngôn ngữ và tư duy đọc hiểu văn bản: $\bar{L} = \frac{1}{n} \sum_{i=1}^{n} L_i$." />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                  <Award className="w-4 h-4" />
                  <MarkdownRenderer content="Tích lũy tổng điểm $S_{total}$" />
                </div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {Math.round(progressHistory.reduce((acc, cur) => acc + cur.score, 0) / progressHistory.length)} <span className="text-xs font-normal text-slate-400">/ 150</span>
                </p>
                <div className="text-xs text-slate-500 leading-relaxed">
                  <MarkdownRenderer content="Tổng điểm trung bình đạt được: $S_{total} = \bar{M} + \bar{L} + \bar{S_c}$. Đạt ngưỡng an toàn vào đại học top." />
                </div>
              </div>
            </div>

            {/* Detailed Subject Analysis Breakdown */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Nhận định sư phạm & Xu hướng tiến bộ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">1. Phần Tư duy Định lượng (Toán học)</span>
                  <div className="text-xs">
                    <MarkdownRenderer content="Học sinh duy trì phong độ rất tốt ở phần Đại số và Giải tích với đạo hàm $\frac{dy}{dx}$ và tích phân $\int f(x)dx$. Cần chú ý thêm về xác suất thống kê để tối đa hóa điểm số lên mức tuyệt đối." />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">2. Phần Đọc hiểu & Khoa học</span>
                  <p>
                    Tốc độ đọc hiểu và tư duy logic khoa học đã cải thiện rõ rệt qua các lần thi thử (tăng trung bình $+12\%$ so với đề đầu tiên). Biểu đồ cho thấy xu hướng tiệm cận mốc điểm $120+$ ổn định.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Virtual Study Groups */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-300">
                <Users className="w-3.5 h-3.5" />
                <span>Nhóm học tập ảo trực tuyến</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">Học nhóm cùng bạn bè & So sánh kết quả thời gian thực</h2>
              <p className="text-xs sm:text-sm text-slate-200 max-w-3xl leading-relaxed">
                Tạo hoặc tham gia các nhóm ôn thi HSA/TSA để cùng luyện đề thi thử, chia sẻ tài liệu và theo dõi bảng xếp hạng điểm số trực tuyến theo thời gian thực.
              </p>
            </div>

            {/* Create / Join Group Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-base">
                  <UserPlus className="w-5 h-5" />
                  <span>Tạo nhóm học tập ảo mới</span>
                </div>
                <form onSubmit={handleCreateGroup} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên nhóm</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="VD: Đội tuyển HSA 140+ ĐHQGHN"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mô tả mục tiêu nhóm</label>
                    <input
                      type="text"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      placeholder="VD: Luyện đề Toán & Khoa học mỗi tối"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Loại kỳ thi trọng tâm</label>
                    <select
                      value={newGroupExam}
                      onChange={(e) => setNewGroupExam(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    >
                      <option value="hsa">Đánh giá năng lực (HSA)</option>
                      <option value="tsa">Đánh giá tư duy (TSA)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow cursor-pointer transition-all"
                  >
                    Tạo nhóm ngay
                  </button>
                </form>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
                  <Users className="w-5 h-5" />
                  <span>Tham gia nhóm bằng mã mời</span>
                </div>
                <form onSubmit={handleJoinGroup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nhập mã nhóm (Group Code)</label>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      placeholder="VD: HSA130 hoặc TSAHUST"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm uppercase font-mono"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Mã code được cung cấp bởi trưởng nhóm hoặc giáo viên ôn luyện. Tham gia để kết nối với các bạn học sinh cùng chí hướng.
                  </p>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow cursor-pointer transition-all"
                  >
                    Vào nhóm học tập
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Các nhóm đang tham gia:</p>
                  <div className="flex flex-wrap gap-2">
                    {studyGroups.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setActiveGroupId(g.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeGroupId === g.id ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                      >
                        {g.name} ({g.code})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Group Details & Leaderboard */}
            {(() => {
              const currentGroup = studyGroups.find(g => g.id === activeGroupId) || studyGroups[0];
              return (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-md text-xs font-bold mb-1">
                        Mã nhóm: {currentGroup.code} • {currentGroup.examType.toUpperCase()}
                      </div>
                      <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">{currentGroup.name}</h3>
                      <p className="text-xs text-slate-500">{currentGroup.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> {currentGroup.members.length} thành viên online
                      </span>
                    </div>
                  </div>

                  {/* Leaderboard Table */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Bảng xếp hạng điểm thi thử trực tuyến trong nhóm</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold text-xs">
                            <th className="pb-3 w-16">Thứ hạng</th>
                            <th className="pb-3">Thành viên</th>
                            <th className="pb-3">Điểm cao nhất</th>
                            <th className="pb-3">Trạng thái thời gian thực</th>
                            <th className="pb-3">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {currentGroup.members
                            .sort((a, b) => b.score - a.score)
                            .map((member, mIdx) => (
                              <tr key={mIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                <td className="py-3 font-extrabold">
                                  {mIdx === 0 ? '🥇 1' : mIdx === 1 ? '🥈 2' : mIdx === 2 ? '🥉 3' : `#${mIdx + 1}`}
                                </td>
                                <td className="py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                    {member.avatar}
                                  </div>
                                  <span>{member.name}</span>
                                </td>
                                <td className="py-3 font-black text-indigo-600">{member.score} <span className="text-xs font-normal text-slate-400">/ 150</span></td>
                                <td className="py-3">
                                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium">
                                    {member.status}
                                  </span>
                                </td>
                                <td className="py-3">
                                  <button
                                    onClick={() => alert(`Đã gửi thách đấu thi thử trực tuyến đến ${member.name}!`)}
                                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                                  >
                                    Thách đấu
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Group Discussion Chat */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-600" />
                      <span>Thảo luận nhóm học tập trực tuyến</span>
                    </h4>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 h-56 overflow-y-auto space-y-3 border border-slate-200 dark:border-slate-700">
                      {groupChatMessages.map((msg, cIdx) => (
                        <div key={cIdx} className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-xs space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                            <span className="text-indigo-600 dark:text-indigo-400">{msg.sender}</span>
                            <span className="font-mono">{msg.time}</span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200">{msg.text}</p>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSendGroupMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={groupMessageInput}
                        onChange={(e) => setGroupMessageInput(e.target.value)}
                        placeholder="Nhập nội dung thảo luận, chia sẻ tài liệu hoặc hỏi bài cùng nhóm..."
                        className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                        required
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi tin</span>
                      </button>
                    </form>
                  </div>
                </div>
              );
            })()}
          </div>
        )}


        {/* Tab: Subjects / Phòng ôn luyện theo môn */}
        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold">
                  <Calculator className="w-4 h-4" />
                  <span>Trung tâm chuyên môn độc lập</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black">Phòng ôn luyện theo môn (Toán, Văn, Khoa học, Logic)</h2>
                <p className="text-indigo-100/80 text-sm max-w-2xl leading-relaxed">
                  Thiết kế riêng biệt cho từng giáo viên bộ môn dễ dàng tra cứu lý thuyết trọng tâm, ngân hàng câu hỏi chuẩn định dạng LaTeX, và công cụ luyện thi chuyên sâu theo chuẩn cấu trúc HSA & TSA.
                </p>
              </div>
            </div>

            {/* Subject Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setSelectedSubjectTab('math')}
                className={`p-4 rounded-2xl border font-bold text-sm transition-all flex items-center gap-3 cursor-pointer ${
                  selectedSubjectTab === 'math'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${selectedSubjectTab === 'math' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'}`}>
                  📐
                </div>
                <div className="text-left">
                  <div className="font-black">Môn Toán (HSA/TSA)</div>
                  <div className={`text-xs ${selectedSubjectTab === 'math' ? 'text-indigo-100' : 'text-slate-400'}`}>Định lượng & Giải tích</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedSubjectTab('literature')}
                className={`p-4 rounded-2xl border font-bold text-sm transition-all flex items-center gap-3 cursor-pointer ${
                  selectedSubjectTab === 'literature'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${selectedSubjectTab === 'literature' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                  📚
                </div>
                <div className="text-left">
                  <div className="font-black">Môn Ngữ Văn (HSA)</div>
                  <div className={`text-xs ${selectedSubjectTab === 'literature' ? 'text-emerald-100' : 'text-slate-400'}`}>Đọc hiểu & Ngôn ngữ</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedSubjectTab('science')}
                className={`p-4 rounded-2xl border font-bold text-sm transition-all flex items-center gap-3 cursor-pointer ${
                  selectedSubjectTab === 'science'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-lg'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${selectedSubjectTab === 'science' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300'}`}>
                  🔬
                </div>
                <div className="text-left">
                  <div className="font-black">Khoa học Tự nhiên</div>
                  <div className={`text-xs ${selectedSubjectTab === 'science' ? 'text-amber-100' : 'text-slate-400'}`}>Lý, Hóa, Sinh, Sử, Địa</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedSubjectTab('logic')}
                className={`p-4 rounded-2xl border font-bold text-sm transition-all flex items-center gap-3 cursor-pointer ${
                  selectedSubjectTab === 'logic'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${selectedSubjectTab === 'logic' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300'}`}>
                  📊
                </div>
                <div className="text-left">
                  <div className="font-black">Tư duy Logic & Số liệu</div>
                  <div className={`text-xs ${selectedSubjectTab === 'logic' ? 'text-purple-100' : 'text-slate-400'}`}>TSA / Đồ thị / Biểu đồ</div>
                </div>
              </button>
            </div>

            {/* Subject Specific Content Panel */}
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              {selectedSubjectTab === 'math' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>📐 Chuyên đề Toán học & Tư duy định lượng</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Dành riêng cho giáo viên Toán ôn luyện 50 câu định lượng (HSA) hoặc Tư duy Toán học (TSA).</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('generator')}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow"
                    >
                      <Shuffle className="w-4 h-4" />
                      <span>Trộn đề chuyên đề Toán ngay</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">1. Giải tích & Hàm số (35%)</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Khảo sát hàm số, cực trị, tiệm cận, giá trị lớn nhất nhỏ nhất. Tích phân và ứng dụng tính diện tích, thể tích khối tròn xoay.
                      </p>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl text-xs">
                        <MarkdownRenderer content="$$\\int_{a}^{b} f(x)dx = F(b) - F(a)$$" />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">2. Hình học Oxyz & Không gian (30%)</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Hệ tọa độ không gian $Oxyz$, phương trình mặt phẳng, đường thẳng, mặt cầu. Khoảng cách và góc giữa đường thẳng và mặt phẳng.
                      </p>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl text-xs">
                        <MarkdownRenderer content="$$d(M, (P)) = \\frac{|Ax_0 + By_0 + Cz_0 + D|}{\\sqrt{A^2 + B^2 + C^2}}$$" />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">3. Đại số & Xác suất thống kê (35%)</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Số phức, phương trình mũ - logarit, dãy số, cấp số cộng, cấp số nhân và bài toán xác suất biến cố có điều kiện.
                      </p>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl text-xs">
                        <MarkdownRenderer content="$$P(A|B) = \\frac{P(A \\cap B)}{P(B)}$$" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedSubjectTab === 'literature' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>📚 Chuyên đề Ngữ văn & Ngôn ngữ (HSA)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Dành riêng cho giáo viên Ngữ văn ôn luyện phần Đọc hiểu văn bản và Tiếng Việt.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('materials')}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow"
                    >
                      <BookMarked className="w-4 h-4" />
                      <span>Xem tài liệu Ngữ văn trọng tâm</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">1. Đọc hiểu văn bản nghệ thuật</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Phân tích phong cách nghệ thuật, cảm hứng chủ đạo, tầng ý nghĩa biểu tượng của các tác phẩm thơ ca và văn xuôi hiện đại.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">2. Phong cách ngôn ngữ & Biện pháp tu từ</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Nhận diện chính xác các phong cách ngôn ngữ (sinh hoạt, nghệ thuật, báo chí, chính luận...) và hiệu quả biểu đạt của tu từ.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">3. Nghị luận xã hội & Tư duy phản biện</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Kỹ năng xử lý các câu hỏi đọc hiểu thông tin văn bản nhật dụng, phát hiện luận điểm và đánh giá tư tưởng đạo lý.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedSubjectTab === 'science' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>🔬 Chuyên đề Khoa học Tự nhiên & Xã hội</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Tổng hợp kiến thức trọng tâm các môn Vật lý, Hóa học, Sinh học, Lịch sử, Địa lý trong đề thi HSA.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('generator')}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow"
                    >
                      <Shuffle className="w-4 h-4" />
                      <span>Tạo đề Khoa học ngẫu nhiên</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-amber-600 dark:text-amber-400">1. Vật lý & Hóa học ứng dụng</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Dao động điều hòa, dòng điện xoay chiều, nhiệt động lực học. Hóa học vô cơ nâng cao, este, amin và chuỗi phản ứng tổng hợp.
                      </p>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl text-xs">
                        <MarkdownRenderer content="$$T = 2\\pi\\sqrt{\\frac{l}{g}}$$" />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-amber-600 dark:text-amber-400">2. Sinh học tế bào & Di truyền</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Cấu trúc ADN, quá trình nhân đôi, phiên mã, dịch mã, quy luật di truyền Mendel và di truyền quần thể.
                      </p>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-200">
                        $$p^2AA + 2pqAa + q^2aa = 1$$
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-amber-600 dark:text-amber-400">3. Lịch sử & Địa lý Việt Nam</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Các mốc lịch sử hào hùng từ 1930 đến nay, chiến lược phát triển kinh tế xã hội và địa lý vùng kinh tế trọng điểm.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedSubjectTab === 'logic' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>📊 Tư duy Logic & Xử lý số liệu (TSA)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Phần thi chuyên biệt đánh giá năng lực tư duy định tính, phân tích biểu đồ và suy luận logic.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('practice')}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Làm bài thi thử TSA trực tuyến</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-purple-600 dark:text-purple-400">1. Xử lý số liệu & Biểu đồ</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Đọc hiểu biểu đồ cột, biểu đồ tròn, bảng thống kê dữ liệu kinh tế - xã hội và tính toán tốc độ tăng trưởng.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-purple-600 dark:text-purple-400">2. Suy luận logic & Sơ đồ</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Giải quyết các câu hỏi điều kiện, sắp xếp vị trí, suy luận chân lý mệnh đề và bài toán đếm tổ hợp logic.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="font-bold text-sm text-purple-600 dark:text-purple-400">3. Đọc hiểu khoa học kỹ thuật</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Phân tích các bài báo khoa học, sơ đồ công nghệ, trích xuất thông tin thực tế để trả lời câu hỏi trắc nghiệm.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Journal / Nhật ký giáo viên */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold">
                  <FileText className="w-4 h-4" />
                  <span>Sổ tay & Nhật ký chuyên môn</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black">Nhật ký tiến độ & Điều chỉnh bài giảng</h2>
                <p className="text-emerald-100/80 text-sm max-w-2xl leading-relaxed">
                  Ghi chú nhanh các quan sát về sự tiến bộ của học sinh, ghi nhận điểm yếu cần khắc phục, điều chỉnh bài giảng trong giờ dạy, kết hợp trợ lý AI biên tập văn phong sư phạm và gợi ý phương pháp tối ưu.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add New Entry Form */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 lg:col-span-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>Thêm ghi chú nhật ký mới</span>
                </h3>
                <form onSubmit={handleAddJournalEntry} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Tiêu đề ghi chú</label>
                    <input
                      type="text"
                      value={journalTitle}
                      onChange={(e) => setJournalTitle(e.target.value)}
                      placeholder="Ví dụ: Tiến bộ phần hình học không gian..."
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Học sinh / Lớp liên quan</label>
                    <input
                      type="text"
                      value={journalStudent}
                      onChange={(e) => setJournalStudent(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A hoặc Cả lớp 12A1"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Phân loại ghi chú</label>
                    <select
                      value={journalCategory}
                      onChange={(e: any) => setJournalCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Tiến bộ học sinh">Tiến bộ học sinh</option>
                      <option value="Điều chỉnh bài giảng">Điều chỉnh bài giảng</option>
                      <option value="Quan sát trên lớp">Quan sát trên lớp</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Nội dung quan sát / Ghi chú</label>
                    <textarea
                      value={journalContent}
                      onChange={(e) => setJournalContent(e.target.value)}
                      rows={5}
                      placeholder="Nhập ghi chú chi tiết hoặc ý tưởng ban đầu..."
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white leading-relaxed"
                      required
                    ></textarea>
                  </div>

                  {/* AI Assistant Buttons */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Hỗ trợ thông minh bằng AI</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleJournalAiAssist('polish')}
                        disabled={isJournalAiLoading}
                        className="px-3 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Biên tập sư phạm</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleJournalAiAssist('suggest_adjustments')}
                        disabled={isJournalAiLoading}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Gợi ý điều chỉnh</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu ghi chú nhật ký</span>
                  </button>
                </form>
              </div>

              {/* Journal Entries List */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>Danh sách ghi chú & Nhật ký ({journalEntries.length})</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  {journalEntries.map((entry) => (
                    <div key={entry.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.category === 'Tiến bộ học sinh' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              entry.category === 'Điều chỉnh bài giảng' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {entry.category}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{entry.date}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{entry.title}</h4>
                        </div>
                        <span className="text-xs font-semibold px-3 py-1 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl shadow-xs">
                          👤 {entry.studentName}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{entry.content}</p>

                      {entry.aiSuggested && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Gợi ý chuyên môn từ AI:</span>
                          </div>
                          <p className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed">{entry.aiSuggested}</p>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                        <button
                          onClick={() => {
                            setJournalEntries(prev => prev.filter(item => item.id !== entry.id));
                          }}
                          className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Xóa ghi chú
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: AI Tutor */}
        {activeTab === 'ai_tutor' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-[650px]">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Trợ lý AI Gia sư HSA & TSA</h2>
                <p className="text-xs text-slate-500">Hỏi đáp mọi thắc mắc, phân tích câu hỏi khó, giải bài toán định lượng & đọc hiểu</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
              {aiChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-1">AI</div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'}`}>
                    <MarkdownRenderer content={msg.content} />
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-1">GV</div>
                  )}
                </div>
              ))}
              {isAiLoading && (
                <div className="flex gap-3 items-center text-slate-400 text-xs italic">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                  <span>Trợ lý AI đang soạn thảo...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSendAiMessage} className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Nhập câu hỏi hoặc yêu cầu AI soạn câu hỏi ĐGNL..."
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={isAiLoading || !aiQuery.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Gửi hỏi</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
export default HsaTsaHub;
