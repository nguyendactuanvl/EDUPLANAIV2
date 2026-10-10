import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { 
  Box, RotateCcw, Camera, Scissors, Sliders, Check, Sparkles, Eye, 
  Layers, Copy, Download, RefreshCw, ZoomIn, ZoomOut, Maximize2,
  ChevronRight, Compass, ShieldCheck, Grid, HelpCircle, Activity
} from "lucide-react";
import { cn } from "../lib/utils";

// Types
export type SchoolLevel = "thcs" | "thpt";

export type ModelType = 
  // THCS 3D
  | "cube" | "cuboid" | "prism_tri" | "pyramid_tri" | "pyramid_quad" | "cone" | "cylinder" | "sphere"
  // THCS 2D
  | "pythagoras" | "similar_triangles" | "incircle_circumcircle"
  // THPT Polyhedra
  | "tetrahedron" | "octahedron" | "dodecahedron" | "icosahedron"
  // THPT Oxyz
  | "oxyz_space"
  // THPT Calculus & Solids of Revolution
  | "cubic_function" | "quartic_function" | "rational_function" | "solid_revolution"
  // THPT Trig Functions (KNTT Grade 11)
  | "trig_sin" | "trig_cos" | "trig_tan" | "trig_cot" | "trig_general";

export interface ModelMetadata {
  id: ModelType;
  level: SchoolLevel;
  category: "3d_spatial" | "2d_plane" | "polyhedra" | "oxyz" | "calculus" | "trig";
  title: string;
  subtitle: string;
  description: string;
  formulaLatex: string;
}

