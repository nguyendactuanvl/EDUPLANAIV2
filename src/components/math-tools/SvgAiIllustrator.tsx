import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Play, Download, Copy, Check, Upload, HelpCircle, Image as ImageIcon, FileText, RefreshCw, Key } from "lucide-react";
import { apiFetch } from "../../lib/apiFetch";

interface PresetItem {
  title: string;
  desc: string;
  prompt: string;
}

const PRESETS: PresetItem[] = [
  {
    title: "Ngọn Hải đăng & Con thuyền",
    desc: "Bài toán tính khoảng cách ngắm từ hải đăng góc hạ 30 độ",
    prompt: "Một người đứng trên đỉnh một ngọn hải đăng cao 80m so với mực nước biển, nhìn thấy một con thuyền đang neo đậu trên biển với một góc hạ (góc xuống) là 30 độ. Hãy tính khoảng cách từ chân ngọn hải đăng đến con thuyền. Vẽ hình minh họa đầy đủ ngọn hải đăng đứng vuông góc mặt nước, con thuyền trên biển, đường tầm mắt, tia nhìn, góc hạ 30 độ, các đỉnh A (đỉnh hải đăng), B (chân hải đăng), C (vị trí con thuyền), khoảng cách 80m và độ dài x cần tìm."
  },
  {
    title: "Bóng của cây cổ thụ",
    desc: "Bài toán bóng nắng chiếu góc 60 độ trên mặt đất",
    prompt: "Một cây cổ thụ đứng thẳng trên mặt đất phẳng. Vào một thời điểm nắng trong ngày, tia nắng mặt trời chiếu xuống mặt đất tạo thành một góc 60 độ so với phương nằm ngang. Người ta đo được bóng của cây trên mặt đất dài 15m. Tính chiều cao h của cây cổ thụ. Vẽ hình minh họa gồm mặt đất nằm ngang, cây cổ thụ xanh mát thẳng đứng, tia nắng mặt trời nét vàng đứt, góc nâng mặt trời 60 độ ở chân bóng, các đỉnh tam giác vuông tương ứng A (ngọn cây), B (gốc cây), C (đầu mút bóng cây), bóng dài 15m và chiều cao h cần tìm."
  },
  {
    title: "Máy bay cất cánh",
    desc: "Bài toán máy bay bay lên góc nâng 25 độ đạt độ cao h",
    prompt: "Một chiếc máy bay cất cánh từ đường băng với một góc nâng ổn định là 25 độ so với phương nằm ngang. Sau khi bay được một quãng đường dài 3000m theo đường bay nghiêng đó, hỏi máy bay đạt độ cao bao nhiêu mét so với mặt đất? Vẽ hình minh họa gồm đường băng nằm ngang, vệt bay nghiêng của máy bay lên góc 25 độ, hình vẽ máy bay nhỏ ở đỉnh, đường cao gióng thẳng đứng biểu diễn độ cao h, tam giác vuông ABC với AB = 3000m (đường nghiêng), góc CAB = 25 độ và đường cao BC = h cần tính."
  },
  {
    title: "Chiều cao Tòa nhà (Trụ anten)",
    desc: "Bài toán đo đạc góc nâng tại hai điểm đứng ngắm khác nhau",
    prompt: "Để đo chiều cao của một tòa nhà mà không thể đến gần chân tòa nhà, người ta đặt máy ngắm tại hai điểm D và C cách nhau 20m trên mặt đất nằm ngang thẳng hàng với chân tòa nhà. Góc nâng nhìn lên đỉnh tòa nhà tại C là 45 độ và tại D là 30 độ. Tính chiều cao h của tòa nhà. Vẽ hình minh họa gồm tòa nhà thẳng đứng (cao h), mặt đất nằm ngang, hai điểm ngắm C và D nằm trên mặt đất cách nhau 20m, các góc nâng tương ứng 45 độ và 30 độ chiếu tới đỉnh A của tòa nhà."
  }
];

