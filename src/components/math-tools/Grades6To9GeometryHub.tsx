import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Calculator, Sparkles, Compass, Layers, Info, BookOpen, RotateCcw, Sliders, CheckCircle2, Play, MousePointer
} from "lucide-react";
import { MarkdownRenderer, MathSpan } from "../MarkdownRenderer";
import { Grade9Graphing } from "./Grade9Graphing";

interface ShapeDef {
  id: string;
  name: string;
  category: string;
  formulaSummary: string;
  definition: string;
  properties: string[];
  realWorldExample: string;
  defaultParams: Record<string, number>;
  paramRanges: Record<string, { min: number; max: number; step: number; label: string }>;
}

const GRADE_6_SHAPES: ShapeDef[] = [
  {
    id: "rectangle",
    name: "Hình chữ nhật",
    category: "Hình phẳng",
    formulaSummary: "Chu vi: $C = 2(a + b)$, Diện tích: $S = a \\cdot b$",
    definition: "Hình chữ nhật là tứ giác có 4 góc vuông.",
    properties: [
      "Hai cạnh đối song song và bằng nhau ($a = CD, b = AD$).",
      "Hai đường chéo bằng nhau và cắt nhau tại trung điểm của mỗi đường ($AC = BD$).",
      "Có 4 góc vuông ($90^\\circ$)."
    ],
    realWorldExample: "Mặt bàn học, bảng đen trong lớp học, màn hình TV, sân bóng rổ hình chữ nhật.",
    defaultParams: { a: 10, b: 6 },
    paramRanges: {
      a: { min: 2, max: 20, step: 0.5, label: "Chiều dài a" },
      b: { min: 2, max: 15, step: 0.5, label: "Chiều rộng b" }
    }
  },
  {
    id: "square",
    name: "Hình vuông",
    category: "Hình phẳng",
    formulaSummary: "Chu vi: $C = 4a$, Diện tích: $S = a^2$",
    definition: "Hình vuông là hình chữ nhật có 4 cạnh bằng nhau.",
    properties: [
      "Tất cả 4 cạnh đều bằng nhau ($AB = BC = CD = DA = a$).",
      "4 góc đều là góc vuông ($90^\\circ$).",
      "Hai đường chéo bằng nhau, vuông góc với nhau và cắt nhau tại trung điểm mỗi đường."
    ],
    realWorldExample: "Gạch hoa lát nền nhà, khăn mùi xoa, Rubik, mặt xúc xắc.",
    defaultParams: { a: 8 },
    paramRanges: {
      a: { min: 2, max: 15, step: 0.5, label: "Cạnh a" }
    }
  },
  {
    id: "parallelogram",
    name: "Hình bình hành",
    category: "Hình phẳng",
    formulaSummary: "Chu vi: $C = 2(a + b)$, Diện tích: $S = a \\cdot h$",
    definition: "Hình bình hành là tứ giác có các cạnh đối song song.",
    properties: [
      "Các cạnh đối song song và bằng nhau ($AB \\parallel CD, AD \\parallel BC$).",
      "Các góc đối bằng nhau ($\\hat{A} = \\hat{C}, \\hat{B} = \\hat{D}$).",
      "Hai đường chéo cắt nhau tại trung điểm của mỗi đường."
    ],
    realWorldExample: "Khung cửa xếp, biển báo giao thông hình bình hành, họa tiết trang trí.",
    defaultParams: { a: 10, b: 6, h: 5 },
    paramRanges: {
      a: { min: 3, max: 18, step: 0.5, label: "Cạnh đáy a" },
      b: { min: 3, max: 15, step: 0.5, label: "Cạnh bên b" },
      h: { min: 2, max: 12, step: 0.5, label: "Chiều cao h" }
    }
  },
  {
    id: "rhombus",
    name: "Hình thoi",
    category: "Hình phẳng",
    formulaSummary: "Chu vi: $C = 4a$, Diện tích: $S = \\frac{1}{2} d_1 d_2$",
    definition: "Hình thoi là tứ giác có 4 cạnh bằng nhau.",
    properties: [
      "Bốn cạnh bằng nhau ($AB = BC = CD = DA = a$).",
      "Hai đường chéo vuông góc với nhau tại trung điểm của mỗi đường ($d_1 \\perp d_2$).",
      "Các góc đối bằng nhau."
    ],
    realWorldExample: "Cánh diều truyền thống, lưới B40, họa tiết trên khăn thổ cẩm.",
    defaultParams: { d1: 10, d2: 8, a: 6 },
    paramRanges: {
      d1: { min: 2, max: 18, step: 0.5, label: "Đường chéo d₁" },
      d2: { min: 2, max: 18, step: 0.5, label: "Đường chéo d₂" },
      a: { min: 2, max: 15, step: 0.5, label: "Cạnh a" }
    }
  },
  {
    id: "trapezoid",
    name: "Hình thang cân",
    category: "Hình phẳng",
    formulaSummary: "Chu vi: $C = a + b + 2c$, Diện tích: $S = \\frac{a + b}{2} \\cdot h$",
    definition: "Hình thang cân là hình thang có hai góc kề một đáy bằng nhau.",
    properties: [
      "Hai cạnh đáy song song ($AB \\parallel CD$).",
      "Hai cạnh bên bằng nhau ($AD = BC = c$).",
      "Hai đường chéo bằng nhau ($AC = BD$)."
    ],
    realWorldExample: "Mặt cắt chậu cây cảnh, bậc thang, đập thủy điện nhìn từ mặt cắt.",
    defaultParams: { a: 12, b: 7, c: 5, h: 5 },
    paramRanges: {
      a: { min: 6, max: 20, step: 0.5, label: "Đáy lớn a" },
      b: { min: 2, max: 14, step: 0.5, label: "Đáy nhỏ b" },
      c: { min: 3, max: 12, step: 0.5, label: "Cạnh bên c" },
      h: { min: 2, max: 10, step: 0.5, label: "Chiều cao h" }
    }
  },
  {
    id: "prism_6",
    name: "Hình lăng trụ đứng / Hộp chữ nhật",
    category: "Hình không gian",
    formulaSummary: "Diện tích xung quanh: $S_{xq} = P_{đáy} \\cdot h$, Thể tích: $V = S_{đáy} \\cdot h$",
    definition: "Hình lăng trụ đứng có các mặt latéral là hình chữ nhật và hai đáy là hai đa giác bằng nhau.",
    properties: [
      "Các cạnh bên song song và bằng nhau, vuông góc với hai mặt phẳng đáy.",
      "Mặt bên là các hình chữ nhật.",
      "Thể tích bằng diện tích đáy nhân với chiều cao ($V = S_{đáy} \\cdot h$)."
    ],
    realWorldExample: "Hộp sữa tươi, thùng carton, tòa nhà cao tầng dạng hình hộp.",
    defaultParams: { length: 9, width: 6, height: 7 },
    paramRanges: {
      length: { min: 3, max: 15, step: 0.5, label: "Chiều dài đáy" },
      width: { min: 2, max: 12, step: 0.5, label: "Chiều rộng đáy" },
      height: { min: 3, max: 18, step: 0.5, label: "Chiều cao h" }
    }
  }
];

const GRADE_7_SHAPES: ShapeDef[] = [
  {
    id: "triangle_7",
    name: "Tam giác (Tổng 3 góc & Cạnh)",
    category: "Hình phẳng",
    formulaSummary: "Tổng 3 góc: $\\hat{A} + \\hat{B} + \\hat{C} = 180^\\circ$, Chu vi: $C = a + b + c$, Diện tích: $S = \\frac{1}{2} a \\cdot h_a$",
    definition: "Tam giác là hình gồm 3 đoạn thẳng nối 3 điểm không thẳng hàng.",
    properties: [
      "Tổng số đo ba góc trong của một tam giác luôn bằng $180^\\circ$.",
      "Bất đẳng thức tam giác: Tổng độ dài hai cạnh bất kỳ luôn lớn hơn cạnh còn lại ($a + b > c$).",
      "Góc ngoài của tam giác bằng tổng hai góc trong không kề với nó."
    ],
    realWorldExample: "Khung mái nhà chữ A, cầu giàn thép, biển báo giao thông hình tam giác.",
    defaultParams: { a: 9, b: 8, c: 7, h: 6 },
    paramRanges: {
      a: { min: 4, max: 15, step: 0.5, label: "Cạnh đáy a" },
      b: { min: 4, max: 15, step: 0.5, label: "Cạnh bên b" },
      c: { min: 4, max: 15, step: 0.5, label: "Cạnh bên c" },
      h: { min: 2, max: 12, step: 0.5, label: "Chiều cao h_a" }
    }
  },
  {
    id: "pythagoras",
    name: "Định lý Pythagore (Tam giác vuông)",
    category: "Hình phẳng",
    formulaSummary: "Hệ thức: $a^2 + b^2 = c^2$ (với $c$ là cạnh huyền)",
    definition: "Trong một tam giác vuông, bình phương độ dài cạnh huyền bằng tổng bình phương độ dài hai cạnh góc vuông.",
    properties: [
      "Nếu tam giác có $a^2 + b^2 = c^2$ thì tam giác đó là tam giác vuông (Định lý đảo).",
      "Cho phép tính nhanh cạnh huyền khi biết 2 cạnh góc vuông và ngược lại."
    ],
    realWorldExample: "Thang dựa vào tường, định vị khoảng cách GPS, đo đạc xây dựng.",
    defaultParams: { a: 6, b: 8 },
    paramRanges: {
      a: { min: 1, max: 15, step: 0.5, label: "Cạnh góc vuông a" },
      b: { min: 1, max: 15, step: 0.5, label: "Cạnh góc vuông b" }
    }
  },
  {
    id: "cylinder_7",
    name: "Hình trụ tròn xoay",
    category: "Hình không gian",
    formulaSummary: "$S_{xq} = 2\\pi r h$, $S_{tp} = 2\\pi r h + 2\\pi r^2$, $V = \\pi r^2 h$",
    definition: "Khi quay hình chữ nhật một vòng xung quanh một cạnh cố định ta được hình trụ.",
    properties: [
      "Hai đáy là hai hình tròn bằng nhau và song song với nhau.",
      "Mặt xung quanh khi trải phẳng là một hình chữ nhật có chiều dài bằng chu vi đáy $2\\pi r$ và chiều cao bằng chiều cao hình trụ $h$."
    ],
    realWorldExample: "Lon nước ngọt Coca/Pepsi, ống nước PVC, bể chứa nước hình trụ, trụ cầu.",
    defaultParams: { r: 5, h: 10 },
    paramRanges: {
      r: { min: 1, max: 10, step: 0.5, label: "Bán kính đáy r" },
      h: { min: 2, max: 18, step: 0.5, label: "Chiều cao h" }
    }
  }
];