export const MODELS_REGISTRY: ModelMetadata[] = [
  // --- THCS 3D SPATIAL ---
  {
    id: "cube",
    level: "thcs",
    category: "3d_spatial",
    title: "Hình Lập Phương",
    subtitle: "Khối đa diện đều có 6 mặt vuông",
    description: "Khối lập phương $ABCD.A'B'C'D'$ cạnh $a$. Có 6 mặt hình vuông bằng nhau, 8 đỉnh và 12 cạnh bằng nhau.",
    formulaLatex: "V = a^3 \\quad | \\quad S_{xq} = 4a^2 \\quad | \\quad S_{tp} = 6a^2"
  },
  {
    id: "cuboid",
    level: "thcs",
    category: "3d_spatial",
    title: "Hình Hộp Chữ Nhật",
    subtitle: "Khối hình hộp 6 mặt chữ nhật",
    description: "Khối hộp $ABCD.A'B'C'D'$ có 3 kích thước: chiều dài $a$, chiều rộng $b$, chiều cao $h$.",
    formulaLatex: "V = a \\cdot b \\cdot h \\quad | \\quad S_{xq} = 2(a+b)h \\quad | \\quad S_{tp} = 2(ab + ah + bh)"
  },
  {
    id: "prism_tri",
    level: "thcs",
    category: "3d_spatial",
    title: "Lăng Trụ Đứng Tam Giác",
    subtitle: "Hai đáy tam giác song song & bằng nhau",
    description: "Lăng trụ đứng $ABC.A'B'C'$ có đáy là tam giác đều cạnh $a$ và chiều cao $h$. Các mặt bên là hình chữ nhật vuông góc đáy.",
    formulaLatex: "V = S_{đáy} \\cdot h = \\frac{a^2\\sqrt{3}}{4} \\cdot h \\quad | \\quad S_{xq} = 3a \\cdot h"
  },
  {
    id: "pyramid_quad",
    level: "thcs",
    category: "3d_spatial",
    title: "Hình Chóp Tứ Giác Đều",
    subtitle: "Đáy hình vuông, các cạnh bên bằng nhau",
    description: "Hình chóp $S.ABCD$ có đáy $ABCD$ là hình vuông cạnh $a$, đỉnh $S$ chiếu vuông góc xuống tâm $O$ của đáy với chiều cao $SO = h$.",
    formulaLatex: "V = \\frac{1}{3} a^2 h \\quad | \\quad d = \\sqrt{h^2 + (a/2)^2} \\quad | \\quad S_{xq} = 2 a d"
  },
  {
    id: "pyramid_tri",
    level: "thcs",
    category: "3d_spatial",
    title: "Hình Chóp Tam Giác Đều",
    subtitle: "Tứ diện đều hoặc chóp đáy tam giác đều",
    description: "Hình chóp $S.ABC$ có đáy $ABC$ là tam giác đều cạnh $a$, chân đường cao $H$ trùng với trọng tâm tam giác $ABC$, chiều cao $SH = h$.",
    formulaLatex: "V = \\frac{1}{3} S_{đáy} h = \\frac{a^2\\sqrt{3}}{12} h \\quad | \\quad S_{xq} = \\frac{1}{2} C_{đáy} d"
  },
  {
    id: "cone",
    level: "thcs",
    category: "3d_spatial",
    title: "Hình Nón Tròn Xoay",
    subtitle: "Tạo thành khi quay tam giác vuông quanh cạnh góc vuông",
    description: "Hình nón đỉnh $S$, bán kính đáy $R$, chiều cao $h$, đường sinh $l = \\sqrt{R^2 + h^2}$.",
    formulaLatex: "V = \\frac{1}{3} \\pi R^2 h \\quad | \\quad S_{xq} = \\pi R l \\quad | \\quad S_{tp} = \\pi R l + \\pi R^2"
  },
  {
    id: "cylinder",
    level: "thcs",
    category: "3d_spatial",
    title: "Hình Trụ Tròn Xoay",
    subtitle: "Tạo thành khi quay hình chữ nhật quanh 1 cạnh",
    description: "Hình trụ tròn xoay bán kính đáy $R$, chiều cao $h = OO'$, hai mặt đáy là hình tròn song song.",
    formulaLatex: "V = \\pi R^2 h \\quad | \\quad S_{xq} = 2\\pi R h \\quad | \\quad S_{tp} = 2\\pi R h + 2\\pi R^2"
  },
  {
    id: "sphere",
    level: "thcs",
    category: "3d_spatial",
    title: "Hình Cầu / Mặt Cầu",
    subtitle: "Tập hợp các điểm cách tâm O khoảng R",
    description: "Hình cầu tâm $O$ bán kính $R$. Cắt hình cầu bởi mặt phẳng qua tâm thu được đường tròn lớn bán kính $R$.",
    formulaLatex: "V = \\frac{4}{3} \\pi R^3 \\quad | \\quad S = 4 \\pi R^2"
  },

  // --- THCS 2D PLANE ---
  {
    id: "pythagoras",
    level: "thcs",
    category: "2d_plane",
    title: "Định Lý Pythagore Trực Quan",
    subtitle: "Mô hình hình học minh họa $a^2 + b^2 = c^2$",
    description: "Trong tam giác vuông $ABC$ vuông tại $C$, tổng diện tích 2 hình vuông dựng trên 2 cạnh góc vuông $a$ và $b$ bằng diện tích hình vuông dựng trên cạnh huyền $c$.",
    formulaLatex: "a^2 + b^2 = c^2 \\quad \\Leftrightarrow \\quad c = \\sqrt{a^2 + b^2}"
  },
  {
    id: "similar_triangles",
    level: "thcs",
    category: "2d_plane",
    title: "Tam Giác Đồng Dạng",
    subtitle: "Tỉ số đồng dạng $k$ & các góc tương ứng bằng nhau",
    description: "Hai tam giác $\\Delta ABC \\sim \\Delta A'B'C'$ có các góc tương ứng bằng nhau và các cạnh tương ứng tỉ lệ $\\frac{A'B'}{AB} = \\frac{B'C'}{BC} = \\frac{C'A'}{CA} = k$. Tỉ số diện tích bằng $k^2$.",
    formulaLatex: "\\Delta ABC \\sim \\Delta A'B'C' \\quad | \\quad \\frac{S'}{S} = k^2"
  },
  {
    id: "incircle_circumcircle",
    level: "thcs",
    category: "2d_plane",
    title: "Nội Tiếp & Ngoại Tiếp Tam Giác",
    subtitle: "Đường tròn qua 3 đỉnh & đường tròn tiếp xúc 3 cạnh",
    description: "Đường tròn ngoại tiếp tâm $O$ (giao điểm 3 đường trung trực, bán kính $R = \\frac{abc}{4S}$) và đường tròn nội tiếp tâm $I$ (giao điểm 3 đường phân giác, bán kính $r = \\frac{S}{p}$).",
    formulaLatex: "R = \\frac{abc}{4S} \\quad | \\quad r = \\frac{S}{p} \\quad (p = \\frac{a+b+c}{2})"
  },

  // --- THPT TRIGONOMETRIC FUNCTIONS (SGK KẾT NỐI TRI THỨC LỚP 11) ---
  {
    id: "trig_sin",
    level: "thpt",
    category: "trig",
    title: "Hàm Số $y = \\sin x$",
    subtitle: "Đồ thị hình sóng Sin chuẩn SGK KNTT Lớp 11",
    description: "Hàm số $y = \\sin x$ có tập xác định $\\mathcal{D} = \\mathbb{R}$, tập giá trị $[-1, 1]$, chu kỳ tuần hoàn $T = 2\\pi$, là hàm số lẻ (đồ thị đối xứng qua gốc $O(0,0)$).",
    formulaLatex: "y = \\sin x \\quad | \\quad \\mathcal{D} = \\mathbb{R} \\quad | \\quad T = 2\\pi \\quad | \\quad y \\in [-1, 1]"
  },
  {
    id: "trig_cos",
    level: "thpt",
    category: "trig",
    title: "Hàm Số $y = \\cos x$",
    subtitle: "Đồ thị Cosin chuẩn SGK KNTT Lớp 11",
    description: "Hàm số $y = \\cos x$ có tập xác định $\\mathcal{D} = \\mathbb{R}$, tập giá trị $[-1, 1]$, chu kỳ tuần hoàn $T = 2\\pi$, là hàm số chẵn (đồ thị đối xứng qua trục tung $Oy$).",
    formulaLatex: "y = \\cos x \\quad | \\quad \\mathcal{D} = \\mathbb{R} \\quad | \\quad T = 2\\pi \\quad | \\quad y \\in [-1, 1]"
  },
  {
    id: "trig_tan",
    level: "thpt",
    category: "trig",
    title: "Hàm Số $y = \\tan x$",
    subtitle: "Đồ thị Tang chuẩn SGK KNTT Lớp 11",
    description: "Hàm số $y = \\tan x$ có tập xác định $\\mathcal{D} = \\mathbb{R} \\setminus \\left\\{\\frac{\\pi}{2} + k\\pi\\right\\}$, chu kỳ tuần hoàn $T = \\pi$, là hàm số lẻ. Có các tiệm cận đứng $x = \\frac{\\pi}{2} + k\\pi$.",
    formulaLatex: "y = \\tan x \\quad | \\quad \\mathcal{D} = \\mathbb{R} \\setminus \\left\\{\\frac{\\pi}{2} + k\\pi\\right\\} \\quad | \\quad T = \\pi"
  },
  {
    id: "trig_cot",
    level: "thpt",
    category: "trig",
    title: "Hàm Số $y = \\cot x$",
    subtitle: "Đồ thị Cotang chuẩn SGK KNTT Lớp 11",
    description: "Hàm số $y = \\cot x$ có tập xác định $\\mathcal{D} = \\mathbb{R} \\setminus \\{k\\pi\\}$, chu kỳ tuần hoàn $T = \\pi$, là hàm số lẻ. Có các tiệm cận đứng $x = k\\pi$.",
    formulaLatex: "y = \\cot x \\quad | \\quad \\mathcal{D} = \\mathbb{R} \\setminus \\{k\\pi\\} \\quad | \\quad T = \\pi"
  },
  {
    id: "trig_general",
    level: "thpt",
    category: "trig",
    title: "Đồ Thị Hàm Lượng Giác Tổng Quát",
    subtitle: "$y = A\\sin(Bx+C)+D$, $y = A\\cos(Bx+C)+D$, $y = A\\tan(Bx+C)+D$, $y = A\\cot(Bx+C)+D$",
    description: "Công cụ khảo sát tổng quát cho giáo viên: tùy chỉnh các hệ số $A, B, C, D$. Tự động xuất dữ kiện SGK: TXĐ, Tập giá trị, GTLN, GTNN, Chu kỳ $T$, Tính chẵn/lẻ, Tiệm cận đứng & Khoảng biến thiên.",
    formulaLatex: "y = A \\cdot \\text{trig}(Bx + C) + D \\quad | \\quad T = \\frac{2\\pi}{|B|} \\text{ hoặc } \\frac{\\pi}{|B|}"
  },

  // --- THPT POLYHEDRA ---
  {
    id: "tetrahedron",
    level: "thpt",
    category: "polyhedra",
    title: "Tứ Diện Đều (4 Mặt)",
    subtitle: "Khối 4 mặt tam giác đều bằng nhau",
    description: "Tứ diện đều cạnh $a$. Có 4 đỉnh, 4 mặt tam giác đều, 6 cạnh. Tính năng cắt thiết diện song song với mặt đáy hoặc chứa đường cao.",
    formulaLatex: "V = \\frac{a^3 \\sqrt{2}}{12} \\quad | \\quad S_{tp} = a^2 \\sqrt{3} \\quad | \\quad R_{ngoại} = \\frac{a\\sqrt{6}}{4}"
  },
  {
    id: "octahedron",
    level: "thpt",
    category: "polyhedra",
    title: "Bát Diện Đều (8 Mặt)",
    subtitle: "Khối 8 mặt tam giác đều",
    description: "Bát diện đều cạnh $a$ gồm 2 hình chóp tứ giác đều ghép lại. Có 6 đỉnh, 8 mặt tam giác đều và 12 cạnh.",
    formulaLatex: "V = \\frac{a^3 \\sqrt{2}}{3} \\quad | \\quad S_{tp} = 2a^2 \\sqrt{3} \\quad | \\quad R_{ngoại} = \\frac{a\\sqrt{2}}{2}"
  },
  {
    id: "dodecahedron",
    level: "thpt",
    category: "polyhedra",
    title: "Mười Hai Mặt Đều (12 Mặt)",
    subtitle: "Khối 12 mặt ngũ giác đều",
    description: "Khối 12 mặt đều cạnh $a$. Có 20 đỉnh, 12 mặt ngũ giác đều và 30 cạnh. Tính năng cắt thiết diện bằng mặt phẳng điều chỉnh.",
    formulaLatex: "V = \\frac{15 + 7\\sqrt{5}}{4} a^3 \\quad | \\quad S_{tp} = 3\\sqrt{25 + 10\\sqrt{5}} a^2"
  },
  {
    id: "icosahedron",
    level: "thpt",
    category: "polyhedra",
    title: "Hai Mươi Mặt Đều (20 Mặt)",
    subtitle: "Khối 20 mặt tam giác đều",
    description: "Khối 20 mặt đều cạnh $a$. Có 12 đỉnh, 20 mặt tam giác đều và 30 cạnh. Tại mỗi đỉnh có đúng 5 cạnh gặp nhau.",
    formulaLatex: "V = \\frac{5(3 + \\sqrt{5})}{12} a^3 \\quad | \\quad S_{tp} = 5a^2 \\sqrt{3}"
  },

  // --- THPT OXYZ ---
  {
    id: "oxyz_space",
    level: "thpt",
    category: "oxyz",
    title: "Hệ Trục Tọa Độ Oxyz 3D",
    subtitle: "Điểm, Vectơ, Mặt phẳng & Mặt cầu trong không gian",
    description: "Mô phỏng 3D hệ trục $Oxyz$. Cho phép biểu diễn Điểm $P(x_0, y_0, z_0)$, Vectơ $\\vec{v}=(a,b,c)$, Mặt phẳng $(P): ax+by+cz+d=0$ và Mặt cầu $(S): (x-a)^2+(y-b)^2+(z-c)^2=R^2$.",
    formulaLatex: "(P): ax + by + cz + d = 0 \\quad | \\quad (S): (x-a)^2 + (y-b)^2 + (z-c)^2 = R^2"
  },

  // --- THPT CALCULUS ---
  {
    id: "cubic_function",
    level: "thpt",
    category: "calculus",
    title: "Đồ Thị Hàm Bậc Ba",
    subtitle: "$y = ax^3 + bx^2 + cx + d$",
    description: "Đồ thị hàm số bậc 3 với các điểm cực trị $x_{CT}, x_{CD}$ và điểm uốn $I(x_I, y_I)$. Khảo sát sự biến thiên và hình dạng cực trị.",
    formulaLatex: "y = ax^3 + bx^2 + cx + d \\quad | \\quad y' = 3ax^2 + 2bx + c \\quad | \\quad \\Delta' = b^2 - 3ac"
  },
  {
    id: "quartic_function",
    level: "thpt",
    category: "calculus",
    title: "Đồ Thị Hàm Trùng Phương",
    subtitle: "$y = ax^4 + bx^2 + c$",
    description: "Đồ thị hàm số bậc 4 trùng phương đối xứng qua trục $Oy$. Tùy thuộc dấu của $a$ và $b$ để có 1 hoặc 3 điểm cực trị (hình chữ W hoặc M).",
    formulaLatex: "y = ax^4 + bx^2 + c \\quad | \\quad y' = 4ax^3 + 2bx = 2x(2ax^2 + b)"
  },
  {
    id: "rational_function",
    level: "thpt",
    category: "calculus",
    title: "Đồ Thị Hàm Phân Thức Nhất Biến",
    subtitle: "$y = \\frac{ax+b}{cx+d}$",
    description: "Đồ thị đường Hypebol có tiệm cận đứng $x = -\\frac{d}{c}$ và tiệm cận ngang $y = \\frac{a}{c}$, tâm đối xứng $I\\left(-\\frac{d}{c}, \\frac{a}{c}\\right)$.",
    formulaLatex: "y = \\frac{ax+b}{cx+d} \\quad | \\quad TCĐ: x = -\\frac{d}{c} \\quad | \\quad TCN: y = \\frac{a}{c}"
  },
  {
    id: "solid_revolution",
    level: "thpt",
    category: "calculus",
    title: "Thể Tích Khối Tròn Xoay 3D",
    subtitle: "Quay hình phẳng $y = f(x)$ quanh trục $Ox$",
    description: "Mô phỏng 3D khối tròn xoay thu được khi quay hình phẳng giới hạn bởi đồ thị $y = f(x)$, trục $Ox$ và 2 đường thẳng $x = a, x = b$ quanh trục $Ox$.",
    formulaLatex: "V = \\pi \\int_{a}^{b} [f(x)]^2 dx \\quad | \\quad f(x) = \\sqrt{R^2 - x^2} \\implies V = \\frac{4}{3}\\pi R^3"
  }
];

