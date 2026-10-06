import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Compass, TrendingUp, Sliders, Play, Pause, RotateCcw, Camera, 
  Copy, Check, Eye, Layers, Sparkles, HelpCircle, Activity, 
  ArrowRight, ShieldCheck, Zap, Info, ChevronRight
} from 'lucide-react';
import { evaluate } from 'mathjs';

// ============================================================================
// TYPES & PRESET BASE FUNCTIONS
// ============================================================================

export type BaseFuncType = 'cubic' | 'rational1_1' | 'rational2_1' | 'quartic' | 'parabola' | 'custom';

export type TransformType = 'none' | 'abs_f' | 'f_abs' | 'abs_f_abs' | 'shift_custom';

export interface BaseFuncPreset {
  id: BaseFuncType;
  name: string;
  categoryLabel: string;
  defaultFormula: string;
  defaultParams: { a: number; b: number; c: number; d: number; e: number };
  evalFn: (x: number, p: { a: number; b: number; c: number; d: number; e: number }) => number;
}

export const BASE_PRESETS: BaseFuncPreset[] = [
  {
    id: 'cubic',
    name: '1. Hàm bậc ba: y = ax³ + bx² + cx + d',
    categoryLabel: 'Toán 12 SGK',
    defaultFormula: 'x^3 - 3*x^2 + 2',
    defaultParams: { a: 1, b: -3, c: 0, d: 2, e: 0 },
    evalFn: (x, { a, b, c, d }) => a * Math.pow(x, 3) + b * Math.pow(x, 2) + c * x + d
  },
  {
    id: 'rational1_1',
    name: '2. Hàm phân thức 1/1: y = (ax + b)/(cx + d)',
    categoryLabel: 'Toán 12 SGK',
    defaultFormula: '(2*x - 1)/(x + 1)',
    defaultParams: { a: 2, b: -1, c: 1, d: 1, e: 0 },
    evalFn: (x, { a, b, c, d }) => (c * x + d === 0 ? NaN : (a * x + b) / (c * x + d))
  },
  {
    id: 'rational2_1',
    name: '3. Hàm phân thức 2/1: y = (ax² + bx + c)/(dx + e)',
    categoryLabel: 'Toán 12 Mới',
    defaultFormula: '(x^2 + x + 1)/(x - 1)',
    defaultParams: { a: 1, b: 1, c: 1, d: 1, e: -1 },
    evalFn: (x, { a, b, c, d, e }) => (d * x + e === 0 ? NaN : (a * x * x + b * x + c) / (d * x + e))
  },
  {
    id: 'quartic',
    name: '4. Hàm trùng phương: y = ax⁴ + bx² + c',
    categoryLabel: 'Toán 12 SGK',
    defaultFormula: 'x^4 - 2*x^2 - 1',
    defaultParams: { a: 1, b: -2, c: -1, d: 0, e: 0 },
    evalFn: (x, { a, b, c }) => a * Math.pow(x, 4) + b * Math.pow(x, 2) + c
  },
  {
    id: 'parabola',
    name: '5. Hàm bậc hai (Parabol): y = ax² + bx + c',
    categoryLabel: 'Toán 10 SGK',
    defaultFormula: 'x^2 - 2*x - 1',
    defaultParams: { a: 1, b: -2, c: -1, d: 0, e: 0 },
    evalFn: (x, { a, b, c }) => a * x * x + b * x + c
  },
  {
    id: 'custom',
    name: '6. Tùy nhập f(x): Lượng giác, Mũ, Logarit',
    categoryLabel: 'Biểu thức tự do',
    defaultFormula: 'sin(x)',
    defaultParams: { a: 1, b: 0, c: 0, d: 0, e: 0 },
    evalFn: (x) => Math.sin(x)
  }
];

export interface GraphTransformationsModuleProps {
  onInsertImage?: (base64Png: string) => void;
}