export function SvgAiIllustrator() {
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [svgContent, setSvgContent] = useState("");
  const [copySuccess, setCopyStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Set default prompt to first preset
    setPrompt(PRESETS[0].prompt);
  }, []);

  const handleCopySvg = () => {
    if (!svgContent) return;
    navigator.clipboard.writeText(svgContent);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      const fullBase64 = reader.result as string;
      setFileBase64(fullBase64.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileBase64(null);
    setFileMimeType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const SYSTEM_INSTRUCTION = `Bạn là chuyên gia thiết kế đồ họa hình học và minh họa đề Toán học phổ thông.
Nhiệm vụ của bạn là đọc đề bài (qua văn bản hoặc hình ảnh/tài liệu đính kèm) và dựng một hình vẽ mô phỏng vector SVG hoàn chỉnh:
1. Thẩm mỹ & Sư phạm:
   - Sử dụng phong cách thiết kế phẳng (Flat Design) hiện đại, nét vẽ sắc nét, dễ nhìn trên nền tối (#090d16) hoặc nền trong suốt.
   - Thể hiện trực quan đối tượng thực tế (ngọn hải đăng, con thuyền, máy bay, toà nhà, quả đồi, dòng sông...) bằng nét vẽ vector gọn gàng.
   - Mô hình hóa rõ ràng tam giác hình học hoặc hệ trục tương ứng: đường cao, các góc (ví dụ: góc hạ 30°, góc nâng), đường chân trời, nét đứt cho đường đo đạc.
   - Ghi chú đầy đủ tên đỉnh (A, B, C, H...), độ dài (ví dụ: 80m, h = ?), và độ lớn góc bằng thẻ <text> rõ ràng, font sans-serif.
2. Quy chuẩn kỹ thuật:
   - Chỉ trả về duy nhất thẻ <svg ... viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">...</svg>.
   - Không được thêm bất cứ văn bản markdown nào (không bọc trong \`\`\`xml hoặc \`\`\`svg), không kèm lời giải thích nào khác.`;

  const handleGenerate = async () => {
    const targetKey = (localStorage.getItem("eduplan_gemini_api_key_v2") || "").trim();
    if (!targetKey) {
      setErrorMessage("Bạn chưa cấu hình Gemini API Key chung cho ứng dụng. Vui lòng nhấn vào biểu tượng bánh răng 'Cài đặt' ở góc dưới bên trái màn hình (dưới cùng của Sidebar) để nhập API Key của bạn.");
      return;
    }
    if (!prompt.trim() && !fileBase64) {
      setErrorMessage("Vui lòng nhập văn bản đề bài hoặc tải ảnh/PDF đề bài!");
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setSvgContent("");

    try {
      const parts: any[] = [];
      if (prompt.trim()) {
        parts.push({ text: `Đề bài cần vẽ mô phỏng: ${prompt}` });
      }
      if (fileBase64 && fileMimeType) {
        parts.push({
          inline_data: {
            mime_type: fileMimeType,
            data: fileBase64
          }
        });
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${targetKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.15
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Lỗi máy chủ phát sinh khi xử lý API.");
      }

      const data = await response.json();
      let rawSvg = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Cleanup formatting code wrappers
      rawSvg = rawSvg
        .replace(/```xml/gi, "")
        .replace(/```svg/gi, "")
        .replace(/```/g, "")
        .trim();

      if (rawSvg.includes("<svg") && rawSvg.includes("</svg>")) {
        setSvgContent(rawSvg);
      } else {
        throw new Error("Phản hồi trả về không chứa mã định dạng SVG hợp lệ. Hãy thử bấm 'Bắt đầu vẽ' lại!");
      }
    } catch (err: any) {
      console.error("Lỗi vẽ hình AI:", err);
      setErrorMessage(err.message || "Đã xảy ra lỗi không xác định.");
    } finally {
      setIsGenerating(false);
    }
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
      canvas.width = 1200; // Multiplied for high resolution
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw dark professional background
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = "Hinh_Ve_Mo_Phong_Toan_Hoc.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 font-sans">
      {/* Invisible Canvas for Exporting SVG to PNG */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Input Form & Configurations */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Section 1: Model Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                Lựa chọn Mô hình AI (Model)
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-bold">
                Tự động tối ưu
              </span>
            </div>
            
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Khuyên dùng - Nhanh & Chính xác)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Tư duy & Vẽ hình phức tạp)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              (*) Chọn mô hình đồng bộ với Google AI Studio của bạn. Mô hình <strong>Gemini 2.5 Flash</strong> hoặc <strong>Gemini 2.5 Pro</strong> là tiêu chuẩn tốt nhất cho các bài toán phổ thông.
            </p>
          </div>

          {/* Section 2: Presets quick choice */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              Chọn nhanh đề bài mẫu thực tế
            </span>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(preset.prompt);
                    setErrorMessage(null);
                  }}
                  className={`text-left px-3.5 py-2.5 rounded-xl border transition-all text-xs group flex flex-col gap-1 cursor-pointer ${
                    prompt === preset.prompt
                      ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-500/20"
                      : "bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                  }`}
                >
                  <span className="font-bold text-slate-800 group-hover:text-indigo-900">
                    {preset.title}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {preset.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Textarea and File Upload */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1 flex flex-col">
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-500" />
                Văn bản Đề bài Toán học
              </span>
              <textarea
                className="w-full flex-1 min-h-[160px] bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-xs text-slate-700 leading-relaxed focus:outline-none resize-none"
                placeholder="Nhập đề toán học thực tế cần mô phỏng hình học..."
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setErrorMessage(null);
                }}
              />
            </div>

            {/* Drag & Drop Upload */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-500" />
                Tải ảnh đề hoặc PDF scan (Tùy chọn)
              </span>
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition relative bg-slate-50 hover:bg-indigo-50/10">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                />
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <Upload className="w-6 h-6 text-slate-400" />
                  {selectedFile ? (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-emerald-600 truncate max-w-[250px]">{selectedFile.name}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearFile();
                        }}
                        className="text-[10px] text-red-500 hover:text-red-700 font-semibold underline"
                      >
                        Xóa file đính kèm
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      Kéo thả hình chụp đề bài hoặc bấm để chọn tệp tin
                    </span>
                  )}
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-200 text-xs font-medium leading-relaxed">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Launch CTA */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-98 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>AI Đang Phân Tích Đề & Vẽ Hình...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Bắt đầu vẽ hình mô phỏng bằng AI</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Output SVG Render Card */}
        <div className="lg:col-span-7 flex flex-col">
          
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col h-full min-h-[500px]">
            
            {/* Header of Viewport */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-xs font-black text-slate-300 uppercase tracking-widest">
                  Khung Bản Vẽ Vector SVG Kết Quả
                </span>
              </div>

              {svgContent && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySvg}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-850 hover:border-slate-700 transition"
                    title="Sao chép toàn bộ mã SVG"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép mã SVG</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadPng}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-900/60 hover:border-indigo-700 transition"
                    title="Tải ảnh dạng file PNG chất lượng cao"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Lưu ảnh (PNG)</span>
                  </button>
                </div>
              )}
            </div>

            {/* SVG Interactive Area */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#090d16] rounded-2xl border border-slate-900/60 p-6 min-h-[350px]">
              {svgContent ? (
                <div 
                  className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:h-auto [&_svg]:w-auto"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-3 p-8 max-w-sm">
                  {isGenerating ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs text-slate-400 font-medium">
                        Mô hình toán đang được phân tích...
                      </p>
                      <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs">
                        AI đang dựng thực cảnh (hải đăng, cây cối, con thuyền...), vẽ tam giác vuông đo đạc, tạo các cung đo góc, gắn nhãn thông số và tên các đỉnh...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3.5 bg-slate-900/60 rounded-full text-slate-600 border border-slate-850">
                        <Sparkles className="w-8 h-8 text-indigo-400/40" />
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        Hình vẽ minh họa vector phẳng (Flat Design) hiện đại sẽ hiển thị sắc nét tại đây sau khi chạy AI.
                      </p>
                      <p className="text-[10px] text-slate-600 leading-relaxed">
                        Bạn có thể sao chép trực tiếp mã SVG hoặc tải ảnh PNG độ phân giải cực cao về máy để chèn vào Word/PowerPoint!
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
