import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, ChevronUp, Compass, ArrowRight, CheckCircle2, 
  Sparkles, Layers, Calculator, BookOpen, MoveRight, Scale,
  Sun, Moon, Copy, Check
} from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { TrigonometryChapterTools } from './TrigonometryChapterTools';

interface Vector2D {
  x: number;
  y: number;
}

interface Point2D {
  x: number;
  y: number;
}

export function VectorChapterTools() {
  // Global theme for Grade 10 Tools: 'light' (dễ đọc, chuẩn SGK) or 'dark' (tương phản cao)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Accordion state for Chapter 1 (Vectơ) and Chapter 2 (Hệ thức lượng trong tam giác)
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const [isModule2Open, setIsModule2Open] = useState(true);

  // Active Lesson state (1 to 5)
  const [activeLesson, setActiveLesson] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Solution Theme: 'light' (trắng giấy) or 'dark' (bảng phấn)
  const [solutionTheme, setSolutionTheme] = useState<'light' | 'dark'>('light');
  const [solutionFontSize, setSolutionFontSize] = useState<'normal' | 'large'>('normal');
  const [copiedLesson, setCopiedLesson] = useState<number | null>(null);

  // Handle global theme change
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    setSolutionTheme(newTheme);
  };

  const handleCopySolution = (text: string, lessonId: number) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedLesson(lessonId);
      setTimeout(() => setCopiedLesson(null), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  // ==========================================
  // BÀI 1: KHÁI NIỆM & ĐỘ DÀI VECTƠ STATE
  // ==========================================
  const [b1PointA, setB1PointA] = useState<Point2D>({ x: -2, y: 1 });
  const [b1PointB, setB1PointB] = useState<Point2D>({ x: 4, y: 5 });

  // Calculation for Lesson 1
  const b1Vector = useMemo(() => {
    const vx = b1PointB.x - b1PointA.x;
    const vy = b1PointB.y - b1PointA.y;
    const length = Math.sqrt(vx * vx + vy * vy);
    const unitX = length > 0 ? vx / length : 0;
    const unitY = length > 0 ? vy / length : 0;
    return { vx, vy, length, unitX, unitY };
  }, [b1PointA, b1PointB]);

  // ==========================================
  // BÀI 2: TỔNG & HIỆU VECTƠ (HBH) STATE
  // ==========================================
  const [b2VecU, setB2VecU] = useState<Vector2D>({ x: 4, y: 1 });
  const [b2VecV, setB2VecV] = useState<Vector2D>({ x: 1, y: 4 });
  const [b2Operation, setB2Operation] = useState<'sum' | 'diff' | 'both'>('sum');

  // Calculation for Lesson 2
  const b2Result = useMemo(() => {
    const sumX = b2VecU.x + b2VecV.x;
    const sumY = b2VecU.y + b2VecV.y;
    const sumLength = Math.sqrt(sumX * sumX + sumY * sumY);

    const diffX = b2VecU.x - b2VecV.x;
    const diffY = b2VecU.y - b2VecV.y;
    const diffLength = Math.sqrt(diffX * diffX + diffY * diffY);

    const lenU = Math.sqrt(b2VecU.x * b2VecU.x + b2VecU.y * b2VecU.y);
    const lenV = Math.sqrt(b2VecV.x * b2VecV.x + b2VecV.y * b2VecV.y);

    return { sumX, sumY, sumLength, diffX, diffY, diffLength, lenU, lenV };
  }, [b2VecU, b2VecV]);

  // ==========================================
  // BÀI 3: TÍCH VECTƠ VỚI MỘT SỐ & CÙNG PHƯƠNG
  // ==========================================
  const [b3VecA, setB3VecA] = useState<Vector2D>({ x: 3, y: 2 });
  const [b3K, setB3K] = useState<number>(2);

  // Parallel checker state
  const [b3CheckU, setB3CheckU] = useState<Vector2D>({ x: 2, y: -4 });
  const [b3CheckV, setB3CheckV] = useState<Vector2D>({ x: -3, y: 6 });

  const b3Result = useMemo(() => {
    const kAx = b3K * b3VecA.x;
    const kAy = b3K * b3VecA.y;
    const lenA = Math.sqrt(b3VecA.x * b3VecA.x + b3VecA.y * b3VecA.y);
    const lenKA = Math.abs(b3K) * lenA;

    // Check parallel condition: u1*v2 - u2*v1 = 0
    const crossProduct = b3CheckU.x * b3CheckV.y - b3CheckU.y * b3CheckV.x;
    const isParallel = Math.abs(crossProduct) < 1e-9;
    let ratio: number | null = null;
    if (isParallel) {
      if (b3CheckV.x !== 0) ratio = b3CheckU.x / b3CheckV.x;
      else if (b3CheckV.y !== 0) ratio = b3CheckU.y / b3CheckV.y;
    }

    return { kAx, kAy, lenA, lenKA, crossProduct, isParallel, ratio };
  }, [b3VecA, b3K, b3CheckU, b3CheckV]);

  // ==========================================
  // BÀI 4: HỆ TRỤC TỌA ĐỘ, TRUNG ĐIỂM & TRỌNG TÂM
  // ==========================================
  const [b4A, setB4A] = useState<Point2D>({ x: 1, y: 5 });
  const [b4B, setB4B] = useState<Point2D>({ x: -3, y: -1 });
  const [b4C, setB4C] = useState<Point2D>({ x: 5, y: -2 });

  const b4Result = useMemo(() => {
    // Vectors AB, BC, CA
    const vecAB = { x: b4B.x - b4A.x, y: b4B.y - b4A.y };
    const vecBC = { x: b4C.x - b4B.x, y: b4C.y - b4B.y };
    const vecCA = { x: b4A.x - b4C.x, y: b4A.y - b4C.y };

    // Lengths
    const sideAB = Math.sqrt(vecAB.x * vecAB.x + vecAB.y * vecAB.y);
    const sideBC = Math.sqrt(vecBC.x * vecBC.x + vecBC.y * vecBC.y);
    const sideCA = Math.sqrt(vecCA.x * vecCA.x + vecCA.y * vecCA.y);

    // Midpoints
    const M_ab = { x: (b4A.x + b4B.x) / 2, y: (b4A.y + b4B.y) / 2 };
    const M_bc = { x: (b4B.x + b4C.x) / 2, y: (b4B.y + b4C.y) / 2 };
    const M_ca = { x: (b4C.x + b4A.x) / 2, y: (b4C.y + b4A.y) / 2 };

    // Centroid G
    const G = {
      x: (b4A.x + b4B.x + b4C.x) / 3,
      y: (b4A.y + b4B.y + b4C.y) / 3
    };

    // Area of triangle ABC using Shoelace formula
    const area = 0.5 * Math.abs(
      b4A.x * (b4B.y - b4C.y) +
      b4B.x * (b4C.y - b4A.y) +
      b4C.x * (b4A.y - b4B.y)
    );

    return { vecAB, vecBC, vecCA, sideAB, sideBC, sideCA, M_ab, M_bc, M_ca, G, area };
  }, [b4A, b4B, b4C]);

  // ==========================================
  // BÀI 5: TÍCH VÔ HƯỚNG & GÓC GIỮA HAI VECTƠ
  // ==========================================
  const [b5VecA, setB5VecA] = useState<Vector2D>({ x: 3, y: 1 });
  const [b5VecB, setB5VecB] = useState<Vector2D>({ x: 2, y: 4 });

  const b5Result = useMemo(() => {
    const dotProduct = b5VecA.x * b5VecB.x + b5VecA.y * b5VecB.y;
    const lenA = Math.sqrt(b5VecA.x * b5VecA.x + b5VecA.y * b5VecA.y);
    const lenB = Math.sqrt(b5VecB.x * b5VecB.x + b5VecB.y * b5VecB.y);

    let cosTheta = 0;
    let angleRad = 0;
    let angleDeg = 0;

    if (lenA > 0 && lenB > 0) {
      cosTheta = dotProduct / (lenA * lenB);
      // clamp to [-1, 1] to avoid NaN from floating point error
      const clampedCos = Math.max(-1, Math.min(1, cosTheta));
      angleRad = Math.acos(clampedCos);
      angleDeg = (angleRad * 180) / Math.PI;
    }

    const isPerpendicular = Math.abs(dotProduct) < 1e-9;
    const crossProduct = b5VecA.x * b5VecB.y - b5VecA.y * b5VecB.x;
    const isParallel = Math.abs(crossProduct) < 1e-9;

    // Projection of A onto B
    let projLength = 0;
    let projVec = { x: 0, y: 0 };
    if (lenB > 0) {
      projLength = dotProduct / lenB;
      projVec = {
        x: (dotProduct / (lenB * lenB)) * b5VecB.x,
        y: (dotProduct / (lenB * lenB)) * b5VecB.y
      };
    }

    return { dotProduct, lenA, lenB, cosTheta, angleDeg, angleRad, isPerpendicular, isParallel, projLength, projVec };
  }, [b5VecA, b5VecB]);

  // Markdown strings for step-by-step solutions
  const b1Markdown = useMemo(() => {
    return [
      "#### GIẢI CHI TIẾT (BÀI 1: KHÁI NIỆM & ĐỘ DÀI VECTƠ)",
      "",
      `1. **Tính Tọa Độ Vectơ $\\vec{AB}$:**`,
      `   Công thức: $\\vec{AB} = (x_B - x_A, y_B - y_A)$`,
      `   Thay số: $\\vec{AB} = (${b1PointB.x} - (${b1PointA.x}), ${b1PointB.y} - (${b1PointA.y})) = (${b1Vector.vx}, ${b1Vector.vy})$`,
      "",
      `2. **Tính Độ Dài Vectơ $|\\vec{AB}| = AB$:**`,
      `   Công thức: $|\\vec{AB}| = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2}$`,
      `   Thay số: $|\\vec{AB}| = \\sqrt{(${b1Vector.vx})^2 + (${b1Vector.vy})^2} = \\sqrt{${b1Vector.vx * b1Vector.vx + b1Vector.vy * b1Vector.vy}} \\approx ${b1Vector.length.toFixed(3)}$`,
      "",
      `3. **Vectơ Đơn Vị Cùng Hướng $\\vec{e}$:**`,
      `   Công thức: $\\vec{e} = \\frac{\\vec{AB}}{|\\vec{AB}|} = \\left(${b1Vector.unitX.toFixed(3)}, ${b1Vector.unitY.toFixed(3)}\\right)$`
    ].join("\n");
  }, [b1PointA, b1PointB, b1Vector]);

  const b2Markdown = useMemo(() => {
    return [
      "#### GIẢI CHI TIẾT (BÀI 2: TỔNG & HIỆU VECTƠ)",
      "",
      "1. **Tổng hai vectơ theo tọa độ:**",
      `   $$\\vec{u} + \\vec{v} = (u_1 + v_1, u_2 + v_2) = (${b2VecU.x} + (${b2VecV.x}), ${b2VecU.y} + (${b2VecV.y})) = (${b2Result.sumX}, ${b2Result.sumY})$$`,
      `   Độ dài vectơ tổng: $|\\vec{u} + \\vec{v}| = \\sqrt{(${b2Result.sumX})^2 + (${b2Result.sumY})^2} \\approx ${b2Result.sumLength.toFixed(3)}$`,
      "",
      "2. **Hiệu hai vectơ theo tọa độ:**",
      `   $$\\vec{u} - \\vec{v} = (u_1 - v_1, u_2 - v_2) = (${b2VecU.x} - (${b2VecV.x}), ${b2VecU.y} - (${b2VecV.y})) = (${b2Result.diffX}, ${b2Result.diffY})$$`,
      `   Độ dài vectơ hiệu: $|\\vec{u} - \\vec{v}| = \\sqrt{(${b2Result.diffX})^2 + (${b2Result.diffY})^2} \\approx ${b2Result.diffLength.toFixed(3)}$`,
      "",
      "3. **Ý nghĩa hình học (Quy tắc Hình Bình Hành):**",
      `   Nếu dựng $\\vec{OA} = \\vec{u}$ và $\\vec{OB} = \\vec{v}$ thì vectơ tổng $\\vec{u} + \\vec{v}$ là đường chéo $\\vec{OC}$ của hình bình hành $OACB$.`
    ].join("\n");
  }, [b2VecU, b2VecV, b2Result]);

  const b3Markdown = useMemo(() => {
    return [
      "#### GIẢI CHI TIẾT (BÀI 3: TÍCH VECTƠ VỚI MỘT SỐ)",
      "",
      `1. **Tọa độ của vectơ $k\\vec{a}$:**`,
      `   $$k\\vec{a} = k(a_1, a_2) = (${b3K} \\cdot (${b3VecA.x}), ${b3K} \\cdot (${b3VecA.y})) = (${b3Result.kAx}, ${b3Result.kAy})$$`,
      "",
      "2. **Độ dài tương quan:**",
      `   $$|k\\vec{a}| = |k| \\cdot |\\vec{a}| = |${b3K}| \\cdot ${b3Result.lenA.toFixed(2)} = ${b3Result.lenKA.toFixed(2)}$$`,
      "",
      `3. **Điều kiện hai vectơ cùng phương $\\vec{u}(u_1, u_2)$ và $\\vec{v}(v_1, v_2)$:**`,
      `   Biểu thức đường chéo: $u_1 v_2 - u_2 v_1 = (${b3CheckU.x}) \\cdot (${b3CheckV.y}) - (${b3CheckU.y}) \\cdot (${b3CheckV.x}) = ${b3Result.crossProduct}$`,
      `   - Nếu $u_1 v_2 - u_2 v_1 = 0 \\iff \\vec{u}$ và $\\vec{v}$ **Cùng phương**.`
    ].join("\n");
  }, [b3K, b3VecA, b3CheckU, b3CheckV, b3Result]);

  const b4Markdown = useMemo(() => {
    return [
      "#### GIẢI CHI TIẾT (BÀI 4: HỆ TRỤC TỌA ĐỘ, TRUNG ĐIỂM & TRỌNG TÂM)",
      "",
      "1. **Tọa độ các vectơ cạnh:**",
      `   - $\\vec{AB} = (${b4Result.vecAB.x}, ${b4Result.vecAB.y})$, độ dài $AB \\approx ${b4Result.sideAB.toFixed(2)}$`,
      `   - $\\vec{BC} = (${b4Result.vecBC.x}, ${b4Result.vecBC.y})$, độ dài $BC \\approx ${b4Result.sideBC.toFixed(2)}$`,
      `   - $\\vec{CA} = (${b4Result.vecCA.x}, ${b4Result.vecCA.y})$, độ dài $CA \\approx ${b4Result.sideCA.toFixed(2)}$`,
      "",
      "2. **Tọa độ Trung điểm các cạnh:**",
      `   - Trung điểm $M$ của $AB$: $M\\left(\\frac{${b4A.x} + (${b4B.x})}{2}, \\frac{${b4A.y} + (${b4B.y})}{2}\\right) = (${b4Result.M_ab.x}, ${b4Result.M_ab.y})$`,
      `   - Trung điểm $N$ của $BC$: $N\\left(${b4Result.M_bc.x}, ${b4Result.M_bc.y}\\right)$`,
      "",
      "3. **Tọa độ Trọng tâm $G$ của $\\triangle ABC$:**",
      `   - $x_G = \\frac{x_A + x_B + x_C}{3} = \\frac{${b4A.x} + (${b4B.x}) + (${b4C.x})}{3} = ${b4Result.G.x.toFixed(3)}$`,
      `   - $y_G = \\frac{y_A + y_B + y_C}{3} = \\frac{${b4A.y} + (${b4B.y}) + (${b4C.y})}{3} = ${b4Result.G.y.toFixed(3)}$`,
      `   - Suy ra $G\\left(${b4Result.G.x.toFixed(2)}, ${b4Result.G.y.toFixed(2)}\\right)$`
    ].join("\n");
  }, [b4A, b4B, b4C, b4Result]);

  const b5Markdown = useMemo(() => {
    return [
      "#### GIẢI CHI TIẾT (BÀI 5: TÍCH VÔ HƯỚNG & GÓC GIỮA HAI VECTƠ)",
      "",
      "1. **Công thức Tích Vô Hướng Tọa Độ:**",
      `   $$\\vec{a} \\cdot \\vec{b} = a_1 b_1 + a_2 b_2 = (${b5VecA.x}) \\cdot (${b5VecB.x}) + (${b5VecA.y}) \\cdot (${b5VecB.y}) = ${b5Result.dotProduct}$$`,
      "",
      "2. **Tính Độ Dài Từng Vectơ:**",
      `   - $|\\vec{a}| = \\sqrt{(${b5VecA.x})^2 + (${b5VecA.y})^2} \\approx ${b5Result.lenA.toFixed(3)}$`,
      `   - $|\\vec{b}| = \\sqrt{(${b5VecB.x})^2 + (${b5VecB.y})^2} \\approx ${b5Result.lenB.toFixed(3)}$`,
      "",
      "3. **Tính Côsin Góc $\\theta = (\\vec{a}, \\vec{b})$:**",
      `   $$\\cos(\\vec{a}, \\vec{b}) = \\frac{\\vec{a} \\cdot \\vec{b}}{|\\vec{a}| \\cdot |\\vec{b}|} = \\frac{${b5Result.dotProduct}}{${b5Result.lenA.toFixed(3)} \\cdot ${b5Result.lenB.toFixed(3)}} = ${b5Result.cosTheta.toFixed(4)}$$`,
      `   Suy ra góc giữa hai vectơ: $\\theta \\approx ${b5Result.angleDeg.toFixed(2)}^\\circ \\quad (${b5Result.angleRad.toFixed(3)} \\text{ rad})$`
    ].join("\n");
  }, [b5VecA, b5VecB, b5Result]);

  const isLightMode = theme === 'light';

  // Helper to render coordinate grid SVG
  const renderSvgGridCanvas = (
    elements: (toSvgX: (x: number) => number, toSvgY: (y: number) => number, originX: number, originY: number) => React.ReactNode,
    viewBounds = { minX: -7, maxX: 7, minY: -7, maxY: 7 }
  ) => {
    const width = 500;
    const height = 360;
    const padding = 30;

    const scaleX = (width - 2 * padding) / (viewBounds.maxX - viewBounds.minX);
    const scaleY = (height - 2 * padding) / (viewBounds.maxY - viewBounds.minY);

    const toSvgX = (x: number) => padding + (x - viewBounds.minX) * scaleX;
    const toSvgY = (y: number) => height - (padding + (y - viewBounds.minY) * scaleY);

    const originX = toSvgX(0);
    const originY = toSvgY(0);

    const gridLines = [];
    const gridStroke = isLightMode ? "#e2e8f0" : "#334155";
    const textFill = isLightMode ? "#475569" : "#94a3b8";
    const axisStroke = isLightMode ? "#0f172a" : "#cbd5e1";
    const axisTextFill = isLightMode ? "#0f172a" : "#f8fafc";

    for (let x = Math.ceil(viewBounds.minX); x <= Math.floor(viewBounds.maxX); x++) {
      if (x === 0) continue;
      const svgX = toSvgX(x);
      gridLines.push(
        <line
          key={`grid-x-${x}`}
          x1={svgX}
          y1={padding}
          x2={svgX}
          y2={height - padding}
          stroke={gridStroke}
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      );
      gridLines.push(
        <text
          key={`label-x-${x}`}
          x={svgX}
          y={originY + 14}
          fill={textFill}
          fontSize="10"
          fontWeight="600"
          textAnchor="middle"
          className="font-mono select-none"
        >
          {x}
        </text>
      );
    }

    for (let y = Math.ceil(viewBounds.minY); y <= Math.floor(viewBounds.maxY); y++) {
      if (y === 0) continue;
      const svgY = toSvgY(y);
      gridLines.push(
        <line
          key={`grid-y-${y}`}
          x1={padding}
          y1={svgY}
          x2={width - padding}
          y2={svgY}
          stroke={gridStroke}
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      );
      gridLines.push(
        <text
          key={`label-y-${y}`}
          x={originX - 10}
          y={svgY + 3}
          fill={textFill}
          fontSize="10"
          fontWeight="600"
          textAnchor="end"
          className="font-mono select-none"
        >
          {y}
        </text>
      );
    }

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full h-auto rounded-2xl border transition-colors shadow-sm overflow-hidden select-none ${
          isLightMode ? "bg-white border-slate-300" : "bg-slate-950 border-slate-700"
        }`}
      >
        <defs>
          <marker
            id="arrow-teal"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill={isLightMode ? "#0d9488" : "#14b8a6"} />
          </marker>
          <marker
            id="arrow-indigo"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill={isLightMode ? "#4338ca" : "#818cf8"} />
          </marker>
          <marker
            id="arrow-amber"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill={isLightMode ? "#d97706" : "#f59e0b"} />
          </marker>
          <marker
            id="arrow-rose"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill={isLightMode ? "#e11d48" : "#f43f5e"} />
          </marker>
          <marker
            id="arrow-emerald"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill={isLightMode ? "#059669" : "#10b981"} />
          </marker>
        </defs>

        {/* Grid lines */}
        {gridLines}

        {/* Main Ox and Oy Axes */}
        <line
          x1={padding}
          y1={originY}
          x2={width - padding}
          y2={originY}
          stroke={axisStroke}
          strokeWidth="2"
        />
        <line
          x1={originX}
          y1={padding}
          x2={originX}
          y2={height - padding}
          stroke={axisStroke}
          strokeWidth="2"
        />

        {/* Axis Labels */}
        <text x={width - padding + 5} y={originY + 4} fill={axisTextFill} fontSize="12" fontWeight="bold">x</text>
        <text x={originX - 4} y={padding - 8} fill={axisTextFill} fontSize="12" fontWeight="bold">y</text>
        <text x={originX - 12} y={originY + 16} fill={axisTextFill} fontSize="11" fontWeight="bold">O</text>

        {/* Custom SVG elements */}
        {elements(toSvgX, toSvgY, originX, originY)}
      </svg>
    );
  };

  // Helper to render high-contrast, crystal-clear solution card
  const renderSolutionCard = (content: string, lessonId: number, lessonTitle: string) => {
    const isSolLight = solutionTheme === 'light';
    const isLarge = solutionFontSize === 'large';

    return (
      <div className={`rounded-2xl border transition-all duration-200 shadow-md overflow-hidden ${
        isSolLight
          ? "bg-white border-indigo-200 text-slate-900 ring-1 ring-indigo-100"
          : "bg-slate-900 border-slate-700 text-slate-100 ring-1 ring-slate-800"
      }`}>
        {/* Header Bar */}
        <div className={`p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 border-b ${
          isSolLight ? "bg-indigo-50/90 border-indigo-100" : "bg-slate-850 border-slate-750"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs ${
              isSolLight ? "bg-indigo-600 text-white" : "bg-indigo-950 text-indigo-300 border border-indigo-700"
            }`}>
              📖 LỜI GIẢI CHI TIẾT
            </span>
            <span className={`text-xs font-bold truncate ${isSolLight ? "text-indigo-950" : "text-slate-100"}`}>
              {lessonTitle}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme switcher */}
            <div className={`flex items-center p-0.5 rounded-xl border ${
              isSolLight ? "bg-indigo-100/70 border-indigo-200" : "bg-slate-800 border-slate-700"
            }`}>
              <button
                type="button"
                onClick={() => setSolutionTheme('light')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  isSolLight
                    ? "bg-white text-indigo-950 shadow-xs border border-indigo-200"
                    : "text-slate-300 hover:text-white"
                }`}
                title="Nền giấy sáng (Khuyên dùng - Dễ đọc nhất)"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Nền sáng</span>
              </button>
              <button
                type="button"
                onClick={() => setSolutionTheme('dark')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  !isSolLight
                    ? "bg-slate-700 text-amber-300 shadow-xs border border-slate-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Bảng phấn dạ quang"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Nền tối</span>
              </button>
            </div>

            {/* Font size button */}
            <button
              type="button"
              onClick={() => setSolutionFontSize(isLarge ? 'normal' : 'large')}
              className={`px-2.5 py-1 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                isSolLight
                  ? "bg-white hover:bg-slate-100 text-slate-800 border-indigo-200 shadow-2xs"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
              }`}
              title="Đổi cỡ chữ hiển thị"
            >
              <span>{isLarge ? 'Cỡ thường' : 'Chữ to'}</span>
            </button>

            {/* Copy button */}
            <button
              type="button"
              onClick={() => handleCopySolution(content, lessonId)}
              className={`p-1.5 sm:px-2.5 sm:py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                isSolLight
                  ? "bg-white hover:bg-slate-100 text-slate-800 border-indigo-200 shadow-2xs"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
              }`}
              title="Sao chép lời giải"
            >
              {copiedLesson === lessonId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline text-emerald-600">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Sao chép</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Markdown Content Area with high contrast */}
        <div className={`p-4 sm:p-6 select-text overflow-x-auto ${
          isLarge ? "text-sm sm:text-base leading-relaxed" : "text-xs sm:text-sm leading-normal"
        }`}>
          <MarkdownRenderer
            className={isSolLight
              ? "markdown-body prose prose-slate max-w-none prose-headings:text-indigo-950 prose-headings:font-black prose-p:text-slate-900 prose-p:font-medium prose-strong:text-indigo-950 prose-li:text-slate-900"
              : "markdown-body prose prose-invert max-w-none prose-headings:text-amber-300 prose-headings:font-black prose-p:text-slate-100 prose-p:font-medium prose-strong:text-amber-300 prose-li:text-slate-100"
            }
            content={content}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full transition-colors duration-200 rounded-3xl border shadow-xl overflow-hidden font-sans p-4 sm:p-6 space-y-6 ${
      isLightMode 
        ? "bg-white text-slate-900 border-slate-200/90" 
        : "bg-slate-900 text-slate-100 border-slate-800"
    }`}>
      
      {/* HEADER SECTION WITH HIGH-CONTRAST THEME SWITCHER */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 ${
        isLightMode ? "border-slate-200" : "border-slate-800"
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl text-white shadow-md shadow-indigo-500/20">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                isLightMode 
                  ? "text-indigo-700 bg-indigo-50 border-indigo-200" 
                  : "text-indigo-300 bg-indigo-950/80 border-indigo-800"
              }`}>
                MÔN TOÁN 10 • GDPT 2018
              </span>
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight mt-0.5 ${
                isLightMode ? "text-slate-900" : "text-white"
              }`}>
                Công Cụ Minh Họa Trực Quan Theo Chương & Bài Học
              </h2>
            </div>
          </div>
          <p className={`text-xs pl-11 ${isLightMode ? "text-slate-600" : "text-slate-300"}`}>
            Mô phỏng hình học tương tác số, máy tính tọa độ và giải chi tiết từng bài học sách <strong className={isLightMode ? "text-slate-900" : "text-white"}>Kết nối tri thức với cuộc sống</strong>.
          </p>
        </div>

        {/* Global Controls & Theme Mode */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Main Theme Switcher */}
          <div className={`flex items-center p-1 rounded-2xl border shadow-2xs ${
            isLightMode ? "bg-slate-100 border-slate-200" : "bg-slate-800 border-slate-700"
          }`}>
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                isLightMode 
                  ? "bg-white text-indigo-950 shadow-xs border border-indigo-200" 
                  : "text-slate-300 hover:text-white"
              }`}
              title="Chế độ nền sáng: Chữ sắc nét, độ tương phản cao, dễ đọc nhất"
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Nền sáng (Dễ đọc)</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                !isLightMode 
                  ? "bg-slate-900 text-amber-300 shadow-xs border border-slate-700" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Chế độ nền tối: Tương phản cao"
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Nền tối</span>
            </button>
          </div>

          <span className={`px-3 py-1.5 font-black text-xs rounded-xl flex items-center gap-1.5 border shadow-2xs ${
            isLightMode 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
              : "bg-emerald-950/80 text-emerald-300 border-emerald-800"
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            8/8 Bài học sẵn sàng (2 Chương)
          </span>
        </div>
      </div>

      {/* ACCORDION MODULE 1: TOÁN 10 - CHƯƠNG VECTƠ */}
      <div className={`border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm ${
        isLightMode 
          ? "bg-white border-slate-200" 
          : "bg-slate-850 border-slate-750"
      }`}>
        
        {/* Accordion Bar Header */}
        <button
          type="button"
          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
          className={`w-full p-4 sm:p-5 flex items-center justify-between transition-colors text-left cursor-pointer select-none border-b ${
            isLightMode 
              ? "bg-indigo-50/60 hover:bg-indigo-100/60 border-indigo-100/80 text-slate-900" 
              : "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shrink-0 shadow-2xs ${
              isLightMode 
                ? "bg-indigo-600 text-white" 
                : "bg-purple-900/80 border border-purple-700 text-purple-200"
            }`}>
              01
            </div>
            <div>
              <h3 className={`font-black text-sm sm:text-base flex items-center gap-2 ${
                isLightMode ? "text-slate-900" : "text-white"
              }`}>
                <span>Mục 1: Toán 10 - Chương Vectơ (Sách Kết nối tri thức)</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  isLightMode 
                    ? "bg-purple-100 border-purple-200 text-purple-900" 
                    : "bg-purple-950 border-purple-800 text-purple-300"
                }`}>
                  Chương IV
                </span>
              </h3>
              <p className={`text-xs mt-0.5 font-medium ${isLightMode ? "text-slate-600" : "text-slate-300"}`}>
                Khái niệm, quy tắc tổng hiệu, tích với một số, hệ trục $Oxy$ & tích vô hướng hai vectơ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-bold hidden md:inline ${isLightMode ? "text-indigo-800" : "text-slate-300"}`}>
              {isAccordionOpen ? "Thu gọn" : "Mở rộng nội dung"}
            </span>
            <div className={`p-1.5 rounded-lg border shadow-2xs ${
              isLightMode 
                ? "bg-white text-slate-800 border-slate-200" 
                : "bg-slate-800 text-slate-200 border-slate-700"
            }`}>
              {isAccordionOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </button>

        {/* Accordion Body: Lesson Menu & Interactive Area */}
        {isAccordionOpen && (
          <div className={`p-4 sm:p-6 space-y-6 ${isLightMode ? "bg-white" : "bg-slate-900/80"}`}>
            
            {/* LESSON NAVIGATION DROPDOWN / MENU BUTTONS */}
            <div className="space-y-2">
              <label className={`block text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isLightMode ? "text-slate-800" : "text-slate-200"
              }`}>
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Chọn bài học cần minh họa & tính toán:
              </label>

              {/* Responsive Grid Tabs for 5 Lessons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {[
                  {
                    id: 1 as const,
                    title: "Bài 1: Khái niệm & Độ dài",
                    sub: "Vector AB, độ dài |a|",
                  },
                  {
                    id: 2 as const,
                    title: "Bài 2: Tổng & Hiệu vectơ",
                    sub: "Quy tắc 3 điểm & HBH",
                  },
                  {
                    id: 3 as const,
                    title: "Bài 3: Tích k.a & Cùng phương",
                    sub: "Hệ số k, điều kiện k.a",
                  },
                  {
                    id: 4 as const,
                    title: "Bài 4: Tọa độ & Trung điểm",
                    sub: "Trung điểm M, Trọng tâm G",
                  },
                  {
                    id: 5 as const,
                    title: "Bài 5: Tích vô hướng & Góc",
                    sub: "a.b = |a||b|cos(a,b)",
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveLesson(item.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      activeLesson === item.id
                        ? isLightMode
                          ? "bg-indigo-50/90 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/20 shadow-md"
                          : "bg-slate-800 border-indigo-400 text-white ring-2 ring-indigo-500/40 shadow-lg"
                        : isLightMode
                          ? "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 text-slate-800 shadow-2xs"
                          : "bg-slate-800/60 border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          activeLesson === item.id 
                            ? "bg-indigo-600 text-white" 
                            : isLightMode ? "bg-slate-200 text-slate-700" : "bg-slate-700 text-slate-300"
                        }`}>
                          Bài 0{item.id}
                        </span>
                        {activeLesson === item.id && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                      </div>
                      <h4 className={`font-black text-xs leading-tight ${
                        activeLesson === item.id 
                          ? isLightMode ? "text-indigo-950 font-black" : "text-white"
                          : isLightMode ? "text-slate-800" : "text-slate-200"
                      }`}>
                        {item.title}
                      </h4>
                    </div>
                    <span className={`text-[10px] font-semibold mt-2 block truncate ${
                      isLightMode ? "text-slate-600" : "text-slate-300"
                    }`}>
                      {item.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* WORKSPACE AREA FOR SELECTED LESSON */}
            <div className={`border rounded-3xl p-4 sm:p-6 space-y-6 shadow-sm ${
              isLightMode 
                ? "bg-slate-50/90 border-slate-200 text-slate-900" 
                : "bg-slate-900 border-slate-700 text-slate-100"
            }`}>
              
              {/* ========================================================================= */}
              {/* LESSON 1 WORKSPACE: KHÁI NIỆM VECTƠ & ĐỘ DÀI VECTƠ */}
              {/* ========================================================================= */}
              {activeLesson === 1 && (
                <div className="space-y-6">
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
                    isLightMode ? "border-slate-200" : "border-slate-800"
                  }`}>
                    <div>
                      <span className={`text-xs font-black uppercase tracking-widest ${
                        isLightMode ? "text-indigo-700" : "text-indigo-400"
                      }`}>
                        BÀI 1 • SÁCH KẾT NỐI TRI THỨC
                      </span>
                      <h3 className={`text-lg font-black flex items-center gap-2 mt-0.5 ${
                        isLightMode ? "text-slate-900" : "text-white"
                      }`}>
                        <MoveRight className="w-5 h-5 text-indigo-600" />
                        Khái Niệm Vectơ, Độ Dài Vectơ & Vectơ Đơn Vị
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setB1PointA({ x: -2, y: 1 }); setB1PointB({ x: 4, y: 5 }); }}
                        className={`px-3 py-1.5 text-xs font-black rounded-xl border cursor-pointer transition-colors shadow-2xs ${
                          isLightMode 
                            ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-300" 
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                        }`}
                      >
                        Đặt lại điểm mẫu
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Controls Column */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
                        isLightMode 
                          ? "bg-white border-slate-200" 
                          : "bg-slate-800 border-slate-700"
                      }`}>
                        <span className={`text-xs font-black uppercase tracking-wider block border-b pb-2 ${
                          isLightMode ? "text-slate-900 border-slate-100" : "text-slate-100 border-slate-700"
                        }`}>
                          {"1. Nhập tọa độ Điểm đầu $A$ & Điểm cuối $B$"}
                        </span>

                        {/* Point A Sliders */}
                        <div className="space-y-2">
                          <label className={`text-xs font-black flex items-center justify-between ${
                            isLightMode ? "text-indigo-900" : "text-indigo-300"
                          }`}>
                            <span>{"Điểm đầu $A(x_A, y_A)$:"}</span>
                            <span className={`font-mono px-2 py-0.5 rounded-lg border font-bold ${
                              isLightMode 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-900" 
                                : "bg-indigo-950 border-indigo-700 text-indigo-200"
                            }`}>
                              ({b1PointA.x}, {b1PointA.y})
                            </span>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>x_A = {b1PointA.x}</span>
                              <input
                                type="range"
                                min="-6"
                                max="6"
                                value={b1PointA.x}
                                onChange={(e) => setB1PointA({ ...b1PointA, x: Number(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>y_A = {b1PointA.y}</span>
                              <input
                                type="range"
                                min="-6"
                                max="6"
                                value={b1PointA.y}
                                onChange={(e) => setB1PointA({ ...b1PointA, y: Number(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Point B Sliders */}
                        <div className={`space-y-2 pt-3 border-t ${
                          isLightMode ? "border-slate-100" : "border-slate-700"
                        }`}>
                          <label className={`text-xs font-black flex items-center justify-between ${
                            isLightMode ? "text-teal-900" : "text-teal-300"
                          }`}>
                            <span>{"Điểm cuối $B(x_B, y_B)$:"}</span>
                            <span className={`font-mono px-2 py-0.5 rounded-lg border font-bold ${
                              isLightMode 
                                ? "bg-teal-50 border-teal-200 text-teal-900" 
                                : "bg-teal-950 border-teal-700 text-teal-200"
                            }`}>
                              ({b1PointB.x}, {b1PointB.y})
                            </span>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>x_B = {b1PointB.x}</span>
                              <input
                                type="range"
                                min="-6"
                                max="6"
                                value={b1PointB.x}
                                onChange={(e) => setB1PointB({ ...b1PointB, x: Number(e.target.value) })}
                                className="w-full accent-teal-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>y_B = {b1PointB.y}</span>
                              <input
                                type="range"
                                min="-6"
                                max="6"
                                value={b1PointB.y}
                                onChange={(e) => setB1PointB({ ...b1PointB, y: Number(e.target.value) })}
                                className="w-full accent-teal-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-4 rounded-2xl border shadow-xs ${
                          isLightMode 
                            ? "bg-indigo-50/90 border-indigo-200" 
                            : "bg-indigo-950/70 border-indigo-700"
                        }`}>
                          <span className={`text-xs font-black uppercase block mb-1 ${
                            isLightMode ? "text-indigo-800" : "text-indigo-300"
                          }`}>
                            {"Tọa độ Vectơ $\\vec{AB}$"}
                          </span>
                          <span className={`text-lg font-black font-mono ${
                            isLightMode ? "text-indigo-950" : "text-white"
                          }`}>
                            ({b1Vector.vx}, {b1Vector.vy})
                          </span>
                        </div>
                        <div className={`p-4 rounded-2xl border shadow-xs ${
                          isLightMode 
                            ? "bg-teal-50/90 border-teal-200" 
                            : "bg-teal-950/70 border-teal-700"
                        }`}>
                          <span className={`text-xs font-black uppercase block mb-1 ${
                            isLightMode ? "text-teal-800" : "text-teal-300"
                          }`}>
                            {"Độ dài $|\\vec{AB}|$"}
                          </span>
                          <span className={`text-lg font-black font-mono ${
                            isLightMode ? "text-teal-950" : "text-teal-200"
                          }`}>
                            {b1Vector.length.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Canvas & Explanation Column */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* SVG Canvas Graphic */}
                      {renderSvgGridCanvas((toSvgX, toSvgY) => {
                        const ax = toSvgX(b1PointA.x);
                        const ay = toSvgY(b1PointA.y);
                        const bx = toSvgX(b1PointB.x);
                        const by = toSvgY(b1PointB.y);

                        return (
                          <>
                            {/* Line AB with Arrow */}
                            <line
                              x1={ax}
                              y1={ay}
                              x2={bx}
                              y2={by}
                              stroke={isLightMode ? "#0d9488" : "#14b8a6"}
                              strokeWidth="3.5"
                              markerEnd="url(#arrow-teal)"
                            />

                            {/* Point A */}
                            <circle cx={ax} cy={ay} r="6" fill={isLightMode ? "#4338ca" : "#6366f1"} />
                            <text x={ax - 12} y={ay - 12} fill={isLightMode ? "#312e81" : "#818cf8"} fontSize="13" fontWeight="bold">
                              A({b1PointA.x}, {b1PointA.y})
                            </text>

                            {/* Point B */}
                            <circle cx={bx} cy={by} r="6" fill={isLightMode ? "#0d9488" : "#14b8a6"} />
                            <text x={bx + 8} y={by - 12} fill={isLightMode ? "#064e3b" : "#2dd4bf"} fontSize="13" fontWeight="bold">
                              B({b1PointB.x}, {b1PointB.y})
                            </text>

                            {/* Label AB Vector Length */}
                            <rect
                              x={(ax + bx) / 2 - 5}
                              y={(ay + by) / 2 - 25}
                              width="95"
                              height="22"
                              rx="6"
                              fill={isLightMode ? "#ffffff" : "#0f172a"}
                              stroke={isLightMode ? "#d97706" : "#f59e0b"}
                              strokeWidth="1.5"
                            />
                            <text
                              x={(ax + bx) / 2 + 42}
                              y={(ay + by) / 2 - 10}
                              fill={isLightMode ? "#92400e" : "#fbbf24"}
                              fontSize="11"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              |AB| ≈ {b1Vector.length.toFixed(2)}
                            </text>
                          </>
                        );
                      })}

                      {/* Explanation Markdown */}
                      {renderSolutionCard(b1Markdown, 1, "Bài 1: Khái niệm & Độ dài vectơ")}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* LESSON 2 WORKSPACE: TỔNG & HIỆU VECTƠ (QUY TẮC HÌNH BÌNH HÀNH) */}
              {/* ========================================================================= */}
              {activeLesson === 2 && (
                <div className="space-y-6">
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
                    isLightMode ? "border-slate-200" : "border-slate-800"
                  }`}>
                    <div>
                      <span className={`text-xs font-black uppercase tracking-widest ${
                        isLightMode ? "text-teal-700" : "text-teal-400"
                      }`}>
                        BÀI 2 • SÁCH KẾT NỐI TRI THỨC
                      </span>
                      <h3 className={`text-lg font-black flex items-center gap-2 mt-0.5 ${
                        isLightMode ? "text-slate-900" : "text-white"
                      }`}>
                        <Layers className="w-5 h-5 text-teal-600" />
                        Tổng & Hiệu Hai Vectơ (Quy Tắc Hình Bình Hành & Quy Tắc 3 Điểm)
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setB2VecU({ x: 4, y: 1 }); setB2VecV({ x: 1, y: 4 }); }}
                        className={`px-3 py-1.5 text-xs font-black rounded-xl border cursor-pointer transition-colors shadow-2xs ${
                          isLightMode 
                            ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-300" 
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                        }`}
                      >
                        Đặt lại vectơ mẫu
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Controls */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
                        isLightMode 
                          ? "bg-white border-slate-200" 
                          : "bg-slate-800 border-slate-700"
                      }`}>
                        <span className={`text-xs font-black uppercase tracking-wider block border-b pb-2 ${
                          isLightMode ? "text-slate-900 border-slate-100" : "text-slate-100 border-slate-700"
                        }`}>
                          {"1. Nhập tọa độ hai vectơ $\\vec{u}$ và $\\vec{v}$"}
                        </span>

                        {/* Vector u */}
                        <div className="space-y-2">
                          <label className={`text-xs font-black flex items-center justify-between ${
                            isLightMode ? "text-indigo-900" : "text-indigo-300"
                          }`}>
                            <span>{"Vectơ $\\vec{u}(u_1, u_2)$:"}</span>
                            <span className={`font-mono px-2 py-0.5 rounded-lg border font-bold ${
                              isLightMode 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-900" 
                                : "bg-indigo-950 border-indigo-700 text-indigo-200"
                            }`}>
                              ({b2VecU.x}, {b2VecU.y})
                            </span>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>u_1 = {b2VecU.x}</span>
                              <input
                                type="range"
                                min="-5"
                                max="5"
                                value={b2VecU.x}
                                onChange={(e) => setB2VecU({ ...b2VecU, x: Number(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>u_2 = {b2VecU.y}</span>
                              <input
                                type="range"
                                min="-5"
                                max="5"
                                value={b2VecU.y}
                                onChange={(e) => setB2VecU({ ...b2VecU, y: Number(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Vector v */}
                        <div className={`space-y-2 pt-3 border-t ${
                          isLightMode ? "border-slate-100" : "border-slate-700"
                        }`}>
                          <label className={`text-xs font-black flex items-center justify-between ${
                            isLightMode ? "text-amber-900" : "text-amber-300"
                          }`}>
                            <span>{"Vectơ $\\vec{v}(v_1, v_2)$:"}</span>
                            <span className={`font-mono px-2 py-0.5 rounded-lg border font-bold ${
                              isLightMode 
                                ? "bg-amber-50 border-amber-200 text-amber-900" 
                                : "bg-amber-950 border-amber-700 text-amber-200"
                            }`}>
                              ({b2VecV.x}, {b2VecV.y})
                            </span>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>v_1 = {b2VecV.x}</span>
                              <input
                                type="range"
                                min="-5"
                                max="5"
                                value={b2VecV.x}
                                onChange={(e) => setB2VecV({ ...b2VecV, x: Number(e.target.value) })}
                                className="w-full accent-amber-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>v_2 = {b2VecV.y}</span>
                              <input
                                type="range"
                                min="-5"
                                max="5"
                                value={b2VecV.y}
                                onChange={(e) => setB2VecV({ ...b2VecV, y: Number(e.target.value) })}
                                className="w-full accent-amber-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Operation Selector */}
                        <div className={`pt-3 border-t space-y-2 ${
                          isLightMode ? "border-slate-100" : "border-slate-700"
                        }`}>
                          <label className={`text-xs font-black block ${
                            isLightMode ? "text-slate-800" : "text-slate-200"
                          }`}>
                            Chế độ hiển thị minh họa:
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setB2Operation('sum')}
                              className={`py-1.5 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                                b2Operation === 'sum'
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : isLightMode 
                                    ? "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200" 
                                    : "bg-slate-700 text-slate-200 border-slate-600"
                              }`}
                            >
                              Tổng (u+v)
                            </button>
                            <button
                              type="button"
                              onClick={() => setB2Operation('diff')}
                              className={`py-1.5 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                                b2Operation === 'diff'
                                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                  : isLightMode 
                                    ? "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200" 
                                    : "bg-slate-700 text-slate-200 border-slate-600"
                              }`}
                            >
                              Hiệu (u-v)
                            </button>
                            <button
                              type="button"
                              onClick={() => setB2Operation('both')}
                              className={`py-1.5 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                                b2Operation === 'both'
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : isLightMode 
                                    ? "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200" 
                                    : "bg-slate-700 text-slate-200 border-slate-600"
                              }`}
                            >
                              Cả hai
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-4 rounded-2xl border shadow-xs ${
                          isLightMode 
                            ? "bg-emerald-50/90 border-emerald-200" 
                            : "bg-emerald-950/70 border-emerald-700"
                        }`}>
                          <span className={`text-xs font-black uppercase block mb-1 ${
                            isLightMode ? "text-emerald-800" : "text-emerald-300"
                          }`}>
                            {"Tổng $\\vec{u} + \\vec{v}$"}
                          </span>
                          <span className={`text-lg font-black font-mono ${
                            isLightMode ? "text-emerald-950" : "text-emerald-200"
                          }`}>
                            ({b2Result.sumX}, {b2Result.sumY})
                          </span>
                          <span className={`text-xs block mt-1 font-bold ${
                            isLightMode ? "text-slate-600" : "text-slate-300"
                          }`}>
                            Độ dài: {b2Result.sumLength.toFixed(2)}
                          </span>
                        </div>
                        <div className={`p-4 rounded-2xl border shadow-xs ${
                          isLightMode 
                            ? "bg-rose-50/90 border-rose-200" 
                            : "bg-rose-950/70 border-rose-700"
                        }`}>
                          <span className={`text-xs font-black uppercase block mb-1 ${
                            isLightMode ? "text-rose-800" : "text-rose-300"
                          }`}>
                            {"Hiệu $\\vec{u} - \\vec{v}$"}
                          </span>
                          <span className={`text-lg font-black font-mono ${
                            isLightMode ? "text-rose-950" : "text-rose-200"
                          }`}>
                            ({b2Result.diffX}, {b2Result.diffY})
                          </span>
                          <span className={`text-xs block mt-1 font-bold ${
                            isLightMode ? "text-slate-600" : "text-slate-300"
                          }`}>
                            Độ dài: {b2Result.diffLength.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Canvas & Explanation */}
                    <div className="lg:col-span-7 space-y-4">
                      {renderSvgGridCanvas((toSvgX, toSvgY, originX, originY) => {
                        const ux = toSvgX(b2VecU.x);
                        const uy = toSvgY(b2VecU.y);
                        const vx = toSvgX(b2VecV.x);
                        const vy = toSvgY(b2VecV.y);

                        const sumx = toSvgX(b2Result.sumX);
                        const sumy = toSvgY(b2Result.sumY);

                        return (
                          <>
                            {/* Parallelogram dashed lines */}
                            <line x1={ux} y1={uy} x2={sumx} y2={sumy} stroke={isLightMode ? "#d97706" : "#f59e0b"} strokeWidth="1.5" strokeDasharray="4 4" />
                            <line x1={vx} y1={vy} x2={sumx} y2={sumy} stroke={isLightMode ? "#4338ca" : "#6366f1"} strokeWidth="1.5" strokeDasharray="4 4" />

                            {/* Vector u */}
                            <line x1={originX} y1={originY} x2={ux} y2={uy} stroke={isLightMode ? "#4338ca" : "#6366f1"} strokeWidth="3" markerEnd="url(#arrow-indigo)" />
                            <text x={ux + 8} y={uy} fill={isLightMode ? "#312e81" : "#818cf8"} fontSize="12" fontWeight="bold">u({b2VecU.x}, {b2VecU.y})</text>

                            {/* Vector v */}
                            <line x1={originX} y1={originY} x2={vx} y2={vy} stroke={isLightMode ? "#d97706" : "#f59e0b"} strokeWidth="3" markerEnd="url(#arrow-amber)" />
                            <text x={vx + 8} y={vy} fill={isLightMode ? "#92400e" : "#fbbf24"} fontSize="12" fontWeight="bold">v({b2VecV.x}, {b2VecV.y})</text>

                            {/* Vector sum u + v (Parallelogram diagonal) */}
                            {(b2Operation === 'sum' || b2Operation === 'both') && (
                              <>
                                <line x1={originX} y1={originY} x2={sumx} y2={sumy} stroke={isLightMode ? "#059669" : "#10b981"} strokeWidth="3.5" markerEnd="url(#arrow-emerald)" />
                                <text x={sumx + 10} y={sumy - 5} fill={isLightMode ? "#064e3b" : "#34d399"} fontSize="12" fontWeight="bold">
                                  u+v({b2Result.sumX}, {b2Result.sumY})
                                </text>
                              </>
                            )}

                            {/* Vector diff u - v */}
                            {(b2Operation === 'diff' || b2Operation === 'both') && (
                              <>
                                <line x1={vx} y1={vy} x2={ux} y2={uy} stroke={isLightMode ? "#e11d48" : "#f43f5e"} strokeWidth="3" markerEnd="url(#arrow-rose)" />
                                <text x={(ux + vx) / 2 - 25} y={(uy + vy) / 2 - 10} fill={isLightMode ? "#9f1239" : "#fb7185"} fontSize="12" fontWeight="bold">
                                  u-v
                                </text>
                              </>
                            )}
                          </>
                        );
                      })}

                      {/* Detailed Steps */}
                      {renderSolutionCard(b2Markdown, 2, "Bài 2: Tổng & Hiệu vectơ (Quy tắc HBH)")}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* LESSON 3 WORKSPACE: TÍCH CỦA VECTƠ VỚI MỘT SỐ & CÙNG PHƯƠNG */}
              {/* ========================================================================= */}
              {activeLesson === 3 && (
                <div className="space-y-6">
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
                    isLightMode ? "border-slate-200" : "border-slate-800"
                  }`}>
                    <div>
                      <span className={`text-xs font-black uppercase tracking-widest ${
                        isLightMode ? "text-amber-700" : "text-amber-400"
                      }`}>
                        BÀI 3 • SÁCH KẾT NỐI TRI THỨC
                      </span>
                      <h3 className={`text-lg font-black flex items-center gap-2 mt-0.5 ${
                        isLightMode ? "text-slate-900" : "text-white"
                      }`}>
                        <Scale className="w-5 h-5 text-amber-600" />
                        {"Tích Của Vectơ Với Một Số $k\\vec{a}$ & Điều Kiện Cùng Phương"}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Controls */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Box 1: Scale Vector */}
                      <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
                        isLightMode 
                          ? "bg-white border-slate-200" 
                          : "bg-slate-800 border-slate-700"
                      }`}>
                        <span className={`text-xs font-black uppercase tracking-wider block border-b pb-2 ${
                          isLightMode ? "text-slate-900 border-slate-100" : "text-slate-100 border-slate-700"
                        }`}>
                          {"1. Phép nhân vectơ $\\vec{a}$ với hệ số $k$"}
                        </span>

                        <div className="space-y-2">
                          <label className={`text-xs font-black flex items-center justify-between ${
                            isLightMode ? "text-indigo-900" : "text-indigo-300"
                          }`}>
                            <span>{"Vectơ gốc $\\vec{a}(a_1, a_2)$:"}</span>
                            <span className={`font-mono px-2 py-0.5 rounded-lg border font-bold ${
                              isLightMode 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-900" 
                                : "bg-indigo-950 border-indigo-700 text-indigo-200"
                            }`}>
                              ({b3VecA.x}, {b3VecA.y})
                            </span>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>a_1 = {b3VecA.x}</span>
                              <input
                                type="range"
                                min="-4"
                                max="4"
                                value={b3VecA.x}
                                onChange={(e) => setB3VecA({ ...b3VecA, x: Number(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>a_2 = {b3VecA.y}</span>
                              <input
                                type="range"
                                min="-4"
                                max="4"
                                value={b3VecA.y}
                                onChange={(e) => setB3VecA({ ...b3VecA, y: Number(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Scalar k slider */}
                        <div className={`space-y-2 pt-3 border-t ${
                          isLightMode ? "border-slate-100" : "border-slate-700"
                        }`}>
                          <label className={`text-xs font-black flex items-center justify-between ${
                            isLightMode ? "text-amber-900" : "text-amber-300"
                          }`}>
                            <span>{"Hệ số tỉ lệ thực $k$:"}</span>
                            <span className={`font-mono px-2 py-0.5 rounded-lg border font-bold text-sm ${
                              isLightMode 
                                ? "bg-amber-50 border-amber-200 text-amber-900" 
                                : "bg-amber-950 border-amber-700 text-amber-200"
                            }`}>
                              k = {b3K}
                            </span>
                          </label>
                          <input
                            type="range"
                            min="-3"
                            max="3"
                            step="0.5"
                            value={b3K}
                            onChange={(e) => setB3K(Number(e.target.value))}
                            className="w-full accent-amber-600 cursor-pointer"
                          />
                          <div className={`flex justify-between text-[10px] font-mono font-bold ${
                            isLightMode ? "text-slate-500" : "text-slate-400"
                          }`}>
                            <span>k = -3 (Ngược hướng)</span>
                            <span>k = 0</span>
                            <span>k = +3 (Cùng hướng)</span>
                          </div>
                        </div>
                      </div>

                      {/* Box 2: Check Parallel Condition */}
                      <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 shadow-xs ${
                        isLightMode 
                          ? "bg-white border-slate-200" 
                          : "bg-slate-800 border-slate-700"
                      }`}>
                        <span className={`text-xs font-black uppercase tracking-wider block border-b pb-2 ${
                          isLightMode ? "text-slate-900 border-slate-100" : "text-slate-100 border-slate-700"
                        }`}>
                          {"2. Kiểm tra điều kiện Cùng Phương"}
                        </span>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className={`font-bold block mb-1 ${isLightMode ? "text-slate-800" : "text-slate-200"}`}>
                              {"Vectơ $\\vec{u}(x, y)$:"}
                            </span>
                            <div className="flex gap-1.5 font-mono">
                              <input
                                type="number"
                                value={b3CheckU.x}
                                onChange={(e) => setB3CheckU({ ...b3CheckU, x: Number(e.target.value) })}
                                className={`w-1/2 border rounded px-2 py-1 text-center font-bold ${
                                  isLightMode ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                                }`}
                              />
                              <input
                                type="number"
                                value={b3CheckU.y}
                                onChange={(e) => setB3CheckU({ ...b3CheckU, y: Number(e.target.value) })}
                                className={`w-1/2 border rounded px-2 py-1 text-center font-bold ${
                                  isLightMode ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                                }`}
                              />
                            </div>
                          </div>
                          <div>
                            <span className={`font-bold block mb-1 ${isLightMode ? "text-slate-800" : "text-slate-200"}`}>
                              {"Vectơ $\\vec{v}(x', y')$:"}
                            </span>
                            <div className="flex gap-1.5 font-mono">
                              <input
                                type="number"
                                value={b3CheckV.x}
                                onChange={(e) => setB3CheckV({ ...b3CheckV, x: Number(e.target.value) })}
                                className={`w-1/2 border rounded px-2 py-1 text-center font-bold ${
                                  isLightMode ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                                }`}
                              />
                              <input
                                type="number"
                                value={b3CheckV.y}
                                onChange={(e) => setB3CheckV({ ...b3CheckV, y: Number(e.target.value) })}
                                className={`w-1/2 border rounded px-2 py-1 text-center font-bold ${
                                  isLightMode ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Status alert */}
                        <div className={`p-3 rounded-xl border text-xs font-bold ${
                          b3Result.isParallel
                            ? isLightMode ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-emerald-950 border-emerald-700 text-emerald-200"
                            : isLightMode ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-amber-950 border-amber-700 text-amber-200"
                        }`}>
                          {b3Result.isParallel ? (
                            <span>
                              ✓ HAI VECTƠ CÙNG PHƯƠNG (Tích chéo $u_1 v_2 - u_2 v_1 = 0$)
                            </span>
                          ) : (
                            <span>
                              ✕ Không cùng phương ($u_1 v_2 - u_2 v_1 = {b3Result.crossProduct} \ne 0$)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Calculations Summary */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-4 rounded-2xl border shadow-xs ${
                          isLightMode 
                            ? "bg-amber-50/90 border-amber-200" 
                            : "bg-amber-950/70 border-amber-700"
                        }`}>
                          <span className={`text-xs font-black uppercase block mb-1 ${
                            isLightMode ? "text-amber-800" : "text-amber-300"
                          }`}>
                            {"Tọa độ Vectơ $k\\vec{a}$"}
                          </span>
                          <span className={`text-lg font-black font-mono ${
                            isLightMode ? "text-amber-950" : "text-white"
                          }`}>
                            ({b3Result.kAx}, {b3Result.kAy})
                          </span>
                        </div>
                        <div className={`p-4 rounded-2xl border shadow-xs ${
                          isLightMode 
                            ? "bg-indigo-50/90 border-indigo-200" 
                            : "bg-indigo-950/70 border-indigo-700"
                        }`}>
                          <span className={`text-xs font-black uppercase block mb-1 ${
                            isLightMode ? "text-indigo-800" : "text-indigo-300"
                          }`}>
                            {"Độ dài $|k\\vec{a}|$"}
                          </span>
                          <span className={`text-lg font-black font-mono ${
                            isLightMode ? "text-indigo-950" : "text-indigo-200"
                          }`}>
                            {b3Result.lenKA.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Canvas & Explanation */}
                    <div className="lg:col-span-7 space-y-4">
                      {renderSvgGridCanvas((toSvgX, toSvgY, originX, originY) => {
                        const ax = toSvgX(b3VecA.x);
                        const ay = toSvgY(b3VecA.y);
                        const kax = toSvgX(b3Result.kAx);
                        const kay = toSvgY(b3Result.kAy);

                        return (
                          <>
                            {/* Scaled Vector k.a */}
                            <line
                              x1={originX}
                              y1={originY}
                              x2={kax}
                              y2={kay}
                              stroke={isLightMode ? "#d97706" : "#f59e0b"}
                              strokeWidth="4"
                              markerEnd="url(#arrow-amber)"
                            />
                            <text x={kax + 10} y={kay} fill={isLightMode ? "#92400e" : "#fbbf24"} fontSize="12" fontWeight="bold">
                              k.a({b3Result.kAx}, {b3Result.kAy})
                            </text>

                            {/* Base Vector a */}
                            <line
                              x1={originX}
                              y1={originY}
                              x2={ax}
                              y2={ay}
                              stroke={isLightMode ? "#4338ca" : "#6366f1"}
                              strokeWidth="2.5"
                              markerEnd="url(#arrow-indigo)"
                            />
                            <text x={ax + 5} y={ay - 5} fill={isLightMode ? "#312e81" : "#818cf8"} fontSize="11" fontWeight="bold">
                              a({b3VecA.x}, {b3VecA.y})
                            </text>
                          </>
                        );
                      })}

                      {/* Explanation */}
                      {renderSolutionCard(b3Markdown, 3, "Bài 3: Tích vectơ với một số & Cùng phương")}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* LESSON 4 WORKSPACE: HỆ TRỤC TỌA ĐỘ, TRUNG ĐIỂM & TRỌNG TÂM */}
              {/* ========================================================================= */}
              {activeLesson === 4 && (
                <div className="space-y-6">
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
                    isLightMode ? "border-slate-200" : "border-slate-800"
                  }`}>
                    <div>
                      <span className={`text-xs font-black uppercase tracking-widest ${
                        isLightMode ? "text-rose-700" : "text-rose-400"
                      }`}>
                        BÀI 4 • SÁCH KẾT NỐI TRI THỨC
                      </span>
                      <h3 className={`text-lg font-black flex items-center gap-2 mt-0.5 ${
                        isLightMode ? "text-slate-900" : "text-white"
                      }`}>
                        <Calculator className="w-5 h-5 text-rose-600" />
                        {"Hệ Trục Tọa Độ $Oxy$, Tọa Độ Trung Điểm & Trọng Tâm Tam Giác"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setB4A({ x: 1, y: 5 }); setB4B({ x: -3, y: -1 }); setB4C({ x: 5, y: -2 }); }}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl border cursor-pointer transition-colors shadow-2xs ${
                        isLightMode 
                          ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-300" 
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                      }`}
                    >
                      Đặt lại 3 đỉnh mẫu
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Controls Column */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 shadow-xs ${
                        isLightMode 
                          ? "bg-white border-slate-200" 
                          : "bg-slate-800 border-slate-700"
                      }`}>
                        <span className={`text-xs font-black uppercase tracking-wider block border-b pb-2 ${
                          isLightMode ? "text-slate-900 border-slate-100" : "text-slate-100 border-slate-700"
                        }`}>
                          {"1. Nhập tọa độ 3 đỉnh tam giác $ABC$"}
                        </span>

                        {/* Point A */}
                        <div className="grid grid-cols-3 gap-2 items-center text-xs">
                          <span className={`font-black ${isLightMode ? "text-rose-800" : "text-rose-300"}`}>Đỉnh A:</span>
                          <input
                            type="number"
                            value={b4A.x}
                            onChange={(e) => setB4A({ ...b4A, x: Number(e.target.value) })}
                            className={`border rounded px-2 py-1 text-center font-mono font-bold ${
                              isLightMode ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                            }`}
                          />
                          <input
                            type="number"
                            value={b4A.y}
                            onChange={(e) => setB4A({ ...b4A, y: Number(e.target.value) })}
                            className={`border rounded px-2 py-1 text-center font-mono font-bold ${
                              isLightMode ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                            }`}
                          />
                        </div>

                        {/* Point B */}
                        <div className="grid grid-cols-3 gap-2 items-center text-xs">
                          <span className={`font-black ${isLightMode ? "text-indigo-800" : "text-indigo-300"}`}>Đỉnh B:</span>
                          <input
                            type="number"
                            value={b4B.x}
                            onChange={(e) => setB4B({ ...b4B, x: Number(e.target.value) })}
                            className={`border rounded px-2 py-1 text-center font-mono font-bold ${
                              isLightMode ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                            }`}
                          />
                          <input
                            type="number"
                            value={b4B.y}
                            onChange={(e) => setB4B({ ...b4B, y: Number(e.target.value) })}
                            className={`border rounded px-2 py-1 text-center font-mono font-bold ${
                              isLightMode ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                            }`}
                          />
                        </div>

                        {/* Point C */}
                        <div className="grid grid-cols-3 gap-2 items-center text-xs">
                          <span className={`font-black ${isLightMode ? "text-teal-800" : "text-teal-300"}`}>Đỉnh C:</span>
                          <input
                            type="number"
                            value={b4C.x}
                            onChange={(e) => setB4C({ ...b4C, x: Number(e.target.value) })}
                            className={`border rounded px-2 py-1 text-center font-mono font-bold ${
                              isLightMode ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                            }`}
                          />
                          <input
                            type="number"
                            value={b4C.y}
                            onChange={(e) => setB4C({ ...b4C, y: Number(e.target.value) })}
                            className={`border rounded px-2 py-1 text-center font-mono font-bold ${
                              isLightMode ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Calculations Summary */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-4 rounded-2xl border shadow-xs ${
                          isLightMode 
                            ? "bg-amber-50/90 border-amber-200" 
                            : "bg-amber-950/70 border-amber-700"
                        }`}>
                          <span className={`text-xs font-black uppercase block mb-1 ${
                            isLightMode ? "text-amber-800" : "text-amber-300"
                          }`}>
                            {"Trọng tâm $G$"}
                          </span>
                          <span className={`text-sm font-black font-mono ${
                            isLightMode ? "text-amber-950" : "text-amber-200"
                          }`}>
                            ({b4Result.G.x.toFixed(2)}, {b4Result.G.y.toFixed(2)})
                          </span>
                        </div>
                        <div className={`p-4 rounded-2xl border shadow-xs ${
                          isLightMode 
                            ? "bg-purple-50/90 border-purple-200" 
                            : "bg-purple-950/70 border-purple-700"
                        }`}>
                          <span className={`text-xs font-black uppercase block mb-1 ${
                            isLightMode ? "text-purple-800" : "text-purple-300"
                          }`}>
                            {"Diện tích $S_{\\Delta ABC}$"}
                          </span>
                          <span className={`text-sm font-black font-mono ${
                            isLightMode ? "text-purple-950" : "text-purple-200"
                          }`}>
                            {b4Result.area.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Canvas & Explanation */}
                    <div className="lg:col-span-7 space-y-4">
                      {renderSvgGridCanvas((toSvgX, toSvgY) => {
                        const ax = toSvgX(b4A.x);
                        const ay = toSvgY(b4A.y);
                        const bx = toSvgX(b4B.x);
                        const by = toSvgY(b4B.y);
                        const cx = toSvgX(b4C.x);
                        const cy = toSvgY(b4C.y);

                        const gx = toSvgX(b4Result.G.x);
                        const gy = toSvgY(b4Result.G.y);

                        const mx = toSvgX(b4Result.M_bc.x);
                        const my = toSvgY(b4Result.M_bc.y);

                        return (
                          <>
                            {/* Triangle ABC */}
                            <polygon
                              points={`${ax},${ay} ${bx},${by} ${cx},${cy}`}
                              fill={isLightMode ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.2)"}
                              stroke={isLightMode ? "#4338ca" : "#818cf8"}
                              strokeWidth="2.5"
                            />

                            {/* Median AM */}
                            <line x1={ax} y1={ay} x2={mx} y2={my} stroke={isLightMode ? "#d97706" : "#f59e0b"} strokeWidth="1.8" strokeDasharray="4 4" />

                            {/* Vertices */}
                            <circle cx={ax} cy={ay} r="5" fill={isLightMode ? "#e11d48" : "#f43f5e"} />
                            <text x={ax - 10} y={ay - 8} fill={isLightMode ? "#9f1239" : "#fb7185"} fontSize="12" fontWeight="bold">A</text>

                            <circle cx={bx} cy={by} r="5" fill={isLightMode ? "#4338ca" : "#6366f1"} />
                            <text x={bx - 12} y={by + 16} fill={isLightMode ? "#312e81" : "#818cf8"} fontSize="12" fontWeight="bold">B</text>

                            <circle cx={cx} cy={cy} r="5" fill={isLightMode ? "#0d9488" : "#14b8a6"} />
                            <text x={cx + 8} y={cy + 14} fill={isLightMode ? "#064e3b" : "#2dd4bf"} fontSize="12" fontWeight="bold">C</text>

                            {/* Centroid G */}
                            <circle cx={gx} cy={gy} r="6" fill={isLightMode ? "#d97706" : "#f59e0b"} />
                            <text x={gx + 8} y={gy - 5} fill={isLightMode ? "#92400e" : "#fbbf24"} fontSize="12" fontWeight="bold">
                              G({b4Result.G.x.toFixed(1)}, {b4Result.G.y.toFixed(1)})
                            </text>
                          </>
                        );
                      })}

                      {/* Detailed Markdown */}
                      {renderSolutionCard(b4Markdown, 4, "Bài 4: Hệ trục tọa độ, Trung điểm & Trọng tâm")}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* LESSON 5 WORKSPACE: TÍCH VÔ HƯỚNG & GÓC GIỮA HAI VECTƠ */}
              {/* ========================================================================= */}
              {activeLesson === 5 && (
                <div className="space-y-6">
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
                    isLightMode ? "border-slate-200" : "border-slate-800"
                  }`}>
                    <div>
                      <span className={`text-xs font-black uppercase tracking-widest ${
                        isLightMode ? "text-emerald-700" : "text-emerald-400"
                      }`}>
                        BÀI 5 • SÁCH KẾT NỐI TRI THỨC
                      </span>
                      <h3 className={`text-lg font-black flex items-center gap-2 mt-0.5 ${
                        isLightMode ? "text-slate-900" : "text-white"
                      }`}>
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        Tích Vô Hướng & Góc Giữa Hai Vectơ
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setB5VecA({ x: 3, y: 1 }); setB5VecB({ x: 2, y: 4 }); }}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl border cursor-pointer transition-colors shadow-2xs ${
                        isLightMode 
                          ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-300" 
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                      }`}
                    >
                      Đặt lại 2 vectơ mẫu
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Controls */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
                        isLightMode 
                          ? "bg-white border-slate-200" 
                          : "bg-slate-800 border-slate-700"
                      }`}>
                        <span className={`text-xs font-black uppercase tracking-wider block border-b pb-2 ${
                          isLightMode ? "text-slate-900 border-slate-100" : "text-slate-100 border-slate-700"
                        }`}>
                          {"1. Nhập tọa độ hai vectơ $\\vec{a}$ và $\\vec{b}$"}
                        </span>

                        {/* Vector a */}
                        <div className="space-y-2">
                          <label className={`text-xs font-black flex items-center justify-between ${
                            isLightMode ? "text-indigo-900" : "text-indigo-300"
                          }`}>
                            <span>{"Vectơ $\\vec{a}(a_1, a_2)$:"}</span>
                            <span className={`font-mono px-2 py-0.5 rounded-lg border font-bold ${
                              isLightMode 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-900" 
                                : "bg-indigo-950 border-indigo-700 text-indigo-200"
                            }`}>
                              ({b5VecA.x}, {b5VecA.y})
                            </span>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>a_1 = {b5VecA.x}</span>
                              <input
                                type="range"
                                min="-5"
                                max="5"
                                value={b5VecA.x}
                                onChange={(e) => setB5VecA({ ...b5VecA, x: Number(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>a_2 = {b5VecA.y}</span>
                              <input
                                type="range"
                                min="-5"
                                max="5"
                                value={b5VecA.y}
                                onChange={(e) => setB5VecA({ ...b5VecA, y: Number(e.target.value) })}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Vector b */}
                        <div className={`space-y-2 pt-3 border-t ${
                          isLightMode ? "border-slate-100" : "border-slate-700"
                        }`}>
                          <label className={`text-xs font-black flex items-center justify-between ${
                            isLightMode ? "text-emerald-900" : "text-emerald-300"
                          }`}>
                            <span>{"Vectơ $\\vec{b}(b_1, b_2)$:"}</span>
                            <span className={`font-mono px-2 py-0.5 rounded-lg border font-bold ${
                              isLightMode 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                                : "bg-emerald-950 border-emerald-700 text-emerald-200"
                            }`}>
                              ({b5VecB.x}, {b5VecB.y})
                            </span>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>b_1 = {b5VecB.x}</span>
                              <input
                                type="range"
                                min="-5"
                                max="5"
                                value={b5VecB.x}
                                onChange={(e) => setB5VecB({ ...b5VecB, x: Number(e.target.value) })}
                                className="w-full accent-emerald-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className={`text-xs font-mono font-bold block mb-1 ${
                                isLightMode ? "text-slate-700" : "text-slate-200"
                              }`}>b_2 = {b5VecB.y}</span>
                              <input
                                type="range"
                                min="-5"
                                max="5"
                                value={b5VecB.y}
                                onChange={(e) => setB5VecB({ ...b5VecB, y: Number(e.target.value) })}
                                className="w-full accent-emerald-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Calculations Summary */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-4 rounded-2xl border shadow-xs ${
                          isLightMode 
                            ? "bg-emerald-50/90 border-emerald-200" 
                            : "bg-emerald-950/70 border-emerald-700"
                        }`}>
                          <span className={`text-xs font-black uppercase block mb-1 ${
                            isLightMode ? "text-emerald-800" : "text-emerald-300"
                          }`}>
                            {"Tích vô hướng $\\vec{a} \\cdot \\vec{b}$"}
                          </span>
                          <span className={`text-lg font-black font-mono ${
                            isLightMode ? "text-emerald-950" : "text-emerald-200"
                          }`}>
                            {b5Result.dotProduct}
                          </span>
                        </div>
                        <div className={`p-4 rounded-2xl border shadow-xs ${
                          isLightMode 
                            ? "bg-amber-50/90 border-amber-200" 
                            : "bg-amber-950/70 border-amber-700"
                        }`}>
                          <span className={`text-xs font-black uppercase block mb-1 ${
                            isLightMode ? "text-amber-800" : "text-amber-300"
                          }`}>
                            {"Góc $\\theta = (\\vec{a}, \\vec{b})$"}
                          </span>
                          <span className={`text-lg font-black font-mono ${
                            isLightMode ? "text-amber-950" : "text-amber-200"
                          }`}>
                            {b5Result.angleDeg.toFixed(1)}°
                          </span>
                        </div>
                      </div>

                      {/* Perpendicular Status Badge */}
                      <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xs ${
                        b5Result.isPerpendicular
                          ? isLightMode 
                            ? "bg-purple-100 border-purple-300 text-purple-950" 
                            : "bg-purple-950 border-purple-700 text-purple-200 animate-pulse"
                          : isLightMode 
                            ? "bg-white border-slate-200 text-slate-800" 
                            : "bg-slate-800 border-slate-700 text-slate-200"
                      }`}>
                        <span>TRẠNG THÁI VUÔNG GÓC:</span>
                        <span>
                          {b5Result.isPerpendicular
                            ? "✨ HAI VECTƠ VUÔNG GÓC (a.b = 0)"
                            : `Không vuông góc (cos = ${b5Result.cosTheta.toFixed(3)})`}
                        </span>
                      </div>
                    </div>

                    {/* Canvas & Explanation */}
                    <div className="lg:col-span-7 space-y-4">
                      {renderSvgGridCanvas((toSvgX, toSvgY, originX, originY) => {
                        const ax = toSvgX(b5VecA.x);
                        const ay = toSvgY(b5VecA.y);
                        const bx = toSvgX(b5VecB.x);
                        const by = toSvgY(b5VecB.y);

                        const px = toSvgX(b5Result.projVec.x);
                        const py = toSvgY(b5Result.projVec.y);

                        return (
                          <>
                            {/* Projection dashed line from A to Proj */}
                            <line x1={ax} y1={ay} x2={px} y2={py} stroke={isLightMode ? "#64748b" : "#cbd5e1"} strokeWidth="1.5" strokeDasharray="3 3" />

                            {/* Vector a */}
                            <line x1={originX} y1={originY} x2={ax} y2={ay} stroke={isLightMode ? "#4338ca" : "#6366f1"} strokeWidth="3" markerEnd="url(#arrow-indigo)" />
                            <text x={ax + 8} y={ay - 5} fill={isLightMode ? "#312e81" : "#818cf8"} fontSize="12" fontWeight="bold">a({b5VecA.x}, {b5VecA.y})</text>

                            {/* Vector b */}
                            <line x1={originX} y1={originY} x2={bx} y2={by} stroke={isLightMode ? "#059669" : "#10b981"} strokeWidth="3" markerEnd="url(#arrow-emerald)" />
                            <text x={bx + 8} y={by + 14} fill={isLightMode ? "#064e3b" : "#34d399"} fontSize="12" fontWeight="bold">b({b5VecB.x}, {b5VecB.y})</text>

                            {/* Angle Arc Indicator */}
                            <circle cx={originX} cy={originY} r="25" fill="none" stroke={isLightMode ? "#d97706" : "#f59e0b"} strokeWidth="1.8" strokeDasharray="3 3" />
                            <text x={originX + 28} y={originY - 12} fill={isLightMode ? "#92400e" : "#fbbf24"} fontSize="12" fontWeight="bold">
                              {b5Result.angleDeg.toFixed(0)}°
                            </text>
                          </>
                        );
                      })}

                      {/* Explanation */}
                      {renderSolutionCard(b5Markdown, 5, "Bài 5: Tích vô hướng & Góc giữa hai vectơ")}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* ACCORDION MODULE 2: TOÁN 10 - CHƯƠNG HỆ THỨC LƯỢNG TRONG TAM GIÁC */}
      <div className={`border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm ${
        isLightMode 
          ? "bg-white border-slate-200" 
          : "bg-slate-850 border-slate-750"
      }`}>
        {/* Accordion Bar Header */}
        <button
          type="button"
          onClick={() => setIsModule2Open(!isModule2Open)}
          className={`w-full p-4 sm:p-5 flex items-center justify-between transition-colors text-left cursor-pointer select-none border-b ${
            isLightMode 
              ? "bg-emerald-50/60 hover:bg-emerald-100/60 border-emerald-100/80 text-slate-900" 
              : "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shrink-0 shadow-2xs ${
              isLightMode 
                ? "bg-emerald-600 text-white" 
                : "bg-emerald-950 border border-emerald-700 text-emerald-200"
            }`}>
              02
            </div>
            <div>
              <h3 className={`font-black text-sm sm:text-base flex items-center gap-2 ${
                isLightMode ? "text-slate-900" : "text-white"
              }`}>
                <span>Mục 2: Toán 10 - Chương Hệ thức lượng trong tam giác (Sách Kết nối tri thức)</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  isLightMode 
                    ? "bg-emerald-100 border-emerald-200 text-emerald-900" 
                    : "bg-emerald-950 border-emerald-800 text-emerald-300"
                }`}>
                  Chương III
                </span>
              </h3>
              <p className={`text-xs mt-0.5 font-medium ${isLightMode ? "text-slate-600" : "text-slate-300"}`}>
                Giá trị lượng giác góc $0^\circ$ đến $180^\circ$, định lý cô-sin, định lý sin, công thức diện tích & giải tam giác thực tế.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-bold hidden md:inline ${isLightMode ? "text-emerald-800" : "text-slate-300"}`}>
              {isModule2Open ? "Thu gọn" : "Mở rộng nội dung"}
            </span>
            <div className={`p-1.5 rounded-lg border shadow-2xs ${
              isLightMode 
                ? "bg-white text-slate-800 border-slate-200" 
                : "bg-slate-800 text-slate-200 border-slate-700"
            }`}>
              {isModule2Open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </button>

        {/* Accordion Body: Module 2 Component */}
        {isModule2Open && (
          <div className={`p-4 sm:p-6 ${isLightMode ? "bg-white" : "bg-slate-900/80"}`}>
            <TrigonometryChapterTools theme={theme} />
          </div>
        )}
      </div>

    </div>
  );
}
