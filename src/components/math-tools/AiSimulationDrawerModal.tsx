import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Play, Download, Copy, Check, X, RefreshCw, 
  Eye, Image as ImageIcon, FileCode, CheckCircle2, 
  HelpCircle, ChevronRight, Layers, Sun, Moon
} from "lucide-react";
import { apiFetch } from "../../lib/apiFetch";

export interface AiSimulationDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionNumber?: number;
  initialPrompt?: string;
  defaultTarget?: "content" | "solution";
  onInsertSnippet: (target: "content" | "solution", snippet: string) => void;
}

interface PresetItem {
  title: string;
  desc: string;
  prompt: string;
}

const PRESETS: PresetItem[] = [
  {
    title: "Ngọn Hải đăng & Con thuyền",
    desc: "Bài toán góc hạ nhìn từ hải đăng xuống thuyền",
    prompt: "Một người đứng trên đỉnh một ngọn hải đăng cao 80m so với mực nước biển, nhìn thấy một con thuyền đang neo đậu với một góc hạ 30 độ. Hãy tính khoảng cách từ chân ngọn hải đăng đến con thuyền. Vẽ hình minh họa chuẩn sư phạm gồm ngọn hải đăng đứng vuông góc mặt nước, con thuyền trên biển, đường tầm mắt nằm ngang, tia nhìn, góc hạ 30 độ, các đỉnh A, B, C, khoảng cách 80m và khoảng cách x cần tìm."
  },
  {
    title: "Bóng của cây cổ thụ",
    desc: "Bài toán bóng nắng chiếu góc 60 độ trên mặt đất",
    prompt: "Một cây đứng thẳng trên mặt đất phẳng. Vào một thời điểm trong ngày, tia nắng mặt trời chiếu xuống mặt đất tạo thành góc 60 độ so với phương nằm ngang. Đo được bóng của cây trên mặt đất dài 15m. Tính chiều cao h của cây. Vẽ hình minh họa gồm mặt đất nằm ngang, cây thẳng đứng, tia nắng mặt trời nét vàng đứt, góc nâng 60 độ ở đầu bóng, các đỉnh tam giác vuông A (ngọn), B (gốc), C (đầu bóng), bóng dài 15m và chiều cao h cần tìm."
  },
  {
    title: "Máy bay cất cánh",
    desc: "Bài toán máy bay bay lên góc nâng 25 độ đạt độ cao h",
    prompt: "Một chiếc máy bay cất cánh từ đường băng với góc nâng 25 độ. Sau khi bay được quãng đường 3000m theo đường bay nghiêng, máy bay đạt độ cao bao nhiêu mét? Vẽ hình minh họa gồm đường băng nằm ngang, vệt bay nghiêng góc nâng 25 độ, hình vẽ máy bay ở đỉnh, đường cao gióng thẳng đứng biểu diễn độ cao h, tam giác vuông ABC với AB = 3000m và chiều cao BC = h cần tính."
  },
  {
    title: "Chiều cao Tòa nhà (Trụ anten)",
    desc: "Bài toán đo đạc góc nâng tại hai điểm đứng ngắm khác nhau",
    prompt: "Để đo chiều cao của một tòa nhà, người ta đặt máy ngắm tại hai điểm C và D cách nhau 20m trên mặt đất thẳng hàng với chân tòa nhà. Góc nâng nhìn lên đỉnh tòa nhà tại C là 45 độ và tại D là 30 độ. Tính chiều cao h của tòa nhà. Vẽ hình minh họa gồm tòa nhà thẳng đứng (cao h), mặt đất nằm ngang, hai điểm ngắm C và D cách nhau 20m, các góc nâng 45 độ và 30 độ chiếu tới đỉnh A của tòa nhà."
  },
  {
    title: "Cái thang dựa vào tường",
    desc: "Bài toán thang dài 5m tạo với mặt đất góc 65 độ",
    prompt: "Một cái thang dài 5m dựa vào một bức tường thẳng đứng. Chân thang đặt trên sàn nằm ngang và tạo với sàn một góc an toàn là 65 độ. Hỏi đầu trên của thang đạt độ cao bao nhiêu mét so với sàn? Vẽ hình minh họa gồm bức tường thẳng đứng, sàn nhà nằm ngang có ký hiệu góc vuông, cái thang nghiêng dài 5m, góc an toàn 65 độ ở chân thang và độ cao h trên tường."
  },
  {
    title: "Hình chóp tam giác đều / Tứ giác",
    desc: "Mô phỏng hình học không gian có nét đứt và đường cao",
    prompt: "Cho hình chóp S.ABC có đáy ABC là tam giác đều cạnh a, SA vuông góc với đáy. Vẽ hình chóp không gian 3D với nét liền cho các cạnh nhìn thấy và nét đứt cho các cạnh khuất, thể hiện rõ đường cao SA, đáy ABC và các đỉnh được chú thích rõ ràng."
  }
];

