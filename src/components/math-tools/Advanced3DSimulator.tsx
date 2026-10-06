import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Box, Sparkles, Play, Pause, RotateCcw, Camera, Copy, Check, 
  Scissors, Layers, Sliders, Search, ArrowRight, Zap, RefreshCw, 
  TrendingUp, Compass, Award, Upload, Image as ImageIcon, HelpCircle, FileText
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// ============================================================================
// TYPES & PRESET DEFINITIONS
// ============================================================================

export type PresetCategory = 'optimization' | 'shortest_path' | 'netting' | 'dissection';

export interface PresetModel {
  id: string;
  name: string;
  category: PresetCategory;
  categoryName: string;
  badge: string;
  description: string;
  formulaTex: string;
  variableName: string;
  unit: string;
  defaultA: number;
  defaultB: number;
  defaultH: number;
  defaultX: number;
  minX: number;
  maxX: number;
  stepX: number;
  calcValue: (a: number, b: number, h: number, x: number) => { val: number; optX: number; optVal: number; label: string };
}

export const PRESET_MODELS: PresetModel[] = [
  // --------------------------------------------------------------------------
  // 1. TỐI ƯU - CỰC TRỊ THỰC TẾ (TOÁN 12)
  // --------------------------------------------------------------------------
  {
    id: 'box_open',
    name: '1.1. Tấm bìa cắt 4 góc tạo hộp không nắp',
    category: 'optimization',
    categoryName: 'Tối ưu - Cực trị Thực tế',
    badge: 'Toán 12 - Cực trị V(x)',
    description: 'Tấm bìa rectangular a × b, cắt 4 hình vuông góc x × x rồi gấp thành hộp không nắp có thể tích V(x) lớn nhất.',
    formulaTex: 'V(x) = (a - 2x)(b - 2x)x',
    variableName: 'Cạnh vuông cắt x',
    unit: 'cm',
    defaultA: 60,
    defaultB: 40,
    defaultH: 0,
    defaultX: 7.85,
    minX: 0.5,
    maxX: 19.5,
    stepX: 0.1,
    calcValue: (a, b, _h, x) => {
      const val = (a - 2 * x) * (b - 2 * x) * x;
      const optX = ((a + b) - Math.sqrt(a * a - a * b + b * b)) / 6;
      const optVal = (a - 2 * optX) * (b - 2 * optX) * optX;
      return { val, optX, optVal, label: `Thể tích V(x) = ${val.toFixed(1)} cm³` };
    }
  },
  {
    id: 'box_closed',
    name: '1.2. Hộp có nắp đậy liền từ tấm bìa',
    category: 'optimization',
    categoryName: 'Tối ưu - Cực trị Thực tế',
    badge: 'Toán 12 - Ứng dụng đạo hàm',
    description: 'Tấm bìa a × b chia thành mặt đáy, mặt bên và nắp đậy gấp liền.',
    formulaTex: 'V(x) = \\frac{(a - 2x)(b - 3x)x}{2}',
    variableName: 'Độ rộng mép gấp x',
    unit: 'cm',
    defaultA: 60,
    defaultB: 45,
    defaultH: 0,
    defaultX: 5.5,
    minX: 0.5,
    maxX: 14.5,
    stepX: 0.1,
    calcValue: (a, b, _h, x) => {
      const val = ((a - 2 * x) * (b - 3 * x) * x) / 2;
      const optX = (3 * a + 2 * b - Math.sqrt(9 * a * a - 6 * a * b + 4 * b * b)) / 18;
      const optVal = ((a - 2 * optX) * (b - 3 * optX) * optX) / 2;
      return { val, optX, optVal, label: `Thể tích V(x) = ${val.toFixed(1)} cm³` };
    }
  },
  {
    id: 'triangular_prism_open',
    name: '1.3. Tam giác đều cắt 3 góc gấp lăng trụ',
    category: 'optimization',
    categoryName: 'Tối ưu - Cực trị Thực tế',
    badge: 'Toán 12 - Lăng trụ không nắp',
    description: 'Miếng tôn tam giác đều cạnh a, cắt 3 góc để gấp thành lăng trụ tam giác đều không nắp.',
    formulaTex: 'V(x) = \\frac{\\sqrt{3}}{4} (a - 2x\\sqrt{3})^2 x',
    variableName: 'Độ sâu cắt x',
    unit: 'cm',
    defaultA: 60,
    defaultB: 0,
    defaultH: 0,
    defaultX: 5.77,
    minX: 0.5,
    maxX: 16.0,
    stepX: 0.1,
    calcValue: (a, _b, _h, x) => {
      const side = Math.max(0, a - 2 * x * Math.sqrt(3));
      const val = (Math.sqrt(3) / 4) * side * side * x;
      const optX = a / (6 * Math.sqrt(3));
      const optSide = a - 2 * optX * Math.sqrt(3);
      const optVal = (Math.sqrt(3) / 4) * optSide * optSide * optX;
      return { val, optX, optVal, label: `Thể tích V(x) = ${val.toFixed(1)} cm³` };
    }
  },
  {
    id: 'cone_cut_sector',
    name: '1.4. Cắt quạt tròn cuộn hình nón',
    category: 'optimization',
    categoryName: 'Tối ưu - Cực trị Thực tế',
    badge: 'Khối tròn xoay',
    description: 'Từ tấm tôn tròn bán kính R, cắt bỏ quạt góc α rồi cuộn mép lại thành hình nón.',
    formulaTex: 'V(\\alpha) = \\frac{1}{3} \\pi R^3 \\left(1 - \\frac{\\alpha}{360}\\right)^2 \\sqrt{1 - \\left(1 - \\frac{\\alpha}{360}\\right)^2}',
    variableName: 'Góc cắt α',
    unit: 'độ (°)',
    defaultA: 30, // R = 30cm
    defaultB: 0,
    defaultH: 0,
    defaultX: 66.06,
    minX: 1,
    maxX: 180,
    stepX: 0.5,
    calcValue: (R, _b, _h, alpha) => {
      const frac = 1 - alpha / 360;
      const r = R * frac;
      const h = Math.sqrt(Math.max(0, R * R - r * r));
      const val = (1 / 3) * Math.PI * r * r * h;
      const optFrac = Math.sqrt(2 / 3);
      const optAlpha = 360 * (1 - optFrac);
      const optR = R * optFrac;
      const optH = Math.sqrt(R * R - optR * optR);
      const optVal = (1 / 3) * Math.PI * optR * optR * optH;
      return { val, optX: optAlpha, optVal, label: `Thể tích nón V(α) = ${val.toFixed(1)} cm³` };
    }
  },
  {
    id: 'water_trough',
    name: '1.5. Làm máng nước / Rãnh dẫn nước',
    category: 'optimization',
    categoryName: 'Tối ưu - Cực trị Thực tế',
    badge: 'Mặt cắt ngang max',
    description: 'Gập 2 mép tấm tôn phẳng bề rộng W lên góc θ thành hình thang cân có diện tích mặt cắt S(θ) lớn nhất.',
    formulaTex: 'S(\\theta) = w \\sin\\theta (W - 2w + w \\cos\\theta)',
    variableName: 'Góc gập θ',
    unit: 'độ (°)',
    defaultA: 90, // W = 90cm
    defaultB: 30, // w = 30cm
    defaultH: 0,
    defaultX: 60,
    minX: 5,
    maxX: 85,
    stepX: 1,
    calcValue: (W, w, _h, thetaDeg) => {
      const rad = (thetaDeg * Math.PI) / 180;
      const base = W - 2 * w;
      const val = w * Math.sin(rad) * (base + w * Math.cos(rad));
      const optX = 60;
      const optRad = (60 * Math.PI) / 180;
      const optVal = w * Math.sin(optRad) * (base + w * Math.cos(optRad));
      return { val, optX, optVal, label: `Diện tích mặt cắt S(θ) = ${val.toFixed(1)} cm²` };
    }
  },
  {
    id: 'can_cylinder',
    name: '1.6. Vỏ lon / Thùng phuy (Tiết kiệm tôn)',
    category: 'optimization',
    categoryName: 'Tối ưu - Cực trị Thực tế',
    badge: 'S_tp nhỏ nhất',
    description: 'Tối ưu diện tích toàn phần Stp của vỏ lon hình trụ khi thể tích V cố định (Tỉ số h/R = 2).',
    formulaTex: 'S_{tp}(R) = 2\\pi R^2 + \\frac{2V}{R}',
    variableName: 'Bán kính đáy R',
    unit: 'cm',
    defaultA: 1000, // V = 1000cm³
    defaultB: 0,
    defaultH: 0,
    defaultX: 5.42,
    minX: 2.0,
    maxX: 12.0,
    stepX: 0.1,
    calcValue: (V, _b, _h, R) => {
      const val = 2 * Math.PI * R * R + (2 * V) / R;
      const optX = Math.cbrt(V / (2 * Math.PI));
      const optVal = 2 * Math.PI * optX * optX + (2 * V) / optX;
      return { val, optX, optVal, label: `Diện tích toàn phần S_tp(R) = ${val.toFixed(1)} cm²` };
    }
  },

  // --------------------------------------------------------------------------
  // 2. NHÓM "ĐƯỜNG ĐI NGẮN NHẤT" (SHORTEST PATH - CON KIẾN BÒ)
  // --------------------------------------------------------------------------
  {
    id: 'path_cuboid',
    name: '2.1. Con kiến bò trên khối hộp chữ nhật',
    category: 'shortest_path',
    categoryName: 'Đường đi ngắn nhất',
    badge: 'Toán 8, 9, 12 & ĐGNL',
    description: 'Kiến bò từ đỉnh đáy A đến đỉnh đối diện C\' trên bề mặt hộp. Trải phẳng các mặt bên để thấy đường đi d min.',
    formulaTex: 'd = \\sqrt{(a + b)^2 + h^2}',
    variableName: 'Tiến trình trải 2D',
    unit: '%',
    defaultA: 40,
    defaultB: 30,
    defaultH: 50,
    defaultX: 100, // 100% là trải phẳng 2D
    minX: 0,
    maxX: 100,
    stepX: 1,
    calcValue: (a, b, h, _x) => {
      const val = Math.sqrt((a + b) * (a + b) + h * h);
      return { val, optX: 100, optVal: val, label: `Độ dài đường đi ngắn nhất d = ${val.toFixed(1)} cm` };
    }
  },
  {
    id: 'path_cylinder',
    name: '2.2. Con kiến bò quấn quanh hình trụ',
    category: 'shortest_path',
    categoryName: 'Đường đi ngắn nhất',
    badge: 'Quấn quanh thân trụ',
    description: 'Bò từ mép đáy dưới quấn quanh thân 1 vòng lên mép đáy trên. Trải mặt xung quanh thành hình chữ nhật 2πR × h.',
    formulaTex: 'd = \\sqrt{(2\\pi R)^2 + h^2}',
    variableName: 'Tiến trình mở trụ',
    unit: '%',
    defaultA: 15, // R = 15cm
    defaultB: 0,
    defaultH: 40, // h = 40cm
    defaultX: 100,
    minX: 0,
    maxX: 100,
    stepX: 1,
    calcValue: (R, _b, h, _x) => {
      const circ = 2 * Math.PI * R;
      const val = Math.sqrt(circ * circ + h * h);
      return { val, optX: 100, optVal: val, label: `Đường đi ngắn nhất 1 vòng d = ${val.toFixed(1)} cm` };
    }
  },
  {
    id: 'path_cone',
    name: '2.3. Con kiến / Đường dây điện trên hình nón',
    category: 'shortest_path',
    categoryName: 'Đường đi ngắn nhất',
    badge: 'Mặt xung quanh nón',
    description: 'Đi từ điểm trên đường sinh quanh nón rồi quay lại. Trải hình nón thành hình quạt tròn góc θ = 360° × R/L.',
    formulaTex: 'd = 2L \\sin\\left(\\frac{\\theta}{2}\\right)',
    variableName: 'Tiến trình mở quạt',
    unit: '%',
    defaultA: 10, // R = 10cm
    defaultB: 0,
    defaultH: 30, // h = 30cm -> L = sqrt(100+900) = 31.62cm
    defaultX: 100,
    minX: 0,
    maxX: 100,
    stepX: 1,
    calcValue: (R, _b, h, _x) => {
      const L = Math.sqrt(R * R + h * h);
      const thetaRad = (2 * Math.PI * R) / L;
      const val = 2 * L * Math.sin(thetaRad / 2);
      return { val, optX: 100, optVal: val, label: `Độ dài dây quấn quanh nón d = ${val.toFixed(1)} cm` };
    }
  },

  // --------------------------------------------------------------------------
  // 3. TRẢI PHẲNG HÌNH HỌC TRỰC QUAN (NETTING & PLATONIC SOLIDS)
  // --------------------------------------------------------------------------
  {
    id: 'net_platonic_cube',
    name: '3.1. Trải phẳng Khối lập phương (Cube Net)',
    category: 'netting',
    categoryName: 'Trải phẳng Lưới Net',
    badge: 'Khối đa diện đều Platon',
    description: 'Lưới net 6 hình vuông mở xòe ra mặt phẳng 2D.',
    formulaTex: 'S_{tp} = 6a^2, \\quad V = a^3',
    variableName: 'Góc mở lưới Net',
    unit: '%',
    defaultA: 30,
    defaultB: 0,
    defaultH: 30,
    defaultX: 0,
    minX: 0,
    maxX: 100,
    stepX: 1,
    calcValue: (a, _b, _h, _x) => {
      const stp = 6 * a * a;
      const v = a * a * a;
      return { val: stp, optX: 0, optVal: stp, label: `Stp = ${stp} cm², V = ${v} cm³` };
    }
  },
  {
    id: 'net_platonic_tetrahedron',
    name: '3.2. Trải phẳng Tứ diện đều (Tetrahedron Net)',
    category: 'netting',
    categoryName: 'Trải phẳng Lưới Net',
    badge: '4 mặt tam giác đều',
    description: 'Khối tứ diện đều cạnh a xòe 3 mặt bên ra thành tam giác lớn.',
    formulaTex: 'S_{tp} = a^2 \\sqrt{3}, \\quad V = \\frac{a^3 \\sqrt{2}}{12}',
    variableName: 'Góc mở lưới Net',
    unit: '%',
    defaultA: 30,
    defaultB: 0,
    defaultH: 0,
    defaultX: 0,
    minX: 0,
    maxX: 100,
    stepX: 1,
    calcValue: (a, _b, _h, _x) => {
      const stp = a * a * Math.sqrt(3);
      const v = (a * a * a * Math.sqrt(2)) / 12;
      return { val: stp, optX: 0, optVal: stp, label: `Stp = ${stp.toFixed(1)} cm², V = ${v.toFixed(1)} cm³` };
    }
  },
  {
    id: 'net_platonic_octahedron',
    name: '3.3. Trải phẳng Bát diện đều (Octahedron Net)',
    category: 'netting',
    categoryName: 'Trải phẳng Lưới Net',
    badge: '8 mặt tam giác đều',
    description: 'Khối bát diện đều 8 mặt xòe phẳng.',
    formulaTex: 'S_{tp} = 2a^2 \\sqrt{3}, \\quad V = \\frac{a^3 \\sqrt{2}}{3}',
    variableName: 'Góc mở lưới Net',
    unit: '%',
    defaultA: 25,
    defaultB: 0,
    defaultH: 0,
    defaultX: 0,
    minX: 0,
    maxX: 100,
    stepX: 1,
    calcValue: (a, _b, _h, _x) => {
      const stp = 2 * a * a * Math.sqrt(3);
      const v = (a * a * a * Math.sqrt(2)) / 3;
      return { val: stp, optX: 0, optVal: stp, label: `Stp = ${stp.toFixed(1)} cm², V = ${v.toFixed(1)} cm³` };
    }
  },

  // --------------------------------------------------------------------------
  // 4. CẮT GHÉP & TÁI CẤU TRÚC (DISSECTION & VOLUME RATIO)
  // --------------------------------------------------------------------------
  {
    id: 'dissection_3_pyramids',
    name: '4.1. Ghép 3 hình chóp thành 1 hình lập phương',
    category: 'dissection',
    categoryName: 'Cắt ghép & Phân chia V',
    badge: 'Chứng minh V = 1/3 B.h',
    description: 'Minh họa trực quan ghép 3 khối chóp tứ giác bằng nhau để hợp thành 1 khối lập phương nguyên vẹn.',
    formulaTex: 'V_{\\text{chóp}} = \\frac{1}{3} V_{\\text{hộp}} = \\frac{1}{3} B h',
    variableName: 'Khoảng cách tách khối',
    unit: '%',
    defaultA: 30,
    defaultB: 0,
    defaultH: 30,
    defaultX: 50,
    minX: 0,
    maxX: 100,
    stepX: 1,
    calcValue: (a, _b, _h, _x) => {
      const vCube = a * a * a;
      const vPyramid = vCube / 3;
      return { val: vPyramid, optX: 0, optVal: vPyramid, label: `V_chóp = 1/3 V_lập_phương = ${vPyramid.toFixed(1)} cm³` };
    }
  }
];

