import React, { useState } from 'react';
import { create, all } from 'mathjs';
import { 
  Maximize2, Minimize2, X, Delete, CornerDownLeft, 
  Menu, Grid, Sigma, Compass, Layers, SlidersHorizontal, 
  Cpu, Binary, ArrowRightLeft, Activity
} from 'lucide-react';

const math = create(all);

interface CalculatorProps {
  onClose: () => void;
}

type CasioMode = 
  | 'calculate' 
  | 'complex' 
  | 'matrix' 
  | 'vector' 
  | 'statistics' 
  | 'distribution' 
  | 'table' 
  | 'equation' 
  | 'inequality'
  | 'menu';

export const ScientificCalculatorModal: React.FC<CalculatorProps> = ({ onClose }) => {
  const [activeMode, setActiveMode] = useState<CasioMode>('calculate');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShift, setIsShift] = useState(false);
  const [isAlpha, setIsAlpha] = useState(false);
  const [angleMode, setAngleMode] = useState<'DEG' | 'RAD'>('DEG');
  
  // Natural display lines
  const [displayExpr, setDisplayExpr] = useState('');
  const [evalExpr, setEvalExpr] = useState('');
  const [result, setResult] = useState('0');

  // Equation Solver state
  const [eqType, setEqType] = useState<'polynomial' | 'system'>('polynomial');
  const [polyDegree, setPolyDegree] = useState<2 | 3 | 4>(2);
  const [sysVars, setSysVars] = useState<2 | 3 | 4>(2);
  const [coeffA, setCoppA] = useState('1');
  const [coeffB, setCoppB] = useState('-3');
  const [coeffC, setCoppC] = useState('2');
  const [coeffD, setCoppD] = useState('0');
  const [coeffE, setCoppE] = useState('0');
  const [sysMatrix, setSysMatrix] = useState<string[][]>([
    ['1', '1', '5'],
    ['1', '-1', '1']
  ]);
  const [eqResults, setEqResults] = useState<string[]>([]);

  // Inequality state
  const [ineqDegree, setIneqDegree] = useState<2 | 3 | 4>(2);
  const [ineqSign, setIneqSign] = useState<'>' | '>=' | '<' | '<='>('>');
  const [ineqCoeffs, setIneqCoeffs] = useState<string[]>(['1', '-3', '2']);
  const [ineqResult, setIneqResult] = useState<string>('');

  // Statistics state
  const [statData, setStatData] = useState<string>('5, 7, 8, 9, 6, 8, 10, 8');
  const [statResult, setStatResult] = useState<any>(null);

  // Matrix state
  const [matrixSize, setMatrixSize] = useState<2 | 3 | 4>(3);
  const [matrixA, setMatrixA] = useState<string[][]>([
    ['1', '2', '3'],
    ['0', '1', '4'],
    ['5', '6', '0']
  ]);
  const [matrixResult, setMatrixResult] = useState<string>('');

  // Vector state
  const [vectorA, setVectorA] = useState<string[]>(['1', '2', '3']);
  const [vectorB, setVectorB] = useState<string[]>(['4', '5', '6']);
  const [vectorResult, setVectorResult] = useState<string>('');

  // Complex state
  const [complexReal, setComplexReal] = useState('3');
  const [complexImag, setComplexImag] = useState('4');
  const [complexResult, setComplexResult] = useState<any>(null);

  // Table state
  const [tableFuncF, setTableFuncF] = useState('x^2 - 2*x');
  const [tableFuncG, setTableFuncG] = useState('2*x + 1');
  const [tableStart, setTableStart] = useState('1');
  const [tableEnd, setTableEnd] = useState('5');
  const [tableStep, setTableStep] = useState('1');
  const [tableRows, setTableRows] = useState<any[]>([]);

  // Distribution state
  const [distType, setDistType] = useState<'binomial' | 'normal'>('binomial');
  const [distN, setDistN] = useState('10');
  const [distP, setDistP] = useState('0.5');
  const [distX, setDistX] = useState('5');
  const [distMu, setDistMu] = useState('0');
  const [distSigma, setDistSigma] = useState('1');
  const [distResult, setDistResult] = useState<string>('');

  // Clears expressions
  const handleClear = () => {
    setDisplayExpr('');
    setEvalExpr('');
    setResult('0');
  };

  // Backspaces the last entered token
  const handleDelete = () => {
    setDisplayExpr(prev => prev.slice(0, -1));
    setEvalExpr(prev => prev.slice(0, -1));
  };

  // FACT (Prime factorization) state
  const handleFact = () => {
    try {
      const val = parseInt(result);
      if (isNaN(val) || val <= 1) {
        setResult('Math ERROR');
        return;
      }
      let temp = val;
      const factors: { [key: number]: number } = {};
      for (let i = 2; i <= Math.sqrt(temp); i++) {
        while (temp % i === 0) {
          factors[i] = (factors[i] || 0) + 1;
          temp /= i;
        }
      }
      if (temp > 1) {
        factors[temp] = (factors[temp] || 0) + 1;
      }
      const factStr = Object.entries(factors)
        .map(([base, exp]) => (exp > 1 ? `${base}^${exp}` : `${base}`))
        .join(' × ');
      setResult(`${factStr}`);
    } catch {
      setResult('Error');
    }
  };

  // Preprocess angle functions for evaluation
  const wrapAngles = (expr: string): string => {
    let processed = expr;
    if (angleMode === 'DEG') {
      processed = processed.replace(/sin\(([^)]+)\)/g, 'sin($1 * pi / 180)');
      processed = processed.replace(/cos\(([^)]+)\)/g, 'cos($1 * pi / 180)');
      processed = processed.replace(/tan\(([^)]+)\)/g, 'tan($1 * pi / 180)');
    }
    return processed;
  };

  const handleEvaluate = () => {
    if (!evalExpr.trim()) return;
    try {
      let runExpr = evalExpr;
      runExpr = wrapAngles(runExpr);
      
      const evalRes = math.evaluate(runExpr);
      if (typeof evalRes === 'number') {
        setResult(parseFloat(evalRes.toFixed(10)).toString());
      } else if (evalRes && typeof evalRes === 'object' && (evalRes as any).isComplex) {
        setResult(`${(evalRes as any).re} + ${(evalRes as any).im}i`);
      } else {
        setResult(evalRes.toString());
      }
    } catch {
      setResult('Syntax ERROR');
    }
  };

  const appendKey = (display: string, evalVal: string) => {
    setIsShift(false);
    setIsAlpha(false);
    setDisplayExpr(prev => prev + display);
    setEvalExpr(prev => prev + evalVal);
  };

  // Solve Polynomials
  const handleSolvePolynomial = () => {
    try {
      const a = parseFloat(coeffA);
      const b = parseFloat(coeffB);
      const c = parseFloat(coeffC);
      
      if (polyDegree === 2) {
        const delta = b*b - 4*a*c;
        if (delta > 0) {
          const x1 = (-b + Math.sqrt(delta)) / (2*a);
          const x2 = (-b - Math.sqrt(delta)) / (2*a);
          const xVertex = -b / (2*a);
          const yVertex = a*xVertex*xVertex + b*xVertex + c;
          setEqResults([
            `x₁ = ${round(x1)}`,
            `x₂ = ${round(x2)}`,
            `Đỉnh parabol: I(${round(xVertex)}; ${round(yVertex)})`
          ]);
        } else if (delta === 0) {
          const x0 = -b / (2*a);
          setEqResults([
            `Nghiệm kép x = ${round(x0)}`,
            `Đỉnh parabol: I(${round(x0)}; 0)`
          ]);
        } else {
          const re = -b / (2*a);
          const im = Math.sqrt(-delta) / (2*a);
          setEqResults([
            `x₁ = ${round(re)} + ${round(im)}i`,
            `x₂ = ${round(re)} - ${round(im)}i`
          ]);
        }
      } else if (polyDegree === 3) {
        const d = parseFloat(coeffD);
        const analyticRoots = solveCubicNumerically(a, b, c, d);
        setEqResults(analyticRoots);
      } else {
        setEqResults(['Tính năng giải bậc 4 chỉ hỗ trợ dạng số thực']);
      }
    } catch {
      setEqResults(['Lỗi nhập liệu hệ số']);
    }
  };

  const solveCubicNumerically = (a: number, b: number, c: number, d: number): string[] => {
    const f = (x: number) => a*x*x*x + b*x*x + c*x + d;
    const deltaPrime = 4*b*b - 12*a*c;
    const res: string[] = [];
    
    if (deltaPrime > 0) {
      const xExt1 = (-2*b + Math.sqrt(deltaPrime)) / (6*a);
      const xExt2 = (-2*b - Math.sqrt(deltaPrime)) / (6*a);
      res.push(`Cực trị hàm số tại: x = ${round(xExt1)}, x = ${round(xExt2)}`);
    }

    try {
      const r1 = solveSecant(f, -100, 100);
      if (!isNaN(r1)) {
        res.unshift(`x₁ ≈ ${round(r1)}`);
      } else {
        res.unshift('Không tìm thấy nghiệm thực');
      }
    } catch {
      res.push('Lỗi giải phương trình bậc 3');
    }
    return res;
  };

  const solveSecant = (f: (x: number) => number, x0: number, x1: number): number => {
    let p0 = x0;
    let p1 = x1;
    for (let i = 0; i < 50; i++) {
      const y0 = f(p0);
      const y1 = f(p1);
      if (Math.abs(y1 - y0) < 1e-12) break;
      const p2 = p1 - y1 * (p1 - p0) / (y1 - y0);
      if (Math.abs(p2 - p1) < 1e-10) return p2;
      p0 = p1;
      p1 = p2;
    }
    return p1;
  };

  const round = (val: number) => parseFloat(val.toFixed(5));

  // Solve systems of equations
  const handleSolveSystem = () => {
    try {
      const numVars = sysVars;
      const A: number[][] = [];
      const B: number[] = [];
      for (let i = 0; i < numVars; i++) {
        A.push(sysMatrix[i].slice(0, numVars).map(parseFloat));
        B.push(parseFloat(sysMatrix[i][numVars]));
      }
      const x = math.lusolve(A, B) as number[][];
      const out = x.map((val, idx) => `Biến ${String.fromCharCode(120 + idx)} = ${round(val[0])}`);
      setEqResults(out);
    } catch {
      setEqResults(['Hệ phương trình vô nghiệm hoặc vô số nghiệm']);
    }
  };

  // Solve Inequalities
  const handleSolveInequality = () => {
    try {
      const a = parseFloat(ineqCoeffs[0]);
      const b = parseFloat(ineqCoeffs[1]);
      const c = parseFloat(ineqCoeffs[2]);
      
      const delta = b*b - 4*a*c;
      if (delta > 0) {
        let r1 = (-b - Math.sqrt(delta)) / (2*a);
        let r2 = (-b + Math.sqrt(delta)) / (2*a);
        if (r1 > r2) {
          const temp = r1;
          r1 = r2;
          r2 = temp;
        }
        
        const matchesSign = (val: number): boolean => {
          const y = a*val*val + b*val + c;
          if (ineqSign === '>') return y > 0;
          if (ineqSign === '>=') return y >= 0;
          if (ineqSign === '<') return y < 0;
          return y <= 0;
        };

        const testL = matchesSign(r1 - 1);
        const testM = matchesSign((r1 + r2) / 2);
        const testR = matchesSign(r2 + 1);

        const parts: string[] = [];
        const eqL = ineqSign.includes('=') ? '≤' : '<';
        const eqR = ineqSign.includes('=') ? '≥' : '>';

        if (testL) parts.push(`x ${eqL} ${round(r1)}`);
        if (testM) parts.push(`${round(r1)} ${eqL} x ${eqL} ${round(r2)}`);
        if (testR) parts.push(`x ${eqR} ${round(r2)}`);

        setIneqResult(parts.join('  hoặc  ') || 'Vô nghiệm');
      } else if (delta === 0) {
        const r = -b / (2*a);
        if (ineqSign === '>') {
          setIneqResult(a > 0 ? `Tất cả x ≠ ${round(r)}` : 'Vô nghiệm');
        } else if (ineqSign === '>=') {
          setIneqResult(a > 0 ? 'Tất cả x ∈ ℝ' : `x = ${round(r)}`);
        } else {
          setIneqResult(a < 0 ? `Tất cả x ≠ ${round(r)}` : 'Vô nghiệm');
        }
      } else {
        const test = a*0*0 + b*0 + c;
        const satisfies = (ineqSign === '>' && test > 0) || (ineqSign === '>=' && test >= 0) || (ineqSign === '<' && test < 0) || (ineqSign === '<=' && test <= 0);
        setIneqResult(satisfies ? 'Tất cả x ∈ ℝ' : 'Vô nghiệm');
      }
    } catch {
      setIneqResult('Lỗi giải bất phương trình');
    }
  };

  // Solve Matrix
  const handleSolveMatrix = () => {
    try {
      const matData = matrixA.slice(0, matrixSize).map(r => r.slice(0, matrixSize).map(parseFloat));
      const det = math.det(matData);
      let invStr = '';
      if (det !== 0) {
        const inv = math.inv(matData) as number[][];
        invStr = '\n\nNghịch đảo A⁻¹:\n' + inv.map(r => r.map(v => parseFloat(v.toFixed(3))).join('\t')).join('\n');
      } else {
        invStr = '\n\nKhông có ma trận nghịch đảo (det = 0)';
      }
      setMatrixResult(`Định thức det(A) = ${parseFloat(det.toFixed(5))}${invStr}`);
    } catch {
      setMatrixResult('Lỗi tính toán ma trận');
    }
  };

  // Solve Vector
  const handleSolveVector = () => {
    try {
      const a = vectorA.map(parseFloat);
      const b = vectorB.map(parseFloat);
      const dot = math.dot(a, b);
      const cross = math.cross(a, b) as number[];
      const lenA = math.norm(a) as number;
      const lenB = math.norm(b) as number;
      const cosAngle = dot / (lenA * lenB);
      const angleRad = Math.acos(cosAngle);
      const angleDeg = angleRad * 180 / Math.PI;

      setVectorResult(
        `Tích vô hướng a·b = ${parseFloat(dot.toFixed(4))}\n` +
        `Tích có hướng [a, b] = [${cross.map(v => parseFloat(v.toFixed(4))).join(', ')}]\n` +
        `Độ dài |a| = ${parseFloat(lenA.toFixed(4))}, |b| = ${parseFloat(lenB.toFixed(4))}\n` +
        `Góc giữa 2 vectơ: ${parseFloat(angleDeg.toFixed(2))}° (${parseFloat(angleRad.toFixed(4))} rad)`
      );
    } catch {
      setVectorResult('Lỗi tính toán vectơ');
    }
  };

  // Generate Table
  const handleGenerateTable = () => {
    try {
      const start = parseFloat(tableStart);
      const end = parseFloat(tableEnd);
      const step = parseFloat(tableStep);
      const rows = [];
      let idx = 1;
      
      for (let x = start; x <= end; x += step) {
        let fVal = 'Error';
        let gVal = 'Error';
        try {
          const scopeF = { x };
          fVal = Number(math.evaluate(tableFuncF, scopeF)).toFixed(4);
        } catch {}
        try {
          const scopeG = { x };
          gVal = Number(math.evaluate(tableFuncG, scopeG)).toFixed(4);
        } catch {}

        rows.push({ idx, x: parseFloat(x.toFixed(4)), fVal, gVal });
        idx++;
      }
      setTableRows(rows);
    } catch {
      alert('Lỗi lập bảng giá trị. Vui lòng kiểm tra lại hàm số.');
    }
  };

  // Calculate Distributions
  const handleSolveDistribution = () => {
    try {
      if (distType === 'binomial') {
        const n = parseInt(distN);
        const p = parseFloat(distP);
        const x = parseInt(distX);
        const nCr = math.combinations(n, x);
        const prob = nCr * Math.pow(p, x) * Math.pow(1 - p, n - x);
        setDistResult(`P(X = ${x}) = ${parseFloat(prob.toFixed(8))}`);
      } else {
        const mu = parseFloat(distMu);
        const sigma = parseFloat(distSigma);
        const x = parseFloat(distX);
        const exponent = -Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2));
        const prob = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
        setDistResult(`f(x) mật độ chuẩn = ${parseFloat(prob.toFixed(8))}`);
      }
    } catch {
      setDistResult('Lỗi tính xác suất');
    }
  };

  // Complex Number Calculations
  const handleSolveComplex = () => {
    try {
      const r = parseFloat(complexReal);
      const i = parseFloat(complexImag);
      const z = math.complex(r, i);
      const mod = math.abs(z);
      const conj = math.conj(z);
      const argRad = math.arg(z);
      const argDeg = argRad * 180 / Math.PI;

      setComplexResult({
        mod: parseFloat(mod.toFixed(5)),
        conj: conj.toString(),
        argDeg: parseFloat(argDeg.toFixed(2)),
        polar: `${parseFloat(mod.toFixed(4))} ∠ ${parseFloat(argDeg.toFixed(2))}°`
      });
    } catch {
      setComplexResult(null);
    }
  };

  // Single and 2-Var Statistics Calculations
  const handleCalculateStatistics = () => {
    try {
      const tokens = statData.split(/[\s,;\t\n]+/).filter(Boolean);
      const numbers = tokens
        .map(t => parseFloat(t.replace(',', '.')))
        .filter(n => !isNaN(n) && isFinite(n));

      if (numbers.length === 0) return;
      const sorted = [...numbers].sort((a, b) => a - b);
      const mean = math.mean(numbers);
      const variance = math.variance(numbers, 'uncorrected');
      const stdDev = math.std(numbers, 'uncorrected');
      const median = math.median(numbers);
      
      const getMedian = (arr: number[]) => {
        const len = arr.length;
        if (len === 0) return 0;
        return len % 2 === 1 ? arr[Math.floor(len / 2)] : (arr[len / 2 - 1] + arr[len / 2]) / 2;
      };

      const mid = Math.floor(sorted.length / 2);
      const q1 = getMedian(sorted.slice(0, mid));
      const q3 = getMedian(sorted.slice(sorted.length % 2 === 1 ? mid + 1 : mid));

      const meanNum = Number(mean);
      const varNum = Number(variance);
      const stdNum = Number(stdDev);
      const medNum = Number(median);
      const q1Num = Number(q1);
      const q3Num = Number(q3);

      setStatResult({
        n: numbers.length,
        mean: parseFloat(meanNum.toFixed(4)),
        variance: parseFloat(varNum.toFixed(4)),
        stdDev: parseFloat(stdNum.toFixed(4)),
        median: parseFloat(medNum.toFixed(4)),
        q1: parseFloat(q1Num.toFixed(4)),
        q3: parseFloat(q3Num.toFixed(4))
      });
    } catch {
      setStatResult(null);
    }
  };

  return (
    <div className={`fixed z-50 flex items-center justify-center transition-all duration-300 ${
      isFullscreen 
        ? 'inset-0 bg-slate-950/80 backdrop-blur-md p-4' 
        : 'bottom-20 right-6 w-[420px]'
    }`}>
      
      {/* Casio fx-580VN X Immersive Housing */}
      <div className={`bg-slate-900 border-4 border-slate-800 shadow-2xl flex flex-col transition-all duration-300 relative ${
        isFullscreen 
          ? 'w-full max-w-4xl h-[92vh] rounded-3xl p-6' 
          : 'w-full rounded-2xl p-4'
      }`}>
        
        {/* Casio Brand Watermark */}
        <div className="flex justify-between items-center text-slate-400 text-xs mb-3 font-mono">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-[11px] text-slate-300">
            <span>CASIO</span>
            <span className="bg-slate-800 px-1 py-0.5 rounded text-slate-400 font-extrabold text-[10px]">fx-580VN X</span>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">CLASSWIZ</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setAngleMode(prev => prev === 'DEG' ? 'RAD' : 'DEG');
              }} 
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded text-[9px] uppercase transition-all"
              title="Chuyển DEG/RAD"
            >
              {angleMode}
            </button>
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-slate-800 rounded text-rose-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Double-line LCD Screen Panel */}
        <div className="bg-cyan-950/35 border-2 border-cyan-900/40 rounded-xl p-4 mb-4 relative flex flex-col justify-between font-mono h-32 shadow-inner overflow-hidden">
          {/* LCD Status Indicators Bar */}
          <div className="flex items-center justify-between text-[9px] text-cyan-400/80 select-none border-b border-cyan-950/40 pb-1.5 mb-1.5">
            <div className="flex gap-2.5">
              <span className={isShift ? 'text-amber-400 font-extrabold animate-pulse' : 'opacity-20'}>S</span>
              <span className={isAlpha ? 'text-rose-400 font-extrabold animate-pulse' : 'opacity-20'}>A</span>
              <span className={angleMode === 'DEG' ? 'text-cyan-300 font-bold' : 'opacity-20'}>D</span>
              <span className={angleMode === 'RAD' ? 'text-cyan-300 font-bold' : 'opacity-20'}>R</span>
              <span className="text-cyan-300 font-bold">MATH</span>
            </div>
            <span className="uppercase text-[8px] font-bold text-slate-500">{activeMode} Mode</span>
          </div>

          {/* Active Mode UI Content */}
          {activeMode === 'menu' ? (
            <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-auto pr-1 text-cyan-200">
              <button onClick={() => setActiveMode('calculate')} className="flex items-center gap-1 p-1 bg-cyan-950/40 hover:bg-cyan-900/50 rounded text-[10px] text-left">
                <Sigma className="w-3.5 h-3.5 text-amber-400" /> Calculate
              </button>
              <button onClick={() => setActiveMode('complex')} className="flex items-center gap-1 p-1 bg-cyan-950/40 hover:bg-cyan-900/50 rounded text-[10px] text-left">
                <Activity className="w-3.5 h-3.5 text-rose-400" /> Complex
              </button>
              <button onClick={() => setActiveMode('matrix')} className="flex items-center gap-1 p-1 bg-cyan-950/40 hover:bg-cyan-900/50 rounded text-[10px] text-left">
                <Grid className="w-3.5 h-3.5 text-blue-400" /> Matrix
              </button>
              <button onClick={() => setActiveMode('vector')} className="flex items-center gap-1 p-1 bg-cyan-950/40 hover:bg-cyan-900/50 rounded text-[10px] text-left">
                <Compass className="w-3.5 h-3.5 text-teal-400" /> Vector
              </button>
              <button onClick={() => setActiveMode('statistics')} className="flex items-center gap-1 p-1 bg-cyan-950/40 hover:bg-cyan-900/50 rounded text-[10px] text-left">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" /> Statistics
              </button>
              <button onClick={() => setActiveMode('distribution')} className="flex items-center gap-1 p-1 bg-cyan-950/40 hover:bg-cyan-900/50 rounded text-[10px] text-left">
                <Binary className="w-3.5 h-3.5 text-yellow-400" /> Distribution
              </button>
              <button onClick={() => setActiveMode('table')} className="flex items-center gap-1 p-1 bg-cyan-950/40 hover:bg-cyan-900/50 rounded text-[10px] text-left">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Table
              </button>
              <button onClick={() => setActiveMode('equation')} className="flex items-center gap-1 p-1 bg-cyan-950/40 hover:bg-cyan-900/50 rounded text-[10px] text-left">
                <Cpu className="w-3.5 h-3.5 text-purple-400" /> Equation
              </button>
              <button onClick={() => setActiveMode('inequality')} className="flex items-center gap-1 p-1 bg-cyan-950/40 hover:bg-cyan-900/50 rounded text-[10px] text-left">
                <ArrowRightLeft className="w-3.5 h-3.5 text-pink-400" /> Inequality
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              {/* Natural Input expression */}
              <div className="text-right text-cyan-200 text-base tracking-wide whitespace-nowrap overflow-x-auto overflow-y-hidden select-all h-6 flex items-center justify-end">
                {displayExpr || <span className="opacity-15">0</span>}
              </div>

              {/* Evaluated calculation result */}
              <div className="text-right text-cyan-300 text-2xl font-bold tracking-wider whitespace-nowrap overflow-x-auto overflow-y-hidden h-9 flex items-center justify-end">
                {result}
              </div>
            </div>
          )}
        </div>

        {/* Specialized Modes Configuration Stage (Sub-panel below display depending on mode) */}
        {activeMode !== 'calculate' && activeMode !== 'menu' && (
          <div className="bg-slate-850/80 border border-slate-750/70 rounded-xl p-3.5 mb-4 text-xs space-y-3 font-sans text-slate-200 shadow-sm max-h-[300px] overflow-y-auto">
            {activeMode === 'equation' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-amber-400">Phương trình & Hệ phương trình</h4>
                  <div className="flex gap-2">
                    <button onClick={() => setEqType('polynomial')} className={`px-2 py-0.5 rounded text-[10px] font-bold ${eqType === 'polynomial' ? 'bg-amber-600' : 'bg-slate-700'}`}>Đa thức</button>
                    <button onClick={() => setEqType('system')} className={`px-2 py-0.5 rounded text-[10px] font-bold ${eqType === 'system' ? 'bg-amber-600' : 'bg-slate-700'}`}>Hệ PT</button>
                  </div>
                </div>

                {eqType === 'polynomial' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-1.5">
                      <span>Bậc đa thức:</span>
                      <div className="flex gap-1">
                        {[2, 3, 4].map(v => (
                          <button key={v} onClick={() => setPolyDegree(v as any)} className={`w-6 py-0.5 rounded text-[10px] font-bold ${polyDegree === v ? 'bg-blue-600' : 'bg-slate-750'}`}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <input type="text" value={coeffA} onChange={e => setCoppA(e.target.value)} placeholder="a" className="bg-slate-800 p-1 rounded text-center" />
                      <input type="text" value={coeffB} onChange={e => setCoppB(e.target.value)} placeholder="b" className="bg-slate-800 p-1 rounded text-center" />
                      <input type="text" value={coeffC} onChange={e => setCoppC(e.target.value)} placeholder="c" className="bg-slate-800 p-1 rounded text-center" />
                      {polyDegree >= 3 && <input type="text" value={coeffD} onChange={e => setCoppD(e.target.value)} placeholder="d" className="bg-slate-800 p-1 rounded text-center animate-in fade-in" />}
                    </div>
                    <button onClick={handleSolvePolynomial} className="w-full bg-emerald-600 py-1.5 rounded font-bold text-center">GIẢI PHƯƠNG TRÌNH</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Số ẩn số:</span>
                      <div className="flex gap-1">
                        {[2, 3].map(v => (
                          <button key={v} onClick={() => {
                            setSysVars(v as any);
                            setSysMatrix(Array.from({ length: v }, () => Array(v + 1).fill('1')));
                          }} className={`w-6 py-0.5 rounded text-[10px] font-bold ${sysVars === v ? 'bg-blue-600' : 'bg-slate-750'}`}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {Array.from({ length: sysVars }).map((_, rIdx) => (
                        <div key={rIdx} className="flex gap-1">
                          {Array.from({ length: sysVars + 1 }).map((_, cIdx) => (
                            <input 
                              key={cIdx} 
                              type="text" 
                              value={sysMatrix[rIdx]?.[cIdx] || ''} 
                              onChange={e => {
                                const nextMat = [...sysMatrix];
                                if (!nextMat[rIdx]) nextMat[rIdx] = [];
                                nextMat[rIdx][cIdx] = e.target.value;
                                setSysMatrix(nextMat);
                              }}
                              placeholder={cIdx === sysVars ? 'hằng số' : String.fromCharCode(97 + cIdx)} 
                              className="bg-slate-800 p-1 rounded text-center w-full text-[11px]" 
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                    <button onClick={handleSolveSystem} className="w-full bg-emerald-600 py-1.5 rounded font-bold text-center">GIẢI HỆ PHƯƠNG TRÌNH</button>
                  </div>
                )}

                {eqResults.length > 0 && (
                  <div className="bg-slate-900/60 p-2 rounded text-cyan-300 font-mono text-[11px] space-y-1 animate-in slide-in-from-top-2">
                    {eqResults.map((r, i) => <p key={i}>{r}</p>)}
                  </div>
                )}
              </div>
            )}

            {activeMode === 'inequality' && (
              <div className="space-y-2.5">
                <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1.5">Bất phương trình bậc 2</h4>
                <div className="flex items-center justify-between gap-1.5">
                  <span>Dấu so sánh:</span>
                  <select value={ineqSign} onChange={e => setIneqSign(e.target.value as any)} className="bg-slate-800 p-1 rounded font-bold text-slate-100">
                    <option value=">">&gt;</option>
                    <option value=">=">&ge;</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&le;</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" value={ineqCoeffs[0]} onChange={e => setIneqCoeffs([e.target.value, ineqCoeffs[1], ineqCoeffs[2]])} placeholder="a" className="bg-slate-800 p-1 rounded text-center" />
                  <input type="text" value={ineqCoeffs[1]} onChange={e => setIneqCoeffs([ineqCoeffs[0], e.target.value, ineqCoeffs[2]])} placeholder="b" className="bg-slate-800 p-1 rounded text-center" />
                  <input type="text" value={ineqCoeffs[2]} onChange={e => setIneqCoeffs([ineqCoeffs[0], ineqCoeffs[1], e.target.value])} placeholder="c" className="bg-slate-800 p-1 rounded text-center" />
                </div>
                <button onClick={handleSolveInequality} className="w-full bg-emerald-600 py-1.5 rounded font-bold text-center">GIẢI BẤT PHƯƠNG TRÌNH</button>
                {ineqResult && (
                  <div className="bg-slate-900/60 p-2.5 rounded text-cyan-300 font-mono text-center font-bold">
                    Nghiệm: {ineqResult}
                  </div>
                )}
              </div>
            )}

            {activeMode === 'statistics' && (
              <div className="space-y-2.5">
                <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1.5">Thống kê dữ liệu ghép nhóm & đơn lẻ</h4>
                <p className="text-[10px] text-slate-400">Nhập dãy số liệu phân tách bằng dấu phẩy:</p>
                <textarea rows={2} value={statData} onChange={e => setStatData(e.target.value)} className="w-full bg-slate-800 p-2 rounded font-mono text-[11px]" />
                <button onClick={handleCalculateStatistics} className="w-full bg-emerald-600 py-1.5 rounded font-bold text-center">TÍNH TOÁN THỐNG KÊ</button>
                {statResult && (
                  <div className="bg-slate-900/60 p-2 rounded text-cyan-300 font-mono text-[11px] grid grid-cols-2 gap-x-3 gap-y-1">
                    <p>Cỡ mẫu n: {statResult.n}</p>
                    <p>Trung bình x̄: {statResult.mean}</p>
                    <p>Độ lệch chuẩn s: {statResult.stdDev}</p>
                    <p>Trung vị Me: {statResult.median}</p>
                    <p>Tứ phân vị Q₁: {statResult.q1}</p>
                    <p>Tứ phân vị Q₃: {statResult.q3}</p>
                  </div>
                )}
              </div>
            )}

            {activeMode === 'matrix' && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <h4 className="font-bold text-amber-400">Ma trận vuông</h4>
                  <div className="flex gap-1">
                    {[2, 3].map(v => (
                      <button key={v} onClick={() => setMatrixSize(v as any)} className={`w-6 py-0.5 rounded text-[10px] font-bold ${matrixSize === v ? 'bg-blue-600' : 'bg-slate-750'}`}>{v}x{v}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  {Array.from({ length: matrixSize }).map((_, rIdx) => (
                    <div key={rIdx} className="flex gap-1">
                      {Array.from({ length: matrixSize }).map((_, cIdx) => (
                        <input 
                          key={cIdx} 
                          type="text" 
                          value={matrixA[rIdx]?.[cIdx] || ''} 
                          onChange={e => {
                            const nextMat = [...matrixA];
                            if (!nextMat[rIdx]) nextMat[rIdx] = [];
                            nextMat[rIdx][cIdx] = e.target.value;
                            setMatrixA(nextMat);
                          }}
                          className="bg-slate-800 p-1 rounded text-center w-full" 
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <button onClick={handleSolveMatrix} className="w-full bg-emerald-600 py-1.5 rounded font-bold text-center">TÍNH MA TRẬN</button>
                {matrixResult && (
                  <pre className="bg-slate-900/60 p-2 rounded text-cyan-300 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">{matrixResult}</pre>
                )}
              </div>
            )}

            {activeMode === 'vector' && (
              <div className="space-y-2.5">
                <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1.5">Vectơ trong không gian Oxyz</h4>
                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  <div className="space-y-1">
                    <span className="font-bold text-cyan-300">Vectơ a (x, y, z):</span>
                    <div className="flex gap-1">
                      {['1', '2', '3'].map((_, i) => (
                        <input key={i} type="text" value={vectorA[i]} onChange={e => {
                          const nextVec = [...vectorA];
                          nextVec[i] = e.target.value;
                          setVectorA(nextVec);
                        }} className="bg-slate-800 p-1 rounded text-center w-full" />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-cyan-300">Vectơ b (x, y, z):</span>
                    <div className="flex gap-1">
                      {['1', '2', '3'].map((_, i) => (
                        <input key={i} type="text" value={vectorB[i]} onChange={e => {
                          const nextVec = [...vectorB];
                          nextVec[i] = e.target.value;
                          setVectorB(nextVec);
                        }} className="bg-slate-800 p-1 rounded text-center w-full" />
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={handleSolveVector} className="w-full bg-emerald-600 py-1.5 rounded font-bold text-center">TÍNH TOÁN VECTƠ</button>
                {vectorResult && (
                  <pre className="bg-slate-900/60 p-2.5 rounded text-cyan-300 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">{vectorResult}</pre>
                )}
              </div>
            )}

            {activeMode === 'complex' && (
              <div className="space-y-2.5">
                <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1.5">Số phức đại số & lượng giác</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span>Phần thực (a):</span>
                    <input type="text" value={complexReal} onChange={e => setComplexReal(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                  </div>
                  <div className="space-y-1">
                    <span>Phần ảo (b):</span>
                    <input type="text" value={complexImag} onChange={e => setComplexImag(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                  </div>
                </div>
                <button onClick={handleSolveComplex} className="w-full bg-emerald-600 py-1.5 rounded font-bold text-center">TÍNH SỐ PHỨC</button>
                {complexResult && (
                  <div className="bg-slate-900/60 p-2 rounded text-cyan-300 font-mono text-[11px] space-y-1">
                    <p>Môđun |z|: {complexResult.mod}</p>
                    <p>Liên hợp z̄: {complexResult.conj}</p>
                    <p>Argument φ: {complexResult.argDeg}°</p>
                    <p>Dạng cực r∠θ: {complexResult.polar}</p>
                  </div>
                )}
              </div>
            )}

            {activeMode === 'table' && (
              <div className="space-y-2.5">
                <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1.5">Bảng giá trị hàm số f(x), g(x)</h4>
                <div className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <span className="w-10">f(x):</span>
                    <input type="text" value={tableFuncF} onChange={e => setTableFuncF(e.target.value)} className="bg-slate-800 p-1 rounded w-full font-mono text-[11px]" />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="w-10">g(x):</span>
                    <input type="text" value={tableFuncG} onChange={e => setTableFuncG(e.target.value)} className="bg-slate-800 p-1 rounded w-full font-mono text-[11px]" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span>Start:</span>
                    <input type="text" value={tableStart} onChange={e => setTableStart(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                  </div>
                  <div>
                    <span>End:</span>
                    <input type="text" value={tableEnd} onChange={e => setTableEnd(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                  </div>
                  <div>
                    <span>Step:</span>
                    <input type="text" value={tableStep} onChange={e => setTableStep(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                  </div>
                </div>
                <button onClick={handleGenerateTable} className="w-full bg-emerald-600 py-1.5 rounded font-bold text-center">LẬP BẢNG GIÁ TRỊ</button>
                {tableRows.length > 0 && (
                  <div className="max-h-[140px] overflow-y-auto border border-slate-700 rounded text-[10px] font-mono">
                    <table className="w-full text-center">
                      <thead className="bg-slate-800 text-cyan-300">
                        <tr>
                          <th className="p-1 border-r border-b border-slate-700">STT</th>
                          <th className="p-1 border-r border-b border-slate-700">x</th>
                          <th className="p-1 border-r border-b border-slate-700">f(x)</th>
                          <th className="p-1 border-b border-slate-700">g(x)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map(row => (
                          <tr key={row.idx} className="border-b border-slate-800 hover:bg-slate-800/40">
                            <td className="p-1 border-r border-slate-800">{row.idx}</td>
                            <td className="p-1 border-r border-slate-800 text-slate-100">{row.x}</td>
                            <td className="p-1 border-r border-slate-800 text-cyan-400 font-bold">{row.fVal}</td>
                            <td className="p-1 text-emerald-400 font-bold">{row.gVal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeMode === 'distribution' && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <h4 className="font-bold text-amber-400">Phân phối xác suất</h4>
                  <div className="flex gap-2">
                    <button onClick={() => setDistType('binomial')} className={`px-2 py-0.5 rounded text-[10px] font-bold ${distType === 'binomial' ? 'bg-amber-600' : 'bg-slate-750'}`}>Nhị thức</button>
                    <button onClick={() => setDistType('normal')} className={`px-2 py-0.5 rounded text-[10px] font-bold ${distType === 'normal' ? 'bg-amber-600' : 'bg-slate-750'}`}>Chuẩn</button>
                  </div>
                </div>

                {distType === 'binomial' ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span>Phép thử n:</span>
                      <input type="text" value={distN} onChange={e => setDistN(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                    </div>
                    <div>
                      <span>Xác suất p:</span>
                      <input type="text" value={distP} onChange={e => setDistP(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                    </div>
                    <div>
                      <span>Thành công x:</span>
                      <input type="text" value={distX} onChange={e => setDistX(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span>Kỳ vọng μ:</span>
                      <input type="text" value={distMu} onChange={e => setDistMu(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                    </div>
                    <div>
                      <span>Độ lệch σ:</span>
                      <input type="text" value={distSigma} onChange={e => setDistSigma(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                    </div>
                    <div>
                      <span>Điểm x:</span>
                      <input type="text" value={distX} onChange={e => setDistX(e.target.value)} className="bg-slate-800 p-1 rounded text-center w-full" />
                    </div>
                  </div>
                )}
                <button onClick={handleSolveDistribution} className="w-full bg-emerald-600 py-1.5 rounded font-bold text-center">TÍNH XÁC SUẤT</button>
                {distResult && (
                  <div className="bg-slate-900/60 p-2.5 rounded text-cyan-300 font-mono text-center font-bold">
                    {distResult}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* COMPREHENSIVE CASIO fx-580VN X HARDWARE KEYBOARD MATRIX */}
        {/* ======================================================== */}
        <div className="flex flex-col gap-3 flex-1 select-none">
          
          {/* ZONE 1: CORE TOP FUNCTIONAL CONTROL KEYS */}
          <div className="grid grid-cols-5 gap-1.5 text-[10px] font-bold">
            {/* Row 1 */}
            <div className="relative group">
              <span className="absolute -top-3.5 left-1 text-[8px] text-amber-500 font-bold tracking-wider">S-ACTIVE</span>
              <button 
                onClick={() => { setIsShift(!isShift); setIsAlpha(false); }}
                className={`w-full py-1 rounded transition-all duration-150 ${
                  isShift ? 'bg-amber-500 text-slate-950 scale-95 shadow-lg' : 'bg-slate-800 text-amber-400 hover:bg-slate-750'
                }`}
              >
                SHIFT
              </button>
            </div>
            
            <div className="relative group">
              <span className="absolute -top-3.5 left-1 text-[8px] text-rose-500 font-bold tracking-wider">A-ACTIVE</span>
              <button 
                onClick={() => { setIsAlpha(!isAlpha); setIsShift(false); }}
                className={`w-full py-1 rounded transition-all duration-150 ${
                  isAlpha ? 'bg-rose-500 text-white scale-95 shadow-lg' : 'bg-slate-800 text-rose-400 hover:bg-slate-750'
                }`}
              >
                ALPHA
              </button>
            </div>

            {/* Retro D-Pad navigation system */}
            <div className="col-span-1 grid grid-cols-3 gap-0.5 items-center justify-center bg-slate-800 rounded p-0.5 text-center text-slate-300">
              <button onClick={() => appendKey('◄', '')} className="hover:text-cyan-400 hover:scale-105 active:scale-95 text-[8px]">◄</button>
              <div className="flex flex-col justify-center items-center">
                <button onClick={() => appendKey('▲', '')} className="hover:text-cyan-400 hover:scale-105 active:scale-95 text-[8px] leading-none mb-0.5">▲</button>
                <button onClick={() => appendKey('▼', '')} className="hover:text-cyan-400 hover:scale-105 active:scale-95 text-[8px] leading-none mt-0.5">▼</button>
              </div>
              <button onClick={() => appendKey('►', '')} className="hover:text-cyan-400 hover:scale-105 active:scale-95 text-[8px]">►</button>
            </div>

            <button 
              onClick={() => setActiveMode('menu')}
              className="py-1 bg-slate-800 hover:bg-slate-750 text-slate-100 rounded flex items-center justify-center gap-0.5"
            >
              <Menu className="w-3 h-3 text-cyan-400" />
              MENU
            </button>

            <button 
              onClick={() => {
                handleClear();
                setActiveMode('calculate');
              }}
              className="py-1 bg-slate-800 hover:bg-slate-750 text-emerald-400 rounded"
            >
              ON
            </button>

            {/* Row 2 */}
            <button 
              onClick={() => appendKey('OPTN', '')}
              className="py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded"
              title="Options"
            >
              OPTN
            </button>
            <button 
              onClick={() => appendKey('CALC', '')}
              className="py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded"
              title="Calculate"
            >
              CALC
            </button>
            <div className="col-span-1"></div>
            <button 
              onClick={() => appendKey('x', 'x')}
              className="py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded"
              title="Variables"
            >
              VARS
            </button>
            <button 
              onClick={() => {
                // S<=>D fraction conversion logic
                if (result.includes('/')) {
                  try {
                    const parsed = math.evaluate(result);
                    setResult(parsed.toString());
                  } catch {}
                }
              }}
              className="py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[9px]"
              title="Format S<=>D"
            >
              FORMAT
            </button>
          </div>

          {/* ZONE 2: MATHEMATICAL OPERATORS & SCIENTIFIC KEYS */}
          <div className="grid grid-cols-6 gap-x-1 gap-y-3.5">
            {/* Row 1 */}
            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">a/b</span>
              <button onClick={() => appendKey('(', '(')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                a/b
              </button>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">³√x</span>
              <button onClick={() => isShift ? appendKey('cbrt(', 'cbrt(') : appendKey('sqrt(', 'sqrt(')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                √x
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">x³</span>
              <button onClick={() => appendKey('^(2)', '**2')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                x²
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">x<sup>-1</sup></span>
              <button onClick={() => appendKey('^(', '**(')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                x<sup>y</sup>
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">log<sub>a</sub>b</span>
              <button onClick={() => appendKey('log10(', 'log10(')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                log
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">e<sup>x</sup></span>
              <button onClick={() => isShift ? appendKey('e^(', 'e**(') : appendKey('ln(', 'log(')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                ln
              </button>
            </div>

            {/* Row 2 */}
            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">(-)</span>
              <button onClick={() => appendKey('-', '-')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                (-)
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">,,,</span>
              <button onClick={() => appendKey('°', '')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                °'"
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">x⁻¹</span>
              <button onClick={() => appendKey('^(-1)', '**-1')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                x⁻¹
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">asin</span>
              <button onClick={() => isShift ? appendKey('asin(', 'asin(') : appendKey('sin(', 'sin(')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                sin
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">acos</span>
              <button onClick={() => isShift ? appendKey('acos(', 'acos(') : appendKey('cos(', 'cos(')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                cos
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">atan</span>
              <button onClick={() => isShift ? appendKey('atan(', 'atan(') : appendKey('tan(', 'tan(')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                tan
              </button>
            </div>

            {/* Row 3 */}
            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">STO</span>
              <button onClick={() => appendKey('(', '(')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                (
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">%</span>
              <button onClick={() => appendKey(')', ')')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                )
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">M</span>
              <button onClick={() => appendKey('x', 'x')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-amber-400 rounded text-[10px] font-bold">
                x
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">y</span>
              <button onClick={() => appendKey('y', 'y')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-amber-400 rounded text-[10px] font-bold">
                y
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">M-</span>
              <button onClick={() => appendKey('M', 'M')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                M+
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7px] text-amber-500 font-bold mb-0.5">i</span>
              <button onClick={() => appendKey('i', 'i')} className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-bold">
                ENG
              </button>
            </div>
          </div>

          {/* ZONE 3: STANDARD NUMERIC KEYPAD & CALCULATION TRIGGERS */}
          <div className="grid grid-cols-5 gap-1.5 text-slate-100 text-sm font-bold mt-2">
            
            {/* Row 1 */}
            <button onClick={() => appendKey('7', '7')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl shadow-md active:scale-95 transition-all text-base">7</button>
            <button onClick={() => appendKey('8', '8')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl shadow-md active:scale-95 transition-all text-base">8</button>
            <button onClick={() => appendKey('9', '9')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl shadow-md active:scale-95 transition-all text-base">9</button>
            <button 
              onClick={handleDelete}
              className="p-3 bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md text-xs tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <Delete className="w-3.5 h-3.5" /> DEL
            </button>
            <button 
              onClick={handleClear}
              className="p-3 bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md text-xs active:scale-95 transition-all"
            >
              AC
            </button>

            {/* Row 2 */}
            <button onClick={() => appendKey('4', '4')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl shadow-md active:scale-95 transition-all text-base">4</button>
            <button onClick={() => appendKey('5', '5')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl shadow-md active:scale-95 transition-all text-base">5</button>
            <button onClick={() => appendKey('6', '6')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl shadow-md active:scale-95 transition-all text-base">6</button>
            
            <div className="relative group">
              <span className="absolute -top-3 left-4 text-[7px] text-amber-500 font-bold">nPr</span>
              <button onClick={() => isShift ? appendKey('P', 'P') : appendKey('×', '*')} className="w-full p-3 bg-slate-800 hover:bg-slate-750 rounded-xl text-base">×</button>
            </div>
            
            <div className="relative group">
              <span className="absolute -top-3 left-4 text-[7px] text-amber-500 font-bold">nCr</span>
              <button onClick={() => isShift ? appendKey('C', 'C') : appendKey('÷', '/')} className="w-full p-3 bg-slate-800 hover:bg-slate-750 rounded-xl text-base">÷</button>
            </div>

            {/* Row 3 */}
            <button onClick={() => appendKey('1', '1')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl shadow-md active:scale-95 transition-all text-base">1</button>
            <button onClick={() => appendKey('2', '2')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl shadow-md active:scale-95 transition-all text-base">2</button>
            <button onClick={() => appendKey('3', '3')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl shadow-md active:scale-95 transition-all text-base">3</button>
            <button onClick={() => appendKey('+', '+')} className="p-3 bg-slate-800 hover:bg-slate-750 rounded-xl text-base">+</button>
            <button onClick={() => appendKey('-', '-')} className="p-3 bg-slate-800 hover:bg-slate-750 rounded-xl text-base">-</button>

            {/* Row 4 */}
            <button onClick={() => appendKey('0', '0')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl shadow-md active:scale-95 transition-all text-base">0</button>
            <button onClick={() => appendKey('.', '.')} className="p-3 bg-slate-700 hover:bg-slate-650 rounded-xl text-base">.</button>
            
            <div className="relative group">
              <span className="absolute -top-3 left-4 text-[7px] text-amber-500 font-bold">e</span>
              <button onClick={() => isShift ? appendKey('e', 'e') : appendKey(' ×10^(', '*10**(')} className="w-full p-3 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs font-bold">×10ˣ</button>
            </div>

            <div className="relative group">
              <span className="absolute -top-3 left-4 text-[7px] text-amber-500 font-bold">π</span>
              <button onClick={() => isShift ? appendKey('π', 'pi') : appendKey('Ans', result)} className="w-full p-3 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs">Ans</button>
            </div>

            <div className="relative group">
              <span className="absolute -top-3 left-4 text-[7px] text-amber-500 font-bold">FACT</span>
              <button 
                onClick={isShift ? handleFact : handleEvaluate}
                className="w-full p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center"
              >
                <CornerDownLeft className="w-5 h-5" />
              </button>
            </div>

          </div>

        </div>

        {/* Footer LCD Tag */}
        <div className="mt-4 text-center text-[9px] text-slate-500 font-mono tracking-wider select-none uppercase">
          NATURAL-V.P.A.M. DISPLAY / CLASSWIZ ADVANCED CAS ENGINE
        </div>

      </div>
    </div>
  );
};