export function AiSimulationDrawerModal({
  isOpen,
  onClose,
  questionNumber,
  initialPrompt = "",
  defaultTarget = "content",
  onInsertSnippet
}: AiSimulationDrawerModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [svgContent, setSvgContent] = useState("");
  const [targetSlot, setTargetSlot] = useState<"content" | "solution">(defaultTarget);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialPrompt && initialPrompt.trim()) {
        setPrompt(initialPrompt.trim());
      } else if (!prompt) {
        setPrompt(PRESETS[0].prompt);
      }
      setTargetSlot(defaultTarget);
    }
  }, [isOpen, initialPrompt, defaultTarget]);

  if (!isOpen) return null;

  const handleGenerate = async (overridePrompt?: string) => {
    const textToRun = (overridePrompt || prompt).trim();
    if (!textToRun) {
      setErrorMessage("Vui lòng nhập nội dung đề bài hoặc mô tả hình vẽ cần mô phỏng.");
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const res = await apiFetch("/api/generate-math-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToRun,
          subject: "Toán",
          targetFormat: "svg"
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi máy chủ (${res.status}) khi vẽ hình mô phỏng.`);
      }

      const data = await res.json();
      if (data.svg) {
        setSvgContent(data.svg);
      } else {
        throw new Error("Không nhận được mã SVG hợp lệ từ AI. Vui lòng bấm tạo lại!");
      }
    } catch (err: any) {
      console.error("Lỗi vẽ hình mô phỏng AI:", err);
      setErrorMessage(err.message || "Đã xảy ra lỗi khi tạo hình mô phỏng.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = (target: "content" | "solution") => {
    if (!svgContent) return;
    try {
      const base64 = typeof btoa !== "undefined"
        ? btoa(encodeURIComponent(svgContent))
        : Buffer.from(encodeURIComponent(svgContent)).toString("base64");
      const snippet = `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
      onInsertSnippet(target, snippet);
      onClose();
    } catch (e: any) {
      setErrorMessage("Không thể tạo thẻ ảnh: " + (e.message || ""));
    }
  };

  const handleCopySvg = () => {
    if (!svgContent) return;
    navigator.clipboard.writeText(svgContent);
    setCopyStatus("svg");
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleCopyTikz = () => {
    if (!svgContent) return;
    let tikzCode = "";
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, "image/svg+xml");
      const lines: string[] = ["\\begin{tikzpicture}[scale=0.03, >=stealth]"];

      const svgLines = doc.querySelectorAll("line");
      svgLines.forEach(l => {
        const x1 = parseFloat(l.getAttribute("x1") || "0");
        const y1 = parseFloat(l.getAttribute("y1") || "0");
        const x2 = parseFloat(l.getAttribute("x2") || "0");
        const y2 = parseFloat(l.getAttribute("y2") || "0");
        const dash = l.getAttribute("stroke-dasharray");
        lines.push(`  \\draw[${dash ? "dashed, " : ""}thick] (${x1.toFixed(1)}, ${(-y1).toFixed(1)}) -- (${x2.toFixed(1)}, ${(-y2).toFixed(1)});`);
      });

      const svgCircles = doc.querySelectorAll("circle");
      svgCircles.forEach(c => {
        const cx = parseFloat(c.getAttribute("cx") || "0");
        const cy = parseFloat(c.getAttribute("cy") || "0");
        const r = parseFloat(c.getAttribute("r") || "0");
        lines.push(`  \\filldraw (${cx.toFixed(1)}, ${(-cy).toFixed(1)}) circle (${r.toFixed(1)}pt);`);
      });

      const svgTexts = doc.querySelectorAll("text");
      svgTexts.forEach(t => {
        const x = parseFloat(t.getAttribute("x") || "0");
        const y = parseFloat(t.getAttribute("y") || "0");
        const text = (t.textContent || "").trim();
        if (text) {
          lines.push(`  \\node at (${x.toFixed(1)}, ${(-y).toFixed(1)}) {$${text.replace(/\$/g, "")}$};`);
        }
      });

      lines.push("\\end{tikzpicture}");
      tikzCode = lines.join("\n");
    } catch {
      tikzCode = "\\begin{tikzpicture}\n\\node {Hình vẽ minh họa};\n\\end{tikzpicture}";
    }

    navigator.clipboard.writeText(tikzCode);
    setCopyStatus("tikz");
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleDownloadPng = () => {
    if (!svgContent) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svgElement = doc.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = previewTheme === "dark" ? "#090d16" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `Mo_Phong_Toan_Hoc_${questionNumber ? `Cau_${questionNumber}` : "AI"}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mo_Phong_Toan_Hoc_${questionNumber ? `Cau_${questionNumber}` : "AI"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  AI Vẽ Hình Mô Phỏng Toán Học & Thực Tế
                </h3>
                {questionNumber && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
                    Câu {questionNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Tạo hình vẽ vector SVG sắc nét, chuẩn phong cách SGK phẳng (Flat Design) từ nội dung đề bài
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Prompt & Controls (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span>Nội dung đề bài / Mô tả hình vẽ:</span>
                <span className="text-slate-400 font-normal lowercase">{prompt.length} ký tự</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Nhập hoặc dán đề bài toán học cần mô phỏng..."
                rows={5}
                className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-y"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Mẫu đề bài toán thực tế phổ biến:
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(p.prompt);
                      handleGenerate(p.prompt);
                    }}
                    className="p-2 text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 text-[11px] font-medium text-slate-700 transition-colors"
                  >
                    <div className="font-bold text-slate-900 truncate">{p.title}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang vẽ hình mô phỏng...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{svgContent ? "Vẽ lại hình mô phỏng" : "Bắt đầu vẽ mô phỏng AI"}</span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT: SVG Preview & Insert Actions (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Xem trước hình mô phỏng
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTheme(prev => prev === "light" ? "dark" : "light")}
                  className="px-2 py-1 text-[11px] font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Chuyển chế độ nền sáng / tối"
                >
                  {previewTheme === "light" ? <Moon className="w-3.5 h-3.5 text-indigo-500" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{previewTheme === "light" ? "Nền giấy trắng" : "Nền máy chiếu tối"}</span>
                </button>
              </div>
            </div>

            {/* SVG Render Canvas Container */}
            <div
              className={`flex-1 min-h-[300px] max-h-[440px] rounded-xl border flex items-center justify-center p-3 overflow-auto transition-colors ${
                previewTheme === "dark"
                  ? "bg-[#090d16] border-slate-800 text-white"
                  : "bg-white border-slate-300 text-slate-900 shadow-2xs"
              }`}
            >
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center gap-3 text-purple-600 py-12">
                  <div className="w-12 h-12 rounded-full border-3 border-purple-200 border-t-purple-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-600 animate-pulse">
                    Đang thiết kế mô hình vector phẳng, tính góc và tọa độ...
                  </p>
                </div>
              ) : svgContent ? (
                <div
                  className="max-w-full max-h-full flex items-center justify-center svg-simulation-render"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">Chưa có hình mô phỏng nào.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nhập nội dung đề bài ở bên trái và bấm <strong>"Bắt đầu vẽ mô phỏng AI"</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Toolbar under SVG */}
            {svgContent && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Lưu PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSvg}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lưu SVG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySvg}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    {copyStatus === "svg" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copyStatus === "svg" ? "Đã chép SVG" : "Chép SVG"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyTikz}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    {copyStatus === "tikz" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileCode className="w-3.5 h-3.5" />}
                    <span>{copyStatus === "tikz" ? "Đã chép TikZ" : "Chép TikZ"}</span>
                  </button>
                </div>

                {/* Primary Insert Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInsert("content")}
                    className="px-3.5 py-1.5 rounded-lg font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Chèn vào Câu hỏi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsert("solution")}
                    className="px-3 py-1.5 rounded-lg font-bold text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Chèn Lời giải</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