// Helper to format Pi multiples nicely in LaTeX
function formatPiRad(val: number): string {
  const frac = val / Math.PI;
  if (Math.abs(frac) < 0.001) return "0";
  if (Math.abs(frac - 1) < 0.001) return "\\pi";
  if (Math.abs(frac + 1) < 0.001) return "-\\pi";
  
  for (let denom of [2, 3, 4, 6, 12]) {
    const num = Math.round(frac * denom);
    if (Math.abs(num / denom - frac) < 0.01) {
      const sign = num < 0 ? "-" : "";
      const absNum = Math.abs(num);
      const numStr = absNum === 1 ? "\\pi" : `${absNum}\\pi`;
      return `${sign}\\frac{${numStr}}{${denom}}`;
    }
  }
  return `${val.toFixed(2)}`;
}

export function Math3D2DLibrary() {
  const [level, setLevel] = useState<SchoolLevel>("thpt");
  const [selectedModelId, setSelectedModelId] = useState<ModelType>("trig_sin");

  // Display options
  const [showVertices, setShowVertices] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showAltitude, setShowAltitude] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [viewMode, setViewMode] = useState<"glass" | "wireframe" | "solid">("glass");

  // Slice feature state (THPT Polyhedra & 3D shapes)
  const [showSlicePlane, setShowSlicePlane] = useState(false);
  const [sliceOffset, setSliceOffset] = useState(50); // 0 to 100%

  // Basic Geometry Parameters
  const [paramA, setParamA] = useState(3.0); // Side a or Radius R
  const [paramB, setParamB] = useState(2.5); // Side b or Height h
  const [paramC, setParamC] = useState(2.0); // Side c or coefficient
  const [paramD, setParamD] = useState(0.0); // Coefficient d / offset

  // Trigonometric Function Parameters
  const [trigKind, setTrigKind] = useState<"sin" | "cos" | "tan" | "cot">("sin");
  const [trigA, setTrigA] = useState(1.0);  // Amplitude A
  const [trigB, setTrigB] = useState(1.0);  // Angular frequency B
  const [trigC, setTrigC] = useState(0.0);  // Phase shift C (in radians, e.g. 0, pi/2, pi/4)
  const [trigD, setTrigD] = useState(0.0);  // Vertical shift D

  // 3D Canvas rotation angles
  const [rotX, setRotX] = useState(25);
  const [rotY, setRotY] = useState(-35);
  const [zoom, setZoom] = useState(1.0);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Model Object
  const activeModel = useMemo(() => {
    return MODELS_REGISTRY.find(m => m.id === selectedModelId) || MODELS_REGISTRY[0];
  }, [selectedModelId]);

  // Handle Model Selection & Presets Sync
  const handleSelectModel = (id: ModelType) => {
    setSelectedModelId(id);
    if (id === "trig_sin") {
      setTrigKind("sin");
      setTrigA(1.0);
      setTrigB(1.0);
      setTrigC(0.0);
      setTrigD(0.0);
    } else if (id === "trig_cos") {
      setTrigKind("cos");
      setTrigA(1.0);
      setTrigB(1.0);
      setTrigC(0.0);
      setTrigD(0.0);
    } else if (id === "trig_tan") {
      setTrigKind("tan");
      setTrigA(1.0);
      setTrigB(1.0);
      setTrigC(0.0);
      setTrigD(0.0);
    } else if (id === "trig_cot") {
      setTrigKind("cot");
      setTrigA(1.0);
      setTrigB(1.0);
      setTrigC(0.0);
      setTrigD(0.0);
    }
  };

  // When switching level, select first model of that level
  const handleLevelSwitch = (newLevel: SchoolLevel) => {
    setLevel(newLevel);
    const first = MODELS_REGISTRY.find(m => m.level === newLevel);
    if (first) {
      handleSelectModel(first.id);
    }
  };

  // Is Trig Model Active?
  const isTrigModel = selectedModelId.startsWith("trig_");

  // --------------------------------------------------------------------------
  // CALCULATIONS FOR PARAMETER PANEL & TEXTBOOK (SGK) DATA
  // --------------------------------------------------------------------------
  const calculatedValues = useMemo(() => {
    const a = Math.max(0.1, paramA);
    const b = Math.max(0.1, paramB);
    const c = Math.max(0.1, paramC);
    const d = paramD;

    if (isTrigModel) {
      const A = trigA;
      const B = trigB === 0 ? 0.001 : trigB;
      const C = trigC;
      const D = trigD;
      const absA = Math.abs(A);
      const absB = Math.abs(B);

      // Equation string
      let kindName = trigKind;
      let aStr = A === 1 ? "" : A === -1 ? "-" : `${A.toFixed(1)}`;
      let bStr = B === 1 ? "x" : B === -1 ? "-x" : `${B.toFixed(1)}x`;
      let cStr = C === 0 ? "" : C > 0 ? ` + ${formatPiRad(C)}` : ` - ${formatPiRad(Math.abs(C))}`;
      let dStr = D === 0 ? "" : D > 0 ? ` + ${D.toFixed(1)}` : ` - ${Math.abs(D).toFixed(1)}`;
      let eqLatex = `$y = ${aStr}\\${kindName}(${bStr}${cStr})${dStr}$`;

      // 1. Domain (TXĐ)
      let domainStr = "$\\mathcal{D} = \\mathbb{R}$";
      if (trigKind === "tan") {
        domainStr = `$\\mathcal{D} = \\mathbb{R} \\setminus \\left\\{${formatPiRad(Math.PI / (2 * absB))} ${C !== 0 ? "- " + formatPiRad(C / B) : ""} + k\\frac{\\pi}{${absB === 1 ? "" : absB.toFixed(1)}}\\;\\middle|\\; k \\in \\mathbb{Z}\\right\\}$`;
      } else if (trigKind === "cot") {
        domainStr = `$\\mathcal{D} = \\mathbb{R} \\setminus \\left\\{${C !== 0 ? formatPiRad(-C / B) + " + " : ""}k\\frac{\\pi}{${absB === 1 ? "" : absB.toFixed(1)}}\\;\\middle|\\; k \\in \\mathbb{Z}\\right\\}$`;
      }

      // 2. Period (Chu kỳ T)
      let periodVal = (trigKind === "sin" || trigKind === "cos") ? (2 * Math.PI) / absB : Math.PI / absB;
      let periodStr = `$T = ${formatPiRad(periodVal)}$`;

      // 3. Range (Tập giá trị) & Max/Min
      let rangeStr = "";
      let maxStr = "";
      let minStr = "";

      if (trigKind === "sin" || trigKind === "cos") {
        const minY = D - absA;
        const maxY = D + absA;
        rangeStr = `$TGT = [${minY.toFixed(2)};\\; ${maxY.toFixed(2)}]$`;
        maxStr = `$\\text{GTLN } y_{max} = ${maxY.toFixed(2)}$`;
        minStr = `$\\text{GTNN } y_{min} = ${minY.toFixed(2)}$`;
      } else {
        rangeStr = "$\\mathbb{R} = (-\\infty;\\; +\\infty)$";
        maxStr = "Không có GTLN";
        minStr = "Không có GTNN";
      }

      // 4. Parity / Symmetry (Tính chẵn lẻ)
      let parityStr = "";
      if (C === 0 && D === 0) {
        if (trigKind === "sin" || trigKind === "tan" || trigKind === "cot") {
          parityStr = "Hàm số lẻ (Đồ thị đối xứng qua gốc $O(0,0)$)";
        } else {
          parityStr = "Hàm số chẵn (Đồ thị đối xứng qua trục $Oy$)";
        }
      } else {
        parityStr = "Hàm số không chẵn không lẻ";
      }

      // 5. Monotonicity (Sự biến thiên)
      let variationStr = "";
      if (trigKind === "sin") {
        variationStr = A * B > 0
          ? `Đồng biến trên khoảng $\\left(-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right) + k2\\pi$, nghịch biến trên $\\left(\\frac{\\pi}{2}; \\frac{3\\pi}{2}\\right) + k2\\pi$`
          : `Nghịch biến trên khoảng $\\left(-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right) + k2\\pi$, đồng biến trên $\\left(\\frac{\\pi}{2}; \\frac{3\\pi}{2}\\right) + k2\\pi$`;
      } else if (trigKind === "cos") {
        variationStr = A * B > 0
          ? `Đồng biến trên khoảng $(-\\pi; 0) + k2\\pi$, nghịch biến trên $(0; \\pi) + k2\\pi$`
          : `Nghịch biến trên khoảng $(-\\pi; 0) + k2\\pi$, đồng biến trên $(0; \\pi) + k2\\pi$`;
      } else if (trigKind === "tan") {
        variationStr = A * B > 0
          ? `Đồng biến trên từng khoảng xác định $\\left(-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right) + k\\pi$`
          : `Nghịch biến trên từng khoảng xác định $\\left(-\\frac{\\pi}{2}; \\frac{\\pi}{2}\\right) + k\\pi$`;
      } else {
        variationStr = A * B > 0
          ? `Nghịch biến trên từng khoảng xác định $(0; \\pi) + k\\pi$`
          : `Đồng biến trên từng khoảng xác định $(0; \\pi) + k\\pi$`;
      }

      return [
        { label: "Phương trình hàm số", value: eqLatex },
        { label: "Tập xác định (TXĐ)", value: domainStr },
        { label: "Chu kỳ tuần hoàn ($T$)", value: periodStr },
        { label: "Tập giá trị (TGT)", value: rangeStr },
        { label: "Giá trị lớn nhất (GTLN)", value: maxStr },
        { label: "Giá trị nhỏ nhất (GTNN)", value: minStr },
        { label: "Tính chẵn / lẻ", value: parityStr },
        { label: "Sự biến thiên (SGK)", value: variationStr }
      ];
    }

    switch (selectedModelId) {
      case "cube": {
        const V = Math.pow(a, 3);
        const Sxq = 4 * a * a;
        const Stp = 6 * a * a;
        const diag = a * Math.sqrt(3);
        return [
          { label: "Cạnh $a$", value: `${a.toFixed(2)} cm` },
          { label: "Thể tích ($V$)", value: `${V.toFixed(2)} cm³` },
          { label: "Diện tích xung quanh ($S_{xq}$)", value: `${Sxq.toFixed(2)} cm²` },
          { label: "Diện tích toàn phần ($S_{tp}$)", value: `${Stp.toFixed(2)} cm²` },
          { label: "Đường chéo khối ($d$)", value: `${diag.toFixed(2)} cm` }
        ];
      }
      case "cuboid": {
        const V = a * b * c;
        const Sxq = 2 * (a + b) * c;
        const Stp = 2 * (a * b + a * c + b * c);
        const diag = Math.sqrt(a * a + b * b + c * c);
        return [
          { label: "Dài $a$, Rộng $b$, Cao $h$", value: `${a.toFixed(1)} × ${b.toFixed(1)} × ${c.toFixed(1)} cm` },
          { label: "Thể tích ($V$)", value: `${V.toFixed(2)} cm³` },
          { label: "Diện tích xung quanh ($S_{xq}$)", value: `${Sxq.toFixed(2)} cm²` },
          { label: "Diện tích toàn phần ($S_{tp}$)", value: `${Stp.toFixed(2)} cm²` },
          { label: "Đường chéo khối ($d$)", value: `${diag.toFixed(2)} cm` }
        ];
      }
      case "prism_tri": {
        const Sday = (a * a * Math.sqrt(3)) / 4;
        const h = b;
        const V = Sday * h;
        const Sxq = 3 * a * h;
        const Stp = Sxq + 2 * Sday;
        return [
          { label: "Cạnh đáy $a$, Chiều cao $h$", value: `a = ${a.toFixed(1)}, h = ${h.toFixed(1)} cm` },
          { label: "Diện tích đáy ($S_{đáy}$)", value: `${Sday.toFixed(2)} cm²` },
          { label: "Thể tích ($V$)", value: `${V.toFixed(2)} cm³` },
          { label: "Diện tích xung quanh ($S_{xq}$)", value: `${Sxq.toFixed(2)} cm²` },
          { label: "Diện tích toàn phần ($S_{tp}$)", value: `${Stp.toFixed(2)} cm²` }
        ];
      }
      case "pyramid_quad": {
        const h = b;
        const V = (1 / 3) * a * a * h;
        const dLine = Math.sqrt(h * h + Math.pow(a / 2, 2));
        const Sxq = 2 * a * dLine;
        const Stp = Sxq + a * a;
        return [
          { label: "Cạnh đáy $a$, Chiều cao $h$", value: `a = ${a.toFixed(1)}, h = ${h.toFixed(1)} cm` },
          { label: "Đường cao mặt bên ($d$)", value: `${dLine.toFixed(2)} cm` },
          { label: "Thể tích ($V$)", value: `${V.toFixed(2)} cm³` },
          { label: "Diện tích xung quanh ($S_{xq}$)", value: `${Sxq.toFixed(2)} cm²` },
          { label: "Diện tích toàn phần ($S_{tp}$)", value: `${Stp.toFixed(2)} cm²` }
        ];
      }
      case "cone": {
        const R = a;
        const h = b;
        const l = Math.sqrt(R * R + h * h);
        const V = (1 / 3) * Math.PI * R * R * h;
        const Sxq = Math.PI * R * l;
        const Stp = Sxq + Math.PI * R * R;
        const alphaDeg = (360 * R) / l;
        return [
          { label: "Bán kính $R$, Chiều cao $h$", value: `R = ${R.toFixed(1)}, h = ${h.toFixed(1)} cm` },
          { label: "Đường sinh ($l$)", value: `${l.toFixed(2)} cm` },
          { label: "Góc ở đỉnh hình quạt khai triển", value: `${alphaDeg.toFixed(1)}°` },
          { label: "Thể tích ($V$)", value: `${V.toFixed(2)} cm³` },
          { label: "Diện tích xung quanh ($S_{xq}$)", value: `${Sxq.toFixed(2)} cm²` }
        ];
      }
      case "cylinder": {
        const R = a;
        const h = b;
        const V = Math.PI * R * R * h;
        const Sxq = 2 * Math.PI * R * h;
        const Stp = Sxq + 2 * Math.PI * R * R;
        return [
          { label: "Bán kính $R$, Chiều cao $h$", value: `R = ${R.toFixed(1)}, h = ${h.toFixed(1)} cm` },
          { label: "Thể tích ($V$)", value: `${V.toFixed(2)} cm³` },
          { label: "Diện tích xung quanh ($S_{xq}$)", value: `${Sxq.toFixed(2)} cm²` },
          { label: "Diện tích toàn phần ($S_{tp}$)", value: `${Stp.toFixed(2)} cm²` }
        ];
      }
      case "sphere": {
        const R = a;
        const V = (4 / 3) * Math.PI * Math.pow(R, 3);
        const S = 4 * Math.PI * R * R;
        const S_great = Math.PI * R * R;
        return [
          { label: "Bán kính ($R$)", value: `${R.toFixed(2)} cm` },
          { label: "Thể tích khối cầu ($V$)", value: `${V.toFixed(2)} cm³` },
          { label: "Diện tích mặt cầu ($S$)", value: `${S.toFixed(2)} cm²` },
          { label: "Diện tích đường tròn lớn", value: `${S_great.toFixed(2)} cm²` }
        ];
      }
      case "pythagoras": {
        const sideA = a;
        const sideB = b;
        const sideC = Math.sqrt(sideA * sideA + sideB * sideB);
        const areaA = sideA * sideA;
        const areaB = sideB * sideB;
        const areaC = sideC * sideC;
        return [
          { label: "Cạnh $a$, Cạnh $b$", value: `a = ${sideA.toFixed(1)}, b = ${sideB.toFixed(1)}` },
          { label: "Cạnh huyền ($c = \\sqrt{a^2+b^2}$)", value: `${sideC.toFixed(2)}` },
          { label: "Diện tích hình vuông $a^2$", value: `${areaA.toFixed(2)}` },
          { label: "Diện tích hình vuông $b^2$", value: `${areaB.toFixed(2)}` },
          { label: "Diện tích hình vuông huyền $c^2$", value: `${areaC.toFixed(2)}` }
        ];
      }
      case "tetrahedron": {
        const V = (Math.pow(a, 3) * Math.sqrt(2)) / 12;
        const Stp = a * a * Math.sqrt(3);
        const Rext = (a * Math.sqrt(6)) / 4;
        return [
          { label: "Cạnh $a$", value: `${a.toFixed(2)} cm` },
          { label: "Thể tích ($V$)", value: `${V.toFixed(2)} cm³` },
          { label: "Diện tích toàn phần ($S_{tp}$)", value: `${Stp.toFixed(2)} cm²` },
          { label: "Bán kính cầu ngoại tiếp ($R$)", value: `${Rext.toFixed(2)} cm` }
        ];
      }
      case "oxyz_space": {
        const x0 = a;
        const y0 = b;
        const z0 = c;
        const distO = Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0);
        return [
          { label: "Tọa độ điểm $P(x_0, y_0, z_0)$", value: `(${x0.toFixed(1)}, ${y0.toFixed(1)}, ${z0.toFixed(1)})` },
          { label: "Khoảng cách từ gốc $O$ đến $P$", value: `${distO.toFixed(2)}` },
          { label: "Phương trình mặt cầu tâm $P$ bán kính $R$", value: `(x - ${x0.toFixed(1)})² + (y - ${y0.toFixed(1)})² + (z - ${z0.toFixed(1)})² = ${Math.pow(d || 2, 2).toFixed(1)}` }
        ];
      }
      case "cubic_function": {
        const coefA = a;
        const coefB = b;
        const coefC = c;
        const coefD = d;
        const delta = 4 * coefB * coefB - 12 * coefA * coefC;
        const xInflect = -coefB / (3 * coefA);
        const yInflect = coefA * Math.pow(xInflect, 3) + coefB * Math.pow(xInflect, 2) + coefC * xInflect + coefD;
        return [
          { label: "Phương trình", value: `$y = ${coefA.toFixed(1)}x^3 + ${coefB.toFixed(1)}x^2 + ${coefC.toFixed(1)}x + ${coefD.toFixed(1)}$` },
          { label: "Đạo hàm $y'$", value: `$y' = ${(3 * coefA).toFixed(1)}x^2 + ${(2 * coefB).toFixed(1)}x + ${coefC.toFixed(1)}$` },
          { label: "Số điểm cực trị", value: delta > 0 ? "2 điểm cực trị" : delta === 0 ? "1 điểm uốn tiếp xúc" : "Không có cực trị" },
          { label: "Tọa độ điểm uốn $I$", value: `I(${xInflect.toFixed(2)}, ${yInflect.toFixed(2)})` }
        ];
      }
      case "solid_revolution": {
        const R = a;
        const V = (4 / 3) * Math.PI * Math.pow(R, 3);
        const S_surface = 4 * Math.PI * R * R;
        return [
          { label: "Đường tròn $y = \\sqrt{${R.toFixed(1)}^2 - x^2}$", value: `Bán kính R = ${R.toFixed(1)}` },
          { label: "Cận tích phân", value: `$a = -${R.toFixed(1)}, b = +${R.toFixed(1)}$` },
          { label: "Công thức thể tích $V$", value: `$V = \\pi \\int_{-R}^{R} (R^2 - x^2) dx = \\frac{4}{3}\\pi R^3$` },
          { label: "Thể tích khối tròn xoay ($V$)", value: `${V.toFixed(2)} cm³` },
          { label: "Diện tích bề mặt xoay", value: `${S_surface.toFixed(2)} cm²` }
        ];
      }
      default:
        return [
          { label: "Thông số mặc định", value: `a = ${a.toFixed(1)}, b = ${b.toFixed(1)}` }
        ];
    }
  }, [selectedModelId, isTrigModel, trigKind, trigA, trigB, trigC, trigD, paramA, paramB, paramC, paramD]);

  // --------------------------------------------------------------------------
  // DRAW CANVAS ENGINE (SUPPORTING 3D SHAPES, CALCULUS & TRIGONOMETRIC PLOTS)
  // --------------------------------------------------------------------------
  const drawModel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark Mode Grid
    ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const cx = width / 2;
    const cy = height / 2;
    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;

    // 3D Projection Engine
    const project = (x: number, y: number, z: number) => {
      const x1 = x * Math.cos(radY) + z * Math.sin(radY);
      const z1 = -x * Math.sin(radY) + z * Math.cos(radY);
      const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = y * Math.sin(radX) + z1 * Math.cos(radX);

      const scale = (350 / (350 + z2)) * zoom * 45;
      return {
        px: cx + x1 * scale,
        py: cy - y2 * scale,
        pz: z2
      };
    };

    const drawLine = (
      p1: { px: number; py: number }, 
      p2: { px: number; py: number }, 
      color = "#10b981", 
      dashed = false,
      lineWidth = 2
    ) => {
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (dashed) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawLabel = (p: { px: number; py: number }, text: string, color = "#f8fafc") => {
      if (!showLabels) return;
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(p.px + 12, p.py - 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, p.px + 12, p.py - 12);
    };

    const drawPoint = (p: { px: number; py: number }, color = "#34d399") => {
      if (!showVertices) return;
      ctx.beginPath();
      ctx.arc(p.px, p.py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    // ------------------------------------------------------------------------
    // SPECIALIZED TRIGONOMETRIC CANVAS RENDERER
    // ------------------------------------------------------------------------
    if (isTrigModel) {
      const originX = cx;
      const originY = cy;
      const xPixelsPerRad = 55 * zoom; // Scale for x-axis in radians
      const yPixelsPerUnit = 45 * zoom; // Scale for y-axis

      // Draw Main Axes
      drawLine({ px: 20, py: originY }, { px: width - 20, py: originY }, "#64748b", false, 2); // Ox
      drawLine({ px: originX, py: height - 20 }, { px: originX, py: 20 }, "#64748b", false, 2); // Oy

      // Axis Arrows & Labels
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("x", width - 15, originY - 8);
      ctx.fillText("y", originX + 12, 20);
      ctx.fillText("O", originX - 12, originY + 15);

      // Ticks along Ox (-2pi, -3pi/2, -pi, -pi/2, pi/2, pi, 3pi/2, 2pi)
      const ticks = [
        { rad: -2 * Math.PI, label: "-2π" },
        { rad: -1.5 * Math.PI, label: "-3π/2" },
        { rad: -Math.PI, label: "-π" },
        { rad: -0.5 * Math.PI, label: "-π/2" },
        { rad: 0.5 * Math.PI, label: "π/2" },
        { rad: Math.PI, label: "π" },
        { rad: 1.5 * Math.PI, label: "3π/2" },
        { rad: 2 * Math.PI, label: "2π" }
      ];

      ticks.forEach(t => {
        const tx = originX + t.rad * xPixelsPerRad;
        if (tx > 20 && tx < width - 20) {
          ctx.beginPath();
          ctx.moveTo(tx, originY - 5);
          ctx.lineTo(tx, originY + 5);
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = "#94a3b8";
          ctx.font = "11px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(t.label, tx, originY + 20);
        }
      });

      // Ticks along Oy (-3, -2, -1, 1, 2, 3)
      for (let yVal = -4; yVal <= 4; yVal += 1) {
        if (yVal === 0) continue;
        const ty = originY - yVal * yPixelsPerUnit;
        if (ty > 20 && ty < height - 20) {
          ctx.beginPath();
          ctx.moveTo(originX - 5, ty);
          ctx.lineTo(originX + 5, ty);
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = "#94a3b8";
          ctx.font = "11px Inter, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(`${yVal}`, originX - 8, ty + 4);
        }
      }

      // Draw Asymptotes for Tan & Cot
      if (trigKind === "tan" || trigKind === "cot") {
        const absB = Math.abs(trigB === 0 ? 0.001 : trigB);
        for (let k = -6; k <= 6; k++) {
          let asympRad = 0;
          if (trigKind === "tan") {
            asympRad = (Math.PI / 2 - trigC + k * Math.PI) / absB;
          } else {
            asympRad = (-trigC + k * Math.PI) / absB;
          }
          const asympPx = originX + asympRad * xPixelsPerRad;
          if (asympPx > 10 && asympPx < width - 10) {
            drawLine({ px: asympPx, py: 20 }, { px: asympPx, py: height - 20 }, "#f43f5e", true, 1.5);
          }
        }
      }

      // Plot Trigonometric Curve
      ctx.beginPath();
      let isDrawing = false;

      for (let px = 20; px <= width - 20; px += 1.5) {
        const xRad = (px - originX) / xPixelsPerRad;
        const angle = trigB * xRad + trigC;
        let yVal = 0;
        let isValid = true;

        if (trigKind === "sin") {
          yVal = trigA * Math.sin(angle) + trigD;
        } else if (trigKind === "cos") {
          yVal = trigA * Math.cos(angle) + trigD;
        } else if (trigKind === "tan") {
          const cosVal = Math.cos(angle);
          if (Math.abs(cosVal) < 0.05) isValid = false;
          else yVal = trigA * Math.tan(angle) + trigD;
        } else if (trigKind === "cot") {
          const sinVal = Math.sin(angle);
          if (Math.abs(sinVal) < 0.05) isValid = false;
          else yVal = trigA * (Math.cos(angle) / sinVal) + trigD;
        }

        const py = originY - yVal * yPixelsPerUnit;

        // Clip out of bound vertical jumps for tan/cot
        if (!isValid || py < -100 || py > height + 100) {
          isDrawing = false;
          continue;
        }

        if (!isDrawing) {
          ctx.moveTo(px, py);
          isDrawing = true;
        } else {
          ctx.lineTo(px, py);
        }
      }

      ctx.strokeStyle = level === "thpt" ? "#a855f7" : "#10b981";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Highlight Max / Min or Key Points if sin/cos
      if (trigKind === "sin" || trigKind === "cos") {
        const absB = Math.abs(trigB === 0 ? 1 : trigB);
        for (let k = -3; k <= 3; k++) {
          let peakRad = 0;
          if (trigKind === "sin") peakRad = (Math.PI / 2 - trigC + k * 2 * Math.PI) / absB;
          else peakRad = (-trigC + k * 2 * Math.PI) / absB;

          const peakPx = originX + peakRad * xPixelsPerRad;
          const peakYVal = trigA + trigD;
          const peakPy = originY - peakYVal * yPixelsPerUnit;

          if (peakPx > 30 && peakPx < width - 30 && peakPy > 30 && peakPy < height - 30) {
            drawPoint({ px: peakPx, py: peakPy }, "#facc15");
          }
        }
      }

      return;
    }

    // ------------------------------------------------------------------------
    // MODEL SPECIFIC DRAWING (GEOMETRY & CALCULUS)
    // ------------------------------------------------------------------------
    const scaleA = paramA * 0.7;
    const scaleB = paramB * 0.7;
    const scaleC = paramC * 0.7;

    switch (selectedModelId) {
      case "cube":
      case "cuboid": {
        const hA = scaleA;
        const hB = selectedModelId === "cube" ? scaleA : scaleB;
        const hC = selectedModelId === "cube" ? scaleA : scaleC;

        const vA = project(-hA, -hC, -hB);
        const vB = project(hA, -hC, -hB);
        const vC = project(hA, -hC, hB);
        const vD = project(-hA, -hC, hB);

        const vA1 = project(-hA, hC, -hB);
        const vB1 = project(hA, hC, -hB);
        const vC1 = project(hA, hC, hB);
        const vD1 = project(-hA, hC, hB);

        // Glass Fill
        if (viewMode === "glass") {
          ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
          ctx.beginPath();
          ctx.moveTo(vA1.px, vA1.py);
          ctx.lineTo(vB1.px, vB1.py);
          ctx.lineTo(vC1.px, vC1.py);
          ctx.lineTo(vD1.px, vD1.py);
          ctx.closePath();
          ctx.fill();
        }

        // Edges
        if (showEdges) {
          drawLine(vA, vB, "#34d399", true);
          drawLine(vA, vD, "#34d399", true);
          drawLine(vA, vA1, "#34d399", true);

          drawLine(vB, vC, "#10b981");
          drawLine(vC, vD, "#10b981");
          drawLine(vA1, vB1, "#10b981");
          drawLine(vB1, vC1, "#10b981");
          drawLine(vC1, vD1, "#10b981");
          drawLine(vD1, vA1, "#10b981");

          drawLine(vB, vB1, "#10b981");
          drawLine(vC, vC1, "#10b981");
          drawLine(vD, vD1, "#10b981");
        }

        // Slice Plane
        if (showSlicePlane) {
          const sliceRatio = (sliceOffset / 100) * 2 - 1;
          const p1 = project(-hA, sliceRatio * hC, -hB);
          const p2 = project(hA, sliceRatio * hC, -hB);
          const p3 = project(hA, sliceRatio * hC, hB);
          const p4 = project(-hA, sliceRatio * hC, hB);

          ctx.fillStyle = "rgba(236, 72, 153, 0.35)";
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.lineTo(p3.px, p3.py);
          ctx.lineTo(p4.px, p4.py);
          ctx.closePath();
          ctx.fill();

          drawLine(p1, p2, "#f43f5e", false, 2.5);
          drawLine(p2, p3, "#f43f5e", false, 2.5);
          drawLine(p3, p4, "#f43f5e", false, 2.5);
          drawLine(p4, p1, "#f43f5e", false, 2.5);
        }

        // Labels
        [
          { p: vA, label: "A" }, { p: vB, label: "B" },
          { p: vC, label: "C" }, { p: vD, label: "D" },
          { p: vA1, label: "A'" }, { p: vB1, label: "B'" },
          { p: vC1, label: "C'" }, { p: vD1, label: "D'" }
        ].forEach(item => {
          drawPoint(item.p);
          drawLabel(item.p, item.label);
        });
        break;
      }

      case "pyramid_quad": {
        const side = scaleA;
        const h = scaleB;

        const vA = project(-side, -h / 2, -side);
        const vB = project(side, -h / 2, -side);
        const vC = project(side, -h / 2, side);
        const vD = project(-side, -h / 2, side);
        const vS = project(0, h / 2, 0);
        const vO = project(0, -h / 2, 0);

        if (viewMode === "glass") {
          ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
          ctx.beginPath();
          ctx.moveTo(vS.px, vS.py);
          ctx.lineTo(vB.px, vB.py);
          ctx.lineTo(vC.px, vC.py);
          ctx.closePath();
          ctx.fill();
        }

        if (showEdges) {
          drawLine(vA, vB, "#38bdf8", true);
          drawLine(vA, vD, "#38bdf8", true);
          drawLine(vS, vA, "#38bdf8", true);

          drawLine(vB, vC, "#0284c7");
          drawLine(vC, vD, "#0284c7");
          drawLine(vS, vB, "#0284c7");
          drawLine(vS, vC, "#0284c7");
          drawLine(vS, vD, "#0284c7");
        }

        if (showAltitude) {
          drawLine(vS, vO, "#f43f5e", true, 2);
          drawPoint(vO, "#f43f5e");
          drawLabel(vO, "O", "#f43f5e");
        }

        [
          { p: vS, label: "S" }, { p: vA, label: "A" },
          { p: vB, label: "B" }, { p: vC, label: "C" }, { p: vD, label: "D" }
        ].forEach(item => {
          drawPoint(item.p, "#38bdf8");
          drawLabel(item.p, item.label, "#38bdf8");
        });
        break;
      }

      case "sphere": {
        const R = scaleA;
        const center = project(0, 0, 0);

        ctx.beginPath();
        ctx.arc(center.px, center.py, R * zoom * 42, 0, Math.PI * 2);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        if (viewMode === "glass") {
          ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
          ctx.fill();
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(center.px, center.py, R * zoom * 42, R * zoom * 14, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        drawPoint(center, "#38bdf8");
        drawLabel(center, "O", "#38bdf8");
        break;
      }

      case "pythagoras": {
        const sideA = paramA * 28;
        const sideB = paramB * 28;
        const originX = cx - sideA / 2;
        const originY = cy + sideB / 2;

        const pC = { px: originX, py: originY };
        const pA = { px: originX, py: originY - sideB };
        const pB = { px: originX + sideA, py: originY };

        ctx.beginPath();
        ctx.moveTo(pC.px, pC.py);
        ctx.lineTo(pA.px, pA.py);
        ctx.lineTo(pB.px, pB.py);
        ctx.closePath();
        ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
        ctx.fill();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "rgba(244, 63, 94, 0.2)";
        ctx.fillRect(pC.px - sideB, pC.py - sideB, sideB, sideB);
        ctx.strokeStyle = "#f43f5e";
        ctx.strokeRect(pC.px - sideB, pC.py - sideB, sideB, sideB);

        ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
        ctx.fillRect(pC.px, pC.py, sideA, sideA);
        ctx.strokeStyle = "#38bdf8";
        ctx.strokeRect(pC.px, pC.py, sideA, sideA);

        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;
        ctx.strokeRect(pC.px, pC.py - 12, 12, 12);

        [
          { p: pC, label: "C" }, { p: pA, label: "A" }, { p: pB, label: "B" }
        ].forEach(item => {
          drawPoint(item.p, "#10b981");
          drawLabel(item.p, item.label, "#10b981");
        });
        break;
      }

      case "oxyz_space": {
        const origin = project(0, 0, 0);
        const axisX = project(scaleA * 1.5, 0, 0);
        const axisY = project(0, scaleB * 1.5, 0);
        const axisZ = project(0, 0, scaleC * 1.5);

        drawLine(origin, axisX, "#ef4444", false, 2.5);
        drawLine(origin, axisY, "#10b981", false, 2.5);
        drawLine(origin, axisZ, "#3b82f6", false, 2.5);

        drawLabel(axisX, "x", "#ef4444");
        drawLabel(axisY, "y", "#10b981");
        drawLabel(axisZ, "z", "#3b82f6");

        const ptP = project(scaleA, scaleB, scaleC);
        const projOxy = project(scaleA, scaleB, 0);

        drawLine(origin, ptP, "#f59e0b", false, 2);
        drawLine(ptP, projOxy, "#94a3b8", true, 1.5);
        drawLine(projOxy, project(scaleA, 0, 0), "#94a3b8", true, 1.5);
        drawLine(projOxy, project(0, scaleB, 0), "#94a3b8", true, 1.5);

        drawPoint(ptP, "#f59e0b");
        drawLabel(ptP, `P(${paramA.toFixed(1)}, ${paramB.toFixed(1)}, ${paramC.toFixed(1)})`, "#f59e0b");
        break;
      }

      case "cubic_function":
      case "quartic_function":
      case "rational_function": {
        const originX = cx;
        const originY = cy;

        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(width, originY);
        ctx.moveTo(originX, 0);
        ctx.lineTo(originX, height);
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = "bold 12px Inter";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("x", width - 15, originY - 10);
        ctx.fillText("y", originX + 10, 15);
        ctx.fillText("O", originX - 12, originY + 15);

        ctx.beginPath();
        const plotScale = 30 * zoom;

        for (let px = 0; px < width; px += 2) {
          const xVal = (px - originX) / plotScale;
          let yVal = 0;

          if (selectedModelId === "cubic_function") {
            yVal = paramA * Math.pow(xVal, 3) + paramB * Math.pow(xVal, 2) + paramC * xVal + paramD;
          } else if (selectedModelId === "quartic_function") {
            yVal = paramA * Math.pow(xVal, 4) + paramB * Math.pow(xVal, 2) + paramC;
          } else if (selectedModelId === "rational_function") {
            const denom = paramC * xVal + paramD;
            if (Math.abs(denom) < 0.1) continue;
            yVal = (paramA * xVal + paramB) / denom;
          }

          const py = originY - yVal * plotScale;
          if (px === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3;
        ctx.stroke();
        break;
      }

      case "solid_revolution": {
        const R = scaleA;
        const steps = 24;

        for (let i = 0; i <= steps; i++) {
          const xVal = -R + (i * 2 * R) / steps;
          const radiusY = Math.sqrt(Math.max(0, R * R - xVal * xVal));

          const circleSegs = 16;
          const circlePts = [];

          for (let j = 0; j < circleSegs; j++) {
            const ang = (j * 2 * Math.PI) / circleSegs;
            circlePts.push(project(xVal, radiusY * Math.cos(ang), radiusY * Math.sin(ang)));
          }

          ctx.beginPath();
          circlePts.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.px, p.py);
            else ctx.lineTo(p.px, p.py);
          });
          ctx.closePath();
          ctx.strokeStyle = `hsla(${i * 12}, 80%, 60%, 0.6)`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        drawLine(project(-R * 1.4, 0, 0), project(R * 1.4, 0, 0), "#ef4444", false, 2.5);
        drawLabel(project(R * 1.4, 0, 0), "Ox", "#ef4444");
        break;
      }

      default:
        break;
    }
  }, [
    selectedModelId, isTrigModel, trigKind, trigA, trigB, trigC, trigD, 
    rotX, rotY, zoom, paramA, paramB, paramC, paramD, 
    showVertices, showEdges, showAltitude, showLabels, viewMode, showSlicePlane, sliceOffset
  ]);

  // Redraw when parameters update
  useEffect(() => {
    drawModel();
  }, [drawModel]);

  // Mouse drag 3D rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isTrigModel) return; // Trigonometric graphs are 2D static plots
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || isTrigModel) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    setRotY(prev => prev + dx * 0.6);
    setRotX(prev => Math.max(-85, Math.min(85, prev - dy * 0.6)));

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Export Transparent PNG
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width * 2;
    tempCanvas.height = canvas.height * 2;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(2, 2);
    ctx.drawImage(canvas, 0, 0);

    const dataUrl = tempCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `do_thi_toan_${selectedModelId}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Copy TikZ Code generator
  const [copiedTikz, setCopiedTikz] = useState(false);

  const handleCopyTikz = () => {
    let tikzCode = `\\begin{tikzpicture}[scale=1.1, >=stealth]\n`;

    if (isTrigModel) {
      tikzCode += `  % Coordinates and Axes for Trigonometric Graph: ${activeModel.title}
  \\draw[->, thick] (-6.5,0) -- (6.5,0) node[below] {$x$};
  \\draw[->, thick] (0,-3.5) -- (0,3.5) node[left] {$y$};
  \\node[below left] at (0,0) {$O$};

  % Ticks for x-axis in terms of pi
  \\foreach \\x/\\xtext in {-6.28/-2\\pi, -4.71/-3\\pi/2, -3.14/-\\pi, -1.57/-\\pi/2, 1.57/\\pi/2, 3.14/\\pi, 4.71/3\\pi/2, 6.28/2\\pi}
    \\draw (\\x, 0.1) -- (\\x, -0.1) node[below, font=\\tiny] {$\\xtext$};

  % Function Plot
  \\draw[trig format=rad, domain=-6.28:6.28, samples=200, smooth, thick, purple!80!black] 
    plot (\\x, {${trigA.toFixed(1)}*${trigKind}(${trigB.toFixed(1)}*\\x + ${trigC.toFixed(2)}) + ${trigD.toFixed(1)}});
`;
    } else {
      switch (selectedModelId) {
        case "cube":
          tikzCode += `  % Coordinates of Cube
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (${paramA.toFixed(1)},0);
  \\coordinate (C) at (${(paramA * 1.3).toFixed(1)},${(paramA * 0.4).toFixed(1)});
  \\coordinate (D) at (${(paramA * 0.3).toFixed(1)},${(paramA * 0.4).toFixed(1)});
  \\coordinate (A1) at (0,${paramA.toFixed(1)});
  \\coordinate (B1) at (${paramA.toFixed(1)},${paramA.toFixed(1)});
  \\coordinate (C1) at (${(paramA * 1.3).toFixed(1)},${(paramA * 1.4).toFixed(1)});
  \\coordinate (D1) at (${(paramA * 0.3).toFixed(1)},${(paramA * 1.4).toFixed(1)});

  % Edges
  \\draw[dashed] (D) -- (A) (D) -- (C) (D) -- (D1);
  \\draw[thick, emerald] (A) -- (B) -- (C) -- (C1) -- (D1) -- (A1) -- cycle;
  \\draw[thick, emerald] (B) -- (B1) (A1) -- (B1) (B1) -- (C1);

  % Labels
  \\foreach \\p/\\pos in {A/below left, B/below right, C/right, D/above left, A1/above left, B1/above right, C1/above right, D1/above}
    \\filldraw[fill=white] (\\p) circle (1.5pt) node[\\pos] {$\\p$};
`;
          break;
        case "pyramid_quad":
          tikzCode += `  % Coordinates of Regular Pyramid S.ABCD
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (${paramA.toFixed(1)},0);
  \\coordinate (C) at (${(paramA * 1.4).toFixed(1)},${(paramA * 0.5).toFixed(1)});
  \\coordinate (D) at (${(paramA * 0.4).toFixed(1)},${(paramA * 0.5).toFixed(1)});
  \\coordinate (O) at (${(paramA * 0.7).toFixed(1)},${(paramA * 0.25).toFixed(1)});
  \\coordinate (S) at (${(paramA * 0.7).toFixed(1)},${(paramA * 0.25 + paramB).toFixed(1)});

  % Edges & Altitude
  \\draw[dashed] (A) -- (D) -- (C) (S) -- (D) (S) -- (O);
  \\draw[thick, blue!70!black] (A) -- (B) -- (C) (S) -- (A) (S) -- (B) (S) -- (C);

  % Labels
  \\foreach \\p/\\pos in {S/above, A/below left, B/below right, C/right, D/above left, O/below}
    \\filldraw[fill=white] (\\p) circle (1.5pt) node[\\pos] {$\\p$};
`;
          break;
        default:
          tikzCode += `  % Geometry model: ${activeModel.title}
  \\draw[thick, primary] (0,0) rectangle (${paramA.toFixed(1)},${paramB.toFixed(1)});
  \\node at (${(paramA / 2).toFixed(1)},${(paramB / 2).toFixed(1)}) {${activeModel.title}};
`;
          break;
      }
    }

    tikzCode += `\\end{tikzpicture}`;

    navigator.clipboard.writeText(tikzCode);
    setCopiedTikz(true);
    setTimeout(() => setCopiedTikz(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 bg-slate-950 text-slate-100 p-4 md:p-6 rounded-3xl border border-slate-800 shadow-2xl">
      
      {/* -------------------------------------------------------------------- */}
      {/* HEADER & LEVEL SWITCHER */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-500/20">
              📐
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                Thư viện Mô hình & Hình học Toán học THCS - THPT
              </h1>
              <p className="text-xs text-slate-400">
                Mô phỏng 3D/2D tương tác, Đồ thị Hàm số Lượng giác Lớp 11 (KNTT) & Xuất ảnh PNG / TikZ cho đề thi
              </p>
            </div>
          </div>
        </div>

        {/* THCS vs THPT Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => handleLevelSwitch("thcs")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
              level === "thcs"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <span>🎒 Cấp THCS (Lớp 6-9)</span>
          </button>

          <button
            onClick={() => handleLevelSwitch("thpt")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
              level === "thpt"
                ? "bg-purple-500 text-white shadow-md shadow-purple-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <span>🎓 Cấp THPT (Lớp 10-12)</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* CATEGORY & MODEL SELECTOR STRIP */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
          <span>{level === "thcs" ? "Danh mục mô hình THCS:" : "Danh mục mô hình & đồ thị THPT (KNTT):"}</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {MODELS_REGISTRY.filter(m => m.level === level).map(model => (
            <button
              key={model.id}
              onClick={() => handleSelectModel(model.id)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-2 shrink-0",
                selectedModelId === model.id
                  ? model.category === "trig"
                    ? "bg-purple-500/25 text-purple-200 border-purple-400 shadow-lg shadow-purple-500/20 ring-1 ring-purple-400"
                    : level === "thcs"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-lg shadow-emerald-500/10"
                      : "bg-purple-500/20 text-purple-300 border-purple-500 shadow-lg shadow-purple-500/10"
                  : "bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
              )}
            >
              {model.category === "trig" && <Activity className="w-3.5 h-3.5 text-purple-400" />}
              <span>{model.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* MAIN CONTENT WORKSPACE: CANVAS + CONTROLS */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Canvas Viewport */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative bg-slate-900 rounded-3xl border border-slate-800 p-4 shadow-inner overflow-hidden min-h-[420px] flex items-center justify-center">
            
            {/* Top Toolbar overlay on Canvas */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 bg-slate-950/80 backdrop-blur px-3 py-2 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">{activeModel.title}</span>
                <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-md font-mono">
                  {isTrigModel ? "Đồ thị Lớp 11 KNTT" : "Xoay 360° bằng chuột"}
                </span>
              </div>

              {/* Display mode / Reset buttons */}
              <div className="flex items-center gap-1">
                {!isTrigModel && (["glass", "wireframe", "solid"] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer capitalize",
                      viewMode === mode
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {mode === "glass" ? "Kính trong" : mode === "wireframe" ? "Khung dây" : "Mặt đặc"}
                  </button>
                ))}

                <button
                  onClick={() => { setRotX(25); setRotY(-35); setZoom(1.0); }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer ml-1"
                  title="Đặt lại góc nhìn / Thu phóng"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas Element */}
            <canvas
              ref={canvasRef}
              width={600}
              height={440}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={cn(
                "w-full h-full rounded-2xl",
                isTrigModel ? "cursor-default" : "cursor-grab active:cursor-grabbing"
              )}
            />

            {/* Bottom Overlay Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 bg-slate-950/80 backdrop-blur px-3 py-2 rounded-2xl border border-slate-800/80 text-xs">
              {!isTrigModel ? (
                <div className="flex items-center gap-3 text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showVertices}
                      onChange={e => setShowVertices(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>Đỉnh</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showEdges}
                      onChange={e => setShowEdges(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>Cạnh</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAltitude}
                      onChange={e => setShowAltitude(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>Đường cao</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={e => setShowLabels(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>Tên đỉnh</span>
                  </label>
                </div>
              ) : (
                <div className="text-xs text-purple-300 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                  <span>Đơn vị chia trục $Ox$ tính theo rada $\\pi$ ($-2\\pi \\dots 2\\pi$)</span>
                </div>
              )}

              {/* Zoom Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(z => Math.min(2.5, z + 0.1))}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPNG}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Tải ảnh PNG nền trong suốt (Soạn đề Word/PowerPoint)</span>
            </button>

            <button
              onClick={handleCopyTikz}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer text-xs"
            >
              {copiedTikz ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Đã chép TikZ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-purple-400" />
                  <span>Sao chép mã TikZ (LaTeX)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Parameters & Live SGK Data */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Active Model Summary Box */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {activeModel.subtitle}
              </span>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                {activeModel.level === "thcs" ? "Cấp THCS" : "Cấp THPT (KNTT)"}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {activeModel.description}
            </p>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-300 text-center overflow-x-auto custom-scrollbar">
              {activeModel.formulaLatex}
            </div>
          </div>

          {/* Dynamic Controls Panel */}
          {isTrigModel ? (
            /* SPECIAL TRIGONOMETRIC PARAMETER PANEL */
            <div className="bg-slate-900 rounded-3xl border border-purple-900/40 p-5 space-y-4 shadow-lg shadow-purple-900/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>Công cụ Hàm Lượng Giác Tổng Quát</span>
                </h3>
                <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-md font-mono">
                  {"$y = A \\cdot \\text{trig}(Bx + C) + D$"}
                </span>
              </div>

              {/* Function Choice Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Chọn dạng hàm số lượng giác:</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["sin", "cos", "tan", "cot"] as const).map(k => (
                    <button
                      key={k}
                      onClick={() => setTrigKind(k)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer capitalize font-mono",
                        trigKind === k
                          ? "bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-500/30"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                      )}
                    >
                      {k}(x)
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider A */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">Hệ số biên độ $A$</span>
                  <span className="text-purple-300 font-mono font-bold">{trigA.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="-4.0"
                  max="4.0"
                  step="0.1"
                  value={trigA}
                  onChange={e => setTrigA(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider B */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">Tần số góc $B$</span>
                  <span className="text-purple-300 font-mono font-bold">{trigB.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  value={trigB}
                  onChange={e => setTrigB(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Presets & Slider C (Phase shift) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">Pha ban đầu $C$ (Radian)</span>
                  <span className="text-purple-300 font-mono font-bold">{formatPiRad(trigC)}</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  {[
                    { label: "0", val: 0 },
                    { label: "π/6", val: Math.PI / 6 },
                    { label: "π/4", val: Math.PI / 4 },
                    { label: "π/3", val: Math.PI / 3 },
                    { label: "π/2", val: Math.PI / 2 },
                    { label: "π", val: Math.PI },
                    { label: "-π/2", val: -Math.PI / 2 }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTrigC(p.val)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0",
                        Math.abs(trigC - p.val) < 0.05
                          ? "bg-purple-500 text-white border-purple-400"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider D */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">Tung độ gốc $D$ (Độ dịch đứng)</span>
                  <span className="text-purple-300 font-mono font-bold">{trigD.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.5"
                  value={trigD}
                  onChange={e => setTrigD(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                />
              </div>

            </div>
          ) : (
            /* GEOMETRY & CALCULUS PARAMETER PANEL */
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Bảng điều chỉnh thông số kích thước</span>
              </h3>

              {/* Slider 1 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-400">
                    {selectedModelId === "sphere" || selectedModelId === "cone" || selectedModelId === "cylinder" ? "Bán kính R" : "Chiều dài cạnh a"}
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">{paramA.toFixed(1)} cm</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="6.0"
                  step="0.1"
                  value={paramA}
                  onChange={e => setParamA(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 2 */}
              {selectedModelId !== "sphere" && selectedModelId !== "cube" && selectedModelId !== "tetrahedron" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">
                      {selectedModelId === "cone" || selectedModelId === "cylinder" || selectedModelId === "pyramid_quad" || selectedModelId === "prism_tri" ? "Chiều cao h" : "Chiều rộng b / Hệ số"}
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">{paramB.toFixed(1)} cm</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="6.0"
                    step="0.1"
                    value={paramB}
                    onChange={e => setParamB(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Slider 3 */}
              {(selectedModelId === "cuboid" || selectedModelId === "oxyz_space" || selectedModelId.includes("function")) && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Kích thước c / Tọa độ z</span>
                    <span className="text-emerald-400 font-mono font-bold">{paramC.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-5.0"
                    max="5.0"
                    step="0.1"
                    value={paramC}
                    onChange={e => setParamC(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Polyhedra Slice Cut Toggle */}
              {level === "thpt" && (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5 cursor-pointer">
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Mặt phẳng cắt thiết diện</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={showSlicePlane}
                      onChange={e => setShowSlicePlane(e.target.checked)}
                      className="rounded accent-purple-500 cursor-pointer"
                    />
                  </div>

                  {showSlicePlane && (
                    <div className="space-y-1.5 bg-purple-950/30 p-2.5 rounded-xl border border-purple-800/40">
                      <div className="flex justify-between text-[11px] font-medium text-purple-300">
                        <span>Vị trí cắt h</span>
                        <span className="font-mono font-bold">{sliceOffset}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="1"
                        value={sliceOffset}
                        onChange={e => setSliceOffset(parseInt(e.target.value))}
                        className="w-full accent-purple-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Automatic Calculated Values Table (SGK Compliant) */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{isTrigModel ? "Bảng dữ kiện khảo sát hàm số (Chuẩn SGK KNTT)" : "Kết quả tính toán tự động"}</span>
              </h3>

              <div className="space-y-2">
                {calculatedValues.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs gap-1">
                    <span className="text-slate-400 font-medium">{item.label}</span>
                    <span className="font-mono font-bold text-emerald-300 text-left sm:text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic text-center pt-2">
              Tất cả công thức, đồ thị và dữ kiện toán học tuân thủ nghiêm ngặt SGK Kết nối tri thức với cuộc sống.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
