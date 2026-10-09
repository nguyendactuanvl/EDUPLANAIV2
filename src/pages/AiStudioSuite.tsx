import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, Image as ImageIcon, Video, Sparkles, Send, Upload, Download, 
  RefreshCw, Play, Pause, Layers, Sliders, Atom, Calculator, Table, 
  BarChart2, FileText, CheckCircle2, AlertCircle, Copy, Check, Eye, 
  Maximize2, Move, HelpCircle, Film, Wand2, Shield, Compass, Zap
} from "lucide-react";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { cn } from "../lib/utils";

type TabType = "chatbot" | "image_gen" | "img2video" | "txt2video" | "science";

// Types
interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  attachments?: { name: string; type: string; url?: string }[];
}

export function AiStudioSuite() {
  const [activeTab, setActiveTab] = useState<TabType>("chatbot");

  // --------------------------------------------------------------------------
  // 1. GEMINI CHATBOT STATE
  // --------------------------------------------------------------------------
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Xin chào thầy/cô! Tôi là **Trợ lý Gemini AI** dành cho Giáo viên. Tôi có thể hỗ trợ giải thích kiến thức, soạn bài tập, phân tích tài liệu và trả lời mọi câu hỏi với công thức toán học $...$ chuẩn xác. Thầy/cô cần tôi hỗ trợ gì hôm nay?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatContext, setChatContext] = useState<string>("");
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string }[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handleSendChat = async () => {
    if ((!chatInput.trim() && attachedFiles.length === 0) || chatLoading) return;

    const userText = chatInput;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: attachedFiles.map(f => ({ name: f.name, type: "doc" }))
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const fullContextText = [
        chatContext,
        ...attachedFiles.map(f => `--- Tệp: ${f.name} ---\n${f.content}`)
      ].filter(Boolean).join("\n\n");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userText,
          context: fullContextText || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Không thể gửi tin nhắn.");
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.text || "Đã nhận câu hỏi của thầy/cô.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `⚠️ **Lỗi:** ${err.message || "Đã xảy ra lỗi khi trao đổi với Gemini AI."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleFileUploadChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setAttachedFiles(prev => [...prev, { name: file.name, content: text.slice(0, 10000) }]);
      };
      reader.readAsText(file);
    });
  };

  // --------------------------------------------------------------------------
  // 2. TẠO & CHỈNH SỬA ẢNH (NANO BANANA 2.1) STATE
  // --------------------------------------------------------------------------
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgNegativePrompt, setImgNegativePrompt] = useState("");
  const [imgAspectRatio, setImgAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");
  const [imgStyle, setImgStyle] = useState("photorealistic");
  const [imgSource, setImgSource] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgProgress, setImgProgress] = useState(0);
  const [imgProgressStatus, setImgProgressStatus] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imgCopied, setImgCopied] = useState(false);

  const handleGenerateImage = async () => {
    if (!imgPrompt.trim() || imgLoading) return;

    setImgLoading(true);
    setImgProgress(10);
    setImgProgressStatus("Khởi tạo mô hình Nano Banana 2.1...");
    setGeneratedImage(null);

    const progressTimer = setInterval(() => {
      setImgProgress(prev => {
        if (prev < 40) {
          setImgProgressStatus("Phân tích ngữ cảnh và từ khóa phong cách...");
          return prev + 10;
        } else if (prev < 75) {
          setImgProgressStatus("Khuếch tán vector và sinh điểm ảnh độ phân giải cao...");
          return prev + 5;
        } else if (prev < 90) {
          setImgProgressStatus("Khử nhiễu và hoàn thiện chi tiết màu sắc...");
          return prev + 2;
        }
        return prev;
      });
    }, 400);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imgPrompt,
          negativePrompt: imgNegativePrompt,
          aspectRatio: imgAspectRatio,
          style: imgStyle,
          sourceImage: imgSource
        })
      });

      clearInterval(progressTimer);
      setImgProgress(95);
      setImgProgressStatus("Đang tải dữ liệu hình ảnh...");

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo ảnh.");

      setImgProgress(100);
      setImgProgressStatus("Tạo ảnh hoàn tất!");
      setGeneratedImage(data.imageUrl);
    } catch (err: any) {
      clearInterval(progressTimer);
      alert(`Lỗi tạo ảnh: ${err.message}`);
    } finally {
      setTimeout(() => {
        setImgLoading(false);
      }, 500);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!imgPrompt.trim()) return;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Hãy mở rộng câu mô tả hình ảnh sau thành một AI prompt tạo ảnh siêu chi tiết (tiếng Anh hoặc tiếng Việt), phong phú về ánh sáng, góc quay và độ phân giải: "${imgPrompt}". Chỉ trả về duy nhất nội dung prompt đã mở rộng, không giải thích thêm.`
        })
      });
      const data = await res.json();
      if (data.text) setImgPrompt(data.text.trim());
    } catch (e) {
      console.warn("Lỗi mở rộng prompt", e);
    }
  };

  // --------------------------------------------------------------------------
  // 3. CHUYỂN ẢNH THÀNH VIDEO (VEO 3) STATE
  // --------------------------------------------------------------------------
  const [v2vImage, setV2vImage] = useState<string | null>(null);
  const [v2vMotionPrompt, setV2vMotionPrompt] = useState("");
  const [v2vCameraMove, setV2vCameraMove] = useState("cinematic");
  const [v2vAspectRatio, setV2vAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [v2vDuration, setV2vDuration] = useState<5 | 10>(5);
  const [v2vLoading, setV2vLoading] = useState(false);
  const [v2vProgress, setV2vProgress] = useState(0);
  const [v2vProgressStatus, setV2vProgressStatus] = useState("");
  const [v2vVideoUrl, setV2vVideoUrl] = useState<string | null>(null);

  const handleImageToVideo = async () => {
    if (!v2vImage && !v2vMotionPrompt.trim()) {
      alert("Vui lòng tải ảnh gốc hoặc nhập mô tả chuyển động.");
      return;
    }

    setV2vLoading(true);
    setV2vProgress(15);
    setV2vProgressStatus("Đang phân tích cấu trúc không gian ảnh tĩnh...");
    setV2vVideoUrl(null);

    const timer = setInterval(() => {
      setV2vProgress(p => {
        if (p < 40) {
          setV2vProgressStatus("Trích xuất keyframe chuyển động Veo 3...");
          return p + 8;
        } else if (p < 70) {
          setV2vProgressStatus("Tính toán quang thông (Optical flow) và hiệu ứng camera...");
          return p + 6;
        } else if (p < 92) {
          setV2vProgressStatus(`Render video tỷ lệ ${v2vAspectRatio} độ phân giải 1080p...`);
          return p + 3;
        }
        return p;
      });
    }, 500);

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: v2vMotionPrompt || "Chuyển động mượt mà cho ảnh",
          sourceImage: v2vImage,
          aspectRatio: v2vAspectRatio,
          durationSeconds: v2vDuration,
          motionStyle: v2vCameraMove
        })
      });

      clearInterval(timer);
      setV2vProgress(98);
      setV2vProgressStatus("Đóng gói video MP4...");

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo video");

      setV2vProgress(100);
      setV2vProgressStatus("Hoàn tất tạo video Veo 3!");
      setV2vVideoUrl(data.videoUrl);
    } catch (err: any) {
      clearInterval(timer);
      alert(`Lỗi tạo video: ${err.message}`);
    } finally {
      setTimeout(() => setV2vLoading(false), 500);
    }
  };

  // --------------------------------------------------------------------------
  // 4. TẠO VIDEO TỪ VĂN BẢN (VEO 3 TEXT-TO-VIDEO) STATE
  // --------------------------------------------------------------------------
  const [t2vScript, setT2vScript] = useState("");
  const [t2vAspectRatio, setT2vAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [t2vResolution, setT2vResolution] = useState<"720p" | "1080p">("1080p");
  const [t2vStyle, setT2vStyle] = useState("cinematic_3d");
  const [t2vLoading, setT2vLoading] = useState(false);
  const [t2vProgress, setT2vProgress] = useState(0);
  const [t2vProgressStatus, setT2vProgressStatus] = useState("");
  const [t2vVideoUrl, setT2vVideoUrl] = useState<string | null>(null);

  const handleTextToVideo = async () => {
    if (!t2vScript.trim() || t2vLoading) return;

    setT2vLoading(true);
    setT2vProgress(10);
    setT2vProgressStatus("Khởi động Veo 3 Text-to-Video Engine...");
    setT2vVideoUrl(null);

    const timer = setInterval(() => {
      setT2vProgress(p => {
        if (p < 35) {
          setT2vProgressStatus("Phân tích kịch bản và phân cảnh ánh sáng...");
          return p + 7;
        } else if (p < 75) {
          setT2vProgressStatus("Sinh vật thể 3D và khớp quỹ đạo camera...");
          return p + 5;
        } else if (p < 92) {
          setT2vProgressStatus(`Tổng hợp luồng video tỷ lệ ${t2vAspectRatio}...`);
          return p + 2;
        }
        return p;
      });
    }, 550);

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: t2vScript,
          aspectRatio: t2vAspectRatio,
          resolution: t2vResolution,
          motionStyle: t2vStyle
        })
      });

      clearInterval(timer);
      setT2vProgress(98);
      setT2vProgressStatus("Xuất bản video...");

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi sinh video.");

      setT2vProgress(100);
      setT2vProgressStatus("Tạo video thành công!");
      setT2vVideoUrl(data.videoUrl);
    } catch (err: any) {
      clearInterval(timer);
      alert(`Lỗi sinh video: ${err.message}`);
    } finally {
      setTimeout(() => setT2vLoading(false), 500);
    }
  };

  // --------------------------------------------------------------------------
  // 5. GOOGLE DEEPMIND SCIENCE SKILLS STATE
  // --------------------------------------------------------------------------
  const [scienceSubTab, setScienceSubTab] = useState<"solver" | "molecule" | "periodic" | "units" | "chart">("solver");
  const [sciQuery, setSciQuery] = useState("");
  const [sciTopic, setSciTopic] = useState("Math & Science");
  const [sciLoading, setSciLoading] = useState(false);
  const [sciResult, setSciResult] = useState<string | null>(null);

  // Molecule 3D visualizer state
  const [selectedMolecule, setSelectedMolecule] = useState<string>("H2O");
  const [molRotation, setMolRotation] = useState({ x: 15, y: 30 });
  const [molStyle, setMolStyle] = useState<"ball_stick" | "spacefill" | "wireframe">("ball_stick");

  // Scientific data analysis state
  const [dataInputText, setDataInputText] = useState("12, 15, 18, 22, 25, 30, 31, 35, 40, 42");
  const [chartStats, setChartStats] = useState<{ mean: number; median: number; stdDev: number; min: number; max: number; points: number[] } | null>(null);

  const handleScienceSolve = async () => {
    if (!sciQuery.trim() || sciLoading) return;
    setSciLoading(true);
    setSciResult(null);

    try {
      const res = await fetch("/api/science-solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: sciTopic,
          query: sciQuery,
          type: scienceSubTab
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi xử lý khoa học.");
      setSciResult(data.result);
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setSciLoading(false);
    }
  };

  const calculateDataStats = () => {
    const nums = dataInputText
      .split(/[\s,;\n]+/)
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n));

    if (nums.length === 0) return;

    const sorted = [...nums].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / nums.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const variance = nums.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / nums.length;
    const stdDev = Math.sqrt(variance);

    setChartStats({
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      points: nums
    });
  };

  // Helper for periodic table preset elements
  const periodicElements = [
    { num: 1, sym: "H", name: "Hydrogen", mass: "1.008", cat: "nonmetal", bg: "bg-cyan-50 border-cyan-200 text-cyan-800" },
    { num: 2, sym: "He", name: "Helium", mass: "4.0026", cat: "noble", bg: "bg-purple-50 border-purple-200 text-purple-800" },
    { num: 3, sym: "Li", name: "Lithium", mass: "6.94", cat: "alkali", bg: "bg-rose-50 border-rose-200 text-rose-800" },
    { num: 4, sym: "Be", name: "Beryllium", mass: "9.0122", cat: "alkaline", bg: "bg-amber-50 border-amber-200 text-amber-800" },
    { num: 5, sym: "B", name: "Boron", mass: "10.81", cat: "metalloid", bg: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    { num: 6, sym: "C", name: "Carbon", mass: "12.011", cat: "nonmetal", bg: "bg-cyan-50 border-cyan-200 text-cyan-800" },
    { num: 7, sym: "N", name: "Nitrogen", mass: "14.007", cat: "nonmetal", bg: "bg-cyan-50 border-cyan-200 text-cyan-800" },
    { num: 8, sym: "O", name: "Oxygen", mass: "15.999", cat: "nonmetal", bg: "bg-cyan-50 border-cyan-200 text-cyan-800" },
    { num: 9, sym: "F", name: "Fluorine", mass: "18.998", cat: "halogen", bg: "bg-indigo-50 border-indigo-200 text-indigo-800" },
    { num: 10, sym: "Ne", name: "Neon", mass: "20.180", cat: "noble", bg: "bg-purple-50 border-purple-200 text-purple-800" },
    { num: 11, sym: "Na", name: "Sodium", mass: "22.990", cat: "alkali", bg: "bg-rose-50 border-rose-200 text-rose-800" },
    { num: 12, sym: "Mg", name: "Magnesium", mass: "24.305", cat: "alkaline", bg: "bg-amber-50 border-amber-200 text-amber-800" },
    { num: 13, sym: "Al", name: "Aluminium", mass: "26.982", cat: "metal", bg: "bg-blue-50 border-blue-200 text-blue-800" },
    { num: 14, sym: "Si", name: "Silicon", mass: "28.085", cat: "metalloid", bg: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    { num: 15, sym: "P", name: "Phosphorus", mass: "30.974", cat: "nonmetal", bg: "bg-cyan-50 border-cyan-200 text-cyan-800" },
    { num: 16, sym: "S", name: "Sulfur", mass: "32.06", cat: "nonmetal", bg: "bg-cyan-50 border-cyan-200 text-cyan-800" },
    { num: 17, sym: "Cl", name: "Chlorine", mass: "35.45", cat: "halogen", bg: "bg-indigo-50 border-indigo-200 text-indigo-800" },
    { num: 18, sym: "Ar", name: "Argon", mass: "39.948", cat: "noble", bg: "bg-purple-50 border-purple-200 text-purple-800" },
    { num: 19, sym: "K", name: "Potassium", mass: "39.098", cat: "alkali", bg: "bg-rose-50 border-rose-200 text-rose-800" },
    { num: 20, sym: "Ca", name: "Calcium", mass: "40.078", cat: "alkaline", bg: "bg-amber-50 border-amber-200 text-amber-800" },
    { num: 26, sym: "Fe", name: "Iron", mass: "55.845", cat: "transition", bg: "bg-slate-100 border-slate-300 text-slate-800" },
    { num: 29, sym: "Cu", name: "Copper", mass: "63.546", cat: "transition", bg: "bg-orange-50 border-orange-200 text-orange-800" },
    { num: 30, sym: "Zn", name: "Zinc", mass: "65.38", cat: "transition", bg: "bg-slate-100 border-slate-300 text-slate-800" },
    { num: 47, sym: "Ag", name: "Silver", mass: "107.87", cat: "transition", bg: "bg-slate-100 border-slate-300 text-slate-800" },
    { num: 79, sym: "Au", name: "Gold", mass: "196.97", cat: "transition", bg: "bg-amber-100 border-amber-300 text-amber-900" }
  ];

  const [activeElement, setActiveElement] = useState(periodicElements[0]);

  // Render molecule SVG representation based on style and selection
  const renderMoleculeCanvas = () => {
    const is3dStyle = molStyle === "spacefill";
    const isWire = molStyle === "wireframe";

    let atoms: { x: number; y: number; r: number; color: string; label: string }[] = [];
    let bonds: { x1: number; y1: number; x2: number; y2: number }[] = [];

    if (selectedMolecule === "H2O") {
      atoms = [
        { x: 150, y: 120, r: is3dStyle ? 38 : 28, color: "#ef4444", label: "O" },
        { x: 90, y: 170, r: is3dStyle ? 26 : 20, color: "#38bdf8", label: "H" },
        { x: 210, y: 170, r: is3dStyle ? 26 : 20, color: "#38bdf8", label: "H" },
      ];
      bonds = [
        { x1: 150, y1: 120, x2: 90, y2: 170 },
        { x1: 150, y1: 120, x2: 210, y2: 170 },
      ];
    } else if (selectedMolecule === "CO2") {
      atoms = [
        { x: 150, y: 140, r: is3dStyle ? 36 : 26, color: "#334155", label: "C" },
        { x: 70, y: 140, r: is3dStyle ? 34 : 24, color: "#ef4444", label: "O" },
        { x: 230, y: 140, r: is3dStyle ? 34 : 24, color: "#ef4444", label: "O" },
      ];
      bonds = [
        { x1: 150, y1: 135, x2: 70, y2: 135 },
        { x1: 150, y1: 145, x2: 70, y2: 145 },
        { x1: 150, y1: 135, x2: 230, y2: 135 },
        { x1: 150, y1: 145, x2: 230, y2: 145 },
      ];
    } else if (selectedMolecule === "CH4") {
      atoms = [
        { x: 150, y: 140, r: is3dStyle ? 38 : 28, color: "#334155", label: "C" },
        { x: 150, y: 70, r: is3dStyle ? 24 : 18, color: "#38bdf8", label: "H" },
        { x: 80, y: 180, r: is3dStyle ? 24 : 18, color: "#38bdf8", label: "H" },
        { x: 220, y: 180, r: is3dStyle ? 24 : 18, color: "#38bdf8", label: "H" },
        { x: 150, y: 200, r: is3dStyle ? 22 : 16, color: "#0ea5e9", label: "H" },
      ];
      bonds = [
        { x1: 150, y1: 140, x2: 150, y2: 70 },
        { x1: 150, y1: 140, x2: 80, y2: 180 },
        { x1: 150, y1: 140, x2: 220, y2: 180 },
        { x1: 150, y1: 140, x2: 150, y2: 200 },
      ];
    } else {
      // Ethanol/Benzene ring
      atoms = [
        { x: 100, y: 140, r: is3dStyle ? 32 : 24, color: "#334155", label: "C" },
        { x: 170, y: 140, r: is3dStyle ? 32 : 24, color: "#334155", label: "C" },
        { x: 230, y: 140, r: is3dStyle ? 30 : 22, color: "#ef4444", label: "O" },
        { x: 270, y: 165, r: is3dStyle ? 20 : 16, color: "#38bdf8", label: "H" },
      ];
      bonds = [
        { x1: 100, y1: 140, x2: 170, y2: 140 },
        { x1: 170, y1: 140, x2: 230, y2: 140 },
        { x1: 230, y1: 140, x2: 270, y2: 165 },
      ];
    }

    return (
      <svg
        className="w-full h-64 bg-slate-950 rounded-xl cursor-grab active:cursor-grabbing border border-slate-800 shadow-inner"
        viewBox="0 0 300 280"
        style={{
          transform: `rotateX(${molRotation.x}deg) rotateY(${molRotation.y}deg)`,
          transition: "transform 0.1s ease-out"
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1) {
            setMolRotation(prev => ({
              x: prev.x - e.movementY * 0.5,
              y: prev.y + e.movementX * 0.5
            }));
          }
        }}
      >
        <defs>
          <radialGradient id="atomGlow" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
          </radialGradient>
        </defs>

        {/* Render Bonds */}
        {bonds.map((b, i) => (
          <line
            key={i}
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke={isWire ? "#64748b" : "#cbd5e1"}
            strokeWidth={isWire ? "2" : "6"}
            strokeLinecap="round"
          />
        ))}

        {/* Render Atoms */}
        {!isWire && atoms.map((a, i) => (
          <g key={i}>
            <circle
              cx={a.x}
              cy={a.y}
              r={a.r}
              fill={a.color}
              stroke="#0f172a"
              strokeWidth="2"
            />
            <circle
              cx={a.x}
              cy={a.y}
              r={a.r}
              fill="url(#atomGlow)"
            />
            <text
              x={a.x}
              y={a.y + 5}
              fill="#ffffff"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
            >
              {a.label}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header Banner */}
      <header className="bg-slate-950/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-7 h-7 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                Google AI Studio & Creative Suite
              </h1>
              <p className="text-xs text-slate-400">
                Tích hợp Gemini Chatbot, Nano Banana 2.1 Art, Veo 3 Video AI & DeepMind Science Skills
              </p>
            </div>
          </div>

          {/* Navigation Tab Menu */}
          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab("chatbot")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "chatbot"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <Bot className="w-4 h-4" />
              <span>Gemini Chatbot</span>
            </button>

            <button
              onClick={() => setActiveTab("image_gen")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "image_gen"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Tạo & Sửa Ảnh (Nano Banana)</span>
            </button>

            <button
              onClick={() => setActiveTab("img2video")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "img2video"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <Video className="w-4 h-4" />
              <span>Ảnh thành Video (Veo 3)</span>
            </button>

            <button
              onClick={() => setActiveTab("txt2video")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "txt2video"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <Film className="w-4 h-4" />
              <span>Tạo Video từ Văn bản</span>
            </button>

            <button
              onClick={() => setActiveTab("science")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "science"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <Atom className="w-4 h-4" />
              <span>DeepMind Science</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">

        {/* ------------------------------------------------------------------ */}
        {/* MODULE 1: GEMINI CHATBOT */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "chatbot" && (
          <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            {/* Chatbot Header */}
            <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    Trợ lý Gemini AI Giáo dục
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                      LaTeX Standard
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">Trò chuyện thông minh, hiểu tài liệu ngữ cảnh & định dạng công thức chuẩn</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChatMessages([])}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Xóa cuộc trò chuyện"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Xóa lịch sử</span>
                </button>
              </div>
            </div>

            {/* Quick Prompt Badges */}
            <div className="px-6 py-2 bg-slate-900/50 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs custom-scrollbar">
              <span className="text-slate-400 font-medium shrink-0">Gợi ý prompt:</span>
              {[
                "Giải thích khái niệm Đạo hàm với ví dụ thực tế",
                "Tóm tắt kiến thức chương Quang học Vật lý 11",
                "Soạn 3 câu hỏi gợi mở cho môn Hóa học 10",
                "Phân tích phản ứng oxy hóa khử $2\\text{Fe} + 3\\text{Cl}_2 \\rightarrow 2\\text{FeCl}_3$"
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setChatInput(p)}
                  className="px-2.5 py-1 bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 text-slate-300 border border-slate-700 rounded-full shrink-0 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-slate-950">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-3xl",
                    msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {msg.sender === "user" ? "Thầy/Cô" : "Gemini AI"}
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    className={cn(
                      "px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-lg",
                      msg.sender === "user"
                        ? "bg-emerald-600 text-white rounded-tr-none"
                        : "bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none"
                    )}
                  >
                    {msg.sender === "user" ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <MarkdownRenderer content={msg.text} />
                    )}

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-700/50 flex flex-wrap gap-2">
                        {msg.attachments.map((att, i) => (
                          <span key={i} className="text-xs bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700 text-emerald-300 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {att.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="mr-auto items-start max-w-xl">
                  <div className="px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none text-slate-400 text-sm flex items-center gap-3 animate-pulse">
                    <Bot className="w-5 h-5 text-emerald-400 animate-spin" />
                    <span>Gemini AI đang suy nghĩ và tính toán công thức...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Attached files preview bar */}
            {attachedFiles.length > 0 && (
              <div className="px-6 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-xs text-slate-400 font-medium">Tệp đính kèm:</span>
                {attachedFiles.map((file, i) => (
                  <span key={i} className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {file.name}
                    <button
                      onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-rose-400 ml-1 font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3">
              <label className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors" title="Đính kèm tài liệu TXT/PDF/DOCX">
                <Upload className="w-5 h-5" />
                <input
                  type="file"
                  multiple
                  onChange={handleFileUploadChat}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendChat()}
                placeholder="Nhập câu hỏi hoặc yêu cầu cho Gemini AI (vd: 'Giải hệ phương trình $\\begin{cases} x+y=5 \\\\ 2x-y=1 \\end{cases}$')..."
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-all"
              />

              <button
                onClick={handleSendChat}
                disabled={chatLoading || (!chatInput.trim() && attachedFiles.length === 0)}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <span>Gửi</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MODULE 2: TẠO & CHỈNH SỬA ẢNH (NANO BANANA 2.1) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "image_gen" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls Column */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <Wand2 className="w-5 h-5" />
                  <h2 className="text-base font-bold text-slate-100">Nano Banana 2.1 AI Art Generator</h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sinh minh họa giảng dạy, sơ đồ toán học & hình nghệ thuật độ phân giải cao từ văn bản.
                </p>
              </div>

              {/* Prompt Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Mô tả hình ảnh (Prompt) <span className="text-rose-400">*</span>
                  </label>
                  <button
                    onClick={handleEnhancePrompt}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Mở rộng Prompt</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={imgPrompt}
                  onChange={e => setImgPrompt(e.target.value)}
                  placeholder="Ví dụ: 'Sơ đồ 3D cấu tạo tế bào thực vật gồm nhân, lục lạp và vách tế bào sắc nét, phong cách giáo dục hiện đại, ánh sáng mềm'..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all custom-scrollbar"
                />
              </div>

              {/* Aspect Ratio Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Tỷ lệ khung hình (Aspect Ratio)</label>
                <div className="grid grid-cols-5 gap-2">
                  {(["1:1", "16:9", "9:16", "4:3", "3:4"] as const).map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => setImgAspectRatio(ratio)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                        imgAspectRatio === ratio
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      <span>{ratio}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Art Style Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Phong cách nghệ thuật (Art Style)</label>
                <select
                  value={imgStyle}
                  onChange={e => setImgStyle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="photorealistic">📸 Ảnh chụp chân thực (Photorealistic)</option>
                  <option value="3d_render">🧊 3D Render sống động</option>
                  <option value="diagram">📐 Sơ đồ kỹ thuật / Giáo khoa (Diagram)</option>
                  <option value="anime">🎨 Anime / Manga Art</option>
                  <option value="oil_painting">🖼️ Sơn dầu cổ điển (Oil Painting)</option>
                  <option value="sketch">✏️ Phác thảo bút chì (Sketch)</option>
                  <option value="digital_art">💻 Nghệ thuật số (Digital Art)</option>
                </select>
              </div>

              {/* Optional Negative Prompt */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">Yếu tố loại trừ (Negative Prompt - Không bắt buộc)</label>
                <input
                  type="text"
                  value={imgNegativePrompt}
                  onChange={e => setImgNegativePrompt(e.target.value)}
                  placeholder="Nhiễu, mờ, biến dạng, chữ đè, chất lượng kém..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateImage}
                disabled={imgLoading || !imgPrompt.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {imgLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Đang sinh ảnh AI...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>Tạo ảnh Nano Banana 2.1</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Preview & Output Column */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-2xl min-h-[500px]">
              {/* Progress Bar Display */}
              {imgLoading && (
                <div className="space-y-3 p-4 bg-slate-900 border border-slate-800 rounded-xl animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {imgProgressStatus}
                    </span>
                    <span className="font-bold text-slate-300">{imgProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${imgProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Image Preview Canvas */}
              <div className="flex-1 my-4 flex items-center justify-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 p-4 min-h-[360px] relative">
                {generatedImage ? (
                  <div className="relative group max-w-full max-h-[500px]">
                    <img
                      src={generatedImage}
                      alt="AI Generated"
                      className="max-h-[460px] w-auto object-contain rounded-xl shadow-2xl border border-slate-800"
                    />
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-emerald-400 border border-slate-800 font-semibold">
                      Tỷ lệ {imgAspectRatio} • Nano Banana 2.1
                    </div>
                  </div>
                ) : !imgLoading ? (
                  <div className="text-center space-y-3 p-8">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300">Chưa có hình ảnh sinh ra</p>
                      <p className="text-xs text-slate-500 mt-1">Nhập mô tả ở cột bên trái và bấm 'Tạo ảnh' để trải nghiệm Nano Banana 2.1</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Download & Actions Bar */}
              {generatedImage && (
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 truncate max-w-md">
                    <span className="font-semibold text-slate-300">Prompt:</span> {imgPrompt}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={generatedImage}
                      download={`nano_banana_${Date.now()}.png`}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải ảnh về</span>
                    </a>

                    <button
                      onClick={() => {
                        setV2vImage(generatedImage);
                        setActiveTab("img2video");
                      }}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Video className="w-4 h-4 text-emerald-400" />
                      <span>Chuyển sang Veo 3 Video</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MODULE 3: CHUYỂN ẢNH THÀNH VIDEO (VEO 3 IMAGE-TO-VIDEO) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "img2video" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <Video className="w-5 h-5" />
                  <h2 className="text-base font-bold text-slate-100">Veo 3 Image-to-Video Engine</h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Animate ảnh tĩnh thành video điện ảnh chuyển động mượt mà với tỷ lệ 16:9 hoặc 9:16.
                </p>
              </div>

              {/* Upload Image Section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Ảnh gốc cần tạo chuyển động (Source Image)</label>
                {v2vImage ? (
                  <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900 h-40 flex items-center justify-center">
                    <img src={v2vImage} alt="Source" className="max-h-full object-contain" />
                    <button
                      onClick={() => setV2vImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-slate-950/80 hover:bg-rose-500 text-white rounded-full transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="h-36 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all bg-slate-900/50 text-slate-400">
                    <Upload className="w-8 h-8 text-emerald-400 mb-2" />
                    <span className="text-xs font-semibold text-slate-300">Tải ảnh gốc từ máy tính</span>
                    <span className="text-[11px] text-slate-500 mt-1">Hỗ trợ JPG, PNG, WEBP</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => setV2vImage(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Motion Prompt */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Mô tả hiệu ứng chuyển động (Motion Prompt)</label>
                <input
                  type="text"
                  value={v2vMotionPrompt}
                  onChange={e => setV2vMotionPrompt(e.target.value)}
                  placeholder="Ví dụ: 'Sự chuyển động của dòng sông qua thung lũng, camera tiến chậm vào trung tâm'..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Camera Movement */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Chuyển động Camera (Camera Movement)</label>
                <select
                  value={v2vCameraMove}
                  onChange={e => setV2vCameraMove(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-emerald-500"
                >
                  <option value="cinematic">🎥 Cinematic Glide (Lướt nhẹ điện ảnh)</option>
                  <option value="zoom_in">🔍 Zoom In (Tiến lại gần trung tâm)</option>
                  <option value="pan_right">➡️ Pan Right (Góc quay quét sang phải)</option>
                  <option value="orbit_360">🔄 Orbit 360 (Xoay quanh vật thể)</option>
                  <option value="tilt_up">⬆️ Tilt Up (Hướng ống kính lên cao)</option>
                </select>
              </div>

              {/* Aspect Ratio & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Tỷ lệ khung hình</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setV2vAspectRatio("16:9")}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                        v2vAspectRatio === "16:9" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400"
                      )}
                    >
                      16:9 Ngang
                    </button>
                    <button
                      onClick={() => setV2vAspectRatio("9:16")}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                        v2vAspectRatio === "9:16" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400"
                      )}
                    >
                      9:16 Dọc
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Thời lượng video</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setV2vDuration(5)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                        v2vDuration === 5 ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400"
                      )}
                    >
                      5 giây
                    </button>
                    <button
                      onClick={() => setV2vDuration(10)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                        v2vDuration === 10 ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400"
                      )}
                    >
                      10 giây
                    </button>
                  </div>
                </div>
              </div>

              {/* Generate Video Button */}
              <button
                onClick={handleImageToVideo}
                disabled={v2vLoading || (!v2vImage && !v2vMotionPrompt.trim())}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {v2vLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Veo 3 đang sinh video...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    <span>Sinh Video Veo 3 từ Ảnh</span>
                  </>
                )}
              </button>
            </div>

            {/* Video Output Column */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-2xl min-h-[500px]">
              {v2vLoading && (
                <div className="space-y-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {v2vProgressStatus}
                    </span>
                    <span className="font-bold text-slate-300">{v2vProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${v2vProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 my-4 flex items-center justify-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 p-4 min-h-[360px]">
                {v2vVideoUrl ? (
                  <div className="w-full max-w-2xl flex flex-col items-center">
                    <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
                      <video
                        controls
                        autoPlay
                        loop
                        muted
                        className={cn(
                          "mx-auto object-contain max-h-[420px]",
                          v2vAspectRatio === "9:16" ? "w-64" : "w-full"
                        )}
                      >
                        <source src={v2vVideoUrl} type="video/mp4" />
                        Trình duyệt của bạn không hỗ trợ video MP4.
                      </video>
                    </div>
                  </div>
                ) : !v2vLoading ? (
                  <div className="text-center space-y-3 p-8">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto">
                      <Film className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">Chưa có video được sinh ra</p>
                    <p className="text-xs text-slate-500">Tải ảnh lên và bấm 'Sinh Video Veo 3' để xem kết quả trực tiếp</p>
                  </div>
                ) : null}
              </div>

              {v2vVideoUrl && (
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-medium">Veo 3 Cinematic Video • Tỷ lệ {v2vAspectRatio}</span>
                  <a
                    href={v2vVideoUrl}
                    download={`veo3_video_${Date.now()}.mp4`}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Video MP4</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MODULE 4: TẠO VIDEO TỪ VĂN BẢN (VEO 3 TEXT-TO-VIDEO) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "txt2video" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <Film className="w-5 h-5" />
                  <h2 className="text-base font-bold text-slate-100">Veo 3 Text-to-Video Engine</h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Nhập kịch bản/mô tả chi tiết để Veo 3 tự động sinh phân cảnh video sắc nét.
                </p>
              </div>

              {/* Script / Prompt Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Kịch bản / Prompt Video <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={5}
                  value={t2vScript}
                  onChange={e => setT2vScript(e.target.value)}
                  placeholder="Nhập mô tả kịch bản (vd: 'Mô phỏng 3D hiện đại thí nghiệm núi lửa phun trào magma đỏ rực, khói bốc lên cao, góc nhìn drone toàn cảnh tỉ lệ 16:9')..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 custom-scrollbar"
                />
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Mẫu kịch bản giáo khoa gợi ý:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Sự quay của Trái Đất quanh Mặt Trời 3D",
                    "Thí nghiệm thấu kính hội tụ bọc chùm sáng",
                    "Động cơ đốt trong 4 kỳ chuyển động",
                    "Cấu tạo DNA xoắn đôi hoạt hình"
                  ].map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => setT2vScript(preset)}
                      className="text-[10px] bg-slate-900 hover:bg-emerald-500/20 text-slate-300 border border-slate-800 rounded-md px-2 py-1 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Tỷ lệ khung hình</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setT2vAspectRatio("16:9")}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                        t2vAspectRatio === "16:9" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400"
                      )}
                    >
                      16:9
                    </button>
                    <button
                      onClick={() => setT2vAspectRatio("9:16")}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                        t2vAspectRatio === "9:16" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400"
                      )}
                    >
                      9:16
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Độ phân giải</label>
                  <select
                    value={t2vResolution}
                    onChange={e => setT2vResolution(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 cursor-pointer"
                  >
                    <option value="720p">720p HD</option>
                    <option value="1080p">1080p Full HD</option>
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleTextToVideo}
                disabled={t2vLoading || !t2vScript.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {t2vLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Đang render kịch bản video...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-5 h-5" />
                    <span>Tạo Video Veo 3 từ Kịch bản</span>
                  </>
                )}
              </button>
            </div>

            {/* Output Area */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-2xl min-h-[500px]">
              {t2vLoading && (
                <div className="space-y-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t2vProgressStatus}
                    </span>
                    <span className="font-bold text-slate-300">{t2vProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${t2vProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 my-4 flex items-center justify-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 p-4 min-h-[360px]">
                {t2vVideoUrl ? (
                  <div className="w-full max-w-2xl flex flex-col items-center">
                    <video
                      controls
                      autoPlay
                      loop
                      muted
                      className={cn(
                        "rounded-2xl max-h-[420px] bg-black border border-slate-800 shadow-2xl",
                        t2vAspectRatio === "9:16" ? "w-64" : "w-full"
                      )}
                    >
                      <source src={t2vVideoUrl} type="video/mp4" />
                    </video>
                  </div>
                ) : !t2vLoading ? (
                  <div className="text-center space-y-3 p-8">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto">
                      <Film className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">Chưa có video được khởi tạo</p>
                    <p className="text-xs text-slate-500">Nhập kịch bản video và nhấn 'Tạo Video' để tạo thành phẩm</p>
                  </div>
                ) : null}
              </div>

              {t2vVideoUrl && (
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-medium">Veo 3 Text-to-Video Engine • {t2vResolution}</span>
                  <a
                    href={t2vVideoUrl}
                    download={`veo3_script_video_${Date.now()}.mp4`}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Video MP4</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MODULE 5: GOOGLE DEEPMIND SCIENCE SKILLS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "science" && (
          <div className="flex flex-col gap-6">
            {/* Sub Nav Bar */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-2xl overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setScienceSubTab("solver")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
                  scienceSubTab === "solver" ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Calculator className="w-4 h-4" />
                <span>Giải toán & Hóa học</span>
              </button>

              <button
                onClick={() => setScienceSubTab("molecule")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
                  scienceSubTab === "molecule" ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Atom className="w-4 h-4" />
                <span>Mô phỏng Phân tử 3D</span>
              </button>

              <button
                onClick={() => setScienceSubTab("periodic")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
                  scienceSubTab === "periodic" ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Table className="w-4 h-4" />
                <span>Bảng tuần hoàn Hóa học</span>
              </button>

              <button
                onClick={() => setScienceSubTab("units")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
                  scienceSubTab === "units" ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Compass className="w-4 h-4" />
                <span>Chuyển đổi Đơn vị Khoa học</span>
              </button>

              <button
                onClick={() => setScienceSubTab("chart")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
                  scienceSubTab === "chart" ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <BarChart2 className="w-4 h-4" />
                <span>Phân tích Dữ liệu Khoa học</span>
              </button>
            </div>

            {/* Sub Tool 1: Solver */}
            {scienceSubTab === "solver" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
                  <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    DeepMind Science AI Solver
                  </h3>
                  <p className="text-xs text-slate-400">
                    Giải phương trình, cân bằng phản ứng hóa học và tính toán lý - hóa chuyên sâu.
                  </p>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Nhập bài toán hoặc câu hỏi khoa học</label>
                    <textarea
                      rows={6}
                      value={sciQuery}
                      onChange={e => setSciQuery(e.target.value)}
                      placeholder="Ví dụ: 'Cân bằng phản ứng $KMnO_4 + HCl \\rightarrow KCl + MnCl_2 + Cl_2 + H_2O$ và tính thể tích $Cl_2$ đktc thu được khi hòa tan 15.8g $KMnO_4$'..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 custom-scrollbar"
                    />
                  </div>

                  <button
                    onClick={handleScienceSolve}
                    disabled={sciLoading || !sciQuery.trim()}
                    className="py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-teal-500/20"
                  >
                    {sciLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>Giải bài toán Khoa học</span>
                  </button>
                </div>

                <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl min-h-[400px]">
                  <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Kết quả lời giải chi tiết:</h4>
                  {sciResult ? (
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                      <MarkdownRenderer content={sciResult} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                      <Atom className="w-12 h-12 mb-2 text-slate-700" />
                      <span className="text-xs">Kết quả tính toán khoa học sẽ xuất hiện ở đây</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub Tool 2: 3D Molecule Visualizer */}
            {scienceSubTab === "molecule" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
                  <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
                    <Atom className="w-4 h-4" />
                    Mô phỏng Cấu trúc Phân tử 3D
                  </h3>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Chọn Phân tử mẫu</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "H2O", name: "Nước ($H_2O$)" },
                        { id: "CO2", name: "Khí Cacbonic ($CO_2$)" },
                        { id: "CH4", name: "Mêtan ($CH_4$)" },
                        { id: "Ethanol", name: "Rượu Êtylic ($C_2H_5OH$)" }
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMolecule(m.id)}
                          className={cn(
                            "p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-left",
                            selectedMolecule === m.id ? "bg-teal-500/20 border-teal-500 text-teal-300" : "bg-slate-900 border-slate-800 text-slate-400"
                          )}
                        >
                          <MarkdownRenderer content={m.name} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Kiểu hiển thị (Representation)</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => setMolStyle("ball_stick")}
                        className={cn(
                          "py-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                          molStyle === "ball_stick" ? "bg-teal-500/20 border-teal-500 text-teal-300" : "bg-slate-900 border-slate-800 text-slate-400"
                        )}
                      >
                        Ball & Stick
                      </button>
                      <button
                        onClick={() => setMolStyle("spacefill")}
                        className={cn(
                          "py-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                          molStyle === "spacefill" ? "bg-teal-500/20 border-teal-500 text-teal-300" : "bg-slate-900 border-slate-800 text-slate-400"
                        )}
                      >
                        Spacefill
                      </button>
                      <button
                        onClick={() => setMolStyle("wireframe")}
                        className={cn(
                          "py-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                          molStyle === "wireframe" ? "bg-teal-500/20 border-teal-500 text-teal-300" : "bg-slate-900 border-slate-800 text-slate-400"
                        )}
                      >
                        Wireframe
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">Thao tác tương tác 3D:</p>
                    <p>• Nhấp giữ chuột trái & kéo để xoay góc nhìn 360°</p>
                    <p>• Quan sát độ rộng liên kết và nguyên tử tương ứng</p>
                  </div>
                </div>

                <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center">
                  <div className="w-full max-w-lg mb-3 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-teal-400">3D Canvas Visualizer</span>
                    <span>Góc xoay: X={Math.round(molRotation.x)}°, Y={Math.round(molRotation.y)}°</span>
                  </div>
                  {renderMoleculeCanvas()}
                </div>
              </div>
            )}

            {/* Sub Tool 3: Periodic Table */}
            {scienceSubTab === "periodic" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-sm font-bold text-teal-400 mb-4 flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    Bảng tuần hoàn Nguyên tố Hóa học
                  </h3>

                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                    {periodicElements.map((el) => (
                      <button
                        key={el.num}
                        onClick={() => setActiveElement(el)}
                        className={cn(
                          "p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-105",
                          el.bg,
                          activeElement.num === el.num ? "ring-2 ring-teal-400 shadow-lg" : ""
                        )}
                      >
                        <span className="text-[10px] font-bold opacity-70">{el.num}</span>
                        <span className="text-base font-black">{el.sym}</span>
                        <span className="text-[9px] truncate max-w-full">{el.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">Chi tiết Nguyên tố</span>
                    <div className="mt-4 p-5 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-2">
                      <span className="text-xs font-bold text-slate-500">Số hiệu nguyên tử: {activeElement.num}</span>
                      <h2 className="text-4xl font-black text-teal-300">{activeElement.sym}</h2>
                      <h3 className="text-lg font-bold text-slate-100">{activeElement.name}</h3>
                      <p className="text-xs text-slate-400">Khối lượng nguyên tử: <span className="text-slate-200 font-semibold">{activeElement.mass} u</span></p>
                      <span className="inline-block px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-xs font-semibold capitalize border border-teal-500/30">
                        Phân loại: {activeElement.cat}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub Tool 4: Unit Converter */}
            {scienceSubTab === "units" && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-3xl mx-auto w-full space-y-6">
                <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
                  <Compass className="w-4 h-4" />
                  Chuyển đổi Đơn vị & Công thức Khoa học
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-teal-300">Năng lượng ($E = mc^2$)</span>
                    <MarkdownRenderer content="$1\\text{ J} = 0.2390\\text{ cal} = 6.242 \\times 10^{18}\\text{ eV}$" />
                  </div>

                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-teal-300">Áp suất ($PV = nRT$)</span>
                    <MarkdownRenderer content="$1\\text{ atm} = 101,325\\text{ Pa} = 760\\text{ mmHg}$" />
                  </div>

                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-teal-300">Nhiệt độ tuyệt đối</span>
                    <MarkdownRenderer content="$T(\\text{K}) = t(^\\circ\\text{C}) + 273.15$" />
                  </div>

                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-teal-300">Tần số & Bước sóng</span>
                    <MarkdownRenderer content="$\\lambda = \\frac{c}{f} = \\frac{3 \\times 10^8}{f}$" />
                  </div>
                </div>
              </div>
            )}

            {/* Sub Tool 5: Data Analysis & Charts */}
            {scienceSubTab === "chart" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
                  <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" />
                    Phân tích Dữ liệu & Thống kê Khoa học
                  </h3>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Nhập chuỗi số liệu (cách nhau bởi dấu phẩy)</label>
                    <textarea
                      rows={4}
                      value={dataInputText}
                      onChange={e => setDataInputText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <button
                    onClick={calculateDataStats}
                    className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-teal-500/20"
                  >
                    Tính toán Thống kê & Vẽ Đồ thị
                  </button>
                </div>

                <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                  {chartStats ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-500 uppercase flex items-center justify-center gap-1">
                            <span>Trung bình</span>
                            <MarkdownRenderer content="($\\mu$)" />
                          </span>
                          <p className="text-lg font-bold text-teal-300">{chartStats.mean}</p>
                        </div>
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-500 uppercase">Trung vị (Median)</span>
                          <p className="text-lg font-bold text-teal-300">{chartStats.median}</p>
                        </div>
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-500 uppercase flex items-center justify-center gap-1">
                            <span>Độ lệch chuẩn</span>
                            <MarkdownRenderer content="($\\sigma$)" />
                          </span>
                          <p className="text-lg font-bold text-teal-300">{chartStats.stdDev}</p>
                        </div>
                      </div>

                      {/* SVG Bar Chart Visualization */}
                      <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400 font-semibold mb-2 block">Biểu đồ phân bố dữ liệu:</span>
                        <svg className="w-full h-48" viewBox="0 0 300 150">
                          {chartStats.points.map((pt, i) => {
                            const barH = (pt / chartStats.max) * 110;
                            return (
                              <g key={i}>
                                <rect
                                  x={10 + i * (280 / chartStats.points.length)}
                                  y={130 - barH}
                                  width={280 / chartStats.points.length - 4}
                                  height={barH}
                                  fill="#14b8a6"
                                  rx="3"
                                />
                                <text
                                  x={10 + i * (280 / chartStats.points.length) + (280 / chartStats.points.length - 4) / 2}
                                  y={125 - barH}
                                  fill="#cbd5e1"
                                  fontSize="9"
                                  textAnchor="middle"
                                >
                                  {pt}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                      <BarChart2 className="w-12 h-12 mb-2 text-slate-700" />
                      <span className="text-xs">Nhập dữ liệu và nhấn tính toán để xem đồ thị</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