interface Advanced3DSimulatorProps {
  onInsertImage?: (base64: string) => void;
}

export const Advanced3DSimulator: React.FC<Advanced3DSimulatorProps> = ({ onInsertImage }) => {
  // Active Preset Selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>('box_open');
  const activePreset = useMemo(() => {
    return PRESET_MODELS.find(m => m.id === selectedPresetId) || PRESET_MODELS[0];
  }, [selectedPresetId]);

  // Dimension States
  const [paramA, setParamA] = useState<number>(activePreset.defaultA);
  const [paramB, setParamB] = useState<number>(activePreset.defaultB);
  const [paramH, setParamH] = useState<number>(activePreset.defaultH);
  const [paramX, setParamX] = useState<number>(activePreset.defaultX);

  // Folding & Animation States
  const [foldRatio, setFoldRatio] = useState<number>(50); // 0% (2D net) -> 100% (3D box)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'glass' | 'wireframe' | 'solid'>('glass');
  const [showDimensions, setShowDiagonals] = useState<boolean>(true);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // AI Prompt & Image Upload States
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiStatusMsg, setAiStatusMsg] = useState<string | null>(null);

  // Canvas & Three.js Refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  // Sync state when switching preset
  useEffect(() => {
    setParamA(activePreset.defaultA);
    setParamB(activePreset.defaultB);
    setParamH(activePreset.defaultH);
    setParamX(activePreset.defaultX);
    setFoldRatio(50);
    setIsPlaying(false);
  }, [selectedPresetId, activePreset]);

  // Real-time Calculated Values
  const calcResult = useMemo(() => {
    return activePreset.calcValue(paramA, paramB, paramH, paramX);
  }, [activePreset, paramA, paramB, paramH, paramX]);

  // Filtered preset list
  const filteredPresets = useMemo(() => {
    return PRESET_MODELS.filter(m => {
      const matchCat = activeCategoryFilter === 'all' || m.category === activeCategoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.categoryName.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [searchQuery, activeCategoryFilter]);

  // Build 3D Net / Box Folding / Shortest Path Mesh with Three.js
  const buildSceneObjects = useCallback(() => {
    if (!modelGroupRef.current) return;
    const group = modelGroupRef.current;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const a = paramA / 10; // scale down for viewport
    const b = paramB / 10;
    const h = paramH / 10;
    const x = paramX / 10;
    const foldAngle = (foldRatio / 100) * (Math.PI / 2); // 0 to 90 degrees

    const faceMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald
      transparent: true,
      opacity: viewMode === 'glass' ? 0.45 : viewMode === 'solid' ? 0.9 : 0.08,
      side: THREE.DoubleSide,
      roughness: 0.2,
      wireframe: viewMode === 'wireframe'
    });

    const cutMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Red cutout
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });

    const pathMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 }); // Cyan path
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 });
    const dashedMat = new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.2, gapSize: 0.1 });

    // MODEL 1.1: OPEN BOX (CẮT 4 GÓC VÀ GẤP)
    if (activePreset.id === 'box_open') {
      const baseW = a - 2 * x;
      const baseH = b - 2 * x;

      // Base rectangle
      const baseGeo = new THREE.PlaneGeometry(baseW, baseH);
      const baseMesh = new THREE.Mesh(baseGeo, faceMat);
      baseMesh.rotation.x = -Math.PI / 2;
      group.add(baseMesh);

      // 4 Hinge Flaps (Left, Right, Top, Bottom)
      // Left Flap
      const leftHinge = new THREE.Group();
      leftHinge.position.set(-baseW / 2, 0, 0);
      const leftGeo = new THREE.PlaneGeometry(x, baseH);
      leftGeo.translate(-x / 2, 0, 0);
      const leftMesh = new THREE.Mesh(leftGeo, faceMat);
      leftMesh.rotation.x = -Math.PI / 2;
      leftHinge.add(leftMesh);
      leftHinge.rotation.z = foldAngle;
      group.add(leftHinge);

      // Right Flap
      const rightHinge = new THREE.Group();
      rightHinge.position.set(baseW / 2, 0, 0);
      const rightGeo = new THREE.PlaneGeometry(x, baseH);
      rightGeo.translate(x / 2, 0, 0);
      const rightMesh = new THREE.Mesh(rightGeo, faceMat);
      rightMesh.rotation.x = -Math.PI / 2;
      rightHinge.add(rightMesh);
      rightHinge.rotation.z = -foldAngle;
      group.add(rightHinge);

      // Top Flap
      const topHinge = new THREE.Group();
      topHinge.position.set(0, 0, -baseH / 2);
      const topGeo = new THREE.PlaneGeometry(baseW, x);
      topGeo.translate(0, x / 2, 0);
      const topMesh = new THREE.Mesh(topGeo, faceMat);
      topMesh.rotation.x = -Math.PI / 2;
      topHinge.add(topMesh);
      topHinge.rotation.x = -foldAngle;
      group.add(topHinge);

      // Bottom Flap
      const botHinge = new THREE.Group();
      botHinge.position.set(0, 0, baseH / 2);
      const botGeo = new THREE.PlaneGeometry(baseW, x);
      botGeo.translate(0, -x / 2, 0);
      const botMesh = new THREE.Mesh(botGeo, faceMat);
      botMesh.rotation.x = -Math.PI / 2;
      botHinge.add(botMesh);
      botHinge.rotation.x = foldAngle;
      group.add(botHinge);

    } else if (activePreset.id === 'path_cuboid') {
      // MODEL 2.1: SHORT PATH ON CUBOID (CON KIẾN BÒ)
      const boxW = a;
      const boxD = b;
      const boxH = h > 0 ? h : 3;

      // When foldRatio == 100%, it's 3D box; when foldRatio == 0%, it's flattened 2D net!
      const unrollAngle = (1 - foldRatio / 100) * (Math.PI / 2);

      // Front Face
      const frontGeo = new THREE.PlaneGeometry(boxW, boxH);
      const frontMesh = new THREE.Mesh(frontGeo, faceMat);
      frontMesh.position.set(0, boxH / 2, boxD / 2);
      group.add(frontMesh);

      // Right Face (Unrolls outward)
      const rightHinge = new THREE.Group();
      rightHinge.position.set(boxW / 2, 0, boxD / 2);
      const rightGeo = new THREE.PlaneGeometry(boxD, boxH);
      rightGeo.translate(boxD / 2, boxH / 2, 0);
      const rightMesh = new THREE.Mesh(rightGeo, faceMat);
      rightMesh.rotation.y = Math.PI / 2;
      rightHinge.add(rightMesh);
      rightHinge.rotation.y = unrollAngle;
      group.add(rightHinge);

      // Shortest path line (A -> C')
      const pA = new THREE.Vector3(-boxW / 2, 0, boxD / 2);
      const pC = new THREE.Vector3(boxW / 2 + boxD, boxH, boxD / 2);
      const pathGeo = new THREE.BufferGeometry().setFromPoints([pA, pC]);
      group.add(new THREE.Line(pathGeo, pathMat));

    } else {
      // Default Generic Box / Net fallback
      const geo = new THREE.BoxGeometry(a, h > 0 ? h : a, b > 0 ? b : a);
      const mesh = new THREE.Mesh(geo, faceMat);
      mesh.position.set(0, (h > 0 ? h : a) / 2, 0);
      group.add(mesh);
    }
  }, [activePreset.id, paramA, paramB, paramH, paramX, foldRatio, viewMode]);

  // INITIALIZE THREE.JS SCENE
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(6, 5, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.5, 0);
    controls.update();
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    // Grid Floor
    const grid = new THREE.GridHelper(16, 32, 0x334155, 0x1e293b);
    scene.add(grid);

    // Group for objects
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const nw = mountRef.current.clientWidth || 800;
      const nh = mountRef.current.clientHeight || 520;
      cameraRef.current.aspect = nw / nh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update scene when parameters change
  useEffect(() => {
    buildSceneObjects();
  }, [buildSceneObjects]);

  // Auto Animate Loop (Folding & Unfolding)
  useEffect(() => {
    if (!isPlaying) return;
    let dir = 1;
    const timer = setInterval(() => {
      setFoldRatio(prev => {
        if (prev >= 100) dir = -1;
        if (prev <= 0) dir = 1;
        return Math.max(0, Math.min(100, prev + dir * 2));
      });
    }, 40);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // AI PARSER FUNCTION USING GEMINI API
  const handleAiParsePrompt = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiAnalyzing(true);
    setAiStatusMsg("Đang dùng AI Gemini 2.5 phân tích đề bài toán thực tế...");

    try {
      const storedKey = localStorage.getItem("eduplan_gemini_api_key_v2") || "";
      const ai = new GoogleGenAI({ apiKey: storedKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Bạn là trợ lý Chuyên gia Toán THPT 2018. Hãy phân tích đề bài toán thực tế sau và trích xuất tham số 3D:
"${aiPrompt}"

Hãy trả về duy nhất một chuỗi JSON thuần (không chứa markdown backticks):
{
  "matchedPresetId": "box_open" | "box_closed" | "triangular_prism_open" | "cone_cut_sector" | "water_trough" | "can_cylinder" | "path_cuboid" | "path_cylinder",
  "paramA": số,
  "paramB": số,
  "paramH": số,
  "paramX": số,
  "explanation": "Tóm tắt ngắn gọn phân tích đề bài"
}`
      });

      const text = response.text || "";
      const cleanedJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);

      if (parsed.matchedPresetId) {
        setSelectedPresetId(parsed.matchedPresetId);
        if (parsed.paramA) setParamA(parsed.paramA);
        if (parsed.paramB) setParamB(parsed.paramB);
        if (parsed.paramH) setParamH(parsed.paramH);
        if (parsed.paramX) setParamX(parsed.paramX);
        setAiStatusMsg(`✅ Phân tích thành công: ${parsed.explanation || "Đã dựng mô hình 3D tương ứng"}`);
      }
    } catch (err: any) {
      console.error(err);
      setAiStatusMsg("Chưa thể tự động trích xuất đề bài này. Thầy cô có thể chọn trực tiếp mô hình mẫu ở cột bên trái.");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // CAPTURE PNG TRANSPARENT
  const handleCapturePng = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    const scene = sceneRef.current;
    const origBg = scene.background;
    scene.background = null;

    rendererRef.current.render(scene, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
    scene.background = origBg;

    if (onInsertImage) {
      onInsertImage(dataUrl);
    } else {
      const link = document.createElement('a');
      link.download = `3d_simulation_${activePreset.id}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden w-full h-[88vh] max-h-[900px]">
      {/* TOP HEADER TOOLBAR */}
      <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Kho Mô Phỏng 3D: Cắt Ghép, Trải Phẳng & Tối Ưu Toán Thực Tế
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                GDPT 2018
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Hệ thống mô hình hóa 3D tương tác real-time cho bài toán Cực trị thực tế, Đường đi ngắn nhất & Lưới trải phẳng (Netting)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCapturePng}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Camera className="w-4 h-4" />
            <span>Chụp ảnh PNG trong suốt</span>
          </button>
        </div>
      </div>

      {/* AI PROMPT INPUT BAR */}
      <div className="bg-slate-950/80 px-5 py-2.5 border-b border-slate-800 flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold shrink-0">
          <Sparkles className="w-4 h-4" />
          <span>AI Dựng Mô Hình Từ Đề Bài:</span>
        </div>
        <div className="flex-1 flex items-center gap-2 min-w-[280px]">
          <input
            type="text"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder="Dán đề bài (ví dụ: Cho tấm bìa hình chữ nhật 60cm x 40cm, cắt 4 góc vuông x...)"
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
          <button
            onClick={handleAiParsePrompt}
            disabled={isAiAnalyzing}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {isAiAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
            <span>Dựng Mô Hình</span>
          </button>
        </div>

        {aiStatusMsg && (
          <span className="text-[11px] text-emerald-400 font-medium truncate max-w-md">
            {aiStatusMsg}
          </span>
        )}
      </div>

      {/* MAIN CONTENT GRID: LEFT PRESETS + CENTER 3D + RIGHT REALTIME CONTROLS */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: PRESET LIBRARY CATALOGUE */}
        <div className="lg:col-span-3 bg-slate-950/60 p-3.5 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col overflow-hidden">
          {/* Search Input */}
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm bài toán (kiến bò, máng nước, cắt góc...)"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* Category Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'optimization', label: 'Tối ưu V(x)' },
                { id: 'shortest_path', label: 'Con kiến bò' },
                { id: 'netting', label: 'Lưới Trải' },
                { id: 'dissection', label: 'Cắt ghép V' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-2 py-1 rounded-lg shrink-0 font-medium transition-all cursor-pointer ${
                    activeCategoryFilter === cat.id
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Cards List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {filteredPresets.map(preset => {
              const isSelected = preset.id === selectedPresetId;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-white font-semibold ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                      {preset.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold leading-snug">{preset.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: 3D THREE.JS CANVAS VIEWPORT */}
        <div className="lg:col-span-6 bg-slate-900 relative flex flex-col items-center justify-center min-h-[380px]">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Controls Bar Overlay (Top Right) */}
          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                isPlaying ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Tạm dừng' : 'Tự động chạy'}</span>
            </button>

            <button
              onClick={() => {
                if (cameraRef.current && controlsRef.current) {
                  cameraRef.current.position.set(6, 5, 8);
                  controlsRef.current.target.set(0, 1.5, 0);
                  controlsRef.current.update();
                }
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Reset góc nhìn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Instruction Overlay (Top Left) */}
          <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 pointer-events-none">
            Xoay 360° • Zoom con lăn • Trượt chuột phải
          </div>
        </div>

        {/* RIGHT COLUMN: REALTIME MATHEMATICAL CONTROLS & OPTIMAL FINDER */}
        <div className="lg:col-span-3 bg-slate-950/60 p-4 border-t lg:border-t-0 lg:border-l border-slate-800 overflow-y-auto space-y-4 custom-scrollbar">
          {/* DYNAMIC REAL-TIME FORMULA CALCULATOR BOX */}
          <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-3.5 rounded-2xl border border-emerald-500/40 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Giá Trị Thực Tế Real-time</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                Công thức SGK
              </span>
            </div>

            <div className="text-xs text-slate-300 font-mono bg-slate-950/80 p-2 rounded-xl border border-slate-800/80 leading-relaxed">
              ${activePreset.formulaTex}$
            </div>

            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-center space-y-1">
              <div className="text-xs text-slate-300 font-medium">Kết quả tính toán hiện tại:</div>
              <div className="text-base font-bold text-emerald-300 tracking-wide">
                {calcResult.label}
              </div>
            </div>

            {/* BUTTON GO TO OPTIMAL POINT */}
            <button
              onClick={() => setParamX(calcResult.optX)}
              className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Award className="w-4 h-4 text-slate-950" />
              <span>Tự động di chuyển đến Điểm Tối Ưu (x_opt = {calcResult.optX.toFixed(2)})</span>
            </button>
          </div>

          {/* FOLDING / NETTING PROGRESS SLIDER */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-teal-400" />
                <span>Tiến trình gập / Trải phẳng 2D ↔ 3D:</span>
              </span>
              <span className="text-teal-400 font-mono">{foldRatio}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={foldRatio}
              onChange={e => setFoldRatio(parseInt(e.target.value))}
              className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Trải phẳng 2D (0%)</span>
              <span>Gấp thành khối 3D (100%)</span>
            </div>
          </div>

          {/* DYNAMIC VARIABLE SLIDER X */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-200">
              <span>{activePreset.variableName} ({activePreset.unit}):</span>
              <span className="text-emerald-400 font-mono">{paramX.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={activePreset.minX}
              max={activePreset.maxX}
              step={activePreset.stepX}
              value={paramX}
              onChange={e => setParamX(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* DIMENSION SLIDERS A, B, H */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kích thước tấm bìa ban đầu</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Chiều dài a:</span>
                <span className="text-slate-200 font-mono font-bold">{paramA} cm</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={paramA}
                onChange={e => setParamA(parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {activePreset.defaultB > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Chiều rộng b:</span>
                  <span className="text-slate-200 font-mono font-bold">{paramB} cm</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="80"
                  value={paramB}
                  onChange={e => setParamB(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* VIEW MODE PILLS */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-slate-300">Chế độ hiển thị:</div>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('glass')}
                className={`py-1 rounded font-medium transition-colors cursor-pointer ${
                  viewMode === 'glass' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400'
                }`}
              >
                Thủy tinh
              </button>
              <button
                onClick={() => setViewMode('wireframe')}
                className={`py-1 rounded font-medium transition-colors cursor-pointer ${
                  viewMode === 'wireframe' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400'
                }`}
              >
                Nét khuất
              </button>
              <button
                onClick={() => setViewMode('solid')}
                className={`py-1 rounded font-medium transition-colors cursor-pointer ${
                  viewMode === 'solid' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40' : 'text-slate-400'
                }`}
              >
                Màu đặc
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