const GRADE_8_SHAPES: ShapeDef[] = [
  {
    id: "thales_8",
    name: "Định lý Thalès trong tam giác",
    category: "Hình học định lượng",
    formulaSummary: "Nếu $DE \\parallel BC$ thì $\\frac{AD}{AB} = \\frac{AE}{AC}$",
    definition: "Nếu một đường thẳng song song với một cạnh của tam giác và cắt hai cạnh còn lại thì nó định ra trên hai cạnh đó những đoạn thẳng tương ứng tỉ lệ.",
    properties: [
      "Ứng dụng tính độ dài đoạn thẳng chưa biết trong tam giác.",
      "Hệ quả: Tạo ra tam giác mới đồng dạng với tam giác đã cho."
    ],
    realWorldExample: "Đo chiều cao cây cao bằng bóng nắng, sơ đồ tỉ lệ bản đồ, thiết kế kiến trúc.",
    defaultParams: { ab: 12, ad: 5, ac: 14 },
    paramRanges: {
      ab: { min: 5, max: 20, step: 0.5, label: "Độ dài AB" },
      ad: { min: 1, max: 15, step: 0.5, label: "Độ dài AD" },
      ac: { min: 5, max: 20, step: 0.5, label: "Độ dài AC" }
    }
  },
  {
    id: "similar_triangle",
    name: "Tam giác đồng dạng",
    category: "Hình phẳng",
    formulaSummary: "Tỉ số đồng dạng $k = \\frac{a'}{a}$, Tỉ số diện tích: $\\frac{S'}{S} = k^2$",
    definition: "Hai tam giác gọi là đồng dạng nếu chúng có các góc tương ứng bằng nhau và các cạnh tương ứng tỉ lệ.",
    properties: [
      "Các trường hợp đồng dạng: c-c-c, c-g-c, g-g.",
      "Tỉ số chu vi bằng tỉ số đồng dạng $k$, tỉ số diện tích bằng bình phương tỉ số đồng dạng $k^2$."
    ],
    realWorldExample: "Bản đồ thu nhỏ, máy chiếu phóng to hình ảnh, mô hình kiến trúc thu nhỏ.",
    defaultParams: { k: 1.5, baseArea: 24 },
    paramRanges: {
      k: { min: 0.5, max: 3, step: 0.1, label: "Tỉ số đồng dạng k" },
      baseArea: { min: 10, max: 50, step: 1, label: "Diện tích S ban đầu" }
    }
  },
  {
    id: "regular_pyramid",
    name: "Hình chóp tứ giác đều / tam giác đều",
    category: "Hình không gian",
    formulaSummary: "$S_{xq} = \\frac{1}{2} P_{đáy} \\cdot d$, $V = \\frac{1}{3} S_{đáy} \\cdot h$",
    definition: "Hình chóp đều có đáy là đa giác đều và các mặt bên là các tam giác cân bằng nhau có chung đỉnh.",
    properties: [
      "Đáy là đa giác đều (tam giác đều hoặc hình vuông).",
      "Chân đường cao trùng với tâm của đa giác đáy.",
      "Thể tích bằng một phần ba diện tích đáy nhân với chiều cao ($V = \\frac{1}{3} S_{đáy} \\cdot h$)."
    ],
    realWorldExample: "Kim tự tháp Ai Cập, mái nhà chóp nhọn, đèn lồng trang trí.",
    defaultParams: { a: 8, h: 9, d: 9.5 },
    paramRanges: {
      a: { min: 2, max: 12, step: 0.5, label: "Cạnh đáy a" },
      h: { min: 3, max: 15, step: 0.5, label: "Chiều cao chóp h" },
      d: { min: 3, max: 16, step: 0.5, label: "Trung đoạn d" }
    }
  }
];

const GRADE_9_SHAPES: ShapeDef[] = [
  {
    id: "trig_right_triangle",
    name: "Hệ thức lượng trong tam giác vuông",
    category: "Hình học định lượng",
    formulaSummary: "$b^2 = a \\cdot b', \\, h^2 = b' \\cdot c', \\, bc = ah$",
    definition: "Các hệ thức liên hệ giữa cạnh góc vuông, cạnh huyền, hình chiếu và đường cao trong tam giác vuông.",
    properties: [
      "Bình phương mỗi cạnh góc vuông bằng tích của cạnh huyền và hình chiếu của cạnh góc vuông đó trên cạnh huyền.",
      "Bình phương đường cao ứng với cạnh huyền bằng tích hai hình chiếu."
    ],
    realWorldExample: "Đo đạc trắc địa, tính khoảng cách không tới được, thiết kế mái vòm.",
    defaultParams: { b: 8, c: 10 },
    paramRanges: {
      b: { min: 2, max: 15, step: 0.5, label: "Cạnh góc vuông b" },
      c: { min: 2, max: 15, step: 0.5, label: "Cạnh góc vuông c" }
    }
  },
  {
    id: "circle_geometry",
    name: "Đường tròn & Góc ở tâm / Góc nội tiếp",
    category: "Hình học đường tròn",
    formulaSummary: "Độ dài cung: $l = \\frac{\\pi R \\alpha}{180^\\circ}$, Diện tích quạt: $S_{quạt} = \\frac{\\pi R^2 \\alpha}{360^\\circ}$",
    definition: "Đường tròn tâm O bán kính R là tập hợp các điểm cách O một khoảng bằng R.",
    properties: [
      "Góc nội tiếp bằng nửa góc ở tâm chắn cùng một cung.",
      "Góc nội tiếp chắn nửa đường tròn là góc vuông ($90^\\circ$)."
    ],
    realWorldExample: "Bánh xe đạp, đồng hồ treo tường, compa, vòng quay mặt trời.",
    defaultParams: { R: 7, alpha: 60 },
    paramRanges: {
      R: { min: 2, max: 12, step: 0.5, label: "Bán kính R" },
      alpha: { min: 10, max: 180, step: 5, label: "Số đo góc ở tâm α (°)" }
    }
  },
  {
    id: "cone_sphere_9",
    name: "Hình nón, Hình trụ & Hình cầu",
    category: "Hình không gian",
    formulaSummary: "Hình nón: $S_{xq} = \\pi r l, V = \\frac{1}{3} \\pi r^2 h$. Hình cầu: $V = \\frac{4}{3} \\pi R^3$",
    definition: "Các khối tròn xoay đặc biệt trong không gian chương trình Toán 9.",
    properties: [
      "Hình nón có một mặt đáy là hình tròn và mặt xung quanh nón.",
      "Hình cầu có mọi điểm trên bề mặt cách đều tâm O một khoảng R."
    ],
    realWorldExample: "Nón lá Việt Nam, quả bóng đá, kem ốc quế, Trái Đất hình cầu.",
    defaultParams: { r: 6, h: 12, R: 7 },
    paramRanges: {
      r: { min: 2, max: 10, step: 0.5, label: "Bán kính đáy nón r" },
      h: { min: 3, max: 18, step: 0.5, label: "Chiều cao nón h" },
      R: { min: 2, max: 12, step: 0.5, label: "Bán kính hình cầu R" }
    }
  }
];

