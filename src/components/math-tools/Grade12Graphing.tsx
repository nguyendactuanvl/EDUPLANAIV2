import React, { useState, useMemo } from "react";
import { InteractivePlot } from "./InteractivePlot";
import { VariationTable, VariationTablePoint, VariationInterval } from "./VariationTable";
import { MarkdownRenderer, MathSpan } from "../MarkdownRenderer";
import { formatCubic, formatQuadratic, formatQuartic, formatLinearEquation } from "../../lib/mathFormatters";
import { FunctionPlotData, Point2D, AsymptoteLine } from "./types";
import { Copy, Check } from "lucide-react";

export const Grade12Graphing: React.FC = () => {
  const [funcType, setFuncType] = useState<"cubic" | "rational1_1" | "rational2_1" | "quartic" | "parabola">("cubic");

  // 1. Hàm bậc 3: y = ax^3 + bx^2 + cx + d
  const [c3A, setC3A] = useState<number>(1);
  const [c3B, setC3B] = useState<number>(-3);
  const [c3C, setC3C] = useState<number>(0);
  const [c3D, setC3D] = useState<number>(2);

  // 2. Hàm bậc 1/1: y = (ax + b)/(cx + d)
  const [r1A, setR1A] = useState<number>(2);
  const [r1B, setR1B] = useState<number>(-1);
  const [r1C, setR1C] = useState<number>(1);
  const [r1D, setR1D] = useState<number>(1);

  // 3. Hàm bậc 2/1: y = (ax^2 + bx + c)/(dx + e) (Chuẩn SGK mới GDPT 2018)
  const [r2A, setR2A] = useState<number>(1);
  const [r2B, setR2B] = useState<number>(-2);
  const [r2C, setR2C] = useState<number>(2);
  const [r2D, setR2D] = useState<number>(1);
  const [r2E, setR2E] = useState<number>(-1);

  // 4. Hàm trùng phương: y = ax^4 + bx^2 + c
  const [c4A, setC4A] = useState<number>(1);
  const [c4B, setC4B] = useState<number>(-2);
  const [c4C, setC4C] = useState<number>(-1);

  // 5. Hàm bậc hai (Parabol): y = ax^2 + bx + c
  const [pA, setPA] = useState<number>(1);
  const [pB, setPB] = useState<number>(-4);
  const [pC, setPC] = useState<number>(3);

  const [copiedKSHS, setCopiedKSHS] = useState<boolean>(false);

  // ==========================================
  // 1. ANALYSIS: HÀM BẬC BA: y = ax^3 + bx^2 + cx + d
  // ==========================================
  const cubicAnalysis = useMemo(() => {
    const a = c3A === 0 ? 1 : c3A;
    const b = c3B;
    const c = c3C;
    const d = c3D;

    // y' = 3ax^2 + 2bx + c
    const aPrime = 3 * a;
    const bPrime = 2 * b;
    const cPrime = c;
    const deltaPrime = bPrime * bPrime - 4 * aPrime * cPrime;

    // Tâm đối xứng (Điểm uốn): y'' = 6ax + 2b = 0 => x = -b / (3a)
    const xInflection = -b / (3 * a);
    const yInflection = a * Math.pow(xInflection, 3) + b * Math.pow(xInflection, 2) + c * xInflection + d;

    let roots: number[] = [];
    if (deltaPrime > 1e-6) {
      const r1 = (-bPrime - Math.sqrt(deltaPrime)) / (2 * aPrime);
      const r2 = (-bPrime + Math.sqrt(deltaPrime)) / (2 * aPrime);
      roots = [Math.min(r1, r2), Math.max(r1, r2)];
    }

    const points: Point2D[] = [
      {
        x: Number(xInflection.toFixed(2)),
        y: Number(yInflection.toFixed(2)),
        label: `Tâm ĐX I(${Number(xInflection.toFixed(2))}; ${Number(yInflection.toFixed(2))})`,
        color: "#9333ea",
        isDashedToAxes: true
      },
      {
        x: 0,
        y: d,
        label: `Oy(0; ${d})`,
        color: "#2563eb",
        isDashedToAxes: true
      }
    ];

    let extremaMarkdown = "";
    let bbtPoints: VariationTablePoint[] = [];
    let bbtIntervals: VariationInterval[] = [];

    if (roots.length === 2) {
      const [x1, x2] = roots;
      const y1 = a * Math.pow(x1, 3) + b * Math.pow(x1, 2) + c * x1 + d;
      const y2 = a * Math.pow(x2, 3) + b * Math.pow(x2, 2) + c * x2 + d;

      const isFirstMax = a > 0;
      points.push(
        {
          x: Number(x1.toFixed(2)),
          y: Number(y1.toFixed(2)),
          label: isFirstMax ? `CĐ(${Number(x1.toFixed(2))}; ${Number(y1.toFixed(2))})` : `CT(${Number(x1.toFixed(2))}; ${Number(y1.toFixed(2))})`,
          color: isFirstMax ? "#ea580c" : "#0284c7",
          isDashedToAxes: true
        },
        {
          x: Number(x2.toFixed(2)),
          y: Number(y2.toFixed(2)),
          label: isFirstMax ? `CT(${Number(x2.toFixed(2))}; ${Number(y2.toFixed(2))})` : `CĐ(${Number(x2.toFixed(2))}; ${Number(y2.toFixed(2))})`,
          color: isFirstMax ? "#0284c7" : "#ea580c",
          isDashedToAxes: true
        }
      );

      extremaMarkdown = `Hàm số có 2 điểm cực trị:
- ${isFirstMax ? "Điểm cực đại của hàm số" : "Điểm cực tiểu của hàm số"}: $x = ${Number(x1.toFixed(2))}$, giá trị ${isFirstMax ? "cực đại" : "cực tiểu"} $y_{\\text{${isFirstMax ? "CĐ" : "CT"}}} = ${Number(y1.toFixed(2))}$ (điểm ${isFirstMax ? "cực đại" : "cực tiểu"} của đồ thị: $(${Number(x1.toFixed(2))}; ${Number(y1.toFixed(2))})$).
- ${isFirstMax ? "Điểm cực tiểu của hàm số" : "Điểm cực đại của hàm số"}: $x = ${Number(x2.toFixed(2))}$, giá trị ${isFirstMax ? "cực tiểu" : "cực đại"} $y_{\\text{${isFirstMax ? "CT" : "CĐ"}}} = ${Number(y2.toFixed(2))}$ (điểm ${isFirstMax ? "cực tiểu" : "cực đại"} của đồ thị: $(${Number(x2.toFixed(2))}; ${Number(y2.toFixed(2))})$).`;

      if (a > 0) {
        bbtPoints = [
          { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
          { x: Number(x1.toFixed(2)).toString(), yPrime: "0", yVal: Number(y1.toFixed(2)).toString(), yPosition: "top" },
          { x: Number(x2.toFixed(2)).toString(), yPrime: "0", yVal: Number(y2.toFixed(2)).toString(), yPosition: "bottom" },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];
        bbtIntervals = [
          { trend: "increasing", fromVal: "-\\infty", toVal: Number(y1.toFixed(2)).toString(), sign: "+" },
          { trend: "decreasing", fromVal: Number(y1.toFixed(2)).toString(), toVal: Number(y2.toFixed(2)).toString(), sign: "-" },
          { trend: "increasing", fromVal: Number(y2.toFixed(2)).toString(), toVal: "+\\infty", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
          { x: Number(x1.toFixed(2)).toString(), yPrime: "0", yVal: Number(y1.toFixed(2)).toString(), yPosition: "bottom" },
          { x: Number(x2.toFixed(2)).toString(), yPrime: "0", yVal: Number(y2.toFixed(2)).toString(), yPosition: "top" },
          { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
        ];
        bbtIntervals = [
          { trend: "decreasing", fromVal: "+\\infty", toVal: Number(y1.toFixed(2)).toString(), sign: "-" },
          { trend: "increasing", fromVal: Number(y1.toFixed(2)).toString(), toVal: Number(y2.toFixed(2)).toString(), sign: "+" },
          { trend: "decreasing", fromVal: Number(y2.toFixed(2)).toString(), toVal: "-\\infty", sign: "-" }
        ];
      }
    } else {
      extremaMarkdown = "Hàm số không có cực trị (đạo hàm $y' \\ge 0$ hoặc $y' \\le 0$ với mọi $x \\in \\mathbb{R}$).";
      if (a > 0) {
        bbtPoints = [
          { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];
        bbtIntervals = [
          { trend: "increasing", fromVal: "-\\infty", toVal: "+\\infty", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
          { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
        ];
        bbtIntervals = [
          { trend: "decreasing", fromVal: "+\\infty", toVal: "-\\infty", sign: "-" }
        ];
      }
    }

    const fnPlot: FunctionPlotData = {
      id: "cubic",
      fn: (x) => a * Math.pow(x, 3) + b * Math.pow(x, 2) + c * x + d,
      color: "#2563eb",
      width: 2.5
    };

    return {
      a, b, c, d, aPrime, bPrime, cPrime, roots,
      xInflection, yInflection, points, fnPlot,
      bbtPoints, bbtIntervals, extremaMarkdown
    };
  }, [c3A, c3B, c3C, c3D]);

  // ==========================================
  // 2. ANALYSIS: HÀM PHÂN THỨC BẬC NHẤT / BẬC NHẤT
  // ==========================================
  const rational1Analysis = useMemo(() => {
    const a = r1A;
    const b = r1B;
    const c = r1C === 0 ? 1 : r1C;
    const d = r1D;

    const adMinusBc = a * d - b * c;
    const xAsymptote = -d / c;
    const yAsymptote = a / c;

    const asymptotes: AsymptoteLine[] = [
      {
        type: "vertical",
        value: xAsymptote,
        label: `TCĐ: x = ${Number(xAsymptote.toFixed(2))}`,
        color: "#dc2626"
      },
      {
        type: "horizontal",
        value: yAsymptote,
        label: `TCN: y = ${Number(yAsymptote.toFixed(2))}`,
        color: "#2563eb"
      }
    ];

    const points: Point2D[] = [
      {
        x: Number(xAsymptote.toFixed(2)),
        y: Number(yAsymptote.toFixed(2)),
        label: `Tâm ĐX I(${Number(xAsymptote.toFixed(2))}; ${Number(yAsymptote.toFixed(2))})`,
        color: "#9333ea",
        isDashedToAxes: true
      }
    ];

    if (d !== 0) {
      points.push({
        x: 0,
        y: Number((b / d).toFixed(2)),
        label: `Oy(0; ${Number((b / d).toFixed(2))})`,
        color: "#16a34a",
        isDashedToAxes: true
      });
    }

    if (a !== 0) {
      points.push({
        x: Number((-b / a).toFixed(2)),
        y: 0,
        label: `Ox(${Number((-b / a).toFixed(2))}; 0)`,
        color: "#16a34a",
        isDashedToAxes: true
      });
    }

    const fnPlot: FunctionPlotData = {
      id: "rational1",
      fn: (x) => (a * x + b) / (c * x + d),
      color: "#2563eb",
      width: 2.5,
      discontinuities: [xAsymptote]
    };

    const isIncreasing = adMinusBc > 0;
    const bbtPoints: VariationTablePoint[] = [
      { x: "-\\infty", yVal: Number(yAsymptote.toFixed(2)).toString() },
      {
        x: Number(xAsymptote.toFixed(2)).toString(),
        isDiscontinuity: true,
        yLeftVal: isIncreasing ? "+\\infty" : "-\\infty",
        yRightVal: isIncreasing ? "-\\infty" : "+\\infty"
      },
      { x: "+\\infty", yVal: Number(yAsymptote.toFixed(2)).toString() }
    ];

    const bbtIntervals: VariationInterval[] = [
      {
        trend: isIncreasing ? "increasing" : "decreasing",
        fromVal: Number(yAsymptote.toFixed(2)).toString(),
        toVal: isIncreasing ? "+\\infty" : "-\\infty",
        sign: isIncreasing ? "+" : "-"
      },
      {
        trend: isIncreasing ? "increasing" : "decreasing",
        fromVal: isIncreasing ? "-\\infty" : "+\\infty",
        toVal: Number(yAsymptote.toFixed(2)).toString(),
        sign: isIncreasing ? "+" : "-"
      }
    ];

    return {
      a, b, c, d, adMinusBc, xAsymptote, yAsymptote,
      asymptotes, points, fnPlot, bbtPoints, bbtIntervals
    };
  }, [r1A, r1B, r1C, r1D]);

  // ==========================================
  // 3. ANALYSIS: HÀM PHÂN THỨC BẬC HAI / BẬC NHẤT (CHUẨN TOÁN 12 MỚI)
  // ==========================================
  const rational2Analysis = useMemo(() => {
    const a = r2A === 0 ? 1 : r2A;
    const b = r2B;
    const c = r2C;
    const d = r2D === 0 ? 1 : r2D;
    const e = r2E;

    // Phép chia đa thức: (ax^2 + bx + c) = (dx + e)(mx + n) + r
    const m = a / d;
    const n = (b - m * e) / d;
    const r = c - n * e;

    const xAsymptote = -e / d;

    // Đạo hàm: y' = [ (2ax+b)(dx+e) - d(ax^2+bx+c) ] / (dx+e)^2
    //             = [ ad*x^2 + 2ae*x + (be - cd) ] / (dx+e)^2
    const numA = a * d;
    const numB = 2 * a * e;
    const numC = b * e - c * d;

    // Delta' = (ae)^2 - (ad)(be - cd) = a * r * d^2
    const deltaPrime = (a * e) * (a * e) - (a * d) * numC;

    // Tiệm cận đứng và tiệm cận xiên
    const asymptotes: AsymptoteLine[] = [
      {
        type: "vertical",
        value: xAsymptote,
        label: `TCĐ: x = ${Number(xAsymptote.toFixed(2))}`,
        color: "#dc2626"
      }
    ];

    if (Math.abs(r) > 1e-4) {
      asymptotes.push({
        type: "slant",
        m: m,
        c: n,
        label: `TCX: y = ${Number(m.toFixed(2))}x ${n >= 0 ? "+ " + Number(n.toFixed(2)) : "- " + Math.abs(Number(n.toFixed(2)))}`,
        color: "#9333ea"
      });
    }

    // Tâm đối xứng I (giao 2 tiệm cận)
    const yCenter = m * xAsymptote + n;
    const points: Point2D[] = [
      {
        x: Number(xAsymptote.toFixed(2)),
        y: Number(yCenter.toFixed(2)),
        label: `Tâm ĐX I(${Number(xAsymptote.toFixed(2))}; ${Number(yCenter.toFixed(2))})`,
        color: "#9333ea",
        isDashedToAxes: true
      }
    ];

    if (e !== 0) {
      points.push({
        x: 0,
        y: Number((c / e).toFixed(2)),
        label: `Oy(0; ${Number((c / e).toFixed(2))})`,
        color: "#16a34a",
        isDashedToAxes: true
      });
    }

    let roots: number[] = [];
    let bbtPoints: VariationTablePoint[] = [];
    let bbtIntervals: VariationInterval[] = [];
    let extremaMarkdown = "";

    const isBranchUp = a * d > 0;

    if (deltaPrime > 1e-6) {
      const sqrtDelta = Math.sqrt(deltaPrime);
      const r1 = (-numB / 2 - sqrtDelta) / numA;
      const r2 = (-numB / 2 + sqrtDelta) / numA;
      const x1 = Math.min(r1, r2);
      const x2 = Math.max(r1, r2);
      roots = [x1, x2];

      const y1 = (a * x1 * x1 + b * x1 + c) / (d * x1 + e);
      const y2 = (a * x2 * x2 + b * x2 + c) / (d * x2 + e);

      const isFirstMax = isBranchUp; // ad > 0 thì x1 là Cực Đại, x2 là Cực Tiểu; ad < 0 thì ngược lại

      points.push(
        {
          x: Number(x1.toFixed(2)),
          y: Number(y1.toFixed(2)),
          label: isFirstMax ? `CĐ(${Number(x1.toFixed(2))}; ${Number(y1.toFixed(2))})` : `CT(${Number(x1.toFixed(2))}; ${Number(y1.toFixed(2))})`,
          color: isFirstMax ? "#ea580c" : "#0284c7",
          isDashedToAxes: true
        },
        {
          x: Number(x2.toFixed(2)),
          y: Number(y2.toFixed(2)),
          label: isFirstMax ? `CT(${Number(x2.toFixed(2))}; ${Number(y2.toFixed(2))})` : `CĐ(${Number(x2.toFixed(2))}; ${Number(y2.toFixed(2))})`,
          color: isFirstMax ? "#0284c7" : "#ea580c",
          isDashedToAxes: true
        }
      );

      extremaMarkdown = `Hàm số có 2 điểm cực trị:
- ${isFirstMax ? "Điểm cực đại của hàm số" : "Điểm cực tiểu của hàm số"}: $x = ${Number(x1.toFixed(2))}$, giá trị ${isFirstMax ? "cực đại" : "cực tiểu"} $y_{\\text{${isFirstMax ? "CĐ" : "CT"}}} = ${Number(y1.toFixed(2))}$ (điểm ${isFirstMax ? "cực đại" : "cực tiểu"} của đồ thị: $(${Number(x1.toFixed(2))}; ${Number(y1.toFixed(2))})$).
- ${isFirstMax ? "Điểm cực tiểu của hàm số" : "Điểm cực đại của hàm số"}: $x = ${Number(x2.toFixed(2))}$, giá trị ${isFirstMax ? "cực tiểu" : "cực đại"} $y_{\\text{${isFirstMax ? "CT" : "CĐ"}}} = ${Number(y2.toFixed(2))}$ (điểm ${isFirstMax ? "cực tiểu" : "cực đại"} của đồ thị: $(${Number(x2.toFixed(2))}; ${Number(y2.toFixed(2))})$).`;

      if (isBranchUp) {
        bbtPoints = [
          { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
          { x: Number(x1.toFixed(2)).toString(), yPrime: "0", yVal: Number(y1.toFixed(2)).toString(), yPosition: "top" },
          {
            x: Number(xAsymptote.toFixed(2)).toString(),
            isDiscontinuity: true,
            yLeftVal: "-\\infty",
            yRightVal: "+\\infty"
          },
          { x: Number(x2.toFixed(2)).toString(), yPrime: "0", yVal: Number(y2.toFixed(2)).toString(), yPosition: "bottom" },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];

        bbtIntervals = [
          { trend: "increasing", sign: "+" },
          { trend: "decreasing", sign: "-" },
          { trend: "decreasing", sign: "-" },
          { trend: "increasing", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
          { x: Number(x1.toFixed(2)).toString(), yPrime: "0", yVal: Number(y1.toFixed(2)).toString(), yPosition: "bottom" },
          {
            x: Number(xAsymptote.toFixed(2)).toString(),
            isDiscontinuity: true,
            yLeftVal: "+\\infty",
            yRightVal: "-\\infty"
          },
          { x: Number(x2.toFixed(2)).toString(), yPrime: "0", yVal: Number(y2.toFixed(2)).toString(), yPosition: "top" },
          { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
        ];

        bbtIntervals = [
          { trend: "decreasing", sign: "-" },
          { trend: "increasing", sign: "+" },
          { trend: "increasing", sign: "+" },
          { trend: "decreasing", sign: "-" }
        ];
      }
    } else {
      extremaMarkdown = "Hàm số không có cực trị (đạo hàm $y' > 0$ hoặc $y' < 0$ với mọi $x \\ne x_0$).";
      if (isBranchUp) {
        bbtPoints = [
          { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
          {
            x: Number(xAsymptote.toFixed(2)).toString(),
            isDiscontinuity: true,
            yLeftVal: "+\\infty",
            yRightVal: "-\\infty"
          },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];

        bbtIntervals = [
          { trend: "increasing", sign: "+" },
          { trend: "increasing", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
          {
            x: Number(xAsymptote.toFixed(2)).toString(),
            isDiscontinuity: true,
            yLeftVal: "-\\infty",
            yRightVal: "+\\infty"
          },
          { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
        ];

        bbtIntervals = [
          { trend: "decreasing", sign: "-" },
          { trend: "decreasing", sign: "-" }
        ];
      }
    }

    const fnPlot: FunctionPlotData = {
      id: "rational2",
      fn: (x) => (a * x * x + b * x + c) / (d * x + e),
      color: "#2563eb",
      width: 2.5,
      discontinuities: [xAsymptote]
    };

    return {
      a, b, c, d, e, m, n, r, xAsymptote, yCenter,
      numA, numB, numC, deltaPrime,
      asymptotes, points, fnPlot, bbtPoints, bbtIntervals, roots, extremaMarkdown, isBranchUp
    };
  }, [r2A, r2B, r2C, r2D, r2E]);

  // ==========================================
  // 4. ANALYSIS: HÀM TRÙNG PHƯƠNG: y = ax^4 + bx^2 + c
  // ==========================================
  const quarticAnalysis = useMemo(() => {
    const a = c4A === 0 ? 1 : c4A;
    const b = c4B;
    const c = c4C;

    // y' = 4ax^3 + 2bx = 2x(2ax^2 + b)
    const points: Point2D[] = [
      {
        x: 0,
        y: c,
        label: `Oy(0; ${c})`,
        color: "#2563eb",
        isDashedToAxes: true
      }
    ];

    let bbtPoints: VariationTablePoint[] = [];
    let bbtIntervals: VariationInterval[] = [];
    let extremaMarkdown = "";

    // 3 cực trị khi ab < 0 (tức -b/(2a) > 0)
    if (a * b < 0) {
      const xExt = Math.sqrt(-b / (2 * a));
      const yExt = a * Math.pow(xExt, 4) + b * Math.pow(xExt, 2) + c;
      const x1 = -xExt;
      const x2 = xExt;

      const isCenterMax = a > 0; // a > 0 thì (0; c) là Cực Đại, 2 điểm 2 bên là Cực Tiểu

      points.push(
        {
          x: Number(x1.toFixed(2)),
          y: Number(yExt.toFixed(2)),
          label: isCenterMax ? `CT(${Number(x1.toFixed(2))}; ${Number(yExt.toFixed(2))})` : `CĐ(${Number(x1.toFixed(2))}; ${Number(yExt.toFixed(2))})`,
          color: isCenterMax ? "#0284c7" : "#ea580c",
          isDashedToAxes: true
        },
        {
          x: 0,
          y: c,
          label: isCenterMax ? `CĐ(0; ${c})` : `CT(0; ${c})`,
          color: isCenterMax ? "#ea580c" : "#0284c7",
          isDashedToAxes: true
        },
        {
          x: Number(x2.toFixed(2)),
          y: Number(yExt.toFixed(2)),
          label: isCenterMax ? `CT(${Number(x2.toFixed(2))}; ${Number(yExt.toFixed(2))})` : `CĐ(${Number(x2.toFixed(2))}; ${Number(yExt.toFixed(2))})`,
          color: isCenterMax ? "#0284c7" : "#ea580c",
          isDashedToAxes: true
        }
      );

      extremaMarkdown = `Hàm số có 3 điểm cực trị:
- ${isCenterMax ? "Điểm cực đại của hàm số" : "Điểm cực tiểu của hàm số"}: $x = 0$, giá trị ${isCenterMax ? "cực đại" : "cực tiểu"} $y_{\\text{${isCenterMax ? "CĐ" : "CT"}}} = ${c}$ (điểm ${isCenterMax ? "cực đại" : "cực tiểu"} của đồ thị: $(0; ${c})$).
- Hai ${isCenterMax ? "điểm cực tiểu của hàm số" : "điểm cực đại của hàm số"}: $x = \\pm ${Number(xExt.toFixed(2))}$, giá trị ${isCenterMax ? "cực tiểu" : "cực đại"} $y_{\\text{${isCenterMax ? "CT" : "CĐ"}}} = ${Number(yExt.toFixed(2))}$ (hai điểm ${isCenterMax ? "cực tiểu" : "cực đại"} của đồ thị: $(\\pm ${Number(xExt.toFixed(2))}; ${Number(yExt.toFixed(2))})$).`;

      if (a > 0) {
        bbtPoints = [
          { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
          { x: Number(x1.toFixed(2)).toString(), yPrime: "0", yVal: Number(yExt.toFixed(2)).toString(), yPosition: "bottom" },
          { x: "0", yPrime: "0", yVal: c.toString(), yPosition: "top" },
          { x: Number(x2.toFixed(2)).toString(), yPrime: "0", yVal: Number(yExt.toFixed(2)).toString(), yPosition: "bottom" },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];
        bbtIntervals = [
          { trend: "decreasing", sign: "-" },
          { trend: "increasing", sign: "+" },
          { trend: "decreasing", sign: "-" },
          { trend: "increasing", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
          { x: Number(x1.toFixed(2)).toString(), yPrime: "0", yVal: Number(yExt.toFixed(2)).toString(), yPosition: "top" },
          { x: "0", yPrime: "0", yVal: c.toString(), yPosition: "bottom" },
          { x: Number(x2.toFixed(2)).toString(), yPrime: "0", yVal: Number(yExt.toFixed(2)).toString(), yPosition: "top" },
          { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
        ];
        bbtIntervals = [
          { trend: "increasing", sign: "+" },
          { trend: "decreasing", sign: "-" },
          { trend: "increasing", sign: "+" },
          { trend: "decreasing", sign: "-" }
        ];
      }
    } else {
      // 1 cực trị duy nhất tại x = 0
      const isMin = a > 0;
      points.push({
        x: 0,
        y: c,
        label: isMin ? `CT(0; ${c})` : `CĐ(0; ${c})`,
        color: isMin ? "#0284c7" : "#ea580c",
        isDashedToAxes: true
      });

      extremaMarkdown = `Hàm số có 1 điểm cực trị duy nhất:
- ${isMin ? "Điểm cực tiểu của hàm số" : "Điểm cực đại của hàm số"}: $x = 0$, giá trị ${isMin ? "cực tiểu" : "cực đại"} $y_{\\text{${isMin ? "CT" : "CĐ"}}} = ${c}$ (điểm ${isMin ? "cực tiểu" : "cực đại"} của đồ thị: $(0; ${c})$).`;

      if (a > 0) {
        bbtPoints = [
          { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
          { x: "0", yPrime: "0", yVal: c.toString(), yPosition: "bottom" },
          { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
        ];
        bbtIntervals = [
          { trend: "decreasing", sign: "-" },
          { trend: "increasing", sign: "+" }
        ];
      } else {
        bbtPoints = [
          { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
          { x: "0", yPrime: "0", yVal: c.toString(), yPosition: "top" },
          { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
        ];
        bbtIntervals = [
          { trend: "increasing", sign: "+" },
          { trend: "decreasing", sign: "-" }
        ];
      }
    }

    const fnPlot: FunctionPlotData = {
      id: "quartic",
      fn: (x) => a * Math.pow(x, 4) + b * Math.pow(x, 2) + c,
      color: "#2563eb",
      width: 2.5
    };

    return {
      a, b, c, points, fnPlot, bbtPoints, bbtIntervals, extremaMarkdown
    };
  }, [c4A, c4B, c4C]);

  // ==========================================
  // 5. ANALYSIS: HÀM BẬC HAI (PARABOL): y = ax^2 + bx + c
  // ==========================================
  const parabolaAnalysis = useMemo(() => {
    const a = pA === 0 ? 1 : pA;
    const b = pB;
    const c = pC;

    const delta = b * b - 4 * a * c;
    const xVertex = -b / (2 * a);
    const yVertex = -delta / (4 * a);

    const points: Point2D[] = [
      {
        x: Number(xVertex.toFixed(2)),
        y: Number(yVertex.toFixed(2)),
        label: `Đỉnh I(${Number(xVertex.toFixed(2))}; ${Number(yVertex.toFixed(2))})`,
        color: "#dc2626",
        isDashedToAxes: true
      },
      {
        x: 0,
        y: c,
        label: `Oy(0; ${c})`,
        color: "#2563eb",
        isDashedToAxes: true
      }
    ];

    if (delta > 0) {
      const x1 = (-b - Math.sqrt(delta)) / (2 * a);
      const x2 = (-b + Math.sqrt(delta)) / (2 * a);
      points.push(
        { x: Number(x1.toFixed(2)), y: 0, label: `x1=${Number(x1.toFixed(2))}`, color: "#16a34a" },
        { x: Number(x2.toFixed(2)), y: 0, label: `x2=${Number(x2.toFixed(2))}`, color: "#16a34a" }
      );
    }

    const asymptotes: AsymptoteLine[] = [
      {
        type: "vertical",
        value: xVertex,
        label: `Trục ĐX: x = ${Number(xVertex.toFixed(2))}`,
        color: "#9333ea"
      }
    ];

    const fnPlot: FunctionPlotData = {
      id: "parabola",
      fn: (x) => a * x * x + b * x + c,
      color: "#2563eb",
      width: 2.5
    };

    const isMin = a > 0;
    const bbtPoints: VariationTablePoint[] = isMin ? [
      { x: "-\\infty", yVal: "+\\infty", yPosition: "top" },
      { x: Number(xVertex.toFixed(2)).toString(), yPrime: "0", yVal: Number(yVertex.toFixed(2)).toString(), yPosition: "bottom" },
      { x: "+\\infty", yVal: "+\\infty", yPosition: "top" }
    ] : [
      { x: "-\\infty", yVal: "-\\infty", yPosition: "bottom" },
      { x: Number(xVertex.toFixed(2)).toString(), yPrime: "0", yVal: Number(yVertex.toFixed(2)).toString(), yPosition: "top" },
      { x: "+\\infty", yVal: "-\\infty", yPosition: "bottom" }
    ];

    const bbtIntervals: VariationInterval[] = isMin ? [
      { trend: "decreasing", sign: "-" },
      { trend: "increasing", sign: "+" }
    ] : [
      { trend: "increasing", sign: "+" },
      { trend: "decreasing", sign: "-" }
    ];

    return {
      a, b, c, delta, xVertex, yVertex, points, asymptotes, fnPlot, bbtPoints, bbtIntervals, isMin
    };
  }, [pA, pB, pC]);

  // Generate full markdown investigation report (Sơ đồ KSHS chuẩn SGK)
  const fullReportMarkdown = useMemo(() => {
    if (funcType === "cubic") {
      const { a, b, c, d, aPrime, bPrime, cPrime, roots, xInflection, yInflection, extremaMarkdown } = cubicAnalysis;
      const rootsTex = roots.length === 2 
        ? `$$y' = 0 \\iff \\left[\\begin{aligned} x &= ${Number(roots[0].toFixed(2))} \\\\ x &= ${Number(roots[1].toFixed(2))} \\end{aligned}\\right.$$`
        : `$$y' = 0 \\text{ vô nghiệm hoặc có nghiệm kép (hàm số không có cực trị)}$$`;

      return `### SƠ ĐỒ KHẢO SÁT HÀM SỐ BẬC BA: $y = ${formatCubic(a, b, c, d)}$

#### 1. Tập xác định:
$D = \\mathbb{R}$.

#### 2. Sự biến thiên:
- **Đạo hàm:**
  $$y' = ${formatQuadratic(aPrime, bPrime, cPrime)}$$

- **Nghiệm đạo hàm & Cực trị:**
  ${rootsTex}

  ${extremaMarkdown}

- **Giới hạn tại vô cực:**
  $$\\lim_{x \\to +\\infty} y = ${a > 0 ? "+\\infty" : "-\\infty"}, \\quad \\lim_{x \\to -\\infty} y = ${a > 0 ? "-\\infty" : "+\\infty"}$$

#### 3. Đồ thị:
- **Tâm đối xứng (Điểm uốn):** $I(${Number(xInflection.toFixed(2))}; ${Number(yInflection.toFixed(2))})$.
- **Giao điểm với trục tung:** Cho $x = 0 \\implies y = ${d}$, điểm $(0; ${d})$.
- Đồ thị nhận điểm uốn $I$ làm tâm đối xứng.`;
    } else if (funcType === "rational1_1") {
      const { a, b, c, d, adMinusBc, xAsymptote, yAsymptote } = rational1Analysis;
      const denomTex = `(${formatLinearEquation(c, 0, d).replace(/\s*=\s*0$/, '')})^2`;
      return `### SƠ ĐỒ KHẢO SÁT HÀM SỐ PHÂN THỨC: $y = \\frac{${formatLinearEquation(a, 0, b).replace(/\s*=\s*0$/, '')}}{${formatLinearEquation(c, 0, d).replace(/\s*=\s*0$/, '')}}$

#### 1. Tập xác định:
$D = \\mathbb{R} \\setminus \\{${Number(xAsymptote.toFixed(2))}\\}$.

#### 2. Sự biến thiên:
- **Đạo hàm:**
  $$y' = \\frac{ad - bc}{(${formatLinearEquation(c, 0, d).replace(/\s*=\s*0$/, '')})^2} = \\frac{${adMinusBc}}{(${formatLinearEquation(c, 0, d).replace(/\s*=\s*0$/, '')})^2}$$

  ${adMinusBc > 0 ? `Vì $y' > 0, \\forall x \\ne ${Number(xAsymptote.toFixed(2))}$ nên hàm số đồng biến trên từng khoảng xác định $(-\\infty; ${Number(xAsymptote.toFixed(2))})$ và $(${Number(xAsymptote.toFixed(2))}; +\\infty)$.` : `Vì $y' < 0, \\forall x \\ne ${Number(xAsymptote.toFixed(2))}$ nên hàm số nghịch biến trên từng khoảng xác định $(-\\infty; ${Number(xAsymptote.toFixed(2))})$ và $(${Number(xAsymptote.toFixed(2))}; +\\infty)$.`}

- **Cực trị:** Hàm số không có cực trị.

- **Giới hạn và Tiệm cận:**
  - $\\lim_{x \\to (${Number(xAsymptote.toFixed(2))})^-} y = ${adMinusBc > 0 ? "+\\infty" : "-\\infty"}$, $\\lim_{x \\to (${Number(xAsymptote.toFixed(2))})^+} y = ${adMinusBc > 0 ? "-\\infty" : "+\\infty"}$ $\\implies x = ${Number(xAsymptote.toFixed(2))}$ là **tiệm cận đứng**.
  - $\\lim_{x \\to \\pm\\infty} y = \\frac{${a}}{${c}} = ${Number(yAsymptote.toFixed(2))}$ $\\implies y = ${Number(yAsymptote.toFixed(2))}$ là **tiệm cận ngang**.

#### 3. Đồ thị:
- **Tâm đối xứng:** Đồ thị nhận giao điểm hai đường tiệm cận $I(${Number(xAsymptote.toFixed(2))}; ${Number(yAsymptote.toFixed(2))})$ làm tâm đối xứng.
- **Giao điểm với các trục tọa độ:**
  - Với $Oy$: Cho $x = 0 \\implies y = ${d !== 0 ? Number((b / d).toFixed(2)) : "không xác định"}$.
  - Với $Ox$: Cho $y = 0 \\implies x = ${a !== 0 ? Number((-b / a).toFixed(2)) : "vô nghiệm"}$.`;
    } else if (funcType === "rational2_1") {
      const { a, b, c, d, e, m, n, r, xAsymptote, yCenter, numA, numB, numC, deltaPrime, roots, extremaMarkdown, isBranchUp } = rational2Analysis;
      const rootsTex = roots.length === 2
        ? `$$y' = 0 \\iff \\left[\\begin{aligned} x &= ${Number(roots[0].toFixed(2))} \\\\ x &= ${Number(roots[1].toFixed(2))} \\end{aligned}\\right.$$`
        : `$$y' = 0 \\text{ vô nghiệm hoặc có nghiệm kép (}\\Delta' \\le 0\\text{)}$$`;

      return `### SƠ ĐỒ KHẢO SÁT HÀM SỐ PHÂN THỨC: $y = \\frac{${formatQuadratic(a, b, c)}}{${formatLinearEquation(d, 0, e).replace(/\s*=\s*0$/, '')}}$

#### 1. Tập xác định:
$D = \\mathbb{R} \\setminus \\{${Number(xAsymptote.toFixed(2))}\\}$.

#### 2. Dạng phân tích (Chia đa thức):
Thực hiện phép chia tử số cho mẫu số ta được:
$$y = (${formatLinearEquation(Number(m.toFixed(2)), 0, Number(n.toFixed(2))).replace(/\s*=\s*0$/, '')}) + \\frac{${Number(r.toFixed(2))}}{${formatLinearEquation(d, 0, e).replace(/\s*=\s*0$/, '')}}$$

#### 3. Sự biến thiên & Cực trị:
- **Đạo hàm:**
  $$y' = \\frac{${formatQuadratic(numA, numB, numC)}}{(${formatLinearEquation(d, 0, e).replace(/\s*=\s*0$/, '')})^2}$$

- **Nghiệm đạo hàm & Cực trị:**
  ${rootsTex}

  ${extremaMarkdown}

- **Đường tiệm cận đứng:**
  $$\\lim_{x \\to (${Number(xAsymptote.toFixed(2))})^-} y = ${isBranchUp ? "-\\infty" : "+\\infty"}, \\quad \\lim_{x \\to (${Number(xAsymptote.toFixed(2))})^+} y = ${isBranchUp ? "+\\infty" : "-\\infty"} \\implies x = ${Number(xAsymptote.toFixed(2))}$$

- **Đường tiệm cận xiên:**
  $$\\lim_{x \\to \\pm\\infty} \\left[ y - (${formatLinearEquation(Number(m.toFixed(2)), 0, Number(n.toFixed(2))).replace(/\s*=\s*0$/, '')}) \\right] = 0 \\implies y = ${formatLinearEquation(Number(m.toFixed(2)), 0, Number(n.toFixed(2))).replace(/\s*=\s*0$/, '')}$$

#### 4. Đồ thị:
- **Tâm đối xứng:** Giao điểm hai đường tiệm cận $I(${Number(xAsymptote.toFixed(2))}; ${Number(yCenter.toFixed(2))})$.
- **Giao điểm với $Oy$:** ${e !== 0 ? `$(0; ${Number((c / e).toFixed(2))})$` : "Không có giao điểm"}.`;
    } else if (funcType === "quartic") {
      const { a, b, c, extremaMarkdown } = quarticAnalysis;
      return `### SƠ ĐỒ KHẢO SÁT HÀM SỐ TRÙNG PHƯƠNG: $y = ${formatQuartic(a, b, c)}$

#### 1. Tập xác định:
$D = \\mathbb{R}$.

#### 2. Sự biến thiên:
- **Đạo hàm:**
  $$y' = ${4 * a}x^3 ${2 * b >= 0 ? "+ " + (2 * b) : "- " + Math.abs(2 * b)}x = 2x(${formatQuadratic(2 * a, 0, b)})$$

- **Cực trị:**
  ${extremaMarkdown}

- **Giới hạn tại vô cực:**
  $$\\lim_{x \\to \\pm\\infty} y = ${a > 0 ? "+\\infty" : "-\\infty"}$$

#### 3. Đồ thị:
- **Trục đối xứng:** Đồ thị nhận trục tung $Oy$ ($x = 0$) làm trục đối xứng.
- **Giao điểm với $Oy$:** Điểm $(0; ${c})$.`;
    } else {
      const { a, b, c, xVertex, yVertex, isMin } = parabolaAnalysis;
      return `### SƠ ĐỒ KHẢO SÁT HÀM SỐ BẬC HAI: $y = ${formatQuadratic(a, b, c)}$

#### 1. Tập xác định:
$D = \\mathbb{R}$.

#### 2. Sự biến thiên:
- **Đỉnh parabol:** $I(${Number(xVertex.toFixed(2))}; ${Number(yVertex.toFixed(2))})$.
- **Trục đối xứng:** Đường thẳng $x = ${Number(xVertex.toFixed(2))}$.
- **Chiều biến thiên:**
  ${isMin ? `Hàm số nghịch biến trên khoảng $(-\\infty; ${Number(xVertex.toFixed(2))})$ và đồng biến trên khoảng $(${Number(xVertex.toFixed(2))}; +\\infty)$.` : `Hàm số đồng biến trên khoảng $(-\\infty; ${Number(xVertex.toFixed(2))})$ và nghịch biến trên khoảng $(${Number(xVertex.toFixed(2))}; +\\infty)$.`}

  Giá trị ${isMin ? "nhỏ nhất" : "lớn nhất"} của hàm số là $y = ${Number(yVertex.toFixed(2))}$ tại $x = ${Number(xVertex.toFixed(2))}$.

#### 3. Đồ thị:
- Parabol có bề lõm quay ${isMin ? "lên trên" : "xuống dưới"}.
- Giao điểm với $Oy$: Điểm $(0; ${c})$.`;
    }
  }, [funcType, cubicAnalysis, rational1Analysis, rational2Analysis, quarticAnalysis, parabolaAnalysis]);

  // Handle Copy KSHS
  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(fullReportMarkdown);
      setCopiedKSHS(true);
      setTimeout(() => setCopiedKSHS(false), 2200);
    } catch {
      setCopiedKSHS(true);
      setTimeout(() => setCopiedKSHS(false), 2200);
    }
  };

  return (
    <div className="space-y-6">
      {/* Function Type Selector */}
      <div className="flex flex-wrap items-center bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200 text-xs font-semibold gap-1.5 shadow-2xs">
        <button
          onClick={() => setFuncType("cubic")}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            funcType === "cubic"
              ? "bg-white text-blue-800 font-bold shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="1. Hàm bậc ba: $y = ax^3 + bx^2 + cx + d$" />
        </button>
        <button
          onClick={() => setFuncType("rational1_1")}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            funcType === "rational1_1"
              ? "bg-white text-indigo-800 font-bold shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="2. Hàm phân thức: $y = \frac{ax + b}{cx + d}$" />
        </button>
        <button
          onClick={() => setFuncType("rational2_1")}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            funcType === "rational2_1"
              ? "bg-white text-emerald-800 font-bold shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="3. Hàm phân thức: $y = \frac{ax^2 + bx + c}{dx + e}$" />
        </button>
        <button
          onClick={() => setFuncType("quartic")}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            funcType === "quartic"
              ? "bg-white text-purple-800 font-bold shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="4. Hàm trùng phương: $y = ax^4 + bx^2 + c$" />
        </button>
        <button
          onClick={() => setFuncType("parabola")}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            funcType === "parabola"
              ? "bg-white text-amber-800 font-bold shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MathSpan content="5. Hàm bậc hai: $y = ax^2 + bx + c$" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls & Report (Left Column) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {funcType === "cubic" && <MathSpan content="Khảo sát hàm số bậc ba: $y = ax^3 + bx^2 + cx + d$" />}
                  {funcType === "rational1_1" && <MathSpan content="Khảo sát hàm phân thức: $y = \frac{ax + b}{cx + d}$" />}
                  {funcType === "rational2_1" && <MathSpan content="Khảo sát hàm phân thức: $y = \frac{ax^2 + bx + c}{dx + e}$" />}
                  {funcType === "quartic" && <MathSpan content="Khảo sát hàm trùng phương: $y = ax^4 + bx^2 + c$" />}
                  {funcType === "parabola" && <MathSpan content="Khảo sát hàm số bậc hai: $y = ax^2 + bx + c$" />}
                </h3>
                <p className="text-xs text-slate-500">Chuẩn quy cách SGK GDPT 2018 (Toán THPT)</p>
              </div>

              {/* Copy full report button */}
              <button
                onClick={handleCopyReport}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sao chép toàn bộ bài KSHS (Word/Markdown)"
              >
                {copiedKSHS ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKSHS ? "Đã sao chép!" : "Chép lời giải"}</span>
              </button>
            </div>

            {/* 1. HÀM BẬC BA */}
            {funcType === "cubic" && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="Hệ số $a$" />
                    </label>
                    <input
                      type="number"
                      value={c3A}
                      onChange={e => setC3A(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="Hệ số $b$" />
                    </label>
                    <input
                      type="number"
                      value={c3B}
                      onChange={e => setC3B(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="Hệ số $c$" />
                    </label>
                    <input
                      type="number"
                      value={c3C}
                      onChange={e => setC3C(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="Hệ số $d$" />
                    </label>
                    <input
                      type="number"
                      value={c3D}
                      onChange={e => setC3D(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 1, b: -3, c: 0, d: 2, label: "y = x^3 - 3x + 2" },
                    { a: -1, b: 3, c: 0, d: -1, label: "y = -x^3 + 3x - 1" },
                    { a: 1, b: 0, c: -3, d: 0, label: "y = x^3 - 3x" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setC3A(p.a); setC3B(p.b); setC3C(p.c); setC3D(p.d); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 rounded text-xs cursor-pointer"
                    >
                      <MathSpan content={`$${p.label}$`} />
                    </button>
                  ))}
                </div>

                {/* Variation Table */}
                <VariationTable
                  title="Bảng biến thiên hàm bậc ba (Toán 12)"
                  points={cubicAnalysis.bbtPoints}
                  intervals={cubicAnalysis.bbtIntervals}
                  showDerivative={true}
                />
              </div>
            )}

            {/* 2. HÀM PHÂN THỨC 1/1 */}
            {funcType === "rational1_1" && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="Hệ số $a$" />
                    </label>
                    <input
                      type="number"
                      value={r1A}
                      onChange={e => setR1A(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="Hệ số $b$" />
                    </label>
                    <input
                      type="number"
                      value={r1B}
                      onChange={e => setR1B(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="Hệ số $c$" />
                    </label>
                    <input
                      type="number"
                      value={r1C}
                      onChange={e => setR1C(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="Hệ số $d$" />
                    </label>
                    <input
                      type="number"
                      value={r1D}
                      onChange={e => setR1D(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 2, b: -1, c: 1, d: 1, label: "y = \\frac{2x - 1}{x + 1}" },
                    { a: 1, b: 2, c: 1, d: -1, label: "y = \\frac{x + 2}{x - 1}" },
                    { a: -1, b: 1, c: 1, d: 1, label: "y = \\frac{-x + 1}{x + 1}" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setR1A(p.a); setR1B(p.b); setR1C(p.c); setR1D(p.d); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 rounded text-xs cursor-pointer"
                    >
                      <MathSpan content={`$${p.label}$`} />
                    </button>
                  ))}
                </div>

                <VariationTable
                  title="Bảng biến thiên hàm phân thức 1/1 (Toán 12)"
                  points={rational1Analysis.bbtPoints}
                  intervals={rational1Analysis.bbtIntervals}
                  showDerivative={true}
                />
              </div>
            )}

            {/* 3. HÀM PHÂN THỨC 2/1 */}
            {funcType === "rational2_1" && (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-1.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$a (x^2)$" />
                    </label>
                    <input
                      type="number"
                      value={r2A}
                      onChange={e => setR2A(parseFloat(e.target.value) || 1)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$b (x)$" />
                    </label>
                    <input
                      type="number"
                      value={r2B}
                      onChange={e => setR2B(parseFloat(e.target.value) || 0)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$c$" />
                    </label>
                    <input
                      type="number"
                      value={r2C}
                      onChange={e => setR2C(parseFloat(e.target.value) || 0)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$d (x)$" />
                    </label>
                    <input
                      type="number"
                      value={r2D}
                      onChange={e => setR2D(parseFloat(e.target.value) || 1)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$e$" />
                    </label>
                    <input
                      type="number"
                      value={r2E}
                      onChange={e => setR2E(parseFloat(e.target.value) || 0)}
                      className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Quick Presets chuẩn SGK Toán 12 Mới */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 1, b: -2, c: 2, d: 1, e: -1, label: "y = \\frac{x^2 - 2x + 2}{x - 1}" },
                    { a: 1, b: 2, c: -2, d: 1, e: 1, label: "y = \\frac{x^2 + 2x - 2}{x + 1}" },
                    { a: -1, b: 2, c: 3, d: 1, e: -1, label: "y = \\frac{-x^2 + 2x + 3}{x - 1}" },
                    { a: 1, b: -1, c: 1, d: 1, e: -1, label: "y = \\frac{x^2 - x + 1}{x - 1}" },
                    { a: 1, b: 0, c: 1, d: 1, e: 0, label: "y = \\frac{x^2 + 1}{x}" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setR2A(p.a); setR2B(p.b); setR2C(p.c); setR2D(p.d); setR2E(p.e); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 rounded text-xs cursor-pointer transition-colors"
                    >
                      <MathSpan content={`$${p.label}$`} />
                    </button>
                  ))}
                </div>

                <VariationTable
                  title="Bảng biến thiên hàm phân thức 2/1 (Toán 12 GDPT 2018)"
                  points={rational2Analysis.bbtPoints}
                  intervals={rational2Analysis.bbtIntervals}
                  showDerivative={true}
                />
              </div>
            )}

            {/* 4. HÀM TRÙNG PHƯƠNG */}
            {funcType === "quartic" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$a (x^4)$" />
                    </label>
                    <input
                      type="number"
                      value={c4A}
                      onChange={e => setC4A(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$b (x^2)$" />
                    </label>
                    <input
                      type="number"
                      value={c4B}
                      onChange={e => setC4B(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$c$" />
                    </label>
                    <input
                      type="number"
                      value={c4C}
                      onChange={e => setC4C(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 1, b: -2, c: -1, label: "y = x^4 - 2x^2 - 1" },
                    { a: -1, b: 2, c: 3, label: "y = -x^4 + 2x^2 + 3" },
                    { a: 1, b: 2, c: 1, label: "y = x^4 + 2x^2 + 1" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setC4A(p.a); setC4B(p.b); setC4C(p.c); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-purple-50 text-slate-700 rounded text-xs cursor-pointer"
                    >
                      <MathSpan content={`$${p.label}$`} />
                    </button>
                  ))}
                </div>

                <VariationTable
                  title="Bảng biến thiên hàm trùng phương (Toán 12)"
                  points={quarticAnalysis.bbtPoints}
                  intervals={quarticAnalysis.bbtIntervals}
                  showDerivative={true}
                />
              </div>
            )}

            {/* 5. HÀM BẬC HAI (PARABOL) */}
            {funcType === "parabola" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$a (x^2)$" />
                    </label>
                    <input
                      type="number"
                      value={pA}
                      onChange={e => setPA(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$b (x)$" />
                    </label>
                    <input
                      type="number"
                      value={pB}
                      onChange={e => setPB(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      <MathSpan content="$c$" />
                    </label>
                    <input
                      type="number"
                      value={pC}
                      onChange={e => setPC(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { a: 1, b: -4, c: 3, label: "y = x^2 - 4x + 3" },
                    { a: -1, b: 2, c: 3, label: "y = -x^2 + 2x + 3" },
                    { a: 2, b: -4, c: 1, label: "y = 2x^2 - 4x + 1" }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setPA(p.a); setPB(p.b); setPC(p.c); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-amber-50 text-slate-700 rounded text-xs cursor-pointer"
                    >
                      <MathSpan content={`$${p.label}$`} />
                    </button>
                  ))}
                </div>

                <VariationTable
                  title="Bảng biến thiên Parabol (Toán THPT)"
                  points={parabolaAnalysis.bbtPoints}
                  intervals={parabolaAnalysis.bbtIntervals}
                  showDerivative={true}
                />
              </div>
            )}

            {/* Markdown Report Render */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
              <MarkdownRenderer content={fullReportMarkdown} />
            </div>
          </div>
        </div>

        {/* Graph View (Right Column) */}
        <div className="lg:col-span-7">
          {funcType === "cubic" && (
            <InteractivePlot
              title={`Đồ thị hàm bậc ba: y = ${c3A}x³ ${c3B >= 0 ? "+ " + c3B : "- " + Math.abs(c3B)}x² ${c3C >= 0 ? "+ " + c3C : "- " + Math.abs(c3C)}x ${c3D >= 0 ? "+ " + c3D : "- " + Math.abs(c3D)}`}
              subtitle="Tâm đối xứng (điểm uốn) và các điểm cực đại / cực tiểu"
              functions={[cubicAnalysis.fnPlot]}
              points={cubicAnalysis.points}
              defaultXRange={[-5, 5]}
              defaultYRange={[-6, 6]}
              height={480}
            />
          )}

          {funcType === "rational1_1" && (
            <InteractivePlot
              title={`Đồ thị hàm số: y = (${r1A}x ${r1B >= 0 ? "+ " + r1B : "- " + Math.abs(r1B)}) / (${r1C}x ${r1D >= 0 ? "+ " + r1D : "- " + Math.abs(r1D)})`}
              subtitle="Tiệm cận đứng (đỏ), tiệm cận ngang (xanh) và tâm đối xứng I"
              functions={[rational1Analysis.fnPlot]}
              points={rational1Analysis.points}
              asymptotes={rational1Analysis.asymptotes}
              defaultXRange={[-7, 7]}
              defaultYRange={[-6, 6]}
              height={480}
            />
          )}

          {funcType === "rational2_1" && (
            <InteractivePlot
              title={`Đồ thị hàm số: y = (${r2A}x² ${r2B >= 0 ? "+ " + r2B : "- " + Math.abs(r2B)}x ${r2C >= 0 ? "+ " + r2C : "- " + Math.abs(r2C)}) / (${r2D}x ${r2E >= 0 ? "+ " + r2E : "- " + Math.abs(r2E)})`}
              subtitle="Tiệm cận đứng, tiệm cận xiên và tâm đối xứng I"
              functions={[rational2Analysis.fnPlot]}
              points={rational2Analysis.points}
              asymptotes={rational2Analysis.asymptotes}
              defaultXRange={[-7, 7]}
              defaultYRange={[-7, 7]}
              height={480}
            />
          )}

          {funcType === "quartic" && (
            <InteractivePlot
              title={`Đồ thị hàm trùng phương: y = ${c4A}x⁴ ${c4B >= 0 ? "+ " + c4B : "- " + Math.abs(c4B)}x² ${c4C >= 0 ? "+ " + c4C : "- " + Math.abs(c4C)}`}
              subtitle="Trục đối xứng Oy và các điểm cực trị"
              functions={[quarticAnalysis.fnPlot]}
              points={quarticAnalysis.points}
              defaultXRange={[-5, 5]}
              defaultYRange={[-6, 6]}
              height={480}
            />
          )}

          {funcType === "parabola" && (
            <InteractivePlot
              title={`Đồ thị Parabol: y = ${pA}x² ${pB >= 0 ? "+ " + pB : "- " + Math.abs(pB)}x ${pC >= 0 ? "+ " + pC : "- " + Math.abs(pC)}`}
              subtitle="Đỉnh I, trục đối xứng và các giao điểm tọa độ"
              functions={[parabolaAnalysis.fnPlot]}
              points={parabolaAnalysis.points}
              asymptotes={parabolaAnalysis.asymptotes}
              defaultXRange={[-6, 6]}
              defaultYRange={[-6, 6]}
              height={480}
            />
          )}
        </div>
      </div>
    </div>
  );
};
