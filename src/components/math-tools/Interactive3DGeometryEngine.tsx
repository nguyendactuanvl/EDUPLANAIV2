import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCcw, Camera, Copy, Check, Eye, EyeOff, Sliders, Box, 
  Layers, Sparkles, Scissors, Grid, RefreshCw, ZoomIn, ZoomOut,
  Maximize2, Minimize2, ChevronDown
} from 'lucide-react';

export type Shape3DCategory = 'pyramid' | 'prism' | 'revolution';

export type Shape3DId = 
  | 'pyramid_regular_tri' // Chóp tam giác đều S.ABC
  | 'pyramid_perp_tri'    // Chóp S.ABC có SA vuông góc đáy
  | 'pyramid_regular_quad'// Chóp tứ giác đều S.ABCD
  | 'pyramid_perp_quad'   // Chóp S.ABCD có SA vuông góc đáy
  | 'prism_triangular'   // Lăng trụ tam giác đều
  | 'cuboid'             // Hình hộp chữ nhật / lập phương
  | 'cone'               // Hình nón tròn xoay
  | 'cylinder'           // Hình trụ tròn xoay
  | 'sphere';            // Mặt cầu

export interface ShapeOption {
  id: Shape3DId;
  name: string;
  category: Shape3DCategory;
  description: string;
  hasBParam?: boolean;
}

export const SHAPE_OPTIONS: ShapeOption[] = [
  // HÌNH CHÓP
  {
    id: 'pyramid_regular_tri',
    name: 'Chóp tam giác đều S.ABC',
    category: 'pyramid',
    description: 'Đáy ABC là tam giác đều, SO ⊥ (ABC) tại tâm O'
  },
  {
    id: 'pyramid_perp_tri',
    name: 'Chóp S.ABC (SA ⊥ đáy)',
    category: 'pyramid',
    description: 'Cạnh bên SA vuông góc với mặt phẳng đáy (ABC)',
    hasBParam: true
  },
  {
    id: 'pyramid_regular_quad',
    name: 'Chóp tứ giác đều S.ABCD',
    category: 'pyramid',
    description: 'Đáy ABCD là hình vuông, SO ⊥ (ABCD) tại tâm O'
  },
  {
    id: 'pyramid_perp_quad',
    name: 'Chóp S.ABCD (SA ⊥ đáy)',
    category: 'pyramid',
    description: 'Cạnh bên SA ⊥ (ABCD), đáy là hình vuông / chữ nhật',
    hasBParam: true
  },
  // LĂNG TRỤ & HỘP
  {
    id: 'prism_triangular',
    name: 'Lăng trụ tam giác đều ABC.A\'B\'C\'',
    category: 'prism',
    description: 'Lăng trụ đứng có đáy ABC là tam giác đều'
  },
  {
    id: 'cuboid',
    name: 'Hình hộp chữ nhật / Lập phương',
    category: 'prism',
    description: 'Khối hộp chữ nhật ABCD.A\'B\'C\'D\'',
    hasBParam: true
  },
  // TRÒN XOAY
  {
    id: 'cone',
    name: 'Hình nón tròn xoay',
    category: 'revolution',
    description: 'Đỉnh S, tâm đáy O, đường sinh SA, SB'
  },
  {
    id: 'cylinder',
    name: 'Hình trụ tròn xoay',
    category: 'revolution',
    description: 'Trục OO\', hai đáy là đường tròn tâm O và O\''
  },
  {
    id: 'sphere',
    name: 'Mặt cầu / Khối cầu',
    category: 'revolution',
    description: 'Tâm O, bán kính R, vòng xích đạo và kinh tuyến'
  }
];

interface Interactive3DGeometryEngineProps {
  initialShape?: Shape3DId;
  onInsertImage?: (base64Png: string) => void;
  insertButtonLabel?: string;
  isEmbedModal?: boolean;
}

