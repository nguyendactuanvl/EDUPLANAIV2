import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Box, RotateCcw, Camera, Scissors, Layers, Sliders, Check, 
  Sparkles, Eye, ShieldCheck, ChevronRight
} from 'lucide-react';

export type Category3D = 'pyramid' | 'prism' | 'cone' | 'cylinder' | 'sphere';

export interface ModelOption3D {
  id: string;
  name: string;
  category: Category3D;
  categoryLabel: string;
  description: string;
  hasBParam?: boolean;
}

export const MODEL_OPTIONS_3D: ModelOption3D[] = [
  // 1. NHÓM CHÓP
  {
    id: 'pyramid_regular_tri',
    name: 'Chóp tam giác đều S.ABC',
    category: 'pyramid',
    categoryLabel: 'Hình Chóp',
    description: 'Đáy ABC là tam giác đều, đường cao SO ⊥ (ABC) tại tâm O'
  },
  {
    id: 'pyramid_regular_quad',
    name: 'Chóp tứ giác đều S.ABCD',
    category: 'pyramid',
    categoryLabel: 'Hình Chóp',
    description: 'Đáy ABCD là hình vuông, đường cao SO ⊥ (ABCD) tại tâm O'
  },
  {
    id: 'pyramid_perp_tri',
    name: 'Chóp S.ABC (SA ⊥ đáy)',
    category: 'pyramid',
    categoryLabel: 'Hình Chóp',
    description: 'Cạnh bên SA ⊥ (ABC), đáy là tam giác vuông / vuông cân',
    hasBParam: true
  },
  {
    id: 'pyramid_perp_quad',
    name: 'Chóp S.ABCD (SA ⊥ đáy)',
    category: 'pyramid',
    categoryLabel: 'Hình Chóp',
    description: 'Cạnh bên SA ⊥ (ABCD), đáy là hình chữ nhật / hình vuông',
    hasBParam: true
  },

  // 2. NHÓM LĂNG TRỤ & HỘP
  {
    id: 'prism_triangular',
    name: 'Lăng trụ tam giác đều ABC.A\'B\'C\'',
    category: 'prism',
    categoryLabel: 'Lăng Trụ & Hộp',
    description: 'Lăng trụ đứng có hai đáy ABC và A\'B\'C\' là tam giác đều'
  },
  {
    id: 'cuboid',
    name: 'Hình hộp chữ nhật / Hình lập phương',
    category: 'prism',
    categoryLabel: 'Lăng Trụ & Hộp',
    description: 'Khối hộp chữ nhật ABCD.A\'B\'C\'D\' có 6 mặt chữ nhật / vuông',
    hasBParam: true
  },

  // 3. NHÓM NÓN
  {
    id: 'cone',
    name: 'Hình nón tròn xoay',
    category: 'cone',
    categoryLabel: 'Hình Nón',
    description: 'Đỉnh S, đường cao SO, bán kính đáy R, các đường sinh SA, SB'
  },

  // 4. NHÓM TRỤ
  {
    id: 'cylinder',
    name: 'Hình trụ tròn xoay',
    category: 'cylinder',
    categoryLabel: 'Hình Trụ',
    description: 'Trục OO\', bán kính đáy R, hai đáy là đường tròn tròn xoay'
  },

  // 5. NHÓM CẦU
  {
    id: 'sphere',
    name: 'Mặt cầu / Khối cầu',
    category: 'sphere',
    categoryLabel: 'Mặt Cầu',
    description: 'Tâm O, bán kính R, đường xích đạo và các vĩ tuyến'
  }
];

export interface Simulation3DProps {
  initialModelId?: string;
  onInsertImage?: (base64Png: string) => void;
  insertButtonLabel?: string;
  title?: string;
}

