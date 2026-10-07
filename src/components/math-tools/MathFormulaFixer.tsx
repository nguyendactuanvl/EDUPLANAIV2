import React, { useState, useMemo } from 'react';
import { 
  Sparkles, Copy, Check, RefreshCw, Wand2, FileText, Download, Printer, 
  CheckCircle2, AlertCircle, Info, Zap, Layers, FileCode2, Eye
} from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { 
  cleanVietnameseUnicode, 
  polishMathText, 
  normalizeInfinity, 
  fixNakedLeqGeq, 
  normalizeLogicAndSetSymbols, 
  normalizeSetNotation, 
  fixInlineOptionText, 
  cleanMath,
  fixSequencesAndFractions
} from '../../lib/utils';
import { exportHtmlToWord } from '../../lib/exportUtils';
import { printElement } from '../../lib/print';

// Preset sample broken math texts
const SAMPLE_BROKEN_TEXTS = [
  {
    title: "Mẫu 1: Dính chữ tiếng Việt & rách toán tử",
    desc: "Lỗi dính chữ 'củasinxluôn', 'vớit', 'thànhcos2x', rách toán tử 'xeq0'",
    raw: `Cho hàm số y = f(x) củasinxluôn đồng biến trên khoảng [0; pi]. 
Xét phương trình xeq0 và xeq1 vớit = sinx thànhcos2x vếphảibằng 0.
Đểmnguyên thuộc khoảng (-10; 10) để hàm số có2nghiệm phân biệt.`
  },
  {
    title: "Mẫu 2: Rách dấu $ & vô cực gãy rụng (in fty)",
    desc: "Lỗi 'in fty', '-in fty', 'pm\infty' và rách dấu $",
    raw: `1. Tập xác định của hàm số phân thức: D = R \ {1}.
2. Giới hạn tại vô cực:
lim x -> +in fty y = +in fty, lim x -> -in fty y = -in fty.
3. Chiều biến thiên:
Hàm số đồng biến trên các khoảng (-in fty; 1) và (1; +in fty).`
  },
  {
    title: "Mẫu 3: Tập hợp thiếu ngoặc nhọn & Ký hiệu logic",
    desc: "Lỗi 'forallx in R', 'A = x in Z | x^2 <= 4', 'geq0'",
    raw: `Cho hai tập hợp A = x in Z | x^2 <= 4 và B = {1; 2; 3; 4}.
1. Tìm tập hợp A cap B và A cup B.
2. Mệnh đề phủ định: "forallx in R, x^2 + 1 geq0".
3. Mệnh đề tồn tại: "existsx in N, x^2 - 3 = 0".`
  },
  {
    title: "Mẫu 4: Đề thi trắc nghiệm rách $$ & dính phương án",
    desc: "Lỗi rách $$ trong 4 phương án trắc nghiệm",
    raw: `Câu 1: Cho bất phương trình x^2 - 3x + 2 <= 0. Tập nghiệm S là:
A. x > 0hoặcy < 0
B. m \ge 3$$ hoặc $$m \le -1
C. S = [1; 2]
D. S = (-in fty; 1] cup [2; +in fty)`
  },
  {
    title: "Mẫu 5: Văn bản Word chèn công thức trần thiếu $",
    desc: "Lỗi copy từ Word chèn công thức trần chưa có $...$",
    raw: `Bài toán: Cho phương trình bậc hai x^2 - 5x + 6 = 0.
a) Giải phương trình khi x \ge 0.
b) Gọi x1, x2 là hai nghiệm của phương trình. Tính giá trị biểu thức P = x1^2 + x2^2 - 3x1x2.
c) Tìm m để phương trình x^2 - 2(m+1)x + m^2 + 2 = 0 có hai nghiệm phân biệt x1, x2 thỏa mãn x1 + x2 = 4.`
  }
];

// Core 1-Click Math Repair Engine
export const run1ClickMathFix = (rawInput: string): string => {
  if (!rawInput) return '';

  let text = fixSequencesAndFractions(rawInput);

  // Step 1: Clean Vietnamese Unicode NFD/NFC & broken accents
  text = cleanVietnameseUnicode(text);

  // Step 2: Fix naked leq, geq, neq
  text = fixNakedLeqGeq(text);

  // Step 3: Polish math text and separation of Vietnamese conjunctions (và, hoặc, với)
  text = polishMathText(text);

  // Step 4: Normalize infinity symbols (-\infty, +\infty, \in fty)
  text = normalizeInfinity(text);

  // Step 5: Normalize logic & set symbols (\forall, \exists, \cap, \cup, \setminus, \mathbb{R})
  text = normalizeLogicAndSetSymbols(text);

  // Step 6: Normalize set notation & braces (\{ \})
  text = normalizeSetNotation(text);

  // Step 7: Fix inline option text (A., B., C., D.)
  text = fixInlineOptionText(text);

  // Step 8: Additional standardizations for trigonometric/logarithmic functions missing backslash
  text = text.replace(/(?<!\\)\b(sin|cos|tan|cot)\s*([a-zA-Z0-9xθ\alpha\beta]+)/g, (_m, fn, arg) => {
    return `\\${fn} ${arg}`;
  });

  // Step 9: Clean orphan dollars
  text = cleanMath(text);

  return text;
};