export const Grades6To9GeometryHub: React.FC = () => {
  const [activeGradeTab, setActiveGradeTab] = useState<"grade6" | "grade7" | "grade8" | "grade9_geom" | "grade9_func">("grade6");
  const [selectedShapeId, setSelectedShapeId] = useState<string>("rectangle");
  
  const [shapeParams, setShapeParams] = useState<Record<string, number>>({
    a: 10, b: 6, h: 5, d1: 10, d2: 8, c: 5, length: 9, width: 6, height: 7,
    ab: 12, ad: 5, ac: 14, k: 1.5, baseArea: 24, alpha: 60, R: 7
  });

  const [activeModalTab, setActiveModalTab] = useState<"def" | "props" | "example">("def");

  // Canvas dragging, virtual ruler & virtual compass state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [rulerPos, setRulerPos] = useState<{ x: number; y: number; angle: number }>({ x: 0, y: 90, angle: 0 });
  const [rulerInteraction, setRulerInteraction] = useState<"none" | "move" | "rotate">("none");
  const [rulerDragStart, setRulerDragStart] = useState<{ mouseX: number; mouseY: number; initX: number; initY: number; initAngle: number }>({ mouseX: 0, mouseY: 0, initX: 0, initY: 0, initAngle: 0 });
  
  // Virtual compass state
  const [showCompass, setShowCompass] = useState<boolean>(false);
  const [compassPivot, setCompassPivot] = useState<{ x: number; y: number }>({ x: -40, y: 30 });
  const [compassPencil, setCompassPencil] = useState<{ x: number; y: number }>({ x: 60, y: 30 });
  const [compassInteraction, setCompassInteraction] = useState<"none" | "pivot" | "pencil" | "body">("none");
  const [compassDragStart, setCompassDragStart] = useState<{ mouseX: number; mouseY: number; initPivotX: number; initPivotY: number; initPencilX: number; initPencilY: number }>({ mouseX: 0, mouseY: 0, initPivotX: 0, initPivotY: 0, initPencilX: 0, initPencilY: 0 });
  const [tracedArcs, setTracedArcs] = useState<Array<{ pivotX: number; pivotY: number; radius: number }>>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentShapesList = useMemo(() => {
    if (activeGradeTab === "grade6") return GRADE_6_SHAPES;
    if (activeGradeTab === "grade7") return GRADE_7_SHAPES;
    if (activeGradeTab === "grade8") return GRADE_8_SHAPES;
    if (activeGradeTab === "grade9_geom") return GRADE_9_SHAPES;
    return [];
  }, [activeGradeTab]);

  const currentShape = useMemo(() => {
    const found = currentShapesList.find(s => s.id === selectedShapeId);
    if (found) return found;
    return currentShapesList[0] || GRADE_6_SHAPES[0];
  }, [currentShapesList, selectedShapeId]);

  useEffect(() => {
    if (currentShape) {
      setShapeParams(currentShape.defaultParams);
    }
  }, [selectedShapeId, activeGradeTab]);

  const handleParamChange = (key: string, val: number) => {
    setShapeParams(prev => ({ ...prev, [key]: val }));
  };

  // Real-time calculations
  const calculatedResults = useMemo(() => {
    const p = shapeParams;
    switch (selectedShapeId) {
      case "rectangle": {
        const a = p.a || 1;
        const b = p.b || 1;
        const C = 2 * (a + b);
        const S = a * b;
        const diagonal = Math.sqrt(a * a + b * b);
        return {
          lines: [
            `Chu vi $C = 2(${a} + ${b}) = ${C.toFixed(2)}$`,
            `Diện tích $S = ${a} \\times ${b} = ${S.toFixed(2)}$`,
            `Đường chéo $d = \\sqrt{${a}^2 + ${b}^2} = ${diagonal.toFixed(2)}$`
          ]
        };
      }
      case "square": {
        const a = p.a || 1;
        const C = 4 * a;
        const S = a * a;
        const diagonal = a * Math.sqrt(2);
        return {
          lines: [
            `Chu vi $C = 4 \\times ${a} = ${C.toFixed(2)}$`,
            `Diện tích $S = ${a}^2 = ${S.toFixed(2)}$`,
            `Đường chéo $d = ${a}\\sqrt{2} \\approx ${diagonal.toFixed(2)}$`
          ]
        };
      }
      case "parallelogram": {
        const a = p.a || 1;
        const b = p.b || 1;
        const h = p.h || 1;
        const C = 2 * (a + b);
        const S = a * h;
        return {
          lines: [
            `Chu vi $C = 2(${a} + ${b}) = ${C.toFixed(2)}$`,
            `Diện tích $S = a \\times h = ${a} \\times ${h} = ${S.toFixed(2)}$`
          ]
        };
      }
      case "rhombus": {
        const a = p.a || 1;
        const d1 = p.d1 || 1;
        const d2 = p.d2 || 1;
        const C = 4 * a;
        const S = 0.5 * d1 * d2;
        return {
          lines: [
            `Chu vi $C = 4 \\times ${a} = ${C.toFixed(2)}$`,
            `Diện tích $S = \\frac{1}{2} d_1 d_2 = \\frac{1}{2} \\times ${d1} \\times ${d2} = ${S.toFixed(2)}$`
          ]
        };
      }
      case "trapezoid": {
        const a = p.a || 1;
        const b = p.b || 1;
        const c = p.c || 1;
        const h = p.h || 1;
        const C = a + b + 2 * c;
        const S = ((a + b) / 2) * h;
        return {
          lines: [
            `Chu vi $C = a + b + 2c = ${a} + ${b} + 2(${c}) = ${C.toFixed(2)}$`,
            `Diện tích $S = \\frac{a + b}{2} \\times h = \\frac{${a} + ${b}}{2} \\times ${h} = ${S.toFixed(2)}$`
          ]
        };
      }
      case "prism_6": {
        const l = p.length || 1;
        const w = p.width || 1;
        const h = p.height || 1;
        const S_day = l * w;
        const P_day = 2 * (l + w);
        const S_xq = P_day * h;
        const V = S_day * h;
        return {
          lines: [
            `Diện tích đáy $S_{đáy} = ${l} \\times ${w} = ${S_day.toFixed(2)}$`,
            `Diện tích xung quanh $S_{xq} = P_{đáy} \\times h = ${P_day} \\times ${h} = ${S_xq.toFixed(2)}$`,
            `Thể tích $V = S_{đáy} \\times h = ${S_day} \\times ${h} = ${V.toFixed(2)}$`
          ]
        };
      }
      case "triangle_7": {
        const a = p.a || 1;
        const b = p.b || 1;
        const c = p.c || 1;
        const h = p.h || 1;
        const C = a + b + c;
        const S = 0.5 * a * h;
        return {
          lines: [
            `Chu vi $C = a + b + c = ${a} + ${b} + ${c} = ${C.toFixed(2)}$`,
            `Diện tích $S = \\frac{1}{2} a \\cdot h_a = \\frac{1}{2} \\times ${a} \\times ${h} = ${S.toFixed(2)}$`
          ]
        };
      }
      case "pythagoras": {
        const a = p.a || 1;
        const b = p.b || 1;
        const c = Math.sqrt(a * a + b * b);
        const S = 0.5 * a * b;
        return {
          lines: [
            `Cạnh huyền $c = \\sqrt{a^2 + b^2} = \\sqrt{${a}^2 + ${b}^2} = ${c.toFixed(2)}$`,
            `Diện tích tam giác vuông $S = \\frac{1}{2} a \\cdot b = \\frac{1}{2} \\times ${a} \\times ${b} = ${S.toFixed(2)}$`
          ]
        };
      }
      case "cylinder_7": {
        const r = p.r || 1;
        const h = p.h || 1;
        const S_xq = 2 * Math.PI * r * h;
        const V = Math.PI * r * r * h;
        return {
          lines: [
            `Diện tích xung quanh $S_{xq} = 2\\pi r h \\approx ${S_xq.toFixed(2)}$`,
            `Thể tích $V = \\pi r^2 h \\approx ${V.toFixed(2)}$`
          ]
        };
      }
      case "thales_8": {
        const ab = p.ab || 12;
        const ad = p.ad || 5;
        const ac = p.ac || 14;
        const db = ab - ad;
        const ae = (ad / ab) * ac;
        return {
          lines: [
            `Đoạn $DB = AB - AD = ${db.toFixed(2)}$`,
            `Đoạn $AE = \\frac{AD}{AB} \\times AC = ${ae.toFixed(2)}$`
          ]
        };
      }
      case "similar_triangle": {
        const k = p.k || 1.5;
        const s = p.baseArea || 24;
        const s2 = s * k * k;
        return {
          lines: [
            `Tỉ số đồng dạng $k = ${k}$`,
            `Diện tích mới $S' = S \\times k^2 = ${s} \\times ${(k * k).toFixed(2)} = ${s2.toFixed(2)}$`
          ]
        };
      }
      case "regular_pyramid": {
        const a = p.a || 8;
        const h = p.h || 9;
        const d = p.d || 9.5;
        const S_day = a * a;
        const P_day = 4 * a;
        const S_xq = 0.5 * P_day * d;
        const V = (1 / 3) * S_day * h;
        return {
          lines: [
            `Diện tích đáy $S_{đáy} = ${S_day.toFixed(2)}$`,
            `Diện tích xung quanh $S_{xq} = ${S_xq.toFixed(2)}$`,
            `Thể tích $V = ${V.toFixed(2)}$`
          ]
        };
      }
      case "trig_right_triangle": {
        const b = p.b || 8;
        const c = p.c || 10;
        const a = Math.sqrt(b * b + c * c);
        const h = (b * c) / a;
        return {
          lines: [
            `Cạnh huyền $a = ${a.toFixed(2)}$`,
            `Đường cao $h = ${h.toFixed(2)}$`
          ]
        };
      }
      case "circle_geometry": {
        const R = p.R || 7;
        const alpha = p.alpha || 60;
        const l = (Math.PI * R * alpha) / 180;
        const S_quat = (Math.PI * R * R * alpha) / 360;
        return {
          lines: [
            `Độ dài cung tròn $l \\approx ${l.toFixed(2)}$`,
            `Diện tích quạt $S_{quạt} \\approx ${S_quat.toFixed(2)}$`
          ]
        };
      }
      case "cone_sphere_9": {
        const r = p.r || 6;
        const h = p.h || 12;
        const R = p.R || 7;
        const V_cone = (1 / 3) * Math.PI * r * r * h;
        const V_sphere = (4 / 3) * Math.PI * Math.pow(R, 3);
        return {
          lines: [
            `Thể tích nón $V_{nón} \\approx ${V_cone.toFixed(2)}$`,
            `Thể tích cầu $V_{cầu} \\approx ${V_sphere.toFixed(2)}$`
          ]
        };
      }
      default:
        return { lines: ["Tính toán trực quan theo thời gian thực."] };
    }
  }, [selectedShapeId, shapeParams]);

  // Canvas drawing & interactive dragging logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw background grid
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < canvasWidth; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
    }

    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);

    const p = shapeParams;
    ctx.strokeStyle = "#2563eb";
    ctx.fillStyle = "rgba(37, 99, 235, 0.12)";
    ctx.lineWidth = 3;

    if (selectedShapeId === "rectangle" || selectedShapeId === "square") {
      const isSq = selectedShapeId === "square";
      const w = (p.a || 10) * 14;
      const h = (isSq ? p.a || 8 : p.b || 6) * 14;
      
      // Fill and Stroke rectangle
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill();
      ctx.stroke();

      // Right angle square marks at all 4 corners (8x8px)
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      const sz = 10;
      // Top-Left (A)
      ctx.strokeRect(-w / 2, -h / 2, sz, sz);
      // Top-Right (B)
      ctx.strokeRect(w / 2 - sz, -h / 2, sz, sz);
      // Bottom-Right (C)
      ctx.strokeRect(w / 2 - sz, h / 2 - sz, sz, sz);
      // Bottom-Left (D)
      ctx.strokeRect(-w / 2, h / 2 - sz, sz, sz);

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("A", -w / 2 - 6, -h / 2 - 4);
      ctx.textAlign = "left";
      ctx.fillText("B", w / 2 + 6, -h / 2 - 4);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("C", w / 2 + 6, h / 2 + 4);
      ctx.textAlign = "right";
      ctx.fillText("D", -w / 2 - 6, h / 2 + 4);

      // Dimension labels
      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`a = ${p.a || 10}`, 0, h / 2 + 8);
      if (!isSq) {
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`b = ${p.b || 6}`, w / 2 + 10, 0);
      }

      // Draggable handle at bottom-right corner (C)
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (selectedShapeId === "parallelogram") {
      const a = (p.a || 10) * 13;
      const h = (p.h || 5) * 14;
      const skew = 40;
      
      const ax = -a / 2 - skew / 2;
      const ay = -h / 2;
      const bx = a / 2 - skew / 2;
      const by = -h / 2;
      const cx = a / 2 + skew / 2;
      const cy = h / 2;
      const dx = -a / 2 + skew / 2;
      const dy = h / 2;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.lineTo(dx, dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dashed altitude AH perpendicular to CD (extended if needed)
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax, cy);
      ctx.stroke();
      
      // Bottom dashed baseline if H is outside
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax, cy);
      ctx.lineTo(dx, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right angle mark at H
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ax, cy - 9, 9, 9);

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("A", ax - 8, ay - 6);
      ctx.textAlign = "left";
      ctx.fillText("B", bx + 8, by - 6);
      ctx.fillText("C", cx + 8, cy + 14);
      ctx.textAlign = "right";
      ctx.fillText("D", dx - 8, dy + 14);
      ctx.fillText("H", ax - 6, cy + 14);

      // Dimension labels
      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`a = ${p.a || 10}`, 0, cy + 14);
      ctx.fillStyle = "#dc2626";
      ctx.fillText(`h = ${p.h || 5}`, ax - 16, 0);

      // Draggable handle at vertex C
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (selectedShapeId === "rhombus") {
      const d1 = (p.d1 || 10) * 13;
      const d2 = (p.d2 || 8) * 13;
      
      const ax = 0, ay = -d2 / 2;
      const bx = d1 / 2, by = 0;
      const cx = 0, cy = d2 / 2;
      const dx = -d1 / 2, dy = 0;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.lineTo(dx, dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Perpendicular Diagonals (dashed)
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(dx, 0);
      ctx.lineTo(bx, 0);
      ctx.moveTo(0, ay);
      ctx.lineTo(0, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right-angle square mark at center O
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, -9, 9, 9);

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("A", ax, ay - 8);
      ctx.textAlign = "left";
      ctx.fillText("B", bx + 10, by + 4);
      ctx.textAlign = "center";
      ctx.fillText("C", cx, cy + 18);
      ctx.textAlign = "right";
      ctx.fillText("D", dx - 10, dy + 4);
      ctx.fillText("O", -6, -6);

      // Dimension indicators
      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`d₁ = ${p.d1 || 10}`, d1 / 4, 14);
      ctx.fillText(`d₂ = ${p.d2 || 8}`, -22, -d2 / 4);

      // Draggable handles at B (resizes d1) and C (resizes d2)
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (selectedShapeId === "trapezoid") {
      const a = (p.a || 12) * 12; // bottom base
      const b = (p.b || 7) * 12;  // top base
      const h = (p.h || 5) * 14;  // height
      const topHalf = b / 2;
      const bottomHalf = a / 2;

      const ax = -topHalf, ay = -h / 2;
      const bx = topHalf, by = -h / 2;
      const cx = bottomHalf, cy = h / 2;
      const dx = -bottomHalf, dy = h / 2;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.lineTo(dx, dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Altitude AH and BK dashed
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax, cy);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right angle square marks at H and K
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(ax, cy - 8, 8, 8);
      ctx.strokeRect(bx - 8, cy - 8, 8, 8);

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("A", ax - 6, ay - 6);
      ctx.textAlign = "left";
      ctx.fillText("B", bx + 6, by - 6);
      ctx.fillText("C", cx + 8, cy + 14);
      ctx.textAlign = "right";
      ctx.fillText("D", dx - 8, dy + 14);
      ctx.fillText("H", ax - 4, cy + 14);
      ctx.textAlign = "left";
      ctx.fillText("K", bx + 4, cy + 14);

      // Dimension labels
      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Đáy nhỏ b = ${p.b || 7}`, 0, ay - 8);
      ctx.fillText(`Đáy lớn a = ${p.a || 12}`, 0, cy + 18);
      ctx.fillStyle = "#dc2626";
      ctx.fillText(`h = ${p.h || 5}`, ax - 16, 0);

      // Draggable handle at vertex C
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (selectedShapeId === "prism_6") {
      const l = (p.length || 9) * 11;
      const w = (p.width || 6) * 8;
      const h = (p.height || 7) * 10;
      
      const dx = w * 0.7;
      const dy = -w * 0.5;

      const fAx = -l / 2, fAy = h / 2;
      const fBx = l / 2, fBy = h / 2;
      const fCx = l / 2, fCy = -h / 2;
      const fDx = -l / 2, fDy = -h / 2;

      const bAx = fAx + dx, bAy = fAy + dy;
      const bBx = fBx + dx, bBy = fBy + dy;
      const bCx = fCx + dx, bCy = fCy + dy;
      const bDx = fDx + dx, bDy = fDy + dy;

      // Hidden edges (Dashed - SGK Standard)
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(fAx, fAy); ctx.lineTo(bAx, bAy);
      ctx.moveTo(bAx, bAy); ctx.lineTo(bBx, bBy);
      ctx.moveTo(bAx, bAy); ctx.lineTo(bDx, bDy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Visible edges (Solid - SGK Standard)
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.5;
      ctx.fillStyle = "rgba(37, 99, 235, 0.08)";
      
      // Front face
      ctx.fillRect(fAx, fDy, l, h);
      ctx.strokeRect(fAx, fDy, l, h);

      // Other visible faces
      ctx.beginPath();
      // Top face
      ctx.moveTo(fDx, fDy); ctx.lineTo(bDx, bDy);
      ctx.lineTo(bCx, bCy); ctx.lineTo(fCx, fCy);
      // Right face
      ctx.moveTo(fBx, fBy); ctx.lineTo(bBx, bBy);
      ctx.lineTo(bCx, bCy); ctx.lineTo(fCx, fCy);
      ctx.stroke();

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("A", fAx - 6, fAy + 10);
      ctx.textAlign = "left";
      ctx.fillText("B", fBx + 6, fBy + 10);
      ctx.fillText("B'", fCx + 6, fCy - 6);
      ctx.textAlign = "right";
      ctx.fillText("A'", fDx - 6, fDy - 6);
      ctx.textAlign = "left";
      ctx.fillText("C", bBx + 6, bBy + 6);
      ctx.fillText("C'", bCx + 6, bCy - 6);
      ctx.textAlign = "right";
      ctx.fillText("D'", bDx - 6, bDy - 6);

      // Dimension labels
      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Dài a = ${p.length || 9}`, 0, fAy + 14);
      ctx.textAlign = "left";
      ctx.fillText(`Rộng b = ${p.width || 6}`, fBx + dx / 2 + 6, fBy + dy / 2 + 10);
      ctx.textAlign = "right";
      ctx.fillText(`Cao h = ${p.height || 7}`, fAx - 8, 0);

      // Drag handle at B'
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(fCx, fCy, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (selectedShapeId === "triangle_7") {
      const a = (p.a || 9) * 14;
      const h = (p.h || 6) * 14;
      
      const bx = -a / 2, by = h / 2;
      const cx = a / 2, cy = h / 2;
      const ax = -a * 0.15, ay = -h / 2;
      const hx = ax, hy = cy;

      // Triangle body
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Altitude AH
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right angle square at H
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx, hy - 9, 9, 9);

      // Angle Arcs at A, B, C
      ctx.lineWidth = 2;
      // Angle B (Blue)
      ctx.strokeStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(bx, by, 22, -Math.PI * 0.35, 0);
      ctx.stroke();
      // Angle C (Green)
      ctx.strokeStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(cx, cy, 22, Math.PI, Math.PI * 1.35);
      ctx.stroke();
      // Angle A (Amber)
      ctx.strokeStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(ax, ay, 20, Math.PI * 0.25, Math.PI * 0.65);
      ctx.stroke();

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("A", ax, ay - 10);
      ctx.textAlign = "right";
      ctx.fillText("B", bx - 8, by + 14);
      ctx.textAlign = "left";
      ctx.fillText("C", cx + 8, cy + 14);
      ctx.textAlign = "center";
      ctx.fillText("H", hx, hy + 16);

      // Dimensions
      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Cạnh đáy a = ${p.a || 9}`, 0, cy + 20);
      ctx.fillStyle = "#dc2626";
      ctx.fillText(`h = ${p.h || 6}`, hx - 16, 0);

      // Formula badge
      ctx.fillStyle = "#4338ca";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("Tổng 3 góc: Â + B̂ + Ĉ = 180°", 0, ay - 24);

      // Drag handle at A
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(ax, ay, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (selectedShapeId === "pythagoras") {
      // Textbook Pythagoras with true right triangle and 3 attached squares
      const a = (p.a || 6) * 11;
      const b = (p.b || 8) * 11;
      
      const ax = -20, ay = 30; // Vertex A (Right angle)
      const bx = ax + a, by = ay; // Vertex B
      const cx = ax, cy = ay - b; // Vertex C

      // Square on leg AB (downward)
      ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5;
      ctx.fillRect(ax, ay, a, a);
      ctx.strokeRect(ax, ay, a, a);
      ctx.fillStyle = "#1d4ed8";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`S₁ = a² = ${((p.a || 6) ** 2).toFixed(1)}`, ax + a / 2, ay + a / 2 + 4);

      // Square on leg AC (leftward)
      ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
      ctx.strokeStyle = "#059669";
      ctx.fillRect(ax - b, cy, b, b);
      ctx.strokeRect(ax - b, cy, b, b);
      ctx.fillStyle = "#047857";
      ctx.fillText(`S₂ = b² = ${((p.b || 8) ** 2).toFixed(1)}`, ax - b / 2, cy + b / 2 + 4);

      // Right Triangle ABC
      ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right angle square mark at A
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ax, ay - 10, 10, 10);

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("A (90°)", ax - 6, ay + 14);
      ctx.textAlign = "left";
      ctx.fillText("B", bx + 6, by + 14);
      ctx.textAlign = "right";
      ctx.fillText("C", cx - 6, cy - 6);

      // Hypotenuse label
      const hypVal = Math.sqrt((p.a || 6) ** 2 + (p.b || 8) ** 2);
      ctx.fillStyle = "#b45309";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Cạnh huyền c = ${hypVal.toFixed(2)}`, (bx + cx) / 2 + 20, (by + cy) / 2 - 10);

      // Theorem banner
      ctx.fillStyle = "#4338ca";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(`Định lý Pythagore: a² + b² = c² (${((p.a || 6) ** 2).toFixed(0)} + ${((p.b || 8) ** 2).toFixed(0)} = ${(hypVal ** 2).toFixed(0)})`, 0, ay + a + 24);

      // Drag handles at B and C
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (selectedShapeId === "cylinder_7") {
      const r = (p.r || 5) * 14;
      const h = (p.h || 10) * 12;
      const elH = r * 0.35;

      // Bottom ellipse: Front half solid, back half dashed (SGK standard)
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(0, h / 2, r, elH, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, h / 2, r, elH, 0, 0, Math.PI);
      ctx.stroke();

      // Vertical side generators (Solid)
      ctx.beginPath();
      ctx.moveTo(-r, -h / 2); ctx.lineTo(-r, h / 2);
      ctx.moveTo(r, -h / 2); ctx.lineTo(r, h / 2);
      ctx.stroke();

      // Top ellipse (Fully Solid)
      ctx.beginPath();
      ctx.ellipse(0, -h / 2, r, elH, 0, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(37, 99, 235, 0.12)";
      ctx.fill();
      ctx.stroke();

      // Center axis OO' (Dashed)
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, -h / 2); ctx.lineTo(0, h / 2);
      // Top radius OA
      ctx.moveTo(0, -h / 2); ctx.lineTo(r, -h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center points
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(0, -h / 2, 4, 0, 2 * Math.PI);
      ctx.arc(0, h / 2, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("O", -6, -h / 2 - 4);
      ctx.fillText("O'", -6, h / 2 + 16);
      ctx.textAlign = "left";
      ctx.fillText("A", r + 6, -h / 2 + 4);

      // Dimension labels
      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`r = ${p.r || 5}`, r / 2, -h / 2 - 8);
      ctx.textAlign = "left";
      ctx.fillText(`h = ${p.h || 10}`, r + 10, 0);

      // Drag handle at top radius A
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(r, -h / 2, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (selectedShapeId === "thales_8") {
      const ax = 0, ay = -90;
      const bx = -120, by = 80;
      const cx = 120, cy = 80;

      const t = Math.max(0.2, Math.min(0.8, (p.ad || 5) / (p.ab || 12)));
      const dx = ax + t * (bx - ax);
      const dy = ay + t * (by - ay);
      const ex = ax + t * (cx - ax);
      const ey = ay + t * (cy - ay);

      // Triangle ABC
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Parallel line DE (Red)
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Parallel arrow markers on DE and BC (SGK convention)
      ctx.fillStyle = "#dc2626";
      const drawArrow = (x: number, y: number) => {
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 5);
        ctx.lineTo(x + 5, y);
        ctx.lineTo(x - 5, y + 5);
        ctx.stroke();
      };
      drawArrow((dx + ex) / 2, dy);
      drawArrow((bx + cx) / 2, by);

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("A", ax, ay - 10);
      ctx.textAlign = "right";
      ctx.fillText("B", bx - 10, by + 14);
      ctx.textAlign = "left";
      ctx.fillText("C", cx + 10, cy + 14);
      ctx.textAlign = "right";
      ctx.fillText("D", dx - 8, dy + 4);
      ctx.textAlign = "left";
      ctx.fillText("E", ex + 8, ey + 4);

      // Ratio banner
      ctx.fillStyle = "#4338ca";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Định lý Thalès: DE ∥ BC ⟹ AD/AB = AE/AC = ${(t).toFixed(2)}`, 0, cy + 24);

      // Draggable handle at D
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(dx, dy, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (selectedShapeId === "similar_triangle") {
      const k = p.k || 1.5;
      
      // Original triangle ABC on the left
      ctx.save();
      ctx.translate(-85, 10);
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(-55, 45);
      ctx.lineTo(55, 45);
      ctx.closePath();
      ctx.fillStyle = "rgba(37, 99, 235, 0.1)";
      ctx.fill();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vertex labels for ABC
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("A", 0, -58);
      ctx.fillText("B", -65, 50);
      ctx.fillText("C", 65, 50);
      ctx.fillText("ΔABC (Gốc)", 0, 68);
      ctx.restore();

      // Scaled triangle A'B'C' on the right
      ctx.save();
      ctx.translate(85, 10);
      const sc = k * 0.75;
      ctx.scale(sc, sc);
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(-55, 45);
      ctx.lineTo(55, 45);
      ctx.closePath();
      ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
      ctx.fill();
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 2.5 / sc;
      ctx.stroke();

      // Vertex labels for A'B'C'
      ctx.fillStyle = "#065f46";
      ctx.font = `bold ${Math.max(10, 13 / sc)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("A'", 0, -58);
      ctx.fillText("B'", -65, 50);
      ctx.fillText("C'", 65, 50);
      ctx.restore();

      // Comparison banner
      ctx.fillStyle = "#4338ca";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`ΔA'B'C' ∽ ΔABC (Tỉ số k = ${k.toFixed(1)}, Tỉ số diện tích S'/S = k² = ${(k * k).toFixed(2)})`, 0, 100);

      // Drag handle at scaled A'
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(85, 10 - 50 * sc, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (selectedShapeId === "regular_pyramid") {
      // Textbook Oblique Projection for Regular Pyramid S.ABCD
      const a = (p.a || 8) * 11;
      const h = (p.h || 9) * 11;
      
      const ox = 0, oy = 35;
      const sx = ox, sy = oy - h;

      // Base ABCD vertices in oblique perspective
      const ax = ox - a * 0.4, ay = oy - a * 0.3; // Back-left
      const dx = ox + a * 0.6, dy = oy - a * 0.3; // Back-right
      const bx = ox - a * 0.7, by = oy + a * 0.3; // Front-left
      const cx = ox + a * 0.3, cy = oy + a * 0.3; // Front-right

      // Midpoint of CD (for apothem SM)
      const mx = (cx + dx) / 2, my = (cy + dy) / 2;

      // Hidden lines (Dashed - SGK Standard): AB, AD, SA, SO, AC, BD
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.moveTo(ax, ay); ctx.lineTo(dx, dy);
      ctx.moveTo(sx, sy); ctx.lineTo(ax, ay);
      ctx.moveTo(ax, ay); ctx.lineTo(cx, cy);
      ctx.moveTo(bx, by); ctx.lineTo(dx, dy);
      ctx.stroke();

      // Altitude SO (Dashed Red)
      ctx.strokeStyle = "#dc2626";
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(ox, oy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right angle square at O
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(ox, oy - 8, 8, 8);

      // Visible lines (Solid): BC, CD, SB, SC, SD, SM
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(cx, cy); ctx.lineTo(dx, dy);
      ctx.moveTo(sx, sy); ctx.lineTo(bx, by);
      ctx.moveTo(sx, sy); ctx.lineTo(cx, cy);
      ctx.moveTo(sx, sy); ctx.lineTo(dx, dy);
      ctx.stroke();

      // Apothem SM (Trung đoạn - Orange)
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(mx, my);
      ctx.stroke();
      // Right angle mark at M
      ctx.strokeStyle = "#d97706";
      ctx.strokeRect(mx - 6, my - 6, 6, 6);

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("S (Đỉnh)", sx, sy - 10);
      ctx.textAlign = "right";
      ctx.fillText("A", ax - 6, ay - 4);
      ctx.fillText("B", bx - 8, by + 12);
      ctx.textAlign = "left";
      ctx.fillText("C", cx + 8, cy + 12);
      ctx.fillText("D", dx + 6, dy - 4);
      ctx.fillText("O", ox - 8, oy + 4);
      ctx.fillText("M", mx + 6, my + 4);

      // Dimension labels
      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`h = ${p.h || 9}`, ox - 8, oy - h / 2);
      ctx.fillStyle = "#d97706";
      ctx.textAlign = "left";
      ctx.fillText(`d = ${p.d || 9.5}`, (sx + mx) / 2 + 8, (sy + my) / 2);

      // Drag handles at S and C
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (selectedShapeId === "trig_right_triangle") {
      // Textbook Right Triangle ABC at A with Altitude AH
      // AH = h, HB = c', HC = b', AH^2 = b' * c'
      const hVal = 85;
      const cPrime = 50;
      const bPrime = (hVal * hVal) / cPrime; // ~144.5
      
      const offsetX = (cPrime - bPrime) / 2;
      const hx = offsetX, hy = 40;
      const ax = offsetX, ay = hy - hVal;
      const bx = hx - cPrime, by = hy;
      const cx = hx + bPrime, cy = hy;

      // Triangle body
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Altitude AH (Dashed Red)
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right angle marks at A and H
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx, hy - 9, 9, 9);

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("A (90°)", ax, ay - 10);
      ctx.textAlign = "right";
      ctx.fillText("B", bx - 8, by + 14);
      ctx.textAlign = "left";
      ctx.fillText("C", cx + 8, cy + 14);
      ctx.textAlign = "center";
      ctx.fillText("H", hx, hy + 16);

      // Dimension labels
      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("h", ax - 10, (ay + hy) / 2);
      ctx.fillStyle = "#2563eb";
      ctx.fillText("c'", (bx + hx) / 2, hy + 14);
      ctx.fillText("b'", (hx + cx) / 2, hy + 14);
      ctx.fillText("c", (ax + bx) / 2 - 12, (ay + by) / 2);
      ctx.fillText("b", (ax + cx) / 2 + 12, (ay + cy) / 2);

      // Formula Callouts
      ctx.fillStyle = "#4338ca";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("b² = a·b'  |  c² = a·c'  |  h² = b'·c'  |  b·c = a·h", 0, hy + 38);

      // Drag handles at A and C
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(ax, ay, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (selectedShapeId === "circle_geometry") {
      const R = (p.R || 7) * 14;
      const alphaDeg = p.alpha || 60;
      const alphaRad = (alphaDeg * Math.PI) / 180;

      // Circle (O, R)
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Center O
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Points A, B (subtending angle alpha) and M (inscribed)
      const angA = -alphaRad / 2;
      const angB = alphaRad / 2;
      const angM = Math.PI; // point on opposite side

      const ax = R * Math.cos(angA), ay = R * Math.sin(angA);
      const bx = R * Math.cos(angB), by = R * Math.sin(angB);
      const mx = R * Math.cos(angM), my = R * Math.sin(angM);

      // Radii OA, OB (Central Angle)
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(ax, ay);
      ctx.moveTo(0, 0); ctx.lineTo(bx, by);
      ctx.stroke();

      // Central angle arc
      ctx.beginPath();
      ctx.arc(0, 0, 24, angA, angB);
      ctx.stroke();

      // Chords MA, MB (Inscribed Angle)
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx, my); ctx.lineTo(ax, ay);
      ctx.moveTo(mx, my); ctx.lineTo(bx, by);
      ctx.stroke();

      // Inscribed angle arc
      ctx.beginPath();
      ctx.arc(mx, my, 28, -alphaRad * 0.25, alphaRad * 0.25);
      ctx.stroke();

      // Vertex labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("O", 8, -6);
      ctx.fillText("A", ax + 8, ay);
      ctx.fillText("B", bx + 8, by);
      ctx.textAlign = "right";
      ctx.fillText("M", mx - 8, my + 4);

      // Angle badges
      ctx.fillStyle = "#d97706";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`α = ${alphaDeg}°`, 28, 4);

      ctx.fillStyle = "#059669";
      ctx.fillText(`α/2 = ${(alphaDeg / 2).toFixed(1)}°`, mx + 32, my - 6);

      // Theorem banner
      ctx.fillStyle = "#4338ca";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Định lý: Góc nội tiếp AM̂B = 1/2 Góc ở tâm AÔB (${(alphaDeg / 2).toFixed(1)}° = 1/2 × ${alphaDeg}°)`, 0, R + 26);

      // Drag handles at A and B
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(ax, ay, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (selectedShapeId === "cone_sphere_9") {
      // Left: Hình nón (Cone)
      ctx.save();
      ctx.translate(-85, 0);
      const rCone = (p.r || 6) * 7.5;
      const hCone = (p.h || 12) * 8.5;
      const elH = rCone * 0.35;

      // Base: back dashed, front solid
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(0, hCone / 2, rCone, elH, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, hCone / 2, rCone, elH, 0, 0, Math.PI);
      ctx.stroke();

      // Generators
      ctx.beginPath();
      ctx.moveTo(0, -hCone / 2); ctx.lineTo(-rCone, hCone / 2);
      ctx.moveTo(0, -hCone / 2); ctx.lineTo(rCone, hCone / 2);
      ctx.stroke();

      // Axis SO and radius OA (Dashed)
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, -hCone / 2); ctx.lineTo(0, hCone / 2);
      ctx.moveTo(0, hCone / 2); ctx.lineTo(rCone, hCone / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right angle square at O
      ctx.strokeStyle = "#dc2626";
      ctx.strokeRect(0, hCone / 2 - 7, 7, 7);

      // Labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("S", 0, -hCone / 2 - 8);
      ctx.fillText("O", -8, hCone / 2 + 14);
      ctx.fillText("A", rCone + 8, hCone / 2 + 4);
      ctx.fillText("Hình nón: V = 1/3 π r² h", 0, hCone / 2 + 30);
      ctx.restore();

      // Right: Hình cầu (Sphere)
      ctx.save();
      ctx.translate(85, 0);
      const rSph = (p.R || 7) * 8.5;

      // Outer circle
      ctx.beginPath();
      ctx.arc(0, 0, rSph, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
      ctx.fill();
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Equator ellipse: front solid, back dashed
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(0, 0, rSph, rSph * 0.35, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "#059669";
      ctx.beginPath();
      ctx.ellipse(0, 0, rSph, rSph * 0.35, 0, 0, Math.PI);
      ctx.stroke();

      // Center O and radius OM
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(rSph, 0);
      ctx.stroke();
      ctx.setLineDash([]);

      // Labels
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("O", -8, -6);
      ctx.fillText("M", rSph + 8, 4);
      ctx.fillText("Hình cầu: V = 4/3 π R³", 0, rSph + 30);
      ctx.restore();

      // Drag handles
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(-85 + rCone, hCone / 2, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(85 + rSph, 0, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(currentShape.name, 0, 5);
    }

    ctx.restore();

    // Draw Virtual Ruler if enabled (in canvas coordinate space)
    if (showRuler) {
      ctx.save();
      ctx.translate(canvasWidth / 2 + rulerPos.x, canvasHeight / 2 + rulerPos.y);
      ctx.rotate(rulerPos.angle);

      const rWidth = 300;
      const rHeight = 40;

      ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = "rgba(254, 243, 199, 0.95)";
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-rWidth / 2, -rHeight / 2, rWidth, rHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#78350f";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const cmPixels = 20;
      for (let cm = 0; cm <= 15; cm++) {
        const xPos = -rWidth / 2 + 15 + cm * cmPixels;
        if (xPos > rWidth / 2 - 10) break;

        ctx.beginPath();
        ctx.moveTo(xPos, -rHeight / 2);
        ctx.lineTo(xPos, -rHeight / 2 + 12);
        ctx.strokeStyle = "#92400e";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillText(cm.toString(), xPos, -rHeight / 2 + 20);

        if (cm < 15) {
          for (let mm = 1; mm < 5; mm++) {
            const mxPos = xPos + mm * (cmPixels / 5);
            ctx.beginPath();
            ctx.moveTo(mxPos, -rHeight / 2);
            ctx.lineTo(mxPos, -rHeight / 2 + 6);
            ctx.strokeStyle = "#b45309";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Center move handle
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Right rotation handle
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(rWidth / 2 - 15, 0, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }

    // Draw Virtual Compass if enabled (in canvas coordinate space)
    if (showCompass) {
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);

      // Draw traced arcs
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      tracedArcs.forEach(arc => {
        ctx.beginPath();
        ctx.arc(arc.pivotX, arc.pivotY, arc.radius, 0, 2 * Math.PI);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      const mx = (compassPivot.x + compassPencil.x) / 2;
      const my = (compassPivot.y + compassPencil.y) / 2;
      const dx = compassPencil.x - compassPivot.x;
      const dy = compassPencil.y - compassPivot.y;
      const dist = Math.hypot(dx, dy);
      const compassHeight = Math.max(70, 150 - dist * 0.4);
      const nx = -dy / (dist || 1);
      const ny = dx / (dist || 1);
      const hingeX = mx + nx * compassHeight;
      const hingeY = my + ny * compassHeight;

      // Draw legs
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(compassPivot.x, compassPivot.y);
      ctx.lineTo(hingeX, hingeY);
      ctx.lineTo(compassPencil.x, compassPencil.y);
      ctx.stroke();

      // Hinge knob
      ctx.fillStyle = "#f1f5f9";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hingeX, hingeY, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Pivot point (needle)
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(compassPivot.x, compassPivot.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pencil tip
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(compassPencil.x, compassPencil.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Radius line preview
      ctx.strokeStyle = "rgba(79, 70, 229, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(compassPivot.x, compassPivot.y);
      ctx.lineTo(compassPencil.x, compassPencil.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Radius label
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`R = ${Math.round(dist)}px`, mx, my - 10);

      ctx.restore();
    }
  }, [selectedShapeId, shapeParams, currentShape, showRuler, rulerPos, showCompass, compassPivot, compassPencil, tracedArcs]);

  // Mouse drag & virtual ruler / compass interaction handlers on canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    if (showCompass) {
      const distPivot = Math.hypot(mouseX - compassPivot.x, mouseY - compassPivot.y);
      if (distPivot < 18) {
        setCompassInteraction("pivot");
        setCompassDragStart({ mouseX, mouseY, initPivotX: compassPivot.x, initPivotY: compassPivot.y, initPencilX: compassPencil.x, initPencilY: compassPencil.y });
        return;
      }

      const distPencil = Math.hypot(mouseX - compassPencil.x, mouseY - compassPencil.y);
      if (distPencil < 18) {
        setCompassInteraction("pencil");
        setCompassDragStart({ mouseX, mouseY, initPivotX: compassPivot.x, initPivotY: compassPivot.y, initPencilX: compassPencil.x, initPencilY: compassPencil.y });
        return;
      }
    }

    if (showRuler) {
      const dx = mouseX - rulerPos.x;
      const dy = mouseY - rulerPos.y;
      const cos = Math.cos(-rulerPos.angle);
      const sin = Math.sin(-rulerPos.angle);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      const rWidth = 300;
      const rHeight = 40;

      const distToRotate = Math.hypot(localX - (rWidth / 2 - 15), localY);
      if (distToRotate < 18) {
        setRulerInteraction("rotate");
        setRulerDragStart({ mouseX, mouseY, initX: rulerPos.x, initY: rulerPos.y, initAngle: rulerPos.angle });
        return;
      }

      if (localX >= -rWidth / 2 && localX <= rWidth / 2 && localY >= -rHeight / 2 && localY <= rHeight / 2) {
        setRulerInteraction("move");
        setRulerDragStart({ mouseX, mouseY, initX: rulerPos.x, initY: rulerPos.y, initAngle: rulerPos.angle });
        return;
      }
    }

    setIsDragging(true);
    updateParamsFromMouse(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    if (compassInteraction === "pivot") {
      const deltaX = mouseX - compassDragStart.mouseX;
      const deltaY = mouseY - compassDragStart.mouseY;
      const pDx = compassDragStart.initPencilX - compassDragStart.initPivotX;
      const pDy = compassDragStart.initPencilY - compassDragStart.initPivotY;
      setCompassPivot({ x: compassDragStart.initPivotX + deltaX, y: compassDragStart.initPivotY + deltaY });
      setCompassPencil({ x: compassDragStart.initPivotX + deltaX + pDx, y: compassDragStart.initPivotY + deltaY + pDy });
      return;
    }

    if (compassInteraction === "pencil") {
      setCompassPencil({ x: mouseX, y: mouseY });
      return;
    }

    if (rulerInteraction === "move") {
      const deltaX = mouseX - rulerDragStart.mouseX;
      const deltaY = mouseY - rulerDragStart.mouseY;
      setRulerPos(prev => ({
        ...prev,
        x: rulerDragStart.initX + deltaX,
        y: rulerDragStart.initY + deltaY
      }));
      return;
    }

    if (rulerInteraction === "rotate") {
      const currentAngle = Math.atan2(mouseY - rulerPos.y, mouseX - rulerPos.x);
      const startAngle = Math.atan2(rulerDragStart.mouseY - rulerPos.y, rulerDragStart.mouseX - rulerPos.x);
      setRulerPos(prev => ({
        ...prev,
        angle: rulerDragStart.initAngle + (currentAngle - startAngle)
      }));
      return;
    }

    if (!isDragging) return;
    updateParamsFromMouse(e);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setRulerInteraction("none");
    setCompassInteraction("none");
  };

  const updateParamsFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    if (selectedShapeId === "rectangle" || selectedShapeId === "square") {
      const newA = Math.round(Math.max(3, Math.min(20, Math.abs(x) / 7)) * 2) / 2;
      const newB = Math.round(Math.max(3, Math.min(15, Math.abs(y) / 7)) * 2) / 2;
      if (selectedShapeId === "square") {
        setShapeParams(prev => ({ ...prev, a: newA }));
      } else {
        setShapeParams(prev => ({ ...prev, a: newA, b: newB }));
      }
    } else if (selectedShapeId === "parallelogram") {
      const newA = Math.round(Math.max(4, Math.min(18, Math.abs(x) / 6.5)) * 2) / 2;
      const newH = Math.round(Math.max(2, Math.min(12, Math.abs(y) / 7)) * 2) / 2;
      setShapeParams(prev => ({ ...prev, a: newA, h: newH }));
    } else if (selectedShapeId === "rhombus") {
      const newD1 = Math.round(Math.max(3, Math.min(18, Math.abs(x) / 6.5)) * 2) / 2;
      const newD2 = Math.round(Math.max(3, Math.min(18, Math.abs(y) / 6.5)) * 2) / 2;
      setShapeParams(prev => ({ ...prev, d1: newD1, d2: newD2 }));
    } else if (selectedShapeId === "trapezoid") {
      const newA = Math.round(Math.max(6, Math.min(20, Math.abs(x) / 6)) * 2) / 2;
      const newH = Math.round(Math.max(2, Math.min(10, Math.abs(y) / 7)) * 2) / 2;
      setShapeParams(prev => ({ ...prev, a: newA, h: newH }));
    } else if (selectedShapeId === "prism_6") {
      const newL = Math.round(Math.max(4, Math.min(15, Math.abs(x) / 6)) * 2) / 2;
      const newH = Math.round(Math.max(3, Math.min(18, Math.abs(y) / 5)) * 2) / 2;
      setShapeParams(prev => ({ ...prev, length: newL, height: newH }));
    } else if (selectedShapeId === "triangle_7") {
      const newA = Math.round(Math.max(4, Math.min(15, Math.abs(x) / 7)) * 2) / 2;
      const newH = Math.round(Math.max(2, Math.min(12, Math.abs(y) / 7)) * 2) / 2;
      setShapeParams(prev => ({ ...prev, a: newA, h: newH }));
    } else if (selectedShapeId === "pythagoras") {
      const newA = Math.round(Math.max(2, Math.min(15, Math.abs(x + 20) / 11)) * 2) / 2;
      const newB = Math.round(Math.max(2, Math.min(15, Math.abs(30 - y) / 11)) * 2) / 2;
      setShapeParams(prev => ({ ...prev, a: newA, b: newB }));
    } else if (selectedShapeId === "cylinder_7") {
      const newR = Math.round(Math.max(2, Math.min(10, Math.abs(x) / 14)) * 2) / 2;
      const newH = Math.round(Math.max(3, Math.min(18, Math.abs(y) / 6)) * 2) / 2;
      setShapeParams(prev => ({ ...prev, r: newR, h: newH }));
    } else if (selectedShapeId === "thales_8") {
      const t = Math.max(0.2, Math.min(0.8, (y + 90) / 170));
      const newAD = Math.round(t * (prev => prev.ab || 12) * 2) / 2 || Math.round(t * 12 * 2) / 2;
      setShapeParams(prev => ({ ...prev, ad: Math.max(1, Math.min(prev.ab || 12, Math.round(t * 12 * 2) / 2)) }));
    } else if (selectedShapeId === "similar_triangle") {
      const newK = Math.max(0.5, Math.min(3, Math.round((Math.abs(x - 85) / 50) * 10) / 10));
      setShapeParams(prev => ({ ...prev, k: newK }));
    } else if (selectedShapeId === "regular_pyramid") {
      const newA = Math.round(Math.max(3, Math.min(12, Math.abs(x) / 7)) * 2) / 2;
      const newH = Math.round(Math.max(3, Math.min(15, Math.abs(35 - y) / 11)) * 2) / 2;
      setShapeParams(prev => ({ ...prev, a: newA, h: newH }));
    } else if (selectedShapeId === "trig_right_triangle") {
      const newB = Math.round(Math.max(3, Math.min(15, Math.abs(x) / 10)) * 2) / 2;
      const newC = Math.round(Math.max(3, Math.min(15, Math.abs(y) / 8)) * 2) / 2;
      setShapeParams(prev => ({ ...prev, b: newB, c: newC }));
    } else if (selectedShapeId === "circle_geometry") {
      const dist = Math.sqrt(x * x + y * y);
      const newR = Math.round(Math.max(3, Math.min(12, dist / 14)) * 2) / 2;
      const angleDeg = Math.round(Math.abs(Math.atan2(y, x) * 180 / Math.PI) * 2);
      const clampedAlpha = Math.max(15, Math.min(170, angleDeg));
      setShapeParams(prev => ({ ...prev, R: newR, alpha: clampedAlpha }));
    } else if (selectedShapeId === "cone_sphere_9") {
      if (x < 0) {
        const newR = Math.round(Math.max(2, Math.min(10, Math.abs(x + 85) / 7.5)) * 2) / 2;
        const newH = Math.round(Math.max(3, Math.min(18, Math.abs(y) / 8.5)) * 2) / 2;
        setShapeParams(prev => ({ ...prev, r: newR, h: newH }));
      } else {
        const newR = Math.round(Math.max(2, Math.min(12, Math.abs(x - 85) / 8.5)) * 2) / 2;
        setShapeParams(prev => ({ ...prev, R: newR }));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Grade Level Selector Tabs for Geometry */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Phòng Thí nghiệm Hình học & Đồ thị Tương tác (Lớp 6 đến Lớp 9)
            </h2>
            <p className="text-xs text-slate-500">
              Kéo thả trực tiếp điểm điều khiển trên Canvas hoặc dùng thanh trượt để thay đổi kích thước
            </p>
          </div>
        </div>

        {/* Grade Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1 overflow-x-auto">
          {[
            { id: "grade6", label: "Lớp 6 (Hình học)" },
            { id: "grade7", label: "Lớp 7 (Hình học)" },
            { id: "grade8", label: "Lớp 8 (Hình học)" },
            { id: "grade9_geom", label: "Lớp 9 (Hình học)" },
            { id: "grade9_func", label: "Lớp 9 (Đồ thị & KSHS)" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveGradeTab(tab.id as any);
                if (tab.id !== "grade9_func") {
                  const first = (
                    tab.id === "grade6" ? GRADE_6_SHAPES :
                    tab.id === "grade7" ? GRADE_7_SHAPES :
                    tab.id === "grade8" ? GRADE_8_SHAPES : GRADE_9_SHAPES
                  )[0];
                  if (first) setSelectedShapeId(first.id);
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeGradeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* If Grade 9 Functions selected, render Grade 9 Graphing */}
      {activeGradeTab === "grade9_func" ? (
        <Grade9Graphing />
      ) : (
        /* Geometry Simulator Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Shape Selection & Sliders */}
          <div className="lg:col-span-5 space-y-4">
            {/* Shape Category Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Danh mục hình học {activeGradeTab.replace("grade", "Lớp ").replace("_geom", "")}:
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {currentShapesList.map(shape => (
                  <button
                    key={shape.id}
                    onClick={() => setSelectedShapeId(shape.id)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedShapeId === shape.id
                        ? "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-2xs font-bold ring-1 ring-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs font-bold line-clamp-1">{shape.name}</span>
                    <span className="text-[10px] text-slate-500 mt-1">{shape.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter Sliders Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{currentShape.name}</h3>
                  <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                    <MathSpan content={currentShape.formulaSummary} />
                  </p>
                </div>
                <button
                  onClick={() => setShapeParams(currentShape.defaultParams)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  title="Đặt lại thông số mặc định"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Sliders */}
              <div className="space-y-3">
                {Object.entries(currentShape.paramRanges).map(([key, range]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{range.label}</span>
                      <span className="font-mono text-indigo-600 font-bold">
                        {shapeParams[key] ?? currentShape.defaultParams[key] ?? 5}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      value={shapeParams[key] ?? currentShape.defaultParams[key] ?? 5}
                      onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* Real-time Calculation Box */}
              <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100 space-y-2">
                <div className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span>Kết quả tính toán thời gian thực:</span>
                </div>
                <div className="space-y-1 text-xs text-slate-800 font-medium">
                  {calculatedResults.lines.map((line, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <MathSpan content={line} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Canvas Simulation with Draggable Control Points & Theory Modals */}
          <div className="lg:col-span-7 space-y-4">
            {/* HTML5 Canvas Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Mô phỏng Hình vẽ Trực quan (HTML5 Canvas Tương tác)</span>
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowRuler(!showRuler)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      showRuler ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    title="Bật/Tắt thước đo ảo trên canvas"
                  >
                    📏 Thước: {showRuler ? "Bật" : "Tắt"}
                  </button>
                  <button
                    onClick={() => setShowCompass(!showCompass)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      showCompass ? "bg-indigo-100 text-indigo-800 border border-indigo-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    title="Bật/Tắt compa ảo trên canvas"
                  >
                    🧭 Compa: {showCompass ? "Bật" : "Tắt"}
                  </button>
                  {showCompass && (
                    <>
                      <button
                        onClick={() => {
                          const r = Math.hypot(compassPencil.x - compassPivot.x, compassPencil.y - compassPivot.y);
                          setTracedArcs(prev => [...prev, { pivotX: compassPivot.x, pivotY: compassPivot.y, radius: r }]);
                        }}
                        className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 cursor-pointer"
                        title="Vẽ đường tròn bằng bán kính compa hiện tại"
                      >
                        🖊️ Vẽ tròn
                      </button>
                      <button
                        onClick={() => setTracedArcs([])}
                        className="p-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-[11px]"
                        title="Xóa các đường vẽ compa"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setRulerPos({ x: 0, y: 90, angle: 0 })}
                    className="p-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-[11px] cursor-pointer"
                    title="Đặt lại vị trí thước"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={380}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  className="w-full h-[380px] object-contain bg-white"
                />
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                💡 Mẹo: Nhấn và kéo chuột trực tiếp lên chấm đỏ ở góc/đỉnh hình vẽ để phóng to/thu nhỏ kích thước trực tiếp trên canvas.
              </p>
            </div>

            {/* Theory Tabs: Định nghĩa, Tính chất, Ví dụ thực tế */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold w-fit">
                <button
                  onClick={() => setActiveModalTab("def")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeModalTab === "def" ? "bg-white text-indigo-800 shadow-2xs font-bold" : "text-slate-600"
                  }`}
                >
                  Xem định nghĩa
                </button>
                <button
                  onClick={() => setActiveModalTab("props")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeModalTab === "props" ? "bg-white text-indigo-800 shadow-2xs font-bold" : "text-slate-600"
                  }`}
                >
                  Tính chất
                </button>
                <button
                  onClick={() => setActiveModalTab("example")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeModalTab === "example" ? "bg-white text-indigo-800 shadow-2xs font-bold" : "text-slate-600"
                  }`}
                >
                  Ví dụ thực tế
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-800 space-y-2">
                {activeModalTab === "def" && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">📖 Định nghĩa chuẩn SGK:</h4>
                    <p className="leading-relaxed">{currentShape.definition}</p>
                  </div>
                )}
                {activeModalTab === "props" && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">✨ Tính chất hình học:</h4>
                    <ul className="space-y-1.5 list-disc list-inside">
                      {currentShape.properties.map((prop, idx) => (
                        <li key={idx} className="leading-relaxed">{prop}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {activeModalTab === "example" && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">🌍 Ứng dụng & Ví dụ thực tế:</h4>
                    <p className="leading-relaxed">{currentShape.realWorldExample}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
