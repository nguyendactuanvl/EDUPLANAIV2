import React, { useState, useMemo, useEffect } from "react";
import { InteractivePlot } from "./InteractivePlot";
import { Geometry3DViewer } from "./Geometry3DViewer";
import { VariationTable, VariationTablePoint, VariationInterval } from "./VariationTable";
import { MarkdownRenderer, MathSpan } from "../MarkdownRenderer";
import { MathView } from "../MathView";
import { FunctionPlotData, Point2D, AsymptoteLine, Shape3DType } from "./types";
import { Sparkles, Box, Info, CheckCircle2, Copy, Check, RefreshCw } from "lucide-react";

export const Grade11Graphing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"trig" | "exp_log" | "geometry_3d">("trig");

  // ==========================================
  // 1. TRIGNOMETRIC FUNCTIONS (HÀM SỐ LƯỢNG GIÁC)
  // ==========================================
  const [trigFn, setTrigFn] = useState<"sin" | "cos" | "tan" | "cot">("sin");
  const [trigA, setTrigA] = useState<number>(1);
  const [trigB, setTrigB] = useState<number>(1);
  const [trigC, setTrigC] = useState<number>(0); // in radians
  const [trigD, setTrigD] = useState<number>(0);
  const [copiedTikz, setCopiedTikz] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).MathJax) {
      if ((window as any).MathJax.typesetPromise) {
        (window as any).MathJax.typesetPromise().catch(() => {});
      }
    }
  }, [trigFn, trigA, trigB, trigC, trigD, activeTab]);

  // Radian helper string
  const formatRadVal = (val: number): string => {
    if (Math.abs(val) < 1e-4) return "0";
    const ratio = val / Math.PI;

    for (let q = 1; q <= 12; q++) {
      const p = Math.round(ratio * q);
      if (Math.abs(ratio - p / q) < 1e-3) {
        if (p === 0) return "0";
        const sign = p < 0 ? "-" : "";
        const absP = Math.abs(p);
        if (q === 1) {
          return absP === 1 ? `${sign}\\pi` : `${sign}${absP}\\pi`;
        }
        const numStr = absP === 1 ? "\\pi" : `${absP}\\pi`;
        return `${sign}\\frac{${numStr}}{${q}}`;
      }
    }
    return `${Number(val.toFixed(2))}`;
  };

  // Mathematical analysis of Trigonometric function
  const trigAnalysis = useMemo(() => {
    const A = trigA === 0 ? 1 : trigA;
    const B = trigB === 0 ? 1 : trigB;
    const C = trigC;
    const D = trigD;

    // Period T
    const period = (trigFn === "sin" || trigFn === "cos") 
      ? (2 * Math.PI) / Math.abs(B) 
      : Math.PI / Math.abs(B);

    const periodStr = (trigFn === "sin" || trigFn === "cos")
      ? (Math.abs(B) === 1 ? "2\\pi" : `\\frac{2\\pi}{${Math.abs(B)}}`)
      : (Math.abs(B) === 1 ? "\\pi" : `\\frac{\\pi}{${Math.abs(B)}}`);

    // Formula LaTeX string
    let aStr = A === 1 ? "" : A === -1 ? "-" : `${A}`;
    let bStr = B === 1 ? "x" : B === -1 ? "-x" : `${B}x`;
    let cStr = C === 0 ? "" : C > 0 ? ` + ${formatRadVal(C)}` : ` - ${formatRadVal(Math.abs(C))}`;
    let dStr = D === 0 ? "" : D > 0 ? ` + ${D}` : ` - ${Math.abs(D)}`;
    let innerStr = `${bStr}${cStr}`;
    let formulaLatex = `y = ${aStr}\\${trigFn}\\left(${innerStr}\\right)${dStr}`;

    // Plot function definition
    let fnPlot: FunctionPlotData;
    let points: Point2D[] = [];
    let asymptotes: AsymptoteLine[] = [];
    let bbtPoints: VariationTablePoint[] = [];
    let bbtIntervals: VariationInterval[] = [];

    const evalFn = (x: number) => {
      const arg = B * x + C;
      if (trigFn === "sin") return A * Math.sin(arg) + D;
      if (trigFn === "cos") return A * Math.cos(arg) + D;
      if (trigFn === "tan") {
        const cosVal = Math.cos(arg);
        if (Math.abs(cosVal) < 1e-3) return NaN;
        return A * Math.tan(arg) + D;
      }
      // cot
      const sinVal = Math.sin(arg);
      if (Math.abs(sinVal) < 1e-3) return NaN;
      return A * (Math.cos(arg) / Math.sin(arg)) + D;
    };

    fnPlot = {
      id: `trig_${trigFn}`,
      fn: evalFn,
      color: trigFn === "sin" ? "#2563eb" : trigFn === "cos" ? "#059669" : trigFn === "tan" ? "#9333ea" : "#d97706",
      width: 2.5
    };

    // Calculate key points & asymptotes over range [-2pi, 2pi]
    if (trigFn === "sin") {
      // Peaks, Troughs, Intercepts
      const x0 = -C / B;
      const xPeak = (Math.PI / 2 - C) / B;
      const xTrough = (-Math.PI / 2 - C) / B;
      points = [
        { x: Number(x0.toFixed(2)), y: D, label: `(${formatRadVal(x0)}; ${D})`, color: "#2563eb", isDashedToAxes: true },
        { x: Number(xPeak.toFixed(2)), y: Number((D + A).toFixed(2)), label: `Max(${formatRadVal(xPeak)}; ${Number((D + A).toFixed(2))})`, color: "#dc2626", isDashedToAxes: true },
        { x: Number(xTrough.toFixed(2)), y: Number((D - A).toFixed(2)), label: `Min(${formatRadVal(xTrough)}; ${Number((D - A).toFixed(2))})`, color: "#16a34a", isDashedToAxes: true }
      ];

      // BBT over 1 period (2 dòng x, y theo chuẩn SGK Lớp 11 - không chèn điểm trung gian không phải cực trị)
      bbtPoints = [
        { x: formatRadVal((-C)/B), yVal: `${D}`, yPosition: "middle" },
        { x: formatRadVal((Math.PI/2 - C)/B), yVal: `${D + A}`, yPosition: A > 0 ? "top" : "bottom" },
        { x: formatRadVal((3*Math.PI/2 - C)/B), yVal: `${D - A}`, yPosition: A > 0 ? "bottom" : "top" },
        { x: formatRadVal((2*Math.PI - C)/B), yVal: `${D}`, yPosition: "middle" }
      ];
      bbtIntervals = [
        { trend: A > 0 ? "increasing" : "decreasing" },
        { trend: A > 0 ? "decreasing" : "increasing" },
        { trend: A > 0 ? "increasing" : "decreasing" }
      ];
    } else if (trigFn === "cos") {
      const xPeak = -C / B;
      const x0 = (Math.PI / 2 - C) / B;
      const xTrough = (Math.PI - C) / B;
      points = [
        { x: Number(xPeak.toFixed(2)), y: Number((D + A).toFixed(2)), label: `Max(${formatRadVal(xPeak)}; ${Number((D + A).toFixed(2))})`, color: "#dc2626", isDashedToAxes: true },
        { x: Number(x0.toFixed(2)), y: D, label: `(${formatRadVal(x0)}; ${D})`, color: "#059669", isDashedToAxes: true },
        { x: Number(xTrough.toFixed(2)), y: Number((D - A).toFixed(2)), label: `Min(${formatRadVal(xTrough)}; ${Number((D - A).toFixed(2))})`, color: "#16a34a", isDashedToAxes: true }
      ];

      bbtPoints = [
        { x: formatRadVal((-C)/B), yVal: `${D + A}`, yPosition: A > 0 ? "top" : "bottom" },
        { x: formatRadVal((Math.PI - C)/B), yVal: `${D - A}`, yPosition: A > 0 ? "bottom" : "top" },
        { x: formatRadVal((2*Math.PI - C)/B), yVal: `${D + A}`, yPosition: A > 0 ? "top" : "bottom" }
      ];
      bbtIntervals = [
        { trend: A > 0 ? "decreasing" : "increasing" },
        { trend: A > 0 ? "increasing" : "decreasing" }
      ];
    } else if (trigFn === "tan") {
      // Asymptotes: Bx + C = pi/2 + k*pi -> x = (pi/2 - C)/B + k*(pi/B)
      const kVals = [-2, -1, 0, 1, 2];
      asymptotes = kVals.map((k) => {
        const xAsym = (Math.PI / 2 + k * Math.PI - C) / B;
        return {
          type: "vertical",
          value: Number(xAsym.toFixed(2)),
          label: `TCĐ: x = ${formatRadVal(xAsym)}`,
          color: "#dc2626"
        };
      });

      const x0 = -C / B;
      points = [
        { x: Number(x0.toFixed(2)), y: D, label: `U0(${formatRadVal(x0)}; ${D})`, color: "#9333ea", isDashedToAxes: true }
      ];

      bbtPoints = [
        { x: formatRadVal((-Math.PI/2 - C)/B), isDiscontinuity: true, yRightVal: A > 0 ? "-\\infty" : "+\\infty" },
        { x: formatRadVal((-C)/B), yVal: `${D}`, yPosition: "middle" },
        { x: formatRadVal((Math.PI/2 - C)/B), isDiscontinuity: true, yLeftVal: A > 0 ? "+\\infty" : "-\\infty" }
      ];
      bbtIntervals = [
        { trend: A > 0 ? "increasing" : "decreasing" },
        { trend: A > 0 ? "increasing" : "decreasing" }
      ];
    } else {
      // cot: Asymptotes Bx + C = k*pi -> x = (k*pi - C)/B
      const kVals = [-2, -1, 0, 1, 2];
      asymptotes = kVals.map((k) => {
        const xAsym = (k * Math.PI - C) / B;
        return {
          type: "vertical",
          value: Number(xAsym.toFixed(2)),
          label: `TCĐ: x = ${formatRadVal(xAsym)}`,
          color: "#dc2626"
        };
      });

      const x0 = (Math.PI / 2 - C) / B;
      points = [
        { x: Number(x0.toFixed(2)), y: D, label: `U0(${formatRadVal(x0)}; ${D})`, color: "#d97706", isDashedToAxes: true }
      ];

      bbtPoints = [
        { x: formatRadVal((-C)/B), isDiscontinuity: true, yRightVal: A > 0 ? "+\\infty" : "-\\infty" },
        { x: formatRadVal((Math.PI/2 - C)/B), yVal: `${D}`, yPosition: "middle" },
        { x: formatRadVal((Math.PI - C)/B), isDiscontinuity: true, yLeftVal: A > 0 ? "-\\infty" : "+\\infty" }
      ];
      bbtIntervals = [
        { trend: A > 0 ? "decreasing" : "increasing" },
        { trend: A > 0 ? "decreasing" : "increasing" }
      ];
    }

    // Domain D
    let domainStr = "\\mathcal{D} = \\mathbb{R}";
    if (trigFn === "tan") {
      domainStr = `\\mathcal{D} = \\mathbb{R} \\setminus \\left\\{ ${formatRadVal((Math.PI / 2 - C) / B)} + k${periodStr}, k \\in \\mathbb{Z} \\right\\}`;
    } else if (trigFn === "cot") {
      domainStr = `\\mathcal{D} = \\mathbb{R} \\setminus \\left\\{ ${formatRadVal((-C) / B)} + k${periodStr}, k \\in \\mathbb{Z} \\right\\}`;
    }

    // Range T
    let rangeStr = "T = \\mathbb{R}";
    let minMaxStr = "Không có GTLN và GTNN trên \\mathbb{R}.";
    if (trigFn === "sin" || trigFn === "cos") {
      const minVal = D - Math.abs(A);
      const maxVal = D + Math.abs(A);
      rangeStr = `T = [${minVal}; ${maxVal}]`;
      minMaxStr = `y_{\\max} = ${maxVal}, \\quad y_{\\min} = ${minVal}`;
    }

    // Symmetry
    let symmetryStr = "Không chẵn không lẻ";
    if (C === 0 && D === 0) {
      if (trigFn === "cos") {
        symmetryStr = "Hàm số **chẵn** (đồ thị đối xứng qua trục tung $Oy$)";
      } else {
        symmetryStr = "Hàm số **lẻ** (đồ thị đối xứng qua gốc tọa độ $O$)";
      }
    }

    // Monotonicity / Variation string
    const formatKPeriod = (val: number, pStr: string): string => {
      if (Math.abs(val) < 1e-4) return `k${pStr}`;
      const rStr = formatRadVal(val);
      return `${rStr} + k${pStr}`;
    };

    let variationStr = "";
    if (trigFn === "sin") {
      const xInc1 = (-Math.PI / 2 - C) / B;
      const xInc2 = (Math.PI / 2 - C) / B;
      const xDec1 = (Math.PI / 2 - C) / B;
      const xDec2 = (3 * Math.PI / 2 - C) / B;
      if (A > 0) {
        variationStr = `Đồng biến trên mỗi khoảng $\\left(${formatKPeriod(xInc1, periodStr)}; ${formatKPeriod(xInc2, periodStr)}\\right), k \\in \\mathbb{Z}$; Nghịch biến trên mỗi khoảng $\\left(${formatKPeriod(xDec1, periodStr)}; ${formatKPeriod(xDec2, periodStr)}\\right), k \\in \\mathbb{Z}$`;
      } else {
        variationStr = `Nghịch biến trên mỗi khoảng $\\left(${formatKPeriod(xInc1, periodStr)}; ${formatKPeriod(xInc2, periodStr)}\\right), k \\in \\mathbb{Z}$; Đồng biến trên mỗi khoảng $\\left(${formatKPeriod(xDec1, periodStr)}; ${formatKPeriod(xDec2, periodStr)}\\right), k \\in \\mathbb{Z}$`;
      }
    } else if (trigFn === "cos") {
      const xDec1 = -C / B;
      const xDec2 = (Math.PI - C) / B;
      const xInc1 = (Math.PI - C) / B;
      const xInc2 = (2 * Math.PI - C) / B;
      if (A > 0) {
        variationStr = `Đồng biến trên mỗi khoảng $\\left(${formatKPeriod(xInc1, periodStr)}; ${formatKPeriod(xInc2, periodStr)}\\right), k \\in \\mathbb{Z}$; Nghịch biến trên mỗi khoảng $\\left(${formatKPeriod(xDec1, periodStr)}; ${formatKPeriod(xDec2, periodStr)}\\right), k \\in \\mathbb{Z}$`;
      } else {
        variationStr = `Nghịch biến trên mỗi khoảng $\\left(${formatKPeriod(xInc1, periodStr)}; ${formatKPeriod(xInc2, periodStr)}\\right), k \\in \\mathbb{Z}$; Đồng biến trên mỗi khoảng $\\left(${formatKPeriod(xDec1, periodStr)}; ${formatKPeriod(xDec2, periodStr)}\\right), k \\in \\mathbb{Z}$`;
      }
    } else if (trigFn === "tan") {
      const xInc1 = (-Math.PI / 2 - C) / B;
      const xInc2 = (Math.PI / 2 - C) / B;
      if (A > 0) {
        variationStr = `Đồng biến trên mỗi khoảng $\\left(${formatKPeriod(xInc1, periodStr)}; ${formatKPeriod(xInc2, periodStr)}\\right), k \\in \\mathbb{Z}$`;
      } else {
        variationStr = `Nghịch biến trên mỗi khoảng $\\left(${formatKPeriod(xInc1, periodStr)}; ${formatKPeriod(xInc2, periodStr)}\\right), k \\in \\mathbb{Z}$`;
      }
    } else {
      const xDec1 = -C / B;
      const xDec2 = (Math.PI - C) / B;
      if (A > 0) {
        variationStr = `Nghịch biến trên mỗi khoảng $\\left(${formatKPeriod(xDec1, periodStr)}; ${formatKPeriod(xDec2, periodStr)}\\right), k \\in \\mathbb{Z}$`;
      } else {
        variationStr = `Đồng biến trên mỗi khoảng $\\left(${formatKPeriod(xDec1, periodStr)}; ${formatKPeriod(xDec2, periodStr)}\\right), k \\in \\mathbb{Z}$`;
      }
    }

    return {
      A, B, C, D, periodStr, formulaLatex, fnPlot, points, asymptotes,
      bbtPoints, bbtIntervals, domainStr, rangeStr, minMaxStr, symmetryStr, variationStr
    };
  }, [trigFn, trigA, trigB, trigC, trigD]);

  // Generate TikZ LaTeX code
  const handleCopyTikz = () => {
    const mathFnName = trigFn === "sin" ? "sin" : trigFn === "cos" ? "cos" : trigFn === "tan" ? "tan" : "cot";
    const tikzCode = `% Mã TikZ PGFPlots đồ thị ${trigAnalysis.formulaLatex} (SGK Lớp 11)
\\begin{tikzpicture}[scale=0.9]
  \\begin{axis}[
    axis lines=middle,
    xlabel={$x$},
    ylabel={$y$},
    xmin=-6.5, xmax=6.5,
    ymin=-3.5, ymax=3.5,
    trig format=rad,
    grid=both,
    grid style={line width=.1pt, draw=gray!20},
    major grid style={line width=.2pt, draw=gray!40},
    xtick={-6.283, -4.712, -3.1415, -1.5707, 0, 1.5707, 3.1415, 4.712, 6.283},
    xticklabels={$-2\\pi$, $-\\frac{3\\pi}{2}$, $-\\pi$, $-\\frac{\\pi}{2}$, $0$, $\\frac{\\pi}{2}$, $\\pi$, $\\frac{3\\pi}{2}$, $2\\pi$},
    tick label style={font=\\tiny},
    enlargelimits=false
  ]
    \\addplot[domain=-2*pi:2*pi, samples=250, color=blue, thick] {${trigA}*${mathFnName}(${trigB}*x + ${trigC}) + ${trigD}};
  \\end{axis}
\\end{tikzpicture}`;

    navigator.clipboard.writeText(tikzCode);
    setCopiedTikz(true);
    setTimeout(() => setCopiedTikz(false), 2000);
  };

  // ==========================================
  // 2. EXPONENTIAL & LOGARITHMIC FUNCTIONS
  // ==========================================
  const [funcType, setFuncType] = useState<"exp" | "log">("exp");
  const [baseA, setBaseA] = useState<number>(2);

  const expLogAnalysis = useMemo(() => {
    const a = baseA <= 0 || baseA === 1 ? 2 : baseA;
    const isIncreasing = a > 1;

    let fnPlot: FunctionPlotData;
    let points: Point2D[] = [];
    let asymptotes: AsymptoteLine[] = [];
    let bbtPoints: VariationTablePoint[] = [];
    let bbtIntervals: VariationInterval[] = [];

    if (funcType === "exp") {
      fnPlot = {
        id: "exp",
        fn: (x) => Math.pow(a, x),
        color: "#2563eb",
        width: 2.5
      };

      points = [
        { x: 0, y: 1, label: "A(0; 1)", color: "#dc2626", isDashedToAxes: true },
        { x: 1, y: Number(a.toFixed(2)), label: `B(1; ${Number(a.toFixed(2))})`, color: "#16a34a", isDashedToAxes: true }
      ];

      asymptotes = [
        {
          type: "horizontal",
          value: 0,
          label: "Tiệm cận ngang: y = 0 (trục Ox)",
          color: "#9333ea"
        }
      ];

      if (isIncreasing) {
        bbtPoints = [
          { x: "-\\infty", yVal: "0", yPosition: "bottom" },
          { x: "0", yVal: "1", yPosition: "middle" },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];
        bbtIntervals = [
          { trend: "increasing", sign: "+" },
          { trend: "increasing", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
          { x: "0", yVal: "1", yPosition: "middle" },
          { x: "+\\infty", yVal: "0", yPosition: "bottom" }
        ];
        bbtIntervals = [
          { trend: "decreasing", sign: "-" },
          { trend: "decreasing", sign: "-" }
        ];
      }
    } else {
      fnPlot = {
        id: "log",
        fn: (x) => (x > 1e-6 ? Math.log(x) / Math.log(a) : NaN),
        color: "#059669",
        width: 2.5,
        discontinuities: [0]
      };

      points = [
        { x: 1, y: 0, label: "A(1; 0)", color: "#dc2626", isDashedToAxes: true },
        { x: Number(a.toFixed(2)), y: 1, label: `B(${Number(a.toFixed(2))}; 1)`, color: "#2563eb", isDashedToAxes: true }
      ];

      asymptotes = [
        {
          type: "vertical",
          value: 0,
          label: "Tiệm cận đứng: x = 0 (trục Oy)",
          color: "#9333ea"
        }
      ];

      if (isIncreasing) {
        bbtPoints = [
          { x: "0", isDiscontinuity: true, yRightVal: "-\\infty" },
          { x: "1", yVal: "0", yPosition: "middle" },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];
        bbtIntervals = [
          { trend: "increasing", sign: "+" },
          { trend: "increasing", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "0", isDiscontinuity: true, yRightVal: "+\\infty" },
          { x: "1", yVal: "0", yPosition: "middle" },
          { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
        ];
        bbtIntervals = [
          { trend: "decreasing", sign: "-" },
          { trend: "decreasing", sign: "-" }
        ];
      }
    }

    return {
      a, isIncreasing, fnPlot, points, asymptotes, bbtPoints, bbtIntervals
    };
  }, [funcType, baseA]);

  // Prompt helper for 3D geometry
  const [problemPrompt, setProblemPrompt] = useState<string>("");
  const [suggestedShape, setSuggestedShape] = useState<Shape3DType>("pyramid_quad");

  const handleAnalyzePrompt = () => {
    const text = problemPrompt.toLowerCase();
    if (text.includes("s.abc") || (text.includes("chóp") && text.includes("tam giác"))) {
      if (text.includes("đều")) setSuggestedShape("pyramid_regular_tri");
      else setSuggestedShape("pyramid_triangle");
    } else if (text.includes("s.abcd") || (text.includes("chóp") && text.includes("tứ giác"))) {
      if (text.includes("đều") || text.includes("vuông")) setSuggestedShape("pyramid_regular_quad");
      else setSuggestedShape("pyramid_quad");
    } else if (text.includes("lăng trụ")) {
      setSuggestedShape("prism_triangular");
    } else if (text.includes("hộp") || text.includes("lập phương")) {
      setSuggestedShape("cuboid");
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 text-xs font-semibold gap-1">
        <button
          onClick={() => setActiveTab("trig")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "trig"
              ? "bg-white text-purple-800 font-bold shadow-xs border border-purple-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="1. Đồ thị & KSHS Hàm số Lượng giác ($y = A\sin(Bx+C)+D$, ...)" />
        </button>
        <button
          onClick={() => setActiveTab("exp_log")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "exp_log"
              ? "bg-white text-blue-800 font-bold shadow-xs border border-blue-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="2. Đồ thị hàm Mũ ($y = a^x$) & Logarit ($y = \log_a x$)" />
        </button>
        <button
          onClick={() => setActiveTab("geometry_3d")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "geometry_3d"
              ? "bg-white text-emerald-800 font-bold shadow-xs border border-emerald-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="3. Công cụ vẽ Hình học không gian (3D)" />
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. HÀM SỐ LƯỢNG GIÁC (SGK KẾT NỐI TRI THỨC VỚI CUỘC SỐNG - LỚP 11)   */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "trig" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    <MathSpan content="Khảo sát & Vẽ đồ thị Hàm số Lượng giác (Toán 11)" />
                  </h3>
                  <p className="text-xs text-slate-500">Chuẩn chương trình SGK Kết nối tri thức với cuộc sống</p>
                </div>
                <button
                  onClick={handleCopyTikz}
                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-purple-200"
                  title="Sao chép mã TikZ để dán vào tài liệu LaTeX"
                >
                  {copiedTikz ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTikz ? "Đã chép TikZ!" : "Copy TikZ"}</span>
                </button>
              </div>

              {/* Function Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn loại hàm số lượng giác:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "sin", label: "y = sin(x)" },
                    { id: "cos", label: "y = cos(x)" },
                    { id: "tan", label: "y = tan(x)" },
                    { id: "cot", label: "y = cot(x)" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTrigFn(item.id as any)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                        trigFn === item.id
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <MathSpan content={`$${item.label}$`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* General Form Equation Display */}
              <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-100 text-center font-serif text-sm font-bold text-purple-900">
                <MathSpan content={`$$\\mathbf{${trigAnalysis.formulaLatex}}$$`} />
              </div>

              {/* Parameter Inputs A, B, C, D */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    <MathSpan content="Hệ số $A$ (Biên độ)" />
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={trigA}
                    onChange={(e) => setTrigA(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    <MathSpan content="Hệ số $B$ ($B \\ne 0$)" />
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={trigB}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val !== 0) setTrigB(val || 1);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    <MathSpan content="Góc pha $C$ (Radian)" />
                  </label>
                  <select
                    value={trigC}
                    onChange={(e) => setTrigC(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none"
                  >
                    <option value={0}>0 rad</option>
                    <option value={Math.PI / 6}>π/6 (30°)</option>
                    <option value={Math.PI / 4}>π/4 (45°)</option>
                    <option value={Math.PI / 3}>π/3 (60°)</option>
                    <option value={Math.PI / 2}>π/2 (90°)</option>
                    <option value={Math.PI}>π (180°)</option>
                    <option value={-Math.PI / 4}>-π/4 (-45°)</option>
                    <option value={-Math.PI / 2}>-π/2 (-90°)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    <MathSpan content="Hệ số $D$ (Tịnh tiến dọc)" />
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={trigD}
                    onChange={(e) => setTrigD(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Presets from SGK */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Mẫu bài tập SGK KNTT:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "y = \\sin x", fn: "sin", a: 1, b: 1, c: 0, d: 0 },
                    { label: "y = \\cos x", fn: "cos", a: 1, b: 1, c: 0, d: 0 },
                    { label: "y = \\tan x", fn: "tan", a: 1, b: 1, c: 0, d: 0 },
                    { label: "y = \\cot x", fn: "cot", a: 1, b: 1, c: 0, d: 0 },
                    { label: "y = 2\\sin(2x)", fn: "sin", a: 2, b: 2, c: 0, d: 0 },
                    { label: "y = \\cos(x - \\frac{\\pi}{4})", fn: "cos", a: 1, b: 1, c: -Math.PI/4, d: 0 },
                    { label: "y = \\tan(2x)", fn: "tan", a: 1, b: 2, c: 0, d: 0 }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTrigFn(preset.fn as any);
                        setTrigA(preset.a);
                        setTrigB(preset.b);
                        setTrigC(preset.c);
                        setTrigD(preset.d);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-purple-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <MathSpan content={`$${preset.label}$`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Bảng biến thiên 2 dòng chuẩn cho Hàm Lượng Giác (không dùng đạo hàm) */}
              <VariationTable
                title={`Bảng biến thiên trên 1 chu kỳ T = ${trigAnalysis.periodStr}`}
                points={trigAnalysis.bbtPoints}
                intervals={trigAnalysis.bbtIntervals}
                showDerivative={false}
              />

              {/* Textbook Analysis properties */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-purple-600" />
                  <span>Các dữ kiện khảo sát hàm số (SGK Toán 11):</span>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <MathView inline content={`• **Tập xác định:** $${trigAnalysis.domainStr}$`} />
                  </div>
                  <div>
                    <MathView inline content={`• **Tập giá trị:** $${trigAnalysis.rangeStr}$`} />
                  </div>
                  <div>
                    <MathView inline content={`• **Sự biến thiên:** ${trigAnalysis.variationStr}`} />
                  </div>
                  <div>
                    <MathView inline content={`• **Chu kỳ tuần hoàn:** $T = ${trigAnalysis.periodStr}$`} />
                  </div>
                  <div>
                    <MathView inline content={`• **Tính chẵn / lẻ:** ${trigAnalysis.symmetryStr}`} />
                  </div>
                  <div>
                    <MathView inline content={`• **GTLN & GTNN:** $${trigAnalysis.minMaxStr}$`} />
                  </div>
                  {(trigFn === "tan" || trigFn === "cot") && (
                    <div>
                      <MathView 
                        inline 
                        content={`• **Đường tiệm cận đứng:** Các đường thẳng $x = ${
                          trigFn === "tan" 
                            ? `${formatRadVal((Math.PI/2 - trigC)/trigB)} + k${trigAnalysis.periodStr}`
                            : `${formatRadVal((-trigC)/trigB)} + k${trigAnalysis.periodStr}`
                        }, k \\in \\mathbb{Z}$`} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <InteractivePlot
              title={`Đồ thị hàm số lượng giác: ${trigAnalysis.formulaLatex}`}
              subtitle={`Chu kỳ T = ${trigAnalysis.periodStr} với các điểm cực trị / đường tiệm cận đứng`}
              functions={[trigAnalysis.fnPlot]}
              points={trigAnalysis.points}
              asymptotes={trigAnalysis.asymptotes}
              defaultXRange={[-6.5, 6.5]}
              defaultYRange={[-3.5, 3.5]}
              height={460}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. ĐỒ THỊ HÀM MŨ VÀ LOGARIT                                         */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "exp_log" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  <MathSpan content="Hàm số Mũ và Logarit (Toán 11)" />
                </h3>
                <p className="text-xs text-slate-500">Khảo sát đạo hàm, tính đơn điệu, BBT 3 dòng và tiệm cận</p>
              </div>

              {/* Function Type Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFuncType("exp")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    funcType === "exp"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <MathSpan content="Hàm Mũ: $y = a^x$" />
                </button>
                <button
                  onClick={() => setFuncType("log")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    funcType === "log"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <MathSpan content="Hàm Logarit: $y = \log_a x$" />
                </button>
              </div>

              {/* Base Input a */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <MathSpan content="Cơ số $a$ ($a > 0, a \ne 1$)" />
                </label>
                <input
                  type="number"
                  step="any"
                  min={0.01}
                  value={baseA}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0 && val !== 1) {
                      setBaseA(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Quick Presets for base a */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Cơ số thông dụng:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 2, label: "a = 2" },
                    { a: 3, label: "a = 3" },
                    { a: 0.5, label: "a = 1/2 (0.5)" },
                    { a: 2.718, label: "a = e (2.718)" },
                    { a: 10, label: "a = 10 (lg)" }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setBaseA(preset.a)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <MathSpan content={`$${preset.label}$`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Chi tiết tính đạo hàm y' */}
              <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100 space-y-2 text-xs text-slate-700">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Bước tính đạo hàm $y'$ chi tiết:</span>
                </div>

                {funcType === "exp" ? (
                  <div className="space-y-1.5">
                    <MarkdownRenderer
                      content={`- **Công thức đạo hàm:**
  $$y' = (a^x)' = a^x \\ln a$$
- **Xét dấu đạo hàm:**
  Vì $a^x > 0, \\forall x \\in \\mathbb{R}$, nên dấu của $y'$ phụ thuộc vào $\\ln a$:
  ${expLogAnalysis.isIncreasing 
    ? `Do $a = ${expLogAnalysis.a} > 1 \\implies \\ln a > 0 \\implies y' > 0, \\forall x \\in \\mathbb{R}$. Hàm số **đồng biến** trên $\\mathbb{R}$.`
    : `Do $0 < a = ${expLogAnalysis.a} < 1 \\implies \\ln a < 0 \\implies y' < 0, \\forall x \\in \\mathbb{R}$. Hàm số **nghịch biến** trên $\\mathbb{R}$.`
  }`}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <MarkdownRenderer
                      content={`- **Công thức đạo hàm:**
  $$y' = (\\log_a x)' = \\frac{1}{x \\ln a}, \\quad \\forall x \\in (0; +\\infty)$$
- **Xét dấu đạo hàm:**
  Với mọi $x > 0$, dấu của $y'$ phụ thuộc hoàn toàn vào $\\ln a$:
  ${expLogAnalysis.isIncreasing 
    ? `Do $a = ${expLogAnalysis.a} > 1 \\implies \\ln a > 0 \\implies y' > 0, \\forall x > 0$. Hàm số **đồng biến** trên $(0; +\\infty)$.`
    : `Do $0 < a = ${expLogAnalysis.a} < 1 \\implies \\ln a < 0 \\implies y' < 0, \\forall x > 0$. Hàm số **nghịch biến** trên $(0; +\\infty)$.`
  }`}
                    />
                  </div>
                )}
              </div>

              {/* Bảng biến thiên 3 dòng chuẩn cho Lớp 11 */}
              <VariationTable
                title={funcType === "exp" ? "Bảng biến thiên hàm Mũ (Toán 11)" : "Bảng biến thiên hàm Logarit (Toán 11)"}
                points={expLogAnalysis.bbtPoints}
                intervals={expLogAnalysis.bbtIntervals}
                showDerivative={true}
              />

              {/* Properties & pedagogical conclusion */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Đặc trưng toán học (SGK Toán 11):</span>
                </div>

                {funcType === "exp" ? (
                  <div className="space-y-1">
                    <div>
                      <MathView inline content="• **Tập xác định:** $\mathcal{D} = \mathbb{R}$." />
                    </div>
                    <div>
                      <MathView inline content="• **Tập giá trị:** $T = (0; +\infty)$ (đồ thị luôn nằm hoàn toàn phía trên trục hoành $Ox$)." />
                    </div>
                    <div>
                      <MathView
                        inline
                        content={expLogAnalysis.isIncreasing 
                          ? `• **Tính đơn điệu:** Do $a = ${expLogAnalysis.a} > 1$ nên hàm số đồng biến trên $\\mathbb{R}$.`
                          : `• **Tính đơn điệu:** Do $0 < a = ${expLogAnalysis.a} < 1$ nên hàm số nghịch biến trên $\\mathbb{R}$.`
                        }
                      />
                    </div>
                    <div>
                      <MathView inline content="• **Đường tiệm cận:** Tiệm cận ngang là trục hoành $Ox$ ($y = 0$)." />
                    </div>
                    <div>
                      <MathView inline content={`• **Điểm cố định:** Luôn đi qua điểm $(0; 1)$ và điểm $(1; ${expLogAnalysis.a})$.`} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div>
                      <MathView inline content="• **Tập xác định:** $\mathcal{D} = (0; +\infty)$ (đồ thị luôn nằm ở nửa bên phải trục tung $Oy$)." />
                    </div>
                    <div>
                      <MathView inline content="• **Tập giá trị:** $T = \mathbb{R}$." />
                    </div>
                    <div>
                      <MathView
                        inline
                        content={expLogAnalysis.isIncreasing 
                          ? `• **Tính đơn điệu:** Do $a = ${expLogAnalysis.a} > 1$ nên hàm số đồng biến trên $(0; +\\infty)$.`
                          : `• **Tính đơn điệu:** Do $0 < a = ${expLogAnalysis.a} < 1$ nên hàm số nghịch biến trên $(0; +\\infty)$.`
                        }
                      />
                    </div>
                    <div>
                      <MathView inline content="• **Đường tiệm cận:** Tiệm cận đứng là trục tung $Oy$ ($x = 0$)." />
                    </div>
                    <div>
                      <MathView inline content={`• **Điểm cố định:** Luôn đi qua điểm $(1; 0)$ và điểm $(${expLogAnalysis.a}; 1)$.`} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <InteractivePlot
              title={funcType === "exp" ? `Đồ thị hàm số mũ: y = ${expLogAnalysis.a}^x` : `Đồ thị hàm số logarit: y = log_${expLogAnalysis.a}(x)`}
              subtitle="Đường tiệm cận nét đứt và các điểm cố định đặc trưng"
              functions={[expLogAnalysis.fnPlot]}
              points={expLogAnalysis.points}
              asymptotes={expLogAnalysis.asymptotes}
              defaultXRange={funcType === "exp" ? [-4, 4] : [-1, 7]}
              defaultYRange={funcType === "exp" ? [-1, 7] : [-4, 4]}
              height={460}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. CÔNG CỤ VẼ HÌNH HỌC KHÔNG GIAN (3D)                             */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "geometry_3d" && (
        <div className="space-y-6">
          {/* Smart prompt analyzer */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gợi ý mô hình từ mô tả đề bài:
              </label>
              <input
                type="text"
                value={problemPrompt}
                onChange={e => setProblemPrompt(e.target.value)}
                placeholder="Ví dụ: Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none"
              />
            </div>
            <button
              onClick={handleAnalyzePrompt}
              className="w-full sm:w-auto px-4 py-2 mt-auto bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Nhận diện hình
            </button>
          </div>

          <Geometry3DViewer initialShape={suggestedShape} />
        </div>
      )}
    </div>
  );
};
