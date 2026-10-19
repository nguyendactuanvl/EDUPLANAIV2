import React, { useRef, useEffect, useState, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import jsPDF from 'jspdf';
import { 
  InkTool, ShapeType, BackgroundType, Point, Stroke, 
  BoardPage, TextNote, RulerState, Interactive3DObject, Shape3DKind 
} from './types';
import { detectShape, distance } from './shapeRecognition';
import { VirtualRuler } from './VirtualRuler';
import { PageThumbnailsDrawer } from './PageThumbnailsDrawer';
import { EduPlanInkToolbar } from './EduPlanInkToolbar';
import { Shape3DLibraryModal } from './Shape3DLibraryModal';
import { Object3DRotationToolbar } from './Object3DRotationToolbar';
import { render3DShapeOnCanvas } from './render3DShape';
import { MathView } from '../MathView';
import { X, Check, Loader2, FileText, Sparkles, FolderOpen } from 'lucide-react';
import { renderPdfPageRange, getPdfTotalPages } from '../../lib/pdfUtils';

export const EduPlanInkBoard: React.FC = () => {
  // Canvas Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas Dimensions
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Navigation & Page State
  const [pages, setPages] = useState<BoardPage[]>([
    {
      id: 'page-1',
      title: 'Trang 1',
      backgroundType: 'green_board',
      strokes: [],
      texts: [],
      undoStack: [],
      redoStack: []
    }
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Active Tools & Pen Config
  const [activeTool, setActiveTool] = useState<InkTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#ffffff'); // Default white for green board
  const [strokeSize, setStrokeSize] = useState<number>(4);
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>('solid');
  const [shapeType, setShapeType] = useState<ShapeType>('auto');
  const [penOnlyTouch, setPenOnlyTouch] = useState<boolean>(true); // Palm Rejection default ON

  // Viewport Pan & Zoom
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Background Image Cache & PDF Loading
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfLoadingStatus, setPdfLoadingStatus] = useState<string>('');

  // Virtual Ruler
  const [rulerState, setRulerState] = useState<RulerState>({
    enabled: false,
    x: 100,
    y: 200,
    width: 600,
    angle: 0
  });

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 3D Library & Interactive Object States
  const [is3DLibraryOpen, setIs3DLibraryOpen] = useState(false);
  const [selected3DId, setSelected3DId] = useState<string | null>(null);

  // 3D Object Drag & Trackball Gesture state
  const isInteracting3D = useRef(false);
  const isRotating3DGesture = useRef(false);
  const last3DPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Text & Formula Modal
  const [textModalState, setTextModalState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    text: string;
    isMath: boolean;
    editingId?: string;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    text: '',
    isMath: false
  });

  // Active Drawing State
  const isDrawing = useRef(false);
  const currentPoints = useRef<Point[]>([]);
  const laserTrail = useRef<{ x: number; y: number; time: number }[]>([]);
  const animFrameId = useRef<number | null>(null);

  // Hold Timer for Smart Shape Recognition
  const holdTimer = useRef<any>(null);
  const lastPointTime = useRef<number>(0);

  // Pan / Pinch state
  const isPanning = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  const currentPage = pages[currentPageIndex] || pages[0];

  // Adjust background color default based on board type
  useEffect(() => {
    if (currentPage.backgroundType === 'green_board' || currentPage.backgroundType === 'blackboard') {
      if (currentColor === '#0f172a' || currentColor === '#2563eb') {
        setCurrentColor('#ffffff');
      }
    } else {
      if (currentColor === '#ffffff') {
        setCurrentColor('#0f172a');
      }
    }
  }, [currentPage.backgroundType]);

  // Window Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        setDimensions({ width: w, height: h });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update canvas DPR and size
  useEffect(() => {
    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;

    [bgCanvasRef, staticCanvasRef, activeCanvasRef].forEach((ref) => {
      if (ref.current) {
        ref.current.width = width * dpr;
        ref.current.height = height * dpr;
        ref.current.style.width = `${width}px`;
        ref.current.style.height = `${height}px`;
        const ctx = ref.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    });

    renderBackground();
    renderStaticStrokes();
  }, [dimensions, currentPageIndex, pages, scale, panX, panY]);

  // Render Background Layer
  const renderBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    const bgType = currentPage.backgroundType;

    if (bgType === 'green_board') {
      ctx.fillStyle = '#0d382c';
      ctx.fillRect(-panX / scale, -panY / scale, width / scale, height / scale);

      // Grid lines
      ctx.strokeStyle = '#1a5343';
      ctx.lineWidth = 0.8;
      const gridSize = 40;
      for (let x = -gridSize * 20; x < width * 2; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -gridSize * 20);
        ctx.lineTo(x, height * 2);
        ctx.stroke();
      }
      for (let y = -gridSize * 20; y < height * 2; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-gridSize * 20, y);
        ctx.lineTo(width * 2, y);
        ctx.stroke();
      }
    } else if (bgType === 'blackboard') {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-panX / scale, -panY / scale, width / scale, height / scale);

      // Dots grid
      ctx.fillStyle = '#27272a';
      const gridSize = 32;
      for (let x = -gridSize * 20; x < width * 2; x += gridSize) {
        for (let y = -gridSize * 20; y < height * 2; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bgType === 'whiteboard') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-panX / scale, -panY / scale, width / scale, height / scale);

      ctx.fillStyle = '#cbd5e1';
      const gridSize = 32;
      for (let x = -gridSize * 20; x < width * 2; x += gridSize) {
        for (let y = -gridSize * 20; y < height * 2; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bgType === 'grid_paper') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-panX / scale, -panY / scale, width / scale, height / scale);

      // Student Grid (Caro)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.8;
      const gridSize = 24;
      for (let x = -gridSize * 20; x < width * 2; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -gridSize * 20);
        ctx.lineTo(x, height * 2);
        ctx.stroke();
      }
      for (let y = -gridSize * 20; y < height * 2; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-gridSize * 20, y);
        ctx.lineTo(width * 2, y);
        ctx.stroke();
      }
      // Margin line
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(60, -gridSize * 20);
      ctx.lineTo(60, height * 2);
      ctx.stroke();
    } else if (bgType === 'lines_paper') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-panX / scale, -panY / scale, width / scale, height / scale);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      const lineSpacing = 32;
      for (let y = -lineSpacing * 20; y < height * 2; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(-lineSpacing * 20, y);
        ctx.lineTo(width * 2, y);
        ctx.stroke();
      }
    } else if (bgType === 'custom' && currentPage.customBgUrl) {
      // 1. Phông nền tối êm dịu bao quanh trang tài liệu
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-panX / scale, -panY / scale, width / scale, height / scale);

      let img = imageCache.current.get(currentPage.customBgUrl);
      if (!img) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          renderBackground();
          renderStaticStrokes();
        };
        img.src = currentPage.customBgUrl;
        imageCache.current.set(currentPage.customBgUrl, img);
      }

      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const aspect = img.naturalWidth / img.naturalHeight;
        let docW: number;
        let docH: number;

        if (aspect >= 1) {
          // Khổ ngang (slide bài giảng, ảnh ngang)
          docW = Math.max(900, Math.min(1600, width * 0.95));
          docH = docW / aspect;
        } else {
          // Khổ dọc (trang PDF, đề thi, phiếu bài tập khổ A4)
          docW = Math.max(820, Math.min(1150, width * 0.85));
          docH = docW / aspect;
        }

        // Căn giữa trang giấy trên bảng vẽ theo chiều ngang
        const docX = Math.max(40, (width - docW) / 2);
        const docY = 40;

        // Đổ bóng chân thực cho trang giấy
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(docX, docY, docW, docH);
        ctx.restore();

        // Vẽ nội dung trang PDF / Ảnh lên trang giấy
        ctx.drawImage(img, docX, docY, docW, docH);

        // Viền trang giấy thanh lịch
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(docX, docY, docW, docH);
      }
    }

    ctx.restore();
  }, [currentPage.backgroundType, currentPage.customBgUrl, dimensions, panX, panY, scale]);

  // Render Vector Stroke using perfect-freehand or Path
  const renderSingleStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.shapeData) {
      // Render Recognized Geometric Shape
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.globalAlpha = stroke.opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (stroke.lineStyle === 'dashed') {
        ctx.setLineDash([8, 6]);
      }

      const { type, p1, p2, p3 } = stroke.shapeData;
      ctx.beginPath();

      if (type === 'line') {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      } else if (type === 'arrow') {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        const headlen = 16;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6));
      } else if (type === 'rect') {
        const w = p2.x - p1.x;
        const h = p2.y - p1.y;
        ctx.strokeRect(p1.x, p1.y, w, h);
      } else if (type === 'triangle' && p3) {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
      } else if (type === 'circle') {
        const radius = distance(p1, p2);
        ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
      } else if (type === 'coordinate_axes') {
        // Draw Oxy axes
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.max(30, Math.abs(p2.x - p1.x) / 2);
        const ry = Math.max(30, Math.abs(p2.y - p1.y) / 2);

        // X axis
        ctx.moveTo(cx - rx, cy);
        ctx.lineTo(cx + rx, cy);
        ctx.lineTo(cx + rx - 8, cy - 5);
        ctx.moveTo(cx + rx, cy);
        ctx.lineTo(cx + rx - 8, cy + 5);

        // Y axis
        ctx.moveTo(cx, cy + ry);
        ctx.lineTo(cx, cy - ry);
        ctx.lineTo(cx - 5, cy - ry + 8);
        ctx.moveTo(cx, cy - ry);
        ctx.lineTo(cx + 5, cy - ry + 8);

        ctx.stroke();
        ctx.font = '12px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText('O', cx - 12, cy + 14);
        ctx.fillText('x', cx + rx - 6, cy + 16);
        ctx.fillText('y', cx + 10, cy - ry + 10);
      } 
      // --- 3D SPATIAL GEOMETRIC SHAPES (HÌNH KHÔNG GIAN) ---
      else if (type === 'tetrahedron') {
        // Tứ diện S.ABC
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const w = Math.max(60, maxX - minX);
        const h = Math.max(60, maxY - minY);

        const S = { x: minX + w * 0.5, y: minY };
        const A = { x: minX + w * 0.15, y: maxY - h * 0.25 };
        const B = { x: minX + w * 0.45, y: maxY };
        const C = { x: minX + w, y: maxY - h * 0.25 };

        // Solid edges
        ctx.moveTo(S.x, S.y); ctx.lineTo(A.x, A.y);
        ctx.moveTo(S.x, S.y); ctx.lineTo(B.x, B.y);
        ctx.moveTo(S.x, S.y); ctx.lineTo(C.x, C.y);
        ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
        ctx.moveTo(B.x, B.y); ctx.lineTo(C.x, C.y);
        ctx.stroke();

        // Dashed hidden edge A-C
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(A.x, A.y); ctx.lineTo(C.x, C.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText('S', S.x - 4, S.y - 6);
        ctx.fillText('A', A.x - 14, A.y + 4);
        ctx.fillText('B', B.x - 4, B.y + 16);
        ctx.fillText('C', C.x + 6, C.y + 4);
      } else if (type === 'pyramid_square') {
        // Hình chóp tứ giác S.ABCD
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const w = Math.max(70, maxX - minX);
        const h = Math.max(70, maxY - minY);

        const S = { x: minX + w * 0.5, y: minY };
        const A = { x: minX + w * 0.25, y: minY + h * 0.55 };
        const B = { x: minX + w * 0.9, y: minY + h * 0.55 };
        const C = { x: minX + w * 0.7, y: maxY };
        const D = { x: minX, y: maxY };

        // Solid edges
        ctx.moveTo(S.x, S.y); ctx.lineTo(B.x, B.y);
        ctx.moveTo(S.x, S.y); ctx.lineTo(C.x, C.y);
        ctx.moveTo(S.x, S.y); ctx.lineTo(D.x, D.y);
        ctx.moveTo(B.x, B.y); ctx.lineTo(C.x, C.y);
        ctx.moveTo(C.x, C.y); ctx.lineTo(D.x, D.y);
        ctx.stroke();

        // Dashed hidden edges S-A, A-B, A-D
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(S.x, S.y); ctx.lineTo(A.x, A.y);
        ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
        ctx.moveTo(A.x, A.y); ctx.lineTo(D.x, D.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText('S', S.x - 4, S.y - 6);
        ctx.fillText('A', A.x - 12, A.y - 4);
        ctx.fillText('B', B.x + 6, B.y - 4);
        ctx.fillText('C', C.x + 6, C.y + 14);
        ctx.fillText('D', D.x - 14, D.y + 14);
      } else if (type === 'frustum') {
        // Hình chóp cụt ABCD.A'B'C'D'
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const w = Math.max(70, maxX - minX);
        const h = Math.max(70, maxY - minY);

        // Top base A'B'C'D'
        const A2 = { x: minX + w * 0.3, y: minY + h * 0.15 };
        const B2 = { x: minX + w * 0.75, y: minY + h * 0.15 };
        const C2 = { x: minX + w * 0.6, y: minY + h * 0.4 };
        const D2 = { x: minX + w * 0.15, y: minY + h * 0.4 };

        // Bottom base ABCD
        const A1 = { x: minX + w * 0.2, y: minY + h * 0.65 };
        const B1 = { x: minX + w * 0.95, y: minY + h * 0.65 };
        const C1 = { x: minX + w * 0.75, y: maxY };
        const D1 = { x: minX, y: maxY };

        // Solid edges
        ctx.moveTo(A2.x, A2.y); ctx.lineTo(B2.x, B2.y); ctx.lineTo(C2.x, C2.y); ctx.lineTo(D2.x, D2.y); ctx.lineTo(A2.x, A2.y);
        ctx.moveTo(B1.x, B1.y); ctx.lineTo(C1.x, C1.y); ctx.lineTo(D1.x, D1.y);
        ctx.moveTo(B2.x, B2.y); ctx.lineTo(B1.x, B1.y);
        ctx.moveTo(C2.x, C2.y); ctx.lineTo(C1.x, C1.y);
        ctx.moveTo(D2.x, D2.y); ctx.lineTo(D1.x, D1.y);
        ctx.stroke();

        // Dashed hidden edges A1-A2, A1-B1, A1-D1
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(A2.x, A2.y); ctx.lineTo(A1.x, A1.y);
        ctx.moveTo(A1.x, A1.y); ctx.lineTo(B1.x, B1.y);
        ctx.moveTo(A1.x, A1.y); ctx.lineTo(D1.x, D1.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText("A'", A2.x - 12, A2.y - 4);
        ctx.fillText("B'", B2.x + 4, B2.y - 4);
        ctx.fillText("C'", C2.x + 6, C2.y + 4);
        ctx.fillText("D'", D2.x - 14, D2.y + 4);

        ctx.fillText('A', A1.x - 12, A1.y - 4);
        ctx.fillText('B', B1.x + 6, B1.y - 4);
        ctx.fillText('C', C1.x + 6, C1.y + 14);
        ctx.fillText('D', D1.x - 14, D1.y + 14);
      } else if (type === 'cuboid') {
        // Hình hộp 3D / Lập phương
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const w = Math.max(70, maxX - minX);
        const h = Math.max(70, maxY - minY);

        const dx = w * 0.3;
        const dy = -h * 0.3;

        const A1 = { x: minX, y: minY + h * 0.35 };
        const B1 = { x: minX + w * 0.7, y: minY + h * 0.35 };
        const C1 = { x: minX + w * 0.7, y: maxY };
        const D1 = { x: minX, y: maxY };

        const A2 = { x: A1.x + dx, y: A1.y + dy };
        const B2 = { x: B1.x + dx, y: B1.y + dy };
        const C2 = { x: C1.x + dx, y: C1.y + dy };
        const D2 = { x: D1.x + dx, y: D1.y + dy };

        // Solid front & visible sides
        ctx.moveTo(A1.x, A1.y); ctx.lineTo(B1.x, B1.y);
        ctx.lineTo(C1.x, C1.y); ctx.lineTo(D1.x, D1.y); ctx.lineTo(A1.x, A1.y);
        ctx.moveTo(B1.x, B1.y); ctx.lineTo(B2.x, B2.y);
        ctx.moveTo(C1.x, C1.y); ctx.lineTo(C2.x, C2.y);
        ctx.moveTo(D1.x, D1.y); ctx.lineTo(D2.x, D2.y);
        ctx.moveTo(A2.x, A2.y); ctx.lineTo(B2.x, B2.y);
        ctx.moveTo(B2.x, B2.y); ctx.lineTo(C2.x, C2.y);
        ctx.stroke();

        // Dashed hidden back edges
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(A1.x, A1.y); ctx.lineTo(A2.x, A2.y);
        ctx.moveTo(A2.x, A2.y); ctx.lineTo(D2.x, D2.y);
        ctx.moveTo(D2.x, D2.y); ctx.lineTo(C2.x, C2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (type === 'prism_triangular') {
        // Lăng trụ tam giác ABC.A'B'C'
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const w = Math.max(60, maxX - minX);
        const h = Math.max(70, maxY - minY);

        const A2 = { x: minX, y: minY + h * 0.25 };
        const B2 = { x: minX + w * 0.5, y: minY };
        const C2 = { x: maxX, y: minY + h * 0.25 };

        const A1 = { x: minX, y: maxY };
        const B1 = { x: minX + w * 0.5, y: maxY - h * 0.25 };
        const C1 = { x: maxX, y: maxY };

        // Solid top & sides
        ctx.moveTo(A2.x, A2.y); ctx.lineTo(B2.x, B2.y); ctx.lineTo(C2.x, C2.y); ctx.lineTo(A2.x, A2.y);
        ctx.moveTo(A1.x, A1.y); ctx.lineTo(C1.x, C1.y);
        ctx.moveTo(B1.x, B1.y); ctx.lineTo(C1.x, C1.y);
        ctx.moveTo(A1.x, A1.y); ctx.lineTo(A2.x, A2.y);
        ctx.moveTo(B1.x, B1.y); ctx.lineTo(B2.x, B2.y);
        ctx.moveTo(C1.x, C1.y); ctx.lineTo(C2.x, C2.y);
        ctx.stroke();

        // Dashed hidden edge A1-B1
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(A1.x, A1.y); ctx.lineTo(B1.x, B1.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (type === 'cone') {
        // Hình nón
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const w = Math.max(60, maxX - minX);
        const h = Math.max(70, maxY - minY);

        const S = { x: minX + w / 2, y: minY };
        const O = { x: minX + w / 2, y: maxY - h * 0.15 };
        const rx = w / 2;
        const ry = h * 0.15;

        // Sides
        ctx.moveTo(S.x, S.y); ctx.lineTo(minX, O.y);
        ctx.moveTo(S.x, S.y); ctx.lineTo(maxX, O.y);

        // Front half ellipse
        ctx.ellipse(O.x, O.y, rx, ry, 0, 0, Math.PI);
        ctx.stroke();

        // Back half ellipse (Dashed) & height S-O
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.ellipse(O.x, O.y, rx, ry, 0, Math.PI, Math.PI * 2);
        ctx.moveTo(S.x, S.y); ctx.lineTo(O.x, O.y);
        ctx.moveTo(O.x, O.y); ctx.lineTo(maxX, O.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText('S', S.x - 4, S.y - 6);
        ctx.fillText('O', O.x - 4, O.y + 14);
      } else if (type === 'cylinder') {
        // Hình trụ
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const w = Math.max(60, maxX - minX);
        const h = Math.max(70, maxY - minY);

        const rx = w / 2;
        const ry = h * 0.12;
        const O1 = { x: minX + w / 2, y: minY + ry };
        const O2 = { x: minX + w / 2, y: maxY - ry };

        // Top full ellipse
        ctx.ellipse(O1.x, O1.y, rx, ry, 0, 0, Math.PI * 2);
        // Vertical sides
        ctx.moveTo(minX, O1.y); ctx.lineTo(minX, O2.y);
        ctx.moveTo(maxX, O1.y); ctx.lineTo(maxX, O2.y);
        // Bottom front half ellipse
        ctx.ellipse(O2.x, O2.y, rx, ry, 0, 0, Math.PI);
        ctx.stroke();

        // Bottom back half ellipse (Dashed)
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.ellipse(O2.x, O2.y, rx, ry, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (type === 'sphere') {
        // Hình cầu
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const R = Math.max(30, Math.min(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y)) / 2);

        // Outer sphere circle
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        // Equator front arc
        ctx.ellipse(cx, cy, R, R * 0.35, 0, 0, Math.PI);
        ctx.stroke();

        // Equator back arc (Dashed)
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.ellipse(cx, cy, R, R * 0.35, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Center dot
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'coordinate_axes_3d') {
        // Hệ trục Oxyz 3D
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const w = Math.max(80, maxX - minX);
        const h = Math.max(80, maxY - minY);

        const O = { x: minX + w * 0.35, y: maxY - h * 0.35 };

        // Oz axis (vertical up)
        ctx.moveTo(O.x, O.y); ctx.lineTo(O.x, minY);
        ctx.lineTo(O.x - 5, minY + 8); ctx.moveTo(O.x, minY); ctx.lineTo(O.x + 5, minY + 8);

        // Oy axis (horizontal right)
        ctx.moveTo(O.x, O.y); ctx.lineTo(maxX, O.y);
        ctx.lineTo(maxX - 8, O.y - 5); ctx.moveTo(maxX, O.y); ctx.lineTo(maxX - 8, O.y + 5);

        // Ox axis (diagonal down-left)
        ctx.moveTo(O.x, O.y); ctx.lineTo(minX, maxY);
        ctx.lineTo(minX + 8, maxY - 2); ctx.moveTo(minX, maxY); ctx.lineTo(minX + 2, maxY - 8);

        ctx.stroke();

        ctx.font = '12px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText('O', O.x - 12, O.y + 14);
        ctx.fillText('z', O.x + 8, minY + 10);
        ctx.fillText('y', maxX - 8, O.y - 8);
        ctx.fillText('x', minX - 4, maxY + 12);
      }
      // --- FUNCTION GRAPHS (ĐỒ THỊ HÀM SỐ) ---
      else if (type === 'graph_linear') {
        // Đồ thị y = ax + b
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.max(40, Math.abs(p2.x - p1.x) / 2);
        const ry = Math.max(40, Math.abs(p2.y - p1.y) / 2);

        // Oxy
        ctx.moveTo(cx - rx, cy); ctx.lineTo(cx + rx, cy);
        ctx.lineTo(cx + rx - 8, cy - 4); ctx.moveTo(cx + rx, cy); ctx.lineTo(cx + rx - 8, cy + 4);
        ctx.moveTo(cx, cy + ry); ctx.lineTo(cx, cy - ry);
        ctx.lineTo(cx - 4, cy - ry + 8); ctx.moveTo(cx, cy - ry); ctx.lineTo(cx + 4, cy - ry + 8);

        // Linear line
        ctx.moveTo(cx - rx * 0.8, cy + ry * 0.7);
        ctx.lineTo(cx + rx * 0.8, cy - ry * 0.7);
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText('y = ax + b', cx + rx * 0.2, cy - ry * 0.6);
        ctx.fillText('O', cx - 12, cy + 12);
      } else if (type === 'graph_parabola') {
        // Parabol y = ax^2
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2 + 10;
        const rx = Math.max(40, Math.abs(p2.x - p1.x) / 2);
        const ry = Math.max(40, Math.abs(p2.y - p1.y) / 2);

        // Oxy
        ctx.moveTo(cx - rx, cy); ctx.lineTo(cx + rx, cy);
        ctx.lineTo(cx + rx - 8, cy - 4); ctx.moveTo(cx + rx, cy); ctx.lineTo(cx + rx - 8, cy + 4);
        ctx.moveTo(cx, cy + ry * 0.3); ctx.lineTo(cx, cy - ry * 1.1);
        ctx.lineTo(cx - 4, cy - ry * 1.1 + 8); ctx.moveTo(cx, cy - ry * 1.1); ctx.lineTo(cx + 4, cy - ry * 1.1 + 8);

        // Parabola curve
        ctx.moveTo(cx - rx * 0.85, cy - ry * 0.9);
        ctx.quadraticCurveTo(cx, cy + 4, cx + rx * 0.85, cy - ry * 0.9);
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText('y = ax²', cx + rx * 0.4, cy - ry * 0.7);
        ctx.fillText('O', cx - 12, cy + 12);
      } else if (type === 'graph_cubic') {
        // Hàm bậc 3
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.max(45, Math.abs(p2.x - p1.x) / 2);
        const ry = Math.max(45, Math.abs(p2.y - p1.y) / 2);

        // Oxy
        ctx.moveTo(cx - rx, cy); ctx.lineTo(cx + rx, cy);
        ctx.lineTo(cx + rx - 8, cy - 4); ctx.moveTo(cx + rx, cy); ctx.lineTo(cx + rx - 8, cy + 4);
        ctx.moveTo(cx, cy + ry); ctx.lineTo(cx, cy - ry);
        ctx.lineTo(cx - 4, cy - ry + 8); ctx.moveTo(cx, cy - ry); ctx.lineTo(cx + 4, cy - ry + 8);

        // Cubic bezier curve
        ctx.moveTo(cx - rx * 0.85, cy + ry * 0.85);
        ctx.bezierCurveTo(cx - rx * 0.4, cy - ry * 1.1, cx + rx * 0.4, cy + ry * 1.1, cx + rx * 0.85, cy - ry * 0.85);
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText('y = ax³ + bx² + cx + d', cx + 10, cy - ry * 0.8);
      } else if (type === 'graph_hyperbola') {
        // Hàm nhất biến
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.max(45, Math.abs(p2.x - p1.x) / 2);
        const ry = Math.max(45, Math.abs(p2.y - p1.y) / 2);

        // Oxy
        ctx.moveTo(cx - rx, cy); ctx.lineTo(cx + rx, cy);
        ctx.moveTo(cx, cy + ry); ctx.lineTo(cx, cy - ry);

        // Asymptotes (Dashed)
        ctx.setLineDash([4, 4]);
        const vaX = cx - 8;
        const haY = cy - 6;
        ctx.moveTo(vaX, cy - ry); ctx.lineTo(vaX, cy + ry);
        ctx.moveTo(cx - rx, haY); ctx.lineTo(cx + rx, haY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Hyperbola branches
        // Branch 1 (Top-right)
        ctx.beginPath();
        ctx.moveTo(vaX + 4, cy - ry * 0.95);
        ctx.quadraticCurveTo(vaX + 16, haY - 16, cx + rx * 0.9, haY - 4);
        ctx.stroke();

        // Branch 2 (Bottom-left)
        ctx.beginPath();
        ctx.moveTo(vaX - 4, cy + ry * 0.95);
        ctx.quadraticCurveTo(vaX - 16, haY + 16, cx - rx * 0.9, haY + 4);
        ctx.stroke();

        ctx.font = '10px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText('y = (ax+b)/(cx+d)', vaX + 12, haY - 22);
      } else if (type === 'graph_sin') {
        // Đồ thị Lượng giác y = sin x
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.max(50, Math.abs(p2.x - p1.x) / 2);
        const ry = Math.max(35, Math.abs(p2.y - p1.y) / 2);

        // Oxy
        ctx.moveTo(cx - rx, cy); ctx.lineTo(cx + rx, cy);
        ctx.lineTo(cx + rx - 8, cy - 4); ctx.moveTo(cx + rx, cy); ctx.lineTo(cx + rx - 8, cy + 4);
        ctx.moveTo(cx, cy + ry * 1.2); ctx.lineTo(cx, cy - ry * 1.2);
        ctx.lineTo(cx - 4, cy - ry * 1.2 + 8); ctx.moveTo(cx, cy - ry * 1.2); ctx.lineTo(cx + 4, cy - ry * 1.2 + 8);

        // Sine wave
        ctx.moveTo(cx - rx * 0.9, cy);
        const stepCount = 40;
        for (let i = 0; i <= stepCount; i++) {
          const t = (i / stepCount) * 4 * Math.PI - 2 * Math.PI;
          const x = cx + (t / (2 * Math.PI)) * (rx * 0.45);
          const y = cy - Math.sin(t) * (ry * 0.7);
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.fillStyle = stroke.color;
        ctx.fillText('y = sin x', cx + rx * 0.3, cy - ry * 0.8);
      }

      ctx.stroke();
      ctx.restore();
      return;
    }

    if (!stroke.points || stroke.points.length < 2) return;

    if (stroke.lineStyle === 'dashed') {
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.globalAlpha = stroke.opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }

    // Use perfect-freehand stroke algorithm
    const outlinePoints = getStroke(
      stroke.points.map(p => [p.x, p.y, p.pressure || 0.5]),
      {
        size: stroke.size * 2,
        thinning: stroke.tool === 'highlighter' ? 0 : 0.45,
        smoothing: 0.6,
        streamline: 0.5,
        simulatePressure: true,
      }
    );

    if (outlinePoints.length < 2) return;

    ctx.save();
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity;

    ctx.beginPath();
    const [firstX, firstY] = outlinePoints[0];
    ctx.moveTo(firstX, firstY);

    for (let i = 1; i < outlinePoints.length; i++) {
      const [x, y] = outlinePoints[i];
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Render Static Stroke Layer
  const renderStaticStrokes = useCallback(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    // Draw all completed strokes
    currentPage.strokes.forEach((s) => renderSingleStroke(ctx, s));

    // Draw all 3D Interactive Objects
    if (currentPage.objects3D) {
      currentPage.objects3D.forEach((obj) => {
        render3DShapeOnCanvas(ctx, obj, obj.id === selected3DId);
      });
    }

    ctx.restore();
  }, [currentPage.strokes, currentPage.objects3D, selected3DId, dimensions, panX, panY, scale]);

  // Pointer Coordinate Converter
  const getCanvasPoint = (e: React.PointerEvent | PointerEvent): Point => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / scale;
    const y = (e.clientY - rect.top - panY) / scale;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;
    return { x, y, pressure, time: Date.now() };
  };

  // Continuous Animation Loop for Laser Pointer & Active Drawing
  useEffect(() => {
    const drawActiveLayer = () => {
      const canvas = activeCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = dimensions;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(scale, scale);

      // Render Active Freehand Stroke being drawn currently
      if (isDrawing.current && currentPoints.current.length > 1) {
        if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'shape') {
          const tempStroke: Stroke = {
            id: 'active',
            tool: activeTool === 'highlighter' ? 'highlighter' : 'pen',
            color: currentColor,
            size: strokeSize,
            opacity: activeTool === 'highlighter' ? 0.35 : 1,
            lineStyle: lineStyle,
            shapeData: (activeTool === 'shape' && shapeType !== 'auto' && currentPoints.current.length > 1) ? {
              type: shapeType,
              p1: currentPoints.current[0],
              p2: currentPoints.current[currentPoints.current.length - 1]
            } : undefined,
            points: currentPoints.current
          };
          renderSingleStroke(ctx, tempStroke);
        }
      }

      // Render Laser Pointer Glowing Trail
      if (laserTrail.current.length > 0) {
        const now = Date.now();
        // Filter points older than 1200ms
        laserTrail.current = laserTrail.current.filter((p) => now - p.time < 1200);

        if (laserTrail.current.length > 1) {
          ctx.save();
          ctx.shadowBlur = 14;
          ctx.shadowColor = '#f43f5e';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (let i = 1; i < laserTrail.current.length; i++) {
            const p1 = laserTrail.current[i - 1];
            const p2 = laserTrail.current[i];
            const age = now - p2.time;
            const alpha = Math.max(0, 1 - age / 1200);

            ctx.beginPath();
            ctx.strokeStyle = `rgba(244, 63, 94, ${alpha})`;
            ctx.lineWidth = 6 * alpha;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      ctx.restore();
      animFrameId.current = requestAnimationFrame(drawActiveLayer);
    };

    animFrameId.current = requestAnimationFrame(drawActiveLayer);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [dimensions, panX, panY, scale, activeTool, currentColor, strokeSize]);

  // Add 3D Interactive Shape from library
  const handleAdd3DShape = (kind: Shape3DKind, color: string) => {
    const new3DObj: Interactive3DObject = {
      id: `3d-${Date.now()}`,
      kind: kind,
      x: dimensions.width / 2 - panX,
      y: dimensions.height / 2 - panY,
      scale: 90,
      rotX: 25,
      rotY: 35,
      rotZ: 0,
      color: color || '#38bdf8',
      lineWidth: 2.5,
      showLabels: true
    };

    const currentObjects = currentPage.objects3D || [];
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      objects3D: [...currentObjects, new3DObj],
      undoStack: [...currentPage.undoStack, { strokes: currentPage.strokes, texts: currentPage.texts, objects3D: currentObjects }],
      redoStack: []
    };
    setPages(updatedPages);
    setSelected3DId(new3DObj.id);
  };

  const handleUpdate3DObject = (updated: Interactive3DObject) => {
    const currentObjects = currentPage.objects3D || [];
    const updatedObjects = currentObjects.map((obj) => (obj.id === updated.id ? updated : obj));

    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      objects3D: updatedObjects
    };
    setPages(updatedPages);
  };

  const handleDelete3DObject = (id: string) => {
    const currentObjects = currentPage.objects3D || [];
    const updatedObjects = currentObjects.filter((obj) => obj.id !== id);

    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      objects3D: updatedObjects
    };
    setPages(updatedPages);
    if (selected3DId === id) {
      setSelected3DId(null);
    }
  };

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent) => {
    // 3D Object Hit Check
    if (currentPage.objects3D && currentPage.objects3D.length > 0) {
      const pt = getCanvasPoint(e);
      const hitObj = [...currentPage.objects3D].reverse().find((obj) => {
        const dist = Math.hypot(pt.x - obj.x, pt.y - obj.y);
        return dist <= obj.scale * 1.3;
      });

      if (hitObj) {
        setSelected3DId(hitObj.id);
        isInteracting3D.current = true;
        const distCenter = Math.hypot(pt.x - hitObj.x, pt.y - hitObj.y);
        isRotating3DGesture.current = distCenter > hitObj.scale * 0.4;
        last3DPos.current = { x: e.clientX, y: e.clientY };
        return;
      } else if (selected3DId && activeTool !== 'shape') {
        setSelected3DId(null);
      }
    }

    // Check Palm Rejection / Pen-Only Mode
    if (penOnlyTouch && e.pointerType === 'touch' && activeTool !== 'pan') {
      // Touch is acting as Pan/Scroll
      isPanning.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (activeTool === 'pan') {
      isPanning.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (activeTool === 'ruler') {
      return; // Handled by VirtualRuler component
    }

    if (activeTool === 'text') {
      const pt = getCanvasPoint(e);
      setTextModalState({
        isOpen: true,
        x: pt.x,
        y: pt.y,
        text: '',
        isMath: false
      });
      return;
    }

    isDrawing.current = true;
    const pt = getCanvasPoint(e);
    currentPoints.current = [pt];
    lastPointTime.current = Date.now();

    if (activeTool === 'laser') {
      laserTrail.current.push({ x: pt.x, y: pt.y, time: Date.now() });
    }

    // Set hold timer for Smart Shape Recognition (0.5s hold still at end)
    if (activeTool === 'shape' || shapeType === 'auto') {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    }
  };

  // Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isInteracting3D.current && selected3DId && currentPage.objects3D) {
      const dx = e.clientX - last3DPos.current.x;
      const dy = e.clientY - last3DPos.current.y;
      last3DPos.current = { x: e.clientX, y: e.clientY };

      const currentObjects = currentPage.objects3D || [];
      const updatedObjects = currentObjects.map((obj) => {
        if (obj.id !== selected3DId) return obj;

        if (isRotating3DGesture.current) {
          // Trackball 3D Rotation gesture (yaw & pitch)
          return {
            ...obj,
            rotY: (obj.rotY + dx * 0.8 + 360) % 360,
            rotX: (obj.rotX + dy * 0.8 + 360) % 360
          };
        } else {
          // Drag position on canvas
          return {
            ...obj,
            x: obj.x + dx / scale,
            y: obj.y + dy / scale
          };
        }
      });

      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        objects3D: updatedObjects
      };
      setPages(updatedPages);
      return;
    }

    if (isPanning.current) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      setPanX((prev) => prev + dx);
      setPanY((prev) => prev + dy);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!isDrawing.current) return;

    const pt = getCanvasPoint(e);

    if (activeTool === 'laser') {
      laserTrail.current.push({ x: pt.x, y: pt.y, time: Date.now() });
      return;
    }

    if (activeTool === 'eraser_stroke' || activeTool === 'eraser_pixel') {
      // Eraser logic
      eraseAtPoint(pt, activeTool === 'eraser_stroke');
      return;
    }

    // Normal drawing
    currentPoints.current.push(pt);
  };

  // Pointer Up Handler
  const handlePointerUp = (e: React.PointerEvent) => {
    if (isInteracting3D.current) {
      isInteracting3D.current = false;
      return;
    }

    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (activeTool === 'laser' || activeTool === 'eraser_stroke' || activeTool === 'eraser_pixel') {
      currentPoints.current = [];
      return;
    }

    const points = currentPoints.current;
    if (points.length < 2) {
      currentPoints.current = [];
      return;
    }

    // Smart Shape Detection check
    let recognizedShapeData: any = null;
    if (activeTool === 'shape' || shapeType !== 'auto') {
      if (shapeType !== 'auto') {
        const p1 = points[0];
        const p2 = points[points.length - 1];
        recognizedShapeData = { type: shapeType, p1, p2 };
      } else {
        const detected = detectShape(points);
        if (detected) {
          recognizedShapeData = detected;
        }
      }
    }

    const newStroke: Stroke = {
      id: `stroke-${Date.now()}`,
      tool: activeTool === 'highlighter' ? 'highlighter' : 'pen',
      color: currentColor,
      size: strokeSize,
      opacity: activeTool === 'highlighter' ? 0.35 : 1,
      points: points,
      lineStyle: lineStyle,
      shapeData: recognizedShapeData || undefined
    };

    // Commit new stroke to page history
    const updatedStrokes = [...currentPage.strokes, newStroke];
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      strokes: updatedStrokes,
      undoStack: [...currentPage.undoStack, { strokes: currentPage.strokes, texts: currentPage.texts }],
      redoStack: []
    };

    setPages(updatedPages);
    currentPoints.current = [];
  };

  // Smart Eraser Logic
  const eraseAtPoint = (pt: Point, isStrokeEraser: boolean) => {
    const eraserRadius = isStrokeEraser ? 24 : 12;
    const strokes = currentPage.strokes;

    const remainingStrokes = strokes.filter((stroke) => {
      // Check distance from pt to stroke points
      const hasIntersect = stroke.points.some((sp) => distance(pt, sp) < eraserRadius);
      return !hasIntersect;
    });

    if (remainingStrokes.length !== strokes.length) {
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        strokes: remainingStrokes,
        undoStack: [...currentPage.undoStack, { strokes: currentPage.strokes, texts: currentPage.texts }],
        redoStack: []
      };
      setPages(updatedPages);
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (currentPage.undoStack.length === 0) return;
    const lastState = currentPage.undoStack[currentPage.undoStack.length - 1];
    const newUndoStack = currentPage.undoStack.slice(0, -1);

    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      strokes: lastState.strokes,
      texts: lastState.texts,
      undoStack: newUndoStack,
      redoStack: [...currentPage.redoStack, { strokes: currentPage.strokes, texts: currentPage.texts }]
    };
    setPages(updatedPages);
  };

  const handleRedo = () => {
    if (currentPage.redoStack.length === 0) return;
    const nextState = currentPage.redoStack[currentPage.redoStack.length - 1];
    const newRedoStack = currentPage.redoStack.slice(0, -1);

    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      strokes: nextState.strokes,
      texts: nextState.texts,
      undoStack: [...currentPage.undoStack, { strokes: currentPage.strokes, texts: currentPage.texts }],
      redoStack: newRedoStack
    };
    setPages(updatedPages);
  };

  const handleClearPage = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ nét vẽ và nội dung trên trang này?')) {
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        strokes: [],
        texts: [],
        undoStack: [...currentPage.undoStack, { strokes: currentPage.strokes, texts: currentPage.texts }],
        redoStack: []
      };
      setPages(updatedPages);
    }
  };

  // Page Navigation
  const handleAddPage = () => {
    const newPage: BoardPage = {
      id: `page-${Date.now()}`,
      title: `Trang ${pages.length + 1}`,
      backgroundType: currentPage.backgroundType,
      strokes: [],
      texts: [],
      undoStack: [],
      redoStack: []
    };
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) return;
    const updated = pages.filter((_, i) => i !== index);
    setPages(updated);
    if (currentPageIndex >= updated.length) {
      setCurrentPageIndex(updated.length - 1);
    }
  };

  // Background Change
  const handleChangeBackground = (bg: BackgroundType) => {
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      backgroundType: bg
    };
    setPages(updatedPages);
  };

  // Custom File Upload Background (Image/PDF)
  const handleUploadBackground = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        setIsLoadingPdf(true);
        setPdfLoadingStatus('Đang đọc tệp PDF bài giảng...');

        const arrayBuffer = await file.arrayBuffer();
        setPdfLoadingStatus('Đang phân tích cấu trúc trang PDF...');

        const totalPages = await getPdfTotalPages(arrayBuffer);
        const maxPagesToLoad = Math.min(totalPages, 30);
        setPdfLoadingStatus(`Đang chuyển đổi ${maxPagesToLoad} trang PDF sang hình ảnh HD...`);

        const { pages: renderedPages } = await renderPdfPageRange(arrayBuffer, 1, maxPagesToLoad, 2.0);

        if (!renderedPages || renderedPages.length === 0) {
          alert('Không thể trích xuất trang từ tệp PDF này. Vui lòng kiểm tra lại file.');
          return;
        }

        // Preload images into cache
        renderedPages.forEach((dataUrl) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = dataUrl;
          imageCache.current.set(dataUrl, img);
        });

        const baseTitle = file.name.replace(/\.[^/.]+$/, '');
        const isCurrentEmpty =
          currentPage.strokes.length === 0 &&
          currentPage.texts.length === 0 &&
          currentPage.backgroundType !== 'custom';

        const updatedPages = [...pages];

        if (isCurrentEmpty) {
          // Gán trang đầu tiên của PDF vào trang hiện tại
          updatedPages[currentPageIndex] = {
            ...currentPage,
            title: `${baseTitle} - Trang 1`,
            backgroundType: 'custom',
            customBgUrl: renderedPages[0]
          };

          // Thêm các trang tiếp theo của PDF ngay sau trang hiện tại
          for (let i = 1; i < renderedPages.length; i++) {
            updatedPages.splice(currentPageIndex + i, 0, {
              id: `pdf-page-${Date.now()}-${i + 1}`,
              title: `${baseTitle} - Trang ${i + 1}`,
              backgroundType: 'custom',
              customBgUrl: renderedPages[i],
              strokes: [],
              texts: [],
              objects3D: [],
              undoStack: [],
              redoStack: []
            });
          }
        } else {
          // Trang hiện tại đã có nội dung vẽ, chèn tất cả các trang PDF sau trang hiện tại
          const insertIndex = currentPageIndex + 1;
          renderedPages.forEach((pUrl, idx) => {
            updatedPages.splice(insertIndex + idx, 0, {
              id: `pdf-page-${Date.now()}-${idx + 1}`,
              title: `${baseTitle} - Trang ${idx + 1}`,
              backgroundType: 'custom',
              customBgUrl: pUrl,
              strokes: [],
              texts: [],
              objects3D: [],
              undoStack: [],
              redoStack: []
            });
          });
          setCurrentPageIndex(insertIndex);
        }

        setPages(updatedPages);
        setPanX(0);
        setPanY(0);
        setScale(1);
        if (currentColor === '#ffffff') {
          setCurrentColor('#0f172a');
        }

        // Trigger immediate render
        setTimeout(() => {
          renderBackground();
          renderStaticStrokes();
        }, 60);
      } catch (err) {
        console.error('Error importing PDF to whiteboard:', err);
        alert('Có lỗi xảy ra khi mở tệp PDF. Vui lòng thử lại.');
      } finally {
        setIsLoadingPdf(false);
        setPdfLoadingStatus('');
      }
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            renderBackground();
            renderStaticStrokes();
          };
          img.src = dataUrl;
          imageCache.current.set(dataUrl, img);

          const updatedPages = [...pages];
          updatedPages[currentPageIndex] = {
            ...currentPage,
            title: file.name.replace(/\.[^/.]+$/, ''),
            backgroundType: 'custom',
            customBgUrl: dataUrl
          };
          setPages(updatedPages);
          setPanX(0);
          setPanY(0);
          setScale(1);
          if (currentColor === '#ffffff') {
            setCurrentColor('#0f172a');
          }
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert('Vui lòng chọn tệp PDF (.pdf) hoặc tệp hình ảnh (.png, .jpg, .webp).');
    }
  };

  // Export HD PNG
  const handleExportPNG = () => {
    const bgCanvas = bgCanvasRef.current;
    const staticCanvas = staticCanvasRef.current;
    if (!bgCanvas || !staticCanvas) return;

    const offscreen = document.createElement('canvas');
    offscreen.width = bgCanvas.width;
    offscreen.height = bgCanvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(bgCanvas, 0, 0);
    ctx.drawImage(staticCanvas, 0, 0);

    const link = document.createElement('a');
    link.download = `EduPlan_AI_Ink_BaiGiang_Trang_${currentPageIndex + 1}.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
  };

  // Export PDF Document
  const handleExportPDF = () => {
    const bgCanvas = bgCanvasRef.current;
    const staticCanvas = staticCanvasRef.current;
    if (!bgCanvas || !staticCanvas) return;

    const offscreen = document.createElement('canvas');
    offscreen.width = bgCanvas.width;
    offscreen.height = bgCanvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(bgCanvas, 0, 0);
    ctx.drawImage(staticCanvas, 0, 0);

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [offscreen.width, offscreen.height]
    });

    pdf.addImage(offscreen.toDataURL('image/png'), 'PNG', 0, 0, offscreen.width, offscreen.height);
    pdf.save(`EduPlan_AI_Ink_BaiGiang_TongHop.pdf`);
  };

  // Add / Edit / Delete Text Note & Math Formula
  const MATH_SYMBOLS = [
    { label: 'Phân số', symbol: '\\frac{a}{b}' },
    { label: 'Căn bậc 2', symbol: '\\sqrt{x}' },
    { label: 'Căn bậc n', symbol: '\\sqrt[n]{x}' },
    { label: 'Mũ (Lũy thừa)', symbol: 'x^2' },
    { label: 'Chỉ số dưới', symbol: 'x_1' },
    { label: 'Véctơ AB', symbol: '\\vec{AB}' },
    { label: 'Góc', symbol: '\\widehat{ABC}' },
    { label: 'Vuông góc ⊥', symbol: '\\perp' },
    { label: 'Song song ∥', symbol: '\\parallel' },
    { label: 'Tích phân', symbol: '\\int_{a}^{b} f(x)dx' },
    { label: 'Giới hạn', symbol: '\\lim_{x \\to x_0}' },
    { label: 'Tổng ∑', symbol: '\\sum_{i=1}^{n}' },
    { label: 'Tập ℝ', symbol: '\\mathbb{R}' },
    { label: 'Tập ℤ', symbol: '\\mathbb{Z}' },
    { label: 'Tập ℕ', symbol: '\\mathbb{N}' },
    { label: 'Logarithm', symbol: '\\log_a b' },
    { label: 'Logarit tự nhiên', symbol: '\\ln x' },
    { label: 'π', symbol: '\\pi' },
    { label: 'α', symbol: '\\alpha' },
    { label: 'β', symbol: '\\beta' },
    { label: 'θ', symbol: '\\theta' },
    { label: 'Δ', symbol: '\\Delta' },
    { label: '∞', symbol: '\\infty' },
    { label: '≤', symbol: '\\le' },
    { label: '≥', symbol: '\\ge' },
    { label: '≠', symbol: '\\neq' },
    { label: '∈', symbol: '\\in' },
    { label: '∉', symbol: '\\notin' },
    { label: '⊂', symbol: '\\subset' },
    { label: '⇒', symbol: '\\Rightarrow' },
    { label: '⇔', symbol: '\\Leftrightarrow' },
    { label: 'sin', symbol: '\\sin x' },
    { label: 'cos', symbol: '\\cos x' },
    { label: 'tan', symbol: '\\tan x' },
    { label: 'cot', symbol: '\\cot x' },
  ];

  const handleInsertSymbol = (sym: string) => {
    const isFormula = textModalState.text.includes('$');
    if (isFormula) {
      setTextModalState(prev => ({ ...prev, text: prev.text + ' ' + sym }));
    } else {
      setTextModalState(prev => ({ ...prev, text: prev.text ? `${prev.text} $${sym}$` : `$${sym}$` }));
    }
  };

  const handleAddTextNote = () => {
    if (!textModalState.text.trim()) return;

    const isMathDetected = textModalState.text.includes('$') || textModalState.isMath;

    if (textModalState.editingId) {
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        texts: currentPage.texts.map(t => t.id === textModalState.editingId ? {
          ...t,
          text: textModalState.text,
          isMath: isMathDetected
        } : t)
      };
      setPages(updatedPages);
    } else {
      const newNote: TextNote = {
        id: `text-${Date.now()}`,
        x: textModalState.x,
        y: textModalState.y,
        text: textModalState.text,
        color: currentColor,
        fontSize: 18,
        isMath: isMathDetected
      };

      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        texts: [...currentPage.texts, newNote]
      };
      setPages(updatedPages);
    }

    setTextModalState({ isOpen: false, x: 0, y: 0, text: '', isMath: false });
  };

  const handleDeleteTextNote = (id: string) => {
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      texts: currentPage.texts.filter((t) => t.id !== id)
    };
    setPages(updatedPages);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none touch-none font-sans"
    >
      {/* Stacked 3 Canvas Architecture */}
      <canvas ref={bgCanvasRef} className="absolute inset-0 z-0 touch-none" />
      <canvas ref={staticCanvasRef} className="absolute inset-0 z-10 touch-none" />
      <canvas
        ref={activeCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`absolute inset-0 z-20 touch-none ${
          activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        }`}
      />

      {/* Render Text Notes Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {currentPage.texts.map((note) => (
          <div
            key={note.id}
            onClick={() => {
              setTextModalState({
                isOpen: true,
                x: note.x,
                y: note.y,
                text: note.text,
                isMath: !!note.isMath,
                editingId: note.id
              });
            }}
            className="absolute p-2 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700/80 text-white shadow-xl pointer-events-auto cursor-pointer hover:border-emerald-500 transition-all group"
            style={{
              left: `${note.x * scale + panX}px`,
              top: `${note.y * scale + panY}px`,
              color: note.color
            }}
            title="Nhấn vào đây để chỉnh sửa hoặc xóa công thức"
          >
            {note.isMath ? <MathView content={note.text} /> : <div>{note.text}</div>}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTextNote(note.id);
              }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold shadow-md"
              title="Xóa công thức"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Virtual Ruler */}
      <VirtualRuler
        rulerState={rulerState}
        onChange={setRulerState}
        onClose={() => setRulerState({ ...rulerState, enabled: false })}
        scale={scale}
        panX={panX}
        panY={panY}
      />

      {/* Toolbar */}
      <EduPlanInkToolbar
        activeTool={activeTool}
        onSelectTool={(tool) => {
          if (tool === 'ruler') {
            setRulerState({ ...rulerState, enabled: !rulerState.enabled });
          }
          setActiveTool(tool);
        }}
        currentColor={currentColor}
        onChangeColor={setCurrentColor}
        strokeSize={strokeSize}
        onChangeSize={setStrokeSize}
        lineStyle={lineStyle}
        onChangeLineStyle={setLineStyle}
        shapeType={shapeType}
        onChangeShapeType={setShapeType}
        penOnlyTouch={penOnlyTouch}
        onTogglePenOnlyTouch={() => setPenOnlyTouch(!penOnlyTouch)}
        currentPageIndex={currentPageIndex}
        totalPages={pages.length}
        onPrevPage={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
        onNextPage={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
        onAddPage={handleAddPage}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        canUndo={currentPage.undoStack.length > 0}
        canRedo={currentPage.redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearPage={handleClearPage}
        currentBackground={currentPage.backgroundType}
        onChangeBackground={handleChangeBackground}
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
        onOpen3DLibrary={() => setIs3DLibraryOpen(true)}
        onUploadBackground={handleUploadBackground}
      />

      {/* 3D Shape Interactive Library Modal */}
      <Shape3DLibraryModal
        isOpen={is3DLibraryOpen}
        onClose={() => setIs3DLibraryOpen(false)}
        onAdd3DShape={handleAdd3DShape}
        currentColor={currentColor}
      />

      {/* Floating 3D Rotation Controls Toolbar for selected 3D object */}
      {selected3DId && currentPage.objects3D && (
        (() => {
          const selObj = currentPage.objects3D.find((o) => o.id === selected3DId);
          if (!selObj) return null;
          return (
            <Object3DRotationToolbar
              object={selObj}
              onUpdate={handleUpdate3DObject}
              onDelete={() => handleDelete3DObject(selObj.id)}
              onDeselect={() => setSelected3DId(null)}
            />
          );
        })()
      )}

      {/* Page Thumbnails Drawer */}
      <PageThumbnailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        pages={pages}
        currentPageIndex={currentPageIndex}
        onSelectPage={setCurrentPageIndex}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
        onChangeBackground={handleChangeBackground}
        onUploadBackground={handleUploadBackground}
      />

      {/* PDF Document Loading Overlay */}
      {isLoadingPdf && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl max-w-sm w-full flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin flex items-center justify-center" />
              <FileText className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Đang tải tài liệu PDF bài giảng</h3>
              <p className="text-xs text-slate-400 mt-1">{pdfLoadingStatus || 'Vui lòng chờ trong giây lát...'}</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Text / Math Formula Modal */}
      {textModalState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg text-white shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-emerald-400">Chèn Văn bản / Công thức Toán</h3>
              <button
                onClick={() => setTextModalState({ ...textModalState, isOpen: false })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nội dung (Gõ $công_thức$ hoặc dùng phím chèn nhanh bên dưới)
                </label>
                <textarea
                  value={textModalState.text}
                  onChange={(e) => setTextModalState({ ...textModalState, text: e.target.value })}
                  placeholder="Ví dụ: Định lý Py-ta-go: $a^2 + b^2 = c^2$ hoặc $\frac{-b \pm \sqrt{\Delta}}{2a}$"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />

                {/* Quick Math Symbols Toolbar */}
                <div className="mt-2.5">
                  <span className="text-[11px] font-semibold text-emerald-400 block mb-1.5">
                    ⚡ Chèn nhanh ký hiệu Toán học:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1.5 bg-slate-850 rounded-xl border border-slate-800">
                    {MATH_SYMBOLS.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertSymbol(s.symbol)}
                        className="px-2 py-1 bg-slate-800 hover:bg-emerald-600/30 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 border border-slate-700/80 rounded-lg text-xs font-medium transition-all"
                        title={`Chèn ${s.label}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {textModalState.text && (
                <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700/90">
                  <span className="text-xs text-emerald-400 block mb-1 font-semibold">Xem trước công thức chuẩn KaTeX:</span>
                  <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800 text-white min-h-[40px] flex items-center">
                    <MathView content={textModalState.text} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setTextModalState({ ...textModalState, isOpen: false })}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddTextNote}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Chèn vào bảng</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
