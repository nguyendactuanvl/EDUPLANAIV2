import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  TrendingUp, BarChart2, Plus, Copy, Check, Download, 
  RotateCcw, Sparkles, BookOpen, Layers, X, Eye, 
  ChevronRight, ArrowRight, Compass, ShieldAlert, CheckCircle2,
  FileCode, Image as ImageIcon, Sliders, Box, BarChart3, Calculator, Table
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
import { Geometry3DViewer } from "./Geometry3DViewer";
import { FunctionPlotData, Point2D, AsymptoteLine, InequalityConstraint, PolygonVertex } from "./types";
import { MarkdownRenderer } from "../MarkdownRenderer";

export interface QuestionVisualizerPanelProps {
  questionNumber?: number;
  questionContent?: string;
  solutionContent?: string;
  defaultTab?: "bbt" | "graph" | "geometry3d" | "statistics";
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
  const [activeTab, setActiveTab] = useState<"bbt" | "graph" | "geometry3d" | "statistics">(defaultTab);
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
  const [graphType, setGraphType] = useState<"cubic" | "rational1_1" | "rational2_1" | "parabola" | "quartic" | "linear" | "exp_log" | "single_ineq" | "system_ineq">("cubic");

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

  // Exp & Log: y = a^x or y = log_a(x) (Toán 11)
  const [expLogKind, setExpLogKind] = useState<"exp" | "log">("exp");
  const [baseA, setBaseA] = useState<number>(2);

  // Single Inequality: ax + by + c <= 0 (Toán 10)
  const [sA, setSA] = useState<number>(2);
  const [sB, setSB] = useState<number>(1);
  const [sC, setSC] = useState<number>(-4);
  const [sOp, setSOp] = useState<"<=" | ">=" | "<" | ">">("<=");

  // System of Inequalities & Polygon: (Toán 10)
  const [systemIneqs, setSystemIneqs] = useState<InequalityConstraint[]>([
    { id: "1", a: 1, b: 0, c: 0, operator: ">=", color: "#0f172a" },
    { id: "2", a: 0, b: 1, c: 0, operator: ">=", color: "#0f172a" },
    { id: "3", a: 1, b: 2, c: -10, operator: "<=", color: "#2563eb" },
    { id: "4", a: 3, b: 1, c: -15, operator: "<=", color: "#dc2626" }
  ]);
  const [fA, setFA] = useState<number>(4);
  const [fB, setFB] = useState<number>(3);
  const [fC, setFC] = useState<number>(0);