export const GraphTransformationsModule: React.FC<GraphTransformationsModuleProps> = ({ onInsertImage }) => {
  // Base Function Selection & Custom Input
  const [funcType, setFuncType] = useState<BaseFuncType>('cubic');
  const [customExpression, setCustomExpression] = useState<string>('x^3 - 3*x^2 + 2');

  // Function Coefficients
  const [coefA, setCoefA] = useState<number>(1);
  const [coefB, setCoefB] = useState<number>(-3);
  const [coefC, setCoefC] = useState<number>(0);
  const [coefD, setCoefD] = useState<number>(2);
  const [coefE, setCoefE] = useState<number>(0);

  // Shift & Scale Transformations
  const [shiftP, setShiftP] = useState<number>(0); // Vertical shift y = f(x) + p
  const [shiftQ, setShiftQ] = useState<number>(0); // Horizontal shift y = f(x - q)
  const [scaleK, setScaleK] = useState<number>(1); // Vertical stretch k * f(x)
  const [scaleM, setScaleM] = useState<number>(1); // Horizontal stretch f(m * x)

  // Absolute Value Transformations
  const [transformType, setTransformType] = useState<TransformType>('none');
  const [stepIndex, setStepIndex] = useState<number>(3); // 1, 2, 3 for step-by-step animation

  // Derivative & Tangent Line
  const [showDerivative, setShowDerivative] = useState<boolean>(false);
  const [tangentX, setTangentX] = useState<number>(1.5); // Tangent point M(x_M, y_M)
  const [showTangent, setShowTangent] = useState<boolean>(true);

  // Equation Roots / Intersection Line y = m
  const [showLineM, setShowLineM] = useState<boolean>(false);
  const [lineMVal, setLineMVal] = useState<number>(0);

  // View Range
  const [xRange, setXRange] = useState<[number, number]>([-6, 6]);
  const [yRange, setYRange] = useState<[number, number]>([-6, 6]);

  // Copy Status
  const [copied, setCopied] = useState<boolean>(false);

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Evaluate raw base function f(x)
  const evalBaseF = useCallback((x: number): number => {
    if (funcType === 'custom') {
      try {
        const val = evaluate(customExpression, { x });
        return typeof val === 'number' && isFinite(val) ? val : NaN;
      } catch {
        return NaN;
      }
    }
    const params = { a: coefA, b: coefB, c: coefC, d: coefD, e: coefE };
    const preset = BASE_PRESETS.find(p => p.id === funcType) || BASE_PRESETS[0];
    return preset.evalFn(x, params);
  }, [funcType, customExpression, coefA, coefB, coefC, coefD, coefE]);

  // Evaluate transformed function g(x) according to sliders and absolute value mode
  const evalTransformedG = useCallback((x: number): number => {
    // 1. Apply Horizontal shift & scale: x_in = m * (x - q)
    const xIn = scaleM * (x - shiftQ);
    let baseVal = evalBaseF(xIn);
    if (isNaN(baseVal)) return NaN;

    // 2. Apply Vertical scale & shift: y_in = k * f(x_in) + p
    let yVal = scaleK * baseVal + shiftP;

    // 3. Apply Absolute Value Transformations
    if (transformType === 'abs_f') {
      // y = |f(x)|
      if (stepIndex === 1) {
        // Step 1: Only above Ox
        return yVal >= 0 ? yVal : NaN;
      } else if (stepIndex === 2) {
        // Step 2: Flipped version below Ox
        return Math.abs(yVal);
      } else {
        // Step 3: Full |f(x)|
        return Math.abs(yVal);
      }
    } else if (transformType === 'f_abs') {
      // y = f(|x|)
      const absX = Math.abs(x);
      const absXIn = scaleM * (absX - shiftQ);
      const baseAbsVal = evalBaseF(absXIn);
      if (isNaN(baseAbsVal)) return NaN;
      const yAbsVal = scaleK * baseAbsVal + shiftP;

      if (stepIndex === 1) {
        // Step 1: x >= 0 only
        return x >= 0 ? yVal : NaN;
      } else {
        // Step 2 & 3: Full f(|x|)
        return yAbsVal;
      }
    } else if (transformType === 'abs_f_abs') {
      // y = |f(|x|)|
      const absX = Math.abs(x);
      const absXIn = scaleM * (absX - shiftQ);
      const baseAbsVal = evalBaseF(absXIn);
      if (isNaN(baseAbsVal)) return NaN;
      return Math.abs(scaleK * baseAbsVal + shiftP);
    }

    return yVal;
  }, [evalBaseF, shiftP, shiftQ, scaleK, scaleM, transformType, stepIndex]);

  // Numerical Derivative f'(x)
  const evalDerivativeF = useCallback((x: number): number => {
    const eps = 0.001;
    const yPlus = evalTransformedG(x + eps);
    const yMinus = evalTransformedG(x - eps);
    if (isNaN(yPlus) || isNaN(yMinus)) return NaN;
    return (yPlus - yMinus) / (2 * eps);
  }, [evalTransformedG]);

  // Find Intersections with line y = m
  const findIntersections = useMemo(() => {
    if (!showLineM) return [];
    const roots: { x: number; y: number }[] = [];
    const steps = 400;
    const [minX, maxX] = xRange;
    const dx = (maxX - minX) / steps;

    for (let i = 0; i < steps; i++) {
      const x1 = minX + i * dx;
      const x2 = x1 + dx;
      const y1 = evalTransformedG(x1) - lineMVal;
      const y2 = evalTransformedG(x2) - lineMVal;

      if (!isNaN(y1) && !isNaN(y2) && y1 * y2 <= 0) {
        const rootX = x1 + (dx * Math.abs(y1)) / (Math.abs(y1) + Math.abs(y2));
        roots.push({ x: rootX, y: lineMVal });
      }
    }
    return roots;
  }, [showLineM, lineMVal, evalTransformedG, xRange]);

  // Render Canvas
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 520;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const [minX, maxX] = xRange;
    const [minY, maxY] = yRange;

    // Coordinate Mapping
    const toPxX = (x: number) => ((x - minX) / (maxX - minX)) * width;
    const toPxY = (y: number) => height - ((y - minY) / (maxY - minY)) * height;

    // Dark Background
    ctx.fillStyle = '#0f172a'; // Slate-900
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e293b'; // Slate-800
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';

    const stepX = 1;
    for (let x = Math.ceil(minX); x <= maxX; x += stepX) {
      const px = toPxX(x);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
      if (x !== 0) ctx.fillText(x.toString(), px - 6, toPxY(0) + 15);
    }

    const stepY = 1;
    for (let y = Math.ceil(minY); y <= maxY; y += stepY) {
      const py = toPxY(y);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
      if (y !== 0) ctx.fillText(y.toString(), toPxX(0) + 6, py + 4);
    }

    // 2. Axes (Ox, Oy)
    const pxZeroX = toPxX(0);
    const pyZeroY = toPxY(0);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#475569'; // Slate-600

    // Ox Axis
    ctx.beginPath();
    ctx.moveTo(0, pyZeroY);
    ctx.lineTo(width, pyZeroY);
    ctx.stroke();

    // Oy Axis
    ctx.beginPath();
    ctx.moveTo(pxZeroX, 0);
    ctx.lineTo(pxZeroX, height);
    ctx.stroke();

    // Axis Labels x, y, O
    ctx.font = "bold 13px 'Times New Roman', serif";
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('O', pxZeroX - 14, pyZeroY + 16);
    ctx.fillText('x', width - 16, pyZeroY - 8);
    ctx.fillText('y', pxZeroX + 8, 16);

    // 3. Draw Base Function f(x) (Dashed Muted Line for comparison)
    ctx.save();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    let started = false;

    const samplePts = 600;
    const dx = (maxX - minX) / samplePts;

    for (let i = 0; i <= samplePts; i++) {
      const x = minX + i * dx;
      const y = evalBaseF(x);
      if (isNaN(y) || y < minY - 5 || y > maxY + 5) {
        started = false;
        continue;
      }
      const px = toPxX(x);
      const py = toPxY(y);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.restore();

    // 4. Draw Derivative Function f'(x) if enabled
    if (showDerivative) {
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#a855f7'; // Purple-500
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      started = false;

      for (let i = 0; i <= samplePts; i++) {
        const x = minX + i * dx;
        const yDeriv = evalDerivativeF(x);
        if (isNaN(yDeriv) || yDeriv < minY - 5 || yDeriv > maxY + 5) {
          started = false;
          continue;
        }
        const px = toPxX(x);
        const py = toPxY(yDeriv);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw Transformed Function g(x) (Glow Solid Emerald / Cyan)
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = transformType !== 'none' ? '#06b6d4' : '#10b981'; // Cyan if transformed, Emerald if normal
    ctx.shadowColor = transformType !== 'none' ? '#06b6d4' : '#10b981';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    started = false;

    for (let i = 0; i <= samplePts; i++) {
      const x = minX + i * dx;
      const y = evalTransformedG(x);
      if (isNaN(y) || y < minY - 5 || y > maxY + 5) {
        started = false;
        continue;
      }
      const px = toPxX(x);
      const py = toPxY(y);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.restore();

    // 6. Draw Tangent Line at M(x_M, y_M) if Tangent Enabled
    if (showTangent) {
      const yM = evalTransformedG(tangentX);
      const slopeK = evalDerivativeF(tangentX);

      if (!isNaN(yM) && !isNaN(slopeK)) {
        const pxM = toPxX(tangentX);
        const pyM = toPxY(yM);

        // Tangent line endpoints
        const xLeft = minX;
        const yLeft = slopeK * (xLeft - tangentX) + yM;
        const xRight = maxX;
        const yRight = slopeK * (xRight - tangentX) + yM;

        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f59e0b'; // Amber-500
        ctx.beginPath();
        ctx.moveTo(toPxX(xLeft), toPxY(yLeft));
        ctx.lineTo(toPxX(xRight), toPxY(yRight));
        ctx.stroke();

        // Point M dot
        ctx.beginPath();
        ctx.arc(pxM, pyM, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Label M
        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`M(${tangentX.toFixed(1)}; ${yM.toFixed(1)}), k=${slopeK.toFixed(2)}`, pxM + 10, pyM - 10);
        ctx.restore();
      }
    }

    // 7. Draw Horizontal Line y = m and Intersection Dots
    if (showLineM) {
      const pyM = toPxY(lineMVal);

      ctx.save();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#ef4444'; // Red-500 line y = m
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, pyM);
      ctx.lineTo(width, pyM);
      ctx.stroke();

      // Intersection points
      findIntersections.forEach(pt => {
        const px = toPxX(pt.x);
        const py = toPxY(pt.y);

        // Pulsing red dot
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Label root
        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`x = ${pt.x.toFixed(2)}`, px - 20, py - 10);
      });
      ctx.restore();
    }
  }, [xRange, yRange, evalBaseF, evalTransformedG, evalDerivativeF, showDerivative, showTangent, tangentX, showLineM, lineMVal, findIntersections, transformType]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Window resize
  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // Copy PNG image to clipboard / download
  const handleCopyImage = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (onInsertImage) {
      onInsertImage(dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } else {
      const link = document.createElement('a');
      link.download = `graph_transformation.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl flex flex-col overflow-hidden w-full">
      {/* HEADER BAR */}
      <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Mô Phỏng Động Biến Đổi Đồ Thị Hàm Số
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Giải Tích THPT GDPT 2018
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Tịnh tiến, co giãn, đồ thị trị tuyệt đối |f(x)|, f(|x|), tiếp tuyến động và biện luận số nghiệm phương trình
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyImage}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Camera className="w-4 h-4 text-white" />}
            <span>{copied ? 'Đã chép ảnh!' : 'Chụp ảnh PNG trong suốt'}</span>
          </button>
        </div>
      </div>

      {/* MAIN BODY: CONTROL PANEL (LEFT) + CANVAS GRAPH (RIGHT) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: BASE FUNCTIONS & TRANSFORM OPERATORS */}
        <div className="lg:col-span-4 bg-slate-950/60 p-4 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto space-y-4 custom-scrollbar">
          {/* 1. BASE FUNCTION SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>1. Chọn dạng hàm gốc f(x)</span>
            </label>

            <div className="grid grid-cols-1 gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs">
              {BASE_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setFuncType(p.id);
                    setCustomExpression(p.defaultFormula);
                    setCoefA(p.defaultParams.a);
                    setCoefB(p.defaultParams.b);
                    setCoefC(p.defaultParams.c);
                    setCoefD(p.defaultParams.d);
                    setCoefE(p.defaultParams.e);
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                    funcType === p.id
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span>{p.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                    {p.categoryLabel}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom formula input */}
            {funcType === 'custom' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={customExpression}
                  onChange={e => setCustomExpression(e.target.value)}
                  placeholder="Nhập f(x) ví dụ: sin(x), e^x, x^3 - 3*x"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* 2. ABSOLUTE VALUE TRANSFORMATION MODES */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Phép biến đổi Giá trị tuyệt đối (Trọng tâm)</span>
            </label>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => { setTransformType('none'); setStepIndex(3); }}
                className={`p-2 rounded-lg font-semibold transition-all cursor-pointer text-left ${
                  transformType === 'none'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                Gốc y = f(x)
              </button>

              <button
                onClick={() => { setTransformType('abs_f'); setStepIndex(3); }}
                className={`p-2 rounded-lg font-semibold transition-all cursor-pointer text-left ${
                  transformType === 'abs_f'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                Dạng 1: y = |f(x)|
              </button>

              <button
                onClick={() => { setTransformType('f_abs'); setStepIndex(3); }}
                className={`p-2 rounded-lg font-semibold transition-all cursor-pointer text-left ${
                  transformType === 'f_abs'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                Dạng 2: y = f(|x|)
              </button>

              <button
                onClick={() => { setTransformType('abs_f_abs'); setStepIndex(3); }}
                className={`p-2 rounded-lg font-semibold transition-all cursor-pointer text-left ${
                  transformType === 'abs_f_abs'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                Dạng 3: y = |f(|x|)|
              </button>
            </div>

            {/* Step-by-step Animation Pills */}
            {transformType !== 'none' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[11px] text-amber-300 font-bold flex items-center justify-between">
                  <span>Xem quy tắc từng bước:</span>
                  <span>Bước {stepIndex} / 3</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  <button
                    onClick={() => setStepIndex(1)}
                    className={`py-1 rounded font-medium cursor-pointer ${
                      stepIndex === 1 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    Bước 1: Giữ
                  </button>
                  <button
                    onClick={() => setStepIndex(2)}
                    className={`py-1 rounded font-medium cursor-pointer ${
                      stepIndex === 2 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    Bước 2: Lật
                  </button>
                  <button
                    onClick={() => setStepIndex(3)}
                    className={`py-1 rounded font-medium cursor-pointer ${
                      stepIndex === 3 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    Bước 3: Xóa
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. SHIFT & SCALE SLIDERS */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-3 text-xs">
            <label className="font-bold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Tịnh tiến & Co giãn đồ thị</span>
            </label>

            {/* Vertical shift p */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>Tịnh tiến đứng $y = f(x) + p$:</span>
                <span className="text-emerald-400 font-mono font-bold">p = {shiftP.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={shiftP}
                onChange={e => setShiftP(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Horizontal shift q */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>Tịnh tiến ngang $y = f(x - q)$:</span>
                <span className="text-emerald-400 font-mono font-bold">q = {shiftQ.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={shiftQ}
                onChange={e => setShiftQ(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* 4. TANGENT & INTERSECTION LINE Y = M */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-3 text-xs">
            <label className="font-bold text-slate-200 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              <span>4. Đạo hàm, Tiếp tuyến & Tương giao y = m</span>
            </label>

            {/* Derivative toggle */}
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={showDerivative}
                onChange={e => setShowDerivative(e.target.checked)}
                className="rounded accent-purple-500"
              />
              <span className="text-purple-300">Hiện Đồ thị Đạo hàm $y = f'(x)$ (Tím)</span>
            </label>

            {/* Tangent line slider */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>Tiếp tuyến tại điểm $M(x_M)$:</span>
                <span className="text-amber-400 font-mono font-bold">x_M = {tangentX.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="-4"
                max="4"
                step="0.1"
                value={tangentX}
                onChange={e => setTangentX(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Line y = m intersection */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer font-semibold text-rose-400">
                <input
                  type="checkbox"
                  checked={showLineM}
                  onChange={e => setShowLineM(e.target.checked)}
                  className="rounded accent-rose-500"
                />
                <span>Biện luận số nghiệm với $d: y = m$</span>
              </label>

              {showLineM && (
                <div className="space-y-1 pl-5">
                  <div className="flex justify-between text-slate-300">
                    <span>Tham số m:</span>
                    <span className="text-rose-400 font-mono font-bold">m = {lineMVal.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.2"
                    value={lineMVal}
                    onChange={e => setLineMVal(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 2D CANVAS GRAPH & CHEAT SHEET */}
        <div className="lg:col-span-8 bg-slate-900 relative flex flex-col items-center justify-center min-h-[460px]">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '520px' }}
            className="w-full h-full select-none"
          />

          {/* REALTIME INTERSECTION ROOTS STATUS BADGE */}
          {showLineM && (
            <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-rose-500/40 text-xs shadow-2xl flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold text-rose-300">
                Phương trình $g(x) = {lineMVal.toFixed(1)}$ có <b>{findIntersections.length}</b> nghiệm phân biệt
              </span>
            </div>
          )}

          {/* CHEAT SHEET RULE OVERLAY */}
          {transformType !== 'none' && (
            <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] text-slate-300 max-w-md space-y-1 shadow-lg pointer-events-none">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Quy tắc ghi nhớ nhanh:</span>
              </div>
              {transformType === 'abs_f' && (
                <p className="leading-relaxed">
                  Đồ thị $y = |f(x)|$: Giữ phần <b>trên Ox</b> ($y \ge 0$), lật phần <b>dưới Ox</b> lên trên qua Ox, sau đó bỏ phần dưới.
                </p>
              )}
              {transformType === 'f_abs' && (
                <p className="leading-relaxed">
                  Đồ thị $y = f(|x|)$: Giữ phần <b>phải Oy</b> ($x \ge 0$), bỏ phần <b>trái Oy</b>, lấy đối xứng phần phải qua Oy.
                </p>
              )}
              {transformType === 'abs_f_abs' && (
                <p className="leading-relaxed">
                  Đồ thị $y = |f(|x|)|$: Thực hiện phép $f(|x|)$ trước (đối xứng qua Oy), sau đó lấy $|f(|x|)|$ (lật qua Ox).
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default GraphTransformationsModule;