export const Simulation3D: React.FC<Simulation3DProps> = ({
  initialModelId = 'pyramid_regular_quad',
  onInsertImage,
  insertButtonLabel = 'Chèn hình vào câu hỏi',
  title = 'Mô Phỏng Hình Học Không Gian 3D'
}) => {
  // Model & State Management
  const [selectedModelId, setSelectedModelId] = useState<string>(initialModelId);
  const activeModel = useMemo(() => {
    return MODEL_OPTIONS_3D.find(m => m.id === selectedModelId) || MODEL_OPTIONS_3D[1];
  }, [selectedModelId]);

  // Parameters States
  const [height, setHeight] = useState<number>(3.2);       // Chiều cao h
  const [baseSide, setBaseSide] = useState<number>(2.5);   // Cạnh đáy a / Bán kính R
  const [baseSideB, setBaseSideB] = useState<number>(2.0); // Cạnh đáy b

  // Feature Toggles & Controls
  const [showSlice, setShowSlice] = useState<boolean>(false);       // Toggle thiết diện
  const [sliceProgress, setSliceProgress] = useState<number>(50);  // 0% -> 100%
  const [showAltitude, setShowAltitude] = useState<boolean>(true); // Toggle đường cao SO / OO'
  const [viewMode, setViewMode] = useState<'glass' | 'wireframe' | 'solid'>('glass'); // Chế độ hiển thị

  // Toast / Status
  const [copied, setCopied] = useState<boolean>(false);

  // Canvas & Three.js Refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  // Helper: Create Billboard Label Sprite facing Camera
  const createBillboardLabel = useCallback((text: string, colorHex = '#ffffff', bgHex = '#0f172a'): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);
      // Background pill
      ctx.beginPath();
      ctx.arc(64, 64, 46, 0, Math.PI * 2);
      ctx.fillStyle = bgHex;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = colorHex;
      ctx.stroke();

      // Text font
      ctx.font = "bold 56px 'Times New Roman', serif";
      ctx.fillStyle = colorHex;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 66);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.6, 0.6, 1.0);
    return sprite;
  }, []);

  // Construct 3D Mesh, Edges, Slicing Plane & Labels
  const render3DModel = useCallback(() => {
    if (!modelGroupRef.current) return;
    const group = modelGroupRef.current;

    // Clear previous objects
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const h = height;
    const a = baseSide;
    const b = baseSideB;
    const opacity = viewMode === 'glass' ? 0.38 : viewMode === 'solid' ? 0.88 : 0.06;
    const isWireframe = viewMode === 'wireframe';

    // Materials
    const faceMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald accent
      transparent: true,
      opacity: opacity,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
      wireframe: isWireframe
    });

    const sliceMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan glow for cutting plane
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });

    const edgeColor = 0x34d399; // Emerald edge
    const altitudeColor = 0xef4444; // Red altitude

    // Helper: Add Line
    const drawLine = (p1: THREE.Vector3, p2: THREE.Vector3, isDashed = false, color = edgeColor) => {
      const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      if (isDashed) {
        const mat = new THREE.LineDashedMaterial({ color: color, dashSize: 0.15, gapSize: 0.1 });
        const line = new THREE.Line(geo, mat);
        line.computeLineDistances();
        group.add(line);
      } else {
        const mat = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
        group.add(new THREE.Line(geo, mat));
      }
    };

    // Helper: Add Vertex Label
    const drawVertex = (label: string, pos: THREE.Vector3, colorHex = '#34d399') => {
      const dotGeo = new THREE.SphereGeometry(0.06, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.copy(pos);
      group.add(dotMesh);

      const sprite = createBillboardLabel(label, colorHex, '#0f172a');
      sprite.position.copy(pos).add(new THREE.Vector3(0, 0.25, 0));
      group.add(sprite);
    };

    const sliceY = (sliceProgress / 100) * h;

    // BUILD SHAPES
    if (selectedModelId === 'pyramid_regular_tri') {
      // Chóp tam giác đều S.ABC (SO ⊥ ABC)
      const R = a / Math.sqrt(3);
      const A = new THREE.Vector3(-a / 2, 0, R / 2);
      const B = new THREE.Vector3(a / 2, 0, R / 2);
      const C = new THREE.Vector3(0, 0, -R);
      const O = new THREE.Vector3(0, 0, 0);
      const S = new THREE.Vector3(0, h, 0);

      const baseGeo = new THREE.BufferGeometry().setFromPoints([A, B, C]);
      baseGeo.computeVertexNormals();
      group.add(new THREE.Mesh(baseGeo, faceMat));

      [[A, B, S], [B, C, S], [C, A, S]].forEach(pts => {
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, faceMat));
      });

      drawLine(A, B, false);
      drawLine(B, C, false);
      drawLine(C, A, true);
      drawLine(S, A, false);
      drawLine(S, B, false);
      drawLine(S, C, false);

      if (showAltitude) {
        drawLine(S, O, true, altitudeColor);
        drawVertex('O', O, '#ef4444');
      }

      if (showSlice) {
        const ratio = sliceY / h;
        const As = new THREE.Vector3().lerpVectors(S, A, 1 - ratio);
        const Bs = new THREE.Vector3().lerpVectors(S, B, 1 - ratio);
        const Cs = new THREE.Vector3().lerpVectors(S, C, 1 - ratio);

        const sGeo = new THREE.BufferGeometry().setFromPoints([As, Bs, Cs]);
        sGeo.computeVertexNormals();
        group.add(new THREE.Mesh(sGeo, sliceMat));

        drawLine(As, Bs, false, 0x22d3ee);
        drawLine(Bs, Cs, false, 0x22d3ee);
        drawLine(Cs, As, false, 0x22d3ee);
      }

      drawVertex('S', S, '#60a5fa');
      drawVertex('A', A);
      drawVertex('B', B);
      drawVertex('C', C);

    } else if (selectedModelId === 'pyramid_regular_quad') {
      // Chóp tứ giác đều S.ABCD (SO ⊥ ABCD)
      const A = new THREE.Vector3(-a / 2, 0, a / 2);
      const B = new THREE.Vector3(a / 2, 0, a / 2);
      const C = new THREE.Vector3(a / 2, 0, -a / 2);
      const D = new THREE.Vector3(-a / 2, 0, -a / 2);
      const O = new THREE.Vector3(0, 0, 0);
      const S = new THREE.Vector3(0, h, 0);

      const baseGeo = new THREE.BufferGeometry().setFromPoints([A, B, C, A, C, D]);
      baseGeo.computeVertexNormals();
      group.add(new THREE.Mesh(baseGeo, faceMat));

      [[A, B, S], [B, C, S], [C, D, S], [D, A, S]].forEach(pts => {
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, faceMat));
      });

      drawLine(A, B, false);
      drawLine(B, C, false);
      drawLine(C, D, true);
      drawLine(D, A, true);
      drawLine(S, A, false);
      drawLine(S, B, false);
      drawLine(S, C, false);
      drawLine(S, D, true);

      if (showAltitude) {
        drawLine(S, O, true, altitudeColor);
        drawVertex('O', O, '#ef4444');
      }

      if (showSlice) {
        const ratio = sliceY / h;
        const As = new THREE.Vector3().lerpVectors(S, A, 1 - ratio);
        const Bs = new THREE.Vector3().lerpVectors(S, B, 1 - ratio);
        const Cs = new THREE.Vector3().lerpVectors(S, C, 1 - ratio);
        const Ds = new THREE.Vector3().lerpVectors(S, D, 1 - ratio);

        const sGeo = new THREE.BufferGeometry().setFromPoints([As, Bs, Cs, As, Cs, Ds]);
        sGeo.computeVertexNormals();
        group.add(new THREE.Mesh(sGeo, sliceMat));

        drawLine(As, Bs, false, 0x22d3ee);
        drawLine(Bs, Cs, false, 0x22d3ee);
        drawLine(Cs, Ds, false, 0x22d3ee);
        drawLine(Ds, As, false, 0x22d3ee);
      }

      drawVertex('S', S, '#60a5fa');
      drawVertex('A', A);
      drawVertex('B', B);
      drawVertex('C', C);
      drawVertex('D', D);

    } else if (selectedModelId === 'prism_triangular') {
      // Lăng trụ tam giác đều ABC.A'B'C'
      const R = a / Math.sqrt(3);
      const A = new THREE.Vector3(-a / 2, 0, R / 2);
      const B = new THREE.Vector3(a / 2, 0, R / 2);
      const C = new THREE.Vector3(0, 0, -R);

      const A1 = new THREE.Vector3(-a / 2, h, R / 2);
      const B1 = new THREE.Vector3(a / 2, h, R / 2);
      const C1 = new THREE.Vector3(0, h, -R);

      const bGeo = new THREE.BufferGeometry().setFromPoints([A, B, C]);
      bGeo.computeVertexNormals();
      group.add(new THREE.Mesh(bGeo, faceMat));

      const tGeo = new THREE.BufferGeometry().setFromPoints([A1, B1, C1]);
      tGeo.computeVertexNormals();
      group.add(new THREE.Mesh(tGeo, faceMat));

      [[A, B, B1, A, B1, A1], [B, C, C1, B, C1, B1], [C, A, A1, C, A1, C1]].forEach(pts => {
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, faceMat));
      });

      drawLine(A, B, false);
      drawLine(B, C, false);
      drawLine(C, A, true);
      drawLine(A1, B1, false);
      drawLine(B1, C1, false);
      drawLine(C1, A1, false);
      drawLine(A, A1, false);
      drawLine(B, B1, false);
      drawLine(C, C1, true);

      if (showSlice) {
        const ratio = sliceY / h;
        const As = new THREE.Vector3().lerpVectors(A, A1, ratio);
        const Bs = new THREE.Vector3().lerpVectors(B, B1, ratio);
        const Cs = new THREE.Vector3().lerpVectors(C, C1, ratio);

        const sGeo = new THREE.BufferGeometry().setFromPoints([As, Bs, Cs]);
        sGeo.computeVertexNormals();
        group.add(new THREE.Mesh(sGeo, sliceMat));

        drawLine(As, Bs, false, 0x22d3ee);
        drawLine(Bs, Cs, false, 0x22d3ee);
        drawLine(Cs, As, false, 0x22d3ee);
      }

      drawVertex('A', A);
      drawVertex('B', B);
      drawVertex('C', C);
      drawVertex("A'", A1);
      drawVertex("B'", B1);
      drawVertex("C'", C1);

    } else if (selectedModelId === 'cuboid') {
      // Hình hộp chữ nhật ABCD.A'B'C'D'
      const A = new THREE.Vector3(-a / 2, 0, b / 2);
      const B = new THREE.Vector3(a / 2, 0, b / 2);
      const C = new THREE.Vector3(a / 2, 0, -b / 2);
      const D = new THREE.Vector3(-a / 2, 0, -b / 2);

      const A1 = new THREE.Vector3(-a / 2, h, b / 2);
      const B1 = new THREE.Vector3(a / 2, h, b / 2);
      const C1 = new THREE.Vector3(a / 2, h, -b / 2);
      const D1 = new THREE.Vector3(-a / 2, h, -b / 2);

      const boxGeo = new THREE.BoxGeometry(a, h, b);
      const boxMesh = new THREE.Mesh(boxGeo, faceMat);
      boxMesh.position.set(0, h / 2, 0);
      group.add(boxMesh);

      drawLine(A, B, false);
      drawLine(B, C, false);
      drawLine(C, D, true);
      drawLine(D, A, true);
      drawLine(A1, B1, false);
      drawLine(B1, C1, false);
      drawLine(C1, D1, false);
      drawLine(D1, A1, false);
      drawLine(A, A1, false);
      drawLine(B, B1, false);
      drawLine(C, C1, false);
      drawLine(D, D1, true);

      if (showSlice) {
        const ratio = sliceY / h;
        const As = new THREE.Vector3().lerpVectors(A, A1, ratio);
        const Bs = new THREE.Vector3().lerpVectors(B, B1, ratio);
        const Cs = new THREE.Vector3().lerpVectors(C, C1, ratio);
        const Ds = new THREE.Vector3().lerpVectors(D, D1, ratio);

        const sGeo = new THREE.BufferGeometry().setFromPoints([As, Bs, Cs, As, Cs, Ds]);
        sGeo.computeVertexNormals();
        group.add(new THREE.Mesh(sGeo, sliceMat));

        drawLine(As, Bs, false, 0x22d3ee);
        drawLine(Bs, Cs, false, 0x22d3ee);
        drawLine(Cs, Ds, false, 0x22d3ee);
        drawLine(Ds, As, false, 0x22d3ee);
      }

      drawVertex('A', A);
      drawVertex('B', B);
      drawVertex('C', C);
      drawVertex('D', D);
      drawVertex("A'", A1);
      drawVertex("B'", B1);
      drawVertex("C'", C1);
      drawVertex("D'", D1);

    } else if (selectedModelId === 'cone') {
      // Hình nón tròn xoay (S, O, R = a)
      const R = a;
      const S = new THREE.Vector3(0, h, 0);
      const O = new THREE.Vector3(0, 0, 0);
      const A = new THREE.Vector3(-R, 0, 0);
      const B = new THREE.Vector3(R, 0, 0);

      const coneGeo = new THREE.ConeGeometry(R, h, 32);
      const coneMesh = new THREE.Mesh(coneGeo, faceMat);
      coneMesh.position.set(0, h / 2, 0);
      group.add(coneMesh);

      drawLine(S, A, false);
      drawLine(S, B, false);

      if (showAltitude) {
        drawLine(S, O, true, altitudeColor);
        drawLine(O, A, true, 0x94a3b8);
        drawVertex('O', O, '#ef4444');
      }

      // Base circle wireframe
      const circlePts: THREE.Vector3[] = [];
      for (let i = 0; i <= 32; i++) {
        const theta = (i / 32) * Math.PI * 2;
        circlePts.push(new THREE.Vector3(R * Math.cos(theta), 0, R * Math.sin(theta)));
      }
      for (let i = 0; i < 32; i++) {
        drawLine(circlePts[i], circlePts[i + 1], circlePts[i].z < 0);
      }

      if (showSlice) {
        const rSlice = R * (1 - sliceY / h);
        const sPts: THREE.Vector3[] = [];
        for (let i = 0; i <= 32; i++) {
          const theta = (i / 32) * Math.PI * 2;
          sPts.push(new THREE.Vector3(rSlice * Math.cos(theta), sliceY, rSlice * Math.sin(theta)));
        }
        const sCircleGeo = new THREE.BufferGeometry().setFromPoints(sPts);
        group.add(new THREE.Line(sCircleGeo, new THREE.LineBasicMaterial({ color: 0x22d3ee, linewidth: 3 })));
      }

      drawVertex('S', S, '#60a5fa');
      drawVertex('A', A);
      drawVertex('B', B);

    } else if (selectedModelId === 'cylinder') {
      // Hình trụ tròn xoay (O, O', R = a)
      const R = a;
      const O = new THREE.Vector3(0, 0, 0);
      const O1 = new THREE.Vector3(0, h, 0);
      const A = new THREE.Vector3(-R, 0, 0);
      const B = new THREE.Vector3(R, 0, 0);
      const A1 = new THREE.Vector3(-R, h, 0);
      const B1 = new THREE.Vector3(R, h, 0);

      const cylGeo = new THREE.CylinderGeometry(R, R, h, 32);
      const cylMesh = new THREE.Mesh(cylGeo, faceMat);
      cylMesh.position.set(0, h / 2, 0);
      group.add(cylMesh);

      drawLine(A1, A, false);
      drawLine(B1, B, false);

      if (showAltitude) {
        drawLine(O1, O, true, altitudeColor);
        drawLine(O, A, true, 0x94a3b8);
        drawVertex('O', O, '#ef4444');
        drawVertex("O'", O1, '#ef4444');
      }

      const botPts: THREE.Vector3[] = [];
      const topPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 32; i++) {
        const theta = (i / 32) * Math.PI * 2;
        botPts.push(new THREE.Vector3(R * Math.cos(theta), 0, R * Math.sin(theta)));
        topPts.push(new THREE.Vector3(R * Math.cos(theta), h, R * Math.sin(theta)));
      }
      for (let i = 0; i < 32; i++) {
        drawLine(botPts[i], botPts[i + 1], botPts[i].z < 0);
        drawLine(topPts[i], topPts[i + 1], false);
      }

      drawVertex('A', A);
      drawVertex('B', B);
      drawVertex("A'", A1);
      drawVertex("B'", B1);

    } else if (selectedModelId === 'sphere') {
      // Mặt cầu (O, R = a)
      const R = a;
      const O = new THREE.Vector3(0, R, 0);
      const A = new THREE.Vector3(-R, R, 0);
      const B = new THREE.Vector3(R, R, 0);

      const sphereGeo = new THREE.SphereGeometry(R, 32, 32);
      const sphereMesh = new THREE.Mesh(sphereGeo, faceMat);
      sphereMesh.position.set(0, R, 0);
      group.add(sphereMesh);

      const eqPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 32; i++) {
        const theta = (i / 32) * Math.PI * 2;
        eqPts.push(new THREE.Vector3(R * Math.cos(theta), R, R * Math.sin(theta)));
      }
      for (let i = 0; i < 32; i++) {
        drawLine(eqPts[i], eqPts[i + 1], eqPts[i].z < 0, 0x38bdf8);
      }

      if (showAltitude) {
        drawLine(O, A, true, altitudeColor);
      }

      drawVertex('O', O, '#ef4444');
      drawVertex('A', A);
      drawVertex('B', B);
    }
  }, [selectedModelId, height, baseSide, baseSideB, viewMode, showSlice, sliceProgress, showAltitude, createBillboardLabel]);

  // INITIALIZE THREE.JS SCENE + ORBITCONTROLS
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Dark Slate-900 background
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.2, 0);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(8, 12, 10);
    scene.add(dirLight1);

    // Floor Grid
    const gridHelper = new THREE.GridHelper(12, 24, 0x334155, 0x1e293b);
    scene.add(gridHelper);

    // Parent group for shape
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth || 800;
      const h = mountRef.current.clientHeight || 520;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update shape mesh when parameters change
  useEffect(() => {
    render3DModel();
  }, [render3DModel]);

  // Reset camera to standard textbook pose
  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(4.5, 3.2, 5.8);
      controlsRef.current.target.set(0, 1.2, 0);
      controlsRef.current.update();
    }
  };

  // Capture transparent PNG
  const handleCapturePng = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    const scene = sceneRef.current;
    const origBg = scene.background;
    scene.background = null;

    rendererRef.current.render(scene, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    scene.background = origBg;

    if (onInsertImage) {
      onInsertImage(dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } else {
      const link = document.createElement('a');
      link.download = `simulation3d_${selectedModelId}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full h-full min-h-[580px]">
      {/* HEADER BAR */}
      <div className="bg-slate-950/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-md shadow-emerald-500/20">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              {title}
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Three.js + OrbitControls
              </span>
            </h2>
            <p className="text-xs text-slate-400 hidden sm:block">
              Mô hình không gian 3D tương tác xoay 360°, phóng to, cắt thiết diện & hiển thị nhãn đỉnh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Reset góc nhìn chuẩn SGK"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Reset góc nhìn</span>
          </button>

          <button
            onClick={handleCapturePng}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Camera className="w-4 h-4 text-white" />}
            <span>{insertButtonLabel}</span>
          </button>
        </div>
      </div>

      {/* MAIN BODY: CONTROL PANEL (LEFT) + 3D VIEWPORT (RIGHT) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: CATEGORIES & PARAMETER SLIDERS */}
        <div className="lg:col-span-4 bg-slate-950/60 p-4 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto space-y-4 custom-scrollbar">
          {/* CATEGORY SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>1. Chọn loại mô hình (Chóp, Lăng trụ, Nón, Trụ, Cầu)</span>
            </label>

            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1 bg-slate-900 rounded-xl border border-slate-800">
              {MODEL_OPTIONS_3D.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedModelId(opt.id)}
                  className={`flex items-start text-left p-2.5 rounded-lg transition-all text-xs cursor-pointer ${
                    selectedModelId === opt.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{opt.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-emerald-400 rounded">
                        {opt.categoryLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PARAMETRIC SLIDERS */}
          <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Tùy chỉnh thông số hình</span>
            </label>

            {/* Height h slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>Chiều cao $h$:</span>
                <span className="text-emerald-400 font-mono font-bold">{height.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={height}
                onChange={e => setHeight(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Base Side / Radius a slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>{activeModel.category === 'cone' || activeModel.category === 'cylinder' || activeModel.category === 'sphere' ? 'Bán kính $R$:' : 'Cạnh đáy $a$:'}</span>
                <span className="text-emerald-400 font-mono font-bold">{baseSide.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.5"
                step="0.1"
                value={baseSide}
                onChange={e => setBaseSide(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Base Side B slider */}
            {activeModel.hasBParam && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300 font-medium">
                  <span>Cạnh đáy $b$:</span>
                  <span className="text-emerald-400 font-mono font-bold">{baseSideB.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.5"
                  step="0.1"
                  value={baseSideB}
                  onChange={e => setBaseSideB(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* VIEW MODE & CUTTING PLANE TOGGLE */}
          <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>3. Chế độ hiển thị & Mặt phẳng cắt</span>
            </label>

            {/* View Mode Radio Pills */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('glass')}
                className={`py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  viewMode === 'glass'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Thủy tinh
              </button>
              <button
                onClick={() => setViewMode('wireframe')}
                className={`py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  viewMode === 'wireframe'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Nét khuất
              </button>
              <button
                onClick={() => setViewMode('solid')}
                className={`py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  viewMode === 'solid'
                    ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Màu đặc
              </button>
            </div>

            {/* Toggles */}
            <div className="space-y-2 text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={showAltitude}
                  onChange={e => setShowAltitude(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span>Hiện đường cao $SO$ / Trục $OO'$ (Màu đỏ)</span>
              </label>

              {/* Cutting Plane Toggle & Slider */}
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer font-semibold text-cyan-300">
                  <input
                    type="checkbox"
                    checked={showSlice}
                    onChange={e => setShowSlice(e.target.checked)}
                    className="rounded accent-cyan-500"
                  />
                  <span>Bật Mặt phẳng cắt (Thiết diện)</span>
                </label>

                {showSlice && (
                  <div className="pl-5 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Vị trí thiết diện cắt:</span>
                      <span className="text-cyan-400 font-mono">{sliceProgress}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      value={sliceProgress}
                      onChange={e => setSliceProgress(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: THREE.JS 3D CANVAS VIEWPORT */}
        <div className="lg:col-span-8 bg-slate-900 relative flex flex-col items-center justify-center min-h-[440px]">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Top Instruction overlay */}
          <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Xoay chuột 360° • Zoom con lăn • Trượt chuột phải</span>
          </div>

          {/* Bottom Watermark Badge */}
          <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-mono">
            SGK GDPT 2018 • Quy ước: Nét đứt (khuất) | Nét liền (nhìn thấy)
          </div>
        </div>
      </div>
    </div>
  );
};
export default Simulation3D;