  // Computed Graph Data
  const graphAnalysis = useMemo(() => {
    let functions: FunctionPlotData[] = [];
    let points: Point2D[] = [];
    let asymptotes: AsymptoteLine[] = [];
    let inequalities: InequalityConstraint[] = [];
    let feasiblePolygon: PolygonVertex[] = [];
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
    } else if (graphType === "linear") {
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
    } else if (graphType === "exp_log") {
      const a = baseA <= 0 || baseA === 1 ? 2 : baseA;
      const isIncreasing = a > 1;

      if (expLogKind === "exp") {
        formulaLatex = `y = ${a}^x`;
        functions.push({
          id: "exp-fn",
          fn: (x) => Math.pow(a, x),
          color: "#2563eb",
          width: 2.5
        });
        points.push(
          { x: 0, y: 1, label: "A(0; 1)", color: "#dc2626", isDashedToAxes: true },
          { x: 1, y: Number(a.toFixed(2)), label: `B(1; ${Number(a.toFixed(2))})`, color: "#16a34a", isDashedToAxes: true }
        );
        asymptotes.push({
          type: "horizontal",
          value: 0,
          label: "TCN: y = 0 (trục Ox)",
          color: "#9333ea"
        });
        keyAnalysisNotes = `Hàm số mũ $y = ${a}^x$: TXĐ $D = \\mathbb{R}$, luôn qua điểm $(0; 1)$, nhận trục hoành $Ox$ ($y = 0$) làm tiệm cận ngang. Hàm số ${isIncreasing ? "đồng biến" : "nghịch biến"}.`;
      } else {
        formulaLatex = `y = \\log_{${a}}(x)`;
        functions.push({
          id: "log-fn",
          fn: (x) => (x > 1e-6 ? Math.log(x) / Math.log(a) : NaN),
          color: "#059669",
          width: 2.5,
          discontinuities: [0]
        });
        points.push(
          { x: 1, y: 0, label: "A(1; 0)", color: "#dc2626", isDashedToAxes: true },
          { x: Number(a.toFixed(2)), y: 1, label: `B(${Number(a.toFixed(2))}; 1)`, color: "#2563eb", isDashedToAxes: true }
        );
        asymptotes.push({
          type: "vertical",
          value: 0,
          label: "TCĐ: x = 0 (trục Oy)",
          color: "#9333ea"
        });
        keyAnalysisNotes = `Hàm số logarit $y = \\log_{${a}}(x)$: TXĐ $D = (0; +\\infty)$, luôn qua điểm $(1; 0)$, nhận trục tung $Oy$ ($x = 0$) làm tiệm cận đứng. Hàm số ${isIncreasing ? "đồng biến" : "nghịch biến"}.`;
      }
    } else if (graphType === "single_ineq") {
      inequalities.push({
        id: "single",
        a: sA,
        b: sB,
        c: sC,
        operator: sOp,
        color: "#2563eb"
      });
      const opSymbol = sOp === "<=" ? "\\le" : sOp === ">=" ? "\\ge" : sOp;
      formulaLatex = `${sA}x ${sB >= 0 ? `+ ${sB}` : `- ${Math.abs(sB)}`}y ${sC >= 0 ? `+ ${sC}` : `- ${Math.abs(sC)}`} ${opSymbol} 0`;

      // Test point (0, 0)
      const testPt = sC !== 0 ? { x: 0, y: 0 } : { x: 1, y: 0 };
      const valAtTest = sA * testPt.x + sB * testPt.y + sC;
      let satisfies = false;
      if (sOp === "<=") satisfies = valAtTest <= 0;
      else if (sOp === ">=") satisfies = valAtTest >= 0;
      else if (sOp === "<") satisfies = valAtTest < 0;
      else if (sOp === ">") satisfies = valAtTest > 0;

      points.push({
        x: testPt.x,
        y: testPt.y,
        label: `O(${testPt.x}; ${testPt.y}) ${satisfies ? "∈ Miền nghiệm" : "∉ Miền nghiệm"}`,
        color: satisfies ? "#16a34a" : "#dc2626"
      });

      keyAnalysisNotes = `Bất phương trình $${formulaLatex}$: Miền nghiệm là nửa mặt phẳng ${sOp.includes("=") ? "kể cả" : "không kể"} bờ $d: ${sA}x + ${sB}y + ${sC} = 0$, ${satisfies ? "chứa" : "không chứa"} điểm thử $O(${testPt.x}; ${testPt.y})$.`;
    } else if (graphType === "system_ineq") {
      inequalities = [...systemIneqs];

      // Find intersection candidates
      const candidates: { x: number; y: number }[] = [];
      for (let i = 0; i < systemIneqs.length; i++) {
        for (let j = i + 1; j < systemIneqs.length; j++) {
          const l1 = systemIneqs[i];
          const l2 = systemIneqs[j];
          const det = l1.a * l2.b - l2.a * l1.b;
          if (Math.abs(det) > 1e-6) {
            const x = (-l1.c * l2.b - -l2.c * l1.b) / det;
            const y = (l1.a * -l2.c - l2.a * -l1.c) / det;
            const satisfiesAll = systemIneqs.every(ineq => {
              const val = ineq.a * x + ineq.b * y + ineq.c;
              if (ineq.operator === "<=") return val <= 1e-5;
              if (ineq.operator === ">=") return val >= -1e-5;
              if (ineq.operator === "<") return val < 1e-5;
              if (ineq.operator === ">") return val > -1e-5;
              return false;
            });
            if (satisfiesAll) {
              const isDuplicate = candidates.some(pt => Math.hypot(pt.x - x, pt.y - y) < 1e-4);
              if (!isDuplicate) {
                candidates.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
              }
            }
          }
        }
      }

      // Sort counter-clockwise
      if (candidates.length >= 3) {
        const cX = candidates.reduce((s, p) => s + p.x, 0) / candidates.length;
        const cY = candidates.reduce((s, p) => s + p.y, 0) / candidates.length;
        candidates.sort((p1, p2) => Math.atan2(p1.y - cY, p1.x - cX) - Math.atan2(p2.y - cY, p2.x - cX));
      }

      let maxVal = -Infinity;
      let minVal = Infinity;
      let maxPt = "";
      let minPt = "";

      feasiblePolygon = candidates.map((pt, idx) => {
        const label = String.fromCharCode(65 + idx);
        const fVal = Number((fA * pt.x + fB * pt.y + fC).toFixed(2));
        if (fVal > maxVal) { maxVal = fVal; maxPt = `${label}(${pt.x}; ${pt.y})`; }
        if (fVal < minVal) { minVal = fVal; minPt = `${label}(${pt.x}; ${pt.y})`; }
        return { x: pt.x, y: pt.y, label, fValue: fVal };
      });

      feasiblePolygon.forEach(v => {
        if (v.fValue === maxVal) v.isOptimalMax = true;
        if (v.fValue === minVal) v.isOptimalMin = true;
        points.push({
          x: v.x,
          y: v.y,
          label: `${v.label}(${v.x}; ${v.y})`,
          color: v.isOptimalMax ? "#ea580c" : v.isOptimalMin ? "#16a34a" : "#2563eb",
          isDashedToAxes: true
        });
      });

      formulaLatex = `F(x, y) = ${fA}x + ${fB}y ${fC !== 0 ? (fC > 0 ? `+ ${fC}` : `- ${Math.abs(fC)}`) : ""}`;
      keyAnalysisNotes = `Miền nghiệm của hệ là đa giác có ${feasiblePolygon.length} đỉnh: ${feasiblePolygon.map(v => `${v.label}(${v.x}; ${v.y})`).join(", ")}. Biểu thức $${formulaLatex}$ đạt GTLN $= ${maxVal}$ tại $${maxPt}$, GTNN $= ${minVal}$ tại $${minPt}$.`;
    }

    return { functions, points, asymptotes, inequalities, feasiblePolygon, formulaLatex, keyAnalysisNotes };
  }, [graphType, c3A, c3B, c3C, c3D, r1A, r1B, r1C, r1D, r2A, r2B, r2C, r2D, r2E, pA, pB, pC, qA, qB, qC, lA, lB, expLogKind, baseA, sA, sB, sC, sOp, systemIneqs, fA, fB, fC]);

  // Insert Graph into Target Field
  const handleInsertGraph = (dataUrl: string) => {
    const snippet = `\n\n<div class="my-3 text-center"><img src="${dataUrl}" alt="Đồ thị hàm số" class="max-w-[480px] mx-auto my-2 rounded-lg border border-slate-200" /></div>\n\n`;
    onInsertSnippet(targetField, snippet);
    showToast(`Đã chèn Đồ thị vào ${targetField === "content" ? "Đề bài câu hỏi" : "Lời giải chi tiết"}!`);
  };

  // Insert 3D Geometry into Target Field
  const handleInsertGeometry3D = (dataUrl: string) => {
    const snippet = `\n\n<div class="my-3 text-center"><img src="${dataUrl}" alt="Hình học không gian" class="max-w-[420px] max-h-72 mx-auto rounded-lg shadow-sm border border-slate-200" /></div>\n\n`;
    onInsertSnippet(targetField, snippet);
    showToast(`Đã chèn Hình học không gian vào ${targetField === "content" ? "Đề bài câu hỏi" : "Lời giải chi tiết"}!`);
  };

  // -------------------------------------------------------------
  // STATISTICS MODULE STATE & COMPUTATIONS
  // -------------------------------------------------------------
  const [statType, setStatType] = useState<"grouped" | "ungrouped">("grouped");
  const [statRawInput, setStatRawInput] = useState<string>("7, 8, 9, 6, 8, 7, 10, 8, 9, 7, 8, 6, 5, 8, 9, 7, 8, 10, 9, 8");
  const [statGroupedRows, setStatGroupedRows] = useState<Array<{ start: number; end: number; freq: number }>>([
    { start: 20, end: 40, freq: 5 },
    { start: 40, end: 60, freq: 12 },
    { start: 60, end: 80, freq: 18 },
    { start: 80, end: 100, freq: 10 },
    { start: 100, end: 120, freq: 5 }
  ]);

  const statAnalysis = useMemo(() => {
    if (statType === "ungrouped") {
      const numbers = statRawInput
        .split(/[\s,;\t\n]+/)
        .map(t => parseFloat(t.replace(",", ".")))
        .filter(n => !isNaN(n) && isFinite(n));

      const n = numbers.length;
      if (n === 0) return null;
      const sorted = [...numbers].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const median = n % 2 === 1 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
      const range = sorted[n - 1] - sorted[0];

      // Frequency map
      const freqMap = new Map<number, number>();
      sorted.forEach(num => freqMap.set(num, (freqMap.get(num) || 0) + 1));
      const freqItems = Array.from(freqMap.entries()).sort((a, b) => a[0] - b[0]);

      // SVG Bar Chart
      const svgW = 520;
      const svgH = 240;
      const padL = 40;
      const padB = 35;
      const padT = 20;
      const padR = 20;
      const maxF = Math.max(...freqItems.map(f => f[1]), 1);
      const usableW = svgW - padL - padR;
      const barSlot = usableW / freqItems.length;
      const barW = Math.max(16, Math.min(36, barSlot * 0.65));

      const bars = freqItems.map(([val, freq], idx) => {
        const x = padL + idx * barSlot + (barSlot - barW) / 2;
        const barH = (freq / maxF) * (svgH - padB - padT);
        const y = svgH - padB - barH;
        return { val, freq, x, y, barH, barW };
      });

      return {
        type: "ungrouped" as const,
        n,
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        range,
        freqItems,
        svgW,
        svgH,
        padL,
        padB,
        padT,
        padR,
        maxF,
        bars
      };
    } else {
      // Grouped
      const totalN = statGroupedRows.reduce((acc, r) => acc + (r.freq || 0), 0);
      if (totalN === 0) return null;

      let sumFx = 0;
      const groups = statGroupedRows.map(r => {
        const rep = (r.start + r.end) / 2;
        sumFx += rep * r.freq;
        return { ...r, rep };
      });

      const mean = sumFx / totalN;

      // SVG Histogram
      const svgW = 520;
      const svgH = 240;
      const padL = 40;
      const padB = 35;
      const padT = 20;
      const padR = 20;
      const maxF = Math.max(...groups.map(g => g.freq), 1);
      const histW = (svgW - padL - padR) / groups.length;

      const bars = groups.map((g, idx) => {
        const x = padL + idx * histW;
        const barH = (g.freq / maxF) * (svgH - padB - padT);
        const y = svgH - padB - barH;
        return { ...g, x, y, barH, histW };
      });

      return {
        type: "grouped" as const,
        totalN,
        mean: Number(mean.toFixed(2)),
        groups,
        svgW,
        svgH,
        padL,
        padB,
        padT,
        padR,
        maxF,
        bars
      };
    }
  }, [statType, statRawInput, statGroupedRows]);

  const handleInsertStatTable = () => {
    if (!statAnalysis) return;
    let snippet = "";
    if (statAnalysis.type === "ungrouped") {
      snippet = `\n\n| Giá trị ($x$) | ${statAnalysis.freqItems.map(f => `$${f[0]}$`).join(' | ')} |\n|---|${statAnalysis.freqItems.map(() => '---').join('|')}|\n| Tần số ($n$) | ${statAnalysis.freqItems.map(f => `${f[1]}`).join(' | ')} |\n\n*Số lượng mẫu: $N = ${statAnalysis.n}$, Số trung bình: $\\bar{x} = ${statAnalysis.mean}$, Trung vị: $M_e = ${statAnalysis.median}$*\n\n`;
    } else {
      snippet = `\n\n| Nhóm số liệu | ${statAnalysis.groups.map(g => `$[${g.start}; ${g.end})$`).join(' | ')} |\n|---|${statAnalysis.groups.map(() => '---').join('|')}|\n| Giá trị đại diện ($c_i$) | ${statAnalysis.groups.map(g => `$${g.rep}$`).join(' | ')} |\n| Tần số ($m_i$) | ${statAnalysis.groups.map(g => `${g.freq}`).join(' | ')} |\n\n*Tổng số phần tử: $N = ${statAnalysis.totalN}$, Số trung bình ghép nhóm: $\\bar{x} = ${statAnalysis.mean}$*\n\n`;
    }
    onInsertSnippet(targetField, snippet);
    showToast(`Đã chèn Bảng Thống kê vào ${targetField === "content" ? "Đề bài" : "Lời giải"}!`);
  };

  const handleInsertStatChart = () => {
    if (!statAnalysis) return;
    const svgEl = document.getElementById("stat-chart-svg");
    if (!svgEl) {
      showToast("Không tìm thấy đồ họa biểu đồ.");
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const base64 = btoa(unescape(encodeURIComponent(svgData)));
    const snippet = `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
    onInsertSnippet(targetField, snippet);
    showToast(`Đã chèn Biểu đồ Thống kê vào ${targetField === "content" ? "Đề bài" : "Lời giải"}!`);
  };

  const handleInsertAllStat = () => {
    handleInsertStatTable();
    handleInsertStatChart();
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
          <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 text-xs shadow-2xs flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("bbt")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "graph"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Đồ thị 2D & KSHS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("geometry3d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "geometry3d"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Hình không gian (3D)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("statistics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "statistics"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Biểu đồ Thống kê</span>
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
                  className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="Sao chép mã TikZ LaTeX (tkz-tab) Bảng biến thiên"
                >
                  <Copy className="w-3.5 h-3.5 text-purple-600" />
                  <span>Copy TikZ</span>
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
              <button
                type="button"
                onClick={() => setGraphType("exp_log")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  graphType === "exp_log" ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Mũ & Logarit (Lớp 11)
              </button>
              <button
                type="button"
                onClick={() => setGraphType("single_ineq")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  graphType === "single_ineq" ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Miền nghiệm BPT (Lớp 10)
              </button>
              <button
                type="button"
                onClick={() => setGraphType("system_ineq")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  graphType === "system_ineq" ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Hệ BPT & Đa giác (Lớp 10)
              </button>
            </div>
          </div>

          {/* Coefficients editor */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Hệ số & Tham số mô hình:</span>
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

              {graphType === "exp_log" && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setExpLogKind("exp")}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${expLogKind === "exp" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600"}`}
                    >
                      Hàm Mũ ($y = a^x$)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpLogKind("log")}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${expLogKind === "log" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600"}`}
                    >
                      Hàm Logarit ($y = \log_a x$)
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 font-semibold">
                    Cơ số a (&gt; 0, ≠ 1):
                    <input type="number" min="0.1" step="0.5" value={baseA} onChange={e=>setBaseA(Number(e.target.value))} className="w-18 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                </div>
              )}

              {graphType === "single_ineq" && (
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-1 font-semibold">
                    a: <input type="number" step="1" value={sA} onChange={e=>setSA(Number(e.target.value))} className="w-14 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    b: <input type="number" step="1" value={sB} onChange={e=>setSB(Number(e.target.value))} className="w-14 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1 font-semibold">
                    c: <input type="number" step="1" value={sC} onChange={e=>setSC(Number(e.target.value))} className="w-14 px-2 py-1 border border-slate-300 rounded font-mono" />
                  </label>
                  <label className="flex items-center gap-1.5 font-semibold">
                    Dấu BPT:
                    <select
                      value={sOp}
                      onChange={e=>setSOp(e.target.value as any)}
                      className="px-2 py-1 border border-slate-300 rounded font-bold bg-white"
                    >
                      <option value="<=">≤</option>
                      <option value=">=">≥</option>
                      <option value="<">&lt;</option>
                      <option value=">">&gt;</option>
                    </select>
                  </label>
                </div>
              )}

              {graphType === "system_ineq" && (
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-3 flex-wrap text-slate-700">
                    <span className="font-bold">Biểu thức mục tiêu $F(x, y) = Ax + By + C$:</span>
                    <label className="flex items-center gap-1 font-semibold">
                      A: <input type="number" step="1" value={fA} onChange={e=>setFA(Number(e.target.value))} className="w-14 px-2 py-0.5 border border-slate-300 rounded font-mono" />
                    </label>
                    <label className="flex items-center gap-1 font-semibold">
                      B: <input type="number" step="1" value={fB} onChange={e=>setFB(Number(e.target.value))} className="w-14 px-2 py-0.5 border border-slate-300 rounded font-mono" />
                    </label>
                    <label className="flex items-center gap-1 font-semibold">
                      C: <input type="number" step="1" value={fC} onChange={e=>setFC(Number(e.target.value))} className="w-14 px-2 py-0.5 border border-slate-300 rounded font-mono" />
                    </label>
                  </div>
                </div>
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
              title={`Đồ thị: $${graphAnalysis.formulaLatex}$`}
              subtitle="Kéo chuột để di chuyển hệ trục, lăn chuột để phóng to / thu nhỏ"
              functions={graphAnalysis.functions}
              points={graphAnalysis.points}
              asymptotes={graphAnalysis.asymptotes}
              inequalities={graphAnalysis.inequalities}
              feasiblePolygon={graphAnalysis.feasiblePolygon}
              height={380}
              onInsertImage={handleInsertGraph}
              insertButtonLabel={`Chèn vào ${targetField === "content" ? "Đề bài" : "Lời giải"}`}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: HÌNH HỌC KHÔNG GIAN (3D GEOMETRY) */}
      {/* ======================================================== */}
      {activeTab === "geometry3d" && (
        <div className="mt-4 space-y-4">
          <Geometry3DViewer
            onInsertImage={handleInsertGeometry3D}
            insertButtonLabel={`Chèn vào ${targetField === "content" ? "Đề bài câu hỏi" : "Lời giải chi tiết"}`}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: BIỂU ĐỒ & BẢNG THỐNG KÊ (STATISTICS) */}
      {/* ======================================================== */}
      {activeTab === "statistics" && (
        <div className="mt-4 space-y-4">
          {/* Mode switch */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Dạng thống kê:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStatType("grouped")}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    statType === "grouped" ? "bg-white text-amber-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Mẫu ghép nhóm (Toán 11 - 12)
                </button>
                <button
                  type="button"
                  onClick={() => setStatType("ungrouped")}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    statType === "ungrouped" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Mẫu số liệu rời rạc (Toán 10)
                </button>
              </div>
            </div>

            {/* Quick Insert Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInsertStatTable}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Chèn bảng số liệu Markdown"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Chèn Bảng</span>
              </button>
              <button
                type="button"
                onClick={handleInsertStatChart}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Chèn biểu đồ dạng SVG vector"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Chèn Biểu đồ SVG</span>
              </button>
              <button
                type="button"
                onClick={handleInsertAllStat}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                title="Chèn cả bảng số liệu và biểu đồ vào tài liệu"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Chèn Toàn bộ vào {targetField === "content" ? "Đề bài" : "Lời giải"}</span>
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Mẫu thực tế có sẵn:</span>
            </span>
            {statType === "grouped" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStatGroupedRows([
                      { start: 20, end: 40, freq: 5 },
                      { start: 40, end: 60, freq: 12 },
                      { start: 60, end: 80, freq: 18 },
                      { start: 80, end: 100, freq: 10 },
                      { start: 100, end: 120, freq: 5 }
                    ]);
                  }}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-700 cursor-pointer shadow-2xs"
                >
                  Thời gian tự học (5 nhóm)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatGroupedRows([
                      { start: 40, end: 45, freq: 3 },
                      { start: 45, end: 50, freq: 8 },
                      { start: 50, end: 55, freq: 15 },
                      { start: 55, end: 60, freq: 9 },
                      { start: 60, end: 65, freq: 4 },
                      { start: 65, end: 70, freq: 1 }
                    ]);
                  }}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-700 cursor-pointer shadow-2xs"
                >
                  Cân nặng 40 học sinh (6 nhóm)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatGroupedRows([
                      { start: 4, end: 5, freq: 3 },
                      { start: 5, end: 6, freq: 6 },
                      { start: 6, end: 7, freq: 14 },
                      { start: 7, end: 8, freq: 16 },
                      { start: 8, end: 9, freq: 8 },
                      { start: 9, end: 10, freq: 3 }
                    ]);
                  }}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-700 cursor-pointer shadow-2xs"
                >
                  Điểm thi THPT Quốc gia (6 nhóm)
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStatRawInput("7, 8, 9, 6, 8, 7, 10, 8, 9, 7, 8, 6, 5, 8, 9, 7, 8, 10, 9, 8")}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 cursor-pointer shadow-2xs"
                >
                  Điểm 20 học sinh
                </button>
                <button
                  type="button"
                  onClick={() => setStatRawInput("155, 160, 162, 158, 165, 170, 168, 172, 165, 163, 167, 159, 162, 175, 164")}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 cursor-pointer shadow-2xs"
                >
                  Chiều cao (cm)
                </button>
              </>
            )}
          </div>

          {/* Data input & computed metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-amber-600" />
                <span>Dữ liệu số liệu đầu vào:</span>
              </h4>

              {statType === "ungrouped" ? (
                <div>
                  <textarea
                    rows={4}
                    value={statRawInput}
                    onChange={e => setStatRawInput(e.target.value)}
                    className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    placeholder="Nhập các số cách nhau bởi dấu phẩy hoặc khoảng trắng..."
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Ví dụ: 7, 8, 9, 6, 8, 7, 10, 8, 9, 7</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div className="grid grid-cols-7 gap-1 text-[11px] font-bold text-slate-600 px-1">
                    <span className="col-span-4">Khoảng $[a; b)$</span>
                    <span className="col-span-2">Tần số ($m$)</span>
                    <span></span>
                  </div>
                  {statGroupedRows.map((r, idx) => (
                    <div key={idx} className="grid grid-cols-7 gap-1 items-center">
                      <div className="col-span-4 flex items-center gap-1">
                        <span className="text-slate-400 text-xs">[</span>
                        <input
                          type="number"
                          value={r.start}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setStatGroupedRows(prev => prev.map((row, i) => i === idx ? { ...row, start: val } : row));
                          }}
                          className="w-12 px-1.5 py-0.5 border border-slate-300 rounded text-xs text-center"
                        />
                        <span className="text-slate-400 text-xs">;</span>
                        <input
                          type="number"
                          value={r.end}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setStatGroupedRows(prev => prev.map((row, i) => i === idx ? { ...row, end: val } : row));
                          }}
                          className="w-12 px-1.5 py-0.5 border border-slate-300 rounded text-xs text-center"
                        />
                        <span className="text-slate-400 text-xs">)</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={r.freq}
                        onChange={e => {
                          const val = Math.max(0, Number(e.target.value));
                          setStatGroupedRows(prev => prev.map((row, i) => i === idx ? { ...row, freq: val } : row));
                        }}
                        className="col-span-2 px-1.5 py-0.5 border border-slate-300 rounded text-xs text-center font-bold text-amber-700"
                      />
                      <button
                        type="button"
                        onClick={() => setStatGroupedRows(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500 text-xs cursor-pointer"
                        title="Xóa nhóm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const last = statGroupedRows[statGroupedRows.length - 1];
                      const step = last ? last.end - last.start : 20;
                      const nextStart = last ? last.end : 0;
                      setStatGroupedRows(prev => [...prev, { start: nextStart, end: nextStart + step, freq: 5 }]);
                    }}
                    className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    + Thêm nhóm tiếp theo
                  </button>
                </div>
              )}

              {/* Statistical Summary Info */}
              {statAnalysis && (
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kích thước mẫu ($N$):</span>
                    <span className="font-bold font-mono">{statAnalysis.type === "ungrouped" ? statAnalysis.n : statAnalysis.totalN}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{"Số trung bình ($\\bar{x}$):"}</span>
                    <span className="font-bold text-amber-700 font-mono">{statAnalysis.mean}</span>
                  </div>
                  {statAnalysis.type === "ungrouped" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Trung vị ($M_e$):</span>
                        <span className="font-bold font-mono">{statAnalysis.median}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Khoảng biến thiên ($R$):</span>
                        <span className="font-bold font-mono">{statAnalysis.range}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* SVG Visualizer Chart */}
            <div className="lg:col-span-7 bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between">
              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                <span>Biểu đồ {statType === "grouped" ? "Histogram tần số ghép nhóm" : "cột tần số mẫu rời rạc"} (Chuẩn SGK):</span>
              </h4>

              {statAnalysis ? (
                <div className="w-full overflow-x-auto flex justify-center py-1">
                  <svg
                    id="stat-chart-svg"
                    width={statAnalysis.svgW}
                    height={statAnalysis.svgH}
                    viewBox={`0 0 ${statAnalysis.svgW} ${statAnalysis.svgH}`}
                    className="max-w-full h-auto bg-white rounded border border-slate-100 shadow-2xs"
                  >
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75, 1.0].map((ratio, rIdx) => {
                      const yPos = statAnalysis.svgH - statAnalysis.padB - ratio * (statAnalysis.svgH - statAnalysis.padB - statAnalysis.padT);
                      const fVal = Math.round(ratio * statAnalysis.maxF);
                      return (
                        <g key={rIdx}>
                          <line x1={statAnalysis.padL} y1={yPos} x2={statAnalysis.svgW - statAnalysis.padR} y2={yPos} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                          <text x={statAnalysis.padL - 6} y={yPos + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="sans-serif">{fVal}</text>
                        </g>
                      );
                    })}

                    {/* Axes */}
                    <line x1={statAnalysis.padL} y1={statAnalysis.padT} x2={statAnalysis.padL} y2={statAnalysis.svgH - statAnalysis.padB} stroke="#334155" strokeWidth="1.5" />
                    <line x1={statAnalysis.padL} y1={statAnalysis.svgH - statAnalysis.padB} x2={statAnalysis.svgW - statAnalysis.padR} y2={statAnalysis.svgH - statAnalysis.padB} stroke="#334155" strokeWidth="1.5" />

                    {/* Axis Labels */}
                    <text x={statAnalysis.padL} y={statAnalysis.padT - 6} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#334155" fontFamily="'Times New Roman', serif">m</text>
                    <text x={statAnalysis.svgW - statAnalysis.padR + 10} y={statAnalysis.svgH - statAnalysis.padB + 4} textAnchor="start" fontSize="11" fontWeight="bold" fill="#334155" fontFamily="'Times New Roman', serif">x</text>

                    {/* Bars */}
                    {statAnalysis.type === "ungrouped" ? (
                      statAnalysis.bars.map((b, idx) => (
                        <g key={idx}>
                          <rect x={b.x} y={b.y} width={b.barW} height={b.barH} fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1" rx="2" />
                          <text x={b.x + b.barW / 2} y={b.y - 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e40af">{b.freq}</text>
                          <text x={b.x + b.barW / 2} y={statAnalysis.svgH - statAnalysis.padB + 14} textAnchor="middle" fontSize="11" fill="#334155" fontFamily="'Times New Roman', serif">{b.val}</text>
                        </g>
                      ))
                    ) : (
                      statAnalysis.bars.map((b, idx) => (
                        <g key={idx}>
                          <rect x={b.x} y={b.y} width={b.histW} height={b.barH} fill="#f59e0b" fillOpacity="0.85" stroke="#b45309" strokeWidth="1.2" />
                          <text x={b.x + b.histW / 2} y={b.y - 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#b45309">{b.freq}</text>
                          <text x={b.x} y={statAnalysis.svgH - statAnalysis.padB + 14} textAnchor="middle" fontSize="10" fill="#475569" fontFamily="sans-serif">{b.start}</text>
                          {idx === statAnalysis.bars.length - 1 && (
                            <text x={b.x + b.histW} y={statAnalysis.svgH - statAnalysis.padB + 14} textAnchor="middle" fontSize="10" fill="#475569" fontFamily="sans-serif">{b.end}</text>
                          )}
                        </g>
                      ))
                    )}
                  </svg>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                  Vui lòng nhập dữ liệu hợp lệ để hiển thị biểu đồ
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