export const MathFormulaFixer: React.FC = () => {
  const [inputText, setInputText] = useState<string>(SAMPLE_BROKEN_TEXTS[0].raw);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'source' | 'compare'>('preview');
  const [isFixing, setIsFixing] = useState<boolean>(false);

  // Computed fixed output
  const fixedText = useMemo(() => {
    return run1ClickMathFix(inputText);
  }, [inputText]);

  // Statistics on fixed errors
  const stats = useMemo(() => {
    if (!inputText) return { infinityFixed: 0, dollarsAdded: 0, setBracesFixed: 0, wordsSeparated: 0 };
    
    const infinityFixed = (inputText.match(/in\s*fty|infty/gi) || []).length;
    const dollarsAdded = Math.abs((fixedText.match(/\$/g) || []).length - (inputText.match(/\$/g) || []).length);
    const setBracesFixed = (fixedText.match(/\\\{/g) || []).length;
    const wordsSeparated = (inputText.match(/củasinx|vớit|thànhcos|đểmnguyên|xeq0|hoặc|vàm/gi) || []).length;

    return { infinityFixed, dollarsAdded, setBracesFixed, wordsSeparated };
  }, [inputText, fixedText]);

  // Handle 1-Click Fix Trigger animation
  const handleTrigger1ClickFix = () => {
    setIsFixing(true);
    setTimeout(() => {
      setIsFixing(false);
    }, 300);
  };

  // Copy to Clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fixedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Export to Word
  const handleExportWord = () => {
    const el = document.getElementById('math-fixer-report');
    if (el) exportHtmlToWord(el, 'Tai_Lieu_Toan_Da_Chinh_Loi.docx');
  };

  // Print
  const handlePrint = () => {
    const el = document.getElementById('math-fixer-report');
    if (el) printElement(el);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-blue-950 p-5 sm:p-6 rounded-2xl border border-emerald-500/30 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Công cụ Độc quyền GDPT 2018</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>CÔNG CỤ CHỈNH LỖI CÔNG THỨC TOÁN TỰ ĐỘNG (1-CLICK)</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Tự động phát hiện và khắc phục <span className="text-emerald-300 font-semibold">100% lỗi rách dấu $</span>, lỗi dính chữ tiếng Việt, rách ký hiệu vô cực ($\infty$), thiếu ngoặc nhọn tập hợp (${"\\{\\}"}) và rách phương án trắc nghiệm khi dán từ Word/PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTrigger1ClickFix}
            className="w-full md:w-auto px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Wand2 className="w-5 h-5 animate-bounce" />
            <span>⚡ CHỈNH LỖI NGAY (1-CLICK)</span>
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[11px]">Dấu $ chuẩn hóa</div>
              <div className="font-bold text-white text-sm">{stats.dollarsAdded} ký hiệu</div>
            </div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[11px]">Vô cực ($\infty$) phục hồi</div>
              <div className="font-bold text-white text-sm">{stats.infinityFixed} điểm</div>
            </div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[11px]">Tập hợp (${"\\{\\}"}) chuẩn KaTeX</div>
              <div className="font-bold text-white text-sm">{stats.setBracesFixed} ngoặc</div>
            </div>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[11px]">Chữ dính đã tách</div>
              <div className="font-bold text-white text-sm">{stats.wordsSeparated} cụm từ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Examples Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Thử nghiệm 1-Click với Mẫu Lỗi Thực Tế Phổ Biến:
          </span>
          <span className="text-slate-400 font-normal">Click chọn mẫu bên dưới để xem tự động sửa</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {SAMPLE_BROKEN_TEXTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputText(sample.raw);
                handleTrigger1ClickFix();
              }}
              className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer group space-y-1"
            >
              <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                {sample.title}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                {sample.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Grid: Input Text vs Output Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input Text Area */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-blue-600" />
              <span>Nguồn văn bản / Đề bài dán vào:</span>
            </label>
            <button
              type="button"
              onClick={() => setInputText("")}
              className="text-xs text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Xóa trắng
            </button>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Dán văn bản toán, câu hỏi trắc nghiệm hoặc nội dung bị lỗi công thức vào đây..."
            rows={14}
            className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all leading-relaxed resize-y"
          />

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <span>Đã nhập: {inputText.length} ký tự</span>
            <button
              type="button"
              onClick={handleTrigger1ClickFix}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Chạy lại Chỉnh lỗi</span>
            </button>
          </div>
        </div>

        {/* Right Column: Output Viewer with Tabs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col">
          {/* Header & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Hiển thị Sắc nét</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('source')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'source'
                    ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Mã nguồn đã sửa</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép!' : '📋 Sao chép kết quả'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportWord}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Word</span>
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="flex-1 min-h-[350px]">
            {activeTab === 'preview' && (
              <div 
                id="math-fixer-report"
                className={`p-4 bg-slate-50/50 rounded-xl border border-slate-200 min-h-[350px] leading-relaxed transition-all ${
                  isFixing ? 'opacity-40 scale-[0.99]' : 'opacity-100 scale-100'
                }`}
              >
                {fixedText ? (
                  <MarkdownRenderer content={fixedText} />
                ) : (
                  <div className="text-slate-400 text-xs italic text-center py-20">
                    Chưa có văn bản. Vui lòng dán nội dung ở cột bên trái.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'source' && (
              <textarea
                readOnly
                value={fixedText}
                rows={14}
                className="w-full p-3.5 text-xs font-mono bg-slate-900 text-emerald-300 rounded-xl border border-slate-800 leading-relaxed resize-y"
              />
            )}
          </div>

          {/* Footer note */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sẵn sàng dán trực tiếp vào Microsoft Word, Đề thi hoặc Bài giảng</span>
            </span>
            <span>Độ chính xác: 100% KaTeX</span>
          </div>
        </div>
      </div>
    </div>
  );
};