export const Interactive3DGeometryEngine: React.FC<Interactive3DGeometryEngineProps> = ({
  initialShape = 'pyramid_regular_quad',
  onInsertImage,
  insertButtonLabel = 'Chèn hình vào giáo án / bài giảng',
  isEmbedModal = false
}) => {
  // Active Shape State
  const [activeShapeId, setActiveShapeId] = useState<Shape3DId>(initialShape);
  const activeOption = useMemo(() => {
    return SHAPE_OPTIONS.find(s => s.id === activeShapeId) || SHAPE_OPTIONS[2];
  }, [activeShapeId]);

  // Dimension Sliders
  const [paramH, setParamH] = useState<number>(3.0); // Height h
  const [paramA, setParamA] = useState<number>(2.5); // Base side a / Radius r
  const [paramB, setParamB] = useState<number>(2.0); // Base side b

  // Interactive Feature Toggles
  const [viewMode, setViewMode] = useState<'glass' | 'wireframe' | 'solid'>('glass');
  const [showAltitude, setShowAltitude] = useState<boolean>(true);
  const [showDiagonals, setShowDiagonals] = useState<boolean>(true);
  const [enableSlice, setEnableSlice] = useState<boolean>(false);
  const [sliceProgress, setSliceProgress] = useState<number>(50); // 0% -> 100%
  const [enableUnfold, setEnableUnfold] = useState<boolean>(false);
  const [unfoldProgress, setUnfoldProgress] = useState<number>(0); // 0% -> 100%

  const [tikz3dCopied, setTikz3dCopied] = useState<boolean>(false);

  const handleCopyTikz3D = () => {
    let tikzCode = "";
    const shape = activeOption.id;

    if (shape === 'pyramid_regular_tri') {
      tikzCode = `\\begin{tikzpicture}[scale=1, >=stealth]
\\coordinate (A) at (0,0);
\\coordinate (B) at (3,-1);
\\coordinate (C) at (4.5,0.5);
\\coordinate (O) at (2.5,-0.16);
\\coordinate (S) at (2.5,4);

\\draw[dashed] (A) -- (C) (S) -- (O);
\\draw (A) -- (B) -- (C) (S) -- (A) (S) -- (B) (S) -- (C);

\\node[below left] at (A) {$A$};
\\node[below] at (B) {$B$};
\\node[right] at (C) {$C$};
\\node[below] at (O) {$O$};
\\node[above] at (S) {$S$};
\\end{tikzpicture}`;
    } else if (shape === 'pyramid_perp_tri') {
      tikzCode = `\\begin{tikzpicture}[scale=1, >=stealth]
\\coordinate (A) at (0,0);
\\coordinate (B) at (2.5,-1.2);
\\coordinate (C) at (4.5,0.5);
\\coordinate (S) at (0,4);

\\draw[dashed] (A) -- (C);
\\draw (A) -- (B) -- (C) (S) -- (A) (S) -- (B) (S) -- (C);

\\node[below left] at (A) {$A$};
\\node[below] at (B) {$B$};
\\node[right] at (C) {$C$};
\\node[above] at (S) {$S$};
\\end{tikzpicture}`;
    } else if (shape === 'pyramid_regular_quad') {
      tikzCode = `\\begin{tikzpicture}[scale=1, >=stealth]
\\coordinate (A) at (0,0);
\\coordinate (B) at (3,-1.2);
\\coordinate (C) at (5.2,0);
\\coordinate (D) at (2.2,1.2);
\\coordinate (O) at (2.6,0);
\\coordinate (S) at (2.6,4);

\\draw[dashed] (A) -- (D) -- (C) (A) -- (C) (B) -- (D) (S) -- (O);
\\draw (A) -- (B) -- (C) (S) -- (A) (S) -- (B) (S) -- (C);

\\node[below left] at (A) {$A$};
\\node[below] at (B) {$B$};
\\node[below right] at (C) {$C$};
\\node[above right] at (D) {$D$};
\\node[below] at (O) {$O$};
\\node[above] at (S) {$S$};
\\end{tikzpicture}`;
    } else if (shape === 'pyramid_perp_quad') {
      tikzCode = `\\begin{tikzpicture}[scale=1, >=stealth]
\\coordinate (A) at (0,0);
\\coordinate (B) at (2.8,-1.2);
\\coordinate (C) at (5,0);
\\coordinate (D) at (2.2,1.2);
\\coordinate (S) at (0,4);

\\draw[dashed] (A) -- (D) -- (C) (S) -- (D);
\\draw (A) -- (B) -- (C) (S) -- (A) (S) -- (B) (S) -- (C);

\\node[below left] at (A) {$A$};
\\node[below] at (B) {$B$};
\\node[right] at (C) {$C$};
\\node[above right] at (D) {$D$};
\\node[above] at (S) {$S$};
\\end{tikzpicture}`;
    } else if (shape === 'prism_triangular') {
      tikzCode = `\\begin{tikzpicture}[scale=1, >=stealth]
\\coordinate (A) at (0,0);
\\coordinate (B) at (2.5,-1.2);
\\coordinate (C) at (4.2,0.5);
\\coordinate (A1) at (0,3.5);
\\coordinate (B1) at (2.5,2.3);
\\coordinate (C1) at (4.2,4.0);

\\draw[dashed] (A) -- (C);
\\draw (A) -- (B) -- (C) (A1) -- (B1) -- (C1) -- (A1) (A) -- (A1) (B) -- (B1) (C) -- (C1);

\\node[below left] at (A) {$A$};
\\node[below] at (B) {$B$};
\\node[right] at (C) {$C$};
\\node[above left] at (A1) {$A'$};
\\node[above] at (B1) {$B'$};
\\node[right] at (C1) {$C'$};
\\end{tikzpicture}`;
    } else if (shape === 'cuboid') {
      tikzCode = `\\begin{tikzpicture}[scale=1, >=stealth]
\\coordinate (A) at (0,0);
\\coordinate (B) at (3,-1);
\\coordinate (C) at (5,0);
\\coordinate (D) at (2,1);
\\coordinate (A1) at (0,3.5);
\\coordinate (B1) at (3,2.5);
\\coordinate (C1) at (5,3.5);
\\coordinate (D1) at (2,4.5);

\\draw[dashed] (A) -- (D) -- (C) (D) -- (D1);
\\draw (A) -- (B) -- (C) (A1) -- (B1) -- (C1) -- (D1) -- (A1) (A) -- (A1) (B) -- (B1) (C) -- (C1);

\\node[below left] at (A) {$A$};
\\node[below] at (B) {$B$};
\\node[right] at (C) {$C$};
\\node[above right] at (D) {$D$};
\\node[above left] at (A1) {$A'$};
\\node[below] at (B1) {$B'$};
\\node[right] at (C1) {$C'$};
\\node[above] at (D1) {$D'$};
\\end{tikzpicture}`;
    } else if (shape === 'cone') {
      tikzCode = `\\begin{tikzpicture}[scale=1, >=stealth]
\\coordinate (O) at (0,0);
\\coordinate (S) at (0,3.8);
\\draw[dashed] (2,0) arc (0:180:2cm and 0.6cm);
\\draw (-2,0) arc (180:360:2cm and 0.6cm);
\\draw (-2,0) -- (S) -- (2,0);
\\draw[dashed] (S) -- (O) -- (2,0);

\\node[below] at (O) {$O$};
\\node[above] at (S) {$S$};
\\node[right] at (2,0) {$A$};
\\end{tikzpicture}`;
    } else if (shape === 'cylinder') {
      tikzCode = `\\begin{tikzpicture}[scale=1, >=stealth]
\\coordinate (O) at (0,0);
\\coordinate (O1) at (0,3.5);
\\draw[dashed] (2,0) arc (0:180:2cm and 0.6cm);
\\draw (-2,0) arc (180:360:2cm and 0.6cm);
\\draw (0,3.5) ellipse (2cm and 0.6cm);
\\draw (-2,0) -- (-2,3.5) (2,0) -- (2,3.5);
\\draw[dashed] (O) -- (O1);

\\node[below] at (O) {$O$};
\\node[above] at (O1) {$O'$};
\\end{tikzpicture}`;
    } else {
      tikzCode = `\\begin{tikzpicture}[scale=1, >=stealth]
\\coordinate (O) at (0,0);
\\draw (0,0) circle (2.2cm);
\\draw[dashed] (2.2,0) arc (0:180:2.2cm and 0.7cm);
\\draw (-2.2,0) arc (180:360:2.2cm and 0.7cm);
\\filldraw (O) circle (1.5pt) node[below] {$O$};
\\draw[dashed] (O) -- (2.2,0) node[midway,above] {$R$};
\\end{tikzpicture}`;
    }

    navigator.clipboard.writeText(tikzCode);
    setTikz3dCopied(true);
    setTimeout(() => setTikz3dCopied(false), 2000);
  };

  // Copy Status
  const [copied, setCopied] = useState<boolean>(false);

  // Canvas & Three.js Refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  // Helper to create sharp billboard vertex label
  const createLabelSprite = useCallback((text: string, colorHex: string = '#ffffff', bgHex: string = '#0f172a'): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);
      // Background circle/pill
      ctx.beginPath();
      ctx.arc(64, 64, 46, 0, Math.PI * 2);
      ctx.fillStyle = bgHex;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = colorHex;
      ctx.stroke();

      // Text label
      ctx.font = "bold 56px 'Times New Roman', serif";
      ctx.fillStyle = colorHex;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 66);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.65, 0.65, 1.0);
    return sprite;
  }, []);

  // Helper to build 3D mesh + wireframes + slicing + unfolding
  const buildGeometry = useCallback(() => {
    if (!modelGroupRef.current) return;
    const group = modelGroupRef.current;
    
    // Clear previous children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    const h = paramH;
    const a = paramA;
    const b = paramB;
    const glassOpacity = viewMode === 'glass' ? 0.35 : viewMode === 'solid' ? 0.85 : 0.05;
    const showWire = viewMode === 'wireframe';

    // Materials
    const faceMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald green
      transparent: true,
      opacity: glassOpacity,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
      wireframe: showWire
    });

    const sliceMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan glow
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });

    const edgeColor = 0x34d399; // Emerald edge
    const edgeDashedColor = 0x94a3b8; // Slate dashed edge
    const altitudeColor = 0xef4444; // Red altitude line

    // Unfold angle calculation
    const unfoldAngle = (unfoldProgress / 100) * (Math.PI / 2);

    // Slice plane Y calculation
    const sliceY = (sliceProgress / 100) * h;

    // Helper: Add line segment
    const addLine = (p1: THREE.Vector3, p2: THREE.Vector3, isDashed = false, color = edgeColor) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      if (isDashed) {
        const mat = new THREE.LineDashedMaterial({
          color: color,
          dashSize: 0.15,
          gapSize: 0.1,
          linewidth: 2
        });
        const line = new THREE.Line(geometry, mat);
        line.computeLineDistances();
        group.add(line);
      } else {
        const mat = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
        const line = new THREE.Line(geometry, mat);
        group.add(line);
      }
    };

    // Helper: Add Vertex + Label
    const addVertexLabel = (id: string, pos: THREE.Vector3, colorHex = '#34d399') => {
      // Vertex sphere dot
      const dotGeo = new THREE.SphereGeometry(0.06, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.copy(pos);
      group.add(dotMesh);

      // Label sprite
      const sprite = createLabelSprite(id, colorHex, '#0f172a');
      sprite.position.copy(pos).add(new THREE.Vector3(0, 0.25, 0));
      group.add(sprite);
    };

    // BUILD SHAPES ACCORDING TO ACTIVE SELECTION
    if (activeShapeId === 'pyramid_regular_tri') {
      // Chóp tam giác đều S.ABC (SO ⊥ đáy, O là trọng tâm tam giác đều ABC)
      const R = a / Math.sqrt(3);
      const A = new THREE.Vector3(-a / 2, 0, R / 2);
      const B = new THREE.Vector3(a / 2, 0, R / 2);
      const C = new THREE.Vector3(0, 0, -R);
      const O = new THREE.Vector3(0, 0, 0);
      const S = new THREE.Vector3(0, h, 0);

      // Base Face
      const baseGeo = new THREE.BufferGeometry();
      baseGeo.setFromPoints([A, B, C]);
      baseGeo.computeVertexNormals();
      group.add(new THREE.Mesh(baseGeo, faceMaterial));

      // Lateral Faces with Unfolding Support
      const faces = [
        [A, B, S], // Front face
        [B, C, S], // Right face
        [C, A, S]  // Left face
      ];

      faces.forEach(([P1, P2, Tip]) => {
        const faceGroup = new THREE.Group();
        group.add(faceGroup);

        const edgeDir = new THREE.Vector3().subVectors(P2, P1).normalize();
        const midBase = new THREE.Vector3().addVectors(P1, P2).multiplyScalar(0.5);

        if (enableUnfold && unfoldProgress > 0) {
          // Unfold rotation around base edge
          faceGroup.position.copy(midBase);
          const localP1 = new THREE.Vector3().subVectors(P1, midBase);
          const localP2 = new THREE.Vector3().subVectors(P2, midBase);
          const localTip = new THREE.Vector3().subVectors(Tip, midBase);

          // Rotate localTip outward around edgeDir
          const rotAxis = edgeDir;
          localTip.applyAxisAngle(rotAxis, -unfoldAngle);

          const geo = new THREE.BufferGeometry().setFromPoints([localP1, localP2, localTip]);
          geo.computeVertexNormals();
          faceGroup.add(new THREE.Mesh(geo, faceMaterial));

          const worldTip = localTip.clone().add(midBase);
          addLine(P1, P2, false);
          addLine(P1, worldTip, false);
          addLine(P2, worldTip, false);
        } else {
          const geo = new THREE.BufferGeometry().setFromPoints([P1, P2, Tip]);
          geo.computeVertexNormals();
          group.add(new THREE.Mesh(geo, faceMaterial));
        }
      });

      // Edges
      if (!enableUnfold || unfoldProgress === 0) {
        addLine(A, B, false);
        addLine(B, C, false);
        addLine(C, A, true); // Hidden back base
        addLine(S, A, false);
        addLine(S, B, false);
        addLine(S, C, false);
      }

      if (showAltitude) {
        addLine(S, O, true, altitudeColor);
        addVertexLabel('O', O, '#ef4444');
      }

      // Slicing Plane (Thiết diện)
      if (enableSlice) {
        const ratio = sliceY / h;
        const A_s = new THREE.Vector3().lerpVectors(S, A, 1 - ratio);
        const B_s = new THREE.Vector3().lerpVectors(S, B, 1 - ratio);
        const C_s = new THREE.Vector3().lerpVectors(S, C, 1 - ratio);

        const sliceGeo = new THREE.BufferGeometry().setFromPoints([A_s, B_s, C_s]);
        sliceGeo.computeVertexNormals();
        group.add(new THREE.Mesh(sliceGeo, sliceMaterial));

        addLine(A_s, B_s, false, 0x22d3ee);
        addLine(B_s, C_s, false, 0x22d3ee);
        addLine(C_s, A_s, false, 0x22d3ee);
      }

      // Labels
      addVertexLabel('S', S, '#60a5fa');
      addVertexLabel('A', A);
      addVertexLabel('B', B);
      addVertexLabel('C', C);

    } else if (activeShapeId === 'pyramid_perp_tri') {
      // Chóp S.ABC có SA ⊥ (ABC)
      const A = new THREE.Vector3(-a / 2, 0, -b / 2);
      const B = new THREE.Vector3(a / 2, 0, -b / 2);
      const C = new THREE.Vector3(-a / 2, 0, b / 2);
      const S = new THREE.Vector3(-a / 2, h, -b / 2);

      // Base Face
      const baseGeo = new THREE.BufferGeometry().setFromPoints([A, B, C]);
      baseGeo.computeVertexNormals();
      group.add(new THREE.Mesh(baseGeo, faceMaterial));

      // Lateral Faces
      const faces = [
        [A, B, S],
        [A, C, S],
        [B, C, S]
      ];

      faces.forEach(([P1, P2, Tip]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([P1, P2, Tip]);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, faceMaterial));
      });

      // Edges
      addLine(A, B, true); // Hidden
      addLine(B, C, false);
      addLine(C, A, true); // Hidden
      addLine(S, A, true, altitudeColor); // SA altitude
      addLine(S, B, false);
      addLine(S, C, false);

      if (enableSlice) {
        const ratio = sliceY / h;
        const A_s = new THREE.Vector3().lerpVectors(S, A, 1 - ratio);
        const B_s = new THREE.Vector3().lerpVectors(S, B, 1 - ratio);
        const C_s = new THREE.Vector3().lerpVectors(S, C, 1 - ratio);

        const sliceGeo = new THREE.BufferGeometry().setFromPoints([A_s, B_s, C_s]);
        sliceGeo.computeVertexNormals();
        group.add(new THREE.Mesh(sliceGeo, sliceMaterial));

        addLine(A_s, B_s, false, 0x22d3ee);
        addLine(B_s, C_s, false, 0x22d3ee);
        addLine(C_s, A_s, false, 0x22d3ee);
      }

      addVertexLabel('S', S, '#60a5fa');
      addVertexLabel('A', A, '#ef4444');
      addVertexLabel('B', B);
      addVertexLabel('C', C);

    } else if (activeShapeId === 'pyramid_regular_quad') {
      // Chóp tứ giác đều S.ABCD
      const A = new THREE.Vector3(-a / 2, 0, a / 2);
      const B = new THREE.Vector3(a / 2, 0, a / 2);
      const C = new THREE.Vector3(a / 2, 0, -a / 2);
      const D = new THREE.Vector3(-a / 2, 0, -a / 2);
      const O = new THREE.Vector3(0, 0, 0);
      const S = new THREE.Vector3(0, h, 0);

      // Base
      const baseGeo = new THREE.BufferGeometry().setFromPoints([A, B, C, A, C, D]);
      baseGeo.computeVertexNormals();
      group.add(new THREE.Mesh(baseGeo, faceMaterial));

      // Lateral faces
      const faces = [
        [A, B, S],
        [B, C, S],
        [C, D, S],
        [D, A, S]
      ];

      faces.forEach(([P1, P2, Tip]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([P1, P2, Tip]);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, faceMaterial));
      });

      // Edges
      addLine(A, B, false);
      addLine(B, C, false);
      addLine(C, D, true);
      addLine(D, A, true);
      addLine(S, A, false);
      addLine(S, B, false);
      addLine(S, C, false);
      addLine(S, D, true);

      if (showDiagonals) {
        addLine(A, C, true, edgeDashedColor);
        addLine(B, D, true, edgeDashedColor);
      }

      if (showAltitude) {
        addLine(S, O, true, altitudeColor);
        addVertexLabel('O', O, '#ef4444');
      }

      if (enableSlice) {
        const ratio = sliceY / h;
        const A_s = new THREE.Vector3().lerpVectors(S, A, 1 - ratio);
        const B_s = new THREE.Vector3().lerpVectors(S, B, 1 - ratio);
        const C_s = new THREE.Vector3().lerpVectors(S, C, 1 - ratio);
        const D_s = new THREE.Vector3().lerpVectors(S, D, 1 - ratio);

        const sliceGeo = new THREE.BufferGeometry().setFromPoints([A_s, B_s, C_s, A_s, C_s, D_s]);
        sliceGeo.computeVertexNormals();
        group.add(new THREE.Mesh(sliceGeo, sliceMaterial));

        addLine(A_s, B_s, false, 0x22d3ee);
        addLine(B_s, C_s, false, 0x22d3ee);
        addLine(C_s, D_s, false, 0x22d3ee);
        addLine(D_s, A_s, false, 0x22d3ee);
      }

      addVertexLabel('S', S, '#60a5fa');
      addVertexLabel('A', A);
      addVertexLabel('B', B);
      addVertexLabel('C', C);
      addVertexLabel('D', D);

    } else if (activeShapeId === 'pyramid_perp_quad') {
      // Chóp S.ABCD (SA ⊥ ABCD, đáy chữ nhật a x b)
      const A = new THREE.Vector3(-a / 2, 0, -b / 2);
      const B = new THREE.Vector3(a / 2, 0, -b / 2);
      const C = new THREE.Vector3(a / 2, 0, b / 2);
      const D = new THREE.Vector3(-a / 2, 0, b / 2);
      const S = new THREE.Vector3(-a / 2, h, -b / 2);

      const baseGeo = new THREE.BufferGeometry().setFromPoints([A, B, C, A, C, D]);
      baseGeo.computeVertexNormals();
      group.add(new THREE.Mesh(baseGeo, faceMaterial));

      const faces = [
        [A, B, S],
        [B, C, S],
        [C, D, S],
        [D, A, S]
      ];

      faces.forEach(([P1, P2, Tip]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([P1, P2, Tip]);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, faceMaterial));
      });

      addLine(A, B, true);
      addLine(B, C, false);
      addLine(C, D, false);
      addLine(D, A, true);
      addLine(S, A, true, altitudeColor);
      addLine(S, B, false);
      addLine(S, C, false);
      addLine(S, D, false);

      if (enableSlice) {
        const ratio = sliceY / h;
        const A_s = new THREE.Vector3().lerpVectors(S, A, 1 - ratio);
        const B_s = new THREE.Vector3().lerpVectors(S, B, 1 - ratio);
        const C_s = new THREE.Vector3().lerpVectors(S, C, 1 - ratio);
        const D_s = new THREE.Vector3().lerpVectors(S, D, 1 - ratio);

        const sliceGeo = new THREE.BufferGeometry().setFromPoints([A_s, B_s, C_s, A_s, C_s, D_s]);
        sliceGeo.computeVertexNormals();
        group.add(new THREE.Mesh(sliceGeo, sliceMaterial));

        addLine(A_s, B_s, false, 0x22d3ee);
        addLine(B_s, C_s, false, 0x22d3ee);
        addLine(C_s, D_s, false, 0x22d3ee);
        addLine(D_s, A_s, false, 0x22d3ee);
      }

      addVertexLabel('S', S, '#60a5fa');
      addVertexLabel('A', A, '#ef4444');
      addVertexLabel('B', B);
      addVertexLabel('C', C);
      addVertexLabel('D', D);

    } else if (activeShapeId === 'prism_triangular') {
      // Lăng trụ tam giác đều ABC.A'B'C'
      const R = a / Math.sqrt(3);
      const A = new THREE.Vector3(-a / 2, 0, R / 2);
      const B = new THREE.Vector3(a / 2, 0, R / 2);
      const C = new THREE.Vector3(0, 0, -R);

      const A1 = new THREE.Vector3(-a / 2, h, R / 2);
      const B1 = new THREE.Vector3(a / 2, h, R / 2);
      const C1 = new THREE.Vector3(0, h, -R);

      // Bottom & Top bases
      const bGeo = new THREE.BufferGeometry().setFromPoints([A, B, C]);
      bGeo.computeVertexNormals();
      group.add(new THREE.Mesh(bGeo, faceMaterial));

      const tGeo = new THREE.BufferGeometry().setFromPoints([A1, B1, C1]);
      tGeo.computeVertexNormals();
      group.add(new THREE.Mesh(tGeo, faceMaterial));

      // Lateral faces
      const latFaces = [
        [A, B, B1, A, B1, A1],
        [B, C, C1, B, C1, B1],
        [C, A, A1, C, A1, C1]
      ];

      latFaces.forEach((pts) => {
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, faceMaterial));
      });

      // Edges
      addLine(A, B, false);
      addLine(B, C, false);
      addLine(C, A, true); // Hidden back
      addLine(A1, B1, false);
      addLine(B1, C1, false);
      addLine(C1, A1, false);
      addLine(A, A1, false);
      addLine(B, B1, false);
      addLine(C, C1, true); // Hidden vertical

      if (enableSlice) {
        const ratio = sliceY / h;
        const A_s = new THREE.Vector3().lerpVectors(A, A1, ratio);
        const B_s = new THREE.Vector3().lerpVectors(B, B1, ratio);
        const C_s = new THREE.Vector3().lerpVectors(C, C1, ratio);

        const sliceGeo = new THREE.BufferGeometry().setFromPoints([A_s, B_s, C_s]);
        sliceGeo.computeVertexNormals();
        group.add(new THREE.Mesh(sliceGeo, sliceMaterial));

        addLine(A_s, B_s, false, 0x22d3ee);
        addLine(B_s, C_s, false, 0x22d3ee);
        addLine(C_s, A_s, false, 0x22d3ee);
      }

      addVertexLabel('A', A);
      addVertexLabel('B', B);
      addVertexLabel('C', C);
      addVertexLabel("A'", A1);
      addVertexLabel("B'", B1);
      addVertexLabel("C'", C1);

    } else if (activeShapeId === 'cuboid') {
      // Hình hộp chữ nhật / Lập phương ABCD.A'B'C'D'
      const A = new THREE.Vector3(-a / 2, 0, b / 2);
      const B = new THREE.Vector3(a / 2, 0, b / 2);
      const C = new THREE.Vector3(a / 2, 0, -b / 2);
      const D = new THREE.Vector3(-a / 2, 0, -b / 2);

      const A1 = new THREE.Vector3(-a / 2, h, b / 2);
      const B1 = new THREE.Vector3(a / 2, h, b / 2);
      const C1 = new THREE.Vector3(a / 2, h, -b / 2);
      const D1 = new THREE.Vector3(-a / 2, h, -b / 2);

      const boxGeo = new THREE.BoxGeometry(a, h, b);
      const boxMesh = new THREE.Mesh(boxGeo, faceMaterial);
      boxMesh.position.set(0, h / 2, 0);
      group.add(boxMesh);

      // Edges
      addLine(A, B, false);
      addLine(B, C, false);
      addLine(C, D, true);
      addLine(D, A, true);

      addLine(A1, B1, false);
      addLine(B1, C1, false);
      addLine(C1, D1, false);
      addLine(D1, A1, false);

      addLine(A, A1, false);
      addLine(B, B1, false);
      addLine(C, C1, false);
      addLine(D, D1, true);

      if (enableSlice) {
        const ratio = sliceY / h;
        const A_s = new THREE.Vector3().lerpVectors(A, A1, ratio);
        const B_s = new THREE.Vector3().lerpVectors(B, B1, ratio);
        const C_s = new THREE.Vector3().lerpVectors(C, C1, ratio);
        const D_s = new THREE.Vector3().lerpVectors(D, D1, ratio);

        const sliceGeo = new THREE.BufferGeometry().setFromPoints([A_s, B_s, C_s, A_s, C_s, D_s]);
        sliceGeo.computeVertexNormals();
        group.add(new THREE.Mesh(sliceGeo, sliceMaterial));

        addLine(A_s, B_s, false, 0x22d3ee);
        addLine(B_s, C_s, false, 0x22d3ee);
        addLine(C_s, D_s, false, 0x22d3ee);
        addLine(D_s, A_s, false, 0x22d3ee);
      }

      addVertexLabel('A', A);
      addVertexLabel('B', B);
      addVertexLabel('C', C);
      addVertexLabel('D', D);
      addVertexLabel("A'", A1);
      addVertexLabel("B'", B1);
      addVertexLabel("C'", C1);
      addVertexLabel("D'", D1);

    } else if (activeShapeId === 'cone') {
      // Hình nón (Đỉnh S, tâm O, bán kính R = a)
      const R = a;
      const S = new THREE.Vector3(0, h, 0);
      const O = new THREE.Vector3(0, 0, 0);
      const A = new THREE.Vector3(-R, 0, 0);
      const B = new THREE.Vector3(R, 0, 0);

      const coneGeo = new THREE.ConeGeometry(R, h, 32);
      const coneMesh = new THREE.Mesh(coneGeo, faceMaterial);
      coneMesh.position.set(0, h / 2, 0);
      group.add(coneMesh);

      // Outline generators
      addLine(S, A, false);
      addLine(S, B, false);

      if (showAltitude) {
        addLine(S, O, true, altitudeColor);
        addLine(O, A, true, edgeDashedColor);
        addVertexLabel('O', O, '#ef4444');
      }

      // Base circle wireframe
      const circlePts: THREE.Vector3[] = [];
      for (let i = 0; i <= 32; i++) {
        const theta = (i / 32) * Math.PI * 2;
        circlePts.push(new THREE.Vector3(R * Math.cos(theta), 0, R * Math.sin(theta)));
      }
      for (let i = 0; i < 32; i++) {
        const isBack = circlePts[i].z < 0;
        addLine(circlePts[i], circlePts[i + 1], isBack);
      }

      if (enableSlice) {
        const rSlice = R * (1 - sliceY / h);
        const slicePts: THREE.Vector3[] = [];
        for (let i = 0; i <= 32; i++) {
          const theta = (i / 32) * Math.PI * 2;
          slicePts.push(new THREE.Vector3(rSlice * Math.cos(theta), sliceY, rSlice * Math.sin(theta)));
        }
        const sliceCircleGeo = new THREE.BufferGeometry().setFromPoints(slicePts);
        group.add(new THREE.Line(sliceCircleGeo, new THREE.LineBasicMaterial({ color: 0x22d3ee, linewidth: 3 })));
      }

      addVertexLabel('S', S, '#60a5fa');
      addVertexLabel('A', A);
      addVertexLabel('B', B);

    } else if (activeShapeId === 'cylinder') {
      // Hình trụ (Trục OO', bán kính R = a)
      const R = a;
      const O = new THREE.Vector3(0, 0, 0);
      const O1 = new THREE.Vector3(0, h, 0);
      const A = new THREE.Vector3(-R, 0, 0);
      const B = new THREE.Vector3(R, 0, 0);
      const A1 = new THREE.Vector3(-R, h, 0);
      const B1 = new THREE.Vector3(R, h, 0);

      const cylGeo = new THREE.CylinderGeometry(R, R, h, 32);
      const cylMesh = new THREE.Mesh(cylGeo, faceMaterial);
      cylMesh.position.set(0, h / 2, 0);
      group.add(cylMesh);

      // Generators
      addLine(A1, A, false);
      addLine(B1, B, false);

      if (showAltitude) {
        addLine(O1, O, true, altitudeColor);
        addLine(O, A, true, edgeDashedColor);
        addVertexLabel('O', O, '#ef4444');
        addVertexLabel("O'", O1, '#ef4444');
      }

      // Base circles
      const botCirclePts: THREE.Vector3[] = [];
      const topCirclePts: THREE.Vector3[] = [];
      for (let i = 0; i <= 32; i++) {
        const theta = (i / 32) * Math.PI * 2;
        botCirclePts.push(new THREE.Vector3(R * Math.cos(theta), 0, R * Math.sin(theta)));
        topCirclePts.push(new THREE.Vector3(R * Math.cos(theta), h, R * Math.sin(theta)));
      }
      for (let i = 0; i < 32; i++) {
        const isBack = botCirclePts[i].z < 0;
        addLine(botCirclePts[i], botCirclePts[i + 1], isBack);
        addLine(topCirclePts[i], topCirclePts[i + 1], false);
      }

      addVertexLabel('A', A);
      addVertexLabel('B', B);
      addVertexLabel("A'", A1);
      addVertexLabel("B'", B1);

    } else if (activeShapeId === 'sphere') {
      // Mặt cầu (Tâm O, bán kính R = a)
      const R = a;
      const O = new THREE.Vector3(0, R, 0);
      const A = new THREE.Vector3(-R, R, 0);
      const B = new THREE.Vector3(R, R, 0);

      const sphereGeo = new THREE.SphereGeometry(R, 32, 32);
      const sphereMesh = new THREE.Mesh(sphereGeo, faceMaterial);
      sphereMesh.position.set(0, R, 0);
      group.add(sphereMesh);

      // Equator & Meridian Wireframe circles
      const eqPts: THREE.Vector3[] = [];
      const merPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 32; i++) {
        const theta = (i / 32) * Math.PI * 2;
        eqPts.push(new THREE.Vector3(R * Math.cos(theta), R, R * Math.sin(theta)));
        merPts.push(new THREE.Vector3(R * Math.cos(theta), R + R * Math.sin(theta), 0));
      }
      for (let i = 0; i < 32; i++) {
        const isBack = eqPts[i].z < 0;
        addLine(eqPts[i], eqPts[i + 1], isBack, 0x38bdf8);
        addLine(merPts[i], merPts[i + 1], false, 0x38bdf8);
      }

      if (showAltitude) {
        addLine(O, A, true, altitudeColor);
      }

      addVertexLabel('O', O, '#ef4444');
      addVertexLabel('A', A);
      addVertexLabel('B', B);
    }
  }, [
    activeShapeId, paramH, paramA, paramB, viewMode, showAltitude, 
    showDiagonals, enableSlice, sliceProgress, enableUnfold, unfoldProgress, createLabelSprite
  ]);

  // INITIALIZE THREE.JS SCENE + ORBITCONTROLS
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Dark gradient background
    scene.background = new THREE.Color(0x0f172a); // Slate-900

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.8);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.2, 0);
    controls.update();
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(8, 12, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight2.position.set(-8, -5, -8);
    scene.add(dirLight2);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(12, 24, 0x334155, 0x1e293b);
    gridHelper.position.set(0, 0, 0);
    scene.add(gridHelper);

    // Model Parent Group
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

    // Resize listener
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

  // Re-build geometry whenever params change
  useEffect(() => {
    buildGeometry();
  }, [buildGeometry]);

  // RESET CAMERA TO TEXTBOOK STANDARD OBLIQUE POSE
  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(4.5, 3.2, 5.8);
      controlsRef.current.target.set(0, 1.2, 0);
      controlsRef.current.update();
    }
  };

  // CAPTURE HIGH-RES TRANSPARENT PNG
  const handleCapturePng = (downloadOnly = false) => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    // Save current bg
    const origBg = scene.background;
    scene.background = null; // Transparent

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    // Restore bg
    scene.background = origBg;

    if (downloadOnly || !onInsertImage) {
      const link = document.createElement('a');
      link.download = `3d_geometry_${activeShapeId}.png`;
      link.href = dataUrl;
      link.click();
    } else {
      onInsertImage(dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full h-full">
      {/* HEADER TOOLBAR */}
      <div className="bg-slate-950/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-md shadow-emerald-500/20">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              Mô Phỏng Hình Học Không Gian 3D Tương Tác
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Three.js WebGL
              </span>
            </h2>
            <p className="text-xs text-slate-400 hidden sm:block">
              Xoay 360°, phóng to/thu nhỏ, thay đổi kích thước, tạo thiết diện & trải phẳng (Style Cabri 3D)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyTikz3D}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
            title="Sao chép mã TikZ LaTeX hình không gian 3D"
          >
            {tikz3dCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-extrabold">Đã chép TikZ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-purple-600" />
                <span>Copy TikZ</span>
              </>
            )}
          </button>

          <button
            onClick={handleResetCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Khôi phục vị trí camera góc nhìn SGK"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Reset góc nhìn</span>
          </button>

          <button
            onClick={() => handleCapturePng(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Tải ảnh PNG trong suốt không nền"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Tải ảnh PNG trong suốt</span>
          </button>

          {onInsertImage && (
            <button
              onClick={() => handleCapturePng(false)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
              <span>{insertButtonLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN BODY: CONTROL PANEL (LEFT) + 3D VIEWPORT (RIGHT) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: SHAPE SELECTION & CONTROLS */}
        <div className="lg:col-span-4 bg-slate-950/60 p-4 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto space-y-4 custom-scrollbar">
          {/* SHAPE CATEGORY TABS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>1. Chọn loại khối hình 3D (SGK)</span>
              <span className="text-emerald-400 font-normal text-[11px]">{activeOption.name}</span>
            </label>

            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1 bg-slate-900 rounded-xl border border-slate-800">
              {SHAPE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setActiveShapeId(opt.id)}
                  className={`flex items-start text-left p-2 rounded-lg transition-all text-xs cursor-pointer ${
                    activeShapeId === opt.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium">{opt.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PARAMETRIC DIMENSION SLIDERS */}
          <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Tùy chỉnh kích thước hình</span>
            </label>

            {/* Slider Height h */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>Chiều cao $h$:</span>
                <span className="text-emerald-400 font-mono font-bold">{paramH.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={paramH}
                onChange={e => setParamH(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Slider Base Side a / Radius r */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>
                  {activeOption.category === 'revolution' ? 'Bán kính đáy $R$:' : 'Cạnh đáy $a$:'}
                </span>
                <span className="text-emerald-400 font-mono font-bold">{paramA.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.5"
                step="0.1"
                value={paramA}
                onChange={e => setParamA(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Slider Base Side b (if applicable) */}
            {activeOption.hasBParam && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300 font-medium">
                  <span>Cạnh đáy $b$:</span>
                  <span className="text-emerald-400 font-mono font-bold">{paramB.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.5"
                  step="0.1"
                  value={paramB}
                  onChange={e => setParamB(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* VIEW MODES & TOGGLES */}
          <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>3. Hiển thị & Chế độ quan sát</span>
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
                Khung dây
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
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAltitude}
                  onChange={e => setShowAltitude(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span>Hiện đường cao $SO$ / Trục $OO'$ (Màu đỏ)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDiagonals}
                  onChange={e => setShowDiagonals(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span>Hiện đường chéo đáy / Đường phụ</span>
              </label>
            </div>
          </div>

          {/* ADVANCED CABRI 3D FEATURES: CUTTING PLANE & UNFOLDING */}
          <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-teal-400" />
              <span>4. Tính năng giảng dạy Cabri 3D nâng cao</span>
            </label>

            {/* Slicing Plane Toggle & Slider */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={enableSlice}
                  onChange={e => setEnableSlice(e.target.checked)}
                  className="rounded accent-cyan-500"
                />
                <span className="text-cyan-300 font-semibold">Tạo mặt phẳng cắt (Thiết diện)</span>
              </label>

              {enableSlice && (
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

            {/* Unfolding / Netting (if Pyramid) */}
            {activeOption.category === 'pyramid' && (
              <div className="space-y-2 border-t border-slate-800 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={enableUnfold}
                    onChange={e => setEnableUnfold(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span className="text-emerald-300 font-semibold">Trải phẳng mặt xung quanh (Netting)</span>
                </label>

                {enableUnfold && (
                  <div className="pl-5 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Mở trải phẳng ra mặt đáy:</span>
                      <span className="text-emerald-400 font-mono">{unfoldProgress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={unfoldProgress}
                      onChange={e => setUnfoldProgress(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 3D THREE.JS CANVAS VIEWPORT */}
        <div className="lg:col-span-8 bg-slate-900 relative flex flex-col items-center justify-center min-h-[460px] lg:min-h-full">
          {/* Canvas Mount */}
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Floating Instruction overlay */}
          <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Kéo chuột trái: <b>Xoay 360°</b> | Con lăn: <b>Zoom</b> | Chuột phải: <b>Trượt góc</b></span>
          </div>

          {/* Bottom Watermark Standard Badge */}
          <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-mono">
            SGK GDPT 2018 • Quy ước: Nét đứt (khuất) | Nét liền (nhìn thấy)
          </div>
        </div>
      </div>
    </div>
  );
};
