import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  TrendingUp, BarChart2, Plus, Copy, Check, Download, 
  RotateCcw, Sparkles, BookOpen, Layers, X, Eye, 
  ChevronRight, ArrowRight, Compass, ShieldAlert, CheckCircle2,
  FileCode, Image as ImageIcon, Sliders
} from "lucide-react";
import { 
  BBTData, 
  BBTPoint, 
  BBTInterval,
  MOCK_CUBIC_FUNCTION,
  MOCK_RATIONAL_FUNCTION,
  MOCK_RADICAL_FUNCTION 
} from "./VariationTableGenerator";
import { 
  analyzeFunctionToBbt, 
  ensureCompleteBbtPoints, 
  generateBbtSvg, 
  cleanMathText 
} from "../../lib/bbtRenderer";
import { InteractivePlot } from "./InteractivePlot";
import { FunctionPlotData, Point2D, AsymptoteLine } from "./types";
import { MarkdownRenderer } from "../MarkdownRenderer";

export interface QuestionVisualizerPanelProps {
  questionNumber?: number;
  questionContent?: string;
  solutionContent?: string;
  defaultTab?: "bbt" | "graph";
  defaultTarget?: "content" | "solution";
  onInsertSnippet: (target: "content" | "solution", snippet: string) => void;
  onClose: () => void;
}

// Preset library for common high-school functions
const PRESETS = [
  {
    id: "cubic",
    name: "Bậc ba (Chuẩn)",
    formula: "y = x^3 - 3x^2 + 4",
    type: "cubic" as const,
    params: { a: 1, b: -3, c: 0, d: 4 },
    desc: "Cực đại (0; 4), cực tiểu (2; 0), điểm uốn (1; 2)"
  },
  {
    id: "rational1_1",
    name: "Phân thức 1/1",
    formula: "y = \\frac{2x - 1}{x + 1}",
    type: "rational1_1" as const,
    params: { a: 2, b: -1, c: 1, d: 1 },
    desc: "TCĐ: x = -1, TCN: y = 2, tâm đối xứng I(-1; 2)"
  },
  {
    id: "rational2_1",
    name: "Phân thức 2/1",
    formula: "y = \\frac{x^2 - x + 1}{x - 1}",
    type: "rational2_1" as const,
    params: { a: 1, b: -1, c: 1, d: 1, e: -1 },
    desc: "TCĐ: x = 1, TCX: y = x, cực đại và cực tiểu đối xứng qua I"
  },
  {
    id: "quartic",
    name: "Trùng phương",
    formula: "y = x^4 - 2x^2 - 1",
    type: "quartic" as const,
    params: { a: 1, b: -2, c: -1 },
    desc: "3 cực trị: Cực đại (0; -1), cực tiểu (-1; -2) và (1; -2)"
  },
  {
    id: "parabola",
    name: "Parabol (Toán 10)",
    formula: "y = x^2 - 4x + 3",
    type: "parabola" as const,
    params: { a: 1, b: -4, c: 3 },
    desc: "Đỉnh I(2; -1), trục đối xứng x = 2, cắt Ox tại 1 và 3"
  },
  {
    id: "radical",
    name: "Căn thức",
    formula: "y = \\sqrt{4 - x^2}",
    type: "radical" as const,
    params: { a: -1, c: 4 },
    desc: "Tập xác định [-2; 2], đồ thị nửa đường tròn tâm O bán kính 2"
  }
];

// Helper: Try to extract a mathematical formula from question text
function extractFunctionFormula(text?: string): string | null {
  if (!text) return null;
  // Match patterns like y = ..., f(x) = ..., or formulas enclosed in $y = ...$
  const match1 = text.match(/(?:y|f\(x\))\s*=\s*([^,;.\n\$\)]+)/i);
  if (match1 && match1[1].length > 1) {
    return match1[0].trim();
  }
  const match2 = text.match(/\$(y\s*=[^$]+)\$/i);
  if (match2) {
    return match2[1].trim();
  }
  return null;
}

export const QuestionVisualizerPanel: React.FC<QuestionVisualizerPanelProps> = ({
  questionNumber,
  questionContent = "",
  solutionContent = "",
  defaultTab = "bbt",
  defaultTarget = "content",
  onInsertSnippet,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<"bbt" | "graph">(defaultTab);
  const [targetField, setTargetField] = useState<"content" | "solution">(defaultTarget);
  const [insertFormat, setInsertFormat] = useState<"svg" | "table">("svg");

  // Notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // -------------------------------------------------------------
  // BBT MODULE STATE & COMPUTATIONS
  // -------------------------------------------------------------
  const initialFormula = useMemo(() => {
    return extractFunctionFormula(questionContent) || extractFunctionFormula(solutionContent) || "y = x^3 - 3x^2 + 4";
  }, [questionContent, solutionContent]);

  const [bbtInput, setBbtInput] = useState<string>(initialFormula);
  const [bbtData, setBbtData] = useState<BBTData>(() => {
    const analyzed = analyzeFunctionToBbt(initialFormula);
    return analyzed ? ensureCompleteBbtPoints(analyzed) : MOCK_CUBIC_FUNCTION;
  });

  const handleAnalyzeBbt = (expr: string) => {
    const analyzed = analyzeFunctionToBbt(expr);
    if (analyzed && analyzed.points && analyzed.points.length >= 2) {
      setBbtData(ensureCompleteBbtPoints(analyzed));
      showToast("Đã phân tích Bảng biến thiên thành công!");
    } else {
      showToast("Không nhận diện được hàm số, đã dùng mẫu chuẩn.");
    }
  };

  // Live SVG of BBT
  const bbtSvg = useMemo(() => {
    try {
      return generateBbtSvg(bbtData);
    } catch {
      return "";
    }
  }, [bbtData]);

  // Convert BBT to Markdown table format
  const bbtMarkdownTable = useMemo(() => {
    if (!bbtData || !bbtData.points || bbtData.points.length === 0) return "";
    const pts = bbtData.points;
    const inters = bbtData.intervals;

    let rowX = "| $x$ |";
    let rowYPrime = "| $y'$ |";
    let rowY = "| $y$ |";
    let sep = "|---|";

    pts.forEach((pt, i) => {
      rowX += ` $${pt.x}$ |`;
      sep += "---|";
      if (pt.isAsymptote) {
        rowYPrime += " $\\|$ |";
        const leftVal = pt.yLeftVal || "-\\infty";
        const rightVal = pt.yRightVal || "+\\infty";
        rowY += ` $${leftVal} \\| ${rightVal}$ |`;
      } else if (pt.isDerivativeUndefinedOnly) {
        rowYPrime += " $\\|$ |";
        rowY += ` $${pt.yVal || "0"}$ |`;
      } else {
        rowYPrime += ` $${pt.yPrime || "0"}$ |`;
        rowY += ` $${pt.yVal || "0"}$ |`;
      }

      if (i < inters.length) {
        rowX += " |";
        sep += "---|";
        rowYPrime += ` $${inters[i]?.sign || "+"}$ |`;
        const trend = inters[i]?.trend === "decreasing" ? "\\searrow" : "\\nearrow";
        rowY += ` $${trend}$ |`;
      }
    });

    return `\n\n${rowX}\n${sep}\n${rowYPrime}\n${rowY}\n\n`;
  }, [bbtData]);

  // Copy BBT PNG to Clipboard
  const handleCopyBbtPng = async () => {
    if (!bbtSvg) return;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(bbtSvg, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) return;

      const svgW = parseFloat(svgEl.getAttribute("width") || "600");
      const svgH = parseFloat(svgEl.getAttribute("height") || "220");

      const canvas = document.createElement("canvas");
      canvas.width = svgW * 2.5;
      canvas.height = svgH * 2.5;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2.5, 2.5);

      const svgBlob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml;charset=utf-8" });
      const blobURL = window.URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = async () => {
        ctx.drawImage(img, 0, 0);
        window.URL.revokeObjectURL(blobURL);
        canvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            showToast("Đã sao chép ảnh BBT vào Clipboard!");
          }
        }, "image/png");
      };
      img.src = blobURL;
    } catch {
      showToast("Không thể chép ảnh tự động, vui lòng dùng nút Tải ảnh.");
    }
  };

  // Download BBT PNG
  const handleDownloadBbtPng = () => {
    if (!bbtSvg) return;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(bbtSvg, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) return;

      const svgW = parseFloat(svgEl.getAttribute("width") || "600");
      const svgH = parseFloat(svgEl.getAttribute("height") || "220");

      const canvas = document.createElement("canvas");
      canvas.width = svgW * 2.5;
      canvas.height = svgH * 2.5;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2.5, 2.5);

      const svgBlob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml;charset=utf-8" });
      const blobURL = window.URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        window.URL.revokeObjectURL(blobURL);
        const link = document.createElement("a");
        link.download = `Bang_Bien_Thien_Cau_${questionNumber || 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("Đã tải ảnh BBT PNG thành công!");
      };
      img.src = blobURL;
    } catch (e) {
      console.error(e);
    }
  };

  // Copy TikZ code
  const handleCopyBbtTikz = () => {
    const pts = bbtData.points;
    const inters = bbtData.intervals;
    const xList = pts.map(p => cleanMathText(p.x)).join(", ");
    const lineSigns = inters.map((it, i) => `,${it.sign || "+"},0`).join("") + ",";
    const vars = pts.map(p => {
      const sign = p.yPosition === "top" ? "+/" : p.yPosition === "bottom" ? "-/" : "+/";
      return `${sign} ${cleanMathText(p.yVal || "0")}`;
    }).join(", ");

    const tikz = `\\begin{tikzpicture}\n\\tkzTabInit[lgt=1.5,espcl=2.5]{$x$/1, $y'$/1, $y$/2.2}{${xList}}\n\\tkzTabLine{${lineSigns}}\n\\tkzTabVar{${vars}}\n\\end{tikzpicture}`;
    navigator.clipboard.writeText(tikz);
    showToast("Đã sao chép mã TikZ (tkz-tab)!");
  };

  // Insert BBT into Target Field
  const handleInsertBbt = () => {
    let snippet = "";
    if (insertFormat === "svg") {
      const base64 = typeof btoa !== "undefined" 
        ? btoa(encodeURIComponent(bbtSvg)) 
        : Buffer.from(encodeURIComponent(bbtSvg)).toString("base64");
      snippet = `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
    } else {
      snippet = bbtMarkdownTable;
    }

    onInsertSnippet(targetField, snippet);
    showToast(`Đã chèn BBT vào ${targetField === "content" ? "Đề bài câu hỏi" : "Lời giải chi tiết"}!`);
  };

  // -------------------------------------------------------------
  // GRAPHING (ĐỒ THỊ) MODULE STATE & COMPUTATIONS
  // -------------------------------------------------------------
  const [graphType, setGraphType] = useState<"cubic" | "rational1_1" | "rational2_1" | "parabola" | "quartic" | "linear">("cubic");

  // Coefficients
  const [c3A, setC3A] = useState<number>(1);
  const [c3B, setC3B] = useState<number>(-3);
  const [c3C, setC3C] = useState<number>(0);
  const [c3D, setC3D] = useState<number>(4);

  // Rational 1/1: (ax+b)/(cx+d)
  const [r1A, setR1A] = useState<number>(2);
  const [r1B, setR1B] = useState<number>(-1);
  const [r1C, setR1C] = useState<number>(1);
  const [r1D, setR1D] = useState<number>(1);

  // Rational 2/1: (ax^2+bx+c)/(dx+e)
  const [r2A, setR2A] = useState<number>(1);
  const [r2B, setR2B] = useState<number>(-1);
  const [r2C, setR2C] = useState<number>(1);
  const [r2D, setR2D] = useState<number>(1);
  const [r2E, setR2E] = useState<number>(-1);

  // Parabola: ax^2 + bx + c
  const [pA, setPA] = useState<number>(1);
  const [pB, setPB] = useState<number>(-4);
  const [pC, setPC] = useState<number>(3);

  // Quartic: ax^4 + bx^2 + c
  const [qA, setQA] = useState<number>(1);
  const [qB, setQB] = useState<number>(-2);
  const [qC, setQC] = useState<number>(-1);

  // Linear: ax + b
  const [lA, setLA] = useState<number>(2);
  const [lB, setLB] = useState<number>(-3);

  // Computed Graph Data
  const graphAnalysis = useMemo(() => {
    let functions: FunctionPlotData[] = [];
    let points: Point2D[] = [];
    let asymptotes: AsymptoteLine[] = [];
    let formulaLatex = "";
    let keyAnalysisNotes = "";

    if (graphType === "cubic") {
      const a = c3A === 0 ? 1 : c3A;
      const b = c3B;
      const c = c3C;
      const d = c3D;

      formulaLatex = `y = ${a !== 1 ? (a === -1 ? "-" : a) : ""}x^3 ${b !== 0 ? (b > 0 ? `+ ${b === 1 ? "" : b}` : `- ${Math.abs(b) === 1 ? "" : Math.abs(b)}`) + "x^2" : ""} ${c !== 0 ? (c > 0 ? `+ ${c === 1 ? "" : c}` : `- ${Math.abs(c) === 1 ? "" : Math.abs(c)}`) + "x" : ""} ${d !== 0 ? (d > 0 ? `+ ${d}` : `- ${Math.abs(d)}`) : ""}`;

      const fn = (x: number) => a * Math.pow(x, 3) + b * Math.pow(x, 2) + c * x + d;
      functions.push({
        id: "cubic-fn",
        fn,
        color: "#2563eb",
        width: 2.5
      });

      // Inflection point: x = -b / (3a)
      const xI = -b / (3 * a);
      const yI = fn(xI);
      points.push({
        x: Number(xI.toFixed(2)),
        y: Number(yI.toFixed(2)),
        label: `Tâm ĐX I(${Number(xI.toFixed(2))}; ${Number(yI.toFixed(2))})`,
        color: "#9333ea",
        isDashedToAxes: true
      });

      // Extrema: y' = 3ax^2 + 2bx + c = 0
      const aPrime = 3 * a;
      const bPrime = 2 * b;
      const cPrime = c;
      const delta = bPrime * bPrime - 4 * aPrime * cPrime;

      if (delta > 1e-6) {
        const x1 = (-bPrime - Math.sqrt(delta)) / (2 * aPrime);
        const x2 = (-bPrime + Math.sqrt(delta)) / (2 * aPrime);
        const y1 = fn(x1);
        const y2 = fn(x2);

        const isMax1 = a > 0 ? x1 < x2 : x1 > x2;
        points.push(
          {
            x: Number(x1.toFixed(2)),
            y: Number(y1.toFixed(2)),
            label: isMax1 ? `CĐ(${Number(x1.toFixed(2))}; ${Number(y1.toFixed(2))})` : `CT(${Number(x1.toFixed(2))}; ${Number(y1.toFixed(2))})`,
            color: isMax1 ? "#ea580c" : "#0284c7",
            isDashedToAxes: true
          },
          {
            x: Number(x2.toFixed(2)),
            y: Number(y2.toFixed(2)),
            label: isMax1 ? `CT(${Number(x2.toFixed(2))}; ${Number(y2.toFixed(2))})` : `CĐ(${Number(x2.toFixed(2))}; ${Number(y2.toFixed(2))})`,
            color: isMax1 ? "#0284c7" : "#ea580c",
            isDashedToAxes: true
          }
        );
        keyAnalysisNotes = `Hàm bậc ba có 2 điểm cực trị tại $x_1 = ${Number(x1.toFixed(2))}$ và $x_2 = ${Number(x2.toFixed(2))}$. Tâm đối xứng $I(${Number(xI.toFixed(2))}; ${Number(yI.toFixed(2))})$.`;
      } else {
        keyAnalysisNotes = `Hàm bậc ba đơn điệu trên $\\mathbb{R}$ (không có cực trị). Điểm uốn $I(${Number(xI.toFixed(2))}; ${Number(yI.toFixed(2))})$.`;
      }
    } else if (graphType === "rational1_1") {
      const a = r1A;
      const b = r1B;
      const c = r1C === 0 ? 1 : r1C;
      const d = r1D;

      formulaLatex = `y = \\frac{${a}x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}}{${c === 1 ? "" : c}x ${d >= 0 ? `+ ${d}` : `- ${Math.abs(d)}`}}`;
      const xAsym = -d / c;
      const yAsym = a / c;

      functions.push({
        id: "rational1-fn",
        fn: (x) => (a * x + b) / (c * x + d),
        color: "#2563eb",
        width: 2.5,
        discontinuities: [xAsym]
      });

      asymptotes.push(
        {
          type: "vertical",
          value: xAsym,
          label: `TCĐ: x = ${Number(xAsym.toFixed(2))}`,
          color: "#dc2626"
        },
        {
          type: "horizontal",
          value: yAsym,
          label: `TCN: y = ${Number(yAsym.toFixed(2))}`,
          color: "#2563eb"
        }
      );

      points.push({
        x: Number(xAsym.toFixed(2)),
        y: Number(yAsym.toFixed(2)),
        label: `Giao tiệm cận I(${Number(xAsym.toFixed(2))}; ${Number(yAsym.toFixed(2))})`,
        color: "#9333ea",
        isDashedToAxes: true
      });

      const adMinusBc = a * d - b * c;
      keyAnalysisNotes = `Hàm phân thức $1/1$: Tiệm cận đứng $x = ${Number(xAsym.toFixed(2))}$, tiệm cận ngang $y = ${Number(yAsym.toFixed(2))}$. Đạo hàm mang dấu ${adMinusBc > 0 ? "DƯƠNG (+)" : "ÂM (-)"} nên hàm số ${adMinusBc > 0 ? "đồng biến" : "nghịch biến"} trên từng khoảng xác định.`;
    } else if (graphType === "rational2_1") {
      const a = r2A === 0 ? 1 : r2A;
      const b = r2B;
      const c = r2C;
      const d = r2D === 0 ? 1 : r2D;
      const e = r2E;

      formulaLatex = `y = \\frac{${a}x^2 ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}x ${c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`}}{${d === 1 ? "" : d}x ${e >= 0 ? `+ ${e}` : `- ${Math.abs(e)}`}}`;
      const xAsym = -e / d;

      // Tiệm cận xiên: y = mx + n = (a/d)x + (b*d - a*e)/(d^2)
      const mSlant = a / d;
      const nSlant = (b * d - a * e) / (d * d);

      functions.push({
        id: "rational2-fn",
        fn: (x) => (a * x * x + b * x + c) / (d * x + e),
        color: "#2563eb",
        width: 2.5,
        discontinuities: [xAsym]
      });

      asymptotes.push(
        {
          type: "vertical",
          value: xAsym,
          label: `TCĐ: x = ${Number(xAsym.toFixed(2))}`,
          color: "#dc2626"
        },
        {
          type: "slant",
          m: mSlant,
          c: nSlant,
          label: `TCX: y = ${mSlant === 1 ? "" : Number(mSlant.toFixed(2))}x ${nSlant >= 0 ? `+ ${Number(nSlant.toFixed(2))}` : `- ${Number(Math.abs(nSlant).toFixed(2))}`}`,
          color: "#059669"
        }
      );

      const yIntersection = mSlant * xAsym + nSlant;
      points.push({
        x: Number(xAsym.toFixed(2)),
        y: Number(yIntersection.toFixed(2)),
        label: `Tâm ĐX I(${Number(xAsym.toFixed(2))}; ${Number(yIntersection.toFixed(2))})`,
        color: "#9333ea",
        isDashedToAxes: true
      });

      keyAnalysisNotes = `Hàm phân thức $2/1$ (Chuẩn Toán 12 mới): Tiệm cận đứng $x = ${Number(xAsym.toFixed(2))}$, tiệm cận xiên $y = ${mSlant === 1 ? "" : Number(mSlant.toFixed(2))}x ${nSlant >= 0 ? `+ ${Number(nSlant.toFixed(2))}` : `- ${Number(Math.abs(nSlant).toFixed(2))}`}$.`;
    } else if (graphType === "parabola") {
      const a = pA === 0 ? 1 : pA;
      const b = pB;
      const c = pC;

      formulaLatex = `y = ${a !== 1 ? (a === -1 ? "-" : a) : ""}x^2 ${b !== 0 ? (b > 0 ? `+ ${b === 1 ? "" : b}` : `- ${Math.abs(b) === 1 ? "" : Math.abs(b)}`) + "x" : ""} ${c !== 0 ? (c > 0 ? `+ ${c}` : `- ${Math.abs(c)}`) : ""}`;
      const xVertex = -b / (2 * a);
      const yVertex = a * xVertex * xVertex + b * xVertex + c;

      functions.push({
        id: "parabola-fn",
        fn: (x) => a * x * x + b * x + c,
        color: "#2563eb",
        width: 2.5
      });

      points.push({
        x: Number(xVertex.toFixed(2)),
        y: Number(yVertex.toFixed(2)),
        label: `Đỉnh I(${Number(xVertex.toFixed(2))}; ${Number(yVertex.toFixed(2))})`,
        color: "#dc2626",
        isDashedToAxes: true
      });

      asymptotes.push({
        type: "vertical",
        value: xVertex,
        label: `Trục ĐX: x = ${Number(xVertex.toFixed(2))}`,
        color: "#94a3b8"
      });

      keyAnalysisNotes = `Parabol (Toán 10): Đỉnh $I(${Number(xVertex.toFixed(2))}; ${Number(yVertex.toFixed(2))})$, trục đối xứng $x = ${Number(xVertex.toFixed(2))}$, bề lõm quay ${a > 0 ? "lên trên" : "xuống dưới"}.`;
    } else if (graphType === "quartic") {
      const a = qA === 0 ? 1 : qA;
      const b = qB;
      const c = qC;

      formulaLatex = `y = ${a !== 1 ? (a === -1 ? "-" : a) : ""}x^4 ${b !== 0 ? (b > 0 ? `+ ${b === 1 ? "" : b}` : `- ${Math.abs(b) === 1 ? "" : Math.abs(b)}`) + "x^2" : ""} ${c !== 0 ? (c > 0 ? `+ ${c}` : `- ${Math.abs(c)}`) : ""}`;

      functions.push({
        id: "quartic-fn",
        fn: (x) => a * Math.pow(x, 4) + b * Math.pow(x, 2) + c,
        color: "#2563eb",
        width: 2.5
      });

      points.push({
        x: 0,
        y: c,
        label: `Cực trị Oy(0; ${c})`,
        color: "#ea580c",
        isDashedToAxes: true
      });

      if (-b / (2 * a) > 0) {
        const xExtremum = Math.sqrt(-b / (2 * a));
        const yExtremum = a * Math.pow(xExtremum, 4) + b * Math.pow(xExtremum, 2) + c;
        points.push(
          {
            x: Number((-xExtremum).toFixed(2)),
            y: Number(yExtremum.toFixed(2)),
            label: `(${Number((-xExtremum).toFixed(2))}; ${Number(yExtremum.toFixed(2))})`,
            color: "#0284c7",
            isDashedToAxes: true
          },
          {
            x: Number(xExtremum.toFixed(2)),
            y: Number(yExtremum.toFixed(2)),
            label: `(${Number(xExtremum.toFixed(2))}; ${Number(yExtremum.toFixed(2))})`,
            color: "#0284c7",
            isDashedToAxes: true
          }
        );
        keyAnalysisNotes = `Hàm trùng phương có 3 cực trị đối xứng qua trục tung $Oy$.`;
      } else {
        keyAnalysisNotes = `Hàm trùng phương có đúng 1 cực trị tại $x = 0$.`;
      }
    } else {
      // Linear
      const a = lA;
      const b = lB;
      formulaLatex = `y = ${a}x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}`;
      functions.push({
        id: "linear-fn",
        fn: (x) => a * x + b,
        color: "#2563eb",
        width: 2.5
      });
      points.push({
        x: 0,
        y: b,
        label: `Oy(0; ${b})`,
        color: "#dc2626",
        isDashedToAxes: true
      });
      keyAnalysisNotes = `Đường thẳng có hệ số góc $k = ${a}$, cắt trục tung tại $(0; ${b})$.`;
    }

    return { functions, points, asymptotes, formulaLatex, keyAnalysisNotes };
  }, [graphType, c3A, c3B, c3C, c3D, r1A, r1B, r1C, r1D, r2A, r2B, r2C, r2D, r2E, pA, pB, pC, qA, qB, qC, lA, lB]);

  // Insert Graph into Target Field
  const handleInsertGraph = (dataUrl: string) => {
    const snippet = `\n\n<img src="${dataUrl}" alt="Đồ thị hàm số" class="max-w-[480px] mx-auto my-2 rounded-lg border border-slate-200" />\n\n`;
    onInsertSnippet(targetField, snippet);
    showToast(`Đã chèn Đồ thị vào ${targetField === "content" ? "Đề bài câu hỏi" : "Lời giải chi tiết"}!`);
  };

  return (
    <div className="bg-slate-50 rounded-2xl border-2 border-blue-400 p-4 shadow-lg my-3 animate-in fade-in zoom-in-95 duration-150">
      
      {/* Toast popup */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-2xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Tích hợp Bảng biến thiên (BBT) & Đồ thị
              </h3>
              {questionNumber && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Câu {questionNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Công cụ chuẩn SGK GDPT mới: Tinh chỉnh thông số và chèn trực tiếp vào đề bài hoặc lời giải
            </p>
          </div>
        </div>

        {/* Tab switchers & Target Field Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Target: Chèn vào Đề bài hay Lời giải */}
          <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 text-xs shadow-2xs">
            <span className="px-2 text-slate-500 font-medium">Chèn vào:</span>
            <button
              type="button"
              onClick={() => setTargetField("content")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                targetField === "content"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📝 Đề bài
            </button>
            <button
              type="button"
              onClick={() => setTargetField("solution")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                targetField === "solution"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💡 Lời giải
            </button>
          </div>

          {/* Module Switcher Tab */}
          <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("bbt")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === "bbt"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Bảng biến thiên</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("graph")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === "graph"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Đồ thị hàm số</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
            title="Đóng bảng công cụ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BẢNG BIẾN THIÊN (BBT) */}
      {/* ======================================================== */}
      {activeTab === "bbt" && (
        <div className="mt-4 space-y-4">
          
          {/* Quick Preset Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Mẫu hàm số chuẩn:</span>
            </span>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setBbtInput(preset.formula);
                  handleAnalyzeBbt(preset.formula);
                }}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg transition-colors shadow-2xs cursor-pointer font-medium"
                title={preset.desc}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Formula input and auto analyze button */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Công thức hàm số (hỗ trợ phân thức, căn thức, bậc 3, bậc 4, parabol):
              </label>
              <input
                type="text"
                value={bbtInput}
                onChange={(e) => setBbtInput(e.target.value)}
                placeholder="VD: y = x^3 - 3x^2 + 4 hoặc y = (2x-1)/(x+1)"
                className="w-full text-xs font-mono font-semibold px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <button
              type="button"
              onClick={() => handleAnalyzeBbt(bbtInput)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors self-end cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Phân tích & Vẽ BBT</span>
            </button>
          </div>

          {/* Live Vector SVG Preview */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Xem trước Bảng biến thiên (Vector SVG chuẩn SGK):</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px]">Định dạng chèn:</span>
                <select
                  value={insertFormat}
                  onChange={(e) => setInsertFormat(e.target.value as any)}
                  className="text-[11px] font-bold bg-slate-100 border border-slate-200 rounded px-2 py-0.5"
                >
                  <option value="svg">SVG Vector sắc nét (Đẹp nhất)</option>
                  <option value="table">Bảng Markdown (Dễ sửa chữ)</option>
                </select>
              </div>
            </div>

            {/* BBT Render output */}
            <div className="w-full overflow-x-auto flex justify-center py-2 bg-white rounded-lg border border-slate-100">
              {bbtSvg ? (
                <div dangerouslySetInnerHTML={{ __html: bbtSvg }} />
              ) : (
                <div className="text-sm text-slate-400 py-6">Đang chuẩn bị Bảng biến thiên...</div>
              )}
            </div>

            {/* Action Bar for BBT */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyBbtPng}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Sao chép ảnh BBT vào bộ nhớ đệm để dán vào Word, PowerPoint"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Chép ảnh PNG</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBbtPng}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Tải ảnh PNG độ nét cao (300 DPI)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải ảnh PNG</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyBbtTikz}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Sao chép mã TikZ LaTeX"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Chép mã TikZ</span>
                </button>
              </div>

              {/* Main Insert button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsertBbt}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-200" />
                  <span>
                    Chèn BBT vào {targetField === "content" ? "Đề bài" : "Lời giải"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ĐỒ THỊ HÀM SỐ (KSHS INTERACTIVE) */}
      {/* ======================================================== */}
      {activeTab === "graph" && (
        <div className="mt-4 space-y-4">
          
          {/* Function Type Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Chọn dạng hàm số:</span>
              </span>
              <button
                type="button"
                onClick={() => setGraphType("cubic")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  graphType === "cubic" ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Hàm bậc 3
              </button>
              <button
                type="button"
                onClick={() => setGraphType("rational1_1")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  graphType === "rational1_1" ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Phân thức 1/1
              </button>
              <button
                type="button"
                onClick={() => setGraphType("rational2_1")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  graphType === "rational2_1" ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Phân thức 2/1 (Mới)
              </button>
              <button
                type="button"
                onClick={() => setGraphType("parabola")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  graphType === "parabola" ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Parabol (Lớp 10)
              </button>
              <button
                type="button"
                onClick={() => setGraphType("quartic")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  graphType === "quartic" ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Trùng phương
              </button>
              <button
                type="button"
                onClick={() => setGraphType("linear")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  graphType === "linear" ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Đường thẳng
              </button>
            </div>
          </div>

          {/* Coefficients editor */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Hệ số hàm số:</span>
              </span>
              <span className="font-mono font-bold text-blue-700 text-sm">
                ${graphAnalysis.formulaLatex}$
              </span>
            </div>

            {/* Inputs based on graphType */}
            <div className="flex items-center gap-3 flex-wrap text-xs pt-1">
              {graphType === "cubic" && (
                <>
                  <label className="flex items-center gap-1 font-semibold">
                    a: <input type="number" step="0.5" value={c3A} onChange={e=>setC3A(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    b: <input type="number" step="0.5" value={c3B} onChange={e=>setC3B(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    c: <input type="number" step="0.5" value={c3C} onChange={e=>setC3C(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    d: <input type="number" step="0.5" value={c3D} onChange={e=>setC3D(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                </>
              )}

              {graphType === "rational1_1" && (
                <>
                  <label className="flex items-center gap-1 font-semibold">
                    a: <input type="number" step="0.5" value={r1A} onChange={e=>setR1A(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    b: <input type="number" step="0.5" value={r1B} onChange={e=>setR1B(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    c: <input type="number" step="0.5" value={r1C} onChange={e=>setR1C(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    d: <input type="number" step="0.5" value={r1D} onChange={e=>setR1D(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                </>
              )}

              {graphType === "rational2_1" && (
                <>
                  <label className="flex items-center gap-1 font-semibold">
                    a: <input type="number" step="0.5" value={r2A} onChange={e=>setR2A(Number(e.target.value))} className="w-14 px-1.5 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    b: <input type="number" step="0.5" value={r2B} onChange={e=>setR2B(Number(e.target.value))} className="w-14 px-1.5 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    c: <input type="number" step="0.5" value={r2C} onChange={e=>setR2C(Number(e.target.value))} className="w-14 px-1.5 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    d: <input type="number" step="0.5" value={r2D} onChange={e=>setR2D(Number(e.target.value))} className="w-14 px-1.5 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    e: <input type="number" step="0.5" value={r2E} onChange={e=>setR2E(Number(e.target.value))} className="w-14 px-1.5 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                </>
              )}

              {graphType === "parabola" && (
                <>
                  <label className="flex items-center gap-1 font-semibold">
                    a: <input type="number" step="0.5" value={pA} onChange={e=>setPA(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    b: <input type="number" step="0.5" value={pB} onChange={e=>setPB(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    c: <input type="number" step="0.5" value={pC} onChange={e=>setPC(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                </>
              )}

              {graphType === "quartic" && (
                <>
                  <label className="flex items-center gap-1 font-semibold">
                    a: <input type="number" step="0.5" value={qA} onChange={e=>setQA(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    b: <input type="number" step="0.5" value={qB} onChange={e=>setQB(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    c: <input type="number" step="0.5" value={qC} onChange={e=>setQC(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                </>
              )}

              {graphType === "linear" && (
                <>
                  <label className="flex items-center gap-1 font-semibold">
                    a: <input type="number" step="0.5" value={lA} onChange={e=>setLA(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    b: <input type="number" step="0.5" value={lB} onChange={e=>setLB(Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                </>
              )}
            </div>

            {/* Analysis Landmark details */}
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
              <MarkdownRenderer inline={true} content={graphAnalysis.keyAnalysisNotes} />
            </div>
          </div>

          {/* Interactive Plot Viewport */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <InteractivePlot
              title={`Đồ thị hàm số: $${graphAnalysis.formulaLatex}$`}
              subtitle="Kéo chuột để di chuyển hệ trục, lăn chuột để phóng to / thu nhỏ"
              functions={graphAnalysis.functions}
              points={graphAnalysis.points}
              asymptotes={graphAnalysis.asymptotes}
              height={380}
              onInsertImage={handleInsertGraph}
              insertButtonLabel={`Chèn vào ${targetField === "content" ? "Đề bài" : "Lời giải"}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
